import { test, expect, type Page } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 12: source-grounded AI Copilot read-only analysis UI and run history.
// All API data is synthetic. No applications/tests were executed during code generation.
const capsEndpoint='**/ai-operations-copilot/capabilities';
const historyEndpoint='**/ai-operations-copilot/runs?*';
const runEndpoint='**/ai-operations-copilot/runs/pw-copilot-*';
const now='2026-10-20T10:00:00.000Z';
const intentNames=[
 'operational_priority_summary','product_risk_explanation','product_replenishment_plan',
 'supplier_performance_summary','prepare_min_stock_proposal','prepare_standard_cost_proposal'
];
function capabilities(overrides:Record<string,unknown>={}){
 return {
  feature:'ai_operations_copilot',mode:'local_rules',can_run:true,can_create_execution_request_after_review:false,
  intents:intentNames.map(intent=>({intent,label:intent,description:'Synthetic capability',required_inputs:[] as string[],required_permissions:[] as string[],proposal_supported:intent.startsWith('prepare_'),available:true,missing_permissions:[] as string[]})),
  provider:{configured_provider:'local_rules',effective_mode:'local_rules',external_provider_ready:false,fallback_to_local:false,response_storage_at_provider_disabled:true,external_processing_confirmation_required:false},
  run_limits:{window_minutes:60,user_limit:20,tenant_limit:60,user_runs_used:3,tenant_runs_used:7},
  safety_contract:{non_mutation:true,human_review_required:true},...overrides
 };
}
function run(id='pw-copilot-001',extras:Record<string,unknown>={}){
 return {id,intent:'operational_priority_summary',user_prompt:'Synthetic operational priority question',run_status:'completed',provider:'local_rules',external_processing_confirmed:false,data_shared_externally:false,confidence_score:0.72,
  safety_classification:'read_only',created_at:now,updated_at:now,completed_at:now,
  response_snapshot:{answer:'Synthetic stock and alert evidence summary',highlights:['Synthetic unresolved alert'],evidence:[{kind:'alert',id:'pw-alert-1',label:'Permitted alert source',href:'/alerts?alert_id=pw-alert-1'},{kind:'external',label:'Untrusted external reference',href:'https://example.invalid/record'}]},
  ...extras};
}
function history(rows:ReturnType<typeof run>[]=[],total=rows.length,offset=0){return {limit:50,total,offset,rows};}
async function mockCopilot(page:Page,rows:ReturnType<typeof run>[]=[],cap=capabilities(),total=rows.length){
 await page.route(capsEndpoint,route=>fulfillJson(route,cap));
 await page.route(historyEndpoint,route=>fulfillJson(route,history(rows,total)));
 await page.route(runEndpoint,route=>fulfillJson(route,rows.find(row=>route.request().url().includes(row.id))||run()));
}
async function openCopilot(page:Page,rows:ReturnType<typeof run>[]=[],cap=capabilities(),total=rows.length){
 await loginAsTenant(page);await mockCopilot(page,rows,cap,total);
 await page.goto('/ai-copilot');
 await expect(page.getByText('Start a new analysis')).toBeVisible();
}
const analysisPanel=(page:Page)=>page.locator('form[data-skip-global-action-feedback="true"]');
const historyList=(page:Page)=>page.locator('.ai-copilot-history-list');

