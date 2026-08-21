import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformVendorsPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformVendorsPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform operations',
  'Vendor evidence boundary', 'application-maintained registry evidence', 'do not prove an external contract',
  'PAGE_SIZE = 50', "searchParams.get('category')", "searchParams.get('status')", "searchParams.get('risk_level')", "searchParams.get('search')", "searchParams.get('renewal_due')", "searchParams.get('include_archived')",
  'PLATFORM_USERS_READ', 'PLATFORM_DEPENDENCIES_READ', 'PLATFORM_COMPLIANCE_READ', 'AUDIT_READ',
  'Showing the last successful snapshot.', 'Invalid URL filter', 'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'pagination?.has_more',
  'Filtered registry summary', 'Archived · immutable', 'Owner linkage restricted', 'PLATFORM_USERS_READ is required to view or change',
  'Create vendor', 'Save changes', 'Archive', 'Service dependencies', 'Integration monitoring', 'Legal compliance reporting', 'Platform audit',
  'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Vendors check failed: missing page anchor: ${anchor}`);
}
for (const stale of ['style={styles.', 'const styles:', "params.set('limit', '300')", 'Total shown', 'Track HLA vendors and partners']) {
  if (page.includes(stale)) throw new Error(`Platform Vendors check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformVendorsPage.css';")) throw new Error('Platform Vendors check failed: page CSS import missing.');
if (!page.includes('enabled: canWrite && canReadPlatformUsers')) throw new Error('Platform Vendors check failed: Platform-user directory query must be permission-gated.');
if (!page.includes('if (canReadPlatformUsers) payload.owner_platform_user_id')) throw new Error('Platform Vendors check failed: owner mutation must be omitted without PLATFORM_USERS_READ.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Vendors check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:760px)')) throw new Error('Platform Vendors check failed: mobile responsive rule missing.');
const routeIndex = router.indexOf("path: 'vendors'");
if (routeIndex < 0) throw new Error('Platform Vendors check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ]}')) throw new Error('Platform Vendors check failed: route must preserve PLATFORM_VENDORS_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/vendors"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 260);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ)')) throw new Error('Platform Vendors check failed: navigation must remain PLATFORM_VENDORS_READ guarded.');
if (!packageJson.includes('check:platform-vendors-page-hardening')) throw new Error('Platform Vendors check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-vendors-page-hardening')) throw new Error('Platform Vendors check failed: checker is not wired into check:ci.');
console.log('Platform Vendors page hardening checks passed.');
