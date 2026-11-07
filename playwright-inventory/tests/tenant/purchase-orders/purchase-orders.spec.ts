import {test,expect,type Page,type Route} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';
// Batch 27: PurchaseOrdersPage.tsx, router /purchase-orders, frontend subscription gating,
// GET /purchase-orders with filters, GET /suppliers /products, GET /purchase-orders/:id,
// and backend/routes/purchaseOrders.js. All GETs are intercepted in a disposable tenant.
// Tests do not claim server-side persistence, purchase-order approval or inventory postings.
type PoSeen={method:string;path:string;url:string};
type PoSetup={rows?:any[];listError?:boolean;entitled?:boolean;detail?:any};
const poRow={id:'pw-po-1',supplier_id:'pw-supplier-1',supplier_name:'Synthetic Supply Ltd',po_number:'PW-PO-0001',currency:'EUR',status:'draft',created_at:'2026-10-28T12:00:00Z',version:3,
 expected_delivery_date:'2026-12-01',notes:'Training only',item_count:1,total_quantity:5,total_received_quantity:0,
 estimated_total_cost:75,remaining_estimated_cost:75,receiving_status:'not_started',variance_status:'pending_receipt',delivery_status:'upcoming',next_action_status:'submit_for_approval',linked_shipment_count:0,open_linked_shipment_count:0};
const poDetail={...poRow,items:[{id:'pw-po-item-1',product_id:'pw-product',product_name:'Synthetic Product',product_unit:'pcs',quantity:5,entered_quantity:5,uom_code:'pcs',unit_cost:15,estimated_line_total:75}],linked_shipments:[]};
const poSupplier={id:'pw-supplier-1',name:'Synthetic Supply Ltd',email:'supplier@example.invalid'};
const poProduct={id:'pw-product',name:'Synthetic Product',unit:'pcs',supplier_id:'pw-supplier-1'};
async function openPurchaseOrders(page:Page,setup:PoSetup={},url='/purchase-orders'){
 await loginAsTenant(page);const seen:PoSeen[]=[];
 await page.route('**/tenants/subscription-access**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  return fulfillJson(route,{tenant:{id:'pw-tenant',name:'Disposable test tenant',status:'active',billing_status:'active',plan_code:'test',trial_ends_at:null,current_period_ends_at:null},write_access:{allowed:true,blocker:null},plan_usage:[],plan_limit_blocked_resources:[],feature_entitlements:[{feature:'purchase_orders',allowed:setup.entitled!==false}]});
 });
 await page.route('**/inventory-capabilities/products/*/uom**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  if(route.request().method()==='GET')return fulfillJson(route,{base_uom:'pcs',conversions:[]});
  throw Error('Unexpected UOM mutation in read-only fixture');
 });
 await page.route('**/purchase-orders**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const uri=new URL(req.url()),path=uri.pathname,method=req.method();seen.push({method,path,url:uri.toString()});
  if(method!=='GET')throw Error('Unexpected Purchase Order mutation in read-only Batch 27 fixture');
  if(path.endsWith('/create-options'))return fulfillJson(route,{supplier:poSupplier,purchase_order_currency:'EUR',products:[poProduct]});
  if(path.endsWith('/purchase-orders'))return fulfillJson(route,setup.listError?{message:'Purchase order registry unavailable'}:setup.rows??[],setup.listError?503:200);
  if(/\/purchase-orders\/[^/]+$/.test(path))return fulfillJson(route,setup.detail??poDetail);
  return route.continue();
 });
 await page.route('**/suppliers**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  if(route.request().method()==='GET'&&new URL(route.request().url()).pathname.endsWith('/suppliers'))return fulfillJson(route,[poSupplier]);
  return route.continue();
 });
 await page.route('**/products**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  if(route.request().method()==='GET'&&new URL(route.request().url()).pathname.endsWith('/products'))return fulfillJson(route,[poProduct]);
  return route.continue();
 });
 await page.goto(url);
 await expect(page.getByRole('heading',{name:'Purchase orders',exact:true})).toBeVisible();
 return seen;
}
const registryRequests=(seen:PoSeen[])=>seen.filter(r=>r.path.endsWith('/purchase-orders')&&r.method==='GET');
const requestedFilter=(seen:PoSeen[],key:string,value:string)=>registryRequests(seen).some(r=>new URL(r.url).searchParams.get(key)===value);
const filterSection=(page:Page)=>page.locator('.purchase-orders-primary-filters');
const advancedFilters=(page:Page)=>page.locator('details.purchase-orders-advanced-filters');
async function openAdvanced(page:Page){await advancedFilters(page).locator('summary').click();}

