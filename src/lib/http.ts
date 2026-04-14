/**
 * src/lib/http.ts
 *
 * Compatibility wrapper around apiRequest.
 *
 * Some parts of your frontend may import `http`,
 * others may import `apiRequest`.
 * This keeps both working.
 */

import { apiRequest } from './api';

export async function http<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(path, options);
}