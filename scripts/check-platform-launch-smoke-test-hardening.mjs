import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchSmokeTestChecklistPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchSmokeTestChecklistPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  "import './PlatformCommercialLaunchSmokeTestChecklistPage.css'",
  'Execution-preparation only.',
  'cannot observe',
  'Current execution prerequisite context',
  'Go/No-Go decision persistence',
  'Smoke-test result persistence',
  'Current Go/No-Go register summary',
  'Source Go/No-Go posture',
  'Source acceptance posture',
  'Manual precondition',
  'Template default result',
  'not proof that no external result exists',
  'External result artifact',
  'Required external result fields',
  'required_result_fields',
  'result_persistence',
  '/platform/sessions',
  '/platform/support-cockpit',
  '/platform/monitoring-readiness',
  '/platform/commercial-launch-day-command-center',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'const initialLoadError = checklist.isError && !data',
  'const refreshError = checklist.isError && Boolean(data)',
  'Showing the last successful Commercial Launch Smoke Test Checklist snapshot.',
  'disabled={checklist.isFetching}',
  'No smoke-test rows are available.'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Launch Smoke Test check failed: missing page anchor: ${anchor}`);
  }
}

if (page.includes('style={styles.') || page.includes('const styles:')) {
  throw new Error('Platform Launch Smoke Test check failed: legacy inline-style shell remains.');
}

for (const anchor of [
  '.platform-launch-smoke-test__hero-aside',
  '.platform-launch-smoke-test__boundary-grid',
  '.platform-launch-smoke-test__row-grid',
  '.platform-launch-smoke-test__persistence-grid',
  '.platform-launch-smoke-test__feedback--warning',
  'var(--io-primary-soft)',
  'overflow-wrap: anywhere',
  '@media (max-width: 720px)'
]) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Launch Smoke Test check failed: missing CSS anchor: ${anchor}`);
  }
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

const routeIndex = router.indexOf("path: 'commercial-launch-smoke-test-checklist'");
if (routeIndex < 0) throw new Error('Platform Launch Smoke Test check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2100);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Launch Smoke Test check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-smoke-test-checklist"');
if (navIndex < 0) throw new Error('Platform Launch Smoke Test check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 2500), navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Launch Smoke Test check failed: navigation missing ${permission}.`);
  }
}

const commandCenterRouteIndex = router.indexOf("path: 'commercial-launch-day-command-center'");
if (commandCenterRouteIndex < 0) throw new Error('Platform Launch Smoke Test check failed: command-center route missing.');
const commandCenterRouteWindow = router.slice(commandCenterRouteIndex, commandCenterRouteIndex + 2100);
for (const permission of requiredPermissions) {
  if (!commandCenterRouteWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Launch Smoke Test check failed: command-center route missing ${permission}.`);
  }
}

if (!String(packageJson.scripts?.['check:ci'] || '').includes('npm run check:platform-launch-smoke-test-hardening')) {
  throw new Error('Platform Launch Smoke Test check failed: dedicated hardening check is not wired into check:ci.');
}

console.log('Platform Launch Smoke Test hardening checks passed.');
