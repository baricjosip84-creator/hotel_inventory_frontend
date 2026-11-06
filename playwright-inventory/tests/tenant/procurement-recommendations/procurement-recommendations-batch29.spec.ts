import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 29: browser-only synthetic contracts. Every procurement API request is
// intercepted; these tests DO NOT prove DB writes, permissions, or deliveries.
const id = 'pw-proc-prod';
const supplier = { id: 'pw-proc-supplier', name: 'Synthetic Procurement Supplier' };
const row = { product_id:id, product_name:'Synthetic Lubricant', unit:'pcs', category:'Maintenance',
  current_quantity:2, min_stock:10, average_daily_usage:1, estimated_days_of_coverage:2,
  recommended_reorder_quantity:18, urgency:'critical', recommended_supplier_id:supplier.id,
  recommended_supplier_name:supplier.name, lead_time_days:5, lead_time_configured:true,
  estimated_unit_cost:4, estimated_total_cost:72, currency:'EUR', procurement_ready:true,
  budget_status:'within_budget', decision_status:'pending' };
const blocked = { ...row, product_id:'pw-proc-blocked', product_name:'Synthetic Blocked Product',
  recommended_supplier_id:null, recommended_supplier_name:null, procurement_ready:false,
  blocker_code:'MISSING_SUPPLIER', blocker_message:'Supplier must be assigned', urgency:'high' };
const approved = { ...row, product_id:'pw-proc-approved', product_name:'Synthetic Approved Product', decision_status:'approved' };
type Seen={method:string;path:string;url:string;body:any};
type Setup={ rows?:any[]; previewReady?:boolean; postFailure?:string; detailBlocked?:boolean;
  poDrafts?:any[]; poMore?:boolean; governanceMore?:boolean; exceptionCode?:string;
  scheduledFailure?:boolean; mixedCurrency?:boolean; exportMore?:boolean };
const when=(seen:Seen[],method:string,suffix:string)=>seen.filter(x=>x.method===method&&x.path.endsWith(suffix));
const count=(seen:Seen[],method:string,suffix:string)=>when(seen,method,suffix).length;
const base={generated_at:'2026-11-03T12:00:00Z',tenant_id:'pw-disposable'};
const pg=(rows:any[],u:URL,hasMore=false)=>({limit:Number(u.searchParams.get('limit')||50),offset:Number(u.searchParams.get('offset')||0),
  returned:rows.length,total:hasMore?100:rows.length,has_more:hasMore});
const fakeReview=(u:URL,setup:Setup)=>({ ...base,status:'ready',summary:{draft_count:(setup.poDrafts||[]).length,submitted_count:0,warning_count:0,estimated_total_cost:72},
 pagination:pg(setup.poDrafts||[],u,Boolean(setup.poMore)&&Number(u.searchParams.get('offset')||0)===0),rows:setup.poDrafts||[] });
function fakeDetail(item:any,setup:Setup){ return { ...base,lookback_days:30,row:{...item,
 detail:{can_enter_approval_review:!setup.detailBlocked,can_generate_po_draft:item.decision_status==='approved',
 current_conversion_open:Boolean(item.converted_purchase_order_id),blockers:setup.detailBlocked?[{code:'MISSING_SUPPLIER',message:'Supplier must be assigned'}]:[],
 warnings:[],reasoning:['Source evidence: synthetic usage and stock shortage'],readiness:setup.detailBlocked?'blocked':'ready'}} }; }
function fakeReadiness(setup:Setup,selected:string[]){const ready=setup.previewReady!==false;return {...base,status:'approved',lookback_days:30,
 summary:{requested_count:selected.length,ready_count:ready?selected.length:0,blocked_count:ready?0:selected.length,
 failed_count:0,warning_count:0,estimated_total_cost:72,budget_currency:'EUR',approval_ready:ready},
 results:selected.map(product_id=>({product_id,product_name:product_id===blocked.product_id?blocked.product_name:row.product_name,
 readiness:ready?'ready':'blocked',can_approve:ready,can_defer:true,can_reject:true,
 blockers:ready?[]:[{code:'MISSING_SUPPLIER',message:'Supplier missing in synthetic preview'}]}))};}
