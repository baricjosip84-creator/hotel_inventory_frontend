import type { ProductCostRecommendationSummaryResponse } from '../../types/inventory';
import {
  formatCostRecommendationPriority,
  formatCostRecommendationType,
  formatMoney,
  toNumber
} from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type RecommendationQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostRecommendationSummaryPanelProps = {
  costRecommendationQuery: RecommendationQueryState;
  costRecommendationSummary?: ProductCostRecommendationSummaryResponse;
  onOpenCostHistory: (product: ProductCostRecommendationSummaryResponse['top_recommendations'][number]) => void;
};

export function ProductCostRecommendationSummaryPanel({
  costRecommendationQuery,
  costRecommendationSummary,
  onOpenCostHistory
}: ProductCostRecommendationSummaryPanelProps) {
  const priorityRecommendationCount =
    toNumber(costRecommendationSummary?.totals.critical_recommendations) +
    toNumber(costRecommendationSummary?.totals.high_recommendations);

  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Recommendations</h3>
          <p style={styles.panelSubtitle}>
            Review-ready costing recommendations derived from alerts, variance, cost spikes, stale cost evidence, and inconsistent history. Read-only guidance only.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costRecommendationQuery.refetch()}
        >
          Refresh Recommendations
        </button>
      </div>

      {costRecommendationQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost recommendations...</div>
      ) : costRecommendationQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost recommendations.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Recommendations"
              value={toNumber(costRecommendationSummary?.totals.total_recommendations)}
              subtitle="Products needing review"
              tone={toNumber(costRecommendationSummary?.totals.total_recommendations) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Critical / High"
              value={priorityRecommendationCount}
              subtitle="Prioritize first"
              tone={priorityRecommendationCount > 0 ? 'bad' : 'good'}
            />
            <StatCard
              title="Recommended Units"
              value={toNumber(costRecommendationSummary?.totals.recommended_stock_quantity).toLocaleString()}
              subtitle="Stock under recommendation"
              tone={toNumber(costRecommendationSummary?.totals.recommended_stock_quantity) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Recommended Value"
              value={formatMoney(costRecommendationSummary?.totals.recommended_estimated_value)}
              subtitle="Estimated value to review"
              tone={toNumber(costRecommendationSummary?.totals.recommended_estimated_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Recommendation groups</h4>
              {(costRecommendationSummary?.recommendation_groups ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No cost recommendations.</div>
              ) : (
                (costRecommendationSummary?.recommendation_groups ?? []).map((row) => (
                  <div key={`${row.recommendation_type}-${row.recommendation_priority}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{formatCostRecommendationType(row.recommendation_type)}</div>
                      <div style={styles.rowSubtle}>
                        {formatCostRecommendationPriority(row.recommendation_priority)} • {formatMoney(row.estimated_inventory_value)} review value
                      </div>
                      <div style={styles.rowSubtle}>{row.recommendation}</div>
                    </div>
                    <strong>{toNumber(row.product_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>Top recommended products</h4>
              {(costRecommendationSummary?.top_recommendations ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No recommended products found.</div>
              ) : (
                (costRecommendationSummary?.top_recommendations ?? []).map((row) => (
                  <div key={`${row.id}-${row.recommendation_type || 'recommendation'}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.name}</div>
                      <div style={styles.rowSubtle}>
                        {formatCostRecommendationPriority(row.recommendation_priority)} • {formatCostRecommendationType(row.recommendation_type)} • {formatMoney(row.estimated_inventory_value)}
                      </div>
                      <div style={styles.rowSubtle}>{row.recommendation}</div>
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
