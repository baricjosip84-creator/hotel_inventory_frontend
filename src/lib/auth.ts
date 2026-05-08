/**
 * src/lib/auth.ts
 *
 * PURPOSE
 * -------
 * Central token storage and basic token inspection helpers for the frontend.
 *
 * IMPORTANT
 * ---------
 * This file intentionally exports MULTIPLE helper names so it stays compatible
 * with the rest of your existing frontend code, including pages/components that
 * may already import:
 * - saveAuthTokens
 * - getAccessToken
 * - getRefreshToken
 * - clearAuthTokens
 * - clearAuth
 * - isAuthenticated
 */

import type { AuthTokens } from '../types/auth';

const ACCESS_TOKEN_KEY = 'inventory_access_token';
const REFRESH_TOKEN_KEY = 'inventory_refresh_token';

/*
  Save support-session access token.

  Support access is access-token-only. A refresh token from a normal tenant
  session must not remain active beside it.
*/
export function saveSupportSessionAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/*
  Save both tokens after login / refresh.
*/
export function saveAuthTokens(tokens: AuthTokens): void {
  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }

  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

/*
  Read current access token.
*/
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/*
  Read current refresh token.
*/
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/*
  Clear all auth tokens.
*/
export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/*
  Backward-compatible alias.
*/
export function clearAuth(): void {
  clearAuthTokens();
}

/*
  Decode a JWT payload safely without depending on an extra package.
  This is used only for client-side expiry checks and UX decisions.
*/
function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
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

    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/*
  Check whether a JWT is expired.
  A small safety buffer helps avoid edge cases where the token expires while a
  request is in flight.
*/
export function isAccessTokenExpired(token: string | null, bufferSeconds = 15): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;

  if (typeof exp !== 'number') {
    return true;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowInSeconds + bufferSeconds;
}

/*
  Basic auth presence check.

  We consider the user authenticated when either:
  - a non-expired access token exists, or
  - a refresh token exists and the app can attempt silent session recovery

  This prevents immediate hard redirects when only the access token has expired
  but the refresh session is still valid on the backend.
*/
export function isAuthenticated(): boolean {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return true;
  }

  return Boolean(refreshToken);
}

export type SupportSessionInfo = {
  isSupportSession: boolean;
  supportSessionId?: string;
  platformUserId?: string;
  tenantId?: string;
  role?: string;
  expiresAt?: number;
};

export function getSupportSessionInfo(): SupportSessionInfo {
  const payload = decodeJwtPayload(getAccessToken());

  if (payload?.typ !== 'support_session') {
    return { isSupportSession: false };
  }

  return {
    isSupportSession: true,
    supportSessionId: typeof payload.support_session_id === 'string' ? payload.support_session_id : undefined,
    platformUserId: typeof payload.platform_user_id === 'string' ? payload.platform_user_id : undefined,
    tenantId: typeof payload.tenant_id === 'string' ? payload.tenant_id : undefined,
    role: typeof payload.role === 'string' ? payload.role : undefined,
    expiresAt: typeof payload.exp === 'number' ? payload.exp : undefined
  };
}

export function isSupportSessionAccess(): boolean {
  return getSupportSessionInfo().isSupportSession;
}

export function clearSupportSessionAccessToken(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}