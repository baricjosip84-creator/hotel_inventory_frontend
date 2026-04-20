/*
  tests/e2e/app.smoke.spec.ts

  What changed:
  - Updated the smoke test to match the real authentication behavior
  - Verifies unauthenticated access redirects to /login
  - Verifies protected routes also redirect to /login instead of assuming dashboard access

  Why:
  - Your app correctly protects the main application behind authentication
  - The previous smoke test assumed anonymous access to dashboard routes, which is not valid in this project

  What problem this solves:
  - Prevents false test failures caused by expected auth redirects
  - Gives you a production-correct smoke test for route protection
*/

import { test, expect } from '@playwright/test';

test('unauthenticated users are redirected to login from protected routes', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/stock');
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/reports');
  await expect(page).toHaveURL(/\/login$/);

  await page.goto('/shipments');
  await expect(page).toHaveURL(/\/login$/);

  await expect(page.locator('body')).toContainText(/login|sign in/i);
});