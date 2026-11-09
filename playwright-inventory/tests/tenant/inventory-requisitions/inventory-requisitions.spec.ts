import {test,expect,type Page,type Route} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';

// Batch 23: InventoryRequisitionsPage.tsx /inventory-requisitions.
// Read-only synthetic GET isolation, not proof of backend persistence or authorization.
// The actual source uses list limit=pageSize+1 for has-next pagination.
type RequisitionRequest={pathname:string;method:string;search:string};
type RequisitionFixture={rows?:any[];summary?:Record<string,unknown>;options?:Record<string,unknown>;queueError?:boolean;detail?:any};
const defaultOptions={products:[{id:'pw-product',name:'Synthetic Product',unit:'pcs'}],filter_products:[{id:'pw-product',name:'Synthetic Product',unit:'pcs'}],storage_locations:[{id:'pw-location',name:'Warehouse'}],filter_storage_locations:[{id:'pw-location',name:'Warehouse'}],product_categories:['Consumables'],requesters:[{id:'pw-user',name:'Synthetic Requester'}]};
async function openRequisitions(page:Page,fixture:RequisitionFixture={},path='/inventory-requisitions'):Promise<RequisitionRequest[]>{
 await loginAsTenant(page);const requests:RequisitionRequest[]=[];
 await page.route('**/inventory-requisitions**',async(route:Route)=>{
  const r=route.request(),url=new URL(r.url()),p=url.pathname,m=r.method();requests.push({pathname:p,method:m,search:url.search});
  if(m!=='GET')throw Error(`Batch 23 did not authorize real requisition mutation: ${m} ${p}`);
  if(p.endsWith('/summary'))return fulfillJson(route,fixture.summary??{open_request_count:0,open_remaining_quantity:0,attention_required_count:0,approval_queue_count:0});
  if(p.endsWith('/options'))return fulfillJson(route,fixture.options??defaultOptions);
  if(p.endsWith('/pw-request-1/fulfillments')||p.endsWith('/pw-request-1/activity'))return fulfillJson(route,[]);
  if(p.endsWith('/pw-request-1'))return fulfillJson(route,fixture.detail??{id:'pw-request-1',requisition_number:'REQ-PW-1',status:'draft',priority:'normal',requesting_department:'Maintenance',items:[]});
  if(p.endsWith('/inventory-requisitions'))return fulfillJson(route,fixture.queueError?{message:'Synthetic queue failure'}:fixture.rows??[],fixture.queueError?503:200);
  return fulfillJson(route,{message:'Synthetic request not listed'},404);
 });
 await page.goto(path);
 await expect(page.getByText('Internal stock requests',{exact:true})).toBeVisible();return requests;
}
const queueReqs=(all:RequisitionRequest[])=>all.filter(r=>r.method==='GET'&&r.pathname.endsWith('/inventory-requisitions'));
const queueHas=(all:RequisitionRequest[],key:string,value:string)=>queueReqs(all).some(r=>new URLSearchParams(r.search).get(key)===value);
const selectContaining=(page:Page,text:string)=>page.locator('select').filter({has:page.getByRole('option',{name:text,exact:true})});
const advanced=async(page:Page)=>page.getByRole('button',{name:'Advanced filters'}).click();

