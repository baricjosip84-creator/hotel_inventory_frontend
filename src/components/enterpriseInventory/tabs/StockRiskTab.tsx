import { DataTable, MetricCard } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime, formatNumber, toNumber } from '../EnterpriseInventoryFormat';
import type { StockItem, StockMovement } from '../EnterpriseInventoryTypes';

type StockRiskSummary = {
  critical: number;
  shortagePositions: number;
};

type StockRiskTabProps = {
  lowStockItems: StockItem[];
  lowStockLoading: boolean;
  recentStockMovements: StockMovement[];
  stockMovementsLoading: boolean;
  stockRiskSummary: StockRiskSummary;
};

function effectiveMinimum(item: StockItem): number {
  if (item.effective_min_quantity !== undefined && item.effective_min_quantity !== null) {
    return toNumber(item.effective_min_quantity);
  }
  const locationMinimum = toNumber(item.min_quantity);
  return locationMinimum > 0 ? locationMinimum : toNumber(item.product_min_stock);
}

function usableQuantity(item: StockItem): number {
  const physical = toNumber(item.quantity);
  const usableLots = item.usable_lot_quantity === undefined || item.usable_lot_quantity === null
    ? physical
    : toNumber(item.usable_lot_quantity);
  return Math.min(physical, usableLots);
}

export function StockRiskTab({
  lowStockItems,
  lowStockLoading,
  recentStockMovements,
  stockMovementsLoading,
  stockRiskSummary
}: StockRiskTabProps) {
  return (
    <section style={styles.grid}>
      <div style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Low stock dashboard</h2>
          <p style={styles.helper}>Uses usable, non-expired stock at each location and the effective location/product minimum threshold.</p>
          <div style={styles.statGrid}>
            <MetricCard label="Low stock positions" value={lowStockItems.length} />
            <MetricCard label="No usable stock positions" value={stockRiskSummary.critical} />
            <MetricCard label="Shortage positions" value={stockRiskSummary.shortagePositions} />
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Recent stock movements</h2>
          <DataTable
            loading={stockMovementsLoading}
            empty="No stock movements found."
            headers={['Product', 'Change', 'Reason', 'Shipment', 'User', 'Created']}
            rows={recentStockMovements.map((item) => [
              item.product_name || '-',
              formatNumber(item.change),
              item.reason,
              item.shipment_po_number || '-',
              item.user_name || '-',
              formatDateTime(item.created_at)
            ])}
          />
        </section>
      </div>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Products below minimum usable stock</h2>
        <DataTable
          loading={lowStockLoading}
          empty="No stock positions are below their configured minimum usable stock."
          headers={['Product', 'Location', 'Physical', 'Usable', 'Minimum', 'Shortage', 'Updated']}
          rows={lowStockItems.map((item) => {
            const minimum = effectiveMinimum(item);
            const usable = usableQuantity(item);
            const unit = item.product_unit || '';
            return [
              item.product_name || '-',
              item.storage_location_name || '-',
              `${formatNumber(item.quantity)} ${unit}`.trim(),
              `${formatNumber(usable)} ${unit}`.trim(),
              `${formatNumber(minimum)} ${unit}`.trim(),
              `${formatNumber(Math.max(minimum - usable, 0))} ${unit}`.trim(),
              formatDateTime(item.updated_at)
            ];
          })}
        />
      </section>
    </section>
  );
}
