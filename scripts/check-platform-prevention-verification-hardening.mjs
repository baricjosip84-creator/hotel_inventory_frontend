import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchPreventionVerificationPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Prevention preparation only.',
  'External confirmation boundary.',
  'does not observe external incident-closure',
  'Incident-closure persistence',
  'Prevention-verification persistence',
  'Manual precondition',
  'Source closure artifact',
  'External prevention artifact',
  'Allowed rollout-expansion decisions',
  'Required external prevention fields',
  'incident_closure_persistence',
  'prevention_persistence',
  'source_closure_artifact',
  'prevention_artifact',
  'manual_precondition',
  '/platform/tenant-communications',
  '/platform/support-cockpit',
  '/platform/commercial-launch-rollout-expansion-authorization',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'errorMessage(prevention.error)',
  "normalized.includes('external')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Prevention Verification check failed: missing page anchor: ${anchor}`);
  }
}

for (const staleAnchor of [
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