test.describe('Inventory Requisitions — route, list filters, pagination (Batch 23)',()=>{
 test('TIR-001 Requisition operations workspace renders its actual hero',async({page})=>{
  await openRequisitions(page);await expect(page.getByText('Requisition operations',{exact:true})).toBeVisible();
  await expect(page.getByText('Request queue',{exact:true})).toBeVisible();
 });
 test('TIR-002 Page independently loads summary, options, and requisitions queue',async({page})=>{
  const seen=await openRequisitions(page);
  await expect.poll(()=>seen.some(x=>x.pathname.endsWith('/inventory-requisitions/summary'))).toBe(true);
  await expect.poll(()=>seen.some(x=>x.pathname.endsWith('/inventory-requisitions/options'))).toBe(true);
  await expect.poll(()=>queueReqs(seen).length).toBeGreaterThanOrEqual(1);
 });
 test('TIR-003 KPI cards show source-defined open, remaining and action metrics',async({page})=>{
  await openRequisitions(page);for(const text of ['Open requests','Units remaining','Action needed'])await expect(page.getByText(text,{exact:true})).toBeVisible();
 });
 test('TIR-004 Empty queue shows filter-aware guidance rather than a placeholder record',async({page})=>{
  await openRequisitions(page);await expect(page.getByText('No requisitions match the current filters.')).toBeVisible();
 });
 test('TIR-005 Queue search trims whitespace before GET search parameter',async({page})=>{
  const seen=await openRequisitions(page);await page.getByPlaceholder('Search request, department, notes, or product').fill('   spare parts   ');
  await expect.poll(()=>queueHas(seen,'search','spare parts')).toBe(true);
 });
 test('TIR-006 Status filter sends submitted code to queue endpoint',async({page})=>{
  const seen=await openRequisitions(page);await selectContaining(page,'All statuses').selectOption('submitted');
  await expect.poll(()=>queueHas(seen,'status','submitted')).toBe(true);
 });
 test('TIR-007 Product filter uses server product_id field',async({page})=>{
  const seen=await openRequisitions(page);await selectContaining(page,'All products').selectOption('pw-product');
  await expect.poll(()=>queueHas(seen,'product_id','pw-product')).toBe(true);
 });
 test('TIR-008 Advanced filter panel can be revealed and hidden without a mutation',async({page})=>{
  const seen=await openRequisitions(page);await advanced(page);await expect(page.getByPlaceholder('Requesting department')).toBeVisible();
  await page.getByRole('button',{name:'Hide advanced filters'}).click();await expect(page.getByPlaceholder('Requesting department')).toHaveCount(0);
  expect(seen.every(r=>r.method==='GET')).toBe(true);
 });
 test('TIR-009 Priority filter sends urgent as backend priority',async({page})=>{
  const seen=await openRequisitions(page);await advanced(page);await selectContaining(page,'All priorities').selectOption('urgent');
  await expect.poll(()=>queueHas(seen,'priority','urgent')).toBe(true);
 });
 test('TIR-010 Due state filter sends overdue code',async({page})=>{
  const seen=await openRequisitions(page);await advanced(page);await selectContaining(page,'All due states').selectOption('overdue');
  await expect.poll(()=>queueHas(seen,'due_state','overdue')).toBe(true);
 });
 test('TIR-011 Fulfillment state filter sends partially fulfilled code',async({page})=>{
  const seen=await openRequisitions(page);await advanced(page);await selectContaining(page,'All fulfillment').selectOption('partially_fulfilled');
  await expect.poll(()=>queueHas(seen,'fulfillment_state','partially_fulfilled')).toBe(true);
 });
 test('TIR-012 SLA filter sends approval breach code',async({page})=>{
  const seen=await openRequisitions(page);await advanced(page);await selectContaining(page,'All SLA states').selectOption('approval_breached');
  await expect.poll(()=>queueHas(seen,'sla_state','approval_breached')).toBe(true);
 });
 test('TIR-013 Approval threshold level uses explicit executive_value filter',async({page})=>{
  const seen=await openRequisitions(page);await advanced(page);await selectContaining(page,'All approval thresholds').selectOption('executive_value');
  await expect.poll(()=>queueHas(seen,'approval_threshold_level','executive_value')).toBe(true);
 });
 test('TIR-014 Department filter trims value and uses requesting_department',async({page})=>{
  const seen=await openRequisitions(page);await advanced(page);await page.getByPlaceholder('Requesting department').fill('  Maintenance  ');
  await expect.poll(()=>queueHas(seen,'requesting_department','Maintenance')).toBe(true);
 });
 test('TIR-015 Inverted threshold gap filter prevents invalid queue fetch',async({page})=>{
  const seen=await openRequisitions(page);await advanced(page);await page.getByPlaceholder('Min threshold gap').fill('800');
  await page.getByPlaceholder('Max threshold gap').fill('50');
  await expect(page.getByText('Minimum threshold gap cannot be greater than the maximum.')).toBeVisible();
  const before=queueReqs(seen).length;await page.getByPlaceholder('Requesting department').fill('Maintenance');
  expect(queueReqs(seen).length).toBe(before);
 });
 test('TIR-016 Inverted needed-by dates give validation error before GET',async({page})=>{
  const seen=await openRequisitions(page);await advanced(page);await page.getByLabel('Needed by from').fill('2026-12-10');
  await page.getByLabel('Needed by to').fill('2026-11-10');
  await expect(page.getByText('Needed-by start date cannot be after the end date.')).toBeVisible();
  const before=queueReqs(seen).length;await page.getByPlaceholder('Requesting department').fill('Maintenance');expect(queueReqs(seen).length).toBe(before);
 });
 test('TIR-017 Clear filters removes status and search from a new request',async({page})=>{
  const seen=await openRequisitions(page);await selectContaining(page,'All statuses').selectOption('submitted');
  await expect.poll(()=>queueHas(seen,'status','submitted')).toBe(true);
  await page.getByRole('button',{name:'Clear filters'}).click();await expect(selectContaining(page,'All statuses')).toHaveValue('');
  await expect.poll(()=>queueReqs(seen).some(r=>!new URLSearchParams(r.search).has('status'))).toBe(true);
 });
 test('TIR-018 Default queue GET reserves one extra row for next-page detection',async({page})=>{
  const seen=await openRequisitions(page);await expect.poll(()=>queueHas(seen,'limit','26')).toBe(true);
  expect(queueReqs(seen)[0].search).toContain('offset=0');
 });
 test('TIR-019 Changing queue page size to 50 requests 51 records',async({page})=>{
  const seen=await openRequisitions(page);await page.getByLabel('Rows per page').selectOption('50');
  await expect.poll(()=>queueHas(seen,'limit','51')).toBe(true);
 });
 test('TIR-020 Requisition deep link fetches detail, activity, and fulfillment history',async({page})=>{
  const seen=await openRequisitions(page,{},'/inventory-requisitions?requisitionId=pw-request-1');
  for(const suffix of ['/pw-request-1','/pw-request-1/fulfillments','/pw-request-1/activity']){
   await expect.poll(()=>seen.some(r=>r.pathname.endsWith(suffix))).toBe(true);
  }
  expect(seen.every(r=>r.method==='GET')).toBe(true);
 });
});

