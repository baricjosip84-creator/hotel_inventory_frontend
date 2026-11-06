import { test as base, expect } from '@playwright/test';

// Custom page fixture: every request passes through the HTTP verb gate BEFORE
// navigation. It is automatically applied to every live-readonly test.
export const test = base.extend({
  page: async ({ page }, use) => {
    const prohibited: string[] = [];
    await page.route('**/*', async (route) => {
      const method = route.request().method().toUpperCase();
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        // Never send mutations, login POSTs, analytics POSTs, or other writes.
        prohibited.push(method);
        await route.abort('blockedbyclient');
        return;
      }
      await route.continue();
    });
    await page.addInitScript(() => {
      localStorage.setItem('inventory_locale', 'en-GB');
    });
    await use(page);
    expect(prohibited, 'No non-read-only HTTP method may be attempted during a live smoke test').toEqual([]);
  }
});

export { expect };
