import type { Dispatch, FormEvent, SetStateAction } from "react";
import { TENANT_PERMISSIONS, hasPermission, type TenantPermission } from "../../lib/permissions";
import { createEnterpriseInventoryFormSubmitHandler } from "./EnterpriseInventoryFormHandlers";
import { createEnterpriseInventoryProductPackageEditingHandlers } from "./EnterpriseInventoryPackageEditing";
import type {
  AlertForm,
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
}: EnterpriseInventorySubmitHandlerParams) {
  const canRun = (permission: TenantPermission): boolean => {
    if (hasPermission(permission)) return true;
    setStatusMessage(null);
    setErrorMessage(`Requires ${permission} permission.`);
    return false;
  };

  const handleParLevelSubmit = createEnterpriseInventoryFormSubmitHandler(() => {
    if (!canRun(TENANT_PERMISSIONS.PAR_LEVELS_WRITE)) return;
    createParLevelMutation.mutate(parLevelForm);
  });

  const handleCycleCountSubmit = createEnterpriseInventoryFormSubmitHandler(
    () => {
      if (!canRun(TENANT_PERMISSIONS.CYCLE_COUNTS_WRITE)) return;
      createCycleCountMutation.mutate(cycleCountForm);
    },
  );

  const handleStockAdjustmentSubmit = createEnterpriseInventoryFormSubmitHandler(
    () => {
      if (!canRun(TENANT_PERMISSIONS.STOCK_ADJUST)) return;
      adjustStockMutation.mutate(stockAdjustmentForm);
    },
  );

  const handlePurchaseOrderShipmentSubmit =
    createEnterpriseInventoryFormSubmitHandler(() => {
      if (!canRun(TENANT_PERMISSIONS.SHIPMENTS_WRITE)) return;
      createShipmentFromPurchaseOrderMutation.mutate(purchaseOrderShipmentForm);
    });

  const handlePurchaseOrderLifecycleAction = (
    purchaseOrder: PurchaseOrder,
    action: PurchaseOrderLifecycleVariables["action"],
  ) => {
    const requiredPermission = action === "submit"
      ? TENANT_PERMISSIONS.PURCHASE_ORDERS_SUBMIT
      : action === "approve"
        ? TENANT_PERMISSIONS.PURCHASE_ORDERS_APPROVE
        : TENANT_PERMISSIONS.PURCHASE_ORDERS_CANCEL;
    if (!canRun(requiredPermission)) return;

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
      if (!canRun(TENANT_PERMISSIONS.SHIPMENTS_RECEIVE)) return;
      receiveShipmentMutation.mutate(shipmentReceivingForm);
    });

  const handleBarcodeLabelSubmit = (
    event: FormEvent<HTMLFormElement>,
    generatedBarcodeValue?: string,
  ) => {
    event.preventDefault();
    if (!canRun(TENANT_PERMISSIONS.BARCODE_LABELS_WRITE)) return;
    createBarcodeLabelMutation.mutate({
      ...barcodeLabelForm,
      barcode_value: generatedBarcodeValue || barcodeLabelForm.barcode_value.trim() || "",
    });
  };

  const handleProductPackageSubmit = createEnterpriseInventoryFormSubmitHandler(
    () => {
      if (!canRun(TENANT_PERMISSIONS.PRODUCT_PACKAGES_WRITE)) return;
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
      if (!canRun(TENANT_PERMISSIONS.NOTIFICATIONS_WRITE)) return;
      queueNotificationDeliveryMutation.mutate(notificationDeliveryForm);
    });

  const handleAlertSubmit = createEnterpriseInventoryFormSubmitHandler(() => {
    if (!canRun(TENANT_PERMISSIONS.ALERTS_WRITE)) return;
    createAlertMutation.mutate(alertForm);
  });



  return {
    beginEditProductPackage,
    cancelEditProductPackage,
    handleAlertSubmit,
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
