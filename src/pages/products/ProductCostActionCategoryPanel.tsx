import type { ProductCostActionCategorySummaryResponse } from '../../types/inventory';
import { formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type CostActionCategoryQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionCategoryPanelProps = {
  costActionCategoryQuery: CostActionCategoryQueryState;
  costActionCategorySummary?: ProductCostActionCategorySummaryResponse;
};

export function ProductCostActionCategoryPanel({
  costActionCategoryQuery,
  costActionCategorySummary
}: ProductCostActionCategoryPanelProps) {
  const { ui, locale } = useAppTranslation();
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost Action Categories")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Category-level focus view for costing follow-up. Read-only grouping from the action plan, with no stock or movement changes.")}
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionCategoryQuery.refetch()}
        >
          {ui("Refresh Categories")}
        </button>
      </div>

      {costActionCategoryQuery.isLoading ? (
        <div style={styles.emptyCell}>{ui("Loading cost action categories...")}</div>
      ) : costActionCategoryQuery.isError ? (
        <div style={styles.errorBox}>{ui("Unable to load cost action categories.")}</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title={ui("Action Categories")}
              value={toNumber(costActionCategorySummary?.totals.actionable_categories)}
              subtitle={ui("Categories with costing actions")}
              tone={toNumber(costActionCategorySummary?.totals.actionable_categories) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Category Products")}
              value={toNumber(costActionCategorySummary?.totals.total_actionable_products)}
              subtitle={ui("Actionable products included")}
              tone={toNumber(costActionCategorySummary?.totals.total_actionable_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Category Value")}
              value={formatMoney(costActionCategorySummary?.totals.total_actionable_estimated_value, locale)}
              subtitle={ui("Estimated value under category review")}
              tone={toNumber(costActionCategorySummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.tableWrapperCompact}>
            <table style={styles.compactTable}>
              <thead>
                <tr>
                  <th style={styles.th}>{ui("Category")}</th>
                  <th style={styles.th}>{ui("Focus")}</th>
                  <th style={styles.th}>{ui("Products")}</th>
                  <th style={styles.th}>{ui("Priority Mix")}</th>
                  <th style={styles.th}>{ui("Value")}</th>
                </tr>
              </thead>
              <tbody>
                {(costActionCategorySummary?.categories ?? []).length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>{ui("No actionable cost categories found.")}</td>
                  </tr>
                ) : (
                  (costActionCategorySummary?.categories ?? []).map((row) => (
                    <tr key={row.category}>
                      <td style={styles.td}>
                        <strong>{row.category}</strong>
                        <div style={styles.rowSubtle}>{formatLocalizedNumber(Number(toNumber(row.stock_quantity)), locale)} {ui("units")}</div>
                      </td>
                      <td style={styles.td}>{row.recommended_focus}</td>
                      <td style={styles.td}>{toNumber(row.product_count)}</td>
                      <td style={styles.td}>
                        {ui("C")} {toNumber(row.critical_products)} {ui("• H")} {toNumber(row.high_products)} {ui("• W")} {toNumber(row.watch_products)}
                      </td>
                      <td style={styles.td}>{formatMoney(row.estimated_inventory_value, locale)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
