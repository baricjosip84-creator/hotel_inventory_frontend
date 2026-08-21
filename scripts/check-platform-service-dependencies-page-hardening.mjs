import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformServiceDependenciesPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformServiceDependenciesPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform operations',
  'Dependency evidence boundary', 'application-maintained evidence', 'do not prove the external service is actually healthy',
  'Historical check timestamps can include legacy registry edits', 'ordinary edits no longer advance the check timestamp',
  'PAGE_SIZE = 50', "searchParams.get('status')", "searchParams.get('category')", "searchParams.get('business_impact')", "searchParams.get('vendor_id')", "searchParams.get('search')", "searchParams.get('only_attention')", "searchParams.get('include_archived')",
  'PLATFORM_VENDORS_READ', 'PLATFORM_USERS_READ', 'PLATFORM_CAPACITY_READ', 'AUDIT_READ',
  'Showing the last successful snapshot.', 'Invalid or forbidden URL filter', 'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'pagination?.has_more',
  'Vendor linkage restricted', 'Owner linkage restricted', 'Record check', 'Archived · immutable',
  'Integration monitoring', 'Vendors', 'Capacity planning', 'Platform audit',
  'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Service Dependencies check failed: missing page anchor: ${anchor}`);
}
for (const stale of ['style={styles.', 'const styles:', "params.set('limit', '300')", 'Visible dependencies:', 'Track external services HLA depends on']) {
  if (page.includes(stale)) throw new Error(`Platform Service Dependencies check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformServiceDependenciesPage.css';")) throw new Error('Platform Service Dependencies check failed: page CSS import missing.');
if (!page.includes('enabled: canReadVendors')) throw new Error('Platform Service Dependencies check failed: vendor directory query must be permission-gated.');
if (!page.includes('enabled: canWrite && canReadPlatformUsers')) throw new Error('Platform Service Dependencies check failed: Platform-user directory query must be permission-gated.');
if (!page.includes('if (canReadVendors) payload.vendor_id')) throw new Error('Platform Service Dependencies check failed: vendor mutation must be omitted without PLATFORM_VENDORS_READ.');
if (!page.includes('if (canReadPlatformUsers) payload.owner_platform_user_id')) throw new Error('Platform Service Dependencies check failed: owner mutation must be omitted without PLATFORM_USERS_READ.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Service Dependencies check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:760px)')) throw new Error('Platform Service Dependencies check failed: mobile responsive rule missing.');
const routeIndex = router.indexOf("path: 'service-dependencies'");
if (routeIndex < 0) throw new Error('Platform Service Dependencies check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 460);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ]}')) throw new Error('Platform Service Dependencies check failed: route must preserve PLATFORM_DEPENDENCIES_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/service-dependencies"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 300);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ)')) throw new Error('Platform Service Dependencies check failed: navigation must remain PLATFORM_DEPENDENCIES_READ guarded.');
if (!packageJson.includes('check:platform-service-dependencies-page-hardening')) throw new Error('Platform Service Dependencies check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-service-dependencies-page-hardening')) throw new Error('Platform Service Dependencies check failed: checker is not wired into check:ci.');
console.log('Platform Service Dependencies page hardening checks passed.');
