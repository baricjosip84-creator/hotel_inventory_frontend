import { useState } from "react";
import { useEnterpriseInventoryFormState } from "./EnterpriseInventoryFormState";
import { useEnterpriseInventoryPageActions } from "./EnterpriseInventoryPageActions";
import { useEnterpriseInventoryPageData } from "./EnterpriseInventoryPageData";
import { useEnterpriseInventoryPageFeedback } from "./EnterpriseInventoryPageFeedback";

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
    errorMessage,
    formState,
    pageData,
    refreshSystemContext,
    setActiveTab,
    statusMessage,
  };
}
