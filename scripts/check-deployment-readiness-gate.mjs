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
const viteConfig = read('vite.config.ts');
const deploymentWaiter = read('scripts/wait-for-production-deployment.mjs');
const vercel = read('vercel.json');
const gitignore = read('.gitignore');

if (pkg.scripts?.['test:deployment-readiness'] !== 'playwright test --config=playwright.deployment.config.ts') {
  errors.push('package.json must expose test:deployment-readiness with the dedicated Playwright configuration.');
}
if (pkg.scripts?.['check:deployment-readiness-gate'] !== 'node scripts/check-deployment-readiness-gate.mjs') {
  errors.push('package.json must expose check:deployment-readiness-gate.');
}
if (pkg.scripts?.['typecheck:deployment-readiness'] !== 'tsc -p tsconfig.deployment.json --noEmit') {
  errors.push('package.json must expose typecheck:deployment-readiness.');
}
if (pkg.scripts?.['wait:production-deployment'] !== 'node scripts/wait-for-production-deployment.mjs') {
  errors.push('package.json must expose wait:production-deployment.');
}
requireText(pkg.scripts?.['check:ci'] || '', 'check:deployment-readiness-gate', 'check:ci');

[
  "testDir: './tests/deployment'",
  'workers: 1',
  "trace: 'retain-on-failure'",
  "screenshot: 'only-on-failure'"
].forEach((expected) => requireText(config, expected, 'playwright.deployment.config.ts'));

[
  '/deployment-version.json',
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
  'EXPECTED_FRONTEND_COMMIT',
  'EXPECTED_BACKEND_COMMIT',
  'access-control-allow-origin',
  'inventory_refresh_token=',
  'Refresh token must never be exposed in JSON',
  'must not overflow horizontally'
].forEach((expected) => requireText(testSource, expected, 'deployment-readiness Playwright test'));

[
  'name: Deployment Readiness Gate',
  'workflow_dispatch:',
  'workflow_run:',
  'Frontend Validation',
  "head_branch == 'main'",
  'type: environment',
  'expected_backend_commit',
  'EXPECTED_FRONTEND_COMMIT',
  'EXPECTED_BACKEND_COMMIT',
  'DEPLOYMENT_FRONTEND_URL',
  'DEPLOYMENT_BACKEND_URL',
  'E2E_EMAIL',
  'E2E_PASSWORD',
  'npm run wait:production-deployment',
  'npm run repo:clean-generated',
  'npm run check:deployment-readiness-gate',
  'npm run typecheck:deployment-readiness',
  'npm run test:deployment-readiness',
  'actions/upload-artifact@v4',
  'group: deployment-readiness-${{ github.event_name }}-',
  'inputs.expected_backend_commit || inputs.environment || github.run_id'
].forEach((expected) => requireText(workflow, expected, 'deployment-readiness workflow'));

const frontendValidationWorkflow = read('.github/workflows/frontend-validation.yml');
[
  'Lint complete frontend repository',
  'run: npm run lint'
].forEach((expected) => requireText(frontendValidationWorkflow, expected, 'frontend validation workflow'));

if (frontendValidationWorkflow.includes('full-lint-diagnostic:')) {
  errors.push('Frontend validation must not keep the legacy manual-only full-lint diagnostic after repository-wide lint is clean.');
}

[
  'deployment-version-metadata',
  'VERCEL_GIT_COMMIT_SHA',
  'deployment-version.json',
  'git_commit',
  'this.emitFile'
].forEach((expected) => requireText(viteConfig, expected, 'Vite deployment version plugin'));

[
  'EXPECTED_FRONTEND_COMMIT',
  'EXPECTED_BACKEND_COMMIT',
  '/deployment-version.json',
  '/health/ready',
  'deployment?.git_commit'
].forEach((expected) => requireText(deploymentWaiter, expected, 'deployment waiter'));

[
  'playwright.deployment.config.ts',
  'tests/deployment/**/*.ts',
  '"@playwright/test"'
].forEach((expected) => requireText(deploymentTsconfig, expected, 'tsconfig.deployment.json'));

requireText(sourceDistribution, "'playwright-deployment-report'", 'source distribution staging');
requireText(sourceDistribution, "'deployment-version.json'", 'source distribution staging');
requireText(vercel, '/deployment-version.json', 'vercel.json');
requireText(vercel, 'no-store, max-age=0', 'vercel.json');
requireText(gitignore, 'public/deployment-version.json', '.gitignore');

if (/\n\s+schedule:/.test(workflow)) {
  errors.push('Deployment readiness must not use periodic polling schedules.');
}

[
  '# Automated Deployment Readiness Gate',
  'automatic',
  'Frontend Validation',
  'Phase 16 Production Validation',
  'DEPLOYMENT_FRONTEND_URL',
  'DEPLOYMENT_BACKEND_URL',
  'E2E_EMAIL',
  'E2E_PASSWORD',
  'GitHub Environment',
  'deployment-version.json',
  'FRONTEND_READINESS_DISPATCH_TOKEN',
  'read-only operational checks',
  'authentication lifecycle'
].forEach((expected) => requireText(docs, expected, 'deployment-readiness documentation'));

if (errors.length > 0) {
  console.error('Deployment readiness gate check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Deployment readiness gate static check passed.');
