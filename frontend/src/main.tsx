import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Chuẩn hóa toàn bộ ứng dụng sang định dạng Việt Nam (vi-VN): Dấu chấm hàng nghìn, dấu phẩy thập phân
const origNumToLocale = Number.prototype.toLocaleString;
Number.prototype.toLocaleString = function (locales?: string | string[], options?: Intl.NumberFormatOptions) {
  return origNumToLocale.call(this, locales || 'vi-VN', options);
};

const origDateToLocale = Date.prototype.toLocaleString;
Date.prototype.toLocaleString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  return origDateToLocale.call(this, locales || 'vi-VN', options);
};

const origDateToLocaleDate = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  return origDateToLocaleDate.call(this, locales || 'vi-VN', options);
};

const origDateToLocaleTime = Date.prototype.toLocaleTimeString;
Date.prototype.toLocaleTimeString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  const defaultOpts: Intl.DateTimeFormatOptions = { hour12: false, ...options };
  return origDateToLocaleTime.call(this, locales || 'vi-VN', defaultOpts);
};

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
