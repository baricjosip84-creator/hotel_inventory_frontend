import { formatMoney } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import type { ProductSummary } from './productDerivedState';

type ProductSummaryStatsPanelProps = {
  summary: ProductSummary;
};

export function ProductSummaryStatsPanel({ summary }: ProductSummaryStatsPanelProps) {
  return (
    <div style={styles.statsGrid}>
      <StatCard
        title="Products"
        value={summary.total}
        subtitle="Visible product records"
      />
      <StatCard
        title="Supplier Linked"
        value={summary.linkedSupplierCount}
        subtitle="Products already linked to suppliers"
        tone="good"
      />
      <StatCard
        title="Min Stock Set"
        value={summary.thresholdConfiguredCount}
        subtitle="Products with a configured reorder threshold"
      />
      <StatCard
        title="Barcoded"
        value={summary.barcodeCount}
        subtitle="Products with a default barcode package"
        tone="good"
      />
      <StatCard
        title="Costed"
        value={summary.productsWithCostCount}
        subtitle={`Effective cost: ${summary.productsWithReceivedCostCount} received, ${summary.productsWithStandardFallbackCount} standard`}
        tone={summary.productsWithCostCount > 0 ? 'good' : 'warn'}
      />
      <StatCard
        title="Inventory Value"
        value={formatMoney(summary.estimatedInventoryValue)}
        subtitle="Estimated from received cost, then standard fallback"
      />
    </div>
  );
}
