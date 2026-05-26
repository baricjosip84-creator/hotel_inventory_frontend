import type { ProductItem } from '../../types/inventory';
import { toNumber } from './productFormatting';

export type ProductSummary = {
  total: number;
  linkedSupplierCount: number;
  thresholdConfiguredCount: number;
  categorizedCount: number;
  barcodeCount: number;
  productsWithCostCount: number;
  productsWithReceivedCostCount: number;
  productsWithStandardFallbackCount: number;
  estimatedInventoryValue: number;
};

export type CostingReadinessCategory = {
  category: string;
  productCount: number;
  costedCount: number;
  uncostedStockedCount: number;
  stockQuantity: number;
  estimatedValue: number;
};

export type CostingReadiness = {
  stockedProductCount: number;
  costedStockedProductCount: number;
  uncostedStockedProductCount: number;
  costedStockQuantity: number;
  standardFallbackStockedProductCount: number;
  uncostedStockQuantity: number;
  categoryBreakdown: CostingReadinessCategory[];
};

export function buildCategoryOptions(products: ProductItem[]): string[] {
  return Array.from(
    new Set(
      products
        .map((product) => (product.category || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
}

export function buildProductSummary(products: ProductItem[]): ProductSummary {
  const linkedSupplierCount = products.filter((product) => Boolean(product.supplier_id)).length;
  const thresholdConfiguredCount = products.filter((product) => toNumber(product.min_stock) > 0).length;
  const categorizedCount = products.filter((product) => Boolean(product.category && product.category.trim())).length;
  const barcodeCount = products.filter((product) => Boolean(product.barcode && product.barcode.trim())).length;
  const productsWithCostCount = products.filter((product) => product.effective_unit_cost !== null && product.effective_unit_cost !== undefined).length;
  const productsWithReceivedCostCount = products.filter((product) => product.latest_unit_cost !== null && product.latest_unit_cost !== undefined).length;
  const productsWithStandardFallbackCount = products.filter((product) =>
    (product.latest_unit_cost === null || product.latest_unit_cost === undefined) &&
    product.standard_unit_cost !== null &&
    product.standard_unit_cost !== undefined
  ).length;
  const estimatedInventoryValue = products.reduce(
    (sum, product) => sum + toNumber(product.estimated_inventory_value),
    0
  );

  return {
    total: products.length,
    linkedSupplierCount,
    thresholdConfiguredCount,
    categorizedCount,
    barcodeCount,
    productsWithCostCount,
    productsWithReceivedCostCount,
    productsWithStandardFallbackCount,
    estimatedInventoryValue
  };
}

export function buildCostingReadiness(products: ProductItem[]): CostingReadiness {
  const stockedProducts = products.filter((product) => toNumber(product.current_stock_quantity) > 0);
  const costedStockedProducts = stockedProducts.filter(
    (product) => product.effective_unit_cost !== null && product.effective_unit_cost !== undefined
  );
  const standardFallbackStockedProducts = stockedProducts.filter((product) =>
    (product.latest_unit_cost === null || product.latest_unit_cost === undefined) &&
    product.standard_unit_cost !== null &&
    product.standard_unit_cost !== undefined
  );
  const uncostedStockedProducts = stockedProducts.filter(
    (product) => product.effective_unit_cost === null || product.effective_unit_cost === undefined
  );
  const uncostedStockQuantity = uncostedStockedProducts.reduce(
    (sum, product) => sum + toNumber(product.current_stock_quantity),
    0
  );
  const costedStockQuantity = costedStockedProducts.reduce(
    (sum, product) => sum + toNumber(product.current_stock_quantity),
    0
  );

  const categoryMap = new Map<string, CostingReadinessCategory>();

  products.forEach((product) => {
    const category = (product.category || 'Uncategorized').trim() || 'Uncategorized';
    const current = categoryMap.get(category) || {
      category,
      productCount: 0,
      costedCount: 0,
      uncostedStockedCount: 0,
      stockQuantity: 0,
      estimatedValue: 0
    };

    current.productCount += 1;
    current.stockQuantity += toNumber(product.current_stock_quantity);
    current.estimatedValue += toNumber(product.estimated_inventory_value);

    if (product.effective_unit_cost !== null && product.effective_unit_cost !== undefined) {
      current.costedCount += 1;
    } else if (toNumber(product.current_stock_quantity) > 0) {
      current.uncostedStockedCount += 1;
    }

    categoryMap.set(category, current);
  });

  const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => {
    if (b.estimatedValue !== a.estimatedValue) return b.estimatedValue - a.estimatedValue;
    return a.category.localeCompare(b.category);
  });

  return {
    stockedProductCount: stockedProducts.length,
    costedStockedProductCount: costedStockedProducts.length,
    uncostedStockedProductCount: uncostedStockedProducts.length,
    costedStockQuantity,
    standardFallbackStockedProductCount: standardFallbackStockedProducts.length,
    uncostedStockQuantity,
    categoryBreakdown
  };
}
