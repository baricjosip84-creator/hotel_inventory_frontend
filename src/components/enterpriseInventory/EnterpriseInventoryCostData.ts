import { useMemo } from 'react';

import { useStableActionsOrRows, useStableRows } from './EnterpriseInventoryQueryData';

type QueryLike<T = any> = { data?: T | null };

type ProductCostDerivedDataInput = {
  productCostRiskSummaryQuery: QueryLike;
  productCostValuationSummaryQuery: QueryLike;
  productCostValuationDetailsQuery: QueryLike;
  productCostActionSummaryQuery: QueryLike;
  productCostActionPlanSummaryQuery: QueryLike;
  productCostActionCategorySummaryQuery: QueryLike;
  productCostActionImpactSummaryQuery: QueryLike;
  productCostActionSupplierSummaryQuery: QueryLike;
  productCostActionSourceSummaryQuery: QueryLike;
  productCostActionAgeSummaryQuery: QueryLike;
  productCostActionCoverageSummaryQuery: QueryLike;
  productCostAlertSummaryQuery: QueryLike;
  productCostRecommendationSummaryQuery: QueryLike;
  productCostDashboardSummaryQuery: QueryLike;
  productCostGovernanceSummaryQuery: QueryLike;
  productCostGovernanceDetailsQuery: QueryLike;
  productCostGovernanceAuditPackQuery: QueryLike;
  productCostGovernanceSignoffSummaryQuery: QueryLike;
  productCostGovernanceReviewQueueQuery: QueryLike;
  productCostGovernanceReviewPackQuery: QueryLike;
  productCostGovernanceClosureSummaryQuery: QueryLike;
  productCostGovernanceHandoffSummaryQuery: QueryLike;
  productCostHardeningSummaryQuery: QueryLike;
  productCostOperationsRunbookSummaryQuery: QueryLike;
  productCostOperationsControlSummaryQuery: QueryLike;
  productCostOperationsEvidenceSummaryQuery: QueryLike;
  productCostOperationsReadinessSummaryQuery: QueryLike;
  carryingCostProductionReviewQuery: QueryLike;
  deadStockProductionReviewQuery: QueryLike;
  marginAwareProductionReviewQuery: QueryLike;
  procurementSpendProductionReviewQuery: QueryLike;
};

