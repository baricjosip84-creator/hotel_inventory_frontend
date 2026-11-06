import { test, expect, type Page, type Route } from '@playwright/test';
import { loginAsTenant, fulfillJson } from '../../../support/tenantSession';

// Batch 36: tenant permissions page lifecycle. Every policy write is intercepted.
// No tenant policy, database, server authorization, or real user is changed here.
const ID = '11111111-1111-4111-8111-111111111111';
const REV = 'a'.repeat(64);
type RecordValue = Record<string, unknown>;
type Role = RecordValue & { role: string; role_kind: 'built_in' | 'custom'; display_name: string; effective_permissions: string[]; default_permissions: string[]; version?: number; revision?: string; is_default: boolean };
type Call = { method: string; path: string; body: RecordValue | null };
const catalog = [
  { permission: 'dashboard.read', label: 'Dashboard access', group: 'Core' },
  { permission: 'products.read', label: 'Product viewing', group: 'Inventory' },
  { permission: 'products.write', label: 'Product editing', group: 'Inventory' },
  { permission: 'stock.read', label: 'Stock viewing', group: 'Inventory' },
  { permission: 'reports.read', label: 'Report viewing', group: 'Reports' },
  { permission: 'users.read', label: 'User directory', group: 'Administration' },
  { permission: 'users.write', label: 'User administration', group: 'Administration' },
  { permission: 'tenant.delete', label: 'Tenant deletion', group: 'Administration' }
];
const base = (key: string, overrides: RecordValue = {}): Role => ({
  role: key, role_kind: 'built_in', display_name: key[0].toUpperCase() + key.slice(1), editable: true,
  default_permissions: ['dashboard.read', 'products.read'], effective_permissions: ['dashboard.read', 'products.read'],
  locked_permissions: ['dashboard.read'], forbidden_permissions: ['tenant.delete', 'users.write'],
  override_count: 0, is_default: true, is_active: true, user_count: 2, revision: REV,
  ...overrides
});
const custom = (overrides: RecordValue = {}): Role => base(`custom:${ID}`, {
  role_id: ID, role_kind: 'custom', display_name: 'Receiving Clerk', description: 'Warehouse receiving',
  default_permissions: ['dashboard.read', 'stock.read'], effective_permissions: ['dashboard.read', 'stock.read'],
  source_template_key: 'receiving', source_template_name: 'Receiving Clerk Template', version: 2,
  can_activate: true, can_deactivate: true, can_delete: true, user_count: 0, active_user_count: 0,
  inactive_user_count: 0, ...overrides
});
const newMatrix = (empty = false) => ({
  scope: 'tenant', tenant_id: 'pw-tenant', editable_roles: ['manager', 'staff'],
  permission_catalog: catalog, permission_dependencies: { 'products.write': ['products.read'] },
  custom_role_templates: [{ key: 'receiving', name: 'Receiving Clerk Template', description: 'Receive inventory', category: 'Operations', permission_count: 2, permissions: ['dashboard.read', 'stock.read'] }],
  roles: [base('admin', { editable: false, default_permissions: catalog.map(x => x.permission), effective_permissions: catalog.map(x => x.permission), locked_permissions: catalog.map(x => x.permission), forbidden_permissions: [], user_count: 1 }),
    base('manager', { default_permissions: ['dashboard.read', 'products.read', 'reports.read'], effective_permissions: ['dashboard.read', 'products.read', 'reports.read'] }), base('staff'), ...(empty ? [] : [custom()])],
  governance: { role_model: 'built-in and custom tenant roles', support_roles_editable: false, admin_lockout_protection: true, reserved_permissions_enforced: true, custom_roles_tenant_isolated: true, per_user_permission_overrides: false, custom_roles_use_staff_safety_base: true }
});
type SetupOptions = { matrixStatus?: number; failMethod?: string; failPath?: string; failStatus?: number; empty?: boolean; managerOverridden?: boolean; customAssigned?: boolean; customInactive?: boolean };
async function setup(page: Page, options: SetupOptions = {}) {
  await loginAsTenant(page);
  const state = newMatrix(options.empty);
  if (options.managerOverridden) Object.assign(state.roles[1], { is_default: false, override_count: 1, effective_permissions: ['dashboard.read', 'products.read', 'products.write', 'reports.read'] });
  if (options.customAssigned && state.roles[3]) Object.assign(state.roles[3], { user_count: 2, active_user_count: 1, inactive_user_count: 1, can_deactivate: false, can_delete: false });
  if (options.customInactive && state.roles[3]) Object.assign(state.roles[3], { is_active: false, can_activate: true, can_deactivate: false, can_delete: true });
  const calls: Call[] = [];
  await page.route('**/permissions**', async (route: Route) => {
    const req = route.request(); if (req.isNavigationRequest()) return route.continue();
    const method = req.method(), path = new URL(req.url()).pathname;
    const body = req.postData() ? (req.postDataJSON() as RecordValue) : null;
    calls.push({ method, path, body });
    if (path.endsWith('/permissions/me') && method === 'GET') return fulfillJson(route, { scope: 'tenant', tenant_id: 'pw-tenant', user_id: 'pw-admin', role: 'admin', permissions: catalog.map(x => x.permission) });
    if (path.endsWith('/permissions') && method === 'GET') return fulfillJson(route, options.matrixStatus ? { message: 'Synthetic matrix access denied' } : state, options.matrixStatus ?? 200);
    if (options.failMethod === method && (!options.failPath || path.endsWith(options.failPath))) return fulfillJson(route, { message: 'Synthetic version conflict or policy write rejected' }, options.failStatus ?? 409);
    const idMatch = path.match(/\/custom-roles\/([0-9a-f-]+)(?:\/(permissions|duplicate))?$/);
    if (path.endsWith('/permissions/custom-roles') && method === 'POST') {
      const next = custom({ role: 'custom:22222222-2222-4222-8222-222222222222', role_id: '22222222-2222-4222-8222-222222222222', display_name: String(body?.name), description: body?.description ?? null, version: 1 });
      state.roles.push(next); return fulfillJson(route, next, 201);
    }
    if (idMatch) {
      const found = state.roles.find(r => r.role_id === idMatch[1]);
      if (!found) return fulfillJson(route, { message: 'Synthetic role absent' }, 404);
      if (idMatch[2] === 'duplicate' && method === 'POST') {
        const next = custom({ role: 'custom:33333333-3333-4333-8333-333333333333', role_id: '33333333-3333-4333-8333-333333333333', display_name: String(body?.name), version: 1 });
        state.roles.push(next); return fulfillJson(route, next, 201);
      }
      if (idMatch[2] === 'permissions' && (method === 'PUT' || method === 'DELETE')) {
        found.effective_permissions = method === 'PUT' ? body?.permissions as string[] : [...found.default_permissions];
        found.is_default = method === 'DELETE'; found.version = (found.version ?? 1) + 1;
        return fulfillJson(route, found);
      }
      if (method === 'PATCH') { Object.assign(found, body, { version: (found.version ?? 1) + 1 }); return fulfillJson(route, found); }
      if (method === 'DELETE') { state.roles = state.roles.filter(r => r !== found); return fulfillJson(route, { id: idMatch[1], deleted: true, name: found.display_name }); }
    }
    const match = path.match(/\/permissions\/(manager|staff)$/);
    if (match && (method === 'PUT' || method === 'DELETE')) {
      const found = state.roles.find(r => r.role === match[1])!;
      found.effective_permissions = method === 'PUT' ? body?.permissions as string[] : [...found.default_permissions];
      found.is_default = method === 'DELETE'; found.override_count = method === 'DELETE' ? 0 : 1;
      found.revision = 'b'.repeat(64); return fulfillJson(route, found);
    }
    return fulfillJson(route, { message: `Unexpected synthetic ${method} ${path}` }, 405);
  });
  await page.goto('/permissions');
  if (!options.matrixStatus) await expect(page.getByRole('heading', { name: 'Tenant permission management' })).toBeVisible();
  return { calls, state };
}
const mutations = (calls: Call[]) => calls.filter(c => c.method !== 'GET');
const editorRole = (page: Page, label: string) => page.locator('.role-permission-editor__role-card').filter({ has: page.locator('strong', { hasText: label }) }).first();
const permission = (page: Page, label: string) => page.locator('.role-permission-editor__permission-row').filter({ hasText: label }).locator('input');
async function chooseManager(page: Page) { await editorRole(page, 'Manager').click(); }
async function chooseCustom(page: Page) { await editorRole(page, 'Receiving Clerk').click(); }
async function makeDraft(page: Page) { await page.getByRole('textbox', { name: 'Search permissions' }).fill('Product editing'); await permission(page, 'Product editing').check(); }
async function customWorkspace(page: Page) { await page.getByRole('button', { name: /Custom roles/ }).first().click(); }
const createForm = (page: Page) => page.locator('form.tenant-permissions-create-panel');
const managePanel = (page: Page) => page.locator('.tenant-permissions-manage-panel');
const approve = (page: Page) => page.once('dialog', dialog => dialog.accept());
const decline = (page: Page) => page.once('dialog', dialog => dialog.dismiss());
const save = (page: Page) => page.getByRole('button', { name: 'Save role permissions' }).first();
const reset = (page: Page, name = 'Reset to defaults') => page.getByRole('button', { name }).first();
const discard = (page: Page) => page.getByRole('button', { name: 'Discard changes' }).first();

