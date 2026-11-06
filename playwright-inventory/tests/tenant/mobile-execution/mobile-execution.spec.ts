import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 7 — GENERATED_UNRUN. Frontend: pages/MobileExecutionPage.tsx and
// mobileExecutionSystemText.ts; backend: routes/executionTasks.js,
// routes/inventoryCapabilities.js, validations/executionTasks.validation.js.
// All task writes are intercepted and rejected unless an individual test
// installs a synthetic response. Never connect to non-disposable tenants.
const sampleTasks = [
  { id:'pw-mobile-ready', task_code:'PW-M-001', title:'Synthetic rack inspection', description:'Check shelf R-1',
    status:'ready', urgency:'critical', assignment_state:'mine', assigned_to:'pw-tenant-worker',
    source_type:'manual', storage_location_name:'Rack R-1', due_at:'2026-10-01T09:00:00.000Z', is_overdue:true,
    scan_supported:true, compact_payload:{product_name:'Synthetic stock item', quantity:4, line_count:2} },
  { id:'pw-mobile-progress', task_code:'PW-M-002', title:'Synthetic transfer preparation',
    description:'Move sample box', status:'in_progress', urgency:'high', assignment_state:'mine',
    assigned_to:'pw-tenant-worker', source_type:'transfer', source_route:'/stock-transfers', source_id:'pw-transfer-2',
    compact_payload:{ from_location:'Rack A', to_location:'Rack B' } },
  { id:'pw-mobile-blocked', task_code:'PW-M-003', title:'Synthetic blocked check',
    status:'blocked', urgency:'medium', assignment_state:'mine', assigned_to:'pw-tenant-worker', source_type:'manual' },
  { id:'pw-mobile-unassigned', task_code:'PW-M-004', title:'Synthetic unassigned delivery',
    status:'ready', urgency:'low', assignment_state:'unassigned', assigned_to:null, can_take:true, source_type:'shipment',
    source_route:'/shipments', source_id:'pw-shipment-4' },
  { id:'pw-mobile-untakeable', task_code:'PW-M-005', title:'Synthetic restricted unassigned task',
    status:'ready', urgency:'low', assignment_state:'unassigned', assigned_to:null, can_take:false, source_type:'manual' },
  { id:'pw-mobile-other', task_code:'PW-M-006', title:'Synthetic coworker job',
    status:'in_progress', urgency:'high', assignment_state:'other', assigned_to:'another-user',
    assigned_to_name:'Synthetic coworker', source_type:'manual' }
];
type TaskRow = typeof sampleTasks[number];
function queuePayload(url: URL, rows: TaskRow[] = sampleTasks) {
  const params = url.searchParams;
  const scope = params.get('assignment_scope') || 'mine';
  const urgency = params.get('urgency');
  const source = params.get('source_type');
  const offset = Number(params.get('offset') || 0);
  const limit = Number(params.get('limit') || 25);
  const filtered = rows.filter(item =>
    (scope === 'team' || (scope === 'mine' ? item.assignment_state === 'mine' : item.assignment_state === 'unassigned')) &&
    (!urgency || item.urgency === urgency) && (!source || item.source_type === source));
  const tasks = filtered.slice(offset, offset + limit);
  return { generated_at:'2026-10-10T12:00:00.000Z', current_user_id:'pw-tenant-worker', count:tasks.length,
    filters:{assignment_scope:scope,urgency,source_type:source,limit,offset},
    pagination:{total:filtered.length,limit,offset,returned:tasks.length,has_more:offset+tasks.length<filtered.length},
    summary:{total:filtered.length,ready:filtered.filter(r=>r.status==='ready').length,
      assigned:filtered.filter(r=>r.assignment_state==='mine').length,
      in_progress:filtered.filter(r=>r.status==='in_progress').length,
      blocked:filtered.filter(r=>r.status==='blocked').length,
      overdue:filtered.filter(r=>r.is_overdue).length,
      scan_supported:filtered.filter(r=>r.scan_supported).length}, tasks };
}
async function fixtureQueue(page: Page, rows: TaskRow[] = sampleTasks) {
  await page.route('**/execution-tasks/mobile-queue?*', route => {
    if (route.request().method() !== 'GET') return route.abort();
    return fulfillJson(route, queuePayload(new URL(route.request().url()), rows));
  });
  await page.route('**/inventory-capabilities/mobile-sync', route => route.abort());
  await page.route('**/enterprise-inventory/attachments/recent-execution-task', route => fulfillJson(route, []));
  await page.route('**/enterprise-inventory/attachments/upload?*', route => route.abort());
}
async function openMobile(page: Page, url = '/mobile-execution', rows: TaskRow[] = sampleTasks) {
  await loginAsTenant(page);
  await fixtureQueue(page, rows);
  await page.goto(url);
  await expect(page.locator('.mobile-execution-page')).toBeVisible();
  await expect(page.getByText('Touch-first task queue')).toBeVisible();
}
const taskCard = (page: Page, id: string) => page.locator('.mobile-execution-task-card').filter({hasText: sampleTasks.find(t=>t.id===id)?.title || id});
const taskCards = (page: Page) => page.locator('.mobile-execution-task-card');

 test.describe('Mobile Execution — ownership, filters, offline queue and evidence', () => {
  test.beforeEach(async ({page}) => { await openMobile(page); });

  test('TMOB-001 page presents touch-first queue and responsibility selector', async ({page}) => {
    await expect(page.getByText('Mobile execution controls')).toBeVisible();
    await expect(page.getByRole('group',{name:'Choose task ownership view'})).toBeVisible();
    await expect(page.getByRole('link',{name:'Open execution tasks'})).toHaveAttribute('href','/execution-tasks');
  });

  test('TMOB-002 initial queue request is limited to 25 tasks at offset zero in mine scope', async ({page}) => {
    let seen: URL | undefined;
    await page.route('**/execution-tasks/mobile-queue?*', route => {
      seen = new URL(route.request().url());
      return fulfillJson(route,queuePayload(seen));
    });
    await page.getByRole('button',{name:'Refresh mobile queue'}).click();
    await expect.poll(() => seen?.searchParams.get('limit')).toBe('25');
    expect(seen?.searchParams.get('offset')).toBe('0');
    expect(seen?.searchParams.get('assignment_scope')).toBe('mine');
  });

  test('TMOB-003 overview reflects three mine tasks and one overdue item', async ({page}) => {
    await expect(page.getByRole('region',{name:'Mobile execution overview'}).or(page.locator('[aria-label="Mobile execution overview"]'))).toContainText('3');
    await expect(page.locator('.mobile-execution-page')).toContainText('Overdue');
    await expect(taskCards(page)).toHaveCount(3);
  });

  test('TMOB-004 owned work cards show priority, location, product context and due state', async ({page}) => {
    const card = taskCard(page,'pw-mobile-ready');
    await expect(card).toContainText('Critical');
    await expect(card).toContainText('Rack R-1');
    await expect(card).toContainText('Synthetic stock item');
    await expect(card).toContainText('Overdue');
  });

  test('TMOB-005 urgency filter updates route and removes mismatching tasks', async ({page}) => {
    await page.getByRole('combobox',{name:'Filter mobile tasks by urgency'}).selectOption('critical');
    await expect(page).toHaveURL(/urgency=critical/);
    await expect(taskCards(page)).toHaveCount(1);
    await expect(taskCard(page,'pw-mobile-ready')).toBeVisible();
  });

  test('TMOB-006 task source filter updates URL and restricts cards to matching source', async ({page}) => {
    await page.getByRole('combobox',{name:'Filter mobile tasks by source'}).selectOption('transfer');
    await expect(page).toHaveURL(/source=transfer/);
    await expect(taskCards(page)).toHaveCount(1);
    await expect(taskCard(page,'pw-mobile-progress')).toBeVisible();
  });

  test('TMOB-007 ownership tab switches to unassigned work and requests corresponding scope', async ({page}) => {
    await page.getByRole('button',{name:'Unassigned tasks'}).click();
    await expect(page).toHaveURL(/scope=unassigned/);
    await expect(taskCards(page)).toHaveCount(2);
    await expect(taskCard(page,'pw-mobile-unassigned')).toBeVisible();
  });

  test('TMOB-008 combined deep-link filters restore after navigation and reload', async ({page}) => {
    await page.goto('/mobile-execution?scope=team&urgency=high&source=transfer');
    await expect(page.getByRole('combobox',{name:'Filter mobile tasks by urgency'})).toHaveValue('high');
    await expect(page.getByRole('combobox',{name:'Filter mobile tasks by source'})).toHaveValue('transfer');
    await expect(taskCard(page,'pw-mobile-progress')).toBeVisible();
    await page.reload();
    await expect(taskCard(page,'pw-mobile-progress')).toBeVisible();
  });

  test('TMOB-009 unsupported query values default to safe scope and all filters', async ({page}) => {
    await page.goto('/mobile-execution?scope=invalid&urgency=ultra&source=unknown&page=-4');
    await expect(taskCards(page)).toHaveCount(3);
    await expect(page.getByRole('combobox',{name:'Filter mobile tasks by urgency'})).toHaveValue('all');
    await expect(page.getByRole('combobox',{name:'Filter mobile tasks by source'})).toHaveValue('all');
  });

  test('TMOB-010 changing filter clears stale pagination parameter', async ({page}) => {
    await page.goto('/mobile-execution?scope=team&page=2');
    await page.getByRole('combobox',{name:'Filter mobile tasks by urgency'}).selectOption('high');
    await expect.poll(() => new URL(page.url()).searchParams.has('page')).toBe(false);
    await expect(taskCard(page,'pw-mobile-progress')).toBeVisible();
  });

  test('TMOB-011 refresh repeats source GET without writing to task state', async ({page}) => {
    let count = 0;
    await page.route('**/execution-tasks/mobile-queue?*', route => {
      count++;
      return fulfillJson(route,queuePayload(new URL(route.request().url())));
    });
    await page.getByRole('button',{name:'Refresh mobile queue'}).click();
    await expect.poll(() => count).toBe(1);
    await expect(taskCard(page,'pw-mobile-ready')).toBeVisible();
  });

  test('TMOB-012 no matching records shows explicit empty queue state', async ({page}) => {
    await page.route('**/execution-tasks/mobile-queue?*', route => fulfillJson(route,queuePayload(new URL(route.request().url()),[])));
    await page.reload();
    await expect(page.getByText('No matching mobile tasks')).toBeVisible();
    await expect(taskCards(page)).toHaveCount(0);
  });

  test('TMOB-013 queue API denial displays error, not invented task cards', async ({page}) => {
    await page.route('**/execution-tasks/mobile-queue?*', route => fulfillJson(route,{message:'Synthetic queue access denied'},403));
    await page.reload();
    await expect(page.locator('.mobile-execution-controls-shell .form-error')).toBeVisible();
    await expect(taskCards(page)).toHaveCount(0);
  });

  test('TMOB-014 ready owned task exposes start, complete and block actions', async ({page}) => {
    const card = taskCard(page,'pw-mobile-ready');
    for (const name of ['Start','Complete','Block']) await expect(card.getByRole('button',{name,exact:true})).toBeVisible();
    await expect(card.getByRole('button',{name:'Unblock'})).toHaveCount(0);
  });

  test('TMOB-015 in-progress task offers completion or blocking, not redundant start', async ({page}) => {
    const card = taskCard(page,'pw-mobile-progress');
    await expect(card.getByRole('button',{name:'Complete',exact:true})).toBeVisible();
    await expect(card.getByRole('button',{name:'Block',exact:true})).toBeVisible();
    await expect(card.getByRole('button',{name:'Start',exact:true})).toHaveCount(0);
  });

  test('TMOB-016 blocked task permits unblock without duplicate block or complete', async ({page}) => {
    const card = taskCard(page,'pw-mobile-blocked');
    await expect(card.getByRole('button',{name:'Unblock'})).toBeVisible();
    await expect(card.getByRole('button',{name:'Block',exact:true})).toHaveCount(0);
    await expect(card.getByRole('button',{name:'Complete',exact:true})).toHaveCount(0);
  });

  test('TMOB-017 other team member work stays read-only in team scope', async ({page}) => {
    await page.getByRole('button',{name:'Team tasks'}).click();
    const card = taskCard(page,'pw-mobile-other');
    await expect(card).toContainText('This task belongs to another team member');
    for (const name of ['Take task','Start','Block','Complete','Unblock']) await expect(card.getByRole('button',{name,exact:true})).toHaveCount(0);
  });

  test('TMOB-018 eligible unassigned task offers take and not owned-task controls', async ({page}) => {
    await page.getByRole('button',{name:'Unassigned tasks'}).click();
    const card = taskCard(page,'pw-mobile-unassigned');
    await expect(card.getByRole('button',{name:'Take task'})).toBeVisible();
    await expect(card.getByRole('button',{name:'Complete',exact:true})).toHaveCount(0);
  });

  test('TMOB-019 unassigned task with can_take false has no assignment button', async ({page}) => {
    await page.getByRole('button',{name:'Unassigned tasks'}).click();
    await expect(taskCard(page,'pw-mobile-untakeable').getByRole('button',{name:'Take task'})).toHaveCount(0);
  });

  test('TMOB-020 manual task detail link includes precise task ID', async ({page}) => {
    await expect(taskCard(page,'pw-mobile-ready').getByRole('link',{name:'Open task details'}))
      .toHaveAttribute('href','/execution-tasks?task_id=pw-mobile-ready');
  });

  test('TMOB-021 scan-ready task links to scanner with encoded task identifier', async ({page}) => {
    await expect(taskCard(page,'pw-mobile-ready').getByRole('link',{name:'Scan/verify task item'}))
      .toHaveAttribute('href','/scanner?mode=task&executionTaskId=pw-mobile-ready');
  });

  test('TMOB-022 transfer task links to its owning source workflow', async ({page}) => {
    const card = taskCard(page,'pw-mobile-progress');
    await expect(card.getByRole('link',{name:'Open source workflow'}))
      .toHaveAttribute('href','/stock-transfers?transfer_id=pw-transfer-2');
  });

  test('TMOB-023 blocking requires nonempty reason before confirmation is enabled', async ({page}) => {
    const card = taskCard(page,'pw-mobile-ready');
    await card.getByRole('button',{name:'Block',exact:true}).click();
    await expect(card.getByLabel('Why is this task blocked?')).toBeVisible();
    await expect(card.getByRole('button',{name:'Confirm block'})).toBeDisabled();
    await card.getByLabel('Why is this task blocked?').fill('Synthetic blocked shelf');
    await expect(card.getByRole('button',{name:'Confirm block'})).toBeEnabled();
  });

  test('TMOB-024 cancelling a block reason hides composer without submitting mutation', async ({page}) => {
    let writes = 0;
    page.on('request', request => { if (request.url().includes('/inventory-capabilities/mobile-sync') && request.method()==='POST') writes++; });
    const card = taskCard(page,'pw-mobile-ready');
    await card.getByRole('button',{name:'Block',exact:true}).click();
    await card.getByLabel('Why is this task blocked?').fill('Unsent synthetic note');
    await card.getByRole('button',{name:'Cancel'}).click();
    await expect(card.getByLabel('Why is this task blocked?')).toHaveCount(0);
    expect(writes).toBe(0);
  });

  test('TMOB-025 applied row-level sync produces task action confirmation', async ({page}) => {
    let body: any;
    await page.route('**/inventory-capabilities/mobile-sync', async route => {
      body = route.request().postDataJSON();
      await fulfillJson(route,{success_count:1,failure_count:0,results:[{operation_id:body.operations[0].operation_id,status:'applied'}]});
    });
    await taskCard(page,'pw-mobile-ready').getByRole('button',{name:'Start',exact:true}).click();
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toContainText('Task action applied successfully.');
    expect(body.operations[0].task_id).toBe('pw-mobile-ready');
    expect(body.operations[0].action).toBe('start');
  });

  test('TMOB-026 failed row-level sync reports failure rather than a success toast', async ({page}) => {
    await page.route('**/inventory-capabilities/mobile-sync', route => fulfillJson(route,
      {failure_count:1,success_count:0,results:[{status:'failed',error:'Synthetic assignment rejected'}]}));
    await taskCard(page,'pw-mobile-ready').getByRole('button',{name:'Start',exact:true}).click();
    await expect(page.locator('.mobile-execution-controls-shell .form-error')).toContainText('Synthetic assignment rejected');
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toHaveCount(0);
  });

  test('TMOB-027 ambiguous row-level sync does not claim task mutation was applied', async ({page}) => {
    await page.route('**/inventory-capabilities/mobile-sync', route => fulfillJson(route,{success_count:0,failure_count:0,results:[]}));
    await taskCard(page,'pw-mobile-ready').getByRole('button',{name:'Start',exact:true}).click();
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toContainText('Task action queued because synchronization could not be confirmed.');
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).not.toContainText('Task action applied successfully.');
  });

  test('TMOB-028 offline action queues locally without sending a write request', async ({page}) => {
    const writes: string[] = [];
    page.on('request', req => {if (req.url().includes('mobile-sync') && req.method()==='POST') writes.push(req.url());});
    await page.evaluate(() => { Object.defineProperty(navigator, 'onLine', { configurable:true, get:()=>false }); window.dispatchEvent(new Event('offline')); });
    await taskCard(page,'pw-mobile-ready').getByRole('button',{name:'Start',exact:true}).click();
    await expect(page.getByText('Queued offline actions')).toBeVisible();
    await expect(page.locator('.mobile-execution-pending-row')).toHaveCount(1);
    expect(writes).toEqual([]);
  });

  test('TMOB-029 user can remove a queued offline action from the pending list', async ({page}) => {
    await page.evaluate(() => {Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});window.dispatchEvent(new Event('offline'));});
    await taskCard(page,'pw-mobile-ready').getByRole('button',{name:'Start',exact:true}).click();
    await expect(page.locator('.mobile-execution-pending-row')).toHaveCount(1);
    await page.getByRole('button',{name:'Remove queued action'}).click();
    await expect(page.locator('.mobile-execution-pending-row')).toHaveCount(0);
    await expect(page.getByText('No pending sync')).toBeVisible();
  });

  test('TMOB-030 empty recent evidence history is disclosed in expandable panel', async ({page}) => {
    const details = page.getByTestId('mobile-execution-evidence-history');
    await details.locator('summary').click();
    await expect(details).toContainText('No attachments yet.');
  });

  test('TMOB-031 recent evidence list offers task navigation and respects download-disabled flag', async ({page}) => {
    await page.route('**/enterprise-inventory/attachments/recent-execution-task',route => fulfillJson(route,[
      {id:'pw-evidence-1',entity_id:'pw-mobile-ready',task_code:'PW-M-001',task_title:'Synthetic rack inspection',
       original_filename:'synthetic-proof.txt',created_at:'2026-10-02T12:00:00.000Z',can_download:false}
    ]));
    await page.reload();
    const details = page.getByTestId('mobile-execution-evidence-history');
    await details.locator('summary').click();
    await expect(details).toContainText('synthetic-proof.txt');
    await expect(details.getByRole('link',{name:'Open task details'})).toHaveAttribute('href','/execution-tasks?task_id=pw-mobile-ready');
    await expect(details.getByRole('button',{name:'Download'})).toBeDisabled();
  });

  test('TMOB-032 evidence read permission failure is explicit rather than removing recovery panel', async ({page}) => {
    const original = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me',route => fulfillJson(route,
      {...original,scope:'tenant',permissions:['operational_action_center.read','execution_tasks.read','execution_tasks.update','execution_tasks.complete']}));
    await page.reload();
    const details = page.getByTestId('mobile-execution-evidence-history');
    await details.locator('summary').click();
    await expect(details.getByRole('alert')).toContainText('No permission');
  });
});

