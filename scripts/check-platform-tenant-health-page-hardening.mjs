import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantHealthPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantHealthPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform tenant operations',
  "searchParams.get('tenant_id')", "searchParams.get('band')", 'uuidPattern', 'PAGE_SIZE = 100',
  'Showing the last successful health snapshot.', 'Showing the last successful tenant selector snapshot.',
  'final score and band', 'Final score withheld', 'Hidden by permission', 'permission-scoped',
  'PLATFORM_INCIDENTS_READ', 'SUPPORT_SESSION_READ', 'PLATFORM_NOTIFICATIONS_READ', 'AUDIT_READ', 'PLATFORM_NOTIFICATIONS_WRITE',
  'Reconcile health notifications', 'recovered resolved', 'duplicates resolved',
  'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next', 'has_more',
  'loaded page only', 'operational heuristic', 'not an SLA',
  'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Tenant health check failed: missing page anchor: ${anchor}`);
}

for (const stale of ['style={styles.', 'const styles:', '<h1 style=', "setTenantId('"]) {
  if (page.includes(stale)) throw new Error(`Platform Tenant health check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformTenantHealthPage.css';")) throw new Error('Platform Tenant health check failed: page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Tenant health check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:640px)')) throw new Error('Platform Tenant health check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'tenant-health'");
if (routeIndex < 0) throw new Error('Platform Tenant health check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}')) throw new Error('Platform Tenant health check failed: route must preserve TENANTS_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/tenant-health"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 260);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)')) throw new Error('Platform Tenant health check failed: navigation must remain TENANTS_READ guarded.');

if (!packageJson.includes('check:platform-tenant-health-page-hardening')) throw new Error('Platform Tenant health check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-tenant-health-page-hardening')) throw new Error('Platform Tenant health check failed: checker is not wired into check:ci.');

console.log('Platform Tenant health page hardening checks passed.');
