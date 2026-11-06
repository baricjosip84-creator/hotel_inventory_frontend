import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 43: actual frontend/src/pages/AutomationSchedulesPage.tsx and
// backend/src/routes/automationSchedules.js. Synthetic transport is used only
// for observable UI request and state transitions, never proof of runner safety,
// real tenancy, persisted review evidence or backend permission enforcement.
const scheduleId = '12345678-1234-4234-8234-123456789101';
const ts = '2026-11-03T11:00:00.000Z';
const schedule = {
  id: scheduleId, name: 'Synthetic weekly audit', description: 'Prepare reviewable evidence',
  tenant_id: 'pw-disposable-tenant', automation_type: 'cost_risk_review',
  schedule_kind: 'weekly', status: 'draft', version: 1,
  schedule_config: { frequency: 'weekly', time: '09:00', timezone: 'Europe/Zagreb', day_of_week: 2 },
  request_defaults: { default_status: 'draft' }, created_at: ts, updated_at: ts,
  last_run_at: null, next_run_at: null, type_definition: { label: 'Cost Risk Review' }, timeline: []
};
const types = { automation_types: [
  { automation_type: 'cost_risk_review', label: 'Cost Risk Review', description: 'Review cost-risk signals', default_request_type: 'cost_review', executes_actions: false, creates_execution_requests_later: true, risk_level: 'low' },
  { automation_type: 'system_context_review', label: 'System Context Review', description: 'Review system context', default_request_type: 'system_recommendation', executes_actions: false, creates_execution_requests_later: true, risk_level: 'low' }
] };
const readiness = { totals: { total_schedules: 1, draft_schedules: 1, active_schedules: 0, paused_schedules: 0, disabled_schedules: 0, due_schedule_count: 0 } };
const runner = { production_safety_lock: { global_disable: false, tenant_request_creation_enabled: true }, request_creation_enabled: true, unsafe_runner_output_review_acknowledge_allowed: false };

const dryRunResult = {
  schedule, would_create_execution_request: true, would_execute_request: false,
  would_mutate_inventory: false, candidate_request: { status: 'draft', request_type: 'cost_review' },
  checks: [{ key: 'preview-safe', label: 'Synthetic preview only', status: 'pass', detail: 'Review is required.' }]
};
const manualRunResult = {
  schedule, duplicate_guard_triggered: true, created_execution_request_count: 0,
  execution_request: { id: '12345678-1234-4234-8234-123456789102', status: 'draft' },
  checks: [{ key: 'review', label: 'Approval pending', status: 'pass', detail: 'No auto-execution.' }]
};
const auditPack = {
  completeness: { complete: true },
  evidence_summary: { schedule_audit_event_count: 1, execution_request_count: 1, run_event_count: 1 },
  checks: [{ key: 'evidence', label: 'Synthetic evidence present', status: 'pass', detail: 'Await backend verification.' }],
  audit_trail: { automation_schedule: [{ id: 'audit001', action: 'automation_schedule.disabled', user_name: 'Fixture operator', created_at: ts, metadata: { previous_status: 'draft', next_status: 'disabled', disabled_reason: 'Policy changed' } }] },
  linked_execution_requests: [{ id: 'req001', request_type: 'cost_review', status: 'pending_review', execution_status: 'not_started', created_at: ts }]
};
const runOnceResult = {
  processed_schedule_count: 2, created_execution_request_count: 1,
  skipped_schedule_count: 1, failed_schedule_count: 0
};

