import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 42: frontend/src/pages/ExecutionTasksPage.tsx, router.tsx, backend/routes/executionTasks.js.
// Synthetic transport validates visible UI/query contracts only, NOT server-side isolation or stock mutations.
const taskId = '12345678-1234-4234-8234-123456789001';
const stamp = '2026-11-03T10:00:00.000Z';
type Task = { id: string; tenant_id: string; task_code: string; task_type: string; status: string; priority: string; title: string; description: string | null; source_type: string; source_id: string | null; assigned_to: string | null; storage_location_id: string | null; due_at: string | null; sla_due_at: string | null; created_at: string; updated_at: string; priority_score: number; due_bucket: string; dependency_snapshot: unknown[]; payload: Record<string, unknown>; facility_id?: string | null; source_completion_ready?: boolean; completion_note?: string | null; blocked_reason?: string | null; cancellation_reason?: string | null; ready_at?: string; };
const task: Task = {
  id: taskId, tenant_id: 'pw-tenant-1', task_code: 'PW-TASK-0001', task_type: 'general',
  status: 'ready', priority: 'normal', title: 'Synthetic inventory handoff', description: 'No real stock changed',
  source_type: 'manual', source_id: null, assigned_to: null, storage_location_id: null,
  due_at: null, sla_due_at: null, created_at: stamp, updated_at: stamp,
  priority_score: 42, due_bucket: 'unscheduled', dependency_snapshot: [], payload: {}
};
const person = {
  id: '12345678-1234-4234-8234-123456789002', name: 'Synthetic Operator', email: 'synthetic@example.invalid',
  role: 'operator', is_active: true, is_locked_out: false, can_be_assigned: true,
  execution_task_capability: { can_read: true, can_update: true, can_complete: true, can_work_and_complete: true, missing_permissions: [] }
};
const location = { id: '12345678-1234-4234-8234-123456789003', name: 'Synthetic Bin A', is_active: true };
const options = { users: [person], active_users: [person], assignable_users: [person], locations: [location], active_locations: [location] };
const summary = { matching_task_count: 1, open_task_count: 1, blocked_task_count: 0, overdue_task_count: 0, due_soon_task_count: 0, unassigned_task_count: 1 };
type Call = { path: string; method: string; query: string; payload?: unknown };
type Setup = { rows?: Task[]; errorPath?: string; requests?: Call[]; count?: number; optionsReply?: Record<string, unknown>; auditRows?: unknown[]; analyticsErrorPath?: string; batchRows?: unknown[]; mutationTask?: Task; evidence?: unknown[]; directTask?: Task };
async function openTasks(page: Page, setup: Setup = {}) {
  await loginAsTenant(page);
  const calls: Call[] = setup.requests ?? [];
  await page.route('**/*', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    if (path.startsWith('/enterprise-inventory/attachments')) {
      if (route.request().method() === 'GET' && path === '/enterprise-inventory/attachments') return fulfillJson(route, setup.evidence ?? []);
      return fulfillJson(route, { message: 'Synthetic evidence unavailable' }, 404);
    }
    if (!path.startsWith('/execution-tasks') && !path.startsWith('/optimization-plans')) return route.continue();
    let payload: unknown;
    try { payload = route.request().postDataJSON(); } catch { payload = undefined; }
    calls.push({ path, method: route.request().method(), query: url.search, payload });
    if (setup.errorPath === path || setup.analyticsErrorPath === path) return fulfillJson(route, { message: 'Synthetic task API offline' }, 503);
    if (route.request().method() === 'POST') {
      if (path === '/execution-tasks') return fulfillJson(route, setup.mutationTask ?? { ...task, task_code: 'PW-TASK-CREATED', title: 'Synthetic created coordination' }, 201);
      if (path.startsWith(`/execution-tasks/${taskId}/`)) {
        const action = path.split('/').pop();
        return fulfillJson(route, setup.mutationTask ?? { ...task, status: action === 'ready' ? 'ready' : action === 'start' ? 'in_progress' : action === 'complete' ? 'completed' : action === 'cancel' ? 'cancelled' : action === 'block' ? 'blocked' : task.status });
      }
      if (path.includes('/batches/')) return fulfillJson(route, { batch_code: 'PW-BATCH-01', status: path.endsWith('/cancel') ? 'cancelled' : 'released' });
      if (path === '/optimization-plans/ai-recommendations') return fulfillJson(route, { plan_code: 'PW-ADVISORY', item_count: 2 });
    }
    if (path === '/execution-tasks/batches') return fulfillJson(route, setup.batchRows ?? []);
    if (path === '/execution-tasks/workload' || path === '/execution-tasks/sla-queue') return fulfillJson(route, []);
    if (path === '/execution-tasks/throughput-dashboard') return fulfillJson(route, { window_days: 14, totals: { total_task_count: 2, completed_task_count: 1, blocked_task_count: 0, avg_completion_hours: 4 }, by_status: [], by_type: [], by_source: [] });
    if (path === '/execution-tasks/mobile-queue') return fulfillJson(route, { count: 0, tasks: [] });
    if (path === '/optimization-plans/execution-dashboard') return fulfillJson(route, { summary: { plan_count: 1, optimization_signal_count: 2, execution_pressure_score: 15 }, top_recommendations: [] });
    if (path === '/optimization-plans/mobile-visibility') return fulfillJson(route, { summary: { visible_signal_count: 1 } });
    if (path === '/execution-tasks/analytics.csv' || path === '/optimization-plans/analytics.csv') return route.fulfill({ status: 200, contentType: 'text/csv', body: 'task_code,status\nPW-TASK-0001,ready\n' });
    if (path === '/execution-tasks/options') return fulfillJson(route, setup.optionsReply ?? options);
    if (path === '/execution-tasks/summary') return fulfillJson(route, { ...summary, matching_task_count: setup.count ?? setup.rows?.length ?? 1 });
    if (path === '/execution-tasks' || path === '/execution-tasks/priority-queue') {
      const off = Number(url.searchParams.get('offset') || 0);
      const lim = Number(url.searchParams.get('limit') || 26);
      return fulfillJson(route, (setup.rows ?? [task]).slice(off, off + lim));
    }
    if (path === `/execution-tasks/${taskId}/audit`) return fulfillJson(route, setup.auditRows ?? []);
    if (path === `/execution-tasks/${taskId}`) return fulfillJson(route, setup.directTask ?? task);
    return fulfillJson(route, []);
  });
  await page.goto('/execution-tasks');
  await expect(page.getByRole('heading', { name: 'Operational task queue' })).toBeVisible();
  return { calls };
}
const listCalls = (calls: Call[]) => calls.filter(c => c.method === 'GET' && (c.path === '/execution-tasks' || c.path === '/execution-tasks/priority-queue'));
const queue = (page: Page) => page.locator('#execution-task-queue');

