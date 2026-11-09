import {test,expect,type Page} from '../../../support/liveOriginalSafeTest';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';
import {loginAsDisposableRole} from '../../../support/roleSession';

// Batch 15. Source: ProbabilisticForecastingPage.tsx; decisionIntelligence.js;
// summary/refresh/source routes require DECISION_INTELLIGENCE_READ and INSIGHTS_READ.
// Role users are isolated disposable accounts; no application or Playwright execution has occurred.
const forecastSummaryEndpoint='**/decision-intelligence/probabilistic-forecasting-summary?*';
const forecastRefreshEndpoint='**/decision-intelligence/probabilistic-forecasting-refresh';
const forecastModel={model_key:'pw-forecast-model-15',title:'Synthetic stock demand forecast',model_domain:'inventory',forecast_type:'demand_distribution',model_status:'observing',uncertainty_method:'general',confidence_score:0.8,version:3,demand_history_complete:true,backtest_history_sufficient:true,created_at:'2026-10-20T10:00:00Z'};
const forecastInterval={model_key:forecastModel.model_key,model_title:forecastModel.title,interval_key:'pw-interval-15',lower_bound:12,expected_value:20,upper_bound:28,unit:'units',confidence_score:0.7,forecast_period_start:'2026-11-01T00:00:00Z',forecast_period_end:'2026-11-08T00:00:00Z'};
const forecastRisk={model_key:forecastModel.model_key,model_title:forecastModel.title,probability_key:'pw-risk-15',risk_domain:'inventory',risk_type:'stockout_risk',probability_score:0.3,severity_score:0.8,explanation_summary:'Synthetic stock risk'};
const forecastObservation={model_key:forecastModel.model_key,model_title:forecastModel.title,calibration_key:'pw-calibration-15',observation_source:'learning_feedback',calibration_type:'forecast_error',predicted_value:20,actual_value:18,absolute_error:2,interval_captured_actual:true,calibration_score:0.8,measured_at:'2026-10-31T10:00:00Z'};
function forecastResponse(overrides:Record<string,unknown>={}){
 return {governance:{model_count:1,interval_count:1,risk_probability_count:1,calibration_observation_count:1,evidence_available:true,historical_evidence_available:true,probabilistic_forecasting_posture:'controlled_advisory_review'},models:[forecastModel],intervals:[forecastInterval],risk_probabilities:[forecastRisk],calibration:[forecastObservation],pagination:{models:{total:1,offset:0,limit:25,has_previous:false,has_next:false},intervals:{total:1,offset:0,limit:25,has_previous:false,has_next:false},risk_probabilities:{total:1,offset:0,limit:25,has_previous:false,has_next:false},calibration:{total:1,offset:0,limit:25,has_previous:false,has_next:false}},...overrides};
}
async function openForecast(page:Page,options:{data?:Record<string,unknown>;role?:'PW_FORECAST_READER'|'PW_FORECAST_GOVERNOR';url?:string}={}){
 if(options.role)await loginAsDisposableRole(page,options.role);else await loginAsTenant(page);
 await page.route(forecastSummaryEndpoint,route=>fulfillJson(route,options.data||forecastResponse()));
 await page.goto(options.url||'/probabilistic-forecasting');
 await expect(page.getByRole('heading',{name:'Probabilistic Forecasting'})).toBeVisible();
}
const filterPanel=(page:Page)=>page.getByLabel('Probabilistic forecast filters');
const forecastSection=(page:Page,heading:string)=>page.locator('.forecast-evidence-section').filter({has:page.getByRole('heading',{name:heading,exact:true})});

