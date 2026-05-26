import type { ProductCostActionAgeSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatCostAgeBand, formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostActionAgeQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionAgePanelProps = {
  costActionAgeQuery: CostActionAgeQueryState;
  costActionAgeSummary?: ProductCostActionAgeSummaryResponse;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostActionAgePanel({
  costActionAgeQuery,
  costActionAgeSummary,
  onOpenCostHistory
}: ProductCostActionAgePanelProps) {
  return (
    <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Age</h3>
            <p style={styles.panelSubtitle}>
              Freshness view of actionable cost evidence, highlighting missing dates, standard-only fallback, and stale received costs.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionAgeQuery.refetch()}
          >
            Refresh Age
          </button>
        </div>

        {costActionAgeQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action age...</div>
        ) : costActionAgeQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action age.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="No Cost Date"
                value={toNumber(costActionAgeSummary?.totals.no_cost_date_products)}
                subtitle="Actions without cost evidence"
                tone={toNumber(costActionAgeSummary?.totals.no_cost_date_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Standard Only"
                value={toNumber(costActionAgeSummary?.totals.standard_fallback_only_products)}
                subtitle="Using standard cost fallback"
                tone={toNumber(costActionAgeSummary?.totals.standard_fallback_only_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Stale Received"
                value={toNumber(costActionAgeSummary?.totals.stale_received_cost_products)}
                subtitle={`Older than ${toNumber(costActionAgeSummary?.thresholds.stale_cost_days || 90)} days`}
                tone={toNumber(costActionAgeSummary?.totals.stale_received_cost_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Age Value"
                value={formatMoney(costActionAgeSummary?.totals.total_actionable_estimated_value)}
                subtitle="Estimated value under age review"
                tone={toNumber(costActionAgeSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Age breakdown</h4>
                {(costActionAgeSummary?.age_bands ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No cost action age bands found.</div>
                ) : (
                  (costActionAgeSummary?.age_bands ?? []).map((row) => (
                    <div key={row.cost_age_band} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{formatCostAgeBand(row.cost_age_band)}</div>
                        <div style={styles.rowSubtle}>{row.recommended_age_action}</div>
                        <div style={styles.rowSubtle}>
                          {toNumber(row.stock_quantity).toLocaleString()} units • {formatMoney(row.estimated_inventory_value)} • max age {row.max_latest_cost_age_days ?? '-'} days
                        </div>
                      </div>
                      <strong>{toNumber(row.product_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Age priority products</h4>
                {(costActionAgeSummary?.age_priority_products ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No age priority products found.</div>
                ) : (
                  (costActionAgeSummary?.age_priority_products ?? []).map((row) => (
                    <div key={`${row.id}-${row.cost_age_band || 'age'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{formatCostAgeBand(row.cost_age_band)} • {formatActionType(row.action_type)}</div>
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
