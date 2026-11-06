import { test, expect, type Page } from '@playwright/test';
import { fulfillJson, loginAsTenant } from '../../../support/tenantSession';

// Batch 4 — /suppliers, source-grounded from frontend/src/pages/SuppliersPage.tsx,
// frontend/src/components/imports/InventoryCsvImportPanel.tsx,
// frontend/src/lib/supplierDirectoryUrl.ts and backend/src/routes/suppliers.js.
// GENERATION ONLY, NEVER EXECUTED. Use only a disposable test tenant. Every
// outgoing test mutation is intercepted with synthetic data, not sent to backend.
const syntheticSuppliers = [
  { id: 'pw-sup-01', name: 'Synthetic Harbor Foods', email: 'orders@synthetic.invalid',
    contact_info: 'Contact Marija', phone: '+385 51 000 111', tax_id: 'HR12345678901',
    address: 'Harbor Road 1, Rijeka', version: 2 },
  { id: 'pw-sup-02', name: 'Synthetic Alpine Goods', email: null,
    contact_info: null, phone: null, tax_id: null, address: null, version: 1 }
];
const syntheticBreaches = {
  rows: [{ supplier_id: 'pw-sup-01', supplier_name: 'Synthetic Harbor Foods',
    late_shipments: 2, earliest_missed_delivery: '2026-10-01',
    latest_missed_delivery: '2026-10-03' }], total: 1, notes: ['Synthetic delivery evidence']
};
const syntheticPerformance = {
  supplier_id: 'pw-sup-01', supplier_name: 'Synthetic Harbor Foods',
  metrics: { total_shipments: 5, pending_shipments: 2, received_shipments: 2,
    partial_shipments: 1, last_delivery_date: '2026-10-08' },
  notes: ['Synthetic shipment summary']
};

async function fixtureSuppliers(page: Page) {
  await page.route('**/suppliers', route => route.request().method() === 'GET'
    ? fulfillJson(route, syntheticSuppliers) : route.abort());
  await page.route('**/suppliers/sla-breaches', route => route.request().method() === 'GET'
    ? fulfillJson(route, syntheticBreaches) : route.abort());
  await page.route('**/suppliers/pw-sup-01/performance', route => fulfillJson(route, syntheticPerformance));
  await page.route('**/suppliers/pw-sup-02/performance', route => fulfillJson(route, {
    supplier_id: 'pw-sup-02', supplier_name: 'Synthetic Alpine Goods',
    metrics: { total_shipments: 0 }, notes: []
  }));
}

async function openSupplierWorkspace(page: Page, url = '/suppliers') {
  await loginAsTenant(page);
  await fixtureSuppliers(page);
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Supplier workspace' })).toBeVisible();
}
const directory = (page: Page) => page.locator('section').filter({
  has: page.getByRole('heading', { name: 'Supplier List' })
}).first();
const supplierRow = (page: Page, name = 'Synthetic Harbor Foods') => directory(page).getByRole('row').filter({ hasText: name });
const form = (page: Page) => page.locator('#supplier-form-panel');
const importPanel = (page: Page) => page.getByRole('region', { name: 'Bulk Supplier Import' });

// The following test groups are independently fixtures-backed, not dependent
// on prior test order, a production supplier, or application state changes.
test.describe('Suppliers — directory, search, selected supplier and errors', () => {
  test.beforeEach(async ({ page }) => { await openSupplierWorkspace(page); });

  test('TSUP-001 supplier workspace shows tenant-scoped supplier records and totals', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Supplier List' })).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toBeVisible();
    await expect(page.getByText('Active supplier records available to tenant workflows')).toBeVisible();
  });

  test('TSUP-002 empty optional contact fields show visible missing-value placeholders', async ({ page }) => {
    const row = supplierRow(page, 'Synthetic Alpine Goods');
    await expect(row.getByText('No email')).toBeVisible();
    await expect(row.getByText('No phone')).toBeVisible();
    await expect(row.getByText('No Tax/VAT ID')).toBeVisible();
    await expect(row.getByText('No contact notes')).toBeVisible();
  });

  test('TSUP-003 supplier name search narrows directory and persists search query', async ({ page }) => {
    await page.locator('#supplier-search').fill('Harbor');
    await expect(page).toHaveURL(/(?:\?|&)search=Harbor(?:&|$)/);
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toHaveCount(0);
  });

  test('TSUP-004 email lookup finds contact and does not show unmatched suppliers', async ({ page }) => {
    await page.locator('#supplier-search').fill('orders@synthetic.invalid');
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toHaveCount(0);
  });

  test('TSUP-005 searchable tax ID and address match supplier master data', async ({ page }) => {
    await page.locator('#supplier-search').fill('HR12345678901');
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toBeVisible();
    await page.locator('#supplier-search').fill('Harbor Road');
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toHaveCount(0);
  });

  test('TSUP-006 unmatched supplier search gives source-defined empty result', async ({ page }) => {
    await page.locator('#supplier-search').fill('no-synthetic-match');
    await expect(directory(page).getByText('No suppliers match the current search.')).toBeVisible();
  });

  test('TSUP-007 Clear Search removes search URL parameter and restores both suppliers', async ({ page }) => {
    await page.locator('#supplier-search').fill('Harbor');
    await page.getByRole('button', { name: 'Clear Search' }).click();
    await expect(page.locator('#supplier-search')).toHaveValue('');
    await expect(page).not.toHaveURL(/[?&]search=/);
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toBeVisible();
  });

  test('TSUP-008 exact supplier deep link shows selected supplier only', async ({ page }) => {
    await page.goto('/suppliers?supplier_id=pw-sup-02');
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Show all suppliers' })).toBeVisible();
  });

  test('TSUP-009 unknown supplier deep link provides unavailable state without exposing other rows', async ({ page }) => {
    await page.goto('/suppliers?supplier_id=pw-nonexistent');
    await expect(page.getByText('Selected supplier unavailable')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Show all suppliers' })).toBeVisible();
  });

  test('TSUP-010 Show all removes supplier_id and stale search query together', async ({ page }) => {
    await page.goto('/suppliers?supplier_id=pw-sup-01&search=obsolete');
    await page.getByRole('button', { name: 'Show all suppliers' }).click();
    await expect(page).not.toHaveURL(/[?&](supplier_id|search)=/);
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toBeVisible();
  });

  test('TSUP-011 reloading URL-scoped supplier search maintains filtered directory', async ({ page }) => {
    await page.locator('#supplier-search').fill('Alpine');
    await expect(page).toHaveURL(/(?:\?|&)search=Alpine(?:&|$)/);
    await page.reload();
    await expect(page.locator('#supplier-search')).toHaveValue('Alpine');
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toBeVisible();
  });

  test('TSUP-032 empty supplier directory distinguishes no records from no search matches', async ({ page }) => {
    await page.route('**/suppliers', route => fulfillJson(route, []));
    await page.reload();
    await expect(directory(page).getByText('No suppliers have been created yet.')).toBeVisible();
  });

  test('TSUP-033 suppliers API error shows error state, not stale synthetic records', async ({ page }) => {
    await page.route('**/suppliers', route => fulfillJson(route, { error: { message: 'Synthetic supplier API offline' } }, 503));
    await page.reload();
    await expect(page.getByText(/Failed to load suppliers: Synthetic supplier API offline/)).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toHaveCount(0);
  });
});

