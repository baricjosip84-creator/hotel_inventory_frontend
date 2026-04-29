import type { AuthTokens } from '../types/auth';
import { ApiError } from './api';
import {
  clearPlatformAuthTokens,
  getPlatformAccessToken,
  getPlatformRefreshToken,
  isPlatformAccessTokenExpired,
  savePlatformAuthTokens
} from './platformAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
let refreshPromise: Promise<string | null> | null = null;

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
  message?: string;
};

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function isPlatformRefreshRequest(path: string): boolean {
  return path === '/platform/auth/refresh' || path === 'platform/auth/refresh';
}

function isPlatformLoginRequest(path: string): boolean {
  return path === '/platform/auth/login' || path === 'platform/auth/login';
}

function redirectToPlatformLoginAfterExpiredSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname === '/platform/login') {
    return;
  }

  window.location.replace('/platform/login');
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (!response.ok) {
    let message = rawText || `Request failed with status ${response.status}`;
    let code: string | undefined;
    let requestId: string | undefined;

    try {
      const parsed = rawText ? (JSON.parse(rawText) as ApiErrorResponse) : null;
      message = parsed?.error?.message || parsed?.message || message;
      code = parsed?.error?.code;
      requestId = parsed?.error?.request_id;
    } catch {
      // Preserve raw response text.
    }

    throw new ApiError(message, response.status, code, requestId);
  }

  if (!rawText) {
    return undefined as T;
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(rawText) as T;
  }

  return rawText as T;
}

async function refreshPlatformAccessToken(): Promise<string | null> {
  const refreshToken = getPlatformRefreshToken();

  if (!refreshToken) {
    clearPlatformAuthTokens();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(buildUrl('/platform/auth/refresh'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });

        const tokens = await parseResponse<AuthTokens>(response);
        savePlatformAuthTokens(tokens);
        return tokens.accessToken;
      } catch {
        clearPlatformAuthTokens();
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function performRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = getPlatformAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(buildUrl(path), {
    ...options,
    headers
  });
}

export async function platformApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isLoginRequest = isPlatformLoginRequest(path);
  const isRefreshRequest = isPlatformRefreshRequest(path);

  if (
    !isLoginRequest &&
    !isRefreshRequest &&
    isPlatformAccessTokenExpired(getPlatformAccessToken())
  ) {
    await refreshPlatformAccessToken();
  }

  let response: Response;

  try {
    response = await performRequest(path, options);
  } catch (error: any) {
    throw new ApiError(error?.message || 'Network error while contacting backend', 0);
  }

  if (response.status === 401 && !isLoginRequest && !isRefreshRequest) {
    const refreshedAccessToken = await refreshPlatformAccessToken();

    if (refreshedAccessToken) {
      try {
        response = await performRequest(path, options);
      } catch (error: any) {
        throw new ApiError(error?.message || 'Network error while contacting backend', 0);
      }
    }
  }

  try {
    return await parseResponse<T>(response);
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !isLoginRequest &&
      !isRefreshRequest
    ) {
      clearPlatformAuthTokens();
      redirectToPlatformLoginAfterExpiredSession();
    }

    throw error;
  }
}
