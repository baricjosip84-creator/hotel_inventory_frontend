import { defineConfig, devices } from '@playwright/test';

// This configuration is deliberately NOT used by the main 9,900-test suite.
// No authenticated sessions, no production mutation, and no wider URL allowance.
const approvedOrigin = 'https://hotel-inventory-frontend-mauve.vercel.app';

function approvedLiveOrigin(): string {
  if (process.env.PW_LIVE_READONLY !== 'YES') {
    throw new Error('Live smoke tests require PW_LIVE_READONLY=YES');
  }
  const value = process.env.PW_BASE_URL || approvedOrigin;
  const url = new URL(value);
  if (url.origin !== approvedOrigin || (url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new Error(`Refusing unapproved live target. Expected exactly ${approvedOrigin}`);
  }
  return approvedOrigin;
}

export default defineConfig({
  testDir: './live-readonly',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'live-readonly-report' }]
  ],
  use: {
    baseURL: approvedLiveOrigin(),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    serviceWorkers: 'block'
  },
  projects: [{ name: 'live-readonly-chromium', use: { ...devices['Desktop Chrome'] } }]
});
