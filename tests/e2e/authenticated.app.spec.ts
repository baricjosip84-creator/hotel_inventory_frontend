import { test, expect } from '@playwright/test';
import { bootstrapAuthenticatedPage, loginThroughUi } from './helpers/session';

/*
  tests/e2e/authenticated.app.spec.ts

  What changed:
  - keeps one real UI login test
  - makes the UI login assertion more production-safe
  - keeps protected route coverage on API-bootstrap auth, which is more stable for CI/E2E

  Why:
  - UI login can be slightly slower or occasionally hit rate-limit timing
  - protected route tests should not depend on repeated UI login when API bootstrap already exists

  What problem this solves:
  - reduces flaky auth failures
  - keeps authenticated route coverage stable
*/

test.describe('authenticated application flows', () => {
  test('valid credentials log in through the real UI and enter the protected app', async ({ page }) => {
    await loginThroughUi(page);

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator('body')).toContainText(/Dashboard|Inventory Platform/i);
  });

  test('authenticated user can access protected routes', async ({ page, request }) => {
    await bootstrapAuthenticatedPage(page, request);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('body')).toContainText(/Dashboard/i);

    await page.goto('/stock');
    await expect(page).toHaveURL(/\/stock$/);
    await expect(page.locator('body')).toContainText(/Stock/i);

    await page.goto('/shipments');
    await expect(page).toHaveURL(/\/shipments$/);
    await expect(page.locator('body')).toContainText(/Shipments/i);

    await page.goto('/sessions');
    await expect(page).toHaveURL(/\/sessions$/);
    await expect(page.locator('body')).toContainText(/Sessions/i);
  });

  test('session persists across navigation', async ({ page, request }) => {
    await bootstrapAuthenticatedPage(page, request);

    await page.goto('/stock');
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator('body')).toContainText(/Stock/i);

    await page.goto('/shipments');
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.locator('body')).toContainText(/Shipments/i);
  });
});