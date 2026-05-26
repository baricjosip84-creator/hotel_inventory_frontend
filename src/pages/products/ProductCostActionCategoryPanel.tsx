import type { ProductCostActionCategorySummaryResponse } from '../../types/inventory';
import { formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

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
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Action Categories</h3>
          <p style={styles.panelSubtitle}>
            Category-level focus view for costing follow-up. Read-only grouping from the action plan, with no stock or movement changes.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionCategoryQuery.refetch()}
        >
          Refresh Categories
        </button>
      </div>

      {costActionCategoryQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost action categories...</div>
      ) : costActionCategoryQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost action categories.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Action Categories"
              value={toNumber(costActionCategorySummary?.totals.actionable_categories)}
              subtitle="Categories with costing actions"
              tone={toNumber(costActionCategorySummary?.totals.actionable_categories) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Category Products"
              value={toNumber(costActionCategorySummary?.totals.total_actionable_products)}
              subtitle="Actionable products included"
              tone={toNumber(costActionCategorySummary?.totals.total_actionable_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Category Value"
              value={formatMoney(costActionCategorySummary?.totals.total_actionable_estimated_value)}
              subtitle="Estimated value under category review"
              tone={toNumber(costActionCategorySummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.tableWrapperCompact}>
            <table style={styles.compactTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Focus</th>
                  <th style={styles.th}>Products</th>
                  <th style={styles.th}>Priority Mix</th>
                  <th style={styles.th}>Value</th>
                </tr>
              </thead>
              <tbody>
                {(costActionCategorySummary?.categories ?? []).length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>No actionable cost categories found.</td>
                  </tr>
                ) : (
                  (costActionCategorySummary?.categories ?? []).map((row) => (
                    <tr key={row.category}>
                      <td style={styles.td}>
                        <strong>{row.category}</strong>
                        <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units</div>
                      </td>
                      <td style={styles.td}>{row.recommended_focus}</td>
                      <td style={styles.td}>{toNumber(row.product_count)}</td>
                      <td style={styles.td}>
                        C {toNumber(row.critical_products)} • H {toNumber(row.high_products)} • W {toNumber(row.watch_products)}
                      </td>
                      <td style={styles.td}>{formatMoney(row.estimated_inventory_value)}</td>
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
