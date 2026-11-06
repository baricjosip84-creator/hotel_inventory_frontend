import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 47: source-traced first pass over /inventory-capabilities.
// Require a fully permitted DISPOSABLE tenant; no real API secrets, endpoints or tenants.
// Mocked HTTP replies prove only the browser's handling, never actual delivery, persistence or ACL enforcement.
const productId = '11111111-1111-4111-8111-111111111111';
const locationId = '22222222-2222-4222-8222-222222222222';
const clientId = '33333333-3333-4333-8333-333333333333';
const hookId = '44444444-4444-4444-8444-444444444444';
const product = { id: productId, sku: 'PW-47', name: 'Fixture Widget', unit: 'pcs' };
const location = { id: locationId, name: 'Fixture Main Warehouse', stock_position_count: 2, version: 1 };
const client = { id: clientId, name: 'Fixture ERP', description: 'Fixture client', key_prefix: 'pw_dev_', scopes: ['products:read'], status: 'active', version: 2, allowed_ips: ['203.0.113.10'] };
const webhook = { id: hookId, subscription_key: 'fixture-webhook', display_name: 'Fixture Receiver', event_types: ['inventory.updated'], destination_reference: 'https://example.test/webhook', status: 'configured', version: 3 };
const eventCatalog = { items: [{ event_type: '*', group: 'All', label: 'All listed events' }, { event_type: 'inventory.updated', group: 'Inventory', label: 'Inventory changed' }] };
type Call = { path: string; method: string; query: string; headers: Record<string, string>; body: unknown };
type Options = { tab?: string; target?: string; clients?: unknown[]; connections?: unknown[];
  hooks?: unknown[]; webhookNextCursor?: string | null; deliveryFailure?: boolean;
  failCreateClient?: boolean; failCreateWebhook?: boolean; failOverview?: boolean;
  calls?: Call[]; serials?: unknown[]; serialNextCursor?: string | null; serialCursorError?: boolean; role?: Parameters<typeof loginAsDisposableRole>[1]; definitions?: unknown[]; fieldValues?: unknown[] };
