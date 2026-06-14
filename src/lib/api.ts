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
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

function getBackendReachabilityMessage(error: unknown): string {
  const detail = error instanceof Error && error.message ? ` Browser detail: ${error.message}.` : '';
  const base = API_BASE_URL || '/api';

  if (base === '/api') {
    return `Cannot reach backend. The frontend is using the /api fallback, which only works with a local Vite proxy or an explicit production reverse proxy. In Vercel, set VITE_API_BASE_URL to your Render backend API URL, for example https://<render-backend-host>/api.${detail}`;
  }

  return `Cannot reach backend at ${base}. Check that the Render backend is running, VITE_API_BASE_URL points to the backend /api URL, and the backend CORS_ORIGINS environment variable includes this exact frontend origin.${detail}`;
}

export function getApiBaseUrlForDiagnostics(): string {
  return API_BASE_URL;
}

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
    details?: unknown;
  };
  message?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, requestId?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
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


const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type MutationSafetyOptions = {
  /**
   * Reuse this when the UI owns a stable operation key for a logical mutation.
   * When omitted, a fresh key is generated per apiRequest call and then reused
   * for any internal auth-refresh retry of that same call.
   */
  idempotencyKey?: string;
  /**
   * Adds If-Match-Version without making every caller hand-roll headers.
   */
  version?: string | number;
  /**
   * Allows rare intentionally non-idempotent writes to opt out explicitly.
   */
  skipIdempotencyKey?: boolean;
};

export type SafeMutationRequestInit = RequestInit & MutationSafetyOptions;

function isWriteRequest(options: RequestInit = {}): boolean {
  const method = String(options.method || 'GET').toUpperCase();
  return WRITE_METHODS.has(method);
}

function createIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function withMutationSafetyHeaders(path: string, options: SafeMutationRequestInit = {}): RequestInit {
  const {
    idempotencyKey,
    version,
    skipIdempotencyKey,
    headers: originalHeaders,
    ...requestOptions
  } = options;

  const headers = new Headers(originalHeaders || {});

  if (version !== undefined && !headers.has('If-Match-Version')) {
    headers.set('If-Match-Version', String(version));
  }

  if (
    isWriteRequest(requestOptions) &&
    !isAuthLoginRequest(path) &&
    !isAuthRefreshRequest(path) &&
    !skipIdempotencyKey &&
    !headers.has('Idempotency-Key')
  ) {
    headers.set('Idempotency-Key', idempotencyKey || createIdempotencyKey());
  }

  return {
    ...requestOptions,
    headers
  };
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
    let details: unknown;

    try {
      const parsed = rawText ? (JSON.parse(rawText) as ApiErrorResponse) : null;

      if (parsed?.error?.message) {
        message = parsed.error.message;
      } else if (parsed?.message) {
        message = parsed.message;
      }

      code = parsed?.error?.code;
      requestId = parsed?.error?.request_id;
      details = parsed?.error?.details;
    } catch {
      // Keep the raw response body when the backend did not return JSON.
    }

    throw new ApiError(message, response.status, code, requestId, details);
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
  const safeOptions = withMutationSafetyHeaders(path, options as SafeMutationRequestInit);
  const headers = new Headers(safeOptions.headers || {});

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
    ...safeOptions,
    headers
  });
}


export type ApiDownloadMetadata = {
  exportedRows: number | null;
  originalRows: number | null;
  rowLimit: number | null;
  wasRowLimited: boolean;
};

function parseOptionalHeaderNumber(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const normalizedValue = value.trim();

  if (!/^\d+$/.test(normalizedValue)) {
    return null;
  }

  const parsed = Number(normalizedValue);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseOptionalHeaderBoolean(value: string | null): boolean {
  if (value === null) {
    return false;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === 'true';
}

function readDownloadMetadata(response: Response): ApiDownloadMetadata {
  return {
    exportedRows: parseOptionalHeaderNumber(response.headers.get('X-Report-Exported-Rows')),
    originalRows: parseOptionalHeaderNumber(response.headers.get('X-Report-Source-Rows')),
    rowLimit: parseOptionalHeaderNumber(response.headers.get('X-Report-Row-Limit')),
    wasRowLimited: parseOptionalHeaderBoolean(response.headers.get('X-Report-Row-Limit-Applied'))
  };
}

function sanitizeDownloadFilename(filename: string): string {
  const normalizedFilename = String(filename || '')
    .replace(/[\\/]/g, '-')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/[^a-zA-Z0-9._ -]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const safeFilename = normalizedFilename.replace(/^[-. ]+|[-. ]+$/g, '').slice(0, 120);
  return safeFilename || 'download.csv';
}

export async function apiDownloadFile(path: string, filename: string): Promise<ApiDownloadMetadata> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new ApiError('File downloads are only available in the browser.', 0, 'DOWNLOAD_UNAVAILABLE');
  }

  const isLoginRequest = isAuthLoginRequest(path);
  const isRefreshRequest = isAuthRefreshRequest(path);
  const currentAccessToken = getAccessToken();

  if (!isLoginRequest && !isRefreshRequest && isAccessTokenExpired(currentAccessToken)) {
    await refreshAccessToken();
  }

  let response: Response;

  try {
    response = await performRequest(path, { method: 'GET' });
  } catch (error: any) {
    throw new ApiError(getBackendReachabilityMessage(error), 0, 'BACKEND_UNREACHABLE');
  }

  if (response.status === 401 && !isLoginRequest && !isRefreshRequest) {
    const refreshedAccessToken = await refreshAccessToken();

    if (refreshedAccessToken) {
      try {
        response = await performRequest(path, { method: 'GET' });
      } catch (error: any) {
        throw new ApiError(getBackendReachabilityMessage(error), 0, 'BACKEND_UNREACHABLE');
      }
    }
  }

  if (!response.ok) {
    try {
      await parseResponse<never>(response);
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

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  try {
    link.href = objectUrl;
    link.download = sanitizeDownloadFilename(filename);
    link.style.display = 'none';
    link.tabIndex = -1;
    link.setAttribute('aria-hidden', 'true');
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();

    /*
      Let the browser start consuming the object URL before revoking it.
      Immediate revocation can be fragile in some browser/download flows.
      The finally block still guarantees cleanup if DOM append/click fails.
    */
    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 0);
  }

  return readDownloadMetadata(response);
}

export async function apiMutationRequest<T>(
  path: string,
  options: SafeMutationRequestInit = {}
): Promise<T> {
  if (!isWriteRequest(options)) {
    throw new ApiError('apiMutationRequest requires POST, PUT, PATCH, or DELETE.', 0, 'INVALID_MUTATION_METHOD');
  }

  return apiRequest<T>(path, options);
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
  const requestOptions = withMutationSafetyHeaders(path, options as SafeMutationRequestInit);
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
    response = await performRequest(path, requestOptions);
  } catch (error: any) {
    throw new ApiError(getBackendReachabilityMessage(error), 0, 'BACKEND_UNREACHABLE');
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
        response = await performRequest(path, requestOptions);
      } catch (error: any) {
        throw new ApiError(getBackendReachabilityMessage(error), 0, 'BACKEND_UNREACHABLE');
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