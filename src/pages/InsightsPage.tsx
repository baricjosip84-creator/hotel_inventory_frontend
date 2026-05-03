import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';

type DepletionRiskResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number;
  rows: Array<{
    stock_id: string;
    product_id: string;
    product_name: string;
    product_category?: string | null;
    product_unit?: string | null;
    storage_location_name: string;
    current_quantity: number | string;
    configured_min_quantity: number | string;
    recent_outbound_quantity: number | string;
    average_daily_outbound: number | string;
    estimated_days_of_coverage: number | null;
    risk_score: number | string;
    risk_tier: string;
  }>;
};

type ReorderRecommendationsResponse = {
  generated_at: string;
  tenant_id: string;
  lookback_days: number;
  rows: Array<{
    product_id: string;
    product_name: string;
    unit: string;
    current_quantity: number | string;
    min_stock: number | string;
    average_daily_usage: number | string;
    estimated_days_of_coverage: number | null;
    recommended_reorder_quantity: number | string;
    urgency: string;
  }>;
};

type OperationalHealthResponse = {
  generated_at: string;
  tenant_id: string;
  health_score: number | string;
  health_tier: string;
  metrics: {
    unresolved_alerts: number;
    overdue_shipments: number;
    total_stock_rows: number;
    low_stock_rows: number;
    low_stock_rate_pct: number | string;
    discrepancy_rate_pct: number | string;
  };
};

type AnomaliesResponse = {
  generated_at: string;
  tenant_id: string;
  short_window_days: number;
  baseline_window_days: number;
  rows: Array<{
    product_id: string;
    product_name: string;
    product_category?: string | null;
    product_unit?: string | null;
    recent_daily_outbound: number | string;
    baseline_daily_outbound: number | string;
    spike_ratio: number | string;
    anomaly_score: number | string;
    anomaly_tier: string;
  }>;
};

type SupplierTrustResponse = {
  generated_at: string;
  tenant_id: string;
  summary?: {
    total_suppliers: number | string;
    suppliers_with_risk: number | string;
    total_risk_flags: number | string;
    high_risk_flags: number | string;
    medium_risk_flags: number | string;
    low_risk_flags: number | string;
    overdue_open_purchase_orders: number | string;
    closed_short_purchase_orders: number | string;
    po_remaining_quantity: number | string;
    po_remaining_value: number | string;
    risk_supplier_rate_pct: number | string;
  };
  rows: Array<{
    supplier_id: string;
    supplier_name: string;
    completion_rate_pct: number | string;
    overdue_rate_pct: number | string;
    fill_rate_pct: number | string;
    discrepancy_rate_pct: number | string;
    trust_score: number | string;
    trust_tier: string;
    total_shipments: number | string;
    total_purchase_orders: number | string;
    completed_purchase_orders: number | string;
    cancelled_purchase_orders: number | string;
    open_purchase_orders: number | string;
    overdue_open_purchase_orders: number | string;
    fully_received_purchase_orders: number | string;
    manually_closed_purchase_orders: number | string;
    closed_short_purchase_orders: number | string;
    po_ordered_quantity: number | string;
    po_received_quantity: number | string;
    po_remaining_quantity: number | string;
    po_ordered_value: number | string;
    po_received_value: number | string;
    po_remaining_value: number | string;
    po_fill_rate_pct: number | string;
    po_completion_rate_pct: number | string;
    po_short_close_rate_pct: number | string;
    risk_flags?: Array<{
      code: string;
      label: string;
      severity: 'high' | 'medium' | 'low';
      detail: string;
    }>;
  }>;
};

type SupplierRiskFilter = 'all' | 'with_risk' | 'high' | 'medium' | 'low' | 'none';
type SupplierTierFilter = 'all' | 'excellent' | 'strong' | 'watch' | 'risk';
type SupplierSort =
  | 'trust_asc'
  | 'trust_desc'
  | 'risk_flags_desc'
  | 'remaining_value_desc'
  | 'overdue_pos_desc'
  | 'fill_rate_asc';

type SupplierPageSize = 6 | 12 | 24 | 48;

const SUPPLIER_RISK_FILTERS: SupplierRiskFilter[] = ['all', 'with_risk', 'high', 'medium', 'low', 'none'];
const SUPPLIER_TIER_FILTERS: SupplierTierFilter[] = ['all', 'excellent', 'strong', 'watch', 'risk'];
const SUPPLIER_SORT_OPTIONS: SupplierSort[] = ['trust_asc', 'trust_desc', 'risk_flags_desc', 'remaining_value_desc', 'overdue_pos_desc', 'fill_rate_asc'];
const SUPPLIER_PAGE_SIZE_OPTIONS: SupplierPageSize[] = [6, 12, 24, 48];

function normalizeSupplierRiskFilter(value: string | null): SupplierRiskFilter {
  return SUPPLIER_RISK_FILTERS.includes(value as SupplierRiskFilter) ? (value as SupplierRiskFilter) : 'all';
}

function normalizeSupplierTierFilter(value: string | null): SupplierTierFilter {
  return SUPPLIER_TIER_FILTERS.includes(value as SupplierTierFilter) ? (value as SupplierTierFilter) : 'all';
}

function normalizeSupplierSort(value: string | null): SupplierSort {
  return SUPPLIER_SORT_OPTIONS.includes(value as SupplierSort) ? (value as SupplierSort) : 'risk_flags_desc';
}

function normalizeSupplierPage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeSupplierPageSize(value: string | null): SupplierPageSize {
  const parsed = Number(value);
  return SUPPLIER_PAGE_SIZE_OPTIONS.includes(parsed as SupplierPageSize) ? (parsed as SupplierPageSize) : 12;
}

