import type { CSSProperties, KeyboardEvent } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiDownloadFile, apiRequest, type ApiDownloadMetadata } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import { fetchTenantSubscriptionAccess, getTenantFeatureEntitlement } from '../lib/tenantSubscriptionAccess';

type ReportTab =
  | 'inventory-valuation'
  | 'stock-by-location'
  | 'product-movements'
  | 'procurement-summary'
  | 'forecast';


const MAX_REPORT_FILTER_LENGTH = 120;
const DOWNLOAD_ERROR_STATUS_ID = 'report-download-error-status';
const DOWNLOAD_SUCCESS_STATUS_ID = 'report-download-success-status';
const REPORT_TAB_LOCK_HINT_ID = 'report-tab-export-lock-hint';
const FORECAST_ACCESS_NOTE_ID = 'forecast-access-note';
const PRODUCT_MOVEMENT_LIMIT_OPTIONS = [25, 50, 100, 200, 500] as const;
const MAX_PRODUCT_MOVEMENT_REPORT_LIMIT = PRODUCT_MOVEMENT_LIMIT_OPTIONS[PRODUCT_MOVEMENT_LIMIT_OPTIONS.length - 1];

const REPORT_TABS: Array<{ key: ReportTab; label: string }> = [
  { key: 'inventory-valuation', label: 'Inventory Valuation' },
  { key: 'stock-by-location', label: 'Stock by Location' },
  { key: 'product-movements', label: 'Product Movements' },
  { key: 'procurement-summary', label: 'Procurement Summary' },
  { key: 'forecast', label: 'Forecast' }
];

const REPORT_LABELS: Record<Exclude<ReportTab, 'forecast'>, string> = {
  'inventory-valuation': 'Inventory valuation report',
  'stock-by-location': 'Stock by location report',
  'product-movements': 'Product movements report',
  'procurement-summary': 'Procurement summary report'
};

function getReportLabel(report: Exclude<ReportTab, 'forecast'>): string {
  return REPORT_LABELS[report] || report;
}

function getReportFilename(report: Exclude<ReportTab, 'forecast'>): string {
  return `${getReportLabel(report).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}.csv`;
}

function getReportTabId(tab: ReportTab): string {
  return `reports-tab-${tab}`;
}

function getReportPanelId(tab: ReportTab): string {
  return `reports-panel-${tab}`;
}

function getCategoryFilterHintId(): string {
  return 'stock-location-category-filter-hint';
}

function getMovementLimitHintId(): string {
  return 'product-movement-limit-hint';
}

function getNormalizedCategoryFilter(value: string): string {
  return value.trim();
}

function getReportFilterHint(value: string): string {
  const remaining = MAX_REPORT_FILTER_LENGTH - value.length;

  if (remaining <= 20) {
    return `${Math.max(remaining, 0)} characters left`;
  }

  return `Optional. Maximum ${MAX_REPORT_FILTER_LENGTH} characters.`;
}

function getExportButtonLabel(
  report: Exclude<ReportTab, 'forecast'>,
  downloadingReport: ReportTab | null
): string {
  if (downloadingReport === report) {
    return 'Exporting...';
  }

  if (downloadingReport !== null) {
    return 'Another export is running';
  }

  return 'Export CSV';
}

function getExportButtonTitle(
  report: Exclude<ReportTab, 'forecast'>,
  downloadingReport: ReportTab | null
): string {
  if (downloadingReport === report) {
    return `${getReportLabel(report)} is being exported.`;
  }

  if (downloadingReport !== null && downloadingReport !== 'forecast') {
    return `Wait for ${getReportLabel(downloadingReport)} to finish exporting.`;
  }

  return `Export ${getReportLabel(report)} as CSV.`;
}

function getExportButtonAriaLabel(
  report: Exclude<ReportTab, 'forecast'>,
  downloadingReport: ReportTab | null
): string {
  if (downloadingReport === report) {
    return `Exporting ${getReportLabel(report)} as CSV.`;
  }

  if (downloadingReport !== null && downloadingReport !== 'forecast') {
    return `CSV export unavailable while ${getReportLabel(downloadingReport)} is exporting.`;
  }

  return `Export ${getReportLabel(report)} as CSV.`;
}

function getClearDownloadStatusAriaLabel(
  downloadInfo: { report: Exclude<ReportTab, 'forecast'>; metadata: ApiDownloadMetadata } | null,
  downloadError: string | null
): string {
  if (downloadError) {
    return 'Clear CSV export error message.';
  }

  if (downloadInfo) {
    return `Clear ${getReportLabel(downloadInfo.report)} export success message.`;
  }

  return 'Clear CSV export message.';
}

type InventoryValuationRow = {
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name: string;
  quantity: number | string;
  estimated_unit_cost: number | string;
  estimated_total_value: number | string;
  updated_at?: string | null;
};

type InventoryValuationReport = {
  totals: {
    row_count: number;
    estimated_inventory_value: number | string;
  };
  rows: InventoryValuationRow[];
};

type StockByLocationRow = {
  storage_location_id: string;
  storage_location_name: string;
  temperature_zone?: string | null;
  stock_row_count: number | string;
  total_quantity: number | string;
};

type ProductMovementRow = {
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  movement_count: number | string;
  total_increase: number | string;
  total_decrease: number | string;
  last_movement_at?: string | null;
};

type ProcurementSummaryReport = {
  shipments: {
    total_shipments: number | string;
    pending_shipments: number | string;
    partial_shipments: number | string;
    received_shipments: number | string;
    overdue_shipments: number | string;
  };
  lines: {
    total_active_shipment_lines: number | string;
    total_ordered_quantity: number | string;
    total_received_quantity: number | string;
    total_discrepancy: number | string;
  };
};

type ForecastRow = {
  product_id: string;
  product_name: string;
  avg_daily_usage: number | string;
};

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatNumber(
  value: number | string | null | undefined,
  maximumFractionDigits = 2
): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits
  }).format(toNumber(value));
}

function formatCurrency(value: number | string | null | undefined): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(toNumber(value));
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
}

