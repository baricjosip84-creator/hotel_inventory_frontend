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
    This helper centralizes frontend role detection by decoding the existing
    JWT payload already issued by your backend.

    WHY IT CHANGED
    --------------
    Your backend role model already exists and is enforced server-side. The
    frontend needs one shared source of truth so route guards, navigation,
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
  /*
    WHAT CHANGED
    ------------
    This capability map is aligned to the backend authorization rules found in
    the uploaded backend ZIP.

    The important correction in this pass:
    - canConsumeStock is manager/staff only.

    WHY IT CHANGED
    --------------
    Backend route src/routes/stock.js defines POST /stock/consume as:
    authorize(['manager', 'staff'])

    The previous frontend capability allowed admins to consume stock, which
    would show admins an enabled action that the backend correctly rejects.

    WHAT PROBLEM IT SOLVES
    ----------------------
    Prevents the frontend from advertising a stock operation that the backend
    does not allow for admin users, while keeping the backend as the real
    security boundary.
  */
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
    canViewInsights: isAdmin || isManager,
    canViewUsers: isAdmin || isManager,
    canManageUsers: isAdmin,
    canViewAdminSystem: isAdmin || isManager,
    canManageProducts: canManageMasterData,
    canManageSuppliers: canManageMasterData,
    canManageStorageLocations: canManageMasterData,
    canManageAlerts: canManageMasterData,
    canManageShipments: canManageMasterData,
    canReceiveShipments: isAdmin || isManager || isStaff,

    /*
      Backend contract:
      POST /stock/consume allows manager + staff, not admin.
    */
    canConsumeStock: isManager || isStaff,

    canCountStock: isAdmin || isManager,
    canAdjustStock: isAdmin || isManager,
    canViewSessions: isAdmin || isManager || isStaff
  };
}