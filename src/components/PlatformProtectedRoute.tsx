import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { AuthTokens } from '../types/auth';
import { platformApiRequest } from '../lib/platformApi';
import {
  getPlatformAccessToken,
  getPlatformRefreshToken,
  hasAnyPlatformRole,
  isPlatformAuthenticated,
  savePlatformAuthTokens,
  fetchCurrentPlatformIdentity
} from '../lib/platformAuth';
import type { PlatformRole } from '../lib/platformAuth';
import type { PlatformPermission } from '../lib/platformPermissions';
import { hasAllPlatformPermissions } from '../lib/platformPermissions';

type PlatformProtectedRouteProps = PropsWithChildren<{
  allowedRoles?: PlatformRole[];
  requiredPermissions?: PlatformPermission[];
}>;

export function PlatformProtectedRoute({ children, allowedRoles, requiredPermissions }: PlatformProtectedRouteProps) {
  const location = useLocation();
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>(() => {
    return isPlatformAuthenticated() ? 'checking' : 'denied';
  });

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const accessToken = getPlatformAccessToken();
      const refreshToken = getPlatformRefreshToken();

      if (accessToken) {
        const identity = await fetchCurrentPlatformIdentity();

        if (isMounted) {
          setStatus(identity ? 'allowed' : 'denied');
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
        const identity = await fetchCurrentPlatformIdentity();

        if (isMounted) {
          setStatus(identity ? 'allowed' : 'denied');
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
