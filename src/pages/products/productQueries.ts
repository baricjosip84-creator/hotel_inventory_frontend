import { useQuery } from '@tanstack/react-query';
import type { ProductCostRiskItem, ProductItem } from '../../types/inventory';
import {
  fetchProducts,
  fetchSuppliers,
} from './productCoreApi';
import {
  fetchProductCostHistory,
  fetchProductStandardCostHistory
} from './productCostHistoryApi';
import type { CostHistoryFilterState } from './productCostHistoryApi';
import { fetchProductPackages } from './productPackageApi';

import {
  fetchProductCostValuationSummary,
  fetchProductCostValuationDetails,
  fetchProductCostRiskSummary,
  fetchProductCostRiskDetails
} from './productCostAssessmentApi';

import {
  fetchProductCostActionSummary,
  fetchProductCostActionPlanSummary,
  fetchProductCostActionCategorySummary,
  fetchProductCostActionImpactSummary,
  fetchProductCostActionSupplierSummary,
  fetchProductCostActionSourceSummary,
  fetchProductCostActionAgeSummary,
  fetchProductCostActionCoverageSummary,
  fetchProductCostAlertSummary,
  fetchProductCostRecommendationSummary,
  fetchProductCostDashboardSummary,
  fetchProductCostActionDetails
} from './productCostActionApi';

import { useProductCostGovernanceQueries } from './productCostGovernanceQueries';
import type {
  CostActionDetailFilterState,
} from './productCoreApi';
import type {
  CostRiskDetailFilterState,
  CostValuationDetailFilterState
} from './productCostAssessmentApi';

export type ProductPageQueryInput = {
  search: string;
  categoryFilter: string;
  supplierFilter: string;
  costStatusFilter: string;
  costBasisFilter: string;
  costVarianceStatusFilter: string;
  selectedPackageProduct: ProductItem | null;
  selectedCostProduct: ProductItem | ProductCostRiskItem | null;
  canViewProductPackages: boolean;
  costHistoryFilters: CostHistoryFilterState;
  costValuationDetailFilters: CostValuationDetailFilterState;
  costRiskDetailFilters: CostRiskDetailFilterState;
  costActionDetailFilters: CostActionDetailFilterState;
};

