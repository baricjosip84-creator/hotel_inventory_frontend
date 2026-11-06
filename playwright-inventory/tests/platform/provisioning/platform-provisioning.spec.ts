import { fulfillJson } from '../../../support/tenantSession';
import { test, expect, type Page } from '@playwright/test';
import {
  openProvisioning, provisionPermissions, presetAlpha, presetBeta, provisionTenants,
  previewAlpha, applyFixture, PLATFORM_TENANT_A
} from '../../../support/provisioningFixture';

/** Batch 53, Phase 1 generation only. API and JWT are synthetic; real backend
 * permission enforcement, atomicity, audit evidence and side effects are NOT verified. */
const createAction = (page: Page) => page.getByRole('button', { name: 'Create provisioned tenant' });
const applyAction = (page: Page) => page.getByRole('button', { name: 'Apply selected changes' });
const createArea = (page: Page) => page.locator('.platform-provisioning__section').filter({ has: page.getByRole('heading', { name: 'Create provisioned tenant' }) });
const selectors = (page: Page) => page.locator('.platform-provisioning__selector-grid');
const previewArea = (page: Page) => page.locator('.platform-provisioning__preview');
const chooseTenant = (page: Page) => selectors(page).getByLabel('Tenant', { exact: true }).selectOption(PLATFORM_TENANT_A);
const createName = (page: Page) => createArea(page).getByLabel('Tenant name');
const createPreset = (page: Page) => createArea(page).getByLabel('Published preset');
const enableCreate = async (page: Page) => { await createName(page).fill('New Fixture Tenant'); await expect(createAction(page)).toBeEnabled(); };
const choosePreset = (page: Page, value: string) => selectors(page).getByLabel('Preset', { exact: true }).selectOption(value);

