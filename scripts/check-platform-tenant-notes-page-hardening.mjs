import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantNotesPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantNotesPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader',
  'Platform tenant operations', 'Tenant note registry',
  "searchParams.get('tenant_id')", "searchParams.get('category')", "searchParams.get('search')", "searchParams.get('include_archived')",
  'uuidPattern', 'isKnownCategory',
  'The registry is not loaded until the invalid filter is cleared.',
  'Showing the last successful tenant notes snapshot.', 'Showing the last successful tenant selector snapshot.',
  'PAGE_SIZE = 100', 'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next',
  'Current page', 'not an all-registry total',
  'Visibility is descriptive metadata only.', 'TENANTS_READ / TENANTS_UPDATE',
  'Archived notes are intentionally immutable until restored.',
  'It does not prove no tenant context or external operational knowledge exists elsewhere.',
  'PLATFORM_SLA_READ', 'PLATFORM_INCIDENTS_READ', 'SUPPORT_SESSION_READ', 'PLATFORM_BILLING_READ',
  '/platform/tenant-contacts?tenant_id=', '/platform/support-operations-cockpit?tenant_id=', '/platform/billing?tenant_id=',
  'refetchOnWindowFocus: false', 'staleTime: 30_000'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Tenant notes check failed: missing page anchor: ${anchor}`);
}

for (const stale of ['style={styles.', 'const styles:', '<h1 style=', 'params.set(\'limit\', \'300\')']) {
  if (page.includes(stale)) throw new Error(`Platform Tenant notes check failed: stale legacy pattern remains: ${stale}`);
}

if (!page.includes("import './PlatformTenantNotesPage.css';")) throw new Error('Platform Tenant notes check failed: page CSS import missing.');
if (!css.includes('--io-primary: #d14343') || !css.includes('--io-primary-dark: #b93636')) {
  throw new Error('Platform Tenant notes check failed: Platform red theme variables missing.');
}
if (!css.includes('@media (max-width: 640px)')) throw new Error('Platform Tenant notes check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'tenant-notes'");
if (routeIndex < 0) throw new Error('Platform Tenant notes check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}')) {
  throw new Error('Platform Tenant notes check failed: route must require TENANTS_READ.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/tenant-notes"');
if (navIndex < 0) throw new Error('Platform Tenant notes check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 260);
if (navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)')) {
  throw new Error('Platform Tenant notes check failed: navigation must be TENANTS_READ guarded.');
}

if (!packageJson.includes('check:platform-tenant-notes-page-hardening')) throw new Error('Platform Tenant notes check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-tenant-notes-page-hardening')) throw new Error('Platform Tenant notes check failed: checker is not wired into check:ci.');

console.log('Platform Tenant notes page hardening checks passed.');
