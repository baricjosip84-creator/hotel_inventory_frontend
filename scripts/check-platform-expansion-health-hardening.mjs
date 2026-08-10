import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchExpansionHealthObservationPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Expansion-health preparation only.',
  'External confirmation boundary.',
  'does not observe external rollout-expansion authorization',
  'Rollout-authorization persistence',
  'Expansion-health persistence',
  'Manual precondition',
  'Source authorization artifact',
  'External observation artifact',
  'Allowed recommendations',
  'Required external observation fields',
  'rollout_expansion_authorization_persistence',
  'expansion_health_persistence',
  'source_authorization_artifact',
  'observation_artifact',
  'manual_precondition',
  '/platform/customer-success-admin',
  '/platform/tenant-communications',
  '/platform/support-cockpit',
  '/platform/commercial-launch-additional-growth-authorization',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'errorMessage(observation.error)',
  "normalized.includes('external')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Expansion Health check failed: missing page anchor: ${anchor}`);
  }
}

for (const staleAnchor of [
  "/platform/customer-success'",
  '/platform/support-operations-cockpit',
  'tenant_sample_health_reviews_recorded',
  'support_volume_reviews_recorded',
  'customer_success_feedback_reviews_recorded',
  'rollback_reconfirmations_recorded',
  'next_expansion_recommendations_recorded',
  'not_reviewed_observation_rows',
  'ready_for_expanded_cohort_health_observation'
]) {
  if (page.includes(staleAnchor)) {
    throw new Error(`Platform Expansion Health check failed: stale page anchor remains: ${staleAnchor}`);
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

const routeIndex = router.indexOf("path: 'commercial-launch-expansion-health-observation'");
if (routeIndex < 0) throw new Error('Platform Expansion Health check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2200);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Expansion Health check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-expansion-health-observation"');
if (navIndex < 0) throw new Error('Platform Expansion Health check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 2600), navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Expansion Health check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Expansion Health hardening checks passed.');
