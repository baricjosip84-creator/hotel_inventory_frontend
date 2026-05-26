import type { ProductCostHardeningSummaryResponse } from '../../types/inventory';
import { formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostHardeningQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type HardeningPriorityProduct = ProductCostHardeningSummaryResponse['priority_products'][number];

type ProductCostHardeningSummaryPanelProps = {
  costHardeningQuery: CostHardeningQueryState;
  costHardeningSummary?: ProductCostHardeningSummaryResponse;
  onOpenCostHistory: (product: HardeningPriorityProduct) => void;
};

export function ProductCostHardeningSummaryPanel({
  costHardeningQuery,
  costHardeningSummary,
  onOpenCostHistory
}: ProductCostHardeningSummaryPanelProps) {
  return (
      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Hardening Summary</h3>
            <p style={styles.panelSubtitle}>
              Final costing health checklist for edge cases before finance close. Derived read-only from products, stock, and stock movement costs.
            </p>
          </div>
          <button type="button" style={styles.secondaryButton} onClick={() => costHardeningQuery.refetch()}>
            Refresh Hardening
          </button>
        </div>

        {costHardeningQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost hardening summary...</div>
        ) : costHardeningQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost hardening summary.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Hardening Issues"
                value={toNumber(costHardeningSummary?.totals.issue_count)}
                subtitle="Total checklist findings"
                tone={toNumber(costHardeningSummary?.totals.issue_count) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Review Value"
                value={formatMoney(costHardeningSummary?.totals.hardening_review_value)}
                subtitle="Estimated value in findings"
                tone={toNumber(costHardeningSummary?.totals.hardening_review_value) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Missing Costs"
                value={toNumber(costHardeningSummary?.totals.missing_stock_cost_products)}
                subtitle="Stocked products without cost"
                tone={toNumber(costHardeningSummary?.totals.missing_stock_cost_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Integrity Gaps"
                value={toNumber(costHardeningSummary?.totals.movement_cost_integrity_products)}
                subtitle="Movement cost rows to review"
                tone={toNumber(costHardeningSummary?.totals.movement_cost_integrity_products) > 0 ? 'bad' : 'good'}
              />
            </div>

            <div style={styles.costReadinessGrid}>
              <StatCard title="Fallback Stock" value={toNumber(costHardeningSummary?.totals.standard_fallback_stocked_products)} subtitle="Using standard cost basis" tone={toNumber(costHardeningSummary?.totals.standard_fallback_stocked_products) > 0 ? 'warn' : 'good'} />
              <StatCard title="High Variance" value={toNumber(costHardeningSummary?.totals.high_variance_products)} subtitle="Latest vs standard" tone={toNumber(costHardeningSummary?.totals.high_variance_products) > 0 ? 'warn' : 'good'} />
              <StatCard title="Stale Evidence" value={toNumber(costHardeningSummary?.totals.stale_received_cost_products)} subtitle="Old received cost basis" tone={toNumber(costHardeningSummary?.totals.stale_received_cost_products) > 0 ? 'warn' : 'good'} />
              <StatCard title="Mixed Sources" value={toNumber(costHardeningSummary?.totals.mixed_cost_source_products)} subtitle="Multiple movement cost sources" tone={toNumber(costHardeningSummary?.totals.mixed_cost_source_products) > 0 ? 'warn' : 'good'} />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Hardening actions</h4>
                {(costHardeningSummary?.hardening_actions ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No hardening actions needed.</div>
                ) : (
                  (costHardeningSummary?.hardening_actions ?? []).map((action) => (
                    <div key={action} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{action}</div>
                        <div style={styles.rowSubtle}>Use existing audited receiving and standard-cost workflows.</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Priority hardening products</h4>
                {(costHardeningSummary?.priority_products ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No priority hardening products found.</div>
                ) : (
                  (costHardeningSummary?.priority_products ?? []).map((row) => (
                    <div key={`${row.id}-hardening`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>
                          Score {toNumber(row.hardening_score).toFixed(0)} • {formatMoney(row.estimated_inventory_value)} • {row.valuation_basis || 'none'}
                        </div>
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
