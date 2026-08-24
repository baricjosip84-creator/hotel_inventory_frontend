#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const page = read('src/pages/PlatformLicensePlanEnforcementPage.tsx');
const css = read('src/pages/PlatformLicensePlanEnforcementPage.css');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');

assert(page.includes('OperationalWorkspaceHero'), 'License Plan page must use Operational Workspace hero');
assert(page.includes('OperationalWorkspaceStats'), 'License Plan page must use Operational Workspace KPI cards');
assert(page.includes("import './PlatformLicensePlanEnforcementPage.css';"), 'License Plan page must use page CSS');
assert(css.includes('.platform-license-plan'), 'License Plan CSS must exist');

assert(page.includes('useSearchParams'), 'License Plan filters must be URL-backed');
assert(page.includes('limit: String(PAGE_SIZE)'), 'License Plan request must opt into bounded server pagination');
assert(page.includes("params.set('tenant_id'"), 'License Plan must preserve tenant deep links');
assert(page.includes("params.set('plan_code'"), 'License Plan must preserve plan filters');
assert(page.includes("params.set('billing_status'"), 'License Plan must preserve billing filters');
assert(page.includes("params.set('search'"), 'License Plan must support server search');
assert(page.includes("params.set('include_history', 'true')"), 'License Plan must expose archived-history scope explicitly');
assert(!page.includes("platformApiRequest<Tenant[]>('/platform/tenants')"), 'License Plan must not load the full tenant directory just to filter the registry');

assert(page.includes('placeholderData: (previous) => previous'), 'License Plan must preserve the last successful snapshot during refresh');
assert(page.includes('Showing the last successful snapshot.'), 'License Plan must explain stale snapshot state');
assert(page.includes('Runtime incomplete'), 'License Plan must expose runtime coverage gaps');
assert(page.includes('Configured ≠ enforced'), 'License Plan must distinguish configuration from enforcement');
assert(page.includes('Catalog mode ≠ implementation'), 'License Plan must not treat catalog recommendations as implemented runtime modes');
assert(page.includes('runtime_unenforced_limits'), 'License Plan must show unenforced required limits');
assert(page.includes('runtime_unenforced_feature_flags'), 'License Plan must show unenforced required features');
assert(page.includes('pagination?.has_more'), 'License Plan must expose server pagination controls');
assert(page.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ)'), 'License Plan Audit links must be permission-aware');

assert(router.includes('requiredPermissions={[PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ, PLATFORM_PERMISSIONS.TENANTS_READ]}'), 'License Plan route must require Billing + tenant identity permissions');
assert(layout.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) && hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)'), 'License Plan sidebar must require Billing + tenant identity permissions');

console.log('Platform License Plan Enforcement page hardening check passed.');
