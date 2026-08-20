import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchAdditionalGrowthObservationPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchAdditionalGrowthObservationPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = fs.readFileSync(path.join(root, 'package.json'), 'utf8');

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalSectionHeader',
  'Observation preparation only',
  'External observation boundary',
  'cannot observe or persist the real Additional Growth Authorization decision',
  'Expansion-health persistence',
  'Additional-growth authorization persistence',
  'Additional-growth observation persistence',
  'Source Additional Growth Authorization posture',
  'Source Additional Growth Authorization row references',
  'Preparation status only; not an observed external post-growth outcome.',
  'Required external observation evidence',
  'Observation controls',
  'No additional-growth observation rows were produced.',
  'This is not evidence that additional growth was authorized',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Additional Growth Observation snapshot.',
  'Retry refresh',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'observation_records_persisted_in_application',
  'permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ',
  'hasPlatformPermission(link.permission)',
  '/platform/customer-success-admin',
  '/platform/production-monitoring-readiness'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) throw new Error(`Platform Additional Growth Observation check failed: missing page anchor: ${anchor}`);
}

for (const staleAnchor of ['style={styles.', 'const styles:', '<a key=', "'/platform/customer-success'", "'/platform/monitoring-readiness'"]) {
  if (page.includes(staleAnchor)) throw new Error(`Platform Additional Growth Observation check failed: stale page pattern remains: ${staleAnchor}`);
}

if (!css.includes('--io-primary: #d14343') || !css.includes('--io-primary-dark: #b93636')) {
  throw new Error('Platform Additional Growth Observation check failed: Platform red theme variables missing.');
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

const routeIndex = router.indexOf("path: 'commercial-launch-additional-growth-observation'");
if (routeIndex < 0) throw new Error('Platform Additional Growth Observation check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 2200);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) throw new Error(`Platform Additional Growth Observation check failed: route missing ${permission}.`);
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-additional-growth-observation"');
if (navIndex < 0) throw new Error('Platform Additional Growth Observation check failed: navigation entry missing.');
const navGuardStart = layout.lastIndexOf('{hasPlatformPermission(', navIndex);
if (navGuardStart < 0) throw new Error('Platform Additional Growth Observation check failed: navigation permission guard missing.');
const navWindow = layout.slice(navGuardStart, navIndex + 300);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) throw new Error(`Platform Additional Growth Observation check failed: navigation missing ${permission}.`);
}

if (!packageJson.includes('check:platform-additional-growth-observation-hardening')) {
  throw new Error('Platform Additional Growth Observation check failed: package script missing.');
}
if (!packageJson.includes('npm run check:platform-additional-growth-observation-hardening')) {
  throw new Error('Platform Additional Growth Observation check failed: checker is not wired into check:ci.');
}

console.log('Platform Additional Growth Observation hardening checks passed.');
