import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
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

type PaymentProviderWebhookReadiness = {
  enabled_providers: string[];
  enabled_provider_count: number;
  ready: boolean;
  operational_attention_required?: boolean;
  missing_secret_providers: string[];
  weak_secret_providers?: string[];
  webhook_operational_health?: { status: string; attention_required: boolean; signals: string[] };
  recent_webhook_activity?: { window_hours: number; accepted_count: number; duplicate_count: number; rejected_count: number };
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
    payment_provider_webhook_readiness: PaymentProviderWebhookReadiness;
  };
  billing_policy_reference: string;
  manual_commercial_owner_acceptance_required: boolean;
  activation_controls: ActivationControl[];
  tenants: ActivationTenantRow[];
  validation_note: string;
};

type BillingTenantOption = { id: string; name: string };

const evidenceLabels: Record<string, string> = {
  tenant_status: 'Tenant lifecycle status',
  tenant_status_launchable: 'Tenant status launchable',
  plan_code: 'Plan code',
  billing_status: 'Billing status',
  subscription_readiness_state: 'Subscription readiness',
  license_enforcement_state: 'License / plan enforcement',
  billing_customer_reference_present: 'Billing customer reference present',
  billing_event_count: 'Billing event count',
  last_billing_event_at: 'Last billing event',
  trial_ends_at: 'Trial ends',
  current_period_ends_at: 'Current period ends',
  subscription_risk_flags: 'Subscription risk flags',
  license_enforcement_gaps: 'License enforcement gaps',
  billing_policy_reference: 'Overdue policy reference',
  manual_commercial_owner_acceptance_required: 'Manual commercial-owner acceptance'
};

const statusLabels: Record<string, string> = {
  paid_launch_ready: 'Technical precheck ready',
  paid_launch_review_required: 'Manual review required',
  billing_subscription_activation_ready: 'Technical activation evidence ready',
  billing_subscription_activation_review_required: 'Billing activation review required',
  no_tenants_to_review_for_paid_launch: 'No tenants to review',
  not_required_for_comped_plan: 'Not required for comped plan',
  tenant_status_not_launchable: 'Tenant status not launchable'
};