type ApiCall = { path: string; method: string; search: string; data?: unknown };
type Options = {
  rows?: typeof schedule[]; total?: number; errorAt?: string; warningAt?: string;
  entitlementAllowed?: boolean; calls?: ApiCall[]; typesResponse?: unknown;
  runnerResponse?: unknown; readinessResponse?: unknown;
  detailResponse?: unknown; createResponse?: unknown; updatedResponse?: unknown;
  createReject?: boolean;
  dryRunResponse?: unknown; manualRunResponse?: unknown;
  auditResponse?: unknown; runOnceResponse?: unknown;
  runEventsResponse?: unknown; acknowledgeResponse?: unknown;
};
const registry = (page: Page) => page.locator('#automation-schedule-registry');
const create = (page: Page) => page.locator('#automation-schedule-create');
const detail = (page: Page) => page.locator('#automation-schedule-detail');
const scheduleCalls = (calls: ApiCall[]) => calls.filter(c => c.path === '/automation-schedules' && c.method === 'GET');
async function openSchedules(page: Page, options: Options = {}) {
  await loginAsTenant(page);
  const calls = options.calls ?? [];
  await page.route('**/*', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const u = new URL(route.request().url());
    const path = u.pathname.replace(/^\/api(?=\/)/, '');
    if (path !== '/tenants/subscription-access' && !path.startsWith('/automation-schedules')) return route.continue();
    let data: unknown;
    try { data = route.request().postDataJSON(); } catch { data = undefined; }
    calls.push({ path, method: route.request().method(), search: u.search, data });
    if (path === '/tenants/subscription-access') return fulfillJson(route, {
      tenant: { id: 'pw-disposable-tenant', name: 'Synthetic tenant', billing_status: 'active', status: 'active', plan_code: 'test' },
      write_access: { allowed: true, blocker: null }, plan_usage: [], plan_limit_blocked_resources: [],
      feature_entitlements: [{ feature: 'automation', allowed: options.entitlementAllowed !== false }]
    });
    if (options.errorAt === path || options.warningAt === path) return fulfillJson(route, { message: 'Synthetic automation API unavailable' }, 503);
    if (path === '/automation-schedules/types') return fulfillJson(route, options.typesResponse ?? types);
    if (path === '/automation-schedules/runner-readiness') return fulfillJson(route, options.readinessResponse ?? readiness);
    if (path === '/automation-schedules/runner-status') return fulfillJson(route, options.runnerResponse ?? runner);
    if (path === '/automation-schedules/runner/run-once' && route.request().method() === 'POST') return fulfillJson(route, options.runOnceResponse ?? runOnceResult);
    if (path === '/automation-schedules/runner/unsafe-output-review/acknowledge' && route.request().method() === 'POST') return fulfillJson(route, options.acknowledgeResponse ?? runner);
    if (path === `/automation-schedules/${scheduleId}/dry-run` && route.request().method() === 'POST') return fulfillJson(route, options.dryRunResponse ?? dryRunResult);
    if (path === `/automation-schedules/${scheduleId}/run` && route.request().method() === 'POST') return fulfillJson(route, options.manualRunResponse ?? manualRunResult);
    if (path === `/automation-schedules/${scheduleId}/audit-pack`) return fulfillJson(route, options.auditResponse ?? auditPack);
    if (path === `/automation-schedules/${scheduleId}/pause` && route.request().method() === 'POST') return fulfillJson(route, options.updatedResponse ?? { ...schedule, status: 'paused', version: 2 });
    if (path === `/automation-schedules/${scheduleId}/resume` && route.request().method() === 'POST') return fulfillJson(route, options.updatedResponse ?? { ...schedule, status: 'active', version: 2 });
    if (path === `/automation-schedules/${scheduleId}/disable` && route.request().method() === 'POST') return fulfillJson(route, options.updatedResponse ?? { ...schedule, status: 'disabled', version: 2 });
    if (path === '/automation-schedules') {
      if (route.request().method() === 'POST') {
        if (options.createReject) return fulfillJson(route, { message: 'Synthetic create rejected' }, 422);
        return fulfillJson(route, options.createResponse ?? { ...schedule, name: (data as { name?: string })?.name ?? schedule.name }, 201);
      }
      const rows = options.rows ?? [schedule];
      const offset = Number(u.searchParams.get('offset') || 0);
      const limit = Number(u.searchParams.get('limit') || 25);
      return fulfillJson(route, { rows: rows.slice(offset, offset + limit), total: options.total ?? rows.length });
    }
    if (path === `/automation-schedules/${scheduleId}`) {
      if (route.request().method() === 'PATCH') return fulfillJson(route, options.updatedResponse ?? { ...schedule, version: 2, name: (data as { name?: string })?.name ?? schedule.name });
      return fulfillJson(route, options.detailResponse ?? schedule);
    }
    if (path === '/automation-schedules/run-events') return fulfillJson(route, options.runEventsResponse ?? { rows: [], total: 0 });
    return fulfillJson(route, { message: 'No synthetic schedule response configured' }, 404);
  });
  await page.goto('/automation-schedules');
  await expect(page.getByRole('heading', { name: 'Automation schedules' })).toBeVisible();
  return { calls };
}