test.describe('Probabilistic Forecasting — page evidence, filters and paging (Batch 15)',()=>{
 test('TPF-001 forecast page labels historical range predictions as advisory only',async({page})=>{
  await openForecast(page);
  await expect(page.locator('[data-probabilistic-forecasting-refined="true"]')).toContainText('Forecasts never change inventory');
  await expect(page.getByRole('tab',{name:'Forecast evidence'})).toBeVisible();
 });
 test('TPF-002 no evidence explicitly avoids claiming forecasts are accurate or approved',async({page})=>{
  await openForecast(page,{data:forecastResponse({models:[],intervals:[],risk_probabilities:[],calibration:[],governance:{model_count:0,interval_count:0,risk_probability_count:0,calibration_observation_count:0,evidence_available:false,historical_evidence_available:false}})});
  await expect(page.getByRole('heading',{name:'No probabilistic forecast evidence is available for this tenant and filter set'})).toBeVisible();
  await expect(page.locator('.forecast-empty-state')).toContainText('Zero records do not mean that forecasting is accurate');
 });
 test('TPF-003 forecasts, uncertainty, risk and actual outcomes remain separate evidence tables',async({page})=>{
  await openForecast(page);
  for(const title of ['Forecast models','Uncertainty ranges','Risk probabilities','Actual-outcome observations'])await expect(forecastSection(page,title)).toBeVisible();
 });
 test('TPF-004 KPI totals use governance history rather than only returned page length',async({page})=>{
  await openForecast(page,{data:forecastResponse({governance:{model_count:81,interval_count:77,risk_probability_count:55,calibration_observation_count:33,evidence_available:true,historical_evidence_available:true}})});
  const summary=page.getByLabel('Probabilistic forecast evidence summary');
  for(const count of ['81','77','55','33'])await expect(summary).toContainText(count);
 });
 test('TPF-005 forecast read-only role may reload GET evidence without running refresh POST',async({page})=>{
  await openForecast(page,{role:'PW_FORECAST_READER'});let reads=0,writes=0;
  await page.route(forecastSummaryEndpoint,route=>{reads++;return fulfillJson(route,forecastResponse());});
  await page.route(forecastRefreshEndpoint,route=>{writes++;return fulfillJson(route,{});});
  await expect(page.getByRole('button',{name:'Refresh forecast analysis'})).toHaveCount(0);
  await page.getByRole('button',{name:'Refresh page'}).click();
  await expect.poll(()=>reads).toBeGreaterThan(0);expect(writes).toBe(0);
 });
 test('TPF-006 governor role records an empty-body forecast-analysis refresh request',async({page})=>{
  await openForecast(page,{role:'PW_FORECAST_GOVERNOR'});let method='',body:unknown;
  await page.route(forecastRefreshEndpoint,route=>{method=route.request().method();body=route.request().postDataJSON();return fulfillJson(route,{refreshed:true});});
  await page.getByRole('button',{name:'Refresh forecast analysis'}).click();
  await expect(page.getByRole('status')).toContainText('Forecast analysis refreshed successfully');
  expect(method).toBe('POST');expect(body).toEqual({});
 });
 test('TPF-007 forecast refresh service failure preserves visible snapshots and shows warning',async({page})=>{
  await openForecast(page,{role:'PW_FORECAST_GOVERNOR'});
  await page.route(forecastRefreshEndpoint,route=>fulfillJson(route,{message:'Synthetic forecast refresh failure'},503));
  await page.getByRole('button',{name:'Refresh forecast analysis'}).click();
  await expect(page.getByRole('alert')).toContainText('Your existing forecast snapshots were not changed');
  await expect(forecastSection(page,'Forecast models')).toContainText('Synthetic stock demand forecast');
 });
 test('TPF-008 failed forecast summary GET supports Retry with a fresh read',async({page})=>{
  await loginAsTenant(page);let reads=0;
  let failed=true;await page.route(forecastSummaryEndpoint,route=>{reads++;return fulfillJson(route,failed?{message:'Synthetic failure'}:forecastResponse(),failed?503:200);});
  await page.goto('/probabilistic-forecasting');
  await expect(page.getByRole('heading',{name:'Probabilistic forecast evidence could not be loaded'})).toBeVisible();
  failed=false;await page.getByRole('button',{name:'Retry'}).click();
  await expect(page.getByRole('heading',{name:'Probabilistic Forecasting'})).toBeVisible();
  expect(reads).toBeGreaterThanOrEqual(2);
 });
 test('TPF-009 business-area filter sends forecast_domain',async({page})=>{
  await openForecast(page);let url='';await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,forecastResponse());});
  await filterPanel(page).getByLabel('Business area').selectOption('inventory');
  await expect.poll(()=>url ? new URL(url).searchParams.get('forecast_domain') : null).toBe('inventory');
 });
 test('TPF-010 forecast-type selection sends demand_distribution to summary endpoint',async({page})=>{
  await openForecast(page);let url='';await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,forecastResponse());});
  await filterPanel(page).getByLabel('Forecast type').selectOption('demand_distribution');
  await expect.poll(()=>url ? new URL(url).searchParams.get('forecast_type') : null).toBe('demand_distribution');
 });
 test('TPF-011 model-status selection sends approved_for_advisory_use without mutation',async({page})=>{
  await openForecast(page);let url='';await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,forecastResponse());});
  await filterPanel(page).getByLabel('Model status').selectOption('approved_for_advisory_use');
  await expect.poll(()=>url ? new URL(url).searchParams.get('model_status') : null).toBe('approved_for_advisory_use');
 });
 test('TPF-012 uncertainty method selection is retained in server-side query',async({page})=>{
  await openForecast(page);let url='';await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,forecastResponse());});
  await filterPanel(page).getByLabel('Uncertainty method').selectOption('scenario_distribution');
  await expect.poll(()=>url ? new URL(url).searchParams.get('uncertainty_method') : null).toBe('scenario_distribution');
 });
 test('TPF-013 risk-type filter requests stockout_risk',async({page})=>{
  await openForecast(page);let url='';await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,forecastResponse());});
  await filterPanel(page).getByLabel('Risk type').selectOption('stockout_risk');
  await expect.poll(()=>url ? new URL(url).searchParams.get('risk_type') : null).toBe('stockout_risk');
 });
 test('TPF-014 actual-outcome type filter requests forecast_error',async({page})=>{
  await openForecast(page);let url='';await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,forecastResponse());});
  await filterPanel(page).getByLabel('Outcome measurement type').selectOption('forecast_error');
  await expect.poll(()=>url ? new URL(url).searchParams.get('calibration_type') : null).toBe('forecast_error');
 });
 test('TPF-015 evidence list record limit supports up to 200',async({page})=>{
  await openForecast(page);let url='';await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,forecastResponse());});
  await filterPanel(page).getByLabel('Maximum records per evidence list').selectOption('200');
  await expect.poll(()=>url ? new URL(url).searchParams.get('limit') : null).toBe('200');
 });
 test('TPF-016 Clear filters returns all categories and limit to default values',async({page})=>{
  await openForecast(page);
  await filterPanel(page).getByLabel('Forecast type').selectOption('demand_distribution');
  await filterPanel(page).getByLabel('Maximum records per evidence list').selectOption('100');
  await filterPanel(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(filterPanel(page).getByLabel('Forecast type')).toHaveValue('');
  await expect(filterPanel(page).getByLabel('Maximum records per evidence list')).toHaveValue('25');
 });
 test('TPF-017 Older model page requests a model-only offset without other offsets',async({page})=>{
  const data=forecastResponse({pagination:{...forecastResponse().pagination,models:{total:41,offset:0,limit:25,has_previous:false,has_next:true}}});
  await openForecast(page,{data});let url='';await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,data);});
  await forecastSection(page,'Forecast models').getByRole('button',{name:'Older'}).click();
  await expect.poll(()=>new URL(url).searchParams.get('model_offset')).toBe('25');
  expect(new URL(url).searchParams.get('interval_offset')).toBe(null);
 });
 test('TPF-018 interval paging independently advances interval_offset',async({page})=>{
  const data=forecastResponse({pagination:{...forecastResponse().pagination,intervals:{total:50,offset:0,limit:25,has_previous:false,has_next:true}}});
  await openForecast(page,{data});let url='';await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();return fulfillJson(route,data);});
  await forecastSection(page,'Uncertainty ranges').getByRole('button',{name:'Older'}).click();
  await expect.poll(()=>new URL(url).searchParams.get('interval_offset')).toBe('25');
  expect(new URL(url).searchParams.get('model_offset')).toBe(null);
 });
 test('TPF-019 Newer paging returns the model offset to zero',async({page})=>{
  const initial=forecastResponse({pagination:{...forecastResponse().pagination,models:{total:80,offset:0,limit:25,has_previous:false,has_next:true}}});
  await openForecast(page,{data:initial});let requests=0;let lastUrl='';
  await page.route(forecastSummaryEndpoint,route=>{
   requests++;lastUrl=route.request().url();const offset=Number(new URL(lastUrl).searchParams.get('model_offset')||0);
   return fulfillJson(route,forecastResponse({pagination:{...forecastResponse().pagination,models:{total:80,offset,limit:25,has_previous:offset>0,has_next:true}}}));
  });
  await forecastSection(page,'Forecast models').getByRole('button',{name:'Older'}).click();
  await expect.poll(()=>lastUrl?new URL(lastUrl).searchParams.get('model_offset'):null).toBe('25');
  await expect(forecastSection(page,'Forecast models').getByRole('button',{name:'Newer'})).toBeEnabled();
  await forecastSection(page,'Forecast models').getByRole('button',{name:'Newer'}).click();
  await expect.poll(()=>requests).toBeGreaterThanOrEqual(2);
  expect(new URL(lastUrl).searchParams.get('model_offset')).toBe(null);
 });
 test('TPF-020 general uncertainty method is explained, not presented as a statistical guarantee',async({page})=>{
  await openForecast(page,{data:forecastResponse({models:[{...forecastModel,uncertainty_method:'general'}]})});
  const models=forecastSection(page,'Forecast models');
  await expect(models).toContainText('General forecast method');
  await expect(models).toContainText('no specialized uncertainty method is recorded');
  await expect(forecastSection(page,'Uncertainty ranges')).toContainText('not statistical confidence intervals');
 });
});