test.describe('AI Copilot — capability, safe analysis and read-only saved history (Batch 12)',()=>{
 test('TCOP-001 loads analysis, selected result and run history sections',async({page})=>{
  await openCopilot(page);
  await expect(page.getByText('Start a new analysis')).toBeVisible();
  await expect(page.getByText('Selected result')).toBeVisible();
  await expect(page.getByText('Run history',{exact:true})).toBeVisible();
 });
 test('TCOP-002 overview states Copilot cannot execute an Execution Request',async({page})=>{
  await openCopilot(page);
  await expect(page.getByLabel('AI Copilot overview')).toContainText('What it can change');
  await expect(page.getByLabel('AI Copilot overview')).toContainText('cannot submit, approve, or execute an Execution Request');
 });
 test('TCOP-003 default intent is operational priority summary',async({page})=>{
  await openCopilot(page);
  await expect(analysisPanel(page).getByLabel('Analysis type')).toHaveValue('operational_priority_summary');
  await expect(analysisPanel(page)).toContainText('highest-priority tenant evidence');
 });
 test('TCOP-004 displays all six source-supported analysis types',async({page})=>{
  await openCopilot(page);
  const values=await analysisPanel(page).getByLabel('Analysis type').locator('option').evaluateAll(els=>els.map(el=>(el as HTMLOptionElement).value));
  expect(values).toEqual(intentNames);
 });
 test('TCOP-005 unavailable capability is disabled, not silently selectable',async({page})=>{
  const cap=capabilities();cap.intents[1].available=false;cap.intents[1].missing_permissions=['products.read'];
  await openCopilot(page,[],cap);
  await expect(analysisPanel(page).getByLabel('Analysis type').locator('option[value="product_risk_explanation"]')).toBeDisabled();
 });
 test('TCOP-006 rate-limit usage is presented from backend limits',async({page})=>{
  await openCopilot(page);
  await expect(page.getByLabel('AI Copilot overview')).toContainText('Runs this hour');
  await expect(page.getByLabel('AI Copilot overview')).toContainText('3/20');
  await expect(page.getByLabel('AI Copilot overview')).toContainText('7/60');
 });
 test('TCOP-007 local rules mode reports no external provider',async({page})=>{
  await openCopilot(page);
  await expect(page.getByLabel('AI Copilot overview')).toContainText('Not active');
  await expect(page.getByLabel('AI Copilot overview')).toContainText('Built-in rules');
 });
 test('TCOP-008 empty run list explicitly says no permitted results',async({page})=>{
  await openCopilot(page);
  await expect(historyList(page)).toContainText('No runs have been created.');
  await expect(page.getByText('No permitted Copilot runs are available.')).toBeVisible();
 });
 test('TCOP-009 history GET failure produces visible error, not fabricated runs',async({page})=>{
  await loginAsTenant(page);await mockCopilot(page);
  await page.route(historyEndpoint,route=>fulfillJson(route,{message:'Synthetic history forbidden'},403));
  await page.goto('/ai-copilot');
  await expect(page.getByText('Synthetic history forbidden')).toBeVisible();
  await expect(historyList(page).locator('.ai-copilot-history-button')).toHaveCount(0);
 });
 test('TCOP-010 saved runs show status, intent and prompt',async({page})=>{
  await openCopilot(page,[run()]);
  await expect(historyList(page).locator('.ai-copilot-history-button')).toHaveCount(1);
  await expect(historyList(page)).toContainText('Synthetic operational priority question');
  await expect(historyList(page)).toContainText('Completed');
 });
 test('TCOP-011 selecting run records URL query and requests detail',async({page})=>{
  await openCopilot(page,[run()]);let detail='';
  await page.route(runEndpoint,route=>{detail=route.request().url();return fulfillJson(route,run());});
  await historyList(page).locator('.ai-copilot-history-button').click();
  await expect(page).toHaveURL(/run_id=pw-copilot-001/);
  await expect.poll(()=>detail).toContain('/runs/pw-copilot-001');
 });
 test('TCOP-012 direct run_id deep link loads same permitted saved record',async({page})=>{
  await loginAsTenant(page);await mockCopilot(page,[run()]);
  await page.goto('/ai-copilot?run_id=pw-copilot-001');
  await expect(page.locator('.ai-copilot-result')).toContainText('Synthetic stock and alert evidence summary');
 });
 test('TCOP-013 selected run survives refresh using query parameter',async({page})=>{
  await openCopilot(page,[run()]);
  await historyList(page).locator('.ai-copilot-history-button').click();
  await expect(page).toHaveURL(/run_id=pw-copilot-001/);
  await page.reload();
  await expect(page.locator('.ai-copilot-result')).toContainText('Synthetic stock and alert evidence summary');
 });
 test('TCOP-014 saved response shows advisory snapshot and highlights',async({page})=>{
  await openCopilot(page,[run()]);
  await expect(page.locator('.ai-copilot-result')).toContainText('Values reflect the evidence captured for this run');
  await expect(page.locator('.ai-copilot-result')).toContainText('Synthetic unresolved alert');
  await expect(page.locator('.ai-copilot-result')).toContainText('not AI model confidence');
 });
 test('TCOP-015 untrusted evidence URL is rendered inert, permitted route remains navigable',async({page})=>{
  await openCopilot(page,[run()]);
  await expect(page.locator('.ai-copilot-result').getByText('Untrusted external reference')).toBeVisible();
  await expect(page.locator('.ai-copilot-result').locator('a[href^="https://example.invalid"]')).toHaveCount(0);
 });
 test('TCOP-016 history search query is trimmed and sent to backend',async({page})=>{
  await openCopilot(page,[run()]);let query='';
  await page.route(historyEndpoint,route=>{query=route.request().url();return fulfillJson(route,history([run()]));});
  await page.getByLabel('Search history').fill('  Synthetic  ');
  await expect.poll(()=>new URL(query).searchParams.get('search')).toBe('Synthetic');
 });
 test('TCOP-017 analysis-type history filter reaches backend',async({page})=>{
  await openCopilot(page,[run()]);let query='';
  await page.route(historyEndpoint,route=>{query=route.request().url();return fulfillJson(route,history([run()]));});
  await page.getByLabel('Analysis type').last().selectOption('supplier_performance_summary');
  await expect.poll(()=>new URL(query).searchParams.get('intent')).toBe('supplier_performance_summary');
 });
 test('TCOP-018 history result-status filter reaches backend',async({page})=>{
  await openCopilot(page,[run()]);let query='';
  await page.route(historyEndpoint,route=>{query=route.request().url();return fulfillJson(route,history([]));});
  await page.getByLabel('Result',{exact:true}).selectOption('failed');
  await expect.poll(()=>new URL(query).searchParams.get('status')).toBe('failed');
 });
 test('TCOP-019 date range and product filter are sent without writes',async({page})=>{
  await openCopilot(page,[run()]);let query='';
  await page.route(historyEndpoint,route=>{query=route.request().url();return fulfillJson(route,history([]));});
  await page.getByLabel('Product',{exact:true}).last().fill('Synthetic filter');
  await page.getByLabel('From date').fill('2026-10-01');
  await page.getByLabel('To date').fill('2026-10-31');
  await expect.poll(()=>new URL(query).searchParams.get('created_to')).toBe('2026-10-31');
  expect(new URL(query).searchParams.get('product_search')).toBe('Synthetic filter');
  expect(new URL(query).searchParams.get('created_from')).toBe('2026-10-01');
 });
 test('TCOP-020 older/newer history pages navigate by 50 and reset safely',async({page})=>{
  await openCopilot(page,[run()],capabilities(),51);let offset=-1;
  await page.route(historyEndpoint,route=>{offset=Number(new URL(route.request().url()).searchParams.get('offset'));return fulfillJson(route,history([run()],51,offset));});
  await page.getByLabel('Run history pagination').getByRole('button',{name:'Older'}).click();
  await expect.poll(()=>offset).toBe(50);
  await page.getByLabel('Run history pagination').getByRole('button',{name:'Newer'}).click();
  await expect.poll(()=>offset).toBe(0);
 });
});

