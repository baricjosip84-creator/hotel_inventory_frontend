import { test, expect, type Page, type Route } from '../../../support/liveOriginalSafeTest';
import { fulfillJson, loginAsTenant } from '../../../support/tenantSession';

// First Products-page batch. Source:
// frontend/src/pages/ProductsPage.tsx; products/ProductPageContent.tsx;
// products/useProductPageState.ts; products/useProductPageQueries.ts;
// products/productCoreApi.ts; products/ProductListFiltersPanel.tsx;
// products/ProductListTablePanel.tsx; products/ProductFormPanel.tsx;
// products/ArchivedProductsPanel.tsx; frontend/src/lib/permissionPolicies.ts.
// Browser tests GENERATED_UNRUN; no tests or app were executed.

const testProducts = [
  { id: 'pw-prod-01', tenant_id: 'pw-tenant', sku: 'PW-COFFEE-01', name: 'Synthetic Coffee Beans',
    category: 'Beverages', unit: 'kg', min_stock: 10, supplier_id: 'pw-supplier-01',
    supplier_name: 'Synthetic Supplier A', barcode: 'PW-BC-1001', package_barcodes: ['PW-PACK-1001'],
    requires_lot_tracking: true, requires_expiry_date: false, current_stock_quantity: 3,
    effective_unit_cost: 18, effective_cost_source: 'landed_cost', estimated_inventory_value: 54,
    cost_variance_status: 'matched', created_at: '2026-10-01T10:00:00Z', version: 1 },
  { id: 'pw-prod-02', tenant_id: 'pw-tenant', sku: 'PW-SUGAR-02', name: 'Synthetic Sugar Packets',
    category: 'Pantry', unit: 'box', min_stock: 0, supplier_id: null, supplier_name: null,
    barcode: 'PW-BC-1002', requires_lot_tracking: false, requires_expiry_date: false,
    current_stock_quantity: 45, effective_unit_cost: null, estimated_inventory_value: 0,
    cost_variance_status: 'no_received', created_at: '2026-10-01T10:00:00Z', version: 2 },
  { id: 'pw-prod-03', tenant_id: 'pw-tenant', sku: 'PW-TEA-03', name: 'Synthetic Tea Leaves',
    category: 'Beverages', unit: 'kg', min_stock: 2, supplier_id: 'pw-supplier-02',
    supplier_name: 'Synthetic Supplier B', barcode: null, requires_lot_tracking: false,
    requires_expiry_date: true, current_stock_quantity: 15, effective_unit_cost: null,
    estimated_inventory_value: 0, cost_variance_status: 'no_standard',
    created_at: '2026-10-01T10:00:00Z', version: 1 }
];

const testSuppliers = [
  { id: 'pw-supplier-01', name: 'Synthetic Supplier A', tenant_id: 'pw-tenant' },
  { id: 'pw-supplier-02', name: 'Synthetic Supplier B', tenant_id: 'pw-tenant' }
];

// A glob like '**/products' also matches the frontend DOCUMENT navigation to
// /products. Only mock background API reads; never replace the app HTML with JSON.
const isApiGet = (route: Route) => route.request().method() === 'GET'
  && (route.request().resourceType() === 'fetch' || route.request().resourceType() === 'xhr');

async function fixtureProducts(page: Page) {
  await page.route('**/products', (route) => {
    if (!isApiGet(route)) return route.continue();
    return fulfillJson(route, testProducts);
  });
  await page.route('**/products?*', (route) => {
    if (!isApiGet(route)) return route.continue();
    const url = new URL(route.request().url());
    const category = url.searchParams.get('category');
    const supplier = url.searchParams.get('supplier_id');
    const costStatus = url.searchParams.get('cost_status');
    const costBasis = url.searchParams.get('cost_basis');
    const costVariance = url.searchParams.get('cost_variance_status');
    let rows = [...testProducts];
    if (category) rows = rows.filter((p) => p.category === category);
    if (supplier) rows = rows.filter((p) => p.supplier_id === supplier);
    if (costStatus === 'costed') rows = rows.filter((p) => p.effective_unit_cost !== null);
    if (costStatus === 'uncosted') rows = rows.filter((p) => p.effective_unit_cost === null);
    if (costBasis === 'received') rows = rows.filter((p) => p.effective_cost_source === 'landed_cost');
    if (costBasis === 'none') rows = rows.filter((p) => p.effective_unit_cost === null);
    if (costVariance) rows = rows.filter((p) => p.cost_variance_status === costVariance);
    return fulfillJson(route, rows);
  });
  await page.route('**/suppliers', (route) => isApiGet(route)
    ? fulfillJson(route, testSuppliers) : route.continue());
  await page.route('**/products/archived', (route) => isApiGet(route)
    ? fulfillJson(route, []) : route.continue());
}

const list = (page: Page) => page.locator('#product-list-panel');
const rows = (page: Page) => list(page).locator('tbody tr');

