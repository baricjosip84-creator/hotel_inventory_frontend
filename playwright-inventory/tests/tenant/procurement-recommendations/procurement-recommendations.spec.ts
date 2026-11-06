import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 28: first source-backed Procurement Recommendations inventory.
// Only GET fixtures are served. No decision, approval, PO conversion, inventory
// action, scheduled run, or server authorization is exercised here.
type Seen={method:string;path:string;url:string};
type Setup={rows?:any[];failure?:boolean;more?:boolean;optionsFailure?:boolean};
const row={product_id:'pw-proc-prod',product_name:'Synthetic Lubricant',unit:'pcs',category:'Maintenance',
 current_quantity:2,min_stock:10,average_daily_usage:1,estimated_days_of_coverage:2,target_stock_quantity:20,
 recommended_reorder_quantity:18,urgency:'critical',recommended_supplier_id:'pw-proc-supplier',
 recommended_supplier_name:'Synthetic Procurement Supplier',supplier_selection_confidence:'high',
 lead_time_days:5,lead_time_configured:true,estimated_unit_cost:4,estimated_total_cost:72,currency:'EUR',
 budget_status:'within_budget',procurement_ready:true,decision_status:'pending'};
const supplier={id:'pw-proc-supplier',name:'Synthetic Procurement Supplier',email:'procurement@example.invalid'};
const sample=(rows:any[],more=false,offset=0)=>({generated_at:'2026-11-03T10:00:00Z',tenant_id:'pw-disposable',lookback_days:30,
 summary:{total_products:rows.length,recommended_count:rows.length,critical_count:rows.filter(x=>x.urgency==='critical').length,
  blocked_count:rows.filter(x=>!x.procurement_ready).length,estimated_total_cost:72,currency:'EUR',budget_status:'within_budget'},
 pagination:{limit:50,offset,returned:rows.length,total:more?rows.length+50:rows.length,has_more:more},rows});
async function mount(page:Page,setup:Setup={},url='/procurement-recommendations'){
 await loginAsTenant(page);const seen:Seen[]=[];
 await page.route('**/reorder-insights/recommendations**',async(route:Route)=>{
  if(route.request().isNavigationRequest())return route.continue();
  const req=route.request(),u=new URL(req.url()),path=u.pathname;
  seen.push({method:req.method(),path,url:u.toString()});
  if(req.method()!=='GET')throw Error('No live procurement mutation is allowed in this batch');
  if(path.endsWith('/options'))return fulfillJson(route,setup.optionsFailure?{message:'Supplier options unavailable'}:{generated_at:'2026-11-03T10:00:00Z',tenant_id:'pw-disposable',suppliers:[supplier]},setup.optionsFailure?503:200);
  if(path.endsWith('/attention-summary'))return fulfillJson(route,{requires_attention:false,actionable_count:0,high_risk_pending_decision_count:0,approved_ready_po_draft_count:0,approved_recheck_count:0,attention_product_ids:[]});
  if(path.endsWith('/po-drafts/review')||path.endsWith('/po-draft-review'))return fulfillJson(route,{generated_at:'2026-11-03T10:00:00Z',tenant_id:'pw-disposable',status:'ready',summary:{draft_count:0,submitted_count:0,warning_count:0,estimated_total_cost:0},pagination:{limit:25,offset:0,returned:0,total:0,has_more:false},rows:[]});
  if(path.endsWith('/recommendations')){
   const offset=Number(u.searchParams.get('offset')||0);
   return fulfillJson(route,setup.failure?{message:'Synthetic procurement queue failed'}:sample(setup.rows??[row],setup.more===true&&offset===0,offset),setup.failure?503:200);
  }
  // Read-only page auxiliary dashboards are kept synthetic; missing properties
  // should not be presented as evidence of production behavior.
  if(path.endsWith('/execution-history')||path.endsWith('/outcomes')||path.endsWith('/exceptions'))return fulfillJson(route,{generated_at:'2026-11-03T10:00:00Z',tenant_id:'pw-disposable',pagination:{limit:50,offset:0,returned:0,total:0,has_more:false},rows:[],summary:{},exceptions:[]});
  return fulfillJson(route,{generated_at:'2026-11-03T10:00:00Z',tenant_id:'pw-disposable',summary:{},rows:[],pagination:{limit:25,offset:0,returned:0,total:0,has_more:false}});
 });
 await page.goto(url);
 await expect(page.getByRole('heading',{name:'Procurement recommendations',exact:true})).toBeVisible();
 return seen;
}
const primary=(page:Page)=>page.locator('.procurement-recommendations-primary-filters');
const advanced=(page:Page)=>page.locator('details.procurement-recommendations-advanced-filters');
const queue=(page:Page)=>page.locator('.procurement-recommendations-table');
const mainGet=(seen:Seen[])=>seen.filter(x=>x.method==='GET'&&x.path.endsWith('/recommendations'));
const has=(seen:Seen[],key:string,value:string)=>mainGet(seen).some(x=>new URL(x.url).searchParams.get(key)===value);
async function revealAdvanced(page:Page){await advanced(page).locator('summary').click();}

