import { tenantModuleRegistry } from '../app/navigationRegistry';
import type { TenantModuleRegistryEntry } from '../app/navigationRegistry';
import {
  getCurrentUserRole,
  hasPermission,
  type TenantPermission,
  type UserRole
} from './permissions';
import { getAccessToken } from './auth';

type TenantAccessJwtPayload = {
  id?: string;
  user_id?: string;
  tenant_id?: string;
  tenantId?: string;
  email?: string;
  role?: string;
};

export type TenantAccessSnapshot = {
  role: UserRole;
  tenantId: string | null;
  userId: string | null;
  userEmail: string | null;
  permittedModules: TenantModuleRegistryEntry[];
  hiddenModules: TenantModuleRegistryEntry[];
  permittedModuleCount: number;
  hiddenModuleCount: number;
  totalModuleCount: number;
  hasTenantContext: boolean;
};

function decodeJwtPayload(token: string | null): TenantAccessJwtPayload | null {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');

    return JSON.parse(atob(padded)) as TenantAccessJwtPayload;
  } catch {
    return null;
  }
}

function canAccessModule(module: TenantModuleRegistryEntry, role: UserRole): boolean {
  if (module.permission) {
    return hasPermission(module.permission as TenantPermission, role);
  }

  if (!module.roles || module.roles.length === 0) {
    return true;
  }

  return module.roles.includes(role as 'admin' | 'manager' | 'staff');
}

export function getTenantAccessSnapshot(): TenantAccessSnapshot {
  const payload = decodeJwtPayload(getAccessToken());
  const role = getCurrentUserRole();
  const permittedModules = tenantModuleRegistry.filter((module) => canAccessModule(module, role));
  const hiddenModules = tenantModuleRegistry.filter((module) => !canAccessModule(module, role));
  const tenantId = payload?.tenant_id || payload?.tenantId || null;

  return {
    role,
    tenantId,
    userId: payload?.user_id || payload?.id || null,
    userEmail: payload?.email || null,
    permittedModules,
    hiddenModules,
    permittedModuleCount: permittedModules.length,
    hiddenModuleCount: hiddenModules.length,
    totalModuleCount: tenantModuleRegistry.length,
    hasTenantContext: Boolean(tenantId)
  };
}
