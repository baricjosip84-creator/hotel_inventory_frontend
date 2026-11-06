import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 29: source-backed UI of ReplenishmentPlanningPage.tsx.
// All GETs and POSTs are synthetic; no inventory posting or PO creation occurs.
type Request={method:string;url:string;path:string;body:any};
type Setup={runs?:any[];listError?:boolean;detailError?:boolean;run?:any;items?:any[];transfers?:any[];
  createError?:boolean;sourceFiltered?:boolean;decisionError?:boolean;materializeError?:boolean;
  outcomes?:any;outcomesError?:boolean;materializeResponse?:any;runDetails?:Record<string,any>;role?:'PW_RPL_READ_ONLY'|'PW_RPL_GOVERN_NO_PO'};
const run={id:'pw-rpl-1',status:'draft',formula_version:'pw-formula',target_coverage_days:14,
 lookback_days:30,created_at:'2026-11-03T10:00:00Z',updated_at:'2026-11-03T10:00:00Z',version:4,
 generated_by_user_name:'Synthetic Planner',summary:{shortage_line_count:1,transfer_recommendation_count:1,purchase_recommendation_count:1}};
const purchase={id:'pw-rpl-item',version:2,product_id:'pw-rpl-product',product_name:'Synthetic Cleaner',
 storage_location_id:'pw-rpl-dest',storage_location_name:'Front store',supplier_id:'pw-rpl-supplier',
 supplier_name:'Synthetic Supplier',decision_status:'pending',final_purchase_quantity:4,
 recommended_purchase_quantity:4,current_stock:1,reserved_quantity:0,pending_transfer_in_quantity:0,
 pending_transfer_out_quantity:0,reliable_inbound_quantity:0,at_risk_inbound_quantity:0,
 usable_inventory_position:1,configured_min_quantity:5,configured_target_quantity:8,
 calculated_min_quantity:5,governed_min_quantity:5,selected_daily_demand:1,
 shortage_before_transfer:4,transfer_covered_quantity:0,remaining_purchase_requirement:4};
const transfer={id:'pw-rpl-transfer',version:2,product_id:'pw-rpl-product',product_name:'Synthetic Cleaner',
 source_storage_location_id:'pw-rpl-source',destination_storage_location_id:'pw-rpl-dest',
 source_storage_location_name:'Back store',destination_storage_location_name:'Front store',
 decision_status:'pending',recommended_quantity:2,final_quantity:2,source_surplus_before:4,
 source_quantity_after:8,destination_shortage_before:4,destination_shortage_after:2};
const emptyOutcomes={summary:{purchase_orders_created:0,stock_transfers_created:0,threshold_restored_count:0,
 received_quantity:0,average_fulfilment_ratio:0,post_run_unresolved_alert_count:0,transfer_executed_count:0},
 items:[],transfers:[]};
