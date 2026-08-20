import { useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

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
  tenant_status: string | null;
  status: string;
  evidence: Record<string, string | number | boolean | null>;
  controls: PilotControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type PilotEvidenceModel = {
  dedicated_pilot_record_persisted: boolean;
  text_reference_requires_manual_confirmation: boolean;
  prelaunch_scope_only: boolean;
  expansion_decision_evaluated: boolean;
  explanation: string;
};

type PilotCustomerReadinessPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  pilot_controls: Array<Omit<PilotControl, 'evidence_value' | 'status'>>;
  evidence_model: PilotEvidenceModel;
  tenants: PilotTenantRow[];
  required_manual_acceptance: string[];
  next_best_step: string;
  validation_note: string;
};

type Tenant = { id: string; name: string };

const allowedLimits = new Set(['25', '50', '100', '300']);
const evidenceKeys = [
  'tenant_status',
  'tenant_status_launchable',
  'pilot_selection_evidence',
  'pilot_owner_evidence',
  'success_criteria_evidence',
  'data_policy_evidence',
  'feedback_log_evidence',
  'onboarding_evidence_count',
  'support_handover_evidence',
  'monitoring_review_evidence',
  'open_blocker_count',
  'blocked_pilot_tasks',
  'blocked_onboarding_tasks',
  'blocked_support_tasks',
  'open_incidents',
  'latest_pilot_activity_at'
];

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function badgeStyle(value: string): CSSProperties {
  const normalized = value.toLowerCase();
  if (normalized === 'loading' || normalized.includes('no_tenants') || normalized.includes('not generated')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (normalized.includes('blocked') || normalized.includes('missing') || normalized.includes('not_launchable')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (normalized.includes('incomplete') || normalized.includes('manual') || normalized.includes('review') || normalized.includes('confirmation')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatEvidenceValue(value: string | number | boolean | null | undefined) {
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (value === null || value === undefined || value === '') return 'none';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString();
  return String(value);
}

export default function PlatformPilotCustomerReadinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLimit = searchParams.get('limit') || '100';
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');
  const [limit, setLimit] = useState(allowedLimits.has(initialLimit) ? initialLimit : '100');

  const canOpenSupportCockpit = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ);
  const canOpenMonitoringReadiness = hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-pilot-customer-readiness'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  query.set('limit', limit);

  const pilot = useQuery({
    queryKey: ['platform', 'pilot-customer-readiness', tenantId, limit],
    queryFn: () => platformApiRequest<PilotCustomerReadinessPackage>(`/platform/pilot-customer-readiness?${query.toString()}`),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const updateUrl = (nextTenantId: string, nextLimit: string) => {
    const next = new URLSearchParams(searchParams);
    if (nextTenantId) next.set('tenant_id', nextTenantId); else next.delete('tenant_id');
    if (!nextTenantId && nextLimit !== '100') next.set('limit', nextLimit); else next.delete('limit');
    setSearchParams(next, { replace: true });
  };

  const onTenantChange = (value: string) => {
    setTenantId(value);
    updateUrl(value, limit);
  };

  const onLimitChange = (value: string) => {
    setLimit(value);
    updateUrl(tenantId, value);
  };

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
            Step 216 is a pre-launch operator check for pilot selection, accountable ownership, success criteria,
            data policy, feedback tracking, onboarding, support handover, monitoring references, and open blockers.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
        </div>
      </section>

      <section style={styles.notice}>
        <strong>Operator precheck only.</strong> The current platform does not persist a dedicated pilot entity or pilot-acceptance record.
        Task/note text matches are evidence references and require manual confirmation. A post-pilot expansion decision is deliberately outside this pre-launch board.
      </section>

      <section style={styles.card}>
        <div style={styles.filterGrid}>
          <label style={styles.label}>Tenant filter
            <select style={styles.input} value={tenantId} onChange={(event) => onTenantChange(event.target.value)}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label style={styles.label}>Tenant limit
            <select style={styles.input} value={limit} onChange={(event) => onLimitChange(event.target.value)} disabled={Boolean(tenantId)}>
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
        {tenants.error ? <div style={styles.inlineError}>Unable to load tenant filter: {readableError(tenants.error)}</div> : null}
        {selectedTenantName
          ? <span style={styles.help}>Showing pilot readiness evidence for {selectedTenantName}.</span>
          : <span style={styles.help}>Showing up to {limit} tenants by pilot activity or creation date.</span>}
      </section>

      {pilot.isLoading ? <div style={styles.card}>Loading pilot customer readiness…</div> : null}
      {pilot.error ? (
        <div style={styles.error}>
          Unable to load pilot customer readiness: {readableError(pilot.error)}
          <button style={styles.inlineButton} onClick={() => pilot.refetch()} disabled={pilot.isFetching}>Retry</button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div><strong>Generated</strong><br /><span style={styles.help}>{new Date(data.generated_at).toLocaleString()}</span></div>
            <div><strong>Evidence model</strong><br /><span style={styles.help}>Manual confirmation required for task/note references.</span></div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Evidence-model limitation</h2>
            <p style={styles.reason}>{data.evidence_model.explanation}</p>
            <div style={styles.evidenceGrid}>
              <div style={styles.evidenceItem}><span style={styles.evidenceLabel}>Dedicated pilot record persisted</span><strong>{formatEvidenceValue(data.evidence_model.dedicated_pilot_record_persisted)}</strong></div>
              <div style={styles.evidenceItem}><span style={styles.evidenceLabel}>Text reference needs confirmation</span><strong>{formatEvidenceValue(data.evidence_model.text_reference_requires_manual_confirmation)}</strong></div>
              <div style={styles.evidenceItem}><span style={styles.evidenceLabel}>Pre-launch scope only</span><strong>{formatEvidenceValue(data.evidence_model.prelaunch_scope_only)}</strong></div>
              <div style={styles.evidenceItem}><span style={styles.evidenceLabel}>Expansion decision evaluated</span><strong>{formatEvidenceValue(data.evidence_model.expansion_decision_evaluated)}</strong></div>
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
            {data.tenants.length === 0 ? <div style={styles.empty}>No tenants match the current pilot-readiness filter.</div> : null}
            <div style={styles.tenantGrid}>
              {data.tenants.map((tenant) => (
                <article key={tenant.tenant_id} style={styles.tenantCard}>
                  <div style={styles.controlHeader}>
                    <div style={styles.breakable}>
                      <strong>{tenant.tenant_name}</strong>
                      <div style={styles.help}>{tenant.tenant_id}</div>
                      <div style={styles.help}>Lifecycle: {tenant.tenant_status || 'unknown'}</div>
                    </div>
                    <span style={badgeStyle(tenant.status)}>{humanize(tenant.status)}</span>
                  </div>

                  <div style={styles.evidenceGrid}>
                    {evidenceKeys.filter((key) => key in tenant.evidence).map((key) => (
                      <div key={key} style={styles.evidenceItem}>
                        <span style={styles.evidenceLabel}>{humanize(key)}</span>
                        <strong style={styles.breakable}>{formatEvidenceValue(tenant.evidence[key])}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={styles.controlList}>
                    {tenant.controls.map((control) => (
                      <div key={control.code} style={styles.controlRow}>
                        <span style={styles.breakable}>{control.label}</span>
                        <span style={badgeStyle(control.status)}>{humanize(control.status)}</span>
                      </div>
                    ))}
                  </div>

                  <p style={styles.nextInline}><strong>Next:</strong> {tenant.next_best_step}</p>
                  <div style={styles.actionRow}>
                    <Link style={styles.linkButton} to={`/platform/tenant-tasks?tenant_id=${tenant.tenant_id}`}>Open tenant tasks</Link>
                    <Link style={styles.linkButton} to={`/platform/tenant-notes?tenant_id=${tenant.tenant_id}&search=pilot`}>Search pilot notes</Link>
                    <Link style={styles.linkButton} to={`/platform/incidents?tenant_id=${tenant.tenant_id}&scope=tenant&include_resolved=false`}>Open tenant incidents</Link>
                    <Link style={styles.linkButton} to={`/platform/customer-onboarding-checklist?tenant_id=${tenant.tenant_id}`}>Open onboarding evidence</Link>
                    {canOpenSupportCockpit ? <Link style={styles.linkButton} to={`/platform/support-cockpit?tenant_id=${tenant.tenant_id}`}>Open support cockpit</Link> : null}
                    {canOpenMonitoringReadiness ? <Link style={styles.linkButton} to={`/platform/monitoring-readiness?tenant_id=${tenant.tenant_id}`}>Open monitoring readiness</Link> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Required manual acceptance</h2>
            <ul style={styles.list}>
              {data.required_manual_acceptance.map((item) => <li key={item}>{item}</li>)}
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
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#64748b', maxWidth: 980, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' },
  label: { display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 800 },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', background: '#fff', minWidth: 0 },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'center' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metaCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', textTransform: 'capitalize', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  controlCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', minWidth: 0 },
  tenantGrid: { display: 'grid', gap: 14 },
  tenantCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc', display: 'grid', gap: 12, minWidth: 0 },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 },
  evidenceItem: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 4, minWidth: 0 },
  evidenceLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  controlList: { display: 'grid', gap: 8 },
  controlRow: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 8, flexWrap: 'wrap' },
  reason: { color: '#334155', lineHeight: 1.45, margin: '8px 0', overflowWrap: 'anywhere' },
  help: { color: '#64748b', fontSize: 12, overflowWrap: 'anywhere' },
  list: { margin: 0, paddingLeft: 22, color: '#334155', lineHeight: 1.7 },
  nextInline: { margin: 0, color: 'var(--io-primary-deep)', overflowWrap: 'anywhere' },
  actionRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  linkButton: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  nextStep: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', borderRadius: 14, padding: 14, color: 'var(--io-primary-deep)', overflowWrap: 'anywhere' },
  note: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e', overflowWrap: 'anywhere' },
  notice: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', borderRadius: 14, padding: 14, color: 'var(--io-primary-deep)', lineHeight: 1.55, overflowWrap: 'anywhere' },
  empty: { background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 14, color: '#64748b' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  inlineButton: { marginLeft: 10, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 8, padding: '6px 10px', fontWeight: 700, cursor: 'pointer' },
  error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 12, padding: 12, overflowWrap: 'anywhere' },
  inlineError: { marginTop: 10, color: '#991b1b', fontSize: 13, overflowWrap: 'anywhere' },
  breakable: { overflowWrap: 'anywhere', minWidth: 0 }
};
