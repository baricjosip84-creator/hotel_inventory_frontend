import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 49: Phase 1 source-grounded declarations only. All HTTP writes are synthetic;
// these tests must never be interpreted as verifying real inventory, accounting, ACLs,
// webhook delivery, database finalization, stock postings or offline replay.
const ALPHA = '11111111-1111-4111-8111-111111111111';
const BETA = '11111111-1111-4111-8111-111111111112';
const VARIANT = '11111111-1111-4111-8111-111111111113';
const LOCATION = '22222222-2222-4222-8222-222222222222';
const BIN = '22222222-2222-4222-8222-222222222223';
const SHIPMENT = '33333333-3333-4333-8333-333333333333';
const BOM = '44444444-4444-4444-8444-444444444444';
const products = [
  { id: ALPHA, name: 'Fixture Alpha', sku: 'PW49-ALPHA', unit: 'pcs' },
  { id: BETA, name: 'Fixture Beta', sku: 'PW49-BETA', unit: 'pcs' },
  { id: VARIANT, name: 'Existing variant', sku: 'PW49-CHILD', unit: 'pcs', parent_product_id: ALPHA }
];
const locations = [
  { id: LOCATION, name: 'Fixture Warehouse', location_type: 'warehouse', location_code: 'W49', path: 'Fixture Warehouse', depth: 0, version: 7, is_pickable: true, stock_position_count: 2 },
  { id: BIN, name: 'Fixture Bin', parent_location_id: LOCATION, location_type: 'bin', location_code: 'B49', path: 'Fixture Warehouse / Fixture Bin', depth: 1, version: 3, is_pickable: false, stock_position_count: 0 }
];
const shipment = { id: SHIPMENT, po_number: 'PO-49', status: 'received' };
const bom = { id: BOM, product_id: ALPHA, product_name: 'Fixture Alpha', product_sku: 'PW49-ALPHA', name: 'Fixture Assembly', output_quantity: 2, is_active: true,
  components: [{ component_product_id: BETA, component_name: 'Fixture Beta', component_sku: 'PW49-BETA', quantity: 3, waste_percent: 0 }] };
