import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type MonitoringControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type MonitoringTenantRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  status: string;
  evidence: Record<string, number>;
  controls: MonitoringControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type MonitoringPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  platform_evidence: Record<string, number>;
  monitoring_controls: MonitoringControl[];
  tenants: MonitoringTenantRow[];
  validation_note: string;
};

type Tenant = { id: string; name: string };

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('missing') || value.includes('required')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('review') || value.includes('loading')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: number | string | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

function tenantIncidentLink(tenantId: string) {
  const params = new URLSearchParams({ scope: 'tenant', tenant_id: tenantId, include_resolved: 'false' });
  return `/platform/incidents?${params.toString()}`;
}

export default function PlatformProductionMonitoringReadinessPage() {
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-production-monitoring-readiness'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);

  const monitoring = useQuery({
    queryKey: ['platform', 'production-monitoring-readiness', tenantId],
    queryFn: () => {
      const queryString = query.toString();
      return platformApiRequest<MonitoringPackage>(`/platform/production-monitoring-readiness${queryString ? `?${queryString}` : ''}`);
    }
  });

  const data = monitoring.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const platformEvidence = useMemo(() => Object.entries(data?.platform_evidence || {}), [data?.platform_evidence]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Production Monitoring Readiness</h1>
          <p style={styles.description}>
            Step 212 joins tenant system-health signals, platform incidents, service dependencies, and integration
            monitoring evidence into one read-only launch monitoring board.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => { void tenants.refetch(); void monitoring.refetch(); }}
            disabled={tenants.isFetching || monitoring.isFetching}
          >
            {tenants.isFetching || monitoring.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <label style={styles.label} htmlFor="tenant-filter">Tenant filter</label>
        <select id="tenant-filter" value={tenantId} onChange={(event) => setTenantId(event.target.value)} style={styles.select}>
          <option value="">All tenants</option>
          {(tenants.data || []).map((tenant) => (
            <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
          ))}
        </select>
      </section>

      {monitoring.isLoading ? <div style={styles.card}>Loading production monitoring readiness...</div> : null}
      {monitoring.error ? (
        <div style={styles.error}>
          Failed to load production monitoring readiness.
          <button type="button" style={styles.errorButton} onClick={() => void monitoring.refetch()}>Retry</button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Snapshot metadata</h2>
            <div style={styles.metadataGrid}>
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{data.generated_at ? new Date(data.generated_at).toLocaleString() : '-'}</span></div>
              <div><strong>Validation</strong><span>{data.validation_note}</span></div>
            </div>
          </section>

          <section style={styles.grid}>
            {summary.map(([key, value]) => (
              <div key={key} style={styles.metric}>
                <div style={styles.metricValue}>{value}</div>
                <div style={styles.metricLabel}>{humanize(key)}</div>
              </div>
            ))}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Platform evidence</h2>
            <div style={styles.platformGrid}>
              {platformEvidence.map(([key, value]) => (
                <div key={key} style={styles.platformItem}>
                  <strong>{formatValue(value)}</strong>
                  <span>{humanize(key)}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Monitoring controls</h2>
            <div style={styles.controlGrid}>
              {data.monitoring_controls.map((control) => (
                <article key={control.code} style={styles.controlCard}>
                  <h3 style={styles.controlTitle}>{control.label}</h3>
                  <p style={styles.muted}>{control.launch_reason}</p>
                  <code style={styles.code}>{control.evidence_key}</code>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Tenant monitoring readiness</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Tenant</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>System health</th>
                    <th style={styles.th}>Incidents</th>
                    <th style={styles.th}>Dependencies / integrations</th>
                    <th style={styles.th}>Next step</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((tenant) => (
                    <tr key={tenant.tenant_id}>
                      <td style={styles.td}>
                        <strong>{tenant.tenant_name}</strong><br />
                        <span style={styles.muted}>{tenant.tenant_status}</span>
                        <div style={styles.quickLinks}>
                          <Link style={styles.quickLink} to={`/platform/system-health?tenant_id=${tenant.tenant_id}`}>System health</Link>
                          <Link style={styles.quickLink} to={tenantIncidentLink(tenant.tenant_id)}>Incidents</Link>
                          <Link style={styles.quickLink} to="/platform/service-dependencies?only_attention=true">Dependencies</Link>
                          <Link style={styles.quickLink} to="/platform/integration-monitoring">Integrations</Link>
                        </div>
                      </td>
                      <td style={styles.td}><span style={badgeStyle(tenant.status)}>{humanize(tenant.status)}</span></td>
                      <td style={styles.td}>
                        Issues: {formatValue(tenant.evidence.system_health_issues)}<br />
                        Blocking alerts: {formatValue(tenant.evidence.blocking_alerts)}<br />
                        Negative stock: {formatValue(tenant.evidence.negative_stock_rows)}<br />
                        Incomplete finalized shipments: {formatValue(tenant.evidence.incomplete_finalized_shipments)}
                      </td>
                      <td style={styles.td}>
                        Open: {formatValue(tenant.evidence.open_incidents)}<br />
                        Public updates: {formatValue(tenant.evidence.incidents_with_public_updates)}
                      </td>
                      <td style={styles.td}>
                        Unhealthy dependencies: {formatValue(tenant.evidence.unhealthy_dependencies)}<br />
                        Integration failures: {formatValue(tenant.evidence.integration_failures)}
                      </td>
                      <td style={styles.td}>{tenant.next_best_step}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Validation note</h2>
            <p style={styles.muted}>{data.validation_note}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { padding: '24px', display: 'grid', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' },
  eyebrow: { margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' },
  title: { margin: '4px 0', fontSize: '30px', color: '#0f172a' },
  description: { margin: 0, color: '#475569', maxWidth: '880px', lineHeight: 1.5 },
  headerMeta: { display: 'grid', gap: '8px', justifyItems: 'end' },
  generated: { color: '#64748b', fontSize: '13px' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)' },
  label: { display: 'block', fontWeight: 700, marginBottom: '8px', color: '#334155' },
  select: { minWidth: '280px', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' },
  error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' },
  metricValue: { fontSize: '26px', fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', fontSize: '13px', textTransform: 'capitalize' },
  sectionTitle: { margin: '0 0 14px', fontSize: '20px', color: '#0f172a' },
  platformGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  platformItem: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'grid', gap: '4px', color: '#475569' },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' },
  controlCard: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#f8fafc' },
  controlTitle: { margin: '0 0 8px', fontSize: '16px', color: '#0f172a' },
  muted: { color: '#64748b', margin: 0, lineHeight: 1.5, fontSize: '13px' },
  code: { display: 'inline-block', marginTop: '10px', background: '#e2e8f0', padding: '4px 8px', borderRadius: '8px', fontSize: '12px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '10px', color: '#334155', fontSize: '13px' },
  td: { borderBottom: '1px solid #f1f5f9', padding: '10px', verticalAlign: 'top', color: '#334155', fontSize: '13px', lineHeight: 1.45 },
  badge: { borderRadius: '999px', padding: '5px 10px', fontWeight: 700, fontSize: '12px', textTransform: 'capitalize', display: 'inline-block' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: '10px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  errorButton: { marginLeft: '12px', border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', borderRadius: '8px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  quickLink: { border: '1px solid #cbd5e1', borderRadius: '999px', padding: '4px 8px', color: '#0f766e', textDecoration: 'none', fontSize: '12px', fontWeight: 700 }
};
