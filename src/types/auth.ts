/**
 * src/types/auth.ts
 *
 * Token shape returned by backend login/refresh routes.
 */

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};