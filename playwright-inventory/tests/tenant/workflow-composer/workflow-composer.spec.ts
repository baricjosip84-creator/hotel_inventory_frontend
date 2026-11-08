import { test, expect, type Page } from '../../../support/liveOriginalSafeTest';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 9 — Workflow Composer. GENERATED_UNRUN; static source inspection only.
// Frontend: pages/WorkflowAutomationComposerPage.tsx, workflowStateGuidance.ts.
// Backend: routes/operationalActionCenter.js, its validation and controller.
// All summary responses below are synthetic; this page has no source mutations.
const timestamp = '2026-10-21T10:00:00.000Z';
const workflowEndpoint = '**/operational-action-center/workflow-automation-composer-summary?*';
type Blueprint = {
  blueprint_id: string; workflow_domain?: string; blueprint_type?: string;
  source_action_domain?: string; source_title?: string; source_summary?: string;
  source_action_id?: string; viewer_can_act?: boolean; updated_at?: string;
  responsibility?: { assignment_state?: string; assignee_name?: string; responsible_role?: string; is_current_user?: boolean };
  trigger_preview?: { trigger_reference?: string; trigger_status?: string; trigger_urgency?: string;
    trigger_source?: string; event_trigger_only_preview?: boolean; contract_status?: string };
  recommended_next_step?: string; recommended_steps_preview?: string[];
  approval_chain_preview?: string[];
  escalation_policy_preview?: { urgency?: string; escalate_when_blocked?: boolean };
  location_context?: { storage_location_name?: string; from_location_name?: string; to_location_name?: string };
  deadline_context?: { due_state?: string; effective_due_at?: string };
  integration_routing_preview?: {external_workflow_eligible?: boolean; route_to_source_surface?: string;
    partner_automation_trigger?: boolean; external_delivery_execution?: boolean};
};
const baseBlueprints = (): Blueprint[] => [
  {
    blueprint_id:'pw-plan-execution-01',workflow_domain:'execution',blueprint_type:'human_operated_triage_flow',
    source_action_domain:'execution',source_title:'Synthetic packing task',source_summary:'Packing task is blocked',
    viewer_can_act:true,updated_at:timestamp,
    responsibility:{assignment_state:'assigned',assignee_name:'Synthetic worker',is_current_user:true},
    trigger_preview:{trigger_reference:'pw-task-100',trigger_status:'blocked',trigger_urgency:'critical',trigger_source:'execution_task'},
    escalation_policy_preview:{urgency:'critical',escalate_when_blocked:true},
    recommended_steps_preview:['review_source_context','assign_human_owner','capture_required_approval','execute_existing_governed_source_workflow','record_outcome_in_source_system'],
    approval_chain_preview:['source_owner_review','governance_reviewer_approval'],
    location_context:{from_location_name:'Store A',to_location_name:'Store B'},
    deadline_context:{due_state:'overdue',effective_due_at:timestamp}
  },
  {
    blueprint_id:'pw-plan-alert-02',workflow_domain:'alerts',blueprint_type:'human_operated_triage_flow',
    source_action_domain:'alerts',source_title:'Synthetic cold room warning',source_summary:'Temperature issue in cold room',
    responsibility:{assignment_state:'unassigned'},viewer_can_act:false,
    trigger_preview:{trigger_reference:'pw-alert-200',trigger_status:'open',trigger_urgency:'high'},
    escalation_policy_preview:{urgency:'high'},
    recommended_steps_preview:['review_source_context','assign_human_owner'],approval_chain_preview:[],
    deadline_context:{due_state:'none'}
  },
  {
    blueprint_id:'pw-plan-integration-03',workflow_domain:'external_partner',blueprint_type:'external_workflow_visibility_contract',
    source_title:'Synthetic carrier integration',source_summary:'Partner connection requires governance',
    viewer_can_act:false,responsibility:{assignment_state:'source_workflow'},
    trigger_preview:{trigger_reference:'contract:pw-carrier-3',contract_status:'active',trigger_urgency:'medium',event_trigger_only_preview:true},
    escalation_policy_preview:{urgency:'medium'},
    integration_routing_preview:{external_workflow_eligible:true,route_to_source_surface:'/system-context',partner_automation_trigger:false,external_delivery_execution:false},
    recommended_steps_preview:['review_contract_governance_policy','assign_human_owner','verify_permission_policy'],
    approval_chain_preview:['integration_owner_review']
  },
  {
    blueprint_id:'pw-plan-intelligence-04',workflow_domain:'decision_intelligence',blueprint_type:'approval_gated_review_flow',
    source_action_domain:'decision_intelligence',source_action_id:'pw-action-400',
    source_title:'Synthetic intelligence review',source_summary:'Evidence review required',
    viewer_can_act:true,responsibility:{responsible_role:'decision_intelligence_reviewer',assignment_state:'assigned'},
    trigger_preview:{trigger_reference:'pw-review-400',trigger_status:'pending',trigger_urgency:'low'},
    escalation_policy_preview:{urgency:'low'},recommended_steps_preview:['review_source_context','capture_required_approval'],
    approval_chain_preview:['source_owner_review','governance_reviewer_approval']
  }
];
const available = ['execution','reservation','procurement','fulfillment','replenishment','transfer','alerts','control_tower','decision_intelligence','ai_governance','supplier','carrier','external_partner','multi_domain'];
function composerPayload(blueprints: Blueprint[] = baseBlueprints(), domains: string[] = available) {
  return {
    generated_at:timestamp,non_mutation_guarantee:true,
    definition:{execution_mode:'read_only_workflow_blueprint_composition', safety_contract:{human_action_only:true,permission_gated:true}},
    access:{available_workflow_domains:domains,can_view_diagnostics:true},
    summary:{total_blueprints:blueprints.length,approval_chain_blueprints:2,integration_routing_blueprints:1},
    guidance:{next_blueprint_id:'pw-plan-execution-01',composer_guidance:'Synthetic plan guidance',
      approval_chain_guidance:'Synthetic approval guidance',event_trigger_guidance:'Synthetic event review',
      integration_routing_guidance:'Synthetic integration warning'},
    blueprints
  };
}
async function mockComposer(page: Page, plans = baseBlueprints(), domains = available) {
  await page.route(workflowEndpoint,route=>{
    if(route.request().method()!=='GET') return route.abort();
    return fulfillJson(route,composerPayload(plans,domains));
  });
}
const cards = (page: Page) => page.locator('.workflow-composer-page__blueprint-card');
const card = (page: Page, title: string) => cards(page).filter({has:page.getByRole('heading',{name:title})});
async function openComposer(page: Page) {
  await loginAsTenant(page);
  await mockComposer(page);
  await page.goto('/workflow-composer');
  await expect(page.locator('.workflow-composer-page')).toBeVisible();
  await expect(cards(page)).toHaveCount(4);
}
async function showGuidance(page: Page, title: string) {
  const target = card(page,title);
  await target.locator('.workflow-composer-page__guidance-details summary').click();
  await expect(target.locator('.workflow-composer-page__guidance-details')).toHaveAttribute('open','');
  return target;
}

