import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 48. Synthetic tenant-only browser fixtures. These cases assert UI/HTTP transport,
// NEVER real delivery, authorization, persistence, serial quantity or stock-cost correctness.
const PRODUCT = '11111111-1111-4111-8111-111111111111';
const PRODUCT_B = '11111111-1111-4111-8111-111111111112';
const LOCATION = '22222222-2222-4222-8222-222222222222';
const LOT = '33333333-3333-4333-8333-333333333333';
const HOOK = '44444444-4444-4444-8444-444444444444';
const CONNECTION = '55555555-5555-4555-8555-555555555555';
const DEF = '66666666-6666-4666-8666-666666666666';
const products = [{ id: PRODUCT, sku: 'PW48-ONE', name: 'Fixture Alpha', unit: 'pcs' }, { id: PRODUCT_B, sku: 'PW48-TWO', name: 'Fixture Beta', unit: 'pcs' }];
const places = [{ id: LOCATION, name: 'Fixture Store', version: 1 }];
const connected = { id: CONNECTION, system_name: 'Fixture ERP', system_type: 'erp', base_url: 'https://fixture.example.test', direction: 'inbound', credential_reference: 'test/reference', version: 4, status: 'configured' };
const hook = { id: HOOK, display_name: 'Fixture Hook', destination_reference: 'https://fixture.example.test/hook', event_types: ['inventory.updated'], subscription_key: 'fixture-hook', version: 2, status: 'configured' };
const def = { id: DEF, entity_type: 'product', field_key: 'origin', label: 'Origin', data_type: 'text', options: [], is_required: false, is_active: true, sort_order: 0, version: 2 };
const uomRow = { id: '77777777-7777-4777-8777-777777777777', uom_code: 'CASE', uom_name: 'Case', factor_to_base: 24, rounding_scale: 0, purchase_uom: true, issue_uom: false, barcode: null, version: 2 };
const lot = { id: LOT, inventory_lot_id: LOT, lot_number: 'LOT-48', quantity: 3, operational_status: 'available', status: 'available' };
type Sent = { path: string; query: string; method: string; headers: Record<string, string>; body: any };
type Setup = { tab?: string; role?: Parameters<typeof loginAsDisposableRole>[1]; clients?: unknown[]; connections?: unknown[]; hooks?: unknown[]; deliveries?: unknown[];
  failGet?: string; failAction?: string; failCode?: string; webhookCursor?: string | null; serialCursor?: string | null; serialRows?: unknown[];
  expiredLot?: boolean; trackingOn?: boolean; customDefs?: unknown[]; customValues?: unknown[]; uomRows?: unknown[];
  uomReadback?: 'match' | 'missing' | 'fail' | 'mismatch'; customReadback?: 'match' | 'fail' | 'mismatch'; shipment?: unknown[]; calls?: Sent[]; };
