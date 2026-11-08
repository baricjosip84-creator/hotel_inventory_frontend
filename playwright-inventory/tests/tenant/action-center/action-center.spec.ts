import { test, expect, type Page, type Route } from '../../../support/liveOriginalSafeTest';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 6 — GENERATED_UNRUN. Source:
// frontend/src/pages/OperationalActionCenterPage.tsx, lib/useRouteQueryState.ts,
// backend/src/routes/operationalActionCenter.js and
// backend/src/validations/operationalActionCenter.validation.js.
// Synthetic, read-only API fixture; any non-GET API calls in the Action Center namespace are aborted.
const actionRows = [
  { action_id:'pw-action-alert', action_domain:'alerts', action_type:'investigate', action_status:'open', urgency:'critical',
    priority_score:95, title:'Synthetic low-stock signal', summary:'Inspect shelf R-1', source_type:'alert', source_id:'pw-alert-123',
    alert_severity:'info', recommended_next_step:'Inspect the linked alert', updated_at:'2026-10-10T12:00:00.000Z',
    explainability:{ primary_factors:['unresolved_alert','severity:info'], source_surface:'/alerts' } },
  { action_id:'pw-action-exec', action_domain:'execution', action_type:'task', action_status:'pending', urgency:'high',
    priority_score:75, title:'Synthetic execution task', summary:'Review task evidence', source_type:'execution_task', source_id:'pw-task-123',
    execution_task_status:'pending', execution_task_priority:'high', recommended_next_step:'Check task evidence',
    escalation_assignment:{ target_role:'manager', due_at:'2026-11-01T12:00:00.000Z', overdue:true },
    explainability:{ primary_factors:['status:pending','priority:high'], source_surface:'/execution-tasks' } },
  { action_id:'pw-action-control', action_domain:'control_tower', action_type:'control_tower', action_status:'open', urgency:'medium',
    priority_score:48, title:'Synthetic control tower check', summary:'Review reliability posture', source_type:'control_tower',
    explainability:{ source_surface:'/control-tower', primary_factors:['sla_due_at_absent'] } },
  { action_id:'pw-action-ai', action_domain:'decision_intelligence', action_type:'decision', action_status:'approval_required', urgency:'low',
    priority_score:24, title:'Synthetic intelligence review', summary:'Validate source evidence', source_type:'decision_review',
    approval_required:true, explainability:{ source_surface:'/intelligence-review', primary_factors:['task_source:manual'] } },
  { action_id:'pw-action-unsafe', action_domain:'execution', action_type:'governance', action_status:'pending', urgency:'low',
    priority_score:7, title:'Synthetic external-path check', summary:'No external navigation allowed', source_type:'external',
    explainability:{ source_surface:'https://invalid.example/unsafe', primary_factors:[] } }
];
const diagnosticsKeys = [
  'control_tower_orchestration_traceability','control_tower_remediation_feedback_loop',
  'control_tower_remediation_effectiveness_review','control_tower_remediation_escalation_governance',
  'control_tower_remediation_closure_verification_gate','control_tower_remediation_response_contract_audit',
  'control_tower_route_exposure_audit'
];
const actionFixture = {
  definition:{ execution_mode:'read_only_action_aggregation_human_operated', safety_contract:{ read_only:true, tenant_isolated:true } },
  summary:{ total_actions:5, by_urgency:{critical:1,high:1,medium:1,low:2}, by_domain:{alerts:1,execution:1,control_tower:1,decision_intelligence:1,ai_governance:1}, approval_required_count:1,highest_urgency:'critical' },
  readiness_scope:{ assessment_available:true, bounded_per_source_limit:50, permission_scoped:false },
  control_tower_orchestration_traceability:{ traceability_score:82,traceability_posture:'ready',control_tower_action_count:1,blockers:[] },
  control_tower_remediation_feedback_loop:{ feedback_score:75,feedback_posture:'review',remediation_action_count:1,blocked_action_count:0,blockers:[] },
  control_tower_remediation_effectiveness_review:{ effectiveness_score:70,effectiveness_posture:'review',review_ready_action_count:1,blockers:[] },
  control_tower_remediation_escalation_governance:{ escalation_score:80,escalation_posture:'ready',escalation_candidate_count:1,blockers:[] },
  control_tower_remediation_closure_verification_gate:{ closure_score:90,closure_posture:'ready',closure_candidate_count:1,blockers:[] },
  control_tower_remediation_response_contract_audit:{ audit_score:100,audit_posture:'ready',contract_coverage_score:100,missing_contract_keys:[],blockers:[] },
  control_tower_route_exposure_audit:{ route_path:'/operational-action-center/summary',http_method:'GET',required_permission:'operational_action_center.read',
    frontend_rendered_panels:diagnosticsKeys,missing_frontend_panels:[],route_exposure_score:100,route_exposure_posture:'ready',blockers:[] },
  actions:actionRows, non_mutation_guarantee:true, generated_at:'2026-10-10T12:00:00.000Z'
};

