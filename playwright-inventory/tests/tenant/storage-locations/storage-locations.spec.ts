import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';
import { loginAsDisposableRole } from '../../../support/roleSession';

// Batch 46 — actual /storage-locations route, StorageLocationsPage.tsx, tenant
// storage locations backend and location directory URL utilities.
// Each intercepted write is a synthetic HTTP response, NOT a persistence test.
const mainId = '11111111-1111-4111-8111-111111111111';
const coldId = '22222222-2222-4222-8222-222222222222';
const customId = '33333333-3333-4333-8333-333333333333';
const main = { id: mainId, name: 'Main Warehouse', temperature_zone: 'Ambient', version: 4,
  stock_position_count: 5, nonzero_stock_position_count: 3, low_stock_position_count: 2, created_at: '2026-10-01T09:00:00Z' };
const cold = { id: coldId, name: 'Cold Room', temperature_zone: 'Chilled', version: 2,
  stock_position_count: 0, nonzero_stock_position_count: 0, low_stock_position_count: 0, created_at: '2026-10-02T09:00:00Z' };
const custom = { id: customId, name: 'Archive Section', temperature_zone: 'Special Cool', version: 1,
  stock_position_count: 0, nonzero_stock_position_count: 0, low_stock_position_count: 0, created_at: '2026-10-03T09:00:00Z' };
type Call = { path: string; method: string; headers: Record<string, string>; body: Record<string, unknown> | null };
type Setup = { items?: unknown[]; role?: 'PW_STORAGE_READ_ONLY' | 'PW_STORAGE_NO_STOCK';
  failGet?: boolean; failNextRefresh?: boolean; failPost?: boolean; failPatch?: boolean; failDelete?: boolean;
  postResponse?: unknown; calls?: Call[]; target?: string };
const locRow = (page: Page, name: string) => page.getByRole('row').filter({ hasText: name });
const form = (page: Page) => page.locator('#storage-location-form-panel');
async function openLocations(page: Page, opts: Setup = {}) {
  if (opts.role) await loginAsDisposableRole(page, opts.role);
  else await loginAsTenant(page);
  const calls = opts.calls ?? [];
  let reads = 0;
  await page.route('**/storage-locations**', async (route: Route) => {
    if (route.request().isNavigationRequest()) return route.continue();
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api(?=\/)/, '');
    if (path !== '/storage-locations' && !path.startsWith('/storage-locations/')) return route.continue();
    const method = route.request().method();
    let body: Record<string, unknown> | null = null;
    try { body = route.request().postDataJSON(); } catch { /* no JSON body for GET/DELETE */ }
    calls.push({ path, method, headers: route.request().headers(), body });
    if (method === 'GET') {
      reads += 1;
      if (opts.failGet || (opts.failNextRefresh && reads > 1)) return fulfillJson(route, { message: 'Fixture locations unavailable' }, 503);
      return fulfillJson(route, opts.items ?? [main, cold, custom]);
    }
    if (method === 'POST') return fulfillJson(route, opts.failPost ? { code: 'STORAGE_LOCATION_ALREADY_EXISTS', message: 'Fixture duplicate from server' } : (opts.postResponse ?? main), opts.failPost ? 409 : 201);
    if (method === 'PATCH') return fulfillJson(route, opts.failPatch ? { message: 'Fixture version conflict' } : { ...main, ...body }, opts.failPatch ? 409 : 200);
    if (method === 'DELETE') return fulfillJson(route, opts.failDelete ? { code: 'STORAGE_LOCATION_IN_USE', message: 'Fixture dependent inventory prevents retirement', details: { blockers: [{ key: 'stock' }] } } : { message: 'Retired' }, opts.failDelete ? 409 : 200);
    return route.continue();
  });
  await page.goto(opts.target ?? '/storage-locations');
  await expect(page.getByRole('heading', { name: 'Storage location workspace' })).toBeVisible();
  return { calls };
}
const mutations = (calls: Call[]) => calls.filter(c => c.method !== 'GET');