const stock = [{ product_id: BETA, storage_location_id: LOCATION, quantity: 30, reserved_quantity: 5, projected_free_quantity: 25 }, { product_id: ALPHA, storage_location_id: LOCATION, quantity: 8, reserved_quantity: 1, projected_free_quantity: 7 }];
type Call = { method: string; path: string; body: any; headers: Record<string, string> };
type Options = {
  tab?: 'landed-cost' | 'variants' | 'hierarchy' | 'bom' | 'mobile';
  role?: Parameters<typeof loginAsDisposableRole>[1];
  products?: any[]; shipments?: any[]; variants?: any[]; hierarchy?: any[];
  boms?: any[]; stock?: any[]; history?: any[];
  failGet?: string; failWrite?: string; failCode?: string;
  calls?: Call[];
};
const writes = (calls: Call[]) => calls.filter(c => c.method !== 'GET');
const sent = (calls: Call[], suffix: string) => writes(calls).filter(c => c.path.endsWith(suffix));
const reply = (route: Route, body: unknown, status = 200) => fulfillJson(route, body, status);
async function load(page: Page, opts: Options = {}) {
  if (opts.role) await loginAsDisposableRole(page, opts.role); else await loginAsTenant(page);
  const calls: Call[] = opts.calls || [];
  await page.route('**/inventory-capabilities/**', async route => {
    if (route.request().isNavigationRequest()) return route.continue();
    const path = new URL(route.request().url()).pathname.replace(/^\/api(?=\/)/, '');
    if (!path.startsWith('/inventory-capabilities/')) return route.continue();
    const method = route.request().method();
    let body: any = null;
    try { body = route.request().postDataJSON(); } catch { /* no JSON body */ }
    calls.push({ path, method, body, headers: route.request().headers() });
    if (method === 'GET' && opts.failGet && path.endsWith(opts.failGet)) return reply(route, { code: 'FIXTURE_UNAVAILABLE', message: 'Fixture data unavailable' }, 503);
    if (method !== 'GET' && opts.failWrite && path.endsWith(opts.failWrite)) return reply(route, { code: opts.failCode || 'FIXTURE_REJECTED', message: 'Fixture action rejected' }, 409);
    if (method === 'GET') {
      if (path.endsWith('/overview')) return reply(route, { counts: {}, priorities: [] });
      if (path.endsWith('/landed-costs')) return reply(route, opts.history ?? []);
      if (path.endsWith('/variants')) return reply(route, opts.variants ?? []);
      if (path.endsWith('/location-hierarchy')) return reply(route, opts.hierarchy ?? locations);
      if (path.endsWith('/boms')) return reply(route, opts.boms ?? [bom]);
      return reply(route, []);
    }
    if (path.endsWith('/preview')) return reply(route, { shipment: { id: SHIPMENT, status: 'received', po_number: 'PO-49' },
      currency: 'EUR', allocation_method: body?.allocation_method || 'value', total_extra_cost: (body?.charges || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0), preview_fingerprint: 'PW49_FIXTURE_FINGERPRINT',
      allocations: [{ shipment_item_id: 'shipment-line-49', product_id: ALPHA, product_name: 'Fixture Alpha', received_quantity: 2, base_unit_cost: 10, allocated_extra_cost: 15, landed_unit_cost: 17.5 }] });
    if (path.endsWith('/finalize')) return reply(route, { ok: true });
    if (path.endsWith('/boms')) return reply(route, { id: BOM });
    if (path.endsWith('/execute')) return reply(route, { ok: true });
    if (path.includes('/variants')) return reply(route, { id: VARIANT, ...body }, 201);
    if (path.includes('/location-hierarchy/')) return reply(route, { ok: true, version: 8 });
    return reply(route, { ok: true });
  });
  await page.route('**/products', r => r.request().isNavigationRequest() ? r.continue() : reply(r, opts.products ?? products));
  await page.route('**/storage-locations', r => r.request().isNavigationRequest() ? r.continue() : reply(r, locations));
  await page.route('**/shipments', r => r.request().isNavigationRequest() ? r.continue() : reply(r, opts.shipments ?? [shipment]));
  await page.route('**/suppliers', r => r.request().isNavigationRequest() ? r.continue() : reply(r, []));
  await page.route('**/purchase-orders', r => r.request().isNavigationRequest() ? r.continue() : reply(r, []));
  await page.route('**/stock', r => r.request().isNavigationRequest() ? r.continue() : reply(r, opts.stock ?? stock));
  await page.goto(`/inventory-capabilities?capability_tab=${opts.tab || 'landed-cost'}`);
  await expect(page.getByRole('heading', { name: 'Advanced inventory workspace' })).toBeVisible();
  return calls;
}
const previewButton = (page: Page) => page.getByRole('button', { name: 'Preview', exact: true });
const finalizeButton = (page: Page) => page.getByRole('button', { name: 'Finalize cost', exact: true });
async function charges(page: Page) {
  await page.getByLabel('Shipment', { exact: true }).selectOption(SHIPMENT);
  await page.getByLabel('Freight').fill('15');
}
async function preview(page: Page) { await charges(page); await previewButton(page).click(); await expect(page.getByRole('heading', { name: /Allocation preview/ })).toBeVisible(); }
async function variantForm(page: Page) {
  await page.getByLabel('Parent product').selectOption(ALPHA);
  await page.getByLabel('Variant name').fill('Summer Red');
}
const bomCreate = (page: Page) => page.getByRole('heading', { name: 'Create BOM', exact: true }).locator('..');
const bomExecute = (page: Page) => page.getByRole('heading', { name: 'Assemble / disassemble' }).locator('..');
async function readyAssembly(page: Page) {
  await bomExecute(page).getByLabel('BOM', { exact: true }).selectOption(BOM);
  await bomExecute(page).getByLabel('Location').selectOption(LOCATION);
}