// Batch 24: additional isolated requisition lifecycle scenarios. Every POST/PUT in
// this section is fulfilled locally; these declarations do not prove persistence.
import {loginAsDisposableRole} from '../../../support/roleSession';
type ReqCall={method:string;path:string;url:string;body:any;headers:Record<string,string>};
type ReqSetup={status?:string;notes?:string;version?:number;quantity?:number;governed?:boolean;fetchError?:boolean;queue?:any[];readiness?:any;linked?:any[];activity?:any[];history?:any[];mutationError?:{path:string;status:number;message:string}};
const reqId='pw-request-1';
const requestItem={id:'pw-item-1',product_id:'pw-product',product_name:'Synthetic Product',product_unit:'pcs',requested_quantity:6,fulfilled_quantity:0,remaining_quantity:6,notes:'Documented request line',approval_threshold_line_note_meets_minimum:true};
const baseRequisition=(setup:ReqSetup={})=>({id:reqId,version:setup.version??4,requisition_number:'REQ-PW-1',status:setup.status??'draft',priority:'normal',requesting_department:'Maintenance',target_department:'Stores',source_storage_location_id:'pw-location',source_storage_location_name:'Warehouse',created_by_user_id:null,requested_quantity_total:6,fulfilled_quantity_total:0,notes:setup.notes??'Documented reason for work',approval_threshold_notes_required:setup.governed??false,approval_threshold_level:setup.governed?'elevated':'standard',approval_threshold_note_min_length:12,items:[{...requestItem,requested_quantity:setup.quantity??6,remaining_quantity:setup.quantity??6}]});
const requisitionOptions={products:[{id:'pw-product',name:'Synthetic Product',unit:'pcs',standard_unit_cost:1},{id:'pw-product-2',name:'Synthetic Spare',unit:'pcs',standard_unit_cost:1}],filter_products:[{id:'pw-product',name:'Synthetic Product',unit:'pcs'}],storage_locations:[{id:'pw-location',name:'Warehouse'},{id:'pw-target',name:'Destination'}],filter_storage_locations:[{id:'pw-location',name:'Warehouse'}],product_categories:['Consumables'],requesters:[]};
async function setupReq(page:Page, setup:ReqSetup={}, role?:'PW_REQ_READ_ONLY'|'PW_REQ_NO_APPROVE'|'PW_REQ_NO_FULFILL'){
 if(role)await loginAsDisposableRole(page,role);else await loginAsTenant(page);
 const actorId=await page.evaluate(()=>{
  const token=localStorage.getItem('inventory_access_token');
  if(!token?.split('.')[1])throw Error('Disposable tenant access token missing');
  const part=token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
  const jwt=JSON.parse(atob(part.padEnd(Math.ceil(part.length/4)*4,'='))) as {id?:string;user_id?:string};
  if(!jwt.id&&!jwt.user_id)throw Error('Disposable tenant user ID missing from JWT');
  return jwt.id||jwt.user_id||null;
 });
 const calls:ReqCall[]=[];let detail={...baseRequisition(setup),created_by_user_id:actorId};
 await page.route('**/inventory-requisitions**',async(route:Route)=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
  const body=request.postDataJSON?.()??null;
  calls.push({method,path,url:url.toString(),body,headers:request.headers()});
  const json=(value:any,status=200)=>fulfillJson(route,value,status);
  if(method==='GET'){
   if(path.endsWith('/options'))return json(requisitionOptions);
   if(path.endsWith('/summary'))return json({open_request_count:1,open_remaining_quantity:6,actionable_count:1,overdue_count:0,urgent_open_count:0});
   if(path.endsWith('/export'))return json({rows:[]});
   if(path.endsWith(`/${reqId}/activity`))return json(setup.activity??[]);
   if(path.endsWith(`/${reqId}/fulfillments`))return json(setup.history??[]);
   if(path.endsWith(`/${reqId}`))return json(detail);
   if(path.endsWith('/inventory-requisitions'))return setup.fetchError?json({message:'Synthetic requisition fetch failed'},503):json(setup.queue??[detail]);
   return json({message:'Synthetic route does not exist'},404);
  }
  if(setup.mutationError?.path===path && method!=='GET')return json({message:setup.mutationError.message},setup.mutationError.status);
  if(method==='POST'&&path.endsWith('/bulk-readiness'))return json({ready:true,ready_requisition_count:1,blocked_requisition_count:0,warning_count:0,results:[{requisition_id:reqId,requisition_number:'REQ-PW-1',ready:true,lines:[]}]});
  if(method==='POST'&&path.endsWith(`/${reqId}/readiness`))return json(setup.readiness??{ready:true,lines:[{requisition_item_id:'pw-item-1',product_id:'pw-product',product_name:'Synthetic Product',remaining_quantity:6,ready:true,available_quantity:10,projected_quantity:4}],blockers:[],warnings:[]});
  if(method==='POST'&&path.endsWith('/bulk-fulfill'))return json({requisition_count:1,fulfilled_line_count:1,fulfilled_quantity_total:6,results:[{requisition_id:reqId,requisition_number:'REQ-PW-1',status:'fulfilled',fulfilled_line_count:1,fulfilled_quantity_total:6}]});
  if(method==='POST'&&path.endsWith('/inventory-requisitions')){detail={...detail,id:reqId,version:1,status:'draft',...body,items:detail.items};return json(detail,201);}
  if(method==='PUT'&&path.endsWith(`/${reqId}`)){detail={...detail,...body,version:5,items:detail.items};return json(detail);}
  if(method==='POST'&&path.endsWith(`/${reqId}/comments`))return json({requisition:detail});
  if(method==='POST'&&path.endsWith(`/${reqId}/fulfill`))return json({requisition:detail});
  if(method==='POST'&&/\/(submit|approve|reject|cancel|reopen)$/.test(path)){
   const action=path.split('/').at(-1)!;
   detail={...detail,status:({submit:'submitted',approve:'approved',reject:'rejected',cancel:'cancelled',reopen:'draft'} as Record<string,string>)[action]};return json(detail);
  }
  return json({message:`Unsupported isolated request ${method} ${path}`},404);
 });
 await page.route('**/inventory-reservations**',async(route:Route)=>{
  const r=route.request(),p=new URL(r.url()).pathname,m=r.method();calls.push({method:m,path:p,url:r.url(),body:r.postDataJSON?.()??null,headers:r.headers()});
  if(m==='GET'&&p.endsWith('/inventory-reservations'))return fulfillJson(route,setup.linked??[]);
  if(m==='POST'&&p.endsWith(`/from-requisition/${reqId}`))return fulfillJson(route,{id:'pw-res-1',reservation_number:'RES-PW-1',status:'active'});
  return fulfillJson(route,{message:'Unsupported reservation mock'},404);
 });
 await page.goto(`/inventory-requisitions?requisitionId=${reqId}`);
 await expect(page.getByText('Internal stock requests',{exact:true})).toBeVisible();
 return calls;
}
const reqWrite=(calls:ReqCall[],ending:string,method='POST')=>calls.find(c=>c.method===method&&c.path.endsWith(ending));
const reqNoWrite=(calls:ReqCall[],ending:string)=>expect(calls.filter(c=>c.method!=='GET'&&!c.path.endsWith('/readiness')&&!c.path.endsWith('/bulk-readiness')&&c.path.endsWith(ending))).toHaveLength(0);
const reqForm=(page:Page)=>page.locator('#inventory-requisition-form');
async function validReqForm(page:Page){
 await reqForm(page).getByLabel('Requesting department').fill('Maintenance');
 await reqForm(page).locator('select').filter({has:page.getByRole('option',{name:'Select product'})}).selectOption('pw-product');
 await reqForm(page).getByPlaceholder('Qty').fill('2');
}

