import {test,expect,type Page} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';
import {loginAsDisposableRole} from '../../../support/roleSession';

// Batch 19: Reliability Command, tenant route /reliability-command.
// UI source: ReliabilityCommandPage.tsx, useRouteQueryState.ts, router.tsx.
// Backend: GET /platform-reliability/command-board; platform_reliability.read;
// min_readiness watch|degraded|critical, optional min_severity medium|high|critical,
// limit integer 1..100. Synthetic GET fixtures verify UI only, not server scoring.
const reliabilityEndpoint='**/platform-reliability/command-board?*';
const sampleDimension={key:'inventory_pressure',label:'Synthetic inventory pressure',score:82.5,readiness:'watch',assessment_available:true,evidence:['records_reviewed:3','ready_for_followup:true'],recommendation:'Review synthetic inventory context',source_path:'/action-center'};
const sampleRisk={risk_key:'pw-risk-1',label:'Synthetic delayed review',dimension:'inventory_pressure',severity:'high',readiness:'degraded',score:39.25,recommended_owner:'operations_manager',recommended_runbook:'manual_inventory_review',recommended_next_action:'Review evidence in the source workflow',source_path:'/action-center'};
const reviewPath=[
 {key:'evidence_review',label:'Synthetic evidence review',description:'Collect source evidence manually',item_count:1,items:[{item_key:'pw-step-1',label:'Synthetic evidence task',dimension:'inventory_pressure',severity:'high',stage_status:'conditional_ready',owner:'operations_manager',reviewer:'quality_reviewer',instructions:['Review source evidence','Confirm with owner'],source_path:'/action-center'}]},
 {key:'closure_review',label:'Synthetic closure review',description:'Do not close without owner signoff',item_count:0,items:[]}
];
function reliabilityData(overrides:Record<string,unknown>={}){
 return {presentation:{system_text_contract:'platform_reliability_command_system_text_v1'},generated_at:'2026-11-03T10:00:00Z',
  filters:{limit:9,min_readiness:'watch',min_severity:null},overview:{reliability_score:77.25,readiness:'watch',dimension_count:9,unassessed_dimension_count:0,risk_count:1,closure_review_count:1,scoring_note:'Synthetic advisory score, not service uptime'},
  dimensions:[sampleDimension],risks:[sampleRisk],review_path:reviewPath,safety:{read_only:true,source_workflows_remain_authoritative:true,creates_incident:false,records_signoff:false,changes_release_state:false},...overrides};
}
async function openReliability(page:Page,data:Record<string,unknown>=reliabilityData(),route='/reliability-command'){
 await loginAsTenant(page);await page.route(reliabilityEndpoint,r=>fulfillJson(r,data));await page.goto(route);
 await expect(page.getByText('Review current pressure, safety checks, and the manual follow-up path')).toBeVisible();
}
const reliabilityFilters=(page:Page)=>page.locator('.reliability-filters');
const reliabilityRisks=(page:Page)=>page.locator('.reliability-risk-card');

