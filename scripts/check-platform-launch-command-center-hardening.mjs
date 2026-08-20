import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchDayCommandCenterPage.tsx'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchDayCommandCenterPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'Commercial Launch Day Command Center',
  'Preparation only.',
  'cannot observe external go/no-go decisions',
  'launch-window command-center decisions',
  'Go/No-Go decision persistence',
  'Smoke-test result persistence',
  'Command-center decision persistence',
  'Manual precondition',
  'External decision artifact',
  'Required external decision fields',
  'go_no_go_decision_persistence',
  'smoke_test_result_persistence',
  'decision_persistence',
  '/platform/support-cockpit',
  '/platform/monitoring-readiness',
  '/platform/commercial-launch-post-launch-observation',
  '/platform/commercial-launch-acceptance-packet',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'const initialLoadError = commandCenter.isError && !data',
  'const refreshError = commandCenter.isError && Boolean(data)',
  'Showing the last successful Commercial Launch Day Command Center snapshot.',
  'A template default of not reviewed is not proof that no external decision exists.',
  'Current smoke-test summary',
  'data.checkpoints.length > 0',
  'disabled={commandCenter.isFetching}'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Launch Command Center check failed: missing page anchor: ${anchor}`);
  }
}

const requiredStyleAnchors = [
  '.platform-launch-command-center__hero-aside',
  '.platform-launch-command-center__boundary-grid',
  '.platform-launch-command-center__status-badge',
  '.platform-launch-command-center__row-grid',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'overflow-wrap: anywhere',
  '@media (max-width: 760px)'
];

for (const anchor of requiredStyleAnchors) {
  if (!styles.includes(anchor)) {
    throw new Error(`Platform Launch Command Center check failed: missing style anchor: ${anchor}`);
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

const routeIndex = router.indexOf("path: 'commercial-launch-day-command-center'");
if (routeIndex < 0) throw new Error('Platform Launch Command Center check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 1900);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Launch Command Center check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-day-command-center"');
if (navIndex < 0) throw new Error('Platform Launch Command Center check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 2300), navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Launch Command Center check failed: navigation missing ${permission}.`);
  }
}

if (!packageJson.includes('npm run check:platform-launch-command-center-hardening')) {
  throw new Error('Platform Launch Command Center check failed: hardening checker is not wired into check:ci.');
}

console.log('Platform Launch Command Center hardening checks passed.');
