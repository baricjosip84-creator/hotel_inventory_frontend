import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 36 initial tenant Admin System coverage. GETs are replaced with fixed
// synthetic evidence; tenant write-lock, diagnostic accuracy and server-side
// permission enforcement require separate Phase 2 integration verification.
type Call = { method: string; path: string; search: string };
type Json = Record<string, unknown>;
const statusFixture = {
  status: 'ok', tenant_id: 'pw-tenant-diagnostics', timestamp: '2026-10-01T10:00:00.000Z',
  generated_at: '2026-10-01T10:01:00.000Z', system_write_locked: false,
  tenant_write_locked: false, maintenance_mode: false, unresolved_blocking_alerts: 2
};
const alert = { id: 'pw-alert-01', tenant_id: 'pw-tenant-diagnostics', product_id: 'pw-product-01', product_name: 'Synthetic Product', type: 'NEGATIVE_STOCK_BLOCKING', message: 'Synthetic alert requires review', severity: 'high', created_at: '2026-10-01T08:00:00.000Z', acknowledged: false };
const stock = { id: 'pw-stock-01', tenant_id: 'pw-tenant-diagnostics', product_id: 'pw-product-01', product_name: 'Synthetic Product', product_unit: 'pcs', storage_location_id: 'pw-location-01', storage_location_name: 'Synthetic Warehouse', quantity: -4, updated_at: '2026-10-01T08:00:00.000Z' };
const shipment = { id: 'pw-shipment-01', tenant_id: 'pw-tenant-diagnostics', status: 'finalized', po_number: 'PO-PW-001', supplier_name: 'Synthetic Supplier', total_ordered_quantity: 10, total_received_quantity: 7, shortage_line_count: 1, undocumented_shortage_line_count: 1 };
type Options = { status?: Json; statusHttp?: number; alerts?: Json[]; stock?: Json[]; shipments?: Json[]; failDiagnostic?: 'blocking-alerts'|'stock-integrity'|'broken-shipments'; alertHttp?: number };
async function openAdmin(page: Page, opts: Options = {}) {
  await loginAsTenant(page);
  const calls: Call[] = [];
  await page.route('**/*', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const url = new URL(route.request().url()), path = url.pathname, method = route.request().method();
    if (!path.endsWith('/system-status') && !path.includes('/admin/diagnostics/')) return route.continue();
    calls.push({ method, path, search: url.search });
    if (path.endsWith('/system-status')) return fulfillJson(route, opts.statusHttp ? { message: 'Synthetic system status unavailable' } : { ...statusFixture, ...opts.status }, opts.statusHttp ?? 200);
    const kind = path.split('/').at(-1);
    if (kind === opts.failDiagnostic) return fulfillJson(route, { message: 'Synthetic diagnostics unavailable' }, opts.alertHttp ?? 403);
    if (kind === 'blocking-alerts') return fulfillJson(route, opts.alerts ?? [alert]);
    if (kind === 'stock-integrity') return fulfillJson(route, opts.stock ?? [stock]);
    if (kind === 'broken-shipments') return fulfillJson(route, opts.shipments ?? [shipment]);
    return route.continue();
  });
  await page.goto('/admin-system');
  await expect(page.locator('#admin-system-workspace-top')).toBeVisible();
  return { calls };
}
const writes = (calls: Call[]) => calls.filter(c => c.method !== 'GET');
const posture = (page: Page) => page.locator('.admin-system-panel').filter({ hasText: 'Operational posture' });
const diagnostics = (page: Page) => page.locator('.admin-system-panel').filter({ hasText: 'Tenant diagnostics' });
const diagnosticGroup = (page: Page, kind: string) => page.locator('.admin-system-diagnostic-group').filter({ has: page.getByRole('heading', { name: kind, exact: true }) });

