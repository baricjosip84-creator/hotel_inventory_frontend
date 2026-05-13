import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

/**
 * ============================================================================
 * DashboardPage
 * ============================================================================
 *
 * Presentation-grade operational dashboard.
 *
 * Goals:
 * - keep all existing real backend wiring
 * - improve visual hierarchy
 * - make empty states feel intentional
 * - make demo flow stronger
 */

/**
 * ============================================================================
 * Types
 * ============================================================================
 */

type DashboardSummaryResponse = {
  master_data: {
    total_products: number;
    total_suppliers: number;
    total_storage_locations: number;
  };
  shipments: {
    total_shipments: number;
    pending_shipments: number;
    partial_shipments: number;
    received_shipments: number;
  };
  alerts: {
    total_alerts: number;
    unresolved_alerts: number;
    critical_unresolved_alerts: number;
    unacknowledged_alerts: number;
  };
  stock: {
    total_stock_rows: number;
    low_stock_rows: number;
  };
};

type LowStockRow = {
  id: string;
  product_id: string;
  product_name: string;
  product_category?: string | null;
  product_unit?: string | null;
  storage_location_id: string;
  storage_location_name: string;
  quantity: number | string;
  min_stock: number | string;
  shortage: number | string;
  updated_at: string;
};

type OverdueShipmentRow = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  delivery_date: string;
  status: string;
  po_number?: string | null;
  qr_code: string;
  created_at: string;
  version: number;
  line_count: number;
  total_ordered_quantity: number | string;
  total_received_quantity: number | string;
};

type UnresolvedAlertRow = {
  id: string;
  product_id?: string | null;
  product_name?: string | null;
  type: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  escalation_level: number;
  acknowledged: boolean;
  acknowledged_at?: string | null;
  created_at: string;
  last_escalated_at?: string | null;
};

type RecentActivityRow = {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  shipment_id?: string | null;
  shipment_po_number?: string | null;
  change: number | string;
  reason: string;
  user_id?: string | null;
  user_name?: string | null;
  created_at: string;
};

type SupplierPerformanceRow = {
  supplier_id: string;
  supplier_name: string;
  total_shipments: number;
  pending_shipments: number;
  partial_shipments: number;
  received_shipments: number;
  overdue_shipments: number;
  last_delivery_date?: string | null;
};

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
    storage_location_id: string;
    storage_location_name: string;
    temperature_zone?: string | null;
    current_quantity: number | string;
    configured_min_quantity: number | string;
    recent_outbound_quantity: number | string;
    average_daily_outbound: number | string;
    estimated_days_of_coverage: number | null;
    risk_score: number | string;
    risk_tier: 'critical' | 'high' | 'watch' | 'stable' | string;
    updated_at: string;
    version: number;
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
    recent_outbound: number | string;
    average_daily_usage: number | string;
    estimated_days_of_coverage: number | null;
    recommended_reorder_quantity: number | string;
    urgency: 'critical' | 'high' | 'medium' | 'low' | string;
  }>;
};

type OperationalHealthResponse = {
  generated_at: string;
  tenant_id: string;
  health_score: number | string;
  health_tier: 'excellent' | 'good' | 'watch' | 'critical' | string;
  metrics: {
    unresolved_alerts: number;
    overdue_shipments: number;
    total_stock_rows: number;
    low_stock_rows: number;
    low_stock_rate_pct: number | string;
    total_ordered_quantity: number | string;
    total_discrepancy_quantity: number | string;
    discrepancy_rate_pct: number | string;
  };
  penalties: {
    alert_penalty: number | string;
    overdue_penalty: number | string;
    low_stock_penalty: number | string;
    discrepancy_penalty: number | string;
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
    short_window_days: number;
    baseline_window_days: number;
    recent_outbound_quantity: number | string;
    baseline_outbound_quantity: number | string;
    recent_daily_outbound: number | string;
    baseline_daily_outbound: number | string;
    spike_ratio: number | string;
    anomaly_score: number | string;
    anomaly_tier: 'critical' | 'high' | 'watch' | 'normal' | string;
  }>;
};

/**
 * ============================================================================
 * API
 * ============================================================================
 */

async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  return apiRequest<DashboardSummaryResponse>('/dashboard/summary');
}

