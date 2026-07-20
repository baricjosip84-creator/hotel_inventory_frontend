import { DataTable, MetricCard } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatNumber } from '../EnterpriseInventoryFormat';
import type {
  DepletionRiskRow,
  InventoryAnomaly,
  OperationalHealthResponse,
  ReorderRecommendation,
  SupplierTrustScore
} from '../EnterpriseInventoryTypes';

type InsightsSummary = {
  criticalReorders: number;
  highRiskStockRows: number;
  supplierRiskRows: number;
  highAnomalies: number;
};

type InsightsTabProps = {
  operationalHealth?: OperationalHealthResponse;
  operationalHealthLoading: boolean;
  inventoryAnomalies: InventoryAnomaly[];
  inventoryAnomaliesLoading: boolean;
  reorderRecommendations: ReorderRecommendation[];
  reorderRecommendationsLoading: boolean;
  depletionRiskRows: DepletionRiskRow[];
  depletionRiskLoading: boolean;
  supplierTrustScores: SupplierTrustScore[];
  supplierTrustScoresLoading: boolean;
  insightsSummary: InsightsSummary;
};

export function InsightsTab({
  operationalHealth,
  operationalHealthLoading,
  inventoryAnomalies,
  inventoryAnomaliesLoading,
  reorderRecommendations,
  reorderRecommendationsLoading,
  depletionRiskRows,
  depletionRiskLoading,
  supplierTrustScores,
  supplierTrustScoresLoading,
  insightsSummary
}: InsightsTabProps) {
  return (
    <section style={styles.stack}>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Operational insights</h2>
        <p style={styles.helper}>Reads the existing analytics endpoints for operational health, inventory anomalies, reorder recommendations, depletion risk, and supplier trust scores.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Health score" value={operationalHealth ? formatNumber(operationalHealth.health_score) : '-'} helper={operationalHealth?.health_tier || 'not loaded'} />
          <MetricCard label="Critical reorders" value={insightsSummary.criticalReorders} />
          <MetricCard label="High-risk stock rows" value={insightsSummary.highRiskStockRows} />
          <MetricCard label="High anomalies" value={insightsSummary.highAnomalies} />
          <MetricCard label="Suppliers with risk" value={insightsSummary.supplierRiskRows} />
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Operational health drivers</h2>
        <DataTable
          loading={operationalHealthLoading}
          empty="Operational health has not loaded."
          headers={['Metric', 'Value']}
          rows={operationalHealth ? [
            ['Unresolved alerts', formatNumber(operationalHealth.metrics?.unresolved_alerts)],
            ['Overdue shipments', formatNumber(operationalHealth.metrics?.overdue_shipments)],
            ['Low-stock rows', formatNumber(operationalHealth.metrics?.low_stock_rows)],
            ['Low-stock rate', `${formatNumber(operationalHealth.metrics?.low_stock_rate_pct)}%`],
            ['Discrepancy rate', `${formatNumber(operationalHealth.metrics?.discrepancy_rate_pct)}%`],
            ['Alert penalty', formatNumber(operationalHealth.penalties?.alert_penalty)],
            ['Overdue penalty', formatNumber(operationalHealth.penalties?.overdue_penalty)],
            ['Low-stock penalty', formatNumber(operationalHealth.penalties?.low_stock_penalty)],
            ['Discrepancy penalty', formatNumber(operationalHealth.penalties?.discrepancy_penalty)]
          ] : []}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Inventory anomalies</h2>
        <p style={styles.helper}>Uses the real GET /operational-insights/anomalies route with a 7-day short window and 30-day baseline.</p>
        <DataTable
          loading={inventoryAnomaliesLoading}
          empty="No inventory anomalies returned."
          headers={['Product', 'Recent outbound', 'Baseline outbound', 'Recent daily', 'Baseline daily', 'Spike ratio', 'Score', 'Tier']}
          rows={inventoryAnomalies.map((item) => [
            item.product_name || item.product_id,
            `${formatNumber(item.recent_outbound_quantity)} ${item.product_unit || ''}`.trim(),
            `${formatNumber(item.baseline_outbound_quantity)} ${item.product_unit || ''}`.trim(),
            formatNumber(item.recent_daily_outbound),
            formatNumber(item.baseline_daily_outbound),
            formatNumber(item.spike_ratio),
            formatNumber(item.anomaly_score),
            item.anomaly_tier
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Reorder recommendations</h2>
        <DataTable
          loading={reorderRecommendationsLoading}
          empty="No reorder recommendations returned."
          headers={['Product', 'Current', 'Min', 'Recent outbound', 'Daily usage', 'Coverage days', 'Recommended reorder', 'Urgency']}
          rows={reorderRecommendations.map((item) => [
            item.product_name || item.product_id,
            formatNumber(item.current_quantity),
            formatNumber(item.min_stock),
            formatNumber(item.recent_outbound),
            formatNumber(item.average_daily_usage),
            item.estimated_days_of_coverage === null || item.estimated_days_of_coverage === undefined ? '-' : formatNumber(item.estimated_days_of_coverage),
            `${formatNumber(item.recommended_reorder_quantity)} ${item.unit || ''}`.trim(),
            item.urgency
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Depletion risk</h2>
        <DataTable
          loading={depletionRiskLoading}
          empty="No depletion risk rows returned."
          headers={['Product', 'Location', 'On hand', 'Configured min', 'Recent outbound', 'Daily outbound', 'Coverage days', 'Risk score', 'Risk tier']}
          rows={depletionRiskRows.map((item) => [
            item.product_name || item.product_id,
            item.storage_location_name || item.storage_location_id,
            formatNumber(item.current_quantity),
            formatNumber(item.configured_min_quantity),
            formatNumber(item.recent_outbound_quantity),
            formatNumber(item.average_daily_outbound),
            item.estimated_days_of_coverage === null || item.estimated_days_of_coverage === undefined ? '-' : formatNumber(item.estimated_days_of_coverage),
            formatNumber(item.risk_score),
            item.risk_tier
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Supplier trust scores</h2>
        <DataTable
          loading={supplierTrustScoresLoading}
          empty="No supplier trust scores returned."
          headers={['Supplier', 'Trust score', 'Tier', 'Fill rate', 'Discrepancy rate', 'Overdue shipments', 'Open POs', 'PO remaining value', 'Risk flags']}
          rows={supplierTrustScores.map((item) => [
            item.supplier_name || item.supplier_id,
            formatNumber(item.trust_score),
            item.trust_tier,
            `${formatNumber(item.fill_rate_pct)}%`,
            `${formatNumber(item.discrepancy_rate_pct)}%`,
            formatNumber(item.overdue_shipments),
            formatNumber(item.open_purchase_orders),
            formatNumber(item.po_remaining_value),
            (item.risk_flags ?? []).map((flag) => flag.label || flag.code || flag.severity || 'risk').join(', ') || '-'
          ])}
        />
      </section>
    </section>
  );
}