// Batch 13 — substantive browser-observable Copilot proposals, consent, feedback,
// read-only filters and governed POST contracts. Never run on production.
import { loginAsDisposableRole } from '../../../support/roleSession';
const productsEndpoint = '**/ai-operations-copilot/products?*';
const minEndpoint = '**/ai-operations-copilot/minimum-stock-recommendation/*';
const costEndpoint = '**/ai-operations-copilot/standard-cost-evidence/*';
const createEndpoint = '**/ai-operations-copilot/runs';
const reviewEndpoint = '**/ai-operations-copilot/runs/*/replenishment-review-proposal';
const feedbackEndpoint = '**/ai-operations-copilot/runs/*/feedback';
const product = {id:'pw-product-13',name:'Synthetic coffee beans',sku:'PW13-COFFEE',unit:'kg',min_stock:5,standard_unit_cost:8};
const stockRecommendation = {
 product_id:product.id, product_name:product.name, unit:'kg', method:'deterministic',formula_version:'pw-v1',formula:'daily demand × coverage + safety',
 recommendation_status:'calculated',current_min_stock:5,recommended_min_stock:12,raw_recommended_min_stock:11.5,direction:'increase',would_change:true,confidence_score:0.85,confidence_meaning:'Synthetic evidence quality',
 inputs:{lookback_days:90,recent_window_days:30,total_outbound_90d:270,total_outbound_30d:100,observed_days_90d:90,observed_days_30d:30,average_daily_usage_90d:3,average_daily_usage_30d:3.33,selected_daily_demand:3.3,daily_demand_stddev_90d:0.5,outbound_events_90d:36,active_usage_days_90d:25,outbound_history_days:90,lead_time_configured:true,configured_lead_time_days:3,lead_time_buffer_days:0,supplier_delay_sample_count:0,average_supplier_delay_days:0,supplier_delay_buffer_days:0,effective_coverage_days:3,service_factor:1.4,units_per_package:6,package_rounding_applied:false,base_unit_increment:1},
 calculation:{expected_lead_time_demand:10,safety_stock:2,before_package_rounding:12,after_package_rounding:12,before_base_unit_rounding:12,after_base_unit_rounding:12},
 operational_context:{current_stock:7,visible_open_inbound_quantity:2,unresolved_alert_count:0}, assumptions:['Synthetic demand sample'],warnings:[]
};
const costEvidence = {
 product_id:product.id,product_name:product.name,tenant_currency:'EUR',current_standard_unit_cost:8,latest_unit_cost:9,latest_cost_at:now,
 weighted_average_unit_cost_90d:10,min_unit_cost_90d:8,max_unit_cost_90d:12,costed_movement_count_90d:5,
 supplier_catalog_unit_cost:10,supplier_catalog_currency:'EUR',suggested_reference_unit_cost:10,
 suggested_reference_basis:'weighted_average_90d',warnings:['Synthetic sample only']
};
function governedProposal(extras:Record<string,unknown>={}) {
 return run('pw-copilot-013',{intent:'prepare_min_stock_proposal',proposal_snapshot:{request_type:'product_min_stock_update',title:'Coffee threshold proposal',payload:{product_id:product.id,product_name:product.name,min_stock:12,previous_min_stock:5,system_recommended_min_stock:12},human_review_required:true,direct_mutation_performed:false,autonomous_execution_allowed:false},source_action_id:'pw-review-13',...extras});
}
async function withProduct(page:Page, intent:'product_risk_explanation'|'product_replenishment_plan'|'prepare_min_stock_proposal'|'prepare_standard_cost_proposal') {
 await page.route(productsEndpoint,route=>fulfillJson(route,[product]));
 await page.route(minEndpoint,route=>fulfillJson(route,stockRecommendation));
 await page.route(costEndpoint,route=>fulfillJson(route,costEvidence));
 await openCopilot(page);
 await analysisPanel(page).getByLabel('Analysis type').selectOption(intent);
 await analysisPanel(page).locator('select').nth(1).selectOption(product.id);
}
const submitButton=(page:Page)=>analysisPanel(page).locator('button[type="submit"]');