test.describe('Products — catalog and searchable directory /products', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTenant(page);
    await fixtureProducts(page);
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Product workspace' })).toBeVisible();
  });

  test('TPROD-001 product workspace initially displays the real catalog tab and synthetic product rows', async ({ page }) => {
    await expect(page.getByRole('tab', { name: 'Catalog' })).toHaveAttribute('aria-selected', 'true');
    await expect(list(page).getByRole('heading', { name: 'Product List' })).toBeVisible();
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
    await expect(list(page).getByText('Synthetic Sugar Packets', { exact: true })).toBeVisible();
    await expect(list(page).getByText('Synthetic Tea Leaves', { exact: true })).toBeVisible();
  });

  test('TPROD-002 text search filters product names in the current fetched directory', async ({ page }) => {
    await page.locator('#product-list-search').fill('Sugar');
    await expect(list(page).getByText('Synthetic Sugar Packets', { exact: true })).toBeVisible();
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(/(?:\?|&)search=Sugar(?:&|$)/);
  });

  test('TPROD-003 exact package barcode is included in the product text search', async ({ page }) => {
    await page.locator('#product-list-search').fill('PW-PACK-1001');
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
    await expect(list(page).getByText('Synthetic Sugar Packets', { exact: true })).toHaveCount(0);
  });

  test('TPROD-004 Clear product search button clears the query and restores catalog results', async ({ page }) => {
    await page.locator('#product-list-search').fill('Synthetic Sugar');
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Clear product search' }).click();
    await expect(page.locator('#product-list-search')).toHaveValue('');
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
    await expect(page).not.toHaveURL(/[?&]search=/);
  });

  test('TPROD-005 category selection produces a category-scoped products request and matching list', async ({ page }) => {
    await page.locator('#product-list-category').selectOption('Pantry');
    await expect(page).toHaveURL(/(?:\?|&)category=Pantry(?:&|$)/);
    await expect(list(page).getByText('Synthetic Sugar Packets', { exact: true })).toBeVisible();
    await expect(list(page).getByText('Synthetic Tea Leaves', { exact: true })).toHaveCount(0);
  });

  test('TPROD-006 cost status selection produces a costed-only catalog result', async ({ page }) => {
    await page.locator('#product-list-cost-status').selectOption('costed');
    await expect(page).toHaveURL(/(?:\?|&)cost_status=costed(?:&|$)/);
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
    await expect(list(page).getByText('Synthetic Sugar Packets', { exact: true })).toHaveCount(0);
  });

  test('TPROD-007 product_id deep link focuses a catalog row and offers Show all products', async ({ page }) => {
    await page.goto('/products?product_id=pw-prod-02');
    await expect(list(page).locator('tr.products-linked-product-row')).toContainText('Synthetic Sugar Packets');
    await expect(list(page).getByRole('button', { name: 'Show all products' })).toBeVisible();
    await list(page).getByRole('button', { name: 'Show all products' }).click();
    await expect(page).not.toHaveURL(/[?&]product_id=/);
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
  });

  test('TPROD-008 unknown product_id shows the source-defined product-not-found state', async ({ page }) => {
    await page.goto('/products?product_id=not-a-real-product');
    await expect(list(page).getByText('Product not found', { exact: true }).first()).toBeVisible();
    await expect(list(page).getByRole('button', { name: 'Show all products' })).toBeVisible();
  });

  test('TPROD-010 catalog and cost tabs stay in the same products route with URL view state', async ({ page }) => {
    const valuation = page.getByRole('tab', { name: 'Cost & value' });
    await expect(valuation).toBeVisible();
    await valuation.click();
    await expect(valuation).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/(?:\?|&)view=valuation(?:&|$)/);
    await page.getByRole('tab', { name: 'Catalog' }).click();
    await expect(page.getByRole('tab', { name: 'Catalog' })).toHaveAttribute('aria-selected', 'true');
    await expect(page).not.toHaveURL(/[?&]view=/);
  });

  test('TPROD-011 create button remains disabled until required SKU, name and unit are present', async ({ page }) => {
    const form = page.locator('#product-form-panel');
    const submit = form.getByRole('button', { name: 'Create Product' });
    await expect(submit).toBeDisabled();
    await form.locator('#product-sku').fill('PW-NEW-SYNTHETIC');
    await form.locator('#product-name').fill('Synthetic New Product');
    await form.locator('#product-unit').fill('pcs');
    await expect(submit).toBeEnabled();
    // Do not submit: generation phase creates code only; destructive actions are tested later.
  });

  test('TPROD-012 below-minimum products display shortage and source-defined lot/expiry badges', async ({ page }) => {
    const coffee = rows(page).filter({ hasText: 'Synthetic Coffee Beans' });
    await expect(coffee).toContainText('Below minimum');
    await expect(coffee).toContainText('Lot / batch');
    const tea = rows(page).filter({ hasText: 'Synthetic Tea Leaves' });
    await expect(tea).toContainText('Expiry');
  });

  test('TPROD-013 exporting products is disabled when the current search has no matches', async ({ page }) => {
    await page.locator('#product-list-search').fill('synthetic-nonexistent-needle');
    await expect(list(page).getByText('No products match the current search and filters.')).toBeVisible();
    await expect(list(page).getByRole('button', { name: 'Export Products CSV' })).toBeDisabled();
  });

  test('TPROD-015 empty archived list displays its separate no-archived-products state', async ({ page }) => {
    const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Archived products' }) });
    await expect(section.getByText('No archived products.', { exact: true })).toBeVisible();
  });

  test('TPROD-016 cost-basis and standard-variance filters persist as source-defined URL parameters', async ({ page }) => {
    await page.locator('#product-list-cost-basis').selectOption('received');
    await expect(page).toHaveURL(/(?:\?|&)cost_basis=received(?:&|$)/);
    await page.locator('#product-list-variance').selectOption('matched');
    await expect(page).toHaveURL(/(?:\?|&)cost_variance_status=matched(?:&|$)/);
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
  });

  test('TPROD-017 supplier filter adds supplier_id and excludes non-matching products', async ({ page }) => {
    await page.locator('#product-list-supplier').selectOption('pw-supplier-01');
    await expect(page).toHaveURL(/(?:\?|&)supplier_id=pw-supplier-01(?:&|$)/);
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
    await expect(list(page).getByText('Synthetic Sugar Packets', { exact: true })).toHaveCount(0);
  });

  test('TPROD-018 Clear Product Filters resets combined text, category and cost filters', async ({ page }) => {
    await page.locator('#product-list-category').selectOption('Beverages');
    await page.locator('#product-list-cost-status').selectOption('costed');
    await page.locator('#product-list-search').fill('Coffee');
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
    await list(page).getByRole('button', { name: 'Clear Product Filters' }).click();
    await expect(page.locator('#product-list-category')).toHaveValue('');
    await expect(page.locator('#product-list-cost-status')).toHaveValue('');
    await expect(page.locator('#product-list-search')).toHaveValue('');
    await expect(list(page).getByText('Synthetic Sugar Packets', { exact: true })).toBeVisible();
  });
});

test.describe('Products — error and access boundaries', () => {
  test.beforeEach(async ({ page }) => { await loginAsTenant(page); });

  test('TPROD-014 products API error is presented explicitly in the catalog instead of fake rows', async ({ page }) => {
    await page.route('**/products', (route) => isApiGet(route)
      ? fulfillJson(route, { error: { message: 'Synthetic catalog unavailable' } }, 503)
      : route.continue());
    await page.goto('/products');
    await expect(list(page).getByText(/Failed to load products: Synthetic catalog unavailable/)).toBeVisible();
  });

  test('TPROD-009 removing products.write and stock.read prevents edits and hides costing tabs', async ({ page }) => {
    await fixtureProducts(page);
    const snapshot = await page.evaluate(() => {
      const raw = localStorage.getItem('inventory_tenant_effective_permissions');
      return raw ? JSON.parse(raw) as Record<string, unknown> : null;
    });
    expect(snapshot?.tenant_id).toBeTruthy();
    await page.route('**/permissions/me', (route) => fulfillJson(route, {
      ...snapshot, scope: 'tenant', permissions: ['dashboard.read', 'products.read']
    }));
    await page.goto('/products');
    await expect(page.getByRole('tab', { name: 'Cost & value' })).toHaveCount(0);
    await expect(page.locator('#product-form-panel').locator('#product-sku')).toBeDisabled();
    const row = rows(page).filter({ hasText: 'Synthetic Coffee Beans' });
    await expect(row.getByRole('button', { name: 'Edit' })).toBeDisabled();
    await expect(row.getByRole('button', { name: 'Archive' })).toBeDisabled();
    await expect(row.getByRole('button', { name: 'Packages' })).toBeDisabled();
  });
});



// Batch 3 — source-traced Products mutations, archive/restore, packages,
// CSV import/export and read-only cost workspaces. All synthetic data is disposable.
const archivedCoffee = { ...testProducts[0], version: 2, deleted_at: '2026-10-10T08:00:00Z' };
const examplePackage = {
  id: 'pw-package-01', product_id: 'pw-prod-01', package_name: 'Synthetic Case',
  barcode: 'PW-CASE-0101', units_per_package: 6, is_default: false, version: 3
};

async function readyCatalog(page: Page) {
  await loginAsTenant(page);
  await fixtureProducts(page);
  await page.goto('/products');
  await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
}

const catalogRow = (page: Page, name = 'Synthetic Coffee Beans') => rows(page).filter({ hasText: name });
const productForm = (page: Page) => page.locator('#product-form-panel');
const packagesPanel = (page: Page) => page.locator('#product-packages-panel');
const archivePanel = (page: Page) => page.locator('section').filter({ has: page.getByRole('heading', { name: 'Archived products' }) });

async function openPackages(page: Page) {
  await page.route('**/products/pw-prod-01/packages', route => route.request().method() === 'GET'
    ? fulfillJson(route, [examplePackage]) : route.continue());
  await catalogRow(page).getByRole('button', { name: 'Packages' }).click();
  await expect(packagesPanel(page).getByRole('heading', { name: 'Packages for Synthetic Coffee Beans' })).toBeVisible();
}

