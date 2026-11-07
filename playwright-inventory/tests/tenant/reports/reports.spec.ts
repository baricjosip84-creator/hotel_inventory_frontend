import { test, expect, type Page, type Route } from '../../../support/liveOriginalSafeTest';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 33 — Reports is read-only. Synthetic GETs confirm observable browser contracts,
// NOT report SQL correctness, backend permission enforcement, or PDF/CSV generation.
type Call={method:string;endpoint:string;query:string};
type Options={ rows?:Record<string,unknown>; status?:Record<string,number> };
const valuation={rows:[],totals:{row_count:0,estimated_inventory_value:0,currency_code:'EUR'}};
const procurement={shipments:{total_shipments:0,pending_shipments:0,partial_shipments:0,received_shipments:0,overdue_shipments:0},
 lines:{total_active_shipment_lines:0,quantity_by_unit:{}}};
const choices={categories:['Food','Tools'],products:['Soap'],locations:['Main store','Kitchen'],
 current_locations:['Main store','Kitchen'],suppliers:['Supplier A'],departments:['Front desk']};
const defaults:Record<string,unknown>={
 'filter-options':choices,'inventory-valuation':valuation,'procurement-summary':procurement,
 'stock-by-location':[], 'product-movements':[], 'movement-ledger':[], 'inventory-variance':[],
 'stock-transfer-activity':[], 'requisition-activity':[], 'purchase-order-commitments':[],
 'purchasing-spend':[], 'low-stock':[], 'slow-moving':[], 'usage-summary':[],
 'supplier-performance':[], 'expiry-risk':[], 'forecast':[]
};
async function openReports(page:Page,opts:Options={}){
 await loginAsTenant(page);
 const calls:Call[]=[];
 await page.route('**/reports/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const request=route.request(),url=new URL(request.url()), endpoint=url.pathname.split('/reports/')[1];
  if(!endpoint)return route.continue();
  calls.push({method:request.method(),endpoint,query:url.search});
  if(request.method()!=='GET')return fulfillJson(route,{message:'Read-only report API'},405);
  return fulfillJson(route,opts.status?.[endpoint]?{message:'Synthetic reports error'}:(opts.rows?.[endpoint]??defaults[endpoint]??[]),opts.status?.[endpoint]??200);
 });
 await page.goto('/reports');
 await expect(page.getByRole('heading',{name:'Management reporting workspace'})).toBeVisible();
 return calls;
}
const panel=(page:Page,key:string)=>page.locator(`#reports-panel-${key}`);
const tab=(page:Page,key:string)=>page.locator(`#reports-tab-${key}`);
const gets=(calls:Call[],key:string)=>calls.filter(x=>x.endpoint===key&&x.method==='GET');
async function selectReport(page:Page,key:string){
 await tab(page,key).click();await expect(panel(page,key)).toBeVisible();
}
async function chooseFilter(page:Page,key:string,index:number,value:string){
 const picker=panel(page,key).locator('.reports-picker').nth(index);
 await picker.getByRole('combobox').click();await picker.getByRole('option',{name:value,exact:true}).click();
}

