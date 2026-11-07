import { defineConfig, devices } from '@playwright/test';

// Deliberately separate from the generated 9,900-scenario suite and the
// unauthenticated smoke checks. Only the exact approved live frontend origin.
const approvedOrigin = 'https://hotel-inventory-frontend-mauve.vercel.app';
function liveBaseURL(): string {
  if (process.env.PW_LIVE_AUTH_READONLY !== 'YES') {
    throw new Error('Authenticated live checks require PW_LIVE_AUTH_READONLY=YES');
  }
  const url = new URL(process.env.PW_BASE_URL || approvedOrigin);
  if (url.origin !== approvedOrigin || !['', '/'].includes(url.pathname) || url.search || url.hash) {
    throw new Error('Unapproved frontend origin for authenticated live checks');
  }
  return approvedOrigin;
}

export default defineConfig({
  testDir: './live-authenticated',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: {
    baseURL: liveBaseURL(),
    // Never persist passwords, auth responses, cookies or localStorage in
    // GitHub artifacts. Even on a failing production-authentication run.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    serviceWorkers: 'block'
  },
  projects: [{ name: 'live-authenticated-chromium', use: { ...devices['Desktop Chrome'] } }]
});
