import type { AuthTokens } from '../types/auth';

const PLATFORM_ACCESS_TOKEN_KEY = 'inventory_platform_access_token';
const PLATFORM_REFRESH_TOKEN_KEY = 'inventory_platform_refresh_token';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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


export type PlatformIdentity = {
  id: string;
  email?: string;
  name?: string | null;
  role: PlatformRole;
  is_active?: boolean;
  created_at?: string;
};

function buildPlatformUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function parsePlatformIdentity(payload: unknown): PlatformIdentity {
  const value = payload as Partial<PlatformIdentity> | null;

  return {
    id: typeof value?.id === 'string' ? value.id : '',
    email: typeof value?.email === 'string' ? value.email : undefined,
    name: typeof value?.name === 'string' || value?.name === null ? value.name : undefined,
    role:
      value?.role === 'superadmin' ||
      value?.role === 'support' ||
      value?.role === 'platform_viewer'
        ? value.role
        : 'unknown',
    is_active: typeof value?.is_active === 'boolean' ? value.is_active : undefined,
    created_at: typeof value?.created_at === 'string' ? value.created_at : undefined
  };
}

export async function fetchCurrentPlatformIdentity(): Promise<PlatformIdentity | null> {
  const accessToken = getPlatformAccessToken();

  if (!accessToken || isPlatformAccessTokenExpired(accessToken)) {
    return null;
  }

  const response = await fetch(buildPlatformUrl('/platform/auth/me'), {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (response.status === 401) {
    clearPlatformAuthTokens();
    return null;
  }

  if (!response.ok) {
    throw new Error(`Platform identity check failed with status ${response.status}`);
  }

  return parsePlatformIdentity(await response.json());
}

export async function logoutPlatformSession(): Promise<void> {
  const refreshToken = getPlatformRefreshToken();
  const accessToken = getPlatformAccessToken();

  try {
    if (refreshToken) {
      const headers = new Headers({
        'Content-Type': 'application/json'
      });

      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }

      await fetch(buildPlatformUrl('/platform/auth/logout'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ refreshToken })
      });
    }
  } finally {
    clearPlatformAuthTokens();
  }
}
