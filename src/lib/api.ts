import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  saveAuthTokens
} from './auth';
import { TENANT_MUTATION_FEEDBACK_EVENT } from './actionFeedback';

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
  Browser API concurrency guard.

  WHY THIS EXISTS
  ---------------
  Some pages, especially System Context, can mount many read-only panels at the
  same time. Without a client-side guard, the browser can send a large burst of
  authenticated requests to the backend. On small hosted Postgres/Render setups,
  that burst can temporarily exhaust available database connections and produce
  backend errors such as "timeout exceeded when trying to connect".

  This queue keeps the existing API contract unchanged while preventing one page
  load from stampeding the backend/database.
*/
const DEFAULT_API_MAX_CONCURRENT_REQUESTS = 4;
const parsedApiConcurrencyLimit = Number(import.meta.env.VITE_API_MAX_CONCURRENT_REQUESTS ?? DEFAULT_API_MAX_CONCURRENT_REQUESTS);
const API_MAX_CONCURRENT_REQUESTS = Number.isFinite(parsedApiConcurrencyLimit) && parsedApiConcurrencyLimit > 0
  ? Math.floor(parsedApiConcurrencyLimit)
  : DEFAULT_API_MAX_CONCURRENT_REQUESTS;

let activeApiRequests = 0;
const queuedApiRequests: Array<() => void> = [];

function releaseApiRequestSlot(): void {
  activeApiRequests = Math.max(0, activeApiRequests - 1);
  const nextRequest = queuedApiRequests.shift();

  if (nextRequest) {
    nextRequest();
  }
}

async function withApiRequestSlot<T>(operation: () => Promise<T>): Promise<T> {
  if (activeApiRequests >= API_MAX_CONCURRENT_REQUESTS) {
    await new Promise<void>((resolve) => {
      queuedApiRequests.push(resolve);
    });
  }

  activeApiRequests += 1;

  try {
    return await operation();
  } finally {
    releaseApiRequestSlot();
  }
}

/*
  Shared in-flight refresh promise.
  This prevents multiple concurrent 401s from triggering multiple refresh calls
  at the same time.
*/
let refreshPromise: Promise<string | null> | null = null;

type ApiFetchResult = {
  response: Response;
  accessTokenUsed: string | null;
};


function isProductPackageMutationPath(path: string): boolean {
  const normalizedPath = path.toLowerCase();
  return normalizedPath.includes('/products/') && normalizedPath.includes('/packages');
}

