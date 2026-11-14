import { test, expect, type Page, type Route } from '../../../support/liveOriginalSafeTest';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 30 — Shipments page first 20 source-backed browser contracts.
// Every API request in this suite is intercepted with disposable synthetic data.
// These assertions cannot prove real stock posting, role authorization or supplier delivery.
type Request = {method:string;path:string;url:string;body:string|null};
type Shipment={id:string;supplier_id:string;supplier_name:string;delivery_date:string;status:string;
 qr_code:string;po_number:string;version:number;line_count:number;total_ordered_quantity:number;
 total_received_quantity:number;purchase_order_id?:string;linked_purchase_order_number?:string};
const pending:Shipment={id:'pw-shipment-a',supplier_id:'pw-supp-a',supplier_name:'Synthetic Supplier Alpha',
 delivery_date:'2026-10-20',status:'pending',qr_code:'QR-ALPHA',po_number:'SHIP-A',version:2,
 line_count:2,total_ordered_quantity:8,total_received_quantity:0,linked_purchase_order_number:'PO-ALPHA'};
const partial:Shipment={...pending,id:'pw-shipment-b',supplier_id:'pw-supp-b',supplier_name:'Synthetic Supplier Beta',
 delivery_date:'2026-10-19',status:'partial',qr_code:'QR-BETA',po_number:'SHIP-B',version:3,total_received_quantity:3};
const received:Shipment={...pending,id:'pw-shipment-c',supplier_id:'pw-supp-c',supplier_name:'Synthetic Supplier Gamma',
 delivery_date:'2026-10-18',status:'received',qr_code:'QR-GAMMA',po_number:'SHIP-C',version:4,total_received_quantity:8};
const options={suppliers:[{id:'pw-supp-a',name:'Synthetic Supplier Alpha'},
 {id:'pw-supp-b',name:'Synthetic Supplier Beta'}],products:[{id:'pw-product',name:'Synthetic Cleaner',supplier_id:'pw-supp-a'}],
 storage_locations:[{id:'pw-loc',name:'Front store'}],approved_purchase_orders:[]};
const item={id:'pw-shipment-item',shipment_id:'pw-shipment-a',product_id:'pw-product',product_name:'Synthetic Cleaner',
 quantity:8,received_quantity:0,storage_location_id:'pw-loc',storage_location_name:'Front store',version:1};
type Setup={shipments?:Shipment[];directShipments?:Shipment[];items?:any[];choices?:typeof options;listError?:boolean;optionsError?:boolean};
async function open(page:Page,setup:Setup={},url='/shipments'){
 await loginAsTenant(page);
 const requests:Request[]=[];
 await page.route('**/shipments**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const uri=new URL(req.url()),path=uri.pathname,method=req.method();
  requests.push({method,path,url:uri.toString(),body:req.postData()});
  if(method!=='GET')throw Error(`Unexpected shipment mutation: ${method} ${path}`);
  if(path.endsWith('/shipments/options'))return fulfillJson(route,
   setup.optionsError?{message:'Synthetic shipment options unavailable'}:(setup.choices??options),setup.optionsError?503:200);
  if(path.endsWith('/shipments'))return fulfillJson(route,
   setup.listError?{message:'Synthetic shipment list unavailable'}:(setup.shipments??[pending,partial,received]),setup.listError?503:200);
  const shipmentId=path.split('/').pop()||'';
  const record=[...(setup.shipments??[pending,partial,received]),...(setup.directShipments??[])].find(s=>s.id===shipmentId);
  if(!record)return fulfillJson(route,{message:'Synthetic shipment not found'},404);
  return fulfillJson(route,{shipment:record,summary:{line_count:record.line_count,
   total_ordered_quantity:record.total_ordered_quantity,total_received_quantity:record.total_received_quantity}});
 });
 await page.route('**/shipment-items/**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const uri=new URL(req.url()),path=uri.pathname,method=req.method();
  requests.push({method,path,url:uri.toString(),body:req.postData()});
  if(method!=='GET')throw Error(`Unexpected receiving mutation: ${method} ${path}`);
  return fulfillJson(route,setup.items??[item]);
 });
 await page.goto(url);
 await expect(page.getByRole('heading',{name:'Inbound shipments'})).toBeVisible();
 return requests;
}
const list=(page:Page)=>page.locator('#shipments-list');
const filter=(page:Page)=>list(page).getByPlaceholder('Search by shipment reference, linked PO, supplier, shipment ID, status...');
const status=(page:Page)=>list(page).locator('select').first();
const card=(page:Page,reference:string)=>list(page).getByRole('button',{name:new RegExp(reference)});
const shipmentCards=(page:Page)=>list(page).getByRole('button',{name:/SHIP-[A-Z0-9]+/});
const writes=(requests:Request[])=>requests.filter(r=>r.method!=='GET');
const gets=(requests:Request[],suffix:string)=>requests.filter(r=>r.method==='GET'&&r.path.endsWith(suffix));

