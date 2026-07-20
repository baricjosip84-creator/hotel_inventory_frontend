import type { useProductPageViewModel } from './useProductPageViewModel';
import { getCurrentAccessRoleLabel } from '../../lib/permissions';
import { styles } from './productStyles';
import { ProductFormPanel } from './ProductFormPanel';
import { ProductPackagesPanel } from './ProductPackagesPanel';
import { ProductCostHistoryPanel } from './ProductCostHistoryPanel';
import { ProductListPanel } from './ProductListPanel';

type ProductManagementSectionsPanelProps = ReturnType<typeof useProductPageViewModel>;

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
