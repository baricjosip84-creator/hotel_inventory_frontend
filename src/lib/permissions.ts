import { getAccessToken } from './auth';

export type UserRole = 'admin' | 'manager' | 'staff' | 'unknown';

type JwtPayload = {
  role?: string;
  tenant_id?: string;
  id?: string;
  exp?: number;
};

function decodeJwtPayload(token: string | null): JwtPayload | null {
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
    const decoded = atob(padded);

    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function getCurrentUserRole(): UserRole {
  /*
    WHAT CHANGED
    ------------
    This helper now centralizes frontend role detection by decoding the existing
    JWT payload already issued by your backend.

    WHY IT CHANGED
    --------------
    Your backend role model already exists and is enforced server-side. The
    frontend now needs one shared source of truth so route guards, navigation,
    and page actions all align with those same roles.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This removes scattered per-page JWT decoding and prevents inconsistent role
    checks across the application.
  */
  const payload = decodeJwtPayload(getAccessToken());
  const role = payload?.role;

  if (role === 'admin' || role === 'manager' || role === 'staff') {
    return role;
  }

  return 'unknown';
}

export function hasAnyRole(allowedRoles: UserRole[]): boolean {
  const currentRole = getCurrentUserRole();
  return allowedRoles.includes(currentRole);
}

export function getRoleCapabilities(role: UserRole = getCurrentUserRole()) {
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isStaff = role === 'staff';
  const canManageMasterData = isAdmin || isManager;

  return {
    role,
    isAdmin,
    isManager,
    isStaff,
    canViewReports: isAdmin || isManager,
    canManageProducts: canManageMasterData,
    canManageSuppliers: canManageMasterData,
    canManageStorageLocations: canManageMasterData,
    canManageAlerts: canManageMasterData,
    canManageShipments: canManageMasterData,
    canReceiveShipments: isAdmin || isManager || isStaff,
    canConsumeStock: isAdmin || isManager || isStaff,
    canCountStock: isAdmin || isManager,
    canAdjustStock: isAdmin || isManager,
    canViewSessions: isAdmin || isManager || isStaff
  };
}
