import type { ProductCostDashboardSummaryResponse } from '../../types/inventory';
import {
  formatCostRecommendationPriority,
  formatCostRecommendationType,
  formatMoney,
  toNumber
} from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostDashboardQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type DashboardPriorityProduct = ProductCostDashboardSummaryResponse['priority_products'][number];

type ProductCostDashboardSummaryPanelProps = {
  costDashboardQuery: CostDashboardQueryState;
  costDashboardSummary?: ProductCostDashboardSummaryResponse;
  onOpenCostHistory: (product: DashboardPriorityProduct) => void;
};

export function ProductCostDashboardSummaryPanel({
  costDashboardQuery,
  costDashboardSummary,
  onOpenCostHistory
}: ProductCostDashboardSummaryPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Dashboard Summary</h3>
          <p style={styles.panelSubtitle}>
            Executive costing overview combining valuation, coverage, alerts, and recommendations. Read-only summary for prioritizing costing work.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costDashboardQuery.refetch()}
        >
          Refresh Dashboard
        </button>
      </div>

      {costDashboardQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost dashboard...</div>
      ) : costDashboardQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost dashboard summary.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Inventory Value"
              value={formatMoney(costDashboardSummary?.totals.total_estimated_inventory_value)}
              subtitle="Estimated stocked value"
              tone="good"
            />
            <StatCard
              title="Review Value"
              value={formatMoney(costDashboardSummary?.totals.review_estimated_value)}
              subtitle="Value under recommendation"
              tone={toNumber(costDashboardSummary?.totals.review_estimated_value) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Coverage"
              value={`${toNumber(costDashboardSummary?.totals.stocked_cost_coverage_percent).toFixed(1)}%`}
              subtitle="Stocked products with cost basis"
              tone={toNumber(costDashboardSummary?.totals.stocked_cost_coverage_percent) >= 95 ? 'good' : 'warn'}
            />
            <StatCard
              title="Critical + High"
              value={toNumber(costDashboardSummary?.totals.critical_recommendations) + toNumber(costDashboardSummary?.totals.high_recommendations)}
              subtitle="Priority cost actions"
              tone={(toNumber(costDashboardSummary?.totals.critical_recommendations) + toNumber(costDashboardSummary?.totals.high_recommendations)) > 0 ? 'bad' : 'good'}
            />
          </div>

          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Missing Cost"
              value={toNumber(costDashboardSummary?.totals.missing_cost_products)}
              subtitle="Stocked products without cost"
              tone={toNumber(costDashboardSummary?.totals.missing_cost_products) > 0 ? 'bad' : 'good'}
            />
            <StatCard
              title="Standard Review"
              value={toNumber(costDashboardSummary?.totals.standard_review_products)}
              subtitle="Latest cost vs standard"
              tone={toNumber(costDashboardSummary?.totals.standard_review_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Cost Spikes"
              value={toNumber(costDashboardSummary?.totals.spike_review_products)}
              subtitle="Latest cost change alerts"
              tone={toNumber(costDashboardSummary?.totals.spike_review_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Stale Evidence"
              value={toNumber(costDashboardSummary?.totals.stale_cost_products)}
              subtitle="Old received cost basis"
              tone={toNumber(costDashboardSummary?.totals.stale_cost_products) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Executive actions</h4>
              {(costDashboardSummary?.executive_actions ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No executive cost actions needed.</div>
              ) : (
                (costDashboardSummary?.executive_actions ?? []).map((action) => (
                  <div key={action} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{action}</div>
                      <div style={styles.rowSubtle}>Use existing audited product, receiving, and standard-cost workflows.</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Top review categories</h4>
              {(costDashboardSummary?.top_review_categories ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No category review hotspots.</div>
              ) : (
                (costDashboardSummary?.top_review_categories ?? []).map((row) => (
                  <div key={row.category} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.category}</div>
                      <div style={styles.rowSubtle}>{formatMoney(row.review_estimated_value)} review value</div>
                    </div>
                    <strong>{toNumber(row.recommendation_count)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ ...styles.riskListCard, marginTop: '1rem' }}>
            <h4 style={styles.sectionTitle}>Dashboard priority products</h4>
            {(costDashboardSummary?.priority_products ?? []).length === 0 ? (
              <div style={styles.rowSubtle}>No priority products found.</div>
            ) : (
              (costDashboardSummary?.priority_products ?? []).map((row) => (
                <div key={`${row.id}-${row.recommendation_type || 'dashboard'}`} style={styles.riskListItem}>
                  <div>
                    <div style={styles.rowTitle}>{row.name}</div>
                    <div style={styles.rowSubtle}>
                      {formatCostRecommendationPriority(row.recommendation_priority)} • {formatCostRecommendationType(row.recommendation_type)} • {formatMoney(row.estimated_inventory_value)}
                    </div>
                  </div>
                  <button type="button" style={styles.secondaryButton} onClick={() => onOpenCostHistory(row)}>
                    History
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