test.describe('Inbound Shipments — registry and review (Batch 30)',()=>{
 test('TSH-001 Inbound workflow guides opening, receiving and finalization without posting',async({page})=>{
  const seen=await open(page);await expect(page.getByText('How Shipments work',{exact:true})).toBeVisible();
  await expect(page.getByText('Purchase Order = what you ordered. Shipment = what arrived from that order.')).toBeVisible();
  await expect(page.getByText('Select a shipment to continue')).toBeVisible();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-002 Registry and form choices are loaded through separate read requests',async({page})=>{
  const seen=await open(page);await expect.poll(()=>gets(seen,'/shipments').length).toBeGreaterThan(0);
  await expect.poll(()=>gets(seen,'/shipments/options').length).toBeGreaterThan(0);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-003 Summary includes pending, partial, received and overdue states',async({page})=>{
  const seen=await open(page);const summary=page.getByLabel('Shipment receiving summary');
  await expect(summary).toContainText('Total shipments');
  await expect(summary).toContainText('Awaiting receiving');
  await expect(summary).toContainText('Partially received');
  await expect(summary).toContainText('Completed');
  await expect(summary).toContainText('Overdue');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-004 Active partial shipments sort ahead of pending and completed',async({page})=>{
  const seen=await open(page);await expect(card(page,'SHIP-A')).toBeVisible();
  const cards=await shipmentCards(page).allTextContents();
  expect(cards.map(t=>t.match(/SHIP-[A-Z]/)?.[0])).toEqual(['SHIP-B','SHIP-A','SHIP-C']);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-005 Empty registry shows an explicit no-match state',async({page})=>{
  const seen=await open(page,{shipments:[]});
  await expect(list(page).getByText('No shipments match the current filter.')).toBeVisible();
  await expect(shipmentCards(page)).toHaveCount(0);expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-006 Shipment registry failure does not masquerade as an empty success',async({page})=>{
  const seen=await open(page,{listError:true});
  await expect(page.getByText('Shipment list could not be loaded.',{exact:false})).toBeVisible();
  await expect(page.getByText('Synthetic shipment list unavailable',{exact:false})).toBeVisible();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-007 Options failure warns but preserves the successfully loaded shipment list',async({page})=>{
  const seen=await open(page,{optionsError:true});
  await expect(page.getByText('Some shipment form choices could not be loaded.',{exact:false})).toBeVisible();
  await expect(card(page,'SHIP-B')).toBeVisible();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-008 Search matches supplier name locally without refetching the registry',async({page})=>{
  const seen=await open(page);await filter(page).fill('Supplier Beta');
  await expect(card(page,'SHIP-B')).toBeVisible();await expect(card(page,'SHIP-A')).toHaveCount(0);
  expect(gets(seen,'/shipments')).toHaveLength(1);expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-009 Search matches linked Purchase Order reference in the source record',async({page})=>{
  const seen=await open(page);await filter(page).fill('PO-ALPHA');
  await expect(card(page,'SHIP-A')).toBeVisible();
  await expect(card(page,'SHIP-B')).toHaveCount(0);expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-010 Search also matches QR code and shipment ID fields not printed in full',async({page})=>{
  const seen=await open(page);await filter(page).fill('QR-BETA');
  await expect(card(page,'SHIP-B')).toBeVisible();await expect(card(page,'SHIP-C')).toHaveCount(0);
  await filter(page).fill('pw-shipment-c');await expect(card(page,'SHIP-C')).toBeVisible();
  await expect(card(page,'SHIP-B')).toHaveCount(0);expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-011 Pending status filter excludes partial and received records',async({page})=>{
  const seen=await open(page);await status(page).selectOption('pending');
  await expect(card(page,'SHIP-A')).toBeVisible();await expect(card(page,'SHIP-B')).toHaveCount(0);
  await expect(card(page,'SHIP-C')).toHaveCount(0);expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-012 Partial status filter displays only partially received shipments',async({page})=>{
  const seen=await open(page);await status(page).selectOption('partial');
  await expect(card(page,'SHIP-B')).toBeVisible();await expect(card(page,'SHIP-A')).toHaveCount(0);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-013 Received filter shows completed shipments but does not receive anything',async({page})=>{
  const seen=await open(page);await status(page).selectOption('received');
  await expect(card(page,'SHIP-C')).toBeVisible();await expect(card(page,'SHIP-B')).toHaveCount(0);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-014 Search is case-insensitive and trims surrounding whitespace',async({page})=>{
  const seen=await open(page);await filter(page).fill('  sUpPlIeR gAmMa  ');
  await expect(card(page,'SHIP-C')).toBeVisible();await expect(card(page,'SHIP-A')).toHaveCount(0);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-015 Combined search and status filter must satisfy both conditions',async({page})=>{
  const seen=await open(page);await filter(page).fill('Synthetic Supplier Beta');
  await status(page).selectOption('pending');
  await expect(list(page).getByText('No shipments match the current filter.')).toBeVisible();
  await status(page).selectOption('partial');await expect(card(page,'SHIP-B')).toBeVisible();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-016 Clearing search and status restores all three records with no mutations',async({page})=>{
  const seen=await open(page);await filter(page).fill('no-match');
  await expect(list(page).getByText('No shipments match the current filter.')).toBeVisible();
  await filter(page).fill('');await status(page).selectOption('');
  await expect(shipmentCards(page)).toHaveCount(3);expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-017 Pagination moves between list pages and supports different page sizes',async({page})=>{
  const many=Array.from({length:60},(_,i)=>({...pending,id:`pw-many-${i+1}`,po_number:`SHIP-${String(i+1).padStart(3,'0')}`,delivery_date:'2026-12-31'}));
  const seen=await open(page,{shipments:many});const perPage=list(page).getByLabel('Shipments per page');
  await expect(shipmentCards(page)).toHaveCount(25);
  await list(page).getByRole('button',{name:'Next'}).click();await expect(list(page).getByText('Page 2 of 3')).toBeVisible();
  await list(page).getByRole('button',{name:'Previous'}).click();await expect(list(page).getByText('Page 1 of 3')).toBeVisible();
  await perPage.selectOption('50');await expect(shipmentCards(page)).toHaveCount(50);
  await expect(list(page).getByText('Page 1 of 2')).toBeVisible();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-018 Changing a filter on page two resets back to the first page',async({page})=>{
  const many=Array.from({length:55},(_,i)=>({...pending,id:`pw-many-${i+1}`,po_number:`SHIP-${String(i+1).padStart(3,'0')}`,delivery_date:'2026-12-31'}));
  const seen=await open(page,{shipments:many});await list(page).getByRole('button',{name:'Next'}).click();
  await expect(list(page).getByText('Page 2 of 3')).toBeVisible();
  await filter(page).fill('SHIP-001');await expect(list(page).getByText('Page 1 of 1')).toBeVisible();
  await expect(card(page,'SHIP-001')).toBeVisible();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-019 Selecting a shipment loads its line items but does not receive stock',async({page})=>{
  const seen=await open(page);await card(page,'SHIP-A').click();
  await expect.poll(()=>gets(seen,'/shipment-items/pw-shipment-a').length).toBeGreaterThan(0);
  await expect(page.getByText('Selected Shipment')).toBeVisible();
  await expect(page.locator('#shipments-detail')).toContainText('SHIP-A');
  await expect(page.locator('#shipments-detail')).toContainText('Synthetic Supplier Alpha');
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-020 Refresh explicitly reloads registry and options, never a receiving mutation',async({page})=>{
  const seen=await open(page);await expect.poll(()=>gets(seen,'/shipments/options').length).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>gets(seen,'/shipments').length).toBeGreaterThanOrEqual(2);
  await expect.poll(()=>gets(seen,'/shipments/options').length).toBeGreaterThanOrEqual(2);
  await expect(page.getByText('Shipment data refreshed.')).toBeVisible();expect(writes(seen)).toHaveLength(0);
 });
});

