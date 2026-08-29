import type { ProductCostActionCoverageSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatMoney, formatNumber, formatPercent, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';

type CostActionCoverageQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionCoveragePanelProps = {
  costActionCoverageQuery: CostActionCoverageQueryState;
  costActionCoverageSummary?: ProductCostActionCoverageSummaryResponse;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostActionCoveragePanel({
  costActionCoverageQuery,
  costActionCoverageSummary,
  onOpenCostHistory
}: ProductCostActionCoveragePanelProps) {
  const { ui, locale } = useAppTranslation();
  return (
      <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>{ui("Cost Action Coverage")}</h3>
            <p style={styles.panelSubtitle}>
              {ui("Coverage view for stocked products with usable cost basis, showing where action gaps remain before valuation decisions.")}
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionCoverageQuery.refetch()}
          >
            {ui("Refresh Coverage")}
          </button>
        </div>

        {costActionCoverageQuery.isLoading ? (
          <div style={styles.emptyCell}>{ui("Loading cost action coverage...")}</div>
        ) : costActionCoverageQuery.isError ? (
          <div style={styles.errorBox}>{ui("Unable to load cost action coverage.")}</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title={ui("Stocked Coverage")}
                value={formatPercent(costActionCoverageSummary?.totals.stocked_cost_coverage_percent, locale)}
                subtitle={ui("Stocked products with cost basis")}
                tone={toNumber(costActionCoverageSummary?.totals.stocked_cost_coverage_percent) >= 95 ? 'good' : 'warn'}
              />
              <StatCard
                title={ui("Uncosted Stocked")}
                value={toNumber(costActionCoverageSummary?.totals.uncosted_stocked_products)}
                subtitle={ui("Stocked products with no cost basis")}
                tone={toNumber(costActionCoverageSummary?.totals.uncosted_stocked_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title={ui("Action Rate")}
                value={formatPercent(costActionCoverageSummary?.totals.action_rate_percent, locale)}
                subtitle={ui("Products needing cost action")}
                tone={toNumber(costActionCoverageSummary?.totals.action_rate_percent) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title={ui("Action Value")}
                value={formatMoney(costActionCoverageSummary?.totals.actionable_estimated_value, locale)}
                subtitle={ui("Estimated value under action")}
                tone={toNumber(costActionCoverageSummary?.totals.actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>{ui("Category coverage")}</h4>
                {(costActionCoverageSummary?.category_coverage ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>{ui("No category coverage gaps found.")}</div>
                ) : (
                  (costActionCoverageSummary?.category_coverage ?? []).map((row) => (
                    <div key={row.category} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.category}</div>
                        <div style={styles.rowSubtle}>
                          {formatNumber(row.stocked_cost_coverage_percent, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{ui("% stocked coverage •")} {toNumber(row.uncosted_stocked_products)} {ui("uncosted stocked")}
                        </div>
                        <div style={styles.rowSubtle}>{formatMoney(row.actionable_estimated_value, locale)} {ui("actionable value")}</div>
                      </div>
                      <strong>{toNumber(row.actionable_products)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>{ui("Coverage gaps")}</h4>
                {(costActionCoverageSummary?.coverage_gaps ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>{ui("No coverage gaps found.")}</div>
                ) : (
                  (costActionCoverageSummary?.coverage_gaps ?? []).map((row) => (
                    <div key={`${row.id}-${row.action_type || 'coverage'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{row.category || ui('Uncategorized')} • {ui(formatActionType(row.action_type))}</div>
                      </div>
                      <button type="button" style={styles.secondaryButton} onClick={() => onOpenCostHistory(row)}>
                        {ui("History")}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </section>
  );
}
