import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformBillingSubscriptionActivationPage.css';

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
type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const launchAcceptancePermissions = [
  PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ,
  PLATFORM_PERMISSIONS.TENANTS_READ,
  PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ,
  PLATFORM_PERMISSIONS.PLATFORM_SLA_READ,
  PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ,
  PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ,
  PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ,
  PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ,
  PLATFORM_PERMISSIONS.TENANTS_EXPORT,
  PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ,
  PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ
];

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
  paid_launch_blocked: 'Paid launch blocked',
  paid_launch_review_required: 'Manual review required',
  billing_subscription_activation_ready: 'Technical activation evidence ready',
  billing_subscription_activation_blocked: 'Billing activation blocked',
  billing_subscription_activation_review_required: 'Billing activation review required',
  no_tenants_to_review_for_paid_launch: 'No tenants to review',
  not_required_for_comped_plan: 'Not required for comped plan',
  tenant_status_not_launchable: 'Tenant status not launchable',
  evidence_present: 'Evidence present',
  missing_evidence: 'Evidence missing',
  subscription_review_required: 'Subscription review required',
  license_plan_review_required: 'License / plan review required',
  requires_overdue_policy_review: 'Overdue policy review required'
};

const summaryLabels: Record<string, string> = {
  tenants_total: 'Tenants reviewed',
  paid_launch_ready: 'Technical precheck ready',
  paid_launch_blocked: 'Paid launch blocked',
  review_required: 'Manual review required',
  tenant_status_not_launchable: 'Tenant status not launchable',
  blocked_by_subscription: 'Blocked by subscription',
  subscription_reviews_required: 'Subscription reviews required',
  blocked_by_license_plan: 'Blocked by license / plan',
  license_plan_reviews_required: 'License / plan reviews required',
  provider_webhook_ready: 'Provider webhook ready',
  provider_webhook_review_required: 'Provider webhook review required',
  missing_plan_code: 'Missing plan code',
  billing_not_launch_ready: 'Billing not launch-ready',
  missing_billing_customer_reference: 'Missing billing customer reference',
  missing_billing_event_history: 'Missing billing event history',
  missing_commercial_limits: 'Missing commercial limits',
  missing_commercial_feature_flags: 'Missing commercial feature flags',
  overdue_policy_reviews_required: 'Overdue policy reviews required',
  total_controls: 'Total controls',
  controls_with_evidence: 'Controls with evidence'
};

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
] as const;

const tenantEvidenceKeys = [
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
] as const;

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function displayStatus(value: string) {
  return statusLabels[value] || humanize(value);
}

function displaySummaryKey(value: string) {
  return summaryLabels[value] || humanize(value);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('missing') || normalized.includes('not_launchable') || normalized.includes('not_ready')) return 'danger';
  if (normalized.includes('review') || normalized.includes('attention')) return 'warn';
  if (normalized.includes('not_required') || normalized.includes('no_tenants')) return 'neutral';
  if (normalized.includes('ready') || normalized.includes('evidence_present') || normalized.includes('healthy')) return 'good';
  return 'accent';
}