test.describe('Admin System — read-only posture and diagnostics (Batch 36)', () => {
  test('TADM-001 Tenant admin system loads through actual status GET', async ({ page }) => {
    const s = await openAdmin(page); await expect(page.getByRole('heading', { name: 'Admin system', exact: true })).toBeVisible();
    expect(s.calls.some(c => c.path.endsWith('/system-status') && c.method === 'GET')).toBe(true); expect(writes(s.calls)).toHaveLength(0);
  });
  test('TADM-002 Unlocked status renders WRITES OPEN and individual CLEAR lock badges', async ({ page }) => {
    const s = await openAdmin(page); await expect(posture(page)).toContainText('WRITES OPEN');
    await expect(posture(page)).toContainText('Platform write lock'); await expect(posture(page)).toContainText('Tenant write lock'); expect(writes(s.calls)).toHaveLength(0);
  });
  test('TADM-003 Platform-only write lock reports blocked operations', async ({ page }) => {
    await openAdmin(page, { status: { system_write_locked: true } }); await expect(posture(page)).toContainText('WRITES BLOCKED');
    await expect(posture(page)).toContainText('platform write lock');
  });
  test('TADM-004 Tenant-only write lock identifies tenant as blocker', async ({ page }) => {
    await openAdmin(page, { status: { tenant_write_locked: true } }); await expect(posture(page)).toContainText('WRITES BLOCKED');
    await expect(posture(page)).toContainText('tenant write lock');
  });
  test('TADM-005 Combined locks identify both sources without mutation control', async ({ page }) => {
    const s = await openAdmin(page, { status: { system_write_locked: true, tenant_write_locked: true } });
    await expect(posture(page)).toContainText('both the platform and tenant write locks'); expect(writes(s.calls)).toHaveLength(0);
  });
  test('TADM-006 Maintenance mode enabled is visible and read-only', async ({ page }) => {
    const s = await openAdmin(page, { status: { maintenance_mode: true } });
    await expect(posture(page).locator('.admin-system-status-item').filter({ hasText: 'Maintenance mode' })).toContainText('ACTIVE'); expect(writes(s.calls)).toHaveLength(0);
  });
  test('TADM-007 Disabled maintenance reports OFF instead of active', async ({ page }) => {
    await openAdmin(page, { status: { maintenance_mode: false } });
    await expect(posture(page).locator('.admin-system-status-item').filter({ hasText: 'Maintenance mode' })).toContainText('OFF');
  });
  test('TADM-008 Blocking KPI uses authoritative status count not loaded row count', async ({ page }) => {
    await openAdmin(page, { status: { unresolved_blocking_alerts: 18 }, alerts: [alert] });
    await expect(posture(page).locator('.admin-system-status-item').filter({ hasText: 'Unresolved blocking alerts' })).toContainText('18');
  });
  test('TADM-009 Malformed status blocker count falls back to numeric zero', async ({ page }) => {
    await openAdmin(page, { status: { unresolved_blocking_alerts: 'not-a-number' } });
    await expect(posture(page).locator('.admin-system-status-item').filter({ hasText: 'Unresolved blocking alerts' })).toContainText('0');
  });
  test('TADM-010 Forbidden system-status reports unavailable and preserves diagnostic area', async ({ page }) => {
    const s = await openAdmin(page, { statusHttp: 403 });
    await expect(posture(page)).toContainText('STATUS UNAVAILABLE'); await expect(diagnostics(page)).toBeVisible(); expect(writes(s.calls)).toHaveLength(0);
  });
  test('TADM-011 Reported timestamp does not fall back to missing placeholder', async ({ page }) => {
    await openAdmin(page); const reported = posture(page).locator('.admin-system-status-item').filter({ hasText: 'Reported at' });
    await expect(reported.locator('strong')).not.toHaveText('—');
  });
  test('TADM-012 Tenant ID is displayed from status response', async ({ page }) => {
    const s = await openAdmin(page); await expect(posture(page).locator('.admin-system-status-item--tenant')).toContainText('pw-tenant-diagnostics'); expect(writes(s.calls)).toHaveLength(0);
  });
  test('TADM-013 Posture does not expose controls to alter platform/tenant locks', async ({ page }) => {
    const s = await openAdmin(page); await expect(posture(page).getByRole('button')).toHaveCount(0); expect(writes(s.calls)).toHaveLength(0);
  });
  test('TADM-014 Blocking alert presents mapped readable type and evidence text', async ({ page }) => {
    await openAdmin(page); await expect(diagnosticGroup(page, 'Blocking alerts')).toContainText('Negative stock');
    await expect(diagnosticGroup(page, 'Blocking alerts')).toContainText('Synthetic alert requires review');
  });
  test('TADM-015 Blocking alert shows source severity and acknowledgement state', async ({ page }) => {
    await openAdmin(page); const row = diagnosticGroup(page, 'Blocking alerts').locator('.admin-system-diagnostic-card--blocking');
    await expect(row).toContainText('High'); await expect(row).toContainText('Not acknowledged');
  });
  test('TADM-016 Negative stock renders product, storage and quantity', async ({ page }) => {
    await openAdmin(page); const group = diagnosticGroup(page, 'Stock integrity');
    await expect(group).toContainText('Synthetic Product'); await expect(group).toContainText('Synthetic Warehouse'); await expect(group).toContainText('NEGATIVE STOCK');
  });
  test('TADM-017 Finalized shipment shortage displays PO and source counts', async ({ page }) => {
    await openAdmin(page); const group = diagnosticGroup(page, 'Shipment integrity');
    await expect(group).toContainText('PO-PW-001'); await expect(group).toContainText('UNDOCUMENTED SHORTAGE');
    await expect(group).toContainText('Synthetic Supplier');
  });
  test('TADM-018 Empty diagnostic lists render three separate safe empty states', async ({ page }) => {
    const s = await openAdmin(page, { alerts: [], stock: [], shipments: [], status: { unresolved_blocking_alerts: 0 } });
    await expect(diagnosticGroup(page, 'Blocking alerts')).toContainText('No unresolved blocking diagnostics');
    await expect(diagnosticGroup(page, 'Stock integrity')).toContainText('No negative stock integrity issues');
    await expect(diagnosticGroup(page, 'Shipment integrity')).toContainText('No invalid finalized shipments'); expect(writes(s.calls)).toHaveLength(0);
  });
  test('TADM-019 Partial diagnostic forbidden failure does not hide other sections', async ({ page }) => {
    const s = await openAdmin(page, { failDiagnostic: 'stock-integrity' });
    await expect(diagnosticGroup(page, 'Stock integrity')).toContainText('Synthetic diagnostics unavailable');
    await expect(diagnosticGroup(page, 'Shipment integrity')).toContainText('PO-PW-001'); expect(writes(s.calls)).toHaveLength(0);
  });
  test('TADM-020 Refresh re-queries status and all three diagnostics without POST', async ({ page }) => {
    const s = await openAdmin(page); await expect(diagnosticGroup(page, 'Shipment integrity')).toContainText('PO-PW-001');
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Admin system data refreshed.' }).first()).toBeVisible();
    for (const path of ['/system-status', '/admin/diagnostics/blocking-alerts', '/admin/diagnostics/stock-integrity', '/admin/diagnostics/broken-shipments']) {
      expect(s.calls.filter(c => c.path.endsWith(path) && c.method === 'GET').length).toBeGreaterThanOrEqual(2);
    }
    expect(writes(s.calls)).toHaveLength(0);
  });
});
