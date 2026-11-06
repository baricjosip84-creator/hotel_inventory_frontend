import { test, expect, type Page } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 13: source-backed Learning Feedback list, summary, filters, detail,
// permission visibility and read-only evidence. Tests GENERATED; NOT EXECUTED.
const summaryEndpoint='**/decision-intelligence/continuous-learning-summary?*';
const sourcesEndpoint='**/decision-intelligence/learning-feedback-sources?*';
const detailEndpoint='**/decision-intelligence-feedback/record?*';
const reviewersEndpoint='**/decision-intelligence-feedback/reviewers';
const sampleEvidence={id:'pw-evidence-13',outcome_key:'pw-outcome-13',source_label:'Synthetic coffee recommendation',learning_domain:'inventory',outcome_status:'observed',outcome_score:1,observed_at:'2026-10-20T10:00:00.000Z',learning_feedback_review_status:'unreviewed',evidence_type:'recommendation_outcome'};
function summary(rows:Record<string,unknown>[]=[],overrides:Record<string,unknown>={}){
 return {
  governance:{continuous_learning_posture:'early_learning',outcome_count:rows.length,forecast_accuracy_count:0,policy_effectiveness_count:0,optimization_result_count:0,observed_domains:rows.length?['inventory']:[]},
  outcomes:rows,forecast_accuracy:[],policy_effectiveness:[],optimization_results:[],
  pagination:{outcomes:{total:rows.length,offset:0,limit:25,has_previous:false,has_next:false},forecast_accuracy:{total:0,offset:0,has_previous:false,has_next:false},policy_effectiveness:{total:0,offset:0,has_previous:false,has_next:false},optimization_results:{total:0,offset:0,has_previous:false,has_next:false}},
  feedback_action_plan:{recommended_actions:[],action_count:0,high_priority_action_count:0,medium_priority_action_count:0},
  learning_impact_assessment:{total_evidence_count:rows.length,open_review_evidence_count:0,domain_impact_summary:[]},
  feedback_review_board:{review_item_count:0,review_items:[],items:[],domains:[]},
  learning_trends:{periods:[]},...overrides
 };
}
async function configureLearning(page:Page, rows:Record<string,unknown>[]=[],data=summary(rows)){
 await page.route(summaryEndpoint,route=>fulfillJson(route,data));
 await page.route(sourcesEndpoint,route=>fulfillJson(route,{sources:[]}));
 await page.route(reviewersEndpoint,route=>fulfillJson(route,{reviewers:[]}));
 await page.route(detailEndpoint,route=>fulfillJson(route,{...sampleEvidence,expected_result:'Increase availability',observed_result:'Availability improved'}));
}
async function openLearning(page:Page,rows:Record<string,unknown>[]=[],data=summary(rows)){
 await loginAsTenant(page);await configureLearning(page,rows,data);await page.goto('/decision-learning-feedback');
 await expect(page.getByRole('heading',{name:'Learning Feedback',exact:true})).toBeVisible();
}
const filters=(page:Page)=>page.locator('.learning-feedback-history-filters');
const table=(page:Page)=>page.locator('.learning-feedback-evidence-table').filter({has:page.getByRole('heading',{name:'Learning outcomes'})});

