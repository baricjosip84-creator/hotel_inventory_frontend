import { formatMoney } from './productFormatting';
import { styles } from './productStyles';
import { OperationalWorkspaceStatCard } from '../../components/ui/OperationalWorkspace';
import type { ProductSummary } from './productDerivedState';

type ProductSummaryStatsPanelProps = {
  summary: ProductSummary;
};

export function ProductSummaryStatsPanel({ summary }: ProductSummaryStatsPanelProps) {
  return (
    <div className="io-workspace-stats" style={styles.statsGrid}>
      <OperationalWorkspaceStatCard
        label="Products"
        value={summary.total}
        helper="Visible product records"
      />
      <OperationalWorkspaceStatCard
        label="Supplier Linked"
        value={summary.linkedSupplierCount}
        helper="Products already linked to suppliers"
        tone="good"
      />
      <OperationalWorkspaceStatCard
        label="Min Stock Set"
        value={summary.thresholdConfiguredCount}
        helper="Products with a configured reorder threshold"
      />
      <OperationalWorkspaceStatCard
        label="Barcoded"
        value={summary.barcodeCount}
        helper="Products with a default barcode package"
        tone="good"
      />
      <OperationalWorkspaceStatCard
        label="Costed"
        value={summary.productsWithCostCount}
        helper={`Effective cost: ${summary.productsWithReceivedCostCount} received, ${summary.productsWithStandardFallbackCount} standard`}
        tone={summary.productsWithCostCount > 0 ? 'good' : 'warn'}
      />
      <OperationalWorkspaceStatCard
        label="Inventory Value"
        value={formatMoney(summary.estimatedInventoryValue)}
        helper="Estimated from received cost, then standard fallback"
      />
    </div>
  );
}
