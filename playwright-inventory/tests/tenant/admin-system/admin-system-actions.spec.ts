import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 37: source-derived AdminSystemPage alert lifecycle and permission boundaries.
// All POSTs are synthetic intercepted HTTP responses; no real alert, ledger or lock is changed.
// Phase 2 will need independently provisioned disposable role credentials (see README).
type Role = 'PW_ADMIN_DIAG_ONLY' | 'PW_ADMIN_MANAGE_ALERTS' | 'PW_ADMIN_OVERRIDE' | 'PW_ADMIN_NO_STATUS' | 'PW_ADMIN_NO_DIAGNOSTICS';
type Call = { method: string; path: string; search: string; body: Record<string, unknown> | null };
const ID = '11111111-1111-4111-8111-111111111111';
const baseStatus = { tenant_id: 'pw-tenant', generated_at: '2026-10-02T08:00:00.000Z', system_write_locked: false, tenant_write_locked: false, maintenance_mode: false, unresolved_blocking_alerts: 1 };
const baseAlert = { id: ID, tenant_id: 'pw-tenant', product_id: 'pw-prod', product_name: 'Synthetic Inventory', type: 'NEGATIVE_STOCK_BLOCKING', message: 'Synthetic blocker', severity: 'high', created_at: '2026-10-02T07:00:00.000Z', acknowledged: false };
const baseStock = { id: 'stock-01', tenant_id: 'pw-tenant', product_id: 'product-with-a-long-identifier', product_name: 'Synthetic Inventory', product_unit: 'pcs', storage_location_id: 'location-with-long-identifier', storage_location_name: 'Storage A', quantity: -3, updated_at: '2026-10-01T00:00:00Z' };
const baseShipment = { id: 'shipment-with-long-identifier', tenant_id: 'pw-tenant', status: 'finalized', po_number: 'PO-X1', supplier_name: 'Vendor', total_ordered_quantity: 10, total_received_quantity: 8, shortage_line_count: 1, undocumented_shortage_line_count: 1 };
type Options = { role?: Role; locked?: 'platform' | 'tenant'; acknowledged?: boolean; alert?: Record<string, unknown>; status?: Record<string, unknown>; stock?: Record<string, unknown>; shipment?: Record<string, unknown>; fail?: 'acknowledge' | 'resolve' | 'override'; failDiagnostic?: string; failRefresh?: boolean; delayStatus?: boolean };
async function open(page: Page, options: Options = {}) {
  if (options.role) await loginAsDisposableRole(page, options.role); else await loginAsTenant(page);
  const calls: Call[] = [];
  let currentAlert = { ...baseAlert, acknowledged: Boolean(options.acknowledged), ...options.alert };
  let statusFetches = 0;
  await page.route('**/*', async (route: Route) => {
    const req = route.request();
    if (req.isNavigationRequest()) return route.continue();
    const url = new URL(req.url()), path = url.pathname, method = req.method();
    if (!path.endsWith('/system-status') && !path.includes('/admin/diagnostics/') && !path.includes('/admin/alerts/')) return route.continue();
    let body: Record<string, unknown> | null = null;
    try { body = req.postData() ? req.postDataJSON() as Record<string, unknown> : null; } catch { body = null; }
    calls.push({ method, path, search: url.search, body });
    if (path.endsWith('/system-status')) {
      statusFetches += 1;
      if (options.delayStatus) await new Promise(resolve => setTimeout(resolve, 800));
      if (options.failRefresh && statusFetches > 1) return fulfillJson(route, { message: 'Synthetic refresh failure' }, 403);
      return fulfillJson(route, { ...baseStatus, system_write_locked: options.locked === 'platform', tenant_write_locked: options.locked === 'tenant', ...options.status });
    }
    if (path.includes('/admin/diagnostics/')) {
      if (options.failDiagnostic && path.endsWith('/' + options.failDiagnostic)) return fulfillJson(route, { message: 'Synthetic diagnostic forbidden' }, 403);
      if (path.endsWith('/blocking-alerts')) return fulfillJson(route, [currentAlert]);
      if (path.endsWith('/stock-integrity')) return fulfillJson(route, [{ ...baseStock, ...options.stock }]);
      if (path.endsWith('/broken-shipments')) return fulfillJson(route, [{ ...baseShipment, ...options.shipment }]);
    }
    const match = path.match(/\/admin\/alerts\/([^/]+)\/(acknowledge|resolve|override)$/);
    if (match && method === 'POST') {
      if (options.fail === match[2]) return fulfillJson(route, { message: `Synthetic ${match[2]} denied` }, 409);
      if (match[2] === 'acknowledge') currentAlert = { ...currentAlert, acknowledged: true };
      else currentAlert = { ...currentAlert, acknowledged: true };
      return fulfillJson(route, { message: `Synthetic ${match[2]} successful`, alert: currentAlert });
    }
    return fulfillJson(route, { message: 'Unexpected synthetic admin request' }, 405);
  });
  await page.goto('/admin-system');
  if (options.role !== 'PW_ADMIN_NO_STATUS') await expect(page.locator('#admin-system-workspace-top')).toBeVisible();
  return { calls, get statusFetches() { return statusFetches; } };
}
const actions = (calls: Call[]) => calls.filter(c => c.method === 'POST');
const alertCard = (page: Page) => page.locator('.admin-system-diagnostic-card--blocking').first();
const resolve = (page: Page) => alertCard(page).getByRole('button', { name: 'Resolve', exact: true });
const override = (page: Page) => alertCard(page).getByRole('button', { name: 'Override and close blocking alert' });
const note = (page: Page) => alertCard(page).getByRole('textbox', { name: 'Resolution note' });
const reason = (page: Page) => alertCard(page).getByRole('textbox', { name: 'Mandatory override reason' });

 test.describe('Admin System — actions and permissions (Batch 37)', () => {
  test('TADM-021 Diagnostics permission gate hides restricted details but keeps posture', async ({ page }) => {
    const s = await open(page, { role: 'PW_ADMIN_NO_DIAGNOSTICS' });
    await expect(page.getByText('Diagnostics require Tenant Diagnostics · Read permission.')).toBeVisible();
    await expect(page.locator('.admin-system-status-grid')).toBeVisible();
    expect(s.calls.some(c => c.path.includes('/admin/diagnostics/'))).toBe(false);
  });
  test('TADM-022 Manage role shows Acknowledge and Resolve without override', async ({ page }) => {
    await open(page, { role: 'PW_ADMIN_MANAGE_ALERTS' });
    await expect(alertCard(page).getByRole('button', { name: 'Acknowledge' })).toBeVisible();
    await expect(resolve(page)).toBeVisible(); await expect(override(page)).toHaveCount(0);
  });
  test('TADM-023 Override role exposes emergency reason editor', async ({ page }) => {
    await open(page, { role: 'PW_ADMIN_OVERRIDE' });
    await expect(reason(page)).toBeVisible(); await expect(override(page)).toBeDisabled();
  });
  test('TADM-024 Acknowledge targets selected alert ID with empty JSON body', async ({ page }) => {
    const s = await open(page, { role: 'PW_ADMIN_MANAGE_ALERTS' });
    await alertCard(page).getByRole('button', { name: 'Acknowledge' }).click();
    await expect.poll(() => actions(s.calls).length).toBe(1);
    expect(actions(s.calls)[0].path).toMatch(new RegExp(`/admin/alerts/${ID}/acknowledge$`));
    expect(actions(s.calls)[0].body).toEqual({});
  });
  test('TADM-025 Acknowledgement removes redundant button after refresh', async ({ page }) => {
    await open(page, { role: 'PW_ADMIN_MANAGE_ALERTS' });
    await alertCard(page).getByRole('button', { name: 'Acknowledge' }).click();
    await expect(alertCard(page).getByRole('button', { name: 'Acknowledge', exact: true })).toHaveCount(0);
    await expect(alertCard(page)).toContainText('Acknowledged');
  });
  test('TADM-026 Resolve requires three trimmed characters', async ({ page }) => {
    const s = await open(page, { role: 'PW_ADMIN_MANAGE_ALERTS' });
    await expect(resolve(page)).toBeDisabled(); await note(page).fill('  ab  ');
    await expect(resolve(page)).toBeDisabled(); await note(page).fill('  abc  ');
    await expect(resolve(page)).toBeEnabled(); expect(actions(s.calls)).toHaveLength(0);
  });
  test('TADM-027 Resolve sends trimmed note to correct alert and shows outcome', async ({ page }) => {
    const s = await open(page, { role: 'PW_ADMIN_MANAGE_ALERTS' });
    await note(page).fill('  Inventory reconciled  '); await resolve(page).click();
    await expect.poll(() => actions(s.calls).length).toBe(1);
    expect(actions(s.calls)[0].path).toMatch(new RegExp(`/admin/alerts/${ID}/resolve$`));
    expect(actions(s.calls)[0].body).toEqual({ resolution_note: 'Inventory reconciled' });
    await expect(page.locator('.admin-system-message[role="status"]')).toContainText('Synthetic resolve successful');
  });
  test('TADM-028 Rejected resolve retains note and shows an error', async ({ page }) => {
    await open(page, { role: 'PW_ADMIN_MANAGE_ALERTS', fail: 'resolve' });
    await note(page).fill('Investigated balance'); await resolve(page).click();
    await expect(page.getByRole('alert')).toContainText('Synthetic resolve denied');
    await expect(note(page)).toHaveValue('Investigated balance');
  });
  test('TADM-029 Override enforces trimmed minimum length', async ({ page }) => {
    const s = await open(page, { role: 'PW_ADMIN_OVERRIDE' });
    await reason(page).fill('  ab  '); await expect(override(page)).toBeDisabled();
    await reason(page).fill('  abc  '); await expect(override(page)).toBeEnabled();
    expect(actions(s.calls)).toHaveLength(0);
  });
  test('TADM-030 Cancel emergency confirmation without any POST', async ({ page }) => {
    const s = await open(page, { role: 'PW_ADMIN_OVERRIDE' });
    await reason(page).fill('Verified emergency');
    page.once('dialog', dialog => dialog.dismiss()); await override(page).click();
    expect(actions(s.calls)).toHaveLength(0); await expect(reason(page)).toHaveValue('Verified emergency');
  });
  test('TADM-031 Confirmed override sends trimmed reason and correct ID', async ({ page }) => {
    const s = await open(page, { role: 'PW_ADMIN_OVERRIDE' });
    await reason(page).fill('  Verified emergency  ');
    page.once('dialog', dialog => dialog.accept()); await override(page).click();
    await expect.poll(() => actions(s.calls).length).toBe(1);
    expect(actions(s.calls)[0].path).toMatch(new RegExp(`/admin/alerts/${ID}/override$`));
    expect(actions(s.calls)[0].body).toEqual({ reason: 'Verified emergency' });
  });
  test('TADM-032 Override error preserves reason and diagnostic row', async ({ page }) => {
    await open(page, { role: 'PW_ADMIN_OVERRIDE', fail: 'override' }); await reason(page).fill('Emergency rationale');
    page.once('dialog', dialog => dialog.accept()); await override(page).click();
    await expect(page.getByRole('alert')).toContainText('Synthetic override denied');
    await expect(reason(page)).toHaveValue('Emergency rationale');
    await expect(alertCard(page)).toContainText('Synthetic blocker');
  });
  test('TADM-033 Platform lock disables alert mutations', async ({ page }) => {
    const s = await open(page, { locked: 'platform' });
    await expect(page.locator('.admin-system-panel').first()).toContainText('WRITES BLOCKED');
    await expect(alertCard(page).getByRole('button', { name: 'Acknowledge' })).toBeDisabled();
    await expect(resolve(page)).toBeDisabled(); await expect(override(page)).toBeDisabled();
    expect(actions(s.calls)).toHaveLength(0);
  });
  test('TADM-034 Tenant lock retains readable diagnostics but disables actions', async ({ page }) => {
    const s = await open(page, { locked: 'tenant' });
    await expect(alertCard(page)).toContainText('Synthetic blocker');
    await expect(alertCard(page).getByRole('button', { name: 'Acknowledge' })).toBeDisabled();
    await expect(page.getByText('Alert actions are disabled while the effective write status is locked.')).toBeVisible();
    expect(actions(s.calls)).toHaveLength(0);
  });
  test('TADM-035 Acknowledged alert shows Resolve but no Acknowledge', async ({ page }) => {
    await open(page, { role: 'PW_ADMIN_MANAGE_ALERTS', acknowledged: true });
    await expect(alertCard(page)).toContainText('Acknowledged');
    await expect(alertCard(page).getByRole('button', { name: 'Acknowledge', exact: true })).toHaveCount(0);
    await expect(resolve(page)).toBeVisible();
  });
  test('TADM-036 Pending mutation disables concurrent action controls', async ({ page }) => {
    await open(page, { role: 'PW_ADMIN_MANAGE_ALERTS' });
    // Route delay for a single intercepted POST keeps the mutation pending without touching server state.
    await page.route('**/admin/alerts/*/acknowledge', async route => {
      await new Promise(resolve => setTimeout(resolve, 650));
      await fulfillJson(route, { message: 'Synthetic ack', alert: { ...baseAlert, acknowledged: true } });
    });
    await alertCard(page).getByRole('button', { name: 'Acknowledge' }).click();
    await expect(resolve(page)).toBeDisabled(); await expect(note(page)).toBeDisabled();
  });
  test('TADM-037 Failed status refetch reports incomplete refresh', async ({ page }) => {
    await open(page, { failRefresh: true }); await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Refresh incomplete');
  });
  test('TADM-038 Refresh disabled while status is loading', async ({ page }) => {
    await open(page, { delayStatus: true });
    // When already loaded, a manual refresh also has a fetching window.
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
  });
  test('TADM-039 Missing optional status keys use safe fallbacks', async ({ page }) => {
    await open(page, { status: { tenant_id: undefined, generated_at: undefined, timestamp: undefined, unresolved_blocking_alerts: undefined } });
    await expect(page.locator('.admin-system-status-item--tenant')).toContainText('—');
    await expect(page.locator('.admin-system-status-grid')).toContainText('Unresolved blocking alerts');
  });
  test('TADM-040 Unknown alert type remains source text', async ({ page }) => {
    await open(page, { alert: { type: 'CUSTOM_RECONCILIATION_BLOCK' } });
    await expect(alertCard(page)).toContainText('CUSTOM_RECONCILIATION_BLOCK');
  });
  test('TADM-041 Unknown severity remains source text', async ({ page }) => {
    await open(page, { alert: { severity: 'unusual' } });
    await expect(alertCard(page)).toContainText('unusual');
  });
  test('TADM-042 Stock labels fall back to shortened identifiers', async ({ page }) => {
    await open(page, { stock: { product_name: null, storage_location_name: null } });
    const section = page.locator('.admin-system-diagnostic-group').filter({ has: page.getByRole('heading', { name: 'Stock integrity' }) });
    await expect(section).toContainText('Product product-…');
    await expect(section).toContainText('location location…');
  });
  test('TADM-043 Shipment without PO uses shortened shipment identifier', async ({ page }) => {
    await open(page, { shipment: { po_number: null } });
    const section = page.locator('.admin-system-diagnostic-group').filter({ has: page.getByRole('heading', { name: 'Shipment integrity' }) });
    await expect(section).toContainText('Shipment shipment…');
  });
  test('TADM-044 Numeric shipment counts normalize numeric text', async ({ page }) => {
    await open(page, { shipment: { total_ordered_quantity: '15', total_received_quantity: '10', undocumented_shortage_line_count: '2' } });
    const section = page.locator('.admin-system-diagnostic-group').filter({ has: page.getByRole('heading', { name: 'Shipment integrity' }) });
    await expect(section).toContainText('Ordered 15'); await expect(section).toContainText('Received 10');
    await expect(section).toContainText('Undocumented shortage lines 2');
  });
  test('TADM-045 All diagnostic GETs use bounded limit 100', async ({ page }) => {
    const s = await open(page);
    await expect.poll(() => s.calls.filter(c => c.path.includes('/admin/diagnostics/') && c.method === 'GET').length).toBe(3);
    expect(s.calls.filter(c => c.path.includes('/admin/diagnostics/') && c.method === 'GET').every(c => new URLSearchParams(c.search).get('limit') === '100')).toBe(true);
  });
  test('TADM-046 Forbidden shipment diagnostics do not remove other evidence', async ({ page }) => {
    await open(page, { failDiagnostic: 'broken-shipments' });
    await expect(page.getByText('Synthetic diagnostic forbidden')).toBeVisible();
    await expect(page.getByText('Synthetic blocker')).toBeVisible();
    await expect(page.locator('.admin-system-diagnostic-group').filter({ has: page.getByRole('heading', { name: 'Stock integrity' }) })).toContainText('Synthetic Inventory');
  });
  test('TADM-047 Tenant diagnostics cannot write platform locks', async ({ page }) => {
    const s = await open(page);
    await expect(page.locator('.admin-system-status-grid').getByRole('button')).toHaveCount(0);
    expect(s.calls.filter(c => c.path.includes('write-lock') && c.method !== 'GET')).toHaveLength(0);
  });
  test('TADM-048 Keyboard refresh makes GET requests only', async ({ page }) => {
    const s = await open(page); const before = s.statusFetches;
    await page.getByRole('button', { name: 'Refresh', exact: true }).focus(); await page.keyboard.press('Enter');
    await expect.poll(() => s.statusFetches).toBeGreaterThan(before); expect(actions(s.calls)).toHaveLength(0);
  });
  test('TADM-049 Missing system status read permission denies routed page', async ({ page }) => {
    const s = await open(page, { role: 'PW_ADMIN_NO_STATUS' });
    await expect(page.locator('#admin-system-workspace-top')).toHaveCount(0);
    expect(s.calls.filter(c => c.path.endsWith('/system-status'))).toHaveLength(0);
  });
  test('TADM-050 Missing diagnostics read permission emits no diagnostics GETs', async ({ page }) => {
    const s = await open(page, { role: 'PW_ADMIN_NO_DIAGNOSTICS' });
    await expect(page.getByText('Diagnostics require Tenant Diagnostics · Read permission.')).toBeVisible();
    expect(s.calls.filter(c => c.path.includes('/admin/diagnostics/'))).toHaveLength(0);
  });
});
