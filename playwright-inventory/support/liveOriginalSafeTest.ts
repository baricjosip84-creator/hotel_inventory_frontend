import { test as base, expect, type BrowserContext, type Page, type Route } from '@playwright/test';
import { requireDisposableTenantCredentials } from './environment';
export type { Page, Route } from '@playwright/test';

/**
 * Live suite safety adapter, including source-reviewed BULK_SAFE_* batches.
 * Each worker holds its own authenticated cookie/session snapshot.
 * This avoids sharing one rotating refresh-cookie identity across multiple workers.
 * No authentication snapshots are written to disk or uploaded as artifacts.
 * Fresh browser contexts per test still isolate all test-local state.
 */
const FRONTEND_ORIGIN = 'https://hotel-inventory-frontend-mauve.vercel.app';
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const BULK_GROUP_PREFIX = 'BULK_SAFE_';
type AuthState = Awaited<ReturnType<BrowserContext['storageState']>>;
type WorkerSession = { snapshot: AuthState; lastLoginAt: number; renew: () => Promise<void>; absorb: (observed: AuthState) => void };
const liveBulkSessions = new WeakMap<Page, WorkerSession>();
const MAX_SESSION_AGE_MS = 8 * 60 * 1000;

// The application's refresh-cookie and access-token pair can rotate during GETs.
// Copy *only authentication state* back to the worker after a test, not its
// locally mocked permissions, filters, other localStorage or test data.
function transplantAuthentication(baseline: AuthState, observed: AuthState): AuthState | null {
  const token = observed.origins.find(o => o.origin === FRONTEND_ORIGIN)?.localStorage
    .find(x => x.name === 'inventory_access_token')?.value;
  if (!token) return null;
  try { if (tokenExpiresSoon(observed)) return null; } catch { return null; }
  const origins = baseline.origins.map(origin => origin.origin !== FRONTEND_ORIGIN ? origin : {
    ...origin, localStorage: origin.localStorage.map(entry => entry.name === 'inventory_access_token'
      ? { ...entry, value: token } : entry)
  });
  // Only retain cookies belonging to the explicitly approved frontend/backend.
  const trustedCookie = (domain: string) =>
    /(?:^|\.)onrender\.com$/i.test(domain.replace(/^\./, '')) ||
    domain.replace(/^\./, '').toLowerCase() === new URL(FRONTEND_ORIGIN).hostname;
  const cookies = [
    ...baseline.cookies.filter(cookie => !trustedCookie(cookie.domain)),
    ...observed.cookies.filter(cookie => trustedCookie(cookie.domain))
  ];
  return { cookies, origins };
}
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

/** Recover a worker's legitimate authenticated browser session exactly once if
 * the dashboard fails to load. This does not relax the production write guard:
 * fresh credentials are used only by the narrowly allowed /auth/login route.
 * Never serializes tokens or cookies to artifacts or logs. */
export async function restoreBulkTenantSession(page: Page): Promise<void> {
  if (!bulkEnabled()) throw new Error('Bulk session recovery is restricted to reviewed live groups');
  const session = liveBulkSessions.get(page);
  if (!session) throw new Error('No approved worker session is associated with this page');
  await session.renew();
  const state = session.snapshot;
  const token = state.origins.find(x => x.origin === FRONTEND_ORIGIN)?.localStorage
    .find(x => x.name === 'inventory_access_token')?.value;
  if (!token || tokenExpiresSoon(state)) throw new Error('Renewed worker has no usable tenant token');
  await page.context().clearCookies();
  await page.context().addCookies(state.cookies);
  if (new URL(page.url()).origin !== FRONTEND_ORIGIN) await page.goto('/login');
  await page.evaluate(freshToken => {
    localStorage.setItem('inventory_access_token', freshToken);
  }, token);
  await page.goto('/dashboard');
}

