import { apiRequest } from './api';
import { platformApiRequest } from './platformApi';
import {
  clearTenantPermissionSnapshot,
  setTenantPermissionSnapshot,
  type TenantPermission,
  type TenantPermissionSnapshot,
  type UserRole
} from './permissions';
import {
  clearPlatformPermissionSnapshot,
  setPlatformPermissionSnapshot,
  type PlatformPermission,
  type PlatformPermissionSnapshot
} from './platformPermissions';
import type { PlatformRole } from './platformAuth';

export type PermissionCatalogItem<Permission extends string> = {
  permission: Permission;
  group: string;
  label: string;
};

export type RolePermissionPolicy<Role extends string, Permission extends string> = {
  role: Role;
  role_id?: string | null;
  role_kind?: 'built_in' | 'custom';
  display_name?: string;
  description?: string | null;
  editable: boolean;
  default_permissions: Permission[];
  effective_permissions: Permission[];
  locked_permissions: Permission[];
  forbidden_permissions: Permission[];
  override_count: number;
  is_default: boolean;
  is_active?: boolean;
  user_count?: number | null;
  source_template_key?: string | null;
  source_template_name?: string | null;
  version?: number | null;
  can_activate?: boolean;
  can_deactivate?: boolean;
  can_delete?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BuiltInTenantRole = Extract<UserRole, 'admin' | 'manager' | 'staff'>;
export type TenantRolePolicyKey = BuiltInTenantRole | `custom:${string}`;
export type TenantRolePermissionPolicy = RolePermissionPolicy<TenantRolePolicyKey, TenantPermission>;

export type CustomRoleTemplate = {
  key: string;
  name: string;
  description: string;
  category: string;
  permission_count: number;
  permissions: TenantPermission[];
};

export type TenantPermissionPolicyMatrix = {
  scope: 'tenant';
  tenant_id: string;
  editable_roles: BuiltInTenantRole[];
  permission_catalog: PermissionCatalogItem<TenantPermission>[];
  custom_role_templates: CustomRoleTemplate[];
  roles: TenantRolePermissionPolicy[];
  governance: {
    role_model: string;
    support_roles_editable: boolean;
    admin_lockout_protection: boolean;
    reserved_permissions_enforced: boolean;
    custom_roles_tenant_isolated?: boolean;
    per_user_permission_overrides?: boolean;
    custom_roles_use_staff_safety_base?: boolean;
  };
};

export type PlatformPermissionPolicyMatrix = {
  scope: 'platform';
  editable_roles: PlatformRole[];
  permission_catalog: PermissionCatalogItem<PlatformPermission>[];
  roles: Array<RolePermissionPolicy<PlatformRole, PlatformPermission>>;
  governance: {
    role_model: string;
    superadmin_immutable: boolean;
    superadmin_only_management: boolean;
  };
};

type TenantEffectivePermissionResponse = Omit<TenantPermissionSnapshot, 'loaded_at'> & { scope: 'tenant' };
type PlatformEffectivePermissionResponse = Omit<PlatformPermissionSnapshot, 'loaded_at'> & { scope: 'platform' };

let tenantRefreshPromise: Promise<TenantPermissionSnapshot | null> | null = null;
let platformRefreshPromise: Promise<PlatformPermissionSnapshot | null> | null = null;

export async function refreshTenantPermissionSnapshot(): Promise<TenantPermissionSnapshot | null> {
  if (tenantRefreshPromise) return tenantRefreshPromise;

  tenantRefreshPromise = apiRequest<TenantEffectivePermissionResponse>('/permissions/me')
    .then((response) => {
      const snapshot: TenantPermissionSnapshot = {
        tenant_id: response.tenant_id,
        user_id: response.user_id,
        role: response.role,
        custom_role_id: response.custom_role_id || null,
        custom_role_name: response.custom_role_name || null,
        access_role: response.access_role || response.role,
        access_role_label: response.access_role_label || response.custom_role_name || response.role,
        permissions: response.permissions,
        loaded_at: new Date().toISOString()
      };
      setTenantPermissionSnapshot(snapshot);
      return snapshot;
    })
    .catch(() => {
      clearTenantPermissionSnapshot();
      return null;
    })
    .finally(() => {
      tenantRefreshPromise = null;
    });

  return tenantRefreshPromise;
}

export async function refreshPlatformPermissionSnapshot(): Promise<PlatformPermissionSnapshot | null> {
  if (platformRefreshPromise) return platformRefreshPromise;

  platformRefreshPromise = platformApiRequest<PlatformEffectivePermissionResponse>('/platform/permissions/me')
    .then((response) => {
      const snapshot: PlatformPermissionSnapshot = {
        platform_user_id: response.platform_user_id,
        role: response.role,
        permissions: response.permissions,
        loaded_at: new Date().toISOString()
      };
      setPlatformPermissionSnapshot(snapshot);
      return snapshot;
    })
    .catch(() => {
      clearPlatformPermissionSnapshot();
      return null;
    })
    .finally(() => {
      platformRefreshPromise = null;
    });

  return platformRefreshPromise;
}

export function fetchTenantPermissionPolicyMatrix(): Promise<TenantPermissionPolicyMatrix> {
  return apiRequest<TenantPermissionPolicyMatrix>('/permissions');
}

export async function saveTenantRolePermissionPolicy(
  role: BuiltInTenantRole,
  permissions: TenantPermission[]
): Promise<TenantRolePermissionPolicy> {
  const result = await apiRequest<TenantRolePermissionPolicy>(`/permissions/${role}`, {
    method: 'PUT',
    body: JSON.stringify({ permissions }),
    skipMutationFeedback: true
  });
  await refreshTenantPermissionSnapshot();
  return result;
}

export async function resetTenantRolePermissionPolicy(role: BuiltInTenantRole): Promise<TenantRolePermissionPolicy> {
  const result = await apiRequest<TenantRolePermissionPolicy>(`/permissions/${role}`, {
    method: 'DELETE',
    skipMutationFeedback: true
  });
  await refreshTenantPermissionSnapshot();
  return result;
}

export function createTenantCustomRole(input: {
  name: string;
  description?: string | null;
  template_key?: string | null;
  permissions?: TenantPermission[];
}): Promise<TenantRolePermissionPolicy> {
  return apiRequest<TenantRolePermissionPolicy>('/permissions/custom-roles', {
    method: 'POST',
    body: JSON.stringify(input),
    skipMutationFeedback: true
  });
}

export function updateTenantCustomRole(input: {
  id: string;
  version: number;
  name?: string;
  description?: string | null;
  is_active?: boolean;
}): Promise<TenantRolePermissionPolicy> {
  const { id, ...body } = input;
  return apiRequest<TenantRolePermissionPolicy>(`/permissions/custom-roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    skipMutationFeedback: true
  });
}

export async function saveTenantCustomRolePermissions(input: {
  id: string;
  version: number;
  permissions: TenantPermission[];
}): Promise<TenantRolePermissionPolicy> {
  const result = await apiRequest<TenantRolePermissionPolicy>(`/permissions/custom-roles/${input.id}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ version: input.version, permissions: input.permissions }),
    skipMutationFeedback: true
  });
  await refreshTenantPermissionSnapshot();
  return result;
}

