import type { AuthTokens } from '../types/auth';

const PLATFORM_ACCESS_TOKEN_KEY = 'inventory_platform_access_token';
const PLATFORM_REFRESH_TOKEN_KEY = 'inventory_platform_refresh_token';

export type PlatformRole = 'superadmin' | 'support' | 'platform_viewer' | 'unknown';

type PlatformJwtPayload = {
  typ?: string;
  role?: string;
  id?: string;
  exp?: number;
};

export function savePlatformAuthTokens(tokens: AuthTokens): void {
  if (tokens.accessToken) {
    localStorage.setItem(PLATFORM_ACCESS_TOKEN_KEY, tokens.accessToken);
  }

  if (tokens.refreshToken) {
    localStorage.setItem(PLATFORM_REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function getPlatformAccessToken(): string | null {
  return localStorage.getItem(PLATFORM_ACCESS_TOKEN_KEY);
}

export function getPlatformRefreshToken(): string | null {
  return localStorage.getItem(PLATFORM_REFRESH_TOKEN_KEY);
}

export function clearPlatformAuthTokens(): void {
  localStorage.removeItem(PLATFORM_ACCESS_TOKEN_KEY);
  localStorage.removeItem(PLATFORM_REFRESH_TOKEN_KEY);
}

function decodeJwtPayload(token: string | null): PlatformJwtPayload | null {
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
    return JSON.parse(atob(padded)) as PlatformJwtPayload;
  } catch {
    return null;
  }
}

export function isPlatformAccessTokenExpired(token: string | null, bufferSeconds = 15): boolean {
  if (!token) {
    return true;
  }

  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;

  if (typeof exp !== 'number') {
    return true;
  }

  return exp <= Math.floor(Date.now() / 1000) + bufferSeconds;
}

export function getCurrentPlatformRole(): PlatformRole {
  const payload = decodeJwtPayload(getPlatformAccessToken());

  if (payload?.typ !== 'platform') {
    return 'unknown';
  }

  if (
    payload.role === 'superadmin' ||
    payload.role === 'support' ||
    payload.role === 'platform_viewer'
  ) {
    return payload.role;
  }

  return 'unknown';
}

export function isPlatformAuthenticated(): boolean {
  const accessToken = getPlatformAccessToken();
  const refreshToken = getPlatformRefreshToken();

  if (accessToken && !isPlatformAccessTokenExpired(accessToken)) {
    return true;
  }

  return Boolean(refreshToken);
}

export function hasAnyPlatformRole(allowedRoles: PlatformRole[]): boolean {
  return allowedRoles.includes(getCurrentPlatformRole());
}