async function openCapabilities(page: Page, opts: Options = {}) {
  if (opts.role) await loginAsDisposableRole(page, opts.role); else await loginAsTenant(page);
  const calls: Call[] = opts.calls ?? [];
  await page.route('**/inventory-capabilities/**', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    if (!path.startsWith('/inventory-capabilities/')) return route.continue();
    const method = route.request().method();
    let body: unknown = null;
    try { body = route.request().postDataJSON(); } catch { /* request without JSON */ }
    calls.push({ path, method, query: url.search, headers: route.request().headers(), body });
    if (method === 'GET') {
      if (path.endsWith('/overview')) return fulfillJson(route, opts.failOverview ? { message: 'Fixture overview unavailable' } : { counts: { api_clients: 1, active_serials: 2, uom_conversions: 3, custom_fields: 4, landed_cost_documents: 5, variants: 6, hierarchical_locations: 7, active_boms: 8, mobile_sync_batches: 9 }, priorities: [] }, opts.failOverview ? 503 : 200);
      if (path.endsWith('/api-clients')) return fulfillJson(route, opts.clients ?? []);
      if (path.endsWith('/connections')) return fulfillJson(route, opts.connections ?? []);
      if (path.endsWith('/webhook-events')) return fulfillJson(route, eventCatalog);
      if (path.endsWith('/webhook-deliveries')) return fulfillJson(route, opts.deliveryFailure ? { message: 'Fixture delivery history unavailable' } : [], opts.deliveryFailure ? 503 : 200);
      if (path.endsWith('/webhooks')) {
        return fulfillJson(route, url.searchParams.has('cursor') ? { items: [webhook], has_more: false, next_cursor: null } : { items: opts.hooks ?? [], has_more: Boolean(opts.webhookNextCursor), next_cursor: opts.webhookNextCursor ?? null });
      }
      if (path.endsWith('/serials')) {
        if (opts.serialCursorError && url.searchParams.has('cursor')) return fulfillJson(route, { code: 'CURSOR_INVALID', message: 'Fixture cursor expired' }, 400);
        return fulfillJson(route, { items: opts.serials ?? [], has_more: Boolean(opts.serialNextCursor), next_cursor: opts.serialNextCursor ?? null });
      }
      if (path.endsWith('/tracking')) return fulfillJson(route, { serial_tracking_enabled: true, serial_uniqueness_scope: 'product', require_serial_on_receipt: false, require_serial_on_issue: false, version: 2 });
      if (path.endsWith('/uom')) return fulfillJson(route, { base_uom: 'pcs', conversions: [{ id: 'fixture-uom', uom_code: 'CASE', uom_name: 'Case', factor_to_base: 24, rounding_scale: 0, purchase_uom: true, issue_uom: false, version: 1 }] });
      if (path.endsWith('/custom-fields')) return fulfillJson(route, opts.definitions ?? []);
      if (path.includes('/custom-fields/')) return fulfillJson(route, opts.fieldValues ?? []);
      if (path.endsWith('/boms') || path.endsWith('/variants') || path.endsWith('/locations') || path.endsWith('/landed-costs')) return fulfillJson(route, []);
      return fulfillJson(route, []);
    }
    if (path.endsWith('/api-clients') && method === 'POST') return fulfillJson(route, opts.failCreateClient ? { code: 'API_CLIENT_ALREADY_EXISTS', message: 'Fixture duplicate key' } : { ...client, ...((body || {}) as Record<string, unknown>), api_key: 'PW47_SYNTHETIC_NOT_REAL', version: 1 }, opts.failCreateClient ? 409 : 201);
    if (path.endsWith('/webhooks') && method === 'POST') return fulfillJson(route, opts.failCreateWebhook ? { code: 'WEBHOOK_URL_INVALID', message: 'Fixture webhook endpoint rejected' } : { ...webhook, signing_secret: 'PW47_FAKE_SIGNING_SECRET' }, opts.failCreateWebhook ? 422 : 201);
    if (path.endsWith('/rotate-secret')) return fulfillJson(route, { ...webhook, signing_secret: 'PW47_NEW_FAKE_SECRET' });
    if (path.endsWith('/rotate')) return fulfillJson(route, { ...client, api_key: 'PW47_ROTATED_FAKE_KEY' });
    if (path.endsWith('/revoke')) return fulfillJson(route, { ...client, status: 'revoked' });
    if (path.endsWith('/test')) return fulfillJson(route, { delivery_id: 'pw47-delivery', queued: true });
    if (path.endsWith('/connections')) return fulfillJson(route, { status: 'configured', version: 1 });
    if (method === 'PATCH') return fulfillJson(route, { ...webhook, status: (body as Record<string, unknown>)?.status ?? 'disabled', version: 4 });
    return fulfillJson(route, {});
  });
  await page.route('**/products', route => route.request().isNavigationRequest() ? route.continue() : fulfillJson(route, [product]));
  await page.route('**/storage-locations', route => route.request().isNavigationRequest() ? route.continue() : fulfillJson(route, [location]));
  await page.route('**/shipments', route => route.request().isNavigationRequest() ? route.continue() : fulfillJson(route, []));
  await page.route('**/suppliers', route => route.request().isNavigationRequest() ? route.continue() : fulfillJson(route, []));
  await page.route('**/purchase-orders', route => route.request().isNavigationRequest() ? route.continue() : fulfillJson(route, []));
  await page.route('**/stock', route => route.request().isNavigationRequest() ? route.continue() : fulfillJson(route, []));
  await page.goto(opts.target || ('/inventory-capabilities' + (opts.tab ? `?capability_tab=${encodeURIComponent(opts.tab)}` : '')));
  await expect(page.getByRole('heading', { name: 'Advanced inventory workspace' })).toBeVisible();
  return { calls };
}
const capTab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
const actionCalls = (calls: Call[]) => calls.filter(call => call.method !== 'GET');

