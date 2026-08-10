import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchCertificatePage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Internal precheck only.',
  'current postures from the real',
  'source_posture',
  'evidence_scope',
  'Static registry gate (context only)',
  'Launch readiness registry posture',
  'commercial-launch-acceptance-packet',
  '/platform/support-cockpit',
  '/platform/monitoring-readiness',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'Unable to load Launch Certificate.',
  'errorMessage(certificate.error)',
  "normalized.includes('unavailable')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Launch Certificate check failed: missing page anchor: ${anchor}`);
  }
}

if (page.includes('<span>Launch gate</span>')) {
  throw new Error('Platform Launch Certificate check failed: static registry gate must not be presented as the current evidence decision.');
}

const requiredPermissions = [
  'PLATFORM_DASHBOARD_READ',
  'TENANTS_READ',
  'PLATFORM_BILLING_READ',
  'PLATFORM_SLA_READ',
  'PLATFORM_INCIDENTS_READ',
  'SUPPORT_SESSION_READ',
  'SYSTEM_HEALTH_READ',
  'PLATFORM_DEPENDENCIES_READ',
  'TENANTS_EXPORT',
  'PLATFORM_RUNBOOKS_READ',
  'PLATFORM_SECURITY_READ'
];

const routeIndex = router.indexOf("path: 'commercial-launch-certificate'");
if (routeIndex < 0) throw new Error('Platform Launch Certificate check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 1600);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Launch Certificate check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-certificate"');
if (navIndex < 0) throw new Error('Platform Launch Certificate check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 1800), navIndex + 260);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Launch Certificate check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Launch Certificate hardening checks passed.');