/** A proven independent login per worker, reused for all its tests. */
export const test = base.extend<{}, { bulkSession: WorkerSession }>({
  bulkSession: [async ({ browser }, use) => {
    if (!bulkEnabled()) {
      await use({ snapshot: { cookies: [], origins: [] }, renew: async () => {}, absorb: () => {} });
      return;
    }
    if (process.env.PW_BASE_URL !== FRONTEND_ORIGIN) {
      throw new Error('Bulk authentication requires the exact reviewed production origin');
    }
    const { email, password } = requireDisposableTenantCredentials();
    const authenticate = async (): Promise<AuthState> => {
      const context = await browser.newContext({ baseURL: FRONTEND_ORIGIN, serviceWorkers: 'block' });
      try {
        await context.route('**/*', route => {
          const method = route.request().method().toUpperCase();
          return READ_METHODS.has(method) || approvedLogin(method, route.request().url())
            ? route.continue() : route.abort('blockedbyclient');
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
        if (tokenExpiresSoon(state)) throw new Error('Bulk worker authentication returned an expired token');
        return state;
      } finally { await context.close(); }
    };
    const session: WorkerSession = {
      snapshot: await authenticate(),
      lastLoginAt: Date.now(),
      renew: async () => { session.snapshot = await authenticate(); session.lastLoginAt = Date.now(); },
      absorb: (observed) => {
        const fresh = transplantAuthentication(session.snapshot, observed);
        if (fresh) session.snapshot = fresh;
      }
    };
    await use(session);
  }, { scope: 'worker' }],
  storageState: async ({ bulkSession }, use) => {
    // Original suite can outlast a short-lived JWT. Reauthenticate this worker
    // only when its snapshot is about to expire, never per scenario.
    if (!bulkEnabled()) {
      await use(undefined); // preserve the existing legacy/non-live default
      return;
    }
    if (tokenExpiresSoon(bulkSession.snapshot) || Date.now() - bulkSession.lastLoginAt > MAX_SESSION_AGE_MS) {
      await bulkSession.renew();
    }
    await use(bulkSession.snapshot);
  },
  page: async ({ page, bulkSession }, use) => {
    if (process.env.PW_LIVE_ORIGINAL_READONLY !== 'YES') {
      await use(page); // existing disposable/local tests unchanged
      return;
    }
    const unexpectedlyCompletedWrites: string[] = [];
    const mockedWriteRequests = new WeakSet<object>();
    let blockedAtNetworkBoundary = 0;
    page.on('requestfinished', request => {
      const method = request.method().toUpperCase();
      if (!READ_METHODS.has(method) && !approvedLogin(method, request.url()) && !mockedWriteRequests.has(request)) {
        // Synthetic route.fulfill() requests are also marked requestfinished;
        // only completed, UNMOCKED writes would be a production violation.
        unexpectedlyCompletedWrites.push(method);
      }
    });
    // Context-level interception is the final network boundary: page.route()
    // handlers for synthetic POST/PATCH can fulfill locally without writing live.
    // Anything a page mock does NOT handle reaches this guard and is denied.
    await page.context().route('**/*', route => {
      const method = route.request().method().toUpperCase();
      if (READ_METHODS.has(method) || approvedLogin(method, route.request().url()))
        return route.continue();
      // The runtime may issue background POST requests. They MUST be aborted,
      // but an already-blocked request is not proof of a completed write.
      blockedAtNetworkBoundary += 1;
      return route.abort('blockedbyclient');
    });
    // Page-level mocks have priority over context routes. A test may fulfill a
    // synthetic POST locally, but may NEVER continue it onto the live network.
    const registerRoute = page.route.bind(page);
    page.route = (async (url, handler, options) => {
      await registerRoute(url, (route: Route) => {
        const method = route.request().method().toUpperCase();
        if (READ_METHODS.has(method) || approvedLogin(method, route.request().url()))
          return handler(route);
        const guarded = new Proxy(route, {
          get(target, property) {
            if (property === 'continue') return async () => {
              await target.abort('blockedbyclient');
              throw new Error('A live test attempted to continue an unmocked write');
            };
            if (property === 'fulfill') return async (options: Parameters<Route['fulfill']>[0]) => {
              mockedWriteRequests.add(target.request());
              return target.fulfill(options);
            };
            const value = Reflect.get(target, property);
            return typeof value === 'function' ? value.bind(target) : value;
          }
        });
        return handler(guarded);
      }, options);
    }) as typeof page.route;
    if (bulkEnabled()) liveBulkSessions.set(page, bulkSession);
    try { await use(page); }
    finally { liveBulkSessions.delete(page); }
    // Preserve rotated auth tokens/cookies across *isolated* test contexts.
    // This prevents an expired/stale refresh cookie from forcing repeated logins
    // after ~10-15 minutes while never carrying test-local permission overrides.
    if (bulkEnabled()) {
      try { bulkSession.absorb(await page.context().storageState()); }
      catch { /* Closed pages must not turn a valid test into an auth teardown failure. */ }
    }
    // Stronger assertion: no non-auth write reached a completed HTTP response.
    // Blocked attempts are never sent and cannot mutate production records.
    expect(unexpectedlyCompletedWrites, 'An unauthorized live write reached a server response').toEqual([]);
    void blockedAtNetworkBoundary;
  }
});
export { expect };
