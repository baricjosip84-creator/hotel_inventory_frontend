import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchGoNoGoRegisterPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchGoNoGoRegisterPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const requiredPageAnchors = [
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatCard',
  'OperationalSectionHeader',
  "import './PlatformCommercialLaunchGoNoGoRegisterPage.css'",
  'Decision-preparation only.',
  'Current acceptance packet',
  'Current certificate evidence',
  'Current upstream posture',
  'Current source evidence summary',
  'source_summary',
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
  'PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ',
  'canOpenSmokeTest',
  'refetchOnWindowFocus: false',
  'staleTime: 30_000',
  'const initialLoadError = register.isError && !data',
  'const refreshError = register.isError && Boolean(data)',
  'Showing the last successful Commercial Launch Go/No-Go Register snapshot.',
  'disabled={register.isFetching}',
  'No go/no-go decision rows are available.'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Launch Go/No-Go check failed: missing page anchor: ${anchor}`);
  }
}

if (page.includes('style={styles.') || page.includes('const styles:')) {
  throw new Error('Platform Launch Go/No-Go check failed: legacy inline-style shell remains.');
}

for (const anchor of [
  '.platform-launch-go-no-go__hero-aside',
  '.platform-launch-go-no-go__boundary-grid',
  '.platform-launch-go-no-go__row-grid',
  '.platform-launch-go-no-go__source-summary',
  '.platform-launch-go-no-go__feedback--warning',
  'var(--io-primary-soft)',
  'overflow-wrap: anywhere',
  '@media (max-width: 640px)'
]) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Launch Go/No-Go check failed: missing CSS anchor: ${anchor}`);
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
const routeWindow = router.slice(routeIndex, routeIndex + 1900);
for (const permission of requiredPermissions) {
  if (!routeWindow.includes(`PLATFORM_PERMISSIONS.${permission}`)) {
    throw new Error(`Platform Launch Go/No-Go check failed: route missing ${permission}.`);
  }
}

const smokeRouteIndex = router.indexOf("path: 'commercial-launch-smoke-test-checklist'");
if (smokeRouteIndex < 0 || !router.slice(smokeRouteIndex, smokeRouteIndex + 1000).includes('PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ')) {
  throw new Error('Platform Launch Go/No-Go check failed: smoke-test route no longer proves the extra Platform Sessions read requirement.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/commercial-launch-go-no-go-register"');
if (navIndex < 0) throw new Error('Platform Launch Go/No-Go check failed: navigation entry missing.');
const navWindow = layout.slice(Math.max(0, navIndex - 1900), navIndex + 280);
for (const permission of requiredPermissions) {
  if (!navWindow.includes(`hasPlatformPermission(PLATFORM_PERMISSIONS.${permission})`)) {
    throw new Error(`Platform Launch Go/No-Go check failed: navigation missing ${permission}.`);
  }
}

if (!String(packageJson.scripts?.['check:ci'] || '').includes('npm run check:platform-launch-go-no-go-hardening')) {
  throw new Error('Platform Launch Go/No-Go check failed: dedicated hardening check is not wired into check:ci.');
}

console.log('Platform Launch Go/No-Go hardening checks passed.');