test.describe('Procurement Recommendations — source-backed queue and filters (Batch 28)',()=>{
 test('TPRC-001 Procurement explanation distinguishes suggestions from automatic stock changes',async({page})=>{
  await mount(page);
  await expect(page.getByText('without changing stock directly.',{exact:false})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Recommendation queue'})).toBeVisible();
 });
 test('TPRC-002 Initial queue GET sends active only, 30-day lookback, 50 per page and offset zero',async({page})=>{
  const seen=await mount(page);
  await expect.poll(()=>mainGet(seen).length).toBeGreaterThan(0);
  const p=new URL(mainGet(seen)[0].url).searchParams;
  expect([p.get('active_only'),p.get('lookback_days'),p.get('limit'),p.get('offset')]).toEqual(['true','30','50','0']);
 });
 test('TPRC-003 Supplier options list comes from separate backend options GET',async({page})=>{
  const seen=await mount(page);
  await expect(primary(page).getByLabel('Supplier').locator('option',{hasText:'Synthetic Procurement Supplier'})).toHaveCount(1);
  expect(seen.some(x=>x.path.endsWith('/options'))).toBe(true);
 });
 test('TPRC-004 Empty recommendation queue displays no-match state and disabled export',async({page})=>{
  await mount(page,{rows:[]});
  await expect(queue(page).getByText('No procurement recommendations match the current filters.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Export filtered CSV'})).toBeDisabled();
 });
 test('TPRC-005 Failed recommendations GET displays server error instead of pretending empty success',async({page})=>{
  await mount(page,{failure:true});
  await expect(page.getByText('Synthetic procurement queue failed',{exact:false})).toBeVisible();
 });
 test('TPRC-006 Supplier-options failure is isolated from the queue response',async({page})=>{
  await mount(page,{optionsFailure:true});
  await expect(page.getByText('Supplier filters could not be loaded',{exact:false})).toBeVisible();
  await expect(queue(page)).toContainText('Synthetic Lubricant');
 });
 test('TPRC-007 Populated queue displays urgency, supplier, coverage and review action',async({page})=>{
  await mount(page);
  const r=queue(page).locator('tbody tr').first();
  await expect(r).toContainText('Synthetic Lubricant');await expect(r).toContainText('Critical');
  await expect(r).toContainText('Synthetic Procurement Supplier');
  await expect(r.getByRole('button',{name:'Review'})).toBeVisible();
 });
 test('TPRC-008 Urgency high sends urgency=high in source-backed recommendations query',async({page})=>{
  const seen=await mount(page);await primary(page).getByLabel('Urgency').selectOption('high');
  await expect.poll(()=>has(seen,'urgency','high')).toBe(true);
 });
 test('TPRC-009 Supplier filter passes exact selected supplier ID',async({page})=>{
  const seen=await mount(page);await primary(page).getByLabel('Supplier').selectOption(supplier.id);
  await expect.poll(()=>has(seen,'supplier_id','pw-proc-supplier')).toBe(true);
 });
 test('TPRC-010 Ready-for-review filter maps to procurement_ready=true',async({page})=>{
  const seen=await mount(page);await primary(page).getByLabel('Readiness').selectOption('true');
  await expect.poll(()=>has(seen,'procurement_ready','true')).toBe(true);
 });
 test('TPRC-011 Missing-supplier filter maps to procurement_ready=false',async({page})=>{
  const seen=await mount(page);await primary(page).getByLabel('Readiness').selectOption('false');
  await expect.poll(()=>has(seen,'procurement_ready','false')).toBe(true);
 });
 test('TPRC-012 Search trims user whitespace in submitted queue query',async({page})=>{
  const seen=await mount(page);await primary(page).getByPlaceholder('Product, supplier, SKU...').fill('  Synthetic Lubricant  ');
  await expect.poll(()=>has(seen,'search','Synthetic Lubricant')).toBe(true);
 });
 test('TPRC-013 Shortage window 7 sends shortage_window_days=7',async({page})=>{
  const seen=await mount(page);await revealAdvanced(page);await advanced(page).getByLabel('Shortage window').selectOption('7');
  await expect.poll(()=>has(seen,'shortage_window_days','7')).toBe(true);
 });
 test('TPRC-014 Budget limit is passed as an explicit numeric query filter',async({page})=>{
  const seen=await mount(page);await revealAdvanced(page);await advanced(page).getByLabel('Budget limit').fill('120.50');
  await expect.poll(()=>has(seen,'budget_limit','120.50')).toBe(true);
 });
 test('TPRC-015 Usage lookback 14 changes lookback_days for recommendation GET',async({page})=>{
  const seen=await mount(page);await revealAdvanced(page);await advanced(page).getByLabel('Usage lookback').fill('14');
  await expect.poll(()=>has(seen,'lookback_days','14')).toBe(true);
 });
 test('TPRC-016 Rows per page 25 updates limit query parameter',async({page})=>{
  const seen=await mount(page);await revealAdvanced(page);await advanced(page).getByLabel('Rows per page').selectOption('25');
  await expect.poll(()=>has(seen,'limit','25')).toBe(true);
 });
 test('TPRC-017 Next page reads offset=50, without requiring full scan',async({page})=>{
  const seen=await mount(page,{more:true});
  await page.getByRole('button',{name:'Next',exact:true}).first().click();
  await expect.poll(()=>has(seen,'offset','50')).toBe(true);
 });
 test('TPRC-018 Previous page resets recommendation offset to zero',async({page})=>{
  const seen=await mount(page,{more:true});
  await page.getByRole('button',{name:'Next',exact:true}).first().click();
  await expect.poll(()=>has(seen,'offset','50')).toBe(true);
  await page.getByRole('button',{name:'Previous',exact:true}).first().click();
  await expect.poll(()=>mainGet(seen).filter(x=>new URL(x.url).searchParams.get('offset')==='0').length).toBeGreaterThan(1);
 });
 test('TPRC-019 Reset restores default filters and clears prior selection',async({page})=>{
  const seen=await mount(page);await primary(page).getByLabel('Urgency').selectOption('critical');
  await page.getByRole('button',{name:'Reset',exact:true}).click();
  await expect(primary(page).getByLabel('Urgency')).toHaveValue('');
  await expect.poll(()=>mainGet(seen).filter(x=>!new URL(x.url).searchParams.has('urgency')).length).toBeGreaterThan(1);
 });
 test('TPRC-020 Product deep link scopes backend GET and Show all clears that route context',async({page})=>{
  const seen=await mount(page,{},'/procurement-recommendations?product_id=pw-proc-prod');
  await expect.poll(()=>has(seen,'product_id','pw-proc-prod')).toBe(true);
  await page.getByRole('button',{name:'Show all recommendations'}).click();
  await expect(page).not.toHaveURL(/product_id=/);
  await expect.poll(()=>mainGet(seen).some(x=>!new URL(x.url).searchParams.has('product_id'))).toBe(true);
 });
});
