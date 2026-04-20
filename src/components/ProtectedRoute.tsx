import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken, getRefreshToken, isAuthenticated } from '../lib/auth';
import type { UserRole } from '../lib/permissions';
import { hasAnyRole } from '../lib/permissions';
import { apiRequest } from '../lib/api';

type ProtectedRouteProps = PropsWithChildren<{
  allowedRoles?: UserRole[];
}>;

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();

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
        await apiRequest('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken })
        });

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
    ProtectedRoute now supports optional role-based authorization on top of the
    existing authenticated-session guard.

    WHY IT CHANGED
    --------------
    Your backend already enforces role restrictions. The frontend now mirrors
    those restrictions at route level so management pages do not appear
    accessible until the user clicks into them.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This prevents unauthorized navigation to protected management routes such as
    reports while still keeping the backend as the real security boundary.
  */
  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return (
      <div style={{ padding: '24px', maxWidth: 720 }}>
        <h2 style={{ marginTop: 0 }}>Access denied</h2>
        <p style={{ marginBottom: 0, color: '#4b5563' }}>
          Your current role does not have access to this route. The frontend is
          aligned to the backend authorization model already enforced by the API.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}