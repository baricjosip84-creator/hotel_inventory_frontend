import { test, expect } from '@playwright/test';
import { fullVisibility, openSyntheticPlatformDashboard, platformDashboard, syntheticJwt, SYNTHETIC_PLATFORM_USER_ID } from '../../../support/platformSession';
import { fulfillJson } from '../../../support/tenantSession';

// Batch 50: platform overview is read-only. All data and permissions here are
// synthetic, including any dashboard request after pressing Refresh.
test.describe('Platform Dashboard — permission-aware data and attention (Batch 50)', () => {
  test('PDASH-001 Dashboard displays explicit read-only, platform-scoped overview', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    await expect(page.getByText('Platform-scoped')).toBeVisible();
    await expect(page.getByText('Read-only operational summary')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });
  test('PDASH-002 Session and audit metrics render only for visible dimensions', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    await expect(page.getByText('Active platform sessions', { exact: true })).toBeVisible();
    await expect(page.getByText('Audit events last 24h')).toBeVisible();
    await expect(page.getByText('5', { exact: true }).first()).toBeVisible();
  });
  test('PDASH-003 Tenant status panel groups server-supplied state counts', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const block = page.locator('.platform-dashboard__panel').filter({ hasText: 'Tenants by status' });
    await expect(block.getByText('Active')).toBeVisible();
    await expect(block.getByText('Trial')).toBeVisible();
    await expect(block.getByText('7')).toBeVisible();
  });
  test('PDASH-004 Support session status overview uses server-provided count', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const block = page.locator('.platform-dashboard__panel').filter({ hasText: 'Support sessions' }).first();
    await expect(block.getByText('Active')).toBeVisible();
    await expect(block.getByText('3')).toBeVisible();
  });
  test('PDASH-005 Notifications status/severity breakdown is visible with permission', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const block = page.locator('.platform-dashboard__panel').filter({ hasText: 'Notifications' }).first();
    await expect(block.getByText('Open · Critical')).toBeVisible();
    await expect(block.getByText('4')).toBeVisible();
  });
  test('PDASH-006 Billing attention includes tenant and lifecycle summary', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const block = page.locator('.platform-dashboard__panel').filter({ hasText: 'Billing / lifecycle attention' });
    await expect(block.getByText('Billing Fixture Tenant')).toBeVisible();
    await expect(block.getByText(/Billing: Overdue/)).toBeVisible();
  });
  test('PDASH-007 Limit attention shows threshold percentage and configured usage', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const block = page.locator('.platform-dashboard__panel').filter({ hasText: 'Limit attention' });
    await expect(block.getByText('Limit Fixture Tenant')).toBeVisible();
    await expect(block.getByText('Products: 85/100 (85%)')).toBeVisible();
  });
  test('PDASH-008 Active support access displays operator, reason and ticket reference', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const block = page.locator('.platform-dashboard__panel').filter({ hasText: 'Active support sessions' });
    await expect(block.getByText('Support Fixture Tenant')).toBeVisible();
    await expect(block.getByText('Ticket: PW50-TEST')).toBeVisible();
    await expect(block.getByText('Reason: Synthetic issue')).toBeVisible();
  });
  test('PDASH-009 Locked tenant section distinguishes lifecycle from billing', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const block = page.locator('.platform-dashboard__panel').filter({ hasText: 'Locked tenants' });
    await expect(block.getByText('Locked Fixture Tenant')).toBeVisible();
    await expect(block.getByText('Locked · Active · Plus')).toBeVisible();
  });
  test('PDASH-010 Stale-activity panel says Never recorded for null last_seen', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const block = page.locator('.platform-dashboard__panel').filter({ hasText: 'Stale active / trial tenants' });
    await expect(block.getByText('Stale Fixture Tenant')).toBeVisible();
    await expect(block.getByText('Last activity: Never recorded')).toBeVisible();
  });
  test('PDASH-011 Empty server arrays display explicit empty-state descriptions', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: {
      ...platformDashboard, tenants_by_status: [], support_sessions_by_status: [], notifications: [],
      attention: { billing_or_lifecycle: [], locked_tenants: [], stale_tenants: [], limit_attention: [], active_support_sessions: [] }
    } });
    await expect(page.getByText('No tenant status data')).toBeVisible();
    await expect(page.getByText('No support sessions').first()).toBeVisible();
    await expect(page.getByText('No locked tenants')).toBeVisible();
  });
  test('PDASH-012 Visibility flags hide restricted tenant and billing evidence', async ({ page }) => {
    const visibility = { ...fullVisibility, tenants: false, billing_attention: false, support_sessions: false, notifications: false, platform_sessions: false, audit: false };
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, visibility } });
    await expect(page.getByText('Billing Fixture Tenant')).toHaveCount(0);
    await expect(page.getByText('Locked Fixture Tenant')).toHaveCount(0);
    await expect(page.getByText('Audit events last 24h')).toHaveCount(0);
    await expect(page.getByText('attention visibility depends on platform permissions')).toBeVisible();
  });
  test('PDASH-013 Initial dashboard API failure shows actionable retry without fake metrics', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboardStatus: 503 });
    await expect(page.getByRole('alert')).toContainText('Platform dashboard failed to load.');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByText('Active platform sessions', { exact: true })).toHaveCount(0);
  });
  test('PDASH-014 Manual Refresh issues a new GET instead of changing data via POST', async ({ page }) => {
    const requests: string[] = [];
    await openSyntheticPlatformDashboard(page, { onCall: (method, path) => { if (path === '/platform/dashboard') requests.push(method); } });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect.poll(() => requests.length).toBeGreaterThan(1);
    expect(requests.every(method => method === 'GET')).toBeTruthy();
  });
  test('PDASH-015 Failed manual refresh retains last successful snapshot with warning', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    await expect(page.getByText('Billing Fixture Tenant')).toBeVisible();
    await page.route('**/platform/dashboard', route => fulfillJson(route, { message: 'Fixture refresh failed' }, 503));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Latest refresh failed.' })).toBeVisible();
    await expect(page.getByText('Billing Fixture Tenant')).toBeVisible();
  });
});