async function openArchive(page: Page) {
  await page.route('**/products/archived', route => route.request().method() === 'GET'
    ? fulfillJson(route, [archivedCoffee]) : route.continue());
  await page.goto('/products');
  await expect(archivePanel(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
}

const importArea = (page: Page) => page.getByRole('region', { name: 'Bulk Product Import' });
const importCsv = 'sku,name,category,unit,min_stock,standard_unit_cost,barcode,requires_lot_tracking,requires_expiry_date\nPW-NEW-CSV,Test CSV Unit,Pantry,pcs,1,2.50,,false,false\n';

// Each mutation is intercepted and never reaches the real backend, even when a test
// author subsequently points this suite at a disposable tenant as required.
test.describe('Products — product mutation and versioned archive workflows', () => {
  test.beforeEach(async ({ page }) => { await readyCatalog(page); });

  test('TPROD-019 create sends normalized typed fields, announces success and refetches Products', async ({ page }) => {
    const current = [...testProducts];
    let catalogReads = 0;
    const created = { ...testProducts[1], id: 'pw-created-019', sku: 'PW-CREATE-019', name: 'Synthetic Created Product' };
    await page.route('**/products', route => {
      if (route.request().method() === 'GET') { catalogReads += 1; return fulfillJson(route, current); }
      if (route.request().method() === 'POST') { current.push(created); return fulfillJson(route, created, 201); }
      return route.abort();
    });
    const form = productForm(page);
    await form.locator('#product-sku').fill('  PW-CREATE-019  ');
    await form.locator('#product-name').fill('  Synthetic Created Product  ');
    await form.locator('#product-unit').fill(' pcs ');
    await form.locator('#product-min-stock').fill('5');
    await form.locator('#product-standard-cost').fill('12.50');
    const request = page.waitForRequest(r => new URL(r.url()).pathname.endsWith('/products') && r.method() === 'POST');
    await form.getByRole('button', { name: 'Create Product' }).click();
    const body = (await request).postDataJSON();
    expect(body).toMatchObject({ sku: 'PW-CREATE-019', name: 'Synthetic Created Product', unit: 'pcs', min_stock: 5, standard_unit_cost: 12.5, category: null, supplier_id: null });
    await expect(form.getByText('Product created successfully.')).toBeVisible();
    await expect(list(page).getByText('Synthetic Created Product', { exact: true })).toBeVisible();
    expect(catalogReads).toBeGreaterThanOrEqual(1);
  });

  test('TPROD-020 duplicate SKU rejects creation and leaves the unsaved form visible', async ({ page }) => {
    await page.route('**/products', route => route.request().method() === 'POST'
      ? fulfillJson(route, { error: { message: 'SKU already exists' } }, 409) : route.continue());
    const form = productForm(page);
    await form.locator('#product-sku').fill('PW-COFFEE-01');
    await form.locator('#product-name').fill('Rejected Duplicate');
    await form.locator('#product-unit').fill('kg');
    await form.getByRole('button', { name: 'Create Product' }).click();
    await expect(form.getByText('SKU already exists')).toBeVisible();
    await expect(form.locator('#product-name')).toHaveValue('Rejected Duplicate');
    await expect(form.getByText('Product created successfully.')).toHaveCount(0);
  });

  test('TPROD-021 Edit selects source-record values and enables Update Product', async ({ page }) => {
    await catalogRow(page).getByRole('button', { name: 'Edit' }).click();
    const form = productForm(page);
    await expect(form.getByRole('heading', { name: 'Edit Product' })).toBeVisible();
    await expect(form.locator('#product-sku')).toHaveValue('PW-COFFEE-01');
    await expect(form.locator('#product-name')).toHaveValue('Synthetic Coffee Beans');
    await expect(form.locator('#product-unit')).toHaveValue('kg');
    await expect(form.locator('#product-min-stock')).toHaveValue('10');
    await expect(form.getByRole('button', { name: 'Update Product' })).toBeEnabled();
  });

  test('TPROD-022 cancelling edit resets the input and never sends PATCH', async ({ page }) => {
    let writes = 0;
    await page.route('**/products/pw-prod-01', route => { writes += 1; return route.abort(); });
    await catalogRow(page).getByRole('button', { name: 'Edit' }).click();
    await productForm(page).locator('#product-name').fill('Discard this edit');
    await productForm(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(productForm(page).getByRole('heading', { name: 'Create Product' })).toBeVisible();
    await expect(productForm(page).locator('#product-name')).toHaveValue('');
    expect(writes).toBe(0);
  });

  test('TPROD-023 PATCH carries If-Match-Version and normalized product update', async ({ page }) => {
    let body: Record<string, unknown> | undefined;
    let version: string | undefined;
    await page.route('**/products/pw-prod-01', route => {
      if (route.request().method() !== 'PATCH') return route.continue();
      version = route.request().headers()['if-match-version'];
      body = route.request().postDataJSON();
      return fulfillJson(route, { ...testProducts[0], name: 'Synthetic Coffee Updated', version: 2 });
    });
    await catalogRow(page).getByRole('button', { name: 'Edit' }).click();
    await productForm(page).locator('#product-name').fill('  Synthetic Coffee Updated  ');
    await productForm(page).getByRole('button', { name: 'Update Product' }).click();
    await expect(productForm(page).getByText('Product updated successfully.')).toBeVisible();
    expect(version).toBe('1');
    expect(body).toMatchObject({ sku: 'PW-COFFEE-01', name: 'Synthetic Coffee Updated', unit: 'kg', min_stock: 10 });
  });

  test('TPROD-024 Archive confirmation Cancel makes no DELETE request', async ({ page }) => {
    let deletions = 0;
    await page.route('**/products/pw-prod-01', route => { if (route.request().method() === 'DELETE') deletions += 1; return route.abort(); });
    page.once('dialog', dialog => dialog.dismiss());
    await catalogRow(page).getByRole('button', { name: 'Archive' }).click();
    await expect(catalogRow(page)).toBeVisible();
    expect(deletions).toBe(0);
  });

  test('TPROD-025 confirmed archive sends DELETE with original version and success status', async ({ page }) => {
    let version = '';
    await page.route('**/products/pw-prod-01', route => {
      if (route.request().method() === 'DELETE') { version = route.request().headers()['if-match-version'] ?? ''; return route.fulfill({ status: 204, body: '' }); }
      return route.continue();
    });
    page.once('dialog', dialog => dialog.accept());
    await catalogRow(page).getByRole('button', { name: 'Archive' }).click();
    await expect(productForm(page).getByText('Product archived successfully.')).toBeVisible();
    expect(version).toBe('1');
  });

  test('TPROD-043 absent suppliers.read keeps supplier selector unavailable but catalog visible', async ({ page }) => {
    const previous = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me', route => fulfillJson(route, { ...previous, scope: 'tenant', permissions: ['dashboard.read', 'products.read', 'products.write'] }));
    await page.reload();
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
    await expect(productForm(page).locator('#product-supplier')).toBeDisabled();
  });

  test('TPROD-044 failed product write shows server error and never displays created confirmation', async ({ page }) => {
    await page.route('**/products', route => route.request().method() === 'POST'
      ? fulfillJson(route, { error: { message: 'Writes temporarily unavailable' } }, 503) : route.continue());
    await productForm(page).locator('#product-sku').fill('PW-FAILED-044');
    await productForm(page).locator('#product-name').fill('Synthetic failed write');
    await productForm(page).locator('#product-unit').fill('pcs');
    await productForm(page).getByRole('button', { name: 'Create Product' }).click();
    await expect(productForm(page).getByText('Writes temporarily unavailable')).toBeVisible();
    await expect(productForm(page).getByText('Product created successfully.')).toHaveCount(0);
  });

  test('TPROD-048 slow catalog GET shows Loading products before data arrives', async ({ page }) => {
    let release: (() => void) | undefined;
    const hold = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/products', async route => {
      if (route.request().method() !== 'GET') return route.continue();
      await hold;
      await fulfillJson(route, testProducts);
    });
    const navigation = page.reload({ waitUntil: 'domcontentloaded' });
    await expect(list(page).getByText('Loading products...')).toBeVisible();
    release?.();
    await navigation;
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
  });

  test('TPROD-049 exact barcode result precedes partial-name match', async ({ page }) => {
    const overrides = [
      { ...testProducts[0], id: 'pw-sort-name', sku: 'PW-SORT-NAME', name: 'PW-BC-1002 Related Name', barcode: 'OTHER-SCAN' },
      testProducts[1]
    ];
    await page.route('**/products', route => route.request().method() === 'GET' ? fulfillJson(route, overrides) : route.continue());
    await page.reload();
    await page.locator('#product-list-search').fill('PW-BC-1002');
    await expect(rows(page).first()).toContainText('Synthetic Sugar Packets');
    await expect(rows(page).nth(1)).toContainText('PW-BC-1002 Related Name');
  });
});

test.describe('Products — archived record restore and failure states', () => {
  test.beforeEach(async ({ page }) => { await readyCatalog(page); await openArchive(page); });

  test('TPROD-026 declining restore preserves archived product without POST', async ({ page }) => {
    let posts = 0;
    await page.route('**/products/pw-prod-01/restore', route => { posts += 1; return route.abort(); });
    page.once('dialog', dialog => dialog.dismiss());
    await archivePanel(page).getByRole('button', { name: 'Restore' }).click();
    await expect(archivePanel(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
    expect(posts).toBe(0);
  });

  test('TPROD-027 confirmed restore posts version then removes row from archived list', async ({ page }) => {
    let version = '';
    await page.route('**/products/pw-prod-01/restore', route => {
      version = route.request().headers()['if-match-version'] ?? '';
      return fulfillJson(route, { ...testProducts[0], deleted_at: null, version: 3 });
    });
    page.once('dialog', dialog => dialog.accept());
    await archivePanel(page).getByRole('button', { name: 'Restore' }).click();
    await expect(archivePanel(page).getByText('Product restored successfully.')).toBeVisible();
    await expect(archivePanel(page).getByText('Synthetic Coffee Beans', { exact: true })).toHaveCount(0);
    expect(version).toBe('2');
  });

  test('TPROD-045 archive endpoint failure shows scoped error without breaking catalog', async ({ page }) => {
    await page.route('**/products/archived', route => fulfillJson(route, { error: { message: 'Archive query down' } }, 503));
    await page.reload();
    await expect(archivePanel(page).getByText('Failed to load archived products.')).toBeVisible();
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
  });
});

test.describe('Products — package management /product/:id/packages', () => {
  test.beforeEach(async ({ page }) => { await readyCatalog(page); await openPackages(page); });

  test('TPROD-031 Packages opens the selected product panel with its scoped package list', async ({ page }) => {
    await expect(packagesPanel(page).getByText('Synthetic Case', { exact: true })).toBeVisible();
    await packagesPanel(page).getByRole('button', { name: 'Close Packages' }).click();
    await expect(packagesPanel(page)).toHaveCount(0);
  });

  test('TPROD-032 package form blocks invalid quantity natively without creating a package', async ({ page }) => {
    let posts = 0;
    await page.route('**/products/pw-prod-01/packages', route => {
      if (route.request().method() === 'POST') { posts += 1; return route.abort(); }
      return route.continue();
    });
    await packagesPanel(page).locator('#product-package-name').fill('Synthetic Pallet');
    await packagesPanel(page).locator('#product-package-barcode').fill('PW-PALLET-32');
    await packagesPanel(page).locator('#product-package-units').fill('0');
    await packagesPanel(page).getByRole('button', { name: 'Create Package' }).click();
    expect(await packagesPanel(page).locator('#product-package-units').evaluate(el => (el as HTMLInputElement).validity.rangeUnderflow)).toBe(true);
    expect(posts).toBe(0);
  });

  test('TPROD-033 edited package sends PATCH with version and normalized package details', async ({ page }) => {
    let payload: Record<string, unknown> | undefined;
    let version = '';
    await page.route('**/products/pw-prod-01/packages/pw-package-01', route => {
      version = route.request().headers()['if-match-version'] ?? '';
      payload = route.request().postDataJSON();
      return fulfillJson(route, { ...examplePackage, package_name: 'Synthetic Updated Case', version: 4 });
    });
    const row = packagesPanel(page).locator('tbody tr').filter({ hasText: 'Synthetic Case' });
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(packagesPanel(page).locator('#product-package-name')).toHaveValue('Synthetic Case');
    await packagesPanel(page).locator('#product-package-name').fill(' Synthetic Updated Case ');
    await packagesPanel(page).getByRole('button', { name: 'Update Package' }).click();
    await expect(packagesPanel(page).getByText('Package updated successfully.')).toBeVisible();
    expect(version).toBe('3');
    expect(payload).toMatchObject({ package_name: 'Synthetic Updated Case', units_per_package: 6, is_default: false });
  });

  test('TPROD-034 package archive prompts then deletes the exact versioned package', async ({ page }) => {
    let version = '';
    await page.route('**/products/pw-prod-01/packages/pw-package-01', route => {
      if (route.request().method() !== 'DELETE') return route.continue();
      version = route.request().headers()['if-match-version'] ?? '';
      return route.fulfill({ status: 204, body: '' });
    });
    page.once('dialog', dialog => { expect(dialog.message()).toContain('Synthetic Case'); return dialog.accept(); });
    await packagesPanel(page).locator('tbody tr').filter({ hasText: 'Synthetic Case' }).getByRole('button', { name: 'Archive' }).click();
    await expect(packagesPanel(page).getByText('Package archived successfully.')).toBeVisible();
    expect(version).toBe('3');
  });

  test('TPROD-046 package GET failure shows package-local error, leaves product directory intact', async ({ page }) => {
    await page.route('**/products/pw-prod-01/packages', route => fulfillJson(route, { error: { message: 'Package listing unavailable' } }, 503));
    await packagesPanel(page).getByRole('button', { name: 'Close Packages' }).click();
    await catalogRow(page).getByRole('button', { name: 'Packages' }).click();
    await expect(packagesPanel(page).getByText(/Failed to load packages: Package listing unavailable/)).toBeVisible();
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
  });
});

test.describe('Products — downloads and guarded CSV import', () => {
  test.beforeEach(async ({ page }) => { await readyCatalog(page); });

  test('TPROD-028 CSV import template downloads real products-import-template.csv', async ({ page }) => {
    const download = page.waitForEvent('download');
    await importArea(page).getByRole('button', { name: 'Download CSV Template' }).click();
    expect((await download).suggestedFilename()).toBe('products-import-template.csv');
  });

  test('TPROD-029 malformed CSV never reaches the preview endpoint', async ({ page }) => {
    let previews = 0;
    await page.route('**/inventory-imports/preview', route => { previews += 1; return route.abort(); });
    await importArea(page).locator('input[type="file"]').setInputFiles({
      name: 'invalid.csv', mimeType: 'text/csv', buffer: Buffer.from('sku,name\n"unclosed,name\n')
    });
    await expect(importArea(page).getByText('CSV contains an unclosed quoted value.')).toBeVisible();
    await expect(importArea(page).getByRole('button', { name: 'Commit Validated Import' })).toBeDisabled();
    expect(previews).toBe(0);
  });

  test('TPROD-030 previewing valid CSV does not commit before explicit confirmation', async ({ page }) => {
    const response = {
      id: 'pw-import-030', tenant_id: 'pw-tenant', import_type: 'products', source_filename: 'valid.csv',
      status: 'validated', row_count: 1, valid_row_count: 1, invalid_row_count: 0,
      normalized_rows: [{ sku: 'PW-NEW-CSV', name: 'Test CSV Unit' }], validation_errors: [], version: 2
    };
    let previews = 0; let commits = 0; let version = '';
    await page.route('**/inventory-imports/preview', route => { previews += 1; return fulfillJson(route, response); });
    await page.route('**/inventory-imports/pw-import-030/commit', route => {
      commits += 1; version = route.request().headers()['if-match-version'] ?? '';
      return fulfillJson(route, { ...response, status: 'committed', result_summary: { created: 1 }, version: 3 });
    });
    await importArea(page).locator('input[type="file"]').setInputFiles({ name: 'valid.csv', mimeType: 'text/csv', buffer: Buffer.from(importCsv) });
    await importArea(page).getByRole('button', { name: 'Validate CSV' }).click();
    await expect(importArea(page).getByText(/Validation passed for all 1 rows/)).toBeVisible();
    expect(previews).toBe(1);
    expect(commits).toBe(0);
    page.once('dialog', dialog => dialog.accept());
    await importArea(page).getByRole('button', { name: 'Commit Validated Import' }).click();
    await expect(importArea(page).getByText('Import committed successfully.')).toBeVisible();
    expect(commits).toBe(1);
    expect(version).toBe('2');
  });

  test('TPROD-037 Export Products CSV creates products-costing.csv', async ({ page }) => {
    const download = page.waitForEvent('download');
    await list(page).getByRole('button', { name: 'Export Products CSV' }).click();
    expect((await download).suggestedFilename()).toBe('products-costing.csv');
  });

  test('TPROD-042 URL filters survive reload and keep supplier-scoped rows', async ({ page }) => {
    await page.goto('/products?category=Beverages&supplier_id=pw-supplier-01');
    await expect(page.locator('#product-list-category')).toHaveValue('Beverages');
    await expect(page.locator('#product-list-supplier')).toHaveValue('pw-supplier-01');
    await page.reload();
    await expect(page.locator('#product-list-category')).toHaveValue('Beverages');
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
    await expect(list(page).getByText('Synthetic Tea Leaves', { exact: true })).toHaveCount(0);
  });
});

test.describe('Products — read-only package and scanner contracts', () => {
  test.beforeEach(async ({ page }) => { await readyCatalog(page); });

  test('TPROD-035 product_packages.read role sees package data but cannot create/edit/archive', async ({ page }) => {
    const previous = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me', route => fulfillJson(route, {
      ...previous, scope: 'tenant', permissions: ['dashboard.read', 'products.read', 'product_packages.read']
    }));
    await page.reload();
    await openPackages(page);
    await expect(packagesPanel(page).getByText('Synthetic Case', { exact: true })).toBeVisible();
    await expect(packagesPanel(page).getByRole('button', { name: 'Create Package' })).toBeDisabled();
    await expect(packagesPanel(page).locator('tbody tr').getByRole('button', { name: 'Edit' })).toBeDisabled();
    await expect(packagesPanel(page).locator('tbody tr').getByRole('button', { name: 'Archive' })).toBeDisabled();
  });

  test('TPROD-038 a supported barcode QR image filters products by actual decoded value', async ({ page }) => {
    await page.getByRole('button', { name: 'Scan barcode' }).click();
    await expect(page.getByText('Find a product by barcode')).toBeVisible();
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(
      'support/fixtures/synthetic-product-barcode-qr.png'
    );
    await expect(page.locator('#product-list-search')).toHaveValue('PW-BC-1002');
    await expect(list(page).getByText('Synthetic Sugar Packets', { exact: true })).toBeVisible();
    await expect(list(page).getByText('Synthetic Coffee Beans', { exact: true })).toHaveCount(0);
  });

  test('TPROD-047 without products.write, CSV chooser and Validate are disabled', async ({ page }) => {
    const previous = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me', route => fulfillJson(route, {
      ...previous, scope: 'tenant', permissions: ['dashboard.read', 'products.read']
    }));
    await page.reload();
    await expect(importArea(page).getByText('Products write permission is required for bulk product import.')).toBeVisible();
    await expect(importArea(page).getByRole('button', { name: 'Choose file' })).toBeDisabled();
    await expect(importArea(page).getByRole('button', { name: 'Validate CSV' })).toBeDisabled();
    await expect(importArea(page).getByRole('button', { name: 'Commit Validated Import' })).toBeDisabled();
  });
});

