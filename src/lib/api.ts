import {
  clearAuthTokens,
  getAccessToken,
  getCsrfToken,
  isAccessTokenExpired,
  isSupportSessionAccess,
  saveAuthTokens,
  saveCsrfToken
} from './auth';
import type { AuthTokens } from '../types/auth';
import { TENANT_MUTATION_FEEDBACK_EVENT } from './actionFeedback';
import { captureApiFailure } from '../observability/runtimeErrorMonitoring';

/**
 * IMPORTANT
 * ---------
 * Local development:
 * - .env uses /api
 * - Vite proxy forwards /api -> local backend
 *
 * Production:
 * - .env.production keeps a safe /api fallback.
 * - deployment configuration may instead provide the reviewed HTTPS API URL.
 * - credentials mode remains enabled for either same-origin or cross-origin
 *   refresh-cookie deployments.
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
let tenantSessionRecoveryFailed = false;

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

  if (normalizedMethod === 'POST' && normalizedPath === '/system-context/snapshots/capture') {
    return 'System Context snapshot captured successfully.';
  }

  if (normalizedMethod === 'POST' && normalizedPath === '/system-context/snapshots/forecast-scenarios/capture') {
    return 'Forecast scenario set captured successfully.';
  }

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

  if (normalizedPath.startsWith('/storage-locations/') && normalizedMethod === 'DELETE') {
    return 'Storage location retired successfully.';
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
    if (normalizedPath.endsWith('/decision')) return 'Intelligence review decision recorded successfully.';
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

function tenantMutationErrorMessage(error: unknown): { message: string; translateMessage: boolean } {
  if (error instanceof ApiError) {
    if (error.code === 'EMAIL_NOT_CONFIGURED') {
      return { message: 'Email is not configured for this server. The record was not changed. Configure backend email settings before using supplier email actions.', translateMessage: true };
    }

    if (error.code === 'PURCHASE_ORDER_COST_REVIEW_REQUIRED') {
      return { message: 'Commercial cost review is required. Enter positive item costs before submitting or approving this purchase order.', translateMessage: true };
    }

    if (error.code === 'VALIDATION_SCHEMA_MISSING') {
      return { message: 'This action is temporarily unavailable because backend validation is not configured for this route.', translateMessage: true };
    }

    return { message: error.message, translateMessage: false };
  }

  if (error instanceof Error) return { message: error.message, translateMessage: false };
  return { message: 'Action failed.', translateMessage: true };
}

function dispatchTenantMutationFeedback(detail: { type: 'success' | 'error'; message: string; requestId?: string; translateMessage?: boolean }): void {
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

export function getVersionConflictMessage(error: unknown, ui?: (englishText: string) => string): string {
  if (isVersionConflictError(error)) {
    const message = 'This record was modified by another operation. Refresh the page data and retry your changes.';
    return ui ? ui(message) : message;
  }

  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return ui ? ui('Unknown request failure.') : 'Unknown request failure.';
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

function isAuthRefreshRequest(path: string): boolean {
  return path === '/auth/refresh' || path === 'auth/refresh';
}

function isAuthCsrfRequest(path: string): boolean {
  return path === '/auth/csrf' || path === 'auth/csrf';
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

/*
  Browser-side logical-mutation idempotency.

  A generated Idempotency-Key already protects the backend from an internal
  auth-refresh retry of one apiRequest call. The remaining operational gap was
  a user double-clicking the same write or manually retrying after the network
  dropped after the server may already have committed the change. A brand-new
  apiRequest call previously generated a brand-new key, so the backend could not
  recognize that retry as the same logical operation.

  We now reuse one key for identical JSON writes while they are in flight and
  retain it briefly only after a network-level uncertain outcome. Any completed
  HTTP response clears the retained key, so a later intentional repeat remains a
  new operation. Explicit caller-provided idempotency keys still take priority.
*/
const MUTATION_UNCERTAINTY_TTL_MS = 10 * 60 * 1000;

type MutationKeyState = {
  key: string;
  count: number;
};

type UncertainMutationKeyState = {
  key: string;
  expiresAt: number;
};

const inFlightMutationKeys = new Map<string, MutationKeyState>();
const uncertainMutationKeys = new Map<string, UncertainMutationKeyState>();

function mutationRequestFingerprint(path: string, options: SafeMutationRequestInit): string | null {
  if (!isWriteRequest(options) || options.skipIdempotencyKey) return null;
  if (isAuthLoginRequest(path) || isAuthRefreshRequest(path)) return null;

  const headers = new Headers(options.headers || {});
  if (options.idempotencyKey || headers.has('Idempotency-Key')) return null;

  // JSON writes are the operational path used throughout the tenant app.
  // Do not guess a fingerprint for FormData, Blob, streams, or other bodies.
  if (options.body !== undefined && typeof options.body !== 'string') return null;

  const method = String(options.method || 'GET').toUpperCase();
  const version = options.version !== undefined
    ? String(options.version)
    : (headers.get('If-Match-Version') || '');

  return `${method}\n${path}\n${version}\n${typeof options.body === 'string' ? options.body : ''}`;
}