// Batch 16 continuation — source-version, evidence integrity, review checks and UI permission boundaries.
// These are generated browser contracts with synthetic intercepted API data, NOT executed tests.
const focusedForecastId='714e41f0-497e-4ca8-8332-0e59193ad216'; // synthetic UUID; never an actual tenant model
const focusedSourcePattern=`**/decision-intelligence/probabilistic-forecasting-source/${focusedForecastId}?*`;
const focusedModel={...forecastModel,model_key:'pw-exact-version-16',title:'Synthetic focused forecast',version:5,model_status:'observing'};
function focusedResponse(overrides:Record<string,unknown>={}){
 return {model:focusedModel,intervals:[{...forecastInterval,model_key:focusedModel.model_key,model_version:5}],risk_probabilities:[{...forecastRisk,model_key:focusedModel.model_key,model_version:5}],calibration:[{...forecastObservation,model_key:focusedModel.model_key,model_version:5}],is_current_lineage_version:true,source_model_id:focusedForecastId,pagination:{intervals:{total:1,offset:0,limit:25,has_previous:false,has_next:false},risk_probabilities:{total:1,offset:0,limit:25,has_previous:false,has_next:false},calibration:{total:1,offset:0,limit:25,has_previous:false,has_next:false}},...overrides};
}
const focusedUrl=`/probabilistic-forecasting?source_action_id=probabilistic_forecast_model:${focusedForecastId}`;
async function openFocusedForecast(page:Page,data:Record<string,unknown>=focusedResponse(),role?:'PW_FORECAST_READER'|'PW_FORECAST_GOVERNOR'){
 if(role)await loginAsDisposableRole(page,role);else await loginAsTenant(page);
 await page.route(focusedSourcePattern,route=>fulfillJson(route,data));
 await page.goto(focusedUrl);
 await expect(page.getByRole('heading',{name:'Focused Intelligence Review evidence'})).toBeVisible();
}

