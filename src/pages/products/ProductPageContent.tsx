import type { useProductPageViewModel } from './useProductPageViewModel';
import { ProductCostAnalyticsSectionsPanel } from './ProductCostAnalyticsSectionsPanel';
import { ProductSummaryStatsPanel } from './ProductSummaryStatsPanel';
import { ProductManagementSectionsPanel } from './ProductManagementSectionsPanel';

type ProductPageContentProps = ReturnType<typeof useProductPageViewModel>;

export function ProductPageContent(props: ProductPageContentProps) {
  return (
    <div className="io-operational-page io-products-page">
      <ProductSummaryStatsPanel summary={props.summary} />
      <ProductManagementSectionsPanel {...props} />
      <ProductCostAnalyticsSectionsPanel {...props} />
    </div>
  );
}
