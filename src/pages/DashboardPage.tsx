import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { getRoleCapabilities, hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import { fetchTenantSubscriptionAccess, isTenantFeatureAllowed } from '../lib/tenantSubscriptionAccess';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';

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

type SetupChecklistResponse = {
  complete: boolean;
  completed_steps: number;
  total_steps: number;
  steps: Array<{ key: string; label: string; done: boolean; path: string }>;
};

type OutboundSummaryResponse = {
  open_orders: number;
  packed_orders: number;
  partially_dispatched_orders: number;
  units_waiting: number;
  pending_customer_returns: number;
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

async function fetchSetupChecklist(): Promise<SetupChecklistResponse> {
  return apiRequest<SetupChecklistResponse>('/dashboard/setup-checklist');
}

async function fetchOutboundSummary(): Promise<OutboundSummaryResponse> {
  return apiRequest<OutboundSummaryResponse>('/outbound/summary');
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

  return { ...styles.badgeBase, background: '#e2e8f0', color: '#334155' };
}

function changeDisplay(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function healthTierLabel(tier: string): string {
  if (tier === 'excellent') return 'Excellent';
  if (tier === 'good') return 'Good';
  if (tier === 'watch') return 'Needs attention';
  return 'Critical';
}

function formatActivityReason(reason: string): string {
  const formatPart = (value: string) =>
    value
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const [action, detail] = reason.split(':', 2);
  const actionLabel = formatPart(action || reason);
  return detail ? `${actionLabel} — ${formatPart(detail)}` : actionLabel;
}

function dashboardIconToneStyle(tone: 'default' | 'good' | 'warn' | 'danger' = 'default'): CSSProperties {
  if (tone === 'good') return { background: '#ecfdf5', color: '#16a34a' };
  if (tone === 'warn') return { background: '#fff7ed', color: '#ea580c' };
  if (tone === 'danger') return { background: '#fef2f2', color: '#dc2626' };
  return { background: '#eff6ff', color: '#2563eb' };
}

function DashboardIconBadge(props: {
  path: string;
  tone?: 'default' | 'good' | 'warn' | 'danger';
  size?: number;
}) {
  return (
    <span style={{ ...styles.iconBadge, ...dashboardIconToneStyle(props.tone) }}>
      <TenantNavIcon path={props.path} size={props.size ?? 20} />
    </span>
  );
}

function Section(props: {
  title: string;
  subtitle: string;
  actionHint?: string;
  iconPath?: string;
  iconTone?: 'default' | 'good' | 'warn' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <section className="app-panel app-panel--padded" style={styles.panel}>
      <div style={styles.sectionHeader}>
        <div style={styles.sectionHeaderLead}>
          {props.iconPath ? (
            <DashboardIconBadge path={props.iconPath} tone={props.iconTone} size={18} />
          ) : null}
          <div style={styles.sectionHeaderText}>
            <h3 style={styles.sectionTitle}>{props.title}</h3>
            <p style={styles.sectionSubtitle}>{props.subtitle}</p>
          </div>
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

function ActionLink(props: { to: string; label: string; iconPath?: string }) {
  return (
    <Link to={props.to} style={styles.actionLink}>
      {props.iconPath ? <TenantNavIcon path={props.iconPath} size={16} /> : null}
      <span>{props.label}</span>
    </Link>
  );
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn' | 'danger';
  iconPath: string;
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
      <DashboardIconBadge path={props.iconPath} tone={props.tone} size={21} />
      <div style={styles.statContent}>
        <div style={styles.statTitle}>{props.title}</div>
        <div style={toneStyle}>{props.value}</div>
        <div style={styles.statSubtitle}>{props.subtitle}</div>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * Component
 * ============================================================================
 */

export default function DashboardPage() {
  const { canViewReports, canViewInsights, canManageProducts } = getRoleCapabilities();
  const canViewStock = hasPermission(TENANT_PERMISSIONS.STOCK_READ);
  const canViewShipments = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ);
  const canViewAlerts = hasPermission(TENANT_PERMISSIONS.ALERTS_READ);
  const canViewProducts = hasPermission(TENANT_PERMISSIONS.PRODUCTS_READ);
  const canViewSuppliers = hasPermission(TENANT_PERMISSIONS.SUPPLIERS_READ);
  const canViewLocations = hasPermission(TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ);
  const canViewOutbound = hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_READ);

  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the DashboardPage you sent.

    Existing dashboard data and operational sections are preserved.

    This pass also keeps navigation and display behavior aligned with the real
    permission and subscription model, fixes dashboard links so they open the
    intended record or filtered page, and removes avoidable desktop layout gaps.
  */
  const subscriptionAccessQuery = useQuery({
    queryKey: ['tenant-subscription-access'],
    queryFn: fetchTenantSubscriptionAccess,
    staleTime: 60_000
  });

  const summaryQuery = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary
  });

  const setupChecklistQuery = useQuery({ queryKey: ['dashboard-setup-checklist'], queryFn: fetchSetupChecklist });
  const outboundSummaryQuery = useQuery({ queryKey: ['dashboard-outbound-summary'], queryFn: fetchOutboundSummary, enabled: canViewOutbound });

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
  const canOpenReports =
    canViewReports && isTenantFeatureAllowed(subscriptionAccessQuery.data, 'reports');

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
      <div className="io-operational-page io-dashboard-page" style={styles.page}>
        <div className="app-panel app-panel--padded">Loading dashboard...</div>
      </div>
    );
  }

  if (summaryQuery.isError || !summary) {
    return (
      <div className="io-operational-page io-dashboard-page" style={styles.page}>
        <SectionError
          message={`Failed to load dashboard summary: ${(summaryQuery.error as Error)?.message || 'Unknown error'}`}
        />
      </div>
    );
  }

  return (
    <div className="io-operational-page io-dashboard-page" style={styles.page}>
      {setupChecklistQuery.data && !setupChecklistQuery.data.complete ? (
        <section className="app-panel app-panel--padded" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div><strong>Getting started</strong><div style={{ marginTop: 4, opacity: 0.75 }}>Complete these basics first. {setupChecklistQuery.data.completed_steps}/{setupChecklistQuery.data.total_steps} done.</div></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            {setupChecklistQuery.data.steps.map((step) => <Link key={step.key} to={step.path} style={{ padding: '8px 10px', borderRadius: 8, textDecoration: 'none', border: '1px solid #cbd5e1', color: 'inherit', opacity: step.done ? 0.6 : 1 }}>{step.done ? '✓' : '○'} {step.label}</Link>)}
          </div>
        </section>
      ) : null}

      <div style={styles.quickActionRow}>
        {canViewStock ? <ActionLink to="/stock" label="Open Stock" iconPath="/stock" /> : null}
        {canViewShipments ? <ActionLink to="/shipments" label="Open Shipments" iconPath="/shipments" /> : null}
        {canViewAlerts ? <ActionLink to="/alerts?resolved=false" label="Review Alerts" iconPath="/alerts" /> : null}
        {canViewProducts ? (
          <ActionLink to="/products" label={canManageProducts ? 'Manage Products' : 'Open Products'} iconPath="/products" />
        ) : null}
        {canViewSuppliers ? <ActionLink to="/suppliers" label="Open Suppliers" iconPath="/suppliers" /> : null}
        {canViewLocations ? <ActionLink to="/storage-locations" label="Open Locations" iconPath="/storage-locations" /> : null}
        {canViewOutbound ? <ActionLink to="/outbound" label="Open Outbound" iconPath="/outbound" /> : null}
        {canOpenReports ? <ActionLink to="/reports" label="Open Reports" iconPath="/reports" /> : null}
        {canViewInsights ? <ActionLink to="/insights" label="Open Insights" iconPath="/insights" /> : null}
      </div>

      <div className="app-grid-stats" style={styles.kpiGrid}>
        <StatCard
          title="Products"
          iconPath="/products"
          value={summary.master_data.total_products}
          subtitle="Active products"
        />
        <StatCard
          title="Suppliers"
          iconPath="/suppliers"
          value={summary.master_data.total_suppliers}
          subtitle="Active suppliers"
        />
        <StatCard
          title="Storage Locations"
          iconPath="/storage-locations"
          value={summary.master_data.total_storage_locations}
          subtitle="Configured locations"
        />
        <StatCard
          title="Pending Shipments"
          iconPath="/shipments"
          value={summary.shipments.pending_shipments}
          subtitle="Not yet received"
          tone={summary.shipments.pending_shipments > 0 ? 'warn' : 'good'}
        />
        <StatCard
          title="Partial Shipments"
          iconPath="/shipments"
          value={summary.shipments.partial_shipments}
          subtitle="Partially received"
          tone={summary.shipments.partial_shipments > 0 ? 'warn' : 'default'}
        />
        {canViewOutbound ? (
          <StatCard
            title="Open Outbound Orders"
            iconPath="/outbound"
            value={outboundSummaryQuery.data?.open_orders ?? 0}
            subtitle={`${outboundSummaryQuery.data?.units_waiting ?? 0} unit(s) still waiting`}
            tone={(outboundSummaryQuery.data?.packed_orders ?? 0) > 0 ? 'warn' : 'default'}
          />
        ) : null}
        {canViewOutbound && (outboundSummaryQuery.data?.partially_dispatched_orders ?? 0) > 0 ? (
          <StatCard
            title="Partial Customer Shipments"
            iconPath="/outbound"
            value={outboundSummaryQuery.data?.partially_dispatched_orders ?? 0}
            subtitle="Orders with a remainder still reserved"
            tone="warn"
          />
        ) : null}
        <StatCard
          title="Low Stock Rows"
          iconPath="/stock"
          value={summary.stock.low_stock_rows}
          subtitle="Below configured minimum"
          tone={summary.stock.low_stock_rows > 0 ? 'danger' : 'good'}
        />
        <StatCard
          title="Unresolved Alerts"
          iconPath="/alerts"
          value={summary.alerts.unresolved_alerts}
          subtitle="Still requiring attention"
          tone={summary.alerts.unresolved_alerts > 0 ? 'danger' : 'good'}
        />
        <StatCard
          title="Critical Alerts"
          iconPath="/alerts"
          value={summary.alerts.critical_unresolved_alerts}
          subtitle="Highest priority"
          tone={summary.alerts.critical_unresolved_alerts > 0 ? 'danger' : 'good'}
        />
      </div>

      <div className="app-grid-stats" style={styles.kpiGrid}>
        <div className="app-panel app-panel--padded" style={styles.healthCard}>
          <div style={styles.healthHeader}>
            <div style={styles.healthHeaderLead}>
              <DashboardIconBadge path="/insights" size={19} />
              <div style={styles.healthHeaderText}>
                <div style={styles.healthTitle}>Operational Health</div>
                <div style={styles.healthSubtitle}>
                  Tenant-level health based on alerts, overdue shipments, low stock, and discrepancy pressure.
                </div>
              </div>
            </div>

            {health ? (
              <span style={healthBadgeStyle(health.health_tier)}>
                {healthTierLabel(health.health_tier)}
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
            <div style={styles.healthBody}>
              <div style={styles.healthScoreBlock}>
                <div style={styles.healthScore}>
                  <span>{toNumber(health.health_score)}</span>
                  <span style={styles.healthScoreScale}> / 100</span>
                </div>
                <div style={styles.healthProgressTrack} aria-hidden="true">
                  <div
                    style={{
                      ...styles.healthProgressValue,
                      width: `${Math.min(100, Math.max(0, toNumber(health.health_score)))}%`
                    }}
                  />
                </div>
              </div>

              <div style={styles.healthMetricsGrid}>
                <div style={styles.healthMetric}>
                  <DashboardIconBadge path="/stock" tone="danger" size={18} />
                  <div style={styles.healthMetricText}>
                    <div style={styles.healthMetricLabel}>Low Stock Rate</div>
                    <div style={styles.healthMetricValue}>
                      {toNumber(health.metrics.low_stock_rate_pct)}%
                    </div>
                  </div>
                </div>

                <div style={styles.healthMetric}>
                  <DashboardIconBadge path="/stock-movements" tone="warn" size={18} />
                  <div style={styles.healthMetricText}>
                    <div style={styles.healthMetricLabel}>Discrepancy Rate</div>
                    <div style={styles.healthMetricValue}>
                      {toNumber(health.metrics.discrepancy_rate_pct)}%
                    </div>
                  </div>
                </div>

                <div style={styles.healthMetric}>
                  <DashboardIconBadge path="/shipments" tone="warn" size={18} />
                  <div style={styles.healthMetricText}>
                    <div style={styles.healthMetricLabel}>Overdue Shipments</div>
                    <div style={styles.healthMetricValue}>
                      {health.metrics.overdue_shipments}
                    </div>
                  </div>
                </div>

                <div style={styles.healthMetric}>
                  <DashboardIconBadge path="/alerts" tone="danger" size={18} />
                  <div style={styles.healthMetricText}>
                    <div style={styles.healthMetricLabel}>Unresolved Alerts</div>
                    <div style={styles.healthMetricValue}>
                      {health.metrics.unresolved_alerts}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.twoColumnGrid}>
        <Section
          title="Depletion Risk"
          iconPath="/insights"
          iconTone="warn"
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
          iconPath="/insights"
          iconTone="default"
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

      <div style={styles.threeColumnGrid}>
        <Section
          title="Low Stock"
          iconPath="/stock"
          iconTone="danger"
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
          iconPath="/shipments"
          iconTone="warn"
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
                        <td style={styles.td}>
                          <div style={styles.rowTitle}>{row.po_number || '-'}</div>
                          {canViewShipments ? (
                            <ActionLink
                              to={`/shipments?shipmentId=${encodeURIComponent(row.id)}`}
                              label="Open Shipment"
                              iconPath="/shipments"
                            />
                          ) : null}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.rowTitle}>{row.supplier_name}</div>
                          {canViewSuppliers ? (
                            <ActionLink
                              to={`/suppliers?search=${encodeURIComponent(row.supplier_name)}`}
                              label="Open Supplier"
                              iconPath="/suppliers"
                            />
                          ) : null}
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

        <Section
          title="Unresolved Alerts"
          iconPath="/alerts"
          iconTone="danger"
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
                    {canViewAlerts ? (
                      <ActionLink
                        to={`/alerts?search=${encodeURIComponent(alert.product_name || alert.type)}`}
                        label="Open in Alerts"
                        iconPath="/alerts"
                      />
                    ) : null}

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
      </div>

      <div style={styles.threeColumnGrid}>
        <Section
          title="Inventory Anomalies"
          iconPath="/insights"
          iconTone="good"
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

        <Section
          title="Recent Activity"
          iconPath="/stock-movements"
          iconTone="default"
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
                          <td style={styles.td}>{formatActivityReason(row.reason)}</td>
                          <td style={styles.td}>
                            {row.user_name || (row.user_id ? 'User name unavailable' : 'System')}
                          </td>
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
          iconPath="/suppliers"
          iconTone="default"
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
                          {canViewSuppliers ? (
                            <ActionLink
                              to={`/suppliers?search=${encodeURIComponent(row.supplier_name)}`}
                              label="Open Supplier"
                              iconPath="/suppliers"
                            />
                          ) : null}
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
    minWidth: 0,
    color: '#0f172a'
  },
  header: {
    marginBottom: '18px',
    minWidth: 0
  },
  headerTextBlock: {
    minWidth: 0
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
    letterSpacing: '-0.02em'
  },
  description: {
    marginTop: '6px',
    color: '#64748b',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  kpiGrid: {
    marginBottom: '14px',
    width: '100%',
    minWidth: 0,
    gridTemplateColumns: 'repeat(auto-fit, minmax(205px, 1fr))',
    gap: '12px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '14px 16px',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.025), 0 8px 22px rgba(15, 23, 42, 0.035)',
    minWidth: 0,
    minHeight: '82px'
  },
  statContent: {
    minWidth: 0,
    flex: 1
  },
  statTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#64748b',
    marginBottom: '2px'
  },
  statValue: {
    fontSize: '26px',
    fontWeight: 800,
    marginBottom: '1px',
    lineHeight: 1.05,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  statValueGood: {
    fontSize: '26px',
    fontWeight: 800,
    marginBottom: '1px',
    color: '#15803d',
    lineHeight: 1.05,
    wordBreak: 'break-word'
  },
  statValueWarn: {
    fontSize: '26px',
    fontWeight: 800,
    marginBottom: '1px',
    color: '#c2410c',
    lineHeight: 1.05,
    wordBreak: 'break-word'
  },
  statValueDanger: {
    fontSize: '26px',
    fontWeight: 800,
    marginBottom: '1px',
    color: '#dc2626',
    lineHeight: 1.05,
    wordBreak: 'break-word'
  },
  statSubtitle: {
    fontSize: '11px',
    color: '#64748b',
    lineHeight: 1.35
  },
  iconBadge: {
    width: '38px',
    height: '38px',
    borderRadius: '11px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto'
  },
  healthCard: {
    minWidth: 0,
    borderRadius: '12px',
    borderColor: '#dbe3ef',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.025), 0 10px 28px rgba(15, 23, 42, 0.04)'
  },
  healthHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    alignItems: 'flex-start',
    marginBottom: '14px',
    flexWrap: 'wrap'
  },
  healthHeaderLead: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-start',
    minWidth: 0,
    flex: 1
  },
  healthHeaderText: {
    minWidth: 0
  },
  healthTitle: {
    fontSize: '17px',
    fontWeight: 800,
    marginBottom: '3px',
    color: '#0f172a'
  },
  healthSubtitle: {
    fontSize: '12px',
    color: '#64748b',
    lineHeight: 1.45,
    maxWidth: '760px',
    wordBreak: 'break-word'
  },
  healthBody: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
    gap: '16px',
    alignItems: 'stretch',
    minWidth: 0
  },
  healthScoreBlock: {
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '4px 4px 2px'
  },
  healthScore: {
    fontSize: '46px',
    fontWeight: 850,
    lineHeight: 1,
    marginBottom: '10px',
    color: '#2563eb',
    letterSpacing: '-0.035em'
  },
  healthScoreScale: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: 0
  },
  healthProgressTrack: {
    width: '100%',
    maxWidth: '360px',
    height: '7px',
    borderRadius: '999px',
    overflow: 'hidden',
    background: '#e2e8f0'
  },
  healthProgressValue: {
    height: '100%',
    borderRadius: '999px',
    background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)'
  },
  healthMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '10px',
    minWidth: 0
  },
  healthMetric: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    border: '1px solid #e2e8f0',
    borderRadius: '11px',
    padding: '11px 12px',
    background: '#fbfdff',
    minWidth: 0
  },
  healthMetricText: {
    minWidth: 0
  },
  healthMetricLabel: {
    fontSize: '11px',
    color: '#64748b',
    marginBottom: '2px',
    fontWeight: 700
  },
  healthMetricValue: {
    fontSize: '19px',
    fontWeight: 800,
    color: '#0f172a'
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(420px, 100%), 1fr))',
    alignItems: 'start',
    gap: '14px',
    marginBottom: '14px',
    width: '100%',
    minWidth: 0
  },
  threeColumnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(350px, 100%), 1fr))',
    alignItems: 'start',
    gap: '14px',
    marginBottom: '14px',
    width: '100%',
    minWidth: 0
  },
  panel: {
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: '12px',
    borderColor: '#e2e8f0',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.025), 0 8px 22px rgba(15, 23, 42, 0.03)'
  },
  sectionHeader: {
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  sectionHeaderLead: {
    display: 'flex',
    gap: '9px',
    alignItems: 'flex-start',
    minWidth: 0,
    flex: 1
  },
  sectionHeaderText: {
    minWidth: 0
  },
  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  sectionSubtitle: {
    margin: '3px 0 0 0',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.4,
    wordBreak: 'break-word'
  },
  sectionHint: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#475569',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '999px',
    padding: '5px 9px',
    whiteSpace: 'nowrap'
  },
  list: {
    display: 'grid',
    gap: '10px',
    minWidth: 0
  },
  listCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '11px 12px',
    background: '#fbfdff',
    minWidth: 0
  },
  listCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    alignItems: 'flex-start',
    marginBottom: '8px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  listCardHeaderText: {
    minWidth: 0
  },
  listCardTitle: {
    fontSize: '14px',
    fontWeight: 800,
    marginBottom: '2px',
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  listCardMeta: {
    fontSize: '10px',
    color: '#64748b',
    lineHeight: 1.35,
    wordBreak: 'break-word'
  },
  cardText: {
    color: '#334155',
    fontSize: '12px',
    lineHeight: 1.5,
    marginBottom: '9px',
    wordBreak: 'break-word'
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '10px',
    fontSize: '12px',
    padding: '5px 0',
    borderTop: '1px solid #eef2f7'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    overflow: 'hidden',
    overflowX: 'auto',
    minWidth: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '430px'
  },
  th: {
    textAlign: 'left',
    padding: '10px 11px',
    background: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '11px',
    fontWeight: 800,
    color: '#475569'
  },
  td: {
    padding: '10px 11px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '12px',
    verticalAlign: 'top',
    color: '#334155',
    wordBreak: 'break-word'
  },
  emptyCell: {
    padding: '20px',
    textAlign: 'center',
    color: '#64748b'
  },
  badgeBase: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '999px',
    fontWeight: 800,
    fontSize: '10px',
    whiteSpace: 'nowrap'
  },
  rowTitle: {
    fontWeight: 800,
    marginBottom: '4px',
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  rowSubtle: {
    fontSize: '10px',
    color: '#64748b',
    lineHeight: 1.35,
    wordBreak: 'break-word'
  },
  emptyStateNeutral: {
    minWidth: 0
  },
  emptyStateGood: {
    minWidth: 0
  },
  emptyStateTitle: {
    fontWeight: 800,
    marginBottom: '5px',
    fontSize: '13px'
  },
  emptyStateMessage: {
    lineHeight: 1.45,
    fontSize: '12px'
  },
  emptyStateMeta: {
    marginTop: '7px',
    fontSize: '10px',
    opacity: 0.85
  },
  errorInline: {
    margin: 0
  },
  quickActionRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))',
    gap: '8px',
    marginBottom: '14px',
    width: '100%',
    minWidth: 0
  },
  actionLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '8px 10px',
    background: '#ffffff',
    color: '#1d4ed8',
    fontWeight: 800,
    textDecoration: 'none',
    fontSize: '11px',
    minWidth: 0,
    textAlign: 'center',
    boxShadow: '0 1px 1px rgba(15, 23, 42, 0.02)'
  }
};
