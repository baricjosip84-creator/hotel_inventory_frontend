import type { CostingReadiness } from './productDerivedState';
import { formatMoney } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';

type ProductCostingReadinessPanelProps = {
  costingReadiness: CostingReadiness;
  onCategoryFilterChange: (category: string) => void;
};

export function ProductCostingReadinessPanel({
  costingReadiness,
  onCategoryFilterChange
}: ProductCostingReadinessPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Costing Readiness</h3>
          <p style={styles.panelSubtitle}>
            Highlights which stocked products already have cost audit coverage and where estimated inventory value is incomplete.
          </p>
        </div>
      </div>

      <div style={styles.costReadinessGrid}>
        <StatCard
          title="Stocked Products"
          value={costingReadiness.stockedProductCount}
          subtitle="Products with current stock above zero"
        />
        <StatCard
          title="Costed Stocked"
          value={costingReadiness.costedStockedProductCount}
          subtitle={`Effective cost coverage; ${costingReadiness.standardFallbackStockedProductCount} use standard fallback`}
          tone={costingReadiness.uncostedStockedProductCount === 0 ? 'good' : 'default'}
        />
        <StatCard
          title="Uncosted Stocked"
          value={costingReadiness.uncostedStockedProductCount}
          subtitle="Stocked products missing received and standard cost"
          tone={costingReadiness.uncostedStockedProductCount > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title="Uncosted Stock Qty"
          value={costingReadiness.uncostedStockQuantity.toLocaleString()}
          subtitle="Quantity excluded from estimated value"
          tone={costingReadiness.uncostedStockQuantity > 0 ? 'warn' : 'good'}
        />
      </div>

      <div style={styles.tableWrapperCompact}>
        <table style={styles.compactTable}>
          <thead>
            <tr>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Products</th>
              <th style={styles.th}>Costed</th>
              <th style={styles.th}>Uncosted Stocked</th>
              <th style={styles.th}>Stock Qty</th>
              <th style={styles.th}>Estimated Value</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {costingReadiness.categoryBreakdown.length === 0 ? (
              <tr>
                <td style={styles.emptyCell} colSpan={7}>No product categories found.</td>
              </tr>
            ) : (
              costingReadiness.categoryBreakdown.slice(0, 8).map((row) => (
                <tr key={row.category}>
                  <td style={styles.td}>{row.category}</td>
                  <td style={styles.td}>{row.productCount}</td>
                  <td style={styles.td}>{row.costedCount}</td>
                  <td style={styles.td}>{row.uncostedStockedCount}</td>
                  <td style={styles.td}>{row.stockQuantity.toLocaleString()}</td>
                  <td style={styles.td}>{formatMoney(row.estimatedValue)}</td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => onCategoryFilterChange(row.category === 'Uncategorized' ? '' : row.category)}
                    >
                      View Category
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