// 021–030 history filtering, saved result error, external-data and account permissions.
test.describe('AI Copilot — history and permission completion (Batch 13)',()=>{
 test('TCOP-021 product-name search is sent independently as trimmed product_search',async({page})=>{
  await openCopilot(page,[run()]);let url='';
  await page.route(historyEndpoint,route=>{url=route.request().url();return fulfillJson(route,history([]));});
  await page.getByLabel('Product',{exact:true}).last().fill('  synthetic coffee  ');
  await expect.poll(()=>new URL(url).searchParams.get('product_search')).toBe('synthetic coffee');
  expect(new URL(url).searchParams.get('search')).toBeNull();
 });
 test('TCOP-022 clear filters removes all filter params and resets to offset zero',async({page})=>{
  await openCopilot(page,[run()],capabilities(),70);let url='';
  await page.route(historyEndpoint,route=>{url=route.request().url();return fulfillJson(route,history([run()],70,Number(new URL(route.request().url()).searchParams.get('offset'))));});
  await page.getByLabel('Search history').fill('coffee');
  await page.getByLabel('Result',{exact:true}).selectOption('failed');
  await page.getByLabel('From date').fill('2026-10-01');
  await page.getByRole('button',{name:'Clear history filters'}).click();
  await expect.poll(()=>new URL(url).searchParams.get('offset')).toBe('0');
  expect(['search','status','intent','product_search','created_from','created_to'].every(key=>!new URL(url).searchParams.has(key))).toBe(true);
  await expect(page.getByLabel('Search history')).toHaveValue('');
 });
 test('TCOP-023 no matching filtered history shows explicit empty state',async({page})=>{
  await openCopilot(page,[run()]);
  await page.route(historyEndpoint,route=>fulfillJson(route,history([])));
  await page.getByLabel('Search history').fill('absent-product-xyz');
  await expect(historyList(page)).toContainText('No runs have been created.');
  await expect(historyList(page).locator('button')).toHaveCount(0);
 });
 test('TCOP-024 missing selected run exposes an error and clear-selection recovery',async({page})=>{
  await loginAsTenant(page);await mockCopilot(page,[]);
  await page.route(runEndpoint,route=>fulfillJson(route,{message:'Synthetic run does not exist'},404));
  await page.goto('/ai-copilot?run_id=pw-copilot-gone');
  await expect(page.getByText('Synthetic run does not exist')).toBeVisible();
  await page.getByRole('button',{name:'Clear selection'}).click();
  await expect(page).not.toHaveURL(/run_id=/);
 });
 test('TCOP-025 clearing an existing selected result removes run_id deep link',async({page})=>{
  await openCopilot(page,[run()]);
  await historyList(page).locator('button').first().click();
  await expect(page).toHaveURL(/run_id=pw-copilot-001/);
  // The clear button is only shown when the selected run cannot be retrieved.
  await page.route(runEndpoint,route=>fulfillJson(route,{message:'Synthetic selected run revoked'},403));
  await page.reload();
  await page.getByRole('button',{name:'Clear selection'}).click();
  await expect(page).not.toHaveURL(/run_id=/);
 });
 test('TCOP-026 failed saved run displays its stored error, not a success answer',async({page})=>{
  await openCopilot(page,[run('pw-copilot-001',{run_status:'failed',error_message:'Synthetic provider timeout'})]);
  await expect(page.locator('.ai-copilot-result')).toContainText('Synthetic provider timeout');
  await expect(page.locator('.ai-copilot-result')).not.toContainText('Synthetic stock and alert evidence summary');
 });
 test('TCOP-027 completed result discloses when evidence was shared externally',async({page})=>{
  await openCopilot(page,[run('pw-copilot-001',{data_shared_externally:true,external_processing_confirmed:true,provider:'openai_responses'})]);
  await expect(page.locator('.ai-copilot-result')).toContainText('Evidence shared externally');
  await expect(page.locator('.ai-copilot-result')).toContainText('External data sharing');
 });
 test('TCOP-028 restricted reviewer cannot see technical audit details',async({page})=>{
  await loginAsDisposableRole(page,'PW_RESTRICTED');await mockCopilot(page,[run()]);await page.goto('/ai-copilot');
  await expect(page.getByText('Start a new analysis')).toBeVisible();
  await expect(page.getByText('Technical / audit details')).toHaveCount(0);
 });
 test('TCOP-029 server can_run false disables submit and displays unavailable reason',async({page})=>{
  await openCopilot(page,[],capabilities({can_run:false,run_unavailable_reason:'Synthetic hourly run limit reached'}));
  await expect(submitButton(page)).toBeDisabled();
  await expect(page.getByText('Synthetic hourly run limit reached').first()).toBeVisible();
 });
 test('TCOP-030 reviewer with no governance permission sees history but cannot submit',async({page})=>{
  await loginAsDisposableRole(page,'PW_RESTRICTED');await mockCopilot(page,[run()]);await page.goto('/ai-copilot');
  await expect(historyList(page)).toContainText('Synthetic operational priority question');
  await expect(submitButton(page)).toBeDisabled();
  await expect(page.getByText('Your role can view permitted history but cannot start analyses.')).toBeVisible();
 });
});