// Route, tab visibility and URL state remain separate from an individual panel's business workflow.
test.describe('Inventory Capabilities — tab and route state (Batch 47)', () => {
  test('TICAP-001 Default route opens Serial tracking when permitted', async ({ page }) => {
    await openCapabilities(page);
    await expect(capTab(page, 'Serial tracking')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Serial tracking', { exact: true }).first()).toBeVisible();
  });
  test('TICAP-002 APIs & integrations tab is URL selectable', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations' });
    await expect(capTab(page, 'APIs & integrations')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Let another system talk to this inventory app' })).toBeVisible();
  });
  test('TICAP-003 Units of measure tab is URL selectable', async ({ page }) => {
    await openCapabilities(page, { tab: 'uom' });
    await expect(capTab(page, 'Units of measure')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Select a product to view its units of measure.')).toBeVisible();
  });
  test('TICAP-004 Custom fields tab can be selected', async ({ page }) => {
    await openCapabilities(page, { tab: 'custom-fields' });
    await expect(capTab(page, 'Custom fields')).toHaveAttribute('aria-selected', 'true');
  });
  test('TICAP-005 Landed cost tab can be selected', async ({ page }) => {
    await openCapabilities(page, { tab: 'landed-cost' });
    await expect(capTab(page, 'Landed cost')).toHaveAttribute('aria-selected', 'true');
  });
  test('TICAP-006 Variants tab can be selected', async ({ page }) => {
    await openCapabilities(page, { tab: 'variants' });
    await expect(capTab(page, 'Variants')).toHaveAttribute('aria-selected', 'true');
  });
  test('TICAP-007 Location hierarchy tab can be selected', async ({ page }) => {
    await openCapabilities(page, { tab: 'hierarchy' });
    await expect(capTab(page, 'Location hierarchy')).toHaveAttribute('aria-selected', 'true');
  });
  test('TICAP-008 BOM & assemblies tab can be selected', async ({ page }) => {
    await openCapabilities(page, { tab: 'bom' });
    await expect(capTab(page, 'BOM & assemblies')).toHaveAttribute('aria-selected', 'true');
  });
  test('TICAP-009 Offline task mode tab can be selected', async ({ page }) => {
    await openCapabilities(page, { tab: 'mobile' });
    await expect(capTab(page, 'Offline task mode')).toHaveAttribute('aria-selected', 'true');
  });
  test('TICAP-010 Tab navigation preserves unrelated URL parameters', async ({ page }) => {
    await openCapabilities(page, { target: '/inventory-capabilities?trace=fixture&capability_tab=integrations' });
    await capTab(page, 'Units of measure').click();
    await expect(page).toHaveURL(/trace=fixture/);
    await expect(page).toHaveURL(/capability_tab=uom/);
  });
  test('TICAP-011 Leaving units tab removes stale uom_product_id', async ({ page }) => {
    await openCapabilities(page, { target: `/inventory-capabilities?capability_tab=uom&uom_product_id=${productId}` });
    await capTab(page, 'APIs & integrations').click();
    await expect(page).not.toHaveURL(/uom_product_id=/);
    await expect(page).toHaveURL(/capability_tab=integrations/);
  });
  test('TICAP-012 Unknown capability tab resolves to valid default section', async ({ page }) => {
    await openCapabilities(page, { target: '/inventory-capabilities?capability_tab=does-not-exist' });
    await expect(capTab(page, 'Serial tracking')).toHaveAttribute('aria-selected', 'true');
  });
  test('TICAP-013 Overview metrics are presented without inventing unreturned counts', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations' });
    await expect(page.locator('[aria-label="Advanced inventory capability summary"]')).toContainText('Active API keys');
    await expect(page.locator('[aria-label="Advanced inventory capability summary"]')).toContainText('1');
  });
  test('TICAP-014 Overview failure still permits navigation to readable panels', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations', failOverview: true });
    await expect(capTab(page, 'APIs & integrations')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Connection registry' })).toBeVisible();
  });
});

test.describe('Inventory Capabilities — API key and integration lifecycle (Batch 47)', () => {
  test('TICAP-015 Empty API key list shows the registry empty state', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations', clients: [] });
    await expect(page.getByText('No API keys have been created yet.')).toBeVisible();
  });
  test('TICAP-016 API registry displays metadata but never a previously issued secret', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations', clients: [client] });
    const row = page.getByRole('row').filter({ hasText: 'Fixture ERP' });
    await expect(row).toContainText('pw_dev_');
    await expect(page.getByText('PW47_SYNTHETIC_NOT_REAL')).toHaveCount(0);
  });
  test('TICAP-017 Blank connection name disables API-key creation', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations' });
    await expect(page.getByRole('button', { name: 'Create API key' })).toBeDisabled();
    await page.getByLabel('Connection name').fill(' ');
    await expect(page.getByRole('button', { name: 'Create API key' })).toBeDisabled();
  });
  test('TICAP-018 At least one delegated API permission is required before creation', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations' });
    await page.getByLabel('Connection name').fill('Fixture New Key');
    await expect(page.getByText('Select at least one API permission.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create API key' })).toBeDisabled();
  });
  test('TICAP-019 Selecting a grantable scope enables API key creation', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations' });
    await page.getByLabel('Connection name').fill('Fixture New Key');
    await page.getByRole('group', { name: 'API permissions' }).getByRole('checkbox').first().check();
    await expect(page.getByRole('button', { name: 'Create API key' })).toBeEnabled();
  });
  test('TICAP-020 Synthetic successful API-key creation submits scope/IP metadata and reveals key once', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations' });
    await page.getByLabel('Connection name').fill('Fixture Fresh Key');
    await page.getByLabel('Allowed IP addresses').fill(' 203.0.113.10, 2001:db8::10 ');
    await page.getByRole('group', { name: 'API permissions' }).getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Create API key' }).click();
    await expect(page.getByText('PW47_SYNTHETIC_NOT_REAL')).toBeVisible();
    const create = calls.find(c => c.method === 'POST' && c.path.endsWith('/api-clients'));
    expect(create?.body).toMatchObject({ name: 'Fixture Fresh Key', allowed_ips: ['203.0.113.10', '2001:db8::10'] });
    expect((create?.body as { scopes: string[] }).scopes.length).toBeGreaterThan(0);
  });
  test('TICAP-021 API-key creation conflict leaves error and does not reveal a key', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations', failCreateClient: true });
    await page.getByLabel('Connection name').fill('Fixture Duplicate Key');
    await page.getByRole('group', { name: 'API permissions' }).getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Create API key' }).click();
    await expect(page.getByText('An API client with this name already exists.')).toBeVisible();
    await expect(page.getByText('Copy this key now. It is only shown once:')).toHaveCount(0);
  });
  test('TICAP-022 Edit preloads API client fields and locks immutable client name', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations', clients: [client] });
    await page.getByRole('row').filter({ hasText: 'Fixture ERP' }).getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('Connection name')).toHaveValue('Fixture ERP');
    await expect(page.getByLabel('Connection name')).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save changes' }).first()).toBeVisible();
  });
  test('TICAP-023 API edit sends the version from the selected row', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', clients: [client] });
    await page.getByRole('row').filter({ hasText: 'Fixture ERP' }).getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Description').fill('Edited fixture');
    await page.getByRole('button', { name: 'Save changes' }).first().click();
    await expect.poll(() => actionCalls(calls).length).toBe(1);
    const saved = actionCalls(calls)[0];
    expect(saved.path).toContain(`/api-clients/${clientId}`);
    expect(saved.headers['if-match-version']).toBe('2');
  });
  test('TICAP-024 Cancel API edit restores creation mode without a mutation', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', clients: [client] });
    await page.getByRole('row').filter({ hasText: 'Fixture ERP' }).getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await expect(page.getByLabel('Connection name')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Create API key' })).toBeVisible();
    expect(actionCalls(calls)).toHaveLength(0);
  });
  test('TICAP-025 Dismissing API secret rotation confirmation sends no request', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', clients: [client] });
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('row').filter({ hasText: 'Fixture ERP' }).getByRole('button', { name: 'Rotate secret' }).click();
    expect(actionCalls(calls)).toHaveLength(0);
  });
  test('TICAP-026 Confirmed API secret rotation submits version and reveals replacement', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', clients: [client] });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('row').filter({ hasText: 'Fixture ERP' }).getByRole('button', { name: 'Rotate secret' }).click();
    await expect(page.getByText('PW47_ROTATED_FAKE_KEY')).toBeVisible();
    const rotate = calls.find(c => c.path.endsWith('/rotate') && c.method === 'POST');
    expect(rotate?.headers['if-match-version']).toBe('2');
  });
  test('TICAP-027 Dismissing revoke confirmation does not revoke API key', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', clients: [client] });
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('row').filter({ hasText: 'Fixture ERP' }).getByRole('button', { name: 'Revoke' }).click();
    expect(actionCalls(calls)).toHaveLength(0);
  });
  test('TICAP-028 Confirmed revoke sends reason and shows synthetic UI acknowledgment', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', clients: [client] });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('row').filter({ hasText: 'Fixture ERP' }).getByRole('button', { name: 'Revoke' }).click();
    await expect(page.getByText('API key revoked. Systems using that key can no longer authenticate.')).toBeVisible();
    const request = calls.find(c => c.path.endsWith('/revoke'));
    expect(request?.body).toMatchObject({ reason: 'Revoked from tenant Integrations page' });
  });
});

