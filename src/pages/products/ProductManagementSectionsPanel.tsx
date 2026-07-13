import { getCurrentAccessRoleLabel } from '../../lib/permissions';
import { styles } from './productStyles';
import { ProductFormPanel } from './ProductFormPanel';
import { ProductPackagesPanel } from './ProductPackagesPanel';
import { ProductCostHistoryPanel } from './ProductCostHistoryPanel';
import { ProductListPanel } from './ProductListPanel';

type ProductManagementSectionsPanelProps = {
  canManageProducts: any;
  role: any;
  editingProduct: any;
  form: any;
  suppliers: any;
  isSubmitting: any;
  formError: any;
  formMessage: any;
  handleSubmit: any;
  handleCancelEdit: any;
  setForm: any;
  selectedPackageProduct: any;
  packagesQuery: any;
  packages: any;
  packageForm: any;
  editingPackage: any;
  packageError: any;
  packageMessage: any;
  isPackageSubmitting: any;
  canManageProductPackages: any;
  deletePackageMutation: any;
  setPackageForm: any;
  handleClosePackages: any;
  handlePackageSubmit: any;
  handleCancelPackageEdit: any;
  handleStartEditPackage: any;
  handleDeletePackage: any;
  selectedCostProduct: any;
  costHistoryQuery: any;
  standardCostHistoryQuery: any;
  costHistory: any;
  standardCostHistory: any;
  costSummary: any;
  costHistoryFilters: any;
  setCostHistoryFilters: any;
  handleExportCostHistoryCsv: any;
  handleExportStandardCostHistoryCsv: any;
  handleCloseCostHistory: any;
  handleClearCostHistoryFilters: any;
  productsQuery: any;
  products: any;
  categoryOptions: any;
  search: any;
  setSearch: any;
  categoryFilter: any;
  setCategoryFilter: any;
  supplierFilter: any;
  setSupplierFilter: any;
  costStatusFilter: any;
  setCostStatusFilter: any;
  costBasisFilter: any;
  setCostBasisFilter: any;
  costVarianceStatusFilter: any;
  setCostVarianceStatusFilter: any;
  deleteMutation: any;
  handleExportProductsCsv: any;
  handleOpenCostHistory: any;
  handleOpenPackages: any;
  handleStartEdit: any;
  handleDelete: any;
};

export function ProductManagementSectionsPanel({
  canManageProducts,
  role,
  editingProduct,
  form,
  suppliers,
  isSubmitting,
  formError,
  formMessage,
  handleSubmit,
  handleCancelEdit,
  setForm,
  selectedPackageProduct,
  packagesQuery,
  packages,
  packageForm,
  editingPackage,
  packageError,
  packageMessage,
  isPackageSubmitting,
  canManageProductPackages,
  deletePackageMutation,
  setPackageForm,
  handleClosePackages,
  handlePackageSubmit,
  handleCancelPackageEdit,
  handleStartEditPackage,
  handleDeletePackage,
  selectedCostProduct,
  costHistoryQuery,
  standardCostHistoryQuery,
  costHistory,
  standardCostHistory,
  costSummary,
  costHistoryFilters,
  setCostHistoryFilters,
  handleExportCostHistoryCsv,
  handleExportStandardCostHistoryCsv,
  handleCloseCostHistory,
  handleClearCostHistoryFilters,
  productsQuery,
  products,
  categoryOptions,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  supplierFilter,
  setSupplierFilter,
  costStatusFilter,
  setCostStatusFilter,
  costBasisFilter,
  setCostBasisFilter,
  costVarianceStatusFilter,
  setCostVarianceStatusFilter,
  deleteMutation,
  handleExportProductsCsv,
  handleOpenCostHistory,
  handleOpenPackages,
  handleStartEdit,
  handleDelete
}: ProductManagementSectionsPanelProps) {
  return (
    <>
      {!canManageProducts ? (
        <div style={styles.warningBox}>
          Current access role: {getCurrentAccessRoleLabel() || role}. Products are read-only because this role does not have products.write permission.
        </div>
      ) : null}

      <ProductFormPanel
        editingProduct={editingProduct}
        form={form}
        suppliers={suppliers}
        canManageProducts={canManageProducts}
        isSubmitting={isSubmitting}
        formError={formError}
        formMessage={formMessage}
        onSubmit={handleSubmit}
        onCancelEdit={handleCancelEdit}
        setForm={setForm}
      />

      <ProductPackagesPanel
        selectedPackageProduct={selectedPackageProduct}
        packagesQuery={packagesQuery}
        packages={packages}
        packageForm={packageForm}
        editingPackage={editingPackage}
        packageError={packageError}
        packageMessage={packageMessage}
        isPackageSubmitting={isPackageSubmitting}
        canManageProductPackages={canManageProductPackages}
        deletePackagePending={deletePackageMutation.isPending}
        setPackageForm={setPackageForm}
        onClosePackages={handleClosePackages}
        onSubmit={handlePackageSubmit}
        onCancelPackageEdit={handleCancelPackageEdit}
        onStartEditPackage={handleStartEditPackage}
        onDeletePackage={handleDeletePackage}
      />

      <ProductCostHistoryPanel
        selectedCostProduct={selectedCostProduct}
        costHistoryQuery={costHistoryQuery}
        standardCostHistoryQuery={standardCostHistoryQuery}
        costHistory={costHistory}
        standardCostHistory={standardCostHistory}
        costSummary={costSummary}
        costHistoryFilters={costHistoryFilters}
        setCostHistoryFilters={setCostHistoryFilters}
        onExportCostHistoryCsv={handleExportCostHistoryCsv}
        onExportStandardCostHistoryCsv={handleExportStandardCostHistoryCsv}
        onCloseCostHistory={handleCloseCostHistory}
        onClearCostHistoryFilters={handleClearCostHistoryFilters}
      />

      <ProductListPanel
        productsQuery={productsQuery}
        products={products}
        suppliers={suppliers}
        categoryOptions={categoryOptions}
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        supplierFilter={supplierFilter}
        setSupplierFilter={setSupplierFilter}
        costStatusFilter={costStatusFilter}
        setCostStatusFilter={setCostStatusFilter}
        costBasisFilter={costBasisFilter}
        setCostBasisFilter={setCostBasisFilter}
        costVarianceStatusFilter={costVarianceStatusFilter}
        setCostVarianceStatusFilter={setCostVarianceStatusFilter}
        canManageProducts={canManageProducts}
        deleteProductPending={deleteMutation.isPending}
        onExportProductsCsv={handleExportProductsCsv}
        onOpenCostHistory={handleOpenCostHistory}
        onOpenPackages={handleOpenPackages}
        onStartEdit={handleStartEdit}
        onDelete={handleDelete}
      />
    </>
  );
}
