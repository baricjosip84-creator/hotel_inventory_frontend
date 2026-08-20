import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantProvisioningHardeningPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantProvisioningHardeningPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "import './PlatformTenantProvisioningHardeningPage.css'",
  'io-operational-page io-workspace-page platform-provisioning-hardening',
  '<OperationalWorkspaceHero',
  '<OperationalWorkspaceStats ariaLabel="Tenant provisioning hardening key metrics">',
  '<OperationalSectionHeader',
  'Pre-onboarding gate',
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'const allowedLimits = new Set',
  'const refreshError = hardening.isError && Boolean(data)',
  'const initialLoadError = hardening.isError && !data',
  'Showing the last successful provisioning snapshot from',
  'disabled={hardening.isFetching}',
  'htmlFor="provisioning-hardening-tenant-filter"',
  'htmlFor="provisioning-hardening-tenant-limit"',
  "setSearchParams(next, { replace: true })",
  'Selected tenant ({shortId(tenantId)})',
  'Tenant filter options could not be loaded.',
  'Unable to load provisioning hardening board.',
  'Controls with evidence / total controls in scope',
  'Similar tenant fields alone are not treated as proof that a preset was applied.',
  'hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ)',
  'Open provisioning',
  'Open onboarding tasks',
  'Open platform audit'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Provisioning Hardening check failed: missing ${anchor}`);
  }
}

const requiredCssAnchors = [
  '.platform-provisioning-hardening__filter-grid',
  '.platform-provisioning-hardening__preset-grid',
  '.platform-provisioning-hardening__evidence-grid',
  '.platform-provisioning-hardening__control-row',
  '.platform-provisioning-hardening__next-step',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'overflow-wrap: anywhere',
  '@media (max-width: 720px)'
];

for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Provisioning Hardening check failed: CSS missing ${anchor}`);
  }
}

if (!router.includes("path: 'tenant-provisioning-hardening'")) {
  throw new Error('Platform Provisioning Hardening check failed: route missing.');
}
if (!router.includes('<PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>')) {
  throw new Error('Platform Provisioning Hardening check failed: tenant-read permission guard missing.');
}
if (!layout.includes('<NavLink to="/platform/tenant-provisioning-hardening"')) {
  throw new Error('Platform Provisioning Hardening check failed: navigation entry missing.');
}

console.log('Platform Provisioning Hardening page hardening check passed.');
