import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchAdditionalGrowthAuthorizationPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchAdditionalGrowthAuthorizationPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalSectionHeader',
  'Authorization preparation only',
  'External authorization boundary',
  'cannot observe or persist the real expanded-cohort health acceptance',
  'Expansion-health persistence',
  'Additional-growth authorization persistence',
  'Source Expansion Health posture',
  'Source Expansion Health row references',
  'Preparation status only; not an observed external authorization decision.',
  'Required external authorization fields',
  'Authorization controls',
  'No additional-growth authorization rows were produced.',
  'This is not evidence that the expanded cohort is healthy',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Additional Growth Authorization snapshot.',
  'Retry refresh',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'authorization_records_persisted_in_application',
  "permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ",
  'hasPlatformPermission(link.permission)',
  '/platform/customer-success-admin',
  '/platform/production-monitoring-readiness'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Additional Growth Authorization check failed: missing page anchor: ${anchor}`);
  }
}

for (const staleAnchor of [
  'style={styles.',
  'const styles:',
  '<a key=',
  "'/platform/customer-success'",
  'Failed to load commercial launch additional growth authorization board.',
  'tenant_scope_limits_recorded',
  'expanded_health_acceptances_recorded',
  'support_capacity_acceptances_recorded',
  'customer_success_acceptances_recorded',
  'billing_entitlement_acceptances_recorded',
  'incident_risk_acceptances_recorded',
  'rollback_monitoring_reconfirmations_recorded',
  'executive_growth_approvals_recorded',
  'not_reviewed_authorization_rows'
]) {
  if (page.includes(staleAnchor)) {
    throw new Error(`Platform Additional Growth Authorization check failed: stale page anchor remains: ${staleAnchor}`);
  }
}

for (const anchor of [
  '.platform-additional-growth-authorization',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'var(--io-primary-dark)',
  '@media'
]) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Additional Growth Authorization check failed: missing CSS anchor: ${anchor}`);
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

const routeIndex = router.indexOf("path: 'commercial-launch-additional-growth-authorization'");
if (routeIndex < 0) throw new Error('Platform Additional Growth Authorization check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2200);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Additional Growth Authorization check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-additional-growth-authorization"');
if (navIndex < 0) throw new Error('Platform Additional Growth Authorization check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
if (navGuardStart < 0) throw new Error('Platform Additional Growth Authorization check failed: navigation permission guard missing.');
const navWindow = layout.slice(navGuardStart, navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Additional Growth Authorization check failed: navigation missing ${permission}.`);
  }
}

if (!packageJson.includes('check:platform-additional-growth-authorization-hardening')) {
  throw new Error('Platform Additional Growth Authorization check failed: package script missing.');
}
if (!packageJson.includes('npm run check:platform-additional-growth-authorization-hardening')) {
  throw new Error('Platform Additional Growth Authorization check failed: checker is not wired into check:ci.');
}

console.log('Platform Additional Growth Authorization hardening checks passed.');
