import {test, expect, type Page} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant, fulfillJson} from '../../../support/tenantSession';
import {loginAsDisposableRole} from '../../../support/roleSession';

// Batch 14: source-traced policy evidence, filters, role-specific controls and recorder entry.
// Synthetic fixtures and API interception; generated only, never executed.
const policySummaryEndpoint='**/decision-intelligence/adaptive-policy-engine-summary?*';
const policyRefreshEndpoint='**/decision-intelligence/adaptive-policy-engine-refresh';
const appliedEndpoint='**/decision-intelligence/adaptive-policy-engine/policies/pw-policy-id-14/applications';
const recommendation={id:'pw-recommendation-14',policy_id:'pw-policy-id-14',policy_key:'pw-policy-key-14',source_action_id:'pw-action-14',recommendation_key:'pw-recommendation',recommendation_type:'threshold_adjustment',recommendation_status:'review_required',risk_level:'moderate',confidence_score:0.74,created_at:'2026-10-20T10:00:00Z',recommended_adjustment:{reorder_point:20}};
const policy={id:'pw-policy-id-14',policy_key:'pw-policy-key-14',title:'Synthetic reorder policy',summary:'Synthetic reorder observation',policy_domain:'inventory',policy_type:'dynamic_replenishment',policy_status:'review_required',confidence_score:0.75,current_policy:{reorder_point:10},created_at:'2026-10-18T10:00:00Z'};
const signal={policy_key:'pw-policy-key-14',signal_domain:'inventory',signal_type:'stock_risk',variance_score:0.2,weight:0.75,confidence_score:0.88,observed_at:'2026-10-19T10:00:00Z'};
function policyResponse(overrides:Record<string,unknown>={}){
 return {governance:{policy_count:1,signal_count:1,recommendation_count:1,effectiveness_measurement_count:0,application_count:0,adaptive_policy_posture:'controlled_policy_observation'},policies:[policy],signals:[signal],recommendations:[recommendation],applications:[],effectiveness:[],analysis:{analysis_generated_at:'2026-10-20T10:00:00Z'},...overrides};
}
async function openPolicy(page:Page,options:{data?:Record<string,unknown>;role?:'PW_GOVERNOR'|'PW_RESTRICTED';url?:string}={}){
 if(options.role)await loginAsDisposableRole(page,options.role);else await loginAsTenant(page);
 await page.route(policySummaryEndpoint,route=>fulfillJson(route,options.data||policyResponse()));
 await page.goto(options.url||'/adaptive-policy-engine');
 await expect(page.getByRole('heading',{name:'Adaptive Policy Engine'})).toBeVisible();
}
const policyFilters=(page:Page)=>page.getByLabel('Adaptive policy filters');
const policyEvidenceSection=(page:Page,heading:string)=>page.locator('.adaptive-policy-evidence-section').filter({has:page.getByRole('heading',{name:heading,exact:true})});

