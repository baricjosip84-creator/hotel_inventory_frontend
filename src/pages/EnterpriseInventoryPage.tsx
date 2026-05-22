import { useState } from "react";
import { EnterpriseInventoryPageLayout } from "../components/enterpriseInventory/EnterpriseInventoryPageLayout";
import { useEnterpriseInventoryPageFeedback } from "../components/enterpriseInventory/EnterpriseInventoryPageFeedback";
import { useEnterpriseInventoryFormState } from "../components/enterpriseInventory/EnterpriseInventoryFormState";
import { useEnterpriseInventoryPageData } from "../components/enterpriseInventory/EnterpriseInventoryPageData";
import { useEnterpriseInventoryPageActions } from "../components/enterpriseInventory/EnterpriseInventoryPageActions";
import { EnterpriseInventoryPagePanels } from "../components/enterpriseInventory/EnterpriseInventoryPagePanels";

function EnterpriseInventoryPage() {
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

  return (
    <EnterpriseInventoryPageLayout
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      statusMessage={statusMessage}
      errorMessage={errorMessage}
      onEvaluateParLevels={() => actions.evaluateParLevelsMutation.mutate()}
      evaluatingParLevels={actions.evaluateParLevelsMutation.isPending}
    >
      <EnterpriseInventoryPagePanels
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        actions={actions}
        formState={formState}
        pageData={pageData}
        refreshSystemContext={refreshSystemContext}
      />
    </EnterpriseInventoryPageLayout>
  );
}

export default EnterpriseInventoryPage;
