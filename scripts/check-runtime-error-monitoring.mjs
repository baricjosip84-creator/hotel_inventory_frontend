import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const requireText = (content, expected, label) => {
  if (!content.includes(expected)) throw new Error(`${label} must include: ${expected}`);
};

const pkg = JSON.parse(read('package.json'));
const monitoring = read('src/observability/runtimeErrorMonitoring.ts');
const sessionContext = read('src/observability/sessionContext.ts');
const main = read('src/main.tsx');
const api = read('src/lib/api.ts');
const platformApi = read('src/lib/platformApi.ts');
const auth = read('src/lib/auth.ts');
const platformAuth = read('src/lib/platformAuth.ts');
const vite = read('vite.config.ts');
const envExample = read('.env.example');
const docs = read('docs/RUNTIME_ERROR_MONITORING.md');
const workflow = read('.github/workflows/frontend-validation.yml');

if (!pkg.dependencies?.['@sentry/react']) throw new Error('@sentry/react production dependency is required.');
if (!pkg.devDependencies?.['@sentry/vite-plugin']) throw new Error('@sentry/vite-plugin development dependency is required.');
if (pkg.scripts?.['check:runtime-error-monitoring'] !== 'node scripts/check-runtime-error-monitoring.mjs') {
  throw new Error('package.json must expose check:runtime-error-monitoring.');
}

[
  'VITE_SENTRY_DSN', 'VITE_SENTRY_ENVIRONMENT', 'VITE_SENTRY_TRACES_SAMPLE_RATE',
  'sendDefaultPii: false', 'browserTracingIntegration', 'beforeSend', 'captureApiFailure',
  'tenant_id', 'app_area', 'request_id', 'authorization', 'cookie'
].forEach((expected) => requireText(monitoring, expected, 'frontend runtime monitoring'));

['onUncaughtError', 'onCaughtError', 'onRecoverableError', 'RuntimeErrorBoundary', 'ApplicationErrorFallback'].forEach((expected) => {
  requireText(main, expected, 'frontend root');
});
requireText(sessionContext, "window.location.pathname.startsWith('/platform')", 'session context');
requireText(auth, 'getTenantObservabilityIdentity', 'tenant auth context');
requireText(platformAuth, 'getPlatformObservabilityIdentity', 'platform auth context');
requireText(api, "area: 'tenant'", 'tenant API monitoring');
requireText(platformApi, "area: 'platform'", 'platform API monitoring');
[
  '@sentry/vite-plugin', '__APP_RELEASE__', 'VERCEL_GIT_COMMIT_SHA', 'sentryVitePlugin',
  "sourcemap: sentrySourceMapUploadEnabled ? 'hidden' : false", 'filesToDeleteAfterUpload'
].forEach((expected) => requireText(vite, expected, 'Vite Sentry setup'));
['VITE_SENTRY_DSN=', 'VITE_SENTRY_ENVIRONMENT=', 'VITE_SENTRY_TRACES_SAMPLE_RATE='].forEach((expected) => {
  requireText(envExample, expected, '.env.example');
});
['# Runtime Error Monitoring', 'Captured', 'Privacy', 'Vercel variables'].forEach((expected) => {
  requireText(docs, expected, 'runtime monitoring documentation');
});
requireText(workflow, 'npm run check:runtime-error-monitoring', 'Frontend Validation workflow');

console.log('Frontend runtime error monitoring contract check passed.');
