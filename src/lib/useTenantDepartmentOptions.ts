import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './api';

/** One tenant-wide read-only department vocabulary for operational forms. */
export function useTenantDepartmentOptions(enabled = true) {
  return useQuery({
    queryKey: ['tenant-department-options'],
    queryFn: () => apiRequest<string[]>('/enterprise-inventory/department-options'),
    enabled
  });
}
