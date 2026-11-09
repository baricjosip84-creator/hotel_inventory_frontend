import {loginAsDisposableRole} from '../../../support/roleSession';
import {targetBaseURL} from '../../../support/environment';
import {test,expect,type Page,type Route} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';

// Batch 24 — InventoryReservationsPage.tsx /inventory-reservations.
// Only GET requests are intercepted. Mutations deliberately fail closed here.
// Separate later tests will cover actionable lifecycle operations without live writes.
type ReservationGet={method:string;path:string;url:string};
type ReservationSetup={rows?:any[];sourceSummary?:any[];freeStock?:any[];conflicts?:any[];detail?:any;audit?:any[];listError?:boolean};
const reservationRow={id:'pw-res-1',version:2,reservation_number:'RES-PW-1',status:'draft',source_type:'manual',priority:'normal',requesting_department:'Facilities',target_department:'Maintenance',open_reserved_quantity_total:0,items:[]};
const reservationOptions={products:[{id:'pw-product',name:'Synthetic Product',unit:'pcs',barcode:'PW-001',is_active:true}],storage_locations:[{id:'pw-location',name:'Warehouse',is_active:true}],departments:['Facilities']};
async function reservationsOpen(page:Page,setup:ReservationSetup={},path='/inventory-reservations'){
 await loginAsTenant(page);const seen:ReservationGet[]=[];
 await page.route('**/inventory-reservations**',async(route:Route)=>{
  const r=route.request();
  if(r.isNavigationRequest())return route.continue();
  const url=new URL(r.url()),p=url.pathname,m=r.method();seen.push({method:m,path:p,url:url.toString()});
  if(m!=='GET')throw Error(`Unmocked inventory reservation mutation prohibited: ${m} ${p}`);
  if(p.endsWith('/options'))return fulfillJson(route,reservationOptions);
  if(p.endsWith('/summary'))return fulfillJson(route,{active_reservations:2,draft_reservations:1,expired_reservations:0,expiration_attention_count:0,open_reserved_quantity_total:7});
  if(p.endsWith('/source-summary'))return fulfillJson(route,setup.sourceSummary??[]);
  if(p.endsWith('/projected-free-stock'))return fulfillJson(route,setup.freeStock??[]);
  if(p.endsWith('/conflicts'))return fulfillJson(route,setup.conflicts??[]);
  if(p.endsWith('/export.csv'))return route.fulfill({status:200,contentType:'text/csv',body:'reservation_number,status\nRES-PW-1,draft\n'});
  if(p.endsWith('/pw-res-1/audit'))return fulfillJson(route,setup.audit??[]);
  if(p.endsWith('/pw-res-1'))return fulfillJson(route,setup.detail??reservationRow);
  if(p.endsWith('/inventory-reservations'))return fulfillJson(route,setup.listError?{message:'Synthetic reservations queue error'}:setup.rows??[],setup.listError?503:200);
  return fulfillJson(route,{message:'Unrecognized synthetic reservation GET'},404);
 });
 await page.goto(path);await expect(page.getByText('Stock reservations',{exact:true})).toBeVisible();return seen;
}
const listRequests=(s:ReservationGet[])=>s.filter(x=>x.method==='GET'&&x.path.endsWith('/inventory-reservations'));
const listHas=(s:ReservationGet[],k:string,v:string)=>listRequests(s).some(x=>new URL(x.url).searchParams.get(k)===v);
const queue=(page:Page)=>page.locator('#reservation-queue');

