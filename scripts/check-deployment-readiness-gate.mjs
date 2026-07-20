import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const read = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing deployment-readiness file: ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
};
const requireText = (content, expected, label) => {
  if (!content.includes(expected)) errors.push(`${label} must include: ${expected}`);
};

const pkg = JSON.parse(read('package.json') || '{}');
const config = read('playwright.deployment.config.ts');
const testSource = read('tests/deployment/deployment-readiness.spec.ts');
const workflow = read('.github/workflows/deployment-readiness.yml');
const docs = read('docs/AUTOMATED_DEPLOYMENT_READINESS_GATE.md');
const deploymentTsconfig = read('tsconfig.deployment.json');
const sourceDistribution = read('scripts/prepare-source-distribution.mjs');

if (pkg.scripts?.['test:deployment-readiness'] !== 'playwright test --config=playwright.deployment.config.ts') {
  errors.push('package.json must expose test:deployment-readiness with the dedicated Playwright configuration.');
}
if (pkg.scripts?.['check:deployment-readiness-gate'] !== 'node scripts/check-deployment-readiness-gate.mjs') {
  errors.push('package.json must expose check:deployment-readiness-gate.');
}
if (pkg.scripts?.['typecheck:deployment-readiness'] !== 'tsc -p tsconfig.deployment.json --noEmit') {
  errors.push('package.json must expose typecheck:deployment-readiness.');
}
requireText(pkg.scripts?.['check:ci'] || '', 'check:deployment-readiness-gate', 'check:ci');

[
  "testDir: './tests/deployment'",
  'workers: 1',
  "trace: 'retain-on-failure'",
  "screenshot: 'only-on-failure'"
].forEach((expected) => requireText(config, expected, 'playwright.deployment.config.ts'));

[
  '/health/live',
  '/health/ready',
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/sessions',
  '/api/dashboard/summary',
  '/api/decision-intelligence/probabilistic-forecasting-summary',
  '/decision-learning-feedback',
  '/probabilistic-forecasting',
  '/cross-domain-optimization',
  "access-control-allow-origin",
  'inventory_refresh_token=',
  'Refresh token must never be exposed in JSON',
  'must not overflow horizontally'
].forEach((expected) => requireText(testSource, expected, 'deployment-readiness Playwright test'));

[
  'name: Deployment Readiness Gate',
  'workflow_dispatch:',
  'type: environment',
  'DEPLOYMENT_FRONTEND_URL',
  'DEPLOYMENT_BACKEND_URL',
  'E2E_EMAIL',
  'E2E_PASSWORD',
  'npm run repo:clean-generated',
  'npm run check:deployment-readiness-gate',
  'npm run typecheck:deployment-readiness',
  'npm run test:deployment-readiness',
  'actions/upload-artifact@v4'
].forEach((expected) => requireText(workflow, expected, 'deployment-readiness workflow'));


[
  'playwright.deployment.config.ts',
  'tests/deployment/**/*.ts',
  '"@playwright/test"'
].forEach((expected) => requireText(deploymentTsconfig, expected, 'tsconfig.deployment.json'));


requireText(sourceDistribution, "'playwright-deployment-report'", 'source distribution staging');

if (/\n\s+push:|\n\s+schedule:/.test(workflow)) {
  errors.push('Deployment readiness must remain manually promoted; the workflow must not run on push or a schedule.');
}

[
  '# Automated Deployment Readiness Gate',
  'DEPLOYMENT_FRONTEND_URL',
  'DEPLOYMENT_BACKEND_URL',
  'E2E_EMAIL',
  'E2E_PASSWORD',
  'GitHub Environment',
  'read-only operational checks',
  'authentication lifecycle'
].forEach((expected) => requireText(docs, expected, 'deployment-readiness documentation'));

if (errors.length > 0) {
  console.error('Deployment readiness gate check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Deployment readiness gate static check passed.');
