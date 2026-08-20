import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type SupportControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type SupportTenantRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  evidence: Record<string, string | number | boolean | null>;
  controls: SupportControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type SupportPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  support_operation_controls: SupportControl[];
  tenants: SupportTenantRow[];
  validation_note: string;
};

type Tenant = { id: string; name: string };

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('no_tenants') || value === 'loading') {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (value.includes('review') || value.includes('required')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (value.includes('blocked') || value.includes('blocking') || value.includes('missing')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' && value.includes('T')) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }
  return String(value);
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export default function PlatformSupportOperationsCockpitPage() {
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-support-operations-cockpit'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);

  const cockpit = useQuery({
    queryKey: ['platform', 'support-operations-cockpit', tenantId],
    queryFn: () => platformApiRequest<SupportPackage>(`/platform/support-operations-cockpit?${query.toString()}`),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = cockpit.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const selectedTenantName = useMemo(
    () => (tenants.data || []).find((tenant) => tenant.id === tenantId)?.name,
    [tenantId, tenants.data]
  );

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Support Operations Cockpit</h1>
          <p style={styles.description}>
            Step 211 joins tenant contacts, active SLA policy, support tasks, handover notes, external customer
            communications, incidents, and active or pending support-access evidence into one read-only support precheck.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>
            {data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}
          </span>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.filterGrid}>
          <div>
            <label style={styles.label} htmlFor="support-cockpit-tenant-filter">Tenant filter</label>
            <select
              id="support-cockpit-tenant-filter"
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              style={styles.select}
              disabled={tenants.isLoading}
            >
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => cockpit.refetch()}
            disabled={cockpit.isFetching}
          >
            {cockpit.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {selectedTenantName
          ? <span style={styles.help}>Showing support operations evidence for {selectedTenantName}.</span>
          : <span style={styles.help}>Showing support operations evidence for all tenants.</span>}
        {tenants.error ? (
          <div style={styles.inlineWarning}>Tenant filter options could not be loaded: {readableError(tenants.error)}</div>
        ) : null}
      </section>

      {cockpit.isLoading ? <div style={styles.card}>Loading support operations cockpit...</div> : null}
      {cockpit.error ? (
        <div style={styles.error}>
          Unable to load support operations cockpit: {readableError(cockpit.error)}{' '}
          <button
            type="button"
            style={styles.inlineButton}
            onClick={() => cockpit.refetch()}
            disabled={cockpit.isFetching}
          >
            {cockpit.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div><strong>Generated</strong><br /><span style={styles.help}>{new Date(data.generated_at).toLocaleString()}</span></div>
            <div style={styles.note}>{data.validation_note}</div>
          </section>

          <section style={styles.notice}>
            <strong>Operator precheck only.</strong> A green row means the implemented support evidence is present; it does not
            certify commercial launch or prove that every customer-facing support decision has been manually accepted.
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
            <h2 style={styles.sectionTitle}>Support operation controls</h2>
            <div style={styles.controlGrid}>
              {data.support_operation_controls.map((control) => (
                <article key={control.code} style={styles.controlCard}>
                  <h3 style={styles.controlTitle}>{control.label}</h3>
                  <p style={styles.muted}>{control.launch_reason}</p>
                  <code style={styles.code}>{control.evidence_key}</code>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Tenant support readiness</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Tenant</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Contacts</th>
                    <th style={styles.th}>SLA</th>
                    <th style={styles.th}>Tasks</th>
                    <th style={styles.th}>Customer context</th>
                    <th style={styles.th}>Incidents / access</th>
                    <th style={styles.th}>Next step</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((tenant) => (
                    <tr key={tenant.tenant_id}>
                      <td style={styles.td}>
                        <strong>{tenant.tenant_name}</strong><br />
                        <span style={styles.help}>{tenant.tenant_id}</span>
                        <div style={styles.actionRowCompact}>
                          <Link style={styles.linkButton} to={`/platform/tenant-contacts?tenant_id=${tenant.tenant_id}`}>Contacts</Link>
                          <Link style={styles.linkButton} to={`/platform/tenant-sla?tenant_id=${tenant.tenant_id}`}>SLA</Link>
                          <Link style={styles.linkButton} to={`/platform/tenant-tasks?tenant_id=${tenant.tenant_id}&category=support`}>Tasks</Link>
                          <Link style={styles.linkButton} to={`/platform/incidents?tenant_id=${tenant.tenant_id}`}>Incidents</Link>
                          <Link style={styles.linkButton} to="/platform/support-sessions">Sessions</Link>
                        </div>
                      </td>
                      <td style={styles.td}><span style={badgeStyle(tenant.status)}>{humanize(tenant.status)}</span></td>
                      <td style={styles.td}>
                        Primary: {formatValue(tenant.evidence.primary_contacts)}<br />
                        Escalation: {formatValue(tenant.evidence.escalation_contacts)}
                      </td>
                      <td style={styles.td}>
                        Active policy: {formatValue(tenant.evidence.active_sla_policy_present)}<br />
                        Response: {formatValue(tenant.evidence.response_target_minutes)} min<br />
                        Resolution: {formatValue(tenant.evidence.incident_resolution_target_hours)} h
                      </td>
                      <td style={styles.td}>
                        Open: {formatValue(tenant.evidence.open_support_tasks)}<br />
                        Overdue: {formatValue(tenant.evidence.overdue_support_tasks)}<br />
                        Urgent: {formatValue(tenant.evidence.urgent_support_tasks)}
                      </td>
                      <td style={styles.td}>
                        Last external touch: {formatValue(tenant.evidence.last_customer_touch_at)}<br />
                        Unresolved follow-ups: {formatValue(tenant.evidence.unresolved_follow_ups)}<br />
                        Handover notes: {formatValue(tenant.evidence.support_handover_notes)}
                      </td>
                      <td style={styles.td}>
                        Open incidents: {formatValue(tenant.evidence.open_incidents)}<br />
                        Active sessions: {formatValue(tenant.evidence.active_support_sessions)}<br />
                        Pending approvals: {formatValue(tenant.evidence.pending_support_approvals)}
                      </td>
                      <td style={styles.td}>{tenant.next_best_step}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!cockpit.isLoading && data.tenants.length === 0
                ? <div style={styles.emptyState}>No tenants found for this support operations cockpit.</div>
                : null}
            </div>
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
  description: { margin: 0, color: '#475569', maxWidth: '880px', lineHeight: 1.5, overflowWrap: 'anywhere' },
  headerMeta: { display: 'grid', gap: '8px', justifyItems: 'end' },
  generated: { color: '#64748b', fontSize: '13px' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metaCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px', boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', minWidth: 0 },
  notice: { background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '14px', color: '#334155', lineHeight: 1.5 },
  note: { color: '#334155', lineHeight: 1.5, overflowWrap: 'anywhere' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'end' },
  label: { display: 'block', fontWeight: 700, marginBottom: '8px', color: '#334155' },
  select: { width: '100%', maxWidth: '420px', minWidth: 0, padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1' },
  help: { color: '#64748b', fontSize: '12px', overflowWrap: 'anywhere' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: '9px', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  inlineButton: { marginLeft: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: '8px', padding: '6px 10px', fontWeight: 700, cursor: 'pointer' },
  error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px', overflowWrap: 'anywhere' },
  inlineWarning: { marginTop: '10px', color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px', overflowWrap: 'anywhere' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px', boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: '30px', lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', fontSize: '13px', textTransform: 'capitalize', overflowWrap: 'anywhere' },
  sectionTitle: { margin: '0 0 14px', fontSize: '20px', letterSpacing: '-.015em', color: '#0f172a' },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' },
  controlCard: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#f8fafc', minWidth: 0 },
  controlTitle: { margin: '0 0 8px', fontSize: '16px', color: '#0f172a' },
  muted: { color: '#64748b', margin: 0, lineHeight: 1.5, overflowWrap: 'anywhere' },
  emptyState: { padding: '16px', color: '#64748b' },
  code: { display: 'inline-block', marginTop: '10px', background: '#e2e8f0', padding: '4px 8px', borderRadius: '8px', fontSize: '12px', maxWidth: '100%', overflowWrap: 'anywhere' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '1180px' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '10px', color: '#334155', fontSize: '13px' },
  td: { borderBottom: '1px solid #f1f5f9', padding: '10px', verticalAlign: 'top', color: '#334155', fontSize: '13px', lineHeight: 1.45, overflowWrap: 'anywhere' },
  actionRowCompact: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  linkButton: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: '8px', padding: '4px 8px', fontWeight: 800, color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: '12px' },
  badge: { borderRadius: '999px', padding: '5px 10px', fontWeight: 700, fontSize: '12px', textTransform: 'capitalize', display: 'inline-block' }
};