// Batch 31 — lifecycle contracts use synthetic-only network interception.
// Scenarios below describe browser-side behavior, not successful production posting.
const shipmentForm = (page:Page)=>page.locator('#shipments-create form');
const detail = (page:Page)=>page.locator('#shipments-detail');
const linePanel = (page:Page)=>detail(page).getByText('Receive this line',{exact:true}).locator('..');
const lineField = (page:Page,label:string)=>linePanel(page).getByText(label,{exact:true}).locator('..').locator('input, select, textarea').first();
const writeField = (page:Page,label:string)=>shipmentForm(page).getByText(label,{exact:true}).locator('..').locator('input,select').first();
const selectPending = async(page:Page)=>{await card(page,'SHIP-A').click();await expect(detail(page)).toContainText('Synthetic Cleaner');};
const payload=(r:WriteRecord)=>r.body?JSON.parse(r.body):{};
type WriteRecord={method:string;path:string;body:string|null;headers:Record<string,string>};
async function mockShipmentWrites(page:Page,opts:{fail?:Record<string,number>;responses?:Record<string,unknown>}={}){
 const recorded:WriteRecord[]=[];
 // Registered after the read routes so the non-GET requests never reach a real server.
 for(const pattern of ['**/shipments**','**/shipment-items**']){
  await page.route(pattern,async route=>{
   const req=route.request();if(req.isNavigationRequest()||req.method()==='GET')return route.fallback();
   const path=new URL(req.url()).pathname;
   recorded.push({method:req.method(),path,body:req.postData(),headers:req.headers()});
   const entry=Object.keys(opts.fail||{}).find(key=>path.endsWith(key));
   if(entry)return fulfillJson(route,{code:entry==='send-to-supplier'?'EMAIL_NOT_CONFIGURED':'SYNTHETIC_FAILURE',message:'Synthetic mutation rejected'},opts.fail![entry]);
   const match=Object.keys(opts.responses||{}).find(key=>path.endsWith(key));
   if(match)return fulfillJson(route,opts.responses![match]);
   if(path.endsWith('supplier-email-preview'))return fulfillJson(route,supplierPreview);
   if(path.endsWith('send-to-supplier'))return fulfillJson(route,{message:'Synthetic email response only',recipient_email:'supplier@example.invalid'});
   if(path.endsWith('/finalize'))return fulfillJson(route,{shipment:{...pending,status:'received'},finalized_with_discrepancies:false});
   if(path.endsWith('/receive'))return fulfillJson(route,{shipment:{...partial},received_items:[item]});
   if(path.endsWith('/receiving-discrepancy'))return fulfillJson(route,{...item,discrepancy_reason:'Synthetic shortage'});
   if(req.method()==='DELETE')return fulfillJson(route,{message:'Synthetic delete confirmed'});
   if(path.includes('/shipment-items'))return fulfillJson(route,item);
   return fulfillJson(route,{...pending,id:req.method()==='POST'?'pw-created':pending.id});
  });
 }
 return recorded;
}
const supplierPreview={recipient_email:'supplier@example.invalid',subject:'Synthetic purchase request',message:'',
 qr_image_data_uri:null,document:{document_title:'Supplier shipment request',shipment_id:'pw-shipment-a',
  po_number:'SHIP-A',issue_date:'2026-10-20',expected_delivery_date:'2026-10-25',delivery_address:'Synthetic warehouse',
  buyer:{name:'Synthetic Buyer'},supplier:{name:'Synthetic Supplier Alpha',email:'supplier@example.invalid'},
  items:[{product_id:'pw-product',product_name:'Synthetic Cleaner',quantity:8,unit:'UNIT'}],
  qr_code:'QR-ALPHA',qr_purpose:'Receiving only',pdf_filename:'synthetic-request.pdf',show_pricing:false}};
const readWrites=(r:WriteRecord[],suffix:string)=>r.filter(x=>x.path.endsWith(suffix));

