export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthenticatedSession = {
  accessToken: string;
  refreshToken: string;
};

export type PlatformSessionIdentity = {
  id?: string;
  email?: string;
  name?: string | null;
  role?: string;
  tenantId?: string | null;
  is_active?: boolean;
  created_at?: string;
};
