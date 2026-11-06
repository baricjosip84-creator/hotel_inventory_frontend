/**
 * Test-environment safety. These tests are intended for a disposable isolated
 * frontend/API + test tenant. Config values are supplied at execution time.
 * No real secrets or production endpoints are embedded in this project.
 */
export function targetBaseURL(): string {
  const value = process.env.PW_BASE_URL || 'http://127.0.0.1:5173';
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('PW_BASE_URL requires HTTP(S)');
  const host = parsed.hostname.toLowerCase();
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(host);
  // For non-local test environments require the *exact* approved disposable origin.
  // Production is never an authorized target, regardless of matching flags.
  const productionPattern = /(?:^|\.)(?:vercel\.app|onrender\.com|netlify\.app|herokuapp\.com)$/;
  if (productionPattern.test(host)) {
    throw new Error('Refusing a public hosting domain: supply an isolated disposable environment');
  }
  if (!loopback && (process.env.PW_DISPOSABLE_ORIGIN || '') !== parsed.origin) {
    throw new Error('Non-local URL requires exact PW_DISPOSABLE_ORIGIN approval');
  }
  return parsed.origin;
}

export function requireDisposableTenantCredentials(): { email: string; password: string } {
  // This gate is intentionally stricter for any tests that authenticate and
  // can reach real tenant data. A live/prod tenant must never be used.
  if (process.env.PW_TEST_ENVIRONMENT !== 'disposable') {
    throw new Error('PW_TEST_ENVIRONMENT=disposable is required for authenticated tests');
  }
  const email = process.env.PW_TENANT_EMAIL;
  const password = process.env.PW_TENANT_PASSWORD;
  if (!email || !password) {
    throw new Error('Set PW_TENANT_EMAIL/PW_TENANT_PASSWORD for an isolated disposable test tenant');
  }
  return { email, password };
}
