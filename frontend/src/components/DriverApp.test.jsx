import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import io from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSocket } from '../test/fakeSocket';
import DriverApp from './DriverApp';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('socket.io-client', () => ({ default: vi.fn() }));

const PROFILE = {
  id: 'driver2',
  name: 'Sarah Johnson',
  vehicle: 'Honda Civic 2021',
  license: 'XYZ789',
};

async function signIn() {
  axios.post.mockResolvedValueOnce({
    data: { success: true, token: 'demo-token', profile: PROFILE },
  });
  await userEvent.type(screen.getByLabelText(/username/i), 'driver2');
  await userEvent.type(screen.getByLabelText(/password/i), 'password2');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
  await screen.findByRole('heading', { name: PROFILE.name });
}

describe('DriverApp', () => {
  let socket;

  beforeEach(() => {
    socket = createFakeSocket();
    io.mockReturnValue(socket);
    // The first tick fires before the socket connects, so it goes over REST.
    axios.post.mockResolvedValue({ data: { location: { lat: 40.7, lng: -74 } } });
  });

  it('rejects a bad sign-in with the server message', async () => {
    axios.post.mockRejectedValueOnce({ response: { data: { error: 'Invalid credentials' } } });
    render(<DriverApp />);

    await userEvent.type(screen.getByLabelText(/username/i), 'driver2');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
  });

  it('opens an authenticated socket and reports over it once connected', async () => {
    render(<DriverApp />);
    await signIn();

    await userEvent.click(screen.getByRole('button', { name: /start sharing/i }));
    expect(io).toHaveBeenCalledWith(
      expect.stringMatching(/\/driver\/update$/),
      expect.objectContaining({ auth: { token: 'demo-token' } })
    );

    act(() => socket.serverEmit('connect'));
    expect(screen.getByText('sharing location')).toBeInTheDocument();

    act(() =>
      socket.serverEmit('location_updated', {
        location: { lat: 40.75, lng: -73.98, timestamp: '2026-01-01T12:00:00.000Z' },
      })
    );
    expect(screen.getByText('40.750000')).toBeInTheDocument();
  });

  it('falls back to REST while the socket is not connected', async () => {
    render(<DriverApp />);
    await signIn();

    await userEvent.click(screen.getByRole('button', { name: /start sharing/i }));

    expect(axios.post).toHaveBeenLastCalledWith(
      expect.stringMatching(/\/api\/driver\/update$/),
      expect.objectContaining({ lat: expect.any(Number), lng: expect.any(Number) }),
      { headers: { Authorization: 'Bearer demo-token' } }
    );
    expect(socket.emit).not.toHaveBeenCalledWith('location_update', expect.anything());
  });

  it('stopping disconnects the socket but keeps the session for a restart', async () => {
    render(<DriverApp />);
    await signIn();
    await userEvent.click(screen.getByRole('button', { name: /start sharing/i }));

    await userEvent.click(screen.getByRole('button', { name: /stop sharing/i }));

    expect(socket.disconnect).toHaveBeenCalled();
    expect(screen.getByText('not sharing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start sharing/i })).toBeInTheDocument();
    expect(axios.post).not.toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/logout$/),
      expect.anything(),
      expect.anything()
    );
  });
});
