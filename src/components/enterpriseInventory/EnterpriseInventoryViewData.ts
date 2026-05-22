import { useMemo } from 'react';
import {
  buildAlertsSummary,
  buildApprovalQueue,
  buildInsightsSummary,
  buildOperationsDashboardSummary,
  buildProcurementMatchRows,
  buildProcurementSummary,
  buildReceivingSummary,
  buildStockRiskSummary,
  buildStockTransferSummary
} from './EnterpriseInventoryDerived';
import type {
  AlertItem,
  CycleCount,
  DashboardSummary,
  DepletionRiskRow,
  DepartmentRequisition,
  InventoryAnomaly,
  ProductPackage,
  PurchaseOrder,
  Shipment,
  ShipmentItem,
  StockItem,
  StockTransfer,
  SupplierInvoice,
  SupplierOption,
  SupplierTrustScore
} from './EnterpriseInventoryTypes';

type EnterpriseInventoryViewDataInput = {
  alerts: AlertItem[];
  cycleCounts: CycleCount[];
  dashboardSummary?: DashboardSummary;
  depletionRiskRows: DepletionRiskRow[];
  inventoryAnomalies: InventoryAnomaly[];
  invoices: SupplierInvoice[];
  lowStockItems: StockItem[];
  productPackages?: ProductPackage[];
  purchaseOrders: PurchaseOrder[];
  requisitions: DepartmentRequisition[];
  reorderRecommendations: Array<{ urgency: string }>;
  selectedShipmentId: string;
  selectedShipmentItems: ShipmentItem[];
  shipments: Shipment[];
  stockTransfers: StockTransfer[];
  suppliers: SupplierOption[];
  supplierTrustScores: SupplierTrustScore[];
};

export function useEnterpriseInventoryViewData({
  alerts,
  cycleCounts,
  dashboardSummary,
  depletionRiskRows,
  inventoryAnomalies,
  invoices,
  lowStockItems,
  productPackages,
  purchaseOrders,
  requisitions,
  reorderRecommendations,
  selectedShipmentId,
  selectedShipmentItems,
  shipments,
  stockTransfers,
  suppliers,
  supplierTrustScores
}: EnterpriseInventoryViewDataInput) {
  const operationsDashboardSummary = useMemo(
    () => buildOperationsDashboardSummary(dashboardSummary),
    [dashboardSummary]
  );

  const alertsSummary = useMemo(() => buildAlertsSummary(alerts), [alerts]);

  const selectedReceivingShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === selectedShipmentId) ?? null,
    [shipments, selectedShipmentId]
  );

  const stockRiskSummary = useMemo(() => buildStockRiskSummary(lowStockItems), [lowStockItems]);

  const stockTransferSummary = useMemo(() => buildStockTransferSummary(stockTransfers), [stockTransfers]);

  const procurementMatchRows = useMemo(
    () => buildProcurementMatchRows(purchaseOrders, shipments, invoices),
    [purchaseOrders, shipments, invoices]
  );

  const insightsSummary = useMemo(
    () => buildInsightsSummary(reorderRecommendations, depletionRiskRows, supplierTrustScores, inventoryAnomalies),
    [depletionRiskRows, inventoryAnomalies, reorderRecommendations, supplierTrustScores]
  );

  const procurementSummary = useMemo(
    () => buildProcurementSummary(purchaseOrders, invoices),
    [purchaseOrders, invoices]
  );

  const receivingSummary = useMemo(
    () => buildReceivingSummary(shipments, selectedShipmentItems),
    [shipments, selectedShipmentItems]
  );

  const selectedSupplierName = useMemo(() => {
    const firstInvoice = invoices[0];
    if (!firstInvoice) return null;
    return suppliers.find((supplier) => supplier.id === firstInvoice.supplier_id)?.name ?? null;
  }, [invoices, suppliers]);

  const approvalQueue = useMemo(
    () => buildApprovalQueue(requisitions, cycleCounts, invoices),
    [requisitions, cycleCounts, invoices]
  );

  return {
    alertsSummary,
    approvalQueue,
    insightsSummary,
    operationsDashboardSummary,
    procurementMatchRows,
    procurementSummary,
    receivingSummary,
    selectedProductPackages: productPackages ?? [],
    selectedReceivingShipment,
    selectedSupplierName,
    stockRiskSummary,
    stockTransferSummary
  };
}
