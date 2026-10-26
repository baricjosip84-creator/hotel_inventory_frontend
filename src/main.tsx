import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ApplicationErrorFallback } from './components/ApplicationErrorFallback';
import {
  initializeRuntimeErrorMonitoring,
  reactErrorHandler,
  RuntimeErrorBoundary
} from './observability/runtimeErrorMonitoring';
import { syncRuntimeSessionContext } from './observability/sessionContext';
import { I18nProvider } from './i18n/I18nProvider';
import './index.css';

initializeRuntimeErrorMonitoring();
syncRuntimeSessionContext();

const root = ReactDOM.createRoot(document.getElementById('root')!, {
  onUncaughtError: reactErrorHandler(),
  onCaughtError: reactErrorHandler(),
  onRecoverableError: reactErrorHandler()
});

root.render(
  <React.StrictMode>
    <RuntimeErrorBoundary fallback={ApplicationErrorFallback} beforeCapture={(scope) => scope.setTag('error_boundary', 'application-root')}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </RuntimeErrorBoundary>
  </React.StrictMode>
);


if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const wasControlled = Boolean(navigator.serviceWorker.controller);
    const release = document.querySelector<HTMLMetaElement>('meta[name="inventory-frontend-release"]')?.content || 'unknown';
    const refreshKey = `inventory-worker-refreshed:${release}`;
    if (wasControlled) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Refresh once per release when a newly activated worker takes control.
        // This prevents an old SPA bundle remaining in memory indefinitely.
        try {
          if (sessionStorage.getItem(refreshKey)) return;
          sessionStorage.setItem(refreshKey, '1');
        } catch {
          // Private mode may restrict storage; the app remains usable.
        }
        window.location.reload();
      }, { once: true });
    }
    navigator.serviceWorker.register('/service-worker.js', { updateViaCache: 'none' })
      .then((registration) => registration.update())
      .catch(() => {
        // App remains usable online if service-worker registration is unavailable.
      });
  });
}
