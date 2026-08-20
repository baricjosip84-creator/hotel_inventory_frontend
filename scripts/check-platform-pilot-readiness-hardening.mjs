import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformPilotCustomerReadinessPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformPilotCustomerReadinessPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const requiredPageAnchors = [
  "platformApiRequest<PilotCustomerReadinessPackage>(`/platform/pilot-customer-readiness?${query.toString()}`)",
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  "import './PlatformPilotCustomerReadinessPage.css'",
  'Operator precheck only',
  'does not persist a dedicated pilot entity',
  'evidence_model',
  'pilot_owner_evidence',
  'tenant_status_launchable',
  'initialLoadError',
  'refreshError',
  'Showing the last successful pilot-readiness snapshot',
  'disabled={pilot.isFetching}',
  'Selected tenant (',
  "const tenantId = searchParams.get('tenant_id') || ''",
  "const requestedLimit = searchParams.get('limit') || '100'",
  '/platform/tenant-tasks?tenant_id=',
  '/platform/tenant-notes?tenant_id=',
  '&search=pilot',
  '/platform/incidents?tenant_id=',
  '/platform/customer-onboarding-checklist?tenant_id=',
  '/platform/support-operations-cockpit?tenant_id=',
  '/platform/production-monitoring-readiness?tenant_id=',
  'PLATFORM_PERMISSIONS.PLATFORM_SLA_READ',
  'PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ',
  'PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ',
  'Manual pilot acceptance required',
  'does not create a pilot, certify pilot success or approve expansion'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Pilot Readiness check failed: missing page anchor: ${anchor}`);
  }
}

if (page.includes('useState(')) {
  throw new Error('Platform Pilot Readiness check failed: URL-backed pilot scope must not be duplicated in local state.');
}

if (page.includes('category=pilot')) {
  throw new Error('Platform Pilot Readiness check failed: pilot is not a supported task/note category and must not be linked as one.');
}

if (page.includes('style={styles.') || page.includes('const styles:')) {
  throw new Error('Platform Pilot Readiness check failed: legacy inline-style page shell must not remain.');
}

const requiredCssAnchors = [
  '.platform-pilot-readiness__hero-aside',
  '.platform-pilot-readiness__status-badge',
  '.platform-pilot-readiness__boundary-copy',
  '.platform-pilot-readiness__filter-grid',
  '.platform-pilot-readiness__feedback--warning',
  '.platform-pilot-readiness__program-grid',
  '.platform-pilot-readiness__control-grid',
  '.platform-pilot-readiness__evidence-grid',
  '.platform-pilot-readiness__two-column',
  'var(--io-primary-dark)',
  'overflow-wrap: anywhere',
  '@media (max-width: 760px)',
  '@media (max-width: 620px)'
];

for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Pilot Readiness check failed: missing responsive/workspace CSS anchor: ${anchor}`);
  }
}

const routeIndex = router.indexOf("path: 'pilot-customer-readiness'");
if (routeIndex < 0) throw new Error('Platform Pilot Readiness check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 600);
if (!routeWindow.includes('PLATFORM_PERMISSIONS.TENANTS_READ') || !routeWindow.includes('PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ')) {
  throw new Error('Platform Pilot Readiness check failed: route must require TENANTS_READ and PLATFORM_INCIDENTS_READ.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/pilot-customer-readiness"');
if (navIndex < 0) throw new Error('Platform Pilot Readiness check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 420), navIndex + 240);
if (!navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)')
  || !navWindow.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)')) {
  throw new Error('Platform Pilot Readiness check failed: navigation permission must match route permission.');
}

if (!String(packageJson.scripts?.['check:ci'] || '').includes('check:platform-pilot-readiness-hardening')) {
  throw new Error('Platform Pilot Readiness check failed: dedicated hardening checker must be part of check:ci.');
}

console.log('Platform Pilot Readiness hardening checks passed.');