async function fetchLowStock(): Promise<LowStockRow[]> {
  return apiRequest<LowStockRow[]>('/dashboard/low-stock?limit=8');
}

async function fetchOverdueShipments(): Promise<OverdueShipmentRow[]> {
  return apiRequest<OverdueShipmentRow[]>('/dashboard/overdue-shipments?limit=8');
}

async function fetchUnresolvedAlerts(): Promise<UnresolvedAlertRow[]> {
  return apiRequest<UnresolvedAlertRow[]>('/dashboard/unresolved-alerts?limit=8');
}

async function fetchRecentActivity(): Promise<RecentActivityRow[]> {
  return apiRequest<RecentActivityRow[]>('/dashboard/recent-activity?limit=10');
}

async function fetchSupplierPerformance(): Promise<SupplierPerformanceRow[]> {
  return apiRequest<SupplierPerformanceRow[]>('/dashboard/supplier-performance?limit=8');
}

async function fetchDepletionRisk(): Promise<DepletionRiskResponse> {
  return apiRequest<DepletionRiskResponse>('/inventory-insights/depletion-risk?lookback_days=30');
}

async function fetchReorderRecommendations(): Promise<ReorderRecommendationsResponse> {
  return apiRequest<ReorderRecommendationsResponse>('/reorder-insights/recommendations?lookback_days=30');
}

async function fetchOperationalHealth(): Promise<OperationalHealthResponse> {
  return apiRequest<OperationalHealthResponse>('/operational-insights/health-score');
}

async function fetchAnomalies(): Promise<AnomaliesResponse> {
  return apiRequest<AnomaliesResponse>(
    '/operational-insights/anomalies?short_window_days=7&baseline_window_days=30'
  );
}

/**
 * ============================================================================
 * Helpers
 * ============================================================================
 */

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString();
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString();
}

function healthBadgeStyle(tier: string): CSSProperties {
  if (tier === 'excellent') {
    return { ...styles.badgeBase, background: '#dcfce7', color: '#166534' };
  }

  if (tier === 'good') {
    return { ...styles.badgeBase, background: '#dbeafe', color: '#1d4ed8' };
  }

  if (tier === 'watch') {
    return { ...styles.badgeBase, background: '#fef3c7', color: '#92400e' };
  }

  return { ...styles.badgeBase, background: '#fee2e2', color: '#991b1b' };
}

function alertSeverityBadgeStyle(severity: string): CSSProperties {
  if (severity === 'critical') {
    return { ...styles.badgeBase, background: '#fee2e2', color: '#991b1b' };
  }

  if (severity === 'warning') {
    return { ...styles.badgeBase, background: '#fef3c7', color: '#92400e' };
  }

  return { ...styles.badgeBase, background: '#dbeafe', color: '#1d4ed8' };
}

function urgencyBadgeStyle(urgency: string): CSSProperties {
  if (urgency === 'critical') {
    return { ...styles.badgeBase, background: '#fee2e2', color: '#991b1b' };
  }

  if (urgency === 'high') {
    return { ...styles.badgeBase, background: '#ffedd5', color: '#9a3412' };
  }

  if (urgency === 'medium' || urgency === 'watch') {
    return { ...styles.badgeBase, background: '#fef3c7', color: '#92400e' };
  }

  return { ...styles.badgeBase, background: '#dcfce7', color: '#166534' };
}

function changeBadgeStyle(value: number): CSSProperties {
  if (value > 0) {
    return { ...styles.badgeBase, background: '#dcfce7', color: '#166534' };
  }

  if (value < 0) {
    return { ...styles.badgeBase, background: '#fee2e2', color: '#991b1b' };
  }

  return { ...styles.badgeBase, background: '#e5e7eb', color: '#374151' };
}

function changeDisplay(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function Section(props: {
  title: string;
  subtitle: string;
  actionHint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="app-panel app-panel--padded" style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionHeaderText}>
          <h3 style={styles.sectionTitle}>{props.title}</h3>
          <p style={styles.sectionSubtitle}>{props.subtitle}</p>
        </div>
        {props.actionHint ? <div style={styles.sectionHint}>{props.actionHint}</div> : null}
      </div>
      {props.children}
    </section>
  );
}

