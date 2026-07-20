import { DataTable, MetricCard, SectionCard } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDate, formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type {
  AlertItem,
  DashboardLowStockRow,
  DashboardOverdueShipment,
  DashboardSupplierPerformance,
  StockItem,
  StockMovement
} from '../EnterpriseInventoryTypes';

type OperationsDashboardSummary = {
  totalProducts: number;
  totalSuppliers: number;
  totalStorageLocations: number;
  openShipments: number;
  unresolvedAlerts: number;
  criticalAlerts: number;
  lowStockRows: number;
  lowStockRate: number;
};

type OperationsDashboardTabProps = {
  summary: OperationsDashboardSummary;
  lowStockRows: DashboardLowStockRow[];
  lowStockLoading: boolean;
  overdueShipments: DashboardOverdueShipment[];
  overdueShipmentsLoading: boolean;
  unresolvedAlerts: AlertItem[];
  unresolvedAlertsLoading: boolean;
  recentActivity: StockMovement[];
  recentActivityLoading: boolean;
  supplierPerformance: DashboardSupplierPerformance[];
  supplierPerformanceLoading: boolean;
  currentStockRows: StockItem[];
  currentStockLoading: boolean;
};

export function OperationsDashboardTab({
  summary,
  lowStockRows,
  lowStockLoading,
  overdueShipments,
  overdueShipmentsLoading,
  unresolvedAlerts,
  unresolvedAlertsLoading,
  recentActivity,
  recentActivityLoading,
  supplierPerformance,
  supplierPerformanceLoading,
  currentStockRows,
  currentStockLoading
}: OperationsDashboardTabProps) {
  return (
    <section style={styles.stack}>
      <div style={styles.metricsGrid}>
        <MetricCard label="Products" value={summary.totalProducts} helper="Active catalog rows" />
        <MetricCard label="Suppliers" value={summary.totalSuppliers} helper="Active suppliers" />
        <MetricCard label="Locations" value={summary.totalStorageLocations} helper="Storage locations" />
        <MetricCard label="Open shipments" value={summary.openShipments} helper="Pending + partial" />
        <MetricCard label="Low-stock rows" value={summary.lowStockRows} helper={`${summary.lowStockRate.toFixed(1)}% of stock rows`} />
        <MetricCard label="Critical alerts" value={summary.criticalAlerts} helper={`${summary.unresolvedAlerts} unresolved total`} />
      </div>

      <SectionCard title="Current stock by product and location">
        <p style={styles.helper}>Live stock rows from the operational stock endpoint, grouped by product and storage location.</p>
        <DataTable
          loading={currentStockLoading}
          empty="No current stock rows returned."
          headers={['Product', 'Location', 'On hand', 'Reserved', 'Free', 'Min', 'Updated']}
          rows={currentStockRows.map((item) => [
            item.product_name || item.product_id,
            item.storage_location_name || item.storage_location_id,
            `${formatNumber(item.quantity)} ${item.product_unit || ''}`.trim(),
            formatNumber(item.reserved_quantity ?? 0),
            `${formatNumber(item.projected_free_quantity ?? item.quantity)} ${item.product_unit || ''}`.trim(),
            formatNumber(item.effective_min_quantity ?? item.min_quantity ?? item.product_min_stock),
            formatDateTime(item.updated_at)
          ])}
        />
      </SectionCard>

      <section style={styles.grid}>
        <SectionCard title="Dashboard low stock">
          <DataTable
            loading={lowStockLoading}
            empty="No dashboard low-stock rows."
            headers={['Product', 'Location', 'Qty', 'Min', 'Shortage', 'Updated']}
            rows={lowStockRows.map((item) => [
              item.product_name || item.product_id,
              item.storage_location_name || item.storage_location_id,
              formatNumber(item.quantity),
              formatNumber(item.min_stock ?? item.product_min_stock ?? item.min_quantity),
              formatNumber(item.shortage),
              formatDateTime(item.updated_at)
            ])}
          />
        </SectionCard>

        <SectionCard title="Overdue shipments">
          <DataTable
            loading={overdueShipmentsLoading}
            empty="No overdue dashboard shipments."
            headers={['PO', 'Supplier', 'Delivery', 'Status', 'Lines', 'Received / Ordered']}
            rows={overdueShipments.map((item) => [
              item.po_number || item.id,
              item.supplier_name || item.supplier_id,
              formatDate(item.delivery_date),
              item.status,
              formatNumber(item.line_count),
              `${formatNumber(item.total_received_quantity)} / ${formatNumber(item.total_ordered_quantity)}`
            ])}
          />
        </SectionCard>

        <SectionCard title="Unresolved dashboard alerts">
          <DataTable
            loading={unresolvedAlertsLoading}
            empty="No unresolved dashboard alerts."
            headers={['Severity', 'Type', 'Product', 'Message', 'Ack', 'Created']}
            rows={unresolvedAlerts.map((item) => [
              item.severity,
              item.type,
              item.product_name || item.product_id || '-',
              item.message,
              item.acknowledged ? 'Yes' : 'No',
              formatDateTime(item.created_at)
            ])}
          />
        </SectionCard>

        <SectionCard title="Recent dashboard activity">
          <DataTable
            loading={recentActivityLoading}
            empty="No dashboard activity rows."
            headers={['Product', 'Change', 'Reason', 'Shipment', 'User', 'Created']}
            rows={recentActivity.map((item) => [
              item.product_name || item.product_id,
              formatNumber(item.change),
              item.reason,
              item.shipment_po_number || item.shipment_id || '-',
              item.user_name || '-',
              formatDateTime(item.created_at)
            ])}
          />
        </SectionCard>

        <SectionCard title="Supplier performance">
          <DataTable
            loading={supplierPerformanceLoading}
            empty="No supplier performance rows."
            headers={['Supplier', 'Total', 'Pending', 'Partial', 'Received', 'Overdue', 'Last delivery']}
            rows={supplierPerformance.map((item) => [
              item.supplier_name || item.supplier_id,
              formatNumber(item.total_shipments),
              formatNumber(item.pending_shipments),
              formatNumber(item.partial_shipments),
              formatNumber(item.received_shipments),
              formatNumber(item.overdue_shipments),
              formatDate(item.last_delivery_date)
            ])}
          />
        </SectionCard>
      </section>
    </section>
  );
}
