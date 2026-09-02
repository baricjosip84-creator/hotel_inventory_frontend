import { Fragment, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { formatCurrencyAmount, getActiveTenantCurrency } from '../lib/tenantCurrency';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { OperationalWorkspaceHero, OperationalWorkspaceMetaPill, OperationalWorkspaceStatCard } from '../components/ui/OperationalWorkspace';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import './StockMovementsPage.css';

type PackageAuditFilter = 'all' | 'true' | 'false';
type CostStatusFilter = 'all' | 'costed' | 'uncosted';

type StockMovement = {
  id: string;
  product_id: string;
  product_name?: string | null;
  product_unit?: string | null;
  product_unit_snapshot?: string | null;
  movement_kind?: string | null;
  shipment_id?: string | null;
  shipment_po_number?: string | null;
  shipment_po_number_snapshot?: string | null;
  stock_transfer_id?: string | null;
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  temperature_zone?: string | null;
  movement_type?: string | null;
  change: number | string;
  reason: string;
  receiving_note?: string | null;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  cost_source?: string | null;
  cost_currency?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;
  package_id?: string | null;
  package_count_received?: number | string | null;
  package_name?: string | null;
  package_barcode?: string | null;
  units_per_package?: number | string | null;
  package_name_snapshot?: string | null;
  package_barcode_snapshot?: string | null;
  units_per_package_snapshot?: number | string | null;
};

type StockMovementSummary = {
  total_rows?: number | string;
  inbound_rows?: number | string;
  outbound_rows?: number | string;
  no_change_rows?: number | string;
  package_audited_rows?: number | string;
  costed_rows?: number | string;
  received_cost?: number | string;
  received_cost_currency?: string | null;
  received_cost_by_currency?: Array<{ currency_code: string; received_cost: number | string }>;
  earliest_movement_at?: string | null;
  latest_movement_at?: string | null;
};

type StockMovementFilterOptions = {
  products?: Array<{ id: string; name: string }>;
  shipments?: Array<{ id: string; po_number?: string | null }>;
  storage_locations?: Array<{ id: string; name: string }>;
  movement_types?: string[];
  cost_sources?: string[];
};

type FiltersState = {
  product_id: string;
  shipment_id: string;
  storage_location_id: string;
  movement_type: string;
  reason: string;
  search: string;
  package_audited: PackageAuditFilter;
  cost_status: CostStatusFilter;
  cost_source: string;
  start_date: string;
  end_date: string;
};

type PagingState = {
  page: number;
  pageSize: number;
};

const EMPTY_FILTERS: FiltersState = {
  product_id: '',
  shipment_id: '',
  storage_location_id: '',
  movement_type: '',
  reason: '',
  search: '',
  package_audited: 'all',
  cost_status: 'all',
  cost_source: '',
  start_date: '',
  end_date: ''
};

function firstSearchParam(params: URLSearchParams, names: string[]): string {
  for (const name of names) {
    const value = params.get(name);
    if (value?.trim()) return value.trim();
  }
  return '';
}

function filtersFromSearchParams(params: URLSearchParams): FiltersState {
  const packageAudit = firstSearchParam(params, ['package_audited', 'packageAudited']);
  const costStatus = firstSearchParam(params, ['cost_status', 'costStatus']);

  return {
    product_id: firstSearchParam(params, ['product_id', 'productId']),
    shipment_id: firstSearchParam(params, ['shipment_id', 'shipmentId']),
    storage_location_id: firstSearchParam(params, ['storage_location_id', 'storageLocationId']),
    movement_type: firstSearchParam(params, ['movement_type', 'movementType']),
    reason: firstSearchParam(params, ['reason']),
    search: firstSearchParam(params, ['search']),
    package_audited: packageAudit === 'true' || packageAudit === 'false' ? packageAudit : 'all',
    cost_status: costStatus === 'costed' || costStatus === 'uncosted' ? costStatus : 'all',
    cost_source: firstSearchParam(params, ['cost_source', 'costSource']),
    start_date: firstSearchParam(params, ['start_date', 'startDate', 'from']),
    end_date: firstSearchParam(params, ['end_date', 'endDate', 'to'])
  };
}

function pagingFromSearchParams(params: URLSearchParams): PagingState {
  const page = Math.max(Number(params.get('page')) || 1, 1);
  const pageSizeValue = Number(params.get('page_size')) || 50;
  const pageSize = [25, 50, 100].includes(pageSizeValue) ? pageSizeValue : 50;
  return { page, pageSize };
}

function searchParamsFromState(filters: FiltersState, paging: PagingState): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.product_id) params.set('product_id', filters.product_id);
  if (filters.shipment_id) params.set('shipment_id', filters.shipment_id);
  if (filters.storage_location_id) params.set('storage_location_id', filters.storage_location_id);
  if (filters.movement_type) params.set('movement_type', filters.movement_type);
  if (filters.reason) params.set('reason', filters.reason);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.package_audited !== 'all') params.set('package_audited', filters.package_audited);
  if (filters.cost_status !== 'all') params.set('cost_status', filters.cost_status);
  if (filters.cost_source) params.set('cost_source', filters.cost_source);
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  if (paging.page > 1) params.set('page', String(paging.page));
  if (paging.pageSize !== 50) params.set('page_size', String(paging.pageSize));
  return params;
}

