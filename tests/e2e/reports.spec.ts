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

  test('reports page exposes CSV export controls and accessible tab navigation', async ({
    page,
    request
  }) => {
    await bootstrapAuthenticatedPage(page, request);

    await page.goto('/reports');

    const reportsTabList = page.getByRole('tablist', { name: 'Reports' });
    await expect(reportsTabList).toBeVisible();
    await expect(reportsTabList).toHaveAttribute('aria-orientation', 'horizontal');

    await expect(page.getByRole('tab', { name: 'Inventory Valuation' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: 'Stock by Location' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Stock by Location' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export stock by location report as CSV.' })).toBeVisible();

    const categoryFilter = page.getByLabel('Category Filter');
    await expect(categoryFilter).toHaveAttribute('maxlength', '120');
    await expect(page.getByText('Optional. Maximum 120 characters.')).toBeVisible();

    await page.getByRole('tab', { name: 'Product Movements' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Product Movements' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export product movements report as CSV.' })).toBeVisible();
    await expect(page.getByLabel('Result Limit')).toContainText('500');
    await expect(page.getByText('Maximum 500 movement rows per report.')).toBeVisible();
  });

});
