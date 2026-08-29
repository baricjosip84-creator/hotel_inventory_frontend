import { useQueryClient } from '@tanstack/react-query';
import type { useProductPageViewModel } from './useProductPageViewModel';
import { getCurrentAccessRoleLabel } from '../../lib/permissions';
import { styles } from './productStyles';
import { ProductFormPanel } from './ProductFormPanel';
import { ProductListPanel } from './ProductListPanel';
import { InventoryCsvImportPanel } from '../../components/imports/InventoryCsvImportPanel';
import { useAppTranslation } from '../../i18n/I18nContext';

type ProductManagementSectionsPanelProps = ReturnType<typeof useProductPageViewModel>;

export function ProductManagementSectionsPanel({
  canManageProducts,
  canViewProductPackages,
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
  productsQuery,
  products,
  totalProductsCount,
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
  const { ui } = useAppTranslation();
  const queryClient = useQueryClient();

  return (
    <>
      {!canManageProducts ? (
        <div style={styles.warningBox}>
          {ui("Current access role:")} {ui(getCurrentAccessRoleLabel() || role)}{ui(". Products are read-only because this role does not have products.write permission.")}
        </div>
      ) : null}

      <InventoryCsvImportPanel
        importType="products"
        title={ui("Bulk Product Import")}
        description={ui("Validate a CSV first, then commit all rows atomically. Existing records are never silently overwritten.")}
        templateColumns={['sku', 'name', 'category', 'unit', 'min_stock', 'standard_unit_cost', 'supplier_name', 'barcode', 'requires_lot_tracking', 'requires_expiry_date']}
        templateExample={{ sku: 'BEV-COFFEE-001', name: 'Coffee Beans Premium', category: 'Beverages', unit: 'kg', min_stock: '10', standard_unit_cost: '18.50', supplier_name: '', barcode: '', requires_lot_tracking: 'false', requires_expiry_date: 'false' }}
        canImport={canManageProducts}
        disabledReason={ui("Products write permission is required for bulk product import.")}
        onCommitted={async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['products'] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
          ]);
        }}
      />

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

      <ProductListPanel
        productsQuery={productsQuery}
        products={products}
        totalProductsCount={totalProductsCount}
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
        canViewProductPackages={canViewProductPackages}
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