function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

function buildMovementParams(filters: FiltersState, paging?: { limit: number; offset: number }): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.product_id) params.set('product_id', filters.product_id);
  if (filters.shipment_id) params.set('shipment_id', filters.shipment_id);
  if (filters.storage_location_id) params.set('storage_location_id', filters.storage_location_id);
  if (filters.movement_type) params.set('movement_type', filters.movement_type);
  if (filters.reason) params.set('reason', filters.reason);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.package_audited !== 'all') params.set('package_audited', filters.package_audited);
  if (filters.cost_status !== 'all') params.set('cost_status', filters.cost_status);
  if (filters.cost_source) params.set('cost_source', filters.cost_source);
  if (filters.start_date) params.set('start_date', filters.start_date);
  if (filters.end_date) params.set('end_date', filters.end_date);
  if (paging) {
    params.set('limit', String(paging.limit));
    params.set('offset', String(paging.offset));
  }
  return params;
}

async function fetchStockMovements(filters: FiltersState, limit: number, offset: number): Promise<StockMovement[]> {
  return apiRequest<StockMovement[]>(`/stock/movements?${buildMovementParams(filters, { limit, offset }).toString()}`);
}

async function fetchStockMovementSummary(filters: FiltersState): Promise<StockMovementSummary> {
  const query = buildMovementParams(filters).toString();
  return apiRequest<StockMovementSummary>(`/stock/movements/summary${query ? `?${query}` : ''}`);
}

