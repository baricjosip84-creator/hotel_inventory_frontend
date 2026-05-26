import { ProductCostAnalyticsSectionsPanel } from './ProductCostAnalyticsSectionsPanel';
import { ProductSummaryStatsPanel } from './ProductSummaryStatsPanel';
import { ProductManagementSectionsPanel } from './ProductManagementSectionsPanel';

type ProductPageContentProps = Record<string, any>;

export function ProductPageContent(props: ProductPageContentProps) {
  return (
    <div>
      <ProductSummaryStatsPanel summary={props.summary} />
      <ProductCostAnalyticsSectionsPanel {...props} />
      <ProductManagementSectionsPanel {...props} />
    </div>
  );
}