function reply(route: Route, data: unknown, status = 200) { return fulfillJson(route, data, status); }
const actions = (log: Sent[]) => log.filter(r => r.method !== 'GET');
const hasAction = (log: Sent[], suffix: string) => actions(log).some(r => r.path.endsWith(suffix));
async function load(page: Page, s: Setup = {}) {
  if (s.role) await loginAsDisposableRole(page, s.role);
  else await loginAsTenant(page);
  const calls: Sent[] = s.calls || [];
  let uomReads = 0;
  let savedUom: any = null;
  let deletedUom = false;
  let wroteCustomValues: any = null;
  await page.route('**/inventory-capabilities/**', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    if (!path.startsWith('/inventory-capabilities/')) return route.continue();
    const method = route.request().method();
    let body: any = null; try { body = route.request().postDataJSON(); } catch { /* GET or empty */ }
    calls.push({ path, query: url.search, method, headers: route.request().headers(), body });
    if (method === 'GET' && s.failGet && path.endsWith(s.failGet)) return reply(route, { code: s.failCode || 'FIXTURE_UNAVAILABLE', message: 'Fixture request unavailable' }, 503);
    if (method !== 'GET' && s.failAction && path.endsWith(s.failAction)) return reply(route, { code: s.failCode || 'VERSION_CONFLICT', message: 'Fixture request rejected' }, s.failCode === 'WEBHOOK_CURSOR_INVALID' ? 400 : 409);
    if (method === 'GET') {
      if (path.endsWith('/overview')) return reply(route, { counts: {}, priorities: [] });
      if (path.endsWith('/api-clients')) return reply(route, s.clients || []);
      if (path.endsWith('/connections')) return reply(route, s.connections || []);
      if (path.endsWith('/webhook-events')) return reply(route, { items: [{ event_type: '*', group: 'All', label: 'All listed events' }, { event_type: 'inventory.updated', group: 'Inventory', label: 'Inventory updated' }] });
      if (path.endsWith('/webhook-deliveries')) return reply(route, s.deliveries || []);
      if (path.endsWith('/webhooks')) {
        if (url.searchParams.has('cursor')) {
          if (s.failGet === 'webhooks-cursor-invalid') return reply(route, { code: 'WEBHOOK_CURSOR_INVALID', message: 'Invalid cursor' }, 400);
          if (s.failGet === 'webhooks-next') return reply(route, { message: 'Fixture page unavailable' }, 503);
          return reply(route, { items: [hook], has_more: false, next_cursor: null });
        }
        return reply(route, { items: s.hooks || [], has_more: Boolean(s.webhookCursor), next_cursor: s.webhookCursor ?? null });
      }
      if (path.endsWith('/serials')) return reply(route, { items: url.searchParams.has('cursor') ? [{ id: 'serial-2', serial_number: 'SER-48-NEXT', product_name: 'Fixture Alpha', product_sku: 'PW48-ONE', status: 'available' }] : (s.serialRows || []), has_more: !url.searchParams.has('cursor') && Boolean(s.serialCursor), next_cursor: url.searchParams.has('cursor') ? null : s.serialCursor || null });
      if (path.endsWith('/tracking')) return reply(route, { serial_tracking_enabled: s.trackingOn !== false, serial_uniqueness_scope: 'product', require_serial_on_receipt: false, require_serial_on_issue: false, version: 5 });
      if (path.endsWith('/uom')) {
        uomReads++;
        if (s.uomReadback === 'fail' && uomReads > 1) return reply(route, { message: 'Readback interrupted' }, 503);
        const originalRows = deletedUom ? [] : s.uomRows ?? [uomRow];
        const expected = savedUom ? [{ ...uomRow, ...savedUom, version: savedUom.expected_version > 0 ? savedUom.expected_version + 1 : 1 }] : originalRows;
        const rows = uomReads > 1 && s.uomReadback === 'missing' ? [] : uomReads > 1 && s.uomReadback === 'mismatch' ? [{ ...expected[0], factor_to_base: 99 }] : expected;
        return reply(route, { base_uom: 'pcs', conversions: rows });
      }
      if (path.endsWith('/custom-fields')) return reply(route, s.customDefs || []);
      if (path.includes('/custom-fields/')) {
        if (wroteCustomValues && s.customReadback === 'fail') return reply(route, { message: 'Readback unavailable' }, 503);
        if (wroteCustomValues && s.customReadback === 'match') return reply(route, (s.customValues || []).map((r: any) => ({ ...r, value: wroteCustomValues.values[r.field_key], value_version: (r.value_version || 0) + 1 })));
        if (wroteCustomValues && s.customReadback === 'mismatch') return reply(route, s.customValues || []);
        return reply(route, s.customValues || []);
      }
      if (path.endsWith('/landed-costs')) return reply(route, []);
      return reply(route, []);
    }
    if (path.includes('/custom-fields/') && method === 'PUT') { wroteCustomValues = body; return reply(route, { ok: true }); }
    if (path.endsWith('/uom/convert')) return reply(route, { converted_quantity: 48 });
    if (path.endsWith('/uom') && method === 'POST') { savedUom = body; return reply(route, { ok: true }); }
    if (path.startsWith('/inventory-capabilities/uom/') && method === 'DELETE') { deletedUom = true; return reply(route, { ok: true }); }
    if (path.endsWith('/preview')) return reply(route, { currency: 'EUR', total_extra_cost: 12, preview_fingerprint: 'fixture-fp-48', allocations: [{ shipment_item_id: 'item-48', product_id: PRODUCT, product_name: 'Fixture Alpha', received_quantity: 2, base_unit_cost: 10, allocated_extra_cost: 12, landed_unit_cost: 16 }] });
    if (path.endsWith('/test')) return reply(route, { queued: true, delivery_id: 'fixture-only' });
    return reply(route, method === 'DELETE' ? { ok: true } : { ok: true, version: 1 }, 200);
  });
  await page.route('**/products', r => r.request().isNavigationRequest() ? r.continue() : reply(r, products));
  await page.route('**/storage-locations', r => r.request().isNavigationRequest() ? r.continue() : reply(r, places));
  await page.route('**/stock/lots?*', r => r.request().isNavigationRequest() ? r.continue() : reply(r, s.expiredLot ? [{ ...lot, operational_status: 'expired' }] : [lot]));
  await page.route('**/shipments', r => r.request().isNavigationRequest() ? r.continue() : reply(r, s.shipment || [{ id: 'shipment-48', po_number: 'PO-48', status: 'received' }]));
  await page.route('**/suppliers', r => r.request().isNavigationRequest() ? r.continue() : reply(r, []));
  await page.route('**/purchase-orders', r => r.request().isNavigationRequest() ? r.continue() : reply(r, []));
  await page.route('**/stock', r => r.request().isNavigationRequest() ? r.continue() : reply(r, []));
  await page.goto(`/inventory-capabilities?capability_tab=${encodeURIComponent(s.tab || 'integrations')}`);
  await expect(page.getByRole('heading', { name: 'Advanced inventory workspace' })).toBeVisible();
  return calls;
}
const row = (page: Page, label: string) => page.getByRole('row').filter({ hasText: label });
const chooseProduct = async (page: Page) => page.getByLabel('Product', { exact: true }).first().selectOption(PRODUCT);
const newKey = async (page: Page) => {
  await page.getByLabel('Connection name').fill('Fixture New Key');
  await page.getByRole('group', { name: 'API permissions' }).getByRole('checkbox').first().check();
};
const newHook = async (page: Page) => {
  await page.getByLabel('HTTPS destination').fill('https://fixture.example.test/hook');
  await page.locator('form').filter({ has: page.getByLabel('HTTPS destination') }).getByLabel('Name').fill('Fixture Test Hook');
  await page.getByRole('group', { name: 'Events' }).getByRole('checkbox').nth(1).check();
};

