import { test, expect, type Page } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 10 — Workspace: a router-reachable, role-filtered READ-ONLY tenant page.
// Source: frontend/src/pages/RoleAwareWorkspacePage.tsx; frontend/src/lib/useRouteQueryState.ts;
// backend/src/routes/operationalActionCenter.js and validation.workspaceSummary.
// Synthetic GET fixtures only. No application mutations. GENERATED_UNRUN.
const endpoint = '**/operational-action-center/workspace-summary?*';
type Action = {
  action_id:string;action_domain:string;action_type:string;action_status:string;
  urgency:string;title:string;summary?:string|null;source_id?:string|null;
  recommended_next_step?:string|null;
  explainability?:{source_surface?:string;human_action_only?:boolean};
};
const sampleActions = (): Action[] => [
  {action_id:'pw-work-alert-001',action_domain:'alerts',action_type:'manual_alert',action_status:'open',urgency:'critical',
    title:'FREEZER TEMPERATURE',summary:'Cold room critical',recommended_next_step:'Inspect refrigerated stock'},
  {action_id:'pw-work-task-002',action_domain:'execution',action_type:'execution_task',action_status:'in_progress',urgency:'high',
    title:'Synthetic transfer task',summary:'Bin relocation',source_id:'pw-task-002',recommended_next_step:'Review transfer'},
  {action_id:'pw-work-review-003',action_domain:'decision_intelligence',action_type:'human_review',action_status:'approval_required',
    urgency:'medium',title:'Synthetic evaluation',summary:'Reviewer must approve'},
  {action_id:'pw-work-govern-004',action_domain:'ai_governance',action_type:'governance_review',action_status:'in_review',
    urgency:'low',title:'Synthetic governance',summary:'Check governance evidence'},
  {action_id:'pw-work-job-005',action_domain:'multi_domain',action_type:'coordination',action_status:'pending',urgency:'medium',
    title:'Synthetic schedule review',summary:'Review open schedule',explainability:{source_surface:'/automation-schedules'}},
  {action_id:'pw-work-unknown-006',action_domain:'control_tower',action_type:'risk',action_status:'blocked',urgency:'high',
    title:'Synthetic untrusted source',summary:'External system',explainability:{source_surface:'https://untrusted.invalid/action'}}
];
const baseWidgets = () => [
  {widget_id:'priority_action_inbox',visible_action_count:6,top_action_ids:['pw-work-alert-001'],read_only:true,human_action_only:true},
  {widget_id:'alert_triage_panel',visible_action_count:1,read_only:true},
  {widget_id:'my_execution_queue',visible_action_count:1,read_only:true},
  {widget_id:'decision_governance_feed',visible_action_count:2,read_only:true}
];
function response(actions:Action[]=sampleActions(),widgets=baseWidgets()) {
  return {
    definition:{workspace_id:'role_workspace',workspace_name:'Role workspace',execution_mode:'read_only_role_aware_workspace_orchestration',
      primary_focus:['critical_actions','approval_required'],action_strategy:'facility_and_process_coordination',
      safety_contract:{tenant_isolated:true,read_only:true,human_action_only:true}},
    workspace_profile:{workspace_id:'role_workspace',workspace_name:'Synthetic role workspace',
      primary_focus:['critical_actions','approval_required'],action_strategy:'facility_and_process_coordination'},
    user_role:'manager',role_permissions:['operational_action_center.read'],
    summary:{total_actions:actions.length,critical_actions:actions.filter(item=>item.urgency==='critical').length,
      approval_required:1,by_domain:{alerts:1,execution:1}},
    widgets,guidance:{next_action_id:actions[0]?.action_id??null,next_action_title:actions[0]?.title??null,
      operator_guidance:'Synthetic assigned work guidance',escalation_guidance:'Synthetic escalation guidance',
      hidden_action_count_due_to_role_permissions:0},
    actions,generated_at:'2026-10-21T10:00:00.000Z',non_mutation_guarantee:true
  };
}
async function mockWorkspace(page:Page,body:unknown=response()) {
  await page.route(endpoint,route=>{
    if(route.request().method()!=='GET')return route.abort();
    return fulfillJson(route,body);
  });
}
const actionCards=(page:Page)=>page.locator('.workspace-page__action-card');
const actionCard=(page:Page,title:string)=>actionCards(page).filter({hasText:title});
async function openWorkspace(page:Page,path='/workspace') {
  await loginAsTenant(page);
  await mockWorkspace(page);
  await page.goto(path);
  await expect(page.locator('.workspace-page')).toBeVisible();
  await expect(actionCards(page)).toHaveCount(6);
}


