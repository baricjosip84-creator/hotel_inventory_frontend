import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
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
import './PlatformBillingPage.css';

type BillingTenant = {
  id: string; name: string; location?: string | null; status?: string; billing_status?: string; plan_code?: string;
  billing_customer_reference?: string | null; trial_ends_at?: string | null; current_period_ends_at?: string | null;
  billing_notes?: string | null; billing_event_count?: number; last_billing_event_at?: string | null;
};
type BillingEvent = {
  id: string; event_type: string; amount_cents?: number | null; currency?: string | null; external_reference?: string | null;
  note?: string | null; metadata?: Record<string, unknown> | null; created_at: string; created_by_email?: string | null;
  created_by_name?: string | null; created_by_identity_restricted?: boolean;
};
type BillingDetails = {
  tenant: BillingTenant; events: BillingEvent[];
  evidence_access?: { tenant_identity: boolean; platform_user_identity: boolean }; evidence_complete?: boolean;
};
type BillingWorkspace = {
  feature: string; generated_at: string;
  summary: { total_tenants: number; active_tenants: number; trialing_tenants: number; past_due_tenants: number; cancelled_tenants: number; comped_tenants: number; not_configured_tenants: number; billing_events: number };
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  evidence_access: { billing: boolean; tenant_identity: boolean; platform_user_identity: boolean };
  available_sources: string[]; omitted_sources: string[]; evidence_complete: boolean;
  required_permissions_by_source: Record<string, string[]>; truth_contract: Record<string, boolean>; tenants: BillingTenant[];
};
type CommercialPlan = { plan_code: string; commercial_tier: string; limits: Record<string, number>; feature_flags: Record<string, boolean>; required_limits: string[]; required_feature_flags: string[]; recommended_enforcement_mode: string };
type PlanCatalogResponse = { plans: CommercialPlan[] };
type ProviderReadiness = {
  ready: boolean; operational_attention_required?: boolean; enabled_provider_count: number; enabled_providers: string[];
  missing_secret_providers: string[]; weak_secret_providers?: string[];
  recent_webhook_activity?: { accepted_count: number; duplicate_count: number; rejected_count: number; last_accepted_at?: string | null; last_rejected_at?: string | null };
  webhook_operational_health?: { status: 'healthy' | 'warning' | 'critical'; signals: string[]; rejection_rate: number; duplicate_rate: number };
};
type BillingReconciliationAction = { tenant_id: string; tenant_name?: string; action: string; reason: string; previous_billing_status?: string | null; next_billing_status?: string | null; changed_fields?: string[]; applied: boolean };
type BillingReconciliationResult = { dry_run: boolean; inspected_count: number; issue_count: number; applied_count: number; actions: BillingReconciliationAction[] };
type ProviderIngestionResult = { duplicate: boolean; mapped_event_type: string; event?: BillingEvent & { lifecycle_tenant_update?: BillingTenant | null }; existing_event?: BillingEvent };

const PAGE_SIZE = 50;
const billingStatuses = ['not_configured', 'trialing', 'active', 'past_due', 'cancelled', 'comped'];
const manualEventTypes = ['note', 'invoice_sent'];
const providerEventTypes = ['invoice.payment_succeeded', 'invoice.payment_failed', 'customer.subscription.created', 'customer.subscription.updated', 'checkout.session.completed', 'customer.subscription.deleted', 'customer.subscription.cancelled', 'payment_intent.succeeded', 'payment_intent.payment_failed', 'customer.subscription.trial_extended'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function formatDateTime(value?: string | null) { if (!value) return 'Not recorded'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(); }
function isoDateInput(value?: string | null) { return value ? value.slice(0, 10) : ''; }
function money(cents?: number | null, currency?: string | null) { return cents == null ? '—' : `${(Number(cents) / 100).toFixed(2)} ${currency || ''}`.trim(); }
function validCurrency(value: string) { return !value.trim() || /^[A-Z]{3}$/.test(value.trim()); }
function validInteger(value: string) { return !value.trim() || /^(0|[1-9]\d*)$/.test(value.trim()); }
function futureDate(value: string) { if (!value) return false; const date = new Date(`${value}T23:59:59`); return !Number.isNaN(date.getTime()) && date.getTime() > Date.now(); }
function validJsonObject(value: string) { if (!value.trim()) return true; try { const parsed = JSON.parse(value); return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed)); } catch { return false; } }
function providerNeedsPeriod(type: string) { return ['invoice.payment_succeeded', 'payment_intent.succeeded', 'checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated'].includes(type); }
function providerNeedsTrial(type: string) { return type === 'customer.subscription.trial_extended'; }
function keyValues(value?: Record<string, number | boolean>) { const entries = Object.entries(value || {}); return entries.length ? entries.map(([key, item]) => `${key}: ${String(item)}`).join(' · ') : 'None'; }

