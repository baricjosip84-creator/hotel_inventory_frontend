import type { CostingReadiness } from './productDerivedState';
import { formatMoney } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type ProductCostingReadinessPanelProps = {
  costingReadiness: CostingReadiness;
  productsQuery: { isLoading: boolean; isError: boolean };
  onCategoryFilterChange: (category: string) => void;
};

export function ProductCostingReadinessPanel({
  costingReadiness,
  productsQuery,
  onCategoryFilterChange
}: ProductCostingReadinessPanelProps) {
  const { ui, locale } = useAppTranslation();

  if (productsQuery.isLoading) {
    return <section style={styles.panel}><div style={styles.warningBox}>{ui('Loading costing readiness...')}</div></section>;
  }

  if (productsQuery.isError) {
    return <section style={styles.panel}><div style={styles.errorBox}>{ui('Costing readiness unavailable because products could not be loaded.')}</div></section>;
  }

  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Costing Readiness")}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Highlights which stocked products already have cost audit coverage and where estimated inventory value is incomplete.")}
          </p>
        </div>
      </div>

      <div style={styles.costReadinessGrid}>
        <StatCard
          title={ui("Stocked Products")}
          value={costingReadiness.stockedProductCount}
          subtitle={ui("Products with current stock above zero")}
        />
        <StatCard
          title={ui("Costed Stocked")}
          value={costingReadiness.costedStockedProductCount}
          subtitle={`${ui('Effective cost coverage;')} ${formatLocalizedNumber(Number(costingReadiness.standardFallbackStockedProductCount), locale)} ${ui('use standard fallback')}`}
          tone={costingReadiness.uncostedStockedProductCount === 0 ? 'good' : 'default'}
        />
        <StatCard
          title={ui("Uncosted Stocked")}
          value={costingReadiness.uncostedStockedProductCount}
          subtitle={ui("Stocked products missing received and standard cost")}
          tone={costingReadiness.uncostedStockedProductCount > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title={ui("Uncosted Stock Qty")}
          value={formatLocalizedNumber(Number(costingReadiness.uncostedStockQuantity), locale)}
          subtitle={ui("Quantity excluded from estimated value")}
          tone={costingReadiness.uncostedStockQuantity > 0 ? 'warn' : 'good'}
        />
      </div>

      <div style={styles.tableWrapperCompact}>
        <table style={styles.compactTable}>
          <thead>
            <tr>
              <th style={styles.th}>{ui("Category")}</th>
              <th style={styles.th}>{ui("Products")}</th>
              <th style={styles.th}>{ui("Costed")}</th>
              <th style={styles.th}>{ui("Uncosted Stocked")}</th>
              <th style={styles.th}>{ui("Stock Qty")}</th>
              <th style={styles.th}>{ui("Estimated Value")}</th>
              <th style={styles.th}>{ui("Action")}</th>
            </tr>
          </thead>
          <tbody>
            {costingReadiness.categoryBreakdown.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan={7}>{ui("No product categories found.")}</td>
              </tr>
            ) : (
              costingReadiness.categoryBreakdown.slice(0, 8).map((row) => (
                <tr key={row.category}>
                  <td style={styles.td}>{row.category}</td>
                  <td style={styles.td}>{row.productCount}</td>
                  <td style={styles.td}>{row.costedCount}</td>
                  <td style={styles.td}>{row.uncostedStockedCount}</td>
                  <td style={styles.td}>{formatLocalizedNumber(Number(row.stockQuantity), locale)}</td>
                  <td style={styles.td}>{formatMoney(row.estimatedValue, locale)}</td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => onCategoryFilterChange(row.category === 'Uncategorized' ? '' : row.category)}
                    >
                      {ui("View Category")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
