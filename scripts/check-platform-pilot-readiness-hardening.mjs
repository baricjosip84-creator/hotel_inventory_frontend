import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformPilotCustomerReadinessPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Operator precheck only.',
  'does not persist a dedicated pilot entity',
  'evidence_model',
  'pilot_owner_evidence',
  'tenant_status_launchable',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'Unable to load pilot customer readiness:',
  'Unable to load tenant filter:',
  'readableError(pilot.error)',
  'readableError(tenants.error)',
  '/platform/tenant-tasks?tenant_id=',
  '&search=pilot',
  '/platform/support-cockpit?tenant_id=',
  '/platform/monitoring-readiness?tenant_id=',
  "normalized.includes('confirmation')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Pilot Readiness check failed: missing page anchor: ${anchor}`);
  }
}

if (page.includes('category=pilot')) {
  throw new Error('Platform Pilot Readiness check failed: pilot is not a supported task/note category and must not be linked as one.');
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

console.log('Platform Pilot Readiness hardening checks passed.');
