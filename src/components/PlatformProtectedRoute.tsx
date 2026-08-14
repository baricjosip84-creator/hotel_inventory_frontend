import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router';
import { platformApiRequest, restorePlatformSession } from '../lib/platformApi';
import type { PlatformIdentity, PlatformRole } from '../lib/platformAuth';
import type { PlatformPermission } from '../lib/platformPermissions';
import { getCurrentPlatformRoleFromToken, hasAllPlatformPermissions, PLATFORM_PERMISSION_SNAPSHOT_EVENT } from '../lib/platformPermissions';
import { refreshPlatformPermissionSnapshot } from '../lib/permissionPolicies';

type PlatformProtectedRouteProps = PropsWithChildren<{
  allowedRoles?: PlatformRole[];
  requiredPermissions?: PlatformPermission[];
}>;

export function PlatformProtectedRoute({ children, allowedRoles, requiredPermissions }: PlatformProtectedRouteProps) {
  const location = useLocation();
  const [, setPermissionRevision] = useState(0);
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const accessToken = await restorePlatformSession();
      if (!accessToken) {
        if (isMounted) setStatus('denied');
        return;
      }

      try {
        const identity = await platformApiRequest<PlatformIdentity>('/platform/auth/me');
        const permissionSnapshot = await refreshPlatformPermissionSnapshot();
        if (isMounted) setStatus(identity?.id && permissionSnapshot ? 'allowed' : 'denied');
      } catch {
        if (isMounted) setStatus('denied');
      }
    };

    void verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const onPermissionsChanged = () => setPermissionRevision((value) => value + 1);
    window.addEventListener(PLATFORM_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
    return () => window.removeEventListener(PLATFORM_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
  }, []);

  if (status === 'checking') {
    return <div style={{ padding: '24px' }}>Checking platform session…</div>;
  }

  if (status === 'denied') {
    return <Navigate to="/platform/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(getCurrentPlatformRoleFromToken())) {
    return <Navigate to="/platform" replace />;
  }

  if (requiredPermissions && !hasAllPlatformPermissions(requiredPermissions)) {
    return <Navigate to="/platform" replace />;
  }

  return <>{children}</>;
}