const summaryLabels: Record<string, string> = {
  paid_launch_ready: 'Technical precheck ready',
  review_required: 'Manual review required',
  tenant_status_not_launchable: 'Tenant status not launchable',
  subscription_reviews_required: 'Subscription reviews required',
  license_plan_reviews_required: 'License / plan reviews required',
  provider_webhook_ready: 'Provider webhook ready',
  provider_webhook_review_required: 'Provider webhook review required'
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function displayStatus(value: string) {
  return statusLabels[value] || humanize(value);
}

function displaySummaryKey(value: string) {
  return summaryLabels[value] || humanize(value);
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('not_required') || value.includes('no_tenants')) {
    return { ...styles.badge, background: '#f3f4f6', color: '#4b5563' };
  }
  if (value.includes('review')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (value.includes('blocked') || value.includes('missing') || value.includes('not_launchable') || value.includes('not_ready')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: string | number | boolean | string[] | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' && value.includes('T')) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
  }
  return String(value);
}

export default function PlatformBillingSubscriptionActivationPage() {
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');

  const billingTenants = useQuery({
    queryKey: ['platform', 'billing', 'for-billing-subscription-activation'],
    queryFn: () => platformApiRequest<BillingTenantOption[]>('/platform/billing'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  const queryString = query.toString();

  const activation = useQuery({
    queryKey: ['platform', 'billing-subscription-activation', tenantId],
    queryFn: () => platformApiRequest<ActivationPackage>(`/platform/billing-subscription-activation${queryString ? `?${queryString}` : ''}`),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = activation.data;
  const summary = data?.summary || {};
  const summaryKeys = [
    'tenants_total',
    'paid_launch_ready',
    'paid_launch_blocked',
    'review_required',
    'tenant_status_not_launchable',
    'blocked_by_subscription',
    'subscription_reviews_required',
    'blocked_by_license_plan',
    'license_plan_reviews_required',
    'provider_webhook_ready',
    'provider_webhook_review_required',
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

  const selectedTenantName = useMemo(
    () => (billingTenants.data || []).find((tenant) => tenant.id === tenantId)?.name,
    [tenantId, billingTenants.data]
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Billing subscription activation</h1>
          <p style={styles.subtitle}>Read-only paid-launch evidence gate joining tenant lifecycle status, subscription readiness, billing history, plan enforcement, feature flags, limits, and the documented overdue-handling policy.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{displayStatus(data.posture)}</span> : null}
      </header>

      <section style={styles.panel}>
        <div style={styles.filterGrid}>
          <div style={styles.filterControl}>
            <label style={styles.label} htmlFor="billing-activation-tenant-filter">Tenant filter</label>
            <select id="billing-activation-tenant-filter" style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
              <option value="">All billing tenants</option>
              {(billingTenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </div>
          <button style={styles.secondaryButton} onClick={() => activation.refetch()} disabled={activation.isFetching}>
            {activation.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {selectedTenantName ? <span style={styles.help}>Showing paid-launch billing evidence for {selectedTenantName}.</span> : <span style={styles.help}>Showing paid-launch billing evidence for all billing tenants.</span>}
        {billingTenants.error ? <span style={styles.errorText}>Billing tenant filter options could not be loaded. The activation board can still be reviewed with its current filter.</span> : null}
      </section>

      {activation.isLoading ? <section style={styles.card}>Loading billing subscription activation gate…</section> : null}
      {activation.error ? (
        <section style={styles.errorCard}>
          <strong>Unable to load billing subscription activation gate.</strong>
          <span style={styles.errorText}>{activation.error instanceof Error ? activation.error.message : 'The platform request failed.'}</span>
          <button style={styles.inlineButton} onClick={() => activation.refetch()} disabled={activation.isFetching}>Retry</button>
        </section>
      ) : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div><strong>Generated</strong><br /><span style={styles.help}>{new Date(data.generated_at).toLocaleString()}</span></div>
            <div><strong>Overdue policy</strong><br /><span style={styles.help}>{data.billing_policy_reference}</span></div>
            <div style={styles.note}>{data.validation_note}</div>
          </section>

          {data.manual_commercial_owner_acceptance_required ? (
            <section style={styles.reviewNotice}>
              <div>
                <strong>Manual commercial-owner acceptance is still required.</strong>
                <div style={styles.help}>A green technical precheck on this page does not store owner approval, charge a customer, activate a tenant, or certify commercial launch.</div>
              </div>
              <Link style={styles.linkButton} to="/platform/commercial-launch-acceptance-packet">Open launch acceptance</Link>
            </section>
          ) : null}

          <section style={styles.summaryGrid}>
            {summaryKeys.map((key) => (
              <div key={key} style={styles.card}>
                <strong>{displaySummaryKey(key)}</strong>
                <div style={styles.metric}>{summary[key] ?? 0}</div>
              </div>
            ))}
          </section>

          <section style={styles.upstreamGrid}>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Subscription readiness</h2>
              <span style={badgeStyle(data.upstream_evidence.subscription_readiness.posture)}>{displayStatus(data.upstream_evidence.subscription_readiness.posture)}</span>
              <div style={styles.smallGrid}>
                {Object.entries(data.upstream_evidence.subscription_readiness.summary).map(([key, value]) => (
                  <div key={key} style={styles.evidenceCard}><strong>{humanize(key)}</strong><span style={styles.evidenceValue}>{value}</span></div>
                ))}
              </div>
            </article>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>License and plan enforcement</h2>
              <span style={badgeStyle(data.upstream_evidence.license_plan_enforcement.posture)}>{displayStatus(data.upstream_evidence.license_plan_enforcement.posture)}</span>
              <div style={styles.smallGrid}>
                {Object.entries(data.upstream_evidence.license_plan_enforcement.summary).map(([key, value]) => (
                  <div key={key} style={styles.evidenceCard}><strong>{humanize(key)}</strong><span style={styles.evidenceValue}>{value}</span></div>
                ))}
              </div>
            </article>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Payment provider webhooks</h2>
              <span style={badgeStyle(data.upstream_evidence.payment_provider_webhook_readiness.ready && !data.upstream_evidence.payment_provider_webhook_readiness.operational_attention_required ? 'provider_webhook_ready' : 'provider_webhook_review_required')}>
                {data.upstream_evidence.payment_provider_webhook_readiness.ready && !data.upstream_evidence.payment_provider_webhook_readiness.operational_attention_required ? 'Provider webhook ready' : 'Provider webhook review required'}
              </span>
              <div style={styles.smallGrid}>
                <div style={styles.evidenceCard}><strong>Enabled providers</strong><span style={styles.evidenceValue}>{data.upstream_evidence.payment_provider_webhook_readiness.enabled_providers.join(', ') || 'none'}</span></div>
                <div style={styles.evidenceCard}><strong>Missing secrets</strong><span style={styles.evidenceValue}>{data.upstream_evidence.payment_provider_webhook_readiness.missing_secret_providers.join(', ') || 'none'}</span></div>
                <div style={styles.evidenceCard}><strong>Weak secrets</strong><span style={styles.evidenceValue}>{data.upstream_evidence.payment_provider_webhook_readiness.weak_secret_providers?.join(', ') || 'none'}</span></div>
                <div style={styles.evidenceCard}><strong>Operational health</strong><span style={styles.evidenceValue}>{data.upstream_evidence.payment_provider_webhook_readiness.webhook_operational_health?.status || '-'}</span></div>
                {data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity ? (
                  <div style={styles.evidenceCard}>
                    <strong>Last {data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity.window_hours}h activity</strong>
                    <span style={styles.evidenceValue}>{data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity.accepted_count} accepted · {data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity.duplicate_count} duplicate · {data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity.rejected_count} rejected</span>
                  </div>
                ) : null}
              </div>
              <div style={styles.sectionAction}><Link style={styles.linkButton} to="/platform/billing">Review provider readiness in Billing</Link></div>
            </article>
          </section>

          <section style={styles.areaGrid}>
            {data.tenants.map((tenant) => (
              <article key={tenant.tenant_id} style={styles.tenantCard}>
                <div style={styles.areaHeader}>
                  <div style={styles.tenantIdentity}>
                    <h2 style={styles.areaTitle}>{tenant.tenant_name}</h2>
                    <div style={styles.help}>{tenant.tenant_id}</div>
                  </div>
                  <span style={badgeStyle(tenant.status)}>{displayStatus(tenant.status)}</span>
                </div>

                <div style={styles.evidenceGrid}>
                  {[
                    'tenant_status',
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
                    'license_enforcement_gaps',
                    'billing_policy_reference',
                    'manual_commercial_owner_acceptance_required'
                  ].map((key) => (
                    <div key={key} style={styles.evidenceCard}>
                      <strong>{evidenceLabels[key] || humanize(key)}</strong>
                      <span style={styles.evidenceValue}>{formatValue(tenant.evidence[key])}</span>
                    </div>
                  ))}
                </div>

                <div style={styles.checklistGrid}>
                  {tenant.controls.map((control) => (
                    <div key={control.code} style={styles.checklistRow}>
                      <div style={styles.checklistCopy}>
                        <strong>{control.label}</strong>
                        <div style={styles.help}>{control.launch_reason}</div>
                      </div>
                      <div style={styles.checklistStatus}>
                        <span style={badgeStyle(control.status || 'missing_evidence')}>{displayStatus(control.status || 'missing_evidence')}</span>
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
                  <Link style={styles.linkButton} to="/platform/commercial-launch-acceptance-packet">Open launch acceptance</Link>
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
  page: { display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280', maxWidth: 920, lineHeight: 1.5 },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 800, fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, display: 'grid', gap: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' },
  filterControl: { display: 'grid', gap: 8, minWidth: 0 },
  label: { fontWeight: 800 },
  input: { border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', maxWidth: 420, width: '100%' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', minWidth: 0 },
  errorCard: { background: '#fff7f7', border: '1px solid #fecaca', borderRadius: 14, padding: 18, display: 'grid', gap: 10 },
  errorText: { color: '#991b1b', fontSize: 13, lineHeight: 1.5, overflowWrap: 'anywhere' },
  metaCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, minWidth: 0 },
  note: { color: '#374151', lineHeight: 1.5, overflowWrap: 'anywhere' },
  help: { color: '#6b7280', fontSize: 12, lineHeight: 1.45, overflowWrap: 'anywhere' },
  reviewNotice: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  metric: { fontSize: 28, fontWeight: 900, marginTop: 8 },
  upstreamGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 },
  smallGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 14 },
  sectionTitle: { margin: '0 0 12px', fontSize: 20 },
  sectionAction: { marginTop: 12, display: 'flex', flexWrap: 'wrap' },
  areaGrid: { display: 'grid', gap: 16 },
  tenantCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, display: 'grid', gap: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', minWidth: 0 },
  areaHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  tenantIdentity: { minWidth: 0 },
  areaTitle: { margin: 0, fontSize: 20, overflowWrap: 'anywhere' },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 },
  evidenceCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 8, background: '#f9fafb', minWidth: 0 },
  evidenceValue: { overflowWrap: 'anywhere', minWidth: 0 },
  checklistGrid: { display: 'grid', gap: 10 },
  checklistRow: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', minWidth: 0 },
  checklistCopy: { flex: '1 1 320px', minWidth: 0 },
  checklistStatus: { display: 'grid', gap: 6, justifyItems: 'end', minWidth: 0 },
  nextStep: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, color: '#111827', lineHeight: 1.5, overflowWrap: 'anywhere' },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  inlineButton: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer', justifySelf: 'start' },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  linkButton: { border: '1px solid #d1d5db', background: '#fff', borderRadius: 10, padding: '8px 12px', fontWeight: 800, color: '#111827', textDecoration: 'none', overflowWrap: 'anywhere' }
};
