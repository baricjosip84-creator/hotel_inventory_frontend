import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchIncidentTriagePage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchIncidentTriagePage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  "import './PlatformCommercialLaunchIncidentTriagePage.css'",
  'Triage preparation only',
  'External confirmation boundary',
  'cannot confirm that external Go/No-Go decisions',
  'Post-launch observation persistence',
  'Incident-triage persistence',
  'Manual precondition',
  'Source observation artifact',
  'External triage artifact',
  'Required external triage fields',
  'Customer impact review',
  'customer_impact_review_required',
  'Template default only; not an observed severity.',
  'No triage preparation rows were produced.',
  'not evidence that the launch is incident-free',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Incident Triage snapshot.',
  "disabled={triage.isFetching}",
  'post_launch_observation_persistence',
  'triage_persistence',
  'source_observation_artifact',
  'triage_artifact',
  'manual_precondition',
  '/platform/tenant-communications',
  '/platform/support-cockpit',
  '/platform/commercial-launch-incident-closure',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'readableError(triage.error)'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Incident Triage check failed: missing page anchor: ${anchor}`);
  }
}

for (const requiredCssAnchor of [
  '.platform-incident-triage',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'var(--io-primary-dark)',
  'overflow-wrap: anywhere',
  '@media (max-width: 640px)'
]) {
  if (!css.includes(requiredCssAnchor)) {
    throw new Error(`Platform Incident Triage check failed: missing CSS anchor: ${requiredCssAnchor}`);
  }
}

for (const staleAnchor of [
  "const styles: Record<string, CSSProperties>",
  "type CSSProperties",
  'style={styles.',
  'to="/platform/communications"',
  'severity_assigned',
  'customer_impact_reviews_recorded',
  'rollback_decisions_recorded',
  'not_reviewed_triage_rows',
  'Failed to load commercial launch incident triage.'
]) {
  if (page.includes(staleAnchor)) {
    throw new Error(`Platform Incident Triage check failed: stale page anchor remains: ${staleAnchor}`);
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

const routeIndex = router.indexOf("path: 'commercial-launch-incident-triage'");
if (routeIndex < 0) throw new Error('Platform Incident Triage check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 1900);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Incident Triage check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-incident-triage"');
if (navIndex < 0) throw new Error('Platform Incident Triage check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 2300), navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Incident Triage check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Incident Triage hardening checks passed.');
