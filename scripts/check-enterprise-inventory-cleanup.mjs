import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const tabs = read('src/components/enterpriseInventory/EnterpriseInventoryTabConfig.ts');
const panels = read('src/components/enterpriseInventory/EnterpriseInventoryPagePanels.tsx');
const queries = read('src/components/enterpriseInventory/EnterpriseInventoryQueries.ts');
const navigation = read('src/app/navigationRegistry.ts');
const page = read('src/pages/EnterpriseInventoryPage.tsx');
const tabUi = read('src/components/enterpriseInventory/EnterpriseInventoryTabs.tsx');
const cycleCounts = read('src/components/enterpriseInventory/tabs/CycleCountsTab.tsx');
const parLevels = read('src/components/enterpriseInventory/tabs/ParLevelsTab.tsx');
const stockPanels = read('src/components/enterpriseInventory/EnterpriseInventoryStockOperationsPanels.tsx');
const approvals = read('src/components/enterpriseInventory/tabs/ApprovalsTab.tsx');
const supplierCatalogs = read('src/components/enterpriseInventory/tabs/SupplierCatalogsTab.tsx');
const supplierCatalogImport = read('src/components/imports/SupplierCatalogImportPanel.tsx');
const invoices = read('src/components/enterpriseInventory/tabs/InvoicesTab.tsx');
const notifications = read('src/components/enterpriseInventory/tabs/NotificationsTab.tsx');
const compliancePanels = read('src/components/enterpriseInventory/EnterpriseInventoryCompliancePanels.tsx');
const pageCss = read('src/pages/InventoryControlsPage.css');

const retainedTabs = [
  'par-levels', 'cycle-counts', 'supplier-returns', 'approvals', 'supplier-catalog',
  'invoices', 'labels', 'attachments', 'notifications'
];
const removedTabs = [
  'operations-dashboard', 'stock-risk', 'insights', 'forecast', 'reports', 'automation',
  'execution', 'system-context', 'cost-control', 'stock-transfers', 'products', 'suppliers',
  'locations', 'alerts', 'audit', 'procurement-match', 'receiving', 'requisitions', 'packages'
];

for (const key of retainedTabs) {
  if (!tabs.includes(`['${key}'`)) throw new Error(`Missing retained Enterprise Inventory tab: ${key}`);
}
for (const key of removedTabs) {
  if (tabs.includes(`['${key}'`)) throw new Error(`Duplicate/legacy Enterprise Inventory tab still exposed: ${key}`);
}

for (const required of [
  'EnterpriseInventoryStockOperationsPanels',
  'EnterpriseInventoryProcurementWorkflowPanels',
  'EnterpriseInventoryCatalogSupportPanels',
  'EnterpriseInventoryCompliancePanels'
]) {
  if (!panels.includes(required)) throw new Error(`Retained panel family missing: ${required}`);
}
for (const removed of [
  'EnterpriseInventoryOperationalPanels',
  'EnterpriseInventoryGovernancePanels',
  'EnterpriseInventoryMasterDataPanels',
  'EnterpriseInventoryProcurementPanels'
]) {
  if (panels.includes(removed)) throw new Error(`Duplicate panel family still mounted: ${removed}`);
}

if (!queries.includes('activeTab: string')) throw new Error('Enterprise Inventory query orchestration is not active-tab aware.');
if (!queries.includes("enabled: canReadParLevels && tabIs('par-levels')")) throw new Error('Par-level query is not tab-scoped.');
if (!queries.includes("enabled: canReadCycleCounts && tabIs('cycle-counts', 'approvals')")) throw new Error('Cycle-count query is not scoped to retained consumers.');
if (!queries.includes("enabled: canReadNotifications && tabIs('notifications')")) throw new Error('Notification queries are not tab-scoped.');
if (!queries.includes("enabled: canReadProducts && tabIs('cost-control')")) throw new Error('Removed cost-control queries are not dormant.');
if (!navigation.includes("label: 'Inventory Controls'")) throw new Error('Tenant navigation still exposes the old catch-all Enterprise Inventory label.');
if (!page.includes("activeTab === 'par-levels'")) throw new Error('Evaluate par levels remains visible outside the par-level tab.');
if (!tabUi.includes('const visibleTabs = enterpriseInventoryTabs.filter')) throw new Error('Unavailable Enterprise Inventory tabs are not hidden.');
if (tabUi.includes('disabled={!canOpenTab}')) throw new Error('Permission-blocked Enterprise Inventory tabs are still rendered as disabled clutter.');
if (tabUi.includes('hint=')) throw new Error('Inventory Controls tabs still reserve width for a redundant hint.');
if (!pageCss.includes('.inventory-controls-page .io-workspace-tabs__hint')) throw new Error('Inventory Controls tab hint is not defensively hidden.');
if (!pageCss.includes('flex: 1 1 auto')) throw new Error('Inventory Controls tab list does not use the available width.');

