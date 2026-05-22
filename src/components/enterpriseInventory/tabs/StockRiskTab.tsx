import { DataTable, MetricCard, styles } from '../EnterpriseInventoryShared';
import { formatDateTime, formatNumber, toNumber } from '../EnterpriseInventoryFormat';
import type { StockItem, StockMovement } from '../EnterpriseInventoryTypes';

type StockRiskSummary = {
  critical: number;
  shortageUnits: number;
};

type StockRiskTabProps = {
  lowStockItems: StockItem[];
  lowStockLoading: boolean;
  recentStockMovements: StockMovement[];
  stockMovementsLoading: boolean;
  stockRiskSummary: StockRiskSummary;
};

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
          <p style={styles.helper}>Reads the existing /stock?low_stock=true endpoint and compares live stock quantity to product minimum stock.</p>
          <div style={styles.statGrid}>
            <MetricCard label="Low stock rows" value={lowStockItems.length} />
            <MetricCard label="Out of stock rows" value={stockRiskSummary.critical} />
            <MetricCard label="Shortage units" value={formatNumber(stockRiskSummary.shortageUnits)} />
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Recent stock movements</h2>
          <DataTable
            loading={stockMovementsLoading}
            empty="No stock movements found."
            headers={['Product', 'Change', 'Reason', 'Shipment', 'User', 'Created']}
            rows={recentStockMovements.map((item) => [
              item.product_name || item.product_id,
              formatNumber(item.change),
              item.reason,
              item.shipment_po_number || item.shipment_id || '-',
              item.user_name || '-',
              formatDateTime(item.created_at)
            ])}
          />
        </section>
      </div>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Products below minimum stock</h2>
        <DataTable
          loading={lowStockLoading}
          empty="No products are below their configured minimum stock."
          headers={['Product', 'Location', 'Quantity', 'Minimum', 'Shortage', 'Updated']}
          rows={lowStockItems.map((item) => {
            const minimum = toNumber(item.product_min_stock ?? item.min_quantity);
            const quantity = toNumber(item.quantity);
            return [
              item.product_name || item.product_id,
              item.storage_location_name || item.storage_location_id,
              `${formatNumber(item.quantity)} ${item.product_unit || ''}`.trim(),
              formatNumber(minimum),
              formatNumber(Math.max(minimum - quantity, 0)),
              formatDateTime(item.updated_at)
            ];
          })}
        />
      </section>
    </section>
  );
}
