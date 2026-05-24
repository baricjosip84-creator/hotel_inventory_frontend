import { AttachmentsTab, LabelsTab, PackagesTab } from "./tabs";
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

  const { attachmentsQuery, barcodeLabelsQuery, productPackagesQuery } = queries;

  const { products } = stableData;

  const { selectedProductPackages } = viewData;

  const {
    beginEditProductPackage,
    cancelEditProductPackage,
    createAttachmentMutation,
    createBarcodeLabelMutation,
    createProductPackageMutation,
    deleteProductPackageMutation,
    handleAttachmentSubmit,
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
          setAttachmentForm={setAttachmentForm}
          onAttachmentSubmit={handleAttachmentSubmit}
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
