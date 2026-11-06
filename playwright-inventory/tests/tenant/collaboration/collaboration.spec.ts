import {test,expect,type Page} from '@playwright/test';
import {loginAsTenant,fulfillJson} from '../../../support/tenantSession';
import {loginAsDisposableRole} from '../../../support/roleSession';

// Batch 17 — Enterprise Collaboration (read-only). Backend contract:
// GET /operational-action-center/enterprise-collaboration-summary; permission
// operational_action_center.read. Synthetic responses do not prove server filtering or data isolation.
const collaborationEndpoint='**/operational-action-center/enterprise-collaboration-summary?*';
const baseThread={thread_id:'pw-thread-1',thread_key:'pw-thread-1',title:'Synthetic delayed stock task',summary:'Needs attention from its owner',collaboration_domain:'execution',thread_type:'task_coordination_thread',urgency:'high',coordination_reason:{text:'Blocked task needs review'},participants_hint:{suggested_roles:['warehouse_manager'],actual_assignee_name:'Synthetic Assignee',assignment_state:'assigned'},coordination_context:{source_surface:'/execution-tasks',source_reference:{source_type:'execution_task',source_id:'pw-task-1'},source_action_id:'pw-action-1',business_area:'execution',recommended_next_step:'Review the task with its owner'},work_context:{action_status:'open',blocked:true,is_overdue:true,storage_location_name:'Synthetic shelf A',effective_due_at:'2026-10-30T12:00:00Z'},comment_guidance:{recommended_comment_topics:['blocker','next_action']},war_room_guidance:{war_room_candidate:true,suggested_cadence:'daily'},updated_at:'2026-10-30T11:00:00Z'};
const alertThread={...baseThread,thread_id:'pw-thread-alert',thread_key:'pw-thread-alert',title:'Synthetic stock alert',collaboration_domain:'alerts',thread_type:'triage_thread',urgency:'critical',coordination_context:{...baseThread.coordination_context,source_surface:'/alerts',source_action_id:'pw-alert-action',source_reference:{source_type:'alert',source_id:'pw-alert-1'}}};
function collaborationData(overrides:Record<string,unknown>={}){
 return {filters:{limit:25,offset:0},summary:{total_threads:1,total_matching_threads:1,returned_threads:1,total_is_capped:false,war_room_candidates:1,escalation_recommended:1},pagination:{offset:0,limit:25,returned:1,total_matching:1,total_is_capped:false,has_previous:false,has_more:false},guidance:{},threads:[baseThread],non_mutation_guarantee:true,generated_at:'2026-10-30T12:00:00Z',...overrides};
}
async function openCollaboration(page:Page,options:{data?:Record<string,unknown>;route?:string}={}){
 await loginAsTenant(page);
 await page.route(collaborationEndpoint,route=>fulfillJson(route,options.data||collaborationData()));
 await page.goto(options.route||'/collaboration');
 await expect(page.getByText('Coordinate work in the source workflow')).toBeVisible();
}
const filterBox=(page:Page)=>page.locator('.collaboration-filters');
const threadCards=(page:Page)=>page.locator('.collaboration-thread-card');