// Each test uses isolated, intercepted browser transport. No actual provisioning mutations.
test.describe('Platform Provisioning — sources, registry and navigation', () => {
  test('PPRO-001 Provisioning hero and evidence boundary describe scope of configuration', async ({ page }) => {
    await openProvisioning(page);
    await expect(page.getByRole('heading', { name: 'Provisioning', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Evidence boundary' })).toBeVisible();
    await expect(page.getByText('A successful transaction does not prove customer onboarding', { exact: false })).toBeVisible();
  });
  test('PPRO-002 Published preset and tenant counts reflect intercepted source collections', async ({ page }) => {
    await openProvisioning(page);
    await expect(page.getByText('2 published presets')).toBeVisible();
    await expect(page.getByText('2 tenant records loaded')).toBeVisible();
  });
  test('PPRO-003 Registry cards show version, organization type and starter location counts', async ({ page }) => {
    await openProvisioning(page);
    const first = page.locator('.platform-provisioning__preset-card').filter({ hasText: 'Starter workspace' });
    await expect(first).toContainText('v4');
    await expect(first).toContainText('Hotel');
    await expect(first).toContainText('2');
  });
  test('PPRO-004 Absent preset description displays explicit not-recorded fallback', async ({ page }) => {
    await openProvisioning(page);
    await expect(page.locator('.platform-provisioning__preset-card').filter({ hasText: 'Premium workspace' })).toContainText('No description recorded.');
  });
  test('PPRO-005 Empty published registry shows blocking guidance and disabled creation', async ({ page }) => {
    await openProvisioning(page, { presets: [] });
    await expect(page.getByText('No published presets.')).toBeVisible();
    await expect(createAction(page)).toBeDisabled();
  });
  test('PPRO-006 Without a preset query parameter the first published preset becomes selected URL filter', async ({ page }) => {
    await openProvisioning(page);
    await expect(page).toHaveURL(/preset=starter_pack/);
    await expect(page.locator('.platform-provisioning__preset-card.is-selected')).toContainText('Starter workspace');
  });
  test('PPRO-007 Unknown preset query parameter falls back to a published preset', async ({ page }) => {
    await openProvisioning(page, { selectedPreset: 'nonexistent' });
    await expect(page).toHaveURL(/preset=starter_pack/);
    await expect(page.locator('.platform-provisioning__preset-card.is-selected')).toContainText('Starter workspace');
  });
  test('PPRO-008 Select preset card switches URL filter without losing other URL selection', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A });
    await page.locator('.platform-provisioning__preset-card').filter({ hasText: 'Premium workspace' }).getByRole('button', { name: 'Select preset' }).click();
    await expect(page).toHaveURL(/preset=premium_pack/);
    await expect(page).toHaveURL(new RegExp(`tenant_id=${PLATFORM_TENANT_A}`));
  });
  test('PPRO-009 Selected preset card uses non-navigation Selected preset label', async ({ page }) => {
    await openProvisioning(page);
    await expect(page.locator('.platform-provisioning__preset-card.is-selected').getByRole('button', { name: 'Selected preset' })).toBeVisible();
    await expect(page.locator('.platform-provisioning__preset-card').filter({ hasText: 'Premium workspace' }).getByRole('button', { name: 'Select preset' })).toBeVisible();
  });
  test('PPRO-010 Manage presets link appears when preset-read permission is present', async ({ page }) => {
    await openProvisioning(page);
    await expect(page.getByRole('link', { name: 'Manage presets' })).toHaveAttribute('href', '/platform/provisioning-presets');
  });
  test('PPRO-011 Preset registry request failure exposes retry action rather than invented cards', async ({ page }) => {
    await openProvisioning(page, { responses: { 'GET /platform/provisioning/presets': { status: 503, json: { message: 'Fixture unavailable' } } } });
    await expect(page.getByText('Provisioning source data could not be loaded.')).toBeVisible();
    await expect(page.locator('.platform-provisioning__preset-card')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });
  test('PPRO-012 Tenant registry failure reports a source-data error without claiming loaded rows', async ({ page }) => {
    await openProvisioning(page, { responses: { 'GET /platform/tenants': { status: 503, json: { message: 'Fixture unavailable' } } } });
    await expect(page.getByText('Provisioning source data could not be loaded.')).toBeVisible();
    await expect(page.getByText('0 tenant records loaded')).toBeVisible();
  });
  test('PPRO-013 Empty tenant registry retains published presets but has no preview tenant options', async ({ page }) => {
    await openProvisioning(page, { tenants: [] });
    await expect(page.getByText('0 tenant records loaded')).toBeVisible();
    await expect(selectors(page).getByLabel('Tenant', { exact: true }).locator('option')).toHaveCount(1);
    await expect(applyAction(page)).toBeDisabled();
  });
  test('PPRO-014 Refresh explicitly refetches both source endpoints', async ({ page }) => {
    const counts: Record<string,number> = {};
    await openProvisioning(page, { onCall: (m,p) => { if (m==='GET') counts[p]=(counts[p]||0)+1; } });
    await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
    const beforeP = counts['/platform/provisioning/presets'] || 0;
    const beforeT = counts['/platform/tenants'] || 0;
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect.poll(() => counts['/platform/provisioning/presets'] || 0).toBeGreaterThan(beforeP);
    await expect.poll(() => counts['/platform/tenants'] || 0).toBeGreaterThan(beforeT);
  });
  test('PPRO-015 Explicit preset selection updates preview selector value and URL', async ({ page }) => {
    await openProvisioning(page);
    await choosePreset(page, presetBeta.key);
    await expect(page).toHaveURL(/preset=premium_pack/);
    await expect(selectors(page).getByLabel('Preset', { exact: true })).toHaveValue(presetBeta.key);
  });
});

test.describe('Platform Provisioning — create tenant form and intercepted mutation', () => {
  test('PPRO-016 Creation controls default to standard plan, starter locations and onboarding tasks', async ({ page }) => {
    await openProvisioning(page);
    await expect(createArea(page).getByLabel('Commercial plan')).toHaveValue('standard');
    await expect(createArea(page).getByLabel('Create starter storage-location records')).toBeChecked();
    await expect(createArea(page).getByLabel('Create onboarding task records')).toBeChecked();
  });
  test('PPRO-017 Without create permission the form is hidden and explicit restriction appears', async ({ page }) => {
    await openProvisioning(page, { permissions: provisionPermissions.filter(x => x !== 'platform.tenants.create') });
    await expect(page.getByText('Tenant creation unavailable')).toBeVisible();
    await expect(createAction(page)).toHaveCount(0);
  });
  test('PPRO-018 Blank tenant name disables creation', async ({ page }) => {
    await openProvisioning(page);
    await expect(createAction(page)).toBeDisabled();
  });
  test('PPRO-019 Whitespace-only tenant name cannot enable creation', async ({ page }) => {
    await openProvisioning(page);
    await createName(page).fill('   ');
    await expect(createAction(page)).toBeDisabled();
  });
  test('PPRO-020 Clearing published preset selection disables tenant creation', async ({ page }) => {
    await openProvisioning(page);
    await createName(page).fill('Valid Fixture');
    await createPreset(page).selectOption('');
    await expect(createAction(page)).toBeDisabled();
  });
  test('PPRO-021 Initial admin email by itself requires all companion fields', async ({ page }) => {
    await openProvisioning(page);
    await createName(page).fill('Valid Fixture');
    await createArea(page).getByLabel('Initial admin email').fill('admin@example.test');
    await expect(createArea(page)).toContainText('must be completed together or all left blank');
    await expect(createAction(page)).toBeDisabled();
  });
  test('PPRO-022 Initial admin name by itself requires all companion fields', async ({ page }) => {
    await openProvisioning(page);
    await createName(page).fill('Valid Fixture');
    await createArea(page).getByLabel('Initial admin name').fill('Fixture Admin');
    await expect(createArea(page)).toContainText('must be completed together or all left blank');
    await expect(createAction(page)).toBeDisabled();
  });
  test('PPRO-023 Initial admin password by itself requires all companion fields', async ({ page }) => {
    await openProvisioning(page);
    await createName(page).fill('Valid Fixture');
    await createArea(page).getByLabel('Initial admin password').fill('FixturesOnlyPass14');
    await expect(createArea(page)).toContainText('must be completed together or all left blank');
    await expect(createAction(page)).toBeDisabled();
  });
  test('PPRO-024 Invalid initial admin email shows source-derived validation', async ({ page }) => {
    await openProvisioning(page);
    await createName(page).fill('Valid Fixture');
    await createArea(page).getByLabel('Initial admin email').fill('not-an-email');
    await createArea(page).getByLabel('Initial admin name').fill('Fixture Admin');
    await createArea(page).getByLabel('Initial admin password').fill('FixturesOnlyPass14');
    await expect(createArea(page)).toContainText('Initial admin email is not valid.');
    await expect(createAction(page)).toBeDisabled();
  });
  test('PPRO-025 Initial admin password below ten characters blocks creation', async ({ page }) => {
    await openProvisioning(page);
    await createName(page).fill('Valid Fixture');
    await createArea(page).getByLabel('Initial admin email').fill('admin@example.test');
    await createArea(page).getByLabel('Initial admin name').fill('Fixture Admin');
    await createArea(page).getByLabel('Initial admin password').fill('123456789');
    await expect(createArea(page)).toContainText('at least 10 characters');
    await expect(createAction(page)).toBeDisabled();
  });
  test('PPRO-026 Complete valid initial admin enables creation', async ({ page }) => {
    await openProvisioning(page);
    await createName(page).fill('Valid Fixture');
    await createArea(page).getByLabel('Initial admin email').fill('admin@example.test');
    await createArea(page).getByLabel('Initial admin name').fill('Fixture Admin');
    await createArea(page).getByLabel('Initial admin password').fill('FixturesOnlyPass14');
    await expect(createAction(page)).toBeEnabled();
    await expect(createArea(page).locator('.platform-provisioning__validation')).toHaveCount(0);
  });
  test('PPRO-027 Admin fields entirely optional when left blank', async ({ page }) => {
    await openProvisioning(page);
    await enableCreate(page);
    await expect(createArea(page).getByLabel('Initial admin email')).toBeEmpty();
    await expect(createArea(page).getByLabel('Initial admin name')).toBeEmpty();
    await expect(createArea(page).getByLabel('Initial admin password')).toBeEmpty();
  });
  test('PPRO-028 All three commercial plan options are presented', async ({ page }) => {
    await openProvisioning(page);
    await expect(createArea(page).getByLabel('Commercial plan').locator('option')).toHaveCount(3);
    await createArea(page).getByLabel('Commercial plan').selectOption('enterprise');
    await expect(createArea(page).getByLabel('Commercial plan')).toHaveValue('enterprise');
  });
  test('PPRO-029 Tenant name input applies 160-character HTML maximum', async ({ page }) => {
    await openProvisioning(page);
    await expect(createName(page)).toHaveAttribute('maxlength', '160');
    await createName(page).pressSequentially('N'.repeat(170));
    await expect(createName(page)).toHaveValue('N'.repeat(160));
  });
  test('PPRO-030 Location input applies 255-character HTML maximum', async ({ page }) => {
    await openProvisioning(page);
    const input = createArea(page).getByLabel('Location', { exact: true });
    await expect(input).toHaveAttribute('maxlength','255');
    await input.pressSequentially('L'.repeat(265));
    await expect(input).toHaveValue('L'.repeat(255));
  });
  test('PPRO-031 Dismissing create confirmation prevents mutation request', async ({ page }) => {
    const writes: string[] = [];
    await openProvisioning(page, { onCall: (m,p) => { if (m==='POST' && p==='/platform/provisioning/tenants') writes.push(p); } });
    await enableCreate(page);
    page.once('dialog', d => d.dismiss());
    await createAction(page).click();
    expect(writes).toEqual([]);
    await expect(createName(page)).toHaveValue('New Fixture Tenant');
  });
  test('PPRO-032 Create payload trims name and encodes default toggles plus published preset version ID', async ({ page }) => {
    let posted: any;
    await openProvisioning(page, { onCall: (m,p,b) => { if (m==='POST' && p==='/platform/provisioning/tenants') posted=b; } });
    await createName(page).fill('  Example Tenant  ');
    page.once('dialog', d => d.accept());
    await createAction(page).click();
    await expect.poll(() => posted?.name).toBe('Example Tenant');
    expect(posted).toMatchObject({ preset: presetAlpha.key, preset_version_id: presetAlpha.id,
      plan_code: 'standard', create_storage_locations: true, create_onboarding_tasks: true });
    expect(posted.initial_admin).toBeUndefined();
  });
  test('PPRO-033 Create mutation trims optional location and admin identity but not password', async ({ page }) => {
    let posted: any;
    await openProvisioning(page, { onCall: (m,p,b) => { if (m==='POST' && p==='/platform/provisioning/tenants') posted=b; } });
    await createName(page).fill('Alpha Hotel');
    await createArea(page).getByLabel('Location', { exact: true }).fill('  Rijeka   ');
    await createArea(page).getByLabel('Initial admin email').fill('  admin@example.test  ');
    await createArea(page).getByLabel('Initial admin name').fill('  Example Admin  ');
    await createArea(page).getByLabel('Initial admin password').fill(' FixturesPassword15 ');
    page.once('dialog', d => d.accept());
    await createAction(page).click();
    await expect.poll(() => posted?.location).toBe('Rijeka');
    expect(posted.initial_admin).toEqual({ email: 'admin@example.test', name: 'Example Admin', password: ' FixturesPassword15 ' });
  });
  test('PPRO-034 Disabling both optional create actions sends false flags in POST payload', async ({ page }) => {
    let posted: any;
    await openProvisioning(page, { onCall: (m,p,b) => { if (m==='POST' && p==='/platform/provisioning/tenants') posted=b; } });
    await enableCreate(page);
    await createArea(page).getByLabel('Create starter storage-location records').uncheck();
    await createArea(page).getByLabel('Create onboarding task records').uncheck();
    page.once('dialog', d => d.accept());
    await createAction(page).click();
    await expect.poll(() => posted?.create_storage_locations).toBe(false);
    expect(posted.create_onboarding_tasks).toBe(false);
  });
  test('PPRO-035 A failed create request shows API error and preserves entered name', async ({ page }) => {
    await openProvisioning(page, { responses: { 'POST /platform/provisioning/tenants': { status: 409, json: { message: 'Fixture preset version changed' } } } });
    await enableCreate(page);
    page.once('dialog', d => d.accept());
    await createAction(page).click();
    await expect(page.locator('.platform-provisioning__feedback[data-tone="danger"]')).toBeVisible();
    await expect(createName(page)).toHaveValue('New Fixture Tenant');
  });
  test('PPRO-036 Successful intercepted create reports starter-record count and resets form', async ({ page }) => {
    await openProvisioning(page);
    await enableCreate(page);
    page.once('dialog', d => d.accept());
    await createAction(page).click();
    await expect(page.locator('.platform-provisioning__feedback[data-tone="success"]')).toContainText('1 starter locations recorded');
    await expect(createName(page)).toBeEmpty();
    await expect(createAction(page)).toBeDisabled();
  });
});

test.describe('Platform Provisioning — preview, apply options and access', () => {
  test('PPRO-037 No tenant selection keeps preview/apply mutation unavailable', async ({ page }) => {
    await openProvisioning(page);
    await expect(applyAction(page)).toBeDisabled();
    await expect(previewArea(page)).toHaveCount(0);
  });
  test('PPRO-038 Tenant selection updates tenant_id and calls selected published preset version preview', async ({ page }) => {
    const calls: string[] = [];
    await openProvisioning(page, { onCall: (m,p,_b,q) => { if (m==='GET' && p.includes('/preview/')) calls.push(`${p}?${q.toString()}`); } });
    await chooseTenant(page);
    await expect(page).toHaveURL(new RegExp(`tenant_id=${PLATFORM_TENANT_A}`));
    await expect.poll(() => calls.length).toBeGreaterThan(0);
    expect(calls[0]).toContain(`/preview/${presetAlpha.key}?preset_version_id=${presetAlpha.id}`);
  });
  test('PPRO-039 Unknown tenant_id warns and never enables existing tenant application', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: '00000000-0000-4000-8000-000000000000' });
    await expect(page.getByText('not present in the current tenant registry snapshot.')).toBeVisible();
    await expect(applyAction(page)).toBeDisabled();
  });
  test('PPRO-040 Preview failure renders retry without pretending plan evidence is available', async ({ page }) => {
    const previewPath = `/platform/provisioning/tenants/${PLATFORM_TENANT_A}/preview/${presetAlpha.key}`;
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A,
      responses: { [`GET ${previewPath}`]: { status: 503, json: { message: 'Fixture preview service unavailable' } } } });
    await expect(page.getByText('Provisioning preview failed.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry preview' })).toBeVisible();
    await expect(applyAction(page)).toBeDisabled();
  });
  test('PPRO-041 Preview renders selected tenant, planned entitlements and missing starter locations', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A });
    await expect(previewArea(page)).toContainText('Fixture Alpha');
    await expect(previewArea(page)).toContainText('Eligible for application');
    await expect(previewArea(page)).toContainText('Dry Store');
    await expect(previewArea(page)).toContainText('Cold Room');
  });
  test('PPRO-042 Preview shows actual match-skipping count and commercial entitlement source', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A });
    await expect(previewArea(page)).toContainText('Commercial plan');
    await expect(previewArea(page)).toContainText('Existing matches skipped');
    await expect(previewArea(page)).toContainText('1');
  });
  test('PPRO-043 No missing locations preview emits explicit no-location evidence note', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A,
      preview: { ...previewAlpha, storage_locations_to_create: [] } });
    await expect(page.getByText('No missing starter location records in this preview.')).toBeVisible();
    await expect(previewArea(page).locator('li')).toHaveCount(0);
  });
  test('PPRO-044 Blocked tenant lifecycle displays warning and disables apply', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A,
      preview: { ...previewAlpha, lifecycle_blocked: true } });
    await expect(page.getByText('Provisioning is blocked for this tenant lifecycle state.')).toBeVisible();
    await expect(applyAction(page)).toBeDisabled();
  });
  test('PPRO-045 Clearing both apply options blocks mutation and explains minimum change requirement', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A });
    await page.getByLabel('Apply organization type, feature flags and limits; record preset version on tenant').uncheck();
    await page.getByLabel('Create missing starter storage-location records').uncheck();
    await expect(page.getByText('Select at least one provisioning change.')).toBeVisible();
    await expect(applyAction(page)).toBeDisabled();
  });
  test('PPRO-046 Storage-only apply displays evidence warning about unchanged preset metadata', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A });
    await page.getByLabel('Apply organization type, feature flags and limits; record preset version on tenant').uncheck();
    await expect(page.getByText('Storage-only application')).toBeVisible();
    await expect(applyAction(page)).toBeEnabled();
  });
  test('PPRO-047 Without tenant-update permission preview remains visible but apply is unavailable', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A,
      permissions: provisionPermissions.filter(x => x !== 'platform.tenants.update') });
    await expect(previewArea(page)).toContainText('Fixture Alpha');
    await expect(page.getByText('Read-only provisioning view')).toBeVisible();
    await expect(applyAction(page)).toBeDisabled();
  });
  test('PPRO-048 Dismissing apply confirmation prevents POST while preview remains visible', async ({ page }) => {
    const writes: string[] = [];
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A,
      onCall: (m,p) => { if (m==='POST' && p.endsWith('/apply')) writes.push(p); } });
    await expect(applyAction(page)).toBeEnabled();
    page.once('dialog', d => d.dismiss());
    await applyAction(page).click();
    expect(writes).toEqual([]);
    await expect(previewArea(page)).toContainText('Fixture Alpha');
  });
  test('PPRO-049 Confirmed apply posts selected preset key and immutable published version reference', async ({ page }) => {
    let posted: any;
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A,
      onCall: (m,p,b) => { if (m==='POST' && p.endsWith('/apply')) posted=b; } });
    await expect(applyAction(page)).toBeEnabled();
    page.once('dialog', d => d.accept());
    await applyAction(page).click();
    await expect.poll(() => posted?.preset).toBe(presetAlpha.key);
    expect(posted).toMatchObject({ preset_version_id: presetAlpha.id,
      create_storage_locations: true, update_entitlements: true });
  });
  test('PPRO-050 Storage-only apply sends false entitlement update and true location flag', async ({ page }) => {
    let posted: any;
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A,
      onCall: (m,p,b) => { if (m==='POST' && p.endsWith('/apply')) posted=b; } });
    await page.getByLabel('Apply organization type, feature flags and limits; record preset version on tenant').uncheck();
    page.once('dialog', d => d.accept());
    await applyAction(page).click();
    await expect.poll(() => posted?.update_entitlements).toBe(false);
    expect(posted.create_storage_locations).toBe(true);
  });
});

