import type { Dispatch, SetStateAction } from 'react';
import type { ProductCostActionDetailsResponse, ProductCostRiskItem } from '../../types/inventory';
import type { CostActionDetailFilterState } from './productCoreApi';
import { formatActionType, formatMoney, formatPercent, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type CostActionDetailsQueryState = {
  isLoading: boolean;
  isError: boolean;
};

type ProductCostActionDetailsPanelProps = {
  costActionDetailsQuery: CostActionDetailsQueryState;
  costActionDetails?: ProductCostActionDetailsResponse;
  costActionDetailFilters: CostActionDetailFilterState;
  setCostActionDetailFilters: Dispatch<SetStateAction<CostActionDetailFilterState>>;
  onExportCostActionDetailsCsv: () => void;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostActionDetailsPanel({
  costActionDetailsQuery,
  costActionDetails,
  costActionDetailFilters,
  setCostActionDetailFilters,
  onExportCostActionDetailsCsv,
  onOpenCostHistory
}: ProductCostActionDetailsPanelProps) {
  const { ui, locale } = useAppTranslation();
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost Action Detail")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Filtered costing worklist for operational follow-up and CSV export. Read-only; does not modify products, stock, shipments, or movements.")}
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={onExportCostActionDetailsCsv}
          disabled={(costActionDetails?.rows ?? []).length === 0}
        >
          {ui("Export Action CSV")}
        </button>
      </div>

      <div style={styles.filterGrid}>
        <div>
          <label style={styles.label}>{ui("Action type")}</label>
          <select
            style={styles.input}
            value={costActionDetailFilters.actionType}
            onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, actionType: event.target.value }))}
          >
            <option value="">{ui("All actions")}</option>
            <option value="capture_missing_cost">{ui("Capture missing cost")}</option>
            <option value="review_standard_cost">{ui("Review standard cost")}</option>
            <option value="investigate_cost_history">{ui("Investigate cost history")}</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>{ui("Search actions")}</label>
          <input
            style={styles.input}
            value={costActionDetailFilters.search}
            onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder={ui("Search product or category")}
          />
        </div>
        <div>
          <label style={styles.label}>{ui("Sort")}</label>
          <select
            style={styles.input}
            value={costActionDetailFilters.sort}
            onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, sort: event.target.value }))}
          >
            <option value="action_priority">{ui("Action priority")}</option>
            <option value="estimated_value">{ui("Estimated value")}</option>
            <option value="stock_quantity">{ui("Stock quantity")}</option>
            <option value="name">{ui("Product name")}</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>{ui("Direction")}</label>
          <select
            style={styles.input}
            value={costActionDetailFilters.direction}
            onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, direction: event.target.value }))}
          >
            <option value="desc">{ui("Descending")}</option>
            <option value="asc">{ui("Ascending")}</option>
          </select>
        </div>
      </div>

      {costActionDetailsQuery.isLoading ? (
        <div style={styles.emptyCell}>{ui("Loading action detail...")}</div>
      ) : costActionDetailsQuery.isError ? (
        <div style={styles.errorBox}>{ui("Unable to load action detail.")}</div>
      ) : (
        <div style={styles.tableWrapperCompact}>
          <div style={styles.rowSubtle}>
            {ui("Showing")} {(costActionDetails?.rows ?? []).length} {ui("of")} {toNumber(costActionDetails?.total)} {ui("action rows • Filtered value")} {formatMoney(costActionDetails?.filtered_estimated_inventory_value, locale)}
          </div>
          <table style={styles.compactTable}>
            <thead>
              <tr>
                <th style={styles.th}>{ui("Product")}</th>
                <th style={styles.th}>{ui("Action")}</th>
                <th style={styles.th}>{ui("Stock")}</th>
                <th style={styles.th}>{ui("Variance")}</th>
                <th style={styles.th}>{ui("History Spread")}</th>
                <th style={styles.th}>{ui("Review")}</th>
              </tr>
            </thead>
            <tbody>
              {(costActionDetails?.rows ?? []).length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={6}>{ui("No cost action rows match the current filters.")}</td>
                </tr>
              ) : (
                (costActionDetails?.rows ?? []).map((row) => (
                  <tr key={`${row.id}-${row.action_type || 'action'}`}>
                    <td style={styles.td}>
                      <strong>{row.name}</strong>
                      <div style={styles.rowSubtle}>{row.category || ui('Uncategorized')}</div>
                    </td>
                    <td style={styles.td}>
                      <strong>{ui(formatActionType(row.action_type))}</strong>
                      <div style={styles.rowSubtle}>{row.recommended_action || ''}</div>
                    </td>
                    <td style={styles.td}>{formatLocalizedNumber(Number(toNumber(row.current_stock_quantity)), locale)} {row.unit}</td>
                    <td style={styles.td}>{row.cost_variance_percent == null ? '—' : formatPercent(row.cost_variance_percent, locale)}</td>
                    <td style={styles.td}>{row.cost_history_spread_percent == null ? '—' : formatPercent(row.cost_history_spread_percent, locale)}</td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => onOpenCostHistory(row)}
                      >
                        {ui("Cost History")}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
