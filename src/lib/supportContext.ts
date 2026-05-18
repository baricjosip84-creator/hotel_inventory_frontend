import { apiRequest } from './api';

export type CurrentSupportContext = {
  active: boolean;
  support_session_id?: string | null;
  tenant_id?: string | null;
  tenant_name?: string | null;
  platform_user_id?: string | null;
  platform_user_email?: string | null;
  platform_user_name?: string | null;
  reason?: string | null;
  expires_at?: string | null;
  effective_role?: string | null;
};

export async function fetchCurrentSupportContext(): Promise<CurrentSupportContext> {
  return apiRequest<CurrentSupportContext>('/support-context/current');
}
