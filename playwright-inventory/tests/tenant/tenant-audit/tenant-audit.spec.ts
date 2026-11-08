import { test, expect, type Page, type Route } from '../../../support/liveOriginalSafeTest';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 37: TenantAuditPage read-only registry and filters. Data is synthetic;
// tenant isolation, persisted audit integrity and real CSV streaming remain Phase 2 responsibilities.
type Call = { method: string; path: string; search: string };
const UUID = '11111111-1111-4111-8111-111111111111';
const auditRows = [
  { id: UUID, tenant_id: 'pw-tenant', user_id: 'pw-user-01', user_email: 'operator@example.invalid', user_name: 'Synthetic Operator', action: 'update', entity_type: 'shipments', entity_id: 'pw-shipment-01', metadata: { path: `/api/shipments/${UUID}/receive`, method: 'POST', status_code: 200, request_id: 'pw-request', location: 'Warehouse A', quantity: 4 }, created_at: '2026-10-01T09:00:00.000Z' },
  { id: '22222222-2222-4222-8222-222222222222', tenant_id: 'pw-tenant', user_id: null, user_email: null, user_name: null, action: 'create', entity_type: 'purchase_orders', entity_id: 'pw-po-01', metadata: { actor_type: 'support_session', platform_user_name: 'Synthetic Support', platform_user_email: 'support@example.invalid', support_reason: 'Approved investigation', method: 'PATCH', status_code: 204 }, created_at: '2026-10-01T08:00:00.000Z' }
];
const summary = { total_events: 2, tenant_events: 1, support_events: 1, unique_actors: 2, first_event_at: '2026-10-01T08:00:00.000Z', last_event_at: '2026-10-01T09:00:00.000Z' };
type AuditRow = { id: string; tenant_id: string; user_id: string | null; user_email: string | null; user_name: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Record<string, unknown> | null; created_at: string };
type Options = { empty?: boolean; hasMore?: boolean; optionsStatus?: number; pageStatus?: number | ((requestNumber: number) => number); summaryStatus?: number; detailStatus?: number; rows?: AuditRow[]; detailRow?: AuditRow; role?: 'PW_AUDIT_NO_DIAGNOSTICS' | 'PW_AUDIT_TECHNICAL' | 'PW_AUDIT_NO_READ' };
async function openAudit(page: Page, opts: Options = {}) {
  if (opts.role) await loginAsDisposableRole(page, opts.role);
  else await loginAsTenant(page);
  const calls: Call[] = [];
  let listRequestNumber = 0;
  await page.route('**/audit**', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const u = new URL(route.request().url()), path = u.pathname, method = route.request().method();
    if (!/^\/(?:api\/)?audit(?:\/|$)/.test(path)) return route.continue();
    calls.push({ method, path, search: u.search });
    if (method !== 'GET') return fulfillJson(route, { message: 'Unexpected audit write' }, 405);
    if (path.endsWith('/filter-options')) return fulfillJson(route, opts.optionsStatus ? { message: 'Synthetic options forbidden' } : { actions: ['update', 'create'], entity_types: ['shipments', 'purchase_orders'] }, opts.optionsStatus ?? 200);
    if (path.endsWith('/summary')) return fulfillJson(route, opts.summaryStatus ? { message: 'Synthetic summary error' } : summary, opts.summaryStatus ?? 200);
    if (path.endsWith('/export.csv')) return route.fulfill({ status: 200, contentType: 'text/csv', body: 'id,action\n' });
    if (path.match(/\/audit\/[^/]+$/)) return fulfillJson(route, opts.detailStatus ? { message: 'Synthetic evidence access denied' } : opts.detailRow ?? (opts.rows ?? auditRows).find(r => path.endsWith(r.id)) ?? auditRows[0], opts.detailStatus ?? 200);
    const status = typeof opts.pageStatus === 'function' ? opts.pageStatus(++listRequestNumber) : (opts.pageStatus ?? 200);
    return fulfillJson(route, status !== 200 ? { message: 'Synthetic audit unavailable' } : { rows: opts.empty ? [] : (opts.rows ?? auditRows), has_more: opts.hasMore ?? false, limit: Number(u.searchParams.get('limit') ?? '50'), offset: Number(u.searchParams.get('offset') ?? '0') }, status);
  });
  await page.goto('/audit');
  await expect(page.locator('#tenant-audit-workspace-top')).toBeVisible();
  // All three independent query endpoints must be observed before synchronous assertions.
  await expect.poll(() => calls.some(c => /\/audit$/.test(c.path) && c.method === 'GET')).toBe(true);
  await expect.poll(() => calls.some(c => c.path.endsWith('/audit/summary'))).toBe(true);
  await expect.poll(() => calls.some(c => c.path.endsWith('/audit/filter-options'))).toBe(true);
  return { calls };
}
const listCalls = (calls: Call[]) => calls.filter(c => c.path.match(/\/audit$/) && c.method === 'GET');
const latestList = (calls: Call[]) => new URLSearchParams(listCalls(calls).at(-1)?.search ?? '');
const auditTable = (page: Page) => page.locator('table.tenant-audit-table');
const filter = (page: Page, name: string) => page.locator('.tenant-audit-field').filter({ hasText: name });

