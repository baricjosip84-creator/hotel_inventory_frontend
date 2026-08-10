import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformSupportOperationsCockpitPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "searchParams.get('tenant_id')",
  "queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')",
  "queryFn: () => platformApiRequest<SupportPackage>(`/platform/support-operations-cockpit?${query.toString()}`)",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'htmlFor="support-cockpit-tenant-filter"',
  'Tenant filter options could not be loaded:',
  'Unable to load support operations cockpit:',
  'readableError(cockpit.error)',
  'Operator precheck only.',
  'Customer context',
  'Last external touch:',
  'Unresolved follow-ups:',
  'Pending approvals:',
  'to={`/platform/incidents?tenant_id=${tenant.tenant_id}`}',
  "value.includes('no_tenants')",
  "value.includes('review')",
  "value.includes('blocked')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Support Cockpit check failed: missing ${anchor}`);
  }
}

const reviewIndex = page.indexOf("value.includes('review')");
const blockedIndex = page.indexOf("value.includes('blocked')");
if (reviewIndex < 0 || blockedIndex < 0 || reviewIndex > blockedIndex) {
  throw new Error('Platform Support Cockpit check failed: review states must be classified before blocked states.');
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
