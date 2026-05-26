import type { ProductCostActionPlanSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatMoney, formatPriorityBand, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostActionPlanQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionPlanPanelProps = {
  costActionPlanQuery: CostActionPlanQueryState;
  costActionPlan?: ProductCostActionPlanSummaryResponse;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostActionPlanPanel({
  costActionPlanQuery,
  costActionPlan,
  onOpenCostHistory
}: ProductCostActionPlanPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Action Plan</h3>
          <p style={styles.panelSubtitle}>
            Priority-band planning view for costing follow-up. Read-only grouping from the action worklist; no stock or cost records are changed.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionPlanQuery.refetch()}
        >
          Refresh Plan
        </button>
      </div>

      {costActionPlanQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost action plan...</div>
      ) : costActionPlanQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost action plan.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Critical Actions"
              value={toNumber(costActionPlan?.totals.critical_products)}
              subtitle="Priority score 75+"
              tone={toNumber(costActionPlan?.totals.critical_products) > 0 ? 'bad' : 'good'}
            />
            <StatCard
              title="High Actions"
              value={toNumber(costActionPlan?.totals.high_products)}
              subtitle="Priority score 35+"
              tone={toNumber(costActionPlan?.totals.high_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Watch Actions"
              value={toNumber(costActionPlan?.totals.watch_products)}
              subtitle="Lower-priority follow-up"
              tone={toNumber(costActionPlan?.totals.watch_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Urgent Value"
              value={formatMoney(costActionPlan?.totals.urgent_estimated_inventory_value)}
              subtitle="Critical + high estimated value"
              tone={toNumber(costActionPlan?.totals.urgent_estimated_inventory_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Priority bands</h4>
              {(costActionPlan?.priority_bands ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No action-plan priority bands found.</div>
              ) : (
                (costActionPlan?.priority_bands ?? []).map((row) => (
                  <div key={row.priority_band} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{formatPriorityBand(row.priority_band)}</div>
                      <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units • {formatMoney(row.estimated_inventory_value)}</div>
                    </div>
                    <strong>{toNumber(row.product_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Next actions</h4>
              {(costActionPlan?.next_actions ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No next cost actions found.</div>
              ) : (
                (costActionPlan?.next_actions ?? []).map((row) => (
                  <div key={`${row.id}-${row.priority_band || 'plan'}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.name}</div>
                      <div style={styles.rowSubtle}>{formatPriorityBand(row.priority_band)} • {formatActionType(row.action_type)}</div>
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
