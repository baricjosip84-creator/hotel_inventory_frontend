import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformDashboardPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformDashboardPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'DashboardVisibility',
  'OperationalWorkspaceHero',
  'OperationalWorkspaceMetaPill',
  'OperationalWorkspaceStats',
  'OperationalWorkspaceStatus',
  'OperationalSectionHeader',
  'io-operational-page io-workspace-page platform-dashboard',
  'Platform operations workspace',
  'Platform-scoped',
  'Permission-aware',
  'Read-only operational summary',
  'Last refreshed:',
  "refetchOnWindowFocus: false",
  'Attention items',
  'Stale active / trial tenants',
  'No active, unexpired support sessions',
  'Open support sessions',
  'Open notifications',
  'Open billing',
  'ID {shortId(id)}',
  'const refreshError = q.isError && Boolean(data);',
  'const initialLoadError = q.isError && !data;',
  'Latest refresh failed.',
  'Showing the last successful dashboard snapshot',
  'disabled={q.isFetching}'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Dashboard hardening check failed: missing ${anchor}`);
  }
}

const requiredCssAnchors = [
  '.platform-dashboard__hero-aside',
  '.platform-dashboard__overview-grid',
  '.platform-dashboard__split-grid',
  '.platform-dashboard__metric-link',
  '@media (max-width: 760px)'
];

for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Dashboard hardening check failed: missing CSS anchor ${anchor}`);
  }
}

if (!router.includes("path: 'dashboard'")) {
  throw new Error('Platform Dashboard hardening check failed: dashboard route missing.');
}
if (!router.includes('PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ')) {
  throw new Error('Platform Dashboard hardening check failed: dashboard route permission missing.');
}
if (!layout.includes('<NavLink to="/platform/dashboard"')) {
  throw new Error('Platform Dashboard hardening check failed: dashboard navigation entry missing.');
}

console.log('Platform Dashboard page hardening check passed.');
