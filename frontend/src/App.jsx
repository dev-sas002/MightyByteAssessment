import React, { useCallback, useState } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';
import DriverApp from './components/DriverApp';

const MODES = {
  DASHBOARD: 'dashboard',
  DRIVER: 'driver',
};

/**
 * Shell for the two demo surfaces: the dispatch dashboard and the driver
 * simulator. Switching modes clears any signed-in session.
 */
function App() {
  const [mode, setMode] = useState(MODES.DASHBOARD);
  const [user, setUser] = useState(null);

  const switchMode = useCallback((nextMode) => {
    setMode(nextMode);
    setUser(null);
  }, []);

  let content;
  if (mode === MODES.DRIVER) {
    content = <DriverApp />;
  } else if (!user) {
    content = <LoginPage onLogin={setUser} />;
  } else {
    content = <Dashboard user={user} onLogout={() => setUser(null)} />;
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Ride-share dispatch</span>
        </div>
        <nav className="mode-switch" aria-label="Demo surface">
          <button
            type="button"
            className="mode-btn"
            aria-pressed={mode === MODES.DASHBOARD}
            onClick={() => switchMode(MODES.DASHBOARD)}
          >
            Dispatch dashboard
          </button>
          <button
            type="button"
            className="mode-btn"
            aria-pressed={mode === MODES.DRIVER}
            onClick={() => switchMode(MODES.DRIVER)}
          >
            Driver app
          </button>
        </nav>
      </header>
      <main id="main" className="app-main">
        {content}
      </main>
    </div>
  );
}

export default App;
