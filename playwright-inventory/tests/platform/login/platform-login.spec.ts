import { test, expect, type Page } from '@playwright/test';
import { isolatePlatformLogin, syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from '../../../support/platformSession';
import { fulfillJson } from '../../../support/tenantSession';

// Batch 50: public platform login. All login attempts in this file have
// Playwright-intercepted replies and must use an explicitly disposable target.
const form = (page: Page) => page.locator('form[data-auth-form="true"]');
const email = (page: Page) => form(page).locator('input[type="email"]');
const password = (page: Page) => form(page).locator('input[type="password"]');
const submit = (page: Page) => form(page).locator('button[type="submit"]');
async function fill(page: Page, e = 'fixture@example.test', p = 'synthetic-only-pass') {
  await email(page).fill(e); await password(page).fill(p);
}

test.describe('Platform Login — browser validation and synthetic auth (Batch 50)', () => {
  test('PLOG-001 Public login renders platform-specific identity and credential form', async ({ page }) => {
    await isolatePlatformLogin(page);
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(email(page)).toBeVisible(); await expect(password(page)).toBeVisible();
    await expect(submit(page)).toBeEnabled();
  });
  test('PLOG-002 Email is an HTML-required field and blocks empty submission', async ({ page }) => {
    await isolatePlatformLogin(page); await password(page).fill('fixture-only');
    await submit(page).click();
    expect(await email(page).evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await expect(page).toHaveURL(/\/platform\/login$/);
  });
  test('PLOG-003 Invalid email is rejected by input type before platform POST', async ({ page }) => {
    await isolatePlatformLogin(page); await fill(page, 'not-an-email');
    await submit(page).click();
    expect(await email(page).evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
  });
  test('PLOG-004 Password is required and remains masked', async ({ page }) => {
    await isolatePlatformLogin(page); await email(page).fill('fixture@example.test');
    await expect(password(page)).toHaveAttribute('type', 'password');
    await submit(page).click();
    expect(await password(page).evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });
  test('PLOG-005 Submitted credentials are passed without client-side trimming', async ({ page }) => {
    await isolatePlatformLogin(page); let body: any;
    await page.route('**/platform/auth/login', route => { body = route.request().postDataJSON(); return fulfillJson(route, { message: 'Fixture credentials rejected' }, 401); });
    await fill(page, 'fixture@example.test', '  synthetic only  '); await submit(page).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(body).toMatchObject({ email: 'fixture@example.test', password: '  synthetic only  ' });
  });
  test('PLOG-006 Rejected platform credentials display error and retain login route', async ({ page }) => {
    await isolatePlatformLogin(page);
    await page.route('**/platform/auth/login', route => fulfillJson(route, { message: 'Fixture invalid credentials' }, 401));
    await fill(page); await submit(page).click();
    await expect(page.getByRole('alert')).toContainText('Fixture invalid credentials');
    await expect(page).toHaveURL(/\/platform\/login$/);
  });
  test('PLOG-007 Rate limited login presents server feedback instead of navigating', async ({ page }) => {
    await isolatePlatformLogin(page);
    await page.route('**/platform/auth/login', route => fulfillJson(route, { message: 'Fixture too many requests' }, 429));
    await fill(page); await submit(page).click();
    await expect(page.getByRole('alert')).toBeVisible(); await expect(page).toHaveURL(/\/platform\/login$/);
  });
  test('PLOG-008 Backend unavailable login does not authenticate the browser', async ({ page }) => {
    await isolatePlatformLogin(page);
    await page.route('**/platform/auth/login', route => fulfillJson(route, { message: 'Fixture service unavailable' }, 503));
    await fill(page); await submit(page).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('inventory_platform_access_token'))).toBeNull();
  });
  test('PLOG-009 Network failure surfaces an error and keeps credentials editable', async ({ page }) => {
    await isolatePlatformLogin(page);
    await page.route('**/platform/auth/login', route => route.abort('failed'));
    await fill(page); await submit(page).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(password(page)).toHaveValue('synthetic-only-pass');
  });
  test('PLOG-010 Submitting disables the login button until a synthetic response resolves', async ({ page }) => {
    await isolatePlatformLogin(page); let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/platform/auth/login', async route => { await gate; return fulfillJson(route, { message: 'Fixture rejected' }, 401); });
    await fill(page); await submit(page).click();
    await expect(submit(page)).toBeDisabled(); release();
    await expect(submit(page)).toBeEnabled();
  });
  test('PLOG-011 A corrected resubmission clears the previous error while pending', async ({ page }) => {
    await isolatePlatformLogin(page); let count = 0;
    await page.route('**/platform/auth/login', route => { count += 1; return fulfillJson(route, { message: `Fixture reject ${count}` }, 401); });
    await fill(page); await submit(page).click(); await expect(page.getByRole('alert')).toBeVisible();
    await password(page).fill('corrected-synthetic-only'); await submit(page).click();
    await expect(page.getByRole('alert')).toContainText('Fixture reject 2'); expect(count).toBe(2);
  });
  test('PLOG-012 Successful synthetic reply saves access token but never validates server auth', async ({ page }) => {
    await isolatePlatformLogin(page); const token = syntheticJwt();
    await page.route('**/platform/**', route => route.request().isNavigationRequest() ? route.continue() : fulfillJson(route, { message: 'Synthetic post-login page blocked' }, 503));
    await page.route('**/platform/auth/login', route => fulfillJson(route, { accessToken: token, csrfToken: 'synthetic-csrf' }));
    await fill(page); await submit(page).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('inventory_platform_access_token'))).toBe(token);
  });
  test('PLOG-013 Sign-in retains entered email and does not expose password in plain text', async ({ page }) => {
    await isolatePlatformLogin(page); await fill(page, 'platform-fixture@example.test', 'secret-fixture');
    await expect(email(page)).toHaveValue('platform-fixture@example.test');
    await expect(password(page)).toHaveAttribute('type', 'password');
    await expect(page.getByText('secret-fixture')).toHaveCount(0);
  });
  test('PLOG-014 Valid preexisting synthetic session takes recovery path rather than posting login', async ({ page }) => {
    // Isolated auth fixture only; role and token are not real customer identities.
    const token = syntheticJwt(); let posts = 0;
    await page.addInitScript(t => { localStorage.setItem('inventory_platform_access_token', t); localStorage.setItem('inventory_locale', 'en-GB'); }, token);
    await page.route('**/platform/**', route => {
      if (route.request().isNavigationRequest()) return route.continue();
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me')) return fulfillJson(route, { id: SYNTHETIC_PLATFORM_USER_ID, role: 'superadmin' });
      if (path.endsWith('/permissions/me')) return fulfillJson(route, { platform_user_id: SYNTHETIC_PLATFORM_USER_ID, role: 'superadmin', permissions: ['platform.dashboard.read'] });
      if (path.endsWith('/auth/login')) posts++;
      return fulfillJson(route, []);
    });
    await page.goto('/platform/login'); await expect(page).toHaveURL(/\/platform\/dashboard/);
    expect(posts).toBe(0);
  });
  test('PLOG-015 Missing recoverable platform session remains on the login page', async ({ page }) => {
    await isolatePlatformLogin(page);
    await expect(page).toHaveURL(/\/platform\/login$/);
    await expect(submit(page)).toBeEnabled();
  });
});
