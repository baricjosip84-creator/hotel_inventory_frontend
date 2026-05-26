import { ProductCostValuationPanel } from './ProductCostValuationPanel';
import { ProductCostingReadinessPanel } from './ProductCostingReadinessPanel';
import { ProductCostActionSummaryPanel } from './ProductCostActionSummaryPanel';
import { ProductCostActionPlanPanel } from './ProductCostActionPlanPanel';
import { ProductCostActionCategoryPanel } from './ProductCostActionCategoryPanel';
import { ProductCostActionImpactPanel } from './ProductCostActionImpactPanel';
import { ProductCostActionSupplierPanel } from './ProductCostActionSupplierPanel';
import { ProductCostActionSourcePanel } from './ProductCostActionSourcePanel';
import { ProductCostActionAgePanel } from './ProductCostActionAgePanel';
import { ProductCostRecommendationSummaryPanel } from './ProductCostRecommendationSummaryPanel';
import { ProductCostActionCoveragePanel } from './ProductCostActionCoveragePanel';
import { ProductCostRiskSummaryPanel } from './ProductCostRiskSummaryPanel';
import { ProductCostDashboardSummaryPanel } from './ProductCostDashboardSummaryPanel';
import { ProductCostHardeningSummaryPanel } from './ProductCostHardeningSummaryPanel';
import { ProductCostGovernanceSummaryPanel } from './ProductCostGovernanceSummaryPanel';
import { ProductCostAlertSummaryPanel } from './ProductCostAlertSummaryPanel';
import { ProductCostReportSummaryPanel } from './ProductCostReportSummaryPanel';
import { ProductCostActionDetailsPanel } from './ProductCostActionDetailsPanel';

type ProductCostAnalyticsSectionsPanelProps = Record<string, any>;

