import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantSlaPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantSlaPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

for (const anchor of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader', 'Platform tenant operations',
  "searchParams.get('tenant_id')", "searchParams.get('view')", 'uuidPattern', 'PAGE_SIZE = 100',
  'Showing the last successful SLA snapshot.', 'Showing the last successful SLA policy snapshot.',
  'Partial evidence', 'Template defaults — policy not configured', 'Application evidence ≠ contractual proof.',
  'external_contractual_sla_proven', 'within_sla_requires_complete_evidence', 'is_persisted', 'not_configured',
  'PLATFORM_INCIDENTS_READ', 'SUPPORT_SESSION_READ', 'TENANTS_READ', 'PLATFORM_NOTIFICATIONS_WRITE',
  'limit: String(PAGE_SIZE)', 'offset: String(offset)', 'Previous', 'Next', 'has_more',
  'refetchOnWindowFocus: false', 'staleTime: 30_000', 'Synchronize SLA notifications'
]) {
  if (!page.includes(anchor)) throw new Error(`Platform Tenant SLA check failed: missing page anchor: ${anchor}`);
}
for (const stale of ['style={styles.', 'const styles:', "window.alert('SLA policy saved.')", '<a style=', "status: 'within_sla' | 'breached'"]) {
  if (page.includes(stale)) throw new Error(`Platform Tenant SLA check failed: stale legacy pattern remains: ${stale}`);
}
if (!page.includes("import './PlatformTenantSlaPage.css';")) throw new Error('Platform Tenant SLA check failed: page CSS import missing.');
if (!css.includes('--io-primary:#d14343') || !css.includes('--io-primary-dark:#b93636')) throw new Error('Platform Tenant SLA check failed: Platform red theme variables missing.');
if (!css.includes('@media(max-width:640px)')) throw new Error('Platform Tenant SLA check failed: mobile responsive rule missing.');

const routeIndex = router.indexOf("path: 'tenant-sla'");
if (routeIndex < 0) throw new Error('Platform Tenant SLA check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 420);
if (!routeWindow.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_SLA_READ]}')) throw new Error('Platform Tenant SLA check failed: route must preserve PLATFORM_SLA_READ entry access.');
const navIndex = layout.indexOf('<NavLink to="/platform/tenant-sla"');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
const navWindow = layout.slice(navGuardStart, navIndex + 250);
if (navIndex < 0 || navGuardStart < 0 || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)')) throw new Error('Platform Tenant SLA check failed: navigation must remain PLATFORM_SLA_READ guarded.');

if (!packageJson.includes('check:platform-tenant-sla-page-hardening')) throw new Error('Platform Tenant SLA check failed: package script missing.');
if (!packageJson.includes('npm run check:platform-tenant-sla-page-hardening')) throw new Error('Platform Tenant SLA check failed: checker is not wired into check:ci.');

console.log('Platform Tenant SLA page hardening checks passed.');
