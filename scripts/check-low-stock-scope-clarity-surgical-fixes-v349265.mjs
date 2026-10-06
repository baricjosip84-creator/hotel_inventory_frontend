import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendCandidates = [
  process.env.BACKEND_ROOT,
  path.resolve(frontendRoot, '../hotel-inventory-backend'),
  path.resolve(frontendRoot, '../backend')
].filter(Boolean);
const backendRoot = backendCandidates.find((candidate) => fs.existsSync(candidate));
if (!backendRoot) throw new Error('Batch 020 guard requires BACKEND_ROOT or an adjacent backend checkout.');

const readFrontend = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), 'utf8');
const readBackend = (relativePath) => fs.readFileSync(path.join(backendRoot, relativePath), 'utf8');

const dashboard = readFrontend('src/pages/DashboardPage.tsx');
const stock = readFrontend('src/pages/StockPage.tsx');
const reports = readFrontend('src/pages/ReportsPage.tsx');
const insights = readFrontend('src/pages/InsightsPage.tsx');
const translations = readFrontend('src/i18n/tenantUiTranslations.ts');
const pkg = JSON.parse(readFrontend('package.json'));
const dashboardService = readBackend('src/services/analytics/dashboardService.js');
const locationThresholdPolicy = readBackend('src/services/inventory/locationThresholdPolicy.js');
const reportService = readBackend('src/services/analytics/reportService.js');

const checks = [];
const check = (condition, label) => checks.push({ condition: Boolean(condition), label });

check(dashboard.includes("title={ui('Positions Below Location Minimum')}"), 'Dashboard summary and action section use explicit location-minimum wording');
check(dashboard.includes("Product/location positions below active location par or stock minimum"), 'Dashboard explains what counts as the location minimum');
check(dashboard.includes("Most urgent product/location positions below their active location minimum."), 'Dashboard low-stock worklist states its product/location scope');
check(dashboard.includes("Location Minimum"), 'Dashboard row metric names the threshold as location-scoped');
check(dashboard.includes("Location-level low stock rate"), 'Dashboard operational health rate is explicitly location-scoped');
check(!dashboard.includes("title={ui('Low Stock Rows')}"), 'ambiguous Dashboard Low Stock Rows title is removed');

check(stock.includes('title={ui("Positions Below Location Minimum")}'), 'Stock summary uses the same explicit location-minimum wording');
check(stock.includes('subtitle={ui("Product/location positions below active location par or stock minimum")}'), 'Stock summary explains active par versus stock minimum scope');

check(insights.includes('ui("Location-level low stock rate")'), 'Insights health metric makes the location scope explicit');

check(reports.includes("{ key: 'low-stock', label: 'Product & Location Shortages' }"), 'Reports tab names both supported shortage scopes');
check(reports.includes("'low-stock': 'Product and location shortage report'"), 'Reports print/export label no longer uses generic low-stock wording');
check(reports.includes('label={ui("Products Below Company-wide Minimum")}'), 'Reports overview identifies its product-wide count');
check(reports.includes('helper={ui("Tenant-wide product minimum across all locations")}'), 'Reports overview explains the company-wide product threshold basis');
check(reports.includes('Product minima compare against tenant-wide stock. Location par rows use active, currently effective par levels and compare against stock at that location.'), 'Detailed report retains explicit threshold-scope explanation');

check(dashboardService.includes('buildEffectiveLocationMinimumSql'), 'Dashboard low-stock semantics still use the shared effective location-minimum policy');
check(locationThresholdPolicy.includes("active location par minimum") && locationThresholdPolicy.includes("stock.min_quantity"), 'location threshold policy still resolves active par first, then explicit stock minimum');
check(locationThresholdPolicy.includes('Product.min_stock is a tenant-wide product threshold. It must not be\n  repeated as a fallback for every storage location.'), 'backend contract explicitly keeps tenant-wide product minimum separate from location warning thresholds');
check(reportService.includes("const getLowStockReport = async ({ tenantId, category, supplier, location, scope = 'product' })"), 'report overview default remains product-wide rather than silently changing business logic');
check(reportService.includes("'product_minimum'::text AS threshold_scope"), 'report service explicitly identifies product-minimum rows');
check(reportService.includes("'location_par_level'::text AS threshold_scope"), 'report service explicitly identifies location-par rows');

for (const message of [
  'Location Minimum',
  'Location-level low stock rate',
  'Positions Below Location Minimum',
  'Product/location positions below active location par or stock minimum',
  'Most urgent product/location positions below their active location minimum.',
  'Loading location-level shortages...',
  'Unable to load location-level shortages.',
  'No positions below location minimum.',
  'Current product/location positions are at or above their active location minimums.',
  'Products Below Company-wide Minimum',
  'Tenant-wide product minimum across all locations',
  'Product & Location Shortages',
  'Product and location shortage report'
]) {
  check(translations.includes(`["${message}"`), `${message} has a five-language tenant catalog row`);
}

check(pkg.scripts?.['check:inventory-low-stock-scope-clarity-surgical-fixes-v349265'] === 'node scripts/check-low-stock-scope-clarity-surgical-fixes-v349265.mjs', 'Batch 020 regression guard is registered');

const failed = checks.filter((item) => !item.condition);
for (const item of checks) console.log(`${item.condition ? 'PASS' : 'FAIL'}: ${item.label}`);
if (failed.length) {
  console.error(`\nBatch 020 low-stock scope clarity guard: ${checks.length - failed.length}/${checks.length} PASS`);
  process.exit(1);
}
console.log(`\nBatch 020 low-stock scope clarity guard: ${checks.length}/${checks.length} PASS`);