test.describe('Integrations: permissioned registries, webhook errors and versioned external connections — Batch 48', () => {
  test('TICAP-042 Read-only integrations role sees registry without create/edit/rotate/revoke actions', async ({ page }) => {
    await load(page, { role: 'PW_ICAP_INTEGRATIONS_VIEW_ONLY', clients: [{ id: 'client-48', name: 'Fixture API', key_prefix: 'pw48_', scopes: ['products:read'], status: 'active', version: 2 }], connections: [connected], hooks: [hook] });
    await expect(row(page, 'Fixture API')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create API key' })).toBeDisabled();
    await expect(row(page, 'Fixture API').getByRole('button', { name: 'Rotate secret' })).toHaveCount(0);
    await expect(row(page, 'Fixture Hook').getByRole('button', { name: 'Test' })).toHaveCount(0);
    await expect(row(page, 'Fixture ERP').getByRole('button', { name: 'Disable' })).toHaveCount(0);
  });
  test('TICAP-043 Deep link to integrations falls back when integrations read permission revoked', async ({ page }) => {
    await load(page, { role: 'PW_ICAP_NO_INTEGRATIONS' });
    await expect(page.getByRole('tab', { name: 'APIs & integrations' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Serial tracking' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/capability_tab=serials/);
  });
  test('TICAP-044 Webhook event catalog request failure disables event selection and create', async ({ page }) => {
    await load(page, { failGet: '/webhook-events' });
    await expect(page.getByText('Unable to load webhook event choices.')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Events' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Create webhook' })).toBeDisabled();
  });
  test('TICAP-045 Webhook registry request failure disables webhook creation', async ({ page }) => {
    await load(page, { failGet: '/webhooks' });
    await newHook(page);
    await expect(page.getByText('Fixture request unavailable')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create webhook' })).toBeDisabled();
  });
  test('TICAP-046 Rejected test-webhook queue displays error and no queued acknowledgment', async ({ page }) => {
    const calls = await load(page, { hooks: [hook], failAction: '/test' });
    await row(page, 'Fixture Hook').getByRole('button', { name: 'Test' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'This configuration changed' })).toBeVisible();
    await expect(page.getByText('Test webhook queued. Delivery status will appear below.')).toHaveCount(0);
    expect(hasAction(calls, '/test')).toBeTruthy();
  });
  test('TICAP-047 Failed cursor pagination preserves loaded webhooks and shows error', async ({ page }) => {
    await load(page, { hooks: [hook], webhookCursor: 'next-48', failGet: 'webhooks-next' });
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Fixture page unavailable' })).toBeVisible();
    await expect(row(page, 'Fixture Hook')).toBeVisible();
  });
  test('TICAP-048 Expired or invalid webhook cursor presents reload guidance', async ({ page }) => {
    await load(page, { hooks: [hook], webhookCursor: 'expired-48', failGet: 'webhooks-cursor-invalid' });
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'The webhook page is no longer valid. Reload the webhook registry.' })).toBeVisible();
    await expect(row(page, 'Fixture Hook')).toBeVisible();
  });
  test('TICAP-049 Editing connection prepopulates immutable system and chosen type and direction', async ({ page }) => {
    await load(page, { connections: [connected] });
    await row(page, 'Fixture ERP').getByRole('button', { name: 'Edit' }).click();
    await expect(page.getByLabel('System name')).toHaveValue('Fixture ERP');
    await expect(page.getByLabel('System name')).toBeDisabled();
    await expect(page.getByLabel('Type', { exact: true })).toHaveValue('erp');
    await expect(page.getByLabel('Direction')).toHaveValue('inbound');
  });
  test('TICAP-050 Cancelling connection editing restores create form without mutation', async ({ page }) => {
    const calls = await load(page, { connections: [connected] });
    await row(page, 'Fixture ERP').getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Cancel' }).last().click();
    await expect(page.getByLabel('System name')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Save connection' })).toBeDisabled();
    expect(actions(calls)).toHaveLength(0);
  });
  test('TICAP-051 Disable and enable connection send expected_version and display acknowledgment', async ({ page }) => {
    const calls = await load(page, { connections: [connected, { ...connected, id: 'connection-disabled', system_name: 'Fixture WMS', status: 'disabled', version: 7 }] });
    await row(page, 'Fixture ERP').getByRole('button', { name: 'Disable' }).click();
    await expect(page.getByText('Connection disabled.').first()).toBeVisible();
    expect(actions(calls).find(c => c.path.endsWith('/connections'))?.body).toMatchObject({ system_name: 'Fixture ERP', status: 'disabled', expected_version: 4 });
    await row(page, 'Fixture WMS').getByRole('button', { name: 'Enable' }).click();
    await expect(page.getByText('Connection enabled.').first()).toBeVisible();
    expect(actions(calls).filter(c => c.path.endsWith('/connections')).at(-1)?.body).toMatchObject({ system_name: 'Fixture WMS', status: 'configured', expected_version: 7 });
  });
  test('TICAP-052 Connection server rejection retains entered values and shows error', async ({ page }) => {
    const calls = await load(page, { connections: [connected], failAction: '/connections' });
    await row(page, 'Fixture ERP').getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Base URL').fill('https://updated.example.test');
    await page.getByRole('button', { name: 'Save changes' }).last().click();
    await expect(page.getByText('This configuration changed after you opened it.')).toBeVisible();
    await expect(page.getByLabel('Base URL')).toHaveValue('https://updated.example.test');
    expect(hasAction(calls, '/connections')).toBeTruthy();
  });
  test('TICAP-053 Delivery history displays response status, attempt count and failure state separately from queued', async ({ page }) => {
    await load(page, { deliveries: [{ id: 'delivery-48', subscription_id: HOOK, subscription_name: 'Fixture Hook', event_type: 'inventory.updated', event_status: 'failed', attempt_count: 3, response_status: 502, created_at: '2026-11-03T10:00:00Z' }] });
    const deliveryRow = row(page, 'Fixture Hook').filter({ hasText: '502' });
    await expect(deliveryRow).toContainText('Failed');
    await expect(deliveryRow).toContainText('3');
    await expect(deliveryRow).toContainText('502');
  });
  test('TICAP-054 Delivery list with failed row does not infer successful delivery', async ({ page }) => {
    await load(page, { hooks: [hook], deliveries: [{ id: 'delivery-48', subscription_id: HOOK, subscription_name: 'Fixture Hook', event_type: 'inventory.updated', event_status: 'failed', attempt_count: 1, response_status: 500, created_at: '2026-11-03T10:00:00Z' }] });
    const deliveries = page.getByRole('heading', { name: 'Recent delivery attempts' }).locator('..');
    await expect(row(page, 'Fixture Hook').filter({ hasText: '500' })).toContainText('Failed');
    await expect(deliveries.getByText('Delivered', { exact: true })).toHaveCount(0);
  });
  test('TICAP-055 API client scope choices exclude permissions the current tenant role cannot delegate', async ({ page }) => {
    await load(page, { role: 'PW_ICAP_SCOPE_LIMITED' });
    const scopes = page.getByRole('group', { name: 'API permissions' });
    await expect(scopes.getByText('Read products')).toBeVisible();
    await expect(scopes.getByText('Manage suppliers')).toHaveCount(0);
    await expect(scopes.getByText('Read reports')).toHaveCount(0);
  });
  test('TICAP-056 API key expiry local datetime is serialized in create payload', async ({ page }) => {
    const calls = await load(page);
    await newKey(page);
    await page.getByLabel('Expiry date and time').fill('2026-12-15T14:30');
    await page.getByRole('button', { name: 'Create API key' }).click();
    await expect.poll(() => actions(calls).some(c => c.path.endsWith('/api-clients'))).toBeTruthy();
    const payload = actions(calls).find(c => c.path.endsWith('/api-clients'))?.body;
    expect(new Date(payload.expires_at).getTime()).toBe(new Date('2026-12-15T14:30').getTime());
  });
  test('TICAP-057 Invalid allowed IP addresses result in specific server feedback without revealing secret', async ({ page }) => {
    const calls = await load(page, { failAction: '/api-clients', failCode: 'VALIDATION_ERROR' });
    await newKey(page);
    await page.getByLabel('Allowed IP addresses').fill('not-an-ip');
    await page.getByRole('button', { name: 'Create API key' }).click();
    await expect(page.getByText('Fixture request rejected')).toBeVisible();
    await expect(page.getByText('Copy this key now. It is only shown once:')).toHaveCount(0);
    expect(actions(calls).find(c => c.path.endsWith('/api-clients'))?.body.allowed_ips).toEqual(['not-an-ip']);
  });
});

