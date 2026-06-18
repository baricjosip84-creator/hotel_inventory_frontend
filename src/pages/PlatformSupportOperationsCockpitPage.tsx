import { useMemo, useState } from 'react';
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
  if (value.includes('blocked') || value.includes('missing') || value.includes('incident') || value.includes('active_support')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('review') || value.includes('required')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' && value.includes('T')) return new Date(value).toLocaleString();
  return String(value);
}

export default function PlatformSupportOperationsCockpitPage() {
  const [tenantId, setTenantId] = useState('');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-support-operations-cockpit'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);

  const cockpit = useQuery({
    queryKey: ['platform', 'support-operations-cockpit', tenantId],
    queryFn: () => platformApiRequest<SupportPackage>(`/platform/support-operations-cockpit?${query.toString()}`)
  });

  const data = cockpit.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Support Operations Cockpit</h1>
          <p style={styles.description}>
            Step 211 joins tenant contacts, SLA posture, support tasks, handover notes, customer communications,
            incidents, and active support-session evidence into one read-only launch support surface.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
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

      {cockpit.isLoading ? <div style={styles.card}>Loading support operations cockpit...</div> : null}
      {cockpit.error ? <div style={styles.error}>Failed to load support operations cockpit.</div> : null}

      {data ? (
        <>
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
                    <th style={styles.th}>Incidents / sessions</th>
                    <th style={styles.th}>Next step</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tenants.map((tenant) => (
                    <tr key={tenant.tenant_id}>
                      <td style={styles.td}>{tenant.tenant_name}</td>
                      <td style={styles.td}><span style={badgeStyle(tenant.status)}>{humanize(tenant.status)}</span></td>
                      <td style={styles.td}>
                        Primary: {formatValue(tenant.evidence.primary_contacts)}<br />
                        Escalation: {formatValue(tenant.evidence.escalation_contacts)}
                      </td>
                      <td style={styles.td}>
                        Active: {formatValue(tenant.evidence.active_sla_policy_present)}<br />
                        Response: {formatValue(tenant.evidence.response_target_minutes)} min
                      </td>
                      <td style={styles.td}>
                        Open: {formatValue(tenant.evidence.open_support_tasks)}<br />
                        Overdue: {formatValue(tenant.evidence.overdue_support_tasks)}<br />
                        Urgent: {formatValue(tenant.evidence.urgent_support_tasks)}
                      </td>
                      <td style={styles.td}>
                        Incidents: {formatValue(tenant.evidence.open_incidents)}<br />
                        Support sessions: {formatValue(tenant.evidence.active_support_sessions)}
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
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' },
  controlCard: { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px', background: '#f8fafc' },
  controlTitle: { margin: '0 0 8px', fontSize: '16px', color: '#0f172a' },
  muted: { color: '#64748b', margin: 0, lineHeight: 1.5 },
  code: { display: 'inline-block', marginTop: '10px', background: '#e2e8f0', padding: '4px 8px', borderRadius: '8px', fontSize: '12px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '10px', color: '#334155', fontSize: '13px' },
  td: { borderBottom: '1px solid #f1f5f9', padding: '10px', verticalAlign: 'top', color: '#334155', fontSize: '13px', lineHeight: 1.45 },
  badge: { borderRadius: '999px', padding: '5px 10px', fontWeight: 700, fontSize: '12px', textTransform: 'capitalize', display: 'inline-block' }
};
