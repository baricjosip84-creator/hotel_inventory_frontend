import { platformApiRequest } from './platformApi';

export type PlatformCurrentAnnouncement = {
  id: string;
  title: string;
  message: string;
  audience: 'platform' | 'all';
  severity: 'info' | 'warning' | 'critical';
  starts_at: string;
  ends_at?: string | null;
  dismissible: boolean;
};

export type PlatformAnnouncementContext = {
  announcements: PlatformCurrentAnnouncement[];
  total_current?: number;
  truncated?: boolean;
  evidence_contract?: Record<string, boolean>;
};

export async function fetchPlatformAnnouncementContext(): Promise<PlatformAnnouncementContext> {
  return platformApiRequest<PlatformAnnouncementContext>('/platform/announcement-context/current');
}