function filteredFixture(url: URL, rows = actionRows) {
  const params = url.searchParams;
  const actionId = params.get('source_action_id');
  const filtered = actionId ? rows.filter(item => item.action_id === actionId) : rows.filter(item =>
    (!params.has('action_domain') || item.action_domain === params.get('action_domain')) &&
    (!params.has('urgency') || item.urgency === params.get('urgency')));
  const actions = filtered.slice(0, Number(params.get('limit') || '50'));
  return { ...actionFixture, actions, summary:{ ...actionFixture.summary, total_actions:actions.length,
    highest_urgency:actions[0]?.urgency || null, approval_required_count:actions.filter(row => row.approval_required).length } };
}
async function fixtureActionCenter(page: Page, rows = actionRows) {
  await page.route('**/operational-action-center/**', (route: Route) => {
    const url = new URL(route.request().url());
    if (route.request().method() !== 'GET' || !url.pathname.endsWith('/operational-action-center/summary')) return route.abort();
    return fulfillJson(route, filteredFixture(url, rows));
  });
}
async function openActionCenter(page: Page, url = '/action-center', rows = actionRows) {
  await loginAsTenant(page);
  await fixtureActionCenter(page, rows);
  await page.goto(url);
  await expect(page.getByRole('heading', { name:'Action Center' })).toBeVisible();
}
const actionCard = (page: Page, id: string) => page.locator(`#action-${id}`);
async function setActionPermissions(page: Page, permissions: string[]) {
  const original = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
  await page.route('**/permissions/me', route => fulfillJson(route, { ...original, scope:'tenant', permissions }));
  await page.reload();
  await expect(page.getByRole('heading', { name:'Action Center' })).toBeVisible();
}

