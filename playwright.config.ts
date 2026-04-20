import { defineConfig } from '@playwright/test';

/*
  playwright.config.ts

  What changed:
  - Configured Playwright for authenticated + unauthenticated testing
  - Uses your existing Vite dev server
  - Allows environment override for base URL

  Why:
  - Ensures tests run against your real frontend
  - Supports local + CI environments

  What problem this solves:
  - Prevents environment mismatch issues
  - Stabilizes test execution
*/

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45 * 1000,
  retries: 1,
  use: {
    baseURL,
    headless: true
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 120 * 1000
  }
});