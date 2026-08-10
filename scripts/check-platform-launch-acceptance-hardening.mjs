import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchAcceptancePacketPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Owner-signoff preparation only.',
  'source_posture',
  'evidence_scope',
  'Current certificate evidence',
  'Current upstream posture',
  'Static registry gate',
  'Context only',
  'acceptance_persistence',
  'Signatures and external approval tickets are not stored or observable',
  '/platform/support-cockpit',
  '/platform/monitoring-readiness',
  '/platform/commercial-launch-go-no-go-register',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'errorMessage(packet.error)',
  "normalized.includes('unavailable')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Launch Acceptance check failed: missing page anchor: ${anchor}`);
  }
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

for (const routePath of ['commercial-launch-acceptance-packet', 'commercial-launch-acceptance']) {
  const routeIndex = router.indexOf(`path: '${routePath}'`);
  if (routeIndex < 0) throw new Error(`Platform Launch Acceptance check failed: ${routePath} route missing.`);
  const routeWindow = router.slice(routeIndex, routeIndex + 1800);
  for (const permission of requiredPermissions) {
    if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
      throw new Error(`Platform Launch Acceptance check failed: ${routePath} route missing ${permission}.`);
    }
  }
}

if (!router.includes('LegacyPlatformLaunchAcceptanceRedirect')) {
  throw new Error('Platform Launch Acceptance check failed: compatibility redirect missing.');
}
if (!router.includes('/platform/commercial-launch-acceptance-packet${location.search}${location.hash}')) {
  throw new Error('Platform Launch Acceptance check failed: compatibility redirect must preserve query/hash state.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-acceptance-packet"');
if (navIndex < 0) throw new Error('Platform Launch Acceptance check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 1800), navIndex + 280);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Launch Acceptance check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Launch Acceptance hardening checks passed.');
