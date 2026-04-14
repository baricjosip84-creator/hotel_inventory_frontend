/**
 * src/lib/auth.ts
 *
 * PURPOSE
 * -------
 * Central token storage for the frontend.
 *
 * IMPORTANT
 * ---------
 * This file intentionally exports MULTIPLE helper names so it stays compatible
 * with the rest of your existing frontend code, including pages/components that
 * may already import:
 * - saveAuthTokens
 * - getAccessToken
 * - getRefreshToken
 * - clearAuthTokens
 * - clearAuth
 * - isAuthenticated
 */

import type { AuthTokens } from '../types/auth';

const ACCESS_TOKEN_KEY = 'inventory_access_token';
const REFRESH_TOKEN_KEY = 'inventory_refresh_token';

/*
  Save both tokens after login / refresh.
*/
export function saveAuthTokens(tokens: AuthTokens): void {
  if (tokens.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  }

  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

/*
  Read current access token.
*/
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/*
  Read current refresh token.
*/
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/*
  Clear all auth tokens.
*/
export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/*
  Backward-compatible alias.
*/
export function clearAuth(): void {
  clearAuthTokens();
}

/*
  Basic auth presence check.
*/
export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}