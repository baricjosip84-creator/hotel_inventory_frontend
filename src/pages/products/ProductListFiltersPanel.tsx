import type { SupplierItem } from '../../types/inventory';
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
  onExportProductsCsv
}: ProductListFiltersPanelProps) {
  return (
    <div style={styles.toolbarGrid}>
      <input
        type="text"
        placeholder="Search by product name, category, unit, or barcode..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={styles.searchInput}
      />

      <select
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

      <select
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

      <select
        value={costStatusFilter}
        onChange={(event) => setCostStatusFilter(event.target.value)}
        style={styles.searchInput}
      >
        <option value="">All cost statuses</option>
        <option value="costed">Costed products</option>
        <option value="uncosted">Uncosted products</option>
      </select>

      <select
        value={costBasisFilter}
        onChange={(event) => setCostBasisFilter(event.target.value)}
        style={styles.searchInput}
      >
        <option value="">All cost bases</option>
        <option value="received">Received movement cost</option>
        <option value="standard">Standard cost fallback</option>
        <option value="none">No cost</option>
      </select>

      <select
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

      <button
        type="button"
        style={styles.secondaryButton}
        onClick={onExportProductsCsv}
        disabled={productsCount === 0}
      >
        Export Products CSV
      </button>
    </div>
  );
}
