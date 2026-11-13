import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const renderApp = () => {
  const root = document.getElementById('root');
  if (root) {
    try {
      const reactRoot = ReactDOM.createRoot(root, {
        onUncaughtError: (err: unknown) => {
          const e = err as Error;
          root.innerHTML = '<div id="react-uncaught" style="color:red;padding:24px;font-family:monospace;background:#fef2f2;border:2px solid #ef4444;border-radius:12px;margin:16px;"><h3>React Uncaught Error:</h3><pre>' + (e?.stack || e?.message || String(err)) + '</pre></div>';
        },
        onCaughtError: (err: unknown) => {
          const e = err as Error;
          root.innerHTML = '<div id="react-caught" style="color:red;padding:24px;font-family:monospace;background:#fef2f2;border:2px solid #ef4444;border-radius:12px;margin:16px;"><h3>React Caught Error:</h3><pre>' + (e?.stack || e?.message || String(err)) + '</pre></div>';
        }
      });
      reactRoot.render(<App />);
    } catch (e: unknown) {
      const err = e as Error;
      root.innerHTML = '<div id="root-sync-error" style="color:red;padding:24px;font-family:monospace;background:#fef2f2;border:2px solid #ef4444;border-radius:12px;margin:16px;"><h3>Sync Error:</h3><pre>' + (err?.stack || err?.message || String(e)) + '</pre></div>';
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
