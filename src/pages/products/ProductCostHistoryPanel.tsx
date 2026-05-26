import type { Dispatch, SetStateAction } from 'react';
import type { ProductCostHistoryItem, ProductCostHistoryResponse, ProductCostRiskItem, ProductItem, ProductStandardCostHistoryItem } from '../../types/inventory';
import type { CostHistoryFilterState } from './productCostHistoryApi';
import { formatDateTime, formatMoney } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type CostHistoryQueryState = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

type StandardCostHistoryQueryState = {
  isLoading: boolean;
};

type ProductCostHistoryPanelProps = {
  selectedCostProduct: ProductItem | ProductCostRiskItem | null;
  costHistoryQuery: CostHistoryQueryState;
  standardCostHistoryQuery: StandardCostHistoryQueryState;
  costHistory: ProductCostHistoryItem[];
  standardCostHistory: ProductStandardCostHistoryItem[];
  costSummary?: ProductCostHistoryResponse['cost_summary'];
  costHistoryFilters: CostHistoryFilterState;
  setCostHistoryFilters: Dispatch<SetStateAction<CostHistoryFilterState>>;
  onExportCostHistoryCsv: () => void;
  onExportStandardCostHistoryCsv: () => void;
  onCloseCostHistory: () => void;
  onClearCostHistoryFilters: () => void;
};

export function ProductCostHistoryPanel({
  selectedCostProduct,
  costHistoryQuery,
  standardCostHistoryQuery,
  costHistory,
  standardCostHistory,
  costSummary,
  costHistoryFilters,
  setCostHistoryFilters,
  onExportCostHistoryCsv,
  onExportStandardCostHistoryCsv,
  onCloseCostHistory,
  onClearCostHistoryFilters
}: ProductCostHistoryPanelProps) {
  if (!selectedCostProduct) {
    return null;
  }

  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Cost History for {selectedCostProduct.name}</h3>
          <p style={styles.panelSubtitle}>
            Read-only cost audit from stock movements. This does not change inventory value or stock quantities.
          </p>
        </div>
        <div style={styles.actionGroup}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onExportCostHistoryCsv}
            disabled={costHistory.length === 0}
          >
            Export Cost History CSV
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onExportStandardCostHistoryCsv}
            disabled={standardCostHistory.length === 0}
          >
            Export Standard Cost CSV
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onCloseCostHistory}>
            Close Cost History
          </button>
        </div>
      </div>

      <div style={styles.formGrid}>
        <div>
          <label style={styles.label}>Cost source</label>
          <input
            style={styles.input}
            value={costHistoryFilters.costSource}
            onChange={(event) =>
              setCostHistoryFilters((current) => ({ ...current, costSource: event.target.value }))
            }
            placeholder="Example: shipment_item_unit_cost"
          />
        </div>

        <div>
          <label style={styles.label}>Cost from</label>
          <input
            style={styles.input}
            type="date"
            value={costHistoryFilters.costFrom}
            onChange={(event) =>
              setCostHistoryFilters((current) => ({ ...current, costFrom: event.target.value }))
            }
          />
        </div>

        <div>
          <label style={styles.label}>Cost to</label>
          <input
            style={styles.input}
            type="date"
            value={costHistoryFilters.costTo}
            onChange={(event) =>
              setCostHistoryFilters((current) => ({ ...current, costTo: event.target.value }))
            }
          />
        </div>

        <div style={styles.formActions}>
          <button type="button" style={styles.secondaryButton} onClick={onClearCostHistoryFilters}>
            Clear Cost Filters
          </button>
        </div>
      </div>

      {costHistoryQuery.isLoading ? <p>Loading cost history...</p> : null}

      {costHistoryQuery.isError ? (
        <p>Failed to load cost history: {(costHistoryQuery.error as Error).message || 'Unknown error'}</p>
      ) : null}

      {!costHistoryQuery.isLoading && !costHistoryQuery.isError ? (
        <>
          <div style={styles.statsGrid}>
            <StatCard
              title="Costed Movements"
              value={String(costSummary?.costed_movement_count ?? 0)}
              subtitle="Movements with unit cost"
            />
            <StatCard
              title="Received Qty"
              value={String(costSummary?.received_quantity ?? 0)}
              subtitle={selectedCostProduct.unit}
            />
            <StatCard
              title="Weighted Avg Cost"
              value={formatMoney(costSummary?.weighted_average_unit_cost)}
              subtitle="Received total / received qty"
            />
            <StatCard
              title="Received Cost"
              value={formatMoney(costSummary?.received_total_cost)}
              subtitle="Costed receipt value"
            />
            <StatCard
              title="Cost Range"
              value={`${formatMoney(costSummary?.min_unit_cost)} – ${formatMoney(costSummary?.max_unit_cost)}`}
              subtitle="Min / max unit cost"
            />
            <StatCard
              title="Latest Cost Audit"
              value={formatDateTime(costSummary?.latest_cost_at)}
              subtitle="Most recent costed movement"
            />
          </div>

          <div style={styles.tableWrapper}>
            <h4 style={styles.sectionTitle}>Standard Cost Changes</h4>
            <table style={styles.packageTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Changed At</th>
                  <th style={styles.th}>Previous</th>
                  <th style={styles.th}>New</th>
                  <th style={styles.th}>Changed By</th>
                  <th style={styles.th}>Source</th>
                </tr>
              </thead>
              <tbody>
                {standardCostHistoryQuery.isLoading ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>
                      Loading standard cost changes...
                    </td>
                  </tr>
                ) : standardCostHistory.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>
                      No standard cost changes recorded for this product.
                    </td>
                  </tr>
                ) : (
                  standardCostHistory.map((entry: ProductStandardCostHistoryItem) => (
                    <tr key={entry.id}>
                      <td style={styles.td}>{formatDateTime(entry.changed_at)}</td>
                      <td style={styles.td}>{formatMoney(entry.previous_standard_unit_cost)}</td>
                      <td style={styles.td}>{formatMoney(entry.new_standard_unit_cost)}</td>
                      <td style={styles.td}>{entry.changed_by_user_name || entry.changed_by_user_id || '-'}</td>
                      <td style={styles.td}>{entry.change_source}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.tableWrapper}>
            <h4 style={styles.sectionTitle}>Received Movement Costs</h4>
            <table style={styles.packageTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Quantity</th>
                  <th style={styles.th}>Unit Cost</th>
                  <th style={styles.th}>Total Cost</th>
                  <th style={styles.th}>Source</th>
                  <th style={styles.th}>Shipment</th>
                  <th style={styles.th}>Note</th>
                </tr>
              </thead>
              <tbody>
                {costHistory.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={7}>
                      No costed stock movements found for this product.
                    </td>
                  </tr>
                ) : (
                  costHistory.map((movement: ProductCostHistoryItem) => (
                    <tr key={movement.id}>
                      <td style={styles.td}>{formatDateTime(movement.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{String(movement.change)}</div>
                        <div style={styles.rowSubtle}>{movement.reason}</div>
                      </td>
                      <td style={styles.td}>{formatMoney(movement.unit_cost)}</td>
                      <td style={styles.td}>{formatMoney(movement.total_cost)}</td>
                      <td style={styles.td}>{movement.cost_source || '-'}</td>
                      <td style={styles.td}>
                        {movement.shipment_id ? (
                          <div>
                            <div style={styles.rowTitle}>{movement.shipment_po_number || 'Shipment'}</div>
                            <div style={styles.rowSubtle}>{movement.shipment_id}</div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={styles.td}>{movement.receiving_note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
