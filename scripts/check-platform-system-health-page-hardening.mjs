import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const requireToken = (source, token, label) => { if (!source.includes(token)) throw new Error(`${label} missing: ${token}`); };

const page = read('src/pages/PlatformSystemHealthPage.tsx');
const css = read('src/pages/PlatformSystemHealthPage.css');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');
const monitoring = read('src/pages/PlatformProductionMonitoringReadinessPage.tsx');
const deployment = read('src/pages/PlatformDeploymentValidationPage.tsx');
const pkg = JSON.parse(read('package.json'));

for (const token of [
  'OperationalWorkspaceHero', 'OperationalWorkspaceStats', 'OperationalSectionHeader',
  'SYSTEM_HEALTH_READ + TENANTS_READ', 'Derived application evidence', 'Read only',
  'Showing the last successful System Health snapshot.', 'Showing the last successful diagnostics snapshot.',
  'healthy_does_not_prove_external_infrastructure_or_customer_visible_uptime',
  'derived SYSTEM_HEALTH_DEGRADED_BLOCKING alert is deliberately excluded',
  'PAGE_SIZE = 50', 'limit', 'offset', 'Previous', 'Next', 'search', 'status', 'include_archived',
  'placeholderData: (previous) => previous', 'refetchOnWindowFocus: false',
  'DIAGNOSTICS_READ', 'Restricted', 'supporting link(s) hidden by permission',
  'No System Health rows match the current server filters.', 'Evidence boundary'
]) requireToken(page, token, 'System Health page hardening');

for (const stale of ['style={styles.', 'const styles: Record<string, CSSProperties>', 'platformApiRequest<SystemHealthResponse>(\'/platform/system-health\')']) {
  if (page.includes(stale)) throw new Error(`System Health legacy page pattern remains: ${stale}`);
}
requireToken(page, "import './PlatformSystemHealthPage.css';", 'System Health page CSS import');
requireToken(css, '--io-primary:#d14343', 'System Health Platform red identity');
requireToken(css, '--io-primary-dark:#b93636', 'System Health Platform red identity');
requireToken(css, '@media(max-width:640px)', 'System Health mobile responsive rule');

const routeStart = router.indexOf("path: 'system-health'");
const routeSlice = router.slice(routeStart, routeStart + 420);
if (routeStart < 0 || !routeSlice.includes('SYSTEM_HEALTH_READ') || !routeSlice.includes('TENANTS_READ')) {
  throw new Error('System Health router must require SYSTEM_HEALTH_READ + TENANTS_READ.');
}
const navStart = layout.indexOf('to="/platform/system-health"');
const navSlice = layout.slice(Math.max(0, navStart - 280), navStart + 240);
if (navStart < 0 || !navSlice.includes('SYSTEM_HEALTH_READ') || !navSlice.includes('TENANTS_READ')) {
  throw new Error('System Health sidebar visibility must require SYSTEM_HEALTH_READ + TENANTS_READ.');
}

const monitoringRouteStart = router.indexOf("path: 'production-monitoring-readiness'");
const monitoringRouteSlice = router.slice(monitoringRouteStart, monitoringRouteStart + 500);
for (const permission of ['SYSTEM_HEALTH_READ', 'TENANTS_READ', 'PLATFORM_INCIDENTS_READ', 'PLATFORM_DEPENDENCIES_READ']) {
  requireToken(monitoringRouteSlice, permission, 'Production Monitoring downstream route permission');
}
const monitoringNavStart = layout.indexOf('to="/platform/production-monitoring-readiness"');
const monitoringNavSlice = layout.slice(Math.max(0, monitoringNavStart - 360), monitoringNavStart + 240);
requireToken(monitoringNavSlice, 'TENANTS_READ', 'Production Monitoring downstream sidebar permission');
requireToken(monitoring, "platformApiRequest<TenantDirectoryRow[]>('/platform/tenants')", 'Production Monitoring tenant directory decoupling');
if (monitoring.includes("platformApiRequest<SystemHealthPackage>('/platform/system-health')")) {
  throw new Error('Production Monitoring must not use paginated System Health registry as its tenant directory.');
}

const systemHealthSupportStart = deployment.indexOf("label: 'System health'");
const systemHealthSupportSlice = deployment.slice(systemHealthSupportStart, systemHealthSupportStart + 320);
requireToken(systemHealthSupportSlice, 'SYSTEM_HEALTH_READ', 'Deployment Validation System Health support link');
requireToken(systemHealthSupportSlice, 'TENANTS_READ', 'Deployment Validation System Health support link');

if (!pkg.scripts?.['check:platform-system-health-page-hardening']) throw new Error('System Health checker script missing from package.json.');
if (!pkg.scripts?.['check:ci']?.includes('check:platform-system-health-page-hardening')) throw new Error('System Health checker is not wired into check:ci.');

console.log('Platform System Health page hardening check: PASS');
