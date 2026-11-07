import { test as base, expect } from '@playwright/test';
export type { Page, Route } from '@playwright/test';

/** Applied only to source-reviewed original test IDs under the dedicated live config.
 * The generated 9,900 authored assertions remain unchanged.
 * Mocked page.route requests are still exercised, but unmocked non-idempotent
 * network traffic is denied before reaching the real API. Authentication
 * login/refresh POST is the sole approved exception (may create sessions).
 */
const FRONTEND_ORIGIN = 'https://hotel-inventory-frontend-mauve.vercel.app';
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
function approvedLogin(method: string, rawUrl: string): boolean {
  if (method !== 'POST') return false;
  try {
    const url = new URL(rawUrl);
    const trustedFrontend = url.origin === FRONTEND_ORIGIN;
    const trustedRender = url.protocol === 'https:' && /(?:^|\.)onrender\.com$/i.test(url.hostname);
    return (trustedFrontend || trustedRender) && /^\/(?:api\/)?auth\/(?:login|refresh)$/.test(url.pathname);
  } catch { return false; }
}
export const test = base.extend({
  page: async ({ page }, use) => {
    if (process.env.PW_LIVE_ORIGINAL_READONLY !== 'YES') {
      await use(page); // normal disposable test mode retains existing behavior
      return;
    }
    const unexpectedCompletedWrites: string[] = [];
    page.on('requestfinished', request => {
      const method = request.method().toUpperCase();
      if (!READ_METHODS.has(method) && !approvedLogin(method, request.url())) {
        // Never include request URL, body, cookies or credentials in logs.
        unexpectedCompletedWrites.push(method);
      }
    });
    await page.route('**/*', route => {
      const method = route.request().method().toUpperCase();
      if (READ_METHODS.has(method) || approvedLogin(method, route.request().url())) {
        return route.continue();
      }
      return route.abort('blockedbyclient');
    });
    await use(page);
    expect(unexpectedCompletedWrites, 'Unexpected completed non-auth write during a live original test').toEqual([]);
  }
});
export { expect };
