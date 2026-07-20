/**
 * Tenant authentication storage.
 *
 * Refresh tokens are intentionally absent from JavaScript storage. They are
 * issued by the API as scoped HttpOnly cookies. The browser stores only the
 * short-lived access token and the signed refresh-CSRF token.
 */

import type { AuthTokens } from '../types/auth';
import { clearRuntimeIdentity, setRuntimeIdentity } from '../observability/runtimeErrorMonitoring';

const ACCESS_TOKEN_KEY = 'inventory_access_token';
const CSRF_TOKEN_KEY = 'inventory_csrf_token';
const LEGACY_REFRESH_TOKEN_KEY = 'inventory_refresh_token';

function removeLegacyRefreshToken(): void {
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function saveSupportSessionAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.removeItem(CSRF_TOKEN_KEY);
  removeLegacyRefreshToken();
  localStorage.removeItem('inventory_tenant_effective_permissions');
}

export function saveAuthTokens(tokens: AuthTokens): void {
  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    syncTenantRuntimeIdentity(tokens.accessToken);
  }

  if (tokens.csrfToken) {
    localStorage.setItem(CSRF_TOKEN_KEY, tokens.csrfToken);
  }

  removeLegacyRefreshToken();
}

export function saveCsrfToken(csrfToken: string): void {
  if (csrfToken) {
    localStorage.setItem(CSRF_TOKEN_KEY, csrfToken);
  }
  removeLegacyRefreshToken();
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getCsrfToken(): string | null {
  removeLegacyRefreshToken();
  return localStorage.getItem(CSRF_TOKEN_KEY);
}

/**
 * Backward-compatible cleanup helper. Refresh tokens are no longer readable by
 * JavaScript, so this always removes any legacy value and returns null.
 */
export function getRefreshToken(): null {
  removeLegacyRefreshToken();
  return null;
}

export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(CSRF_TOKEN_KEY);
  removeLegacyRefreshToken();
  localStorage.removeItem('inventory_tenant_effective_permissions');
  clearRuntimeIdentity('tenant');
}

export function clearAuth(): void {
  clearAuthTokens();
}

function decodeJwtPayload(token: string | null): Record<string, unknown> | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(token: string | null, bufferSeconds = 15): boolean {
  if (!token) return true;

  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== 'number') return true;

  return exp <= Math.floor(Date.now() / 1000) + bufferSeconds;
}

export function isAuthenticated(): boolean {
  const accessToken = getAccessToken();
  return Boolean(accessToken && !isAccessTokenExpired(accessToken));
}

export function getCurrentTenantUserId(): string | null {
  const payload = decodeJwtPayload(getAccessToken());

  if (typeof payload?.id === 'string') return payload.id;
  if (typeof payload?.user_id === 'string') return payload.user_id;
  return null;
}

export function getTenantObservabilityIdentity(token: string | null): { area: 'tenant'; userId?: string; tenantId?: string; role?: string; supportSession?: boolean } | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const userId = typeof payload.id === 'string' ? payload.id : typeof payload.user_id === 'string' ? payload.user_id : undefined;
  const tenantId = typeof payload.tenant_id === 'string' ? payload.tenant_id : undefined;
  const role = typeof payload.role === 'string' ? payload.role : undefined;
  return {
    area: 'tenant',
    userId,
    tenantId,
    role,
    supportSession: payload.typ === 'support_session'
  };
}

function syncTenantRuntimeIdentity(accessToken: string | null): void {
  const identity = getTenantObservabilityIdentity(accessToken);
  if (identity) setRuntimeIdentity(identity);
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
  localStorage.removeItem(CSRF_TOKEN_KEY);
  removeLegacyRefreshToken();
  clearRuntimeIdentity('tenant');
}
