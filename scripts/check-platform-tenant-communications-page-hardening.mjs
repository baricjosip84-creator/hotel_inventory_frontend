import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantCommunicationsPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantCommunicationsPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader',
  'Platform tenant operations', 'Communication registry',
  "searchParams.get('tenant_id')", "searchParams.get('channel')", "searchParams.get('direction')", "searchParams.get('follow_up')", "searchParams.get('search')", "searchParams.get('include_archived')",
  'uuidPattern', 'isKnownChannel', 'isKnownDirection',
  'The registry is not loaded until the invalid filter is cleared.',
  'Showing the last successful communications snapshot.', 'Showing the last successful tenant selector snapshot.',
  'PAGE_SIZE = 100', 'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next', 'has_more',
  'Current page only; not an all-registry total',
  'TENANTS_READ', 'TENANTS_UPDATE',
  'does not by itself prove message delivery, receipt, acknowledgement, or an external outcome',
  'Resolve the follow-up before archiving.', 'Archived communications are immutable until restored.',
  '/restore', '/resolve-follow-up',
  'PLATFORM_SLA_READ', 'PLATFORM_INCIDENTS_READ', 'SUPPORT_SESSION_READ', 'PLATFORM_BILLING_READ',
  '/platform/tenant-contacts?tenant_id=', '/platform/tenant-notes?tenant_id=', '/platform/tenant-timeline?tenant_id=', '/platform/support-operations-cockpit?tenant_id=', '/platform/billing?tenant_id=',
  'refetchOnWindowFocus: false', 'staleTime: 30_000',
  'localInputToIso', 'toLocalDateTimeInput'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Tenant communications check failed: missing page anchor: ${anchor}`);
}

for (const stale of ['style={styles.', 'const styles:', '<h1 style=', "params.set('limit', '300')"]) {
  if (page.includes(stale)) throw new Error(`Platform Tenant communications check failed: stale legacy pattern remains: ${stale}`);
}

if (!page.includes("import './PlatformTenantCommunicationsPage.css';")) throw new Error('Platform Tenant communications check failed: page CSS import missing.');
if (!css.includes('--io-primary: #d14343') || !css.includes('--io-primary-dark: #b93636')) {
  throw new Error('Platform Tenant communications check failed: Platform red theme variables missing.');
}
if (!css.includes('@media (max-width: 640px)')) throw new Error('Platform Tenant communications check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'tenant-communications'");
if (routeIndex < 0) throw new Error('Platform Tenant communications check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 460);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}')) {
  throw new Error('Platform Tenant communications check failed: route must require TENANTS_READ.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/tenant-communications"');
if (navIndex < 0) throw new Error('Platform Tenant communications check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 280);
if (navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)')) {
  throw new Error('Platform Tenant communications check failed: navigation must be TENANTS_READ guarded.');
}

if (!packageJson.includes('check:platform-tenant-communications-page-hardening')) throw new Error('Platform Tenant communications check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-tenant-communications-page-hardening')) throw new Error('Platform Tenant communications check failed: checker is not wired into check:ci.');

console.log('Platform Tenant communications page hardening checks passed.');
