import { test, expect, type Page } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 11 — Intelligence Review queue, source-grounded from HumanInLoopAIReviewPage.tsx,
// intelligenceReviewQueueRoute.ts, intelligenceReviewQueueSelection.ts and the
// operationalActionCenter backend router. Generated only; never run in Phase 1.
// All fixtures are synthetic GET responses, never production records.
const endpoint = '**/operational-action-center/human-in-loop-ai-operations-summary?*';
const timestamp='2026-10-20T12:00:00.000Z';
type Review = {
  review_id:string; source_action_id:string; ai_operation_domain:string;
  review_state:string; urgency:string; title:string; summary?:string|null;
  source_reference?:{source_type:string;source_id:string};
  confidence_visualization?:{confidence_score:number;confidence_band:string;score_source:string;advisory_only:boolean};
  simulation_preview?:{preview_available:boolean;preview_kind?:string;preview_summary?:string};
  lifecycle?:{current_status:string;version:number;persisted:boolean;allowed_decisions:string[]};
  updated_at?:string;
};
const reviewItems=():Review[]=>[
  {review_id:'pw-review-001',source_action_id:'pw-action-001',ai_operation_domain:'decision_intelligence',
    review_state:'pending_review',urgency:'high',title:'Synthetic demand decision',summary:'Check stock planning assumptions',
    source_reference:{source_type:'optimization_proposal',source_id:'pw-optimization-001'},
    confidence_visualization:{confidence_score:0.84,confidence_band:'high',score_source:'rule_based',advisory_only:true},
    simulation_preview:{preview_available:true,preview_kind:'scenario_comparison',preview_summary:'Planning changes are advisory only'},
    lifecycle:{current_status:'pending_review',version:1,persisted:true,allowed_decisions:[]},updated_at:timestamp},
  {review_id:'pw-review-002',source_action_id:'pw-action-002',ai_operation_domain:'ai_governance',
    review_state:'approval_required',urgency:'medium',title:'Synthetic policy approval',summary:'Review governance policy',
    confidence_visualization:{confidence_score:0.45,confidence_band:'medium',score_source:'rule_based',advisory_only:true},
    lifecycle:{current_status:'approval_required',version:2,persisted:true,allowed_decisions:[]},updated_at:timestamp}
];
function reviewPayload(reviews:Review[]=reviewItems(),pagination={limit:25,offset:0,total:2,from:1,to:2,previous_offset:null as number|null,next_offset:null as number|null}){
  return {
    definition:{foundation_type:'human_in_loop_review',execution_mode:'human_review_only',safety_contract:{human_action_only:true,non_mutation:true}},
    summary:{total_reviews:reviews.length,active_reviews:2,approval_required_reviews:1,escalated_reviews:0},
    guidance:{review_queue_guidance:'Synthetic: inspect evidence and record deliberate decisions only.'},
    pagination,reviews,reviewer_directory:[],non_mutation_guarantee:true,generated_at:timestamp
  };
}
async function mockReview(page:Page,body:unknown=reviewPayload()){
  await page.route('**/operational-action-center/human-in-loop-ai-reviews/*/history',route=>fulfillJson(route,{source:{},lifecycle:{},events:[]}));
  await page.route('**/operational-action-center/human-in-loop-ai-reviews/escalation-attention-summary',route=>fulfillJson(route,{requires_attention:false,actionable_count:0,overdue_count:0}));
  await page.route(endpoint,route=>{
    if(route.request().method()!=='GET')return route.abort();
    return fulfillJson(route,body);
  });
}
const queue=(page:Page)=>page.locator('.ai-review-page__queue-choice');
const selected=(page:Page)=>page.locator('.ai-review-page__review-card');
async function openReview(page:Page,path='/intelligence-review'){
  await loginAsTenant(page);
  await mockReview(page);
  await page.goto(path);
  await expect(page.locator('.ai-review-page')).toBeVisible();
  await expect(queue(page)).toHaveCount(2);
}