test.describe('Inventory Capabilities — webhook and connection registry (Batch 47)', () => {
  test('TICAP-029 Webhook creation remains disabled without chosen events', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations' });
    await page.getByLabel('HTTPS destination').fill('https://example.test/hook');
    await page.locator('form').filter({ has: page.getByLabel('HTTPS destination') }).getByLabel('Name').fill('Fixture Hook');
    await expect(page.getByRole('button', { name: 'Create webhook' })).toBeDisabled();
  });
  test('TICAP-030 Wildcard webhook event replaces individually chosen event', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations' });
    const events = page.getByRole('group', { name: 'Events' });
    await events.getByRole('checkbox').nth(1).check();
    await events.getByRole('checkbox').first().check();
    await expect(events.getByRole('checkbox').first()).toBeChecked();
    await expect(events.getByRole('checkbox').nth(1)).not.toBeChecked();
  });
  test('TICAP-031 Successful synthetic webhook creation reveals signing secret with feedback', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations' });
    await page.getByLabel('HTTPS destination').fill('https://example.test/hook');
    await page.locator('form').filter({ has: page.getByLabel('HTTPS destination') }).getByLabel('Name').fill('Fixture Hook');
    await page.getByRole('group', { name: 'Events' }).getByRole('checkbox').nth(1).check();
    await page.getByRole('button', { name: 'Create webhook' }).click();
    await expect(page.getByText('PW47_FAKE_SIGNING_SECRET')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Webhook created.' }).first()).toBeVisible();
    expect(calls.some(c => c.path.endsWith('/webhooks') && c.method === 'POST')).toBeTruthy();
  });
  test('TICAP-032 Rejected webhook creation does not report success or reveal a secret', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations', failCreateWebhook: true });
    await page.getByLabel('HTTPS destination').fill('https://example.test/hook');
    await page.locator('form').filter({ has: page.getByLabel('HTTPS destination') }).getByLabel('Name').fill('Fixture Hook');
    await page.getByRole('group', { name: 'Events' }).getByRole('checkbox').nth(1).check();
    await page.getByRole('button', { name: 'Create webhook' }).click();
    await expect(page.getByText('Enter a valid webhook destination URL.').first()).toBeVisible();
    await expect(page.getByText('PW47_FAKE_SIGNING_SECRET')).toHaveCount(0);
  });
  test('TICAP-033 Load more webhooks uses next cursor and adds a received row', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', hooks: [], webhookNextCursor: 'fixture-next' });
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Fixture Receiver' })).toBeVisible();
    expect(calls.some(c => c.method === 'GET' && c.path.endsWith('/webhooks') && c.query.includes('cursor=fixture-next'))).toBeTruthy();
  });
  test('TICAP-034 Test webhook only asserts queued acknowledgment, not delivery', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', hooks: [webhook] });
    await page.getByRole('row').filter({ hasText: 'Fixture Receiver' }).getByRole('button', { name: 'Test' }).click();
    await expect(page.getByText('Test webhook queued. Delivery status will appear below.').first()).toBeVisible();
    expect(calls.some(c => c.method === 'POST' && c.path.endsWith(`/${hookId}/test`))).toBeTruthy();
  });
  test('TICAP-035 Disabling webhook issues versioned PATCH without claiming actual delivery shutdown', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', hooks: [webhook] });
    await page.getByRole('row').filter({ hasText: 'Fixture Receiver' }).getByRole('button', { name: 'Disable' }).click();
    await expect(page.getByText('Webhook disabled.').first()).toBeVisible();
    const req = calls.find(c => c.method === 'PATCH' && c.path.endsWith(`/${hookId}`));
    expect(req?.headers['if-match-version']).toBe('3');
    expect(req?.body).toMatchObject({ status: 'disabled' });
  });
  test('TICAP-036 Rotate webhook signing secret shows only new synthetic value', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', hooks: [webhook] });
    await page.getByRole('row').filter({ hasText: 'Fixture Receiver' }).getByRole('button', { name: 'Rotate secret' }).click();
    await expect(page.getByText('PW47_NEW_FAKE_SECRET')).toBeVisible();
    expect(calls.some(c => c.method === 'POST' && c.path.endsWith(`/${hookId}/rotate-secret`))).toBeTruthy();
  });
  test('TICAP-037 Failed delivery-history GET displays error rather than an empty successful history', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations', deliveryFailure: true });
    await expect(page.getByText('Fixture delivery history unavailable')).toBeVisible();
    await expect(page.getByText('No webhook delivery attempts yet.')).toHaveCount(0);
  });
  test('TICAP-038 Connection registry cannot submit a blank system name', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations' });
    await expect(page.getByRole('button', { name: 'Save connection' })).toBeDisabled();
    await page.getByLabel('System name').fill('  ');
    await expect(page.getByRole('button', { name: 'Save connection' })).toBeDisabled();
  });
  test('TICAP-039 Connection registration sends structured fields but does not claim synchronization', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations' });
    await page.getByLabel('System name').fill('Fixture Accounting');
    await page.getByLabel('Type').selectOption('accounting');
    await page.getByLabel('Direction').selectOption('outbound');
    await page.getByRole('button', { name: 'Save connection' }).click();
    await expect(page.getByText('Connection registered.')).toBeVisible();
    const req = calls.find(c => c.method === 'POST' && c.path.endsWith('/connections'));
    expect(req?.body).toMatchObject({ system_name: 'Fixture Accounting', system_type: 'accounting', direction: 'outbound', expected_version: 0 });
  });
});

