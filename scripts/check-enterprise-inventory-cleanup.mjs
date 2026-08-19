import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const tabs = read('src/components/enterpriseInventory/EnterpriseInventoryTabConfig.ts');
const panels = read('src/components/enterpriseInventory/EnterpriseInventoryPagePanels.tsx');
const queries = read('src/components/enterpriseInventory/EnterpriseInventoryQueries.ts');
const navigation = read('src/app/navigationRegistry.ts');
const page = read('src/pages/EnterpriseInventoryPage.tsx');
const tabUi = read('src/components/enterpriseInventory/EnterpriseInventoryTabs.tsx');

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

console.log('Enterprise Inventory cleanup contract passed.');