test.describe('Inventory Reservations — overview, queue, filters and source links (Batch 24)',()=>{
 test('TRSV-001 Reservation operations hero and separate queue render',async({page})=>{
  await reservationsOpen(page);await expect(page.getByText('Reservation operations',{exact:true})).toBeVisible();
  await expect(page.getByText('Reservation queue',{exact:true}).last()).toBeVisible();
 });
 test('TRSV-002 Overview loads options, summary, source demand, projected stock and conflicts separately',async({page})=>{
  const seen=await reservationsOpen(page);for(const path of ['/options','/summary','/source-summary','/projected-free-stock','/conflicts'])
   await expect.poll(()=>seen.some(x=>x.path.endsWith(path))).toBe(true);
 });
 test('TRSV-003 Summary shows source-backed open reservations, drafts and open protected units',async({page})=>{
  await reservationsOpen(page);
  await expect(page.getByText('Open reservations',{exact:true})).toBeVisible();
  await expect(page.getByText('Reserved quantity',{exact:true})).toBeVisible();
  await expect(page.getByText('Drafts',{exact:true})).toBeVisible();
 });
 test('TRSV-004 Workspace tabs expose overview, creation, queue and capacity destinations',async({page})=>{
  await reservationsOpen(page);for(const tab of ['Overview','Create reservation','Reservation queue','Capacity & conflicts'])
   await expect(page.getByRole('tab',{name:tab,exact:false}).first()).toBeVisible();
 });
 test('TRSV-005 Empty queue shows source-defined no-matches guidance',async({page})=>{
  await reservationsOpen(page);await expect(queue(page).getByText('No reservations match these filters.')).toBeVisible();
 });
 test('TRSV-006 Status filter requests draft reservations by backend status code',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Status').selectOption('draft');
  await expect.poll(()=>listHas(seen,'status','draft')).toBe(true);
 });
 test('TRSV-007 Source type filter sends requisition to list and demand-summary queries',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Source type').selectOption('requisition');
  await expect.poll(()=>listHas(seen,'source_type','requisition')).toBe(true);
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/source-summary')&&new URL(x.url).searchParams.get('source_type')==='requisition')).toBe(true);
 });
 test('TRSV-008 Source ID filter trims spaces before list GET',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Source ID (full or partial)').fill('  pw-source-1  ');
  await expect.poll(()=>listHas(seen,'source_id','pw-source-1')).toBe(true);
 });
 test('TRSV-009 Requesting department filter trims user input',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Requesting department').fill('  Facilities  ');
  await expect.poll(()=>listHas(seen,'requesting_department','Facilities')).toBe(true);
 });
 test('TRSV-010 Target department filter is passed into server query',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Target department').fill(' Maintenance ');
  await expect.poll(()=>listHas(seen,'target_department','Maintenance')).toBe(true);
 });
 test('TRSV-011 Urgent priority filter uses explicit priority code',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Priority').selectOption('urgent');
  await expect.poll(()=>listHas(seen,'priority','urgent')).toBe(true);
 });
 test('TRSV-012 Product filter uses actual selected product ID',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Product').selectOption('pw-product');
  await expect.poll(()=>listHas(seen,'product_id','pw-product')).toBe(true);
 });
 test('TRSV-013 Free text search trims before list GET, preserving text content',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByPlaceholder('Number, source ID, department, note, product, barcode, or location').fill('  maintenance item  ');
  await expect.poll(()=>listHas(seen,'search','maintenance item')).toBe(true);
 });
 test('TRSV-014 Clear filters returns select to All and removes search query',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Status').selectOption('active');
  await expect.poll(()=>listHas(seen,'status','active')).toBe(true);
  await queue(page).getByRole('button',{name:'Clear filters'}).click();await expect(queue(page).getByLabel('Status')).toHaveValue('');
  await expect.poll(()=>listRequests(seen).some(x=>!new URL(x.url).searchParams.has('status'))).toBe(true);
 });
 test('TRSV-015 Initial queue GET uses limit page size plus one and offset zero',async({page})=>{
  const seen=await reservationsOpen(page);await expect.poll(()=>listHas(seen,'limit','26')).toBe(true);
  expect(listRequests(seen).some(x=>new URL(x.url).searchParams.get('offset')==='0')).toBe(true);
 });
 test('TRSV-016 Setting page size 50 requests 51 rows for next-page detection',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Rows per page').selectOption('50');
  await expect.poll(()=>listHas(seen,'limit','51')).toBe(true);
 });
 test('TRSV-017 Next page advances offset 25 when a 26th row exists',async({page})=>{
  const rows=Array.from({length:26},(_,i)=>({...reservationRow,id:`pw-r-${i}`,reservation_number:`RES-PW-${i}`}));
  const seen=await reservationsOpen(page,{rows});await queue(page).getByRole('button',{name:'Next',exact:true}).click();
  await expect.poll(()=>listHas(seen,'offset','25')).toBe(true);
 });
 test('TRSV-018 Selected reservation deep link separately loads detail and audit records',async({page})=>{
  const seen=await reservationsOpen(page,{},'/inventory-reservations?reservationId=pw-res-1');
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/pw-res-1'))).toBe(true);
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/pw-res-1/audit'))).toBe(true);
  await expect(page.locator('#reservation-detail').getByText('RES-PW-1')).toBeVisible();
 });
 test('TRSV-019 Projected free stock uses independent source rows and capacity table',async({page})=>{
  await reservationsOpen(page,{freeStock:[{product_id:'pw-product',storage_location_id:'pw-location',on_hand_quantity:15,reserved_quantity:5,projected_free_quantity:10}]});
  await expect(page.getByText('Projected free stock',{exact:true})).toBeVisible();
  await expect(page.getByText('10',{exact:true}).last()).toBeVisible();
 });
 test('TRSV-020 Linked source requires a correctly formed UUID before draft creation',async({page})=>{
  const seen=await reservationsOpen(page);
  const creation=page.locator('#reservation-create');await creation.getByLabel('Source type').selectOption('event');
  await creation.getByPlaceholder('Required UUID for linked source').fill('not-a-uuid');
  await expect(creation.getByText('Enter a valid linked-source UUID',{exact:false})).toBeVisible();
  await expect(creation.getByRole('button',{name:'Create draft reservation'})).toBeDisabled();
  expect(seen.every(x=>x.method==='GET')).toBe(true);
 });
});

