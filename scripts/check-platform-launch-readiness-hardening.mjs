import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchReadinessPage.tsx'), 'utf8');
const pageCss = fs.readFileSync(path.join(root, 'src/pages/PlatformCommercialLaunchReadinessPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  'Core launch readiness',
  'Post-launch evidence controls',
  "manual_evidence_required",
  "manual_certificate_review_required",
  "core_launch_areas_total",
  "post_launch_controls_total",
  'Review-ready gates',
  'Review gate',
  'refetchOnWindowFocus: false',
  'staleTime: 5 * 60 * 1000',
  'Last refreshed',
  'Evidence surfaces (',
  'Required controls (',
  'Manual evidence required” is intentionally not treated as a completed green state.',
  'OperationalWorkspaceHero',
  'OperationalWorkspaceStats',
  'io-operational-page io-workspace-page platform-launch-readiness',
  'const initialLoadError = readinessQuery.isError && !data;',
  'const refreshError = readinessQuery.isError && Boolean(data);',
  'Showing the last successful readiness package from',
  'disabled={readinessQuery.isFetching}'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Launch Readiness hardening check failed: missing ${anchor}`);
  }
}


const requiredCssAnchors = [
  '.platform-launch-readiness__area-grid',
  'overflow-wrap: anywhere',
  'grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))',
  '@media (max-width: 720px)'
];

for (const anchor of requiredCssAnchors) {
  if (!pageCss.includes(anchor)) {
    throw new Error(`Platform Launch Readiness hardening check failed: missing CSS contract ${anchor}`);
  }
}

if (!router.includes("path: 'commercial-launch-readiness'")) {
  throw new Error('Platform Launch Readiness hardening check failed: route missing.');
}
if (!router.includes('PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ')) {
  throw new Error('Platform Launch Readiness hardening check failed: route permission missing.');
}
if (!layout.includes('<NavLink to="/platform/commercial-launch-readiness"')) {
  throw new Error('Platform Launch Readiness hardening check failed: navigation entry missing.');
}

console.log('Platform Launch Readiness page hardening check passed.');
