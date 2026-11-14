import {test,expect,type Page,type Route} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';
import {loginAsDisposableRole} from '../../../support/roleSession';
// Batch 26: StockTransfersPage.tsx, GET /stock-transfers, /summary, /filter-options,
// /options, /:id and /:id/availability. All responses are isolated in a disposable tenant.
// These UI assertions do not prove database persistence, transfer posting or tenant isolation.
type SeenRequest={path:string;url:string;method:string};
type TransferSetup={rows?:any[];summary?:Record<string,unknown>;summaryError?:boolean;listError?:boolean;filterError?:boolean;detailError?:boolean;rowsForRequest?:(uri:URL)=>any[]};
const draftTransfer={id:'pw-transfer-1',from_storage_location_id:'pw-source',from_storage_location_name:'North room',to_storage_location_id:'pw-dest',to_storage_location_name:'South room',status:'draft',notes:'Restock front desk',created_by_user_name:'Planner',created_at:'2026-10-29T09:00:00Z',version:1,item_count:1};
const draftDetail={...draftTransfer,items:[{id:'pw-line-1',product_id:'pw-product',product_name:'Synthetic Product',product_unit:'pcs',quantity:2,entered_quantity:2,uom_code:'pcs',serial_numbers:[]}]};
const transferOptions={locations:[{id:'pw-source',name:'North room',source_eligible:true,is_pickable:true},{id:'pw-dest',name:'South room',source_eligible:true,is_pickable:true}],products:[{id:'pw-product',name:'Synthetic Product',unit:'pcs',on_hand_quantity:20,reserved_quantity:2,available_quantity:18,transferable:true}]};
async function openTransfers(page:Page,setup:TransferSetup={},url='/stock-transfers'){
 await loginAsTenant(page);const seen:SeenRequest[]=[];
 await page.route('**/stock-transfers**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const uri=new URL(req.url()),path=uri.pathname;seen.push({path,url:uri.toString(),method:req.method()});
  if(req.method()!=='GET')throw Error(`Unexpected transfer write in read-only setup: ${req.method()}`);
  if(path.endsWith('/filter-options'))return fulfillJson(route,setup.filterError?{message:'Filters unavailable'}:transferOptions,setup.filterError?503:200);
  if(path.endsWith('/summary'))return fulfillJson(route,setup.summaryError?{message:'Summary unavailable'}:setup.summary??{transfer_count:0,draft_count:0,executed_count:0,cancelled_count:0,item_count:0},setup.summaryError?503:200);
  if(path.endsWith('/options'))return fulfillJson(route,transferOptions);
  if(path.endsWith('/availability'))return fulfillJson(route,{transfer_id:'pw-transfer-1',status:'draft',executable:true,message:'Source stock sufficient',items:[]});
  if(path.endsWith('/movements'))return fulfillJson(route,[]);
  if(/\/stock-transfers\/[^/]+$/.test(path))return fulfillJson(route,setup.detailError?{message:'Transfer unavailable'}:draftDetail,setup.detailError?404:200);
  if(path.endsWith('/stock-transfers'))return fulfillJson(route,setup.listError?{message:'Transfer list unavailable'}:setup.rowsForRequest?.(uri)??setup.rows??[],setup.listError?503:200);
  return route.continue();
 });
 await page.goto(url);await expect(page.getByRole('heading',{name:'Stock Transfers',exact:true})).toBeVisible();return seen;
}
const listGET=(seen:SeenRequest[])=>seen.filter(r=>r.path.endsWith('/stock-transfers')&&r.method==='GET');
const hasParam=(seen:SeenRequest[],key:string,value:string)=>listGET(seen).some(r=>new URL(r.url).searchParams.get(key)===value);
test.describe('Stock Transfers — source-backed board, filters and selection (Batch 26)',()=>{
 test('TSTR-001 Transfer page explicitly distinguishes draft planning from execution',async({page})=>{
  await openTransfers(page);
  await expect(page.getByText('Stock changes only after an authorized user executes the draft.',{exact:false})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Create Transfer Draft'})).toBeVisible();
 });
 test('TSTR-002 Transfer board fetches list, filtered summary and filter options separately',async({page})=>{
  const seen=await openTransfers(page);
  for(const ending of ['/stock-transfers','/summary','/filter-options'])await expect.poll(()=>seen.some(r=>r.path.endsWith(ending))).toBe(true);
  expect(seen.every(r=>r.method==='GET')).toBe(true);
 });
 test('TSTR-003 Summary differentiates matching drafts, executed, cancelled and line counts',async({page})=>{
  await openTransfers(page,{summary:{transfer_count:9,draft_count:4,executed_count:3,cancelled_count:2,item_count:14}});
  for(const label of ['Transfers','Drafts','Executed','Cancelled','Line Items'])await expect(page.getByText(label,{exact:true}).first()).toBeVisible();
  await expect(page.getByText('14',{exact:true}).first()).toBeVisible();
 });
 test('TSTR-004 Empty unfiltered board states that no transfers exist yet',async({page})=>{
  await openTransfers(page);await expect(page.getByText('No stock transfers exist yet.')).toBeVisible();
 });
 test('TSTR-005 Draft card shows historical route, stage and creator, and is selectable',async({page})=>{
  await openTransfers(page,{rows:[draftTransfer],summary:{transfer_count:1}});
  const card=page.getByRole('button',{name:/North room.*South room/});
  await expect(card).toContainText('Draft');await expect(card).toContainText('Planner');
  await card.click();await expect(card).toHaveAttribute('aria-pressed','true');
 });
 test('TSTR-006 Status Draft filters list and URL using canonical value',async({page})=>{
  const seen=await openTransfers(page);await page.locator('#transfer-status-filter').selectOption('draft');
  await expect.poll(()=>hasParam(seen,'status','draft')).toBe(true);await expect(page).toHaveURL(/status=draft/);
 });
 test('TSTR-007 Executed filter sends executed status rather than draft',async({page})=>{
  const seen=await openTransfers(page);await page.locator('#transfer-status-filter').selectOption('executed');
  await expect.poll(()=>hasParam(seen,'status','executed')).toBe(true);
 });
 test('TSTR-008 Cancelled filter sends cancelled status and keeps empty-match wording',async({page})=>{
  const seen=await openTransfers(page);await page.locator('#transfer-status-filter').selectOption('cancelled');
  await expect.poll(()=>hasParam(seen,'status','cancelled')).toBe(true);
  await expect(page.getByText('No stock transfers match the current filters.')).toBeVisible();
 });
 test('TSTR-009 Debounced free-text search trims source query and updates URL',async({page})=>{
  const seen=await openTransfers(page);await page.locator('#transfer-search').fill('  restock front  ');
  await expect.poll(()=>hasParam(seen,'search','restock front')).toBe(true);await expect(page).toHaveURL(/search=restock/);
 });
 test('TSTR-010 Source-location filter sends from_storage_location_id',async({page})=>{
  const seen=await openTransfers(page);await page.locator('#transfer-from-filter').selectOption('pw-source');
  await expect.poll(()=>hasParam(seen,'from_storage_location_id','pw-source')).toBe(true);
 });
 test('TSTR-011 Destination filter sends to_storage_location_id',async({page})=>{
  const seen=await openTransfers(page);await page.locator('#transfer-to-filter').selectOption('pw-dest');
  await expect.poll(()=>hasParam(seen,'to_storage_location_id','pw-dest')).toBe(true);
 });
 test('TSTR-012 Product filter uses product_id from the source filter-options endpoint',async({page})=>{
  const seen=await openTransfers(page);await page.locator('#transfer-product-filter').selectOption('pw-product');
  await expect.poll(()=>hasParam(seen,'product_id','pw-product')).toBe(true);
 });
 test('TSTR-013 Clear filters resets selected status and product without losing board',async({page})=>{
  await openTransfers(page);await page.locator('#transfer-status-filter').selectOption('draft');
  await page.locator('#transfer-product-filter').selectOption('pw-product');
  await page.getByRole('button',{name:'Clear filters'}).click();
  await expect(page.locator('#transfer-status-filter')).toHaveValue('');
  await expect(page.locator('#transfer-product-filter')).toHaveValue('');
  await expect(page).not.toHaveURL(/status=|product_id=/);
 });
 test('TSTR-014 Rows per page 50 updates the list GET limit and canonical URL',async({page})=>{
  const seen=await openTransfers(page);await page.locator('#transfer-page-size').selectOption('50');
  await expect.poll(()=>hasParam(seen,'limit','50')).toBe(true);await expect(page).toHaveURL(/limit=50/);
 });
 test('TSTR-015 Next page queries offset 25 and preserves pagination URL',async({page})=>{
  const pageRows=Array.from({length:25},(_,i)=>({...draftTransfer,id:`pw-transfer-${i}`}));
  const seen=await openTransfers(page,{rows:pageRows,summary:{transfer_count:50,draft_count:50,executed_count:0,cancelled_count:0,item_count:50}});
  await page.getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>hasParam(seen,'offset','25')).toBe(true);await expect(page).toHaveURL(/page=2/);
 });
 test('TSTR-016 Previous page returns to first list offset',async({page})=>{
  const pageRows=Array.from({length:25},(_,i)=>({...draftTransfer,id:`pw-transfer-${i}`}));
  await openTransfers(page,{rows:pageRows,summary:{transfer_count:50,draft_count:50}});
  await page.getByRole('button',{name:'Next'}).click();await expect(page).toHaveURL(/page=2/);
  await page.getByRole('button',{name:'Previous'}).click();
  await expect(page.getByRole('button',{name:/North room.*South room/}).first()).toBeVisible();
  await expect(page).not.toHaveURL(/page=2/);
 });
 test('TSTR-017 Shared transfer_id deep link opens detail without requiring list match',async({page})=>{
  const seen=await openTransfers(page,{rows:[]},'/stock-transfers?transfer_id=pw-transfer-1');
  await expect.poll(()=>seen.some(r=>r.path.endsWith('/stock-transfers/pw-transfer-1'))).toBe(true);
  await expect(page.getByRole('heading',{name:'Transfer Detail'})).toBeVisible();
  await expect(page.getByText('This selected transfer is outside the current list page or filters.',{exact:false})).toBeVisible();
 });
 test('TSTR-018 Closing detail removes selection from URL without deleting transfer',async({page})=>{
  const seen=await openTransfers(page,{rows:[draftTransfer]},'/stock-transfers?transfer_id=pw-transfer-1');
  await page.getByRole('button',{name:'Close detail'}).click();
  await expect(page).not.toHaveURL(/transfer_id=/);
  await expect(page.getByRole('heading',{name:'Transfer Detail'})).toHaveCount(0);
  expect(seen.every(r=>r.method==='GET')).toBe(true);
 });
 test('TSTR-019 Summary failure warns while preserving visible transfer cards',async({page})=>{
  await openTransfers(page,{rows:[draftTransfer],summaryError:true});
  await expect(page.getByText('Full filtered totals are unavailable.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:/North room.*South room/})).toBeVisible();
 });
 test('TSTR-020 Failed list GET shows failure instead of an invented empty match',async({page})=>{
  await openTransfers(page,{listError:true});
  await expect(page.getByText('Failed to load stock transfers.')).toBeVisible();
  await expect(page.getByText('No stock transfers exist yet.')).toHaveCount(0);
 });
});

// Batch 27: TSTR-021…050. Disconnected disposable-tenant fixtures; intercept all transfer
// writes. Client-side results never establish stock-posting, transactionality, or tenant isolation.
// StockTransfersPage.tsx + backend/routes/stockTransfers.js + stockTransferService.js.

type TransferCase = {
  rows?:any[];detail?:any;filterError?:boolean;optionsError?:boolean;availability?:any;
  availabilityError?:boolean;movementError?:boolean;movements?:any[];
  createStatus?:number;updateStatus?:number;executeStatus?:number;cancelStatus?:number;
  products?:any[];locations?:any[];sourceOptionsError?:boolean;exportError?:boolean;role?:'PW_TRANSFER_READ_ONLY';
};
type TransferWrite={method:string;path:string;body:any};
const transferAvailabilityReady={transfer_id:'pw-transfer-1',status:'draft',executable:true,message:'Source stock sufficient',items:[{
 product_id:'pw-product',product_name:'Synthetic Product',product_unit:'pcs',requested_quantity:2,
 on_hand_quantity:20,reserved_quantity:3,available_quantity:17,remaining_after_transfer:15,sufficient:true
}]};
const transferMovements=[
 {id:'pw-out',product_id:'pw-product',product_name:'Synthetic Product',product_unit:'pcs',stock_transfer_id:'pw-transfer-1',storage_location_name:'North room',movement_type:'stock_transfer_out',change:-2,user_name:'Planner',created_at:'2026-10-29T11:00:00Z'},
 {id:'pw-in',product_id:'pw-product',product_name:'Synthetic Product',product_unit:'pcs',stock_transfer_id:'pw-transfer-1',storage_location_name:'South room',movement_type:'stock_transfer_in',change:2,user_name:'Planner',created_at:'2026-10-29T11:00:00Z'}
];
async function openTransferCase(page:Page,config:TransferCase={},url='/stock-transfers'){
 if(config.role)await loginAsDisposableRole(page,config.role);else await loginAsTenant(page);
 await page.route('**/inventory-capabilities/products/*/uom**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  if(route.request().method()==='GET')return fulfillJson(route,{base_uom:'pcs',conversions:[]});
  throw Error('Unexpected unit-of-measure write in transfer fixture');
 });
 const seen:SeenRequest[]=[],writes:TransferWrite[]=[];
 let liveDetail={...(config.detail??draftDetail)};
 const options={...transferOptions,locations:config.locations??transferOptions.locations,products:config.products??transferOptions.products};
 await page.route('**/stock-transfers**',async(route:Route)=>{
  const request=route.request();if(request.isNavigationRequest())return route.continue();
  const uri=new URL(request.url()),path=uri.pathname,method=request.method();seen.push({path,url:uri.toString(),method});
  if(method==='GET'){
   if(path.endsWith('/filter-options'))return fulfillJson(route,config.filterError?{message:'Filters unavailable'}:options,config.filterError?503:200);
   if(path.endsWith('/summary'))return fulfillJson(route,{transfer_count:(config.rows??[draftTransfer]).length,draft_count:1,executed_count:0,cancelled_count:0,item_count:1});
   if(path.endsWith('/options'))return fulfillJson(route,(config.optionsError||config.sourceOptionsError&&uri.searchParams.has('source_storage_location_id'))?{message:'Options unavailable'}:options,(config.optionsError||config.sourceOptionsError&&uri.searchParams.has('source_storage_location_id'))?503:200);
   if(path.endsWith('/availability'))return fulfillJson(route,config.availabilityError?{message:'Preview unavailable'}:config.availability??transferAvailabilityReady,config.availabilityError?503:200);
   if(path.endsWith('/movements'))return fulfillJson(route,config.movementError?{message:'Audit unavailable'}:config.movements??transferMovements,config.movementError?503:200);
   if(/\/stock-transfers\/[^/]+$/.test(path))return fulfillJson(route,liveDetail);
   if(path.endsWith('/stock-transfers'))return fulfillJson(route,config.exportError&&uri.searchParams.get('limit')==='500'?{message:'Export list unavailable'}:config.rows??[draftTransfer],config.exportError&&uri.searchParams.get('limit')==='500'?503:200);
   return route.continue();
  }
  const body=request.postDataJSON()??{};writes.push({method,path,body});
  if(method==='POST'&&path.endsWith('/stock-transfers')){
   const status=config.createStatus??200;
   if(status>=400)return fulfillJson(route,{message:'Draft creation rejected'},status);
   liveDetail={...draftDetail,id:'pw-created-transfer',from_storage_location_id:body.from_storage_location_id,to_storage_location_id:body.to_storage_location_id,notes:body.notes};
   return fulfillJson(route,liveDetail);
  }
  if(method==='PATCH'&&path.endsWith('/pw-transfer-1')){
   const status=config.updateStatus??200;
   if(status>=400)return fulfillJson(route,{message:'Version conflict: reload the draft'},status);
   liveDetail={...liveDetail,version:Number(body.version)+1,notes:body.notes};
   return fulfillJson(route,liveDetail);
  }
  if(method==='POST'&&path.endsWith('/execute')){
   const status=config.executeStatus??200;
   if(status>=400)return fulfillJson(route,{message:'Execution rejected'},status);
   liveDetail={...liveDetail,status:'executed',executed_at:'2026-10-29T11:00:00Z'};
   return fulfillJson(route,{message:'Stock transfer executed successfully.',transfer:liveDetail});
  }
  if(method==='POST'&&path.endsWith('/cancel')){
   const status=config.cancelStatus??200;
   if(status>=400)return fulfillJson(route,{message:'Cancellation rejected'},status);
   liveDetail={...liveDetail,status:'cancelled',cancellation_reason:body.reason,cancelled_at:'2026-10-29T11:00:00Z'};
   return fulfillJson(route,{message:'Stock transfer cancelled successfully.',transfer:liveDetail});
  }
  throw Error(`Unexpected stock-transfer write ${method} ${path}`);
 });
 await page.goto(url);await expect(page.getByRole('heading',{name:'Stock Transfers',exact:true})).toBeVisible();
 return {seen,writes};
}
const formFrom=(page:Page)=>page.locator('#transfer-from-location');
const formTo=(page:Page)=>page.locator('#transfer-to-location');
const formProduct=(page:Page,i=0)=>page.locator(`#transfer-product-${i}`);
const formQuantity=(page:Page,i=0)=>page.locator(`#transfer-quantity-${i}`);
async function fillValidDraft(page:Page){
 await formFrom(page).selectOption('pw-source');
 await formTo(page).selectOption('pw-dest');
 await formProduct(page).selectOption('pw-product');
 await formQuantity(page).fill('2');
}
const newWrites=(writes:TransferWrite[])=>writes.filter(x=>x.method!=='GET');
const selectedUrl='/stock-transfers?transfer_id=pw-transfer-1';

test.describe('Stock Transfers — draft validation, mutation governance and audit (Batch 27)',()=>{
 test('TSTR-021 Unavailable create/edit option GET leaves history readable and warns',async({page})=>{
  const {writes}=await openTransferCase(page,{optionsError:true});
  await expect(page.getByText('Stock transfer operational information is unavailable.',{exact:false}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:/North room.*South room/})).toBeVisible();
  await expect(page.getByRole('button',{name:'Create transfer draft'})).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('TSTR-022 Failed filter options disable dependent filter controls while list remains viewable',async({page})=>{
  await openTransferCase(page,{filterError:true});
  await expect(page.locator('#transfer-from-filter')).toBeDisabled();await expect(page.locator('#transfer-product-filter')).toBeDisabled();
  await expect(page.getByRole('button',{name:/North room.*South room/})).toBeVisible();
 });
 test('TSTR-023 Draft form requires both source and destination locations',async({page})=>{
  const {writes}=await openTransferCase(page);await expect(formFrom(page)).toHaveAttribute('required','');
  await expect(formTo(page)).toHaveAttribute('required','');
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  expect(await formFrom(page).evaluate((el)=>!(el as HTMLSelectElement).validity.valid)).toBe(true);expect(writes).toHaveLength(0);
 });
 test('TSTR-024 Source and destination must be distinct; same-location option disabled',async({page})=>{
  const {writes}=await openTransferCase(page);await formFrom(page).selectOption('pw-source');
  await expect(formTo(page).locator('option[value="pw-source"]')).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('TSTR-025 Draft requires a selected product and positive quantity',async({page})=>{
  const {writes}=await openTransferCase(page);await formFrom(page).selectOption('pw-source');await formTo(page).selectOption('pw-dest');
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  expect(await formProduct(page).evaluate((el)=>!(el as HTMLSelectElement).validity.valid)).toBe(true);
  await formProduct(page).selectOption('pw-product');await formQuantity(page).fill('0');
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  expect(await formQuantity(page).evaluate((el)=>!(el as HTMLInputElement).validity.valid)).toBe(true);expect(writes).toHaveLength(0);
 });
 test('TSTR-026 Adding and removing transfer item rows preserves one mandatory row',async({page})=>{
  await openTransferCase(page);await page.getByRole('button',{name:'Add item'}).click();
  await expect(formProduct(page,1)).toBeVisible();
  // AppProviders requires confirmation for every Remove action. Playwright
  // dismisses browser dialogs by default, leaving the draft unchanged.
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Remove',exact:true}).last().click();
  await expect(formProduct(page,1)).toHaveCount(0);
  // Do not count #transfer-product-filter (the separate board filter).
  await expect(page.locator('select[id^="transfer-product-"]:not(#transfer-product-filter)')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Remove',exact:true})).toBeDisabled();
 });
 test('TSTR-027 Product selected in one row is disabled in another',async({page})=>{
  await openTransferCase(page);await formProduct(page).selectOption('pw-product');
  await page.getByRole('button',{name:'Add item'}).click();
  await expect(formProduct(page,1).locator('option[value="pw-product"]')).toBeDisabled();
 });
 test('TSTR-028 Source selection re-fetches products and unreserved stock by source ID',async({page})=>{
  const {seen}=await openTransferCase(page);await formFrom(page).selectOption('pw-source');
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/options')&&new URL(x.url).searchParams.get('source_storage_location_id')==='pw-source')).toBe(true);
  await expect(formProduct(page).locator('option[value="pw-product"]')).toContainText('18');
 });
 test('TSTR-029 Serial tracking requires one serial per whole-number unit',async({page})=>{
  const serial={...transferOptions.products[0],serial_tracking_enabled:true};
  const {writes}=await openTransferCase(page,{products:[serial]});await fillValidDraft(page);
  await expect(page.locator('#transfer-serials-0')).toBeVisible();
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect(page.getByText('requires one serial number for each transferred unit.',{exact:false})).toBeVisible();
  expect(writes).toHaveLength(0);
 });
 test('TSTR-030 Valid draft create POST carries locations, trimmed notes, item UOM and serial array',async({page})=>{
  const {writes}=await openTransferCase(page);await fillValidDraft(page);
  await page.locator('#transfer-notes').fill('  Source replenishment  ');
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({method:'POST',path:expect.stringMatching(/\/stock-transfers$/),body:{from_storage_location_id:'pw-source',to_storage_location_id:'pw-dest',notes:'Source replenishment',items:[{product_id:'pw-product',quantity:2,uom_code:null,serial_numbers:[]}]}});
 });
 test('TSTR-031 Blank quantity cannot submit a transfer',async({page})=>{
  const {writes}=await openTransferCase(page);await fillValidDraft(page);await formQuantity(page).fill('');
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  expect(await formQuantity(page).evaluate((el)=>!(el as HTMLInputElement).validity.valid)).toBe(true);expect(writes).toHaveLength(0);
 });
 test('TSTR-032 Quantity above unreserved stock is rejected before POST',async({page})=>{
  const {writes}=await openTransferCase(page);await fillValidDraft(page);await formQuantity(page).fill('19');
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect(page.getByText('of unreserved stock available at the source location.',{exact:false})).toBeVisible();expect(writes).toHaveLength(0);
 });
 test('TSTR-033 Successful draft creation shows feedback and opens new ID in URL',async({page})=>{
  const {writes}=await openTransferCase(page);await fillValidDraft(page);
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect(page.getByText('Stock transfer draft created successfully.',{exact:false})).toBeVisible();
  await expect(page).toHaveURL(/transfer_id=pw-created-transfer/);expect(writes).toHaveLength(1);
 });
 test('TSTR-034 Draft creation API failure surfaces rejection and retains entered fields',async({page})=>{
  const {writes}=await openTransferCase(page,{createStatus:422});await fillValidDraft(page);
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect(page.getByRole('alert').filter({hasText:'Draft creation rejected'})).toBeVisible();
  await expect(formProduct(page)).toHaveValue('pw-product');expect(writes).toHaveLength(1);
 });
 test('TSTR-035 Edit draft loads selected locations, notes and existing item quantity',async({page})=>{
  await openTransferCase(page,{},selectedUrl);await page.getByRole('button',{name:'Edit draft'}).click();
  await expect(formFrom(page)).toHaveValue('pw-source');await expect(formTo(page)).toHaveValue('pw-dest');
  await expect(page.locator('#transfer-notes')).toHaveValue('Restock front desk');
  await expect(formProduct(page)).toHaveValue('pw-product');await expect(formQuantity(page)).toHaveValue('2');
 });
 test('TSTR-036 Saving edited draft sends versioned PATCH with item data',async({page})=>{
  const {writes}=await openTransferCase(page,{},selectedUrl);
  await page.getByRole('button',{name:'Edit draft'}).click();
  await page.locator('#transfer-notes').fill('Updated business purpose');
  await page.getByRole('button',{name:'Save draft changes'}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({method:'PATCH',path:expect.stringMatching(/\/stock-transfers\/pw-transfer-1$/),body:{version:1,notes:'Updated business purpose',items:[{product_id:'pw-product',quantity:2}]}});
 });
 test('TSTR-037 Version conflict on edited draft shows feedback without reset',async({page})=>{
  const {writes}=await openTransferCase(page,{updateStatus:409},selectedUrl);
  await page.getByRole('button',{name:'Edit draft'}).click();await page.locator('#transfer-notes').fill('Keep me');
  await page.getByRole('button',{name:'Save draft changes'}).click();
  await expect(page.getByRole('alert').filter({hasText:'Version conflict'})).toBeVisible();
  await expect(page.locator('#transfer-notes')).toHaveValue('Keep me');expect(writes).toHaveLength(1);
 });
 test('TSTR-038 Cancel editing resets create form without any PATCH',async({page})=>{
  const {writes}=await openTransferCase(page,{},selectedUrl);await page.getByRole('button',{name:'Edit draft'}).click();
  await page.getByRole('button',{name:'Cancel editing'}).click();
  await expect(formFrom(page)).toHaveValue('');await expect(formQuantity(page)).toHaveValue('');
  await expect(page.getByRole('button',{name:'Create transfer draft'})).toBeVisible();expect(writes).toHaveLength(0);
 });
 test('TSTR-039 Availability preview exposes reserved stock, requested and remaining units',async({page})=>{
  const {seen}=await openTransferCase(page,{},selectedUrl);
  await expect(page.getByRole('heading',{name:'Execution Check'})).toBeVisible();
  await expect(page.getByText('Source stock sufficient')).toBeVisible();
  await expect(page.getByRole('button',{name:'Execute transfer'})).toBeEnabled();
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/availability'))).toBe(true);
 });
 test('TSTR-040 Non-executable availability disables execute button',async({page})=>{
  const bad={...transferAvailabilityReady,executable:false,message:'Insufficient unreserved source stock',items:[{...transferAvailabilityReady.items[0],sufficient:false}]};
  const {writes}=await openTransferCase(page,{availability:bad},selectedUrl);
  await expect(page.getByText('Insufficient unreserved source stock')).toBeVisible();
  await expect(page.getByRole('button',{name:'Execute transfer'})).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('TSTR-041 Declining native execution confirmation sends no POST',async({page})=>{
  const {writes}=await openTransferCase(page,{},selectedUrl);
  page.once('dialog',async dialog=>{expect(dialog.message()).toContain('Confirm action: Execute transfer?');await dialog.dismiss();});
  await page.getByRole('button',{name:'Execute transfer'}).click();
  expect(writes).toHaveLength(0);await expect(page.getByRole('button',{name:'Edit draft'})).toBeVisible();
 });
 test('TSTR-042 Accepting execution confirmation POSTs version without silently running first',async({page})=>{
  const {writes}=await openTransferCase(page,{},selectedUrl);expect(writes).toHaveLength(0);
  page.once('dialog',async dialog=>{expect(dialog.message()).toContain('cannot be edited afterwards.');await dialog.accept();});
  await page.getByRole('button',{name:'Execute transfer'}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({method:'POST',path:expect.stringMatching(/\/pw-transfer-1\/execute$/),body:{version:1}});
 });
 test('TSTR-043 Execution API rejection leaves draft actions available and shows error',async({page})=>{
  const {writes}=await openTransferCase(page,{executeStatus:409},selectedUrl);
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Execute transfer'}).click();
  await expect(page.getByRole('alert').filter({hasText:'Execution rejected'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Edit draft'})).toBeVisible();expect(writes).toHaveLength(1);
 });
 test('TSTR-044 Declining cancellation confirmation leaves draft and sends no mutation',async({page})=>{
  const {writes}=await openTransferCase(page,{},selectedUrl);
  page.once('dialog',dialog=>dialog.dismiss());await page.getByRole('button',{name:'Cancel draft'}).click();
  await expect(page.getByRole('button',{name:'Edit draft'})).toBeVisible();expect(writes).toHaveLength(0);
 });
 test('TSTR-045 Confirmed cancellation submits numeric version and trimmed reason',async({page})=>{
  const {writes}=await openTransferCase(page,{},selectedUrl);
  await page.locator('#transfer-cancel-reason').fill('  Planning cancelled  ');
  page.once('dialog',async dialog=>{expect(dialog.message()).toContain('Planning cancelled');await dialog.accept();});
  await page.getByRole('button',{name:'Cancel draft'}).click();await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({method:'POST',path:expect.stringMatching(/\/pw-transfer-1\/cancel$/),body:{version:1,reason:'Planning cancelled'}});
 });
 test('TSTR-046 Read-only role cannot create, edit, execute or cancel drafts',async({page})=>{
  const {writes}=await openTransferCase(page,{role:'PW_TRANSFER_READ_ONLY'},selectedUrl);
  await expect(page.getByRole('button',{name:'Create transfer draft'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Edit draft'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Execute transfer'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Cancel draft'})).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('TSTR-047 Detail CSV preserves historical route and item names',async({page})=>{
  await openTransferCase(page,{},selectedUrl);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export detail CSV'}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^stock-transfer-detail-.*\.csv$/);
  const {readFile}=await import('node:fs/promises');const bytes=await readFile(await download.path());
  expect(bytes.toString()).toContain('North room');expect(bytes.toString()).toContain('Synthetic Product');
 });
 test('TSTR-048 Executed transfer print/detail export blocks until movement audit GET succeeds',async({page})=>{
  const executed={...draftDetail,status:'executed',executed_at:'2026-10-29T11:00:00Z'};
  await openTransferCase(page,{detail:executed,movementError:true},selectedUrl);
  await expect(page.getByText('Failed to load the transfer movement audit.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Print detail'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Export detail CSV'})).toBeDisabled();
 });
 test('TSTR-049 Executed detail displays paired out/in audit rows and status',async({page})=>{
  const executed={...draftDetail,status:'executed',executed_at:'2026-10-29T11:00:00Z'};
  await openTransferCase(page,{detail:executed,movements:transferMovements},selectedUrl);
  await expect(page.getByRole('heading',{name:'Movement Audit'})).toBeVisible();
  await expect(page.getByText('Transfer sent',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Transfer received',{exact:true}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Edit draft'})).toHaveCount(0);
 });
 test('TSTR-050 Filtered CSV sends active query and safely escapes spreadsheet formulas',async({page})=>{
  const row={...draftTransfer,notes:'=HYPERLINK("https://example.test","unsafe")'};
  const {seen,writes}=await openTransferCase(page,{rows:[row]});
  await page.locator('#transfer-status-filter').selectOption('draft');
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export CSV'}).click();
  const download=await downloadPromise;const {readFile}=await import('node:fs/promises');
  const csv=(await readFile(await download.path())).toString();
  expect(csv).toContain('HYPERLINK');expect(csv).not.toContain(',"=HYPERLINK');
  await expect.poll(()=>seen.some(x=>x.method==='GET'&&x.path.endsWith('/stock-transfers')&&new URL(x.url).searchParams.get('status')==='draft'&&new URL(x.url).searchParams.get('limit')==='500')).toBe(true);
  expect(writes).toHaveLength(0);
 });
});


// Batch 175 — Stock Transfers: source-backed operational validation, historical evidence,
// safe CSV export, and readiness. Synthetic tenant fixtures and intercepted APIs only.
// These scenarios are UNRUN and do not establish actual posting, locks, or isolation.
test.describe('Stock Transfers — operational boundaries and historical evidence (Batch 175)',()=>{
 test('TSTR-051 Changing the source location requests its scoped product availability options',async({page})=>{
  const {seen}=await openTransferCase(page);await formFrom(page).selectOption('pw-source');
  await expect.poll(()=>seen.some(r=>r.path.endsWith('/options')&&new URL(r.url).searchParams.get('source_storage_location_id')==='pw-source')).toBe(true);
 });
 test('TSTR-052 Selecting destination disables that same location as a source choice',async({page})=>{
  await openTransferCase(page);await formTo(page).selectOption('pw-dest');
  await expect(formFrom(page).locator('option[value="pw-dest"]')).toBeDisabled();
 });
 test('TSTR-053 Source locations explicitly marked ineligible cannot be selected',async({page})=>{
  await openTransferCase(page,{locations:[{id:'pw-source',name:'North room',source_eligible:false},{id:'pw-dest',name:'South room',source_eligible:true}]});
  await expect(formFrom(page).locator('option[value="pw-source"]')).toBeDisabled();
 });
 test('TSTR-054 A selected source location cannot also be chosen as the destination',async({page})=>{
  await openTransferCase(page);await formFrom(page).selectOption('pw-source');
  await expect(formTo(page).locator('option[value="pw-source"]')).toBeDisabled();
 });
 test('TSTR-055 Item-row add and remove preserves the required last row',async({page})=>{
  const {writes}=await openTransferCase(page);await expect(page.getByRole('button',{name:'Remove'})).toBeDisabled();
  await page.getByRole('button',{name:'Add item'}).click();await expect(formProduct(page,1)).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Remove',exact:true}).nth(1).click();
  await expect(formProduct(page,1)).toHaveCount(0);
  await expect(page.locator('select[id^="transfer-product-"]:not(#transfer-product-filter)')).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Remove',exact:true})).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('TSTR-056 Product selector blocks selecting the same product twice in one draft',async({page})=>{
  await openTransferCase(page);await formFrom(page).selectOption('pw-source');await formProduct(page).selectOption('pw-product');
  await page.getByRole('button',{name:'Add item'}).click();
  await expect(formProduct(page,1).locator('option[value="pw-product"]')).toBeDisabled();
 });
 test('TSTR-057 Transfer notes expose the source-defined 4,000 character limit',async({page})=>{
  await openTransferCase(page);await expect(page.locator('#transfer-notes')).toHaveAttribute('maxlength','4000');
 });
 test('TSTR-058 Cancellation reason exposes the source-defined 1,000 character limit',async({page})=>{
  await openTransferCase(page,{},selectedUrl);
  await expect(page.locator('#transfer-cancel-reason')).toHaveAttribute('maxlength','1000');
 });
 test('TSTR-059 Blank optional notes are sent as null, not whitespace',async({page})=>{
  const {writes}=await openTransferCase(page);await fillValidDraft(page);
  await page.locator('#transfer-notes').fill('   ');await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body.notes).toBe(null);
 });
 test('TSTR-060 Serial input trims and deduplicates comma/newline-separated entries',async({page})=>{
  const {writes}=await openTransferCase(page,{products:[{...transferOptions.products[0],serial_tracking_enabled:true}]});
  await fillValidDraft(page);await page.locator('#transfer-serials-0').fill(' A-1, B-2\n A-1 \nB-2');
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0].body.items[0].serial_numbers).toEqual(['A-1','B-2']);
 });
 test('TSTR-061 Decimal quantity on a serial-tracked base unit is rejected before POST',async({page})=>{
  const {writes}=await openTransferCase(page,{products:[{...transferOptions.products[0],serial_tracking_enabled:true}]});
  await fillValidDraft(page);await formQuantity(page).fill('1.5');
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect(page.getByText('Serial-tracked transfer quantities must be whole numbers.')).toBeVisible();expect(writes).toHaveLength(0);
 });
 test('TSTR-062 Duplicate serial numbers do not satisfy the requested unit count',async({page})=>{
  const {writes}=await openTransferCase(page,{products:[{...transferOptions.products[0],serial_tracking_enabled:true}]});
  await fillValidDraft(page);await page.locator('#transfer-serials-0').fill('A-1\nA-1');
  await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect(page.getByText('requires one serial number for each transferred unit.',{exact:false})).toBeVisible();expect(writes).toHaveLength(0);
 });
 test('TSTR-063 Source stock/lot disagreement blocks creating a draft before any mutation',async({page})=>{
  const {writes}=await openTransferCase(page,{products:[{...transferOptions.products[0],stock_lot_reconciled:false}]});
  await fillValidDraft(page);await page.getByRole('button',{name:'Create transfer draft'}).click();
  await expect(page.getByText('Source stock and lot balances do not reconcile',{exact:false})).toBeVisible();expect(writes).toHaveLength(0);
 });
 test('TSTR-064 Source products marked non-transferable are disabled in the selector',async({page})=>{
  await openTransferCase(page,{products:[{...transferOptions.products[0],transferable:false}]});
  await formFrom(page).selectOption('pw-source');
  await expect(formProduct(page).locator('option[value="pw-product"]')).toBeDisabled();
 });
 test('TSTR-065 Source-specific option failure warns and blocks the form submit',async({page})=>{
  await openTransferCase(page,{sourceOptionsError:true});await formFrom(page).selectOption('pw-source');
  await expect(page.getByText('Product and stock information is unavailable for the selected source location.',{exact:false}).first()).toBeVisible();
  await expect(page.getByRole('button',{name:'Create transfer draft'})).toBeDisabled();
 });
 test('TSTR-066 Whitespace-only cancellation reason is submitted as null after confirmation',async({page})=>{
  const {writes}=await openTransferCase(page,{},selectedUrl);
  await page.locator('#transfer-cancel-reason').fill('   ');
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Cancel draft'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body.reason).toBe(null);
 });
 test('TSTR-067 Cancel API rejection preserves draft controls and displays its error',async({page})=>{
  const {writes}=await openTransferCase(page,{cancelStatus:409},selectedUrl);
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Cancel draft'}).click();
  await expect(page.getByText('Cancellation rejected',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Edit draft'})).toBeVisible();expect(writes).toHaveLength(1);
 });
 test('TSTR-068 Draft detail CSV exports without requiring a movement-audit request',async({page})=>{
  const {seen}=await openTransferCase(page,{},selectedUrl);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export detail CSV'}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^stock-transfer-detail-.*\.csv$/);
  expect(seen.some(r=>r.path.endsWith('/movements'))).toBe(false);
 });
 test('TSTR-069 Executed transfer with unknown category renders historical-category fallback',async({page})=>{
  const item={...draftDetail.items[0],product_name:null,product_category:null};
  const detail={...draftDetail,status:'executed',executed_at:'2026-10-29T11:00:00Z',items:[item]};
  await openTransferCase(page,{detail,movements:transferMovements},selectedUrl);
  await expect(page.getByText('Historical category unavailable',{exact:true})).toBeVisible();
 });
 test('TSTR-070 Detail with missing historical product name does not invent current product identity',async({page})=>{
  const detail={...draftDetail,items:[{...draftDetail.items[0],product_name:null}]};
  await openTransferCase(page,{detail},selectedUrl);
  await expect(page.getByText('Historical product unavailable',{exact:true})).toBeVisible();
 });
 test('TSTR-071 Executed transfer without recorded operator uses historical actor fallback',async({page})=>{
  const detail={...draftDetail,status:'executed',executed_at:'2026-10-29T11:00:00Z',executed_by_user_name:null,created_by_user_name:null};
  await openTransferCase(page,{detail,movements:[]},selectedUrl);
  await expect(page.getByText('Historical actor unavailable',{exact:false}).first()).toBeVisible();
 });
 test('TSTR-072 System-owned enterprise cancellation marker is human-readable',async({page})=>{
  const reason='cancelled_from_enterprise_inventory_ui';
  const row={...draftTransfer,status:'cancelled',cancelled_at:'2026-10-29T11:00:00Z',cancellation_reason:reason,cancellation_reason_is_system:true};
  const detail={...draftDetail,...row};await openTransferCase(page,{rows:[row],detail},selectedUrl);
  await expect(page.getByText('Cancelled from Enterprise Inventory',{exact:false}).first()).toBeVisible();
  await expect(page.getByText(reason,{exact:false})).toHaveCount(0);
 });
 test('TSTR-073 Appended cancellation reason is not duplicated in visible transfer notes',async({page})=>{
  const row={...draftTransfer,status:'cancelled',notes:'Planned inventory move\nCancelled: no longer needed',cancellation_reason:'no longer needed'};
  const detail={...draftDetail,...row};await openTransferCase(page,{rows:[row],detail},selectedUrl);
  await expect(page.getByText('Planned inventory move',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('Cancelled: no longer needed',{exact:false})).toHaveCount(0);
 });
 test('TSTR-074 Unreconciled stock/lot execution preview exposes a specific readiness label',async({page})=>{
  const item={...transferAvailabilityReady.items[0],sufficient:false,stock_lot_reconciled:false};
  const availability={...transferAvailabilityReady,executable:false,message:'Cannot execute until reconciled',items:[item]};
  await openTransferCase(page,{availability},selectedUrl);
  await expect(page.getByText('Stock/lot mismatch',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Execute transfer'})).toBeDisabled();
 });
 test('TSTR-075 Changed base unit requires a draft review before execution',async({page})=>{
  const item={...transferAvailabilityReady.items[0],sufficient:false,unit_changed_since_draft:true,current_product_unit:'kg'};
  await openTransferCase(page,{availability:{...transferAvailabilityReady,executable:false,items:[item]}},selectedUrl);
  await expect(page.getByText('Review unit',{exact:true})).toBeVisible();
  await expect(page.getByText('Current base unit:',{exact:false})).toBeVisible();
 });
 test('TSTR-076 Changed serial-tracking rules block execution and show the review guidance',async({page})=>{
  const item={...transferAvailabilityReady.items[0],sufficient:false,serial_tracking_changed_since_draft:true};
  await openTransferCase(page,{availability:{...transferAvailabilityReady,executable:false,items:[item]}},selectedUrl);
  await expect(page.getByText('Review serial tracking',{exact:true})).toBeVisible();
  await expect(page.getByText('Product serial tracking changed after this draft was saved.',{exact:false})).toBeVisible();
 });
 test('TSTR-077 Missing available/remaining quantity prints unavailable instead of zero',async({page})=>{
  const item={...transferAvailabilityReady.items[0],available_quantity:null,remaining_after_transfer:null};
  await openTransferCase(page,{availability:{...transferAvailabilityReady,items:[item]}},selectedUrl);
  await expect(page.getByText('Unavailable',{exact:false}).first()).toBeVisible();
 });
 test('TSTR-078 Executed transfer without audit movements signals support review but permits evidence export',async({page})=>{
  const detail={...draftDetail,status:'executed',executed_at:'2026-10-29T11:00:00Z'};
  await openTransferCase(page,{detail,movements:[]},selectedUrl);
  await expect(page.getByText('No movement audit rows were found for this executed transfer.',{exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Export detail CSV'})).toBeEnabled();
 });
 test('TSTR-079 Zero-result CSV export retains column headers and reports zero rows',async({page})=>{
  const {writes}=await openTransferCase(page,{rows:[]});
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV'}).click();
  const download=await downloadPromise;const {readFile}=await import('node:fs/promises');
  const csv=(await readFile(await download.path())).toString();expect(csv).toContain('From Location');
  await expect(page.getByText('Exported 0 filtered stock transfers.',{exact:false})).toBeVisible();expect(writes).toHaveLength(0);
 });
 test('TSTR-080 A failed CSV retrieval reports an error without creating an export',async({page})=>{
  await openTransferCase(page,{exportError:true});
  await page.getByRole('button',{name:'Export CSV'}).click();
  await expect(page.getByText('Export list unavailable',{exact:false})).toBeVisible();
 });
});