function formatLastRefreshed(timestamp: number): string {
  if (!timestamp) {
    return 'Not loaded yet';
  }

  return formatDateTime(new Date(timestamp).toISOString());
}

function RefreshReportButton(props: {
  label: string;
  isRefreshing: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onRefresh: () => void;
}) {
  const disabled = Boolean(props.disabled || props.isRefreshing);
  const title = props.disabledReason || (props.isRefreshing ? `${props.label} is refreshing.` : `Refresh ${props.label}.`);

  return (
    <button
      type="button"
      onClick={props.onRefresh}
      disabled={disabled}
      aria-disabled={disabled}
      aria-busy={props.isRefreshing}
      title={title}
      style={styles.secondaryButton}
    >
      {props.isRefreshing ? 'Refreshing...' : 'Refresh'}
    </button>
  );
}

function LastRefreshedText(props: { timestamp: number }) {
  return (
    <p style={styles.refreshMeta}>
      Last refreshed: {formatLastRefreshed(props.timestamp)}
    </p>
  );
}

function buildQueryString(
  params: Record<string, string | number | null | undefined>
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

async function fetchInventoryValuation(): Promise<InventoryValuationReport> {
  return apiRequest<InventoryValuationReport>('/reports/inventory-valuation');
}

async function fetchStockByLocation(category: string): Promise<StockByLocationRow[]> {
  return apiRequest<StockByLocationRow[]>(
    `/reports/stock-by-location${buildQueryString({ category })}`
  );
}

async function fetchProductMovements(limit: number): Promise<ProductMovementRow[]> {
  return apiRequest<ProductMovementRow[]>(
    `/reports/product-movements${buildQueryString({ limit })}`
  );
}

async function fetchProcurementSummary(): Promise<ProcurementSummaryReport> {
  return apiRequest<ProcurementSummaryReport>('/reports/procurement-summary');
}

async function fetchForecast(): Promise<ForecastRow[]> {
  return apiRequest<ForecastRow[]>('/forecast');
}

function StatCard(props: {
  title: string;
  value: string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const valueStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

function ReportPanel(props: {
  title: string;
  subtitle: string;
  id?: string;
  labelledBy?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const descriptionId = props.id ? `${props.id}-description` : undefined;

  return (
    <section
      id={props.id}
      className="app-panel app-panel--padded"
      style={styles.panel}
      role={props.id ? 'tabpanel' : undefined}
      aria-labelledby={props.labelledBy}
      aria-describedby={descriptionId}
      tabIndex={props.id ? 0 : undefined}
    >
      <div style={styles.panelHeader}>
        <div style={styles.panelHeaderText}>
          <h3 style={styles.panelTitle}>{props.title}</h3>
          <p id={descriptionId} style={styles.panelSubtitle}>{props.subtitle}</p>
        </div>
        {props.actions ? <div style={styles.panelActions}>{props.actions}</div> : null}
      </div>
      {props.children}
    </section>
  );
}

function EmptyState(props: { message: string }) {
  return (
    <div className="app-empty-state" style={styles.emptyState}>
      {props.message}
    </div>
  );
}

function ErrorState(props: { message: string }) {
  return (
    <div className="app-error-state" style={styles.errorState}>
      {props.message}
    </div>
  );
}

function getReadableError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function getErrorStatus(error: unknown): number | null {
  if (error instanceof ApiError) {
    return error.status;
  }

  return null;
}

export default function ReportsPage() {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the ReportsPage you sent.

    Existing real behavior is preserved:
    - same backend endpoints
    - same query keys
    - same tab structure
    - same filters and report logic
    - same management-access behavior

    This pass applies the shared UI foundation carefully:
    - major sections now use app-panel/app-panel--padded
    - stats now use app-grid-stats
    - empty and error states align with the shared layer
    - no reporting logic was changed

    WHAT PROBLEM IT SOLVES
    ----------------------
    Makes Reports consume the same shared visual system as the rest of the
    polished pages without changing contracts, flows, or management gating.
  */
  const [activeTab, setActiveTab] = useState<ReportTab>('inventory-valuation');
  const [locationCategoryFilter, setLocationCategoryFilter] = useState('');
  const [movementLimit, setMovementLimit] = useState(50);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ report: Exclude<ReportTab, 'forecast'>; metadata: ApiDownloadMetadata } | null>(null);
  const [downloadingReport, setDownloadingReport] = useState<ReportTab | null>(null);
  const normalizedLocationCategoryFilter = useMemo(
    () => getNormalizedCategoryFilter(locationCategoryFilter),
    [locationCategoryFilter]
  );

  const { role: currentUserRole, canViewInsights } = getRoleCapabilities();

  const subscriptionAccessQuery = useQuery({
    queryKey: ['tenant-subscription-access', 'reports'],
    queryFn: fetchTenantSubscriptionAccess
  });
  const reportsEntitlement = getTenantFeatureEntitlement(subscriptionAccessQuery.data, 'reports');
  const reportsEntitled = reportsEntitlement ? reportsEntitlement.allowed : true;
  const reportsFeatureReady = Boolean(subscriptionAccessQuery.data) && reportsEntitled;
  const forecastingEntitlement = getTenantFeatureEntitlement(subscriptionAccessQuery.data, 'forecasting');
  const forecastingFeatureAllowed = forecastingEntitlement ? forecastingEntitlement.allowed : true;
  const forecastFeatureReady = reportsFeatureReady && forecastingFeatureAllowed && canViewInsights;
  const forecastUnavailableReason = !canViewInsights
    ? 'Forecast requires insights.read in addition to reports.read.'
    : forecastingEntitlement && !forecastingEntitlement.allowed
      ? `Forecasting is not enabled for this tenant plan. Required feature flags: ${(forecastingEntitlement.required_flags || ['forecasting']).join(', ')}.`
      : null;

  const inventoryValuationQuery = useQuery({
    queryKey: ['reports', 'inventory-valuation'],
    queryFn: fetchInventoryValuation,
    enabled: reportsFeatureReady
  });

  const stockByLocationQuery = useQuery({
    queryKey: ['reports', 'stock-by-location', normalizedLocationCategoryFilter],
    queryFn: () => fetchStockByLocation(normalizedLocationCategoryFilter),
    enabled: reportsFeatureReady
  });

  const productMovementsQuery = useQuery({
    queryKey: ['reports', 'product-movements', movementLimit],
    queryFn: () => fetchProductMovements(movementLimit),
    enabled: reportsFeatureReady
  });

  const procurementSummaryQuery = useQuery({
    queryKey: ['reports', 'procurement-summary'],
    queryFn: fetchProcurementSummary,
    enabled: reportsFeatureReady
  });

  const forecastQuery = useQuery({
    queryKey: ['reports', 'forecast'],
    queryFn: fetchForecast,
    enabled: forecastFeatureReady
  });

  const inventoryValuationRows = inventoryValuationQuery.data?.rows ?? [];
  const stockByLocationRows = useMemo(() => stockByLocationQuery.data ?? [], [stockByLocationQuery.data]);
  const productMovementRows = useMemo(() => productMovementsQuery.data ?? [], [productMovementsQuery.data]);
  const forecastRows = useMemo(() => forecastQuery.data ?? [], [forecastQuery.data]);

  const topLocation = useMemo(() => {
    if (stockByLocationRows.length === 0) {
      return null;
    }

    return [...stockByLocationRows].sort(
      (left, right) => toNumber(right.total_quantity) - toNumber(left.total_quantity)
    )[0];
  }, [stockByLocationRows]);

  const mostActiveProduct = useMemo(() => {
    if (productMovementRows.length === 0) {
      return null;
    }

    return [...productMovementRows].sort(
      (left, right) => toNumber(right.movement_count) - toNumber(left.movement_count)
    )[0];
  }, [productMovementRows]);

  const highestForecastProduct = useMemo(() => {
    if (forecastRows.length === 0) {
      return null;
    }

    return [...forecastRows].sort(
      (left, right) => toNumber(right.avg_daily_usage) - toNumber(left.avg_daily_usage)
    )[0];
  }, [forecastRows]);

  const anyForbidden = [
    inventoryValuationQuery.error,
    stockByLocationQuery.error,
    productMovementsQuery.error,
    procurementSummaryQuery.error,
    forecastFeatureReady ? forecastQuery.error : null
  ].some((error) => getErrorStatus(error) === 403);

  const clearDownloadStatus = () => {
    setDownloadError(null);
    setDownloadInfo(null);
  };

  const changeActiveTab = (tab: ReportTab) => {
    if (downloadingReport !== null) {
      return;
    }

    clearDownloadStatus();
    setActiveTab(tab);
  };


  const focusReportTab = (tab: ReportTab) => {
    window.requestAnimationFrame(() => {
      document.getElementById(getReportTabId(tab))?.focus();
    });
  };

  const changeActiveTabFromKeyboard = (tab: ReportTab) => {
    changeActiveTab(tab);
    focusReportTab(tab);
  };

  const handleReportTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: ReportTab) => {
    if (downloadingReport !== null) {
      return;
    }

    const currentIndex = REPORT_TABS.findIndex((reportTab) => reportTab.key === tab);
    if (currentIndex < 0) {
      return;
    }

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const nextTab = REPORT_TABS[(currentIndex + 1) % REPORT_TABS.length].key;
      changeActiveTabFromKeyboard(nextTab);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const previousTab = REPORT_TABS[(currentIndex - 1 + REPORT_TABS.length) % REPORT_TABS.length].key;
      changeActiveTabFromKeyboard(previousTab);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      changeActiveTabFromKeyboard(REPORT_TABS[0].key);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      changeActiveTabFromKeyboard(REPORT_TABS[REPORT_TABS.length - 1].key);
    }
  };

  const changeLocationCategoryFilter = (value: string) => {
    clearDownloadStatus();
    setLocationCategoryFilter(value);
  };

  const changeMovementLimit = (value: number) => {
    clearDownloadStatus();
    setMovementLimit(value);
  };

  const downloadReportCsv = async (report: Exclude<ReportTab, 'forecast'>) => {
    setDownloadError(null);
    setDownloadInfo(null);
    setDownloadingReport(report);

    const paths: Record<Exclude<ReportTab, 'forecast'>, string> = {
      'inventory-valuation': '/reports/inventory-valuation?format=csv',
      'stock-by-location': `/reports/stock-by-location${buildQueryString({
        category: normalizedLocationCategoryFilter,
        format: 'csv'
      })}`,
      'product-movements': `/reports/product-movements${buildQueryString({
        limit: movementLimit,
        format: 'csv'
      })}`,
      'procurement-summary': '/reports/procurement-summary?format=csv'
    };

    try {
      const metadata = await apiDownloadFile(paths[report], getReportFilename(report));
      setDownloadInfo({ report, metadata });
    } catch (error) {
      setDownloadError(getReadableError(error));
    } finally {
      setDownloadingReport(null);
    }
  };

  const refreshReport = (report: ReportTab) => {
    clearDownloadStatus();

    if (report === 'inventory-valuation') {
      void inventoryValuationQuery.refetch();
      return;
    }

    if (report === 'stock-by-location') {
      void stockByLocationQuery.refetch();
      return;
    }

    if (report === 'product-movements') {
      void productMovementsQuery.refetch();
      return;
    }

    if (report === 'procurement-summary') {
      void procurementSummaryQuery.refetch();
      return;
    }

    if (forecastFeatureReady) {
      void forecastQuery.refetch();
    }
  };

  if (anyForbidden) {
    return (
      <div style={styles.pageStack}>
        <section className="app-warning-state" style={styles.permissionPanel}>
          <h2 style={styles.permissionTitle}>Management access required</h2>
          <p style={styles.permissionText}>
            The reports and forecast module is backed by your existing
            management-only backend routes. The current session role is{' '}
            <strong>{currentUserRole || 'unknown'}</strong>, and the backend is
            correctly denying access.
          </p>
          <p style={styles.permissionText}>
            This protects valuation, procurement summary, movement analysis, and
            forecast data from being exposed to unauthorized roles.
          </p>
        </section>
      </div>
    );
  }

  if (subscriptionAccessQuery.isLoading) {
    return (
      <div style={styles.pageStack}>
        <section className="app-panel app-panel--padded" style={styles.panel}>
          <h3 style={styles.panelTitle}>Management Reporting</h3>
          <p style={styles.panelSubtitle}>Checking tenant plan access…</p>
        </section>
      </div>
    );
  }

  if (reportsEntitlement && !reportsEntitlement.allowed) {
    return (
      <div style={styles.pageStack}>
        <section className="app-panel app-panel--padded" style={styles.panel}>
          <h3 style={styles.panelTitle}>Management Reporting</h3>
          <p style={styles.panelSubtitle}>
            Reports are not enabled for this tenant plan, so this page does not call report endpoints.
            This keeps Render logs clean and avoids expected 403 entitlement warnings.
          </p>
          <p style={styles.permissionText}>
            Required feature flags: {(reportsEntitlement.required_flags || ['reports']).join(', ')}.
          </p>
        </section>
      </div>
    );
  }

  const procurementSummary = procurementSummaryQuery.data;

  return (
    <div style={styles.pageStack}>
      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelHeaderText}>
            <h3 style={styles.panelTitle}>Management Reporting</h3>
            <p style={styles.panelSubtitle}>
              Frontend reporting surface built directly on the backend routes already
              present in your existing codebase: valuation, stock distribution,
              movement analysis, procurement summary, and forecast.
            </p>
          </div>
        </div>

        <div className="app-grid-stats" style={styles.statsGrid}>
          <StatCard
            title="Estimated Inventory Value"
            value={formatCurrency(inventoryValuationQuery.data?.totals.estimated_inventory_value)}
            subtitle="Based on the latest available movement, shipment, or standard product cost"
          />
          <StatCard
            title="Tracked Valuation Rows"
            value={formatNumber(inventoryValuationQuery.data?.totals.row_count, 0)}
            subtitle="Stock rows currently contributing to inventory valuation"
          />
          <StatCard
            title="Overdue Shipments"
            value={formatNumber(procurementSummary?.shipments.overdue_shipments, 0)}
            subtitle="Inbound shipments past delivery date and not fully received"
            tone={
              toNumber(procurementSummary?.shipments.overdue_shipments) > 0
                ? 'warn'
                : 'good'
            }
          />
          <StatCard
            title="Top Forecast Product"
            value={highestForecastProduct?.product_name || 'None'}
            subtitle={
              highestForecastProduct
                ? `${formatNumber(highestForecastProduct.avg_daily_usage)} avg daily usage`
                : 'No recent consumption data available'
            }
          />
        </div>

        <div style={styles.insightGrid}>
          <div style={styles.insightCard}>
            <div style={styles.insightLabel}>Top quantity location</div>
            <div style={styles.insightValue}>
              {topLocation?.storage_location_name || 'None'}
            </div>
            <div style={styles.insightText}>
              {topLocation
                ? `${formatNumber(topLocation.total_quantity)} total units across ${formatNumber(
                    topLocation.stock_row_count,
                    0
                  )} stock rows`
                : 'No location stock rows returned from report.'}
            </div>
          </div>

          <div style={styles.insightCard}>
            <div style={styles.insightLabel}>Most active product</div>
            <div style={styles.insightValue}>
              {mostActiveProduct?.product_name || 'None'}
            </div>
            <div style={styles.insightText}>
              {mostActiveProduct
                ? `${formatNumber(mostActiveProduct.movement_count, 0)} movements, ${formatNumber(
                    mostActiveProduct.total_increase
                  )} in, ${formatNumber(mostActiveProduct.total_decrease)} out`
                : 'No product movement rows returned from report.'}
            </div>
          </div>

          <div style={styles.insightCard}>
            <div style={styles.insightLabel}>Procurement coverage</div>
            <div style={styles.insightValue}>
              {formatNumber(procurementSummary?.shipments.total_shipments, 0)}
            </div>
            <div style={styles.insightText}>
              {`${formatNumber(procurementSummary?.shipments.pending_shipments, 0)} pending, ${formatNumber(
                procurementSummary?.shipments.partial_shipments,
                0
              )} partial, ${formatNumber(
                procurementSummary?.shipments.received_shipments,
                0
              )} received`}
            </div>
          </div>
        </div>
      </section>

      {downloadError ? (
        <div
          id={DOWNLOAD_ERROR_STATUS_ID}
          role="alert"
          aria-live="assertive"
          style={styles.downloadStatusPanel}
        >
          <ErrorState message={`CSV export failed: ${downloadError}`} />
          <button
            type="button"
            onClick={clearDownloadStatus}
            style={styles.dismissStatusButton}
            aria-label={getClearDownloadStatusAriaLabel(downloadInfo, downloadError)}
            aria-describedby={DOWNLOAD_ERROR_STATUS_ID}
          >
            Clear message
          </button>
        </div>
      ) : null}

      {downloadInfo ? (
        <section
          id={DOWNLOAD_SUCCESS_STATUS_ID}
          className="app-success-state"
          style={styles.downloadInfoPanel}
          role="status"
          aria-live="polite"
        >
          <div>
            <strong>CSV export ready:</strong>{' '}
            {downloadInfo.metadata.exportedRows === null
              ? `${getReportLabel(downloadInfo.report)} downloaded.`
              : `${getReportLabel(downloadInfo.report)} downloaded with ${formatNumber(downloadInfo.metadata.exportedRows, 0)} exported rows.`}
            {downloadInfo.metadata.wasRowLimited && downloadInfo.metadata.originalRows !== null ? (
              <span>
                {' '}Original result had {formatNumber(downloadInfo.metadata.originalRows, 0)} rows
                {downloadInfo.metadata.rowLimit !== null
                  ? `, so only the configured limit of ${formatNumber(downloadInfo.metadata.rowLimit, 0)} rows was exported.`
                  : ', so the configured export limit was applied.'}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={clearDownloadStatus}
            style={styles.dismissStatusButton}
            aria-label={getClearDownloadStatusAriaLabel(downloadInfo, downloadError)}
            aria-describedby={DOWNLOAD_SUCCESS_STATUS_ID}
          >
            Clear message
          </button>
        </section>
      ) : null}

      <section style={styles.tabSection}>
        <div
          style={styles.tabBar}
          role="tablist"
          aria-label="Reports"
          aria-orientation="horizontal"
          aria-describedby={downloadingReport !== null ? REPORT_TAB_LOCK_HINT_ID : undefined}
        >
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.key}
              id={getReportTabId(tab.key)}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={getReportPanelId(tab.key)}
              aria-describedby={downloadingReport !== null ? REPORT_TAB_LOCK_HINT_ID : undefined}
              disabled={downloadingReport !== null}
              aria-disabled={downloadingReport !== null}
              title={
                downloadingReport !== null
                  ? 'Wait for the current CSV export to finish before changing report tabs.'
                  : `Show ${tab.label} report.`
              }
              tabIndex={activeTab === tab.key ? 0 : -1}
              onClick={() => changeActiveTab(tab.key)}
              onKeyDown={(event) => handleReportTabKeyDown(event, tab.key)}
              style={{
                ...styles.tabButton,
                ...(activeTab === tab.key ? styles.tabButtonActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {downloadingReport !== null && downloadingReport !== 'forecast' ? (
          <p id={REPORT_TAB_LOCK_HINT_ID} style={styles.tabLockHint}>
            Report tabs are locked while {getReportLabel(downloadingReport)} is exporting.
          </p>
        ) : null}
      </section>

      {activeTab === 'inventory-valuation' ? (
        <ReportPanel
          id={getReportPanelId('inventory-valuation')}
          labelledBy={getReportTabId('inventory-valuation')}
          title="Inventory Valuation"
          subtitle="Estimated stock value by product and storage location using the latest available movement, shipment, or standard product cost."
          actions={
            <div className="app-actions" style={styles.filterRow}>
              <RefreshReportButton
                label="inventory valuation report"
                isRefreshing={inventoryValuationQuery.isFetching}
                disabled={downloadingReport !== null}
                disabledReason={downloadingReport !== null ? 'Wait for the current CSV export to finish before refreshing.' : undefined}
                onRefresh={() => refreshReport('inventory-valuation')}
              />
              <button
                type="button"
                onClick={() => downloadReportCsv('inventory-valuation')}
                disabled={downloadingReport !== null}
                style={styles.actionButton}
                aria-busy={downloadingReport === 'inventory-valuation'}
                title={getExportButtonTitle('inventory-valuation', downloadingReport)}
                aria-label={getExportButtonAriaLabel('inventory-valuation', downloadingReport)}
              >
                {getExportButtonLabel('inventory-valuation', downloadingReport)}
              </button>
            </div>
          }
        >
          <LastRefreshedText timestamp={inventoryValuationQuery.dataUpdatedAt} />
          {inventoryValuationQuery.isLoading ? <div>Loading inventory valuation...</div> : null}
          {inventoryValuationQuery.isError ? (
            <ErrorState
              message={`Failed to load inventory valuation: ${getReadableError(inventoryValuationQuery.error)}`}
            />
          ) : null}
          {!inventoryValuationQuery.isLoading && !inventoryValuationQuery.isError ? (
            inventoryValuationRows.length === 0 ? (
              <EmptyState message="No valuation rows returned for this tenant." />
            ) : (
              <>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Location</th>
                        <th style={styles.th}>Quantity</th>
                        <th style={styles.th}>Unit Cost</th>
                        <th style={styles.th}>Estimated Value</th>
                        <th style={styles.th}>Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryValuationRows.map((row) => (
                        <tr key={`${row.product_id}-${row.storage_location_id}`}>
                          <td style={styles.td}>
                            <div style={styles.rowTitle}>{row.product_name || row.product_id}</div>
                            <div style={styles.rowSubtle}>Product ID: {row.product_id}</div>
                          </td>
                          <td style={styles.td}>{row.product_category || '-'}</td>
                          <td style={styles.td}>
                            {row.storage_location_name || row.storage_location_id}
                          </td>
                          <td style={styles.td}>{formatNumber(row.quantity)}</td>
                          <td style={styles.td}>
                            {formatCurrency(row.estimated_unit_cost)}
                          </td>
                          <td style={styles.td}>
                            {formatCurrency(row.estimated_total_value)}
                          </td>
                          <td style={styles.td}>{formatDateTime(row.updated_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={styles.mobileCards}>
                  {inventoryValuationRows.map((row) => (
                    <div
                      key={`mobile-${row.product_id}-${row.storage_location_id}`}
                      style={styles.mobileCard}
                    >
                      <div style={styles.mobileCardTitle}>
                        {row.product_name || row.product_id}
                      </div>
                      <div style={styles.mobileCardText}>
                        Category: {row.product_category || '-'}
                      </div>
                      <div style={styles.mobileCardText}>
                        Location: {row.storage_location_name || row.storage_location_id}
                      </div>
                      <div style={styles.mobileCardText}>
                        Quantity: {formatNumber(row.quantity)}
                      </div>
                      <div style={styles.mobileCardText}>
                        Unit Cost: {formatCurrency(row.estimated_unit_cost)}
                      </div>
                      <div style={styles.mobileCardText}>
                        Estimated Value: {formatCurrency(row.estimated_total_value)}
                      </div>
                      <div style={styles.mobileCardText}>
                        Updated: {formatDateTime(row.updated_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'stock-by-location' ? (
        <ReportPanel
          id={getReportPanelId('stock-by-location')}
          labelledBy={getReportTabId('stock-by-location')}
          title="Stock by Location"
          subtitle="Grouped stock totals per storage location using the existing backend stock-by-location report."
          actions={
            <div className="app-actions" style={styles.filterRow}>
              <RefreshReportButton
                label="stock by location report"
                isRefreshing={stockByLocationQuery.isFetching}
                disabled={downloadingReport !== null}
                disabledReason={downloadingReport !== null ? 'Wait for the current CSV export to finish before refreshing.' : undefined}
                onRefresh={() => refreshReport('stock-by-location')}
              />
              <button
                type="button"
                onClick={() => downloadReportCsv('stock-by-location')}
                disabled={downloadingReport !== null}
                style={styles.actionButton}
                aria-busy={downloadingReport === 'stock-by-location'}
                title={getExportButtonTitle('stock-by-location', downloadingReport)}
                aria-label={getExportButtonAriaLabel('stock-by-location', downloadingReport)}
              >
                {getExportButtonLabel('stock-by-location', downloadingReport)}
              </button>
              <label style={styles.fieldLabel}>
                Category Filter
                <input
                  type="text"
                  value={locationCategoryFilter}
                  onChange={(event) => changeLocationCategoryFilter(event.target.value)}
                  placeholder="All categories"
                  maxLength={MAX_REPORT_FILTER_LENGTH}
                  disabled={downloadingReport !== null}
                  aria-disabled={downloadingReport !== null}
                  aria-describedby={getCategoryFilterHintId()}
                  style={styles.textInput}
                />
                <span id={getCategoryFilterHintId()} style={styles.fieldHint}>
                  {downloadingReport !== null
                    ? 'Wait for the current CSV export to finish before changing this filter.'
                    : getReportFilterHint(locationCategoryFilter)}
                </span>
              </label>
            </div>
          }
        >
          <LastRefreshedText timestamp={stockByLocationQuery.dataUpdatedAt} />
          {stockByLocationQuery.isLoading ? <div>Loading stock by location...</div> : null}
          {stockByLocationQuery.isError ? (
            <ErrorState
              message={`Failed to load stock by location: ${getReadableError(stockByLocationQuery.error)}`}
            />
          ) : null}
          {!stockByLocationQuery.isLoading && !stockByLocationQuery.isError ? (
            stockByLocationRows.length === 0 ? (
              <EmptyState message="No grouped stock rows matched the current filter." />
            ) : (
              <>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Location</th>
                        <th style={styles.th}>Temperature Zone</th>
                        <th style={styles.th}>Stock Rows</th>
                        <th style={styles.th}>Total Quantity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockByLocationRows.map((row) => (
                        <tr key={row.storage_location_id}>
                          <td style={styles.td}>
                            {row.storage_location_name || row.storage_location_id}
                          </td>
                          <td style={styles.td}>{row.temperature_zone || '-'}</td>
                          <td style={styles.td}>
                            {formatNumber(row.stock_row_count, 0)}
                          </td>
                          <td style={styles.td}>{formatNumber(row.total_quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={styles.mobileCards}>
                  {stockByLocationRows.map((row) => (
                    <div
                      key={`location-mobile-${row.storage_location_id}`}
                      style={styles.mobileCard}
                    >
                      <div style={styles.mobileCardTitle}>
                        {row.storage_location_name || row.storage_location_id}
                      </div>
                      <div style={styles.mobileCardText}>
                        Temperature Zone: {row.temperature_zone || '-'}
                      </div>
                      <div style={styles.mobileCardText}>
                        Stock Rows: {formatNumber(row.stock_row_count, 0)}
                      </div>
                      <div style={styles.mobileCardText}>
                        Total Quantity: {formatNumber(row.total_quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'product-movements' ? (
        <ReportPanel
          id={getReportPanelId('product-movements')}
          labelledBy={getReportTabId('product-movements')}
          title="Product Movements"
          subtitle="Product-level movement summary using your existing product movement report endpoint."
          actions={
            <div className="app-actions" style={styles.filterRow}>
              <RefreshReportButton
                label="product movements report"
                isRefreshing={productMovementsQuery.isFetching}
                disabled={downloadingReport !== null}
                disabledReason={downloadingReport !== null ? 'Wait for the current CSV export to finish before refreshing.' : undefined}
                onRefresh={() => refreshReport('product-movements')}
              />
              <button
                type="button"
                onClick={() => downloadReportCsv('product-movements')}
                disabled={downloadingReport !== null}
                style={styles.actionButton}
                aria-busy={downloadingReport === 'product-movements'}
                title={getExportButtonTitle('product-movements', downloadingReport)}
                aria-label={getExportButtonAriaLabel('product-movements', downloadingReport)}
              >
                {getExportButtonLabel('product-movements', downloadingReport)}
              </button>
              <label style={styles.fieldLabel}>
                Result Limit
                <select
                  value={movementLimit}
                  onChange={(event) => changeMovementLimit(Number(event.target.value))}
                  disabled={downloadingReport !== null}
                  aria-disabled={downloadingReport !== null}
                  aria-describedby={getMovementLimitHintId()}
                  style={styles.selectInput}
                >
                  {PRODUCT_MOVEMENT_LIMIT_OPTIONS.map((limitOption) => (
                    <option key={limitOption} value={limitOption}>
                      {limitOption}
                    </option>
                  ))}
                </select>
                <span id={getMovementLimitHintId()} style={styles.fieldHint}>
                  {downloadingReport !== null
                    ? 'Wait for the current CSV export to finish before changing this limit.'
                    : `Maximum ${MAX_PRODUCT_MOVEMENT_REPORT_LIMIT} movement rows per report.`}
                </span>
              </label>
            </div>
          }
        >
          <LastRefreshedText timestamp={productMovementsQuery.dataUpdatedAt} />
          {productMovementsQuery.isLoading ? <div>Loading product movements...</div> : null}
          {productMovementsQuery.isError ? (
            <ErrorState
              message={`Failed to load product movements: ${getReadableError(productMovementsQuery.error)}`}
            />
          ) : null}
          {!productMovementsQuery.isLoading && !productMovementsQuery.isError ? (
            productMovementRows.length === 0 ? (
              <EmptyState message="No product movement rows returned for the selected limit." />
            ) : (
              <>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Movements</th>
                        <th style={styles.th}>Total Increase</th>
                        <th style={styles.th}>Total Decrease</th>
                        <th style={styles.th}>Last Movement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productMovementRows.map((row) => (
                        <tr key={row.product_id}>
                          <td style={styles.td}>
                            <div style={styles.rowTitle}>{row.product_name || row.product_id}</div>
                            <div style={styles.rowSubtle}>Product ID: {row.product_id}</div>
                          </td>
                          <td style={styles.td}>{row.product_category || '-'}</td>
                          <td style={styles.td}>
                            {formatNumber(row.movement_count, 0)}
                          </td>
                          <td style={styles.td}>{formatNumber(row.total_increase)}</td>
                          <td style={styles.td}>{formatNumber(row.total_decrease)}</td>
                          <td style={styles.td}>{formatDateTime(row.last_movement_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={styles.mobileCards}>
                  {productMovementRows.map((row) => (
                    <div
                      key={`movement-mobile-${row.product_id}`}
                      style={styles.mobileCard}
                    >
                      <div style={styles.mobileCardTitle}>
                        {row.product_name || row.product_id}
                      </div>
                      <div style={styles.mobileCardText}>
                        Category: {row.product_category || '-'}
                      </div>
                      <div style={styles.mobileCardText}>
                        Movements: {formatNumber(row.movement_count, 0)}
                      </div>
                      <div style={styles.mobileCardText}>
                        Increase: {formatNumber(row.total_increase)}
                      </div>
                      <div style={styles.mobileCardText}>
                        Decrease: {formatNumber(row.total_decrease)}
                      </div>
                      <div style={styles.mobileCardText}>
                        Last Movement: {formatDateTime(row.last_movement_at)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'procurement-summary' ? (
        <ReportPanel
          id={getReportPanelId('procurement-summary')}
          labelledBy={getReportTabId('procurement-summary')}
          title="Procurement Summary"
          subtitle="Shipment and line-level procurement summary from your existing backend procurement report."
          actions={
            <div className="app-actions" style={styles.filterRow}>
              <RefreshReportButton
                label="procurement summary report"
                isRefreshing={procurementSummaryQuery.isFetching}
                disabled={downloadingReport !== null}
                disabledReason={downloadingReport !== null ? 'Wait for the current CSV export to finish before refreshing.' : undefined}
                onRefresh={() => refreshReport('procurement-summary')}
              />
              <button
                type="button"
                onClick={() => downloadReportCsv('procurement-summary')}
                disabled={downloadingReport !== null}
                style={styles.actionButton}
                aria-busy={downloadingReport === 'procurement-summary'}
                title={getExportButtonTitle('procurement-summary', downloadingReport)}
                aria-label={getExportButtonAriaLabel('procurement-summary', downloadingReport)}
              >
                {getExportButtonLabel('procurement-summary', downloadingReport)}
              </button>
            </div>
          }
        >
          <LastRefreshedText timestamp={procurementSummaryQuery.dataUpdatedAt} />
          {procurementSummaryQuery.isLoading ? <div>Loading procurement summary...</div> : null}
          {procurementSummaryQuery.isError ? (
            <ErrorState
              message={`Failed to load procurement summary: ${getReadableError(procurementSummaryQuery.error)}`}
            />
          ) : null}
          {!procurementSummaryQuery.isLoading &&
          !procurementSummaryQuery.isError &&
          procurementSummary ? (
            <div style={styles.summaryGrid}>
              <div style={styles.summaryCard}>
                <h4 style={styles.summaryCardTitle}>Shipments</h4>
                <div style={styles.summaryRow}>
                  <span>Total</span>
                  <strong>{formatNumber(procurementSummary.shipments.total_shipments, 0)}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Pending</span>
                  <strong>{formatNumber(procurementSummary.shipments.pending_shipments, 0)}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Partial</span>
                  <strong>{formatNumber(procurementSummary.shipments.partial_shipments, 0)}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Received</span>
                  <strong>{formatNumber(procurementSummary.shipments.received_shipments, 0)}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Overdue</span>
                  <strong>{formatNumber(procurementSummary.shipments.overdue_shipments, 0)}</strong>
                </div>
              </div>

              <div style={styles.summaryCard}>
                <h4 style={styles.summaryCardTitle}>Shipment Lines</h4>
                <div style={styles.summaryRow}>
                  <span>Active Lines</span>
                  <strong>
                    {formatNumber(procurementSummary.lines.total_active_shipment_lines, 0)}
                  </strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Ordered Quantity</span>
                  <strong>{formatNumber(procurementSummary.lines.total_ordered_quantity)}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Received Quantity</span>
                  <strong>{formatNumber(procurementSummary.lines.total_received_quantity)}</strong>
                </div>
                <div style={styles.summaryRow}>
                  <span>Discrepancy</span>
                  <strong>{formatNumber(procurementSummary.lines.total_discrepancy)}</strong>
                </div>
              </div>
            </div>
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'forecast' ? (
        <ReportPanel
          id={getReportPanelId('forecast')}
          labelledBy={getReportTabId('forecast')}
          title="Demand Forecast"
          subtitle="Usage-based demand forecast from recent negative stock movements over the last 30 days."
          actions={
            <RefreshReportButton
              label="forecast report"
              isRefreshing={forecastQuery.isFetching}
              disabled={downloadingReport !== null || !forecastFeatureReady}
              disabledReason={
                forecastUnavailableReason ||
                (downloadingReport !== null ? 'Wait for the current CSV export to finish before refreshing.' : undefined)
              }
              onRefresh={() => refreshReport('forecast')}
            />
          }
        >
          <p id={FORECAST_ACCESS_NOTE_ID} style={styles.infoNote}>
            Forecast is read-only, has no CSV export, and requires forecasting feature access plus insights.read separately from reports.read.
          </p>
          {forecastUnavailableReason ? (
            <ErrorState message={forecastUnavailableReason} />
          ) : null}
          <LastRefreshedText timestamp={forecastQuery.dataUpdatedAt} />
          {forecastFeatureReady && forecastQuery.isLoading ? <div>Loading forecast...</div> : null}
          {forecastFeatureReady && forecastQuery.isError ? (
            <ErrorState
              message={`Failed to load forecast: ${getReadableError(forecastQuery.error)}`}
            />
          ) : null}
          {forecastFeatureReady && !forecastQuery.isLoading && !forecastQuery.isError ? (
            forecastRows.length === 0 ? (
              <EmptyState message="No recent consumption data was available to produce a forecast." />
            ) : (
              <>
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Average Daily Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastRows.map((row) => (
                        <tr key={row.product_id}>
                          <td style={styles.td}>
                            <div style={styles.rowTitle}>{row.product_name || row.product_id}</div>
                            <div style={styles.rowSubtle}>Product ID: {row.product_id}</div>
                          </td>
                          <td style={styles.td}>{formatNumber(row.avg_daily_usage)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={styles.mobileCards}>
                  {forecastRows.map((row) => (
                    <div
                      key={`forecast-mobile-${row.product_id}`}
                      style={styles.mobileCard}
                    >
                      <div style={styles.mobileCardTitle}>
                        {row.product_name || row.product_id}
                      </div>
                      <div style={styles.mobileCardText}>
                        Average Daily Usage: {formatNumber(row.avg_daily_usage)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          ) : null}
        </ReportPanel>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  pageStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    minWidth: 0
  },
  panel: {
    minWidth: 0,
    overflow: 'hidden'
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  panelHeaderText: {
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700
  },
  panelSubtitle: {
    margin: '8px 0 0 0',
    color: '#6b7280',
    lineHeight: 1.5,
    maxWidth: '820px',
    wordBreak: 'break-word'
  },
  panelActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  statsGrid: {
    marginBottom: '16px',
    width: '100%',
    minWidth: 0
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    minWidth: 0
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '26px',
    fontWeight: 700,
    marginBottom: '8px',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statValueGood: {
    fontSize: '26px',
    fontWeight: 700,
    marginBottom: '8px',
    lineHeight: 1.2,
    color: '#166534',
    wordBreak: 'break-word'
  },
  statValueWarn: {
    fontSize: '26px',
    fontWeight: 700,
    marginBottom: '8px',
    lineHeight: 1.2,
    color: '#92400e',
    wordBreak: 'break-word'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  insightGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    width: '100%',
    minWidth: 0
  },
  insightCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '16px',
    minWidth: 0
  },
  insightLabel: {
    fontSize: '12px',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 700,
    marginBottom: '8px'
  },
  insightValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  insightText: {
    color: '#475569',
    lineHeight: 1.45,
    fontSize: '14px',
    wordBreak: 'break-word'
  },
  tabSection: {
    overflowX: 'auto',
    minWidth: 0
  },
  tabBar: {
    display: 'flex',
    gap: '10px',
    minWidth: 'max-content'
  },
  tabButton: {
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: '999px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  tabButtonActive: {
    background: '#0f172a',
    borderColor: '#0f172a',
    color: '#ffffff'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto',
    minWidth: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '780px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#6b7280'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    fontSize: '14px',
    wordBreak: 'break-word'
  },
  rowTitle: {
    fontWeight: 700,
    color: '#111827',
    marginBottom: '4px',
    wordBreak: 'break-word'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#64748b',
    wordBreak: 'break-all'
  },
  mobileCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
    marginTop: '14px',
    minWidth: 0
  },
  mobileCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px',
    background: '#ffffff',
    minWidth: 0
  },
  mobileCardTitle: {
    fontWeight: 700,
    fontSize: '16px',
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  mobileCardText: {
    color: '#475569',
    lineHeight: 1.5,
    fontSize: '14px',
    wordBreak: 'break-word'
  },
  filterRow: {
    minWidth: 0
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    minWidth: 0,
    flex: '1 1 220px'
  },
  textInput: {
    minWidth: '220px',
    maxWidth: '100%',
    width: '100%',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    padding: '10px 12px',
    fontSize: '14px',
    boxSizing: 'border-box'
  },
  fieldHint: {
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 500,
    lineHeight: 1.4
  },
  tabLockHint: {
    margin: '8px 0 0',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1.4
  },
  selectInput: {
    minWidth: '120px',
    maxWidth: '100%',
    width: '100%',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    padding: '10px 12px',
    fontSize: '14px',
    background: '#ffffff',
    boxSizing: 'border-box'
  },
  secondaryButton: {
    border: '1px solid #94a3b8',
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: '10px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  refreshMeta: {
    margin: '0 0 12px 0',
    color: '#64748b',
    fontSize: '12px',
    fontWeight: 600
  },
  infoNote: {
    margin: '0 0 12px 0',
    color: '#475569',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '10px 12px',
    lineHeight: 1.45
  },
  actionButton: {
    border: '1px solid #0f172a',
    background: '#0f172a',
    color: '#ffffff',
    borderRadius: '10px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  emptyState: {
    margin: 0
  },
  errorState: {
    margin: 0
  },
  downloadStatusPanel: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap'
  },
  downloadInfoPanel: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    color: '#166534',
    borderRadius: '12px',
    padding: '12px 14px',
    lineHeight: 1.5
  },
  dismissStatusButton: {
    border: '1px solid #94a3b8',
    background: '#ffffff',
    color: '#0f172a',
    borderRadius: '8px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    width: '100%',
    minWidth: 0
  },
  summaryCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    background: '#ffffff',
    minWidth: 0
  },
  summaryCardTitle: {
    margin: '0 0 12px 0',
    fontSize: '18px'
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9'
  },
  permissionPanel: {
    margin: 0
  },
  permissionTitle: {
    margin: '0 0 12px 0',
    fontSize: '22px',
    color: '#9a3412'
  },
  permissionText: {
    margin: '0 0 10px 0',
    color: '#7c2d12',
    lineHeight: 1.6
  }
};