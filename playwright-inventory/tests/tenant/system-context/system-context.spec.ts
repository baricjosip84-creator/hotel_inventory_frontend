import { test, expect, type Page, type Route } from '../../../support/liveOriginalSafeTest';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 40 source fixture: SystemContextPage.tsx and backend/src/routes/systemContext.js.
// Every HTTP response is synthetic in these tests; no live planning evidence is verified.
const date = '2026-10-30T12:00:00.000Z';
const context = {
  status: 'watch', tenant: { id: 'pw-system-tenant', name: 'Synthetic Tenant' }, generated_at: date,
  sections: ['inventory', 'procurement', 'costing', 'alerts', 'audit', 'access'],
  context: {
    inventory: { total_products: 19, stocked_products: 15, total_stock_quantity: 72, low_stock_products: 2, storage_locations: 3, suppliers: 7 },
    procurement: { open_shipments: 2, partial_shipments: 1, received_shipments: 4, open_purchase_orders: 3, approved_purchase_orders: 1 },
    costing: { total_products: 19, costed_products: 13, uncosted_stocked_products: 2, estimated_inventory_value: 1250,
      missing_standard_cost_products: 2, high_variance_products: 1 },
    alerts: { unresolved_alerts: 2, critical_unresolved_alerts: 1, unacknowledged_alerts: 1, latest_alert_at: date },
    audit: { audit_events_7d: 7, support_events_7d: 0, latest_audit_at: date },
    access: { actor_type: 'tenant_user', active_support_sessions: 0, latest_support_session_at: null }
  },
  risk_signals: [{ code: 'critical_alert_count', severity: 'critical', message: 'Critical unresolved alerts exist for this tenant.', count: 1 }],
  recommendations: [{ code: 'review_critical_alerts', priority: 'high', title: 'Review critical alerts',
    action: 'Open the alerts queue and resolve or acknowledge critical tenant alerts before automation consumes this context.',
    source_section: 'alerts', suggested_request_type: 'system_recommendation', executes_actions: false, requires_human_review: true }],
  recommendation_groups: [{ code: 'alerts', title: 'Alert review', recommendation_codes: ['review_critical_alerts'], read_only: true, requires_human_review: true }],
  context_sources: [{ section: 'inventory', status: 'included', source_tables: [], description: 'Inventory counts, stocked-product exposure, low-stock posture, locations, and supplier shape.', last_observed_at: date }],
  context_quality: { status: 'usable_with_review', score: 67, summary: 'Context quality is usable for read-only planning after human review.',
    factors: [], source_quality: [{ section: 'inventory', status: 'available', score: 100, message: 'Synthetic input' }],
    score_breakdown: { readiness_score: 80, risk_penalty: 10, recommendation_penalty: 5, passed_checks_bonus: 2, final_score: 67 } },
  context_freshness: { status: 'review_recommended', current_sources: 1, aging_sources: 1, stale_sources: 0, unknown_sources: 0,
    items: [{ section: 'inventory', status: 'aging', last_observed_at: date, age_hours: 25, message: 'Synthetic aging data' }], notes: [],
    predictive_guardrails: { mutation_allowed: false, request_creation_allowed: true, automatic_execution_allowed: false,
      approval_required_for_any_followup: true, tenant_scoped_only: true } },
  automation_plan: [], automation_readiness: { status: 'needs_review', score: 80, passed_checks: 4, failed_checks: 1, checks: [] },
  automation_contract: { read_only: true, tenant_scoped: true, safe_for_ai_summary: true, mutation_allowed: false },
  decision_boundaries: { status: 'restricted', escalation_conditions: ['critical_alert_count'] }
};
const snapshot = { id: 'pw-snapshot-a', tenant_id: 'pw-system-tenant', generated_at: date, source: 'manual', snapshot_status: 'captured', context_snapshot: context };
const olderSnapshot = { ...snapshot, id: 'pw-snapshot-b', generated_at: '2026-10-29T12:00:00.000Z' };
type Options = {
  value?: typeof context; errorPath?: string; snapshots?: typeof snapshot[];
  comparison?: Array<{ code: string; label: string; current: number | null; previous: number | null; delta: number | null; direction: string; comparable?: boolean }>;
  captured?: boolean; role?: 'PW_SC_GOVERNOR' | 'PW_SC_VIEW_ONLY' | 'PW_SC_NO_REVIEW' | 'PW_SC_NO_DIAGNOSTICS' | 'PW_SC_NO_ALERTS';
};
async function openSystem(page: Page, options: Options = {}) {
  if (options.role) await loginAsDisposableRole(page, options.role);
  else await loginAsTenant(page);
  const calls: Array<{ method: string; path: string; payload?: unknown }> = [];
  await page.route('**/*', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    if (!path.startsWith('/system-context') && path !== '/execution-requests') return route.fallback();
    let payload: unknown;
    try { payload = route.request().postDataJSON(); } catch { payload = undefined; }
    calls.push({ method: route.request().method(), path, payload });
    if (options.errorPath === path) return fulfillJson(route, { message: 'Synthetic context source unavailable' }, 503);
    if (path === '/system-context') return fulfillJson(route, options.value ?? context);
    if (path === '/system-context/execution-gate') return fulfillJson(route, { allowed: false, risk_level: 'high',
      evidence: { readiness_status: 'needs_review', blocked_execution_gates: 1, critical_risk_signals: ['critical_alert_count'], mutation_allowed_by_dry_run_policy: false } });
    if (path === '/system-context/snapshots?limit=25' || path === '/system-context/snapshots') return fulfillJson(route, options.snapshots ?? []);
    if (path.startsWith('/system-context/snapshots/') && !path.includes('/compare/') && !path.includes('/forecast-') && path !== '/system-context/snapshots/capture') {
      const item = (options.snapshots ?? []).find(row => path === `/system-context/snapshots/${row.id}`);
      return fulfillJson(route, item ?? {}, item ? 200 : 404);
    }
    if (path === '/system-context/snapshots/compare/latest') return fulfillJson(route, {
      status: 'ready', previous_generated_at: olderSnapshot.generated_at, current_generated_at: date,
      read_only: true, executes_actions: false, comparisons: options.comparison ?? [], notes: []
    });
    if (path === '/system-context/snapshots/forecast-scenarios') return fulfillJson(route, {
      status: 'insufficient_history', available_snapshots: (options.snapshots ?? []).length, forecast_scenarios: []
    });
    if (path === '/system-context/snapshots/forecast-scenarios/history') return fulfillJson(route, []);
    if (path === '/system-context/snapshots/capture' && route.request().method() === 'POST') return fulfillJson(route, {
      snapshot_id: 'pw-snapshot-created', generated_at: date, read_only: true, execution_enabled: false, mutation_enabled: false
    });
    if (path === '/system-context/snapshots/forecast-scenarios/capture' && route.request().method() === 'POST') return fulfillJson(route, {
      status: 'captured', generated_at: date, read_only: true, execution_enabled: false, mutation_enabled: false
    });
    if (path === '/execution-requests' && route.request().method() === 'POST') return fulfillJson(route, { id: 'pw-review-request' }, 201);
    // Never continue an unreviewed write to production: let the context guard
    // abort non-GET requests and allow only the specifically mocked POSTs above.
    return route.fallback();
  });
  await page.goto('/system-context');
  await expect(page.getByRole('heading', { name: 'System Context workspace' })).toBeVisible();
  return { calls };
}
const openHistory = (page: Page) => page.getByRole('tab', { name: 'Planning history' }).click();

 test.describe('System Context — visibility, review, history and permissions (Batch 40)', () => {
  test('TSC-001 Page presents read-only operational context purpose', async ({ page }) => {
    await openSystem(page);
    await expect(page.getByText('This page does not change stock or execute actions.', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What needs attention' })).toBeVisible();
  });
  test('TSC-002 Context GET loads risk, readiness and recommendation metric cards', async ({ page }) => {
    const { calls } = await openSystem(page);
    await expect(page.locator('.system-context-metrics')).toContainText('Recommended actions');
    await expect(page.locator('.system-context-metrics')).toContainText('Risk signals');
    expect(calls.some(call => call.method === 'GET' && call.path === '/system-context')).toBe(true);
  });
  test('TSC-003 Failed context GET shows named source error, not fake metrics', async ({ page }) => {
    await openSystem(page, { errorPath: '/system-context' });
    await expect(page.getByText('System Context failed to load', { exact: true })).toBeVisible();
    await expect(page.locator('.system-context-metrics')).toHaveCount(0);
  });
  test('TSC-004 Risk card uses supplied critical signal evidence', async ({ page }) => {
    await openSystem(page);
    await expect(page.locator('.system-context-action-card')).toContainText('Critical unresolved alerts exist for this tenant.');
    await expect(page.locator('.system-context-action-card')).toContainText('1 affected item');
  });
  test('TSC-005 Risk source link opens current Alerts route when permitted', async ({ page }) => {
    await openSystem(page);
    await expect(page.locator('.system-context-action-card').getByRole('link', { name: 'Open Alerts' })).toHaveAttribute('href', '/alerts');
  });
  test('TSC-006 Recommendation displays manual review and does not auto-execute', async ({ page }) => {
    await openSystem(page);
    const card = page.locator('.system-context-recommendation').filter({ hasText: 'Review critical alerts' });
    await expect(card).toContainText('Human review');
    await expect(card).toContainText('Read-only');
    await expect(card.getByRole('link', { name: /Open Alerts/ })).toHaveAttribute('href', '/alerts');
  });
  test('TSC-007 Empty recommendations disable review request creation', async ({ page }) => {
    await openSystem(page, { value: { ...context, recommendations: [] } });
    await expect(page.getByRole('button', { name: 'Create review request' })).toBeDisabled();
    await expect(page.getByText('No recommendations right now.')).toBeVisible();
  });
  test('TSC-008 Empty risk signals display explicit calm state', async ({ page }) => {
    await openSystem(page, { value: { ...context, risk_signals: [] } });
    await expect(page.getByText('No current System Context risk signals.')).toBeVisible();
    await expect(page.locator('.system-context-action-card')).toHaveCount(0);
  });
  test('TSC-009 Operational snapshot uses submitted inventory and procurement amounts', async ({ page }) => {
    await openSystem(page);
    const snapshotSection = page.locator('.system-context-panel').filter({ has: page.getByRole('heading', { name: 'Operational snapshot', exact: true }) });
    await expect(snapshotSection).toContainText('Low-stock products');
    await expect(snapshotSection).toContainText('Open shipments');
    await expect(snapshotSection).toContainText('Open purchase orders');
  });
  test('TSC-010 Planning score explanation displays source-derived penalty details', async ({ page }) => {
    await openSystem(page);
    const breakdown = page.getByLabel('How the context score is calculated');
    await expect(breakdown).toContainText('Risk signal deductions');
    await expect(breakdown).toContainText('Recommendation deductions');
    await expect(breakdown).toContainText('Context score result');
  });
  test('TSC-011 Aging source is explained without claiming records are wrong', async ({ page }) => {
    await openSystem(page);
    await expect(page.locator('.system-context-page')).toContainText('Inventory context has activity observed within the last 7 days.');
    await expect(page.locator('.system-context-page')).toContainText('This score is not a measure of incorrect or missing inventory data.');
  });
  test('TSC-012 Safety boundary explicitly prevents inventory change and automation', async ({ page }) => {
    await openSystem(page);
    const safety = page.locator('.system-context-safety-grid');
    await expect(safety).toContainText('Change inventory');
    await expect(safety).toContainText('Run automation');
    await expect(safety).toContainText('Human approval');
  });
  test('TSC-013 Planning history tab queries saved history only when opened', async ({ page }) => {
    const { calls } = await openSystem(page);
    expect(calls.some(c => c.path === '/system-context/snapshots')).toBe(false);
    await openHistory(page);
    await expect(page.getByRole('heading', { name: 'Saved context snapshots' })).toBeVisible();
    await expect.poll(() => calls.some(c => c.path === '/system-context/snapshots')).toBe(true);
  });
  test('TSC-014 History with zero snapshots shows empty history and comparison guard', async ({ page }) => {
    await openSystem(page);
    await openHistory(page);
    await expect(page.getByText('No saved snapshots yet.')).toBeVisible();
    await expect(page.getByText('At least two snapshots are needed for comparison.')).toBeVisible();
  });
  test('TSC-015 Selected historical snapshot shows tenant-friendly evidence', async ({ page }) => {
    const { calls } = await openSystem(page, { snapshots: [snapshot] });
    await openHistory(page);
    await page.locator('.system-context-history-list button').first().click();
    await expect.poll(() => calls.some(c => c.path === `/system-context/snapshots/${snapshot.id}`)).toBe(true);
    await expect(page.locator('.system-context-snapshot-summary')).toContainText('Risk signals');
    await expect(page.locator('.system-context-snapshot-summary')).toContainText('Recommendations');
  });
  test('TSC-016 History comparison only fetches when two snapshots exist', async ({ page }) => {
    const { calls } = await openSystem(page, { snapshots: [snapshot, olderSnapshot] });
    await openHistory(page);
    await expect.poll(() => calls.some(c => c.path === '/system-context/snapshots/compare/latest')).toBe(true);
    await expect(page.getByRole('heading', { name: 'What changed between the latest snapshots' })).toBeVisible();
  });
  test('TSC-017 Snapshot comparison omits unchanged metrics and shows measured difference', async ({ page }) => {
    await openSystem(page, { snapshots: [snapshot, olderSnapshot], comparison: [
      { code: 'low_stock', label: 'Low stock', current: 2, previous: 1, delta: 1, direction: 'increase' },
      { code: 'stable', label: 'Stable', current: 3, previous: 3, delta: 0, direction: 'stable' }
    ] });
    await openHistory(page);
    await expect(page.locator('.system-context-view')).toContainText('Low stock');
    await expect(page.locator('.system-context-view')).not.toContainText('Stable');
  });
  test('TSC-018 Scenario planning insufficient-history message is explicit', async ({ page }) => {
    await openSystem(page, { snapshots: [snapshot] });
    await openHistory(page);
    await expect(page.getByText(/More saved context history is required before scenario planning can be calculated/)).toBeVisible();
  });
  test('TSC-019 Refresh context refetches GET and acknowledges no mutation', async ({ page }) => {
    const { calls } = await openSystem(page);
    const before = calls.filter(c => c.path === '/system-context').length;
    await page.getByRole('button', { name: 'Refresh context' }).click();
    await expect.poll(() => calls.filter(c => c.path === '/system-context').length).toBeGreaterThan(before);
    await expect(page.getByText('System Context refreshed. No stock, workflow, or automation changes were made.')).toBeVisible();
  });
  test('TSC-020 Refresh failure exposes error instead of success state', async ({ page }) => {
    await openSystem(page, { errorPath: '/system-context' });
    await page.getByRole('button', { name: 'Refresh context' }).click();
    await expect(page.getByText(/Refresh failed:.*Synthetic context source unavailable/)).toBeVisible();
    await expect(page.getByText('System Context refreshed. No stock, workflow, or automation changes were made.')).toHaveCount(0);
  });
});

// Batch 41: source-reviewed continuation of context history, governance and diagnostics.
// Endpoint overrides are registered after openSystem so that the earlier general fixture
// still handles all other /system-context requests; no live writes are performed.
async function overrideSystemEndpoint(page: Page, endpoint: string, body: unknown, status = 200, method = 'GET') {
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    if (path === endpoint && route.request().method() === method) {
      await fulfillJson(route, body, status);
    } else await route.fallback();
  });
}
const sourceError = { message: 'Synthetic service temporarily unavailable' };
const scenarios = [
  { code: 'stock_change', label: 'Stock change assessment', priority: 'low', confidence_score: 62, risk_classification: 'low', preview_direction: 'stable', projected_delta: 0 }
];

