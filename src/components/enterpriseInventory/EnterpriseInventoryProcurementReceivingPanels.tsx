import { ProcurementMatchTab, ReceivingTab } from "./tabs";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import { emptyShipmentBarcodeScanForm } from "./EnterpriseInventoryForms";
import type { EnterpriseInventoryPanelBaseProps } from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryProcurementReceivingPanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryPanelBaseProps) {
  const {
    lastBarcodeLookup,
    purchaseOrderShipmentForm,
    setLastBarcodeLookup,
    setPurchaseOrderShipmentForm,
    setShipmentBarcodeScanForm,
    setShipmentReceivingForm,
    shipmentBarcodeScanForm,
    shipmentReceivingForm,
  } = formState;

  const { queries, stableData, viewData } = pageData;

  const {
    invoicesQuery,
    purchaseOrdersQuery,
    shipmentItemsQuery,
    shipmentsQuery,
  } = queries;

  const {
    purchaseOrders,
    selectedShipmentItems,
    shipments,
    storageLocations,
  } = stableData;

  const {
    procurementMatchRows,
    procurementSummary,
    receivingSummary,
    selectedReceivingShipment,
  } = viewData;

  const {
    barcodeLookupMutation,
    createShipmentFromPurchaseOrderMutation,
    finalizeShipmentMutation,
    handlePurchaseOrderLifecycleAction,
    handlePurchaseOrderShipmentSubmit,
    handleShipmentBarcodeLookupSubmit,
    handleShipmentReceivingSubmit,
    purchaseOrderLifecycleMutation,
    receiveShipmentMutation,
  } = actions;

  return (
    <>
      <EnterpriseInventoryTabPanel
        activeTab={activeTab}
        tab="procurement-match"
      >
        <ProcurementMatchTab
          createShipmentFromPurchaseOrderMutation={
            createShipmentFromPurchaseOrderMutation
          }
          handlePurchaseOrderLifecycleAction={
            handlePurchaseOrderLifecycleAction
          }
          handlePurchaseOrderShipmentSubmit={handlePurchaseOrderShipmentSubmit}
          invoicesQuery={invoicesQuery}
          procurementMatchRows={procurementMatchRows}
          procurementSummary={procurementSummary}
          purchaseOrderLifecycleMutation={purchaseOrderLifecycleMutation}
          purchaseOrders={purchaseOrders}
          purchaseOrdersQuery={purchaseOrdersQuery}
          purchaseOrderShipmentForm={purchaseOrderShipmentForm}
          setPurchaseOrderShipmentForm={setPurchaseOrderShipmentForm}
          shipmentsQuery={shipmentsQuery}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="receiving">
        <ReceivingTab
          barcodeLookupMutation={barcodeLookupMutation}
          emptyShipmentBarcodeScanForm={emptyShipmentBarcodeScanForm}
          finalizeShipmentMutation={finalizeShipmentMutation}
          handleShipmentBarcodeLookupSubmit={handleShipmentBarcodeLookupSubmit}
          handleShipmentReceivingSubmit={handleShipmentReceivingSubmit}
          lastBarcodeLookup={lastBarcodeLookup}
          receiveShipmentMutation={receiveShipmentMutation}
          receivingSummary={receivingSummary}
          selectedReceivingShipment={selectedReceivingShipment}
          selectedShipmentItems={selectedShipmentItems}
          setLastBarcodeLookup={setLastBarcodeLookup}
          setShipmentBarcodeScanForm={setShipmentBarcodeScanForm}
          setShipmentReceivingForm={setShipmentReceivingForm}
          shipmentBarcodeScanForm={shipmentBarcodeScanForm}
          shipmentItemsQuery={shipmentItemsQuery}
          shipmentReceivingForm={shipmentReceivingForm}
          shipments={shipments}
          shipmentsQuery={shipmentsQuery}
          storageLocations={storageLocations}
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
