import type { AuthTokens } from '../types/auth';
import { PLATFORM_MUTATION_FEEDBACK_EVENT } from './actionFeedback';
import { captureApiFailure } from '../observability/runtimeErrorMonitoring';
import { ApiError } from './api';
import {
  clearPlatformAuthTokens,
  getPlatformAccessToken,
  getPlatformCsrfToken,
  isPlatformAccessTokenExpired,
  savePlatformAuthTokens,
  savePlatformCsrfToken
} from './platformAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
let refreshPromise: Promise<string | null> | null = null;

type PlatformApiFetchResult = {
  response: Response;
  accessTokenUsed: string | null;
};

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
   * When omitted, the shared API layer keeps one key for identical in-flight
   * writes and briefly retains it after an uncertain network outcome so a
   * manual retry cannot repeat a committed platform operation.
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
  /** Suppress the shared generic mutation toast when a page owns specific feedback. */
  skipMutationFeedback?: boolean;
};

export type SafePlatformMutationRequestInit = RequestInit & PlatformMutationSafetyOptions;

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function isPlatformRefreshRequest(path: string): boolean {
  return path === '/platform/auth/refresh' || path === 'platform/auth/refresh';
}

function isPlatformCsrfRequest(path: string): boolean {
  return path === '/platform/auth/csrf' || path === 'platform/auth/csrf';
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

/*
  Platform logical-mutation idempotency.

  The backend already accepts Idempotency-Key, but a fresh platformApiRequest
  call used to generate a fresh key. If an admin repeated an action after the
  network dropped after the server committed it, the retry could therefore be
  treated as a new write. Identical JSON writes now share one key while they are
  in flight and retain it only after an uncertain network-level outcome. Any
  completed HTTP response clears the retained key so a later intentional repeat
  remains a new operation.
*/
const PLATFORM_MUTATION_UNCERTAINTY_TTL_MS = 10 * 60 * 1000;

type PlatformMutationKeyState = {
  key: string;
  count: number;
};

type PlatformUncertainMutationKeyState = {
  key: string;
  expiresAt: number;
};

const inFlightPlatformMutationKeys = new Map<string, PlatformMutationKeyState>();
const uncertainPlatformMutationKeys = new Map<string, PlatformUncertainMutationKeyState>();

function platformMutationRequestFingerprint(
  path: string,
  options: SafePlatformMutationRequestInit
): string | null {
  if (!isWriteRequest(options) || options.skipIdempotencyKey) return null;
  if (isPlatformLoginRequest(path) || isPlatformRefreshRequest(path)) return null;

  const headers = new Headers(options.headers || {});
  if (options.idempotencyKey || headers.has('Idempotency-Key')) return null;

  // Platform writes are JSON today. Do not guess for FormData/Blob/streams.
  if (options.body !== undefined && typeof options.body !== 'string') return null;

  const method = String(options.method || 'GET').toUpperCase();
  const version = options.version !== undefined
    ? String(options.version)
    : (headers.get('If-Match-Version') || '');

  return `${method}\n${path}\n${version}\n${typeof options.body === 'string' ? options.body : ''}`;
}

function pruneUncertainPlatformMutationKeys(now = Date.now()): void {
  for (const [fingerprint, state] of uncertainPlatformMutationKeys.entries()) {
    if (state.expiresAt <= now) uncertainPlatformMutationKeys.delete(fingerprint);
  }
}

function preparePlatformLogicalMutationKey(
  path: string,
  options: SafePlatformMutationRequestInit
): { options: SafePlatformMutationRequestInit; fingerprint: string | null; key: string | null } {
  const fingerprint = platformMutationRequestFingerprint(path, options);
  if (!fingerprint) return { options, fingerprint: null, key: null };

  pruneUncertainPlatformMutationKeys();

  const inFlight = inFlightPlatformMutationKeys.get(fingerprint);
  const uncertain = uncertainPlatformMutationKeys.get(fingerprint);
  const key = inFlight?.key || uncertain?.key || createIdempotencyKey();

  if (inFlight) {
    inFlight.count += 1;
  } else {
    inFlightPlatformMutationKeys.set(fingerprint, { key, count: 1 });
  }

  return {
    options: { ...options, idempotencyKey: key },
    fingerprint,
    key
  };
}

function releaseInFlightPlatformMutationKey(fingerprint: string | null, key: string | null): void {
  if (!fingerprint || !key) return;
  const current = inFlightPlatformMutationKeys.get(fingerprint);
  if (!current || current.key !== key) return;

  current.count -= 1;
  if (current.count <= 0) inFlightPlatformMutationKeys.delete(fingerprint);
}

function markPlatformMutationOutcomeDefinite(fingerprint: string | null, key: string | null): void {
  releaseInFlightPlatformMutationKey(fingerprint, key);
  if (!fingerprint || !key) return;
  const uncertain = uncertainPlatformMutationKeys.get(fingerprint);
  if (uncertain?.key === key) uncertainPlatformMutationKeys.delete(fingerprint);
}

function markPlatformMutationOutcomeUncertain(fingerprint: string | null, key: string | null): void {
  releaseInFlightPlatformMutationKey(fingerprint, key);
  if (!fingerprint || !key) return;
  uncertainPlatformMutationKeys.set(fingerprint, {
    key,
    expiresAt: Date.now() + PLATFORM_MUTATION_UNCERTAINTY_TTL_MS
  });
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

  if (normalizedPath === '/platform/notifications/integration-monitoring-scan' && normalizedMethod === 'POST') {
    return 'Integration monitoring scan completed successfully.';
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

function platformNetworkErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function withPlatformMutationSafetyHeaders(
  path: string,
  options: SafePlatformMutationRequestInit = {}
): RequestInit {
  const {
    idempotencyKey,
    version,
    skipIdempotencyKey,
    skipMutationFeedback: _skipMutationFeedback,
    headers: originalHeaders,
    ...requestOptions
  } = options;

  void _skipMutationFeedback;

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

type BrowserLockManager = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

function browserLockManager(): BrowserLockManager | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { locks?: BrowserLockManager }).locks || null;
}

async function fetchPlatformCsrfToken(): Promise<string | null> {
  const response = await fetch(buildUrl('/platform/auth/csrf'), {
    method: 'GET',
    credentials: 'include'
  });

  const payload = await parseResponse<{ csrfToken: string }>(response);
  if (!payload.csrfToken) return null;
  savePlatformCsrfToken(payload.csrfToken);
  return payload.csrfToken;
}

async function performPlatformRefresh(expectedAccessToken: string | null): Promise<string | null> {
  const currentAccessToken = getPlatformAccessToken();
  if (
    currentAccessToken &&
    !isPlatformAccessTokenExpired(currentAccessToken) &&
    currentAccessToken !== expectedAccessToken
  ) {
    return currentAccessToken;
  }

  let csrfToken = getPlatformCsrfToken();
  if (!csrfToken) {
    csrfToken = await fetchPlatformCsrfToken();
  }

  if (!csrfToken) {
    clearPlatformAuthTokens();
    return null;
  }

  const sendRefresh = (token: string) => fetch(buildUrl('/platform/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRF-Token': token
    }
  });

  let response = await sendRefresh(csrfToken);

  if (response.status === 403) {
    localStorage.removeItem('inventory_platform_csrf_token');
    const bootstrappedToken = await fetchPlatformCsrfToken();
    if (bootstrappedToken) {
      response = await sendRefresh(bootstrappedToken);
    }
  }

  const tokens = await parseResponse<AuthTokens>(response);
  savePlatformAuthTokens(tokens);
  return tokens.accessToken;
}

async function refreshPlatformAccessToken(
  expectedAccessToken: string | null = getPlatformAccessToken()
): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const locks = browserLockManager();
        if (locks) {
          return await locks.request(
            'inventory-platform-refresh',
            () => performPlatformRefresh(expectedAccessToken)
          );
        }
        return await performPlatformRefresh(expectedAccessToken);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearPlatformAuthTokens();
        }
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function restorePlatformSession(): Promise<string | null> {
  const accessToken = getPlatformAccessToken();
  if (accessToken && !isPlatformAccessTokenExpired(accessToken)) {
    return accessToken;
  }
  return refreshPlatformAccessToken(accessToken);
}