// Batch 8 — TMOB-033…048. Generated but NOT executed. Every upload and
// replay response is synthetic and intercepted; no real task is changed.
const pagedMobileRows: TaskRow[] = Array.from({ length: 51 }, (_, index) => ({
  id: `pw-mobile-page-${index + 1}`,
  task_code: `PW-P-${String(index + 1).padStart(3, '0')}`,
  title: `Synthetic mobile page task ${index + 1}`,
  description: 'Synthetic paginated test record',
  status: 'ready', urgency: 'medium', assignment_state: 'mine',
  assigned_to: 'pw-tenant-worker', source_type: 'manual'
}));

async function mobileUploadFixture(page: Page, receipt: unknown, list: unknown = [], uploadStatus = 201, listStatus = 200) {
  await page.route('**/enterprise-inventory/attachments/upload?*', route => {
    if (route.request().method() !== 'POST') return route.abort();
    return fulfillJson(route, receipt, uploadStatus);
  });
  await page.route('**/enterprise-inventory/attachments?entity_type=execution_task&entity_id=*', route =>
    fulfillJson(route, list, listStatus));
}
async function selectMobileEvidence(page: Page, taskId = 'pw-mobile-ready') {
  await taskCard(page, taskId).getByRole('button', {name:'Upload evidence'}).click();
  await page.locator('input.mobile-execution-hidden-file[accept*=".pdf"]').setInputFiles({
    name:'pw-task-evidence.txt', mimeType:'text/plain', buffer:Buffer.from('Synthetic task evidence for automated browser testing')
  });
}
async function mobileOffline(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', {configurable:true, get:()=>false});
    window.dispatchEvent(new Event('offline'));
  });
}
async function mobileOnline(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', {configurable:true, get:()=>true});
    window.dispatchEvent(new Event('online'));
  });
}