function readMutationStringField(body: BodyInit | null | undefined, field: string): string | null {
  if (typeof body !== 'string') return null;

  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    const value = parsed[field];
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

function readMutationAction(body: BodyInit | null | undefined): string | null {
  return readMutationStringField(body, 'action')?.toLowerCase() ?? null;
}

function barcodeLabelCreatedMessage(body: BodyInit | null | undefined): string {
  const barcodeType = readMutationStringField(body, 'barcode_type')?.toUpperCase();
  if (barcodeType === 'QR') return 'QR code label created successfully.';
  if (barcodeType === 'EAN13') return 'EAN-13 label created successfully.';
  return 'Code 128 label created successfully.';
}

function tenantMutationActionLabel(path: string, method: string): string {
  const normalizedPath = path.toLowerCase();
  const normalizedMethod = method.toUpperCase();

  if (isProductPackageMutationPath(normalizedPath)) return 'Package barcode';
  if (normalizedPath.includes('/enterprise-inventory/barcode-labels')) return 'Barcode label';
  if (normalizedPath.includes('/suppliers')) return 'Supplier';
  if (normalizedPath.includes('/products')) return 'Product';
  if (normalizedPath.includes('/users')) return 'User';
  if (normalizedPath.includes('/storage-locations')) return 'Storage location';
  if (normalizedPath.includes('/stock-transfers')) return 'Stock transfer';
  if (normalizedPath.includes('/stock-movements')) return 'Stock movement';
  if (normalizedPath.includes('/stock')) return 'Stock';
  if (normalizedPath.includes('/shipments')) return 'Shipment';
  if (normalizedPath.includes('/inventory-usage')) return 'Usage record';
  if (normalizedPath.includes('/department-requisitions') || normalizedPath.includes('/requisitions')) return 'Requisition';
  if (normalizedPath.includes('/purchase-orders')) return 'Purchase order';
  if (normalizedPath.includes('/alerts')) return 'Alert';
  if (normalizedPath.includes('/automation-schedules')) return 'Automation schedule';
  if (normalizedPath.includes('/execution-requests')) return 'Execution request';
  if (normalizedPath.includes('/reports')) return 'Report action';
  if (normalizedPath.includes('/admin/alerts')) return 'Admin alert action';

  if (normalizedMethod === 'POST') return 'Item';
  if (normalizedMethod === 'PATCH' || normalizedMethod === 'PUT') return 'Changes';
  if (normalizedMethod === 'DELETE') return 'Item';

  return 'Request';
}

function tenantMutationSuccessMessage(path: string, method: string, body?: BodyInit | null): string {
  const normalizedPath = path.toLowerCase();
  const normalizedMethod = method.toUpperCase();

  if (normalizedPath.endsWith('/enterprise-inventory/approvals/execute') && normalizedMethod === 'POST') {
    const action = readMutationAction(body);
    if (action === 'approved') return 'Item approved successfully.';
    if (action === 'rejected') return 'Item rejected successfully.';
    return 'Approval action completed successfully.';
  }

  if (normalizedPath.endsWith('/enterprise-inventory/supplier-catalog') && normalizedMethod === 'POST') {
    return 'Supplier catalog item saved successfully.';
  }

  if (normalizedPath.endsWith('/enterprise-inventory/supplier-invoices') && normalizedMethod === 'POST') {
    return 'Supplier invoice created successfully.';
  }

  if (normalizedPath === '/shipment-items' && normalizedMethod === 'POST') {
    return 'Shipment item added successfully.';
  }

  if (normalizedPath.startsWith('/shipment-items/') && (normalizedMethod === 'PATCH' || normalizedMethod === 'PUT')) {
    return 'Shipment item updated successfully.';
  }

  if (normalizedPath.startsWith('/shipment-items/') && normalizedMethod === 'DELETE') {
    return 'Shipment item deleted successfully.';
  }

  if (normalizedPath.endsWith('/enterprise-inventory/barcode-labels/print-events') && normalizedMethod === 'POST') {
    return 'Barcode label print dialog opened.';
  }

  if (normalizedPath.endsWith('/enterprise-inventory/barcode-labels') && normalizedMethod === 'POST') {
    return barcodeLabelCreatedMessage(body);
  }

  if (normalizedPath.includes('/enterprise-inventory/barcode-labels/') && normalizedMethod === 'DELETE') {
    return 'Barcode label retired successfully.';
  }

  if (normalizedPath.includes('/enterprise-inventory/department-requisitions')) {
    if (normalizedMethod === 'POST') return 'Requisition created successfully.';
    if (normalizedMethod === 'DELETE') return 'Requisition deleted successfully.';
    return 'Requisition saved successfully.';
  }

  if (isProductPackageMutationPath(normalizedPath)) {
    if (normalizedMethod === 'POST') return 'Package barcode created successfully.';
    if (normalizedMethod === 'DELETE') return 'Package barcode deleted successfully.';
    return 'Package barcode updated successfully.';
  }

  if (normalizedPath.includes('/stock-transfers')) {
    if (normalizedMethod === 'POST' && normalizedPath.endsWith('/execute')) return 'Transfer executed successfully.';
    if (normalizedMethod === 'POST' && normalizedPath.endsWith('/cancel')) return 'Transfer cancelled successfully.';
    if (normalizedMethod === 'POST') return 'Transfer draft created successfully.';
    if (normalizedMethod === 'PATCH' || normalizedMethod === 'PUT') return 'Transfer draft updated successfully.';
  }

  if (normalizedPath.includes('/alerts/')) {
    if (normalizedMethod === 'POST' && normalizedPath.endsWith('/acknowledge')) return 'Alert acknowledged successfully.';
    if (normalizedMethod === 'POST' && normalizedPath.endsWith('/escalate')) return 'Alert escalated successfully.';
    if (normalizedMethod === 'POST' && normalizedPath.endsWith('/resolve')) return 'Alert resolved successfully.';
    if (normalizedMethod === 'POST' && normalizedPath.endsWith('/reopen')) return 'Alert reopened successfully.';
  }

  if (normalizedMethod === 'POST' && normalizedPath === '/ai-operations-copilot/runs') {
    return 'AI Copilot run completed successfully.';
  }

  if (normalizedMethod === 'POST' && normalizedPath.includes('/operational-action-center/human-in-loop-ai-reviews/')) {
    if (normalizedPath.endsWith('/decision')) return 'AI review decision recorded successfully.';
    if (normalizedPath.endsWith('/execution-request-draft')) return 'Execution Request draft created successfully.';
  }

  if (normalizedMethod === 'POST' && normalizedPath.includes('/execution-requests/')) {
    if (normalizedPath.endsWith('/submit')) return 'Execution Request submitted successfully.';
    if (normalizedPath.endsWith('/approve')) return 'Execution Request approved successfully.';
    if (normalizedPath.endsWith('/reject')) return 'Execution Request rejected successfully.';
    if (normalizedPath.endsWith('/execute-noop')) return 'Execution Request no-op completed successfully.';
    if (normalizedPath.endsWith('/execute')) return 'Execution Request executed successfully.';
    if (normalizedPath.endsWith('/prepare-retry')) return 'Execution Request retry prepared successfully.';
    if (normalizedPath.endsWith('/cancel')) return 'Execution Request cancelled successfully.';
  }

  if (normalizedMethod === 'POST' && normalizedPath.endsWith('/alerts')) {
    return 'Manual alert created successfully.';
  }

  const label = tenantMutationActionLabel(path, method);

  if (normalizedMethod === 'POST') return `${label} created successfully.`;
  if (normalizedMethod === 'DELETE') return `${label} deleted successfully.`;
  return `${label} saved successfully.`;
}

function tenantMutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'EMAIL_NOT_CONFIGURED') {
      return 'Email is not configured for this server. The record was not changed. Configure backend email settings before using supplier email actions.';
    }

    if (error.code === 'PURCHASE_ORDER_COST_REVIEW_REQUIRED') {
      return 'Commercial cost review is required. Enter positive item costs before submitting or approving this purchase order.';
    }

    if (error.code === 'VALIDATION_SCHEMA_MISSING') {
      return 'This action is temporarily unavailable because backend validation is not configured for this route.';
    }

    return error.message;
  }

  if (error instanceof Error) return error.message;
  return 'Action failed.';
}

