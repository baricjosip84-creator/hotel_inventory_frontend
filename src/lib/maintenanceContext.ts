import { apiRequest } from './api';

export type MaintenanceWindow = {
  id: string;
  title: string;
  message?: string | null;
  scope: 'platform' | 'tenant';
  tenant_id?: string | null;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  lock_writes: boolean;
};

export type MaintenanceContext = {
  active: MaintenanceWindow[];
  upcoming: MaintenanceWindow[];
};

export async function fetchMaintenanceContext(): Promise<MaintenanceContext> {
  return apiRequest<MaintenanceContext>('/maintenance-context/current');
}
