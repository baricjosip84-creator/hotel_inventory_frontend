import { AttachmentsTab } from "./tabs/AttachmentsTab";
import { LabelsTab } from "./tabs/LabelsTab";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import type {
  EnterpriseInventoryPanelBaseProps,
} from "./EnterpriseInventoryPanelTypes";

export function EnterpriseInventoryCatalogSupportPanels({
  activeTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryPanelBaseProps) {
  const {
    attachmentForm,
    barcodeLabelForm,
    setAttachmentForm,
    setBarcodeLabelForm,
  } = formState;

  const { queries, stableData } = pageData;


  const { products, suppliers, purchaseOrders, shipments } = stableData;

  const { attachmentsQuery, barcodeLabelsQuery, invoicesQuery, requisitionsQuery, supplierReturnsQuery } = queries;


  const {
    createAttachmentMutation,
    deleteAttachmentMutation,
    createBarcodeLabelMutation,
    recordBarcodeLabelPrintsMutation,
    deleteBarcodeLabelMutation,
    handleBarcodeLabelSubmit,
  } = actions;

  return (
    <>
      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="labels">
        <LabelsTab
          barcodeLabelForm={barcodeLabelForm}
          barcodeLabelsQuery={barcodeLabelsQuery}
          createBarcodeLabelMutation={createBarcodeLabelMutation}
          recordBarcodeLabelPrintsMutation={recordBarcodeLabelPrintsMutation}
          deleteBarcodeLabelMutation={deleteBarcodeLabelMutation}
          products={products}
          setBarcodeLabelForm={setBarcodeLabelForm}
          onBarcodeLabelSubmit={handleBarcodeLabelSubmit}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="attachments">
        <AttachmentsTab
          attachmentForm={attachmentForm}
          attachmentsQuery={attachmentsQuery}
          createAttachmentMutation={createAttachmentMutation}
          deleteAttachmentMutation={deleteAttachmentMutation}
          setAttachmentForm={setAttachmentForm}
          products={products}
          suppliers={suppliers}
          purchaseOrders={purchaseOrders}
          shipments={shipments}
          invoices={invoicesQuery.data ?? []}
          requisitions={requisitionsQuery.data ?? []}
          supplierReturns={supplierReturnsQuery.data ?? []}
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