test.describe('Suppliers — create, update and archive (all writes stubbed)', () => {
  test.beforeEach(async ({ page }) => { await openSupplierWorkspace(page); });

  test('TSUP-012 Add supplier resets form after editing an existing supplier', async ({ page }) => {
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    await expect(form(page).locator('#supplier-name')).toHaveValue('Synthetic Harbor Foods');
    await page.getByRole('button', { name: 'Add supplier' }).click();
    await expect(form(page).locator('#supplier-name')).toHaveValue('');
    await expect(form(page).getByRole('heading', { name: 'Create Supplier' })).toBeVisible();
  });

  test('TSUP-013 required supplier name is blocked by HTML validity before POST', async ({ page }) => {
    let posts = 0;
    await page.route('**/suppliers', route => { if (route.request().method() === 'POST') posts++;
      return route.request().method() === 'GET' ? fulfillJson(route, syntheticSuppliers) : route.abort(); });
    const name = form(page).locator('#supplier-name');
    expect(await name.evaluate(el => (el as HTMLInputElement).validity.valueMissing)).toBe(true);
    await form(page).getByRole('button', { name: 'Create Supplier' }).click();
    expect(posts).toBe(0);
  });

  test('TSUP-014 malformed email fails browser validation without creating supplier', async ({ page }) => {
    let posts = 0;
    await page.route('**/suppliers', route => { if (route.request().method() === 'POST') posts++;
      return route.request().method() === 'GET' ? fulfillJson(route, syntheticSuppliers) : route.abort(); });
    await form(page).locator('#supplier-name').fill('Synthetic New Supplier');
    await form(page).locator('#supplier-email').fill('invalid-email');
    expect(await form(page).locator('#supplier-email').evaluate(el =>
      (el as HTMLInputElement).validity.typeMismatch)).toBe(true);
    await form(page).getByRole('button', { name: 'Create Supplier' }).click();
    expect(posts).toBe(0);
  });

  test('TSUP-015 creation normalizes whitespace, sends null optionals, then shows success', async ({ page }) => {
    let body: Record<string, unknown> | undefined;
    await page.route('**/suppliers', route => {
      if (route.request().method() !== 'POST') return fulfillJson(route, syntheticSuppliers);
      body = route.request().postDataJSON();
      return fulfillJson(route, { ...syntheticSuppliers[0], id: 'pw-new-15', name: 'Synthetic New Supplier', version: 1 }, 201);
    });
    await form(page).locator('#supplier-name').fill('  Synthetic New Supplier  ');
    await form(page).locator('#supplier-email').fill(' ');
    await form(page).getByRole('button', { name: 'Create Supplier' }).click();
    await expect(form(page).getByText('Supplier created successfully.')).toBeVisible();
    expect(body).toMatchObject({ name: 'Synthetic New Supplier', email: null,
      phone: null, contact_info: null, address: null, tax_id: null });
  });

  test('TSUP-016 duplicate supplier name shows server conflict without success feedback', async ({ page }) => {
    await page.route('**/suppliers', route => route.request().method() === 'POST'
      ? fulfillJson(route, { error: { message: 'Supplier name already exists' } }, 409)
      : fulfillJson(route, syntheticSuppliers));
    await form(page).locator('#supplier-name').fill('Synthetic Harbor Foods');
    await form(page).getByRole('button', { name: 'Create Supplier' }).click();
    await expect(form(page).getByText('Supplier name already exists')).toBeVisible();
    await expect(form(page).getByText('Supplier created successfully.')).toHaveCount(0);
  });

  test('TSUP-017 Edit loads original contact, VAT and address details into supplier form', async ({ page }) => {
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    await expect(form(page).getByRole('heading', { name: 'Edit Supplier' })).toBeVisible();
    await expect(form(page).locator('#supplier-name')).toHaveValue('Synthetic Harbor Foods');
    await expect(form(page).locator('#supplier-email')).toHaveValue('orders@synthetic.invalid');
    await expect(form(page).locator('#supplier-tax-id')).toHaveValue('HR12345678901');
    await expect(form(page).locator('#supplier-address')).toHaveValue('Harbor Road 1, Rijeka');
  });

  test('TSUP-018 Cancel edit restores create mode without sending PATCH', async ({ page }) => {
    let patches = 0;
    await page.route('**/suppliers/pw-sup-01', route => { if (route.request().method() === 'PATCH') patches++; return route.abort(); });
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    await form(page).locator('#supplier-name').fill('Accidental Edit');
    await form(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(form(page).getByRole('heading', { name: 'Create Supplier' })).toBeVisible();
    await expect(form(page).locator('#supplier-name')).toHaveValue('');
    expect(patches).toBe(0);
  });

  test('TSUP-019 supplier update PATCH has If-Match-Version and trimmed new values', async ({ page }) => {
    let payload: Record<string, unknown> | undefined;
    let version: string | null = null;
    await page.route('**/suppliers/pw-sup-01', route => {
      if (route.request().method() !== 'PATCH') return route.abort();
      payload = route.request().postDataJSON();
      version = route.request().headers()['if-match-version'] || null;
      return fulfillJson(route, { ...syntheticSuppliers[0], name: 'Synthetic Updated Harbor', version: 3 });
    });
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    await form(page).locator('#supplier-name').fill('  Synthetic Updated Harbor  ');
    await form(page).getByRole('button', { name: 'Update Supplier' }).click();
    await expect(form(page).getByText('Supplier updated successfully.')).toBeVisible();
    expect(version).toBe('2');
    expect(payload?.name).toBe('Synthetic Updated Harbor');
  });

  test('TSUP-020 stale-version update shows conflict and no false success message', async ({ page }) => {
    await page.route('**/suppliers/pw-sup-01', route => fulfillJson(route,
      { error: { code: 'VERSION_CONFLICT', message: 'Supplier was modified by another user' } }, 409));
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    await form(page).locator('#supplier-name').fill('Synthetic Conflict');
    await form(page).getByRole('button', { name: 'Update Supplier' }).click();
    await expect(form(page).getByText('Supplier was modified by another user')).toBeVisible();
    await expect(form(page).getByText('Supplier updated successfully.')).toHaveCount(0);
  });

  test('TSUP-021 decline archive leaves row and sends no DELETE', async ({ page }) => {
    let deletes = 0;
    await page.route('**/suppliers/pw-sup-01', route => { deletes++; return route.abort(); });
    page.once('dialog', dialog => dialog.dismiss());
    await supplierRow(page).getByRole('button', { name: 'Archive' }).click();
    await expect(supplierRow(page)).toBeVisible();
    expect(deletes).toBe(0);
  });

  test('TSUP-022 confirmed archive sends versioned DELETE and displays success', async ({ page }) => {
    let version: string | undefined;
    await page.route('**/suppliers/pw-sup-01', route => {
      if (route.request().method() !== 'DELETE') return route.abort();
      version = route.request().headers()['if-match-version'];
      return route.fulfill({ status: 204, body: '' });
    });
    page.once('dialog', dialog => dialog.accept());
    await supplierRow(page).getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('Supplier archived successfully.')).toBeVisible();
    expect(version).toBe('2');
  });

  test('TSUP-023 archive dependency rejection displays error and keeps supplier visible', async ({ page }) => {
    await page.route('**/suppliers/pw-sup-01', route => fulfillJson(route,
      { error: { message: 'Supplier has active product assignments' } }, 409));
    page.once('dialog', dialog => dialog.accept());
    await supplierRow(page).getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('Supplier has active product assignments')).toBeVisible();
    await expect(supplierRow(page)).toBeVisible();
  });
});