// 031–042 product inputs and safe governed creation. All POST endpoints intercepted.
test.describe('AI Copilot — product calculations and write-precondition UX (Batch 13)',()=>{
 test('TCOP-031 product-risk analysis requires a selected product',async({page})=>{
  await openCopilot(page);await analysisPanel(page).getByLabel('Analysis type').selectOption('product_risk_explanation');
  await expect(analysisPanel(page).getByLabel('Search products')).toBeVisible();
  await expect(submitButton(page)).toBeDisabled();
 });
 test('TCOP-032 product lookup trims search and limits to 25 results',async({page})=>{
  let url='';await loginAsTenant(page);await mockCopilot(page);
  await page.route(productsEndpoint,route=>{url=route.request().url();return fulfillJson(route,[product]);});
  await page.goto('/ai-copilot');
  await analysisPanel(page).getByLabel('Analysis type').selectOption('product_risk_explanation');
  await analysisPanel(page).getByLabel('Search products').fill('  coffee  ');
  await expect.poll(()=>new URL(url).searchParams.get('search')).toBe('coffee');
  expect(new URL(url).searchParams.get('limit')).toBe('25');
  await expect(analysisPanel(page).locator(`option[value="${product.id}"]`)).toHaveCount(1);
 });
 test('TCOP-033 minimum-stock recommendation displays numerical input evidence and advisory separation',async({page})=>{
  await withProduct(page,'prepare_min_stock_proposal');
  await expect(analysisPanel(page)).toContainText('Recommended minimum stock:');
  await expect(analysisPanel(page)).toContainText('Demand used/day');
  await expect(analysisPanel(page)).toContainText('Package size and minimum-order rules are intentionally excluded');
  await expect(analysisPanel(page).getByLabel('Final proposed minimum stock')).toHaveValue('12');
 });
 test('TCOP-034 unchanged minimum-stock proposal is rejected before POST',async({page})=>{
  await withProduct(page,'prepare_min_stock_proposal');
  await analysisPanel(page).getByLabel('Final proposed minimum stock').fill('5');
  await expect(analysisPanel(page)).toContainText('there is no change to propose');
  await expect(submitButton(page)).toBeDisabled();
 });
 test('TCOP-035 threshold override requires an explanation and preserves the reason for review',async({page})=>{
  await withProduct(page,'prepare_min_stock_proposal');
  await analysisPanel(page).getByLabel('Final proposed minimum stock').fill('16');
  await expect(analysisPanel(page).getByLabel('Why are you overriding the threshold recommendation?')).toBeVisible();
  await expect(submitButton(page)).toBeDisabled();
  await analysisPanel(page).getByLabel('Why are you overriding the threshold recommendation?').fill('  Seasonal demand  ');
  await expect(submitButton(page)).toBeEnabled();
  let payload:Record<string,unknown>={};
  await page.route(createEndpoint,async route=>{payload=route.request().postDataJSON();await fulfillJson(route,governedProposal());});
  await submitButton(page).click();
  await expect.poll(()=>payload.min_stock_override_reason).toBe('Seasonal demand');
  expect(payload.proposed_min_stock).toBe(16);
 });
 test('TCOP-036 standard-cost proposal displays current cost and 90-day source evidence',async({page})=>{
  await withProduct(page,'prepare_standard_cost_proposal');
  await expect(analysisPanel(page)).toContainText('90-day weighted cost');
  await expect(analysisPanel(page)).toContainText('Current standard cost');
  await expect(analysisPanel(page).getByLabel('Proposed standard unit cost')).toHaveValue('10');
 });
 test('TCOP-037 unchanged standard cost cannot be proposed',async({page})=>{
  await withProduct(page,'prepare_standard_cost_proposal');
  await analysisPanel(page).getByLabel('Proposed standard unit cost').fill('8');
  await expect(analysisPanel(page)).toContainText('there is no change to propose');
  await expect(submitButton(page)).toBeDisabled();
 });
 test('TCOP-038 material standard-cost override needs justification greater than ten percent',async({page})=>{
  await withProduct(page,'prepare_standard_cost_proposal');
  await analysisPanel(page).getByLabel('Proposed standard unit cost').fill('12');
  await expect(analysisPanel(page).getByLabel('Why use a materially different standard cost?')).toBeVisible();
  await expect(submitButton(page)).toBeDisabled();
  await analysisPanel(page).getByLabel('Why use a materially different standard cost?').fill('  Updated supplier contract  ');
  await expect(submitButton(page)).toBeEnabled();
  let payload:Record<string,unknown>={};
  await page.route(createEndpoint,async route=>{payload=route.request().postDataJSON();await fulfillJson(route,governedProposal({intent:'prepare_standard_cost_proposal'}));});
  await submitButton(page).click();
  await expect.poll(()=>payload.standard_cost_override_reason).toBe('Updated supplier contract');
  expect(payload.proposed_standard_unit_cost).toBe(12);
 });
 test('TCOP-039 external provider requires explicit consent before analysis',async({page})=>{
  const cap=capabilities({provider:{configured_provider:'openai_responses',effective_mode:'openai_responses',external_provider_ready:true,fallback_to_local:false,response_storage_at_provider_disabled:true,external_processing_confirmation_required:true}});
  await openCopilot(page,[],cap);
  const consent=analysisPanel(page).getByRole('checkbox');
  await expect(consent).not.toBeChecked();await expect(submitButton(page)).toBeDisabled();
  await consent.check();await expect(submitButton(page)).toBeEnabled();
 });
 test('TCOP-040 editing the analysis prompt resets previously granted external consent',async({page})=>{
  const cap=capabilities({provider:{configured_provider:'openai_responses',effective_mode:'openai_responses',external_provider_ready:true,fallback_to_local:false,response_storage_at_provider_disabled:true,external_processing_confirmation_required:true}});
  await openCopilot(page,[],cap);const consent=analysisPanel(page).getByRole('checkbox');
  await consent.check();await expect(submitButton(page)).toBeEnabled();
  await analysisPanel(page).getByLabel('Question or instructions').fill('Updated synthetic question');
  await expect(consent).not.toBeChecked();await expect(submitButton(page)).toBeDisabled();
 });
 test('TCOP-041 creating a read-only run posts only intent, trimmed prompt and false consent',async({page})=>{
  await openCopilot(page);let payload:Record<string,unknown>={};
  await page.route(createEndpoint,async route=>{payload=route.request().postDataJSON();await fulfillJson(route,run('pw-copilot-013'));});
  await analysisPanel(page).getByLabel('Reason for this analysis').fill('  Synthetic operations review  ');
  await submitButton(page).click();
  await expect.poll(()=>payload.prompt).toBe('Synthetic operations review');
  expect(Object.keys(payload).sort()).toEqual(['external_processing_confirmed','intent','prompt']);
  expect(payload.intent).toBe('operational_priority_summary');expect(payload.external_processing_confirmed).toBe(false);
 });
 test('TCOP-042 failed POST displays backend error and preserves selected intent and prompt',async({page})=>{
  await openCopilot(page);await page.route(createEndpoint,route=>fulfillJson(route,{message:'Synthetic run forbidden'},403));
  await analysisPanel(page).getByLabel('Reason for this analysis').fill('Reason retained');
  await submitButton(page).click();
  await expect(page.getByText('Synthetic run forbidden').first()).toBeVisible();
  await expect(analysisPanel(page).getByLabel('Reason for this analysis')).toHaveValue('Reason retained');
  await expect(analysisPanel(page).getByLabel('Analysis type')).toHaveValue('operational_priority_summary');
 });
});

