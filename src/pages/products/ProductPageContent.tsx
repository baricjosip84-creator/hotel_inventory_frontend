import type { useProductPageViewModel } from './useProductPageViewModel';
import { ProductCostAnalyticsSectionsPanel } from './ProductCostAnalyticsSectionsPanel';
import { ProductSummaryStatsPanel } from './ProductSummaryStatsPanel';
import { ProductManagementSectionsPanel } from './ProductManagementSectionsPanel';

type ProductPageContentProps = ReturnType<typeof useProductPageViewModel>;

export function ProductPageContent(props: ProductPageContentProps) {
  return (
    <div>
      <ProductSummaryStatsPanel summary={props.summary} />
      <ProductCostAnalyticsSectionsPanel {...props} />
      <ProductManagementSectionsPanel {...props} />
    </div>
  );
}