test.describe('Suppliers — shipment performance, SLA and section refresh', () => {
  test.beforeEach(async ({ page }) => { await openSupplierWorkspace(page); });

  test('TSUP-024 View performance loads supplier-scoped metrics and closes on demand', async ({ page }) => {
    await supplierRow(page).getByRole('button', { name: 'View performance' }).click();
    const panel = page.locator('#supplier-performance-panel');
    await expect(panel.getByRole('heading', { name: /Supplier Performance:.*Synthetic Harbor Foods/ })).toBeVisible();
    await expect(panel.getByText('Synthetic shipment summary')).toBeVisible();
    await expect(panel.getByText('Shipments fully received')).toBeVisible();
    await panel.getByRole('button', { name: 'Close' }).click();
    await expect(panel).toHaveCount(0);
  });

  test('TSUP-025 failed supplier performance load produces panel-local error', async ({ page }) => {
    await page.route('**/suppliers/pw-sup-01/performance', route => fulfillJson(route,
      { error: { message: 'Synthetic performance unavailable' } }, 503));
    await supplierRow(page).getByRole('button', { name: 'View performance' }).click();
    await expect(page.locator('#supplier-performance-panel').getByText(
      /Failed to load supplier performance: Synthetic performance unavailable/)).toBeVisible();
  });

  test('TSUP-026 delivery SLA row shows overdue count and opens its supplier performance', async ({ page }) => {
    const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Delivery Follow-up' }) }).first();
    const row = section.getByRole('row').filter({ hasText: 'Synthetic Harbor Foods' });
    await expect(row.getByText('2')).toBeVisible();
    await row.getByRole('button', { name: 'View performance' }).click();
    await expect(page.locator('#supplier-performance-panel')).toBeVisible();
  });

  test('TSUP-027 Refresh Suppliers issues a fresh GET and presents explicit feedback', async ({ page }) => {
    let reads = 0;
    await page.route('**/suppliers', route => { reads++; return fulfillJson(route, syntheticSuppliers); });
    await directory(page).getByRole('button', { name: 'Refresh Suppliers' }).click();
    await expect(directory(page).getByRole('status').getByText('Supplier list refreshed successfully.')).toBeVisible();
    expect(reads).toBeGreaterThanOrEqual(1);
  });

  test('TSUP-028 Refresh delivery status issues fresh SLA request and success status', async ({ page }) => {
    let reads = 0;
    await page.route('**/suppliers/sla-breaches', route => { reads++; return fulfillJson(route, syntheticBreaches); });
    await page.getByRole('button', { name: 'Refresh delivery status' }).click();
    await expect(page.getByRole('status').getByText('Delivery status refreshed successfully.')).toBeVisible();
    expect(reads).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Suppliers — bulk import and permissions', () => {
  test.beforeEach(async ({ page }) => { await openSupplierWorkspace(page); });

  test('TSUP-029 bulk supplier import template downloads source-defined columns', async ({ page }) => {
    const event = page.waitForEvent('download');
    await importPanel(page).getByRole('button', { name: 'Download CSV Template' }).click();
    expect((await event).suggestedFilename()).toBe('suppliers-import-template.csv');
  });

  test('TSUP-030 non-CSV supplier import file is rejected before validation or commit', async ({ page }) => {
    let requests = 0;
    await page.route('**/inventory-imports/**', route => { requests++; return route.abort(); });
    await importPanel(page).locator('input[type="file"]').setInputFiles({
      name: 'not-a-csv.txt', mimeType: 'text/plain', buffer: Buffer.from('not a CSV')
    });
    await expect(importPanel(page).getByText('Choose a CSV file.')).toBeVisible();
    await expect(importPanel(page).getByRole('button', { name: 'Validate CSV' })).toBeDisabled();
    expect(requests).toBe(0);
  });

  test('TSUP-031 no suppliers.write leaves directory readable but removes write forms and imports', async ({ page }) => {
    const permissions = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me', route => fulfillJson(route, {
      ...permissions, scope: 'tenant', permissions: ['dashboard.read', 'suppliers.read', 'shipments.read']
    }));
    await page.reload();
    await expect(supplierRow(page)).toBeVisible();
    await expect(page.getByText(/Creating, editing, archiving, and bulk importing suppliers requires suppliers.write permission/)).toBeVisible();
    await expect(form(page)).toHaveCount(0);
    await expect(importPanel(page)).toHaveCount(0);
    await expect(supplierRow(page).getByRole('button', { name: 'Archive' })).toHaveCount(0);
  });
});