test.describe('Intelligence Review — recommendation queue, URL state and human-only evidence',()=>{
  test.beforeEach(async ({page})=>{await openReview(page);});

  test('TINT-001 page identifies the Intelligence Review governed workflow',async ({page})=>{
    await expect(page.getByRole('heading',{name:'Intelligence Review'})).toBeVisible();
    await expect(page.locator('.ai-review-page')).toContainText('human review remains authoritative');
  });

  test('TINT-002 queue explicitly states review decisions cannot execute inventory operations',async ({page})=>{
    await expect(page.locator('.ai-review-page__mode-explanation')).toContainText('A review decision never performs the underlying inventory, pricing, configuration, or release action.');
  });

  test('TINT-003 overview reflects backend open and approval totals',async ({page})=>{
    const stats=page.getByLabel('Recommendation review summary');
    await expect(stats.locator('.io-workspace-stat').filter({hasText:'Open reviews'}).locator('.io-workspace-stat__value')).toHaveText('2');
    await expect(stats.locator('.io-workspace-stat').filter({hasText:'Approval required'}).locator('.io-workspace-stat__value')).toHaveText('1');
  });

  test('TINT-004 overview displays human-decision-only safety rule',async ({page})=>{
    await expect(page.getByLabel('Recommendation review summary')).toContainText('Human decision only');
    await expect(page.getByLabel('Recommendation review summary')).toContainText('Review decisions never execute the underlying recommendation');
  });

  test('TINT-005 recommendation view starts selected and readiness remains separate',async ({page})=>{
    await expect(page.getByRole('tab',{name:'Recommendation reviews'})).toHaveAttribute('aria-selected','true');
    await expect(page.getByRole('tab',{name:'Readiness & governance'})).toHaveAttribute('aria-selected','false');
    await expect(page.getByLabel('Review category')).toBeVisible();
  });

  test('TINT-006 source link opens tenant Action Center, not external execution',async ({page})=>{
    await expect(page.getByRole('link',{name:'Open action center'})).toHaveAttribute('href','/action-center');
  });

  test('TINT-007 review toolbar links to the separate Workflow Composer',async ({page})=>{
    await expect(page.getByRole('link',{name:'Open workflow composer'})).toHaveAttribute('href','/workflow-composer');
  });

  test('TINT-008 category filter includes decision, governance and remediation domains',async ({page})=>{
    const options=await page.getByLabel('Review category').locator('option').evaluateAll(items=>items.map(e=>(e as HTMLOptionElement).value));
    expect(options).toEqual(['all','decision_intelligence','ai_governance','remediation','simulation','optimization','multi_domain']);
  });

  test('TINT-009 review state offers the overdue and actionable lifecycle filters',async ({page})=>{
    const values=await page.getByLabel('Review state').locator('option').evaluateAll(items=>items.map(e=>(e as HTMLOptionElement).value));
    expect(values).toContain('overdue');expect(values).toContain('approval_required');expect(values).toContain('execution_request_drafted');
  });

  test('TINT-010 urgency options cover critical through low with All default',async ({page})=>{
    await expect(page.getByLabel('Review urgency')).toHaveValue('all');
    const options=await page.getByLabel('Review urgency').locator('option').evaluateAll(items=>items.map(e=>(e as HTMLOptionElement).value));
    expect(options).toEqual(['all','critical','high','medium','low']);
  });

  test('TINT-011 sort choices retain highest-priority and chronological controls',async ({page})=>{
    const values=await page.getByLabel('Sort reviews').locator('option').evaluateAll(items=>items.map(e=>(e as HTMLOptionElement).value));
    expect(values).toEqual(['priority','due_soonest','newest','oldest']);
  });

  test('TINT-012 queue renders each returned review once',async ({page})=>{
    await expect(queue(page)).toHaveCount(2);
    await expect(queue(page).nth(0)).toContainText('Synthetic demand decision');
    await expect(queue(page).nth(1)).toContainText('Synthetic policy approval');
  });

  test('TINT-013 first review starts selected with corresponding evidence',async ({page})=>{
    await expect(queue(page).first()).toHaveAttribute('aria-current','true');
    await expect(selected(page)).toHaveCount(1);
    await expect(selected(page)).toContainText('Check stock planning assumptions');
    await expect(selected(page)).not.toContainText('Review governance policy');
  });

  test('TINT-014 switching selected review changes the URL and card',async ({page})=>{
    await queue(page).nth(1).click();
    await expect(page).toHaveURL(/selected_review_id=pw-action-002/);
    await expect(queue(page).nth(1)).toHaveAttribute('aria-current','true');
    await expect(selected(page)).toContainText('Review governance policy');
  });

  test('TINT-015 selected queue review survives a hard reload',async ({page})=>{
    await queue(page).nth(1).click();
    await page.reload();
    await expect(queue(page).nth(1)).toHaveAttribute('aria-current','true');
    await expect(selected(page)).toContainText('Review governance policy');
  });

  test('TINT-016 category selection sends its domain in the GET request',async ({page})=>{
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.getByLabel('Review category').selectOption('ai_governance');
    await expect(page).toHaveURL(/review_domain=ai_governance/);
    await expect.poll(()=>request?.searchParams.get('ai_operation_domain')).toBe('ai_governance');
  });

  test('TINT-017 choosing pending-review state creates review_state parameter',async ({page})=>{
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.getByLabel('Review state').selectOption('pending_review');
    await expect.poll(()=>request?.searchParams.get('review_state')).toBe('pending_review');
    await expect(page.getByLabel('Review state')).toHaveValue('pending_review');
  });

  test('TINT-018 overdue view uses due_state rather than an invalid review_state',async ({page})=>{
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.getByLabel('Review state').selectOption('overdue');
    await expect.poll(()=>request?.searchParams.get('due_state')).toBe('overdue');
    expect(request?.searchParams.has('review_state')).toBe(false);
  });

  test('TINT-019 selecting critical urgency reaches the API as urgency=critical',async ({page})=>{
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.getByLabel('Review urgency').selectOption('critical');
    await expect.poll(()=>request?.searchParams.get('urgency')).toBe('critical');
    await expect(page).toHaveURL(/review_urgency=critical/);
  });

  test('TINT-020 search trims API term while maintaining visible user input',async ({page})=>{
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.getByLabel('Search reviews').fill('  synthetic  ');
    await expect.poll(()=>request?.searchParams.get('search')).toBe('synthetic');
    await expect(page.getByLabel('Search reviews')).toHaveValue('  synthetic  ');
  });

  test('TINT-021 due-soonest sort reaches backend with a matching URL filter',async ({page})=>{
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.getByLabel('Sort reviews').selectOption('due_soonest');
    await expect.poll(()=>request?.searchParams.get('sort')).toBe('due_soonest');
    await expect(page).toHaveURL(/review_sort=due_soonest/);
  });

  test('TINT-022 changing filter resets offset and discards stale selected-review ID',async ({page})=>{
    await mockReview(page,reviewPayload(reviewItems(),{limit:25,offset:25,total:60,from:26,to:27,previous_offset:0,next_offset:50}));
    await page.goto('/intelligence-review?review_offset=25&selected_review_id=pw-action-002');
    await page.getByLabel('Review category').selectOption('ai_governance');
    const url=new URL(page.url());
    expect(url.searchParams.has('review_offset')).toBe(false);
    expect(url.searchParams.has('selected_review_id')).toBe(false);
  });

  test('TINT-023 queue result selection never changes source_action_id deep link',async ({page})=>{
    await mockReview(page,reviewPayload([reviewItems()[1]]));
    await page.goto('/intelligence-review?source_action_id=pw-action-002');
    await expect(selected(page)).toContainText('Review governance policy');
    await expect(page).toHaveURL(/source_action_id=pw-action-002/);
    await expect(page.locator('.ai-review-page__queue-choice--selected')).toHaveCount(1);
  });

  test('TINT-024 Next page updates offset while keeping limit 25',async ({page})=>{
    let last:URL|undefined;
    await page.route(endpoint,route=>{last=new URL(route.request().url());return fulfillJson(route,reviewPayload(reviewItems(),
      {limit:25,offset:0,total:40,from:1,to:2,previous_offset:null,next_offset:25}));});
    await page.reload();
    await page.getByRole('button',{name:'Next',exact:true}).click();
    await expect.poll(()=>last?.searchParams.get('offset')).toBe('25');
    expect(last?.searchParams.get('limit')).toBe('25');
    await expect(page).toHaveURL(/review_offset=25/);
  });

  test('TINT-025 Previous page returns to earlier offset',async ({page})=>{
    let last:URL|undefined;
    await page.route(endpoint,route=>{last=new URL(route.request().url());return fulfillJson(route,reviewPayload(reviewItems(),
      {limit:25,offset:25,total:40,from:26,to:27,previous_offset:0,next_offset:null}));});
    await page.goto('/intelligence-review?review_offset=25');
    await page.getByRole('button',{name:'Previous',exact:true}).click();
    await expect.poll(()=>last?.searchParams.get('offset')).toBe('0');
    await expect(page).not.toHaveURL(/review_offset=25/);
  });

  test('TINT-026 focused source-action request uses a single-item limit and ignores queue filters',async ({page})=>{
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.goto('/intelligence-review?source_action_id=pw-action-002&review_domain=optimization&review_urgency=low');
    await expect.poll(()=>request?.searchParams.get('source_action_id')).toBe('pw-action-002');
    expect(request?.searchParams.get('limit')).toBe('1');
    expect(request?.searchParams.get('offset')).toBe('0');
    expect(request?.searchParams.has('ai_operation_domain')).toBe(false);
    expect(request?.searchParams.has('urgency')).toBe(false);
  });

  test('TINT-027 missing focused source review shows a role-safe unavailable message',async ({page})=>{
    await mockReview(page,reviewPayload([]));
    await page.goto('/intelligence-review?source_action_id=pw-absent-action');
    await expect(page.getByText('The requested review is not available to your role or is no longer available.')).toBeVisible();
    await expect(selected(page)).toHaveCount(0);
  });

  test('TINT-028 focused view hides queue filters and aggregate totals',async ({page})=>{
    await mockReview(page,reviewPayload([reviewItems()[0]]));
    await page.goto('/intelligence-review?source_action_id=pw-action-001');
    await expect(page.getByLabel('Review category')).toHaveCount(0);
    await expect(page.getByLabel('Recommendation review summary')).toHaveCount(0);
    await expect(page.locator('.ai-review-page')).toContainText('Queue filters do not apply in this focused view.');
  });

  test('TINT-029 invalid category URL value cannot reach backend as a domain',async ({page})=>{
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.goto('/intelligence-review?review_domain=forbidden-category');
    await expect(page.getByLabel('Review category')).toHaveValue('all');
    await expect.poll(()=>request?.searchParams.has('ai_operation_domain')).toBe(false);
  });

  test('TINT-030 overlarge offset is normalized to zero before API call',async ({page})=>{
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.goto('/intelligence-review?review_offset=99999999');
    await expect.poll(()=>request?.searchParams.get('offset')).toBe('0');
    await expect(queue(page)).toHaveCount(2);
  });

  test('TINT-031 empty recommendation queue renders an explicit filtered empty state',async ({page})=>{
    await mockReview(page,reviewPayload([]));await page.reload();
    await expect(page.getByText('No recommendation review items match the selected filters.')).toBeVisible();
    await expect(selected(page)).toHaveCount(0);
  });

  test('TINT-032 failed queue GET shows error and no fabricated review cards',async ({page})=>{
    await page.route(endpoint,route=>fulfillJson(route,{message:'Synthetic review queue unavailable'},503));
    await page.reload();
    await expect(page.locator('.ai-review-page__controls-card .form-error')).toBeVisible();
    await expect(selected(page)).toHaveCount(0);
  });

  test('TINT-033 pending queue GET displays a loading notice rather than stale reviews',async ({page})=>{
    let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route(endpoint,async route=>{await gate;await fulfillJson(route,reviewPayload());});
    await page.reload();
    await expect(page.getByText('Loading recommendation review queue…')).toBeVisible();
    release();await expect(queue(page)).toHaveCount(2);
  });

  test('TINT-034 refresh is a GET-only request with limit 25 and sort priority',async ({page})=>{
    const methods:string[]=[];let last:URL|undefined;
    await page.route(endpoint,route=>{methods.push(route.request().method());last=new URL(route.request().url());return fulfillJson(route,reviewPayload());});
    await page.getByRole('button',{name:'Refresh review queue'}).click();
    await expect.poll(()=>methods.length).toBeGreaterThan(0);
    expect(methods.every(value=>value==='GET')).toBe(true);
    expect(last?.searchParams.get('limit')).toBe('25');
    expect(last?.searchParams.get('sort')).toBe('priority');
  });

  test('TINT-035 selected review distinguishes confidence evidence from authorization',async ({page})=>{
    await expect(selected(page).locator('.ai-review-page__evidence-grid')).toContainText('Source confidence');
    await expect(selected(page).locator('.ai-review-page__evidence-grid')).toContainText('Structured evidence available');
    await expect(selected(page).locator('.ai-review-page__business-impact')).toContainText('No business record changes automatically.');
    await expect(selected(page).locator('.ai-review-page__business-impact')).toContainText('This page leaves the current business records unchanged.');
  });

  test('TINT-036 stale local selected review displays a warning without substituting another card',async ({page})=>{
    await page.goto('/intelligence-review?selected_review_id=pw-action-removed');
    await expect(page.locator('.ai-review-page__selected-review [role="status"]')).toContainText('The selected review is no longer on this page. Choose a review from the queue to continue.');
    await expect(selected(page)).toHaveCount(0);
    await expect(queue(page)).toHaveCount(2);
  });
});

