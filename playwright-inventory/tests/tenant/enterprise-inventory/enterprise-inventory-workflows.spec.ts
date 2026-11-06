import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 45 — exact routed Inventory Controls workflows. Source: EnterpriseInventoryTabs,
// ParLevelsTab, CycleCountsTab, SupplierReturnsTab, ApprovalsTab, SupplierCatalogsTab,
// InvoicesTab, EnterpriseInventory{Api,Payloads,StockMutations,QueryStatus} and
// backend/src/routes/enterpriseInventory.js. Fixtures intercept only specified APIs.
// A mocked mutation establishes browser behavior and request construction, NOT server
// permissions, persistence, financial accuracy, locking or tenant isolation.
const productId = '11111111-1111-4111-8111-111111111111';
const locationId = '22222222-2222-4222-8222-222222222222';
const supplierId = '33333333-3333-4333-8333-333333333333';
const parId = '44444444-4444-4444-8444-444444444444';
const cycleId = '55555555-5555-4555-8555-555555555555';
const returnId = '66666666-6666-4666-8666-666666666666';
const invoiceId = '77777777-7777-4777-8777-777777777777';
const catalogId = '88888888-8888-4888-8888-888888888888';
const lotId = '99999999-9999-4999-8999-999999999999';
const at = '2026-10-01T09:00:00.000Z';
const product = { id: productId, name: 'Fixture flour', sku: 'PW-FLOUR', unit: 'kg', min_stock: 0, barcode: '900000001' };
const location = { id: locationId, name: 'Fixture dry storage' };
const supplier = { id: supplierId, name: 'Fixture supplier' };
const par = { id: parId, product_id: productId, product_name: product.name, storage_location_id: locationId,
  storage_location_name: location.name, department: '', min_quantity: 5, par_quantity: 12,
  max_quantity: 20, reorder_quantity: 0, replenishment_priority: 'normal', effective_from: null,
  effective_to: null, override_reason: null, active: true, version: 3 };
const evidence = { product_id: productId, product_name: product.name, product_unit: 'kg',
  storage_location_id: locationId, storage_location_name: location.name, expected_quantity: 7,
  counted_quantity: 5, variance_quantity: -2, snapshot_available: true, serial_numbers: [] as string[] };
const cycle = { id: cycleId, status: 'draft', department: '', notes: 'Fixture inventory count',
  created_at: at, version: 1, items: [evidence] };
const lot = { inventory_lot_id: lotId, product_id: productId, product_name: product.name,
  storage_location_id: locationId, storage_location_name: location.name, shipment_id: 'pw-shipment',
  shipment_item_id: 'pw-shipment-line', supplier_id: supplierId, supplier_name: supplier.name,
  lot_number: 'PW-LOT', batch_number: null, expiry_date: null, condition: 'available',
  physical_quantity: 12, returnable_quantity: 8, unit_cost: 2, unit_cost_currency: 'EUR',
  serial_tracking_enabled: false, serial_numbers: [] as string[] };
const returnedItem = { id: 'pw-return-line', product_id: productId, product_name: product.name,
  shipment_id: 'pw-shipment', shipment_item_id: 'pw-shipment-line', purchase_order_id: null,
  storage_location_name: location.name, lot_number: 'PW-LOT', batch_number: null, quantity: 2,
  source_condition: 'available', serial_numbers: [] };
const supplierReturn = { id: returnId, return_number: 'PW-RET-001', supplier_id: supplierId,
  supplier_name: supplier.name, status: 'draft', reason: 'Damaged package', notes: null,
  currency: 'EUR', total_amount: 4, valuation_status: 'available', created_at: at,
  version: 1, items: [returnedItem], credit_reconciliations: [] as unknown[] };
const supplierInvoice = { id: invoiceId, supplier_id: supplierId, supplier_name: supplier.name,
  invoice_number: 'PW-INV-001', invoice_date: '2026-10-01', due_date: '2026-11-01',
  status: 'draft', variance_status: 'not_checked', purchase_order_id: null, shipment_id: 'pw-shipment',
  currency: 'EUR', tax_amount: 0, subtotal_amount: 20, total_amount: 20,
  version: 4, created_at: at, updated_at: at, notes: '', items: [{ id: 'pw-invoice-line',
    product_id: productId, product_name: product.name, shipment_item_id: 'pw-shipment-line',
    purchase_order_item_id: null, quantity: 10, unit_cost: 2, line_amount: 20 }] };
const catalog = { id: catalogId, supplier_id: supplierId, supplier_name: supplier.name,
  product_id: productId, product_name: product.name, product_sku: product.sku,
  supplier_sku: 'SUP-PW', supplier_product_name: 'Fixture supplier flour', lead_time_days: 3,
  min_order_quantity: 1, preferred: true, latest_unit_cost: 2, latest_currency: 'EUR',
  latest_price_effective_from: '2026-10-01', active: true, version: 2 };