export function useProductCostDerivedData({
  productCostRiskSummaryQuery,
  productCostValuationSummaryQuery,
  productCostValuationDetailsQuery,
  productCostActionSummaryQuery,
  productCostActionPlanSummaryQuery,
  productCostActionCategorySummaryQuery,
  productCostActionImpactSummaryQuery,
  productCostActionSupplierSummaryQuery,
  productCostActionSourceSummaryQuery,
  productCostActionAgeSummaryQuery,
  productCostActionCoverageSummaryQuery,
  productCostAlertSummaryQuery,
  productCostRecommendationSummaryQuery,
  productCostDashboardSummaryQuery,
  productCostGovernanceSummaryQuery,
  productCostGovernanceDetailsQuery,
  productCostGovernanceAuditPackQuery,
  productCostGovernanceSignoffSummaryQuery,
  productCostGovernanceReviewQueueQuery,
  productCostGovernanceReviewPackQuery,
  productCostGovernanceClosureSummaryQuery,
  productCostGovernanceHandoffSummaryQuery,
  productCostHardeningSummaryQuery,
  productCostOperationsRunbookSummaryQuery,
  productCostOperationsControlSummaryQuery,
  productCostOperationsEvidenceSummaryQuery,
  productCostOperationsReadinessSummaryQuery,
  carryingCostProductionReviewQuery,
  deadStockProductionReviewQuery,
  marginAwareProductionReviewQuery,
  procurementSpendProductionReviewQuery
}: ProductCostDerivedDataInput) {
  const productCostRiskSummary = productCostRiskSummaryQuery.data;
  const highVarianceCostRows = useMemo(() => productCostRiskSummary?.high_variance ?? [], [productCostRiskSummary]);
  const missingCostRows = useMemo(() => productCostRiskSummary?.missing_cost ?? [], [productCostRiskSummary]);
  const inconsistentCostRows = useMemo(() => productCostRiskSummary?.inconsistent_cost_history ?? [], [productCostRiskSummary]);

  const productCostValuationSummary = productCostValuationSummaryQuery.data;
  const productCostBasisRows = useMemo(() => productCostValuationSummary?.basis_breakdown ?? [], [productCostValuationSummary]);
  const productCostCategoryRows = useMemo(() => productCostValuationSummary?.category_breakdown ?? [], [productCostValuationSummary]);
  const productCostTopValueRows = useMemo(() => productCostValuationSummary?.top_value_products ?? [], [productCostValuationSummary]);

  const productCostValuationDetailRows = useStableRows(productCostValuationDetailsQuery.data);
  const productCostActionRows = useStableActionsOrRows(productCostActionSummaryQuery.data);
  const productCostPriorityBands = useMemo(() => productCostActionPlanSummaryQuery.data?.priority_bands ?? [], [productCostActionPlanSummaryQuery.data]);
  const productCostNextActions = useMemo(() => productCostActionPlanSummaryQuery.data?.next_actions ?? [], [productCostActionPlanSummaryQuery.data]);
  const productCostActionCategories = useMemo(() => productCostActionCategorySummaryQuery.data?.categories ?? [], [productCostActionCategorySummaryQuery.data]);
  const productCostImpactRows = useMemo(() => productCostActionImpactSummaryQuery.data?.impact_breakdown ?? [], [productCostActionImpactSummaryQuery.data]);
  const productCostTopImpactProducts = useMemo(() => productCostActionImpactSummaryQuery.data?.top_impact_products ?? [], [productCostActionImpactSummaryQuery.data]);
  const productCostActionSuppliers = useMemo(() => productCostActionSupplierSummaryQuery.data?.suppliers ?? [], [productCostActionSupplierSummaryQuery.data]);
  const productCostActionSources = useMemo(() => productCostActionSourceSummaryQuery.data?.sources ?? [], [productCostActionSourceSummaryQuery.data]);
  const productCostActionAgeBands = useMemo(() => productCostActionAgeSummaryQuery.data?.age_bands ?? [], [productCostActionAgeSummaryQuery.data]);
  const productCostActionCoverageRows = useMemo(() => productCostActionCoverageSummaryQuery.data?.category_coverage ?? [], [productCostActionCoverageSummaryQuery.data]);
  const productCostCoverageGaps = useMemo(() => productCostActionCoverageSummaryQuery.data?.coverage_gaps ?? [], [productCostActionCoverageSummaryQuery.data]);
  const productCostAlertGroups = useMemo(() => productCostAlertSummaryQuery.data?.alert_groups ?? [], [productCostAlertSummaryQuery.data]);
  const productCostTopAlerts = useMemo(() => productCostAlertSummaryQuery.data?.top_alerts ?? [], [productCostAlertSummaryQuery.data]);
  const productCostRecommendationGroups = useMemo(() => productCostRecommendationSummaryQuery.data?.recommendation_groups ?? [], [productCostRecommendationSummaryQuery.data]);
  const productCostTopRecommendations = useMemo(() => productCostRecommendationSummaryQuery.data?.top_recommendations ?? [], [productCostRecommendationSummaryQuery.data]);
  const productCostDashboardCategories = useMemo(() => productCostDashboardSummaryQuery.data?.top_review_categories ?? [], [productCostDashboardSummaryQuery.data]);
  const productCostDashboardPriorityProducts = useMemo(() => productCostDashboardSummaryQuery.data?.priority_products ?? [], [productCostDashboardSummaryQuery.data]);
  const productCostGovernanceChecklist = useMemo(() => productCostGovernanceSummaryQuery.data?.checklist ?? [], [productCostGovernanceSummaryQuery.data]);
  const productCostGovernanceFailedChecklist = useMemo(() => productCostGovernanceDetailsQuery.data?.failed_checklist ?? [], [productCostGovernanceDetailsQuery.data]);
  const productCostGovernanceWatchChecklist = useMemo(() => productCostGovernanceDetailsQuery.data?.watch_checklist ?? [], [productCostGovernanceDetailsQuery.data]);
  const productCostGovernanceRemediationPlan = useMemo(() => productCostGovernanceDetailsQuery.data?.remediation_plan ?? [], [productCostGovernanceDetailsQuery.data]);
  const productCostGovernancePriorityProducts = useMemo(() => productCostGovernanceDetailsQuery.data?.priority_products ?? [], [productCostGovernanceDetailsQuery.data]);
  const productCostGovernanceAuditRows = useMemo(() => productCostGovernanceAuditPackQuery.data?.audit_rows ?? [], [productCostGovernanceAuditPackQuery.data]);
  const productCostGovernanceSignoffChecklist = useMemo(() => productCostGovernanceSignoffSummaryQuery.data?.signoff_checklist ?? [], [productCostGovernanceSignoffSummaryQuery.data]);
  const productCostGovernanceBlockers = useMemo(() => productCostGovernanceSignoffSummaryQuery.data?.blockers ?? [], [productCostGovernanceSignoffSummaryQuery.data]);
  const productCostGovernanceWarnings = useMemo(() => productCostGovernanceSignoffSummaryQuery.data?.warnings ?? [], [productCostGovernanceSignoffSummaryQuery.data]);
  const productCostGovernanceQueueItems = useMemo(() => productCostGovernanceReviewQueueQuery.data?.queue_items ?? [], [productCostGovernanceReviewQueueQuery.data]);
  const productCostGovernanceReviewExportRows = useMemo(() => productCostGovernanceReviewPackQuery.data?.review_export_rows ?? [], [productCostGovernanceReviewPackQuery.data]);
  const productCostGovernanceClosureChecklist = useMemo(() => productCostGovernanceClosureSummaryQuery.data?.closure_checklist ?? [], [productCostGovernanceClosureSummaryQuery.data]);
  const productCostGovernanceHandoffChecklist = useMemo(() => productCostGovernanceHandoffSummaryQuery.data?.handoff_checklist ?? [], [productCostGovernanceHandoffSummaryQuery.data]);
  const productCostGovernanceOwnerSummary = useMemo(() => productCostGovernanceHandoffSummaryQuery.data?.owner_summary ?? [], [productCostGovernanceHandoffSummaryQuery.data]);
  const productCostHardeningFailedChecklist = useMemo(() => productCostHardeningSummaryQuery.data?.failed_checklist ?? [], [productCostHardeningSummaryQuery.data]);
  const productCostOperationsRhythm = useMemo(() => productCostOperationsRunbookSummaryQuery.data?.operating_rhythm ?? [], [productCostOperationsRunbookSummaryQuery.data]);
  const productCostOperationsEscalationRules = useMemo(() => productCostOperationsRunbookSummaryQuery.data?.escalation_rules ?? [], [productCostOperationsRunbookSummaryQuery.data]);
  const productCostOperationsControlChecks = useMemo(() => productCostOperationsControlSummaryQuery.data?.control_checks ?? [], [productCostOperationsControlSummaryQuery.data]);
  const productCostOperationsEvidenceSections = useMemo(() => productCostOperationsEvidenceSummaryQuery.data?.evidence_sections ?? [], [productCostOperationsEvidenceSummaryQuery.data]);
  const productCostOperationsReadinessChecklist = useMemo(() => productCostOperationsReadinessSummaryQuery.data?.readiness_checklist ?? [], [productCostOperationsReadinessSummaryQuery.data]);
  const carryingCostProductionReview = carryingCostProductionReviewQuery.data;
  const carryingCostProductionReviewRows = useMemo(() => carryingCostProductionReview?.rows ?? [], [carryingCostProductionReview]);
  const carryingCostProductionControls = useMemo(() => carryingCostProductionReview?.controls ?? carryingCostProductionReview?.safety_contract ?? [], [carryingCostProductionReview]);
  const deadStockProductionReview = deadStockProductionReviewQuery.data;
  const deadStockProductionReviewRows = useMemo(() => deadStockProductionReview?.rows ?? [], [deadStockProductionReview]);
  const deadStockProductionControls = useMemo(() => deadStockProductionReview?.controls ?? deadStockProductionReview?.safety_contract ?? [], [deadStockProductionReview]);
  const marginAwareProductionReview = marginAwareProductionReviewQuery.data;
  const marginAwareProductionReviewRows = useMemo(() => marginAwareProductionReview?.rows ?? [], [marginAwareProductionReview]);
  const marginAwareProductionControls = useMemo(() => marginAwareProductionReview?.controls ?? marginAwareProductionReview?.safety_contract ?? [], [marginAwareProductionReview]);
  const procurementSpendProductionReview = procurementSpendProductionReviewQuery.data;
  const procurementSpendProductionReviewRows = useMemo(() => procurementSpendProductionReview?.rows ?? [], [procurementSpendProductionReview]);
  const procurementSpendProductionControls = useMemo(() => procurementSpendProductionReview?.controls ?? procurementSpendProductionReview?.safety_contract ?? [], [procurementSpendProductionReview]);

  return {
    productCostRiskSummary,
    highVarianceCostRows,
    missingCostRows,
    inconsistentCostRows,
    productCostValuationSummary,
    productCostBasisRows,
    productCostCategoryRows,
    productCostTopValueRows,
    productCostValuationDetailRows,
    productCostActionRows,
    productCostPriorityBands,
    productCostNextActions,
    productCostActionCategories,
    productCostImpactRows,
    productCostTopImpactProducts,
    productCostActionSuppliers,
    productCostActionSources,
    productCostActionAgeBands,
    productCostActionCoverageRows,
    productCostCoverageGaps,
    productCostAlertGroups,
    productCostTopAlerts,
    productCostRecommendationGroups,
    productCostTopRecommendations,
    productCostDashboardCategories,
    productCostDashboardPriorityProducts,
    productCostGovernanceChecklist,
    productCostGovernanceFailedChecklist,
    productCostGovernanceWatchChecklist,
    productCostGovernanceRemediationPlan,
    productCostGovernancePriorityProducts,
    productCostGovernanceAuditRows,
    productCostGovernanceSignoffChecklist,
    productCostGovernanceBlockers,
    productCostGovernanceWarnings,
    productCostGovernanceQueueItems,
    productCostGovernanceReviewExportRows,
    productCostGovernanceClosureChecklist,
    productCostGovernanceHandoffChecklist,
    productCostGovernanceOwnerSummary,
    productCostHardeningFailedChecklist,
    productCostOperationsRhythm,
    productCostOperationsEscalationRules,
    productCostOperationsControlChecks,
    productCostOperationsEvidenceSections,
    productCostOperationsReadinessChecklist,
    carryingCostProductionReview,
    carryingCostProductionReviewRows,
    carryingCostProductionControls,
    deadStockProductionReview,
    deadStockProductionReviewRows,
    deadStockProductionControls,
    marginAwareProductionReview,
    marginAwareProductionReviewRows,
    marginAwareProductionControls,
    procurementSpendProductionReview,
    procurementSpendProductionReviewRows,
    procurementSpendProductionControls
  };
}
