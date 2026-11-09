import {test,expect,type Page} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';
import {loginAsDisposableRole} from '../../../support/roleSession';

// Batch 16 — Cross-Domain Optimization. Grounded in CrossDomainOptimizationPage.tsx,
// crossDomainRouteState.ts, decisionIntelligence.js; synthetic GET fixtures never prove persistence.
const cdoEndpoint='**/decision-intelligence/cross-domain-optimization-summary?*';
// Batch 185: stable fixture identifiers use backend-accepted UUIDv4 shapes; no real records are created.
const cdoRunId='6a28ae68-daae-44e9-9cff-640e4a118255'; // disposable synthetic ID
const cdoRun={id:cdoRunId,title:'Synthetic priority decision',optimization_label:'Synthetic priority decision',optimization_domain:'inventory',optimization_status:'draft',summary:'Synthetic human decision review',owner_name:'Synthetic Owner',created_at:'2026-10-30T12:00:00Z'};
const cdoObjective={id:'90a00001-0000-4000-8000-000000000016',optimization_label:cdoRun.title,objective_type:'carrying_cost',objective_domain:'inventory',weight:0.5,target_direction:'minimize',target_reference:{statement:'Reduce excess inventory'},constraint_reference:{statement:'Protect availability'}};
const cdoOption={id:'90a00002-0000-4000-8000-000000000016',optimization_label:cdoRun.title,title:'Consider stock transfer first',option_status:'generated',aggregate_score:0.5,confidence_score:0.6,projected_outcome:{summary:'Synthetic example'}};
const cdoTradeoff={id:'90a00003-0000-4000-8000-000000000016',option_id:cdoOption.id,option_label:cdoOption.title,objective_type:'carrying_cost',tradeoff_domain:'inventory',impact_direction:'negative',impact_score:0.4,governance_status:'open'};
const cdoResult={id:'90a00004-0000-4000-8000-000000000016',optimization_label:cdoRun.title,option_label:cdoOption.title,result_status:'observed',result_domain:'inventory',realized_value_score:0.2,observed_at:'2026-10-31T12:00:00Z'};
function cdoSummary(overrides:Record<string,unknown>={}){
 return {governance:{optimization_run_count:1,objective_count:1,option_count:1,tradeoff_count:1,optimization_result_count:1,cross_domain_optimization_posture:'controlled_multi_objective_advisory_posture',high_impact_tradeoff_count:0},optimization_runs:[cdoRun],objectives:[cdoObjective],options:[cdoOption],tradeoffs:[cdoTradeoff],optimization_results:[cdoResult],owner_candidates:[],run_detail:null,review_scope:{review_run_required:true,evidence_is_run_scoped:false,mixed_run_review_checks_allowed:false},...overrides};
}
function cdoNoEvidence(){return cdoSummary({governance:{optimization_run_count:0,objective_count:0,option_count:0,tradeoff_count:0,optimization_result_count:0,high_impact_tradeoff_count:0},optimization_runs:[],objectives:[],options:[],tradeoffs:[],optimization_results:[]});}
function cdoWithRun(){return cdoSummary({run_detail:{run:cdoRun,objectives:[cdoObjective],options:[cdoOption],tradeoffs:[cdoTradeoff],optimization_results:[cdoResult],unresolved_high_impact_tradeoff_count:0},review_scope:{review_run_required:true,selected_run_id:cdoRunId,evidence_is_run_scoped:true,mixed_run_review_checks_allowed:false}});}
async function openCross(page:Page,options:{data?:Record<string,unknown>;url?:string;role?:'PW_CROSS_READER'|'PW_CROSS_GOVERNOR'}={}){
 if(options.role)await loginAsDisposableRole(page,options.role);else await loginAsTenant(page);
 await page.route(cdoEndpoint,route=>fulfillJson(route,options.data||cdoSummary()));
 await page.goto(options.url||'/cross-domain-optimization');
 await expect(page.getByRole('heading',{name:'Cross-Domain Optimization'})).toBeVisible();
}
const cdoFilters=(page:Page)=>page.getByLabel('Cross-domain optimization filters');
const cdoSection=(page:Page,name:string)=>page.locator('section.cross-domain-section').filter({has:page.getByRole('heading',{name,exact:true})});