function SectionError(props: { message: string }) {
  return <div className="app-error-state" style={styles.errorInline}>{props.message}</div>;
}

function PremiumEmptyState(props: {
  title: string;
  message: string;
  tone?: 'good' | 'neutral';
  meta?: string;
}) {
  const toneClassName =
    props.tone === 'good'
      ? 'app-success-state'
      : 'app-empty-state';

  const toneStyle =
    props.tone === 'good'
      ? styles.emptyStateGood
      : styles.emptyStateNeutral;

  return (
    <div className={toneClassName} style={toneStyle}>
      <div style={styles.emptyStateTitle}>{props.title}</div>
      <div style={styles.emptyStateMessage}>{props.message}</div>
      {props.meta ? <div style={styles.emptyStateMeta}>{props.meta}</div> : null}
    </div>
  );
}

function ActionLink(props: { to: string; label: string }) {
  return (
    <Link to={props.to} style={styles.actionLink}>
      {props.label}
    </Link>
  );
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn' | 'danger';
}) {
  const toneStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : props.tone === 'danger'
          ? styles.statValueDanger
          : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={toneStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

/**
 * ============================================================================
 * Component
 * ============================================================================
 */

export default function DashboardPage() {
  const { canViewInsights } = getRoleCapabilities();

  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the DashboardPage you sent.

    Existing real behavior is preserved:
    - same dashboard queries
    - same section structure
    - same quick links
    - same operational health, depletion, reorder, alerts, anomalies, activity,
      and supplier performance rendering
    - same helper logic and routing

    This pass applies the shared UI foundation carefully:
    - dashboard sections now use app-panel/app-panel--padded
    - KPI grids now use app-grid-stats
    - empty/error states align with the shared foundation
    - no business logic was changed

    WHAT PROBLEM IT SOLVES
    ----------------------
    Makes the dashboard consume the same shared visual layer as the other pages
    without simplifying or rewriting any of its operational content.
  */
  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary
  });

  const lowStockQuery = useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn: fetchLowStock
  });

  const overdueShipmentsQuery = useQuery({
    queryKey: ['dashboard-overdue-shipments'],
    queryFn: fetchOverdueShipments
  });

  const unresolvedAlertsQuery = useQuery({
    queryKey: ['dashboard-unresolved-alerts'],
    queryFn: fetchUnresolvedAlerts
  });

  const recentActivityQuery = useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: fetchRecentActivity
  });

  const supplierPerformanceQuery = useQuery({
    queryKey: ['dashboard-supplier-performance'],
    queryFn: fetchSupplierPerformance
  });

  const depletionRiskQuery = useQuery({
    queryKey: ['inventory-depletion-risk'],
    queryFn: fetchDepletionRisk,
    enabled: canViewInsights
  });

  const reorderRecommendationsQuery = useQuery({
    queryKey: ['reorder-recommendations'],
    queryFn: fetchReorderRecommendations,
    enabled: canViewInsights
  });

  const operationalHealthQuery = useQuery({
    queryKey: ['operational-health'],
    queryFn: fetchOperationalHealth,
    enabled: canViewInsights
  });

  const anomaliesQuery = useQuery({
    queryKey: ['inventory-anomalies'],
    queryFn: fetchAnomalies,
    enabled: canViewInsights
  });

  const summary = summaryQuery.data;
  const health = operationalHealthQuery.data;

  const topDepletionRows = useMemo(() => {
    return (depletionRiskQuery.data?.rows ?? [])
      .slice()
      .sort((a, b) => toNumber(b.risk_score) - toNumber(a.risk_score))
      .slice(0, 6);
  }, [depletionRiskQuery.data]);

  const topReorderRows = useMemo(() => {
    return (reorderRecommendationsQuery.data?.rows ?? [])
      .slice()
      .sort(
        (a, b) =>
          toNumber(b.recommended_reorder_quantity) - toNumber(a.recommended_reorder_quantity)
      )
      .filter((row) => toNumber(row.recommended_reorder_quantity) > 0)
      .slice(0, 6);
  }, [reorderRecommendationsQuery.data]);

  const topAnomalies = useMemo(() => {
    return (anomaliesQuery.data?.rows ?? []).slice(0, 6);
  }, [anomaliesQuery.data]);

  if (summaryQuery.isLoading) {
    return (
      <div style={styles.page}>
        <h2 style={styles.title}>Dashboard</h2>
        <p style={styles.description}>Loading production dashboard...</p>
      </div>
    );
  }

  if (summaryQuery.isError || !summary) {
    return (
      <div style={styles.page}>
        <h2 style={styles.title}>Dashboard</h2>
        <p style={styles.description}>
          Failed to load dashboard summary:{' '}
          {(summaryQuery.error as Error)?.message || 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTextBlock}>
          <h2 style={styles.title}>Dashboard</h2>
          <p style={styles.description}>
            Operational overview, intelligent inventory signals, and recent activity for
            the current tenant.
          </p>
        </div>
      </div>

      <div style={styles.quickActionRow}>
        <ActionLink to="/stock" label="Open Stock" />
        <ActionLink to="/shipments" label="Open Shipments" />
        <ActionLink to="/alerts?resolved=false" label="Review Alerts" />
        <ActionLink to="/products" label="Manage Products" />
        <ActionLink to="/suppliers" label="Open Suppliers" />
        <ActionLink to="/storage-locations" label="Open Locations" />
        <ActionLink to="/reports" label="Open Reports" />
        <ActionLink to="/insights" label="Open Insights" />
      </div>

      <div className="app-grid-stats" style={styles.kpiGrid}>
        <StatCard
          title="Products"
          value={summary.master_data.total_products}
          subtitle="Active products"
        />
        <StatCard
          title="Suppliers"
          value={summary.master_data.total_suppliers}
          subtitle="Active suppliers"
        />
        <StatCard
          title="Storage Locations"
          value={summary.master_data.total_storage_locations}
          subtitle="Configured locations"
        />
        <StatCard
          title="Pending Shipments"
          value={summary.shipments.pending_shipments}
          subtitle="Not yet received"
          tone={summary.shipments.pending_shipments > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title="Partial Shipments"
          value={summary.shipments.partial_shipments}
          subtitle="Partially received"
          tone={summary.shipments.partial_shipments > 0 ? 'warn' : 'default'}
        />
        <StatCard
          title="Low Stock Rows"
          value={summary.stock.low_stock_rows}
          subtitle="Below configured minimum"
          tone={summary.stock.low_stock_rows > 0 ? 'danger' : 'good'}
        />
        <StatCard
          title="Unresolved Alerts"
          value={summary.alerts.unresolved_alerts}
          subtitle="Still requiring attention"
          tone={summary.alerts.unresolved_alerts > 0 ? 'danger' : 'good'}
        />
        <StatCard
          title="Critical Alerts"
          value={summary.alerts.critical_unresolved_alerts}
          subtitle="Highest priority"
          tone={summary.alerts.critical_unresolved_alerts > 0 ? 'danger' : 'good'}
        />
      </div>

      <div className="app-grid-stats" style={styles.kpiGrid}>
        <div className="app-panel app-panel--padded" style={styles.healthCard}>
          <div style={styles.healthHeader}>
            <div style={styles.healthHeaderText}>
              <div style={styles.healthTitle}>Operational Health</div>
              <div style={styles.healthSubtitle}>
                Tenant-level health based on alerts, overdue shipments, low stock, and discrepancy pressure.
              </div>
            </div>

            {health ? (
              <span style={healthBadgeStyle(health.health_tier)}>
                {health.health_tier}
              </span>
            ) : null}
          </div>

          {!canViewInsights ? (
            <SectionError message="Your role can view the operational dashboard but not management insights." />
          ) : operationalHealthQuery.isLoading ? (
            <p>Loading health score...</p>
          ) : operationalHealthQuery.isError || !health ? (
            <SectionError
              message={
                (operationalHealthQuery.error as Error)?.message ||
                'Unable to load operational health.'
              }
            />
          ) : (
            <>
              <div style={styles.healthScore}>{toNumber(health.health_score)}</div>

              <div style={styles.healthMetricsGrid}>
                <div style={styles.healthMetric}>
                  <div style={styles.healthMetricLabel}>Low Stock Rate</div>
                  <div style={styles.healthMetricValue}>
                    {toNumber(health.metrics.low_stock_rate_pct)}%
                  </div>
                </div>

                <div style={styles.healthMetric}>
                  <div style={styles.healthMetricLabel}>Discrepancy Rate</div>
                  <div style={styles.healthMetricValue}>
                    {toNumber(health.metrics.discrepancy_rate_pct)}%
                  </div>
                </div>

                <div style={styles.healthMetric}>
                  <div style={styles.healthMetricLabel}>Overdue Shipments</div>
                  <div style={styles.healthMetricValue}>
                    {health.metrics.overdue_shipments}
                  </div>
                </div>

                <div style={styles.healthMetric}>
                  <div style={styles.healthMetricLabel}>Unresolved Alerts</div>
                  <div style={styles.healthMetricValue}>
                    {health.metrics.unresolved_alerts}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={styles.twoColumnGrid}>
        <Section
          title="Depletion Risk"
          subtitle="Products and stock rows most at risk of running out soon."
          actionHint="Top risk candidates"
        >
          {!canViewInsights ? (
            <SectionError message="Your role can view dashboard operations but not depletion-risk insights." />
          ) : depletionRiskQuery.isLoading ? (
            <p>Loading depletion risk...</p>
          ) : depletionRiskQuery.isError ? (
            <SectionError
              message={
                (depletionRiskQuery.error as Error)?.message ||
                'Unable to load depletion risk.'
              }
            />
          ) : (
            <div style={styles.list}>
              {topDepletionRows.length === 0 ? (
                <PremiumEmptyState
                  title="No active depletion risk"
                  message="Current stock positions look stable for the evaluated time window."
                  tone="good"
                  meta="Lookback window: 30 days"
                />
              ) : (
                topDepletionRows.map((row) => (
                  <div style={styles.listCard} key={row.stock_id}>
                    <div style={styles.listCardHeader}>
                      <div style={styles.listCardHeaderText}>
                        <div style={styles.listCardTitle}>{row.product_name}</div>
                        <div style={styles.listCardMeta}>
                          {row.storage_location_name} · {row.product_unit || '-'}
                        </div>
                      </div>
                      <span style={urgencyBadgeStyle(row.risk_tier)}>{row.risk_tier}</span>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Current Qty</span>
                      <strong>{toNumber(row.current_quantity)}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Configured Min</span>
                      <strong>{toNumber(row.configured_min_quantity)}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Recent Outbound</span>
                      <strong>{toNumber(row.recent_outbound_quantity)}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Coverage Days</span>
                      <strong>
                        {row.estimated_days_of_coverage === null
                          ? '-'
                          : toNumber(row.estimated_days_of_coverage)}
                      </strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Risk Score</span>
                      <strong>{toNumber(row.risk_score)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Section>

        <Section
          title="Reorder Recommendations"
          subtitle="Explainable reorder signals based on current stock and recent usage."
          actionHint="Action queue"
        >
          {!canViewInsights ? (
            <SectionError message="Your role can view dashboard operations but not reorder insights." />
          ) : reorderRecommendationsQuery.isLoading ? (
            <p>Loading reorder recommendations...</p>
          ) : reorderRecommendationsQuery.isError ? (
            <SectionError
              message={
                (reorderRecommendationsQuery.error as Error)?.message ||
                'Unable to load reorder recommendations.'
              }
            />
          ) : (
            <div style={styles.list}>
              {topReorderRows.length === 0 ? (
                <PremiumEmptyState
                  title="No reorder action required"
                  message="Inventory is currently above the system's reorder thresholds for the evaluated products."
                  tone="good"
                  meta={`Products evaluated: ${(summary.master_data.total_products ?? 0).toString()} · Lookback window: 30 days`}
                />
              ) : (
                topReorderRows.map((row) => (
                  <div style={styles.listCard} key={row.product_id}>
                    <div style={styles.listCardHeader}>
                      <div style={styles.listCardHeaderText}>
                        <div style={styles.listCardTitle}>{row.product_name}</div>
                        <div style={styles.listCardMeta}>{row.unit}</div>
                      </div>
                      <span style={urgencyBadgeStyle(row.urgency)}>{row.urgency}</span>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Current Quantity</span>
                      <strong>{toNumber(row.current_quantity)}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Min Stock</span>
                      <strong>{toNumber(row.min_stock)}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Daily Usage</span>
                      <strong>{toNumber(row.average_daily_usage)}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Coverage Days</span>
                      <strong>
                        {row.estimated_days_of_coverage === null
                          ? '-'
                          : toNumber(row.estimated_days_of_coverage)}
                      </strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Recommended Reorder</span>
                      <strong>{toNumber(row.recommended_reorder_quantity)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Section>
      </div>

      <div style={styles.twoColumnGrid}>
        <Section
          title="Low Stock"
          subtitle="Most urgent low-stock rows requiring action."
        >
          {lowStockQuery.isLoading ? (
            <p>Loading low-stock rows...</p>
          ) : lowStockQuery.isError ? (
            <SectionError
              message={(lowStockQuery.error as Error)?.message || 'Unable to load low-stock rows.'}
            />
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Min</th>
                    <th style={styles.th}>Shortage</th>
                  </tr>
                </thead>
                <tbody>
                  {(lowStockQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={5}>
                        No low-stock rows.
                      </td>
                    </tr>
                  ) : (
                    (lowStockQuery.data ?? []).map((row) => (
                      <tr key={row.id}>
                        <td style={styles.td}>{row.product_name}</td>
                        <td style={styles.td}>{row.storage_location_name}</td>
                        <td style={styles.td}>{toNumber(row.quantity)}</td>
                        <td style={styles.td}>{toNumber(row.min_stock)}</td>
                        <td style={styles.td}>{toNumber(row.shortage)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="Overdue Shipments"
          subtitle="Shipments past their delivery date and not fully received."
        >
          {overdueShipmentsQuery.isLoading ? (
            <p>Loading overdue shipments...</p>
          ) : overdueShipmentsQuery.isError ? (
            <SectionError
              message={
                (overdueShipmentsQuery.error as Error)?.message ||
                'Unable to load overdue shipments.'
              }
            />
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>PO Number</th>
                    <th style={styles.th}>Supplier</th>
                    <th style={styles.th}>Delivery Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Ordered / Received</th>
                  </tr>
                </thead>
                <tbody>
                  {(overdueShipmentsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={5}>
                        No overdue shipments.
                      </td>
                    </tr>
                  ) : (
                    (overdueShipmentsQuery.data ?? []).map((row) => (
                      <tr key={row.id}>
                        <td style={styles.td}>{row.po_number || '-'}</td>
                        <td style={styles.td}>
                          <div style={styles.rowTitle}>{row.supplier_name}</div>
                          <ActionLink
                            to={`/suppliers?search=${encodeURIComponent(row.supplier_name)}`}
                            label="Open Supplier"
                          />
                        </td>
                        <td style={styles.td}>{formatDate(row.delivery_date)}</td>
                        <td style={styles.td}>
                          <span style={urgencyBadgeStyle(row.status)}>{row.status}</span>
                        </td>
                        <td style={styles.td}>
                          {toNumber(row.total_ordered_quantity)} / {toNumber(row.total_received_quantity)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      <div style={styles.twoColumnGrid}>
        <Section
          title="Unresolved Alerts"
          subtitle="Highest-priority unresolved alerts requiring review."
        >
          {unresolvedAlertsQuery.isLoading ? (
            <p>Loading unresolved alerts...</p>
          ) : unresolvedAlertsQuery.isError ? (
            <SectionError
              message={
                (unresolvedAlertsQuery.error as Error)?.message ||
                'Unable to load unresolved alerts.'
              }
            />
          ) : (
            <div style={styles.list}>
              {(unresolvedAlertsQuery.data ?? []).length === 0 ? (
                <PremiumEmptyState
                  title="No unresolved alerts"
                  message="Current alert state is clean for the active tenant."
                  tone="good"
                />
              ) : (
                (unresolvedAlertsQuery.data ?? []).map((alert) => (
                  <div style={styles.listCard} key={alert.id}>
                    <div style={styles.listCardHeader}>
                      <div style={styles.listCardHeaderText}>
                        <div style={styles.listCardTitle}>{alert.type}</div>
                        <div style={styles.listCardMeta}>
                          {alert.product_name || 'No product linked'} · {formatDateTime(alert.created_at)}
                        </div>
                      </div>
                      <span style={alertSeverityBadgeStyle(alert.severity)}>{alert.severity}</span>
                    </div>

                    <div style={styles.cardText}>{alert.message}</div>
                    <ActionLink
                      to={`/alerts?search=${encodeURIComponent(alert.product_name || alert.type)}`}
                      label="Open in Alerts"
                    />

                    <div style={styles.metricRow}>
                      <span>Escalation Level</span>
                      <strong>{alert.escalation_level}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Acknowledged</span>
                      <strong>{alert.acknowledged ? 'Yes' : 'No'}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Section>

        <Section
          title="Inventory Anomalies"
          subtitle="Products with unusually high outbound activity compared to their own baseline."
        >
          {!canViewInsights ? (
            <SectionError message="Your role can view dashboard operations but not anomaly insights." />
          ) : anomaliesQuery.isLoading ? (
            <p>Loading anomalies...</p>
          ) : anomaliesQuery.isError ? (
            <SectionError
              message={(anomaliesQuery.error as Error)?.message || 'Unable to load anomalies.'}
            />
          ) : (
            <div style={styles.list}>
              {topAnomalies.length === 0 ? (
                <PremiumEmptyState
                  title="No abnormal consumption patterns"
                  message="No significant usage spikes were detected against the current baseline window."
                  tone="good"
                />
              ) : (
                topAnomalies.map((row) => (
                  <div style={styles.listCard} key={row.product_id}>
                    <div style={styles.listCardHeader}>
                      <div style={styles.listCardHeaderText}>
                        <div style={styles.listCardTitle}>{row.product_name}</div>
                        <div style={styles.listCardMeta}>
                          {row.product_category || '-'} · {row.product_unit || '-'}
                        </div>
                      </div>
                      <span style={urgencyBadgeStyle(row.anomaly_tier)}>{row.anomaly_tier}</span>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Recent Daily Outbound</span>
                      <strong>{toNumber(row.recent_daily_outbound)}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Baseline Daily Outbound</span>
                      <strong>{toNumber(row.baseline_daily_outbound)}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Spike Ratio</span>
                      <strong>{toNumber(row.spike_ratio)}</strong>
                    </div>

                    <div style={styles.metricRow}>
                      <span>Anomaly Score</span>
                      <strong>{toNumber(row.anomaly_score)}</strong>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </Section>
      </div>

      <div style={styles.twoColumnGrid}>
        <Section
          title="Recent Activity"
          subtitle="Latest stock movement activity visible to operators and managers."
        >
          {recentActivityQuery.isLoading ? (
            <p>Loading recent activity...</p>
          ) : recentActivityQuery.isError ? (
            <SectionError
              message={
                (recentActivityQuery.error as Error)?.message ||
                'Unable to load recent activity.'
              }
            />
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Created</th>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Change</th>
                    <th style={styles.th}>Reason</th>
                    <th style={styles.th}>User</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentActivityQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={5}>
                        No recent activity.
                      </td>
                    </tr>
                  ) : (
                    (recentActivityQuery.data ?? []).map((row) => {
                      const amount = toNumber(row.change);

                      return (
                        <tr key={row.id}>
                          <td style={styles.td}>{formatDateTime(row.created_at)}</td>
                          <td style={styles.td}>
                            <div style={styles.rowTitle}>{row.product_name}</div>
                            <div style={styles.rowSubtle}>{row.product_unit}</div>
                          </td>
                          <td style={styles.td}>
                            <span style={changeBadgeStyle(amount)}>{changeDisplay(amount)}</span>
                          </td>
                          <td style={styles.td}>{row.reason}</td>
                          <td style={styles.td}>{row.user_name || row.user_id || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="Supplier Performance"
          subtitle="Shipment execution summary by supplier."
        >
          {supplierPerformanceQuery.isLoading ? (
            <p>Loading supplier performance...</p>
          ) : supplierPerformanceQuery.isError ? (
            <SectionError
              message={
                (supplierPerformanceQuery.error as Error)?.message ||
                'Unable to load supplier performance.'
              }
            />
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Supplier</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>Pending</th>
                    <th style={styles.th}>Partial</th>
                    <th style={styles.th}>Received</th>
                    <th style={styles.th}>Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {(supplierPerformanceQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td style={styles.emptyCell} colSpan={6}>
                        No supplier performance rows found.
                      </td>
                    </tr>
                  ) : (
                    (supplierPerformanceQuery.data ?? []).map((row) => (
                      <tr key={row.supplier_id}>
                        <td style={styles.td}>
                          <div style={styles.rowTitle}>{row.supplier_name}</div>
                          <ActionLink
                            to={`/suppliers?search=${encodeURIComponent(row.supplier_name)}`}
                            label="Open Supplier"
                          />
                        </td>
                        <td style={styles.td}>{row.total_shipments}</td>
                        <td style={styles.td}>{row.pending_shipments}</td>
                        <td style={styles.td}>{row.partial_shipments}</td>
                        <td style={styles.td}>{row.received_shipments}</td>
                        <td style={styles.td}>{row.overdue_shipments}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    width: '100%',
    minWidth: 0
  },
  header: {
    marginBottom: '20px',
    minWidth: 0
  },
  headerTextBlock: {
    minWidth: 0
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700
  },
  description: {
    marginTop: '8px',
    color: '#6b7280',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  kpiGrid: {
    marginBottom: '20px',
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
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statValueGood: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#166534',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statValueWarn: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#92400e',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statValueDanger: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#991b1b',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  healthCard: {
    minWidth: 0
  },
  healthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  healthHeaderText: {
    minWidth: 0
  },
  healthTitle: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '6px'
  },
  healthSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    maxWidth: '700px',
    wordBreak: 'break-word'
  },
  healthScore: {
    fontSize: '56px',
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: '16px'
  },
  healthMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '14px',
    minWidth: 0
  },
  healthMetric: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px',
    background: '#fafafa',
    minWidth: 0
  },
  healthMetricLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
    fontWeight: 600
  },
  healthMetricValue: {
    fontSize: '24px',
    fontWeight: 700
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
    gap: '20px',
    marginBottom: '20px',
    width: '100%',
    minWidth: 0
  },
  panel: {
    minWidth: 0,
    overflow: 'hidden'
  },
  sectionHeader: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  sectionHeaderText: {
    minWidth: 0
  },
  sectionTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    wordBreak: 'break-word'
  },
  sectionSubtitle: {
    margin: '8px 0 0 0',
    color: '#6b7280',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  sectionHint: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#6b7280',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '999px',
    padding: '6px 10px',
    whiteSpace: 'nowrap'
  },
  list: {
    display: 'grid',
    gap: '14px',
    minWidth: 0
  },
  listCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px',
    background: '#fafafa',
    minWidth: 0
  },
  listCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '12px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  listCardHeaderText: {
    minWidth: 0
  },
  listCardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '4px',
    wordBreak: 'break-word'
  },
  listCardMeta: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
    wordBreak: 'break-word'
  },
  cardText: {
    color: '#374151',
    lineHeight: 1.6,
    marginBottom: '12px',
    wordBreak: 'break-word'
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '12px',
    fontSize: '14px',
    padding: '6px 0',
    borderTop: '1px solid #f3f4f6'
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
    minWidth: '720px'
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
    borderBottom: '1px solid #f3f4f6',
    fontSize: '14px',
    verticalAlign: 'top',
    wordBreak: 'break-word'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  badgeBase: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '12px',
    whiteSpace: 'nowrap'
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
    wordBreak: 'break-word'
  },
  emptyStateNeutral: {
    minWidth: 0
  },
  emptyStateGood: {
    minWidth: 0
  },
  emptyStateTitle: {
    fontWeight: 700,
    marginBottom: '8px',
    fontSize: '16px'
  },
  emptyStateMessage: {
    lineHeight: 1.5
  },
  emptyStateMeta: {
    marginTop: '10px',
    fontSize: '12px',
    opacity: 0.85
  },
  errorInline: {
    margin: 0
  },
  quickActionRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '10px',
    marginBottom: '18px',
    width: '100%',
    minWidth: 0
  },
  actionLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    padding: '8px 12px',
    background: '#ffffff',
    color: '#1d4ed8',
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: '13px',
    minWidth: 0,
    textAlign: 'center'
  }
};