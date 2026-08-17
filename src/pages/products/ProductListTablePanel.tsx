import type { ProductItem } from '../../types/inventory';
import { formatCostVarianceStatus, formatMoney, formatPercent } from './productFormatting';
import { styles } from './productStyles';

type ProductsQueryState = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

type ProductListTablePanelProps = {
  productsQuery: ProductsQueryState;
  products: ProductItem[];
  emptyMessage: string;
  canManageProducts: boolean;
  canViewProductPackages: boolean;
  deleteProductPending: boolean;
  onOpenCostHistory: (product: ProductItem) => void;
  onOpenPackages: (product: ProductItem) => void;
  onStartEdit: (product: ProductItem) => void;
  onDelete: (product: ProductItem) => void;
};

const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCostBasis = (source: string | null | undefined): string => {
  if (source === 'product_standard') return 'Standard fallback';
  if (source === 'landed_cost') return 'Landed cost';
  if (source) return 'Received cost';
  return 'No cost basis';
};

export function ProductListTablePanel({
  productsQuery,
  products,
  emptyMessage,
  canManageProducts,
  canViewProductPackages,
  deleteProductPending,
  onOpenCostHistory,
  onOpenPackages,
  onStartEdit,
  onDelete
}: ProductListTablePanelProps) {
  if (productsQuery.isLoading) {
    return <div style={styles.emptyCell}>Loading products...</div>;
  }

  if (productsQuery.isError) {
    return <div style={styles.errorBox}>Failed to load products: {(productsQuery.error as Error).message || 'Unknown error'}</div>;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Product</th>
            <th style={styles.th}>Category / Unit</th>
            <th style={styles.th}>Supplier</th>
            <th style={styles.th}>Stock</th>
            <th style={styles.th}>Default Barcode</th>
            <th style={styles.th}>Cost</th>
            <th style={styles.th}>Est. Value</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td style={styles.emptyCell} colSpan={8}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            products.map((product) => {
              const currentStock = toNumber(product.current_stock_quantity);
              const minimumStock = toNumber(product.min_stock);
              const belowMinimum = minimumStock > 0 && currentStock < minimumStock;

              return (
                <tr key={product.id}>
                  <td style={styles.td}>
                    <div style={styles.rowTitle}>{product.name}</div>
                    <div style={styles.rowSubtle}>SKU: {product.sku || '-'}</div>
                    {product.requires_lot_tracking || product.requires_expiry_date ? (
                      <div style={styles.rowBadgeGroup}>
                        {product.requires_lot_tracking ? <span style={styles.miniBadge}>Lot / batch</span> : null}
                        {product.requires_expiry_date ? <span style={styles.miniBadge}>Expiry</span> : null}
                      </div>
                    ) : null}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.rowTitle}>{product.category || 'Uncategorized'}</div>
                    <div style={styles.rowSubtle}>{product.unit}</div>
                  </td>
                  <td style={styles.td}>{product.supplier_name || 'Not linked'}</td>
                  <td style={styles.td}>
                    <div style={belowMinimum ? styles.rowTitleWarn : styles.rowTitle}>
                      {String(product.current_stock_quantity ?? 0)} {product.unit}
                    </div>
                    <div style={styles.rowSubtle}>Minimum: {String(product.min_stock ?? 0)}</div>
                    {belowMinimum ? <span style={styles.miniBadgeWarn}>Below minimum</span> : null}
                  </td>
                  <td style={styles.td}>
                    {product.barcode ? <span style={styles.barcodeValue}>{product.barcode}</span> : <span style={styles.rowSubtle}>No default barcode</span>}
                  </td>
                  <td style={styles.td}>
                    {product.effective_unit_cost !== null && product.effective_unit_cost !== undefined ? (
                      <div>
                        <div style={styles.rowTitle}>{formatMoney(product.effective_unit_cost)}</div>
                        <div style={styles.rowSubtle}>{formatCostBasis(product.effective_cost_source)}</div>
                        <div style={styles.rowSubtle}>Variance: {formatCostVarianceStatus(product.cost_variance_status)}</div>
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
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionGroup}>
                      <button type="button" style={styles.secondaryButton} onClick={() => onOpenCostHistory(product)}>
                        Cost history
                      </button>

                      <button
                        type="button"
                        style={!canViewProductPackages ? styles.disabledButton : styles.secondaryButton}
                        onClick={() => onOpenPackages(product)}
                        disabled={!canViewProductPackages}
                        title={!canViewProductPackages ? 'Product package read permission required' : undefined}
                      >
                        Packages
                      </button>

                      <button
                        type="button"
                        style={!canManageProducts ? styles.disabledButton : styles.secondaryButton}
                        onClick={() => onStartEdit(product)}
                        disabled={!canManageProducts}
                        title={!canManageProducts ? 'Products write permission required' : undefined}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        style={!canManageProducts ? styles.disabledButton : styles.dangerButton}
                        onClick={() => onDelete(product)}
                        disabled={deleteProductPending || !canManageProducts}
                        title={!canManageProducts ? 'Products write permission required' : undefined}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
