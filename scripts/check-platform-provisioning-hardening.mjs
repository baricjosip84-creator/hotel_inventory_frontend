import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformTenantProvisioningHardeningPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "admin_user_count: 'Active admin count'",
  "latest_provisioning_preset_key: 'Latest provisioning preset'",
  "onboarding_task_count: 'Non-cancelled onboarding tasks'",
  "value.includes('no_tenants')",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'htmlFor="provisioning-hardening-tenant-filter"',
  'htmlFor="provisioning-hardening-tenant-limit"',
  'Tenant filter options could not be loaded.',
  'Unable to load provisioning hardening board.',
  "hardening.error instanceof Error ? hardening.error.message",
  'explicit provisioning audit evidence',
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Provisioning Hardening check failed: missing ${anchor}`);
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