test.describe('Enterprise Collaboration — read-only coordination and source navigation (Batch 17)',()=>{
 test('TCOL-001 workspace states that it never sends messages or edits source records',async({page})=>{
  await openCollaboration(page);
  await expect(page.getByText('It does not create a chat thread, send a message, notify anyone, or record a comment.',{exact:false})).toBeVisible();
  await expect(page.getByText('Read-only guidance')).toBeVisible();
 });
 test('TCOL-002 pending GET displays read-only loading state',async({page})=>{
  await loginAsTenant(page);let release!:()=>void;const hold=new Promise<void>(resolve=>release=resolve);
  await page.route(collaborationEndpoint,async route=>{await hold;await fulfillJson(route,collaborationData());});
  await page.goto('/collaboration');await expect(page.getByRole('heading',{name:'Loading coordination recommendations'})).toBeVisible();
  release();await expect(page.getByText('Coordinate work in the source workflow')).toBeVisible();
 });
 test('TCOL-003 read failure shows Retry and fetches data on recovery',async({page})=>{
  await loginAsTenant(page);let count=0;let success=false;
  await page.route(collaborationEndpoint,route=>{count++;return fulfillJson(route,success?collaborationData():{message:'Synthetic summary failure'},success?200:503);});
  await page.goto('/collaboration');await expect(page.getByRole('heading',{name:'Coordination recommendations could not be loaded'})).toBeVisible();
  success=true;await page.getByRole('button',{name:'Retry'}).click();
  await expect(page.getByText('Coordinate work in the source workflow')).toBeVisible();expect(count).toBeGreaterThanOrEqual(2);
 });
 test('TCOL-004 empty recommendations explain how to find authoritative work',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[],summary:{total_matching_threads:0,total_threads:0},pagination:{total_matching:0,has_more:false,has_previous:false}})});
  await expect(page.getByRole('heading',{name:'No coordination recommendations match the current filters'})).toBeVisible();
  await expect(threadCards(page)).toHaveCount(0);
 });
 test('TCOL-005 Refresh recommendations refetches GET without a write',async({page})=>{
  await openCollaboration(page);let reads=0;let writes=0;
  await page.route(collaborationEndpoint,route=>{reads++;if(route.request().method()!=='GET')writes++;return fulfillJson(route,collaborationData());});
  await page.getByRole('button',{name:'Refresh recommendations'}).click();await expect.poll(()=>reads).toBeGreaterThanOrEqual(1);expect(writes).toBe(0);
 });
 test('TCOL-006 coordination-area selector sends collaboration_domain and resets offset',async({page})=>{
  await openCollaboration(page);let url='';await page.route(collaborationEndpoint,route=>{url=route.request().url();return fulfillJson(route,collaborationData());});
  await filterBox(page).getByLabel('Coordination area').selectOption('alerts');
  await expect.poll(()=>new URL(url).searchParams.get('collaboration_domain')).toBe('alerts');expect(new URL(url).searchParams.get('offset')).toBe('0');
 });
 test('TCOL-007 recommendation-type filter sends exact thread_type',async({page})=>{
  await openCollaboration(page);let url='';await page.route(collaborationEndpoint,route=>{url=route.request().url();return fulfillJson(route,collaborationData());});
  await filterBox(page).getByLabel('Recommendation type').selectOption('incident_thread');
  await expect.poll(()=>new URL(url).searchParams.get('thread_type')).toBe('incident_thread');
 });
 test('TCOL-008 urgency selector requests high severity only',async({page})=>{
  await openCollaboration(page);let url='';await page.route(collaborationEndpoint,route=>{url=route.request().url();return fulfillJson(route,collaborationData());});
  await filterBox(page).getByLabel('Urgency').selectOption('high');
  await expect.poll(()=>new URL(url).searchParams.get('urgency')).toBe('high');
 });
 test('TCOL-009 attention-state filter sends blocked query key',async({page})=>{
  await openCollaboration(page);let url='';await page.route(collaborationEndpoint,route=>{url=route.request().url();return fulfillJson(route,collaborationData());});
  await filterBox(page).getByLabel('Needs attention because').selectOption('blocked');
  await expect.poll(()=>new URL(url).searchParams.get('attention_state')).toBe('blocked');
 });
 test('TCOL-010 result limit 100 is sent to backend as URL limit',async({page})=>{
  await openCollaboration(page);let url='';await page.route(collaborationEndpoint,route=>{url=route.request().url();return fulfillJson(route,collaborationData());});
  await filterBox(page).getByLabel('Maximum recommendations').selectOption('100');
  await expect.poll(()=>new URL(url).searchParams.get('limit')).toBe('100');
 });
 test('TCOL-011 Clear filters resets every selector to all and default limit',async({page})=>{
  await openCollaboration(page);await filterBox(page).getByLabel('Urgency').selectOption('critical');
  await filterBox(page).getByRole('button',{name:'Clear filters'}).click();
  await expect(filterBox(page).getByLabel('Urgency')).toHaveValue('all');await expect(filterBox(page).getByLabel('Maximum recommendations')).toHaveValue('25');
  await expect(filterBox(page).getByRole('button',{name:'Clear filters'})).toHaveCount(0);
 });
 test('TCOL-012 summary uses total matching count even when only one card returned',async({page})=>{
  await openCollaboration(page,{data:collaborationData({summary:{total_matching_threads:93,war_room_candidates:3,escalation_recommended:4},pagination:{offset:0,limit:25,returned:1,total_matching:93,has_more:true}})});
  await expect(page.getByLabel('Collaboration summary')).toContainText('93');await expect(threadCards(page)).toHaveCount(1);
 });
 test('TCOL-013 capped total is marked with plus and scanning explanation',async({page})=>{
  await openCollaboration(page,{data:collaborationData({pagination:{offset:0,limit:25,total_matching:200,total_is_capped:true,has_previous:false,has_more:true},summary:{total_matching_threads:200,total_is_capped:true}})});
  await expect(page.getByLabel('Collaboration summary')).toContainText('200+');
  await expect(page.getByText('The total may be higher because source scanning is deliberately bounded',{exact:false})).toBeVisible();
 });
 test('TCOL-014 visible coordination card preserves title, severity and workflow source',async({page})=>{
  await openCollaboration(page);const card=threadCards(page).first();
  await expect(card.getByRole('heading',{name:'Synthetic delayed stock task'})).toBeVisible();
  await expect(card).toContainText('High');await expect(card).toContainText('Blocked task needs review');
 });
 test('TCOL-015 assignee, overdue and blocked context remain visible on source card',async({page})=>{
  await openCollaboration(page);const card=threadCards(page).first();
  for(const value of ['Synthetic Assignee','Blocked','Overdue','Synthetic shelf A'])await expect(card).toContainText(value);
 });
 test('TCOL-016 exact alert link has alert_id sourced from its original record',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[alertThread]})});
  const link=threadCards(page).getByRole('link',{name:'Open exact alert'});
  await expect(link).toHaveAttribute('href','/alerts?alert_id=pw-alert-1');
 });
 test('TCOL-017 exact task link has task_id, not a generic route',async({page})=>{
  await openCollaboration(page);
  await expect(threadCards(page).getByRole('link',{name:'Open exact execution task'})).toHaveAttribute('href','/execution-tasks?task_id=pw-task-1');
 });
 test('TCOL-018 unknown source surface does not invent an external/deep link',async({page})=>{
  const unknown={...baseThread,coordination_context:{...baseThread.coordination_context,source_surface:'/unrecognized-public-path',source_action_id:null}};
  await openCollaboration(page,{data:collaborationData({threads:[unknown]})});
  await expect(threadCards(page).getByRole('link')).toHaveCount(0);
 });
 test('TCOL-019 authoritative Action Center reference deep-link retains exact action id',async({page})=>{
  await openCollaboration(page);
  await expect(threadCards(page).getByRole('link',{name:'Open exact Action Center item'})).toHaveAttribute('href','/action-center?source_action_id=pw-action-1');
 });
 test('TCOL-020 Safety and limits view explicitly forbids messaging, mutation and partner contact',async({page})=>{
  await openCollaboration(page);await page.getByRole('tab',{name:'Safety and limits'}).click();
  for(const title of ['No coordination room is created','No external partner is contacted','No messages or comments are recorded','No operational data is changed','Source permissions still apply'])
   await expect(page.getByRole('heading',{name:title})).toBeVisible();
  await expect(page.locator('.collaboration-thread-card')).toHaveCount(0);
 });
});


