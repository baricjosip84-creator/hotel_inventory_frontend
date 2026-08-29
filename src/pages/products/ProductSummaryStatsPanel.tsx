import { formatMoney } from './productFormatting';
import { styles } from './productStyles';
import { OperationalWorkspaceStatCard } from '../../components/ui/OperationalWorkspace';
import type { ProductSummary } from './productDerivedState';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type ProductSummaryStatsPanelProps = {
  summary: ProductSummary;
};

export function ProductSummaryStatsPanel({ summary }: ProductSummaryStatsPanelProps) {
  const { ui, locale } = useAppTranslation();
  return (
    <div className="io-workspace-stats" style={styles.statsGrid}>
      <OperationalWorkspaceStatCard
        label={ui("Products")}
        value={formatLocalizedNumber(Number(summary.total), locale)}
        helper={ui("Visible product records")}
      />
      <OperationalWorkspaceStatCard
        label={ui("Supplier Linked")}
        value={formatLocalizedNumber(Number(summary.linkedSupplierCount), locale)}
        helper={ui("Products already linked to suppliers")}
        tone="good"
      />
      <OperationalWorkspaceStatCard
        label={ui("Min Stock Set")}
        value={formatLocalizedNumber(Number(summary.thresholdConfiguredCount), locale)}
        helper={ui("Products with a configured reorder threshold")}
      />
      <OperationalWorkspaceStatCard
        label={ui("Barcoded")}
        value={formatLocalizedNumber(Number(summary.barcodeCount), locale)}
        helper={ui("Products with a default barcode package")}
        tone="good"
      />
      <OperationalWorkspaceStatCard
        label={ui("Costed")}
        value={formatLocalizedNumber(Number(summary.productsWithCostCount), locale)}
        helper={`${ui('Effective cost:')} ${formatLocalizedNumber(Number(summary.productsWithReceivedCostCount), locale)} ${ui('received,')} ${formatLocalizedNumber(Number(summary.productsWithStandardFallbackCount), locale)} ${ui('standard')}`}
        tone={summary.productsWithCostCount > 0 ? 'good' : 'warn'}
      />
      <OperationalWorkspaceStatCard
        label={ui("Inventory Value")}
        value={formatMoney(summary.estimatedInventoryValue, locale)}
        helper={ui("Estimated from received cost, then standard fallback")}
      />
    </div>
  );
}
