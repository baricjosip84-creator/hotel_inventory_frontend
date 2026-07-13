import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { AuthTokens } from '../types/auth';
import { platformApiRequest } from '../lib/platformApi';
import {
  getPlatformAccessToken,
  getPlatformRefreshToken,
  hasAnyPlatformRole,
  isPlatformAccessTokenExpired,
  isPlatformAuthenticated,
  savePlatformAuthTokens
} from '../lib/platformAuth';
import type { PlatformIdentity, PlatformRole } from '../lib/platformAuth';
import type { PlatformPermission } from '../lib/platformPermissions';
import { hasAllPlatformPermissions, PLATFORM_PERMISSION_SNAPSHOT_EVENT } from '../lib/platformPermissions';
import { refreshPlatformPermissionSnapshot } from '../lib/permissionPolicies';

type PlatformProtectedRouteProps = PropsWithChildren<{
  allowedRoles?: PlatformRole[];
  requiredPermissions?: PlatformPermission[];
}>;

export function PlatformProtectedRoute({ children, allowedRoles, requiredPermissions }: PlatformProtectedRouteProps) {
  const location = useLocation();
  const [, setPermissionRevision] = useState(0);
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>(() => {
    return isPlatformAuthenticated() ? 'checking' : 'denied';
  });

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const accessToken = getPlatformAccessToken();
      const refreshToken = getPlatformRefreshToken();

      if (accessToken && !isPlatformAccessTokenExpired(accessToken)) {
        try {
          const identity = await platformApiRequest<PlatformIdentity>('/platform/auth/me');

          await refreshPlatformPermissionSnapshot();
          if (isMounted) {
            setStatus(identity?.id ? 'allowed' : 'denied');
          }
        } catch {
          if (isMounted) {
            setStatus('denied');
          }
        }
        return;
      }

      if (!refreshToken) {
        if (isMounted) {
          setStatus('denied');
        }
        return;
      }

      try {
        const tokens = await platformApiRequest<AuthTokens>('/platform/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });
        savePlatformAuthTokens(tokens);
        const identity = await platformApiRequest<PlatformIdentity>('/platform/auth/me');
        await refreshPlatformPermissionSnapshot();

        if (isMounted) {
          setStatus(identity?.id ? 'allowed' : 'denied');
        }
      } catch {
        if (isMounted) {
          setStatus('denied');
        }
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

  if (allowedRoles && !hasAnyPlatformRole(allowedRoles)) {
    return <Navigate to="/platform" replace />;
  }

  if (requiredPermissions && !hasAllPlatformPermissions(requiredPermissions)) {
    return <Navigate to="/platform" replace />;
  }

  return <>{children}</>;
}
