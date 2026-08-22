import { apiRequest } from './api';

export type TenantAnnouncement = {
  id: string;
  title: string;
  message: string;
  audience: 'tenant' | 'platform' | 'all';
  tenant_id?: string | null;
  severity: 'info' | 'warning' | 'critical';
  starts_at: string;
  ends_at?: string | null;
  dismissible: boolean;
};

export type AnnouncementContext = {
  announcements: TenantAnnouncement[];
  total_current?: number;
  truncated?: boolean;
  evidence_contract?: Record<string, boolean>;
};

export async function fetchAnnouncementContext(): Promise<AnnouncementContext> {
  return apiRequest<AnnouncementContext>('/announcement-context/current');
}
