import { useMemo } from 'react';
import { DataTable, MetricCard, styles } from '../EnterpriseInventoryShared';
import { formatNumber, toNumber } from '../EnterpriseInventoryFormat';
import type { DemandForecastRow, ForecastAccuracyBacktestResponse, ForecastCalibrationReviewResponse, ForecastDataQualityReviewResponse, ForecastReliabilityMatrixResponse } from '../EnterpriseInventoryTypes';

type ForecastTabProps = {
  demandForecastRows: DemandForecastRow[];
  forecastDataQualityReview?: ForecastDataQualityReviewResponse;
  forecastAccuracyBacktest?: ForecastAccuracyBacktestResponse;
  forecastCalibrationReview?: ForecastCalibrationReviewResponse;
  forecastReliabilityMatrix?: ForecastReliabilityMatrixResponse;
  isLoading: boolean;
  dataQualityLoading?: boolean;
  accuracyLoading?: boolean;
  calibrationLoading?: boolean;
  reliabilityLoading?: boolean;
};

function formatAccuracyPercent(value?: number | string | null): string {
  if (value === null || value === undefined || value === '') {
    return 'Not scored';
  }

  return `${formatNumber(value)}%`;
}

export function ForecastTab({ demandForecastRows, forecastDataQualityReview, forecastAccuracyBacktest, forecastCalibrationReview, forecastReliabilityMatrix, isLoading, dataQualityLoading = false, accuracyLoading = false, calibrationLoading = false, reliabilityLoading = false }: ForecastTabProps) {
  const forecastSummary = useMemo(() => {
    const sorted = [...demandForecastRows].sort((left, right) => toNumber(right.avg_daily_usage) - toNumber(left.avg_daily_usage));
    const totalAverageDailyUsage = sorted.reduce((total, item) => total + toNumber(item.avg_daily_usage), 0);

    return {
      rowCount: sorted.length,
      totalAverageDailyUsage,
      highestUsageProduct: sorted[0]?.product_name || sorted[0]?.product_id || '-'
    };
  }, [demandForecastRows]);

  const dataQualityRows = forecastDataQualityReview?.rows ?? [];
  const dataQualitySummary = forecastDataQualityReview?.summary;
  const backtestRows = forecastAccuracyBacktest?.rows ?? [];
  const backtestSummary = forecastAccuracyBacktest?.summary;
  const calibrationRows = forecastCalibrationReview?.rows ?? [];
  const calibrationSummary = forecastCalibrationReview?.summary;
  const reliabilityRows = forecastReliabilityMatrix?.rows ?? [];
  const reliabilitySummary = forecastReliabilityMatrix?.summary;

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
        <h2 style={styles.cardTitle}>Forecast production reliability matrix</h2>
        <p style={styles.helper}>
          Reads GET /forecast/reliability-matrix. This combines data quality, backtest accuracy, and calibration priority into one read-only production reliability decision per product. It does not promote models, create execution requests, or mutate inventory.
        </p>
        <div style={styles.statGrid}>
          <MetricCard label="Production status" value={String(reliabilitySummary?.production_status || 'unknown').replace(/_/g, ' ')} />
          <MetricCard label="Reliable products" value={formatNumber(reliabilitySummary?.production_reliable_count ?? 0)} />
          <MetricCard label="Review required" value={formatNumber(reliabilitySummary?.review_required_count ?? 0)} />
          <MetricCard label="Blocked" value={formatNumber(reliabilitySummary?.blocked_count ?? 0)} />
          <MetricCard label="Reliability coverage" value={`${formatNumber(reliabilitySummary?.reliability_coverage_percent ?? 0)}%`} />
        </div>
        <DataTable
          loading={reliabilityLoading}
          empty="No forecast reliability matrix rows returned."
          headers={['Priority', 'Product', 'Reliability', 'History', 'Accuracy', 'Calibration', 'Action']}
          rows={reliabilityRows.map((item) => [
            String(item.priority || 'unknown'),
            item.product_name || item.product_id,
            String(item.reliability_status || 'unknown').replace(/_/g, ' '),
            String(item.data_quality_status || 'unknown').replace(/_/g, ' '),
            String(item.accuracy_status || 'unknown').replace(/_/g, ' '),
            String(item.calibration_priority || 'unknown'),
            String(item.recommended_action || 'manual_review').replace(/_/g, ' ')
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Forecast data quality review</h2>
        <p style={styles.helper}>
          Reads GET /forecast/data-quality-review. It checks whether each product has enough outbound movement history for forecast reliance before accuracy scoring is trusted. This is read-only and does not exclude products automatically.
        </p>
        <div style={styles.statGrid}>
          <MetricCard label="Production status" value={String(dataQualitySummary?.production_status || 'unknown').replace(/_/g, ' ')} />
          <MetricCard label="Products checked" value={formatNumber(dataQualitySummary?.product_count ?? 0)} />
          <MetricCard label="Eligible history" value={formatNumber(dataQualitySummary?.eligible_product_count ?? 0)} />
          <MetricCard label="High priority" value={formatNumber(dataQualitySummary?.high_priority_count ?? 0)} />
          <MetricCard label="Thin history" value={formatNumber(dataQualitySummary?.thin_history_count ?? 0)} />
        </div>
        <DataTable
          loading={dataQualityLoading}
          empty="No forecast data quality rows returned."
          headers={['Priority', 'Product', 'History status', 'Training moves', 'Actual moves', 'Recommended action']}
          rows={dataQualityRows.map((item) => [
            String(item.priority || 'unknown'),
            item.product_name || item.product_id,
            String(item.data_quality_status || 'unknown').replace(/_/g, ' '),
            formatNumber(item.training_movement_count),
            formatNumber(item.actual_movement_count),
            String(item.recommended_action || 'manual_review').replace(/_/g, ' ')
          ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Forecast accuracy backtest</h2>
        <p style={styles.helper}>
          Reads GET /forecast/accuracy-backtest. It compares a prior 30-day outbound-usage baseline against the last 30 days of actual outbound usage. This is read-only evidence for production readiness; it does not create orders or change stock.
        </p>
        <div style={styles.statGrid}>
          <MetricCard label="Backtested products" value={formatNumber(backtestSummary?.product_count ?? 0)} />
          <MetricCard label="Scored products" value={formatNumber(backtestSummary?.scored_product_count ?? 0)} />
          <MetricCard label="Strong accuracy" value={formatNumber(backtestSummary?.strong_count ?? 0)} />
          <MetricCard label="High variance" value={formatNumber(backtestSummary?.high_variance_review_required_count ?? 0)} />
          <MetricCard label="Avg absolute % error" value={formatAccuracyPercent(backtestSummary?.average_absolute_percent_error)} />
        </div>
        <DataTable
          loading={accuracyLoading}
          empty="No forecast accuracy backtest rows returned."
          headers={['Product', 'Predicted daily', 'Actual daily', 'Abs. error', 'Abs. % error', 'Accuracy status']}
          rows={backtestRows
            .slice()
            .sort((left, right) => toNumber(right.absolute_percent_error ?? -1) - toNumber(left.absolute_percent_error ?? -1))
            .map((item) => [
              item.product_name || item.product_id,
              formatNumber(item.predicted_daily_usage),
              formatNumber(item.actual_daily_usage),
              formatNumber(item.absolute_error),
              formatAccuracyPercent(item.absolute_percent_error),
              String(item.accuracy_status || 'unknown').replace(/_/g, ' ')
            ])}
        />
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Forecast calibration review</h2>
        <p style={styles.helper}>
          Reads GET /forecast/calibration-review. This converts forecast accuracy evidence into read-only operator priorities. It blocks production reliance when high-priority calibration issues exist, but it does not recalibrate models or mutate inventory.
        </p>
        <div style={styles.statGrid}>
          <MetricCard label="Production status" value={String(calibrationSummary?.production_status || 'unknown').replace(/_/g, ' ')} />
          <MetricCard label="High priority" value={formatNumber(calibrationSummary?.high_priority_count ?? 0)} />
          <MetricCard label="Medium priority" value={formatNumber(calibrationSummary?.medium_priority_count ?? 0)} />
          <MetricCard label="Low priority" value={formatNumber(calibrationSummary?.low_priority_count ?? 0)} />
          <MetricCard label="Operator review" value={calibrationSummary?.requires_operator_review ? 'Required' : 'Not required'} />
        </div>
        <DataTable
          loading={calibrationLoading}
          empty="No forecast calibration review rows returned."
          headers={['Priority', 'Product', 'Accuracy status', 'Recommended action', 'Review note']}
          rows={calibrationRows.map((item) => [
            String(item.priority || 'unknown'),
            item.product_name || item.product_id,
            String(item.accuracy_status || 'unknown').replace(/_/g, ' '),
            String(item.recommended_action || 'manual_review').replace(/_/g, ' '),
            item.review_note || '-'
          ])}
        />
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
