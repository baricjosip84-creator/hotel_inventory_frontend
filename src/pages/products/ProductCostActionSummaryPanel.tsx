import type { ProductCostActionSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

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
  const { ui, locale } = useAppTranslation();
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost Action Summary")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Prioritized costing worklist generated from missing costs, high variance, and inconsistent cost history. Read-only and audit-safe.")}
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionQuery.refetch()}
        >
          {ui("Refresh Actions")}
        </button>
      </div>

      {costActionQuery.isLoading ? (
        <div style={styles.emptyCell}>{ui("Loading cost action summary...")}</div>
      ) : costActionQuery.isError ? (
        <div style={styles.errorBox}>{ui("Unable to load cost action summary.")}</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title={ui("Actionable Products")}
              value={toNumber(costActionSummary?.totals.total_actionable_products)}
              subtitle={ui("Highest-priority cost action per product")}
              tone={toNumber(costActionSummary?.totals.total_actionable_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Actionable Stock")}
              value={formatLocalizedNumber(Number(toNumber(costActionSummary?.totals.actionable_stock_quantity)), locale)}
              subtitle={ui("Units affected by costing actions")}
              tone={toNumber(costActionSummary?.totals.actionable_stock_quantity) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Actionable Value")}
              value={formatMoney(costActionSummary?.totals.actionable_estimated_inventory_value, locale)}
              subtitle={ui("Estimated value under review")}
              tone={toNumber(costActionSummary?.totals.actionable_estimated_inventory_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>{ui("Action breakdown")}</h4>
              {(costActionSummary?.action_breakdown ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>{ui("No cost actions are currently required.")}</div>
              ) : (
                (costActionSummary?.action_breakdown ?? []).map((row) => (
                  <div key={row.action_type} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{ui(formatActionType(row.action_type))}</div>
                      <div style={styles.rowSubtle}>{row.recommended_action}</div>
                    </div>
                    <strong>{toNumber(row.product_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>{ui("Category hotspots")}</h4>
              {(costActionSummary?.category_hotspots ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>{ui("No category hotspots found.")}</div>
              ) : (
                (costActionSummary?.category_hotspots ?? []).map((row) => (
                  <div key={row.category} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.category}</div>
                      <div style={styles.rowSubtle}>{formatLocalizedNumber(Number(toNumber(row.stock_quantity)), locale)} {ui("units •")} {formatMoney(row.estimated_inventory_value, locale)}</div>
                    </div>
                    <strong>{toNumber(row.product_count)}</strong>
                  </div>
                ))
              )}
            </div>

            <div style={styles.riskListCard}>
              <h4 style={styles.sectionTitle}>{ui("Priority products")}</h4>
              {(costActionSummary?.priority_products ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>{ui("No priority cost products found.")}</div>
              ) : (
                (costActionSummary?.priority_products ?? []).map((row) => (
                  <div key={`${row.id}-${row.action_type || 'action'}`} style={styles.riskListItem}>
                    <div>
                      <div style={styles.rowTitle}>{row.name}</div>
                      <div style={styles.rowSubtle}>{ui(formatActionType(row.action_type))} • {row.recommended_action}</div>
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