test.describe('Adaptive Policy Engine — tenant evidence and governed actions (Batch 14)',()=>{
 test('TAPE-001 Adaptive Policy Engine opens with policy evidence summary and non-automatic disclaimer',async({page})=>{
  await openPolicy(page);
  await expect(page.getByLabel('Adaptive policy evidence summary')).toContainText('Policies');
  await expect(page.getByLabel('Adaptive policy evidence summary')).toContainText('Recommendations');
  await expect(page.locator('.adaptive-policy-evidence-guide')).toContainText('still require a person to decide');
 });
 test('TAPE-002 zero policy evidence states readiness cannot be inferred',async({page})=>{
  await openPolicy(page,{data:policyResponse({governance:{policy_count:0,signal_count:0,recommendation_count:0,effectiveness_measurement_count:0,application_count:0,adaptive_policy_posture:'not_assessed_no_policy_evidence'},policies:[],signals:[],recommendations:[]})});
  await expect(page.getByRole('heading',{name:'No adaptive policy evidence is available for this tenant and filter set'})).toBeVisible();
  await expect(page.locator('.adaptive-policy-empty-state')).toContainText('Zero records do not mean that policies are safe');
 });
 test('TAPE-003 normal tenant page hides internal readiness and diagnostics tabs',async({page})=>{
  await openPolicy(page);
  await expect(page.getByRole('tablist',{name:'Adaptive policy page views'}).getByRole('tab',{name:'Policy evidence'})).toBeVisible();
  await expect(page.getByRole('tablist',{name:'Adaptive policy page views'}).getByRole('tab',{name:'Readiness checks'})).toHaveCount(0);
  await expect(page.getByRole('tablist',{name:'Adaptive policy page views'}).getByRole('tab',{name:'Diagnostics'})).toHaveCount(0);
 });
 test('TAPE-004 policies, observed signals, recommendations, applications and observations are separate evidence categories',async({page})=>{
  await openPolicy(page);
  for(const name of ['Policies','Observed signals','Policy recommendations','Applied policy changes','Current policy observations']){
   await expect(policyEvidenceSection(page,name)).toBeVisible();
  }
 });
 test('TAPE-005 policy KPI numbers use entire returned governance totals, not just list length',async({page})=>{
  await openPolicy(page,{data:policyResponse({governance:{policy_count:23,signal_count:18,recommendation_count:9,effectiveness_measurement_count:5,application_count:2,adaptive_policy_posture:'controlled_policy_observation'}})});
  const kpis=page.getByLabel('Adaptive policy evidence summary');
  await expect(kpis).toContainText('23');await expect(kpis).toContainText('18');await expect(kpis).toContainText('9');
 });
 test('TAPE-006 business-area selection propagates policy_domain server filter',async({page})=>{
  await openPolicy(page);let last='';await page.route(policySummaryEndpoint,route=>{last=route.request().url();return fulfillJson(route,policyResponse());});
  await policyFilters(page).getByLabel('Business area').selectOption('inventory');
  await expect.poll(()=>last ? new URL(last).searchParams.get('policy_domain') : null).toBe('inventory');
 });
 test('TAPE-007 policy-type filter propagates dynamic_replenishment to summary request',async({page})=>{
  await openPolicy(page);let last='';await page.route(policySummaryEndpoint,route=>{last=route.request().url();return fulfillJson(route,policyResponse());});
  await policyFilters(page).getByLabel('Policy type').selectOption('dynamic_replenishment');
  await expect.poll(()=>last ? new URL(last).searchParams.get('policy_type') : null).toBe('dynamic_replenishment');
 });
 test('TAPE-008 policy-status filter requests reviewed-for-manual-application state',async({page})=>{
  await openPolicy(page);let last='';await page.route(policySummaryEndpoint,route=>{last=route.request().url();return fulfillJson(route,policyResponse());});
  await policyFilters(page).getByLabel('Policy status').selectOption('approved_for_manual_application');
  await expect.poll(()=>last ? new URL(last).searchParams.get('policy_status') : null).toBe('approved_for_manual_application');
 });
 test('TAPE-009 recommendation-type filter is server-side and specific',async({page})=>{
  await openPolicy(page);let last='';await page.route(policySummaryEndpoint,route=>{last=route.request().url();return fulfillJson(route,policyResponse());});
  await policyFilters(page).getByLabel('Recommendation type').selectOption('threshold_adjustment');
  await expect.poll(()=>last ? new URL(last).searchParams.get('recommendation_type') : null).toBe('threshold_adjustment');
 });
 test('TAPE-010 changing per-list limit includes supported maximum of 200',async({page})=>{
  await openPolicy(page);let last='';await page.route(policySummaryEndpoint,route=>{last=route.request().url();return fulfillJson(route,policyResponse());});
  await policyFilters(page).getByLabel('Maximum records per evidence list').selectOption('200');
  await expect.poll(()=>last ? new URL(last).searchParams.get('limit') : null).toBe('200');
  await expect(page.locator('.adaptive-policy-limit-note').last()).toContainText('200');
 });
 test('TAPE-011 Clear filters resets all categories and limit to 25',async({page})=>{
  await openPolicy(page);let last='';await page.route(policySummaryEndpoint,route=>{last=route.request().url();return fulfillJson(route,policyResponse());});
  await policyFilters(page).getByLabel('Policy type').selectOption('dynamic_replenishment');
  await policyFilters(page).getByLabel('Maximum records per evidence list').selectOption('100');
  await policyFilters(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(policyFilters(page).getByLabel('Policy type')).toHaveValue('');
  await expect(policyFilters(page).getByLabel('Maximum records per evidence list')).toHaveValue('25');
  await expect.poll(()=>last ? new URL(last).searchParams.get('limit') : null).toBe('25');
  expect(new URL(last).searchParams.get('policy_type')).toBe(null);
 });
 test('TAPE-012 summary failure offers Retry and restores evidence once API succeeds',async({page})=>{
  await loginAsTenant(page);let calls=0;
  await page.route(policySummaryEndpoint,route=>{calls++;return fulfillJson(route,calls===1?{message:'Synthetic policy service unavailable'}:policyResponse(),calls===1?503:200);});
  await page.goto('/adaptive-policy-engine');
  await expect(page.getByRole('heading',{name:'Adaptive policy evidence could not be loaded'})).toBeVisible();
  await page.getByRole('button',{name:'Retry'}).click();
  await expect(page.getByRole('heading',{name:'Adaptive Policy Engine'})).toBeVisible();
  expect(calls).toBeGreaterThanOrEqual(2);
 });
 test('TAPE-013 read-only policy reviewer cannot run analysis or record approved business-rule change',async({page})=>{
  await openPolicy(page,{role:'PW_RESTRICTED',data:policyResponse({recommendations:[{...recommendation,recommendation_status:'approved_for_manual_application'}]})});
  await expect(page.getByRole('button',{name:'Run new policy analysis'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Record applied change'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Refresh page'})).toBeVisible();
 });
 test('TAPE-014 read-only page refresh reloads GET summary without POST mutation',async({page})=>{
  await openPolicy(page,{role:'PW_RESTRICTED'});let reads=0;let writes=0;
  await page.route(policySummaryEndpoint,route=>{reads++;return fulfillJson(route,policyResponse());});
  await page.route(policyRefreshEndpoint,route=>{writes++;return fulfillJson(route,{refreshed:true});});
  await page.getByRole('button',{name:'Refresh page'}).click();
  await expect.poll(()=>reads).toBeGreaterThanOrEqual(1);
  expect(writes).toBe(0);
 });
 test('TAPE-015 review-required recommendation offers authorized deep link to Intelligence Review',async({page})=>{
  await openPolicy(page,{role:'PW_GOVERNOR'});
  await expect(page.locator('#adaptive-policy-recommendation-pw-recommendation-14').getByRole('link',{name:'Review'})).toHaveAttribute('href','/intelligence-review?source_action_id=pw-action-14');
 });
 test('TAPE-016 missing source action ID never creates an invented review deep link',async({page})=>{
  await openPolicy(page,{data:policyResponse({recommendations:[{...recommendation,source_action_id:undefined}]})});
  await expect(page.locator('#adaptive-policy-recommendation-pw-recommendation-14').getByRole('link',{name:'Review'})).toHaveCount(0);
 });
 test('TAPE-017 recommendation still in human review cannot offer applied-change recorder',async({page})=>{
  await openPolicy(page,{role:'PW_GOVERNOR'});
  await expect(page.getByRole('button',{name:'Record applied change'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Record an actually applied policy change'})).toHaveCount(0);
 });
 test('TAPE-018 manual-application-approved recommendation opens record-only policy change form',async({page})=>{
  await openPolicy(page,{role:'PW_GOVERNOR',data:policyResponse({recommendations:[{...recommendation,recommendation_status:'approved_for_manual_application'}]})});
  await page.getByRole('button',{name:'Record applied change'}).click();
  const recorder=page.locator('.adaptive-policy-governance-form');
  await expect(recorder.getByRole('heading',{name:'Record an actually applied policy change'})).toBeVisible();
  await expect(recorder.getByLabel('Policy')).toHaveAttribute('readonly','');
  await expect(recorder).toContainText('It does not make the business-rule change itself');
 });
 test('TAPE-019 cancelling policy application recorder leaves no new application and returns to evidence',async({page})=>{
  await openPolicy(page,{role:'PW_GOVERNOR',data:policyResponse({recommendations:[{...recommendation,recommendation_status:'approved_for_manual_application'}]})});
  let writes=0;await page.route(appliedEndpoint,route=>{writes++;return fulfillJson(route,{id:'pw-unexpected'});});
  await page.getByRole('button',{name:'Record applied change'}).click();
  await page.locator('.adaptive-policy-governance-form').getByRole('button',{name:'Cancel'}).click();
  await expect(page.locator('.adaptive-policy-governance-form')).toHaveCount(0);
  expect(writes).toBe(0);
 });
 test('TAPE-020 applied-change recorder blocks empty or too-short change summary before POST',async({page})=>{
  await openPolicy(page,{role:'PW_GOVERNOR',data:policyResponse({recommendations:[{...recommendation,recommendation_status:'approved_for_manual_application'}]})});
  let writes=0;await page.route(appliedEndpoint,route=>{writes++;return fulfillJson(route,{id:'pw-unexpected'});});
  await page.getByRole('button',{name:'Record applied change'}).click();
  const recorder=page.locator('.adaptive-policy-governance-form');
  await expect(recorder.getByRole('button',{name:'Record applied change'})).toBeDisabled();
  await recorder.getByLabel('What was actually changed?').fill('Short');
  await expect(recorder.getByRole('button',{name:'Record applied change'})).toBeDisabled();
  expect(writes).toBe(0);
 });
});

// Batch 15: scenario IDs TAPE-021..050, source-reviewed against AdaptivePolicyEnginePage.tsx,
// adaptivePolicyEffectiveness.ts and the Express decisionIntelligence routes. Generated, NOT run.
const applicationActionEndpoint='**/decision-intelligence/adaptive-policy-engine/applications/pw-application-15/action';
const approvedRecommendation={...recommendation,recommendation_status:'approved_for_manual_application'};
const recordedApplication={id:'pw-application-15',policy_id:policy.id,policy_key:policy.policy_key,recommendation_id:recommendation.id,application_status:'applied_monitoring',previous_value:{reorder_point:10},applied_value:{reorder_point:20},change_summary:'Adjusted reorder point for monitored stock',source_workflow:'manual_business_rule_change',baseline_score:0.7,applied_at:'2026-10-21T10:00:00Z'};
const approvedResponse=()=>policyResponse({recommendations:[approvedRecommendation]});
const lifecycleResponse=(status:string)=>policyResponse({applications:[{...recordedApplication,application_status:status}],governance:{policy_count:1,signal_count:1,recommendation_count:1,effectiveness_measurement_count:0,application_count:1,adaptive_policy_posture:'controlled_policy_observation'}});
async function openApplicationForm(page:Page){
 await openPolicy(page,{role:'PW_GOVERNOR',data:approvedResponse()});
 await page.getByRole('button',{name:'Record applied change'}).click();
 return page.locator('.adaptive-policy-governance-form');
}
async function openLifecycleForm(page:Page,status:string,actionName:string){
 await openPolicy(page,{role:'PW_GOVERNOR',data:lifecycleResponse(status)});
 await page.getByRole('button',{name:actionName,exact:true}).click();
 return page.locator('.adaptive-policy-governance-form');
}

test.describe('Adaptive Policy Engine — governed writes, lifecycle and measured evidence (Batch 15)',()=>{
 test('TAPE-021 valid JSON submits governed policy application with exact prior and applied values',async({page})=>{
  const form=await openApplicationForm(page);let body:Record<string,unknown>|undefined;let method='';
  await page.route(appliedEndpoint,route=>{method=route.request().method();body=route.request().postDataJSON();return fulfillJson(route,{id:'pw-new-application-15'});});
  await form.getByLabel('Previous rule value').fill('{"reorder_point":10}');
  await form.getByLabel('Actually applied rule value').fill('{"reorder_point":25}');
  await form.getByLabel('What was actually changed?').fill('  Applied revised reorder point after approval  ');
  await form.getByRole('button',{name:'Record applied change'}).click();
  await expect.poll(()=>body).toBeDefined();
  expect(method).toBe('POST');
  expect(body).toEqual({recommendation_id:recommendation.id,previous_value:{reorder_point:10},applied_value:{reorder_point:25},change_summary:'Applied revised reorder point after approval',source_workflow:'manual_business_rule_change'});
 });
 test('TAPE-022 malformed previous-value JSON produces visible error and no API write',async({page})=>{
  const form=await openApplicationForm(page);let writes=0;
  await page.route(appliedEndpoint,route=>{writes++;return fulfillJson(route,{id:'pw-unexpected'});});
  await form.getByLabel('Previous rule value').fill('{bad-json');
  await form.getByLabel('What was actually changed?').fill('Applied a manually approved stock rule');
  await form.getByRole('button',{name:'Record applied change'}).click();
  await expect(form.locator('.adaptive-policy-form-error')).toContainText('could not be recorded');
  await expect(form.getByLabel('Previous rule value')).toHaveValue('{bad-json');
  expect(writes).toBe(0);
 });
 test('TAPE-023 applied JSON must be an object, not an array or primitive',async({page})=>{
  const form=await openApplicationForm(page);let writes=0;
  await page.route(appliedEndpoint,route=>{writes++;return fulfillJson(route,{id:'pw-unexpected'});});
  await form.getByLabel('What was actually changed?').fill('Applied a separately approved inventory rule');
  for(const invalid of ['[1,2]','42','null']){
   await form.getByLabel('Actually applied rule value').fill(invalid);
   await form.getByRole('button',{name:'Record applied change'}).click();
   await expect(form.locator('.adaptive-policy-form-error')).toBeVisible();
  }
  expect(writes).toBe(0);
 });
 test('TAPE-024 application POST conflict keeps edited draft and displays actionable error',async({page})=>{
  const form=await openApplicationForm(page);
  await page.route(appliedEndpoint,route=>fulfillJson(route,{message:'The approved recommendation has changed'},409));
  await form.getByLabel('What was actually changed?').fill('Applied approved manual threshold update');
  await form.getByRole('button',{name:'Record applied change'}).click();
  await expect(form.locator('.adaptive-policy-form-error')).toContainText('confirm the recommendation is approved');
  await expect(form.getByLabel('What was actually changed?')).toHaveValue('Applied approved manual threshold update');
 });
 test('TAPE-025 successful applied-change POST closes form and requests updated evidence',async({page})=>{
  const form=await openApplicationForm(page);let reads=0;let wrote=false;
  await page.route(policySummaryEndpoint,route=>{reads++;return fulfillJson(route,wrote?lifecycleResponse('applied_monitoring'):approvedResponse());});
  await page.route(appliedEndpoint,route=>{wrote=true;return fulfillJson(route,{id:recordedApplication.id});});
  await form.getByLabel('What was actually changed?').fill('Updated monitored reorder rule manually');
  await form.getByRole('button',{name:'Record applied change'}).click();
  await expect(form).toHaveCount(0);
  await expect.poll(()=>reads).toBeGreaterThan(0);
  await expect(policyEvidenceSection(page,'Applied policy changes')).toContainText('Adjusted reorder point');
 });
 test('TAPE-026 policy analysis POST records only an evidence snapshot and not policy applications',async({page})=>{
  await openPolicy(page,{role:'PW_GOVERNOR'});let refreshCount=0;let applications=0;
  await page.route(policyRefreshEndpoint,route=>{refreshCount++;expect(route.request().method()).toBe('POST');return fulfillJson(route,{refreshed:true});});
  await page.route(appliedEndpoint,route=>{applications++;return fulfillJson(route,{});});
  await page.getByRole('button',{name:'Run new policy analysis'}).click();
  await expect(page.getByRole('status')).toContainText('No policy changes were applied');
  expect(refreshCount).toBe(1);expect(applications).toBe(0);
 });
 test('TAPE-027 rejected analysis refresh reports that no operating rule was changed',async({page})=>{
  await openPolicy(page,{role:'PW_GOVERNOR'});
  await page.route(policyRefreshEndpoint,route=>fulfillJson(route,{message:'Evidence service unavailable'},503));
  await page.getByRole('button',{name:'Run new policy analysis'}).click();
  await expect(page.locator('.adaptive-policy-state-card--danger')).toContainText('No operating rule was changed');
 });
 test('TAPE-028 recommendation signal timeline selects newest observation by timestamp',async({page})=>{
  const signals=[{...signal,signal_type:'old_signal',variance_score:0.1,observed_at:'2026-10-01T00:00:00Z'}, {...signal,signal_type:'new_signal',variance_score:0.8,observed_at:'2026-10-31T00:00:00Z'}];
  await openPolicy(page,{data:policyResponse({signals})});
  const row=page.locator('#adaptive-policy-recommendation-pw-recommendation-14');
  await expect(row.locator('.adaptive-policy-table__subtext--timeline')).toContainText('Latest observed signal:');
  await expect(row.locator('.adaptive-policy-table__subtext--timeline')).toContainText('New signal');
  await expect(row.locator('.adaptive-policy-table__subtext--timeline')).toContainText('2');
 });
 test('TAPE-029 read-only role sees approved recommendation without governing controls',async({page})=>{
  await openPolicy(page,{role:'PW_RESTRICTED',data:approvedResponse()});
  await expect(policyEvidenceSection(page,'Policy recommendations')).toContainText('Synthetic reorder policy');
  await expect(page.getByRole('button',{name:'Record applied change'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Run new policy analysis'})).toHaveCount(0);
 });
 test('TAPE-030 unreviewed recommendation displays evidence confidence but no approval control',async({page})=>{
  await openPolicy(page,{data:policyResponse({recommendations:[{...recommendation,recommendation_status:'pending',confidence_score:0.71}]})});
  const row=page.locator('#adaptive-policy-recommendation-pw-recommendation-14');
  await expect(row).toContainText('71%');
  await expect(row).toContainText('No review needed');
  await expect(row.getByRole('button',{name:'Record applied change'})).toHaveCount(0);
 });
 test('TAPE-031 exact recommendation deep link highlights the matching row',async({page})=>{
  await openPolicy(page,{url:'/adaptive-policy-engine?source_action_id=adaptive_policy_recommendation%3Apw-recommendation-14'});
  await expect(page.locator('#adaptive-policy-recommendation-pw-recommendation-14')).toHaveClass(/adaptive-policy-table-row--focused/);
 });
 test('TAPE-032 request preserves source_action_id query value without rewriting it',async({page})=>{
  await loginAsTenant(page);let queried='';
  await page.route(policySummaryEndpoint,route=>{queried=route.request().url();return fulfillJson(route,policyResponse());});
  await page.goto('/adaptive-policy-engine?source_action_id=adaptive_policy_recommendation%3Apw-recommendation-14');
  await expect.poll(()=>new URL(queried).searchParams.get('source_action_id')).toBe('adaptive_policy_recommendation:pw-recommendation-14');
 });
 test('TAPE-033 monitoring application offers a governed reason form for recalibration',async({page})=>{
  const form=await openLifecycleForm(page,'applied_monitoring','Recalibrate');
  await expect(form.getByRole('heading',{name:'Open recalibration review'})).toBeVisible();
  await expect(form.getByLabel('Reason and evidence')).toBeVisible();
  await expect(form).toContainText('does not automatically recalibrate');
 });
 test('TAPE-034 lifecycle reason under ten trimmed characters keeps submit disabled',async({page})=>{
  const form=await openLifecycleForm(page,'applied_monitoring','Recalibrate');
  await expect(form.getByRole('button',{name:'Record governance decision'})).toBeDisabled();
  await form.getByLabel('Reason and evidence').fill('  short  ');
  await expect(form.getByRole('button',{name:'Record governance decision'})).toBeDisabled();
 });
 test('TAPE-035 recalibration review posts its exact action and trimmed reason',async({page})=>{
  const form=await openLifecycleForm(page,'applied_monitoring','Recalibrate');let body:Record<string,unknown>|undefined;
  await page.route(applicationActionEndpoint,route=>{body=route.request().postDataJSON();return fulfillJson(route,{id:recordedApplication.id});});
  await form.getByLabel('Reason and evidence').fill('  Observed operational variance requires human review  ');
  await form.getByRole('button',{name:'Record governance decision'}).click();
  await expect.poll(()=>body).toBeDefined();
  expect(body).toEqual({action:'open_recalibration_review',reason:'Observed operational variance requires human review'});
 });
 test('TAPE-036 rollback review opens a review action, not an automatic rollback',async({page})=>{
  const form=await openLifecycleForm(page,'applied_monitoring','Rollback review');let body:Record<string,unknown>|undefined;
  await page.route(applicationActionEndpoint,route=>{body=route.request().postDataJSON();return fulfillJson(route,{});});
  await expect(form).toContainText('does not automatically');
  await form.getByLabel('Reason and evidence').fill('Review evidence of adverse policy effects');
  await form.getByRole('button',{name:'Record governance decision'}).click();
  await expect.poll(()=>body).toBeDefined();expect(body?.action).toBe('open_rollback_review');
 });
 test('TAPE-037 retirement records a human governance reason with retire_policy action',async({page})=>{
  const form=await openLifecycleForm(page,'applied_monitoring','Retire');let body:Record<string,unknown>|undefined;
  await page.route(applicationActionEndpoint,route=>{body=route.request().postDataJSON();return fulfillJson(route,{});});
  await form.getByLabel('Reason and evidence').fill('  Superseded inventory rule following documented review  ');
  await form.getByRole('button',{name:'Record governance decision'}).click();
  await expect.poll(()=>body).toBeDefined();
  expect(body).toEqual({action:'retire_policy',reason:'Superseded inventory rule following documented review'});
 });
 test('TAPE-038 resume monitoring can be requested from recalibration-review state',async({page})=>{
  const form=await openLifecycleForm(page,'recalibration_review','Resume');let body:Record<string,unknown>|undefined;
  await page.route(applicationActionEndpoint,route=>{body=route.request().postDataJSON();return fulfillJson(route,{});});
  await form.getByLabel('Reason and evidence').fill('Validated the current rule against subsequent observations');
  await form.getByRole('button',{name:'Record governance decision'}).click();
  await expect.poll(()=>body).toBeDefined();expect(body?.action).toBe('resume_monitoring');
 });
 test('TAPE-039 completed rollback action is gated to rollback-review state',async({page})=>{
  await openPolicy(page,{role:'PW_GOVERNOR',data:policyResponse({applications:[{...recordedApplication,id:'pw-monitoring',application_status:'applied_monitoring'}, {...recordedApplication,id:'pw-rollback',application_status:'rollback_review'}]})});
  await expect(page.getByRole('button',{name:'Record rollback'})).toHaveCount(1);
  await page.getByRole('button',{name:'Record rollback'}).click();
  await expect(page.locator('.adaptive-policy-governance-form').getByRole('heading',{name:'Record completed rollback'})).toBeVisible();
 });
 test('TAPE-040 rejected lifecycle transition retains reason and shows state-recheck warning',async({page})=>{
  const form=await openLifecycleForm(page,'applied_monitoring','Recalibrate');
  await page.route(applicationActionEndpoint,route=>fulfillJson(route,{message:'Invalid status transition'},409));
  await form.getByLabel('Reason and evidence').fill('Current status was changed by another reviewer');
  await form.getByRole('button',{name:'Record governance decision'}).click();
  await expect(form.locator('.adaptive-policy-form-error')).toContainText('check the current policy status');
  await expect(form.getByLabel('Reason and evidence')).toHaveValue('Current status was changed by another reviewer');
 });
 test('TAPE-041 successful lifecycle POST closes form and refetches updated status',async({page})=>{
  const form=await openLifecycleForm(page,'applied_monitoring','Recalibrate');let changed=false;let reads=0;
  await page.route(policySummaryEndpoint,route=>{reads++;return fulfillJson(route,lifecycleResponse(changed?'recalibration_review':'applied_monitoring'));});
  await page.route(applicationActionEndpoint,route=>{changed=true;return fulfillJson(route,{});});
  await form.getByLabel('Reason and evidence').fill('Recalibration review is necessary due to variance');
  await form.getByRole('button',{name:'Record governance decision'}).click();
  await expect(form).toHaveCount(0);
  await expect.poll(()=>reads).toBeGreaterThan(0);
  await expect(page.getByRole('button',{name:'Resume',exact:true})).toBeVisible();
 });
 test('TAPE-042 only linked finite before-and-after scores count as measured effectiveness',async({page})=>{
  const measurements=[{policy_key:policy.policy_key,measurement_key:'linked',measurement_type:'policy_effectiveness',application_id:'pw-application-15',baseline_score:0.4,observed_score:0.7,delta_score:0.3,measured_at:'2026-10-30T10:00:00Z'}, {policy_key:policy.policy_key,measurement_key:'unlinked',measurement_type:'policy_effectiveness',application_id:null,baseline_score:0.4,observed_score:0.7,delta_score:0.3,measured_at:'2026-10-30T10:00:00Z'}];
  await openPolicy(page,{data:policyResponse({effectiveness:measurements})});
  const section=policyEvidenceSection(page,'Effectiveness measurements');
  await expect(section.locator('tbody tr').nth(0)).toContainText('Measured after recorded policy application');
  await expect(section.locator('tbody tr').nth(1)).toContainText('Current observation — impact not established');
  await expect(section.locator('tbody tr').nth(1)).toContainText('Not assessed');
 });
 test('TAPE-043 unlinked score observations do not imply proven policy impact',async({page})=>{
  await openPolicy(page,{data:policyResponse({effectiveness:[{policy_key:policy.policy_key,measurement_key:'observation',measurement_type:'policy_effectiveness',application_id:null,baseline_score:0.2,observed_score:0.8,delta_score:0.6}]})});
  const section=policyEvidenceSection(page,'Current policy observations');
  await expect(section).toContainText('Effectiveness cannot be determined yet');
  await expect(section).toContainText('Current observation — impact not established');
 });
 test('TAPE-044 risky recommendation confidence remains evidence, not human approval',async({page})=>{
  await openPolicy(page,{data:policyResponse({recommendations:[{...recommendation,risk_level:'critical',confidence_score:0.9}]})});
  const row=page.locator('#adaptive-policy-recommendation-pw-recommendation-14');
  await expect(row).toContainText('Critical');await expect(row).toContainText('90%');
  await expect(page.getByLabel('Adaptive policy filters')).toContainText('not automatic approval');
  await expect(row.getByRole('button',{name:'Record applied change'})).toHaveCount(0);
 });
 test('TAPE-045 original policy value and proposed change remain distinct in recorder',async({page})=>{
  const form=await openApplicationForm(page);
  await expect(form.getByLabel('Previous rule value')).toHaveValue(/"reorder_point": 10/);
  await expect(form.getByLabel('Actually applied rule value')).toHaveValue(/"reorder_point": 20/);
  await expect(form.getByLabel('Previous rule value')).not.toHaveValue(await form.getByLabel('Actually applied rule value').inputValue());
 });
 test('TAPE-046 recommendation includes most recent signal variance and signal-history count',async({page})=>{
  const signals=[{...signal,observed_at:'2026-10-01T00:00:00Z',variance_score:0.1},{...signal,observed_at:'2026-10-25T00:00:00Z',variance_score:0.6},{...signal,observed_at:'2026-10-20T00:00:00Z',variance_score:0.3}];
  await openPolicy(page,{data:policyResponse({signals})});
  const history=page.locator('#adaptive-policy-recommendation-pw-recommendation-14 .adaptive-policy-table__subtext--timeline');
  await expect(history).toContainText('Policy signal history: 3');
  await expect(history).toContainText('Latest observed signal:');
  await expect(history).toContainText('may be newer than the recommendation');
 });
 test('TAPE-047 active evidence filters retain per-section no-match messages',async({page})=>{
  await openPolicy(page,{data:policyResponse({policies:[],signals:[],recommendations:[],applications:[],effectiveness:[],governance:{policy_count:1,signal_count:0,recommendation_count:0,application_count:0,effectiveness_measurement_count:0}})});
  await policyFilters(page).getByLabel('Policy type').selectOption('dynamic_replenishment');
  for(const title of ['Policies','Observed signals','Policy recommendations','Applied policy changes','Current policy observations']){
   await expect(policyEvidenceSection(page,title)).toContainText('No matching records were returned');
  }
 });
 test('TAPE-048 filter changes keep source deep link and current page route intact',async({page})=>{
  await openPolicy(page,{url:'/adaptive-policy-engine?source_action_id=adaptive_policy_recommendation%3Apw-recommendation-14'});
  await policyFilters(page).getByLabel('Policy status').selectOption('approved_for_manual_application');
  await expect(page).toHaveURL(/\/adaptive-policy-engine\?source_action_id=adaptive_policy_recommendation%3Apw-recommendation-14/);
  await expect(page.locator('#adaptive-policy-recommendation-pw-recommendation-14')).toHaveClass(/adaptive-policy-table-row--focused/);
 });
 test('TAPE-049 failed summary GET removes evidence actions rather than exposing stale governing UI',async({page})=>{
  await loginAsDisposableRole(page,'PW_GOVERNOR');let fail=false;
  await page.route(policySummaryEndpoint,route=>fulfillJson(route,fail?{message:'Summary unavailable'}:approvedResponse(),fail?503:200));
  await page.goto('/adaptive-policy-engine');
  await expect(page.getByRole('button',{name:'Record applied change'})).toBeVisible();
  fail=true;
  await page.reload();
  await expect(page.getByRole('heading',{name:'Adaptive policy evidence could not be loaded'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Record applied change'})).toHaveCount(0);
 });
 test('TAPE-050 ordinary tenant UI keeps contract audits and technical panels hidden',async({page})=>{
  await openPolicy(page,{role:'PW_GOVERNOR',data:policyResponse({response_contract_audit:{checks:[{check_id:'synthetic',status:'passed'}]}})});
  await expect(page.getByRole('tablist',{name:'Adaptive policy page views'}).getByRole('tab',{name:'Diagnostics'})).toHaveCount(0);
  await expect(page.getByRole('tablist',{name:'Adaptive policy page views'}).getByRole('tab',{name:'Readiness checks'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Technical response diagnostics'})).toHaveCount(0);
 });
});