// Batch 54: source-grounded browser assertions. No real data is written.

test.describe('Platform Provisioning — additional apply feedback, refresh and routing', () => {
  test('PPRO-051 Successful apply reports committed transaction and recorded preset metadata', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A });
    page.once('dialog', dialog => dialog.accept());
    await applyAction(page).click();
    await expect(page.locator('.platform-provisioning__feedback[data-tone="success"]')).toContainText('Provisioning transaction committed. 1 starter locations created; preset metadata updated with tenant configuration.');
  });
  test('PPRO-052 Storage-only successful apply reports unchanged preset metadata', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A, responses: {
      [`POST /platform/provisioning/tenants/${PLATFORM_TENANT_A}/apply`]: { json: { ...applyFixture, preset_recorded_on_tenant: false } }
    }});
    await page.getByLabel('Apply organization type, feature flags and limits; record preset version on tenant').uncheck();
    page.once('dialog', dialog => dialog.accept());
    await applyAction(page).click();
    await expect(page.locator('.platform-provisioning__feedback[data-tone="success"]')).toContainText('left unchanged because entitlements were not applied');
  });
  test('PPRO-053 Apply 409 conflict displays error without false committed confirmation', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A, responses: {
      [`POST /platform/provisioning/tenants/${PLATFORM_TENANT_A}/apply`]: { status: 409, json: { error: { message: 'Preset snapshot conflict' } } }
    }});
    page.once('dialog', dialog => dialog.accept());
    await applyAction(page).click();
    await expect(page.locator('.platform-provisioning__feedback[data-tone="danger"]')).toBeVisible();
    await expect(page.locator('.platform-provisioning__feedback[data-tone="success"]')).toHaveCount(0);
  });
  test('PPRO-054 Apply 503 failure leaves preview visible with error feedback', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A, responses: {
      [`POST /platform/provisioning/tenants/${PLATFORM_TENANT_A}/apply`]: { status: 503, json: { error: { message: 'Provisioning temporarily offline' } } }
    }});
    page.once('dialog', dialog => dialog.accept());
    await applyAction(page).click();
    await expect(page.locator('.platform-provisioning__feedback[data-tone="danger"]')).toBeVisible();
    await expect(previewArea(page)).toContainText('Fixture Alpha');
  });
  test('PPRO-055 Preview retry can recover after initial transport error', async ({ page }) => {
    const endpoint = `/platform/provisioning/tenants/${PLATFORM_TENANT_A}/preview/${presetAlpha.key}`;
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A, responses: {
      [`GET ${endpoint}`]: { status: 503, json: { message: 'Fixture initial outage' } }
    }});
    await expect(page.getByRole('button', { name: 'Retry preview' })).toBeVisible();
    await page.route('**/platform/provisioning/tenants/**/preview/**', async route => {
      if (route.request().isNavigationRequest()) return route.continue();
      await fulfillJson(route, previewAlpha);
    });
    await page.getByRole('button', { name: 'Retry preview' }).click();
    await expect(previewArea(page)).toContainText('Fixture Alpha');
    await expect(page.getByText('Provisioning preview failed.')).toHaveCount(0);
  });
  test('PPRO-056 Background preview refresh failure warns snapshot is stale rather than clearing it', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A });
    await expect(previewArea(page)).toContainText('Fixture Alpha');
    await page.route('**/platform/provisioning/tenants/**/preview/**', async route => {
      if (route.request().isNavigationRequest()) return route.continue();
      await fulfillJson(route, { error: { message: 'Preview refresh failed' } }, 503);
    });
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByText('Showing the last successful snapshot.')).toBeVisible();
    await expect(previewArea(page)).toContainText('Fixture Alpha');
  });
  test('PPRO-057 Background preset registry refresh failure keeps last successful source snapshot', async ({ page }) => {
    await openProvisioning(page);
    await expect(page.getByText('2 published presets')).toBeVisible();
    await page.route('**/platform/provisioning/presets', async route => fulfillJson(route, { message: 'Preset refresh failed' }, 503));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByText('Showing the last successful snapshot.')).toBeVisible();
    await expect(page.locator('.platform-provisioning__preset-card')).toHaveCount(2);
  });
  test('PPRO-058 Background tenant registry refresh failure keeps last successful source snapshot', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A });
    await expect(previewArea(page)).toContainText('Fixture Alpha');
    await page.route('**/platform/tenants', async route => fulfillJson(route, { message: 'Tenant refresh failed' }, 503));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByText('Showing the last successful snapshot.')).toBeVisible();
    await expect(previewArea(page)).toContainText('Fixture Alpha');
  });
  test('PPRO-059 Tenant change triggers new preview GET with new selected tenant id', async ({ page }) => {
    const urls: string[] = [];
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A, onCall: (m, path) => { if (m === 'GET' && path.includes('/preview/')) urls.push(path); } });
    await selectors(page).getByLabel('Tenant', { exact: true }).selectOption(provisionTenants[1].id);
    await expect.poll(() => urls.some(path => path.includes(provisionTenants[1].id))).toBe(true);
    await expect(page).toHaveURL(new RegExp(`tenant_id=${provisionTenants[1].id}`));
  });
  test('PPRO-060 Preset change triggers new preview GET with new published version id', async ({ page }) => {
    const urls: string[] = [];
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A, onCall: (m, path, _body, search) => { if (m === 'GET' && path.includes('/preview/')) urls.push(`${path}?${search}`); } });
    await choosePreset(page, presetBeta.key);
    await expect.poll(() => urls.some(url => url.includes(`/preview/${presetBeta.key}`) && url.includes(`preset_version_id=${presetBeta.id}`))).toBe(true);
  });
  test('PPRO-061 Selecting a different tenant clears prior mutation feedback', async ({ page }) => {
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A });
    page.once('dialog', dialog => dialog.accept());
    await applyAction(page).click();
    await expect(page.locator('.platform-provisioning__feedback[data-tone="success"]')).toBeVisible();
    await selectors(page).getByLabel('Tenant', { exact: true }).selectOption(provisionTenants[1].id);
    await expect(page.locator('.platform-provisioning__feedback')).toHaveCount(0);
  });
  test('PPRO-062 Refreshing selected preview refetches all three evidence sources', async ({ page }) => {
    const calls: Record<string, number> = {};
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A, onCall: (m,p) => { if (m === 'GET') calls[p] = (calls[p] || 0) + 1; } });
    await expect(previewArea(page)).toContainText('Fixture Alpha');
    const paths = ['/platform/provisioning/presets', '/platform/tenants', `/platform/provisioning/tenants/${PLATFORM_TENANT_A}/preview/${presetAlpha.key}`];
    const before = paths.map(path => calls[path] || 0);
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    for (let i = 0; i < paths.length; i++) await expect.poll(() => calls[paths[i]] || 0).toBeGreaterThan(before[i]);
  });
  test('PPRO-063 Supporting Platform page links reflect audit and preset permissions', async ({ page }) => {
    await openProvisioning(page, { permissions: provisionPermissions.filter(p => p !== 'platform.audit.read') });
    await expect(page.getByRole('link', { name: 'Manage presets' })).toHaveAttribute('href', '/platform/provisioning-presets');
    await expect(page.getByRole('link', { name: 'Platform audit' })).toHaveCount(0);
  });
  test('PPRO-064 Entitlement-only apply sends false create-storage-locations flag', async ({ page }) => {
    let body: any;
    await openProvisioning(page, { selectedTenant: PLATFORM_TENANT_A,
      onCall: (m,p,b) => { if (m === 'POST' && p.endsWith('/apply')) body = b; } });
    await page.getByLabel('Create missing starter storage-location records').uncheck();
    page.once('dialog', dialog => dialog.accept());
    await applyAction(page).click();
    await expect.poll(() => body?.create_storage_locations).toBe(false);
    expect(body.update_entitlements).toBe(true);
  });
});
