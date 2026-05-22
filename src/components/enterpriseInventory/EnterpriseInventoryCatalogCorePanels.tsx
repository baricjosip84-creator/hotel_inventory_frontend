import { LocationsTab, ProductsTab, SuppliersTab } from "./tabs";
import { EnterpriseInventoryTabPanel } from "./EnterpriseInventoryTabPanel";
import {
  emptyProductForm,
  emptyProductPackageForm,
  emptyStorageLocationForm,
  emptySupplierForm,
} from "./EnterpriseInventoryForms";
import type {
  EnterpriseInventoryPanelBaseProps,
  EnterpriseInventoryPanelNavigationProps,
} from "./EnterpriseInventoryPanelTypes";

type EnterpriseInventoryCatalogCorePanelsProps =
  EnterpriseInventoryPanelBaseProps & EnterpriseInventoryPanelNavigationProps;

export function EnterpriseInventoryCatalogCorePanels({
  activeTab,
  setActiveTab,
  actions,
  formState,
  pageData,
}: EnterpriseInventoryCatalogCorePanelsProps) {
  const {
    editingProductId,
    editingStorageLocationId,
    editingSupplierId,
    productForm,
    productSearch,
    selectedSupplierPerformanceId,
    setEditingProductId,
    setEditingStorageLocationId,
    setEditingSupplierId,
    setProductForm,
    setProductPackageForm,
    setProductSearch,
    setSelectedSupplierPerformanceId,
    setStorageLocationForm,
    setSupplierForm,
    setSupplierSearch,
    storageLocationForm,
    supplierForm,
    supplierSearch,
  } = formState;

  const { queries, stableData } = pageData;

  const {
    productsQuery,
    storageLocationsQuery,
    supplierPerformanceQuery,
    supplierSlaBreachesQuery,
    suppliersQuery,
  } = queries;

  const {
    availableSuppliers,
    products,
    storageLocations,
    supplierSlaBreaches,
    suppliers,
  } = stableData;

  const {
    deleteProductMutation,
    deleteStorageLocationMutation,
    deleteSupplierMutation,
    saveProductMutation,
    saveStorageLocationMutation,
    saveSupplierMutation,
  } = actions;

  return (
    <>
      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="products">
        <ProductsTab
          editingProductId={editingProductId}
          emptyProductForm={emptyProductForm}
          emptyProductPackageForm={emptyProductPackageForm}
          productForm={productForm}
          productSearch={productSearch}
          products={products}
          productsQuery={productsQuery}
          saveProductMutation={saveProductMutation}
          deleteProductMutation={deleteProductMutation}
          setActiveTab={setActiveTab}
          setEditingProductId={setEditingProductId}
          setProductForm={setProductForm}
          setProductPackageForm={setProductPackageForm}
          setProductSearch={setProductSearch}
          suppliers={suppliers}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="suppliers">
        <SuppliersTab
          availableSuppliers={availableSuppliers}
          deleteSupplierMutation={deleteSupplierMutation}
          editingSupplierId={editingSupplierId}
          emptySupplierForm={emptySupplierForm}
          saveSupplierMutation={saveSupplierMutation}
          selectedSupplierPerformanceId={selectedSupplierPerformanceId}
          setEditingSupplierId={setEditingSupplierId}
          setSelectedSupplierPerformanceId={setSelectedSupplierPerformanceId}
          setSupplierForm={setSupplierForm}
          setSupplierSearch={setSupplierSearch}
          supplierForm={supplierForm}
          supplierPerformanceQuery={supplierPerformanceQuery}
          supplierSearch={supplierSearch}
          supplierSlaBreaches={supplierSlaBreaches}
          supplierSlaBreachesQuery={supplierSlaBreachesQuery}
          suppliers={suppliers}
          suppliersQuery={suppliersQuery}
        />
      </EnterpriseInventoryTabPanel>

      <EnterpriseInventoryTabPanel activeTab={activeTab} tab="locations">
        <LocationsTab
          editingStorageLocationId={editingStorageLocationId}
          emptyStorageLocationForm={emptyStorageLocationForm}
          storageLocationForm={storageLocationForm}
          setEditingStorageLocationId={setEditingStorageLocationId}
          setStorageLocationForm={setStorageLocationForm}
          storageLocations={storageLocations}
          storageLocationsQuery={storageLocationsQuery}
          saveStorageLocationMutation={saveStorageLocationMutation}
          deleteStorageLocationMutation={deleteStorageLocationMutation}
        />
      </EnterpriseInventoryTabPanel>
    </>
  );
}
