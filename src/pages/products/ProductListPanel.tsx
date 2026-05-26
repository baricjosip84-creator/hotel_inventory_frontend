import type { ProductItem, SupplierItem } from '../../types/inventory';
import { ProductListFiltersPanel } from './ProductListFiltersPanel';
import { ProductListTablePanel } from './ProductListTablePanel';
import { styles } from './productStyles';

type ProductsQueryState = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

type ProductListPanelProps = {
  productsQuery: ProductsQueryState;
  products: ProductItem[];
  suppliers: SupplierItem[];
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
  suppliers,
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
  deleteProductPending,
  onExportProductsCsv,
  onOpenCostHistory,
  onOpenPackages,
  onStartEdit,
  onDelete
}: ProductListPanelProps) {
  return (
    <section style={styles.panel}>
      <h3 style={styles.panelTitle}>Product List</h3>
      <p style={styles.panelSubtitle}>
        Search and review products available to stock, shipment, receiving, and reporting workflows.
      </p>

      <ProductListFiltersPanel
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
        productsCount={products.length}
        onExportProductsCsv={onExportProductsCsv}
      />

      <ProductListTablePanel
        productsQuery={productsQuery}
        products={products}
        canManageProducts={canManageProducts}
        deleteProductPending={deleteProductPending}
        onOpenCostHistory={onOpenCostHistory}
        onOpenPackages={onOpenPackages}
        onStartEdit={onStartEdit}
        onDelete={onDelete}
      />
    </section>
  );
}
