import type { ProductCostActionCoverageSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostActionCoverageQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionCoveragePanelProps = {
  costActionCoverageQuery: CostActionCoverageQueryState;
  costActionCoverageSummary?: ProductCostActionCoverageSummaryResponse;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostActionCoveragePanel({
  costActionCoverageQuery,
  costActionCoverageSummary,
  onOpenCostHistory
}: ProductCostActionCoveragePanelProps) {
  return (
      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>Cost Action Coverage</h3>
            <p style={styles.panelSubtitle}>
              Coverage view for stocked products with usable cost basis, showing where action gaps remain before valuation decisions.
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionCoverageQuery.refetch()}
          >
            Refresh Coverage
          </button>
        </div>

        {costActionCoverageQuery.isLoading ? (
          <div style={styles.emptyCell}>Loading cost action coverage...</div>
        ) : costActionCoverageQuery.isError ? (
          <div style={styles.errorBox}>Unable to load cost action coverage.</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title="Stocked Coverage"
                value={`${toNumber(costActionCoverageSummary?.totals.stocked_cost_coverage_percent).toFixed(1)}%`}
                subtitle="Stocked products with cost basis"
                tone={toNumber(costActionCoverageSummary?.totals.stocked_cost_coverage_percent) >= 95 ? 'good' : 'warn'}
              />
              <StatCard
                title="Uncosted Stocked"
                value={toNumber(costActionCoverageSummary?.totals.uncosted_stocked_products)}
                subtitle="Stocked products with no cost basis"
                tone={toNumber(costActionCoverageSummary?.totals.uncosted_stocked_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title="Action Rate"
                value={`${toNumber(costActionCoverageSummary?.totals.action_rate_percent).toFixed(1)}%`}
                subtitle="Products needing cost action"
                tone={toNumber(costActionCoverageSummary?.totals.action_rate_percent) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title="Action Value"
                value={formatMoney(costActionCoverageSummary?.totals.actionable_estimated_value)}
                subtitle="Estimated value under action"
                tone={toNumber(costActionCoverageSummary?.totals.actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Category coverage</h4>
                {(costActionCoverageSummary?.category_coverage ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No category coverage gaps found.</div>
                ) : (
                  (costActionCoverageSummary?.category_coverage ?? []).map((row) => (
                    <div key={row.category} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.category}</div>
                        <div style={styles.rowSubtle}>
                          {toNumber(row.stocked_cost_coverage_percent).toFixed(1)}% stocked coverage • {toNumber(row.uncosted_stocked_products)} uncosted stocked
                        </div>
                        <div style={styles.rowSubtle}>{formatMoney(row.actionable_estimated_value)} actionable value</div>
                      </div>
                      <strong>{toNumber(row.actionable_products)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>Coverage gaps</h4>
                {(costActionCoverageSummary?.coverage_gaps ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>No coverage gaps found.</div>
                ) : (
                  (costActionCoverageSummary?.coverage_gaps ?? []).map((row) => (
                    <div key={`${row.id}-${row.action_type || 'coverage'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{row.category || 'Uncategorized'} • {formatActionType(row.action_type)}</div>
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
