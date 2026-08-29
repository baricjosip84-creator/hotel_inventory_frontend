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
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

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
  const { ui, locale } = useAppTranslation();
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost Risk Summary")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Actionable costing exceptions from received costs, standard cost fallback, and movement cost history.")}
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costRiskQuery.refetch()}
        >
          {ui("Refresh Risk")}
        </button>
      </div>

      {costRiskQuery.isLoading ? (
        <div style={styles.emptyCell}>{ui("Loading cost risk summary...")}</div>
      ) : costRiskQuery.isError ? (
        <div style={styles.errorBox}>{ui("Unable to load cost risk summary.")}</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title={ui("High Variance")}
              value={toNumber(costRiskSummary?.totals.high_variance_products)}
              subtitle={`≥ ${formatPercent(costRiskSummary?.thresholds.variance_threshold_percent, locale)} ${ui('from standard cost')}`}
              tone={toNumber(costRiskSummary?.totals.high_variance_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Missing Cost")}
              value={toNumber(costRiskSummary?.totals.missing_cost_products)}
              subtitle={ui("Stocked products with no received or standard cost")}
              tone={toNumber(costRiskSummary?.totals.missing_cost_products) > 0 ? 'warn' : 'good'}
            />
            <StatCard
              title={ui("Inconsistent History")}
              value={toNumber(costRiskSummary?.totals.inconsistent_cost_history_products)}
              subtitle={`${ui('Cost range spread')} ≥ ${formatPercent(costRiskSummary?.thresholds.history_spread_threshold_percent, locale)}`}
              tone={toNumber(costRiskSummary?.totals.inconsistent_cost_history_products) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <CostRiskList
              title={ui("High variance products")}
              emptyText={ui("No products exceed the variance threshold.")}
              rows={costRiskSummary?.high_variance ?? []}
              renderDetail={(row) => `${ui('Variance')} ${formatPercent(row.cost_variance_percent, locale)} • ${ui('Standard')} ${formatMoney(row.standard_unit_cost, locale)} • ${ui('Latest')} ${formatMoney(row.latest_unit_cost, locale)}`}
              onOpenHistory={onOpenCostHistory}
            />
            <CostRiskList
              title={ui("Missing cost products")}
              emptyText={ui("No stocked products are missing cost.")}
              rows={costRiskSummary?.missing_cost ?? []}
              renderDetail={(row) => `${ui('Stock')} ${formatLocalizedNumber(Number(toNumber(row.current_stock_quantity)), locale)} ${row.unit} • ${ui('Add standard cost or receive costed stock')}`}
              onOpenHistory={onOpenCostHistory}
            />
            <CostRiskList
              title={ui("Inconsistent cost history")}
              emptyText={ui("No products exceed the history spread threshold.")}
              rows={costRiskSummary?.inconsistent_cost_history ?? []}
              renderDetail={(row) => `${ui('Spread')} ${formatPercent(row.cost_history_spread_percent, locale)} • ${ui('Range')} ${formatMoney(row.min_unit_cost, locale)} ${ui('to')} ${formatMoney(row.max_unit_cost, locale)}`}
              onOpenHistory={onOpenCostHistory}
            />
          </div>

          <div style={styles.packageHeader}>
            <div>
              <h4 style={styles.sectionTitle}>{ui("Risk detail")}</h4>
              <p style={styles.panelSubtitle}>
                {ui("Filtered actionable costing exceptions for review and CSV export. Read-only; does not modify stock or cost records.")}
              </p>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onExportCostRiskDetailsCsv}
              disabled={(costRiskDetails?.rows ?? []).length === 0}
            >
              {ui("Export Risk CSV")}
            </button>
          </div>

          <div style={styles.filterGrid}>
            <div>
              <label style={styles.label}>{ui("Risk type")}</label>
              <select
                style={styles.input}
                value={costRiskDetailFilters.riskType}
                onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, riskType: event.target.value }))}
              >
                <option value="">{ui("All risks")}</option>
                <option value="high_variance">{ui("High variance")}</option>
                <option value="missing_cost">{ui("Missing cost")}</option>
                <option value="inconsistent_history">{ui("Inconsistent history")}</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>{ui("Search risk")}</label>
              <input
                style={styles.input}
                value={costRiskDetailFilters.search}
                onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder={ui("Search product or category")}
              />
            </div>
            <div>
              <label style={styles.label}>{ui("Sort")}</label>
              <select
                style={styles.input}
                value={costRiskDetailFilters.sort}
                onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, sort: event.target.value }))}
              >
                <option value="risk_priority">{ui("Risk priority")}</option>
                <option value="estimated_value">{ui("Estimated value")}</option>
                <option value="stock_quantity">{ui("Stock quantity")}</option>
                <option value="name">{ui("Product name")}</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>{ui("Direction")}</label>
              <select
                style={styles.input}
                value={costRiskDetailFilters.direction}
                onChange={(event) => setCostRiskDetailFilters((current) => ({ ...current, direction: event.target.value }))}
              >
                <option value="desc">{ui("Descending")}</option>
                <option value="asc">{ui("Ascending")}</option>
              </select>
            </div>
          </div>

          {costRiskDetailsQuery.isLoading ? (
            <div style={styles.emptyCell}>{ui("Loading risk detail...")}</div>
          ) : costRiskDetailsQuery.isError ? (
            <div style={styles.errorBox}>{ui("Unable to load risk detail.")}</div>
          ) : (
            <div style={styles.tableWrapperCompact}>
              <div style={styles.rowSubtle}>
                {ui("Showing")} {(costRiskDetails?.rows ?? []).length} {ui("of")} {toNumber(costRiskDetails?.total)} {ui("risk rows • Filtered value")} {formatMoney(costRiskDetails?.filtered_estimated_inventory_value, locale)}
              </div>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("Product")}</th>
                    <th style={styles.th}>{ui("Risk")}</th>
                    <th style={styles.th}>{ui("Stock")}</th>
                    <th style={styles.th}>{ui("Variance")}</th>
                    <th style={styles.th}>{ui("History Spread")}</th>
                    <th style={styles.th}>{ui("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(costRiskDetails?.rows ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>{ui("No cost risk rows match the current filters.")}</td>
                    </tr>
                  ) : (
                    (costRiskDetails?.rows ?? []).map((row) => (
                      <tr key={`${row.id}-${row.risk_type || 'risk'}`}>
                        <td style={styles.td}>
                          <strong>{row.name}</strong>
                          <div style={styles.rowSubtle}>{row.category || ui('Uncategorized')}</div>
                        </td>
                        <td style={styles.td}>{ui(formatRiskType(row.risk_type))}</td>
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
        </>
      )}
    </section>
  );
}
