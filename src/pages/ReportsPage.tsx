import type { KeyboardEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppTranslation } from '../i18n/I18nContext';
import type { AppLocale } from '../i18n/config';
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
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
import { formatCurrencyAmount, getActiveTenantCurrency, normalizeCurrencyCode } from '../lib/tenantCurrency';
import './ReportsPage.css';

type ReportTab =
  | 'inventory-valuation'
  | 'stock-by-location'
  | 'product-movements'
  | 'movement-ledger'
  | 'inventory-variance'
  | 'stock-transfer-activity'
  | 'requisition-activity'
  | 'procurement-summary'
  | 'purchase-order-commitments'
  | 'purchasing-spend'
  | 'low-stock'
  | 'slow-moving'
  | 'usage-summary'
  | 'supplier-performance'
  | 'expiry-risk'
  | 'forecast';

type ExportFormat = 'csv' | 'pdf';

type DateRangeFilters = { from: string; to: string };
type TextFilters = { category: string; product: string; location: string; supplier: string };

const MAX_REPORT_FILTER_LENGTH = 120;
const PRODUCT_MOVEMENT_LIMIT_OPTIONS = [25, 50, 100, 200, 500] as const;
const REPORT_RESULT_LIMIT_OPTIONS = [50, 100, 200, 500] as const;
const USAGE_PERIOD_OPTIONS = [7, 30, 90, 180, 365] as const;
const EXPIRY_HORIZON_OPTIONS = [30, 60, 90, 180, 365] as const;
const SLOW_MOVING_DAYS_OPTIONS = [30, 60, 90, 180, 365] as const;
const PURCHASE_ORDER_STATUS_OPTIONS = [
  ['open', 'Open commitments'],
  ['all', 'All statuses'],
  ['draft', 'Draft'],
  ['submitted', 'Submitted'],
  ['approved', 'Approved'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled']
] as const;
const TRANSFER_STATUS_OPTIONS = [
  ['all', 'All statuses'],
  ['draft', 'Draft'],
  ['executed', 'Executed'],
  ['cancelled', 'Cancelled']
] as const;
const REQUISITION_STATUS_OPTIONS = [
  ['all', 'All statuses'],
  ['draft', 'Draft'],
  ['submitted', 'Submitted'],
  ['approved', 'Approved'],
  ['partially_fulfilled', 'Partially fulfilled'],
  ['fulfilled', 'Fulfilled'],
  ['rejected', 'Rejected'],
  ['cancelled', 'Cancelled']
] as const;

const MOVEMENT_TYPE_OPTIONS = [
  ['', 'All movement types'],
  ['shipment_receive', 'Shipment receipt'],
  ['usage', 'Usage'],
  ['usage_reversal', 'Usage reversal'],
  ['stock_transfer_out', 'Transfer out'],
  ['stock_transfer_in', 'Transfer in'],
  ['reservation_fulfillment', 'Reservation fulfillment'],
  ['requisition_fulfillment', 'Requisition fulfillment'],
  ['cycle_count_reconciliation', 'Cycle count reconciliation'],
  ['stock_count', 'Stock count'],
  ['manual_adjustment', 'Manual adjustment'],
  ['bom_assembly', 'BOM assembly'],
  ['bom_disassembly', 'BOM disassembly'],
  ['opening_stock', 'Opening stock'],
  ['expiry_writeoff', 'Expiry write-off'],
  ['quarantine_release', 'Quarantine release'],
  ['stock_hold', 'Stock hold'],
  ['stock_hold_release', 'Stock hold release'],
  ['outbound_dispatch', 'Outbound dispatch'],
  ['customer_return', 'Customer return'],
  ['supplier_return_dispatch', 'Supplier return dispatch'],
  ['unproven_legacy', 'Unproven legacy movement']
] as const;

const REPORT_TABS: Array<{ key: ReportTab; label: string }> = [
  { key: 'inventory-valuation', label: 'Inventory Valuation' },
  { key: 'stock-by-location', label: 'Stock by Location' },
  { key: 'product-movements', label: 'Product Movements' },
  { key: 'movement-ledger', label: 'Movement Ledger' },
  { key: 'inventory-variance', label: 'Count Variance' },
  { key: 'stock-transfer-activity', label: 'Stock Transfers' },
  { key: 'requisition-activity', label: 'Requisitions' },
  { key: 'procurement-summary', label: 'Procurement Summary' },
  { key: 'purchase-order-commitments', label: 'PO Commitments' },
  { key: 'purchasing-spend', label: 'Purchasing & Spend' },
  { key: 'low-stock', label: 'Low Stock' },
  { key: 'slow-moving', label: 'Slow / Non-moving' },
  { key: 'usage-summary', label: 'Usage & Consumption' },
  { key: 'supplier-performance', label: 'Supplier Performance' },
  { key: 'expiry-risk', label: 'Expiry & Lot Risk' },
  { key: 'forecast', label: 'Forecast' }
];

const REPORT_ICONS: Record<ReportTab, string> = {
  'inventory-valuation': '/reports',
  'stock-by-location': '/storage-locations',
  'product-movements': '/stock-movements',
  'movement-ledger': '/stock-movements',
  'inventory-variance': '/inventory-controls',
  'stock-transfer-activity': '/stock-transfers',
  'requisition-activity': '/inventory-requisitions',
  'procurement-summary': '/shipments',
  'purchase-order-commitments': '/purchase-orders',
  'purchasing-spend': '/purchase-orders',
  'low-stock': '/replenishment-planning',
  'slow-moving': '/replenishment-planning',
  'usage-summary': '/inventory-usage',
  'supplier-performance': '/suppliers',
  'expiry-risk': '/alerts',
  forecast: '/probabilistic-forecasting'
};

const REPORT_LABELS: Record<ReportTab, string> = {
  'inventory-valuation': 'Inventory valuation report',
  'stock-by-location': 'Stock by location report',
  'product-movements': 'Product movements report',
  'movement-ledger': 'Stock movement ledger report',
  'inventory-variance': 'Count and adjustment variance report',
  'stock-transfer-activity': 'Stock transfer activity report',
  'requisition-activity': 'Inventory requisition activity report',
  'procurement-summary': 'Procurement summary report',
  'purchase-order-commitments': 'Purchase order commitments report',
  'purchasing-spend': 'Purchasing and spend report',
  'low-stock': 'Low stock and reorder report',
  'slow-moving': 'Slow and non-moving stock report',
  'usage-summary': 'Usage and consumption report',
  'supplier-performance': 'Supplier performance report',
  'expiry-risk': 'Expiry and lot risk report',
  forecast: 'Demand forecast report'
};

const REPORT_DESCRIPTIONS: Record<ReportTab, string> = {
  'inventory-valuation': 'Estimated stock value by product and storage location in the tenant inventory currency.',
  'stock-by-location': 'Stock positions grouped by storage location, with quantities kept separate by product unit.',
  'product-movements': 'Product-level movement counts and quantity increases/decreases for the selected filters.',
  'movement-ledger': 'Chronological stock transactions with location, actor, movement type, reason, and source reference.',
  'inventory-variance': 'Cycle-count variances and posted manual stock adjustments for inventory accuracy review.',
  'stock-transfer-activity': 'Inventory transfers between storage locations, including status, quantities, actor, and execution timing.',
  'requisition-activity': 'Internal inventory requisitions by department, status, need date, fulfillment progress, and source/target location.',
  'procurement-summary': 'Shipment status, receiving totals, and discrepancy quantities across the selected procurement activity.',
  'purchase-order-commitments': 'Open or historical purchase-order commitments, receiving progress, expected dates, and known outstanding value.',
  'purchasing-spend': 'Approved, matched, and paid supplier-invoice lines with quantities, costs, and currencies kept explicit.',
  'low-stock': 'Product minimum-stock shortages plus active location par-level shortages, with replenishment context.',
  'slow-moving': 'Positive stock that has had no stock-movement activity within the selected inactivity threshold.',
  'usage-summary': 'Non-reversed inventory consumption summarized by product for the selected period.',
  'supplier-performance': 'Supplier delivery reliability, fulfillment, discrepancy, return, and shipment performance for the selected period.',
  'expiry-risk': 'Positive-balance lots that are already expired or will expire within the selected horizon.',
  forecast: 'Demand forecast from recent consumption and fulfillment stock movements over the last 30 days.'
};

function getReportLabel(report: ReportTab): string {
  return REPORT_LABELS[report];
}

function getReportFilename(report: ReportTab, format: ExportFormat): string {
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
    const normalized = typeof value === 'string' ? value.trim() : value;
    if (normalized !== null && normalized !== undefined && normalized !== '') searchParams.set(key, String(normalized));
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

type Ui = (englishText: string) => string;

function formatNumber(value: number | string | null | undefined, locale: AppLocale, maximumFractionDigits = 2): string {
  return formatLocalizedNumber(toNumber(value), locale, { maximumFractionDigits });
}

function formatSignedQuantity(value: number | string | null | undefined, locale: AppLocale, ui: Ui, unit?: string | null): string {
  const numeric = toNumber(value);
  const prefix = numeric > 0 ? '+' : '';
  return `${prefix}${formatNumber(numeric, locale)} ${unit || ui('units')}`;
}

function formatCostAmount(value: number | string | null | undefined, currency: string | null | undefined, locale: AppLocale): string {
  if (value === null || value === undefined || value === '') return '—';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  try {
    return formatLocalizedCurrency(amount, normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 2 });
  } catch {
    return formatCurrencyAmount(value, currency);
  }
}

function formatDateTime(value: string | null | undefined, locale: AppLocale): string {
  return value ? formatLocalizedDateTime(value, locale) : '—';
}

function formatDate(value: string | null | undefined, locale: AppLocale): string {
  return value ? formatLocalizedDate(value, locale) : '—';
}

function formatCostSource(value: string | null | undefined, ui: Ui): string {
  switch (value) {
    case 'stock_movement': return ui('Stock movement');
    case 'shipment_item_unit_cost': return ui('Shipment receipt');
    case 'product_standard': return ui('Product standard cost');
    case 'no_cost': return ui('No cost available');
    default: return value || '—';
  }
}

function formatQuantityByUnit(
  quantities: Record<string, number | string> | null | undefined,
  fallbackTotal: number | string | null | undefined,
  locale: AppLocale,
  ui: Ui
): string {
  const entries = Object.entries(quantities || {}).filter(([, quantity]) => Number.isFinite(Number(quantity)));
  if (entries.length > 0) {
    return entries
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([unit, quantity]) => `${formatNumber(quantity, locale)} ${unit}`)
      .join(', ');
  }
  return fallbackTotal === undefined || fallbackTotal === null
    ? ui('No quantity recorded')
    : ui('{quantity} (unit breakdown unavailable)').replace('{quantity}', formatNumber(fallbackTotal, locale));
}

function formatPercent(value: number | string | null | undefined, locale: AppLocale, ui: Ui): string {
  if (value === null || value === undefined || value === '') return ui('Not enough evidence');
  return ui('{percent}%').replace('{percent}', formatNumber(value, locale, 1));
}

const KNOWN_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', approved: 'Approved', completed: 'Completed', cancelled: 'Cancelled',
  executed: 'Executed', pending: 'Pending', partial: 'Partial', received: 'Received', rejected: 'Rejected',
  fulfilled: 'Fulfilled', partially_fulfilled: 'Partially fulfilled', matched: 'Matched', paid: 'Paid', open: 'Open',
  active: 'Active', expired: 'Expired', due_soon: 'Due soon', upcoming: 'Upcoming'
};

function displayRepositoryActor(value: string | null | undefined, ui: (text: string) => string, fallback = 'Historical actor unavailable'): string {
  const normalized = value?.trim();
  if (normalized === 'System' || normalized === 'Support/System') return ui(normalized);
  return normalized || ui(fallback);
}

function displayStockTransferCancellation(value: string | null | undefined, isSystem: boolean | undefined, ui: (text: string) => string): string {
  const normalized = value?.trim();
  if (!normalized) return '-';
  return isSystem ? ui(normalized) : normalized;
}

function formatStatus(value: string | null | undefined, ui: Ui): string {
  if (!value) return '—';
  const known = KNOWN_STATUS_LABELS[value];
  return known ? ui(known) : value;
}

