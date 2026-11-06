import { defineConfig, devices } from '@playwright/test';
import { targetBaseURL } from './support/environment';

/** Generated only. Do not run until the user authorizes Phase 2. */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: targetBaseURL(),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    serviceWorkers: 'block'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
