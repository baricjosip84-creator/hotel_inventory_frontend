import type { ProductCostActionImpactSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatImpactType, formatMoney, formatPercent, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostActionImpactQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionImpactPanelProps = {
  costActionImpactQuery: CostActionImpactQueryState;
  costActionImpactSummary?: ProductCostActionImpactSummaryResponse;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostActionImpactPanel({
  costActionImpactQuery,
  costActionImpactSummary,
  onOpenCostHistory
}: ProductCostActionImpactPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Action Impact</h3>
          <p style={styles.panelSubtitle}>
            Impact-focused view of costing actions, separating valued inventory review from unvalued stock follow-up. Read-only and audit-safe.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionImpactQuery.refetch()}
        >
          Refresh Impact
        </button>
      </div>

      {costActionImpactQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost action impact...</div>
      ) : costActionImpactQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost action impact.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Valued Reviews"
              value={toNumber(costActionImpactSummary?.totals.valued_inventory_review_products)}
              subtitle="Actions with estimated inventory value"
              tone={toNumber(costActionImpactSummary?.totals.valued_inventory_review_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Unvalued Stock"
              value={toNumber(costActionImpactSummary?.totals.unvalued_stock_review_products)}
              subtitle={`${toNumber(costActionImpactSummary?.totals.unvalued_action_stock_quantity).toLocaleString()} units need cost basis`}
              tone={toNumber(costActionImpactSummary?.totals.unvalued_stock_review_products) > 0 ? 'bad' : 'good'}
            />
            <StatCard
              title="Impact Value"
              value={formatMoney(costActionImpactSummary?.totals.total_actionable_estimated_value)}
              subtitle="Estimated value under cost review"
              tone={toNumber(costActionImpactSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Impact breakdown</h4>
              {(costActionImpactSummary?.impact_breakdown ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No cost action impact found.</div>
              ) : (
                (costActionImpactSummary?.impact_breakdown ?? []).map((row) => (
                  <div key={row.impact_type} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{formatImpactType(row.impact_type)}</div>
                      <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units • {formatMoney(row.estimated_inventory_value)} • avg priority {formatPercent(row.average_priority_score)}</div>
                    </div>
                    <strong>{toNumber(row.product_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Top impact products</h4>
              {(costActionImpactSummary?.top_impact_products ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No impact products found.</div>
              ) : (
                (costActionImpactSummary?.top_impact_products ?? []).map((row) => (
                  <div key={`${row.id}-${row.impact_type || 'impact'}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.name}</div>
                      <div style={styles.rowSubtle}>{formatImpactType(row.impact_type)} • {formatActionType(row.action_type)} • {formatMoney(row.estimated_inventory_value)}</div>
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
