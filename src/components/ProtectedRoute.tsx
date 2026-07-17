import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { TenantPermission, UserRole } from '../lib/permissions';
import { hasAllPermissions, hasAnyRole, TENANT_PERMISSION_SNAPSHOT_EVENT } from '../lib/permissions';
import { refreshTenantPermissionSnapshot } from '../lib/permissionPolicies';
import { restoreTenantSession } from '../lib/api';

type ProtectedRouteProps = PropsWithChildren<{
  allowedRoles?: UserRole[];
  requiredPermissions?: TenantPermission[];
}>;

export function ProtectedRoute({ children, allowedRoles, requiredPermissions }: ProtectedRouteProps) {
  const location = useLocation();
  const [, setPermissionRevision] = useState(0);
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const accessToken = await restoreTenantSession();
      if (!accessToken) {
        if (isMounted) setStatus('denied');
        return;
      }

      try {
        await refreshTenantPermissionSnapshot();
        if (isMounted) setStatus('allowed');
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
    window.addEventListener(TENANT_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
    return () => window.removeEventListener(TENANT_PERMISSION_SNAPSHOT_EVENT, onPermissionsChanged);
  }, []);

  if (status === 'checking') {
    return <div style={{ padding: '24px' }}>Checking session…</div>;
  }

  if (status === 'denied') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermissions && !hasAllPermissions(requiredPermissions)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