// Batch 5 — TSUP-034…048: source-traced import commit boundaries,
// refresh/concurrency, shipment permission split and delivery empty/error states.
const supplierCsv = 'name,email,contact_info,phone,address,tax_id\nSynthetic CSV Wholesale,orders@csv.invalid,Buyer,555,Rijeka,HR12345678901\n';
const validSupplierPreview = {
  id: 'pw-supplier-import-01', tenant_id: 'pw-tenant', import_type: 'suppliers',
  status: 'validated', source_filename: 'synthetic-suppliers.csv', row_count: 1,
  valid_row_count: 1, invalid_row_count: 0,
  normalized_rows: [{ name: 'Synthetic CSV Wholesale' }], validation_errors: [], version: 4
};
async function selectSupplierCsv(page: Page, text = supplierCsv) {
  await importPanel(page).locator('input[type="file"]').setInputFiles({
    name: 'synthetic-suppliers.csv', mimeType: 'text/csv', buffer: Buffer.from(text)
  });
}
async function validatedSupplierImport(page: Page) {
  await page.route('**/inventory-imports/preview', route => {
    if (route.request().method() !== 'POST') return route.abort();
    return fulfillJson(route, validSupplierPreview);
  });
  await selectSupplierCsv(page);
  await importPanel(page).getByRole('button', { name: 'Validate CSV' }).click();
  await expect(importPanel(page).getByText('Validation passed for all 1 rows. No inventory data has changed yet.')).toBeVisible();
}

