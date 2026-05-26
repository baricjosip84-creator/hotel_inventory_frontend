import { apiRequest } from '../../lib/api';
import type {
  ProductCostRiskDetailsResponse,
  ProductCostRiskSummaryResponse,
  ProductCostValuationDetailsResponse,
  ProductCostValuationSummaryResponse
} from '../../types/inventory';

export type CostValuationDetailFilterState = {
  valuationBasis: string;
  search: string;
  sort: string;
  direction: string;
};

export type CostRiskDetailFilterState = {
  riskType: string;
  search: string;
  sort: string;
  direction: string;
};

export async function fetchProductCostValuationSummary(): Promise<ProductCostValuationSummaryResponse> {
  return apiRequest<ProductCostValuationSummaryResponse>(
    '/products/cost-valuation-summary?limit=8'
  );
}

export async function fetchProductCostValuationDetails(
  filters: CostValuationDetailFilterState
): Promise<ProductCostValuationDetailsResponse> {
  const params = new URLSearchParams({
    limit: '20',
    sort: filters.sort,
    direction: filters.direction
  });

  if (filters.valuationBasis.trim()) {
    params.set('valuation_basis', filters.valuationBasis.trim());
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  return apiRequest<ProductCostValuationDetailsResponse>(`/products/cost-valuation-details?${params.toString()}`);
}

export async function fetchProductCostRiskSummary(): Promise<ProductCostRiskSummaryResponse> {
  return apiRequest<ProductCostRiskSummaryResponse>(
    '/products/cost-risk-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

export async function fetchProductCostRiskDetails(
  filters: CostRiskDetailFilterState
): Promise<ProductCostRiskDetailsResponse> {
  const params = new URLSearchParams({
    variance_threshold_percent: '20',
    history_spread_threshold_percent: '25',
    limit: '20',
    sort: filters.sort,
    direction: filters.direction
  });

  if (filters.riskType.trim()) {
    params.set('risk_type', filters.riskType.trim());
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  return apiRequest<ProductCostRiskDetailsResponse>(`/products/cost-risk-details?${params.toString()}`);
}
