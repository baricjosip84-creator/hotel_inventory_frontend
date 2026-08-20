import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchRolloutExpansionAuthorizationPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchRolloutExpansionAuthorizationPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  "import './PlatformCommercialLaunchRolloutExpansionAuthorizationPage.css'",
  'Rollout expansion preparation only',
  'External confirmation boundary',
  'does not observe or persist the real Prevention Verification or rollout-expansion decision',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Rollout Expansion Authorization snapshot.',
  'Retry refresh',
  'disabled={expansion.isFetching}',
  'Prevention-verification persistence',
  'Rollout-authorization persistence',
  'Source observation',
  'source_observation_code',
  'Source triage',
  'source_triage_code',
  'Source closure',
  'source_closure_code',
  'Source prevention',
  'source_prevention_code',
  'Source prevention artifact',
  'External authorization artifact',
  'Customer impact review',
  'Template default only; not an observed final severity.',
  'Template default only; not an observed rollout-expansion decision.',
  'Manual precondition',
  'Allowed expansion decisions',
  'Required external authorization fields',
  'No rollout-expansion authorization rows were produced.',
  'not evidence that expansion is authorized',
  '/platform/tenant-communications',
  '/platform/support-cockpit',
  '/platform/commercial-launch-expansion-health-observation',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Rollout Expansion check failed: missing page anchor: ${anchor}`);
  }
}

for (const staleAnchor of [
  'CSSProperties',
  '<div style={styles.page}>',
  'const styles:',
  'Failed to load commercial launch rollout expansion authorization board:',
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

for (const cssAnchor of [
  '.platform-rollout-expansion__hero-aside',
  '.platform-rollout-expansion__status-badge',
  '.platform-rollout-expansion__boundary-grid',
  '.platform-rollout-expansion__feedback--warning',
  '.platform-rollout-expansion__source-grid',
  '.platform-rollout-expansion__persistence-grid',
  '.platform-rollout-expansion__row-grid',
  '.platform-rollout-expansion__empty-state',
  '.platform-rollout-expansion__rules-grid',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'var(--io-primary-dark)'
]) {
  if (!css.includes(cssAnchor)) {
    throw new Error(`Platform Rollout Expansion check failed: missing CSS anchor: ${cssAnchor}`);
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