test.describe('Execution Tasks — queue, search, filtering and read-only evidence (Batch 42)', () => {
  test('TET-001 Hero explains tasks coordinate work, not direct stock changes', async ({ page }) => {
    await openTasks(page);
    await expect(page.getByText(/stock-changing actions remain governed by their source workflows/)).toBeVisible();
  });
  test('TET-002 Initial queue uses 25 visible rows plus one for next-page discovery', async ({ page }) => {
    const { calls } = await openTasks(page);
    await expect.poll(() => listCalls(calls)[0]?.query).toContain('limit=26');
    expect(listCalls(calls)[0].query).toContain('offset=0');
    expect(listCalls(calls)[0].query).toContain('open_only=true');
  });
  test('TET-003 Options and summary are separate API reads from task queue', async ({ page }) => {
    const { calls } = await openTasks(page);
    await expect.poll(() => ['/execution-tasks','/execution-tasks/options','/execution-tasks/summary'].every(p => calls.some(c => c.path === p && c.method === 'GET'))).toBe(true);
    await expect(queue(page).getByRole('button', { name: 'PW-TASK-0001' })).toBeVisible();
  });
  test('TET-004 Empty queue presents explicit empty state, not synthetic task row', async ({ page }) => {
    await openTasks(page, { rows: [], count: 0 });
    await expect(queue(page).getByText('No execution tasks match the current filters.')).toBeVisible();
    await expect(queue(page).getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  test('TET-005 Queue GET failure surfaces error without invented queue record', async ({ page }) => {
    await openTasks(page, { errorPath: '/execution-tasks' });
    await expect(page.getByRole('alert')).toContainText('Synthetic task API offline');
    await expect(queue(page).getByRole('button', { name: 'PW-TASK-0001' })).toHaveCount(0);
  });
  test('TET-006 Options service failure warns while queue task remains readable', async ({ page }) => {
    await openTasks(page, { errorPath: '/execution-tasks/options' });
    await expect(page.getByRole('alert')).toContainText('Task options could not be loaded.');
    await expect(queue(page).getByRole('button', { name: 'PW-TASK-0001' })).toBeVisible();
  });
  test('TET-007 Summary service failure reports error instead of claiming healthy totals', async ({ page }) => {
    await openTasks(page, { errorPath: '/execution-tasks/summary' });
    await expect(page.getByRole('alert')).toContainText('Synthetic task API offline');
  });
  test('TET-008 Debounced search is trimmed and sent to queue', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Search').fill('  handoff  ');
    await expect.poll(() => listCalls(calls).some(c => new URLSearchParams(c.query).get('search') === 'handoff')).toBe(true);
  });
  test('TET-009 Status filter narrows query to in_progress and resets offset', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Status', { exact: true }).selectOption('in_progress');
    await expect.poll(() => listCalls(calls).some(c => c.query.includes('status=in_progress') && c.query.includes('offset=0'))).toBe(true);
  });
  test('TET-010 Task type filter requests cycle_count', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Task type').selectOption('cycle_count');
    await expect.poll(() => listCalls(calls).some(c => c.query.includes('task_type=cycle_count'))).toBe(true);
  });
  test('TET-011 Priority filter requests urgent jobs only', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Priority', { exact: true }).selectOption('urgent');
    await expect.poll(() => listCalls(calls).some(c => c.query.includes('priority=urgent'))).toBe(true);
  });
  test('TET-012 Source filter requests reservation tasks without mutating records', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Source', { exact: true }).selectOption('reservation');
    await expect.poll(() => listCalls(calls).some(c => c.query.includes('source_type=reservation'))).toBe(true);
    expect(calls.some(c => c.method === 'POST')).toBe(false);
  });
  test('TET-013 Assignee filter sends chosen operator ID', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Assigned operator').selectOption(person.id);
    await expect.poll(() => listCalls(calls).some(c => c.query.includes(`assigned_to=${person.id}`))).toBe(true);
  });
  test('TET-014 Storage location filter restricts query by selected location ID', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Storage location').selectOption(location.id);
    await expect.poll(() => listCalls(calls).some(c => c.query.includes(`storage_location_id=${location.id}`))).toBe(true);
  });
  test('TET-015 50-row page size fetches 51 to detect next page', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Rows per page').selectOption('50');
    await expect.poll(() => listCalls(calls).some(c => c.query.includes('limit=51') && c.query.includes('offset=0'))).toBe(true);
  });
  test('TET-016 Open-only checkbox off requests completed and cancelled rows too', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Open tasks only').uncheck();
    await expect.poll(() => listCalls(calls).some(c => c.query.includes('open_only=false'))).toBe(true);
  });
  test('TET-017 Priority-order mode uses separate priority endpoint and locks search', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByRole('button', { name: 'Use priority order' }).click();
    await expect.poll(() => calls.some(c => c.path === '/execution-tasks/priority-queue' && c.query.includes('open_only=true'))).toBe(true);
    await expect(queue(page).getByLabel('Search')).toBeDisabled();
    await expect(queue(page).getByRole('button', { name: 'Priority order on' })).toBeVisible();
  });
  test('TET-018 Clear filters restores defaults and first page', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Priority', { exact: true }).selectOption('high');
    await queue(page).getByLabel('Search').fill('demo');
    await queue(page).getByRole('button', { name: 'Clear filters' }).click();
    await expect(queue(page).getByLabel('Priority', { exact: true })).toHaveValue('all');
    await expect(queue(page).getByLabel('Search')).toHaveValue('');
    await expect.poll(() => listCalls(calls).some(c => c.query.includes('offset=0') && !c.query.includes('priority=high') && !c.query.includes('search='))).toBe(true);
  });
  test('TET-019 Next and Previous pagination sends 25-row offsets', async ({ page }) => {
    const rows = Array.from({ length: 51 }, (_, i) => ({ ...task, id: `12345678-1234-4234-8234-${String(i+1).padStart(12,'0')}`, task_code: `PW-TASK-${String(i+1).padStart(4,'0')}` }));
    const { calls } = await openTasks(page, { rows, count: 51 });
    await queue(page).getByRole('button', { name: 'Next' }).click();
    await expect.poll(() => listCalls(calls).some(c => c.query.includes('offset=25'))).toBe(true);
    await queue(page).getByRole('button', { name: 'Previous' }).click();
    await expect.poll(() => listCalls(calls).filter(c => c.query.includes('offset=0')).length).toBeGreaterThanOrEqual(2);
  });
  test('TET-020 Invalid advanced source UUID blocks a new queue request', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByText('Advanced ID and batch filters', { exact: true }).click();
    await queue(page).getByLabel('Source ID').fill('invalid-source');
    await expect(queue(page).getByLabel('Source ID')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert')).toContainText('Source ID must be a valid UUID.');
    expect(listCalls(calls).some(c => c.query.includes('source_id=invalid-source'))).toBe(false);
  });
});