test.describe('Automation Schedules — registry and creation (Batch 43)', () => {
  test('TAS-001 Hero distinguishes review scheduling from stock-changing execution', async ({ page }) => {
    await openSchedules(page);
    await expect(page.getByText('Schedules never approve or execute changes automatically.')).toBeVisible();
  });
  test('TAS-002 Initial load fetches list types readiness and runner status separately', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await expect.poll(() => ['/automation-schedules', '/automation-schedules/types', '/automation-schedules/runner-readiness', '/automation-schedules/runner-status'].every(p => calls.some(c => c.path === p && c.method === 'GET'))).toBe(true);
  });
  test('TAS-003 Empty registry explains that no schedule matches current filters', async ({ page }) => {
    await openSchedules(page, { rows: [], total: 0 });
    await expect(registry(page).getByText('No schedules match the current filters.')).toBeVisible();
    await expect(registry(page).getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  test('TAS-004 List endpoint failure shows an error rather than synthetic rows', async ({ page }) => {
    await openSchedules(page, { errorAt: '/automation-schedules' });
    await expect(page.getByRole('alert')).toContainText('Synthetic automation API unavailable');
    await expect(registry(page).getByRole('button', { name: schedule.name })).toHaveCount(0);
  });
  test('TAS-005 Failed type guidance preserves fallback review type selector', async ({ page }) => {
    await openSchedules(page, { warningAt: '/automation-schedules/types' });
    await expect(page.getByRole('status')).toContainText('Schedule type guidance could not be refreshed.');
    await expect(create(page).getByLabel('Review type')).toContainText('Cost Risk Review');
  });
  test('TAS-006 Failed readiness summary warns without discarding schedule list', async ({ page }) => {
    await openSchedules(page, { warningAt: '/automation-schedules/runner-readiness' });
    await expect(page.getByRole('status')).toContainText('Runner readiness summary could not be refreshed.');
    await expect(registry(page).getByRole('button', { name: schedule.name })).toBeVisible();
  });
  test('TAS-007 Runner safety status failure warns and withholds request creation', async ({ page }) => {
    const { calls } = await openSchedules(page, { warningAt: '/automation-schedules/runner-status' });
    await expect(page.getByRole('status')).toContainText('Automation safety status could not be loaded.');
    expect(calls.filter(c => c.path.endsWith('/run') && c.method === 'POST')).toHaveLength(0);
  });
  test('TAS-008 Unentitled tenant never calls automation schedule endpoints', async ({ page }) => {
    const { calls } = await openSchedules(page, { entitlementAllowed: false });
    await expect(page.getByText('Automation schedules are not included in this tenant plan')).toBeVisible();
    expect(calls.filter(c => c.path.startsWith('/automation-schedules'))).toHaveLength(0);
  });
  test('TAS-009 Search debounces, trims and resets registry offset', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await registry(page).getByLabel('Search').fill('  weekly audit  ');
    await expect.poll(() => scheduleCalls(calls).some(c => c.search.includes('search=weekly+audit') && c.search.includes('offset=0'))).toBe(true);
  });
  test('TAS-010 Status filter requests only active schedules and starts at first page', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await registry(page).getByLabel('Status').selectOption('active');
    await expect.poll(() => scheduleCalls(calls).some(c => c.search.includes('status=active') && c.search.includes('offset=0'))).toBe(true);
  });
  test('TAS-011 Review type filter uses documented automation_type query key', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await registry(page).getByLabel('Review type').selectOption('system_context_review');
    await expect.poll(() => scheduleCalls(calls).some(c => c.search.includes('automation_type=system_context_review'))).toBe(true);
  });
  test('TAS-012 Page size of 100 sets list limit and first offset', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await registry(page).getByLabel('Rows per page').selectOption('100');
    await expect.poll(() => scheduleCalls(calls).some(c => c.search.includes('limit=100') && c.search.includes('offset=0'))).toBe(true);
  });
  test('TAS-013 Next and Previous use total count, not optimistic row lengths', async ({ page }) => {
    const rows = Array.from({ length: 55 }, (_, i) => ({ ...schedule, id: `12345678-1234-4234-8234-${String(i + 200).padStart(12, '0')}`, name: `Synthetic ${i + 1}` }));
    const { calls } = await openSchedules(page, { rows, total: 55 });
    await registry(page).getByRole('button', { name: 'Next' }).click();
    await expect.poll(() => scheduleCalls(calls).some(c => c.search.includes('offset=25'))).toBe(true);
    await registry(page).getByRole('button', { name: 'Previous' }).click();
    await expect.poll(() => scheduleCalls(calls).filter(c => c.search.includes('offset=0')).length).toBeGreaterThanOrEqual(2);
  });
  test('TAS-014 Clear filters restores all-status all-types empty search', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await registry(page).getByLabel('Status').selectOption('paused');
    await registry(page).getByLabel('Search').fill('weekly');
    await registry(page).getByRole('button', { name: 'Clear filters' }).click();
    await expect(registry(page).getByLabel('Status')).toHaveValue('');
    await expect(registry(page).getByLabel('Search')).toHaveValue('');
    await expect.poll(() => { const latest = scheduleCalls(calls).at(-1)?.search || ''; return latest.includes('offset=0') && !latest.includes('status=') && !latest.includes('search='); }).toBe(true);
  });
  test('TAS-015 Selecting a schedule fetches full record and exposes detail', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await registry(page).getByRole('button', { name: schedule.name }).click();
    await expect.poll(() => calls.some(c => c.path === `/automation-schedules/${scheduleId}` && c.method === 'GET')).toBe(true);
    await expect(detail(page).getByText('Automatic execution')).toBeVisible();
    await expect(detail(page).getByText('No', { exact: true })).toBeVisible();
  });
  test('TAS-016 Registry renders weekly timing and unscheduled draft without a fake run', async ({ page }) => {
    await openSchedules(page);
    await expect(registry(page).getByText('Every Tuesday at 09:00 · Europe/Zagreb')).toBeVisible();
    await expect(registry(page).getByText('Not scheduled')).toBeVisible();
  });
  test('TAS-017 Create schedule rejects names shorter than three trimmed characters', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await create(page).getByLabel('Name').fill('  a  ');
    await expect(create(page).getByRole('button', { name: 'Create draft schedule' })).toBeDisabled();
    expect(calls.some(c => c.method === 'POST')).toBe(false);
  });
  test('TAS-018 Weekly form reveals weekday, local time, and timezone fields', async ({ page }) => {
    await openSchedules(page);
    await create(page).getByLabel('Frequency').selectOption('weekly');
    await expect(create(page).getByLabel('Weekday')).toBeVisible();
    await expect(create(page).getByLabel('Local time')).toBeVisible();
    await expect(create(page).getByLabel('Timezone')).toBeVisible();
    await create(page).getByLabel('Weekday').selectOption('5');
    await expect(create(page).getByLabel('Weekday')).toHaveValue('5');
  });
  test('TAS-019 Create draft trims name, sets safe manual config and request default', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await create(page).getByLabel('Name').fill('  New routine audit  ');
    await create(page).getByLabel('New request status').selectOption('pending_review');
    await create(page).getByRole('button', { name: 'Create draft schedule' }).click();
    await expect.poll(() => calls.some(c => c.path === '/automation-schedules' && c.method === 'POST')).toBe(true);
    const body = calls.find(c => c.path === '/automation-schedules' && c.method === 'POST')?.data as Record<string, unknown>;
    expect(body).toMatchObject({ name: 'New routine audit', schedule_kind: 'manual', request_defaults: { default_status: 'pending_review' }, schedule_config: { frequency: 'manual' } });
    await expect(page.getByRole('status')).toContainText('Created draft schedule');
  });
  test('TAS-020 Invalid IANA timezone stops scheduled creation with visible validation', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await create(page).getByLabel('Name').fill('Monthly review');
    await create(page).getByLabel('Frequency').selectOption('monthly');
    await create(page).getByLabel('Day of month').fill('15');
    await create(page).getByLabel('Timezone').fill('Invalid/Timezone');
    await create(page).getByRole('button', { name: 'Create draft schedule' }).click();
    await expect(page.getByRole('alert')).toContainText('Enter a valid IANA timezone');
    expect(calls.some(c => c.path === '/automation-schedules' && c.method === 'POST')).toBe(false);
  });
});