type HttpCall = { path: string; method: string; body?: unknown; headers: Record<string, string>; query: string };
type Options = {
  role?: 'PW_EI_NO_TASK' | 'PW_EI_NO_RECONCILE' | 'PW_EI_NO_DISPATCH' | 'PW_EI_NO_APPROVAL' | 'PW_EI_CATALOG_READ_ONLY' | 'PW_EI_INVOICE_NO_MATCH' | 'PW_EI_INVOICE_NO_PAY' | 'PW_EI_LABEL_READ_ONLY' | 'PW_EI_NOTIFY_READ_ONLY';
  products?: unknown[]; locations?: unknown[]; parLevels?: unknown[]; cycleCounts?: unknown[];
  eligibleLots?: unknown[]; supplierReturns?: unknown[]; invoices?: unknown[]; catalogs?: unknown[];
  requisitions?: unknown[]; approvalRules?: unknown[]; suppliers?: unknown[];
  failGet?: string; failWrite?: string; calls?: HttpCall[];
  barcodeLabels?: unknown[]; attachments?: unknown[]; attachmentOptions?: unknown[];
  notifications?: unknown[]; notificationDeliveries?: unknown[];
  notificationMore?: boolean; deliveryMore?: boolean;
};
const formAt = (page: Page, title: string) => page.getByRole('heading', { name: title, exact: true }).locator('..');
const called = (calls: HttpCall[], path: string, method: string) => calls.filter(c => c.path === path && c.method === method);
const body = (call: HttpCall) => call.body as Record<string, any>;
async function openFixture(page: Page, tabName: string, opts: Options = {}) {
  if (opts.role) await loginAsDisposableRole(page, opts.role);
  else await loginAsTenant(page);
  const calls = opts.calls ?? [];
  await page.route('**/*', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    const method = route.request().method();
    const exactGet: Record<string, unknown> = {
      '/products': opts.products ?? [product], '/storage-locations': opts.locations ?? [location],
      '/suppliers': opts.suppliers ?? [supplier], '/enterprise-inventory/par-levels': opts.parLevels ?? [par],
      '/enterprise-inventory/cycle-counts': opts.cycleCounts ?? [cycle],
      '/enterprise-inventory/supplier-returns/eligible-lots': opts.eligibleLots ?? [lot],
      '/enterprise-inventory/supplier-returns': opts.supplierReturns ?? [supplierReturn],
      '/enterprise-inventory/supplier-invoices': opts.invoices ?? [supplierInvoice],
      '/enterprise-inventory/approval-rules': opts.approvalRules ?? [],
      '/enterprise-inventory/department-requisitions': opts.requisitions ?? [],
      '/enterprise-inventory/supplier-catalog': opts.catalogs ?? [catalog],
      '/enterprise-inventory/barcode-labels': opts.barcodeLabels ?? [],
      '/enterprise-inventory/attachments': opts.attachments ?? [],
      '/enterprise-inventory/attachments/entity-options': opts.attachmentOptions ?? [],
      '/enterprise-inventory/notifications': { items: opts.notifications ?? [], pagination: { offset: Number(url.searchParams.get('offset') || 0), limit: 50, returned: (opts.notifications ?? []).length, total: (opts.notifications ?? []).length + (opts.notificationMore ? 50 : 0), has_more: opts.notificationMore ?? false } },
      '/enterprise-inventory/notifications/deliveries': { items: opts.notificationDeliveries ?? [], pagination: { offset: Number(url.searchParams.get('offset') || 0), limit: 50, returned: (opts.notificationDeliveries ?? []).length, total: (opts.notificationDeliveries ?? []).length + (opts.deliveryMore ? 50 : 0), has_more: opts.deliveryMore ?? false } },
      '/inventory-requisitions': [],
      '/purchase-orders': [], '/shipments': [],
    };
    const mayMock = path in exactGet || path.startsWith('/enterprise-inventory/')
      || path.startsWith('/execution-tasks/from-par-level/') || path === '/inventory-requisitions';
    if (!mayMock) return route.continue();
    let data: unknown;
    try { data = route.request().postDataJSON(); } catch { data = undefined; }
    calls.push({ path, method, body: data, headers: route.request().headers(), query: url.search });
    if (method === 'GET') {
      if (path === opts.failGet) return fulfillJson(route, { message: 'Fixture unavailable' }, 503);
      if (path in exactGet) return fulfillJson(route, exactGet[path]);
      return route.continue();
    }
    if (path === opts.failWrite) return fulfillJson(route, { message: 'Fixture validation rejected' }, 422);
    if (path === '/enterprise-inventory/par-levels') return fulfillJson(route, { ...par, ...(data && typeof data === 'object' ? data : {}) }, 201);
    if (path === '/enterprise-inventory/par-levels/evaluate') return fulfillJson(route, [par]);
    if (path.startsWith('/execution-tasks/from-par-level/')) return fulfillJson(route, { task_code: 'PW-TASK-1' }, 201);
    if (path === '/enterprise-inventory/cycle-counts') return fulfillJson(route, cycle, 201);
    if (path.startsWith('/enterprise-inventory/cycle-counts/')) return fulfillJson(route, { ...cycle, status: 'pending_approval' });
    if (path === '/enterprise-inventory/supplier-returns') return fulfillJson(route, supplierReturn, 201);
    if (path === '/enterprise-inventory/approvals/execute') return fulfillJson(route, { message: 'Updated', version: 2 });
    if (path.startsWith('/enterprise-inventory/supplier-returns/')) return fulfillJson(route, { ...supplierReturn, version: 2 });
    if (path === '/enterprise-inventory/supplier-catalog') return fulfillJson(route, catalog, 201);
    if (path.startsWith('/enterprise-inventory/supplier-catalog/')) return fulfillJson(route, catalog);
    if (path === '/enterprise-inventory/supplier-invoices') return fulfillJson(route, supplierInvoice, 201);
    if (path.startsWith('/enterprise-inventory/supplier-invoices/')) return fulfillJson(route, { ...supplierInvoice, version: 5 });
    if (path === '/enterprise-inventory/notifications/deliveries') return fulfillJson(route, { id: 'pw-delivery-2', status: 'queued' }, 201);
    if (path === '/enterprise-inventory/approval-rules') return fulfillJson(route, { id: 'pw-rule', entity_type: 'cycle_count', required_role: 'manager', active: true }, 201);
    return route.continue();
  });
  await page.goto(`/enterprise-inventory?tab=${tabName}`);
  await expect(page.getByRole('heading', { name: 'Specialized inventory workflows' })).toBeVisible();
  return { calls };
}
async function fillPar(page: Page, min = '5', target = '12') {
  const form = formAt(page, 'Create / update par level');
  await form.getByLabel('Product').selectOption(productId);
  await form.getByLabel('Storage location').selectOption(locationId);
  await form.getByLabel('Minimum quantity').fill(min);
  await form.getByLabel('Par / target quantity').fill(target);
  return form;
}
async function fillCycle(page: Page, quantity = '5') {
  const form = formAt(page, 'Create cycle count');
  await form.getByLabel('Product').selectOption(productId);
  await form.getByLabel('Storage location').selectOption(locationId);
  await form.getByLabel('Counted quantity').fill(quantity);
  return form;
}
const returnCreate = (page: Page) => formAt(page, 'Create supplier return');
const returnDraft = (page: Page) => formAt(page, 'Return draft');
const returnRow = (page: Page) => page.getByRole('row').filter({ hasText: 'PW-RET-001' });
const invoiceRow = (page: Page) => page.getByRole('row').filter({ hasText: 'PW-INV-001' });
async function addReturnLine(page: Page, quantity = '2') {
  const area = returnCreate(page);
  await area.getByLabel('Received lot').selectOption(lotId);
  await area.getByLabel('Return quantity').fill(quantity);
  await area.getByRole('button', { name: 'Add return line' }).click();
}