// Batch 43 — task details, synthetic mutation UX and management. These cases cannot
// establish backend persistence, audit authorization, or cross-tenant safety.
const detail = (page: Page) => page.locator('#execution-task-detail');
const createTaskPanel = (page: Page) => page.locator('#execution-task-create');
const management = (page: Page) => page.locator('#execution-task-management');
const advancedCreate = (page: Page) => createTaskPanel(page).locator('details.execution-tasks-create-advanced');
const batchId = '12345678-1234-4234-8234-123456789004';
const draftBatch = { id: batchId, batch_code: 'PW-BATCH-01', title: 'Synthetic pick batch', batch_type: 'manual', status: 'draft', priority: 'normal', task_count: 1, open_task_count: 1, completed_task_count: 0, storage_location_id: null, due_at: null, sla_due_at: null };
const currentSessionId = async (page: Page): Promise<string> => page.evaluate(() => {
  const token = localStorage.getItem('inventory_access_token');
  if (!token) throw new Error('A disposable authenticated tenant token is required');
  const payload = JSON.parse(atob((token.split('.')[1] || '').replace(/-/g, '+').replace(/_/g, '/'))) as { id?: string; user_id?: string };
  const id = payload.id || payload.user_id;
  if (!id) throw new Error('The disposable tenant JWT is missing a user ID');
  return id;
});