test.describe('Products — evidence panels and cost-only view boundaries', () => {
  test.beforeEach(async ({ page }) => { await readyCatalog(page); });

  test('TPROD-036 Cost history opens for selected product, displays empty evidence and closes', async ({ page }) => {
    await page.route('**/products/pw-prod-01/cost-history?*', route => fulfillJson(route, {
      product: testProducts[0], cost_history: [], cost_summary: { costed_movement_count: 0 }, pagination: { has_more: false }
    }));
    await page.route('**/products/pw-prod-01/standard-cost-history?*', route => fulfillJson(route, {
      product: testProducts[0], standard_cost_history: [], pagination: { has_more: false }
    }));
    await catalogRow(page).getByRole('button', { name: 'Cost history' }).click();
    const panel = page.locator('#product-cost-history-panel');
    await expect(panel.getByRole('heading', { name: 'Cost History for Synthetic Coffee Beans' })).toBeVisible();
    await expect(panel.getByText('No costed stock movements found for this product.')).toBeVisible();
    await panel.getByRole('button', { name: 'Close Cost History' }).click();
    await expect(panel).toHaveCount(0);
  });

  test('TPROD-039 Cost & value shows valuation cards with server-backed value and failure state', async ({ page }) => {
    await page.route('**/products/cost-valuation-summary?*', route => fulfillJson(route, {
      totals: { total_estimated_inventory_value: 123.45, received_cost_value: 90,
        standard_fallback_value: 33.45, unvalued_stocked_products: 1, unvalued_stock_quantity: 8 },
      top_unvalued_products: [], category_breakdown: [], cost_source_breakdown: []
    }));
    await page.getByRole('tab', { name: 'Cost & value' }).click();
    await expect(page.getByRole('heading', { name: 'Cost & valuation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cost Valuation Summary' })).toBeVisible();
    await expect(page.getByText('Latest received cost, then standard fallback')).toBeVisible();
    await page.route('**/products/cost-valuation-summary?*', route => fulfillJson(route, { error: { message: 'Valuation unavailable' } }, 503));
    await page.getByRole('button', { name: 'Refresh Valuation' }).click();
    await expect(page.getByText('Unable to load cost valuation summary.')).toBeVisible();
  });

  test('TPROD-040 Cost review presents exception workspace and scoped API error', async ({ page }) => {
    await page.route('**/products/cost-action-summary?*', route => fulfillJson(route, { error: { message: 'Action summary unavailable' } }, 503));
    await page.getByRole('tab', { name: 'Cost review' }).click();
    await expect(page.getByRole('heading', { name: 'Cost review' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cost Action Summary' })).toBeVisible();
    await expect(page.getByText('Unable to load cost action summary.')).toBeVisible();
  });

  test('TPROD-041 Cost controls presents audit workspace with isolated governance failure', async ({ page }) => {
    await page.route('**/products/cost-governance-summary?*', route => fulfillJson(route, { error: { message: 'Governance unavailable' } }, 503));
    await page.getByRole('tab', { name: 'Cost controls' }).click();
    await expect(page.getByRole('heading', { name: 'Cost Governance Summary' })).toBeVisible();
    await expect(page.getByText('Unable to load cost governance summary.')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Catalog' })).toBeVisible();
  });

  test('TPROD-050 Cost controls review export downloads evidence file when rows exist', async ({ page }) => {
    await page.route('**/products/cost-governance-review-pack?*', route => fulfillJson(route, {
      review_export_rows: [{ review_area: 'Synthetic test', status: 'pending', notes: 'Disposable row' }]
    }));
    await page.getByRole('tab', { name: 'Cost controls' }).click();
    const exportButton = page.getByRole('button', { name: 'Export Review Pack CSV' }).last();
    await expect(exportButton).toBeEnabled();
    const download = page.waitForEvent('download');
    await exportButton.click();
    expect((await download).suggestedFilename()).toBe('product-cost-governance-review-pack.csv');
  });
});

test.describe('Products — additional source-discovered edge cases', () => {
  test.beforeEach(async ({ page }) => { await readyCatalog(page); });

  test('TPROD-051 creating a package sends normalized base-unit conversion and success feedback', async ({ page }) => {
    await openPackages(page);
    let body: Record<string, unknown> | undefined;
    await page.route('**/products/pw-prod-01/packages', route => {
      if (route.request().method() !== 'POST') return route.continue();
      body = route.request().postDataJSON();
      return fulfillJson(route, { ...examplePackage, id: 'pw-new-package', package_name: 'Synthetic 12-pack', units_per_package: 12 }, 201);
    });
    const panel = packagesPanel(page);
    await panel.locator('#product-package-name').fill('  Synthetic 12-pack  ');
    await panel.locator('#product-package-barcode').fill('  PW-12-PACK  ');
    await panel.locator('#product-package-units').fill('12');
    await panel.getByRole('button', { name: 'Create Package' }).click();
    await expect(panel.getByText('Package created successfully.')).toBeVisible();
    expect(body).toMatchObject({ package_name: 'Synthetic 12-pack', barcode: 'PW-12-PACK', units_per_package: 12, is_default: false });
  });

  test('TPROD-052 Cancel package edit restores blank create form without PATCH', async ({ page }) => {
    await openPackages(page);
    let changes = 0;
    await page.route('**/products/pw-prod-01/packages/pw-package-01', route => { changes += 1; return route.abort(); });
    await packagesPanel(page).locator('tbody tr').filter({ hasText: 'Synthetic Case' }).getByRole('button', { name: 'Edit' }).click();
    await packagesPanel(page).locator('#product-package-name').fill('Unsaved New Name');
    await packagesPanel(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(packagesPanel(page).getByRole('button', { name: 'Create Package' })).toBeVisible();
    await expect(packagesPanel(page).locator('#product-package-name')).toHaveValue('');
    expect(changes).toBe(0);
  });

  test('TPROD-053 cancelled package archive sends no mutation and retains package row', async ({ page }) => {
    await openPackages(page);
    let deletes = 0;
    await page.route('**/products/pw-prod-01/packages/pw-package-01', route => { deletes += 1; return route.abort(); });
    page.once('dialog', dialog => dialog.dismiss());
    await packagesPanel(page).locator('tbody tr').filter({ hasText: 'Synthetic Case' }).getByRole('button', { name: 'Archive' }).click();
    await expect(packagesPanel(page).getByText('Synthetic Case', { exact: true })).toBeVisible();
    expect(deletes).toBe(0);
  });

  test('TPROD-054 backend validation errors prevent CSV commit and enable error-row download', async ({ page }) => {
    let commits = 0;
    await page.route('**/inventory-imports/preview', route => fulfillJson(route, {
      id: 'pw-invalid-batch', tenant_id: 'pw-tenant', import_type: 'products', status: 'invalid',
      source_filename: 'invalid-values.csv', row_count: 1, valid_row_count: 0, invalid_row_count: 1,
      normalized_rows: [], validation_errors: [{ row_number: 2, field: 'sku', code: 'DUPLICATE', message: 'SKU is already used' }], version: 1
    }));
    await page.route('**/inventory-imports/pw-invalid-batch/commit', route => { commits += 1; return route.abort(); });
    await importArea(page).locator('input[type="file"]').setInputFiles({ name: 'invalid-values.csv', mimeType: 'text/csv', buffer: Buffer.from(importCsv) });
    await importArea(page).getByRole('button', { name: 'Validate CSV' }).click();
    await expect(importArea(page).getByText('SKU is already used')).toBeVisible();
    await expect(importArea(page).getByRole('button', { name: 'Commit Validated Import' })).toBeDisabled();
    const download = page.waitForEvent('download');
    await importArea(page).getByRole('button', { name: 'Download Validation Errors' }).click();
    expect((await download).suggestedFilename()).toBe('products-validation-errors.csv');
    expect(commits).toBe(0);
  });

  test('TPROD-055 Start Over clears uploaded CSV and validation state', async ({ page }) => {
    await importArea(page).locator('input[type="file"]').setInputFiles({ name: 'valid.csv', mimeType: 'text/csv', buffer: Buffer.from(importCsv) });
    await expect(importArea(page).getByText('valid.csv', { exact: true })).toBeVisible();
    await importArea(page).getByRole('button', { name: 'Start Over' }).click();
    await expect(importArea(page).getByText('No file selected')).toBeVisible();
    await expect(importArea(page).getByRole('button', { name: 'Validate CSV' })).toBeDisabled();
  });

  test('TPROD-056 negative minimum stock is rejected by native numeric validity before POST', async ({ page }) => {
    let posts = 0;
    await page.route('**/products', route => { if (route.request().method() === 'POST') posts += 1; return route.continue(); });
    await productForm(page).locator('#product-sku').fill('PW-NEGATIVE-56');
    await productForm(page).locator('#product-name').fill('Synthetic Negative');
    await productForm(page).locator('#product-unit').fill('pcs');
    await productForm(page).locator('#product-min-stock').fill('-1');
    const invalid = await productForm(page).locator('#product-min-stock').evaluate(el => (el as HTMLInputElement).validity.rangeUnderflow);
    expect(invalid).toBe(true);
    await productForm(page).getByRole('button', { name: 'Create Product' }).click();
    expect(posts).toBe(0);
  });

  test('TPROD-057 hidden archive dependencies present a human-readable conflict error', async ({ page }) => {
    await page.route('**/products/pw-prod-01', route => route.request().method() === 'DELETE'
      ? fulfillJson(route, { error: { code: 'PRODUCT_ARCHIVE_DEPENDENCY_HIDDEN', message: 'Hidden dependency' } }, 409) : route.continue());
    page.once('dialog', dialog => dialog.accept());
    await catalogRow(page).getByRole('button', { name: 'Archive' }).click();
    await expect(productForm(page).getByText(/still referenced by active work that is not visible/)).toBeVisible();
    await expect(catalogRow(page)).toBeVisible();
  });

  test('TPROD-058 rejected restore preserves archived item and shows archive-scoped error', async ({ page }) => {
    await openArchive(page);
    await page.route('**/products/pw-prod-01/restore', route => fulfillJson(route, { error: { message: 'Product cannot be restored' } }, 409));
    page.once('dialog', dialog => dialog.accept());
    await archivePanel(page).getByRole('button', { name: 'Restore' }).click();
    await expect(archivePanel(page).getByText('Product cannot be restored')).toBeVisible();
    await expect(archivePanel(page).getByText('Synthetic Coffee Beans', { exact: true })).toBeVisible();
  });

  test('TPROD-059 barcode scanner panel closes and returns to the untouched catalog', async ({ page }) => {
    await page.getByRole('button', { name: 'Scan barcode' }).click();
    await expect(page.getByText('Find a product by barcode')).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByText('Find a product by barcode')).toHaveCount(0);
    await expect(page.locator('#product-list-search')).toHaveValue('');
  });

  test('TPROD-060 cost source filter issues a source-scoped history request then clears', async ({ page }) => {
    await page.route('**/products/pw-prod-01/cost-history?*', route => fulfillJson(route, {
      product: testProducts[0], cost_history: [], cost_summary: {}, pagination: { has_more: false }
    }));
    await page.route('**/products/pw-prod-01/standard-cost-history?*', route => fulfillJson(route, {
      product: testProducts[0], standard_cost_history: [], pagination: { has_more: false }
    }));
    await catalogRow(page).getByRole('button', { name: 'Cost history' }).click();
    const panel = page.locator('#product-cost-history-panel');
    const req = page.waitForRequest(r => r.url().includes('/products/pw-prod-01/cost-history?') && new URL(r.url()).searchParams.get('cost_source') === 'shipment_item_unit_cost');
    await panel.locator('input[placeholder="Example: shipment_item_unit_cost"]').fill('shipment_item_unit_cost');
    await req;
    await panel.getByRole('button', { name: 'Clear Cost Filters' }).click();
    await expect(panel.locator('input[placeholder="Example: shipment_item_unit_cost"]')).toHaveValue('');
  });

  test('TPROD-063 editing without suppliers.read omits supplier_id from versioned PATCH', async ({ page }) => {
    const previous = await page.evaluate(() => JSON.parse(localStorage.getItem('inventory_tenant_effective_permissions') || '{}'));
    await page.route('**/permissions/me', route => fulfillJson(route, { ...previous, scope: 'tenant', permissions: ['dashboard.read', 'products.read', 'products.write'] }));
    await page.reload();
    let payload: Record<string, unknown> | undefined;
    await page.route('**/products/pw-prod-01', route => {
      payload = route.request().postDataJSON();
      return fulfillJson(route, { ...testProducts[0], name: 'Supplier Hidden Edit', version: 2 });
    });
    await catalogRow(page).getByRole('button', { name: 'Edit' }).click();
    await productForm(page).locator('#product-name').fill('Supplier Hidden Edit');
    await productForm(page).getByRole('button', { name: 'Update Product' }).click();
    await expect(productForm(page).getByText('Product updated successfully.')).toBeVisible();
    expect(payload).toBeDefined();
    expect(Object.prototype.hasOwnProperty.call(payload, 'supplier_id')).toBe(false);
  });
});

test.describe('Products — additional download and numeric constraints', () => {
  test.beforeEach(async ({ page }) => { await readyCatalog(page); });

  test('TPROD-061 populated cost history exports product-scoped audit CSV', async ({ page }) => {
    await page.route('**/products/pw-prod-01/cost-history?*', route => fulfillJson(route, {
      product: testProducts[0], cost_summary: { costed_movement_count: 1 }, pagination: { has_more: false },
      cost_history: [{ id: 'pw-move-61', product_name: 'Synthetic Coffee Beans', change: 5,
        reason: 'receiving', unit_cost: 3.75, total_cost: 18.75, cost_source: 'shipment_item_unit_cost',
        shipment_po_number: 'PW-PO-61', receiving_note: 'Synthetic receipt', user_name: 'Tester',
        created_at: '2026-10-01T10:00:00Z' }]
    }));
    await page.route('**/products/pw-prod-01/standard-cost-history?*', route => fulfillJson(route, {
      product: testProducts[0], standard_cost_history: [], pagination: { has_more: false }
    }));
    await catalogRow(page).getByRole('button', { name: 'Cost history' }).click();
    const panel = page.locator('#product-cost-history-panel');
    await expect(panel.getByText('PW-PO-61')).toBeVisible();
    const download = page.waitForEvent('download');
    await panel.getByRole('button', { name: 'Export Cost History CSV' }).click();
    expect((await download).suggestedFilename()).toBe('product-cost-history-PW-COFFEE-01.csv');
  });

  test('TPROD-062 negative standard unit cost is blocked before creating a product', async ({ page }) => {
    let writes = 0;
    await page.route('**/products', route => {
      if (route.request().method() === 'POST') writes += 1;
      return route.continue();
    });
    const form = productForm(page);
    await form.locator('#product-sku').fill('PW-INVALID-COST');
    await form.locator('#product-name').fill('Synthetic Invalid Cost');
    await form.locator('#product-unit').fill('pcs');
    await form.locator('#product-standard-cost').fill('-5');
    expect(await form.locator('#product-standard-cost').evaluate(el => (el as HTMLInputElement).validity.rangeUnderflow)).toBe(true);
    await form.getByRole('button', { name: 'Create Product' }).click();
    expect(writes).toBe(0);
  });
});

// Batch 4 — source-traced Products costing/evidence. All endpoints are intercepted;
// no application mutations or tests were executed during generation.
const valuationRow = {
  id: 'pw-prod-01', sku: 'PW-COFFEE-01', name: 'Synthetic Coffee Beans',
  category: 'Beverages', unit: 'kg', current_stock_quantity: 3,
  valuation_basis: 'received', effective_unit_cost: 18,
  latest_unit_cost: 18, estimated_inventory_value: 54
};
const actionRow = {
  ...valuationRow, action_type: 'capture_missing_cost', risk_type: 'missing_cost',
  action_priority_score: 10, risk_priority_score: 10,
  recommended_action: 'Record received cost evidence', cost_variance_percent: null,
  cost_history_spread_percent: null
};
const costFixtures: Record<string, Record<string, unknown>> = {
  'cost-valuation-summary': {
    totals: { total_estimated_inventory_value: 54, received_cost_value: 54,
      standard_fallback_value: 0, unvalued_stocked_products: 0, unvalued_stock_quantity: 0 },
    category_breakdown: [{ category: 'Beverages', stocked_products: 1, stock_quantity: 3,
      estimated_value: 54, unvalued_stocked_products: 0 }],
    basis_breakdown: [{ valuation_basis: 'received', stocked_products: 1, stock_quantity: 3,
      estimated_value: 54 }], top_value_products: []
  },
  'cost-valuation-details': { rows: [valuationRow], total: 1, filtered_estimated_inventory_value: 54 },
  'cost-action-details': { rows: [actionRow], total: 1, filtered_estimated_inventory_value: 54 },
  'cost-risk-summary': {
    thresholds: { variance_threshold_percent: 20, history_spread_threshold_percent: 25 },
    totals: { high_variance_products: 0, missing_cost_products: 1,
      inconsistent_cost_history_products: 0 },
    high_variance_products: [], missing_cost_products: [], inconsistent_cost_history_products: []
  },
  'cost-risk-details': { rows: [actionRow], total: 1, filtered_estimated_inventory_value: 54 },
  'cost-report-summary': {
    dashboard_totals: { total_estimated_inventory_value: 54, review_estimated_value: 8 },
    alert_totals: { total_alerts: 1 }, recommendation_totals: { total_recommendations: 1 },
    export_rows: [{ section: 'valuation', metric: 'estimated_value', value: 54 }],
    executive_actions: ['Reconcile missing cost evidence']
  },
  'cost-hardening-summary': { totals: {}, issues: [], review_products: [] },
  'cost-governance-summary': { totals: { stocked_cost_coverage_percent: 95, total_alerts: 1,
    review_estimated_value: 8 }, checklist: [], next_actions: [] },
  'cost-governance-details': { priority_products: [], audit_rows: [] },
  'cost-governance-audit-pack': { evidence_summary: { checklist_items: 1,
    remediation_items: 0, hardening_issue_count: 0 },
    audit_rows: [{ section: 'review', metric: 'supplier_review', value: 1 }],
    approval_notes: ['Synthetic finance review'] },
  'cost-governance-signoff-summary': { signoff_status: 'review', totals: {}, checklist: [], approvals: [] },
  'cost-governance-review-queue': { review_status: 'needs_review',
    totals: { queue_items: 1, blockers: 1, warnings: 0, priority_products: 1 },
    queue_items: [{ key: 'pw-review-01', source: 'governance_checklist', label: 'Synthetic missing cost',
      detail: 'Review synthetic stock valuation', status: 'blocked', priority: 'high' }],
    reviewer_guidance: ['Synthetic reviewer guidance'] },
  'cost-governance-review-pack': { closure_status: 'needs_review', can_close_review: false,
    totals: { review_export_rows: 1, queue_items: 1 }, product_review_rows: [], closure_cards: [],
    closure_guidance: [], review_export_rows: [{ section: 'review', metric: 'pending', value: 1 }] },
  'cost-governance-closure-summary': { closure_status: 'pending', can_archive: false,
    totals: { blockers: 1, archive_rows: 1, warnings: 0 }, closure_checklist: [],
    closure_guidance: [], archive_rows: [{ section: 'closure', metric: 'pending', value: 1 }] },
  'cost-governance-handoff-summary': { handoff_status: 'pending', can_handoff: false,
    totals: { evidence_rows: 1, blockers: 1, warnings: 0, remediation_items: 0 },
    handoff_checklist: [], owner_summary: [], handoff_guidance: [],
    handoff_rows: [{ section: 'handoff', metric: 'pending', value: 1 }] }
};

async function fixtureProductCostEvidence(page: Page, overrides: Record<string, Record<string, unknown>> = {}) {
  await page.route('**/products/cost-*', route => {
    if (route.request().method() !== 'GET') return route.abort();
    const path = new URL(route.request().url()).pathname;
    const kind = path.split('/').pop() || '';
    return fulfillJson(route, overrides[kind] || costFixtures[kind] || {
      totals: {}, thresholds: {}, rows: [], top_products: [], products: [],
      issues: [], categories: [], breakdown: [], recommendations: [], actions: []
    });
  });
}

async function enterProductCostView(page: Page, tab: 'Cost & value' | 'Cost review' | 'Cost controls') {
  await page.getByRole('tab', { name: tab }).click();
  await expect(page.getByRole('heading', { name: tab === 'Cost & value' ? 'Cost & valuation'
    : tab === 'Cost review' ? 'Cost review' : 'Cost controls & audit' })).toBeVisible();
}

async function fixtureProductCostHistory(page: Page) {
  await page.route('**/products/pw-prod-01/cost-history?*', route => fulfillJson(route, {
    product: testProducts[0], cost_history: [], cost_summary: {}, pagination: { has_more: false }
  }));
  await page.route('**/products/pw-prod-01/standard-cost-history?*', route => fulfillJson(route, {
    product: testProducts[0], standard_cost_history: [], pagination: { has_more: false }
  }));
}

const costSection = (page: Page, heading: string) => page.locator('section').filter({
  has: page.getByRole('heading', { name: heading, exact: true })
}).first();

test.describe('Products — valuation category, cost detail and CSV evidence', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTenant(page);
    await fixtureProducts(page);
    await fixtureProductCostEvidence(page);
    await page.goto('/products');
    await enterProductCostView(page, 'Cost & value');
  });

  test('TPROD-064 category hotspot selects category for Products URL scope', async ({ page }) => {
    const section = costSection(page, 'Cost Valuation Summary');
    await expect(section.getByRole('row', { name: /Beverages/ })).toBeVisible();
    await section.getByRole('row', { name: /Beverages/ }).getByRole('button', { name: 'View Category' }).click();
    await expect(page).toHaveURL(/(?:\?|&)category=Beverages(?:&|$)/);
  });

  test('TPROD-065 valuation detail controls issue valuation_basis/search/sort/direction requests', async ({ page }) => {
    const section = costSection(page, 'Cost Valuation Summary');
    const request = page.waitForRequest(r => {
      if (!r.url().includes('/products/cost-valuation-details?')) return false;
      const p = new URL(r.url()).searchParams;
      return p.get('valuation_basis') === 'standard' && p.get('search') === 'Coffee'
        && p.get('sort') === 'name' && p.get('direction') === 'asc';
    });
    await section.locator('select').nth(0).selectOption('standard');
    await section.getByPlaceholder('Search product or category').fill('Coffee');
    await section.locator('select').nth(2).selectOption('name');
    await section.locator('select').nth(3).selectOption('asc');
    await request;
    await expect(section.getByPlaceholder('Search product or category')).toHaveValue('Coffee');
  });

  test('TPROD-066 valuation CSV exports the displayed received-cost detail records', async ({ page }) => {
    const section = costSection(page, 'Cost Valuation Summary');
    await expect(section.getByText('Synthetic Coffee Beans')).toBeVisible();
    const event = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Export Valuation CSV' }).click();
    expect((await event).suggestedFilename()).toBe('product-cost-valuation-details.csv');
  });

  test('TPROD-067 valuation record opens matching product audit history', async ({ page }) => {
    await fixtureProductCostHistory(page);
    const section = costSection(page, 'Cost Valuation Summary');
    await section.getByRole('row', { name: /Synthetic Coffee Beans/ }).getByRole('button', { name: 'Cost History' }).click();
    await expect(page.locator('#product-cost-history-panel').getByRole('heading', {
      name: 'Cost History for Synthetic Coffee Beans'
    })).toBeVisible();
  });
});

test.describe('Products — source-grounded cost risk/action controls', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTenant(page);
    await fixtureProducts(page);
    await fixtureProductCostEvidence(page);
    await page.goto('/products');
    await enterProductCostView(page, 'Cost review');
  });

  test('TPROD-068 a failed risk summary can recover through Refresh Risk', async ({ page }) => {
    await page.route('**/products/cost-risk-summary?*', route => fulfillJson(route,
      { error: { message: 'Synthetic risk unavailable' } }, 503));
    const section = costSection(page, 'Cost Risk Summary');
    await section.getByRole('button', { name: 'Refresh Risk' }).click();
    await expect(section.getByText('Unable to load cost risk summary.')).toBeVisible();
    await page.route('**/products/cost-risk-summary?*', route => fulfillJson(route, costFixtures['cost-risk-summary']));
    await section.getByRole('button', { name: 'Refresh Risk' }).click();
    await expect(section.getByText('Stocked products with no received or standard cost')).toBeVisible();
  });

  test('TPROD-069 risk detail filters produce scoped threshold/type/search/order request', async ({ page }) => {
    const section = costSection(page, 'Cost Risk Summary');
    const req = page.waitForRequest(r => {
      if (!r.url().includes('/products/cost-risk-details?')) return false;
      const p = new URL(r.url()).searchParams;
      return p.get('variance_threshold_percent') === '20' && p.get('history_spread_threshold_percent') === '25'
        && p.get('risk_type') === 'missing_cost' && p.get('search') === 'Coffee'
        && p.get('sort') === 'name' && p.get('direction') === 'asc';
    });
    await section.locator('select').nth(0).selectOption('missing_cost');
    await section.getByPlaceholder('Search product or category').fill('Coffee');
    await section.locator('select').nth(1).selectOption('name');
    await section.locator('select').nth(2).selectOption('asc');
    await req;
    await expect(section.locator('select').nth(0)).toHaveValue('missing_cost');
  });

  test('TPROD-070 nonempty risk details export CSV from filtered evidence', async ({ page }) => {
    const section = costSection(page, 'Cost Risk Summary');
    await expect(section.getByRole('row', { name: /Synthetic Coffee Beans/ })).toBeVisible();
    const event = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Export Risk CSV' }).click();
    expect((await event).suggestedFilename()).toBe('product-cost-risk-details.csv');
  });

  test('TPROD-071 cost action filters preserve chosen type/search/sort/order in the API request', async ({ page }) => {
    const section = costSection(page, 'Cost Action Detail');
    const req = page.waitForRequest(r => {
      if (!r.url().includes('/products/cost-action-details?')) return false;
      const p = new URL(r.url()).searchParams;
      return p.get('action_type') === 'capture_missing_cost' && p.get('search') === 'Coffee'
        && p.get('sort') === 'name' && p.get('direction') === 'asc';
    });
    await section.locator('select').nth(0).selectOption('capture_missing_cost');
    await section.getByPlaceholder('Search product or category').fill('Coffee');
    await section.locator('select').nth(2).selectOption('name');
    await section.locator('select').nth(3).selectOption('asc');
    await req;
    await expect(section.locator('select').nth(0)).toHaveValue('capture_missing_cost');
  });

  test('TPROD-072 nonempty costing action worklist exports CSV with expected filename', async ({ page }) => {
    const section = costSection(page, 'Cost Action Detail');
    await expect(section.getByRole('row', { name: /Synthetic Coffee Beans/ })).toBeVisible();
    const event = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Export Action CSV' }).click();
    expect((await event).suggestedFilename()).toBe('product-cost-action-details.csv');
  });
});