test.describe('Purchase Orders — registry, source-backed query and read-only navigation (Batch 27)',()=>{
 test('TPO-001 Explainer clarifies approval does not receive stock',async({page})=>{
  await openPurchaseOrders(page);
  await expect(page.getByRole('region',{name:'How Purchase Orders work'})).toBeVisible();
  await expect(page.getByText('Stock still does not change.',{exact:false})).toBeVisible();
  await expect(page.getByText('That is when stock increases.',{exact:false})).toBeVisible();
 });
 test('TPO-002 Entitled page GETs purchase order registry without mutation',async({page})=>{
  const seen=await openPurchaseOrders(page);await expect.poll(()=>registryRequests(seen).length).toBeGreaterThan(0);
  expect(seen.every(r=>r.method==='GET')).toBe(true);
 });
 test('TPO-003 Empty registry uses explicit no-orders message',async({page})=>{
  await openPurchaseOrders(page);await expect(page.getByText('No purchase orders found.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Export CSV'})).toBeDisabled();
 });
 test('TPO-004 Registry GET failure displays error separately from an empty result',async({page})=>{
  await openPurchaseOrders(page,{listError:true});
  await expect(page.getByText('Purchase order registry unavailable',{exact:false})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Purchase order registry'})).toBeVisible();
 });
 test('TPO-005 Populated registry displays supplier, number, status and receiving evidence',async({page})=>{
  await openPurchaseOrders(page,{rows:[poRow]});
  const row=page.locator('.purchase-orders-table tbody tr').first();
  await expect(row).toContainText('PW-PO-0001');await expect(row).toContainText('Synthetic Supply Ltd');
  await expect(row).toContainText('Draft');
 });
 test('TPO-006 Status dropdown sets status=draft in GET and URL',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[poRow]});
  await filterSection(page).getByLabel('Status').selectOption('draft');
  await expect.poll(()=>requestedFilter(seen,'status','draft')).toBe(true);await expect(page).toHaveURL(/status=draft/);
 });
 test('TPO-007 Supplier filter sends exact synthetic supplier ID',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[poRow]});
  await filterSection(page).getByLabel('Supplier').selectOption('pw-supplier-1');
  await expect.poll(()=>requestedFilter(seen,'supplier_id','pw-supplier-1')).toBe(true);
 });
 test('TPO-008 Search trims whitespace in query and preserves search in URL',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[poRow]});
  await page.getByPlaceholder('PO number, supplier, or notes').fill('  PW-PO-0001  ');
  await expect.poll(()=>requestedFilter(seen,'search','PW-PO-0001')).toBe(true);
  await expect(page).toHaveURL(/search=PW-PO-0001/);
 });
 test('TPO-009 Next action filter sends canonical approve-or-cancel workflow value',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[poRow]});
  await filterSection(page).getByLabel('Next action').selectOption('approve_or_cancel');
  await expect.poll(()=>requestedFilter(seen,'next_action_status','approve_or_cancel')).toBe(true);
 });
 test('TPO-010 Advanced receiving filter sends partially_received',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[poRow]});await openAdvanced(page);
  await advancedFilters(page).getByLabel('Receiving').selectOption('partially_received');
  await expect.poll(()=>requestedFilter(seen,'receiving_status','partially_received')).toBe(true);
 });
 test('TPO-011 Advanced variance filter sends open_short',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[poRow]});await openAdvanced(page);
  await advancedFilters(page).getByLabel('Variance').selectOption('open_short');
  await expect.poll(()=>requestedFilter(seen,'variance_status','open_short')).toBe(true);
 });
 test('TPO-012 Advanced delivery status sends overdue without changing other filters',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[poRow]});await filterSection(page).getByLabel('Status').selectOption('draft');await openAdvanced(page);
  await advancedFilters(page).getByLabel('Delivery').selectOption('overdue');
  await expect.poll(()=>registryRequests(seen).some(r=>{const p=new URL(r.url).searchParams;return p.get('delivery_status')==='overdue'&&p.get('status')==='draft';})).toBe(true);
 });
 test('TPO-013 Advanced product filter sends product_id with source-backed product option',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[poRow]});await openAdvanced(page);
  await advancedFilters(page).getByLabel('Product').selectOption('pw-product');
  await expect.poll(()=>requestedFilter(seen,'product_id','pw-product')).toBe(true);
 });
 test('TPO-014 Date range inputs pass created_from and created_to separately',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[poRow]});await openAdvanced(page);
  await advancedFilters(page).getByLabel('Created from').fill('2026-10-01');
  await advancedFilters(page).getByLabel('Created to').fill('2026-10-31');
  await expect.poll(()=>registryRequests(seen).some(r=>{const p=new URL(r.url).searchParams;return p.get('created_from')==='2026-10-01'&&p.get('created_to')==='2026-10-31';})).toBe(true);
 });
 test('TPO-015 Clear filters drops status and supplier while retaining registry',async({page})=>{
  await openPurchaseOrders(page,{rows:[poRow]});await filterSection(page).getByLabel('Status').selectOption('draft');
  await filterSection(page).getByLabel('Supplier').selectOption('pw-supplier-1');
  await page.locator('.purchase-orders-header-actions').getByRole('button',{name:'Clear filters'}).click();
  await expect(filterSection(page).getByLabel('Status')).toHaveValue('');
  await expect(filterSection(page).getByLabel('Supplier')).toHaveValue('');
  await expect(page).not.toHaveURL(/status=draft|supplier_id=/);
 });
 test('TPO-016 Sort control updates URL without pretending the backend sorted it',async({page})=>{
  await openPurchaseOrders(page,{rows:[poRow]});await openAdvanced(page);
  await advancedFilters(page).getByRole('combobox',{name:'Sort purchase orders'}).selectOption('cost_desc');
  await expect(page).toHaveURL(/sort=cost_desc/);
 });
 test('TPO-017 Rows per page 10 persists page_size in URL',async({page})=>{
  const rows=Array.from({length:12},(_,i)=>({...poRow,id:`pw-po-${i}`,po_number:`PW-PO-${String(i).padStart(4,'0')}`}));
  await openPurchaseOrders(page,{rows});
  await page.getByRole('combobox',{name:'Purchase orders per page'}).selectOption('10');
  await expect(page).toHaveURL(/page_size=10/);await expect(page.locator('.purchase-orders-table tbody tr')).toHaveCount(10);
 });
 test('TPO-018 Next and previous pagination retain client-side pages in URL',async({page})=>{
  const rows=Array.from({length:27},(_,i)=>({...poRow,id:`pw-po-${i}`,po_number:`PW-PO-${String(i).padStart(4,'0')}`}));
  await openPurchaseOrders(page,{rows});
  await page.locator('.purchase-orders-pagination').getByRole('button',{name:'Next'}).click();
  await expect(page).toHaveURL(/page=2/);
  await page.locator('.purchase-orders-pagination').getByRole('button',{name:'Previous'}).click();
  await expect(page).not.toHaveURL(/page=2/);
 });
 test('TPO-019 purchaseOrderId deep link GETs exact detail even when not on current list page',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[]},'/purchase-orders?purchaseOrderId=pw-po-1');
  await expect.poll(()=>seen.some(r=>r.path.endsWith('/purchase-orders/pw-po-1'))).toBe(true);
  await expect(page.locator('#purchase-order-detail')).toBeVisible();
  await expect(page).toHaveURL(/purchaseOrderId=pw-po-1/);
 });
 test('TPO-020 Empty page exports and printing are disabled; no mutating request is made',async({page})=>{
  const seen=await openPurchaseOrders(page);
  await expect(page.getByRole('button',{name:'Export CSV'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Print list'})).toBeDisabled();
  await openAdvanced(page);
  await expect(advancedFilters(page).getByRole('button',{name:'Export current page'})).toBeDisabled();
  expect(seen.every(r=>r.method==='GET')).toBe(true);
 });
});

// Batch 178 — Source-anchored PO list parsing, sorting, attention, filter and analytics
// boundaries. This is synthetic browser evidence only: no real procurement posts,
// backend filtering, audit persistence, email delivery or tenant isolation is verified.
const b178Po = (n:number, override:Record<string,unknown>={})=>({
 ...poRow, id:`pw-b178-${n}`, po_number:`PW-B178-${String(n).padStart(3,'0')}`,
 created_at:`2026-10-${String(Math.min(n,28)).padStart(2,'0')}T12:00:00Z`,
 ...override
});
const b178Links=(page:Page)=>page.locator('#purchase-order-registry .purchase-orders-po-link');
const b178Attention=(page:Page)=>page.locator('.purchase-orders-attention-actions');
const b178ChipBar=(page:Page)=>page.locator('.purchase-orders-active-filters');
const b178Query=(page:Page,key:string)=>new URL(page.url()).searchParams.get(key);
async function b178Sort(page:Page,key:string){
 await openAdvanced(page);
 await advancedFilters(page).getByLabel('Sort purchase orders').selectOption(key);
}

test.describe('Purchase Orders — source-backed list and query edge coverage (Batch 178)',()=>{
 test('TPO-051 Invalid URL sort returns to the supported newest-first selection',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1),b178Po(2)]},'/purchase-orders?sort=not_a_sort');
  await openAdvanced(page);
  await expect(advancedFilters(page).getByLabel('Sort purchase orders')).toHaveValue('created_desc');
  await expect(b178Links(page)).toHaveText(['PW-B178-002','PW-B178-001']);
 });
 test('TPO-052 Unsupported page size defaults to twenty-five without showing an invalid option',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1)]},'/purchase-orders?page_size=13');
  await expect(page.getByLabel('Purchase orders per page')).toHaveValue('25');
  await expect(b178Links(page)).toHaveCount(1);
 });
 test('TPO-053 Non-integer page query cannot advance the displayed page',async({page})=>{
  await openPurchaseOrders(page,{rows:Array.from({length:27},(_,i)=>b178Po(i+1))},'/purchase-orders?page=1.5');
  await expect(page.locator('.purchase-orders-pagination')).toContainText('Page 1 of 2');
  await expect(b178Links(page)).toHaveCount(25);
 });
 test('TPO-054 Negative page query falls back to the first page rather than an empty table',async({page})=>{
  await openPurchaseOrders(page,{rows:Array.from({length:28},(_,i)=>b178Po(i+1))},'/purchase-orders?page=-7');
  await expect(page.locator('.purchase-orders-pagination')).toContainText('Page 1 of 2');
  await expect(b178Links(page)).toHaveCount(25);
 });
 test('TPO-055 Created date ascending sort orders older orders before newer ones',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(3),b178Po(1),b178Po(2)]});
  await b178Sort(page,'created_asc');await expect(b178Links(page)).toHaveText(['PW-B178-001','PW-B178-002','PW-B178-003']);
 });
 test('TPO-056 Expected-soonest sort sends missing delivery dates to the end',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1,{expected_delivery_date:null}),b178Po(2,{expected_delivery_date:'2026-11-25'}),b178Po(3,{expected_delivery_date:'2026-11-15'})]});
  await b178Sort(page,'expected_asc');await expect(b178Links(page)).toHaveText(['PW-B178-003','PW-B178-002','PW-B178-001']);
 });
 test('TPO-057 Expected-latest sort treats a missing delivery date as older than a dated order',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1,{expected_delivery_date:null}),b178Po(2,{expected_delivery_date:'2026-11-25'}),b178Po(3,{expected_delivery_date:'2026-11-15'})]});
  await b178Sort(page,'expected_desc');await expect(b178Links(page)).toHaveText(['PW-B178-002','PW-B178-003','PW-B178-001']);
 });
 test('TPO-058 Highest-value sort uses numeric estimated cost rather than original record order',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1,{estimated_total_cost:15}),b178Po(2,{estimated_total_cost:200}),b178Po(3,{estimated_total_cost:70})]});
  await b178Sort(page,'cost_desc');await expect(b178Links(page)).toHaveText(['PW-B178-002','PW-B178-003','PW-B178-001']);
 });
 test('TPO-059 Lowest-value sort treats absent estimated cost as zero',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1,{estimated_total_cost:15}),b178Po(2,{estimated_total_cost:null}),b178Po(3,{estimated_total_cost:'70'})]});
  await b178Sort(page,'cost_asc');await expect(b178Links(page)).toHaveText(['PW-B178-002','PW-B178-001','PW-B178-003']);
 });
 test('TPO-060 Most-received sort uses numeric received percentages',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1,{receiving_percent:0}),b178Po(2,{receiving_percent:85}),b178Po(3,{receiving_percent:'25'})]});
  await b178Sort(page,'received_percent_desc');await expect(b178Links(page)).toHaveText(['PW-B178-002','PW-B178-003','PW-B178-001']);
 });
 test('TPO-061 Least-received sort includes missing percentages as zero',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1,{receiving_percent:60}),b178Po(2,{receiving_percent:null}),b178Po(3,{receiving_percent:25})]});
  await b178Sort(page,'received_percent_asc');await expect(b178Links(page)).toHaveText(['PW-B178-002','PW-B178-003','PW-B178-001']);
 });
 test('TPO-062 One-hundred-per-page choice shows all eighty available rows',async({page})=>{
  await openPurchaseOrders(page,{rows:Array.from({length:80},(_,i)=>b178Po(i+1))});
  await page.getByLabel('Purchase orders per page').selectOption('100');
  await expect(b178Links(page)).toHaveCount(80);
  await expect(page.locator('.purchase-orders-pagination')).toContainText('Page 1 of 1');
  await expect.poll(()=>b178Query(page,'page_size')).toBe('100');
 });
 test('TPO-063 Changing page size resets an existing second page without dropping rows',async({page})=>{
  await openPurchaseOrders(page,{rows:Array.from({length:40},(_,i)=>b178Po(i+1))});
  await page.getByLabel('Purchase orders per page').selectOption('10');
  await page.locator('.purchase-orders-pagination').getByRole('button',{name:'Next'}).click();
  await expect(page.locator('.purchase-orders-pagination')).toContainText('Page 2 of 4');
  await page.getByLabel('Purchase orders per page').selectOption('50');
  await expect(page.locator('.purchase-orders-pagination')).toContainText('Page 1 of 1');
  await expect(b178Links(page)).toHaveCount(40);
 });
 test('TPO-064 Attention list is restricted to five highest-priority actionable orders',async({page})=>{
  const actions=['submit_for_approval','monitor_receiving','create_shipment','approve_or_cancel','receive_open_shipment','follow_up_overdue','none_completed'];
  await openPurchaseOrders(page,{rows:actions.map((a,i)=>b178Po(i+1,{next_action_status:a}))});
  await expect(page.locator('.purchase-orders-attention-list button')).toHaveCount(5);
  const titles=await page.locator('.purchase-orders-attention-list button strong').allTextContents();
  expect(titles).toEqual(['PW-B178-006','PW-B178-005','PW-B178-004','PW-B178-003','PW-B178-002']);
 });
 test('TPO-065 Equal-priority attention orders use expected delivery date as tie breaker',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1,{next_action_status:'approve_or_cancel',expected_delivery_date:'2026-12-10'}),b178Po(2,{next_action_status:'approve_or_cancel',expected_delivery_date:'2026-12-01'})]});
  await expect(page.locator('.purchase-orders-attention-list button strong')).toHaveText(['PW-B178-002','PW-B178-001']);
 });
 test('TPO-066 Attention-card click selects its order and requests the exact detail',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1,{next_action_status:'follow_up_overdue'})],detail:{...poDetail,id:'pw-b178-1',po_number:'PW-B178-001'}});
  await page.locator('.purchase-orders-attention-list button').first().click();
  await expect.poll(()=>seen.some(r=>r.path.endsWith('/purchase-orders/pw-b178-1'))).toBe(true);
  await expect.poll(()=>b178Query(page,'purchaseOrderId')).toBe('pw-b178-1');
 });
 test('TPO-067 Nonactionable orders do not populate the attention list',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1,{next_action_status:'none'}),b178Po(2,{next_action_status:'none_completed'}),b178Po(3,{next_action_status:'none_cancelled'})]});
  await expect(page.getByText('No urgent purchase order actions',{exact:true})).toBeVisible();
  await expect(page.locator('.purchase-orders-attention-list')).toHaveCount(0);
 });
 test('TPO-068 Overdue quick filter sets delivery_status without a write',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1,{delivery_status:'overdue'})]});
  await b178Attention(page).getByRole('button',{name:/Overdue/}).click();
  await expect.poll(()=>requestedFilter(seen,'delivery_status','overdue')).toBe(true);
  await expect.poll(()=>b178Query(page,'delivery_status')).toBe('overdue');
 });
 test('TPO-069 Due-today attention filter uses the canonical due_today token',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1,{delivery_status:'due_today'})]});
  await b178Attention(page).getByRole('button',{name:/Due today/}).click();
  await expect.poll(()=>requestedFilter(seen,'delivery_status','due_today')).toBe(true);
 });
 test('TPO-070 Receive attention filter targets receive_open_shipment',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1,{next_action_status:'finalize_open_shipment'}),b178Po(2,{next_action_status:'receive_open_shipment'})]});
  await b178Attention(page).getByRole('button',{name:/Receive/}).click();
  await expect.poll(()=>requestedFilter(seen,'next_action_status','receive_open_shipment')).toBe(true);
 });
 test('TPO-071 Approve attention filter targets approve_or_cancel',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1,{next_action_status:'approve_or_cancel'})]});
  await b178Attention(page).getByRole('button',{name:/Approve/}).click();
  await expect.poll(()=>requestedFilter(seen,'next_action_status','approve_or_cancel')).toBe(true);
 });
 test('TPO-072 Attention delivery filter clears conflicting next action but retains status',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1)]});
  await filterSection(page).getByLabel('Status').selectOption('approved');
  await filterSection(page).getByLabel('Next action').selectOption('approve_or_cancel');
  await b178Attention(page).getByRole('button',{name:/Overdue/}).click();
  await expect.poll(()=>registryRequests(seen).some(r=>{
   const p=new URL(r.url).searchParams;return p.get('status')==='approved'&&p.get('delivery_status')==='overdue'&&!p.has('next_action_status');
  })).toBe(true);
 });
 test('TPO-073 Removing one active filter chip leaves a second filter intact',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1)]});
  await filterSection(page).getByLabel('Status').selectOption('draft');
  await filterSection(page).getByLabel('Supplier').selectOption('pw-supplier-1');
  await b178ChipBar(page).getByRole('button',{name:/Supplier: Synthetic Supply Ltd/}).click();
  await expect.poll(()=>registryRequests(seen).some(r=>{
   const p=new URL(r.url).searchParams;return p.get('status')==='draft'&&!p.has('supplier_id');
  })).toBe(true);
  await expect(b178ChipBar(page)).toContainText('Status: Draft');
 });
 test('TPO-074 Clear all chips resets advanced and primary filters together',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1)]});
  await filterSection(page).getByLabel('Status').selectOption('approved');await openAdvanced(page);
  await advancedFilters(page).getByLabel('Receiving').selectOption('partially_received');
  await b178ChipBar(page).getByRole('button',{name:'Clear all'}).click();
  await expect.poll(()=>registryRequests(seen).some((r,i)=>i>0&&!new URL(r.url).searchParams.has('status')&&!new URL(r.url).searchParams.has('receiving_status'))).toBe(true);
  await expect(b178ChipBar(page)).toHaveCount(0);
 });
 test('TPO-075 Supplier chip safely shows an unknown supplier ID from a deep link',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1)]},'/purchase-orders?supplier_id=legacy-supplier-id');
  await expect(b178ChipBar(page)).toContainText('Supplier: legacy-supplier-id');
  await expect.poll(()=>b178Query(page,'supplier_id')).toBe('legacy-supplier-id');
 });
 test('TPO-076 Clear date filters preserves non-date status criteria',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1)]});
  await filterSection(page).getByLabel('Status').selectOption('approved');await openAdvanced(page);
  await advancedFilters(page).getByLabel('Expected from').fill('2026-12-01');
  await advancedFilters(page).getByLabel('Created to').fill('2026-11-30');
  await advancedFilters(page).getByRole('button',{name:'Clear date filters'}).click();
  await expect.poll(()=>registryRequests(seen).some(r=>{
   const p=new URL(r.url).searchParams;return p.get('status')==='approved'&&!p.has('expected_from')&&!p.has('created_to');
  })).toBe(true);
  await expect(advancedFilters(page).getByLabel('Expected from')).toHaveValue('');
 });
 test('TPO-077 Expected today preset writes equal from/to dates in the query',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1)]});await openAdvanced(page);
  await advancedFilters(page).getByRole('button',{name:'Expected today'}).click();
  await expect.poll(()=>registryRequests(seen).some(r=>{
   const p=new URL(r.url).searchParams;return !!p.get('expected_from')&&p.get('expected_from')===p.get('expected_to');
  })).toBe(true);
 });
 test('TPO-078 Created last thirty days replaces prior expected-date filters',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1)]});await openAdvanced(page);
  await advancedFilters(page).getByLabel('Expected from').fill('2026-10-01');
  await advancedFilters(page).getByRole('button',{name:'Created last 30 days'}).click();
  await expect.poll(()=>registryRequests(seen).some(r=>{
   const p=new URL(r.url).searchParams;return !!p.get('created_from')&&!!p.get('created_to')&&!p.has('expected_from');
  })).toBe(true);
 });
 test('TPO-079 List analysis converts numeric-string quantities before aggregating totals',async({page})=>{
  await openPurchaseOrders(page,{rows:[b178Po(1,{total_quantity:'4',total_received_quantity:1,remaining_quantity:3}),b178Po(2,{total_quantity:7,total_received_quantity:2,remaining_quantity:5})]});
  await page.locator('.purchase-orders-list-analysis summary').click();
  const grid=page.locator('.purchase-orders-list-totals-grid');
  await expect(grid).toContainText('Filtered POs');await expect(grid).toContainText('Ordered qty');
  await expect(grid.locator('div').filter({has:page.getByText('Ordered qty',{exact:true})}).locator('strong')).toHaveText('11');
  await expect(grid.locator('div').filter({has:page.getByText('Received qty',{exact:true})}).locator('strong')).toHaveText('3');
  await expect(grid.locator('div').filter({has:page.getByText('Remaining qty',{exact:true})}).locator('strong')).toHaveText('8');
 });
 test('TPO-080 Status breakdown shortcut applies the same source filter as the registry dropdown',async({page})=>{
  const seen=await openPurchaseOrders(page,{rows:[b178Po(1,{status:'draft'}),b178Po(2,{status:'draft'}),b178Po(3,{status:'submitted'})]});
  await page.locator('.purchase-orders-list-analysis summary').click();
  await page.locator('.purchase-orders-breakdown-chips').first().getByRole('button',{name:/Draft: 2/}).click();
  await expect.poll(()=>requestedFilter(seen,'status','draft')).toBe(true);
  await expect(filterSection(page).getByLabel('Status')).toHaveValue('draft');
 });
});
