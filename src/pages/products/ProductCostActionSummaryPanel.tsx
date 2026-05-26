import type { ProductCostActionSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostActionQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionSummaryPanelProps = {
  costActionQuery: CostActionQueryState;
  costActionSummary?: ProductCostActionSummaryResponse;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostActionSummaryPanel({
  costActionQuery,
  costActionSummary,
  onOpenCostHistory
}: ProductCostActionSummaryPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Action Summary</h3>
          <p style={styles.panelSubtitle}>
            Prioritized costing worklist generated from missing costs, high variance, and inconsistent cost history. Read-only and audit-safe.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionQuery.refetch()}
        >
          Refresh Actions
        </button>
      </div>

      {costActionQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost action summary...</div>
      ) : costActionQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost action summary.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Actionable Products"
              value={toNumber(costActionSummary?.totals.total_actionable_products)}
              subtitle="Highest-priority cost action per product"
              tone={toNumber(costActionSummary?.totals.total_actionable_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Actionable Stock"
              value={toNumber(costActionSummary?.totals.actionable_stock_quantity).toLocaleString()}
              subtitle="Units affected by costing actions"
              tone={toNumber(costActionSummary?.totals.actionable_stock_quantity) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Actionable Value"
              value={formatMoney(costActionSummary?.totals.actionable_estimated_inventory_value)}
              subtitle="Estimated value under review"
              tone={toNumber(costActionSummary?.totals.actionable_estimated_inventory_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Action breakdown</h4>
              {(costActionSummary?.action_breakdown ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No cost actions are currently required.</div>
              ) : (
                (costActionSummary?.action_breakdown ?? []).map((row) => (
                  <div key={row.action_type} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{formatActionType(row.action_type)}</div>
                      <div style={styles.rowSubtle}>{row.recommended_action}</div>
                    </div>
                    <strong>{toNumber(row.product_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Category hotspots</h4>
              {(costActionSummary?.category_hotspots ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No category hotspots found.</div>
              ) : (
                (costActionSummary?.category_hotspots ?? []).map((row) => (
                  <div key={row.category} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.category}</div>
                      <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units • {formatMoney(row.estimated_inventory_value)}</div>
                    </div>
                    <strong>{toNumber(row.product_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Priority products</h4>
              {(costActionSummary?.priority_products ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No priority cost products found.</div>
              ) : (
                (costActionSummary?.priority_products ?? []).map((row) => (
                  <div key={`${row.id}-${row.action_type || 'action'}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.name}</div>
                      <div style={styles.rowSubtle}>{formatActionType(row.action_type)} • {row.recommended_action}</div>
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
