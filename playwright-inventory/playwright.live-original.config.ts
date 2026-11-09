import { defineConfig, devices } from '@playwright/test';
import manifest from './original-suite-approved.json';

/** Approved ORIGINAL scenarios only. A bulk group can span several source-fingerprinted specs. */
type ApprovedEntry = { file: string; ids: string[]; sha256: string };
type ApprovedGroup = { file?: string; ids?: string[]; entries?: ApprovedEntry[]; secret: boolean };
const GROUP = process.env.PW_ORIGINAL_SUITE_GROUP || '';
const approved = manifest.approved_groups as Record<string, ApprovedGroup>;
if (process.env.PW_LIVE_ORIGINAL_READONLY !== 'YES' || !Object.prototype.hasOwnProperty.call(approved, GROUP)) {
  throw new Error('Choose an approved original-suite group and set PW_LIVE_ORIGINAL_READONLY=YES');
}
const approvedOrigin = 'https://hotel-inventory-frontend-mauve.vercel.app';
const target = new URL(process.env.PW_BASE_URL || approvedOrigin);
if (target.origin !== approvedOrigin || !['', '/'].includes(target.pathname) || target.search || target.hash) {
  throw new Error('Original-suite live mode is restricted to the existing Vercel frontend origin');
}
const group = approved[GROUP];
const entries: ApprovedEntry[] = group.entries ?? (
  group.file && group.ids ? [{ file: group.file, ids: group.ids, sha256: '' }] : []
);
if (entries.length === 0 || entries.some(entry =>
  !entry.file.startsWith('tenant/') || !entry.file.endsWith('.spec.ts') ||
  !entry.ids.length || entry.ids.some(id => !/^[A-Z0-9]+-\d{3}$/.test(id))
)) {
  throw new Error('Invalid reviewed original-suite test ID/file allowlist');
}
const selectedIds = entries.flatMap(entry => entry.ids);
if (selectedIds.length !== new Set(selectedIds).size) {
  throw new Error('Duplicate original-suite test ID in approved group');
}
const testMatch = entries.map(entry => `**/${entry.file}`);
export default defineConfig({
  testDir: './tests',
  testMatch,
  // Each Chromium worker owns a distinct refresh-cookie session; no job-wide shared cookie.
  // Original ID is anchored to its Playwright title; unique across the complete 9,900.
  grep: new RegExp(`\\b(?:${selectedIds.join('|')})\\b`),
  fullyParallel: false,
  workers: ['BULK_SAFE_03','BULK_SAFE_03_RECHECK','BULK_SAFE_04','BULK_SAFE_04_RECHECK','BULK_SAFE_04_RECHECK_2','BULK_SAFE_05','BULK_SAFE_05_RECHECK','BULK_SAFE_05_RECHECK_2','BULK_SAFE_06','BULK_SAFE_06_RECHECK','BULK_SAFE_06_RECHECK_2','BULK_SAFE_06_RECHECK_3','BULK_SAFE_06_RECHECK_4','BULK_SAFE_07','BULK_SAFE_07_RECHECK','BULK_SAFE_02_RECHECK_2','BULK_SAFE_02_RECHECK_3'].includes(GROUP) ? 1 : GROUP.startsWith('BULK_SAFE_') ? 3 : 1,
  forbidOnly: true,
  retries: 0,
  maxFailures: GROUP === 'BULK_SAFE_02_RECHECK_2' ? 3 : undefined,
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
