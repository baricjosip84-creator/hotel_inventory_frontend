import { defineConfig } from '@playwright/test';
import original from './playwright.live-original.config';

// This auxiliary probe lives outside the original tests folder and does not
// enter the 9,900-scenario ID ledger or the 500 original result counts.
if (process.env.PW_ORIGINAL_SUITE_GROUP !== 'BULK_SAFE_14') throw new Error('B233 probe group mismatch');
export default defineConfig({
  ...original,
  testDir: './scripts',
  testMatch: '**/preflight-batch-233-pages.spec.ts',
  grep: /Batch 233 guarded page access probe/,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  timeout: 480_000,
});
