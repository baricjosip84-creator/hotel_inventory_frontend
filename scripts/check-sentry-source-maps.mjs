import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const requireText = (content, expected, label) => {
  if (!content.includes(expected)) throw new Error(`${label} must include: ${expected}`);
};

const pkg = JSON.parse(read('package.json'));
const vite = read('vite.config.ts');
const envExample = read('.env.example');
const runtimeDocs = read('docs/RUNTIME_ERROR_MONITORING.md');
const deploymentWorkflow = read('.github/workflows/deployment-readiness.yml');
const deploymentTest = read('tests/deployment/deployment-readiness.spec.ts');

if (pkg.scripts?.['check:sentry-source-maps'] !== 'node scripts/check-sentry-source-maps.mjs') {
  throw new Error('package.json must expose check:sentry-source-maps.');
}
requireText(pkg.scripts?.['check:ci'] || '', 'check:sentry-source-maps', 'check:ci');

[
  '@sentry/vite-plugin',
  'SENTRY_AUTH_TOKEN',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_SOURCE_MAPS_REQUIRED',
  'SENTRY_ALLOW_FAILURE',
  'Incomplete Sentry source-map configuration',
  "sourcemap: sentrySourceMapUploadEnabled ? 'hidden' : false",
  'filesToDeleteAfterUpload',
  'sentry_source_maps',
  'sentry_release'
].forEach((expected) => requireText(vite, expected, 'vite.config.ts'));

[
  'SENTRY_ORG=',
  'SENTRY_PROJECT=',
  'SENTRY_SOURCE_MAPS_REQUIRED=false',
  'DEPLOYMENT_REQUIRE_SENTRY_SOURCE_MAPS=false'
].forEach((expected) => requireText(envExample, expected, '.env.example'));

[
  '`SENTRY_AUTH_TOKEN`',
  'hidden source maps',
  'deletes them from the deployed output',
  '`VITE_` prefix',
  'DEPLOYMENT_REQUIRE_SENTRY_SOURCE_MAPS=true'
].forEach((expected) => requireText(runtimeDocs, expected, 'runtime monitoring documentation'));

requireText(deploymentWorkflow, 'DEPLOYMENT_REQUIRE_SENTRY_SOURCE_MAPS', 'deployment readiness workflow');
requireText(deploymentTest, 'Production frontend must confirm Sentry source maps were uploaded', 'deployment readiness test');

if (/VITE_SENTRY_AUTH_TOKEN|VITE_SENTRY_ORG|VITE_SENTRY_PROJECT/.test(envExample + vite)) {
  throw new Error('Sentry upload credentials must never use the public VITE_ prefix.');
}

console.log('Sentry source-map upload contract check passed.');
