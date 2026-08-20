import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchSteadyStateResolutionVerificationPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchSteadyStateResolutionVerificationPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalSectionHeader',
  'Resolution verification preparation only',
  'External resolution-verification boundary',
  'cannot observe or persist the real external Recurrence Resolution decision',
  'Recurrence-resolution persistence',
  'Recurrence-audit persistence',
  'Exception-closure persistence',
  'Exception-review persistence',
  'Operations cadence persistence',
  'Steady-state transition persistence',
  'Additional-growth observation persistence',
  'Additional-growth authorization persistence',
  'Expansion-health observation persistence',
  'Resolution-verification persistence',
  'Source recurrence resolution row',
  'Source recurrence audit row',
  'Source Operations Cadence statuses',
  'Source Steady-state Transition row references',
  'Source Additional Growth Observation row references',
  'Source Additional Growth Authorization row references',
  'Severity is a template hint; not an observed external verification severity.',
  'Resolution-verification status is preparation metadata only; not an observed external verification outcome.',
  'Required source recurrence-resolution evidence',
  'Required external resolution-verification evidence',
  'Resolution verification controls',
  'No resolution-verification rows were produced.',
  'This is not evidence that recurrence resolution was externally verified',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Steady-State Resolution Verification snapshot.',
  'Retry refresh',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'resolution_verification_records_persisted_in_application',
  'permission: PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ',
  'permission: PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ',
  'hasPlatformPermission(link.permission)',
  '/platform/customer-success-admin',
  '/platform/production-monitoring-readiness',
  '/platform/support-operations-cockpit',
  '/platform/service-dependencies'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) throw new Error(`Platform Steady-State Resolution Verification check failed: missing page anchor: ${anchor}`);
}

for (const staleAnchor of [
  'style={styles.',
  'const styles:',
  '<a key=',
  'accepted_verification_rows',
  'rejected_verification_rows',
  'unverified_resolution_rows',
  "to: '/platform/customer-success'",
  "to: '/platform/support-cockpit'",
  "to: '/platform/monitoring-readiness'",
  "to: '/platform/dependencies'"
]) {
  if (page.includes(staleAnchor)) throw new Error(`Platform Steady-State Resolution Verification check failed: stale page pattern remains: ${staleAnchor}`);
}

if (!css.includes('--io-primary: #d14343') || !css.includes('--io-primary-dark: #b93636')) {
  throw new Error('Platform Steady-State Resolution Verification check failed: Platform red theme variables missing.');
}
if (!css.includes('@media (max-width: 640px)')) {
  throw new Error('Platform Steady-State Resolution Verification check failed: responsive mobile rules missing.');
}

const requiredPermissions = [
  'PLATFORM_DASHBOARD_READ', 'TENANTS_READ', 'PLATFORM_BILLING_READ', 'PLATFORM_SLA_READ',
  'PLATFORM_INCIDENTS_READ', 'SUPPORT_SESSION_READ', 'PLATFORM_SESSIONS_READ', 'SYSTEM_HEALTH_READ',
  'PLATFORM_DEPENDENCIES_READ', 'TENANTS_EXPORT', 'PLATFORM_RUNBOOKS_READ', 'PLATFORM_SECURITY_READ'
];

const routeIndex = router.indexOf("path: 'commercial-launch-steady-state-resolution-verification'");
if (routeIndex < 0) throw new Error('Platform Steady-State Resolution Verification check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2500);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) throw new Error(`Platform Steady-State Resolution Verification check failed: route missing ${permission}.`);
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-steady-state-resolution-verification"');
if (navIndex < 0) throw new Error('Platform Steady-State Resolution Verification check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
if (navGuardStart < 0) throw new Error('Platform Steady-State Resolution Verification check failed: navigation permission guard missing.');
const navWindow = layout.slice(navGuardStart, navIndex + 360);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) throw new Error(`Platform Steady-State Resolution Verification check failed: navigation missing ${permission}.`);
}

if (!packageJson.includes('check:platform-steady-state-resolution-verification-hardening')) {
  throw new Error('Platform Steady-State Resolution Verification check failed: package script missing.');
}
if (!packageJson.includes('npm run check:platform-steady-state-resolution-verification-hardening')) {
  throw new Error('Platform Steady-State Resolution Verification check failed: checker is not wired into check:ci.');
}

console.log('Platform Steady-State Resolution Verification hardening checks passed.');
