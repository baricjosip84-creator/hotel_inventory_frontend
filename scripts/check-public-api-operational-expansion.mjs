import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const page = read('src/pages/InventoryCapabilitiesPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');

const checks = [];
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};

const scopes = [
  'products:read', 'products:write', 'stock:read', 'suppliers:read', 'suppliers:write',
  'purchase_orders:read', 'purchase_orders:write', 'shipments:read', 'shipments:write',
  'customers:read', 'customers:write', 'locations:read', 'stock_movements:read',
  'outbound_orders:read', 'outbound_orders:write', 'customer_returns:read', 'customer_returns:write',
  'events:write'
];
for (const scope of scopes) expect(page.includes(`value: '${scope}'`), `API client UI exposes ${scope}`);

expect(page.includes("label: 'Manage outbound order drafts'") && page.includes('TENANT_PERMISSIONS.OUTBOUND_ORDERS_CREATE') && page.includes('TENANT_PERMISSIONS.OUTBOUND_ORDERS_UPDATE') && page.includes('TENANT_PERMISSIONS.OUTBOUND_ORDERS_CANCEL'), 'outbound write scope requires the full draft-management permission set');
expect(page.includes("label: 'Manage customer return drafts'") && page.includes('TENANT_PERMISSIONS.CUSTOMER_RETURNS_CREATE') && page.includes('TENANT_PERMISSIONS.CUSTOMER_RETURNS_CANCEL'), 'customer-return write scope requires create and cancel permissions');
expect(page.includes('scope.requiredPermissions.every((permission) => hasPermission(permission))'), 'API scope UI only offers scopes the current tenant user may fully delegate');

for (const label of [
  'Read shipments', 'Read customers', 'Manage customers', 'Read storage locations', 'Read stock movements',
  'Read outbound orders', 'Manage outbound order drafts', 'Read customer returns', 'Manage customer return drafts'
]) {
  expect(catalog.includes(`[\"${label}\"`), `${label} has a five-language catalog row`);
}

console.log(`Frontend public API operational expansion: PASS (${checks.length}/${checks.length} checks).`);