test.describe('Serial identities: settings, inventory-lot constraints and page cursor — Batch 48', () => {
  test('TICAP-058 Selecting product loads versioned serial tracking configuration', async ({ page }) => {
    const calls = await load(page, { tab: 'serials' });
    await chooseProduct(page);
    await expect(page.getByLabel('Enable serial tracking')).toBeChecked();
    await expect(page.getByLabel('Uniqueness')).toHaveValue('product');
    await expect.poll(() => calls.some(c => c.path.endsWith(`/products/${PRODUCT}/tracking`) && c.method === 'GET')).toBeTruthy();
  });
  test('TICAP-059 Save tracking sends expected_version and selected uniqueness scope', async ({ page }) => {
    const calls = await load(page, { tab: 'serials' });
    await chooseProduct(page);
    await page.getByLabel('Uniqueness').selectOption('tenant');
    await page.getByRole('button', { name: 'Save tracking' }).click();
    await expect.poll(() => hasAction(calls, '/tracking')).toBeTruthy();
    expect(actions(calls).find(c => c.path.endsWith('/tracking'))?.body).toMatchObject({ expected_version: 5, serial_uniqueness_scope: 'tenant' });
  });
  test('TICAP-060 Tracking save rejection retains changed checkbox selections', async ({ page }) => {
    await load(page, { tab: 'serials', failAction: '/tracking' });
    await chooseProduct(page);
    await page.getByLabel('Require on receipt').check();
    await page.getByRole('button', { name: 'Save tracking' }).click();
    await expect(page.getByText('This configuration changed after you opened it.')).toBeVisible();
    await expect(page.getByLabel('Require on receipt')).toBeChecked();
  });
  test('TICAP-061 Disabling tracking with active identities displays server rejection', async ({ page }) => {
    await load(page, { tab: 'serials', failAction: '/tracking', failCode: 'SERIAL_TRACKING_ACTIVE_IDENTITIES' });
    await chooseProduct(page);
    await page.getByLabel('Enable serial tracking').uncheck();
    await page.getByRole('button', { name: 'Save tracking' }).click();
    await expect(page.getByText('Serial tracking cannot be disabled while serial identities still exist for this product.')).toBeVisible();
    await expect(page.getByLabel('Require on receipt')).toBeDisabled();
  });
  test('TICAP-062 Register serial remains disabled until product, location, lot and identity are selected', async ({ page }) => {
    const calls = await load(page, { tab: 'serials' });
    const submit = page.getByRole('button', { name: 'Register serial' });
    await expect(submit).toBeDisabled();
    await chooseProduct(page);
    await page.getByPlaceholder('Serial number').fill('SER-48-A');
    await expect(submit).toBeDisabled();
    await page.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Fixture Store' }) }).selectOption(LOCATION);
    await expect(submit).toBeDisabled();
    expect(hasAction(calls, '/serials')).toBeFalsy();
  });
  test('TICAP-063 Registering an identity uses selected existing lot without increasing quantity', async ({ page }) => {
    const calls = await load(page, { tab: 'serials' });
    await chooseProduct(page);
    await page.getByPlaceholder('Serial number').fill('SER-48-A');
    await page.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Fixture Store' }) }).selectOption(LOCATION);
    await page.getByRole('combobox').filter({ has: page.getByRole('option', { name: /LOT-48/ }) }).selectOption(LOT);
    await page.getByRole('button', { name: 'Register serial' }).click();
    await expect.poll(() => hasAction(calls, '/serials')).toBeTruthy();
    expect(actions(calls).find(c => c.path.endsWith('/serials'))?.body).toMatchObject({ product_id: PRODUCT, serial_number: 'SER-48-A', storage_location_id: LOCATION, inventory_lot_id: LOT, status: 'available' });
    expect(actions(calls).some(c => c.path.startsWith('/stock'))).toBeFalsy();
  });
  test('TICAP-064 Duplicate serial response shows error and retains registration form', async ({ page }) => {
    await load(page, { tab: 'serials', failAction: '/serials', failCode: 'SERIAL_ALREADY_EXISTS' });
    await chooseProduct(page);
    await page.getByPlaceholder('Serial number').fill('SER-48-DUP');
    await page.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Fixture Store' }) }).selectOption(LOCATION);
    await page.getByRole('combobox').filter({ has: page.getByRole('option', { name: /LOT-48/ }) }).selectOption(LOT);
    await page.getByRole('button', { name: 'Register serial' }).click();
    await expect(page.getByText('This serial number already exists for the product.')).toBeVisible();
    await expect(page.getByPlaceholder('Serial number')).toHaveValue('SER-48-DUP');
  });
  test('TICAP-065 Empty serial search displays genuine no-matching-identities message', async ({ page }) => {
    await load(page, { tab: 'serials', serialRows: [] });
    await page.getByLabel('Search serial registry').fill('NO-SERIAL');
    await expect(page.getByText('No serial identities match the current filters.')).toBeVisible();
  });
  test('TICAP-066 Serial registry Load more submits cursor tied to current filters', async ({ page }) => {
    const calls = await load(page, { tab: 'serials', serialCursor: 'serial-page-48' });
    await chooseProduct(page);
    await page.getByLabel('Search serial registry').fill('SER-48');
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.getByText('SER-48-NEXT')).toBeVisible();
    expect(calls.some(c => c.path.endsWith('/serials') && c.query.includes('cursor=serial-page-48') && c.query.includes(`product_id=${PRODUCT}`) && c.query.includes('search=SER-48'))).toBeTruthy();
  });
  test('TICAP-067 Changing product or search discards stale serial pagination cursor', async ({ page }) => {
    const calls = await load(page, { tab: 'serials', serialCursor: 'stale-page-48' });
    await chooseProduct(page);
    await page.getByLabel('Search serial registry').fill('fresh-query');
    await expect(page.getByRole('button', { name: 'Load more' })).toBeVisible();
    await expect.poll(() => calls.some(c => c.path.endsWith('/serials') && c.query.includes('search=fresh-query') && !c.query.includes('cursor='))).toBeTruthy();
    await page.getByLabel('Product', { exact: true }).first().selectOption(PRODUCT_B);
    await expect.poll(() => calls.some(c => c.path.endsWith('/serials') && c.query.includes(`product_id=${PRODUCT_B}`) && !c.query.includes('cursor='))).toBeTruthy();
    expect(calls.some(c => c.path.endsWith('/serials') && c.query.includes('cursor=stale-page-48'))).toBeFalsy();
  });
  test('TICAP-068 Expired stock lot is excluded from serial registration candidates', async ({ page }) => {
    await load(page, { tab: 'serials', expiredLot: true });
    await chooseProduct(page);
    await page.getByPlaceholder('Serial number').fill('SER-48-EXPIRED');
    await page.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Fixture Store' }) }).selectOption(LOCATION);
    await expect(page.getByText('No available on-hand lot exists at this location.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register serial' })).toBeDisabled();
  });
  test('TICAP-069 Role without stock read cannot view serial registry or register identities', async ({ page }) => {
    await load(page, { tab: 'serials', role: 'PW_ICAP_NO_STOCK' });
    await chooseProduct(page);
    await expect(page.getByText('Stock read permission is required to view serial inventory.')).toBeVisible();
    await expect(page.getByLabel('Search serial registry')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Register serial' })).toBeDisabled();
  });
});