// Synthetic fixtures never replace the required isolated-server permission or scoring checks in Phase 2.
test.describe('Reliability Command — advisory posture and read-only review (Batch 19)',()=>{
 test('TRC-001 Hero explicitly describes a read-only review and human follow-up',async({page})=>{
  await openReliability(page);await expect(page.getByText('Read-only operational reliability review')).toBeVisible();
  await expect(page.getByText('It never closes a risk, records approval, starts monitoring',{exact:false})).toBeVisible();
 });
 test('TRC-002 Slow command-board GET presents a loading state',async({page})=>{
  await loginAsTenant(page);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  await page.route(reliabilityEndpoint,async route=>{await gate;await fulfillJson(route,reliabilityData());});
  await page.goto('/reliability-command');await expect(page.getByRole('heading',{name:'Loading the reliability review'})).toBeVisible();
  release();await expect(page.getByRole('heading',{name:'Reliability posture'})).toBeVisible();
 });
 test('TRC-003 Failed command-board fetch exposes Retry and recovers on fresh GET',async({page})=>{
  await loginAsTenant(page);let ok=false;let calls=0;
  await page.route(reliabilityEndpoint,route=>{calls++;return fulfillJson(route,ok?reliabilityData():{message:'Synthetic failure'},ok?200:503);});
  await page.goto('/reliability-command');await expect(page.getByRole('heading',{name:'Reliability review could not be loaded'})).toBeVisible();
  ok=true;await page.getByRole('button',{name:'Retry'}).click();await expect(page.getByRole('heading',{name:'Reliability posture'})).toBeVisible();expect(calls).toBeGreaterThanOrEqual(2);
 });
 test('TRC-004 Refresh review re-fetches only command-board GET',async({page})=>{
  await openReliability(page);let requests=0;let writes=0;
  await page.route(reliabilityEndpoint,route=>{requests++;if(route.request().method()!=='GET')writes++;return fulfillJson(route,reliabilityData());});
  await page.getByRole('button',{name:'Refresh review'}).click();await expect.poll(()=>requests).toBeGreaterThanOrEqual(1);expect(writes).toBe(0);
 });
 test('TRC-005 Default filter query requests watch threshold and nine rows',async({page})=>{
  await loginAsTenant(page);let url='';await page.route(reliabilityEndpoint,route=>{url=route.request().url();return fulfillJson(route,reliabilityData());});
  await page.goto('/reliability-command');await expect(page.getByRole('heading',{name:'Reliability posture'})).toBeVisible();
  const params=new URL(url).searchParams;expect(params.get('min_readiness')).toBe('watch');expect(params.get('limit')).toBe('9');expect(params.has('min_severity')).toBe(false);
 });
 test('TRC-006 Readiness selection sends degraded backend threshold and persists in URL',async({page})=>{
  await openReliability(page);let url='';await page.route(reliabilityEndpoint,route=>{url=route.request().url();return fulfillJson(route,reliabilityData());});
  await reliabilityFilters(page).getByLabel('Risk readiness threshold').selectOption('degraded');
  await expect.poll(()=>new URL(url).searchParams.get('min_readiness')).toBe('degraded');await expect(page).toHaveURL(/readiness=degraded/);
 });
 test('TRC-007 Severity high selection adds min_severity and preserves readiness',async({page})=>{
  await openReliability(page);let url='';await page.route(reliabilityEndpoint,route=>{url=route.request().url();return fulfillJson(route,reliabilityData());});
  await reliabilityFilters(page).getByLabel('Risk severity threshold').selectOption('high');
  await expect.poll(()=>new URL(url).searchParams.get('min_severity')).toBe('high');expect(new URL(url).searchParams.get('min_readiness')).toBe('watch');
 });
 test('TRC-008 Maximum review items selector sends bounded limit=3',async({page})=>{
  await openReliability(page);let url='';await page.route(reliabilityEndpoint,route=>{url=route.request().url();return fulfillJson(route,reliabilityData({filters:{limit:3,min_readiness:'watch'}}));});
  await reliabilityFilters(page).getByLabel('Maximum review items').selectOption('3');
  await expect.poll(()=>new URL(url).searchParams.get('limit')).toBe('3');await expect(reliabilityFilters(page)).toContainText('Up to 3 items per review stage');
 });
 test('TRC-009 Clear filters resets all choices and removes Clear filters control',async({page})=>{
  await openReliability(page);await reliabilityFilters(page).getByLabel('Risk readiness threshold').selectOption('critical');
  await reliabilityFilters(page).getByLabel('Risk severity threshold').selectOption('medium');
  await reliabilityFilters(page).getByLabel('Maximum review items').selectOption('5');
  await reliabilityFilters(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(reliabilityFilters(page).getByLabel('Risk readiness threshold')).toHaveValue('watch');
  await expect(reliabilityFilters(page).getByLabel('Risk severity threshold')).toHaveValue('all');
  await expect(reliabilityFilters(page).getByLabel('Maximum review items')).toHaveValue('9');
  await expect(reliabilityFilters(page).getByRole('button',{name:'Clear filters'})).toHaveCount(0);
 });
 test('TRC-010 Valid deep-link query initializes all three controls',async({page})=>{
  await openReliability(page,reliabilityData(),'/reliability-command?readiness=critical&severity=high&limit=5');
  await expect(reliabilityFilters(page).getByLabel('Risk readiness threshold')).toHaveValue('critical');
  await expect(reliabilityFilters(page).getByLabel('Risk severity threshold')).toHaveValue('high');
  await expect(reliabilityFilters(page).getByLabel('Maximum review items')).toHaveValue('5');
 });
 test('TRC-011 Unsupported query values cannot create unlisted filter choices',async({page})=>{
  await openReliability(page,reliabilityData(),'/reliability-command?readiness=all&severity=extreme&limit=10000');
  await expect(reliabilityFilters(page).getByLabel('Risk readiness threshold')).toHaveValue('watch');
  await expect(reliabilityFilters(page).getByLabel('Risk severity threshold')).toHaveValue('all');
  await expect(reliabilityFilters(page).getByLabel('Maximum review items')).toHaveValue('9');
 });
 test('TRC-012 Summary score is labeled advisory rather than uptime or approval',async({page})=>{
  await openReliability(page);const summary=page.getByLabel('Reliability summary');
  await expect(summary).toContainText('77.25%');await expect(summary).toContainText('Advisory reliability score');
  await expect(summary).toContainText('not an uptime percentage');await expect(page.locator('.reliability-scoring-note')).toContainText('Synthetic advisory score');
 });
 test('TRC-013 Nine reliability dimension cards stay visible when risk threshold changes',async({page})=>{
  const dimensions=Array.from({length:9},(_,i)=>({...sampleDimension,key:`pw-dimension-${i}`,label:`Synthetic dimension ${i+1}`}));
  await openReliability(page,reliabilityData({dimensions}));await expect(page.locator('.reliability-dimension-card')).toHaveCount(9);
  await reliabilityFilters(page).getByLabel('Risk readiness threshold').selectOption('critical');await expect(page.locator('.reliability-dimension-card')).toHaveCount(9);
  await expect(page.locator('.reliability-dimension-card').nth(8)).toContainText('Synthetic dimension 9');
 });
 test('TRC-014 Dimension evidence renders localized boolean and numeric interpretation',async({page})=>{
  await openReliability(page);const card=page.locator('.reliability-dimension-card').first();
  await expect(card).toContainText('Records Reviewed: 3');await expect(card).toContainText('Ready For Followup: Yes');
  await expect(card).toContainText('Review synthetic inventory context');
 });
 test('TRC-015 Unknown source path never exposes an arbitrary navigation link',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,source_path:'https://example.org/unsafe'}],risks:[{...sampleRisk,source_path:'/unrecognized'}]}));
  await expect(page.locator('.reliability-dimension-card').getByRole('link')).toHaveCount(0);
  await expect(reliabilityRisks(page).getByRole('link')).toHaveCount(0);
 });
 test('TRC-016 Risk card shows score, recommended owner, runbook and next action',async({page})=>{
  await openReliability(page);const card=reliabilityRisks(page).first();
  await expect(card.getByRole('heading',{name:'Synthetic delayed review'})).toBeVisible();
  for(const text of ['Review evidence in the source workflow','39.25%','Operations Manager','Manual Inventory Review'])await expect(card).toContainText(text);
 });
 test('TRC-017 With zero risks and all dimensions assessed, summary avoids approval claims',async({page})=>{
  await openReliability(page,reliabilityData({risks:[],overview:{reliability_score:92,readiness:'ready',risk_count:0,closure_review_count:0,unassessed_dimension_count:0}}));
  await expect(page.getByRole('heading',{name:'No non-ready risks match the current thresholds'})).toBeVisible();
  await expect(page.getByText('This is not a release approval',{exact:false})).toBeVisible();await expect(reliabilityRisks(page)).toHaveCount(0);
 });
 test('TRC-018 Unassessed dimensions disclose permission-limited absence of risk claims',async({page})=>{
  await openReliability(page,reliabilityData({risks:[],overview:{reliability_score:null,readiness:'not_assessed',risk_count:0,unassessed_dimension_count:3}}));
  await expect(page.getByRole('heading',{name:'No assessed non-ready risks match the current thresholds'})).toBeVisible();
  await expect(page.getByText('Some dimensions are not assessed because this role cannot read',{exact:false})).toBeVisible();
 });
 test('TRC-019 Manual review path is guidance, not a created task or signoff',async({page})=>{
  await openReliability(page);await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.getByRole('heading',{name:'Generated manual review path'})).toBeVisible();
  await expect(page.getByText('They do not create records, upload evidence, record decisions',{exact:false})).toBeVisible();
  await expect(page.locator('.reliability-risk-card')).toHaveCount(0);
 });
 test('TRC-020 First populated review stage starts expanded; empty later stage stays collapsed',async({page})=>{
  await openReliability(page);await page.getByRole('tab',{name:'Manual review path'}).click();
  const stages=page.locator('details.reliability-stage');await expect(stages).toHaveCount(2);
  await expect(stages.nth(0)).toHaveAttribute('open','');await expect(stages.nth(0)).toContainText('Synthetic evidence task');
  await expect(stages.nth(1)).not.toHaveAttribute('open','');
 });

 test('TRC-021 Expanding collapsed review stage reveals its suggested guidance',async({page})=>{
  const second={key:'closure_review',label:'Synthetic closure review',description:'Manual confirmation only',item_count:1,items:[{item_key:'pw-closure',label:'Synthetic closure task',dimension:'inventory_pressure',instructions:['Check approval evidence'],owner:'review_owner',reviewer:'reviewer_team'}]};
  await openReliability(page,reliabilityData({review_path:[reviewPath[0],second]}));await page.getByRole('tab',{name:'Manual review path'}).click();
  const stage=page.locator('details.reliability-stage').nth(1);await expect(stage).not.toHaveAttribute('open','');
  await stage.locator('summary').click();await expect(stage).toHaveAttribute('open','');await expect(stage.getByRole('heading',{name:'Synthetic closure task'})).toBeVisible();
 });
 test('TRC-022 Empty manual-review stage displays explicitly no matching guidance',async({page})=>{
  await openReliability(page);await page.getByRole('tab',{name:'Manual review path'}).click();
  const empty=page.locator('details.reliability-stage').nth(1);await empty.locator('summary').click();
  await expect(empty).toContainText('No matching risk generated guidance for this stage.');await expect(empty.locator('.reliability-stage-item')).toHaveCount(0);
 });
 test('TRC-023 Review item shows source-backed dimension label and stage description',async({page})=>{
  await openReliability(page);await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage').first()).toContainText('Collect source evidence manually');
  await expect(page.locator('.reliability-stage-item').first()).toContainText('Synthetic inventory pressure');
 });
 test('TRC-024 Review item displays distinct suggested owner and reviewer identities',async({page})=>{
  await openReliability(page);await page.getByRole('tab',{name:'Manual review path'}).click();
  const item=page.locator('.reliability-stage-item').first();
  await expect(item.locator('dl')).toContainText('Suggested owner');await expect(item.locator('dl')).toContainText('Operations Manager');
  await expect(item.locator('dl')).toContainText('Suggested reviewer');await expect(item.locator('dl')).toContainText('Quality Reviewer');
 });
 test('TRC-025 Manual guidance instructions preserve their original numbered sequence',async({page})=>{
  await openReliability(page);await page.getByRole('tab',{name:'Manual review path'}).click();
  const lines=page.locator('.reliability-stage-item ol.reliability-instruction-list > li');await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toHaveText('Review source evidence');await expect(lines.nth(1)).toHaveText('Confirm with owner');
 });
 test('TRC-026 Risk severity and review stage status use canonical readable badges',async({page})=>{
  await openReliability(page);const risk=page.locator('.reliability-risk-card').first();
  await expect(risk.locator('.reliability-badge-row')).toContainText('High');await expect(risk.locator('.reliability-badge-row')).toContainText('Degraded');
  await page.getByRole('tab',{name:'Manual review path'}).click();await expect(page.locator('.reliability-stage-item').first().locator('.reliability-badge-row')).toContainText('Conditionally ready');
 });
 test('TRC-027 Known review-stage Action Center source links to its exact route for an authorized user',async({page})=>{
  await loginAsDisposableRole(page,'PW_RC_ALL_SOURCE_READ');await page.route(reliabilityEndpoint,r=>fulfillJson(r,reliabilityData()));await page.goto('/reliability-command');
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage-item').first().getByRole('link',{name:'Open Action Center'})).toHaveAttribute('href','/action-center');
 });
 test('TRC-028 Unrecognized review-stage source never renders a free-form navigation link',async({page})=>{
  const altered=[{...reviewPath[0],items:[{...reviewPath[0].items[0],source_path:'https://example.invalid/unsafe'}]},reviewPath[1]];
  await openReliability(page,reliabilityData({review_path:altered}));await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage-item').getByRole('link')).toHaveCount(0);
 });
 test('TRC-029 Human-review readiness dimension deep-links to readiness query view',async({page})=>{
  await loginAsDisposableRole(page,'PW_RC_ALL_SOURCE_READ');await page.route(reliabilityEndpoint,r=>fulfillJson(r,reliabilityData({dimensions:[{...sampleDimension,key:'human_review_readiness',source_path:'/intelligence-review'}]})));await page.goto('/reliability-command');
  await expect(page.locator('.reliability-dimension-card').getByRole('link',{name:'Open Intelligence Review'})).toHaveAttribute('href','/intelligence-review?view=readiness');
 });
 test('TRC-030 Intelligence Review links are withheld without decision_intelligence.read',async({page})=>{
  await loginAsDisposableRole(page,'PW_RC_NO_INTELLIGENCE');await page.route(reliabilityEndpoint,r=>fulfillJson(r,reliabilityData({dimensions:[{...sampleDimension,source_path:'/intelligence-review'}]})));await page.goto('/reliability-command');
  await expect(page.getByRole('heading',{name:'Reliability posture'})).toBeVisible();
  await expect(page.locator('.reliability-posture').getByRole('link',{name:'Open Intelligence Review'})).toHaveCount(0);
 });
 test('TRC-031 Digital Twin source requires both operational and intelligence permissions',async({page})=>{
  await loginAsDisposableRole(page,'PW_RC_NO_ACTION');await page.route(reliabilityEndpoint,r=>fulfillJson(r,reliabilityData({dimensions:[{...sampleDimension,source_path:'/digital-twin'}]})));await page.goto('/reliability-command');
  await expect(page.locator('.reliability-dimension-card')).toContainText('Synthetic inventory pressure');
  await expect(page.locator('.reliability-dimension-card').getByRole('link',{name:'Open Digital Twin'})).toHaveCount(0);
 });
 test('TRC-032 Action Center, Workflow Composer and Operations Feed shortcuts require operational read permission',async({page})=>{
  const dims=['/action-center','/workflow-composer','/real-time-operations-feed','/collaboration'].map((path,i)=>({...sampleDimension,key:`operational-${i}`,source_path:path}));
  await loginAsDisposableRole(page,'PW_RC_NO_ACTION');await page.route(reliabilityEndpoint,r=>fulfillJson(r,reliabilityData({dimensions:dims})));await page.goto('/reliability-command');
  await expect(page.locator('.reliability-dimension-card')).toHaveCount(4);
  await expect(page.locator('.reliability-dimension-card').getByRole('link')).toHaveCount(0);
 });
 test('TRC-033 Safety tab shows the reported true and false flags as Yes and No',async({page})=>{
  await openReliability(page,reliabilityData({safety:{read_only:true,creates_incident:false,sends_notification:false}}));await page.getByRole('tab',{name:'Safety and limits'}).click();
  const facts=page.locator('.reliability-safety-facts');await expect(facts).toContainText('Read only');await expect(facts).toContainText('Creates incident');
  await expect(facts.locator('dd')).toHaveText(['Yes','No','No']);
 });
 test('TRC-034 Missing optional backend safety flags stay absent rather than being invented',async({page})=>{
  await openReliability(page,reliabilityData({safety:{}}));await page.getByRole('tab',{name:'Safety and limits'}).click();
  await expect(page.locator('.reliability-safety-facts > div')).toHaveCount(0);await expect(page.getByRole('heading',{name:'Backend safety confirmation'})).toBeVisible();
 });
 test('TRC-035 Safety guidance explicitly rules out remediation, approval, notification and monitoring',async({page})=>{
  await openReliability(page);await page.getByRole('tab',{name:'Safety and limits'}).click();
  for(const heading of ['No automatic remediation','No approval or signoff','No incident or notification','No monitoring activation','Source workflows stay authoritative'])await expect(page.getByRole('heading',{name:heading})).toBeVisible();
  await expect(page.getByText('Nothing is scheduled or activated here.')).toBeVisible();
 });
 test('TRC-036 Filter selection, tab changes and refresh send no reliability command mutation requests',async({page})=>{
  await openReliability(page);const commands:string[]=[];
  page.on('request',request=>{if(request.url().includes('/platform-reliability/command-board'))commands.push(request.method());});
  await reliabilityFilters(page).getByLabel('Risk severity threshold').selectOption('high');
  await page.getByRole('tab',{name:'Manual review path'}).click();await page.getByRole('tab',{name:'Safety and limits'}).click();
  await page.getByRole('button',{name:'Refresh review'}).click();await expect.poll(()=>commands.length).toBeGreaterThan(0);
  expect(commands.every(method=>method==='GET')).toBe(true);
 });
 test('TRC-037 Switching tabs retains all three active risk filters',async({page})=>{
  await openReliability(page);await reliabilityFilters(page).getByLabel('Risk readiness threshold').selectOption('critical');
  await reliabilityFilters(page).getByLabel('Risk severity threshold').selectOption('medium');await reliabilityFilters(page).getByLabel('Maximum review items').selectOption('5');
  await page.getByRole('tab',{name:'Safety and limits'}).click();await page.getByRole('tab',{name:'Posture and risks'}).click();
  await expect(reliabilityFilters(page).getByLabel('Risk readiness threshold')).toHaveValue('critical');await expect(reliabilityFilters(page).getByLabel('Risk severity threshold')).toHaveValue('medium');await expect(reliabilityFilters(page).getByLabel('Maximum review items')).toHaveValue('5');
 });
 test('TRC-038 Missing dimension, risk and overview scores display Not assessed not zero',async({page})=>{
  await openReliability(page,reliabilityData({overview:{reliability_score:null,readiness:'not_assessed',risk_count:1},dimensions:[{...sampleDimension,score:null}],risks:[{...sampleRisk,score:null}]}));
  await expect(page.getByLabel('Reliability summary')).toContainText('Not assessed');
  await expect(page.locator('.reliability-dimension-card').first().locator('.reliability-score-line')).toContainText('Not assessed');
  await expect(page.locator('.reliability-risk-card').first().locator('dl')).toContainText('Not assessed');
 });
 test('TRC-039 Safety markers are descriptive fields, not operational action buttons',async({page})=>{
  await openReliability(page);await page.getByRole('tab',{name:'Safety and limits'}).click();
  await expect(page.locator('.reliability-safety-facts dd')).toHaveCount(5);
  await expect(page.locator('.reliability-safety-facts').getByRole('button')).toHaveCount(0);
  await expect(page.getByText('The API confirms the same non-mutating guardrails shown above.')).toBeVisible();
 });
 test('TRC-040 Unknown readiness code has readable identifier fallback, not a blank badge',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,readiness:'overnight_watch'}]}));
  await expect(page.locator('.reliability-dimension-card').first().locator('.reliability-badge')).toHaveText('Overnight Watch');
 });
 test('TRC-041 Unassessed dimension visibly reports Not assessed with no score',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,assessment_available:false,readiness:'not_assessed',score:null}]}));
  const card=page.locator('.reliability-dimension-card').first();await expect(card.locator('.reliability-badge')).toHaveText('Not assessed');
  await expect(card.locator('.reliability-score-line')).toContainText('Not assessed');
 });
 test('TRC-042 Missing dimension evidence does not create an empty bullet list',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,evidence:[]}]}));
  const card=page.locator('.reliability-dimension-card').first();await expect(card).toContainText('Review synthetic inventory context');
  await expect(card.locator('ul.reliability-evidence-list')).toHaveCount(0);
 });
 test('TRC-043 Unrecognized evidence key and status remain readable as text',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,evidence:['unexpected_value:review_later']}]}));
  await expect(page.locator('.reliability-dimension-card').first().locator('ul.reliability-evidence-list')).toContainText('Unexpected Value: Review Later');
 });
 test('TRC-044 Arbitrary source paths never render links inside dimension, risk or review cards',async({page})=>{
  const path='https://example.invalid/adversarial';
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,source_path:path}],risks:[{...sampleRisk,source_path:path}],review_path:[{...reviewPath[0],items:[{...reviewPath[0].items[0],source_path:path}]}]}));
  await expect(page.locator('.reliability-dimension-card').getByRole('link')).toHaveCount(0);await expect(page.locator('.reliability-risk-card').getByRole('link')).toHaveCount(0);
  await page.getByRole('tab',{name:'Manual review path'}).click();await expect(page.locator('.reliability-stage-item').getByRole('link')).toHaveCount(0);
 });
 test('TRC-045 Route redirects a tenant without platform_reliability.read to dashboard',async({page})=>{
  await loginAsDisposableRole(page,'PW_RC_NO_READ');await page.goto('/reliability-command');
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/);await expect(page.getByRole('heading',{name:'Operations Dashboard'})).toBeVisible();
  await expect(page.locator('.reliability-page')).toHaveCount(0);
 });
 test('TRC-046 Permission-limited source dimensions disclose incomplete assessment in empty risks',async({page})=>{
  await openReliability(page,reliabilityData({overview:{reliability_score:null,readiness:'not_assessed',unassessed_dimension_count:2,risk_count:0,dimension_count:9,source_surface_total_count:9,permission_limited_source_surface_count:2},risks:[]}));
  await expect(page.getByRole('heading',{name:'No assessed non-ready risks match the current thresholds'})).toBeVisible();
  await expect(page.getByText('Some dimensions are not assessed because this role cannot read',{exact:false})).toBeVisible();
 });
 test('TRC-047 High advisory readiness never masquerades as production release acceptance',async({page})=>{
  await openReliability(page,reliabilityData({overview:{reliability_score:99.5,readiness:'ready',risk_count:0,unassessed_dimension_count:0},risks:[]}));
  await expect(page.getByLabel('Reliability summary')).toContainText('99.5%');await expect(page.getByLabel('Reliability summary')).toContainText('not an uptime percentage');
  await page.getByRole('tab',{name:'Safety and limits'}).click();await expect(page.getByText('It is not uptime, service availability, deployment approval, or a legal assurance.')).toBeVisible();
 });
 test('TRC-048 Returning to default filters and refreshing keeps the exact default command query',async({page})=>{
  await openReliability(page,reliabilityData(),'/reliability-command?readiness=critical&severity=high&limit=5');let last='';
  await page.route(reliabilityEndpoint,route=>{last=route.request().url();return fulfillJson(route,reliabilityData());});
  await reliabilityFilters(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(reliabilityFilters(page).getByRole('button',{name:'Clear filters'})).toHaveCount(0);
  await page.getByRole('button',{name:'Refresh review'}).click();await expect.poll(()=>last.includes('min_readiness=watch')&&last.includes('limit=9')).toBe(true);
  expect(new URL(last).searchParams.has('min_severity')).toBe(false);
 });
 test('TRC-049 A failed filtered command fetch shows error view rather than stale Ready',async({page})=>{
  await loginAsTenant(page);let fail=false;
  await page.route(reliabilityEndpoint,route=>fulfillJson(route,fail?{message:'Synthetic unavailable'}:reliabilityData({overview:{reliability_score:100,readiness:'ready'}}),fail?503:200));
  await page.goto('/reliability-command');await expect(page.getByLabel('Reliability summary')).toContainText('Ready');
  fail=true;await reliabilityFilters(page).getByLabel('Risk readiness threshold').selectOption('critical');
  await expect(page.getByRole('heading',{name:'Reliability review could not be loaded'})).toBeVisible();
  await expect(page.getByLabel('Reliability summary')).toHaveCount(0);
 });
 test('TRC-050 Linked operational source retains its own destination and permission gate',async({page})=>{
  await loginAsDisposableRole(page,'PW_RC_ALL_SOURCE_READ');await page.route(reliabilityEndpoint,route=>fulfillJson(route,reliabilityData()));await page.goto('/reliability-command');
  const link=page.locator('.reliability-dimension-card').first().getByRole('link',{name:'Open Action Center'});
  await expect(link).toHaveAttribute('href','/action-center');await link.click();await expect(page).toHaveURL(/\/action-center(?:\?.*)?$/);
  await expect(page.locator('.reliability-page')).toHaveCount(0);
 });
});

