import {test,expect,type Page,type Route} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';
import {loginAsDisposableRole} from '../../../support/roleSession';

// Batch 20 source: frontend/src/pages/StockPage.tsx, src/app/router.tsx,
// backend/src/routes/stock.js. GET fixtures prove rendered UI behavior only,
// never backend tenant isolation, mutation correctness, or persistence.
const stockEndpoint='**/stock';
// Only API GET/XHR/fetch calls can be replaced with synthetic stock data.
// The glob also matches /stock DOCUMENT navigation; fulfilling that with JSON
// causes the entire workspace to disappear, as seen in the Batch 207 log.
const mockStockApi = (page:Page, handler:(route:Route)=>Promise<void>) =>
 page.route(stockEndpoint,route=>{
  const request=route.request();
  if(request.method()!=='GET'||!['fetch','xhr'].includes(request.resourceType()))return route.fallback();
  return handler(route);
 });

const stockRows=[
 {id:'pw-stock-coffee',product_id:'pw-product-coffee',product_name:'Synthetic Coffee',product_category:'Beverages',product_unit:'kg',storage_location_id:'pw-location-main',storage_location_name:'Main Warehouse',quantity:30,reserved_quantity:2,available_lot_quantity:30,usable_lot_quantity:30,effective_min_quantity:5,version:2},
 {id:'pw-stock-milk',product_id:'pw-product-milk',product_name:'Synthetic Milk',product_category:'Dairy',product_unit:'L',storage_location_id:'pw-location-kitchen',storage_location_name:'Kitchen',quantity:4,reserved_quantity:0,available_lot_quantity:4,usable_lot_quantity:4,effective_min_quantity:10,version:3},
 {id:'pw-stock-empty',product_id:'pw-product-plates',product_name:'Synthetic Plates',product_category:'Supplies',product_unit:'pcs',storage_location_id:'pw-location-bar',storage_location_name:'Bar',quantity:0,reserved_quantity:0,available_lot_quantity:0,usable_lot_quantity:0,effective_min_quantity:0,version:1},
 {id:'pw-stock-reserved',product_id:'pw-product-linen',product_name:'Synthetic Linens',product_category:'Housekeeping',product_unit:'pcs',storage_location_id:'pw-location-service',storage_location_name:'Service Room',quantity:20,reserved_quantity:18,projected_free_quantity:2,available_lot_quantity:20,usable_lot_quantity:20,effective_min_quantity:5,version:5},
 {id:'pw-stock-mismatch',product_id:'pw-product-cleaner',product_name:'Synthetic Cleaner',product_category:'Cleaning',product_unit:'L',storage_location_id:'pw-location-storage',storage_location_name:'Storage Room',quantity:15,reserved_quantity:0,available_lot_quantity:12,usable_lot_quantity:12,effective_min_quantity:5,version:4}
];
async function openStock(page:Page,rows:unknown[]=stockRows,url='/stock'){
 await loginAsTenant(page);
 // The **/stock glob also matches a browser DOCUMENT request for /stock.
 // Intercept only API reads; otherwise Playwright would replace the app HTML with JSON.
 await mockStockApi(page,route=>{
  const request=route.request();
  if(request.method()!=='GET'||!['fetch','xhr'].includes(request.resourceType()))return route.continue();
  return fulfillJson(route,rows);
 });
 await page.goto(url);
 await expect(page.getByText('Stock workspace',{exact:true})).toBeVisible();
}
const positionRows=(page:Page)=>page.locator('.stock-page__desktop-table tbody tr');
const searchField=(page:Page)=>page.getByLabel('Search stock');
const statusSelect=(page:Page)=>page.locator('#stock-status-filter');

