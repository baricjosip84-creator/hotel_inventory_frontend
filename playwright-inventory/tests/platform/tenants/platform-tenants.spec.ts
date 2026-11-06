import { test, expect, type Page } from '@playwright/test';
import { openSyntheticPlatformTenants, tenantRowsFixture, tenantDetailsFixture, tenantPresetsFixture,
  tenantFixturePermissions, PLATFORM_TENANT_A, PLATFORM_TENANT_B } from '../../../support/platformSession';

// Batch 51: mocked transport UI scenarios, not real provisioning, permissions,
// password/session revocation, billing mutation, or tenant isolation validation.
const createButton = (page: Page) => page.getByRole('button', { name: 'Create tenant', exact: true });
const registry = (page: Page) => page.locator('.platform-tenants__table').first();
const alphaRow = (page: Page) => registry(page).locator('tbody tr').filter({ hasText: 'Fixture Alpha' });
const betaRow = (page: Page) => registry(page).locator('tbody tr').filter({ hasText: 'Fixture Beta' });
const createForm = (page: Page) => page.locator('.platform-tenants__section').filter({ has: page.getByRole('heading', { name: 'Create tenant' }) });

// First 30 of a deliberately provisional 85-case inventory. Future batches
// must cover tenant users, support policy, exports, write locks and edge states.
test.describe('Platform Tenants — registry and provisioning (Batch 51)', () => {
  test('PTEN-001 Tenant registry displays isolated synthetic rows and status summary', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await expect(registry(page).locator('tbody tr')).toHaveCount(2);
    await expect(alphaRow(page)).toContainText('Fixture Alpha');
    await expect(betaRow(page)).toContainText('Suspended');
    await expect(page.getByText('tenant workspaces')).toBeVisible();
  });
  test('PTEN-002 Registry summary counts active and locked tenants separately', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await expect(page.locator('.platform-tenants__section').filter({ hasText: 'Tenant registry' })).toBeVisible();
    await expect(alphaRow(page).getByText('Open', { exact: true })).toBeVisible();
    await expect(betaRow(page).getByText('Locked', { exact: true })).toBeVisible();
  });
  test('PTEN-003 Billing attention stays read-only and links to billing management', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await expect(alphaRow(page).getByRole('link', { name: 'Manage in Billing' })).toHaveAttribute('href', `/platform/billing?tenant_id=${PLATFORM_TENANT_A}`);
    await expect(alphaRow(page)).toContainText('Past due');
  });
  test('PTEN-004 Selecting tenant updates tenant_id and renders detail', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await alphaRow(page).getByRole('button', { name: /Fixture Alpha/ }).click();
    await expect(page).toHaveURL(new RegExp(`tenant_id=${PLATFORM_TENANT_A}`));
    await expect(page.getByRole('heading', { name: 'Tenant users' })).toBeVisible();
    await expect(alphaRow(page)).toHaveAttribute('data-selected', 'true');
  });
  test('PTEN-005 Closing tenant detail clears only tenant_id query parameter', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A });
    await page.getByRole('button', { name: 'Close detail' }).click();
    await expect(page).not.toHaveURL(/tenant_id=/);
    await expect(page.getByRole('heading', { name: 'Tenant users' })).toHaveCount(0);
  });
  test('PTEN-006 Malformed selected tenant id gives explicit warning and no detail GET', async ({ page }) => {
    const detailPaths: string[] = [];
    await openSyntheticPlatformTenants(page, { selectedId: 'not-a-uuid', onCall: (m,p) => { if (m === 'GET' && /^\/platform\/tenants\//.test(p)) detailPaths.push(p); } });
    await expect(page.getByRole('alert')).toContainText('Invalid tenant selection.');
    expect(detailPaths).toEqual([]);
    await page.getByRole('button', { name: 'Clear selection' }).click();
    await expect(page).not.toHaveURL(/tenant_id=/);
  });
  test('PTEN-007 Registry empty state does not offer fabricated tenants', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { tenants: [] });
    await expect(registry(page).getByText('No tenants found.')).toBeVisible();
    await expect(alphaRow(page)).toHaveCount(0);
  });
  test('PTEN-008 Registry initial 503 provides retry instead of stale tenant rows', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { responses: { 'GET /platform/tenants': { status: 503, json: { message: 'Fixture tenant registry unavailable' } } } });
    await expect(page.getByRole('alert')).toContainText('Unable to load tenant registry.');
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    await expect(registry(page)).toHaveCount(0);
  });
  test('PTEN-009 Registry retry can recover from intercepted transport failure', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { responses: { 'GET /platform/tenants': { status: 503, json: { message: 'Fixture initial failure' } } } });
    await page.route('**/platform/tenants', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tenantRowsFixture) }));
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(alphaRow(page)).toBeVisible();
  });
  test('PTEN-010 No Tenant Update permission hides editable lifecycle/currency fields', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { permissions: ['platform.tenants.read'] });
    await expect(alphaRow(page).getByText('Active', { exact: true })).toBeVisible();
    await expect(alphaRow(page).getByRole('combobox')).toHaveCount(0);
    await expect(alphaRow(page).getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Create tenant' })).toHaveCount(0);
  });
  test('PTEN-011 Tenant Create permission alone is insufficient without preset read permission', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { permissions: ['platform.tenants.read', 'platform.tenants.create'] });
    await expect(createForm(page).getByText('Provisioning Presets read permission is required')).toBeVisible();
    await expect(createButton(page)).toBeDisabled();
  });
  test('PTEN-012 No published preset blocks tenant creation', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { presets: [] });
    await expect(createForm(page).getByText('At least one published provisioning preset is required', { exact: false })).toBeVisible();
    await expect(createButton(page)).toBeDisabled();
  });
  test('PTEN-013 Empty tenant name blocks creation despite available presets', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await expect(createForm(page).getByText('Enter a tenant name before creating a tenant.')).toBeVisible();
    await expect(createButton(page)).toBeDisabled();
  });
  test('PTEN-014 Tenant form auto-selects first published provisioning preset', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await expect(createForm(page).getByLabel('Published preset')).toHaveValue('starter_preset');
    await expect(createForm(page).getByRole('link', { name: 'Provisioning presets' })).toHaveAttribute('href', '/platform/provisioning-presets');
  });
  test('PTEN-015 Tenant currency is uppercased and clipped to three characters', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await createForm(page).getByLabel('Inventory currency').fill('usdmore');
    await expect(createForm(page).getByLabel('Inventory currency')).toHaveValue('USD');
  });
  test('PTEN-016 Incomplete initial administrator fields disable creation', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await createForm(page).getByLabel('Tenant name').fill('New Fixture');
    await createForm(page).getByLabel('Initial admin email').fill('admin@fixture.test');
    await expect(createButton(page)).toBeDisabled();
    await expect(createForm(page).getByText('Complete initial admin email, name, and password', { exact: false })).toBeVisible();
  });
  test('PTEN-017 Invalid initial administrator email remains blocked', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await createForm(page).getByLabel('Tenant name').fill('New Fixture');
    await createForm(page).getByLabel('Initial admin email').fill('not-an-email');
    await createForm(page).getByLabel('Initial admin name').fill('Fixture User');
    await createForm(page).getByLabel('Initial admin password').fill('fixture-password');
    await expect(createButton(page)).toBeDisabled();
    await expect(createForm(page).getByText('Enter a valid initial admin email address.')).toBeVisible();
  });
  test('PTEN-018 Short administrator password is rejected at ten-character boundary', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await createForm(page).getByLabel('Tenant name').fill('New Fixture');
    await createForm(page).getByLabel('Initial admin email').fill('admin@fixture.test');
    await createForm(page).getByLabel('Initial admin name').fill('Fixture User');
    await createForm(page).getByLabel('Initial admin password').fill('123456789');
    await expect(createButton(page)).toBeDisabled();
    await expect(createForm(page).getByText('Initial admin password must be at least 10 characters.')).toBeVisible();
  });
  test('PTEN-019 Creating tenant without initial admin omits initial_admin and preserves onboarding choice', async ({ page }) => {
    const submissions: any[] = [];
    await openSyntheticPlatformTenants(page, { onCall: (m,p,b) => { if (m === 'POST' && p === '/platform/tenants') submissions.push(b); } });
    await createForm(page).getByLabel('Tenant name').fill('  Synthetic Tenant  ');
    await createForm(page).getByText('Create customer onboarding tasks automatically').click();
    await createButton(page).click();
    await expect(page.getByRole('status')).toContainText('Tenant created successfully.');
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({ name: 'Synthetic Tenant', create_onboarding_tasks: false, preset: 'starter_preset', plan_code: 'standard', inventory_currency: 'EUR' });
    expect(submissions[0].initial_admin).toBeUndefined();
  });
  test('PTEN-020 Creating tenant with complete administrator sends a scoped initial_admin body', async ({ page }) => {
    const submissions: any[] = [];
    await openSyntheticPlatformTenants(page, { onCall: (m,p,b) => { if (m === 'POST' && p === '/platform/tenants') submissions.push(b); } });
    await createForm(page).getByLabel('Tenant name').fill('Admin Fixture');
    await createForm(page).getByLabel('Initial admin email').fill('fixture-admin@example.test');
    await createForm(page).getByLabel('Initial admin name').fill('First Admin');
    await createForm(page).getByLabel('Initial admin password').fill('fixture-password-123');
    await createButton(page).click();
    await expect(page.getByRole('status')).toContainText('Tenant created successfully.');
    expect(submissions).toHaveLength(1);
    expect(submissions[0].initial_admin).toMatchObject({ email: 'fixture-admin@example.test', name: 'First Admin', password: 'fixture-password-123' });
    expect(submissions[0].preset_version_id).toBe(tenantPresetsFixture[0].id);
  });
  test('PTEN-021 Tenant create API rejection shows inline failure and preserves form inputs', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { responses: { 'POST /platform/tenants': { status: 409, json: { message: 'Fixture tenant conflict' } } } });
    await createForm(page).getByLabel('Tenant name').fill('Name Retained');
    await createButton(page).click();
    await expect(createForm(page).getByText('Fixture tenant conflict')).toBeVisible();
    await expect(createForm(page).getByLabel('Tenant name')).toHaveValue('Name Retained');
  });
  test('PTEN-022 Lifecycle status change prompts confirmation before PATCH', async ({ page }) => {
    const writes: any[] = [];
    await openSyntheticPlatformTenants(page, { onCall: (m,p,b) => { if (m === 'PATCH') writes.push({ p,b }); } });
    page.once('dialog', dialog => dialog.dismiss());
    await alphaRow(page).getByRole('combobox').selectOption('suspended');
    expect(writes).toHaveLength(0);
  });
  test('PTEN-023 Confirmed status change submits only selected tenant id and status', async ({ page }) => {
    const writes: any[] = [];
    await openSyntheticPlatformTenants(page, { onCall: (m,p,b) => { if (m === 'PATCH') writes.push({ p,b }); } });
    page.once('dialog', dialog => dialog.accept());
    await alphaRow(page).getByRole('combobox').selectOption('maintenance');
    await expect(page.getByRole('status')).toContainText('Tenant settings updated.');
    expect(writes).toEqual([{ p: `/platform/tenants/${PLATFORM_TENANT_A}`, b: { status: 'maintenance' } }]);
  });
  test('PTEN-024 Status unchanged triggers no PATCH or confirmation', async ({ page }) => {
    const writes: string[] = [];
    await openSyntheticPlatformTenants(page, { onCall: (m,p) => { if (m === 'PATCH') writes.push(p); } });
    await alphaRow(page).getByRole('combobox').selectOption('active');
    expect(writes).toHaveLength(0);
  });
  test('PTEN-025 Currency blur with invalid code restores original and shows warning', async ({ page }) => {
    const writes: string[] = [];
    await openSyntheticPlatformTenants(page, { onCall: (m,p) => { if (m === 'PATCH') writes.push(p); } });
    const input = alphaRow(page).getByRole('textbox', { name: 'Fixture Alpha inventory currency' });
    await input.fill('X');
    await input.blur();
    await expect(input).toHaveValue('EUR');
    await expect(page.getByRole('status')).toContainText('Inventory currency must be a 3-letter code.');
    expect(writes).toHaveLength(0);
  });
  test('PTEN-026 Cancelled currency confirmation reverts without PATCH', async ({ page }) => {
    const writes: string[] = [];
    await openSyntheticPlatformTenants(page, { onCall: (m,p) => { if (m === 'PATCH') writes.push(p); } });
    const input = alphaRow(page).getByRole('textbox', { name: 'Fixture Alpha inventory currency' });
    page.once('dialog', dialog => dialog.dismiss());
    await input.fill('USD'); await input.blur();
    await expect(input).toHaveValue('EUR');
    expect(writes).toEqual([]);
  });
  test('PTEN-027 Confirmed currency change submits uppercase code with no FX conversion', async ({ page }) => {
    const writes: any[] = [];
    await openSyntheticPlatformTenants(page, { onCall: (m,p,b) => { if (m === 'PATCH') writes.push({ p,b }); } });
    const input = alphaRow(page).getByRole('textbox', { name: 'Fixture Alpha inventory currency' });
    page.once('dialog', async dialog => { expect(dialog.message()).toContain('No automatic FX conversion'); await dialog.accept(); });
    await input.fill('usd'); await input.blur();
    await expect(page.getByRole('status')).toContainText('Tenant settings updated.');
    expect(writes).toEqual([{ p: `/platform/tenants/${PLATFORM_TENANT_A}`, b: { inventory_currency: 'USD' } }]);
  });
  test('PTEN-028 Selected tenant detail displays tenant-scoped usage and session counts', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A });
    const detail = page.locator('.platform-tenants__section').filter({ has: page.getByRole('heading', { name: 'Tenant users' }) });
    await expect(detail.getByText('1 active / 4 total')).toBeVisible();
    await expect(detail.getByRole('heading', { name: 'Usage and limits' })).toBeVisible();
    await expect(detail.getByText('2 / 20')).toBeVisible();
  });
  test('PTEN-029 Tenant details show synthetic user status and last-login fallback', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A });
    const users = page.locator('.platform-tenants__subsection').filter({ has: page.getByRole('heading', { name: 'Tenant users' }) });
    await expect(users.getByText('admin@fixture.test')).toBeVisible();
    await expect(users.getByText('Never', { exact: true })).toBeVisible();
  });
  test('PTEN-030 Selected tenant carries tenant_id into related platform links', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A });
    const links = page.locator('.platform-tenants__link-row');
    await expect(links.getByRole('link', { name: 'Tenant health' })).toHaveAttribute('href', `/platform/tenant-health?tenant_id=${PLATFORM_TENANT_A}`);
    await expect(links.getByRole('link', { name: 'Tenant exports' })).toHaveAttribute('href', `/platform/tenant-exports?tenant_id=${PLATFORM_TENANT_A}`);
    await expect(links.getByRole('link', { name: 'Billing' })).toHaveAttribute('href', `/platform/billing?tenant_id=${PLATFORM_TENANT_A}`);
  });
});