if (parLevels.includes('Legacy reorder quantity') || !parLevels.includes("label={ui('Reorder quantity')}")) {
  throw new Error('Par-level form still exposes legacy implementation terminology.');
}

if (cycleCounts.includes('Manual inventory adjustment') || cycleCounts.includes('StockAdjustmentForm')) {
  throw new Error('Duplicate manual stock adjustment UI still appears under Cycle counts.');
}
if (stockPanels.includes('stockAdjustmentForm') || stockPanels.includes('adjustStockMutation')) {
  throw new Error('Cycle-count panel still wires the duplicate stock adjustment workflow.');
}

if (!approvals.includes('{entitySupportsScope ? <>') || !approvals.includes('{entityUsesAmount ? <>')) {
  throw new Error('Approval-rule fields are not conditionally scoped by rule type.');
}
if (!approvals.includes("amountBased ? money(item.min_amount, item.currency) : '—'")) {
  throw new Error('Scope-based approval rules still present irrelevant amount values in the table.');
}

if (!approvals.includes('marginTop: 12')) {
  throw new Error('Approval-rule helper text still sits against the save action without deliberate spacing.');
}

if (!supplierCatalogs.includes('tenantFacingProductSku')) throw new Error('Supplier catalog does not filter tenant-facing SKUs.');
if (!supplierCatalogs.includes('/^LEGACY[-_]/i')) throw new Error('Legacy generated product identifiers can still surface in the supplier catalog.');
if (supplierCatalogs.includes("<strong>{item.product_sku || '-'}</strong>")) throw new Error('Supplier catalog still promotes raw internal product SKU values.');
if (supplierCatalogs.includes('label="Internal product"')) throw new Error('Supplier catalog still uses internal-facing product terminology.');
if (!supplierCatalogs.includes('tenantFacingProductSku(product.sku)')) throw new Error('Supplier-product selector can still expose generated legacy SKUs.');

if (!supplierCatalogImport.includes("alignItems: 'flex-end'")) {
  throw new Error('Supplier catalog import actions are not aligned to the supplier control baseline.');
}


if (!invoices.includes('formatLocalizedCurrency(parsed, currency || getActiveTenantCurrency(), locale, { maximumFractionDigits: 2 })')) {
  throw new Error('Invoice money formatting is not normalized to tenant-facing currency precision.');
}
if (invoices.includes('className="inventory-controls-grid" style={styles.grid}')) {
  throw new Error('Invoice form is still trapped in a half-empty two-column grid.');
}

if (notifications.includes('Process due deliveries now') || notifications.includes('onProcessNotificationDeliveries')) {
  throw new Error('Background delivery processing is still exposed as a normal tenant action.');
}
if (!notifications.includes('displayToken') || !notifications.includes('displayToken(item.event_type, ui)')) {
  throw new Error('Known notification event codes are not mapped to tenant-facing display labels.');
}

if (!notifications.includes('tenantFacingNotificationDescription') || !notifications.includes("headers={['Severity', 'Event', 'Description', 'Created'].map(ui)}")) {
  throw new Error('Notification events still expose technical message content instead of tenant-facing descriptions.');
}
if (notifications.includes("item.message || '-'")) {
  throw new Error('Notification event table still renders raw backend message strings containing internal record IDs.');
}
if (!notifications.includes('<section style={styles.stack}>') || !notifications.includes("ui('Notification events')")) {
  throw new Error('Notification controls are not using the cleaned full-width section structure.');
}
if (compliancePanels.includes('processNotificationDeliveriesMutation')) {
  throw new Error('Notification panel still wires the hidden background-processing action.');
}

console.log('Enterprise Inventory cleanup contract passed.');
