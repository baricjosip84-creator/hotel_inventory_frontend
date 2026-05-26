import { apiRequest } from '../../lib/api';
import type {
  ProductCostActionAgeSummaryResponse,
  ProductCostActionCategorySummaryResponse,
  ProductCostActionCoverageSummaryResponse,
  ProductCostAlertSummaryResponse,
  ProductCostDashboardSummaryResponse,
  ProductCostRecommendationSummaryResponse,
  ProductCostActionDetailsResponse,
  ProductCostActionImpactSummaryResponse,
  ProductCostActionPlanSummaryResponse,
  ProductCostActionSourceSummaryResponse,
  ProductCostActionSupplierSummaryResponse,
  ProductCostActionSummaryResponse
} from '../../types/inventory';
import type { CostActionDetailFilterState } from './productCoreApi';

export async function fetchProductCostActionSummary(): Promise<ProductCostActionSummaryResponse> {
  return apiRequest<ProductCostActionSummaryResponse>(
    '/products/cost-action-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

export async function fetchProductCostActionPlanSummary(): Promise<ProductCostActionPlanSummaryResponse> {
  return apiRequest<ProductCostActionPlanSummaryResponse>(
    '/products/cost-action-plan-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}


export async function fetchProductCostActionCategorySummary(): Promise<ProductCostActionCategorySummaryResponse> {
  return apiRequest<ProductCostActionCategorySummaryResponse>(
    '/products/cost-action-category-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

export async function fetchProductCostActionImpactSummary(): Promise<ProductCostActionImpactSummaryResponse> {
  return apiRequest<ProductCostActionImpactSummaryResponse>(
    '/products/cost-action-impact-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}


export async function fetchProductCostActionSupplierSummary(): Promise<ProductCostActionSupplierSummaryResponse> {
  return apiRequest<ProductCostActionSupplierSummaryResponse>(
    '/products/cost-action-supplier-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

export async function fetchProductCostActionSourceSummary(): Promise<ProductCostActionSourceSummaryResponse> {
  return apiRequest<ProductCostActionSourceSummaryResponse>(
    '/products/cost-action-source-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}

export async function fetchProductCostActionAgeSummary(): Promise<ProductCostActionAgeSummaryResponse> {
  return apiRequest<ProductCostActionAgeSummaryResponse>(
    '/products/cost-action-age-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&limit=8'
  );
}

export async function fetchProductCostActionCoverageSummary(): Promise<ProductCostActionCoverageSummaryResponse> {
  return apiRequest<ProductCostActionCoverageSummaryResponse>(
    '/products/cost-action-coverage-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&limit=8'
  );
}


export async function fetchProductCostAlertSummary(): Promise<ProductCostAlertSummaryResponse> {
  return apiRequest<ProductCostAlertSummaryResponse>(
    '/products/cost-alert-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


export async function fetchProductCostRecommendationSummary(): Promise<ProductCostRecommendationSummaryResponse> {
  return apiRequest<ProductCostRecommendationSummaryResponse>(
    '/products/cost-recommendation-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=8'
  );
}


export async function fetchProductCostDashboardSummary(): Promise<ProductCostDashboardSummaryResponse> {
  return apiRequest<ProductCostDashboardSummaryResponse>(
    '/products/cost-dashboard-summary?variance_threshold_percent=20&history_spread_threshold_percent=25&stale_cost_days=90&spike_threshold_percent=35&limit=6'
  );
}



export async function fetchProductCostActionDetails(
  filters: CostActionDetailFilterState
): Promise<ProductCostActionDetailsResponse> {
  const params = new URLSearchParams({
    variance_threshold_percent: '20',
    history_spread_threshold_percent: '25',
    limit: '20',
    sort: filters.sort,
    direction: filters.direction
  });

  if (filters.actionType.trim()) {
    params.set('action_type', filters.actionType.trim());
  }

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  return apiRequest<ProductCostActionDetailsResponse>(`/products/cost-action-details?${params.toString()}`);
}
