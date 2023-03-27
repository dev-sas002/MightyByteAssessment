import React, { useState } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import './LoginPage.css';

/**
 * Dashboard sign-in.
 *
 * The dashboard has no separate operator directory: it authenticates against
 * the same `POST /api/login` endpoint as the driver app, so any seeded driver
 * account opens it.
 */
function LoginPage({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setCredentials((previous) => ({ ...previous, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, credentials);
      if (response.data.success) {
        onLogin({
          username: credentials.username,
          profile: response.data.profile,
          token: response.data.token,
        });
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-intro" aria-labelledby="login-title">
        <p className="eyebrow">Dispatch</p>
        <h1 id="login-title">Follow every driver as they move.</h1>
        <p className="lede">
          The dashboard lists drivers who have reported a position recently and streams one
          driver&apos;s fixes to you as they arrive.
        </p>
        <ul className="fact-list">
          <li>
            <strong>Pushed, not polled.</strong> A fix reaches you the moment the driver sends it.
          </li>
          <li>
            <strong>One stream per driver.</strong> Subscribing joins that driver&apos;s room, so
            you only receive the traffic you asked for.
          </li>
          <li>
            <strong>Offline notices.</strong> A watched driver who goes quiet is flagged.
          </li>
        </ul>
      </section>

      <form onSubmit={handleSubmit} className="panel login-form" aria-labelledby="signin-title">
        <h2 id="signin-title">Sign in</h2>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            autoComplete="username"
            value={credentials.username}
            onChange={handleInputChange}
            placeholder="driver1"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            autoComplete="current-password"
            value={credentials.password}
            onChange={handleInputChange}
            placeholder="password1"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Open dashboard'}
        </button>

        <p className="demo-note">
          Demo accounts: <code>driver1</code> to <code>driver3</code> with passwords{' '}
          <code>password1</code> to <code>password3</code>.
        </p>
      </form>
    </div>
  );
}

LoginPage.propTypes = {
  onLogin: PropTypes.func.isRequired,
};

export default LoginPage;
