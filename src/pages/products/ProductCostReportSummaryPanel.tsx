import type { ProductCostReportSummaryResponse } from '../../types/inventory';
import { formatGovernanceValue, formatMoney, formatStatusLabel, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';

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
  const { ui, locale } = useAppTranslation();
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost Report Summary")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Export-ready costing snapshot combining dashboard totals, valuation, risk, alerts, and recommendations for finance review. Read-only reporting only.")}
          </p>
        </div>
        <div style={styles.actionRow}>
          <button type="button" style={styles.secondaryButton} onClick={() => costReportQuery.refetch()}>
            {ui("Refresh Report")}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onExportCostReportCsv} disabled={!costReportSummary?.export_rows?.length}>
            {ui("Export Report CSV")}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onPrintCostReport} disabled={!costReportSummary}>
            {ui("Print Report")}
          </button>
        </div>
      </div>

      {costReportQuery.isLoading ? (
        <div style={styles.emptyCell}>{ui("Loading cost report...")}</div>
      ) : costReportQuery.isError ? (
        <div style={styles.errorBox}>{ui("Unable to load cost report summary.")}</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title={ui("Report Value")}
              value={formatMoney(costReportSummary?.dashboard_totals.total_estimated_inventory_value, locale)}
              subtitle={ui("Estimated stocked value")}
              tone="good"
            />
            <StatCard
              title={ui("Review Exposure")}
              value={formatMoney(costReportSummary?.dashboard_totals.review_estimated_value, locale)}
              subtitle={ui("Value needing costing review")}
              tone={toNumber(costReportSummary?.dashboard_totals.review_estimated_value) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Alerts")}
              value={toNumber(costReportSummary?.alert_totals.total_alerts)}
              subtitle={ui("Derived alert signals")}
              tone={toNumber(costReportSummary?.alert_totals.total_alerts) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Recommendations")}
              value={toNumber(costReportSummary?.recommendation_totals.total_recommendations)}
              subtitle={ui("Review actions in report")}
              tone={toNumber(costReportSummary?.recommendation_totals.total_recommendations) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>{ui("Report metrics")}</h4>
              {(costReportSummary?.export_rows ?? []).map((row) => (
                <div key={`${row.section}-${row.metric}`} style={styles.riskListItem}>
                  <div>
                    <div style={styles.rowTitle}>{ui(formatStatusLabel(row.metric))}</div>
                    <div style={styles.rowSubtle}>{ui(formatStatusLabel(row.section))}</div>
                  </div>
                  <strong>{ui(formatGovernanceValue(row.value, locale))}</strong>
                </div>
              ))}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>{ui("Report actions")}</h4>
              {(costReportSummary?.executive_actions ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>{ui("No report actions found.")}</div>
              ) : (
                (costReportSummary?.executive_actions ?? []).map((action) => (
                  <div key={action} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{action}</div>
                      <div style={styles.rowSubtle}>{ui("Included in CSV and print reporting snapshot.")}</div>
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