async function performRequest(
  path: string,
  options: SafePlatformMutationRequestInit = {}
): Promise<PlatformApiFetchResult> {
  const safeOptions = withPlatformMutationSafetyHeaders(path, options);
  const headers = new Headers(safeOptions.headers || {});

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = getPlatformAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(buildUrl(path), {
    ...safeOptions,
    credentials: 'include',
    headers
  });

  return {
    response,
    accessTokenUsed: accessToken || null
  };
}

async function recoverPlatformFromUnauthorized(accessTokenUsed: string | null): Promise<string | null> {
  const currentAccessToken = getPlatformAccessToken();

  if (currentAccessToken && currentAccessToken !== accessTokenUsed) {
    return currentAccessToken;
  }

  return refreshPlatformAccessToken(accessTokenUsed);
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
  const isCsrfRequest = isPlatformCsrfRequest(path);
  const logicalMutation = preparePlatformLogicalMutationKey(path, options);
  const requestOptions = withPlatformMutationSafetyHeaders(path, logicalMutation.options);
  const method = String(requestOptions.method || options.method || 'GET').toUpperCase();
  const shouldShowMutationFeedback = isWriteRequest(requestOptions) && !isLoginRequest && !isRefreshRequest && !isCsrfRequest && !options.skipMutationFeedback;

  const currentAccessToken = getPlatformAccessToken();

  if (
    !isLoginRequest &&
    !isRefreshRequest &&
    !isCsrfRequest &&
    isPlatformAccessTokenExpired(currentAccessToken)
  ) {
    await refreshPlatformAccessToken(currentAccessToken);
  }

  let response: Response;
  let accessTokenUsed: string | null = null;

  try {
    ({ response, accessTokenUsed } = await performRequest(path, requestOptions));
  } catch (error: unknown) {
    markPlatformMutationOutcomeUncertain(logicalMutation.fingerprint, logicalMutation.key);
    const message = platformNetworkErrorMessage(error, 'Network error while contacting backend');
    captureApiFailure({ area: 'platform', path, method, status: 0, error });
    if (shouldShowMutationFeedback) {
      dispatchPlatformMutationFeedback({ type: 'error', message });
    }
    throw new ApiError(message, 0);
  }

  if (response.status === 401 && !isLoginRequest && !isRefreshRequest && !isCsrfRequest) {
    const refreshedAccessToken = await recoverPlatformFromUnauthorized(accessTokenUsed);

    if (refreshedAccessToken) {
      try {
        ({ response } = await performRequest(path, requestOptions));
      } catch (error: unknown) {
        markPlatformMutationOutcomeUncertain(logicalMutation.fingerprint, logicalMutation.key);
        const message = platformNetworkErrorMessage(error, 'Network error while contacting backend');
        if (shouldShowMutationFeedback) {
          dispatchPlatformMutationFeedback({ type: 'error', message });
        }
        throw new ApiError(message, 0);
      }
    }
  }

  try {
    const result = await parseResponse<T>(response);
    markPlatformMutationOutcomeDefinite(logicalMutation.fingerprint, logicalMutation.key);
    if (shouldShowMutationFeedback) {
      dispatchPlatformMutationFeedback({ type: 'success', message: platformMutationSuccessMessage(path, method) });
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      markPlatformMutationOutcomeDefinite(logicalMutation.fingerprint, logicalMutation.key);
    } else {
      markPlatformMutationOutcomeUncertain(logicalMutation.fingerprint, logicalMutation.key);
    }

    captureApiFailure({
      area: 'platform',
      path,
      method,
      status: error instanceof ApiError ? error.status : response.status,
      code: error instanceof ApiError ? error.code : undefined,
      requestId: error instanceof ApiError ? error.requestId : undefined,
      error
    });

    if (
      error instanceof ApiError &&
      error.status === 401 &&
      !isLoginRequest &&
      !isRefreshRequest &&
      !isCsrfRequest
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
  const currentAccessToken = getPlatformAccessToken();
  if (isPlatformAccessTokenExpired(currentAccessToken)) {
    await refreshPlatformAccessToken(currentAccessToken);
  }

  let response: Response;
  let accessTokenUsed: string | null = null;
  try {
    ({ response, accessTokenUsed } = await performRequest(path));
  } catch (error: unknown) {
    const message = platformNetworkErrorMessage(error, 'Network error while contacting backend');
    dispatchPlatformMutationFeedback({ type: 'error', message });
    throw new ApiError(message, 0);
  }

  if (response.status === 401) {
    const refreshedAccessToken = await recoverPlatformFromUnauthorized(accessTokenUsed);
    if (refreshedAccessToken) {
      try {
        ({ response } = await performRequest(path));
      } catch (error: unknown) {
        const message = platformNetworkErrorMessage(error, 'Network error while contacting backend');
        dispatchPlatformMutationFeedback({ type: 'error', message });
        throw new ApiError(message, 0);
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
