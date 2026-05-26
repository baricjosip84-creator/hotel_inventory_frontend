import type { Dispatch, SetStateAction } from 'react';
import type { ProductCostActionDetailsResponse, ProductCostRiskItem } from '../../types/inventory';
import type { CostActionDetailFilterState } from './productCoreApi';
import { formatActionType, formatMoney, formatPercent, toNumber } from './productFormatting';
import { styles } from './productStyles';

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
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Action Detail</h3>
          <p style={styles.panelSubtitle}>
            Filtered costing worklist for operational follow-up and CSV export. Read-only; does not modify products, stock, shipments, or movements.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={onExportCostActionDetailsCsv}
          disabled={(costActionDetails?.rows ?? []).length === 0}
        >
          Export Action CSV
        </button>
      </div>

      <div style={styles.filterGrid}>
        <div>
          <label style={styles.label}>Action type</label>
          <select
            style={styles.input}
            value={costActionDetailFilters.actionType}
            onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, actionType: event.target.value }))}
          >
            <option value="">All actions</option>
            <option value="capture_missing_cost">Capture missing cost</option>
            <option value="review_standard_cost">Review standard cost</option>
            <option value="investigate_cost_history">Investigate cost history</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>Search actions</label>
          <input
            style={styles.input}
            value={costActionDetailFilters.search}
            onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search product or category"
          />
        </div>
        <div>
          <label style={styles.label}>Sort</label>
          <select
            style={styles.input}
            value={costActionDetailFilters.sort}
            onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, sort: event.target.value }))}
          >
            <option value="action_priority">Action priority</option>
            <option value="estimated_value">Estimated value</option>
            <option value="stock_quantity">Stock quantity</option>
            <option value="name">Product name</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>Direction</label>
          <select
            style={styles.input}
            value={costActionDetailFilters.direction}
            onChange={(event) => setCostActionDetailFilters((current) => ({ ...current, direction: event.target.value }))}
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {costActionDetailsQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading action detail...</div>
      ) : costActionDetailsQuery.isError ? (
        <div style={styles.errorBox}>Unable to load action detail.</div>
      ) : (
        <div style={styles.tableWrapperCompact}>
          <div style={styles.rowSubtle}>
            Showing {(costActionDetails?.rows ?? []).length} of {toNumber(costActionDetails?.total)} action rows • Filtered value {formatMoney(costActionDetails?.filtered_estimated_inventory_value)}
          </div>
          <table style={styles.compactTable}>
            <thead>
              <tr>
                <th style={styles.th}>Product</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Stock</th>
                <th style={styles.th}>Variance</th>
                <th style={styles.th}>History Spread</th>
                <th style={styles.th}>Review</th>
              </tr>
            </thead>
            <tbody>
              {(costActionDetails?.rows ?? []).length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={6}>No cost action rows match the current filters.</td>
                </tr>
              ) : (
                (costActionDetails?.rows ?? []).map((row) => (
                  <tr key={`${row.id}-${row.action_type || 'action'}`}>
                    <td style={styles.td}>
                      <strong>{row.name}</strong>
                      <div style={styles.rowSubtle}>{row.category || 'Uncategorized'}</div>
                    </td>
                    <td style={styles.td}>
                      <strong>{formatActionType(row.action_type)}</strong>
                      <div style={styles.rowSubtle}>{row.recommended_action || ''}</div>
                    </td>
                    <td style={styles.td}>{toNumber(row.current_stock_quantity).toLocaleString()} {row.unit}</td>
                    <td style={styles.td}>{row.cost_variance_percent == null ? '—' : formatPercent(row.cost_variance_percent)}</td>
                    <td style={styles.td}>{row.cost_history_spread_percent == null ? '—' : formatPercent(row.cost_history_spread_percent)}</td>
                    <td style={styles.td}>
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => onOpenCostHistory(row)}
                      >
                        Cost History
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
