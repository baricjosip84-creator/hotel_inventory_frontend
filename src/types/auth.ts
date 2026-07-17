export type AuthTokens = {
  accessToken: string;
  csrfToken: string;
  sessionId?: string;
  sessionExpiresAt?: string;
};

export type AuthenticatedSession = AuthTokens;

export type PlatformSessionIdentity = {
  id?: string;
  email?: string;
  name?: string | null;
  role?: string;
  tenantId?: string | null;
  is_active?: boolean;
  created_at?: string;
};
