import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

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
  };
  monitoring_controls: {
    read_only: boolean;
    mutation_owners: string[];
    source_routes: string[];
    no_secret_export: boolean;
    no_secret_hash_export: boolean;
    secret_material_fields_blocked: string[];
    required_controls: string[];
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
  const monitoringQuery = useQuery({
    queryKey: ['platform', 'integration-monitoring'],
    queryFn: () => platformApiRequest<IntegrationMonitoringSurface>('/platform/integration-monitoring/surface')
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
        </section>
      ) : null}

      {data ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Monitoring controls</h2>
          <p style={styles.subtitle}>Read-only: {String(data.monitoring_controls.read_only)} · No secret export: {String(data.monitoring_controls.no_secret_export)} · No secret hash export: {String(data.monitoring_controls.no_secret_hash_export)}</p>
          <p style={styles.subtitle}>Mutation owners: {data.monitoring_controls.mutation_owners.join(', ')}</p>
          <div style={styles.flags}>{data.monitoring_controls.required_controls.map((control) => <span key={control} style={styles.flag}>{control}</span>)}</div>
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
  metric: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  cardTitle: { margin: '0 0 10px', fontSize: 18 },
  flags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  flag: { background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  help: { color: '#6b7280', fontSize: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px 8px', color: '#374151', fontSize: 13 },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 8px', verticalAlign: 'top' }
};
