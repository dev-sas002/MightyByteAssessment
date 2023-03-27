import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import io from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakeSocket } from '../test/fakeSocket';
import Dashboard from './Dashboard';

vi.mock('socket.io-client', () => ({ default: vi.fn() }));

const ROSTER = {
  drivers: [
    {
      driverId: 'driver1',
      profile: { name: 'John Smith', vehicle: 'Toyota Camry 2020' },
      lastSeen: '2026-01-01T12:00:00.000Z',
      isOnline: true,
    },
    {
      driverId: 'driver3',
      profile: { name: 'Mike Davis', vehicle: 'Ford Focus 2019' },
      lastSeen: '2026-01-01T12:00:05.000Z',
      isOnline: true,
    },
  ],
  count: 2,
};

function renderDashboard() {
  render(<Dashboard user={{ username: 'driver1' }} onLogout={vi.fn()} />);
}

describe('Dashboard', () => {
  let socket;

  beforeEach(() => {
    socket = createFakeSocket();
    io.mockReturnValue(socket);
  });

  it('shows an empty roster until a driver reports in', () => {
    renderDashboard();
    act(() => {
      socket.serverEmit('connect');
      socket.serverEmit('online_drivers', { drivers: [], count: 0 });
    });

    expect(screen.getByText(/no drivers online/i)).toBeInTheDocument();
  });

  it('subscribes to a driver picked from the roster and renders their position', async () => {
    renderDashboard();
    act(() => {
      socket.serverEmit('connect');
      socket.serverEmit('online_drivers', ROSTER);
    });

    await userEvent.click(screen.getByRole('button', { name: /mike davis/i }));
    expect(socket.emit).toHaveBeenCalledWith('subscribe', { driverId: 'driver3' });

    act(() =>
      socket.serverEmit('driver_data', {
        driverId: 'driver3',
        profile: ROSTER.drivers[1].profile,
        location: { lat: 40.712345, lng: -73.998765, timestamp: '2026-01-01T12:00:10.000Z' },
        isOnline: true,
      })
    );

    expect(screen.getByText('40.712345')).toBeInTheDocument();
    expect(screen.getByText('-73.998765')).toBeInTheDocument();
  });

  it('switching drivers unsubscribes from the previous one first', async () => {
    renderDashboard();
    act(() => {
      socket.serverEmit('connect');
      socket.serverEmit('online_drivers', ROSTER);
    });

    await userEvent.click(screen.getByRole('button', { name: /john smith/i }));
    await userEvent.click(screen.getByRole('button', { name: /mike davis/i }));

    const calls = socket.emit.mock.calls.map(([event, payload]) => [event, payload?.driverId]);
    expect(calls).toEqual([
      ['subscribe', 'driver1'],
      ['unsubscribe', undefined],
      ['subscribe', 'driver3'],
    ]);
  });

  it('clears the position when the watched driver disconnects', async () => {
    renderDashboard();
    act(() => {
      socket.serverEmit('connect');
      socket.serverEmit('online_drivers', ROSTER);
    });
    await userEvent.click(screen.getByRole('button', { name: /john smith/i }));
    act(() =>
      socket.serverEmit('driver_data', {
        driverId: 'driver1',
        profile: ROSTER.drivers[0].profile,
        location: { lat: 40.7, lng: -74, timestamp: '2026-01-01T12:00:10.000Z' },
        isOnline: true,
      })
    );
    expect(screen.getByText('40.700000')).toBeInTheDocument();

    act(() =>
      socket.serverEmit('driver_disconnected', {
        driverId: 'driver1',
        profile: ROSTER.drivers[0].profile,
      })
    );

    expect(screen.queryByText('40.700000')).not.toBeInTheDocument();
  });

  it('reports a connection failure', () => {
    renderDashboard();
    act(() => socket.serverEmit('connect_error', new Error('refused')));

    expect(screen.getByRole('alert')).toHaveTextContent(/cannot reach the tracking service/i);
  });
});
