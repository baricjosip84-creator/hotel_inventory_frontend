import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const failures = [];
const requireText = (file, snippets) => {
  const source = read(file);
  for (const snippet of snippets) {
    if (!source.includes(snippet)) failures.push(`${file}: missing ${JSON.stringify(snippet)}`);
  }
  return source;
};

requireText('src/lib/tenantCurrency.ts', [
  "DEFAULT_INVENTORY_CURRENCY = 'EUR'",
  "'/tenants/currency-context'",
  'formatCurrencyAmount',
]);
requireText('src/pages/ReportsPage.tsx', [
  'currency_code',
  'formatCurrencyAmount',
  'Foreign-currency receipt costs are preserved separately',
]);
requireText('src/pages/StockMovementsPage.tsx', [
  'cost_currency',
  'received_cost_by_currency',
  'Cost Currency',
]);
requireText('src/pages/ProcurementRecommendationsPage.tsx', [
  'formatMoneyBreakdown',
  'estimated_total_cost_by_currency',
  'budget_currency',
]);
requireText('src/pages/ReplenishmentPlanningPage.tsx', [
  'estimated_cost_currency',
  'formatCurrencyAmount',
]);
requireText('src/pages/PurchaseOrdersPage.tsx', [
  'currency',
  'formatCurrencyAmount',
]);
requireText('src/pages/TenantSettingsPage.tsx', [
  'confirm_inventory_currency',
  'DEFAULT_INVENTORY_CURRENCY',
]);
requireText('src/pages/PlatformTenantsPage.tsx', [
  'Legacy currency not confirmed',
  'No automatic FX conversion will be performed.',
  'inventory_currency_configured_at',
]);
requireText('src/pages/DecisionLearningFeedbackPage.tsx', [
  'getActiveTenantCurrency()',
  'financialImpactCurrency',
]);
requireText('src/pages/InsightsPage.tsx', [
  'currency_code',
  'formatCurrencyAmount',
]);
requireText('src/pages/InventoryUsagePage.tsx', [
  'currency_code',
]);
requireText('src/pages/inventoryUsage/InventoryUsagePeriodClosuresPanel.tsx', [
  'currency_code',
  'formatMoney',
]);
requireText('src/pages/inventoryUsage/InventoryUsageGovernancePanel.tsx', [
  'currency_code',
]);
requireText('src/pages/products/ProductFormPanel.tsx', [
  'getActiveTenantCurrency()',
  'Tenant-base cost',
]);
requireText('src/pages/products/productCsvExports.ts', [
  'getActiveTenantCurrency',
  'currency_code',
]);
requireText('src/pages/InventoryRequisitionsPage.tsx', [
  'getActiveTenantCurrency()',
  "'Currency'",
]);

const tenantMoneyFiles = [
  'src/pages/ReportsPage.tsx',
  'src/pages/StockMovementsPage.tsx',
  'src/pages/ProcurementRecommendationsPage.tsx',
  'src/pages/ReplenishmentPlanningPage.tsx',
  'src/pages/PurchaseOrdersPage.tsx',
  'src/pages/ShipmentsPage.tsx',
  'src/pages/InsightsPage.tsx',
  'src/pages/InventoryRequisitionsPage.tsx',
  'src/pages/SystemContextPage.tsx',
  'src/pages/AIOperationsCopilotPage.tsx',
  'src/pages/ExecutionRequestsPage.tsx',
];
for (const file of tenantMoneyFiles) {
  const source = read(file);
  if (/currency\s*:\s*['"]USD['"]/.test(source)) failures.push(`${file}: hard-coded USD currency found`);
  if (/currency\s*:\s*['"]EUR['"]/.test(source)) failures.push(`${file}: hard-coded EUR currency found`);
}

if (failures.length) {
  console.error('Tenant currency hardening check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Tenant currency hardening check passed.');