function pruneUncertainMutationKeys(now = Date.now()): void {
  for (const [fingerprint, state] of uncertainMutationKeys.entries()) {
    if (state.expiresAt <= now) uncertainMutationKeys.delete(fingerprint);
  }
}

function prepareLogicalMutationKey(
  path: string,
  options: SafeMutationRequestInit
): { options: SafeMutationRequestInit; fingerprint: string | null; key: string | null } {
  const fingerprint = mutationRequestFingerprint(path, options);
  if (!fingerprint) return { options, fingerprint: null, key: null };

  pruneUncertainMutationKeys();

  const inFlight = inFlightMutationKeys.get(fingerprint);
  const uncertain = uncertainMutationKeys.get(fingerprint);
  const key = inFlight?.key || uncertain?.key || createIdempotencyKey();

  if (inFlight) {
    inFlight.count += 1;
  } else {
    inFlightMutationKeys.set(fingerprint, { key, count: 1 });
  }

  return {
    options: { ...options, idempotencyKey: key },
    fingerprint,
    key
  };
}

function releaseInFlightMutationKey(fingerprint: string | null, key: string | null): void {
  if (!fingerprint || !key) return;
  const current = inFlightMutationKeys.get(fingerprint);
  if (!current || current.key !== key) return;

  current.count -= 1;
  if (current.count <= 0) inFlightMutationKeys.delete(fingerprint);
}

function markMutationOutcomeDefinite(fingerprint: string | null, key: string | null): void {
  releaseInFlightMutationKey(fingerprint, key);
  if (!fingerprint || !key) return;
  const uncertain = uncertainMutationKeys.get(fingerprint);
  if (uncertain?.key === key) uncertainMutationKeys.delete(fingerprint);
}

function markMutationOutcomeUncertain(fingerprint: string | null, key: string | null): void {
  releaseInFlightMutationKey(fingerprint, key);
  if (!fingerprint || !key) return;
  uncertainMutationKeys.set(fingerprint, {
    key,
    expiresAt: Date.now() + MUTATION_UNCERTAINTY_TTL_MS
  });
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

type BrowserLockManager = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

function browserLockManager(): BrowserLockManager | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { locks?: BrowserLockManager }).locks || null;
}

async function fetchTenantCsrfToken(): Promise<string | null> {
  const response = await fetch(buildUrl('/auth/csrf'), {
    method: 'GET',
    credentials: 'include'
  });

  const payload = await parseResponse<{ csrfToken: string }>(response);
  if (!payload.csrfToken) return null;
  saveCsrfToken(payload.csrfToken);
  return payload.csrfToken;
}

async function performTenantRefresh(expectedAccessToken: string | null): Promise<string | null> {
  if (isSupportSessionAccess()) {
    clearAuthTokens();
    return null;
  }

  const currentAccessToken = getAccessToken();
  if (
    currentAccessToken &&
    !isAccessTokenExpired(currentAccessToken) &&
    currentAccessToken !== expectedAccessToken
  ) {
    return currentAccessToken;
  }

  let csrfToken = getCsrfToken();
  if (!csrfToken) {
    csrfToken = await fetchTenantCsrfToken();
  }

  if (!csrfToken) {
    clearAuthTokens();
    return null;
  }

  const sendRefresh = (token: string) => fetch(buildUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'X-CSRF-Token': token
    }
  });

  let response = await sendRefresh(csrfToken);

  if (response.status === 403) {
    localStorage.removeItem('inventory_csrf_token');
    const bootstrappedToken = await fetchTenantCsrfToken();
    if (bootstrappedToken) {
      response = await sendRefresh(bootstrappedToken);
    }
  }

  const tokens = await parseResponse<AuthTokens>(response);
  saveAuthTokens(tokens);
  tenantSessionRecoveryFailed = false;
  return tokens.accessToken;
}

async function refreshAccessToken(expectedAccessToken: string | null = getAccessToken()): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const locks = browserLockManager();
        if (locks) {
          return await locks.request(
            'inventory-tenant-refresh',
            () => performTenantRefresh(expectedAccessToken)
          );
        }
        return await performTenantRefresh(expectedAccessToken);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearAuthTokens();
          tenantSessionRecoveryFailed = true;
        }
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function restoreTenantSession(): Promise<string | null> {
  const accessToken = getAccessToken();
  if (accessToken && !isAccessTokenExpired(accessToken)) {
    return accessToken;
  }
  return refreshAccessToken(accessToken);
}

export async function logoutTenantSession(): Promise<void> {
  try {
    let csrfToken = getCsrfToken();
    if (!csrfToken) {
      try {
        csrfToken = await fetchTenantCsrfToken();
      } catch {
        csrfToken = null;
      }
    }

    if (csrfToken) {
      await fetch(buildUrl('/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
    }
  } finally {
    clearAuthTokens();
  }
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
    credentials: 'include',
    headers
  }));

  return {
    response,
    accessTokenUsed: accessToken || null
  };
}

