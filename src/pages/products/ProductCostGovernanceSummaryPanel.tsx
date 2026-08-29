import type {
  ProductCostGovernanceAuditPackResponse,
  ProductCostGovernanceClosureSummaryResponse,
  ProductCostGovernanceDetailsResponse,
  ProductCostGovernanceFinalSummaryResponse,
  ProductCostGovernanceHandoffSummaryResponse,
  ProductCostGovernanceReviewPackResponse,
  ProductCostGovernanceReviewQueueResponse,
  ProductCostGovernanceSignoffSummaryResponse,
  ProductCostGovernanceSummaryResponse,
  ProductCostOperationsControlSummaryResponse,
  ProductCostOperationsEvidenceSummaryResponse,
  ProductCostOperationsReadinessSummaryResponse,
  ProductCostOperationsRunbookSummaryResponse,
  ProductCostPerformanceSummaryResponse,
  ProductCostSecurityAuditSummaryResponse
} from '../../types/inventory';
import { formatMoney, formatPercent, formatStatusLabel, toNumber } from './productFormatting';
import { ProductCostGovernanceDetailsPanel } from './ProductCostGovernanceDetailsPanel';
import { ProductCostOperationsSummaryPanel } from './ProductCostOperationsSummaryPanel';
import { ProductCostGovernanceReviewPanel } from './ProductCostGovernanceReviewPanel';
import { ProductCostGovernanceHandoffPanel } from './ProductCostGovernanceHandoffPanel';
import { ProductCostGovernanceFinalizationPanel } from './ProductCostGovernanceFinalizationPanel';
import { styles } from './productStyles';
import { StatCard, StatusBadge } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';

type CostGovernanceQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type GovernancePriorityProduct = ProductCostGovernanceDetailsResponse['priority_products'][number];

type ProductCostGovernanceSummaryPanelProps = {
  costGovernanceQuery: CostGovernanceQueryState;
  costGovernanceDetailsQuery: CostGovernanceQueryState;
  costGovernanceAuditQuery: CostGovernanceQueryState;
  costGovernanceSignoffQuery: CostGovernanceQueryState;
  costGovernanceReviewQueueQuery: CostGovernanceQueryState;
  costGovernanceReviewPackQuery: CostGovernanceQueryState;
  costGovernanceClosureQuery: CostGovernanceQueryState;
  costGovernanceHandoffQuery: CostGovernanceQueryState;
  costOperationsRunbookQuery: CostGovernanceQueryState;
  costOperationsControlQuery: CostGovernanceQueryState;
  costOperationsEvidenceQuery: CostGovernanceQueryState;
  costOperationsReadinessQuery: CostGovernanceQueryState;
  costGovernanceFinalQuery: CostGovernanceQueryState;
  costPerformanceQuery: CostGovernanceQueryState;
  costSecurityAuditQuery: CostGovernanceQueryState;
  costGovernanceSummary?: ProductCostGovernanceSummaryResponse;
  costGovernanceDetails?: ProductCostGovernanceDetailsResponse;
  costGovernanceAuditPack?: ProductCostGovernanceAuditPackResponse;
  costGovernanceSignoff?: ProductCostGovernanceSignoffSummaryResponse;
  costGovernanceReviewQueue?: ProductCostGovernanceReviewQueueResponse;
  costGovernanceReviewPack?: ProductCostGovernanceReviewPackResponse;
  costGovernanceClosureSummary?: ProductCostGovernanceClosureSummaryResponse;
  costGovernanceHandoffSummary?: ProductCostGovernanceHandoffSummaryResponse;
  costOperationsRunbookSummary?: ProductCostOperationsRunbookSummaryResponse;
  costOperationsControlSummary?: ProductCostOperationsControlSummaryResponse;
  costOperationsEvidenceSummary?: ProductCostOperationsEvidenceSummaryResponse;
  costOperationsReadinessSummary?: ProductCostOperationsReadinessSummaryResponse;
  costGovernanceFinalSummary?: ProductCostGovernanceFinalSummaryResponse;
  costPerformanceSummary?: ProductCostPerformanceSummaryResponse;
  costSecurityAuditSummary?: ProductCostSecurityAuditSummaryResponse;
  handleExportCostGovernanceAuditCsv: () => void;
  handleExportCostGovernanceReviewPackCsv: () => void;
  handleExportCostGovernanceClosureCsv: () => void;
  handleExportCostGovernanceHandoffCsv: () => void;
  handlePrintCostGovernanceAudit: () => void;
  handleOpenCostHistory: (product: GovernancePriorityProduct) => void;
};

