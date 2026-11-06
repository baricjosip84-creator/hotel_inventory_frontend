import { test, expect, type Page, type Route } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 28 — explicit source-backed browser behavior only. All mutations and GET
// evidence use synthetic interceptions in a disposable tenant. These cases do
// NOT establish transactionality, email delivery, authorization or persistence.
type Recorded = { method: string; path: string; url: string; body: any; version: string | null };
type Setup = { detail?: any; list?: any[]; entitled?: boolean; writeStatus?: number;
  audit?: any[]; auditHasMore?: boolean; auditTotal?: number; evidence?: any[]; role?: 'PW_PO_READ_ONLY'; selfApproval?: boolean };
const item={id:'pw-line',product_id:'pw-product',product_name:'Synthetic Component',product_unit:'pcs',quantity:5,entered_quantity:5,
  uom_code:'pcs',unit_cost:15,estimated_line_total:75,received_quantity:0,remaining_quantity:5,receiving_status:'not_started',estimated_cost_variance:0};
const supplier={id:'pw-supplier',name:'Synthetic Supplier',email:'supplier@example.invalid'};
const catalog=[{id:'pw-product',name:'Synthetic Component',unit:'pcs',supplier_id:supplier.id,current_supplier_unit_cost:15,current_supplier_price_currency:'EUR'},
 {id:'pw-other',name:'Synthetic Spare',unit:'pcs',supplier_id:supplier.id,current_supplier_unit_cost:11,current_supplier_price_currency:'EUR'}];
const row={id:'pw-po-1',po_number:'PW-PO-001',supplier_id:supplier.id,supplier_name:supplier.name,version:4,currency:'EUR',status:'draft',
 created_at:'2026-10-15T09:00:00Z',expected_delivery_date:'2026-12-05',notes:'SYNTHETIC-INTERNAL-ONLY',item_count:1,total_quantity:5,
 total_received_quantity:0,remaining_quantity:5,estimated_total_cost:75,receiving_status:'not_started',variance_status:'pending_receipt',
 delivery_status:'upcoming',next_action_status:'submit_for_approval',linked_shipment_count:0,open_linked_shipment_count:0};
const summary={ordered_quantity:5,received_quantity:0,remaining_quantity:5,linked_shipment_count:0,open_linked_shipment_count:0,
 receiving_status:'not_started',receiving_percent:0,variance_status:'pending_receipt',estimated_total_cost:75,remaining_estimated_cost:75};
const baseDetail={...row,items:[item],linked_shipments:[],receiving_summary:summary};
const event={id:'pw-audit-1',user_id:'pw-user',user_email:'team@example.invalid',user_name:'Training Reviewer',action:'purchase_order.created',entity_type:'purchase_order',entity_id:'pw-po-1',metadata:{source:'test'},created_at:'2026-10-15T09:01:00Z'};
const sent={id:'pw-evidence',shipment_id:'pw-shipment',recipient_email:'supplier@example.invalid',subject:'Synthetic PO',pdf_filename:'pw-record.pdf',pdf_sha256:'a'.repeat(64),delivery_status:'sent',prepared_at:'2026-10-16T09:00:00Z'};
const preview={recipient_email:'supplier@example.invalid',subject:'Synthetic Purchase Order',message:'Synthetic email',qr_image_data_uri:null,
 document:{document_title:'Purchase Order',shipment_id:'pw-shipment',po_number:'PW-PO-001',supplier:{name:'Synthetic Supplier'},buyer:{name:'Disposable Tenant'},
  items:[{product_id:'pw-product',product_name:'Synthetic Component',quantity:5,unit:'pcs',unit_price:15,line_total:75}],currency:'EUR',subtotal:75,
  qr_code:'PW-QR',qr_purpose:'Receiving only',pdf_filename:'pw-po.pdf',pricing_complete:true}};

