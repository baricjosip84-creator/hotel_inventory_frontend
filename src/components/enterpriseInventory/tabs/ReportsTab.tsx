import { useMemo } from 'react';
import { DataTable, MetricCard, SectionCard, styles } from '../EnterpriseInventoryShared';
import { formatDateTime, formatNumber, toNumber } from '../EnterpriseInventoryFormat';
import type {
  InventoryValuationReport,
  ProductMovementReportRow,
  ProcurementSummaryReport,
  StockByLocationReportRow
} from '../EnterpriseInventoryTypes';

type ReportsTabProps = {
  inventoryValuationReport?: InventoryValuationReport;
  inventoryValuationLoading: boolean;
  stockByLocationRows: StockByLocationReportRow[];
  stockByLocationLoading: boolean;
  productMovementRows: ProductMovementReportRow[];
  productMovementLoading: boolean;
  procurementSummaryReport?: ProcurementSummaryReport;
  procurementSummaryLoading: boolean;
};

export function ReportsTab({
  inventoryValuationReport,
  inventoryValuationLoading,
  stockByLocationRows,
  stockByLocationLoading,
  productMovementRows,
  productMovementLoading,
  procurementSummaryReport,
  procurementSummaryLoading
}: ReportsTabProps) {
  const inventoryValuationRows = useMemo(() => inventoryValuationReport?.rows ?? [], [inventoryValuationReport]);

  const reportsSummary = useMemo(() => ({
    valuationRows: toNumber(inventoryValuationReport?.totals?.row_count ?? inventoryValuationRows.length),
    estimatedValue: toNumber(inventoryValuationReport?.totals?.estimated_inventory_value),
    stockLocations: stockByLocationRows.length,
    movementRows: productMovementRows.length,
    overdueShipments: toNumber(procurementSummaryReport?.shipments?.overdue_shipments),
    discrepancy: toNumber(procurementSummaryReport?.lines?.total_discrepancy)
  }), [inventoryValuationReport, inventoryValuationRows.length, stockByLocationRows.length, productMovementRows.length, procurementSummaryReport]);

  return (
    <section style={styles.stack}>
      <SectionCard title="Management reports">
        <p style={styles.helper}>Reads the existing report endpoints for inventory valuation, stock by location, product movements, and procurement summary.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Valuation rows" value={formatNumber(reportsSummary.valuationRows)} />
          <MetricCard label="Estimated value" value={formatNumber(reportsSummary.estimatedValue)} />
          <MetricCard label="Stock locations" value={reportsSummary.stockLocations} />
          <MetricCard label="Movement rows" value={reportsSummary.movementRows} />
          <MetricCard label="Overdue shipments" value={formatNumber(reportsSummary.overdueShipments)} />
          <MetricCard label="Total discrepancy" value={formatNumber(reportsSummary.discrepancy)} />
        </div>
      </SectionCard>

      <SectionCard title="Inventory valuation">
        <DataTable
          loading={inventoryValuationLoading}
          empty="No inventory valuation rows returned."
          headers={['Product', 'Category', 'Location', 'Quantity', 'Estimated unit cost', 'Estimated value', 'Updated']}
          rows={inventoryValuationRows.map((item) => [
            item.product_name || item.product_id,
            item.product_category || '-',
            item.storage_location_name || item.storage_location_id,
            `${formatNumber(item.quantity)} ${item.product_unit || ''}`.trim(),
            formatNumber(item.estimated_unit_cost),
            formatNumber(item.estimated_total_value),
            formatDateTime(item.updated_at)
          ])}
        />
      </SectionCard>

      <SectionCard title="Stock by location">
        <DataTable
          loading={stockByLocationLoading}
          empty="No stock by location rows returned."
          headers={['Location', 'Temperature zone', 'Stock rows', 'Total quantity']}
          rows={stockByLocationRows.map((item) => [
            item.storage_location_name || item.storage_location_id,
            item.temperature_zone || '-',
            formatNumber(item.stock_row_count),
            formatNumber(item.total_quantity)
          ])}
        />
      </SectionCard>

      <SectionCard title="Product movements">
        <DataTable
          loading={productMovementLoading}
          empty="No product movement rows returned."
          headers={['Product', 'Category', 'Movements', 'Total increase', 'Total decrease', 'Last movement']}
          rows={productMovementRows.map((item) => [
            item.product_name || item.product_id,
            item.product_category || '-',
            formatNumber(item.movement_count),
            `${formatNumber(item.total_increase)} ${item.product_unit || ''}`.trim(),
            `${formatNumber(item.total_decrease)} ${item.product_unit || ''}`.trim(),
            formatDateTime(item.last_movement_at)
          ])}
        />
      </SectionCard>

      <SectionCard title="Procurement summary">
        <DataTable
          loading={procurementSummaryLoading}
          empty="Procurement summary has not loaded."
          headers={['Metric', 'Value']}
          rows={procurementSummaryReport ? [
            ['Total shipments', formatNumber(procurementSummaryReport.shipments?.total_shipments)],
            ['Pending shipments', formatNumber(procurementSummaryReport.shipments?.pending_shipments)],
            ['Partial shipments', formatNumber(procurementSummaryReport.shipments?.partial_shipments)],
            ['Received shipments', formatNumber(procurementSummaryReport.shipments?.received_shipments)],
            ['Overdue shipments', formatNumber(procurementSummaryReport.shipments?.overdue_shipments)],
            ['Active shipment lines', formatNumber(procurementSummaryReport.lines?.total_active_shipment_lines)],
            ['Ordered quantity', formatNumber(procurementSummaryReport.lines?.total_ordered_quantity)],
            ['Received quantity', formatNumber(procurementSummaryReport.lines?.total_received_quantity)],
            ['Total discrepancy', formatNumber(procurementSummaryReport.lines?.total_discrepancy)]
          ] : []}
        />
      </SectionCard>
    </section>
  );
}
