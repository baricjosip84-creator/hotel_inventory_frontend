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
      <App />
    </RuntimeErrorBoundary>
  </React.StrictMode>
);


if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // App remains usable online if service-worker registration is unavailable.
    });
  });
}
