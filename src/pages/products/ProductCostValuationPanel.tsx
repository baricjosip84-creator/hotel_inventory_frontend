import type { Dispatch, SetStateAction } from 'react';
import { styles } from './productStyles';
import { CostValuationList, StatCard } from './productSummaryComponents';
import {
  formatMoney,
  formatValuationBasis,
  toNumber
} from './productFormatting';
import type { CostValuationDetailFilterState } from './productCostAssessmentApi';
import type { ProductCostHistoryItem, ProductCostRiskItem } from '../../types/inventory';

type ProductCostValuationPanelProps = {
  costValuationQuery: {
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
  };
  costValuationSummary: any;
  costValuationDetailsQuery: {
    isLoading: boolean;
    isError: boolean;
  };
  costValuationDetails: any;
  costValuationDetailFilters: CostValuationDetailFilterState;
  setCostValuationDetailFilters: Dispatch<SetStateAction<CostValuationDetailFilterState>>;
  onOpenCostHistory: (product: ProductCostHistoryItem | ProductCostRiskItem | any) => void;
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
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost Valuation Summary</h3>
          <p style={styles.panelSubtitle}>
            Read-only estimated inventory valuation by cost basis. This does not change stock quantities or receiving behavior.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => costValuationQuery.refetch()}
        >
          Refresh Valuation
        </button>
      </div>

      {costValuationQuery.isLoading ? (
        <div style={styles.emptyCell}>Loading cost valuation summary...</div>
      ) : costValuationQuery.isError ? (
        <div style={styles.errorBox}>Unable to load cost valuation summary.</div>
      ) : (
        <>
          <div style={styles.costReadinessGrid}>
            <StatCard
              title="Estimated Value"
              value={formatMoney(costValuationSummary?.totals.total_estimated_inventory_value)}
              subtitle="Latest received cost, then standard fallback"
            />
            <StatCard
              title="Received Cost Value"
              value={formatMoney(costValuationSummary?.totals.received_cost_value)}
              subtitle="Valued from movement cost audit"
              tone="good"
            />
            <StatCard
              title="Standard Fallback Value"
              value={formatMoney(costValuationSummary?.totals.standard_fallback_value)}
              subtitle="Valued from product standard cost"
            />
            <StatCard
              title="Unvalued Stock"
              value={toNumber(costValuationSummary?.totals.unvalued_stocked_products)}
              subtitle={`${toNumber(costValuationSummary?.totals.unvalued_stock_quantity).toLocaleString()} units excluded from value`}
              tone={toNumber(costValuationSummary?.totals.unvalued_stocked_products) > 0 ? 'warn' : 'good'}
            />
          </div>

          <div style={styles.riskGrid}>
            <CostValuationList
              title="Top value products"
              emptyText="No valued stocked products found."
              rows={costValuationSummary?.top_value_products ?? []}
              onOpenHistory={onOpenCostHistory}
            />
            <div style={styles.riskCard}>
              <h4 style={styles.sectionTitle}>Value by basis</h4>
              {(costValuationSummary?.basis_breakdown ?? []).length === 0 ? (
                <div style={styles.rowSubtle}>No stocked product valuation basis found.</div>
              ) : (
                <div style={styles.riskList}>
                  {(costValuationSummary?.basis_breakdown ?? []).map((row: any) => (
                    <div key={row.valuation_basis} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{formatValuationBasis(row.valuation_basis)}</div>
                        <div style={styles.rowSubtle}>
                          {toNumber(row.stocked_products)} products • {toNumber(row.stock_quantity).toLocaleString()} units
                        </div>
                      </div>
                      <div style={styles.rowTitle}>{formatMoney(row.estimated_value)}</div>
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
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Stocked Products</th>
                  <th style={styles.th}>Stock Qty</th>
                  <th style={styles.th}>Estimated Value</th>
                  <th style={styles.th}>Unvalued</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(costValuationSummary?.category_breakdown ?? []).length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={6}>No stocked category valuation found.</td>
                  </tr>
                ) : (
                  (costValuationSummary?.category_breakdown ?? []).map((row: any) => (
                    <tr key={row.category}>
                      <td style={styles.td}>{row.category}</td>
                      <td style={styles.td}>{toNumber(row.stocked_products)}</td>
                      <td style={styles.td}>{toNumber(row.stock_quantity).toLocaleString()}</td>
                      <td style={styles.td}>{formatMoney(row.estimated_value)}</td>
                      <td style={styles.td}>{toNumber(row.unvalued_stocked_products)}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.secondaryButton}
                          onClick={() => onViewCategory(row.category === 'Uncategorized' ? '' : row.category)}
                        >
                          View Category
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
              <h4 style={styles.sectionTitle}>Valuation detail</h4>
              <p style={styles.panelSubtitle}>
                Filtered stocked-product valuation rows for review and export. Read-only; uses the same cost basis as the summary above.
              </p>
            </div>
            <button
              type="button"
              style={styles.secondaryButton}
              onClick={onExportCostValuationDetailsCsv}
              disabled={(costValuationDetails?.rows ?? []).length === 0}
            >
              Export Valuation CSV
            </button>
          </div>

          <div style={styles.filterGrid}>
            <div>
              <label style={styles.label}>Valuation basis</label>
              <select
                style={styles.input}
                value={costValuationDetailFilters.valuationBasis}
                onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, valuationBasis: event.target.value }))}
              >
                <option value="">All stocked</option>
                <option value="received">Received cost</option>
                <option value="standard">Standard fallback</option>
                <option value="none">No cost</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Search detail</label>
              <input
                style={styles.input}
                value={costValuationDetailFilters.search}
                onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search product or category"
              />
            </div>
            <div>
              <label style={styles.label}>Sort</label>
              <select
                style={styles.input}
                value={costValuationDetailFilters.sort}
                onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, sort: event.target.value }))}
              >
                <option value="estimated_value">Estimated value</option>
                <option value="stock_quantity">Stock quantity</option>
                <option value="name">Product name</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Direction</label>
              <select
                style={styles.input}
                value={costValuationDetailFilters.direction}
                onChange={(event) => setCostValuationDetailFilters((current) => ({ ...current, direction: event.target.value }))}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          {costValuationDetailsQuery.isLoading ? (
            <div style={styles.emptyCell}>Loading valuation detail...</div>
          ) : costValuationDetailsQuery.isError ? (
            <div style={styles.errorBox}>Unable to load valuation detail.</div>
          ) : (
            <div style={styles.tableWrapperCompact}>
              <div style={styles.rowSubtle}>
                Showing {(costValuationDetails?.rows ?? []).length} of {toNumber(costValuationDetails?.total)} stocked products • Filtered value {formatMoney(costValuationDetails?.filtered_estimated_inventory_value)}
              </div>
              <table style={styles.compactTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Basis</th>
                    <th style={styles.th}>Stock</th>
                    <th style={styles.th}>Effective Cost</th>
                    <th style={styles.th}>Estimated Value</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(costValuationDetails?.rows ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>No valuation detail rows match the current filters.</td>
                    </tr>
                  ) : (
                    (costValuationDetails?.rows ?? []).map((row: any) => (
                      <tr key={row.id}>
                        <td style={styles.td}>
                          <strong>{row.name}</strong>
                          <div style={styles.rowSubtle}>{row.category || 'Uncategorized'}</div>
                        </td>
                        <td style={styles.td}>{formatValuationBasis(row.valuation_basis)}</td>
                        <td style={styles.td}>{toNumber(row.current_stock_quantity).toLocaleString()} {row.unit}</td>
                        <td style={styles.td}>{formatMoney(row.effective_unit_cost)}</td>
                        <td style={styles.td}>{formatMoney(row.estimated_inventory_value)}</td>
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
