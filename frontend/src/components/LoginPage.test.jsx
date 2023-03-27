import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

async function signIn(username, password) {
  await userEvent.type(screen.getByLabelText(/username/i), username);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole('button', { name: /open dashboard/i }));
}

describe('LoginPage', () => {
  it('hands the session to the parent after a successful sign-in', async () => {
    axios.post.mockResolvedValue({
      data: { success: true, token: 'demo-token', profile: { id: 'driver1' } },
    });
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);

    await signIn('driver1', 'password1');

    expect(axios.post).toHaveBeenCalledWith(expect.stringMatching(/\/api\/login$/), {
      username: 'driver1',
      password: 'password1',
    });
    expect(onLogin).toHaveBeenCalledWith({
      username: 'driver1',
      profile: { id: 'driver1' },
      token: 'demo-token',
    });
  });

  it('shows the server error and stays on the form when credentials are wrong', async () => {
    axios.post.mockRejectedValue({ response: { data: { error: 'Invalid credentials' } } });
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);

    await signIn('driver1', 'nope');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(onLogin).not.toHaveBeenCalled();
  });
});
