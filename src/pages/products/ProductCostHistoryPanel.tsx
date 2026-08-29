import type { Dispatch, SetStateAction } from 'react';
import type { ProductCostHistoryItem, ProductCostHistoryResponse, ProductCostRiskItem, ProductItem, ProductStandardCostHistoryItem } from '../../types/inventory';
import type { CostHistoryFilterState } from './productCostHistoryApi';
import { formatDateTime, formatMoney } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';

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
  const { ui, locale } = useAppTranslation();
  if (!selectedCostProduct) {
    return null;
  }

  return (
    <section id="product-cost-history-panel" style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Cost History for")} {selectedCostProduct.name}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Read-only cost audit from stock movements. This does not change inventory value or stock quantities.")}
          </p>
        </div>
        <div style={styles.actionGroup}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onExportCostHistoryCsv}
            disabled={costHistory.length === 0}
          >
            {ui("Export Cost History CSV")}
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={onExportStandardCostHistoryCsv}
            disabled={standardCostHistory.length === 0}
          >
            {ui("Export Standard Cost CSV")}
          </button>
          <button type="button" style={styles.secondaryButton} onClick={onCloseCostHistory}>
            {ui("Close Cost History")}
          </button>
        </div>
      </div>

      <div style={styles.formGrid}>
        <div>
          <label style={styles.label}>{ui("Cost source")}</label>
          <input
            style={styles.input}
            value={costHistoryFilters.costSource}
            onChange={(event) =>
              setCostHistoryFilters((current) => ({ ...current, costSource: event.target.value }))
            }
            placeholder={ui("Example: shipment_item_unit_cost")}
          />
        </div>

        <div>
          <label style={styles.label}>{ui("Cost from")}</label>
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
          <label style={styles.label}>{ui("Cost to")}</label>
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
            {ui("Clear Cost Filters")}
          </button>
        </div>
      </div>

      {costHistoryQuery.isLoading ? <div style={styles.emptyCell}>{ui("Loading cost history...")}</div> : null}

      {costHistoryQuery.isError ? (
        <div style={styles.errorBox}>{ui("Failed to load cost history:")} {(costHistoryQuery.error as Error).message || ui('Unknown error')}</div>
      ) : null}

      {!costHistoryQuery.isLoading && !costHistoryQuery.isError ? (
        <>
          <div style={styles.statsGrid}>
            <StatCard
              title={ui("Costed Movements")}
              value={String(costSummary?.costed_movement_count ?? 0)}
              subtitle={ui("Movements with unit cost")}
            />
            <StatCard
              title={ui("Received Qty")}
              value={String(costSummary?.received_quantity ?? 0)}
              subtitle={selectedCostProduct.unit}
            />
            <StatCard
              title={ui("Weighted Avg Cost")}
              value={formatMoney(costSummary?.weighted_average_unit_cost, locale)}
              subtitle={ui("Received total / received qty")}
            />
            <StatCard
              title={ui("Received Cost")}
              value={formatMoney(costSummary?.received_total_cost, locale)}
              subtitle={ui("Costed receipt value")}
            />
            <StatCard
              title={ui("Cost Range")}
              value={`${formatMoney(costSummary?.min_unit_cost, locale)} – ${formatMoney(costSummary?.max_unit_cost, locale)}`}
              subtitle={ui("Min / max unit cost")}
            />
            <StatCard
              title={ui("Latest Cost Audit")}
              value={formatDateTime(costSummary?.latest_cost_at, locale)}
              subtitle={ui("Most recent costed movement")}
            />
          </div>

          <div style={styles.tableWrapper}>
            <h4 style={styles.sectionTitle}>{ui("Standard Cost Changes")}</h4>
            <table style={styles.packageTable}>
              <thead>
                <tr>
                  <th style={styles.th}>{ui("Changed At")}</th>
                  <th style={styles.th}>{ui("Previous")}</th>
                  <th style={styles.th}>{ui("New")}</th>
                  <th style={styles.th}>{ui("Changed By")}</th>
                  <th style={styles.th}>{ui("Source")}</th>
                </tr>
              </thead>
              <tbody>
                {standardCostHistoryQuery.isLoading ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>
                      {ui("Loading standard cost changes...")}
                    </td>
                  </tr>
                ) : standardCostHistory.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>
                      {ui("No standard cost changes recorded for this product.")}
                    </td>
                  </tr>
                ) : (
                  standardCostHistory.map((entry: ProductStandardCostHistoryItem) => (
                    <tr key={entry.id}>
                      <td style={styles.td}>{formatDateTime(entry.changed_at, locale)}</td>
                      <td style={styles.td}>{formatMoney(entry.previous_standard_unit_cost, locale)}</td>
                      <td style={styles.td}>{formatMoney(entry.new_standard_unit_cost, locale)}</td>
                      <td style={styles.td}>{entry.changed_by_user_name || entry.changed_by_user_id || '-'}</td>
                      <td style={styles.td}>{entry.change_source}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={styles.tableWrapper}>
            <h4 style={styles.sectionTitle}>{ui("Received Movement Costs")}</h4>
            <table style={styles.packageTable}>
              <thead>
                <tr>
                  <th style={styles.th}>{ui("Date")}</th>
                  <th style={styles.th}>{ui("Quantity")}</th>
                  <th style={styles.th}>{ui("Unit Cost")}</th>
                  <th style={styles.th}>{ui("Total Cost")}</th>
                  <th style={styles.th}>{ui("Source")}</th>
                  <th style={styles.th}>{ui("Shipment")}</th>
                  <th style={styles.th}>{ui("Note")}</th>
                </tr>
              </thead>
              <tbody>
                {costHistory.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={7}>
                      {ui("No costed stock movements found for this product.")}
                    </td>
                  </tr>
                ) : (
                  costHistory.map((movement: ProductCostHistoryItem) => (
                    <tr key={movement.id}>
                      <td style={styles.td}>{formatDateTime(movement.created_at, locale)}</td>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{String(movement.change)}</div>
                        <div style={styles.rowSubtle}>{movement.reason}</div>
                      </td>
                      <td style={styles.td}>{formatMoney(movement.unit_cost, locale)}</td>
                      <td style={styles.td}>{formatMoney(movement.total_cost, locale)}</td>
                      <td style={styles.td}>{movement.cost_source || '-'}</td>
                      <td style={styles.td}>
                        {movement.shipment_id ? (
                          <div>
                            <div style={styles.rowTitle}>{movement.shipment_po_number || ui('Shipment')}</div>
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
