import { test, expect, type Page, type Route } from '../../../support/liveOriginalSafeTest';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 41: frontend/src/pages/ExecutionRequestsPage.tsx;
// backend/src/routes/executionRequests.js. Responses and writes are synthetic;
// only client-visible rendering and request contracts can be asserted here.
const requestId = 'pw-execution-request-00000001';
const date = '2026-11-01T11:00:00.000Z';
const draft = {
  id: requestId, request_type: 'cost_standard_update', status: 'draft', execution_status: null,
  payload: { product_id: 'pw-prod-1', product_name: 'Synthetic Test Item', standard_unit_cost: 14, reason: 'Synthetic review' },
  requested_by_name: 'Synthetic Operator', requested_by: 'pw-user-1', created_at: date, updated_at: date,
  adapter: { label: 'Standard cost update', execution_enabled: true }, action_eligibility: {}, timeline: []
};
const options = { products: [ { id: 'pw-prod-1', name: 'Synthetic Test Item', category: 'Test', unit: 'pcs', standard_unit_cost: 12, min_stock: 4 } ] };
const adapters = { summary: { execution_enabled_count: 2, total_adapters: 5 }, adapters: [], notes: [] };
const hardening = {
  module_status: 'complete', closeout_recommendation: 'Synthetic readiness evidence only',
  totals: { total_requests: 1, draft_requests: 1, pending_review_requests: 0, approved_waiting_execution: 0,
    real_execution_ready: 0, completed_executions: 0, noop_executions: 0, failed_executions: 0, system_context_requests: 0 },
  checks: [], notes: [], safety_contract: { approval_required: true, duplicate_execution_blocked: true,
    retry_requires_explicit_preparation: true, mutates_inventory: false, mutates_shipments: false, creates_background_jobs: false }
};
type Options = {
  rows?: Array<typeof draft>; total?: number; listError?: boolean; errorPath?: string;
  role?: 'PW_ERQ_VIEW_ONLY' | 'PW_ERQ_NO_INTELLIGENCE' | 'PW_ERQ_NO_PRODUCTS' | 'PW_ERQ_NO_VIEW';
  mutationReply?: Record<string, unknown>; recommendationReply?: Record<string, unknown>;
  replyByPath?: Record<string, unknown>; requests?: Array<{ method: string; path: string; query: string; payload?: unknown }>;
};
async function openRequests(page: Page, opts: Options = {}) {
  if (opts.role) await loginAsDisposableRole(page, opts.role);
  else await loginAsTenant(page);
  const calls: Array<{ method: string; path: string; query: string; payload?: unknown }> = opts.requests || [];
  await page.route('**/*', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    // Keep mutation setup fully synthetic: system context snapshots are an optional prerequisite.
    if (path === '/system-context') return fulfillJson(route, { generated_at: date, health: 'ok' });
    if (path === '/system-context/execution-gate') return fulfillJson(route, { decision: 'review' });
    if (!path.startsWith('/execution-requests')) return route.continue();
    let payload: unknown;
    try { payload = route.request().postDataJSON(); } catch { payload = undefined; }
    calls.push({ method: route.request().method(), path, query: url.search, payload });
    if ((opts.listError && path === '/execution-requests') || opts.errorPath === path) {
      return fulfillJson(route, { message: 'Synthetic requests service unavailable' }, 503);
    }
    if (path === '/execution-requests/options') return fulfillJson(route, options);
    if (path === '/execution-requests/adapters') return fulfillJson(route, adapters);
    if (path === '/execution-requests/hardening-summary') return fulfillJson(route, hardening);
    if (path === '/execution-requests/recommendation-candidate' && opts.recommendationReply) return fulfillJson(route, opts.recommendationReply);
    if (path === '/execution-requests/recommendation-candidate') return fulfillJson(route, {
      found: false, checked_products: 1, duplicate_open_requests_excluded: true, request_type: null,
      generated_at: date, recommendation: null
    });
    if (path === '/execution-requests' && route.request().method() === 'POST') return fulfillJson(route, opts.mutationReply ?? draft, 201);
    if (route.request().method() === 'POST' && path.startsWith(`/execution-requests/${requestId}/`)) return fulfillJson(route, opts.mutationReply ?? draft);
    if (opts.replyByPath && path in opts.replyByPath) return fulfillJson(route, opts.replyByPath[path]);
    if (path === '/execution-requests') {
      const limit = Number(url.searchParams.get('limit') || 25);
      const offset = Number(url.searchParams.get('offset') || 0);
      const rows = opts.rows ?? [draft];
      return fulfillJson(route, { rows: rows.slice(offset, offset + limit), total: opts.total ?? rows.length, notes: [] });
    }
    if (path === `/execution-requests/${requestId}`) return fulfillJson(route, (opts.rows ?? [draft])[0] ?? draft);
    return route.continue();
  });
  await page.goto('/execution-requests');
  await expect(page.getByRole('heading', { name: 'Controlled execution requests' })).toBeVisible();
  return { calls };
}

