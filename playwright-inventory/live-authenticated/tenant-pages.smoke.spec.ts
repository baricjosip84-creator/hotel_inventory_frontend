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
  // More read-only pages are exercised in this single authenticated browser journey.
  test.setTimeout(240_000);
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

  await test.step('Products: search no-match and clear (browser-only filter)', async () => {
    await page.goto('/products');
    const list = page.locator('#product-list-panel');
    await expect(list.getByRole('heading', { name: 'Product List', exact: true })).toBeVisible();
    const search = list.locator('#product-list-search');
    await expect(search).toBeVisible();
    // Deliberately implausible SKU/search; no private tenant data is required.
    await search.fill('pw-live-no-matches-20261107-zz987654321');
    await expect(list.getByText('No products match the current search and filters.', { exact: true })).toBeVisible();
    await list.getByRole('button', { name: 'Clear product search' }).click();
    await expect(search).toHaveValue('');
    await expect(list.getByRole('button', { name: 'Clear product search' })).toHaveCount(0);
    await expect(list.getByText('No products match the current search and filters.', { exact: true })).toHaveCount(0);
  });

  await test.step('Products: cost filter reset and read-only workspace tabs', async () => {
    const list = page.locator('#product-list-panel');
    const status = list.locator('#product-list-cost-status');
    await expect(status).toBeVisible();
    await status.selectOption('uncosted');
    await expect(status).toHaveValue('uncosted');
    const clear = list.getByRole('button', { name: 'Clear Product Filters' });
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(status).toHaveValue('');
    await expect(clear).toBeDisabled();

    const costTab = page.getByRole('tab', { name: 'Cost & value', exact: true });
    await expect(costTab).toBeVisible();
    await costTab.click();
    await expect(costTab).toHaveAttribute('aria-selected', 'true');
    const catalogTab = page.getByRole('tab', { name: 'Catalog', exact: true });
    await catalogTab.click();
    await expect(catalogTab).toHaveAttribute('aria-selected', 'true');
    await expect(list.locator('#product-list-search')).toBeVisible();
  });


  await test.step('Stock: tenant stock workspace loads', async () => {
    await page.goto('/stock');
    await expect(page).toHaveURL(/\/stock(?:[?#]|$)/, { timeout: 25_000 });
    await expect(page.locator('.io-stock-page')).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('.io-stock-page').getByRole('heading', { name: 'Stock workspace', exact: true })).toBeVisible({ timeout: 25_000 });
  });


  await test.step('Stock: live stock search and clear (or genuine no-stock state)', async () => {
    await page.goto('/stock');
    const stock = page.locator('.io-stock-page');
    await expect(stock.getByRole('heading', { name: 'Stock workspace', exact: true })).toBeVisible();
    const search = stock.locator('#stock-position-search');
    const empty = stock.getByText('No stock positions are available yet. Stock appears here after a product has an on-hand balance at a storage location.', { exact: true });
    await expect.poll(async () => {
      if (await search.isVisible()) return 'positions';
      if (await empty.isVisible()) return 'empty';
      return 'loading';
    }, { timeout: 30_000 }).not.toBe('loading');
    if (await empty.isVisible()) {
      await expect(empty).toBeVisible();
      return;
    }
    await expect(search).toBeVisible();
    await search.fill('pw-live-no-matches-20261107-zz987654321');
    await expect(stock.getByText('No stock positions match the current search and filters.', { exact: true })).toBeVisible();
    const clear = stock.getByRole('button', { name: 'Clear Stock Filters' });
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(search).toHaveValue('');
    await expect(clear).toBeDisabled();
    await expect(stock.getByText('No stock positions match the current search and filters.', { exact: true })).toHaveCount(0);
  });


  await test.step('Suppliers: search no-match and clear (no supplier changes)', async () => {
    await page.goto('/suppliers');
    await expect(page).toHaveURL(/\/suppliers(?:[?#]|$)/, { timeout: 25_000 });
    const suppliers = page.locator('.io-suppliers-page');
    await expect(suppliers.getByRole('heading', { name: 'Supplier workspace', exact: true })).toBeVisible({ timeout: 25_000 });
    const search = suppliers.locator('#supplier-search');
    await expect(search).toBeVisible();
    await search.fill('pw-no-supplier-match-zz987654321');
    await expect(suppliers.getByText('No suppliers match the current search.', { exact: true })).toBeVisible({ timeout: 30_000 });
    const clear = suppliers.getByRole('button', { name: 'Clear Search', exact: true });
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(search).toHaveValue('');
    await expect(clear).toBeDisabled();
  });

  await test.step('Stock Movements: search ledger and clear filters (read only)', async () => {
    await page.goto('/stock-movements');
    await expect(page).toHaveURL(/\/stock-movements(?:[?#]|$)/, { timeout: 25_000 });
    const movements = page.locator('.io-stock-movements-page');
    await expect(movements.getByRole('heading', { name: 'Stock movement ledger', exact: true })).toBeVisible({ timeout: 25_000 });
    await expect(movements.getByRole('heading', { name: 'Movement Ledger', exact: true })).toBeVisible({ timeout: 25_000 });
    const search = movements.locator('.stock-movements-search-field input[type="search"]');
    await expect(search).toBeVisible();
    await search.fill('pw-no-movement-match-zz987654321');
    await expect(search).toHaveValue('pw-no-movement-match-zz987654321');
    const clear = movements.getByRole('button', { name: /^Clear Filters/ });
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(search).toHaveValue('');
    await expect(clear).toBeDisabled();
  });

  await test.step('Stock Transfers: filter draft status and reset search safely', async () => {
    await page.goto('/stock-transfers');
    await expect(page).toHaveURL(/\/stock-transfers(?:[?#]|$)/, { timeout: 25_000 });
    const transfers = page.locator('.io-stock-transfers-page');
    await expect(transfers.getByRole('heading', { name: 'Stock transfer workspace', exact: true })).toBeVisible({ timeout: 25_000 });
    await expect(transfers.getByRole('heading', { name: 'Stock Transfers', exact: true })).toBeVisible({ timeout: 25_000 });
    const search = transfers.locator('#transfer-search');
    const status = transfers.locator('#transfer-status-filter');
    await expect(search).toBeVisible();
    await status.selectOption('draft');
    await expect(status).toHaveValue('draft');
    await search.fill('pw-no-transfer-match-zz987654321');
    await expect(search).toHaveValue('pw-no-transfer-match-zz987654321');
    const clear = transfers.getByRole('button', { name: 'Clear filters', exact: true });
    await expect(clear).toBeEnabled();
    await clear.click();
    await expect(search).toHaveValue('');
    await expect(status).toHaveValue('');
    await expect(clear).toBeDisabled();
  });

  await test.step('Purchase Orders: filter search/status and reset without edits', async () => {
    await page.goto('/purchase-orders');
    await expect(page).toHaveURL(/\/purchase-orders(?:[?#]|$)/, { timeout: 25_000 });
    const registry = page.locator('#purchase-order-registry');
    await expect(registry.getByRole('heading', { name: 'Purchase order registry', exact: true })).toBeVisible({ timeout: 30_000 });
    const search = registry.locator('.purchase-orders-primary-filters .purchase-orders-field--search input');
    const status = registry.locator('.purchase-orders-primary-filters select').first();
    await expect(search).toBeVisible();
    await status.selectOption('draft');
    await expect(status).toHaveValue('draft');
    await search.fill('pw-no-purchase-order-match-zz987654321');
    await expect(registry.getByText('No purchase orders found.', { exact: true })).toBeVisible({ timeout: 25_000 });
    await registry.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await expect(search).toHaveValue('');
    await expect(status).toHaveValue('');
  });

});
