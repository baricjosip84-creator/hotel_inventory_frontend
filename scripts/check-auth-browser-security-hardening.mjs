import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const authTypes = read('src/types/auth.ts');
const tenantAuth = read('src/lib/auth.ts');
const platformAuth = read('src/lib/platformAuth.ts');
const tenantApi = read('src/lib/api.ts');
const platformApi = read('src/lib/platformApi.ts');
const tenantGuard = read('src/components/ProtectedRoute.tsx');
const platformGuard = read('src/components/PlatformProtectedRoute.tsx');
const tenantLogin = read('src/pages/LoginPage.tsx');
const platformLogin = read('src/pages/PlatformLoginPage.tsx');
const tenantLayout = read('src/layouts/AppLayout.tsx');
const platformLayout = read('src/layouts/PlatformLayout.tsx');
const vercel = JSON.parse(read('vercel.json'));

assert(!/refreshToken\s*:/.test(authTypes), 'AuthTokens must not expose refreshToken to browser code.');
assert(!/setItem\([^\n]*refresh/i.test(tenantAuth), 'Tenant auth must not write a refresh token to localStorage.');
assert(!/setItem\([^\n]*refresh/i.test(platformAuth), 'Platform auth must not write a refresh token to localStorage.');
assert(tenantAuth.includes("const CSRF_TOKEN_KEY = 'inventory_csrf_token'"), 'Tenant CSRF storage key is missing.');
assert(platformAuth.includes("const PLATFORM_CSRF_TOKEN_KEY = 'inventory_platform_csrf_token'"), 'Platform CSRF storage key is missing.');
assert(tenantApi.includes("credentials: 'include'"), 'Tenant API requests must include cookie credentials.');
assert(platformApi.includes("credentials: 'include'"), 'Platform API requests must include cookie credentials.');
assert(tenantApi.includes("'X-CSRF-Token': token"), 'Tenant refresh must send X-CSRF-Token.');
assert(platformApi.includes("'X-CSRF-Token': token"), 'Platform refresh must send X-CSRF-Token.');
assert(/locks\.request\(\s*['"]inventory-tenant-refresh['"]/.test(tenantApi), 'Tenant refresh must be coordinated across tabs when Web Locks are available.');
assert(/locks\.request\(\s*['"]inventory-platform-refresh['"]/.test(platformApi), 'Platform refresh must be coordinated across tabs when Web Locks are available.');
assert(tenantApi.includes('currentAccessToken !== expectedAccessToken'), 'Tenant refresh must bypass stale-token short-circuiting after a protected request returns 401.');
assert(platformApi.includes('currentAccessToken !== expectedAccessToken'), 'Platform refresh must bypass stale-token short-circuiting after a protected request returns 401.');
assert(tenantApi.includes('recoverFromUnauthorized(path, accessTokenUsed)'), 'Tenant 401 recovery must compare the token used by the failed request.');
assert(platformApi.includes('recoverPlatformFromUnauthorized(accessTokenUsed)'), 'Platform 401 recovery must compare the token used by the failed request.');
assert(tenantGuard.includes('restoreTenantSession'), 'Tenant route guard must recover cookie-backed sessions.');
assert(platformGuard.includes('restorePlatformSession'), 'Platform route guard must recover cookie-backed sessions.');
assert(tenantLogin.includes('restoreTenantSession'), 'Tenant login page must recover an existing cookie-backed session.');
assert(platformLogin.includes('restorePlatformSession'), 'Platform login page must recover an existing cookie-backed session.');
assert(tenantLayout.includes('skipSessionRecovery: true'), 'Tenant explicit logout must not immediately recover the just-ended session.');
assert(platformLayout.includes('skipSessionRecovery: true'), 'Platform explicit logout must not immediately recover the just-ended session.');
assert(!fs.existsSync('src/lib/api.js'), 'Stale generated src/lib/api.js must not shadow src/lib/api.ts.');

const globalHeaders = vercel.headers?.find((entry) => entry.source === '/(.*)')?.headers || [];
const headerMap = new Map(globalHeaders.map(({ key, value }) => [String(key).toLowerCase(), String(value)]));
for (const required of [
  'content-security-policy',
  'strict-transport-security',
  'referrer-policy',
  'permissions-policy',
  'x-content-type-options',
  'x-frame-options',
  'cross-origin-opener-policy'
]) {
  assert(headerMap.has(required), `Vercel global security header is missing: ${required}`);
}
assert(headerMap.get('content-security-policy')?.includes("frame-ancestors 'none'"), 'CSP must block framing.');
assert(headerMap.get('content-security-policy')?.includes("object-src 'none'"), 'CSP must block plugins/objects.');

console.log('check:auth-browser-security-hardening passed');
