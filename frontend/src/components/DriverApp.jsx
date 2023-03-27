import React, { useCallback, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import {
  API_BASE_URL,
  DRIVER_NAMESPACE_URL,
  LOCATION_REPORT_INTERVAL_MS,
  randomServiceAreaLocation,
} from '../api/config';
import './DriverApp.css';

/**
 * Driver simulator.
 *
 * Signs in as a seeded driver and reports a synthetic position on a fixed
 * cadence. Reports go over the WebSocket while it is connected and fall back to
 * `POST /api/driver/update` otherwise, never both, so each tick writes one fix.
 */
function DriverApp() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [session, setSession] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('offline');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const socketRef = useRef(null);
  const intervalRef = useRef(null);

  const stopSharing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (socketRef.current) {
      // Disconnecting is what takes the driver offline server-side. Logging out
      // here as well would revoke the token and block a restart without a new
      // sign-in.
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsSharing(false);
    setCurrentLocation(null);
    setStatus('not sharing');
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setIsSigningIn(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, credentials);
      if (response.data.success) {
        setSession({ token: response.data.token, profile: response.data.profile });
        setStatus('not sharing');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Login failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const startSharing = () => {
    if (!session?.token || socketRef.current) return;

    setError('');
    setIsSharing(true);
    setStatus('connecting...');

    const socket = io(DRIVER_NAMESPACE_URL, {
      auth: { token: session.token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => setStatus('sharing location'));
    socket.on('connect_error', (connectError) => {
      setError(connectError.message);
      setStatus('connection refused');
    });
    socket.on('location_updated', (data) => setCurrentLocation(data.location));
    socket.on('error', (socketError) => setError(socketError.message));

    const report = () => {
      const location = randomServiceAreaLocation();

      if (socketRef.current?.connected) {
        socketRef.current.emit('location_update', location);
        return;
      }

      axios
        .post(`${API_BASE_URL}/api/driver/update`, location, {
          headers: { Authorization: `Bearer ${session.token}` },
        })
        .then((response) => setCurrentLocation(response.data.location))
        .catch(() => setError('Could not report location over REST either.'));
    };

    report();
    intervalRef.current = setInterval(report, LOCATION_REPORT_INTERVAL_MS);
  };

  const handleSignOut = async () => {
    stopSharing();

    if (session?.token) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/logout`,
          {},
          { headers: { Authorization: `Bearer ${session.token}` } }
        );
      } catch {
        // The token expires on its own; a failed logout is not worth blocking on.
      }
    }

    setSession(null);
    setCredentials({ username: '', password: '' });
    setCurrentLocation(null);
    setError('');
    setStatus('offline');
  };

  useEffect(() => stopSharing, [stopSharing]);

  if (!session) {
    return (
      <div className="driver-app">
        <form className="panel driver-login" onSubmit={handleLogin} aria-labelledby="driver-title">
          <h1 id="driver-title">Driver sign-in</h1>
          <p className="muted">Sign in to start reporting your position.</p>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="driver-username">Username</label>
            <input
              id="driver-username"
              type="text"
              autoComplete="username"
              value={credentials.username}
              onChange={(event) => setCredentials({ ...credentials, username: event.target.value })}
              placeholder="driver1"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="driver-password">Password</label>
            <input
              id="driver-password"
              type="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(event) => setCredentials({ ...credentials, password: event.target.value })}
              placeholder="password1"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isSigningIn}>
            {isSigningIn ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="demo-note">
            Demo accounts: <code>driver1</code> to <code>driver3</code> with passwords{' '}
            <code>password1</code> to <code>password3</code>.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="driver-app">
      <section className="panel driver-card" aria-labelledby="driver-name">
        <header className="driver-card-header">
          <div>
            <p className="eyebrow">On shift</p>
            <h1 id="driver-name">{session.profile.name}</h1>
          </div>
          <button type="button" onClick={handleSignOut} className="btn btn-quiet">
            Sign out
          </button>
        </header>

        <dl className="spec-list">
          <div>
            <dt>Vehicle</dt>
            <dd>{session.profile.vehicle}</dd>
          </div>
          <div>
            <dt>Plate</dt>
            <dd className="mono">{session.profile.license}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`pill ${isSharing ? 'pill-live' : 'pill-idle'}`}>{status}</span>
            </dd>
          </div>
        </dl>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {isSharing ? (
          <button type="button" onClick={stopSharing} className="btn btn-secondary btn-block">
            Stop sharing location
          </button>
        ) : (
          <button type="button" onClick={startSharing} className="btn btn-primary btn-block">
            Start sharing location
          </button>
        )}

        <div className="last-fix" aria-live="polite">
          <h2>Last reported position</h2>
          {currentLocation ? (
            <dl className="spec-list">
              <div>
                <dt>Latitude</dt>
                <dd className="mono">{formatCoordinate(currentLocation.lat)}</dd>
              </div>
              <div>
                <dt>Longitude</dt>
                <dd className="mono">{formatCoordinate(currentLocation.lng)}</dd>
              </div>
              <div>
                <dt>Reported</dt>
                <dd>{formatTime(currentLocation.timestamp)}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">
              {isSharing ? 'Waiting for the first fix...' : 'Nothing sent yet.'}
            </p>
          )}
        </div>
      </section>

      <aside className="panel how-it-works" aria-labelledby="how-title">
        <h2 id="how-title">How this works</h2>
        <ol>
          <li>Start sharing to open an authenticated socket to the tracking service.</li>
          <li>A synthetic position inside the service area is reported every 5 seconds.</li>
          <li>The dashboard lists you as online and streams those positions to subscribers.</li>
          <li>Stopping, signing out or closing the tab takes you offline immediately.</li>
        </ol>
      </aside>
    </div>
  );
}

/** @param {string|undefined} timestamp */
function formatTime(timestamp) {
  if (!timestamp) return 'pending';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'pending' : date.toLocaleTimeString();
}

/** @param {number|undefined} value */
function formatCoordinate(value) {
  return typeof value === 'number' ? value.toFixed(6) : 'n/a';
}

export default DriverApp;