export default function PlatformBillingPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_WRITE);
  const canReadActors = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadTenantExports = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedStatus = searchParams.get('status') || '';
  const status = billingStatuses.includes(requestedStatus) ? requestedStatus : '';
  const requestedSearch = searchParams.get('search') || '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);
  const invalidFilters = Boolean((requestedTenantId && !UUID_RE.test(requestedTenantId)) || (requestedStatus && !status) || (requestedSearch && !search));

  const [billingForm, setBillingForm] = useState({ plan_code: '', billing_customer_reference: '', trial_ends_at: '', current_period_ends_at: '', billing_notes: '' });
  const [statusForm, setStatusForm] = useState({ billing_status: 'not_configured', reason: '' });
  const [eventForm, setEventForm] = useState({ event_type: 'note', amount_cents: '', currency: 'EUR', external_reference: '', note: '' });
  const [providerForm, setProviderForm] = useState({ provider: 'stripe', provider_event_type: 'invoice.payment_succeeded', provider_event_id: '', provider_event_created_at: '', provider_signature: '', billing_customer_reference: '', amount_cents: '', currency: 'EUR', current_period_ends_at: '', trial_ends_at: '', note: '', raw_payload: '' });
  const [renewalForm, setRenewalForm] = useState({ current_period_ends_at: '', amount_cents: '', currency: 'EUR', external_reference: '', note: '', allow_cancelled_renewal: false });
  const [reconciliationResult, setReconciliationResult] = useState<BillingReconciliationResult | null>(null);
  const [providerResult, setProviderResult] = useState<ProviderIngestionResult | null>(null);
  const [feedback, setFeedback] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ workspace: 'true', limit: String(PAGE_SIZE), offset: String(offset) });
    if (requestedTenantId) params.set('tenant_id', requestedTenantId);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [requestedTenantId, status, search, offset]);

  const overviewQuery = useQuery({
    queryKey: ['platform', 'billing', 'workspace', queryString],
    queryFn: () => platformApiRequest<BillingWorkspace>(`/platform/billing?${queryString}`),
    enabled: !invalidFilters,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });
  const catalogQuery = useQuery({ queryKey: ['platform', 'billing', 'plan-catalog'], queryFn: () => platformApiRequest<PlanCatalogResponse>('/platform/billing/plan-catalog'), staleTime: 60_000, refetchOnWindowFocus: false });
  const providerReadinessQuery = useQuery({ queryKey: ['platform', 'billing', 'provider-webhook-readiness'], queryFn: () => platformApiRequest<ProviderReadiness>('/platform/billing/provider-webhook-readiness'), staleTime: 30_000, refetchOnWindowFocus: false, placeholderData: (previous) => previous });
  const detailsQuery = useQuery({ queryKey: ['platform', 'billing', 'tenant', requestedTenantId], queryFn: () => platformApiRequest<BillingDetails>(`/platform/billing/${requestedTenantId}`), enabled: Boolean(requestedTenantId && !invalidFilters), staleTime: 10_000, refetchOnWindowFocus: false, placeholderData: (previous) => previous });

  const selectedTenant = detailsQuery.data?.tenant || null;
  useEffect(() => {
    if (!selectedTenant) return;
    const period = isoDateInput(selectedTenant.current_period_ends_at);
    setBillingForm({ plan_code: selectedTenant.plan_code || '', billing_customer_reference: selectedTenant.billing_customer_reference || '', trial_ends_at: isoDateInput(selectedTenant.trial_ends_at), current_period_ends_at: period, billing_notes: selectedTenant.billing_notes || '' });
    setStatusForm({ billing_status: selectedTenant.billing_status || 'not_configured', reason: '' });
    setRenewalForm((current) => ({ ...current, current_period_ends_at: current.current_period_ends_at || period }));
    setProviderForm((current) => ({ ...current, current_period_ends_at: current.current_period_ends_at || period, trial_ends_at: current.trial_ends_at || isoDateInput(selectedTenant.trial_ends_at), billing_customer_reference: current.billing_customer_reference || selectedTenant.billing_customer_reference || '' }));
  }, [selectedTenant]);

  const invalidateBilling = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'subscription-readiness'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'license-plan-enforcement'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-lifecycle'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'audit'] })
    ]);
  };

  const saveProfile = useMutation({
    mutationFn: () => platformApiRequest(`/platform/billing/${requestedTenantId}`, { method: 'PATCH', body: JSON.stringify({ ...billingForm, plan_code: billingForm.plan_code.trim() || null, billing_customer_reference: billingForm.billing_customer_reference.trim() || null, billing_notes: billingForm.billing_notes.trim() || null, trial_ends_at: billingForm.trial_ends_at || null, current_period_ends_at: billingForm.current_period_ends_at || null }) }),
    onSuccess: async () => { setFeedback('Billing profile saved.'); await invalidateBilling(); }
  });
  const changeStatus = useMutation({
    mutationFn: () => platformApiRequest(`/platform/billing/${requestedTenantId}/status`, { method: 'POST', body: JSON.stringify({ billing_status: statusForm.billing_status, reason: statusForm.reason.trim() }) }),
    onSuccess: async () => { setFeedback('Billing lifecycle status recorded.'); setStatusForm((current) => ({ ...current, reason: '' })); await invalidateBilling(); }
  });
  const renew = useMutation({
    mutationFn: () => platformApiRequest(`/platform/billing/${requestedTenantId}/renew`, { method: 'POST', body: JSON.stringify({ current_period_ends_at: renewalForm.current_period_ends_at, amount_cents: renewalForm.amount_cents ? Number.parseInt(renewalForm.amount_cents, 10) : null, currency: renewalForm.currency.trim() || null, external_reference: renewalForm.external_reference.trim() || null, note: renewalForm.note.trim() || null, allow_cancelled_renewal: renewalForm.allow_cancelled_renewal }) }),
    onSuccess: async () => { setFeedback('Subscription period renewal recorded.'); setRenewalForm({ current_period_ends_at: '', amount_cents: '', currency: 'EUR', external_reference: '', note: '', allow_cancelled_renewal: false }); await invalidateBilling(); }
  });
  const reconcile = useMutation({
    mutationFn: (dryRun: boolean) => platformApiRequest<BillingReconciliationResult>('/platform/billing/reconcile', { method: 'POST', body: JSON.stringify({ tenant_id: requestedTenantId || null, dry_run: dryRun }) }),
    onSuccess: async (result) => { setReconciliationResult(result); setFeedback(result.dry_run ? 'Billing reconciliation preview generated.' : 'Billing reconciliation applied.'); await invalidateBilling(); }
  });
  const createEvent = useMutation({
    mutationFn: () => platformApiRequest(`/platform/billing/${requestedTenantId}/events`, { method: 'POST', body: JSON.stringify({ event_type: eventForm.event_type, amount_cents: eventForm.amount_cents ? Number.parseInt(eventForm.amount_cents, 10) : null, currency: eventForm.currency.trim() || null, external_reference: eventForm.external_reference.trim() || null, note: eventForm.note.trim() || null }) }),
    onSuccess: async () => { setFeedback('Operator-recorded billing event added.'); setEventForm({ event_type: 'note', amount_cents: '', currency: 'EUR', external_reference: '', note: '' }); await invalidateBilling(); }
  });
  const ingestProvider = useMutation({
    mutationFn: () => {
      const raw = providerForm.raw_payload.trim() ? JSON.parse(providerForm.raw_payload) : null;
      const endpoint = providerForm.billing_customer_reference.trim() ? '/platform/billing/provider-events' : `/platform/billing/${requestedTenantId}/provider-events`;
      return platformApiRequest<ProviderIngestionResult>(endpoint, { method: 'POST', body: JSON.stringify({ provider: providerForm.provider.trim(), provider_event_type: providerForm.provider_event_type.trim() || null, provider_event_id: providerForm.provider_event_id.trim() || null, provider_event_created_at: providerForm.provider_event_created_at || (raw ? null : new Date().toISOString()), provider_signature: providerForm.provider_signature.trim() || null, billing_customer_reference: providerForm.billing_customer_reference.trim() || null, amount_cents: providerForm.amount_cents ? Number.parseInt(providerForm.amount_cents, 10) : null, currency: providerForm.currency.trim() || null, current_period_ends_at: providerForm.current_period_ends_at || null, trial_ends_at: providerForm.trial_ends_at || null, note: providerForm.note.trim() || null, raw_payload: raw }) });
    },
    onSuccess: async (result) => { setProviderResult(result); setFeedback(result.duplicate ? 'Duplicate provider event ignored.' : 'Payment-provider event ingested.'); setProviderForm((current) => ({ ...current, provider_event_id: '', provider_event_created_at: '', provider_signature: '', amount_cents: '', note: '', raw_payload: '' })); await invalidateBilling(); }
  });

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
    if (!Object.prototype.hasOwnProperty.call(patch, 'offset')) next.delete('offset');
    setSearchParams(next, { replace: true });
  };

  const data = overviewQuery.data;
  const summary = data?.summary;
  const pagination = data?.pagination;
  const selectedPlan = (catalogQuery.data?.plans || []).find((plan) => plan.plan_code === billingForm.plan_code) || null;
  const profileChanged = Boolean(selectedTenant && (billingForm.plan_code !== (selectedTenant.plan_code || '') || billingForm.billing_customer_reference.trim() !== (selectedTenant.billing_customer_reference || '') || billingForm.trial_ends_at !== isoDateInput(selectedTenant.trial_ends_at) || billingForm.current_period_ends_at !== isoDateInput(selectedTenant.current_period_ends_at) || billingForm.billing_notes.trim() !== (selectedTenant.billing_notes || '')));
  const profileInvalid = Boolean(billingForm.trial_ends_at && billingForm.current_period_ends_at && billingForm.current_period_ends_at < billingForm.trial_ends_at) || Boolean(billingForm.plan_code && !selectedPlan);
  const statusInvalid = !statusForm.reason.trim() || statusForm.reason.trim().length < 3 || statusForm.billing_status === (selectedTenant?.billing_status || 'not_configured');
  const renewalError = !renewalForm.current_period_ends_at ? 'Enter a future subscription period end.' : !futureDate(renewalForm.current_period_ends_at) ? 'Subscription period end must be in the future.' : !validInteger(renewalForm.amount_cents) ? 'Amount cents must be a non-negative whole number.' : !validCurrency(renewalForm.currency) ? 'Currency must be a 3-letter code.' : '';
  const manualEventError = !validInteger(eventForm.amount_cents) ? 'Amount cents must be a non-negative whole number.' : !validCurrency(eventForm.currency) ? 'Currency must be a 3-letter code.' : '';
  const rawInvalid = !validJsonObject(providerForm.raw_payload);
  const hasRaw = Boolean(providerForm.raw_payload.trim());
  const providerError = !providerForm.provider.trim() ? 'Enter a payment provider.' : providerForm.provider.trim().toLowerCase() === 'manual' ? 'Provider ingestion requires a real external provider.' : rawInvalid ? 'Raw provider payload must be a JSON object.' : !hasRaw && !providerForm.provider_event_type.trim() ? 'Select a provider event type.' : !hasRaw && !providerForm.provider_event_id.trim() ? 'Enter a provider event ID.' : !hasRaw && providerNeedsPeriod(providerForm.provider_event_type) && !providerForm.current_period_ends_at ? 'This provider event requires a current period end.' : !hasRaw && providerNeedsTrial(providerForm.provider_event_type) && !providerForm.trial_ends_at ? 'This provider event requires a trial end.' : !requestedTenantId && !providerForm.billing_customer_reference.trim() && !hasRaw ? 'Select a tenant or enter a billing customer reference.' : !validInteger(providerForm.amount_cents) ? 'Amount cents must be a non-negative whole number.' : !validCurrency(providerForm.currency) ? 'Currency must be a 3-letter code.' : '';
  const refreshError = Boolean(data && overviewQuery.isError);
  const pageStart = pagination?.total ? pagination.offset + 1 : 0;
  const pageEnd = pagination && data ? Math.min(pagination.offset + data.tenants.length, pagination.total) : 0;
  const providerHealth = providerReadinessQuery.data?.webhook_operational_health?.status || (providerReadinessQuery.data?.ready ? 'ready' : 'attention');

  const refreshAll = async () => { setFeedback(''); await Promise.all([overviewQuery.refetch(), catalogQuery.refetch(), providerReadinessQuery.refetch(), ...(requestedTenantId ? [detailsQuery.refetch()] : [])]); };
  const mutationError = saveProfile.error || changeStatus.error || renew.error || reconcile.error || createEvent.error || ingestProvider.error;

  return <div className="io-operational-page io-workspace-page platform-billing">
    <OperationalWorkspaceHero
      iconPath="/platform/billing"
      eyebrow="Commercial Operations"
      title="Billing"
      description="Manage application billing posture, plan linkage, subscription-period assertions and payment-provider event evidence without confusing internal records with external settlement or customer receipt."
      meta={<><OperationalWorkspaceMetaPill>PLATFORM_BILLING_READ + TENANTS_READ</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{canWrite ? 'Billing mutations enabled' : 'Read-only'}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{canReadActors ? 'Operator identity visible' : 'Operator identity restricted'}</OperationalWorkspaceMetaPill>{data?.generated_at ? <OperationalWorkspaceMetaPill>Generated {formatDateTime(data.generated_at)}</OperationalWorkspaceMetaPill> : null}</>}
      aside={<div className="platform-billing__hero-aside"><OperationalWorkspaceStatus value={providerHealth} label="payment-provider webhook application evidence" /><button type="button" className="app-button app-button--secondary" disabled={overviewQuery.isFetching || catalogQuery.isFetching || providerReadinessQuery.isFetching || detailsQuery.isFetching || invalidFilters} onClick={() => void refreshAll()}>{overviewQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button></div>}
    />

    <OperationalWorkspaceStats ariaLabel="Billing registry summary">
      <OperationalWorkspaceStatCard iconPath="/platform/billing" label="Matching tenants" value={summary?.total_tenants ?? '—'} helper="Registry-wide count for current filters" loading={!data && overviewQuery.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/billing" label="Active / trialing" value={summary ? `${summary.active_tenants} / ${summary.trialing_tenants}` : '—'} helper="Application subscription states" tone="blue" loading={!data && overviewQuery.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/billing" label="Past due / cancelled" value={summary ? `${summary.past_due_tenants} / ${summary.cancelled_tenants}` : '—'} helper="Billing attention states" tone={(summary?.past_due_tenants || summary?.cancelled_tenants) ? 'warn' : 'neutral'} loading={!data && overviewQuery.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/billing" label="Billing events" value={summary?.billing_events ?? '—'} helper="Event history across matching tenants" loading={!data && overviewQuery.isLoading} />
    </OperationalWorkspaceStats>

    {refreshError ? <div className="platform-billing__warning" role="status"><strong>Showing the last successful Billing snapshot.</strong><span>Refresh failed: {readableError(overviewQuery.error)}</span></div> : null}
    {data && !data.evidence_complete ? <div className="platform-billing__warning" role="status"><strong>Platform-user identity evidence is restricted.</strong><span>Billing records remain available; event creator names and emails require PLATFORM_USERS_READ.</span></div> : null}
    {feedback ? <div className="platform-billing__success" role="status">{feedback}</div> : null}
    {mutationError ? <div className="platform-billing__error" role="alert">{readableError(mutationError)}</div> : null}

    <section className="io-workspace-panel platform-billing__section">
      <OperationalSectionHeader iconPath="/platform/billing" title="Tenant billing registry" description="Filter server-side across the complete tenant billing registry. URL filters are preserved so deep links from Tenant Health, Lifecycle and Customer Success open the intended tenant evidence." />
      <div className="platform-billing__filters">
        <label>Status<select value={status} onChange={(event) => updateParams({ status: event.target.value || null })}><option value="">All billing states</option>{billingStatuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label className="platform-billing__search">Search<input value={requestedSearch} maxLength={200} onChange={(event) => updateParams({ search: event.target.value || null })} placeholder="Tenant, location, plan or billing customer reference" /></label>
        <div className="platform-billing__filter-actions"><button type="button" className="app-button app-button--secondary" disabled={!requestedTenantId && !requestedStatus && !requestedSearch} onClick={() => setSearchParams({}, { replace: true })}>Clear filters</button>{canWrite ? <><button type="button" className="app-button app-button--secondary" disabled={reconcile.isPending} onClick={() => { setReconciliationResult(null); reconcile.mutate(true); }}>Preview reconciliation</button><button type="button" className="app-button" disabled={reconcile.isPending} onClick={() => window.confirm('Apply billing reconciliation using current application dates and states?') && reconcile.mutate(false)}>Apply reconciliation</button></> : null}</div>
      </div>
      {invalidFilters ? <div className="platform-billing__validation">The URL contains an invalid Billing filter. Clear the filters before loading evidence.</div> : null}
      {!data && overviewQuery.isLoading ? <div className="platform-billing__loading">Loading Billing evidence…</div> : null}
      {!data && overviewQuery.isError ? <div className="platform-billing__blocking-error" role="alert"><strong>Billing could not be loaded.</strong><span>{readableError(overviewQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void overviewQuery.refetch()}>Retry</button></div> : null}
      {data?.tenants.length ? <div className="platform-billing__table-wrap"><table className="platform-billing__table"><thead><tr><th>Tenant</th><th>Billing state</th><th>Plan</th><th>Period</th><th>Provider reference</th><th>Events</th><th>Action</th></tr></thead><tbody>{data.tenants.map((tenant) => <tr key={tenant.id} data-selected={tenant.id === requestedTenantId ? 'true' : 'false'}><td><strong>{tenant.name}</strong><small>{tenant.location || 'Location not recorded'} · {pretty(tenant.status)}</small></td><td><span className="platform-billing__badge" data-tone={tenant.billing_status === 'past_due' || tenant.billing_status === 'cancelled' ? 'danger' : tenant.billing_status === 'active' || tenant.billing_status === 'comped' ? 'good' : 'neutral'}>{pretty(tenant.billing_status)}</span></td><td>{tenant.plan_code || 'Not configured'}</td><td><strong>{formatDateTime(tenant.current_period_ends_at)}</strong><small>Trial {formatDateTime(tenant.trial_ends_at)}</small></td><td className="platform-billing__wrap">{tenant.billing_customer_reference || 'Not linked'}</td><td><strong>{tenant.billing_event_count || 0}</strong><small>Last {formatDateTime(tenant.last_billing_event_at)}</small></td><td><button type="button" className="app-button app-button--secondary" onClick={() => updateParams({ tenant_id: tenant.id })}>{tenant.id === requestedTenantId ? 'Selected' : 'Open'}</button></td></tr>)}</tbody></table></div> : data ? <div className="platform-billing__empty"><strong>No tenants matched.</strong><span>No tenant billing record matched the current filters.</span></div> : null}
      {pagination ? <div className="platform-billing__pagination"><span>Showing {pageStart}–{pageEnd} of {pagination.total}</span><button type="button" className="app-button app-button--secondary" disabled={pagination.offset === 0 || overviewQuery.isFetching} onClick={() => updateParams({ offset: String(Math.max(0, pagination.offset - PAGE_SIZE)) })}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!pagination.has_more || overviewQuery.isFetching} onClick={() => updateParams({ offset: String(pagination.offset + PAGE_SIZE) })}>Next</button></div> : null}
      {reconciliationResult ? <div className="platform-billing__reconciliation"><strong>{reconciliationResult.dry_run ? 'Reconciliation preview' : 'Reconciliation applied'}</strong><span>Inspected {reconciliationResult.inspected_count}; issues {reconciliationResult.issue_count}; applied {reconciliationResult.applied_count}.</span>{reconciliationResult.actions.slice(0, 12).map((action) => <small key={`${action.tenant_id}-${action.action}`}>{action.tenant_name || action.tenant_id}: {pretty(action.action)} · {action.reason}</small>)}</div> : null}
    </section>

    {requestedTenantId ? <section className="io-workspace-panel platform-billing__section">
      <OperationalSectionHeader iconPath="/platform/billing" title="Selected tenant billing workbench" description="Profile fields, lifecycle status and operator/provider evidence are separated so ordinary edits cannot silently manufacture billing-state history." />
      {!detailsQuery.data && detailsQuery.isLoading ? <div className="platform-billing__loading">Loading selected tenant Billing evidence…</div> : null}
      {!detailsQuery.data && detailsQuery.isError ? <div className="platform-billing__blocking-error"><strong>Selected tenant billing could not be loaded.</strong><span>{readableError(detailsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void detailsQuery.refetch()}>Retry</button></div> : null}
      {detailsQuery.data ? <>
        <div className="platform-billing__selected-heading"><div><strong>{detailsQuery.data.tenant.name}</strong><span>{pretty(detailsQuery.data.tenant.billing_status)} · {detailsQuery.data.tenant.plan_code || 'No plan'} · {detailsQuery.data.tenant.billing_customer_reference || 'No provider reference'}</span></div>{canReadAudit ? <Link to={`/platform/audit?tenant_id=${encodeURIComponent(requestedTenantId)}&source=billing`}>Audit evidence</Link> : null}</div>

        <div className="platform-billing__workbench-grid">
          <article className="platform-billing__card"><h3>Billing profile</h3><p>Plan linkage, provider reference, dates and notes. Subscription status is changed separately.</p><div className="platform-billing__form-grid">
            <label>Plan<select value={billingForm.plan_code} onChange={(event) => setBillingForm({ ...billingForm, plan_code: event.target.value })}><option value="">No catalog plan</option>{(catalogQuery.data?.plans || []).map((plan) => <option key={plan.plan_code} value={plan.plan_code}>{plan.plan_code} · {plan.commercial_tier}</option>)}</select></label>
            <label>Billing customer reference<input value={billingForm.billing_customer_reference} onChange={(event) => setBillingForm({ ...billingForm, billing_customer_reference: event.target.value })} /></label>
            <label>Trial ends<input type="date" value={billingForm.trial_ends_at} onChange={(event) => setBillingForm({ ...billingForm, trial_ends_at: event.target.value })} /></label>
            <label>Current period ends<input type="date" value={billingForm.current_period_ends_at} onChange={(event) => setBillingForm({ ...billingForm, current_period_ends_at: event.target.value })} /></label>
            <label className="platform-billing__span">Billing notes<textarea value={billingForm.billing_notes} onChange={(event) => setBillingForm({ ...billingForm, billing_notes: event.target.value })} /></label>
          </div>{selectedPlan ? <div className="platform-billing__plan-summary"><strong>{selectedPlan.plan_code} · {selectedPlan.commercial_tier}</strong><span>Limits: {keyValues(selectedPlan.limits)}</span><span>Features: {keyValues(selectedPlan.feature_flags)}</span></div> : null}<button type="button" className="app-button" disabled={!canWrite || !profileChanged || profileInvalid || saveProfile.isPending} onClick={() => saveProfile.mutate()}>{saveProfile.isPending ? 'Saving…' : 'Save profile'}</button>{profileInvalid ? <div className="platform-billing__validation">Choose a catalog plan and keep current-period end on/after trial end.</div> : null}</article>

          <article className="platform-billing__card"><h3>Record billing status</h3><p>Dedicated lifecycle action. A reason is required and a status-history event is written atomically with the tenant change.</p><label>Status<select value={statusForm.billing_status} onChange={(event) => setStatusForm({ ...statusForm, billing_status: event.target.value })}>{billingStatuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label><label>Reason<textarea value={statusForm.reason} maxLength={1000} onChange={(event) => setStatusForm({ ...statusForm, reason: event.target.value })} placeholder="Why is the application billing state changing?" /></label><button type="button" className="app-button" disabled={!canWrite || statusInvalid || changeStatus.isPending} onClick={() => window.confirm(`Record billing status ${statusForm.billing_status}?`) && changeStatus.mutate()}>{changeStatus.isPending ? 'Recording…' : 'Record status'}</button></article>

          <article className="platform-billing__card"><h3>Record subscription renewal</h3><p>This extends the application subscription period and records an operator renewal assertion. It does <strong>not</strong> create payment-received evidence.</p><label>New period end<input type="date" value={renewalForm.current_period_ends_at} onChange={(event) => setRenewalForm({ ...renewalForm, current_period_ends_at: event.target.value })} /></label><div className="platform-billing__form-grid"><label>Amount cents (optional)<input value={renewalForm.amount_cents} onChange={(event) => setRenewalForm({ ...renewalForm, amount_cents: event.target.value })} /></label><label>Currency<input value={renewalForm.currency} onChange={(event) => setRenewalForm({ ...renewalForm, currency: event.target.value.toUpperCase() })} /></label><label className="platform-billing__span">External reference<input value={renewalForm.external_reference} onChange={(event) => setRenewalForm({ ...renewalForm, external_reference: event.target.value })} /></label><label className="platform-billing__span">Note<textarea value={renewalForm.note} onChange={(event) => setRenewalForm({ ...renewalForm, note: event.target.value })} /></label></div><label className="platform-billing__checkbox"><input type="checkbox" checked={renewalForm.allow_cancelled_renewal} onChange={(event) => setRenewalForm({ ...renewalForm, allow_cancelled_renewal: event.target.checked })} />Allow renewal from cancelled state</label>{renewalError ? <div className="platform-billing__validation">{renewalError}</div> : null}<button type="button" className="app-button" disabled={!canWrite || Boolean(renewalError) || renew.isPending} onClick={() => window.confirm('Record this subscription-period renewal assertion?') && renew.mutate()}>{renew.isPending ? 'Recording…' : 'Record renewal'}</button></article>

          <article className="platform-billing__card"><h3>Add operator billing event</h3><p>Manual events are application/operator assertions. Provider-generated payment success and internal status/plan-change events cannot be forged here.</p><div className="platform-billing__form-grid"><label>Event type<select value={eventForm.event_type} onChange={(event) => setEventForm({ ...eventForm, event_type: event.target.value })}>{manualEventTypes.map((type) => <option key={type} value={type}>{pretty(type)}</option>)}</select></label><label>Amount cents<input value={eventForm.amount_cents} onChange={(event) => setEventForm({ ...eventForm, amount_cents: event.target.value })} /></label><label>Currency<input value={eventForm.currency} onChange={(event) => setEventForm({ ...eventForm, currency: event.target.value.toUpperCase() })} /></label><label>External reference<input value={eventForm.external_reference} onChange={(event) => setEventForm({ ...eventForm, external_reference: event.target.value })} /></label><label className="platform-billing__span">Note<textarea value={eventForm.note} onChange={(event) => setEventForm({ ...eventForm, note: event.target.value })} /></label></div>{manualEventError ? <div className="platform-billing__validation">{manualEventError}</div> : null}<button type="button" className="app-button" disabled={!canWrite || Boolean(manualEventError) || createEvent.isPending} onClick={() => createEvent.mutate()}>{createEvent.isPending ? 'Adding…' : 'Add operator event'}</button></article>
        </div>

        <article className="platform-billing__card platform-billing__provider-card"><h3>Payment-provider ingestion</h3><p>Use this only for real provider event evidence. Provider event IDs are deduplicated and customer reference is revalidated against the locked tenant before lifecycle state changes commit.</p><div className="platform-billing__form-grid platform-billing__form-grid--wide">
          <label>Provider<input value={providerForm.provider} onChange={(event) => setProviderForm({ ...providerForm, provider: event.target.value })} /></label><label>Event type<select value={providerForm.provider_event_type} onChange={(event) => setProviderForm({ ...providerForm, provider_event_type: event.target.value })}>{providerEventTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label>Provider event ID<input value={providerForm.provider_event_id} onChange={(event) => setProviderForm({ ...providerForm, provider_event_id: event.target.value })} /></label><label>Provider created at<input type="datetime-local" value={providerForm.provider_event_created_at} onChange={(event) => setProviderForm({ ...providerForm, provider_event_created_at: event.target.value })} /></label><label>Billing customer reference<input value={providerForm.billing_customer_reference} onChange={(event) => setProviderForm({ ...providerForm, billing_customer_reference: event.target.value })} /></label><label>Amount cents<input value={providerForm.amount_cents} onChange={(event) => setProviderForm({ ...providerForm, amount_cents: event.target.value })} /></label><label>Currency<input value={providerForm.currency} onChange={(event) => setProviderForm({ ...providerForm, currency: event.target.value.toUpperCase() })} /></label><label>Current period ends<input type="date" value={providerForm.current_period_ends_at} onChange={(event) => setProviderForm({ ...providerForm, current_period_ends_at: event.target.value })} /></label><label>Trial ends<input type="date" value={providerForm.trial_ends_at} onChange={(event) => setProviderForm({ ...providerForm, trial_ends_at: event.target.value })} /></label><label className="platform-billing__span">Provider signature (manual ingestion evidence only)<input value={providerForm.provider_signature} onChange={(event) => setProviderForm({ ...providerForm, provider_signature: event.target.value })} /></label><label className="platform-billing__span">Raw provider payload JSON<textarea value={providerForm.raw_payload} onChange={(event) => setProviderForm({ ...providerForm, raw_payload: event.target.value })} /></label><label className="platform-billing__span">Provider note<textarea value={providerForm.note} onChange={(event) => setProviderForm({ ...providerForm, note: event.target.value })} /></label>
        </div>{providerError ? <div className="platform-billing__validation">{providerError}</div> : null}<button type="button" className="app-button" disabled={!canWrite || Boolean(providerError) || ingestProvider.isPending} onClick={() => ingestProvider.mutate()}>{ingestProvider.isPending ? 'Ingesting…' : 'Ingest provider event'}</button>{providerResult ? <div className="platform-billing__provider-result"><strong>{providerResult.duplicate ? 'Duplicate ignored' : 'Provider event accepted'}</strong><span>Mapped event: {pretty(providerResult.mapped_event_type)}</span></div> : null}</article>

        <div className="platform-billing__history"><OperationalSectionHeader iconPath="/platform/audit" title="Billing event history" description="Newest 100 billing events for the selected tenant. Creator identity is independently protected by PLATFORM_USERS_READ." />{detailsQuery.data.events.length ? detailsQuery.data.events.map((event) => <article key={event.id} className="platform-billing__history-item"><div><strong>{pretty(event.event_type)}</strong><span>{formatDateTime(event.created_at)} · {money(event.amount_cents, event.currency)}</span></div><div><strong>{event.external_reference || 'No external reference'}</strong><span>{event.note || 'No note'}</span></div><div><strong>{event.created_by_identity_restricted ? 'Restricted operator' : event.created_by_name || event.created_by_email || 'System/provider'}</strong><span>{event.created_by_identity_restricted ? 'PLATFORM_USERS_READ required' : event.created_by_email || 'No operator email'}</span></div>{canReadAudit ? <Link to={`/platform/audit?target_type=platform_billing_events&target_id=${encodeURIComponent(event.id)}`}>Audit evidence</Link> : null}</article>) : <div className="platform-billing__empty">No billing events recorded for this tenant.</div>}</div>
      </> : null}
    </section> : null}

    <section className="io-workspace-panel platform-billing__section">
      <OperationalSectionHeader iconPath="/platform/billing" title="Provider readiness and evidence interpretation" description="Billing is application/control-plane evidence. External commercial outcomes require evidence outside these database rows." />
      <div className="platform-billing__truth-grid"><div><strong>Billing status</strong><span>Application subscription/access state. It does not independently prove an invoice was sent, paid, refunded or legally collectible.</span></div><div><strong>Manual billing event</strong><span>An operator-recorded assertion. It does not independently prove the external event occurred.</span></div><div><strong>Provider event</strong><span>Shows the application accepted provider-shaped evidence under its configured signature/replay/customer-reference controls. It does not prove bank settlement or customer receipt.</span></div><div><strong>Billing customer reference</strong><span>Application linkage to a provider/customer identifier. It does not independently prove ownership of an external provider account.</span></div></div>
      <div className="platform-billing__provider-readiness"><strong>Enabled providers: {providerReadinessQuery.data?.enabled_providers?.join(', ') || 'None'}</strong><span>Configured: {providerReadinessQuery.data?.enabled_provider_count ?? '—'} · Missing secret: {providerReadinessQuery.data?.missing_secret_providers?.join(', ') || 'none'} · Weak secret: {providerReadinessQuery.data?.weak_secret_providers?.join(', ') || 'none'}</span><span>Recent accepted / duplicate / rejected: {providerReadinessQuery.data?.recent_webhook_activity ? `${providerReadinessQuery.data.recent_webhook_activity.accepted_count} / ${providerReadinessQuery.data.recent_webhook_activity.duplicate_count} / ${providerReadinessQuery.data.recent_webhook_activity.rejected_count}` : 'Not available'}</span></div>
    </section>

    <section className="io-workspace-panel platform-billing__section">
      <OperationalSectionHeader iconPath="/platform/billing" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." />
      <div className="platform-billing__links"><Link to="/platform/tenants">Tenants</Link><Link to="/platform/billing-subscription-activation">Billing activation</Link><Link to="/platform/subscription-readiness">Subscription readiness</Link>{canReadTenantExports ? <Link to="/platform/tenant-exports">Tenant exports</Link> : null}{canReadAudit ? <Link to={requestedTenantId ? `/platform/audit?tenant_id=${encodeURIComponent(requestedTenantId)}&source=billing` : '/platform/audit?source=billing'}>Billing audit</Link> : null}</div>
    </section>
  </div>;
}
