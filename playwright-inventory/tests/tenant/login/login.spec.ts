import { test, expect } from '../../../support/liveOriginalSafeTest';
import { fulfillJson, loginAsTenant, selectEnglishUI } from '../../../support/tenantSession';

// Sources: frontend/src/pages/LoginPage.tsx; frontend/src/components/i18n/LanguageSelector.tsx;
// backend/src/routes/auth.js; frontend/src/lib/auth.ts; frontend/src/lib/api.ts.
// All scenarios GENERATED_UNRUN. Never run before separate Phase 2 approval.

test.describe('Tenant login — /login', () => {
  test.beforeEach(async ({ page }) => {
    await selectEnglishUI(page);
  });

  test('TLOG-001 required email prevents submission when password is present', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-password').fill('synthetic-password-not-sent');
    await page.locator('[data-auth-form="true"] button[type="submit"]').click();
    const isMissing = await page.locator('#login-email').evaluate((el) => (el as HTMLInputElement).validity.valueMissing);
    expect(isMissing).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TLOG-002 malformed email is rejected by the browser email constraint', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('not-an-email');
    await page.locator('#login-password').fill('synthetic-password-not-sent');
    await page.locator('[data-auth-form="true"] button[type="submit"]').click();
    const invalid = await page.locator('#login-email').evaluate((el) => (el as HTMLInputElement).validity.typeMismatch);
    expect(invalid).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TLOG-003 missing password is rejected after a valid email', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('sample@example.test');
    await page.locator('[data-auth-form="true"] button[type="submit"]').click();
    const isMissing = await page.locator('#login-password').evaluate((el) => (el as HTMLInputElement).validity.valueMissing);
    expect(isMissing).toBe(true);
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TLOG-004 backend rejection leaves the user on login and shows the server error', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials for test account' } }, 403);
      } else await route.continue();
    });
    await page.goto('/login');
    await page.locator('#login-email').fill('sample@example.test');
    await page.locator('#login-password').fill('synthetic-invalid-password');
    await page.locator('[data-auth-form="true"] button[type="submit"]').click();
    await expect(page.getByRole('alert')).toContainText('Invalid credentials for test account');
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('inventory_access_token'))).toBeNull();
  });

  test('TLOG-005 login request trims email but preserves the submitted password', async ({ page }) => {
    let submitted: { email?: string; password?: string } | undefined;
    await page.route('**/auth/login', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      submitted = route.request().postDataJSON() as { email?: string; password?: string };
      await fulfillJson(route, { error: { message: 'Intentionally rejected test login' } }, 403);
    });
    await page.goto('/login');
    await page.locator('#login-email').fill('  Sample@Example.test  ');
    await page.locator('#login-password').fill('unmodified-password-value');
    await page.locator('[data-auth-form="true"] button[type="submit"]').click();
    await expect(page.getByRole('alert')).toContainText('Intentionally rejected test login');
    expect(submitted).toEqual({ email: 'Sample@Example.test', password: 'unmodified-password-value' });
  });

  test('TLOG-006 HTTP 429 displays rate-limit feedback instead of logging in', async ({ page }) => {
    await page.route('**/auth/login', async (route) => {
      await fulfillJson(route, { error: { code: 'LOGIN_RATE_LIMITED', message: 'Too many login attempts, please try again later' } }, 429);
    });
    await page.goto('/login');
    await page.locator('#login-email').fill('sample@example.test');
    await page.locator('#login-password').fill('synthetic-invalid-password');
    await page.locator('[data-auth-form="true"] button[type="submit"]').click();
    await expect(page.getByRole('alert')).toContainText('Too many login attempts, please try again later');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('TLOG-007 local language selection persists after refreshing login', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('combobox', { name: 'Language' }).selectOption('hr-HR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hr-HR');
    expect(await page.evaluate(() => localStorage.getItem('inventory_locale'))).toBe('hr-HR');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'hr-HR');
    await expect(page.locator('select[aria-label]')).toHaveValue('hr-HR');
  });

  test('TLOG-008 valid disposable credentials open dashboard and keep refresh token out of localStorage', async ({ page }) => {
    await loginAsTenant(page);
    await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);
    expect(await page.evaluate(() => Boolean(localStorage.getItem('inventory_access_token')))).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('inventory_refresh_token'))).toBeNull();
  });

  test('TLOG-009 returning to login with a valid session redirects back to dashboard', async ({ page }) => {
    await loginAsTenant(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);
    await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible();
  });
});

// Batch 2 — three previously inventoried login scenarios. GENERATED_UNRUN.
test.describe('Tenant login — additional boundaries and errors', () => {
  test.beforeEach(async ({ page }) => { await selectEnglishUI(page); });

  test('TLOG-010 transport failure displays a concrete error instead of navigating', async ({ page }) => {
    await page.route('**/auth/login', (route) => route.abort('failed'));
    await page.goto('/login');
    await page.locator('#login-email').fill('synthetic@example.test');
    await page.locator('#login-password').fill('synthetic-password');
    await page.locator('[data-auth-form="true"] button[type="submit"]').click();
    // apiRequest turns fetch errors into ApiError with the browser's network error message.
    await expect(page.getByRole('alert')).toContainText(/Failed to fetch|Network error|fetch failed/i);
    await expect(page).toHaveURL(/\/login(?:[?#]|$)/);
  });

  test('TLOG-011 switching from Croatian back to English updates the login language immediately', async ({ page }) => {
    await page.goto('/login');
    await page.locator('select[aria-label]').selectOption('hr-HR');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hr-HR');
    await page.locator('select[aria-label]').selectOption('en-GB');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await expect(page.locator('select[aria-label]')).toHaveValue('en-GB');
    expect(await page.evaluate(() => localStorage.getItem('inventory_locale'))).toBe('en-GB');
  });

  test('TLOG-012 in-flight login disables submit and prevents multiple requests', async ({ page }) => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    let requestCount = 0;
    await page.route('**/auth/login', async (route) => {
      requestCount += 1;
      await pending;
      await fulfillJson(route, { error: { message: 'Synthetic login denied after pending state' } }, 403);
    });
    await page.goto('/login');
    await page.locator('#login-email').fill('synthetic@example.test');
    await page.locator('#login-password').fill('synthetic-password');
    try {
      await page.locator('[data-auth-form="true"] button[type="submit"]').click();
      await expect(page.locator('[data-auth-form="true"] button[type="submit"]')).toBeDisabled();
      await expect.poll(() => requestCount).toBe(1);
    } finally {
      release();
    }
    await expect(page.getByRole('alert')).toContainText('Synthetic login denied after pending state');
    await expect(page.locator('[data-auth-form="true"] button[type="submit"]')).toBeEnabled();
  });
});