function dispatchTenantMutationFeedback(detail: { type: 'success' | 'error'; message: string; requestId?: string }): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TENANT_MUTATION_FEEDBACK_EVENT, { detail }));
}

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
  /**
   * Suppresses the shared success/error toast when the page owns a richer,
   * operation-specific feedback message for this mutation.
   */
  skipMutationFeedback?: boolean;
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

async function performRequest(path: string, options: RequestInit = {}): Promise<ApiFetchResult> {
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

  const response = await withApiRequestSlot(() => fetch(buildUrl(path), {
    ...safeOptions,
    headers
  }));

  return {
    response,
    accessTokenUsed: accessToken || null
  };
}

async function recoverFromUnauthorized(path: string, accessTokenUsed: string | null): Promise<string | null> {
  if (isAuthLoginRequest(path) || isAuthRefreshRequest(path)) {
    return null;
  }

  const currentAccessToken = getAccessToken();

  /*
    A different request may already have refreshed the session after this
    request was sent with an old token. In that case, do not call refresh again;
    just let the caller retry with the newer token already stored in auth.
  */
  if (currentAccessToken && currentAccessToken !== accessTokenUsed) {
    return currentAccessToken;
  }

  return refreshAccessToken();
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
    .split('')
    .filter((character) => {
      const codePoint = character.charCodeAt(0);
      return codePoint >= 32 && codePoint !== 127;
    })
    .join('')
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
    ({ response } = await performRequest(path, { method: 'GET' }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network error while downloading file';
    dispatchTenantMutationFeedback({ type: 'error', message });
    throw new ApiError(message, 0);
  }

  if (response.status === 401 && !isLoginRequest && !isRefreshRequest) {
    const recoveredAccessToken = await recoverFromUnauthorized(path, null);

    if (recoveredAccessToken) {
      try {
        ({ response } = await performRequest(path, { method: 'GET' }));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Network error while downloading file';
        dispatchTenantMutationFeedback({ type: 'error', message });
        throw new ApiError(message, 0);
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

      dispatchTenantMutationFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Download failed.',
        requestId: error instanceof ApiError ? error.requestId : undefined
      });
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

  dispatchTenantMutationFeedback({ type: 'success', message: 'Download started successfully.' });
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
  options: SafeMutationRequestInit = {}
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
  const method = String(requestOptions.method || options.method || 'GET').toUpperCase();
  const shouldShowMutationFeedback =
    isWriteRequest(requestOptions) &&
    !(options as SafeMutationRequestInit).skipMutationFeedback &&
    !isLoginRequest &&
    !isRefreshRequest;
  const currentAccessToken = getAccessToken();

  /*
    If the access token is already expired before the request starts, try a
    silent refresh first for authenticated routes. This reduces avoidable 401s.
  */
  if (!isLoginRequest && !isRefreshRequest && isAccessTokenExpired(currentAccessToken)) {
    await refreshAccessToken();
  }

  let response: Response;
  let accessTokenUsed: string | null = null;

  try {
    ({ response, accessTokenUsed } = await performRequest(path, requestOptions));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network error while contacting backend';
    if (shouldShowMutationFeedback) {
      dispatchTenantMutationFeedback({ type: 'error', message });
    }
    throw new ApiError(message, 0);
  }

  /*
    Retry one time after a 401 by rotating the access token through the refresh
    endpoint. Skip this behavior for login/refresh requests themselves to avoid
    loops.
  */
  if (response.status === 401 && !isLoginRequest && !isRefreshRequest) {
    const recoveredAccessToken = await recoverFromUnauthorized(path, accessTokenUsed);

    if (recoveredAccessToken) {
      try {
        ({ response } = await performRequest(path, requestOptions));
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Network error while contacting backend';
        if (shouldShowMutationFeedback) {
          dispatchTenantMutationFeedback({ type: 'error', message });
        }
        throw new ApiError(message, 0);
      }
    }
  }

  try {
    const result = await parseResponse<T>(response);
    if (shouldShowMutationFeedback) {
      dispatchTenantMutationFeedback({ type: 'success', message: tenantMutationSuccessMessage(path, method, requestOptions.body) });
    }
    return result;
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

    if (shouldShowMutationFeedback) {
      dispatchTenantMutationFeedback({
        type: 'error',
        message: tenantMutationErrorMessage(error),
        requestId: error instanceof ApiError && error.code !== 'EMAIL_NOT_CONFIGURED' ? error.requestId : undefined
      });
    }

    throw error;
  }
}