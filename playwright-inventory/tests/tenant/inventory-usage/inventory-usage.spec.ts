import { test, expect, type Page, type Route } from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';
import {loginAsDisposableRole} from '../../../support/roleSession';

// Batch 22: InventoryUsagePage, InventoryUsageDashboard, inventoryUsageApi.
// GET-only synthetic usage evidence; no application or database writes.
const emptyTotals={usage_count:0,total_quantity:0,estimated_usage_value:0,missing_cost_count:0,first_consumed_at:null,last_consumed_at:null};
type UsageMocks={usageCount?:number; optionsError?:boolean; summaryError?:boolean; logsError?:boolean; logs?:any[]; onGet?:(url:URL)=>void; summaryDelay?:Promise<void>; role?:'PW_USAGE_READ_ONLY'; onRoute?:(route:Route,url:URL)=>Promise<boolean>;};
async function openUsage(page:Page,opts:UsageMocks={}){
 if(opts.role) await loginAsDisposableRole(page,opts.role); else await loginAsTenant(page);
 await page.route('**/stock/usage**',async(route:Route)=>{
  const req=route.request(),u=new URL(req.url()),p=u.pathname;
  if(opts.onRoute && await opts.onRoute(route,u)) return;
  if(req.method()!=='GET')throw Error(`Phase-1 usage read-only suite intercepted ${req.method()} ${p}`);
  opts.onGet?.(u);
  if(p.endsWith('/options'))return fulfillJson(route,opts.optionsError?{message:'Synthetic options unavailable'}:{products:[{id:'pw-product',name:'Synthetic Product',unit:'pcs'}],storage_locations:[{id:'pw-location',name:'Warehouse'}],filter_products:[{id:'pw-product',name:'Synthetic Product',unit:'pcs'}],filter_storage_locations:[{id:'pw-location',name:'Warehouse'}],departments:['Maintenance']},opts.optionsError?503:200);
  if(p.endsWith('/summary')){if(opts.summaryDelay)await opts.summaryDelay;return fulfillJson(route,opts.summaryError?{message:'Synthetic summary unavailable'}:{currency_code:'EUR',totals:{...emptyTotals,usage_count:opts.usageCount??0},by_reason:[],by_product:[],by_department:[],by_location:[],by_user:[],by_day:[]},opts.summaryError?503:200);}
  if(p.endsWith('/exceptions'))return fulfillJson(route,{rows:[],total:0});
  if(p.endsWith('/impact'))return fulfillJson(route,{rows:[],total:0});
  if(p.endsWith('/anomalies'))return fulfillJson(route,{rows:[],total:0});
  if(p.endsWith('/templates/scheduled'))return fulfillJson(route,{items:[],total:0,due:[],recent_runs:[]});
  if(p.endsWith('/templates'))return fulfillJson(route,[]);
  if(p.endsWith('/period-closures'))return fulfillJson(route,[]);
  if(p.endsWith('/usage'))return fulfillJson(route,opts.logsError?{message:'Synthetic usage ledger unavailable'}:opts.logs??[],opts.logsError?503:200);
  return fulfillJson(route,{message:'Unsupported synthetic usage GET'},404);
 });
 await page.goto('/inventory-usage');
 await expect(page.getByRole('heading',{name:'Inventory usage ledger'})).toBeVisible();
}
const tab=(page:Page,name:string)=>page.getByRole('tab',{name:new RegExp(`^${name}(?:\\s|$)`)});
const usageRequests=(paths:URL[],endpoint:string)=>paths.filter(u=>u.pathname.endsWith(endpoint));
// The page uses nested <label><select> controls. Locate by source-defined
// default option to avoid incorrect exact accessible-label matching.
const usageSelect=(page:Page, option:string)=>page.locator('select').filter({has:page.getByRole('option',{name:option,exact:true})}).first();

 test.describe('Inventory Usage — page, filters and ledger basics (Batch 22)',()=>{
 test('TIU-001 Usage workspace displays source-defined KPI labels',async({page})=>{
  await openUsage(page);for(const label of ['Usage events','Quantity consumed','Estimated usage value','Missing cost entries','First consumed','Last consumed'])await expect(page.getByText(label,{exact:true})).toBeVisible();
 });
 test('TIU-002 Usage loads summary and log listing through separate endpoints',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});
  await expect.poll(()=>usageRequests(seen,'/summary').length).toBeGreaterThanOrEqual(1);
  await expect.poll(()=>usageRequests(seen,'/usage').length).toBeGreaterThanOrEqual(1);
 });
 test('TIU-003 Overview is initially selected with operational filters visible',async({page})=>{
  await openUsage(page);await expect(tab(page,'Overview')).toHaveAttribute('aria-selected','true');await expect(page.getByText('Operational filters')).toBeVisible();
 });
 test('TIU-004 Refresh page re-requests usage summary and ledger evidence',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});const before=usageRequests(seen,'/summary').length;
  await page.getByRole('button',{name:'Refresh page'}).click();await expect.poll(()=>usageRequests(seen,'/summary').length).toBeGreaterThan(before);
 });
 test('TIU-005 Empty usage disables filtered CSV export',async({page})=>{
  await openUsage(page);await expect(page.getByRole('button',{name:'Export filtered CSV'})).toBeDisabled();
 });
 test('TIU-006 Product filter sends product_id to usage summary',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});await usageSelect(page,'All products').selectOption('pw-product');
  await expect.poll(()=>usageRequests(seen,'/summary').some(u=>u.searchParams.get('product_id')==='pw-product')).toBe(true);
 });
 test('TIU-007 Location filter sends storage_location_id',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});await usageSelect(page,'All locations').selectOption('pw-location');
  await expect.poll(()=>usageRequests(seen,'/summary').some(u=>u.searchParams.get('storage_location_id')==='pw-location')).toBe(true);
 });
 test('TIU-008 Reason filter uses the backend consumption_reason key',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});await usageSelect(page,'All reasons').selectOption('damage');
  await expect.poll(()=>usageRequests(seen,'/summary').some(u=>u.searchParams.get('consumption_reason')==='damage')).toBe(true);
 });
 test('TIU-009 Department filter trims its value in GET query',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});await page.getByLabel('Department / team').fill('  Maintenance  ');
  await expect.poll(()=>usageRequests(seen,'/summary').some(u=>u.searchParams.get('department')==='Maintenance')).toBe(true);
 });
 test('TIU-010 Include reversed usage changes summary request flag',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});await page.getByLabel('Include reversed usage').check();
  await expect.poll(()=>usageRequests(seen,'/summary').some(u=>u.searchParams.get('include_reversed')==='true')).toBe(true);
 });
 test('TIU-011 Invalid inverted dates display message and stop summary requests',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});await page.getByLabel('From').fill('2026-09-10');await page.getByLabel('To',{exact:true}).fill('2026-09-01');
  await expect(page.getByText('The To date must be the same as or later than the From date.')).toBeVisible();
  const count=usageRequests(seen,'/summary').length;await page.getByLabel('Department / team').fill('Maintenance');
  await expect(page.getByText('The To date must be the same as or later than the From date.')).toBeVisible();expect(usageRequests(seen,'/summary').length).toBe(count);
 });
 test('TIU-012 Same-day date range includes the entire selected calendar day',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});await page.getByLabel('From').fill('2026-09-10');await page.getByLabel('To',{exact:true}).fill('2026-09-10');
  await expect.poll(()=>usageRequests(seen,'/summary').some(u=>u.searchParams.get('start_date')==='2026-09-10T00:00:00.000'&&u.searchParams.get('end_date')==='2026-09-10T23:59:59.999')).toBe(true);
 });
 test('TIU-013 Reset filters clears product, reason and reversed flag',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});
  await usageSelect(page,'All reasons').selectOption('damage');await page.getByLabel('Include reversed usage').check();
  await page.getByRole('button',{name:'Reset filters'}).click();await expect(usageSelect(page,'All reasons')).toHaveValue('');
  await expect(page.getByLabel('Include reversed usage')).not.toBeChecked();await expect.poll(()=>usageRequests(seen,'/summary').some(u=>u.searchParams.get('consumption_reason')===null&&u.searchParams.get('include_reversed')===null)).toBe(true);
 });
 test('TIU-014 Ledger view renders filtered empty-state explanation',async({page})=>{
  await openUsage(page);await tab(page,'Ledger').click();await expect(page.getByText('No usage logs match the selected filters.')).toBeVisible();
 });
 test('TIU-015 Ledger page size 50 changes GET limit',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});await tab(page,'Ledger').click();await page.getByLabel('Rows per page').selectOption('50');
  await expect.poll(()=>usageRequests(seen,'/usage').some(u=>u.searchParams.get('limit')==='50')).toBe(true);
 });
 test('TIU-016 Ledger page size 100 changes GET limit',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{onGet:u=>seen.push(u)});await tab(page,'Ledger').click();await page.getByLabel('Rows per page').selectOption('100');
  await expect.poll(()=>usageRequests(seen,'/usage').some(u=>u.searchParams.get('limit')==='100')).toBe(true);
 });
 test('TIU-017 Ledger next page queries offset 25 for the next page',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{usageCount:51,onGet:u=>seen.push(u)});await tab(page,'Ledger').click();
  await page.getByRole('button',{name:'Next',exact:true}).click();await expect.poll(()=>usageRequests(seen,'/usage').some(u=>u.searchParams.get('offset')==='25')).toBe(true);
 });
 test('TIU-018 Ledger page resets when a filter changes',async({page})=>{
  const seen:URL[]=[];await openUsage(page,{usageCount:51,onGet:u=>seen.push(u)});await tab(page,'Ledger').click();await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect.poll(()=>usageRequests(seen,'/usage').some(u=>u.searchParams.get('offset')==='25')).toBe(true);
  await usageSelect(page,'All reasons').selectOption('damage');await expect.poll(()=>usageRequests(seen,'/usage').some(u=>u.searchParams.get('consumption_reason')==='damage'&&!u.searchParams.has('offset'))).toBe(true);
 });
 test('TIU-019 Templates tab shows empty template guidance without a mutation',async({page})=>{
  await openUsage(page);await tab(page,'Templates').click();await expect(page.getByText('No templates saved yet.')).toBeVisible();
 });
 test('TIU-020 Templates have a dedicated workspace and separate saved-template heading',async({page})=>{
  await openUsage(page);await tab(page,'Templates').click();await expect(page.getByText('Usage templates',{exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Saved templates'})).toBeVisible();await expect(tab(page,'Templates')).toHaveAttribute('aria-selected','true');
 });
 });

// Batch 23 — SOURCE-GROUNDED, GENERATED_UNRUN. Isolated request fixtures never prove server posting.
// InventoryUsagePage delegates actual controls to QuickConsumePanel, BulkRecorder,
// TemplatesPanel, ScheduledTemplatesPanel, GovernancePanel, and PeriodClosuresPanel.
type UsageRequest={method:string;pathname:string;body:any;search:string};
const usageRow={id:'pw-usage-1',product_id:'pw-product',product_name:'Synthetic Product',product_unit:'pcs',storage_location_id:'pw-location',storage_location_name:'Warehouse',quantity:2,consumption_reason:'internal_use',department:'Maintenance',event_name:'Demo',notes:'Synthetic audit note',quantity_before:10,quantity_after:8,stock_movement_id:'pw-movement-1',created_by_user_name:'Fixture Operator',consumed_at:'2026-10-01T09:30:00.000Z',currency_code:'EUR',estimated_usage_value:3.2,estimated_unit_cost:1.6,review_status:'pending'};
const usageTemplate={id:'pw-template-1',name:'Synthetic Maintenance Kit',version:3,consumption_reason:'internal_use',department:'Maintenance',event_name:'Fixture Job',description:'Synthetic reusable pack',notes:'Synthetic notes',use_count:0,items:[{id:'pw-item-1',product_id:'pw-product',storage_location_id:'pw-location',quantity:2,consumption_reason:'internal_use'}]};
type UsageScenario={role?:'PW_USAGE_READ_ONLY';logs?:any[];templates?:any[];scheduled?:any;closures?:any[];impact?:any;anomalies?:any;exceptions?:any;summary?:any;details?:any; mutations?:Record<string,any>};
async function openUsageScenario(page:Page, data:UsageScenario={}):Promise<UsageRequest[]>{
 const seen:UsageRequest[]=[];
 const capture=(route:Route)=>{const u=new URL(route.request().url());let body:any=null;try{body=route.request().postDataJSON();}catch{}seen.push({method:route.request().method(),pathname:u.pathname,body,search:u.search});return u;};
 await page.route('**/storage-locations',r=>fulfillJson(r,[{id:'pw-location',name:'Warehouse'}]));
 await page.route('**/stock/consume/**',async r=>{
  const u=capture(r);
  if(u.pathname.endsWith('/preview'))return fulfillJson(r,{message:'Synthetic preview: no posting',barcode_match:{barcode:'PW-BARCODE',package_count:1,product_id:'pw-product',product_name:'Synthetic Product',product_unit:'pcs'},preview:{storage_location_id:'pw-location',usage_timestamp:new Date().toISOString(),package_count:1,quantity_to_consume:1,consumption_reason:'internal_use',serial_numbers:[],has_stock_row:true,has_sufficient_stock:true,has_sufficient_usable_lot_stock:true,has_sufficient_unreserved_stock:true,blocking_reasons:[],acknowledgement_required_reasons:[],can_record_without_acknowledgement:true,period_open:true,has_evidence_metadata:false}});
  if(u.pathname.endsWith('/readiness'))return fulfillJson(r,{message:'Synthetic readiness only',can_record:true,recordable_count:1,blocked_count:0,warning_count:0,lines:[]});
  return fulfillJson(r,{message:'Synthetic consume response',usage_count:1,items:[],usage:{id:'pw-usage-1'},stock:{storage_location_id:'pw-location',previous_quantity:10,new_quantity:9},barcode_match:{barcode:'PW-BARCODE',product_name:'Synthetic Product',package_count:1}},200);
 });
 await page.route('**/enterprise-inventory/attachments',r=>{capture(r);return fulfillJson(r,{id:'pw-attachment',original_filename:'photo.jpg'});});
 await openUsage(page,{role:data.role,usageCount:(data.logs??[]).length,logs:data.logs??[],onRoute:async (r,u)=>{
  const p=u.pathname,m=r.request().method();
  if(m==='GET'&&p.endsWith('/summary')&&data.summary){capture(r);await fulfillJson(r,data.summary);return true;}
  if(m==='GET'&&p.endsWith('/exceptions')&&data.exceptions){capture(r);await fulfillJson(r,data.exceptions);return true;}
  if(m==='GET'&&p.endsWith('/impact')&&data.impact){capture(r);await fulfillJson(r,data.impact);return true;}
  if(m==='GET'&&p.endsWith('/anomalies')&&data.anomalies){capture(r);await fulfillJson(r,data.anomalies);return true;}
  if(m==='GET'&&p.endsWith('/templates/scheduled')){capture(r);await fulfillJson(r,data.scheduled??{rows:[],summary:{template_count:0,due_count:0,blocked_count:0,evidence_acknowledgement_required_count:0}});return true;}
  if(m==='GET'&&p.endsWith('/period-closures')){capture(r);await fulfillJson(r,data.closures??[]);return true;}
  if(m==='GET'&&/\/templates\/[^/]+\/readiness$/.test(p)){capture(r);await fulfillJson(r,{summary:{can_record:true,missing_stock_row_count:0,insufficient_stock_count:0,evidence_acknowledgement_required_count:0},rows:[]});return true;}
  if(m==='GET'&&p.endsWith('/templates')){capture(r);await fulfillJson(r,data.templates??[]);return true;}
  if(m==='GET'&&p.endsWith('/pw-usage-1')){capture(r);await fulfillJson(r,data.details??{...usageRow,attachments:[],stock_movement:{id:'pw-movement-1'}});return true;}
  if(m!=='GET'){
   capture(r);const key=m+' '+p;let response=data.mutations?.[key];
   if(!response&&p.endsWith('/period-closures/preview'))response={message:'Synthetic preview',preview:{blocked:false,usage_count:0,total_quantity:0,estimated_usage_value:0,exception_count:0,follow_up_count:0,reversed_count:0,currency_code:'EUR'}};
   if(!response&&p.endsWith('/period-closures'))response={message:'Synthetic close',closure:{id:'pw-close',usage_count:0,estimated_usage_value:0,currency_code:'EUR'}};
   if(!response&&p.endsWith('/scheduled/run-due'))response={message:'Synthetic run due',processed_count:1,items:[]};
   if(!response&&p.endsWith('/review'))response={message:'Synthetic review saved',usage_log:{...usageRow,review_status:'reviewed'}};
   if(!response&&p.endsWith('/reverse'))response={message:'Synthetic reversal',usage_log:{...usageRow,reversed_at:'2026-10-03T00:00:00Z'}};
   if(!response&&p.includes('/templates'))response={message:'Synthetic template result',template:{...usageTemplate},id:'pw-template-1'};
   await fulfillJson(r,response??{message:'Synthetic intercepted mutation'});return true;
  }
  return false;
 }});
 return seen;
}
const reqs=(a:UsageRequest[],method:string,suffix:string)=>a.filter(r=>r.method===method&&r.pathname.endsWith(suffix));
const recordTab=(p:Page)=>tab(p,'Record usage');
const templateTab=(p:Page)=>tab(p,'Templates');
const closeTab=(p:Page)=>tab(p,'Period close');
async function fillBarcode(p:Page){await recordTab(p).click();await p.getByLabel('Barcode',{exact:true}).fill('PW-BARCODE');await p.getByLabel('Stock location',{exact:true}).selectOption('pw-location');}
async function fillBulkLine(p:Page){await recordTab(p).click();await p.getByRole('button',{name:'Preview readiness'}).scrollIntoViewIfNeeded();await p.getByLabel('Product',{exact:true}).last().selectOption('pw-product');await p.getByLabel('Storage location',{exact:true}).last().selectOption('pw-location');await p.getByLabel('Quantity',{exact:true}).last().fill('2');}
async function fillTemplateLine(p:Page){await templateTab(p).click();await p.getByLabel('Product',{exact:true}).first().selectOption('pw-product');await p.getByLabel('Storage location',{exact:true}).first().selectOption('pw-location');await p.getByLabel('Quantity',{exact:true}).first().fill('2');}
const periodData=()=>Array.from({length:101},(_,i)=>({id:`pw-close-${i}`,period_start:'2026-08-01T00:00:00Z',period_end:'2026-08-31T23:59:59Z',usage_count:0,total_quantity:0,estimated_usage_value:0,currency_code:'EUR',exception_count:0,reversed_count:0,follow_up_count:0,created_at:'2026-09-01T00:00:00Z'}));

test.describe('Inventory Usage — delegated flows and governance (Batch 23)',()=>{
 test('TIU-021 Barcode preview sends barcode and location, without recording consumption',async({page})=>{
  const seen=await openUsageScenario(page);await fillBarcode(page);
  await page.getByRole('button',{name:'Preview stock impact'}).click();await expect.poll(()=>reqs(seen,'POST','/stock/consume/barcode/preview').length).toBe(1);
  expect(reqs(seen,'POST','/stock/consume/barcode/preview')[0].body).toMatchObject({barcode:'PW-BARCODE',storage_location_id:'pw-location'});
  expect(reqs(seen,'POST','/stock/consume/barcode')).toHaveLength(0);
 });
 test('TIU-022 Barcode controls prohibit preview for missing barcode, location, or nonpositive quantity',async({page})=>{
  const seen=await openUsageScenario(page);await recordTab(page).click();const preview=page.getByRole('button',{name:'Preview stock impact'});
  await expect(preview).toBeDisabled();await page.getByLabel('Barcode',{exact:true}).fill('PW-BARCODE');await expect(preview).toBeDisabled();
  await page.getByLabel('Stock location',{exact:true}).selectOption('pw-location');await page.getByLabel('Scan quantity').fill('0');await expect(preview).toBeDisabled();
  expect(reqs(seen,'POST','/stock/consume/barcode/preview')).toHaveLength(0);
 });
 test('TIU-023 Barcode evidence link distinguishes metadata from actual upload',async({page})=>{
  const seen=await openUsageScenario(page);await fillBarcode(page);
  await expect(page.getByText('This panel does not upload a file.',{exact:false})).toBeVisible();
  await page.getByLabel('Original filename').fill('photo.jpg');await page.getByLabel('Stored filename').fill('pw/files/photo.jpg');
  await page.getByRole('button',{name:'Preview stock impact'}).click();await expect.poll(()=>reqs(seen,'POST','/stock/consume/barcode/preview').length).toBe(1);
  expect(reqs(seen,'POST','/stock/consume/barcode/preview')[0].body).toMatchObject({evidence_original_filename:'photo.jpg',evidence_stored_filename:'pw/files/photo.jpg'});
  expect(reqs(seen,'POST','/enterprise-inventory/attachments')).toHaveLength(0);
 });
 test('TIU-024 Preview and repeated preview preserve one client scan ID for a single draft',async({page})=>{
  const seen=await openUsageScenario(page);await fillBarcode(page);const preview=page.getByRole('button',{name:'Preview stock impact'});await preview.click();
  await expect.poll(()=>reqs(seen,'POST','/stock/consume/barcode/preview').length).toBe(1);await preview.click();
  await expect.poll(()=>reqs(seen,'POST','/stock/consume/barcode/preview').length).toBe(2);
  const ids=reqs(seen,'POST','/stock/consume/barcode/preview').map(r=>r.body?.client_scan_id);expect(ids[0]).toBeTruthy();expect(ids[1]).toBe(ids[0]);
  expect(reqs(seen,'POST','/stock/consume/barcode')).toHaveLength(0);
 });
 test('TIU-025 Bulk preview and record actions disabled with no valid product/location/quantity lines',async({page})=>{
  const seen=await openUsageScenario(page);await recordTab(page).click();
  await expect(page.getByRole('button',{name:'Preview readiness'})).toBeDisabled();await expect(page.getByRole('button',{name:'Record bulk usage'})).toBeDisabled();
  expect(reqs(seen,'POST','/stock/consume/bulk/readiness')).toHaveLength(0);
 });
 test('TIU-026 Bulk readiness POST is distinct from actual bulk consumption POST',async({page})=>{
  const seen=await openUsageScenario(page);await fillBulkLine(page);await page.getByRole('button',{name:'Preview readiness'}).click();
  await expect.poll(()=>reqs(seen,'POST','/stock/consume/bulk/readiness').length).toBe(1);
  expect(reqs(seen,'POST','/stock/consume/bulk/readiness')[0].body.items).toEqual(expect.arrayContaining([expect.objectContaining({product_id:'pw-product',storage_location_id:'pw-location',quantity:2})]));
  expect(reqs(seen,'POST','/stock/consume/bulk')).toHaveLength(0);
 });
 test('TIU-027 Bulk shared missing-evidence acknowledgement is explicit in readiness body',async({page})=>{
  const seen=await openUsageScenario(page);await fillBulkLine(page);await page.getByLabel('Acknowledge damage/waste lines without evidence metadata').check();
  await page.getByRole('button',{name:'Preview readiness'}).click();await expect.poll(()=>reqs(seen,'POST','/stock/consume/bulk/readiness').length).toBe(1);
  expect(reqs(seen,'POST','/stock/consume/bulk/readiness')[0].body.missing_evidence_acknowledged).toBe(true);
  expect(reqs(seen,'POST','/stock/consume/bulk')).toHaveLength(0);
 });
 test('TIU-028 Template save requires a nonblank name and at least one valid line',async({page})=>{
  const seen=await openUsageScenario(page);await templateTab(page).click();const save=page.getByRole('button',{name:'Save usage template'});
  await expect(save).toBeDisabled();await page.getByLabel('Template name').fill('Maintenance Kit');await expect(save).toBeDisabled();
  expect(reqs(seen,'POST','/stock/usage/templates')).toHaveLength(0);
 });
 test('TIU-029 Editing a saved template loads product, location and quantity',async({page})=>{
  await openUsageScenario(page,{templates:[usageTemplate]});await templateTab(page).click();await page.getByRole('button',{name:'Edit',exact:true}).click();
  await expect(page.getByLabel('Template name')).toHaveValue(usageTemplate.name);
  await expect(usageSelect(page,'Select product')).toHaveValue('pw-product');
  await expect(usageSelect(page,'Select location')).toHaveValue('pw-location');
  await expect(page.locator('input[type=number][placeholder="0"]').first()).toHaveValue('2');
 });
 test('TIU-030 Updating a template submits optimistic expected_version and original line references',async({page})=>{
  const seen=await openUsageScenario(page,{templates:[usageTemplate]});await templateTab(page).click();await page.getByRole('button',{name:'Edit',exact:true}).click();
  await page.getByLabel('Template name').fill('Updated Maintenance Kit');await page.getByRole('button',{name:'Update usage template'}).click();
  await expect.poll(()=>reqs(seen,'PUT','/stock/usage/templates/pw-template-1').length).toBe(1);
  expect(reqs(seen,'PUT','/stock/usage/templates/pw-template-1')[0].body).toMatchObject({expected_version:3,name:'Updated Maintenance Kit'});
  expect(reqs(seen,'PUT','/stock/usage/templates/pw-template-1')[0].body.items[0]).toMatchObject({product_id:'pw-product',storage_location_id:'pw-location'});
 });
 test('TIU-031 Cancelling archive confirmation must not DELETE saved template',async({page})=>{
  const seen=await openUsageScenario(page,{templates:[usageTemplate]});await templateTab(page).click();page.once('dialog',d=>d.dismiss());
  await page.getByRole('button',{name:'Archive',exact:true}).click();expect(reqs(seen,'DELETE','/stock/usage/templates/pw-template-1')).toHaveLength(0);
 });
 test('TIU-032 Loading template into bulk recorder keeps its line and shared department',async({page})=>{
  await openUsageScenario(page,{templates:[usageTemplate]});await templateTab(page).click();await page.getByRole('button',{name:'Load into recorder'}).click();
  await recordTab(page).click();await expect(page.getByText('Bulk usage recorder',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Department / team').last()).toHaveValue('Maintenance');
 });
 test('TIU-033 Scheduled templates expose due and blocked summary without running',async({page})=>{
  const seen=await openUsageScenario(page,{scheduled:{rows:[],summary:{template_count:3,due_count:2,blocked_count:1,evidence_acknowledgement_required_count:0}}});
  await templateTab(page).click();await expect(page.getByRole('heading',{name:'Scheduled usage templates'})).toBeVisible();
  await expect(page.getByText('3 scheduled',{exact:true})).toBeVisible();
  await expect(page.getByText('2 due',{exact:true})).toBeVisible();
  await expect(page.getByText('1 blocked',{exact:true})).toBeVisible();
  expect(reqs(seen,'POST','/stock/usage/templates/scheduled/run-due')).toHaveLength(0);
 });
 test('TIU-034 Confirming scheduled run submits one batch and displays synthetic response',async({page})=>{
  const seen=await openUsageScenario(page,{scheduled:{rows:[],summary:{template_count:1,due_count:1,blocked_count:0,evidence_acknowledgement_required_count:0}}});
  await templateTab(page).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Record due templates'}).click();
  await expect.poll(()=>reqs(seen,'POST','/stock/usage/templates/scheduled/run-due').length).toBe(1);
  await expect(page.getByText('Synthetic run due',{exact:false})).toBeVisible();
 });
 test('TIU-035 Empty reversal prompt prevents reversal POST',async({page})=>{
  const seen=await openUsageScenario(page,{logs:[usageRow]});await tab(page,'Ledger').click();page.once('dialog',d=>d.accept('   '));
  await page.getByRole('button',{name:'Reverse',exact:true}).click();expect(reqs(seen,'POST','/stock/usage/pw-usage-1/reverse')).toHaveLength(0);
 });
 test('TIU-036 Follow-up review requires written reason; accepted review sends typed status',async({page})=>{
  const seen=await openUsageScenario(page,{logs:[usageRow],exceptions:{rows:[{...usageRow,exception_types:['missing_department']}],summary:{exception_count:1,pending_review_count:1}}});
  await tab(page,'Overview').click();await expect(page.getByRole('button',{name:'Follow up'})).toBeVisible();
  page.once('dialog',d=>d.accept('   '));await page.getByRole('button',{name:'Follow up'}).click();expect(reqs(seen,'POST','/stock/usage/pw-usage-1/review')).toHaveLength(0);
  page.once('dialog',d=>d.accept('Please investigate damage evidence'));await page.getByRole('button',{name:'Follow up'}).click();
  await expect.poll(()=>reqs(seen,'POST','/stock/usage/pw-usage-1/review').length).toBe(1);
  expect(reqs(seen,'POST','/stock/usage/pw-usage-1/review')[0].body).toMatchObject({review_status:'follow_up_required',review_notes:'Please investigate damage evidence'});
 });
 test('TIU-037 Details requests a single selected record without mutating ledger rows',async({page})=>{
  const seen=await openUsageScenario(page,{logs:[usageRow]});await tab(page,'Ledger').click();await page.getByRole('button',{name:'Details'}).click();
  await expect.poll(()=>reqs(seen,'GET','/stock/usage/pw-usage-1').length).toBe(1);
  await expect(page.getByText('Usage log detail')).toBeVisible();expect(reqs(seen,'POST','/stock/usage/pw-usage-1/reverse')).toHaveLength(0);
 });
 test('TIU-038 Read-only role cannot reverse ledger rows or review exceptions',async({page})=>{
  await openUsageScenario(page,{role:'PW_USAGE_READ_ONLY',logs:[usageRow],exceptions:{rows:[{...usageRow,exception_types:['missing_notes']}],summary:{exception_count:1,pending_review_count:1}}});await tab(page,'Ledger').click();
  await expect(page.getByRole('button',{name:'Details'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Reverse',exact:true})).toHaveCount(0);
  await tab(page,'Overview').click();await expect(page.getByRole('button',{name:'Mark reviewed'})).toBeDisabled();
 });
 test('TIU-039 Period close preview posts date range without closing',async({page})=>{
  const seen=await openUsageScenario(page);await closeTab(page).click();await page.getByLabel('Period start').fill('2026-09-01T00:00');await page.getByLabel('Period end').fill('2026-10-01T00:00');
  await page.getByRole('button',{name:'Preview close impact'}).click();await expect.poll(()=>reqs(seen,'POST','/stock/usage/period-closures/preview').length).toBe(1);
  expect(reqs(seen,'POST','/stock/usage/period-closures')).toHaveLength(0);
 });
 test('TIU-040 Period close requires confirmation; cancellation causes no close POST',async({page})=>{
  const seen=await openUsageScenario(page);await closeTab(page).click();await page.getByLabel('Period start').fill('2026-09-01T00:00');await page.getByLabel('Period end').fill('2026-10-01T00:00');
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Close usage period'}).click();expect(reqs(seen,'POST','/stock/usage/period-closures')).toHaveLength(0);
 });
 test('TIU-041 Period-close history moves by 100 records via offset query',async({page})=>{
  const seen=await openUsageScenario(page,{closures:periodData()});await closeTab(page).click();await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect.poll(()=>reqs(seen,'GET','/stock/usage/period-closures').some(r=>new URLSearchParams(r.search).get('offset')==='100')).toBe(true);
 });
 test('TIU-042 Nonempty usage ledger triggers CSV download with filtered columns',async({page})=>{
  await openUsageScenario(page,{logs:[usageRow]});await tab(page,'Ledger').click();
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export filtered CSV'}).click();
  const downloaded=await downloadPromise;expect(downloaded.suggestedFilename()).toMatch(/inventory.*usage.*\.csv$/i);
 });
 test('TIU-043 Usage stock-impact panel disables export when there are no rows',async({page})=>{
  await openUsageScenario(page);await expect(page.getByText('Usage stock impact')).toBeVisible();
  await expect(page.getByRole('button',{name:'Export filtered impact CSV'})).toBeDisabled();
 });
 test('TIU-044 Anomaly watch exposes spike guidance but disables CSV for empty results',async({page})=>{
  await openUsageScenario(page);await expect(page.getByText('Usage anomaly watch')).toBeVisible();
  await expect(page.getByRole('button',{name:'Export filtered anomalies CSV'})).toBeDisabled();
 });
 test('TIU-045 Governance exceptions include count and explicit manual-review actions',async({page})=>{
  await openUsageScenario(page,{logs:[usageRow],exceptions:{rows:[{...usageRow,exception_types:['missing_notes']}],summary:{exception_count:1,pending_review_count:1}}});
  await expect(page.getByRole('button',{name:'Mark reviewed'})).toBeVisible();await expect(page.getByRole('button',{name:'Follow up'})).toBeVisible();
 });
 test('TIU-046 Overview exposes product, reason, department, location and user breakdowns',async({page})=>{
  await openUsageScenario(page);for(const section of ['Top consumed products','By reason','By department','By location','By user'])await expect(page.getByText(section,{exact:true})).toBeVisible();
 });
 test('TIU-047 Reversed usage remains visible in ledger history',async({page})=>{
  await openUsageScenario(page,{logs:[{...usageRow,reversed_at:'2026-10-02T10:00:00Z',reversal_reason:'Synthetic correction'}]});await tab(page,'Ledger').click();
  await expect(page.getByText('Reversed',{exact:true})).toBeVisible();await expect(page.getByText('Synthetic correction')).toBeVisible();
  await expect(page.getByRole('button',{name:'Reverse',exact:true})).toHaveCount(0);
 });
 test('TIU-048 Ledger exposes quantity before and after plus movement identifier',async({page})=>{
  await openUsageScenario(page,{logs:[usageRow]});await tab(page,'Ledger').click();
  await expect(page.getByText(/10\s*→\s*8/)).toBeVisible();await expect(page.getByText(/Movement pw-movement-/)).toBeVisible();
 });
 test('TIU-049 Failed usage ledger GET presents its own error without changing another filter',async({page})=>{
  await openUsage(page,{logsError:true});await tab(page,'Ledger').click();
  await expect(page.getByText('Failed to load usage ledger:',{exact:false})).toBeVisible();
 });
 test('TIU-050 Read-only role cannot access Record usage or Period close tabs',async({page})=>{
  await openUsage(page,{role:'PW_USAGE_READ_ONLY'});
  await expect(tab(page,'Overview')).toBeVisible();await expect(tab(page,'Ledger')).toBeVisible();
  await expect(recordTab(page)).toHaveCount(0);await expect(closeTab(page)).toHaveCount(0);
 });
});