test.describe('Landed cost — preview fingerprint, finalization and history (Batch 49)', () => {
  test('TICAP-092 Landed-cost preview calculates allocations without posting changes', async ({ page }) => {
    const calls = await load(page); await preview(page);
    await expect(page.getByRole('row').filter({ hasText: 'Fixture Alpha' }).last()).toContainText('17.50');
    expect(sent(calls, '/preview')[0]?.body).toMatchObject({ shipment_id: SHIPMENT, allocation_method: 'value', charges: [{ component_type: 'freight', amount: 15 }] });
    expect(sent(calls, '/finalize')).toHaveLength(0);
  });
  test('TICAP-093 Preview fingerprint mismatch shows rejection and preserves an editable preview', async ({ page }) => {
    const calls = await load(page, { failWrite: '/finalize', failCode: 'LANDED_COST_PREVIEW_STALE' }); await preview(page);
    await finalizeButton(page).click();
    await expect(page.getByRole('heading', { name: /Allocation preview/ })).toBeVisible();
    await expect(page.getByText('The landed-cost preview changed. Review the latest allocation before finalizing.')).toBeVisible();
    expect(sent(calls, '/finalize')[0]?.body.preview_fingerprint).toBe('PW49_FIXTURE_FINGERPRINT');
  });
  test('TICAP-094 Finalization requires displayed preview and sends expected fingerprint with one explicit button action', async ({ page }) => {
    const calls = await load(page); await charges(page);
    await expect(finalizeButton(page)).toBeDisabled(); await previewButton(page).click();
    await expect(finalizeButton(page)).toBeEnabled(); await finalizeButton(page).click();
    expect(sent(calls, '/finalize')).toHaveLength(1);
    expect(sent(calls, '/finalize')[0].body).toMatchObject({ shipment_id: SHIPMENT, preview_fingerprint: 'PW49_FIXTURE_FINGERPRINT' });
    await expect(page.getByRole('heading', { name: /Allocation preview/ })).toHaveCount(0);
    // Source has NO additional window.confirm here: record that separately in handoff, not fake a dialog.
  });
  test('TICAP-095 Rejected finalization leaves preview visible and no successful reset', async ({ page }) => {
    const calls = await load(page, { failWrite: '/finalize' }); await preview(page); await finalizeButton(page).click();
    await expect(page.getByText('Fixture action rejected')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Allocation preview/ })).toBeVisible();
    await expect(page.getByLabel('Freight')).toHaveValue('15');
    expect(sent(calls, '/finalize')).toHaveLength(1);
  });
  test('TICAP-101 Editing freight after preview clears stale allocation and locks finalize', async ({ page }) => {
    const calls = await load(page); await preview(page); await page.getByLabel('Freight').fill('16');
    await expect(finalizeButton(page)).toBeDisabled();
    await expect(page.getByRole('heading', { name: /Allocation preview/ })).toHaveCount(0);
    expect(sent(calls, '/finalize')).toHaveLength(0);
  });
  test('TICAP-102 Changing allocation method invalidates preview until recalculated', async ({ page }) => {
    const calls = await load(page); await preview(page);
    await page.getByLabel('Allocation').selectOption('quantity');
    await expect(finalizeButton(page)).toBeDisabled(); await previewButton(page).click();
    expect(sent(calls, '/preview').at(-1)?.body.allocation_method).toBe('quantity');
  });
  test('TICAP-103 Changing shipment invalidates preview fingerprint and prevents stale finalization', async ({ page }) => {
    const calls = await load(page, { shipments: [shipment, { id: 'shipment-other', po_number: 'PO-50', status: 'received' }] });
    await preview(page); await page.getByLabel('Shipment', { exact: true }).selectOption('shipment-other');
    await expect(finalizeButton(page)).toBeDisabled();
    await expect(page.getByRole('heading', { name: /Allocation preview/ })).toHaveCount(0);
    expect(sent(calls, '/finalize')).toHaveLength(0);
  });
  test('TICAP-104 Finalized landed-cost history shows returned PO, method, currency and date', async ({ page }) => {
    await load(page, { history: [{ id: 'history-49', shipment_id: SHIPMENT, po_number: 'PO-HISTORY-49', allocation_method: 'quantity', currency: 'EUR', total_extra_cost: 42, finalized_at: '2026-10-15T12:00:00Z' }] });
    const historyRow = page.getByRole('row').filter({ hasText: 'PO-HISTORY-49' });
    await expect(historyRow).toContainText('By quantity'); await expect(historyRow).toContainText('42');
  });
  test('TICAP-105 Failed landed-cost history read reports unavailable history rather than empty state', async ({ page }) => {
    await load(page, { failGet: '/landed-costs' });
    await expect(page.getByText('Fixture data unavailable')).toBeVisible();
    await expect(page.getByText('No landed costs have been finalized yet.')).toHaveCount(0);
  });
});

