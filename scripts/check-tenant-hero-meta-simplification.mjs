import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const tenantSourcesFromCrossDomainOptimization = [
  'src/pages/CrossDomainOptimizationPage.tsx',
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
  'src/pages/InventoryReservationsPage.tsx',
  'src/pages/ExecutionRequestsPage.tsx',
  'src/pages/ExecutionTasksPage.tsx',
  'src/pages/AutomationSchedulesPage.tsx',
  'src/pages/PurchaseOrdersPage.tsx',
  'src/pages/ProcurementRecommendationsPage.tsx',
  'src/pages/ReplenishmentPlanningPage.tsx',
  'src/pages/ShipmentsPage.tsx',
  'src/components/enterpriseInventory/EnterpriseInventoryShared.tsx',
  'src/pages/ReportsPage.tsx',
  'src/pages/UsersPage.tsx',
  'src/pages/TenantPermissionsPage.tsx',
  'src/pages/TenantAuditPage.tsx',
  'src/pages/TenantSettingsPage.tsx',
  'src/pages/AdminSystemPage.tsx',
  'src/pages/SessionsPage.tsx'
];

const failures = [];
for (const relativePath of tenantSourcesFromCrossDomainOptimization) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`${relativePath}: source file missing`);
    continue;
  }

  const source = fs.readFileSync(absolutePath, 'utf8');
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  if (withoutBlockComments.includes('<OperationalWorkspaceMetaPill')) {
    failures.push(`${relativePath}: title-area OperationalWorkspaceMetaPill is still rendered`);
  }
}

if (failures.length) {
  console.error('Tenant title-info simplification check: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Tenant title-info simplification check: PASS (${tenantSourcesFromCrossDomainOptimization.length} tenant sources checked from Cross-Domain Optimization onward).`);
