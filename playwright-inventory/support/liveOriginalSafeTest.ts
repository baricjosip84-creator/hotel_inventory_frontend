import { test as base, expect, type BrowserContext } from '@playwright/test';
import { requireDisposableTenantCredentials } from './environment';
export type { Page, Route } from '@playwright/test';

/**
 * Live suite safety adapter, including source-reviewed BULK_SAFE_* batches.
 * Keep one real tenant login per worker, not one login per test; no auth
 * snapshots are written to disk or uploaded as GitHub artifacts.
 * Fresh Playwright contexts per test still isolate all test-local state.
 */
const FRONTEND_ORIGIN = 'https://hotel-inventory-frontend-mauve.vercel.app';
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const BULK_GROUP_PREFIX = 'BULK_SAFE_';
type AuthState = Awaited<ReturnType<BrowserContext['storageState']>>;
type WorkerSession = { snapshot: AuthState; renew: () => Promise<void> };
function tokenExpiresSoon(state: AuthState): boolean {
  const token = state.origins.find(x => x.origin === FRONTEND_ORIGIN)?.localStorage
    .find(x => x.name === 'inventory_access_token')?.value;
  if (!token || token.split('.').length !== 3) {
    throw new Error('Bulk worker has no valid tenant access token');
  }
  let expiry: number;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp?: unknown };
    expiry = typeof payload.exp === 'number' ? payload.exp : NaN;
  } catch {
    throw new Error('Bulk worker tenant token is not a valid JWT');
  }
  if (!Number.isFinite(expiry)) throw new Error('Bulk worker tenant token has no expiry');
  return expiry <= Date.now() / 1000 + 30;
}
const bulkEnabled = () => process.env.PW_LIVE_ORIGINAL_READONLY === 'YES'
  && (process.env.PW_ORIGINAL_SUITE_GROUP ?? '').startsWith(BULK_GROUP_PREFIX);

function approvedLogin(method: string, rawUrl: string): boolean {
  if (method !== 'POST') return false;
  try {
    const url = new URL(rawUrl);
    const trustedFrontend = url.origin === FRONTEND_ORIGIN;
    const trustedRender = url.protocol === 'https:' && /(?:^|\.)onrender\.com$/i.test(url.hostname);
    return (trustedFrontend || trustedRender) && /^\/(?:api\/)?auth\/(?:login|refresh)$/.test(url.pathname);
  } catch { return false; }
}

/** Worker-scoped auth isolates refresh cookies between workers. */
export const test = base.extend<{}, { bulkSession: WorkerSession }>({
  bulkSession: [async ({ browser }, use) => {
    if (!bulkEnabled()) {
      await use({ snapshot: { cookies: [], origins: [] }, renew: async () => {} });
      return;
    }
    if (process.env.PW_BASE_URL !== FRONTEND_ORIGIN) {
      throw new Error('Bulk authentication requires the exact reviewed production origin');
    }
    const { email, password } = requireDisposableTenantCredentials();
    const authenticate = async (): Promise<AuthState> => {
      const context = await browser.newContext({ baseURL: FRONTEND_ORIGIN, serviceWorkers: 'block' });
      try {
        // Protect the bootstrap and rare token renewal: authentication POST
        // only, with all other non-read methods denied.
        await context.route('**/*', route => {
          const method = route.request().method().toUpperCase();
          return READ_METHODS.has(method) || approvedLogin(method, route.request().url())
            ? route.continue()
            : route.abort('blockedbyclient');
        });
        const page = await context.newPage();
        await page.addInitScript(() => {
          if (localStorage.getItem('inventory_locale') === null) {
            localStorage.setItem('inventory_locale', 'en-GB');
          }
        });
        await page.goto('/login');
        await page.locator('#login-email').fill(email);
        await page.locator('#login-password').fill(password);
        await page.locator('[data-auth-form="true"] button[type="submit"]').click();
        await expect(page.getByRole('heading', { name: 'Operations Dashboard' })).toBeVisible({ timeout: 25_000 });
        const state = await context.storageState();
        // Fail closed if the login did not result in an unexpired JWT.
        if (tokenExpiresSoon(state)) {
          throw new Error('Bulk worker authentication did not produce a fresh token');
        }
        return state;
      } finally {
        await context.close();
      }
    };
    const session: WorkerSession = { snapshot: await authenticate(), renew: async () => {
      session.snapshot = await authenticate(); // at most once near token expiry
    }};
    await use(session); // in memory only; scoped to this worker
  }, { scope: 'worker' }],
  storageState: async ({ bulkSession }, use) => {
    // Original suite can outlast a short-lived JWT. Reauthenticate this worker
    // only when its snapshot is about to expire, never per scenario.
    if (!bulkEnabled()) {
      await use(undefined); // preserve the existing legacy/non-live default
      return;
    }
    if (tokenExpiresSoon(bulkSession.snapshot)) await bulkSession.renew();
    await use(bulkSession.snapshot);
  },
  page: async ({ page }, use) => {
    if (process.env.PW_LIVE_ORIGINAL_READONLY !== 'YES') {
      await use(page); // disposable/local tests retain the original behavior
      return;
    }
    const unexpectedCompletedWrites: string[] = [];
    page.on('requestfinished', request => {
      const method = request.method().toUpperCase();
      if (!READ_METHODS.has(method) && !approvedLogin(method, request.url())) {
        // Never include request URL, body, cookies or credentials in logs.
        unexpectedCompletedWrites.push(method);
      }
    });
    await page.route('**/*', route => {
      const method = route.request().method().toUpperCase();
      return READ_METHODS.has(method) || approvedLogin(method, route.request().url())
        ? route.continue()
        : route.abort('blockedbyclient');
    });
    await use(page);
    expect(unexpectedCompletedWrites, 'Unexpected completed non-auth write during a live original test').toEqual([]);
  }
});
export { expect };