test.describe('Tenant Audit — registry, filters and safe evidence (Batch 37)', () => {
  test('TAUD-001 Audit route loads read-only event registry', async ({ page }) => {
    const s = await openAudit(page); await expect(page.getByRole('heading', { name: 'Tenant audit trail' })).toBeVisible();
    await expect(auditTable(page).locator('tbody tr').first()).toBeVisible();
    expect(s.calls.some(c => c.path.match(/\/audit$/) && c.method === 'GET')).toBe(true);
    expect(s.calls.filter(c => c.method !== 'GET')).toHaveLength(0);
  });
  test('TAUD-002 Summary cards use independent audit summary response', async ({ page }) => {
    const s = await openAudit(page); await expect(page.getByText('Matching events')).toBeVisible();
    await expect(page.getByText('Support actions')).toBeVisible();
    expect(s.calls.some(c => c.path.endsWith('/audit/summary'))).toBe(true);
  });
  test('TAUD-003 Filter options come from dedicated endpoint', async ({ page }) => {
    const s = await openAudit(page);
    await expect(filter(page, 'Action').locator('select')).toContainText('Update');
    await expect(filter(page, 'Entity').locator('select')).toContainText('Shipments');
    expect(s.calls.some(c => c.path.endsWith('/audit/filter-options'))).toBe(true);
  });
  test('TAUD-004 Default paging requests 50, offset 0 and summary metadata mode', async ({ page }) => {
    const s = await openAudit(page); expect(latestList(s.calls).get('limit')).toBe('50');
    expect(latestList(s.calls).get('offset')).toBe('0');
    expect(latestList(s.calls).get('response_mode')).toBe('page');
    expect(latestList(s.calls).get('metadata_mode')).toBe('summary');
  });
  test('TAUD-005 Audit ledger displays six source-defined column headers', async ({ page }) => {
    await openAudit(page);
    await expect(auditTable(page).locator('thead th')).toHaveText(['Time', 'Operation', 'Actor', 'Entity', 'Source', 'Evidence']);
  });
  test('TAUD-006 Tenant actor is attributed and action derived from path', async ({ page }) => {
    await openAudit(page); const row = auditTable(page).locator('tbody tr').first();
    await expect(row).toContainText('Synthetic Operator'); await expect(row).toContainText('TENANT');
    await expect(row).toContainText('Received'); await expect(row).toContainText('Shipments');
  });
  test('TAUD-007 Support-session actor displays attribution and reason', async ({ page }) => {
    await openAudit(page); const row = auditTable(page).locator('tbody tr').nth(1);
    await expect(row).toContainText('SUPPORT'); await expect(row).toContainText('Synthetic Support');
    await expect(row).toContainText('Reason: Approved investigation');
  });
  test('TAUD-008 Search trims whitespace before applied list GET', async ({ page }) => {
    const s = await openAudit(page); await filter(page, 'Search audit history').locator('input').fill('  warehouse  ');
    await expect.poll(() => latestList(s.calls).get('search')).toBe('warehouse');
  });
  test('TAUD-009 Selecting action sends exact audit code', async ({ page }) => {
    const s = await openAudit(page); await filter(page, 'Action').locator('select').selectOption('update');
    await expect.poll(() => latestList(s.calls).get('action')).toBe('update');
  });
  test('TAUD-010 Entity selector applies entity_type query', async ({ page }) => {
    const s = await openAudit(page); await filter(page, 'Entity').locator('select').selectOption('shipments');
    await expect.poll(() => latestList(s.calls).get('entity_type')).toBe('shipments');
  });
  test('TAUD-011 Support-only checkbox sends true and resets offset', async ({ page }) => {
    const s = await openAudit(page); await page.getByRole('checkbox', { name: 'Support-session actions only' }).check();
    await expect.poll(() => latestList(s.calls).get('support_only')).toBe('true');
    expect(latestList(s.calls).get('offset')).toBe('0');
  });
  test('TAUD-012 Valid date range applies from and to dates', async ({ page }) => {
    const s = await openAudit(page); await filter(page, 'From').locator('input').fill('2026-01-01');
    await filter(page, 'To').locator('input').fill('2026-02-01');
    await expect.poll(() => latestList(s.calls).get('to')).toBe('2026-02-01');
    expect(latestList(s.calls).get('from')).toBe('2026-01-01');
  });
  test('TAUD-013 Inverted dates show error and do not apply invalid query', async ({ page }) => {
    const s = await openAudit(page); await filter(page, 'From').locator('input').fill('2026-12-01');
    await filter(page, 'To').locator('input').fill('2026-01-01');
    await expect(page.getByRole('alert')).toContainText('From date must be before or equal to To date');
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    expect(listCalls(s.calls).some(c => new URLSearchParams(c.search).get('from') === '2026-12-01' && new URLSearchParams(c.search).get('to') === '2026-01-01')).toBe(false);
  });
  test('TAUD-014 Page-size control sends 25 with offset reset', async ({ page }) => {
    const s = await openAudit(page); await filter(page, 'Events per page').locator('select').selectOption('25');
    await expect.poll(() => latestList(s.calls).get('limit')).toBe('25');
    expect(latestList(s.calls).get('offset')).toBe('0');
  });
  test('TAUD-015 Reset restores default filters and disables itself', async ({ page }) => {
    const s = await openAudit(page); await filter(page, 'Search audit history').locator('input').fill('example');
    await expect.poll(() => latestList(s.calls).get('search')).toBe('example');
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect.poll(() => latestList(s.calls).get('search')).toBeNull();
    await expect(page.getByRole('button', { name: 'Reset', exact: true })).toBeDisabled();
  });
  test('TAUD-016 Next uses server has_more and updates offset', async ({ page }) => {
    const s = await openAudit(page, { hasMore: true }); await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => latestList(s.calls).get('offset')).toBe('50');
    await expect(page.locator('.tenant-audit-pagination-meta')).toContainText('Page 2');
  });
  test('TAUD-017 Previous returns to offset zero', async ({ page }) => {
    const s = await openAudit(page, { hasMore: true }); await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => latestList(s.calls).get('offset')).toBe('50');
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect.poll(() => latestList(s.calls).get('offset')).toBe('0');
  });
  test('TAUD-018 Details expand on demand and fetch selected event only', async ({ page }) => {
    const s = await openAudit(page); await expect(auditTable(page).locator('.tenant-audit-detail-panel')).toHaveCount(0);
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(page.getByText('Recorded evidence')).toBeVisible();
    expect(s.calls.some(c => c.path.endsWith('/audit/' + UUID))).toBe(true);
  });
  test('TAUD-019 Hide details collapses evidence without mutation', async ({ page }) => {
    const s = await openAudit(page); await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(auditTable(page).locator('.tenant-audit-detail-panel')).toBeVisible();
    await auditTable(page).getByRole('button', { name: 'Hide details' }).first().click();
    await expect(auditTable(page).locator('.tenant-audit-detail-panel')).toHaveCount(0);
    expect(s.calls.filter(c => c.method !== 'GET')).toHaveLength(0);
  });
  test('TAUD-020 Failed event-list GET reports an error without fabricating entries', async ({ page }) => {
    await openAudit(page, { pageStatus: 403 });
    await expect(page.getByText(/Failed to load tenant audit:/)).toBeVisible();
    await expect(auditTable(page)).toHaveCount(0);
  });
});