test.describe('Execution Tasks — task detail and controlled task actions (Batch 43)', () => {
  test('TET-021 Clicking queue task selects detail and records task_id in the URL', async ({ page }) => {
    await openTasks(page);
    await queue(page).getByRole('button', { name: task.task_code }).click();
    await expect(page).toHaveURL(new RegExp(`task_id=${taskId}`));
    await expect(detail(page).getByText(task.title)).toBeVisible();
  });
  test('TET-022 Out-of-filter selected task displays explicit notice and retains detail', async ({ page }) => {
    await loginAsTenant(page);
    const calls: Call[] = [];
    await page.route('**/api/execution-tasks**', async route => {
      const u = new URL(route.request().url());
      calls.push({ path: u.pathname, method: route.request().method(), query: u.search });
      if (u.pathname.endsWith('/summary')) return fulfillJson(route, { ...summary, matching_task_count: 0 });
      if (u.pathname.endsWith('/options')) return fulfillJson(route, options);
      if (u.pathname.endsWith(`/${taskId}/audit`)) return fulfillJson(route, []);
      if (u.pathname.endsWith(`/${taskId}`)) return fulfillJson(route, task);
      return fulfillJson(route, []);
    });
    await page.goto(`/execution-tasks?task_id=${taskId}`);
    await expect(page.getByText(/Selected task is outside the current queue filters/)).toBeVisible();
    await expect(detail(page).getByText(task.title)).toBeVisible();
    expect(calls.some(c => c.path.endsWith(`/${taskId}`))).toBe(true);
  });
  test('TET-023 Invalid linked task ID shows validation and does not request its detail endpoint', async ({ page }) => {
    const { calls } = await openTasks(page);
    await page.goto('/execution-tasks?task_id=not-a-uuid');
    await expect(page.getByRole('alert')).toContainText('The linked execution task ID is invalid.');
    expect(calls.some(c => c.path.endsWith('/not-a-uuid'))).toBe(false);
  });
  test('TET-024 Valid linked task missing from page requests single-record detail', async ({ page }) => {
    const { calls } = await openTasks(page, { rows: [], count: 0 });
    await page.goto(`/execution-tasks?taskId=${taskId}`);
    await expect(detail(page).getByText(task.title)).toBeVisible();
    await expect.poll(() => calls.some(c => c.path.endsWith(`/${taskId}`))).toBe(true);
  });
  test('TET-025 Selected task requests bounded audit history and renders action', async ({ page }) => {
    const { calls } = await openTasks(page, { auditRows: [{ id: 'audit-01', action: 'created', entity_type: 'execution_task', entity_id: taskId, user_id: null, created_at: stamp }] });
    await detail(page).getByText(/Audit trail \(1\)/).click();
    await expect(detail(page).getByText('Created', { exact: true }).last()).toBeVisible();
    await expect.poll(() => calls.some(c => c.path === `/execution-tasks/${taskId}/audit` && c.query.includes('limit=100'))).toBe(true);
  });
  test('TET-026 Create button disabled until three-character title', async ({ page }) => {
    await openTasks(page);
    const c = createTaskPanel(page);
    await expect(c.getByRole('button', { name: 'Create task' })).toBeDisabled();
    await c.getByLabel('Title').fill('ab');
    await expect(c.getByText('Enter a title with at least three characters.')).toBeVisible();
    await c.getByLabel('Title').fill('abc');
    await expect(c.getByRole('button', { name: 'Create task' })).toBeEnabled();
  });
  test('TET-027 Create trims title and description in synthetic POST body', async ({ page }) => {
    const { calls } = await openTasks(page);
    await createTaskPanel(page).getByLabel('Title').fill('  Counts handoff  ');
    await createTaskPanel(page).getByLabel('Description').fill('  Count shelves  ');
    await createTaskPanel(page).getByRole('button', { name: 'Create task' }).click();
    await expect.poll(() => calls.some(c => c.path === '/execution-tasks' && c.method === 'POST')).toBe(true);
    const body = calls.find(c => c.path === '/execution-tasks' && c.method === 'POST')?.payload as Record<string, unknown>;
    expect(body.title).toBe('Counts handoff');
    expect(body.description).toBe('Count shelves');
  });
  test('TET-028 Non-manual source requires linked source ID before creation', async ({ page }) => {
    const { calls } = await openTasks(page);
    await createTaskPanel(page).getByLabel('Title').fill('Receive shipment');
    await advancedCreate(page).locator('summary').click();
    await advancedCreate(page).getByLabel('Source type').selectOption('purchase_order');
    await expect(createTaskPanel(page).getByText(/A linked source ID is required/)).toBeVisible();
    await expect(createTaskPanel(page).getByRole('button', { name: 'Create task' })).toBeDisabled();
    expect(calls.some(c => c.method === 'POST')).toBe(false);
  });
  test('TET-029 Non-manual source rejects malformed linked UUID in create form', async ({ page }) => {
    await openTasks(page);
    await createTaskPanel(page).getByLabel('Title').fill('Check purchase order');
    await advancedCreate(page).locator('summary').click();
    await advancedCreate(page).getByLabel('Source type').selectOption('purchase_order');
    await advancedCreate(page).getByLabel('Source ID').fill('invalid');
    await expect(createTaskPanel(page).getByText('Source ID must be a valid UUID.')).toBeVisible();
    await expect(createTaskPanel(page).getByRole('button', { name: 'Create task' })).toBeDisabled();
  });
  test('TET-030 Optional facility UUID invalidates create form but does not trigger write', async ({ page }) => {
    const { calls } = await openTasks(page);
    await createTaskPanel(page).getByLabel('Title').fill('Facility audit');
    await advancedCreate(page).locator('summary').click();
    await advancedCreate(page).getByLabel('Facility ID').fill('bad-facility');
    await expect(createTaskPanel(page).getByText('Facility ID must be a valid UUID.')).toBeVisible();
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0);
  });
  test('TET-031 Unqualified assignee is disabled in create form options', async ({ page }) => {
    const restricted = { ...person, id: '12345678-1234-4234-8234-123456789007', name: 'Unqualified Worker', can_be_assigned: false, execution_task_capability: { can_read: true, can_update: false, can_complete: false, can_work_and_complete: false, missing_permissions: ['execution_tasks.complete'] } };
    await openTasks(page, { optionsReply: { ...options, users: [person, restricted], active_users: [person, restricted] } });
    await expect(createTaskPanel(page).getByLabel('Assign to').locator(`option[value="${restricted.id}"]`)).toBeDisabled();
  });
  test('TET-032 Create carries selected metadata and converted due dates in intercepted POST', async ({ page }) => {
    const { calls } = await openTasks(page);
    const c = createTaskPanel(page);
    await c.getByLabel('Title').fill('Prepare inventory check');
    await c.getByLabel('Task type').selectOption('cycle_count');
    await c.getByLabel('Priority').selectOption('urgent');
    await c.getByLabel('Initial state').selectOption('ready');
    await c.getByLabel('Due at').fill('2026-11-04T09:00');
    await c.getByLabel('Storage location').selectOption(location.id);
    await c.getByRole('button', { name: 'Create task' }).click();
    await expect.poll(() => calls.some(x => x.method === 'POST' && x.path === '/execution-tasks')).toBe(true);
    const body = calls.find(x => x.method === 'POST' && x.path === '/execution-tasks')!.payload as Record<string, unknown>;
    expect(body).toMatchObject({ title: 'Prepare inventory check', task_type: 'cycle_count', priority: 'urgent', status: 'ready', storage_location_id: location.id, source_type: 'manual', source_id: null });
    expect(new Date(String(body.due_at)).toString()).not.toBe('Invalid Date');
  });
  test('TET-033 Create API rejection displays error without false success status', async ({ page }) => {
    await openTasks(page, { errorPath: '/execution-tasks' });
    await createTaskPanel(page).getByLabel('Title').fill('Prepare count');
    await createTaskPanel(page).getByRole('button', { name: 'Create task' }).click();
    await expect(page.getByRole('alert')).toContainText('Synthetic task API offline');
    await expect(page.getByText(/Created PW-TASK/)).toHaveCount(0);
  });
  test('TET-034 Draft task mark-ready sends dedicated transition POST', async ({ page }) => {
    const { calls } = await openTasks(page, { rows: [{ ...task, status: 'draft' }] });
    await queue(page).getByRole('button', { name: 'Mark ready' }).click();
    await expect.poll(() => calls.some(c => c.path === `/execution-tasks/${taskId}/ready` && c.method === 'POST')).toBe(true);
  });
  test('TET-035 Assignment modal requires operator selection before confirm', async ({ page }) => {
    await openTasks(page);
    await queue(page).getByRole('button', { name: 'Assign' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Assign to').selectOption('');
    await expect(dialog.getByRole('button', { name: 'Confirm assign' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
  test('TET-036 Assignment modal disables worker without complete capability', async ({ page }) => {
    const restricted = { ...person, id: '12345678-1234-4234-8234-123456789007', name: 'No Completion Rights', can_be_assigned: false, execution_task_capability: { can_read: true, can_update: true, can_complete: false, can_work_and_complete: false, missing_permissions: ['execution_tasks.complete'] } };
    await openTasks(page, { optionsReply: { ...options, active_users: [person, restricted] } });
    await queue(page).getByRole('button', { name: 'Assign' }).click();
    await expect(page.getByRole('dialog').getByLabel('Assign to').locator(`option[value="${restricted.id}"]`)).toBeDisabled();
  });
  test('TET-037 Assigning qualified worker sends only selected assigned_to ID', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByRole('button', { name: 'Assign' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Assign to').selectOption(person.id);
    await dialog.getByRole('button', { name: 'Confirm assign' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/assign') && c.method === 'POST')).toBe(true);
    expect(calls.find(c => c.path.endsWith('/assign'))?.payload).toEqual({ assigned_to: person.id });
  });
  test('TET-038 Block modal rejects whitespace-only reason', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByRole('button', { name: 'Block' }).click();
    await page.getByRole('dialog').getByLabel('Blocked reason').fill('  ');
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Confirm block' })).toBeDisabled();
    expect(calls.some(c => c.path.endsWith('/block'))).toBe(false);
  });
  test('TET-039 Block action trims provided reason in synthetic POST', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByRole('button', { name: 'Block' }).click();
    await page.getByRole('dialog').getByLabel('Blocked reason').fill('  Waiting for delivery  ');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm block' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/block') && c.method === 'POST')).toBe(true);
    expect(calls.find(c => c.path.endsWith('/block'))?.payload).toEqual({ blocked_reason: 'Waiting for delivery' });
  });
  test('TET-040 Blocked task offers direct Unblock transition', async ({ page }) => {
    const { calls } = await openTasks(page, { rows: [{ ...task, status: 'blocked' }] });
    await queue(page).getByRole('button', { name: 'Unblock' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/unblock') && c.method === 'POST')).toBe(true);
  });
  test('TET-041 Start is omitted when task is assigned to another worker', async ({ page }) => {
    await openTasks(page, { rows: [{ ...task, assigned_to: '00000000-0000-4000-8000-000000000099' }] });
    await expect(queue(page).getByRole('button', { name: 'Start' })).toHaveCount(0);
    await expect(queue(page).getByRole('button', { name: 'Complete' })).toHaveCount(0);
  });
  test('TET-042 Linked execution request not ready blocks start and completion', async ({ page }) => {
    await openTasks(page, { rows: [{ ...task, source_type: 'execution_request', source_completion_ready: false, source_id: '12345678-1234-4234-8234-123456789009' }] });
    await expect(queue(page).getByText('Waiting for source execution')).toBeVisible();
    await expect(queue(page).getByRole('button', { name: 'Start' })).toHaveCount(0);
    await expect(detail(page).getByText('Complete the linked Execution Request with real execution or no-op execution before closing this task.')).toBeVisible();
  });
  test('TET-043 Current assigned worker can complete with optional note via confirmation', async ({ page }) => {
    await loginAsDisposableRole(page, 'PW_ET_ASSIGNEE');
    const id = await currentSessionId(page);
    const calls: Call[] = [];
    await page.route('**/api/execution-tasks**', async (route: Route) => {
      const url = new URL(route.request().url()); const path = url.pathname.replace(/^\/api(?=\/)/, '');
      let payload: unknown; try { payload = route.request().postDataJSON(); } catch { /* GET */ }
      calls.push({ path, query: url.search, method: route.request().method(), payload });
      if (route.request().method() === 'POST') return fulfillJson(route, { ...task, assigned_to: id, status: 'completed', completion_note: 'Done' });
      if (path === '/execution-tasks/options') return fulfillJson(route, options);
      if (path === '/execution-tasks/summary') return fulfillJson(route, summary);
      if (path.endsWith('/audit')) return fulfillJson(route, []);
      return fulfillJson(route, [{ ...task, assigned_to: id }]);
    });
    await page.goto('/execution-tasks');
    await expect(queue(page).getByRole('button', { name: 'Complete' })).toBeVisible();
    await queue(page).getByRole('button', { name: 'Complete' }).click();
    await page.getByRole('dialog').getByLabel('Completion note (optional)').fill('  Completed inventory review  ');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm complete' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/complete') && c.method === 'POST')).toBe(true);
    expect(calls.find(c => c.path.endsWith('/complete'))?.payload).toEqual({ completion_note: 'Completed inventory review' });
  });
  test('TET-044 Cancellation dialog needs three-character reason, then posts trimmed reason', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByRole('button', { name: 'Cancel' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Cancellation reason').fill('x');
    await expect(modal.getByRole('button', { name: 'Confirm cancel' })).toBeDisabled();
    await modal.getByLabel('Cancellation reason').fill('  No longer needed  ');
    await modal.getByRole('button', { name: 'Confirm cancel' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/cancel') && c.method === 'POST')).toBe(true);
    expect(calls.find(c => c.path.endsWith('/cancel'))?.payload).toEqual({ cancellation_reason: 'No longer needed' });
  });
  test('TET-045 Draft management batch can be released via dedicated action', async ({ page }) => {
    const { calls } = await openTasks(page, { batchRows: [draftBatch] });
    await management(page).locator('summary').first().click();
    await management(page).getByRole('button', { name: 'Release' }).click();
    await expect.poll(() => calls.some(c => c.path === `/execution-tasks/batches/${batchId}/release` && c.method === 'POST')).toBe(true);
  });
  test('TET-046 Batch cancellation requires a reason and posts it to batch endpoint', async ({ page }) => {
    const { calls } = await openTasks(page, { batchRows: [draftBatch] });
    await management(page).locator('summary').first().click();
    await management(page).getByRole('button', { name: 'Cancel' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Cancellation reason').fill('  ');
    await expect(modal.getByRole('button', { name: 'Confirm cancel' })).toBeDisabled();
    await modal.getByLabel('Cancellation reason').fill('  Batch superseded  ');
    await modal.getByRole('button', { name: 'Confirm cancel' }).click();
    await expect.poll(() => calls.some(c => c.path === `/execution-tasks/batches/${batchId}/cancel` && c.method === 'POST')).toBe(true);
    expect(calls.find(c => c.path === `/execution-tasks/batches/${batchId}/cancel`)?.payload).toEqual({ cancellation_reason: 'Batch superseded' });
  });
  test('TET-047 Management analytics load on expansion, with errors isolated from queue', async ({ page }) => {
    const { calls } = await openTasks(page, { analyticsErrorPath: '/execution-tasks/workload' });
    expect(calls.some(c => c.path === '/execution-tasks/workload')).toBe(false);
    await management(page).locator('summary').first().click();
    await expect.poll(() => calls.some(c => c.path === '/execution-tasks/workload')).toBe(true);
    await expect(management(page)).toContainText('Operational task work remains available, but management analysis could not be loaded:');
    await expect(queue(page).getByRole('button', { name: task.task_code })).toBeVisible();
  });
  test('TET-048 Management analytics queries use bounded time and queue limits', async ({ page }) => {
    const { calls } = await openTasks(page);
    await management(page).locator('summary').first().click();
    await expect.poll(() => calls.some(c => c.path === '/execution-tasks/throughput-dashboard')).toBe(true);
    expect(calls.find(c => c.path === '/execution-tasks/throughput-dashboard')?.query).toContain('days=14');
    expect(calls.find(c => c.path === '/execution-tasks/sla-queue')?.query).toContain('limit=25');
    expect(calls.find(c => c.path === '/execution-tasks/mobile-queue')?.query).toContain('limit=20');
    expect(calls.find(c => c.path === '/execution-tasks/batches')?.query).toContain('limit=50');
  });
  test('TET-049 Filtered task CSV export requests bounded server analytics', async ({ page }) => {
    const { calls } = await openTasks(page);
    await queue(page).getByLabel('Task type').selectOption('cycle_count');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export filtered CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^execution-task-analytics-\d{4}-\d\d-\d\d\.csv$/);
    await expect.poll(() => calls.some(c => c.path === '/execution-tasks/analytics.csv')).toBe(true);
    expect(calls.find(c => c.path === '/execution-tasks/analytics.csv')?.query).toContain('limit=10000');
    expect(calls.find(c => c.path === '/execution-tasks/analytics.csv')?.query).toContain('task_type=cycle_count');
  });
  test('TET-050 Restricted read-only task role sees queue but not mutation controls', async ({ page }) => {
    await loginAsDisposableRole(page, 'PW_ET_READ_ONLY');
    await page.route('**/api/execution-tasks**', async (route: Route) => {
      const path = new URL(route.request().url()).pathname.replace(/^\/api(?=\/)/, '');
      if (path === '/execution-tasks/options') return fulfillJson(route, options);
      if (path === '/execution-tasks/summary') return fulfillJson(route, summary);
      if (path.endsWith('/audit')) return fulfillJson(route, []);
      return fulfillJson(route, [task]);
    });
    await page.goto('/execution-tasks');
    await expect(queue(page).getByRole('button', { name: task.task_code })).toBeVisible();
    await expect(createTaskPanel(page).getByText('Your role can view execution tasks but cannot create new ones.')).toBeVisible();
    await expect(queue(page).getByRole('button', { name: 'Assign' })).toHaveCount(0);
    await expect(queue(page).getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  });
});
