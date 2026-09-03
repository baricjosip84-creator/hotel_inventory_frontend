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
import type { ProductWorkspaceView } from './useProductPageState';

export type ProductPageQueryInput = {
  workspaceView: ProductWorkspaceView;
  categoryFilter: string;
  supplierFilter: string;
  costStatusFilter: string;
  costBasisFilter: string;
  costVarianceStatusFilter: string;
  selectedPackageProduct: ProductItem | null;
  selectedCostProduct: ProductItem | ProductCostRiskItem | null;
  canViewProductPackages: boolean;
  canViewSuppliers: boolean;
  canViewStock: boolean;
  costHistoryFilters: CostHistoryFilterState;
  costValuationDetailFilters: CostValuationDetailFilterState;
  costRiskDetailFilters: CostRiskDetailFilterState;
  costActionDetailFilters: CostActionDetailFilterState;
};

export function useProductPageQueries({
  workspaceView,
  categoryFilter,
  supplierFilter,
  costStatusFilter,
  costBasisFilter,
  costVarianceStatusFilter,
  selectedPackageProduct,
  selectedCostProduct,
  canViewProductPackages,
  canViewSuppliers,
  canViewStock,
  costHistoryFilters,
  costValuationDetailFilters,
  costRiskDetailFilters,
  costActionDetailFilters
}: ProductPageQueryInput) {
  const valuationEnabled = canViewStock && workspaceView === 'valuation';
  const actionsEnabled = canViewStock && workspaceView === 'actions';
  const governanceEnabled = canViewStock && workspaceView === 'governance';

  const productsQuery = useQuery({
    queryKey: ['products', categoryFilter, supplierFilter, costStatusFilter, costBasisFilter, costVarianceStatusFilter],
    queryFn: () =>
      fetchProducts({
        search: '',
        category: categoryFilter,
        supplierId: supplierFilter,
        costStatus: costStatusFilter,
        costBasis: costBasisFilter,
        costVarianceStatus: costVarianceStatusFilter
      })
  });

  const costValuationQuery = useQuery({
    queryKey: ['product-cost-valuation-summary'],
    queryFn: fetchProductCostValuationSummary,
    enabled: valuationEnabled
  });

  const costValuationDetailsQuery = useQuery({
    queryKey: [
      'product-cost-valuation-details',
      costValuationDetailFilters.valuationBasis,
      costValuationDetailFilters.search,
      costValuationDetailFilters.sort,
      costValuationDetailFilters.direction
    ],
    queryFn: () => fetchProductCostValuationDetails(costValuationDetailFilters),
    enabled: valuationEnabled
  });

  const costActionQuery = useQuery({
    queryKey: ['product-cost-action-summary'],
    queryFn: fetchProductCostActionSummary,
    enabled: actionsEnabled
  });

  const costActionPlanQuery = useQuery({
    queryKey: ['product-cost-action-plan-summary'],
    queryFn: fetchProductCostActionPlanSummary,
    enabled: actionsEnabled
  });

  const costActionCategoryQuery = useQuery({
    queryKey: ['product-cost-action-category-summary'],
    queryFn: fetchProductCostActionCategorySummary,
    enabled: actionsEnabled
  });

  const costActionImpactQuery = useQuery({
    queryKey: ['product-cost-action-impact-summary'],
    queryFn: fetchProductCostActionImpactSummary,
    enabled: actionsEnabled
  });

  const costActionSupplierQuery = useQuery({
    queryKey: ['product-cost-action-supplier-summary'],
    queryFn: fetchProductCostActionSupplierSummary,
    enabled: actionsEnabled && canViewSuppliers
  });

  const costActionSourceQuery = useQuery({
    queryKey: ['product-cost-action-source-summary'],
    queryFn: fetchProductCostActionSourceSummary,
    enabled: actionsEnabled
  });

  const costActionAgeQuery = useQuery({
    queryKey: ['product-cost-action-age-summary'],
    queryFn: fetchProductCostActionAgeSummary,
    enabled: actionsEnabled
  });

  const costActionCoverageQuery = useQuery({
    queryKey: ['product-cost-action-coverage-summary'],
    queryFn: fetchProductCostActionCoverageSummary,
    enabled: actionsEnabled
  });

  const costAlertQuery = useQuery({
    queryKey: ['product-cost-alert-summary'],
    queryFn: fetchProductCostAlertSummary,
    enabled: actionsEnabled
  });

  const costRecommendationQuery = useQuery({
    queryKey: ['product-cost-recommendation-summary'],
    queryFn: fetchProductCostRecommendationSummary,
    enabled: actionsEnabled
  });

  const costDashboardQuery = useQuery({
    queryKey: ['product-cost-dashboard-summary'],
    queryFn: fetchProductCostDashboardSummary,
    enabled: valuationEnabled
  });

  const governanceQueries = useProductCostGovernanceQueries(governanceEnabled);

  const costActionDetailsQuery = useQuery({
    queryKey: [
      'product-cost-action-details',
      costActionDetailFilters.actionType,
      costActionDetailFilters.search,
      costActionDetailFilters.sort,
      costActionDetailFilters.direction
    ],
    queryFn: () => fetchProductCostActionDetails(costActionDetailFilters),
    enabled: actionsEnabled
  });

  const costRiskQuery = useQuery({
    queryKey: ['product-cost-risk-summary'],
    queryFn: fetchProductCostRiskSummary,
    enabled: actionsEnabled
  });

  const costRiskDetailsQuery = useQuery({
    queryKey: [
      'product-cost-risk-details',
      costRiskDetailFilters.riskType,
      costRiskDetailFilters.search,
      costRiskDetailFilters.sort,
      costRiskDetailFilters.direction
    ],
    queryFn: () => fetchProductCostRiskDetails(costRiskDetailFilters),
    enabled: actionsEnabled
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers-available-products-page'],
    queryFn: fetchSuppliers,
    enabled: canViewSuppliers
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
