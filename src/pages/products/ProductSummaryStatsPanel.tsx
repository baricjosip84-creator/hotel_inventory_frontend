import { formatMoney } from './productFormatting';
import { styles } from './productStyles';
import { OperationalWorkspaceStatCard } from '../../components/ui/OperationalWorkspace';
import type { ProductSummary } from './productDerivedState';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type ProductSummaryStatsPanelProps = {
  summary: ProductSummary;
  productsQuery: {
    isLoading: boolean;
    isError: boolean;
  };
  canViewSuppliers: boolean;
  canViewStock: boolean;
};

export function ProductSummaryStatsPanel({ summary, productsQuery, canViewSuppliers, canViewStock }: ProductSummaryStatsPanelProps) {
  const { ui, locale } = useAppTranslation();

  if (productsQuery.isLoading) {
    return <div style={styles.warningBox}>{ui('Loading product summary...')}</div>;
  }

  if (productsQuery.isError) {
    return <div style={styles.errorBox}>{ui('Product summary unavailable because products could not be loaded.')}</div>;
  }

  return (
    <div className="io-workspace-stats" style={styles.statsGrid}>
      <OperationalWorkspaceStatCard
        label={ui("Products")}
        value={formatLocalizedNumber(Number(summary.total), locale)}
        helper={ui("Visible product records")}
      />
      <OperationalWorkspaceStatCard
        label={ui("Supplier Linked")}
        value={canViewSuppliers ? formatLocalizedNumber(Number(summary.linkedSupplierCount), locale) : ui('Unavailable')}
        helper={canViewSuppliers ? ui("Products already linked to suppliers") : ui('Supplier link assessment unavailable for this role')}
        tone={canViewSuppliers ? 'good' : undefined}
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
        value={canViewStock ? formatMoney(summary.estimatedInventoryValue, locale) : ui('Unavailable')}
        helper={canViewStock ? ui("Estimated from received cost, then standard fallback") : ui('Stock read permission is required to view current inventory value.')}
      />
    </div>
  );
}
