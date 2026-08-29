import type { ProductCostActionImpactSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatImpactType, formatMoney, formatPercent, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

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
  const { ui, locale } = useAppTranslation();
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost Action Impact")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Impact-focused view of costing actions, separating valued inventory review from unvalued stock follow-up. Read-only and audit-safe.")}
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionImpactQuery.refetch()}
        >
          {ui("Refresh Impact")}
        </button>
      </div>

      {costActionImpactQuery.isLoading ? (
        <div style={styles.emptyCell}>{ui("Loading cost action impact...")}</div>
      ) : costActionImpactQuery.isError ? (
        <div style={styles.errorBox}>{ui("Unable to load cost action impact.")}</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title={ui("Valued Reviews")}
              value={toNumber(costActionImpactSummary?.totals.valued_inventory_review_products)}
              subtitle={ui("Actions with estimated inventory value")}
              tone={toNumber(costActionImpactSummary?.totals.valued_inventory_review_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Unvalued Stock")}
              value={toNumber(costActionImpactSummary?.totals.unvalued_stock_review_products)}
              subtitle={`${formatLocalizedNumber(Number(toNumber(costActionImpactSummary?.totals.unvalued_action_stock_quantity)), locale)} ${ui('units need cost basis')}`}
              tone={toNumber(costActionImpactSummary?.totals.unvalued_stock_review_products) > 0 ? 'bad' : 'good'}
            />
            <StatCard
              title={ui("Impact Value")}
              value={formatMoney(costActionImpactSummary?.totals.total_actionable_estimated_value, locale)}
              subtitle={ui("Estimated value under cost review")}
              tone={toNumber(costActionImpactSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>{ui("Impact breakdown")}</h4>
              {(costActionImpactSummary?.impact_breakdown ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>{ui("No cost action impact found.")}</div>
              ) : (
                (costActionImpactSummary?.impact_breakdown ?? []).map((row) => (
                  <div key={row.impact_type} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{ui(formatImpactType(row.impact_type))}</div>
                      <div style={styles.rowSubtle}>{formatLocalizedNumber(Number(toNumber(row.stock_quantity)), locale)} {ui("units •")} {formatMoney(row.estimated_inventory_value, locale)} {ui("• avg priority")} {formatPercent(row.average_priority_score, locale)}</div>
                    </div>
                    <strong>{toNumber(row.product_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>{ui("Top impact products")}</h4>
              {(costActionImpactSummary?.top_impact_products ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>{ui("No impact products found.")}</div>
              ) : (
                (costActionImpactSummary?.top_impact_products ?? []).map((row) => (
                  <div key={`${row.id}-${row.impact_type || 'impact'}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.name}</div>
                      <div style={styles.rowSubtle}>{ui(formatImpactType(row.impact_type))} • {ui(formatActionType(row.action_type))} • {formatMoney(row.estimated_inventory_value, locale)}</div>
                    </div>
                    <button type="button" style={styles.secondaryButton} onClick={() => onOpenCostHistory(row)}>
                      {ui("History")}
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
