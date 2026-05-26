import type { ProductItem } from '../../types/inventory';
import { formatCostVarianceStatus, formatDateTime, formatMoney, formatPercent } from './productFormatting';
import { styles } from './productStyles';

type ProductsQueryState = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

type ProductListTablePanelProps = {
  productsQuery: ProductsQueryState;
  products: ProductItem[];
  canManageProducts: boolean;
  deleteProductPending: boolean;
  onOpenCostHistory: (product: ProductItem) => void;
  onOpenPackages: (product: ProductItem) => void;
  onStartEdit: (product: ProductItem) => void;
  onDelete: (product: ProductItem) => void;
};

export function ProductListTablePanel({
  productsQuery,
  products,
  canManageProducts,
  deleteProductPending,
  onOpenCostHistory,
  onOpenPackages,
  onStartEdit,
  onDelete
}: ProductListTablePanelProps) {
  if (productsQuery.isLoading) {
    return <p>Loading products...</p>;
  }

  if (productsQuery.isError) {
    return <p>Failed to load products: {(productsQuery.error as Error).message || 'Unknown error'}</p>;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Unit</th>
            <th style={styles.th}>Min Stock</th>
            <th style={styles.th}>Supplier</th>
            <th style={styles.th}>Default Barcode</th>
            <th style={styles.th}>Costing</th>
            <th style={styles.th}>Est. Value</th>
            <th style={styles.th}>Created</th>
            <th style={styles.th}>Version</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td style={styles.emptyCell} colSpan={11}>
                No products found.
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product.id}>
                <td style={styles.td}>
                  <div style={styles.rowTitle}>{product.name}</div>
                  <div style={styles.rowSubtle}>Product ID: {product.id}</div>
                </td>
                <td style={styles.td}>{product.category || '-'}</td>
                <td style={styles.td}>{product.unit}</td>
                <td style={styles.td}>{String(product.min_stock)}</td>
                <td style={styles.td}>{product.supplier_name || 'Not linked'}</td>
                <td style={styles.td}>
                  {product.barcode ? <span style={styles.barcodeValue}>{product.barcode}</span> : '-'}
                </td>
                <td style={styles.td}>
                  {product.effective_unit_cost !== null && product.effective_unit_cost !== undefined ? (
                    <div>
                      <div style={styles.rowTitle}>{formatMoney(product.effective_unit_cost)}</div>
                      <div style={styles.rowSubtle}>
                        Source: {product.effective_cost_source === 'product_standard' ? 'standard cost' : product.effective_cost_source || 'movement'}
                      </div>
                      <div style={styles.rowSubtle}>
                        Effective at: {formatDateTime(product.effective_cost_at)}
                      </div>
                      {product.latest_unit_cost !== null && product.latest_unit_cost !== undefined ? (
                        <div style={styles.rowSubtle}>Movement cost: {formatMoney(product.latest_unit_cost)}</div>
                      ) : product.standard_unit_cost !== null && product.standard_unit_cost !== undefined ? (
                        <div style={styles.rowSubtle}>Fallback standard cost</div>
                      ) : null}
                      <div style={styles.rowSubtle}>
                        Standard variance: {formatCostVarianceStatus(product.cost_variance_status)}
                      </div>
                      {product.cost_variance_amount !== null && product.cost_variance_amount !== undefined ? (
                        <div style={styles.rowSubtle}>
                          Δ {formatMoney(product.cost_variance_amount)} ({formatPercent(product.cost_variance_percent)})
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span style={styles.rowSubtle}>No cost configured</span>
                  )}
                </td>
                <td style={styles.td}>
                  <div style={styles.rowTitle}>{formatMoney(product.estimated_inventory_value)}</div>
                  <div style={styles.rowSubtle}>
                    Stock: {String(product.current_stock_quantity ?? 0)} {product.unit}
                  </div>
                </td>
                <td style={styles.td}>{formatDateTime(product.created_at)}</td>
                <td style={styles.td}>
                  <span style={styles.badgeVersion}>v{product.version}</span>
                </td>
                <td style={styles.td}>
                  <div style={styles.actionGroup}>
                    <button type="button" style={styles.secondaryButton} onClick={() => onOpenCostHistory(product)}>
                      Cost History
                    </button>

                    <button type="button" style={styles.secondaryButton} onClick={() => onOpenPackages(product)}>
                      Packages
                    </button>

                    <button
                      type="button"
                      style={!canManageProducts ? styles.disabledButton : styles.secondaryButton}
                      onClick={() => onStartEdit(product)}
                      disabled={!canManageProducts}
                      title={!canManageProducts ? 'Manager or admin role required' : undefined}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      style={!canManageProducts ? styles.disabledButton : styles.dangerButton}
                      onClick={() => onDelete(product)}
                      disabled={deleteProductPending || !canManageProducts}
                      title={!canManageProducts ? 'Manager or admin role required' : undefined}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
