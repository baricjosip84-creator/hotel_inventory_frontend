import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const operationalPages = [
  'src/pages/DashboardPage.tsx',
  'src/pages/EnterpriseCollaborationPage.tsx',
  'src/pages/DigitalTwinVisualizationPage.tsx',
  'src/pages/ReliabilityCommandPage.tsx',
  'src/pages/AlertsPage.tsx',
  'src/pages/InsightsPage.tsx',
  'src/pages/SystemContextPage.tsx',
  'src/pages/products/ProductPageContent.tsx',
  'src/pages/SuppliersPage.tsx',
  'src/pages/StockPage.tsx',
  'src/pages/StockMovementsPage.tsx',
  'src/pages/StockTransfersPage.tsx',
  'src/pages/StorageLocationsPage.tsx',
  'src/pages/InventoryCapabilitiesPage.tsx',
  'src/pages/ScannerPage.tsx',
  'src/pages/OutboundPage.tsx',
  'src/pages/inventoryUsage/InventoryUsageDashboard.tsx',
  'src/pages/InventoryRequisitionsPage.tsx',
];

const tabbedPages = [
  'src/pages/EnterpriseCollaborationPage.tsx',
  'src/pages/DigitalTwinVisualizationPage.tsx',
  'src/pages/ReliabilityCommandPage.tsx',
  'src/pages/SystemContextPage.tsx',
  'src/pages/products/ProductPageContent.tsx',
  'src/pages/InventoryCapabilitiesPage.tsx',
  'src/pages/OutboundPage.tsx',
  'src/pages/inventoryUsage/InventoryUsageDashboard.tsx',
];

const pageRootTokens = new Map([
  ['src/pages/DashboardPage.tsx', 'io-dashboard-page'],
  ['src/pages/EnterpriseCollaborationPage.tsx', 'collaboration-page'],
  ['src/pages/DigitalTwinVisualizationPage.tsx', 'digital-twin-page'],
  ['src/pages/ReliabilityCommandPage.tsx', 'reliability-page'],
  ['src/pages/AlertsPage.tsx', 'alerts-page'],
  ['src/pages/InsightsPage.tsx', 'insights-page'],
  ['src/pages/SystemContextPage.tsx', 'system-context-page'],
  ['src/pages/products/ProductPageContent.tsx', 'products-workspace-page'],
  ['src/pages/SuppliersPage.tsx', 'io-suppliers-page'],
  ['src/pages/StockPage.tsx', 'io-stock-page'],
  ['src/pages/StockMovementsPage.tsx', 'io-stock-movements-page'],
  ['src/pages/StockTransfersPage.tsx', 'io-stock-transfers-page'],
  ['src/pages/StorageLocationsPage.tsx', 'io-storage-locations-page'],
  ['src/pages/InventoryCapabilitiesPage.tsx', 'io-advanced-inventory-page'],
  ['src/pages/ScannerPage.tsx', 'io-scanner-page'],
  ['src/pages/OutboundPage.tsx', 'io-outbound-page'],
  ['src/pages/inventoryUsage/InventoryUsageDashboard.tsx', 'io-usage-ledger-page'],
  ['src/pages/InventoryRequisitionsPage.tsx', 'io-requisitions-page']
]);

const statsPages = [
  'src/pages/DashboardPage.tsx',
  'src/pages/EnterpriseCollaborationPage.tsx',
  'src/pages/DigitalTwinVisualizationPage.tsx',
  'src/pages/ReliabilityCommandPage.tsx',
  'src/pages/AlertsPage.tsx',
  'src/pages/InsightsPage.tsx',
  'src/pages/SystemContextPage.tsx',
  'src/pages/SuppliersPage.tsx',
  'src/pages/StockPage.tsx',
  'src/pages/StockMovementsPage.tsx',
  'src/pages/StockTransfersPage.tsx',
  'src/pages/StorageLocationsPage.tsx',
  'src/pages/InventoryCapabilitiesPage.tsx',
  'src/pages/OutboundPage.tsx',
  'src/pages/inventoryUsage/InventoryUsageDashboard.tsx',
  'src/pages/InventoryRequisitionsPage.tsx',
  'src/pages/products/ProductSummaryStatsPanel.tsx'
];

const topOrderStatsMarkers = new Map([
  ['src/pages/DashboardPage.tsx', 'io-workspace-stats'],
  ['src/pages/EnterpriseCollaborationPage.tsx', 'io-workspace-stats'],
  ['src/pages/DigitalTwinVisualizationPage.tsx', 'io-workspace-stats'],
  ['src/pages/ReliabilityCommandPage.tsx', 'io-workspace-stats'],
  ['src/pages/AlertsPage.tsx', 'io-workspace-stats'],
  ['src/pages/InsightsPage.tsx', 'io-workspace-stats'],
  ['src/pages/SystemContextPage.tsx', 'io-workspace-stats'],
  ['src/pages/products/ProductPageContent.tsx', '<ProductSummaryStatsPanel'],
  ['src/pages/SuppliersPage.tsx', 'io-workspace-stats'],
  ['src/pages/StockPage.tsx', 'io-workspace-stats'],
  ['src/pages/StockMovementsPage.tsx', 'io-workspace-stats'],
  ['src/pages/StockTransfersPage.tsx', 'io-workspace-stats'],
  ['src/pages/StorageLocationsPage.tsx', 'io-workspace-stats'],
  ['src/pages/InventoryCapabilitiesPage.tsx', 'io-workspace-stats'],
  ['src/pages/OutboundPage.tsx', 'io-workspace-stats'],
  ['src/pages/inventoryUsage/InventoryUsageDashboard.tsx', '<OperationalWorkspaceStats'],
  ['src/pages/InventoryRequisitionsPage.tsx', '<OperationalWorkspaceStats']
]);

