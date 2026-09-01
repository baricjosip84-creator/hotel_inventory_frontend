import type { ProductCostActionSupplierSummaryResponse } from '../../types/inventory';
import { formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type CostActionSupplierQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionSupplierPanelProps = {
  costActionSupplierQuery: CostActionSupplierQueryState;
  costActionSupplierSummary?: ProductCostActionSupplierSummaryResponse;
  canViewSuppliers: boolean;
};

export function ProductCostActionSupplierPanel({
  costActionSupplierQuery,
  costActionSupplierSummary,
  canViewSuppliers
}: ProductCostActionSupplierPanelProps) {
  const { ui, locale } = useAppTranslation();

  if (!canViewSuppliers) {
    return (
      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>{ui("Cost Action Suppliers")}</h3>
        <p style={styles.panelSubtitle}>
          {ui("Supplier cost action review is unavailable for this role.")}
        </p>
      </section>
    );
  }

  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost Action Suppliers")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Supplier-level costing follow-up from the current product supplier relationship. Read-only and derived from existing costing action rules.")}
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costActionSupplierQuery.refetch()}
        >
          {ui("Refresh Suppliers")}
        </button>
      </div>

      {costActionSupplierQuery.isLoading ? (
        <div style={styles.emptyCell}>{ui("Loading cost action suppliers...")}</div>
      ) : costActionSupplierQuery.isError ? (
        <div style={styles.errorBox}>{ui("Unable to load cost action suppliers.")}</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title={ui("Action Suppliers")}
              value={toNumber(costActionSupplierSummary?.totals.actionable_suppliers)}
              subtitle={ui("Suppliers with costing follow-up")}
              tone={toNumber(costActionSupplierSummary?.totals.actionable_suppliers) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Supplier Products")}
              value={toNumber(costActionSupplierSummary?.totals.total_actionable_products)}
              subtitle={ui("Actionable products grouped by supplier")}
              tone={toNumber(costActionSupplierSummary?.totals.total_actionable_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Supplier Value")}
              value={formatMoney(costActionSupplierSummary?.totals.total_actionable_estimated_value, locale)}
              subtitle={ui("Estimated value under supplier review")}
              tone={toNumber(costActionSupplierSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.tableWrapperCompact}>
            <table style={styles.compactTable}>
              <thead>
                <tr>
                  <th style={styles.th}>{ui("Supplier")}</th>
                  <th style={styles.th}>{ui("Recommended supplier action")}</th>
                  <th style={styles.th}>{ui("Products")}</th>
                  <th style={styles.th}>{ui("Action Mix")}</th>
                  <th style={styles.th}>{ui("Value")}</th>
                </tr>
              </thead>
              <tbody>
                {(costActionSupplierSummary?.suppliers ?? []).length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>{ui("No supplier-level cost actions found.")}</td>
                  </tr>
                ) : (
                  (costActionSupplierSummary?.suppliers ?? []).map((row) => (
                    <tr key={row.supplier_id || row.supplier_name}>
                      <td style={styles.td}>
                        <strong>{row.supplier_name}</strong>
                        <div style={styles.rowSubtle}>{formatLocalizedNumber(Number(toNumber(row.stock_quantity)), locale)} {ui("units")}</div>
                      </td>
                      <td style={styles.td}>{row.recommended_supplier_action}</td>
                      <td style={styles.td}>{toNumber(row.product_count)}</td>
                      <td style={styles.td}>
                        {ui("Missing")} {toNumber(row.missing_cost_products)} {ui("• Standard")} {toNumber(row.standard_review_products)} {ui("• History")} {toNumber(row.history_review_products)}
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