// Batch 182 — source-boundary presentation on the existing tenant Reliability Command page.
// These are intercepted GET fixtures. They do not validate backend reliability computation,
// real permissions, incident creation, tenant isolation, or acceptance in a running deployment.
test.describe('Reliability Command — evidence normalization, review fallbacks and safety flags (Batch 182)',()=>{
 test('TRC-051 Evidence without a key-value separator is displayed as a human sentence',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,evidence:['follow_up_required']}]}));
  await expect(page.locator('.reliability-evidence-list li').first()).toHaveText('Follow Up Required');
 });
 test('TRC-052 Boolean true evidence is rendered as affirmative human-readable evidence',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,evidence:['safe_for_review:true']}]}));
  await expect(page.locator('.reliability-evidence-list li').first()).toHaveText('Safe For Review: Yes');
 });
 test('TRC-053 Boolean false evidence is rendered as negative human-readable evidence',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,evidence:['auto_execution_allowed:false']}]}));
  await expect(page.locator('.reliability-evidence-list li').first()).toHaveText('Auto Execution Allowed: No');
 });
 test('TRC-054 Negative decimal evidence is numeric rather than interpreted as an identifier',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,evidence:['trend_delta:-1.25']}]}));
  await expect(page.locator('.reliability-evidence-list li').first()).toContainText('-1.25');
  await expect(page.locator('.reliability-evidence-list li').first()).toContainText('Trend Delta:');
 });
 test('TRC-055 Canonical status encoded inside evidence is displayed as a readable label',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,evidence:['decision_state:ready_after_manual_confirmation']}]}));
  await expect(page.locator('.reliability-evidence-list li').first()).toHaveText('Decision State: Ready after manual confirmation');
 });
 test('TRC-056 Empty evidence value explicitly discloses missing evidence',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,evidence:['review_note:']}]}));
  await expect(page.locator('.reliability-evidence-list li').first()).toHaveText('Review Note: Not reported');
 });
 test('TRC-057 Dimension with no recommendation provides a human-review fallback',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,recommendation:''}]}));
  await expect(page.locator('.reliability-dimension-card').first()).toContainText('No recommendation was reported.');
 });
 test('TRC-058 Blank dimension label is not mistaken for a named system dimension',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,label:''}]}));
  await expect(page.locator('.reliability-dimension-card').first().getByRole('heading',{name:'Reliability dimension'})).toBeVisible();
 });
 test('TRC-059 Missing readiness code renders Not assessed instead of a readiness claim',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,readiness:''}]}));
  await expect(page.locator('.reliability-dimension-card').first().locator('.reliability-badge')).toHaveText('Not assessed');
 });
 test('TRC-060 Multiple evidence items preserve server-provided order',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[{...sampleDimension,evidence:['first_check:true','second_check:false','third_check:3']}]}));
  await expect(page.locator('.reliability-dimension-card').first().locator('.reliability-evidence-list li')).toHaveText(['First Check: Yes','Second Check: No','Third Check: 3']);
 });
 test('TRC-061 Risk whose dimension key was not returned gets a generic dimension label',async({page})=>{
  await openReliability(page,reliabilityData({dimensions:[],risks:[{...sampleRisk,dimension:'unknown_source_dimension'}]}));
  await expect(reliabilityRisks(page).first()).toContainText('Reliability dimension');
  await expect(reliabilityRisks(page).first()).not.toContainText('Synthetic inventory pressure');
 });
 test('TRC-062 Blank risk label uses an explicit review item fallback',async({page})=>{
  await openReliability(page,reliabilityData({risks:[{...sampleRisk,label:''}]}));
  await expect(reliabilityRisks(page).first().getByRole('heading',{name:'Reliability review item'})).toBeVisible();
 });
 test('TRC-063 Risk with missing next action keeps manual decision advice visible',async({page})=>{
  await openReliability(page,reliabilityData({risks:[{...sampleRisk,recommended_next_action:''}]}));
  await expect(reliabilityRisks(page).first()).toContainText('Review the source workflow and capture the human decision there.');
 });
 test('TRC-064 Missing risk owner is displayed as Not reported',async({page})=>{
  await openReliability(page,reliabilityData({risks:[{...sampleRisk,recommended_owner:''}]}));
  await expect(reliabilityRisks(page).first().locator('.reliability-facts dd').nth(1)).toHaveText('Not reported');
 });
 test('TRC-065 Missing risk runbook is displayed as Not reported',async({page})=>{
  await openReliability(page,reliabilityData({risks:[{...sampleRisk,recommended_runbook:''}]}));
  await expect(reliabilityRisks(page).first().locator('.reliability-facts dd').nth(2)).toHaveText('Not reported');
 });
 test('TRC-066 Risk owner and runbook internal identifiers are formatted for operators',async({page})=>{
  await openReliability(page,reliabilityData({risks:[{...sampleRisk,recommended_owner:'release/quality_lead',recommended_runbook:'manual:stock-verification'}]}));
  await expect(reliabilityRisks(page).first().locator('.reliability-facts dd').nth(1)).toHaveText('Release Quality Lead');
  await expect(reliabilityRisks(page).first().locator('.reliability-facts dd').nth(2)).toHaveText('Manual Stock Verification');
 });
 test('TRC-067 Critical severity and degraded readiness receive independent visual tones',async({page})=>{
  await openReliability(page,reliabilityData({risks:[{...sampleRisk,severity:'critical',readiness:'degraded'}]}));
  await expect(reliabilityRisks(page).first().locator('.reliability-badge').first()).toHaveClass(/reliability-badge--critical/);
  await expect(reliabilityRisks(page).first().locator('.reliability-badge').last()).toHaveClass(/reliability-badge--high/);
 });
 test('TRC-068 Zero risk score stays an assessed zero and is not treated as absent',async({page})=>{
  await openReliability(page,reliabilityData({risks:[{...sampleRisk,score:0}]}));
  await expect(reliabilityRisks(page).first().locator('.reliability-facts dd').first()).toHaveText('0%');
 });
 test('TRC-069 Empty review-stage title uses its named fallback',async({page})=>{
  await openReliability(page,reliabilityData({review_path:[{...reviewPath[0],label:''}]}));
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage').first().getByRole('heading',{name:'Manual review stage'})).toBeVisible();
 });
 test('TRC-070 Empty review-stage description renders manual guidance fallback',async({page})=>{
  await openReliability(page,reliabilityData({review_path:[{...reviewPath[0],description:''}]}));
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage').first()).toContainText('Manual review guidance');
 });
 test('TRC-071 Empty review item label uses the standard review-item fallback',async({page})=>{
  await openReliability(page,reliabilityData({review_path:[{...reviewPath[0],items:[{...reviewPath[0].items[0],label:''}]}]}));
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage-item').first().getByRole('heading',{name:'Reliability review item'})).toBeVisible();
 });
 test('TRC-072 Blank review-stage status is described as Not assessed',async({page})=>{
  await openReliability(page,reliabilityData({review_path:[{...reviewPath[0],items:[{...reviewPath[0].items[0],stage_status:''}]}]}));
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage-item').first().locator('.reliability-badge').last()).toHaveText('Not assessed');
 });
 test('TRC-073 Empty suggested reviewer is explicitly reported as missing',async({page})=>{
  await openReliability(page,reliabilityData({review_path:[{...reviewPath[0],items:[{...reviewPath[0].items[0],reviewer:''}]}]}));
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage-item').first().locator('.reliability-facts dd').last()).toHaveText('Not reported');
 });
 test('TRC-074 Review item with no instructions does not render misleading empty steps',async({page})=>{
  await openReliability(page,reliabilityData({review_path:[{...reviewPath[0],items:[{...reviewPath[0].items[0],instructions:[]}]}]}));
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage-item').first().locator('.reliability-instruction-list')).toHaveCount(0);
 });
 test('TRC-075 Machine-readable review instruction becomes a human sentence',async({page})=>{
  await openReliability(page,reliabilityData({review_path:[{...reviewPath[0],items:[{...reviewPath[0].items[0],instructions:['confirm_owner_signoff']}]}]}));
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-instruction-list li').first()).toHaveText('Confirm Owner Signoff');
 });
 test('TRC-076 Unknown backend safety key uses a readable label rather than raw identifier',async({page})=>{
  await openReliability(page,reliabilityData({safety:{emergency_manual_handoff:true}}));
  await page.getByRole('tab',{name:'Safety and limits'}).click();
  await expect(page.locator('.reliability-safety-facts dt')).toHaveText(['Emergency Manual Handoff']);
 });
 test('TRC-077 Safety flag truth values receive separate display classes',async({page})=>{
  await openReliability(page,reliabilityData({safety:{read_only:true,creates_incident:false}}));
  await page.getByRole('tab',{name:'Safety and limits'}).click();
  await expect(page.locator('.reliability-safety-facts dd span').first()).toHaveClass(/is-safe/);
  await expect(page.locator('.reliability-safety-facts dd span').last()).toHaveClass(/is-blocked/);
 });
 test('TRC-078 Missing stage item count falls back to number of supplied review items',async({page})=>{
  const stage={...reviewPath[0],item_count:undefined};
  await openReliability(page,reliabilityData({review_path:[stage]}));
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('.reliability-stage summary').first()).toContainText('1 items');
 });
 test('TRC-079 Explicit zero stage count keeps default accordion closed even when rows exist',async({page})=>{
  await openReliability(page,reliabilityData({review_path:[{...reviewPath[0],item_count:0}]}));
  await page.getByRole('tab',{name:'Manual review path'}).click();
  await expect(page.locator('details.reliability-stage').first()).toHaveJSProperty('open',false);
  await expect(page.locator('.reliability-stage summary').first()).toContainText('0 items');
 });
 test('TRC-080 Risk with a known source path exposes a source-specific navigation label',async({page})=>{
  await loginAsDisposableRole(page,'PW_RC_ALL_SOURCE_READ');
  await page.route(reliabilityEndpoint,r=>fulfillJson(r,reliabilityData({risks:[{...sampleRisk,source_path:'/workflow-composer'}]})));
  await page.goto('/reliability-command');
  await expect(page.getByRole('heading',{name:'Reliability posture'})).toBeVisible();
  await expect(reliabilityRisks(page).first().getByRole('link',{name:'Open Workflow Composer'})).toHaveAttribute('href','/workflow-composer');
 });
});
