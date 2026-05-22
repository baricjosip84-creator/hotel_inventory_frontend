import { useMutation } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { lookupShipmentBarcode } from "./EnterpriseInventoryApi";
import { createShipmentBarcodeLookupSuccessHandler } from "./EnterpriseInventoryBarcode";
import type { createEnterpriseInventoryBoundMutationFeedback } from "./EnterpriseInventoryMutationFeedback";
import {
  buildPurchaseOrderLifecyclePayload,
  buildPurchaseOrderShipmentPayload,
  buildShipmentReceivingPayload,
} from "./EnterpriseInventoryPayloads";
import { postEnterpriseInventoryVersionedRequest } from "./EnterpriseInventoryRequests";
import type {
  PurchaseOrder,
  PurchaseOrderShipmentForm,
  Shipment,
  ShipmentBarcodeLookup,
  ShipmentBarcodeScanForm,
  ShipmentReceivingForm,
} from "./EnterpriseInventoryTypes";

const procurementQueries = [
  "enterprise-purchase-orders",
  "enterprise-dashboard-summary",
  "enterprise-procurement-summary-report",
];

const shipmentReceiveQueries = [
  "enterprise-shipments",
  "enterprise-shipment-items",
  "enterprise-low-stock",
  "enterprise-stock-movements",
];

const shipmentFinalizeQueries = [
  "enterprise-shipments",
  "enterprise-shipment-items",
  "enterprise-purchase-orders",
];

type EnterpriseInventoryMutationFeedback = ReturnType<
  typeof createEnterpriseInventoryBoundMutationFeedback
>;

type PurchaseOrderLifecycleAction =
  | "submit"
  | "approve"
  | "close"
  | "reopen"
  | "cancel";

export function useEnterpriseInventoryProcurementMutations(
  mutationFeedback: EnterpriseInventoryMutationFeedback,
  purchaseOrders: PurchaseOrder[],
  shipments: Shipment[],
  shipmentReceivingForm: ShipmentReceivingForm,
  shipmentBarcodeScanForm: ShipmentBarcodeScanForm,
  setPurchaseOrderShipmentForm: Dispatch<SetStateAction<PurchaseOrderShipmentForm>>,
  resetPurchaseOrderShipmentForm: PurchaseOrderShipmentForm,
  setShipmentReceivingForm: Dispatch<SetStateAction<ShipmentReceivingForm>>,
  setLastBarcodeLookup: Dispatch<SetStateAction<ShipmentBarcodeLookup | null>>,
  setStatusMessage: Dispatch<SetStateAction<string | null>>,
) {
  const createShipmentFromPurchaseOrderMutation = useMutation({
    mutationFn: (input: PurchaseOrderShipmentForm) => {
      const purchaseOrder = purchaseOrders.find(
        (item) => item.id === input.purchase_order_id,
      );
      if (!purchaseOrder) {
        throw new Error("Select a purchase order before creating a shipment.");
      }

      return postEnterpriseInventoryVersionedRequest<Shipment>(
        `/purchase-orders/${input.purchase_order_id}/create-shipment`,
        purchaseOrder.version,
        buildPurchaseOrderShipmentPayload(input),
      );
    },
    onSuccess: mutationFeedback.resetting(
      "Shipment created from purchase order.",
      ["enterprise-purchase-orders", "enterprise-shipments"],
      () => setPurchaseOrderShipmentForm(resetPurchaseOrderShipmentForm),
    ),
    onError: mutationFeedback.error(
      "Failed to create shipment from purchase order.",
    ),
  });

  const purchaseOrderLifecycleMutation = useMutation({
    mutationFn: ({
      purchaseOrder,
      action,
      reason,
    }: {
      purchaseOrder: PurchaseOrder;
      action: PurchaseOrderLifecycleAction;
      reason?: string;
    }) =>
      postEnterpriseInventoryVersionedRequest<PurchaseOrder>(
        `/purchase-orders/${purchaseOrder.id}/${action}`,
        purchaseOrder.version,
        buildPurchaseOrderLifecyclePayload(action, reason),
      ),
    onSuccess: mutationFeedback.variable<{
      purchaseOrder: PurchaseOrder;
      action: PurchaseOrderLifecycleAction;
      reason?: string;
    }>(
      (variables) => `Purchase order ${variables.action} action completed.`,
      procurementQueries,
    ),
    onError: mutationFeedback.error(
      "Failed to update purchase order lifecycle.",
    ),
  });

  const receiveShipmentMutation = useMutation({
    mutationFn: (input: ShipmentReceivingForm) => {
      const shipment = shipments.find((item) => item.id === input.shipment_id);
      if (!shipment) {
        throw new Error("Select a shipment before receiving stock.");
      }

      return postEnterpriseInventoryVersionedRequest<Shipment>(
        `/shipments/${input.shipment_id}/receive`,
        shipment.version,
        buildShipmentReceivingPayload(input),
      );
    },
    onSuccess: mutationFeedback.custom<Shipment, ShipmentReceivingForm>(
      "Shipment receipt posted.",
      shipmentReceiveQueries,
      () =>
        setShipmentReceivingForm((current) => ({
          ...current,
          product_id: "",
          quantity_received: "",
          discrepancy_reason: "",
          receiving_note: "",
        })),
    ),
    onError: mutationFeedback.error("Failed to receive shipment."),
  });

  const barcodeLookupMutation = useMutation({
    mutationFn: (input: ShipmentBarcodeScanForm) => {
      if (!shipmentReceivingForm.shipment_id) {
        throw new Error("Select a shipment before scanning a barcode.");
      }
      const barcode = input.barcode.trim();
      if (!barcode) {
        throw new Error("Enter or scan a barcode.");
      }
      return lookupShipmentBarcode(shipmentReceivingForm.shipment_id, barcode);
    },
    onSuccess: createShipmentBarcodeLookupSuccessHandler(
      shipmentBarcodeScanForm,
      setLastBarcodeLookup,
      setShipmentReceivingForm,
      setStatusMessage,
    ),
    onError: mutationFeedback.error("Failed to resolve shipment barcode."),
  });

  const finalizeShipmentMutation = useMutation({
    mutationFn: (shipment: Shipment) =>
      postEnterpriseInventoryVersionedRequest<Shipment>(
        `/shipments/${shipment.id}/finalize`,
        shipment.version,
      ),
    onSuccess: mutationFeedback.invalidating(
      "Shipment finalized.",
      shipmentFinalizeQueries,
    ),
    onError: mutationFeedback.error("Failed to finalize shipment."),
  });

  return {
    createShipmentFromPurchaseOrderMutation,
    purchaseOrderLifecycleMutation,
    receiveShipmentMutation,
    barcodeLookupMutation,
    finalizeShipmentMutation,
  };
}