const requiredSharedFiles = [
  'src/components/ui/OperationalWorkspace.tsx',
  'src/components/ui/OperationalWorkspace.css'
];

const failures = [];

for (const relative of requiredSharedFiles) {
  if (!fs.existsSync(path.join(root, relative))) {
    failures.push(`${relative}: shared workspace design source is missing`);
  }
}

for (const relative of operationalPages) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    failures.push(`${relative}: page is missing`);
    continue;
  }

  const source = fs.readFileSync(absolute, 'utf8');
  if (!source.includes('io-operational-page')) {
    failures.push(`${relative}: does not opt in to the shared operational control/surface contract`);
  }
  if (!source.includes('io-workspace-page')) {
    failures.push(`${relative}: does not opt in to the shared workspace layout contract`);
  }
  if (!source.includes('OperationalWorkspaceHero')) {
    failures.push(`${relative}: does not use the shared workspace hero`);
  }
}

for (const relative of tabbedPages) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!source.includes('OperationalWorkspaceTabs') || !source.includes('OperationalWorkspaceTab')) {
    failures.push(`${relative}: tabbed workspace does not use shared workspace tabs`);
  }
}

for (const [relative, rootToken] of pageRootTokens) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const rootPattern = new RegExp(`<div\\s+className=\"([^\"]*\\b${rootToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^\"]*)\"`, 'g');
  const matches = [...source.matchAll(rootPattern)];
  if (matches.length === 0) {
    failures.push(`${relative}: expected root token ${rootToken} was not found on a page container`);
    continue;
  }
  for (const match of matches) {
    const className = match[1];
    if (!className.includes('io-operational-page') || !className.includes('io-workspace-page')) {
      failures.push(`${relative}: root ${rootToken} is rendered without both shared operational workspace classes`);
      break;
    }
  }
}

for (const relative of statsPages) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!source.includes('io-workspace-stats') && !source.includes('<OperationalWorkspaceStats')) {
    failures.push(`${relative}: summary/KPI surface does not use shared workspace stat framing`);
  }
}

for (const relative of statsPages) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  if (!source.includes('<OperationalWorkspaceStatCard')) {
    failures.push(`${relative}: primary KPI cards do not delegate to OperationalWorkspaceStatCard`);
  }
}

for (const [relative, statsMarker] of topOrderStatsMarkers) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8');
  const heroIndex = source.indexOf('<OperationalWorkspaceHero');
  const statsIndex = source.indexOf(statsMarker, Math.max(heroIndex, 0));
  if (heroIndex < 0 || statsIndex < 0 || statsIndex < heroIndex) {
    failures.push(`${relative}: canonical top order must start Hero -> primary KPIs`);
    continue;
  }

  if (tabbedPages.includes(relative)) {
    const tabsIndex = source.indexOf('<OperationalWorkspaceTabs', heroIndex);
    if (tabsIndex < 0 || statsIndex > tabsIndex) {
      failures.push(`${relative}: canonical tabbed top order must be Hero -> primary KPIs -> Tabs`);
    }
  }
}

const sharedWorkspaceSource = fs.readFileSync(path.join(root, 'src/components/ui/OperationalWorkspace.tsx'), 'utf8');
const sharedWorkspaceCss = fs.readFileSync(path.join(root, 'src/components/ui/OperationalWorkspace.css'), 'utf8');
if (!sharedWorkspaceSource.includes('export function OperationalWorkspaceStatCard')) {
  failures.push('src/components/ui/OperationalWorkspace.tsx: shared primary KPI card component is missing');
}
for (const token of ['.io-workspace-stat__label', '.io-workspace-stat__value', '.io-workspace-stat__helper']) {
  if (!sharedWorkspaceCss.includes(token)) {
    failures.push(`src/components/ui/OperationalWorkspace.css: shared KPI typography token ${token} is missing`);
  }
}

const productsCss = fs.readFileSync(path.join(root, 'src/pages/products/ProductsPage.css'), 'utf8');
for (const legacySelector of ['products-hero', 'products-workspace-tabs', 'products-workspace-tab']) {
  if (productsCss.includes(legacySelector)) {
    failures.push(`src/pages/products/ProductsPage.css: legacy ${legacySelector} styling reintroduced; use OperationalWorkspace.css instead`);
  }
}

if (failures.length > 0) {
  console.error('Operational workspace design consistency check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Operational workspace design consistency check passed (${operationalPages.length} pages, ${tabbedPages.length} shared tab surfaces, shared primary KPI cards, canonical Hero -> KPI -> Tabs order).`);