// Batch 44: detail editing, lifecycle, preview, evidence and safety UI.
// Synthetic GET/POST/PATCH responses cannot establish real server execution,
// durable persistence, audit integrity, tenant isolation or runner containment.
const rowActions = (page: Page) => registry(page).locator('tbody tr').filter({ has: page.getByRole('button', { name: schedule.name, exact: true }) });
async function selectSchedule(page: Page, options: Options = {}) {
  const result = await openSchedules(page, options);
  await registry(page).getByRole('button', { name: schedule.name, exact: true }).click();
  await expect(detail(page)).toBeVisible();
  return result;
}
const posted = (calls: ApiCall[], path: string, method = 'POST') => calls.filter(c => c.path === path && c.method === method);
const modal = (page: Page) => page.getByRole('dialog');

test.describe('Automation Schedules — lifecycle and safety (Batch 44)', () => {
  test('TAS-021 Daily cadence serializes local time and timezone into POST', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await create(page).getByLabel('Name').fill('Daily synthetic audit');
    await create(page).getByLabel('Frequency').selectOption('daily');
    await create(page).getByLabel('Local time').fill('18:45');
    await create(page).getByLabel('Timezone').fill('UTC');
    await create(page).getByRole('button', { name: 'Create draft schedule' }).click();
    await expect.poll(() => posted(calls, '/automation-schedules').length).toBe(1);
    expect(posted(calls, '/automation-schedules')[0].data).toMatchObject({ schedule_kind: 'daily', schedule_config: { frequency: 'daily', time: '18:45', timezone: 'UTC' } });
  });
  test('TAS-022 Weekly cadence sends explicit weekday and pending-review default', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await create(page).getByLabel('Name').fill('Weekly synthetic review');
    await create(page).getByLabel('Frequency').selectOption('weekly');
    await create(page).getByLabel('Weekday').selectOption('0');
    await create(page).getByLabel('New request status').selectOption('pending_review');
    await create(page).getByRole('button', { name: 'Create draft schedule' }).click();
    await expect.poll(() => posted(calls, '/automation-schedules').length).toBe(1);
    expect(posted(calls, '/automation-schedules')[0].data).toMatchObject({ schedule_kind: 'weekly', schedule_config: { frequency: 'weekly', day_of_week: 0 }, request_defaults: { default_status: 'pending_review' } });
  });
  test('TAS-023 Monthly day outside 1–31 rejects locally before POST', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await create(page).getByLabel('Name').fill('Monthly invalid day');
    await create(page).getByLabel('Frequency').selectOption('monthly');
    await create(page).getByLabel('Day of month').fill('32');
    await create(page).getByRole('button', { name: 'Create draft schedule' }).click();
    await expect(page.getByRole('alert')).toContainText('Monthly day must be between 1 and 31');
    expect(posted(calls, '/automation-schedules')).toHaveLength(0);
  });
  test('TAS-024 Month-end day 31 is encoded as day_of_month 31', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await create(page).getByLabel('Name').fill('Month-end review');
    await create(page).getByLabel('Frequency').selectOption('monthly');
    await create(page).getByLabel('Day of month').fill('31');
    await create(page).getByRole('button', { name: 'Create draft schedule' }).click();
    await expect.poll(() => posted(calls, '/automation-schedules').length).toBe(1);
    expect(posted(calls, '/automation-schedules')[0].data).toMatchObject({ schedule_kind: 'monthly', schedule_config: { day_of_month: 31 } });
  });
  test('TAS-025 Optional description is trimmed to null and input has 4000-character bound', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await expect(create(page).getByLabel('Description')).toHaveAttribute('maxlength', '4000');
    await create(page).getByLabel('Name').fill('No description review');
    await create(page).getByLabel('Description').fill('   ');
    await create(page).getByRole('button', { name: 'Create draft schedule' }).click();
    await expect.poll(() => posted(calls, '/automation-schedules').length).toBe(1);
    expect(posted(calls, '/automation-schedules')[0].data).toMatchObject({ description: null });
  });
  test('TAS-026 Create API rejection leaves entered form intact with a visible error', async ({ page }) => {
    const { calls } = await openSchedules(page, { createReject: true });
    await create(page).getByLabel('Name').fill('Preserve failed draft');
    await create(page).getByRole('button', { name: 'Create draft schedule' }).click();
    await expect(page.getByRole('alert')).toContainText('Synthetic create rejected');
    await expect(create(page).getByLabel('Name')).toHaveValue('Preserve failed draft');
    expect(posted(calls, '/automation-schedules')).toHaveLength(1);
  });
  test('TAS-027 Successful draft resets create form and selects new detail context', async ({ page }) => {
    await openSchedules(page);
    await create(page).getByLabel('Name').fill('New detail selection');
    await create(page).getByRole('button', { name: 'Create draft schedule' }).click();
    await expect(create(page).getByLabel('Name')).toHaveValue('');
    await expect(detail(page).getByText('New detail selection')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Created draft schedule');
  });
  test('TAS-028 Detail endpoint rejection raises error without inventing a selected record', async ({ page }) => {
    const { calls } = await openSchedules(page, { errorAt: `/automation-schedules/${scheduleId}` });
    await registry(page).getByRole('button', { name: schedule.name, exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Synthetic automation API unavailable');
    await expect(detail(page)).toHaveCount(0);
    expect(posted(calls, '/automation-schedules')).toHaveLength(0);
  });
  test('TAS-029 Edit and Reset restore server-loaded fields without PATCH', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Edit', exact: true }).click();
    const edit = page.locator('#automation-schedule-edit-form');
    await expect(edit.getByLabel('Name')).toHaveValue(schedule.name);
    await edit.getByLabel('Name').fill('Unsaved edit');
    await edit.getByRole('button', { name: 'Reset' }).click();
    await expect(edit.getByLabel('Name')).toHaveValue(schedule.name);
    expect(posted(calls, `/automation-schedules/${scheduleId}`, 'PATCH')).toHaveLength(0);
  });
  test('TAS-030 PATCH includes expected_version and edited schedule defaults', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Edit', exact: true }).click();
    const edit = page.locator('#automation-schedule-edit-form');
    await edit.getByLabel('Name').fill('Renamed weekly schedule');
    await edit.getByLabel('New request status').selectOption('pending_review');
    await edit.getByRole('button', { name: 'Save changes' }).click();
    await expect.poll(() => posted(calls, `/automation-schedules/${scheduleId}`, 'PATCH').length).toBe(1);
    expect(posted(calls, `/automation-schedules/${scheduleId}`, 'PATCH')[0].data).toMatchObject({ expected_version: 1, name: 'Renamed weekly schedule', request_defaults: { default_status: 'pending_review' } });
  });
  test('TAS-031 Update conflict reports server error and retains edit form', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Edit', exact: true }).click();
    await page.locator('#automation-schedule-edit-form').getByLabel('Name').fill('Conflict retained');
    await page.route(`**/api/automation-schedules/${scheduleId}`, async route => {
      if (route.request().method() === 'PATCH') return fulfillJson(route, { message: 'Version conflict: refresh required' }, 409);
      return route.continue();
    });
    await page.locator('#automation-schedule-edit-form').getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('alert')).toContainText('Version conflict');
    await expect(page.locator('#automation-schedule-edit-form').getByLabel('Name')).toHaveValue('Conflict retained');
    expect(posted(calls, `/automation-schedules/${scheduleId}`, 'PATCH')).toHaveLength(0);
  });
  test('TAS-032 Pausing an active schedule posts only the pause transition', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Pause' }).click();
    await expect.poll(() => posted(calls, `/automation-schedules/${scheduleId}/pause`).length).toBe(1);
    expect(posted(calls, `/automation-schedules/${scheduleId}/resume`)).toHaveLength(0);
    await expect(page.getByRole('status')).toContainText('Paused');
  });
  test('TAS-033 Activation dialog cancellation makes no resume request', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Activate' }).click();
    await expect(modal(page)).toContainText('Activate schedule');
    await modal(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(modal(page)).toHaveCount(0);
    expect(posted(calls, `/automation-schedules/${scheduleId}/resume`)).toHaveLength(0);
  });
  test('TAS-034 Activation confirmation posts /resume and shows safe next-run note', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Activate' }).click();
    await modal(page).getByRole('button', { name: 'Confirm' }).click();
    await expect.poll(() => posted(calls, `/automation-schedules/${scheduleId}/resume`).length).toBe(1);
    await expect(page.getByRole('status')).toContainText('old paused date will not be processed');
  });
  test('TAS-035 Disable reason minimum prevents confirmation and Cancel preserves schedule', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Disable' }).click();
    await expect(modal(page).getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await modal(page).getByLabel('Disable reason').fill('ab');
    await expect(modal(page).getByRole('button', { name: 'Confirm' })).toBeDisabled();
    await modal(page).getByRole('button', { name: 'Cancel' }).click();
    expect(posted(calls, `/automation-schedules/${scheduleId}/disable`)).toHaveLength(0);
  });
  test('TAS-036 Disable confirmation trims audit reason in transport body', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Disable' }).click();
    await modal(page).getByLabel('Disable reason').fill('  New governance policy  ');
    await modal(page).getByRole('button', { name: 'Confirm' }).click();
    await expect.poll(() => posted(calls, `/automation-schedules/${scheduleId}/disable`).length).toBe(1);
    expect(posted(calls, `/automation-schedules/${scheduleId}/disable`)[0].data).toEqual({ disabled_reason: 'New governance policy' });
  });
  test('TAS-037 Disabled schedule suppresses edit and lifecycle mutations and disables preview', async ({ page }) => {
    await selectSchedule(page, { rows: [{ ...schedule, status: 'disabled' }], detailResponse: { ...schedule, status: 'disabled', disabled_reason: 'Access ended' } });
    await expect(detail(page).getByRole('button', { name: 'Preview' })).toBeDisabled();
    await expect(detail(page).getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(detail(page).getByRole('button', { name: 'Pause' })).toHaveCount(0);
    await expect(detail(page).getByText('Access ended')).toBeVisible();
  });
  test('TAS-038 Preview POST renders only simulated, non-mutating request evidence', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Preview' }).click();
    await expect.poll(() => posted(calls, `/automation-schedules/${scheduleId}/dry-run`).length).toBe(1);
    await expect(detail(page).getByRole('heading', { name: 'Preview result' })).toBeVisible();
    await expect(detail(page).getByText('Preview only')).toBeVisible();
    expect(posted(calls, `/automation-schedules/${scheduleId}/run`)).toHaveLength(0);
  });
  test('TAS-039 Preview error surfaces API rejection and no preview result', async ({ page }) => {
    const { calls } = await selectSchedule(page, { errorAt: `/automation-schedules/${scheduleId}/dry-run` });
    await detail(page).getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByRole('alert')).toContainText('Synthetic automation API unavailable');
    await expect(detail(page).getByRole('heading', { name: 'Preview result' })).toHaveCount(0);
    expect(posted(calls, `/automation-schedules/${scheduleId}/run`)).toHaveLength(0);
  });
  test('TAS-040 Global runner disable blocks manual request action on both row and detail', async ({ page }) => {
    const locked = { ...runner, production_safety_lock: { global_disable: true, tenant_request_creation_enabled: true } };
    const { calls } = await selectSchedule(page, { runnerResponse: locked });
    await expect(detail(page).getByRole('button', { name: 'Create request' })).toBeDisabled();
    await expect(rowActions(page).getByRole('button', { name: 'Create request' })).toBeDisabled();
    await expect(detail(page)).toContainText('Request creation is turned off');
    expect(posted(calls, `/automation-schedules/${scheduleId}/run`)).toHaveLength(0);
  });
  test('TAS-041 Manual request dialog explains review workflow and Cancel has no API effect', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Create request' }).click();
    await expect(modal(page)).toContainText('Nothing will be approved or executed automatically');
    await modal(page).getByRole('button', { name: 'Cancel' }).click();
    expect(posted(calls, `/automation-schedules/${scheduleId}/run`)).toHaveLength(0);
  });
  test('TAS-042 Manual request result displays duplicate guard without claiming a new request', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Create request' }).click();
    await modal(page).getByRole('button', { name: 'Confirm' }).click();
    await expect.poll(() => posted(calls, `/automation-schedules/${scheduleId}/run`).length).toBe(1);
    await expect(page.getByRole('status')).toContainText('No duplicate request was created');
    await expect(detail(page).getByRole('heading', { name: 'Request creation result' })).toBeVisible();
    await expect(detail(page).getByText('Duplicate prevented')).toBeVisible();
  });
  test('TAS-043 Audit pack displays completeness, lifecycle context and linked requests', async ({ page }) => {
    const { calls } = await selectSchedule(page);
    await detail(page).getByRole('button', { name: 'Load audit history' }).click();
    await expect.poll(() => calls.some(c => c.path === `/automation-schedules/${scheduleId}/audit-pack`)).toBe(true);
    await expect(page.locator('#automation-schedule-audit-history')).toContainText('Policy changed');
    await expect(page.locator('#automation-schedule-audit-history')).toContainText('Cost Review');
    await expect(page.locator('#automation-schedule-audit-history')).toContainText('Complete');
  });
  test('TAS-044 Empty audit pack explicitly says no events and no linked requests', async ({ page }) => {
    const empty = { ...auditPack, completeness: { complete: false }, evidence_summary: { schedule_audit_event_count: 0, execution_request_count: 0, run_event_count: 0 }, audit_trail: { automation_schedule: [] }, linked_execution_requests: [] };
    await selectSchedule(page, { auditResponse: empty });
    await detail(page).getByRole('button', { name: 'Load audit history' }).click();
    await expect(page.locator('#automation-schedule-audit-history')).toContainText('No schedule audit events were found');
    await expect(page.locator('#automation-schedule-audit-history')).toContainText('No linked execution requests were found');
  });
  test('TAS-045 Audit fetch failure preserves selected detail and surfaces explicit alert', async ({ page }) => {
    await selectSchedule(page, { errorAt: `/automation-schedules/${scheduleId}/audit-pack` });
    await detail(page).getByRole('button', { name: 'Load audit history' }).click();
    await expect(page.getByRole('alert')).toContainText('Synthetic automation API unavailable');
    await expect(detail(page)).toBeVisible();
    await expect(page.locator('#automation-schedule-audit-history')).toHaveCount(0);
  });
  test('TAS-046 Safety expands lazily and requests bounded recent run events', async ({ page }) => {
    const { calls } = await openSchedules(page);
    expect(calls.some(c => c.path === '/automation-schedules/run-events')).toBe(false);
    await page.locator('#automation-schedule-safety').getByRole('button', { name: 'Show details' }).click();
    await expect.poll(() => calls.some(c => c.path === '/automation-schedules/run-events' && c.search.includes('limit=25') && c.search.includes('offset=0'))).toBe(true);
    await expect(page.locator('#automation-schedule-safety')).toContainText('Request preparation');
  });
  test('TAS-047 Refresh requests registry and expanded safety but does not run scheduler', async ({ page }) => {
    const { calls } = await openSchedules(page);
    await page.locator('#automation-schedule-safety').getByRole('button', { name: 'Show details' }).click();
    await expect.poll(() => calls.some(c => c.path === '/automation-schedules/run-events')).toBe(true);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect.poll(() => calls.filter(c => c.path === '/automation-schedules' && c.method === 'GET').length).toBeGreaterThanOrEqual(2);
    await expect.poll(() => calls.filter(c => c.path === '/automation-schedules/run-events').length).toBeGreaterThanOrEqual(2);
    expect(posted(calls, '/automation-schedules/runner/run-once')).toHaveLength(0);
  });
  test('TAS-048 Process due requires dialog confirmation and posts bounded request-only payload', async ({ page }) => {
    const { calls } = await openSchedules(page, { runnerResponse: { ...runner, batch_limit: 4, started: false } });
    await page.locator('#automation-schedule-safety').getByRole('button', { name: 'Show details' }).click();
    await page.locator('#automation-schedule-safety').getByRole('button', { name: 'Process due schedules now' }).click();
    expect(posted(calls, '/automation-schedules/runner/run-once')).toHaveLength(0);
    await modal(page).getByRole('button', { name: 'Confirm' }).click();
    await expect.poll(() => posted(calls, '/automation-schedules/runner/run-once').length).toBe(1);
    expect(posted(calls, '/automation-schedules/runner/run-once')[0].data).toEqual({ limit: 4, confirm_request_creation: true });
    await expect(page.locator('#automation-schedule-safety')).toContainText('Latest processing result');
  });
  test('TAS-049 Anomaly review validates note length before audit acknowledgement', async ({ page }) => {
    const anomaly = { ...runner, unsafe_runner_output_review_required: true, unsafe_runner_output_review_acknowledge_allowed: true, unsafe_runner_output_review_note_min_length: 10, unsafe_runner_output_review_note_max_length: 1000, last_unsafe_runner_output_at: ts, unsafe_runner_output_count: 2 };
    const { calls } = await openSchedules(page, { runnerResponse: anomaly });
    await page.locator('#automation-schedule-safety').getByRole('button', { name: 'Show details' }).click();
    await page.locator('#automation-schedule-safety').getByRole('button', { name: 'Acknowledge review' }).click();
    await modal(page).getByLabel('Review note').fill('too short');
    await modal(page).getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('alert')).toContainText('Review note must contain between');
    expect(posted(calls, '/automation-schedules/runner/unsafe-output-review/acknowledge')).toHaveLength(0);
    await modal(page).getByLabel('Review note').fill('  Reviewed the anomaly evidence carefully.  ');
    await modal(page).getByRole('button', { name: 'Confirm' }).click();
    await expect.poll(() => posted(calls, '/automation-schedules/runner/unsafe-output-review/acknowledge').length).toBe(1);
    expect(posted(calls, '/automation-schedules/runner/unsafe-output-review/acknowledge')[0].data).toMatchObject({ confirm_unsafe_output_review: true, expected_unsafe_runner_output_count: 2, review_note: 'Reviewed the anomaly evidence carefully.' });
  });
  test('TAS-050 View-only schedule role sees registry but not create or mutations', async ({ page }) => {
    await loginAsDisposableRole(page, 'PW_AS_VIEW_ONLY');
    await page.goto('/automation-schedules');
    await expect(page.getByRole('heading', { name: 'Automation schedules' })).toBeVisible();
    await expect(create(page)).toContainText('your role cannot create');
    await expect(create(page).getByRole('button', { name: 'Create draft schedule' })).toHaveCount(0);
    await expect(registry(page).locator('button', { hasText: 'Disable' })).toHaveCount(0);
  });
});