export function useProductPageQueries({
  search,
  categoryFilter,
  supplierFilter,
  costStatusFilter,
  costBasisFilter,
  costVarianceStatusFilter,
  selectedPackageProduct,
  selectedCostProduct,
  canViewProductPackages,
  costHistoryFilters,
  costValuationDetailFilters,
  costRiskDetailFilters,
  costActionDetailFilters
}: ProductPageQueryInput) {
  const productsQuery = useQuery({
    queryKey: ['products', search, categoryFilter, supplierFilter, costStatusFilter, costBasisFilter, costVarianceStatusFilter],
    queryFn: () =>
      fetchProducts({
        search,
        category: categoryFilter,
        supplierId: supplierFilter,
        costStatus: costStatusFilter,
        costBasis: costBasisFilter,
        costVarianceStatus: costVarianceStatusFilter
      })
  });

  const costValuationQuery = useQuery({
    queryKey: ['product-cost-valuation-summary'],
    queryFn: fetchProductCostValuationSummary
  });

  const costValuationDetailsQuery = useQuery({
    queryKey: [
      'product-cost-valuation-details',
      costValuationDetailFilters.valuationBasis,
      costValuationDetailFilters.search,
      costValuationDetailFilters.sort,
      costValuationDetailFilters.direction
    ],
    queryFn: () => fetchProductCostValuationDetails(costValuationDetailFilters)
  });

  const costActionQuery = useQuery({
    queryKey: ['product-cost-action-summary'],
    queryFn: fetchProductCostActionSummary
  });

  const costActionPlanQuery = useQuery({
    queryKey: ['product-cost-action-plan-summary'],
    queryFn: fetchProductCostActionPlanSummary
  });

  const costActionCategoryQuery = useQuery({
    queryKey: ['product-cost-action-category-summary'],
    queryFn: fetchProductCostActionCategorySummary
  });

  const costActionImpactQuery = useQuery({
    queryKey: ['product-cost-action-impact-summary'],
    queryFn: fetchProductCostActionImpactSummary
  });

  const costActionSupplierQuery = useQuery({
    queryKey: ['product-cost-action-supplier-summary'],
    queryFn: fetchProductCostActionSupplierSummary
  });

  const costActionSourceQuery = useQuery({
    queryKey: ['product-cost-action-source-summary'],
    queryFn: fetchProductCostActionSourceSummary
  });

  const costActionAgeQuery = useQuery({
    queryKey: ['product-cost-action-age-summary'],
    queryFn: fetchProductCostActionAgeSummary
  });

  const costActionCoverageQuery = useQuery({
    queryKey: ['product-cost-action-coverage-summary'],
    queryFn: fetchProductCostActionCoverageSummary
  });

  const costAlertQuery = useQuery({
    queryKey: ['product-cost-alert-summary'],
    queryFn: fetchProductCostAlertSummary
  });

  const costRecommendationQuery = useQuery({
    queryKey: ['product-cost-recommendation-summary'],
    queryFn: fetchProductCostRecommendationSummary
  });

  const costDashboardQuery = useQuery({
    queryKey: ['product-cost-dashboard-summary'],
    queryFn: fetchProductCostDashboardSummary
  });

  const governanceQueries = useProductCostGovernanceQueries();

  const costActionDetailsQuery = useQuery({
    queryKey: [
      'product-cost-action-details',
      costActionDetailFilters.actionType,
      costActionDetailFilters.search,
      costActionDetailFilters.sort,
      costActionDetailFilters.direction
    ],
    queryFn: () => fetchProductCostActionDetails(costActionDetailFilters)
  });

  const costRiskQuery = useQuery({
    queryKey: ['product-cost-risk-summary'],
    queryFn: fetchProductCostRiskSummary
  });

  const costRiskDetailsQuery = useQuery({
    queryKey: [
      'product-cost-risk-details',
      costRiskDetailFilters.riskType,
      costRiskDetailFilters.search,
      costRiskDetailFilters.sort,
      costRiskDetailFilters.direction
    ],
    queryFn: () => fetchProductCostRiskDetails(costRiskDetailFilters)
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers-available-products-page'],
    queryFn: fetchSuppliers
  });

  const packagesQuery = useQuery({
    queryKey: ['product-packages', selectedPackageProduct?.id],
    queryFn: () => fetchProductPackages(selectedPackageProduct!.id),
    enabled: Boolean(selectedPackageProduct?.id && canViewProductPackages)
  });

  const costHistoryQuery = useQuery({
    queryKey: [
      'product-cost-history',
      selectedCostProduct?.id,
      costHistoryFilters.costSource,
      costHistoryFilters.costFrom,
      costHistoryFilters.costTo
    ],
    queryFn: () => fetchProductCostHistory(selectedCostProduct!.id, costHistoryFilters),
    enabled: Boolean(selectedCostProduct?.id)
  });

  const standardCostHistoryQuery = useQuery({
    queryKey: ['product-standard-cost-history', selectedCostProduct?.id],
    queryFn: () => fetchProductStandardCostHistory(selectedCostProduct!.id),
    enabled: Boolean(selectedCostProduct?.id)
  });

  return {
    productsQuery,
    costValuationQuery,
    costValuationDetailsQuery,
    costActionQuery,
    costActionPlanQuery,
    costActionCategoryQuery,
    costActionImpactQuery,
    costActionSupplierQuery,
    costActionSourceQuery,
    costActionAgeQuery,
    costActionCoverageQuery,
    costAlertQuery,
    costRecommendationQuery,
    costDashboardQuery,
    ...governanceQueries,
    costActionDetailsQuery,
    costRiskQuery,
    costRiskDetailsQuery,
    suppliersQuery,
    packagesQuery,
    costHistoryQuery,
    standardCostHistoryQuery
  };
}
