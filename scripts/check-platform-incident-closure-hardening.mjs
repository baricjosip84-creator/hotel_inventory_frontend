import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchIncidentClosurePage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchIncidentClosurePage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  "import './PlatformCommercialLaunchIncidentClosurePage.css'",
  'Closure preparation only',
  'External confirmation boundary',
  'does not observe or persist the real triage or closure decision',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Incident Closure snapshot.',
  'Retry refresh',
  'disabled={closure.isFetching}',
  'Incident-triage persistence',
  'Incident-closure persistence',
  'Source observation',
  'source_observation_code',
  'Source triage artifact',
  'External closure artifact',
  'Customer impact review',
  'Template default only; not an observed final severity.',
  'Template default only; not an observed handoff decision.',
  'Manual precondition',
  'Allowed handoff decisions',
  'Required external closure fields',
  'No closure preparation rows were produced.',
  'not evidence that there are no incidents to close',
  '/platform/tenant-communications',
  '/platform/support-cockpit',
  '/platform/commercial-launch-prevention-verification',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Incident Closure check failed: missing page anchor: ${anchor}`);
  }
}

for (const staleAnchor of [
  'CSSProperties',
  '<div style={styles.page}>',
  'const styles:',
  '<strong>Failed to load commercial launch incident closure.</strong>',
  'to="/platform/communications"',
  'to="/platform/support-operations-cockpit"',
  'accepted_handoff_decisions_recorded',
  'prevention_actions_recorded',
  'rollback_outcomes_recorded',
  'not_reviewed_closure_rows',
  'Accepted handoff decisions'
]) {
  if (page.includes(staleAnchor)) {
    throw new Error(`Platform Incident Closure check failed: stale page anchor remains: ${staleAnchor}`);
  }
}

for (const cssAnchor of [
  '.platform-incident-closure__hero-aside',
  '.platform-incident-closure__status-badge',
  '.platform-incident-closure__boundary-grid',
  '.platform-incident-closure__feedback--warning',
  '.platform-incident-closure__source-grid',
  '.platform-incident-closure__persistence-grid',
  '.platform-incident-closure__row-grid',
  '.platform-incident-closure__empty-state',
  '.platform-incident-closure__rules-grid',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'var(--io-primary-dark)'
]) {
  if (!css.includes(cssAnchor)) {
    throw new Error(`Platform Incident Closure check failed: missing CSS anchor: ${cssAnchor}`);
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

const routeIndex = router.indexOf("path: 'commercial-launch-incident-closure'");
if (routeIndex < 0) throw new Error('Platform Incident Closure check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 1900);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Incident Closure check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-incident-closure"');
if (navIndex < 0) throw new Error('Platform Incident Closure check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 2300), navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Incident Closure check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Incident Closure hardening checks passed.');
