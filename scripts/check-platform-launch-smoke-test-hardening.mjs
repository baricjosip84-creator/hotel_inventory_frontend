import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchSmokeTestChecklistPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Execution-preparation only.',
  'cannot observe external go/no-go decisions or smoke-test execution records',
  'Go/no-go decision persistence',
  'Smoke-test result persistence',
  'Manual precondition',
  'Template default result',
  'External result artifact',
  'Required external result fields',
  'required_result_fields',
  'result_persistence',
  '/platform/support-cockpit',
  '/platform/monitoring-readiness',
  '/platform/commercial-launch-day-command-center',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'errorMessage(checklist.error)',
  "normalized.includes('review')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Launch Smoke Test check failed: missing page anchor: ${anchor}`);
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
const routeWindow = router.slice(routeIndex, routeIndex + 1900);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Launch Smoke Test check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-smoke-test-checklist"');
if (navIndex < 0) throw new Error('Platform Launch Smoke Test check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 2300), navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Launch Smoke Test check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Launch Smoke Test hardening checks passed.');
