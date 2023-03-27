import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import io from 'socket.io-client';
import { DASHBOARD_NAMESPACE_URL } from '../api/config';
import ServiceAreaMap from './ServiceAreaMap';
import './Dashboard.css';

const MAX_NOTIFICATIONS = 5;
const NOTIFICATION_TTL_MS = 5000;
const TRAIL_LENGTH = 12;

const STATUS_LABELS = {
  connecting: 'Connecting',
  connected: 'Live',
  disconnected: 'Reconnecting',
  error: 'Unreachable',
};

/**
 * Monitoring view.
 *
 * Opens one socket to the `/dashboard` namespace, keeps the online roster in
 * sync from server-pushed events, and subscribes to exactly one driver at a
 * time. The server scopes per-driver traffic to a room, so nothing arrives here
 * for drivers we are not watching.
 */
function Dashboard({ user, onLogout }) {
  const [onlineDrivers, setOnlineDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedDriverData, setSelectedDriverData] = useState(null);
  const [trail, setTrail] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState([]);

  const socketRef = useRef(null);
  const notificationTimersRef = useRef(new Map());

  // The socket handlers are registered once, so they read the selection through
  // a ref; closing over `selectedDriverId` would freeze its first-render value.
  const selectedDriverIdRef = useRef('');
  useEffect(() => {
    selectedDriverIdRef.current = selectedDriverId;
  }, [selectedDriverId]);

  const addNotification = useCallback((message, type = 'info') => {
    const notification = { id: `${Date.now()}-${Math.random()}`, message, type };

    setNotifications((previous) => [notification, ...previous].slice(0, MAX_NOTIFICATIONS));

    const timer = setTimeout(() => {
      setNotifications((previous) => previous.filter((item) => item.id !== notification.id));
      notificationTimersRef.current.delete(notification.id);
    }, NOTIFICATION_TTL_MS);

    notificationTimersRef.current.set(notification.id, timer);
  }, []);

  useEffect(() => {
    const socket = io(DASHBOARD_NAMESPACE_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setError('');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setError('Connection lost. Attempting to reconnect...');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
      setError('Cannot reach the tracking service.');
    });

    socket.on('connected', () => addNotification('Connected to the dashboard service', 'success'));

    socket.on('online_drivers', (data) => {
      setOnlineDrivers(data.drivers || []);
      setLastUpdate(new Date().toISOString());
    });

    socket.on('driver_data', (data) => {
      if (data.driverId !== selectedDriverIdRef.current) return;
      setSelectedDriverData(data);
      if (data.location) {
        setTrail((previous) => [...previous, data.location].slice(-TRAIL_LENGTH));
      }
      setLastUpdate(new Date().toISOString());
      setError('');
    });

    socket.on('driver_offline', (data) => {
      if (data.driverId === selectedDriverIdRef.current) setSelectedDriverData(null);
      addNotification(`Driver ${data.driverId} is offline`, 'warning');
    });

    socket.on('OFFLINE_DRIVER', (data) => {
      addNotification(`Driver ${data.driverId} has stopped reporting`, 'error');
    });

    socket.on('subscribed', (data) => addNotification(`Tracking ${data.driverId}`, 'success'));
    socket.on('unsubscribed', (data) =>
      addNotification(`Stopped tracking ${data.driverId}`, 'info')
    );

    socket.on('driver_connected', (data) => {
      addNotification(`${data.profile?.name || data.driverId} came online`, 'success');
    });

    socket.on('driver_disconnected', (data) => {
      addNotification(`${data.profile?.name || data.driverId} went offline`, 'warning');

      if (selectedDriverIdRef.current === data.driverId) {
        setSelectedDriverData(null);
      }
    });

    socket.on('error', (data) => {
      const message = data?.message || 'An error occurred';
      setError(message);
      addNotification(message, 'error');
    });

    const timers = notificationTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [addNotification]);

  const handleDriverSelection = (driverId) => {
    const socket = socketRef.current;
    if (!socket) return;

    if (selectedDriverId) socket.emit('unsubscribe');

    // Updated here as well as in the effect, so a fix that arrives before the
    // re-render is matched against the new selection.
    selectedDriverIdRef.current = driverId;
    setSelectedDriverId(driverId);
    setSelectedDriverData(null);
    setTrail([]);
    setError('');

    if (driverId) socket.emit('subscribe', { driverId });
  };

  const refreshDriversList = () => socketRef.current?.emit('get_online_drivers');

  const isConnected = connectionStatus === 'connected';
  const selectedDriver = onlineDrivers.find((driver) => driver.driverId === selectedDriverId);
  const selectedName =
    selectedDriverData?.profile?.name || selectedDriver?.profile?.name || selectedDriverId;

  return (
    <div className="dashboard">
      <div className="dashboard-bar">
        <h1 className="dashboard-title">Dispatch</h1>
        <div className="dashboard-session">
          <span className={`connection connection-${connectionStatus}`}>
            <span className="status-dot" aria-hidden="true" />
            {STATUS_LABELS[connectionStatus] || connectionStatus}
          </span>
          <span className="muted">Signed in as {user.username}</span>
          <button type="button" className="btn btn-quiet" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="dashboard-grid">
        <section className="panel roster" aria-labelledby="roster-title">
          <div className="panel-header">
            <h2 id="roster-title">
              Online drivers <span className="count">{onlineDrivers.length}</span>
            </h2>
            <button
              type="button"
              className="btn btn-quiet btn-small"
              onClick={refreshDriversList}
              disabled={!isConnected}
            >
              Refresh
            </button>
          </div>

          {connectionStatus === 'connecting' ? (
            <p className="empty-state">
              <span className="loading-spinner" aria-hidden="true" />
              Connecting to the tracking service...
            </p>
          ) : onlineDrivers.length === 0 ? (
            <div className="empty-state">
              <p>No drivers online</p>
              <small>Drivers appear here once they report a position.</small>
            </div>
          ) : (
            <ul className="roster-list">
              {onlineDrivers.map((driver) => {
                const isSelected = selectedDriverId === driver.driverId;
                return (
                  <li key={driver.driverId}>
                    <button
                      type="button"
                      className="roster-item"
                      aria-pressed={isSelected}
                      onClick={() => handleDriverSelection(isSelected ? '' : driver.driverId)}
                    >
                      <span className="status-dot online" aria-hidden="true" />
                      <span className="roster-text">
                        <span className="roster-name">
                          {driver.profile?.name || driver.driverId}
                        </span>
                        <span className="roster-vehicle">
                          {driver.profile?.vehicle || 'Unknown vehicle'}
                        </span>
                      </span>
                      <span className="roster-seen">
                        <span className="visually-hidden">Last seen </span>
                        {formatTime(driver.lastSeen)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel tracking" aria-labelledby="tracking-title">
          <div className="panel-header">
            <h2 id="tracking-title">Driver location</h2>
            {lastUpdate && <small className="muted">Updated {formatTime(lastUpdate)}</small>}
          </div>

          {!selectedDriverId ? (
            <div className="empty-state">
              <p>Pick a driver from the list to follow their position.</p>
            </div>
          ) : (
            <>
              <div className="tracking-head">
                <h3>Tracking {selectedName}</h3>
                <button
                  type="button"
                  className="btn btn-quiet btn-small"
                  onClick={() => handleDriverSelection('')}
                >
                  Stop tracking
                </button>
              </div>

              {selectedDriverData ? (
                <div className="tracking-body">
                  <dl className="spec-list">
                    <LocationRow
                      label="Vehicle"
                      value={selectedDriverData.profile?.vehicle || 'Unknown'}
                    />
                    <LocationRow
                      label="Status"
                      value={selectedDriverData.isOnline ? 'Online' : 'Offline'}
                    />
                    <LocationRow
                      label="Latitude"
                      value={formatCoordinate(selectedDriverData.location?.lat)}
                      mono
                    />
                    <LocationRow
                      label="Longitude"
                      value={formatCoordinate(selectedDriverData.location?.lng)}
                      mono
                    />
                    <LocationRow
                      label="Reported"
                      value={formatTime(selectedDriverData.location?.timestamp)}
                    />
                  </dl>
                  <ServiceAreaMap trail={trail} />
                </div>
              ) : (
                <p className="empty-state">
                  <span className="loading-spinner" aria-hidden="true" />
                  Waiting for the next position...
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <div className="toasts" role="status" aria-live="polite">
        {notifications.map((notification) => (
          <div key={notification.id} className={`toast toast-${notification.type}`}>
            {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function LocationRow({ label, value, mono = false }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined}>{value}</dd>
    </div>
  );
}

LocationRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  mono: PropTypes.bool,
};

/** @param {string|undefined} timestamp */
function formatTime(timestamp) {
  if (!timestamp) return 'never';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? 'never' : date.toLocaleTimeString();
}

/** @param {number|undefined} value */
function formatCoordinate(value) {
  return typeof value === 'number' ? value.toFixed(6) : 'n/a';
}

Dashboard.propTypes = {
  user: PropTypes.shape({ username: PropTypes.string }).isRequired,
  onLogout: PropTypes.func.isRequired,
};

export default Dashboard;