test.describe('Tenant Permissions — governed policy and custom role lifecycle (Batch 36)', () => {
  test('TPER-021 Manager policy save confirms and submits expected_revision', async ({ page }) => {
    const s = await setup(page); await chooseManager(page); await makeDraft(page);
    approve(page); await save(page).click(); await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0]).toMatchObject({ method: 'PUT', path: expect.stringMatching(/\/permissions\/manager$/), body: { expected_revision: REV } });
    expect((mutations(s.calls)[0].body?.permissions as string[])).toContain('products.write');
  });
  test('TPER-022 Cancelling policy save leaves draft and sends no PUT', async ({ page }) => {
    const s = await setup(page); await chooseManager(page); await makeDraft(page); decline(page); await save(page).click();
    await expect(permission(page, 'Product editing')).toBeChecked(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-023 Successful save refreshes matrix and acknowledges result', async ({ page }) => {
    const s = await setup(page); await chooseManager(page); await makeDraft(page); approve(page); await save(page).click();
    await expect(page.getByRole('status').filter({ hasText: /permissions saved successfully/i }).first()).toBeVisible();
    await expect(save(page)).toBeDisabled(); expect(s.calls.filter(c => c.method === 'GET' && c.path.endsWith('/permissions')).length).toBeGreaterThan(1);
  });
  test('TPER-024 Stale revision rejection keeps local draft', async ({ page }) => {
    const s = await setup(page, { failMethod: 'PUT', failPath: '/permissions/manager' }); await chooseManager(page); await makeDraft(page); approve(page); await save(page).click();
    await expect(page.getByRole('alert').first()).toContainText('Synthetic version conflict');
    await expect(permission(page, 'Product editing')).toBeChecked(); expect(mutations(s.calls)[0].body?.expected_revision).toBe(REV);
  });
  test('TPER-025 Failed policy request leaves Save available for retry', async ({ page }) => {
    await setup(page, { failMethod: 'PUT', failPath: '/permissions/manager', failStatus: 503 }); await chooseManager(page); await makeDraft(page);
    approve(page); await save(page).click(); await expect(page.getByRole('alert').first()).toContainText('Synthetic version conflict');
    await expect(save(page)).toBeEnabled();
  });
  test('TPER-026 Default built-in baseline disables Reset', async ({ page }) => {
    const s = await setup(page); await chooseManager(page); await expect(reset(page)).toBeDisabled(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-027 Overridden Manager policy reset sends revisioned DELETE', async ({ page }) => {
    const s = await setup(page, { managerOverridden: true }); await chooseManager(page); approve(page); await reset(page).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0]).toMatchObject({ method: 'DELETE', body: { expected_revision: REV } });
    await expect(page.getByRole('status').filter({ hasText: /permissions reset to defaults/i }).first()).toBeVisible();
  });
  test('TPER-028 Cancelled built-in reset does not issue DELETE', async ({ page }) => {
    const s = await setup(page, { managerOverridden: true }); await chooseManager(page); decline(page); await reset(page).click();
    expect(mutations(s.calls)).toHaveLength(0); await expect(reset(page)).toBeEnabled();
  });
  test('TPER-029 Discard draft accepts confirmation and restores server state', async ({ page }) => {
    const s = await setup(page); await chooseManager(page); await makeDraft(page); approve(page); await discard(page).click();
    await expect(permission(page, 'Product editing')).not.toBeChecked(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-030 Cancelled discard retains unsaved policy draft', async ({ page }) => {
    const s = await setup(page); await chooseManager(page); await makeDraft(page); decline(page); await discard(page).click();
    await expect(permission(page, 'Product editing')).toBeChecked(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-031 Confirmed role change discards draft and selects Staff', async ({ page }) => {
    const s = await setup(page); await chooseManager(page); await makeDraft(page); approve(page); await editorRole(page, 'Staff').click();
    await expect(editorRole(page, 'Staff')).toHaveClass(/is-active/); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-032 Cancelled dirty role change remains on Manager', async ({ page }) => {
    const s = await setup(page); await chooseManager(page); await makeDraft(page); decline(page); await editorRole(page, 'Staff').click();
    await expect(editorRole(page, 'Manager')).toHaveClass(/is-active/); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-033 Custom workspace lists roles and reveals empty state', async ({ page }) => {
    await setup(page, { empty: true }); await customWorkspace(page);
    await expect(page.getByText('No tenant custom roles have been created yet.')).toBeVisible();
    await expect(createForm(page)).toBeVisible(); await expect(createForm(page).getByRole('combobox', { name: 'Starting template' })).toBeVisible();
  });
  test('TPER-034 Blank and one-character custom names cannot submit', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); const name = createForm(page).getByRole('textbox', { name: 'Role name' });
    await expect(createForm(page).getByRole('button', { name: 'Create custom role' })).toBeDisabled();
    await name.fill('x'); await expect(createForm(page).getByRole('button', { name: 'Create custom role' })).toBeDisabled(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-035 Protected Admin name rejects POST before network', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await createForm(page).getByRole('textbox', { name: 'Role name' }).fill(' Admin ');
    await createForm(page).getByRole('button', { name: 'Create custom role' }).click();
    await expect(page.getByRole('alert').first()).toContainText('protected built-in role name'); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-036 Template choice previews description and count', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await createForm(page).getByRole('combobox', { name: 'Starting template' }).selectOption('receiving');
    await expect(createForm(page).locator('.tenant-permissions-template-preview')).toContainText('Receive inventory');
    await expect(createForm(page)).toContainText('2 permissions'); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-037 Creation trims name and passes template_key in POST', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await createForm(page).getByRole('textbox', { name: 'Role name' }).fill('  Dispatch Crew  ');
    await createForm(page).getByRole('combobox', { name: 'Starting template' }).selectOption('receiving');
    await createForm(page).getByRole('button', { name: 'Create custom role' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0]).toMatchObject({ method: 'POST', path: expect.stringMatching(/\/permissions\/custom-roles$/), body: { name: 'Dispatch Crew', template_key: 'receiving' } });
    await expect(page.getByRole('status').filter({ hasText: 'custom role created successfully' }).first()).toBeVisible();
  });
  test('TPER-038 Custom role creation failure keeps form values', async ({ page }) => {
    const s = await setup(page, { failMethod: 'POST', failPath: '/permissions/custom-roles' }); await customWorkspace(page);
    await createForm(page).getByRole('textbox', { name: 'Role name' }).fill('Dispatch Crew');
    await createForm(page).getByRole('button', { name: 'Create custom role' }).click();
    await expect(page.getByRole('alert').first()).toContainText('Synthetic version conflict');
    await expect(createForm(page).getByRole('textbox', { name: 'Role name' })).toHaveValue('Dispatch Crew'); expect(mutations(s.calls)).toHaveLength(1);
  });
  test('TPER-039 Custom metadata PATCH passes version and refreshed name', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await managePanel(page).getByRole('textbox', { name: 'Name', exact: true }).fill('Receiving Team');
    await managePanel(page).getByRole('button', { name: 'Save details' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0]).toMatchObject({ method: 'PATCH', body: { version: 2, name: 'Receiving Team' } });
    await expect(managePanel(page)).toContainText('Receiving Team');
  });
  test('TPER-040 Custom role metadata rejects Manager as reserved name', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await managePanel(page).getByRole('textbox', { name: 'Name', exact: true }).fill('Manager');
    await managePanel(page).getByRole('button', { name: 'Save details' }).click();
    await expect(page.getByRole('alert').first()).toContainText('protected built-in role name'); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-041 Duplicate via prompt posts the trimmed copied name', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    page.once('dialog', dialog => dialog.accept('  Night Receiving  ')); await managePanel(page).getByRole('button', { name: 'Duplicate' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0]).toMatchObject({ method: 'POST', path: expect.stringMatching(/\/duplicate$/), body: { name: 'Night Receiving' } });
    await expect(page.getByRole('status').filter({ hasText: /created from Receiving Clerk/ }).first()).toBeVisible();
  });
  test('TPER-042 Cancelled duplicate prompt has no POST', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    decline(page); await managePanel(page).getByRole('button', { name: 'Duplicate' }).click(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-043 Active user assignment disables custom deactivation', async ({ page }) => {
    const s = await setup(page, { customAssigned: true }); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await expect(managePanel(page).getByRole('button', { name: 'Deactivate' })).toBeDisabled();
    await expect(managePanel(page)).toContainText('active user must be reassigned'); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-044 Cancelled deactivation dialog makes no PATCH', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    decline(page); await managePanel(page).getByRole('button', { name: 'Deactivate' }).click(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-045 Confirmed deactivation then reactivation use versioned PATCH', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    approve(page); await managePanel(page).getByRole('button', { name: 'Deactivate' }).click();
    await expect(managePanel(page).getByRole('button', { name: 'Activate' })).toBeVisible();
    approve(page); await managePanel(page).getByRole('button', { name: 'Activate' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(2);
    expect(mutations(s.calls).map(c => c.body)).toEqual([expect.objectContaining({ version: 2, is_active: false }), expect.objectContaining({ version: 3, is_active: true })]);
  });
  test('TPER-046 Assigned users disable custom role deletion', async ({ page }) => {
    const s = await setup(page, { customAssigned: true }); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await expect(managePanel(page).getByRole('button', { name: 'Delete role' })).toBeDisabled(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-047 Confirmed delete passes numeric version and refreshes matrix', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    approve(page); await managePanel(page).getByRole('button', { name: 'Delete role' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0]).toMatchObject({ method: 'DELETE', body: { version: 2 } });
    await expect(page.getByText('No tenant custom roles have been created yet.')).toBeVisible();
  });
  test('TPER-048 Custom role policy save sends version and excludes locked/reserved rights', async ({ page }) => {
    const s = await setup(page); await chooseCustom(page); await makeDraft(page); approve(page); await save(page).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    const write = mutations(s.calls)[0]; expect(write).toMatchObject({ method: 'PUT', path: expect.stringMatching(/\/custom-roles\/[^/]+\/permissions$/), body: { version: 2 } });
    const permissions = write.body?.permissions as string[]; expect(permissions).toContain('dashboard.read'); expect(permissions).not.toContain('tenant.delete'); expect(permissions).toContain('products.read');
  });
  test('TPER-049 Reset to starting template sends versioned DELETE', async ({ page }) => {
    const s = await setup(page); Object.assign(s.state.roles[3], { is_default: false, override_count: 1, effective_permissions: ['dashboard.read', 'stock.read', 'products.read'] });
    // The matrix is mutable; reload to render the modified role.
    await page.reload(); await chooseCustom(page); approve(page); await reset(page, 'Reset to starting template').click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0]).toMatchObject({ method: 'DELETE', body: { version: 2 } });
    await expect(page.getByRole('status').filter({ hasText: /permissions reset to the starting template/ }).first()).toBeVisible();
  });
  test('TPER-050 Forbidden policy matrix renders access failure without editor', async ({ page }) => {
    const s = await setup(page, { matrixStatus: 403 });
    await expect(page.locator('.app-error-state')).toContainText('Tenant permission settings could not be loaded');
    await expect(page.getByRole('button', { name: 'Save role permissions' })).toHaveCount(0); expect(mutations(s.calls)).toHaveLength(0);
  });
  // Batch 168: distinct source-backed browser checks for tenant role management.
  // These routes are intercepted and cannot prove real database/authorization behavior.
  test('TPER-051 Whitespace-only create role name cannot enable submit', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page);
    await createForm(page).getByRole('textbox', { name: 'Role name' }).fill('     ');
    await expect(createForm(page).getByRole('button', { name: 'Create custom role' })).toBeDisabled();
    expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-052 Eighty-character custom name shows the source-backed boundary counter', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page);
    await createForm(page).getByRole('textbox', { name: 'Role name' }).fill('N'.repeat(80));
    await expect(createForm(page).locator('#tenant-custom-role-name-count')).toContainText('80/80');
    await expect(createForm(page).getByRole('button', { name: 'Create custom role' })).toBeEnabled();
    expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-053 Create description accepts its five-hundred-character boundary locally', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page);
    const description = createForm(page).getByRole('textbox', { name: 'Description (optional)' });
    await description.fill('D'.repeat(500)); await expect(description).toHaveValue('D'.repeat(500));
    await expect(description).toHaveAttribute('maxlength', '500'); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-054 Blank template and description produce explicit null custom-role payload fields', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page);
    await createForm(page).getByRole('textbox', { name: 'Role name' }).fill('Cycle Counters');
    await createForm(page).getByRole('button', { name: 'Create custom role' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0]).toMatchObject({ method: 'POST', body: { name: 'Cycle Counters', template_key: null, description: null } });
  });
  test('TPER-055 New-role description is trimmed before the intercepted POST', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page);
    await createForm(page).getByRole('textbox', { name: 'Role name' }).fill('Stock Auditors');
    await createForm(page).getByRole('textbox', { name: 'Description (optional)' }).fill('  Check shelf counts  ');
    await createForm(page).getByRole('button', { name: 'Create custom role' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0].body).toMatchObject({ description: 'Check shelf counts' });
  });
  test('TPER-056 Whitespace-only optional creation description becomes null on POST', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page);
    await createForm(page).getByRole('textbox', { name: 'Role name' }).fill('Dispatch Supervisors');
    await createForm(page).getByRole('textbox', { name: 'Description (optional)' }).fill('     ');
    await createForm(page).getByRole('button', { name: 'Create custom role' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0].body).toMatchObject({ description: null });
  });
  test('TPER-057 Unchanged custom role metadata cannot issue a PATCH', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await expect(managePanel(page).getByRole('button', { name: 'Save details' })).toBeDisabled();
    expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-058 Metadata name counter reaches eighty with client-side length bound', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    const name = managePanel(page).getByRole('textbox', { name: 'Name', exact: true }); await name.fill('M'.repeat(80));
    await expect(managePanel(page).locator('#tenant-custom-role-manage-name-count')).toContainText('80/80');
    await expect(name).toHaveAttribute('maxlength', '80'); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-059 Description-only metadata edit sends trimmed PATCH and current version', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await managePanel(page).getByRole('textbox', { name: 'Description', exact: true }).fill('  Pallet receiving  ');
    await managePanel(page).getByRole('button', { name: 'Save details' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0]).toMatchObject({ method: 'PATCH', body: { version: 2, name: 'Receiving Clerk', description: 'Pallet receiving' } });
  });
  test('TPER-060 Whitespace-only metadata description clears it with explicit null', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await managePanel(page).getByRole('textbox', { name: 'Description', exact: true }).fill('    ');
    await managePanel(page).getByRole('button', { name: 'Save details' }).click();
    await expect.poll(() => mutations(s.calls).length).toBe(1);
    expect(mutations(s.calls)[0].body).toMatchObject({ description: null, version: 2 });
  });
  test('TPER-061 Whitespace-only metadata name disables Save details', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await managePanel(page).getByRole('textbox', { name: 'Name', exact: true }).fill('  ');
    await expect(managePanel(page).getByRole('button', { name: 'Save details' })).toBeDisabled();
    expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-062 Rejected metadata update keeps unsaved details for correction', async ({ page }) => {
    const s = await setup(page, { failMethod: 'PATCH', failPath: '/permissions/custom-roles/' + ID });
    await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await managePanel(page).getByRole('textbox', { name: 'Name', exact: true }).fill('Receiving Ops');
    await managePanel(page).getByRole('button', { name: 'Save details' }).click();
    await expect(page.getByRole('alert').first()).toContainText('Synthetic version conflict');
    await expect(managePanel(page).getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Receiving Ops');
    await expect(managePanel(page).getByRole('button', { name: 'Save details' })).toBeEnabled();
    expect(mutations(s.calls)).toHaveLength(1);
  });
  test('TPER-063 Single-character duplicate name is rejected before any POST', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    page.once('dialog', dialog => dialog.accept('x')); await managePanel(page).getByRole('button', { name: 'Duplicate' }).click();
    await expect(page.getByRole('alert').first()).toContainText('at least 2 characters'); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-064 Reserved Staff duplicate name is rejected before POST', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    page.once('dialog', dialog => dialog.accept(' Staff ')); await managePanel(page).getByRole('button', { name: 'Duplicate' }).click();
    await expect(page.getByRole('alert').first()).toContainText('protected built-in role name'); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-065 Whitespace duplicate prompt exits without creating a role', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    page.once('dialog', dialog => dialog.accept('     ')); await managePanel(page).getByRole('button', { name: 'Duplicate' }).click();
    expect(mutations(s.calls)).toHaveLength(0); await expect(managePanel(page)).toContainText('Receiving Clerk');
  });
  test('TPER-066 Rejected duplicate POST keeps current role selected and reports error', async ({ page }) => {
    const s = await setup(page, { failMethod: 'POST', failPath: '/duplicate' });
    await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    page.once('dialog', dialog => dialog.accept('Night Receiving'));
    await managePanel(page).getByRole('button', { name: 'Duplicate' }).click();
    await expect(page.getByRole('alert').first()).toContainText('Synthetic version conflict');
    await expect(page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' })).toHaveAttribute('aria-pressed', 'true');
    expect(mutations(s.calls)).toHaveLength(1);
  });
  test('TPER-067 Inactive custom role is identifiable and exposes an Activate action', async ({ page }) => {
    const s = await setup(page, { customInactive: true }); await customWorkspace(page);
    const card = page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' });
    await expect(card).toHaveClass(/is-inactive/); await card.click();
    await expect(managePanel(page).getByRole('button', { name: 'Activate' })).toBeVisible();
    expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-068 Unassigned custom role explains safe deactivation', async ({ page }) => {
    const s = await setup(page); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await expect(managePanel(page).locator('.tenant-permissions-lifecycle-note')).toContainText('No users are assigned');
    await expect(managePanel(page).getByRole('button', { name: 'Deactivate' })).toBeEnabled();
    expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-069 One active assignment produces singular blocking explanation', async ({ page }) => {
    const s = await setup(page, { customAssigned: true }); await customWorkspace(page);
    await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await expect(managePanel(page).locator('.tenant-permissions-lifecycle-note')).toContainText('1 active user must be reassigned');
    await expect(managePanel(page).getByRole('button', { name: 'Deactivate' })).toBeDisabled();
    expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-070 Multiple active assignments produce plural blocking explanation', async ({ page }) => {
    const s = await setup(page, { customAssigned: true });
    Object.assign(s.state.roles[3], { active_user_count: 2 }); await page.reload(); await customWorkspace(page);
    await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await expect(managePanel(page).locator('.tenant-permissions-lifecycle-note')).toContainText('2 active users must be reassigned');
    await expect(managePanel(page).getByRole('button', { name: 'Deactivate' })).toBeDisabled(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-071 Historical inactive assignments permit deactivation but prevent deletion', async ({ page }) => {
    const s = await setup(page); Object.assign(s.state.roles[3], { user_count: 2, active_user_count: 0, inactive_user_count: 2, can_deactivate: true, can_delete: false });
    await page.reload(); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await expect(managePanel(page).locator('.tenant-permissions-lifecycle-note')).toContainText('inactive historical assignments are preserved');
    await expect(managePanel(page).getByRole('button', { name: 'Deactivate' })).toBeEnabled();
    await expect(managePanel(page).getByRole('button', { name: 'Delete role' })).toBeDisabled(); expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-072 Inactive role lifecycle guidance explains reactivation prerequisite', async ({ page }) => {
    const s = await setup(page, { customInactive: true }); await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    await expect(managePanel(page).locator('.tenant-permissions-lifecycle-note')).toContainText('cannot be assigned or edited until reactivated');
    expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-073 Rejected custom permission PUT preserves the dirty permission draft', async ({ page }) => {
    const s = await setup(page, { failMethod: 'PUT', failPath: '/permissions' }); await chooseCustom(page); await makeDraft(page);
    approve(page); await save(page).click();
    await expect(page.getByRole('alert').first()).toContainText('Synthetic version conflict');
    await expect(permission(page, 'Product editing')).toBeChecked();
    await expect(save(page)).toBeEnabled(); expect(mutations(s.calls)).toHaveLength(1);
  });
  test('TPER-074 Rejected custom-policy reset preserves the stored override', async ({ page }) => {
    const s = await setup(page, { failMethod: 'DELETE', failPath: '/permissions' });
    Object.assign(s.state.roles[3], { is_default: false, override_count: 1, effective_permissions: ['dashboard.read', 'stock.read', 'products.read'] });
    await page.reload(); await chooseCustom(page); approve(page); await reset(page, 'Reset to starting template').click();
    await expect(page.getByRole('alert').first()).toContainText('Synthetic version conflict');
    await expect(reset(page, 'Reset to starting template')).toBeEnabled(); expect(mutations(s.calls)).toHaveLength(1);
  });
  test('TPER-075 Rejected deactivation PATCH preserves the active custom role', async ({ page }) => {
    const s = await setup(page, { failMethod: 'PATCH', failPath: '/permissions/custom-roles/' + ID });
    await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    approve(page); await managePanel(page).getByRole('button', { name: 'Deactivate' }).click();
    await expect(page.getByRole('alert').first()).toContainText('Synthetic version conflict');
    await expect(managePanel(page).getByRole('button', { name: 'Deactivate' })).toBeVisible();
    expect(mutations(s.calls)).toHaveLength(1);
  });
  test('TPER-076 Rejected delete keeps the role in its tenant library', async ({ page }) => {
    const s = await setup(page, { failMethod: 'DELETE', failPath: '/permissions/custom-roles/' + ID });
    await customWorkspace(page); await page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' }).click();
    approve(page); await managePanel(page).getByRole('button', { name: 'Delete role' }).click();
    await expect(page.getByRole('alert').first()).toContainText('Synthetic version conflict');
    await expect(page.locator('.tenant-permissions-role-card').filter({ hasText: 'Receiving Clerk' })).toBeVisible();
    expect(mutations(s.calls)).toHaveLength(1);
  });
  test('TPER-077 Unchecking required Product viewing cascades to Product editing', async ({ page }) => {
    const s = await setup(page); await chooseManager(page); await makeDraft(page);
    await page.getByRole('textbox', { name: 'Search permissions' }).fill('Product viewing');
    await permission(page, 'Product viewing').uncheck();
    await page.getByRole('textbox', { name: 'Search permissions' }).fill('Product editing');
    await expect(permission(page, 'Product editing')).not.toBeChecked();
    expect(mutations(s.calls)).toHaveLength(0);
  });
  test('TPER-078 A filtered group action changes only visible editable permissions', async ({ page }) => {
    const s = await setup(page); await chooseManager(page);
    await page.getByRole('textbox', { name: 'Search permissions' }).fill('Product editing');
    await page.locator('.role-permission-editor__group-card').filter({ hasText: 'Inventory' }).getByRole('button', { name: 'Enable shown' }).click();
    await expect(permission(page, 'Product editing')).toBeChecked();
    await page.getByRole('textbox', { name: 'Search permissions' }).fill('Stock viewing');
    await expect(permission(page, 'Stock viewing')).not.toBeChecked();
    expect(mutations(s.calls)).toHaveLength(0);
  });
});
