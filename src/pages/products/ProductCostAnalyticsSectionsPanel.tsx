import type { useProductPageViewModel } from './useProductPageViewModel';
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
import { styles } from './productStyles';

type ProductCostAnalyticsSectionsPanelProps = ReturnType<typeof useProductPageViewModel>;

function CostWorkspaceIntro({ title, description }: { title: string; description: string }) {
  return (
    <section className="products-cost-intro" style={styles.panel}>
      <span className="products-cost-intro__eyebrow">Cost intelligence</span>
      <h3 style={styles.panelTitle}>{title}</h3>
      <p style={{ ...styles.panelSubtitle, marginBottom: 0 }}>{description}</p>
    </section>
  );
}

export function ProductCostAnalyticsSectionsPanel(props: ProductCostAnalyticsSectionsPanelProps) {
  if (props.workspaceView === 'valuation') {
    return (
      <>
        <CostWorkspaceIntro
          title="Cost & valuation"
          description="Review cost coverage and estimated stock value without changing products, stock, shipments, or receiving records."
        />

        <ProductCostingReadinessPanel
          costingReadiness={props.costingReadiness}
          onCategoryFilterChange={props.setCategoryFilter}
        />

        <ProductCostValuationPanel
          costValuationQuery={props.costValuationQuery}
          costValuationSummary={props.costValuationSummary}
          costValuationDetailsQuery={props.costValuationDetailsQuery}
          costValuationDetails={props.costValuationDetails}
          costValuationDetailFilters={props.costValuationDetailFilters}
          setCostValuationDetailFilters={props.setCostValuationDetailFilters}
          onOpenCostHistory={props.handleOpenCostHistory}
          onExportCostValuationDetailsCsv={props.handleExportCostValuationDetailsCsv}
          onViewCategory={props.setCategoryFilter}
        />

        <ProductCostDashboardSummaryPanel
          costDashboardQuery={props.costDashboardQuery}
          costDashboardSummary={props.costDashboardSummary}
          onOpenCostHistory={props.handleOpenCostHistory}
        />
      </>
    );
  }

  if (props.workspaceView === 'actions') {
    return (
      <>
        <CostWorkspaceIntro
          title="Cost review"
          description="Work through cost exceptions, recommendations, and supporting evidence. These sections are read-only and point people back to audited product and receiving workflows for any actual change."
        />

        <ProductCostActionSummaryPanel
          costActionQuery={props.costActionQuery}
          costActionSummary={props.costActionSummary}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostActionPlanPanel
          costActionPlanQuery={props.costActionPlanQuery}
          costActionPlan={props.costActionPlan}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostRecommendationSummaryPanel
          costRecommendationQuery={props.costRecommendationQuery}
          costRecommendationSummary={props.costRecommendationSummary}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostAlertSummaryPanel
          costAlertQuery={props.costAlertQuery}
          costAlertSummary={props.costAlertSummary}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostActionCategoryPanel
          costActionCategoryQuery={props.costActionCategoryQuery}
          costActionCategorySummary={props.costActionCategorySummary}
        />

        <ProductCostActionImpactPanel
          costActionImpactQuery={props.costActionImpactQuery}
          costActionImpactSummary={props.costActionImpactSummary}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostActionSupplierPanel
          costActionSupplierQuery={props.costActionSupplierQuery}
          costActionSupplierSummary={props.costActionSupplierSummary}
        />

        <ProductCostActionSourcePanel
          costActionSourceQuery={props.costActionSourceQuery}
          costActionSourceSummary={props.costActionSourceSummary}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostActionAgePanel
          costActionAgeQuery={props.costActionAgeQuery}
          costActionAgeSummary={props.costActionAgeSummary}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostActionCoveragePanel
          costActionCoverageQuery={props.costActionCoverageQuery}
          costActionCoverageSummary={props.costActionCoverageSummary}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostActionDetailsPanel
          costActionDetailsQuery={props.costActionDetailsQuery}
          costActionDetails={props.costActionDetails}
          costActionDetailFilters={props.costActionDetailFilters}
          setCostActionDetailFilters={props.setCostActionDetailFilters}
          onExportCostActionDetailsCsv={props.handleExportCostActionDetailsCsv}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostRiskSummaryPanel
          costRiskQuery={props.costRiskQuery}
          costRiskDetailsQuery={props.costRiskDetailsQuery}
          costRiskSummary={props.costRiskSummary}
          costRiskDetails={props.costRiskDetails}
          costRiskDetailFilters={props.costRiskDetailFilters}
          setCostRiskDetailFilters={props.setCostRiskDetailFilters}
          onExportCostRiskDetailsCsv={props.handleExportCostRiskDetailsCsv}
          onOpenCostHistory={props.handleOpenCostHistory}
        />
      </>
    );
  }

  if (props.workspaceView === 'governance') {
    return (
      <>
        <CostWorkspaceIntro
          title="Cost controls & audit"
          description="Review finance-close readiness, hardening checks, governance evidence, and exportable audit material. This remains tenant-scoped and does not automatically change cost or stock records."
        />

        <ProductCostHardeningSummaryPanel
          costHardeningQuery={props.costHardeningQuery}
          costHardeningSummary={props.costHardeningSummary}
          onOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostGovernanceSummaryPanel
          costGovernanceQuery={props.costGovernanceQuery}
          costGovernanceDetailsQuery={props.costGovernanceDetailsQuery}
          costGovernanceAuditQuery={props.costGovernanceAuditQuery}
          costGovernanceSignoffQuery={props.costGovernanceSignoffQuery}
          costGovernanceReviewQueueQuery={props.costGovernanceReviewQueueQuery}
          costGovernanceReviewPackQuery={props.costGovernanceReviewPackQuery}
          costGovernanceClosureQuery={props.costGovernanceClosureQuery}
          costGovernanceHandoffQuery={props.costGovernanceHandoffQuery}
          costOperationsRunbookQuery={props.costOperationsRunbookQuery}
          costOperationsControlQuery={props.costOperationsControlQuery}
          costOperationsEvidenceQuery={props.costOperationsEvidenceQuery}
          costOperationsReadinessQuery={props.costOperationsReadinessQuery}
          costGovernanceFinalQuery={props.costGovernanceFinalQuery}
          costPerformanceQuery={props.costPerformanceQuery}
          costSecurityAuditQuery={props.costSecurityAuditQuery}
          costGovernanceSummary={props.costGovernanceSummary}
          costGovernanceDetails={props.costGovernanceDetails}
          costGovernanceAuditPack={props.costGovernanceAuditPack}
          costGovernanceSignoff={props.costGovernanceSignoff}
          costGovernanceReviewQueue={props.costGovernanceReviewQueue}
          costGovernanceReviewPack={props.costGovernanceReviewPack}
          costGovernanceClosureSummary={props.costGovernanceClosureSummary}
          costGovernanceHandoffSummary={props.costGovernanceHandoffSummary}
          costOperationsRunbookSummary={props.costOperationsRunbookSummary}
          costOperationsControlSummary={props.costOperationsControlSummary}
          costOperationsEvidenceSummary={props.costOperationsEvidenceSummary}
          costOperationsReadinessSummary={props.costOperationsReadinessSummary}
          costGovernanceFinalSummary={props.costGovernanceFinalSummary}
          costPerformanceSummary={props.costPerformanceSummary}
          costSecurityAuditSummary={props.costSecurityAuditSummary}
          handleExportCostGovernanceAuditCsv={props.handleExportCostGovernanceAuditCsv}
          handleExportCostGovernanceReviewPackCsv={props.handleExportCostGovernanceReviewPackCsv}
          handleExportCostGovernanceClosureCsv={props.handleExportCostGovernanceClosureCsv}
          handleExportCostGovernanceHandoffCsv={props.handleExportCostGovernanceHandoffCsv}
          handlePrintCostGovernanceAudit={props.handlePrintCostGovernanceAudit}
          handleOpenCostHistory={props.handleOpenCostHistory}
        />

        <ProductCostReportSummaryPanel
          costReportQuery={props.costReportQuery}
          costReportSummary={props.costReportSummary}
          onExportCostReportCsv={props.handleExportCostReportCsv}
          onPrintCostReport={props.handlePrintCostReport}
        />
      </>
    );
  }

  return null;
}
