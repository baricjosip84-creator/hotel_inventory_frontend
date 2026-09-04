import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const page = read('src/pages/InventoryCapabilitiesPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const checks = [];
const expect = (condition, message) => { if (!condition) throw new Error(message); checks.push(message); };

for (const [scope, label] of [
  ['purchase_orders:submit', 'Submit purchase order drafts'],
  ['locations:write', 'Manage storage locations'],
  ['requisitions:submit', 'Submit requisition drafts']
]) {
  expect(page.includes(`value: '${scope}', label: '${label}'`), `API client UI exposes ${scope} with a plain-language label`);
}
expect(page.includes("value: 'shipments:write', label: 'Create shipments'") && page.includes("value: 'shipments:update', label: 'Update shipment drafts'") && page.includes("value: 'shipment_items:write', label: 'Manage shipment items'"), 'existing shipment-create scope stays narrow and new draft/item powers use separate API scopes');
expect(page.includes("TENANT_PERMISSIONS.PURCHASE_ORDERS_SUBMIT"), 'purchase-order submit scope can only be delegated by a user who can submit purchase orders');
expect(page.includes("TENANT_PERMISSIONS.STORAGE_LOCATIONS_WRITE"), 'location write scope can only be delegated by a user who can manage locations');
expect(page.includes("TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_SUBMIT") && page.includes("TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_CANCEL_ANY"), 'requisition submit scope preserves the existing manage-any draft boundary for API clients without a human creator identity');
expect(page.includes('scope.requiredPermissions.every((permission) => hasPermission(permission))'), 'new API permissions remain delegable only when the managing tenant user has every underlying permission');
expect(page.includes("'/inventory-capabilities/webhook-events'") && page.includes('webhookEventCatalog'), 'webhook choices remain backend-driven instead of being hard-coded in the frontend');

for (const label of [
  'Create shipments','Update shipment drafts','Manage shipment items','Manage storage locations','Submit purchase order drafts','Submit requisition drafts',
  'Shipments','Storage Locations','Stock Transfers','Alerts','Stock Movements',
  'Partially received','Item created','Item updated','Item deleted','Executed','Acknowledged','Resolved','Escalated'
]) {
  expect(catalog.includes(`["${label}"`), `${label} has a five-language tenant UI catalog row`);
}

const rows = [...catalog.matchAll(/^\s*\["((?:[^"\\]|\\.)*)",\s*"/gm)].map((match) => match[1]);
expect(new Set(rows).size === rows.length, 'new API/webhook labels do not introduce duplicate English translation keys');

console.log(`Frontend public API commercial completion: PASS (${checks.length}/${checks.length} checks).`);
