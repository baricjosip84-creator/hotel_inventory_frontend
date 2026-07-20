import { useMemo } from 'react';
import { buildCategoryOptions, buildCostingReadiness, buildProductSummary } from './productDerivedState';
import type { useProductPageQueries } from './productQueries';

type ProductPageDataQueries = ReturnType<typeof useProductPageQueries>;

export function useProductPageData(queries: ProductPageDataQueries) {
  const products = useMemo(() => queries.productsQuery.data ?? [], [queries.productsQuery.data]);
  const suppliers = useMemo(() => queries.suppliersQuery.data ?? [], [queries.suppliersQuery.data]);
  const packages = useMemo(() => queries.packagesQuery.data ?? [], [queries.packagesQuery.data]);
  const costHistory = useMemo(
    () => queries.costHistoryQuery.data?.cost_history ?? [],
    [queries.costHistoryQuery.data]
  );
  const standardCostHistory = useMemo(
    () => queries.standardCostHistoryQuery.data?.standard_cost_history ?? [],
    [queries.standardCostHistoryQuery.data]
  );

  return {
    products,
    suppliers,
    packages,
    costHistory,
    standardCostHistory,
    costSummary: queries.costHistoryQuery.data?.cost_summary,
    categoryOptions: useMemo(() => buildCategoryOptions(products), [products]),
    summary: useMemo(() => buildProductSummary(products), [products]),
    costingReadiness: useMemo(() => buildCostingReadiness(products), [products]),
    costActionSummary: queries.costActionQuery.data,
    costActionPlan: queries.costActionPlanQuery.data,
    costActionCategorySummary: queries.costActionCategoryQuery.data,
    costActionImpactSummary: queries.costActionImpactQuery.data,
    costActionSupplierSummary: queries.costActionSupplierQuery.data,
    costActionSourceSummary: queries.costActionSourceQuery.data,
    costActionAgeSummary: queries.costActionAgeQuery.data,
    costActionCoverageSummary: queries.costActionCoverageQuery.data,
    costAlertSummary: queries.costAlertQuery.data,
    costRecommendationSummary: queries.costRecommendationQuery.data,
    costDashboardSummary: queries.costDashboardQuery.data,
    costReportSummary: queries.costReportQuery.data,
    costGovernanceSummary: queries.costGovernanceQuery.data,
    costGovernanceDetails: queries.costGovernanceDetailsQuery.data,
    costGovernanceAuditPack: queries.costGovernanceAuditQuery.data,
    costGovernanceSignoff: queries.costGovernanceSignoffQuery.data,
    costGovernanceReviewQueue: queries.costGovernanceReviewQueueQuery.data,
    costGovernanceReviewPack: queries.costGovernanceReviewPackQuery.data,
    costGovernanceClosureSummary: queries.costGovernanceClosureQuery.data,
    costGovernanceHandoffSummary: queries.costGovernanceHandoffQuery.data,
    costOperationsRunbookSummary: queries.costOperationsRunbookQuery.data,
    costOperationsControlSummary: queries.costOperationsControlQuery.data,
    costOperationsEvidenceSummary: queries.costOperationsEvidenceQuery.data,
    costOperationsReadinessSummary: queries.costOperationsReadinessQuery.data,
    costGovernanceFinalSummary: queries.costGovernanceFinalQuery.data,
    costPerformanceSummary: queries.costPerformanceQuery.data,
    costSecurityAuditSummary: queries.costSecurityAuditQuery.data,
    costHardeningSummary: queries.costHardeningQuery.data,
    costActionDetails: queries.costActionDetailsQuery.data,
    costRiskSummary: queries.costRiskQuery.data,
    costRiskDetails: queries.costRiskDetailsQuery.data,
    costValuationSummary: queries.costValuationQuery.data,
    costValuationDetails: queries.costValuationDetailsQuery.data
  };
}
