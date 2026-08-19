import fs from 'node:fs';

const reports = fs.readFileSync('src/pages/ReportsPage.tsx', 'utf8');
const enterpriseReports = fs.readFileSync('src/components/enterpriseInventory/tabs/ReportsTab.tsx', 'utf8');
const enterpriseForecast = fs.readFileSync('src/components/enterpriseInventory/tabs/ForecastTab.tsx', 'utf8');
const enterpriseTypes = fs.readFileSync('src/components/enterpriseInventory/EnterpriseInventoryTypes.ts', 'utf8');

const requiredReportsSnippets = [
  'hasPermission(TENANT_PERMISSIONS.TENANT_READ)',
  'enabled: canReadTenantSubscriptionAccess',
  '!canReadTenantSubscriptionAccess || subscriptionAccessQuery.isSuccess || subscriptionAccessQuery.isError',
  "error.code === 'TENANT_FEATURE_NOT_ENTITLED'",
  'reportErrors.some(isFeatureEntitlementError)',
  'const forecastDeniedByPermission = isPermissionDeniedError(forecastQuery.error);',
  'const anyForbidden = reportErrors.some(isPermissionDeniedError);',
  'Object.entries(procurementSummary.lines.quantity_by_unit)',
  'formatQuantityByUnit(row.quantity_by_unit, row.total_quantity)',
  'formatCostSource(row.estimated_cost_source)',
  'function formatCostAmount',
  'formatCurrencyAmount',
  'Foreign-currency receipt costs are preserved separately and are not silently converted.',
  "row.product_unit || 'units'",
  'Forecasting is not enabled for this tenant subscription.',
  "fetchLowStock",
  "fetchUsageSummary",
  "fetchSupplierPerformance",
  "const [supplierFilters, setSupplierFilters] = useState({ from: '', to: '', supplier: '', limit: 100 });",
  "value={supplierFilters.limit}",
  "disabled={isExporting || disabled || isFetching} onClick={() => printReport(report)}",
  "Demand forecast from recent consumption and fulfillment stock movements over the last 30 days.",
  "fetchExpiryRisk",
  "fetchMovementLedger",
  "fetchInventoryVariance",
  "fetchPurchasingSpend",
  "fetchSlowMoving",
  "fetchReportFilterOptions",
  "fetchPurchaseOrderCommitments",
  "fetchStockTransferActivity",
  "fetchRequisitionActivity",
  "Product minima + location par levels",
  "actual receiving timestamps",
  "Open commitments",
  "PO Commitments",
  "Stock transfer activity report",
  "Inventory requisition activity report",
  "recognized purchasing spend",
  "Products with no recorded movement are treated as non-moving.",
  "Overview cards deliberately use unfiltered queries",
  "OperationalWorkspaceHero",
  "Print + PDF + CSV"
];

const requiredEnterpriseSnippets = [
  'quantity_by_unit',
  'formatQuantityByUnit(item.quantity_by_unit, item.total_quantity)',
  'formatCostSource(item.estimated_cost_source)',
  'No procurement quantity-by-unit rows returned.'
];

const requiredEnterpriseForecastSnippets = [
  "product_unit?: string | null;",
  'const unitCount = new Set(',
  'label="Units represented"',
  "item.product_unit || 'units'"
];

const forbiddenEnterpriseForecastSnippets = [
  'totalAverageDailyUsage',
  'label="Total avg daily usage"'
];

const forbiddenReportsSnippets = [
  'Frontend reporting surface built directly on the backend routes',
  'Top quantity location',
  'AVG(ABS(sm.change))',
  "currency: 'USD'"
];

const missing = [];
for (const snippet of requiredReportsSnippets) {
  if (!reports.includes(snippet)) missing.push(`ReportsPage missing hardening invariant: ${snippet}`);
}
for (const snippet of requiredEnterpriseSnippets) {
  if (!enterpriseReports.includes(snippet)) missing.push(`Enterprise Reports tab missing shared-report invariant: ${snippet}`);
}
for (const snippet of requiredEnterpriseForecastSnippets) {
  const target = snippet === 'product_unit?: string | null;' ? enterpriseTypes : enterpriseForecast;
  if (!target.includes(snippet)) missing.push(`Enterprise Forecast tab missing shared-forecast invariant: ${snippet}`);
}
for (const snippet of forbiddenEnterpriseForecastSnippets) {
  if (enterpriseForecast.includes(snippet)) missing.push(`Enterprise Forecast tab still contains mixed-unit reporting pattern: ${snippet}`);
}
for (const snippet of forbiddenReportsSnippets) {
  if (reports.includes(snippet)) missing.push(`ReportsPage still contains obsolete reporting pattern: ${snippet}`);
}

if (missing.length > 0) {
  console.error(missing.join('\n'));
  process.exit(1);
}

console.log('Reports page hardening check passed.');