// The first 20 scenarios focus on registry discovery, filters, roles and controlled draft entry.
test.describe('Execution Requests — registry, safety and draft entry (Batch 41)', () => {
  test('TEXR-001 Registry heading explains approval does not execute a change', async ({ page }) => {
    await openRequests(page);
    await expect(page.getByText(/Approval never changes a product by itself/)).toBeVisible();
    await expect(page.getByText(/Approving a request does not apply the change/)).toBeVisible();
  });
  test('TEXR-002 Initial registry requests bounded 25-row first page', async ({ page }) => {
    const { calls } = await openRequests(page);
    await expect.poll(() => calls.find(c => c.path === '/execution-requests' && c.method === 'GET')?.query)
      .toContain('limit=25&offset=0');
  });
  test('TEXR-003 Four request metadata sources load separately', async ({ page }) => {
    const { calls } = await openRequests(page);
    await expect.poll(() => calls.filter(c => c.method === 'GET' && ['/execution-requests', '/execution-requests/options',
      '/execution-requests/adapters', '/execution-requests/hardening-summary'].includes(c.path)).length).toBeGreaterThanOrEqual(4);
    await expect(page.getByText('Synthetic readiness evidence only')).toBeVisible();
  });
  test('TEXR-004 Empty registry shows explicit no-match state', async ({ page }) => {
    await openRequests(page, { rows: [], total: 0 });
    await expect(page.getByText('No execution requests match the selected filters.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  test('TEXR-005 Registry GET failure displays error rather than rows', async ({ page }) => {
    await openRequests(page, { listError: true });
    await expect(page.locator('.app-error')).toContainText('Synthetic requests service unavailable');
    await expect(page.getByText('Synthetic Test Item', { exact: false })).toHaveCount(0);
  });
  test('TEXR-006 Optional creation options failing leaves registry usable and warns', async ({ page }) => {
    await openRequests(page, { errorPath: '/execution-requests/options' });
    await expect(page.getByText(/Creation options could not be loaded/)).toBeVisible();
    await expect(page.getByText('Synthetic Operator')).toBeVisible();
  });
  test('TEXR-007 Optional adapter registry failing does not hide request rows', async ({ page }) => {
    await openRequests(page, { errorPath: '/execution-requests/adapters' });
    await expect(page.getByText(/Adapter registry could not be loaded/)).toBeVisible();
    await expect(page.getByText('Synthetic Operator')).toBeVisible();
  });
  test('TEXR-008 Optional safeguards failing preserves safe warning on queue', async ({ page }) => {
    await openRequests(page, { errorPath: '/execution-requests/hardening-summary' });
    await expect(page.getByText(/Governance summary could not be loaded/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open' })).toBeVisible();
  });
  test('TEXR-009 Tabs navigate between create queue and safeguards sections', async ({ page }) => {
    await openRequests(page);
    await page.getByRole('tab', { name: 'Request queue' }).click();
    await expect(page.locator('#execution-request-queue')).toBeVisible();
    await page.getByRole('tab', { name: 'Safeguards' }).click();
    await expect(page.locator('#execution-request-controls')).toBeVisible();
  });
  test('TEXR-010 Workflow status filter sends pending_review query and resets offset', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Workflow status').selectOption('pending_review');
    await expect.poll(() => calls.some(c => c.path === '/execution-requests' && c.query.includes('status=pending_review') && c.query.includes('offset=0'))).toBe(true);
  });
  test('TEXR-011 Request-type filter sends product_min_stock_update', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Request type').selectOption('product_min_stock_update');
    await expect.poll(() => calls.some(c => c.path === '/execution-requests' && c.query.includes('request_type=product_min_stock_update'))).toBe(true);
  });
  test('TEXR-012 Execution-outcome filter sends failed status separately', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Execution outcome').selectOption('failed');
    await expect.poll(() => calls.some(c => c.path === '/execution-requests' && c.query.includes('execution_status=failed'))).toBe(true);
  });
  test('TEXR-013 Search trims outer whitespace before query', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Search', { exact: true }).fill('  test item  ');
    await expect.poll(() => calls.some(c => c.path === '/execution-requests' && c.query.includes('search=test+item'))).toBe(true);
  });
  test('TEXR-014 Changing row size requests 50 and resets to first page', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Rows').selectOption('50');
    await expect.poll(() => calls.some(c => c.path === '/execution-requests' && c.query.includes('limit=50') && c.query.includes('offset=0'))).toBe(true);
  });
  test('TEXR-015 Next and Previous buttons request correct offsets', async ({ page }) => {
    const { calls } = await openRequests(page, { total: 61, rows: Array.from({ length: 25 }, (_, i) => ({ ...draft, id: `pw-req-${i}` })) });
    await page.getByRole('button', { name: 'Next' }).click();
    await expect.poll(() => calls.some(c => c.path === '/execution-requests' && c.query.includes('offset=25'))).toBe(true);
    await page.getByRole('button', { name: 'Previous' }).click();
    await expect.poll(() => calls.filter(c => c.path === '/execution-requests' && c.query.includes('offset=0')).length).toBeGreaterThanOrEqual(2);
  });
  test('TEXR-016 Clear filters resets status and keyword to the default query', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Workflow status').selectOption('approved');
    await page.getByLabel('Search', { exact: true }).fill('synthetic');
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByLabel('Search', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Workflow status')).toHaveValue('');
    await expect.poll(() => calls.filter(c => c.path === '/execution-requests' && !c.query.includes('status=') && !c.query.includes('search=')).length).toBeGreaterThanOrEqual(2);
  });
  test('TEXR-017 Opening registry row presents selected request detail', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.locator('#execution-request-detail')).toContainText('Synthetic review');
    await expect.poll(() => calls.some(c => c.path === `/execution-requests/${requestId}`)).toBe(true);
  });
  test('TEXR-018 URL request_id deep-link fetches selected record', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.goto(`/execution-requests?request_id=${requestId}`);
    await expect(page.locator('#execution-request-detail')).toContainText('Synthetic Operator');
    await expect.poll(() => calls.some(c => c.path === `/execution-requests/${requestId}`)).toBe(true);
  });
  test('TEXR-019 View-only role cannot create a controlled product request', async ({ page }) => {
    const { calls } = await openRequests(page, { role: 'PW_ERQ_VIEW_ONLY' });
    await expect(page.getByRole('button', { name: /Create draft/ })).toHaveCount(0);
    await expect(page.getByText('Create controlled product change')).toBeVisible();
    expect(calls.some(c => c.path === '/execution-requests' && c.method === 'POST')).toBe(false);
  });
  test('TEXR-020 Create form blocks submit until product and numeric value supplied', async ({ page }) => {
    const { calls } = await openRequests(page);
    await expect(page.getByRole('button', { name: /Create .*draft/ })).toBeDisabled();
    await page.getByLabel('Product', { exact: true }).selectOption('pw-prod-1');
    await page.getByLabel('New standard unit cost').fill('14');
    await expect(page.getByRole('button', { name: /Create .*draft/ })).toBeEnabled();
    expect(calls.some(c => c.path === '/execution-requests' && c.method === 'POST')).toBe(false);
  });
});

