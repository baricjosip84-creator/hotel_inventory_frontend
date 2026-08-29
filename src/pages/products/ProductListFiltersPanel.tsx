import type { SupplierItem } from '../../types/inventory';
import { ProductSearchBarcodeScanner } from './ProductSearchBarcodeScanner';
import { styles } from './productStyles';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

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
  const { ui, locale } = useAppTranslation();
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
          <label htmlFor="product-list-search" style={styles.label}>{ui("Search products")}</label>
          <div style={styles.productSearchInputWrapper}>
            <input
              id="product-list-search"
              type="text"
              role="searchbox"
              inputMode="search"
              autoComplete="off"
              placeholder={ui("SKU, name, category, unit, supplier, or barcode")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={styles.productSearchInput}
              aria-describedby="product-list-search-help"
            />
            {hasTextSearch ? (
              <button
                type="button"
                data-skip-global-action-feedback="true"
                aria-label={ui("Clear product search")}
                title={ui("Clear product search")}
                style={styles.clearSearchButton}
                onClick={() => setSearch('')}
              >
                ×
              </button>
            ) : null}
          </div>
          <div id="product-list-search-help" style={styles.productSearchHelp}>
            {ui("Results filter immediately as you type. Exact barcode scans are ranked first.")}
          </div>
        </div>

        <ProductSearchBarcodeScanner onDecoded={setSearch} />
      </div>

      <div style={styles.toolbarGrid}>
        <div>
          <label htmlFor="product-list-category" style={styles.label}>{ui("Category")}</label>
          <select
            id="product-list-category"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">{ui("All categories")}</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="product-list-supplier" style={styles.label}>{ui("Supplier")}</label>
          <select
            id="product-list-supplier"
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">{ui("All suppliers")}</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="product-list-cost-status" style={styles.label}>{ui("Cost status")}</label>
          <select
            id="product-list-cost-status"
            value={costStatusFilter}
            onChange={(event) => setCostStatusFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">{ui("All cost statuses")}</option>
            <option value="costed">{ui("Costed products")}</option>
            <option value="uncosted">{ui("Uncosted products")}</option>
          </select>
        </div>

        <div>
          <label htmlFor="product-list-cost-basis" style={styles.label}>{ui("Cost basis")}</label>
          <select
            id="product-list-cost-basis"
            value={costBasisFilter}
            onChange={(event) => setCostBasisFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">{ui("All cost bases")}</option>
            <option value="received">{ui("Received movement cost")}</option>
            <option value="standard">{ui("Standard cost fallback")}</option>
            <option value="none">{ui("No cost")}</option>
          </select>
        </div>

        <div>
          <label htmlFor="product-list-variance" style={styles.label}>{ui("Standard variance")}</label>
          <select
            id="product-list-variance"
            value={costVarianceStatusFilter}
            onChange={(event) => setCostVarianceStatusFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">{ui("All standard variances")}</option>
            <option value="matched">{ui("Matches standard")}</option>
            <option value="above_standard">{ui("Above standard")}</option>
            <option value="below_standard">{ui("Below standard")}</option>
            <option value="no_standard">{ui("No standard cost")}</option>
            <option value="no_received">{ui("No received cost")}</option>
          </select>
        </div>
      </div>

      <div style={styles.filterActionRow}>
        <div style={styles.filterResultText} aria-live="polite">
          {hasTextSearch ? (
            <>
              {formatLocalizedNumber(Number(productsCount), locale)} {ui('of')} {formatLocalizedNumber(Number(totalProductsCount), locale)}{' '}
              {ui(totalProductsCount === 1 ? 'product' : 'products')} {ui('match the text search')}
              {hasStructuredFilters ? <> {ui('within the active filters')}</> : null}.
            </>
          ) : (
            <>
              {formatLocalizedNumber(Number(productsCount), locale)} {ui(productsCount === 1 ? 'product' : 'products')} {ui('shown')}
              {hasStructuredFilters ? <> {ui('for the active filters')}</> : null}.
            </>
          )}
        </div>
        <div style={styles.actionGroup}>
          <button
            type="button"
            style={!hasActiveFilters ? styles.disabledButton : styles.secondaryButton}
            onClick={clearFilters}
            disabled={!hasActiveFilters}
          >
            {ui("Clear Product Filters")}
          </button>
          <button
            type="button"
            style={productsCount === 0 ? styles.disabledButton : styles.secondaryButton}
            onClick={onExportProductsCsv}
            disabled={productsCount === 0}
          >
            {ui("Export Products CSV")}
          </button>
        </div>
      </div>
    </>
  );
}