// Batch 12 — readiness, persisted history, governed decision and draft-only controls.
// Role-specific cases require disposable role credentials; all write endpoints are intercepted.
const businessReadinessEndpoint='**/intelligence-readiness/business-readiness-summary*';
const syntheticBusinessReadiness={
  advisory_only:true,safety_message:'Readiness is advisory and cannot execute or release features.',
  summary:{total_features:2,needs_attention:1,controlled_validation_candidates:1,average_readiness_score:65},
  features:[{feature_key:'forecasting',feature_label:'Synthetic forecast readiness',readiness_score:70,readiness_status:'Needs attention',owner_area:'Operations',blocker_count:1,next_action:'Collect independent evidence'}],
  priority_items:[{feature_key:'forecasting',feature_label:'Synthetic forecast readiness',production_priority:'high',readiness_status:'Needs attention',owner_area:'Operations',next_action:'Collect independent evidence'}]
};
async function roleLogin(page:Page,prefix:'PW_GOVERNOR'|'PW_RESTRICTED'|'PW_DIAGNOSTICS'){
  if(process.env.PW_TEST_ENVIRONMENT!=='disposable')throw new Error('Disposable environment required');
  const email=process.env[`${prefix}_EMAIL`],password=process.env[`${prefix}_PASSWORD`];
  if(!email||!password)throw new Error(`Configure disposable ${prefix} account for role coverage`);
  await page.addInitScript(()=>localStorage.setItem('inventory_locale','en-GB'));
  await page.goto('/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('[data-auth-form="true"] button[type="submit"]').click();
  await expect(page.getByRole('heading',{name:'Operations Dashboard'})).toBeVisible();
}
async function configureIntelligence(page:Page,items:Review[]=reviewItems()){
  await mockReview(page,reviewPayload(items,{limit:25,offset:0,total:items.length,from:1,to:items.length,previous_offset:null,next_offset:null}));
  await page.route(businessReadinessEndpoint,route=>fulfillJson(route,syntheticBusinessReadiness));
}
async function openGovernedReview(page:Page, review?:Review){
  await roleLogin(page,'PW_GOVERNOR');
  await configureIntelligence(page,review?[review]:reviewItems());
  await page.goto('/intelligence-review');
  await expect(selected(page)).toHaveCount(1);
  await expect(page.locator('.ai-review-page__decision-panel')).toBeVisible();
}
const governed=(allowed:string[]=['acknowledged','approved_for_manual_action','rejected','suppressed','escalated']):Review=>({
  ...reviewItems()[0],lifecycle:{current_status:'pending_review',version:7,persisted:true,allowed_decisions:allowed}
});
const decisionPanel=(page:Page)=>page.locator('.ai-review-page__decision-panel');
const decisionSelect=(page:Page)=>decisionPanel(page).locator('select').nth(0);
const reasonSelect=(page:Page)=>decisionPanel(page).locator('select').nth(1);
const recordButton=(page:Page)=>decisionPanel(page).getByRole('button',{name:'Record review decision'});
const decisionEndpoint='**/operational-action-center/human-in-loop-ai-reviews/*/decision';
const historyEndpoint='**/operational-action-center/human-in-loop-ai-reviews/*/history';

// View-only readiness can be exercised with any authorized Intelligence Review account.
test.describe('Intelligence Review — business and diagnostics readiness (Batch 12)',()=>{
  test.beforeEach(async({page})=>{
    await loginAsTenant(page);
    await configureIntelligence(page);
  });
  test('TINT-037 URL readiness view does not issue recommendation queue GET',async({page})=>{
    let queueGets=0;
    await page.route(endpoint,route=>{queueGets++;return fulfillJson(route,reviewPayload());});
    await page.goto('/intelligence-review?view=readiness');
    await expect(page.getByRole('tab',{name:'Readiness & governance'})).toHaveAttribute('aria-selected','true');
    await expect(page.getByText('Business readiness',{exact:true}).first()).toBeVisible();
    expect(queueGets).toBe(0);
  });
  test('TINT-038 business readiness renders source-reported features and priority',async({page})=>{
    await page.goto('/intelligence-review?view=readiness');
    await expect(page.getByRole('heading',{name:'Readiness by feature'})).toBeVisible();
    await expect(page.getByText('Synthetic forecast readiness')).toHaveCount(2);
    await expect(page.locator('.ai-review-page__business-readiness')).toContainText('Collect independent evidence');
    await expect(page.locator('.ai-review-page__business-readiness')).toContainText('Open readiness items:');
  });
  test('TINT-039 readiness API rejection surfaces error without submitting a write',async({page})=>{
    let writes=0;
    await page.route(businessReadinessEndpoint,route=>fulfillJson(route,{message:'Synthetic readiness unavailable'},503));
    await page.route('**/intelligence-readiness/**',route=>{if(route.request().method()!=='GET')writes++;return route.abort();});
    await page.goto('/intelligence-review?view=readiness');
    await expect(page.locator('.ai-review-page__business-readiness .form-error')).toBeVisible();
    expect(writes).toBe(0);
  });
  test('TINT-040 explicit readiness refresh requests refresh=true for new evidence',async({page})=>{
    const uris:string[]=[];
    await page.route(businessReadinessEndpoint,route=>{uris.push(route.request().url());return fulfillJson(route,syntheticBusinessReadiness);});
    await page.goto('/intelligence-review?view=readiness');
    await expect(page.getByRole('heading',{name:'Readiness by feature'})).toBeVisible();
    await page.getByRole('button',{name:'Refresh readiness checks'}).click();
    await expect.poll(()=>uris.some(url=>new URL(url).searchParams.get('refresh')==='true')).toBe(true);
  });
});

test('TINT-041 restricted user sees business-readiness view without technical diagnostics',async({page})=>{
  await roleLogin(page,'PW_RESTRICTED');
  await configureIntelligence(page);
  let technicalGets=0;
  await page.route('**/intelligence-readiness/production-*',route=>{technicalGets++;return route.abort();});
  await page.goto('/intelligence-review?view=readiness');
  await expect(page.locator('.ai-review-page__business-readiness')).toBeVisible();
  await expect(page.getByText('require Tenant Diagnostics access and are not shown in the normal business view.')).toBeVisible();
  await expect(page.getByText('Technical governance diagnostics')).toHaveCount(0);
  expect(technicalGets).toBe(0);
});

test('TINT-042 diagnostics-entitled user sees production evidence section',async({page})=>{
  await roleLogin(page,'PW_DIAGNOSTICS');
  await configureIntelligence(page);
  let diagnosticsRequested=false;
  await page.route('**/intelligence-readiness/production-readiness-summary*',route=>{diagnosticsRequested=true;return fulfillJson(route,{summary:{total_features:0,production_candidates:0,not_production_ready:0},features:[],production_backlog:[]});});
  await page.goto('/intelligence-review?view=readiness');
  await expect(page.getByText('Technical governance diagnostics')).toBeVisible();
  await expect.poll(()=>diagnosticsRequested).toBe(true);
});

test.describe('Intelligence Review — persisted audit history (Batch 12)',()=>{
  test.beforeEach(async({page})=>{await loginAsTenant(page);await configureIntelligence(page);await page.goto('/intelligence-review');});
  test('TINT-043 history opens for selected action and shows persisted event actor',async({page})=>{
    let path='';
    await page.route(historyEndpoint,route=>{path=new URL(route.request().url()).pathname;return fulfillJson(route,{source:{source_action_id:'pw-action-001'},lifecycle:{current_status:'acknowledged'},events:[{id:'pw-event-1',event_type:'acknowledged',from_status:'pending_review',to_status:'acknowledged',created_at:timestamp,actor_name:'Synthetic reviewer',reviewer_notes:'Reviewed stock evidence'}]});});
    await selected(page).getByRole('button',{name:'View review history'}).click();
    await expect(page.locator('.ai-review-page__history-panel')).toContainText('Synthetic reviewer');
    await expect(page.locator('.ai-review-page__history-panel')).toContainText('Reviewed stock evidence');
    expect(path).toContain('/pw-action-001/history');
  });
  test('TINT-044 history request error retains selected source review',async({page})=>{
    await page.route(historyEndpoint,route=>fulfillJson(route,{message:'Synthetic audit unavailable'},503));
    await selected(page).getByRole('button',{name:'View review history'}).click();
    await expect(page.locator('.ai-review-page__history-panel .form-error')).toBeVisible();
    await expect(selected(page)).toContainText('Check stock planning assumptions');
  });
});

test.describe('Intelligence Review — governed mutations (Batch 12)',()=>{
  test('TINT-045 decision menu renders only decisions supplied by lifecycle',async({page})=>{
    await openGovernedReview(page,governed(['acknowledged','rejected']));
    const options=await decisionSelect(page).locator('option').evaluateAll(els=>els.map(el=>(el as HTMLOptionElement).value));
    expect(options).toEqual(['','acknowledged','rejected']);
  });
  test('TINT-046 required reason prevents POST while empty',async({page})=>{
    await openGovernedReview(page,governed());let posted=0;
    await page.route(decisionEndpoint,route=>{posted++;return route.abort();});
    await decisionSelect(page).selectOption('rejected');
    await expect(recordButton(page)).toBeDisabled();
    await expect(decisionPanel(page)).toContainText('Select a reason category before recording this decision.');
    expect(posted).toBe(0);
  });
  test('TINT-047 permitted POST includes decision and exact expected version',async({page})=>{
    await openGovernedReview(page,governed());let body:Record<string,unknown>|undefined;
    await page.route(decisionEndpoint,route=>{body=route.request().postDataJSON();return fulfillJson(route,{source:{source_action_id:'pw-action-001'},lifecycle:{current_status:'rejected'},events:[]});});
    await decisionSelect(page).selectOption('rejected');await reasonSelect(page).selectOption('insufficient_evidence');
    await recordButton(page).click();
    await expect.poll(()=>body?.expected_version).toBe(7);
    expect(body?.decision).toBe('rejected');expect(body?.reason_category).toBe('insufficient_evidence');
  });
  test('TINT-048 rejected POST reports failure without success claim',async({page})=>{
    await openGovernedReview(page,governed());
    await page.route(decisionEndpoint,route=>fulfillJson(route,{message:'Synthetic stale review version'},409));
    await decisionSelect(page).selectOption('rejected');await reasonSelect(page).selectOption('insufficient_evidence');await recordButton(page).click();
    await expect(page.locator('.ai-review-page')).toContainText('Synthetic stale review version');
    await expect(page.locator('.ai-review-page')).not.toContainText('Intelligence review decision recorded and audit history updated.');
  });
  test('TINT-049 successful decision refreshes GET evidence only and opens history',async({page})=>{
    await openGovernedReview(page,governed());let gets=0,writes=0;
    await page.route(endpoint,route=>{gets++;return fulfillJson(route,reviewPayload([governed()]));});
    await page.route(historyEndpoint,route=>fulfillJson(route,{source:{},lifecycle:{},events:[]}));
    await page.route(decisionEndpoint,route=>{writes++;return fulfillJson(route,{source:{source_action_id:'pw-action-001'},lifecycle:{current_status:'acknowledged'},events:[]});});
    await decisionSelect(page).selectOption('acknowledged');await recordButton(page).click();
    await expect(page.locator('.ai-review-page')).toContainText('Intelligence review decision recorded and audit history updated.');
    await expect(page.locator('.ai-review-page__history-panel')).toBeVisible();
    expect(writes).toBe(1);expect(gets).toBeGreaterThanOrEqual(1);
  });
  test('TINT-050 policy exception requires override reason even after reason category',async({page})=>{
    await openGovernedReview(page,governed());await decisionSelect(page).selectOption('approved_for_manual_action');
    await reasonSelect(page).selectOption('business_policy_exception');
    await expect(recordButton(page)).toBeDisabled();
    await expect(decisionPanel(page)).toContainText('Add an override reason for a business policy exception.');
    await decisionPanel(page).getByRole('textbox',{name:'Override reason'}).fill('Synthetic exception reviewed by authorized owner');
    await expect(recordButton(page)).toBeEnabled();
  });
  test('TINT-051 escalation requires assigned role and due date before submit',async({page})=>{
    await openGovernedReview(page,governed());await decisionSelect(page).selectOption('escalated');
    await reasonSelect(page).selectOption('insufficient_evidence');
    await expect(recordButton(page)).toBeDisabled();
    await decisionPanel(page).locator('select').nth(2).selectOption('manager');
    await expect(recordButton(page)).toBeDisabled();
    await decisionPanel(page).getByLabel('Due date').fill('2099-05-20');
    await expect(recordButton(page)).toBeEnabled();
  });
  test('TINT-052 named escalations are filtered by target reviewer role',async({page})=>{
    await roleLogin(page,'PW_GOVERNOR');
    const body={...reviewPayload([governed()]),reviewer_directory:[{id:'pw-manager',name:'Synthetic manager',escalation_roles:['manager']},{id:'pw-admin',name:'Synthetic admin',escalation_roles:['admin']}]};
    await configureIntelligence(page);await page.route(endpoint,route=>fulfillJson(route,body));await page.goto('/intelligence-review');
    await decisionSelect(page).selectOption('escalated');
    await decisionPanel(page).locator('select').nth(2).selectOption('manager');
    const values=await decisionPanel(page).locator('select').nth(3).locator('option').evaluateAll(els=>els.map(el=>(el as HTMLOptionElement).value));
    expect(values).toContain('pw-manager');expect(values).not.toContain('pw-admin');
  });
  test('TINT-053 manual approval cannot perform source operation by itself',async({page})=>{
    await openGovernedReview(page,governed());let totalMutations=0;
    await page.route('**/api/**',route=>{if(route.request().method()!=='GET')totalMutations++;return route.continue();});
    await page.route(decisionEndpoint,route=>fulfillJson(route,{source:{source_action_id:'pw-action-001'},lifecycle:{current_status:'approved_for_manual_action'},events:[]}));
    await decisionSelect(page).selectOption('approved_for_manual_action');await reasonSelect(page).selectOption('manual_execution_preferred');
    await recordButton(page).click();
    await expect(page.locator('.ai-review-page')).toContainText('Intelligence review decision recorded and audit history updated.');
    // Only the governed decision POST is authorized; no automatic stock/order/execution write.
    expect(totalMutations).toBeLessThanOrEqual(1);
  });
});

test.describe('Intelligence Review — downstream drafts and safety (Batch 12)',()=>{
  const approved=(extras:Record<string,unknown>={}):Review=>({...governed([]),review_state:'approved_for_manual_action',lifecycle:{current_status:'approved_for_manual_action',version:8,persisted:true,allowed_decisions:[]},...extras} as Review);
  test('TINT-054 approved ordinary review reveals gated Execution Request draft control',async({page})=>{
    await openGovernedReviewForDraft(page,approved());
    await expect(selected(page).getByRole('button',{name:'Create Execution Request draft'})).toBeVisible();
  });
  test('TINT-055 Execution Request POST is draft-only and does not call execution APIs',async({page})=>{
    await openGovernedReviewForDraft(page,approved());let target='';
    await page.route('**/operational-action-center/human-in-loop-ai-reviews/*/execution-request-draft',route=>{target=new URL(route.request().url()).pathname;return fulfillJson(route,{source:{source_action_id:'pw-action-001'},lifecycle:{execution_request_id:'pw-draft'}});});
    await selected(page).getByRole('button',{name:'Create Execution Request draft'}).click();
    await expect(page.locator('.ai-review-page')).toContainText('No operational action was executed.');
    expect(target).toContain('/pw-action-001/execution-request-draft');
  });
  test('TINT-056 approved replenishment review reveals PO draft with revalidation note',async({page})=>{
    await openGovernedReviewForDraft(page,approved({proposal_request_type:'replenishment_purchase_order_draft'}));
    await expect(selected(page).getByRole('button',{name:'Prepare Purchase Order Draft'})).toBeVisible();
    await expect(selected(page)).toContainText('It will not submit or approve it.');
  });
  test('TINT-057 Purchase Order draft failure preserves current review',async({page})=>{
    await openGovernedReviewForDraft(page,approved({proposal_request_type:'replenishment_purchase_order_draft'}));
    await page.route('**/operational-action-center/human-in-loop-ai-reviews/*/purchase-order-draft',route=>fulfillJson(route,{message:'Synthetic replenishment revalidation failed'},409));
    await selected(page).getByRole('button',{name:'Prepare Purchase Order Draft'}).click();
    await expect(page.locator('.ai-review-page')).toContainText('Synthetic replenishment revalidation failed');
    await expect(selected(page)).toContainText('Check stock planning assumptions');
  });
  test('TINT-058 forecast approval cannot expose operational draft action',async({page})=>{
    const forecast=approved({source_reference:{source_type:'probabilistic_forecast_model',source_id:'pw-forecast-1'}});
    await openGovernedReviewForDraft(page,forecast);
    await expect(selected(page)).toContainText('advisory forecasting');
    await expect(selected(page).getByRole('button',{name:'Create Execution Request draft'})).toHaveCount(0);
  });
  test('TINT-059 arbitrary source URL is not exposed as a navigation link',async({page})=>{
    await loginAsTenant(page);
    await configureIntelligence(page,[{...reviewItems()[0],source_reference:{source_type:'unknown_nonallowlisted',source_id:'https://malicious.example/redirect'}}]);
    await page.goto('/intelligence-review');
    await expect(selected(page).getByRole('link',{name:'Open source page'})).toHaveCount(0);
    await expect(selected(page).getByRole('link',{name:'Open action center'})).toHaveAttribute('href','/action-center');
  });
  test('TINT-060 escalation attention badge requires eligible reviewer context',async({page})=>{
    await roleLogin(page,'PW_RESTRICTED');
    await configureIntelligence(page,[{...reviewItems()[0],lifecycle:{current_status:'escalated',version:1,persisted:true,allowed_decisions:[]}}]);
    let requests=0;
    await page.route('**/operational-action-center/human-in-loop-ai-reviews/escalation-attention-summary',route=>{requests++;return fulfillJson(route,{requires_attention:true,actionable_count:2,overdue_count:1});});
    await page.goto('/intelligence-review');
    await expect(selected(page)).toBeVisible();
    await expect(selected(page)).not.toHaveAttribute('data-sidebar-attention-item','true');
    expect(requests).toBe(0);
  });
});

async function openGovernedReviewForDraft(page:Page,review:Review){
  await roleLogin(page,'PW_GOVERNOR');
  await configureIntelligence(page,[review]);
  await page.goto('/intelligence-review');
  await expect(selected(page)).toHaveCount(1);
}
