import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchCertificatePage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchCertificatePage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'io-operational-page io-workspace-page platform-launch-certificate',
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  'Internal precheck only',
  'Manual owner acceptance required',
  'source_posture',
  'evidence_scope',
  'Static registry gate (context only)',
  'launch_readiness_registry_note',
  'commercial-launch-acceptance-packet',
  '/platform/support-cockpit',
  '/platform/monitoring-readiness',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'initialLoadError',
  'refreshError',
  'Showing the last successful Commercial Launch Certificate snapshot.',
  'disabled={certificate.isFetching}',
  'readableError(certificate.error)',
  "import './PlatformCommercialLaunchCertificatePage.css'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Launch Certificate check failed: missing page anchor: ${anchor}`);
  }
}

if (page.includes('const styles: Record<string, CSSProperties>')) {
  throw new Error('Platform Launch Certificate check failed: legacy inline-style shell was reintroduced.');
}
if (page.includes('<span>Launch gate</span>')) {
  throw new Error('Platform Launch Certificate check failed: static registry gate must not be presented as the current evidence decision.');
}
if (!page.includes('certificate.isError && !data') || !page.includes('certificate.isError && Boolean(data)')) {
  throw new Error('Platform Launch Certificate check failed: initial-load and background-refresh errors are not separated.');
}

for (const anchor of [
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'var(--io-primary-dark)',
  "[data-tone='good']",
  "[data-tone='warn']",
  "[data-tone='danger']",
  '@media (max-width: 760px)'
]) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Launch Certificate check failed: missing CSS/design anchor: ${anchor}`);
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
