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
  editable: boolean;
  default_permissions: Permission[];
  effective_permissions: Permission[];
  locked_permissions: Permission[];
  forbidden_permissions: Permission[];
  override_count: number;
  is_default: boolean;
};

export type TenantPermissionPolicyMatrix = {
  scope: 'tenant';
  tenant_id: string;
  editable_roles: Array<Extract<UserRole, 'admin' | 'manager' | 'staff'>>;
  permission_catalog: PermissionCatalogItem<TenantPermission>[];
  roles: Array<RolePermissionPolicy<Extract<UserRole, 'admin' | 'manager' | 'staff'>, TenantPermission>>;
  governance: {
    role_model: string;
    support_roles_editable: boolean;
    admin_lockout_protection: boolean;
    reserved_permissions_enforced: boolean;
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
  role: Extract<UserRole, 'admin' | 'manager' | 'staff'>,
  permissions: TenantPermission[]
): Promise<RolePermissionPolicy<Extract<UserRole, 'admin' | 'manager' | 'staff'>, TenantPermission>> {
  const result = await apiRequest<RolePermissionPolicy<Extract<UserRole, 'admin' | 'manager' | 'staff'>, TenantPermission>>(
    `/permissions/${role}`,
    {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
      skipMutationFeedback: true
    }
  );
  await refreshTenantPermissionSnapshot();
  return result;
}

export async function resetTenantRolePermissionPolicy(
  role: Extract<UserRole, 'admin' | 'manager' | 'staff'>
): Promise<RolePermissionPolicy<Extract<UserRole, 'admin' | 'manager' | 'staff'>, TenantPermission>> {
  const result = await apiRequest<RolePermissionPolicy<Extract<UserRole, 'admin' | 'manager' | 'staff'>, TenantPermission>>(
    `/permissions/${role}`,
    {
      method: 'DELETE',
      skipMutationFeedback: true
    }
  );
  await refreshTenantPermissionSnapshot();
  return result;
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