// Batch 51: additional source-traced, transport-isolated platform dashboard cases.
test.describe('Platform Dashboard — refresh, links, visibility and formatting (Batch 51)', () => {
  test('PDASH-016 Refresh is locked in flight and shows Refreshing…', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    let resolve!: () => void;
    const gate = new Promise<void>(r => { resolve = r; });
    await page.route('**/platform/dashboard', async route => {
      await gate;
      await fulfillJson(route, platformDashboard);
    });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
    resolve();
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  });
  test('PDASH-017 Initial retry can recover from a synthetic 503', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboardStatus: 503 });
    await expect(page.getByRole('alert')).toContainText('Platform dashboard failed to load.');
    await page.route('**/platform/dashboard', route => fulfillJson(route, platformDashboard));
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByText('Billing Fixture Tenant')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
  test('PDASH-018 Missing dashboard permission is redirected by the router, not rendered', async ({ page }) => {
    const token = syntheticJwt();
    await page.addInitScript(t => { localStorage.setItem('inventory_platform_access_token', t); localStorage.setItem('inventory_locale', 'en-GB'); }, token);
    await page.route('**/platform/**', route => {
      if (route.request().isNavigationRequest()) return route.continue();
      const path = new URL(route.request().url()).pathname.replace(/^\/api(?=\/)/, '');
      if (path === '/platform/auth/me') return fulfillJson(route, { id: SYNTHETIC_PLATFORM_USER_ID, email: 'fixture@example.test', role: 'superadmin', is_active: true });
      if (path === '/platform/permissions/me') return fulfillJson(route, { platform_user_id: SYNTHETIC_PLATFORM_USER_ID, role: 'superadmin', permissions: ['platform.tenants.read'] });
      if (path === '/platform/auth/refresh') return fulfillJson(route, { message: 'No synthetic cookie' }, 401);
      return fulfillJson(route, []);
    });
    await page.goto('/platform/dashboard');
    await expect(page).toHaveURL(/\/platform\/?$/);
    await expect(page.getByRole('heading', { name: 'Platform operations workspace' })).toHaveCount(0);
  });
  test('PDASH-019 Invalid server generated_at renders Not available', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, generated_at: 'not-an-ISO-date' } });
    await expect(page.locator('.platform-dashboard__refresh-meta')).toHaveText('Last refreshed: Not available');
  });
  test('PDASH-020 Empty generated_at never invents a refresh date', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, generated_at: '' } });
    await expect(page.locator('.platform-dashboard__refresh-meta')).toHaveText('Last refreshed: Not available');
  });
  test('PDASH-021 Metric links point to platform sessions and audit details', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const metrics = page.locator('.platform-dashboard__metric');
    await expect(metrics.filter({ hasText: 'Active platform sessions' }).getByRole('link', { name: 'Open details' })).toHaveAttribute('href', '/platform/sessions');
    await expect(metrics.filter({ hasText: 'Audit events last 24h' }).getByRole('link', { name: 'Open details' })).toHaveAttribute('href', '/platform/audit');
    await expect(metrics.filter({ hasText: 'Attention items' }).getByRole('link', { name: 'Open details' })).toHaveCount(0);
  });
  test('PDASH-022 Tenant visibility false hides tenant overview and all tenant links', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, visibility: { ...fullVisibility, tenants: false } } });
    await expect(page.getByText('Tenants by status')).toHaveCount(0);
    await expect(page.getByText('Limit Fixture Tenant')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open tenants' })).toHaveCount(0);
  });
  test('PDASH-023 No support visibility suppresses active support evidence and links', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, visibility: { ...fullVisibility, support_sessions: false } } });
    await expect(page.getByText('Support Fixture Tenant')).toHaveCount(0);
    await expect(page.getByText('Support sessions', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Open support sessions' })).toHaveCount(0);
  });
  test('PDASH-024 Attention total excludes hidden billing and tenant items', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, visibility: { ...fullVisibility, tenants: false, billing_attention: false } } });
    const card = page.locator('.platform-dashboard__metric').filter({ hasText: 'Attention items' });
    await expect(card.locator('.io-workspace-stat__value')).toHaveText('1');
    await expect(page.getByText('Billing Fixture Tenant')).toHaveCount(0);
  });
  test('PDASH-025 Tenant status humanizes underscored enum values', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, tenants_by_status: [{ status: 'pending_review', count: 9 }] } });
    const panel = page.locator('.platform-dashboard__panel').filter({ hasText: 'Tenants by status' });
    await expect(panel.getByText('Pending review')).toBeVisible();
    await expect(panel.getByText('9')).toBeVisible();
  });
  test('PDASH-026 Notification status and severity humanize enum strings', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, notifications: [{ status: 'needs_follow_up', severity: 'high_priority', count: 6 }] } });
    const panel = page.locator('.platform-dashboard__panel').filter({ hasText: 'Notifications' }).first();
    await expect(panel.getByText('Needs follow up · High priority')).toBeVisible();
  });
  test('PDASH-027 Missing plan_code falls back to No plan', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, attention: { ...platformDashboard.attention, billing_or_lifecycle: [{ ...platformDashboard.attention.billing_or_lifecycle[0], plan_code: '' }] } } });
    await expect(page.getByText(/Plan: No plan/)).toBeVisible();
  });
  test('PDASH-028 Tenant identity shortens long IDs but preserves tooltip', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const identity = page.locator('.platform-dashboard__panel').filter({ hasText: 'Billing / lifecycle attention' }).locator('.platform-dashboard__id');
    await expect(identity).toHaveAttribute('title', 'bill-50-tenant');
    await expect(identity).toHaveText('ID bill-50-…');
  });
  test('PDASH-029 A snapshot without visibility flags displays permission fallback', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, visibility: undefined as unknown as typeof fullVisibility } });
    await expect(page.getByText('Your role can open the Platform Dashboard, but no detailed dashboard data categories are available with its current platform permissions.')).toBeVisible();
    await expect(page.getByText('Billing Fixture Tenant')).toHaveCount(0);
  });
  test('PDASH-030 Recorded stale activity is rendered rather than Never recorded', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, attention: { ...platformDashboard.attention, stale_tenants: [{ ...platformDashboard.attention.stale_tenants[0], last_seen_at: '2026-10-01T10:00:00Z' }] } } });
    const panel = page.locator('.platform-dashboard__panel').filter({ hasText: 'Stale active / trial tenants' });
    await expect(panel.getByText('Never recorded')).toHaveCount(0);
    await expect(panel.getByText(/Last activity: /)).toBeVisible();
  });
  test('PDASH-031 Invalid support expiry uses Not available fallback', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, attention: { ...platformDashboard.attention, active_support_sessions: [{ ...platformDashboard.attention.active_support_sessions[0], expires_at: 'invalid-time' }] } } });
    const panel = page.locator('.platform-dashboard__panel').filter({ hasText: 'Active support sessions' });
    await expect(panel.getByText('Expires: Not available')).toBeVisible();
  });
  test('PDASH-032 Successful refetch replaces snapshot and removes previous warning', async ({ page }) => {
    await openSyntheticPlatformDashboard(page);
    const next = { ...platformDashboard, generated_at: '2026-11-03T12:00:00Z', active_platform_sessions: 99 };
    await page.route('**/platform/dashboard', route => fulfillJson(route, next));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.locator('.platform-dashboard__metric').filter({ hasText: 'Active platform sessions' }).locator('.io-workspace-stat__value')).toHaveText('99');
    await expect(page.getByText('Latest refresh failed.')).toHaveCount(0);
  });
  test('PDASH-033 Hiding audit does not hide tenant and notification summaries', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, visibility: { ...fullVisibility, audit: false } } });
    await expect(page.getByText('Audit events last 24h')).toHaveCount(0);
    await expect(page.getByText('Tenants by status')).toBeVisible();
    await expect(page.getByText('Notifications', { exact: true }).first()).toBeVisible();
  });
  test('PDASH-034 Zero visible attention is neutral and preserves empty states', async ({ page }) => {
    await openSyntheticPlatformDashboard(page, { dashboard: { ...platformDashboard, attention: { billing_or_lifecycle: [], limit_attention: [], stale_tenants: [], locked_tenants: [], active_support_sessions: [] } } });
    const card = page.locator('.platform-dashboard__metric').filter({ hasText: 'Attention items' });
    await expect(card).toHaveAttribute('data-tone', 'good');
    await expect(card.locator('.io-workspace-stat__value')).toHaveText('0');
    await expect(page.getByText('No locked tenants')).toBeVisible();
  });
  test('PDASH-035 Dashboard detail navigation issues GET only, never writes', async ({ page }) => {
    const methods: string[] = [];
    await openSyntheticPlatformDashboard(page, { onCall: (method) => methods.push(method) });
    await page.locator('.platform-dashboard__panel').filter({ hasText: 'Tenants by status' }).getByRole('link', { name: 'Open tenants' }).click();
    await expect(page).toHaveURL(/\/platform\/tenants/);
    expect(methods.length).toBeGreaterThan(0);
    expect(methods.every(method => method === 'GET')).toBe(true);
  });
});
