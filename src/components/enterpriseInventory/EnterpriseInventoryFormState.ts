import { useState } from "react";

import type {
  AlertFilters,
  AlertForm,
  AttachmentForm,
  AuditFilters,
  AutomationScheduleForm,
  ApprovalRuleForm,
  BarcodeLabelForm,
  CycleCountForm,
  ExecutionFilters,
  NotificationDeliveryForm,
  ParLevelForm,
  ProductForm,
  ProductPackageForm,
  PurchaseOrderShipmentForm,
  RequisitionForm,
  ShipmentBarcodeLookup,
  ShipmentBarcodeScanForm,
  ShipmentReceivingForm,
  StockAdjustmentForm,
  StockTransferForm,
  StorageLocationForm,
  SupplierCatalogForm,
  SupplierForm,
  SupplierInvoiceForm,
} from "./EnterpriseInventoryTypes";

import {
  emptyAlertFilters,
  emptyAlertForm,
  emptyAttachmentForm,
  emptyAuditFilters,
  emptyAutomationScheduleForm,
  emptyApprovalRuleForm,
  emptyBarcodeLabelForm,
  emptyCycleCountForm,
  emptyExecutionFilters,
  emptyNotificationDeliveryForm,
  emptyParLevelForm,
  emptyProductForm,
  emptyProductPackageForm,
  emptyPurchaseOrderShipmentForm,
  emptyRequisitionForm,
  emptyShipmentBarcodeScanForm,
  emptyShipmentReceivingForm,
  emptyStockAdjustmentForm,
  emptyStockTransferForm,
  emptyStorageLocationForm,
  emptySupplierCatalogForm,
  emptySupplierForm,
  emptySupplierInvoiceForm,
} from "./EnterpriseInventoryForms";

export function useEnterpriseInventoryFormState() {
  const [parLevelForm, setParLevelForm] =
    useState<ParLevelForm>(emptyParLevelForm);
  const [requisitionForm, setRequisitionForm] =
    useState<RequisitionForm>(emptyRequisitionForm);
  const [cycleCountForm, setCycleCountForm] =
    useState<CycleCountForm>(emptyCycleCountForm);
  const [stockAdjustmentForm, setStockAdjustmentForm] =
    useState<StockAdjustmentForm>(emptyStockAdjustmentForm);
  const [stockTransferForm, setStockTransferForm] = useState<StockTransferForm>(
    emptyStockTransferForm,
  );
  const [storageLocationForm, setStorageLocationForm] =
    useState<StorageLocationForm>(emptyStorageLocationForm);
  const [editingStorageLocationId, setEditingStorageLocationId] = useState<
    string | null
  >(null);
  const [supplierForm, setSupplierForm] =
    useState<SupplierForm>(emptySupplierForm);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
    null,
  );
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplierPerformanceId, setSelectedSupplierPerformanceId] =
    useState("");
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productPackageForm, setProductPackageForm] =
    useState<ProductPackageForm>(emptyProductPackageForm);
  const [editingProductPackageId, setEditingProductPackageId] = useState<
    string | null
  >(null);
  const [purchaseOrderShipmentForm, setPurchaseOrderShipmentForm] =
    useState<PurchaseOrderShipmentForm>(emptyPurchaseOrderShipmentForm);
  const [shipmentReceivingForm, setShipmentReceivingForm] =
    useState<ShipmentReceivingForm>(emptyShipmentReceivingForm);
  const [shipmentBarcodeScanForm, setShipmentBarcodeScanForm] =
    useState<ShipmentBarcodeScanForm>(emptyShipmentBarcodeScanForm);
  const [lastBarcodeLookup, setLastBarcodeLookup] =
    useState<ShipmentBarcodeLookup | null>(null);
  const [approvalRuleForm, setApprovalRuleForm] = useState<ApprovalRuleForm>(
    emptyApprovalRuleForm,
  );
  const [barcodeLabelForm, setBarcodeLabelForm] = useState<BarcodeLabelForm>(
    emptyBarcodeLabelForm,
  );
  const [supplierCatalogForm, setSupplierCatalogForm] =
    useState<SupplierCatalogForm>(emptySupplierCatalogForm);
  const [supplierInvoiceForm, setSupplierInvoiceForm] =
    useState<SupplierInvoiceForm>(emptySupplierInvoiceForm);
  const [notificationDeliveryForm, setNotificationDeliveryForm] =
    useState<NotificationDeliveryForm>(emptyNotificationDeliveryForm);
  const [alertForm, setAlertForm] = useState<AlertForm>(emptyAlertForm);
  const [alertFilters, setAlertFilters] =
    useState<AlertFilters>(emptyAlertFilters);
  const [auditFilters, setAuditFilters] =
    useState<AuditFilters>(emptyAuditFilters);
  const [alertResolutionNotes, setAlertResolutionNotes] = useState<
    Record<string, string>
  >({});
  const [attachmentForm, setAttachmentForm] =
    useState<AttachmentForm>(emptyAttachmentForm);
  const [automationScheduleForm, setAutomationScheduleForm] =
    useState<AutomationScheduleForm>(emptyAutomationScheduleForm);
  const [automationDisableReasons, setAutomationDisableReasons] = useState<
    Record<string, string>
  >({});
  const [executionFilters, setExecutionFilters] = useState<ExecutionFilters>(
    emptyExecutionFilters,
  );

  return {
    alertFilters,
    alertForm,
    alertResolutionNotes,
    approvalRuleForm,
    attachmentForm,
    auditFilters,
    automationDisableReasons,
    automationScheduleForm,
    barcodeLabelForm,
    cycleCountForm,
    editingProductId,
    editingProductPackageId,
    editingStorageLocationId,
    editingSupplierId,
    executionFilters,
    lastBarcodeLookup,
    notificationDeliveryForm,
    parLevelForm,
    productForm,
    productPackageForm,
    productSearch,
    purchaseOrderShipmentForm,
    requisitionForm,
    selectedSupplierPerformanceId,
    setAlertFilters,
    setAlertForm,
    setAlertResolutionNotes,
    setApprovalRuleForm,
    setAttachmentForm,
    setAuditFilters,
    setAutomationDisableReasons,
    setAutomationScheduleForm,
    setBarcodeLabelForm,
    setCycleCountForm,
    setEditingProductId,
    setEditingProductPackageId,
    setEditingStorageLocationId,
    setEditingSupplierId,
    setExecutionFilters,
    setLastBarcodeLookup,
    setNotificationDeliveryForm,
    setParLevelForm,
    setProductForm,
    setProductPackageForm,
    setProductSearch,
    setPurchaseOrderShipmentForm,
    setRequisitionForm,
    setSelectedSupplierPerformanceId,
    setShipmentBarcodeScanForm,
    setShipmentReceivingForm,
    setStockAdjustmentForm,
    setStockTransferForm,
    setStorageLocationForm,
    setSupplierCatalogForm,
    setSupplierForm,
    setSupplierInvoiceForm,
    setSupplierSearch,
    shipmentBarcodeScanForm,
    shipmentReceivingForm,
    stockAdjustmentForm,
    stockTransferForm,
    storageLocationForm,
    supplierCatalogForm,
    supplierForm,
    supplierInvoiceForm,
    supplierSearch,
  };
}