test.describe('Storage Locations — source-observable directory and lifecycle (Batch 46)', () => {
  test('TSL-001 Route renders workspace and active location rows from GET', async ({ page }) => {
    const { calls } = await openLocations(page);
    await expect(locRow(page, 'Main Warehouse')).toBeVisible();
    await expect(locRow(page, 'Cold Room')).toBeVisible();
    expect(calls.filter(c => c.path === '/storage-locations' && c.method === 'GET')).toHaveLength(1);
  });
  test('TSL-002 Empty successful list reports no active locations without inventing rows', async ({ page }) => {
    await openLocations(page, { items: [] });
    await expect(page.getByText('No active storage locations exist yet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Filters' })).toBeDisabled();
  });
  test('TSL-003 Failed GET shows unavailable state, not an empty success message', async ({ page }) => {
    await openLocations(page, { failGet: true });
    await expect(page.getByText('Storage locations are unavailable because the location list could not be loaded.')).toBeVisible();
    await expect(page.getByText('No active storage locations exist yet.')).toHaveCount(0);
  });
  test('TSL-004 Recognized zone appears without classification warning', async ({ page }) => {
    await openLocations(page, { items: [main] });
    await expect(locRow(page, 'Main Warehouse')).toContainText('Ambient');
    await expect(locRow(page, 'Main Warehouse').getByText('Review condition classification')).toHaveCount(0);
  });
  test('TSL-005 Unknown condition is visibly flagged without hiding its location', async ({ page }) => {
    await openLocations(page, { items: [custom] });
    await expect(locRow(page, 'Archive Section')).toContainText('Special Cool');
    await expect(locRow(page, 'Archive Section')).toContainText('Review condition classification');
  });
  test('TSL-006 Name substring search filters other locations locally', async ({ page }) => {
    await openLocations(page);
    await page.getByLabel('Search locations').fill('warehouse');
    await expect(locRow(page, 'Main Warehouse')).toBeVisible();
    await expect(locRow(page, 'Cold Room')).toHaveCount(0);
  });
  test('TSL-007 Search matches the condition label when the name does not', async ({ page }) => {
    await openLocations(page);
    await page.getByLabel('Search locations').fill('chilled');
    await expect(locRow(page, 'Cold Room')).toBeVisible();
    await expect(locRow(page, 'Main Warehouse')).toHaveCount(0);
  });
  test('TSL-008 Prefix match precedes substring match in search ranking', async ({ page }) => {
    await openLocations(page, { items: [
      { ...main, id: 'pw-middle', name: 'Secondary Main Warehouse' },
      { ...cold, name: 'Main Cold Room' }
    ] });
    await page.getByLabel('Search locations').fill('main');
    await expect(page.getByRole('table').getByRole('row').nth(1)).toContainText('Main Cold Room');
  });
  test('TSL-009 Search input synchronizes to URL and survives a browser reload', async ({ page }) => {
    await openLocations(page);
    await page.getByLabel('Search locations').fill('Cold');
    await expect(page).toHaveURL(/search=Cold/);
    await page.reload();
    await expect(page.getByLabel('Search locations')).toHaveValue('Cold');
    await expect(locRow(page, 'Cold Room')).toBeVisible();
  });
  test('TSL-010 location_id deep link selects only the exact linked row', async ({ page }) => {
    await openLocations(page, { target: `/storage-locations?location_id=${coldId}` });
    await expect(locRow(page, 'Cold Room')).toBeVisible();
    await expect(locRow(page, 'Main Warehouse')).toHaveCount(0);
  });
  test('TSL-011 Unknown location_id shows location not found without revealing the full list', async ({ page }) => {
    await openLocations(page, { target: '/storage-locations?location_id=missing' });
    await expect(page.getByText('Storage location not found').first()).toBeVisible();
    await expect(locRow(page, 'Main Warehouse')).toHaveCount(0);
  });
  test('TSL-012 Changing search while linked to an exact ID restores directory filtering', async ({ page }) => {
    await openLocations(page, { target: `/storage-locations?location_id=${coldId}` });
    await page.getByLabel('Search locations').fill('warehouse');
    await expect(page).not.toHaveURL(/location_id=/);
    await expect(locRow(page, 'Main Warehouse')).toBeVisible();
  });
  test('TSL-013 Storage condition filter uses exact selected zone', async ({ page }) => {
    await openLocations(page);
    await page.locator('#storage-location-zone-filter').selectOption('Chilled');
    await expect(locRow(page, 'Cold Room')).toBeVisible();
    await expect(locRow(page, 'Main Warehouse')).toHaveCount(0);
    await expect(page).toHaveURL(/zone=Chilled/);
  });
  test('TSL-014 Clear Filters resets both local search and zone and restores list', async ({ page }) => {
    await openLocations(page);
    await page.getByLabel('Search locations').fill('main');
    await page.locator('#storage-location-zone-filter').selectOption('Ambient');
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(page.getByLabel('Search locations')).toHaveValue('');
    await expect(locRow(page, 'Cold Room')).toBeVisible();
  });
  test('TSL-015 Clear Filters removes exact linked location ID rather than leaving list pinned', async ({ page }) => {
    await openLocations(page, { target: `/storage-locations?location_id=${mainId}` });
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(page).not.toHaveURL(/location_id=/);
    await expect(locRow(page, 'Cold Room')).toBeVisible();
  });
  test('TSL-016 Required name prevents empty create submission in the browser', async ({ page }) => {
    const { calls } = await openLocations(page);
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect(form(page).getByLabel('Name')).toBeInvalid();
    expect(mutations(calls)).toHaveLength(0);
  });
  test('TSL-017 Create trims name and sends null for unselected condition', async ({ page }) => {
    const { calls } = await openLocations(page);
    await form(page).getByLabel('Name').fill('  Fixture Dock  ');
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect.poll(() => calls.filter(c => c.method === 'POST').length).toBe(1);
    expect(calls.find(c => c.method === 'POST')?.body).toMatchObject({ name: 'Fixture Dock', temperature_zone: null });
    await expect(page.getByText('Storage location created successfully.')).toBeVisible();
  });
  test('TSL-018 Duplicate existing name is stopped before POST regardless of casing', async ({ page }) => {
    const { calls } = await openLocations(page);
    await form(page).getByLabel('Name').fill('  main warehouse  ');
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect(form(page)).toContainText('already exists.');
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0);
  });
  test('TSL-019 Custom condition becomes a real field and is saved in request payload', async ({ page }) => {
    const { calls } = await openLocations(page);
    await form(page).getByLabel('Name').fill('Fixture Vault');
    await form(page).getByLabel('Storage Condition').selectOption('__custom_condition__');
    await form(page).getByLabel('Custom storage condition').fill('  Humidity 22 percent  ');
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect.poll(() => calls.filter(c => c.method === 'POST').length).toBe(1);
    expect(calls.find(c => c.method === 'POST')?.body).toMatchObject({ temperature_zone: 'Humidity 22 percent' });
  });
  test('TSL-020 Empty custom condition fails native required validation', async ({ page }) => {
    const { calls } = await openLocations(page);
    await form(page).getByLabel('Name').fill('Fixture Vault');
    await form(page).getByLabel('Storage Condition').selectOption('__custom_condition__');
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect(form(page).getByLabel('Custom storage condition')).toBeInvalid();
    expect(calls.filter(c => c.method === 'POST')).toHaveLength(0);
  });
  test('TSL-021 Name and custom condition enforce source-defined maximum lengths', async ({ page }) => {
    await openLocations(page);
    await expect(form(page).getByLabel('Name')).toHaveAttribute('maxlength', '255');
    await form(page).getByLabel('Storage Condition').selectOption('__custom_condition__');
    await expect(form(page).getByLabel('Custom storage condition')).toHaveAttribute('maxlength', '100');
  });
  test('TSL-022 Edit action loads the selected name and enters explicit update mode', async ({ page }) => {
    await openLocations(page);
    await locRow(page, 'Main Warehouse').getByRole('button', { name: 'Edit' }).click();
    await expect(form(page).getByRole('heading', { name: 'Edit Storage Location' })).toBeVisible();
    await expect(form(page).getByLabel('Name')).toHaveValue('Main Warehouse');
    await expect(form(page).getByLabel('Storage Condition')).toHaveValue('Ambient');
  });
  test('TSL-023 Update sends PATCH with explicit If-Match-Version of edited row', async ({ page }) => {
    const { calls } = await openLocations(page);
    await locRow(page, 'Main Warehouse').getByRole('button', { name: 'Edit' }).click();
    await form(page).getByLabel('Name').fill('Warehouse Revised');
    await form(page).getByRole('button', { name: 'Update Storage Location' }).click();
    await expect.poll(() => calls.filter(c => c.method === 'PATCH').length).toBe(1);
    const update = calls.find(c => c.method === 'PATCH');
    expect(update?.path).toBe(`/storage-locations/${mainId}`);
    expect(update?.headers['if-match-version']).toBe('4');
    expect(update?.body).toMatchObject({ name: 'Warehouse Revised' });
  });
  test('TSL-024 Cancel Edit resets form and does not issue any PATCH', async ({ page }) => {
    const { calls } = await openLocations(page);
    await locRow(page, 'Cold Room').getByRole('button', { name: 'Edit' }).click();
    await form(page).getByLabel('Name').fill('Do not save this');
    await form(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(form(page).getByRole('heading', { name: 'Create Storage Location' })).toBeVisible();
    await expect(form(page).getByLabel('Name')).toHaveValue('');
    expect(calls.filter(c => c.method === 'PATCH')).toHaveLength(0);
  });
  test('TSL-025 Refusing native Retire confirmation sends no DELETE', async ({ page }) => {
    const { calls } = await openLocations(page);
    page.once('dialog', dialog => dialog.dismiss());
    await locRow(page, 'Cold Room').getByRole('button', { name: 'Retire' }).click();
    expect(calls.filter(c => c.method === 'DELETE')).toHaveLength(0);
    await expect(locRow(page, 'Cold Room')).toBeVisible();
  });
  test('TSL-026 Confirming Retire sends expected revision as If-Match-Version', async ({ page }) => {
    const { calls } = await openLocations(page);
    page.once('dialog', dialog => dialog.accept());
    await locRow(page, 'Cold Room').getByRole('button', { name: 'Retire' }).click();
    await expect.poll(() => calls.filter(c => c.method === 'DELETE').length).toBe(1);
    const action = calls.find(c => c.method === 'DELETE');
    expect(action?.path).toBe(`/storage-locations/${coldId}`);
    expect(action?.headers['if-match-version']).toBe('2');
  });
  test('TSL-027 Dependency-blocked retirement shows rejection rather than success', async ({ page }) => {
    const { calls } = await openLocations(page, { failDelete: true });
    page.once('dialog', dialog => dialog.accept());
    await locRow(page, 'Cold Room').getByRole('button', { name: 'Retire' }).click();
    await expect.poll(() => calls.filter(c => c.method === 'DELETE').length).toBe(1);
    await expect(form(page)).toContainText('This location cannot be retired until these active dependencies are resolved:');
    await expect(form(page)).not.toContainText('Storage location retired successfully.');
  });
  test('TSL-028 Server create conflict retains the draft and exposes an error', async ({ page }) => {
    await openLocations(page, { failPost: true });
    await form(page).getByLabel('Name').fill('Fixture Conflict');
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect(form(page)).toContainText('A storage location with this name already exists.');
    await expect(form(page).getByLabel('Name')).toHaveValue('Fixture Conflict');
  });
  test('TSL-029 Refresh Locations reports success after successful refetch', async ({ page }) => {
    const { calls } = await openLocations(page);
    await page.getByRole('button', { name: 'Refresh Locations' }).click();
    await expect.poll(() => calls.filter(c => c.method === 'GET').length).toBeGreaterThan(1);
    await expect(page.getByRole('status').filter({ hasText: 'Storage locations refreshed.' })).toBeVisible();
  });
  test('TSL-030 Failed refresh reports error and does not falsely report refreshed', async ({ page }) => {
    await openLocations(page, { failNextRefresh: true });
    await page.getByRole('button', { name: 'Refresh Locations' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Unable to refresh storage locations.' })).toBeVisible();
    await expect(page.getByText('Storage locations refreshed.')).toHaveCount(0);
  });
  test('TSL-031 Read-only role can see location directory but has no write controls', async ({ page }) => {
    const { calls } = await openLocations(page, { role: 'PW_STORAGE_READ_ONLY' });
    await expect(locRow(page, 'Main Warehouse')).toContainText('Read only');
    await expect(form(page).getByLabel('Name')).toBeDisabled();
    await expect(form(page).getByRole('button', { name: 'Create Storage Location' })).toBeDisabled();
    await expect(locRow(page, 'Main Warehouse').getByRole('button', { name: 'Retire' })).toHaveCount(0);
    expect(mutations(calls)).toHaveLength(0);
  });
});

// Batch 47: nine previously inventoried Storage Locations scenarios.
// HTTP stubs exercise observable UI only; they do not verify persistence, ACL enforcement or a real import.
test.describe('Storage Locations — CSV imports, stock redaction and URL preservation (Batch 47)', () => {
  const csvPanel = (page: Page) => page.getByRole('region', { name: 'Bulk Storage Location Import' });
  const csvInput = (page: Page) => csvPanel(page).locator('input[type="file"]');
  const upload = async (page: Page, contents: string) => {
    await csvInput(page).setInputFiles({ name: 'locations-fixture.csv', mimeType: 'text/csv', buffer: Buffer.from(contents) });
    await expect(csvPanel(page).getByRole('status').filter({ hasText: 'row loaded' })).toBeVisible();
  };
  const previewBatch = (status: 'validated' | 'invalid') => ({
    id: 'fixture-import-47', tenant_id: 'fixture-tenant', import_type: 'storage_locations', status,
    source_filename: 'locations-fixture.csv', row_count: 1,
    valid_row_count: status === 'validated' ? 1 : 0, invalid_row_count: status === 'invalid' ? 1 : 0,
    normalized_rows: status === 'validated' ? [{ name: 'Fixture New Shelf', temperature_zone: 'Ambient' }] : [],
    validation_errors: status === 'invalid' ? [{ row_number: 2, field: 'name', code: 'NAME_REQUIRED', message: 'Storage location name is required.' }] : [],
    version: 1
  });
  test('TSL-032 Read-only role cannot validate or commit bulk Storage Location CSV', async ({ page }) => {
    const { calls } = await openLocations(page, { role: 'PW_STORAGE_READ_ONLY' });
    await expect(csvPanel(page).getByRole('button', { name: 'Choose file' })).toBeDisabled();
    await expect(csvPanel(page).getByRole('button', { name: 'Validate CSV' })).toBeDisabled();
    await expect(csvPanel(page).getByRole('button', { name: 'Commit Validated Import' })).toBeDisabled();
    expect(mutations(calls)).toHaveLength(0);
  });
  test('TSL-033 CSV template download includes name and temperature_zone columns', async ({ page }) => {
    await openLocations(page);
    const result = page.waitForEvent('download');
    await csvPanel(page).getByRole('button', { name: 'Download CSV Template' }).click();
    const download = await result;
    expect(download.suggestedFilename()).toBe('storage_locations-import-template.csv');
    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();
    let contents = '';
    for await (const chunk of stream!) contents += chunk.toString();
    expect(contents).toContain('name,temperature_zone');
  });
  test('TSL-034 CSV preview reports a missing mandatory name in a specific row', async ({ page }) => {
    await openLocations(page);
    await page.route('**/inventory-imports/preview', async (route) => fulfillJson(route, previewBatch('invalid')));
    await upload(page, 'name,temperature_zone\n,Ambient\n');
    await csvPanel(page).getByRole('button', { name: 'Validate CSV' }).click();
    await expect(csvPanel(page).getByText('Storage location name is required.')).toBeVisible();
    await expect(csvPanel(page).getByRole('button', { name: 'Commit Validated Import' })).toBeDisabled();
  });
  test('TSL-035 Validated CSV preview only claims committed after confirmation and server success', async ({ page }) => {
    await openLocations(page);
    const writes: string[] = [];
    await page.route('**/inventory-imports/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      writes.push(path);
      return fulfillJson(route, path.endsWith('/preview') ? previewBatch('validated') : { ...previewBatch('validated'), status: 'committed', version: 2 });
    });
    await upload(page, 'name,temperature_zone\nFixture New Shelf,Ambient\n');
    await csvPanel(page).getByRole('button', { name: 'Validate CSV' }).click();
    await expect(csvPanel(page).getByText(/No inventory data has changed yet/)).toBeVisible();
    page.once('dialog', dialog => dialog.accept());
    await csvPanel(page).getByRole('button', { name: 'Commit Validated Import' }).click();
    await expect(csvPanel(page).getByRole('status').filter({ hasText: 'Import committed successfully.' })).toBeVisible();
    expect(writes.some(path => path.endsWith('/fixture-import-47/commit'))).toBeTruthy();
  });
  test('TSL-036 Failed CSV commit never displays committed feedback', async ({ page }) => {
    await openLocations(page);
    await page.route('**/inventory-imports/**', async (route) => {
      if (new URL(route.request().url()).pathname.endsWith('/preview')) return fulfillJson(route, previewBatch('validated'));
      return fulfillJson(route, { message: 'Fixture conflicting import batch' }, 409);
    });
    await upload(page, 'name,temperature_zone\nFixture New Shelf,Ambient\n');
    await csvPanel(page).getByRole('button', { name: 'Validate CSV' }).click();
    page.once('dialog', dialog => dialog.accept());
    await csvPanel(page).getByRole('button', { name: 'Commit Validated Import' }).click();
    await expect(csvPanel(page).getByText('Fixture conflicting import batch')).toBeVisible();
    await expect(csvPanel(page).getByText('Import committed successfully.')).toHaveCount(0);
  });
  test('TSL-037 Stock-restricted role sees names without stock counts', async ({ page }) => {
    await openLocations(page, { role: 'PW_STORAGE_NO_STOCK' });
    await expect(locRow(page, 'Main Warehouse')).toContainText('Current stock information is not available to this role.');
    await expect(locRow(page, 'Main Warehouse')).not.toContainText('low-stock');
    await expect(locRow(page, 'Cold Room')).toBeVisible();
  });
  test('TSL-038 Stock use distinguishes low-stock, positions without low stock and zero positions', async ({ page }) => {
    await openLocations(page, { items: [main, { ...cold, id: 'no-low', name: 'No Low Stock', stock_position_count: 2, nonzero_stock_position_count: 2, low_stock_position_count: 0 }, cold] });
    await expect(locRow(page, 'Main Warehouse')).toContainText('low-stock');
    await expect(locRow(page, 'No Low Stock')).toContainText('No low-stock positions');
    await expect(locRow(page, 'Cold Room')).toContainText('No stock positions');
  });
  test('TSL-039 Stale version PATCH rejection retains the draft and avoids success', async ({ page }) => {
    const { calls } = await openLocations(page, { failPatch: true });
    await locRow(page, 'Main Warehouse').getByRole('button', { name: 'Edit' }).click();
    await form(page).getByLabel('Name').fill('Review Me Again');
    await form(page).getByRole('button', { name: 'Update Storage Location' }).click();
    await expect.poll(() => calls.filter(c => c.method === 'PATCH').length).toBe(1);
    await expect(form(page).getByLabel('Name')).toHaveValue('Review Me Again');
    await expect(form(page).locator('.app-error-state, .form-error')).not.toHaveCount(0);
    await expect(form(page)).not.toContainText('Storage location updated successfully.');
  });
  test('TSL-040 Search and zone updates preserve unrelated query parameters', async ({ page }) => {
    await openLocations(page, { target: '/storage-locations?source=fixture&location_id=' + coldId });
    await page.getByLabel('Search locations').fill('warehouse');
    await page.locator('#storage-location-zone-filter').selectOption('Ambient');
    await expect(page).toHaveURL(/source=fixture/);
    await expect(page).toHaveURL(/search=warehouse/);
    await expect(page).toHaveURL(/zone=Ambient/);
    await expect(page).not.toHaveURL(/location_id=/);
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(page).toHaveURL(/source=fixture/);
    await expect(page).not.toHaveURL(/search=|zone=/);
  });
});

