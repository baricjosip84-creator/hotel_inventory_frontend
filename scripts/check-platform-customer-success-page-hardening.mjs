#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const page = read('src/pages/PlatformCustomerSuccessAdminPage.tsx');
const css = read('src/pages/PlatformCustomerSuccessAdminPage.css');
const router = read('src/app/router.tsx');
const layout = read('src/layouts/PlatformLayout.tsx');

assert(page.includes('OperationalWorkspaceHero'), 'Customer Success must use Operational Workspace hero');
assert(page.includes('OperationalWorkspaceStats'), 'Customer Success must use Operational Workspace KPIs');
assert(page.includes("import './PlatformCustomerSuccessAdminPage.css';"), 'Customer Success must use page CSS');
assert(css.includes('.platform-customer-success'), 'Customer Success CSS must exist');
assert(page.includes('useSearchParams'), 'Customer Success filters must be URL-backed');
assert(page.includes('limit: String(PAGE_SIZE)'), 'Customer Success must request a bounded page');
assert(page.includes("params.set('tenant_id'"), 'Customer Success must preserve tenant deep links');
assert(page.includes("params.set('state'"), 'Customer Success must preserve state filters');
assert(page.includes("params.set('search'"), 'Customer Success must support server search');
assert(page.includes("params.set('include_history', 'true')"), 'Customer Success must expose archived history explicitly');
assert(!page.includes("platformApiRequest<Tenant[]>('/platform/tenants')"), 'Customer Success must not load the full tenant directory for filtering');
assert(page.includes('placeholderData: (previous) => previous'), 'Customer Success must preserve last successful snapshot');
assert(page.includes('Showing the last successful snapshot.'), 'Customer Success must explain stale snapshot state');
assert(page.includes('Partial evidence.'), 'Customer Success must show partial evidence explicitly');
assert(page.includes('canReadSupportSessions'), 'Support Session links must be permission-aware');
assert(page.includes('canReadIncidents'), 'Incident links must be permission-aware');
assert(page.includes('canReadBilling'), 'Billing links must be permission-aware');
assert(page.includes('canReadAudit'), 'Audit links must be permission-aware');
assert(page.includes('Risk score is a heuristic'), 'Customer Success must explain heuristic risk semantics');
assert(page.includes('Ready requires complete evidence'), 'Customer Success must not call partial evidence Ready');
assert(page.includes('pagination?.has_more'), 'Customer Success must expose pagination controls');
assert(router.includes("path: 'customer-success-admin'"), 'Customer Success route must remain registered');
assert(router.includes('requiredPermissions={[PLATFORM_PERMISSIONS.TENANTS_READ]}'), 'Customer Success route must retain TENANTS_READ base permission');
assert(layout.includes('hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)'), 'Customer Success sidebar must retain TENANTS_READ visibility guard');

console.log('Platform Customer Success page hardening check passed.');
