import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from './api';
import { getTenantAccessSnapshot } from './tenantAccess';
import { getTenantPermissionSnapshot } from './permissions';

export type OperationalAttentionSurface =
  | 'usage_ledger'
  | 'requisitions'
  | 'execution_tasks'
  | 'reservations'
  | 'purchase_orders'
  | 'shipments'
  | 'outbound'
  | 'inventory_controls';

export type OperationalAttentionItems = {
  surface: OperationalAttentionSurface | string;
  requires_attention: boolean;
  attention_ids?: string[];
  approval_ids?: string[];
  fulfillment_ids?: string[];
  expiration_ids?: string[];
  conflict_reservation_ids?: string[];
  due_receive_ids?: string[];
  ready_finalize_ids?: string[];
  update_order_ids?: string[];
  dispatch_order_ids?: string[];
  return_receive_ids?: string[];
  order_attention_ids?: string[];
  approval_item_keys?: string[];
  supplier_return_approval_ids?: string[];
  cycle_count_reconcile_ids?: string[];
  supplier_return_dispatch_ids?: string[];
  invoice_match_ids?: string[];
  invoice_payment_due_ids?: string[];
};

export function useOperationalAttentionItems(surface: OperationalAttentionSurface, enabled = true) {
  const tenantAccess = getTenantAccessSnapshot();
  const permissionSnapshot = getTenantPermissionSnapshot();
  const identityKey = `${tenantAccess.tenantId || 'no-tenant'}:${tenantAccess.userId || 'no-user'}:${tenantAccess.role}`;
  const permissionKey = permissionSnapshot?.loaded_at || 'no-permission-snapshot';
  const query = useQuery({
    queryKey: ['tenant-sidebar', 'operational-navigation-attention', 'items', surface, identityKey, permissionKey],
    queryFn: () => apiRequest<OperationalAttentionItems>(`/navigation-attention/operational-items/${surface}`),
    enabled: enabled && tenantAccess.hasTenantContext,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const attentionIds = useMemo(() => new Set(query.data?.attention_ids || []), [query.data?.attention_ids]);

  return { ...query, attentionIds };
}