async function mount(page:Page,setup:Setup={},url='/purchase-orders') {
 const seen:Recorded[]=[];
 if(setup.role) await loginAsDisposableRole(page,setup.role); else await loginAsTenant(page);
 const actingUserId=setup.selfApproval?await page.evaluate(()=>{const token=localStorage.getItem('inventory_access_token');if(!token)return null;try{const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));return payload.id||payload.user_id||null;}catch{return null;}}):null;
 const effectiveDetail=setup.selfApproval?withStatus('submitted',{created_by_user_id:actingUserId,require_separate_purchase_order_approver:true}):setup.detail;
 await page.route('**/tenants/subscription-access**',async r=>{
  if(r.request().isNavigationRequest())return r.continue();
  return fulfillJson(r,{tenant:{id:'pw-disposable',name:'Disposable tenant',status:'active',billing_status:'active'},
   write_access:{allowed:true,blocker:null},feature_entitlements:[{feature:'purchase_orders',allowed:setup.entitled!==false}],plan_usage:[],plan_limit_blocked_resources:[]});
 });
 await page.route('**/inventory-capabilities/products/*/uom**',async r=>{
  if(r.request().isNavigationRequest())return r.continue();
  return fulfillJson(r,{base_uom:'pcs',conversions:[]});
 });
 await page.route('**/suppliers**',async r=>{
  if(r.request().isNavigationRequest())return r.continue();
  if(r.request().method()==='GET'&&new URL(r.request().url()).pathname.endsWith('/suppliers'))return fulfillJson(r,[supplier]);
  return r.continue();
 });
 await page.route('**/products**',async r=>{
  if(r.request().isNavigationRequest())return r.continue();
  if(r.request().method()==='GET'&&new URL(r.request().url()).pathname.endsWith('/products'))return fulfillJson(r,catalog);
  return r.continue();
 });
 await page.route('**/audit**',async r=>{
  if(r.request().isNavigationRequest())return r.continue();
  const req=r.request(), uri=new URL(req.url()), path=uri.pathname;
  seen.push({method:req.method(),path,url:uri.toString(),body:null,version:null});
  if(req.method()!=='GET')throw Error('No real audit writes permitted');
  if(path.endsWith('/summary'))return fulfillJson(r,{total_events:setup.auditTotal??(setup.audit??[event]).length});
  const records=setup.audit??[event], offset=Number(uri.searchParams.get('offset')||0);
  return fulfillJson(r,{rows:offset>0?[]:records,has_more:setup.auditHasMore===true&&offset===0,offset,limit:Number(uri.searchParams.get('limit')||100)});
 });
 await page.route('**/shipments/**',async r=>{
  if(r.request().isNavigationRequest())return r.continue();
  const req=r.request(),path=new URL(req.url()).pathname;
  seen.push({method:req.method(),path,url:req.url(),body:req.postDataJSON?.()??null,version:req.headers()['if-match-version']??null});
  if(path.endsWith('/supplier-email-deliveries')&&req.method()==='GET')return fulfillJson(r,setup.evidence??[]);
  if(path.endsWith('/supplier-email-preview')&&req.method()==='POST')return fulfillJson(r,preview);
  if(path.endsWith('/send-to-supplier')&&req.method()==='POST')return fulfillJson(r,{message:'Synthetic email acceptance only',shipment_id:'pw-shipment',recipient_email:'supplier@example.invalid',attachments:[{filename:'pw-po.pdf'}]});
  if(path.endsWith('/pdf')&&req.method()==='GET')return r.fulfill({status:200,contentType:'application/pdf',body:'%PDF-1.4\n%%EOF'});
  return r.continue();
 });
 await page.route('**/purchase-orders**',async r=>{
  const req=r.request(); if(req.isNavigationRequest())return r.continue();
  const u=new URL(req.url()),path=u.pathname,method=req.method();
  const record={method,path,url:u.toString(),body:req.postDataJSON?.()??null,version:req.headers()['if-match-version']??null};seen.push(record);
  if(path.endsWith('/create-options'))return fulfillJson(r,{supplier,purchase_order_currency:'EUR',products:catalog});
  if(path.endsWith('/purchase-orders')&&method==='GET')return fulfillJson(r,setup.list??[row]);
  if(/\/purchase-orders\/[^/]+$/.test(path)&&method==='GET')return fulfillJson(r,effectiveDetail??baseDetail);
  if(method==='POST'||method==='PATCH'){
   if(setup.writeStatus)return fulfillJson(r,{message:setup.writeStatus===409?'Version conflict. Refresh and retry.':'Synthetic request rejected.'},setup.writeStatus);
   if(path.endsWith('/create-shipment'))return fulfillJson(r,{shipment:{id:'pw-shipment',status:'pending',delivery_date:'2026-12-05'},copied_item_count:1});
   const status=path.endsWith('/submit')?'submitted':path.endsWith('/approve')?'approved':path.endsWith('/cancel')?'cancelled':path.endsWith('/close')?'completed':path.endsWith('/reopen')?'approved':'draft';
   return fulfillJson(r,{...(effectiveDetail??baseDetail),status,id:'pw-po-1'});
  }
  throw Error(`Unexpected Purchase Order method ${method}`);
 });
 await page.goto(url);
 await expect(page.getByRole('heading',{name:'Purchase orders',exact:true})).toBeVisible();
 return seen;
}
const form=(page:Page)=>page.locator('#purchase-order-form');
const line=(page:Page,index=0)=>form(page).locator('.purchase-orders-item-card').nth(index);
const actions=(page:Page)=>page.locator('#purchase-order-detail .purchase-orders-primary-actions');
const request=(seen:Recorded[],suffix:string,method='POST')=>seen.find(x=>x.method===method&&x.path.endsWith(suffix));
const detailUrl='/purchase-orders?purchaseOrderId=pw-po-1';
async function fillDraft(page:Page) {
 await form(page).getByLabel('Supplier').selectOption(supplier.id);
 await expect(line(page).getByLabel('Product')).toBeEnabled();
 await line(page).getByLabel('Product').selectOption('pw-product');
 await line(page).getByLabel('Quantity').fill('5');
 await line(page).getByLabel('Purchase price per unit').fill('15');
}
const withStatus=(status:string, extra:any={})=>({...baseDetail,status,...extra});

