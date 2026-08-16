import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
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
  platform_evidence: Record<string, number | string>;
  monitoring_controls: MonitoringControl[];
  tenants: MonitoringTenantRow[];
  validation_note: string;
};

type SystemHealthPackage = {
  tenants: Array<{ tenant_id: string; tenant_name: string }>;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('no_tenants') || value.includes('not_required') || value === 'loading') {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (value.includes('review') || value.includes('customer_status_update_required')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (value.includes('blocked') || value.includes('missing') || value.includes('not_launchable')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: number | string | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unknown error';
}

function tenantIncidentLink(tenantId: string) {
  const params = new URLSearchParams({ scope: 'tenant', tenant_id: tenantId, include_resolved: 'false' });
  return `/platform/incidents?${params.toString()}`;
}

export default function PlatformProductionMonitoringReadinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');

  const tenantOptions = useQuery({
    queryKey: ['platform', 'system-health', 'for-production-monitoring-readiness'],
    queryFn: () => platformApiRequest<SystemHealthPackage>('/platform/system-health'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);

  const monitoring = useQuery({
    queryKey: ['platform', 'production-monitoring-readiness', tenantId],
    queryFn: () => {
      const queryString = query.toString();
      return platformApiRequest<MonitoringPackage>(`/platform/production-monitoring-readiness${queryString ? `?${queryString}` : ''}`);
    },
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = monitoring.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const platformEvidence = useMemo(() => Object.entries(data?.platform_evidence || {}), [data?.platform_evidence]);

  function changeTenant(nextTenantId: string) {
    setTenantId(nextTenantId);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTenantId) nextParams.set('tenant_id', nextTenantId);
    else nextParams.delete('tenant_id');
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Production Monitoring Readiness</h1>
          <p style={styles.description}>
            Step 212 combines tenant system-health signals, incident communication coverage, service dependencies, and the
            canonical Integration Monitoring posture into one read-only technical monitoring precheck.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => { void tenantOptions.refetch(); void monitoring.refetch(); }}
            disabled={tenantOptions.isFetching || monitoring.isFetching}
          >
            {tenantOptions.isFetching || monitoring.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.notice}>
        <strong>Operator precheck only.</strong> A clear result means the currently implemented monitoring evidence is technically clear enough for the next review. It does not prove real-world uptime, alert delivery, public-status publication, or final production-monitoring sign-off.
      </section>

      <section style={styles.card}>
        <label style={styles.label} htmlFor="monitoring-readiness-tenant-filter">Tenant filter</label>
        <select
          id="monitoring-readiness-tenant-filter"
          value={tenantId}
          onChange={(event) => changeTenant(event.target.value)}
          style={styles.select}
          disabled={tenantOptions.isLoading}
        >
          <option value="">All tenants</option>
          {(tenantOptions.data?.tenants || []).map((tenant) => (
            <option key={tenant.tenant_id} value={tenant.tenant_id}>{tenant.tenant_name}</option>
          ))}
        </select>
        {tenantOptions.error ? (
          <p style={styles.inlineError}>Tenant filter options could not be loaded: {readableError(tenantOptions.error)}</p>
        ) : null}
      </section>

      {monitoring.isLoading ? <div style={styles.card}>Loading production monitoring readiness...</div> : null}
      {monitoring.error ? (
        <div style={styles.error}>
          <span>Unable to load production monitoring readiness: {readableError(monitoring.error)}</span>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void monitoring.refetch()}
            disabled={monitoring.isFetching}
          >
            {monitoring.isFetching ? 'Retrying...' : 'Retry'}
          </button>
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
                  <strong style={styles.breakAnywhere}>{formatValue(value)}</strong>
                  <span style={styles.breakAnywhere}>{humanize(key)}</span>
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
                  {data.tenants.length === 0 ? (
                    <tr>
                      <td style={styles.emptyRow} colSpan={6}>No tenants match the current monitoring-readiness filter.</td>
                    </tr>
                  ) : data.tenants.map((tenant) => (
                    <tr key={tenant.tenant_id}>
                      <td style={styles.td}>
                        <strong>{tenant.tenant_name}</strong><br />
                        <span style={styles.muted}>Lifecycle: {humanize(tenant.tenant_status)}</span><br />
                        <span style={styles.muted}>Launchable: {tenant.evidence.tenant_status_launchable ? 'yes' : 'no'}</span>
                        <div style={styles.quickLinks}>
                          <Link style={styles.quickLink} to="/platform/system-health">System health</Link>
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
                        Customer-impacting: {formatValue(tenant.evidence.customer_impacting_open_incidents)}<br />
                        With public updates: {formatValue(tenant.evidence.customer_impacting_incidents_with_public_updates)}<br />
                        Missing public updates: {formatValue(tenant.evidence.open_incidents_missing_public_updates)}
                      </td>
                      <td style={styles.td}>
                        Unhealthy dependencies: {formatValue(tenant.evidence.unhealthy_dependencies)}<br />
                        Critical unhealthy: {formatValue(tenant.evidence.critical_unhealthy_dependencies)}<br />
                        Integration blockers: {formatValue(tenant.evidence.integration_blockers)}<br />
                        Integration review required: {formatValue(tenant.evidence.integration_review_required)}<br />
                        Integrations requiring review: {formatValue(tenant.evidence.integrations_requiring_review)}
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
  page: { display: 'grid', gap: '20px', minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { margin: 0, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' },
  title: { margin: '4px 0', fontSize: '28px', lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#475569', maxWidth: '880px', lineHeight: 1.5 },
  headerMeta: { display: 'grid', gap: '8px', justifyItems: 'end' },
  generated: { color: '#64748b', fontSize: '13px' },
  notice: { background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px', color: '#334155', lineHeight: 1.5 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  label: { display: 'block', fontWeight: 700, marginBottom: '8px', color: '#334155' },
  select: { width: 'min(100%, 420px)', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' },
  inlineError: { color: '#991b1b', margin: '10px 0 0', fontSize: '13px' },
  error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: '30px', lineHeight: 1.1, fontWeight: 800, color: '#0f172a', overflowWrap: 'anywhere' },
  metricLabel: { color: '#64748b', fontSize: '13px', textTransform: 'capitalize', overflowWrap: 'anywhere' },
  sectionTitle: { margin: '0 0 14px', fontSize: '20px', letterSpacing: '-.015em', color: '#0f172a' },
  platformGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  platformItem: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', display: 'grid', gap: '4px', color: '#475569', minWidth: 0 },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' },
  controlCard: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#f8fafc', minWidth: 0 },
  controlTitle: { margin: '0 0 8px', fontSize: '16px', color: '#0f172a' },
  muted: { color: '#64748b', margin: 0, lineHeight: 1.5, fontSize: '13px', overflowWrap: 'anywhere' },
  code: { display: 'inline-block', marginTop: '10px', background: '#e2e8f0', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', maxWidth: '100%', overflowWrap: 'anywhere' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '1080px' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '10px', color: '#334155', fontSize: '13px' },
  td: { borderBottom: '1px solid #f1f5f9', padding: '10px', verticalAlign: 'top', color: '#334155', fontSize: '13px', lineHeight: 1.45, overflowWrap: 'anywhere' },
  emptyRow: { borderBottom: '1px solid #f1f5f9', padding: '18px', color: '#64748b', fontSize: '13px', textAlign: 'center' },
  badge: { borderRadius: '999px', padding: '5px 10px', fontWeight: 700, fontSize: '12px', textTransform: 'capitalize', display: 'inline-block', overflowWrap: 'anywhere' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: '9px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  errorButton: { border: '1px solid #fca5a5', background: '#fff', color: '#991b1b', borderRadius: '8px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  quickLink: { border: '1px solid #cbd5e1', borderRadius: '999px', padding: '4px 8px', color: '#1d4ed8', textDecoration: 'none', fontSize: '12px', fontWeight: 700 },
  breakAnywhere: { overflowWrap: 'anywhere' }
};
