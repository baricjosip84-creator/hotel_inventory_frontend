import { test as base, expect } from '@playwright/test';

// All non-read-only browser HTTP requests are aborted BEFORE reaching any server.
// Live pages can nevertheless *attempt* automatic POSTs (for example telemetry
// or session refresh). A blocked attempt is not a completed write and must not
// make otherwise passing, browser-only smoke tests fail during fixture teardown.
export const test = base.extend({
  page: async ({ page }, use) => {
    const allowedMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
    const blockedMethods: string[] = [];
    const unexpectedlyCompletedWrites: string[] = [];

    // Additional fail-closed check: if an unsafe HTTP request somehow completes,
    // report a real safety violation instead of silently overlooking it.
    page.on('requestfinished', (request) => {
      const method = request.method().toUpperCase();
      if (!allowedMethods.has(method)) {
        unexpectedlyCompletedWrites.push(method);
      }
    });

    // Installed before any navigation; service workers are disabled in the
    // separate live-readonly config. Never continue a POST/PUT/PATCH/DELETE.
    await page.route('**/*', async (route) => {
      const method = route.request().method().toUpperCase();
      if (!allowedMethods.has(method)) {
        await route.abort('blockedbyclient');
        blockedMethods.push(method); // Successfully cancelled; no server write.
        return;
      }
      await route.continue();
    });

    // addInitScript runs on EVERY navigation and reload, not just first open.
    // Seed a predictable default only for a new browser context. Never erase
    // the user's chosen language during the persistence smoke test.
    await page.addInitScript(() => {
      if (localStorage.getItem('inventory_locale') === null) {
        localStorage.setItem('inventory_locale', 'en-GB');
      }
    });
    await use(page);

    expect(
      unexpectedlyCompletedWrites,
      'Live-readonly safety violation: a non-read-only HTTP request completed'
    ).toEqual([]);

    // Information only; do not print URLs, request bodies, tokens or credentials.
    if (blockedMethods.length) {
      const methodSummary = [...new Set(blockedMethods)].sort().join(', ');
      console.log(`[live-readonly safety] Blocked ${blockedMethods.length} unsafe browser request(s) before sending (methods: ${methodSummary}).`);
    }
  }
});

export { expect };
