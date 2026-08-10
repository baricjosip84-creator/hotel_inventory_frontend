import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchPostLaunchObservationPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Observation preparation only.',
  'External confirmation boundary.',
  'cannot observe external go/no-go decisions',
  'Command-center decision persistence',
  'Smoke-test result persistence',
  'Go/no-go decision persistence',
  'Post-launch observation persistence',
  'Manual precondition',
  'External observation artifact',
  'Required external observation fields',
  'command_center_decision_persistence',
  'smoke_test_result_persistence',
  'go_no_go_decision_persistence',
  'observation_persistence',
  'source_checkpoints_requiring_evidence_review',
  'source_checkpoints_awaiting_external_go_no_go_confirmation',
  'source_checkpoints_awaiting_external_smoke_test_confirmation',
  '/platform/tenant-communications',
  '/platform/support-cockpit',
  '/platform/monitoring-readiness',
  '/platform/commercial-launch-incident-triage',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'errorMessage(observation.error)',
  "normalized.includes('review')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Post-Launch Observation check failed: missing page anchor: ${anchor}`);
  }
}

for (const staleAnchor of [
  'source_checkpoints_waiting_for_go_no_go_decisions',
  'source_not_reviewed_decisions',
  'to="/platform/communications"'
]) {
  if (page.includes(staleAnchor)) {
    throw new Error(`Platform Post-Launch Observation check failed: stale page anchor remains: ${staleAnchor}`);
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

const routeIndex = router.indexOf("path: 'commercial-launch-post-launch-observation'");
if (routeIndex < 0) throw new Error('Platform Post-Launch Observation check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 1900);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Post-Launch Observation check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-post-launch-observation"');
if (navIndex < 0) throw new Error('Platform Post-Launch Observation check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 2300), navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Post-Launch Observation check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Post-Launch Observation hardening checks passed.');
