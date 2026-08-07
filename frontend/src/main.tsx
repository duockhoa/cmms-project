import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Automatically unregister any stale service workers (from previous localhost projects) and reload to apply
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    if (registrations.length > 0) {
      Promise.all(registrations.map(r => r.unregister())).then(() => {
        if (window.caches) {
          caches.keys().then((keys) => {
            Promise.all(keys.map(k => caches.delete(k))).then(() => {
              window.location.reload();
            });
          });
        } else {
          window.location.reload();
        }
      });
    }
  });
}


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
