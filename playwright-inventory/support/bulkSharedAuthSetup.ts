import { chromium } from '@playwright/test';
import { createBulkAuthSnapshot } from './liveOriginalSafeTest';

/** GitHub job-wide auth, held only in parent/worker process memory. */
export default async function bulkSharedAuthSetup(): Promise<void> {
  if (process.env.PW_LIVE_ORIGINAL_READONLY !== 'YES' ||
      !(process.env.PW_ORIGINAL_SUITE_GROUP ?? '').startsWith('BULK_SAFE_')) return;
  const browser = await chromium.launch();
  try {
    const snapshot = await createBulkAuthSnapshot(browser);
    process.env.PW_BULK_SHARED_AUTH_STATE = JSON.stringify(snapshot);
  } finally {
    await browser.close();
  }
}