// Batch 170 — static, source-anchored Tenant Storage Locations browser assertions.
// Synthetic HTTP stubs verify UI behavior only; backend permissions/persistence remain deferred.
test.describe('Storage Locations — directory and lifecycle boundary coverage (Batch 170)', () => {
  test('TSL-041 Missing storage condition is flagged and kept visible in the directory', async ({ page }) => {
    await openLocations(page, { items: [{ ...main, temperature_zone: null }] });
    await expect(locRow(page, 'Main Warehouse')).toContainText('Not classified');
    await expect(locRow(page, 'Main Warehouse')).toContainText('Review condition classification');
  });
  test('TSL-042 Condition filter options deduplicate labels case-insensitively', async ({ page }) => {
    await openLocations(page, { items: [main, { ...cold, temperature_zone: 'ambient' }, custom] });
    const options = await page.locator('#storage-location-zone-filter option').allTextContents();
    expect(options.filter(value => value.toLocaleLowerCase() === 'ambient')).toHaveLength(1);
    await expect(page.locator('#storage-location-zone-filter')).toContainText('Special Cool');
  });
  test('TSL-043 Combined search and condition filter require both conditions', async ({ page }) => {
    await openLocations(page);
    await page.getByLabel('Search locations').fill('room');
    await page.locator('#storage-location-zone-filter').selectOption('Chilled');
    await expect(locRow(page, 'Cold Room')).toBeVisible();
    await expect(locRow(page, 'Main Warehouse')).toHaveCount(0);
    await page.locator('#storage-location-zone-filter').selectOption('Ambient');
    await expect(page.getByText('No storage locations match the current search and zone filters.')).toBeVisible();
  });
  test('TSL-044 Clearing search preserves an independently selected condition filter', async ({ page }) => {
    await openLocations(page);
    await page.locator('#storage-location-zone-filter').selectOption('Chilled');
    await page.getByLabel('Search locations').fill('No match');
    await page.getByLabel('Search locations').fill('');
    await expect(locRow(page, 'Cold Room')).toBeVisible();
    await expect(locRow(page, 'Main Warehouse')).toHaveCount(0);
    await expect(page).toHaveURL(/zone=Chilled/);
  });
  test('TSL-045 Changing condition on an exact deep link leaves pinned mode', async ({ page }) => {
    await openLocations(page, { target: `/storage-locations?location_id=${mainId}&origin=inventory` });
    await page.locator('#storage-location-zone-filter').selectOption('Chilled');
    await expect(page).not.toHaveURL(/location_id=/);
    await expect(page).toHaveURL(/origin=inventory/);
    await expect(locRow(page, 'Cold Room')).toBeVisible();
    await expect(locRow(page, 'Main Warehouse')).toHaveCount(0);
  });
  test('TSL-046 Explicit location ID takes precedence over conflicting directory filters', async ({ page }) => {
    await openLocations(page, { target: `/storage-locations?location_id=${mainId}&search=cold&zone=Chilled` });
    await expect(locRow(page, 'Main Warehouse')).toBeVisible();
    await expect(locRow(page, 'Cold Room')).toHaveCount(0);
  });
  test('TSL-047 Name substring outranks a matching storage-condition prefix', async ({ page }) => {
    await openLocations(page, { items: [
      { ...cold, name: 'Cooler Annex', temperature_zone: 'Frozen' },
      { ...main, name: 'East Cooler Annex', temperature_zone: 'Ambient' },
      { ...custom, name: 'Archive Section', temperature_zone: 'Cool' }
    ] });
    await page.getByLabel('Search locations').fill('cool');
    await expect(page.getByRole('table').getByRole('row').nth(1)).toContainText('Cooler Annex');
    await expect(page.getByRole('table').getByRole('row').nth(2)).toContainText('East Cooler Annex');
  });
  test('TSL-048 Standard condition is posted without the custom-condition sentinel', async ({ page }) => {
    const { calls } = await openLocations(page);
    await form(page).getByLabel('Name').fill('Standard Zone Annex');
    await form(page).getByLabel('Storage Condition').selectOption('Frozen');
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect.poll(() => calls.filter(call => call.method === 'POST').length).toBe(1);
    expect(calls.find(call => call.method === 'POST')?.body).toMatchObject({ name: 'Standard Zone Annex', temperature_zone: 'Frozen' });
    await expect(form(page).getByLabel('Custom storage condition')).toHaveCount(0);
  });
  test('TSL-049 Switching from custom condition to not specified posts null', async ({ page }) => {
    const { calls } = await openLocations(page);
    await form(page).getByLabel('Name').fill('Condition Reset Annex');
    await form(page).getByLabel('Storage Condition').selectOption('__custom_condition__');
    await form(page).getByLabel('Custom storage condition').fill('Special Deep Freeze');
    await form(page).getByLabel('Storage Condition').selectOption('');
    await expect(form(page).getByLabel('Custom storage condition')).toHaveCount(0);
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect.poll(() => calls.filter(call => call.method === 'POST').length).toBe(1);
    expect(calls.find(call => call.method === 'POST')?.body).toMatchObject({ temperature_zone: null });
  });
  test('TSL-050 Editing a custom-zone location restores its free-text condition', async ({ page }) => {
    await openLocations(page);
    await locRow(page, 'Archive Section').getByRole('button', { name: 'Edit' }).click();
    await expect(form(page).getByLabel('Storage Condition')).toHaveValue('__custom_condition__');
    await expect(form(page).getByLabel('Custom storage condition')).toHaveValue('Special Cool');
  });
  test('TSL-051 Editing custom condition into a standard value sends a standard PATCH', async ({ page }) => {
    const { calls } = await openLocations(page);
    await locRow(page, 'Archive Section').getByRole('button', { name: 'Edit' }).click();
    await form(page).getByLabel('Storage Condition').selectOption('Refrigerated');
    await expect(form(page).getByLabel('Custom storage condition')).toHaveCount(0);
    await form(page).getByRole('button', { name: 'Update Storage Location' }).click();
    await expect.poll(() => calls.filter(call => call.method === 'PATCH').length).toBe(1);
    expect(calls.find(call => call.method === 'PATCH')?.body).toMatchObject({ temperature_zone: 'Refrigerated' });
  });
  test('TSL-052 An unchanged own name is not incorrectly rejected as duplicate during edit', async ({ page }) => {
    const { calls } = await openLocations(page);
    await locRow(page, 'Main Warehouse').getByRole('button', { name: 'Edit' }).click();
    await form(page).getByRole('button', { name: 'Update Storage Location' }).click();
    await expect.poll(() => calls.filter(call => call.method === 'PATCH').length).toBe(1);
    await expect(form(page)).not.toContainText('already exists.');
  });
  test('TSL-053 Renaming a location to another location name blocks PATCH locally', async ({ page }) => {
    const { calls } = await openLocations(page);
    await locRow(page, 'Cold Room').getByRole('button', { name: 'Edit' }).click();
    await form(page).getByLabel('Name').fill(' MAIN WAREHOUSE ');
    await form(page).getByRole('button', { name: 'Update Storage Location' }).click();
    await expect(form(page)).toContainText('already exists.');
    expect(calls.filter(call => call.method === 'PATCH')).toHaveLength(0);
  });
  test('TSL-054 Failed update retains edited draft and error without claiming success', async ({ page }) => {
    const { calls } = await openLocations(page, { failPatch: true });
    await locRow(page, 'Main Warehouse').getByRole('button', { name: 'Edit' }).click();
    await form(page).getByLabel('Name').fill('Pending Update Draft');
    await form(page).getByRole('button', { name: 'Update Storage Location' }).click();
    await expect.poll(() => calls.filter(call => call.method === 'PATCH').length).toBe(1);
    await expect(form(page).getByLabel('Name')).toHaveValue('Pending Update Draft');
    await expect(form(page).getByRole('heading', { name: 'Edit Storage Location' })).toBeVisible();
    await expect(form(page)).toContainText('Failed to update storage location.');
    await expect(form(page)).not.toContainText('Storage location updated successfully.');
  });
  test('TSL-055 Selecting a different edit row replaces the previous unsaved draft', async ({ page }) => {
    await openLocations(page);
    await locRow(page, 'Main Warehouse').getByRole('button', { name: 'Edit' }).click();
    await form(page).getByLabel('Name').fill('Unsaved Alternative');
    await locRow(page, 'Cold Room').getByRole('button', { name: 'Edit' }).click();
    await expect(form(page).getByLabel('Name')).toHaveValue('Cold Room');
    await expect(form(page).getByLabel('Storage Condition')).toHaveValue('Chilled');
    await expect(locRow(page, 'Cold Room')).toContainText('Editing in the form above');
    await expect(locRow(page, 'Main Warehouse')).not.toContainText('Editing in the form above');
  });
  test('TSL-056 Editing a field clears stale local duplicate warning', async ({ page }) => {
    await openLocations(page);
    await form(page).getByLabel('Name').fill('main warehouse');
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect(form(page)).toContainText('already exists.');
    await form(page).getByLabel('Name').fill('Brand New Store');
    await expect(form(page)).not.toContainText('already exists.');
  });
  test('TSL-057 Whitespace-only name is rejected after trimming without a write', async ({ page }) => {
    const { calls } = await openLocations(page);
    await form(page).getByLabel('Name').fill('   ');
    await form(page).getByRole('button', { name: 'Create Storage Location' }).click();
    await expect(form(page)).toContainText('Storage location name is required.');
    expect(mutations(calls)).toHaveLength(0);
  });
  test('TSL-058 Absent creation timestamp displays a stable placeholder', async ({ page }) => {
    const withoutDate = { ...main, created_at: undefined };
    await openLocations(page, { items: [withoutDate] });
    await expect(locRow(page, 'Main Warehouse').locator('td').nth(3)).toHaveText('-');
  });
  test('TSL-059 Directory search cannot exceed its declared 255-character browser maximum', async ({ page }) => {
    await openLocations(page);
    await expect(page.getByLabel('Search locations')).toHaveAttribute('maxlength', '255');
  });
  test('TSL-060 Clearing directory filters retains unrelated inbound URL parameters', async ({ page }) => {
    await openLocations(page, { target: '/storage-locations?origin=stock&search=Cold&zone=Chilled' });
    await page.getByRole('button', { name: 'Clear Filters' }).click();
    await expect(page).toHaveURL(/origin=stock/);
    await expect(page).not.toHaveURL(/search=|zone=/);
    await expect(locRow(page, 'Main Warehouse')).toBeVisible();
  });
  test('TSL-061 Successful update returns to create mode and clears the edit draft', async ({ page }) => {
    const { calls } = await openLocations(page);
    await locRow(page, 'Main Warehouse').getByRole('button', { name: 'Edit' }).click();
    await form(page).getByLabel('Name').fill('Main Warehouse Renamed');
    await form(page).getByRole('button', { name: 'Update Storage Location' }).click();
    await expect.poll(() => calls.filter(call => call.method === 'PATCH').length).toBe(1);
    await expect(form(page).getByRole('heading', { name: 'Create Storage Location' })).toBeVisible();
    await expect(form(page).getByLabel('Name')).toHaveValue('');
    await expect(form(page)).toContainText('Storage location updated successfully.');
  });
  test('TSL-062 Retire confirmation explains stock dependencies and historical retention', async ({ page }) => {
    const { calls } = await openLocations(page);
    let confirmationText = '';
    page.once('dialog', async dialog => { confirmationText = dialog.message(); await dialog.dismiss(); });
    await locRow(page, 'Main Warehouse').getByRole('button', { name: 'Retire' }).click();
    expect(confirmationText).toContain('historical records remain');
    expect(confirmationText).toContain('stock or active operational work');
    expect(calls.filter(call => call.method === 'DELETE')).toHaveLength(0);
  });
  test('TSL-063 Local search and condition filtering do not issue server writes', async ({ page }) => {
    const { calls } = await openLocations(page);
    await page.getByLabel('Search locations').fill('Room');
    await page.locator('#storage-location-zone-filter').selectOption('Chilled');
    await expect(locRow(page, 'Cold Room')).toBeVisible();
    expect(mutations(calls)).toHaveLength(0);
  });
});
