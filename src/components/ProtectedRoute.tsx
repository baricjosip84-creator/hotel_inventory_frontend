import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken, getRefreshToken, isAuthenticated } from '../lib/auth';
import { apiRequest } from '../lib/api';

export function ProtectedRoute({ children }: PropsWithChildren) {
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

  return <>{children}</>;
}