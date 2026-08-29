import type { Dispatch, SetStateAction } from 'react';
import { styles } from './productStyles';
import { CostValuationList, StatCard } from './productSummaryComponents';
import {
  formatMoney,
  formatValuationBasis,
  toNumber
} from './productFormatting';
import type { CostValuationDetailFilterState } from './productCostAssessmentApi';
import type {
  ProductCostRiskItem,
  ProductCostValuationDetailsResponse,
  ProductCostValuationItem,
  ProductCostValuationSummaryResponse,
  ProductItem
} from '../../types/inventory';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type ProductCostValuationPanelProps = {
  costValuationQuery: {
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  };
  costValuationSummary?: ProductCostValuationSummaryResponse;
  costValuationDetailsQuery: {
    isLoading: boolean;
    isError: boolean;
  };
  costValuationDetails?: ProductCostValuationDetailsResponse;
  costValuationDetailFilters: CostValuationDetailFilterState;
  setCostValuationDetailFilters: Dispatch<SetStateAction<CostValuationDetailFilterState>>;
  onOpenCostHistory: (product: ProductItem | ProductCostRiskItem) => void;
  onExportCostValuationDetailsCsv: () => void;
  onViewCategory: (category: string) => void;
};

export function ProductCostValuationPanel({
  costValuationQuery,
  costValuationSummary,
  costValuationDetailsQuery,
  costValuationDetails,
  costValuationDetailFilters,
  setCostValuationDetailFilters,
  onOpenCostHistory,
  onExportCostValuationDetailsCsv,
  onViewCategory
}: ProductCostValuationPanelProps) {
  const { ui, locale } = useAppTranslation();
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost Valuation Summary")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Read-only estimated inventory valuation by cost basis. This does not change stock quantities or receiving behavior.")}
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costValuationQuery.refetch()}
        >
          {ui("Refresh Valuation")}
        </button>
      </div>

      {costValuationQuery.isLoading ? (
        <div style={styles.emptyCell}>{ui("Loading cost valuation summary...")}</div>
      ) : costValuationQuery.isError ? (
        <div style={styles.errorBox}>{ui("Unable to load cost valuation summary.")}</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title={ui("Estimated Value")}
              value={formatMoney(costValuationSummary?.totals.total_estimated_inventory_value, locale)}
              subtitle={ui("Latest received cost, then standard fallback")}
            />
            <StatCard
              title={ui("Received Cost Value")}
              value={formatMoney(costValuationSummary?.totals.received_cost_value, locale)}
              subtitle={ui("Valued from movement cost audit")}
              tone="good"
            />
            <StatCard
              title={ui("Standard Fallback Value")}
              value={formatMoney(costValuationSummary?.totals.standard_fallback_value, locale)}
              subtitle={ui("Valued from product standard cost")}
            />
            <StatCard
              title={ui("Unvalued Stock")}
              value={toNumber(costValuationSummary?.totals.unvalued_stocked_products)}
              subtitle={`${formatLocalizedNumber(Number(toNumber(costValuationSummary?.totals.unvalued_stock_quantity)), locale)} ${ui('units excluded from value')}`}
              tone={toNumber(costValuationSummary?.totals.unvalued_stocked_products) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <CostValuationList
              title={ui("Top value products")}
              emptyText={ui("No valued stocked products found.")}
              rows={costValuationSummary?.top_value_products ?? []}
              onOpenHistory={onOpenCostHistory}
            />
            <div style={styles.riskCard}>
              <h4 style={styles.sectionTitle}>{ui("Value by basis")}</h4>
              {(costValuationSummary?.basis_breakdown ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>{ui("No stocked product valuation basis found.")}</div>
              ) : (
                <div style={styles.riskList}>
                  {(costValuationSummary?.basis_breakdown ?? []).map((row) => (
                    <div key={row.valuation_basis} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{ui(formatValuationBasis(row.valuation_basis))}</div>
                        <div style={styles.rowSubtle}>
                          {toNumber(row.stocked_products)} {ui("products •")} {formatLocalizedNumber(Number(toNumber(row.stock_quantity)), locale)} {ui("units")}
                        </div>
                      </div>
                      <div style={styles.rowTitle}>{formatMoney(row.estimated_value, locale)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={styles.tableWrapperCompact}>
            <table style={styles.compactTable}>
              <thead>
                <tr>
                  <th style={styles.th}>{ui("Category")}</th>
                  <th style={styles.th}>{ui("Stocked Products")}</th>
                  <th style={styles.th}>{ui("Stock Qty")}</th>
                  <th style={styles.th}>{ui("Estimated Value")}</th>
                  <th style={styles.th}>{ui("Unvalued")}</th>
                  <th style={styles.th}>{ui("Action")}</th>
                </tr>
              </thead>
              <tbody>
                {(costValuationSummary?.category_breakdown ?? []).length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={6}>{ui("No stocked category valuation found.")}</td>
                  </tr>
                ) : (
                  (costValuationSummary?.category_breakdown ?? []).map((row) => (
                    <tr key={row.category}>
                      <td style={styles.td}>{row.category}</td>
                      <td style={styles.td}>{toNumber(row.stocked_products)}</td>
                      <td style={styles.td}>{formatLocalizedNumber(Number(toNumber(row.stock_quantity)), locale)}</td>
                      <td style={styles.td}>{formatMoney(row.estimated_value, locale)}</td>
                      <td style={styles.td}>{toNumber(row.unvalued_stocked_products)}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => onViewCategory(row.category === 'Uncategorized' ? '' : row.category)}
                        >
                          {ui("View Category")}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.packageHeader}>
            <div>
              <h4 style={styles.sectionTitle}>{ui("Valuation detail")}</h4>
              <p style={styles.panelSubtitle}>
                {ui("Filtered stocked-product valuation rows for review and export. Read-only; uses the same cost basis as the summary above.")}
              </p>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onExportCostValuationDetailsCsv}
              disabled={(costValuationDetails?.rows ?? []).length === 0}
            >
              {ui("Export Valuation CSV")}
            </button>
          </div>

          <div style={styles.filterGrid}>
            <div>
              <label style={styles.label}>{ui("Valuation basis")}</label>
              <select
                style={styles.input}
                value={costValuationDetailFilters.valuationBasis}
                onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, valuationBasis: event.target.value }))}
              >
                <option value="">{ui("All stocked")}</option>
                <option value="received">{ui("Received cost")}</option>
                <option value="standard">{ui("Standard fallback")}</option>
                <option value="none">{ui("No cost")}</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>{ui("Search detail")}</label>
              <input
                style={styles.input}
                value={costValuationDetailFilters.search}
                onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder={ui("Search product or category")}
              />
            </div>
            <div>
              <label style={styles.label}>{ui("Sort")}</label>
              <select
                style={styles.input}
                value={costValuationDetailFilters.sort}
                onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, sort: event.target.value }))}
              >
                <option value="estimated_value">{ui("Estimated value")}</option>
                <option value="stock_quantity">{ui("Stock quantity")}</option>
                <option value="name">{ui("Product name")}</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>{ui("Direction")}</label>
              <select
                style={styles.input}
                value={costValuationDetailFilters.direction}
                onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, direction: event.target.value }))}
              >
                <option value="desc">{ui("Descending")}</option>
                <option value="asc">{ui("Ascending")}</option>
              </select>
            </div>
          </div>

          {costValuationDetailsQuery.isLoading ? (
            <div style={styles.emptyCell}>{ui("Loading valuation detail...")}</div>
          ) : costValuationDetailsQuery.isError ? (
            <div style={styles.errorBox}>{ui("Unable to load valuation detail.")}</div>
          ) : (
            <div style={styles.tableWrapperCompact}>
              <div style={styles.rowSubtle}>
                {ui("Showing")} {(costValuationDetails?.rows ?? []).length} {ui("of")} {toNumber(costValuationDetails?.total)} {ui("stocked products • Filtered value")} {formatMoney(costValuationDetails?.filtered_estimated_inventory_value, locale)}
              </div>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>{ui("Product")}</th>
                    <th style={styles.th}>{ui("Basis")}</th>
                    <th style={styles.th}>{ui("Stock")}</th>
                    <th style={styles.th}>{ui("Effective Cost")}</th>
                    <th style={styles.th}>{ui("Estimated Value")}</th>
                    <th style={styles.th}>{ui("Action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(costValuationDetails?.rows ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>{ui("No valuation detail rows match the current filters.")}</td>
                    </tr>
                  ) : (
                    (costValuationDetails?.rows ?? []).map((row: ProductCostValuationItem) => (
                      <tr key={row.id}>
                        <td style={styles.td}>
                          <strong>{row.name}</strong>
                          <div style={styles.rowSubtle}>{row.category || ui('Uncategorized')}</div>
                        </td>
                        <td style={styles.td}>{ui(formatValuationBasis(row.valuation_basis))}</td>
                        <td style={styles.td}>{formatLocalizedNumber(Number(toNumber(row.current_stock_quantity)), locale)} {row.unit}</td>
                        <td style={styles.td}>{formatMoney(row.effective_unit_cost, locale)}</td>
                        <td style={styles.td}>{formatMoney(row.estimated_inventory_value, locale)}</td>
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