test.describe('Action Center — summary, filters and deep-link routing', () => {
  test.beforeEach(async ({page}) => { await openActionCenter(page); });

  test('TACT-001 page announces read-only guidance and opens the action inbox', async ({page}) => {
    await expect(page.getByText('Read-only', { exact:true }).first()).toBeVisible();
    await expect(page.locator('.action-center-inbox-section')).toContainText('Action inbox');
    await expect(page.getByText('Guidance only; this page does not change source records')).toBeVisible();
  });

  test('TACT-002 four overview KPIs show returned action, urgency, approval and execution information', async ({page}) => {
    const summary = page.locator('section.io-workspace-stats');
    for (const title of ['Open actions shown','Highest urgency','Approval gated','Execution mode']) {
      await expect(summary.getByText(title, {exact:true})).toBeVisible();
    }
    await expect(summary.locator('.io-workspace-stat').filter({ hasText:'Open actions shown' })).toContainText('5');
    await expect(summary.locator('.io-workspace-stat').filter({ hasText:'Highest urgency' })).toContainText('Critical');
  });

  test('TACT-003 empty list shows no matching actions instead of invented records', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route, filteredFixture(new URL(route.request().url()), [])));
    await page.reload();
    await expect(page.getByText('No action-center items matched the selected filters.')).toBeVisible();
    await expect(page.locator('.action-center-action-card')).toHaveCount(0);
  });

  test('TACT-004 default API request is bounded to 50 and has no domain or urgency param', async ({page}) => {
    // Independently verify a fresh visible summary request using Refresh, without relying on timing of navigation.
    let query: URLSearchParams | undefined;
    await page.route('**/operational-action-center/summary?*', route => {
      query = new URL(route.request().url()).searchParams;
      return fulfillJson(route, filteredFixture(new URL(route.request().url())));
    });
    await page.getByRole('button', { name:'Refresh' }).click();
    await expect.poll(() => query?.get('limit')).toBe('50');
    expect(query?.has('action_domain')).toBe(false);
    expect(query?.has('urgency')).toBe(false);
  });

  test('TACT-005 changing domain filters action records and mirrors URL query', async ({page}) => {
    await page.getByRole('combobox', { name:'Filter by action domain' }).selectOption('alerts');
    await expect(page).toHaveURL(/domain=alerts/);
    await expect(actionCard(page,'pw-action-alert')).toBeVisible();
    await expect(actionCard(page,'pw-action-exec')).toHaveCount(0);
  });

  test('TACT-006 urgency filter drives API and limits the inbox to matching urgency', async ({page}) => {
    await page.getByRole('combobox', { name:'Filter by urgency' }).selectOption('high');
    await expect(page).toHaveURL(/urgency=high/);
    await expect(actionCard(page,'pw-action-exec')).toBeVisible();
    await expect(actionCard(page,'pw-action-alert')).toHaveCount(0);
  });

  test('TACT-007 combined domain and urgency filters yield the matching subset only', async ({page}) => {
    await page.getByRole('combobox', { name:'Filter by action domain' }).selectOption('execution');
    await page.getByRole('combobox', { name:'Filter by urgency' }).selectOption('high');
    await expect(actionCard(page,'pw-action-exec')).toBeVisible();
    await expect(page.locator('.action-center-action-card')).toHaveCount(1);
  });

  test('TACT-008 valid filter deep links restore both selected controls after navigation', async ({page}) => {
    await page.goto('/action-center?domain=alerts&urgency=critical');
    await expect(page.getByRole('combobox', { name:'Filter by action domain' })).toHaveValue('alerts');
    await expect(page.getByRole('combobox', { name:'Filter by urgency' })).toHaveValue('critical');
    await expect(actionCard(page,'pw-action-alert')).toBeVisible();
  });

  test('TACT-009 unknown query filter values fall back to all domains and urgency', async ({page}) => {
    await page.goto('/action-center?domain=unexpected&urgency=impossible');
    await expect(page.getByRole('combobox', { name:'Filter by action domain' })).toHaveValue('all');
    await expect(page.getByRole('combobox', { name:'Filter by urgency' })).toHaveValue('all');
    await expect(actionCard(page,'pw-action-alert')).toBeVisible();
  });

  test('TACT-010 Refresh repeats GET and keeps source records unchanged', async ({page}) => {
    let count = 0;
    await page.route('**/operational-action-center/summary?*', route => {
      count++;
      return fulfillJson(route, filteredFixture(new URL(route.request().url())));
    });
    await page.getByRole('button',{ name:'Refresh' }).click();
    await expect.poll(() => count).toBeGreaterThanOrEqual(1);
    await expect(actionCard(page,'pw-action-alert')).toBeVisible();
  });

  test('TACT-011 loading error exposes Try again and successful retry restores inbox', async ({page}) => {
    let requests = 0; let recovered = false;
    await page.route('**/operational-action-center/summary?*', route => {
      requests++;
      return recovered ? fulfillJson(route, filteredFixture(new URL(route.request().url())))
        : fulfillJson(route, { error:{ message:'Synthetic summary unavailable' } }, 503);
    });
    await page.reload();
    await expect(page.getByText('Action Center could not be loaded')).toBeVisible();
    recovered = true;
    await page.getByRole('button', { name:'Try again' }).click();
    await expect(actionCard(page,'pw-action-alert')).toBeVisible();
    expect(requests).toBeGreaterThanOrEqual(2);
  });

  test('TACT-012 persistent API error is visible without stale action cards', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route,
      { error:{ message:'Synthetic role-restricted failure' } }, 403));
    await page.reload();
    await expect(page.getByText('Action Center could not be loaded')).toBeVisible();
    await expect(page.getByText('Synthetic role-restricted failure')).toBeVisible();
    await expect(page.locator('.action-center-action-card')).toHaveCount(0);
  });

  test('TACT-013 focused action mode uses source_action_id and limit one rather than inbox filters', async ({page}) => {
    let query: URLSearchParams | undefined;
    await page.route('**/operational-action-center/summary?*', route => {
      query = new URL(route.request().url()).searchParams;
      return fulfillJson(route, filteredFixture(new URL(route.request().url())));
    });
    await page.goto('/action-center?source_action_id=pw-action-exec&domain=alerts&urgency=critical');
    await expect(actionCard(page,'pw-action-exec')).toBeVisible();
    await expect(page.getByText('Focused action view')).toBeVisible();
    await expect(page.getByRole('combobox', { name:'Filter by urgency' })).toHaveCount(0);
    expect(query?.get('source_action_id')).toBe('pw-action-exec');
    expect(query?.get('limit')).toBe('1');
    expect(query?.has('action_domain')).toBe(false);
  });

  test('TACT-014 existing focused action is outlined and acknowledged', async ({page}) => {
    await page.goto('/action-center?source_action_id=pw-action-alert');
    await expect(actionCard(page,'pw-action-alert')).toBeVisible();
    await expect(page.getByText('The requested action is highlighted below.')).toBeVisible();
    await expect(actionCard(page,'pw-action-alert')).toHaveCSS('outline-style','solid');
  });

  test('TACT-015 missing focused action reports no longer pending without inventing details', async ({page}) => {
    await page.goto('/action-center?source_action_id=pw-no-such-action');
    await expect(page.getByText('The requested action is not available to your role or is no longer pending.')).toBeVisible();
    await expect(page.locator('.action-center-action-card')).toHaveCount(0);
  });

  test('TACT-016 alert actions route to the exact alert ID', async ({page}) => {
    await expect(actionCard(page,'pw-action-alert').getByRole('link', {name:'Open alert workflow'}))
      .toHaveAttribute('href','/alerts?alert_id=pw-alert-123');
  });

  test('TACT-017 execution actions route to their task identity', async ({page}) => {
    await expect(actionCard(page,'pw-action-exec').getByRole('link', {name:'Open execution task'}))
      .toHaveAttribute('href','/execution-tasks?task_id=pw-task-123');
  });

  test('TACT-018 decision review actions route to intelligence review with source ID', async ({page}) => {
    await expect(actionCard(page,'pw-action-ai').getByRole('link', {name:'Open intelligence review'}))
      .toHaveAttribute('href','/intelligence-review?source_action_id=pw-action-ai');
  });

  test('TACT-019 control tower source surface routes only to approved internal workflow', async ({page}) => {
    await expect(actionCard(page,'pw-action-control').getByRole('link', {name:'Open source workflow'}))
      .toHaveAttribute('href','/reliability-command');
  });

  test('TACT-020 arbitrary external source URL is not rendered as source-workflow link', async ({page}) => {
    await expect(actionCard(page,'pw-action-unsafe').getByRole('link')).toHaveCount(0);
    await expect(actionCard(page,'pw-action-unsafe')).toContainText('No external navigation allowed');
  });

  test('TACT-021 alert urgency and alert severity are independently labeled', async ({page}) => {
    const card = actionCard(page,'pw-action-alert');
    await expect(card).toContainText('Action urgency: Critical');
    await expect(card).toContainText('Alert severity: Info');
    await expect(card).toContainText('alert severity describes the alert itself');
  });

  test('TACT-022 source-authored recommendation is shown without auto-execution control', async ({page}) => {
    await expect(actionCard(page,'pw-action-exec')).toContainText('Check task evidence');
    await expect(actionCard(page,'pw-action-exec').getByRole('button')).toHaveCount(0);
  });

  test('TACT-023 escalation assignment displays owner, due time and overdue status', async ({page}) => {
    const card = actionCard(page,'pw-action-exec');
    await expect(card).toContainText('Escalated to:');
    await expect(card).toContainText('Overdue');
    await expect(card).toContainText('Due:');
  });

  test('TACT-024 diagnostics access reveals technical details and expanded evidence', async ({page}) => {
    const card = actionCard(page,'pw-action-alert');
    const panel = card.locator('details.action-center-technical-details');
    await expect(panel).toBeVisible();
    await panel.locator('summary').first().click();
    await expect(panel.getByText('Ranking score:')).toBeVisible();
    await expect(panel).toContainText('Alert severity: Info');
  });

  test('TACT-025 restricted domain permissions remove unauthorized filter options', async ({page}) => {
    await setActionPermissions(page, ['operational_action_center.read','alerts.read']);
    const domain = page.getByRole('combobox', { name:'Filter by action domain' });
    await expect(domain.locator('option[value="all"]')).toHaveCount(1);
    await expect(domain.locator('option[value="alerts"]')).toHaveCount(1);
    await expect(domain.locator('option[value="execution"]')).toHaveCount(0);
    await expect(domain.locator('option[value="decision_intelligence"]')).toHaveCount(0);
    await expect(page.locator('details.action-center-technical-details')).toHaveCount(0);
  });

  test('TACT-026 Governance readiness disclosure tracks open state in URL and restores it', async ({page}) => {
    const details = page.locator('#action-center-governance-readiness');
    await expect(details).not.toHaveAttribute('open','');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open','');
    await expect(page).toHaveURL(/expanded_sections=governance/);
    await page.reload();
    await expect(details).toHaveAttribute('open','');
  });

  test('TACT-027 unavailable readiness reports scoped assessment, not zero health', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route,
      { ...filteredFixture(new URL(route.request().url())), readiness_scope:{ assessment_available:false, permission_scoped:true } }));
    await page.reload();
    const details = page.locator('#action-center-governance-readiness');
    await details.locator('summary').click();
    await expect(details.getByText('Readiness assessment unavailable for this role')).toBeVisible();
    await expect(details).toContainText('Hidden domains are not treated as zero or as blockers');
  });

  // Batch 7: advanced role-scoped governance and diagnostic results (generated only).
  test('TACT-028 Action Center diagnostics disclosure is hidden without tenant diagnostics access', async ({page}) => {
    await setActionPermissions(page, ['operational_action_center.read','control_tower.read','alerts.read']);
    await expect(page.locator('#action-center-governance-readiness')).toBeVisible();
    await expect(page.locator('#action-center-technical-diagnostics')).toHaveCount(0);
  });

  test('TACT-029 Technical diagnostics disclosure expands and persists its URL state', async ({page}) => {
    const details = page.locator('#action-center-technical-diagnostics');
    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open','');
    await expect.poll(() => new URL(page.url()).searchParams.get('expanded_sections')).toBe('diagnostics');
    await page.reload();
    await expect(details).toHaveAttribute('open','');
  });

  test('TACT-030 Both advanced disclosures preserve their independent expanded query flags', async ({page}) => {
    const governance = page.locator('#action-center-governance-readiness');
    const diagnostics = page.locator('#action-center-technical-diagnostics');
    await governance.locator('summary').click();
    await expect(governance).toHaveAttribute('open','');
    await diagnostics.locator('summary').click();
    await expect(diagnostics).toHaveAttribute('open','');
    await expect.poll(() => new URL(page.url()).searchParams.get('expanded_sections')).toBe('governance,diagnostics');
    await page.reload();
    await expect(governance).toHaveAttribute('open','');
    await expect(diagnostics).toHaveAttribute('open','');
  });

  test('TACT-031 Closing an advanced disclosure removes only its own URL flag', async ({page}) => {
    await page.goto('/action-center?expanded_sections=governance%2Cdiagnostics&action_section=diagnostics');
    const governance = page.locator('#action-center-governance-readiness');
    const diagnostics = page.locator('#action-center-technical-diagnostics');
    await expect(governance).toHaveAttribute('open','');
    await expect(diagnostics).toHaveAttribute('open','');
    await diagnostics.locator('summary').click();
    await expect(diagnostics).not.toHaveAttribute('open','');
    await expect.poll(() => new URL(page.url()).searchParams.get('expanded_sections')).toBe('governance');
    await expect(governance).toHaveAttribute('open','');
    expect(new URL(page.url()).searchParams.has('action_section')).toBe(false);
  });

  test('TACT-032 Governance source-page shortcuts are permission gated', async ({page}) => {
    await setActionPermissions(page, ['operational_action_center.read','control_tower.read']);
    const section = page.locator('#action-center-governance-readiness');
    await section.locator('summary').click();
    await expect(section.getByRole('link',{name:'Open alerts'})).toHaveCount(0);
    await expect(section.getByRole('link',{name:'Open execution tasks'})).toHaveCount(0);
    await expect(section.getByRole('link',{name:'Open intelligence review'})).toHaveCount(0);
  });

  test('TACT-033 Governance traceability score shows human-operated orchestration evidence', async ({page}) => {
    const section = page.locator('#action-center-governance-readiness');
    await section.locator('summary').click();
    await expect(section.getByText('Control Tower orchestration traceability')).toBeVisible();
    await expect(section.locator('.card').filter({hasText:'Traceability score'}).first()).toContainText('82');
    await expect(section).toContainText('Manual orchestration readiness');
    await expect(section).toContainText('source workflows remain authoritative');
  });

  test('TACT-034 Remediation feedback renders actual blockers and supplied manual evidence', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route, {
      ...filteredFixture(new URL(route.request().url())),
      control_tower_remediation_feedback_loop:{ ...actionFixture.control_tower_remediation_feedback_loop,
        blockers:['source_evidence_missing'], required_manual_evidence:['operator_review_receipt'],
        recommended_next_step:'Inspect the synthetic source evidence' }
    }));
    await page.reload();
    const section = page.locator('#action-center-governance-readiness');
    await section.locator('summary').click();
    await expect(section).toContainText('Source evidence missing');
    await expect(section).toContainText('Operator review receipt');
    await expect(section).toContainText('Inspect the synthetic source evidence');
  });

  test('TACT-035 Effectiveness review displays source readiness percentage and blockers', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route, {
      ...filteredFixture(new URL(route.request().url())),
      control_tower_remediation_effectiveness_review:{...actionFixture.control_tower_remediation_effectiveness_review,
        governance_coverage_score:62, blockers:['unverified_outcome']}
    }));
    await page.reload();
    const section = page.locator('#action-center-governance-readiness');
    await section.locator('summary').click();
    await expect(section.locator('.card').filter({hasText:'Governance coverage'}).first()).toContainText('62%');
    await expect(section).toContainText('Unverified outcome');
  });

  test('TACT-036 Escalation governance displays candidate count and manual governance gate', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route, {
      ...filteredFixture(new URL(route.request().url())),
      control_tower_remediation_escalation_governance:{...actionFixture.control_tower_remediation_escalation_governance,
        escalation_candidate_count:3, governance_gate_score:75, escalation_contract:['manual_owner_review']}
    }));
    await page.reload();
    const section = page.locator('#action-center-governance-readiness');
    await section.locator('summary').click();
    await expect(section.locator('.card').filter({hasText:'Escalation candidates'}).first()).toContainText('3');
    await expect(section.locator('.card').filter({hasText:'Governance gate score'}).first()).toContainText('75%');
    await expect(section).toContainText('Manual owner review');
  });

  test('TACT-037 Closure verification distinguishes candidate presence from unresolved gate', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route, {
      ...filteredFixture(new URL(route.request().url())),
      control_tower_remediation_closure_verification_gate:{...actionFixture.control_tower_remediation_closure_verification_gate,
        closure_candidate_count:2, escalation_clearance_score:0, blockers:['closure_blocked']}
    }));
    await page.reload();
    const section = page.locator('#action-center-governance-readiness');
    await section.locator('summary').click();
    await expect(section.locator('.card').filter({hasText:'Closure candidates'}).first()).toContainText('2');
    await expect(section.locator('.card').filter({hasText:'Escalation clearance'}).first()).toContainText('0%');
    await expect(section).toContainText('Closure blocked');
  });

  test('TACT-038 Contract diagnostics lists missing response keys and blockers', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route, {
      ...filteredFixture(new URL(route.request().url())),
      control_tower_remediation_response_contract_audit:{...actionFixture.control_tower_remediation_response_contract_audit,
        missing_contract_keys:['control_tower_remediation_feedback_loop'], total_blocker_count:2, contract_coverage_score:75}
    }));
    await page.reload();
    const details = page.locator('#action-center-technical-diagnostics');
    await details.locator('summary').click();
    await expect(details).toContainText('Control tower remediation feedback loop');
    await expect(details.locator('.card').filter({hasText:'Open blockers'}).first()).toContainText('2');
    await expect(details.locator('.card').filter({hasText:'Coverage'}).first()).toContainText('75%');
  });

  test('TACT-039 Route exposure audit detects missing panels and frontend contract drift', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route, {
      ...filteredFixture(new URL(route.request().url())),
      control_tower_route_exposure_audit:{...actionFixture.control_tower_route_exposure_audit,
        frontend_rendered_panels:[], missing_frontend_panels:['control_tower_remediation_feedback_loop'],
        blockers:['frontend_backend_panel_drift']}
    }));
    await page.reload();
    const details = page.locator('#action-center-technical-diagnostics');
    await details.locator('summary').click();
    await expect(details.locator('.card').filter({hasText:'Missing panels'}).first()).toContainText('1');
    await expect(details.locator('.card').filter({hasText:'Frontend drift count'}).first()).not.toContainText('0');
    await expect(details).toContainText('Frontend backend panel drift');
  });

  test('TACT-040 Diagnostic disclosure is read only and cannot send mutation requests', async ({page}) => {
    const sent: string[] = [];
    page.on('request', request => { if (/operational-action-center/.test(request.url()) && request.method() !== 'GET') sent.push(request.method()); });
    await page.goto('/action-center?expanded_sections=governance%2Cdiagnostics');
    await expect(page.locator('#action-center-technical-diagnostics')).toHaveAttribute('open','');
    await expect(page.locator('#action-center-governance-readiness')).toHaveAttribute('open','');
    await expect(page.locator('#action-center-technical-diagnostics').getByRole('button')).toHaveCount(0);
    await expect(page.locator('#action-center-governance-readiness').getByRole('button')).toHaveCount(0);
    expect(sent).toEqual([]);
  });

  test('TACT-041 Missing action title and summary use source-defined safe fallbacks', async ({page}) => {
    const rows = [{...actionRows[0], title:'', summary:''}];
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route,
      filteredFixture(new URL(route.request().url()),rows)));
    await page.reload();
    await expect(actionCard(page,'pw-action-alert').locator('.action-center-action-title')).toHaveText('Action');
    await expect(actionCard(page,'pw-action-alert')).toContainText('No summary provided.');
  });

  test('TACT-042 Known execution closure title localizes while arbitrary source title stays literal', async ({page}) => {
    const rows = [
      {...actionRows[1], title:'Close approved execution request: External adapter',summary:'Review and close the approved execution request through the operational task queue. This task is a human closure record only; it does not execute adapters or mutate inventory.'},
      {...actionRows[0], title:'Warehouse custom: keep this text',summary:'User note exactly as entered'}
    ];
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route,
      filteredFixture(new URL(route.request().url()), rows)));
    await page.reload();
    await expect(actionCard(page,'pw-action-exec')).toContainText('Close approved execution request: External adapter');
    await expect(actionCard(page,'pw-action-alert')).toContainText('Warehouse custom: keep this text');
    await expect(actionCard(page,'pw-action-alert')).toContainText('User note exactly as entered');
  });

  test('TACT-043 Alert without source ID links safely to queue, without dangling query', async ({page}) => {
    const rows = [{...actionRows[0],source_id:undefined}];
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route,
      filteredFixture(new URL(route.request().url()),rows)));
    await page.reload();
    await expect(actionCard(page,'pw-action-alert').getByRole('link',{name:'Open alert workflow'})).toHaveAttribute('href','/alerts');
  });

  test('TACT-044 Filtered action list still identifies readiness as unfiltered bounded source sample', async ({page}) => {
    await page.getByRole('combobox',{name:'Filter by action domain'}).selectOption('alerts');
    await expect(page.locator('.action-center-action-card')).toHaveCount(1);
    const details = page.locator('#action-center-governance-readiness');
    await details.locator('summary').click();
    await expect(details).toContainText('unfiltered source sample');
    await expect(details).toContainText('Maximum source records checked per workflow:');
    await expect(details).toContainText('50');
  });

  test('TACT-045 Missing numeric readiness fields display fallback values, not NaN or Infinity', async ({page}) => {
    await page.route('**/operational-action-center/summary?*', route => fulfillJson(route, {
      ...filteredFixture(new URL(route.request().url())),
      control_tower_orchestration_traceability:{traceability_score:'unavailable',control_tower_action_count:null},
      control_tower_remediation_effectiveness_review:{review_ready_action_count:0, governance_coverage_score:null},
      control_tower_remediation_escalation_governance:{escalation_candidate_count:0},
      control_tower_remediation_closure_verification_gate:{closure_candidate_count:0}
    }));
    await page.reload();
    const details = page.locator('#action-center-governance-readiness');
    await details.locator('summary').click();
    await expect(details).toContainText('No review-ready actions were available for this percentage.');
    await expect(details).toContainText('No escalation candidates were available for this percentage.');
    await expect(details).not.toContainText('NaN');
    await expect(details).not.toContainText('Infinity');
  });
});
