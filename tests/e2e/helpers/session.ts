import { expect, type APIRequestContext, type Page } from '@playwright/test';

/*
  tests/e2e/helpers/session.ts

  What changed:
  - restores all exports used by the existing Playwright suite
  - adds token caching per role to reduce repeated login requests
  - keeps compatibility with UI-login tests and role-aware permission tests

  Why:
  - your existing tests still import:
      loginThroughUi
      hasRoleCredentials
      bootstrapAuthenticatedPage
  - the previous replacement removed some of those exports
  - repeated API login calls were triggering backend rate limiting

  What problem this solves:
  - fixes missing export errors
  - reduces /api/auth/login volume during E2E runs
  - keeps the full current suite compatible
*/

type Role = 'default' | 'manager' | 'staff';

type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
};

type Credentials = {
  email: string;
  password: string;
};

const ACCESS_TOKEN_KEY = 'inventory_access_token';
const REFRESH_TOKEN_KEY = 'inventory_refresh_token';

/*
  In-memory token cache for the duration of the Playwright run.
  This prevents repeated login requests from tripping backend rate limits.
*/
const tokenCache: Partial<Record<Role, AuthTokens>> = {};

/*
  Role-based credentials can be provided through env vars.
  Default role is required.
  Manager/staff are optional and only used by permission tests when present.
*/
function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value.trim();
}

export function hasRoleCredentials(role: Exclude<Role, 'default'>): boolean {
  const prefix = role.toUpperCase();

  return Boolean(
    process.env[`E2E_${prefix}_EMAIL`]?.trim() &&
      process.env[`E2E_${prefix}_PASSWORD`]?.trim()
  );
}

function getCredentials(role: Role = 'default'): Credentials {
  if (role === 'default') {
    return {
      email: getRequiredEnv('E2E_EMAIL'),
      password: getRequiredEnv('E2E_PASSWORD')
    };
  }

  const prefix = role.toUpperCase();

  return {
    email: getRequiredEnv(`E2E_${prefix}_EMAIL`),
    password: getRequiredEnv(`E2E_${prefix}_PASSWORD`)
  };
}

async function writeTokensToStorage(page: Page, tokens: AuthTokens): Promise<void> {
  await page.goto('/login');

  await page.evaluate(
    ({ accessToken, refreshToken, accessKey, refreshKey }) => {
      window.localStorage.setItem(accessKey, accessToken);

      if (refreshToken) {
        window.localStorage.setItem(refreshKey, refreshToken);
      }
    },
    {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? '',
      accessKey: ACCESS_TOKEN_KEY,
      refreshKey: REFRESH_TOKEN_KEY
    }
  );
}

async function loginThroughApi(
  request: APIRequestContext,
  role: Role = 'default'
): Promise<AuthTokens> {
  const cached = tokenCache[role];
  if (cached?.accessToken) {
    return cached;
  }

  const { email, password } = getCredentials(role);

  const response = await request.post('/api/auth/login', {
    data: { email, password }
  });

  expect(
    response.ok(),
    `Expected successful login for role "${role}" but received ${response.status()}`
  ).toBeTruthy();

  const payload = (await response.json()) as Partial<AuthTokens>;

  if (!payload.accessToken) {
    throw new Error('Invalid login response: missing accessToken');
  }

  const tokens: AuthTokens = {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken
  };

  tokenCache[role] = tokens;

  return tokens;
}

export async function bootstrapAuthenticatedPage(
  page: Page,
  request: APIRequestContext,
  role: Role = 'default'
): Promise<AuthTokens> {
  const tokens = await loginThroughApi(request, role);
  await writeTokensToStorage(page, tokens);
  return tokens;
}

export async function loginThroughUi(page: Page, role: Role = 'default'): Promise<void> {
  const { email, password } = getCredentials(role);

  await page.goto('/login');

  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /login/i }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function clearSession(page: Page): Promise<void> {
  await page.goto('/login');

  await page.evaluate(
    ({ accessKey, refreshKey }) => {
      window.localStorage.removeItem(accessKey);
      window.localStorage.removeItem(refreshKey);
    },
    {
      accessKey: ACCESS_TOKEN_KEY,
      refreshKey: REFRESH_TOKEN_KEY
    }
  );
}