async function mount(page:Page,setup:Setup={},start='/procurement-recommendations',readonly=false){
 if(readonly)await loginAsDisposableRole(page,'PW_PO_READ_ONLY'); else await loginAsTenant(page);
 const seen:Seen[]=[];
 await page.route('**/reorder-insights/recommendations**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const u=new URL(req.url()),path=u.pathname,method=req.method();
  const body=method==='GET'?null:JSON.parse(req.postData()||'{}');seen.push({method,path,url:u.toString(),body});
  if(method==='POST'){
   if(setup.postFailure)return fulfillJson(route,{message:setup.postFailure},409);
   if(path.endsWith('/bulk-readiness'))return fulfillJson(route,fakeReadiness(setup,body.product_ids||[]));
   if(path.endsWith('/bulk-decision'))return fulfillJson(route,{...base,status:body.status,requested_count:body.product_ids.length,
    decided_count:body.product_ids.length,blocked_count:0,failed_count:0,results:body.product_ids.map((product_id:string)=>({product_id,status:'decided'}))});
   if(path.endsWith('/convert-to-po-drafts'))return fulfillJson(route,{...base,requested_count:body.product_ids.length,
    converted_count:body.product_ids.length,purchase_order_count:1,purchase_orders:[{purchase_order_id:'pw-po-draft',
    po_number:'PW-PO-29',supplier_id:supplier.id,supplier_name:supplier.name,status:'draft',item_count:body.product_ids.length,estimated_total_cost:72,currency:'EUR'}]});
   if(path.endsWith('/scheduled-run'))return fulfillJson(route,setup.scheduledFailure?{message:'Synthetic schedule validation failed'}:
    {...base,run_mode:body.dry_run?'dry_run':'approval_run',status:'completed',dry_run:body.dry_run,
     auto_approve_ready:body.auto_approve_ready,convert_to_po_drafts:body.convert_to_po_drafts,
     max_approvals:body.max_approvals,lookback_days:30,summary:{candidate_count:1,ready_count:1,blocked_count:0,
     approved_count:body.dry_run?0:1,po_draft_count:0,status:'complete'}},setup.scheduledFailure?422:200);
   if(path.endsWith('/exceptions/resolve'))return fulfillJson(route,{...base,action:body.action,product_id:body.product_id,
    cleared_exception_count:1,remaining_exception_count:0});
   if(path.endsWith('/decision'))return fulfillJson(route,fakeDetail({...row,decision_status:body.status},setup));
   throw Error('Unexpected procurement write: '+method+' '+path);
  }
  if(method!=='GET')throw Error('Unexpected procurement request: '+method+' '+path);
  const items=setup.rows??[row,blocked,approved];
  if(path.endsWith('/options'))return fulfillJson(route,{...base,suppliers:[supplier]});
  if(path.endsWith('/attention-summary'))return fulfillJson(route,{requires_attention:false,actionable_count:0,
   high_risk_pending_decision_count:0,approved_ready_po_draft_count:0,approved_recheck_count:0,attention_product_ids:[]});
  if(path.endsWith('/po-drafts'))return fulfillJson(route,fakeReview(u,setup));
  if(path.endsWith('/production-review'))return fulfillJson(route,{...base,production_status:'ready_for_controlled_use',
   safety_contract:{mode:'read_only_review',mutates_inventory:false,creates_purchase_orders:false,
    approves_recommendations:false,requires_human_approval_for_execution:true},
   readiness_buckets:{ready_for_approval:1,blocked:1,approved_not_converted:1,pending_review:1,high_priority:1,shortage_window:1},
   blockers:[],warnings:[],next_actions:['Review synthetic supplier evidence'],evidence_requirements:[],sample_rows:[]});
  if(path.endsWith('/execution-dashboard'))return fulfillJson(route,{...base,summary:{recommendation_count:3,ready_recommendation_count:2,
   blocked_recommendation_count:1,critical_count:1,high_count:1,high_risk_count:2,ready_high_risk_count:1,
   pending_high_risk_count:1,approved_count:1,converted_count:0,open_po_draft_count:0,
   po_draft_warning_count:0,estimated_recommendation_spend:72,open_po_draft_spend:0,
   shortages_preventable_count:1,projected_stockout_avoidance_count:0,pending_procurement_risk_count:1,execution_risk_score:18},
   supplier_execution:[],recommendation_aging:{buckets:{},oldest_decisions:[]},risk_highlights:[]});
  if(path.endsWith('/execution-history'))return fulfillJson(route,{...base,pagination:{...pg([],u,setup.governanceMore&&Number(u.searchParams.get('offset')||0)===0),
    decision_total:0,schedule_run_total:0},summary:{},decisions:[],schedule_runs:[],timeline:[]});
  if(path.endsWith('/outcomes'))return fulfillJson(route,{...base,pagination:pg([],u,setup.governanceMore&&Number(u.searchParams.get('offset')||0)===0),
   summary:{total:0,threshold_met_count:0,received_complete_count:0,rows_with_post_decision_alerts:0,by_status:{}},
   rows:[],safety_contract:{read_only:true,creates_purchase_orders:false,mutates_inventory:false,evaluates_recorded_outcomes_only:true}});
  if(path.endsWith('/exceptions')){const r=setup.exceptionCode?[{exception_key:'pw-ex',code:setup.exceptionCode,
    category:'supplier',severity:'high',message:'Synthetic exception',product_id:id,product_name:row.product_name,
    urgency:'high',decision_status:'pending',procurement_ready:false,
    resolution_hint:'Resolve synthetic exception',row:fakeDetail(row,setup).row}]:[];
    return fulfillJson(route,{...base,lookback_days:30,pagination:pg(r,u),summary:{total_exceptions:r.length,
     critical_count:0,high_count:r.length,medium_count:0,low_count:0,affected_product_count:r.length,affected_supplier_count:0},rows:r});}
  if(path.endsWith('/recommendations')){
   const offset=Number(u.searchParams.get('offset')||0);
   const rows=setup.exportMore&&Number(u.searchParams.get('limit'))===500?items:items;
   return fulfillJson(route,{...base,lookback_days:30,summary:{total_products:rows.length,recommended_count:rows.length,
    critical_count:1,blocked_count:1,estimated_total_cost:72,estimated_total_cost_by_currency:setup.mixedCurrency?
    [{currency_code:'EUR',amount:72},{currency_code:'USD',amount:35}]:undefined,mixed_currency:!!setup.mixedCurrency,currency:'EUR',budget_status:'within_budget'},
    pagination:pg(rows,u,setup.exportMore&&offset===0&&u.searchParams.get('limit')==='500'),rows});
  }
  const productMatch=path.match(/\/recommendations\/([^/]+)$/);
  if(productMatch){const chosen=items.find(x=>x.product_id===decodeURIComponent(productMatch[1]))||row;
    return fulfillJson(route,fakeDetail(chosen,setup));}
  throw Error('Unexpected procurement GET: '+path);
 });
 await page.goto(start);await expect(page.getByRole('heading',{name:'Procurement recommendations',exact:true})).toBeVisible();
 return seen;
}
const queue=(page:Page)=>page.locator('.procurement-recommendations-table');
const bulk=(page:Page)=>page.getByRole('heading',{name:'Bulk actions'}).locator('..').locator('..');
const writes=(s:Seen[])=>s.filter(x=>x.method==='POST');
async function select(page:Page,name='Synthetic Lubricant'){await queue(page).getByRole('checkbox',{name:`Select ${name}`}).check();}
async function governance(page:Page){await page.getByText('Advanced procurement controls',{exact:true}).click();
 await expect(page.getByRole('heading',{name:'Recommendation scheduling engine'})).toBeVisible();}