test.describe('Cross-Domain Optimization — page evidence, filters, review scoping (Batch 16)',()=>{
 test('TCDO-001 page explicitly disclaims automatic business execution and inferred winners',async({page})=>{
  await openCross(page);
  await expect(page.locator('[data-cross-domain-optimization-refined="true"]')).toContainText('Nothing is executed automatically');
  await expect(page.getByRole('tab',{name:'Comparisons'})).toBeVisible();
 });
 test('TCDO-002 empty reader sees no saved decisions, with no governance action',async({page})=>{
  await openCross(page,{data:cdoNoEvidence(),role:'PW_CROSS_READER'});
  await expect(page.getByRole('heading',{name:'No decision comparisons yet'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Create decision comparison'})).toHaveCount(0);
 });
 test('TCDO-003 authorized governor may begin a source-backed comparison without saved runs',async({page})=>{
  await openCross(page,{data:cdoNoEvidence(),role:'PW_CROSS_GOVERNOR'});
  await page.getByRole('button',{name:'Create decision comparison'}).click();
  await expect(page.getByRole('heading',{name:'Review or compare actions from application data'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Describe the decision for the people who will review it'})).toBeVisible();
  await expect(page.getByText('Human note — not calculation input')).toBeVisible();
 });
 test('TCDO-004 KPI counts reflect server governance totals rather than only rendered list length',async({page})=>{
  const data=cdoSummary({governance:{optimization_run_count:42,objective_count:55,option_count:90,tradeoff_count:33,optimization_result_count:12,high_impact_tradeoff_count:8}});
  await openCross(page,{data});const stats=page.getByLabel('Cross-domain optimization evidence summary');
  for(const value of ['42','55','90','33','12','8'])await expect(stats).toContainText(value);
 });
 test('TCDO-005 comparison page keeps runs, objectives, choices, tradeoffs and actual outcomes distinct',async({page})=>{
  await openCross(page);
  for(const heading of ['Optimization runs','Business objectives','Planning options','Tradeoffs','Actual optimization outcomes'])await expect(cdoSection(page,heading)).toBeVisible();
 });
 test('TCDO-006 failed summary GET offers Retry and does not present stale records',async({page})=>{
  await loginAsTenant(page);let reads=0;let recover=false;
  await page.route(cdoEndpoint,route=>{reads++;return fulfillJson(route,recover?cdoSummary():{message:'Synthetic error'},recover?200:503);});
  await page.goto('/cross-domain-optimization');
  await expect(page.getByRole('heading',{name:'Cross-area optimization evidence could not be loaded'})).toBeVisible();
  recover=true;await page.getByRole('button',{name:'Retry'}).click();
  await expect(page.getByRole('heading',{name:'Cross-Domain Optimization'})).toBeVisible();
  expect(reads).toBeGreaterThanOrEqual(2);
 });
 test('TCDO-007 Refresh evidence retries only summary GET without any mutation',async({page})=>{
  await openCross(page);let reads=0;let writes=0;
  await page.route(cdoEndpoint,route=>{reads++;return fulfillJson(route,cdoSummary());});
  await page.route('**/decision-intelligence/cross-domain-optimization/reviews',route=>{writes++;return fulfillJson(route,{});});
  await page.getByRole('button',{name:'Refresh evidence'}).click();
  await expect.poll(()=>reads).toBeGreaterThan(0);expect(writes).toBe(0);
 });
 test('TCDO-008 empty comparison disables plan and readiness tabs',async({page})=>{
  await openCross(page,{data:cdoNoEvidence()});
  await expect(page.getByRole('tab',{name:'Chosen choice'})).toBeDisabled();
  await expect(page.getByRole('tab',{name:'Is it ready?'})).toBeDisabled();
 });
 test('TCDO-009 filtering by area clears stale selected run and sends optimization_domain',async({page})=>{
  await openCross(page,{url:`/cross-domain-optimization?review_run_id=${cdoRunId}&cdo_view=plan`});
  let url='';await page.route(cdoEndpoint,route=>{url=route.request().url();return fulfillJson(route,cdoSummary());});
  await cdoFilters(page).getByLabel('Business area').selectOption('inventory');
  await expect.poll(()=>new URL(url).searchParams.get('optimization_domain')).toBe('inventory');
  expect(new URL(url).searchParams.get('review_run_id')).toBe(null);
  await expect(page).not.toHaveURL(/cdo_view=plan/);
 });
 test('TCDO-010 run status filter is reflected in server query',async({page})=>{
  await openCross(page);let url='';await page.route(cdoEndpoint,route=>{url=route.request().url();return fulfillJson(route,cdoSummary());});
  await cdoFilters(page).getByLabel('Run status').selectOption('tradeoff_review');
  await expect.poll(()=>new URL(url).searchParams.get('optimization_status')).toBe('tradeoff_review');
 });
 test('TCDO-011 objective type filters by actual backend objective_type key',async({page})=>{
  await openCross(page);let url='';await page.route(cdoEndpoint,route=>{url=route.request().url();return fulfillJson(route,cdoSummary());});
  await cdoFilters(page).getByLabel('Objective type').selectOption('carrying_cost');
  await expect.poll(()=>new URL(url).searchParams.get('objective_type')).toBe('carrying_cost');
 });
 test('TCDO-012 option status filter retains ranked choices',async({page})=>{
  await openCross(page);let url='';await page.route(cdoEndpoint,route=>{url=route.request().url();return fulfillJson(route,cdoSummary());});
  await cdoFilters(page).getByLabel('Option status').selectOption('ranked');
  await expect.poll(()=>new URL(url).searchParams.get('option_status')).toBe('ranked');
 });
 test('TCDO-013 tradeoff direction sends impact_direction without changing source records',async({page})=>{
  await openCross(page);let url='';await page.route(cdoEndpoint,route=>{url=route.request().url();return fulfillJson(route,cdoSummary());});
  await cdoFilters(page).getByLabel('Tradeoff direction').selectOption('negative');
  await expect.poll(()=>new URL(url).searchParams.get('impact_direction')).toBe('negative');
 });
 test('TCDO-014 recorded outcome filter sends result_status to summary',async({page})=>{
  await openCross(page);let url='';await page.route(cdoEndpoint,route=>{url=route.request().url();return fulfillJson(route,cdoSummary());});
  await cdoFilters(page).getByLabel('Recorded outcome status').selectOption('value_confirmed');
  await expect.poll(()=>new URL(url).searchParams.get('result_status')).toBe('value_confirmed');
 });
 test('TCDO-015 maximum evidence limit 200 updates URL and read query only',async({page})=>{
  await openCross(page);let url='';await page.route(cdoEndpoint,route=>{url=route.request().url();return fulfillJson(route,cdoSummary());});
  await cdoFilters(page).getByLabel('Maximum records per evidence list').selectOption('200');
  await expect.poll(()=>new URL(url).searchParams.get('limit')).toBe('200');
  await expect(page.getByRole('tab',{name:'Comparisons'})).toBeVisible();
 });
 test('TCDO-016 Clear filters restores defaults and unselects previous run',async({page})=>{
  await openCross(page,{url:`/cross-domain-optimization?optimization_domain=inventory&limit=100&review_run_id=${cdoRunId}`});
  await cdoFilters(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(cdoFilters(page).getByLabel('Business area')).toHaveValue('');
  await expect(cdoFilters(page).getByLabel('Maximum records per evidence list')).toHaveValue('25');
  await expect(page).not.toHaveURL(/review_run_id|optimization_domain|limit=/);
 });
 test('TCDO-017 selecting a planning run scopes summary GET to review_run_id',async({page})=>{
  await openCross(page);let url='';await page.route(cdoEndpoint,route=>{url=route.request().url();return fulfillJson(route,cdoWithRun());});
  await cdoSection(page,'Choose the planning run to review').locator('select').selectOption(cdoRunId);
  await expect.poll(()=>new URL(url).searchParams.get('review_run_id')).toBe(cdoRunId);
  await expect(page.getByText('Run-scoped checks')).toBeVisible();
 });
 test('TCDO-018 Open plan selects specific saved run and changes route view',async({page})=>{
  await openCross(page);await page.route(cdoEndpoint,route=>fulfillJson(route,cdoWithRun()));
  await cdoSection(page,'Optimization runs').getByRole('button',{name:'Open plan'}).click();
  await expect(page).toHaveURL(new RegExp(`review_run_id=${cdoRunId}`));
  await expect(page).toHaveURL(/cdo_view=plan/);
  await expect(page.locator('.cross-domain-plan-header')).toContainText(cdoRun.title);
 });
 test('TCDO-019 readiness tab requires one selected run and never pools unrelated runs',async({page})=>{
  await openCross(page);await page.getByRole('tab',{name:'Is it ready?'}).click();
  await expect(page.getByRole('heading',{name:'Select a planning run before reviewing readiness'})).toBeVisible();
  await expect(page.getByText('refuses to calculate a combined readiness result')).toBeVisible();
 });
 test('TCDO-020 selected run shows its isolated lifecycle check cards with advisory caution',async({page})=>{
  await openCross(page,{data:cdoWithRun(),url:`/cross-domain-optimization?review_run_id=${cdoRunId}&cdo_view=readiness`});
  await expect(page.getByRole('heading',{name:'These checks use only the selected planning run'})).toBeVisible();
  await expect(page.getByText('Passing checks are still advisory and never execute a plan.')).toBeVisible();
  for(const heading of ['Manual trial readiness','Actual trial outcome review','Reusable-pattern review'])await expect(cdoSection(page,heading)).toBeVisible();
 });
});

// Batch 17 — TCDO-021..050. Source-backed wizard and governed actions only.
// All synthetic fixtures are disposable browser interceptions, NOT backend/tenant authorization proofs.
const dashboardEndpoint='**/optimization-plans/execution-dashboard?*';
const reviewPostEndpoint='**/decision-intelligence/cross-domain-optimization/reviews';
const firstSource={id:'pw-source-a',plan_id:'pw-plan-a',plan_code:'SYN-A',plan_type:'replenishment_optimization',item_type:'product_replenishment',status:'candidate',score:0.7,confidence:0.8,source_type:'product',source_id:'pw-product-1',target_type:'product',target_id:'pw-product-1',recommendation:'Transfer stock to this product location',rationale:'Structured shortage evidence',payload:{strategy:'transfer_first',product_id:'pw-product-1'},impact_snapshot:{recommended_quantity:10,shortage_to_par_quantity:10,recommendation_mode:'transfer',projected_shortage:8}};
const secondSource={...firstSource,id:'pw-source-b',plan_id:'pw-plan-b',plan_code:'SYN-B',recommendation:'Procure stock for this product location',impact_snapshot:{...firstSource.impact_snapshot,recommendation_mode:'procure',recommended_quantity:12}};
const unrelatedSource={...secondSource,id:'pw-source-other',plan_id:'pw-plan-other',source_id:'pw-product-other',target_id:'pw-product-other',recommendation:'Transfer stock for another product',payload:{strategy:'transfer_first',product_id:'pw-product-other'}};
const dashboard=(items:Record<string,unknown>[]=[firstSource])=>({top_recommendations:items});
async function openCrossWizard(page:Page,opts:{role?:'PW_CROSS_READER'|'PW_CROSS_GOVERNOR'|'PW_CROSS_GOVERNOR_NO_SOURCE_READ'|'PW_CROSS_GOVERNOR_SOURCE_READ_ONLY';items?:Record<string,unknown>[];data?:Record<string,unknown>;sourceStatus?:number}={}){
 if(opts.role==='PW_CROSS_GOVERNOR_NO_SOURCE_READ'||opts.role==='PW_CROSS_GOVERNOR_SOURCE_READ_ONLY'){
  await loginAsDisposableRole(page,opts.role);
  await page.route(cdoEndpoint,route=>fulfillJson(route,opts.data||cdoNoEvidence()));
  await page.goto('/cross-domain-optimization');
  await expect(page.getByRole('heading',{name:'Cross-Domain Optimization'})).toBeVisible();
 }else await openCross(page,{role:opts.role||'PW_CROSS_GOVERNOR',data:opts.data||cdoNoEvidence()});
 await page.route(dashboardEndpoint,route=>fulfillJson(route,opts.sourceStatus&&opts.sourceStatus!==200?{message:'Synthetic read failure'}:dashboard(opts.items||[firstSource]),opts.sourceStatus||200));
 await page.getByRole('button',{name:'Create decision comparison'}).click();
}
async function toSourcePicker(page:Page,title='Synthetic inventory decision'){
 await page.getByLabel('Decision title').fill(title);
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await expect(page.getByRole('heading',{name:'What needs a management decision right now?'})).toBeVisible();
}
async function toSingleSourceSave(page:Page){
 await toSourcePicker(page);await page.getByRole('button',{name:'Record a decision'}).first().click();
 await page.getByRole('button',{name:'Continue to save'}).click();
 await expect(page.getByRole('heading',{name:'Save the decision review'})).toBeVisible();
}
async function openCrossPlan(page:Page,options:{role?:'PW_CROSS_READER'|'PW_CROSS_GOVERNOR';run?:Record<string,unknown>;options?:Record<string,unknown>[];tradeoffs?:Record<string,unknown>[];governance_settings?:Record<string,unknown>;sections?:Record<string,unknown>}={}){
 const run={...cdoRun,...options.run};const detail={run,objectives:[cdoObjective],options:options.options||[cdoOption],tradeoffs:options.tradeoffs||[cdoTradeoff],optimization_results:[],handoffs:[],unresolved_high_impact_tradeoff_count:0};
 await openCross(page,{role:options.role||'PW_CROSS_GOVERNOR',url:`/cross-domain-optimization?review_run_id=${cdoRunId}&cdo_view=plan`,data:cdoSummary({run_detail:detail,governance_settings:options.governance_settings,owner_candidates:[{id:'90a00005-0000-4000-8000-000000000016',name:'Synthetic Owner',email:'owner@example.invalid'}],...options.sections})});
 await expect(page.locator('.cross-domain-plan-header')).toBeVisible();
}

test.describe('Cross-Domain Optimization — source-backed decisions and governance (Batch 17)',()=>{
 test('TCDO-021 free-text note is identified as human context, not analysis input',async({page})=>{
  await openCrossWizard(page);await page.getByLabel('Decision title').fill('Emergency warehouse supply');
  await page.getByLabel('Note for reviewers').fill('Human narrative only; never auto-score');
  await expect(page.getByText('This text is a human note only.',{exact:false})).toBeVisible();
  await toSourcePicker(page,'Emergency warehouse supply');
  await expect(page.getByText('Only current issues with a real next action are shown here.',{exact:false})).toBeVisible();
 });
 test('TCDO-022 continue requires three trimmed title characters',async({page})=>{
  await openCrossWizard(page);const next=page.getByRole('button',{name:'Continue',exact:true});
  await expect(next).toBeDisabled();await page.getByLabel('Decision title').fill('  ab  ');await expect(next).toBeDisabled();
  await page.getByLabel('Decision title').fill('  abc  ');await expect(next).toBeEnabled();
 });
 test('TCDO-023 close and reopen clears prior source selection and build summary',async({page})=>{
  await openCrossWizard(page);await toSourcePicker(page);await page.getByRole('button',{name:'Record a decision'}).first().click();
  await page.getByRole('button',{name:'Close'}).click();await page.getByRole('button',{name:'Create decision comparison'}).click();
  await expect(page.getByRole('heading',{name:'Describe the decision for the people who will review it'})).toBeVisible();
  await expect(page.locator('.cross-domain-source-comparison-card')).toHaveCount(0);
 });
 test('TCDO-024 governing role without inventory optimization read sees source permission warning',async({page})=>{
  await openCrossWizard(page,{role:'PW_CROSS_GOVERNOR_NO_SOURCE_READ'});await toSourcePicker(page);
  await expect(page.getByText('Source data is not available with your current access')).toBeVisible();
  await expect(page.getByRole('button',{name:'Record a decision'})).toHaveCount(0);
 });
 test('TCDO-025 failed source dashboard read shows distinct source warning',async({page})=>{
  await openCrossWizard(page,{sourceStatus:503});await toSourcePicker(page);
  await expect(page.getByText('Source-backed actions could not be loaded')).toBeVisible();
  await expect(page.getByRole('button',{name:'Record a decision'})).toHaveCount(0);
 });
 test('TCDO-026 no current structured actions displays explicit empty state',async({page})=>{
  await openCrossWizard(page,{items:[]});await toSourcePicker(page);
  await expect(page.getByText('Nothing currently needs a Cross-Domain decision')).toBeVisible();
 });
 test('TCDO-027 governor with read-only source evidence cannot invoke Check again builders',async({page})=>{
  await openCrossWizard(page,{role:'PW_CROSS_GOVERNOR_SOURCE_READ_ONLY',items:[]});await toSourcePicker(page);
  await expect(page.getByRole('button',{name:'Check again'})).toBeDisabled();
 });
 test('TCDO-028 Check again sends exactly seven source planning POSTs before refresh',async({page})=>{
  await openCrossWizard(page,{items:[]});await toSourcePicker(page);
  const paths:string[]=[];await page.route('**/optimization-plans/**',route=>{
   if(route.request().method()==='POST'){paths.push(new URL(route.request().url()).pathname);return fulfillJson(route,{item_count:1},200);}
   return route.continue();
  });
  await page.getByRole('button',{name:'Check again'}).click();
  await expect.poll(()=>paths.length).toBe(7);
  expect(paths.filter(p=>p.endsWith('/facility-balancing'))).toHaveLength(3);
  for(const p of ['/replenishment','/bottlenecks','/labor-forecast','/sla-risk'])expect(paths.some(x=>x.endsWith(p))).toBeTruthy();
 });
 test('TCDO-029 partial builder failure is reported rather than suggesting all source checks succeeded',async({page})=>{
  await openCrossWizard(page,{items:[]});await toSourcePicker(page);
  await page.route('**/optimization-plans/**',route=>route.request().method()!=='POST'?route.continue():fulfillJson(route,route.request().url().includes('/replenishment')?{message:'Synthetic builder error'}:{item_count:0},route.request().url().includes('/replenishment')?503:200));
  await page.getByRole('button',{name:'Check again'}).click();
  await expect(page.getByText('Some planning checks could not be completed',{exact:false})).toBeVisible();
 });
 test('TCDO-030 hides source records not in candidate or recommended status',async({page})=>{
  await openCrossWizard(page,{items:[firstSource,{...secondSource,status:'archived'}, {...unrelatedSource,status:'rejected'}]});await toSourcePicker(page);
  await expect(page.locator('.cross-domain-decision-card')).toHaveCount(1);
 });
 test('TCDO-031 duplicate source recommendation identity shown once',async({page})=>{
  await openCrossWizard(page,{items:[firstSource,{...firstSource,id:'pw-new-row',plan_id:'pw-new-plan'}]});await toSourcePicker(page);
  await expect(page.locator('.cross-domain-decision-card')).toHaveCount(1);
 });
 test('TCDO-032 distinct actions sharing product scope permit Compare selected',async({page})=>{
  await openCrossWizard(page,{items:[firstSource,secondSource]});await toSourcePicker(page);
  await page.locator('.cross-domain-compare-toggle input').first().check();await page.locator('.cross-domain-compare-toggle input').nth(1).check();
  await expect(page.getByRole('button',{name:'Compare selected'})).toBeEnabled();await page.getByRole('button',{name:'Compare selected'}).click();
  await expect(page.getByRole('heading',{name:'Compare the source data'})).toBeVisible();
 });
 test('TCDO-033 unrelated business subjects never offer selectable comparison pair',async({page})=>{
  await openCrossWizard(page,{items:[firstSource,unrelatedSource]});await toSourcePicker(page);
  await expect(page.locator('.cross-domain-decision-card')).toHaveCount(2);
  await expect(page.locator('.cross-domain-compare-toggle')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Compare selected'})).toHaveCount(0);
 });
 test('TCDO-034 single action goes straight to source review without fictional second option',async({page})=>{
  await openCrossWizard(page,{items:[firstSource]});await toSourcePicker(page);
  await page.getByRole('button',{name:'Record a decision'}).click();
  await expect(page.getByRole('heading',{name:'Review the source data'})).toBeVisible();
  await expect(page.locator('.cross-domain-source-comparison-card')).toHaveCount(1);
 });
 test('TCDO-035 source workflow navigation is tied to actual source type and permission',async({page})=>{
  await openCrossWizard(page,{items:[firstSource]});await toSourcePicker(page);
  await expect(page.getByRole('button',{name:'Open Replenishment Planning'})).toHaveCount(1);
  await expect(page.getByRole('button',{name:'Open affected task'})).toHaveCount(0);
 });
 test('TCDO-036 common impact rows appear only for facts shared across two actions',async({page})=>{
  await openCrossWizard(page,{items:[firstSource,{...secondSource,impact_snapshot:{recommended_quantity:12,recommendation_mode:'procure',only_right_side:9}}]});await toSourcePicker(page);
  await page.locator('.cross-domain-compare-toggle input').first().check();await page.locator('.cross-domain-compare-toggle input').nth(1).check();await page.getByRole('button',{name:'Compare selected'}).click();
  await expect(page.getByText('Directly comparable source fields')).toBeVisible();
  await expect(page.locator('.cross-domain-common-metric')).not.toHaveCount(0);
  await expect(page.getByText('only_right_side')).toHaveCount(0);
 });
 test('TCDO-037 save summary retains reviewer note and the source action only',async({page})=>{
  await openCrossWizard(page);await page.getByLabel('Decision title').fill('Stock response choice');
  await page.getByLabel('Note for reviewers').fill('Check stock shortages with the warehouse manager');
  await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByRole('button',{name:'Record a decision'}).click();
  await page.getByRole('button',{name:'Continue to save'}).click();
  await expect(page.getByText('Check stock shortages with the warehouse manager')).toBeVisible();
  await expect(page.getByText('1 source-backed action')).toBeVisible();
 });
 test('TCDO-038 review POST sends exact structured recommendation identifiers and null aggregate score',async({page})=>{
  await openCrossWizard(page);await toSingleSourceSave(page);
  let request:Record<string,any>={};await page.route(reviewPostEndpoint,route=>{request=route.request().postDataJSON();return fulfillJson(route,{optimization_run_id:cdoRunId});});
  await page.getByRole('button',{name:'Save decision review'}).click();
  await expect.poll(()=>request.source_reference?.recommendation_ids?.[0]).toBe(firstSource.id);
  expect(request.decision_reference.human_text_not_analyzed).toBe(true);
  expect(request.options[0].aggregate_score).toBeNull();
  expect(request.source_reference.plan_ids).toEqual([firstSource.plan_id]);
 });
 test('TCDO-039 failed review POST preserves wizard and displays source-safe error',async({page})=>{
  await openCrossWizard(page);await toSingleSourceSave(page);
  await page.route(reviewPostEndpoint,route=>fulfillJson(route,{message:'Synthetic write failure'},503));
  await page.getByRole('button',{name:'Save decision review'}).click();
  await expect(page.getByText('The data-backed decision review could not be created. The source records were not changed.')).toBeVisible();
  await expect(page.getByRole('heading',{name:'Save the decision review'})).toBeVisible();
 });
 test('TCDO-040 successful source-backed review selects returned run in plan URL',async({page})=>{
  await openCrossWizard(page);await toSingleSourceSave(page);
  await page.route(reviewPostEndpoint,route=>fulfillJson(route,{optimization_run_id:cdoRunId}));
  await page.getByRole('button',{name:'Save decision review'}).click();
  await expect(page).toHaveURL(new RegExp(`review_run_id=${cdoRunId}`));await expect(page).toHaveURL(/cdo_view=plan/);
 });
 test('TCDO-041 governor sends run ownership, deadline, and next action to exact run URL',async({page})=>{
  await openCrossPlan(page);let url='';let body:Record<string,any>={};
  await page.route('**/decision-intelligence/cross-domain-optimization/runs/*/action',route=>{url=route.request().url();body=route.request().postDataJSON();return fulfillJson(route,{ok:true});});
  const section=cdoSection(page,'Ownership and next action');await section.getByLabel('Owner').selectOption('90a00005-0000-4000-8000-000000000016');
  await section.getByLabel('Due date').fill('2026-12-15');await section.getByLabel('Next required action').fill('Human approval required');
  await section.getByRole('button',{name:'Save ownership and next action'}).click();await expect.poll(()=>body.action).toBe('update_ownership');
  expect(url).toContain(`/runs/${cdoRunId}/action`);expect(body).toMatchObject({owner_user_id:'90a00005-0000-4000-8000-000000000016',next_action:'Human approval required'});
 });
 test('TCDO-042 select option mutates explicit option id; current selected choice is disabled',async({page})=>{
  await openCrossPlan(page,{run:{selected_option_id:'90a00006-0000-4000-8000-000000000016'},options:[{...cdoOption,id:'90a00006-0000-4000-8000-000000000016',title:'Already selected'}, {...cdoOption,id:'90a00007-0000-4000-8000-000000000016',title:'Alternative option'}]});
  let body:Record<string,any>={};await page.route('**/decision-intelligence/cross-domain-optimization/runs/*/action',route=>{body=route.request().postDataJSON();return fulfillJson(route,{ok:true});});
  await expect(page.getByRole('button',{name:'Selected for review'})).toBeDisabled();
  await page.getByRole('button',{name:'Select this option'}).click();await expect.poll(()=>body.action).toBe('select_option');
  expect(body.option_id).toBe('90a00007-0000-4000-8000-000000000016');
 });
 test('TCDO-043 tradeoff governance POST stores reason and conditions only when user records',async({page})=>{
  await openCrossPlan(page);let body:Record<string,any>={};
  await page.route('**/decision-intelligence/cross-domain-optimization/tradeoffs/*/governance',route=>{body=route.request().postDataJSON();return fulfillJson(route,{ok:true});});
  const card=page.locator('.cross-domain-tradeoff-card').first();await card.getByPlaceholder('Reason for the decision').fill('Risk reviewed manually');
  await card.getByPlaceholder('Conditions, if any').fill('Check before moving stock');
  await card.locator('select').selectOption('accepted_with_conditions');expect(body).toEqual({});
  await card.getByRole('button',{name:'Record tradeoff decision'}).click();
  await expect.poll(()=>body.governance_status).toBe('accepted_with_conditions');
  expect(body).toMatchObject({reason:'Risk reviewed manually',conditions:'Check before moving stock'});
 });
 test('TCDO-044 cannot request formal Intelligence Review without selected option',async({page})=>{
  await openCrossPlan(page,{run:{selected_option_id:null}});
  await expect(page.getByRole('button',{name:'Select an option before requesting review'})).toBeDisabled();
 });
 test('TCDO-045 reader sees plan evidence but none of the governor-only mutations',async({page})=>{
  await openCrossPlan(page,{role:'PW_CROSS_READER'});
  await expect(cdoSection(page,'Compare the options')).toBeVisible();
  await expect(page.getByRole('button',{name:'Save ownership and next action'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Record tradeoff decision'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Save governance settings'})).toHaveCount(0);
 });
 test('TCDO-046 advanced thresholds and cadence sent as numbers/enum by PUT',async({page})=>{
  await openCrossPlan(page);let body:Record<string,any>={};
  await page.route('**/decision-intelligence/cross-domain-optimization/settings',route=>{body=route.request().postDataJSON();return fulfillJson(route,{ok:true});});
  await page.locator('details.cross-domain-advanced summary').click();
  await page.getByLabel('High-impact tradeoff threshold (0–1)').fill('0.6');
  await page.getByLabel('Minimum objectives').fill('3');
  await page.getByRole('button',{name:'Save governance settings'}).click();
  await expect.poll(()=>body.minimum_objective_count).toBe(3);expect(body.high_impact_tradeoff_threshold).toBe(0.6);
 });
 test('TCDO-047 selected run readiness cards distinguish missing assessment from checks',async({page})=>{
  await openCross(page,{url:`/cross-domain-optimization?review_run_id=${cdoRunId}&cdo_view=readiness`,data:cdoSummary({run_detail:{run:cdoRun,objectives:[cdoObjective],options:[cdoOption],tradeoffs:[],optimization_results:[]},execution_feedback_loop:{assessment_available:false,feedback_checks:[]}})});
  await expect(page.getByRole('heading',{name:'These checks use only the selected planning run'})).toBeVisible();
  await expect(page.getByText('This review is not assessed because the selected run does not yet have the required evidence.',{exact:false})).toBeVisible();
 });
 test('TCDO-048 Learning Feedback route includes exact run and selected option',async({page})=>{
  await openCrossPlan(page,{run:{selected_option_id:cdoOption.id}});await page.getByRole('button',{name:'Open Learning Feedback'}).first().click();
  await expect(page).toHaveURL(new RegExp(`source_id=${cdoRunId}`));await expect(page).toHaveURL(new RegExp(`option_id=${cdoOption.id}`));
 });
 test('TCDO-049 deprecated manual wizard is not exposed even with governing permission',async({page})=>{
  await openCrossWizard(page);await expect(page.getByRole('heading',{name:'Compare different actions before management decides'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Add another priority'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Review or compare actions from application data'})).toBeVisible();
 });
 test('TCDO-050 even approved plan explicitly requires action in originating source workflow',async({page})=>{
  await openCrossPlan(page,{run:{optimization_status:'approved_for_manual_planning',selected_option_id:cdoOption.id}});
  await expect(page.getByText('The recommendation is approved, but the operational change still has to be carried out in its source workflow.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Send selected option to Intelligence Review'})).toHaveCount(0);
 });
});
