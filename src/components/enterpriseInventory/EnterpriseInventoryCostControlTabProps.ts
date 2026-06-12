import type { ComponentProps } from "react";
import type { CostControlTab } from "./tabs/CostControlTab";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

type CostControlTabProps = ComponentProps<typeof CostControlTab>;

type EnterpriseInventoryCostControlPageData = EnterpriseInventoryPanelBaseProps["pageData"];

export function buildEnterpriseInventoryCostControlTabProps(
  pageData: EnterpriseInventoryCostControlPageData,
): CostControlTabProps {
  const { costData, queries } = pageData;

  return {
    highVarianceCostRows: costData.highVarianceCostRows,
    inconsistentCostRows: costData.inconsistentCostRows,
    missingCostRows: costData.missingCostRows,
    productCostActionAgeBands: costData.productCostActionAgeBands,
    productCostActionAgeSummaryQuery: queries.productCostActionAgeSummaryQuery,
    productCostActionCategories: costData.productCostActionCategories,
    productCostActionCategorySummaryQuery:
      queries.productCostActionCategorySummaryQuery,
    productCostActionCoverageRows: costData.productCostActionCoverageRows,
    productCostActionCoverageSummaryQuery:
      queries.productCostActionCoverageSummaryQuery,
    productCostActionImpactSummaryQuery:
      queries.productCostActionImpactSummaryQuery,
    productCostActionPlanSummaryQuery: queries.productCostActionPlanSummaryQuery,
    productCostActionRows: costData.productCostActionRows,
    productCostActionSourceSummaryQuery:
      queries.productCostActionSourceSummaryQuery,
    productCostActionSources: costData.productCostActionSources,
    productCostActionSummaryQuery: queries.productCostActionSummaryQuery,
    productCostActionSupplierSummaryQuery:
      queries.productCostActionSupplierSummaryQuery,
    productCostActionSuppliers: costData.productCostActionSuppliers,
    productCostAlertGroups: costData.productCostAlertGroups,
    productCostAlertSummaryQuery: queries.productCostAlertSummaryQuery,
    productCostBasisRows: costData.productCostBasisRows,
    productCostCategoryRows: costData.productCostCategoryRows,
    productCostCoverageGaps: costData.productCostCoverageGaps,
    productCostDashboardCategories: costData.productCostDashboardCategories,
    productCostDashboardPriorityProducts:
      costData.productCostDashboardPriorityProducts,
    productCostDashboardSummaryQuery: queries.productCostDashboardSummaryQuery,
    productCostGovernanceAuditPackQuery:
      queries.productCostGovernanceAuditPackQuery,
    productCostGovernanceAuditRows: costData.productCostGovernanceAuditRows,
    productCostGovernanceBlockers: costData.productCostGovernanceBlockers,
    productCostGovernanceChecklist: costData.productCostGovernanceChecklist,
    productCostGovernanceClosureChecklist:
      costData.productCostGovernanceClosureChecklist,
    productCostGovernanceClosureSummaryQuery:
      queries.productCostGovernanceClosureSummaryQuery,
    productCostGovernanceDetailsQuery: queries.productCostGovernanceDetailsQuery,
    productCostGovernanceFailedChecklist:
      costData.productCostGovernanceFailedChecklist,
    productCostGovernanceHandoffChecklist:
      costData.productCostGovernanceHandoffChecklist,
    productCostGovernanceHandoffSummaryQuery:
      queries.productCostGovernanceHandoffSummaryQuery,
    productCostGovernanceOwnerSummary:
      costData.productCostGovernanceOwnerSummary,
    productCostGovernancePriorityProducts:
      costData.productCostGovernancePriorityProducts,
    productCostGovernanceQueueItems: costData.productCostGovernanceQueueItems,
    productCostGovernanceRemediationPlan:
      costData.productCostGovernanceRemediationPlan,
    productCostGovernanceReviewExportRows:
      costData.productCostGovernanceReviewExportRows,
    productCostGovernanceReviewPackQuery:
      queries.productCostGovernanceReviewPackQuery,
    productCostGovernanceReviewQueueQuery:
      queries.productCostGovernanceReviewQueueQuery,
    productCostGovernanceSignoffChecklist:
      costData.productCostGovernanceSignoffChecklist,
    productCostGovernanceSignoffSummaryQuery:
      queries.productCostGovernanceSignoffSummaryQuery,
    productCostGovernanceSummaryQuery: queries.productCostGovernanceSummaryQuery,
    productCostGovernanceWarnings: costData.productCostGovernanceWarnings,
    productCostGovernanceWatchChecklist:
      costData.productCostGovernanceWatchChecklist,
    productCostHardeningFailedChecklist:
      costData.productCostHardeningFailedChecklist,
    productCostHardeningSummaryQuery: queries.productCostHardeningSummaryQuery,
    productCostImpactRows: costData.productCostImpactRows,
    productCostNextActions: costData.productCostNextActions,
    productCostOperationsControlChecks:
      costData.productCostOperationsControlChecks,
    productCostOperationsControlSummaryQuery:
      queries.productCostOperationsControlSummaryQuery,
    productCostOperationsEscalationRules:
      costData.productCostOperationsEscalationRules,
    productCostOperationsEvidenceSections:
      costData.productCostOperationsEvidenceSections,
    productCostOperationsEvidenceSummaryQuery:
      queries.productCostOperationsEvidenceSummaryQuery,
    productCostOperationsReadinessChecklist:
      costData.productCostOperationsReadinessChecklist,
    productCostOperationsReadinessSummaryQuery:
      queries.productCostOperationsReadinessSummaryQuery,
    productCostOperationsRhythm: costData.productCostOperationsRhythm,
    productCostOperationsRunbookSummaryQuery:
      queries.productCostOperationsRunbookSummaryQuery,
    productCostPriorityBands: costData.productCostPriorityBands,
    productCostRecommendationGroups: costData.productCostRecommendationGroups,
    productCostRecommendationSummaryQuery:
      queries.productCostRecommendationSummaryQuery,
    productCostReportSummaryQuery: queries.productCostReportSummaryQuery,
    productCostRiskSummary: costData.productCostRiskSummary,
    productCostRiskSummaryQuery: queries.productCostRiskSummaryQuery,
    productCostTopAlerts: costData.productCostTopAlerts,
    productCostTopImpactProducts: costData.productCostTopImpactProducts,
    productCostTopRecommendations: costData.productCostTopRecommendations,
    productCostTopValueRows: costData.productCostTopValueRows,
    productCostValuationDetailRows: costData.productCostValuationDetailRows,
    productCostValuationDetailsQuery: queries.productCostValuationDetailsQuery,
    productCostValuationSummary: costData.productCostValuationSummary,
    productCostValuationSummaryQuery: queries.productCostValuationSummaryQuery,
  };
}
