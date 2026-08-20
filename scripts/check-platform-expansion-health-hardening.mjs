import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchExpansionHealthObservationPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchExpansionHealthObservationPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalSectionHeader',
  'Expansion-health preparation only',
  'External confirmation boundary',
  'does not observe or persist the real rollout-expansion authorization',
  'Rollout-authorization persistence',
  'Expansion-health persistence',
  'Manual precondition',
  'Source observation',
  'Source triage',
  'Source closure',
  'Source prevention',
  'Source rollout authorization',
  'Customer impact review',
  'Template default recommendation',
  'Template default only; not an observed health or growth decision.',
  'Source authorization artifact',
  'External observation artifact',
  'Allowed next-expansion recommendations',
  'Required external observation fields',
  'No expansion-health observation rows were produced.',
  'This is not evidence that rollout expansion did not occur',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Expansion Health Observation snapshot.',
  'Retry refresh',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  "permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ",
  'hasPlatformPermission(link.permission)',
  '/platform/customer-success-admin',
  '/platform/tenant-communications',
  '/platform/support-cockpit',
  '/platform/commercial-launch-additional-growth-authorization'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Expansion Health check failed: missing page anchor: ${anchor}`);
  }
}

for (const staleAnchor of [
  'style={styles.',
  'const styles:',
  '<a key=',
  'Failed to load commercial launch expansion health observation board:',
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

for (const anchor of [
  '.platform-expansion-health',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'var(--io-primary-dark)',
  '@media'
]) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Expansion Health check failed: missing CSS anchor: ${anchor}`);
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
