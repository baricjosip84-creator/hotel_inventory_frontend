import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchRolloutExpansionAuthorizationPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Rollout expansion preparation only.',
  'External confirmation boundary.',
  'does not observe external prevention-verification',
  'Prevention-verification persistence',
  'Rollout-authorization persistence',
  'Manual precondition',
  'Source prevention artifact',
  'External authorization artifact',
  'Allowed expansion decisions',
  'Required external authorization fields',
  'prevention_verification_persistence',
  'rollout_expansion_persistence',
  'source_prevention_artifact',
  'authorization_artifact',
  'manual_precondition',
  '/platform/tenant-communications',
  '/platform/support-cockpit',
  '/platform/commercial-launch-expansion-health-observation',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'errorMessage(expansion.error)',
  "normalized.includes('external')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Rollout Expansion check failed: missing page anchor: ${anchor}`);
  }
}

for (const staleAnchor of [
  '/platform/support-operations-cockpit',
  '/platform/commercial-launch-expansion-health\'',
  'expansion_requests_recorded',
  'support_capacity_acknowledgements_recorded',
  'rollback_acknowledgements_recorded',
  'monitoring_owners_recorded',
  'expansion_decisions_recorded',
  'not_reviewed_expansion_rows',
  'Accepted expansion decisions'
]) {
  if (page.includes(staleAnchor)) {
    throw new Error(`Platform Rollout Expansion check failed: stale page anchor remains: ${staleAnchor}`);
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

const routeIndex = router.indexOf("path: 'commercial-launch-rollout-expansion-authorization'");
if (routeIndex < 0) throw new Error('Platform Rollout Expansion check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2200);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Rollout Expansion check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-rollout-expansion-authorization"');
if (navIndex < 0) throw new Error('Platform Rollout Expansion check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 2500), navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Rollout Expansion check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Rollout Expansion hardening checks passed.');
