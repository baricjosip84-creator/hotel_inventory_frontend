import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type PilotControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value: number;
  status: string;
};

type PilotTenantRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  evidence: Record<string, string | number | boolean | null>;
  controls: PilotControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type PilotCustomerReadinessPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  pilot_controls: Array<Omit<PilotControl, 'evidence_value' | 'status'>>;
  tenants: PilotTenantRow[];
  required_manual_acceptance: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('missing')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('incomplete') || value.includes('manual') || value.includes('review')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatEvidenceValue(value: string | number | boolean | null | undefined) {
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (value === null || value === undefined || value === '') return 'none';
  if (typeof value === 'string' && value.includes('T')) return new Date(value).toLocaleString();
  return String(value);
}

type Tenant = { id: string; name: string };

export default function PlatformPilotCustomerReadinessPage() {
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');
  const [limit, setLimit] = useState(searchParams.get('limit') || '100');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-pilot-customer-readiness'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  query.set('limit', limit);

  const pilot = useQuery({
    queryKey: ['platform', 'pilot-customer-readiness', tenantId, limit],
    queryFn: () => platformApiRequest<PilotCustomerReadinessPackage>(`/platform/pilot-customer-readiness?${query.toString()}`)
  });

  const data = pilot.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const selectedTenantName = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId)?.name, [tenantId, tenants.data]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Pilot Customer Readiness Board</h1>
          <p style={styles.description}>
            Step 216 checks pilot tenant selection, success criteria, data policy, feedback logging,
            blocker review, first-use onboarding evidence, support handover, and monitoring evidence.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.filterGrid}>
          <label style={styles.label}>Tenant filter
            <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label style={styles.label}>Tenant limit
            <select style={styles.input} value={limit} onChange={(event) => setLimit(event.target.value)} disabled={Boolean(tenantId)}>
              <option value="25">Latest 25 tenants</option>
              <option value="50">Latest 50 tenants</option>
              <option value="100">Latest 100 tenants</option>
              <option value="300">Latest 300 tenants</option>
            </select>
          </label>
          <button style={styles.secondaryButton} onClick={() => pilot.refetch()} disabled={pilot.isFetching}>
            {pilot.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {selectedTenantName ? <span style={styles.help}>Showing pilot readiness evidence for {selectedTenantName}.</span> : <span style={styles.help}>Showing the latest {limit} tenants by pilot activity or creation date.</span>}
      </section>

      {pilot.isLoading ? <div style={styles.card}>Loading pilot customer readiness...</div> : null}
      {pilot.error ? <div style={styles.error}>Failed to load pilot customer readiness. <button style={styles.inlineButton} onClick={() => pilot.refetch()}>Retry</button></div> : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div><strong>Generated</strong><br /><span style={styles.help}>{new Date(data.generated_at).toLocaleString()}</span></div>
            <div style={styles.note}>{data.validation_note}</div>
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
            <h2 style={styles.sectionTitle}>Required pilot controls</h2>
            <div style={styles.controlGrid}>
              {data.pilot_controls.map((control) => (
                <article key={control.code} style={styles.controlCard}>
                  <strong>{control.label}</strong>
                  <p style={styles.reason}>{control.launch_reason}</p>
                  <span style={styles.help}>Evidence: {humanize(control.evidence_key)}</span>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Tenant pilot readiness</h2>
            <div style={styles.tenantGrid}>
              {data.tenants.map((tenant) => (
                <article key={tenant.tenant_id} style={styles.tenantCard}>
                  <div style={styles.controlHeader}>
                    <div>
                      <strong>{tenant.tenant_name}</strong>
                      <div style={styles.help}>{tenant.tenant_id}</div>
                    </div>
                    <span style={badgeStyle(tenant.status)}>{humanize(tenant.status)}</span>
                  </div>

                  <div style={styles.evidenceGrid}>
                    {Object.entries(tenant.evidence).slice(0, 12).map(([key, value]) => (
                      <div key={key} style={styles.evidenceItem}>
                        <span style={styles.evidenceLabel}>{humanize(key)}</span>
                        <strong>{formatEvidenceValue(value)}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={styles.controlList}>
                    {tenant.controls.map((control) => (
                      <div key={control.code} style={styles.controlRow}>
                        <span>{control.label}</span>
                        <span style={badgeStyle(control.status)}>{humanize(control.status)}</span>
                      </div>
                    ))}
                  </div>

                  <p style={styles.nextInline}><strong>Next:</strong> {tenant.next_best_step}</p>
                  <div style={styles.actionRow}>
                    <Link style={styles.linkButton} to={`/platform/tenant-tasks?tenant_id=${tenant.tenant_id}&category=pilot`}>Open pilot tasks</Link>
                    <Link style={styles.linkButton} to={`/platform/tenant-notes?tenant_id=${tenant.tenant_id}&category=pilot`}>Open pilot notes</Link>
                    <Link style={styles.linkButton} to={`/platform/incidents?tenant_id=${tenant.tenant_id}&scope=tenant&include_resolved=false`}>Open tenant incidents</Link>
                    <Link style={styles.linkButton} to={`/platform/customer-onboarding-checklist?tenant_id=${tenant.tenant_id}`}>Open onboarding evidence</Link>
                    <Link style={styles.linkButton} to={`/platform/support-operations-cockpit?tenant_id=${tenant.tenant_id}`}>Open support cockpit</Link>
                    <Link style={styles.linkButton} to={`/platform/production-monitoring-readiness?tenant_id=${tenant.tenant_id}`}>Open monitoring readiness</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Required manual acceptance</h2>
            <ul style={styles.list}>
              {data.required_manual_acceptance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section style={styles.nextStep}><strong>Next best step:</strong> {data.next_best_step}</section>
          <section style={styles.note}>{data.validation_note}</section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  eyebrow: { margin: 0, color: '#6b7280', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28 },
  description: { margin: 0, color: '#4b5563', maxWidth: 980, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' },
  label: { display: 'grid', gap: 6, color: '#374151', fontSize: 13, fontWeight: 800 },
  input: { border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', background: '#fff' },
  generated: { color: '#6b7280', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metaCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  metricValue: { fontSize: 26, fontWeight: 900 },
  metricLabel: { color: '#6b7280', textTransform: 'capitalize', fontSize: 12, marginTop: 4 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  controlCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb' },
  tenantGrid: { display: 'grid', gap: 14 },
  tenantCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#f9fafb', display: 'grid', gap: 12 },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 },
  evidenceItem: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 4 },
  evidenceLabel: { color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
  controlList: { display: 'grid', gap: 8 },
  controlRow: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: 8 },
  reason: { color: '#4b5563', lineHeight: 1.45, margin: '8px 0' },
  help: { color: '#6b7280', fontSize: 12 },
  list: { margin: 0, paddingLeft: 22, color: '#374151', lineHeight: 1.7 },
  nextInline: { margin: 0, color: '#1e3a8a' },
  actionRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  linkButton: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 10, padding: '8px 10px', color: '#111827', fontWeight: 800, textDecoration: 'none', fontSize: 12 },
  nextStep: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 14, color: '#1e3a8a' },
  note: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e' },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  inlineButton: { marginLeft: 10, border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12 }
};
