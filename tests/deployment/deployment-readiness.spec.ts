import {
  expect,
  request as createApiRequest,
  test,
  type APIRequestContext,
  type APIResponse,
  type Page
} from '@playwright/test';

type SessionPayload = {
  accessToken?: string;
  csrfToken?: string;
  refreshToken?: string;
};

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

function requiredValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required deployment-readiness setting: ${name}`);
  return value;
}

function booleanSetting(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (['true', '1', 'yes', 'on'].includes(value)) return true;
  if (['false', '0', 'no', 'off'].includes(value)) return false;
  throw new Error(`${name} must be true or false`);
}


function optionalCommit(name: 'EXPECTED_FRONTEND_COMMIT' | 'EXPECTED_BACKEND_COMMIT'): string {
  const value = process.env[name]?.trim().toLowerCase() || '';
  if (value && !/^[0-9a-f]{40}$/.test(value)) {
    throw new Error(`${name} must be a full 40-character Git commit SHA when provided.`);
  }
  return value;
}

function deploymentUrl(name: 'DEPLOYMENT_FRONTEND_URL' | 'DEPLOYMENT_BACKEND_URL'): string {
  const raw = requiredValue(name);
  const parsed = new URL(raw);
  const allowHttp = booleanSetting('ALLOW_HTTP_DEPLOYMENT_SMOKE', false);

  if (parsed.protocol !== 'https:' && !(allowHttp && parsed.protocol === 'http:')) {
    throw new Error(`${name} must use HTTPS. Set ALLOW_HTTP_DEPLOYMENT_SMOKE=true only for a reviewed local/staging exception.`);
  }

  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    throw new Error(`${name} must be an origin without a path such as /api.`);
  }

  parsed.pathname = trimTrailingSlash(parsed.pathname);
  parsed.search = '';
  parsed.hash = '';
  return trimTrailingSlash(parsed.toString());
}

async function readJson<T>(response: APIResponse, label: string): Promise<T> {
  expect(response.status(), `${label} returned HTTP ${response.status()}`).toBeGreaterThanOrEqual(200);
  expect(response.status(), `${label} returned HTTP ${response.status()}`).toBeLessThan(300);
  return (await response.json()) as T;
}

function expectSecurityHeaders(response: APIResponse, label: string): void {
  const headers = response.headers();
  expect(headers['x-content-type-options'], `${label} must disable MIME sniffing`).toBe('nosniff');
  expect(headers['x-frame-options'], `${label} must deny framing`).toBe('DENY');
  expect(headers['referrer-policy'], `${label} must define a referrer policy`).toBeTruthy();
  expect(headers['content-security-policy'], `${label} must define a CSP`).toBeTruthy();
  expect(headers['strict-transport-security'], `${label} must enable HSTS`).toBeTruthy();
}

async function loginTenant(api: APIRequestContext, requireSecureCookie: boolean): Promise<SessionPayload> {
  const response = await api.post('/api/auth/login', {
    data: {
      email: requiredValue('E2E_EMAIL'),
      password: requiredValue('E2E_PASSWORD')
    }
  });

  expect(response.status(), 'Tenant smoke-account login must succeed').toBe(200);
  const setCookie = response.headers()['set-cookie'] || '';
  expect(setCookie).toContain('inventory_refresh_token=');
  expect(setCookie.toLowerCase()).toContain('httponly');
  if (requireSecureCookie) expect(setCookie.toLowerCase()).toContain('secure');

  const payload = (await response.json()) as SessionPayload;
  expect(payload.accessToken, 'Tenant login response must include an access token').toBeTruthy();
  expect(payload.csrfToken, 'Tenant login response must include a refresh-CSRF token').toBeTruthy();
  expect(payload.refreshToken, 'Refresh token must never be exposed in JSON').toBeUndefined();
  return payload;
}

async function logoutTenant(api: APIRequestContext, csrfToken: string): Promise<void> {
  const response = await api.post('/api/auth/logout', {
    headers: { 'X-CSRF-Token': csrfToken }
  });
  expect(response.status(), 'Tenant smoke session must log out cleanly').toBe(200);
}

async function assertPageHasNoRuntimeFailure(page: Page, path: string, heading: RegExp): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Failed to fetch|Unhandled Runtime Error|Something went wrong/i);

  const overflowsHorizontally = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
  );
  expect(overflowsHorizontally, `${path} must not overflow horizontally at the deployment-gate viewport`).toBe(false);
}

test.describe('deployed service readiness', () => {
  test('frontend shell, backend probes, CORS and unauthenticated protection are ready', async () => {
    const frontendUrl = deploymentUrl('DEPLOYMENT_FRONTEND_URL');
    const backendUrl = deploymentUrl('DEPLOYMENT_BACKEND_URL');
    const frontendOrigin = new URL(frontendUrl).origin;
    const api = await createApiRequest.newContext();

    try {
      const frontendResponse = await api.get(frontendUrl);
      expect(frontendResponse.status()).toBe(200);
      expect(frontendResponse.headers()['content-type']).toContain('text/html');
      expect(await frontendResponse.text()).toContain('id="root"');
      expectSecurityHeaders(frontendResponse, 'Frontend');

      const frontendVersionResponse = await api.get(`${frontendUrl}/deployment-version.json`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const frontendVersion = await readJson<{
        service?: string;
        git_commit?: string | null;
        sentry_source_maps?: boolean;
        sentry_release?: string | null;
      }>(frontendVersionResponse, 'Frontend deployment version');
      expect(frontendVersion.service).toBe('hotel-inventory-frontend');
      const expectedFrontendCommit = optionalCommit('EXPECTED_FRONTEND_COMMIT');
      if (expectedFrontendCommit) {
        expect(frontendVersion.git_commit?.toLowerCase(), 'Frontend production deployment must match the triggering commit').toBe(expectedFrontendCommit);
      }

      if (booleanSetting('DEPLOYMENT_REQUIRE_SENTRY_SOURCE_MAPS', false)) {
        expect(frontendVersion.sentry_source_maps, 'Production frontend must confirm Sentry source maps were uploaded').toBe(true);
        expect(frontendVersion.sentry_release, 'Production frontend must expose the non-secret Sentry release identifier').toBeTruthy();
        if (expectedFrontendCommit) {
          expect(frontendVersion.sentry_release?.toLowerCase(), 'Sentry release must match the deployed frontend commit').toBe(expectedFrontendCommit);
        }
      }

      const livenessResponse = await api.get(`${backendUrl}/health/live`);
      const liveness = await readJson<{
        status?: string;
        probe?: string;
        checks?: { process?: string };
      }>(livenessResponse, 'Backend liveness probe');
      expect(liveness).toMatchObject({ status: 'ok', probe: 'liveness', checks: { process: 'ok' } });
      expectSecurityHeaders(livenessResponse, 'Backend');

      const readinessResponse = await api.get(`${backendUrl}/health/ready`);
      const readiness = await readJson<{
        status?: string;
        probe?: string;
        checks?: { process?: string; database?: string };
        deployment?: { git_commit?: string | null };
      }>(readinessResponse, 'Backend readiness probe');
      expect(readiness).toMatchObject({
        status: 'ready',
        probe: 'readiness',
        checks: { process: 'ok', database: 'ok' }
      });
      const expectedBackendCommit = optionalCommit('EXPECTED_BACKEND_COMMIT');
      if (expectedBackendCommit) {
        expect(readiness.deployment?.git_commit?.toLowerCase(), 'Backend production deployment must match the triggering commit').toBe(expectedBackendCommit);
      }

      const corsResponse = await api.fetch(`${backendUrl}/api/auth/login`, {
        method: 'OPTIONS',
        headers: {
          Origin: frontendOrigin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type,x-csrf-token'
        }
      });
      expect(corsResponse.status(), 'Production frontend origin must pass the API CORS preflight').toBe(204);
      expect(corsResponse.headers()['access-control-allow-origin']).toBe(frontendOrigin);
      expect(corsResponse.headers()['access-control-allow-credentials']).toBe('true');

      const protectedResponse = await api.get(`${backendUrl}/api/auth/sessions`, {
        headers: { Origin: frontendOrigin }
      });
      expect([401, 403], 'Unauthenticated session access must be rejected').toContain(protectedResponse.status());
    } finally {
      await api.dispose();
    }
  });

  test('tenant authentication, read-only critical APIs, refresh and logout pass', async () => {
    const frontendUrl = deploymentUrl('DEPLOYMENT_FRONTEND_URL');
    const backendUrl = deploymentUrl('DEPLOYMENT_BACKEND_URL');
    const api = await createApiRequest.newContext({
      baseURL: backendUrl,
      extraHTTPHeaders: { Origin: new URL(frontendUrl).origin }
    });

    let csrfToken = '';
    try {
      const session = await loginTenant(api, new URL(backendUrl).protocol === 'https:');
      csrfToken = session.csrfToken || '';
      const authorization = { Authorization: `Bearer ${session.accessToken}` };

      const sessions = await api.get('/api/auth/sessions', { headers: authorization });
      expect(sessions.status(), 'Authenticated session listing must succeed').toBe(200);

      const dashboard = await api.get('/api/dashboard/summary', { headers: authorization });
      expect(dashboard.status(), 'Tenant dashboard summary must succeed').toBe(200);

      if (booleanSetting('DEPLOYMENT_REQUIRE_DECISION_INTELLIGENCE', true)) {
        const decision = await api.get('/api/decision-intelligence/probabilistic-forecasting-summary', {
          headers: authorization
        });
        expect(decision.status(), 'Decision Intelligence summary must succeed for the smoke tenant').toBe(200);
      }

      const refresh = await api.post('/api/auth/refresh', {
        headers: { 'X-CSRF-Token': csrfToken }
      });
      expect(refresh.status(), 'Refresh-cookie and CSRF lifecycle must succeed').toBe(200);
      const refreshed = (await refresh.json()) as SessionPayload;
      expect(refreshed.accessToken).toBeTruthy();
      expect(refreshed.csrfToken).toBeTruthy();
      expect(refreshed.refreshToken).toBeUndefined();
      csrfToken = refreshed.csrfToken || csrfToken;

      await logoutTenant(api, csrfToken);

      const refreshAfterLogout = await api.post('/api/auth/refresh', {
        headers: { 'X-CSRF-Token': csrfToken }
      });
      expect([401, 403], 'A logged-out refresh session must no longer be usable').toContain(refreshAfterLogout.status());
      csrfToken = '';
    } finally {
      if (csrfToken) {
        await logoutTenant(api, csrfToken).catch(() => undefined);
      }
      await api.dispose();
    }
  });

  test('browser login and critical tenant pages render without runtime or layout failure', async ({ page }) => {
    const backendUrl = deploymentUrl('DEPLOYMENT_BACKEND_URL');
    const serverFailures: string[] = [];
    const pageErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      const responseUrl = new URL(response.url());
      const isBackendResponse = response.url().startsWith(backendUrl) || responseUrl.pathname.startsWith('/api/');
      if (isBackendResponse && response.status() >= 500) {
        serverFailures.push(`${response.status()} ${responseUrl.pathname}`);
      }
    });

    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel(/^Email$/i).fill(requiredValue('E2E_EMAIL'));
    await page.getByLabel(/^Password$/i).fill(requiredValue('E2E_PASSWORD'));
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await assertPageHasNoRuntimeFailure(page, '/dashboard', /^Dashboard$/i);

    if (booleanSetting('DEPLOYMENT_REQUIRE_DECISION_INTELLIGENCE', true)) {
      await assertPageHasNoRuntimeFailure(page, '/decision-learning-feedback', /^Learning Feedback$/i);
      await assertPageHasNoRuntimeFailure(page, '/probabilistic-forecasting', /^Probabilistic Forecasting$/i);
      await assertPageHasNoRuntimeFailure(page, '/cross-domain-optimization', /^Cross-Domain Optimization$/i);
    }

    expect(serverFailures, 'Critical pages must not receive backend 5xx responses').toEqual([]);
    expect(pageErrors, 'Critical pages must not emit browser runtime errors').toEqual([]);

    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('platform authentication and deployment-validation API pass when required', async () => {
    const requirePlatform = booleanSetting('DEPLOYMENT_REQUIRE_PLATFORM_AUTH', false);
    const email = process.env.E2E_PLATFORM_EMAIL?.trim();
    const password = process.env.E2E_PLATFORM_PASSWORD?.trim();

    test.skip(!requirePlatform && !(email && password), 'Platform smoke credentials are optional unless DEPLOYMENT_REQUIRE_PLATFORM_AUTH=true.');

    if (!email || !password) {
      throw new Error('E2E_PLATFORM_EMAIL and E2E_PLATFORM_PASSWORD are required when platform auth smoke testing is enabled.');
    }

    const frontendUrl = deploymentUrl('DEPLOYMENT_FRONTEND_URL');
    const backendUrl = deploymentUrl('DEPLOYMENT_BACKEND_URL');
    const api = await createApiRequest.newContext({
      baseURL: backendUrl,
      extraHTTPHeaders: { Origin: new URL(frontendUrl).origin }
    });

    let csrfToken = '';
    try {
      const mfaCode = process.env.E2E_PLATFORM_MFA_CODE?.trim();
      const login = await api.post('/api/platform/auth/login', {
        data: { email, password, ...(mfaCode ? { mfaCode } : {}) }
      });
      expect(login.status(), 'Platform smoke-account login must succeed').toBe(200);
      const payload = (await login.json()) as SessionPayload;
      expect(payload.accessToken).toBeTruthy();
      expect(payload.csrfToken).toBeTruthy();
      expect(payload.refreshToken).toBeUndefined();
      csrfToken = payload.csrfToken || '';

      const authorization = { Authorization: `Bearer ${payload.accessToken}` };
      const me = await api.get('/api/platform/auth/me', { headers: authorization });
      expect(me.status(), 'Platform auth identity endpoint must succeed').toBe(200);

      const gate = await api.get('/api/platform/deployment-validation', { headers: authorization });
      expect(gate.status(), 'Platform deployment-validation surface must succeed').toBe(200);

      const logout = await api.post('/api/platform/auth/logout', {
        headers: { 'X-CSRF-Token': csrfToken }
      });
      expect(logout.status(), 'Platform smoke session must log out cleanly').toBe(200);
      csrfToken = '';
    } finally {
      if (csrfToken) {
        await api.post('/api/platform/auth/logout', {
          headers: { 'X-CSRF-Token': csrfToken }
        }).catch(() => undefined);
      }
      await api.dispose();
    }
  });
});
