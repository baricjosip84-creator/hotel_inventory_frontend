import { test, expect } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers/session';

/*
  tests/e2e/reports.spec.ts

  What changed:
  - adds authenticated reports and forecast surface coverage
  - verifies the reports page loads and key report sections render

  Why:
  - reports are management-facing value in your current product
  - this page must remain reachable and visibly populated after auth

  What problem this solves:
  - catches regressions in reports routing
  - catches regressions where report section labels disappear from the UI
*/

test.describe('reports and forecast surface', () => {
  test('authorized user can open reports and see core report sections', async ({
    page,
    request
  }) => {
    await bootstrapAuthenticatedPage(page, request);

    await page.goto('/reports');
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();

    await expect(page.locator('body')).toContainText(
      /Inventory Valuation|Stock by Location|Product Movements|Procurement Summary|Forecast/i
    );
  });
});