test.describe('Suppliers — CSV staging, confirmation, and validation limits (Batch 5)', () => {
  test.beforeEach(async ({ page }) => { await openSupplierWorkspace(page); });

  test('TSUP-034 CSV preview submits normalized supplier rows but never commits tenant data', async ({ page }) => {
    let previewBody: Record<string, unknown> | undefined;
    let commitAttempts = 0;
    await page.route('**/inventory-imports/**/commit', route => { commitAttempts++; return route.abort(); });
    await page.route('**/inventory-imports/preview', route => {
      previewBody = route.request().postDataJSON();
      return fulfillJson(route, validSupplierPreview);
    });
    await selectSupplierCsv(page);
    await importPanel(page).getByRole('button', { name: 'Validate CSV' }).click();
    await expect(importPanel(page).getByText(/Validation passed for all 1 rows.*No inventory data has changed yet/)).toBeVisible();
    await expect(importPanel(page).getByRole('button', { name: 'Commit Validated Import' })).toBeEnabled();
    expect(previewBody?.import_type).toBe('suppliers');
    expect(previewBody?.source_filename).toBe('synthetic-suppliers.csv');
    expect(previewBody?.rows).toEqual([{
      name: 'Synthetic CSV Wholesale', email: 'orders@csv.invalid', contact_info: 'Buyer',
      phone: '555', address: 'Rijeka', tax_id: 'HR12345678901'
    }]);
    expect(commitAttempts).toBe(0);
  });

  test('TSUP-035 invalid server preview displays row-level validation and exports a CSV without commit', async ({ page }) => {
    let commitAttempts = 0;
    await page.route('**/inventory-imports/**/commit', route => { commitAttempts++; return route.abort(); });
    await page.route('**/inventory-imports/preview', route => fulfillJson(route, {
      ...validSupplierPreview, status: 'invalid', valid_row_count: 0, invalid_row_count: 1,
      validation_errors: [{ row_number: 2, field: 'name', code: 'DUPLICATE', message: 'Supplier name already exists' }]
    }));
    await selectSupplierCsv(page);
    await importPanel(page).getByRole('button', { name: 'Validate CSV' }).click();
    await expect(importPanel(page).getByText(/Validation found 1 invalid row/)).toBeVisible();
    await expect(importPanel(page).getByRole('row').filter({ hasText: 'Supplier name already exists' })).toBeVisible();
    await expect(importPanel(page).getByRole('button', { name: 'Commit Validated Import' })).toBeDisabled();
    const downloadPromise = page.waitForEvent('download');
    await importPanel(page).getByRole('button', { name: 'Download Validation Errors' }).click();
    expect((await downloadPromise).suggestedFilename()).toBe('suppliers-validation-errors.csv');
    expect(commitAttempts).toBe(0);
  });

  test('TSUP-036 cancelling browser confirmation keeps validated preview and sends no commit', async ({ page }) => {
    let commitAttempts = 0;
    await page.route('**/inventory-imports/**/commit', route => { commitAttempts++; return route.abort(); });
    await validatedSupplierImport(page);
    page.once('dialog', dialog => dialog.dismiss());
    await importPanel(page).getByRole('button', { name: 'Commit Validated Import' }).click();
    await expect(importPanel(page).getByRole('button', { name: 'Commit Validated Import' })).toBeEnabled();
    expect(commitAttempts).toBe(0);
  });

  test('TSUP-037 confirmed supplier import uses current version and reports commit/refetch', async ({ page }) => {
    let submittedVersion: string | undefined;
    let commitBody: unknown;
    let commits = 0;
    await validatedSupplierImport(page);
    await page.route('**/inventory-imports/pw-supplier-import-01/commit', route => {
      commits++;
      submittedVersion = route.request().headers()['if-match-version'];
      commitBody = route.request().postDataJSON();
      return fulfillJson(route, { ...validSupplierPreview, status: 'committed', version: 5, result_summary: { created: 1 } });
    });
    page.once('dialog', dialog => dialog.accept());
    await importPanel(page).getByRole('button', { name: 'Commit Validated Import' }).click();
    await expect(importPanel(page).getByText('Import committed successfully.')).toBeVisible();
    await expect(importPanel(page).getByRole('button', { name: 'Commit Validated Import' })).toBeDisabled();
    expect(submittedVersion).toBe('4');
    expect(commitBody).toEqual({});
    expect(commits).toBe(1);
  });

  test('TSUP-038 a 2001-data-row CSV is rejected locally before any preview request', async ({ page }) => {
    let requests = 0;
    await page.route('**/inventory-imports/**', route => { requests++; return route.abort(); });
    const overLimit = `name,email\n${Array.from({ length: 2001 }, (_, i) => `Synthetic Supplier ${i},test${i}@csv.invalid`).join('\n')}\n`;
    await selectSupplierCsv(page, overLimit);
    await expect(importPanel(page).getByText('CSV cannot contain more than 2,000 data rows.')).toBeVisible();
    await expect(importPanel(page).getByRole('button', { name: 'Validate CSV' })).toBeDisabled();
    expect(requests).toBe(0);
  });
});