export function ProductCostGovernanceSummaryPanel({
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
  handleOpenCostHistory
}: ProductCostGovernanceSummaryPanelProps) {
  const { ui, locale } = useAppTranslation();
  return (
      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>{ui("Cost Governance Summary")}</h3>
            <p style={styles.panelSubtitle}>
              {ui("Final read-only readiness check for the costing intelligence module, built from dashboard, report, and hardening outputs.")}
            </p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => { costGovernanceQuery.refetch(); costGovernanceDetailsQuery.refetch(); costGovernanceAuditQuery.refetch(); costGovernanceSignoffQuery.refetch(); costGovernanceReviewQueueQuery.refetch(); costGovernanceReviewPackQuery.refetch(); costGovernanceFinalQuery.refetch(); costPerformanceQuery.refetch(); costSecurityAuditQuery.refetch(); }}>
            {ui("Refresh Governance")}
          </button>
        </div>

        {costGovernanceQuery.isLoading ? (
          <div style={styles.emptyCell}>{ui("Loading cost governance...")}</div>
        ) : costGovernanceQuery.isError ? (
          <div style={styles.errorBox}>{ui("Unable to load cost governance summary.")}</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title={ui("Readiness Score")}
                value={formatPercent(costGovernanceSummary?.readiness_score, locale, 0)}
                subtitle={ui(formatStatusLabel(costGovernanceSummary?.governance_status))}
                tone={toNumber(costGovernanceSummary?.readiness_score) >= 90 ? 'good' : toNumber(costGovernanceSummary?.readiness_score) >= 70 ? 'warn' : 'bad'}
              />
              <StatCard
                title={ui("Coverage")}
                value={formatPercent(costGovernanceSummary?.totals.stocked_cost_coverage_percent, locale)}
                subtitle={ui("Stocked products with cost basis")}
                tone={toNumber(costGovernanceSummary?.totals.stocked_cost_coverage_percent) >= 95 ? 'good' : 'warn'}
              />
              <StatCard
                title={ui("Alerts")}
                value={toNumber(costGovernanceSummary?.totals.total_alerts)}
                subtitle={ui("Open derived signals")}
                tone={toNumber(costGovernanceSummary?.totals.total_alerts) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title={ui("Review Exposure")}
                value={formatMoney(costGovernanceSummary?.totals.review_estimated_value, locale)}
                subtitle={ui("Value needing review")}
                tone={toNumber(costGovernanceSummary?.totals.review_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>{ui("Governance checklist")}</h4>
                {(costGovernanceSummary?.checklist ?? []).map((item) => (
                  <div key={item.key} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{item.label}</div>
                      <div style={styles.rowSubtle}>{item.detail}</div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>{ui("Next actions")}</h4>
                {(costGovernanceSummary?.next_actions ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>{ui("No governance actions required.")}</div>
                ) : (
                  (costGovernanceSummary?.next_actions ?? []).map((action) => (
                    <div key={action} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{action}</div>
                        <div style={styles.rowSubtle}>{ui("Use existing costing review workflows; no automatic changes are made.")}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>



            <ProductCostGovernanceReviewPanel
              costGovernanceAuditQuery={costGovernanceAuditQuery}
              costGovernanceSignoffQuery={costGovernanceSignoffQuery}
              costGovernanceReviewQueueQuery={costGovernanceReviewQueueQuery}
              costGovernanceReviewPackQuery={costGovernanceReviewPackQuery}
              costGovernanceClosureQuery={costGovernanceClosureQuery}
              costGovernanceAuditPack={costGovernanceAuditPack}
              costGovernanceSignoff={costGovernanceSignoff}
              costGovernanceReviewQueue={costGovernanceReviewQueue}
              costGovernanceReviewPack={costGovernanceReviewPack}
              costGovernanceClosureSummary={costGovernanceClosureSummary}
              handleExportCostGovernanceAuditCsv={handleExportCostGovernanceAuditCsv}
              handleExportCostGovernanceReviewPackCsv={handleExportCostGovernanceReviewPackCsv}
              handleExportCostGovernanceClosureCsv={handleExportCostGovernanceClosureCsv}
              handlePrintCostGovernanceAudit={handlePrintCostGovernanceAudit}
            />

            <ProductCostOperationsSummaryPanel
              costOperationsRunbookQuery={costOperationsRunbookQuery}
              costOperationsControlQuery={costOperationsControlQuery}
              costOperationsEvidenceQuery={costOperationsEvidenceQuery}
              costOperationsReadinessQuery={costOperationsReadinessQuery}
              costOperationsRunbookSummary={costOperationsRunbookSummary}
              costOperationsControlSummary={costOperationsControlSummary}
              costOperationsEvidenceSummary={costOperationsEvidenceSummary}
              costOperationsReadinessSummary={costOperationsReadinessSummary}
            />

            <ProductCostGovernanceHandoffPanel
              costGovernanceHandoffQuery={costGovernanceHandoffQuery}
              costGovernanceHandoffSummary={costGovernanceHandoffSummary}
              handleExportCostGovernanceHandoffCsv={handleExportCostGovernanceHandoffCsv}
            />


            <ProductCostGovernanceFinalizationPanel
              costGovernanceFinalQuery={costGovernanceFinalQuery}
              costPerformanceQuery={costPerformanceQuery}
              costSecurityAuditQuery={costSecurityAuditQuery}
              costGovernanceFinalSummary={costGovernanceFinalSummary}
              costPerformanceSummary={costPerformanceSummary}
              costSecurityAuditSummary={costSecurityAuditSummary}
            />

            <ProductCostGovernanceDetailsPanel
              costGovernanceDetailsQuery={costGovernanceDetailsQuery}
              costGovernanceDetails={costGovernanceDetails}
              handleOpenCostHistory={handleOpenCostHistory}
            />
          </>
        )}
      </section>
  );
}