test.describe('Purchase Orders — source-grounded draft, approval, supplier delivery and audit (Batch 28)',()=>{
 test('TPO-021 Supplier selection requests create options scoped to selected supplier',async({page})=>{
  const seen=await mount(page);await form(page).getByLabel('Supplier').selectOption(supplier.id);
  await expect.poll(()=>seen.find(x=>x.path.endsWith('/create-options'))?.url||'').toContain('supplier_id=pw-supplier');
  await expect(line(page).getByLabel('Product').locator('option',{hasText:'Synthetic Component'})).toHaveCount(1);
 });
 test('TPO-022 Required supplier and product selections block empty draft POST',async({page})=>{
  const seen=await mount(page);await form(page).getByRole('button',{name:'Create draft'}).click();
  await expect(form(page).getByText('Supplier is required.')).toBeVisible();
  await form(page).getByLabel('Supplier').selectOption(supplier.id);
  await form(page).getByRole('button',{name:'Create draft'}).click();
  await expect(form(page).getByText('Every item needs a product.')).toBeVisible();
  expect(request(seen,'/purchase-orders')).toBeUndefined();
 });
 test('TPO-023 Zero quantity is rejected before draft write',async({page})=>{
  const seen=await mount(page);await fillDraft(page);await line(page).getByLabel('Quantity').fill('0');
  await form(page).getByRole('button',{name:'Create draft'}).click();
  await expect(form(page).getByText('Every quantity must be greater than zero.')).toBeVisible();expect(request(seen,'/purchase-orders')).toBeUndefined();
 });
 test('TPO-024 Duplicate product lines are not committed',async({page})=>{
  const seen=await mount(page);await fillDraft(page);await form(page).getByRole('button',{name:'Add item'}).click();
  await line(page,1).getByLabel('Product').selectOption('pw-product');
  await line(page,1).getByLabel('Quantity').fill('2');
  await form(page).getByRole('button',{name:'Create draft'}).click();
  await expect(form(page).getByText('A product can only appear once per purchase order.')).toBeVisible();expect(request(seen,'/purchase-orders')).toBeUndefined();
 });
 test('TPO-025 Supplier pricing autofills matching-currency product price',async({page})=>{
  await mount(page);await form(page).getByLabel('Supplier').selectOption(supplier.id);
  await line(page).getByLabel('Product').selectOption('pw-product');
  await expect(line(page).getByLabel('Purchase price per unit')).toHaveValue('15');
  await expect(line(page).getByRole('combobox',{name:'Unit of measure for purchase order line 1'})).toBeVisible();
 });
 test('TPO-026 Optional number, notes and delivery date use normalized draft fields',async({page})=>{
  const seen=await mount(page);await fillDraft(page);
  await form(page).getByLabel('PO number').fill('  PW-NEW  ');
  await form(page).getByLabel('Expected delivery').fill('2026-12-11');
  await form(page).getByLabel('Internal notes').fill('  Internal planning only  ');
  await form(page).getByRole('button',{name:'Create draft'}).click();
  await expect.poll(()=>request(seen,'/purchase-orders')?.body).toMatchObject({po_number:'PW-NEW',expected_delivery_date:'2026-12-11',notes:'Internal planning only'});
 });
 test('TPO-027 Create draft POST carries source-backed quantities and supplier prices',async({page})=>{
  const seen=await mount(page);await fillDraft(page);
  await form(page).getByRole('button',{name:'Create draft'}).click();
  await expect.poll(()=>request(seen,'/purchase-orders')?.body).toMatchObject({supplier_id:supplier.id,items:[{product_id:'pw-product',quantity:5,unit_cost:15}]});
  await expect(form(page).getByText('PO draft created')).toBeVisible();
 });
 test('TPO-028 Failed draft POST preserves entered form and visible error',async({page})=>{
  const seen=await mount(page,{writeStatus:503});await fillDraft(page);
  await form(page).getByRole('button',{name:'Create draft'}).click();
  await expect.poll(()=>request(seen,'/purchase-orders')).toBeTruthy();
  await expect(form(page).getByText('Synthetic request rejected.',{exact:false})).toBeVisible();
  await expect(line(page).getByLabel('Quantity')).toHaveValue('5');
 });
 test('TPO-029 Draft edit preloads item values and sends If-Match-Version',async({page})=>{
  const seen=await mount(page,{},detailUrl);
  await page.getByRole('button',{name:'Edit draft'}).click();
  await expect(line(page).getByLabel('Quantity')).toHaveValue('5');
  await line(page).getByLabel('Quantity').fill('6');
  await form(page).getByRole('button',{name:'Save draft'}).click();
  await expect.poll(()=>request(seen,'/purchase-orders/pw-po-1','PATCH')?.version).toBe('4');
  expect(request(seen,'/purchase-orders/pw-po-1','PATCH')?.body.items[0].quantity).toBe(6);
 });
 test('TPO-030 Version-conflict draft edit retains entered quantity with error',async({page})=>{
  const seen=await mount(page,{writeStatus:409},detailUrl);
  await page.getByRole('button',{name:'Edit draft'}).click();await line(page).getByLabel('Quantity').fill('8');
  await form(page).getByRole('button',{name:'Save draft'}).click();
  await expect.poll(()=>request(seen,'/purchase-orders/pw-po-1','PATCH')).toBeTruthy();
  await expect(form(page).getByText('Version conflict.',{exact:false})).toBeVisible();
  await expect(line(page).getByLabel('Quantity')).toHaveValue('8');
 });
 test('TPO-031 Submit blocks missing positive supplier cost before lifecycle POST',async({page})=>{
  const seen=await mount(page,{detail:withStatus('draft',{items:[{...item,unit_cost:null}]})},detailUrl);
  await actions(page).getByRole('button',{name:'Submit blocked'}).click();
  await expect(page.getByText('Commercial cost review required.')).toBeVisible();
  expect(request(seen,'/submit')).toBeUndefined();
 });
 test('TPO-032 Submit action POST carries the selected order version',async({page})=>{
  const seen=await mount(page,{},detailUrl);
  await actions(page).getByRole('button',{name:'Submit for approval'}).click();
  await expect.poll(()=>request(seen,'/submit')?.version).toBe('4');
  expect(request(seen,'/submit')?.body).toEqual({});
 });
 test('TPO-033 Separate approver setting disables self-approval',async({page})=>{
  await mount(page,{detail:withStatus('submitted',{created_by_user_id:'pw-user',require_separate_purchase_order_approver:true})},detailUrl);
  // The actual browser session user ID is derived from the disposable auth fixture.
  const decision=actions(page).getByRole('button',{name:/Approve order|Different approver required/});
  await expect(decision).toBeDisabled();
  expect(request(seen,'/approve')).toBeUndefined();
  await expect(page.locator('#purchase-order-detail')).toContainText('Submitted');
 });
 test('TPO-034 Stale approval POST shows API conflict without false approval status',async({page})=>{
  const seen=await mount(page,{detail:withStatus('submitted'),writeStatus:409},detailUrl);
  await actions(page).getByRole('button',{name:'Approve order'}).click();
  await expect.poll(()=>request(seen,'/approve')?.version).toBe('4');
  await expect(page.getByText('Version conflict.',{exact:false})).toBeVisible();
  await expect(page.locator('.purchase-orders-detail-summary')).toContainText('Submitted');
 });
 test('TPO-035 Approved PO prepares shipment via Send to supplier, not direct inventory receive',async({page})=>{
  const seen=await mount(page,{detail:withStatus('approved')},detailUrl);
  await page.locator('.purchase-orders-action-panel').getByRole('button',{name:'Send to supplier'}).click();
  await expect.poll(()=>request(seen,'/create-shipment')).toBeTruthy();
  expect(request(seen,'/create-shipment')?.body).toEqual({delivery_date:'2026-12-05'});
  expect(seen.some(x=>/stock\/|inventory\/receive/.test(x.path)&&x.method!=='GET')).toBe(false);
 });
 test('TPO-036 Supplier email preview requires review and hides internal PO notes',async({page})=>{
  const seen=await mount(page,{detail:withStatus('approved')},detailUrl);
  await page.locator('.purchase-orders-action-panel').getByRole('button',{name:'Send to supplier'}).click();
  await expect.poll(()=>request(seen,'/supplier-email-preview')).toBeTruthy();
  const dialog=page.getByRole('dialog',{name:'Supplier Email Preview'});
  await expect(dialog).toBeVisible();await expect(dialog).not.toContainText('SYNTHETIC-INTERNAL-ONLY');
  await expect(dialog.getByRole('button',{name:'Confirm & Send Email'})).toBeVisible();
  expect(request(seen,'/send-to-supplier')).toBeUndefined();
 });
 test('TPO-037 Preview confirmation sends exact recipient and confirmed flag',async({page})=>{
  const seen=await mount(page,{detail:withStatus('approved')},detailUrl);
  await page.locator('.purchase-orders-action-panel').getByRole('button',{name:'Send to supplier'}).click();
  const dialog=page.getByRole('dialog',{name:'Supplier Email Preview'});
  await dialog.getByRole('textbox',{name:'To'}).fill('supplier@example.invalid');
  await dialog.getByRole('button',{name:'Confirm & Send Email'}).click();
  await expect.poll(()=>request(seen,'/send-to-supplier')?.body).toMatchObject({recipient_email:'supplier@example.invalid',confirmed:true});
 });
 test('TPO-038 Sent supplier email evidence offers the exact retained PDF action',async({page})=>{
  const detail=withStatus('approved',{linked_shipments:[{id:'pw-shipment',status:'pending',delivery_date:'2026-12-05'}],
   receiving_summary:{...summary,linked_shipment_count:1,open_linked_shipment_count:1}});
  const seen=await mount(page,{detail,evidence:[sent]},detailUrl);
  await expect(page.getByText('Supplier email record')).toBeVisible();
  await expect(page.getByRole('button',{name:'Download exact sent PDF'})).toBeVisible();
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/supplier-email-deliveries')&&x.method==='GET')).toBe(true);
 });
 test('TPO-039 Linked shipment action opens exact shipmentId deep link',async({page})=>{
  await mount(page,{detail:withStatus('approved',{linked_shipments:[{id:'pw-shipment',status:'pending',delivery_date:'2026-12-05',po_number:'PW-PO-001'}]})},detailUrl);
  await page.getByRole('button',{name:'Open shipment'}).click();
  await expect(page).toHaveURL(/\/shipments\?shipmentId=pw-shipment/);
 });
 test('TPO-040 Manual close requires reason and accepted native confirmation',async({page})=>{
  const seen=await mount(page,{detail:withStatus('approved')},detailUrl);
  await page.getByRole('button',{name:'Close order',exact:true}).click();
  expect(request(seen,'/close')).toBeUndefined();
  await page.getByLabel('Close reason').fill('Supplier short shipped');
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Close order',exact:true}).click();
  await expect.poll(()=>request(seen,'/close')?.body).toEqual({reason:'Supplier short shipped'});
  expect(request(seen,'/close')?.version).toBe('4');
 });
 test('TPO-041 Reopen requires confirmation and versioned POST',async({page})=>{
  const seen=await mount(page,{detail:withStatus('completed',{completion_type:'manual_close'})},detailUrl);
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Reopen order'}).click();
  expect(request(seen,'/reopen')).toBeUndefined();
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Reopen order'}).click();
  await expect.poll(()=>request(seen,'/reopen')?.version).toBe('4');
 });
 test('TPO-042 Cancellation needs accepted confirmation and carries reason+version',async({page})=>{
  const seen=await mount(page,{},detailUrl);
  await page.getByLabel('Cancellation reason').fill('Duplicate request');
  page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Cancel order'}).click();
  expect(request(seen,'/cancel')).toBeUndefined();
  page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Cancel order'}).click();
  await expect.poll(()=>request(seen,'/cancel')?.body).toEqual({reason:'Duplicate request'});
  expect(request(seen,'/cancel')?.version).toBe('4');
 });
 test('TPO-043 Receiving detail displays per-line ordered, received, remaining values',async({page})=>{
  const detail=withStatus('approved',{items:[{...item,received_quantity:2,remaining_quantity:3,received_estimated_cost:30,remaining_estimated_cost:45}],
   receiving_summary:{...summary,received_quantity:2,remaining_quantity:3,receiving_percent:40,received_estimated_cost:30,remaining_estimated_cost:45}});
  await mount(page,{detail},detailUrl);
  const table=page.locator('#purchase-order-detail .purchase-orders-table--detail');
  await expect(table).toContainText('Synthetic Component');await expect(table).toContainText('30');
  await expect(page.locator('.purchase-orders-detail-summary')).toContainText('2 / 5');
 });
 test('TPO-044 Audit search resets paging and scopes GET to selected PO',async({page})=>{
  const seen=await mount(page,{},detailUrl);
  await page.locator('details.purchase-orders-audit-details summary').click();
  await page.getByLabel('Search audit history').fill('  approved  ');
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/audit')&&new URL(x.url).searchParams.get('entity_id')==='pw-po-1'&&new URL(x.url).searchParams.get('search')==='approved')).toBe(true);
 });
 test('TPO-045 Audit export retrieves full evidence in 500-row source pages',async({page})=>{
  const seen=await mount(page,{audit:[event]},detailUrl);
  await page.locator('details.purchase-orders-audit-details summary').click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export audit CSV'}).click();await downloadPromise;
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/audit')&&new URL(x.url).searchParams.get('limit')==='500'&&new URL(x.url).searchParams.get('response_mode')==='page')).toBe(true);
 });
 test('TPO-046 Audit print operates on evidence and uses isolated print window',async({page})=>{
  const seen=await mount(page,{audit:[event]},detailUrl);
  await page.locator('details.purchase-orders-audit-details summary').click();
  await page.evaluate(()=>{window.open=()=>null;});
  await page.getByRole('button',{name:'Print audit'}).click();
  await expect(page.getByText('Browser blocked the print window.',{exact:false})).toBeVisible();
  await expect.poll(()=>seen.some(x=>x.path.endsWith('/audit')&&new URL(x.url).searchParams.get('limit')==='500')).toBe(true);
 });
 test('TPO-047 Registry CSV encodes formula-like PO values as data',async({page})=>{
  await mount(page,{list:[{...row,po_number:'=HYPERLINK("https://invalid.example")'}]});
  const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV',exact:true}).click();
  const download=await downloadPromise;const data=await readFile(await download.path(),'utf8');
  expect(data).not.toMatch(/(?:^|\n)=HYPERLINK\(/);
  expect(data).toContain('HYPERLINK');
 });
 test('TPO-048 Export current page respects page size and client order',async({page})=>{
  const list=Array.from({length:15},(_,i)=>({...row,id:`pw-po-${i}`,po_number:`PW-PO-${String(i+1).padStart(3,'0')}`,created_at:new Date(Date.UTC(2026,9,15,i)).toISOString()}));
  await mount(page,{list});await page.getByRole('combobox',{name:'Purchase orders per page'}).selectOption('10');
  await page.locator('details.purchase-orders-advanced-filters summary').click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export current page'}).click();
  const download=await downloadPromise;const data=await readFile(await download.path(),'utf8');
  expect(data.trim().split('\n')).toHaveLength(11);expect(data).toContain('PW-PO-015');expect(data).not.toContain('PW-PO-001');
 });
 test('TPO-049 Read-only PO role disables create and conceals lifecycle actions',async({page})=>{
  await mount(page,{role:'PW_PO_READ_ONLY'},detailUrl);
  await expect(page.getByRole('button',{name:'Create purchase order'})).toBeDisabled();
  await expect(actions(page).getByRole('button',{name:'Submit for approval'})).toHaveCount(0);
  await expect(page.locator('#purchase-order-detail')).toContainText('PW-PO-001');
 });
 test('TPO-050 Unentitled subscription blocks PO registry and actions',async({page})=>{
  const seen=await mount(page,{entitled:false});
  await expect(page.getByRole('heading',{name:'Purchase orders are not included in this tenant plan'})).toBeVisible();
  expect(seen.some(x=>x.path.endsWith('/purchase-orders'))).toBe(false);
  await expect(page.locator('#purchase-order-form')).toHaveCount(0);
 });
});
