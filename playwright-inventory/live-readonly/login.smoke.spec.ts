import { test, expect } from '../support/liveReadOnlyTest';

// Six independently guarded production GET/browser-only smoke checks.
// Mirrors B185 TLOG-001, 002, 003, 007, 011 and PLOG-001.
// They do not authenticate, send a login request, or mutate backend data.
test('LIVE-TLOG-001 tenant login form loads publicly', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('#login-email')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
  await expect(page.locator('[data-auth-form="true"] button[type="submit"]')).toBeVisible();
});

test('LIVE-TLOG-002 required email rejects an empty value', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-password').fill('not-submitted');
  await page.locator('[data-auth-form="true"] button[type="submit"]').click();
  expect(await page.locator('#login-email').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  await expect(page).toHaveURL(/\/login(?:[?#]|$)/);
});

test('LIVE-TLOG-003 malformed email is rejected locally', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-email').fill('bad-email-format');
  await page.locator('#login-password').fill('not-submitted');
  await page.locator('[data-auth-form="true"] button[type="submit"]').click();
  expect(await page.locator('#login-email').evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
  await expect(page).toHaveURL(/\/login(?:[?#]|$)/);
});

test('LIVE-TLOG-004 empty password prevents submission', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#login-email').fill('test@example.test');
  await page.locator('[data-auth-form="true"] button[type="submit"]').click();
  expect(await page.locator('#login-password').evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  await expect(page).toHaveURL(/\/login(?:[?#]|$)/);
});

test('LIVE-TLOG-005 language selection stays in browser storage', async ({ page }) => {
  await page.goto('/login');
  const language = page.locator('select[aria-label]');
  await language.selectOption('hr-HR');
  await expect(page.locator('html')).toHaveAttribute('lang', 'hr-HR');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'hr-HR');
  await language.selectOption('en-GB');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
});

test('LIVE-PLOG-001 platform login renders public form without signing in', async ({ page }) => {
  await page.goto('/platform/login');
  await expect(page.locator('form[data-auth-form="true"] input[type="email"]')).toBeVisible();
  await expect(page.locator('form[data-auth-form="true"] input[type="password"]')).toBeVisible();
});