test.describe('Suppliers — refresh, concurrency and delivery edge cases (Batch 5)', () => {
  test.beforeEach(async ({ page }) => { await openSupplierWorkspace(page); });

  test('TSUP-039 Refresh Performance refetches selected supplier and gives scoped success', async ({ page }) => {
    let loads = 0;
    await page.route('**/suppliers/pw-sup-01/performance', route => {
      loads++;
      return fulfillJson(route, syntheticPerformance);
    });
    await supplierRow(page).getByRole('button', { name: 'View performance' }).click();
    await expect(page.locator('#supplier-performance-panel').getByText('Synthetic shipment summary')).toBeVisible();
    const previous = loads;
    await page.locator('#supplier-performance-panel').getByRole('button', { name: 'Refresh Performance' }).click();
    await expect(page.locator('#supplier-performance-panel').getByRole('status').getByText('Supplier performance refreshed successfully.')).toBeVisible();
    expect(loads).toBeGreaterThan(previous);
  });

  test('TSUP-040 failed performance refresh uses error feedback without false success', async ({ page }) => {
    await supplierRow(page).getByRole('button', { name: 'View performance' }).click();
    await expect(page.locator('#supplier-performance-panel').getByText('Synthetic shipment summary')).toBeVisible();
    await page.route('**/suppliers/pw-sup-01/performance', route => fulfillJson(route,
      { error: { message: 'Synthetic refresh failure' } }, 503));
    await page.locator('#supplier-performance-panel').getByRole('button', { name: 'Refresh Performance' }).click();
    await expect(page.locator('#supplier-performance-panel').getByRole('alert').getByText('Could not refresh supplier performance.')).toBeVisible();
    await expect(page.locator('#supplier-performance-panel').getByText('Supplier performance refreshed successfully.')).toHaveCount(0);
  });

  test('TSUP-041 changed source version while editing closes stale edit form with warning', async ({ page }) => {
    let currentSuppliers = syntheticSuppliers;
    await page.route('**/suppliers', route => route.request().method() === 'GET'
      ? fulfillJson(route, currentSuppliers) : route.abort());
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    await expect(form(page).getByRole('heading', { name: 'Edit Supplier' })).toBeVisible();
    currentSuppliers = [{ ...syntheticSuppliers[0], version: 9 }, syntheticSuppliers[1]];
    await directory(page).getByRole('button', { name: 'Refresh Suppliers' }).click();
    await expect(form(page).getByRole('heading', { name: 'Create Supplier' })).toBeVisible();
    await expect(form(page).getByText(/This supplier changed while you were editing it/)).toBeVisible();
  });

  test('TSUP-042 refreshing directory updates an open supplier performance identity', async ({ page }) => {
    let currentSuppliers = syntheticSuppliers;
    await page.route('**/suppliers', route => route.request().method() === 'GET'
      ? fulfillJson(route, currentSuppliers) : route.abort());
    await supplierRow(page).getByRole('button', { name: 'View performance' }).click();
    await expect(page.locator('#supplier-performance-panel').getByRole('heading', { name: /Synthetic Harbor Foods/ })).toBeVisible();
    currentSuppliers = [{ ...syntheticSuppliers[0], name: 'Synthetic Renamed Harbor', version: 3 }, syntheticSuppliers[1]];
    await directory(page).getByRole('button', { name: 'Refresh Suppliers' }).click();
    await expect(page.locator('#supplier-performance-panel').getByRole('heading', { name: /Synthetic Renamed Harbor/ })).toBeVisible();
  });

  test('TSUP-043 missing shipments.read hides performance actions while supplier master remains visible', async ({ page }) => {
    const effective = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me', route => fulfillJson(route, {
      ...effective, scope: 'tenant', permissions: ['dashboard.read', 'suppliers.read', 'suppliers.write']
    }));
    await page.reload();
    await expect(supplierRow(page)).toBeVisible();
    await expect(page.getByText('Shipment performance unavailable for your current permissions')).toBeVisible();
    await expect(supplierRow(page).getByRole('button', { name: 'View performance' })).toHaveCount(0);
    await expect(page.locator('#supplier-performance-panel')).toHaveCount(0);
  });

  test('TSUP-044 archiving supplier currently being edited closes edit without retaining stale values', async ({ page }) => {
    await page.route('**/suppliers/pw-sup-01', route => route.request().method() === 'DELETE'
      ? route.fulfill({ status: 204, body: '' }) : route.abort());
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    await expect(form(page).getByRole('heading', { name: 'Edit Supplier' })).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    await supplierRow(page).getByRole('button', { name: 'Archive' }).click();
    await expect(page.getByText('Supplier archived successfully.')).toBeVisible();
    await expect(form(page).getByRole('heading', { name: 'Create Supplier' })).toBeVisible();
    await expect(form(page).locator('#supplier-name')).toHaveValue('');
  });

  test('TSUP-045 supplier without shipment history displays meaningful empty performance note', async ({ page }) => {
    await supplierRow(page, 'Synthetic Alpine Goods').getByRole('button', { name: 'View performance' }).click();
    await expect(page.locator('#supplier-performance-panel').getByText('No shipments are linked to this supplier yet. Performance figures will appear after the supplier is used on a shipment.')).toBeVisible();
    await expect(page.locator('#supplier-performance-panel').getByText('Total Shipments')).toBeVisible();
  });

  test('TSUP-046 changing supplier search clears the previously selected supplier deep-link', async ({ page }) => {
    await page.goto('/suppliers?supplier_id=pw-sup-01');
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toHaveCount(0);
    await page.locator('#supplier-search').fill('Alpine');
    await expect(page).not.toHaveURL(/[?&]supplier_id=/);
    await expect(page).toHaveURL(/(?:[?&])search=Alpine(?:&|$)/);
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toBeVisible();
  });

  test('TSUP-047 no late shipment records produces the explicit follow-up empty state', async ({ page }) => {
    await page.route('**/suppliers/sla-breaches', route => fulfillJson(route, { rows: [], total: 0, notes: [] }));
    await page.reload();
    await expect(page.getByText('No late pending or partially received supplier shipments were found.')).toBeVisible();
    await expect(page.locator('section').filter({ has: page.getByRole('heading', { name: 'Delivery Follow-up' }) })
      .getByRole('button', { name: 'View performance' })).toHaveCount(0);
  });

  test('TSUP-048 failed SLA load exposes explicit error and unknown late count', async ({ page }) => {
    await page.route('**/suppliers/sla-breaches', route => fulfillJson(route,
      { error: { message: 'Synthetic SLA outage' } }, 503));
    await page.reload();
    await expect(page.getByText(/Failed to load supplier SLA breaches:.*Synthetic SLA outage/)).toBeVisible();
    await expect(page.getByText('Delivery status could not be loaded')).toBeVisible();
    await expect(page.getByText('No late pending or partially received supplier shipments were found.')).toHaveCount(0);
  });
});

