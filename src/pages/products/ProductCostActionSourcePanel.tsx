import type { ProductCostActionSourceSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatCostSource, formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type CostActionSourceQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionSourcePanelProps = {
  costActionSourceQuery: CostActionSourceQueryState;
  costActionSourceSummary?: ProductCostActionSourceSummaryResponse;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostActionSourcePanel({
  costActionSourceQuery,
  costActionSourceSummary,
  onOpenCostHistory
}: ProductCostActionSourcePanelProps) {
  const { ui, locale } = useAppTranslation();
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost Action Sources")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Cost-basis view of the action plan, separating missing cost, standard fallback, and received-cost evidence reviews.")}
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionSourceQuery.refetch()}
        >
          {ui("Refresh Sources")}
        </button>
      </div>

      {costActionSourceQuery.isLoading ? (
        <div style={styles.emptyCell}>{ui("Loading cost action sources...")}</div>
      ) : costActionSourceQuery.isError ? (
        <div style={styles.errorBox}>{ui("Unable to load cost action sources.")}</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title={ui("Missing Source")}
              value={toNumber(costActionSourceSummary?.totals.missing_source_products)}
              subtitle={ui("Actionable stock with no cost basis")}
              tone={toNumber(costActionSourceSummary?.totals.missing_source_products) > 0 ? 'bad' : 'good'}
            />
            <StatCard
              title={ui("Standard Fallback")}
              value={toNumber(costActionSourceSummary?.totals.standard_source_products)}
              subtitle={ui("Actions relying on standard cost")}
              tone={toNumber(costActionSourceSummary?.totals.standard_source_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Received Evidence")}
              value={toNumber(costActionSourceSummary?.totals.received_source_products)}
              subtitle={ui("Actions backed by received costs")}
              tone={toNumber(costActionSourceSummary?.totals.received_source_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Source Value")}
              value={formatMoney(costActionSourceSummary?.totals.total_actionable_estimated_value, locale)}
              subtitle={ui("Estimated value under source review")}
              tone={toNumber(costActionSourceSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>{ui("Source breakdown")}</h4>
              {(costActionSourceSummary?.sources ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>{ui("No cost action sources found.")}</div>
              ) : (
                (costActionSourceSummary?.sources ?? []).map((row) => (
                  <div key={row.cost_source} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{ui(formatCostSource(row.cost_source))}</div>
                      <div style={styles.rowSubtle}>{row.recommended_source_action}</div>
                      <div style={styles.rowSubtle}>{formatLocalizedNumber(Number(toNumber(row.stock_quantity)), locale)} {ui("units •")} {formatMoney(row.estimated_inventory_value, locale)}</div>
                    </div>
                    <strong>{toNumber(row.product_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>{ui("Source priority products")}</h4>
              {(costActionSourceSummary?.source_priority_products ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>{ui("No source priority products found.")}</div>
              ) : (
                (costActionSourceSummary?.source_priority_products ?? []).map((row) => (
                  <div key={`${row.id}-${row.effective_cost_source || 'source'}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.name}</div>
                      <div style={styles.rowSubtle}>{ui(formatCostSource(row.effective_cost_source || 'no_cost'))} • {ui(formatActionType(row.action_type))}</div>
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
