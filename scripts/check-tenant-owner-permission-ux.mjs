import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const protectedRoute = read('src/components/ProtectedRoute.tsx');
const stock = read('src/pages/StockPage.tsx');
const requisitions = read('src/pages/InventoryRequisitionsPage.tsx');
const workspace = read('src/pages/RoleAwareWorkspacePage.tsx');
const usage = read('src/pages/InventoryUsagePage.tsx');
const advanced = read('src/pages/InventoryCapabilitiesPage.tsx');
const navigation = read('src/app/navigationRegistry.ts');
const users = read('src/pages/UsersPage.tsx');

function fail(message) {
  throw new Error(`Tenant-owner permission UX contract failed: ${message}`);
}

for (const signal of [
  "window.addEventListener(TENANT_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);",
  'isValidElement(children) ? cloneElement(children)'
]) {
  if (!protectedRoute.includes(signal)) fail(`ProtectedRoute.tsx missing ${signal}`);
}

const frozenPatterns = [
  'useMemo(() => getRoleCapabilities(), [])',
  'useMemo(() => getCurrentAccessRoleLabel(), [])',
  'useMemo(\n    () => hasPermission(TENANT_PERMISSIONS.STOCK_MOVEMENTS_READ),\n    []\n  )'
];
for (const [name, source] of [['StockPage.tsx', stock], ['InventoryRequisitionsPage.tsx', requisitions], ['RoleAwareWorkspacePage.tsx', workspace]]) {
  for (const pattern of frozenPatterns) {
    if (source.includes(pattern)) fail(`${name} still freezes live tenant permission state`);
  }
}

for (const signal of [
  'const canConsume = !isAdmin && canConsumeStock && canRecordInventoryUsage;',
  'const canRecordStockUsage = !permissions.isAdmin',
  'const canBulkRecordStockUsage = !permissions.isAdmin'
]) {
  if (!(stock.includes(signal) || usage.includes(signal))) fail(`admin operational consumption boundary missing ${signal}`);
}

for (const signal of [
  "const canReadIntegrations = hasPermission(TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_READ);",
  "const locationsQuery = useQuery({ queryKey: ['inventory-capabilities-locations'], enabled: canReadLocations",
  "const shipmentsQuery = useQuery({ queryKey: ['inventory-capabilities-shipments'], enabled: canReadShipments",
  "if (item.key === 'integrations') return canReadIntegrations;",
  "if (item.key === 'landed-cost') return canReadProducts && canReadShipments;",
  "if (item.key === 'hierarchy') return canReadLocations;",
  "if (item.key === 'mobile') return canUseMobileExecution;",
  'readPermissions={{ product: canReadProducts, supplier: canReadSuppliers, storage_location: canReadLocations, shipment: canReadShipments, purchase_order: canReadPurchaseOrders }}',
  'enabled: canRead,',
  'enabled: Boolean(canRead && entityId)',
  'readableEntityTypes.map((key)',
  'function MobilePanel({ canOpenScanner }'
]) {
  if (!advanced.includes(signal)) fail(`Advanced Inventory permission-aware UI missing ${signal}`);
}

for (const signal of [
  "type RoleSelection = '' | UserRole | `custom:${string}`;",
  "roleSelection: '',",
  '<option value="">{ui("Select a role…")}</option>',
  'form.roleSelection &&',
  'Choose access deliberately.'
]) {
  if (!users.includes(signal)) fail(`Users page must require an explicit employee access role: ${signal}`);
}

for (const forbidden of ['Priority #', 'added on top of the existing', 'Frontend connected to your production-ready backend']) {
  if (advanced.includes(forbidden) || navigation.includes(forbidden)) fail(`customer-facing development wording remains: ${forbidden}`);
}

console.log('Tenant-owner permission UX contract passed: live permission changes re-render pages, admin consumption entry stays separated from management, and Advanced Inventory only loads/shows role-appropriate tenant data.');
