import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantTasksPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantTasksPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader',
  'Platform tenant operations', 'Task registry',
  "searchParams.get('tenant_id')", "searchParams.get('status')", "searchParams.get('category')", "searchParams.get('priority')", "searchParams.get('assigned_platform_user_id')", "searchParams.get('include_closed')", "searchParams.get('overdue_only')",
  'uuidPattern', 'isKnownValue', 'The task registry is not loaded until the invalid filter is cleared.',
  'Showing the last successful task snapshot.', 'Showing the last successful tenant selector snapshot.',
  'PAGE_SIZE = 100', 'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next', 'has_more',
  'Current page only; not an all-registry total', 'Global application total; not filter-scoped',
  'TENANTS_READ', 'TENANTS_UPDATE', 'PLATFORM_USERS_READ',
  'Operator identity · PLATFORM_USERS_READ', 'Platform operator identity fields are redacted by the API unless PLATFORM_USERS_READ is present.',
  'Tenant ownership is immutable after creation.', 'does not independently prove an external/customer outcome',
  'Prefer Cancel when the task should remain in operational history.',
  'PLATFORM_SLA_READ', 'PLATFORM_INCIDENTS_READ', 'SUPPORT_SESSION_READ', 'PLATFORM_BILLING_READ', 'PLATFORM_RUNBOOKS_READ',
  '/platform/tenant-contacts?tenant_id=', '/platform/tenant-notes?tenant_id=', '/platform/tenant-communications?tenant_id=', '/platform/tenant-timeline?tenant_id=', '/platform/support-operations-cockpit?tenant_id=', '/platform/billing?tenant_id=',
  'refetchOnWindowFocus: false', 'staleTime: 30_000',
  'localInputToIso', 'toLocalDateTimeInput',
  "body: JSON.stringify(mutablePayload())"
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Tenant tasks check failed: missing page anchor: ${anchor}`);
}

for (const stale of ['style={styles.', 'const styles:', '<h1 style=', "params.set('limit', '300')", 'task.due_at.slice(0, 16)', "enabled: canWrite"] ) {
  if (page.includes(stale)) throw new Error(`Platform Tenant tasks check failed: stale legacy pattern remains: ${stale}`);
}

if (!page.includes("import './PlatformTenantTasksPage.css';")) throw new Error('Platform Tenant tasks check failed: page CSS import missing.');
if (!css.includes('--io-primary: #d14343') || !css.includes('--io-primary-dark: #b93636')) throw new Error('Platform Tenant tasks check failed: Platform red theme variables missing.');
if (!css.includes('@media (max-width: 640px)')) throw new Error('Platform Tenant tasks check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'tenant-tasks'");
if (routeIndex < 0) throw new Error('Platform Tenant tasks check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}')) throw new Error('Platform Tenant tasks check failed: route must require TENANTS_READ.');

const navIndex = layout.indexOf('<NavLink to="/platform/tenant-tasks"');
if (navIndex < 0) throw new Error('Platform Tenant tasks check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 260);
if (navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)')) throw new Error('Platform Tenant tasks check failed: navigation must be TENANTS_READ guarded.');

if (!packageJson.includes('check:platform-tenant-tasks-page-hardening')) throw new Error('Platform Tenant tasks check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-tenant-tasks-page-hardening')) throw new Error('Platform Tenant tasks check failed: checker is not wired into check:ci.');

console.log('Platform Tenant tasks page hardening checks passed.');