test.describe('Tenant Reports — report picker, data and query boundaries (Batch 33)',()=>{
 test('TRPT-001 Initial report opens Inventory Valuation and requests unfiltered overview cards',async({page})=>{
  const calls=await openReports(page);
  await expect(panel(page,'inventory-valuation')).toBeVisible();
  await expect(page.getByLabel('Reporting overview')).toContainText('Estimated inventory value');
  for(const path of ['inventory-valuation','procurement-summary','low-stock'])await expect.poll(()=>gets(calls,path).length).toBeGreaterThan(0);
  expect(gets(calls,'inventory-valuation')[0].query).toBe('');
 });
 test('TRPT-002 Reports filter option lookup supplies category and location choices',async({page})=>{
  const calls=await openReports(page);
  await expect.poll(()=>gets(calls,'filter-options').length).toBe(1);
  const picker=panel(page,'inventory-valuation').locator('.reports-picker').first();
  await picker.getByRole('combobox').click();
  await expect(picker.getByRole('option',{name:'Food'})).toBeVisible();
 });
 test('TRPT-003 Report tab list contains distinct sourced report categories',async({page})=>{
  await openReports(page);
  for(const key of ['inventory-valuation','stock-by-location','product-movements','movement-ledger','inventory-variance',
    'stock-transfer-activity','requisition-activity','procurement-summary','purchase-order-commitments',
    'purchasing-spend','low-stock','slow-moving','usage-summary','supplier-performance','expiry-risk','forecast']){
   await expect(tab(page,key)).toBeVisible();
  }
  await expect(tab(page,'inventory-valuation')).toHaveAttribute('aria-controls','reports-panel-inventory-valuation');
 });
 test('TRPT-004 Inventory valuation empty state explains filtered absence of stocked rows',async({page})=>{
  await openReports(page);await expect(panel(page,'inventory-valuation')).toContainText('No stocked inventory rows matched these filters.');
 });
 test('TRPT-005 Inventory valuation table uses product, unit and cost source evidence',async({page})=>{
  await openReports(page,{rows:{'inventory-valuation':{rows:[{product_id:'pw-p1',storage_location_id:'pw-l1',
   product_name:'Synthetic detergent',product_category:'Tools',storage_location_name:'Main store',quantity:4,
   product_unit:'bottle',estimated_unit_cost:2.5,estimated_total_value:10,currency_code:'EUR',
   estimated_cost_source:'last_receipt',updated_at:'2026-11-03T12:00:00Z'}],totals:{row_count:1,estimated_inventory_value:10,currency_code:'EUR'}}}});
  const row=panel(page,'inventory-valuation').locator('tbody tr');
  await expect(row).toContainText('Synthetic detergent');await expect(row).toContainText('bottle');
  await expect(row).toContainText('Main store');
 });
 test('TRPT-006 Category filter updates valuation query and Clear filters removes it',async({page})=>{
  const calls=await openReports(page);await chooseFilter(page,'inventory-valuation',0,'Food');
  await expect.poll(()=>gets(calls,'inventory-valuation').at(-1)?.query).toContain('category=Food');
  await panel(page,'inventory-valuation').getByRole('button',{name:'Clear filters'}).click();
  await expect.poll(()=>gets(calls,'inventory-valuation').at(-1)?.query).toBe('');
 });
 test('TRPT-007 Location filter passes location to valuation endpoint without changing KPI query',async({page})=>{
  const calls=await openReports(page);await chooseFilter(page,'inventory-valuation',1,'Kitchen');
  await expect.poll(()=>gets(calls,'inventory-valuation').at(-1)?.query).toContain('location=Kitchen');
  await expect(page.getByLabel('Reporting overview')).toContainText('Estimated inventory value');
 });
 test('TRPT-008 Stock by Location opens its own report and invokes location aggregate API',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'stock-by-location');
  await expect.poll(()=>gets(calls,'stock-by-location').length).toBeGreaterThan(0);
  await expect(panel(page,'stock-by-location')).toContainText('No stock locations matched these filters.');
 });
 test('TRPT-009 Product Movements uses default server result limit 50',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'product-movements');
  await expect.poll(()=>gets(calls,'product-movements').at(-1)?.query).toContain('limit=50');
  await expect(panel(page,'product-movements')).toContainText('No products matched the movement report filters.');
 });
 test('TRPT-010 Movement Ledger sends separate result limit 100 on report switch',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'movement-ledger');
  await expect.poll(()=>gets(calls,'movement-ledger').at(-1)?.query).toContain('limit=100');
  await expect(panel(page,'movement-ledger').getByRole('button',{name:'Export CSV'})).toBeVisible();
 });
 test('TRPT-011 Inventory count variance uses its dedicated read endpoint',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'inventory-variance');
  await expect.poll(()=>gets(calls,'inventory-variance').length).toBeGreaterThan(0);
  expect(gets(calls,'inventory-variance')[0].query).toContain('limit=100');
 });
 test('TRPT-012 Stock transfer activity loads its own read-only report',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'stock-transfer-activity');
  await expect.poll(()=>gets(calls,'stock-transfer-activity').at(-1)?.query).toContain('status=all');
  expect(calls.some(c=>c.method!=='GET')).toBe(false);
 });
 test('TRPT-013 Requisition activity requests department and lifecycle report separately',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'requisition-activity');
  await expect.poll(()=>gets(calls,'requisition-activity').at(-1)?.query).toContain('status=all');
  await expect(panel(page,'requisition-activity')).toBeVisible();
 });
 test('TRPT-014 Procurement summary renders shipment status counts and unit evidence',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'procurement-summary');
  await expect.poll(()=>gets(calls,'procurement-summary').length).toBeGreaterThan(0);
  await expect(panel(page,'procurement-summary').getByRole('heading',{name:'Shipments'})).toBeVisible();
  await expect(panel(page,'procurement-summary')).toContainText('Shipment lines');
 });
 test('TRPT-015 PO commitments defaults to open status and independent limit 100',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'purchase-order-commitments');
  await expect.poll(()=>gets(calls,'purchase-order-commitments').at(-1)?.query).toContain('status=open');
  expect(gets(calls,'purchase-order-commitments').at(-1)?.query).toContain('limit=100');
 });
 test('TRPT-016 Purchasing and Spend uses report-specific read endpoint and limit',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'purchasing-spend');
  await expect.poll(()=>gets(calls,'purchasing-spend').at(-1)?.query).toContain('limit=100');
  await expect(panel(page,'purchasing-spend')).toBeVisible();
 });
 test('TRPT-017 Shortage report requests both product and location-par threshold scopes',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'low-stock');
  await expect.poll(()=>gets(calls,'low-stock').at(-1)?.query).toContain('scope=both');
  await expect(panel(page,'low-stock')).toContainText('No product-minimum or active location par-level shortages');
 });
 test('TRPT-018 Slow and non-moving report uses 90-day inactivity default',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'slow-moving');
  await expect.poll(()=>gets(calls,'slow-moving').at(-1)?.query).toContain('days=90');
  expect(gets(calls,'slow-moving').at(-1)?.query).toContain('limit=100');
 });
 test('TRPT-019 Usage and consumption report uses 30-day quick period by default',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'usage-summary');
  await expect.poll(()=>gets(calls,'usage-summary').at(-1)?.query).toContain('days=30');
  await expect(panel(page,'usage-summary')).toBeVisible();
 });
 test('TRPT-020 Supplier performance uses independent report read with 100-row limit',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'supplier-performance');
  await expect.poll(()=>gets(calls,'supplier-performance').at(-1)?.query).toContain('limit=100');
  await expect(panel(page,'supplier-performance').getByRole('button',{name:'Print'})).toBeVisible();
 });
});

