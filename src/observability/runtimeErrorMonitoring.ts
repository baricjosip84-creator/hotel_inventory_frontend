import * as Sentry from '@sentry/react';

const REDACTED = '[REDACTED]';
const SENSITIVE_KEY = /(authorization|cookie|csrf|password|secret|token|api[_-]?key|email|phone|address)/i;
const RELEASE = typeof __APP_RELEASE__ === 'string' && __APP_RELEASE__ ? __APP_RELEASE__ : 'unknown';
let initialized = false;
let enabled = false;
let activeArea: 'tenant' | 'platform' | 'public' = 'public';

declare const __APP_RELEASE__: string | null;

type IdentityContext = {
  area: 'tenant' | 'platform' | 'public';
  userId?: string | null;
  tenantId?: string | null;
  role?: string | null;
  supportSession?: boolean;
};

type ApiFailureContext = {
  area: 'tenant' | 'platform';
  path: string;
  method: string;
  status: number;
  code?: string;
  requestId?: string;
  error: unknown;
};

function readRate(value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 50).map((entry) => sanitize(entry, depth + 1));
  if (!value || typeof value !== 'object') return value;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, entry]) => {
    result[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitize(entry, depth + 1);
    return result;
  }, {});
}

function stripQueryString(value: string | undefined): string | undefined {
  if (!value) return value;
  try {
    const parsed = new URL(value, window.location.origin);
    parsed.search = '';
    parsed.hash = '';
    return parsed.origin === window.location.origin ? parsed.pathname : parsed.toString();
  } catch {
    return value.split('?')[0].split('#')[0];
  }
}

function beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (event.request) {
    event.request.url = stripQueryString(event.request.url);
    event.request.query_string = undefined;
    event.request.cookies = undefined;
    event.request.data = undefined;
    event.request.headers = sanitize(event.request.headers) as Record<string, string>;
  }

  if (event.user) event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  event.extra = sanitize(event.extra) as Record<string, unknown>;
  event.contexts = sanitize(event.contexts) as Sentry.Event['contexts'];
  return event;
}

function apiOrigin(): string | RegExp {
  const base = import.meta.env.VITE_API_BASE_URL || '/api';
  if (base.startsWith('http')) {
    try {
      return new URL(base).origin;
    } catch {
      return /^https:\/\//;
    }
  }
  return window.location.origin;
}

export function initializeRuntimeErrorMonitoring(): boolean {
  if (initialized) return enabled;
  initialized = true;

  const dsn = String(import.meta.env.VITE_SENTRY_DSN || '').trim();
  enabled = Boolean(dsn);
  if (!enabled) return false;

  Sentry.init({
    dsn,
    enabled: true,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: RELEASE,
    sendDefaultPii: false,
    tracesSampleRate: readRate(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.05),
    tracePropagationTargets: [window.location.origin, apiOrigin()],
    integrations: [Sentry.browserTracingIntegration()],
    beforeSend
  });

  Sentry.setTag('service', 'hotel-inventory-frontend');
  Sentry.setTag('release_commit', RELEASE);
  return true;
}

export function isRuntimeErrorMonitoringEnabled(): boolean {
  return enabled;
}

export function setRuntimeIdentity(identity: IdentityContext): void {
  activeArea = identity.area;
  if (!enabled) return;

  Sentry.setTag('app_area', identity.area);
  Sentry.setTag('tenant_id', identity.tenantId || 'none');
  Sentry.setTag('role', identity.role || 'unknown');
  Sentry.setTag('support_session', identity.supportSession ? 'true' : 'false');
  Sentry.setUser(identity.userId ? { id: identity.userId } : null);
}

export function clearRuntimeIdentity(area?: 'tenant' | 'platform'): void {
  if (area && activeArea !== area) return;
  activeArea = 'public';
  if (!enabled) return;
  Sentry.setUser(null);
  Sentry.setTag('app_area', 'public');
  Sentry.setTag('tenant_id', 'none');
  Sentry.setTag('role', 'unknown');
  Sentry.setTag('support_session', 'false');
}

export function captureApiFailure(context: ApiFailureContext): void {
  if (!enabled) return;
  if (context.status > 0 && context.status < 500) return;
  if (context.status === 0 && typeof navigator !== 'undefined' && navigator.onLine === false) return;

  const exception = context.error instanceof Error
    ? context.error
    : new Error(context.status === 0 ? 'Backend network request failed' : `Backend request failed with status ${context.status}`);

  Sentry.withScope((scope) => {
    scope.setLevel('error');
    scope.setTag('app_area', context.area);
    scope.setTag('api_status', String(context.status));
    scope.setTag('api_code', context.code || 'unknown');
    scope.setTag('request_id', context.requestId || 'none');
    scope.setFingerprint(['api-failure', context.area, context.method, stripQueryString(context.path) || context.path, String(context.status)]);
    scope.setContext('api_request', {
      method: context.method,
      path: stripQueryString(context.path),
      status: context.status,
      code: context.code || null,
      request_id: context.requestId || null
    });
    Sentry.captureException(exception);
  });
}

export const reactErrorHandler = Sentry.reactErrorHandler;
export const RuntimeErrorBoundary = Sentry.ErrorBoundary;
export { sanitize, stripQueryString, beforeSend };