// Par levels — parLevelsTab + buildParLevelPayload + version-protected route.
test.describe('Enterprise Inventory — Par levels (Batch 45)', () => {
  test('TEI-021 Product and location selectors reflect the loaded tenant options', async ({ page }) => {
    await openFixture(page, 'par-levels', { parLevels: [] });
    const form = await fillPar(page);
    await expect(form.getByLabel('Product')).toHaveValue(productId);
    await expect(form.getByLabel('Storage location')).toHaveValue(locationId);
  });
  test('TEI-022 Valid min, target and optional max produce numeric par-level POST payload', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels', { parLevels: [] });
    const form = await fillPar(page, '6', '14');
    await form.getByLabel('Optional maximum quantity').fill('24');
    await form.getByRole('button', { name: 'Save par level' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/par-levels', 'POST').length).toBe(1);
    expect(body(called(calls, '/enterprise-inventory/par-levels', 'POST')[0])).toMatchObject({ product_id: productId, storage_location_id: locationId, min_quantity: 6, par_quantity: 14, max_quantity: 24, active: true });
  });
  test('TEI-023 Min exceeding target reaches server validation and rejection is shown, not fake client prevention', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels', { parLevels: [], failWrite: '/enterprise-inventory/par-levels' });
    const form = await fillPar(page, '30', '10');
    await form.getByRole('button', { name: 'Save par level' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/par-levels', 'POST').length).toBe(1);
    await expect(page.getByText('Fixture validation rejected')).toBeVisible();
  });
  test('TEI-024 Edit loads existing row and submits expected_version rather than unsafe unversioned update', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const form = formAt(page, 'Create / update par level');
    await expect(form.getByLabel('Minimum quantity')).toHaveValue('5');
    await expect(form.getByLabel('Product')).toBeDisabled();
    await form.getByLabel('Par / target quantity').fill('13');
    await form.getByRole('button', { name: 'Save par level' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/par-levels', 'POST').length).toBe(1);
    expect(body(called(calls, '/enterprise-inventory/par-levels', 'POST')[0])).toMatchObject({ expected_version: 3, par_quantity: 13 });
  });
  test('TEI-025 Cancel edit restores blank create form without any POST', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const form = formAt(page, 'Create / update par level');
    await form.getByLabel('Minimum quantity').fill('900');
    await form.getByRole('button', { name: 'Cancel edit' }).click();
    await expect(form.getByLabel('Minimum quantity')).toHaveValue('');
    await expect(form.getByLabel('Product')).toBeEnabled();
    expect(called(calls, '/enterprise-inventory/par-levels', 'POST')).toHaveLength(0);
  });
  test('TEI-026 Effective window is sent as entered and server rejection remains visible', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels', { parLevels: [], failWrite: '/enterprise-inventory/par-levels' });
    const form = await fillPar(page);
    await form.getByLabel('Effective from').fill('2026-12-20');
    await form.getByLabel('Effective to').fill('2026-12-01');
    await form.getByRole('button', { name: 'Save par level' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/par-levels', 'POST').length).toBe(1);
    expect(body(called(calls, '/enterprise-inventory/par-levels', 'POST')[0])).toMatchObject({ effective_from: '2026-12-20', effective_to: '2026-12-01' });
    await expect(page.getByText('Fixture validation rejected')).toBeVisible();
  });
  test('TEI-027 Zero fixed reorder is allowed and explicitly means automatic to target', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels', { parLevels: [] });
    const form = await fillPar(page);
    await expect(form.getByText('0 = automatically calculate the quantity needed to reach the target.')).toBeVisible();
    await form.getByLabel('Fixed reorder quantity (optional)').fill('0');
    await form.getByRole('button', { name: 'Save par level' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/par-levels', 'POST').length).toBe(1);
    expect(body(called(calls, '/enterprise-inventory/par-levels', 'POST')[0]).reorder_quantity).toBe(0);
  });
  test('TEI-028 Below-product-minimum warning requires explicit Save anyway before POST', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels', { parLevels: [], products: [{ ...product, min_stock: 20 }] });
    const form = await fillPar(page, '3', '10');
    await form.getByRole('button', { name: 'Save par level' }).click();
    await expect(form.getByText('Location minimums are below the product minimum')).toBeVisible();
    expect(called(calls, '/enterprise-inventory/par-levels', 'POST')).toHaveLength(0);
    await form.getByRole('button', { name: 'Save anyway' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/par-levels', 'POST').length).toBe(1);
  });
  test('TEI-029 Go back from minimum warning preserves entered draft and sends no write', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels', { parLevels: [], products: [{ ...product, min_stock: 20 }] });
    const form = await fillPar(page, '3', '10');
    await form.getByRole('button', { name: 'Save par level' }).click();
    await form.getByRole('button', { name: 'Go back' }).click();
    await expect(form.getByLabel('Minimum quantity')).toHaveValue('3');
    await expect(form.getByRole('button', { name: 'Save par level' })).toBeVisible();
    expect(called(calls, '/enterprise-inventory/par-levels', 'POST')).toHaveLength(0);
  });
  test('TEI-030 Evaluate calls the dedicated par-level evaluation endpoint and displays signal count', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels');
    await page.getByRole('button', { name: 'Evaluate par levels' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/par-levels/evaluate', 'POST').length).toBe(1);
    await expect(page.getByText('1 low-stock par level signal generated.')).toBeVisible();
  });
  test('TEI-031 Replenishment task creation requires execution task and source-read permissions', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels', { role: 'PW_EI_NO_TASK' });
    await expect(page.getByRole('button', { name: 'Create execution task' })).toBeDisabled();
    expect(calls.filter(c => c.path.startsWith('/execution-tasks/from-par-level/') && c.method === 'POST')).toHaveLength(0);
  });
  test('TEI-032 Active-workspace par-level GET error is visible, not mistaken for empty successful list', async ({ page }) => {
    await openFixture(page, 'par-levels', { failGet: '/enterprise-inventory/par-levels' });
    await expect(page.getByText(/Could not load par levels:.*Fixture unavailable/)).toBeVisible();
  });
});

// Cycle count draft, evidence and status-dependent reconciliation.
test.describe('Enterprise Inventory — Cycle counts (Batch 45)', () => {
  test('TEI-033 Loaded product and location are selectable in the count form', async ({ page }) => {
    await openFixture(page, 'cycle-counts');
    const form = await fillCycle(page);
    await expect(form.getByLabel('Storage location')).toHaveValue(locationId);
    await expect(form.getByLabel('Product')).toHaveValue(productId);
  });
  test('TEI-034 Valid count serializes one item with location, quantity and lot metadata', async ({ page }) => {
    const { calls } = await openFixture(page, 'cycle-counts');
    const form = await fillCycle(page, '4');
    await form.getByLabel('Lot number').fill('PW-LOT');
    await form.getByLabel('Batch number').fill('PW-BATCH');
    await form.getByRole('button', { name: 'Create cycle count' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/cycle-counts', 'POST').length).toBe(1);
    const sent = body(called(calls, '/enterprise-inventory/cycle-counts', 'POST')[0]);
    expect(sent.items).toEqual([expect.objectContaining({ product_id: productId, storage_location_id: locationId, counted_quantity: 4, lot_number: 'PW-LOT', batch_number: 'PW-BATCH' })]);
  });
  test('TEI-035 One-per-line serial entry remains visible and is serialized as a normalized array', async ({ page }) => {
    const { calls } = await openFixture(page, 'cycle-counts');
    const form = await fillCycle(page, '2');
    await form.getByLabel('Serial numbers counted').fill('PW-SER-1\nPW-SER-2');
    await expect(form.getByLabel('Serial numbers counted')).toHaveValue('PW-SER-1\nPW-SER-2');
    await form.getByRole('button', { name: 'Create cycle count' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/cycle-counts', 'POST').length).toBe(1);
    expect(body(called(calls, '/enterprise-inventory/cycle-counts', 'POST')[0]).items[0].serial_numbers).toEqual(['PW-SER-1', 'PW-SER-2']);
  });
  test('TEI-036 Empty counted quantity is native-required; negative quantity can be rejected by API', async ({ page }) => {
    const { calls } = await openFixture(page, 'cycle-counts', { failWrite: '/enterprise-inventory/cycle-counts' });
    const form = await fillCycle(page, '');
    await form.getByRole('button', { name: 'Create cycle count' }).click();
    await expect(form.getByLabel('Counted quantity')).toBeInvalid();
    expect(called(calls, '/enterprise-inventory/cycle-counts', 'POST')).toHaveLength(0);
    await form.getByLabel('Counted quantity').fill('-1');
    await form.getByRole('button', { name: 'Create cycle count' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/cycle-counts', 'POST').length).toBe(1);
    await expect(page.getByText('Fixture validation rejected')).toBeVisible();
  });
  test('TEI-037 Draft with trusted evidence shows Submit; approved count shows Reconcile instead', async ({ page }) => {
    await openFixture(page, 'cycle-counts', { cycleCounts: [cycle, { ...cycle, id: 'pw-approved', status: 'approved', notes: 'Approved count' }] });
    const draftRow = page.getByRole('row').filter({ hasText: 'Fixture inventory count' });
    const approvedRow = page.getByRole('row').filter({ hasText: 'Approved count' });
    await expect(draftRow.getByRole('button', { name: 'Submit' })).toBeVisible();
    await expect(draftRow.getByRole('button', { name: 'Reconcile' })).toHaveCount(0);
    await expect(approvedRow.getByRole('button', { name: 'Reconcile' })).toBeVisible();
  });
  test('TEI-038 Cancelling native Submit confirmation prevents cycle count POST', async ({ page }) => {
    const { calls } = await openFixture(page, 'cycle-counts');
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('row').filter({ hasText: 'Fixture inventory count' }).getByRole('button', { name: 'Submit' }).click();
    expect(called(calls, `/enterprise-inventory/cycle-counts/${cycleId}/submit`, 'POST')).toHaveLength(0);
  });
  test('TEI-039 Reconcile requires approval and stock-adjust roles even for trusted evidence', async ({ page }) => {
    const { calls } = await openFixture(page, 'cycle-counts', { role: 'PW_EI_NO_RECONCILE', cycleCounts: [{ ...cycle, status: 'approved' }] });
    await expect(page.getByRole('button', { name: 'Reconcile' })).toBeDisabled();
    expect(called(calls, `/enterprise-inventory/cycle-counts/${cycleId}/reconcile`, 'POST')).toHaveLength(0);
  });
  test('TEI-040 Failed Submit displays an error and never shows false reconciled status', async ({ page }) => {
    const target = `/enterprise-inventory/cycle-counts/${cycleId}/submit`;
    const { calls } = await openFixture(page, 'cycle-counts', { failWrite: target });
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('row').filter({ hasText: 'Fixture inventory count' }).getByRole('button', { name: 'Submit' }).click();
    await expect.poll(() => called(calls, target, 'POST').length).toBe(1);
    await expect(page.getByText('Fixture validation rejected')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Fixture inventory count' })).toContainText('Draft');
  });
});

// Supplier returns and financial credits — only recorded UI/read/transport, not actual stock/ledger postings.
test.describe('Enterprise Inventory — Supplier returns (Batch 45)', () => {
  test('TEI-041 New return draft starts with an empty line list and helpful next-step text', async ({ page }) => {
    await openFixture(page, 'supplier-returns');
    await expect(returnDraft(page).getByText('Add one or more received lots from the same supplier.')).toBeVisible();
    await expect(returnDraft(page).getByRole('button', { name: 'Create return draft' })).toHaveCount(0);
  });
  test('TEI-042 Eligible lot can be added and removed from a draft without POST', async ({ page }) => {
    const { calls } = await openFixture(page, 'supplier-returns');
    await addReturnLine(page);
    await expect(returnDraft(page).getByRole('row').filter({ hasText: product.name })).toBeVisible();
    await returnDraft(page).getByRole('button', { name: 'Remove' }).click();
    await expect(returnDraft(page).getByText('Add one or more received lots from the same supplier.')).toBeVisible();
    expect(called(calls, '/enterprise-inventory/supplier-returns', 'POST')).toHaveLength(0);
  });
  test('TEI-043 Create return draft requires an entered return reason', async ({ page }) => {
    await openFixture(page, 'supplier-returns');
    await addReturnLine(page);
    await expect(returnDraft(page).getByRole('button', { name: 'Create return draft' })).toBeDisabled();
    await returnDraft(page).getByLabel('Return reason').fill('Returned to original supplier');
    await expect(returnDraft(page).getByRole('button', { name: 'Create return draft' })).toBeEnabled();
  });
  test('TEI-044 Selecting a currency locks out eligible lots with conflicting currency', async ({ page }) => {
    const secondLot = { ...lot, inventory_lot_id: 'pw-lot-usd', lot_number: 'PW-USD', unit_cost_currency: 'USD' };
    await openFixture(page, 'supplier-returns', { eligibleLots: [lot, secondLot] });
    await addReturnLine(page);
    const remaining = returnCreate(page).getByLabel('Received lot');
    await expect(remaining.locator('option[value="pw-lot-usd"]')).toHaveCount(0);
    await returnDraft(page).getByLabel('Return reason').fill('Unusable item');
    await expect(returnDraft(page).getByRole('button', { name: 'Create return draft' })).toBeEnabled();
  });
  test('TEI-045 Draft, pending approval and approved returns expose state-specific actions', async ({ page }) => {
    await openFixture(page, 'supplier-returns', { supplierReturns: [supplierReturn, { ...supplierReturn, id: 'pw-pending', return_number: 'PW-RET-002', status: 'pending_approval' }, { ...supplierReturn, id: 'pw-approved', return_number: 'PW-RET-003', status: 'approved' }] });
    await expect(page.getByRole('row').filter({ hasText: 'PW-RET-001' }).getByRole('button', { name: 'Submit' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'PW-RET-002' }).getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'PW-RET-003' }).getByRole('button', { name: 'Dispatch' })).toBeVisible();
  });
  test('TEI-046 Reject prompt cancellation leaves pending approval and sends no approval POST', async ({ page }) => {
    const { calls } = await openFixture(page, 'supplier-returns', { supplierReturns: [{ ...supplierReturn, status: 'pending_approval' }] });
    page.once('dialog', dialog => dialog.dismiss());
    await returnRow(page).getByRole('button', { name: 'Reject' }).click();
    expect(called(calls, '/enterprise-inventory/approvals/execute', 'POST')).toHaveLength(0);
    await expect(returnRow(page)).toContainText('Pending approval');
  });
  test('TEI-047 Approved return requires dispatch permission before sending any mutation', async ({ page }) => {
    const target = `/enterprise-inventory/supplier-returns/${returnId}/dispatch`;
    const { calls } = await openFixture(page, 'supplier-returns', { role: 'PW_EI_NO_DISPATCH', supplierReturns: [{ ...supplierReturn, status: 'approved' }] });
    await expect(returnRow(page).getByRole('button', { name: 'Dispatch' })).toBeDisabled();
    expect(called(calls, target, 'POST')).toHaveLength(0);
  });
  test('TEI-048 Dispatched return exposes Complete but no second Dispatch', async ({ page }) => {
    await openFixture(page, 'supplier-returns', { supplierReturns: [{ ...supplierReturn, status: 'dispatched' }] });
    await expect(returnRow(page).getByRole('button', { name: 'Complete' })).toBeVisible();
    await expect(returnRow(page).getByRole('button', { name: 'Dispatch' })).toHaveCount(0);
  });
  test('TEI-049 Completed and cancelled returns have no Cancel action', async ({ page }) => {
    await openFixture(page, 'supplier-returns', { supplierReturns: [{ ...supplierReturn, status: 'completed' }, { ...supplierReturn, id: 'pw-cancelled', return_number: 'PW-RET-002', status: 'cancelled' }] });
    for (const number of ['PW-RET-001', 'PW-RET-002']) await expect(page.getByRole('row').filter({ hasText: number }).getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  });
  test('TEI-050 Financial credit expectation is disabled until completed return and eligible invoice are selected', async ({ page }) => {
    await openFixture(page, 'supplier-returns', { supplierReturns: [{ ...supplierReturn, status: 'completed' }], invoices: [{ ...supplierInvoice, status: 'matched' }] });
    const panel = formAt(page, 'Supplier return financial reconciliation');
    await panel.getByLabel('Completed supplier return').selectOption(returnId);
    await expect(panel.getByLabel('Original matched / paid invoice')).toBeEnabled();
    await panel.getByLabel('Original matched / paid invoice').selectOption(invoiceId);
    await expect(panel.getByRole('button', { name: 'Create expected supplier credit' })).toBeEnabled();
    await expect(panel.getByText(/expected subtotal/i)).toBeVisible();
  });
  test('TEI-051 Expected credit row offers Record credit note but settled row does not', async ({ page }) => {
    const credit = { id: 'pw-credit', status: 'expected', version: 1, invoice_number: supplierInvoice.invoice_number,
      expected_total_amount: 4, expected_subtotal_amount: 4, expected_tax_amount: 0, currency: 'EUR', items: [] };
    await openFixture(page, 'supplier-returns', { supplierReturns: [{ ...supplierReturn, status: 'completed', credit_reconciliations: [credit] }] });
    await expect(returnRow(page).getByRole('button', { name: 'Record credit note' })).toBeVisible();
    await expect(returnRow(page).getByRole('button', { name: 'Settle credit' })).toHaveCount(0);
  });
  test('TEI-052 Settled credit hides mutation actions and shows historical settlement information', async ({ page }) => {
    const credit = { id: 'pw-credit', status: 'settled', version: 3, invoice_number: supplierInvoice.invoice_number,
      expected_total_amount: 4, expected_subtotal_amount: 4, expected_tax_amount: 0, currency: 'EUR',
      settlement_method: 'refund', settlement_reference: 'PW-REFUND-1', items: [] };
    await openFixture(page, 'supplier-returns', { supplierReturns: [{ ...supplierReturn, status: 'completed', credit_reconciliations: [credit] }] });
    await expect(returnRow(page)).toContainText('PW-REFUND-1');
    for (const action of ['Record credit note', 'Adjust expected credit', 'Settle credit', 'Waive']) {
      await expect(returnRow(page).getByRole('button', { name: action })).toHaveCount(0);
    }
  });
});

// Approvals — rule guards, review queue, requisition navigation and permission-aware actions.
test.describe('Enterprise Inventory — Approvals (Batch 45)', () => {
  test('TEI-053 Amount-rule Save remains disabled until amount, currency and role criteria are valid', async ({ page }) => {
    await openFixture(page, 'approvals');
    const form = formAt(page, 'Create approval rule');
    await form.getByLabel('Entity type').selectOption('supplier_invoice');
    await form.getByLabel('Minimum amount').fill('');
    await expect(form.getByRole('button', { name: 'Save approval rule' })).toBeDisabled();
    await form.getByLabel('Minimum amount').fill('8');
    await form.getByLabel('Maximum amount').fill('4');
    await expect(form.getByText('Maximum amount must be greater than or equal to minimum amount.')).toBeVisible();
    await form.getByLabel('Maximum amount').fill('12');
    await expect(form.getByRole('button', { name: 'Save approval rule' })).toBeEnabled();
  });
  test('TEI-054 Failed submitted-requisition fetch offers Retry without false empty-queue success', async ({ page }) => {
    const { calls } = await openFixture(page, 'approvals', { failGet: '/inventory-requisitions' });
    const alert = page.getByRole('alert').filter({ hasText: 'Submitted requisitions could not be loaded.' });
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: 'Retry' }).click();
    await expect.poll(() => called(calls, '/inventory-requisitions', 'GET').length).toBeGreaterThan(1);
  });
  test('TEI-055 Open requisition preserves encoded ID in its routed review link', async ({ page }) => {
    await openFixture(page, 'approvals', { requisitions: [], invoices: [], supplierReturns: [], cycleCounts: [] });
    // This separate inventory-requisition queue is populated via a dedicated GET, not the
    // department requisitions endpoint used to build the other-approval queue.
    await page.route('**/inventory-requisitions?*', route => fulfillJson(route, [{
      id: 'pw-req/with space', requisition_number: 'PW-RQ-001', status: 'submitted',
      requesting_department: 'Kitchen', created_at: at
    }]));
    await page.reload();
    await page.getByRole('row').filter({ hasText: 'PW-RQ-001' }).getByRole('button', { name: 'Open requisition' }).click();
    await expect(page).toHaveURL(/\/inventory-requisitions\?requisitionId=pw-req%2Fwith%20space/);
  });
  test('TEI-056 Submitted inventory requisition page uses offset 20 and a disabled final Next', async ({ page }) => {
    const requests: HttpCall[] = [];
    await openFixture(page, 'approvals', { calls: requests });
    const initial = Array.from({ length: 21 }, (_, i) => ({ id: `pw-req-${i}`, requisition_number: `PW-RQ-${i}`, status: 'submitted', requesting_department: 'Kitchen', created_at: at }));
    await page.route('**/inventory-requisitions?*', route => fulfillJson(route, new URL(route.request().url()).searchParams.get('offset') === '20' ? initial.slice(20) : initial));
    await page.reload();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Page 2')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
    await expect(page.getByRole('row').filter({ hasText: 'PW-RQ-20' })).toBeVisible();
  });
  test('TEI-057 Permission-limited approval reader can view queue but cannot approve or reject', async ({ page }) => {
    const { calls } = await openFixture(page, 'approvals', { role: 'PW_EI_NO_APPROVAL', supplierReturns: [{ ...supplierReturn, status: 'pending_approval' }] });
    const row = page.getByRole('row').filter({ hasText: 'Supplier return PW-RET-001' });
    await expect(row.getByRole('button', { name: 'Approve' })).toBeDisabled();
    await expect(row.getByRole('button', { name: 'Reject' })).toBeDisabled();
    expect(called(calls, '/enterprise-inventory/approvals/execute', 'POST')).toHaveLength(0);
  });
  test('TEI-058 Persisted approval rules render required role, active state and location', async ({ page }) => {
    await openFixture(page, 'approvals', { approvalRules: [{ id: 'pw-rule', entity_type: 'cycle_count',
      department: null, storage_location_id: locationId, min_amount: 0, max_amount: null,
      currency: 'EUR', required_role: 'manager', active: true, version: 2 }] });
    const rules = formAt(page, 'Approval rules');
    await expect(rules.getByRole('row').filter({ hasText: 'Cycle count' })).toContainText('Fixture dry storage');
    await expect(rules.getByRole('row').filter({ hasText: 'Cycle count' })).toContainText('Manager');
  });
});

// Catalogs — source performs client-side search/filter, NOT a query for each keystroke.
test.describe('Enterprise Inventory — Supplier catalogs (Batch 45)', () => {
  test('TEI-059 Manual supplier-product mapping selects exact loaded identities', async ({ page }) => {
    await openFixture(page, 'supplier-catalog');
    const form = formAt(page, 'Manual supplier-product link');
    await form.getByLabel('Supplier').selectOption(supplierId);
    await form.getByLabel('Product').selectOption(productId);
    await expect(form.getByRole('button', { name: 'Save supplier catalog item' })).toBeEnabled();
  });
  test('TEI-060 Server duplicate/validation rejection keeps mapping form and shows error', async ({ page }) => {
    const { calls } = await openFixture(page, 'supplier-catalog', { failWrite: '/enterprise-inventory/supplier-catalog' });
    const form = formAt(page, 'Manual supplier-product link');
    await form.getByLabel('Supplier').selectOption(supplierId);
    await form.getByLabel('Product').selectOption(productId);
    await form.getByRole('button', { name: 'Save supplier catalog item' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/supplier-catalog', 'POST').length).toBe(1);
    await expect(page.getByText('Fixture validation rejected')).toBeVisible();
    await expect(form.getByLabel('Supplier')).toHaveValue(supplierId);
  });
  test('TEI-061 Catalog search and supplier filter operate on fetched rows without writing data', async ({ page }) => {
    const { calls } = await openFixture(page, 'supplier-catalog', { catalogs: [catalog, { ...catalog, id: 'pw-catalog-2', supplier_sku: 'SECOND-ITEM', supplier_product_name: 'Different flour' }] });
    const filters = formAt(page, 'Catalog filters');
    await filters.getByLabel('Search catalog').fill('SUP-PW');
    await expect(formAt(page, 'Active supplier catalog').getByRole('row').filter({ hasText: 'SECOND-ITEM' })).toHaveCount(0);
    await expect(formAt(page, 'Active supplier catalog').getByRole('row').filter({ hasText: 'SUP-PW' })).toBeVisible();
    expect(called(calls, '/enterprise-inventory/supplier-catalog', 'POST')).toHaveLength(0);
  });
  test('TEI-062 Failed manual mapping save preserves supplier SKU and operator input', async ({ page }) => {
    await openFixture(page, 'supplier-catalog', { failWrite: '/enterprise-inventory/supplier-catalog' });
    const form = formAt(page, 'Manual supplier-product link');
    await form.getByLabel('Supplier').selectOption(supplierId);
    await form.getByLabel('Product').selectOption(productId);
    await form.getByLabel('Supplier SKU').fill('HAND-ENTRY-001');
    await form.getByRole('button', { name: 'Save supplier catalog item' }).click();
    await expect(page.getByText('Fixture validation rejected')).toBeVisible();
    await expect(form.getByLabel('Supplier SKU')).toHaveValue('HAND-ENTRY-001');
  });
  test('TEI-063 Read-only supplier-catalog role cannot Deactivate an existing mapping', async ({ page }) => {
    const { calls } = await openFixture(page, 'supplier-catalog', { role: 'PW_EI_CATALOG_READ_ONLY' });
    const row = formAt(page, 'Active supplier catalog').getByRole('row').filter({ hasText: 'SUP-PW' });
    await expect(row.getByRole('button', { name: 'Deactivate' })).toBeDisabled();
    await expect(formAt(page, 'Manual supplier-product link').getByRole('button', { name: 'Save supplier catalog item' })).toBeDisabled();
    expect(calls.filter(c => c.path.includes('/supplier-catalog/') && c.method === 'POST')).toHaveLength(0);
  });
});

// Supplier invoices — lifecycle actions are versioned; browser mock cannot prove real payment.
test.describe('Enterprise Inventory — Invoices (Batch 45)', () => {
  test('TEI-064 Draft creation stays disabled without supplier, invoice ID and valid line', async ({ page }) => {
    await openFixture(page, 'invoices');
    const form = formAt(page, 'Create supplier invoice draft');
    await expect(form.getByRole('button', { name: 'Create draft' })).toBeDisabled();
    await form.getByLabel('Supplier').selectOption(supplierId);
    await form.getByLabel('Invoice number').fill('PW-NEW-INV');
    await expect(form.getByRole('button', { name: 'Create draft' })).toBeDisabled();
    await form.getByLabel('Product 1').selectOption(productId);
    await form.getByLabel('Quantity', { exact: true }).fill('3');
    await form.getByLabel('Unit cost', { exact: true }).fill('2');
    await expect(form.getByRole('button', { name: 'Create draft' })).toBeEnabled();
  });
  test('TEI-065 Editing an existing draft PATCHes with expected version and revised line value', async ({ page }) => {
    const { calls } = await openFixture(page, 'invoices');
    await invoiceRow(page).getByRole('button', { name: 'Edit' }).click();
    const form = formAt(page, 'Edit supplier invoice draft');
    await expect(form.getByLabel('Supplier')).toBeDisabled();
    await expect(form.getByLabel('Invoice number')).toHaveValue('PW-INV-001');
    await form.getByLabel('Quantity', { exact: true }).fill('9');
    await form.getByRole('button', { name: 'Save draft changes' }).click();
    const target = `/enterprise-inventory/supplier-invoices/${invoiceId}`;
    await expect.poll(() => called(calls, target, 'PATCH').length).toBe(1);
    const sent = called(calls, target, 'PATCH')[0];
    expect(sent.headers['if-match-version']).toBe('4');
    expect(body(sent).items).toEqual(expect.arrayContaining([expect.objectContaining({ quantity: 9 })]));
  });
  test('TEI-066 Rejected invoice Revise action asks for confirmation before issuing versioned POST', async ({ page }) => {
    const { calls } = await openFixture(page, 'invoices', { invoices: [{ ...supplierInvoice, status: 'rejected' }] });
    const target = `/enterprise-inventory/supplier-invoices/${invoiceId}/revise`;
    page.once('dialog', dialog => dialog.accept());
    await invoiceRow(page).getByRole('button', { name: 'Revise' }).click();
    await expect.poll(() => called(calls, target, 'POST').length).toBe(1);
    await expect(page.getByText('Supplier invoice returned to draft for revision.')).toBeVisible();
  });
  test('TEI-067 Approval viewer lacking invoices.match cannot mark approved invoice matched', async ({ page }) => {
    const { calls } = await openFixture(page, 'invoices', { role: 'PW_EI_INVOICE_NO_MATCH', invoices: [{ ...supplierInvoice, status: 'approved' }] });
    await expect(invoiceRow(page).getByRole('button', { name: 'Mark matched' })).toBeDisabled();
    expect(called(calls, `/enterprise-inventory/supplier-invoices/${invoiceId}/match`, 'POST')).toHaveLength(0);
  });
  test('TEI-068 Invoice reader lacking invoices.mark_paid cannot initiate payment transition', async ({ page }) => {
    const { calls } = await openFixture(page, 'invoices', { role: 'PW_EI_INVOICE_NO_PAY', invoices: [{ ...supplierInvoice, status: 'matched' }] });
    await expect(invoiceRow(page).getByRole('button', { name: 'Mark paid' })).toBeDisabled();
    expect(called(calls, `/enterprise-inventory/supplier-invoices/${invoiceId}/pay`, 'POST')).toHaveLength(0);
  });
  test('TEI-069 Paid invoice does not expose cancellation or payment actions again', async ({ page }) => {
    await openFixture(page, 'invoices', { invoices: [{ ...supplierInvoice, status: 'paid', payment_reference: 'PW-PAY-123' }] });
    await expect(invoiceRow(page)).toContainText('PW-PAY-123');
    for (const action of ['Cancel', 'Mark paid', 'Edit', 'Submit']) await expect(invoiceRow(page).getByRole('button', { name: action })).toHaveCount(0);
  });
});

test.describe('Enterprise Inventory — Barcode labels (Batch 45 start)', () => {
  test('TEI-070 Label creation requires selected product and valid barcode symbology/value', async ({ page }) => {
    await openFixture(page, 'labels');
    const form = formAt(page, 'Create printable barcode label');
    await expect(form.getByRole('button', { name: 'Create label' })).toBeDisabled();
    await form.getByLabel('Product').selectOption(productId);
    await form.getByLabel('Barcode type').selectOption('EAN13');
    await form.getByLabel('Barcode value').fill('BAD-BARCODE');
    await expect(form.getByRole('button', { name: 'Create label' })).toBeDisabled();
    await form.getByLabel('Barcode value').fill('4006381333931');
    await expect(form.getByRole('button', { name: 'Create label' })).toBeEnabled();
  });
});

// Batch 46: remaining nine-tab Enterprise Inventory browser-visible behavior.
// Intercepted HTTP only exercises client state/requests, not persistence, tenant isolation or delivery.
const savedLabel = { id: 'pw-label-one', product_id: productId, product_name: product.name,
  product_unit: 'kg', barcode_value: '4006381333931', barcode_type: 'EAN13', label_template: 'compact',
  print_count: 1, created_at: at, lot_number: 'PW-LOT', batch_number: null, expiry_date: null };
const notification = { id: 'pw-event-1', event_type: 'approval_action', title: 'Fixture approved',
  severity: 'info', entity_type: 'supplier_invoice', created_at: at };
const delivery = { id: 'pw-delivery-1', notification_event_id: notification.id, event_type: notification.event_type,
  title: notification.title, channel: 'email', status: 'queued', recipient: 'disposable@example.invalid',
  attempts: 0, max_attempts: 3, created_at: at };
const attachment = { id: 'pw-file-one', entity_type: 'product', entity_id: productId,
  original_filename: 'fixture-proof.pdf', mime_type: 'application/pdf', file_size_bytes: 1250,
  created_at: at, storage_backend: 'legacy', can_download: false };

// Labels
 test.describe('Enterprise Inventory — labels, attachments and notifications (Batch 46)', () => {
  test('TEI-071 Preview follows template and shows normalized generated barcode', async ({ page }) => {
    await openFixture(page, 'labels');
    const form = formAt(page, 'Create printable barcode label');
    await form.getByLabel('Product').selectOption(productId);
    await form.getByLabel('Barcode value').fill('PW-CODE128-46');
    await form.getByLabel('Label template').selectOption('shelf');
    await expect(page.getByRole('img', { name: 'Printable barcode label preview' })).toBeVisible();
    await expect(formAt(page, 'Label preview')).toContainText('PW-CODE128-46');
  });
  test('TEI-072 Select all and deselect all update bulk print action', async ({ page }) => {
    await openFixture(page, 'labels', { barcodeLabels: [savedLabel, { ...savedLabel, id: 'pw-label-two', barcode_value: '4006381333948' }] });
    const all = page.getByRole('checkbox', { name: 'Select all barcode labels' });
    await expect(page.getByRole('button', { name: 'Print selected (0)' })).toBeDisabled();
    await all.check();
    await expect(page.getByRole('button', { name: 'Print selected (2)' })).toBeEnabled();
    await all.uncheck();
    await expect(page.getByRole('button', { name: 'Print selected (0)' })).toBeDisabled();
  });
  test('TEI-073 Pop-up blocked by browser does not record successful label print request', async ({ page }) => {
    const { calls } = await openFixture(page, 'labels', { barcodeLabels: [savedLabel] });
    await page.addInitScript(() => { window.open = () => null; });
    await page.reload();
    const dialog = page.waitForEvent('dialog');
    await page.getByRole('row').filter({ hasText: 'PW-LOT' }).getByRole('button', { name: 'Print', exact: true }).click();
    const alert = await dialog;
    expect(alert.message()).toContain('blocked the print window');
    await alert.accept();
    expect(calls.filter(c => c.method !== 'GET' && c.path.includes('barcode-label'))).toHaveLength(0);
  });
  test('TEI-074 Retire cancellation leaves saved label and sends no DELETE', async ({ page }) => {
    const { calls } = await openFixture(page, 'labels', { barcodeLabels: [savedLabel] });
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('row').filter({ hasText: savedLabel.barcode_value }).getByRole('button', { name: 'Retire' }).click();
    await expect(page.getByRole('row').filter({ hasText: savedLabel.barcode_value })).toBeVisible();
    expect(calls.filter(c => c.method === 'DELETE' && c.path.includes('barcode-label'))).toHaveLength(0);
  });
  test('TEI-075 Read-only label account can view saved labels but cannot select, print or retire', async ({ page }) => {
    await openFixture(page, 'labels', { role: 'PW_EI_LABEL_READ_ONLY', barcodeLabels: [savedLabel] });
    const row = page.getByRole('row').filter({ hasText: savedLabel.barcode_value });
    await expect(row.getByRole('button', { name: 'Print', exact: true })).toBeDisabled();
    await expect(row.getByRole('button', { name: 'Retire' })).toBeDisabled();
    await expect(page.getByRole('checkbox', { name: 'Select all barcode labels' })).toBeDisabled();
  });
  // Attachments
  test('TEI-076 Upload stays disabled until entity type, business record and real file are selected', async ({ page }) => {
    await openFixture(page, 'attachments');
    const form = formAt(page, 'Upload attachment');
    await expect(form.getByRole('button', { name: 'Upload file' })).toBeDisabled();
    await form.getByLabel('Attach to').selectOption('product');
    await form.getByLabel('Business record').selectOption(productId);
    await expect(form.getByRole('button', { name: 'Upload file' })).toBeDisabled();
    await expect(form.getByText('No file selected')).toBeVisible();
  });
  test('TEI-077 Attachment file input rejects a file larger than eight megabytes before upload', async ({ page }) => {
    await openFixture(page, 'attachments');
    const form = formAt(page, 'Upload attachment');
    await form.getByLabel('Attach to').selectOption('product');
    await form.getByLabel('Business record').selectOption(productId);
    await form.locator('input[type=file]').setInputFiles({ name: 'oversized.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
    await expect(form.getByText('Maximum attachment size is 8 MB.')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Upload file' })).toBeDisabled();
  });
  test('TEI-078 Metadata-only attachment cannot start a download', async ({ page }) => {
    await openFixture(page, 'attachments', { attachments: [attachment] });
    const form = formAt(page, 'Upload attachment');
    await form.getByLabel('Attach to').selectOption('product');
    await form.getByLabel('Business record').selectOption(productId);
    const row = page.getByRole('row').filter({ hasText: 'fixture-proof.pdf' });
    await expect(row.getByRole('button', { name: 'Metadata only' })).toBeDisabled();
    await expect(row).toContainText('Legacy metadata only');
  });
  test('TEI-079 Delete attachment cancellation leaves the row intact without DELETE', async ({ page }) => {
    const { calls } = await openFixture(page, 'attachments', { attachments: [attachment] });
    const form = formAt(page, 'Upload attachment');
    await form.getByLabel('Attach to').selectOption('product');
    await form.getByLabel('Business record').selectOption(productId);
    page.once('dialog', dialog => dialog.dismiss());
    await page.getByRole('row').filter({ hasText: 'fixture-proof.pdf' }).getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByRole('row').filter({ hasText: 'fixture-proof.pdf' })).toBeVisible();
    expect(calls.filter(c => c.method === 'DELETE' && c.path.includes('/attachments/'))).toHaveLength(0);
  });
  test('TEI-080 Archived business record retains attachment history but disables changes', async ({ page }) => {
    await openFixture(page, 'attachments', { attachments: [attachment],
      products: [], attachmentOptions: [{ id: productId, label: 'Archived fixture flour', archived: true }] });
    const form = formAt(page, 'Upload attachment');
    await form.getByLabel('Attach to').selectOption('product');
    await form.getByLabel('Business record').selectOption(productId);
    await expect(form.getByRole('button', { name: 'Upload file' })).toBeDisabled();
    await expect(page.getByText(/Archived records remain available for historical attachment review/)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'fixture-proof.pdf' }).getByRole('button', { name: 'Delete' })).toBeDisabled();
  });
  // Notifications
  test('TEI-081 Email and webhook queue require a recipient but in-app does not', async ({ page }) => {
    await openFixture(page, 'notifications', { notifications: [notification] });
    const form = formAt(page, 'Queue notification delivery');
    await form.getByLabel('Notification event').selectOption(notification.id);
    await form.getByLabel('Channel').selectOption('email');
    await expect(form.getByRole('button', { name: 'Queue delivery' })).toBeDisabled();
    await form.getByLabel('Recipient email').fill('disposable@example.invalid');
    await expect(form.getByRole('button', { name: 'Queue delivery' })).toBeEnabled();
    await form.getByLabel('Channel').selectOption('in_app');
    await expect(form.getByLabel('Recipient (optional)')).toBeDisabled();
    await expect(form.getByRole('button', { name: 'Queue delivery' })).toBeEnabled();
  });
  test('TEI-082 Notification event Next requests offset 50 independently of deliveries', async ({ page }) => {
    const { calls } = await openFixture(page, 'notifications', { notifications: [notification], notificationMore: true });
    await formAt(page, 'Notification events').getByRole('button', { name: 'Next' }).click();
    await expect.poll(() => calls.some(c => c.path === '/enterprise-inventory/notifications' && c.query.includes('offset=50'))).toBe(true);
    expect(calls.filter(c => c.path === '/enterprise-inventory/notifications/deliveries' && c.query.includes('offset=50'))).toHaveLength(0);
  });
  test('TEI-083 Delivery history Next requests offset 50 independently of event feed', async ({ page }) => {
    const { calls } = await openFixture(page, 'notifications', { notificationDeliveries: [delivery], deliveryMore: true });
    await formAt(page, 'Delivery history').getByRole('button', { name: 'Next' }).click();
    await expect.poll(() => calls.some(c => c.path === '/enterprise-inventory/notifications/deliveries' && c.query.includes('offset=50'))).toBe(true);
    expect(calls.filter(c => c.path === '/enterprise-inventory/notifications' && c.query.includes('offset=50'))).toHaveLength(0);
  });
  test('TEI-084 Notification read-only account sees event history but cannot queue delivery', async ({ page }) => {
    await openFixture(page, 'notifications', { role: 'PW_EI_NOTIFY_READ_ONLY', notifications: [notification] });
    const form = formAt(page, 'Queue notification delivery');
    await expect(form.getByRole('button', { name: 'Queue delivery' })).toBeDisabled();
    await expect(form.getByLabel('Notification event')).toBeDisabled();
    await expect(formAt(page, 'Notification events')).toContainText('Fixture approved');
  });
  test('TEI-085 Rejected notification queue operation reports an error without a delivered status', async ({ page }) => {
    const { calls } = await openFixture(page, 'notifications', { notifications: [notification],
      failWrite: '/enterprise-inventory/notifications/deliveries' });
    const form = formAt(page, 'Queue notification delivery');
    await form.getByLabel('Notification event').selectOption(notification.id);
    await form.getByLabel('Channel').selectOption('in_app');
    await form.getByRole('button', { name: 'Queue delivery' }).click();
    await expect.poll(() => called(calls, '/enterprise-inventory/notifications/deliveries', 'POST').length).toBe(1);
    await expect(page.getByText('Fixture validation rejected')).toBeVisible();
    await expect(formAt(page, 'Delivery history').getByText('Delivered')).toHaveCount(0);
  });
  test('TEI-086 Empty event and delivery datasets show different section-level empty messages', async ({ page }) => {
    await openFixture(page, 'notifications');
    await expect(formAt(page, 'Delivery history')).toContainText('No notification deliveries have been queued yet.');
    await expect(formAt(page, 'Notification events')).toContainText('No notification events yet.');
  });
 });

// Previously discovered source guards, not newly invented page routes.
 test.describe('Enterprise Inventory — extra lifecycle guards (Batch 46)', () => {
  test('TEI-087 Inactive par-level entry cannot create an execution task even with a location', async ({ page }) => {
    const { calls } = await openFixture(page, 'par-levels', { parLevels: [{ ...par, active: false }] });
    const btn = page.getByRole('row').filter({ hasText: product.name }).getByRole('button', { name: 'Create execution task' });
    await expect(btn).toBeDisabled();
    await expect(btn).toHaveAttribute('title', /Only an active par level/);
    expect(calls.filter(c => c.path.startsWith('/execution-tasks/from-par-level/') && c.method === 'POST')).toHaveLength(0);
  });
  test('TEI-088 Approved cycle count with missing trusted snapshot cannot reconcile', async ({ page }) => {
    const { calls } = await openFixture(page, 'cycle-counts', { cycleCounts: [{ ...cycle, status: 'approved', items: [{ ...evidence, snapshot_available: false }] }] });
    await expect(page.getByRole('row').filter({ hasText: 'Fixture inventory count' }).getByRole('button', { name: 'Reconcile' })).toBeDisabled();
    expect(calls.filter(c => c.path.includes('/cycle-counts/') && c.method !== 'GET')).toHaveLength(0);
  });
  test('TEI-089 Reject native supplier return Dispatch confirmation prevents lifecycle mutation', async ({ page }) => {
    const { calls } = await openFixture(page, 'supplier-returns', { supplierReturns: [{ ...supplierReturn, status: 'approved' }] });
    page.once('dialog', dialog => dialog.dismiss());
    await returnRow(page).getByRole('button', { name: 'Dispatch' }).click();
    await expect(returnRow(page)).toContainText('Approved');
    expect(calls.filter(c => c.method !== 'GET' && c.path.includes('/supplier-returns/'))).toHaveLength(0);
  });
 });