function formatValue(value: string | number | boolean | string[] | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && value.includes('T')) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
  }
  return String(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function shortId(value: string) {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

export default function PlatformBillingSubscriptionActivationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id') || '';

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
  const tenantOptions = useMemo(() => billingTenants.data || [], [billingTenants.data]);
  const selectedTenant = useMemo(
    () => tenantOptions.find((tenant) => tenant.id === tenantId),
    [tenantId, tenantOptions]
  );
  const refreshError = activation.isError && Boolean(data);
  const initialLoadError = activation.isError && !data;
  const errorMessage = activation.error instanceof Error ? activation.error.message : 'The platform request failed.';
  const controlCoverage = `${summary.controls_with_evidence ?? 0}/${summary.total_controls ?? 0}`;
  const webhookReviewRequired = (summary.provider_webhook_review_required ?? 0) > 0;
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canOpenLaunchAcceptance = launchAcceptancePermissions.every((permission) => hasPlatformPermission(permission));

  const updateTenantFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('tenant_id', value);
    else next.delete('tenant_id');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="io-operational-page io-workspace-page platform-billing-activation">
      <OperationalWorkspaceHero
        iconPath="/platform/billing-subscription-activation"
        eyebrow="Commercial billing"
        title="Billing subscription activation"
        description="Review paid-launch evidence across tenant lifecycle status, subscription readiness, billing history, plan enforcement, commercial limits and feature flags, plus payment-provider webhook health."
        meta={<>
          <OperationalWorkspaceMetaPill>Platform-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Read-only evidence</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Manual commercial acceptance required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-billing-activation__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.paid_launch_ready ?? 0}/${summary.tenants_total ?? 0}` : '—'}
              label="tenants technically ready for paid launch"
            />
            {data ? (
              <span className="platform-billing-activation__status-badge" data-tone={badgeTone(data.posture)}>
                {displayStatus(data.posture)}
              </span>
            ) : null}
            <div className="platform-billing-activation__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void activation.refetch()}
                disabled={activation.isFetching}
              >
                {activation.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-billing-activation__scope-panel">
        <OperationalSectionHeader
          iconPath="/platform/billing"
          title="Activation scope"
          description="Review all billing tenants or one tenant. The selected tenant is kept in the page URL so the same activation scope can be reopened reliably."
        />
        <div className="platform-billing-activation__filter-grid">
          <label className="platform-billing-activation__field" htmlFor="billing-activation-tenant-filter">
            <span>Tenant filter</span>
            <select
              id="billing-activation-tenant-filter"
              value={tenantId}
              onChange={(event) => updateTenantFilter(event.target.value)}
            >
              <option value="">All billing tenants</option>
              {tenantId && !selectedTenant ? <option value={tenantId}>Selected tenant ({shortId(tenantId)})</option> : null}
              {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <div className="platform-billing-activation__scope-copy">
            <strong>Current scope</strong>
            <span>{selectedTenant?.name || (tenantId ? `Selected tenant (${shortId(tenantId)})` : 'All billing tenants')}</span>
          </div>
        </div>
        {billingTenants.error ? (
          <div className="platform-billing-activation__filter-warning" role="status">
            Billing tenant filter options could not be loaded. The current deep-linked tenant scope is preserved and the activation board can still be reviewed.
          </div>
        ) : null}
      </section>

      {activation.isLoading ? (
        <section className="app-panel app-panel--padded platform-billing-activation__feedback" role="status">
          Loading billing subscription activation gate…
        </section>
      ) : null}

      {initialLoadError ? (
        <section className="app-panel app-panel--padded platform-billing-activation__feedback platform-billing-activation__feedback--error" role="alert">
          <strong>Unable to load billing subscription activation gate.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-billing-activation__retry"
            onClick={() => void activation.refetch()}
            disabled={activation.isFetching}
          >
            {activation.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError && data ? (
        <section className="app-panel app-panel--padded platform-billing-activation__feedback platform-billing-activation__feedback--warning" role="status">
          <strong>Refresh failed. Showing the last successful billing activation snapshot from {formatDateTime(data.generated_at)}.</strong>
          <span>{errorMessage}</span>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Billing subscription activation key metrics">
            <OperationalWorkspaceStatCard
              iconPath="/platform/billing-subscription-activation"
              label="Tenants reviewed"
              value={summary.tenants_total ?? 0}
              helper="Billing tenants included in the current evidence scope."
            />
            <OperationalWorkspaceStatCard
              iconPath="/platform/billing"
              label="Technical precheck ready"
              value={summary.paid_launch_ready ?? 0}
              tone="good"
              helper="Technical evidence is ready; manual commercial acceptance is still separate."
            />
            <OperationalWorkspaceStatCard
              iconPath="/platform/billing"
              label="Paid launch blocked"
              value={summary.paid_launch_blocked ?? 0}
              tone={(summary.paid_launch_blocked ?? 0) > 0 ? 'danger' : 'good'}
              helper="Tenants with a hard lifecycle, subscription, plan or billing blocker."
            />
            <OperationalWorkspaceStatCard
              iconPath="/platform/subscription-readiness"
              label="Manual review required"
              value={summary.review_required ?? 0}
              tone={(summary.review_required ?? 0) > 0 ? 'warn' : 'good'}
              helper="Tenants that are not hard-blocked but still need evidence review."
            />
            <OperationalWorkspaceStatCard
              iconPath="/platform/license-plan-enforcement"
              label="Control evidence"
              value={controlCoverage}
              tone={(summary.controls_with_evidence ?? 0) === (summary.total_controls ?? 0) ? 'good' : 'warn'}
              helper="Controls with evidence / total controls in scope."
            />
            <OperationalWorkspaceStatCard
              iconPath="/platform/billing"
              label="Provider webhook posture"
              value={webhookReviewRequired ? 'Review' : 'Ready'}
              tone={webhookReviewRequired ? 'warn' : 'good'}
              helper="Global provider readiness signal; it does not hard-block an individual tenant by itself."
            />
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-billing-activation__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-readiness"
              title="Program context"
              description="This board is a technical evidence gate. It does not charge customers, activate billing, mutate tenant records or store commercial-owner acceptance."
            />
            <div className="platform-billing-activation__program-grid">
              <div><strong>Program</strong><span>{data.phase}</span></div>
              <div><strong>Gate</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Overdue policy</strong><span>{data.billing_policy_reference}</span></div>
              <details className="platform-billing-activation__validation-note">
                <summary>Validation boundary</summary>
                <p>{data.validation_note}</p>
              </details>
            </div>
          </section>

          {data.manual_commercial_owner_acceptance_required ? (
            <section className="app-panel app-panel--padded platform-billing-activation__acceptance-notice">
              <div>
                <strong>Manual commercial-owner acceptance is still required.</strong>
                <span>A green technical precheck does not store owner approval, charge a customer, activate a tenant or certify commercial launch.</span>
              </div>
              {canOpenLaunchAcceptance ? (
                <Link className="app-button app-button--secondary platform-billing-activation__link-button" to="/platform/commercial-launch-acceptance-packet">
                  Open launch acceptance
                </Link>
              ) : (
                <span className="platform-billing-activation__permission-note">Launch acceptance requires additional platform permissions.</span>
              )}
            </section>
          ) : null}

          <section className="app-panel app-panel--padded platform-billing-activation__summary-panel">
            <OperationalSectionHeader
              iconPath="/platform/billing-subscription-activation"
              title="Activation summary"
              description="Detailed counts behind the primary KPIs. Review these when determining whether the remaining work is a hard blocker, a manual review, or missing commercial evidence."
            />
            <div className="platform-billing-activation__summary-grid">
              {summaryKeys.map((key) => (
                <div key={key} className="platform-billing-activation__summary-item">
                  <span>{displaySummaryKey(key)}</span>
                  <strong>{summary[key] ?? 0}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="platform-billing-activation__upstream-section">
            <OperationalSectionHeader
              iconPath="/platform/subscription-readiness"
              title="Upstream readiness evidence"
              description="Subscription, license/plan and provider-webhook evidence is surfaced separately so a global provider warning is not confused with a tenant hard blocker."
            />
            <div className="platform-billing-activation__upstream-grid">
              <article className="app-panel app-panel--padded platform-billing-activation__upstream-card">
                <div className="platform-billing-activation__card-heading">
                  <h3>Subscription readiness</h3>
                  <span className="platform-billing-activation__status-badge" data-tone={badgeTone(data.upstream_evidence.subscription_readiness.posture)}>
                    {displayStatus(data.upstream_evidence.subscription_readiness.posture)}
                  </span>
                </div>
                <div className="platform-billing-activation__fact-grid">
                  {Object.entries(data.upstream_evidence.subscription_readiness.summary).map(([key, value]) => (
                    <div key={key}><span>{humanize(key)}</span><strong>{value}</strong></div>
                  ))}
                </div>
              </article>

              <article className="app-panel app-panel--padded platform-billing-activation__upstream-card">
                <div className="platform-billing-activation__card-heading">
                  <h3>License and plan enforcement</h3>
                  <span className="platform-billing-activation__status-badge" data-tone={badgeTone(data.upstream_evidence.license_plan_enforcement.posture)}>
                    {displayStatus(data.upstream_evidence.license_plan_enforcement.posture)}
                  </span>
                </div>
                <div className="platform-billing-activation__fact-grid">
                  {Object.entries(data.upstream_evidence.license_plan_enforcement.summary).map(([key, value]) => (
                    <div key={key}><span>{humanize(key)}</span><strong>{value}</strong></div>
                  ))}
                </div>
              </article>

              <article className="app-panel app-panel--padded platform-billing-activation__upstream-card">
                <div className="platform-billing-activation__card-heading">
                  <h3>Payment provider webhooks</h3>
                  <span
                    className="platform-billing-activation__status-badge"
                    data-tone={badgeTone(webhookReviewRequired ? 'provider_webhook_review_required' : 'provider_webhook_ready')}
                  >
                    {webhookReviewRequired ? 'Provider webhook review required' : 'Provider webhook ready'}
                  </span>
                </div>
                <div className="platform-billing-activation__fact-grid">
                  <div><span>Enabled providers</span><strong>{data.upstream_evidence.payment_provider_webhook_readiness.enabled_providers.join(', ') || 'None'}</strong></div>
                  <div><span>Missing secrets</span><strong>{data.upstream_evidence.payment_provider_webhook_readiness.missing_secret_providers.join(', ') || 'None'}</strong></div>
                  <div><span>Weak secrets</span><strong>{data.upstream_evidence.payment_provider_webhook_readiness.weak_secret_providers?.join(', ') || 'None'}</strong></div>
                  <div><span>Operational health</span><strong>{humanize(data.upstream_evidence.payment_provider_webhook_readiness.webhook_operational_health?.status)}</strong></div>
                  {data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity ? (
                    <div className="platform-billing-activation__activity-fact">
                      <span>Last {data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity.window_hours}h activity</span>
                      <strong>
                        {data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity.accepted_count} accepted · {' '}
                        {data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity.duplicate_count} duplicate · {' '}
                        {data.upstream_evidence.payment_provider_webhook_readiness.recent_webhook_activity.rejected_count} rejected
                      </strong>
                    </div>
                  ) : null}
                </div>
                <div className="platform-billing-activation__actions">
                  <Link className="app-button app-button--secondary platform-billing-activation__link-button" to="/platform/billing">
                    Review provider readiness in Billing
                  </Link>
                </div>
              </article>
            </div>
          </section>

          <section className="platform-billing-activation__tenant-section">
            <OperationalSectionHeader
              iconPath="/platform/tenants"
              title="Tenant activation evidence"
              description="Each tenant keeps its lifecycle, billing, entitlement and control evidence together with the next best operational step."
            />
            <div className="platform-billing-activation__tenant-list">
              {data.tenants.map((tenant) => (
                <article key={tenant.tenant_id} className="app-panel platform-billing-activation__tenant-card">
                  <div className="platform-billing-activation__tenant-header">
                    <div className="platform-billing-activation__tenant-title-wrap">
                      <h3>{tenant.tenant_name}</h3>
                      <span>{tenant.tenant_id}</span>
                    </div>
                    <span className="platform-billing-activation__status-badge" data-tone={badgeTone(tenant.status)}>
                      {displayStatus(tenant.status)}
                    </span>
                  </div>

                  <div className="platform-billing-activation__evidence-grid">
                    {tenantEvidenceKeys.map((key) => (
                      <div key={key} className="platform-billing-activation__evidence-card">
                        <span>{evidenceLabels[key] || humanize(key)}</span>
                        <strong>{formatValue(tenant.evidence[key])}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="platform-billing-activation__control-grid">
                    {tenant.controls.map((control) => (
                      <div key={control.code} className="platform-billing-activation__control-row">
                        <div className="platform-billing-activation__control-copy">
                          <strong>{control.label}</strong>
                          <span>{control.launch_reason}</span>
                        </div>
                        <div className="platform-billing-activation__control-status">
                          <span className="platform-billing-activation__status-badge" data-tone={badgeTone(control.status || 'missing_evidence')}>
                            {displayStatus(control.status || 'missing_evidence')}
                          </span>
                          <span>Evidence: {control.evidence_value ?? 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="platform-billing-activation__next-step">
                    <strong>Next best step</strong>
                    <span>{tenant.next_best_step}</span>
                  </div>

                  <div className="platform-billing-activation__actions">
                    <Link className="app-button app-button--secondary platform-billing-activation__link-button" to="/platform/billing">Open billing</Link>
                    <Link className="app-button app-button--secondary platform-billing-activation__link-button" to="/platform/subscription-readiness">Open subscription readiness</Link>
                    <Link className="app-button app-button--secondary platform-billing-activation__link-button" to="/platform/license-plan-enforcement">Open license enforcement</Link>
                    {canOpenLaunchAcceptance ? (
                      <Link className="app-button app-button--secondary platform-billing-activation__link-button" to="/platform/commercial-launch-acceptance-packet">Open launch acceptance</Link>
                    ) : null}
                    {canReadTenants ? (
                      <Link className="app-button app-button--secondary platform-billing-activation__link-button" to="/platform/tenants">Open tenants</Link>
                    ) : null}
                  </div>
                </article>
              ))}

              {data.tenants.length === 0 ? (
                <section className="app-panel app-panel--padded platform-billing-activation__empty">
                  No tenants found for this activation gate.
                </section>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
