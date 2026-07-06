import { useState } from "react";
import { useEnterpriseInventoryFormState } from "./EnterpriseInventoryFormState";
import { useEnterpriseInventoryPageActions } from "./EnterpriseInventoryPageActions";
import { useEnterpriseInventoryPageData } from "./EnterpriseInventoryPageData";
import { useEnterpriseInventoryPageFeedback } from "./EnterpriseInventoryPageFeedback";
import {
  getEnterpriseInventoryActiveTabQueryError,
  getEnterpriseInventoryLastUpdatedAt,
} from "./EnterpriseInventoryQueryStatus";

export function useEnterpriseInventoryPageController() {
  const [activeTab, setActiveTab] = useState("par-levels");
  const {
    errorMessage,
    mutationFeedback,
    refreshSystemContext,
    setErrorMessage,
    setStatusMessage,
    statusMessage,
  } = useEnterpriseInventoryPageFeedback();
  const formState = useEnterpriseInventoryFormState();

  const {
    alertFilters,
    attachmentForm,
    auditFilters,
    executionFilters,
    productPackageForm,
    productSearch,
    selectedSupplierPerformanceId,
    shipmentReceivingForm,
    supplierSearch,
  } = formState;

  const pageData = useEnterpriseInventoryPageData({
    productSearch,
    productPackageProductId: productPackageForm.product_id,
    supplierSearch,
    selectedSupplierPerformanceId,
    executionFilters,
    shipmentReceivingShipmentId: shipmentReceivingForm.shipment_id,
    alertFilters,
    auditFilters,
    attachmentEntityType: attachmentForm.entity_type,
    attachmentEntityId: attachmentForm.entity_id,
  });

  const { products, purchaseOrders, shipments } = pageData.stableData;
  const queryStatusInput = pageData.queries as unknown as Parameters<typeof getEnterpriseInventoryLastUpdatedAt>[0];
  const activeTabQueryError = getEnterpriseInventoryActiveTabQueryError(activeTab, queryStatusInput);
  const lastRefreshedAt = getEnterpriseInventoryLastUpdatedAt(queryStatusInput);

  const actions = useEnterpriseInventoryPageActions({
    formState,
    mutationFeedback,
    products,
    purchaseOrders,
    shipments,
    setErrorMessage,
    setStatusMessage,
  });

  return {
    actions,
    activeTab,
    errorMessage: errorMessage ?? activeTabQueryError,
    formState,
    pageData,
    lastRefreshedAt,
    refreshSystemContext,
    setActiveTab,
    statusMessage,
  };
}
