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
  'src/pages/OutboundPage.tsx'
];

const tabbedPages = [
  'src/pages/EnterpriseCollaborationPage.tsx',
  'src/pages/DigitalTwinVisualizationPage.tsx',
  'src/pages/ReliabilityCommandPage.tsx',
  'src/pages/SystemContextPage.tsx',
  'src/pages/products/ProductPageContent.tsx',
  'src/pages/InventoryCapabilitiesPage.tsx',
  'src/pages/OutboundPage.tsx'
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
  ['src/pages/OutboundPage.tsx', 'io-outbound-page']
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
  'src/pages/products/ProductSummaryStatsPanel.tsx'
];

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
  if (!source.includes('io-workspace-stats')) {
    failures.push(`${relative}: summary/KPI surface does not use shared workspace stat framing`);
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

console.log(`Operational workspace design consistency check passed (${operationalPages.length} pages, ${tabbedPages.length} shared tab surfaces).`);
