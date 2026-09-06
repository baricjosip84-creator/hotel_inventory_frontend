#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const checks = [];
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};

const reservations = read('src/pages/InventoryReservationsPage.tsx');
const movements = read('src/pages/StockMovementsPage.tsx');
const costApi = read('src/pages/products/productCostHistoryApi.ts');
const costHandlers = read('src/pages/products/productCostHistoryHandlers.ts');
const usageApi = read('src/pages/inventoryUsage/inventoryUsageApi.ts');
const usagePage = read('src/pages/InventoryUsagePage.tsx');
const usageDashboard = read('src/pages/inventoryUsage/InventoryUsageDashboard.tsx');
const closurePanel = read('src/pages/inventoryUsage/InventoryUsagePeriodClosuresPanel.tsx');
const pkg = read('package.json');

expect(reservations.includes('function buildReservationFilterParams(filters: Filters): URLSearchParams'), 'reservation filters are reusable independently of list pagination');
expect(reservations.includes('return `/inventory-reservations/export.csv${query ?') && reservations.includes("`?${query}` : ''}"), 'reservation CSV path sends filters without a synthetic export limit');
expect(!reservations.includes("buildReservationQuery(filters, '5000', '0')"), 'reservation export no longer hard-codes the 5,000-row boundary');

expect(movements.includes('let offset = 0;'), 'stock movement complete export maintains an explicit offset');
expect(movements.includes('fetchStockMovements(filters, 500, offset)'), 'stock movement export advances through backend-supported offset pages');
expect(movements.includes('offset += batch.length;'), 'stock movement export advances by the actual returned batch size');
expect(!movements.includes('last?.created_at_cursor'), 'stock movement export no longer depends on a cursor field the backend does not return');

expect(costApi.includes('offset: String(paging.offset ?? 0)'), 'cost history API sends backend offset');
expect(costApi.includes('fetchAllProductCostHistory'), 'movement cost history has a complete-history export loader');
expect(costApi.includes('fetchAllProductStandardCostHistory'), 'standard cost history has a complete-history export loader');
expect(costApi.includes('if (!page.pagination?.has_more) break;'), 'cost-history export traversal follows server has-more metadata');
expect(costHandlers.includes('await fetchAllProductCostHistory(selectedCostProduct.id, costHistoryFilters)'), 'Cost History CSV exports complete filtered history rather than the loaded first page');
expect(costHandlers.includes('await fetchAllProductStandardCostHistory(selectedCostProduct.id)'), 'Standard Cost CSV exports complete history rather than the loaded first page');

expect(usageApi.includes('fetchInventoryUsagePeriodClosures(') && usageApi.includes('limit = 101') && usageApi.includes('offset = 0'), 'period-closure API exposes limit/offset paging');
expect(usageApi.includes('fetchAllInventoryUsagePeriodClosures'), 'period closures have a complete-history export loader');
expect(usagePage.includes('const [periodClosurePage, setPeriodClosurePage] = useState(1);'), 'Inventory Usage owns explicit period-closure page state');
expect(usagePage.includes('periodClosurePageSize + 1'), 'period-closure page uses a lookahead row to determine whether older history exists');
expect(usagePage.includes('const periodClosureHasNext = periodClosureRows.length > periodClosurePageSize;'), 'period-closure UI derives truthful next-page availability');
expect(usageDashboard.includes('onPreviousPeriodClosurePage'), 'period-closure navigation is carried through the dashboard');
expect(closurePanel.includes('{ui("Previous")}') && closurePanel.includes('{ui("Next")}'), 'period-closure panel exposes Previous and Next navigation');
expect(closurePanel.includes('const allClosures = await onLoadAllClosures();'), 'period-closure CSV exports all historical closures, not only the visible page');

expect(pkg.includes('check:simulation-long-lived-data-completeness-v349152'), 'v152 checker is wired into frontend package scripts');

console.log(`v3.49.152 long-lived data completeness: ${checks.length}/${checks.length} PASS`);
