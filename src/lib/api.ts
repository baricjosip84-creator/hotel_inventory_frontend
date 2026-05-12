import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  saveAuthTokens
} from './auth';

/**
 * IMPORTANT
 * ---------
 * Local development:
 * - .env uses /api
 * - Vite proxy forwards /api -> local backend
 *
 * Production:
 * - .env.production points to Render backend:
 *   https://hotel-inventory-backend.onrender.com/api
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/*
  Shared in-flight refresh promise.
  This prevents multiple concurrent 401s from triggering multiple refresh calls
  at the same time.
*/
let refreshPromise: Promise<string | null> | null = null;

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
  message?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}



export function isVersionConflictError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  return (
    error.status === 409 ||
    error.code === 'VERSION_CONFLICT' ||
    error.code === 'STALE_VERSION' ||
    error.code === 'CONCURRENT_MODIFICATION'
  );
}

export function getVersionConflictMessage(error: unknown): string {
  if (isVersionConflictError(error)) {
    return 'This record was modified by another operation. Refresh the page data and retry your changes.';
  }

  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Unknown request failure.';
}


function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function isAuthRefreshRequest(path: string): boolean {
  return path === '/auth/refresh' || path === 'auth/refresh';
}

function isAuthLoginRequest(path: string): boolean {
  return path === '/auth/login' || path === 'auth/login';
}

function redirectToLoginAfterExpiredSession(): void {
  /*
    WHAT CHANGED
    ------------
    Added one small global expired-session redirect helper.

    WHY IT CHANGED
    --------------
    apiRequest already cleared tokens on a final 401, but the app could remain
    visually sitting on a protected page until the user clicked again or refreshed.

    WHAT PROBLEM IT SOLVES
    ----------------------
    When a protected API request proves the session cannot be recovered, the user
    is returned to /login immediately instead of staying in a broken authenticated
    shell.

    Important:
    - login requests do not use this helper
    - refresh requests do not use this helper
    - 403 responses are still surfaced as ApiError so pages can show their normal
      permission messages
  */
  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname === '/login') {
    return;
  }

  window.location.replace('/login');
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

      if (parsed?.error?.message) {
        message = parsed.error.message;
      } else if (parsed?.message) {
        message = parsed.message;
      }

      code = parsed?.error?.code;
      requestId = parsed?.error?.request_id;
    } catch {
      // Keep the raw response body when the backend did not return JSON.
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

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthTokens();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });

        const tokens = await parseResponse<{ accessToken: string; refreshToken: string }>(response);

        saveAuthTokens(tokens);
        return tokens.accessToken;
      } catch {
        clearAuthTokens();
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

  /*
    Only force JSON content-type when the caller did not already set one.
    This keeps the helper safer for future FormData/file use.
  */
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(buildUrl(path), {
    ...options,
    headers
  });
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in your current apiRequest.

    Existing behavior preserved:
    - same API_BASE_URL behavior
    - same ApiError shape
    - same parseResponse behavior
    - same in-flight refresh promise
    - same pre-request refresh for expired access tokens
    - same one-time retry after 401
    - same 403 behavior: throw ApiError and let the page decide UI

    Only added:
    - after a final unrecoverable 401 on protected API requests, clear auth and
      redirect to /login.

    WHY IT CHANGED
    --------------
    Your API layer already performed most of the correct session recovery work.
    The remaining issue was the user could stay inside the protected app shell
    after a final 401.

    WHAT PROBLEM IT SOLVES
    ----------------------
    Makes expired/invalid sessions fail cleanly and visibly without changing
    backend contracts or page-level permission handling.
  */
  const isLoginRequest = isAuthLoginRequest(path);
  const isRefreshRequest = isAuthRefreshRequest(path);
  const currentAccessToken = getAccessToken();

  /*
    If the access token is already expired before the request starts, try a
    silent refresh first for authenticated routes. This reduces avoidable 401s.
  */
  if (!isLoginRequest && !isRefreshRequest && isAccessTokenExpired(currentAccessToken)) {
    await refreshAccessToken();
  }

  let response: Response;

  try {
    response = await performRequest(path, options);
  } catch (error: any) {
    throw new ApiError(error?.message || 'Network error while contacting backend', 0);
  }

  /*
    Retry one time after a 401 by rotating the access token through the refresh
    endpoint. Skip this behavior for login/refresh requests themselves to avoid
    loops.
  */
  if (response.status === 401 && !isLoginRequest && !isRefreshRequest) {
    const refreshedAccessToken = await refreshAccessToken();

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
      clearAuthTokens();
      redirectToLoginAfterExpiredSession();
    }

    throw error;
  }
}