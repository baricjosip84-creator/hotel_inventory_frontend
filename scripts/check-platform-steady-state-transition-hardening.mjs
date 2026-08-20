import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchSteadyStateTransitionPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchSteadyStateTransitionPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalSectionHeader',
  'Transition preparation only',
  'External transition boundary',
  'cannot observe or persist the real Additional Growth Observation record',
  'Additional-growth observation persistence',
  'Additional-growth authorization persistence',
  'Steady-state transition persistence',
  'Source Additional Growth Observation posture',
  'Source Additional Growth Observation row references',
  'Source Additional Growth Authorization row references',
  'Preparation status only; not an observed external transition outcome.',
  'Required external transition evidence',
  'Transition controls',
  'No steady-state transition rows were produced.',
  'This is not evidence that launch is closed',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Steady-State Transition snapshot.',
  'Retry refresh',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'transition_records_persisted_in_application',
  'permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ',
  'permission: PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ',
  'hasPlatformPermission(link.permission)',
  '/platform/customer-success-admin',
  '/platform/production-monitoring-readiness',
  '/platform/backup-restore-validation',
  '/platform/support-operations-cockpit',
  '/platform/service-dependencies'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) throw new Error(`Platform Steady-State Transition check failed: missing page anchor: ${anchor}`);
}

for (const staleAnchor of [
  'style={styles.',
  'const styles:',
  '<a key=',
  "to: '/platform/customer-success'",
  "to: '/platform/support-cockpit'",
  "to: '/platform/monitoring-readiness'",
  "to: '/platform/backup-restore'"
]) {
  if (page.includes(staleAnchor)) throw new Error(`Platform Steady-State Transition check failed: stale page pattern remains: ${staleAnchor}`);
}

if (!css.includes('--io-primary: #d14343') || !css.includes('--io-primary-dark: #b93636')) {
  throw new Error('Platform Steady-State Transition check failed: Platform red theme variables missing.');
}

const requiredPermissions = [
  'PLATFORM_DASHBOARD_READ',
  'TENANTS_READ',
  'PLATFORM_BILLING_READ',
  'PLATFORM_SLA_READ',
  'PLATFORM_INCIDENTS_READ',
  'SUPPORT_SESSION_READ',
  'PLATFORM_SESSIONS_READ',
  'SYSTEM_HEALTH_READ',
  'PLATFORM_DEPENDENCIES_READ',
  'TENANTS_EXPORT',
  'PLATFORM_RUNBOOKS_READ',
  'PLATFORM_SECURITY_READ'
];

const routeIndex = router.indexOf("path: 'commercial-launch-steady-state-transition'");
if (routeIndex < 0) throw new Error('Platform Steady-State Transition check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2400);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) throw new Error(`Platform Steady-State Transition check failed: route missing ${permission}.`);
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-steady-state-transition"');
if (navIndex < 0) throw new Error('Platform Steady-State Transition check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
if (navGuardStart < 0) throw new Error('Platform Steady-State Transition check failed: navigation permission guard missing.');
const navWindow = layout.slice(navGuardStart, navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) throw new Error(`Platform Steady-State Transition check failed: navigation missing ${permission}.`);
}

if (!packageJson.includes('check:platform-steady-state-transition-hardening')) {
  throw new Error('Platform Steady-State Transition check failed: package script missing.');
}
if (!packageJson.includes('npm run check:platform-steady-state-transition-hardening')) {
  throw new Error('Platform Steady-State Transition check failed: checker is not wired into check:ci.');
}

console.log('Platform Steady-State Transition hardening checks passed.');
