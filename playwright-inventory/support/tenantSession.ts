import { expect, type Page } from '@playwright/test';
import { requireDisposableTenantCredentials } from './environment';

export async function selectEnglishUI(page: Page): Promise<void> {
  // App source: src/i18n/config.ts, I18nProvider.tsx
  await page.addInitScript(() => localStorage.setItem('inventory_locale', 'en-GB'));
}

export async function loginAsTenant(page: Page): Promise<void> {
  const { email, password } = requireDisposableTenantCredentials();
  await selectEnglishUI(page);
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('[data-auth-form="true"] button[type="submit"]').click();
  // Require the protected page itself, not just the transition URL.
  await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
}

export async function fulfillJson(route: import('@playwright/test').Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

export const summaryFixture = {
  master_data: { total_products: 19, total_suppliers: 7, total_storage_locations: 3 },
  shipments: { total_shipments: 5, pending_shipments: 2, partial_shipments: 1, received_shipments: 2 },
  alerts: { total_alerts: 4, unresolved_alerts: 2, critical_unresolved_alerts: 1, unacknowledged_alerts: 1 },
  stock: { total_stock_rows: 10, low_stock_rows: 3 }
};