test.describe('Inventory Capabilities — serials and units first pass (Batch 47)', () => {
  test('TICAP-040 Serial search propagates a paginated request and renders fixture identity', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'serials', serials: [{ id: 'pw-serial', serial_number: 'PW47-SERIAL-001', status: 'available', product_name: product.name, product_sku: product.sku, storage_location_name: location.name }] });
    await page.getByLabel('Search serial registry').fill('PW47-SERIAL');
    await expect(page.getByRole('row').filter({ hasText: 'PW47-SERIAL-001' })).toBeVisible();
    await expect.poll(() => calls.some(c => c.method === 'GET' && c.path.endsWith('/serials') && c.query.includes('search=PW47-SERIAL'))).toBeTruthy();
  });
  test('TICAP-041 UoM deep link selects product and shows server-supplied base and conversion', async ({ page }) => {
    const { calls } = await openCapabilities(page, { target: `/inventory-capabilities?capability_tab=uom&uom_product_id=${productId}` });
    await expect(capTab(page, 'Units of measure')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('row').filter({ hasText: 'CASE' })).toBeVisible();
    expect(calls.some(c => c.method === 'GET' && c.path.endsWith(`/products/${productId}/uom`))).toBeTruthy();
  });
});


// BATCH 50 — completion of the remaining source-traced integrations, serials,
// UoM and custom-field cases. HTTP fixtures are artificial; no real deliveries,
// serial registration or persisted field values are verified by these declarations.
test.describe('Inventory Capabilities — final integration and reference safety cases (Batch 50)', () => {
  test('TICAP-142 Webhook creation retry after a rejected destination preserves configured event choices', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', failCreateWebhook: true });
    const form = page.locator('form').filter({ has: page.getByLabel('HTTPS destination') });
    await form.getByLabel('Name').fill('Retry receiver');
    await page.getByLabel('HTTPS destination').fill('https://example.test/receiver');
    const event = page.getByRole('group', { name: 'Events' }).getByRole('checkbox').nth(1);
    await event.check(); await page.getByRole('button', { name: 'Create webhook' }).click();
    await expect(page.getByText('Enter a valid webhook destination URL.').first()).toBeVisible();
    await expect(event).toBeChecked();
    await expect(form.getByLabel('Name')).toHaveValue('Retry receiver');
    await page.getByLabel('HTTPS destination').fill('https://example.test/corrected');
    await page.getByRole('button', { name: 'Create webhook' }).click();
    const attempts = calls.filter(c => c.method === 'POST' && c.path.endsWith('/webhooks'));
    expect(attempts).toHaveLength(2);
    expect(attempts[1].body).toMatchObject({ event_types: ['inventory.updated'], destination_url: 'https://example.test/corrected' });
  });
  test('TICAP-143 Webhook disable or enable captures expected subscription version', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations', hooks: [webhook] });
    await page.getByRole('row').filter({ hasText: 'Fixture Receiver' }).getByRole('button', { name: 'Disable' }).click();
    const patch = calls.find(c => c.method === 'PATCH' && c.path.endsWith(`/${hookId}`));
    expect(patch?.headers['if-match-version']).toBe('3');
    expect(patch?.body).toMatchObject({ status: 'disabled' });
    await expect(page.getByText('Webhook disabled.').first()).toBeVisible();
  });
  test('TICAP-144 Webhook secret rotation failure does not present a newly issued secret', async ({ page }) => {
    await openCapabilities(page, { tab: 'integrations', hooks: [webhook] });
    await page.route(`**/inventory-capabilities/webhooks/${hookId}/rotate-secret`, route => fulfillJson(route, { code: 'WEBHOOK_VERSION_CONFLICT', message: 'Fixture version conflict' }, 409));
    await page.getByRole('row').filter({ hasText: 'Fixture Receiver' }).getByRole('button', { name: 'Rotate secret' }).click();
    await expect(page.getByRole('alert').filter({ hasText: /version conflict|changed/i }).first()).toBeVisible();
    await expect(page.getByText('Copy this signing secret now. It is only shown once:')).toHaveCount(0);
  });
  test('TICAP-145 External connection creation sends reference only and never displays credential secret', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'integrations' });
    await page.getByLabel('System name').fill('Synthetic ERP');
    await page.getByLabel('Credential reference (not a password)').fill('vault://test/erp-token');
    await page.getByRole('button', { name: 'Save connection' }).click();
    const write = calls.find(c => c.method === 'POST' && c.path.endsWith('/connections'));
    expect(write?.body).toMatchObject({ system_name: 'Synthetic ERP', credential_reference: 'vault://test/erp-token' });
    expect(JSON.stringify(write?.body)).not.toContain('password');
    await expect(page.getByText('Connection registered.')).toBeVisible();
  });
  test('TICAP-146 Serial write actions remain disabled without stock adjustment capability', async ({ page }) => {
    await openCapabilities(page, { tab: 'serials', role: 'PW_ICAP_NO_ADJUST' });
    await expect(page.getByText('Product write, storage-location read, stock read and stock adjust permissions are required to register a serial against existing inventory.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register serial' })).toBeDisabled();
  });
  test('TICAP-147 Serial paging reports an invalid cursor without dropping previous records', async ({ page }) => {
    const id = { id: 'serial-prev-50', serial_number: 'PW50-PRESERVED', product_name: 'Fixture Widget', product_sku: 'PW-47', status: 'available', storage_location_name: 'Fixture Main Warehouse' };
    const { calls } = await openCapabilities(page, { tab: 'serials', serials: [id], serialNextCursor: 'expired-cursor', serialCursorError: true });
    await expect(page.getByRole('row').filter({ hasText: 'PW50-PRESERVED' })).toBeVisible();
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.getByText(/Fixture cursor expired|cursor/i).first()).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'PW50-PRESERVED' })).toBeVisible();
    expect(calls.some(c => c.path.endsWith('/serials') && c.query.includes('cursor=expired-cursor'))).toBeTruthy();
  });
  test('TICAP-148 Expired lot selection prevents serial registration from claiming success', async ({ page }) => {
    const { calls } = await openCapabilities(page, { tab: 'serials' });
    await page.route('**/stock/lots?*', route => fulfillJson(route, [{ id: 'expired-lot', lot_number: 'EXP-50', quantity: 10, operational_status: 'expired' }]));
    await page.getByRole('combobox', { name: 'Product' }).selectOption(productId);
    await page.getByLabel('Location').selectOption(locationId);
    await page.getByPlaceholder('Serial number').fill('PW50-EXPIRED');
    await expect(page.getByRole('button', { name: 'Register serial' })).toBeDisabled();
    expect(actionCalls(calls).filter(c => c.path.endsWith('/serials'))).toHaveLength(0);
  });
  test('TICAP-149 UoM delete sends versioned request and refetches list without claiming verified deletion', async ({ page }) => {
    const { calls } = await openCapabilities(page, { target: `/inventory-capabilities?capability_tab=uom&uom_product_id=${productId}` });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('row').filter({ hasText: 'CASE' }).getByRole('button', { name: 'Delete' }).click();
    const remove = calls.find(c => c.method === 'DELETE' && c.path.endsWith('/uom/fixture-uom'));
    expect(remove?.headers['if-match-version']).toBe('1');
    await expect.poll(() => calls.filter(c => c.method === 'GET' && c.path.endsWith(`/products/${productId}/uom`)).length).toBeGreaterThan(1);
    // Source intentionally has no success toast/readback-verification on delete.
  });
  test('TICAP-150 UoM positive conversion-factor guard and existing rounding scale carried on edit', async ({ page }) => {
    const { calls } = await openCapabilities(page, { target: `/inventory-capabilities?capability_tab=uom&uom_product_id=${productId}` });
    await page.getByRole('row').filter({ hasText: 'CASE' }).getByRole('button', { name: 'Edit' }).click();
    const factor = page.getByLabel('Units in base unit');
    await expect(factor).toHaveAttribute('min', '0.000001');
    await factor.fill('0'); await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await factor.fill('24.5'); await page.getByRole('button', { name: 'Save changes' }).click();
    expect(calls.find(c => c.method === 'POST' && c.path.endsWith(`/products/${productId}/uom`))?.body).toMatchObject({ factor_to_base: 24.5, rounding_scale: 0 });
  });
  test('TICAP-151 Custom-field type edit conflict preserves unsaved definition for correction', async ({ page }) => {
    const definition = { id: 'def50', entity_type: 'product', field_key: 'origin', label: 'Origin', data_type: 'text', is_required: false, is_active: true, sort_order: 0, options: [], version: 4 };
    await openCapabilities(page, { tab: 'custom-fields', definitions: [definition] });
    await page.route('**/inventory-capabilities/custom-fields', route => route.request().method() === 'POST' ? fulfillJson(route, { code: 'VERSION_CONFLICT', message: 'Fixture definition changed' }, 409) : fulfillJson(route, [definition]));
    await page.getByRole('row').filter({ hasText: 'origin' }).getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Field name').fill('Origin corrected');
    await page.getByLabel('Type', { exact: true }).selectOption('number');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByLabel('Field name')).toHaveValue('Origin corrected');
    await expect(page.getByRole('heading', { name: 'Edit custom field' })).toBeVisible();
  });
  test('TICAP-152 Entity reference selector excludes rows inaccessible by role permission', async ({ page }) => {
    await openCapabilities(page, { tab: 'custom-fields', role: 'PW_ICAP_CUSTOM_PRODUCT_ONLY' });
    await expect(page.getByLabel('Entity type').locator('option[value="product"]')).toHaveCount(1);
    for (const kind of ['supplier', 'shipment', 'storage_location', 'purchase_order']) {
      await expect(page.getByLabel('Entity type').locator(`option[value="${kind}"]`)).toHaveCount(0);
    }
  });
  test('TICAP-153 Custom-field value version conflict retains draft and does not claim verified save', async ({ page }) => {
    const row = { id: 'value50', definition_id: 'def50', entity_type: 'product', entity_id: productId, field_key: 'origin', label: 'Country of origin', data_type: 'text', value: 'Before', version: 2, definition_version: 3, is_required: false, options: [] };
    await openCapabilities(page, { tab: 'custom-fields', fieldValues: [row] });
    await page.route(`**/inventory-capabilities/custom-fields/product/${productId}`, route => route.request().method() === 'PUT'
      ? fulfillJson(route, { code: 'CUSTOM_FIELD_VERSION_CONFLICT', message: 'Fixture value conflict' }, 409) : fulfillJson(route, [row]));
    await page.getByLabel('Product').selectOption(productId);
    await page.getByLabel('Country of origin').fill('Draft preserved');
    await page.getByRole('button', { name: 'Save custom fields' }).click();
    await expect(page.getByLabel('Country of origin')).toHaveValue('Draft preserved');
    await expect(page.getByRole('alert').filter({ hasText: 'Custom field values were not confirmed as saved.' })).toBeVisible();
    await expect(page.getByText('Custom field values saved and verified.')).toHaveCount(0);
  });
});