test.describe('Inbound Shipments — synthetic lifecycle and governance (Batch 31)',()=>{
 test('TSH-021 Create shipment supplier is required and safe default is empty',async({page})=>{
  const seen=await open(page);await expect(shipmentForm(page).getByRole('button',{name:'Create Shipment'})).toBeDisabled();
  await writeField(page,'Supplier').selectOption('pw-supp-a');await expect(shipmentForm(page).getByRole('button',{name:'Create Shipment'})).toBeDisabled();
  await writeField(page,'Delivery Date').fill('2026-11-21');await expect(shipmentForm(page).getByRole('button',{name:'Create Shipment'})).toBeEnabled();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-022 Creating a shipment with valid supplier and date sends the source-backed request body',async({page})=>{
  await open(page);const rec=await mockShipmentWrites(page);
  await writeField(page,'Supplier').selectOption('pw-supp-a');await writeField(page,'Delivery Date').fill('2026-11-21');
  await shipmentForm(page).getByPlaceholder('Optional unique shipment reference').fill('SHIP-SYNTHETIC');
  await shipmentForm(page).getByRole('button',{name:'Create Shipment'}).click();
  await expect.poll(()=>readWrites(rec,'/shipments').length).toBe(1);
  expect(readWrites(rec,'/shipments')[0].method).toBe('POST');
  expect(payload(readWrites(rec,'/shipments')[0])).toMatchObject({supplier_id:'pw-supp-a',delivery_date:'2026-11-21',po_number:'SHIP-SYNTHETIC',purchase_order_id:null});
 });
 test('TSH-023 Linked Purchase Order selection stays gated by feature access and eligible supplier',async({page})=>{
  const seen=await open(page);await writeField(page,'Supplier').selectOption('pw-supp-a');
  // Without a subscribed feature response the link selector must not invent a PO option.
  await expect(shipmentForm(page).getByRole('option',{name:/PO-ALPHA/})).toHaveCount(0);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-024 Pending shipment header edit sends the original If-Match-Version',async({page})=>{
  await open(page);await selectPending(page);const rec=await mockShipmentWrites(page);
  await detail(page).getByRole('button',{name:'Edit Shipment'}).click();
  await detail(page).getByPlaceholder('Optional unique shipment reference').fill('SHIP-EDIT');
  await detail(page).getByRole('button',{name:'Save Shipment'}).click();
  await expect.poll(()=>readWrites(rec,'/shipments/pw-shipment-a').length).toBe(1);
  const update=readWrites(rec,'/shipments/pw-shipment-a')[0];expect(update.method).toBe('PATCH');
  expect(update.headers['if-match-version']).toBe('2');expect(payload(update).po_number).toBe('SHIP-EDIT');
 });
 test('TSH-025 Nonpending shipment locks header editing',async({page})=>{
  const seen=await open(page);await card(page,'SHIP-B').click();
  await expect(detail(page).getByRole('button',{name:'Edit Shipment'})).toHaveCount(0);
  await expect(detail(page).getByText('Shipment header and line structure are locked after receiving starts.',{exact:false})).toBeVisible();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-026 Shipment deletion requires explicit confirmation before DELETE',async({page})=>{
  await open(page);await selectPending(page);const rec=await mockShipmentWrites(page);
  page.once('dialog',async dialog=>{expect(dialog.message()).toContain('Delete this shipment?');await dialog.dismiss();});
  await detail(page).getByRole('button',{name:'Delete Shipment'}).click();expect(rec).toHaveLength(0);
  page.once('dialog',async dialog=>{await dialog.accept();});
  await detail(page).getByRole('button',{name:'Delete Shipment'}).click();
  await expect.poll(()=>readWrites(rec,'/shipments/pw-shipment-a').length).toBe(1);
  expect(rec[0].method).toBe('DELETE');expect(rec[0].headers['if-match-version']).toBe('2');
 });
 test('TSH-027 Item add requires product and positive quantity before POST',async({page})=>{
  const seen=await open(page);await selectPending(page);
  const add=detail(page).getByRole('button',{name:'Add Shipment Item'});await expect(add).toBeDisabled();
  await detail(page).getByText('Product',{exact:true}).locator('..').locator('select').selectOption('pw-product');
  await detail(page).getByText('Quantity',{exact:true}).locator('..').locator('input').fill('0');
  await expect(add).toBeDisabled();
  await detail(page).getByText('Quantity',{exact:true}).locator('..').locator('input').fill('2');
  await expect(add).toBeEnabled();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-028 Item quantity edit sends expected item version and numeric value',async({page})=>{
  await open(page);await selectPending(page);const rec=await mockShipmentWrites(page);
  await detail(page).getByText('Ordered Quantity',{exact:true}).locator('..').locator('input').fill('5');
  await detail(page).getByRole('button',{name:'Save ordered quantity'}).click();
  await expect.poll(()=>readWrites(rec,'/shipment-items/pw-shipment-item').length).toBe(1);
  const update=rec[0];expect(update.method).toBe('PATCH');expect(update.headers['if-match-version']).toBe('1');expect(payload(update)).toEqual({quantity:5});
 });
 test('TSH-029 Line deletion cancelled in confirmation sends no mutation',async({page})=>{
  const seen=await open(page);await selectPending(page);
  page.once('dialog',async dialog=>{expect(dialog.message()).toContain('Confirm action: Remove shipment line?');await dialog.dismiss();});
  await detail(page).getByRole('button',{name:'Remove shipment line'}).click();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-030 Over-remaining usable receiving quantity is disabled without POST',async({page})=>{
  const seen=await open(page);await selectPending(page);
  await lineField(page,'Usable Quantity Received').fill('999');
  await expect(detail(page).getByRole('button',{name:'Receive Item'})).toBeDisabled();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-031 Receiving requires an effective storage location',async({page})=>{
  const seen=await open(page,{items:[{...item,storage_location_id:null}],choices:{...options,storage_locations:[{id:'pw-loc',name:'Front store'},{id:'pw-loc-2',name:'Back store'}]}});await selectPending(page);
  await lineField(page,'Usable Quantity Received').fill('1');
  await expect(detail(page).getByRole('button',{name:'Receive Item'})).toBeDisabled();
  await lineField(page,'Storage Location').selectOption('pw-loc');
  await expect(detail(page).getByRole('button',{name:'Receive Item'})).toBeEnabled();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-032 Scanner launch keeps exact shipment and location context without receiving',async({page})=>{
  const seen=await open(page);await selectPending(page);
  await expect(detail(page).getByRole('button',{name:'Scan Barcode'})).toBeDisabled();
  // Default scanner destination selector is the receiving-readiness control, not the line-level planned location.
  await detail(page).getByText('Default receiving location',{exact:true}).locator('..').locator('select').selectOption('pw-loc');
  await expect(detail(page).getByRole('button',{name:'Scan Barcode'})).toBeEnabled();
  await detail(page).getByRole('button',{name:'Scan Barcode'}).click();
  await expect(page).toHaveURL(/\/scanner\?mode=product&shipmentId=pw-shipment-a&locationId=pw-loc/);expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-033 Lot, batch, expiry and serial fields remain separate from receiving action',async({page})=>{
  const seen=await open(page);await selectPending(page);
  await expect(lineField(page,'Lot Number')).toBeVisible();await expect(lineField(page,'Batch Number')).toBeVisible();
  await expect(lineField(page,'Expiry Date')).toBeVisible();await expect(linePanel(page).getByPlaceholder('One serial per received unit when serial tracking requires it')).toBeVisible();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-034 Receive request carries exact version, line fields and discrepancy details',async({page})=>{
  await open(page);await selectPending(page);const rec=await mockShipmentWrites(page);
  await lineField(page,'Usable Quantity Received').fill('2');
  await lineField(page,'Discrepancy Reason').fill('Two units supplied for staged delivery');
  await lineField(page,'Shortage Quantity').fill('6');await lineField(page,'Receiving Note').fill('Synthetic only');
  await detail(page).getByRole('button',{name:'Receive Item'}).click();
  await expect.poll(()=>readWrites(rec,'/shipments/pw-shipment-a/receive').length).toBe(1);
  const request=readWrites(rec,'/shipments/pw-shipment-a/receive')[0];expect(request.headers['if-match-version']).toBe('2');
  expect(payload(request).items[0]).toMatchObject({product_id:'pw-product',quantity_received:2,storage_location_id:'pw-loc',shortage_quantity:6,discrepancy_reason:'Two units supplied for staged delivery',receiving_note:'Synthetic only'});
 });
 test('TSH-035 Shortage reason may be saved without receiving stock',async({page})=>{
  await open(page);await selectPending(page);const rec=await mockShipmentWrites(page);
  await lineField(page,'Discrepancy Reason').fill('Synthetic zero delivery');
  await detail(page).getByRole('button',{name:'Save shortage reason'}).click();
  await expect.poll(()=>readWrites(rec,'/shipment-items/pw-shipment-item/receiving-discrepancy').length).toBe(1);
  const r=rec[0];expect(r.method).toBe('PATCH');expect(r.headers['if-match-version']).toBe('1');
  expect(payload(r)).toEqual({discrepancy_reason:'Synthetic zero delivery'});
  expect(readWrites(rec,'/shipments/pw-shipment-a/receive')).toHaveLength(0);
 });
 test('TSH-036 Incomplete line without a saved reason blocks finalization',async({page})=>{
  const seen=await open(page);await selectPending(page);
  await expect(detail(page).getByRole('button',{name:'Finalize Shipment'})).toBeDisabled();
  await expect(detail(page).getByText('Finalization blocked:',{exact:false})).toBeVisible();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-037 Received shipment disables further receiving and finalization',async({page})=>{
  const seen=await open(page,{items:[{...item,shipment_id:'pw-shipment-c',received_quantity:8}]});
  await card(page,'SHIP-C').click();await expect(detail(page).getByRole('button',{name:'Finalize Shipment'})).toBeDisabled();
  await expect(detail(page).getByRole('button',{name:'Scan Barcode'})).toBeDisabled();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-038 Supplier email preview remains non-sending until operator confirmation',async({page})=>{
  await open(page);await selectPending(page);const rec=await mockShipmentWrites(page);
  await detail(page).getByRole('button',{name:'Preview & Send Supplier Shipment Request'}).click();
  await expect(page.getByRole('dialog',{name:'Supplier Email Preview'})).toBeVisible();
  expect(readWrites(rec,'/shipments/pw-shipment-a/supplier-email-preview')).toHaveLength(1);
  expect(readWrites(rec,'/shipments/pw-shipment-a/send-to-supplier')).toHaveLength(0);
  await page.getByRole('dialog',{name:'Supplier Email Preview'}).getByRole('button',{name:'Cancel'}).click();
  expect(readWrites(rec,'/shipments/pw-shipment-a/send-to-supplier')).toHaveLength(0);
 });
 test('TSH-039 Supplier email cannot send invalid recipient and reports configuration rejection',async({page})=>{
  await open(page);await selectPending(page);
  const rec=await mockShipmentWrites(page,{fail:{'send-to-supplier':503}});
  await detail(page).getByRole('button',{name:'Preview & Send Supplier Shipment Request'}).click();
  const dlg=page.getByRole('dialog',{name:'Supplier Email Preview'});
  await dlg.getByLabel('To').fill('bad-email');await dlg.getByRole('button',{name:'Confirm & Send Email'}).click();
  await expect(page.getByText('Enter a valid supplier email address before sending.')).toBeVisible();
  expect(readWrites(rec,'/shipments/pw-shipment-a/send-to-supplier')).toHaveLength(0);
  await dlg.getByLabel('To').fill('supplier@example.invalid');await dlg.getByRole('button',{name:'Confirm & Send Email'}).click();
  await expect.poll(()=>readWrites(rec,'/shipments/pw-shipment-a/send-to-supplier').length).toBe(1);
  await expect(page.getByText('Supplier email is not configured on this server.',{exact:false})).toBeVisible();
 });
 test('TSH-040 Purchase Order handoff opens matching id through direct GET',async({page})=>{
  const seen=await open(page,{},'/shipments?source=purchase-order&shipmentId=pw-shipment-a');
  await expect.poll(()=>gets(seen,'/shipments/pw-shipment-a').length).toBeGreaterThan(0);
  await expect(detail(page)).toContainText('SHIP-A');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-041 Dashboard handoff failure displays a retrieval error instead of a false selection',async({page})=>{
  const seen=await open(page,{},'/shipments?source=dashboard&shipmentId=pw-absent');
  await expect.poll(()=>gets(seen,'/shipments/pw-absent').length).toBeGreaterThan(0);
  await expect(page.getByText('Synthetic shipment not found',{exact:false})).toBeVisible();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-042 Scanner handoff resolves a shipment not in the registry by id',async({page})=>{
  const one={...pending,id:'pw-scan-unknown',po_number:'SCAN-ONLY'};
  const seen=await open(page,{shipments:[pending],directShipments:[one]},'/shipments?shipmentId=pw-scan-unknown');
  await expect.poll(()=>gets(seen,'/shipments/pw-scan-unknown').length).toBeGreaterThan(0);
  await expect(detail(page)).toContainText('SCAN-ONLY');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-043 Operations role may review headers but cannot create or edit shipments',async({page})=>{
  await openShipmentRole(page,'PW_SHP_OPERATIONS');
  await expect(shipmentForm(page).getByRole('button',{name:'Create Shipment'})).toHaveCount(0);
  await card(page,'SHIP-A').click();await expect(detail(page).getByRole('button',{name:'Delete Shipment'})).toHaveCount(0);
  await expect(detail(page)).toContainText('SHIP-A');
 });
 test('TSH-044 Receive-only role cannot delete or finalize a shipment',async({page})=>{
  await openShipmentRole(page,'PW_SHP_RECEIVE_ONLY');await card(page,'SHIP-A').click();
  await expect(detail(page).getByRole('button',{name:'Delete Shipment'})).toHaveCount(0);
  await expect(detail(page).getByRole('button',{name:'Finalize Shipment'})).toBeDisabled();
 });
 test('TSH-045 Switching selected shipments clears unsaved receive-line drafts',async({page})=>{
  const seen=await open(page);await selectPending(page);await lineField(page,'Usable Quantity Received').fill('3');
  await card(page,'SHIP-B').click();await card(page,'SHIP-A').click();
  await expect(lineField(page,'Usable Quantity Received')).not.toHaveValue('3');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-046 Legacy direct reorder requires explicit confirmation before POST',async({page})=>{
  const seen=await open(page);await page.getByText('Legacy direct reorder',{exact:true}).click();
  page.once('dialog',async d=>{expect(d.message()).toContain('Run auto reorder now?');await d.dismiss();});
  await page.getByRole('button',{name:'Run direct reorder'}).click();expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-047 Receiving failure preserves the error and never displays successful receipt',async({page})=>{
  await open(page);await selectPending(page);const rec=await mockShipmentWrites(page,{fail:{'/receive':409}});
  await lineField(page,'Usable Quantity Received').fill('1');await detail(page).getByRole('button',{name:'Receive Item'}).click();
  await expect.poll(()=>readWrites(rec,'/shipments/pw-shipment-a/receive').length).toBe(1);
  await expect(page.getByText('Synthetic mutation rejected',{exact:false}).first()).toBeVisible();
  await expect(page.getByText('received into stock.',{exact:false})).toHaveCount(0);
 });
 test('TSH-048 Partial received quantity is displayed from server-provided line data',async({page})=>{
  const line={...item,received_quantity:3};const seen=await open(page,{shipments:[partial],items:[line]});
  await card(page,'SHIP-B').click();await expect(detail(page)).toContainText('5 remaining');
  await expect(detail(page)).toContainText('Synthetic Cleaner');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-049 No shipment item read permission exposes no line GET or detail cards',async({page})=>{
  const seen=await openShipmentRole(page,'PW_SHP_NO_ITEMS');await card(page,'SHIP-A').click();
  await expect(detail(page).getByText('Shipment item details are not available to this role.',{exact:false})).toBeVisible();
  expect(gets(seen,'/shipment-items/pw-shipment-a')).toHaveLength(0);
 });
 test('TSH-050 Refresh after selected line reloads registry, options and line evidence',async({page})=>{
  const seen=await open(page);await selectPending(page);
  const count=(end:string)=>gets(seen,end).length;
  const before=[count('/shipments'),count('/shipments/options'),count('/shipment-items/pw-shipment-a')];
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect.poll(()=>count('/shipments')).toBeGreaterThan(before[0]);
  await expect.poll(()=>count('/shipments/options')).toBeGreaterThan(before[1]);
  await expect.poll(()=>count('/shipment-items/pw-shipment-a')).toBeGreaterThan(before[2]);
  expect(writes(seen)).toHaveLength(0);
 });
});