async function open(page:Page,setup:Setup={},url='/replenishment-planning'){
 if(setup.role)await loginAsDisposableRole(page,setup.role);else await loginAsTenant(page);const seen:Request[]=[];
 await page.route('**/replenishment-planning**',async(route:Route)=>{
  const req=route.request();if(req.isNavigationRequest())return route.continue();
  const uri=new URL(req.url()),path=uri.pathname,method=req.method(),body=method==='GET'?null:JSON.parse(req.postData()||'{}');
  seen.push({method,url:uri.toString(),path,body});
  const fixture={run:setup.run??run,items:setup.items??[purchase],transfers:setup.transfers??[transfer]};
  if(method==='GET'){
   if(path.endsWith('/replenishment-planning'))return fulfillJson(route,setup.listError?{message:'Synthetic run-list outage'}:
    setup.runs??[run],setup.listError?503:200);
   if(path.endsWith('/outcomes'))return fulfillJson(route,setup.outcomesError?{message:'Synthetic outcomes unavailable'}:(setup.outcomes??emptyOutcomes),setup.outcomesError?503:200);
   if(setup.runDetails){const id=path.split('/').pop()||'';if(setup.runDetails[id])return fulfillJson(route,setup.runDetails[id]);}
   return fulfillJson(route,setup.detailError?{message:'Synthetic run missing'}:fixture,setup.detailError?404:200);
  }
  if(method==='POST'){
   if(setup.createError)return fulfillJson(route,{message:'Synthetic planning save rejected'},409);
   if(path.endsWith('/replenishment-planning'))return fulfillJson(route,fixture,201);
   if(path.endsWith('/decisions'))return fulfillJson(route,setup.decisionError?{message:'Synthetic stale decision version'}:fixture,setup.decisionError?409:200);
   if(path.endsWith('/materialize'))return fulfillJson(route,setup.materializeError?{message:'Synthetic stale materialization'}:(setup.materializeResponse??{run:fixture,created_stock_transfers:[],created_purchase_orders:[],idempotent_replay:false}),setup.materializeError?409:200);
   throw Error(`Unexpected replenishment write ${path}`);
  }
  throw Error(`Unexpected method ${method}`);
 });
 await page.goto(url);await expect(page.getByRole('heading',{name:'Replenishment planning'})).toBeVisible();return seen;
}
const requests=(s:Request[],method:string,suffix:string)=>s.filter(x=>x.method===method&&x.path.endsWith(suffix));
const writes=(s:Request[])=>s.filter(x=>x.method!=='GET');
const runSection=(p:Page)=>p.locator('#replenishment-run-controls');
const filterSection=(p:Page)=>p.locator('#replenishment-review-lines');
const purchaseTable=(p:Page)=>p.locator('.replenishment-planning-table--purchases');
const transferTable=(p:Page)=>p.locator('.replenishment-planning-table--transfers');

