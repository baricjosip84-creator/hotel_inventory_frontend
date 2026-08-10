import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchGoNoGoRegisterPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Decision-preparation only.',
  'Current acceptance packet',
  'Current certificate evidence',
  'Current upstream posture',
  'Evidence scope',
  'Static registry gate',
  'Context only',
  'decision_persistence',
  'This page cannot observe external decisions',
  'No-go extra fields',
  'no_go_extra_fields',
  '/platform/support-cockpit',
  '/platform/monitoring-readiness',
  '/platform/commercial-launch-smoke-test-checklist',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'errorMessage(register.error)',
  "normalized.includes('review')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Launch Go/No-Go check failed: missing page anchor: ${anchor}`);
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

const routeIndex = router.indexOf("path: 'commercial-launch-go-no-go-register'");
if (routeIndex < 0) throw new Error('Platform Launch Go/No-Go check failed: route missing.');
const routeWindow = router.slice(routeIndex, routeIndex + 1700);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Launch Go/No-Go check failed: route missing ${permission}.`);
  }
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-go-no-go-register"');
if (navIndex < 0) throw new Error('Platform Launch Go/No-Go check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 1900), navIndex + 280);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Launch Go/No-Go check failed: navigation missing ${permission}.`);
  }
}

console.log('Platform Launch Go/No-Go hardening checks passed.');