// Batch 25 — source-grounded lifecycle/form tests. All writes are intercepted in the
// disposable test browser; server permissions, locks and stock posting remain unproven.
const selectedPath='/inventory-reservations?reservationId=pw-res-1';
const sampleLine={id:'pw-line-1',product_id:'pw-product',product_name:'Synthetic Product',storage_location_id:'pw-location',storage_location_name:'Warehouse',requested_quantity:8,reserved_quantity:5,open_reserved_quantity:5,fulfilled_quantity:0,released_quantity:0,allocation_status:'allocated',allocation_strategy:'specific_location'};
function sampleReservation(status='draft',patch:Record<string,unknown>={}):any{return {...reservationRow,version:7,status,requested_quantity_total:8,reserved_quantity_total:5,open_reserved_quantity_total:5,created_by_user_id:'external-owner-id',items:[sampleLine],...patch};}
type SeenWrite={path:string;method:string;body:any;headers:Record<string,string>};
async function collectReservationWrites(page:Page,result:Record<string,unknown>={}):Promise<SeenWrite[]> {
 const writes:SeenWrite[]=[];
 await page.route('**/inventory-reservations**',async route=>{
  const req=route.request();if(req.method()==='GET')return route.fallback();
  const path=new URL(req.url()).pathname;
  if(!['POST','PUT'].includes(req.method()))throw Error(`Unexpected reservation mutation: ${req.method()}`);
  const body=req.postDataJSON()??{};
  writes.push({path,method:req.method(),body,headers:req.headers()});
  if(path.endsWith('/expire-due'))return fulfillJson(route,{scanned_count:3,expired_count:2,failed_count:1});
  return fulfillJson(route,{...sampleReservation('active'),...result});
 });
 return writes;
}
const createArea=(p:Page)=>p.locator('#reservation-create');
const detailArea=(p:Page)=>p.locator('#reservation-detail');
const createRow=(p:Page)=>createArea(p).locator('tbody tr').first();
async function fillCreateRow(p:Page,quantity='3'){
 await createRow(p).locator('select').first().selectOption('pw-product');
 await createRow(p).locator('input[type=number]').fill(quantity);
}
async function detailOpen(p:Page,status='draft',patch:Record<string,unknown>={}){
 return reservationsOpen(p,{detail:sampleReservation(status,patch)},selectedPath);
}
async function confirmedAction(page:Page,button:string,accept=true){
 page.once('dialog',async dialog=>{expect(dialog.type()).toBe('confirm');await (accept?dialog.accept():dialog.dismiss());});
 await detailArea(page).getByRole('button',{name:button,exact:true}).click();
}
const sampleConflict={reservation_id:'pw-res-1',reservation_number:'RES-PW-1',reservation_item_id:'pw-line-1',status:'partially_allocated',priority:'high',source_type:'manual',product_id:'pw-product',product_name:'Synthetic Product',storage_location_id:'pw-location',storage_location_name:'Warehouse',requested_quantity:8,reserved_quantity:3,remaining_to_allocate:5,open_reserved_quantity:3,on_hand_quantity:4,total_open_reserved_quantity:8,projected_free_quantity:-4,conflict_quantity:4,conflict_reason:'insufficient_available_stock'};

