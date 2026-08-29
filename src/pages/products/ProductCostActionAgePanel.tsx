import type { ProductCostActionAgeSummaryResponse, ProductCostRiskItem } from '../../types/inventory';
import { formatActionType, formatCostAgeBand, formatMoney, toNumber } from './productFormatting';
import { styles } from './productStyles';
import { StatCard } from './productSummaryComponents';
import { useAppTranslation } from '../../i18n/I18nContext';
import { formatLocalizedNumber } from '../../i18n/formatters';

type CostActionAgeQueryState = {
  isLoading: boolean;
  isError: boolean;
  refetch: () => unknown;
};

type ProductCostActionAgePanelProps = {
  costActionAgeQuery: CostActionAgeQueryState;
  costActionAgeSummary?: ProductCostActionAgeSummaryResponse;
  onOpenCostHistory: (product: ProductCostRiskItem) => void;
};

export function ProductCostActionAgePanel({
  costActionAgeQuery,
  costActionAgeSummary,
  onOpenCostHistory
}: ProductCostActionAgePanelProps) {
  const { ui, locale } = useAppTranslation();
  return (
    <section style={styles.panel}>
        <div style={styles.packageHeader}>
          <div>
            <h3 style={styles.panelTitle}>{ui("Cost Action Age")}</h3>
            <p style={styles.panelSubtitle}>
              {ui("Freshness view of actionable cost evidence, highlighting missing dates, standard-only fallback, and stale received costs.")}
            </p>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => costActionAgeQuery.refetch()}
          >
            {ui("Refresh Age")}
          </button>
        </div>

        {costActionAgeQuery.isLoading ? (
          <div style={styles.emptyCell}>{ui("Loading cost action age...")}</div>
        ) : costActionAgeQuery.isError ? (
          <div style={styles.errorBox}>{ui("Unable to load cost action age.")}</div>
        ) : (
          <>
            <div style={styles.costReadinessGrid}>
              <StatCard
                title={ui("No Cost Date")}
                value={toNumber(costActionAgeSummary?.totals.no_cost_date_products)}
                subtitle={ui("Actions without cost evidence")}
                tone={toNumber(costActionAgeSummary?.totals.no_cost_date_products) > 0 ? 'bad' : 'good'}
              />
              <StatCard
                title={ui("Standard Only")}
                value={toNumber(costActionAgeSummary?.totals.standard_fallback_only_products)}
                subtitle={ui("Using standard cost fallback")}
                tone={toNumber(costActionAgeSummary?.totals.standard_fallback_only_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title={ui("Stale Received")}
                value={toNumber(costActionAgeSummary?.totals.stale_received_cost_products)}
                subtitle={`${ui('Older than')} ${toNumber(costActionAgeSummary?.thresholds.stale_cost_days || 90)} ${ui('days')}`}
                tone={toNumber(costActionAgeSummary?.totals.stale_received_cost_products) > 0 ? 'warn' : 'good'}
              />
              <StatCard
                title={ui("Age Value")}
                value={formatMoney(costActionAgeSummary?.totals.total_actionable_estimated_value, locale)}
                subtitle={ui("Estimated value under age review")}
                tone={toNumber(costActionAgeSummary?.totals.total_actionable_estimated_value) > 0 ? 'warn' : 'good'}
              />
            </div>

            <div style={styles.riskGrid}>
              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>{ui("Age breakdown")}</h4>
                {(costActionAgeSummary?.age_bands ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>{ui("No cost action age bands found.")}</div>
                ) : (
                  (costActionAgeSummary?.age_bands ?? []).map((row) => (
                    <div key={row.cost_age_band} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{ui(formatCostAgeBand(row.cost_age_band))}</div>
                        <div style={styles.rowSubtle}>{row.recommended_age_action}</div>
                        <div style={styles.rowSubtle}>
                          {formatLocalizedNumber(Number(toNumber(row.stock_quantity)), locale)} {ui("units •")} {formatMoney(row.estimated_inventory_value, locale)} {ui("• max age")} {row.max_latest_cost_age_days ?? '-'} {ui("days")}
                        </div>
                      </div>
                      <strong>{toNumber(row.product_count)}</strong>
                    </div>
                  ))
                )}
              </div>

              <div style={styles.riskListCard}>
                <h4 style={styles.sectionTitle}>{ui("Age priority products")}</h4>
                {(costActionAgeSummary?.age_priority_products ?? []).length === 0 ? (
                  <div style={styles.rowSubtle}>{ui("No age priority products found.")}</div>
                ) : (
                  (costActionAgeSummary?.age_priority_products ?? []).map((row) => (
                    <div key={`${row.id}-${row.cost_age_band || 'age'}`} style={styles.riskListItem}>
                      <div>
                        <div style={styles.rowTitle}>{row.name}</div>
                        <div style={styles.rowSubtle}>{ui(formatCostAgeBand(row.cost_age_band))} • {ui(formatActionType(row.action_type))}</div>
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