// 043–050 governed proposals, feedback and source links; never mutate live records.
test.describe('AI Copilot — review handoff and feedback (Batch 13)',()=>{
 test('TCOP-043 governed proposal shows human review and links to Intelligence Review',async({page})=>{
  await openCopilot(page,[governedProposal()]);
  await expect(page.locator('.ai-copilot-result')).toContainText('Human review required');
  await expect(page.locator('.ai-copilot-result')).toContainText('No product field has changed');
  await expect(page.locator('.ai-copilot-result').getByRole('link',{name:'Open in Intelligence Review'})).toHaveAttribute('href','/intelligence-review?source_action_id=pw-review-13');
 });
 test('TCOP-044 replenishment review requires full procurement permissions',async({page})=>{
  await loginAsDisposableRole(page,'PW_RESTRICTED');
  await mockCopilot(page,[run('pw-copilot-013',{intent:'product_replenishment_plan'})]);
  await page.goto('/ai-copilot');
  await expect(page.getByRole('button',{name:'Send recommendation for review'})).toBeDisabled();
  await expect(page.getByText('Additional procurement access is required')).toBeVisible();
 });
 test('TCOP-045 replenishment handoff POST creates review recommendation, never a PO',async({page})=>{
  await loginAsDisposableRole(page,'PW_GOVERNOR');
  await mockCopilot(page,[run('pw-copilot-013',{intent:'product_replenishment_plan'})]);
  let method='',path='';
  await page.route(reviewEndpoint,async route=>{method=route.request().method();path=route.request().url();await fulfillJson(route,governedProposal({proposal_snapshot:{request_type:'replenishment_purchase_order_draft',payload:{product_name:product.name,supplier_name:'Synthetic Supplier',quantity:6,unit:'kg'}}}));});
  await page.goto('/ai-copilot');
  await page.getByRole('button',{name:'Send recommendation for review'}).click();
  await expect.poll(()=>method).toBe('POST');
  expect(path).toContain('/runs/pw-copilot-013/replenishment-review-proposal');
  await expect(page.getByText('No Purchase Order was created.').first()).toBeVisible();
 });
 test('TCOP-046 saved result offers positive and corrected negative feedback',async({page})=>{
  await openCopilot(page,[run()]);
  await page.getByRole('button',{name:'Not useful / incorrect'}).click();
  await expect(page.getByLabel('What was wrong or missing?')).toBeVisible();
  await expect(page.getByRole('button',{name:'Save feedback'})).toBeDisabled();
  await page.getByLabel('What was wrong or missing?').fill('Missing current evidence');
  await expect(page.getByRole('button',{name:'Save feedback'})).toBeEnabled();
 });
 test('TCOP-047 negative feedback sends rating and trimmed explanation to saved-run endpoint',async({page})=>{
  await openCopilot(page,[run()]);let payload:Record<string,unknown>={};
  await page.route(feedbackEndpoint,async route=>{payload=route.request().postDataJSON();await fulfillJson(route,run('pw-copilot-001',{user_feedback:{rating:'not_useful',comment:'Missing evidence'}}));});
  await page.getByRole('button',{name:'Not useful / incorrect'}).click();
  await page.getByLabel('What was wrong or missing?').fill('  Missing evidence  ');
  await page.getByRole('button',{name:'Save feedback'}).click();
  await expect.poll(()=>payload.comment).toBe('Missing evidence');
  expect(payload.rating).toBe('not_useful');
  await expect(page.getByText('Copilot feedback saved for governed learning review.')).toBeVisible();
 });
 test('TCOP-048 feedback service error shows failure, without success announcement',async({page})=>{
  await openCopilot(page,[run()]);
  await page.route(feedbackEndpoint,route=>fulfillJson(route,{message:'Synthetic feedback conflict'},409));
  await page.getByRole('button',{name:'Useful',exact:true}).click();
  await page.getByRole('button',{name:'Save feedback'}).click();
  await expect(page.getByText('Synthetic feedback conflict').first()).toBeVisible();
  await expect(page.getByText('Copilot feedback saved for governed learning review.')).toHaveCount(0);
 });
 test('TCOP-049 saved evidence only turns allowlisted tenant paths into links',async({page})=>{
  await openCopilot(page,[run('pw-copilot-001',{response_snapshot:{answer:'Synthetic evidence',evidence:[
   {kind:'product',label:'Local product',href:'/products?productId=pw-product-13'},
   {kind:'unknown',label:'Unlisted path',href:'/platform/users'},
   {kind:'unsafe',label:'External host',href:'https://example.invalid'}
  ]}})]);
  await expect(page.locator('.ai-copilot-result').getByRole('link',{name:/Local product/})).toHaveAttribute('href','/products?productId=pw-product-13');
  await expect(page.locator('.ai-copilot-result').getByText('Unlisted path')).toBeVisible();
  await expect(page.locator('.ai-copilot-result').getByRole('link',{name:/Unlisted path/})).toHaveCount(0);
  await expect(page.locator('.ai-copilot-result').getByRole('link',{name:/External host/})).toHaveCount(0);
 });
 test('TCOP-050 changing history search after pagination resets offset to zero',async({page})=>{
  await openCopilot(page,[run()],capabilities(),90);let offset=0;
  await page.route(historyEndpoint,route=>{offset=Number(new URL(route.request().url()).searchParams.get('offset'));return fulfillJson(route,history([run()],90,offset));});
  await page.getByLabel('Run history pagination').getByRole('button',{name:'Older'}).click();
  await expect.poll(()=>offset).toBe(50);
  await page.getByLabel('Search history').fill('recheck');
  await expect.poll(()=>offset).toBe(0);
  await expect(page.getByLabel('Search history')).toHaveValue('recheck');
 });
});
