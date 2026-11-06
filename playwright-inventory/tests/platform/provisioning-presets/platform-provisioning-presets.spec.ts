import { test, expect, type Page } from '@playwright/test';
import { openProvisioningPresets, presetRegistryPermissions, publishedPreset, draftPreset, retiredPreset } from '../../../support/provisioningPresetsFixture';

/** Batch 54 — generated, never compiled or executed. Every platform request is
 * intercepted; browser-visible states do NOT prove backend ACL or persistence. */
const cards = (page: Page) => page.locator('.platform-provisioning-presets__card');
const detail = (page: Page) => page.locator('section.platform-provisioning-presets__detail');
const createArea = (page: Page) => page.locator('section.platform-provisioning-presets__create');
const filters = (page: Page) => page.locator('.platform-provisioning-presets__filters');
const selectRow = async (page: Page, label: string) => {
  const card = cards(page).filter({ hasText: label });
  await card.getByRole('button', { name: 'Select', exact: true }).click();
  await expect(card).toHaveClass(/is-selected/);
};

test.describe('Platform Provisioning Presets — registry and evidence visibility', () => {
  test('PPSET-001 Hero explicitly distinguishes application templates from customer onboarding evidence', async ({ page }) => {
    await openProvisioningPresets(page);
    await expect(page.getByRole('heading', { name: 'Provisioning presets' })).toBeVisible();
    await expect(page.getByText('One published version per key')).toBeVisible();
    await expect(detail(page)).toContainText('Publishing makes this version selectable by application provisioning.');
  });
  test('PPSET-002 Registry-wide summary displays actual synthetic filtered counts', async ({ page }) => {
    await openProvisioningPresets(page);
    const stats = page.getByLabel('Provisioning preset registry summary');
    await expect(stats).toContainText('Filtered versions');
    await expect(stats).toContainText('Published');
    await expect(stats).toContainText('Draft');
    await expect(stats).toContainText('Retired');
    await expect(cards(page)).toHaveCount(3);
  });
  test('PPSET-003 Registry version cards show distinct business and row versions', async ({ page }) => {
    await openProvisioningPresets(page);
    await expect(cards(page).filter({ hasText: 'Hotel standard' })).toContainText('business v3 · row version 4');
    await expect(cards(page).filter({ hasText: 'Draft operations' })).toContainText('business v1 · row version 1');
  });
  test('PPSET-004 Published, draft and retired badges describe distinct selectable lifecycle states', async ({ page }) => {
    await openProvisioningPresets(page);
    await expect(cards(page).filter({ hasText: 'Hotel standard' })).toContainText('Selectable by application provisioning.');
    await expect(cards(page).filter({ hasText: 'Draft operations' })).toContainText('not selectable by tenant provisioning');
    await expect(cards(page).filter({ hasText: 'Legacy operations' })).toContainText('not selectable for new provisioning');
  });
  test('PPSET-005 Without platform-users read permission actor identity is restricted', async ({ page }) => {
    await openProvisioningPresets(page, { permissions: presetRegistryPermissions.filter(p => p !== 'platform.users.read') });
    await expect(detail(page).locator('.platform-provisioning-presets__audit-grid')).toContainText('Restricted');
    await expect(detail(page)).not.toContainText('preset-owner@example.test');
  });
  test('PPSET-006 With platform-users read permission recorded actor identity is visible', async ({ page }) => {
    await openProvisioningPresets(page);
    await expect(detail(page).locator('.platform-provisioning-presets__audit-grid')).toContainText('preset-owner@example.test');
    await expect(cards(page).filter({ hasText: 'Hotel standard' })).toContainText('preset-editor@example.test');
  });
  test('PPSET-007 Empty registry shows no-match guidance, not fabricated cards', async ({ page }) => {
    await openProvisioningPresets(page, { versions: [] });
    await expect(page.getByText('No matching preset versions.')).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });
  test('PPSET-008 Registry initial HTTP error shows retry instead of version cards', async ({ page }) => {
    await openProvisioningPresets(page, { responses: {
      'GET /platform/provisioning/preset-versions': { status: 503, json: { error: { message: 'Preset registry offline' } } }
    } });
    await expect(page.getByText('Provisioning preset registry could not be loaded.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });
  test('PPSET-009 Unsupported status URL filter blocks the registry request until reset', async ({ page }) => {
    const seen: string[] = [];
    await openProvisioningPresets(page, { query: 'status=unknown', onCall: (m,p) => { if (m === 'GET' && p.endsWith('/preset-versions')) seen.push(p); } });
    await expect(page.getByText('Invalid filter values.')).toBeVisible();
    expect(seen).toEqual([]);
    await page.getByRole('button', { name: 'Reset filters' }).click();
    await expect(cards(page)).toHaveCount(3);
  });
  test('PPSET-010 Nonpositive page URL filter is rejected before list fetch', async ({ page }) => {
    const seen: string[] = [];
    await openProvisioningPresets(page, { query: 'page=0', onCall: (m,p) => { if (m === 'GET' && p.endsWith('/preset-versions')) seen.push(p); } });
    await expect(page.getByText('Invalid filter values.')).toBeVisible();
    expect(seen).toHaveLength(0);
  });
  test('PPSET-011 Malformed exact key URL is rejected before list fetch', async ({ page }) => {
    const seen: string[] = [];
    await openProvisioningPresets(page, { query: 'key=BAD%20KEY', onCall: (m,p) => { if (m === 'GET' && p.endsWith('/preset-versions')) seen.push(p); } });
    await expect(page.getByText('Invalid filter values.')).toBeVisible();
    expect(seen).toHaveLength(0);
  });
  test('PPSET-012 Search URL exceeding 200 characters is blocked, not silently forwarded', async ({ page }) => {
    const seen: string[] = [];
    await openProvisioningPresets(page, { query: `search=${'x'.repeat(201)}`, onCall: (m,p) => { if (m === 'GET' && p.endsWith('/preset-versions')) seen.push(p); } });
    await expect(page.getByText('Invalid filter values.')).toBeVisible();
    expect(seen).toHaveLength(0);
  });
});

test.describe('Platform Provisioning Presets — filter, page and selection', () => {
  test('PPSET-013 Search input produces a query-filtered GET and keeps search URL state', async ({ page }) => {
    const searches: string[] = [];
    await openProvisioningPresets(page, { onCall: (m,p,_b,qs) => { if (m === 'GET' && p.endsWith('/preset-versions')) searches.push(qs.get('search') || ''); } });
    await filters(page).getByLabel('Search').fill('Hotel');
    await expect.poll(() => searches.includes('Hotel')).toBe(true);
    await expect(page).toHaveURL(/search=Hotel/);
    await expect(cards(page)).toHaveCount(1);
  });
  test('PPSET-014 Selecting draft status resets pagination and filters the API', async ({ page }) => {
    const queries: string[] = [];
    await openProvisioningPresets(page, { query: 'page=2', totalOverride: 60,
      onCall: (m,p,_b,qs) => { if (m === 'GET' && p.endsWith('/preset-versions')) queries.push(qs.toString()); } });
    await filters(page).getByLabel('Status').selectOption('draft');
    await expect.poll(() => queries.some(q => q.includes('status=draft') && q.includes('offset=0'))).toBe(true);
    await expect(page).not.toHaveURL(/page=2/);
  });
  test('PPSET-015 Exact key filter input strips unsupported characters before querying', async ({ page }) => {
    await openProvisioningPresets(page);
    await filters(page).getByLabel('Exact key').fill('HOTEL STD !');
    await expect(filters(page).getByLabel('Exact key')).toHaveValue('hotelstd');
    await expect(page).toHaveURL(/key=hotelstd/);
  });
  test('PPSET-016 Clear filters resets URL search/status/key and returns to first page', async ({ page }) => {
    await openProvisioningPresets(page, { query: 'status=published&key=hotel_std&page=2' });
    await filters(page).getByRole('button', { name: 'Clear filters' }).click();
    await expect(page).toHaveURL(/\/platform\/provisioning-presets$/);
    await expect(cards(page)).toHaveCount(3);
  });
  test('PPSET-017 Next page requests offset 50 and updates page indicator', async ({ page }) => {
    const offsets: string[] = [];
    await openProvisioningPresets(page, { totalOverride: 60, onCall: (m,p,_b,qs) => { if (m === 'GET' && p.endsWith('/preset-versions')) offsets.push(qs.get('offset') || ''); } });
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(() => offsets.includes('50')).toBe(true);
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
  });
  test('PPSET-018 Previous page from page two requests offset zero', async ({ page }) => {
    const offsets: string[] = [];
    await openProvisioningPresets(page, { query: 'page=2', totalOverride: 60,
      onCall: (m,p,_b,qs) => { if (m === 'GET' && p.endsWith('/preset-versions')) offsets.push(qs.get('offset') || ''); } });
    await page.getByRole('button', { name: 'Previous', exact: true }).click();
    await expect.poll(() => offsets.includes('0')).toBe(true);
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
  });
  test('PPSET-019 Selecting another card populates its own detail editor', async ({ page }) => {
    await openProvisioningPresets(page);
    await selectRow(page, 'Draft operations');
    await expect(detail(page).getByLabel('Name', { exact: true })).toHaveValue('Draft operations');
    await expect(detail(page).getByLabel('Organization type')).toHaveValue('hotel');
  });
  test('PPSET-020 Published version has read-only fields and no Save draft control', async ({ page }) => {
    await openProvisioningPresets(page);
    await expect(detail(page).getByLabel('Name', { exact: true })).toBeDisabled();
    await expect(detail(page).getByRole('button', { name: 'Save draft' })).toHaveCount(0);
  });
  test('PPSET-021 Retired version retains read-only history without edit or retire action', async ({ page }) => {
    await openProvisioningPresets(page);
    await selectRow(page, 'Legacy operations');
    await expect(detail(page).getByLabel('Name', { exact: true })).toBeDisabled();
    await expect(detail(page).getByRole('button', { name: 'Retire' })).toHaveCount(0);
    await expect(detail(page)).toContainText('retired');
  });
  test('PPSET-022 Draft version exposes enabled editor and save control', async ({ page }) => {
    await openProvisioningPresets(page);
    await selectRow(page, 'Draft operations');
    await expect(detail(page).getByLabel('Name', { exact: true })).toBeEnabled();
    await expect(detail(page).getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });
});

test.describe('Platform Provisioning Presets — draft editor and browser mutations', () => {
  test('PPSET-023 Draft location editor can add and remove an in-memory row', async ({ page }) => {
    await openProvisioningPresets(page);
    await selectRow(page, 'Draft operations');
    await detail(page).getByRole('button', { name: 'Add location' }).click();
    await expect(detail(page).getByLabel('Location 2 name')).toBeVisible();
    await detail(page).locator('.platform-provisioning-presets__location-row').last().getByRole('button', { name: 'Remove' }).click();
    await expect(detail(page).getByLabel('Location 2 name')).toHaveCount(0);
  });
  test('PPSET-024 Draft cannot be saved while a starter location has no name', async ({ page }) => {
    await openProvisioningPresets(page);
    await selectRow(page, 'Draft operations');
    await detail(page).getByLabel('Location 1 name').fill('');
    await expect(detail(page).getByRole('button', { name: 'Save draft' })).toBeDisabled();
  });
  test('PPSET-025 Feature flags remain editable for draft, not for published version', async ({ page }) => {
    await openProvisioningPresets(page);
    await expect(detail(page).getByLabel('procurement')).toBeDisabled();
    await selectRow(page, 'Draft operations');
    await detail(page).getByLabel('procurement').check();
    await expect(detail(page).getByLabel('procurement')).toBeChecked();
  });
  test('PPSET-026 Draft numeric limits clamp negative input to zero in browser state', async ({ page }) => {
    await openProvisioningPresets(page);
    await selectRow(page, 'Draft operations');
    await detail(page).getByLabel('max products').fill('-5');
    await expect(detail(page).getByLabel('max products')).toHaveValue('0');
  });
  test('PPSET-027 New preset creation requires key, name and organization type', async ({ page }) => {
    await openProvisioningPresets(page);
    await expect(createArea(page).getByRole('button', { name: 'Create draft preset' })).toBeDisabled();
    await createArea(page).getByLabel('Preset key').fill('new_warehouse');
    await expect(createArea(page).getByRole('button', { name: 'Create draft preset' })).toBeDisabled();
    await createArea(page).getByLabel('Name', { exact: true }).fill('Warehouse fixture');
    await expect(createArea(page).getByRole('button', { name: 'Create draft preset' })).toBeEnabled();
  });
  test('PPSET-028 New preset key transforms uppercase and removes spaces and symbols', async ({ page }) => {
    await openProvisioningPresets(page);
    await createArea(page).getByLabel('Preset key').fill('New WAREHOUSE !!');
    await expect(createArea(page).getByLabel('Preset key')).toHaveValue('newwarehouse');
  });
  test('PPSET-029 Create draft sends edited feature, limit and starter location payload', async ({ page }) => {
    let body: any;
    await openProvisioningPresets(page, { onCall: (m,p,b) => { if (m === 'POST' && p === '/platform/provisioning/preset-versions') body = b; } });
    await createArea(page).getByLabel('Preset key').fill('new_warehouse');
    await createArea(page).getByLabel('Name', { exact: true }).fill('Warehouse fixture');
    await createArea(page).getByLabel('max products').fill('120');
    await createArea(page).getByRole('button', { name: 'Create draft preset' }).click();
    await expect.poll(() => body?.key).toBe('new_warehouse');
    expect(body).toMatchObject({ label: 'Warehouse fixture', limits: { max_products: 120 } });
    expect(body.storage_locations[0].name).toBe('Central Storage');
  });
  test('PPSET-030 Successful draft creation displays draft-version feedback, not published state', async ({ page }) => {
    await openProvisioningPresets(page);
    await createArea(page).getByLabel('Preset key').fill('new_warehouse');
    await createArea(page).getByLabel('Name', { exact: true }).fill('Warehouse fixture');
    await createArea(page).getByRole('button', { name: 'Create draft preset' }).click();
    await expect(page.locator('.platform-provisioning-presets__success')).toContainText('Draft new_warehouse v1 created.');
    await expect(page.locator('.platform-provisioning-presets__success')).not.toContainText('published');
  });
  test('PPSET-031 Create draft HTTP rejection displays Action failed without success confirmation', async ({ page }) => {
    await openProvisioningPresets(page, { responses: {
      'POST /platform/provisioning/preset-versions': { status: 422, json: { error: { message: 'Duplicate preset key' } } }
    }});
    await createArea(page).getByLabel('Preset key').fill('hotel_std');
    await createArea(page).getByLabel('Name', { exact: true }).fill('Duplicate template');
    await createArea(page).getByRole('button', { name: 'Create draft preset' }).click();
    await expect(page.locator('.platform-provisioning-presets__warning')).toContainText('Action failed.');
    await expect(page.locator('.platform-provisioning-presets__success')).toHaveCount(0);
  });
  test('PPSET-032 Save draft PATCH sends If-Match-Version and omits immutable key', async ({ page }) => {
    let sent: any = null;
    await openProvisioningPresets(page, { onCall: (m,p,b,_q,headers) => { if (m === 'PATCH' && p.endsWith(draftPreset.id)) sent = { body:b, headers }; } });
    await selectRow(page, 'Draft operations');
    await detail(page).getByLabel('Name', { exact: true }).fill('Draft operations edited');
    await detail(page).getByRole('button', { name: 'Save draft' }).click();
    await expect.poll(() => sent?.headers['if-match-version']).toBe(String(draftPreset.version));
    expect(sent?.body).toMatchObject({ label: 'Draft operations edited' });
    expect(sent?.body).not.toHaveProperty('key');
  });
  test('PPSET-033 Stale version PATCH conflict exposes error without false saved feedback', async ({ page }) => {
    await openProvisioningPresets(page, { responses: {
      [`PATCH /platform/provisioning/preset-versions/${draftPreset.id}`]: { status: 409, json: { error: { message: 'Stale preset version' } } }
    }});
    await selectRow(page, 'Draft operations');
    await detail(page).getByLabel('Name', { exact: true }).fill('Another revision');
    await detail(page).getByRole('button', { name: 'Save draft' }).click();
    await expect(page.locator('.platform-provisioning-presets__warning')).toContainText('Action failed.');
    await expect(page.locator('.platform-provisioning-presets__success')).toHaveCount(0);
  });
  test('PPSET-034 Dismissing publish confirmation prevents mutation', async ({ page }) => {
    const writes: string[] = [];
    await openProvisioningPresets(page, { onCall: (m,p) => { if (m === 'POST' && p.endsWith('/publish')) writes.push(p); } });
    await selectRow(page, 'Draft operations');
    page.once('dialog', dialog => dialog.dismiss());
    await detail(page).getByRole('button', { name: 'Publish', exact: true }).click();
    expect(writes).toHaveLength(0);
    await expect(detail(page)).toContainText('Application lifecycle: draft');
  });
  test('PPSET-035 Confirmed publish sends versioned request and displays published feedback', async ({ page }) => {
    let version: string | undefined;
    await openProvisioningPresets(page, { onCall: (m,p,_b,_q,h) => { if (m === 'POST' && p.endsWith('/publish')) version=h['if-match-version']; } });
    await selectRow(page, 'Draft operations');
    page.once('dialog', dialog => dialog.accept());
    await detail(page).getByRole('button', { name: 'Publish', exact: true }).click();
    await expect.poll(() => version).toBe(String(draftPreset.version));
    await expect(page.locator('.platform-provisioning-presets__success')).toContainText('is now published.');
  });
  test('PPSET-036 Read-only operator may inspect registry but cannot invoke create/edit/lifecycle actions', async ({ page }) => {
    await openProvisioningPresets(page, { permissions: presetRegistryPermissions.filter(p => p !== 'platform.provisioning_presets.write') });
    await expect(cards(page)).toHaveCount(3);
    await expect(createArea(page)).toHaveCount(0);
    await expect(detail(page).getByRole('button', { name: 'Create new version' })).toHaveCount(0);
    await expect(detail(page).getByRole('button', { name: 'Retire', exact: true })).toHaveCount(0);
    await expect(page.getByText('Read only', { exact: true })).toBeVisible();
  });
});

/** Batch 55 — additional Platform Presets scenarios; generated for later Phase 2 validation only. */
test.describe('Platform Provisioning Presets — URL and retry boundaries', () => {
  test('PPSET-037 Malformed fractional page parameter blocks registry fetch', async ({ page }) => {
    const calls: string[] = [];
    await openProvisioningPresets(page, { query: 'page=1.5', onCall: (m,p) => { if (m==='GET' && p.endsWith('/preset-versions')) calls.push(p); } });
    await expect(page.getByText('Invalid filter values.')).toBeVisible();
    expect(calls).toHaveLength(0);
  });
  test('PPSET-038 Exact key length outside backend contract produces invalid filter warning', async ({ page }) => {
    const calls: string[] = [];
    await openProvisioningPresets(page, { query: `key=${'a'.repeat(81)}`, onCall: (m,p) => { if (m==='GET' && p.endsWith('/preset-versions')) calls.push(p); } });
    await expect(page.getByText('Invalid filter values.')).toBeVisible();
    expect(calls).toHaveLength(0);
  });
  test('PPSET-039 Search filter trims surrounding whitespace in request payload', async ({ page }) => {
    const terms: string[] = [];
    await openProvisioningPresets(page, { onCall: (m,p,_b,params) => { if (m==='GET' && p.endsWith('/preset-versions')) terms.push(params.get('search')||''); } });
    await filters(page).getByLabel('Search').fill('  Hotel  ');
    await expect.poll(() => terms.includes('Hotel')).toBe(true);
    await expect(filters(page).getByLabel('Search')).toHaveValue('  Hotel  ');
  });
  test('PPSET-040 Changing exact key filter resets page number to first page', async ({ page }) => {
    const params: string[] = [];
    await openProvisioningPresets(page, { query: 'page=2', totalOverride: 60, onCall: (m,p,_b,q) => { if (m==='GET' && p.endsWith('/preset-versions')) params.push(q.toString()); } });
    await filters(page).getByLabel('Exact key').fill('hotel_std');
    await expect(page).not.toHaveURL(/page=2/);
    await expect.poll(() => params.some(s=>s.includes('key=hotel_std') && s.includes('offset=0'))).toBe(true);
  });
  test('PPSET-041 Background registry refetch failure retains last successful snapshot and retry', async ({ page }) => {
    await openProvisioningPresets(page);
    await expect(cards(page)).toHaveCount(3);
    await page.route('**/platform/provisioning/preset-versions?*', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({error:{message:'Refresh offline'}}) }));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByText('Showing the last successful snapshot.')).toBeVisible();
    await expect(cards(page)).toHaveCount(3);
    await expect(page.getByRole('button', {name:'Retry'})).toBeVisible();
  });
  test('PPSET-042 Manual refresh re-queries version list and disables button while pending', async ({ page }) => {
    await openProvisioningPresets(page);
    let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    let callCount=0;
    await page.route('**/platform/provisioning/preset-versions?*', async route => { callCount++; await hold; await route.fallback(); });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    try {
      await expect(page.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
      expect(callCount).toBeGreaterThan(0);
    } finally { release(); }
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  });
  test('PPSET-043 Retry after failed registry query recovers visible rows', async ({ page }) => {
    const responses: Record<string, {status:number;json:unknown}> = {
      'GET /platform/provisioning/preset-versions': { status:503, json:{error:{message:'Temporary failure'}} }
    };
    await openProvisioningPresets(page, { responses });
    await expect(page.getByText('Provisioning preset registry could not be loaded.')).toBeVisible();
    delete responses['GET /platform/provisioning/preset-versions'];
    await page.getByRole('button',{name:'Retry'}).click();
    await expect(cards(page)).toHaveCount(3);
  });
  test('PPSET-044 Selecting a card changes selected marker without rewriting registry filters', async ({ page }) => {
    await openProvisioningPresets(page, { query:'search=ops' });
    const before = page.url();
    await selectRow(page, 'Legacy operations');
    expect(page.url()).toBe(before);
    await expect(cards(page).filter({hasText:'Legacy operations'})).toHaveClass(/is-selected/);
  });
  test('PPSET-045 Selection falls back when a filtered registry no longer contains the chosen row', async ({ page }) => {
    await openProvisioningPresets(page);
    await selectRow(page, 'Draft operations');
    await filters(page).getByLabel('Search').fill('Hotel standard');
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).filter({hasText:'Hotel standard'})).toHaveClass(/is-selected/);
    await expect(detail(page).getByLabel('Name',{exact:true})).toHaveValue('Hotel standard');
  });
});

test.describe('Platform Provisioning Presets — editor and creation boundaries', () => {
  test('PPSET-046 Custom feature flags from a persisted draft appear as editable checkboxes', async ({ page }) => {
    await openProvisioningPresets(page, {versions:[publishedPreset,{...draftPreset,feature_flags:{inventory:true,custom_route:true}},retiredPreset]});
    await selectRow(page,'Draft operations');
    await expect(detail(page).getByLabel('custom route')).toBeChecked();
    await detail(page).getByLabel('custom route').uncheck();
    await expect(detail(page).getByLabel('custom route')).not.toBeChecked();
  });
  test('PPSET-047 Custom limit keys from a persisted draft appear in numeric editor', async ({ page }) => {
    await openProvisioningPresets(page, {versions:[publishedPreset,{...draftPreset,limits:{max_users:9,custom_limit:27}},retiredPreset]});
    await selectRow(page,'Draft operations');
    await expect(detail(page).getByLabel('custom limit')).toHaveValue('27');
    await detail(page).getByLabel('custom limit').fill('13');
    await expect(detail(page).getByLabel('custom limit')).toHaveValue('13');
  });
  test('PPSET-048 Create default flag switches serialize into the draft payload', async ({ page }) => {
    let body: any;
    await openProvisioningPresets(page, {onCall:(m,p,b)=>{if(m==='POST'&&p.endsWith('/preset-versions')) body=b;}});
    await createArea(page).getByLabel('Preset key').fill('new_flags');
    await createArea(page).getByLabel('Name',{exact:true}).fill('Flags template');
    await createArea(page).getByLabel('inventory').uncheck();
    await createArea(page).getByRole('button',{name:'Create draft preset'}).click();
    await expect.poll(()=>body?.feature_flags?.inventory).toBe(false);
    expect(body?.feature_flags?.scanner).toBe(true);
  });
  test('PPSET-049 Removing all starter location definitions remains a valid empty template (source-specific)', async ({ page }) => {
    let body: any;
    await openProvisioningPresets(page, {onCall:(m,p,b)=>{if(m==='POST'&&p.endsWith('/preset-versions'))body=b;}});
    await createArea(page).getByLabel('Preset key').fill('no_locations');
    await createArea(page).getByLabel('Name',{exact:true}).fill('Without starter locations');
    await createArea(page).getByRole('button',{name:'Remove'}).click();
    await expect(createArea(page).locator('.platform-provisioning-presets__location-row')).toHaveCount(0);
    await expect(createArea(page).getByRole('button',{name:'Create draft preset'})).toBeEnabled();
    await createArea(page).getByRole('button',{name:'Create draft preset'}).click();
    await expect.poll(()=>body?.storage_locations?.length).toBe(0);
  });
  test('PPSET-050 Blank name in newly added create location blocks draft submission', async ({ page }) => {
    await openProvisioningPresets(page);
    await createArea(page).getByLabel('Preset key').fill('two_locations');
    await createArea(page).getByLabel('Name',{exact:true}).fill('Two locations');
    await createArea(page).getByRole('button',{name:'Add location'}).click();
    await expect(createArea(page).getByLabel('Location 2 name')).toHaveValue('');
    await expect(createArea(page).getByRole('button',{name:'Create draft preset'})).toBeDisabled();
  });
  test('PPSET-051 Create section supports adding and deleting multiple starter location definitions', async ({ page }) => {
    await openProvisioningPresets(page);
    await createArea(page).getByRole('button',{name:'Add location'}).click();
    await createArea(page).getByRole('button',{name:'Add location'}).click();
    await expect(createArea(page).locator('.platform-provisioning-presets__location-row')).toHaveCount(3);
    await createArea(page).locator('.platform-provisioning-presets__location-row').nth(1).getByRole('button',{name:'Remove'}).click();
    await expect(createArea(page).locator('.platform-provisioning-presets__location-row')).toHaveCount(2);
  });
  test('PPSET-052 Create form default switches and numeric limits are source-defined', async ({ page }) => {
    await openProvisioningPresets(page);
    await expect(createArea(page).getByLabel('inventory')).toBeChecked();
    await expect(createArea(page).getByLabel('forecasting')).not.toBeChecked();
    await expect(createArea(page).getByLabel('max users')).toHaveValue('30');
    await expect(createArea(page).getByLabel('max storage locations')).toHaveValue('75');
    await expect(createArea(page).getByLabel('Organization type')).toHaveValue('facility');
  });
  test('PPSET-053 Successful notice can be dismissed independently of selection', async ({ page }) => {
    await openProvisioningPresets(page);
    await selectRow(page,'Draft operations');
    await detail(page).getByRole('button',{name:'Save draft'}).click();
    await expect(page.locator('.platform-provisioning-presets__success')).toBeVisible();
    await page.locator('.platform-provisioning-presets__success').getByRole('button',{name:'Dismiss'}).click();
    await expect(page.locator('.platform-provisioning-presets__success')).toHaveCount(0);
    await expect(detail(page).getByLabel('Name',{exact:true})).toHaveValue('Draft operations');
  });
  test('PPSET-054 Successful Save draft shows new row version and keeps selected draft context', async ({ page }) => {
    await openProvisioningPresets(page);
    await selectRow(page,'Draft operations');
    await detail(page).getByLabel('Name',{exact:true}).fill('Draft operations updated');
    await detail(page).getByRole('button',{name:'Save draft'}).click();
    await expect(page.locator('.platform-provisioning-presets__success')).toContainText('saved.');
    await expect(cards(page).filter({hasText:'Draft operations updated'})).toContainText('row version 2');
    await expect(detail(page).getByLabel('Name',{exact:true})).toHaveValue('Draft operations updated');
  });
  test('PPSET-055 Blank draft Name disables Save draft and Publish', async ({ page }) => {
    await openProvisioningPresets(page); await selectRow(page,'Draft operations');
    await detail(page).getByLabel('Name',{exact:true}).fill(' ');
    await expect(detail(page).getByRole('button',{name:'Save draft'})).toBeDisabled();
    await expect(detail(page).getByRole('button',{name:'Publish'})).toBeDisabled();
  });
  test('PPSET-056 Blank draft Organization type disables Save draft and Publish', async ({ page }) => {
    await openProvisioningPresets(page); await selectRow(page,'Draft operations');
    await detail(page).getByLabel('Organization type').fill('');
    await expect(detail(page).getByRole('button',{name:'Save draft'})).toBeDisabled();
    await expect(detail(page).getByRole('button',{name:'Publish'})).toBeDisabled();
  });
  test('PPSET-057 Save draft 503 response retains editable input and displays error', async ({ page }) => {
    await openProvisioningPresets(page, {responses:{[`PATCH /platform/provisioning/preset-versions/${draftPreset.id}`]:{status:503,json:{error:{message:'Offline save'}}}}});
    await selectRow(page,'Draft operations');
    await detail(page).getByLabel('Name',{exact:true}).fill('Unsaved amendment');
    await detail(page).getByRole('button',{name:'Save draft'}).click();
    await expect(page.locator('.platform-provisioning-presets__warning')).toContainText('Action failed.');
    await expect(detail(page).getByLabel('Name',{exact:true})).toHaveValue('Unsaved amendment');
    await expect(page.locator('.platform-provisioning-presets__success')).toHaveCount(0);
  });
});

test.describe('Platform Provisioning Presets — clone and lifecycle', () => {
  test('PPSET-058 Short clone key disables Clone to draft action', async ({ page }) => {
    await openProvisioningPresets(page);
    await detail(page).getByPlaceholder('new-preset-key').fill('x');
    await expect(detail(page).getByRole('button',{name:'Clone to draft'})).toBeDisabled();
    await detail(page).getByPlaceholder('new-preset-key').fill('ok');
    await expect(detail(page).getByRole('button',{name:'Clone to draft'})).toBeEnabled();
  });
  test('PPSET-059 Clone sends versioned POST with normalized new key and optional label', async ({ page }) => {
    let payload: any; let ifMatch: string|undefined;
    await openProvisioningPresets(page,{onCall:(m,p,b,_q,h)=>{if(m==='POST'&&p.endsWith('/clone')){payload=b;ifMatch=h['if-match-version'];}}});
    await detail(page).getByPlaceholder('new-preset-key').fill('NEW CLONE!*');
    await detail(page).getByPlaceholder('Clone name').fill('');
    await detail(page).getByRole('button',{name:'Clone to draft'}).click();
    await expect.poll(()=>payload?.key).toBe('newclone');
    expect(payload).not.toHaveProperty('label');
    expect(ifMatch).toBe(String(publishedPreset.version));
  });
  test('PPSET-060 Successful clone selects new draft version without publishing', async ({ page }) => {
    await openProvisioningPresets(page);
    await detail(page).getByPlaceholder('new-preset-key').fill('cloned_template');
    await detail(page).getByRole('button',{name:'Clone to draft'}).click();
    await expect(page.locator('.platform-provisioning-presets__success')).toContainText('Cloned to cloned_template v1 draft.');
    await expect(detail(page)).toContainText('Application lifecycle: draft');
    await expect(page).toHaveURL(/key=cloned_template/);
  });
  test('PPSET-061 Clone conflict retains source selection and shows mutation error', async ({ page }) => {
    await openProvisioningPresets(page,{responses:{[`POST /platform/provisioning/preset-versions/${publishedPreset.id}/clone`]:{status:409,json:{error:{message:'Duplicate key'}}}}});
    await detail(page).getByPlaceholder('new-preset-key').fill('duplicate_key');
    await detail(page).getByRole('button',{name:'Clone to draft'}).click();
    await expect(page.locator('.platform-provisioning-presets__warning')).toContainText('Action failed.');
    await expect(detail(page).getByLabel('Name',{exact:true})).toHaveValue('Hotel standard');
    await expect(page.locator('.platform-provisioning-presets__success')).toHaveCount(0);
  });
  test('PPSET-062 Create new version sends source id and optimistic version header', async ({ page }) => {
    let version:string|undefined; let body: any;
    await openProvisioningPresets(page,{onCall:(m,p,b,_q,h)=>{if(m==='POST'&&p.endsWith(`/${publishedPreset.id}/new-version`)){body=b;version=h['if-match-version'];}}});
    await detail(page).getByRole('button',{name:'Create new version'}).click();
    await expect.poll(()=>version).toBe(String(publishedPreset.version));
    expect(body).toEqual({});
  });
  test('PPSET-063 Create new version success presents an editable new draft', async ({ page }) => {
    await openProvisioningPresets(page);
    await detail(page).getByRole('button',{name:'Create new version'}).click();
    await expect(page.locator('.platform-provisioning-presets__success')).toContainText('created from the selected version.');
    await expect(detail(page)).toContainText('Application lifecycle: draft');
    await expect(detail(page).getByLabel('Name',{exact:true})).toBeEnabled();
  });
  test('PPSET-064 Create new version rejection leaves published source visible', async ({ page }) => {
    await openProvisioningPresets(page,{responses:{[`POST /platform/provisioning/preset-versions/${publishedPreset.id}/new-version`]:{status:409,json:{error:{message:'Version collision'}}}}});
    await detail(page).getByRole('button',{name:'Create new version'}).click();
    await expect(page.locator('.platform-provisioning-presets__warning')).toContainText('Action failed.');
    await expect(detail(page)).toContainText('Application lifecycle: published');
    await expect(detail(page).getByLabel('Name',{exact:true})).toBeDisabled();
  });
  test('PPSET-065 Publish conflict displays warning with no false success banner', async ({ page }) => {
    await openProvisioningPresets(page,{responses:{[`POST /platform/provisioning/preset-versions/${draftPreset.id}/publish`]:{status:409,json:{error:{message:'Stale publish'}}}}});
    await selectRow(page,'Draft operations');
    page.once('dialog', d=>d.accept());
    await detail(page).getByRole('button',{name:'Publish'}).click();
    await expect(page.locator('.platform-provisioning-presets__warning')).toContainText('Action failed.');
    await expect(page.locator('.platform-provisioning-presets__success')).toHaveCount(0);
  });
  test('PPSET-066 Retire confirmation dismissal sends no mutation', async ({ page }) => {
    const writes:string[]=[];
    await openProvisioningPresets(page,{onCall:(m,p)=>{if(m==='POST'&&p.endsWith('/retire'))writes.push(p);}});
    page.once('dialog',d=>d.dismiss());
    await detail(page).getByRole('button',{name:'Retire'}).click();
    expect(writes).toHaveLength(0);
    await expect(detail(page)).toContainText('Application lifecycle: published');
  });
  test('PPSET-067 Retire successful POST displays retired feedback and read-only editor', async ({ page }) => {
    let reason:any;
    await openProvisioningPresets(page,{onCall:(m,p,b)=>{if(m==='POST'&&p.endsWith('/retire'))reason=b?.reason;}});
    page.once('dialog',d=>d.accept());
    await detail(page).getByRole('button',{name:'Retire'}).click();
    await expect.poll(()=>reason).toBe('Retired from Platform Preset Management');
    await expect(page.locator('.platform-provisioning-presets__success')).toContainText('retired.');
    await expect(detail(page)).toContainText('Application lifecycle: retired');
    await expect(detail(page).getByLabel('Name',{exact:true})).toBeDisabled();
  });
  test('PPSET-068 Retire backend rejection reports warning and preserves selected version', async ({ page }) => {
    await openProvisioningPresets(page,{responses:{[`POST /platform/provisioning/preset-versions/${publishedPreset.id}/retire`]:{status:409,json:{error:{message:'Cannot retire last published'}}}}});
    page.once('dialog',d=>d.accept());
    await detail(page).getByRole('button',{name:'Retire'}).click();
    await expect(page.locator('.platform-provisioning-presets__warning')).toContainText('Action failed.');
    await expect(detail(page)).toContainText('Application lifecycle: published');
    await expect(page.locator('.platform-provisioning-presets__success')).toHaveCount(0);
  });
  test('PPSET-069 Supporting evidence links are visible only for granted platform permissions', async ({ page }) => {
    await openProvisioningPresets(page,{permissions:['platform.provisioning_presets.read','platform.tenants.read']});
    const links=page.locator('.platform-provisioning-presets__supporting-links');
    await expect(links.getByRole('link',{name:'Provisioning'})).toBeVisible();
    await expect(links.getByRole('link',{name:'Tenants'})).toBeVisible();
    await expect(links.getByRole('link',{name:'Platform users'})).toHaveCount(0);
    await expect(links.getByRole('link',{name:'Platform audit'})).toHaveCount(0);
  });
  test('PPSET-070 Mutation success alert is cleared by a subsequent failed lifecycle action', async ({ page }) => {
    await openProvisioningPresets(page,{responses:{[`POST /platform/provisioning/preset-versions/${draftPreset.id}/publish`]:{status:503,json:{error:{message:'Publishing failed'}}}}});
    await selectRow(page,'Draft operations');
    await detail(page).getByRole('button',{name:'Save draft'}).click();
    await expect(page.locator('.platform-provisioning-presets__success')).toBeVisible();
    page.once('dialog',d=>d.accept());
    await detail(page).getByRole('button',{name:'Publish'}).click();
    await expect(page.locator('.platform-provisioning-presets__warning')).toContainText('Action failed.');
    await expect(page.locator('.platform-provisioning-presets__success')).toHaveCount(0);
  });
});
