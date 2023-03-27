import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({ on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() })),
}));

describe('App', () => {
  it('opens on the dashboard sign-in', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /open dashboard/i })).toBeInTheDocument();
  });

  it('switches to the driver simulator', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /driver app/i }));
    expect(screen.getByRole('heading', { name: /driver sign-in/i })).toBeInTheDocument();
  });
});
