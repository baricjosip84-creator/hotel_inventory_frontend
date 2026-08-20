import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformBillingSubscriptionActivationPage.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/pages/PlatformBillingSubscriptionActivationPage.css'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "import './PlatformBillingSubscriptionActivationPage.css'",
  'io-operational-page io-workspace-page platform-billing-activation',
  '<OperationalWorkspaceHero',
  '<OperationalWorkspaceStats ariaLabel="Billing subscription activation key metrics">',
  '<OperationalSectionHeader',
  'Manual commercial acceptance required',
  "queryFn: () => platformApiRequest<BillingTenantOption[]>('/platform/billing')",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'const refreshError = activation.isError && Boolean(data)',
  'const initialLoadError = activation.isError && !data',
  'Showing the last successful billing activation snapshot from',
  'disabled={activation.isFetching}',
  'htmlFor="billing-activation-tenant-filter"',
  "setSearchParams(next, { replace: true })",
  'Selected tenant ({shortId(tenantId)})',
  'Billing tenant filter options could not be loaded.',
  'Unable to load billing subscription activation gate.',
  'Controls with evidence / total controls in scope.',
  "paid_launch_ready: 'Technical precheck ready'",
  "billing_subscription_activation_ready: 'Technical activation evidence ready'",
  "tenant_status: 'Tenant lifecycle status'",
  "billing_policy_reference: 'Overdue policy reference'",
  'Payment provider webhooks',
  'Review provider readiness in Billing',
  'Manual commercial-owner acceptance is still required.',
  'launchAcceptancePermissions.every((permission) => hasPlatformPermission(permission))',
  'hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)',
  'Open billing',
  'Open subscription readiness',
  'Open license enforcement',
  'Open launch acceptance',
  'Open tenants'
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Billing Activation check failed: missing ${anchor}`);
  }
}

const requiredCssAnchors = [
  '.platform-billing-activation__filter-grid',
  '.platform-billing-activation__summary-grid',
  '.platform-billing-activation__upstream-grid',
  '.platform-billing-activation__evidence-grid',
  '.platform-billing-activation__control-row',
  '.platform-billing-activation__next-step',
  'var(--io-primary-border)',
  'var(--io-primary-soft)',
  'overflow-wrap: anywhere',
  '@media (max-width: 720px)'
];

for (const anchor of requiredCssAnchors) {
  if (!css.includes(anchor)) {
    throw new Error(`Platform Billing Activation check failed: CSS missing ${anchor}`);
  }
}

if (!router.includes("path: 'billing-subscription-activation'")) {
  throw new Error('Platform Billing Activation check failed: route missing.');
}
if (!router.includes('<PlatformProtectedRoute requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ]}>')) {
  throw new Error('Platform Billing Activation check failed: billing-read permission guard missing.');
}
if (!layout.includes('<NavLink to="/platform/billing-subscription-activation"')) {
  throw new Error('Platform Billing Activation check failed: navigation entry missing.');
}
if (!layout.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)')) {
  throw new Error('Platform Billing Activation check failed: navigation permission check missing.');
}

console.log('Platform Billing Activation hardening checks passed.');