// Batch 38: finish the 30 source-inventoried audit cases; all data remain synthetic.
// A few permission variants need separate, pre-provisioned disposable-tenant accounts.
test.describe('Tenant Audit — details, export, permissions and resilience (Batch 38)', () => {
  test('TAUD-021 Filter-options API failure replaces selectors with exact-code input fallbacks', async ({ page }) => {
    const s = await openAudit(page, { optionsStatus: 403 });
    await expect(filter(page, 'Action').locator('input')).toBeVisible();
    await filter(page, 'Action').locator('input').fill('shipment.received');
    await filter(page, 'Entity').locator('input').fill('shipments');
    await expect.poll(() => latestList(s.calls).get('action')).toBe('shipment.received');
    expect(latestList(s.calls).get('entity_type')).toBe('shipments');
  });
  test('TAUD-022 Empty list displays no-matches and does not fetch audit detail', async ({ page }) => {
    const s = await openAudit(page, { empty: true });
    await expect(page.getByText('No tenant audit events match the applied filters.')).toBeVisible();
    await expect(auditTable(page)).toHaveCount(0);
    expect(s.calls.filter(c => /\/audit\/[^/]+$/.test(c.path) && !/summary|filter-options/.test(c.path))).toHaveLength(0);
  });
  test('TAUD-023 Summary failure is reported independently of successfully loaded event list', async ({ page }) => {
    await openAudit(page, { summaryStatus: 403 });
    await expect(page.getByText(/Audit summary could not be loaded:/)).toBeVisible();
    await expect(auditTable(page).locator('tbody tr').first()).toContainText('Synthetic Operator');
  });
  test('TAUD-024 Denied detail fetch shows evidence error rather than fake detail content', async ({ page }) => {
    await openAudit(page, { detailStatus: 403 });
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(page.getByText(/Audit evidence could not be loaded:/)).toBeVisible();
    await expect(auditTable(page).locator('.tenant-audit-detail-panel')).toHaveCount(0);
  });
  test('TAUD-025 Read-only audit user without diagnostics sees business evidence but no raw IDs', async ({ page }) => {
    await openAudit(page, { role: 'PW_AUDIT_NO_DIAGNOSTICS' });
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    const detail = auditTable(page).locator('.tenant-audit-detail-panel');
    await expect(detail).toContainText('Warehouse A');
    await expect(detail.locator('.tenant-audit-id-grid')).toHaveCount(0);
    await expect(detail.locator('.tenant-audit-metadata-pre')).toHaveCount(0);
  });
  test('TAUD-026 Diagnostics-authorized user can reveal identifiers and raw audit metadata', async ({ page }) => {
    await openAudit(page, { role: 'PW_AUDIT_TECHNICAL' });
    await page.getByRole('button', { name: 'Show technical details' }).click();
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    const detail = auditTable(page).locator('.tenant-audit-detail-panel');
    await expect(detail.locator('.tenant-audit-id-grid')).toContainText(UUID);
    await expect(detail.locator('.tenant-audit-metadata-pre')).toContainText('request_id');
    await expect(page.getByRole('button', { name: 'Hide technical details' })).toHaveAttribute('aria-pressed', 'true');
  });
  test('TAUD-027 Toggling technical details off hides raw event and user metadata again', async ({ page }) => {
    await openAudit(page, { role: 'PW_AUDIT_TECHNICAL' });
    await page.getByRole('button', { name: 'Show technical details' }).click();
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(page.locator('.tenant-audit-metadata-pre')).toBeVisible();
    await page.getByRole('button', { name: 'Hide technical details' }).click();
    await expect(page.locator('.tenant-audit-metadata-pre')).toHaveCount(0);
    await expect(page.locator('.tenant-audit-id-grid')).toHaveCount(0);
    await expect(page.locator('.tenant-audit-evidence-grid')).toContainText('Warehouse A');
  });
  test('TAUD-028 Evidence grid filters technical keys even for authorized diagnostic viewers', async ({ page }) => {
    await openAudit(page, { role: 'PW_AUDIT_TECHNICAL' });
    await page.getByRole('button', { name: 'Show technical details' }).click();
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    const grid = page.locator('.tenant-audit-evidence-grid');
    await expect(grid).toContainText('Location');
    await expect(grid).not.toContainText('Request ID');
    await expect(grid).not.toContainText('Status Code');
    await expect(page.locator('.tenant-audit-metadata-pre')).toContainText('request_id');
  });
  test('TAUD-029 Generic actions with no trailing path operation fall back to Updated and Deleted', async ({ page }) => {
    const rows = [
      { ...auditRows[0], action: 'update', metadata: { method: 'PATCH', path: '/api/shipments' } },
      { ...auditRows[1], action: 'delete', metadata: { method: 'DELETE', path: '/api/purchase-orders' } }
    ];
    await openAudit(page, { rows });
    await expect(auditTable(page).locator('tbody tr').nth(0)).toContainText('Updated');
    await expect(auditTable(page).locator('tbody tr').nth(1)).toContainText('Deleted');
  });
  test('TAUD-030 Actor fallback selects email, user ID and Tenant user placeholder in order', async ({ page }) => {
    const rows = [
      { ...auditRows[0], user_name: null, user_email: 'fallback@example.invalid', user_id: 'user-one' },
      { ...auditRows[0], id: auditRows[1].id, user_name: null, user_email: null, user_id: 'user-two' },
      { ...auditRows[0], id: '33333333-3333-4333-8333-333333333333', user_name: null, user_email: null, user_id: null }
    ];
    await openAudit(page, { rows });
    const body = auditTable(page).locator('tbody tr');
    await expect(body.nth(0)).toContainText('fallback@example.invalid');
    await expect(body.nth(1)).toContainText('user-two');
    await expect(body.nth(2)).toContainText('Tenant user');
  });
  test('TAUD-031 CSV uses committed trimmed filters and waits for debounced editing', async ({ page }) => {
    const s = await openAudit(page);
    await filter(page, 'Search audit history').locator('input').fill('  supplier  ');
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    await expect.poll(() => latestList(s.calls).get('search')).toBe('supplier');
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    await expect((await download).suggestedFilename()).toMatch(/^tenant-audit-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = s.calls.find(c => c.path.endsWith('/audit/export.csv'));
    expect(csv).toBeDefined();
    expect(new URLSearchParams(csv?.search).get('search')).toBe('supplier');
    expect(new URLSearchParams(csv?.search).has('limit')).toBe(false);
  });
  test('TAUD-032 CSV export error displays feedback without changing committed filters', async ({ page }) => {
    const s = await openAudit(page);
    await filter(page, 'Action').locator('select').selectOption('update');
    await expect.poll(() => latestList(s.calls).get('action')).toBe('update');
    await page.route(/\/audit\/export\.csv(?:\?|$)/, route => fulfillJson(route, { message: 'Synthetic export denied' }, 403));
    await page.getByRole('button', { name: 'Export CSV' }).click();
    await expect(page.locator('.tenant-audit-message[role="alert"]')).toContainText('Synthetic export denied');
    expect(latestList(s.calls).get('action')).toBe('update');
    await expect(filter(page, 'Action').locator('select')).toHaveValue('update');
  });
  test('TAUD-033 Export is disabled while event list is being refetched', async ({ page }) => {
    await openAudit(page);
    let release = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route(/\/audit(?:\?|$)/, async route => {
      await gate;
      await fulfillJson(route, { rows: auditRows, has_more: false, limit: 50, offset: 0 });
    });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    release();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();
  });
  test('TAUD-034 Refresh independently requests list and summary, then acknowledges completion', async ({ page }) => {
    const s = await openAudit(page);
    const listBefore = listCalls(s.calls).length;
    const summaryBefore = s.calls.filter(c => c.path.endsWith('/audit/summary')).length;
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.tenant-audit-message[role="status"]')).toContainText('Tenant audit refreshed.');
    expect(listCalls(s.calls).length).toBeGreaterThan(listBefore);
    expect(s.calls.filter(c => c.path.endsWith('/audit/summary')).length).toBeGreaterThan(summaryBefore);
  });
  test('TAUD-035 Failed list refetch shows error and never displays success confirmation', async ({ page }) => {
    await openAudit(page, { pageStatus: n => n === 1 ? 200 : 503 });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.tenant-audit-message[role="alert"]')).toContainText('Synthetic audit unavailable');
    await expect(page.locator('.tenant-audit-message[role="status"]')).toHaveCount(0);
  });
  test('TAUD-036 Moving to next page closes selected event detail without audit writes', async ({ page }) => {
    const s = await openAudit(page, { hasMore: true });
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(page.locator('.tenant-audit-detail-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.locator('.tenant-audit-detail-panel')).toHaveCount(0);
    expect(s.calls.filter(c => c.method !== 'GET')).toHaveLength(0);
  });
  test('TAUD-037 Changing action after advancing pages resets the list offset to zero', async ({ page }) => {
    const s = await openAudit(page, { hasMore: true });
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => latestList(s.calls).get('offset')).toBe('50');
    await filter(page, 'Action').locator('select').selectOption('create');
    await expect.poll(() => latestList(s.calls).get('action')).toBe('create');
    expect(latestList(s.calls).get('offset')).toBe('0');
  });
  test('TAUD-038 Support-only checkbox updates list, summary, and subsequent CSV filter', async ({ page }) => {
    const s = await openAudit(page);
    await page.getByRole('checkbox', { name: 'Support-session actions only' }).check();
    await expect.poll(() => latestList(s.calls).get('support_only')).toBe('true');
    await expect.poll(() => s.calls.some(c => c.path.endsWith('/audit/summary') && new URLSearchParams(c.search).get('support_only') === 'true')).toBe(true);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    await download;
    expect(s.calls.some(c => c.path.endsWith('/audit/export.csv') && new URLSearchParams(c.search).get('support_only') === 'true')).toBe(true);
  });
  test('TAUD-039 Trimmed search converges to applied state instead of permanent pending badge', async ({ page }) => {
    const s = await openAudit(page);
    await filter(page, 'Search audit history').locator('input').fill('  warehouse  ');
    await expect.poll(() => latestList(s.calls).get('search')).toBe('warehouse');
    await expect(page.locator('.tenant-audit-filter-pending')).toHaveCount(0);
    await expect(page.locator('.tenant-audit-filter-applied')).toContainText('Applied filters are active.');
  });
  test('TAUD-040 Route requiring audit.read redirects unauthorized role to Dashboard', async ({ page }) => {
    await loginAsDisposableRole(page, 'PW_AUDIT_NO_READ');
    await page.goto('/audit');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator('#tenant-audit-workspace-top')).toHaveCount(0);
  });
  test('TAUD-041 Role with audit.read but without diagnostics.read gets no technical toggle', async ({ page }) => {
    await openAudit(page, { role: 'PW_AUDIT_NO_DIAGNOSTICS' });
    await expect(page.getByRole('button', { name: 'Show technical details' })).toHaveCount(0);
    await expect(auditTable(page).locator('tbody tr').first()).toBeVisible();
  });
  test('TAUD-042 HTTP source codes expose differentiated good/warn/bad status badges', async ({ page }) => {
    const rows = [
      { ...auditRows[0], metadata: { method: 'POST', status_code: 201 } },
      { ...auditRows[1], metadata: { status_code: 404 } },
      { ...auditRows[0], id: '33333333-3333-4333-8333-333333333333', metadata: { status_code: 503 } }
    ];
    await openAudit(page, { rows });
    const badges = auditTable(page).locator('.tenant-audit-status');
    await expect(badges.nth(0)).toHaveClass(/tenant-audit-status--good/);
    await expect(badges.nth(1)).toHaveClass(/tenant-audit-status--warn/);
    await expect(badges.nth(2)).toHaveClass(/tenant-audit-status--bad/);
  });
  test('TAUD-043 Unknown business action and entity codes show readable names', async ({ page }) => {
    await openAudit(page, { rows: [{ ...auditRows[0], action: 'warehouse.stock_adjusted', entity_type: 'vendorReturnEvent', metadata: null }] });
    const row = auditTable(page).locator('tbody tr').first();
    await expect(row).toContainText('Warehouse Stock Adjusted');
    await expect(row).toContainText('Vendor Return Event');
    await expect(row).not.toContainText('vendorReturnEvent');
  });
  test('TAUD-044 Long audit user ID is shortened in technical attribution while event evidence stays exact', async ({ page }) => {
    const longId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await openAudit(page, { role: 'PW_AUDIT_TECHNICAL', rows: [{ ...auditRows[0], user_id: longId, user_name: null, user_email: null, entity_id: longId }] });
    await page.getByRole('button', { name: 'Show technical details' }).click();
    const row = auditTable(page).locator('tbody tr').first();
    await expect(row.locator('.tenant-audit-code').filter({ hasText: 'User aaaaaaaa…aaaaaa' })).toBeVisible();
    await expect(row).toContainText(longId); // entity identifier is intentionally shown in full to a diagnostic role
  });
  test('TAUD-045 Missing support attributes and invalid timestamp render stable fallbacks', async ({ page }) => {
    await openAudit(page, { rows: [{ ...auditRows[1], metadata: { actor_type: 'support_session' }, created_at: '' }] });
    const row = auditTable(page).locator('tbody tr').first();
    await expect(row).toContainText('Platform support');
    await expect(row).toContainText('Support event');
    await expect(row).not.toContainText('Reason:');
  });
  test('TAUD-046 Detail with only technical metadata reports no additional business evidence', async ({ page }) => {
    await openAudit(page, { detailRow: { ...auditRows[0], metadata: { request_id: 'pw-technical', path: '/api/shipments' } } });
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(page.locator('.tenant-audit-no-extra-evidence')).toContainText('No additional business evidence was recorded for this event.');
    await expect(page.locator('.tenant-audit-evidence-grid')).toHaveCount(0);
  });
  test('TAUD-047 Server has_more false keeps Next disabled on first page', async ({ page }) => {
    const s = await openAudit(page, { hasMore: false });
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    expect(latestList(s.calls).get('offset')).toBe('0');
  });
  test('TAUD-048 Invalid draft date range never replaces already applied summary/list filter', async ({ page }) => {
    const s = await openAudit(page);
    await filter(page, 'Action').locator('select').selectOption('update');
    await expect.poll(() => latestList(s.calls).get('action')).toBe('update');
    const before = listCalls(s.calls).length;
    await filter(page, 'From').locator('input').fill('2026-11-01');
    await filter(page, 'To').locator('input').fill('2026-01-01');
    await expect(page.getByRole('alert')).toContainText('From date must be before or equal to To date');
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
    expect(latestList(s.calls).get('action')).toBe('update');
    expect(latestList(s.calls).get('to')).toBeNull();
    expect(s.calls.filter(c => c.path.endsWith('/audit/summary') && new URLSearchParams(c.search).get('to') === '2026-01-01')).toHaveLength(0);
    expect(listCalls(s.calls).length).toBe(before);
  });
  test('TAUD-049 Reload does not persist draft filter and reopens tenant-scoped read-only audit', async ({ page }) => {
    const s = await openAudit(page);
    await filter(page, 'Search audit history').locator('input').fill('warehouse');
    await expect.poll(() => latestList(s.calls).get('search')).toBe('warehouse');
    await page.reload();
    await expect(page.locator('#tenant-audit-workspace-top')).toBeVisible();
    await expect(filter(page, 'Search audit history').locator('input')).toHaveValue('');
    expect(latestList(s.calls).get('search')).toBeNull();
    expect(s.calls.filter(c => c.method !== 'GET')).toHaveLength(0);
  });
  test('TAUD-050 Read-only audit page exposes neither edit, delete nor event mutation requests', async ({ page }) => {
    const s = await openAudit(page);
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(page.locator('#tenant-audit-workspace-top').getByRole('button', { name: /(?:Edit|Delete|Archive|Save event)/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    expect(s.calls.every(c => c.method === 'GET')).toBe(true);
  });
});

// Batch 171 — additional source-anchored browser assertions for Tenant Audit.
// All audit calls are intercepted by openAudit; no application service is started.
test.describe('Tenant Audit — source-bound filter, attribution and evidence edge cases (Batch 171)', () => {
  test('TAUD-051 Summary filter transport omits list-only limit and offset', async ({ page }) => {
    const s = await openAudit(page, { hasMore: true });
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => latestList(s.calls).get('offset')).toBe('50');
    const summaries = s.calls.filter(c => c.path.endsWith('/audit/summary'));
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries.every(c => !new URLSearchParams(c.search).has('offset') && !new URLSearchParams(c.search).has('limit'))).toBe(true);
  });

  test('TAUD-052 Selecting a 100-event page makes the next request offset 100', async ({ page }) => {
    const s = await openAudit(page, { hasMore: true });
    await filter(page, 'Events per page').locator('select').selectOption('100');
    await expect.poll(() => latestList(s.calls).get('limit')).toBe('100');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => latestList(s.calls).get('offset')).toBe('100');
  });

  test('TAUD-053 Applying an action filter closes previously selected detail evidence', async ({ page }) => {
    const s = await openAudit(page);
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(page.locator('.tenant-audit-detail-panel')).toBeVisible();
    await filter(page, 'Action').locator('select').selectOption('create');
    await expect.poll(() => latestList(s.calls).get('action')).toBe('create');
    await expect(page.locator('.tenant-audit-detail-panel')).toHaveCount(0);
  });

  test('TAUD-054 Selecting a second event collapses the first selected detail', async ({ page }) => {
    const s = await openAudit(page);
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(auditTable(page).locator('.tenant-audit-detail-panel')).toHaveCount(1);
    await auditTable(page).getByRole('button', { name: 'View details' }).last().click();
    await expect(auditTable(page).locator('.tenant-audit-detail-panel')).toHaveCount(1);
    await expect(auditTable(page).getByRole('button', { name: 'Hide details' })).toHaveCount(1);
    expect(s.calls.some(c => c.path.endsWith('/audit/' + auditRows[1].id))).toBe(true);
  });

  test('TAUD-055 Reset clears support-only and closes an expanded detail without writes', async ({ page }) => {
    const s = await openAudit(page);
    await page.getByRole('checkbox', { name: 'Support-session actions only' }).check();
    await expect.poll(() => latestList(s.calls).get('support_only')).toBe('true');
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(page.locator('.tenant-audit-detail-panel')).toBeVisible();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await expect.poll(() => latestList(s.calls).has('support_only')).toBe(false);
    await expect(page.getByRole('checkbox', { name: 'Support-session actions only' })).not.toBeChecked();
    await expect(page.locator('.tenant-audit-detail-panel')).toHaveCount(0);
    expect(s.calls.every(c => c.method === 'GET')).toBe(true);
  });

  test('TAUD-056 Action and entity filters are consistently applied to list and summary', async ({ page }) => {
    const s = await openAudit(page);
    await filter(page, 'Action').locator('select').selectOption('update');
    await filter(page, 'Entity').locator('select').selectOption('shipments');
    await expect.poll(() => latestList(s.calls).get('entity_type')).toBe('shipments');
    expect(latestList(s.calls).get('action')).toBe('update');
    await expect.poll(() => s.calls.some(c => c.path.endsWith('/audit/summary') && new URLSearchParams(c.search).get('action') === 'update' && new URLSearchParams(c.search).get('entity_type') === 'shipments')).toBe(true);
  });

  test('TAUD-057 Unchecking support-only removes the parameter rather than sending false', async ({ page }) => {
    const s = await openAudit(page);
    const input = page.getByRole('checkbox', { name: 'Support-session actions only' });
    await input.check();
    await expect.poll(() => latestList(s.calls).get('support_only')).toBe('true');
    await input.uncheck();
    await expect.poll(() => latestList(s.calls).has('support_only')).toBe(false);
  });

  test('TAUD-058 Invalid date range marks both dates invalid with linked error text', async ({ page }) => {
    await openAudit(page);
    await filter(page, 'From').locator('input').fill('2026-11-30');
    await filter(page, 'To').locator('input').fill('2026-11-01');
    for (const label of ['From', 'To']) {
      await expect(filter(page, label).locator('input')).toHaveAttribute('aria-invalid', 'true');
      await expect(filter(page, label).locator('input')).toHaveAttribute('aria-describedby', 'tenant-audit-date-range-error');
    }
    await expect(page.locator('#tenant-audit-date-range-error')).toContainText('From date must be before or equal to To date.');
  });

  test('TAUD-059 Clearing applied search removes filter and pending indicator', async ({ page }) => {
    const s = await openAudit(page);
    const search = filter(page, 'Search audit history').locator('input');
    await search.fill('Synthetic');
    await expect.poll(() => latestList(s.calls).get('search')).toBe('Synthetic');
    await search.fill('  ');
    await expect.poll(() => latestList(s.calls).has('search')).toBe(false);
    await expect(page.locator('.tenant-audit-filter-pending')).toHaveCount(0);
  });

  test('TAUD-060 Exact action fallback trims pasted code before sending list query', async ({ page }) => {
    const s = await openAudit(page, { optionsStatus: 403 });
    await filter(page, 'Action').locator('input').fill('  shipment.received  ');
    await expect.poll(() => latestList(s.calls).get('action')).toBe('shipment.received');
    await expect(page.locator('.tenant-audit-filter-pending')).toHaveCount(0);
  });

  test('TAUD-061 Exact entity fallback trims code independently of action', async ({ page }) => {
    const s = await openAudit(page, { optionsStatus: 503 });
    await filter(page, 'Entity').locator('input').fill('  purchase_orders  ');
    await expect.poll(() => latestList(s.calls).get('entity_type')).toBe('purchase_orders');
    expect(latestList(s.calls).has('action')).toBe(false);
  });

  test('TAUD-062 Known request path operations use distinct business verbs', async ({ page }) => {
    const rows = [
      { ...auditRows[0], metadata: { path: `/api/shipments/${UUID}/cancel` } },
      { ...auditRows[1], metadata: { path: `/api/shipments/${UUID}/noop` } },
      { ...auditRows[0], id: '33333333-3333-4333-8333-333333333333', metadata: { path: `/api/purchase-orders/${UUID}/send-to-supplier` } }
    ];
    await openAudit(page, { rows });
    const body = auditTable(page).locator('tbody tr');
    await expect(body.nth(0).locator('.tenant-audit-primary').first()).toHaveText('Cancelled');
    await expect(body.nth(1).locator('.tenant-audit-primary').first()).toHaveText('Marked no-op');
    await expect(body.nth(2).locator('.tenant-audit-primary').first()).toHaveText('Sent to supplier');
  });

  test('TAUD-063 Unlisted request path operation becomes a readable label', async ({ page }) => {
    await openAudit(page, { rows: [{ ...auditRows[0], metadata: { path: `/api/shipments/${UUID}/manual_adjust` } }] });
    await expect(auditTable(page).locator('tbody tr').first().locator('.tenant-audit-primary').first()).toHaveText('Manual Adjust');
  });

  test('TAUD-064 Support actor without name uses platform email as primary attribution', async ({ page }) => {
    await openAudit(page, { rows: [{ ...auditRows[1], metadata: { actor_type: 'support_session', platform_user_email: 'fallback-support@example.invalid' } }] });
    const row = auditTable(page).locator('tbody tr').first();
    await expect(row.locator('.tenant-audit-actor')).toHaveText('fallback-support@example.invalid');
    await expect(row).toContainText('SUPPORT');
  });

  test('TAUD-065 Support session ID remains secondary attribution when email is missing', async ({ page }) => {
    await openAudit(page, { rows: [{ ...auditRows[1], metadata: { actor_type: 'support_session', support_session_id: 'synthetic-support-session-171' } }] });
    const row = auditTable(page).locator('tbody tr').first();
    await expect(row.locator('.tenant-audit-actor')).toHaveText('Platform support');
    await expect(row.locator('.tenant-audit-muted')).toContainText('synthetic-support-session-171');
  });

  test('TAUD-066 Missing source and method distinguish tenant system from support events', async ({ page }) => {
    await openAudit(page, { rows: [
      { ...auditRows[0], metadata: {} },
      { ...auditRows[1], metadata: { actor_type: 'support_session' } }
    ] });
    const rows = auditTable(page).locator('tbody tr');
    await expect(rows.nth(0).locator('.tenant-audit-source-label')).toHaveText('System event');
    await expect(rows.nth(1).locator('.tenant-audit-source-label')).toHaveText('Support event');
  });

  test('TAUD-067 Explicit source code is displayed as a human-readable source label', async ({ page }) => {
    await openAudit(page, { rows: [{ ...auditRows[0], metadata: { source: 'scheduled_inventory_job' } }] });
    await expect(auditTable(page).locator('.tenant-audit-source-label')).toHaveText('Scheduled Inventory Job');
    await expect(auditTable(page).locator('.tenant-audit-method')).toHaveCount(0);
  });

  test('TAUD-068 Technical request path and request ID are hidden again when toggle is off', async ({ page }) => {
    await openAudit(page, { role: 'PW_AUDIT_TECHNICAL' });
    const row = auditTable(page).locator('tbody tr').first();
    await expect(row.locator('.tenant-audit-path')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show technical details' }).click();
    await expect(row.locator('.tenant-audit-path')).toContainText('/api/shipments/');
    await expect(row).toContainText('Request pw-request');
    await page.getByRole('button', { name: 'Hide technical details' }).click();
    await expect(row.locator('.tenant-audit-path')).toHaveCount(0);
    await expect(row).not.toContainText('Request pw-request');
  });

  test('TAUD-069 Non-numeric status is neutral while redirect codes use good status tone', async ({ page }) => {
    await openAudit(page, { rows: [
      { ...auditRows[0], metadata: { status_code: 'unknown' } },
      { ...auditRows[1], metadata: { status_code: 302 } }
    ] });
    const badges = auditTable(page).locator('.tenant-audit-status');
    await expect(badges.nth(0)).toHaveClass(/tenant-audit-status--neutral/);
    await expect(badges.nth(1)).toHaveClass(/tenant-audit-status--good/);
  });

  test('TAUD-070 Business evidence renders booleans, arrays and objects with stable text', async ({ page }) => {
    await openAudit(page, { detailRow: { ...auditRows[0], metadata: {
      was_reconciled: false, count_checked: 0, bins: ['A', 'B'], before_after: { before: 5, after: 3 }
    } } });
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    const grid = page.locator('.tenant-audit-evidence-grid');
    await expect(grid).toContainText('false');
    await expect(grid).toContainText('0');
    await expect(grid).toContainText('["A","B"]');
    await expect(grid).toContainText('{"before":5,"after":3}');
  });

  test('TAUD-071 Empty string and null metadata values do not create phantom evidence', async ({ page }) => {
    await openAudit(page, { detailRow: { ...auditRows[0], metadata: {
      cleared_value: '', optional_reason: null, method: 'PATCH', status_code: 204
    } } });
    await auditTable(page).getByRole('button', { name: 'View details' }).first().click();
    await expect(page.locator('.tenant-audit-evidence-grid')).toHaveCount(0);
    await expect(page.locator('.tenant-audit-no-extra-evidence')).toContainText('No additional business evidence was recorded for this event.');
  });

  test('TAUD-072 Successful CSV export requests both refreshed list and summary evidence', async ({ page }) => {
    const s = await openAudit(page);
    const beforeList = listCalls(s.calls).length;
    const beforeSummary = s.calls.filter(c => c.path.endsWith('/audit/summary')).length;
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();
    await downloadPromise;
    await expect(page.locator('.tenant-audit-message[role="status"]')).toContainText('Audit CSV export downloaded.');
    await expect.poll(() => listCalls(s.calls).length).toBeGreaterThan(beforeList);
    await expect.poll(() => s.calls.filter(c => c.path.endsWith('/audit/summary')).length).toBeGreaterThan(beforeSummary);
  });
});