export function ProductCostAnalyticsSectionsPanel({
  costingReadiness,
  setCategoryFilter,
  costValuationQuery,
  costValuationSummary,
  costValuationDetailsQuery,
  costValuationDetails,
  costValuationDetailFilters,
  setCostValuationDetailFilters,
  handleOpenCostHistory,
  handleExportCostValuationDetailsCsv,
  costActionQuery,
  costActionSummary,
  costActionPlanQuery,
  costActionPlan,
  costActionCategoryQuery,
  costActionCategorySummary,
  costActionImpactQuery,
  costActionImpactSummary,
  costActionSupplierQuery,
  costActionSupplierSummary,
  costActionSourceQuery,
  costActionSourceSummary,
  costActionAgeQuery,
  costActionAgeSummary,
  costActionCoverageQuery,
  costActionCoverageSummary,
  costDashboardQuery,
  costDashboardSummary,
  costHardeningQuery,
  costHardeningSummary,
  costGovernanceQuery,
  costGovernanceDetailsQuery,
  costGovernanceAuditQuery,
  costGovernanceSignoffQuery,
  costGovernanceReviewQueueQuery,
  costGovernanceReviewPackQuery,
  costGovernanceClosureQuery,
  costGovernanceHandoffQuery,
  costOperationsRunbookQuery,
  costOperationsControlQuery,
  costOperationsEvidenceQuery,
  costOperationsReadinessQuery,
  costGovernanceFinalQuery,
  costPerformanceQuery,
  costSecurityAuditQuery,
  costGovernanceSummary,
  costGovernanceDetails,
  costGovernanceAuditPack,
  costGovernanceSignoff,
  costGovernanceReviewQueue,
  costGovernanceReviewPack,
  costGovernanceClosureSummary,
  costGovernanceHandoffSummary,
  costOperationsRunbookSummary,
  costOperationsControlSummary,
  costOperationsEvidenceSummary,
  costOperationsReadinessSummary,
  costGovernanceFinalSummary,
  costPerformanceSummary,
  costSecurityAuditSummary,
  handleExportCostGovernanceAuditCsv,
  handleExportCostGovernanceReviewPackCsv,
  handleExportCostGovernanceClosureCsv,
  handleExportCostGovernanceHandoffCsv,
  handlePrintCostGovernanceAudit,
  costReportQuery,
  costReportSummary,
  handleExportCostReportCsv,
  handlePrintCostReport,
  costAlertQuery,
  costAlertSummary,
  costRecommendationQuery,
  costRecommendationSummary,
  costActionDetailsQuery,
  costActionDetails,
  costActionDetailFilters,
  setCostActionDetailFilters,
  handleExportCostActionDetailsCsv,
  costRiskQuery,
  costRiskDetailsQuery,
  costRiskSummary,
  costRiskDetails,
  costRiskDetailFilters,
  setCostRiskDetailFilters,
  handleExportCostRiskDetailsCsv
}: ProductCostAnalyticsSectionsPanelProps) {
  return (
    <>
      <ProductCostingReadinessPanel
        costingReadiness={costingReadiness}
        onCategoryFilterChange={setCategoryFilter}
      />

      <ProductCostValuationPanel
        costValuationQuery={costValuationQuery}
        costValuationSummary={costValuationSummary}
        costValuationDetailsQuery={costValuationDetailsQuery}
        costValuationDetails={costValuationDetails}
        costValuationDetailFilters={costValuationDetailFilters}
        setCostValuationDetailFilters={setCostValuationDetailFilters}
        onOpenCostHistory={handleOpenCostHistory}
        onExportCostValuationDetailsCsv={handleExportCostValuationDetailsCsv}
        onViewCategory={setCategoryFilter}
      />

      <ProductCostActionSummaryPanel
        costActionQuery={costActionQuery}
        costActionSummary={costActionSummary}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostActionPlanPanel
        costActionPlanQuery={costActionPlanQuery}
        costActionPlan={costActionPlan}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostActionCategoryPanel
        costActionCategoryQuery={costActionCategoryQuery}
        costActionCategorySummary={costActionCategorySummary}
      />

      <ProductCostActionImpactPanel
        costActionImpactQuery={costActionImpactQuery}
        costActionImpactSummary={costActionImpactSummary}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostActionSupplierPanel
        costActionSupplierQuery={costActionSupplierQuery}
        costActionSupplierSummary={costActionSupplierSummary}
      />

      <ProductCostActionSourcePanel
        costActionSourceQuery={costActionSourceQuery}
        costActionSourceSummary={costActionSourceSummary}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostActionAgePanel
        costActionAgeQuery={costActionAgeQuery}
        costActionAgeSummary={costActionAgeSummary}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostActionCoveragePanel
        costActionCoverageQuery={costActionCoverageQuery}
        costActionCoverageSummary={costActionCoverageSummary}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostDashboardSummaryPanel
        costDashboardQuery={costDashboardQuery}
        costDashboardSummary={costDashboardSummary}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostHardeningSummaryPanel
        costHardeningQuery={costHardeningQuery}
        costHardeningSummary={costHardeningSummary}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostGovernanceSummaryPanel
        costGovernanceQuery={costGovernanceQuery}
        costGovernanceDetailsQuery={costGovernanceDetailsQuery}
        costGovernanceAuditQuery={costGovernanceAuditQuery}
        costGovernanceSignoffQuery={costGovernanceSignoffQuery}
        costGovernanceReviewQueueQuery={costGovernanceReviewQueueQuery}
        costGovernanceReviewPackQuery={costGovernanceReviewPackQuery}
        costGovernanceClosureQuery={costGovernanceClosureQuery}
        costGovernanceHandoffQuery={costGovernanceHandoffQuery}
        costOperationsRunbookQuery={costOperationsRunbookQuery}
        costOperationsControlQuery={costOperationsControlQuery}
        costOperationsEvidenceQuery={costOperationsEvidenceQuery}
        costOperationsReadinessQuery={costOperationsReadinessQuery}
        costGovernanceFinalQuery={costGovernanceFinalQuery}
        costPerformanceQuery={costPerformanceQuery}
        costSecurityAuditQuery={costSecurityAuditQuery}
        costGovernanceSummary={costGovernanceSummary}
        costGovernanceDetails={costGovernanceDetails}
        costGovernanceAuditPack={costGovernanceAuditPack}
        costGovernanceSignoff={costGovernanceSignoff}
        costGovernanceReviewQueue={costGovernanceReviewQueue}
        costGovernanceReviewPack={costGovernanceReviewPack}
        costGovernanceClosureSummary={costGovernanceClosureSummary}
        costGovernanceHandoffSummary={costGovernanceHandoffSummary}
        costOperationsRunbookSummary={costOperationsRunbookSummary}
        costOperationsControlSummary={costOperationsControlSummary}
        costOperationsEvidenceSummary={costOperationsEvidenceSummary}
        costOperationsReadinessSummary={costOperationsReadinessSummary}
        costGovernanceFinalSummary={costGovernanceFinalSummary}
        costPerformanceSummary={costPerformanceSummary}
        costSecurityAuditSummary={costSecurityAuditSummary}
        handleExportCostGovernanceAuditCsv={handleExportCostGovernanceAuditCsv}
        handleExportCostGovernanceReviewPackCsv={handleExportCostGovernanceReviewPackCsv}
        handleExportCostGovernanceClosureCsv={handleExportCostGovernanceClosureCsv}
        handleExportCostGovernanceHandoffCsv={handleExportCostGovernanceHandoffCsv}
        handlePrintCostGovernanceAudit={handlePrintCostGovernanceAudit}
        handleOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostReportSummaryPanel
        costReportQuery={costReportQuery}
        costReportSummary={costReportSummary}
        onExportCostReportCsv={handleExportCostReportCsv}
        onPrintCostReport={handlePrintCostReport}
      />

      <ProductCostAlertSummaryPanel
        costAlertQuery={costAlertQuery}
        costAlertSummary={costAlertSummary}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostRecommendationSummaryPanel
        costRecommendationQuery={costRecommendationQuery}
        costRecommendationSummary={costRecommendationSummary}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostActionDetailsPanel
        costActionDetailsQuery={costActionDetailsQuery}
        costActionDetails={costActionDetails}
        costActionDetailFilters={costActionDetailFilters}
        setCostActionDetailFilters={setCostActionDetailFilters}
        onExportCostActionDetailsCsv={handleExportCostActionDetailsCsv}
        onOpenCostHistory={handleOpenCostHistory}
      />

      <ProductCostRiskSummaryPanel
        costRiskQuery={costRiskQuery}
        costRiskDetailsQuery={costRiskDetailsQuery}
        costRiskSummary={costRiskSummary}
        costRiskDetails={costRiskDetails}
        costRiskDetailFilters={costRiskDetailFilters}
        setCostRiskDetailFilters={setCostRiskDetailFilters}
        onExportCostRiskDetailsCsv={handleExportCostRiskDetailsCsv}
        onOpenCostHistory={handleOpenCostHistory}
      />
    </>
  );
}
