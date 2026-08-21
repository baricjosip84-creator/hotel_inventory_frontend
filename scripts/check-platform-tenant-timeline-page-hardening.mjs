import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantTimelinePage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantTimelinePage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform tenant operations',
  "searchParams.get('tenant_id')", "searchParams.get('source')", "searchParams.get('days')", 'uuidPattern',
  'The timeline is not loaded until the invalid filter is cleared.', 'The requested source requires a Platform permission you do not have.',
  'Showing the last successful timeline snapshot.', 'Showing the last successful tenant selector snapshot.',
  'PAGE_SIZE = 100', 'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next', 'has_more',
  'Source permissions · enforced individually', 'Operator identity · PLATFORM_USERS_READ',
  'permission-scoped', 'sources you cannot read are omitted', 'does not independently prove an external outcome occurred',
  'AUDIT_READ', 'SUPPORT_SESSION_READ', 'PLATFORM_INCIDENTS_READ', 'PLATFORM_MAINTENANCE_READ', 'PLATFORM_BILLING_READ', 'PLATFORM_DATA_RETENTION_READ', 'PLATFORM_USERS_READ',
  '/platform/tenant-tasks?tenant_id=', '/platform/tenant-communications?tenant_id=', '/platform/tenant-notes?tenant_id=',
  'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Tenant timeline check failed: missing page anchor: ${anchor}`);
}

for (const stale of ['style={styles.', 'const styles:', '<h1 style=', "limit, setLimit", "setTenantId('"] ) {
  if (page.includes(stale)) throw new Error(`Platform Tenant timeline check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformTenantTimelinePage.css';")) throw new Error('Platform Tenant timeline check failed: page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Tenant timeline check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:640px)')) throw new Error('Platform Tenant timeline check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'tenant-timeline'");
if (routeIndex < 0) throw new Error('Platform Tenant timeline check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}')) throw new Error('Platform Tenant timeline check failed: route must require TENANTS_READ.');
const navIndex = layout.indexOf('<NavLink to="/platform/tenant-timeline"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 260);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)')) throw new Error('Platform Tenant timeline check failed: navigation must be TENANTS_READ guarded.');
if (!packageJson.includes('check:platform-tenant-timeline-page-hardening')) throw new Error('Platform Tenant timeline check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-tenant-timeline-page-hardening')) throw new Error('Platform Tenant timeline check failed: checker is not wired into check:ci.');

console.log('Platform Tenant timeline page hardening checks passed.');