// Batch 42: client-visible governed lifecycle. Authorization and DB effects require a
// later isolated integration phase; the synthetic responses below do not prove either.
const pending = { ...draft, status: 'pending_review', action_eligibility: { review: { blocked: false } } };
const approved = { ...draft, status: 'approved', execution_status: null, action_eligibility: { execute: { blocked: false } } };
const failed = {
  ...approved, execution_status: 'failed', execution_result: { failure_reason: 'Synthetic stale value' },
  execution_review: { retry_eligibility: { eligible: true } }
};
const noop = { ...approved, request_type: 'system_recommendation', adapter: { label: 'Review-only assessment', execution_enabled: false } };
const recommendation = {
  product_id: 'pw-prod-1', product_name: 'Synthetic Test Item', current_min_stock: 4,
  recommended_min_stock: 9, formula_version: 'synthetic-v1', confidence_score: 0.8,
  recommendation_status: 'actionable', operational_context: { current_stock: 2 },
  inputs: { total_outbound_30d: 25 }, calculation: { expected_lead_time_demand: 7, safety_stock: 2 }
};

test.describe('Execution Requests — governed lifecycle and evidence (Batch 42)', () => {
  test('TEXR-021 Standard-cost draft POST carries product, number, source and controlled type', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Product', { exact: true }).selectOption('pw-prod-1');
    await page.getByLabel('New standard unit cost').fill('14.75');
    await page.getByRole('button', { name: 'Create draft request' }).click();
    await expect.poll(() => calls.find(c => c.method === 'POST' && c.path === '/execution-requests')?.payload).toMatchObject({
      request_type: 'cost_standard_update', payload: { product_id: 'pw-prod-1', standard_unit_cost: 14.75, source: 'execution_requests_page' }
    });
  });
  test('TEXR-022 Minimum-stock draft sends min_stock, not standard_unit_cost', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Change type').selectOption('product_min_stock_update');
    await page.getByLabel('Product', { exact: true }).selectOption('pw-prod-1');
    await page.getByLabel('New minimum stock').fill('9');
    await page.getByRole('button', { name: 'Create draft request' }).click();
    await expect.poll(() => calls.some(c => c.method === 'POST' && c.path === '/execution-requests')).toBe(true);
    const body = calls.find(c => c.path === '/execution-requests' && c.method === 'POST')?.payload as { request_type: string; payload: Record<string, unknown> };
    expect(body.request_type).toBe('product_min_stock_update');
    expect(body.payload.min_stock).toBe(9);
    expect(body.payload.standard_unit_cost).toBeUndefined();
  });
  test('TEXR-023 Negative standard cost is rejected client-side without POST', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Product', { exact: true }).selectOption('pw-prod-1');
    await page.getByLabel('New standard unit cost').fill('-2');
    await page.getByRole('button', { name: 'Create draft request' }).click();
    await expect(page.locator('.app-error')).toContainText('must be a non-negative number');
    expect(calls.filter(c => c.path === '/execution-requests' && c.method === 'POST')).toHaveLength(0);
  });
  test('TEXR-024 Zero is valid numeric cost and is sent as number zero', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Product', { exact: true }).selectOption('pw-prod-1');
    await page.getByLabel('New standard unit cost').fill('0');
    await page.getByRole('button', { name: 'Create draft request' }).click();
    await expect.poll(() => calls.some(c => c.method === 'POST' && c.path === '/execution-requests')).toBe(true);
    const body = calls.find(c => c.method === 'POST' && c.path === '/execution-requests')?.payload as {payload:{standard_unit_cost:number}};
    expect(body.payload.standard_unit_cost).toBe(0);
  });
  test('TEXR-025 Business reason is limited to 1000 characters and trimmed in POST', async ({ page }) => {
    const { calls } = await openRequests(page);
    await page.getByLabel('Product', { exact: true }).selectOption('pw-prod-1');
    await page.getByLabel('New standard unit cost').fill('15');
    const reason = page.getByLabel(/Business reason/);
    await reason.fill('  approved by local test  ');
    await page.getByRole('button', { name: 'Create draft request' }).click();
    await expect.poll(() => calls.some(c => c.method === 'POST' && c.path === '/execution-requests')).toBe(true);
    const body = calls.find(c => c.method === 'POST' && c.path === '/execution-requests')?.payload as {payload:{reason:string}};
    expect(body.payload.reason).toBe('approved by local test');
    await expect(reason).toHaveAttribute('maxlength', '1000');
  });
  test('TEXR-026 No active product choices disables product selection and draft creation', async ({ page }) => {
    await openRequests(page, { replyByPath: { '/execution-requests/options': { products: [] } } });
    await expect(page.getByLabel('Product', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Create draft request' })).toBeDisabled();
    await expect(page.getByText('No active products available')).toBeVisible();
  });
  test('TEXR-027 Recommendation finder reports no new candidate and does not create draft', async ({ page }) => {
    const { calls } = await openRequests(page);
    const finder = page.getByRole('button', { name: 'Find new recommendation' });
    if (await finder.count() === 0) test.skip(true, 'Requires a disposable role with decision_intelligence.read + execution_requests.create');
    await finder.click();
    await expect.poll(() => calls.some(c => c.path === '/execution-requests/recommendation-candidate')).toBe(true);
    expect(calls.filter(c => c.method === 'POST' && c.path === '/execution-requests')).toHaveLength(0);
    await expect(page.getByText('New recommendation', { exact: true })).toHaveCount(0);
  });
  test('TEXR-028 Finder candidate creates recommended min-stock draft with evidence snapshot', async ({ page }) => {
    const { calls } = await openRequests(page, { recommendationReply: { found: true, request_type: 'product_min_stock_update', recommendation, generated_at: date } });
    const finder = page.getByRole('button', { name: 'Find new recommendation' });
    if (await finder.count() === 0) test.skip(true, 'Requires a disposable role with decision intelligence read');
    await finder.click();
    await expect(page.getByRole('button', { name: 'Create minimum-stock request' })).toBeVisible();
    await page.getByRole('button', { name: 'Create minimum-stock request' }).click();
    await expect.poll(() => calls.some(c => c.method === 'POST' && c.path === '/execution-requests')).toBe(true);
    const body = calls.find(c => c.method === 'POST' && c.path === '/execution-requests')?.payload as {payload:Record<string,unknown>;context_snapshot:Record<string,unknown>};
    expect(body.payload).toMatchObject({ min_stock: 9, source: 'execution_requests_recommendation_finder', recommendation_formula_version: 'synthetic-v1' });
    expect(body.context_snapshot.recommendation_candidate).toMatchObject({product_id:'pw-prod-1'});
  });
  test('TEXR-029 Recommendation service error shows failure without a draft mutation', async ({ page }) => {
    const { calls } = await openRequests(page, { errorPath: '/execution-requests/recommendation-candidate' });
    const finder = page.getByRole('button', { name: 'Find new recommendation' });
    if (await finder.count() === 0) test.skip(true, 'Requires a disposable decision-intelligence reader');
    await finder.click();
    await expect(page.locator('.app-error')).toContainText('Synthetic requests service unavailable');
    expect(calls.filter(c => c.method === 'POST' && c.path === '/execution-requests')).toHaveLength(0);
  });
  test('TEXR-030 Role without decision intelligence read never sees recommendation finder', async ({ page }) => {
    await openRequests(page, { role: 'PW_ERQ_NO_INTELLIGENCE' });
    await expect(page.getByRole('button', { name: 'Find new recommendation' })).toHaveCount(0);
  });
  test('TEXR-031 Submitting draft posts fixed human-review note to submit endpoint', async ({ page }) => {
    const { calls } = await openRequests(page, { mutationReply: { ...draft, status: 'pending_review' } });
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect.poll(() => calls.find(c => c.path.endsWith('/submit') && c.method === 'POST')?.payload).toEqual({ note: 'Submitted for human review from the registry UI.' });
  });
  test('TEXR-032 Submit service error leaves synthetic row in draft state', async ({ page }) => {
    const { calls } = await openRequests(page, { errorPath: `/execution-requests/${requestId}/submit` });
    await page.getByRole('button', { name: 'Submit', exact: true }).click();
    await expect(page.locator('.app-error')).toContainText('Synthetic requests service unavailable');
    expect(calls.filter(c => c.path.endsWith('/submit') && c.method === 'POST')).toHaveLength(1);
    await expect(page.getByRole('button', { name: 'Submit', exact: true })).toBeVisible();
  });
  test('TEXR-033 Approve confirmation and note are separated from product execution', async ({ page }) => {
    const { calls } = await openRequests(page, { rows: [pending], mutationReply: approved });
    page.on('dialog', async d => { if (d.type() === 'confirm') await d.accept(); else await d.accept('  Reviewed evidence  '); });
    await page.getByRole('button', { name: 'Approve', exact: true }).first().click();
    await expect.poll(() => calls.find(c => c.method === 'POST' && c.path.endsWith('/approve'))?.payload).toEqual({review_note:'Reviewed evidence'});
    expect(calls.some(c => c.method === 'POST' && c.path.endsWith('/execute'))).toBe(false);
  });
  test('TEXR-034 Dismissing approval confirmation makes no POST', async ({ page }) => {
    const { calls } = await openRequests(page, { rows: [pending] });
    page.once('dialog', async d => d.dismiss());
    await page.getByRole('button', { name: 'Approve', exact: true }).first().click();
    expect(calls.some(c => c.method === 'POST' && c.path.endsWith('/approve'))).toBe(false);
  });
  test('TEXR-035 Rejection reason below three trimmed characters leaves request untouched', async ({ page }) => {
    const { calls } = await openRequests(page, { rows: [pending] });
    page.once('dialog', async d => d.accept('  x '));
    await page.getByRole('button', { name: 'Reject', exact: true }).first().click();
    expect(calls.some(c => c.method === 'POST' && c.path.endsWith('/reject'))).toBe(false);
  });
  test('TEXR-036 Valid rejection note is trimmed and submitted, not executed', async ({ page }) => {
    const { calls } = await openRequests(page, { rows: [pending], mutationReply: { ...pending, status: 'rejected' } });
    page.once('dialog', async d => d.accept('  stale stock evidence '));
    await page.getByRole('button', { name: 'Reject', exact: true }).first().click();
    await expect.poll(() => calls.find(c => c.method === 'POST' && c.path.endsWith('/reject'))?.payload).toEqual({ rejection_reason: 'stale stock evidence' });
    expect(calls.some(c => c.path.endsWith('/execute'))).toBe(false);
  });
  test('TEXR-037 Separation-of-duties review blocker disables review buttons', async ({ page }) => {
    await openRequests(page, { rows: [{ ...pending, action_eligibility: { review: { blocked: true } } }] });
    await expect(page.getByRole('button', { name: 'Approve', exact: true }).first()).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Reject', exact: true }).first()).toBeDisabled();
  });
  test('TEXR-038 Approved product change without products.write exposes permission gate, no execute action', async ({ page }) => {
    await openRequests(page, { rows: [approved], role: 'PW_ERQ_NO_PRODUCTS' });
    await page.getByRole('button', { name: 'Open' }).click();
    await expect(page.getByText('Applying the approved change also requires product-edit permission.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Execute approved change' })).toHaveCount(0);
  });
  test('TEXR-039 Dismissing controlled execution confirmation prevents POST', async ({ page }) => {
    const { calls } = await openRequests(page, { rows: [approved] });
    page.once('dialog', async d => d.dismiss());
    await page.getByRole('button', { name: 'Execute', exact: true }).first().click();
    expect(calls.some(c => c.method === 'POST' && c.path.endsWith('/execute'))).toBe(false);
  });
  test('TEXR-040 Controlled execution failure renders stored failure reason, not success', async ({ page }) => {
    const { calls } = await openRequests(page, { rows: [approved], mutationReply: failed });
    page.on('dialog', async d => d.accept(d.type() === 'prompt' ? '  audit note  ' : undefined));
    await page.getByRole('button', { name: 'Execute', exact: true }).first().click();
    await expect.poll(() => calls.find(c => c.path.endsWith('/execute') && c.method === 'POST')?.payload).toEqual({note:'audit note'});
    await expect(page.locator('.app-error')).toContainText('Synthetic stale value');
  });
  test('TEXR-041 Review-only approved request uses execute-noop instead of product mutation', async ({ page }) => {
    const { calls } = await openRequests(page, { rows: [noop], mutationReply: { ...noop, status: 'completed', execution_status: 'completed_noop' } });
    page.on('dialog', async d => d.accept(d.type() === 'prompt' ? 'completed review' : undefined));
    await page.getByRole('button', { name: 'Complete without change' }).first().click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/execute-noop') && c.method === 'POST')).toBe(true);
    expect(calls.some(c => c.path.endsWith('/execute') && c.method === 'POST')).toBe(false);
  });
  test('TEXR-042 Cancellation rejects a reason shorter than three non-space characters', async ({ page }) => {
    const { calls } = await openRequests(page);
    page.once('dialog', async d => d.accept(' no '));
    await page.getByRole('button', { name: 'Cancel', exact: true }).first().click();
    expect(calls.some(c => c.path.endsWith('/cancel') && c.method === 'POST')).toBe(false);
  });
  test('TEXR-043 Valid cancellation reason is trimmed and posted to cancellation action only', async ({ page }) => {
    const { calls } = await openRequests(page, { mutationReply: { ...draft, status: 'cancelled' } });
    page.once('dialog', async d => d.accept('  user rescinded change  '));
    await page.getByRole('button', { name: 'Cancel', exact: true }).first().click();
    await expect.poll(() => calls.find(c => c.path.endsWith('/cancel') && c.method === 'POST')?.payload).toEqual({cancel_reason:'user rescinded change'});
  });
  test('TEXR-044 Failed eligible request can prepare one governed retry with reason', async ({ page }) => {
    const { calls } = await openRequests(page, { rows: [failed], mutationReply: { ...approved, execution_status: null } });
    page.on('dialog', async d => d.accept(d.type() === 'prompt' && d.message().includes('Retry reason') ? '  fixed input  ' : 'reviewed')); 
    await page.getByRole('button', { name: 'Prepare retry' }).first().click();
    await expect.poll(() => calls.find(c => c.path.endsWith('/prepare-retry') && c.method === 'POST')?.payload).toEqual({retry_reason:'fixed input',note:'reviewed'});
  });
  test('TEXR-045 Workflow timeline shows known actor and event label without exposing raw snapshots', async ({ page }) => {
    await openRequests(page, { rows: [{ ...draft, timeline: [{ status: 'draft', label: 'Draft opened', at: date, by: 'Synthetic Operator' }] }] });
    await page.getByRole('button', { name: 'Open' }).click();
    await page.getByText('Workflow timeline', { exact: true }).click();
    await expect(page.locator('#execution-request-detail')).toContainText('Draft opened');
    await expect(page.locator('#execution-request-detail')).toContainText('Synthetic Operator');
    await expect(page.getByText('Technical snapshots (advanced)')).toHaveCount(0);
  });
  test('TEXR-046 Audit-pack endpoint loads only after selecting its control', async ({ page }) => {
    const { calls } = await openRequests(page, { replyByPath: { [`/execution-requests/${requestId}/audit-pack`]: { request_id: requestId, timeline: [], events: [] } } });
    await page.getByRole('button', { name: 'Open' }).click();
    expect(calls.some(c => c.path.endsWith('/audit-pack'))).toBe(false);
    await page.getByText('Audit pack', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Load audit pack' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/audit-pack') && c.method === 'GET')).toBe(true);
  });
  test('TEXR-047 Security review is fetched lazily and independently from audit pack', async ({ page }) => {
    const { calls } = await openRequests(page, { replyByPath: { [`/execution-requests/${requestId}/security-audit`]: { checks: [], requested_by: 'pw-user-1' } } });
    await page.getByRole('button', { name: 'Open' }).click();
    expect(calls.some(c => c.path.endsWith('/security-audit'))).toBe(false);
    await page.getByText('Security and separation-of-duties review', { exact: true }).click();
    await page.getByRole('button', { name: 'Load security review' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/security-audit'))).toBe(true);
    expect(calls.some(c => c.path.endsWith('/audit-pack'))).toBe(false);
  });
  test('TEXR-048 Execution before/after review requires deliberate lazy load', async ({ page }) => {
    const { calls } = await openRequests(page, { replyByPath: { [`/execution-requests/${requestId}/execution-review`]: { before: {}, after: {}, attempts: [] } } });
    await page.getByRole('button', { name: 'Open' }).click();
    expect(calls.some(c => c.path.endsWith('/execution-review'))).toBe(false);
    await page.getByText('Execution result and before/after evidence', { exact: true }).click();
    await page.getByRole('button', { name: 'Load execution review' }).click();
    await expect.poll(() => calls.some(c => c.path.endsWith('/execution-review'))).toBe(true);
  });
  test('TEXR-049 CSV export uses 100-row pages with matching filters and downloads CSV', async ({ page }) => {
    const rows = Array.from({ length: 101 }, (_, i) => ({ ...draft, id: `synthetic-export-${i.toString().padStart(3,'0')}` }));
    const { calls } = await openRequests(page, { rows, total: 101 });
    await page.getByLabel('Workflow status').selectOption('draft');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('execution-requests.csv');
    await expect.poll(() => calls.filter(c => c.method === 'GET' && c.path === '/execution-requests' && c.query.includes('limit=100')).length).toBe(2);
    expect(calls.some(c => c.query.includes('limit=100') && c.query.includes('offset=100') && c.query.includes('status=draft'))).toBe(true);
  });
  test('TEXR-050 Tenant without execution_requests.view cannot reach protected registry', async ({ page }) => {
    await loginAsDisposableRole(page, 'PW_ERQ_NO_VIEW');
    await page.goto('/execution-requests');
    await expect(page.getByRole('heading', { name: 'Controlled execution requests' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Create draft request' })).toHaveCount(0);
  });
});
