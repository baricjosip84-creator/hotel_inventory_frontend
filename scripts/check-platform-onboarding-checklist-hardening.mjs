import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCustomerOnboardingChecklistPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformCustomerOnboardingChecklistPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "import './PlatformCustomerOnboardingChecklistPage.css'",
  'io-operational-page io-workspace-page platform-onboarding-checklist',
  '<OperationalWorkspaceHero',
  '<OperationalWorkspaceStats ariaLabel="Customer onboarding key metrics">',
  '<OperationalSectionHeader',
  'Manual customer acceptance required',
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'const refreshError = checklist.isError && Boolean(data)',
  'const initialLoadError = checklist.isError && !data',
  'Showing the last successful onboarding snapshot from',
  'disabled={checklist.isFetching}',
  'htmlFor="onboarding-tenant-filter"',
  'htmlFor="onboarding-tenant-limit"',
  "setSearchParams(next, { replace: true })",
  'Selected tenant ({shortId(tenantId)})',
  'Tenant filter options could not be loaded.',
  'Unable to load onboarding checklist.',
  'Checklist items with evidence / total checklist items',
  'Open onboarding tasks'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Onboarding Checklist hardening check failed: missing ${anchor}`);
  }
}

const requiredCssAnchors = [
  '.platform-onboarding-checklist__filter-grid',
  '.platform-onboarding-checklist__evidence-grid',
  '.platform-onboarding-checklist__checklist-row',
  '.platform-onboarding-checklist__next-step',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'overflow-wrap: anywhere',
  '@media (max-width: 720px)'
];

for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Onboarding Checklist hardening check failed: CSS missing ${anchor}`);
  }
}

if (!router.includes("path: 'customer-onboarding-checklist'")) {
  throw new Error('Platform Onboarding Checklist hardening check failed: route missing.');
}
if (!router.includes('<PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}>')) {
  throw new Error('Platform Onboarding Checklist hardening check failed: tenant-read permission guard missing.');
}
if (!layout.includes('<NavLink to="/platform/customer-onboarding-checklist"')) {
  throw new Error('Platform Onboarding Checklist hardening check failed: navigation entry missing.');
}

console.log('Platform Onboarding Checklist page hardening check passed.');