/** Simulate effective tenant permissions WITHOUT modifying the application or server.
 * Preserve the current JWT tenant/user/role identity and the workspace.read capability.
 */
async function installWorkspacePermissions(page:Page, transform:(perms:string[])=>string[]) {
  const snapshot=await page.evaluate(()=>JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions')||'null') as {
    tenant_id:string;user_id?:string;role:string;permissions:string[]
  }|null);
  expect(snapshot,'Expected an authenticated disposable-tenant permission snapshot').toBeTruthy();
  const permissions=Array.from(new Set([...transform(snapshot!.permissions),'operational_action_center.read']));
  const mocked={...snapshot!,permissions,scope:'tenant'};
  await page.route('**/permissions/me',route=>fulfillJson(route,mocked));
  await page.evaluate(value=>{
    localStorage.setItem('inventory_tenant_effective_permissions',JSON.stringify(value));
    window.dispatchEvent(new CustomEvent('inventory-tenant-permissions-changed'));
  },mocked);
}

test.describe('Workspace — permission-scoped read-only work queue and source links',()=>{
  test.beforeEach(async ({page})=>{await openWorkspace(page);});

  test('TWKS-001 workspace explains its read-only role-specific purpose',async ({page})=>{
    await expect(page.getByRole('heading',{name:'Workspace'})).toBeVisible();
    await expect(page.locator('.workspace-page')).toContainText('A simplified operational view filtered to the work this signed-in role is allowed to see.');
    await expect(page.locator('.workspace-page')).toContainText('it does not complete tasks or change inventory itself.');
  });

  test('TWKS-002 summary uses backend action and critical totals',async ({page})=>{
    const overview=page.getByLabel('Workspace overview');
    await expect(overview).toContainText('Synthetic role workspace');
    await expect(overview).toContainText('Actions available');
    await expect(overview).toContainText('Critical actions');
    await expect(overview).toContainText('6');
    await expect(overview).toContainText('1');
  });

  test('TWKS-003 role-specific context shows role filtering and active badge',async ({page})=>{
    const overview=page.getByLabel('Workspace overview');
    await expect(overview).toContainText('Role filtering');
    await expect(overview).toContainText('Active');
    await expect(page.locator('.workspace-page')).toContainText('current access role');
  });

  test('TWKS-004 workspace main-purpose context humanizes primary focus',async ({page})=>{
    const context=page.locator('.workspace-page__context-card').filter({hasText:'Main purpose'});
    await expect(context).toContainText('urgent work');
    await expect(context).toContainText('items waiting for approval');
  });

  test('TWKS-005 organizing strategy is rendered as plain-language operator guidance',async ({page})=>{
    const context=page.locator('.workspace-page__context-card').filter({hasText:'How work is organised'});
    await expect(context).toContainText('Coordinate daily operational work, warnings, and approvals.');
  });

  test('TWKS-006 execution mode is read-only with source ownership explained',async ({page})=>{
    const context=page.locator('.workspace-page__context-card').filter({hasText:'Page mode'});
    await expect(context).toContainText('Read-only guidance');
    await expect(context).toContainText('Real work is completed on the source page.');
  });

  test('TWKS-007 widgets show human-readable names, read-only summary and counts',async ({page})=>{
    const widgets=page.locator('.workspace-page__widget-card');
    await expect(widgets).toHaveCount(4);
    await expect(widgets.nth(0)).toContainText('Priority work list');
    await expect(widgets.nth(0)).toContainText('6 matching items');
    await expect(widgets.nth(1)).toContainText('Alerts to review');
    await expect(widgets.nth(1)).toContainText('1 matching item');
    await expect(widgets.nth(2)).toContainText('My execution work');
    await expect(widgets.nth(3)).toContainText('Decision reviews');
  });

  test('TWKS-008 unknown widget ID is readable and remains read-only',async ({page})=>{
    await mockWorkspace(page,response(sampleActions(),[{widget_id:'custom_review_queue',visible_action_count:7}]));
    await page.reload();
    const widget=page.locator('.workspace-page__widget-card');
    await expect(widget).toHaveCount(1);
    await expect(widget).toContainText('Custom Review Queue');
    await expect(widget).toContainText('Read-only summary of matching work.');
  });

  test('TWKS-009 invalid widget count displays safe zero instead of NaN',async ({page})=>{
    await mockWorkspace(page,response(sampleActions(),[{widget_id:'priority_action_inbox',visible_action_count:Number.NaN}]));
    await page.reload();
    await expect(page.locator('.workspace-page__widget-count')).toContainText('0 matching items');
    await expect(page.locator('.workspace-page__widget-card')).not.toContainText('NaN');
  });

  test('TWKS-010 zero widgets yields explicit role-scoped empty summary',async ({page})=>{
    await mockWorkspace(page,response(sampleActions(),[]));
    await page.reload();
    await expect(page.getByText('No summary groups available')).toBeVisible();
    await expect(page.getByText('No workspace summary matched this role and filter selection.')).toBeVisible();
  });

  test('TWKS-011 guided next action uses backend title and operator instructions',async ({page})=>{
    const guidance=page.locator('.workspace-page__guidance-card');
    await expect(guidance).toContainText('Start with: FREEZER TEMPERATURE.');
    await expect(guidance).toContainText('Synthetic assigned work guidance');
    await expect(guidance).toContainText('Synthetic escalation guidance');
  });

  test('TWKS-012 missing recommended action and guidance uses clear fallbacks',async ({page})=>{
    const body=response();
    body.guidance={...body.guidance,next_action_id:null,next_action_title:null,operator_guidance:'',escalation_guidance:''};
    await mockWorkspace(page,body);await page.reload();
    const guidance=page.locator('.workspace-page__guidance-card');
    await expect(guidance).toContainText('There is no open action to start with for the selected filters.');
    await expect(guidance).toContainText('Workspace guidance is not available yet.');
    await expect(guidance).toContainText('Only permitted work is included.');
  });

  test('TWKS-013 action cards retain backend order with corresponding titles',async ({page})=>{
    const titles=await actionCards(page).locator('.workspace-page__action-title').allTextContents();
    expect(titles).toEqual(['Freezer Temperature','Synthetic transfer task','Synthetic evaluation',
      'Synthetic governance','Synthetic schedule review','Synthetic untrusted source']);
  });

  test('TWKS-014 action list shows only first 12 of a longer backend result',async ({page})=>{
    const many=Array.from({length:17},(_,i)=>({...sampleActions()[1],action_id:`pw-action-${i+1}`,title:`Synthetic task ${i+1}`}));
    await mockWorkspace(page,response(many));await page.reload();
    await expect(actionCards(page)).toHaveCount(12);
    await expect(page.locator('.workspace-page__showing-copy')).toContainText('Showing the first 12 of 17 actions.');
    await expect(page.getByText('Synthetic task 13')).toHaveCount(0);
  });

  test('TWKS-015 empty action response shows no actions with next-step explanation',async ({page})=>{
    await mockWorkspace(page,response([]));await page.reload();
    await expect(actionCards(page)).toHaveCount(0);
    await expect(page.getByText('No matching actions')).toBeVisible();
    await expect(page.getByText('No open work matched the selected area and urgency. Try a broader filter or refresh the page.')).toBeVisible();
  });

  test('TWKS-016 each action links back to its exact Action Center source-action ID',async ({page})=>{
    const cards=actionCards(page);await expect(cards).toHaveCount(6);
    for(const [index,item] of sampleActions().entries()){
      const link=cards.nth(index).getByRole('link',{name:'View in Action Center'});
      expect(new URL((await link.getAttribute('href'))!,'http://localhost').searchParams.get('source_action_id')).toBe(item.action_id);
      await expect(link).toHaveAttribute('href',`/action-center?source_action_id=${item.action_id}`);
    }
  });

  test('TWKS-017 alert source link uses unresolved queue and safe search text',async ({page})=>{
    const link=actionCard(page,'Freezer Temperature').getByRole('link',{name:'Open alert'});
    const url=new URL((await link.getAttribute('href'))!,'http://localhost');
    expect(url.pathname).toBe('/alerts');
    expect(url.searchParams.get('resolved')).toBe('false');
    expect(url.searchParams.get('search')).toBe('Cold room critical');
  });

  test('TWKS-018 execution source link uses the matching task ID',async ({page})=>{
    await expect(actionCard(page,'Synthetic transfer task').getByRole('link',{name:'Open execution task'}))
      .toHaveAttribute('href','/execution-tasks?task_id=pw-task-002');
  });

  test('TWKS-019 decision-review source links by source action ID',async ({page})=>{
    await expect(actionCard(page,'Synthetic evaluation').getByRole('link',{name:'Open review'}))
      .toHaveAttribute('href','/intelligence-review?source_action_id=pw-work-review-003');
  });

  test('TWKS-020 governance-review source also preserves its own action ID',async ({page})=>{
    await expect(actionCard(page,'Synthetic governance').getByRole('link',{name:'Open review'}))
      .toHaveAttribute('href','/intelligence-review?source_action_id=pw-work-govern-004');
  });

  test('TWKS-021 allowlisted application source surfaces yield internal links',async ({page})=>{
    await expect(actionCard(page,'Synthetic schedule review').getByRole('link',{name:'Open source page'}))
      .toHaveAttribute('href','/automation-schedules');
  });

  test('TWKS-022 unknown tenant paths do not create source-page navigation links',async ({page})=>{
    const actions=sampleActions().slice(0,1);
    actions.push({...sampleActions()[4],action_id:'pw-unsafe-tenant-path',title:'Synthetic unknown source',
      explainability:{source_surface:'/not-a-real-tenant-route'}});
    await mockWorkspace(page,response(actions));await page.reload();
    await expect(actionCard(page,'Synthetic unknown source').getByRole('link',{name:'Open source page'})).toHaveCount(0);
    await expect(actionCard(page,'Synthetic unknown source').getByRole('link',{name:'View in Action Center'})).toBeVisible();
  });

  test('TWKS-023 external source URLs cannot become application navigation links',async ({page})=>{
    const unsafe=actionCard(page,'Synthetic untrusted source');
    await expect(unsafe.getByRole('link',{name:'Open source page'})).toHaveCount(0);
    await expect(unsafe.getByRole('link',{name:'View in Action Center'})).toBeVisible();
  });

  test('TWKS-024 absent source location provides only the safe Action Center link',async ({page})=>{
    await mockWorkspace(page,response([{...sampleActions()[4],explainability:undefined}]));await page.reload();
    await expect(actionCards(page)).toHaveCount(1);
    await expect(actionCards(page).getByRole('link')).toHaveCount(1);
    await expect(actionCards(page).getByRole('link',{name:'View in Action Center'})).toBeVisible();
  });

  test('TWKS-025 missing summary renders explicit missing-summary message',async ({page})=>{
    const items=sampleActions();items[1]={...items[1],summary:null};
    await mockWorkspace(page,response(items));await page.reload();
    await expect(actionCard(page,'Synthetic transfer task')).toContainText('No summary provided.');
  });

  test('TWKS-026 missing next step does not fabricate an action recommendation',async ({page})=>{
    const items=sampleActions();items[1]={...items[1],recommended_next_step:null};
    await mockWorkspace(page,response(items));await page.reload();
    await expect(actionCard(page,'Synthetic transfer task').locator('.workspace-page__next-step')).toHaveCount(0);
  });

  test('TWKS-027 urgency, domain and statuses display readable labels',async ({page})=>{
    const card=actionCard(page,'Synthetic evaluation');
    await expect(card).toContainText('Medium');
    await expect(card).toContainText('Decision intelligence');
    await expect(card).toContainText('Approval required');
  });

  test('TWKS-028 uppercase alert title is normalized for readable presentation',async ({page})=>{
    await expect(actionCard(page,'Freezer Temperature').locator('.workspace-page__action-title'))
      .toHaveText('Freezer Temperature');
  });

  test('TWKS-029 missing total summary count falls back to returned action length',async ({page})=>{
    const data=response();const sparse={...data,summary:{critical_actions:1}};
    await mockWorkspace(page,sparse);await page.reload();
    const stats=page.getByLabel('Workspace overview');
    await expect(stats.locator('.io-workspace-stat').filter({hasText:'Actions available'})).toContainText('6');
  });

  test('TWKS-030 backend invalid critical count displays numeric zero',async ({page})=>{
    const data=response();await mockWorkspace(page,{...data,summary:{...data.summary,critical_actions:'not-a-number'}});
    await page.reload();
    const stats=page.getByLabel('Workspace overview');
    await expect(stats.locator('.io-workspace-stat').filter({hasText:'Critical actions'})).toContainText('0');
  });

  test('TWKS-031 urgency selection is reflected in URL and backend GET',async ({page})=>{
    let query:URL|undefined;
    await page.route(endpoint,route=>{query=new URL(route.request().url());return fulfillJson(route,response());});
    await page.getByLabel('Filter by urgency').selectOption('critical');
    await expect(page).toHaveURL(/urgency=critical/);
    await expect.poll(()=>query?.searchParams.get('urgency')).toBe('critical');
  });

  test('TWKS-032 deep-link urgency filter survives reload',async ({page})=>{
    await page.goto('/workspace?urgency=high');
    await expect(page.locator('.workspace-page')).toBeVisible();
    await expect(page.getByLabel('Filter by urgency')).toHaveValue('high');
    await page.reload();
    await expect(page.getByLabel('Filter by urgency')).toHaveValue('high');
  });

  test('TWKS-033 unsupported urgency URL state falls back to All',async ({page})=>{
    await page.goto('/workspace?urgency=invalid-choice');
    await expect(page.getByLabel('Filter by urgency')).toHaveValue('all');
    await expect(actionCards(page)).toHaveCount(6);
  });

  test('TWKS-034 resetting urgency removes the optional backend urgency filter',async ({page})=>{
    let query:URL|undefined;
    await page.route(endpoint,route=>{query=new URL(route.request().url());return fulfillJson(route,response());});
    await page.getByLabel('Filter by urgency').selectOption('critical');
    await expect.poll(()=>query?.searchParams.get('urgency')).toBe('critical');
    await page.getByLabel('Filter by urgency').selectOption('all');
    await expect.poll(()=>query?.searchParams.has('urgency')).toBe(false);
    await expect(page.getByLabel('Filter by urgency')).toHaveValue('all');
  });

  test('TWKS-035 Refresh sends a read-only 50-item summary request',async ({page})=>{
    const methods:string[]=[];let query:URL|undefined;
    await page.route(endpoint,route=>{methods.push(route.request().method());query=new URL(route.request().url());return fulfillJson(route,response());});
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect.poll(()=>methods.length).toBeGreaterThan(0);
    expect(query?.searchParams.get('limit')).toBe('50');
    expect(methods).toEqual(['GET']);
    await expect(actionCards(page)).toHaveCount(6);
  });

  test('TWKS-036 initial GET failure offers retry and recovers after safe refetch',async ({page})=>{
    await page.route(endpoint,route=>fulfillJson(route,{message:'Synthetic workspace outage'},503));
    await page.reload();
    await expect(page.getByText('Workspace could not be loaded')).toBeVisible();
    await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
    await expect(actionCards(page)).toHaveCount(0);
    await mockWorkspace(page);
    await page.getByRole('button',{name:'Try again'}).click();
    await expect(actionCards(page)).toHaveCount(6);
  });

  // Batch 11: role-scoped domain selection and error/transport boundaries.
  // Permission variations use synthetic /permissions/me response for this disposable session.
  test('TWKS-037 work-area options agree with the effective permission snapshot',async ({page})=>{
    const raw=await page.evaluate(()=>localStorage.getItem('inventory_tenant_effective_permissions'));
    expect(raw,'The effective permission snapshot should have loaded for an authenticated tenant').toBeTruthy();
    const perms=new Set((JSON.parse(raw!) as {permissions:string[]}).permissions);
    const values=await page.getByLabel('Filter by work area').locator('option').evaluateAll(items=>items.map(item=>(item as HTMLOptionElement).value));
    const expected=['all',
      ...(perms.has('alerts.read')?['alerts']:[]),
      ...(perms.has('execution_tasks.read')?['execution']:[]),
      ...(perms.has('control_tower.read')?['control_tower']:[]),
      ...(perms.has('decision_intelligence.read')?['decision_intelligence','ai_governance','multi_domain']:[])];
    expect(values).toEqual(expected);
  });

  test('TWKS-038 selected permitted work area is sent to the GET summary endpoint',async ({page})=>{
    const values=await page.getByLabel('Filter by work area').locator('option').evaluateAll(items=>items.map(item=>(item as HTMLOptionElement).value));
    const chosen=values.find(value=>value!=='all');
    expect(chosen,'Requires a disposable role with at least one permitted work area').toBeTruthy();
    let requested:URL|undefined;
    await page.route(endpoint,route=>{requested=new URL(route.request().url());return fulfillJson(route,response());});
    await page.getByLabel('Filter by work area').selectOption(chosen!);
    await expect(page).toHaveURL(new RegExp(`domain=${chosen}`));
    await expect.poll(()=>requested?.searchParams.get('action_domain')).toBe(chosen);
    expect(requested?.searchParams.get('limit')).toBe('50');
  });

  test('TWKS-039 resetting work-area choice removes the action_domain API parameter',async ({page})=>{
    const values=await page.getByLabel('Filter by work area').locator('option').evaluateAll(items=>items.map(item=>(item as HTMLOptionElement).value));
    const chosen=values.find(value=>value!=='all');expect(chosen).toBeTruthy();
    let last:URL|undefined;
    await page.route(endpoint,route=>{last=new URL(route.request().url());return fulfillJson(route,response());});
    await page.getByLabel('Filter by work area').selectOption(chosen!);
    await expect.poll(()=>last?.searchParams.get('action_domain')).toBe(chosen);
    await page.getByLabel('Filter by work area').selectOption('all');
    await expect.poll(()=>last?.searchParams.has('action_domain')).toBe(false);
    await expect(page).not.toHaveURL(/domain=/);
  });

  test('TWKS-040 removing alerts.read hides Alerts without denying Workspace access',async ({page})=>{
    await installWorkspacePermissions(page,perms=>perms.filter(p=>p!=='alerts.read'));
    await page.reload();
    await expect(page.locator('.workspace-page')).toBeVisible();
    await expect(page.getByLabel('Filter by work area').locator('option[value="alerts"]')).toHaveCount(0);
    await expect(page.getByLabel('Filter by work area').locator('option[value="all"]')).toHaveCount(1);
  });

  test('TWKS-041 unknown domain deep link defaults to All and omits API domain filter',async ({page})=>{
    let requested:URL|undefined;
    await page.route(endpoint,route=>{requested=new URL(route.request().url());return fulfillJson(route,response());});
    await page.goto('/workspace?domain=invalid-domain');
    await expect(page.getByLabel('Filter by work area')).toHaveValue('all');
    await expect.poll(()=>requested?.searchParams.has('action_domain')).toBe(false);
    await expect(actionCards(page)).toHaveCount(6);
  });

  test('TWKS-042 losing a selected work-area permission resets the filter to All',async ({page})=>{
    await installWorkspacePermissions(page,perms=>Array.from(new Set([...perms,'alerts.read'])));
    await page.goto('/workspace?domain=alerts');
    await expect(page.getByLabel('Filter by work area')).toHaveValue('alerts');
    await installWorkspacePermissions(page,perms=>perms.filter(p=>p!=='alerts.read'));
    await page.reload();
    await expect(page.getByLabel('Filter by work area')).toHaveValue('all');
    await expect(page).not.toHaveURL(/domain=alerts/);
  });

  test('TWKS-043 urgency and work-area are independent GET filters',async ({page})=>{
    const choices=await page.getByLabel('Filter by work area').locator('option').evaluateAll(items=>items.map(item=>(item as HTMLOptionElement).value));
    const domain=choices.find(value=>value!=='all');expect(domain).toBeTruthy();
    let request:URL|undefined;
    await page.route(endpoint,route=>{request=new URL(route.request().url());return fulfillJson(route,response());});
    await page.getByLabel('Filter by work area').selectOption(domain!);
    await page.getByLabel('Filter by urgency').selectOption('high');
    await expect.poll(()=>request?.searchParams.get('urgency')).toBe('high');
    expect(request?.searchParams.get('action_domain')).toBe(domain);
    await expect(page.getByLabel('Filter by urgency')).toHaveValue('high');
    await expect(page.getByLabel('Filter by work area')).toHaveValue(domain!);
  });

  test('TWKS-044 replacing filter URL state does not push a browser-history entry',async ({page})=>{
    const initial=await page.evaluate(()=>history.length);
    await page.getByLabel('Filter by urgency').selectOption('critical');
    await expect(page).toHaveURL(/urgency=critical/);
    await page.getByLabel('Filter by urgency').selectOption('low');
    await expect(page).toHaveURL(/urgency=low/);
    expect(await page.evaluate(()=>history.length)).toBe(initial);
    await page.reload();
    await expect(page.getByLabel('Filter by urgency')).toHaveValue('low');
  });

  test('TWKS-045 initial pending GET displays a role-scoped loading message',async ({page})=>{
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route(endpoint,async route=>{await gate;await fulfillJson(route,response());});
    await page.reload();
    await expect(page.getByText('Loading Workspace')).toBeVisible();
    await expect(page.getByText('Collecting the work that your role is allowed to see.')).toBeVisible();
    release();
    await expect(actionCards(page)).toHaveCount(6);
  });

  test('TWKS-046 refresh disables duplicate requests while its GET is pending',async ({page})=>{
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    let calls=0;
    await page.route(endpoint,async route=>{calls++;await gate;await fulfillJson(route,response());});
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByRole('button',{name:'Refreshing…'})).toBeDisabled();
    expect(calls).toBe(1);
    release();
    await expect(page.getByRole('button',{name:'Refresh',exact:true})).toBeEnabled();
  });

  test('TWKS-047 missing profile falls back to definition without trusting a spoofed role label',async ({page})=>{
    const data=response();
    await mockWorkspace(page,{...data,user_role:'forged-platform-role',workspace_profile:undefined,
      definition:{...data.definition,workspace_name:'Defined fallback workspace'}});
    await page.reload();
    await expect(page.getByLabel('Workspace overview')).toContainText('Defined fallback workspace');
    await expect(page.locator('.workspace-page')).not.toContainText('forged-platform-role');
  });

  test('TWKS-048 query-string suffix cannot bypass exact source path allowlist',async ({page})=>{
    const item={...sampleActions()[4],title:'Query-suffix source',explainability:{source_surface:'/reports?tenant=other'}};
    await mockWorkspace(page,response([item]));await page.reload();
    const card=actionCard(page,'Query-suffix source');
    await expect(card.getByRole('link',{name:'Open source page'})).toHaveCount(0);
    await expect(card.getByRole('link',{name:'View in Action Center'})).toBeVisible();
  });

  test('TWKS-049 changing both filters and refreshing never sends workspace writes',async ({page})=>{
    const methods:string[]=[];
    await page.route('**/operational-action-center/**',route=>{
      methods.push(route.request().method());
      if(route.request().method()!=='GET')return route.abort();
      return fulfillJson(route,response());
    });
    await page.getByLabel('Filter by urgency').selectOption('critical');
    await expect(page).toHaveURL(/urgency=critical/);
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect.poll(()=>methods.length).toBeGreaterThanOrEqual(2);
    expect(methods.every(method=>method==='GET')).toBe(true);
  });

  test('TWKS-050 access-denied response hides action controls and exposes retry',async ({page})=>{
    await page.route(endpoint,route=>fulfillJson(route,{message:'Synthetic insufficient permissions'},403));
    await page.reload();
    await expect(page.getByText('Workspace could not be loaded')).toBeVisible();
    await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
    await expect(actionCards(page)).toHaveCount(0);
    await expect(page.getByLabel('Filter by work area')).toHaveCount(0);
  });
});