// Batch 18 continuation: all assertions target live UI with synthetic read-only summary responses.
// Missing disposable-role credentials fail loudly; they are not bundled or fabricated.
test.describe('Enterprise Collaboration — pagination, source fidelity, and permission boundaries (Batch 18)',()=>{
 test('TCOL-021 Next requests the next server page and replaces displayed cards',async({page})=>{
  await openCollaboration(page,{data:collaborationData({pagination:{offset:0,limit:25,total_matching:26,has_previous:false,has_more:true}})});
  let url='';await page.route(collaborationEndpoint,route=>{url=route.request().url();return fulfillJson(route,collaborationData({threads:[{...baseThread,thread_id:'second',title:'Second page item'}],pagination:{offset:25,limit:25,total_matching:26,has_previous:true,has_more:false}}));});
  await page.getByRole('navigation',{name:'Recommendation pages'}).getByRole('button',{name:'Next'}).click();
  await expect.poll(()=>new URL(url).searchParams.get('offset')).toBe('25');
  await expect(threadCards(page)).toHaveCount(1);await expect(threadCards(page)).toContainText('Second page item');
  await expect(page.getByText('Synthetic delayed stock task')).toHaveCount(0);
 });
 test('TCOL-022 Previous decrements offset using effective server limit',async({page})=>{
  await openCollaboration(page,{data:collaborationData({pagination:{offset:0,limit:25,total_matching:70,has_more:true}})});
  await page.route(collaborationEndpoint,route=>{const u=new URL(route.request().url());const offset=Number(u.searchParams.get('offset'));return fulfillJson(route,collaborationData({pagination:{offset,limit:25,total_matching:70,has_more:offset<50,has_previous:offset>0}}));});
  const nav=page.getByRole('navigation',{name:'Recommendation pages'});await nav.getByRole('button',{name:'Next'}).click();await expect(nav.getByRole('button',{name:'Previous'})).toBeEnabled();
  await nav.getByRole('button',{name:'Previous'}).click();await expect.poll(()=>page.locator('.collaboration-pagination__status').textContent()).toContain('1–1');
 });
 test('TCOL-023 Changing a filter resets the server offset to zero',async({page})=>{
  await openCollaboration(page,{data:collaborationData({pagination:{offset:0,limit:25,total_matching:70,has_more:true}})});
  let urls:string[]=[];await page.route(collaborationEndpoint,route=>{const u=new URL(route.request().url());urls.push(u.toString());const off=Number(u.searchParams.get('offset'));return fulfillJson(route,collaborationData({pagination:{offset:off,limit:25,total_matching:70,has_previous:off>0,has_more:true}}));});
  await page.getByRole('navigation',{name:'Recommendation pages'}).getByRole('button',{name:'Next'}).click();await expect.poll(()=>urls.some(u=>new URL(u).searchParams.get('offset')==='25')).toBe(true);
  await filterBox(page).getByLabel('Coordination area').selectOption('alerts');await expect.poll(()=>urls.some(u=>{const q=new URL(u).searchParams;return q.get('offset')==='0'&&q.get('collaboration_domain')==='alerts';})).toBe(true);
 });
 test('TCOL-024 No rows and no pagination flags hide navigation controls',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[],pagination:{offset:0,limit:25,total_matching:0,has_previous:false,has_more:false}})});
  await expect(page.getByRole('navigation',{name:'Recommendation pages'})).toHaveCount(0);
 });
 test('TCOL-025 Summary falls back to summary total when pagination lacks total',async({page})=>{
  await openCollaboration(page,{data:collaborationData({summary:{total_matching_threads:36,war_room_candidates:1,escalation_recommended:1},pagination:{offset:0,limit:25}})});
  await expect(page.getByLabel('Collaboration summary')).toContainText('36');
 });
 test('TCOL-026 Invalid totals and counts safely show zero rather than NaN',async({page})=>{
  await openCollaboration(page,{data:collaborationData({summary:{total_matching_threads:'oops',war_room_candidates:'not-a-number',escalation_recommended:null},pagination:{total_matching:'bad'}})});
  const summary=page.getByLabel('Collaboration summary');await expect(summary).not.toContainText('NaN');await expect(summary).toContainText('0');
 });
 test('TCOL-027 Source timestamp falls back from updated_at to created_at',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,updated_at:null,created_at:'2024-01-15T11:45:00Z'}]})});
  const details=threadCards(page).first().locator('.collaboration-facts');await expect(details).toContainText('2024');
 });
 test('TCOL-028 Invalid timestamp is shown unchanged without a false date',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,updated_at:'not-a-date',created_at:null}]})});
  await expect(threadCards(page).first().locator('.collaboration-facts')).toContainText('not-a-date');
 });
 test('TCOL-029 Operational Feed link uses timeline ID, urgency, and source business area',async({page})=>{
  const thread={...baseThread,urgency:'critical',coordination_context:{...baseThread.coordination_context,source_surface:'/real-time-operations-feed',source_timeline_item_id:'pw-event-42',source_action_id:null,business_area:'execution'}};
  await openCollaboration(page,{data:collaborationData({threads:[thread]})});
  await expect(threadCards(page).getByRole('link',{name:'Open exact operational event'})).toHaveAttribute('href','/real-time-operations-feed?timeline_item_id=pw-event-42&urgency=critical&event_domain=execution');
 });
 test('TCOL-030 Review link adds action ID only when the source provides one',async({page})=>{
  const context={...baseThread.coordination_context,source_surface:'/intelligence-review',source_action_id:null};
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,coordination_context:context}]})});
  await expect(threadCards(page).getByRole('link',{name:'Open exact review'})).toHaveAttribute('href','/intelligence-review');
 });
 test('TCOL-031 Forecast guidance uses exact source action ID in its link',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,coordination_context:{...baseThread.coordination_context,source_surface:'/probabilistic-forecasting',source_action_id:'forecast 1'}}]})});
  await expect(threadCards(page).getByRole('link',{name:'Open Probabilistic Forecasting'})).toHaveAttribute('href','/probabilistic-forecasting?source_action_id=forecast+1');
 });
 test('TCOL-032 Adaptive policy guidance uses exact source action ID',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,coordination_context:{...baseThread.coordination_context,source_surface:'/adaptive-policy-engine',source_action_id:'policy-7'}}]})});
  await expect(threadCards(page).getByRole('link',{name:'Open Adaptive Policy Engine'})).toHaveAttribute('href','/adaptive-policy-engine?source_action_id=policy-7');
 });
 test('TCOL-033 Legacy control tower path maps to local Action Center',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,coordination_context:{...baseThread.coordination_context,source_surface:'/control-tower',source_action_id:'pw-action-1'}}]})});
  await expect(threadCards(page).getByRole('link',{name:'Open Action Center'})).toHaveAttribute('href','/action-center?source_action_id=pw-action-1');
 });
 test('TCOL-034 Action Center primary link does not duplicate Action Center sibling',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,coordination_context:{...baseThread.coordination_context,source_surface:'/action-center'}}]})});
  await expect(threadCards(page).getByRole('link')).toHaveCount(1);
  await expect(threadCards(page).getByRole('link',{name:'Open exact Action Center item'})).toHaveCount(0);
 });
 test('TCOL-035 Allowlisted source page is reachable even when no exact identifier exists',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,coordination_context:{...baseThread.coordination_context,source_surface:'/shipments',source_reference:null,source_action_id:null}}]})});
  await expect(threadCards(page).getByRole('link',{name:'Open Shipments'})).toHaveAttribute('href','/shipments');
 });
 test('TCOL-036 Missing title and summary show explicit fallback copy',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,title:null,summary:null}]})});
  await expect(threadCards(page).getByRole('heading',{name:'Coordination item'})).toBeVisible();await expect(threadCards(page)).toContainText('No additional summary was provided.');
 });
 test('TCOL-037 Unknown identifiers are prettified rather than exposed as snake_case',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,thread_type:'new_thread_type',collaboration_domain:'new_domain',participants_hint:{suggested_roles:['new_role_name']},coordination_context:{...baseThread.coordination_context,business_area:'special_warehouse_flow'}}]})});
  const card=threadCards(page);for(const s of ['New Thread Type','New Domain','New Role Name','Special Warehouse Flow'])await expect(card).toContainText(s);
 });
 test('TCOL-038 Comment guidance only displays when source provides topics',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,comment_guidance:{recommended_comment_topics:[]}}]})});
  await expect(threadCards(page).getByText('Topics to cover in the source workflow')).toHaveCount(0);
 });
 test('TCOL-039 Missing storage location omits location fact row',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,work_context:{...baseThread.work_context,storage_location_name:null}}]})});
  await expect(threadCards(page).locator('.collaboration-facts dt').getByText('Location',{exact:true})).toHaveCount(0);
 });
 test('TCOL-040 Due date row appears only when source supplies it',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,work_context:{...baseThread.work_context,effective_due_at:null}}]})});
  await expect(threadCards(page).locator('.collaboration-facts dt').getByText('Due or follow-up time')).toHaveCount(0);
 });
 test('TCOL-041 Explicit unassigned state overrides an accidental assignee name',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,participants_hint:{suggested_roles:[],actual_assignee_name:'Stale person',assignment_state:'unassigned'}}]})});
  await expect(threadCards(page).locator('.collaboration-facts')).toContainText('Unassigned');await expect(threadCards(page).locator('.collaboration-facts')).not.toContainText('Stale person');
 });
 test('TCOL-042 Assigned state without identity uses neutral source workflow wording',async({page})=>{
  await openCollaboration(page,{data:collaborationData({threads:[{...baseThread,participants_hint:{suggested_roles:[],actual_assignee_name:null,assignment_state:'assigned'},work_context:{...baseThread.work_context,actual_assignee_name:null}}]})});
  await expect(threadCards(page).locator('.collaboration-facts')).toContainText('Assigned in the source workflow');
 });
 test('TCOL-043 Candidate war room is presented as suggestion only',async({page})=>{
  await openCollaboration(page);await expect(threadCards(page)).toContainText('Active coordination suggested');
  await page.getByRole('tab',{name:'Safety and limits'}).click();await expect(page.getByText('This page does not create a room, channel, meeting, or participant list.',{exact:false})).toBeVisible();
 });
 test('TCOL-044 Arbitrary external or javascript source surfaces yield no source link',async({page})=>{
  const external={...baseThread,coordination_context:{...baseThread.coordination_context,source_surface:'https://example.com/phish',source_action_id:null}};
  await openCollaboration(page,{data:collaborationData({threads:[external]})});await expect(threadCards(page).getByRole('link')).toHaveCount(0);
 });
 test('TCOL-045 Refresh button is disabled while pending refetch',async({page})=>{
  await openCollaboration(page);let release!:()=>void;const pending=new Promise<void>(resolve=>release=resolve);
  await page.route(collaborationEndpoint,async route=>{await pending;await fulfillJson(route,collaborationData());});
  await page.getByRole('button',{name:'Refresh recommendations'}).click();await expect(page.getByRole('button',{name:'Refreshing…'})).toBeDisabled();
  release();await expect(page.getByRole('button',{name:'Refresh recommendations'})).toBeEnabled();
 });
 test('TCOL-046 Switching to limits and back preserves local filter without mutation',async({page})=>{
  await openCollaboration(page);await filterBox(page).getByLabel('Urgency').selectOption('critical');
  await page.getByRole('tab',{name:'Safety and limits'}).click();await page.getByRole('tab',{name:'Coordination recommendations'}).click();
  await expect(filterBox(page).getByLabel('Urgency')).toHaveValue('critical');
 });
 test('TCOL-047 Intelligence Review shortcut is absent without decision intelligence read permission',async({page})=>{
  await loginAsDisposableRole(page,'PW_COL_NO_INTELLIGENCE');await page.route(collaborationEndpoint,route=>fulfillJson(route,collaborationData()));
  await page.goto('/collaboration');await expect(page.getByRole('heading',{name:'Coordination recommendations'})).toBeVisible();
  await expect(page.locator('.collaboration-shortcuts').getByRole('link',{name:'Open Intelligence Review'})).toHaveCount(0);
 });
 test('TCOL-048 Source-provided escalation and partner guidance appear in Safety limits',async({page})=>{
  await openCollaboration(page,{data:collaborationData({guidance:{escalation_thread_guidance:'Synthetic manual escalation by owner.',supplier_coordination_guidance:'Synthetic partner contact remains external.'}})});
  await page.getByRole('tab',{name:'Safety and limits'}).click();
  await expect(page.getByText('Synthetic manual escalation by owner.')).toBeVisible();await expect(page.getByText('Synthetic partner contact remains external.')).toBeVisible();
 });
 test('TCOL-049 Read-only navigation and filtering never emit a coordination mutation request',async({page})=>{
  let writes=0;await loginAsTenant(page);
  await page.route('**/operational-action-center/**',async route=>{if(route.request().method()!=='GET'){writes++;return fulfillJson(route,{message:'Forbidden mutation'},409);}return fulfillJson(route,collaborationData());});
  await page.goto('/collaboration');await expect(page.getByRole('heading',{name:'Coordination recommendations'})).toBeVisible();
  await filterBox(page).getByLabel('Urgency').selectOption('critical');await page.getByRole('tab',{name:'Safety and limits'}).click();
  await page.getByRole('tab',{name:'Coordination recommendations'}).click();await page.getByRole('button',{name:'Refresh recommendations'}).click();
  expect(writes).toBe(0);
 });
 test('TCOL-050 User without operational action center read is redirected from route',async({page})=>{
  await loginAsDisposableRole(page,'PW_COL_NO_READ');await page.goto('/collaboration');
  await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);await expect(page.getByRole('heading',{name:'Coordination recommendations'})).toHaveCount(0);
 });
});