test.describe('Variants — parent eligibility, SKU suggestions, JSON attributes and errors (Batch 49)', () => {
  test('TICAP-096 Variant create submits chosen parent, generated SKU and normalized attributes', async ({ page }) => {
    const calls = await load(page, { tab: 'variants' }); await variantForm(page);
    await page.getByRole('button', { name: 'Add attribute' }).click();
    await page.getByLabel('Attribute name').fill(' Color ');
    await page.getByLabel('Attribute value').fill(' Red ');
    await page.getByRole('button', { name: 'Create variant' }).click();
    const v = sent(calls, `/products/${ALPHA}/variants`)[0];
    expect(v?.body).toMatchObject({ name: 'Summer Red', sku: 'PW49-ALPHA-SUMMER-RED', attributes: { Color: 'Red' } });
  });
  test('TICAP-097 Duplicate and unsafe variant attribute names block submission', async ({ page }) => {
    const calls = await load(page, { tab: 'variants' }); await variantForm(page);
    await page.getByRole('button', { name: 'Add attribute' }).click();
    await page.getByLabel('Attribute name').fill('__proto__');
    await page.getByLabel('Attribute value').fill('Red');
    await expect(page.getByRole('button', { name: 'Create variant' })).toBeDisabled();
    await expect(page.getByRole('alert')).toContainText('Use a different attribute name.');
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-106 Variant SKU suggestion strips punctuation and diacritics', async ({ page }) => {
    await load(page, { tab: 'variants' }); await page.getByLabel('Parent product').selectOption(ALPHA);
    await page.getByLabel('Variant name').fill('Crème / Bleu !');
    await expect(page.locator('output[aria-live="polite"]')).toContainText('PW49-ALPHA-CREME-BLEU');
  });
  test('TICAP-107 Colliding suggested SKU gains a deterministic numbered suffix', async ({ page }) => {
    await load(page, { tab: 'variants', products: [...products, { id: 'collision-49', name: 'Existing', sku: 'PW49-ALPHA-SUMMER-RED', unit: 'pcs' }] });
    await variantForm(page); await expect(page.locator('output[aria-live="polite"]')).toHaveText('PW49-ALPHA-SUMMER-RED-2');
  });
  test('TICAP-108 Missing variant name disables create even with parent selected', async ({ page }) => {
    const calls = await load(page, { tab: 'variants' });
    await page.getByLabel('Parent product').selectOption(ALPHA);
    await expect(page.getByRole('button', { name: 'Create variant' })).toBeDisabled();
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-109 Existing child variant is excluded from available parent options', async ({ page }) => {
    await load(page, { tab: 'variants' });
    await expect(page.getByLabel('Parent product').locator(`option[value="${VARIANT}"]`)).toHaveCount(0);
    await expect(page.getByLabel('Parent product').locator(`option[value="${ALPHA}"]`)).toHaveCount(1);
  });
  test('TICAP-110 Add and remove attribute row resets optional attributes before create', async ({ page }) => {
    const calls = await load(page, { tab: 'variants' }); await variantForm(page);
    await page.getByRole('button', { name: 'Add attribute' }).click();
    await expect(page.getByLabel('Attribute name')).toHaveCount(1);
    await page.getByRole('button', { name: 'Remove attribute 1' }).click();
    await page.getByRole('button', { name: 'Create variant' }).click();
    expect(sent(calls, `/products/${ALPHA}/variants`)[0]?.body.attributes).toEqual({});
  });
  test('TICAP-111 Blank attribute value disables create with visible validation', async ({ page }) => {
    await load(page, { tab: 'variants' }); await variantForm(page);
    await page.getByRole('button', { name: 'Add attribute' }).click(); await page.getByLabel('Attribute name').fill('Color');
    await expect(page.getByRole('button', { name: 'Create variant' })).toBeDisabled();
    await expect(page.getByRole('alert')).toContainText('Enter a value for each attribute.');
  });
  test('TICAP-112 Attribute names are unique case-insensitively', async ({ page }) => {
    await load(page, { tab: 'variants' }); await variantForm(page);
    await page.getByRole('button', { name: 'Add attribute' }).click(); await page.getByRole('button', { name: 'Add attribute' }).click();
    await page.getByLabel('Attribute name').nth(0).fill('Color'); await page.getByLabel('Attribute value').nth(0).fill('Red');
    await page.getByLabel('Attribute name').nth(1).fill('color'); await page.getByLabel('Attribute value').nth(1).fill('Blue');
    await expect(page.getByRole('alert')).toContainText('Attribute names must be unique.');
    await expect(page.getByRole('button', { name: 'Create variant' })).toBeDisabled();
  });
  test('TICAP-113 Manual SKU editor overrides auto suggestion in POST', async ({ page }) => {
    const calls = await load(page, { tab: 'variants' }); await variantForm(page);
    await page.getByRole('button', { name: 'Edit SKU' }).click();
    await page.getByLabel('Custom variant SKU').fill('PW49-CUSTOM-RED');
    await page.getByRole('button', { name: 'Create variant' }).click();
    expect(sent(calls, `/products/${ALPHA}/variants`)[0]?.body.sku).toBe('PW49-CUSTOM-RED');
  });
  test('TICAP-114 Reverting custom SKU uses recomputed suggested SKU', async ({ page }) => {
    await load(page, { tab: 'variants' }); await variantForm(page);
    await page.getByRole('button', { name: 'Edit SKU' }).click();
    await page.getByLabel('Custom variant SKU').fill('CUSTOM');
    await page.getByRole('button', { name: 'Use suggested SKU' }).click();
    await expect(page.locator('output[aria-live="polite"]')).toContainText('PW49-ALPHA-SUMMER-RED');
  });
  test('TICAP-115 Failed variant create preserves entered values and renders backend feedback', async ({ page }) => {
    const calls = await load(page, { tab: 'variants', failWrite: `/products/${ALPHA}/variants` }); await variantForm(page);
    await page.getByRole('button', { name: 'Create variant' }).click();
    await expect(page.getByText('Fixture action rejected')).toBeVisible();
    await expect(page.getByLabel('Variant name')).toHaveValue('Summer Red');
    expect(sent(calls, `/products/${ALPHA}/variants`)).toHaveLength(1);
  });
  test('TICAP-116 Successful variant create clears form instead of claiming live stock persisted', async ({ page }) => {
    const calls = await load(page, { tab: 'variants' }); await variantForm(page);
    await page.getByRole('button', { name: 'Create variant' }).click();
    await expect(page.getByLabel('Variant name')).toHaveValue('');
    expect(sent(calls, `/products/${ALPHA}/variants`)).toHaveLength(1);
  });
  test('TICAP-117 Variant registry shows parent, SKU, attributes and stock when authorized', async ({ page }) => {
    await load(page, { tab: 'variants', variants: [{ id: VARIANT, parent_product_id: ALPHA, parent_product_name: 'Fixture Alpha', sku: 'PW49-CHILD', name: 'Red variant', variant_attributes: { Color: 'Red' }, current_stock_quantity: 9 }] });
    const tr = page.getByRole('row').filter({ hasText: 'PW49-CHILD' });
    await expect(tr).toContainText('Fixture Alpha'); await expect(tr).toContainText('Color: Red'); await expect(tr).toContainText('9');
  });
  test('TICAP-118 Variant registry load error does not claim an empty variant list', async ({ page }) => {
    await load(page, { tab: 'variants', failGet: '/variants' });
    await expect(page.getByText('Fixture data unavailable')).toBeVisible();
    await expect(page.getByText('No product variants have been created yet.')).toHaveCount(0);
  });
  test('TICAP-119 Stock quantity is unavailable without stock-read permission', async ({ page }) => {
    await load(page, { tab: 'variants', role: 'PW_ICAP_NO_STOCK', variants: [{ id: VARIANT, parent_product_id: ALPHA, parent_product_name: 'Fixture Alpha', sku: 'PW49-CHILD', name: 'Red variant', current_stock_quantity: 9 }] });
    await expect(page.getByRole('row').filter({ hasText: 'PW49-CHILD' })).toContainText('Unavailable');
  });
});

