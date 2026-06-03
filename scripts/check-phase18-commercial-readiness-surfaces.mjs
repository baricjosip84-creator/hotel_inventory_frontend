#!/usr/bin/env node
/* Phase 18 Step 591 — Commercial Readiness UI Surfaces guardrail */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');
const api = read('src/lib/platformApi.ts');

const surfaces = [
  {
    path: 'enterprise-identity',
    nav: '/platform/enterprise-identity',
    page: 'src/pages/PlatformEnterpriseIdentityGovernancePage.tsx',
    component: 'PlatformEnterpriseIdentityGovernancePage',
    permission: 'PLATFORM_SECURITY_READ',
    endpoint: '/platform/enterprise-identity/governance',
    label: 'Enterprise identity'
  },
  {
    path: 'subscription-readiness',
    nav: '/platform/subscription-readiness',
    page: 'src/pages/PlatformSubscriptionReadinessPage.tsx',
    component: 'PlatformSubscriptionReadinessPage',
    permission: 'PLATFORM_BILLING_READ',
    endpoint: '/platform/subscription-readiness',
    label: 'Subscription readiness'
  },
  {
    path: 'license-plan-enforcement',
    nav: '/platform/license-plan-enforcement',
    page: 'src/pages/PlatformLicensePlanEnforcementPage.tsx',
    component: 'PlatformLicensePlanEnforcementPage',
    permission: 'PLATFORM_BILLING_READ',
    endpoint: '/platform/license-plan-enforcement',
    label: 'License enforcement'
  },
  {
    path: 'customer-success-admin',
    nav: '/platform/customer-success-admin',
    page: 'src/pages/PlatformCustomerSuccessAdminPage.tsx',
    component: 'PlatformCustomerSuccessAdminPage',
    permission: 'TENANTS_READ',
    endpoint: '/platform/customer-success-admin',
    label: 'Customer success'
  }
];

const failures = [];

for (const surface of surfaces) {
  if (!router.includes(`path: '${surface.path}'`)) failures.push(`router missing ${surface.path}`);
  if (!router.includes(`<${surface.component} />`)) failures.push(`router missing ${surface.component}`);
  if (!router.includes(`PLATFORM_PERMISSIONS.${surface.permission}`)) failures.push(`router missing permission gate ${surface.permission}`);
  if (!layout.includes(`to=\"${surface.nav}\"`)) failures.push(`layout missing nav ${surface.nav}`);
  if (!layout.includes(surface.label)) failures.push(`layout missing label ${surface.label}`);
  if (!existsSync(join(root, surface.page))) failures.push(`page missing ${surface.page}`);

  if (existsSync(join(root, surface.page))) {
    const page = read(surface.page);
    if (!page.includes(surface.endpoint)) failures.push(`${surface.page} missing endpoint ${surface.endpoint}`);
    if (!page.includes('useQuery')) failures.push(`${surface.page} must use query-backed read surface`);
    if (!page.includes('platformApiRequest')) failures.push(`${surface.page} must use platform API client`);
    if (page.includes('platformApiRequest<') && /method:\s*['"](POST|PATCH|PUT|DELETE)['"]/.test(page)) failures.push(`${surface.page} must remain read-only`);
  }
}

if (!api.includes('platformApiRequest')) failures.push('platformApi client must remain present');

if (failures.length) {
  console.error('Phase 18 commercial readiness UI surface check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Phase 18 commercial readiness UI surface check passed for ${surfaces.length} surfaces.`);