test.describe('Products — cost controls reporting and governance review evidence', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTenant(page);
    await fixtureProducts(page);
    await fixtureProductCostEvidence(page);
    await page.goto('/products');
    await enterProductCostView(page, 'Cost controls');
  });

  test('TPROD-073 cost report exports evidence rows to source-defined CSV', async ({ page }) => {
    const section = costSection(page, 'Cost Report Summary');
    await expect(section.getByText('Reconcile missing cost evidence')).toBeVisible();
    const event = page.waitForEvent('download');
    await section.getByRole('button', { name: 'Export Report CSV' }).click();
    expect((await event).suggestedFilename()).toBe('product-cost-report-summary.csv');
  });

  test('TPROD-074 nonempty governance audit pack provides its original audit CSV export', async ({ page }) => {
    await expect(page.getByText('Synthetic finance review')).toBeVisible();
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Audit CSV' }).click();
    expect((await event).suggestedFilename()).toBe('product-cost-governance-audit-pack.csv');
  });

  test('TPROD-075 governance audit print invokes browser print only with loaded pack', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Print Audit Pack' })).toBeEnabled();
    await page.evaluate(() => { (window as Window & { __pwPrintCalled?: number }).__pwPrintCalled = 0;
      window.print = () => { (window as Window & { __pwPrintCalled?: number }).__pwPrintCalled! += 1; }; });
    await page.getByRole('button', { name: 'Print Audit Pack' }).click();
    expect(await page.evaluate(() => (window as Window & { __pwPrintCalled?: number }).__pwPrintCalled)).toBe(1);
  });

  test('TPROD-076 Refresh Governance refetches operator-facing summary', async ({ page }) => {
    // The governance query enables after the hardening and report reads settle.
    await expect(page.getByText('Stocked products with cost basis')).toBeVisible();
    let reads = 0;
    await page.route('**/products/cost-governance-summary?*', route => {
      reads += 1;
      return fulfillJson(route, costFixtures['cost-governance-summary']);
    });
    // This subtitle is already visible and occurs in the governance StatCard.
    // StatCard only renders divs; its nearest section is precisely the outer
    // ProductCostGovernanceSummaryPanel. No translated heading is required.
    const governancePanel = page.getByText('Stocked products with cost basis', { exact: true })
      .locator('xpath=ancestor::section[1]');
    await expect(governancePanel).toHaveCount(1);
    const button = governancePanel.locator(':scope > div').first().locator(':scope > button[type="button"]');
    await expect(button).toHaveCount(1);
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
    await button.click();
    await expect.poll(() => reads).toBeGreaterThanOrEqual(1);
  });

  test('TPROD-077 human-review queue renders sourced queue counts and reviewer guidance', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Governance review queue' })).toBeVisible();
    await expect(page.getByText('Synthetic missing cost')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Reviewer guidance' })).toBeVisible();
    await expect(page.getByText('Synthetic reviewer guidance')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export Review Pack CSV' })).toBeEnabled();
  });

  test('TPROD-078 absent review/closure/handoff rows disable all three supporting CSV controls', async ({ page }) => {
    await page.route('**/products/cost-governance-review-pack?*', route => fulfillJson(route,
      { ...costFixtures['cost-governance-review-pack'], review_export_rows: [] }));
    await page.route('**/products/cost-governance-closure-summary?*', route => fulfillJson(route,
      { ...costFixtures['cost-governance-closure-summary'], archive_rows: [] }));
    await page.route('**/products/cost-governance-handoff-summary?*', route => fulfillJson(route,
      { ...costFixtures['cost-governance-handoff-summary'], handoff_rows: [] }));
    await page.reload();
    await expect(page.getByRole('button', { name: 'Export Handoff CSV' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export Review Pack CSV' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Export Closure CSV' })).toBeDisabled();
  });
});
