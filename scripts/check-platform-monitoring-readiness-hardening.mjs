import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformProductionMonitoringReadinessPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformProductionMonitoringReadinessPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "const tenantId = searchParams.get('tenant_id') || ''",
  "platformApiRequest<SystemHealthPackage>('/platform/system-health')",
  "platformApiRequest<MonitoringPackage>(`/platform/production-monitoring-readiness${queryString ? `?${queryString}` : ''}`)",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalSectionHeader',
  "import './PlatformProductionMonitoringReadinessPage.css'",
  'htmlFor="monitoring-readiness-tenant-filter"',
  'Tenant filter options could not be loaded:',
  'The current URL scope is preserved.',
  'Selected tenant (',
  "setSearchParams(nextParams, { replace: true })",
  'Unable to load production monitoring readiness:',
  'Refresh failed — showing the last successful monitoring snapshot.',
  'const refreshError = monitoring.isError && Boolean(data)',
  'const initialLoadError = monitoring.isError && !data',
  'disabled={tenantOptions.isFetching || monitoring.isFetching}',
  'Operator precheck only.',
  'Customer-impacting:',
  'Missing public updates:',
  'Critical unhealthy:',
  'Integration blockers:',
  'Integration review required:',
  'tenant.controls.map((control)',
  'tenant.missing_control_codes.join',
  'No incident or monitoring mutations'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Monitoring Readiness check failed: missing ${anchor}`);
  }
}

const requiredCssAnchors = [
  '.platform-monitoring-readiness__status-badge[data-tone=',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'var(--io-primary-dark)',
  'overflow-wrap: anywhere',
  'flex-wrap: wrap',
  '@media (max-width: 860px)',
  '@media (max-width: 620px)'
];
for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Monitoring Readiness check failed: stylesheet missing ${anchor}`);
  }
}

if (page.includes('useState(')) {
  throw new Error('Platform Monitoring Readiness check failed: tenant filter must derive from URL search params instead of parallel local state.');
}
if (page.includes('const styles: Record<string, CSSProperties>')) {
  throw new Error('Platform Monitoring Readiness check failed: legacy inline-style shell is still present.');
}
if (page.includes("platformApiRequest<Tenant[]>('/platform/tenants')")) {
  throw new Error('Platform Monitoring Readiness check failed: tenant filter must not depend on TENANTS_READ.');
}

const canonicalRouteIndex = router.indexOf("path: 'production-monitoring-readiness'");
if (canonicalRouteIndex < 0) throw new Error('Platform Monitoring Readiness check failed: canonical route missing.');
const canonicalRouteWindow = router.slice(canonicalRouteIndex, canonicalRouteIndex + 900);
for (const permission of [
  'PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ'
]) {
  if (!canonicalRouteWindow.includes(permission)) {
    throw new Error(`Platform Monitoring Readiness check failed: route permission missing ${permission}.`);
  }
}

if (!router.includes("path: 'monitoring-readiness'")) {
  throw new Error('Platform Monitoring Readiness check failed: monitoring-readiness compatibility route missing.');
}
if (!router.includes('LegacyPlatformMonitoringReadinessRedirect')) {
  throw new Error('Platform Monitoring Readiness check failed: compatibility redirect helper missing.');
}
if (!router.includes('/platform/production-monitoring-readiness${location.search}${location.hash}')) {
  throw new Error('Platform Monitoring Readiness check failed: compatibility redirect must preserve query/hash context.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/production-monitoring-readiness"');
if (navIndex < 0) throw new Error('Platform Monitoring Readiness check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 650), navIndex + 250);
for (const permission of [
  'PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ'
]) {
  if (!navWindow.includes(`hasPlatformPermission(${permission})`)) {
    throw new Error(`Platform Monitoring Readiness check failed: navigation permission missing ${permission}.`);
  }
}

console.log('Platform Monitoring Readiness hardening checks passed.');