async function fetchFilterOptions(): Promise<StockMovementFilterOptions> {
  return apiRequest<StockMovementFilterOptions>('/stock/movements/filter-options');
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateTime(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return '—';
  return formatLocalizedDateTime(value, locale);
}

function formatMoney(value: number | string | null | undefined, currency?: string | null): string {
  if (value === null || value === undefined || value === '') return '—';
  return formatCurrencyAmount(value, currency || getActiveTenantCurrency());
}

function humanizeCode(value?: string | null): string {
  if (!value) return 'Other movement';
  return value
    .replace(/[:_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function movementTypeFromRow(movement: StockMovement): string {
  const explicitType = movement.movement_type?.trim();
  const movementKind = movement.movement_kind?.trim();
  if (explicitType) {
    if (movementKind === 'unclassified' && ['stock_count', 'manual_adjustment', 'other'].includes(explicitType)) return 'unproven_legacy';
    return explicitType;
  }

  const reason = movement.reason || '';
  if (reason === 'shipment_receive') return 'shipment_receive';
  if (reason.startsWith('usage_reversal:')) return 'usage_reversal';
  if (reason.startsWith('usage:') || reason === 'consumption') return 'usage';
  if (reason.startsWith('stock_transfer_out:')) return 'stock_transfer_out';
  if (reason.startsWith('stock_transfer_in:')) return 'stock_transfer_in';
  if (reason === 'inventory_count') return 'stock_count';
  if (reason === 'manual_adjustment') return 'manual_adjustment';
  return 'unproven_legacy';
}

const MOVEMENT_LABELS: Record<string, string> = {
  shipment_receive: 'Shipment received',
  opening_stock: 'Opening stock',
  usage: 'Stock consumed',
  usage_reversal: 'Usage reversed',
  stock_count: 'Physical count',
  manual_adjustment: 'Manual adjustment',
  stock_transfer_in: 'Transfer received',
  stock_transfer_out: 'Transfer sent',
  reservation_fulfillment: 'Reservation fulfilled',
  requisition_fulfillment: 'Requisition fulfilled',
  cycle_count_reconciliation: 'Cycle count reconciled',
  expiry_writeoff: 'Expired stock write-off',
  quarantine_release: 'Quarantine released',
  stock_hold: 'Stock placed on hold',
  stock_hold_release: 'Stock hold released',
  supplier_return_dispatch: 'Supplier return sent',
  outbound_dispatch: 'Outbound dispatched',
  customer_return: 'Customer return',
  unproven_legacy: 'Unproven legacy movement',
  other: 'Other movement'
};

function movementTypeLabel(value?: string | null): string {
  return MOVEMENT_LABELS[value || ''] || 'Other movement';
}

function formatCurrencyBreakdown(rows?: Array<{ currency_code: string; received_cost: number | string }>): string {
  const values = (rows ?? []).filter((row) => row.currency_code);
  if (values.length === 0) return '—';
  return values.map((row) => formatCurrencyAmount(row.received_cost, row.currency_code)).join(' · ');
}

function costSourceLabel(value?: string | null): string {
  if (!value) return 'No source recorded';
  if (value === 'shipment_item_unit_cost') return 'Shipment item unit cost';
  if (value === 'product_standard') return 'Product standard cost';
  return humanizeCode(value);
}

function reasonDetail(movement: StockMovement): string | null {
  const type = movementTypeFromRow(movement);
  const reason = movement.reason || '';
  if (!reason) return null;
  if (type === 'usage' && reason.startsWith('usage:')) return humanizeCode(reason.slice('usage:'.length));
  if (type === 'usage_reversal' && reason.startsWith('usage_reversal:')) return `Reversed ${humanizeCode(reason.slice('usage_reversal:'.length)).toLowerCase()}`;
  if (type === 'stock_transfer_in' || type === 'stock_transfer_out') return null;
  if (type === 'outbound_dispatch' && reason.startsWith('outbound_dispatch:')) return `Order ${reason.slice('outbound_dispatch:'.length)}`;
  if (type === 'customer_return' && reason.startsWith('customer_return:')) {
    const [, returnNumber, condition] = reason.split(':');
    return [returnNumber ? `Return ${returnNumber}` : null, condition ? humanizeCode(condition) : null].filter(Boolean).join(' · ') || null;
  }
  if (type === 'supplier_return_dispatch') return movement.receiving_note || null;
  if (type === 'stock_hold' && reason.startsWith('stock_hold:')) {
    const parts = reason.split(':');
    const note = parts.slice(2).join(':').trim();
    return note && note !== 'held' ? note : null;
  }
  if (type === 'stock_hold_release' && reason.startsWith('stock_hold_release:')) {
    const parts = reason.split(':');
    const note = parts.slice(2).join(':').trim();
    return note && note !== 'released' ? note : null;
  }
  if (['expiry_writeoff', 'quarantine_release', 'opening_stock'].includes(type)) return null;
  if (reason === type || reason === 'shipment_receive' || reason === 'inventory_count' || reason === 'manual_adjustment') return null;
  return reason;
}


const UUID_TEXT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

function safeReasonEvidence(movement: StockMovement): string {
  const type = movementTypeFromRow(movement);
  const reason = movement.reason || '';
  const detail = reasonDetail(movement);

  if (type === 'stock_count' || type === 'manual_adjustment') return reason;
  if (type === 'stock_hold' || type === 'stock_hold_release') return detail || movementTypeLabel(type);
  if (type === 'outbound_dispatch' || type === 'customer_return') return detail || movementTypeLabel(type);
  if (type === 'supplier_return_dispatch') return movement.receiving_note || movementTypeLabel(type);
  if (type === 'requisition_fulfillment' || type === 'reservation_fulfillment') return movement.receiving_note || movementTypeLabel(type);
  if (type === 'usage' || type === 'usage_reversal') return detail || movementTypeLabel(type);
  if (type === 'unproven_legacy') return UUID_TEXT_PATTERN.test(reason) ? 'Legacy technical reason unavailable' : reason;
  return movementTypeLabel(type);
}

function safeReceivingNote(movement: StockMovement): string | null {
  if (movementTypeFromRow(movement) === 'cycle_count_reconciliation') return null;
  return movement.receiving_note || null;
}

function actorDisplay(movement: StockMovement, ui: (englishText: string) => string): string {
  if (movement.user_name) return movement.user_name;
  return movement.user_id ? ui('Historical actor unavailable') : ui('System / support actor');
}

function safeReasonDisplay(movement: StockMovement, ui: (englishText: string) => string): string {
  const type = movementTypeFromRow(movement);
  const evidence = safeReasonEvidence(movement);
  const detail = reasonDetail(movement);
  if (type === 'stock_count' || type === 'manual_adjustment') return evidence;
  if ((type === 'stock_hold' || type === 'stock_hold_release') && detail) return detail;
  if (type === 'supplier_return_dispatch' || type === 'requisition_fulfillment' || type === 'reservation_fulfillment') return evidence;
  if (type === 'outbound_dispatch' || type === 'customer_return') return localizeComposedLabel(evidence, ui);
  if (type === 'usage' || type === 'usage_reversal') return ui(evidence);
  if (type === 'unproven_legacy' && evidence === 'Legacy technical reason unavailable') return ui(evidence);
  if (type === 'unproven_legacy') return evidence;
  return ui(evidence);
}

function localizeComposedLabel(value: string | null | undefined, ui: (englishText: string) => string): string {
  if (!value) return '';
  for (const prefix of ['Reversed', 'Order', 'Return', 'Requisition', 'Reservation']) {
    if (value === prefix) return ui(prefix);
    if (value.startsWith(`${prefix} `)) return `${ui(prefix)} ${value.slice(prefix.length + 1)}`;
  }
  if (['Stock transfer', 'Opening stock import', 'Expiry processing', 'Lot hold', 'Lot hold release', 'Quarantine release', 'No linked workflow', 'Historical shipment reference unavailable'].includes(value)) {
    return ui(value);
  }
  return value;
}

function businessReference(movement: StockMovement): { label: string; to?: string } {
  const type = movementTypeFromRow(movement);
  const detail = reasonDetail(movement);

  if (type === 'supplier_return_dispatch' && movement.receiving_note) return { label: movement.receiving_note };
  if (type === 'requisition_fulfillment' && movement.receiving_note) {
    return { label: `Requisition ${movement.receiving_note.replace(/^Fulfilled\s+/i, '')}` };
  }
  if (type === 'reservation_fulfillment' && movement.receiving_note) {
    return { label: `Reservation ${movement.receiving_note.replace(/^Fulfilled reservation\s+/i, '')}` };
  }
  if (type === 'outbound_dispatch' && detail) return { label: detail };
  if (type === 'customer_return' && detail) return { label: detail };

  if (movement.shipment_id) {
    return {
      label: movement.shipment_po_number || 'Historical shipment reference unavailable',
      to: `/shipments?shipmentId=${encodeURIComponent(movement.shipment_id)}`
    };
  }

  if (movement.stock_transfer_id) {
    return {
      label: 'Stock transfer',
      to: `/stock-transfers?transfer_id=${encodeURIComponent(movement.stock_transfer_id)}`
    };
  }

  if (type === 'opening_stock') return { label: 'Opening stock import' };
  if (type === 'expiry_writeoff') return { label: 'Expiry processing' };
  if (type === 'stock_hold') return { label: 'Lot hold' };
  if (type === 'stock_hold_release') return { label: 'Lot hold release' };
  if (type === 'quarantine_release') return { label: 'Quarantine release' };

  return { label: 'No linked workflow' };
}

function hasPackageAudit(movement: StockMovement): boolean {
  return Boolean(
    movement.package_id
    || movement.package_name
    || movement.package_barcode
    || (movement.package_count_received !== null && movement.package_count_received !== undefined)
  );
}

function badgeStyle(type: string): CSSProperties {
  if (['shipment_receive', 'stock_transfer_in', 'usage_reversal', 'opening_stock', 'quarantine_release', 'stock_hold_release'].includes(type)) return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  if (['usage', 'stock_transfer_out', 'expiry_writeoff', 'stock_hold', 'supplier_return_dispatch', 'outbound_dispatch'].includes(type) || type.includes('fulfillment')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (type.includes('count') || type.includes('adjust')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#e5e7eb', color: '#374151' };
}

function changeBadgeStyle(value: number): CSSProperties {
  if (value > 0) return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  if (value < 0) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  return { ...styles.badge, background: '#e5e7eb', color: '#374151' };
}

function csvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  let text = value;
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvNumericValue(value: number | string | null | undefined): number | '' {
  if (value === null || value === undefined || value === '') return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
}

function downloadCsv(rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(csvValue).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportRows(rows: StockMovement[], locale: AppLocale, ui: (englishText: string) => string) {
  downloadCsv([
    [ui('Created'), ui('Product'), ui('Storage Location'), ui('Movement Type'), ui('Change'), ui('Unit'), ui('Reason'), ui('Receiving Note'), ui('Unit Cost'), ui('Total Cost'), ui('Cost Currency'), ui('Cost Source'), ui('Shipment'), ui('User'), ui('Package'), ui('Package Barcode'), ui('Package Count')],
    ...rows.map((movement) => [
      formatDateTime(movement.created_at, locale), movement.product_name || ui('Historical Product name unavailable'), movement.storage_location_name || ui('Historical location unavailable'),
      ui(movementTypeLabel(movementTypeFromRow(movement))), toNumber(movement.change), movement.product_unit || ui('Historical unit unavailable'),
      safeReasonDisplay(movement, ui), safeReceivingNote(movement) || '', csvNumericValue(movement.unit_cost), csvNumericValue(movement.total_cost), movement.cost_currency || '',
      movement.cost_source || '', movement.shipment_id ? (movement.shipment_po_number || ui('Historical shipment reference unavailable')) : '', actorDisplay(movement, ui),
      movement.package_id ? (movement.package_name || ui('Historical package evidence unavailable')) : (movement.package_name || ''), movement.package_barcode || '', movement.package_count_received ?? ''
    ])
  ]);
}

export default function StockMovementsPage() {
  const { locale, ui } = useAppTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const canOpenShipments = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ);
  const canOpenStockTransfers = hasPermission(TENANT_PERMISSIONS.STOCK_TRANSFERS_READ);
  const routeKey = searchParams.toString();
  const [filters, setFilters] = useState<FiltersState>(() => filtersFromSearchParams(searchParams));
  const [paging, setPaging] = useState<PagingState>(() => pagingFromSearchParams(searchParams));
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(() => {
    const initial = filtersFromSearchParams(searchParams);
    return Boolean(initial.shipment_id || initial.package_audited !== 'all' || initial.cost_status !== 'all' || initial.cost_source);
  });
  const [expandedMovementIds, setExpandedMovementIds] = useState<Set<string>>(() => new Set());
  const debouncedSearch = useDebouncedValue(filters.search, 250);
  const queryFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [debouncedSearch, filters]);

  useEffect(() => {
    const params = new URLSearchParams(routeKey);
    setFilters(filtersFromSearchParams(params));
    setPaging(pagingFromSearchParams(params));
  }, [routeKey]);

  const pushState = (nextFilters: FiltersState, nextPaging: PagingState) => {
    setFilters(nextFilters);
    setPaging(nextPaging);
    setSearchParams(searchParamsFromState(nextFilters, nextPaging), { replace: true });
  };

  const updateFilter = <K extends keyof FiltersState>(key: K, value: FiltersState[K]) => {
    pushState({ ...filters, [key]: value }, { ...paging, page: 1 });
  };

  const filterOptionsQuery = useQuery({ queryKey: ['stock-movement-filter-options'], queryFn: fetchFilterOptions });
  const summaryQuery = useQuery({ queryKey: ['stock-movement-summary', queryFilters], queryFn: () => fetchStockMovementSummary(queryFilters) });
  const movementsQuery = useQuery({
    queryKey: ['stock-movements', queryFilters, paging.page, paging.pageSize],
    queryFn: () => fetchStockMovements(queryFilters, paging.pageSize + 1, (paging.page - 1) * paging.pageSize)
  });

  const fetchedRows = movementsQuery.data ?? [];
  const rows = fetchedRows.slice(0, paging.pageSize);
  const hasNextPageWithoutSummary = fetchedRows.length > paging.pageSize;
  const summary = summaryQuery.data ?? {};
  const summaryAvailable = !summaryQuery.isLoading && !summaryQuery.isError;
  const totalRows = summaryAvailable ? toNumber(summary.total_rows) : 0;
  const totalPages = summaryAvailable ? Math.max(Math.ceil(totalRows / paging.pageSize), 1) : paging.page;
  const firstRow = rows.length === 0 ? 0 : (paging.page - 1) * paging.pageSize + 1;
  const lastRow = rows.length === 0 ? 0 : firstRow + rows.length - 1;
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => value && value !== 'all' && !(key === 'search' && !String(value).trim())).length;
  const advancedFilterCount = [
    filters.shipment_id,
    filters.package_audited !== 'all' ? filters.package_audited : '',
    filters.cost_status !== 'all' ? filters.cost_status : '',
    filters.cost_source
  ].filter(Boolean).length;

  useEffect(() => {
    if (advancedFilterCount > 0) setShowAdvancedFilters(true);
  }, [advancedFilterCount]);

  useEffect(() => {
    if (summaryAvailable && paging.page > totalPages && totalRows > 0) {
      pushState(filters, { ...paging, page: totalPages });
    }
  // pushState intentionally excluded because it is recreated per render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paging.page, summaryAvailable, totalPages, totalRows]);

  const refreshAll = () => {
    void Promise.all([filterOptionsQuery.refetch(), summaryQuery.refetch(), movementsQuery.refetch()]);
  };

  const toggleMovementDetails = (movementId: string) => {
    setExpandedMovementIds((current) => {
      const next = new Set(current);
      if (next.has(movementId)) next.delete(movementId);
      else next.add(movementId);
      return next;
    });
  };

  const exportAll = async () => {
    if (rows.length === 0 || isExporting) return;
    setIsExporting(true);
    setExportError('');
    try {
      const allRows: StockMovement[] = [];
      for (let offset = 0; ; offset += 500) {
        const batch = await fetchStockMovements(queryFilters, 500, offset);
        allRows.push(...batch);
        if (batch.length < 500) break;
      }
      exportRows(allRows, locale, ui);
    } catch (error) {
      setExportError((error as Error).message || ui('Could not export the filtered movement ledger.'));
    } finally {
      setIsExporting(false);
    }
  };

  const options = filterOptionsQuery.data ?? {};

  return (
    <div className="io-operational-page io-stock-movements-page io-workspace-page" style={styles.page}>
      <OperationalWorkspaceHero
        iconPath="/stock-movements"
        eyebrow={ui("Stock audit")}
        title={ui("Stock movement ledger")}
        description={ui("Trace every recorded stock change by product, location, movement type, reference, operator, package, and cost evidence. This ledger is read-only.")}
        meta={<>
          <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Read-only ledger")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Audit evidence")}</OperationalWorkspaceMetaPill>
        </>}
        aside={(
          <button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={movementsQuery.isFetching || summaryQuery.isFetching || filterOptionsQuery.isFetching}>
            {movementsQuery.isFetching || summaryQuery.isFetching || filterOptionsQuery.isFetching ? ui("Refreshing…") : ui("Refresh ledger")}
          </button>
        )}
      />

      <section className="stock-movements-summary-grid io-workspace-stats" aria-label={ui("Filtered stock movement summary")}>
        {[
          [ui("Movements"), summaryAvailable ? toNumber(summary.total_rows) : '—', summaryAvailable && toNumber(summary.no_change_rows) > 0 ? `${formatLocalizedNumber(toNumber(summary.no_change_rows), locale)} ${ui('event(s) did not change usable stock')}` : ui("All rows matching the current filters")],
          [ui("Stock Added"), summaryAvailable ? toNumber(summary.inbound_rows) : '—', ui("Movement events that increased stock")],
          [ui("Stock Removed"), summaryAvailable ? toNumber(summary.outbound_rows) : '—', ui("Movement events that reduced stock")],
          [ui("Package Audited"), summaryAvailable ? toNumber(summary.package_audited_rows) : '—', ui("Rows with package receiving evidence")],
          [ui("Cost Captured"), summaryAvailable ? toNumber(summary.costed_rows) : '—', ui("Rows with cost evidence")],
          [ui("Received Cost"), summaryAvailable ? formatCurrencyBreakdown(summary.received_cost_by_currency) : '—', ui("Inbound receipt cost grouped by currency; currencies are never added together")]
        ].map(([label, value, helper]) => (
          <OperationalWorkspaceStatCard key={String(label)} label={label} value={value} helper={helper} />
        ))}
      </section>


      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div className="io-section-heading-with-icon">
            <span className="io-section-heading-icon"><TenantNavIcon path="/stock-movements" size={17} /></span>
            <div className="io-section-heading-copy">
              <h3 style={styles.panelTitle}>{ui("Filters")}</h3>
              <p style={styles.sectionDescription}>{ui("Filters work together and are preserved in the page link.")}</p>
            </div>
          </div>
          <button type="button" className="app-button app-button--secondary" onClick={() => pushState(EMPTY_FILTERS, { ...paging, page: 1 })} disabled={activeFilterCount === 0}>{ui("Clear Filters")}{activeFilterCount ? ` (${formatLocalizedNumber(activeFilterCount, locale)})` : ''}</button>
        </div>

        {filterOptionsQuery.isError ? <div className="app-error-state">{ui("Filter options could not be loaded. The ledger itself can still be searched.")}</div> : null}
        {filters.reason ? <div className="stock-movements-legacy-filter">{ui("Exact reason filter from a shared link:")} <strong>{filters.reason}</strong><button type="button" onClick={() => updateFilter('reason', '')}>{ui("Remove")}</button></div> : null}

        <div className="stock-movements-filter-grid stock-movements-filter-grid--primary">
          <label className="stock-movements-field">{ui("Product")}
            <select value={filters.product_id} onChange={(event) => updateFilter('product_id', event.target.value)}>
              <option value="">{ui("All products")}</option>
              {(options.products ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="stock-movements-field">{ui("Storage Location")}
            <select value={filters.storage_location_id} onChange={(event) => updateFilter('storage_location_id', event.target.value)}>
              <option value="">{ui("All locations")}</option>
              {(options.storage_locations ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="stock-movements-field">{ui("Movement Type")}
            <select value={filters.movement_type} onChange={(event) => updateFilter('movement_type', event.target.value)}>
              <option value="">{ui("All movement types")}</option>
              {(options.movement_types ?? []).map((value) => <option key={value} value={value}>{ui(movementTypeLabel(value))}</option>)}
            </select>
          </label>
          <label className="stock-movements-field">{ui("From Date")}
            <input type="date" value={filters.start_date} max={filters.end_date || undefined} onChange={(event) => updateFilter('start_date', event.target.value)} />
          </label>
          <label className="stock-movements-field">{ui("To Date")}
            <input type="date" value={filters.end_date} min={filters.start_date || undefined} onChange={(event) => updateFilter('end_date', event.target.value)} />
          </label>
          <label className="stock-movements-field stock-movements-search-field">{ui("Search Ledger")}
            <input type="search" value={filters.search} onChange={(event) => updateFilter('search', event.target.value)} placeholder={ui("Product, location, operator, note, package/barcode, shipment, or cost source")} maxLength={255} />
            <span>{ui("Search updates automatically after a brief pause.")}</span>
          </label>
        </div>

        <div className="stock-movements-more-filters-row">
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={() => setShowAdvancedFilters((current) => !current)}
            aria-expanded={showAdvancedFilters}
          >
            {showAdvancedFilters ? ui("Hide more filters") : ui("More filters")}{advancedFilterCount ? ` (${formatLocalizedNumber(advancedFilterCount, locale)})` : ''}
          </button>
          <span>{ui("Shipment, package, and costing filters are available when you need a deeper audit.")}</span>
        </div>

        {showAdvancedFilters ? <div className="stock-movements-filter-grid stock-movements-filter-grid--advanced">
          <label className="stock-movements-field">{ui("Shipment")}
            <select value={filters.shipment_id} onChange={(event) => updateFilter('shipment_id', event.target.value)}>
              <option value="">{ui("All shipments")}</option>
              {(options.shipments ?? []).map((item) => <option key={item.id} value={item.id}>{item.po_number || ui("Shipment record")}</option>)}
            </select>
          </label>
          <label className="stock-movements-field">{ui("Package Audit")}
            <select value={filters.package_audited} onChange={(event) => updateFilter('package_audited', event.target.value as PackageAuditFilter)}>
              <option value="all">{ui("All movements")}</option><option value="true">{ui("Package-audited only")}</option><option value="false">{ui("Base-unit or manual only")}</option>
            </select>
          </label>
          <label className="stock-movements-field">{ui("Cost Status")}
            <select value={filters.cost_status} onChange={(event) => updateFilter('cost_status', event.target.value as CostStatusFilter)}>
              <option value="all">{ui("All cost statuses")}</option><option value="costed">{ui("Cost captured")}</option><option value="uncosted">{ui("No cost captured")}</option>
            </select>
          </label>
          <label className="stock-movements-field">{ui("Cost Source")}
            <select value={filters.cost_source} onChange={(event) => updateFilter('cost_source', event.target.value)}>
              <option value="">{ui("All cost sources")}</option>
              {(options.cost_sources ?? []).map((value) => <option key={value} value={value}>{ui(costSourceLabel(value))}</option>)}
            </select>
          </label>
        </div> : null}
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div className="io-section-heading-with-icon">
            <span className="io-section-heading-icon"><TenantNavIcon path="/stock-movements" size={17} /></span>
            <div className="io-section-heading-copy">
              <h3 style={styles.panelTitle}>{ui("Movement Ledger")}</h3>
              <p style={styles.sectionDescription}>{rows.length ? (summaryAvailable ? `${ui('Showing')} ${formatLocalizedNumber(firstRow, locale)}–${formatLocalizedNumber(lastRow, locale)} ${ui('of')} ${formatLocalizedNumber(totalRows, locale)} ${ui('filtered movements.')}` : `${ui('Showing')} ${formatLocalizedNumber(firstRow, locale)}–${formatLocalizedNumber(lastRow, locale)} ${ui('filtered movements.')} ${ui('Full total unavailable.')}`) : ui("No movements match the current filters.")}</p>
            </div>
          </div>
          <div className="stock-movements-ledger-actions">
            <label>{ui("Rows per page")}
              <select value={paging.pageSize} onChange={(event) => pushState(filters, { page: 1, pageSize: Number(event.target.value) })}><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select>
            </label>
            <button type="button" className="app-button app-button--secondary" onClick={exportAll} disabled={rows.length === 0 || isExporting}>{isExporting ? ui("Preparing CSV…") : ui("Export Filtered CSV")}</button>
          </div>
        </div>

        {exportError ? <div className="app-error-state">{exportError}</div> : null}
        {summaryQuery.isError ? <div className="app-error-state">{ui("The full filtered summary could not be loaded. The visible ledger rows are still shown.")}</div> : null}
        {movementsQuery.isLoading ? <div className="app-empty-state">{ui("Loading stock movement ledger…")}</div> : null}
        {movementsQuery.isError ? <div className="app-error-state">{ui("Failed to load stock movements:")} {(movementsQuery.error as Error).message || ui("Unknown error")}</div> : null}

        {!movementsQuery.isLoading && !movementsQuery.isError && rows.length === 0 ? <div className="app-empty-state">{ui("No stock movements found for the current filters.")}</div> : null}

        {rows.length > 0 ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>{ui("Created")}</th><th style={styles.th}>{ui("Product & Location")}</th><th style={styles.th}>{ui("Change")}</th><th style={styles.th}>{ui("Movement")}</th><th style={styles.th}>{ui("Reference")}</th><th style={styles.th}>{ui("Operator")}</th><th style={styles.th}>{ui("Details")}</th></tr></thead>
              <tbody>{rows.map((movement) => {
                const amount = toNumber(movement.change);
                const type = movementTypeFromRow(movement);
                const detail = reasonDetail(movement);
                const reference = businessReference(movement);
                const canOpenReference = Boolean(
                  reference.to
                  && ((movement.shipment_id && canOpenShipments) || (movement.stock_transfer_id && canOpenStockTransfers))
                );
                const isExpanded = expandedMovementIds.has(movement.id);
                return <Fragment key={movement.id}>
                  <tr>
                    <td style={styles.td}>{formatDateTime(movement.created_at, locale)}</td>
                    <td style={styles.td}><div style={styles.rowTitle}>{movement.product_name || ui("Historical Product name unavailable")}</div><div style={styles.rowSubtle}>{movement.storage_location_name || ui("Historical location unavailable")}</div><div style={styles.rowSubtle}>{movement.product_unit || ui("Historical unit unavailable")}</div></td>
                    <td style={styles.td}><span style={changeBadgeStyle(amount)}>{amount > 0 ? `+${formatLocalizedNumber(amount, locale)}` : formatLocalizedNumber(amount, locale)}</span><div style={styles.rowSubtle}>{formatLocalizedNumber(Math.abs(amount), locale)} {movement.product_unit || ui("Historical unit unavailable")}</div></td>
                    <td style={styles.td}><span style={badgeStyle(type)}>{ui(movementTypeLabel(type))}</span>{detail ? <div style={styles.rowSubtle}>{localizeComposedLabel(detail, ui)}</div> : null}{safeReceivingNote(movement) && detail !== safeReceivingNote(movement) ? <div style={styles.note}>{ui("Note:")} {safeReceivingNote(movement)}</div> : null}</td>
                    <td style={styles.td}>{canOpenReference && reference.to ? <Link className="stock-movements-reference-link" to={reference.to}>{localizeComposedLabel(reference.label, ui)}</Link> : <div style={styles.rowTitle}>{localizeComposedLabel(reference.label, ui)}</div>}</td>
                    <td style={styles.td}><div style={styles.rowTitle}>{actorDisplay(movement, ui)}</div></td>
                    <td style={styles.td}><button type="button" className="app-button app-button--secondary stock-movements-details-button" onClick={() => toggleMovementDetails(movement.id)} aria-expanded={isExpanded}>{isExpanded ? ui("Hide") : ui("View")}</button></td>
                  </tr>
                  {isExpanded ? <tr className="stock-movements-details-row">
                    <td colSpan={7}>
                      <div className="stock-movements-details-grid">
                        <div className="stock-movements-detail-card">
                          <strong>{ui("Cost evidence")}</strong>
                          {movement.total_cost !== null && movement.total_cost !== undefined ? <>
                            <span>{ui("Total:")} {formatMoney(movement.total_cost, movement.cost_currency)}</span>
                            <span>{ui("Unit:")} {formatMoney(movement.unit_cost, movement.cost_currency)}</span>
                            <span>{ui(costSourceLabel(movement.cost_source))}</span>
                          </> : <span>{ui("No cost captured for this movement.")}</span>}
                        </div>
                        <div className="stock-movements-detail-card">
                          <strong>{ui("Package evidence")}</strong>
                          {hasPackageAudit(movement) ? <>
                            <span>{toNumber(movement.package_count_received) > 0 ? `${formatLocalizedNumber(toNumber(movement.package_count_received), locale)} × ` : ''}{movement.package_name || ui("Historical package evidence unavailable")}</span>
                            {movement.units_per_package ? <span>{formatLocalizedNumber(Number(movement.units_per_package), locale)} {ui("units per package")}</span> : null}
                            {movement.package_barcode ? <span>{ui("Barcode:")} {movement.package_barcode}</span> : null}
                          </> : <span>{ui("Base-unit or manual movement; no package receiving evidence.")}</span>}
                        </div>
                        <div className="stock-movements-detail-card">
                          <strong>{ui("Audit context")}</strong>
                          <span>{ui("Movement classification:")} {ui(movementTypeLabel(type))}</span>
                          <span>{ui("Recorded reason:")} {safeReasonDisplay(movement, ui) || ui("not recorded")}</span>
                          {!movement.product_unit ? <span>{ui("Historical unit evidence is unavailable for this legacy movement.")}</span> : null}
                        </div>
                      </div>
                    </td>
                  </tr> : null}
                </Fragment>;
              })}</tbody>
            </table>
          </div>
        ) : null}

        {(paging.page > 1 || hasNextPageWithoutSummary || (summaryAvailable && totalRows > paging.pageSize)) ? <div className="stock-movements-pagination"><button type="button" className="app-button app-button--secondary" onClick={() => pushState(filters, { ...paging, page: paging.page - 1 })} disabled={paging.page <= 1}>{ui("Previous")}</button><span>{summaryAvailable ? `${ui("Page")} ${formatLocalizedNumber(paging.page, locale)} ${ui("of")} ${formatLocalizedNumber(totalPages, locale)}` : `${ui("Page")} ${formatLocalizedNumber(paging.page, locale)}`}</span><button type="button" className="app-button app-button--secondary" onClick={() => pushState(filters, { ...paging, page: paging.page + 1 })} disabled={summaryAvailable ? paging.page >= totalPages : !hasNextPageWithoutSummary}>{ui("Next")}</button></div> : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { width: '100%', minWidth: 0 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 },
  title: { margin: 0, fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' },
  description: { margin: '8px 0 0', color: '#64748b', lineHeight: 1.5, maxWidth: 900 },
  panel: { minWidth: 0 },
  sectionHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 16 },
  panelTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' },
  sectionDescription: { margin: '6px 0 0', color: '#64748b', lineHeight: 1.45 },
  summaryCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 18, minWidth: 0, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)' },
  summaryLabel: { fontSize: 12, color: '#64748b', fontWeight: 700, marginBottom: 8 },
  summaryValue: { fontSize: 28, fontWeight: 700, lineHeight: 1.2, overflowWrap: 'anywhere', color: '#0f172a' },
  summaryHelper: { fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 8 },
  tableWrapper: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflowX: 'auto', minWidth: 0 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 980 },
  th: { textAlign: 'left', padding: 14, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' },
  td: { padding: 14, borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#0f172a', verticalAlign: 'top', overflowWrap: 'anywhere' },
  badge: { display: 'inline-block', padding: '6px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' },
  rowTitle: { fontWeight: 700, color: '#0f172a', marginBottom: 5 },
  rowSubtle: { fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 4 },
  note: { fontSize: 12, color: '#374151', lineHeight: 1.4, marginTop: 7 }
};