test.describe('Learning Feedback — summary and history (Batch 13)',()=>{
 test('TDLF-001 opens the Learning Feedback overview with outcome and policy summary statistics',async({page})=>{
  await openLearning(page,[sampleEvidence]);
  await expect(page.getByLabel('Learning feedback summary')).toContainText('Outcomes');
  await expect(page.getByLabel('Learning feedback summary')).toContainText('Policy evidence');
  await expect(page.getByRole('heading',{name:'Find recorded feedback'})).toBeVisible();
 });
 test('TDLF-002 page states that evidence cannot train models or execute recommendations',async({page})=>{
  await openLearning(page);
  await expect(page.locator('.learning-feedback-safety-card')).toContainText('cannot train an external model');
  await expect(page.locator('.learning-feedback-safety-card')).toContainText('change stock and other operational records');
 });
 test('TDLF-003 all available evidence categories have distinct sections',async({page})=>{
  await openLearning(page);
  for(const title of ['Learning outcomes','Policy effectiveness','Optimization results']) {
   await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  }
 });
 test('TDLF-004 empty history distinguishes no recorded evidence from server errors',async({page})=>{
  await openLearning(page);
  await expect(table(page)).toContainText('No feedback evidence has been recorded in this category yet.');
  await expect(table(page).getByRole('row')).toHaveCount(0);
 });
 test('TDLF-005 filtered empty history says no matching records',async({page})=>{
  await openLearning(page);
  await filters(page).getByLabel('Search',{exact:true}).fill('never-recorded');
  await expect(table(page)).toContainText('No matching records were returned.');
 });
 test('TDLF-006 history search is sent in summary GET query',async({page})=>{
  await openLearning(page,[sampleEvidence]);let url='';
  await page.route(summaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,summary([]));});
  await filters(page).getByLabel('Search',{exact:true}).fill('Synthetic coffee');
  await expect.poll(()=>new URL(url).searchParams.get('evidence_search')).toBe('Synthetic coffee');
 });
 test('TDLF-007 review state filter propagates to backend',async({page})=>{
  await openLearning(page);let url='';
  await page.route(summaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,summary([]));});
  await filters(page).getByLabel('Review status').selectOption('unreviewed');
  await expect.poll(()=>new URL(url).searchParams.get('evidence_review_status')).toBe('unreviewed');
 });
 test('TDLF-008 observed date filters submit ISO datetime boundaries',async({page})=>{
  await openLearning(page);let url='';
  await page.route(summaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,summary([]));});
  await filters(page).getByLabel('Observed from').fill('2026-10-01');
  await filters(page).getByLabel('Observed to').fill('2026-10-31');
  const expectedFrom=await page.evaluate(()=>new Date('2026-10-01T00:00:00').toISOString());
  const expectedTo=await page.evaluate(()=>new Date('2026-10-31T23:59:59').toISOString());
  await expect.poll(()=>new URL(url).searchParams.get('evidence_date_to')).toBe(expectedTo);
  expect(new URL(url).searchParams.get('evidence_date_from')).toBe(expectedFrom);
 });
 test('TDLF-009 history sorting sends supported attention order',async({page})=>{
  await openLearning(page);let url='';
  await page.route(summaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,summary([]));});
  await filters(page).getByLabel('Sort').selectOption('attention');
  await expect.poll(()=>new URL(url).searchParams.get('evidence_sort')).toBe('attention');
 });
 test('TDLF-010 clear filters returns original backend search and newest order',async({page})=>{
  await openLearning(page);let url='';
  await page.route(summaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,summary([]));});
  await filters(page).getByLabel('Search',{exact:true}).fill('unmatched');
  await filters(page).getByLabel('Review status').selectOption('open');
  await filters(page).getByLabel('Sort').selectOption('oldest');
  await filters(page).getByRole('button',{name:'Clear filters'}).click();
  await expect.poll(()=>new URL(url).searchParams.get('evidence_sort')).toBe('newest');
  expect(new URL(url).searchParams.get('evidence_search')).toBe('');
  expect(new URL(url).searchParams.get('evidence_review_status')).toBe('');
 });
 test('TDLF-011 summary statistics reflect server supplied evidence totals',async({page})=>{
  await openLearning(page,[sampleEvidence],summary([sampleEvidence],{governance:{continuous_learning_posture:'early_learning',outcome_count:7,forecast_accuracy_count:4,policy_effectiveness_count:3,optimization_result_count:2,observed_domains:['inventory']}}));
  const box=page.getByLabel('Learning feedback summary');
  await expect(box).toContainText('Outcomes');await expect(box).toContainText('7');
  await expect(box).toContainText('Policy evidence');await expect(box).toContainText('3');
 });
 test('TDLF-012 technical readiness controls are not exposed in tenant UI',async({page})=>{
  await openLearning(page);
  await expect(page.getByRole('button',{name:'Readiness checks'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Closed-loop governance gate'})).toHaveCount(0);
 });
 test('TDLF-013 action plan with no recommendations displays an honest empty state',async({page})=>{
  await openLearning(page);
  await expect(page.locator('.learning-feedback-action-plan')).toContainText('No recommended learning actions available yet.');
 });
 test('TDLF-014 absent learning evidence reports no signal, not a fabricated trend',async({page})=>{
  await openLearning(page);
  await expect(page.locator('.learning-feedback-impact')).toContainText('No learning signal yet');
  await expect(page.locator('.learning-feedback-trend')).toHaveCount(0);
 });
 test('TDLF-015 row detail action loads a precise backend evidence key',async({page})=>{
  await openLearning(page,[sampleEvidence]);let url='';
  await page.route(detailEndpoint,route=>{url=route.request().url();return fulfillJson(route,{...sampleEvidence,expected_result:'More stock',observed_result:'Stock recovered'});});
  await table(page).getByRole('button',{name:'View details'}).click();
  await expect.poll(()=>new URL(url).searchParams.get('evidence_key')).toBe('pw-outcome-13');
  await expect(page.getByRole('heading',{name:'Feedback evidence details'})).toBeVisible();
 });
 test('TDLF-016 closing evidence details restores list view',async({page})=>{
  await openLearning(page,[sampleEvidence]);
  await table(page).getByRole('button',{name:'View details'}).click();
  await expect(page.locator('.learning-feedback-detail')).toBeVisible();
  await page.locator('.learning-feedback-detail').getByRole('button',{name:'Close'}).click();
  await expect(page.locator('.learning-feedback-detail')).toHaveCount(0);
  await expect(table(page).getByRole('button',{name:'View details'})).toBeVisible();
 });
 test('TDLF-017 detail retrieval errors preserve the list and show failure',async({page})=>{
  await openLearning(page,[sampleEvidence]);
  await page.route(detailEndpoint,route=>fulfillJson(route,{message:'Synthetic evidence access revoked'},403));
  await table(page).getByRole('button',{name:'View details'}).click();
  await expect(page.getByText('Synthetic evidence access revoked')).toBeVisible();
  await expect(page.locator('.learning-feedback-detail')).toHaveCount(0);
  await expect(table(page).getByRole('button',{name:'View details'})).toBeVisible();
 });
 test('TDLF-018 history older/newer controls adjust outcome offset by 25',async({page})=>{
  const paged=summary([sampleEvidence],{pagination:{outcomes:{total:30,offset:0,limit:25,has_previous:false,has_next:true}}});
  await openLearning(page,[sampleEvidence],paged);let offset=-1;
  await page.route(summaryEndpoint,route=>{
   offset=Number(new URL(route.request().url()).searchParams.get('outcome_offset'));
   return fulfillJson(route,summary([sampleEvidence],{pagination:{outcomes:{total:30,offset,limit:25,has_previous:offset>0,has_next:offset===0}}}));
  });
  await table(page).getByRole('button',{name:'Older'}).click();
  await expect.poll(()=>offset).toBe(25);
  await table(page).getByRole('button',{name:'Newer'}).click();
  await expect.poll(()=>offset).toBe(0);
 });
 test('TDLF-019 governed source mode deep link selects optimization feedback',async({page})=>{
  await loginAsDisposableRole(page,'PW_GOVERNOR');await configureLearning(page);
  await page.goto('/decision-learning-feedback?mode=optimization-results');
  await expect(page.locator('.learning-feedback-form-card').getByLabel('Feedback type')).toHaveValue('optimization-results');
  await expect(page.locator('.learning-feedback-form-card').getByLabel('Find source')).toBeVisible();
 });
 test('TDLF-020 governed source lookup sends selected mode, query and limit 25',async({page})=>{
  await loginAsDisposableRole(page,'PW_GOVERNOR');await configureLearning(page);let url='';
  await page.route(sourcesEndpoint,route=>{url=route.request().url();return fulfillJson(route,{sources:[]});});
  await page.goto('/decision-learning-feedback');
  await page.locator('.learning-feedback-form-card').getByLabel('Find source').fill('synthetic policy');
  await expect.poll(()=>new URL(url).searchParams.get('search')).toBe('synthetic policy');
  expect(new URL(url).searchParams.get('feedback_type')).toBe('learning-outcomes');
  expect(new URL(url).searchParams.get('limit')).toBe('25');
 });
});

// Batch 14 — governed Learning Feedback source, capture, review and draft handoffs.
// All records and mutation responses below are synthetic. Test code only; not executed.
const writeEndpoint='**/decision-intelligence-feedback/learning-outcomes';
const policyWriteEndpoint='**/decision-intelligence-feedback/policy-effectiveness';
const reviewEndpoint='**/decision-intelligence-feedback/review';
const executionEndpoint='**/execution-requests';
const sourceRecord={id:'pw-source-14',source_key:'pw-recommendation-14',title:'Synthetic replenishment suggestion',status:'ready',domain:'inventory',prefill:{expected_result:{description:'Synthetic lower shortage risk'}}};
const otherSource={...sourceRecord,id:'pw-source-other',source_key:'pw-recommendation-other',title:'Other synthetic suggestion'};
const feedbackRecord={...sampleEvidence,outcome_key:'pw-outcome-13',source_reference:{source_id:sourceRecord.id,source_key:sourceRecord.source_key},recommendation_reference:{recommendation_key:sourceRecord.source_key},expected_result:{description:'Synthetic lower shortage risk'},observed_result:{description:'Synthetic replenishment checked'},observed_at:'2026-10-20T10:00:00.000Z'};
const reviewItem={evidence_type:'learning_outcome',evidence_key:'pw-outcome-14',domain:'inventory',status:'open',review_reason_code:'missing_evidence',source_label:'Synthetic recommendation awaiting review',created_by_user_id:'pw-recording-user',recorded_by_user_id:'pw-recording-user',recorded_by_user_name:'Synthetic recorder',assigned_reviewer_user_id:null,review_due_at:null,due_state:'no_deadline'};
function withReviewBoard(items:Record<string,unknown>[],pagination:Record<string,unknown>={total:items.length,offset:0,limit:25,has_next:false,has_previous:false}){
 return summary([sampleEvidence],{feedback_review_board:{review_item_count:items.length,overdue_count:0,due_soon_count:0,assigned_count:0,escalated_count:0,review_items:items,pagination}});
}
async function openGovernedFeedback(page:Page,options:{sources?:Record<string,unknown>[];data?:Record<string,unknown>;url?:string}={}){
 await loginAsDisposableRole(page,'PW_GOVERNOR');
 await configureLearning(page,[],options.data || summary([sampleEvidence]));
 await page.route(sourcesEndpoint,route=>fulfillJson(route,{sources:options.sources || [sourceRecord]}));
 await page.goto(options.url || '/decision-learning-feedback');
 await expect(page.locator('.learning-feedback-form-card').getByLabel('Feedback type')).toBeVisible();
}
const editForm=(page:Page)=>page.locator('.learning-feedback-form-card');
async function chooseSourceAndResult(page:Page,source=sourceRecord.id){
 await editForm(page).getByLabel('Source record').selectOption(source);
 await editForm(page).getByLabel('What happened?').fill('Synthetic field evidence shows stock recovered');
}
async function registerLearningWrite(page:Page,reply:Record<string,unknown>={id:'pw-evidence-saved'}){
 const seen:Record<string,unknown>[]=[];
 await page.route(writeEndpoint,route=>{seen.push(JSON.parse(route.request().postData()||'{}'));return fulfillJson(route,reply);});
 return seen;
}

 test.describe('Learning Feedback — governed record and review workflows (Batch 14)',()=>{
 test('TDLF-021 source selection uses backend source facts in evidence reference and payload',async({page})=>{
  await openGovernedFeedback(page);const seen=await registerLearningWrite(page);
  await chooseSourceAndResult(page);
  await expect(page.locator('.learning-feedback-source-facts')).toContainText('Synthetic replenishment suggestion');
  await editForm(page).getByRole('button',{name:'Save feedback',exact:true}).click();
  await expect.poll(()=>seen.length).toBe(1);
  expect(seen[0].source_id).toBe(sourceRecord.id);
  expect(seen[0].recommendation_key).toBe(sourceRecord.source_key);
  expect((seen[0].source_reference as Record<string,unknown>).source_key).toBe(sourceRecord.source_key);
  expect(seen[0].expected_result).toBeTruthy();
 });
 test('TDLF-022 changing feedback type clears stale source and operator-entered observation',async({page})=>{
  await openGovernedFeedback(page);await chooseSourceAndResult(page);
  await editForm(page).getByLabel('Feedback type').selectOption('policy-effectiveness');
  await expect(editForm(page).getByLabel('Source record')).toHaveValue('');
  await expect(editForm(page).getByLabel('Find source')).toHaveValue('');
  await expect(editForm(page).getByLabel('What happened?')).toHaveValue('');
  await expect(editForm(page).getByLabel('Status')).toHaveValue('observed');
 });
 test('TDLF-023 reader without governance cannot access forecast recording or raw forecast history',async({page})=>{
  await loginAsDisposableRole(page,'PW_RESTRICTED');await configureLearning(page);await page.goto('/decision-learning-feedback?mode=forecast-accuracy');
  await expect(page.getByRole('heading',{name:'Feedback records are read-only for your role'})).toBeVisible();
  await expect(editForm(page)).toHaveCount(0);
  // PW_RESTRICTED must also lack insights.read, as declared in role fixture contract.
  await expect(page.getByRole('heading',{name:'Forecast accuracy',exact:true})).toHaveCount(0);
 });
 test('TDLF-024 changing policy effectiveness status derives bounded business score on save',async({page})=>{
  const policySource={...sourceRecord,title:'Synthetic policy',prefill:{baseline_reference:{description:'Synthetic baseline'}}};
  await openGovernedFeedback(page,{sources:[policySource],url:'/decision-learning-feedback?mode=policy-effectiveness'});
  let captured:Record<string,unknown>={};await page.route(policyWriteEndpoint,route=>{captured=JSON.parse(route.request().postData()||'{}');return fulfillJson(route,{id:'pw-policy-feedback'});});
  await chooseSourceAndResult(page);await editForm(page).getByLabel('Status').selectOption('ineffective');
  await editForm(page).getByRole('button',{name:'Save feedback',exact:true}).click();
  await expect.poll(()=>captured.effectiveness_score).toBe(-1);
  expect(captured.effectiveness_status).toBe('ineffective');
 });
 test('TDLF-025 feedback save remains disabled until a real source is selected',async({page})=>{
  await openGovernedFeedback(page);await editForm(page).getByLabel('What happened?').fill('Synthetic result');
  await expect(editForm(page).getByRole('button',{name:'Save feedback',exact:true})).toBeDisabled();
  await expect(editForm(page)).toContainText('Choose a source record before saving.');
 });
 test('TDLF-026 mode-specific observation validation blocks empty explanation with selected source',async({page})=>{
  await openGovernedFeedback(page);await editForm(page).getByLabel('Source record').selectOption(sourceRecord.id);
  await expect(editForm(page).getByRole('button',{name:'Save feedback',exact:true})).toBeDisabled();
  await expect(editForm(page)).toContainText('Describe what happened before saving.');
  await editForm(page).getByLabel('What happened?').fill('Synthetic observed result');
  await expect(editForm(page).getByRole('button',{name:'Save feedback',exact:true})).toBeEnabled();
 });
 test('TDLF-027 governed evidence POST transmits source, status, observed time and fact snapshot',async({page})=>{
  await openGovernedFeedback(page);const writes=await registerLearningWrite(page);
  await chooseSourceAndResult(page);await editForm(page).getByLabel('Did it help?').selectOption('1');
  await editForm(page).getByRole('button',{name:'Save feedback',exact:true}).click();
  await expect.poll(()=>writes.length).toBe(1);
  expect(writes[0]).toMatchObject({source_id:sourceRecord.id,learning_domain:'inventory',outcome_status:'observed',outcome_score:1});
  expect(typeof writes[0].observed_at).toBe('string');
  expect(writes[0].observed_result).toBeTruthy();
 });
 test('TDLF-028 successful evidence capture reports evidence-only save and clears form',async({page})=>{
  await openGovernedFeedback(page);const writes=await registerLearningWrite(page);
  await chooseSourceAndResult(page);await editForm(page).getByRole('button',{name:'Save feedback',exact:true}).click();
  await expect.poll(()=>writes.length).toBe(1);
  await expect(page.getByRole('status')).toContainText('backend stores this as learning evidence only');
  await expect(editForm(page).getByLabel('Source record')).toHaveValue('');
  await expect(editForm(page).getByLabel('What happened?')).toHaveValue('');
 });
 test('TDLF-029 failed evidence capture displays server message and retains operator changes',async({page})=>{
  await openGovernedFeedback(page);await page.route(writeEndpoint,route=>fulfillJson(route,{message:'Synthetic evidence-write conflict'},409));
  await chooseSourceAndResult(page);await editForm(page).getByRole('button',{name:'Save feedback',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Synthetic evidence-write conflict');
  await expect(editForm(page).getByLabel('Source record')).toHaveValue(sourceRecord.id);
  await expect(editForm(page).getByLabel('What happened?')).toHaveValue('Synthetic field evidence shows stock recovered');
 });
 test('TDLF-030 Edit fetches full persisted record and offers Save feedback changes instead of duplicate',async({page})=>{
  await openGovernedFeedback(page,{data:summary([feedbackRecord])});let key='';
  await page.route(detailEndpoint,route=>{key=new URL(route.request().url()).searchParams.get('evidence_key')||'';return fulfillJson(route,feedbackRecord);});
  await table(page).getByRole('button',{name:'Edit'}).click();
  await expect.poll(()=>key).toBe('pw-outcome-13');
  await expect(editForm(page).getByRole('button',{name:'Save feedback changes'})).toBeVisible();
  await expect(page.getByRole('status')).toContainText('update that record instead of creating a duplicate');
 });
 test('TDLF-031 Cancel editing removes persisted identity and restores fresh-entry form',async({page})=>{
  await openGovernedFeedback(page,{data:summary([feedbackRecord])});await page.route(detailEndpoint,route=>fulfillJson(route,feedbackRecord));
  await table(page).getByRole('button',{name:'Edit'}).click();
  await expect(editForm(page).getByRole('button',{name:'Cancel editing'})).toBeVisible();
  await editForm(page).getByRole('button',{name:'Cancel editing'}).click();
  await expect(editForm(page).getByRole('button',{name:'Save feedback',exact:true})).toBeVisible();
  await expect(editForm(page).getByRole('button',{name:'Cancel editing'})).toHaveCount(0);
 });
 test('TDLF-032 read-only feedback role has evidence View details but no Edit or recording form',async({page})=>{
  await loginAsDisposableRole(page,'PW_RESTRICTED');await configureLearning(page,[feedbackRecord],summary([feedbackRecord]));await page.goto('/decision-learning-feedback');
  await expect(table(page).getByRole('button',{name:'View details'})).toBeVisible();
  await expect(table(page).getByRole('button',{name:'Edit'})).toHaveCount(0);
  await expect(editForm(page)).toHaveCount(0);
 });
 test('TDLF-033 review board exposes open count, owner and deadline for governed review',async({page})=>{
  await openGovernedFeedback(page,{data:withReviewBoard([reviewItem])});const board=page.locator('.learning-feedback-review-board');
  await expect(board).toContainText('Open review items');
  await expect(board).toContainText('Synthetic recorder');
  await expect(board.getByRole('button',{name:'Save owner / due'})).toBeVisible();
  await expect(board.getByRole('button',{name:'Mark reviewed'})).toBeVisible();
 });
 test('TDLF-034 unknown recorder blocks resolution without an independent-review override',async({page})=>{
  await openGovernedFeedback(page,{data:withReviewBoard([{...reviewItem,created_by_user_id:null,recorded_by_user_id:null}])});
  const board=page.locator('.learning-feedback-review-board');
  await expect(board).toContainText('Independent review required');
  // This role fixture must possess govern but NOT review_override.
  await expect(board.getByRole('button',{name:'Mark reviewed'})).toBeDisabled();
 });
 test('TDLF-035 owner assignment posts an open review with reviewer and due time',async({page})=>{
  await openGovernedFeedback(page,{data:withReviewBoard([reviewItem])});let payload:Record<string,unknown>={};
  await page.route(reviewersEndpoint,route=>fulfillJson(route,{reviewers:[{id:'pw-reviewer-14',name:'Synthetic independent reviewer'}]}));
  await page.route(reviewEndpoint,route=>{payload=JSON.parse(route.request().postData()||'{}');return fulfillJson(route,{updated:true});});
  const row=page.locator('.learning-feedback-review-board tbody tr').first();
  await row.locator('select').selectOption('pw-reviewer-14');
  await row.locator('input[type="datetime-local"]').fill('2026-11-20T14:30');
  await row.getByRole('button',{name:'Save owner / due'}).click();
  await expect.poll(()=>payload.assigned_reviewer_user_id).toBe('pw-reviewer-14');
  expect(payload).toMatchObject({evidence_type:'learning_outcome',evidence_key:'pw-outcome-14',target_status:'open'});
  expect(String(payload.review_due_at)).toContain('2026-11-20T');
 });
 test('TDLF-036 Escalate trims sufficient explanation and retains evidence key',async({page})=>{
  await openGovernedFeedback(page,{data:withReviewBoard([reviewItem])});let payload:Record<string,unknown>={};
  await page.route(reviewEndpoint,route=>{payload=JSON.parse(route.request().postData()||'{}');return fulfillJson(route,{updated:true});});
  page.once('dialog',dialog=>dialog.accept('  Synthetic overdue evidence  '));
  await page.locator('.learning-feedback-review-board').getByRole('button',{name:'Escalate'}).click();
  await expect.poll(()=>payload.escalation_reason).toBe('Synthetic overdue evidence');
  expect(payload).toMatchObject({evidence_type:'learning_outcome',evidence_key:'pw-outcome-14',target_status:'open'});
 });
 test('TDLF-037 dismissing without three-character review note never posts mutation',async({page})=>{
  await openGovernedFeedback(page,{data:withReviewBoard([reviewItem])});let writes=0;
  await page.route(reviewEndpoint,route=>{writes++;return fulfillJson(route,{updated:true});});
  page.once('dialog',dialog=>dialog.accept('x'));
  await page.locator('.learning-feedback-review-board').getByRole('button',{name:'Dismiss review'}).click();
  await expect(page.getByRole('status')).toContainText('A short review note is required');
  expect(writes).toBe(0);
 });
 test('TDLF-038 review board Older requests review_offset 25 while preserving bucket offsets',async({page})=>{
  await openGovernedFeedback(page,{data:withReviewBoard([reviewItem],{total:30,limit:25,offset:0,has_previous:false,has_next:true})});
  let last='';await page.route(summaryEndpoint,route=>{last=route.request().url();const offset=Number(new URL(last).searchParams.get('review_offset'));return fulfillJson(route,withReviewBoard([reviewItem],{total:30,offset,limit:25,has_previous:offset>0,has_next:false}));});
  await page.locator('.learning-feedback-review-board').getByRole('button',{name:'Older'}).click();
  await expect.poll(()=>new URL(last).searchParams.get('review_offset')).toBe('25');
  expect(new URL(last).searchParams.get('outcome_offset')).toBe('0');
 });
 test('TDLF-039 action-plan follow-up creates only a draft Execution Request',async({page})=>{
  const action={action_key:'verify_evidence',action_type:'governed_review',priority:'high',rationale:'Synthetic review required',recommended_owner:'operations',evidence_count:2,affected_domains:['inventory']};
  await openGovernedFeedback(page,{data:summary([sampleEvidence],{feedback_action_plan:{recommended_actions:[action],action_count:1,high_priority_action_count:1,medium_priority_action_count:0}})});
  let body:Record<string,unknown>={};await page.route(executionEndpoint,route=>{body=JSON.parse(route.request().postData()||'{}');return fulfillJson(route,{id:'pw-draft-14',status:'draft'});});
  await page.locator('.learning-feedback-action-plan').getByRole('button',{name:'Create draft'}).click();
  await expect.poll(()=>body.request_type).toBe('system_recommendation');
  expect((body.payload as Record<string,unknown>).source).toBe('decision_learning_feedback');
  await expect(page.getByRole('status')).toContainText('Nothing was executed automatically');
 });
 test('TDLF-040 evidence-detail follow-up POST references selected evidence and creates draft only',async({page})=>{
  await openGovernedFeedback(page,{data:summary([feedbackRecord])});await page.route(detailEndpoint,route=>fulfillJson(route,feedbackRecord));
  let body:Record<string,unknown>={};await page.route(executionEndpoint,route=>{body=JSON.parse(route.request().postData()||'{}');return fulfillJson(route,{id:'pw-follow-up',status:'draft'});});
  await table(page).getByRole('button',{name:'View details'}).click();
  await page.locator('.learning-feedback-detail').getByRole('button',{name:'Create follow-up Execution Request draft'}).click();
  await expect.poll(()=>body.request_type).toBe('system_recommendation');
  expect((body.payload as Record<string,unknown>).feedback_evidence_key).toBe('pw-outcome-13');
  await expect(page.getByRole('status')).toContainText('Nothing was executed automatically');
 });
 test('TDLF-041 role without execution-request create cannot offer a follow-up mutation action',async({page})=>{
  await loginAsDisposableRole(page,'PW_RESTRICTED');await configureLearning(page,[feedbackRecord],summary([feedbackRecord]));await page.goto('/decision-learning-feedback');
  await table(page).getByRole('button',{name:'View details'}).click();
  await expect(page.locator('.learning-feedback-detail').getByRole('button',{name:'Create follow-up Execution Request draft'})).toHaveCount(0);
 });
 test('TDLF-042 unavailable source search cannot enable an invalid evidence save',async({page})=>{
  await openGovernedFeedback(page);await page.route(sourcesEndpoint,route=>fulfillJson(route,{message:'Synthetic source lookup denied'},403));
  await editForm(page).getByLabel('Find source').fill('restricted');
  await expect(editForm(page).getByLabel('Source record')).toBeDisabled();
  await expect(editForm(page).getByRole('button',{name:'Save feedback',exact:true})).toBeDisabled();
  await expect(editForm(page).getByLabel('Source record').locator('option').first()).toContainText('Sources unavailable');
 });
 test('TDLF-043 evidence detail hides structured raw values from a reader without diagnostics grant',async({page})=>{
  await loginAsDisposableRole(page,'PW_RESTRICTED');await configureLearning(page,[feedbackRecord],summary([feedbackRecord]));await page.route(detailEndpoint,route=>fulfillJson(route,feedbackRecord));await page.goto('/decision-learning-feedback');
  await table(page).getByRole('button',{name:'View details'}).click();
  await expect(page.locator('.learning-feedback-detail').getByText('Synthetic replenishment checked')).toBeVisible();
  await expect(page.locator('.learning-feedback-detail').getByText('Technical structured evidence')).toHaveCount(0);
 });
 test('TDLF-044 day-boundary evidence filter retains server-side sort and respects local time conversion',async({page})=>{
  await openLearning(page);let url='';await page.route(summaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,summary([]));});
  await filters(page).getByLabel('Observed from').fill('2026-10-04');
  await filters(page).getByLabel('Observed to').fill('2026-10-07');
  await filters(page).getByLabel('Sort').selectOption('oldest');
  const from=await page.evaluate(()=>new Date('2026-10-04T00:00:00').toISOString());
  const to=await page.evaluate(()=>new Date('2026-10-07T23:59:59').toISOString());
  await expect.poll(()=>new URL(url).searchParams.get('evidence_sort')).toBe('oldest');
  expect(new URL(url).searchParams.get('evidence_date_from')).toBe(from);
  expect(new URL(url).searchParams.get('evidence_date_to')).toBe(to);
 });
 test('TDLF-045 outcome Yes, Partly and No map to the documented 1, 0 and -1 score values',async({page})=>{
  await openGovernedFeedback(page);const writes=await registerLearningWrite(page);
  for(const [label,score] of [['1',1],['0',0],['-1',-1]] as const){
   await chooseSourceAndResult(page);await editForm(page).getByLabel('Did it help?').selectOption(label);
   await editForm(page).getByRole('button',{name:'Save feedback',exact:true}).click();
   await expect.poll(()=>writes.length).toBe([1,0,-1].indexOf(score)+1);
   expect(writes[writes.length-1].outcome_score).toBe(score);
  }
 });
 test('TDLF-046 late evidence-detail response cannot overwrite later selected row',async({page})=>{
  const second={...feedbackRecord,id:'pw-evidence-14b',outcome_key:'pw-outcome-other',source_label:'Most recent synthetic selection'};
  await openLearning(page,[feedbackRecord,second],summary([feedbackRecord,second]));
  let pending:(import('@playwright/test').Route)[]=[];
  await page.route(detailEndpoint,route=>{pending.push(route);});
  await table(page).getByRole('button',{name:'View details'}).first().click();
  await expect.poll(()=>pending.length).toBe(1);
  await table(page).getByRole('button',{name:'View details'}).nth(1).click();
  await expect.poll(()=>pending.length).toBe(2);
  await fulfillJson(pending[1],second);
  await expect(page.locator('.learning-feedback-detail')).toContainText('Most recent synthetic selection');
  await fulfillJson(pending[0],feedbackRecord);
  await expect(page.locator('.learning-feedback-detail')).toContainText('Most recent synthetic selection');
  await expect(page.locator('.learning-feedback-detail')).not.toContainText('Synthetic coffee recommendation');
 });
 test('TDLF-047 closing evidence detail returns keyboard focus to originating row action',async({page})=>{
  await openLearning(page,[feedbackRecord],summary([feedbackRecord]));
  await table(page).getByRole('button',{name:'View details'}).click();
  await expect(page.locator('.learning-feedback-detail')).toBeVisible();
  await page.locator('.learning-feedback-detail').getByRole('button',{name:'Close'}).click();
  await expect(table(page).getByRole('button',{name:'View details'})).toBeFocused();
 });
 test('TDLF-048 independent evidence buckets retain separate offsets when paging',async({page})=>{
  const forecastRow={accuracy_key:'pw-forecast-14',source_label:'Synthetic forecast',forecast_domain:'inventory',calibration_status:'observed',percentage_error:4,observed_at:'2026-10-19T00:00:00Z'};
  const extra=summary([feedbackRecord],{forecast_accuracy:[forecastRow],pagination:{outcomes:{total:50,offset:0,limit:25,has_next:true,has_previous:false},forecast_accuracy:{total:50,offset:0,limit:25,has_next:true,has_previous:false},policy_effectiveness:{total:0,offset:0,has_next:false,has_previous:false},optimization_results:{total:0,offset:0,has_next:false,has_previous:false}}});
  await openLearning(page,[feedbackRecord],extra);let url='';await page.route(summaryEndpoint,route=>{url=route.request().url();const params=new URL(url).searchParams;return fulfillJson(route,summary([feedbackRecord],{...extra,pagination:{...(extra.pagination as Record<string,unknown>),outcomes:{total:50,offset:Number(params.get('outcome_offset')),limit:25,has_next:true,has_previous:true},forecast_accuracy:{total:50,offset:Number(params.get('forecast_offset')),limit:25,has_next:true,has_previous:true}}}));});
  await table(page).getByRole('button',{name:'Older'}).click();
  await expect.poll(()=>new URL(url).searchParams.get('outcome_offset')).toBe('25');
  expect(new URL(url).searchParams.get('forecast_offset')).toBe('0');
  await page.locator('.learning-feedback-evidence-table').filter({has:page.getByRole('heading',{name:'Forecast accuracy'})}).getByRole('button',{name:'Older'}).click();
  await expect.poll(()=>new URL(url).searchParams.get('forecast_offset')).toBe('25');
  expect(new URL(url).searchParams.get('outcome_offset')).toBe('25');
 });
 test('TDLF-049 successful independent review invalidates and refreshes summary evidence',async({page})=>{
  let reviewed=false;await openGovernedFeedback(page,{data:withReviewBoard([reviewItem])});
  await page.route(summaryEndpoint,route=>fulfillJson(route,withReviewBoard(reviewed?[]:[reviewItem])));
  await page.route(reviewEndpoint,route=>{reviewed=true;return fulfillJson(route,{updated:true});});
  page.once('dialog',dialog=>dialog.accept('Synthetic reviewed evidence'));
  await page.locator('.learning-feedback-review-board').getByRole('button',{name:'Mark reviewed'}).click();
  await expect(page.getByRole('status')).toContainText('Feedback review updated');
  await expect(page.locator('.learning-feedback-review-board')).toContainText('No feedback reviews are waiting for action.');
 });
 test('TDLF-050 review API conflict retains the evidence row and displays conflict message',async({page})=>{
  await openGovernedFeedback(page,{data:withReviewBoard([reviewItem])});
  await page.route(reviewEndpoint,route=>fulfillJson(route,{message:'Synthetic review version conflict'},409));
  page.once('dialog',dialog=>dialog.accept('Synthetic evidence reviewed'));
  await page.locator('.learning-feedback-review-board').getByRole('button',{name:'Mark reviewed'}).click();
  await expect(page.getByRole('status')).toContainText('Synthetic review version conflict');
  await expect(page.locator('.learning-feedback-review-board').getByRole('button',{name:'Mark reviewed'})).toBeVisible();
  await expect(page.locator('.learning-feedback-review-board')).toContainText('Synthetic recorder');
 });
});
