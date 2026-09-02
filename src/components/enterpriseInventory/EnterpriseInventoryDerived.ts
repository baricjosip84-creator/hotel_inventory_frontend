import { toNumber } from './EnterpriseInventoryFormat';
import type {
  AlertItem,
  CycleCount,
  DashboardSummary,
  DepletionRiskRow,
  DepartmentRequisition,
  InventoryAnomaly,
  PurchaseOrder,
  Shipment,
  ShipmentItem,
  StockItem,
  StockTransfer,
  SupplierInvoice,
  SupplierReturn,
  SupplierTrustScore
} from './EnterpriseInventoryTypes';

export function buildOperationsDashboardSummary(summary?: DashboardSummary) {
  const totalStockRows = toNumber(summary?.stock?.total_stock_rows);
  const lowStockRows = toNumber(summary?.stock?.low_stock_rows);
  const lowStockRate = totalStockRows > 0 ? (lowStockRows / totalStockRows) * 100 : 0;

  return {
    totalProducts: toNumber(summary?.master_data?.total_products),
    totalSuppliers: toNumber(summary?.master_data?.total_suppliers),
    totalStorageLocations: toNumber(summary?.master_data?.total_storage_locations),
    openShipments: toNumber(summary?.shipments?.pending_shipments) + toNumber(summary?.shipments?.partial_shipments),
    unresolvedAlerts: toNumber(summary?.alerts?.unresolved_alerts),
    criticalAlerts: toNumber(summary?.alerts?.critical_unresolved_alerts),
    lowStockRows,
    lowStockRate
  };
}

export function buildAlertsSummary(alerts: AlertItem[]) {
  const unresolved = alerts.filter((item) => !item.resolved).length;
  const critical = alerts.filter((item) => !item.resolved && item.severity === 'critical').length;
  const unacknowledged = alerts.filter((item) => !item.resolved && !item.acknowledged).length;
  return { unresolved, critical, unacknowledged };
}

export function buildStockRiskSummary(lowStockItems: StockItem[]) {
  const operationalQuantity = (item: StockItem) => Math.min(
    toNumber(item.quantity),
    item.usable_lot_quantity === undefined || item.usable_lot_quantity === null
      ? toNumber(item.quantity)
      : toNumber(item.usable_lot_quantity)
  );
  const critical = lowStockItems.filter((item) => operationalQuantity(item) <= 0).length;

  return { critical, shortagePositions: lowStockItems.length };
}

export function buildStockTransferSummary(stockTransfers: StockTransfer[]) {
  const draft = stockTransfers.filter((item) => item.status === 'draft').length;
  const executed = stockTransfers.filter((item) => item.status === 'executed').length;
  const cancelled = stockTransfers.filter((item) => item.status === 'cancelled').length;
  const totalUnits = stockTransfers.reduce((total, item) => total + toNumber(item.total_quantity), 0);

  return { draft, executed, cancelled, totalUnits };
}