test.describe('Location hierarchy — eligible parents, version headers and readback states (Batch 49)', () => {
  test('TICAP-098 Hierarchy parent choices exclude the selected location and ineligible bin or legacy storage', async ({ page }) => {
    await load(page, { tab: 'hierarchy' });
    await page.getByLabel('Location', { exact: true }).selectOption(BIN);
    await expect(page.getByLabel('Parent').locator(`option[value="${BIN}"]`)).toHaveCount(0);
    await expect(page.getByLabel('Parent').locator(`option[value="${LOCATION}"]`)).toHaveCount(1);
  });
  test('TICAP-120 Hierarchy registry fetch failure disables editing without displaying an empty list', async ({ page }) => {
    const calls = await load(page, { tab: 'hierarchy', failGet: '/location-hierarchy' });
    await expect(page.getByText('Location hierarchy is unavailable because the location structure could not be loaded.')).toBeVisible();
    await expect(page.getByLabel('Location', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save hierarchy' })).toBeDisabled();
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-121 An empty hierarchy shows an explicit no-locations message', async ({ page }) => {
    await load(page, { tab: 'hierarchy', hierarchy: [] });
    await expect(page.getByText('No storage locations are available to organize.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save hierarchy' })).toBeDisabled();
  });
  test('TICAP-122 Selecting a location preloads current parent, type, code and pickable state', async ({ page }) => {
    await load(page, { tab: 'hierarchy' }); await page.getByLabel('Location', { exact: true }).selectOption(BIN);
    await expect(page.getByLabel('Parent')).toHaveValue(LOCATION);
    await expect(page.getByLabel('Type', { exact: true })).toHaveValue('bin');
    await expect(page.getByLabel('Code')).toHaveValue('B49');
    await expect(page.getByLabel('Pickable location')).not.toBeChecked();
  });
  test('TICAP-123 Warehouse type offers only Top level and prevents attaching a parent', async ({ page }) => {
    await load(page, { tab: 'hierarchy' }); await page.getByLabel('Location', { exact: true }).selectOption(BIN);
    await page.getByLabel('Type', { exact: true }).selectOption('warehouse');
    await expect(page.getByLabel('Parent').locator('option:not([value=""])')).toHaveCount(1);
    // The previous parent is preserved as a disabled current-value warning, not as an eligible choice.
    await expect(page.getByLabel('Parent').locator(`option[value="${LOCATION}"]`)).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save hierarchy' })).toBeDisabled();
  });
  test('TICAP-124 Bin or legacy storage locations cannot act as hierarchy parents', async ({ page }) => {
    await load(page, { tab: 'hierarchy', hierarchy: [...locations, { id: 'legacy-49', name: 'Legacy Storage', location_type: 'storage', version: 1 }] });
    await page.getByLabel('Location', { exact: true }).selectOption(LOCATION);
    await page.getByLabel('Type', { exact: true }).selectOption('rack');
    await expect(page.getByLabel('Parent').locator(`option[value="${BIN}"]`)).toHaveCount(0);
    await expect(page.getByLabel('Parent').locator('option[value="legacy-49"]')).toHaveCount(0);
  });
  test('TICAP-125 Saving hierarchy includes If-Match-Version and user-selected pickable flag', async ({ page }) => {
    const calls = await load(page, { tab: 'hierarchy' }); await page.getByLabel('Location', { exact: true }).selectOption(LOCATION);
    await page.getByLabel('Code').fill('WH49-UPDATED');
    await page.getByLabel('Pickable location').uncheck();
    await page.getByRole('button', { name: 'Save hierarchy' }).click();
    const patch = sent(calls, `/location-hierarchy/${LOCATION}`)[0];
    expect(patch?.method).toBe('PATCH'); expect(patch?.headers['if-match-version']).toBe('7');
    expect(patch?.body).toMatchObject({ parent_location_id: null, location_type: 'warehouse', location_code: 'WH49-UPDATED', is_pickable: false });
  });
  test('TICAP-126 Rejected hierarchy update retains selected state and visible error', async ({ page }) => {
    const calls = await load(page, { tab: 'hierarchy', failWrite: `/location-hierarchy/${LOCATION}` });
    await page.getByLabel('Location', { exact: true }).selectOption(LOCATION);
    await page.getByLabel('Code').fill('REJECTED-49');
    await page.getByRole('button', { name: 'Save hierarchy' }).click();
    await expect(page.getByText('Fixture action rejected')).toBeVisible();
    await expect(page.getByLabel('Code')).toHaveValue('REJECTED-49');
    expect(sent(calls, `/location-hierarchy/${LOCATION}`)).toHaveLength(1);
  });
  test('TICAP-127 Location type change limits parent eligibility by hierarchy level', async ({ page }) => {
    await load(page, { tab: 'hierarchy', hierarchy: [ ...locations, { id: 'zone-49', name: 'Fixture Zone', location_type: 'zone', parent_location_id: LOCATION, version: 1 } ] });
    await page.getByLabel('Location', { exact: true }).selectOption(BIN);
    await page.getByLabel('Type', { exact: true }).selectOption('aisle');
    await expect(page.getByLabel('Parent').locator('option[value="zone-49"]')).toHaveCount(1);
    await expect(page.getByLabel('Parent').locator(`option[value="${LOCATION}"]`)).toHaveCount(1);
    await expect(page.getByLabel('Parent').locator(`option[value="${BIN}"]`)).toHaveCount(0);
  });
  test('TICAP-128 Stock positions column is shown only with stock read permission', async ({ page }) => {
    await load(page, { tab: 'hierarchy', role: 'PW_STORAGE_NO_STOCK' });
    await expect(page.getByRole('columnheader', { name: 'Stock positions' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Path' })).toBeVisible();
  });
  test('TICAP-129 Hierarchy save without supplied version omits optimistic-concurrency header', async ({ page }) => {
    const calls = await load(page, { tab: 'hierarchy', hierarchy: [{ ...locations[0], version: undefined }] });
    await page.getByLabel('Location', { exact: true }).selectOption(LOCATION);
    await page.getByRole('button', { name: 'Save hierarchy' }).click();
    expect(sent(calls, `/location-hierarchy/${LOCATION}`)[0]?.headers['if-match-version']).toBeUndefined();
  });
});

test.describe('BOM / assemblies — creation and stock-changing action guards (Batch 49)', () => {
  test('TICAP-099 Duplicate BOM component IDs and invalid quantity or waste disable create', async ({ page }) => {
    const calls = await load(page, { tab: 'bom' }); const form = bomCreate(page);
    await form.getByLabel('Finished product / kit').selectOption(ALPHA);
    await form.getByLabel('Component 1').selectOption(BETA);
    await form.getByRole('button', { name: 'Add component' }).click();
    await form.getByLabel('Component 2').selectOption(BETA);
    await expect(form.getByRole('button', { name: 'Create BOM' })).toBeDisabled();
    await expect(form.getByText(/Check for duplicate components/)).toBeVisible();
    await form.getByLabel('Component 2').selectOption('');
    await form.getByLabel('Quantity').first().fill('-1');
    await expect(form.getByRole('button', { name: 'Create BOM' })).toBeDisabled();
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-130 BOM form cannot submit without a finished-product selection', async ({ page }) => {
    const calls = await load(page, { tab: 'bom' }); const form = bomCreate(page);
    await form.getByLabel('Component 1').selectOption(BETA);
    await expect(form.getByRole('button', { name: 'Create BOM' })).toBeDisabled();
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-131 A product cannot be selected as its own BOM component', async ({ page }) => {
    await load(page, { tab: 'bom' }); const form = bomCreate(page);
    await form.getByLabel('Finished product / kit').selectOption(ALPHA);
    await expect(form.getByLabel('Component 1').locator(`option[value="${ALPHA}"]`)).toHaveCount(0);
  });
  test('TICAP-132 BOM component rows can be added and removed without POST', async ({ page }) => {
    const calls = await load(page, { tab: 'bom' }); const form = bomCreate(page);
    await form.getByRole('button', { name: 'Add component' }).click();
    await expect(form.getByLabel('Component 2')).toBeVisible();
    await form.getByRole('button', { name: 'Remove' }).last().click();
    await expect(form.getByLabel('Component 2')).toHaveCount(0);
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-133 Waste percentage above 100 disables BOM creation', async ({ page }) => {
    await load(page, { tab: 'bom' }); const form = bomCreate(page);
    await form.getByLabel('Finished product / kit').selectOption(ALPHA);
    await form.getByLabel('Component 1').selectOption(BETA);
    await form.getByLabel('Waste %').fill('101');
    await expect(form.getByRole('button', { name: 'Create BOM' })).toBeDisabled();
    await expect(form.getByText(/Check for duplicate components/)).toBeVisible();
  });
  test('TICAP-134 BOM POST contains normalized output and component quantities', async ({ page }) => {
    const calls = await load(page, { tab: 'bom' }); const form = bomCreate(page);
    await form.getByLabel('Finished product / kit').selectOption(ALPHA);
    await form.getByLabel('BOM name').fill('Kit 49');
    await form.getByLabel('Output quantity').fill('2');
    await form.getByLabel('Component 1').selectOption(BETA);
    await form.getByLabel('Quantity').fill('3.5'); await form.getByLabel('Waste %').fill('2.5');
    await form.getByRole('button', { name: 'Create BOM' }).click();
    expect(sent(calls, '/boms')[0]?.body).toMatchObject({ product_id: ALPHA, name: 'Kit 49', output_quantity: 2, components: [{ product_id: BETA, quantity: 3.5, waste_percent: 2.5 }] });
    await expect(page.getByText('BOM created successfully.')).toBeVisible();
  });
  test('TICAP-135 Rejected BOM create reports error and does not display success', async ({ page }) => {
    const calls = await load(page, { tab: 'bom', failWrite: '/boms' }); const form = bomCreate(page);
    await form.getByLabel('Finished product / kit').selectOption(ALPHA);
    await form.getByLabel('Component 1').selectOption(BETA);
    await form.getByRole('button', { name: 'Create BOM' }).click();
    await expect(page.getByText('Fixture action rejected')).toBeVisible();
    await expect(page.getByText('BOM created successfully.')).toHaveCount(0);
    expect(sent(calls, '/boms')).toHaveLength(1);
  });
  test('TICAP-136 BOM assembly button is disabled until BOM and location are selected', async ({ page }) => {
    const calls = await load(page, { tab: 'bom' });
    await expect(bomExecute(page).getByRole('button', { name: 'Assemble stock' })).toBeDisabled();
    await bomExecute(page).getByLabel('BOM', { exact: true }).selectOption(BOM);
    await expect(bomExecute(page).getByRole('button', { name: 'Assemble stock' })).toBeDisabled();
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-137 Insufficient free component stock blocks assembly before mutation', async ({ page }) => {
    const calls = await load(page, { tab: 'bom', stock: [{ product_id: BETA, storage_location_id: LOCATION, quantity: 1, reserved_quantity: 1, projected_free_quantity: 0 }] });
    await readyAssembly(page);
    await expect(page.getByText('This location cannot currently support the selected operation.')).toBeVisible();
    await expect(bomExecute(page).getByRole('button', { name: 'Assemble stock' })).toBeDisabled();
    expect(sent(calls, '/execute')).toHaveLength(0);
  });
  test('TICAP-138 Dismissing native assembly confirmation prevents posting request', async ({ page }) => {
    const calls = await load(page, { tab: 'bom' }); await readyAssembly(page);
    await expect(page.getByText('Stock check passed for this location based on current unreserved stock.')).toBeVisible();
    page.once('dialog', dialog => dialog.dismiss());
    await bomExecute(page).getByRole('button', { name: 'Assemble stock' }).click();
    expect(sent(calls, '/execute')).toHaveLength(0);
  });
  test('TICAP-139 Confirmed disassembly sends captured direction, location and quantity', async ({ page }) => {
    const calls = await load(page, { tab: 'bom' }); await readyAssembly(page);
    await bomExecute(page).getByLabel('Action').selectOption('disassemble');
    await bomExecute(page).getByLabel('Finished quantity').fill('3');
    page.once('dialog', dialog => dialog.accept());
    await bomExecute(page).getByRole('button', { name: 'Disassemble stock' }).click();
    expect(sent(calls, '/execute')[0]?.body).toMatchObject({ direction: 'disassemble', storage_location_id: LOCATION, output_quantity: 3, reservation_shortfall_acknowledged: false });
    await expect(page.getByText('Disassembly completed and stock movements recorded.')).toBeVisible();
  });
});

test.describe('Offline task mode — navigation does not pretend to sync offline inventory (Batch 49)', () => {
  test('TICAP-100 Mobile mode offers allowed task execution and scanner links', async ({ page }) => {
    const calls = await load(page, { tab: 'mobile' });
    await expect(page.getByRole('link', { name: 'Open Mobile Execution' })).toHaveAttribute('href', '/mobile-execution');
    await expect(page.getByRole('link', { name: 'Open scanner' })).toHaveAttribute('href', '/scanner');
    await expect(page.getByText('Offline queue + server replay')).toBeVisible();
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-140 Mobile mode explains which task actions may queue and which stock actions require connectivity', async ({ page }) => {
    const calls = await load(page, { tab: 'mobile' });
    await expect(page.getByText(/Operators can start, complete, block, or unblock execution tasks while disconnected/)).toBeVisible();
    await expect(page.getByText(/Stock-changing work such as receiving, transfers, counts, and dispatch still requires connectivity/)).toBeVisible();
    expect(sent(calls, '/mobile-sync')).toHaveLength(0);
  });
  test('TICAP-141 Scanner shortcut is hidden for mobile role without shipment read permission', async ({ page }) => {
    await load(page, { tab: 'mobile', role: 'PW_ICAP_MOBILE_NO_SHIPMENTS' });
    await expect(page.getByRole('link', { name: 'Open Mobile Execution' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open scanner' })).toHaveCount(0);
  });
});


// BATCH 50: final landed cost, variants, hierarchy, assembly and permission
// boundary cases. No real stock, ledger or tenant security is exercised.
test.describe('Inventory Capabilities — advanced completion edge cases (Batch 50)', () => {
  test('TICAP-154 Zero charges keep preview and finalize disabled', async ({ page }) => {
    const calls = await load(page);
    await page.getByLabel('Shipment', { exact: true }).selectOption(SHIPMENT);
    await page.getByLabel('Freight').fill('0');
    await expect(previewButton(page)).toBeDisabled();
    await expect(finalizeButton(page)).toBeDisabled();
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-155 Partially received shipment allows preview but blocks finalize', async ({ page }) => {
    const calls = await load(page, { shipments: [{ ...shipment, status: 'partial' }] });
    await charges(page);
    await expect(previewButton(page)).toBeEnabled();
    await previewButton(page).click();
    await expect(finalizeButton(page)).toBeDisabled();
    await expect(page.getByText('You can preview this shipment, but finalization stays locked until its status is Received.')).toBeVisible();
    expect(sent(calls, '/finalize')).toHaveLength(0);
  });
  test('TICAP-156 Currency conversion rejection displays backend message without finalization', async ({ page }) => {
    const calls = await load(page, { failWrite: '/preview', failCode: 'LANDED_COST_CURRENCY_CONVERSION_UNAVAILABLE' });
    await charges(page); await previewButton(page).click();
    await expect(page.locator('.form-error').filter({ hasText: /currency|conversion|Fixture/i }).first()).toBeVisible();
    await expect(finalizeButton(page)).toBeDisabled();
    expect(sent(calls, '/finalize')).toHaveLength(0);
  });
  test('TICAP-157 Products-write without suppliers-read shows inherited supplier permission gate', async ({ page }) => {
    const calls = await load(page, { tab: 'variants', role: 'PW_ICAP_PRODUCTS_NO_SUPPLIERS' });
    await page.getByLabel('Parent product').selectOption(ALPHA);
    await page.getByLabel('Variant name').fill('Permission test');
    await expect(page.getByRole('button', { name: 'Create variant' })).toBeDisabled();
    expect(writes(calls)).toHaveLength(0);
  });
  test('TICAP-158 Backend hierarchy-cycle rejection preserves editable selection', async ({ page }) => {
    const calls = await load(page, { tab: 'hierarchy', failWrite: `/location-hierarchy/${LOCATION}`, failCode: 'LOCATION_HIERARCHY_CYCLE' });
    await page.getByLabel('Location', { exact: true }).selectOption(LOCATION);
    await page.getByLabel('Code').fill('CYCLE-50');
    await page.getByRole('button', { name: 'Save hierarchy' }).click();
    await expect(page.getByLabel('Code')).toHaveValue('CYCLE-50');
    await expect(page.locator('.form-error').first()).toBeVisible();
    expect(sent(calls, `/location-hierarchy/${LOCATION}`)).toHaveLength(1);
  });
  test('TICAP-159 Stock-precheck outage displays warning without promising reservation validity', async ({ page }) => {
    const calls = await load(page, { tab: 'bom' });
    await page.route('**/stock', route => reply(route, { message: 'Fixture stock unavailable' }, 503));
    await readyAssembly(page);
    await expect(page.getByText('Current stock availability could not be prechecked here. The server will still validate stock before any movement is posted.')).toBeVisible();
    expect(sent(calls, '/execute')).toHaveLength(0);
  });
  test('TICAP-160 Projected free quantity accounts for reserved stock during readiness calculation', async ({ page }) => {
    const calls = await load(page, { tab: 'bom', stock: [
      { product_id: BETA, storage_location_id: LOCATION, quantity: 30, reserved_quantity: 29, projected_free_quantity: 1 }
    ] });
    await readyAssembly(page);
    await expect(page.getByText('This location cannot currently support the selected operation.')).toBeVisible();
    await expect(bomExecute(page).getByRole('button', { name: 'Assemble stock' })).toBeDisabled();
    expect(sent(calls, '/execute')).toHaveLength(0);
  });
  test('TICAP-161 Missing action-center permission hides bookmarked mobile tab and redirects to allowed tab', async ({ page }) => {
    const calls = await load(page, { tab: 'mobile', role: 'PW_ICAP_MOBILE_NO_ACTION' });
    await expect(page.getByRole('tab', { name: 'Offline task mode' })).toHaveCount(0);
    await expect(page).not.toHaveURL(/capability_tab=mobile/);
    expect(writes(calls)).toHaveLength(0);
  });
});