test.describe('Replenishment Planning — saved-run navigation and review (Batch 29)',()=>{
 test('TRPL-001 Planning page describes a review snapshot, not automatic stock posting',async({page})=>{
  const s=await open(page);await expect(page.getByText('Generating a run does not move stock or create an order.',{exact:false})).toBeVisible();
  expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-002 Saved-run GET requests tenant list with limit 100',async({page})=>{
  const s=await open(page);await expect.poll(()=>requests(s,'GET','/replenishment-planning').length).toBeGreaterThan(0);
  expect(new URL(requests(s,'GET','/replenishment-planning')[0].url).searchParams.get('limit')).toBe('100');
 });
 test('TRPL-003 Empty saved run list displays clear first-time state',async({page})=>{
  await open(page,{runs:[]});await expect(page.getByText('No planning run yet')).toBeVisible();
  await expect(runSection(page).getByLabel('Saved planning run')).toBeDisabled();
 });
 test('TRPL-004 List failure displays the actual error instead of silent empty success',async({page})=>{
  await open(page,{listError:true});await expect(page.getByText('Synthetic run-list outage',{exact:false})).toBeVisible();
 });
 test('TRPL-005 Selected run is represented by durable run_id URL',async({page})=>{
  const s=await open(page,{},'/replenishment-planning?run_id=pw-rpl-1');
  await expect(runSection(page).getByLabel('Saved planning run')).toHaveValue(run.id);
  await expect.poll(()=>requests(s,'GET','/pw-rpl-1').length).toBeGreaterThan(0);
 });
 test('TRPL-006 Unavailable explicit run does not silently load a different saved run',async({page})=>{
  await open(page,{},'/replenishment-planning?run_id=pw-unavailable');
  await expect(page.getByRole('alert')).toContainText('not available in this view');
  await expect(page.getByText('Synthetic Cleaner',{exact:true})).toHaveCount(0);
 });
 test('TRPL-007 Choose available run clears missing run_id',async({page})=>{
  await open(page,{},'/replenishment-planning?run_id=pw-unavailable');
  await page.getByRole('button',{name:'Choose an available run'}).click();
  await expect(page).not.toHaveURL(/run_id=/);
 });
 test('TRPL-008 Saved run selector updates run_id without creating a new run',async({page})=>{
  const s=await open(page,{},'/replenishment-planning?run_id=pw-rpl-1');
  await runSection(page).getByLabel('Saved planning run').selectOption('');
  await expect(page).not.toHaveURL(/run_id=/);expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-009 Source-par-level handoff forwards source_par_level_id in list query',async({page})=>{
  const s=await open(page,{},'/replenishment-planning?source_par_level_id=pw-par');
  await expect.poll(()=>requests(s,'GET','/replenishment-planning').some(x=>new URL(x.url).searchParams.get('source_par_level_id')==='pw-par')).toBe(true);
 });
 test('TRPL-010 Empty source handoff does not display an unrelated saved run',async({page})=>{
  await open(page,{runs:[]},'/replenishment-planning?source_par_level_id=pw-par');
  await expect(page.getByText('No saved planning run matches this source decision.')).toBeVisible();
  await page.getByRole('button',{name:'Show all planning runs'}).click();
  await expect(page).not.toHaveURL(/source_par_level_id=/);
 });
 test('TRPL-011 Target coverage input starts at 14 and is bounded from 1 through 90',async({page})=>{
  await open(page);const input=runSection(page).getByLabel('Target coverage days');
  await expect(input).toHaveValue('14');await expect(input).toHaveAttribute('min','1');await expect(input).toHaveAttribute('max','90');
 });
 test('TRPL-012 Generate planning run posts target_coverage_days only',async({page})=>{
  const s=await open(page);await runSection(page).getByLabel('Target coverage days').fill('21');
  await runSection(page).getByRole('button',{name:'Generate planning run'}).click();
  await expect.poll(()=>requests(s,'POST','/replenishment-planning').length).toBe(1);
  expect(requests(s,'POST','/replenishment-planning')[0].body).toEqual({target_coverage_days:21});
 });
 test('TRPL-013 Invalid coverage 91 leaves generate disabled and prevents POST',async({page})=>{
  const s=await open(page);await runSection(page).getByLabel('Target coverage days').fill('91');
  await expect(runSection(page).getByRole('button',{name:'Generate planning run'})).toBeDisabled();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-014 Creation conflict is shown as an error and not success',async({page})=>{
  const s=await open(page,{createError:true});await runSection(page).getByRole('button',{name:'Generate planning run'}).click();
  await expect(page.getByText('Synthetic planning save rejected',{exact:false})).toBeVisible();
  expect(requests(s,'POST','/replenishment-planning')).toHaveLength(1);
 });
 test('TRPL-015 Current-run summary shows creator and formula without additional writes',async({page})=>{
  const s=await open(page,{},'/replenishment-planning?run_id=pw-rpl-1');
  await expect(page.getByText('Synthetic Planner')).toBeVisible();
  await page.locator('details.replenishment-planning-advanced-details summary').click();
  await expect(page.getByText('pw-formula')).toBeVisible();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-016 Review search filters source transfers and purchases locally',async({page})=>{
  const s=await open(page,{},'/replenishment-planning?run_id=pw-rpl-1');
  await filterSection(page).getByPlaceholder('Product, supplier, or location').fill('never-matches');
  await expect(page.getByText('No transfer recommendations')).toBeVisible();
  await expect(page.getByText('No supplier purchase recommendations')).toBeVisible();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-017 Clearing filters restores both recommendation tables',async({page})=>{
  await open(page,{},'/replenishment-planning?run_id=pw-rpl-1');
  await filterSection(page).getByPlaceholder('Product, supplier, or location').fill('absent');
  await filterSection(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(transferTable(page)).toContainText('Synthetic Cleaner');
  await expect(purchaseTable(page)).toContainText('Synthetic Cleaner');
 });
 test('TRPL-018 Review status filters show pending action rows by source decision',async({page})=>{
  const s=await open(page,{},'/replenishment-planning?run_id=pw-rpl-1');
  await filterSection(page).getByLabel('Decision status').selectOption('accepted');
  await expect(page.getByText('No transfer recommendations')).toBeVisible();
  await expect(page.getByText('No supplier purchase recommendations')).toBeVisible();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-019 Transfer and purchase recommendation rows preserve exact source locations',async({page})=>{
  await open(page,{},'/replenishment-planning?run_id=pw-rpl-1');
  await expect(transferTable(page)).toContainText('Back store');await expect(transferTable(page)).toContainText('Front store');
  await expect(purchaseTable(page)).toContainText('Synthetic Supplier');
 });
 test('TRPL-020 Draft creation remains disabled while review lines are pending',async({page})=>{
  const s=await open(page,{},'/replenishment-planning?run_id=pw-rpl-1');
  await expect(page.locator('#replenishment-draft-gate').getByRole('button',{name:'Create accepted drafts'})).toBeDisabled();
  await expect(page.getByText('planning line(s) still need a decision.',{exact:false})).toBeVisible();
  expect(requests(s,'POST','/materialize')).toHaveLength(0);
 });
});

// Batch 30: governance, replay/read-only guardrails and outcomes. These are
// synthetic browser contracts, not database transaction or permission proofs.
const selectedRunUrl='/replenishment-planning?run_id=pw-rpl-1';
const readyRun={...run,status:'reviewed',version:7,materialization_guard:{pending_decision_count:0,
 all_lines_reviewed:true,max_age_hours:24,run_age_hours:2,age_expired:false,can_materialize:true}};
const acceptedPurchase={...purchase,decision_status:'accepted' as const};
const deferredTransfer={...transfer,decision_status:'deferred' as const};
const acceptedTransfer={...transfer,decision_status:'accepted' as const};
const readySetup:Setup={run:readyRun,items:[acceptedPurchase],transfers:[deferredTransfer]};
const transferRow=(p:Page)=>transferTable(p).locator('tbody tr').first();
const purchaseRow=(p:Page)=>purchaseTable(p).locator('tbody tr').first();
const saveButton=(p:Page)=>p.locator('#replenishment-draft-gate').getByRole('button',{name:/Save \d+ decision/});
const draftButton=(p:Page)=>p.locator('#replenishment-draft-gate').getByRole('button',{name:'Create accepted drafts'});
const decision=(row:ReturnType<typeof transferRow>)=>row.locator('select');
const quantity=(row:ReturnType<typeof transferRow>)=>row.locator('input[type="number"]');
const reason=(row:ReturnType<typeof transferRow>)=>row.locator('input[placeholder]');

test.describe('Replenishment Planning — governed decisions and outcomes (Batch 30)',()=>{
 test('TRPL-021 Transfer acceptance sends expected run and row versions',async({page})=>{
  const s=await open(page,{},selectedRunUrl);await decision(transferRow(page)).selectOption('accepted');
  await saveButton(page).click();await expect.poll(()=>requests(s,'POST','/decisions').length).toBe(1);
  expect(requests(s,'POST','/decisions')[0].body).toEqual({expected_run_version:4,
   decisions:[{kind:'transfer',id:transfer.id,expected_version:2,decision:'accepted',reason:null}]});
 });
 test('TRPL-022 Purchase with no supplier cannot be accepted, even by bulk review',async({page})=>{
  const s=await open(page,{items:[{...purchase,supplier_id:null,supplier_name:null}]},selectedRunUrl);
  await expect(purchaseRow(page).locator('option[value="accepted"]')).toBeDisabled();
  await page.getByRole('button',{name:'Accept eligible'}).click();
  await expect(purchaseRow(page).locator('select')).toHaveValue('pending');
  await expect(page.getByText('A purchase line without a supplier cannot be accepted.',{exact:false})).toBeVisible();
  expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-023 Transfer override exceeding protected source surplus blocks save',async({page})=>{
  const s=await open(page,{},selectedRunUrl);await decision(transferRow(page)).selectOption('overridden');
  await quantity(transferRow(page)).fill('5');await reason(transferRow(page)).fill('Extra stock required');
  await expect(page.getByText('override exceeds protected source surplus.',{exact:false})).toBeVisible();
  await expect(saveButton(page)).toBeDisabled();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-024 Transfer override exceeding destination shortage blocks save independently',async({page})=>{
  const s=await open(page,{transfers:[{...transfer,source_surplus_before:25,destination_shortage_before:2}]},selectedRunUrl);
  await decision(transferRow(page)).selectOption('overridden');await quantity(transferRow(page)).fill('3');
  await reason(transferRow(page)).fill('Demand adjustment');
  await expect(page.getByText('override exceeds the destination shortage.',{exact:false})).toBeVisible();
  await expect(saveButton(page)).toBeDisabled();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-025 Reject and already-handled decisions require a meaningful reason',async({page})=>{
  const s=await open(page,{},selectedRunUrl);await decision(purchaseRow(page)).selectOption('rejected');
  await reason(purchaseRow(page)).fill('no');
  await expect(page.getByText('enter a reason of at least 3 characters.',{exact:false})).toBeVisible();
  await expect(saveButton(page)).toBeDisabled();
  await decision(purchaseRow(page)).selectOption('already_handled');await expect(saveButton(page)).toBeDisabled();
  await reason(purchaseRow(page)).fill('handled externally');await expect(saveButton(page)).toBeEnabled();
  expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-026 Negative purchase override quantity is rejected before mutation',async({page})=>{
  const s=await open(page,{},selectedRunUrl);await decision(purchaseRow(page)).selectOption('overridden');
  await quantity(purchaseRow(page)).fill('-1');await reason(purchaseRow(page)).fill('supplier packaging');
  await expect(page.getByText('enter a valid override quantity.',{exact:false})).toBeVisible();
  await expect(saveButton(page)).toBeDisabled();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-027 Bulk accept touches only visible unlinked transfer lines',async({page})=>{
  const other={...transfer,id:'pw-rpl-other-transfer',product_name:'Synthetic Towels',source_storage_location_name:'Warehouse'};
  const linked={...transfer,id:'pw-rpl-linked-transfer',product_name:'Synthetic Cleaner Linked',linked_stock_transfer_id:'pw-existing',decision_status:'pending' as const};
  const s=await open(page,{transfers:[transfer,other,linked]},selectedRunUrl);
  await filterSection(page).getByPlaceholder('Product, supplier, or location').fill('Synthetic Cleaner');
  await page.getByRole('button',{name:'Accept visible'}).click();
  const rows=transferTable(page).locator('tbody tr');
  await expect(rows.first().locator('select')).toHaveValue('accepted');
  await expect(rows.nth(1).locator('select')).toHaveValue('pending');
  await filterSection(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(transferTable(page).locator('tbody tr').nth(1).locator('select')).toHaveValue('pending');
  expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-028 Defer visible affects only currently filtered purchase rows',async({page})=>{
  const second={...purchase,id:'pw-rpl-second',product_name:'Synthetic Soap'};
  const s=await open(page,{items:[purchase,second]},selectedRunUrl);
  await filterSection(page).getByPlaceholder('Product, supplier, or location').fill('Cleaner');
  await page.getByRole('button',{name:'Defer visible'}).last().click();
  await expect(purchaseRow(page).locator('select')).toHaveValue('deferred');
  await filterSection(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(purchaseTable(page).locator('tbody tr').nth(1).locator('select')).toHaveValue('pending');
  expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-029 Unsaved planning decision can cancel switching to another run',async({page})=>{
  const s=await open(page,{runs:[run,{...run,id:'pw-rpl-2'}]},selectedRunUrl);
  await decision(transferRow(page)).selectOption('accepted');
  page.once('dialog',dialog=>dialog.dismiss());
  await runSection(page).getByLabel('Saved planning run').selectOption('pw-rpl-2');
  await expect(page).toHaveURL(/run_id=pw-rpl-1/);
  await expect(decision(transferRow(page))).toHaveValue('accepted');expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-030 Refresh requires consent before discarding unsaved decisions',async({page})=>{
  const s=await open(page,{},selectedRunUrl);await decision(purchaseRow(page)).selectOption('deferred');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await expect(decision(purchaseRow(page))).toHaveValue('deferred');expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-031 Purchase override POST contains exact kind, line, quantity, reason and versions',async({page})=>{
  const s=await open(page,{},selectedRunUrl);await decision(purchaseRow(page)).selectOption('overridden');
  await quantity(purchaseRow(page)).fill('6.25');await reason(purchaseRow(page)).fill('Package rounding');
  await saveButton(page).click();await expect.poll(()=>requests(s,'POST','/decisions').length).toBe(1);
  expect(requests(s,'POST','/decisions')[0].body).toEqual({expected_run_version:4,
   decisions:[{kind:'purchase',id:purchase.id,expected_version:2,decision:'overridden',quantity:6.25,reason:'Package rounding'}]});
 });
 test('TRPL-032 Version conflict displays error and reloads latest saved run',async({page})=>{
  const s=await open(page,{decisionError:true},selectedRunUrl);await decision(transferRow(page)).selectOption('accepted');
  await saveButton(page).click();await expect(page.getByText('Synthetic stale decision version',{exact:false})).toBeVisible();
  await expect.poll(()=>requests(s,'GET','/pw-rpl-1').length).toBeGreaterThan(1);
  await expect(decision(transferRow(page))).toHaveValue('pending');
 });
 test('TRPL-033 Unsaved decision prevents creating drafts even when saved lines were reviewed',async({page})=>{
  const s=await open(page,readySetup,selectedRunUrl);await decision(purchaseRow(page)).selectOption('deferred');
  await expect(draftButton(page)).toBeDisabled();
  await expect(page.getByText('Save or discard the unsaved decisions before creating drafts.')).toBeVisible();
  expect(requests(s,'POST','/materialize')).toHaveLength(0);
 });
 test('TRPL-034 One pending action blocks draft creation despite an accepted purchase',async({page})=>{
  const s=await open(page,{...readySetup,transfers:[{...transfer,decision_status:'pending'}]},selectedRunUrl);
  await expect(draftButton(page)).toBeDisabled();
  await expect(page.getByText('planning line(s) still need a decision.',{exact:false})).toBeVisible();
  expect(requests(s,'POST','/materialize')).toHaveLength(0);
 });
 test('TRPL-035 Expired run age blocks the otherwise eligible draft creation',async({page})=>{
  const aged={...readyRun,materialization_guard:{...readyRun.materialization_guard,age_expired:true,run_age_hours:60}};
  const s=await open(page,{...readySetup,run:aged},selectedRunUrl);
  await expect(draftButton(page)).toBeDisabled();
  await expect(page.getByText('This run is older than',{exact:false})).toBeVisible();
  expect(requests(s,'POST','/materialize')).toHaveLength(0);
 });
 test('TRPL-036 Governance without Purchase Order creation permission blocks accepted PO drafts',async({page})=>{
  const s=await open(page,{...readySetup,role:'PW_RPL_GOVERN_NO_PO'},selectedRunUrl);
  await expect(draftButton(page)).toBeDisabled();
  await expect(page.getByText('Your role cannot create one or more accepted draft types.',{exact:false})).toBeVisible();
  expect(requests(s,'POST','/materialize')).toHaveLength(0);
 });
 test('TRPL-037 Draft conversion clearly requires modal confirmation and describes draft-only effects',async({page})=>{
  const s=await open(page,readySetup,selectedRunUrl);await draftButton(page).click();
  const dialog=page.getByRole('dialog',{name:'Create draft transfers and purchase orders'});
  await expect(dialog).toContainText('Nothing will be approved, submitted, received, or executed.');
  expect(requests(s,'POST','/materialize')).toHaveLength(0);
  await dialog.getByRole('button',{name:'Cancel'}).click();await expect(dialog).toHaveCount(0);
  expect(requests(s,'POST','/materialize')).toHaveLength(0);
 });
 test('TRPL-038 Confirmed conversion posts exactly the saved expected run version',async({page})=>{
  const s=await open(page,readySetup,selectedRunUrl);await draftButton(page).click();
  await page.getByRole('dialog').getByRole('button',{name:'Create drafts'}).click();
  await expect.poll(()=>requests(s,'POST','/materialize').length).toBe(1);
  expect(requests(s,'POST','/materialize')[0].body).toEqual({expected_run_version:7});
  await expect(page.getByText('Nothing was approved or executed.',{exact:false})).toBeVisible();
 });
 test('TRPL-039 Materialization conflict closes confirmation without reporting success',async({page})=>{
  const s=await open(page,{...readySetup,materializeError:true},selectedRunUrl);await draftButton(page).click();
  await page.getByRole('dialog').getByRole('button',{name:'Create drafts'}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Synthetic stale materialization',{exact:false})).toBeVisible();
  expect(requests(s,'POST','/materialize')).toHaveLength(1);
 });
 test('TRPL-040 Materialized run locks line governance and new draft conversion',async({page})=>{
  const s=await open(page,{...readySetup,run:{...readyRun,status:'materialized'}},selectedRunUrl);
  await expect(decision(purchaseRow(page))).toBeDisabled();await expect(decision(transferRow(page))).toBeDisabled();
  await expect(saveButton(page)).toBeDisabled();await expect(draftButton(page)).toBeDisabled();
  expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-041 Cancelled run locks governance and conversion actions',async({page})=>{
  const s=await open(page,{...readySetup,run:{...readyRun,status:'cancelled'}},selectedRunUrl);
  await expect(decision(purchaseRow(page))).toBeDisabled();await expect(draftButton(page)).toBeDisabled();
  await expect(saveButton(page)).toBeDisabled();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-042 Linked purchase draft carries its exact Purchase Order handoff ID',async({page})=>{
  const s=await open(page,{...readySetup,items:[{...acceptedPurchase,linked_purchase_order_id:'po-27',linked_purchase_order_status:'draft'}]},selectedRunUrl);
  await expect(purchaseRow(page).getByRole('link',{name:/Open draft/})).toHaveAttribute('href','/purchase-orders?purchaseOrderId=po-27');
  await expect(decision(purchaseRow(page))).toBeDisabled();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-043 Linked transfer draft carries its exact Stock Transfer handoff ID',async({page})=>{
  const s=await open(page,{...readySetup,transfers:[{...acceptedTransfer,linked_stock_transfer_id:'transfer-47',linked_stock_transfer_status:'draft'}]},selectedRunUrl);
  await expect(transferRow(page).getByRole('link',{name:/Open draft/})).toHaveAttribute('href','/stock-transfers?transfer_id=transfer-47');
  await expect(decision(transferRow(page))).toBeDisabled();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-044 Materialized run requests outcomes separately from the saved decision snapshot',async({page})=>{
  const s=await open(page,{...readySetup,run:{...readyRun,status:'materialized'}},selectedRunUrl);
  await expect.poll(()=>requests(s,'GET','/outcomes').length).toBeGreaterThan(0);
  await expect(page.getByText('Outcome tracking')).toBeVisible();
  await expect(page.getByText('Synthetic Cleaner',{exact:true}).first()).toBeVisible();expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-045 Outcome receipts, fulfilment and threshold are shown from response evidence',async({page})=>{
  const outcome={...emptyOutcomes,summary:{...emptyOutcomes.summary,received_quantity:3,average_fulfilment_ratio:0.75},
   items:[{id:'outcome-1',product_name:'Synthetic Cleaner',storage_location_name:'Front store',purchase_order_status:'partial',
    linked_purchase_order_id:'po-27',shortage_before_transfer:4,ordered_quantity:4,received_quantity:3,
    current_stock:6,governed_min_quantity:5,threshold_restored:true,fulfilment_ratio:0.75,post_run_unresolved_alert_count:0}]};
  const s=await open(page,{...readySetup,run:{...readyRun,status:'materialized'},outcomes:outcome},selectedRunUrl);
  const row=page.locator('#replenishment-outcomes tbody tr').first();
  await expect(row).toContainText('Synthetic Cleaner');await expect(row).toContainText('Threshold currently met');
  await expect(row).toContainText('75%');expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-046 Transfer outcomes list route and status without stock execution',async({page})=>{
  const outcome={...emptyOutcomes,transfers:[{id:'out-transfer',product_name:'Synthetic Cleaner',source_storage_location_name:'Back store',
   destination_storage_location_name:'Front store',final_quantity:2,stock_transfer_status:'draft'}]};
  const s=await open(page,{...readySetup,run:{...readyRun,status:'materialized'},outcomes:outcome},selectedRunUrl);
  const row=page.locator('#replenishment-outcomes tbody tr').last();
  await expect(row).toContainText('Back store');await expect(row).toContainText('Front store');
  await expect(row).toContainText('Draft');expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-047 Outcome API failure preserves saved run and exposes unavailable state',async({page})=>{
  const s=await open(page,{...readySetup,run:{...readyRun,status:'materialized'},outcomesError:true},selectedRunUrl);
  await expect(page.getByText('Outcome data unavailable')).toBeVisible();
  await expect(purchaseRow(page)).toContainText('Synthetic Cleaner');
  await expect.poll(()=>requests(s,'GET','/outcomes').length).toBeGreaterThan(0);
 });
 test('TRPL-048 Changing saved run clears unsaved note and local review search',async({page})=>{
  const second={run:{...readyRun,id:'pw-rpl-2'},items:[{...purchase,id:'new-item',product_name:'Synthetic Towels'}],transfers:[]};
  const s=await open(page,{...readySetup,runs:[readyRun,second.run],runDetails:{'pw-rpl-2':second}},selectedRunUrl);
  await filterSection(page).getByPlaceholder('Product, supplier, or location').fill('Cleaner');
  await decision(purchaseRow(page)).selectOption('deferred');
  page.once('dialog',dialog=>dialog.accept());
  await runSection(page).getByLabel('Saved planning run').selectOption('pw-rpl-2');
  await expect(page).toHaveURL(/run_id=pw-rpl-2/);
  await expect(filterSection(page).getByPlaceholder('Product, supplier, or location')).toHaveValue('');
  await expect(purchaseRow(page)).toContainText('Synthetic Towels');
  await expect(decision(purchaseRow(page))).toHaveValue('pending');expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-049 Read-only role can inspect but not generate or save or materialize',async({page})=>{
  const s=await open(page,{role:'PW_RPL_READ_ONLY'},selectedRunUrl);
  await expect(runSection(page).getByRole('button',{name:'Generate planning run'})).toBeDisabled();
  await expect(decision(purchaseRow(page))).toBeDisabled();
  await expect(saveButton(page)).toBeDisabled();await expect(draftButton(page)).toBeDisabled();
  await expect(page.getByText('This is a read-only view for your role.',{exact:false})).toBeVisible();
  expect(writes(s)).toHaveLength(0);
 });
 test('TRPL-050 Cross-domain source handoff highlights matching product/destination only',async({page})=>{
  const selected={...run,handoff_product_id:purchase.product_id,handoff_storage_location_id:purchase.storage_location_id};
  const s=await open(page,{runs:[selected],run:selected},'/replenishment-planning?source_par_level_id=source-par');
  await expect(page.locator('[data-replenishment-handoff-match="true"]')).toHaveCount(2);
  await expect(page.getByText('Opened from Cross-Domain Optimization.')).toBeVisible();
  await expect(page.locator('.replenishment-planning-table--purchases [data-replenishment-handoff-match="true"]')).toContainText('Synthetic Cleaner');
  await expect.poll(()=>requests(s,'GET','/replenishment-planning').some(x=>new URL(x.url).searchParams.get('source_par_level_id')==='source-par')).toBe(true);
  expect(writes(s)).toHaveLength(0);
 });
});
