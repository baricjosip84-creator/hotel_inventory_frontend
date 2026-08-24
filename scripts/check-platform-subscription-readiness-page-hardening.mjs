#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(join(root, file), 'utf8');
const page = read('src/pages/PlatformSubscriptionReadinessPage.tsx');
const css = read('src/pages/PlatformSubscriptionReadinessPage.css');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');
const customerSuccess = read('src/pages/PlatformCustomerSuccessAdminPage.tsx');
const failures = [];

const requireText = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
requireText(router, "path: 'subscription-readiness'", 'router missing Subscription Readiness route');
requireText(router, 'requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ, PLATFORM_PERMISSIONS.TENANTS_READ]}', 'Subscription Readiness route must require Billing + tenant identity permissions');
requireText(layout, 'hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)', 'sidebar must require Billing + tenant identity permissions');
requireText(page, 'OperationalWorkspaceHero', 'page must use Operational Workspace hero');
requireText(page, 'OperationalWorkspaceStats', 'page must use Operational Workspace KPI cards');
requireText(page, 'useSearchParams', 'page filters must be URL-backed');
requireText(page, "limit: String(PAGE_SIZE)", 'page must request bounded server pagination');
requireText(page, 'placeholderData: (previous) => previous', 'page must preserve last successful snapshot during refresh');
requireText(page, 'Showing the last successful snapshot.', 'page must disclose stale snapshot after refresh failure');
requireText(page, 'Billing event history', 'page must explain billing-history semantics');
requireText(page, 'does not independently prove bank settlement', 'page must reject external payment proof claims');
requireText(page, 'comped tenant does not require a paid current-period end', 'page must explain comped-period semantics');
requireText(customerSuccess, 'canReadBilling', 'Customer Success must permission-scope Billing links');
requireText(customerSuccess, 'PLATFORM_BILLING_READ required', 'Customer Success must render restricted Billing evidence truthfully');
requireText(css, '.platform-subscription-readiness__table', 'Subscription Readiness workspace CSS missing');

if (/style=\{styles\./.test(page)) failures.push('Subscription Readiness must not use the legacy inline-style shell');
if (/method:\s*['\"](?:POST|PATCH|PUT|DELETE)['\"]/.test(page)) failures.push('Subscription Readiness must remain read-only');

if (failures.length) {
  console.error('Platform Subscription Readiness hardening check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Platform Subscription Readiness hardening check passed.');
