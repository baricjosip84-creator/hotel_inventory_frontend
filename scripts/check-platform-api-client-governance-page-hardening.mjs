import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformApiClientGovernancePage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformApiClientGovernancePage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform operations',
  'Evidence and truth boundary', 'What this board does not prove', 'Read-only governance board',
  'PAGE_SIZE = 50', "searchParams.get('tenant_id')", "searchParams.get('search')", "searchParams.get('include_revoked')", 'uuidPattern',
  'TENANTS_READ', 'PLATFORM_USERS_READ', 'AUDIT_READ', 'PLATFORM_ACCESS_REVIEWS_READ', 'PLATFORM_DEPENDENCIES_READ',
  'Showing the last successful API client governance snapshot.', 'Invalid or unauthorized URL filter',
  'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next', 'pagination.has_more',
  'Revoked history', 'Historical only', 'Never-used grace', 'Scope migration required', 'Public API compatible',
  'Tenant identity', 'Creator identity', 'Redacted', 'No active findings',
  'This means the application registry produced no records for the current filters.',
  'API keys lifecycle', 'Integration monitoring', 'Platform audit', 'Permission audit',
  'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform API client governance check failed: missing page anchor: ${anchor}`);
}
for (const stale of ['style={styles.', 'const styles:', 'Commercial readiness posture', '<table style=', '<a style=']) {
  if (page.includes(stale)) throw new Error(`Platform API client governance check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformApiClientGovernancePage.css';")) throw new Error('Platform API client governance check failed: page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform API client governance check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:760px)')) throw new Error('Platform API client governance check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'api-client-governance'");
if (routeIndex < 0) throw new Error('Platform API client governance check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 460);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ]}')) throw new Error('Platform API client governance check failed: route must preserve PLATFORM_API_KEYS_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/api-client-governance"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 280);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ)')) throw new Error('Platform API client governance check failed: navigation must remain PLATFORM_API_KEYS_READ guarded.');

if (!packageJson.includes('check:platform-api-client-governance-page-hardening')) throw new Error('Platform API client governance check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-api-client-governance-page-hardening')) throw new Error('Platform API client governance check failed: checker is not wired into check:ci.');

console.log('Platform API client governance page hardening checks passed.');
