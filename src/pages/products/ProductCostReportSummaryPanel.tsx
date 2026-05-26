import type { ProductCostReportSummaryResponse } from '../../types/inventory';
import { formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostReportQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostReportSummaryPanelProps = {
  costReportQuery: CostReportQueryState;
  costReportSummary?: ProductCostReportSummaryResponse;
  onExportCostReportCsv: () => void;
  onPrintCostReport: () => void;
};

export function ProductCostReportSummaryPanel({
  costReportQuery,
  costReportSummary,
  onExportCostReportCsv,
  onPrintCostReport
}: ProductCostReportSummaryPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Report Summary</h3>
          <p style={styles.panelSubtitle}>
            Export-ready costing snapshot combining dashboard totals, valuation, risk, alerts, and recommendations for finance review. Read-only reporting only.
          </p>
        </div>
        <div style={styles.actionRow}>
          <button type="button" style={styles.secondaryButton} onClick={() => costReportQuery.refetch()}>
            Refresh Report
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onExportCostReportCsv} disabled={!costReportSummary?.export_rows?.length}>
            Export Report CSV
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onPrintCostReport} disabled={!costReportSummary}>
            Print Report
          </button>
        </div>
      </div>

      {costReportQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost report...</div>
      ) : costReportQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost report summary.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Report Value"
              value={formatMoney(costReportSummary?.dashboard_totals.total_estimated_inventory_value)}
              subtitle="Estimated stocked value"
              tone="good"
            />
            <StatCard
              title="Review Exposure"
              value={formatMoney(costReportSummary?.dashboard_totals.review_estimated_value)}
              subtitle="Value needing costing review"
              tone={toNumber(costReportSummary?.dashboard_totals.review_estimated_value) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Alerts"
              value={toNumber(costReportSummary?.alert_totals.total_alerts)}
              subtitle="Derived alert signals"
              tone={toNumber(costReportSummary?.alert_totals.total_alerts) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Recommendations"
              value={toNumber(costReportSummary?.recommendation_totals.total_recommendations)}
              subtitle="Review actions in report"
              tone={toNumber(costReportSummary?.recommendation_totals.total_recommendations) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Report metrics</h4>
              {(costReportSummary?.export_rows ?? []).map((row) => (
                <div key={`${row.section}-${row.metric}`} style={styles.riskListItem}>
                  <div>
                    <div style={styles.rowTitle}>{row.metric.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')}</div>
                    <div style={styles.rowSubtle}>{row.section}</div>
                  </div>
                  <strong>{String(row.value)}</strong>
                </div>
              ))}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Report actions</h4>
              {(costReportSummary?.executive_actions ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No report actions found.</div>
              ) : (
                (costReportSummary?.executive_actions ?? []).map((action) => (
                  <div key={action} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{action}</div>
                      <div style={styles.rowSubtle}>Included in CSV and print reporting snapshot.</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