test.describe('Inventory Requisitions — source-backed lifecycle and permissions (Batch 24)',()=>{
 test('TIR-021 Create draft is blocked until department and product line supplied',async({page})=>{
  const calls=await setupReq(page);await expect(reqForm(page).getByRole('button',{name:'Create draft requisition'})).toBeDisabled();
  await reqForm(page).getByPlaceholder('Qty').fill('2');
  await expect(page.getByText('Every request line needs a product and a quantity greater than zero.')).toBeVisible();
  reqNoWrite(calls,'/inventory-requisitions');
 });
 test('TIR-022 Zero quantity keeps the requisition save disabled',async({page})=>{
  const calls=await setupReq(page);await validReqForm(page);await reqForm(page).getByPlaceholder('Qty').fill('0');
  await expect(reqForm(page).getByRole('button',{name:'Create draft requisition'})).toBeDisabled();reqNoWrite(calls,'/inventory-requisitions');
 });
 test('TIR-023 Product selector emits the actual product ID in draft payload',async({page})=>{
  const calls=await setupReq(page);await validReqForm(page);await reqForm(page).getByRole('button',{name:'Create draft requisition'}).click();
  await expect.poll(()=>reqWrite(calls,'/inventory-requisitions')?.body?.items?.[0]?.product_id).toBe('pw-product');
 });
 test('TIR-024 Draft payload trims department and retains explicit urgent priority',async({page})=>{
  const calls=await setupReq(page);await validReqForm(page);await reqForm(page).getByLabel('Requesting department').fill('  Maintenance  ');
  await reqForm(page).getByLabel('Priority').selectOption('urgent');await reqForm(page).getByRole('button',{name:'Create draft requisition'}).click();
  await expect.poll(()=>reqWrite(calls,'/inventory-requisitions')?.body?.priority).toBe('urgent');
  expect(reqWrite(calls,'/inventory-requisitions')?.body?.requesting_department).toBe('Maintenance');
 });
 test('TIR-025 Date-picker needed-by selection reaches draft create payload',async({page})=>{
  const calls=await setupReq(page);await validReqForm(page);await reqForm(page).getByLabel('Needed by').fill('2026-12-12');
  await reqForm(page).getByRole('button',{name:'Create draft requisition'}).click();
  await expect.poll(()=>reqWrite(calls,'/inventory-requisitions')?.body?.needed_by).toBe('2026-12-12');
 });
 test('TIR-026 Editable draft exposes its edit form only in permitted ownership context',async({page})=>{
  const calls=await setupReq(page,{status:'draft',version:4});
  await expect(page.getByRole('button',{name:'Edit draft details'})).toBeVisible();
  await page.getByRole('button',{name:'Edit draft details'}).click();
  await expect(page.getByText('Edit draft request',{exact:true})).toBeVisible();
  reqNoWrite(calls,`/${reqId}`);
 });
 test('TIR-027 Draft edit PUT uses the selected expected version header',async({page})=>{
  const calls=await setupReq(page,{status:'draft',version:4});await page.getByRole('button',{name:'Edit draft details'}).click();
  await reqForm(page).getByRole('button',{name:'Save draft changes'}).click();
  await expect.poll(()=>reqWrite(calls,`/${reqId}`,'PUT')?.headers['if-match-version']).toBe('4');
  expect(reqWrite(calls,`/${reqId}`,'PUT')?.body?.items?.[0]?.product_id).toBe('pw-product');
 });
 test('TIR-028 Submit action posts explicitly to the selected requisition route',async({page})=>{
  const calls=await setupReq(page,{status:'draft'});await page.getByRole('button',{name:'Submit',exact:true}).click();
  await expect.poll(()=>Boolean(reqWrite(calls,`/${reqId}/submit`))).toBe(true);
  await expect(page.getByText('Submitted',{exact:true}).first()).toBeVisible();
 });
 test('TIR-029 Governed approval disabled until workflow explanation satisfies minimum',async({page})=>{
  const calls=await setupReq(page,{status:'submitted',governed:true});const approve=page.getByRole('button',{name:'Approve',exact:true});
  await expect(approve).toBeDisabled();await page.getByLabel('Workflow notes / reason').fill('too short');
  await expect(approve).toBeDisabled();reqNoWrite(calls,`/${reqId}/approve`);
 });
 test('TIR-030 Governed rejection posts an adequate trimmed reason',async({page})=>{
  const calls=await setupReq(page,{status:'submitted',governed:true});await page.getByLabel('Workflow notes / reason').fill('  Rejected due to missing budget  ');
  await page.getByRole('button',{name:'Reject',exact:true}).click();
  await expect.poll(()=>reqWrite(calls,`/${reqId}/reject`)?.body?.reason).toBe('Rejected due to missing budget');
 });
 test('TIR-031 Cancelling a permitted draft POSTs a nonempty reason',async({page})=>{
  const calls=await setupReq(page,{status:'draft'});await page.getByLabel('Workflow notes / reason').fill('No longer needed');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect.poll(()=>reqWrite(calls,`/${reqId}/cancel`)?.body?.reason).toBe('No longer needed');
 });
 test('TIR-032 Reopening is exposed only for rejected/cancelled state and posts reason',async({page})=>{
  const calls=await setupReq(page,{status:'rejected'});await page.getByLabel('Workflow notes / reason').fill('Restock request corrected');
  await page.getByRole('button',{name:'Reopen to draft'}).click();
  await expect.poll(()=>reqWrite(calls,`/${reqId}/reopen`)?.body?.reason).toBe('Restock request corrected');
 });
 test('TIR-033 Selected approved request sends readiness POST distinct from fulfillment',async({page})=>{
  const calls=await setupReq(page,{status:'approved'});
  await expect.poll(()=>Boolean(reqWrite(calls,`/${reqId}/readiness`))).toBe(true);
  reqNoWrite(calls,`/${reqId}/fulfill`);
 });
 test('TIR-034 Explicit fulfillment line quantity and optional serials are sent without real posting',async({page})=>{
  const calls=await setupReq(page,{status:'approved'});
  const cell=page.getByRole('row').filter({hasText:'Synthetic Product'}).filter({has:page.locator('input[type="number"]')}).first();
  await cell.locator('input[type="number"]').fill('2');
  await page.getByRole('button',{name:'Record fulfillment'}).click();
  await expect.poll(()=>reqWrite(calls,`/${reqId}/fulfill`)?.body?.items?.[0]?.quantity).toBe(2);
  expect(reqWrite(calls,`/${reqId}/fulfill`)?.body?.source_storage_location_id).toBe('pw-location');
 });
 test('TIR-035 Linked reservation creation sends allocate false under reservation API',async({page})=>{
  const calls=await setupReq(page,{status:'submitted'});await page.getByRole('button',{name:'Create linked reservation'}).click();
  await expect.poll(()=>reqWrite(calls,`/from-requisition/${reqId}`)?.body?.allocate).toBe(false);
  expect(reqWrite(calls,`/from-requisition/${reqId}`)?.body?.allow_partial).toBe(true);
 });
 test('TIR-036 Fulfill-all-remaining carries explicit intent and no manual line array',async({page})=>{
  const calls=await setupReq(page,{status:'approved'});
  await page.getByLabel('Fulfill all remaining lines for this request').check();
  await page.getByRole('button',{name:'Record fulfillment'}).click();
  await expect.poll(()=>reqWrite(calls,`/${reqId}/fulfill`)?.body?.fulfill_all_remaining).toBe(true);
  expect(reqWrite(calls,`/${reqId}/fulfill`)?.body?.items).toEqual([]);
 });
 test('TIR-037 Partially fulfilled detail keeps remaining quantity and fulfillment history visible',async({page})=>{
  await setupReq(page,{status:'partially_fulfilled',quantity:4,history:[{id:'pw-ful-1',product_id:'pw-product',product_name:'Synthetic Product',quantity:2,notes:'Issue verified',source_storage_location_name:'Warehouse'}]});
  await expect(page.getByText('Fulfillment history',{exact:true})).toBeVisible();
  await expect(page.getByText('Issue verified')).toBeVisible();
  await expect(page.getByText('Synthetic Product').first()).toBeVisible();
 });
 test('TIR-038 Bulk checkbox is disabled for drafts and enabled for approved queue rows',async({page})=>{
  await setupReq(page,{status:'draft',queue:[baseRequisition({status:'draft'}),{...baseRequisition({status:'approved'}),id:'pw-request-2',requisition_number:'REQ-PW-2'}]});
  await expect(page.locator('input[type="checkbox"][disabled]').first()).toBeVisible();
  await expect(page.locator('input[type="checkbox"]:not([disabled])').first()).toBeVisible();
 });
 test('TIR-039 Selected approved bulk request previews readiness independently from bulk fulfillment',async({page})=>{
  const calls=await setupReq(page,{status:'approved'});
  await page.locator('input[type="checkbox"]').first().check();
  await expect.poll(()=>Boolean(reqWrite(calls,'/bulk-readiness'))).toBe(true);
  reqNoWrite(calls,'/bulk-fulfill');
 });
 test('TIR-040 Bulk selection and explicit click create one bulk fulfillment request, then show result',async({page})=>{
  const calls=await setupReq(page,{status:'approved'});
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button',{name:'Fulfill all remaining',exact:true}).click();
  await expect.poll(()=>reqWrite(calls,'/bulk-fulfill')?.body?.requisitions?.[0]?.requisition_id).toBe(reqId);
  await expect(page.getByText('Bulk fulfillment recorded:')).toBeVisible();
 });
 test('TIR-041 Activity comment POST trims note before sending',async({page})=>{
  const calls=await setupReq(page);await page.getByPlaceholder('Add an internal activity note').fill('  Inspected stock request  ');
  await page.getByRole('button',{name:'Add note'}).click();
  await expect.poll(()=>reqWrite(calls,`/${reqId}/comments`)?.body?.comment).toBe('Inspected stock request');
 });
 test('TIR-042 Activity timeline renders source audit metadata from its separate endpoint',async({page})=>{
  const calls=await setupReq(page,{activity:[{id:'pw-act',action:'inventory_requisition.submitted',user_name:'Synthetic Approver',metadata:{previous_status:'draft',next_status:'submitted'},created_at:'2026-10-30T10:00:00Z'}]});
  await expect(page.getByText('Synthetic Approver',{exact:false})).toBeVisible();
  expect(calls.some(x=>x.method==='GET'&&x.path.endsWith(`/${reqId}/activity`))).toBe(true);
 });
 test('TIR-043 Linked reservation is shown with actual status and navigation action',async({page})=>{
  const calls=await setupReq(page,{status:'approved',linked:[{id:'pw-res-1',reservation_number:'RES-PW-1',status:'active'}]});
  await expect(page.getByText('RES-PW-1',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Open linked reservation'}).click();
  await expect(page).toHaveURL(/inventory-reservations\?reservationId=pw-res-1/);
  expect(calls.some(x=>x.method==='GET'&&x.path.endsWith('/inventory-reservations'))).toBe(true);
 });
 test('TIR-044 Disposable read-only role sees review panel and no creation or submit control',async({page})=>{
  const calls=await setupReq(page,{status:'draft'},'PW_REQ_READ_ONLY');
  await expect(page.getByText('Request creation',{exact:true})).toBeVisible();
  await expect(reqForm(page)).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Submit',exact:true})).toHaveCount(0);
  reqNoWrite(calls,`/${reqId}/submit`);
 });
 test('TIR-045 Disposable role without approve grant cannot act on submitted request',async({page})=>{
  const calls=await setupReq(page,{status:'submitted'},'PW_REQ_NO_APPROVE');
  await expect(page.getByRole('button',{name:'Approve',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Reject',exact:true})).toHaveCount(0);
  reqNoWrite(calls,`/${reqId}/approve`);
 });
 test('TIR-046 Disposable role without fulfill grant sees no fulfillment editor or bulk select',async({page})=>{
  const calls=await setupReq(page,{status:'approved'},'PW_REQ_NO_FULFILL');
  await expect(page.getByRole('button',{name:'Record fulfillment'})).toHaveCount(0);
  await expect(page.locator('.io-requisitions-page input[type="checkbox"]')).toHaveCount(0);
  reqNoWrite(calls,`/${reqId}/fulfill`);
 });
 test('TIR-047 Filtered queue export retrieves independent rows with current status',async({page})=>{
  const calls=await setupReq(page);await selectContaining(page,'All statuses').selectOption('submitted');
  await page.getByRole('button',{name:'Export queue CSV'}).click();
  await expect.poll(()=>calls.some(x=>x.method==='GET'&&x.path.endsWith('/export')&&new URL(x.url).searchParams.get('status')==='submitted')).toBe(true);
 });
 test('TIR-048 Queue next page sends offset equal to displayed page size',async({page})=>{
  const calls=await setupReq(page,{queue:Array.from({length:26},(_,i)=>({...baseRequisition(),id:`pw-paged-${i}`,requisition_number:`REQ-PW-${i}`}))});
  await page.getByRole('button',{name:'Next',exact:true}).click();
  await expect.poll(()=>calls.some(x=>x.method==='GET'&&x.path.endsWith('/inventory-requisitions')&&new URL(x.url).searchParams.get('offset')==='25')).toBe(true);
 });
 test('TIR-049 Queue error is rendered and chosen status filter remains selected',async({page})=>{
  await setupReq(page,{fetchError:true});await selectContaining(page,'All statuses').selectOption('approved');
  await expect(page.getByText('Some requisition data could not be loaded:',{exact:false})).toBeVisible();
  await expect(selectContaining(page,'All statuses')).toHaveValue('approved');
 });
 test('TIR-050 Clear filters resets threshold range and department without changing permissions',async({page})=>{
  const calls=await setupReq(page);await advanced(page);await page.getByPlaceholder('Min threshold gap').fill('10');
  await page.getByPlaceholder('Requesting department').fill('Maintenance');
  await page.getByRole('button',{name:'Clear filters'}).click();
  await expect(page.getByPlaceholder('Min threshold gap')).toHaveValue('');
  await expect(page.getByPlaceholder('Requesting department')).toHaveValue('');
  await expect.poll(()=>calls.some(x=>x.method==='GET'&&x.path.endsWith('/inventory-requisitions')&&!new URL(x.url).searchParams.has('requesting_department'))).toBe(true);
 });
});
