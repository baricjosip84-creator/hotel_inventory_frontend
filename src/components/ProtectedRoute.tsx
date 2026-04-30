import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  getAccessToken,
  getRefreshToken,
  isAuthenticated,
  saveAuthTokens
} from '../lib/auth';
import type { AuthTokens } from '../types/auth';
import type { TenantPermission, UserRole } from '../lib/permissions';
import { hasAllPermissions, hasAnyRole } from '../lib/permissions';
import { apiRequest } from '../lib/api';

type ProtectedRouteProps = PropsWithChildren<{
  allowedRoles?: UserRole[];
  requiredPermissions?: TenantPermission[];
}>;

export function ProtectedRoute({ children, allowedRoles, requiredPermissions }: ProtectedRouteProps) {
  const location = useLocation();

  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the ProtectedRoute you just pasted.

    Existing behavior preserved:
    - same checking / allowed / denied state model
    - same access-token-first session check
    - same refresh-token fallback
    - same unauthenticated redirect to /login
    - same allowedRoles prop contract
    - same hasAnyRole role check

    Two surgical changes:
    1. Save returned tokens after /auth/refresh.
    2. Redirect authenticated-but-unauthorized users to /dashboard.

    WHY IT CHANGED
    --------------
    1. The existing refresh call allowed the route after refresh, but did not save
       the returned token payload. That can leave the app in an inconsistent auth state.
    2. The agreed route behavior is:
       - not logged in -> /login
       - logged in but wrong role -> /dashboard

    WHAT PROBLEM IT SOLVES
    ----------------------
    Keeps session recovery reliable and makes route-level authorization behavior
    consistent with the app navigation model, without changing router structure.
  */

  /*
    Route guard states:
    - checking: the app is attempting silent session recovery
    - allowed: render protected content
    - denied: redirect to login
  */
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>(() => {
    return isAuthenticated() ? 'checking' : 'denied';
  });

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();

      /*
        If an access token exists, the route can proceed immediately.
        The API layer will refresh it transparently when needed.
      */
      if (accessToken) {
        if (isMounted) {
          setStatus('allowed');
        }
        return;
      }

      /*
        No access token means we can only recover the session if a refresh token
        is still available locally.
      */
      if (!refreshToken) {
        if (isMounted) {
          setStatus('denied');
        }
        return;
      }

      try {
        const tokens = await apiRequest<AuthTokens>('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });

        /*
          WHAT CHANGED
          ------------
          Persist the refreshed tokens returned by the backend.

          WHY
          ---
          Without this, the route may render as allowed while local auth storage
          still has no fresh access token.
        */
        saveAuthTokens(tokens);

        if (isMounted) {
          setStatus('allowed');
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
    return <div style={{ padding: '24px' }}>Checking session…</div>;
  }

  if (status === 'denied') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  /*
    WHAT CHANGED
    ------------
    Role-denied authenticated users now redirect to /dashboard instead of seeing
    an inline access-denied page.

    WHY IT CHANGED
    --------------
    This matches the agreed route behavior:
    authenticated but unauthorized users should be sent back to the safe default
    app page.

    WHAT PROBLEM IT SOLVES
    ----------------------
    Prevents dead-end route screens while keeping backend authorization as the
    real security boundary.
  */
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredPermissions && !hasAllPermissions(requiredPermissions)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}