// Batch 34 — independent source-traced report boundaries. Exports are intercepted as
// synthetic bytes; no assertion here proves server PDF/CSV generation or SQL results.
const filterCombo=(page:Page,key:string,label:string)=>panel(page,key).locator('.reports-filter-bar .reports-picker').filter({has:page.locator('.reports-picker-label', {hasText:label})}).getByRole('combobox');
async function pick(page:Page,key:string,label:string,option:string){
 const combo=filterCombo(page,key,label);await combo.click();
 await panel(page,key).getByRole('option',{name:option,exact:true}).click();
}
async function reportExportFixture(page:Page, opts:{error?:number, limit?:boolean}={}){
 const calls=await openReports(page);const downloaded:string[]=[];
 await page.route('**/reports/**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const u=new URL(route.request().url()),format=u.searchParams.get('format');
  if(!format)return route.fallback();
  downloaded.push(u.pathname+u.search);
  if(opts.error)return fulfillJson(route,{message:'Synthetic export unavailable'},opts.error);
  return route.fulfill({status:200,contentType:format==='pdf'?'application/pdf':'text/csv',
   headers:{'X-Report-Exported-Rows':'2','X-Report-Source-Rows':opts.limit?'90':'2',
   'X-Report-Row-Limit':opts.limit?'50':'500','X-Report-Row-Limit-Applied':opts.limit?'true':'false',
   'Content-Disposition':`attachment; filename="synthetic-report.${format}"`},
   body:format==='pdf'?'%PDF-1.4\n% Synthetic report fixture\n':'name,quantity\nSynthetic,2\n'});
 });
 return {calls,downloaded};
}
async function disabledSubscription(page:Page,feature:'reports'|'forecasting'){
 await page.route('**/tenants/subscription-access',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  return fulfillJson(route,{tenant:{id:'pw-tenant',name:'Synthetic',status:'active',billing_status:'active',plan_code:'synthetic',trial_ends_at:null,current_period_ends_at:null},
   write_access:{allowed:true,blocker:null},plan_usage:[],plan_limit_blocked_resources:[],
   feature_entitlements:[{feature:'reports',allowed:feature!=='reports',reason:'Synthetic reports not entitled'},
    {feature:'forecasting',allowed:feature!=='forecasting',reason:'Synthetic forecast not entitled'}]});
 });
 await page.reload();
}

