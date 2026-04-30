import { getPlatformAccessToken } from './platformAuth';
import type { PlatformRole } from './platformAuth';

export const PLATFORM_PERMISSIONS = Object.freeze({
  TENANTS_READ: 'platform.tenants.read',
  TENANTS_CREATE: 'platform.tenants.create',
  TENANTS_UPDATE: 'platform.tenants.update',
  TENANTS_LOCK: 'platform.tenants.lock',
  TENANTS_UNLOCK: 'platform.tenants.unlock',

  SYSTEM_HEALTH_READ: 'platform.system_health.read',
  DIAGNOSTICS_READ: 'platform.diagnostics.read',

  PLATFORM_USERS_READ: 'platform.users.read',
  PLATFORM_USERS_WRITE: 'platform.users.write',

  SUPPORT_SESSION_READ: 'platform.support_sessions.read',
  SUPPORT_SESSION_START: 'platform.support_sessions.start',
  SUPPORT_SESSION_END: 'platform.support_sessions.end',

  AUDIT_READ: 'platform.audit.read'
} as const);

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS];

type PlatformJwtPayload = {
  typ?: string;
  role?: string;
  id?: string;
  exp?: number;
};

function decodeJwtPayload(token: string | null): PlatformJwtPayload | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as PlatformJwtPayload;
  } catch {
    return null;
  }
}

export const PLATFORM_ROLE_PERMISSIONS: Record<Exclude<PlatformRole, 'unknown'>, readonly PlatformPermission[]> = Object.freeze({
  superadmin: Object.freeze([
    PLATFORM_PERMISSIONS.TENANTS_READ,
    PLATFORM_PERMISSIONS.TENANTS_CREATE,
    PLATFORM_PERMISSIONS.TENANTS_UPDATE,
    PLATFORM_PERMISSIONS.TENANTS_LOCK,
    PLATFORM_PERMISSIONS.TENANTS_UNLOCK,
    PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ,
    PLATFORM_PERMISSIONS.DIAGNOSTICS_READ,
    PLATFORM_PERMISSIONS.PLATFORM_USERS_READ,
    PLATFORM_PERMISSIONS.PLATFORM_USERS_WRITE,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_START,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_END,
    PLATFORM_PERMISSIONS.AUDIT_READ
  ]),

  support: Object.freeze([
    PLATFORM_PERMISSIONS.TENANTS_READ,
    PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ,
    PLATFORM_PERMISSIONS.DIAGNOSTICS_READ,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_START,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_END
  ]),

  platform_viewer: Object.freeze([
    PLATFORM_PERMISSIONS.TENANTS_READ,
    PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ,
    PLATFORM_PERMISSIONS.DIAGNOSTICS_READ,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ,
    PLATFORM_PERMISSIONS.AUDIT_READ
  ])
});

export function getCurrentPlatformRoleFromToken(): PlatformRole {
  const payload = decodeJwtPayload(getPlatformAccessToken());

  if (payload?.typ !== 'platform') return 'unknown';

  if (payload.role === 'superadmin' || payload.role === 'support' || payload.role === 'platform_viewer') {
    return payload.role;
  }

  return 'unknown';
}

export function platformPermissionsForRole(role: PlatformRole = getCurrentPlatformRoleFromToken()): readonly PlatformPermission[] {
  if (role === 'superadmin' || role === 'support' || role === 'platform_viewer') {
    return PLATFORM_ROLE_PERMISSIONS[role];
  }

  return [];
}

export function hasPlatformPermission(permission: PlatformPermission, role: PlatformRole = getCurrentPlatformRoleFromToken()): boolean {
  return platformPermissionsForRole(role).includes(permission);
}

export function hasAllPlatformPermissions(permissions: PlatformPermission[], role: PlatformRole = getCurrentPlatformRoleFromToken()): boolean {
  return permissions.every((permission) => hasPlatformPermission(permission, role));
}

export function hasAnyPlatformPermission(permissions: PlatformPermission[], role: PlatformRole = getCurrentPlatformRoleFromToken()): boolean {
  return permissions.some((permission) => hasPlatformPermission(permission, role));
}
