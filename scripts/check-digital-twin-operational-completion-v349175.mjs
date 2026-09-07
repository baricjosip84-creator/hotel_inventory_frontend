import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`PASS: ${name}`);
    passed += 1;
  } else {
    console.error(`FAIL: ${name}`);
    failed += 1;
  }
}

const page = read('src/pages/DigitalTwinVisualizationPage.tsx');
const css = read('src/pages/DigitalTwinVisualizationPage.css');
const stock = read('src/pages/StockPage.tsx');
const suppliers = read('src/pages/SuppliersPage.tsx');
const locations = read('src/pages/StorageLocationsPage.tsx');
const requisitions = read('src/pages/InventoryRequisitionsPage.tsx');
const productState = read('src/pages/products/useProductPageState.ts');
const productData = read('src/pages/products/useProductPageData.ts');

check('Digital Twin has search with explicit submit/clear behavior', page.includes('Search connected records') && page.includes("updateFilters({ search: searchDraft.trim() })") && page.includes("updateFilters({ search: '' })"));
check('Digital Twin has review-first callout', page.includes('Review this first') && page.includes('review_first'));
check('Digital Twin records can open connected context', page.includes('Show connections') && page.includes('setFocusNodeKey(node.node_key)'));
check('Digital Twin renders a visible impact chain', page.includes('Impact chain') && page.includes('focus.impact_chain'));
check('Digital Twin exposes exact source-record links through the permission gate', page.includes('source_record_path') && page.includes('permittedSourcePath') && page.includes('Open exact source record'));
check('Digital Twin shows per-source data freshness', page.includes('Data freshness') && page.includes('freshness.sources'));
check('Digital Twin exposes truthful pagination counts and controls', page.includes('Showing {from}–{to} of {total}') && page.includes('Showing {from}–{to} of at least {total} matches in the current scan') && page.includes('previous_offset') && page.includes('next_offset'));
check('Digital Twin warns when bounded source scans may omit older matches', page.includes('may_have_more_source_records') && page.includes('reached the Digital Twin scan limit') && css.includes('digital-twin-coverage-warning'));
check('Digital Twin states that perspective changes real emphasis without pretending to simulate', page.includes('Perspective changes emphasis') && page.includes('measured heatmap'));
check('Digital Twin exact stock link focuses stock_id', stock.includes("searchParams.get('stock_id')") && stock.includes('row.id !== requestedStockId'));
check('Digital Twin exact supplier link focuses supplier_id', suppliers.includes("searchParams.get('supplier_id')") && suppliers.includes('supplier.id === requestedSupplierId'));
check('Digital Twin exact location link focuses location_id', locations.includes("searchParams.get('location_id')") && locations.includes('location.id === requestedLocationId'));
check('Digital Twin exact requisition link opens requisition detail', requisitions.includes("searchParams.get('requisitionId')") && requisitions.includes('setSelectedId(requestedRequisitionId)'));
check('Digital Twin exact product link focuses product_id', productState.includes("searchParams.get('product_id')") && productData.includes('product.id === focusedProductId'));
check('New connected-context UI has responsive styling', ['digital-twin-review-first', 'digital-twin-focus-panel', 'digital-twin-impact-chain', 'digital-twin-pagination', 'digital-twin-freshness'].every((name) => css.includes(name)));
check('Digital Twin remains business-facing without raw diagnostics UI', !page.includes('JSON.stringify(response, null, 2)') && !page.includes("view === 'diagnostics'"));
check('v3.49.175 guard is wired into frontend CI chain', read('package.json').includes('check:digital-twin-operational-completion-v349175'));

if (failed) {
  console.error(`Digital Twin frontend operational completion v3.49.175: ${passed} passed / ${failed} failed.`);
  process.exit(1);
}
console.log(`Digital Twin frontend operational completion v3.49.175: ${passed}/${passed} PASS.`);
