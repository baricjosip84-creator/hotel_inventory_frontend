import { defineConfig } from '@playwright/test';

/*
  Browser/API configuration for the automatic and manually triggered deployment readiness gate.

  This configuration never starts a local Vite server. It only targets the
  deployed URLs supplied by the selected GitHub Environment or the local shell.
*/
const baseURL = process.env.DEPLOYMENT_FRONTEND_URL?.trim() || 'https://deployment-url-required.invalid';

export default defineConfig({
  testDir: './tests/deployment',
  timeout: 60 * 1000,
  expect: {
    timeout: 15 * 1000
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['line'],
    ['html', { outputFolder: 'playwright-deployment-report', open: 'never' }],
    ['json', { outputFile: 'test-results/deployment-readiness.json' }]
  ],
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: false,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  }
});