export async function resetTenantCustomRolePermissions(input: {
  id: string;
  version: number;
}): Promise<TenantRolePermissionPolicy> {
  const result = await apiRequest<TenantRolePermissionPolicy>(`/permissions/custom-roles/${input.id}/permissions`, {
    method: 'DELETE',
    body: JSON.stringify({ version: input.version }),
    skipMutationFeedback: true
  });
  await refreshTenantPermissionSnapshot();
  return result;
}

export function duplicateTenantCustomRole(input: {
  id: string;
  name: string;
  description?: string | null;
}): Promise<TenantRolePermissionPolicy> {
  return apiRequest<TenantRolePermissionPolicy>(`/permissions/custom-roles/${input.id}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ name: input.name, description: input.description }),
    skipMutationFeedback: true
  });
}

export function deleteTenantCustomRole(input: { id: string; version: number }): Promise<{ id: string; deleted: boolean; name: string }> {
  return apiRequest(`/permissions/custom-roles/${input.id}`, {
    method: 'DELETE',
    body: JSON.stringify({ version: input.version }),
    skipMutationFeedback: true
  });
}

export function fetchPlatformPermissionPolicyMatrix(): Promise<PlatformPermissionPolicyMatrix> {
  return platformApiRequest<PlatformPermissionPolicyMatrix>('/platform/permissions');
}

export async function savePlatformRolePermissionPolicy(
  role: PlatformRole,
  permissions: PlatformPermission[]
): Promise<RolePermissionPolicy<PlatformRole, PlatformPermission>> {
  const result = await platformApiRequest<RolePermissionPolicy<PlatformRole, PlatformPermission>>(
    `/platform/permissions/${role}`,
    {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
      skipMutationFeedback: true
    }
  );
  await refreshPlatformPermissionSnapshot();
  return result;
}

export async function resetPlatformRolePermissionPolicy(
  role: PlatformRole
): Promise<RolePermissionPolicy<PlatformRole, PlatformPermission>> {
  const result = await platformApiRequest<RolePermissionPolicy<PlatformRole, PlatformPermission>>(
    `/platform/permissions/${role}`,
    {
      method: 'DELETE',
      skipMutationFeedback: true
    }
  );
  await refreshPlatformPermissionSnapshot();
  return result;
}
