import { apiRequest } from '../../lib/api';
import type {
  ProductCostHistoryResponse,
  ProductStandardCostHistoryResponse
} from '../../types/inventory';

export type CostHistoryFilterState = {
  costSource: string;
  costFrom: string;
  costTo: string;
};

export async function fetchProductCostHistory(
  productId: string,
  filters: CostHistoryFilterState
): Promise<ProductCostHistoryResponse> {
  const params = new URLSearchParams({ limit: '50' });

  if (filters.costSource.trim()) {
    params.set('cost_source', filters.costSource.trim());
  }

  if (filters.costFrom) {
    params.set('cost_from', filters.costFrom);
  }

  if (filters.costTo) {
    params.set('cost_to', filters.costTo);
  }

  return apiRequest<ProductCostHistoryResponse>(`/products/${productId}/cost-history?${params.toString()}`);
}

export async function fetchProductStandardCostHistory(productId: string): Promise<ProductStandardCostHistoryResponse> {
  return apiRequest<ProductStandardCostHistoryResponse>(`/products/${productId}/standard-cost-history?limit=50`);
}
