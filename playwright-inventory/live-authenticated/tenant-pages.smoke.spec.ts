import { expect, test as base } from '@playwright/test';

/**
 * Production tenant: auth-only write allowance and read-only business pages.
 * Credentials are read from GitHub Production environment secrets; never print,
 * save in files, put in URLs or attach browser traces/screenshots.
 *
 * Auth is NOT a pure read: the login/refresh endpoints can establish or rotate
 * sessions and create audit records. No inventory/tenant mutation is allowed.
 */
const FRONTEND_ORIGIN = 'https://hotel-inventory-frontend-mauve.vercel.app';
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function permittedAuthRequest(method: string, rawUrl: string): boolean {
  if (method !== 'POST') return false;
  let url: URL;
  try { url = new URL(rawUrl); } catch { return false; }
  const trustedFrontend = url.origin === FRONTEND_ORIGIN;
  // Render's default HTTPS hostname, not an arbitrary third-party API.
  const trustedRender = url.protocol === 'https:' && /(?:^|\.)onrender\.com$/i.test(url.hostname);
  if (!(trustedFrontend || trustedRender)) return false;
  return /^\/(?:api\/)?auth\/(?:login|refresh)$/.test(url.pathname);
}

const test = base.extend({
  page: async ({ page }, use) => {
    const completedUnexpectedWrites: string[] = [];
    page.on('requestfinished', request => {
      const method = request.method().toUpperCase();
      if (!READ_METHODS.has(method) && !permittedAuthRequest(method, request.url())) {
        completedUnexpectedWrites.push(method);
      }
    });
    await page.route('**/*', async route => {
      const method = route.request().method().toUpperCase();
      if (READ_METHODS.has(method) || permittedAuthRequest(method, route.request().url())) {
        await route.continue();
      } else {
        // Browser-initiated telemetry/mutations are blocked before network I/O.
        // Do not print URLs, request data or auth headers.
        await route.abort('blockedbyclient');
      }
    });
    await page.addInitScript(() => {
      if (localStorage.getItem('inventory_locale') === null) {
        localStorage.setItem('inventory_locale', 'en-GB');
      }
    });
    await use(page);
    expect(completedUnexpectedWrites, 'Unexpected completed inventory-changing network request').toEqual([]);
  }
});

test('LIVE-AUTH-TENANT-001: login then read Dashboard, Products and Stock', async ({ page }) => {
  const email = process.env.PW_TENANT_EMAIL;
  const password = process.env.PW_TENANT_PASSWORD;
  // Don't display secret names alongside their values or copy them to artifacts.
  if (!email || !password) throw new Error('Missing Production environment E2E_EMAIL/E2E_PASSWORD secrets');

  await test.step('Tenant login using Production GitHub Secrets', async () => {
    await page.goto('/login');
    await expect(page.locator('#login-email')).toBeVisible();
    await page.locator('#login-email').fill(email);
    await page.locator('#login-password').fill(password);
    await page.locator('form[data-auth-form="true"] button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/, { timeout: 35_000 });
  });

  await test.step('Dashboard: authenticated operational page loads', async () => {
    await expect(page.locator('.io-dashboard-page')).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('.io-dashboard-page').getByRole('heading', { name: 'Operations Dashboard', exact: true })).toBeVisible({ timeout: 25_000 });
  });

  await test.step('Products: tenant catalog workspace loads', async () => {
    await page.goto('/products');
    await expect(page).toHaveURL(/\/products(?:[?#]|$)/, { timeout: 25_000 });
    await expect(page.locator('.io-products-page')).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('.io-products-page').getByRole('heading', { name: 'Product workspace', exact: true })).toBeVisible({ timeout: 25_000 });
  });

  await test.step('Stock: tenant stock workspace loads', async () => {
    await page.goto('/stock');
    await expect(page).toHaveURL(/\/stock(?:[?#]|$)/, { timeout: 25_000 });
    await expect(page.locator('.io-stock-page')).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('.io-stock-page').getByRole('heading', { name: 'Stock workspace', exact: true })).toBeVisible({ timeout: 25_000 });
  });
});