test.describe('Mobile Execution — remaining pagination, evidence and replay cases', () => {
  test.beforeEach(async ({page}) => { await openMobile(page); });

  test('TMOB-033 next queue page uses offset 25 and shows tasks 26 through 50', async ({page}) => {
    const queries: URL[] = [];
    await page.route('**/execution-tasks/mobile-queue?*', route => {
      const url = new URL(route.request().url()); queries.push(url);
      return fulfillJson(route,queuePayload(url, pagedMobileRows));
    });
    await page.goto('/mobile-execution');
    await expect(taskCards(page)).toHaveCount(25);
    await page.getByRole('button',{name:'Next', exact:true}).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(taskCards(page)).toHaveCount(25);
    await expect(page.locator('.mobile-execution-pagination')).toContainText('Showing 26-50 of 51');
    expect(queries.some(url => url.searchParams.get('offset') === '25' && url.searchParams.get('limit') === '25')).toBe(true);
  });

  test('TMOB-034 final queue page disables Next and Previous navigates back one page', async ({page}) => {
    await fixtureQueue(page,pagedMobileRows);
    await page.goto('/mobile-execution?page=2');
    await expect(taskCards(page)).toHaveCount(1);
    await expect(page.locator('.mobile-execution-pagination')).toContainText('Showing 51-51 of 51');
    await expect(page.getByRole('button',{name:'Next',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Previous',exact:true}).click();
    await expect(page).toHaveURL(/page=1/);
    await expect(taskCards(page)).toHaveCount(25);
    await expect(page.getByRole('button',{name:'Next',exact:true})).toBeEnabled();
  });

  test('TMOB-035 offline disables queue refresh and reconnecting re-enables it', async ({page}) => {
    await mobileOffline(page);
    await expect(page.getByRole('button',{name:'Refresh mobile queue'})).toBeDisabled();
    await expect(page.locator('.mobile-execution-page')).toContainText('Offline');
    await mobileOnline(page);
    await expect(page.getByRole('button',{name:'Refresh mobile queue'})).toBeEnabled();
  });

  test('TMOB-036 receipt belonging to another task never confirms evidence upload', async ({page}) => {
    let readbacks = 0;
    await mobileUploadFixture(page,{id:'pw-evidence-x',entity_type:'execution_task',entity_id:'pw-other',original_filename:'pw-task-evidence.txt'});
    await page.route('**/enterprise-inventory/attachments?entity_type=execution_task&entity_id=*',route => {
      readbacks++; return fulfillJson(route,[]);
    });
    await selectMobileEvidence(page);
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toContainText('could not be verified on the selected task');
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toContainText('PW-M-001');
    expect(readbacks).toBe(0);
  });

  test('TMOB-037 receipt plus persisted task evidence list confirms exact attachment', async ({page}) => {
    let uploaded: URL | undefined;
    await mobileUploadFixture(page,
      {id:'pw-evidence-ok',entity_type:'execution_task',entity_id:'pw-mobile-ready',original_filename:'pw-task-evidence.txt'},
      [{id:'pw-evidence-ok',entity_type:'execution_task',entity_id:'pw-mobile-ready',original_filename:'pw-task-evidence.txt'}]);
    await page.route('**/enterprise-inventory/attachments/upload?*',route => {
      uploaded = new URL(route.request().url());
      return fulfillJson(route,{id:'pw-evidence-ok',entity_type:'execution_task',entity_id:'pw-mobile-ready',original_filename:'pw-task-evidence.txt'},201);
    });
    await selectMobileEvidence(page);
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toContainText('Evidence attached to the execution task successfully.');
    expect(uploaded?.searchParams.get('entity_type')).toBe('execution_task');
    expect(uploaded?.searchParams.get('entity_id')).toBe('pw-mobile-ready');
    expect(uploaded?.searchParams.get('original_filename')).toBe('pw-task-evidence.txt');
  });

  test('TMOB-038 accepted upload without matching list entry remains unverified', async ({page}) => {
    await mobileUploadFixture(page,
      {id:'pw-evidence-missing',entity_type:'execution_task',entity_id:'pw-mobile-ready',original_filename:'pw-task-evidence.txt'},
      [{id:'pw-different',entity_id:'pw-mobile-ready',original_filename:'pw-task-evidence.txt'}]);
    await selectMobileEvidence(page);
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toContainText('could not be verified on the selected task');
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).not.toContainText('Evidence attached to the execution task successfully.');
  });

  test('TMOB-039 list readback failure discloses upload verification uncertainty', async ({page}) => {
    await mobileUploadFixture(page,
      {id:'pw-evidence-readfail',entity_type:'execution_task',entity_id:'pw-mobile-ready',original_filename:'pw-task-evidence.txt'},
      {error:'Synthetic list failure'},201,503);
    await selectMobileEvidence(page);
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toContainText('file list could not be checked');
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).not.toContainText('Evidence attached to the execution task successfully.');
  });

  test('TMOB-040 upload rejection reports error without an attachment success confirmation', async ({page}) => {
    await mobileUploadFixture(page,{error:'Synthetic evidence rejected',message:'Synthetic evidence rejected'},[],403);
    await selectMobileEvidence(page);
    await expect(page.locator('.mobile-execution-controls-shell .form-error')).toBeVisible();
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toHaveCount(0);
  });

  test('TMOB-041 failed offline replay keeps queued action with failure reason', async ({page}) => {
    await mobileOffline(page);
    await taskCard(page,'pw-mobile-ready').getByRole('button',{name:'Start',exact:true}).click();
    await expect(page.locator('.mobile-execution-pending-row')).toHaveCount(1);
    await page.route('**/inventory-capabilities/mobile-sync',route => fulfillJson(route,{
      results:[{status:'failed',error:'Synthetic task version conflict'}],success_count:0,failure_count:1
    }));
    await mobileOnline(page);
    await expect(page.locator('.mobile-execution-pending-row')).toHaveCount(1);
    await expect(page.locator('.mobile-execution-pending-row .form-error')).toContainText('Synthetic task version conflict');
    await expect(page.locator('.mobile-execution-controls-shell .form-error')).toContainText('Synthetic task version conflict');
  });

  test('TMOB-042 applied offline replay removes the confirmed queued operation', async ({page}) => {
    await mobileOffline(page);
    await taskCard(page,'pw-mobile-ready').getByRole('button',{name:'Start',exact:true}).click();
    await expect(page.locator('.mobile-execution-pending-row')).toHaveCount(1);
    let sentTask: string | undefined;
    await page.route('**/inventory-capabilities/mobile-sync',route => {
      sentTask = route.request().postDataJSON().operations?.[0]?.task_id;
      return fulfillJson(route,{results:[{status:'applied'}],success_count:1,failure_count:0});
    });
    await mobileOnline(page);
    await expect(page.locator('.mobile-execution-pending-row')).toHaveCount(0);
    await expect(page.locator('.mobile-execution-controls-shell .form-success')).toContainText('offline action synchronized.');
    expect(sentTask).toBe('pw-mobile-ready');
  });

  test('TMOB-043 ambiguous replay response retains pending operation for safe retry', async ({page}) => {
    await mobileOffline(page);
    await taskCard(page,'pw-mobile-ready').getByRole('button',{name:'Start',exact:true}).click();
    await page.route('**/inventory-capabilities/mobile-sync',route => fulfillJson(route,{results:[],success_count:0,failure_count:0}));
    await mobileOnline(page);
    await expect(page.locator('.mobile-execution-pending-row')).toHaveCount(1);
    await expect(page.locator('.mobile-execution-pending-row .form-error')).toContainText('could not be applied');
  });

  test('TMOB-044 completion permission alone does not allow update-only actions', async ({page}) => {
    const original = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me',route => fulfillJson(route,{...original,scope:'tenant',permissions:['execution_tasks.read','execution_tasks.complete']}));
    await page.reload();
    const card = taskCard(page,'pw-mobile-ready');
    await expect(card.getByRole('button',{name:'Complete',exact:true})).toBeVisible();
    await expect(card.getByRole('button',{name:'Start',exact:true})).toHaveCount(0);
    await expect(card.getByRole('button',{name:'Block',exact:true})).toHaveCount(0);
  });

  test('TMOB-045 attachment read denied keeps evidence recovery panel with explicit alert', async ({page}) => {
    const original = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me',route => fulfillJson(route,{...original,scope:'tenant',permissions:['execution_tasks.read','attachments.write']}));
    await page.reload();
    const panel = page.getByTestId('mobile-execution-evidence-history');
    await panel.locator('summary').click();
    await expect(panel.getByRole('alert')).toContainText('No permission');
    await expect(panel.getByRole('button',{name:'Download'})).toHaveCount(0);
  });

  test('TMOB-046 nonpermitted transfer source does not expose source workflow link', async ({page}) => {
    const original = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me',route => fulfillJson(route,{...original,scope:'tenant',permissions:['execution_tasks.read']}));
    await page.reload();
    await expect(taskCard(page,'pw-mobile-progress').getByRole('link',{name:'Open source workflow'})).toHaveCount(0);
    await expect(taskCard(page,'pw-mobile-ready').getByRole('link',{name:'Open task details'})).toBeVisible();
  });

  test('TMOB-047 refresh failure in attachment history displays actionable error', async ({page}) => {
    const panel = page.getByTestId('mobile-execution-evidence-history');
    await panel.locator('summary').click();
    await expect(panel).toContainText('No attachments yet.');
    await page.route('**/enterprise-inventory/attachments/recent-execution-task',route =>
      fulfillJson(route,{error:'Synthetic history unavailable',message:'Synthetic history unavailable'},503));
    await panel.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(panel.getByRole('alert')).toBeVisible();
    await expect(panel).not.toContainText('synthetic-proof.txt');
  });

  test('TMOB-048 missing scanner and upload permissions removes only those controls', async ({page}) => {
    const original = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me',route => fulfillJson(route,{...original,scope:'tenant',permissions:['execution_tasks.read','execution_tasks.update','execution_tasks.complete']}));
    await page.reload();
    const card = taskCard(page,'pw-mobile-ready');
    await expect(card.getByRole('button',{name:'Start',exact:true})).toBeVisible();
    await expect(card.getByRole('link',{name:'Scan/verify task item'})).toHaveCount(0);
    await expect(card.getByRole('button',{name:'Add photo'})).toHaveCount(0);
    await expect(card.getByRole('button',{name:'Upload evidence'})).toHaveCount(0);
  });
});