test.describe('System Context — governed history and diagnostics (Batch 41)', () => {
  test('TSC-021 Saved snapshots fetch failure shows history-specific error', async ({ page }) => {
    await openSystem(page);
    await overrideSystemEndpoint(page, '/system-context/snapshots', sourceError, 503);
    await openHistory(page);
    await expect(page.getByText('Snapshots failed to load')).toBeVisible();
    await expect(page.getByText('No saved snapshots yet.')).toHaveCount(0);
  });
  test('TSC-022 Selected snapshot detail fetch failure shows explicit error', async ({ page }) => {
    await openSystem(page, { snapshots: [snapshot] });
    await overrideSystemEndpoint(page, `/system-context/snapshots/${snapshot.id}`, sourceError, 503);
    await openHistory(page);
    await page.locator('.system-context-history-list button').first().click();
    await expect(page.getByText('Snapshot detail failed to load')).toBeVisible();
    await expect(page.locator('.system-context-snapshot-summary')).toHaveCount(0);
  });
  test('TSC-023 Latest snapshot comparison fetch failure shows error', async ({ page }) => {
    await openSystem(page, { snapshots: [snapshot, olderSnapshot] });
    await overrideSystemEndpoint(page, '/system-context/snapshots/compare/latest', sourceError, 503);
    await openHistory(page);
    await expect(page.getByText('Snapshot comparison failed')).toBeVisible();
  });
  test('TSC-024 Forecast scenario set fetch failure does not claim planning data', async ({ page }) => {
    await openSystem(page);
    await overrideSystemEndpoint(page, '/system-context/snapshots/forecast-scenarios', sourceError, 503);
    await openHistory(page);
    await expect(page.getByText('Scenario planning failed to load')).toBeVisible();
    await expect(page.getByText('No scenario rows are available.')).toHaveCount(0);
  });
  test('TSC-025 Saved scenario history fetch failure is independent from forecast result', async ({ page }) => {
    await openSystem(page);
    await overrideSystemEndpoint(page, '/system-context/snapshots/forecast-scenarios/history', sourceError, 503);
    await openHistory(page);
    await expect(page.getByText('Saved scenario history failed to load')).toBeVisible();
    await expect(page.getByText(/More saved context history is required/)).toBeVisible();
  });
  test('TSC-026 Saved scenario set metadata appears in expandable history', async ({ page }) => {
    await openSystem(page);
    await overrideSystemEndpoint(page, '/system-context/snapshots/forecast-scenarios/history', [
      { id: 'pw-forecast-history', generated_at: date, scenario_status: 'captured', scenario_summary: { scenario_count: 3 } }
    ]);
    await openHistory(page);
    const details = page.locator('.system-context-details');
    await expect(details.locator('summary')).toContainText('Saved scenario sets (1)');
    await details.locator('summary').click();
    await expect(details).toContainText('3 scenarios');
  });
  test('TSC-027 Governance-authorized save snapshot POST sends empty sections request', async ({ page }) => {
    const { calls } = await openSystem(page, { role: 'PW_SC_GOVERNOR' });
    await openHistory(page);
    await page.getByRole('button', { name: 'Save context snapshot' }).click();
    await expect.poll(() => calls.find(c => c.method === 'POST' && c.path === '/system-context/snapshots/capture')?.payload)
      .toEqual({ sections: [] });
    await expect(page.getByText('Read-only context snapshot saved. It did not change inventory or execute work.')).toBeVisible();
  });
  test('TSC-028 Snapshot capture rejection appears without false saved acknowledgement', async ({ page }) => {
    await openSystem(page, { role: 'PW_SC_GOVERNOR' });
    await overrideSystemEndpoint(page, '/system-context/snapshots/capture', sourceError, 503, 'POST');
    await openHistory(page);
    await page.getByRole('button', { name: 'Save context snapshot' }).click();
    await expect(page.locator('.app-error-state')).toContainText('Synthetic service temporarily unavailable');
    await expect(page.getByText('Read-only context snapshot saved. It did not change inventory or execute work.')).toHaveCount(0);
  });
  test('TSC-029 Governance-authorized scenario set capture sends limit 25', async ({ page }) => {
    const { calls } = await openSystem(page, { role: 'PW_SC_GOVERNOR' });
    await openHistory(page);
    await page.getByRole('button', { name: 'Save scenario set' }).click();
    await expect.poll(() => calls.find(c => c.method === 'POST' && c.path === '/system-context/snapshots/forecast-scenarios/capture')?.payload)
      .toEqual({ limit: 25 });
    await expect(page.getByText(/Read-only scenario set saved/)).toBeVisible();
  });
  test('TSC-030 Scenario set capture rejection reports error and preserves history', async ({ page }) => {
    await openSystem(page, { role: 'PW_SC_GOVERNOR', snapshots: [snapshot] });
    await overrideSystemEndpoint(page, '/system-context/snapshots/forecast-scenarios/capture', sourceError, 503, 'POST');
    await openHistory(page);
    await page.getByRole('button', { name: 'Save scenario set' }).click();
    await expect(page.locator('.app-error-state')).toContainText('Synthetic service temporarily unavailable');
    await expect(page.locator('.system-context-history-list button')).toHaveCount(1);
  });
  test('TSC-031 Without governance role planning history remains readable but save is disabled', async ({ page }) => {
    await openSystem(page, { role: 'PW_SC_VIEW_ONLY', snapshots: [snapshot] });
    await openHistory(page);
    await expect(page.getByRole('button', { name: 'Save context snapshot' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save scenario set' })).toBeDisabled();
    await expect(page.locator('.system-context-history-list button')).toHaveCount(1);
  });
  test('TSC-032 Review request creation posts recommendation codes and context snapshot', async ({ page }) => {
    const { calls } = await openSystem(page, { role: 'PW_SC_GOVERNOR' });
    await page.getByRole('button', { name: 'Create review request' }).click();
    await expect.poll(() => calls.find(c => c.method === 'POST' && c.path === '/execution-requests')?.payload).toMatchObject({
      request_type: 'system_recommendation', payload: { source: 'system_context_page',
        recommendation_codes: ['review_critical_alerts'], recommendation_group_codes: ['alerts'] }
    });
    await expect(page.getByText(/Review request created.*normal review and approval workflow/)).toBeVisible();
  });
  test('TSC-033 Review request failure displays server rejection and no success text', async ({ page }) => {
    await openSystem(page, { role: 'PW_SC_GOVERNOR' });
    await overrideSystemEndpoint(page, '/execution-requests', sourceError, 503, 'POST');
    await page.getByRole('button', { name: 'Create review request' }).click();
    await expect(page.locator('.system-context-page')).toContainText('Synthetic service temporarily unavailable');
    await expect(page.getByText(/Review request created/)).toHaveCount(0);
  });
  test('TSC-034 Review request gate failure leaves no execution-request POST', async ({ page }) => {
    const { calls } = await openSystem(page, { role: 'PW_SC_NO_DIAGNOSTICS' });
    await overrideSystemEndpoint(page, '/system-context/execution-gate', sourceError, 503);
    await page.getByRole('button', { name: 'Create review request' }).click();
    await expect(page.locator('.system-context-page')).toContainText('Synthetic service temporarily unavailable');
    expect(calls.some(c => c.method === 'POST' && c.path === '/execution-requests')).toBe(false);
  });
  test('TSC-035 Role lacking execution-requests create cannot submit request', async ({ page }) => {
    const { calls } = await openSystem(page, { role: 'PW_SC_NO_REVIEW' });
    await expect(page.getByRole('button', { name: 'Create review request' })).toBeDisabled();
    expect(calls.some(c => c.method === 'POST' && c.path === '/execution-requests')).toBe(false);
  });
  test('TSC-036 Capturing snapshot updates selected snapshot identifier and history query', async ({ page }) => {
    const { calls } = await openSystem(page, { role: 'PW_SC_GOVERNOR', snapshots: [snapshot] });
    await openHistory(page);
    await page.getByRole('button', { name: 'Save context snapshot' }).click();
    await expect.poll(() => calls.some(c => c.path === '/system-context/snapshots/pw-snapshot-created')).toBe(true);
    await expect(page.getByText(/Read-only context snapshot saved/)).toBeVisible();
  });
  test('TSC-037 Switching planning history back to overview restores current context view', async ({ page }) => {
    await openSystem(page);
    await openHistory(page);
    await page.getByRole('tab', { name: 'Overview' }).click();
    await expect(page.getByRole('heading', { name: 'What needs attention' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Saved context snapshots' })).toHaveCount(0);
  });
  test('TSC-038 Diagnostics tab is displayed for tenant diagnostics permission', async ({ page }) => {
    const { calls } = await openSystem(page, { role: 'PW_SC_GOVERNOR' });
    await page.getByRole('tab', { name: 'Diagnostics' }).click();
    await expect(page.getByRole('heading', { name: 'Tenant diagnostics' })).toBeVisible();
    await expect.poll(() => calls.some(c => c.path === '/system-context/execution-gate')).toBe(true);
  });
  test('TSC-039 Non-diagnostics role cannot expose raw diagnosis panels', async ({ page }) => {
    const { calls } = await openSystem(page, { role: 'PW_SC_NO_DIAGNOSTICS' });
    await expect(page.getByRole('tab', { name: 'Diagnostics' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Tenant diagnostics' })).toHaveCount(0);
    expect(calls.some(c => c.path === '/system-context/execution-gate')).toBe(false);
  });
  test('TSC-040 Diagnostics execution safety shows gate blocker evidence', async ({ page }) => {
    await openSystem(page, { role: 'PW_SC_GOVERNOR' });
    await page.getByRole('tab', { name: 'Diagnostics' }).click();
    const safety = page.locator('.system-context-diagnostic-list').first();
    await expect(safety).toContainText('Blocked gates');
    await expect(safety).toContainText('Critical risks');
    await expect(safety).toContainText('Blocked');
  });
  test('TSC-041 Diagnostics contract shows tenant scope and no-mutation status', async ({ page }) => {
    await openSystem(page, { role: 'PW_SC_GOVERNOR' });
    await page.getByRole('tab', { name: 'Diagnostics' }).click();
    const contract = page.locator('.system-context-diagnostic-list').nth(1);
    await expect(contract).toContainText('Tenant-scoped');
    await expect(contract).toContainText('Mutation allowed');
    await expect(contract).toContainText('No');
  });
  test('TSC-042 Source health displays logical groups instead of database table names', async ({ page }) => {
    await openSystem(page, { role: 'PW_SC_GOVERNOR' });
    await page.getByRole('tab', { name: 'Diagnostics' }).click();
    const source = page.locator('.system-context-source-grid');
    await expect(source).toContainText('inventory');
    await expect(source).not.toContainText('context_events_private_table');
    await expect(page.getByText(/Database table names are deliberately not exposed/)).toBeVisible();
  });
  test('TSC-043 Unknown/stale context source status displays cautious freshness explanation', async ({ page }) => {
    await openSystem(page, { role: 'PW_SC_GOVERNOR', value: { ...context,
      context_sources: [{ section: 'inventory', status: 'included', source_tables: [], description: 'Synthetic inventory source', last_observed_at: null }],
      context_freshness: { ...context.context_freshness, items: [{ section: 'inventory', status: 'not_timestamped', last_observed_at: null, age_hours: null, message: 'No timestamp' }] }
    } as unknown as typeof context });
    await page.getByRole('tab', { name: 'Diagnostics' }).click();
    await expect(page.locator('.system-context-source-grid')).toContainText('Current-state snapshot; no single activity timestamp');
    await expect(page.getByText(/A missing timestamp does not mean the inventory data is wrong/)).toBeVisible();
  });
  test('TSC-044 Snapshot comparison distinguishes non-comparable metrics', async ({ page }) => {
    await openSystem(page, { snapshots: [snapshot, olderSnapshot], comparison: [
      { code: 'unmatched', label: 'Unmatched supply', current: 9, previous: null, delta: null, direction: 'unknown', comparable: false }
    ] });
    await openHistory(page);
    await expect(page.getByText('Unmatched supply')).toBeVisible();
    await expect(page.getByText('This metric was not captured in both snapshots.')).toBeVisible();
  });
  test('TSC-045 History requests at most twenty-five snapshots from API', async ({ page }) => {
    const observed: string[] = [];
    page.on('request', request => { if (request.url().includes('/system-context/snapshots?')) observed.push(request.url()); });
    await openSystem(page);
    await openHistory(page);
    await expect.poll(() => observed.some(url => new URL(url).searchParams.get('limit') === '25')).toBe(true);
    // The browser sends the bounded query; it does not independently enforce response size.
  });
  test('TSC-046 Forecast previews show maximum eight read-only scenario cards', async ({ page }) => {
    await openSystem(page);
    await overrideSystemEndpoint(page, '/system-context/snapshots/forecast-scenarios', {
      status: 'ready', available_snapshots: 8,
      forecast_scenarios: Array.from({ length: 10 }, (_, i) => ({ ...scenarios[0], code: `case-${i}`, label: `Forecast case ${i}` }))
    });
    await openHistory(page);
    // PanelHeading wraps its h2 twice; use the containing section, not two parent hops.
    const planning = page.locator('section').filter({
      has: page.getByRole('heading', { name: 'Read-only scenario planning' })
    }).first();
    await expect(planning.locator('.system-context-recommendation')).toHaveCount(8);
    await expect(planning).not.toContainText('Forecast case 9');
  });
  test('TSC-047 Read-only history never triggers execution workflow endpoints', async ({ page }) => {
    const { calls } = await openSystem(page, { snapshots: [snapshot] });
    await openHistory(page);
    await page.locator('.system-context-history-list button').first().click();
    await expect(page.locator('.system-context-snapshot-summary')).toBeVisible();
    expect(calls.some(c => c.path === '/execution-requests' && c.method !== 'GET')).toBe(false);
  });
  test('TSC-048 Repeated refresh while pending disables duplicate refresh button', async ({ page }) => {
    await openSystem(page);
    let release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.replace(/^\/api(?=\/)/, '') === '/system-context') {
        await held;
        await fulfillJson(route, context);
      } else await route.fallback();
    });
    await page.getByRole('button', { name: 'Refresh context' }).click();
    await expect(page.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
    release();
    await expect(page.getByRole('button', { name: 'Refresh context' })).toBeEnabled();
  });
  test('TSC-049 Source navigation hides inaccessible Alerts link', async ({ page }) => {
    await openSystem(page, { role: 'PW_SC_NO_ALERTS' });
    await expect(page.locator('.system-context-action-card')).toContainText('Critical unresolved alerts');
    await expect(page.locator('.system-context-action-card').getByRole('link', { name: 'Open Alerts' })).toHaveCount(0);
  });
  test('TSC-050 Protected route redirects user without system_context.read', async ({ page }) => {
    await loginAsDisposableRole(page, 'PW_SC_NO_READ');
    await page.goto('/system-context');
    await expect(page).toHaveURL(/\/dashboard(?:[?#]|$)/);
    await expect(page.getByRole('heading', { name: 'System Context workspace' })).toHaveCount(0);
  });
});

// Batch 183: System Context source routing, recommendation labels and planning evidence.
// Browser-visible assertions use synthetic GET data. Permissions on source links require
// disposable tenant accounts with the specific read grants; no operational acceptance is implied.
const scValue = (patch: Record<string, unknown>) => ({ ...context, ...patch } as typeof context);
const scSignal = (code: string, fields: Record<string, unknown> = {}) => ({ ...context.risk_signals[0], code, ...fields });
const scRecommendation = (code: string, fields: Record<string, unknown> = {}) => ({ ...context.recommendations[0], code, ...fields });
const scRiskCard = (page: Page) => page.locator('.system-context-action-card').first();
const scRecCard = (page: Page) => page.locator('.system-context-recommendation').first();

test.describe('System Context — source routing and read-only planning boundaries (Batch 183)', () => {
  test('TSC-051 Risk without count requests review in source workflow', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('stock_threshold', { count: undefined })] }) });
    await expect(scRiskCard(page)).toContainText('Review the source workflow for current evidence.');
  });
  test('TSC-052 Multiple affected risks use plural count', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('stock_threshold', { count: 3 })] }) });
    await expect(scRiskCard(page)).toContainText('3 affected items.');
  });
  test('TSC-053 Zero affected items remains visibly zero rather than omitted', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('stock_threshold', { count: 0 })] }) });
    await expect(scRiskCard(page)).toContainText('0 affected items.');
  });
  test('TSC-054 Warning severity uses warning badge tone', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('warning_stock', { severity: 'warning' })] }) });
    await expect(scRiskCard(page).locator('.system-context-pill--warn')).toContainText('Warning');
  });
  test('TSC-055 Unrecognized severity retains neutral badge instead of critical styling', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('unknown_risk', { severity: 'informational' })] }) });
    await expect(scRiskCard(page).locator('.system-context-pill--neutral')).toContainText('Informational');
  });
  test('TSC-056 Cost-related risk navigates to Reports with source permission', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('missing_cost_basis')] }) });
    await expect(scRiskCard(page).getByRole('link', { name: 'Open Reports' })).toHaveAttribute('href', '/reports');
  });
  test('TSC-057 Variance-related risk uses Reports route rather than generic fallback', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('variance_exposure')] }) });
    await expect(scRiskCard(page).getByRole('link', { name: 'Open Reports' })).toHaveAttribute('href', '/reports');
  });
  test('TSC-058 Stock-related risk navigates to Stock with source permission', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('low_stock_posture')] }) });
    await expect(scRiskCard(page).getByRole('link', { name: 'Open Stock' })).toHaveAttribute('href', '/stock');
  });
  test('TSC-059 Generic risk uses Action Center fallback with source permission', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('unclassified_signal')] }) });
    await expect(scRiskCard(page).getByRole('link', { name: 'Open Action Center' })).toHaveAttribute('href', '/action-center');
  });
  test('TSC-060 Alert match wins over cost match for a multi-keyword risk', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('alert_cost_gap')] }) });
    await expect(scRiskCard(page).getByRole('link', { name: 'Open Alerts' })).toHaveAttribute('href', '/alerts');
    await expect(scRiskCard(page).getByRole('link', { name: 'Open Reports' })).toHaveCount(0);
  });
  test('TSC-061 Cost match wins over stock match for a multi-keyword risk', async ({ page }) => {
    await openSystem(page, { value: scValue({ risk_signals: [scSignal('cost_stock_gap')] }) });
    await expect(scRiskCard(page).getByRole('link', { name: 'Open Reports' })).toHaveAttribute('href', '/reports');
    await expect(scRiskCard(page).getByRole('link', { name: 'Open Stock' })).toHaveCount(0);
  });
  test('TSC-062 Procurement recommendation links to Shipments', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('receive_partials', { source_section: 'procurement' })] }) });
    await expect(scRecCard(page).getByRole('link', { name: /Open Shipments/ })).toHaveAttribute('href', '/shipments');
  });
  test('TSC-063 Costing recommendation links to Reports', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('cost_review', { source_section: 'costing' })] }) });
    await expect(scRecCard(page).getByRole('link', { name: /Open Reports/ })).toHaveAttribute('href', '/reports');
  });
  test('TSC-064 Audit recommendation links to Audit', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('audit_review', { source_section: 'audit' })] }) });
    await expect(scRecCard(page).getByRole('link', { name: /Open Audit/ })).toHaveAttribute('href', '/audit');
  });
  test('TSC-065 Access recommendation shares the Audit source route', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('access_review', { source_section: 'access' })] }) });
    await expect(scRecCard(page).getByRole('link', { name: /Open Audit/ })).toHaveAttribute('href', '/audit');
  });
  test('TSC-066 Unknown recommendation section goes to Action Center', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('custom_review', { source_section: 'legacy_source' })] }) });
    await expect(scRecCard(page).getByRole('link', { name: /Open Action Center/ })).toHaveAttribute('href', '/action-center');
  });
  test('TSC-067 Optional ranking reason explains recommendation priority', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('ranked_alert', { ranking_reason: 'Synthetic urgency after staff review' })] }) });
    await expect(scRecCard(page)).toContainText('Why: Synthetic urgency after staff review');
  });
  test('TSC-068 Missing ranking reason does not render empty Why label', async ({ page }) => {
    await openSystem(page);
    await expect(scRecCard(page)).not.toContainText('Why:');
  });
  test('TSC-069 No-human-review flag omits Human review badge', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('informational', { requires_human_review: false })] }) });
    await expect(scRecCard(page).locator('.system-context-recommendation__top')).not.toContainText('Human review');
  });
  test('TSC-070 Executable recommendation flag does not mislabel item Read-only', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('manual_workflow', { executes_actions: true })] }) });
    await expect(scRecCard(page).locator('.system-context-recommendation__top')).not.toContainText('Read-only');
    // Only presentation is tested; no execution is triggered or authorized.
  });
  test('TSC-071 Medium-priority recommendation has warning tone', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('medium_alert', { priority: 'medium' })] }) });
    await expect(scRecCard(page).locator('.system-context-pill--warn')).toContainText('Medium');
  });
  test('TSC-072 Low-priority recommendation has neutral tone', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('low_alert', { priority: 'low' })] }) });
    await expect(scRecCard(page).locator('.system-context-recommendation__top .system-context-pill--neutral').filter({ hasText: /^Low$/ })).toHaveText('Low');
  });
  test('TSC-073 Unknown recommendation action retains supplied readable text', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('custom_text', { action: 'Ask the purchasing lead to review invoice mismatches.' })] }) });
    await expect(scRecCard(page)).toContainText('Ask the purchasing lead to review invoice mismatches.');
  });
  test('TSC-074 Known minimum-stock action becomes tenant-friendly wording', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('threshold_review', { action: 'Review affected product reorder thresholds and create product_min_stock_update execution requests only after human analysis and approval.' })] }) });
    await expect(scRecCard(page)).toContainText('After human review and approval, create a request to update minimum stock levels.');
    await expect(scRecCard(page)).not.toContainText('product_min_stock_update');
  });
  test('TSC-075 Known pricing action hides execution-request machine token', async ({ page }) => {
    await openSystem(page, { value: scValue({ recommendations: [scRecommendation('pricing_review', { action: 'Review affected product pricing and create product_pricing_update execution requests only after human analysis and approval.' })] }) });
    await expect(scRecCard(page)).toContainText('After human review and approval, create a request to update product pricing.');
    await expect(scRecCard(page)).not.toContainText('product_pricing_update');
  });
  test('TSC-076 Missing score breakdown omits calculation detail table', async ({ page }) => {
    await openSystem(page, { value: scValue({ context_quality: { ...context.context_quality, score_breakdown: undefined } }) });
    await expect(page.getByLabel('How the context score is calculated')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Planning context assessment' })).toBeVisible();
  });
  test('TSC-077 Fully current source counters show reassuring empty state', async ({ page }) => {
    await openSystem(page, { value: scValue({ context_freshness: { ...context.context_freshness, stale_sources: 0, aging_sources: 0, unknown_sources: 0, items: [] } }) });
    await expect(page.getByText('All reported context sources are current.')).toBeVisible();
    await expect(page.locator('.system-context-mini-list')).toHaveCount(0);
  });
  test('TSC-078 Attention list displays at most five freshness sources', async ({ page }) => {
    const items = Array.from({ length: 6 }, (_, i) => ({ section: `synthetic_source_${i + 1}`, status: 'aging', last_observed_at: date, age_hours: 35, message: 'Synthetic aging source' }));
    await openSystem(page, { value: scValue({ context_freshness: { ...context.context_freshness, aging_sources: 6, items } }) });
    await expect(page.locator('.system-context-mini-list > div')).toHaveCount(5);
    await expect(page.locator('.system-context-mini-list')).not.toContainText('synthetic_source_6');
  });
  test('TSC-079 Stale section has cautious automation-planning message', async ({ page }) => {
    await openSystem(page, { value: scValue({ context_freshness: { ...context.context_freshness, stale_sources: 1, aging_sources: 0, items: [{ section: 'costing', status: 'stale', last_observed_at: date, age_hours: 190, message: 'Synthetic source old' }] } }) });
    await expect(page.locator('.system-context-mini-list')).toContainText('Costing context has not been observed recently and should be reviewed before automation planning.');
  });
  test('TSC-080 Unknown source timestamp distinguishes unknown from stale', async ({ page }) => {
    await openSystem(page, { value: scValue({ context_freshness: { ...context.context_freshness, unknown_sources: 1, aging_sources: 0, items: [{ section: 'audit', status: 'unknown', last_observed_at: null, age_hours: null, message: 'Synthetic missing timestamp' }] } }) });
    await expect(page.locator('.system-context-mini-list')).toContainText('Audit context has no observable timestamp in this snapshot.');
  });
  test('TSC-081 Explicit no-approval requirement shows policy-dependent boundary', async ({ page }) => {
    await openSystem(page, { value: scValue({ context_freshness: { ...context.context_freshness, predictive_guardrails: { ...context.context_freshness.predictive_guardrails, approval_required_for_any_followup: false } } }) });
    await expect(page.locator('.system-context-safety-card').filter({ hasText: 'Human approval' })).toContainText('Policy dependent');
  });
  test('TSC-082 Missing guardrail defaults conservatively to Required approval', async ({ page }) => {
    await openSystem(page, { value: scValue({ context_freshness: { ...context.context_freshness, predictive_guardrails: undefined } }) });
    await expect(page.locator('.system-context-safety-card').filter({ hasText: 'Human approval' })).toContainText('Required');
  });
  test('TSC-083 Invalid context-quality numeric string formats to zero not NaN', async ({ page }) => {
    await openSystem(page, { value: scValue({ context_quality: { ...context.context_quality, score: 'invalid_number' } }) });
    await expect(page.locator('.system-context-confidence-block').first()).toContainText('0%');
    await expect(page.locator('.system-context-confidence-block')).not.toContainText('NaN');
  });
  test('TSC-084 Exactly one readiness blocker has singular helper text', async ({ page }) => {
    await openSystem(page, { value: scValue({ automation_readiness: { ...context.automation_readiness, failed_checks: 1 } }) });
    await expect(page.locator('.system-context-metrics')).toContainText('1 blocker.');
  });
  test('TSC-085 Three readiness blockers show plural helper text', async ({ page }) => {
    await openSystem(page, { value: scValue({ automation_readiness: { ...context.automation_readiness, failed_checks: 3 } }) });
    await expect(page.locator('.system-context-metrics')).toContainText('3 blockers.');
  });
});
