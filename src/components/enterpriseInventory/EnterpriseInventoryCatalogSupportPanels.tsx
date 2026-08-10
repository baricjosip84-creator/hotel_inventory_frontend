import { AttachmentsTab } from "./tabs/AttachmentsTab";
import { LabelsTab } from "./tabs/LabelsTab";
import { PackagesTab } from "./tabs/PackagesTab";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import { emptyProductPackageForm } from "./EnterpriseInventoryForms";
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
    editingProductPackageId,
    productPackageForm,
    setAttachmentForm,
    setBarcodeLabelForm,
    setEditingProductPackageId,
    setProductPackageForm,
  } = formState;

  const { queries, stableData, viewData } = pageData;

  const { attachmentsQuery, barcodeLabelsQuery, productPackagesQuery, invoicesQuery, requisitionsQuery, supplierReturnsQuery } = queries;

  const { products, suppliers, purchaseOrders, shipments } = stableData;

  const { selectedProductPackages } = viewData;

  const {
    beginEditProductPackage,
    cancelEditProductPackage,
    createAttachmentMutation,
    deleteAttachmentMutation,
    createBarcodeLabelMutation,
    recordBarcodeLabelPrintsMutation,
    deleteBarcodeLabelMutation,
    createProductPackageMutation,
    deleteProductPackageMutation,
    handleBarcodeLabelSubmit,
    handleProductPackageSubmit,
    updateProductPackageMutation,
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

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="packages">
        <PackagesTab
          editingProductPackageId={editingProductPackageId}
          emptyProductPackageForm={emptyProductPackageForm}
          productPackageForm={productPackageForm}
          productPackagesQuery={productPackagesQuery}
          products={products}
          selectedProductPackages={selectedProductPackages}
          createProductPackageMutation={createProductPackageMutation}
          updateProductPackageMutation={updateProductPackageMutation}
          deleteProductPackageMutation={deleteProductPackageMutation}
          beginEditProductPackage={beginEditProductPackage}
          cancelEditProductPackage={cancelEditProductPackage}
          setEditingProductPackageId={setEditingProductPackageId}
          setProductPackageForm={setProductPackageForm}
          onProductPackageSubmit={handleProductPackageSubmit}
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
