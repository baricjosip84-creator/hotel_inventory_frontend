import {loginAsDisposableRole} from '../../../support/roleSession';
import {test,expect,type Page,type Route} from '@playwright/test';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';

// Batch 21: OutboundPage.tsx and outboundRouteState.ts; original source endpoints
// /outbound/summary, /outbound/orders, /outbound/customers, /outbound/trace,
// and /outbound/returns. Synthetic GETs verify UI wiring, not backend behavior.
const summary={open_orders:2,confirmed_orders:1,picking_orders:0,packed_orders:1,partially_dispatched_orders:0,dispatched_orders_30d:3,units_waiting:4,units_dispatched_30d:7,pending_customer_returns:0};
const order=(n:number,status='draft')=>({id:`pw-order-${n}`,order_number:`PW-OUT-${String(n).padStart(3,'0')}`,customer_id:'pw-customer',customer_name:'Synthetic Hotel',status,version:2,created_at:'2026-09-01T12:00:00Z',requested_date:null,notes:'Synthetic operational order',items:[{id:`pw-item-${n}`,product_id:'pw-product',product_name:'Synthetic Product',product_sku:'PW-001',product_unit:'pcs',storage_location_id:'pw-location',storage_location_name:'Warehouse',quantity:2,dispatched_quantity:0,remaining_quantity:2,picked_quantity:0,open_picked_quantity:0,open_packed_quantity:0}]});
type OutboundOptions={orders?:ReturnType<typeof order>[],total?:number,summaryError?:boolean,ordersError?:boolean,summaryDelay?:Promise<void>,onGet?:(url:URL)=>void};
async function mockOutbound(page:Page,opts:OutboundOptions={}){
 await page.route('**/outbound/**',async(route:Route)=>{
  const url=new URL(route.request().url());if(route.request().method()!=='GET')throw Error('Outbound Phase 1 read-only suite intercepted unexpected write');
  opts.onGet?.(url);
  if(url.pathname.endsWith('/outbound/summary')){
   if(opts.summaryDelay)await opts.summaryDelay;
   return fulfillJson(route,opts.summaryError?{message:'Synthetic outbound summary unavailable'}:summary,opts.summaryError?503:200);
  }
  if(url.pathname.endsWith('/outbound/orders')){
   if(opts.ordersError)return fulfillJson(route,{message:'Synthetic order listing unavailable'},503);
   const pageNumber=Number(url.searchParams.get('page')||1);
   const rows=opts.orders ?? [];
   return fulfillJson(route,{items:rows.slice((pageNumber-1)*10,pageNumber*10),total:opts.total??rows.length,page:pageNumber,page_size:10});
  }
  if(url.pathname.endsWith('/outbound/customers')){
   return fulfillJson(route,url.searchParams.has('page')?{items:[],total:0,page:1,page_size:12}:[]);
  }
  if(url.pathname.endsWith('/outbound/trace'))return fulfillJson(route,{items:[],total:0,page:1,page_size:15});
  if(url.pathname.endsWith('/outbound/returns'))return fulfillJson(route,{items:[],total:0,page:1,page_size:10});
  if(url.pathname.endsWith('/outbound/returnable-dispatches'))return fulfillJson(route,{items:[],total:0,page:1,page_size:20});
  if(url.pathname.endsWith('/outbound/return-locations'))return fulfillJson(route,[]);
  if(url.pathname.endsWith('/outbound/order-options'))return fulfillJson(route,{products:[]});
  if(url.pathname.endsWith('/activity'))return fulfillJson(route,{events:[],audit:{items:[],total:0,page:1,page_size:25}});
  if(url.pathname.endsWith('/documents')||url.pathname.endsWith('/communications'))return fulfillJson(route,[]);
  return fulfillJson(route,{message:'Unsupported synthetic GET fixture'},404);
 });
}
async function openOutbound(page:Page,options:OutboundOptions={},path='/outbound'){
 await loginAsTenant(page);await mockOutbound(page,options);await page.goto(path);
 await expect(page.getByRole('heading',{name:'Outbound workspace'})).toBeVisible();
}
const orderCards=(page:Page)=>page.locator('.outbound-order-card');
const orderSearch=(page:Page)=>page.getByLabel('Search orders');

