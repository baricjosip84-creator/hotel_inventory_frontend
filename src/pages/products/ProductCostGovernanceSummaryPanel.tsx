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
import { formatMoney, toNumber } from './productFormatting';
import { ProductCostGovernanceDetailsPanel } from './ProductCostGovernanceDetailsPanel';
import { ProductCostOperationsSummaryPanel } from './ProductCostOperationsSummaryPanel';
import { ProductCostGovernanceReviewPanel } from './ProductCostGovernanceReviewPanel';
import { ProductCostGovernanceHandoffPanel } from './ProductCostGovernanceHandoffPanel';
import { ProductCostGovernanceFinalizationPanel } from './ProductCostGovernanceFinalizationPanel';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

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
  return (
      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Governance Summary</h3>
            <p style={styles.panelSubtitle}>
              Final read-only readiness check for the costing intelligence module, built from dashboard, report, and hardening outputs.
            </p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => { costGovernanceQuery.refetch(); costGovernanceDetailsQuery.refetch(); costGovernanceAuditQuery.refetch(); costGovernanceSignoffQuery.refetch(); costGovernanceReviewQueueQuery.refetch(); costGovernanceReviewPackQuery.refetch(); costGovernanceFinalQuery.refetch(); costPerformanceQuery.refetch(); costSecurityAuditQuery.refetch(); }}>
            Refresh Governance
          </button>
        </div>

        {costGovernanceQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost governance...</div>
        ) : costGovernanceQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost governance summary.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Readiness Score"
                value={`${toNumber(costGovernanceSummary?.readiness_score).toFixed(0)}%`}
                subtitle={costGovernanceSummary?.governance_status || 'unknown'}
                tone={toNumber(costGovernanceSummary?.readiness_score) >= 90 ? 'good' : toNumber(costGovernanceSummary?.readiness_score) >= 70 ? 'warn' : 'bad'}
              />
              <StatCard
                title="Coverage"
                value={`${toNumber(costGovernanceSummary?.totals.stocked_cost_coverage_percent).toFixed(1)}%`}
                subtitle="Stocked products with cost basis"
                tone={toNumber(costGovernanceSummary?.totals.stocked_cost_coverage_percent) >= 95 ? 'good' : 'warn'}
              />
              <StatCard
                title="Alerts"
                value={toNumber(costGovernanceSummary?.totals.total_alerts)}
                subtitle="Open derived signals"
                tone={toNumber(costGovernanceSummary?.totals.total_alerts) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Review Exposure"
                value={formatMoney(costGovernanceSummary?.totals.review_estimated_value)}
                subtitle="Value needing review"
                tone={toNumber(costGovernanceSummary?.totals.review_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Governance checklist</h4>
                {(costGovernanceSummary?.checklist ?? []).map((item) => (
                  <div key={item.key} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{item.label}</div>
                      <div style={styles.rowSubtle}>{item.detail}</div>
                    </div>
                    <span style={styles.badge}>{item.status}</span>
                  </div>
                ))}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Next actions</h4>
                {(costGovernanceSummary?.next_actions ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No governance actions required.</div>
                ) : (
                  (costGovernanceSummary?.next_actions ?? []).map((action) => (
                    <div key={action} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{action}</div>
                        <div style={styles.rowSubtle}>Use existing costing review workflows; no automatic changes are made.</div>
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
