import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type RiskItem = {
  type: string;
  id: string;
  tenant_name?: string | null;
  name: string;
  risk_flags: string[];
  health_state: string;
};

type WebhookItem = RiskItem & {
  event_types: string[];
  is_enabled: boolean;
  last_delivery_status?: string | null;
  consecutive_failure_count: number;
};

type DependencyItem = RiskItem & {
  category: string;
  status: string;
  business_impact: string;
  vendor_name?: string | null;
  owner_email?: string | null;
  days_since_last_checked?: number | null;
};

type ApiClientItem = RiskItem & {
  key_prefix: string;
  scopes: string[];
  allowed_ip_count: number;
  days_since_last_used?: number | null;
};

type IntegrationNotificationScanResponse = {
  scanned_at: string;
  posture: string;
  integrations_checked: number;
  risks_found: number;
  notifications_touched: number;
  created: number;
  refreshed: number;
  auto_resolved?: number;
  sla_escalated?: number;
  critical_sla_escalated?: number;
  warning_sla_promoted_to_critical?: number;
  sla_escalation_audit_events?: number;
  routing_escalated?: number;
  routing_escalation_audit_events?: number;
};

type IntegrationMonitoringSurface = {
  feature: string;
  phase: number;
  step: number;
  posture: string;
  summary: {
    total_integrations: number;
    webhooks: number;
    service_dependencies: number;
    api_clients: number;
    integrations_requiring_review: number;
    unhealthy_dependencies: number;
    critical_unhealthy_dependencies: number;
    webhooks_with_delivery_failures: number;
    stale_dependency_checks: number;
    stale_api_clients: number;
    tenants_with_monitored_integrations: number;
    active_integration_notifications?: number;
    integration_risks_without_active_notifications?: number;
    stale_active_integration_notifications?: number;
    routed_active_integration_notifications?: number;
    unrouted_active_integration_notifications?: number;
    critical_unrouted_active_integration_notifications?: number;
    critical_open_sla_breaches?: number;
    warning_open_sla_breaches?: number;
  };
  monitoring_controls: {
    read_only: boolean;
    mutation_owners: string[];
    source_routes: string[];
    no_secret_export: boolean;
    no_secret_hash_export: boolean;
    secret_material_fields_blocked: string[];
    required_controls: string[];
    critical_notification_ack_sla_hours?: number;
    warning_notification_ack_sla_hours?: number;
  };
  notification_coverage?: {
    active_risk_keys: number;
    active_integration_notifications: number;
    integration_risks_without_active_notifications: number;
    stale_active_integration_notifications: number;
    routed_active_integration_notifications?: number;
    unrouted_active_integration_notifications?: number;
    critical_unrouted_active_integration_notifications?: number;
    unnotified_risk_keys: string[];
    stale_notification_ids: string[];
    critical_open_sla_breaches?: number;
    warning_open_sla_breaches?: number;
    critical_open_sla_breach_ids?: string[];
    warning_open_sla_breach_ids?: string[];
    unrouted_notification_ids?: string[];
    critical_unrouted_notification_ids?: string[];
  };
  webhooks: WebhookItem[];
  service_dependencies: DependencyItem[];
  api_clients: ApiClientItem[];
};

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('review')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function FlagList({ flags }: { flags: string[] }) {
  if (!flags.length) return <span style={styles.help}>No flags</span>;
  return <div style={styles.flags}>{flags.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>)}</div>;
}

