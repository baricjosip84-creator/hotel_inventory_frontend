import type { ProductCostActionSupplierSummaryResponse } from '../../types/inventory';
import { formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostActionSupplierQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionSupplierPanelProps = {
  costActionSupplierQuery: CostActionSupplierQueryState;
  costActionSupplierSummary?: ProductCostActionSupplierSummaryResponse;
};

export function ProductCostActionSupplierPanel({
  costActionSupplierQuery,
  costActionSupplierSummary
}: ProductCostActionSupplierPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Action Suppliers</h3>
          <p style={styles.panelSubtitle}>
            Supplier-level costing follow-up from the current product supplier relationship. Read-only and derived from existing costing action rules.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionSupplierQuery.refetch()}
        >
          Refresh Suppliers
        </button>
      </div>

      {costActionSupplierQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost action suppliers...</div>
      ) : costActionSupplierQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost action suppliers.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Action Suppliers"
              value={toNumber(costActionSupplierSummary?.totals.actionable_suppliers)}
              subtitle="Suppliers with costing follow-up"
              tone={toNumber(costActionSupplierSummary?.totals.actionable_suppliers) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Supplier Products"
              value={toNumber(costActionSupplierSummary?.totals.total_actionable_products)}
              subtitle="Actionable products grouped by supplier"
              tone={toNumber(costActionSupplierSummary?.totals.total_actionable_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Supplier Value"
              value={formatMoney(costActionSupplierSummary?.totals.total_actionable_estimated_value)}
              subtitle="Estimated value under supplier review"
              tone={toNumber(costActionSupplierSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.tableWrapperCompact}>
            <table style={styles.compactTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Recommended supplier action</th>
                  <th style={styles.th}>Products</th>
                  <th style={styles.th}>Action Mix</th>
                  <th style={styles.th}>Value</th>
                </tr>
              </thead>
              <tbody>
                {(costActionSupplierSummary?.suppliers ?? []).length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>No supplier-level cost actions found.</td>
                  </tr>
                ) : (
                  (costActionSupplierSummary?.suppliers ?? []).map((row) => (
                    <tr key={row.supplier_id || row.supplier_name}>
                      <td style={styles.td}>
                        <strong>{row.supplier_name}</strong>
                        <div style={styles.rowSubtle}>{toNumber(row.stock_quantity).toLocaleString()} units</div>
                      </td>
                      <td style={styles.td}>{row.recommended_supplier_action}</td>
                      <td style={styles.td}>{toNumber(row.product_count)}</td>
                      <td style={styles.td}>
                        Missing {toNumber(row.missing_cost_products)} • Standard {toNumber(row.standard_review_products)} • History {toNumber(row.history_review_products)}
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
