import type { Dispatch, SetStateAction } from "react";
import { createEnterpriseInventoryFormSubmitHandler } from "./EnterpriseInventoryFormHandlers";
import { createEnterpriseInventoryProductPackageEditingHandlers } from "./EnterpriseInventoryPackageEditing";
import type {
  AlertForm,
  AttachmentForm,
  BarcodeLabelForm,
  CycleCountForm,
  NotificationDeliveryForm,
  ParLevelForm,
  ProductPackageForm,
  PurchaseOrder,
  PurchaseOrderShipmentForm,
  ShipmentBarcodeScanForm,
  ShipmentReceivingForm,
  StockAdjustmentForm,
} from "./EnterpriseInventoryTypes";

type MutateOnly<TVariables> = {
  mutate: (variables: TVariables) => void;
};

type ProductPackageUpdateVariables = {
  packageId: string;
  input: ProductPackageForm;
};

type PurchaseOrderLifecycleVariables = {
  purchaseOrder: PurchaseOrder;
  action: "submit" | "approve" | "close" | "reopen" | "cancel";
  reason?: string;
};

type EnterpriseInventorySubmitHandlerParams = {
  parLevelForm: ParLevelForm;
  cycleCountForm: CycleCountForm;
  stockAdjustmentForm: StockAdjustmentForm;
  purchaseOrderShipmentForm: PurchaseOrderShipmentForm;
  shipmentBarcodeScanForm: ShipmentBarcodeScanForm;
  shipmentReceivingForm: ShipmentReceivingForm;
  barcodeLabelForm: BarcodeLabelForm;
  productPackageForm: ProductPackageForm;
  notificationDeliveryForm: NotificationDeliveryForm;
  alertForm: AlertForm;
  attachmentForm: AttachmentForm;
  editingProductPackageId: string | null;
  emptyProductPackageForm: ProductPackageForm;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setStatusMessage: Dispatch<SetStateAction<string | null>>;
  setProductPackageForm: Dispatch<SetStateAction<ProductPackageForm>>;
  setEditingProductPackageId: Dispatch<SetStateAction<string | null>>;
  createParLevelMutation: MutateOnly<ParLevelForm>;
  createCycleCountMutation: MutateOnly<CycleCountForm>;
  adjustStockMutation: MutateOnly<StockAdjustmentForm>;
  createShipmentFromPurchaseOrderMutation: MutateOnly<PurchaseOrderShipmentForm>;
  purchaseOrderLifecycleMutation: MutateOnly<PurchaseOrderLifecycleVariables>;
  barcodeLookupMutation: MutateOnly<ShipmentBarcodeScanForm>;
  receiveShipmentMutation: MutateOnly<ShipmentReceivingForm>;
  createBarcodeLabelMutation: MutateOnly<BarcodeLabelForm>;
  createProductPackageMutation: MutateOnly<ProductPackageForm>;
  updateProductPackageMutation: MutateOnly<ProductPackageUpdateVariables>;
  queueNotificationDeliveryMutation: MutateOnly<NotificationDeliveryForm>;
  createAlertMutation: MutateOnly<AlertForm>;
  createAttachmentMutation: MutateOnly<AttachmentForm>;
};

export function createEnterpriseInventorySubmitHandlers({
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
  createParLevelMutation,
  createCycleCountMutation,
  adjustStockMutation,
  createShipmentFromPurchaseOrderMutation,
  purchaseOrderLifecycleMutation,
  barcodeLookupMutation,
  receiveShipmentMutation,
  createBarcodeLabelMutation,
  createProductPackageMutation,
  updateProductPackageMutation,
  queueNotificationDeliveryMutation,
  createAlertMutation,
  createAttachmentMutation,
}: EnterpriseInventorySubmitHandlerParams) {
  const handleParLevelSubmit = createEnterpriseInventoryFormSubmitHandler(() => {
    createParLevelMutation.mutate(parLevelForm);
  });

  const handleCycleCountSubmit = createEnterpriseInventoryFormSubmitHandler(
    () => {
      createCycleCountMutation.mutate(cycleCountForm);
    },
  );

  const handleStockAdjustmentSubmit = createEnterpriseInventoryFormSubmitHandler(
    () => {
      adjustStockMutation.mutate(stockAdjustmentForm);
    },
  );

  const handlePurchaseOrderShipmentSubmit =
    createEnterpriseInventoryFormSubmitHandler(() => {
      createShipmentFromPurchaseOrderMutation.mutate(purchaseOrderShipmentForm);
    });

  const handlePurchaseOrderLifecycleAction = (
    purchaseOrder: PurchaseOrder,
    action: PurchaseOrderLifecycleVariables["action"],
  ) => {
    setErrorMessage(null);
    setStatusMessage(null);
    const reason =
      action === "close" || action === "cancel"
        ? window.prompt(
            action === "close" ? "Close reason" : "Cancellation reason",
            "",
          ) || undefined
        : undefined;
    purchaseOrderLifecycleMutation.mutate({ purchaseOrder, action, reason });
  };

  const handleShipmentBarcodeLookupSubmit =
    createEnterpriseInventoryFormSubmitHandler(() => {
      setErrorMessage(null);
      setStatusMessage(null);
      barcodeLookupMutation.mutate(shipmentBarcodeScanForm);
    });

  const handleShipmentReceivingSubmit =
    createEnterpriseInventoryFormSubmitHandler(() => {
      receiveShipmentMutation.mutate(shipmentReceivingForm);
    });

  const handleBarcodeLabelSubmit = createEnterpriseInventoryFormSubmitHandler(
    () => {
      createBarcodeLabelMutation.mutate(barcodeLabelForm);
    },
  );

  const handleProductPackageSubmit = createEnterpriseInventoryFormSubmitHandler(
    () => {
      if (editingProductPackageId) {
        updateProductPackageMutation.mutate({
          packageId: editingProductPackageId,
          input: productPackageForm,
        });
        return;
      }
      createProductPackageMutation.mutate(productPackageForm);
    },
  );

  const { beginEditProductPackage, cancelEditProductPackage } =
    createEnterpriseInventoryProductPackageEditingHandlers(
      setProductPackageForm,
      setEditingProductPackageId,
      emptyProductPackageForm,
    );

  const handleNotificationDeliverySubmit =
    createEnterpriseInventoryFormSubmitHandler(() => {
      queueNotificationDeliveryMutation.mutate(notificationDeliveryForm);
    });

  const handleAlertSubmit = createEnterpriseInventoryFormSubmitHandler(() => {
    createAlertMutation.mutate(alertForm);
  });

  const handleAttachmentSubmit = createEnterpriseInventoryFormSubmitHandler(
    () => {
      createAttachmentMutation.mutate(attachmentForm);
    },
  );

  return {
    beginEditProductPackage,
    cancelEditProductPackage,
    handleAlertSubmit,
    handleAttachmentSubmit,
    handleBarcodeLabelSubmit,
    handleCycleCountSubmit,
    handleNotificationDeliverySubmit,
    handleParLevelSubmit,
    handleProductPackageSubmit,
    handlePurchaseOrderLifecycleAction,
    handlePurchaseOrderShipmentSubmit,
    handleShipmentBarcodeLookupSubmit,
    handleShipmentReceivingSubmit,
    handleStockAdjustmentSubmit,
  };
}