// Only disposable tenant credentials. No mutation/POST actions in this batch.
test.describe('Stock — workspace, positions and filters (Batch 20)',()=>{
 test('TST-001 A delayed stock GET shows the loading position state',async({page})=>{
  await loginAsTenant(page);let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
  await mockStockApi(page,async route=>{await gate;await fulfillJson(route,stockRows);});
  await page.goto('/stock');await expect(page.getByText('Loading stock positions...')).toBeVisible();
  release();await expect(page.getByText('Stock workspace',{exact:true})).toBeVisible();
 });
 test('TST-002 Failed stock GET offers Try Again and recovers to the actual workbench',async({page})=>{
  await loginAsTenant(page);let fail=true;let requests=0;
  await mockStockApi(page,route=>{requests++;return fulfillJson(route,fail?{message:'Synthetic stock failure'}:stockRows,fail?503:200);});
  await page.goto('/stock');await expect(page.getByText('Failed to load stock:',{exact:false})).toBeVisible();
  fail=false;await page.getByRole('button',{name:'Try Again'}).click();await expect(page.getByText('Stock workspace',{exact:true})).toBeVisible();expect(requests).toBeGreaterThanOrEqual(2);
 });
 test('TST-003 Stock workspace explains controlled consume, count and adjustment actions',async({page})=>{
  await openStock(page);await expect(page.getByText('Stock operations',{exact:true})).toBeVisible();
  await expect(page.getByText('Review stock by product and location, see quantities assigned to reservations',{exact:false})).toBeVisible();
  for(const title of ['Operational Workbench','Stock Positions','Action Readiness','Post Stock Action'])await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
 });
 test('TST-004 Empty stock list shows onboarding guidance instead of a position table',async({page})=>{
  await openStock(page,[]);await expect(page.getByText('No stock positions are available yet.',{exact:false})).toBeVisible();
  await expect(positionRows(page)).toHaveCount(0);await expect(page.getByRole('button',{name:'Clear Stock Filters'})).toHaveCount(0);
 });
 test('TST-005 Populated response reports five positions and stock summary counters',async({page})=>{
  await openStock(page);await expect(positionRows(page)).toHaveCount(5);
  await expect(page.getByText('5 of 5 stock positions shown')).toBeVisible();
  await expect(page.locator('.stock-page__summary-stats')).toContainText('Positions Below Location Minimum');
  await expect(page.locator('.stock-page__summary-stats')).toContainText('Integrity Risk');
 });
 test('TST-006 Product search narrows the visible stock positions to matching name',async({page})=>{
  await openStock(page);await searchField(page).fill('Synthetic Milk');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Milk');
  await expect(page.getByText('1 of 5 stock positions shown')).toBeVisible();
 });
 test('TST-007 Search also matches storage-location name, not only product names',async({page})=>{
  await openStock(page);await searchField(page).fill('Kitchen');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Milk');
 });
 test('TST-008 Search trims surrounding whitespace and ignores case',async({page})=>{
  await openStock(page);await searchField(page).fill('  cOfFeE  ');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Coffee');
 });
 test('TST-009 Category selector limits rows to matching product category',async({page})=>{
  await openStock(page);await page.locator('#stock-category-filter').selectOption('Cleaning');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Cleaner');
 });
 test('TST-010 Location selector restricts rows by actual storage-location identifier',async({page})=>{
  await openStock(page);await page.locator('#stock-location-filter').selectOption('pw-location-bar');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Plates');
 });
 test('TST-011 Low-stock status applies usable quantity against effective minimum',async({page})=>{
  await openStock(page);await statusSelect(page).selectOption('low');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Milk');
  await expect(positionRows(page).first()).toContainText('LOW STOCK');
 });
 test('TST-012 No-usable-stock filter finds zero quantity even with zero minimum',async({page})=>{
  await openStock(page);await statusSelect(page).selectOption('empty');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Plates');
  await expect(positionRows(page).first()).toContainText('NO USABLE STOCK');
 });
 test('TST-013 Reservation-risk filter uses projected free quantity rather than on-hand',async({page})=>{
  await openStock(page);await statusSelect(page).selectOption('reserved-risk');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Linens');
  await expect(positionRows(page).first()).toContainText('LOW AVAILABLE');
 });
 test('TST-014 Integrity-risk filter detects stock versus available-lot mismatch',async({page})=>{
  await openStock(page);await statusSelect(page).selectOption('integrity-risk');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Cleaner');
  await expect(positionRows(page).first()).toContainText('STOCK / LOT MISMATCH');
 });
 test('TST-015 Healthy filter excludes low, empty, reserved-risk and mismatched positions',async({page})=>{
  await openStock(page);await statusSelect(page).selectOption('healthy');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Coffee');
  await expect(positionRows(page).first()).toContainText('HEALTHY');
 });
 test('TST-016 Clear Stock Filters resets search, category, location and status',async({page})=>{
  await openStock(page);await searchField(page).fill('synthetic');await page.locator('#stock-category-filter').selectOption('Cleaning');
  await page.locator('#stock-location-filter').selectOption('pw-location-storage');await statusSelect(page).selectOption('integrity-risk');
  await page.getByRole('button',{name:'Clear Stock Filters'}).click();
  await expect(searchField(page)).toHaveValue('');await expect(page.locator('#stock-category-filter')).toHaveValue('all');
  await expect(page.locator('#stock-location-filter')).toHaveValue('all');await expect(statusSelect(page)).toHaveValue('all');
  await expect(positionRows(page)).toHaveCount(5);await expect(page.getByRole('button',{name:'Clear Stock Filters'})).toBeDisabled();
 });
 test('TST-017 No-match filter presents explicit message without presenting unrelated rows',async({page})=>{
  await openStock(page);await searchField(page).fill('NONEXISTENT-SYNTHETIC-CODE');
  await expect(page.getByText('No stock positions match the current search and filters.')).toBeVisible();
  await expect(positionRows(page)).toHaveCount(0);await expect(page.getByText('0 of 5 stock positions shown')).toBeVisible();
 });
 test('TST-018 product_id deep link scopes list to only requested product across locations',async({page})=>{
  await openStock(page,stockRows,'/stock?product_id=pw-product-coffee');
  await expect(positionRows(page)).toHaveCount(1);await expect(positionRows(page).first()).toContainText('Synthetic Coffee');
  await expect(page.getByText('Linked product filter active',{exact:false})).toBeVisible();
 });
 test('TST-019 stock_id deep link selects the matching position in its details panel',async({page})=>{
  await openStock(page,stockRows,'/stock?stock_id=pw-stock-reserved');
  await expect(positionRows(page)).toHaveCount(1);
  await expect(positionRows(page).first()).toContainText('Synthetic Linens');
  await expect(positionRows(page).first().getByRole('button',{name:'Selected'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Selected Stock Position'})).toBeVisible();
 });
 test('TST-020 Lot and reconciliation GETs remain lazy until the operator expands detail',async({page})=>{
  await loginAsTenant(page);let lots=0;let reconciliations=0;
  await mockStockApi(page,route=>fulfillJson(route,stockRows));
  await page.route('**/stock/lots',route=>{lots++;return fulfillJson(route,[]);});
  await page.route('**/stock/reconciliation',route=>{reconciliations++;return fulfillJson(route,{summary:{row_count:0,ledger_mismatch_count:0,lot_mismatch_count:0,expired_still_available_count:0},rows:[]});});
  await page.goto('/stock');await expect(page.getByText('Stock workspace',{exact:true})).toBeVisible();
  await expect(page.getByText('Lot and reconciliation details are kept closed by default',{exact:false})).toBeVisible();
  expect(lots).toBe(0);expect(reconciliations).toBe(0);
  await page.getByRole('button',{name:'Load lot & integrity details'}).click();await expect.poll(()=>lots).toBe(1);await expect.poll(()=>reconciliations).toBe(1);
  await expect(page.getByRole('button',{name:'Hide lot & integrity details'})).toBeVisible();
 });
});

// Batch 21: These controls are exercised against disposable accounts. Every POST
// below is intercepted, and a mocked confirmation is never proof of persistence.
const stockReconciliation={summary:{row_count:0,ledger_mismatch_count:0,lot_mismatch_count:0,expired_still_available_count:0},rows:[]};
const lot=(id:string, condition:string, days=30)=>({id,product_id:'pw-product-coffee',product_name:'Synthetic Coffee',product_unit:'kg',storage_location_id:'pw-location-main',storage_location_name:'Main Warehouse',lot_number:id,batch_number:'',condition,operational_status:condition,quantity:2,days_to_expiry:days,unit_cost:4,unit_cost_currency:'EUR'});
async function stockWithLots(page:Page,lots:unknown[]){
 await loginAsTenant(page);
 await mockStockApi(page,r=>fulfillJson(r,stockRows));
 await page.route('**/stock/lots',r=>fulfillJson(r,lots));
 await page.route('**/stock/reconciliation',r=>fulfillJson(r,stockReconciliation));
 await page.goto('/stock');
 await page.getByRole('button',{name:'Load lot & integrity details'}).click();
 await expect(page.getByText('Lot Balances',{exact:true})).toBeVisible();
}
async function selectStockByName(page:Page,name:string){
 await positionRows(page).filter({hasText:name}).getByRole('button',{name:/^(Select|Selected)$/}).click();
 await expect(page.getByRole('heading',{name:'Selected Stock Position'})).toBeVisible();
}
function stockResponse(before:number,after:number,version=3){return {message:'Synthetic isolated stock result',stock:{product_id:'pw-product-coffee',storage_location_id:'pw-location-main',previous_quantity:before,new_quantity:after,difference:after-before,version}};}
const lotsPanel=(page:Page)=>page.getByRole('heading',{name:'Lot, Expiry & Stock Integrity'}).locator('xpath=ancestor::section[1]');


test.describe('Stock — selection, lot governance and controlled stock actions (Batch 21)',()=>{
 test('TST-021 Selecting another position clears the earlier stock-action quantity',async({page})=>{
  await openStock(page);await selectStockByName(page,'Synthetic Coffee');
  await page.locator('#stock-action-quantity').fill('2');
  await selectStockByName(page,'Synthetic Milk');
  await expect(page.locator('#stock-action-quantity')).toHaveValue('');
  await expect(page.locator('section[tabindex="-1"]').first()).toContainText('Synthetic Milk');
 });
 test('TST-022 Desktop Select moves keyboard focus to the stock details section',async({page})=>{
  await openStock(page);await selectStockByName(page,'Synthetic Coffee');
  await expect(page.locator('section[tabindex="-1"]').first()).toBeFocused();
  await expect(page.locator('section[tabindex="-1"]').first()).toContainText('Synthetic Coffee');
 });
 test('TST-023 Mobile card selection opens details for that exact stock position',async({page})=>{
  await page.setViewportSize({width:390,height:820});await openStock(page);
  await page.locator('.stock-page__mobile-list button').filter({hasText:'Synthetic Milk'}).click();
  await expect(page.locator('section[tabindex="-1"]').first()).toContainText('Synthetic Milk');
  await expect(page.locator('section[tabindex="-1"]').first()).toBeFocused();
 });
 test('TST-024 Clear Stock Filters strips linked product and stock query keys',async({page})=>{
  await openStock(page,stockRows,'/stock?product_id=pw-product-coffee&stock_id=pw-stock-coffee&origin=pw-audit');
  await page.getByRole('button',{name:'Clear Stock Filters'}).click();
  await expect.poll(()=>new URL(page.url()).searchParams.has('product_id')).toBe(false);
  expect(new URL(page.url()).searchParams.has('stock_id')).toBe(false);
  expect(new URL(page.url()).searchParams.get('origin')).toBe('pw-audit');
  await expect(positionRows(page)).toHaveCount(5);
 });
 test('TST-025 Refresh Stock re-fetches positions and expanded lot/reconciliation data',async({page})=>{
  await loginAsTenant(page);let stock=0,lots=0,reconciliations=0;
  await mockStockApi(page,r=>{stock++;return fulfillJson(r,stockRows);});
  await page.route('**/stock/lots',r=>{lots++;return fulfillJson(r,[]);});
  await page.route('**/stock/reconciliation',r=>{reconciliations++;return fulfillJson(r,stockReconciliation);});
  await page.goto('/stock');await page.getByRole('button',{name:'Load lot & integrity details'}).click();
  await expect.poll(()=>lots).toBe(1);await expect.poll(()=>reconciliations).toBe(1);
  await page.getByRole('button',{name:'Refresh Stock'}).click();
  await expect.poll(()=>stock).toBeGreaterThanOrEqual(2);
  await expect.poll(()=>lots).toBeGreaterThanOrEqual(2);
  await expect.poll(()=>reconciliations).toBeGreaterThanOrEqual(2);
 });
 test('TST-026 Authorized stock adjuster opens and closes Opening Stock Import',async({page})=>{
  await loginAsDisposableRole(page,'PW_STOCK_ADJUSTER');
  await mockStockApi(page,r=>fulfillJson(r,stockRows));await page.goto('/stock');
  await page.getByRole('button',{name:'Opening stock setup'}).click();
  await expect(page.getByText('Opening Stock Import',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Hide opening stock setup'}).click();
  await expect(page.getByText('Opening Stock Import',{exact:true})).toHaveCount(0);
 });
 test('TST-027 Stock read-only user has no opening import and cannot post adjustments',async({page})=>{
  await loginAsDisposableRole(page,'PW_STOCK_READ_ONLY');
  await mockStockApi(page,r=>fulfillJson(r,stockRows));await page.goto('/stock');
  await expect(page.getByRole('heading',{name:'Stock workspace'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Opening stock setup'})).toHaveCount(0);
  await selectStockByName(page,'Synthetic Coffee');
  await expect(page.getByRole('button',{name:'Adjust',exact:true})).toBeDisabled();
 });
 test('TST-028 Expanded lot/integrity failure stays in its own error panel',async({page})=>{
  await loginAsTenant(page);await mockStockApi(page,r=>fulfillJson(r,stockRows));
  await page.route('**/stock/lots',r=>fulfillJson(r,{message:'Synthetic lot fetch error'},503));
  await page.route('**/stock/reconciliation',r=>fulfillJson(r,stockReconciliation));
  await page.goto('/stock');await page.getByRole('button',{name:'Load lot & integrity details'}).click();
  await expect(page.getByText('Lot or reconciliation details could not be loaded. Try refreshing this section.')).toBeVisible();
  await expect(positionRows(page)).toHaveCount(5);
 });
 test('TST-029 Expiry selector changes risk window without changing available lot rows',async({page})=>{
  await stockWithLots(page,[lot('pw-lot-early','available',25),lot('pw-lot-late','available',70)]);
  await expect(lotsPanel(page).getByText('Expiring within 30 days')).toBeVisible();
  await page.locator('#expiry-window').selectOption('90');
  await expect(lotsPanel(page).getByText('Expiring within 90 days')).toBeVisible();
  await expect(page.locator('#expiry-window')).toHaveValue('90');
  await expect(lotsPanel(page).locator('tbody tr')).toHaveCount(2);
 });
 test('TST-030 Lot table pagination advances by 100 and returns to first page',async({page})=>{
  const lots=Array.from({length:103},(_,i)=>lot(`pw-lot-${String(i+1).padStart(3,'0')}`,'available'));
  await stockWithLots(page,lots);
  await expect(lotsPanel(page).locator('tbody tr')).toHaveCount(100);
  await lotsPanel(page).getByRole('button',{name:'Next'}).click();
  await expect(lotsPanel(page).locator('tbody tr')).toHaveCount(3);
  await expect(lotsPanel(page).getByText('Showing lot balances 101–103 of 103')).toBeVisible();
  await lotsPanel(page).getByRole('button',{name:'Previous'}).click();
  await expect(lotsPanel(page).locator('tbody tr')).toHaveCount(100);
 });
 test('TST-031 Available, held, quarantined and expired lots show distinct actions',async({page})=>{
  await stockWithLots(page,[lot('pw-available','available'),lot('pw-held','hold'),lot('pw-quarantine','quarantine'),lot('pw-expired','expired',-3)]);
  const rows=lotsPanel(page).locator('tbody tr');
  await expect(rows.filter({hasText:'pw-available'})).toContainText('Block');
  await expect(rows.filter({hasText:'pw-held'})).toContainText('Unblock');
  await expect(rows.filter({hasText:'pw-quarantine'})).toContainText('Release');
  await expect(rows.filter({hasText:'pw-expired'})).toContainText('Expired — cannot release');
 });
 test('TST-032 Hold-lot prompt cancellation and short reason never send POST',async({page})=>{
  let writes=0;await stockWithLots(page,[lot('pw-available','available')]);
  await page.route('**/stock/lots/*/hold',r=>{writes++;return fulfillJson(r,lot('pw-available','hold'));});
  const block=lotsPanel(page).getByRole('button',{name:'Block',exact:true});
  page.once('dialog',dialog=>dialog.dismiss());await block.click();
  page.once('dialog',dialog=>dialog.accept('ab'));await block.click();
  await expect(page.getByText('Please enter at least 3 characters for the reason.')).toBeVisible();
  expect(writes).toBe(0);
 });
 test('TST-033 Valid lot Block sends trimmed reason and presents mocked success',async({page})=>{
  let payload:Record<string,unknown>|null=null;await stockWithLots(page,[lot('pw-available','available')]);
  await page.route('**/stock/lots/*/hold',async r=>{payload=r.request().postDataJSON();await fulfillJson(r,lot('pw-available','hold'));});
  page.once('dialog',dialog=>dialog.accept('  Investigation needed  '));
  await lotsPanel(page).getByRole('button',{name:'Block',exact:true}).click();
  await expect.poll(()=>payload?.reason).toBe('Investigation needed');
  await expect(page.getByText('Stock placed on hold and removed from usable quantity.')).toBeVisible();
 });
 test('TST-034 Held lot Unblock requires at least three characters before release POST',async({page})=>{
  let posts=0;await stockWithLots(page,[lot('pw-held','hold')]);
  await page.route('**/stock/lots/*/release-hold',r=>{posts++;return fulfillJson(r,lot('pw-held','available'));});
  page.once('dialog',dialog=>dialog.accept('no'));
  await lotsPanel(page).getByRole('button',{name:'Unblock'}).click();
  await expect(page.getByText('Please enter at least 3 characters for the reason.')).toBeVisible();
  expect(posts).toBe(0);
 });
 test('TST-035 Quarantine Release does not POST until user accepts confirmation',async({page})=>{
  let posts=0;await stockWithLots(page,[lot('pw-quarantine','quarantine')]);
  await page.route('**/stock/lots/*/release-quarantine',r=>{posts++;return fulfillJson(r,lot('pw-quarantine','available'));});
  const release=lotsPanel(page).getByRole('button',{name:'Release',exact:true});
  page.once('dialog',dialog=>dialog.dismiss());await release.click();expect(posts).toBe(0);
  page.once('dialog',dialog=>dialog.accept());await release.click();
  await expect.poll(()=>posts).toBe(1);
  await expect(page.getByText('Quarantined lot released to available stock.')).toBeVisible();
 });
 test('TST-036 Processing an expired available lot is confirmation-gated',async({page})=>{
  let posts=0;await stockWithLots(page,[lot('pw-expiring','available',-3)]);
  await page.route('**/stock/lots/expire-due',r=>{posts++;return fulfillJson(r,{processed_lot_count:1,processed_quantity:2});});
  const process=page.getByRole('button',{name:/Process Expired Stock \(1\)/});
  await expect(process).toBeEnabled();
  page.once('dialog',dialog=>dialog.dismiss());await process.click();expect(posts).toBe(0);
  page.once('dialog',dialog=>dialog.accept());await process.click();
  await expect.poll(()=>posts).toBe(1);
  await expect(page.getByText('Expired stock processed:',{exact:false})).toBeVisible();
 });
 test('TST-037 Account without stock.read cannot enter protected Stock route',async({page})=>{
  await loginAsDisposableRole(page,'PW_STOCK_NO_READ');await page.goto('/stock');
  await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);
  await expect(page.getByRole('heading',{name:'Stock workspace'})).toHaveCount(0);
 });
 test('TST-038 Consume cannot post without selection or positive quantity',async({page})=>{
  await openStock(page);await expect(page.getByRole('button',{name:'Consume Stock',exact:true})).toBeDisabled();
  await selectStockByName(page,'Synthetic Coffee');await page.locator('#stock-action-quantity').fill('0');
  await expect(page.getByText('Quantity to consume must be greater than zero.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Consume Stock',exact:true})).toBeDisabled();
 });
 test('TST-039 Consume cannot use stock already reserved for other commitments',async({page})=>{
  await openStock(page);await selectStockByName(page,'Synthetic Coffee');
  await page.locator('#stock-action-quantity').fill('29');
  await expect(page.getByText(/Only 28 kg is unreserved/)).toBeVisible();
  await expect(page.getByRole('button',{name:'Consume Stock',exact:true})).toBeDisabled();
 });
 test('TST-040 Physical Count requires valid stock version and nonnegative quantity',async({page})=>{
  await openStock(page,stockRows.map(r=>r.id==='pw-stock-empty'?{...r,version:0}:r));
  await selectStockByName(page,'Synthetic Plates');await page.getByRole('button',{name:'Count',exact:true}).first().click();
  await page.locator('#stock-action-quantity').fill('-1');
  await expect(page.getByText('Counted quantity must be zero or greater.')).toBeVisible();
  await page.locator('#stock-action-quantity').fill('0');
  await expect(page.getByText('Re-enter the physical count after refreshing this stock position.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Apply Physical Count',exact:true})).toBeDisabled();
 });
 test('TST-041 VERSION_CONFLICT in mocked Count POST clears stale count entry',async({page})=>{
  await openStock(page);await selectStockByName(page,'Synthetic Coffee');
  await page.getByRole('button',{name:'Count',exact:true}).first().click();
  await page.locator('#stock-action-quantity').fill('30');
  await page.route('**/stock/count',r=>fulfillJson(r,{error:{code:'VERSION_CONFLICT',message:'Synthetic count version changed'}},409));
  await page.getByRole('button',{name:'Apply Physical Count',exact:true}).click();
  await expect(page.getByText('Synthetic count version changed')).toBeVisible();
  await expect(page.locator('#stock-action-quantity')).toHaveValue('');
  await expect(page.getByRole('heading',{name:'Last Operation Result'})).toHaveCount(0);
 });
 test('TST-042 Increasing tracked stock requires lot/batch and expiry evidence',async({page})=>{
  const tracked={...stockRows[0],requires_lot_tracking:true,requires_expiry_date:true};
  await openStock(page,[tracked]);await selectStockByName(page,'Synthetic Coffee');
  await page.getByRole('button',{name:'Adjust',exact:true}).first().click();
  await page.locator('#stock-adjustment-change').fill('1');
  await expect(page.getByText('This product requires a lot or batch number for added stock.')).toBeVisible();
  await page.locator('#stock-action-lot').fill('PW-TRACK-001');
  await expect(page.getByText('This product requires an expiry date for added stock.')).toBeVisible();
  await page.locator('#stock-action-expiry').fill('2030-05-10');
  await expect(page.getByRole('button',{name:'Manual Adjustment',exact:true})).toBeEnabled();
 });
 test('TST-043 Adjustment of zero or reducing below zero is rejected client-side',async({page})=>{
  await openStock(page);await selectStockByName(page,'Synthetic Coffee');
  await page.getByRole('button',{name:'Adjust',exact:true}).first().click();
  await page.locator('#stock-adjustment-change').fill('0');
  await expect(page.getByText('Adjustment must be a non-zero number.')).toBeVisible();
  await page.locator('#stock-adjustment-change').fill('-31');
  await expect(page.getByText('Adjustment cannot result in negative stock.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Manual Adjustment',exact:true})).toBeDisabled();
 });
 test('TST-044 Adjustment resulting in reserved-stock shortfall needs acknowledgment',async({page})=>{
  await openStock(page);await selectStockByName(page,'Synthetic Coffee');
  await page.getByRole('button',{name:'Adjust',exact:true}).first().click();
  await page.locator('#stock-adjustment-change').fill('-29');
  await expect(page.getByText('Confirm that the adjustment creates a shortage against active reservations.', { exact: true }).last()).toBeVisible();
  const acknowledge=page.getByLabel(/I confirm this physical count or correction is real/);
  await acknowledge.check();
  await expect(page.getByRole('button',{name:'Manual Adjustment',exact:true})).toBeEnabled();
 });
 test('TST-045 Mocked adjustment result shows quantity evidence and refreshed UI',async({page})=>{
  let submitted:Record<string,unknown>|null=null;
  await openStock(page);await selectStockByName(page,'Synthetic Coffee');
  await page.getByRole('button',{name:'Adjust',exact:true}).first().click();
  await page.locator('#stock-adjustment-change').fill('5');
  await page.route('**/stock/adjust',async r=>{submitted=r.request().postDataJSON();await fulfillJson(r,stockResponse(30,35));});
  await page.getByRole('button',{name:'Manual Adjustment',exact:true}).click();
  await expect.poll(()=>submitted?.change).toBe(5);
  await expect(page.getByText('Stock adjustment applied successfully.')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Last Operation Result'})).toBeVisible();
  await expect(page.getByText('35',{exact:true}).first()).toBeVisible();
 });
 test('TST-046 Stock reader without usage.read sees explicit gated usage ledger',async({page})=>{
  await loginAsDisposableRole(page,'PW_STOCK_READ_ONLY');await mockStockApi(page,r=>fulfillJson(r,stockRows));await page.goto('/stock');
  await selectStockByName(page,'Synthetic Coffee');
  await expect(page.getByText('Usage history is unavailable because this role does not have inventory usage read access.')).toBeVisible();
 });
 test('TST-047 Stock reader without stock_movements.read sees movement restriction',async({page})=>{
  await loginAsDisposableRole(page,'PW_STOCK_READ_ONLY');await mockStockApi(page,r=>fulfillJson(r,stockRows));await page.goto('/stock');
  await selectStockByName(page,'Synthetic Coffee');
  await expect(page.getByText('Movement history is unavailable because this role does not have stock movement read access.')).toBeVisible();
  await expect(page.getByRole('link',{name:'Open Full Stock Ledger'})).toHaveCount(0);
 });
 test('TST-048 Filtering away selected stock clears stale action draft',async({page})=>{
  await openStock(page);await selectStockByName(page,'Synthetic Coffee');
  await page.locator('#stock-action-quantity').fill('1');
  await searchField(page).fill('Synthetic Plates');
  await expect(page.getByText('Select a stock position to begin.')).toBeVisible();
  await expect(page.locator('#stock-action-quantity')).toHaveValue('');
 });
 test('TST-049 Effective location par and reserved quantity render different risk badges',async({page})=>{
  await openStock(page);await expect(positionRows(page).filter({hasText:'Synthetic Milk'})).toContainText('LOW STOCK');
  await expect(positionRows(page).filter({hasText:'Synthetic Linens'})).toContainText('LOW AVAILABLE');
  await expect(positionRows(page).filter({hasText:'Synthetic Plates'})).toContainText('NO USABLE STOCK');
  await expect(positionRows(page).filter({hasText:'Synthetic Cleaner'})).toContainText('STOCK / LOT MISMATCH');
 });
 test('TST-050 Mocked stock POST rejection appears next to action without a success result',async({page})=>{
  await openStock(page);await selectStockByName(page,'Synthetic Coffee');
  await page.getByRole('button',{name:'Adjust',exact:true}).first().click();
  await page.locator('#stock-adjustment-change').fill('1');
  await page.route('**/stock/adjust',r=>fulfillJson(r,{error:{code:'SYNTHETIC_VALIDATION',message:'Synthetic action rejection'}},422));
  await page.getByRole('button',{name:'Manual Adjustment',exact:true}).click();
  await expect(page.getByText('Synthetic action rejection')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Last Operation Result'})).toHaveCount(0);
  await expect(page.getByText('Stock adjustment applied successfully.')).toHaveCount(0);
 });
});

// Batch 176: Stock directory source-backed search, combined-filter, deep-link and
// risk-presentation boundaries. All data is synthetic and intercepted; these tests
// only exercise browser-visible client behavior, not backend stock correctness.
test.describe('Stock — directory and risk edge cases (Batch 176)',()=>{
 test('TST-051 Search accepts product unit as well as name',async({page})=>{
  await openStock(page);await searchField(page).fill('kg');
  await expect(positionRows(page)).toHaveCount(1);
  await expect(positionRows(page).first()).toContainText('Synthetic Coffee');
 });
 test('TST-052 Search accepts the underlying product identifier',async({page})=>{
  await openStock(page);await searchField(page).fill('pw-product-linen');
  await expect(positionRows(page)).toHaveCount(1);
  await expect(positionRows(page).first()).toContainText('Synthetic Linens');
 });
 test('TST-053 Search accepts the underlying storage-location identifier',async({page})=>{
  await openStock(page);await searchField(page).fill('pw-location-storage');
  await expect(positionRows(page)).toHaveCount(1);
  await expect(positionRows(page).first()).toContainText('Synthetic Cleaner');
 });
 test('TST-054 Search matches category text as a separate searchable field',async({page})=>{
  await openStock(page);await searchField(page).fill('Supplies');
  await expect(positionRows(page)).toHaveCount(1);
  await expect(positionRows(page).first()).toContainText('Synthetic Plates');
 });
 test('TST-055 Name-prefix matches sort before other substring matches',async({page})=>{
  const rows=[
   {...stockRows[0],id:'pw-stock-nonprefix',product_id:'pw-product-nonprefix',product_name:'Dark Coffee'},
   {...stockRows[0],id:'pw-stock-beans',product_id:'pw-product-beans',product_name:'Coffee Beans'},
   {...stockRows[0],id:'pw-stock-brew',product_id:'pw-product-brew',product_name:'Coffee Brewer'}
  ];
  await openStock(page,rows);await searchField(page).fill('coffee');
  await expect(positionRows(page)).toHaveCount(3);
  await expect(positionRows(page).nth(0)).toContainText('Coffee Beans');
  await expect(positionRows(page).nth(1)).toContainText('Coffee Brewer');
  await expect(positionRows(page).nth(2)).toContainText('Dark Coffee');
 });
 test('TST-056 Whitespace-only search is inactive even before clearing the input',async({page})=>{
  await openStock(page);await searchField(page).fill('   ');
  await expect(positionRows(page)).toHaveCount(5);
  await expect(page.getByRole('button',{name:'Clear Stock Filters'})).toBeDisabled();
 });
 test('TST-057 Category, location and mismatch filters intersect instead of unioning',async({page})=>{
  await openStock(page);
  await page.locator('#stock-category-filter').selectOption('Cleaning');
  await page.locator('#stock-location-filter').selectOption('pw-location-storage');
  await statusSelect(page).selectOption('integrity-risk');
  await expect(positionRows(page)).toHaveCount(1);
  await expect(positionRows(page).first()).toContainText('Synthetic Cleaner');
  await expect(positionRows(page).first()).toContainText('STOCK / LOT MISMATCH');
 });
 test('TST-058 Contradictory category and status yields zero, then clear restores all',async({page})=>{
  await openStock(page);
  await page.locator('#stock-category-filter').selectOption('Dairy');
  await statusSelect(page).selectOption('integrity-risk');
  await expect(positionRows(page)).toHaveCount(0);
  await expect(page.getByText('No stock positions match the current search and filters.')).toBeVisible();
  await page.getByRole('button',{name:'Clear Stock Filters'}).click();
  await expect(positionRows(page)).toHaveCount(5);
  await expect(statusSelect(page)).toHaveValue('all');
 });
 test('TST-059 Location choices are alphabetized by human-readable label',async({page})=>{
  await openStock(page);
  await expect(page.locator('#stock-location-filter option')).toHaveText([
   'All locations','Bar','Kitchen','Main Warehouse','Service Room','Storage Room'
  ]);
 });
 test('TST-060 Category choices are alphabetized and unique',async({page})=>{
  const rows=[...stockRows,{...stockRows[0],id:'pw-duplicate-category'}];
  await openStock(page,rows);
  await expect(page.locator('#stock-category-filter option')).toHaveText([
   'All categories','Beverages','Cleaning','Dairy','Housekeeping','Supplies'
  ]);
 });
 test('TST-061 Missing product/location labels use safe directory fallbacks',async({page})=>{
  const row={...stockRows[0],id:'pw-missing-labels',product_name:null,storage_location_name:null,product_unit:null};
  await openStock(page,[row]);
  await expect(positionRows(page)).toHaveCount(1);
  await expect(positionRows(page).first()).toContainText('Unnamed product');
  await expect(positionRows(page).first()).toContainText('Unknown location');
  await expect(positionRows(page).first().locator('td').nth(7)).toHaveText('-');
 });
 test('TST-062 Product deep link shows the same product at multiple locations',async({page})=>{
  const rows=[...stockRows,{...stockRows[0],id:'pw-stock-coffee-extra',storage_location_id:'pw-location-kitchen',storage_location_name:'Kitchen'}];
  await openStock(page,rows,'/stock?product_id=pw-product-coffee');
  await expect(positionRows(page)).toHaveCount(2);
  await expect(positionRows(page).nth(0)).toContainText('Synthetic Coffee');
  await expect(positionRows(page).nth(1)).toContainText('Synthetic Coffee');
  await expect(page.getByText('Linked product filter active',{exact:false})).toBeVisible();
 });
 test('TST-063 Product and stock deep-link keys must both match a single position',async({page})=>{
  await openStock(page,stockRows,'/stock?product_id=pw-product-coffee&stock_id=pw-stock-milk');
  await expect(positionRows(page)).toHaveCount(0);
  await expect(page.getByText('No stock positions match the current search and filters.')).toBeVisible();
  await expect(page.getByText('Select a stock position to begin.')).toBeVisible();
 });
 test('TST-064 Unknown linked stock gives zero rows and Clear restores the directory',async({page})=>{
  await openStock(page,stockRows,'/stock?stock_id=pw-unknown-stock');
  await expect(positionRows(page)).toHaveCount(0);
  await page.getByRole('button',{name:'Clear Stock Filters'}).click();
  await expect(positionRows(page)).toHaveCount(5);
  await expect(page).not.toHaveURL(/stock_id=/);
 });
 test('TST-065 Clearing linked stock preserves unrelated URL query keys',async({page})=>{
  await openStock(page,stockRows,'/stock?stock_id=pw-stock-milk&view=compact');
  await expect(positionRows(page)).toHaveCount(1);
  await page.getByRole('button',{name:'Clear Stock Filters'}).click();
  await expect(page).toHaveURL(/view=compact/);
  await expect(page).not.toHaveURL(/stock_id=/);
  await expect(positionRows(page)).toHaveCount(5);
 });
 test('TST-066 Over-reserved position has distinct badge and matches reservation risk',async({page})=>{
  const row={...stockRows[0],id:'pw-over-reserved',quantity:3,reserved_quantity:5,available_lot_quantity:3,usable_lot_quantity:3,effective_min_quantity:0};
  await openStock(page,[row]);
  await expect(positionRows(page).first()).toContainText('OVER-RESERVED');
  await statusSelect(page).selectOption('reserved-risk');
  await expect(positionRows(page)).toHaveCount(1);
 });
 test('TST-067 Stock/lot mismatch badge takes precedence over a low-stock warning',async({page})=>{
  const row={...stockRows[0],id:'pw-low-mismatch',quantity:4,available_lot_quantity:3,usable_lot_quantity:3,effective_min_quantity:8};
  await openStock(page,[row]);
  await expect(positionRows(page).first()).toContainText('STOCK / LOT MISMATCH');
  await statusSelect(page).selectOption('low');
  await expect(positionRows(page)).toHaveCount(1);
  await statusSelect(page).selectOption('integrity-risk');
  await expect(positionRows(page)).toHaveCount(1);
 });
 test('TST-068 Zero usable-lot quantity flags an otherwise positive position as empty',async({page})=>{
  const row={...stockRows[0],id:'pw-no-usable',quantity:4,reserved_quantity:0,available_lot_quantity:4,usable_lot_quantity:0,effective_min_quantity:0};
  await openStock(page,[row]);
  await expect(positionRows(page).first()).toContainText('NO USABLE STOCK');
  await statusSelect(page).selectOption('empty');
  await expect(positionRows(page)).toHaveCount(1);
 });
 test('TST-069 Explicit effective minimum overrides older product minimum',async({page})=>{
  const row={...stockRows[0],id:'pw-effective-min',quantity:4,reserved_quantity:0,available_lot_quantity:4,usable_lot_quantity:4,min_quantity:10,effective_min_quantity:0};
  await openStock(page,[row]);
  await expect(positionRows(page).first()).toContainText('HEALTHY');
  await expect(positionRows(page).first().locator('td').nth(6)).toHaveText('0');
  await statusSelect(page).selectOption('low');
  await expect(positionRows(page)).toHaveCount(0);
 });
 test('TST-070 Usable-free evidence overrides naive on-hand-minus-reserved availability',async({page})=>{
  const row={...stockRows[0],id:'pw-free-override',quantity:10,reserved_quantity:0,usable_free_quantity:1,available_lot_quantity:10,usable_lot_quantity:10,effective_min_quantity:5};
  await openStock(page,[row]);
  await expect(positionRows(page).first()).toContainText('LOW AVAILABLE');
  await expect(positionRows(page).first().locator('td').nth(5)).toHaveText('1');
  await statusSelect(page).selectOption('reserved-risk');
  await expect(positionRows(page)).toHaveCount(1);
 });
});
