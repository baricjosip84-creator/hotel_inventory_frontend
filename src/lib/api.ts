import { clearAuthTokens, getAccessToken } from './auth';

/**
 * IMPORTANT:
 * In local development we use a relative /api base.
 *
 * Why:
 * - Vite proxies /api -> http://127.0.0.1:3000
 * - No hardcoded LAN IPs
 * - No local CORS mess
 * - Matches your backend route structure: app.use('/api', routes)
 *
 * In deployment, you can override this with VITE_API_BASE_URL
 * if frontend and backend are hosted on different domains.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

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

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers
    });
  } catch (error: any) {
    throw new ApiError(
      error?.message || 'Network error while contacting backend',
      0
    );
  }

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
      // keep raw text if response is not JSON
    }

    if (response.status === 401) {
      clearAuthTokens();
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