// Batch 172 — source-anchored Supplier directory, optional-field and delivery evidence boundaries.
// Static generation only: these tests use synthetic browser intercepts and have NOT been executed.
test.describe('Suppliers — source-backed directory, form and delivery boundaries (Batch 172)', () => {
  test.beforeEach(async ({ page }) => { await openSupplierWorkspace(page); });

  test('TSUP-049 supplier email renders a mailto link without a navigation side effect', async ({ page }) => {
    await expect(supplierRow(page).getByRole('link', { name: 'orders@synthetic.invalid' }))
      .toHaveAttribute('href', 'mailto:orders@synthetic.invalid');
  });

  test('TSUP-050 case-insensitive supplier name search preserves matching rows', async ({ page }) => {
    await page.locator('#supplier-search').fill('hArBoR');
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toHaveCount(0);
  });

  test('TSUP-051 contact-notes search matches a supplier independently of name and email', async ({ page }) => {
    await page.locator('#supplier-search').fill('Marija');
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toHaveCount(0);
  });

  test('TSUP-052 phone substring search matches supplier contact details', async ({ page }) => {
    await page.locator('#supplier-search').fill('000 111');
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toHaveCount(0);
  });

  test('TSUP-053 whitespace-only supplier search does not constrain directory or retain URL search', async ({ page }) => {
    await page.locator('#supplier-search').fill('     ');
    await expect(supplierRow(page, 'Synthetic Harbor Foods')).toBeVisible();
    await expect(supplierRow(page, 'Synthetic Alpine Goods')).toBeVisible();
    await expect(page).not.toHaveURL(/[?&]search=/);
  });

  test('TSUP-054 supplier name-prefix matches sort ahead of name-substring matches', async ({ page }) => {
    await page.route('**/suppliers', route => route.request().method() === 'GET'
      ? fulfillJson(route, [syntheticSuppliers[0], { ...syntheticSuppliers[1], name: 'Harborline Wholesale' }])
      : route.abort());
    await page.reload();
    await page.locator('#supplier-search').fill('Harbor');
    await expect(directory(page).locator('tbody tr').first()).toContainText('Harborline Wholesale');
    await expect(directory(page).locator('tbody tr').nth(1)).toContainText('Synthetic Harbor Foods');
  });

  test('TSUP-055 supplier form inputs expose all source-defined maximum lengths', async ({ page }) => {
    const limits: Array<[string, string]> = [
      ['#supplier-name', '255'], ['#supplier-email', '255'],
      ['#supplier-contact-info', '1000'], ['#supplier-phone', '100'],
      ['#supplier-tax-id', '100'], ['#supplier-address', '2000']
    ];
    for (const [selector, limit] of limits) {
      await expect(form(page).locator(selector)).toHaveAttribute('maxlength', limit);
    }
  });

  test('TSUP-056 clearing optional values in an update sends null rather than empty strings', async ({ page }) => {
    let payload: Record<string, unknown> | undefined;
    await page.route('**/suppliers/pw-sup-01', route => {
      if (route.request().method() !== 'PATCH') return route.abort();
      payload = route.request().postDataJSON();
      return fulfillJson(route, { ...syntheticSuppliers[0], email: null, contact_info: null,
        phone: null, tax_id: null, address: null, version: 3 });
    });
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    for (const selector of ['#supplier-email', '#supplier-contact-info', '#supplier-phone', '#supplier-tax-id', '#supplier-address']) {
      await form(page).locator(selector).fill(' ');
    }
    await form(page).getByRole('button', { name: 'Update Supplier' }).click();
    await expect(form(page).getByText('Supplier updated successfully.')).toBeVisible();
    expect(payload).toMatchObject({ email: null, contact_info: null, phone: null, tax_id: null, address: null });
  });

  test('TSUP-057 cancelling an edit after a failed PATCH clears its stale error', async ({ page }) => {
    await page.route('**/suppliers/pw-sup-01', route => fulfillJson(route,
      { error: { message: 'Synthetic edit rejected' } }, 422));
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    await form(page).locator('#supplier-name').fill('Changed Supplier Name');
    await form(page).getByRole('button', { name: 'Update Supplier' }).click();
    await expect(form(page).getByText('Synthetic edit rejected')).toBeVisible();
    await form(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(form(page).getByRole('heading', { name: 'Create Supplier' })).toBeVisible();
    await expect(form(page).getByText('Synthetic edit rejected')).toHaveCount(0);
  });

  test('TSUP-058 disappearing supplier during refresh closes an in-progress edit', async ({ page }) => {
    let data = syntheticSuppliers;
    await page.route('**/suppliers', route => route.request().method() === 'GET'
      ? fulfillJson(route, data) : route.abort());
    await supplierRow(page).getByRole('button', { name: 'Edit' }).click();
    data = [syntheticSuppliers[1]];
    await directory(page).getByRole('button', { name: 'Refresh Suppliers' }).click();
    await expect(form(page).getByRole('heading', { name: 'Create Supplier' })).toBeVisible();
    await expect(form(page).getByText(/This supplier is no longer available/)).toBeVisible();
  });

  test('TSUP-059 disappearing supplier during refresh closes a stale performance panel', async ({ page }) => {
    let data = syntheticSuppliers;
    await page.route('**/suppliers', route => route.request().method() === 'GET'
      ? fulfillJson(route, data) : route.abort());
    await supplierRow(page).getByRole('button', { name: 'View performance' }).click();
    await expect(page.locator('#supplier-performance-panel')).toBeVisible();
    data = [syntheticSuppliers[1]];
    await directory(page).getByRole('button', { name: 'Refresh Suppliers' }).click();
    await expect(page.locator('#supplier-performance-panel')).toHaveCount(0);
  });

  test('TSUP-060 missing supplier identity in performance view is explicitly marked not recorded', async ({ page }) => {
    await supplierRow(page, 'Synthetic Alpine Goods').getByRole('button', { name: 'View performance' }).click();
    await expect(page.locator('#supplier-performance-panel').getByText('Not recorded', { exact: true })).toHaveCount(5);
  });

  test('TSUP-061 numeric-string shipment metrics are converted to numbers for display', async ({ page }) => {
    await page.route('**/suppliers/pw-sup-01/performance', route => fulfillJson(route, {
      ...syntheticPerformance,
      metrics: { total_shipments: '7', received_shipments: '4', pending_shipments: '2', partial_shipments: '1' },
      notes: ['Numeric-string conversion fixture']
    }));
    await supplierRow(page).getByRole('button', { name: 'View performance' }).click();
    const panel = page.locator('#supplier-performance-panel');
    await expect(panel.getByText('Numeric-string conversion fixture')).toBeVisible();
    await expect(panel.getByText('7', { exact: true })).toBeVisible();
    await expect(panel.getByText('4', { exact: true })).toBeVisible();
  });

  test('TSUP-062 malformed supplier metric values degrade to the zero-shipment empty state', async ({ page }) => {
    await page.route('**/suppliers/pw-sup-01/performance', route => fulfillJson(route, {
      ...syntheticPerformance, metrics: { total_shipments: 'n/a', received_shipments: null, pending_shipments: -0 }, notes: []
    }));
    await supplierRow(page).getByRole('button', { name: 'View performance' }).click();
    await expect(page.locator('#supplier-performance-panel').getByText(/No shipments are linked to this supplier yet/)).toBeVisible();
  });

  test('TSUP-063 legacy flat-array SLA payload still renders delivery follow-up rows', async ({ page }) => {
    await page.route('**/suppliers/sla-breaches', route => fulfillJson(route, [
      { supplier_id: 'pw-sup-01', supplier_name: 'Synthetic Harbor Foods', late_shipments: '3' }
    ]));
    await page.reload();
    await expect(supplierRow(page).getByText('3 late')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Delivery Follow-up' })).toBeVisible();
  });

  test('TSUP-064 row-level days-late evidence counts as one late shipment without aggregate', async ({ page }) => {
    await page.route('**/suppliers/sla-breaches', route => fulfillJson(route, {
      rows: [{ supplier_id: 'pw-sup-01', supplier_name: 'Synthetic Harbor Foods', shipment_id: 'synthetic-shipment-64', days_late: 2 }],
      total: 1, notes: []
    }));
    await page.reload();
    await expect(supplierRow(page).getByText('1 late')).toBeVisible();
  });

  test('TSUP-065 an orphaned SLA supplier never exposes a performance navigation action', async ({ page }) => {
    await page.route('**/suppliers/sla-breaches', route => fulfillJson(route, {
      rows: [{ supplier_id: 'unknown-supplier-65', supplier_name: 'Orphan Delivery Source', late_shipments: 1 }],
      total: 1, notes: []
    }));
    await page.reload();
    const row = page.getByRole('row').filter({ hasText: 'Orphan Delivery Source' });
    await expect(row.getByText('Unavailable')).toBeVisible();
    await expect(row.getByRole('button', { name: 'View performance' })).toHaveCount(0);
  });

  test('TSUP-066 missing overdue dates render explicit dashes instead of invented dates', async ({ page }) => {
    await page.route('**/suppliers/sla-breaches', route => fulfillJson(route, {
      rows: [{ supplier_id: 'pw-sup-01', supplier_name: 'Synthetic Harbor Foods', late_shipments: 1 }], total: 1, notes: []
    }));
    await page.reload();
    const row = page.getByRole('row').filter({ hasText: 'Delivery follow-up required' });
    await expect(row.locator('td').nth(2)).toHaveText('-');
    await expect(row.locator('td').nth(3)).toHaveText('-');
  });

  test('TSUP-067 the displayed filtered count differentiates search results from all suppliers', async ({ page }) => {
    await page.locator('#supplier-search').fill('Alpine');
    await expect(directory(page).getByText('1 of 2 suppliers match.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear Search' }).click();
    await expect(directory(page).getByText('2 suppliers shown.')).toBeVisible();
  });

  test('TSUP-068 supplier archive dialog describes outstanding dependency safeguards', async ({ page }) => {
    let text = '';
    page.once('dialog', async dialog => { text = dialog.message(); await dialog.dismiss(); });
    await supplierRow(page).getByRole('button', { name: 'Archive' }).click();
    expect(text).toContain('open shipments');
    expect(text).toContain('active purchase orders');
    expect(text).toContain('Historical received shipments');
    await expect(supplierRow(page)).toBeVisible();
  });

  test('TSUP-069 explicit failed supplier refresh shows scoped error rather than success', async ({ page }) => {
    await page.route('**/suppliers', route => fulfillJson(route,
      { error: { message: 'Temporary supplier refresh outage' } }, 503));
    await directory(page).getByRole('button', { name: 'Refresh Suppliers' }).click();
    await expect(directory(page).getByRole('alert').getByText('Could not refresh supplier list.')).toBeVisible();
    await expect(directory(page).getByText('Supplier list refreshed successfully.')).toHaveCount(0);
  });

  test('TSUP-070 explicit failed delivery refresh shows scoped error rather than success', async ({ page }) => {
    await page.route('**/suppliers/sla-breaches', route => fulfillJson(route,
      { error: { message: 'Temporary delivery refresh outage' } }, 503));
    const followUp = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Delivery Follow-up' }) });
    await followUp.getByRole('button', { name: 'Refresh delivery status' }).click();
    await expect(followUp.getByRole('alert').getByText('Could not refresh delivery status.')).toBeVisible();
    await expect(followUp.getByText('Delivery status refreshed successfully.')).toHaveCount(0);
  });
});