test.describe('Inventory Reservations — editable drafts, lifecycle and governance (Batch 25)',()=>{
 test('TRSV-021 Blank reservation line disables draft submission and explains missing product and quantity',async({page})=>{
  await reservationsOpen(page);await expect(createArea(page).getByText('Add at least one product and quantity.')).toBeVisible();
  await expect(createArea(page).getByRole('button',{name:'Create draft reservation'})).toBeDisabled();
 });
 test('TRSV-022 Entered zero and negative reservation quantities are rejected before POST',async({page})=>{
  await reservationsOpen(page);const writes=await collectReservationWrites(page);
  for(const value of ['0','-2']){
   await fillCreateRow(page,value);
   await expect(createArea(page).getByText('Every entered line needs a quantity greater than zero.')).toBeVisible();
   await expect(createArea(page).getByRole('button',{name:'Create draft reservation'})).toBeDisabled();
  }
  expect(writes).toHaveLength(0);
 });
 test('TRSV-023 Valid event-source UUID removes linked-source validation error',async({page})=>{
  await reservationsOpen(page);await createArea(page).getByLabel('Source type').selectOption('event');
  await createArea(page).getByPlaceholder('Required UUID for linked source').fill('123e4567-e89b-12d3-a456-426614174000');
  await fillCreateRow(page);
  await expect(createArea(page).getByRole('button',{name:'Create draft reservation'})).toBeEnabled();
 });
 test('TRSV-024 Repeated same-product strategy and location lines are rejected',async({page})=>{
  await reservationsOpen(page);await fillCreateRow(page);
  await createArea(page).getByRole('button',{name:'Add line'}).click();
  const next=createArea(page).locator('tbody tr').nth(1);
  await next.locator('select').first().selectOption('pw-product');await next.locator('input[type=number]').fill('2');
  await expect(createArea(page).getByText('The same product, location, and strategy can only appear once.')).toBeVisible();
  await expect(createArea(page).getByRole('button',{name:'Create draft reservation'})).toBeDisabled();
 });
 test('TRSV-025 Specific-location allocation demands a selected storage location',async({page})=>{
  await reservationsOpen(page);await fillCreateRow(page);
  await createRow(page).locator('select').last().selectOption('specific_location');
  await expect(createArea(page).getByText('Choose a storage location for each Specific location line.')).toBeVisible();
  await createRow(page).locator('select').nth(1).selectOption('pw-location');
  await expect(createArea(page).getByRole('button',{name:'Create draft reservation'})).toBeEnabled();
 });
 test('TRSV-026 Create draft submits normalized source and numeric line quantity',async({page})=>{
  await reservationsOpen(page);const writes=await collectReservationWrites(page,{status:'draft'});
  await createArea(page).getByLabel('Source type').selectOption('event');
  await createArea(page).getByPlaceholder('Required UUID for linked source').fill(' 123e4567-e89b-12d3-a456-426614174000 ');
  await fillCreateRow(page,'3.5');await createArea(page).getByLabel('Notes').fill('  synthetic reserved units  ');
  await createArea(page).getByRole('button',{name:'Create draft reservation'}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0].path).toMatch(/\/inventory-reservations$/);expect(writes[0].method).toBe('POST');
  expect(writes[0].body).toMatchObject({source_type:'event',source_id:'123e4567-e89b-12d3-a456-426614174000',notes:'synthetic reserved units',items:[{product_id:'pw-product',requested_quantity:3.5,allocation_strategy:'any_location'}]});
 });
 test('TRSV-027 Owner-permitted draft edit sends If-Match-Version and edited lines',async({page})=>{
  await detailOpen(page);const writes=await collectReservationWrites(page,{status:'draft'});
  await detailArea(page).getByRole('button',{name:'Edit draft'}).click();
  const panel=detailArea(page);await panel.getByRole('button',{name:'Save draft changes'}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0].method).toBe('PUT');expect(writes[0].headers['if-match-version']).toBe('7');
  expect(writes[0].body.items[0].product_id).toBe('pw-product');
 });
 test('TRSV-028 Protected requisition draft does not expose manual edit action',async({page})=>{
  await detailOpen(page,'draft',{source_type:'requisition'});
  await expect(detailArea(page).getByRole('button',{name:'Edit draft'})).toHaveCount(0);
  await expect(detailArea(page).getByText('Fulfill this linked demand from the Requisitions page.',{exact:false})).toBeVisible();
 });
 test('TRSV-029 Draft Activate requests lifecycle POST only after explicit confirmation',async({page})=>{
  await detailOpen(page);const writes=await collectReservationWrites(page);await confirmedAction(page,'Activate');
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0]).toMatchObject({method:'POST',path:expect.stringMatching(/\/pw-res-1\/activate$/)});
 });
 test('TRSV-030 Allocate sends allow_partial and current detail expected_version',async({page})=>{
  await detailOpen(page,'active');const writes=await collectReservationWrites(page);await confirmedAction(page,'Allocate');
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].path).toMatch(/\/pw-res-1\/allocate$/);
  expect(writes[0].body).toMatchObject({allow_partial:true,expected_version:7});
 });
 test('TRSV-031 Release sends entered lifecycle note to release endpoint',async({page})=>{
  await detailOpen(page,'allocated');const writes=await collectReservationWrites(page);
  await detailArea(page).getByLabel('Lifecycle note').fill('Reassign to urgent demand');await confirmedAction(page,'Release remaining');
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].path).toMatch(/\/pw-res-1\/release$/);
  expect(writes[0].body.release_note).toBe('Reassign to urgent demand');
 });
 test('TRSV-032 Cancellation stays disabled without reason and requires confirmation',async({page})=>{
  await detailOpen(page,'active');const writes=await collectReservationWrites(page);
  await expect(detailArea(page).getByRole('button',{name:'Cancel',exact:true})).toBeDisabled();
  await detailArea(page).getByLabel('Lifecycle note').fill('Duplicate request');await confirmedAction(page,'Cancel',false);
  expect(writes).toHaveLength(0);await confirmedAction(page,'Cancel',true);
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body.cancellation_reason).toBe('Duplicate request');
 });
 test('TRSV-033 Future expiration timestamp prevents manual Expire action',async({page})=>{
  await detailOpen(page,'active',{expires_at:'2099-01-01T00:00:00Z'});
  await expect(detailArea(page).getByRole('button',{name:'Expire due reservation'})).toHaveCount(0);
  await expect(detailArea(page).getByText('This reservation cannot be expired manually until',{exact:false})).toBeVisible();
 });
 test('TRSV-034 Tenant due-expiration confirms and displays real response counts',async({page})=>{
  await reservationsOpen(page);const writes=await collectReservationWrites(page);
  await page.route('**/inventory-reservations/summary',route=>fulfillJson(route,{active_reservations:2,draft_reservations:1,expired_reservations:0,expiration_attention_count:3,open_reserved_quantity_total:7}));
  await page.getByRole('button',{name:'Refresh page'}).click();
  const button=queue(page).getByRole('button',{name:'Expire due reservations'});
  await expect(button).toBeEnabled();page.once('dialog',async d=>d.accept());await button.click();
  await expect.poll(()=>writes.some(w=>w.path.endsWith('/expire-due'))).toBe(true);
  await expect(page.getByText('Expired 2 due reservations; scanned 3, failed 1.',{exact:false})).toBeVisible();
 });
 test('TRSV-035 Fulfill all reserved requires confirmation and posts boolean flag',async({page})=>{
  await detailOpen(page,'allocated');const writes=await collectReservationWrites(page);await confirmedAction(page,'Fulfill all reserved');
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].path).toMatch(/\/pw-res-1\/fulfill$/);
  expect(writes[0].body.fulfill_all_reserved).toBe(true);
 });
 test('TRSV-036 Partial fulfillment sends selected reservation_item_id and numeric quantity',async({page})=>{
  await detailOpen(page,'allocated');const writes=await collectReservationWrites(page);
  await detailArea(page).getByRole('spinbutton',{name:'Fulfill quantity for Synthetic Product'}).fill('2.5');
  await confirmedAction(page,'Fulfill entered quantities');await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0].body.items).toEqual([{reservation_item_id:'pw-line-1',quantity:2.5}]);
 });
 test('TRSV-037 Quantity above open reserved is rejected locally',async({page})=>{
  await detailOpen(page,'allocated');const writes=await collectReservationWrites(page);
  await detailArea(page).getByRole('spinbutton',{name:'Fulfill quantity for Synthetic Product'}).fill('6');
  await expect(detailArea(page).getByText('cannot exceed',{exact:false})).toBeVisible();
  await expect(detailArea(page).getByRole('button',{name:'Fulfill entered quantities'})).toBeDisabled();expect(writes).toHaveLength(0);
 });
 test('TRSV-038 Allocation conflicts show actual reason and conflict magnitude',async({page})=>{
  await reservationsOpen(page,{conflicts:[sampleConflict]});
  const row=page.getByText('RES-PW-1',{exact:true}).last().locator('xpath=ancestor::tr[1]');
  await expect(row.getByText('Insufficient Available Stock',{exact:false})).toBeVisible();
  await expect(row.getByText('4',{exact:true}).last()).toBeVisible();
 });
 test('TRSV-039 Conflict allocation requires dialog confirmation before posting',async({page})=>{
  await reservationsOpen(page,{conflicts:[sampleConflict]});const writes=await collectReservationWrites(page);
  const row=page.getByText('RES-PW-1',{exact:true}).last().locator('xpath=ancestor::tr[1]');
  page.once('dialog',async d=>d.dismiss());await row.getByRole('button',{name:'Allocate'}).click();expect(writes).toHaveLength(0);
  page.once('dialog',async d=>d.accept());await row.getByRole('button',{name:'Allocate'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body).toMatchObject({action:'allocate_remaining',allow_partial:true,release_unallocated:true});
 });
 test('TRSV-040 Conflict release posts resolution code only after confirmation',async({page})=>{
  await reservationsOpen(page,{conflicts:[sampleConflict]});const writes=await collectReservationWrites(page);
  const row=page.getByText('RES-PW-1',{exact:true}).last().locator('xpath=ancestor::tr[1]');
  page.once('dialog',async d=>d.accept());await row.getByRole('button',{name:'Release'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].path).toMatch(/\/pw-res-1\/resolve-conflict$/);
  expect(writes[0].body.action).toBe('release_open');
 });
 test('TRSV-041 Source summary displays grouped requested and open-reserved totals',async({page})=>{
  await reservationsOpen(page,{sourceSummary:[{source_type:'event',source_id:'123e4567-e89b-12d3-a456-426614174000',requesting_department:'Facilities',target_department:'Maintenance',reservation_count:2,active_reservation_count:1,draft_reservation_count:1,expiration_attention_count:0,requested_quantity_total:18,reserved_quantity_total:10,open_reserved_quantity_total:8}]});
  const section=page.getByText('Source / department reservation demand',{exact:true}).locator('xpath=ancestor::section[1]');
  await expect(section.getByText('123e4567-e89b-12d3-a456-426614174000')).toBeVisible();
  await expect(section.getByText('Facilities → Maintenance')).toBeVisible();
  await expect(section.getByText('18',{exact:true})).toBeVisible();
 });
 test('TRSV-042 Product filter narrows projected-free-stock endpoint without losing limit',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Product').selectOption('pw-product');
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/projected-free-stock')&&new URL(x.url).searchParams.get('product_id')==='pw-product'&&new URL(x.url).searchParams.get('limit')==='500')).toBe(true);
 });
 test('TRSV-043 CSV export GET retains active source and status filters',async({page})=>{
  const seen=await reservationsOpen(page);await queue(page).getByLabel('Status').selectOption('active');
  await queue(page).getByLabel('Source type').selectOption('event');
  await queue(page).getByRole('button',{name:'Export filtered CSV'}).click();
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/export.csv')&&new URL(x.url).searchParams.get('status')==='active'&&new URL(x.url).searchParams.get('source_type')==='event')).toBe(true);
  await expect(page.getByText('Reservation CSV export generated.')).toBeVisible();
 });
 test('TRSV-044 Audit metadata expands only on explicit details disclosure',async({page})=>{
  const audit=[{id:'pw-audit-1',entity_type:'inventory_reservation',entity_id:'pw-res-1',action:'reservation_created',user_id:'pw-user',metadata:{synthetic_key:'audit-evidence'},created_at:'2026-10-28T10:00:00Z'}];
  await reservationsOpen(page,{detail:sampleReservation(),audit},selectedPath);
  await detailArea(page).getByText('View details').click();
  await expect(detailArea(page).getByText(/audit-evidence/)).toBeVisible();
 });
 test('TRSV-045 Read-only role sees review notice, not draft creation or edit buttons',async({page})=>{
  await loginAsDisposableRole(page,'PW_RSV_READ_ONLY');
  await page.route('**/inventory-reservations**',async route=>{
   if(route.request().isNavigationRequest())return route.continue();
   const p=new URL(route.request().url()).pathname;
   if(route.request().method()!=='GET')throw Error('Read-only role attempted reservation mutation');
   if(p.endsWith('/options'))return fulfillJson(route,reservationOptions);
   if(p.endsWith('/summary'))return fulfillJson(route,{active_reservations:1,draft_reservations:1,expired_reservations:0,expiration_attention_count:0,open_reserved_quantity_total:0});
   if(p.endsWith('/pw-res-1'))return fulfillJson(route,sampleReservation());
   if(p.endsWith('/pw-res-1/audit')||p.endsWith('/source-summary')||p.endsWith('/projected-free-stock')||p.endsWith('/conflicts'))return fulfillJson(route,[]);
   if(p.endsWith('/inventory-reservations'))return fulfillJson(route,[sampleReservation()]);
   return fulfillJson(route,{message:'Unknown GET'},404);
  });
  await page.goto(selectedPath);
  await expect(createArea(page).getByText('Creation controls are hidden for this role.')).toBeVisible();
  await expect(createArea(page).getByRole('button',{name:'Create draft reservation'})).toHaveCount(0);
  await expect(detailArea(page).getByRole('button',{name:'Edit draft'})).toHaveCount(0);
 });
 test('TRSV-046 Role missing allocation permission sees no Activate or Allocate actions',async({page})=>{
  await loginAsDisposableRole(page,'PW_RSV_NO_ALLOCATE');
  await page.route('**/inventory-reservations**',async route=>{
   if(route.request().isNavigationRequest())return route.continue();
   const p=new URL(route.request().url()).pathname;
   if(route.request().method()!=='GET')throw Error('No-allocate role mutation blocked');
   if(p.endsWith('/options'))return fulfillJson(route,reservationOptions);
   if(p.endsWith('/summary'))return fulfillJson(route,{active_reservations:1,draft_reservations:0,expired_reservations:0,expiration_attention_count:0,open_reserved_quantity_total:5});
   if(p.endsWith('/pw-res-1'))return fulfillJson(route,sampleReservation('active'));
   if(p.endsWith('/pw-res-1/audit')||p.endsWith('/source-summary')||p.endsWith('/projected-free-stock')||p.endsWith('/conflicts'))return fulfillJson(route,[]);
   if(p.endsWith('/inventory-reservations'))return fulfillJson(route,[sampleReservation('active')]);
   return fulfillJson(route,{message:'Unknown GET'},404);
  });
  await page.goto(selectedPath);await expect(detailArea(page).getByText('RES-PW-1')).toBeVisible();
  await expect(detailArea(page).getByRole('button',{name:'Activate'})).toHaveCount(0);
  await expect(detailArea(page).getByRole('button',{name:'Allocate'})).toHaveCount(0);
 });
 test('TRSV-047 Own-only cannot cancel another owner, any-cancel role can',async({browser})=>{
  for(const [role,visible] of [['PW_RSV_CANCEL_OWN',false],['PW_RSV_CANCEL_ANY',true]] as const){
   const context=await browser.newContext({baseURL:targetBaseURL()});const page=await context.newPage();try{
    await loginAsDisposableRole(page,role);
    await page.route('**/inventory-reservations**',async route=>{
     if(route.request().isNavigationRequest())return route.continue();
     const p=new URL(route.request().url()).pathname;if(route.request().method()!=='GET')throw Error('Synthetic cancellation must not reach backend');
     if(p.endsWith('/options'))return fulfillJson(route,reservationOptions);
     if(p.endsWith('/summary'))return fulfillJson(route,{active_reservations:1,draft_reservations:0,expired_reservations:0,expiration_attention_count:0,open_reserved_quantity_total:5});
     if(p.endsWith('/pw-res-1'))return fulfillJson(route,sampleReservation('active'));
     if(p.endsWith('/pw-res-1/audit')||p.endsWith('/source-summary')||p.endsWith('/projected-free-stock')||p.endsWith('/conflicts'))return fulfillJson(route,[]);
     if(p.endsWith('/inventory-reservations'))return fulfillJson(route,[sampleReservation('active')]);
     return fulfillJson(route,{message:'Unknown GET'},404);
    });
    await page.goto(selectedPath);await expect(detailArea(page).getByText('RES-PW-1')).toBeVisible();
    if(visible)await expect(detailArea(page).getByRole('button',{name:'Cancel',exact:true})).toBeVisible();
    else await expect(detailArea(page).getByRole('button',{name:'Cancel',exact:true})).toHaveCount(0);
   }finally{await context.close();}
  }
 });
 test('TRSV-048 GET queue failure shows error and preserves applied status filter',async({page})=>{
  await reservationsOpen(page,{listError:true});await queue(page).getByLabel('Status').selectOption('active');
  await expect(queue(page).getByLabel('Status')).toHaveValue('active');
  await expect(page.getByText('Synthetic reservations queue error',{exact:false}).first()).toBeVisible();
 });
 test('TRSV-049 No due reservations disables tenant-wide expiry action',async({page})=>{
  await reservationsOpen(page);await expect(queue(page).getByRole('button',{name:'Expire due reservations'})).toBeDisabled();
 });
 test('TRSV-050 Outbound-managed reservation hides manual lifecycle buttons',async({page})=>{
  await detailOpen(page,'allocated',{source_type:'outbound'});
  for(const action of ['Activate','Allocate','Fulfill all reserved','Release remaining','Cancel'])
   await expect(detailArea(page).getByRole('button',{name:action,exact:true})).toHaveCount(0);
  await expect(detailArea(page).getByText('Manage it from Outbound.',{exact:false})).toBeVisible();
 });
});
