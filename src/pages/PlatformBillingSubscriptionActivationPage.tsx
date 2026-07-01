import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type ActivationControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type ActivationTenantRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  evidence: Record<string, string | number | boolean | string[] | null>;
  controls: ActivationControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type ActivationPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  upstream_evidence: {
    subscription_readiness: { posture: string; summary: Record<string, number> };
    license_plan_enforcement: { posture: string; summary: Record<string, number>; plan_definitions: Array<Record<string, unknown>> };
  };
  activation_controls: ActivationControl[];
  tenants: ActivationTenantRow[];
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
  if (value.includes('review')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: string | number | boolean | string[] | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' && value.includes('T')) return new Date(value).toLocaleString();
  return String(value);
}

export default function PlatformBillingSubscriptionActivationPage() {
  const [tenantId, setTenantId] = useState('');

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-billing-subscription-activation'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);

  const activation = useQuery({
    queryKey: ['platform', 'billing-subscription-activation', tenantId],
    queryFn: () => platformApiRequest<ActivationPackage>(`/platform/billing-subscription-activation?${query.toString()}`)
  });

  const data = activation.data;
  const summary = data?.summary || {};
  const summaryKeys = [
    'tenants_total',
    'paid_launch_ready',
    'paid_launch_blocked',
    'review_required',
    'blocked_by_subscription',
    'blocked_by_license_plan',
    'missing_plan_code',
    'billing_not_launch_ready',
    'missing_billing_customer_reference',
    'missing_billing_event_history',
    'missing_commercial_limits',
    'missing_commercial_feature_flags',
    'overdue_policy_reviews_required',
    'total_controls',
    'controls_with_evidence'
  ];

  const selectedTenantName = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId)?.name, [tenantId, tenants.data]);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Billing subscription activation</h1>
          <p style={styles.subtitle}>Read-only paid-launch gate joining subscription readiness, billing evidence, plan enforcement, feature flags, limits, and overdue handling review.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{humanize(data.posture)}</span> : null}
      </header>

      <section style={styles.panel}>
        <div style={styles.filterGrid}>
          <div style={styles.filterControl}>
            <label style={styles.label}>Tenant filter</label>
            <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </div>
          <button style={styles.secondaryButton} onClick={() => activation.refetch()} disabled={activation.isFetching}>
            {activation.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {selectedTenantName ? <span style={styles.help}>Showing paid-launch billing evidence for {selectedTenantName}.</span> : <span style={styles.help}>Showing paid-launch billing evidence for all tenants.</span>}
      </section>

      {activation.isLoading ? <section style={styles.card}>Loading billing subscription activation gate…</section> : null}
      {activation.error ? <section style={styles.card}>Unable to load billing subscription activation gate. <button style={styles.inlineButton} onClick={() => activation.refetch()}>Retry</button></section> : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div><strong>Generated</strong><br /><span style={styles.help}>{new Date(data.generated_at).toLocaleString()}</span></div>
            <div style={styles.note}>{data.validation_note}</div>
          </section>

          <section style={styles.summaryGrid}>
            {summaryKeys.map((key) => (
              <div key={key} style={styles.card}>
                <strong>{humanize(key)}</strong>
                <div style={styles.metric}>{summary[key] ?? 0}</div>
              </div>
            ))}
          </section>

          <section style={styles.upstreamGrid}>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Subscription readiness</h2>
              <span style={badgeStyle(data.upstream_evidence.subscription_readiness.posture)}>{humanize(data.upstream_evidence.subscription_readiness.posture)}</span>
              <div style={styles.smallGrid}>
                {Object.entries(data.upstream_evidence.subscription_readiness.summary).map(([key, value]) => (
                  <div key={key} style={styles.evidenceCard}><strong>{humanize(key)}</strong><span>{value}</span></div>
                ))}
              </div>
            </article>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>License and plan enforcement</h2>
              <span style={badgeStyle(data.upstream_evidence.license_plan_enforcement.posture)}>{humanize(data.upstream_evidence.license_plan_enforcement.posture)}</span>
              <div style={styles.smallGrid}>
                {Object.entries(data.upstream_evidence.license_plan_enforcement.summary).map(([key, value]) => (
                  <div key={key} style={styles.evidenceCard}><strong>{humanize(key)}</strong><span>{value}</span></div>
                ))}
              </div>
            </article>
          </section>

          <section style={styles.areaGrid}>
            {data.tenants.map((tenant) => (
              <article key={tenant.tenant_id} style={styles.tenantCard}>
                <div style={styles.areaHeader}>
                  <div>
                    <h2 style={styles.areaTitle}>{tenant.tenant_name}</h2>
                    <div style={styles.help}>{tenant.tenant_id}</div>
                  </div>
                  <span style={badgeStyle(tenant.status)}>{humanize(tenant.status)}</span>
                </div>

                <div style={styles.evidenceGrid}>
                  {[
                    'plan_code',
                    'billing_status',
                    'subscription_readiness_state',
                    'license_enforcement_state',
                    'billing_customer_reference_present',
                    'billing_event_count',
                    'last_billing_event_at',
                    'trial_ends_at',
                    'current_period_ends_at',
                    'subscription_risk_flags',
                    'license_enforcement_gaps'
                  ].map((key) => (
                    <div key={key} style={styles.evidenceCard}>
                      <strong>{humanize(key)}</strong>
                      <span>{formatValue(tenant.evidence[key])}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.checklistGrid}>
                  {tenant.controls.map((control) => (
                    <div key={control.code} style={styles.checklistRow}>
                      <div>
                        <strong>{control.label}</strong>
                        <div style={styles.help}>{control.launch_reason}</div>
                      </div>
                      <div style={styles.checklistStatus}>
                        <span style={badgeStyle(control.status || 'missing_evidence')}>{humanize(control.status || 'missing_evidence')}</span>
                        <span style={styles.help}>Evidence: {control.evidence_value ?? 0}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={styles.nextStep}><strong>Next best step:</strong> {tenant.next_best_step}</div>
                <div style={styles.actionRow}>
                  <Link style={styles.linkButton} to="/platform/billing">Open billing</Link>
                  <Link style={styles.linkButton} to="/platform/subscription-readiness">Open subscription readiness</Link>
                  <Link style={styles.linkButton} to="/platform/license-plan-enforcement">Open license enforcement</Link>
                  <Link style={styles.linkButton} to="/platform/tenants">Open tenants</Link>
                </div>
              </article>
            ))}
            {!activation.isLoading && data.tenants.length === 0 ? <section style={styles.card}>No tenants found for this gate.</section> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280', maxWidth: 920 },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 800, whiteSpace: 'nowrap', fontSize: 12, textTransform: 'capitalize' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, display: 'grid', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' },
  filterControl: { display: 'grid', gap: 8 },
  label: { fontWeight: 800 },
  input: { border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', maxWidth: 420 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metaCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  note: { color: '#374151', lineHeight: 1.5 },
  help: { color: '#6b7280', fontSize: 12 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  metric: { fontSize: 28, fontWeight: 900, marginTop: 8 },
  upstreamGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 },
  smallGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 14 },
  sectionTitle: { margin: '0 0 12px', fontSize: 20 },
  areaGrid: { display: 'grid', gap: 16 },
  tenantCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, display: 'grid', gap: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  areaHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  areaTitle: { margin: 0, fontSize: 20 },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 },
  evidenceCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 8, background: '#f9fafb' },
  checklistGrid: { display: 'grid', gap: 10 },
  checklistRow: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' },
  checklistStatus: { display: 'grid', gap: 6, justifyItems: 'end' },
  nextStep: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, color: '#111827', lineHeight: 1.5 },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  inlineButton: { marginLeft: 10, border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  linkButton: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 10, padding: '8px 12px', fontWeight: 800, color: '#111827', textDecoration: 'none' }
};