function toReadableError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function formatNumber(value: number | string | null | undefined, digits = 2): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(toNumber(value));
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function escapeCsv(value: unknown): string {
  const normalized = value === null || value === undefined ? '' : String(value);
  return `"${normalized.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<unknown>>) {
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown): string {
  const normalized = value === null || value === undefined ? '' : String(value);

  return normalized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRiskFlagStyle(severity: 'high' | 'medium' | 'low'): CSSProperties {
  if (severity === 'high') {
    return styles.riskFlagHigh;
  }

  if (severity === 'medium') {
    return styles.riskFlagMedium;
  }

  return styles.riskFlagLow;
}

function getSupplierRecommendedActions(row: SupplierTrustResponse['rows'][number]): Array<{ title: string; detail: string; priority: 'high' | 'medium' | 'low' }> {
  const actions: Array<{ title: string; detail: string; priority: 'high' | 'medium' | 'low' }> = [];
  const riskFlags = row.risk_flags ?? [];

  if (riskFlags.some((flag) => flag.code === 'overdue_open_purchase_orders')) {
    actions.push({
      title: 'Follow up overdue POs',
      detail: `${formatNumber(row.overdue_open_purchase_orders, 0)} open POs are overdue for this supplier.`,
      priority: 'high'
    });
  }

  if (riskFlags.some((flag) => flag.code === 'closed_short_purchase_orders')) {
    actions.push({
      title: 'Review short-closed POs',
      detail: `${formatNumber(row.closed_short_purchase_orders, 0)} POs were manually closed short. Confirm whether this is supplier under-delivery or planned cancellation.`,
      priority: 'high'
    });
  }

  if (riskFlags.some((flag) => flag.code === 'low_po_fill_rate')) {
    actions.push({
      title: 'Check PO fill performance',
      detail: `PO fill rate is ${formatNumber(row.po_fill_rate_pct)}%. Compare ordered vs received quantities before new large orders.`,
      priority: 'medium'
    });
  }

  if (riskFlags.some((flag) => flag.code === 'po_remaining_quantity')) {
    actions.push({
      title: 'Monitor remaining exposure',
      detail: `${formatNumber(row.po_remaining_quantity)} units remain open with estimated value ${formatNumber(row.po_remaining_value)}.`,
      priority: 'medium'
    });
  }

  if (riskFlags.some((flag) => flag.code === 'shipment_discrepancies')) {
    actions.push({
      title: 'Investigate shipment discrepancies',
      detail: `Shipment discrepancy rate is ${formatNumber(row.discrepancy_rate_pct)}%. Review receiving notes and shipment audits.`,
      priority: 'medium'
    });
  }

  if (riskFlags.some((flag) => flag.code === 'overdue_shipments' || flag.code === 'partial_shipments')) {
    actions.push({
      title: 'Review shipment reliability',
      detail: `Shipment overdue rate is ${formatNumber(row.overdue_rate_pct)}% and fill rate is ${formatNumber(row.fill_rate_pct)}%.`,
      priority: 'low'
    });
  }

  if (!actions.length) {
    actions.push({
      title: 'Maintain supplier cadence',
      detail: 'No active supplier risk flags. Keep normal monitoring and periodic review cadence.',
      priority: 'low'
    });
  }

  return actions.slice(0, 5);
}

async function fetchDepletionRisk(lookbackDays: number): Promise<DepletionRiskResponse> {
  return apiRequest<DepletionRiskResponse>(`/inventory-insights/depletion-risk?lookback_days=${lookbackDays}`);
}

async function fetchReorderRecommendations(lookbackDays: number): Promise<ReorderRecommendationsResponse> {
  return apiRequest<ReorderRecommendationsResponse>(`/reorder-insights/recommendations?lookback_days=${lookbackDays}`);
}

async function fetchOperationalHealth(): Promise<OperationalHealthResponse> {
  return apiRequest<OperationalHealthResponse>('/operational-insights/health-score');
}

async function fetchAnomalies(): Promise<AnomaliesResponse> {
  return apiRequest<AnomaliesResponse>('/operational-insights/anomalies');
}

async function fetchSupplierTrust(): Promise<SupplierTrustResponse> {
  return apiRequest<SupplierTrustResponse>('/supplier-insights/trust-scores');
}

function Section(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="app-panel app-panel--padded" style={styles.panel}>
      <div style={styles.panelHeader}>
        <div style={styles.panelHeaderText}>
          <h3 style={styles.panelTitle}>{props.title}</h3>
          <p style={styles.panelSubtitle}>{props.subtitle}</p>
        </div>
      </div>
      {props.children}
    </section>
  );
}

function StatCard(props: { title: string; value: string; subtitle: string; tone?: 'default' | 'warn' | 'bad' | 'good' }) {
  const valueStyle =
    props.tone === 'bad'
      ? styles.statValueBad
      : props.tone === 'warn'
        ? styles.statValueWarn
        : props.tone === 'good'
          ? styles.statValueGood
          : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function InsightsPage() {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the InsightsPage you sent.

    Existing real behavior is preserved:
    - same insight endpoints
    - same query keys
    - same action-agenda logic
    - same operational health / supplier trust / depletion / reorder / anomaly rendering
    - same route targets and analytics text

    This pass applies the shared UI foundation carefully:
    - major sections now use app-panel/app-panel--padded
    - stats now use app-grid-stats
    - info/error states align with the shared state layer
    - no analytics logic was changed

    WHAT PROBLEM IT SOLVES
    ----------------------
    Makes Insights consume the same shared visual system as the other polished
    pages without changing backend contracts, flows, or decision logic.
  */
  const [searchParams, setSearchParams] = useSearchParams();
  const [lookbackDays, setLookbackDays] = useState(30);
  const [supplierRiskFilter, setSupplierRiskFilter] = useState<SupplierRiskFilter>(() => normalizeSupplierRiskFilter(searchParams.get('supplier_risk')));
  const [supplierTierFilter, setSupplierTierFilter] = useState<SupplierTierFilter>(() => normalizeSupplierTierFilter(searchParams.get('supplier_tier')));
  const [supplierSort, setSupplierSort] = useState<SupplierSort>(() => normalizeSupplierSort(searchParams.get('supplier_sort')));
  const [supplierSearch, setSupplierSearch] = useState(() => searchParams.get('supplier_search') ?? '');
  const [supplierPage, setSupplierPage] = useState(() => normalizeSupplierPage(searchParams.get('supplier_page')));
  const [supplierPageSize, setSupplierPageSize] = useState<SupplierPageSize>(() => normalizeSupplierPageSize(searchParams.get('supplier_page_size')));
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(() => searchParams.get('supplier_id'));

  const depletionRiskQuery = useQuery({
    queryKey: ['insights', 'depletion-risk', lookbackDays],
    queryFn: () => fetchDepletionRisk(lookbackDays)
  });

  const reorderQuery = useQuery({
    queryKey: ['insights', 'reorder-recommendations', lookbackDays],
    queryFn: () => fetchReorderRecommendations(lookbackDays)
  });

  const healthQuery = useQuery({
    queryKey: ['insights', 'health-score'],
    queryFn: fetchOperationalHealth
  });

  const anomaliesQuery = useQuery({
    queryKey: ['insights', 'anomalies'],
    queryFn: fetchAnomalies
  });

  const supplierTrustQuery = useQuery({
    queryKey: ['insights', 'supplier-trust'],
    queryFn: fetchSupplierTrust
  });

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    const setOrDelete = (key: string, value: string | null, defaultValue?: string) => {
      const normalizedValue = value?.trim() ?? '';
      if (!normalizedValue || normalizedValue === defaultValue) {
        nextParams.delete(key);
        return;
      }

      nextParams.set(key, normalizedValue);
    };

    setOrDelete('supplier_search', supplierSearch);
    setOrDelete('supplier_risk', supplierRiskFilter, 'all');
    setOrDelete('supplier_tier', supplierTierFilter, 'all');
    setOrDelete('supplier_sort', supplierSort, 'risk_flags_desc');
    setOrDelete('supplier_page', String(supplierPage), '1');
    setOrDelete('supplier_page_size', String(supplierPageSize), '12');
    setOrDelete('supplier_id', selectedSupplierId);

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, selectedSupplierId, setSearchParams, supplierPage, supplierPageSize, supplierRiskFilter, supplierSearch, supplierSort, supplierTierFilter]);


  const actionAgenda = useMemo(() => {
    const nextActions: Array<{
      title: string;
      detail: string;
      route: string;
      linkLabel: string;
      tone: 'good' | 'warn' | 'bad';
    }> = [];

    const healthTier = healthQuery.data?.health_tier;
    if (healthTier === 'critical' || healthTier === 'watch') {
      nextActions.push({
        title: 'Operational health needs review',
        detail: `Current tenant health is ${healthTier}. Review low stock, overdue shipments, and unresolved alerts first.`,
        route: '/dashboard?panel=operational-health',
        linkLabel: 'Open Dashboard',
        tone: healthTier === 'critical' ? 'bad' : 'warn'
      });
    }

    const reorderTop = reorderQuery.data?.rows?.[0];
    if (reorderTop) {
      nextActions.push({
        title: 'Reorder highest urgency product',
        detail: `${reorderTop.product_name} currently recommends a reorder quantity of ${formatNumber(reorderTop.recommended_reorder_quantity)}.`,
        route: reorderTop ? `/products?search=${encodeURIComponent(reorderTop.product_name)}` : '/products',
        linkLabel: 'Open Reports',
        tone: reorderTop.urgency === 'critical' ? 'bad' : 'warn'
      });
    }

    const depletionTop = depletionRiskQuery.data?.rows?.[0];
    if (depletionTop) {
      nextActions.push({
        title: 'Protect depletion-risk stock',
        detail: `${depletionTop.product_name} at ${depletionTop.storage_location_name} is currently one of the highest depletion-risk rows.`,
        route: depletionTop ? `/stock?productId=${encodeURIComponent(depletionTop.product_id)}` : '/stock',
        linkLabel: 'Open Stock',
        tone: depletionTop.risk_tier === 'critical' ? 'bad' : 'warn'
      });
    }

    const anomalyTop = anomaliesQuery.data?.rows?.[0];
    if (anomalyTop) {
      nextActions.push({
        title: 'Review unusual outbound activity',
        detail: `${anomalyTop.product_name} is showing an anomaly spike ratio of ${formatNumber(anomalyTop.spike_ratio)} against baseline demand.`,
        route: anomalyTop ? `/stock-movements?productId=${encodeURIComponent(anomalyTop.product_id)}` : '/stock-movements',
        linkLabel: 'Open Stock Movements',
        tone: anomalyTop.anomaly_tier === 'critical' ? 'bad' : 'warn'
      });
    }

    const supplierBottom = [...(supplierTrustQuery.data?.rows ?? [])]
      .sort((a, b) => toNumber(a.trust_score) - toNumber(b.trust_score))[0];

    if (supplierBottom) {
      nextActions.push({
        title: 'Follow up lowest-trust supplier',
        detail: `${supplierBottom.supplier_name} currently scores ${formatNumber(supplierBottom.trust_score, 0)} on supplier trust.`,
        route: supplierBottom ? `/suppliers?search=${encodeURIComponent(supplierBottom.supplier_name)}` : '/suppliers',
        linkLabel: 'Open Suppliers',
        tone: toNumber(supplierBottom.trust_score) < 50 ? 'bad' : 'warn'
      });
    }

    return nextActions.slice(0, 4);
  }, [
    anomaliesQuery.data?.rows,
    depletionRiskQuery.data?.rows,
    healthQuery.data?.health_tier,
    reorderQuery.data?.rows,
    supplierTrustQuery.data?.rows
  ]);

  const visibleSupplierTrustRows = useMemo(() => {
    const rows = [...(supplierTrustQuery.data?.rows ?? [])];

    const normalizedSupplierSearch = supplierSearch.trim().toLowerCase();

    return rows
      .filter((row) => {
        const riskFlags = row.risk_flags ?? [];

        if (normalizedSupplierSearch) {
          const searchableText = [
            row.supplier_name,
            row.trust_tier,
            ...riskFlags.flatMap((flag) => [flag.label, flag.detail, flag.severity])
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (!searchableText.includes(normalizedSupplierSearch)) {
            return false;
          }
        }

        if (supplierTierFilter !== 'all' && row.trust_tier !== supplierTierFilter) {
          return false;
        }

        if (supplierRiskFilter === 'with_risk') {
          return riskFlags.length > 0;
        }

        if (supplierRiskFilter === 'none') {
          return riskFlags.length === 0;
        }

        if (supplierRiskFilter !== 'all') {
          return riskFlags.some((flag) => flag.severity === supplierRiskFilter);
        }

        return true;
      })
      .sort((a, b) => {
        if (supplierSort === 'trust_asc') {
          return toNumber(a.trust_score) - toNumber(b.trust_score);
        }

        if (supplierSort === 'trust_desc') {
          return toNumber(b.trust_score) - toNumber(a.trust_score);
        }

        if (supplierSort === 'remaining_value_desc') {
          return toNumber(b.po_remaining_value) - toNumber(a.po_remaining_value);
        }

        if (supplierSort === 'overdue_pos_desc') {
          return toNumber(b.overdue_open_purchase_orders) - toNumber(a.overdue_open_purchase_orders);
        }

        if (supplierSort === 'fill_rate_asc') {
          return toNumber(a.po_fill_rate_pct) - toNumber(b.po_fill_rate_pct);
        }

        return (b.risk_flags?.length ?? 0) - (a.risk_flags?.length ?? 0);
      });
  }, [supplierRiskFilter, supplierSearch, supplierSort, supplierTierFilter, supplierTrustQuery.data?.rows]);

  const supplierTotalPages = Math.max(1, Math.ceil(visibleSupplierTrustRows.length / supplierPageSize));
  const supplierCurrentPage = Math.min(supplierPage, supplierTotalPages);
  const pagedSupplierTrustRows = visibleSupplierTrustRows.slice((supplierCurrentPage - 1) * supplierPageSize, supplierCurrentPage * supplierPageSize);


  const supplierTrustBreakdown = useMemo(() => {
    const rows = supplierTrustQuery.data?.rows ?? [];

    const countTier = (tier: SupplierTierFilter) => rows.filter((row) => row.trust_tier === tier).length;
    const countRisk = (severity: Exclude<SupplierRiskFilter, 'all' | 'with_risk' | 'none'>) => rows.filter((row) => (row.risk_flags ?? []).some((flag) => flag.severity === severity)).length;

    return {
      total: rows.length,
      withRisk: rows.filter((row) => (row.risk_flags ?? []).length > 0).length,
      noRisk: rows.filter((row) => (row.risk_flags ?? []).length === 0).length,
      highRisk: countRisk('high'),
      mediumRisk: countRisk('medium'),
      lowRisk: countRisk('low'),
      excellent: countTier('excellent'),
      strong: countTier('strong'),
      watch: countTier('watch'),
      risk: countTier('risk')
    };
  }, [supplierTrustQuery.data?.rows]);


  const supplierRecommendedActionSummary = useMemo(() => {
    const rows = supplierTrustQuery.data?.rows ?? [];
    const actionRows = rows.flatMap((row) =>
      getSupplierRecommendedActions(row)
        .filter((action) => action.title !== 'Maintain supplier cadence')
        .map((action) => ({ ...action, supplier: row.supplier_name, supplierId: row.supplier_id }))
    );

    const priorityWeight = { high: 0, medium: 1, low: 2 } as const;
    actionRows.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority] || a.supplier.localeCompare(b.supplier));

    return {
      total: actionRows.length,
      high: actionRows.filter((action) => action.priority === 'high').length,
      medium: actionRows.filter((action) => action.priority === 'medium').length,
      low: actionRows.filter((action) => action.priority === 'low').length,
      topActions: actionRows.slice(0, 5)
    };
  }, [supplierTrustQuery.data?.rows]);

  useEffect(() => {
    setSupplierPage(1);
  }, [supplierRiskFilter, supplierSearch, supplierSort, supplierTierFilter, supplierPageSize]);

  useEffect(() => {
    if (supplierPage > supplierTotalPages) {
      setSupplierPage(supplierTotalPages);
    }
  }, [supplierPage, supplierTotalPages]);

  const selectedSupplierTrustRow = useMemo(() => {
    if (!selectedSupplierId) {
      return null;
    }

    return supplierTrustQuery.data?.rows.find((row) => row.supplier_id === selectedSupplierId) ?? null;
  }, [selectedSupplierId, supplierTrustQuery.data?.rows]);

  const supplierActiveFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onClear: () => void }> = [];

    if (supplierSearch.trim()) {
      chips.push({
        key: 'supplier-search',
        label: `Search: ${supplierSearch.trim()}`,
        onClear: () => setSupplierSearch('')
      });
    }

    if (supplierRiskFilter !== 'all') {
      chips.push({
        key: 'supplier-risk',
        label: `Risk: ${supplierRiskFilter.replace(/_/g, ' ')}`,
        onClear: () => setSupplierRiskFilter('all')
      });
    }

    if (supplierTierFilter !== 'all') {
      chips.push({
        key: 'supplier-tier',
        label: `Tier: ${supplierTierFilter}`,
        onClear: () => setSupplierTierFilter('all')
      });
    }

    return chips;
  }, [supplierRiskFilter, supplierSearch, supplierTierFilter]);

  function clearSupplierTrustFilters() {
    setSupplierSearch('');
    setSupplierRiskFilter('all');
    setSupplierTierFilter('all');
  }

  function buildSupplierTrustViewUrl() {
    const params = new URLSearchParams(searchParams);

    const setOrDelete = (key: string, value: string | null, defaultValue?: string) => {
      const normalizedValue = value?.trim() ?? '';
      if (!normalizedValue || normalizedValue === defaultValue) {
        params.delete(key);
        return;
      }

      params.set(key, normalizedValue);
    };

    setOrDelete('supplier_search', supplierSearch);
    setOrDelete('supplier_risk', supplierRiskFilter, 'all');
    setOrDelete('supplier_tier', supplierTierFilter, 'all');
    setOrDelete('supplier_sort', supplierSort, 'risk_flags_desc');
    setOrDelete('supplier_page', String(supplierCurrentPage), '1');
    setOrDelete('supplier_page_size', String(supplierPageSize), '12');
    setOrDelete('supplier_id', selectedSupplierId);

    const query = params.toString();
    return `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
  }

  async function copySupplierTrustViewLink() {
    const viewUrl = buildSupplierTrustViewUrl();

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(viewUrl);
      return;
    }

    window.prompt('Copy Supplier Trust view link', viewUrl);
  }

  function exportSupplierTrustCsv() {
    const header = [
      'Supplier',
      'Trust Score',
      'Trust Tier',
      'Risk Flags',
      'High Risk Flags',
      'Open POs',
      'Overdue Open POs',
      'Closed Short POs',
      'PO Fill Rate %',
      'PO Remaining Quantity',
      'PO Remaining Value',
      'PO Ordered Value',
      'PO Received Value'
    ];

    const rows = visibleSupplierTrustRows.map((row) => {
      const riskFlags = row.risk_flags ?? [];

      return [
        row.supplier_name,
        formatNumber(row.trust_score, 0),
        row.trust_tier,
        riskFlags.map((flag) => `${flag.severity}: ${flag.label}`).join(' | '),
        riskFlags.filter((flag) => flag.severity === 'high').length,
        formatNumber(row.open_purchase_orders, 0),
        formatNumber(row.overdue_open_purchase_orders, 0),
        formatNumber(row.closed_short_purchase_orders, 0),
        formatNumber(row.po_fill_rate_pct),
        formatNumber(row.po_remaining_quantity),
        formatNumber(row.po_remaining_value),
        formatNumber(row.po_ordered_value),
        formatNumber(row.po_received_value)
      ];
    });

    downloadCsv('supplier-trust-insights.csv', [header, ...rows]);
  }



  function exportSupplierTrustDetailCsv(row: SupplierTrustResponse['rows'][number]) {
    const riskFlags = row.risk_flags ?? [];

    const metricRows: Array<Array<unknown>> = [
      ['Metric', 'Value'],
      ['Supplier', row.supplier_name],
      ['Trust Score', formatNumber(row.trust_score, 0)],
      ['Trust Tier', row.trust_tier],
      ['Shipment Completion Rate %', formatNumber(row.completion_rate_pct)],
      ['Shipment Overdue Rate %', formatNumber(row.overdue_rate_pct)],
      ['Shipment Fill Rate %', formatNumber(row.fill_rate_pct)],
      ['Shipment Discrepancy Rate %', formatNumber(row.discrepancy_rate_pct)],
      ['Total Shipments', formatNumber(row.total_shipments, 0)],
      ['Total POs', formatNumber(row.total_purchase_orders, 0)],
      ['Completed POs', formatNumber(row.completed_purchase_orders, 0)],
      ['Cancelled POs', formatNumber(row.cancelled_purchase_orders, 0)],
      ['Open POs', formatNumber(row.open_purchase_orders, 0)],
      ['Overdue Open POs', formatNumber(row.overdue_open_purchase_orders, 0)],
      ['Fully Received POs', formatNumber(row.fully_received_purchase_orders, 0)],
      ['Manually Closed POs', formatNumber(row.manually_closed_purchase_orders, 0)],
      ['Closed Short POs', formatNumber(row.closed_short_purchase_orders, 0)],
      ['PO Ordered Quantity', formatNumber(row.po_ordered_quantity)],
      ['PO Received Quantity', formatNumber(row.po_received_quantity)],
      ['PO Remaining Quantity', formatNumber(row.po_remaining_quantity)],
      ['PO Ordered Value', formatNumber(row.po_ordered_value)],
      ['PO Received Value', formatNumber(row.po_received_value)],
      ['PO Remaining Value', formatNumber(row.po_remaining_value)],
      ['PO Fill Rate %', formatNumber(row.po_fill_rate_pct)],
      ['PO Completion Rate %', formatNumber(row.po_completion_rate_pct)],
      ['PO Short Close Rate %', formatNumber(row.po_short_close_rate_pct)],
      [],
      ['Risk Severity', 'Risk Label', 'Risk Detail'],
      ...(riskFlags.length
        ? riskFlags.map((flag) => [flag.severity, flag.label, flag.detail])
        : [['none', 'No active supplier risk flags', '']]),
      [],
      ['Recommended Action Priority', 'Recommended Action', 'Recommended Action Detail'],
      ...getSupplierRecommendedActions(row).map((action) => [action.priority, action.title, action.detail])
    ];

    downloadCsv(`supplier-trust-detail-${row.supplier_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'supplier'}.csv`, metricRows);
  }

  function printSupplierTrustDetail(row: SupplierTrustResponse['rows'][number]) {
    const printedAt = new Date().toLocaleString();
    const riskFlags = row.risk_flags ?? [];
    const riskRowsHtml = riskFlags.length
      ? riskFlags
          .map(
            (flag) => `
              <tr>
                <td>${escapeHtml(flag.severity)}</td>
                <td>${escapeHtml(flag.label)}</td>
                <td>${escapeHtml(flag.detail)}</td>
              </tr>`
          )
          .join('')
      : '<tr><td colspan="3">No active supplier risk flags.</td></tr>';
    const actionRowsHtml = getSupplierRecommendedActions(row)
      .map(
        (action) => `
          <tr>
            <td>${escapeHtml(action.priority)}</td>
            <td>${escapeHtml(action.title)}</td>
            <td>${escapeHtml(action.detail)}</td>
          </tr>`
      )
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Supplier Trust Detail - ${escapeHtml(row.supplier_name)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { margin: 0 0 6px; }
            h2 { margin-top: 24px; }
            .meta { color: #475569; margin-bottom: 18px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
            .summary-grid div { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
            .summary-grid strong { display: block; font-size: 20px; }
            .summary-grid span { color: #475569; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
            @media print { body { margin: 12px; } .summary-grid { grid-template-columns: repeat(2, 1fr); } }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(row.supplier_name)}</h1>
          <div class="meta">Supplier Trust Detail · Printed ${escapeHtml(printedAt)}</div>
          <section class="summary-grid">
            <div><strong>${escapeHtml(formatNumber(row.trust_score, 0))}</strong><span>Trust score</span></div>
            <div><strong>${escapeHtml(row.trust_tier)}</strong><span>Trust tier</span></div>
            <div><strong>${escapeHtml(formatNumber(row.po_remaining_value))}</strong><span>Remaining PO value</span></div>
            <div><strong>${escapeHtml(String(riskFlags.length))}</strong><span>Risk flags</span></div>
          </section>
          <h2>Performance Metrics</h2>
          <table>
            <tbody>
              <tr><th>Shipment completion</th><td>${escapeHtml(formatNumber(row.completion_rate_pct))}%</td><th>Shipment overdue</th><td>${escapeHtml(formatNumber(row.overdue_rate_pct))}%</td></tr>
              <tr><th>Shipment fill</th><td>${escapeHtml(formatNumber(row.fill_rate_pct))}%</td><th>Shipment discrepancy</th><td>${escapeHtml(formatNumber(row.discrepancy_rate_pct))}%</td></tr>
              <tr><th>Total POs</th><td>${escapeHtml(formatNumber(row.total_purchase_orders, 0))}</td><th>Open POs</th><td>${escapeHtml(formatNumber(row.open_purchase_orders, 0))}</td></tr>
              <tr><th>Overdue open POs</th><td>${escapeHtml(formatNumber(row.overdue_open_purchase_orders, 0))}</td><th>Closed-short POs</th><td>${escapeHtml(formatNumber(row.closed_short_purchase_orders, 0))}</td></tr>
              <tr><th>PO ordered qty</th><td>${escapeHtml(formatNumber(row.po_ordered_quantity))}</td><th>PO received qty</th><td>${escapeHtml(formatNumber(row.po_received_quantity))}</td></tr>
              <tr><th>PO remaining qty</th><td>${escapeHtml(formatNumber(row.po_remaining_quantity))}</td><th>PO fill rate</th><td>${escapeHtml(formatNumber(row.po_fill_rate_pct))}%</td></tr>
              <tr><th>PO ordered value</th><td>${escapeHtml(formatNumber(row.po_ordered_value))}</td><th>PO received value</th><td>${escapeHtml(formatNumber(row.po_received_value))}</td></tr>
              <tr><th>PO remaining value</th><td>${escapeHtml(formatNumber(row.po_remaining_value))}</td><th>Short-close rate</th><td>${escapeHtml(formatNumber(row.po_short_close_rate_pct))}%</td></tr>
            </tbody>
          </table>
          <h2>Risk Flags</h2>
          <table>
            <thead><tr><th>Severity</th><th>Label</th><th>Detail</th></tr></thead>
            <tbody>${riskRowsHtml}</tbody>
          </table>
          <h2>Recommended Actions</h2>
          <table>
            <thead><tr><th>Priority</th><th>Action</th><th>Detail</th></tr></thead>
            <tbody>${actionRowsHtml}</tbody>
          </table>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  function printSupplierTrust() {
    const summary = supplierTrustQuery.data?.summary;
    const printedAt = new Date().toLocaleString();
    const filterLabel = [
      `Search: ${supplierSearch.trim() || 'all'}`,
      `Risk: ${supplierRiskFilter}`,
      `Tier: ${supplierTierFilter}`,
      `Sort: ${supplierSort}`
    ].join(' · ');

    const summaryHtml = summary
      ? `
        <section class="summary-grid">
          <div><strong>${escapeHtml(formatNumber(summary.suppliers_with_risk, 0))}</strong><span>Suppliers with risk</span></div>
          <div><strong>${escapeHtml(formatNumber(summary.high_risk_flags, 0))}</strong><span>High-risk flags</span></div>
          <div><strong>${escapeHtml(formatNumber(summary.overdue_open_purchase_orders, 0))}</strong><span>Overdue open POs</span></div>
          <div><strong>${escapeHtml(formatNumber(summary.po_remaining_value))}</strong><span>Remaining PO value</span></div>
        </section>`
      : '';

    const rowsHtml = visibleSupplierTrustRows
      .map((row) => {
        const riskFlags = row.risk_flags ?? [];
        const riskText = riskFlags.length
          ? riskFlags.map((flag) => `${flag.severity.toUpperCase()}: ${flag.label} — ${flag.detail}`).join('<br />')
          : 'No risk flags';

        return `
          <tr>
            <td>${escapeHtml(row.supplier_name)}</td>
            <td>${escapeHtml(formatNumber(row.trust_score, 0))}</td>
            <td>${escapeHtml(row.trust_tier)}</td>
            <td>${escapeHtml(formatNumber(row.open_purchase_orders, 0))}</td>
            <td>${escapeHtml(formatNumber(row.overdue_open_purchase_orders, 0))}</td>
            <td>${escapeHtml(formatNumber(row.closed_short_purchase_orders, 0))}</td>
            <td>${escapeHtml(formatNumber(row.po_fill_rate_pct))}%</td>
            <td>${escapeHtml(formatNumber(row.po_remaining_value))}</td>
            <td>${riskText}</td>
          </tr>`;
      })
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <title>Supplier Trust Insights</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { margin: 0 0 6px; }
            .meta { color: #475569; margin-bottom: 18px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
            .summary-grid div { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; }
            .summary-grid strong { display: block; font-size: 20px; }
            .summary-grid span { color: #475569; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
            th { background: #f8fafc; }
            @media print { body { margin: 12px; } .summary-grid { grid-template-columns: repeat(2, 1fr); } }
          </style>
        </head>
        <body>
          <h1>Supplier Trust Insights</h1>
          <div class="meta">Printed ${escapeHtml(printedAt)} · ${escapeHtml(filterLabel)} · ${visibleSupplierTrustRows.length} supplier(s)</div>
          ${summaryHtml}
          <table>
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Trust</th>
                <th>Tier</th>
                <th>Open POs</th>
                <th>Overdue POs</th>
                <th>Closed Short</th>
                <th>PO Fill</th>
                <th>Remaining Value</th>
                <th>Risk Flags</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td colspan="9">No suppliers match the current filters.</td></tr>'}</tbody>
          </table>
        </body>
      </html>`;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) {
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div style={styles.page}>
      <section className="app-grid-stats" style={styles.statsGrid}>
        <StatCard
          title="Operational Health"
          value={healthQuery.data ? formatNumber(healthQuery.data.health_score, 0) : '-'}
          subtitle={healthQuery.data ? `Current tier: ${healthQuery.data.health_tier}` : 'Tenant-level health score.'}
          tone={healthQuery.data?.health_tier === 'critical' ? 'bad' : healthQuery.data?.health_tier === 'watch' ? 'warn' : 'good'}
        />
        <StatCard
          title="Depletion Rows"
          value={depletionRiskQuery.data ? String(depletionRiskQuery.data.rows.length) : '-'}
          subtitle="Products/locations currently ranked for depletion pressure."
        />
        <StatCard
          title="Reorder Candidates"
          value={reorderQuery.data ? String(reorderQuery.data.rows.length) : '-'}
          subtitle="Products with a recommended reorder quantity."
        />
        <StatCard
          title="Supplier Trust Rows"
          value={supplierTrustQuery.data ? String(supplierTrustQuery.data.rows.length) : '-'}
          subtitle="Suppliers scored from real shipment behavior."
        />
      </section>

      <Section title="What needs action next" subtitle="Use these recommendations to move from analytics into operational decisions.">
        {actionAgenda.length ? (
          <div style={styles.actionAgendaGrid}>
            {actionAgenda.map((item) => (
              <article
                key={item.title}
                style={item.tone === 'bad' ? styles.actionCardBad : item.tone === 'warn' ? styles.actionCardWarn : styles.actionCardGood}
              >
                <div style={styles.actionCardTitle}>{item.title}</div>
                <div style={styles.actionCardText}>{item.detail}</div>
                <Link to={item.route} style={styles.actionCardLink}>
                  {item.linkLabel}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="app-empty-state" style={styles.infoState}>
            No urgent action agenda is available yet. As data accumulates, this section will point managers to the next best operational decisions.
          </div>
        )}
      </Section>

      <Section title="Insight Controls" subtitle="Tune the lookback window for depletion and reorder recommendations.">
        <div className="app-actions" style={styles.controlRow}>
          <label style={styles.label}>
            Lookback Days
            <select style={styles.select} value={lookbackDays} onChange={(event) => setLookbackDays(Number(event.target.value))}>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
        </div>
      </Section>

      <div style={styles.grid}>
        <Section title="Operational Health Score" subtitle="Tenant-level health based on alerts, overdue shipments, low-stock pressure, and discrepancy pressure.">
          {healthQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading health score...</div> : null}
          {healthQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(healthQuery.error)}</div> : null}
          {healthQuery.data ? (
            <div style={styles.list}>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Health Score</strong>
                <span style={styles.keyValue}>{formatNumber(healthQuery.data.health_score, 0)}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Tier</strong>
                <span style={styles.keyValue}>{healthQuery.data.health_tier}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Unresolved Alerts</strong>
                <span style={styles.keyValue}>{healthQuery.data.metrics.unresolved_alerts}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Overdue Shipments</strong>
                <span style={styles.keyValue}>{healthQuery.data.metrics.overdue_shipments}</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Low Stock Rate</strong>
                <span style={styles.keyValue}>{formatNumber(healthQuery.data.metrics.low_stock_rate_pct)}%</span>
              </div>
              <div style={styles.keyValueRow}>
                <strong style={styles.keyLabel}>Discrepancy Rate</strong>
                <span style={styles.keyValue}>{formatNumber(healthQuery.data.metrics.discrepancy_rate_pct)}%</span>
              </div>
            </div>
          ) : null}
        </Section>

        <Section title="Supplier Trust" subtitle="Supplier trust scores derived from shipment behavior plus PO fulfillment, short-close, and overdue PO signals.">
          {supplierTrustQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading supplier trust...</div> : null}
          {supplierTrustQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(supplierTrustQuery.error)}</div> : null}
          {supplierTrustQuery.data?.rows.length ? (
            <>
              {supplierTrustQuery.data.summary ? (
                <div className="app-grid-stats" style={styles.supplierSummaryGrid}>
                  <StatCard
                    title="Suppliers With Risk"
                    value={formatNumber(supplierTrustQuery.data.summary.suppliers_with_risk, 0)}
                    subtitle={`${formatNumber(supplierTrustQuery.data.summary.risk_supplier_rate_pct)}% of suppliers have at least one active risk flag.`}
                    tone={toNumber(supplierTrustQuery.data.summary.high_risk_flags) > 0 ? 'bad' : toNumber(supplierTrustQuery.data.summary.suppliers_with_risk) > 0 ? 'warn' : 'good'}
                  />
                  <StatCard
                    title="High Risk Flags"
                    value={formatNumber(supplierTrustQuery.data.summary.high_risk_flags, 0)}
                    subtitle={`${formatNumber(supplierTrustQuery.data.summary.total_risk_flags, 0)} total supplier risk flags.`}
                    tone={toNumber(supplierTrustQuery.data.summary.high_risk_flags) > 0 ? 'bad' : 'good'}
                  />
                  <StatCard
                    title="Overdue Open POs"
                    value={formatNumber(supplierTrustQuery.data.summary.overdue_open_purchase_orders, 0)}
                    subtitle="Open supplier POs past expected delivery date."
                    tone={toNumber(supplierTrustQuery.data.summary.overdue_open_purchase_orders) > 0 ? 'bad' : 'good'}
                  />
                  <StatCard
                    title="Remaining PO Value"
                    value={formatNumber(supplierTrustQuery.data.summary.po_remaining_value)}
                    subtitle={`${formatNumber(supplierTrustQuery.data.summary.po_remaining_quantity)} units still open across supplier POs.`}
                    tone={toNumber(supplierTrustQuery.data.summary.po_remaining_quantity) > 0 ? 'warn' : 'good'}
                  />
                </div>
              ) : null}
              <div style={styles.supplierDataMetaPanel} aria-label="Supplier Trust data status">
                <span>Generated {formatDateTime(supplierTrustQuery.data.generated_at)}</span>
                <span>{visibleSupplierTrustRows.length} matching suppliers · {supplierTrustQuery.data.rows.length} total suppliers</span>
                {supplierTrustQuery.isFetching ? <span>Refreshing...</span> : null}
              </div>
              <div style={styles.supplierActionSummaryPanel} aria-label="Supplier recommended action summary">
                <div style={styles.supplierActionSummaryHeader}>
                  <div>
                    <div style={styles.itemTitle}>Recommended Action Summary</div>
                    <div style={styles.itemMeta}>
                      {supplierRecommendedActionSummary.total
                        ? `${supplierRecommendedActionSummary.total} supplier action(s): ${supplierRecommendedActionSummary.high} high · ${supplierRecommendedActionSummary.medium} medium · ${supplierRecommendedActionSummary.low} low`
                        : 'No supplier follow-up actions are currently recommended.'}
                    </div>
                  </div>
                </div>
                {supplierRecommendedActionSummary.topActions.length ? (
                  <div style={styles.riskFlagDetailList}>
                    {supplierRecommendedActionSummary.topActions.map((action) => (
                      <button
                        key={`${action.supplierId}-${action.priority}-${action.title}`}
                        type="button"
                        style={styles.supplierActionSummaryItem}
                        onClick={() => setSelectedSupplierId(action.supplierId)}
                      >
                        <span style={action.priority === 'high' ? styles.riskFlagHigh : action.priority === 'medium' ? styles.riskFlagMedium : styles.riskFlagLow}>
                          {action.priority}
                        </span>
                        <span style={styles.supplierActionSummaryText}>
                          <strong>{action.supplier}</strong> · {action.title}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="app-empty-state" style={styles.infoState}>No supplier follow-up actions need attention.</div>
                )}
              </div>
              <div style={styles.supplierControls}>
                <label style={styles.label}>
                  Search suppliers
                  <input
                    style={styles.input}
                    value={supplierSearch}
                    onChange={(event) => setSupplierSearch(event.target.value)}
                    placeholder="Search supplier, tier, or risk flag"
                  />
                </label>
                <label style={styles.label}>
                  Risk filter
                  <select
                    style={styles.select}
                    value={supplierRiskFilter}
                    onChange={(event) => setSupplierRiskFilter(event.target.value as SupplierRiskFilter)}
                  >
                    <option value="all">All risk levels</option>
                    <option value="with_risk">Any risk flag</option>
                    <option value="high">High risk</option>
                    <option value="medium">Medium risk</option>
                    <option value="low">Low risk</option>
                    <option value="none">No risk flags</option>
                  </select>
                </label>
                <label style={styles.label}>
                  Trust tier
                  <select
                    style={styles.select}
                    value={supplierTierFilter}
                    onChange={(event) => setSupplierTierFilter(event.target.value as SupplierTierFilter)}
                  >
                    <option value="all">All tiers</option>
                    <option value="excellent">Excellent</option>
                    <option value="strong">Strong</option>
                    <option value="watch">Watch</option>
                    <option value="risk">Risk</option>
                  </select>
                </label>
                <label style={styles.label}>
                  Sort suppliers
                  <select
                    style={styles.select}
                    value={supplierSort}
                    onChange={(event) => setSupplierSort(event.target.value as SupplierSort)}
                  >
                    <option value="risk_flags_desc">Most risk flags</option>
                    <option value="trust_asc">Lowest trust first</option>
                    <option value="trust_desc">Highest trust first</option>
                    <option value="remaining_value_desc">Highest remaining value</option>
                    <option value="overdue_pos_desc">Most overdue POs</option>
                    <option value="fill_rate_asc">Lowest PO fill rate</option>
                  </select>
                </label>
                <label style={styles.label}>
                  Page size
                  <select
                    style={styles.select}
                    value={supplierPageSize}
                    onChange={(event) => setSupplierPageSize(Number(event.target.value) as SupplierPageSize)}
                  >
                    {SUPPLIER_PAGE_SIZE_OPTIONS.map((pageSize) => (
                      <option key={pageSize} value={pageSize}>{pageSize} / page</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  style={styles.secondaryButton}
                  onClick={clearSupplierTrustFilters}
                  disabled={!supplierActiveFilterChips.length}
                >
                  Clear Supplier Filters
                </button>
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  style={styles.secondaryButton}
                  onClick={() => void supplierTrustQuery.refetch()}
                  disabled={supplierTrustQuery.isFetching}
                >
                  {supplierTrustQuery.isFetching ? 'Refreshing...' : 'Refresh Supplier Trust'}
                </button>
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  style={styles.secondaryButton}
                  onClick={exportSupplierTrustCsv}
                  disabled={!visibleSupplierTrustRows.length}
                >
                  Export Supplier Trust CSV
                </button>
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  style={styles.secondaryButton}
                  onClick={printSupplierTrust}
                  disabled={!visibleSupplierTrustRows.length}
                >
                  Print Supplier Trust
                </button>
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  style={styles.secondaryButton}
                  onClick={() => void copySupplierTrustViewLink()}
                >
                  Copy Supplier View Link
                </button>
              </div>
              {supplierActiveFilterChips.length ? (
                <div style={styles.activeFilterBar} aria-label="Active Supplier Trust filters">
                  {supplierActiveFilterChips.map((chip) => (
                    <span key={chip.key} style={styles.activeFilterChip}>
                      {chip.label}
                      <button type="button" style={styles.chipRemoveButton} onClick={chip.onClear} aria-label={`Remove ${chip.label} filter`}>
                        ×
                      </button>
                    </span>
                  ))}
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={clearSupplierTrustFilters}>
                    Clear all filters
                  </button>
                </div>
              ) : null}
              <div style={styles.itemMeta}>
                Showing {pagedSupplierTrustRows.length ? ((supplierCurrentPage - 1) * supplierPageSize) + 1 : 0}-{Math.min(supplierCurrentPage * supplierPageSize, visibleSupplierTrustRows.length)} of {visibleSupplierTrustRows.length} matching suppliers · {supplierTrustQuery.data.rows.length} total.
              </div>
              <div style={styles.supplierBreakdownPanel} aria-label="Supplier Trust breakdown filters">
                <div style={styles.itemTitle}>Supplier Trust Breakdown</div>
                <div style={styles.supplierBreakdownGrid}>
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('with_risk'); setSupplierTierFilter('all'); }}>
                    Any risk · {supplierTrustBreakdown.withRisk}
                  </button>
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('high'); setSupplierTierFilter('all'); }}>
                    High risk · {supplierTrustBreakdown.highRisk}
                  </button>
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('medium'); setSupplierTierFilter('all'); }}>
                    Medium risk · {supplierTrustBreakdown.mediumRisk}
                  </button>
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('low'); setSupplierTierFilter('all'); }}>
                    Low risk · {supplierTrustBreakdown.lowRisk}
                  </button>
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={() => { setSupplierRiskFilter('none'); setSupplierTierFilter('all'); }}>
                    No risk · {supplierTrustBreakdown.noRisk}
                  </button>
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={() => { setSupplierTierFilter('excellent'); setSupplierRiskFilter('all'); }}>
                    Excellent · {supplierTrustBreakdown.excellent}
                  </button>
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={() => { setSupplierTierFilter('strong'); setSupplierRiskFilter('all'); }}>
                    Strong · {supplierTrustBreakdown.strong}
                  </button>
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={() => { setSupplierTierFilter('watch'); setSupplierRiskFilter('all'); }}>
                    Watch · {supplierTrustBreakdown.watch}
                  </button>
                  <button type="button" className="app-button app-button--secondary" style={styles.breakdownButton} onClick={() => { setSupplierTierFilter('risk'); setSupplierRiskFilter('all'); }}>
                    Risk tier · {supplierTrustBreakdown.risk}
                  </button>
                </div>
              </div>
              <div style={styles.list}>
              {pagedSupplierTrustRows.map((row) => (
                <article key={row.supplier_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.supplier_name}</div>
                  <div style={styles.itemMeta}>Trust {formatNumber(row.trust_score, 0)} · Tier {row.trust_tier}</div>
                  <div style={styles.itemText}>
                    Shipments: completion {formatNumber(row.completion_rate_pct)}% · overdue {formatNumber(row.overdue_rate_pct)}% · fill {formatNumber(row.fill_rate_pct)}%
                  </div>
                  <div style={styles.itemText}>
                    POs: {formatNumber(row.total_purchase_orders, 0)} total · {formatNumber(row.open_purchase_orders, 0)} open · {formatNumber(row.overdue_open_purchase_orders, 0)} overdue
                  </div>
                  <div style={styles.itemText}>
                    PO fill {formatNumber(row.po_fill_rate_pct)}% · short-closed {formatNumber(row.closed_short_purchase_orders, 0)} · remaining value {formatNumber(row.po_remaining_value)}
                  </div>
                  {row.risk_flags?.length ? (
                    <div style={styles.riskFlagGroup} aria-label={`Supplier risk flags for ${row.supplier_name}`}>
                      {row.risk_flags.map((flag) => (
                        <span key={flag.code} style={getRiskFlagStyle(flag.severity)} title={flag.detail}>
                          {flag.label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={styles.itemText}>No supplier risk flags.</div>
                  )}
                  <div style={styles.inlineActionGroup}>
                    <Link to={`/suppliers?search=${encodeURIComponent(row.supplier_name)}`} style={styles.inlineActionLink}>
                      Open Supplier
                    </Link>
                    <Link to={`/purchase-orders?supplier_id=${encodeURIComponent(row.supplier_id)}`} style={styles.inlineActionLink}>
                      Open POs
                    </Link>
                    <button
                      type="button"
                      className="app-button app-button--secondary"
                      style={styles.inlineActionButton}
                      onClick={() => setSelectedSupplierId(row.supplier_id)}
                    >
                      View Detail
                    </button>
                  </div>
                </article>
              ))}
              </div>
              <div style={styles.paginationControls}>
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  style={styles.secondaryButton}
                  onClick={() => setSupplierPage((page) => Math.max(1, page - 1))}
                  disabled={supplierCurrentPage <= 1}
                >
                  Previous suppliers
                </button>
                <span style={styles.itemMeta}>Page {supplierCurrentPage} of {supplierTotalPages}</span>
                <button
                  type="button"
                  className="app-button app-button--secondary"
                  style={styles.secondaryButton}
                  onClick={() => setSupplierPage((page) => Math.min(supplierTotalPages, page + 1))}
                  disabled={supplierCurrentPage >= supplierTotalPages}
                >
                  Next suppliers
                </button>
              </div>
              {selectedSupplierTrustRow ? (
                <article style={styles.supplierDetailPanel} aria-label={`Supplier trust detail for ${selectedSupplierTrustRow.supplier_name}`}>
                  <div style={styles.supplierDetailHeader}>
                    <div>
                      <div style={styles.itemTitle}>{selectedSupplierTrustRow.supplier_name}</div>
                      <div style={styles.itemMeta}>Supplier Trust Detail · Trust {formatNumber(selectedSupplierTrustRow.trust_score, 0)} · Tier {selectedSupplierTrustRow.trust_tier}</div>
                    </div>
                    <div style={styles.inlineActionGroup}>
                      <button
                        type="button"
                        className="app-button app-button--secondary"
                        style={styles.secondaryButton}
                        onClick={() => exportSupplierTrustDetailCsv(selectedSupplierTrustRow)}
                      >
                        Export Detail CSV
                      </button>
                      <button
                        type="button"
                        className="app-button app-button--secondary"
                        style={styles.secondaryButton}
                        onClick={() => printSupplierTrustDetail(selectedSupplierTrustRow)}
                      >
                        Print Detail
                      </button>
                      <button
                        type="button"
                        className="app-button app-button--secondary"
                        style={styles.secondaryButton}
                        onClick={() => void copySupplierTrustViewLink()}
                      >
                        Copy Detail Link
                      </button>
                      <button
                        type="button"
                        className="app-button app-button--secondary"
                        style={styles.secondaryButton}
                        onClick={() => setSelectedSupplierId(null)}
                      >
                        Close Detail
                      </button>
                    </div>
                  </div>
                  <div className="app-grid-stats" style={styles.supplierDetailGrid}>
                    <StatCard
                      title="Shipment Performance"
                      value={`${formatNumber(selectedSupplierTrustRow.completion_rate_pct)}%`}
                      subtitle={`Overdue ${formatNumber(selectedSupplierTrustRow.overdue_rate_pct)}% · Fill ${formatNumber(selectedSupplierTrustRow.fill_rate_pct)}% · Discrepancy ${formatNumber(selectedSupplierTrustRow.discrepancy_rate_pct)}%`}
                      tone={toNumber(selectedSupplierTrustRow.overdue_rate_pct) > 20 || toNumber(selectedSupplierTrustRow.discrepancy_rate_pct) > 10 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title="PO Completion"
                      value={`${formatNumber(selectedSupplierTrustRow.po_completion_rate_pct)}%`}
                      subtitle={`${formatNumber(selectedSupplierTrustRow.fully_received_purchase_orders, 0)} fully received · ${formatNumber(selectedSupplierTrustRow.manually_closed_purchase_orders, 0)} manually closed`}
                      tone={toNumber(selectedSupplierTrustRow.po_completion_rate_pct) >= 80 ? 'good' : 'warn'}
                    />
                    <StatCard
                      title="Open PO Exposure"
                      value={formatNumber(selectedSupplierTrustRow.po_remaining_value)}
                      subtitle={`${formatNumber(selectedSupplierTrustRow.po_remaining_quantity)} units remaining · ${formatNumber(selectedSupplierTrustRow.overdue_open_purchase_orders, 0)} overdue open POs`}
                      tone={toNumber(selectedSupplierTrustRow.overdue_open_purchase_orders) > 0 ? 'bad' : toNumber(selectedSupplierTrustRow.po_remaining_quantity) > 0 ? 'warn' : 'good'}
                    />
                    <StatCard
                      title="Short Close Rate"
                      value={`${formatNumber(selectedSupplierTrustRow.po_short_close_rate_pct)}%`}
                      subtitle={`${formatNumber(selectedSupplierTrustRow.closed_short_purchase_orders, 0)} closed-short POs`}
                      tone={toNumber(selectedSupplierTrustRow.closed_short_purchase_orders) > 0 ? 'warn' : 'good'}
                    />
                  </div>
                  <div style={styles.supplierDetailBody}>
                    <div style={styles.keyValueRow}>
                      <strong style={styles.keyLabel}>PO quantities</strong>
                      <span style={styles.keyValue}>Ordered {formatNumber(selectedSupplierTrustRow.po_ordered_quantity)} · Received {formatNumber(selectedSupplierTrustRow.po_received_quantity)} · Remaining {formatNumber(selectedSupplierTrustRow.po_remaining_quantity)}</span>
                    </div>
                    <div style={styles.keyValueRow}>
                      <strong style={styles.keyLabel}>PO values</strong>
                      <span style={styles.keyValue}>Ordered {formatNumber(selectedSupplierTrustRow.po_ordered_value)} · Received {formatNumber(selectedSupplierTrustRow.po_received_value)} · Remaining {formatNumber(selectedSupplierTrustRow.po_remaining_value)}</span>
                    </div>
                    <div style={styles.keyValueRow}>
                      <strong style={styles.keyLabel}>PO counts</strong>
                      <span style={styles.keyValue}>{formatNumber(selectedSupplierTrustRow.total_purchase_orders, 0)} total · {formatNumber(selectedSupplierTrustRow.open_purchase_orders, 0)} open · {formatNumber(selectedSupplierTrustRow.cancelled_purchase_orders, 0)} cancelled</span>
                    </div>
                  </div>
                  {selectedSupplierTrustRow.risk_flags?.length ? (
                    <div style={styles.riskFlagDetailList}>
                      {selectedSupplierTrustRow.risk_flags.map((flag) => (
                        <div key={flag.code} style={styles.riskFlagDetailItem}>
                          <span style={getRiskFlagStyle(flag.severity)}>{flag.label}</span>
                          <span style={styles.itemText}>{flag.detail}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="app-empty-state" style={styles.infoState}>No active supplier risk flags.</div>
                  )}
                  <div style={styles.recommendedActionPanel}>
                    <div style={styles.itemTitle}>Recommended Actions</div>
                    <div style={styles.riskFlagDetailList}>
                      {getSupplierRecommendedActions(selectedSupplierTrustRow).map((action) => (
                        <div key={`${action.priority}-${action.title}`} style={styles.recommendedActionItem}>
                          <span style={action.priority === 'high' ? styles.riskFlagHigh : action.priority === 'medium' ? styles.riskFlagMedium : styles.riskFlagLow}>
                            {action.priority}
                          </span>
                          <div>
                            <div style={styles.itemTitle}>{action.title}</div>
                            <div style={styles.itemText}>{action.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={styles.inlineActionGroup}>
                    <Link to={`/suppliers?search=${encodeURIComponent(selectedSupplierTrustRow.supplier_name)}`} style={styles.inlineActionLink}>
                      Open Supplier
                    </Link>
                    <Link to={`/purchase-orders?supplier_id=${encodeURIComponent(selectedSupplierTrustRow.supplier_id)}`} style={styles.inlineActionLink}>
                      Open Supplier POs
                    </Link>
                  </div>
                </article>
              ) : null}
              {!visibleSupplierTrustRows.length ? (
                <div className="app-empty-state" style={styles.infoState}>
                  No suppliers match the current supplier trust filters.
                </div>
              ) : null}
            </>
          ) : !supplierTrustQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>No supplier trust rows returned.</div> : null}
        </Section>
      </div>

      <div style={styles.grid}>
        <Section title="Depletion Risk" subtitle="Products and locations under the greatest consumption pressure relative to stock on hand.">
          {depletionRiskQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading depletion risk...</div> : null}
          {depletionRiskQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(depletionRiskQuery.error)}</div> : null}
          {depletionRiskQuery.data?.rows.length ? (
            <div style={styles.list}>
              {depletionRiskQuery.data.rows.slice(0, 10).map((row) => (
                <article key={row.stock_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name}</div>
                  <div style={styles.itemMeta}>
                    {row.storage_location_name} · Risk {formatNumber(row.risk_score, 0)} · Tier {row.risk_tier}
                  </div>
                  <div style={styles.itemText}>
                    Qty {formatNumber(row.current_quantity)} · Min {formatNumber(row.configured_min_quantity)} · Coverage{' '}
                    {row.estimated_days_of_coverage == null ? '-' : formatNumber(row.estimated_days_of_coverage)} days
                  </div>
                  <Link to={`/stock?productId=${encodeURIComponent(row.product_id)}`} style={styles.inlineActionLink}>
                    Open in Stock
                  </Link>
                </article>
              ))}
            </div>
          ) : !depletionRiskQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>No depletion risk rows returned.</div> : null}
        </Section>

        <Section title="Reorder Recommendations" subtitle="Explainable reorder quantities based on current stock and recent outbound usage.">
          {reorderQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading reorder recommendations...</div> : null}
          {reorderQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(reorderQuery.error)}</div> : null}
          {reorderQuery.data?.rows.length ? (
            <div style={styles.list}>
              {reorderQuery.data.rows.slice(0, 10).map((row) => (
                <article key={row.product_id} style={styles.itemCard}>
                  <div style={styles.itemTitle}>{row.product_name}</div>
                  <div style={styles.itemMeta}>Urgency {row.urgency} · Reorder {formatNumber(row.recommended_reorder_quantity)}</div>
                  <div style={styles.itemText}>
                    Current {formatNumber(row.current_quantity)} · Min {formatNumber(row.min_stock)} · Avg Daily Usage {formatNumber(row.average_daily_usage)}
                  </div>
                  <Link to={`/products?search=${encodeURIComponent(row.product_name)}`} style={styles.inlineActionLink}>
                    Open Product
                  </Link>
                </article>
              ))}
            </div>
          ) : !reorderQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>No reorder recommendation rows returned.</div> : null}
        </Section>
      </div>

      <Section title="Inventory Anomalies" subtitle="Products whose recent outbound activity looks unusual compared to their own baseline.">
        {anomaliesQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>Loading anomaly signals...</div> : null}
        {anomaliesQuery.isError ? <div className="app-error-state" style={styles.errorState}>{toReadableError(anomaliesQuery.error)}</div> : null}
        {anomaliesQuery.data?.rows.length ? (
          <div style={styles.list}>
            {anomaliesQuery.data.rows.slice(0, 10).map((row) => (
              <article key={row.product_id} style={styles.itemCard}>
                <div style={styles.itemTitle}>{row.product_name}</div>
                <div style={styles.itemMeta}>Anomaly {formatNumber(row.anomaly_score, 0)} · Tier {row.anomaly_tier}</div>
                <div style={styles.itemText}>
                  Recent Daily {formatNumber(row.recent_daily_outbound)} · Baseline Daily {formatNumber(row.baseline_daily_outbound)} · Spike Ratio {formatNumber(row.spike_ratio)}
                </div>
                <Link to={`/stock-movements?productId=${encodeURIComponent(row.product_id)}`} style={styles.inlineActionLink}>
                  Open Movements
                </Link>
              </article>
            ))}
          </div>
        ) : !anomaliesQuery.isLoading ? <div className="app-empty-state" style={styles.infoState}>No anomaly rows returned.</div> : null}
      </Section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'grid',
    gap: '20px',
    width: '100%',
    minWidth: 0
  },
  statsGrid: {
    width: '100%',
    minWidth: 0
  },
  supplierSummaryGrid: {
    width: '100%',
    minWidth: 0,
    marginBottom: '14px'
  },
  supplierControls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'end',
    marginBottom: '12px',
    minWidth: 0
  },
  paginationControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
    marginTop: '12px',
    marginBottom: '12px'
  },
  statCard: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '18px',
    minWidth: 0
  },
  statTitle: {
    color: '#64748b',
    fontSize: '0.82rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
  },
  statValue: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  statValueGood: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#166534'
  },
  statValueWarn: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#b45309'
  },
  statValueBad: {
    marginTop: '10px',
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#b91c1c'
  },
  statSubtitle: {
    marginTop: '8px',
    color: '#475569',
    lineHeight: 1.5
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
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
    gap: '12px',
    minWidth: 0
  },
  panelHeaderText: {
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  panelSubtitle: {
    margin: '8px 0 0 0',
    color: '#475569',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  controlRow: {
    minWidth: 0
  },
  label: {
    display: 'grid',
    gap: '8px',
    fontWeight: 600,
    color: '#334155',
    minWidth: 0
  },
  select: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '0.95rem',
    minWidth: '180px',
    maxWidth: '100%'
  },
  input: {
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '0.95rem',
    minWidth: '240px',
    maxWidth: '100%'
  },
  secondaryButton: {
    alignSelf: 'end',
    whiteSpace: 'nowrap'
  },
  list: {
    display: 'grid',
    gap: '12px',
    minWidth: 0
  },
  actionAgendaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    minWidth: 0
  },
  actionCardBad: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  actionCardWarn: {
    border: '1px solid #fde68a',
    background: '#fffbeb',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  actionCardGood: {
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  actionCardTitle: {
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  actionCardText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  actionCardLink: {
    color: '#1d4ed8',
    fontWeight: 700,
    textDecoration: 'none'
  },
  itemCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '8px',
    minWidth: 0
  },
  itemTitle: {
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  itemMeta: {
    color: '#64748b',
    fontSize: '0.88rem',
    lineHeight: 1.45,
    wordBreak: 'break-word'
  },
  itemText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  keyValueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
    borderBottom: '1px solid #f1f5f9',
    paddingBottom: '10px',
    minWidth: 0
  },
  keyLabel: {
    flexShrink: 0
  },
  keyValue: {
    minWidth: 0,
    flex: '1 1 220px',
    textAlign: 'right',
    wordBreak: 'break-word'
  },
  infoState: {
    margin: 0
  },
  errorState: {
    margin: 0
  },
  inlineActionGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    alignItems: 'center'
  },
  inlineActionLink: {
    color: '#1d4ed8',
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: '0.92rem'
  },
  inlineActionButton: {
    padding: '6px 10px',
    fontSize: '0.85rem',
    minHeight: 'auto'
  },
  supplierDetailPanel: {
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    borderRadius: '16px',
    padding: '16px',
    display: 'grid',
    gap: '14px',
    minWidth: 0
  },
  supplierDetailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  supplierDetailGrid: {
    width: '100%',
    minWidth: 0
  },
  supplierDetailBody: {
    display: 'grid',
    gap: '10px',
    background: '#fff',
    border: '1px solid #dbeafe',
    borderRadius: '14px',
    padding: '14px',
    minWidth: 0
  },
  riskFlagDetailList: {
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  riskFlagDetailItem: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    background: '#fff',
    border: '1px solid #dbeafe',
    borderRadius: '12px',
    padding: '10px',
    minWidth: 0
  },
  activeFilterBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '12px',
    minWidth: 0
  },
  activeFilterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#334155',
    borderRadius: '999px',
    padding: '5px 8px 5px 10px',
    fontSize: '0.82rem',
    fontWeight: 700,
    maxWidth: '100%'
  },
  chipRemoveButton: {
    border: 0,
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    padding: 0
  },
  supplierBreakdownPanel: {
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '12px',
    minWidth: 0
  },
  supplierBreakdownGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center'
  },
  breakdownButton: {
    padding: '6px 10px',
    fontSize: '0.85rem',
    minHeight: 'auto',
    whiteSpace: 'nowrap'
  },
  supplierDataMetaPanel: {
    border: '1px solid #e5e7eb',
    background: '#f8fafc',
    borderRadius: '12px',
    padding: '10px 12px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    color: '#475569',
    fontSize: '0.86rem',
    fontWeight: 700,
    marginBottom: '14px',
    minWidth: 0
  },
  supplierActionSummaryPanel: {
    border: '1px solid #dbeafe',
    background: '#eff6ff',
    borderRadius: '14px',
    padding: '14px',
    display: 'grid',
    gap: '12px',
    marginBottom: '14px',
    minWidth: 0
  },
  supplierActionSummaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    minWidth: 0
  },
  supplierActionSummaryItem: {
    border: '1px solid #bfdbfe',
    background: '#fff',
    borderRadius: '12px',
    padding: '10px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    textAlign: 'left',
    cursor: 'pointer',
    minWidth: 0
  },
  supplierActionSummaryText: {
    color: '#334155',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  recommendedActionPanel: {
    display: 'grid',
    gap: '10px',
    background: '#fff',
    border: '1px solid #dbeafe',
    borderRadius: '14px',
    padding: '14px',
    minWidth: 0
  },
  recommendedActionItem: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    alignItems: 'start',
    gap: '10px',
    background: '#f8fafc',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '10px',
    minWidth: 0
  },
  riskFlagGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center'
  },
  riskFlagHigh: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#991b1b',
    borderRadius: '999px',
    padding: '4px 8px',
    fontSize: '0.78rem',
    fontWeight: 800
  },
  riskFlagMedium: {
    border: '1px solid #fde68a',
    background: '#fffbeb',
    color: '#92400e',
    borderRadius: '999px',
    padding: '4px 8px',
    fontSize: '0.78rem',
    fontWeight: 800
  },
  riskFlagLow: {
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    color: '#1e40af',
    borderRadius: '999px',
    padding: '4px 8px',
    fontSize: '0.78rem',
    fontWeight: 800
  }
};