async function openShipmentRole(page:Page,role:'PW_SHP_OPERATIONS'|'PW_SHP_RECEIVE_ONLY'|'PW_SHP_NO_ITEMS'){
 await loginAsDisposableRole(page,role);
 const seen:Request[]=[];
 await page.route('**/shipments**',async r=>{
  if(r.request().isNavigationRequest())return r.continue();
  const url=new URL(r.request().url());if(r.request().method()!=='GET')throw Error('Unexpected role mutation');
  seen.push({method:'GET',path:url.pathname,url:url.toString(),body:null});
  if(url.pathname.endsWith('/options'))return fulfillJson(r,options);
  if(url.pathname.endsWith('/shipments'))return fulfillJson(r,[pending,partial,received]);
  return fulfillJson(r,{shipment:pending,summary:{line_count:2,total_ordered_quantity:8,total_received_quantity:0}});
 });
 await page.route('**/shipment-items/**',async r=>{
  if(r.request().isNavigationRequest())return r.continue();
  const url=new URL(r.request().url());seen.push({method:r.request().method(),path:url.pathname,url:url.toString(),body:r.request().postData()});
  return fulfillJson(r,[item]);
 });
 await page.goto('/shipments');await expect(page.getByRole('heading',{name:'Inbound shipments'})).toBeVisible();return seen;
}