function formatPurchaseOrderProgress(quantities: PurchaseOrderQuantityByUnit | null | undefined, locale: AppLocale, ui: Ui): string {
  const entries = Object.entries(quantities || {});
  if (!entries.length) return ui('No item quantities');
  return entries.sort(([a], [b]) => a.localeCompare(b)).map(([unit, values]) =>
    ui('{unit}: {ordered} ordered / {received} received / {remaining} remaining')
      .replace('{unit}', unit)
      .replace('{ordered}', formatNumber(values.ordered_quantity, locale))
      .replace('{received}', formatNumber(values.received_quantity, locale))
      .replace('{remaining}', formatNumber(values.remaining_quantity, locale))
  ).join(' · ');
}

function formatRequisitionProgress(quantities: RequisitionQuantityByUnit | null | undefined, locale: AppLocale, ui: Ui): string {
  const entries = Object.entries(quantities || {});
  if (!entries.length) return ui('No item quantities');
  return entries.sort(([a], [b]) => a.localeCompare(b)).map(([unit, values]) =>
    ui('{unit}: {requested} requested / {fulfilled} fulfilled / {remaining} remaining')
      .replace('{unit}', unit)
      .replace('{requested}', formatNumber(values.requested_quantity, locale))
      .replace('{fulfilled}', formatNumber(values.fulfilled_quantity, locale))
      .replace('{remaining}', formatNumber(values.remaining_quantity, locale))
  ).join(' · ');
}

function getReadableError(error: unknown, ui: Ui): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return ui('Unknown error');
}

function isFeatureEntitlementError(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'TENANT_FEATURE_NOT_ENTITLED';
}

function isPermissionDeniedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && !isFeatureEntitlementError(error);
}

function humanizeMovementType(value: string | null | undefined, ui: Ui): string {
  if (!value) return '—';
  const configured = MOVEMENT_TYPE_OPTIONS.find(([key]) => key === value);
  if (configured) return ui(configured[1]);
  return value;
}

function localizeMovementLedgerText(value: string | null | undefined, ui: Ui): string {
  if (!value) return '—';
  for (const prefix of ['Fulfilled reservation', 'Supplier return', 'Requisition', 'Reservation', 'Fulfilled', 'Order']) {
    if (value === prefix) return ui(prefix);
    if (value.startsWith(`${prefix} `)) return `${ui(prefix)} ${value.slice(prefix.length + 1)}`;
  }
  if (value === 'Reversed') return ui('Reversed');
  if (value.startsWith('Reversed ')) {
    const detail = value.slice('Reversed '.length);
    return `${ui('Reversed')} ${ui(detail)}`;
  }
  if (value === 'Return') return ui('Return');
  if (value.startsWith('Return ')) {
    const [reference, condition] = value.slice('Return '.length).split(' · ', 2);
    return `${ui('Return')} ${reference}${condition ? ` · ${ui(condition)}` : ''}`;
  }
  if (['Stock transfer', 'Opening stock import', 'Expiry processing', 'Lot hold', 'Lot hold release', 'Quarantine release', 'No linked workflow', 'Historical shipment reference unavailable', 'Legacy technical reason unavailable', 'Cycle count'].includes(value)) {
    return ui(value);
  }
  return ui(value);
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
  total_increase: number | string | null;
  total_decrease: number | string | null;
  quantity_evidence_status?: 'proven' | 'mixed' | 'unproven' | 'no_movements';
  last_movement_at?: string | null;
};

type MovementLedgerRow = {
  movement_id: string;
  created_at: string;
  product_name?: string | null;
  product_unit?: string | null;
  storage_location_name?: string | null;
  quantity_change: number | string;
  movement_type?: string | null;
  reason?: string | null;
  reason_is_operator_evidence?: boolean;
  receiving_note?: string | null;
  actor_name?: string | null;
  actor_label?: string | null;
  reference_label?: string | null;
};

type InventoryVarianceRow = {
  record_type: string;
  record_id: string;
  product_id: string;
  product_name?: string | null;
  product_category?: string | null;
  product_unit?: string | null;
  storage_location_name?: string | null;
  expected_quantity?: number | string | null;
  counted_quantity?: number | string | null;
  variance_quantity?: number | string | null;
  status?: string | null;
  reason?: string | null;
  actor_name?: string | null;
  actor_label?: string | null;
  created_at: string;
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

type PurchasingSpendRow = {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_status: string;
  supplier_id: string;
  supplier_name: string;
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  quantity: number | string;
  unit_cost: number | string;
  line_amount: number | string;
  currency?: string | null;
};

type LowStockRow = {
  par_level_id?: string | null;
  threshold_scope: 'product_minimum' | 'location_par_level' | string;
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  storage_location_name?: string | null;
  department?: string | null;
  minimum_stock: number | string;
  target_stock?: number | string | null;
  current_stock: number | string;
  shortage_quantity: number | string;
  replenish_to_target_quantity?: number | string | null;
  supplier_name?: string | null;
};

type SlowMovingRow = {
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  current_stock: number | string;
  last_movement_at?: string | null;
  days_since_movement?: number | string | null;
  supplier_name?: string | null;
  stock_updated_at?: string | null;
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
  timing_evidence_shipments: number | string;
  on_time_received_shipments: number | string;
  late_received_shipments: number | string;
  on_time_delivery_rate_pct?: number | string | null;
  average_delivery_delay_days?: number | string | null;
  line_fulfillment_rate_pct?: number | string | null;
  discrepancy_line_rate_pct?: number | string | null;
  supplier_returns: number | string;
  dispatched_or_completed_returns: number | string;
  last_received_at?: string | null;
  last_received_date?: string | null;
};

type ReportFilterOptions = {
  categories: string[];
  products: string[];
  locations: string[];
  suppliers: string[];
  departments: string[];
};

type PurchaseOrderQuantityByUnit = Record<string, {
  ordered_quantity: number | string;
  received_quantity: number | string;
  remaining_quantity: number | string;
}>;

type PurchaseOrderCommitmentRow = {
  purchase_order_id: string;
  po_number: string;
  status: string;
  expected_delivery_date?: string | null;
  created_at: string;
  supplier_id: string;
  supplier_name: string;
  currency?: string | null;
  line_count: number | string;
  unpriced_line_count: number | string;
  known_ordered_value: number | string;
  known_received_value: number | string;
  known_remaining_value: number | string;
  quantity_by_unit?: PurchaseOrderQuantityByUnit;
  overdue: boolean;
};

type StockTransferActivityRow = {
  transfer_id: string;
  status: string;
  created_at: string;
  executed_at?: string | null;
  cancellation_reason?: string | null;
  cancellation_reason_is_system?: boolean;
  from_location: string;
  to_location: string;
  item_count: number | string;
  quantity_by_unit?: Record<string, number | string>;
  created_by?: string | null;
};

type RequisitionQuantityByUnit = Record<string, {
  requested_quantity: number | string;
  fulfilled_quantity: number | string;
  remaining_quantity: number | string;
}>;

type RequisitionActivityRow = {
  requisition_id: string;
  requisition_number: string;
  status: string;
  priority?: string | null;
  requesting_department?: string | null;
  target_department?: string | null;
  needed_by?: string | null;
  created_at: string;
  source_location?: string | null;
  target_location?: string | null;
  item_count: number | string;
  quantity_by_unit?: RequisitionQuantityByUnit;
  created_by?: string | null;
  overdue: boolean;
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

async function fetchInventoryValuation(filters: Pick<TextFilters, 'category' | 'location'> = { category: '', location: '' }): Promise<InventoryValuationReport> {
  return apiRequest<InventoryValuationReport>(`/reports/inventory-valuation${buildQueryString(filters)}`);
}
async function fetchStockByLocation(filters: Pick<TextFilters, 'category' | 'location'>): Promise<StockByLocationRow[]> {
  return apiRequest<StockByLocationRow[]>(`/reports/stock-by-location${buildQueryString(filters)}`);
}
async function fetchProductMovements(filters: DateRangeFilters & Pick<TextFilters, 'category' | 'product'> & { limit: number }): Promise<ProductMovementRow[]> {
  return apiRequest<ProductMovementRow[]>(`/reports/product-movements${buildQueryString(filters)}`);
}
async function fetchMovementLedger(filters: DateRangeFilters & Pick<TextFilters, 'product' | 'location'> & { movement_type: string; limit: number }): Promise<MovementLedgerRow[]> {
  return apiRequest<MovementLedgerRow[]>(`/reports/movement-ledger${buildQueryString(filters)}`);
}
async function fetchInventoryVariance(filters: DateRangeFilters & Pick<TextFilters, 'product' | 'location'> & { limit: number }): Promise<InventoryVarianceRow[]> {
  return apiRequest<InventoryVarianceRow[]>(`/reports/inventory-variance${buildQueryString(filters)}`);
}
async function fetchProcurementSummary(filters: DateRangeFilters & Pick<TextFilters, 'supplier'> = { from: '', to: '', supplier: '' }): Promise<ProcurementSummaryReport> {
  return apiRequest<ProcurementSummaryReport>(`/reports/procurement-summary${buildQueryString(filters)}`);
}
async function fetchPurchasingSpend(filters: DateRangeFilters & Pick<TextFilters, 'supplier' | 'category' | 'product'> & { limit: number }): Promise<PurchasingSpendRow[]> {
  return apiRequest<PurchasingSpendRow[]>(`/reports/purchasing-spend${buildQueryString(filters)}`);
}
async function fetchPurchaseOrderCommitments(filters: DateRangeFilters & Pick<TextFilters, 'supplier' | 'product'> & { status: string; limit: number }): Promise<PurchaseOrderCommitmentRow[]> {
  return apiRequest<PurchaseOrderCommitmentRow[]>(`/reports/purchase-order-commitments${buildQueryString(filters)}`);
}
async function fetchStockTransferActivity(filters: DateRangeFilters & Pick<TextFilters, 'location'> & { status: string; limit: number }): Promise<StockTransferActivityRow[]> {
  return apiRequest<StockTransferActivityRow[]>(`/reports/stock-transfer-activity${buildQueryString(filters)}`);
}
async function fetchRequisitionActivity(filters: DateRangeFilters & { department: string; status: string; limit: number }): Promise<RequisitionActivityRow[]> {
  return apiRequest<RequisitionActivityRow[]>(`/reports/requisition-activity${buildQueryString(filters)}`);
}
async function fetchReportFilterOptions(): Promise<ReportFilterOptions> {
  return apiRequest<ReportFilterOptions>('/reports/filter-options');
}
async function fetchLowStock(filters: { category: string; supplier: string; location?: string; scope?: 'product' | 'par' | 'both' } = { category: '', supplier: '' }): Promise<LowStockRow[]> {
  return apiRequest<LowStockRow[]>(`/reports/low-stock${buildQueryString(filters)}`);
}
async function fetchSlowMoving(filters: Pick<TextFilters, 'category' | 'product'> & { days: number; limit: number }): Promise<SlowMovingRow[]> {
  return apiRequest<SlowMovingRow[]>(`/reports/slow-moving${buildQueryString(filters)}`);
}
async function fetchUsageSummary(filters: DateRangeFilters & Pick<TextFilters, 'category' | 'product' | 'location'> & { days: number }): Promise<UsageSummaryRow[]> {
  return apiRequest<UsageSummaryRow[]>(`/reports/usage-summary${buildQueryString(filters)}`);
}
async function fetchSupplierPerformance(filters: DateRangeFilters & Pick<TextFilters, 'supplier'> & { limit: number }): Promise<SupplierPerformanceRow[]> {
  return apiRequest<SupplierPerformanceRow[]>(`/reports/supplier-performance${buildQueryString(filters)}`);
}
async function fetchExpiryRisk(filters: Pick<TextFilters, 'category' | 'location'> & { days: number }): Promise<ExpiryRiskRow[]> {
  return apiRequest<ExpiryRiskRow[]>(`/reports/expiry-risk${buildQueryString(filters)}`);
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
  const { ui } = useAppTranslation();
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
        title={ui(REPORT_TABS.find((item) => item.key === tab)?.label || getReportLabel(tab))}
        description={ui(REPORT_DESCRIPTIONS[tab])}
        actions={<div className="reports-actions" data-report-controls="true">{actions}</div>}
      />
      {filters ? <div className="reports-filter-bar" data-report-controls="true">{filters}</div> : null}
      <div className="reports-body">{children}</div>
    </section>
  );
}

function TextFilterField({ label, value, placeholder, onChange, disabled, compact = true }: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <label className={`reports-field${compact ? ' reports-field--compact' : ''}`}>
      <span>{label}</span>
      <input
        value={value}
        maxLength={MAX_REPORT_FILTER_LENGTH}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </label>
  );
}