test.describe('Units of measure: permalink, validation, verified readback and calculator — Batch 48', () => {
  test('TICAP-070 Product picker writes uom_product_id to URL and back navigation restores selection', async ({ page }) => {
    await load(page, { tab: 'uom' });
    await chooseProduct(page);
    await expect(page).toHaveURL(new RegExp(`uom_product_id=${PRODUCT}`));
    await page.getByLabel('Product', { exact: true }).first().selectOption(PRODUCT_B);
    await expect(page).toHaveURL(new RegExp(`uom_product_id=${PRODUCT_B}`));
    await page.goBack();
    await expect(page.getByLabel('Product', { exact: true }).first()).toHaveValue(PRODUCT);
  });
  test('TICAP-071 Nonpositive unit conversion factor prevents save from being dispatched', async ({ page }) => {
    const calls = await load(page, { tab: 'uom' });
    await chooseProduct(page);
    await page.getByLabel('UoM code').fill('BOX');
    await page.getByLabel('Units in base unit').fill('0');
    await expect(page.getByRole('button', { name: 'Save conversion' })).toBeDisabled();
    await page.getByLabel('Units in base unit').fill('-4');
    await expect(page.getByRole('button', { name: 'Save conversion' })).toBeDisabled();
    expect(hasAction(calls, '/uom')).toBeFalsy();
  });
  test('TICAP-072 Save conversion verifies post-write readback before claiming success', async ({ page }) => {
    const calls = await load(page, { tab: 'uom', uomReadback: 'match' });
    await chooseProduct(page);
    await page.getByLabel('UoM code').fill('BOX');
    await page.getByLabel('Name', { exact: true }).fill('Box');
    await page.getByLabel('Units in base unit').fill('12');
    await page.getByRole('button', { name: 'Save conversion' }).click();
    await expect.poll(() => calls.filter(c => c.path.endsWith('/uom') && c.method === 'GET').length).toBeGreaterThan(1);
    await expect(page.getByLabel('UoM code')).toHaveValue('');
    expect(actions(calls).find(c => c.path.endsWith('/uom'))?.body).toMatchObject({ uom_code: 'BOX', factor_to_base: 12, expected_version: 0 });
  });
  test('TICAP-073 Acknowledged save but failed readback presents uncertain-save warning', async ({ page }) => {
    await load(page, { tab: 'uom', uomReadback: 'fail' });
    await chooseProduct(page);
    await page.getByLabel('UoM code').fill('BOX');
    await page.getByLabel('Units in base unit').fill('12');
    await page.getByRole('button', { name: 'Save conversion' }).click();
    await expect(page.getByText('The save was acknowledged, but the conversion could not be checked.')).toBeVisible();
    await expect(page.getByLabel('UoM code')).toHaveValue('BOX');
  });
  test('TICAP-074 Readback mismatch of version or factor prevents false saved confirmation', async ({ page }) => {
    await load(page, { tab: 'uom', uomReadback: 'mismatch' });
    await chooseProduct(page);
    await page.getByLabel('UoM code').fill('BOX');
    await page.getByLabel('Units in base unit').fill('12');
    await page.getByRole('button', { name: 'Save conversion' }).click();
    await expect(page.getByText('The save was acknowledged, but the conversion was not found on reload.')).toBeVisible();
    await expect(page.getByLabel('UoM code')).toHaveValue('BOX');
  });
  test('TICAP-075 Edit conversion uses expected_version of selected row', async ({ page }) => {
    const calls = await load(page, { tab: 'uom' });
    await chooseProduct(page);
    await row(page, 'CASE').getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Units in base unit').fill('36');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect.poll(() => hasAction(calls, '/uom')).toBeTruthy();
    expect(actions(calls).find(c => c.path.endsWith('/uom'))?.body).toMatchObject({ uom_code: 'CASE', factor_to_base: 36, expected_version: 2 });
  });
  test('TICAP-076 Cancel editing conversion restores create fields without write', async ({ page }) => {
    const calls = await load(page, { tab: 'uom' });
    await chooseProduct(page);
    await row(page, 'CASE').getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByLabel('UoM code')).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Save conversion' })).toBeDisabled();
    expect(actions(calls)).toHaveLength(0);
  });
  test('TICAP-077 Delete conversion native cancellation sends no destructive call', async ({ page }) => {
    const calls = await load(page, { tab: 'uom' });
    await chooseProduct(page);
    page.once('dialog', dialog => dialog.dismiss());
    await row(page, 'CASE').getByRole('button', { name: 'Delete' }).click();
    expect(actions(calls).filter(c => c.method === 'DELETE')).toHaveLength(0);
  });
  test('TICAP-078 Confirmed delete uses version header and hides removed row after fresh GET', async ({ page }) => {
    const calls = await load(page, { tab: 'uom' });
    await chooseProduct(page);
    page.once('dialog', dialog => dialog.accept());
    await row(page, 'CASE').getByRole('button', { name: 'Delete' }).click();
    await expect.poll(() => actions(calls).filter(c => c.method === 'DELETE').length).toBe(1);
    expect(actions(calls).find(c => c.method === 'DELETE')?.headers['if-match-version']).toBe('2');
    await expect(row(page, 'CASE')).toHaveCount(0);
  });
  test('TICAP-079 Conversion calculation sends quantity/from/to units and renders returned number', async ({ page }) => {
    const calls = await load(page, { tab: 'uom' });
    await chooseProduct(page);
    await page.getByLabel('Quantity').fill('2');
    await page.getByLabel('From unit').selectOption('CASE');
    await page.getByLabel('To unit').selectOption('pcs');
    await page.getByRole('button', { name: 'Convert', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Result: 48 pcs' })).toBeVisible();
    expect(actions(calls).find(c => c.path.endsWith('/uom/convert'))?.body).toMatchObject({ quantity: 2, from_uom: 'CASE', to_uom: 'pcs' });
  });
  test('TICAP-080 Conversion calculation failure clears result and shows error', async ({ page }) => {
    await load(page, { tab: 'uom', failAction: '/uom/convert' });
    await chooseProduct(page);
    await page.getByRole('button', { name: 'Convert', exact: true }).click();
    await expect(page.getByText('This configuration changed after you opened it.')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Result:' })).toHaveCount(0);
  });
  test('TICAP-081 Switching products clears old conversion result and ignores stale response', async ({ page }) => {
    await load(page, { tab: 'uom' });
    await chooseProduct(page);
    await page.getByRole('button', { name: 'Convert', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Result:' })).toBeVisible();
    await page.getByLabel('Product', { exact: true }).first().selectOption(PRODUCT_B);
    await expect(page.getByRole('status').filter({ hasText: 'Result:' })).toHaveCount(0);
    await expect(page.getByLabel('Product', { exact: true }).first()).toHaveValue(PRODUCT_B);
  });
});

const assignedOrigin = { definition_id: DEF, definition_version: 2, field_key: 'origin', label: 'Origin', data_type: 'text', is_required: false, options: [], value: 'Croatia', value_version: 3 };
test.describe('Custom fields and landed cost: entity permissions, definition forms and readback — Batch 48', () => {
  test('TICAP-082 Entity type selection restricts available records to readable entities', async ({ page }) => {
    await load(page, { tab: 'custom-fields', role: 'PW_ICAP_CUSTOM_PRODUCT_ONLY' });
    const options = page.getByLabel('Entity type').getByRole('option');
    await expect(options).toHaveCount(1);
    await expect(options.first()).toHaveText('Product');
    await expect(page.getByRole('heading', { name: 'Use fields on products' })).toBeVisible();
  });
  test('TICAP-083 Create field definition sends normalized key, type, label and options', async ({ page }) => {
    const calls = await load(page, { tab: 'custom-fields' });
    await page.getByLabel('Field name').fill('Country of origin');
    await page.getByLabel('Type', { exact: true }).selectOption('select');
    await page.getByLabel('Options').fill('Croatia, Italy, Germany');
    await page.getByRole('button', { name: 'Save field' }).click();
    await expect.poll(() => hasAction(calls, '/custom-fields')).toBeTruthy();
    expect(actions(calls).find(c => c.path.endsWith('/custom-fields'))?.body).toMatchObject({ entity_type: 'product', field_key: 'country_of_origin', label: 'Country of origin', data_type: 'select', options: ['Croatia', 'Italy', 'Germany'], expected_version: 0 });
  });
  test('TICAP-084 Existing custom-field key create-version conflict retains the draft', async ({ page }) => {
    await load(page, { tab: 'custom-fields', customDefs: [def], failAction: '/custom-fields', failCode: 'VERSION_CONFLICT' });
    await page.getByLabel('Field name').fill('Origin');
    await page.getByRole('button', { name: 'Edit technical key' }).click();
    await page.getByLabel('Technical field key').fill('origin');
    await page.getByRole('button', { name: 'Save field' }).click();
    await expect(page.getByText('This configuration changed after you opened it.')).toBeVisible();
    await expect(page.getByLabel('Field name')).toHaveValue('Origin');
  });
  test('TICAP-085 Select-list fields require usable options before save', async ({ page }) => {
    const calls = await load(page, { tab: 'custom-fields' });
    await page.getByLabel('Field name').fill('Fixture Stage');
    await page.getByLabel('Type', { exact: true }).selectOption('select');
    await page.getByLabel('Options').fill('  , ,  ');
    await expect(page.getByRole('button', { name: 'Save field' })).toBeDisabled();
    await expect(page.getByText('A select-list field needs at least one option.')).toBeVisible();
    expect(hasAction(calls, '/custom-fields')).toBeFalsy();
  });
  test('TICAP-086 Edit field definition sends existing version and handles conflict', async ({ page }) => {
    const calls = await load(page, { tab: 'custom-fields', customDefs: [def], failAction: '/custom-fields' });
    await row(page, 'Origin').getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Field name').fill('Origin region');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('This configuration changed after you opened it.')).toBeVisible();
    expect(actions(calls).find(c => c.path.endsWith('/custom-fields'))?.body).toMatchObject({ field_key: 'origin', expected_version: 2, label: 'Origin region' });
  });
  test('TICAP-087 Required-field change with empty existing records is blocked by server', async ({ page }) => {
    await load(page, { tab: 'custom-fields', customDefs: [def], failAction: '/custom-fields', failCode: 'CUSTOM_FIELD_REQUIRED_DATA_MISSING' });
    await row(page, 'Origin').getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Required').check();
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('This field cannot become required while existing records are missing a value.')).toBeVisible();
    await expect(page.getByLabel('Required')).toBeChecked();
  });
  test('TICAP-088 Saving custom field value checks visible readback for selected record', async ({ page }) => {
    const calls = await load(page, { tab: 'custom-fields', customDefs: [def], customValues: [assignedOrigin], customReadback: 'match' });
    await page.getByLabel('Product', { exact: true }).selectOption(PRODUCT);
    await page.getByLabel('Origin', { exact: true }).fill('Italy');
    await page.getByRole('button', { name: 'Save custom fields' }).click();
    await expect.poll(() => calls.filter(c => c.path.endsWith(`/custom-fields/product/${PRODUCT}`) && c.method === 'GET').length).toBeGreaterThan(1);
    await expect(page.getByLabel('Origin', { exact: true })).toHaveValue('Italy');
    expect(actions(calls).find(c => c.path.endsWith(`/custom-fields/product/${PRODUCT}`))?.body.values).toMatchObject({ origin: 'Italy' });
  });
  test('TICAP-089 Stale readback or different record selection never shows false verified value', async ({ page }) => {
    await load(page, { tab: 'custom-fields', customDefs: [def], customValues: [assignedOrigin], customReadback: 'mismatch' });
    await page.getByLabel('Product', { exact: true }).selectOption(PRODUCT);
    await page.getByLabel('Origin', { exact: true }).fill('Italy');
    await page.getByRole('button', { name: 'Save custom fields' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Custom field values were not confirmed as saved.' })).toBeVisible();
    await expect(page.getByLabel('Origin', { exact: true })).toHaveValue('Italy');
    await expect(page.getByText('Custom field values saved and verified.')).toHaveCount(0);
  });
  test('TICAP-090 Shipment picker shows returned status and locks finalization for unreceived shipment', async ({ page }) => {
    await load(page, { tab: 'landed-cost', shipment: [{ id: 'shipment-draft-48', po_number: 'PO-PENDING-48', status: 'partial' }, { id: 'shipment-48', po_number: 'PO-RECEIVED-48', status: 'received' }] });
    await expect(page.getByLabel('Shipment').getByRole('option', { name: /PO-PENDING-48.*Partial/ })).toHaveCount(1);
    await page.getByLabel('Shipment').selectOption('shipment-draft-48');
    await page.getByLabel('Freight').fill('12');
    await expect(page.getByRole('button', { name: /Finalize cost.*Locked/ })).toBeDisabled();
    await expect(page.getByText('You can preview this shipment, but finalization stays locked until its status is Received.')).toBeVisible();
  });
  test('TICAP-091 Adding charges respects amount and allocation-method validation', async ({ page }) => {
    const calls = await load(page, { tab: 'landed-cost' });
    await page.getByLabel('Shipment').selectOption('shipment-48');
    await page.getByLabel('Allocation').selectOption('quantity');
    await page.getByLabel('Freight').fill('0');
    await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeDisabled();
    await page.getByLabel('Freight').fill('12');
    await page.getByRole('button', { name: 'Preview', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Allocation preview/ })).toBeVisible();
    expect(actions(calls).find(c => c.path.endsWith('/preview'))?.body).toMatchObject({ shipment_id: 'shipment-48', allocation_method: 'quantity', charges: [{ component_type: 'freight', amount: 12 }] });
  });
});