test.describe('Probabilistic Forecasting — exact-source reviews and evidence boundaries (Batch 16)',()=>{
 test('TPF-021 recognized source_action_id requests only the selected UUID evidence route',async({page})=>{
  await loginAsTenant(page);const requested:string[]=[];
  await page.route(forecastSummaryEndpoint,route=>{requested.push('summary');return fulfillJson(route,forecastResponse());});
  await page.route(focusedSourcePattern,route=>{requested.push(new URL(route.request().url()).pathname);return fulfillJson(route,focusedResponse());});
  await page.goto(focusedUrl);
  await expect(page.getByText('Synthetic focused forecast').first()).toBeVisible();
  expect(requested).toContain(`/api/decision-intelligence/probabilistic-forecasting-source/${focusedForecastId}`);
  expect(requested).not.toContain('summary');
 });
 test('TPF-022 invalid source_action_id is not treated as a recognized exact model UUID',async({page})=>{
  await loginAsTenant(page);let sourceCalls=0;
  await page.route('**/decision-intelligence/probabilistic-forecasting-source/**',route=>{sourceCalls++;return fulfillJson(route,focusedResponse());});
  await page.route(forecastSummaryEndpoint,route=>fulfillJson(route,forecastResponse()));
  await page.goto('/probabilistic-forecasting?source_action_id=probabilistic_forecast_model:not-a-uuid');
  await expect(page.getByRole('heading',{name:'Probabilistic Forecasting'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Focused Intelligence Review evidence'})).toHaveCount(0);
  expect(sourceCalls).toBe(0);
 });
 test('TPF-023 missing referenced version remains unavailable and does not show another forecast',async({page})=>{
  await loginAsTenant(page);
  await page.route(focusedSourcePattern,route=>fulfillJson(route,{message:'Synthetic not found'},404));
  await page.goto(focusedUrl);
  await expect(page.getByText('The referenced forecast version could not be loaded. It may no longer be available to this tenant.')).toBeVisible();
  await expect(page.getByRole('button',{name:'Retry exact version'})).toBeVisible();
  await expect(forecastSection(page,'Forecast models')).toHaveCount(0);
 });
 test('TPF-024 Retry exact version repeats the same source URL rather than tenant-wide GET',async({page})=>{
  await loginAsTenant(page);let requests=0;let recover=false;const paths:string[]=[];
  await page.route(focusedSourcePattern,route=>{requests++;paths.push(new URL(route.request().url()).pathname);return fulfillJson(route,recover?focusedResponse():{message:'Temporary failure'},recover?200:503);});
  await page.goto(focusedUrl);
  await expect(page.getByRole('button',{name:'Retry exact version'})).toBeVisible();
  recover=true;await page.getByRole('button',{name:'Retry exact version'}).click();
  await expect(page.getByText('Synthetic focused forecast').first()).toBeVisible();
  expect(requests).toBeGreaterThanOrEqual(2);expect(new Set(paths).size).toBe(1);
 });
 test('TPF-025 clearing exact version removes the focus query and restores tenant-wide evidence',async({page})=>{
  await openFocusedForecast(page);
  await page.route(forecastSummaryEndpoint,route=>fulfillJson(route,forecastResponse()));
  await page.getByRole('link',{name:'Clear focused review evidence'}).click();
  await expect(page).toHaveURL(/\/probabilistic-forecasting$/);
  await expect(page.getByRole('heading',{name:'Focused Intelligence Review evidence'})).toHaveCount(0);
  await expect(page.getByLabel('Probabilistic forecast filters')).toBeVisible();
 });
 test('TPF-026 historical exact version is explicitly superseded and not described as current',async({page})=>{
  await openFocusedForecast(page,focusedResponse({is_current_lineage_version:false}));
  await expect(page.getByLabel('Focused Intelligence Review evidence')).toContainText('historical superseded version');
  await expect(page.getByLabel('Focused forecast evidence summary')).toContainText('Historical exact version');
 });
 test('TPF-027 focused totals reflect the exact source only, not leaked tenant governance counts',async({page})=>{
  await openFocusedForecast(page,focusedResponse({pagination:{intervals:{total:7,offset:0,limit:25},risk_probabilities:{total:9,offset:0,limit:25},calibration:{total:11,offset:0,limit:25}}}));
  const stats=page.getByLabel('Focused forecast evidence summary');
  for(const n of ['7','9','11'])await expect(stats).toContainText(n);
  await expect(page.getByLabel('Probabilistic forecast evidence summary')).toHaveCount(0);
 });
 test('TPF-028 exact-version scope hides tenant-wide business area and model-type filters',async({page})=>{
  await openFocusedForecast(page);
  await expect(page.getByLabel('Focused evidence paging')).toBeVisible();
  await expect(page.getByLabel('Probabilistic forecast filters')).toHaveCount(0);
  await expect(page.getByLabel('Business area')).toHaveCount(0);
  await expect(page.getByRole('tab',{name:'Review checks'})).toHaveCount(0);
 });
 test('TPF-029 limit adjustment is propagated to exact source query, not summary endpoint',async({page})=>{
  await openFocusedForecast(page);let url='';
  await page.route(focusedSourcePattern,route=>{url=route.request().url();return fulfillJson(route,focusedResponse());});
  await page.getByLabel('Focused evidence paging').getByLabel('Maximum records per evidence list').selectOption('100');
  await expect.poll(()=>url ? new URL(url).searchParams.get('limit') : null).toBe('100');
  expect(new URL(url).pathname).toContain(`/probabilistic-forecasting-source/${focusedForecastId}`);
 });
 test('TPF-030 focused range/risk/outcome Older navigation uses separate offsets',async({page})=>{
  const data=focusedResponse({pagination:{intervals:{total:60,offset:0,limit:25,has_next:true},risk_probabilities:{total:60,offset:0,limit:25,has_next:true},calibration:{total:60,offset:0,limit:25,has_next:true}}});
  await openFocusedForecast(page,data);const urls:string[]=[];
  await page.route(focusedSourcePattern,route=>{const url=route.request().url();urls.push(url);const params=new URL(url).searchParams;return fulfillJson(route,focusedResponse({pagination:{intervals:{total:60,offset:Number(params.get('interval_offset')),limit:25,has_next:true},risk_probabilities:{total:60,offset:Number(params.get('risk_offset')),limit:25,has_next:true},calibration:{total:60,offset:Number(params.get('calibration_offset')),limit:25,has_next:true}}}));});
  for(const [title,key] of [['Uncertainty ranges','interval_offset'],['Risk probabilities','risk_offset'],['Actual-outcome observations','calibration_offset']] as const){
   await forecastSection(page,title).getByRole('button',{name:'Older'}).click();
   await expect.poll(()=>Number(new URL(urls[urls.length-1]).searchParams.get(key))).toBe(25);
  }
  const p=new URL(urls[urls.length-1]).searchParams;
  expect([p.get('interval_offset'),p.get('risk_offset'),p.get('calibration_offset')]).toEqual(['25','25','25']);
 });
 test('TPF-031 filter change clears a previously advanced model and interval page',async({page})=>{
  const paged=forecastResponse({pagination:{...forecastResponse().pagination,models:{total:90,offset:0,limit:25,has_next:true},intervals:{total:90,offset:0,limit:25,has_next:true}}});
  await openForecast(page,{data:paged});let url='';
  await page.route(forecastSummaryEndpoint,route=>{url=route.request().url();const qs=new URL(url).searchParams;return fulfillJson(route,forecastResponse({pagination:{...forecastResponse().pagination,models:{total:90,offset:Number(qs.get('model_offset')||0),limit:25,has_next:true},intervals:{total:90,offset:Number(qs.get('interval_offset')||0),limit:25,has_next:true}}}));});
  await forecastSection(page,'Forecast models').getByRole('button',{name:'Older'}).click();
  await forecastSection(page,'Uncertainty ranges').getByRole('button',{name:'Older'}).click();
  await filterPanel(page).getByLabel('Business area').selectOption('inventory');
  await expect.poll(()=>url ? new URL(url).searchParams.get('forecast_domain') : null).toBe('inventory');
  const qs=new URL(url).searchParams;expect(qs.get('model_offset')).toBe(null);expect(qs.get('interval_offset')).toBe(null);
 });
 test('TPF-032 advisory page offers no stock edit or automated inventory mutation controls',async({page})=>{
  await openForecast(page,{role:'PW_FORECAST_READER'});
  await expect(page.locator('[data-probabilistic-forecasting-refined="true"]')).toContainText('Forecasts never change inventory or other business records automatically');
  await expect(page.getByRole('button',{name:/Adjust stock|Transfer stock|Create purchase order/i})).toHaveCount(0);
 });
 test('TPF-033 incomplete demand classification displays explicit data-coverage limitation',async({page})=>{
  await openForecast(page,{data:forecastResponse({models:[{...forecastModel,demand_history_complete:false,demand_classification_coverage_ratio:0.6}]})});
  await expect(forecastSection(page,'Forecast models')).toContainText('Classification coverage');
  await expect(forecastSection(page,'Forecast models')).toContainText('60%');
 });
 test('TPF-034 insufficient backtest history never appears as a reliable approval',async({page})=>{
  await openForecast(page,{data:forecastResponse({models:[{...forecastModel,backtest_history_sufficient:false}]})});
  await expect(forecastSection(page,'Forecast models')).toContainText('Not enough prior history');
  await expect(forecastSection(page,'Forecast models')).toContainText('remains in observation');
 });
 test('TPF-035 expected range is displayed between lower and upper separately',async({page})=>{
  await openForecast(page,{data:forecastResponse({intervals:[{...forecastInterval,lower_bound:12,expected_value:20,upper_bound:28}]})});
  const row=forecastSection(page,'Uncertainty ranges').locator('tbody tr').first();
  await expect(row.locator('td').nth(1)).toContainText('12');
  await expect(row.locator('td').nth(2)).toContainText('20');
  await expect(row.locator('td').nth(3)).toContainText('28');
 });
 test('TPF-036 uncertainty disclaimer distinguishes empirical ranges from confidence guarantees',async({page})=>{
  await openForecast(page);
  await expect(forecastSection(page,'Uncertainty ranges')).toContainText('not statistical confidence intervals');
 });
 test('TPF-037 risk at 75 percent without explanation requires additional review',async({page})=>{
  await openForecast(page,{data:forecastResponse({risk_probabilities:[{...forecastRisk,probability_score:0.75,explanation_summary:''}]})});
  await expect(forecastSection(page,'Risk probabilities')).toContainText('No explanation was stored for this high-risk estimate');
 });
 test('TPF-038 very low risk without explanation still points to evidence',async({page})=>{
  await openForecast(page,{data:forecastResponse({risk_probabilities:[{...forecastRisk,probability_score:0.05,explanation_summary:''}]})});
  await expect(forecastSection(page,'Risk probabilities')).toContainText('No specific risk explanation was stored because the current estimate is very low');
 });
 test('TPF-039 Learning Feedback observations disclose the original outcome source',async({page})=>{
  await openForecast(page,{data:forecastResponse({calibration:[{...forecastObservation,observation_source:'learning_feedback'}]})});
  await expect(forecastSection(page,'Actual-outcome observations')).toContainText('Learning Feedback outcome');
 });
 test('TPF-040 backtest calibration observations disclose their rolling origin',async({page})=>{
  await openForecast(page,{data:forecastResponse({calibration:[{...forecastObservation,observation_source:'rolling_backtest'}]})});
  await expect(forecastSection(page,'Actual-outcome observations')).toContainText('30-day usage backtest');
 });
 test('TPF-041 recorded inside/outside/unassessed interval capture states remain distinct',async({page})=>{
  const values=[true,false,null];
  await openForecast(page,{data:forecastResponse({calibration:values.map((value,i)=>({...forecastObservation,calibration_key:`pw-capture-${i}`,interval_captured_actual:value}))})});
  const rows=forecastSection(page,'Actual-outcome observations').locator('tbody tr');
  await expect(rows.nth(0).locator('td').nth(6)).toHaveText('Yes');
  await expect(rows.nth(1).locator('td').nth(6)).toHaveText('No');
  await expect(rows.nth(2).locator('td').nth(6)).toHaveText('Not yet assessed');
 });
 test('TPF-042 empty evidence categories render their own no-match state',async({page})=>{
  await openForecast(page,{data:forecastResponse({intervals:[],risk_probabilities:[],calibration:[]})});
  for(const name of ['Uncertainty ranges','Risk probabilities','Actual-outcome observations']){
   await expect(forecastSection(page,name)).toContainText('No matching records');
  }
  await expect(forecastSection(page,'Forecast models').locator('tbody tr')).toHaveCount(1);
 });
 test('TPF-043 review checks remain advisory and show saved lifecycle assessment',async({page})=>{
  const section={assessment_available:true,calibration_decision:'monitor',calibration_score:0.67,calibration_checks:[{key:'pw-check',status:'monitor'}],calibration_blockers:[]};
  await openForecast(page,{data:forecastResponse({calibration_feedback_loop:section})});
  await page.getByRole('tab',{name:'Review checks'}).click();
  await expect(page.getByRole('heading',{name:'These are advisory checks, not approvals or automated actions'})).toBeVisible();
  await expect(page.locator('details.forecast-lifecycle').first()).toContainText('Open review details');
 });
 test('TPF-044 absent current evidence prevents a misleading readiness result',async({page})=>{
  await openForecast(page,{data:forecastResponse({models:[],intervals:[],risk_probabilities:[],calibration:[],governance:{model_count:0,interval_count:0,risk_probability_count:0,calibration_observation_count:0,evidence_available:false,historical_evidence_available:false}})});
  await page.getByRole('tab',{name:'Review checks'}).click();
  await expect(page.getByRole('heading',{name:'Review checks are not assessed'})).toBeVisible();
  await expect(page.locator('details.forecast-lifecycle')).toHaveCount(0);
 });
 test('TPF-045 each of eight lifecycle cards can be expanded independently',async({page})=>{
  await openForecast(page);await page.getByRole('tab',{name:'Review checks'}).click();
  const cards=page.locator('details.forecast-lifecycle');await expect(cards).toHaveCount(8);
  await cards.nth(0).locator('summary').click();
  await expect(cards.nth(0)).toHaveAttribute('open','');
  await expect(cards.nth(1)).not.toHaveAttribute('open','');
 });
 test('TPF-046 reader without operational action-center permission does not see Intelligence Review shortcut',async({page})=>{
  await openForecast(page,{role:'PW_FORECAST_READER'});
  await page.getByRole('tab',{name:'Review checks'}).click();
  await expect(page.getByRole('link',{name:'Open Intelligence Review'})).toHaveCount(0);
 });
 test('TPF-047 tenant diagnostics tab remains disabled even when data exposes contract audit',async({page})=>{
  await openForecast(page,{data:forecastResponse({forecast_response_contract_audit:{contract_score:1,contract_decision:'passed'}})});
  await expect(page.getByRole('tab',{name:'Diagnostics'})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Technical response diagnostics'})).toHaveCount(0);
 });
 test('TPF-048 non-diagnostics reader cannot expand raw calibration record keys',async({page})=>{
  await openForecast(page,{role:'PW_FORECAST_READER'});
  await expect(forecastSection(page,'Actual-outcome observations')).toContainText('Learning Feedback outcome');
  await expect(page.locator('.forecast-technical-reference')).toHaveCount(0);
  await expect(page.getByText(forecastObservation.calibration_key)).toHaveCount(0);
 });
 test('TPF-049 read role can GET evidence but has no governed refresh control',async({page})=>{
  await openForecast(page,{role:'PW_FORECAST_READER'});let writes=0;
  await page.route(forecastRefreshEndpoint,route=>{writes++;return fulfillJson(route,{});});
  await expect(page.getByRole('button',{name:'Refresh page'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Refresh forecast analysis'})).toHaveCount(0);
  expect(writes).toBe(0); // backend read+insights guards need separate real integration checks
 });
 test('TPF-050 failed exact-source request never replaces exact-version state with tenant-wide rows',async({page})=>{
  await loginAsTenant(page);let globalReads=0;
  await page.route(forecastSummaryEndpoint,route=>{globalReads++;return fulfillJson(route,forecastResponse());});
  await page.route(focusedSourcePattern,route=>fulfillJson(route,{message:'Unavailable version'},404));
  await page.goto(focusedUrl);
  await expect(page.getByLabel('Focused Intelligence Review evidence')).toContainText('could not be loaded');
  await expect(page.getByText(forecastModel.title)).toHaveCount(0);
  expect(globalReads).toBe(0);
 });
});

// Batch 184 — read-only forecast evidence formatting, precedence and missing-value boundaries.
// This suite extends the existing page-scoped fixtures; no real backend/DB writes, compile or browser run.
test.describe('Probabilistic Forecasting — source-format and evidence-cell boundaries (Batch 184)', () => {
  const modelRow = (page: Page) => forecastSection(page, 'Forecast models').locator('tbody tr').first();
  const rangeRow = (page: Page) => forecastSection(page, 'Uncertainty ranges').locator('tbody tr').first();
  const riskRow = (page: Page) => forecastSection(page, 'Risk probabilities').locator('tbody tr').first();
  const observationRow = (page: Page) => forecastSection(page, 'Actual-outcome observations').locator('tbody tr').first();

  test('TPF-051 missing model title humanizes its stored model key', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, title: '', model_key: 'synthetic_missing_title'}]}) });
    await expect(modelRow(page).locator('td').first()).toContainText('Synthetic Missing Title');
  });
  test('TPF-052 missing direct version uses source-reference version', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, version: undefined, source_reference: {version: 7}}]}) });
    await expect(modelRow(page).locator('td').first()).toContainText('Version 7');
  });
  test('TPF-053 direct version takes precedence over a different source-reference version', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, version: 3, source_reference: {version: 9}}]}) });
    await expect(modelRow(page).locator('td').first()).toContainText('Version 3');
    await expect(modelRow(page).locator('td').first()).not.toContainText('Version 9');
  });
  test('TPF-054 zero model version does not render a misleading version label', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, version: 0, source_reference: {version: 9}}]}) });
    await expect(modelRow(page).locator('td').first()).not.toContainText('Version');
  });
  test('TPF-055 completely absent model version omits the version label', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, version: undefined}]}) });
    await expect(modelRow(page).locator('td').first()).not.toContainText('Version');
  });
  test('TPF-056 incomplete demand history without coverage does not invent a percentage', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, demand_history_complete: false, demand_classification_coverage_ratio: undefined}]}) });
    await expect(modelRow(page)).toContainText('Demand history is incomplete');
    await expect(modelRow(page)).not.toContainText('Classification coverage');
  });
  test('TPF-057 explicit zero classification coverage remains visible', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, demand_history_complete: false, demand_classification_coverage_ratio: 0}]}) });
    await expect(modelRow(page)).toContainText('Classification coverage 0%');
  });
  test('TPF-058 complete demand history does not show an incomplete-history warning', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, demand_history_complete: true, demand_classification_coverage_ratio: 0.2}]}) });
    await expect(modelRow(page)).not.toContainText('Demand history is incomplete');
  });
  test('TPF-059 sufficient backtest history suppresses the insufficiency warning', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, backtest_history_sufficient: true}]}) });
    await expect(modelRow(page)).not.toContainText('Not enough prior history');
  });
  test('TPF-060 stored model summary appears beneath its title', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, summary: 'Synthetic source-coverage note only'}]}) });
    await expect(modelRow(page).locator('td').first()).toContainText('Synthetic source-coverage note only');
  });
  test('TPF-061 missing summary does not render a fabricated summary string', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, summary: ''}]}) });
    await expect(modelRow(page).locator('td').first().locator('.forecast-table__subtext')).toHaveCount(1);
    await expect(modelRow(page).locator('td').first()).toContainText(forecastModel.title);
  });
  test('TPF-062 fractional model confidence is presented as a percentage', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, confidence_score: 0.8}]}) });
    await expect(modelRow(page).locator('td').nth(5)).toHaveText('80%');
  });
  test('TPF-063 already-scaled model confidence is not multiplied by one hundred', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, confidence_score: 80}]}) });
    await expect(modelRow(page).locator('td').nth(5)).toHaveText('80%');
  });
  test('TPF-064 blocked model status uses the danger badge tone', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, model_status: 'blocked'}]}) });
    await expect(modelRow(page).locator('td').nth(3).locator('.forecast-badge--danger')).toHaveCount(1);
  });
  test('TPF-065 approved advisory model status uses the good badge tone', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, model_status: 'approved_for_advisory_use'}]}) });
    await expect(modelRow(page).locator('td').nth(3).locator('.forecast-badge--good')).toHaveCount(1);
  });
  test('TPF-066 medium model status is visually distinguished as warning', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, model_status: 'medium'}]}) });
    await expect(modelRow(page).locator('td').nth(3).locator('.forecast-badge--warning')).toHaveCount(1);
  });
  test('TPF-067 missing model domain displays Not reported instead of a guessed area', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, model_domain: null}]}) });
    await expect(modelRow(page).locator('td').nth(1)).toHaveText('Not reported');
  });
  test('TPF-068 empty forecast type displays Not reported instead of a guessed type', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, forecast_type: ''}]}) });
    await expect(modelRow(page).locator('td').nth(2)).toHaveText('Not reported');
  });
  test('TPF-069 uppercase GENERAL still receives the descriptive default-method warning', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, uncertainty_method: 'GENERAL'}]}) });
    await expect(modelRow(page).locator('td').nth(4)).toContainText('General forecast method');
    await expect(modelRow(page).locator('td').nth(4)).toContainText('no specialized uncertainty method');
  });
  test('TPF-070 unrecognized method code is human-readable without changing the source code', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, uncertainty_method: 'synthetic_unknown_method'}]}) });
    await expect(modelRow(page).locator('td').nth(4)).toHaveText('Synthetic Unknown Method');
  });
  test('TPF-071 updated model timestamp is preferred over the original creation timestamp', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, updated_at: '2026-11-05T12:00:00Z', created_at: '2001-01-01T12:00:00Z'}]}) });
    await expect(modelRow(page).locator('td').nth(6)).toContainText('2026');
    await expect(modelRow(page).locator('td').nth(6)).not.toContainText('2001');
  });
  test('TPF-072 creation timestamp is shown if update timestamp is absent', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, updated_at: null, created_at: '2001-01-01T12:00:00Z'}]}) });
    await expect(modelRow(page).locator('td').nth(6)).toContainText('2001');
  });
  test('TPF-073 model with neither timestamp displays a missing-value dash', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({models: [{...forecastModel, updated_at: null, created_at: null}]}) });
    await expect(modelRow(page).locator('td').nth(6)).toHaveText('—');
  });
  test('TPF-074 missing lower bound falls back to stored p10 value', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({intervals: [{...forecastInterval, lower_bound: null, p10_value: 11}]}) });
    await expect(rangeRow(page).locator('td').nth(1)).toHaveText('11');
  });
  test('TPF-075 missing expected value falls back to stored p50 value', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({intervals: [{...forecastInterval, expected_value: null, p50_value: 22}]}) });
    await expect(rangeRow(page).locator('td').nth(2)).toHaveText('22');
  });
  test('TPF-076 missing upper bound falls back to stored p90 value', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({intervals: [{...forecastInterval, upper_bound: null, p90_value: 33}]}) });
    await expect(rangeRow(page).locator('td').nth(3)).toHaveText('33');
  });
  test('TPF-077 zero lower bound takes priority over a nonzero p10 value', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({intervals: [{...forecastInterval, lower_bound: 0, p10_value: 99}]}) });
    await expect(rangeRow(page).locator('td').nth(1)).toHaveText('0');
  });
  test('TPF-078 entirely missing range lower value renders a dash', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({intervals: [{...forecastInterval, lower_bound: null, p10_value: null}]}) });
    await expect(rangeRow(page).locator('td').nth(1)).toHaveText('—');
  });
  test('TPF-079 missing range unit is never silently displayed as a business unit', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({intervals: [{...forecastInterval, unit: ''}]}) });
    await expect(rangeRow(page).locator('td').nth(4)).toHaveText('—');
  });
  test('TPF-080 absent range confidence renders a dash rather than zero percent', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({intervals: [{...forecastInterval, confidence_score: null}]}) });
    await expect(rangeRow(page).locator('td').nth(7)).toHaveText('—');
  });
  test('TPF-081 stored risk explanation takes priority over generated fallback guidance', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({risk_probabilities: [{...forecastRisk, probability_score: 0.9, explanation_summary: 'Synthetic stored review evidence'}]}) });
    await expect(riskRow(page).locator('td').nth(5)).toHaveText('Synthetic stored review evidence');
  });
  test('TPF-082 middle probability without explanation gets general source-review guidance', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({risk_probabilities: [{...forecastRisk, probability_score: 0.5, explanation_summary: ''}]}) });
    await expect(riskRow(page).locator('td').nth(5)).toContainText('No explanation was stored for this risk estimate');
    await expect(riskRow(page).locator('td').nth(5)).not.toContainText('high-risk estimate');
  });
  test('TPF-083 risk probability and severity preserve zero and one as percentage endpoints', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({risk_probabilities: [{...forecastRisk, probability_score: 0, severity_score: 1}]}) });
    await expect(riskRow(page).locator('td').nth(3)).toHaveText('0%');
    await expect(riskRow(page).locator('td').nth(4)).toHaveText('100%');
  });
  test('TPF-084 unrecognized calibration source receives a generic observation label', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({calibration: [{...forecastObservation, observation_source: 'synthetic_other'}]}) });
    await expect(observationRow(page).locator('td').nth(1)).toContainText('Calibration observation');
  });
  test('TPF-085 missing calibration assessment score is explicitly not yet assessed', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({calibration: [{...forecastObservation, calibration_score: null}]}) });
    await expect(observationRow(page).locator('td').nth(7)).toHaveText('Not yet assessed');
  });
  test('TPF-086 fractional calibration error retains the stored decimal evidence', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({calibration: [{...forecastObservation, absolute_error: 2.125}]}) });
    await expect(observationRow(page).locator('td').nth(5)).toHaveText('2.125');
  });
  test('TPF-087 fractional calibration score is displayed as percentage', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({calibration: [{...forecastObservation, calibration_score: 0.72}]}) });
    await expect(observationRow(page).locator('td').nth(7)).toHaveText('72%');
  });
  test('TPF-088 already-scaled calibration score is not multiplied a second time', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({calibration: [{...forecastObservation, calibration_score: 72}]}) });
    await expect(observationRow(page).locator('td').nth(7)).toHaveText('72%');
  });
  test('TPF-089 missing calibration observation timestamp renders a dash', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({calibration: [{...forecastObservation, measured_at: null}]}) });
    await expect(observationRow(page).locator('td').nth(8)).toHaveText('—');
  });
  test('TPF-090 calibration observation version is displayed separately from its model name', async ({ page }) => {
    await openForecast(page, { data: forecastResponse({calibration: [{...forecastObservation, model_version: 4}]}) });
    await expect(observationRow(page).locator('td').first()).toContainText('Version 4');
  });
});