test.describe('Tenant Reports — exports, filters, entitlement and keyboard (Batch 34)',()=>{
 test('TRPT-021 Expiry horizon changes its GET days and retains already-expired explanation',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'expiry-risk');
  await pick(page,'expiry-risk','Expiry horizon','Next 60 days');
  await expect.poll(()=>gets(calls,'expiry-risk').at(-1)?.query).toContain('days=60');
  await expect(panel(page,'expiry-risk')).toContainText('Already expired positive-balance lots are always included.');
 });
 test('TRPT-022 Insights-restricted role cannot activate the Forecast tab',async({page})=>{
  // Requires an independent disposable role without Insights Read (not a browser-mocked permission).
  const {loginAsDisposableRole}=await import('../../../support/roleSession');
  await loginAsDisposableRole(page,'PW_REPORTS_NO_INSIGHTS');
  await page.route('**/reports/**',async(route:Route)=>route.request().isNavigationRequest()?route.continue():fulfillJson(route,defaults[new URL(route.request().url()).pathname.split('/reports/')[1]]??[]));
  await page.goto('/reports');await expect(tab(page,'forecast')).toBeDisabled();
  await expect(panel(page,'forecast')).toHaveCount(0);
 });
 test('TRPT-023 CSV export includes active valuation category and format parameter',async({page})=>{
  const {downloaded}=await reportExportFixture(page);await chooseFilter(page,'inventory-valuation',0,'Food');
  await panel(page,'inventory-valuation').getByRole('button',{name:'Export CSV'}).click();
  await expect.poll(()=>downloaded.length).toBe(1);
  const url=new URL(downloaded[0],'https://disposable.example');
  expect(url.pathname).toMatch(/\/reports\/inventory-valuation$/);expect(url.searchParams.get('category')).toBe('Food');expect(url.searchParams.get('format')).toBe('csv');
  await expect(page.getByRole('status').filter({hasText:'CSV ready:'})).toBeVisible();
 });
 test('TRPT-024 PDF action requests a PDF for the selected report and shows completion',async({page})=>{
  const {downloaded}=await reportExportFixture(page);await selectReport(page,'supplier-performance');
  await panel(page,'supplier-performance').getByRole('button',{name:'Download PDF'}).click();
  await expect.poll(()=>downloaded.length).toBe(1);
  expect(downloaded[0]).toContain('/reports/supplier-performance');expect(downloaded[0]).toContain('format=pdf');
  await expect(page.getByRole('status').filter({hasText:'PDF ready:'})).toBeVisible();
 });
 test('TRPT-025 Download metadata displays exported rows and row-limit warning',async({page})=>{
  await reportExportFixture(page,{limit:true});
  await panel(page,'inventory-valuation').getByRole('button',{name:'Export CSV'}).click();
  const msg=page.getByRole('status').filter({hasText:'CSV ready:'});
  await expect(msg).toContainText('2 rows exported');await expect(msg).toContainText('90 rows');await expect(msg).toContainText('limit of 50');
 });
 test('TRPT-026 Failed export shows error and Clear message removes it',async({page})=>{
  await reportExportFixture(page,{error:503});
  await panel(page,'inventory-valuation').getByRole('button',{name:'Export CSV'}).click();
  const alert=page.getByRole('alert').filter({hasText:'Export/print failed:'});
  await expect(alert).toContainText('Synthetic export unavailable');
  await alert.getByRole('button',{name:'Clear message'}).click();await expect(alert).toHaveCount(0);
 });
 test('TRPT-027 Browser popup refusal provides a visible print-specific explanation',async({page})=>{
  await openReports(page);
  await page.evaluate(()=>{window.open=(()=>null) as typeof window.open;});
  await panel(page,'inventory-valuation').getByRole('button',{name:'Print'}).click();
  await expect(page.getByRole('alert')).toContainText('browser blocked the print window');
 });
 test('TRPT-028 Print opens cloned report panel with CSS hiding controls',async({page})=>{
  await openReports(page);
  await page.context().addInitScript(()=>{window.print=()=>{};});
  const popupPromise=page.waitForEvent('popup');
  await panel(page,'inventory-valuation').getByRole('button',{name:'Print'}).click();
  const popup=await popupPromise;
  await expect(popup.locator('#reports-panel-inventory-valuation')).toHaveCount(1);
  await expect(popup.locator('style').filter({hasText:'data-report-controls'})).toContainText('[data-report-controls="true"],button,input,select{display:none!important}');
  await popup.close();
 });
 test('TRPT-029 Switching report tabs clears prior successful export feedback',async({page})=>{
  await reportExportFixture(page);await panel(page,'inventory-valuation').getByRole('button',{name:'Export CSV'}).click();
  await expect(page.getByRole('status').filter({hasText:'CSV ready:'})).toBeVisible();
  await selectReport(page,'stock-by-location');
  await expect(page.getByRole('status').filter({hasText:'CSV ready:'})).toHaveCount(0);
 });
 test('TRPT-030 Clearing historical custom location resets search mode and query',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'stock-transfer-activity');
  await pick(page,'stock-transfer-activity','Location','Other or historical location…');
  const manual=panel(page,'stock-transfer-activity').getByRole('textbox',{name:'Enter a historical location or search term'});
  await manual.fill('Closed warehouse');await expect.poll(()=>gets(calls,'stock-transfer-activity').at(-1)?.query).toContain('location=Closed+warehouse');
  await panel(page,'stock-transfer-activity').getByRole('button',{name:'Clear filters'}).click();
  await expect(manual).toHaveCount(0);await expect.poll(()=>gets(calls,'stock-transfer-activity').at(-1)?.query).not.toContain('location=');
 });
 test('TRPT-031 Product movement From/To dates are sent separately to GET',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'product-movements');
  await panel(page,'product-movements').getByLabel('From').fill('2026-01-02');
  await panel(page,'product-movements').getByLabel('To').fill('2026-01-31');
  await expect.poll(()=>gets(calls,'product-movements').at(-1)?.query).toContain('from=2026-01-02');
  await expect.poll(()=>gets(calls,'product-movements').at(-1)?.query).toContain('to=2026-01-31');
 });
 test('TRPT-032 Date range bounds prevent a To date earlier than From',async({page})=>{
  await openReports(page);await selectReport(page,'product-movements');
  const from=panel(page,'product-movements').getByLabel('From');const to=panel(page,'product-movements').getByLabel('To');
  await from.fill('2026-07-15');await expect(to).toHaveAttribute('min','2026-07-15');
  await to.fill('2026-08-31');await expect(from).toHaveAttribute('max','2026-08-31');
 });
 test('TRPT-033 Ledger movement-type option sends exact backend movement_type enum',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'movement-ledger');
  await pick(page,'movement-ledger','Movement type','Shipment receipt');
  await expect.poll(()=>gets(calls,'movement-ledger').at(-1)?.query).toContain('movement_type=shipment_receive');
 });
 test('TRPT-034 Historical ledger location allows text fallback when options are empty',async({page})=>{
  const calls=await openReports(page,{rows:{'filter-options':{...choices,locations:[]}}});await selectReport(page,'movement-ledger');
  await panel(page,'movement-ledger').getByRole('textbox',{name:'Location'}).fill('Legacy warehouse');
  await expect.poll(()=>gets(calls,'movement-ledger').at(-1)?.query).toContain('location=Legacy+warehouse');
 });
 test('TRPT-035 Count variance changes result limit and dates independently',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'inventory-variance');
  await pick(page,'inventory-variance','Result limit','200');
  await panel(page,'inventory-variance').getByLabel('From').fill('2026-01-05');
  await expect.poll(()=>gets(calls,'inventory-variance').at(-1)?.query).toContain('limit=200');
  await expect.poll(()=>gets(calls,'inventory-variance').at(-1)?.query).toContain('from=2026-01-05');
 });
 test('TRPT-036 Stock transfer status filter requests executed transfers only',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'stock-transfer-activity');
  await pick(page,'stock-transfer-activity','Status','Executed');
  await expect.poll(()=>gets(calls,'stock-transfer-activity').at(-1)?.query).toContain('status=executed');
 });
 test('TRPT-037 Requisition department/status/limit compose one request',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'requisition-activity');
  await pick(page,'requisition-activity','Department','Front desk');
  await pick(page,'requisition-activity','Status','Approved');
  await pick(page,'requisition-activity','Result limit','200');
  await expect.poll(()=>gets(calls,'requisition-activity').at(-1)?.query).toContain('limit=200');
  const q=gets(calls,'requisition-activity').at(-1)?.query??'';expect(q).toContain('department=Front+desk');expect(q).toContain('status=approved');
 });
 test('TRPT-038 Procurement supplier selection updates report GET and CSV export',async({page})=>{
  const {calls,downloaded}=await reportExportFixture(page);await selectReport(page,'procurement-summary');
  await pick(page,'procurement-summary','Supplier','Supplier A');
  await expect.poll(()=>gets(calls,'procurement-summary').at(-1)?.query).toContain('supplier=Supplier+A');
  await panel(page,'procurement-summary').getByRole('button',{name:'Export CSV'}).click();
  await expect.poll(()=>downloaded.length).toBe(1);expect(downloaded[0]).toContain('supplier=Supplier+A');
 });
 test('TRPT-039 PO commitments filters product and selected status',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'purchase-order-commitments');
  await pick(page,'purchase-order-commitments','Product','Soap');
  await pick(page,'purchase-order-commitments','Status','Approved');
  await expect.poll(()=>gets(calls,'purchase-order-commitments').at(-1)?.query).toContain('status=approved');
  expect(gets(calls,'purchase-order-commitments').at(-1)?.query).toContain('product=Soap');
  await panel(page,'purchase-order-commitments').getByRole('button',{name:'Clear filters'}).click();
  await expect.poll(()=>gets(calls,'purchase-order-commitments').at(-1)?.query).toContain('status=open');
 });
 test('TRPT-040 Purchasing & Spend sends supplier and category historical filters',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'purchasing-spend');
  await pick(page,'purchasing-spend','Supplier','Supplier A');await pick(page,'purchasing-spend','Category','Food');
  await expect.poll(()=>gets(calls,'purchasing-spend').at(-1)?.query).toContain('category=Food');
  expect(gets(calls,'purchasing-spend').at(-1)?.query).toContain('supplier=Supplier+A');
 });
 test('TRPT-041 Product-minimum shortage scope excludes and disables location selector',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'low-stock');
  await pick(page,'low-stock','Threshold scope','Product minimum only');
  await expect(filterCombo(page,'low-stock','Location')).toBeDisabled();
  await expect.poll(()=>gets(calls,'low-stock').at(-1)?.query).toContain('scope=product');
  expect(gets(calls,'low-stock').at(-1)?.query).not.toContain('location=');
 });
 test('TRPT-042 Location-par shortage scope enables location filter and sends it',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'low-stock');
  await pick(page,'low-stock','Threshold scope','Location par levels only');
  await expect(filterCombo(page,'low-stock','Location')).toBeEnabled();
  await pick(page,'low-stock','Location','Kitchen');
  await expect.poll(()=>gets(calls,'low-stock').at(-1)?.query).toContain('location=Kitchen');
  expect(gets(calls,'low-stock').at(-1)?.query).toContain('scope=par');
 });
 test('TRPT-043 Supplier performance filters selected date and supplier',async({page})=>{
  const calls=await openReports(page);await selectReport(page,'supplier-performance');
  await panel(page,'supplier-performance').getByLabel('From').fill('2026-01-01');
  await pick(page,'supplier-performance','Supplier','Supplier A');
  await expect.poll(()=>gets(calls,'supplier-performance').at(-1)?.query).toContain('supplier=Supplier+A');
  expect(gets(calls,'supplier-performance').at(-1)?.query).toContain('from=2026-01-01');
 });
 test('TRPT-044 Expiry risk displays per-lot status rather than merging expired/upcoming',async({page})=>{
  await openReports(page,{rows:{'expiry-risk':[
   {inventory_lot_id:'pw-1',product_id:'pw-p',product_name:'Synthetic milk',storage_location_name:'Kitchen',expiry_date:'2020-01-01',condition:'sealed',quantity:2,risk_status:'expired'},
   {inventory_lot_id:'pw-2',product_id:'pw-p',product_name:'Synthetic milk',storage_location_name:'Kitchen',expiry_date:'2030-01-01',condition:'sealed',quantity:3,risk_status:'upcoming'}
  ]}});await selectReport(page,'expiry-risk');
  await expect(panel(page,'expiry-risk').locator('tbody tr')).toHaveCount(2);
  await expect(panel(page,'expiry-risk').locator('.reports-risk--expired')).toHaveText('Expired');
  await expect(panel(page,'expiry-risk').locator('.reports-risk--upcoming')).toHaveText('Upcoming');
 });
 test('TRPT-045 Forecast entitlement denial disables Forecast and prevents request',async({page})=>{
  const calls=await openReports(page);await disabledSubscription(page,'forecasting');
  await expect(tab(page,'forecast')).toBeDisabled();await expect(panel(page,'forecast')).toHaveCount(0);
  expect(gets(calls,'forecast')).toHaveLength(0);
 });
 test('TRPT-046 Allowed forecast tab shows read-only result and export actions',async({page})=>{
  const calls=await openReports(page,{rows:{forecast:[{product_id:'pw',product_name:'Synthetic plates',product_unit:'pieces',avg_daily_usage:3.5}]}});
  await selectReport(page,'forecast');await expect.poll(()=>gets(calls,'forecast').length).toBeGreaterThan(0);
  await expect(panel(page,'forecast')).toContainText('Synthetic plates');
  await expect(panel(page,'forecast').getByRole('button',{name:'Export CSV'})).toBeEnabled();
  expect(calls.every(c=>c.method==='GET')).toBe(true);
 });
 test('TRPT-047 Reports entitlement denial replaces report workspace with access state',async({page})=>{
  const calls=await openReports(page);await disabledSubscription(page,'reports');
  await expect(page.getByRole('heading',{name:'Reports are not enabled'})).toBeVisible();
  await expect(panel(page,'inventory-valuation')).toHaveCount(0);
  expect(calls.filter(x=>x.method!=='GET')).toHaveLength(0);
 });
 test('TRPT-048 403 on report datasets displays access-required state',async({page})=>{
  await openReports(page);
  await page.route('**/reports/inventory-valuation**',async(route:Route)=>route.request().isNavigationRequest()?route.continue():fulfillJson(route,{message:'Synthetic access denied'},403));
  await page.reload();
  await expect(page.getByRole('heading',{name:'Reports access required'})).toBeVisible();
  await expect(panel(page,'inventory-valuation')).toHaveCount(0);
 });
 test('TRPT-049 Report-specific 503 displays failure in the active panel',async({page})=>{
  await openReports(page,{status:{'supplier-performance':503}});await selectReport(page,'supplier-performance');
  await expect(panel(page,'supplier-performance').locator('.reports-error')).toContainText('Failed to load supplier performance');
  await expect(panel(page,'supplier-performance').getByRole('button',{name:'Refresh'})).toBeEnabled();
 });
 test('TRPT-050 Tab arrows and Home/End update active panel and keyboard focus',async({page})=>{
  await openReports(page);await tab(page,'inventory-valuation').focus();
  await page.keyboard.press('ArrowRight');await expect(panel(page,'stock-by-location')).toBeVisible();
  await expect(tab(page,'stock-by-location')).toBeFocused();
  await page.keyboard.press('End');
  const last=await tab(page,'forecast').isDisabled()?'expiry-risk':'forecast';
  await expect(tab(page,last)).toBeFocused();await expect(panel(page,last)).toBeVisible();
  await page.keyboard.press('Home');await expect(tab(page,'inventory-valuation')).toBeFocused();
 });
});
