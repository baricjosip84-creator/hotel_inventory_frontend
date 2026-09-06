import { apiRequest } from '../../lib/api';
import type {
  ProductCostHistoryItem,
  ProductCostHistoryResponse,
  ProductStandardCostHistoryItem,
  ProductStandardCostHistoryResponse
} from '../../types/inventory';

export type CostHistoryFilterState = {
  costSource: string;
  costFrom: string;
  costTo: string;
};

type CostHistoryPaging = {
  limit?: number;
  offset?: number;
};

export async function fetchProductCostHistory(
  productId: string,
  filters: CostHistoryFilterState,
  paging: CostHistoryPaging = {}
): Promise<ProductCostHistoryResponse> {
  const params = new URLSearchParams({
    limit: String(paging.limit ?? 50),
    offset: String(paging.offset ?? 0)
  });

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

export async function fetchProductStandardCostHistory(
  productId: string,
  paging: CostHistoryPaging = {}
): Promise<ProductStandardCostHistoryResponse> {
  const params = new URLSearchParams({
    limit: String(paging.limit ?? 50),
    offset: String(paging.offset ?? 0)
  });
  return apiRequest<ProductStandardCostHistoryResponse>(`/products/${productId}/standard-cost-history?${params.toString()}`);
}

export async function fetchAllProductCostHistory(
  productId: string,
  filters: CostHistoryFilterState
): Promise<ProductCostHistoryItem[]> {
  const rows: ProductCostHistoryItem[] = [];
  let offset = 0;

  for (;;) {
    const page = await fetchProductCostHistory(productId, filters, { limit: 100, offset });
    rows.push(...page.cost_history);
    if (!page.pagination?.has_more) break;
    offset += page.cost_history.length;
    if (page.cost_history.length === 0) break;
  }

  return rows;
}

export async function fetchAllProductStandardCostHistory(
  productId: string
): Promise<ProductStandardCostHistoryItem[]> {
  const rows: ProductStandardCostHistoryItem[] = [];
  let offset = 0;

  for (;;) {
    const page = await fetchProductStandardCostHistory(productId, { limit: 500, offset });
    rows.push(...page.standard_cost_history);
    if (!page.pagination?.has_more) break;
    offset += page.standard_cost_history.length;
    if (page.standard_cost_history.length === 0) break;
  }

  return rows;
}
