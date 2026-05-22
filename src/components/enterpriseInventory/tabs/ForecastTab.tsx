import { useMemo } from 'react';
import { DataTable, MetricCard, styles } from '../EnterpriseInventoryShared';
import { formatNumber, toNumber } from '../EnterpriseInventoryFormat';
import type { DemandForecastRow } from '../EnterpriseInventoryTypes';

type ForecastTabProps = {
  demandForecastRows: DemandForecastRow[];
  isLoading: boolean;
};

export function ForecastTab({ demandForecastRows, isLoading }: ForecastTabProps) {
  const forecastSummary = useMemo(() => {
    const sorted = [...demandForecastRows].sort((left, right) => toNumber(right.avg_daily_usage) - toNumber(left.avg_daily_usage));
    const totalAverageDailyUsage = sorted.reduce((total, item) => total + toNumber(item.avg_daily_usage), 0);

    return {
      rowCount: sorted.length,
      totalAverageDailyUsage,
      highestUsageProduct: sorted[0]?.product_name || sorted[0]?.product_id || '-'
    };
  }, [demandForecastRows]);

  return (
    <section style={styles.stack}>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Demand forecast</h2>
        <p style={styles.helper}>Reads the existing GET /forecast endpoint. Backend calculates 30-day average daily outbound usage from stock movements.</p>
        <div style={styles.statGrid}>
          <MetricCard label="Forecast rows" value={forecastSummary.rowCount} />
          <MetricCard label="Total avg daily usage" value={formatNumber(forecastSummary.totalAverageDailyUsage)} />
          <MetricCard label="Highest usage product" value={forecastSummary.highestUsageProduct} />
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Usage-based forecast rows</h2>
        <DataTable
          loading={isLoading}
          empty="No demand forecast rows returned."
          headers={['Product', 'Average daily usage']}
          rows={demandForecastRows
            .slice()
            .sort((left, right) => toNumber(right.avg_daily_usage) - toNumber(left.avg_daily_usage))
            .map((item) => [
              item.product_name || item.product_id,
              formatNumber(item.avg_daily_usage)
            ])}
        />
      </section>
    </section>
  );
}