async function recoverFromUnauthorized(path: string, accessTokenUsed: string | null): Promise<string | null> {
  if (isAuthLoginRequest(path) || isAuthRefreshRequest(path) || isAuthCsrfRequest(path)) {
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

  return refreshAccessToken(accessTokenUsed);
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
  const isCsrfRequest = isAuthCsrfRequest(path);
  const currentAccessToken = getAccessToken();
  if (currentAccessToken && !isAccessTokenExpired(currentAccessToken)) tenantSessionRecoveryFailed = false;

  if (!isLoginRequest && !isRefreshRequest && !isCsrfRequest && isAccessTokenExpired(currentAccessToken)) {
    const recovered = tenantSessionRecoveryFailed ? null : await refreshAccessToken(currentAccessToken);
    if (!recovered) {
      clearAuthTokens();
      tenantSessionRecoveryFailed = true;
      redirectToLoginAfterExpiredSession();
      throw new ApiError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }
  }

  let response: Response;
  let accessTokenUsed: string | null = null;

  try {
    ({ response, accessTokenUsed } = await performRequest(path, { method: 'GET' }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Network error while downloading file';
    dispatchTenantMutationFeedback({ type: 'error', message, translateMessage: !(error instanceof Error) });
    throw new ApiError(message, 0);
  }

  if (response.status === 401 && !isLoginRequest && !isRefreshRequest && !isCsrfRequest) {
    const recoveredAccessToken = await recoverFromUnauthorized(path, accessTokenUsed);

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
        !isRefreshRequest &&
        !isCsrfRequest
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

    Authentication hardening in this release additionally keeps refresh tokens
    cookie-only, coordinates rotation across tabs, and forces a real refresh
    after a request fails with the exact access token it used.

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
  const isCsrfRequest = isAuthCsrfRequest(path);
  const logicalMutation = prepareLogicalMutationKey(path, options as SafeMutationRequestInit);
  const requestOptions = withMutationSafetyHeaders(path, logicalMutation.options);
  const method = String(requestOptions.method || options.method || 'GET').toUpperCase();
  const shouldShowMutationFeedback =
    isWriteRequest(requestOptions) &&
    !(options as SafeMutationRequestInit).skipMutationFeedback &&
    !isLoginRequest &&
    !isRefreshRequest &&
    !isCsrfRequest;
  const currentAccessToken = getAccessToken();
  if (currentAccessToken && !isAccessTokenExpired(currentAccessToken)) tenantSessionRecoveryFailed = false;

  /*
    If the access token is already expired before the request starts, try a
    silent refresh first for authenticated routes. This reduces avoidable 401s.
  */
  if (!isLoginRequest && !isRefreshRequest && !isCsrfRequest && isAccessTokenExpired(currentAccessToken)) {
    const recovered = tenantSessionRecoveryFailed ? null : await refreshAccessToken(currentAccessToken);
    if (!recovered) {
      markMutationOutcomeDefinite(logicalMutation.fingerprint, logicalMutation.key);
      clearAuthTokens();
      tenantSessionRecoveryFailed = true;
      redirectToLoginAfterExpiredSession();
      throw new ApiError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');
    }
  }

  let response: Response;
  let accessTokenUsed: string | null = null;

  try {
    ({ response, accessTokenUsed } = await performRequest(path, requestOptions));
  } catch (error: unknown) {
    markMutationOutcomeUncertain(logicalMutation.fingerprint, logicalMutation.key);
    const message = error instanceof Error ? error.message : 'Network error while contacting backend';
    captureApiFailure({ area: 'tenant', path, method, status: 0, error });
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
  if (response.status === 401 && !isLoginRequest && !isRefreshRequest && !isCsrfRequest) {
    const recoveredAccessToken = await recoverFromUnauthorized(path, accessTokenUsed);

    if (recoveredAccessToken) {
      try {
        ({ response } = await performRequest(path, requestOptions));
      } catch (error: unknown) {
        markMutationOutcomeUncertain(logicalMutation.fingerprint, logicalMutation.key);
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
    markMutationOutcomeDefinite(logicalMutation.fingerprint, logicalMutation.key);
    if (shouldShowMutationFeedback) {
      dispatchTenantMutationFeedback({ type: 'success', message: tenantMutationSuccessMessage(path, method, requestOptions.body), translateMessage: true });
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) {
      markMutationOutcomeDefinite(logicalMutation.fingerprint, logicalMutation.key);
    } else {
      markMutationOutcomeUncertain(logicalMutation.fingerprint, logicalMutation.key);
    }

    captureApiFailure({
      area: 'tenant',
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
      !isRefreshRequest
    ) {
      clearAuthTokens();
      redirectToLoginAfterExpiredSession();
    }

    if (shouldShowMutationFeedback) {
      const mutationFeedback = tenantMutationErrorMessage(error);
      dispatchTenantMutationFeedback({
        type: 'error',
        message: mutationFeedback.message,
        translateMessage: mutationFeedback.translateMessage,
        requestId: error instanceof ApiError && error.code !== 'EMAIL_NOT_CONFIGURED' ? error.requestId : undefined
      });
    }

    throw error;
  }
}