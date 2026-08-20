import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchPreventionVerificationPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchPreventionVerificationPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  "import './PlatformCommercialLaunchPreventionVerificationPage.css'",
  'Prevention preparation only',
  'External confirmation boundary',
  'does not observe or persist the real Incident Closure or prevention decision',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Prevention Verification snapshot.',
  'Retry refresh',
  'disabled={prevention.isFetching}',
  'Incident-closure persistence',
  'Prevention-verification persistence',
  'Source observation',
  'source_observation_code',
  'Source triage',
  'source_triage_code',
  'Source closure',
  'source_closure_code',
  'Source closure artifact',
  'External prevention artifact',
  'Customer impact review',
  'Template default only; not an observed final severity.',
  'Template default only; not an observed rollout-expansion decision.',
  'Manual precondition',
  'Allowed rollout-expansion decisions',
  'Required external prevention fields',
  'No prevention preparation rows were produced.',
  'not evidence that prevention is complete',
  '/platform/tenant-communications',
  '/platform/support-cockpit',
  '/platform/commercial-launch-rollout-expansion-authorization',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Prevention Verification check failed: missing page anchor: ${anchor}`);
  }
}

for (const staleAnchor of [
  'CSSProperties',
  '<div style={styles.page}>',
  'const styles:',
  'Failed to load commercial launch prevention verification board:',
  '/platform/support-operations-cockpit',
  'implementation_evidence_recorded',
  'effectiveness_reviews_recorded',
  'recurrence_watch_owners_recorded',
  'rollout_expansion_decisions_recorded',
  'not_reviewed_prevention_rows',
  'Accepted rollout-expansion decisions'
]) {
  if (page.includes(staleAnchor)) {
    throw new Error(`Platform Prevention Verification check failed: stale page anchor remains: ${staleAnchor}`);
  }
}

for (const cssAnchor of [
  '.platform-prevention-verification__hero-aside',
  '.platform-prevention-verification__status-badge',
  '.platform-prevention-verification__boundary-grid',
  '.platform-prevention-verification__feedback--warning',
  '.platform-prevention-verification__source-grid',
  '.platform-prevention-verification__persistence-grid',
  '.platform-prevention-verification__row-grid',
  '.platform-prevention-verification__empty-state',
  '.platform-prevention-verification__rules-grid',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'var(--io-primary-dark)'
]) {
  if (!css.includes(cssAnchor)) {
    throw new Error(`Platform Prevention Verification check failed: missing CSS anchor: ${cssAnchor}`);
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

const routeIndex = router.indexOf("path: 'commercial-launch-prevention-verification'");
if (routeIndex < 0) throw new Error('Platform Prevention Verification check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2000);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Prevention Verification check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-prevention-verification"');
if (navIndex < 0) throw new Error('Platform Prevention Verification check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 2500), navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Prevention Verification check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Prevention Verification hardening checks passed.');
