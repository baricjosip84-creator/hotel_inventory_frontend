import { test, expect } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers/session';

/*
  tests/e2e/stock.operations.spec.ts

  What changed:
  - adds authenticated stock workbench coverage
  - verifies the stock page loads for an authorized user
  - verifies operational stock actions are visible on the page

  Why:
  - stock operations are now a first-class business workflow in your app
  - page availability alone is not enough; the action surface must remain present

  What problem this solves:
  - catches regressions where stock action controls disappear
  - catches regressions where the stock workbench stops rendering after auth succeeds
*/

test.describe('stock operations workbench', () => {
  test('authorized user can open stock page and see stock action controls', async ({
    page,
    request
  }) => {
    await bootstrapAuthenticatedPage(page, request);

    await page.goto('/stock');
    await expect(page).toHaveURL(/\/stock$/);
    await expect(page.getByRole('heading', { name: 'Stock' })).toBeVisible();

    await expect(page.locator('body')).toContainText(/Stock Movements|Quantity|Location|Product/i);
    await expect(page.locator('body')).toContainText(/Consume|Count|Adjust/i);
  });
});
