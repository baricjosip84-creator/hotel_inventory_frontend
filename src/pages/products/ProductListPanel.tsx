import type { ProductItem, SupplierItem } from '../../types/inventory';
import { ProductListFiltersPanel } from './ProductListFiltersPanel';
import { ProductListTablePanel } from './ProductListTablePanel';
import { styles } from './productStyles';
import { useAppTranslation } from '../../i18n/I18nContext';

type ProductsQueryState = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

type SuppliersQueryState = ProductsQueryState;

type ProductListPanelProps = {
  productsQuery: ProductsQueryState;
  products: ProductItem[];
  totalProductsCount: number;
  suppliers: SupplierItem[];
  suppliersQuery: SuppliersQueryState;
  categoryOptions: string[];
  search: string;
  setSearch: (value: string) => void;
  categoryFilter: string;
  setCategoryFilter: (value: string) => void;
  supplierFilter: string;
  setSupplierFilter: (value: string) => void;
  costStatusFilter: string;
  setCostStatusFilter: (value: string) => void;
  costBasisFilter: string;
  setCostBasisFilter: (value: string) => void;
  costVarianceStatusFilter: string;
  setCostVarianceStatusFilter: (value: string) => void;
  canManageProducts: boolean;
  canViewProductPackages: boolean;
  canViewSuppliers: boolean;
  canViewStock: boolean;
  deleteProductPending: boolean;
  onExportProductsCsv: () => void;
  onOpenCostHistory: (product: ProductItem) => void;
  onOpenPackages: (product: ProductItem) => void;
  onStartEdit: (product: ProductItem) => void;
  onDelete: (product: ProductItem) => void;
};

export function ProductListPanel({
  productsQuery,
  products,
  totalProductsCount,
  suppliers,
  suppliersQuery,
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
  canManageProducts,
  canViewProductPackages,
  canViewSuppliers,
  canViewStock,
  deleteProductPending,
  onExportProductsCsv,
  onOpenCostHistory,
  onOpenPackages,
  onStartEdit,
  onDelete
}: ProductListPanelProps) {
  const { ui } = useAppTranslation();
  return (
    <section id="product-list-panel" style={styles.panel}>
      <h3 style={styles.panelTitle}>{ui("Product List")}</h3>
      <p style={styles.panelSubtitle}>
        {ui("Search and review products available to stock, shipment, receiving, and reporting workflows.")}
      </p>

      <ProductListFiltersPanel
        suppliers={suppliers}
        suppliersQuery={suppliersQuery}
        productsQuery={productsQuery}
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
        productsCount={products.length}
        totalProductsCount={totalProductsCount}
        canViewSuppliers={canViewSuppliers}
        onExportProductsCsv={onExportProductsCsv}
      />

      <ProductListTablePanel
        productsQuery={productsQuery}
        products={products}
        emptyMessage={search.trim() ? ui('No products match the current search and filters.') : ui('No products found for the current filters.')}
        canManageProducts={canManageProducts}
        canViewProductPackages={canViewProductPackages}
        canViewSuppliers={canViewSuppliers}
        canViewStock={canViewStock}
        deleteProductPending={deleteProductPending}
        onOpenCostHistory={onOpenCostHistory}
        onOpenPackages={onOpenPackages}
        onStartEdit={onStartEdit}
        onDelete={onDelete}
      />
    </section>
  );
}
