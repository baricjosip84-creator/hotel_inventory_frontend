import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformApiKeysPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformApiKeysPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform operations',
  'Credential truth boundary', 'permission scoped', 'PAGE_SIZE = 50',
  "searchParams.get('tenant_id')", "searchParams.get('search')", "searchParams.get('include_revoked')", 'uuidPattern',
  'PLATFORM_API_KEYS_WRITE', 'TENANTS_READ', 'PLATFORM_USERS_READ', 'PLATFORM_WEBHOOKS_READ', 'PLATFORM_DEPENDENCIES_READ',
  'Showing the last successful API Keys snapshot.', 'Invalid or unauthorized URL filter',
  'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next', 'pagination.has_more',
  'Public API: ', 'inv_live_<prefix>_<secret>', '/api/public/v1', 'Legacy format', 'IP allowlist',
  'Tenant evidence', 'Operator identity', 'Redacted', 'Scope migration required',
  'Create public API key', 'Save key settings', 'Rotate secret', 'Revoke key', 'Copy one-time secret now',
  'Expired keys cannot be rotated.', 'toIsoOrNull', 'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform API Keys check failed: missing page anchor: ${anchor}`);
}
for (const stale of ['style={styles.', 'const styles:', "params.set('limit', '200')", "['tenant.read']", '<a style=']) {
  if (page.includes(stale)) throw new Error(`Platform API Keys check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformApiKeysPage.css';")) throw new Error('Platform API Keys check failed: page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform API Keys check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:760px)')) throw new Error('Platform API Keys check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'api-keys'");
if (routeIndex < 0) throw new Error('Platform API Keys check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ]}')) throw new Error('Platform API Keys check failed: route must preserve PLATFORM_API_KEYS_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/api-keys"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 250);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ)')) throw new Error('Platform API Keys check failed: navigation must remain PLATFORM_API_KEYS_READ guarded.');

if (!packageJson.includes('check:platform-api-keys-page-hardening')) throw new Error('Platform API Keys check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-api-keys-page-hardening')) throw new Error('Platform API Keys check failed: checker is not wired into check:ci.');

console.log('Platform API Keys page hardening checks passed.');
