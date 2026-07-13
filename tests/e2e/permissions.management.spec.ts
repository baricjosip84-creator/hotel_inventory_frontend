import { expect, test, type Page, type Route } from '@playwright/test';

function token(payload: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

async function seedLocalStorage(page: Page, entries: Record<string, string>): Promise<void> {
  await page.goto('/login');
  await page.evaluate((values) => {
    for (const [key, value] of Object.entries(values)) window.localStorage.setItem(key, value);
  }, entries);
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('role permission management pages', () => {
  test('tenant admin can save a tenant-specific manager policy', async ({ page }) => {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const accessToken = token({
      id: '11111111-1111-1111-1111-111111111111',
      tenant_id: '22222222-2222-2222-2222-222222222222',
      role: 'admin',
      exp: expires
    });

    const catalog = [
      { permission: 'dashboard.read', group: 'dashboard', label: 'Dashboard · Read' },
      { permission: 'par_levels.read', group: 'par_levels', label: 'Par Levels · Read' },
      { permission: 'par_levels.write', group: 'par_levels', label: 'Par Levels · Write' },
      { permission: 'role_permissions.read', group: 'role_permissions', label: 'Role Permissions · Read' },
      { permission: 'role_permissions.write', group: 'role_permissions', label: 'Role Permissions · Write' }
    ];
    const roles = [
      {
        role: 'admin', editable: true,
        default_permissions: ['dashboard.read', 'role_permissions.read', 'role_permissions.write'],
        effective_permissions: ['dashboard.read', 'role_permissions.read', 'role_permissions.write'],
        locked_permissions: ['dashboard.read', 'role_permissions.read', 'role_permissions.write'],
        forbidden_permissions: [], override_count: 0, is_default: true
      },
      {
        role: 'manager', editable: true,
        default_permissions: ['dashboard.read', 'par_levels.read', 'par_levels.write'],
        effective_permissions: ['dashboard.read', 'par_levels.read', 'par_levels.write'],
        locked_permissions: [],
        forbidden_permissions: ['role_permissions.read', 'role_permissions.write'],
        override_count: 0, is_default: true
      },
      {
        role: 'staff', editable: true,
        default_permissions: ['dashboard.read', 'par_levels.read'],
        effective_permissions: ['dashboard.read', 'par_levels.read'],
        locked_permissions: [],
        forbidden_permissions: ['role_permissions.read', 'role_permissions.write'],
        override_count: 0, is_default: true
      }
    ];
    const matrix = {
      scope: 'tenant', tenant_id: '22222222-2222-2222-2222-222222222222',
      editable_roles: ['admin', 'manager', 'staff'], permission_catalog: catalog, roles,
      governance: { role_model: 'fixed_roles_with_tenant_overrides', support_roles_editable: false, admin_lockout_protection: true, reserved_permissions_enforced: true }
    };
    let savedBody: { permissions?: string[] } | null = null;

    await page.route('**/api/permissions/me', (route) => json(route, {
      scope: 'tenant', tenant_id: matrix.tenant_id,
      user_id: '11111111-1111-1111-1111-111111111111', role: 'admin',
      permissions: ['dashboard.read', 'role_permissions.read', 'role_permissions.write']
    }));
    await page.route('**/api/permissions', (route) => json(route, matrix));
    await page.route('**/api/permissions/manager', async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      savedBody = route.request().postDataJSON() as { permissions?: string[] };
      const manager = roles[1];
      manager.effective_permissions = [...(savedBody.permissions || [])];
      manager.override_count = 1;
      manager.is_default = false;
      return json(route, manager);
    });
    await page.route('**/api/tenants/access-snapshot', (route) => json(route, {
      tenant_id: matrix.tenant_id, has_tenant_context: true, can_read: true, can_write: true,
      subscription_status: 'active', lifecycle_status: 'active', lock_reason: null
    }));

    await seedLocalStorage(page, { inventory_access_token: accessToken });
    await page.goto('/permissions');

    await expect(page.getByRole('heading', { name: 'Tenant Permissions' })).toBeVisible();
    await page.getByRole('button', { name: /Manager 3 enabled Default/i }).click();
    const writePermission = page.locator('label').filter({ hasText: 'par_levels.write' }).locator('input[type="checkbox"]');
    await expect(writePermission).toBeChecked();
    await writePermission.uncheck();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Save role permissions' }).click();

    await expect(page.getByText('Manager permissions saved successfully.')).toBeVisible();
    expect(savedBody?.permissions).not.toContain('par_levels.write');
    expect(savedBody?.permissions).toContain('dashboard.read');
  });

  test('platform superadmin sees immutable superadmin and editable support policies', async ({ page }) => {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const accessToken = token({
      typ: 'platform', id: '33333333-3333-3333-3333-333333333333', role: 'superadmin', exp: expires
    });
    const matrix = {
      scope: 'platform', editable_roles: ['support'],
      permission_catalog: [
        { permission: 'platform.dashboard.read', group: 'dashboard', label: 'Platform · Dashboard · Read' },
        { permission: 'platform.role_permissions.read', group: 'role_permissions', label: 'Platform · Role Permissions · Read' },
        { permission: 'platform.role_permissions.write', group: 'role_permissions', label: 'Platform · Role Permissions · Write' }
      ],
      roles: [
        {
          role: 'superadmin', editable: false,
          default_permissions: ['platform.dashboard.read', 'platform.role_permissions.read', 'platform.role_permissions.write'],
          effective_permissions: ['platform.dashboard.read', 'platform.role_permissions.read', 'platform.role_permissions.write'],
          locked_permissions: ['platform.dashboard.read', 'platform.role_permissions.read', 'platform.role_permissions.write'],
          forbidden_permissions: [], override_count: 0, is_default: true
        },
        {
          role: 'support', editable: true,
          default_permissions: ['platform.dashboard.read'], effective_permissions: ['platform.dashboard.read'],
          locked_permissions: [], forbidden_permissions: ['platform.role_permissions.read', 'platform.role_permissions.write'],
          override_count: 0, is_default: true
        }
      ],
      governance: { role_model: 'fixed_roles_with_platform_overrides', superadmin_immutable: true, superadmin_only_management: true }
    };

    await page.route('**/api/platform/auth/me', (route) => json(route, {
      id: '33333333-3333-3333-3333-333333333333', role: 'superadmin', is_active: true
    }));
    await page.route('**/api/platform/permissions/me', (route) => json(route, {
      scope: 'platform', platform_user_id: '33333333-3333-3333-3333-333333333333', role: 'superadmin',
      permissions: ['platform.dashboard.read', 'platform.role_permissions.read', 'platform.role_permissions.write']
    }));
    await page.route('**/api/platform/permissions', (route) => json(route, matrix));

    await seedLocalStorage(page, { inventory_platform_access_token: accessToken });
    await page.goto('/platform/permissions');

    await expect(page.getByRole('heading', { name: 'Platform Permissions' })).toBeVisible();
    await expect(page.getByText('This role is protected and cannot be edited.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save role permissions' })).toBeDisabled();
    await page.getByRole('button', { name: /Support 1 enabled Default/i }).click();
    await expect(page.getByText('Changes apply to every active user assigned to this role.')).toBeVisible();
  });
});
