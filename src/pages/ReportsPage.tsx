import type { KeyboardEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import { ApiError, apiDownloadFile, apiRequest, type ApiDownloadMetadata } from '../lib/api';
import { getCurrentAccessRoleLabel, getRoleCapabilities, hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import { fetchTenantSubscriptionAccess, getTenantFeatureEntitlement } from '../lib/tenantSubscriptionAccess';
import { formatCurrencyAmount } from '../lib/tenantCurrency';
import './ReportsPage.css';

type ReportTab =
  | 'inventory-valuation'
  | 'stock-by-location'
  | 'product-movements'
  | 'procurement-summary'
  | 'low-stock'
  | 'usage-summary'
  | 'supplier-performance'
  | 'expiry-risk'
  | 'forecast';

type ExportFormat = 'csv' | 'pdf';

const MAX_REPORT_FILTER_LENGTH = 120;
const PRODUCT_MOVEMENT_LIMIT_OPTIONS = [25, 50, 100, 200, 500] as const;
const USAGE_PERIOD_OPTIONS = [7, 30, 90, 180, 365] as const;
const EXPIRY_HORIZON_OPTIONS = [30, 60, 90, 180, 365] as const;
const REPORT_TABS: Array<{ key: ReportTab; label: string }> = [
  { key: 'inventory-valuation', label: 'Inventory Valuation' },
  { key: 'stock-by-location', label: 'Stock by Location' },
  { key: 'product-movements', label: 'Product Movements' },
  { key: 'procurement-summary', label: 'Procurement Summary' },
  { key: 'low-stock', label: 'Low Stock' },
  { key: 'usage-summary', label: 'Usage & Consumption' },
  { key: 'supplier-performance', label: 'Supplier Performance' },
  { key: 'expiry-risk', label: 'Expiry & Lot Risk' },
  { key: 'forecast', label: 'Forecast' }
];

const REPORT_ICONS: Record<ReportTab, string> = {
  'inventory-valuation': '/reports',
  'stock-by-location': '/storage-locations',
  'product-movements': '/stock-movements',
  'procurement-summary': '/shipments',
  'low-stock': '/replenishment-planning',
  'usage-summary': '/inventory-usage',
  'supplier-performance': '/suppliers',
  'expiry-risk': '/alerts',
  forecast: '/probabilistic-forecasting'
};

const REPORT_LABELS: Record<ReportTab, string> = {
  'inventory-valuation': 'Inventory valuation report',
  'stock-by-location': 'Stock by location report',
  'product-movements': 'Product movements report',
  'procurement-summary': 'Procurement summary report',
  'low-stock': 'Low stock and reorder report',
  'usage-summary': 'Usage and consumption report',
  'supplier-performance': 'Supplier performance report',
  'expiry-risk': 'Expiry and lot risk report',
  forecast: 'Demand forecast report'
};

const REPORT_DESCRIPTIONS: Record<ReportTab, string> = {
  'inventory-valuation': 'Estimated stock value by product and storage location in the tenant inventory currency.',
  'stock-by-location': 'Stock positions grouped by storage location, with quantities kept separate by product unit.',
  'product-movements': 'Product-level movement counts and quantity increases/decreases from the stock movement ledger.',
  'procurement-summary': 'Shipment status, receiving totals, and discrepancy quantities across procurement activity.',
  'low-stock': 'Products currently below their configured minimum stock level, including shortage and supplier context.',
  'usage-summary': 'Non-reversed inventory consumption summarized by product for the selected period.',
  'supplier-performance': 'Supplier shipment volumes, receiving status, overdue deliveries, and latest delivery date.',
  'expiry-risk': 'Positive-balance lots that are already expired or will expire within the selected horizon.',
  forecast: 'Usage-based demand forecast from recent outbound stock movements over the last 30 days.'
};

function getReportLabel(report: ReportTab): string {
  return REPORT_LABELS[report];
}

function getReportFilename(report: ReportTab, format: ExportFormat = 'csv'): string {
  const stem = getReportLabel(report).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${stem}.${format}`;
}

function getReportTabId(tab: ReportTab): string {
  return `reports-tab-${tab}`;
}

function getReportPanelId(tab: ReportTab): string {
  return `reports-panel-${tab}`;
}

function buildQueryString(params: Record<string, string | number | null | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatNumber(value: number | string | null | undefined, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits }).format(toNumber(value));
}

function formatCostAmount(value: number | string | null | undefined, currency?: string | null): string {
  return formatCurrencyAmount(value, currency);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
}

function formatCostSource(value: string | null | undefined): string {
  switch (value) {
    case 'stock_movement': return 'Stock movement';
    case 'shipment_item_unit_cost': return 'Shipment receipt';
    case 'product_standard': return 'Product standard cost';
    case 'no_cost': return 'No cost available';
    default: return value ? value.replace(/_/g, ' ') : '-';
  }
}

function formatQuantityByUnit(
  quantities: Record<string, number | string> | null | undefined,
  fallbackTotal?: number | string | null
): string {
  const entries = Object.entries(quantities || {}).filter(([, quantity]) => Number.isFinite(Number(quantity)));
  if (entries.length > 0) {
    return entries
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([unit, quantity]) => `${formatNumber(quantity)} ${unit}`)
      .join(', ');
  }
  return fallbackTotal === undefined || fallbackTotal === null
    ? 'No quantity recorded'
    : `${formatNumber(fallbackTotal)} (unit breakdown unavailable)`;
}

function getReadableError(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

function isFeatureEntitlementError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'TENANT_FEATURE_NOT_ENTITLED';
}

function isPermissionDeniedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && !isFeatureEntitlementError(error);
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
  estimated_cost_source?: string | null;
  estimated_total_value: number | string;
  updated_at?: string | null;
  currency_code?: string | null;
};

type InventoryValuationReport = {
  totals: { row_count: number; estimated_inventory_value: number | string; currency_code?: string | null };
  rows: InventoryValuationRow[];
};

type StockByLocationRow = {
  storage_location_id: string;
  storage_location_name: string;
  temperature_zone?: string | null;
  stock_row_count: number | string;
  total_quantity: number | string;
  quantity_by_unit?: Record<string, number | string>;
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

type ProcurementQuantityByUnit = Record<string, {
  ordered_quantity: number | string;
  received_quantity: number | string;
  discrepancy: number | string;
}>;

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
    quantity_by_unit?: ProcurementQuantityByUnit;
  };
};

type LowStockRow = {
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  minimum_stock: number | string;
  current_stock: number | string;
  shortage_quantity: number | string;
  supplier_name?: string | null;
};

type UsageSummaryRow = {
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  usage_count: number | string;
  total_consumed: number | string;
  guest_use_quantity: number | string;
  internal_use_quantity: number | string;
  damage_waste_quantity: number | string;
  last_consumed_at?: string | null;
};

type SupplierPerformanceRow = {
  supplier_id: string;
  supplier_name: string;
  total_shipments: number | string;
  pending_shipments: number | string;
  partial_shipments: number | string;
  received_shipments: number | string;
  overdue_shipments: number | string;
  last_received_date?: string | null;
};

type ExpiryRiskRow = {
  inventory_lot_id: string;
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  storage_location_name: string;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date: string;
  condition: string;
  quantity: number | string;
  risk_status: 'expired' | 'due_soon' | 'upcoming' | string;
};

type ForecastRow = {
  product_id: string;
  product_name: string;
  product_unit?: string | null;
  avg_daily_usage: number | string;
};

async function fetchInventoryValuation(): Promise<InventoryValuationReport> {
  return apiRequest<InventoryValuationReport>('/reports/inventory-valuation');
}
async function fetchStockByLocation(category: string): Promise<StockByLocationRow[]> {
  return apiRequest<StockByLocationRow[]>(`/reports/stock-by-location${buildQueryString({ category })}`);
}
async function fetchProductMovements(limit: number): Promise<ProductMovementRow[]> {
  return apiRequest<ProductMovementRow[]>(`/reports/product-movements${buildQueryString({ limit })}`);
}
async function fetchProcurementSummary(): Promise<ProcurementSummaryReport> {
  return apiRequest<ProcurementSummaryReport>('/reports/procurement-summary');
}
async function fetchLowStock(): Promise<LowStockRow[]> {
  return apiRequest<LowStockRow[]>('/reports/low-stock');
}
async function fetchUsageSummary(days: number): Promise<UsageSummaryRow[]> {
  return apiRequest<UsageSummaryRow[]>(`/reports/usage-summary${buildQueryString({ days })}`);
}
async function fetchSupplierPerformance(): Promise<SupplierPerformanceRow[]> {
  return apiRequest<SupplierPerformanceRow[]>('/reports/supplier-performance');
}
async function fetchExpiryRisk(days: number): Promise<ExpiryRiskRow[]> {
  return apiRequest<ExpiryRiskRow[]>(`/reports/expiry-risk${buildQueryString({ days })}`);
}
async function fetchForecast(): Promise<ForecastRow[]> {
  return apiRequest<ForecastRow[]>('/reports/forecast');
}

function ReportPanel({ tab, actions, filters, children }: {
  tab: ReportTab;
  actions: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={getReportPanelId(tab)}
      className="app-panel reports-panel"
      role="tabpanel"
      aria-labelledby={getReportTabId(tab)}
      tabIndex={0}
    >
      <OperationalSectionHeader
        iconPath={REPORT_ICONS[tab]}
        title={REPORT_TABS.find((item) => item.key === tab)?.label || getReportLabel(tab)}
        description={REPORT_DESCRIPTIONS[tab]}
        actions={<div className="reports-actions" data-report-controls="true">{actions}</div>}
      />
      {filters ? <div className="reports-filter-bar" data-report-controls="true">{filters}</div> : null}
      <div className="reports-body">{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="app-empty-state reports-empty">{message}</div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="app-error-state reports-error">{message}</div>;
}

function LastRefreshed({ timestamp }: { timestamp: number }) {
  return <div className="reports-refreshed">Last refreshed: {timestamp ? formatDateTime(new Date(timestamp).toISOString()) : 'Not loaded yet'}</div>;
}

function RiskBadge({ status }: { status: string }) {
  const label = status === 'expired' ? 'Expired' : status === 'due_soon' ? 'Due soon' : 'Upcoming';
  return <span className={`reports-risk reports-risk--${status}`}>{label}</span>;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('inventory-valuation');
  const [locationCategoryFilter, setLocationCategoryFilter] = useState('');
  const [movementLimit, setMovementLimit] = useState(50);
  const [usageDays, setUsageDays] = useState(30);
  const [expiryDays, setExpiryDays] = useState(90);
  const [downloadingReport, setDownloadingReport] = useState<ReportTab | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<ExportFormat | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ report: ReportTab; format: ExportFormat; metadata: ApiDownloadMetadata } | null>(null);
  const normalizedLocationCategoryFilter = useMemo(() => locationCategoryFilter.trim(), [locationCategoryFilter]);

  const { canViewInsights } = getRoleCapabilities();
  const currentAccessRoleLabel = getCurrentAccessRoleLabel();
  const canReadTenantSubscriptionAccess = hasPermission(TENANT_PERMISSIONS.TENANT_READ);

  const subscriptionAccessQuery = useQuery({
    queryKey: ['tenant-subscription-access', 'reports'],
    queryFn: fetchTenantSubscriptionAccess,
    enabled: canReadTenantSubscriptionAccess
  });
  const reportsEntitlement = getTenantFeatureEntitlement(subscriptionAccessQuery.data, 'reports');
  const reportsEntitled = reportsEntitlement ? reportsEntitlement.allowed : true;
  const subscriptionAccessResolved =
    !canReadTenantSubscriptionAccess || subscriptionAccessQuery.isSuccess || subscriptionAccessQuery.isError;
  const reportsFeatureReady = subscriptionAccessResolved && (subscriptionAccessQuery.isSuccess ? reportsEntitled : true);
  const forecastingEntitlement = getTenantFeatureEntitlement(subscriptionAccessQuery.data, 'forecasting');
  const forecastingFeatureAllowed = forecastingEntitlement ? forecastingEntitlement.allowed : true;
  const forecastFeatureReady = reportsFeatureReady && canViewInsights &&
    (subscriptionAccessQuery.isSuccess ? forecastingFeatureAllowed : true);

  const inventoryValuationQuery = useQuery({ queryKey: ['reports', 'inventory-valuation'], queryFn: fetchInventoryValuation, enabled: reportsFeatureReady });
  const stockByLocationQuery = useQuery({ queryKey: ['reports', 'stock-by-location', normalizedLocationCategoryFilter], queryFn: () => fetchStockByLocation(normalizedLocationCategoryFilter), enabled: reportsFeatureReady && activeTab === 'stock-by-location' });
  const productMovementsQuery = useQuery({ queryKey: ['reports', 'product-movements', movementLimit], queryFn: () => fetchProductMovements(movementLimit), enabled: reportsFeatureReady && activeTab === 'product-movements' });
  const procurementSummaryQuery = useQuery({ queryKey: ['reports', 'procurement-summary'], queryFn: fetchProcurementSummary, enabled: reportsFeatureReady });
  const lowStockQuery = useQuery({ queryKey: ['reports', 'low-stock'], queryFn: fetchLowStock, enabled: reportsFeatureReady });
  const usageSummaryQuery = useQuery({ queryKey: ['reports', 'usage-summary', usageDays], queryFn: () => fetchUsageSummary(usageDays), enabled: reportsFeatureReady && activeTab === 'usage-summary' });
  const supplierPerformanceQuery = useQuery({ queryKey: ['reports', 'supplier-performance'], queryFn: fetchSupplierPerformance, enabled: reportsFeatureReady && activeTab === 'supplier-performance' });
  const expiryRiskQuery = useQuery({ queryKey: ['reports', 'expiry-risk', expiryDays], queryFn: () => fetchExpiryRisk(expiryDays), enabled: reportsFeatureReady && activeTab === 'expiry-risk' });
  const forecastQuery = useQuery({ queryKey: ['reports', 'forecast'], queryFn: fetchForecast, enabled: forecastFeatureReady && activeTab === 'forecast' });

  const reportErrors = [
    inventoryValuationQuery.error, stockByLocationQuery.error, productMovementsQuery.error,
    procurementSummaryQuery.error, lowStockQuery.error, usageSummaryQuery.error,
    supplierPerformanceQuery.error, expiryRiskQuery.error
  ];
  const reportsDeniedByFeature = reportErrors.some(isFeatureEntitlementError);
  const anyForbidden = reportErrors.some(isPermissionDeniedError);
  const forecastDeniedByFeature = isFeatureEntitlementError(forecastQuery.error);
  const forecastDeniedByPermission = isPermissionDeniedError(forecastQuery.error);
  const forecastUnavailableReason = !canViewInsights || forecastDeniedByPermission
    ? 'Forecast access requires Insights - Read in addition to Reports - Read.'
    : (forecastingEntitlement && !forecastingEntitlement.allowed) || forecastDeniedByFeature
      ? 'Forecasting is not enabled for this tenant subscription.'
      : null;

  const inventoryRows = inventoryValuationQuery.data?.rows ?? [];
  const locationRows = stockByLocationQuery.data ?? [];
  const movementRows = productMovementsQuery.data ?? [];
  const lowStockRows = lowStockQuery.data ?? [];
  const usageRows = usageSummaryQuery.data ?? [];
  const supplierRows = supplierPerformanceQuery.data ?? [];
  const expiryRows = expiryRiskQuery.data ?? [];
  const forecastRows = forecastQuery.data ?? [];
  const procurementSummary = procurementSummaryQuery.data;

  const availableReportCount = forecastFeatureReady ? REPORT_TABS.length : REPORT_TABS.length - 1;
  const activeLabel = REPORT_TABS.find((item) => item.key === activeTab)?.label || 'Report';
  const isExporting = downloadingReport !== null;

  const clearDownloadStatus = () => {
    setDownloadError(null);
    setDownloadInfo(null);
  };

  const changeActiveTab = (tab: ReportTab) => {
    if (isExporting) return;
    clearDownloadStatus();
    setActiveTab(tab);
  };

  const focusReportTab = (tab: ReportTab) => {
    window.requestAnimationFrame(() => document.getElementById(getReportTabId(tab))?.focus());
  };

  const handleReportTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: ReportTab) => {
    if (isExporting) return;
    const currentIndex = REPORT_TABS.findIndex((item) => item.key === tab);
    if (currentIndex < 0) return;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % REPORT_TABS.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + REPORT_TABS.length) % REPORT_TABS.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = REPORT_TABS.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = REPORT_TABS[nextIndex].key;
    changeActiveTab(nextTab);
    focusReportTab(nextTab);
  };

  const getExportPath = (report: ReportTab, format: ExportFormat): string => {
    const common = { format };
    switch (report) {
      case 'inventory-valuation': return `/reports/inventory-valuation${buildQueryString(common)}`;
      case 'stock-by-location': return `/reports/stock-by-location${buildQueryString({ category: normalizedLocationCategoryFilter, ...common })}`;
      case 'product-movements': return `/reports/product-movements${buildQueryString({ limit: movementLimit, ...common })}`;
      case 'procurement-summary': return `/reports/procurement-summary${buildQueryString(common)}`;
      case 'low-stock': return `/reports/low-stock${buildQueryString(common)}`;
      case 'usage-summary': return `/reports/usage-summary${buildQueryString({ days: usageDays, ...common })}`;
      case 'supplier-performance': return `/reports/supplier-performance${buildQueryString(common)}`;
      case 'expiry-risk': return `/reports/expiry-risk${buildQueryString({ days: expiryDays, ...common })}`;
      case 'forecast': return `/reports/forecast${buildQueryString(common)}`;
    }
  };

  const downloadReport = async (report: ReportTab, format: ExportFormat) => {
    clearDownloadStatus();
    setDownloadingReport(report);
    setDownloadFormat(format);
    try {
      const metadata = await apiDownloadFile(getExportPath(report, format), getReportFilename(report, format));
      setDownloadInfo({ report, format, metadata });
    } catch (error) {
      setDownloadError(getReadableError(error));
    } finally {
      setDownloadingReport(null);
      setDownloadFormat(null);
    }
  };

  const printReport = (report: ReportTab) => {
    clearDownloadStatus();
    const panel = document.getElementById(getReportPanelId(report));
    if (!panel) {
      setDownloadError('The report is not ready to print yet.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      setDownloadError('The browser blocked the print window. Allow pop-ups for this site and try again.');
      return;
    }
    printWindow.opener = null;
    printWindow.document.title = `${activeLabel} - Inventory Operations`;
    const style = printWindow.document.createElement('style');
    style.textContent = `
      *{box-sizing:border-box} body{font-family:Arial,sans-serif;color:#0f172a;margin:24px;font-size:12px}
      h3{font-size:20px;margin:0 0 6px}.io-workspace-section-header__description{color:#475569;margin-bottom:16px}
      [data-report-controls="true"],button,input,select{display:none!important}
      table{border-collapse:collapse;width:100%;font-size:11px} th,td{border:1px solid #dbe4ef;padding:7px;text-align:left;vertical-align:top}
      th{background:#f8fafc}.reports-refreshed{font-size:10px;color:#64748b;margin:8px 0 12px}
      .reports-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.reports-summary-card{border:1px solid #dbe4ef;padding:12px}
      .reports-risk{font-weight:700}.io-workspace-section-header__icon{display:none}@page{size:landscape;margin:12mm}
    `;
    printWindow.document.head.appendChild(style);
    const clone = panel.cloneNode(true) as HTMLElement;
    printWindow.document.body.appendChild(clone);
    printWindow.document.close();
    window.setTimeout(() => { printWindow.focus(); printWindow.print(); }, 120);
  };

  const refreshReport = (report: ReportTab) => {
    clearDownloadStatus();
    switch (report) {
      case 'inventory-valuation': void inventoryValuationQuery.refetch(); break;
      case 'stock-by-location': void stockByLocationQuery.refetch(); break;
      case 'product-movements': void productMovementsQuery.refetch(); break;
      case 'procurement-summary': void procurementSummaryQuery.refetch(); break;
      case 'low-stock': void lowStockQuery.refetch(); break;
      case 'usage-summary': void usageSummaryQuery.refetch(); break;
      case 'supplier-performance': void supplierPerformanceQuery.refetch(); break;
      case 'expiry-risk': void expiryRiskQuery.refetch(); break;
      case 'forecast': if (forecastFeatureReady) void forecastQuery.refetch(); break;
    }
  };

  const actionButtons = (report: ReportTab, isFetching: boolean, disabled = false) => (
    <>
      <button type="button" className="reports-button reports-button--secondary" disabled={isExporting || disabled || isFetching} onClick={() => refreshReport(report)}>
        {isFetching ? 'Refreshing…' : 'Refresh'}
      </button>
      <button type="button" className="reports-button reports-button--secondary" disabled={isExporting || disabled} onClick={() => printReport(report)}>
        Print
      </button>
      <button type="button" className="reports-button reports-button--secondary" disabled={isExporting || disabled} aria-busy={downloadingReport === report && downloadFormat === 'pdf'} onClick={() => downloadReport(report, 'pdf')}>
        {downloadingReport === report && downloadFormat === 'pdf' ? 'Creating PDF…' : 'Download PDF'}
      </button>
      <button type="button" className="reports-button reports-button--primary" disabled={isExporting || disabled} aria-busy={downloadingReport === report && downloadFormat === 'csv'} onClick={() => downloadReport(report, 'csv')}>
        {downloadingReport === report && downloadFormat === 'csv' ? 'Exporting…' : 'Export CSV'}
      </button>
    </>
  );

  if (anyForbidden) {
    return (
      <section className="app-warning-state reports-access-state">
        <h2>Reports access required</h2>
        <p>Your current access role (<strong>{currentAccessRoleLabel || 'unknown'}</strong>) cannot read one or more tenant reporting datasets.</p>
        <p>Ask a tenant administrator to review your Reports permissions.</p>
      </section>
    );
  }

  if (canReadTenantSubscriptionAccess && subscriptionAccessQuery.isLoading) {
    return <section className="app-panel app-panel--padded">Checking reporting access…</section>;
  }

  if ((reportsEntitlement && !reportsEntitlement.allowed) || reportsDeniedByFeature) {
    return (
      <section className="app-warning-state reports-access-state">
        <h2>Reports are not enabled</h2>
        <p>This tenant subscription does not currently include the Reports feature.</p>
      </section>
    );
  }

  return (
    <div className="io-workspace-page reports-page">
      <OperationalWorkspaceHero
        iconPath="/reports"
        eyebrow="Reporting & exports"
        title="Management reporting workspace"
        description="Run tenant-scoped inventory, procurement, usage, supplier, expiry, and forecasting reports from live database records. Every report can be printed or exported for offline business use."
        meta={
          <>
            <OperationalWorkspaceMetaPill>Tenant-scoped</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Read-only reporting</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Print + PDF + CSV</OperationalWorkspaceMetaPill>
          </>
        }
        aside={<OperationalWorkspaceStatus value={availableReportCount} label="report types available with current access" />}
      />

      <OperationalWorkspaceStats ariaLabel="Reporting overview">
        <OperationalWorkspaceStatCard label="Available reports" value={availableReportCount} helper="Operational and management report types" iconPath="/reports" tone="blue" />
        <OperationalWorkspaceStatCard
          label="Estimated inventory value"
          value={formatCostAmount(inventoryValuationQuery.data?.totals.estimated_inventory_value, inventoryValuationQuery.data?.totals.currency_code)}
          helper={`${inventoryValuationQuery.data?.totals.row_count ?? 0} valuation rows`}
          iconPath="/stock"
          loading={inventoryValuationQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label="Low-stock products"
          value={lowStockRows.length}
          helper="Products below configured minimum"
          iconPath="/replenishment-planning"
          tone={lowStockRows.length > 0 ? 'warn' : 'good'}
          loading={lowStockQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label="Overdue shipments"
          value={formatNumber(procurementSummary?.shipments.overdue_shipments, 0)}
          helper="Pending or partial past delivery date"
          iconPath="/shipments"
          tone={toNumber(procurementSummary?.shipments.overdue_shipments) > 0 ? 'warn' : 'good'}
          loading={procurementSummaryQuery.isLoading}
        />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs
        ariaLabel="Reports"
        hint={isExporting ? `Exporting ${getReportLabel(downloadingReport)}…` : 'Choose the report you need.'}
      >
        {REPORT_TABS.map((tab) => {
          const forecastDisabled = tab.key === 'forecast' && !forecastFeatureReady;
          return (
            <OperationalWorkspaceTab
              key={tab.key}
              id={getReportTabId(tab.key)}
              active={activeTab === tab.key}
              iconPath={REPORT_ICONS[tab.key]}
              label={tab.label}
              aria-controls={getReportPanelId(tab.key)}
              tabIndex={activeTab === tab.key ? 0 : -1}
              disabled={isExporting || forecastDisabled}
              title={forecastDisabled ? forecastUnavailableReason || undefined : `Show ${tab.label} report.`}
              onClick={() => changeActiveTab(tab.key)}
              onKeyDown={(event) => handleReportTabKeyDown(event, tab.key)}
            />
          );
        })}
      </OperationalWorkspaceTabs>

      {downloadError ? (
        <div className="app-error-state reports-export-status" role="alert" aria-live="assertive">
          <span><strong>Export/print failed:</strong> {downloadError}</span>
          <button type="button" className="reports-link-button" onClick={clearDownloadStatus}>Clear message</button>
        </div>
      ) : null}
      {downloadInfo ? (
        <div className="reports-export-success reports-export-status" role="status" aria-live="polite">
          <span>
            <strong>{downloadInfo.format.toUpperCase()} ready:</strong> {getReportLabel(downloadInfo.report)}.
            {downloadInfo.metadata.exportedRows !== null ? ` ${downloadInfo.metadata.exportedRows} rows exported.` : ''}
            {downloadInfo.metadata.wasRowLimited && downloadInfo.metadata.originalRows !== null && downloadInfo.metadata.rowLimit !== null
              ? ` Original result had ${downloadInfo.metadata.originalRows} rows; the configured limit of ${downloadInfo.metadata.rowLimit} was applied.`
              : ''}
          </span>
          <button type="button" className="reports-link-button" onClick={clearDownloadStatus}>Clear message</button>
        </div>
      ) : null}

      {activeTab === 'inventory-valuation' ? (
        <ReportPanel tab="inventory-valuation" actions={actionButtons('inventory-valuation', inventoryValuationQuery.isFetching)}>
          <LastRefreshed timestamp={inventoryValuationQuery.dataUpdatedAt} />
          <p className="reports-note">Foreign-currency receipt costs are preserved separately and are not silently converted.</p>
          {inventoryValuationQuery.isLoading ? <div>Loading inventory valuation…</div> : null}
          {inventoryValuationQuery.isError ? <ErrorState message={`Failed to load inventory valuation: ${getReadableError(inventoryValuationQuery.error)}`} /> : null}
          {!inventoryValuationQuery.isLoading && !inventoryValuationQuery.isError && inventoryRows.length === 0 ? <EmptyState message="No stocked inventory rows are available for valuation." /> : null}
          {inventoryRows.length > 0 ? (
            <div className="reports-table-wrap"><table className="reports-table"><thead><tr>
              <th>Product</th><th>Category</th><th>Location</th><th>Quantity</th><th>Unit cost</th><th>Cost source</th><th>Estimated value</th><th>Updated</th>
            </tr></thead><tbody>{inventoryRows.map((row) => <tr key={`${row.product_id}-${row.storage_location_id}`}>
              <td className="reports-strong">{row.product_name}</td><td>{row.product_category || '-'}</td><td>{row.storage_location_name}</td>
              <td>{formatNumber(row.quantity)} {row.product_unit || 'units'}</td><td>{formatCostAmount(row.estimated_unit_cost, row.currency_code)}</td>
              <td>{formatCostSource(row.estimated_cost_source)}</td><td className="reports-strong">{formatCostAmount(row.estimated_total_value, row.currency_code)}</td><td>{formatDateTime(row.updated_at)}</td>
            </tr>)}</tbody></table></div>
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'stock-by-location' ? (
        <ReportPanel
          tab="stock-by-location"
          actions={actionButtons('stock-by-location', stockByLocationQuery.isFetching)}
          filters={<label className="reports-field"><span>Category filter</span><input value={locationCategoryFilter} maxLength={MAX_REPORT_FILTER_LENGTH} placeholder="All categories" onChange={(event) => { clearDownloadStatus(); setLocationCategoryFilter(event.target.value); }} disabled={isExporting} /><small>Optional. Exact category match; maximum {MAX_REPORT_FILTER_LENGTH} characters.</small></label>}
        >
          <LastRefreshed timestamp={stockByLocationQuery.dataUpdatedAt} />
          {stockByLocationQuery.isLoading ? <div>Loading stock by location…</div> : null}
          {stockByLocationQuery.isError ? <ErrorState message={`Failed to load stock by location: ${getReadableError(stockByLocationQuery.error)}`} /> : null}
          {!stockByLocationQuery.isLoading && !stockByLocationQuery.isError && locationRows.length === 0 ? <EmptyState message="No stock locations matched this report." /> : null}
          {locationRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Location</th><th>Temperature zone</th><th>Stock rows</th><th>Quantity by unit</th></tr></thead><tbody>
            {locationRows.map((row) => <tr key={row.storage_location_id}><td className="reports-strong">{row.storage_location_name}</td><td>{row.temperature_zone || '-'}</td><td>{formatNumber(row.stock_row_count, 0)}</td><td>{formatQuantityByUnit(row.quantity_by_unit, row.total_quantity)}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'product-movements' ? (
        <ReportPanel
          tab="product-movements"
          actions={actionButtons('product-movements', productMovementsQuery.isFetching)}
          filters={<label className="reports-field reports-field--compact"><span>Result limit</span><select value={movementLimit} onChange={(event) => { clearDownloadStatus(); setMovementLimit(Number(event.target.value)); }} disabled={isExporting}>{PRODUCT_MOVEMENT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select><small>Maximum 500 product rows per report.</small></label>}
        >
          <LastRefreshed timestamp={productMovementsQuery.dataUpdatedAt} />
          {productMovementsQuery.isLoading ? <div>Loading product movements…</div> : null}
          {productMovementsQuery.isError ? <ErrorState message={`Failed to load product movements: ${getReadableError(productMovementsQuery.error)}`} /> : null}
          {!productMovementsQuery.isLoading && !productMovementsQuery.isError && movementRows.length === 0 ? <EmptyState message="No products are available for the movement report." /> : null}
          {movementRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Product</th><th>Category</th><th>Movements</th><th>Total increase</th><th>Total decrease</th><th>Last movement</th></tr></thead><tbody>
            {movementRows.map((row) => <tr key={row.product_id}><td className="reports-strong">{row.product_name}</td><td>{row.product_category || '-'}</td><td>{formatNumber(row.movement_count, 0)}</td><td>{formatNumber(row.total_increase)} {row.product_unit || 'units'}</td><td>{formatNumber(row.total_decrease)} {row.product_unit || 'units'}</td><td>{formatDateTime(row.last_movement_at)}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'procurement-summary' ? (
        <ReportPanel tab="procurement-summary" actions={actionButtons('procurement-summary', procurementSummaryQuery.isFetching)}>
          <LastRefreshed timestamp={procurementSummaryQuery.dataUpdatedAt} />
          {procurementSummaryQuery.isLoading ? <div>Loading procurement summary…</div> : null}
          {procurementSummaryQuery.isError ? <ErrorState message={`Failed to load procurement summary: ${getReadableError(procurementSummaryQuery.error)}`} /> : null}
          {procurementSummary ? <div className="reports-summary-grid">
            <article className="reports-summary-card"><h4>Shipments</h4>
              <div><span>Total</span><strong>{formatNumber(procurementSummary.shipments.total_shipments, 0)}</strong></div>
              <div><span>Pending</span><strong>{formatNumber(procurementSummary.shipments.pending_shipments, 0)}</strong></div>
              <div><span>Partial</span><strong>{formatNumber(procurementSummary.shipments.partial_shipments, 0)}</strong></div>
              <div><span>Received</span><strong>{formatNumber(procurementSummary.shipments.received_shipments, 0)}</strong></div>
              <div><span>Overdue</span><strong>{formatNumber(procurementSummary.shipments.overdue_shipments, 0)}</strong></div>
            </article>
            <article className="reports-summary-card"><h4>Shipment lines</h4><div><span>Active lines</span><strong>{formatNumber(procurementSummary.lines.total_active_shipment_lines, 0)}</strong></div>
              {procurementSummary.lines.quantity_by_unit && Object.keys(procurementSummary.lines.quantity_by_unit).length > 0
                ? Object.entries(procurementSummary.lines.quantity_by_unit).sort(([a], [b]) => a.localeCompare(b)).map(([unit, values]) => <div className="reports-unit-block" key={unit}><h5>{unit}</h5><div><span>Ordered</span><strong>{formatNumber(values.ordered_quantity)} {unit}</strong></div><div><span>Received</span><strong>{formatNumber(values.received_quantity)} {unit}</strong></div><div><span>Discrepancy</span><strong>{formatNumber(values.discrepancy)} {unit}</strong></div></div>)
                : <p className="reports-note">No procurement quantity-by-unit rows returned.</p>}
            </article>
          </div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'low-stock' ? (
        <ReportPanel tab="low-stock" actions={actionButtons('low-stock', lowStockQuery.isFetching)}>
          <LastRefreshed timestamp={lowStockQuery.dataUpdatedAt} />
          {lowStockQuery.isLoading ? <div>Loading low-stock report…</div> : null}
          {lowStockQuery.isError ? <ErrorState message={`Failed to load low-stock report: ${getReadableError(lowStockQuery.error)}`} /> : null}
          {!lowStockQuery.isLoading && !lowStockQuery.isError && lowStockRows.length === 0 ? <EmptyState message="No products are below their configured minimum stock." /> : null}
          {lowStockRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Product</th><th>Category</th><th>Current stock</th><th>Minimum</th><th>Shortage</th><th>Supplier</th></tr></thead><tbody>
            {lowStockRows.map((row) => <tr key={row.product_id}><td className="reports-strong">{row.product_name}</td><td>{row.product_category || '-'}</td><td>{formatNumber(row.current_stock)} {row.product_unit || 'units'}</td><td>{formatNumber(row.minimum_stock)} {row.product_unit || 'units'}</td><td className="reports-warning-text">{formatNumber(row.shortage_quantity)} {row.product_unit || 'units'}</td><td>{row.supplier_name || 'Not assigned'}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'usage-summary' ? (
        <ReportPanel tab="usage-summary" actions={actionButtons('usage-summary', usageSummaryQuery.isFetching)} filters={<label className="reports-field reports-field--compact"><span>Reporting period</span><select value={usageDays} onChange={(event) => { clearDownloadStatus(); setUsageDays(Number(event.target.value)); }} disabled={isExporting}>{USAGE_PERIOD_OPTIONS.map((days) => <option key={days} value={days}>Last {days} days</option>)}</select><small>Reversed usage entries are excluded.</small></label>}>
          <LastRefreshed timestamp={usageSummaryQuery.dataUpdatedAt} />
          {usageSummaryQuery.isLoading ? <div>Loading usage report…</div> : null}
          {usageSummaryQuery.isError ? <ErrorState message={`Failed to load usage report: ${getReadableError(usageSummaryQuery.error)}`} /> : null}
          {!usageSummaryQuery.isLoading && !usageSummaryQuery.isError && usageRows.length === 0 ? <EmptyState message={`No non-reversed usage was recorded in the last ${usageDays} days.`} /> : null}
          {usageRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Product</th><th>Entries</th><th>Total consumed</th><th>Guest use</th><th>Internal use</th><th>Damage / waste</th><th>Last use</th></tr></thead><tbody>
            {usageRows.map((row) => <tr key={row.product_id}><td className="reports-strong">{row.product_name}<span className="reports-subtext">{row.product_category || 'Uncategorized'}</span></td><td>{formatNumber(row.usage_count, 0)}</td><td>{formatNumber(row.total_consumed)} {row.product_unit || 'units'}</td><td>{formatNumber(row.guest_use_quantity)} {row.product_unit || 'units'}</td><td>{formatNumber(row.internal_use_quantity)} {row.product_unit || 'units'}</td><td>{formatNumber(row.damage_waste_quantity)} {row.product_unit || 'units'}</td><td>{formatDateTime(row.last_consumed_at)}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'supplier-performance' ? (
        <ReportPanel tab="supplier-performance" actions={actionButtons('supplier-performance', supplierPerformanceQuery.isFetching)}>
          <LastRefreshed timestamp={supplierPerformanceQuery.dataUpdatedAt} />
          {supplierPerformanceQuery.isLoading ? <div>Loading supplier performance…</div> : null}
          {supplierPerformanceQuery.isError ? <ErrorState message={`Failed to load supplier performance: ${getReadableError(supplierPerformanceQuery.error)}`} /> : null}
          {!supplierPerformanceQuery.isLoading && !supplierPerformanceQuery.isError && supplierRows.length === 0 ? <EmptyState message="No active suppliers are available for this report." /> : null}
          {supplierRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Supplier</th><th>Total shipments</th><th>Pending</th><th>Partial</th><th>Received</th><th>Overdue</th><th>Last received</th></tr></thead><tbody>
            {supplierRows.map((row) => <tr key={row.supplier_id}><td className="reports-strong">{row.supplier_name}</td><td>{formatNumber(row.total_shipments, 0)}</td><td>{formatNumber(row.pending_shipments, 0)}</td><td>{formatNumber(row.partial_shipments, 0)}</td><td>{formatNumber(row.received_shipments, 0)}</td><td className={toNumber(row.overdue_shipments) > 0 ? 'reports-warning-text' : ''}>{formatNumber(row.overdue_shipments, 0)}</td><td>{formatDate(row.last_received_date)}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'expiry-risk' ? (
        <ReportPanel tab="expiry-risk" actions={actionButtons('expiry-risk', expiryRiskQuery.isFetching)} filters={<label className="reports-field reports-field--compact"><span>Expiry horizon</span><select value={expiryDays} onChange={(event) => { clearDownloadStatus(); setExpiryDays(Number(event.target.value)); }} disabled={isExporting}>{EXPIRY_HORIZON_OPTIONS.map((days) => <option key={days} value={days}>Next {days} days</option>)}</select><small>Already expired positive-balance lots are always included.</small></label>}>
          <LastRefreshed timestamp={expiryRiskQuery.dataUpdatedAt} />
          {expiryRiskQuery.isLoading ? <div>Loading expiry risk…</div> : null}
          {expiryRiskQuery.isError ? <ErrorState message={`Failed to load expiry risk: ${getReadableError(expiryRiskQuery.error)}`} /> : null}
          {!expiryRiskQuery.isLoading && !expiryRiskQuery.isError && expiryRows.length === 0 ? <EmptyState message={`No positive-balance lots expire within the next ${expiryDays} days.`} /> : null}
          {expiryRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Product</th><th>Location</th><th>Lot / batch</th><th>Expiry</th><th>Quantity</th><th>Condition</th><th>Risk</th></tr></thead><tbody>
            {expiryRows.map((row) => <tr key={row.inventory_lot_id}><td className="reports-strong">{row.product_name}</td><td>{row.storage_location_name}</td><td>{row.lot_number || '-'}{row.batch_number ? <span className="reports-subtext">Batch: {row.batch_number}</span> : null}</td><td>{formatDate(row.expiry_date)}</td><td>{formatNumber(row.quantity)} {row.product_unit || 'units'}</td><td>{row.condition}</td><td><RiskBadge status={row.risk_status} /></td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'forecast' ? (
        <ReportPanel tab="forecast" actions={actionButtons('forecast', forecastQuery.isFetching, !forecastFeatureReady)}>
          <p className="reports-note">Forecast is read-only for inventory changes. PDF and CSV exports are also read-only. Access requires Forecasting subscription access plus Reports - Read and Insights - Read permissions.</p>
          {forecastUnavailableReason ? <ErrorState message={forecastUnavailableReason} /> : null}
          {forecastFeatureReady ? <LastRefreshed timestamp={forecastQuery.dataUpdatedAt} /> : null}
          {forecastFeatureReady && forecastQuery.isLoading ? <div>Loading forecast…</div> : null}
          {forecastFeatureReady && forecastQuery.isError && !forecastDeniedByFeature ? <ErrorState message={`Failed to load forecast: ${getReadableError(forecastQuery.error)}`} /> : null}
          {forecastFeatureReady && !forecastQuery.isLoading && !forecastQuery.isError && forecastRows.length === 0 ? <EmptyState message="No recent consumption data was available to produce a forecast." /> : null}
          {forecastRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Product</th><th>Average daily usage</th></tr></thead><tbody>
            {forecastRows.map((row) => <tr key={row.product_id}><td className="reports-strong">{row.product_name}</td><td>{formatNumber(row.avg_daily_usage)} {row.product_unit || 'units'} / day</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}
    </div>
  );
}
