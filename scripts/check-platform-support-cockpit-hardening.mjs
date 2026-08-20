import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformSupportOperationsCockpitPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformSupportOperationsCockpitPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "import './PlatformSupportOperationsCockpitPage.css'",
  'io-operational-page io-workspace-page platform-support-cockpit',
  '<OperationalWorkspaceHero',
  '<OperationalWorkspaceStats ariaLabel="Support operations key metrics">',
  '<OperationalSectionHeader',
  'Operator precheck only',
  'No automatic support actions',
  "searchParams.get('tenant_id')",
  "queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')",
  '/platform/support-operations-cockpit${queryString ? `?${queryString}` : \'\'}',
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'const refreshError = cockpit.isError && Boolean(data)',
  'const initialLoadError = cockpit.isError && !data',
  'Showing the last successful support operations snapshot from',
  'disabled={cockpit.isFetching}',
  'htmlFor="support-cockpit-tenant-filter"',
  "setSearchParams(next, { replace: true })",
  'Selected tenant ({shortId(tenantId)})',
  'Tenant filter options could not be loaded.',
  'Unable to load support operations cockpit.',
  'Customer context',
  'tenant.evidence.unresolved_follow_ups',
  'Pending support approvals',
  'Control review',
  'Next support step',
  'to={`/platform/incidents?tenant_id=${tenant.tenant_id}`}'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Support Cockpit check failed: missing ${anchor}`);
  }
}

const requiredCssAnchors = [
  '.platform-support-cockpit__filter-grid',
  '.platform-support-cockpit__summary-grid',
  '.platform-support-cockpit__control-grid',
  '.platform-support-cockpit__evidence-grid',
  '.platform-support-cockpit__control-row',
  '.platform-support-cockpit__next-step',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'overflow-wrap: anywhere',
  '@media (max-width: 720px)'
];

for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Support Cockpit check failed: CSS missing ${anchor}`);
  }
}

const canonicalRouteIndex = router.indexOf("path: 'support-operations-cockpit'");
if (canonicalRouteIndex < 0) {
  throw new Error('Platform Support Cockpit check failed: canonical route missing.');
}
const canonicalRouteWindow = router.slice(canonicalRouteIndex, canonicalRouteIndex + 900);
for (const permission of [
  'PLATFORM_PERMISSIONS.TENANTS_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_SLA_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ',
  'PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ'
]) {
  if (!canonicalRouteWindow.includes(permission)) {
    throw new Error(`Platform Support Cockpit check failed: route permission missing ${permission}.`);
  }
}

if (!router.includes("path: 'support-cockpit'")) {
  throw new Error('Platform Support Cockpit check failed: legacy support-cockpit alias missing.');
}
if (!router.includes('LegacyPlatformSupportCockpitRedirect')) {
  throw new Error('Platform Support Cockpit check failed: legacy redirect helper missing.');
}
if (!router.includes('/platform/support-operations-cockpit${location.search}${location.hash}')) {
  throw new Error('Platform Support Cockpit check failed: legacy redirect must preserve query/hash context.');
}

const navIndex = layout.indexOf('<NavLink to="/platform/support-operations-cockpit"');
if (navIndex < 0) {
  throw new Error('Platform Support Cockpit check failed: navigation entry missing.');
}
const navWindow = layout.slice(Math.max(0, navIndex - 700), navIndex + 250);
for (const permission of [
  'PLATFORM_PERMISSIONS.TENANTS_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_SLA_READ',
  'PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ',
  'PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ'
]) {
  if (!navWindow.includes(`hasPlatformPermission(${permission})`)) {
    throw new Error(`Platform Support Cockpit check failed: navigation permission missing ${permission}.`);
  }
}

console.log('Platform Support Cockpit hardening checks passed.');
