import type { ProductCostAlertSummaryResponse } from '../../types/inventory';
import {
  formatCostAlertSeverity,
  formatCostAlertType,
  formatMoney,
  toNumber
} from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostAlertQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostAlertSummaryPanelProps = {
  costAlertQuery: CostAlertQueryState;
  costAlertSummary?: ProductCostAlertSummaryResponse;
  onOpenCostHistory: (product: ProductCostAlertSummaryResponse['top_alerts'][number]) => void;
};

export function ProductCostAlertSummaryPanel({
  costAlertQuery,
  costAlertSummary,
  onOpenCostHistory
}: ProductCostAlertSummaryPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Alerts</h3>
          <p style={styles.panelSubtitle}>
            Trigger-style costing signals for missing costs, high variance, sudden cost spikes, stale evidence, and inconsistent cost history. Read-only and derived from existing cost data.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costAlertQuery.refetch()}
        >
          Refresh Alerts
        </button>
      </div>

      {costAlertQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost alerts...</div>
      ) : costAlertQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost alerts.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Total Alerts"
              value={toNumber(costAlertSummary?.totals.total_alerts)}
              subtitle="Active derived cost signals"
              tone={toNumber(costAlertSummary?.totals.total_alerts) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Critical"
              value={toNumber(costAlertSummary?.totals.critical_alerts)}
              subtitle="Immediate cost follow-up"
              tone={toNumber(costAlertSummary?.totals.critical_alerts) > 0 ? 'bad' : 'good'}
            />
            <StatCard
              title="Warnings"
              value={toNumber(costAlertSummary?.totals.warning_alerts)}
              subtitle="Review recommended"
              tone={toNumber(costAlertSummary?.totals.warning_alerts) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Alerted Value"
              value={formatMoney(costAlertSummary?.totals.alerted_estimated_value)}
              subtitle="Estimated value under alert"
              tone={toNumber(costAlertSummary?.totals.alerted_estimated_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Alert groups</h4>
              {(costAlertSummary?.alert_groups ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No active cost alerts.</div>
              ) : (
                (costAlertSummary?.alert_groups ?? []).map((row) => (
                  <div key={`${row.alert_type}-${row.alert_severity}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{formatCostAlertType(row.alert_type)}</div>
                      <div style={styles.rowSubtle}>
                        {formatCostAlertSeverity(row.alert_severity)} • {formatMoney(row.estimated_inventory_value)} alerted value
                      </div>
                      <div style={styles.rowSubtle}>{row.recommended_alert_action}</div>
                    </div>
                    <strong>{toNumber(row.alert_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Top alert products</h4>
              {(costAlertSummary?.top_alerts ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No alert products found.</div>
              ) : (
                (costAlertSummary?.top_alerts ?? []).map((row) => (
                  <div key={`${row.id}-${row.alert_type || 'alert'}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.name}</div>
                      <div style={styles.rowSubtle}>
                        {formatCostAlertSeverity(row.alert_severity)} • {formatCostAlertType(row.alert_type)} • {formatMoney(row.estimated_inventory_value)}
                      </div>
                      <div style={styles.rowSubtle}>{row.recommended_alert_action}</div>
                    </div>
                    <button type="button" style={styles.secondaryButton} onClick={() => onOpenCostHistory(row)}>
                      History
                    </button>
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