test.describe('Workflow Composer — human-owned plans, filters and safe source links',() => {
  test.beforeEach(async ({page})=>{await openComposer(page);});

  test('TWFC-001 page identifies workflow guidance as read-only and source-owned',async ({page}) => {
    await expect(page.getByRole('heading',{name:'Workflow Composer',level:1})).toBeVisible();
    await expect(page.locator('.workflow-composer-page')).toContainText('Nothing is published, automated, or executed from this page.');
    await expect(page.getByText('Review a suggested plan, then open its source page and use only the actions available to your role. Nothing is published or executed here.')).toBeVisible();
  });

  test('TWFC-002 overview renders backend total, approvals and integration counts',async ({page}) => {
    const overview=page.getByLabel('Workflow Composer overview');
    await expect(overview).toContainText('Plans shown');
    await expect(overview).toContainText('Multi-step approval plans');
    await expect(overview).toContainText('External integration plans');
    await expect(overview).toContainText('4');
    await expect(overview).toContainText('2');
    await expect(overview).toContainText('1');
  });

  test('TWFC-003 high urgency counter is computed from blueprint escalation urgency',async ({page}) => {
    const high=page.getByLabel('Workflow Composer overview').locator('.io-workspace-stat').filter({hasText:'High-urgency plans'});
    await expect(high.locator('.io-workspace-stat__value')).toHaveText('2');
    await expect(high).toHaveAttribute('data-tone','warn');
  });

  test('TWFC-004 refresh obtains a 75-limit summary by GET with no mutation',async ({page}) => {
    const methods:string[]=[];let query:URL|undefined;
    await page.route(workflowEndpoint,route=>{
      methods.push(route.request().method());query=new URL(route.request().url());
      return fulfillJson(route,composerPayload());
    });
    await page.getByRole('button',{name:'Refresh plans'}).click();
    await expect.poll(()=>methods.length).toBeGreaterThan(0);
    expect(query?.searchParams.get('limit')).toBe('75');
    expect(methods).toEqual(['GET']);
  });

  test('TWFC-005 work-area filter sends domain to backend',async ({page}) => {
    let domain:string|null=null;
    await page.route(workflowEndpoint,route=>{
      domain=new URL(route.request().url()).searchParams.get('workflow_domain');
      return fulfillJson(route,composerPayload());
    });
    await page.getByLabel('Work area').selectOption('execution');
    await expect.poll(()=>domain).toBe('execution');
    await expect(page.getByLabel('Work area')).toHaveValue('execution');
  });

  test('TWFC-006 urgency filter submits selected level to summary endpoint',async ({page}) => {
    let value:string|null=null;
    await page.route(workflowEndpoint,route=>{
      value=new URL(route.request().url()).searchParams.get('urgency');return fulfillJson(route,composerPayload());
    });
    await page.getByLabel('Urgency').selectOption('high');
    await expect.poll(()=>value).toBe('high');
    await expect(page.getByLabel('Urgency')).toHaveValue('high');
  });

  test('TWFC-007 responsibility filter sends mine to backend',async ({page}) => {
    let requested:string|null=null;
    await page.route(workflowEndpoint,route=>{
      requested=new URL(route.request().url()).searchParams.get('responsibility');return fulfillJson(route,composerPayload());
    });
    await page.getByLabel('Responsibility').selectOption('mine');
    await expect.poll(()=>requested).toBe('mine');
  });

  test('TWFC-008 combined selection sends three independent filters to backend',async ({page}) => {
    let requested:URL|undefined;
    await page.route(workflowEndpoint,route=>{
      requested=new URL(route.request().url());return fulfillJson(route,composerPayload());
    });
    await page.getByLabel('Work area').selectOption('execution');
    await page.getByLabel('Urgency').selectOption('critical');
    await page.getByLabel('Responsibility').selectOption('actionable');
    await expect.poll(()=>requested?.searchParams.get('responsibility')).toBe('actionable');
    expect(requested?.searchParams.get('workflow_domain')).toBe('execution');
    expect(requested?.searchParams.get('urgency')).toBe('critical');
  });

  test('TWFC-009 choosing All resets optional filter query parameter',async ({page}) => {
    const queries:URL[]=[];
    await page.route(workflowEndpoint,route=>{
      queries.push(new URL(route.request().url()));return fulfillJson(route,composerPayload());
    });
    await page.getByLabel('Urgency').selectOption('medium');
    await expect.poll(()=>queries.at(-1)?.searchParams.get('urgency')).toBe('medium');
    await page.getByLabel('Urgency').selectOption('all');
    await expect.poll(()=>queries.length).toBeGreaterThan(1);
    await expect.poll(()=>queries.at(-1)?.searchParams.has('urgency')).toBe(false);
  });

  test('TWFC-010 backend permitted domains determine allowed Work area values',async ({page}) => {
    await mockComposer(page,baseBlueprints(),['execution','alerts']);
    await page.reload();
    const options=page.getByLabel('Work area').locator('option');
    await expect(options).toHaveCount(3);
    const values=await options.evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));
    expect(values).toEqual(['all','execution','alerts']);
  });

  test('TWFC-011 assigned-to-me filter restricts domain choices to ownership-capable areas',async ({page}) => {
    await page.getByLabel('Responsibility').selectOption('mine');
    const values=await page.getByLabel('Work area').locator('option').evaluateAll(nodes=>nodes.map(n=>(n as HTMLOptionElement).value));
    expect(values).toContain('execution');
    expect(values).toContain('reservation');
    expect(values).not.toContain('alerts');
    expect(values).not.toContain('external_partner');
  });

  test('TWFC-012 unassigned filter restricts domains but actionable filter restores options',async ({page}) => {
    await page.getByLabel('Responsibility').selectOption('unassigned');
    await expect(page.getByLabel('Work area').locator('option[value="alerts"]')).toHaveCount(0);
    await page.getByLabel('Responsibility').selectOption('actionable');
    await expect(page.getByLabel('Work area').locator('option[value="alerts"]')).toHaveCount(1);
  });

  test('TWFC-013 changing responsibility clears an incompatible selected domain',async ({page}) => {
    await page.getByLabel('Work area').selectOption('alerts');
    await page.getByLabel('Responsibility').selectOption('mine');
    await expect(page.getByLabel('Work area')).toHaveValue('all');
    await expect(page.getByLabel('Work area').locator('option[value="alerts"]')).toHaveCount(0);
  });

  test('TWFC-014 selected filters are local controls and do not rewrite URL',async ({page}) => {
    await page.getByLabel('Urgency').selectOption('critical');
    await page.getByLabel('Responsibility').selectOption('actionable');
    await expect(page).toHaveURL(/\/workflow-composer$/);
    await page.reload();
    await expect(page.getByLabel('Urgency')).toHaveValue('all');
    await expect(page.getByLabel('Responsibility')).toHaveValue('all');
  });

  test('TWFC-015 assigned worker is identified as current user and is not reassigned',async ({page}) => {
    const target=card(page,'Synthetic packing task');
    await expect(target).toContainText('Synthetic worker (You)');
    await showGuidance(page,'Synthetic packing task');
    await expect(target.getByText('Choose the person responsible for the work')).toHaveCount(0);
  });

  test('TWFC-016 unassigned alert shows ownership required in guidance',async ({page}) => {
    const target=await showGuidance(page,'Synthetic cold room warning');
    await expect(target).toContainText('Unassigned');
    await expect(target.getByText('Choose the person responsible for the work')).toBeVisible();
  });

  test('TWFC-017 blocked assigned execution task recommends reviewing existing blocker',async ({page}) => {
    const target=card(page,'Synthetic packing task');
    await expect(target).toContainText('This task already has an owner. Review its blocker in Execution Tasks before resuming.');
  });

  test('TWFC-018 blocked unassigned execution task has separate ownership guidance',async ({page}) => {
    await mockComposer(page,[{...baseBlueprints()[0],blueprint_id:'pw-unassigned-exec',
      responsibility:{assignment_state:'unassigned'}}]);
    await page.reload();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page)).toContainText('This task is blocked and unassigned. Review the blocker and ownership in Execution Tasks.');
  });

  test('TWFC-019 in-progress execution task with no owner recommends taking responsibility',async ({page}) => {
    await mockComposer(page,[{...baseBlueprints()[0],blueprint_id:'pw-inprogress-exec',
      trigger_preview:{trigger_reference:'pw-task-100',trigger_status:'in_progress'},
      responsibility:{assignment_state:'pending'}}]);
    await page.reload();
    await expect(cards(page)).toContainText('This task is in progress without an owner. An authorized worker can take responsibility in Execution Tasks.');
  });

  test('TWFC-020 completed source presents closed guidance and no further execution steps',async ({page}) => {
    await mockComposer(page,[{...baseBlueprints()[0],blueprint_id:'pw-completed-exec',
      trigger_preview:{trigger_reference:'pw-task-100',trigger_status:'completed'}}]);
    await page.reload();
    const target=await showGuidance(page,'Synthetic packing task');
    await expect(target).toContainText('This source work is already closed. Review its recorded result; no new execution is suggested.');
    await expect(target).toContainText('The source workflow is closed; no further action steps are suggested.');
    await expect(target.getByText('Complete the work through its normal controlled page')).toHaveCount(0);
  });

  test('TWFC-021 provisional offered assignment keeps assign-owner step available',async ({page}) => {
    await mockComposer(page,[{...baseBlueprints()[0],blueprint_id:'pw-offered-exec',
      responsibility:{assignment_state:'offered'}}]);
    await page.reload();
    const target=await showGuidance(page,'Synthetic packing task');
    await expect(target.getByText('Choose the person responsible for the work')).toBeVisible();
  });

  test('TWFC-022 source-managed owner suppresses duplicate assignment suggestion',async ({page}) => {
    const target=await showGuidance(page,'Synthetic carrier integration');
    await expect(target.getByText('Choose the person responsible for the work')).toHaveCount(0);
    await expect(target).toContainText('Managed in source workflow');
  });

  test('TWFC-023 approved task removes redundant approval step but retains execution',async ({page}) => {
    await mockComposer(page,[{...baseBlueprints()[0],blueprint_id:'pw-approved-exec',
      trigger_preview:{trigger_reference:'pw-task-100',trigger_status:'approved'}}]);
    await page.reload();
    const target=await showGuidance(page,'Synthetic packing task');
    await expect(target.getByText('Record the required human approval')).toHaveCount(0);
    await expect(target.getByText('Complete the work through its normal controlled page')).toBeVisible();
    await expect(target.getByText('Record the result in the original workflow')).toBeVisible();
  });

  test('TWFC-024 transfer plan displays from and to location instead of ambiguous place',async ({page}) => {
    await expect(card(page,'Synthetic packing task')).toContainText('From Store A → To Store B');
  });

  test('TWFC-025 overdue deadline carries danger styling and overdue status',async ({page}) => {
    const target=card(page,'Synthetic packing task');
    await expect(target.locator('.workflow-composer-page__context-item--danger')).toContainText('Overdue');
  });

  test('TWFC-026 unspecified deadline is explicitly shown as No deadline',async ({page}) => {
    await expect(card(page,'Synthetic cold room warning')).toContainText('No deadline');
  });

  test('TWFC-027 source action access is distinguished from view-only plans',async ({page}) => {
    await expect(card(page,'Synthetic packing task')).toContainText('Source actions available to your role');
    await expect(card(page,'Synthetic cold room warning')).toContainText('View-only source access');
  });

  test('TWFC-028 multiple same-title plans show distinguishing reference or plan number',async ({page}) => {
    const original=baseBlueprints()[0];
    await mockComposer(page,[original,{...original,blueprint_id:'pw-plan-execution-duplicate',
      trigger_preview:{trigger_status:'blocked'}}]);
    await page.reload();
    await expect(cards(page)).toHaveCount(2);
    await expect(page.locator('.workflow-composer-page__short-reference')).toHaveCount(2);
    await expect(page.locator('.workflow-composer-page__short-reference').first()).toContainText('Reference');
    await expect(page.locator('.workflow-composer-page__short-reference').last()).toContainText('Plan number');
  });

  test('TWFC-029 plan type distinguishes human triage, approval and external preview',async ({page}) => {
    await expect(card(page,'Synthetic packing task')).toContainText('Human review plan');
    await expect(card(page,'Synthetic intelligence review')).toContainText('Approval-required plan');
    await expect(card(page,'Synthetic carrier integration')).toContainText('External integration plan');
  });

  test('TWFC-030 alert source link preserves exact unresolved alert id',async ({page}) => {
    await expect(card(page,'Synthetic cold room warning').getByRole('link',{name:'Open alert'}))
      .toHaveAttribute('href','/alerts?resolved=false&alert_id=pw-alert-200');
  });

  test('TWFC-031 execution source link opens matching task not generic task list',async ({page}) => {
    await expect(card(page,'Synthetic packing task').getByRole('link',{name:'Open execution task'}))
      .toHaveAttribute('href','/execution-tasks?task_id=pw-task-100');
  });

  test('TWFC-032 intelligence source link carries original action reference',async ({page}) => {
    await expect(card(page,'Synthetic intelligence review').getByRole('link',{name:'Open review'}))
      .toHaveAttribute('href','/intelligence-review?source_action_id=pw-action-400');
  });

  test('TWFC-033 unavailable integration page shows non-actionable fallback',async ({page}) => {
    const plan=baseBlueprints()[2];
    await mockComposer(page,[{...plan,integration_routing_preview:{external_workflow_eligible:true,route_to_source_surface:'https://partner.example.invalid'}}]);
    await page.reload();
    await expect(cards(page).getByRole('link',{name:'Open source page'})).toHaveCount(0);
    await expect(cards(page)).toContainText('No tenant working page is currently available for this integration plan.');
  });

  test('TWFC-034 explicitly whitelisted source page offers safe internal navigation',async ({page}) => {
    await mockComposer(page,[{...baseBlueprints()[2],integration_routing_preview:{external_workflow_eligible:true,
      route_to_source_surface:'/automation-schedules'}}]);
    await page.reload();
    await expect(cards(page).getByRole('link',{name:'Open source page'}))
      .toHaveAttribute('href','/automation-schedules');
  });

  test('TWFC-035 integration guidance emphasizes human governance and never executes a partner',async ({page}) => {
    const target=await showGuidance(page,'Synthetic carrier integration');
    await expect(target).toContainText('This is an external integration visibility plan. It still requires manual governance and does not run the partner workflow.');
    await expect(target.getByRole('button',{name:/Run|Execute|Publish/i})).toHaveCount(0);
  });

  test('TWFC-036 multi-person approval chain displays each recommended human review',async ({page}) => {
    const target=await showGuidance(page,'Synthetic packing task');
    await expect(target).toContainText('Additional review or approval suggested');
    await expect(target).toContainText('Source work owner reviews this follow-up');
    await expect(target).toContainText('Governance reviewer approval is suggested');
  });

  test('TWFC-037 no extra approval step produces explicit no-approval explanation',async ({page}) => {
    const target=await showGuidance(page,'Synthetic cold room warning');
    await expect(target).toContainText('No separate approval step is suggested.');
  });

  test('TWFC-038 technical plan details show identifiers only when diagnostic access is enabled',async ({page}) => {
    const target=card(page,'Synthetic packing task');
    await target.locator('.workflow-composer-page__details summary').click();
    await expect(target.locator('.workflow-composer-page__details')).toContainText('pw-plan-execution-01');
    await expect(target.locator('.workflow-composer-page__details')).toContainText('pw-task-100');
    await expect(target.getByText('Trigger preview only')).toBeVisible();
  });

  test('TWFC-039 explicit backend diagnostics denial hides technical plan identifiers',async ({page}) => {
    await page.route(workflowEndpoint,route=>fulfillJson(route,{
      ...composerPayload(),access:{available_workflow_domains:available,can_view_diagnostics:false}
    }));
    await page.reload();
    await expect(cards(page)).toHaveCount(4);
    await expect(page.locator('.workflow-composer-page__details')).toHaveCount(0);
    await expect(card(page,'Synthetic packing task')).not.toContainText('pw-plan-execution-01');
  });

  test('TWFC-040 Copy ID writes the displayed plan ID to clipboard',async ({page}) => {
    await page.evaluate(() => {
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
        writeText:async (text:string) => { (window as Window & {__pwCopiedId?:string}).__pwCopiedId=text; }
      }});
    });
    const target=card(page,'Synthetic packing task');
    await target.locator('.workflow-composer-page__details summary').click();
    const row=target.locator('.workflow-composer-page__technical-id-row').filter({has:page.getByText('Plan ID',{exact:true})});
    await expect(row.locator('code')).toHaveText('pw-plan-execution-01');
    await row.getByRole('button',{name:'Copy ID'}).click();
    await expect.poll(()=>page.evaluate(()=>(window as Window & {__pwCopiedId?:string}).__pwCopiedId)).toBe('pw-plan-execution-01');
  });

  test('TWFC-041 absent source-action identifier has no Copy ID action in that row',async ({page}) => {
    const target=card(page,'Synthetic packing task');
    await target.locator('.workflow-composer-page__details summary').click();
    const row=target.locator('.workflow-composer-page__technical-id-row').filter({has:page.getByText('Source action ID',{exact:true})});
    await expect(row.locator('code')).toHaveText('Not reported');
    await expect(row.getByRole('button',{name:'Copy ID'})).toHaveCount(0);
  });

  test('TWFC-042 no returned blueprints displays explicit empty plan state',async ({page}) => {
    await mockComposer(page,[]);
    await page.reload();
    await expect(cards(page)).toHaveCount(0);
    await expect(page.getByText('No matching plans')).toBeVisible();
    await expect(page.getByText('No suggested workflow plan matched the selected work area, urgency, and responsibility filter.')).toBeVisible();
  });

  test('TWFC-043 initial failed summary fetch exposes retry without fake plans',async ({page}) => {
    await page.route(workflowEndpoint,route=>fulfillJson(route,{message:'Synthetic composer unavailable'},503));
    await page.reload();
    await expect(page.getByText('Workflow plans could not be loaded')).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
    await mockComposer(page);
    await page.getByRole('button',{name:'Try again'}).click();
    await expect(cards(page)).toHaveCount(4);
  });

  test('TWFC-044 failed refresh preserves the last plan snapshot and warns it may be stale',async ({page}) => {
    await page.route(workflowEndpoint,route=>fulfillJson(route,{message:'Synthetic refresh failure'},503));
    await page.getByRole('button',{name:'Refresh plans'}).click();
    await expect(page.getByText('Refresh failed')).toBeVisible();
    await expect(page.getByText(/Showing the last available Workflow Composer snapshot/)).toBeVisible();
    await expect(cards(page)).toHaveCount(4);
  });

  test('TWFC-045 pending first summary shows loading explanation before any plan',async ({page}) => {
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route(workflowEndpoint,async route=>{await gate;await fulfillJson(route,composerPayload());});
    try {
      await page.reload({waitUntil:'domcontentloaded'});
      await expect(page.getByText('Loading workflow plans')).toBeVisible();
      await expect(cards(page)).toHaveCount(0);
    } finally {release();}
    await expect(cards(page)).toHaveCount(4);
  });

  test('TWFC-046 Refresh plans is disabled during a pending GET and enabled after it settles',async ({page}) => {
    let release!:()=>void;
    const gate=new Promise<void>(resolve=>{release=resolve;});
    await page.route(workflowEndpoint,async route=>{await gate;await fulfillJson(route,composerPayload());});
    try {
      await page.getByRole('button',{name:'Refresh plans'}).click();
      await expect(page.getByRole('button',{name:'Refreshing…'})).toBeDisabled();
    } finally {release();}
    await expect(page.getByRole('button',{name:'Refresh plans'})).toBeEnabled();
  });

  test('TWFC-047 absent summary guidance renders clear read-only fallback instructions',async ({page}) => {
    await page.route(workflowEndpoint,route=>fulfillJson(route,{...composerPayload(),guidance:{}}));
    await page.reload();
    const guidance=page.locator('.workflow-composer-page__guidance-grid');
    await expect(guidance).toContainText('Choose a plan and open its source page.');
    await expect(guidance).toContainText('Approval steps are suggestions and do not approve work.');
    await expect(guidance).toContainText('Trigger information is for review only.');
    await expect(guidance).toContainText('External integrations are not run from this page.');
  });

  test('TWFC-048 guidance points to the matching backend-selected plan title',async ({page}) => {
    await page.route(workflowEndpoint,route=>fulfillJson(route,{
      ...composerPayload(),guidance:{...composerPayload().guidance,next_blueprint_id:'pw-plan-alert-02'}
    }));
    await page.reload();
    await expect(page.locator('.workflow-composer-page__guidance-grid').first()).toContainText('Synthetic cold room warning');
    await expect(card(page,'Synthetic cold room warning')).toBeVisible();
  });

  test('TWFC-049 plain-language safety controls remain visible without technical safety details',async ({page}) => {
    await page.route(workflowEndpoint,route=>fulfillJson(route,{
      ...composerPayload(),access:{available_workflow_domains:available,can_view_diagnostics:false}
    }));
    await page.reload();
    await expect(page.getByText('Safety and control')).toBeVisible();
    await expect(page.locator('.workflow-composer-page__safety-card')).not.toHaveCount(0);
    await expect(page.locator('.workflow-composer-page__technical-safety')).toHaveCount(0);
  });

  test('TWFC-050 reading guidance and refreshing does not submit any operational mutation',async ({page}) => {
    const writes:string[]=[];
    page.on('request',req=>{if(req.method()!=='GET'&&req.method()!=='HEAD'&&req.url().includes('/operational-action-center/'))writes.push(`${req.method()} ${req.url()}`);});
    await showGuidance(page,'Synthetic packing task');
    await page.getByRole('button',{name:'Refresh plans'}).click();
    await expect(cards(page)).toHaveCount(4);
    expect(writes).toEqual([]);
  });

  test('TWFC-051 alert without record reference uses a safe unresolved-alert search link',async ({page}) => {
    await mockComposer(page,[{...baseBlueprints()[1],trigger_preview:{trigger_status:'open',trigger_urgency:'high'}}]);
    await page.reload();
    const href=await cards(page).getByRole('link',{name:'Open alert'}).getAttribute('href');
    expect(href).not.toBeNull();
    const url=new URL(href!,'http://localhost');
    expect(url.pathname).toBe('/alerts');
    expect(url.searchParams.get('resolved')).toBe('false');
    expect(url.searchParams.get('search')).toBe('Temperature issue in cold room');
    expect(url.searchParams.has('alert_id')).toBe(false);
  });

  test('TWFC-052 untrusted external or unknown integration source surfaces never become links',async ({page}) => {
    const original=baseBlueprints()[2];
    await mockComposer(page,[
      {...original,blueprint_id:'pw-unsafe-external',source_title:'Synthetic external unsafe',integration_routing_preview:{external_workflow_eligible:true,route_to_source_surface:'https://external.invalid/run'}},
      {...original,blueprint_id:'pw-unsafe-internal',source_title:'Synthetic unknown internal',integration_routing_preview:{external_workflow_eligible:true,route_to_source_surface:'/platform/users'}},
      {...original,blueprint_id:'pw-unsafe-query',source_title:'Synthetic query source',integration_routing_preview:{external_workflow_eligible:true,route_to_source_surface:'/alerts?clear=true'}}
    ]);
    await page.reload();
    await expect(cards(page)).toHaveCount(3);
    await expect(cards(page).getByRole('link',{name:'Open source page'})).toHaveCount(0);
    await expect(cards(page).getByText('No tenant working page is currently available for this integration plan.')).toHaveCount(3);
  });
});