// No POST calls are performed here. Outbound mutations will be inventoried in
// later batches with isolated mutation fixtures and explicit safeguards.
test.describe('Outbound — status, navigation and order-list basics (Batch 21)',()=>{
 test('TOUT-001 Outbound displays the real fulfillment workflow and status labels',async({page})=>{
  await openOutbound(page);
  await expect(page.getByText('Confirming an order reserves stock.',{exact:false})).toBeVisible();
  for(const label of ['Open orders','Ready to pick','Partial shipments','Completed 30 days'])await expect(page.getByText(label,{exact:true})).toBeVisible();
 });
 test('TOUT-002 Delayed summary GET renders its loading message before data',async({page})=>{
  await loginAsTenant(page);let release!:()=>void;
  const delayed=new Promise<void>(resolve=>{release=resolve;});
  await mockOutbound(page,{summaryDelay:delayed});await page.goto('/outbound');
  await expect(page.getByText('Loading outbound status…')).toBeVisible();
  release();await expect(page.getByText('Open orders',{exact:true})).toBeVisible();
 });
 test('TOUT-003 Failed summary GET reports an inline status error',async({page})=>{
  await openOutbound(page,{summaryError:true});
  await expect(page.getByText('Synthetic outbound summary unavailable')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Customer orders'})).toBeVisible();
 });
 test('TOUT-004 Refresh status re-requests summary and orders',async({page})=>{
  let summaries=0,orders=0;
  await openOutbound(page,{onGet:url=>{if(url.pathname.endsWith('/summary'))summaries++;if(url.pathname.endsWith('/orders'))orders++;}});
  await expect(page.getByText('Open orders',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Refresh status'}).click();
  await expect.poll(()=>summaries).toBeGreaterThanOrEqual(2);
  await expect.poll(()=>orders).toBeGreaterThanOrEqual(2);
 });
 test('TOUT-005 Outbound workflow accordion reveals draft-to-dispatch steps',async({page})=>{
  await openOutbound(page);const steps=page.locator('.outbound-workflow-grid');
  await expect(steps).not.toBeVisible();
  await page.locator('.outbound-workflow-summary').click();
  for(const step of ['1. Draft','2. Confirm','3. Pick','4. Pack','5. Dispatch'])await expect(steps.getByText(step)).toBeVisible();
 });
 test('TOUT-006 Default route has Orders selected and no tab query parameter',async({page})=>{
  await openOutbound(page);await expect(page.getByRole('tab',{name:/Orders/})).toHaveAttribute('aria-selected','true');
  expect(new URL(page.url()).searchParams.has('tab')).toBe(false);
 });
 test('TOUT-007 Dispatch trace tab maintains unrelated URL search keys',async({page})=>{
  await openOutbound(page,{},'/outbound?origin=synthetic-audit');
  await page.getByRole('tab',{name:'Dispatch trace'}).click();
  await expect(page.getByRole('tab',{name:'Dispatch trace'})).toHaveAttribute('aria-selected','true');
  expect(new URL(page.url()).searchParams.get('tab')).toBe('trace');
  expect(new URL(page.url()).searchParams.get('origin')).toBe('synthetic-audit');
 });
 test('TOUT-008 Unknown tab query falls back to Orders view',async({page})=>{
  await openOutbound(page,{},'/outbound?tab=not-a-tab');
  await expect(page.getByRole('tab',{name:/Orders/})).toHaveAttribute('aria-selected','true');
  await expect(page.getByRole('heading',{name:'Customer orders'})).toBeVisible();
 });
 test('TOUT-009 Trace GET remains lazy until Dispatch trace tab is selected',async({page})=>{
  let requests=0;await openOutbound(page,{onGet:url=>{if(url.pathname.endsWith('/outbound/trace'))requests++;}});
  expect(requests).toBe(0);
  await page.getByRole('tab',{name:'Dispatch trace'}).click();
  await expect.poll(()=>requests).toBe(1);
  await expect(page.getByText('No dispatched stock yet')).toBeVisible();
 });
 test('TOUT-010 Selecting a status filter passes exact status to orders GET',async({page})=>{
  const queries:string[]=[];await openOutbound(page,{onGet:url=>{if(url.pathname.endsWith('/outbound/orders'))queries.push(url.searchParams.get('status')||'');}});
  await page.getByLabel('Status').selectOption('packed');
  await expect.poll(()=>queries.includes('packed')).toBe(true);
  await expect(page.getByText('No orders match these filters')).toBeVisible();
 });
 test('TOUT-011 Search orders sends trimmed text to GET query parameter',async({page})=>{
  const queries:string[]=[];await openOutbound(page,{onGet:url=>{if(url.pathname.endsWith('/outbound/orders'))queries.push(url.searchParams.get('search')||'');}});
  await orderSearch(page).fill('   PW-OUT-001   ');
  await expect.poll(()=>queries.includes('PW-OUT-001')).toBe(true);
 });
 test('TOUT-012 Unmatched search shows filter-specific empty state',async({page})=>{
  await openOutbound(page);await orderSearch(page).fill('not-in-synthetic-rows');
  await expect(page.getByText('No orders match these filters')).toBeVisible();
  await expect(orderCards(page)).toHaveCount(0);
 });
 test('TOUT-013 Empty Orders view offers action to begin draft when create allowed',async({page})=>{
  await openOutbound(page);await expect(page.getByText('No customer orders yet')).toBeVisible();
  await page.getByRole('button',{name:'Create first order'}).click();
  await expect(page.getByRole('heading',{name:'Create customer order'})).toBeVisible();
 });
 test('TOUT-014 Populated orders show customer, order number and item identity',async({page})=>{
  await openOutbound(page,{orders:[order(1,'confirmed')]});
  await expect(orderCards(page)).toHaveCount(1);
  await expect(orderCards(page).first()).toContainText('PW-OUT-001');
  await expect(orderCards(page).first()).toContainText('Synthetic Hotel');
  await expect(orderCards(page).first()).toContainText('Synthetic Product');
 });
 test('TOUT-015 Ten-per-page order pagination updates page and visible order',async({page})=>{
  await openOutbound(page,{orders:Array.from({length:11},(_,i)=>order(i+1)),total:11});
  await expect(orderCards(page)).toHaveCount(10);
  await page.locator('.outbound-pagination').getByRole('button',{name:'Next'}).click();
  await expect(orderCards(page)).toHaveCount(1);
  await expect(orderCards(page).first()).toContainText('PW-OUT-011');
  await expect(page.locator('.outbound-pagination')).toContainText('Page 2 of 2');
 });
 test('TOUT-016 Refresh orders re-requests only the order listing from the workbench',async({page})=>{
  let requests=0;await openOutbound(page,{onGet:url=>{if(url.pathname.endsWith('/outbound/orders'))requests++;}});
  await page.getByRole('button',{name:'Refresh orders'}).click();
  await expect.poll(()=>requests).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('No customer orders yet')).toBeVisible();
 });
 test('TOUT-017 Opening order details lazy-loads activity, docs and communications',async({page})=>{
  const requested:string[]=[];
  await openOutbound(page,{orders:[order(1,'confirmed')],onGet:url=>requested.push(url.pathname)});
  expect(requested.some(path=>path.endsWith('/activity'))).toBe(false);
  await orderCards(page).getByRole('button',{name:'Open Details'}).click();
  await expect(page.getByRole('heading',{name:'Customer and delivery'})).toBeVisible();
  await expect.poll(()=>requested.filter(path=>path.endsWith('/activity')).length).toBe(1);
  await expect.poll(()=>requested.filter(path=>path.endsWith('/communications')).length).toBe(1);
 });
 test('TOUT-018 Cancelled order exposes its cancellation reason on its own card',async({page})=>{
  await openOutbound(page,{orders:[{...order(1,'cancelled'),cancellation_reason:'Synthetic duplicate request'}]});
  await expect(orderCards(page).first()).toContainText('Cancellation:');
  await expect(orderCards(page).first()).toContainText('Synthetic duplicate request');
 });
 test('TOUT-019 Customer tab sends include-archived change in registry query',async({page})=>{
  const archived:string[]=[];await openOutbound(page,{onGet:url=>{if(url.pathname.endsWith('/outbound/customers')&&url.searchParams.has('page'))archived.push(url.searchParams.get('include_archived')||'');}});
  await page.getByRole('tab',{name:'Customers'}).click();
  await expect(page.getByText('No customers yet')).toBeVisible();
  await page.getByLabel('Include archived').check();
  await expect.poll(()=>archived.includes('true')).toBe(true);
 });
 test('TOUT-020 Customer returns tab shows zero-return state and filter controls',async({page})=>{
  await openOutbound(page);await page.getByRole('tab',{name:/Customer returns/}).click();
  await expect(page.getByRole('heading',{name:'Customer returns'})).toBeVisible();
  await expect(page.getByText('No customer returns yet')).toBeVisible();
  await expect(page.getByLabel('Search returns')).toBeVisible();
 });
});

// Batch 22: source-traced customer/order/return actions. All writes below are
// intercepted in the disposable browser context; NEVER sent to a live backend.
// These assertions verify UI and wire contracts, NOT server stock or email effects.

const customerFixture={id:'pw-customer',name:'Synthetic Hotel',email:'dispatch@example.invalid',phone:'000',address:'Synthetic warehouse',notes:'Fixture only',active:true,version:3};
const optionFixture={products:[{id:'pw-product',name:'Synthetic Product',sku:'PW-001',unit:'pcs',total_available_quantity:8,uom_conversions:[],locations:[{id:'pw-location',name:'Warehouse',available_quantity:8}]}]};
const dispatchFixture={allocation_id:'pw-allocation',outbound_order_id:'pw-order-1',outbound_order_item_id:'pw-item-1',order_number:'PW-OUT-001',order_status:'dispatched',customer_name:'Synthetic Hotel',storage_location_id:'pw-location',storage_location_name:'Warehouse',product_name:'Synthetic Product',product_sku:'PW-001',product_unit:'pcs',lot_number:'LOT-PW',batch_number:'BATCH-PW',expiry_date:null,dispatched_quantity:3,claimed_return_quantity:0,returned_quantity:0,returnable_quantity:2,serial_numbers:[]};
const returnFixture={id:'pw-return-1',return_number:'PW-RETURN-001',order_number:'PW-OUT-001',customer_name:'Synthetic Hotel',status:'draft',reason:'Synthetic return',version:7,items:[{id:'pw-rline',quantity:1,condition:'hold',storage_location_id:'pw-location',storage_location_name:'Warehouse',product_name:'Synthetic Product',product_sku:'PW-001',product_unit:'pcs'}]};
type WriteRecord={path:string;method:string;body:Record<string,any>;version:string|null};
type OutboundAdvanced={orders?:ReturnType<typeof order>[]; customers?:typeof customerFixture[]; returns?:typeof returnFixture[]; allocations?:typeof dispatchFixture[]; writeStatus?:number; writeMessage?:string; pickItems?:any[]; onRead?:(url:URL)=>void; onWrite?:(write:WriteRecord)=>void; documents?:any[]; activity?:any};
async function openAdvancedOutbound(page:Page,opts:OutboundAdvanced={},path='/outbound'){
 const writes:WriteRecord[]=[];
 await loginAsTenant(page);
 await mockOutbound(page,{orders:opts.orders||[]});
 await page.route('**/outbound/**',async(route:Route)=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname,m=req.method();
  if(m==='GET'){
   opts.onRead?.(url);
   if(p.endsWith('/outbound/customers'))return fulfillJson(route,url.searchParams.has('page')?{items:opts.customers??[],total:(opts.customers??[]).length,page:1,page_size:12}:opts.customers??[]);
   if(p.endsWith('/outbound/order-options'))return fulfillJson(route,optionFixture);
   if(p.endsWith('/outbound/return-locations'))return fulfillJson(route,[{id:'pw-location',name:'Warehouse',is_pickable:true},{id:'pw-hold',name:'Hold Area',is_pickable:false}]);
   if(p.endsWith('/outbound/returnable-dispatches'))return fulfillJson(route,{items:opts.allocations??[],total:(opts.allocations??[]).length,page:1,page_size:20});
   if(p.endsWith('/outbound/returns'))return fulfillJson(route,{items:opts.returns??[],total:(opts.returns??[]).length,page:1,page_size:10});
   if(p.endsWith('/pick-options'))return fulfillJson(route,{order:{id:'pw-order-1',order_number:'PW-OUT-001',status:'picking',version:2},items:opts.pickItems??[]});
   if(p.endsWith('/activity'))return fulfillJson(route,opts.activity??{events:[],audit:{items:[],total:0,page:1,page_size:25}});
   if(p.endsWith('/documents'))return fulfillJson(route,opts.documents??[]);
   if(p.endsWith('/communications'))return fulfillJson(route,[]);
   return route.fallback();
  }
  if(m==='POST'||m==='PUT'){
   const raw=req.postData();let body:Record<string,any>={};try{body=raw?JSON.parse(raw):{};}catch{/* binary uploads handled separately */}
   const write={path:p.includes('/outbound/')?p.slice(p.indexOf('/outbound/')):p,method:m,body,version:req.headers()['if-match-version']??null};writes.push(write);opts.onWrite?.(write);
   if(p.endsWith('/returns/pw-return-1/documents/preview'))return fulfillJson(route,{title:'Return Receipt',document_type:'return_receipt',document_number:'RET-DOC-PW',customer:{name:'Synthetic Hotel'},items:[{product_name:'Synthetic Product',quantity:1,unit:'pcs'}]});
   if(p.endsWith('/documents/preview'))return fulfillJson(route,{title:'Order Confirmation',document_type:'order_confirmation',document_number:'DOC-PW-1',customer:{name:'Synthetic Hotel'},items:[{product_name:'Synthetic Product',quantity:2,unit:'pcs'}]});
   if(p.endsWith('/email-preview'))return fulfillJson(route,{recipient_email:'dispatch@example.invalid',subject:'Synthetic document',message:'Synthetic note',document:{document_type:'order_confirmation',title:'Order Confirmation',document_number:'DOC-PW-1',filename:'synthetic.pdf'}});
   return fulfillJson(route,opts.writeStatus&&opts.writeStatus>=400?{message:opts.writeMessage||'Synthetic write blocked'}:{message:'Synthetic mutation recorded'},opts.writeStatus??200);
  }
  throw Error(`Unintercepted outbound action ${m} ${p}`);
 });
 await page.route('**/products',async(route)=>fulfillJson(route,[{id:'pw-product',name:'Synthetic Product',unit:'pcs'}]));
 await page.route('**/storage-locations',async(route)=>fulfillJson(route,[{id:'pw-location',name:'Warehouse'}]));
 await page.goto(path);
 await expect(page.getByRole('heading',{name:'Outbound workspace'})).toBeVisible();
 return writes;
}
async function openCustomerTab(page:Page,opts:OutboundAdvanced={}){const writes=await openAdvancedOutbound(page,opts);await page.getByRole('tab',{name:'Customers'}).click();return writes;}
async function openReturnsTab(page:Page,opts:OutboundAdvanced={}){const writes=await openAdvancedOutbound(page,opts);await page.getByRole('tab',{name:/Customer returns/}).click();return writes;}
async function openDraftOrderForm(page:Page){await page.getByRole('button',{name:'New customer order'}).click();await expect(page.getByRole('heading',{name:'Create customer order'})).toBeVisible();}
async function fillValidOrder(page:Page){await page.getByLabel('Customer',{exact:true}).selectOption('pw-customer');const line=page.locator('.outbound-order-line-editor').first();await line.getByLabel('Product').selectOption('pw-product');await line.getByLabel('Source location').selectOption('pw-location');await line.getByLabel('Quantity').fill('2');}
async function selectReturnLine(page:Page){const line=page.locator('.outbound-return-line-editor').first();await line.getByLabel('Dispatched stock').selectOption('pw-allocation');return line;}
const actionGroup=(page:Page)=>page.getByRole('group',{name:'Actions · PW-OUT-001'});

 test.describe('Outbound — customers and governed fulfillment (Batch 22)',()=>{
 test('TOUT-021 New customer requires nonblank name before Add Customer enables',async({page})=>{
  await openCustomerTab(page);await page.getByRole('button',{name:'Add customer'}).click();const add=page.getByRole('button',{name:'Add Customer'});
  await expect(add).toBeDisabled();await page.getByLabel('Customer name').fill('   ');await expect(add).toBeDisabled();
  await page.getByLabel('Customer name').fill('PW New Customer');await expect(add).toBeEnabled();
 });
 test('TOUT-022 Add Customer posts trimmed name and hides editor on success',async({page})=>{
  const writes=await openCustomerTab(page);await page.getByRole('button',{name:'Add customer'}).click();await page.getByLabel('Customer name').fill('  PW New Customer  ');
  await page.getByRole('button',{name:'Add Customer'}).click();await expect.poll(()=>writes.some(w=>w.path.endsWith('/outbound/customers'))).toBe(true);
  expect(writes.find(w=>w.path.endsWith('/outbound/customers'))?.body.name).toBe('PW New Customer');
  await expect(page.getByRole('heading',{name:'New customer'})).not.toBeVisible();await expect(page.getByText('Customer added.')).toBeVisible();
 });
 test('TOUT-023 Archive customer only posts after confirmation and carries version',async({page})=>{
  const writes=await openCustomerTab(page,{customers:[customerFixture]});await expect(page.locator('.outbound-customer-card')).toHaveCount(1);
  page.once('dialog',d=>d.dismiss());await page.locator('.outbound-customer-card').getByRole('button',{name:'Archive'}).click();expect(writes).toHaveLength(0);
  page.once('dialog',d=>d.accept());await page.locator('.outbound-customer-card').getByRole('button',{name:'Archive'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].path).toContain('/pw-customer/archive');expect(writes[0].version).toBe('3');
 });
 test('TOUT-024 Customer search trims text and uses 12 records per page',async({page})=>{
  const seen:URL[]=[];await openCustomerTab(page,{onRead:url=>{if(url.pathname.endsWith('/outbound/customers')&&url.searchParams.has('page'))seen.push(url);}});
  await page.getByLabel('Search customers').fill('  Synthetic  ');await expect.poll(()=>seen.some(u=>u.searchParams.get('search')==='Synthetic'&&u.searchParams.get('page_size')==='12')).toBe(true);
 });
 test('TOUT-025 Order creation without stock.read shows dependency warning, not editable controls',async({page})=>{
  // PW_OUT_NO_STOCK must have outbound_orders.read/create, customers.read,
  // products.read and storage_locations.read, but NOT stock.read.
  await loginAsDisposableRole(page,'PW_OUT_NO_STOCK');await mockOutbound(page);await page.goto('/outbound');
  await page.getByRole('button',{name:'New customer order'}).click();
  await expect(page.getByText('Creating an order also requires read access to customers, products, storage locations, and stock',{exact:false})).toBeVisible();
  await expect(page.locator('.outbound-order-line-editor')).toHaveCount(0);
 });
 test('TOUT-026 Product choice scopes location choices to stock-available locations',async({page})=>{
  await openAdvancedOutbound(page,{customers:[customerFixture]});await openDraftOrderForm(page);const l=page.locator('.outbound-order-line-editor').first();
  await expect(l.getByLabel('Source location')).toBeDisabled();await l.getByLabel('Product').selectOption('pw-product');
  await expect(l.getByLabel('Source location')).toBeEnabled();await expect(l.getByLabel('Source location').locator('option[value="pw-location"]')).toHaveCount(1);
  await expect(l.getByLabel('Source location').locator('option[value="pw-hold"]')).toHaveCount(0);
 });
 test('TOUT-027 Add line preserves at least one order line',async({page})=>{
  await openAdvancedOutbound(page,{customers:[customerFixture]});await openDraftOrderForm(page);
  const editor=page.locator('.outbound-order-line-editor');await expect(editor).toHaveCount(1);await expect(editor.first().getByRole('button',{name:'Remove'})).toBeDisabled();
  await page.getByRole('button',{name:'Add line'}).click();await expect(editor).toHaveCount(2);
  await editor.last().getByRole('button',{name:'Remove'}).click();await expect(editor).toHaveCount(1);await expect(editor.first().getByRole('button',{name:'Remove'})).toBeDisabled();
 });
 test('TOUT-028 Draft creation posts selected customer, source and normalized quantity',async({page})=>{
  const writes=await openAdvancedOutbound(page,{customers:[customerFixture]});await openDraftOrderForm(page);await fillValidOrder(page);
  await expect(page.getByRole('button',{name:'Create Order'})).toBeEnabled();await page.getByRole('button',{name:'Create Order'}).click();
  await expect.poll(()=>writes.some(w=>w.path.endsWith('/outbound/orders')&&w.method==='POST')).toBe(true);
  const payload=writes.find(w=>w.path.endsWith('/outbound/orders'))?.body;expect(payload.customer_id).toBe('pw-customer');expect(payload.items[0]).toMatchObject({product_id:'pw-product',storage_location_id:'pw-location',quantity:2});
 });
 test('TOUT-029 Cancel Edit restores read-only draft card without PUT',async({page})=>{
  const writes=await openAdvancedOutbound(page,{orders:[order(1)],customers:[customerFixture]});await actionGroup(page).getByRole('button',{name:'Edit Draft'}).click();
  await expect(page.getByRole('heading',{name:'Edit draft PW-OUT-001'})).toBeVisible();await page.getByLabel('Delivery address').fill('Unsaved PW edit');
  await page.getByRole('button',{name:'Cancel Edit'}).click();await expect(page.getByRole('heading',{name:'Edit draft PW-OUT-001'})).not.toBeVisible();expect(writes).toHaveLength(0);
 });
 test('TOUT-030 Confirm sends If-Match-Version and shows local reservation outcome only',async({page})=>{
  const writes=await openAdvancedOutbound(page,{orders:[order(1)]});await actionGroup(page).getByRole('button',{name:'Confirm & Reserve Stock'}).click();
  await expect.poll(()=>writes.some(w=>w.path.endsWith('/confirm'))).toBe(true);expect(writes[0].version).toBe('2');
  await expect(page.getByText('PW-OUT-001 confirmed and stock reserved.')).toBeVisible();
 });
 test('TOUT-031 Picking-state order hides pick workbench when stock.read is absent',async({page})=>{
  // PW_OUT_NO_STOCK has outbound_orders.read/update but lacks stock.read.
  await loginAsDisposableRole(page,'PW_OUT_NO_STOCK');await mockOutbound(page,{orders:[order(1,'picking')]});
  await page.goto('/outbound');await expect(actionGroup(page).getByRole('button',{name:'Open Picking'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Picking workbench'})).toHaveCount(0);
 });
 test('TOUT-032 Lot-tracked pick cannot be recorded without selecting physical lot',async({page})=>{
  const picked={...order(1,'picking').items[0],requires_lot_tracking:true,serial_tracking_enabled:false,requires_expiry_date:false,lots:[{id:'lot-pw',lot_number:'LOT-PW',available_to_pick:2}]};
  const writes=await openAdvancedOutbound(page,{orders:[order(1,'picking')],pickItems:[picked]});await actionGroup(page).getByRole('button',{name:'Open Picking'}).click();
  const line=page.locator('.outbound-picking-line');await expect(line.getByRole('button',{name:'Record Pick'})).toBeDisabled();
  await line.getByLabel('Lot / batch physically picked').selectOption('lot-pw');await line.getByRole('button',{name:'Record Pick'}).click();
  await expect.poll(()=>writes.some(w=>w.path.endsWith('/pick'))).toBe(true);expect(writes[0].body.items[0].inventory_lot_id).toBe('lot-pw');
 });
 test('TOUT-033 Serialized pick requires exact count of serial checkboxes',async({page})=>{
  const picked={...order(1,'picking').items[0],requires_lot_tracking:false,serial_tracking_enabled:true,requires_expiry_date:false,lots:[],available_serials:[{id:'ser1',serial_number:'PW-SN-1'},{id:'ser2',serial_number:'PW-SN-2'}]};
  const writes=await openAdvancedOutbound(page,{orders:[order(1,'picking')],pickItems:[picked]});await actionGroup(page).getByRole('button',{name:'Open Picking'}).click();
  const line=page.locator('.outbound-picking-line');await line.getByLabel('Picked quantity').fill('2');await expect(line.getByRole('button',{name:'Record Pick'})).toBeDisabled();
  await line.getByLabel(/PW-SN-1/).check();await line.getByLabel(/PW-SN-2/).check();await line.getByRole('button',{name:'Record Pick'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body.items[0].serial_numbers).toEqual(['PW-SN-1','PW-SN-2']);
 });
 test('TOUT-034 Packing appears only when picked quantity is waiting',async({page})=>{
  await openAdvancedOutbound(page,{orders:[order(1,'picking')]});await expect(actionGroup(page).getByRole('button',{name:'Mark Picked Stock Packed'})).toHaveCount(0);
  await openAdvancedOutbound(page,{orders:[{...order(1,'picking'),items:[{...order(1).items[0],open_picked_quantity:1}]}]});
  await expect(actionGroup(page).getByRole('button',{name:'Mark Picked Stock Packed'})).toBeVisible();
 });
 test('TOUT-035 Dispatch prompts and posts only after explicit approval',async({page})=>{
  const packed={...order(1,'packed'),items:[{...order(1).items[0],open_packed_quantity:1}]};const writes=await openAdvancedOutbound(page,{orders:[packed]});
  page.once('dialog',d=>d.dismiss());await actionGroup(page).getByRole('button',{name:'Dispatch Packed Stock'}).click();expect(writes).toHaveLength(0);
  page.once('dialog',d=>d.accept());await actionGroup(page).getByRole('button',{name:'Dispatch Packed Stock'}).click();
  await expect.poll(()=>writes.some(w=>w.path.endsWith('/dispatch'))).toBe(true);expect(writes[0].version).toBe('2');
 });
 test('TOUT-036 Partial dispatch displays remaining reserved order quantity',async({page})=>{
  const partial={...order(1,'partially_dispatched'),items:[{...order(1).items[0],dispatched_quantity:1,remaining_quantity:1,open_packed_quantity:0}]};
  await openAdvancedOutbound(page,{orders:[partial]});await expect(orderCards(page).first()).toContainText('Remaining');
  await expect(orderCards(page).first()).toContainText('Partially dispatched');await expect(actionGroup(page).getByRole('button',{name:'Pick Remaining'})).toBeVisible();
 });
 test('TOUT-037 Cancel order requires three-character reason and uses version header',async({page})=>{
  const writes=await openAdvancedOutbound(page,{orders:[order(1)]});await actionGroup(page).getByRole('button',{name:'Cancel'}).click();
  const reason=page.getByLabel('Cancellation reason');const confirm=page.getByRole('button',{name:'Confirm',exact:true});await reason.fill('x');await expect(confirm).toBeDisabled();
  await reason.fill('  damaged  ');await expect(confirm).toBeEnabled();await confirm.click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body.reason).toBe('damaged');expect(writes[0].version).toBe('2');
 });
 test('TOUT-038 Preview document sends preview request but no PDF creation',async({page})=>{
  const writes=await openAdvancedOutbound(page,{orders:[order(1,'confirmed')]});await actionGroup(page).getByRole('button',{name:'Open Details'}).click();
  await page.locator('.outbound-document-action').filter({hasText:'Order Confirmation'}).getByRole('button',{name:'Preview'}).click();
  await expect(page.locator('.outbound-document-preview')).toContainText('Synthetic Product');
  expect(writes.map(w=>w.path)).toEqual(['/outbound/orders/pw-order-1/documents/preview']);
 });
 test('TOUT-039 Stored PDF creation posts and leaves its source order visible',async({page})=>{
  const writes=await openAdvancedOutbound(page,{orders:[order(1,'confirmed')]});await actionGroup(page).getByRole('button',{name:'Open Details'}).click();
  await page.locator('.outbound-document-action').filter({hasText:'Order Confirmation'}).getByRole('button',{name:'Create PDF'}).click();
  await expect.poll(()=>writes.some(w=>w.path==='/outbound/orders/pw-order-1/documents')).toBe(true);
  await expect(page.getByText('Document created and stored with this order.')).toBeVisible();
 });
 test('TOUT-040 Email preview enforces recipient and subject before confirmed send',async({page})=>{
  const docs=[{id:'pw-document',document_type:'order_confirmation',document_number:'DOC-PW-1',filename:'synthetic.pdf',created_at:'2026-09-01T12:00:00Z',sent_count:0}];
  const writes=await openAdvancedOutbound(page,{orders:[order(1,'confirmed')],documents:docs});await actionGroup(page).getByRole('button',{name:'Open Details'}).click();
  await page.getByRole('button',{name:'Preview & Send Email'}).click();await expect(page.getByText('The stored PDF will be attached to this email:',{exact:false})).toBeVisible();
  await page.getByLabel('Recipient').fill('');await expect(page.getByRole('button',{name:'Send Email'})).toBeDisabled();
  await page.getByLabel('Recipient').fill('dispatch@example.invalid');await page.getByLabel('Email subject').fill('');await expect(page.getByRole('button',{name:'Send Email'})).toBeDisabled();
  await page.getByLabel('Email subject').fill('Synthetic document');await page.getByRole('button',{name:'Send Email'}).click();
  await expect.poll(()=>writes.some(w=>w.path.endsWith('/send-email'))).toBe(true);expect(writes.find(w=>w.path.endsWith('/send-email'))?.body.confirmed).toBe(true);
 });
 test('TOUT-041 Attachment access is removed when role has no attachment permissions',async({page})=>{
  // PW_OUT_NO_ATTACHMENTS retains outbound_orders.read and excludes
  // attachments.read and attachments.write.
  await loginAsDisposableRole(page,'PW_OUT_NO_ATTACHMENTS');await mockOutbound(page,{orders:[order(1,'confirmed')]});
  await page.goto('/outbound');await actionGroup(page).getByRole('button',{name:'Open Details'}).click();
  await expect(page.getByText('Your role does not allow viewing attachments.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Upload attachment'})).toHaveCount(0);
 });
 test('TOUT-042 Order audit pane requests page two after expanding audit history',async({page})=>{
  const seen:string[]=[];const audit={events:[{key:'created',at:'2026-09-01T12:00:00Z',user_name:'Synthetic Actor'}],audit:{items:[{id:'pw-audit',action:'outbound_order.confirmed',created_at:'2026-09-01T12:00:00Z'}],total:26,page:1,page_size:25}};
  await openAdvancedOutbound(page,{orders:[order(1,'confirmed')],activity:audit,onRead:u=>{if(u.pathname.endsWith('/activity'))seen.push(u.searchParams.get('audit_page')||'');}});
  await actionGroup(page).getByRole('button',{name:'Open Details'}).click();await page.locator('.outbound-audit-details summary').click();
  await expect(page.locator('.outbound-audit-details')).toContainText('Order confirmed');await page.locator('.outbound-audit-details').getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>seen.includes('2')).toBe(true);
 });
 test('TOUT-043 Return editor offers dispatched allocation, not arbitrary product line',async({page})=>{
  await openReturnsTab(page,{allocations:[dispatchFixture]});const line=page.locator('.outbound-return-line-editor').first();
  await expect(line.getByLabel('Dispatched stock').locator('option[value="pw-allocation"]')).toHaveCount(1);
  await expect(line.getByLabel('Dispatched stock').locator('option[value="pw-product"]')).toHaveCount(0);
 });
 test('TOUT-044 Return quantity above remaining returnable amount disables create',async({page})=>{
  await openReturnsTab(page,{allocations:[dispatchFixture]});const line=await selectReturnLine(page);await page.getByLabel('Return reason').fill('Damaged packaging');
  await line.getByLabel('Quantity').fill('3');await expect(page.getByText(/exceeds the quantity still returnable/)).toBeVisible();
  await expect(page.getByRole('button',{name:'Create Customer Return'})).toBeDisabled();
 });
 test('TOUT-045 Customer return posts allocation, location, condition and trimmed reason',async({page})=>{
  const writes=await openReturnsTab(page,{allocations:[dispatchFixture]});const line=await selectReturnLine(page);
  await page.getByLabel('Return reason').fill('  Damaged packaging  ');await line.getByLabel('Quantity').fill('2');await line.getByLabel('Condition').selectOption('hold');
  await page.getByRole('button',{name:'Create Customer Return'}).click();await expect.poll(()=>writes.some(w=>w.path==='/outbound/returns')).toBe(true);
  const body=writes.find(w=>w.path==='/outbound/returns')!.body;expect(body.reason).toBe('Damaged packaging');expect(body.items[0]).toMatchObject({outbound_order_lot_allocation_id:'pw-allocation',storage_location_id:'pw-location',quantity:2,condition:'hold'});
 });
 test('TOUT-046 Receive return prompts before sending version-guarded mutation',async({page})=>{
  const writes=await openReturnsTab(page,{returns:[returnFixture]});page.once('dialog',d=>d.dismiss());
  await page.getByRole('button',{name:'Receive Return'}).click();expect(writes).toHaveLength(0);
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Receive Return'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0]).toMatchObject({path:'/outbound/returns/pw-return-1/receive',version:'7'});
 });
 test('TOUT-047 Cancel return requires a reason of three trimmed characters',async({page})=>{
  const writes=await openReturnsTab(page,{returns:[returnFixture]});await page.getByRole('button',{name:'Cancel Return'}).click();
  const editor=page.locator('.outbound-inline-action-form');await editor.getByLabel('Return cancellation reason').fill('x');await expect(editor.getByRole('button',{name:'Confirm'})).toBeDisabled();
  await editor.getByLabel('Return cancellation reason').fill('  damaged  ');await editor.getByRole('button',{name:'Confirm'}).click();
  await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body.reason).toBe('damaged');expect(writes[0].version).toBe('7');
 });
 test('TOUT-048 Received return exposes receipt preview and audit evidence',async({page})=>{
  const received={...returnFixture,status:'received'};const writes=await openReturnsTab(page,{returns:[received],activity:{events:[],audit:{items:[],total:0,page:1,page_size:25}}});
  await page.locator('.outbound-return-card').getByRole('button',{name:'Open Details'}).click();
  await expect(page.getByRole('button',{name:'Preview Return Receipt'})).toBeVisible();await page.getByRole('button',{name:'Preview Return Receipt'}).click();
  await expect.poll(()=>writes.some(w=>w.path.endsWith('/documents/preview'))).toBe(true);
 });
 test('TOUT-049 Dispatch trace query preserves lot identity and uses 15-per-page size',async({page})=>{
  const queried:URL[]=[];await openAdvancedOutbound(page,{onRead:u=>{if(u.pathname.endsWith('/outbound/trace'))queried.push(u);}});
  await page.getByRole('tab',{name:'Dispatch trace'}).click();await page.getByLabel('Search dispatch trace').fill('  LOT-PW  ');
  await expect.poll(()=>queried.some(u=>u.searchParams.get('page_size')==='15'&&u.searchParams.get('search')==='LOT-PW')).toBe(true);
 });
 test('TOUT-050 Customer and returns navigation remains separately permission-gated',async({page})=>{
  await loginAsDisposableRole(page,'PW_OUT_NO_CUSTOMER_RETURN');await mockOutbound(page);
  await page.goto('/outbound');await expect(page.getByRole('tab',{name:'Dispatch trace'})).toBeVisible();
  await expect(page.getByRole('tab',{name:'Customers'})).toHaveCount(0);await expect(page.getByRole('tab',{name:/Customer returns/})).toHaveCount(0);
 });
 });