export default function PlatformIntegrationMonitoringPage() {
  const queryClient = useQueryClient();
  const canWriteNotifications = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_WRITE);

  const monitoringQuery = useQuery({
    queryKey: ['platform', 'integration-monitoring'],
    queryFn: () => platformApiRequest<IntegrationMonitoringSurface>('/platform/integration-monitoring/surface')
  });

  const runNotificationScan = useMutation({
    mutationFn: () => platformApiRequest<IntegrationNotificationScanResponse>('/platform/notifications/integration-monitoring-scan', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'integration-monitoring'] });
    }
  });

  const data = monitoringQuery.data;
  const summary = data?.summary;
  const evidence: RiskItem[] = [...(data?.webhooks || []), ...(data?.service_dependencies || []), ...(data?.api_clients || [])];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Integration monitoring</h1>
          <p style={styles.subtitle}>Commercial readiness posture for webhooks, service dependencies, API clients, and tenant integration health.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
      </header>

      {monitoringQuery.isLoading ? <section style={styles.card}>Loading integration monitoring…</section> : null}
      {monitoringQuery.error ? <section style={styles.card}>Unable to load integration monitoring.</section> : null}

      {summary ? (
        <section style={styles.summaryGrid}>
          <div style={styles.card}><strong>Total integrations</strong><div style={styles.metric}>{summary.total_integrations}</div></div>
          <div style={styles.card}><strong>Requiring review</strong><div style={styles.metric}>{summary.integrations_requiring_review}</div></div>
          <div style={styles.card}><strong>Webhook failures</strong><div style={styles.metric}>{summary.webhooks_with_delivery_failures}</div></div>
          <div style={styles.card}><strong>Critical unhealthy dependencies</strong><div style={styles.metric}>{summary.critical_unhealthy_dependencies}</div></div>
          <div style={styles.card}><strong>Stale dependency checks</strong><div style={styles.metric}>{summary.stale_dependency_checks}</div></div>
          <div style={styles.card}><strong>Stale API clients</strong><div style={styles.metric}>{summary.stale_api_clients}</div></div>
          <div style={styles.card}><strong>Monitored tenants</strong><div style={styles.metric}>{summary.tenants_with_monitored_integrations}</div></div>
          <div style={styles.card}><strong>Active risk notifications</strong><div style={styles.metric}>{summary.active_integration_notifications || 0}</div></div>
          <div style={styles.card}><strong>Unnotified risks</strong><div style={styles.metric}>{summary.integration_risks_without_active_notifications || 0}</div></div>
          <div style={styles.card}><strong>Stale active notifications</strong><div style={styles.metric}>{summary.stale_active_integration_notifications || 0}</div></div>
          <div style={styles.card}><strong>Routed notifications</strong><div style={styles.metric}>{summary.routed_active_integration_notifications || 0}</div></div>
          <div style={styles.card}><strong>Unrouted notifications</strong><div style={styles.metric}>{summary.unrouted_active_integration_notifications || 0}</div></div>
          <div style={styles.card}><strong>Critical unrouted notifications</strong><div style={styles.metric}>{summary.critical_unrouted_active_integration_notifications || 0}</div></div>
          <div style={styles.card}><strong>Critical SLA breaches</strong><div style={styles.metric}>{summary.critical_open_sla_breaches || 0}</div></div>
          <div style={styles.card}><strong>Warning SLA breaches</strong><div style={styles.metric}>{summary.warning_open_sla_breaches || 0}</div></div>
        </section>
      ) : null}

      {data ? (
        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <div>
              <h2 style={styles.cardTitle}>Monitoring controls</h2>
              <p style={styles.subtitle}>Read-only surface: {String(data.monitoring_controls.read_only)} · No secret export: {String(data.monitoring_controls.no_secret_export)} · No secret hash export: {String(data.monitoring_controls.no_secret_hash_export)}</p>
              <p style={styles.subtitle}>Mutation owners: {data.monitoring_controls.mutation_owners.join(', ')}</p>
              <p style={styles.subtitle}>Acknowledgement SLA: critical {data.monitoring_controls.critical_notification_ack_sla_hours || 4}h · warning {data.monitoring_controls.warning_notification_ack_sla_hours || 24}h</p>
              <p style={styles.subtitle}>Refresh-safe SLA: scans update notification evidence without resetting original creation time, so overdue open risks still breach SLA.</p>
              <p style={styles.subtitle}>SLA auto-escalation: overdue critical notifications are marked escalated; overdue warning notifications are promoted to critical for commercial operations review.</p>
              <p style={styles.subtitle}>Escalation audit: every auto-escalated notification writes durable platform audit evidence with the risk key and SLA reason.</p>
              <p style={styles.subtitle}>Routing evidence: scan-created notifications include tenant routing or dependency owner/escalation metadata so operational alerts are actionable.</p>
              <p style={styles.subtitle}>Routing escalation: critical unrouted integration notifications are marked for assignment and written to the platform audit trail.</p>
            </div>
            <button
              type="button"
              style={canWriteNotifications ? styles.primaryButton : styles.disabledButton}
              disabled={!canWriteNotifications || runNotificationScan.isPending}
              onClick={() => runNotificationScan.mutate()}
            >
              {runNotificationScan.isPending ? 'Creating notifications…' : 'Create monitoring notifications'}
            </button>
          </div>
          <div style={styles.flags}>{data.monitoring_controls.required_controls.map((control) => <span key={control} style={styles.flag}>{control}</span>)}</div>
          {data.notification_coverage ? (
            <div style={styles.coverageBox}>
              <strong>Notification coverage:</strong> {data.notification_coverage.active_integration_notifications} active notifications for {data.notification_coverage.active_risk_keys} active risks · {data.notification_coverage.integration_risks_without_active_notifications} unnotified risks · {data.notification_coverage.stale_active_integration_notifications} stale active notifications.
              {data.notification_coverage.integration_risks_without_active_notifications > 0 ? <div style={styles.warningText}>Run the scan or confirm the scheduled worker is running so every active integration risk has an operational notification.</div> : null}
              {(data.notification_coverage.unrouted_active_integration_notifications || 0) > 0 ? <div style={styles.warningText}>{data.notification_coverage.unrouted_active_integration_notifications} active integration notification(s) are missing tenant or owner/escalation routing evidence.</div> : null}
              {(data.notification_coverage.critical_unrouted_active_integration_notifications || 0) > 0 ? <div style={styles.errorText}>{data.notification_coverage.critical_unrouted_active_integration_notifications} critical integration notification(s) are unrouted and will be routing-escalated by the scan until assigned.</div> : null}
              {(data.notification_coverage.critical_open_sla_breaches || 0) > 0 ? <div style={styles.errorText}>{data.notification_coverage.critical_open_sla_breaches} critical integration notification(s) breached acknowledgement SLA.</div> : null}
              {(data.notification_coverage.warning_open_sla_breaches || 0) > 0 ? <div style={styles.warningText}>{data.notification_coverage.warning_open_sla_breaches} warning integration notification(s) breached acknowledgement SLA.</div> : null}
            </div>
          ) : null}
          {!canWriteNotifications ? <p style={styles.help}>You need platform notification write permission to create operational notifications from this monitoring scan.</p> : null}
          {runNotificationScan.data ? (
            <p style={styles.success}>Scan complete: {runNotificationScan.data.risks_found} risks found, {runNotificationScan.data.notifications_touched} notifications touched ({runNotificationScan.data.created} created, {runNotificationScan.data.refreshed} refresh-safe updates, {runNotificationScan.data.auto_resolved || 0} auto-resolved, {runNotificationScan.data.sla_escalated || 0} SLA escalated, {runNotificationScan.data.sla_escalation_audit_events || 0} SLA audit events, {runNotificationScan.data.routing_escalated || 0} routing escalated, {runNotificationScan.data.routing_escalation_audit_events || 0} routing audit events).</p>
          ) : null}
          {runNotificationScan.error ? <p style={styles.error}>Unable to create monitoring notifications.</p> : null}
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Integration evidence</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Integration</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>Health</th>
                <th style={styles.th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <tr key={`${item.type}:${item.id}`}>
                  <td style={styles.td}><strong>{item.name}</strong></td>
                  <td style={styles.td}>{item.type}</td>
                  <td style={styles.td}>{item.tenant_name || 'Platform-wide'}</td>
                  <td style={styles.td}><span style={badgeStyle(item.health_state)}>{item.health_state}</span></td>
                  <td style={styles.td}><FlagList flags={item.risk_flags} /></td>
                </tr>
              ))}
              {!evidence.length ? <tr><td style={styles.td} colSpan={5}>No integrations available for monitoring review.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  metric: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  cardTitle: { margin: '0 0 10px', fontSize: 18 },
  flags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  flag: { background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  help: { color: '#6b7280', fontSize: 12 },
  success: { color: '#166534', background: '#dcfce7', padding: '8px 10px', borderRadius: 10, margin: '12px 0 0' },
  error: { color: '#991b1b', background: '#fee2e2', padding: '8px 10px', borderRadius: 10, margin: '12px 0 0' },
  coverageBox: { marginTop: 12, padding: 12, borderRadius: 12, background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151' },
  warningText: { marginTop: 6, color: '#92400e', fontWeight: 700 },
  errorText: { marginTop: 6, color: '#991b1b', fontWeight: 800 },
  primaryButton: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#111827', color: '#fff', fontWeight: 800, cursor: 'pointer' },
  disabledButton: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#d1d5db', color: '#6b7280', fontWeight: 800, cursor: 'not-allowed' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px 8px', color: '#374151', fontSize: 13 },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 8px', verticalAlign: 'top' }
};
