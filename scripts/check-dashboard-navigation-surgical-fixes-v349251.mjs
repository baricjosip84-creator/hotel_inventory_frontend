import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const dashboard = read('src/pages/DashboardPage.tsx');
const alerts = read('src/pages/AlertsPage.tsx');
const alertsCss = read('src/pages/AlertsPage.css');
const shipments = read('src/pages/ShipmentsPage.tsx');
const suppliers = read('src/pages/SuppliersPage.tsx');
const procurement = read('src/pages/ProcurementRecommendationsPage.tsx');
const insights = read('src/pages/InsightsPage.tsx');
const translations = read('src/i18n/tenantUiTranslations.ts');

const checks = [
  ['Dashboard Review Alerts deep-link targets the live queue', dashboard.includes('/alerts?resolved=false&focus_queue=true') && alerts.includes("searchParams.get('focus_queue') === 'true'") && alerts.includes("document.getElementById('alerts-queue')?.scrollIntoView")],
  ['Focused alert styling no longer uses the harsh currentColor outline', !alertsCss.includes('outline: 2px solid currentColor') && alertsCss.includes('box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.16)')],
  ['Dashboard shipment links identify Dashboard as the source', dashboard.includes('&source=dashboard') && shipments.includes("searchParams.get('source') === 'dashboard'") && shipments.includes("Shipment opened from Dashboard.")],
  ['Dashboard shipment handoff fetches the exact record and scrolls to detail', shipments.includes('fetchShipmentById(dashboardHandoffShipmentId)') && shipments.includes("document.getElementById('shipments-detail')?.scrollIntoView")],
  ['Supplier deep-link context is visible and can be cleared', suppliers.includes('requestedSupplierId') && suppliers.includes("ui('Dashboard supplier context')") && suppliers.includes("ui('Show all suppliers')") && suppliers.includes("nextSearchParams.delete('supplier_id')")],
  ['Supplier result count reflects exact linked filtering', suppliers.includes("requestedSupplierId\n                ? `${formatLocalizedNumber(filteredSuppliers.length, locale)} ${ui('of')} ${formatLocalizedNumber(suppliers.length, locale)} ${ui('suppliers shown.')}`")],
  ['Dashboard reorder cards have exact recommendation drill-down', dashboard.includes('/procurement-recommendations?product_id=${encodeURIComponent(row.product_id)}') && dashboard.includes("label={ui('Review recommendation')}")],
  ['Procurement Recommendations consumes product_id deep-link context', procurement.includes("searchParams.get('product_id')") && procurement.includes("params.set(\"product_id\", productId)") && procurement.includes('setSelectedProductId(requestedProductRow.product_id)')],
  ['Procurement recommendation context is explicit and escapable', procurement.includes("Opened from the Dashboard recommendation card. The matching recommendation is selected below.") && procurement.includes("ui('Show all recommendations')")],
  ['Dashboard depletion-risk cards open the exact stock row', dashboard.includes('/stock?stock_id=${encodeURIComponent(row.stock_id)}')],
  ['Dashboard anomaly cards open exact product stock movements', dashboard.includes('/stock-movements?product_id=${encodeURIComponent(row.product_id)}')],
  ['Dashboard and Insights suppress normal-tier rows from unusual-anomaly presentation', dashboard.includes("String(row.anomaly_tier || '').toLowerCase() !== 'normal'") && insights.includes('const unusualAnomalyRows = useMemo') && insights.includes('const anomalyTop = unusualAnomalyRows[0]')],
  ['Dashboard recent activity hides known machine-reference reasons', dashboard.includes('function dashboardReasonLabel') && dashboard.includes("reason.startsWith('stock_transfer_out:')") && dashboard.includes("reason.startsWith('outbound_dispatch:')") && dashboard.includes('dashboardReasonLabel(row, ui)')],
  ['Dashboard reorder terminology distinguishes configured minimum from recommendation', dashboard.includes("ui('Configured Minimum')") && dashboard.includes('Recommendations can exceed the configured minimum when recent demand requires additional coverage.')],
  ['New navigation/context strings are translation-catalog backed', translations.includes('Shipment opened from Dashboard.') && translations.includes('Dashboard supplier context') && translations.includes('Show all recommendations') && translations.includes('Configured Minimum')],
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed}/${checks.length} checks failed.`);
  process.exit(1);
}
console.log(`\nPASS ${checks.length}/${checks.length} dashboard/navigation surgical regression checks.`);
