import type { Dispatch, SetStateAction } from "react";
import type { useEnterpriseInventoryFormState } from "./EnterpriseInventoryFormState";
import {
  emptyAlertForm,
  emptyApprovalRuleForm,
  emptyBarcodeLabelForm,
  emptyNotificationDeliveryForm,
  emptyProductPackageForm,
  emptyPurchaseOrderShipmentForm,
  emptySupplierCatalogForm,
  emptySupplierInvoiceForm,
} from "./EnterpriseInventoryForms";
import { useEnterpriseInventoryAutomationMutations } from "./EnterpriseInventoryAutomationMutations";
import { useEnterpriseInventoryExecutionMutations } from "./EnterpriseInventoryExecutionMutations";
import { useEnterpriseInventoryMasterDataMutations } from "./EnterpriseInventoryMasterDataMutations";
import type { useEnterpriseInventoryPageFeedback } from "./EnterpriseInventoryPageFeedback";
import { useEnterpriseInventoryProcurementMutations } from "./EnterpriseInventoryProcurementMutations";
import { useEnterpriseInventoryStockMutations } from "./EnterpriseInventoryStockMutations";
import { createEnterpriseInventorySubmitHandlers } from "./EnterpriseInventorySubmitHandlers";
import type { ProductOption, PurchaseOrder, Shipment } from "./EnterpriseInventoryTypes";
import { useEnterpriseInventoryWorkflowMutations } from "./EnterpriseInventoryWorkflowMutations";

type EnterpriseInventoryFormState = ReturnType<
  typeof useEnterpriseInventoryFormState
>;

type EnterpriseInventoryMutationFeedback = ReturnType<
  typeof useEnterpriseInventoryPageFeedback
>["mutationFeedback"];

type EnterpriseInventoryPageActionsParams = {
  formState: EnterpriseInventoryFormState;
  mutationFeedback: EnterpriseInventoryMutationFeedback;
  products: ProductOption[];
  purchaseOrders: PurchaseOrder[];
  shipments: Shipment[];
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setStatusMessage: Dispatch<SetStateAction<string | null>>;
};

export function useEnterpriseInventoryPageActions({
  formState,
  mutationFeedback,
  products,
  purchaseOrders,
  shipments,
  setErrorMessage,
  setStatusMessage,
}: EnterpriseInventoryPageActionsParams) {
  const {
    alertForm,
    attachmentForm,
    automationScheduleForm: _automationScheduleForm,
    barcodeLabelForm,
    cycleCountForm,
    editingProductId,
    editingProductPackageId,
    editingStorageLocationId,
    editingSupplierId,
    notificationDeliveryForm,
    parLevelForm,
    productPackageForm,
    purchaseOrderShipmentForm,
    requisitionForm: _requisitionForm,
    setAlertForm,
    setAlertResolutionNotes,
    setApprovalRuleForm,
    setAutomationScheduleForm,
    setBarcodeLabelForm: _setBarcodeLabelForm,
    setCycleCountForm,
    setEditingProductId,
    setEditingProductPackageId,
    setEditingStorageLocationId,
    setEditingSupplierId,
    setNotificationDeliveryForm: _setNotificationDeliveryForm,
    setParLevelForm,
    setProductForm,
    setProductPackageForm,
    setPurchaseOrderShipmentForm,
    setRequisitionForm,
    setShipmentReceivingForm,
    setStockAdjustmentForm,
    setStockTransferForm,
    setStorageLocationForm,
    setSupplierCatalogForm,
    setSupplierForm,
    setSupplierInvoiceForm,
    shipmentBarcodeScanForm,
    shipmentReceivingForm,
    stockAdjustmentForm,
  } = formState;

  const executionMutations =
    useEnterpriseInventoryExecutionMutations(mutationFeedback);

  const automationMutations = useEnterpriseInventoryAutomationMutations(
    mutationFeedback,
    setAutomationScheduleForm,
  );

  const stockMutations = useEnterpriseInventoryStockMutations(
    mutationFeedback,
    setParLevelForm,
    setRequisitionForm,
    setCycleCountForm,
    setStockAdjustmentForm,
    setStockTransferForm,
  );

  const masterDataMutations = useEnterpriseInventoryMasterDataMutations(
    mutationFeedback,
    products,
    editingStorageLocationId,
    setStorageLocationForm,
    setEditingStorageLocationId,
    editingSupplierId,
    setSupplierForm,
    setEditingSupplierId,
    editingProductId,
    setProductForm,
    setEditingProductId,
    setProductPackageForm,
    setEditingProductPackageId,
  );

  const procurementMutations = useEnterpriseInventoryProcurementMutations(
    mutationFeedback,
    purchaseOrders,
    shipments,
    shipmentReceivingForm,
    shipmentBarcodeScanForm,
    setPurchaseOrderShipmentForm,
    emptyPurchaseOrderShipmentForm,
    setShipmentReceivingForm,
    formState.setLastBarcodeLookup,
    setStatusMessage,
  );

  const workflowMutations = useEnterpriseInventoryWorkflowMutations({
    mutationFeedback,
    resetApprovalRuleForm: () => setApprovalRuleForm(emptyApprovalRuleForm),
    resetSupplierCatalogForm: () =>
      setSupplierCatalogForm(emptySupplierCatalogForm),
    resetSupplierInvoiceForm: () =>
      setSupplierInvoiceForm(emptySupplierInvoiceForm),
    resetBarcodeLabelForm: () => formState.setBarcodeLabelForm(emptyBarcodeLabelForm),
    resetNotificationDeliveryForm: () =>
      formState.setNotificationDeliveryForm(emptyNotificationDeliveryForm),
    resetAlertForm: () => setAlertForm(emptyAlertForm),
    setAlertResolutionNotes,
    setAttachmentForm: formState.setAttachmentForm,
  });

  const submitHandlers = createEnterpriseInventorySubmitHandlers({
    parLevelForm,
    cycleCountForm,
    stockAdjustmentForm,
    purchaseOrderShipmentForm,
    shipmentBarcodeScanForm,
    shipmentReceivingForm,
    barcodeLabelForm,
    productPackageForm,
    notificationDeliveryForm,
    alertForm,
    attachmentForm,
    editingProductPackageId,
    emptyProductPackageForm,
    setErrorMessage,
    setStatusMessage,
    setProductPackageForm,
    setEditingProductPackageId,
    createParLevelMutation: stockMutations.createParLevelMutation,
    createCycleCountMutation: stockMutations.createCycleCountMutation,
    adjustStockMutation: stockMutations.adjustStockMutation,
    createShipmentFromPurchaseOrderMutation:
      procurementMutations.createShipmentFromPurchaseOrderMutation,
    purchaseOrderLifecycleMutation:
      procurementMutations.purchaseOrderLifecycleMutation,
    barcodeLookupMutation: procurementMutations.barcodeLookupMutation,
    receiveShipmentMutation: procurementMutations.receiveShipmentMutation,
    createBarcodeLabelMutation: workflowMutations.createBarcodeLabelMutation,
    createProductPackageMutation:
      masterDataMutations.createProductPackageMutation,
    updateProductPackageMutation:
      masterDataMutations.updateProductPackageMutation,
    queueNotificationDeliveryMutation:
      workflowMutations.queueNotificationDeliveryMutation,
    createAlertMutation: workflowMutations.createAlertMutation,
    createAttachmentMutation: workflowMutations.createAttachmentMutation,
  });

  return {
    ...executionMutations,
    ...automationMutations,
    ...stockMutations,
    ...masterDataMutations,
    ...procurementMutations,
    ...workflowMutations,
    ...submitHandlers,
  };
}