async function chooseDetail(page:Page){await queue(page).locator('tbody tr').filter({hasText:'Synthetic Lubricant'}).first().getByRole('button',{name:'Review'}).click();
 await expect(page.getByRole('heading',{name:'Recommendation detail'})).toBeVisible();}
const b=(page:Page,name:string)=>page.getByRole('button',{name,exact:true});

test.describe('Procurement Recommendations — governance and mutation boundary (Batch 29)',()=>{
 test('TPRC-021 Selecting one source row does not approve it',async({page})=>{
  const s=await mount(page);await select(page);await expect(b(page,'Clear')).toBeEnabled();expect(writes(s)).toHaveLength(0);
 });
 test('TPRC-022 Select page-ready excludes the blocked source row',async({page})=>{
  await mount(page);await b(page,'Select page-ready candidates').click();
  await expect(queue(page).getByRole('checkbox',{name:'Select Synthetic Lubricant'})).toBeChecked();
  await expect(queue(page).getByRole('checkbox',{name:'Select Synthetic Blocked Product'})).not.toBeChecked();
 });
 test('TPRC-023 Preview approval readiness posts selected IDs but no decision',async({page})=>{
  const s=await mount(page);await select(page);await b(page,'Preview approval readiness').click();
  await expect.poll(()=>count(s,'POST','/bulk-readiness')).toBe(1);
  expect(when(s,'POST','/bulk-readiness')[0].body).toEqual({product_ids:[id],status:'approved'});
  expect(count(s,'POST','/bulk-decision')).toBe(0);
 });
 test('TPRC-024 Bulk approval requires a separate explicit modal confirmation',async({page})=>{
  const s=await mount(page);await select(page);await b(page,'Preview approval readiness').click();
  await expect(b(page,'Bulk approve')).toBeEnabled();await b(page,'Bulk approve').click();
  await expect(page.getByRole('dialog')).toContainText('Approve 1 recommendation');
  expect(count(s,'POST','/bulk-decision')).toBe(0);await page.getByRole('dialog').getByRole('button',{name:'Bulk approve'}).click();
  await expect.poll(()=>count(s,'POST','/bulk-decision')).toBe(1);
 });
 test('TPRC-025 Failed readiness preview keeps approval disabled',async({page})=>{
  const s=await mount(page,{previewReady:false});await select(page);await b(page,'Preview approval readiness').click();
  await expect(page.getByText('Supplier missing in synthetic preview')).toBeVisible();
  await expect(b(page,'Bulk approve')).toBeDisabled();expect(count(s,'POST','/bulk-decision')).toBe(0);
 });
 test('TPRC-026 Bulk decision note is carried in the confirmed payload',async({page})=>{
  const s=await mount(page);await select(page);await page.getByLabel('Bulk decision note').fill('  Reviewed at synthetic site  ');
  await b(page,'Preview approval readiness').click();await b(page,'Bulk approve').click();
  await page.getByRole('dialog').getByRole('button',{name:'Bulk approve'}).click();
  await expect.poll(()=>count(s,'POST','/bulk-decision')).toBe(1);
  expect(when(s,'POST','/bulk-decision')[0].body.note).toBe('  Reviewed at synthetic site  ');
 });
 test('TPRC-027 Individual approval stays disabled when detail readiness is blocked',async({page})=>{
  const s=await mount(page,{detailBlocked:true});await chooseDetail(page);
  await expect(page.getByText('Supplier must be assigned').first()).toBeVisible();
  await expect(b(page,'Approve').first()).toBeDisabled();expect(writes(s)).toHaveLength(0);
 });
 test('TPRC-028 Rejection uses confirmation but defer is a direct decision',async({page})=>{
  const s=await mount(page);await chooseDetail(page);
  await b(page,'Reject').last().click();await expect(page.getByRole('dialog')).toContainText('Reject recommendation?');
  expect(count(s,'POST','/decision')).toBe(0);await page.getByRole('dialog').getByRole('button',{name:'Cancel'}).click();
  await b(page,'Defer').last().click();await expect.poll(()=>count(s,'POST','/decision')).toBe(1);
  expect(when(s,'POST','/decision')[0].body.status).toBe('deferred');
 });
 test('TPRC-029 Converted open PO detail disables decision note and defer',async({page})=>{
  await mount(page,{rows:[{...row,converted_purchase_order_id:'pw-existing-po',decision_status:'approved'}]});
  await chooseDetail(page);await expect(page.getByLabel('Decision note')).toBeDisabled();
  await expect(b(page,'Defer').last()).toBeDisabled();
 });
 test('TPRC-030 Failed bulk decision shows server error and no success count',async({page})=>{
  const s=await mount(page,{postFailure:'Synthetic stale decision'});await select(page);
  await b(page,'Bulk reject').click();await page.getByRole('dialog').getByRole('button',{name:'Bulk reject'}).click();
  await expect(page.getByText('Synthetic stale decision',{exact:false})).toBeVisible();
  expect(count(s,'POST','/bulk-decision')).toBe(1);
  await expect(page.getByText('Bulk decision complete:',{exact:false})).toHaveCount(0);
 });
 test('TPRC-031 PO draft conversion unavailable before approval',async({page})=>{
  const s=await mount(page);await select(page);
  await expect(b(page,'Create PO draft(s)')).toBeDisabled();
  expect(count(s,'POST','/convert-to-po-drafts')).toBe(0);
 });
 test('TPRC-032 Approved selection requires confirmation and preserves exact product ID',async({page})=>{
  const s=await mount(page,{rows:[approved]});await select(page,'Synthetic Approved Product');
  await b(page,'Create PO draft(s)').click();await expect(page.getByRole('dialog')).toContainText('Create purchase order draft(s)');
  expect(count(s,'POST','/convert-to-po-drafts')).toBe(0);
  await page.getByRole('dialog').getByRole('button',{name:'Create PO drafts'}).click();
  await expect.poll(()=>count(s,'POST','/convert-to-po-drafts')).toBe(1);
  expect(when(s,'POST','/convert-to-po-drafts')[0].body.product_ids).toEqual([approved.product_id]);
 });
 test('TPRC-033 Mixed currency breakdown shows separate currency evidence',async({page})=>{
  await mount(page,{mixedCurrency:true});
  await expect(page.getByText(/EUR/).first()).toBeVisible();
  await expect(page.getByText(/USD/).first()).toBeVisible();
 });
 test('TPRC-034 Conversion result presents a draft link rather than posting stock',async({page})=>{
  const s=await mount(page,{rows:[approved]});await select(page,'Synthetic Approved Product');
  await b(page,'Create PO draft(s)').click();await page.getByRole('dialog').getByRole('button',{name:'Create PO drafts'}).click();
  await expect(page.getByText('PW-PO-29')).toBeVisible();await expect(b(page,'Open draft')).toBeVisible();
  expect(count(s,'POST','/convert-to-po-drafts')).toBe(1);
 });
 test('TPRC-035 Draft review refresh refetches the source collection',async({page})=>{
  const s=await mount(page);await expect.poll(()=>count(s,'GET','/po-drafts')).toBeGreaterThan(0);
  const n=count(s,'GET','/po-drafts');await b(page,'Refresh drafts').click();
  await expect.poll(()=>count(s,'GET','/po-drafts')).toBeGreaterThan(n);
 });
 test('TPRC-036 Detail shows exact reasoning from backend evidence',async({page})=>{
  await mount(page);await chooseDetail(page);
  await expect(page.getByText('Source evidence: synthetic usage and stock shortage')).toBeVisible();
 });
 test('TPRC-037 Missing deep-linked product does not select another product silently',async({page})=>{
  await mount(page,{},'/procurement-recommendations?product_id=pw-not-in-queue');
  await expect(page.getByText('Synthetic Lubricant').first()).toBeVisible();
  await expect(page.getByText('Source evidence: synthetic usage and stock shortage')).toHaveCount(0);
  await b(page,'Show all recommendations').click();await expect(page).not.toHaveURL(/product_id=/);
 });
 test('TPRC-038 Role without PO approval cannot run bulk decisions',async({page})=>{
  await mount(page,{},'/procurement-recommendations',true);
  await expect(b(page,'Preview approval readiness')).toBeDisabled();
  await expect(b(page,'Bulk approve')).toBeDisabled();await expect(b(page,'Bulk reject')).toBeDisabled();
 });
 test('TPRC-039 Advanced procurement panel exposes read-only execution summary',async({page})=>{
  const s=await mount(page);await governance(page);
  await expect(page.getByRole('heading',{name:'Procurement execution dashboard'})).toBeVisible();
  expect(count(s,'POST','/scheduled-run')).toBe(0);
 });
 test('TPRC-040 Production review renders human approval safety contract',async({page})=>{
  await mount(page);await governance(page);
  await expect(page.getByRole('heading',{name:'Recommendation production review'})).toBeVisible();
  await expect(page.getByText('Mode:')).toBeVisible();
  await expect(page.getByText('Read-only production check',{exact:false})).toBeVisible();
 });
 test('TPRC-041 Scheduled execution remains unposted until modal confirmation',async({page})=>{
  const s=await mount(page);await governance(page);await b(page,'Execute scheduled run').click();
  await expect(page.getByRole('dialog')).toContainText('Execute scheduled procurement run?');
  expect(count(s,'POST','/scheduled-run')).toBe(0);
  await page.getByRole('dialog').getByRole('button',{name:'Cancel'}).click();
  expect(count(s,'POST','/scheduled-run')).toBe(0);
 });
 test('TPRC-042 Scheduled approval cap clamps to 100 and dry-run does not approve',async({page})=>{
  const s=await mount(page);await governance(page);await page.getByLabel('Max approvals').fill('150');
  await expect(page.getByLabel('Max approvals')).toHaveValue('100');await b(page,'Preview scheduled run').click();
  await expect.poll(()=>count(s,'POST','/scheduled-run')).toBe(1);
  expect(when(s,'POST','/scheduled-run')[0].body).toMatchObject({dry_run:true,auto_approve_ready:false,max_approvals:100});
 });
 test('TPRC-043 Execution history pagination retains 50-row limit and advances offset',async({page})=>{
  const s=await mount(page,{governanceMore:true});await governance(page);
  await expect.poll(()=>count(s,'GET','/execution-history')).toBeGreaterThan(0);
  const section=page.getByRole('heading',{name:'Procurement execution history'}).locator('..').locator('..');
  await section.getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>when(s,'GET','/execution-history').some(x=>new URL(x.url).searchParams.get('offset')==='50')).toBe(true);
 });
 test('TPRC-044 Recommendation outcome pagination does not mutate any decision',async({page})=>{
  const s=await mount(page,{governanceMore:true});await governance(page);
  const section=page.getByRole('heading',{name:'Recommendation outcomes'}).locator('..').locator('..');
  await section.getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>when(s,'GET','/outcomes').some(x=>new URL(x.url).searchParams.get('offset')==='50')).toBe(true);
  expect(writes(s)).toHaveLength(0);
 });
 test('TPRC-045 Missing-supplier exception requires supplier selection',async({page})=>{
  const s=await mount(page,{exceptionCode:'MISSING_SUPPLIER'});await governance(page);
  await expect(b(page,'Assign supplier')).toBeDisabled();
  expect(count(s,'POST','/exceptions/resolve')).toBe(0);
 });
 test('TPRC-046 Exception approval prompts before posting exact action',async({page})=>{
  const s=await mount(page,{exceptionCode:'HIGH_RISK_PENDING_DECISION'});await governance(page);
  await b(page,'Approve').last().click();await expect(page.getByRole('dialog')).toContainText('Approve recommendation?');
  expect(count(s,'POST','/exceptions/resolve')).toBe(0);
  await page.getByRole('dialog').getByRole('button',{name:'Approve'}).click();
  await expect.poll(()=>count(s,'POST','/exceptions/resolve')).toBe(1);
  expect(when(s,'POST','/exceptions/resolve')[0].body).toMatchObject({product_id:id,action:'approve'});
 });
 test('TPRC-047 Exception-resolution failure remains visible',async({page})=>{
  const s=await mount(page,{exceptionCode:'HIGH_RISK_PENDING_DECISION',postFailure:'Synthetic resolution conflict'});
  await governance(page);await b(page,'Re-run').click();
  await expect.poll(()=>count(s,'POST','/exceptions/resolve')).toBe(1);
  await expect(page.getByText('Synthetic resolution conflict',{exact:false})).toBeVisible();
 });
 test('TPRC-048 Filtered CSV export requests 500-row batches, not unrestricted writes',async({page})=>{
  const s=await mount(page);const download=page.waitForEvent('download');await b(page,'Export filtered CSV').click();await download;
  await expect.poll(()=>when(s,'GET','/recommendations').some(x=>new URL(x.url).searchParams.get('limit')==='500')).toBe(true);
  expect(writes(s)).toHaveLength(0);
 });
 test('TPRC-049 CSV export neutralizes spreadsheet formulas in product names',async({page})=>{
  const s=await mount(page,{rows:[{...row,product_name:'=CMD(1)'}]});
  const downloadPromise=page.waitForEvent('download');await b(page,'Export filtered CSV').click();
  const dl=await downloadPromise;const content=await (await import('node:fs/promises')).readFile(await dl.path(),'utf-8');
  expect(content).not.toMatch(/(?:^|,)"?=CMD\(1\)/m);expect(content).toContain('CMD(1)');expect(writes(s)).toHaveLength(0);
 });
 test('TPRC-050 Read-only role cannot schedule an approval run',async({page})=>{
  await mount(page,{},'/procurement-recommendations',true);await governance(page);
  await expect(b(page,'Execute scheduled run')).toBeDisabled();
  await expect(b(page,'Preview scheduled run')).toBeDisabled();
 });
});
