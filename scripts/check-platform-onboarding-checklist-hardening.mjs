import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformCustomerOnboardingChecklistPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "admin_user_count: 'Active admin count'",
  "value.includes('no_tenants')",
  "value.includes('review')",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'htmlFor="onboarding-tenant-filter"',
  'htmlFor="onboarding-tenant-limit"',
  'Tenant filter options could not be loaded.',
  'Unable to load onboarding checklist.',
  "checklist.error instanceof Error ? checklist.error.message",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Onboarding Checklist hardening check failed: missing ${anchor}`);
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
