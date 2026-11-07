import { defineConfig, devices } from '@playwright/test';
import manifest from './original-suite-approved.json';

/** Exact IDs and original file path for one source-reviewed group; NOT smoke tests. */
const GROUP = process.env.PW_ORIGINAL_SUITE_GROUP || '';
const approved = manifest.approved_groups as Record<string, { file: string; ids: string[]; secret: boolean }>;
if (process.env.PW_LIVE_ORIGINAL_READONLY !== 'YES' || !Object.prototype.hasOwnProperty.call(approved, GROUP)) {
  throw new Error('Choose an approved original-suite group and set PW_LIVE_ORIGINAL_READONLY=YES');
}
const approvedOrigin = 'https://hotel-inventory-frontend-mauve.vercel.app';
const target = new URL(process.env.PW_BASE_URL || approvedOrigin);
if (target.origin !== approvedOrigin || !['', '/'].includes(target.pathname) || target.search || target.hash) {
  throw new Error('Original-suite live mode is restricted to the existing Vercel frontend origin');
}
const group = approved[GROUP];
const expectedIds = group.ids;
if (!expectedIds.length || expectedIds.some(id => !/^[A-Z]+-\d{3}$/.test(id))) {
  throw new Error('Invalid reviewed original-suite test ID allowlist');
}
export default defineConfig({
  testDir: './tests',
  testMatch: `**/${group.file}`,
  // Match the selected scenario ID inside its fully qualified Playwright title.
  grep: new RegExp(`\\b(?:${expectedIds.join('|')})\\b`),
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: approvedOrigin,
    trace: 'off', screenshot: 'off', video: 'off',
    serviceWorkers: 'block'
  },
  projects: [{ name: 'reviewed-original-chromium', use: { ...devices['Desktop Chrome'] } }]
});