function ChoiceFilterField({ label, value, placeholder, options, onChange, disabled, compact = true }: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
  disabled: boolean;
  compact?: boolean;
}) {
  if (!options.length) {
    return <TextFilterField label={label} value={value} placeholder={placeholder} onChange={onChange} disabled={disabled} compact={compact} />;
  }
  return (
    <label className={`reports-field${compact ? ' reports-field--compact' : ''}`}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function AutocompleteFilterField({ label, value, placeholder, options, onChange, disabled, listId }: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
  disabled: boolean;
  listId: string;
}) {
  return (
    <label className="reports-field reports-field--compact">
      <span>{label}</span>
      <input
        value={value}
        maxLength={MAX_REPORT_FILTER_LENGTH}
        placeholder={placeholder}
        list={options.length ? listId : undefined}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
      {options.length ? <datalist id={listId}>{options.map((option) => <option key={option} value={option} />)}</datalist> : null}
    </label>
  );
}

function DateRangeFields({ from, to, onFromChange, onToChange, disabled }: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  disabled: boolean;
}) {
  const { ui } = useAppTranslation();
  return (
    <>
      <label className="reports-field reports-field--date">
        <span>{ui("From")}</span>
        <input type="date" value={from} max={to || undefined} onChange={(event) => onFromChange(event.target.value)} disabled={disabled} />
      </label>
      <label className="reports-field reports-field--date">
        <span>{ui("To")}</span>
        <input type="date" value={to} min={from || undefined} onChange={(event) => onToChange(event.target.value)} disabled={disabled} />
      </label>
    </>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="app-empty-state reports-empty">{message}</div>;
}

function ErrorState({ message }: { message: string }) {
  return <div className="app-error-state reports-error">{message}</div>;
}

function LastRefreshed({ timestamp }: { timestamp: number }) {
  const { locale, ui } = useAppTranslation();
  return <div className="reports-refreshed">{ui('Last refreshed: {timestamp}').replace(ui("{timestamp}"), timestamp ? formatDateTime(new Date(timestamp).toISOString(), locale) : ui('Not loaded yet'))}</div>;
}

function RiskBadge({ status }: { status: string }) {
  const { ui } = useAppTranslation();
  const label = status === 'expired' ? ui('Expired') : status === 'due_soon' ? ui('Due soon') : ui('Upcoming');
  return <span className={`reports-risk reports-risk--${status}`}>{label}</span>;
}

export default function ReportsPage() {
  const { locale, ui } = useAppTranslation();
  const [activeTab, setActiveTab] = useState<ReportTab>('inventory-valuation');
  const [inventoryFilters, setInventoryFilters] = useState({ category: '', location: '' });
  const [stockFilters, setStockFilters] = useState({ category: '', location: '' });
  const [movementFilters, setMovementFilters] = useState({ from: '', to: '', category: '', product: '', limit: 50 });
  const [ledgerFilters, setLedgerFilters] = useState({ from: '', to: '', product: '', location: '', movement_type: '', limit: 100 });
  const [varianceFilters, setVarianceFilters] = useState({ from: '', to: '', product: '', location: '', limit: 100 });
  const [transferFilters, setTransferFilters] = useState({ from: '', to: '', location: '', status: 'all', limit: 100 });
  const [requisitionFilters, setRequisitionFilters] = useState({ from: '', to: '', department: '', status: 'all', limit: 100 });
  const [procurementFilters, setProcurementFilters] = useState({ from: '', to: '', supplier: '' });
  const [poCommitmentFilters, setPoCommitmentFilters] = useState({ from: '', to: '', supplier: '', product: '', status: 'open', limit: 100 });
  const [spendFilters, setSpendFilters] = useState({ from: '', to: '', supplier: '', category: '', product: '', limit: 100 });
  const [lowStockFilters, setLowStockFilters] = useState({ category: '', supplier: '', location: '', scope: 'both' as 'product' | 'par' | 'both' });
  const [slowFilters, setSlowFilters] = useState({ days: 90, category: '', product: '', limit: 100 });
  const [usageFilters, setUsageFilters] = useState({ days: 30, from: '', to: '', category: '', product: '', location: '' });
  const [supplierFilters, setSupplierFilters] = useState({ from: '', to: '', supplier: '', limit: 100 });
  const [expiryFilters, setExpiryFilters] = useState({ days: 90, category: '', location: '' });
  const [downloadingReport, setDownloadingReport] = useState<ReportTab | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<ExportFormat | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<{ report: ReportTab; format: ExportFormat; metadata: ApiDownloadMetadata } | null>(null);

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

  const filterOptionsQuery = useQuery({
    queryKey: ['reports', 'filter-options'],
    queryFn: fetchReportFilterOptions,
    enabled: reportsFeatureReady,
    staleTime: 5 * 60 * 1000
  });
  const filterOptions: ReportFilterOptions = filterOptionsQuery.data ?? { categories: [], products: [], locations: [], suppliers: [], departments: [] };

  // Overview cards deliberately use unfiltered queries so report filters never distort page-level KPIs.
  const inventoryOverviewQuery = useQuery({
    queryKey: ['reports', 'overview', 'inventory-valuation'],
    queryFn: () => fetchInventoryValuation(),
    enabled: reportsFeatureReady
  });
  const procurementOverviewQuery = useQuery({
    queryKey: ['reports', 'overview', 'procurement-summary'],
    queryFn: () => fetchProcurementSummary(),
    enabled: reportsFeatureReady
  });
  const lowStockOverviewQuery = useQuery({
    queryKey: ['reports', 'overview', 'low-stock'],
    queryFn: () => fetchLowStock(),
    enabled: reportsFeatureReady
  });

  const inventoryValuationQuery = useQuery({
    queryKey: ['reports', 'inventory-valuation', inventoryFilters],
    queryFn: () => fetchInventoryValuation(inventoryFilters),
    enabled: reportsFeatureReady && activeTab === 'inventory-valuation'
  });
  const stockByLocationQuery = useQuery({
    queryKey: ['reports', 'stock-by-location', stockFilters],
    queryFn: () => fetchStockByLocation(stockFilters),
    enabled: reportsFeatureReady && activeTab === 'stock-by-location'
  });
  const productMovementsQuery = useQuery({
    queryKey: ['reports', 'product-movements', movementFilters],
    queryFn: () => fetchProductMovements(movementFilters),
    enabled: reportsFeatureReady && activeTab === 'product-movements'
  });
  const movementLedgerQuery = useQuery({
    queryKey: ['reports', 'movement-ledger', ledgerFilters],
    queryFn: () => fetchMovementLedger(ledgerFilters),
    enabled: reportsFeatureReady && activeTab === 'movement-ledger'
  });
  const inventoryVarianceQuery = useQuery({
    queryKey: ['reports', 'inventory-variance', varianceFilters],
    queryFn: () => fetchInventoryVariance(varianceFilters),
    enabled: reportsFeatureReady && activeTab === 'inventory-variance'
  });
  const stockTransferActivityQuery = useQuery({
    queryKey: ['reports', 'stock-transfer-activity', transferFilters],
    queryFn: () => fetchStockTransferActivity(transferFilters),
    enabled: reportsFeatureReady && activeTab === 'stock-transfer-activity'
  });
  const requisitionActivityQuery = useQuery({
    queryKey: ['reports', 'requisition-activity', requisitionFilters],
    queryFn: () => fetchRequisitionActivity(requisitionFilters),
    enabled: reportsFeatureReady && activeTab === 'requisition-activity'
  });
  const procurementSummaryQuery = useQuery({
    queryKey: ['reports', 'procurement-summary', procurementFilters],
    queryFn: () => fetchProcurementSummary(procurementFilters),
    enabled: reportsFeatureReady && activeTab === 'procurement-summary'
  });
  const purchaseOrderCommitmentsQuery = useQuery({
    queryKey: ['reports', 'purchase-order-commitments', poCommitmentFilters],
    queryFn: () => fetchPurchaseOrderCommitments(poCommitmentFilters),
    enabled: reportsFeatureReady && activeTab === 'purchase-order-commitments'
  });
  const purchasingSpendQuery = useQuery({
    queryKey: ['reports', 'purchasing-spend', spendFilters],
    queryFn: () => fetchPurchasingSpend(spendFilters),
    enabled: reportsFeatureReady && activeTab === 'purchasing-spend'
  });
  const lowStockQuery = useQuery({
    queryKey: ['reports', 'low-stock', lowStockFilters],
    queryFn: () => fetchLowStock(lowStockFilters),
    enabled: reportsFeatureReady && activeTab === 'low-stock'
  });
  const slowMovingQuery = useQuery({
    queryKey: ['reports', 'slow-moving', slowFilters],
    queryFn: () => fetchSlowMoving(slowFilters),
    enabled: reportsFeatureReady && activeTab === 'slow-moving'
  });
  const usageSummaryQuery = useQuery({
    queryKey: ['reports', 'usage-summary', usageFilters],
    queryFn: () => fetchUsageSummary(usageFilters),
    enabled: reportsFeatureReady && activeTab === 'usage-summary'
  });
  const supplierPerformanceQuery = useQuery({
    queryKey: ['reports', 'supplier-performance', supplierFilters],
    queryFn: () => fetchSupplierPerformance(supplierFilters),
    enabled: reportsFeatureReady && activeTab === 'supplier-performance'
  });
  const expiryRiskQuery = useQuery({
    queryKey: ['reports', 'expiry-risk', expiryFilters],
    queryFn: () => fetchExpiryRisk(expiryFilters),
    enabled: reportsFeatureReady && activeTab === 'expiry-risk'
  });
  const forecastQuery = useQuery({
    queryKey: ['reports', 'forecast'],
    queryFn: fetchForecast,
    enabled: forecastFeatureReady && activeTab === 'forecast'
  });

  const reportErrors = [
    inventoryOverviewQuery.error,
    procurementOverviewQuery.error,
    lowStockOverviewQuery.error,
    inventoryValuationQuery.error,
    stockByLocationQuery.error,
    productMovementsQuery.error,
    movementLedgerQuery.error,
    inventoryVarianceQuery.error,
    stockTransferActivityQuery.error,
    requisitionActivityQuery.error,
    procurementSummaryQuery.error,
    purchaseOrderCommitmentsQuery.error,
    purchasingSpendQuery.error,
    lowStockQuery.error,
    slowMovingQuery.error,
    usageSummaryQuery.error,
    supplierPerformanceQuery.error,
    expiryRiskQuery.error
  ];
  const reportsDeniedByFeature = reportErrors.some(isFeatureEntitlementError);
  const anyForbidden = reportErrors.some(isPermissionDeniedError);
  const forecastDeniedByFeature = isFeatureEntitlementError(forecastQuery.error);
  const forecastDeniedByPermission = isPermissionDeniedError(forecastQuery.error);
  const forecastUnavailableReason = !canViewInsights || forecastDeniedByPermission
    ? ui('Forecast access requires Insights - Read in addition to Reports - Read.')
    : (forecastingEntitlement && !forecastingEntitlement.allowed) || forecastDeniedByFeature
      ? ui('Forecasting is not enabled for this tenant subscription.')
      : null;

  const inventoryRows = inventoryValuationQuery.data?.rows ?? [];
  const locationRows = stockByLocationQuery.data ?? [];
  const movementRows = productMovementsQuery.data ?? [];
  const ledgerRows = movementLedgerQuery.data ?? [];
  const varianceRows = inventoryVarianceQuery.data ?? [];
  const transferRows = stockTransferActivityQuery.data ?? [];
  const requisitionRows = requisitionActivityQuery.data ?? [];
  const poCommitmentRows = purchaseOrderCommitmentsQuery.data ?? [];
  const spendRows = purchasingSpendQuery.data ?? [];
  const lowStockRows = lowStockQuery.data ?? [];
  const slowRows = slowMovingQuery.data ?? [];
  const usageRows = usageSummaryQuery.data ?? [];
  const supplierRows = supplierPerformanceQuery.data ?? [];
  const expiryRows = expiryRiskQuery.data ?? [];
  const forecastRows = forecastQuery.data ?? [];
  const procurementSummary = procurementSummaryQuery.data;

  const availableReportCount = forecastFeatureReady ? REPORT_TABS.length : REPORT_TABS.length - 1;
  const activeLabel = ui(REPORT_TABS.find((item) => item.key === activeTab)?.label || 'Report');
  const isExporting = downloadingReport !== null;
  const keyboardTabs = useMemo(
    () => REPORT_TABS.filter((item) => item.key !== 'forecast' || forecastFeatureReady),
    [forecastFeatureReady]
  );

  const clearDownloadStatus = () => {
    setDownloadError(null);
    setDownloadInfo(null);
  };

  const changeActiveTab = (tab: ReportTab) => {
    if (isExporting) return;
    if (tab === 'forecast' && !forecastFeatureReady) return;
    clearDownloadStatus();
    setActiveTab(tab);
  };

  const focusReportTab = (tab: ReportTab) => {
    window.requestAnimationFrame(() => document.getElementById(getReportTabId(tab))?.focus());
  };

  const handleReportTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: ReportTab) => {
    if (isExporting) return;
    const currentIndex = keyboardTabs.findIndex((item) => item.key === tab);
    if (currentIndex < 0) return;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % keyboardTabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + keyboardTabs.length) % keyboardTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = keyboardTabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = keyboardTabs[nextIndex].key;
    changeActiveTab(nextTab);
    focusReportTab(nextTab);
  };

  const getExportPath = (report: ReportTab, format: ExportFormat): string => {
    switch (report) {
      case 'inventory-valuation': return `/reports/inventory-valuation${buildQueryString({ ...inventoryFilters, format })}`;
      case 'stock-by-location': return `/reports/stock-by-location${buildQueryString({ ...stockFilters, format })}`;
      case 'product-movements': return `/reports/product-movements${buildQueryString({ ...movementFilters, format })}`;
      case 'movement-ledger': return `/reports/movement-ledger${buildQueryString({ ...ledgerFilters, format })}`;
      case 'inventory-variance': return `/reports/inventory-variance${buildQueryString({ ...varianceFilters, format })}`;
      case 'stock-transfer-activity': return `/reports/stock-transfer-activity${buildQueryString({ ...transferFilters, format })}`;
      case 'requisition-activity': return `/reports/requisition-activity${buildQueryString({ ...requisitionFilters, format })}`;
      case 'procurement-summary': return `/reports/procurement-summary${buildQueryString({ ...procurementFilters, format })}`;
      case 'purchase-order-commitments': return `/reports/purchase-order-commitments${buildQueryString({ ...poCommitmentFilters, format })}`;
      case 'purchasing-spend': return `/reports/purchasing-spend${buildQueryString({ ...spendFilters, format })}`;
      case 'low-stock': return `/reports/low-stock${buildQueryString({ ...lowStockFilters, format })}`;
      case 'slow-moving': return `/reports/slow-moving${buildQueryString({ ...slowFilters, format })}`;
      case 'usage-summary': return `/reports/usage-summary${buildQueryString({ ...usageFilters, format })}`;
      case 'supplier-performance': return `/reports/supplier-performance${buildQueryString({ ...supplierFilters, format })}`;
      case 'expiry-risk': return `/reports/expiry-risk${buildQueryString({ ...expiryFilters, format })}`;
      case 'forecast': return `/reports/forecast${buildQueryString({ format })}`;
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
      setDownloadError(getReadableError(error, ui));
    } finally {
      setDownloadingReport(null);
      setDownloadFormat(null);
    }
  };

  const printReport = (report: ReportTab) => {
    clearDownloadStatus();
    const panel = document.getElementById(getReportPanelId(report));
    if (!panel) {
      setDownloadError(ui('The report is not ready to print yet.'));
      return;
    }
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      setDownloadError(ui('The browser blocked the print window. Allow pop-ups for this site and try again.'));
      return;
    }
    printWindow.opener = null;
    printWindow.document.title = ui('{report} - Inventory Operations').replace('{report}', activeLabel);
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
      case 'movement-ledger': void movementLedgerQuery.refetch(); break;
      case 'inventory-variance': void inventoryVarianceQuery.refetch(); break;
      case 'stock-transfer-activity': void stockTransferActivityQuery.refetch(); break;
      case 'requisition-activity': void requisitionActivityQuery.refetch(); break;
      case 'procurement-summary': void procurementSummaryQuery.refetch(); break;
      case 'purchase-order-commitments': void purchaseOrderCommitmentsQuery.refetch(); break;
      case 'purchasing-spend': void purchasingSpendQuery.refetch(); break;
      case 'low-stock': void lowStockQuery.refetch(); break;
      case 'slow-moving': void slowMovingQuery.refetch(); break;
      case 'usage-summary': void usageSummaryQuery.refetch(); break;
      case 'supplier-performance': void supplierPerformanceQuery.refetch(); break;
      case 'expiry-risk': void expiryRiskQuery.refetch(); break;
      case 'forecast': if (forecastFeatureReady) void forecastQuery.refetch(); break;
    }
  };

  const actionButtons = (report: ReportTab, isFetching: boolean, disabled = false) => (
    <>
      <button type="button" className="reports-button reports-button--secondary" disabled={isExporting || disabled || isFetching} onClick={() => refreshReport(report)}>
        {isFetching ? ui("Refreshing…") : ui("Refresh")}
      </button>
      <button type="button" className="reports-button reports-button--secondary" disabled={isExporting || disabled || isFetching} onClick={() => printReport(report)}>
        {ui("Print")}</button>
      <button type="button" className="reports-button reports-button--secondary" disabled={isExporting || disabled} aria-busy={downloadingReport === report && downloadFormat === 'pdf'} onClick={() => downloadReport(report, 'pdf')}>
        {downloadingReport === report && downloadFormat === 'pdf' ? ui("Creating PDF…") : ui("Download PDF")}
      </button>
      <button type="button" className="reports-button reports-button--primary" disabled={isExporting || disabled} aria-busy={downloadingReport === report && downloadFormat === 'csv'} onClick={() => downloadReport(report, 'csv')}>
        {downloadingReport === report && downloadFormat === 'csv' ? ui("Exporting…") : ui("Export CSV")}
      </button>
    </>
  );

  const updateAndClear = <T extends object>(setter: (value: T | ((previous: T) => T)) => void, key: keyof T, value: T[keyof T]) => {
    clearDownloadStatus();
    setter((previous) => ({ ...previous, [key]: value }));
  };

  if (anyForbidden) {
    return (
      <section className="app-warning-state reports-access-state">
        <h2>{ui("Reports access required")}</h2>
        <p>{ui('Your current access role ({role}) cannot read one or more tenant reporting datasets.').replace('{role}', currentAccessRoleLabel || ui('unknown'))}</p>
        <p>{ui("Ask a tenant administrator to review your Reports permissions.")}</p>
      </section>
    );
  }

  if (canReadTenantSubscriptionAccess && subscriptionAccessQuery.isLoading) {
    return <section className="app-panel app-panel--padded">{ui("Checking reporting access…")}</section>;
  }

  if ((reportsEntitlement && !reportsEntitlement.allowed) || reportsDeniedByFeature) {
    return (
      <section className="app-warning-state reports-access-state">
        <h2>{ui("Reports are not enabled")}</h2>
        <p>{ui("This tenant subscription does not currently include the Reports feature.")}</p>
      </section>
    );
  }

  return (
    <div className="reports-page io-operational-page io-workspace-page">
      <OperationalWorkspaceHero
        iconPath="/reports"
        eyebrow={ui("Reporting & exports")}
        title={ui("Management reporting workspace")}
        description={ui("Run tenant-scoped inventory, movement, transfer, requisition, procurement, commitment, spend, usage, supplier, expiry, variance, and forecasting reports from live database records. Every report can be printed or exported for offline business use.")}
        meta={
          <>
            <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Read-only reporting")}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{ui("Print + PDF + CSV")}</OperationalWorkspaceMetaPill>
          </>
        }
        aside={<OperationalWorkspaceStatus value={availableReportCount} label={ui("report types available with current access")} />}
      />

      <OperationalWorkspaceStats ariaLabel={ui("Reporting overview")}>
        <OperationalWorkspaceStatCard label={ui("Available reports")} value={availableReportCount} helper={ui("Operational and management report types")} iconPath="/reports" tone="blue" />
        <OperationalWorkspaceStatCard
          label={ui("Estimated inventory value")}
          value={formatCostAmount(inventoryOverviewQuery.data?.totals.estimated_inventory_value, inventoryOverviewQuery.data?.totals.currency_code, locale)}
          helper={ui('{count} valuation rows').replace('{count}', formatNumber(inventoryOverviewQuery.data?.totals.row_count ?? 0, locale, 0))}
          iconPath="/stock"
          loading={inventoryOverviewQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Low-stock products")}
          value={lowStockOverviewQuery.data?.length ?? 0}
          helper={ui("Products below configured minimum")}
          iconPath="/replenishment-planning"
          tone={(lowStockOverviewQuery.data?.length ?? 0) > 0 ? 'warn' : 'good'}
          loading={lowStockOverviewQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Overdue shipments")}
          value={formatNumber(procurementOverviewQuery.data?.shipments.overdue_shipments, locale, 0)}
          helper={ui("Pending or partial past delivery date")}
          iconPath="/shipments"
          tone={toNumber(procurementOverviewQuery.data?.shipments.overdue_shipments) > 0 ? 'warn' : 'good'}
          loading={procurementOverviewQuery.isLoading}
        />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui("Reports")}>
        {REPORT_TABS.map((tab) => {
          const forecastDisabled = tab.key === 'forecast' && !forecastFeatureReady;
          return (
            <OperationalWorkspaceTab
              key={tab.key}
              id={getReportTabId(tab.key)}
              active={activeTab === tab.key}
              iconPath={REPORT_ICONS[tab.key]}
              label={ui(tab.label)}
              aria-controls={getReportPanelId(tab.key)}
              tabIndex={activeTab === tab.key ? 0 : -1}
              disabled={isExporting || forecastDisabled}
              title={forecastDisabled ? forecastUnavailableReason || undefined : undefined}
              onClick={() => changeActiveTab(tab.key)}
              onKeyDown={(event) => handleReportTabKeyDown(event, tab.key)}
            />
          );
        })}
      </OperationalWorkspaceTabs>

      {downloadError ? (
        <div className="app-error-state reports-export-status" role="alert" aria-live="assertive">
          <span><strong>{ui("Export/print failed:")}</strong> {downloadError}</span>
          <button type="button" className="reports-link-button" onClick={clearDownloadStatus}>{ui("Clear message")}</button>
        </div>
      ) : null}
      {downloadInfo ? (
        <div className="reports-export-success reports-export-status" role="status" aria-live="polite">
          <span>
            <strong>{ui('{format} ready:').replace('{format}', downloadInfo.format.toUpperCase())}</strong> {ui(getReportLabel(downloadInfo.report))}{ui('.')}
            {downloadInfo.metadata.exportedRows !== null ? ui(' {count} rows exported.').replace('{count}', formatNumber(downloadInfo.metadata.exportedRows, locale, 0)) : ''}
            {downloadInfo.metadata.wasRowLimited && downloadInfo.metadata.originalRows !== null && downloadInfo.metadata.rowLimit !== null
              ? ui(' Original result had {original} rows; the configured limit of {limit} was applied.')
                .replace('{original}', formatNumber(downloadInfo.metadata.originalRows, locale, 0))
                .replace('{limit}', formatNumber(downloadInfo.metadata.rowLimit, locale, 0))
              : ''}
          </span>
          <button type="button" className="reports-link-button" onClick={clearDownloadStatus}>{ui("Clear message")}</button>
        </div>
      ) : null}

      {activeTab === 'inventory-valuation' ? (
        <ReportPanel
          tab="inventory-valuation"
          actions={actionButtons('inventory-valuation', inventoryValuationQuery.isFetching)}
          filters={
            <>
              <ChoiceFilterField label={ui("Category")} value={inventoryFilters.category} placeholder={ui("All categories")} options={filterOptions.categories} disabled={isExporting} onChange={(value) => updateAndClear(setInventoryFilters, 'category', value)} />
              <ChoiceFilterField label={ui("Location")} value={inventoryFilters.location} placeholder={ui("All locations")} options={filterOptions.locations} disabled={isExporting} onChange={(value) => updateAndClear(setInventoryFilters, 'location', value)} />
              <div className="reports-filter-note">{ui("Filters apply to the on-screen report and PDF/CSV exports.")}</div>
            </>
          }
        >
          <LastRefreshed timestamp={inventoryValuationQuery.dataUpdatedAt} />
          <p className="reports-note">{ui("Foreign-currency receipt costs are preserved separately and are not silently converted.")}</p>
          {inventoryValuationQuery.isLoading ? <div>{ui("Loading inventory valuation…")}</div> : null}
          {inventoryValuationQuery.isError ? <ErrorState message={ui('Failed to load inventory valuation: {error}').replace('{error}', getReadableError(inventoryValuationQuery.error, ui))} /> : null}
          {!inventoryValuationQuery.isLoading && !inventoryValuationQuery.isError && inventoryRows.length === 0 ? <EmptyState message={ui("No stocked inventory rows matched these filters.")} /> : null}
          {inventoryRows.length > 0 ? (
            <div className="reports-table-wrap"><table className="reports-table"><thead><tr>
              <th>{ui("Product")}</th><th>{ui("Category")}</th><th>{ui("Location")}</th><th>{ui("Quantity")}</th><th>{ui("Unit cost")}</th><th>{ui("Cost source")}</th><th>{ui("Estimated value")}</th><th>{ui("Updated")}</th>
            </tr></thead><tbody>{inventoryRows.map((row) => <tr key={`${row.product_id}-${row.storage_location_id}`}>
              <td className="reports-strong">{row.product_name}</td><td>{row.product_category || '-'}</td><td>{row.storage_location_name}</td>
              <td>{formatNumber(row.quantity, locale)} {row.product_unit || ui("units")}</td><td>{formatCostAmount(row.estimated_unit_cost, row.currency_code, locale)}</td>
              <td>{formatCostSource(row.estimated_cost_source, ui)}</td><td className="reports-strong">{formatCostAmount(row.estimated_total_value, row.currency_code, locale)}</td><td>{formatDateTime(row.updated_at, locale)}</td>
            </tr>)}</tbody></table></div>
          ) : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'stock-by-location' ? (
        <ReportPanel
          tab="stock-by-location"
          actions={actionButtons('stock-by-location', stockByLocationQuery.isFetching)}
          filters={
            <>
              <ChoiceFilterField label={ui("Category")} value={stockFilters.category} placeholder={ui("All categories")} options={filterOptions.categories} disabled={isExporting} onChange={(value) => updateAndClear(setStockFilters, 'category', value)} />
              <ChoiceFilterField label={ui("Location")} value={stockFilters.location} placeholder={ui("All locations")} options={filterOptions.locations} disabled={isExporting} onChange={(value) => updateAndClear(setStockFilters, 'location', value)} />
            </>
          }
        >
          <LastRefreshed timestamp={stockByLocationQuery.dataUpdatedAt} />
          {stockByLocationQuery.isLoading ? <div>{ui("Loading stock by location…")}</div> : null}
          {stockByLocationQuery.isError ? <ErrorState message={ui('Failed to load stock by location: {error}').replace('{error}', getReadableError(stockByLocationQuery.error, ui))} /> : null}
          {!stockByLocationQuery.isLoading && !stockByLocationQuery.isError && locationRows.length === 0 ? <EmptyState message={ui("No stock locations matched these filters.")} /> : null}
          {locationRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Location")}</th><th>{ui("Temperature zone")}</th><th>{ui("Stock rows")}</th><th>{ui("Quantity by unit")}</th></tr></thead><tbody>
            {locationRows.map((row) => <tr key={row.storage_location_id}><td className="reports-strong">{row.storage_location_name}</td><td>{row.temperature_zone || '-'}</td><td>{formatNumber(row.stock_row_count, locale, 0)}</td><td>{formatQuantityByUnit(row.quantity_by_unit, row.total_quantity, locale, ui)}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'product-movements' ? (
        <ReportPanel
          tab="product-movements"
          actions={actionButtons('product-movements', productMovementsQuery.isFetching)}
          filters={
            <>
              <DateRangeFields from={movementFilters.from} to={movementFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setMovementFilters, 'from', value)} onToChange={(value) => updateAndClear(setMovementFilters, 'to', value)} />
              <ChoiceFilterField label={ui("Category")} value={movementFilters.category} placeholder={ui("All categories")} options={filterOptions.categories} disabled={isExporting} onChange={(value) => updateAndClear(setMovementFilters, 'category', value)} />
              <AutocompleteFilterField label={ui("Product")} value={movementFilters.product} placeholder={ui("Any product name")} options={filterOptions.products} listId="report-products-movements" disabled={isExporting} onChange={(value) => updateAndClear(setMovementFilters, 'product', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Result limit")}</span><select value={movementFilters.limit} onChange={(event) => updateAndClear(setMovementFilters, 'limit', Number(event.target.value))} disabled={isExporting}>{PRODUCT_MOVEMENT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </>
          }
        >
          <LastRefreshed timestamp={productMovementsQuery.dataUpdatedAt} />
          {productMovementsQuery.isLoading ? <div>{ui("Loading product movements…")}</div> : null}
          {productMovementsQuery.isError ? <ErrorState message={ui('Failed to load product movements: {error}').replace('{error}', getReadableError(productMovementsQuery.error, ui))} /> : null}
          {!productMovementsQuery.isLoading && !productMovementsQuery.isError && movementRows.length === 0 ? <EmptyState message={ui("No products matched the movement report filters.")} /> : null}
          {movementRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Product")}</th><th>{ui("Category")}</th><th>{ui("Movements")}</th><th>{ui("Total increase")}</th><th>{ui("Total decrease")}</th><th>{ui("Last movement")}</th></tr></thead><tbody>
            {movementRows.map((row) => {
              const quantityEvidence =
                row.quantity_evidence_status === 'mixed'
                  ? ui("Mixed historical units")
                  : row.quantity_evidence_status === 'unproven'
                    ? ui("Historical unit unavailable")
                    : null;
              const quantityUnit = row.quantity_evidence_status === 'proven' ? row.product_unit : null;
              return <tr key={row.product_id}>
                <td className="reports-strong">{row.product_name}</td>
                <td>{row.product_category || '-'}</td>
                <td>{formatNumber(row.movement_count, locale, 0)}</td>
                <td>{quantityEvidence || <>{formatNumber(row.total_increase ?? 0, locale)}{quantityUnit ? ` ${quantityUnit}` : ''}</>}</td>
                <td>{quantityEvidence || <>{formatNumber(row.total_decrease ?? 0, locale)}{quantityUnit ? ` ${quantityUnit}` : ''}</>}</td>
                <td>{formatDateTime(row.last_movement_at, locale)}</td>
              </tr>;
            })}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'movement-ledger' ? (
        <ReportPanel
          tab="movement-ledger"
          actions={actionButtons('movement-ledger', movementLedgerQuery.isFetching)}
          filters={
            <>
              <DateRangeFields from={ledgerFilters.from} to={ledgerFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setLedgerFilters, 'from', value)} onToChange={(value) => updateAndClear(setLedgerFilters, 'to', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Movement type")}</span><select value={ledgerFilters.movement_type} onChange={(event) => updateAndClear(setLedgerFilters, 'movement_type', event.target.value)} disabled={isExporting}>{MOVEMENT_TYPE_OPTIONS.map(([value, label]) => <option key={value || 'all'} value={value}>{ui(label)}</option>)}</select></label>
              <AutocompleteFilterField label={ui("Product")} value={ledgerFilters.product} placeholder={ui("Any product name")} options={filterOptions.products} listId="report-products-ledger" disabled={isExporting} onChange={(value) => updateAndClear(setLedgerFilters, 'product', value)} />
              <AutocompleteFilterField label={ui("Location")} value={ledgerFilters.location} placeholder={ui("Any location")} options={filterOptions.locations} listId="report-locations-ledger" disabled={isExporting} onChange={(value) => updateAndClear(setLedgerFilters, 'location', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Result limit")}</span><select value={ledgerFilters.limit} onChange={(event) => updateAndClear(setLedgerFilters, 'limit', Number(event.target.value))} disabled={isExporting}>{REPORT_RESULT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </>
          }
        >
          <LastRefreshed timestamp={movementLedgerQuery.dataUpdatedAt} />
          {movementLedgerQuery.isLoading ? <div>{ui("Loading movement ledger…")}</div> : null}
          {movementLedgerQuery.isError ? <ErrorState message={ui('Failed to load movement ledger: {error}').replace('{error}', getReadableError(movementLedgerQuery.error, ui))} /> : null}
          {!movementLedgerQuery.isLoading && !movementLedgerQuery.isError && ledgerRows.length === 0 ? <EmptyState message={ui("No stock movements matched these filters.")} /> : null}
          {ledgerRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Date / time")}</th><th>{ui("Product")}</th><th>{ui("Location")}</th><th>{ui("Change")}</th><th>{ui("Movement")}</th><th>{ui("Actor")}</th><th>{ui("Reason / reference")}</th></tr></thead><tbody>
            {ledgerRows.map((row) => {
              const reason = row.reason
                ? (row.reason_is_operator_evidence ? row.reason : localizeMovementLedgerText(row.reason, ui))
                : (row.receiving_note || '—');
              return <tr key={row.movement_id}><td>{formatDateTime(row.created_at, locale)}</td><td className="reports-strong">{row.product_name || ui("Historical Product name unavailable")}<span className="reports-subtext">{row.product_unit || ui("Historical unit unavailable")}</span></td><td>{row.storage_location_name || ui("Historical location unavailable")}</td><td className={toNumber(row.quantity_change) < 0 ? 'reports-warning-text' : 'reports-positive-text'}>{formatSignedQuantity(row.quantity_change, locale, ui, row.product_unit || ui("Historical unit unavailable"))}</td><td>{humanizeMovementType(row.movement_type, ui)}</td><td>{row.actor_name || (row.actor_label ? ui(row.actor_label) : ui("System / support actor"))}</td><td>{reason}<span className="reports-subtext">{localizeMovementLedgerText(row.reference_label, ui)}</span></td></tr>;
            })}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'inventory-variance' ? (
        <ReportPanel
          tab="inventory-variance"
          actions={actionButtons('inventory-variance', inventoryVarianceQuery.isFetching)}
          filters={
            <>
              <DateRangeFields from={varianceFilters.from} to={varianceFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setVarianceFilters, 'from', value)} onToChange={(value) => updateAndClear(setVarianceFilters, 'to', value)} />
              <AutocompleteFilterField label={ui("Product")} value={varianceFilters.product} placeholder={ui("Any product name")} options={filterOptions.products} listId="report-products-variance" disabled={isExporting} onChange={(value) => updateAndClear(setVarianceFilters, 'product', value)} />
              <AutocompleteFilterField label={ui("Location")} value={varianceFilters.location} placeholder={ui("Any location")} options={filterOptions.locations} listId="report-locations-variance" disabled={isExporting} onChange={(value) => updateAndClear(setVarianceFilters, 'location', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Result limit")}</span><select value={varianceFilters.limit} onChange={(event) => updateAndClear(setVarianceFilters, 'limit', Number(event.target.value))} disabled={isExporting}>{REPORT_RESULT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </>
          }
        >
          <LastRefreshed timestamp={inventoryVarianceQuery.dataUpdatedAt} />
          <p className="reports-note">{ui("Cycle counts show expected versus counted stock. Manual adjustments are shown as posted variance records.")}</p>
          {inventoryVarianceQuery.isLoading ? <div>{ui("Loading count and adjustment variance…")}</div> : null}
          {inventoryVarianceQuery.isError ? <ErrorState message={ui('Failed to load count variance: {error}').replace('{error}', getReadableError(inventoryVarianceQuery.error, ui))} /> : null}
          {!inventoryVarianceQuery.isLoading && !inventoryVarianceQuery.isError && varianceRows.length === 0 ? <EmptyState message={ui("No cycle-count or manual-adjustment records matched these filters.")} /> : null}
          {varianceRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Date / time")}</th><th>{ui("Record")}</th><th>{ui("Product")}</th><th>{ui("Location")}</th><th>{ui("Expected")}</th><th>{ui("Counted")}</th><th>{ui("Variance")}</th><th>{ui("Status / actor")}</th></tr></thead><tbody>
            {varianceRows.map((row) => {
              const historicalMovement = row.record_type === 'manual_adjustment';
              const productName = row.product_name || (historicalMovement ? ui("Historical Product name unavailable") : ui("Unavailable"));
              const locationName = row.storage_location_name || (historicalMovement ? ui("Historical location unavailable") : '-');
              const unit = row.product_unit || (historicalMovement ? ui("Historical unit unavailable") : ui("units"));
              const actor = row.actor_name || (row.actor_label ? ui(row.actor_label) : ui('System / unknown'));
              return <tr key={`${row.record_type}-${row.record_id}`}><td>{formatDateTime(row.created_at, locale)}</td><td>{row.record_type === 'cycle_count' ? ui("Cycle count") : ui("Manual adjustment")}<span className="reports-subtext">{row.reason || '-'}</span></td><td className="reports-strong">{productName}</td><td>{locationName}</td><td>{row.expected_quantity === null || row.expected_quantity === undefined ? '-' : ui('{quantity} {unit}').replace('{quantity}', formatNumber(row.expected_quantity, locale)).replace('{unit}', unit)}</td><td>{row.counted_quantity === null || row.counted_quantity === undefined ? '-' : ui('{quantity} {unit}').replace('{quantity}', formatNumber(row.counted_quantity, locale)).replace('{unit}', unit)}</td><td className={toNumber(row.variance_quantity) !== 0 ? 'reports-warning-text' : ''}>{row.variance_quantity === null || row.variance_quantity === undefined ? '-' : formatSignedQuantity(row.variance_quantity, locale, ui, unit)}</td><td>{formatStatus(row.status, ui)}<span className="reports-subtext">{actor}</span></td></tr>;
            })}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'stock-transfer-activity' ? (
        <ReportPanel
          tab="stock-transfer-activity"
          actions={actionButtons('stock-transfer-activity', stockTransferActivityQuery.isFetching)}
          filters={
            <>
              <DateRangeFields from={transferFilters.from} to={transferFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setTransferFilters, 'from', value)} onToChange={(value) => updateAndClear(setTransferFilters, 'to', value)} />
              <AutocompleteFilterField label={ui("Location")} value={transferFilters.location} placeholder={ui("Any current or historical source/destination")} options={filterOptions.locations} listId="report-locations-transfers" disabled={isExporting} onChange={(value) => updateAndClear(setTransferFilters, 'location', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Status")}</span><select value={transferFilters.status} onChange={(event) => updateAndClear(setTransferFilters, 'status', event.target.value)} disabled={isExporting}>{TRANSFER_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{ui(label)}</option>)}</select></label>
              <label className="reports-field reports-field--compact"><span>{ui("Result limit")}</span><select value={transferFilters.limit} onChange={(event) => updateAndClear(setTransferFilters, 'limit', Number(event.target.value))} disabled={isExporting}>{REPORT_RESULT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </>
          }
        >
          <LastRefreshed timestamp={stockTransferActivityQuery.dataUpdatedAt} />
          {stockTransferActivityQuery.isLoading ? <div>{ui("Loading stock transfers…")}</div> : null}
          {stockTransferActivityQuery.isError ? <ErrorState message={ui('Failed to load stock transfers: {error}').replace('{error}', getReadableError(stockTransferActivityQuery.error, ui))} /> : null}
          {!stockTransferActivityQuery.isLoading && !stockTransferActivityQuery.isError && transferRows.length === 0 ? <EmptyState message={ui("No stock transfers matched these filters.")} /> : null}
          {transferRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Created")}</th><th>{ui("From")}</th><th>{ui("To")}</th><th>{ui("Status")}</th><th>{ui("Items")}</th><th>{ui("Quantity by unit")}</th><th>{ui("Created by")}</th><th>{ui("Executed / cancellation")}</th></tr></thead><tbody>
            {transferRows.map((row) => <tr key={row.transfer_id}><td>{formatDateTime(row.created_at, locale)}</td><td className="reports-strong">{row.from_location || ui("Historical location unavailable")}</td><td className="reports-strong">{row.to_location || ui("Historical location unavailable")}</td><td>{formatStatus(row.status, ui)}</td><td>{formatNumber(row.item_count, locale, 0)}</td><td>{row.quantity_evidence === 'Historical unit unavailable' ? ui('Historical unit unavailable') : formatQuantityByUnit(row.quantity_by_unit, undefined, locale, ui)}</td><td>{displayRepositoryActor(row.created_by, ui)}</td><td>{row.executed_at ? formatDateTime(row.executed_at, locale) : displayStockTransferCancellation(row.cancellation_reason, row.cancellation_reason_is_system, ui)}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'requisition-activity' ? (
        <ReportPanel
          tab="requisition-activity"
          actions={actionButtons('requisition-activity', requisitionActivityQuery.isFetching)}
          filters={
            <>
              <DateRangeFields from={requisitionFilters.from} to={requisitionFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setRequisitionFilters, 'from', value)} onToChange={(value) => updateAndClear(setRequisitionFilters, 'to', value)} />
              <ChoiceFilterField label={ui("Department")} value={requisitionFilters.department} placeholder={ui("Any requesting department")} options={filterOptions.departments} disabled={isExporting} onChange={(value) => updateAndClear(setRequisitionFilters, 'department', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Status")}</span><select value={requisitionFilters.status} onChange={(event) => updateAndClear(setRequisitionFilters, 'status', event.target.value)} disabled={isExporting}>{REQUISITION_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{ui(label)}</option>)}</select></label>
              <label className="reports-field reports-field--compact"><span>{ui("Result limit")}</span><select value={requisitionFilters.limit} onChange={(event) => updateAndClear(setRequisitionFilters, 'limit', Number(event.target.value))} disabled={isExporting}>{REPORT_RESULT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </>
          }
        >
          <LastRefreshed timestamp={requisitionActivityQuery.dataUpdatedAt} />
          {requisitionActivityQuery.isLoading ? <div>{ui("Loading requisitions…")}</div> : null}
          {requisitionActivityQuery.isError ? <ErrorState message={ui('Failed to load requisitions: {error}').replace('{error}', getReadableError(requisitionActivityQuery.error, ui))} /> : null}
          {!requisitionActivityQuery.isLoading && !requisitionActivityQuery.isError && requisitionRows.length === 0 ? <EmptyState message={ui("No inventory requisitions matched these filters.")} /> : null}
          {requisitionRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Requisition")}</th><th>{ui("Department")}</th><th>{ui("Status")}</th><th>{ui("Priority")}</th><th>{ui("Needed by")}</th><th>{ui("Source → target")}</th><th>{ui("Fulfillment by unit")}</th><th>{ui("Created by")}</th></tr></thead><tbody>
            {requisitionRows.map((row) => <tr key={row.requisition_id}><td className="reports-strong">{row.requisition_number}<span className="reports-subtext">{formatDateTime(row.created_at, locale)}</span></td><td>{row.requesting_department || '-'}{row.target_department ? <span className="reports-subtext">{ui('To: {department}').replace('{department}', row.target_department)}</span> : null}</td><td className={row.overdue ? 'reports-warning-text' : ''}>{formatStatus(row.status, ui)}{row.overdue ? <span className="reports-subtext">{ui("Past needed-by date")}</span> : null}</td><td>{formatStatus(row.priority, ui)}</td><td>{formatDate(row.needed_by, locale)}</td><td>{ui('{source} → {target}').replace('{source}', row.source_location || '—').replace('{target}', row.target_location || '—')}</td><td>{formatRequisitionProgress(row.quantity_by_unit, locale, ui)}</td><td>{row.created_by || ui("System")}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'procurement-summary' ? (
        <ReportPanel
          tab="procurement-summary"
          actions={actionButtons('procurement-summary', procurementSummaryQuery.isFetching)}
          filters={
            <>
              <DateRangeFields from={procurementFilters.from} to={procurementFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setProcurementFilters, 'from', value)} onToChange={(value) => updateAndClear(setProcurementFilters, 'to', value)} />
              <ChoiceFilterField label={ui("Supplier")} value={procurementFilters.supplier} placeholder={ui("Any supplier")} options={filterOptions.suppliers} disabled={isExporting} onChange={(value) => updateAndClear(setProcurementFilters, 'supplier', value)} />
              <div className="reports-filter-note">{ui("Date range filters shipments by creation date.")}</div>
            </>
          }
        >
          <LastRefreshed timestamp={procurementSummaryQuery.dataUpdatedAt} />
          {procurementSummaryQuery.isLoading ? <div>{ui("Loading procurement summary…")}</div> : null}
          {procurementSummaryQuery.isError ? <ErrorState message={ui('Failed to load procurement summary: {error}').replace('{error}', getReadableError(procurementSummaryQuery.error, ui))} /> : null}
          {procurementSummary ? <div className="reports-summary-grid">
            <article className="reports-summary-card"><h4>{ui("Shipments")}</h4>
              <div><span>{ui("Total")}</span><strong>{formatNumber(procurementSummary.shipments.total_shipments, locale, 0)}</strong></div>
              <div><span>{ui("Pending")}</span><strong>{formatNumber(procurementSummary.shipments.pending_shipments, locale, 0)}</strong></div>
              <div><span>{ui("Partial")}</span><strong>{formatNumber(procurementSummary.shipments.partial_shipments, locale, 0)}</strong></div>
              <div><span>{ui("Received")}</span><strong>{formatNumber(procurementSummary.shipments.received_shipments, locale, 0)}</strong></div>
              <div><span>{ui("Overdue")}</span><strong>{formatNumber(procurementSummary.shipments.overdue_shipments, locale, 0)}</strong></div>
            </article>
            <article className="reports-summary-card"><h4>{ui("Shipment lines")}</h4><div><span>{ui("Active lines")}</span><strong>{formatNumber(procurementSummary.lines.total_active_shipment_lines, locale, 0)}</strong></div>
              {procurementSummary.lines.quantity_by_unit && Object.keys(procurementSummary.lines.quantity_by_unit).length > 0
                ? Object.entries(procurementSummary.lines.quantity_by_unit).sort(([a], [b]) => a.localeCompare(b)).map(([unit, values]) => <div className="reports-unit-block" key={unit}><h5>{unit}</h5><div><span>{ui("Ordered")}</span><strong>{formatNumber(values.ordered_quantity, locale)} {unit}</strong></div><div><span>{ui("Received")}</span><strong>{formatNumber(values.received_quantity, locale)} {unit}</strong></div><div><span>{ui("Discrepancy")}</span><strong>{formatNumber(values.discrepancy, locale)} {unit}</strong></div></div>)
                : <p className="reports-note">{ui("No procurement quantity-by-unit rows returned.")}</p>}
            </article>
          </div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'purchase-order-commitments' ? (
        <ReportPanel
          tab="purchase-order-commitments"
          actions={actionButtons('purchase-order-commitments', purchaseOrderCommitmentsQuery.isFetching)}
          filters={
            <>
              <DateRangeFields from={poCommitmentFilters.from} to={poCommitmentFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setPoCommitmentFilters, 'from', value)} onToChange={(value) => updateAndClear(setPoCommitmentFilters, 'to', value)} />
              <ChoiceFilterField label={ui("Supplier")} value={poCommitmentFilters.supplier} placeholder={ui("Any supplier")} options={filterOptions.suppliers} disabled={isExporting} onChange={(value) => updateAndClear(setPoCommitmentFilters, 'supplier', value)} />
              <AutocompleteFilterField label={ui("Product")} value={poCommitmentFilters.product} placeholder={ui("Any product name")} options={filterOptions.products} listId="report-products-po-commitments" disabled={isExporting} onChange={(value) => updateAndClear(setPoCommitmentFilters, 'product', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Status")}</span><select value={poCommitmentFilters.status} onChange={(event) => updateAndClear(setPoCommitmentFilters, 'status', event.target.value)} disabled={isExporting}>{PURCHASE_ORDER_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{ui(label)}</option>)}</select></label>
              <label className="reports-field reports-field--compact"><span>{ui("Result limit")}</span><select value={poCommitmentFilters.limit} onChange={(event) => updateAndClear(setPoCommitmentFilters, 'limit', Number(event.target.value))} disabled={isExporting}>{REPORT_RESULT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <div className="reports-filter-note">{ui("Date range uses expected delivery date. “Open commitments” means submitted or approved purchase orders.")}</div>
            </>
          }
        >
          <LastRefreshed timestamp={purchaseOrderCommitmentsQuery.dataUpdatedAt} />
          <p className="reports-note">{ui("Quantities stay separated by product unit. Monetary totals include only priced lines, remain in the purchase-order currency, and show unpriced line counts explicitly.")}</p>
          {purchaseOrderCommitmentsQuery.isLoading ? <div>{ui("Loading purchase-order commitments…")}</div> : null}
          {purchaseOrderCommitmentsQuery.isError ? <ErrorState message={ui('Failed to load purchase-order commitments: {error}').replace('{error}', getReadableError(purchaseOrderCommitmentsQuery.error, ui))} /> : null}
          {!purchaseOrderCommitmentsQuery.isLoading && !purchaseOrderCommitmentsQuery.isError && poCommitmentRows.length === 0 ? <EmptyState message={ui("No purchase orders matched these commitment filters.")} /> : null}
          {poCommitmentRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("PO")}</th><th>{ui("Supplier")}</th><th>{ui("Status")}</th><th>{ui("Expected")}</th><th>{ui("Receiving progress")}</th><th>{ui("Known ordered")}</th><th>{ui("Known remaining")}</th><th>{ui("Unpriced")}</th></tr></thead><tbody>
            {poCommitmentRows.map((row) => <tr key={row.purchase_order_id}><td className="reports-strong">{row.po_number}<span className="reports-subtext">{ui('Created {date}').replace('{date}', formatDate(row.created_at, locale))}</span></td><td>{row.supplier_name}</td><td className={row.overdue ? 'reports-warning-text' : ''}>{formatStatus(row.status, ui)}{row.overdue ? <span className="reports-subtext">{ui("Overdue")}</span> : null}</td><td>{formatDate(row.expected_delivery_date, locale)}</td><td>{formatPurchaseOrderProgress(row.quantity_by_unit, locale, ui)}</td><td>{formatCostAmount(row.known_ordered_value, row.currency, locale)}</td><td className={toNumber(row.known_remaining_value) > 0 ? 'reports-warning-text' : ''}>{formatCostAmount(row.known_remaining_value, row.currency, locale)}</td><td>{ui('{unpriced} of {lines} lines').replace('{unpriced}', formatNumber(row.unpriced_line_count, locale, 0)).replace('{lines}', formatNumber(row.line_count, locale, 0))}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'purchasing-spend' ? (
        <ReportPanel
          tab="purchasing-spend"
          actions={actionButtons('purchasing-spend', purchasingSpendQuery.isFetching)}
          filters={
            <>
              <DateRangeFields from={spendFilters.from} to={spendFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setSpendFilters, 'from', value)} onToChange={(value) => updateAndClear(setSpendFilters, 'to', value)} />
              <ChoiceFilterField label={ui("Supplier")} value={spendFilters.supplier} placeholder={ui("Any supplier")} options={filterOptions.suppliers} disabled={isExporting} onChange={(value) => updateAndClear(setSpendFilters, 'supplier', value)} />
              <ChoiceFilterField label={ui("Category")} value={spendFilters.category} placeholder={ui("All categories")} options={filterOptions.categories} disabled={isExporting} onChange={(value) => updateAndClear(setSpendFilters, 'category', value)} />
              <AutocompleteFilterField label={ui("Product")} value={spendFilters.product} placeholder={ui("Any product name")} options={filterOptions.products} listId="report-products-spend" disabled={isExporting} onChange={(value) => updateAndClear(setSpendFilters, 'product', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Result limit")}</span><select value={spendFilters.limit} onChange={(event) => updateAndClear(setSpendFilters, 'limit', Number(event.target.value))} disabled={isExporting}>{REPORT_RESULT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </>
          }
        >
          <LastRefreshed timestamp={purchasingSpendQuery.dataUpdatedAt} />
          <p className="reports-note">{ui("Only approved, matched, or paid supplier invoices count as recognized purchasing spend. Currencies remain explicit and are never silently combined.")}</p>
          {purchasingSpendQuery.isLoading ? <div>{ui("Loading purchasing and spend…")}</div> : null}
          {purchasingSpendQuery.isError ? <ErrorState message={ui('Failed to load purchasing spend: {error}').replace('{error}', getReadableError(purchasingSpendQuery.error, ui))} /> : null}
          {!purchasingSpendQuery.isLoading && !purchasingSpendQuery.isError && spendRows.length === 0 ? <EmptyState message={ui("No recognized supplier-invoice lines matched these filters.")} /> : null}
          {spendRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Invoice")}</th><th>{ui("Supplier")}</th><th>{ui("Product")}</th><th>{ui("Quantity")}</th><th>{ui("Unit cost")}</th><th>{ui("Line amount")}</th><th>{ui("Status")}</th></tr></thead><tbody>
            {spendRows.map((row) => <tr key={`${row.invoice_id}-${row.product_id}`}><td className="reports-strong">{row.invoice_number}<span className="reports-subtext">{formatDate(row.invoice_date, locale)}</span></td><td>{row.supplier_name}</td><td>{row.product_name}<span className="reports-subtext">{row.product_category || ui("Uncategorized")}</span></td><td>{formatNumber(row.quantity, locale)} {row.product_unit || ui("units")}</td><td>{formatCostAmount(row.unit_cost, row.currency, locale)}</td><td className="reports-strong">{formatCostAmount(row.line_amount, row.currency, locale)}</td><td>{row.invoice_status}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'low-stock' ? (
        <ReportPanel
          tab="low-stock"
          actions={actionButtons('low-stock', lowStockQuery.isFetching)}
          filters={
            <>
              <label className="reports-field reports-field--compact"><span>{ui("Threshold scope")}</span><select value={lowStockFilters.scope} onChange={(event) => updateAndClear(setLowStockFilters, 'scope', event.target.value as 'product' | 'par' | 'both')} disabled={isExporting}><option value="both">{ui("Product minima + location par levels")}</option><option value="product">{ui("Product minimum only")}</option><option value="par">{ui("Location par levels only")}</option></select></label>
              <ChoiceFilterField label={ui("Category")} value={lowStockFilters.category} placeholder={ui("All categories")} options={filterOptions.categories} disabled={isExporting} onChange={(value) => updateAndClear(setLowStockFilters, 'category', value)} />
              <ChoiceFilterField label={ui("Supplier")} value={lowStockFilters.supplier} placeholder={ui("Any supplier")} options={filterOptions.suppliers} disabled={isExporting} onChange={(value) => updateAndClear(setLowStockFilters, 'supplier', value)} />
              <ChoiceFilterField label={ui("Location")} value={lowStockFilters.location} placeholder={ui("Any location")} options={filterOptions.locations} disabled={isExporting || lowStockFilters.scope === 'product'} onChange={(value) => updateAndClear(setLowStockFilters, 'location', value)} />
              <div className="reports-filter-note">{ui("Product minima compare against tenant-wide stock. Location par rows use active, currently effective par levels and compare against stock at that location.")}</div>
            </>
          }
        >
          <LastRefreshed timestamp={lowStockQuery.dataUpdatedAt} />
          {lowStockQuery.isLoading ? <div>{ui("Loading low-stock and par shortages…")}</div> : null}
          {lowStockQuery.isError ? <ErrorState message={ui('Failed to load low-stock report: {error}').replace('{error}', getReadableError(lowStockQuery.error, ui))} /> : null}
          {!lowStockQuery.isLoading && !lowStockQuery.isError && lowStockRows.length === 0 ? <EmptyState message={ui("No product-minimum or active location par-level shortages matched these filters.")} /> : null}
          {lowStockRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Scope")}</th><th>{ui("Product")}</th><th>{ui("Location / department")}</th><th>{ui("Current")}</th><th>{ui("Minimum")}</th><th>{ui("Target")}</th><th>{ui("Shortage")}</th><th>{ui("To target")}</th><th>{ui("Supplier")}</th></tr></thead><tbody>
            {lowStockRows.map((row) => <tr key={`${row.threshold_scope}-${row.par_level_id || row.product_id}`}><td>{row.threshold_scope === 'location_par_level' ? ui("Location par") : ui("Product minimum")}</td><td className="reports-strong">{row.product_name}<span className="reports-subtext">{row.product_category || ui("Uncategorized")}</span></td><td>{row.storage_location_name || ui("All tenant locations")}{row.department ? <span className="reports-subtext">{row.department}</span> : null}</td><td>{formatNumber(row.current_stock, locale)} {row.product_unit || ui("units")}</td><td>{formatNumber(row.minimum_stock, locale)} {row.product_unit || ui("units")}</td><td>{row.target_stock === null || row.target_stock === undefined ? '-' : ui('{quantity} {unit}').replace('{quantity}', formatNumber(row.target_stock, locale)).replace('{unit}', row.product_unit || ui('units'))}</td><td className="reports-warning-text">{formatNumber(row.shortage_quantity, locale)} {row.product_unit || ui("units")}</td><td>{row.replenish_to_target_quantity === null || row.replenish_to_target_quantity === undefined ? '-' : ui('{quantity} {unit}').replace('{quantity}', formatNumber(row.replenish_to_target_quantity, locale)).replace('{unit}', row.product_unit || ui('units'))}</td><td>{row.supplier_name || ui("Not assigned")}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'slow-moving' ? (
        <ReportPanel
          tab="slow-moving"
          actions={actionButtons('slow-moving', slowMovingQuery.isFetching)}
          filters={
            <>
              <label className="reports-field reports-field--compact"><span>{ui("Inactive for")}</span><select value={slowFilters.days} onChange={(event) => updateAndClear(setSlowFilters, 'days', Number(event.target.value))} disabled={isExporting}>{SLOW_MOVING_DAYS_OPTIONS.map((days) => <option key={days} value={days}>{ui('{days}+ days').replace('{days}', formatNumber(days, locale, 0))}</option>)}</select></label>
              <ChoiceFilterField label={ui("Category")} value={slowFilters.category} placeholder={ui("All categories")} options={filterOptions.categories} disabled={isExporting} onChange={(value) => updateAndClear(setSlowFilters, 'category', value)} />
              <AutocompleteFilterField label={ui("Product")} value={slowFilters.product} placeholder={ui("Any product name")} options={filterOptions.products} listId="report-products-slow" disabled={isExporting} onChange={(value) => updateAndClear(setSlowFilters, 'product', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Result limit")}</span><select value={slowFilters.limit} onChange={(event) => updateAndClear(setSlowFilters, 'limit', Number(event.target.value))} disabled={isExporting}>{REPORT_RESULT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            </>
          }
        >
          <LastRefreshed timestamp={slowMovingQuery.dataUpdatedAt} />
          <p className="reports-note">{ui("Only products with a positive current stock balance are included. Products with no recorded movement are treated as non-moving.")}</p>
          {slowMovingQuery.isLoading ? <div>{ui("Loading slow and non-moving stock…")}</div> : null}
          {slowMovingQuery.isError ? <ErrorState message={ui('Failed to load slow-moving stock: {error}').replace('{error}', getReadableError(slowMovingQuery.error, ui))} /> : null}
          {!slowMovingQuery.isLoading && !slowMovingQuery.isError && slowRows.length === 0 ? <EmptyState message={ui('No positive stock has been inactive for {days} days or more.').replace('{days}', formatNumber(slowFilters.days, locale, 0))} /> : null}
          {slowRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Product")}</th><th>{ui("Category")}</th><th>{ui("Current stock")}</th><th>{ui("Last movement")}</th><th>{ui("Idle days")}</th><th>{ui("Supplier")}</th></tr></thead><tbody>
            {slowRows.map((row) => <tr key={row.product_id}><td className="reports-strong">{row.product_name}</td><td>{row.product_category || '-'}</td><td>{formatNumber(row.current_stock, locale)} {row.product_unit || ui("units")}</td><td>{row.last_movement_at ? formatDateTime(row.last_movement_at, locale) : ui("Never recorded")}</td><td className="reports-warning-text">{row.days_since_movement === null || row.days_since_movement === undefined ? ui("No movement history") : ui('{count} days').replace('{count}', formatNumber(row.days_since_movement, locale, 0))}</td><td>{row.supplier_name || ui("Not assigned")}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'usage-summary' ? (
        <ReportPanel
          tab="usage-summary"
          actions={actionButtons('usage-summary', usageSummaryQuery.isFetching)}
          filters={
            <>
              <label className="reports-field reports-field--compact"><span>{ui("Quick period")}</span><select value={usageFilters.days} onChange={(event) => updateAndClear(setUsageFilters, 'days', Number(event.target.value))} disabled={isExporting}>{USAGE_PERIOD_OPTIONS.map((days) => <option key={days} value={days}>{ui('Last {days} days').replace('{days}', formatNumber(days, locale, 0))}</option>)}</select></label>
              <DateRangeFields from={usageFilters.from} to={usageFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setUsageFilters, 'from', value)} onToChange={(value) => updateAndClear(setUsageFilters, 'to', value)} />
              <ChoiceFilterField label={ui("Category")} value={usageFilters.category} placeholder={ui("All categories")} options={filterOptions.categories} disabled={isExporting} onChange={(value) => updateAndClear(setUsageFilters, 'category', value)} />
              <AutocompleteFilterField label={ui("Product")} value={usageFilters.product} placeholder={ui("Any product name")} options={filterOptions.products} listId="report-products-usage" disabled={isExporting} onChange={(value) => updateAndClear(setUsageFilters, 'product', value)} />
              <ChoiceFilterField label={ui("Location")} value={usageFilters.location} placeholder={ui("Any location")} options={filterOptions.locations} disabled={isExporting} onChange={(value) => updateAndClear(setUsageFilters, 'location', value)} />
              <div className="reports-filter-note">{ui("A From/To date range overrides the quick-period window. Reversed usage entries are excluded.")}</div>
            </>
          }
        >
          <LastRefreshed timestamp={usageSummaryQuery.dataUpdatedAt} />
          {usageSummaryQuery.isLoading ? <div>{ui("Loading usage report…")}</div> : null}
          {usageSummaryQuery.isError ? <ErrorState message={ui('Failed to load usage report: {error}').replace('{error}', getReadableError(usageSummaryQuery.error, ui))} /> : null}
          {!usageSummaryQuery.isLoading && !usageSummaryQuery.isError && usageRows.length === 0 ? <EmptyState message={ui("No non-reversed usage matched the selected period and filters.")} /> : null}
          {usageRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Product")}</th><th>{ui("Entries")}</th><th>{ui("Total consumed")}</th><th>{ui("Guest use")}</th><th>{ui("Internal use")}</th><th>{ui("Damage / waste")}</th><th>{ui("Last use")}</th></tr></thead><tbody>
            {usageRows.map((row) => <tr key={row.product_id}><td className="reports-strong">{row.product_name}<span className="reports-subtext">{row.product_category || ui("Uncategorized")}</span></td><td>{formatNumber(row.usage_count, locale, 0)}</td><td>{formatNumber(row.total_consumed, locale)} {row.product_unit || ui("units")}</td><td>{formatNumber(row.guest_use_quantity, locale)} {row.product_unit || ui("units")}</td><td>{formatNumber(row.internal_use_quantity, locale)} {row.product_unit || ui("units")}</td><td>{formatNumber(row.damage_waste_quantity, locale)} {row.product_unit || ui("units")}</td><td>{formatDateTime(row.last_consumed_at, locale)}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'supplier-performance' ? (
        <ReportPanel
          tab="supplier-performance"
          actions={actionButtons('supplier-performance', supplierPerformanceQuery.isFetching)}
          filters={
            <>
              <DateRangeFields from={supplierFilters.from} to={supplierFilters.to} disabled={isExporting} onFromChange={(value) => updateAndClear(setSupplierFilters, 'from', value)} onToChange={(value) => updateAndClear(setSupplierFilters, 'to', value)} />
              <ChoiceFilterField label={ui("Supplier")} value={supplierFilters.supplier} placeholder={ui("Any supplier")} options={filterOptions.suppliers} disabled={isExporting} onChange={(value) => updateAndClear(setSupplierFilters, 'supplier', value)} />
              <label className="reports-field reports-field--compact"><span>{ui("Result limit")}</span><select value={supplierFilters.limit} onChange={(event) => updateAndClear(setSupplierFilters, 'limit', Number(event.target.value))} disabled={isExporting}>{REPORT_RESULT_LIMIT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              <div className="reports-filter-note">{ui("Date range filters shipment and supplier-return activity by creation date.")}</div>
            </>
          }
        >
          <LastRefreshed timestamp={supplierPerformanceQuery.dataUpdatedAt} />
          <p className="reports-note">{ui("On-time rate and average delay use received shipments that have actual receiving timestamps. Fill rate is averaged per shipment line; discrepancy rate is line-based so different units are never mixed.")}</p>
          {supplierPerformanceQuery.isLoading ? <div>{ui("Loading supplier performance…")}</div> : null}
          {supplierPerformanceQuery.isError ? <ErrorState message={ui('Failed to load supplier performance: {error}').replace('{error}', getReadableError(supplierPerformanceQuery.error, ui))} /> : null}
          {!supplierPerformanceQuery.isLoading && !supplierPerformanceQuery.isError && supplierRows.length === 0 ? <EmptyState message={ui("No active suppliers matched these filters.")} /> : null}
          {supplierRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Supplier")}</th><th>{ui("Shipments")}</th><th>{ui("Open overdue")}</th><th>{ui("On-time delivery")}</th><th>{ui("Avg delay")}</th><th>{ui("Line fill")}</th><th>{ui("Discrepancy lines")}</th><th>{ui("Returns")}</th><th>{ui("Last received")}</th></tr></thead><tbody>
            {supplierRows.map((row) => <tr key={row.supplier_id}><td className="reports-strong">{row.supplier_name}</td><td>{formatNumber(row.total_shipments, locale, 0)}<span className="reports-subtext">{ui('{received} received · {partial} partial · {pending} pending').replace('{received}', formatNumber(row.received_shipments, locale, 0)).replace('{partial}', formatNumber(row.partial_shipments, locale, 0)).replace('{pending}', formatNumber(row.pending_shipments, locale, 0))}</span></td><td className={toNumber(row.overdue_shipments) > 0 ? 'reports-warning-text' : ''}>{formatNumber(row.overdue_shipments, locale, 0)}</td><td>{formatPercent(row.on_time_delivery_rate_pct, locale, ui)}<span className="reports-subtext">{ui('{onTime} on time / {evidence} evidence-backed').replace('{onTime}', formatNumber(row.on_time_received_shipments, locale, 0)).replace('{evidence}', formatNumber(row.timing_evidence_shipments, locale, 0))}</span></td><td>{row.average_delivery_delay_days === null || row.average_delivery_delay_days === undefined ? ui("Not enough evidence") : ui('{count} days').replace('{count}', formatNumber(row.average_delivery_delay_days, locale, 1))}</td><td>{formatPercent(row.line_fulfillment_rate_pct, locale, ui)}</td><td className={toNumber(row.discrepancy_line_rate_pct) > 0 ? 'reports-warning-text' : ''}>{formatPercent(row.discrepancy_line_rate_pct, locale, ui)}</td><td>{formatNumber(row.supplier_returns, locale, 0)}<span className="reports-subtext">{ui('{count} dispatched/completed').replace('{count}', formatNumber(row.dispatched_or_completed_returns, locale, 0))}</span></td><td>{formatDateTime(row.last_received_at, locale)}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'expiry-risk' ? (
        <ReportPanel
          tab="expiry-risk"
          actions={actionButtons('expiry-risk', expiryRiskQuery.isFetching)}
          filters={
            <>
              <label className="reports-field reports-field--compact"><span>{ui("Expiry horizon")}</span><select value={expiryFilters.days} onChange={(event) => updateAndClear(setExpiryFilters, 'days', Number(event.target.value))} disabled={isExporting}>{EXPIRY_HORIZON_OPTIONS.map((days) => <option key={days} value={days}>{ui('Next {days} days').replace('{days}', formatNumber(days, locale, 0))}</option>)}</select></label>
              <ChoiceFilterField label={ui("Category")} value={expiryFilters.category} placeholder={ui("All categories")} options={filterOptions.categories} disabled={isExporting} onChange={(value) => updateAndClear(setExpiryFilters, 'category', value)} />
              <ChoiceFilterField label={ui("Location")} value={expiryFilters.location} placeholder={ui("Any location")} options={filterOptions.locations} disabled={isExporting} onChange={(value) => updateAndClear(setExpiryFilters, 'location', value)} />
              <div className="reports-filter-note">{ui("Already expired positive-balance lots are always included.")}</div>
            </>
          }
        >
          <LastRefreshed timestamp={expiryRiskQuery.dataUpdatedAt} />
          {expiryRiskQuery.isLoading ? <div>{ui("Loading expiry risk…")}</div> : null}
          {expiryRiskQuery.isError ? <ErrorState message={ui('Failed to load expiry risk: {error}').replace('{error}', getReadableError(expiryRiskQuery.error, ui))} /> : null}
          {!expiryRiskQuery.isLoading && !expiryRiskQuery.isError && expiryRows.length === 0 ? <EmptyState message={ui('No matching positive-balance lots expire within the next {days} days.').replace('{days}', formatNumber(expiryFilters.days, locale, 0))} /> : null}
          {expiryRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Product")}</th><th>{ui("Location")}</th><th>{ui("Lot / batch")}</th><th>{ui("Expiry")}</th><th>{ui("Quantity")}</th><th>{ui("Condition")}</th><th>{ui("Risk")}</th></tr></thead><tbody>
            {expiryRows.map((row) => <tr key={row.inventory_lot_id}><td className="reports-strong">{row.product_name}</td><td>{row.storage_location_name}</td><td>{row.lot_number || '-'}{row.batch_number ? <span className="reports-subtext">{ui('Batch: {batch}').replace('{batch}', row.batch_number)}</span> : null}</td><td>{formatDate(row.expiry_date, locale)}</td><td>{formatNumber(row.quantity, locale)} {row.product_unit || ui("units")}</td><td>{row.condition}</td><td><RiskBadge status={row.risk_status} /></td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}

      {activeTab === 'forecast' ? (
        <ReportPanel tab="forecast" actions={actionButtons('forecast', forecastQuery.isFetching, !forecastFeatureReady)}>
          <p className="reports-note">{ui("Forecast is read-only. When forecasting access is enabled, you can print it or export it as PDF or CSV.")}</p>
          {forecastUnavailableReason ? <ErrorState message={forecastUnavailableReason} /> : null}
          {forecastFeatureReady ? <LastRefreshed timestamp={forecastQuery.dataUpdatedAt} /> : null}
          {forecastFeatureReady && forecastQuery.isLoading ? <div>{ui("Loading forecast…")}</div> : null}
          {forecastFeatureReady && forecastQuery.isError && !forecastDeniedByFeature ? <ErrorState message={ui('Failed to load forecast: {error}').replace('{error}', getReadableError(forecastQuery.error, ui))} /> : null}
          {forecastFeatureReady && !forecastQuery.isLoading && !forecastQuery.isError && forecastRows.length === 0 ? <EmptyState message={ui("No recent consumption data was available to produce a forecast.")} /> : null}
          {forecastRows.length > 0 ? <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>{ui("Product")}</th><th>{ui("Average daily usage")}</th></tr></thead><tbody>
            {forecastRows.map((row) => <tr key={row.product_id}><td className="reports-strong">{row.product_name}</td><td>{ui('{quantity} {unit} / day').replace('{quantity}', formatNumber(row.avg_daily_usage, locale)).replace('{unit}', row.product_unit || ui('units'))}</td></tr>)}
          </tbody></table></div> : null}
        </ReportPanel>
      ) : null}
    </div>
  );
}