// Batch 52: completion of provisional PTEN-031…085 scenario inventory.
// All mutations and readbacks are intercepted; these assertions only describe
// browser-observable behavior, NOT live RBAC, user revocation or data persistence.
const usersArea = (page: Page) => page.locator('.platform-tenants__subsection').filter({ has: page.getByRole('heading', { name: 'Tenant users' }) });
const userEditor = (page: Page) => usersArea(page).locator('.platform-tenants__admin-box');
const userRow = (page: Page) => usersArea(page).locator('tbody tr').filter({ hasText: 'admin@fixture.test' });
const entArea = (page: Page) => page.locator('.platform-tenants__subsection').filter({ has: page.getByRole('heading', { name: 'Entitlements' }) });
const policyArea = (page: Page) => page.locator('.platform-tenants__subsection').filter({ has: page.getByRole('heading', { name: 'Support access policy' }) });
const chosen = (page: Page) => openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A });

 test.describe('Platform Tenants — detail and tenant-user lifecycle (Batch 52)', () => {
  test('PTEN-031 Initial tenant detail 503 exposes Retry tenant detail and no fabricated usage', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A, responses: { [`GET /platform/tenants/${PLATFORM_TENANT_A}`]: { status: 503, json: { message: 'Fixture unavailable' } } } });
    await expect(page.getByRole('alert')).toContainText('Unable to load tenant detail.');
    await expect(page.getByRole('button', { name: 'Retry tenant detail' })).toBeVisible();
    await expect(usersArea(page)).toHaveCount(0);
  });
  test('PTEN-032 Detail retry loads selected data after a synthetic transport failure', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A, responses: { [`GET /platform/tenants/${PLATFORM_TENANT_A}`]: { status: 503, json: { message: 'Fixture unavailable' } } } });
    await page.route(`**/platform/tenants/${PLATFORM_TENANT_A}`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tenantDetailsFixture) }));
    await page.getByRole('button', { name: 'Retry tenant detail' }).click();
    await expect(usersArea(page).getByText('admin@fixture.test')).toBeVisible();
  });
  test('PTEN-033 Detail refresh failure preserves the last successful detail snapshot', async ({ page }) => {
    await chosen(page);
    await page.route(`**/platform/tenants/${PLATFORM_TENANT_A}`, r => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Fixture refresh down' }) }));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Showing the last successful tenant detail snapshot.');
    await expect(usersArea(page).getByText('admin@fixture.test')).toBeVisible();
  });
  test('PTEN-034 Valid direct tenant selection remains available with an empty registry', async ({ page }) => {
    await openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A, tenants: [] });
    await expect(registry(page)).toContainText('No tenants found.');
    await expect(usersArea(page).getByText('admin@fixture.test')).toBeVisible();
  });
  test('PTEN-035 Switching selected tenant fetches the new UUID detail and updates selection', async ({ page }) => {
    const calls: string[] = [];
    await openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A, onCall: (m,p) => { if (m==='GET' && p.startsWith('/platform/tenants/')) calls.push(p); } });
    await betaRow(page).getByRole('button', { name: /Fixture Beta/ }).click();
    await expect(page).toHaveURL(new RegExp(`tenant_id=${PLATFORM_TENANT_B}`));
    await expect(betaRow(page)).toHaveAttribute('data-selected', 'true');
    await expect(page.locator('.platform-tenants__detail-summary')).toBeVisible();
    expect(calls).toContain(`/platform/tenants/${PLATFORM_TENANT_B}`);
  });
  test('PTEN-036 Tenant user form requires email name and password', async ({ page }) => {
    await chosen(page);
    await expect(userEditor(page).getByRole('button', { name: 'Create or reset user' })).toBeDisabled();
    await expect(userEditor(page)).toContainText('Email, name, role, and password are required.');
  });
  test('PTEN-037 Tenant user form rejects malformed email before POST', async ({ page }) => {
    const writes: string[]=[];
    await openSyntheticPlatformTenants(page, { selectedId: PLATFORM_TENANT_A, onCall:(m,p)=>{ if(m==='POST') writes.push(p); } });
    await userEditor(page).getByLabel('Email').fill('bad-email');
    await userEditor(page).getByLabel('Name').fill('Fixture Staff');
    await userEditor(page).getByLabel('Temporary password').fill('temporary-password');
    await expect(userEditor(page).getByRole('button',{name:'Create or reset user'})).toBeDisabled();
    await expect(userEditor(page)).toContainText('Enter a valid tenant user email address.');
    expect(writes).toEqual([]);
  });
  test('PTEN-038 Tenant user password boundary rejects nine characters', async ({ page }) => {
    await chosen(page);
    await userEditor(page).getByLabel('Email').fill('new@fixture.test');
    await userEditor(page).getByLabel('Name').fill('Fixture Staff');
    await userEditor(page).getByLabel('Temporary password').fill('123456789');
    await expect(userEditor(page).getByRole('button',{name:'Create or reset user'})).toBeDisabled();
    await expect(userEditor(page)).toContainText('Tenant user password must be at least 10 characters.');
  });
  test('PTEN-039 Tenant user upsert sends scoped role credentials to selected tenant', async ({ page }) => {
    const writes: any[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p,b)=>{if(m==='POST')writes.push({p,b});}});
    await userEditor(page).getByLabel('Email').fill(' new@fixture.test ');
    await userEditor(page).getByLabel('Name').fill('Fixture Staff');
    await userEditor(page).getByLabel('Role').selectOption('staff');
    await userEditor(page).getByLabel('Temporary password').fill('temporary-password-123');
    await userEditor(page).getByRole('button',{name:'Create or reset user'}).click();
    await expect(page.getByRole('status')).toContainText('Tenant user created or reset.');
    expect(writes).toEqual([{p:`/platform/tenants/${PLATFORM_TENANT_A}/users`,b:{email:' new@fixture.test ',name:'Fixture Staff',role:'staff',password:'temporary-password-123'}}]);
  });
  test('PTEN-040 Successful tenant user upsert clears fields and shows session-revocation caveat', async ({ page }) => {
    await chosen(page);
    await userEditor(page).getByLabel('Email').fill('new@fixture.test');
    await userEditor(page).getByLabel('Name').fill('Fixture Staff');
    await userEditor(page).getByLabel('Temporary password').fill('temporary-password-123');
    await userEditor(page).getByRole('button',{name:'Create or reset user'}).click();
    await expect(page.getByRole('status')).toContainText('Existing sessions were revoked when the account already existed.');
    await expect(userEditor(page).getByLabel('Email')).toHaveValue('');
    await expect(userEditor(page).getByLabel('Temporary password')).toHaveValue('');
  });
  test('PTEN-041 Tenant user upsert rejection keeps form values and shows inline error', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,responses:{[`POST /platform/tenants/${PLATFORM_TENANT_A}/users`]:{status:409,json:{message:'Fixture upsert conflict'}}}});
    await userEditor(page).getByLabel('Email').fill('existing@fixture.test');
    await userEditor(page).getByLabel('Name').fill('Fixture Name');
    await userEditor(page).getByLabel('Temporary password').fill('temporary-password-123');
    await userEditor(page).getByRole('button',{name:'Create or reset user'}).click();
    await expect(usersArea(page).locator('.platform-tenants__inline-error')).toContainText('Fixture upsert conflict');
    await expect(userEditor(page).getByLabel('Email')).toHaveValue('existing@fixture.test');
  });
  test('PTEN-042 Tenant user role field offers exactly admin manager and staff', async ({ page }) => {
    await chosen(page);
    await expect(userEditor(page).getByLabel('Role').locator('option')).toHaveCount(3);
    await expect(userEditor(page).getByLabel('Role').locator('option')).toHaveText(['Admin','Manager','Staff']);
  });
  test('PTEN-043 Cancelling reset-password prompt sends no password mutation', async ({ page }) => {
    const calls: string[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p)=>{if(m==='PATCH')calls.push(p);}});
    page.once('dialog', d=>d.dismiss());
    await userRow(page).getByRole('button',{name:'Reset password'}).click();
    expect(calls).toEqual([]);
  });
  test('PTEN-044 Reset-password prompt below ten characters warns without PATCH', async ({ page }) => {
    const calls: string[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p)=>{if(m==='PATCH')calls.push(p);}});
    page.once('dialog',d=>d.accept('short'));
    await userRow(page).getByRole('button',{name:'Reset password'}).click();
    await expect(page.getByRole('status')).toContainText('the new password must be at least 10 characters.');
    expect(calls).toEqual([]);
  });
  test('PTEN-045 Reset-password PATCH sends only password under selected user id', async ({ page }) => {
    const calls: any[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p,b)=>{if(m==='PATCH')calls.push({p,b});}});
    page.once('dialog',d=>d.accept('new-valid-password'));
    await userRow(page).getByRole('button',{name:'Reset password'}).click();
    await expect(page.getByRole('status')).toContainText('Password reset.');
    expect(calls).toEqual([{p:`/platform/tenants/${PLATFORM_TENANT_A}/users/${PLATFORM_TENANT_USER}/password`,b:{password:'new-valid-password'}}]);
  });
  test('PTEN-046 Disabling a tenant user requires confirmation and cancellation writes nothing', async ({ page }) => {
    const calls: string[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p)=>{if(m==='PATCH')calls.push(p);}});
    page.once('dialog',async d=>{expect(d.message()).toContain('Active sessions will be revoked immediately.');await d.dismiss();});
    await userRow(page).getByRole('button',{name:'Disable'}).click();
    expect(calls).toEqual([]);
  });
  test('PTEN-047 Enabling an inactive tenant user sends is_active true after confirmation', async ({ page }) => {
    const calls: any[]=[];
    const details={...tenantDetailsFixture,users:[{...tenantDetailsFixture.users[0],is_active:false}]};
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,details,onCall:(m,p,b)=>{if(m==='PATCH')calls.push({p,b});}});
    page.once('dialog',d=>d.accept());
    await userRow(page).getByRole('button',{name:'Enable'}).click();
    await expect(page.getByRole('status')).toContainText('Tenant user enabled.');
    expect(calls).toEqual([{p:`/platform/tenants/${PLATFORM_TENANT_A}/users/${PLATFORM_TENANT_USER}/status`,b:{is_active:true}}]);
  });
  test('PTEN-048 Delete tenant user confirmation warns irreversibility and cancellation avoids DELETE', async ({ page }) => {
    const calls: string[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p)=>{if(m==='DELETE')calls.push(p);}});
    page.once('dialog',async d=>{expect(d.message()).toContain('cannot be undone'); await d.dismiss();});
    await userRow(page).getByRole('button',{name:'Delete'}).click();
    expect(calls).toEqual([]);
  });
  test('PTEN-049 Confirmed user deletion sends only selected tenant user DELETE', async ({ page }) => {
    const calls: string[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p)=>{if(m==='DELETE')calls.push(p);}});
    page.once('dialog',d=>d.accept());
    await userRow(page).getByRole('button',{name:'Delete'}).click();
    await expect(page.getByRole('status')).toContainText('Tenant user deleted.');
    expect(calls).toEqual([`/platform/tenants/${PLATFORM_TENANT_A}/users/${PLATFORM_TENANT_USER}`]);
  });
 });

 test.describe('Platform Tenants — entitlements and support controls (Batch 52)', () => {
  test('PTEN-050 Unchanged entitlements keep Save disabled', async ({ page }) => {
    await chosen(page);
    await expect(entArea(page).getByRole('button',{name:'Save entitlements'})).toBeDisabled();
    await expect(entArea(page)).toContainText('No entitlement changes.');
  });
  test('PTEN-051 Changing plan submits updated commercial plan and current entitlements', async ({ page }) => {
    const calls: any[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p,b)=>{if(m==='PATCH')calls.push({p,b});}});
    await entArea(page).getByLabel('Plan').selectOption('enterprise');
    await expect(entArea(page)).toContainText('Unsaved entitlement changes.');
    await entArea(page).getByRole('button',{name:'Save entitlements'}).click();
    await expect(page.getByRole('status')).toContainText('Tenant entitlements saved.');
    expect(calls).toEqual([{p:`/platform/tenants/${PLATFORM_TENANT_A}/entitlements`,b:{plan_code:'enterprise',feature_flags:{inventory:true,reports:false},limits:{max_users:20,max_products:500,max_storage_locations:null}}}]);
  });
  test('PTEN-052 Blank limit translates to null rather than zero in entitlement PATCH', async ({ page }) => {
    const calls: any[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p,b)=>{if(m==='PATCH')calls.push(b);}});
    await entArea(page).getByLabel('Max users').fill('');
    await entArea(page).getByRole('button',{name:'Save entitlements'}).click();
    await expect(page.getByRole('status')).toContainText('Tenant entitlements saved.');
    expect(calls).toHaveLength(1);
    expect(calls[0].limits.max_users).toBeNull();
  });
  test('PTEN-053 Known feature flag toggles dirty state and is submitted as boolean', async ({ page }) => {
    const calls: any[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p,b)=>{if(m==='PATCH')calls.push(b);}});
    await entArea(page).getByLabel('Reports').check();
    await entArea(page).getByRole('button',{name:'Save entitlements'}).click();
    expect(calls[0].feature_flags.reports).toBe(true);
  });
  test('PTEN-054 Server-defined custom feature flag remains independently editable', async ({ page }) => {
    const details={...tenantDetailsFixture,tenant:{...tenantDetailsFixture.tenant,feature_flags:{...tenantDetailsFixture.tenant.feature_flags,custom_module:true}}};
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,details});
    await expect(entArea(page).getByLabel('Custom module')).toBeChecked();
    await entArea(page).getByLabel('Custom module').uncheck();
    await expect(entArea(page).getByRole('button',{name:'Save entitlements'})).toBeEnabled();
  });
  test('PTEN-055 Entitlement API rejection is visible inline and does not show success', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,responses:{[`PATCH /platform/tenants/${PLATFORM_TENANT_A}/entitlements`]:{status:503,json:{message:'Fixture entitlement service unavailable'}}}});
    await entArea(page).getByLabel('Plan').selectOption('enterprise');
    await entArea(page).getByRole('button',{name:'Save entitlements'}).click();
    await expect(entArea(page).locator('.platform-tenants__inline-error')).toContainText('Fixture entitlement service unavailable');
    await expect(page.getByRole('status').filter({hasText:'Tenant entitlements saved.'})).toHaveCount(0);
  });
  test('PTEN-056 Entitlement save invalidates selected tenant details for readback', async ({ page }) => {
    let detailGets=0;
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p)=>{if(m==='GET'&&p===`/platform/tenants/${PLATFORM_TENANT_A}`)detailGets++;}});
    await expect(entArea(page).getByRole('button',{name:'Save entitlements'})).toBeDisabled();
    const before=detailGets;
    await entArea(page).getByLabel('Plan').selectOption('enterprise');
    await entArea(page).getByRole('button',{name:'Save entitlements'}).click();
    await expect.poll(()=>detailGets).toBeGreaterThan(before);
  });
  test('PTEN-057 Unchanged support policy keeps Save disabled', async ({ page }) => {
    await chosen(page);
    await expect(policyArea(page).getByRole('button',{name:'Save support policy'})).toBeDisabled();
    await expect(policyArea(page)).toContainText('No support-policy changes.');
  });
  test('PTEN-058 Support ticket requirement controls dirty status and Save availability', async ({ page }) => {
    await chosen(page);
    await policyArea(page).getByLabel('Require ticket/reference').uncheck();
    await expect(policyArea(page)).toContainText('Unsaved support-policy changes.');
    await expect(policyArea(page).getByRole('button',{name:'Save support policy'})).toBeEnabled();
  });
  test('PTEN-059 Consent and emergency approval settings are sent as separate booleans', async ({ page }) => {
    const calls: any[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p,b)=>{if(m==='PATCH')calls.push(b);}});
    await policyArea(page).getByLabel('Require customer consent note').check();
    await policyArea(page).getByLabel('Emergency admin requires approval').uncheck();
    await policyArea(page).getByRole('button',{name:'Save support policy'}).click();
    expect(calls[0]).toMatchObject({require_customer_consent:true,emergency_admin_requires_approval:false});
  });
  test('PTEN-060 Support duration field declares min 15 and max 480 without inventing validation', async ({ page }) => {
    await chosen(page);
    const duration=policyArea(page).getByLabel('Max support duration, minutes');
    await expect(duration).toHaveAttribute('type','number');
    await expect(duration).toHaveAttribute('min','15');
    await expect(duration).toHaveAttribute('max','480');
    await duration.fill('480');
    await expect(policyArea(page).getByRole('button',{name:'Save support policy'})).toBeEnabled();
  });
  test('PTEN-061 Support policy refuses to leave the allowed-access-level set empty', async ({ page }) => {
    await chosen(page);
    await policyArea(page).getByLabel('Allow Inventory support').uncheck();
    await policyArea(page).getByLabel('Allow Read only').uncheck();
    await expect(policyArea(page).getByLabel('Allow Read only')).toBeChecked();
  });
  test('PTEN-062 Support-policy PATCH rejection leaves unsaved edits and shows inline error', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,responses:{[`PATCH /platform/tenants/${PLATFORM_TENANT_A}/support-policy`]:{status:500,json:{message:'Fixture support policy rejection'}}}});
    await policyArea(page).getByLabel('Require customer consent note').check();
    await policyArea(page).getByRole('button',{name:'Save support policy'}).click();
    await expect(policyArea(page).locator('.platform-tenants__inline-error')).toContainText('Fixture support policy rejection');
    await expect(policyArea(page)).toContainText('Unsaved support-policy changes.');
  });
  test('PTEN-063 Support policy successful save invalidates selected detail query', async ({ page }) => {
    let detailGets=0;
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p)=>{if(m==='GET'&&p===`/platform/tenants/${PLATFORM_TENANT_A}`)detailGets++;}});
    const before=detailGets;
    await policyArea(page).getByLabel('Require customer consent note').check();
    await policyArea(page).getByRole('button',{name:'Save support policy'}).click();
    await expect(page.getByRole('status')).toContainText('Support access policy saved.');
    await expect.poll(()=>detailGets).toBeGreaterThan(before);
  });
 });

 test.describe('Platform Tenants — lock, export, refresh and permission gates (Batch 52)', () => {
  test('PTEN-064 Tenant write lock asks for explicit confirmation before posting', async ({ page }) => {
    const calls: string[]=[];
    await openSyntheticPlatformTenants(page,{onCall:(m,p)=>{if(m==='POST')calls.push(p);}});
    page.once('dialog',async d=>{expect(d.message()).toContain('enable the write lock');await d.dismiss();});
    await alphaRow(page).getByRole('button',{name:'Lock',exact:true}).click();
    expect(calls).toEqual([]);
  });
  test('PTEN-065 Cancelled write lock does not send a POST', async ({ page }) => {
    const writes: string[]=[];
    await openSyntheticPlatformTenants(page,{onCall:(m,p)=>{if(m==='POST')writes.push(p);}});
    page.once('dialog',d=>d.dismiss());
    await alphaRow(page).getByRole('button',{name:'Lock',exact:true}).click();
    expect(writes).toHaveLength(0);
  });
  test('PTEN-066 Confirmed write lock POSTS to selected tenant and shows local feedback', async ({ page }) => {
    const writes: string[]=[];
    await openSyntheticPlatformTenants(page,{onCall:(m,p)=>{if(m==='POST')writes.push(p);}});
    page.once('dialog',d=>d.accept());
    await alphaRow(page).getByRole('button',{name:'Lock',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('Tenant write lock enabled.');
    expect(writes).toEqual([`/platform/tenants/${PLATFORM_TENANT_A}/lock`]);
  });
  test('PTEN-067 Locked tenant shows Unlock only when role has unlock permission', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{permissions:tenantFixturePermissions.filter(p=>p!=='platform.tenants.unlock')});
    await expect(betaRow(page).getByRole('button',{name:'Unlock'})).toHaveCount(0);
    await expect(alphaRow(page).getByRole('button',{name:'Lock'})).toBeVisible();
  });
  test('PTEN-068 Cancelled unlock sends no POST to locked tenant', async ({ page }) => {
    const calls: string[]=[];
    await openSyntheticPlatformTenants(page,{onCall:(m,p)=>{if(m==='POST')calls.push(p);}});
    page.once('dialog',d=>d.dismiss());
    await betaRow(page).getByRole('button',{name:'Unlock'}).click();
    expect(calls).toHaveLength(0);
  });
  test('PTEN-069 Tenant export produces tenant-named JSON file via intercepted GET', async ({ page }) => {
    const reads: string[]=[];
    await openSyntheticPlatformTenants(page,{onCall:(m,p)=>{if(m==='GET')reads.push(p);}});
    const downloadPromise=page.waitForEvent('download');
    await alphaRow(page).getByRole('button',{name:'Export'}).click();
    const download=await downloadPromise;
    expect(download.suggestedFilename()).toBe(`tenant-${PLATFORM_TENANT_A}-export.json`);
    expect(reads).toContain(`/platform/tenants/${PLATFORM_TENANT_A}/export`);
    await expect(page.getByRole('status')).toContainText('Tenant export generated.');
  });
  test('PTEN-070 Export transport failure shows tenant-action alert without claimed download', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{responses:{[`GET /platform/tenants/${PLATFORM_TENANT_A}/export`]:{status:503,json:{message:'Fixture export unavailable'}}}});
    await alphaRow(page).getByRole('button',{name:'Export'}).click();
    await expect(page.getByRole('alert')).toContainText('Tenant action failed.');
    await expect(page.getByRole('alert')).toContainText('Fixture export unavailable');
  });
  test('PTEN-071 Registry Refresh updates displayed counts after new intercepted list response', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await page.route('**/platform/tenants',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify([tenantRowsFixture[0]])}));
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(registry(page).locator('tbody tr')).toHaveCount(1);
  });
  test('PTEN-072 Refresh failure preserves stale tenant registry plus Retry refresh option', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await page.route('**/platform/tenants',r=>r.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Fixture registry refresh failed'})}));
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('Showing the last successful tenant registry snapshot.');
    await expect(registry(page).locator('tbody tr')).toHaveCount(2);
    await expect(page.getByRole('button',{name:'Retry refresh'})).toBeVisible();
  });
  test('PTEN-073 Refresh with selected tenant re-fetches registry and selected detail', async ({ page }) => {
    const calls: string[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,onCall:(m,p)=>{if(m==='GET')calls.push(p);}});
    const prevRegistry=calls.filter(p=>p==='/platform/tenants').length;
    const prevDetail=calls.filter(p=>p===`/platform/tenants/${PLATFORM_TENANT_A}`).length;
    await page.getByRole('button',{name:'Refresh',exact:true}).click();
    await expect.poll(()=>calls.filter(p=>p==='/platform/tenants').length).toBeGreaterThan(prevRegistry);
    await expect.poll(()=>calls.filter(p=>p===`/platform/tenants/${PLATFORM_TENANT_A}`).length).toBeGreaterThan(prevDetail);
  });
  test('PTEN-074 Without Tenant Export permission no row export or tenant-exports link appears', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,permissions:tenantFixturePermissions.filter(p=>p!=='platform.tenants.export')});
    await expect(alphaRow(page).getByRole('button',{name:'Export'})).toHaveCount(0);
    await expect(page.locator('.platform-tenants__link-row').getByRole('link',{name:'Tenant exports'})).toHaveCount(0);
  });
  test('PTEN-075 Without Tenant Lock permission unlocked rows hide Lock', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{permissions:tenantFixturePermissions.filter(p=>p!=='platform.tenants.lock')});
    await expect(alphaRow(page).getByRole('button',{name:'Lock'})).toHaveCount(0);
  });
  test('PTEN-076 Without Tenant Unlock permission locked rows hide Unlock', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{permissions:tenantFixturePermissions.filter(p=>p!=='platform.tenants.unlock')});
    await expect(betaRow(page).getByRole('button',{name:'Unlock'})).toHaveCount(0);
  });
  test('PTEN-077 Without Billing Read permission registry and related billing links are hidden', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,permissions:tenantFixturePermissions.filter(p=>p!=='platform.billing.read')});
    await expect(alphaRow(page).getByRole('link',{name:'Manage in Billing'})).toHaveCount(0);
    await expect(page.locator('.platform-tenants__link-row').getByRole('link',{name:'Billing'})).toHaveCount(0);
  });
  test('PTEN-078 Without Tenant Update permission detail remains read-only, user mutations hidden', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_A,permissions:['platform.dashboard.read','platform.tenants.read']});
    await expect(usersArea(page).getByText('admin@fixture.test')).toBeVisible();
    await expect(usersArea(page).getByRole('button',{name:'Delete'})).toHaveCount(0);
    await expect(entArea(page)).toHaveCount(0);
    await expect(policyArea(page)).toHaveCount(0);
  });
  test('PTEN-079 Billing status remains plain display and has no direct editable control', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await expect(alphaRow(page).getByText('Past due')).toBeVisible();
    await expect(alphaRow(page).locator('td').nth(2).getByRole('combobox')).toHaveCount(0);
  });
  test('PTEN-080 Missing legacy currency configuration is explicitly flagged on locked tenant', async ({ page }) => {
    await openSyntheticPlatformTenants(page);
    await expect(betaRow(page)).toContainText('Legacy currency not confirmed');
  });
  test('PTEN-081 Cancelled legacy currency change warns about lack of FX conversion and restores code', async ({ page }) => {
    const writes: string[]=[];
    await openSyntheticPlatformTenants(page,{onCall:(m,p)=>{if(m==='PATCH')writes.push(p);}});
    const input=betaRow(page).getByRole('textbox',{name:'Fixture Beta inventory currency'});
    page.once('dialog',async d=>{expect(d.message()).toContain('does not convert historical amounts');await d.dismiss();});
    await input.fill('USD');await input.blur();
    await expect(input).toHaveValue('EUR');
    expect(writes).toHaveLength(0);
  });
  test('PTEN-082 Failed currency PATCH displays action alert without successful update', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{responses:{[`PATCH /platform/tenants/${PLATFORM_TENANT_A}`]:{status:409,json:{message:'Fixture existing financial evidence'}}}});
    const input=alphaRow(page).getByRole('textbox',{name:'Fixture Alpha inventory currency'});
    page.once('dialog',d=>d.accept());
    await input.fill('USD');await input.blur();
    await expect(page.getByRole('alert')).toContainText('Fixture existing financial evidence');
    await expect(page.getByRole('status').filter({hasText:'Tenant settings updated.'})).toHaveCount(0);
  });
  test('PTEN-083 Failed status update does not rewrite original fetched lifecycle state', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{responses:{[`PATCH /platform/tenants/${PLATFORM_TENANT_A}`]:{status:503,json:{message:'Fixture lifecycle rejected'}}}});
    page.once('dialog',d=>d.accept());
    await alphaRow(page).getByRole('combobox').selectOption('maintenance');
    await expect(page.getByRole('alert')).toContainText('Fixture lifecycle rejected');
    await expect(alphaRow(page).getByRole('combobox')).toHaveValue('active');
  });
  test('PTEN-084 Failed tenant creation never silently selects a new tenant_id', async ({ page }) => {
    await openSyntheticPlatformTenants(page,{responses:{'POST /platform/tenants':{status:500,json:{message:'Fixture tenant create failed'}}}});
    await createForm(page).getByLabel('Tenant name').fill('Will Not Create');
    await createButton(page).click();
    await expect(createForm(page).locator('.platform-tenants__inline-error')).toContainText('Fixture tenant create failed');
    await expect(page).not.toHaveURL(/tenant_id=/);
  });
  test('PTEN-085 Detail selection loads requested tenant data instead of another tenant user set', async ({ page }) => {
    const details={...tenantDetailsFixture,users:[{...tenantDetailsFixture.users[0],id:'55555555-5555-4555-8555-555555555555',email:'beta@fixture.test',name:'Beta User'}]};
    const calls: string[]=[];
    await openSyntheticPlatformTenants(page,{selectedId:PLATFORM_TENANT_B,details,onCall:(m,p)=>{if(m==='GET'&&p.startsWith('/platform/tenants/'))calls.push(p);}});
    await expect(usersArea(page).getByText('beta@fixture.test')).toBeVisible();
    await expect(usersArea(page).getByText('admin@fixture.test')).toHaveCount(0);
    expect(calls).toContain(`/platform/tenants/${PLATFORM_TENANT_B}`);
    expect(calls).not.toContain(`/platform/tenants/${PLATFORM_TENANT_A}`);
  });
 });
