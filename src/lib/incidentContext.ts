import { apiRequest } from './api';

export type IncidentContextItem = {
  id: string;
  title: string;
  summary?: string | null;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'cancelled';
  severity: 'minor' | 'major' | 'critical';
  impact: 'none' | 'degraded' | 'partial_outage' | 'major_outage';
  scope: 'platform' | 'tenant';
  tenant_id?: string | null;
  started_at: string;
  resolved_at?: string | null;
  public_message?: string | null;
  updates?: Array<{ status: string; message: string; created_at: string }>;
};

export type IncidentContext = { incidents: IncidentContextItem[] };

export function fetchIncidentContext(): Promise<IncidentContext> {
  return apiRequest<IncidentContext>('/incident-context/current');
}
