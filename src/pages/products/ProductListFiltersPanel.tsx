import type { SupplierItem } from '../../types/inventory';
import { ProductSearchBarcodeScanner } from './ProductSearchBarcodeScanner';
import { styles } from './productStyles';

type ProductListFiltersPanelProps = {
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
  productsCount: number;
  totalProductsCount: number;
  onExportProductsCsv: () => void;
};

export function ProductListFiltersPanel({
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
  productsCount,
  totalProductsCount,
  onExportProductsCsv
}: ProductListFiltersPanelProps) {
  const hasTextSearch = Boolean(search.trim());
  const hasStructuredFilters = Boolean(
    categoryFilter ||
    supplierFilter ||
    costStatusFilter ||
    costBasisFilter ||
    costVarianceStatusFilter
  );
  const hasActiveFilters = hasTextSearch || hasStructuredFilters;

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setSupplierFilter('');
    setCostStatusFilter('');
    setCostBasisFilter('');
    setCostVarianceStatusFilter('');
  };

  return (
    <>
      <div style={styles.productSearchToolsRow}>
        <div>
          <label htmlFor="product-list-search" style={styles.label}>Search products</label>
          <div style={styles.productSearchInputWrapper}>
            <input
              id="product-list-search"
              type="text"
              role="searchbox"
              inputMode="search"
              autoComplete="off"
              placeholder="SKU, name, category, unit, supplier, or barcode"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={styles.productSearchInput}
              aria-describedby="product-list-search-help"
            />
            {hasTextSearch ? (
              <button
                type="button"
                data-skip-global-action-feedback="true"
                aria-label="Clear product search"
                title="Clear product search"
                style={styles.clearSearchButton}
                onClick={() => setSearch('')}
              >
                ×
              </button>
            ) : null}
          </div>
          <div id="product-list-search-help" style={styles.productSearchHelp}>
            Results filter immediately as you type. Exact barcode scans are ranked first.
          </div>
        </div>

        <ProductSearchBarcodeScanner onDecoded={setSearch} />
      </div>

      <div style={styles.toolbarGrid}>
        <div>
          <label htmlFor="product-list-category" style={styles.label}>Category</label>
          <select
            id="product-list-category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="product-list-supplier" style={styles.label}>Supplier</label>
          <select
            id="product-list-supplier"
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="product-list-cost-status" style={styles.label}>Cost status</label>
          <select
            id="product-list-cost-status"
            value={costStatusFilter}
            onChange={(event) => setCostStatusFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All cost statuses</option>
            <option value="costed">Costed products</option>
            <option value="uncosted">Uncosted products</option>
          </select>
        </div>

        <div>
          <label htmlFor="product-list-cost-basis" style={styles.label}>Cost basis</label>
          <select
            id="product-list-cost-basis"
            value={costBasisFilter}
            onChange={(event) => setCostBasisFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All cost bases</option>
            <option value="received">Received movement cost</option>
            <option value="standard">Standard cost fallback</option>
            <option value="none">No cost</option>
          </select>
        </div>

        <div>
          <label htmlFor="product-list-variance" style={styles.label}>Standard variance</label>
          <select
            id="product-list-variance"
            value={costVarianceStatusFilter}
            onChange={(event) => setCostVarianceStatusFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All standard variances</option>
            <option value="matched">Matches standard</option>
            <option value="above_standard">Above standard</option>
            <option value="below_standard">Below standard</option>
            <option value="no_standard">No standard cost</option>
            <option value="no_received">No received cost</option>
          </select>
        </div>
      </div>

      <div style={styles.filterActionRow}>
        <div style={styles.filterResultText} aria-live="polite">
          {hasTextSearch
            ? `${productsCount.toLocaleString()} of ${totalProductsCount.toLocaleString()} product${totalProductsCount === 1 ? '' : 's'} match the text search${hasStructuredFilters ? ' within the active filters' : ''}.`
            : `${productsCount.toLocaleString()} product${productsCount === 1 ? '' : 's'} shown${hasStructuredFilters ? ' for the active filters' : ''}.`}
        </div>
        <div style={styles.actionGroup}>
          <button
            type="button"
            style={!hasActiveFilters ? styles.disabledButton : styles.secondaryButton}
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            Clear Product Filters
          </button>
          <button
            type="button"
            style={productsCount === 0 ? styles.disabledButton : styles.secondaryButton}
            onClick={onExportProductsCsv}
            disabled={productsCount === 0}
          >
            Export Products CSV
          </button>
        </div>
      </div>
    </>
  );
}
