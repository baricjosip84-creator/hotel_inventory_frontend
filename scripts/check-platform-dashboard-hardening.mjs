import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformDashboardPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'DashboardVisibility',
  'Last refreshed:',
  "refetchOnWindowFocus: false",
  'Attention signals',
  'Stale active / trial tenants',
  'No active, unexpired support sessions',
  'nonStretchGrid',
  'Open support sessions',
  'Open notifications',
  'Open billing',
  'ID {shortId(id)}'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Dashboard hardening check failed: missing ${anchor}`);
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
