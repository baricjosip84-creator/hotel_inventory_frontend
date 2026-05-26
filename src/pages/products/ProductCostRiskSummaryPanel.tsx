import type { Dispatch, SetStateAction } from 'react';
import type {
  ProductCostRiskDetailsResponse,
  ProductCostRiskItem,
  ProductCostRiskSummaryResponse
} from '../../types/inventory';
import { formatMoney, formatPercent, formatRiskType, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { CostRiskList, StatCard } from './productSummaryComponents';
import type { CostRiskDetailFilterState } from './productCostAssessmentApi';

type CostRiskQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type CostRiskDetailsQueryState = {
  isLoading: boolean;
  isError: boolean;
};

type ProductCostRiskSummaryPanelProps = {
  costRiskQuery: CostRiskQueryState;
  costRiskDetailsQuery: CostRiskDetailsQueryState;
  costRiskSummary?: ProductCostRiskSummaryResponse;
  costRiskDetails?: ProductCostRiskDetailsResponse;
  costRiskDetailFilters: CostRiskDetailFilterState;
  setCostRiskDetailFilters: Dispatch<SetStateAction<CostRiskDetailFilterState>>;
  onExportCostRiskDetailsCsv: () => void;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostRiskSummaryPanel({
  costRiskQuery,
  costRiskDetailsQuery,
  costRiskSummary,
  costRiskDetails,
  costRiskDetailFilters,
  setCostRiskDetailFilters,
  onExportCostRiskDetailsCsv,
  onOpenCostHistory
}: ProductCostRiskSummaryPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Risk Summary</h3>
          <p style={styles.panelSubtitle}>
            Actionable costing exceptions from received costs, standard cost fallback, and movement cost history.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costRiskQuery.refetch()}
        >
          Refresh Risk
        </button>
      </div>

      {costRiskQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost risk summary...</div>
      ) : costRiskQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost risk summary.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="High Variance"
              value={toNumber(costRiskSummary?.totals.high_variance_products)}
              subtitle={`≥ ${formatPercent(costRiskSummary?.thresholds.variance_threshold_percent)} from standard cost`}
              tone={toNumber(costRiskSummary?.totals.high_variance_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Missing Cost"
              value={toNumber(costRiskSummary?.totals.missing_cost_products)}
              subtitle="Stocked products with no received or standard cost"
              tone={toNumber(costRiskSummary?.totals.missing_cost_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title="Inconsistent History"
              value={toNumber(costRiskSummary?.totals.inconsistent_cost_history_products)}
              subtitle={`Cost range spread ≥ ${formatPercent(costRiskSummary?.thresholds.history_spread_threshold_percent)}`}
              tone={toNumber(costRiskSummary?.totals.inconsistent_cost_history_products) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <CostRiskList
              title="High variance products"
              emptyText="No products exceed the variance threshold."
              rows={costRiskSummary?.high_variance ?? []}
              renderDetail={(row) => `Variance ${formatPercent(row.cost_variance_percent)} • Standard ${formatMoney(row.standard_unit_cost)} • Latest ${formatMoney(row.latest_unit_cost)}`}
              onOpenHistory={onOpenCostHistory}
            />
            <CostRiskList
              title="Missing cost products"
              emptyText="No stocked products are missing cost."
              rows={costRiskSummary?.missing_cost ?? []}
              renderDetail={(row) => `Stock ${toNumber(row.current_stock_quantity).toLocaleString()} ${row.unit} • Add standard cost or receive costed stock`}
              onOpenHistory={onOpenCostHistory}
            />
            <CostRiskList
              title="Inconsistent cost history"
              emptyText="No products exceed the history spread threshold."
              rows={costRiskSummary?.inconsistent_cost_history ?? []}
              renderDetail={(row) => `Spread ${formatPercent(row.cost_history_spread_percent)} • Range ${formatMoney(row.min_unit_cost)} to ${formatMoney(row.max_unit_cost)}`}
              onOpenHistory={onOpenCostHistory}
            />
          </div>

          <div style={styles.packageHeader}>
            <div>
              <h4 style={styles.sectionTitle}>Risk detail</h4>
              <p style={styles.panelSubtitle}>
                Filtered actionable costing exceptions for review and CSV export. Read-only; does not modify stock or cost records.
              </p>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onExportCostRiskDetailsCsv}
              disabled={(costRiskDetails?.rows ?? []).length === 0}
            >
              Export Risk CSV
            </button>
          </div>

          <div style={styles.filterGrid}>
            <div>
              <label style={styles.label}>Risk type</label>
              <select
                style={styles.input}
                value={costRiskDetailFilters.riskType}
                onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, riskType: event.target.value }))}
              >
                <option value="">All risks</option>
                <option value="high_variance">High variance</option>
                <option value="missing_cost">Missing cost</option>
                <option value="inconsistent_history">Inconsistent history</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Search risk</label>
              <input
                style={styles.input}
                value={costRiskDetailFilters.search}
                onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search product or category"
              />
            </div>
            <div>
              <label style={styles.label}>Sort</label>
              <select
                style={styles.input}
                value={costRiskDetailFilters.sort}
                onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, sort: event.target.value }))}
              >
                <option value="risk_priority">Risk priority</option>
                <option value="estimated_value">Estimated value</option>
                <option value="stock_quantity">Stock quantity</option>
                <option value="name">Product name</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Direction</label>
              <select
                style={styles.input}
                value={costRiskDetailFilters.direction}
                onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, direction: event.target.value }))}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {costRiskDetailsQuery.isLoading ? (
            <div style={styles.emptyCell}>Loading risk detail...</div>
          ) : costRiskDetailsQuery.isError ? (
            <div style={styles.errorBox}>Unable to load risk detail.</div>
          ) : (
            <div style={styles.tableWrapperCompact}>
              <div style={styles.rowSubtle}>
                Showing {(costRiskDetails?.rows ?? []).length} of {toNumber(costRiskDetails?.total)} risk rows • Filtered value {formatMoney(costRiskDetails?.filtered_estimated_inventory_value)}
              </div>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Risk</th>
                    <th style={styles.th}>Stock</th>
                    <th style={styles.th}>Variance</th>
                    <th style={styles.th}>History Spread</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(costRiskDetails?.rows ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>No cost risk rows match the current filters.</td>
                    </tr>
                  ) : (
                    (costRiskDetails?.rows ?? []).map((row) => (
                      <tr key={`${row.id}-${row.risk_type || 'risk'}`}>
                        <td style={styles.td}>
                          <strong>{row.name}</strong>
                          <div style={styles.rowSubtle}>{row.category || 'Uncategorized'}</div>
                        </td>
                        <td style={styles.td}>{formatRiskType(row.risk_type)}</td>
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
        </>
      )}
    </section>
  );
}
