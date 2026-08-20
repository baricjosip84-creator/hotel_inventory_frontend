import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchSteadyStateExceptionClosurePage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchSteadyStateExceptionClosurePage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalSectionHeader',
  'Exception closure preparation only',
  'External exception-closure boundary',
  'cannot observe or persist the real Exception Review acceptance record',
  'Exception-review persistence',
  'Operations cadence persistence',
  'Steady-state transition persistence',
  'Additional-growth observation persistence',
  'Additional-growth authorization persistence',
  'Exception-closure persistence',
  'Source Operations Cadence statuses',
  'Source Steady-state Transition row references',
  'Source Additional Growth Observation row references',
  'Source Additional Growth Authorization row references',
  'Severity is a template hint; not an observed external exception severity.',
  'Closure status is preparation metadata only; not an observed external closure outcome.',
  'Required external closure evidence',
  'Closure controls',
  'No exception-closure rows were produced.',
  'This is not evidence that steady-state exceptions are closed',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Steady-State Exception Closure snapshot.',
  'Retry refresh',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'exception_closure_records_persisted_in_application',
  'permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ',
  'permission: PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ',
  'permission: PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ',
  'hasPlatformPermission(link.permission)',
  '/platform/customer-success-admin',
  '/platform/production-monitoring-readiness',
  '/platform/support-operations-cockpit',
  '/platform/service-dependencies'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) throw new Error(`Platform Steady-State Exception Closure check failed: missing page anchor: ${anchor}`);
}

for (const staleAnchor of [
  'style={styles.',
  'const styles:',
  '<a key=',
  'accepted_closure_rows',
  'rejected_closure_rows',
  'unclosed_exception_rows',
  "to: '/platform/customer-success'",
  "to: '/platform/support-cockpit'",
  "to: '/platform/monitoring-readiness'",
  "to: '/platform/dependencies'"
]) {
  if (page.includes(staleAnchor)) throw new Error(`Platform Steady-State Exception Closure check failed: stale page pattern remains: ${staleAnchor}`);
}

if (!css.includes('--io-primary: #d14343') || !css.includes('--io-primary-dark: #b93636')) {
  throw new Error('Platform Steady-State Exception Closure check failed: Platform red theme variables missing.');
}
if (!css.includes('@media (max-width: 640px)')) {
  throw new Error('Platform Steady-State Exception Closure check failed: responsive mobile rules missing.');
}

const requiredPermissions = [
  'PLATFORM_DASHBOARD_READ', 'TENANTS_READ', 'PLATFORM_BILLING_READ', 'PLATFORM_SLA_READ',
  'PLATFORM_INCIDENTS_READ', 'SUPPORT_SESSION_READ', 'PLATFORM_SESSIONS_READ', 'SYSTEM_HEALTH_READ',
  'PLATFORM_DEPENDENCIES_READ', 'TENANTS_EXPORT', 'PLATFORM_RUNBOOKS_READ', 'PLATFORM_SECURITY_READ'
];

const routeIndex = router.indexOf("path: 'commercial-launch-steady-state-exception-closure'");
if (routeIndex < 0) throw new Error('Platform Steady-State Exception Closure check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2500);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) throw new Error(`Platform Steady-State Exception Closure check failed: route missing ${permission}.`);
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-steady-state-exception-closure"');
if (navIndex < 0) throw new Error('Platform Steady-State Exception Closure check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
if (navGuardStart < 0) throw new Error('Platform Steady-State Exception Closure check failed: navigation permission guard missing.');
const navWindow = layout.slice(navGuardStart, navIndex + 320);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) throw new Error(`Platform Steady-State Exception Closure check failed: navigation missing ${permission}.`);
}

if (!packageJson.includes('check:platform-steady-state-exception-closure-hardening')) {
  throw new Error('Platform Steady-State Exception Closure check failed: package script missing.');
}
if (!packageJson.includes('npm run check:platform-steady-state-exception-closure-hardening')) {
  throw new Error('Platform Steady-State Exception Closure check failed: checker is not wired into check:ci.');
}

console.log('Platform Steady-State Exception Closure hardening checks passed.');