// Batch 177 — additional shipment registry and read-only receiving-evidence contracts.
// All API activity is synthetic/intercepted; no actual stock, email, or DB acceptance.
test.describe('Inbound Shipments — filters, legacy evidence and readiness (Batch 177)',()=>{
 test('TSH-051 Supplier ID is searchable when the human supplier name is present',async({page})=>{
  const seen=await open(page);await filter(page).fill('pw-supp-b');
  await expect(card(page,'SHIP-B')).toBeVisible();await expect(card(page,'SHIP-A')).toHaveCount(0);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-052 Purchase-order ID is searched independently of its displayed number',async({page})=>{
  const po={...pending,purchase_order_id:'pw-internal-po-789',linked_purchase_order_number:'ORDER-READABLE'};
  const seen=await open(page,{shipments:[po,partial]});await filter(page).fill('pw-internal-po-789');
  await expect(card(page,'SHIP-A')).toBeVisible();await expect(card(page,'SHIP-B')).toHaveCount(0);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-053 Delivery-date search matches the shipment date field',async({page})=>{
  const one={...pending,delivery_date:'2040-07-13'};
  const two={...partial,delivery_date:'2040-07-14'};
  const seen=await open(page,{shipments:[one,two]});await filter(page).fill('2040-07-14');
  await expect(card(page,'SHIP-B')).toBeVisible();await expect(card(page,'SHIP-A')).toHaveCount(0);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-054 Status tokens participate in text search without changing the status selector',async({page})=>{
  const seen=await open(page);await filter(page).fill('partial');
  await expect(card(page,'SHIP-B')).toBeVisible();await expect(card(page,'SHIP-A')).toHaveCount(0);
  await expect(status(page)).toHaveValue('');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-055 Whitespace-only search preserves all available shipment cards',async({page})=>{
  const seen=await open(page);await filter(page).fill('     ');
  await expect(shipmentCards(page)).toHaveCount(3);await expect(status(page)).toHaveValue('');
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-056 Missing shipment reference displays an explicit fallback instead of an empty card',async({page})=>{
  const absent={...pending,po_number:''};const seen=await open(page,{shipments:[absent]});
  const missing=list(page).getByRole('button',{name:/No shipment reference/});
  await expect(missing).toBeVisible();await missing.click();
  await expect(detail(page)).toContainText('Synthetic Supplier Alpha');
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-057 Missing supplier name falls back to the supplier ID in registry and detail',async({page})=>{
  const legacy={...pending,supplier_name:''};const seen=await open(page,{shipments:[legacy]});
  await expect(card(page,'SHIP-A')).toContainText('pw-supp-a');await card(page,'SHIP-A').click();
  await expect(detail(page)).toContainText('pw-supp-a');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-058 Retired supplier state is visible in both registry and selected details',async({page})=>{
  const retired={...pending,supplier_retired:true};const seen=await open(page,{shipments:[retired]});
  await expect(card(page,'SHIP-A')).toContainText('(retired)');await card(page,'SHIP-A').click();
  await expect(detail(page)).toContainText('(Retired)');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-059 An unlinked shipment shows a safe PO fallback and no handoff notice',async({page})=>{
  const standalone={...pending,purchase_order_id:undefined,linked_purchase_order_number:undefined};
  const seen=await open(page,{shipments:[standalone]});
  await expect(card(page,'SHIP-A')).toContainText('Linked PO:');
  await card(page,'SHIP-A').click();await expect(detail(page)).not.toContainText('From PO ');
  await expect(detail(page).getByRole('button',{name:'Open PO'})).toHaveCount(0);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-060 Linked PO ID remains visible even when historical PO number is absent',async({page})=>{
  const legacy={...pending,purchase_order_id:'pw-po-evidence-55',linked_purchase_order_number:undefined};
  const seen=await open(page,{shipments:[legacy]});await card(page,'SHIP-A').click();
  await expect(detail(page)).toContainText('pw-po-evidence-55');
  await expect(detail(page)).toContainText('From PO pw-po-evidence-55');
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-061 Unknown shipment status is humanized instead of discarded',async({page})=>{
  const legacy={...pending,status:'awaiting_qa_review'};const seen=await open(page,{shipments:[legacy]});
  await expect(card(page,'SHIP-A')).toContainText('Awaiting Qa Review');
  await card(page,'SHIP-A').click();await expect(detail(page)).toContainText('Awaiting Qa Review');
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-062 Missing status is shown as a fallback, without assigning a known status',async({page})=>{
  const legacy={...pending,status:''};const seen=await open(page,{shipments:[legacy]});
  await expect(card(page,'SHIP-A')).toBeVisible();
  await status(page).selectOption('pending');await expect(card(page,'SHIP-A')).toHaveCount(0);
  await status(page).selectOption('');await expect(card(page,'SHIP-A')).toBeVisible();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-063 Unknown status sorts after partial pending and received in the registry',async({page})=>{
  const fourth={...pending,id:'pw-unknown-status',po_number:'SHIP-X',status:'awaiting_qa_review'};
  const seen=await open(page,{shipments:[fourth,received,pending,partial]});
  const values=await shipmentCards(page).allTextContents();
  expect(values.map(text=>text.match(/SHIP-(?:A|B|C|X)/)?.[0])).toEqual(['SHIP-B','SHIP-A','SHIP-C','SHIP-X']);
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-064 Invalid delivery-date evidence remains visible as original text',async({page})=>{
  const invalid={...pending,delivery_date:'date-unavailable'};const seen=await open(page,{shipments:[invalid]});
  await expect(card(page,'SHIP-A')).toContainText('date-unavailable');
  await card(page,'SHIP-A').click();await expect(detail(page)).toContainText('date-unavailable');
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-065 Missing delivery date displays the dash fallback in registry and detail',async({page})=>{
  const missing={...pending,delivery_date:''};const seen=await open(page,{shipments:[missing]});
  await expect(card(page,'SHIP-A')).toContainText('Delivery:');
  await card(page,'SHIP-A').click();await expect(detail(page)).toContainText('Delivery Date');
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-066 Missing line-count evidence displays zero without preventing selection',async({page})=>{
  const unknown={...pending,line_count:undefined};const seen=await open(page,{shipments:[unknown]});
  await expect(card(page,'SHIP-A')).toContainText(/Lines:\s*0/);await card(page,'SHIP-A').click();
  await expect(detail(page)).toContainText('SHIP-A');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-067 Unknown status remains visible under all-status filter and excludes from pending filter',async({page})=>{
  const fourth={...pending,id:'pw-other-status',po_number:'SHIP-X',status:'on_hold'};
  const seen=await open(page,{shipments:[pending,fourth]});
  await expect(card(page,'SHIP-X')).toContainText('On Hold');
  await status(page).selectOption('pending');await expect(card(page,'SHIP-X')).toHaveCount(0);
  await status(page).selectOption('');await expect(card(page,'SHIP-X')).toBeVisible();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-068 Page-size 100 retains the final record on a second page',async({page})=>{
  const many=Array.from({length:101},(_,i)=>({...pending,id:`pw-page-${i}`,po_number:`SHIP-${String(i).padStart(3,'0')}`,delivery_date:'2040-01-01'}));
  const seen=await open(page,{shipments:many});await list(page).getByLabel('Shipments per page').selectOption('100');
  await expect(shipmentCards(page)).toHaveCount(100);await expect(list(page).getByText('Page 1 of 2')).toBeVisible();
  await list(page).getByRole('button',{name:'Next'}).click();
  await expect(shipmentCards(page)).toHaveCount(1);await expect(card(page,'SHIP-100')).toBeVisible();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-069 Changing page size on page three returns to first page',async({page})=>{
  const many=Array.from({length:70},(_,i)=>({...pending,id:`pw-page-${i}`,po_number:`SHIP-${String(i).padStart(3,'0')}`,delivery_date:'2040-01-01'}));
  const seen=await open(page,{shipments:many});await list(page).getByRole('button',{name:'Next'}).click();
  await list(page).getByRole('button',{name:'Next'}).click();await expect(list(page).getByText('Page 3 of 3')).toBeVisible();
  await list(page).getByLabel('Shipments per page').selectOption('50');
  await expect(list(page).getByText('Page 1 of 2')).toBeVisible();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-070 Registry search input respects its 255-character native maximum',async({page})=>{
  const seen=await open(page);await expect(filter(page)).toHaveAttribute('maxlength','255');
  await filter(page).fill('a'.repeat(255));await expect(filter(page)).toHaveValue('a'.repeat(255));
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-071 Selected advanced details show complete ID and version, not just abbreviated list reference',async({page})=>{
  const seen=await open(page);await card(page,'SHIP-A').click();
  await detail(page).locator('details').filter({hasText:'Advanced shipment details'}).locator('summary').click();
  await expect(detail(page)).toContainText('pw-shipment-a');await expect(detail(page)).toContainText('Record version');
  await expect(detail(page)).toContainText('QR-ALPHA');expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-072 No shipment items cannot be finalized even if header totals imply receipt',async({page})=>{
  const fake={...pending,total_received_quantity:8};const seen=await open(page,{shipments:[fake],items:[]});
  await card(page,'SHIP-A').click();
  await expect(detail(page).getByText('No shipment items yet.')).toBeVisible();
  await expect(detail(page).getByRole('button',{name:'Finalize Shipment'})).toBeDisabled();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-073 A persisted nonblank shortage reason permits finalization readiness without receipt',async({page})=>{
  const line={...item,discrepancy_reason:'Documented supplier shortfall'};
  const seen=await open(page,{items:[line]});await card(page,'SHIP-A').click();
  await expect(detail(page)).toContainText('Ready to finalize');
  await expect(detail(page).getByRole('button',{name:'Finalize Shipment'})).toBeEnabled();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-074 Whitespace-only persisted shortage reason does not satisfy finalization readiness',async({page})=>{
  const line={...item,discrepancy_reason:'    '};const seen=await open(page,{items:[line]});
  await card(page,'SHIP-A').click();
  await expect(detail(page)).toContainText('incomplete line(s) need a saved discrepancy reason');
  await expect(detail(page).getByRole('button',{name:'Finalize Shipment'})).toBeDisabled();
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-075 Retired product evidence is displayed without hiding the receiving record',async({page})=>{
  const line={...item,product_retired:true};const seen=await open(page,{items:[line]});
  await card(page,'SHIP-A').click();await expect(detail(page)).toContainText('Synthetic Cleaner (Retired)');
  expect(writes(seen)).toHaveLength(0);
 });
 test('TSH-076 Missing product display name safely falls back to the product ID',async({page})=>{
  const line={...item,product_name:''};const seen=await open(page,{items:[line]});
  await card(page,'SHIP-A').click();await expect(detail(page)).toContainText('pw-product');
  expect(writes(seen)).toHaveLength(0);
 });
});
