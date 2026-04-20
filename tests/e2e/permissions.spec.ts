import { test, expect } from '@playwright/test';
import { bootstrapAuthenticatedPage, hasRoleCredentials } from './helpers/session';

/*
  tests/e2e/permissions.spec.ts

  What changed:
  - adds role-aware browser coverage for reports and management capabilities
  - uses separate manager and staff credentials when available

  Why:
  - your frontend now contains explicit role-aware routing and action visibility
  - those differences should be verified with real authenticated users

  What problem this solves:
  - catches regressions where restricted roles gain management visibility
  - catches regressions where authorized roles lose access to manager pages
*/

test.describe('role-aware permissions', () => {
  test('manager credentials can access reports', async ({ page, request }) => {
    test.skip(
      !hasRoleCredentials('manager'),
      'Set E2E_MANAGER_EMAIL and E2E_MANAGER_PASSWORD to run manager permission checks.'
    );

    await bootstrapAuthenticatedPage(page, request, 'manager');

    await page.goto('/reports');
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  });

  test('staff credentials are blocked from manager-only reports surface when configured that way', async ({
    page,
    request
  }) => {
    test.skip(
      !hasRoleCredentials('staff'),
      'Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD to run staff permission checks.'
    );

    await bootstrapAuthenticatedPage(page, request, 'staff');

    await page.goto('/reports');

    const currentUrl = page.url();

    if (currentUrl.endsWith('/reports')) {
      await expect(page.locator('body')).not.toContainText(/Inventory Valuation|Procurement Summary/i);
    } else {
      await expect(page).not.toHaveURL(/\/reports$/);
      await expect(page.locator('body')).toContainText(/unauthorized|forbidden|not allowed|dashboard/i);
    }
  });
});