export function buildProcurementMatchRows(
  purchaseOrders: PurchaseOrder[],
  shipments: Shipment[],
  invoices: SupplierInvoice[]
) {
  return purchaseOrders.map((purchaseOrder) => {
    const linkedShipments = shipments.filter((shipment) => shipment.purchase_order_id === purchaseOrder.id);
    const linkedInvoices = invoices.filter((invoice) => invoice.purchase_order_id === purchaseOrder.id);
    const invoicedByCurrencyMap = new Map<string, number>();
    linkedInvoices.forEach((invoice) => {
      const currency = String(invoice.currency || purchaseOrder.currency || '').trim().toUpperCase();
      if (!currency) return;
      invoicedByCurrencyMap.set(currency, (invoicedByCurrencyMap.get(currency) || 0) + toNumber(invoice.total_amount));
    });
    const totalInvoicedByCurrency = [...invoicedByCurrencyMap.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((left, right) => left.currency.localeCompare(right.currency));
    const varianceLabels = Array.from(new Set(linkedInvoices.map((invoice) => invoice.variance_status).filter(Boolean)));

    return {
      purchaseOrder,
      linkedShipmentCount: linkedShipments.length || toNumber(purchaseOrder.linked_shipment_count),
      linkedInvoiceCount: linkedInvoices.length,
      totalInvoiced: totalInvoicedByCurrency.length === 1 ? totalInvoicedByCurrency[0].amount : null,
      totalInvoicedByCurrency,
      shipmentStatus: linkedShipments.length ? linkedShipments.map((shipment) => shipment.status).join(', ') : '-',
      invoiceVariance: varianceLabels.length ? varianceLabels.join(', ') : '-',
      firstShipment: linkedShipments[0]
    };
  });
}

export function buildInsightsSummary(
  reorderRecommendations: Array<{ urgency: string }>,
  depletionRiskRows: DepletionRiskRow[],
  supplierTrustScores: SupplierTrustScore[],
  inventoryAnomalies: InventoryAnomaly[]
) {
  const criticalReorders = reorderRecommendations.filter((item) => item.urgency === 'critical').length;
  const highRiskStockRows = depletionRiskRows.filter((item) => ['critical', 'high'].includes(item.risk_tier)).length;
  const supplierRiskRows = supplierTrustScores.filter((item) => (item.risk_flags ?? []).length > 0).length;
  const highAnomalies = inventoryAnomalies.filter((item) => ['critical', 'high'].includes(item.anomaly_tier)).length;

  return {
    criticalReorders,
    highRiskStockRows,
    supplierRiskRows,
    highAnomalies
  };
}

export function buildProcurementSummary(purchaseOrders: PurchaseOrder[], invoices: SupplierInvoice[]) {
  const openPurchaseOrders = purchaseOrders.filter((item) => !['completed', 'cancelled'].includes(item.status)).length;
  const overduePurchaseOrders = purchaseOrders.filter((item) => item.delivery_status === 'overdue').length;
  const unmatchedInvoices = invoices.filter((invoice) => !invoice.purchase_order_id && !invoice.shipment_id).length;
  const receivingGaps = purchaseOrders.filter((item) => ['pending_receipt', 'open_short', 'closed_short', 'over_received'].includes(item.variance_status || '')).length;

  return { openPurchaseOrders, overduePurchaseOrders, unmatchedInvoices, receivingGaps };
}

export function buildReceivingSummary(shipments: Shipment[], selectedShipmentItems: ShipmentItem[]) {
  const activeShipments = shipments.filter((shipment) => !['received', 'cancelled'].includes(shipment.status)).length;
  const partiallyReceived = shipments.filter((shipment) => shipment.status === 'partial').length;
  const discrepancyRows = selectedShipmentItems.filter((item) => toNumber(item.discrepancy) !== 0).length;
  const remainingUnits = selectedShipmentItems.reduce((total, item) => {
    const ordered = toNumber(item.quantity);
    const received = toNumber(item.received_quantity);
    return total + Math.max(ordered - received, 0);
  }, 0);

  return { activeShipments, partiallyReceived, discrepancyRows, remainingUnits };
}

export function buildApprovalQueue(
  requisitions: DepartmentRequisition[],
  cycleCounts: CycleCount[],
  invoices: SupplierInvoice[],
  supplierReturns: SupplierReturn[]
) {
  const requisitionRows = requisitions
    .filter((item) => item.status === 'pending_approval')
    .map((item) => {
      const items = item.items ?? [];
      const requestedTotal = items.reduce((total, requisitionItem) => total + toNumber(requisitionItem.requested_quantity), 0);
      const firstProductName = items[0]?.product_name;
      const detail = firstProductName
        ? `${firstProductName}${items.length > 1 ? ` + ${items.length - 1} more` : ''} · Requested ${requestedTotal.toLocaleString()}`
        : requestedTotal > 0
          ? `Requested ${requestedTotal.toLocaleString()}`
          : undefined;

      return {
        entity_type: 'department_requisition',
        entity_id: item.id,
        label: `${item.department} requisition`,
        detail,
        status: item.status,
        created_at: item.created_at
      };
    });

  const cycleCountRows = cycleCounts
    .filter((item) => item.status === 'pending_approval')
    .map((item) => ({
      entity_type: 'cycle_count',
      entity_id: item.id,
      label: `${item.department || 'Unassigned'} cycle count`,
      cycle_count_items: item.items ?? [],
      status: item.status,
      created_at: item.created_at
    }));

  const invoiceRows = invoices
    .filter((item) => item.status === 'pending_approval')
    .map((item) => ({
      entity_type: 'supplier_invoice',
      entity_id: item.id,
      label: `Invoice ${item.invoice_number}`,
      status: item.status,
      created_at: item.created_at
    }));

  const supplierReturnRows = supplierReturns
    .filter((item) => item.status === 'pending_approval')
    .map((item) => ({
      entity_type: 'supplier_return',
      entity_id: item.id,
      label: `Supplier return ${item.return_number}`,
      detail: `${item.supplier_name} · ${item.items?.length || 0} item${item.items?.length === 1 ? '' : 's'}`,
      status: item.status,
      created_at: item.created_at
    }));

  return [...requisitionRows, ...cycleCountRows, ...invoiceRows, ...supplierReturnRows]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
