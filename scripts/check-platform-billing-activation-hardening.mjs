import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const page = fs.readFileSync(path.join(root, 'src/pages/PlatformBillingSubscriptionActivationPage.tsx'), 'utf8');
const router = fs.readFileSync(path.join(root, 'src/app/router.tsx'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/layouts/PlatformLayout.tsx'), 'utf8');

const requiredPageAnchors = [
  "queryFn: () => platformApiRequest<BillingTenantOption[]>('/platform/billing')",
  "searchParams.get('tenant_id')",
  'refetchOnWindowFocus: false',
  'staleTime: 60_000',
  'htmlFor="billing-activation-tenant-filter"',
  'Billing tenant filter options could not be loaded.',
  'Unable to load billing subscription activation gate.',
  'activation.error instanceof Error ? activation.error.message',
  "paid_launch_ready: 'Technical precheck ready'",
  "billing_subscription_activation_ready: 'Technical activation evidence ready'",
  "tenant_status: 'Tenant lifecycle status'",
  "billing_policy_reference: 'Overdue policy reference'",
  "provider_webhook_review_required: 'Provider webhook review required'",
  'Payment provider webhooks',
  'Review provider readiness in Billing',
  'Manual commercial-owner acceptance is still required.',
  'to="/platform/commercial-launch-acceptance-packet"',
  "value.includes('not_required')",
  "value.includes('no_tenants')",
  "value.includes('review')",
  "overflowWrap: 'anywhere'",
  "flexWrap: 'wrap'"
];

for (const anchor of requiredPageAnchors) {
  if (!page.includes(anchor)) {
    throw new Error(`Platform Billing Activation check failed: missing ${anchor}`);
  }
}

const reviewIndex = page.indexOf("value.includes('review')");
const blockedIndex = page.indexOf("value.includes('blocked')");
if (reviewIndex < 0 || blockedIndex < 0 || reviewIndex > blockedIndex) {
  throw new Error('Platform Billing Activation check failed: review states must be classified before generic blocked/error states.');
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
