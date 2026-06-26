import type { AuthTokens } from '../types/auth';
import { PLATFORM_MUTATION_FEEDBACK_EVENT } from './actionFeedback';
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

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
  };
  message?: string;
};

type PlatformMutationSafetyOptions = {
  /**
   * Reuse this when the UI owns a stable operation key for a logical mutation.
   * When omitted, a fresh key is generated per platformApiRequest call and then
   * reused for any internal auth-refresh retry of that same call.
   */
  idempotencyKey?: string;
  /**
   * Adds If-Match-Version without making every platform caller hand-roll headers.
   */
  version?: string | number;
  /**
   * Allows rare intentionally non-idempotent writes to opt out explicitly.
   */
  skipIdempotencyKey?: boolean;
};

export type SafePlatformMutationRequestInit = RequestInit & PlatformMutationSafetyOptions;

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

function isWriteRequest(options: RequestInit = {}): boolean {
  const method = String(options.method || 'GET').toUpperCase();
  return WRITE_METHODS.has(method);
}

function createIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }

  return `platform-idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function platformMutationActionLabel(path: string, method: string): string {
  const normalizedPath = path.toLowerCase();
  const normalizedMethod = method.toUpperCase();

  if (normalizedPath.includes('/billing')) return 'Billing profile';
  if (normalizedPath.includes('/tenants')) return 'Tenant configuration';
  if (normalizedPath.includes('/users')) return 'Platform user';
  if (normalizedPath.includes('/runbooks')) return 'Runbook';
  if (normalizedPath.includes('/support')) return 'Support operation';
  if (normalizedPath.includes('/communications')) return 'Tenant communication';
  if (normalizedPath.includes('/contacts')) return 'Tenant contact';
  if (normalizedPath.includes('/tasks')) return 'Tenant task';
  if (normalizedPath.includes('/notes')) return 'Tenant note';

  if (normalizedMethod === 'POST') return 'Platform item';
  if (normalizedMethod === 'PATCH' || normalizedMethod === 'PUT') return 'Platform changes';
  if (normalizedMethod === 'DELETE') return 'Platform item';

  return 'Platform request';
}

function platformMutationSuccessMessage(path: string, method: string): string {
  const normalizedPath = path.toLowerCase();
  const normalizedMethod = method.toUpperCase();

  if (/\/platform\/tenants\/[^/]+\/lock$/.test(normalizedPath) && normalizedMethod === 'POST') {
    return 'Tenant locked successfully.';
  }

  if (/\/platform\/tenants\/[^/]+\/unlock$/.test(normalizedPath) && normalizedMethod === 'POST') {
    return 'Tenant unlocked successfully.';
  }

  if (normalizedPath === '/platform/tenant-sla/scan' && normalizedMethod === 'POST') {
    return 'SLA notification sync completed successfully.';
  }

  if (normalizedPath.includes('/change-management')) {
    if (normalizedPath.endsWith('/approve') && normalizedMethod === 'POST') return 'Change request approved successfully.';
    if (normalizedPath.endsWith('/reject') && normalizedMethod === 'POST') return 'Change request rejected successfully.';
    if (normalizedPath.endsWith('/cancel') && normalizedMethod === 'POST') return 'Change request cancelled successfully.';
    if (normalizedPath.endsWith('/execute') && normalizedMethod === 'POST') return 'Change request marked executed successfully.';
    if (normalizedMethod === 'POST') return 'Change request created successfully.';
    if (normalizedMethod === 'PATCH' || normalizedMethod === 'PUT') return 'Change request saved successfully.';
  }

  const label = platformMutationActionLabel(path, method);

  if (normalizedMethod === 'POST') return `${label} created successfully.`;
  if (normalizedMethod === 'DELETE') return `${label} deleted successfully.`;
  return `${label} saved successfully.`;
}

function dispatchPlatformMutationFeedback(detail: { type: 'success' | 'error'; message: string; requestId?: string }): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PLATFORM_MUTATION_FEEDBACK_EVENT, { detail }));
}

function withPlatformMutationSafetyHeaders(
  path: string,
  options: SafePlatformMutationRequestInit = {}
): RequestInit {
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
    !isPlatformLoginRequest(path) &&
    !isPlatformRefreshRequest(path) &&
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

async function performRequest(
  path: string,
  options: SafePlatformMutationRequestInit = {}
): Promise<Response> {
  const safeOptions = withPlatformMutationSafetyHeaders(path, options);
  const headers = new Headers(safeOptions.headers || {});

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = getPlatformAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return fetch(buildUrl(path), {
    ...safeOptions,
    headers
  });
}

export async function platformApiMutationRequest<T>(
  path: string,
  options: SafePlatformMutationRequestInit = {}
): Promise<T> {
  if (!isWriteRequest(options)) {
    throw new ApiError(
      'platformApiMutationRequest requires POST, PUT, PATCH, or DELETE.',
      0,
      'INVALID_MUTATION_METHOD'
    );
  }

  return platformApiRequest<T>(path, options);
}

export async function platformApiRequest<T>(
  path: string,
  options: SafePlatformMutationRequestInit = {}
): Promise<T> {
  const isLoginRequest = isPlatformLoginRequest(path);
  const isRefreshRequest = isPlatformRefreshRequest(path);
  const requestOptions = withPlatformMutationSafetyHeaders(path, options);
  const method = String(requestOptions.method || options.method || 'GET').toUpperCase();
  const shouldShowMutationFeedback = isWriteRequest(requestOptions) && !isLoginRequest && !isRefreshRequest;

  if (
    !isLoginRequest &&
    !isRefreshRequest &&
    isPlatformAccessTokenExpired(getPlatformAccessToken())
  ) {
    await refreshPlatformAccessToken();
  }

  let response: Response;

  try {
    response = await performRequest(path, requestOptions);
  } catch (error: any) {
    if (shouldShowMutationFeedback) {
      dispatchPlatformMutationFeedback({ type: 'error', message: error?.message || 'Network error while contacting backend' });
    }
    throw new ApiError(error?.message || 'Network error while contacting backend', 0);
  }

  if (response.status === 401 && !isLoginRequest && !isRefreshRequest) {
    const refreshedAccessToken = await refreshPlatformAccessToken();

    if (refreshedAccessToken) {
      try {
        response = await performRequest(path, requestOptions);
      } catch (error: any) {
        if (shouldShowMutationFeedback) {
          dispatchPlatformMutationFeedback({ type: 'error', message: error?.message || 'Network error while contacting backend' });
        }
        throw new ApiError(error?.message || 'Network error while contacting backend', 0);
      }
    }
  }

  try {
    const result = await parseResponse<T>(response);
    if (shouldShowMutationFeedback) {
      dispatchPlatformMutationFeedback({ type: 'success', message: platformMutationSuccessMessage(path, method) });
    }
    return result;
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

    if (shouldShowMutationFeedback) {
      dispatchPlatformMutationFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Platform change failed.',
        requestId: error instanceof ApiError ? error.requestId : undefined
      });
    }

    throw error;
  }
}

export async function platformDownload(path: string, fallbackFilename: string): Promise<void> {
  if (isPlatformAccessTokenExpired(getPlatformAccessToken())) {
    await refreshPlatformAccessToken();
  }

  let response: Response;
  try {
    response = await performRequest(path);
  } catch (error: any) {
    dispatchPlatformMutationFeedback({ type: 'error', message: error?.message || 'Network error while contacting backend' });
    throw new ApiError(error?.message || 'Network error while contacting backend', 0);
  }

  if (response.status === 401) {
    const refreshedAccessToken = await refreshPlatformAccessToken();
    if (refreshedAccessToken) {
      try {
        response = await performRequest(path);
      } catch (error: any) {
        dispatchPlatformMutationFeedback({ type: 'error', message: error?.message || 'Network error while contacting backend' });
        throw new ApiError(error?.message || 'Network error while contacting backend', 0);
      }
    }
  }

  if (!response.ok) {
    try {
      await parseResponse<never>(response);
    } catch (error) {
      dispatchPlatformMutationFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Download failed.',
        requestId: error instanceof ApiError ? error.requestId : undefined
      });
      throw error;
    }
    return;
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('content-disposition') || '';
  const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  const filename = filenameMatch?.[1] || fallbackFilename;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
  dispatchPlatformMutationFeedback({ type: 'success', message: 'Download started successfully.' });
}
