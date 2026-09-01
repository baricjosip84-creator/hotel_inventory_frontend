import type { ProductItem } from '../../types/inventory';
import { formatCostVarianceStatus, formatMoney, formatPercent } from './productFormatting';
import { styles } from './productStyles';
import { useAppTranslation } from '../../i18n/I18nContext';

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
  canViewSuppliers: boolean;
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

const formatCostBasis = (source: string | null | undefined, ui: (englishText: string) => string): string => {
  if (source === 'product_standard') return ui('Standard fallback');
  if (source === 'landed_cost') return ui('Landed cost');
  if (source) return ui('Received cost');
  return ui('No cost basis');
};

export function ProductListTablePanel({
  productsQuery,
  products,
  emptyMessage,
  canManageProducts,
  canViewProductPackages,
  canViewSuppliers,
  deleteProductPending,
  onOpenCostHistory,
  onOpenPackages,
  onStartEdit,
  onDelete
}: ProductListTablePanelProps) {
  const { ui, locale } = useAppTranslation();
  if (productsQuery.isLoading) {
    return <div style={styles.emptyCell}>{ui("Loading products...")}</div>;
  }

  if (productsQuery.isError) {
    return <div style={styles.errorBox}>{ui("Failed to load products:")} {(productsQuery.error as Error).message || ui('Unknown error')}</div>;
  }

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>{ui("Product")}</th>
            <th style={styles.th}>{ui("Category / Unit")}</th>
            <th style={styles.th}>{ui("Supplier")}</th>
            <th style={styles.th}>{ui("Stock")}</th>
            <th style={styles.th}>{ui("Default Barcode")}</th>
            <th style={styles.th}>{ui("Cost")}</th>
            <th style={styles.th}>{ui("Est. Value")}</th>
            <th style={styles.th}>{ui("Actions")}</th>
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
                    <div style={styles.rowSubtle}>{ui("SKU:")} {product.sku || '-'}</div>
                    {product.requires_lot_tracking || product.requires_expiry_date ? (
                      <div style={styles.rowBadgeGroup}>
                        {product.requires_lot_tracking ? <span style={styles.miniBadge}>{ui("Lot / batch")}</span> : null}
                        {product.requires_expiry_date ? <span style={styles.miniBadge}>{ui("Expiry")}</span> : null}
                      </div>
                    ) : null}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.rowTitle}>{product.category || ui('Uncategorized')}</div>
                    <div style={styles.rowSubtle}>{product.unit}</div>
                  </td>
                  <td style={styles.td}>{canViewSuppliers ? (product.supplier_name || ui('Not linked')) : ui('Unavailable')}</td>
                  <td style={styles.td}>
                    <div style={belowMinimum ? styles.rowTitleWarn : styles.rowTitle}>
                      {String(product.current_stock_quantity ?? 0)} {product.unit}
                    </div>
                    <div style={styles.rowSubtle}>{ui("Minimum:")} {String(product.min_stock ?? 0)}</div>
                    {belowMinimum ? <span style={styles.miniBadgeWarn}>{ui("Below minimum")}</span> : null}
                  </td>
                  <td style={styles.td}>
                    {product.barcode ? <span style={styles.barcodeValue}>{product.barcode}</span> : <span style={styles.rowSubtle}>{ui("No default barcode")}</span>}
                  </td>
                  <td style={styles.td}>
                    {product.effective_unit_cost !== null && product.effective_unit_cost !== undefined ? (
                      <div>
                        <div style={styles.rowTitle}>{formatMoney(product.effective_unit_cost, locale)}</div>
                        <div style={styles.rowSubtle}>{formatCostBasis(product.effective_cost_source, ui)}</div>
                        <div style={styles.rowSubtle}>{ui("Variance:")} {ui(formatCostVarianceStatus(product.cost_variance_status))}</div>
                        {product.cost_variance_amount !== null && product.cost_variance_amount !== undefined ? (
                          <div style={styles.rowSubtle}>
                            Δ {formatMoney(product.cost_variance_amount, locale)} ({formatPercent(product.cost_variance_percent, locale)})
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span style={styles.rowSubtle}>{ui("No cost configured")}</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <div style={styles.rowTitle}>{formatMoney(product.estimated_inventory_value, locale)}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionGroup}>
                      <button type="button" style={styles.secondaryButton} onClick={() => onOpenCostHistory(product)}>
                        {ui("Cost history")}
                      </button>

                      <button
                        type="button"
                        style={!canViewProductPackages ? styles.disabledButton : styles.secondaryButton}
                        onClick={() => onOpenPackages(product)}
                        disabled={!canViewProductPackages}
                        title={!canViewProductPackages ? ui('Product package read permission required') : undefined}
                      >
                        {ui("Packages")}
                      </button>

                      <button
                        type="button"
                        style={!canManageProducts ? styles.disabledButton : styles.secondaryButton}
                        onClick={() => onStartEdit(product)}
                        disabled={!canManageProducts}
                        title={!canManageProducts ? ui('Products write permission required') : undefined}
                      >
                        {ui("Edit")}
                      </button>

                      <button
                        type="button"
                        style={!canManageProducts ? styles.disabledButton : styles.dangerButton}
                        onClick={() => onDelete(product)}
                        disabled={deleteProductPending || !canManageProducts}
                        title={!canManageProducts ? ui('Products write permission required') : undefined}
                      >
                        {ui("Archive")}
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
