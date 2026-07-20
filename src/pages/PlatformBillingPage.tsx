import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

type BillingTenant = {
  id: string;
  name: string;
  location?: string | null;
  status?: string;
  billing_status?: string;
  plan_code?: string;
  billing_customer_reference?: string | null;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  billing_notes?: string | null;
  billing_event_count?: number;
  last_billing_event_at?: string | null;
};

type BillingEvent = {
  id: string;
  event_type: string;
  amount_cents?: number | null;
  currency?: string | null;
  external_reference?: string | null;
  note?: string | null;
  created_at: string;
  created_by_email?: string | null;
  created_by_name?: string | null;
};

type BillingDetails = { tenant: BillingTenant; events: BillingEvent[] };

type CommercialPlan = {
  plan_code: string;
  commercial_tier: string;
  limits: Record<string, number>;
  feature_flags: Record<string, boolean>;
  required_limits: string[];
  required_feature_flags: string[];
  recommended_enforcement_mode: string;
};

type PlanCatalogResponse = { plans: CommercialPlan[] };

type PaymentProviderWebhookReadinessProvider = {
  provider: string;
  public_webhook_enabled: boolean;
  provider_specific_secret_required: boolean;
  provider_specific_secret_configured: boolean;
  provider_specific_secret_env_key: string;
  provider_specific_secret_min_length?: number;
  provider_specific_secret_length_ok?: boolean;
  accepting_public_webhooks: boolean;
  public_endpoint_path: string;
};

type PaymentProviderWebhookRateLimit = {
  window_ms: number;
  max_requests: number;
  key_scope: string;
  enforced_by_application: boolean;
};

type PaymentProviderRecentWebhookActivity = {
  window_hours: number;
  accepted_count: number;
  duplicate_count: number;
  rejected_count: number;
  last_accepted_at?: string | null;
  last_rejected_at?: string | null;
  rejection_attention_required: boolean;
};

type PaymentWebhookOperationalHealth = {
  status: 'healthy' | 'warning' | 'critical';
  healthy: boolean;
  attention_required: boolean;
  signals: string[];
  rejection_rate: number;
  duplicate_rate: number;
  last_accepted_at?: string | null;
  last_rejected_at?: string | null;
};

type PaymentProviderWebhookReadiness = {
  enabled_providers: string[];
  enabled_provider_count: number;
  provider_specific_secret_required: boolean;
  generic_fallback_secret_accepted_for_public_webhooks: boolean;
  generic_fallback_secret_configured: boolean;
  replay_window_days: number;
  signature_window_minutes: number;
  provider_specific_secret_min_length?: number;
  public_webhook_rate_limit?: PaymentProviderWebhookRateLimit;
  recent_webhook_activity?: PaymentProviderRecentWebhookActivity;
  webhook_operational_health?: PaymentWebhookOperationalHealth;
  providers: PaymentProviderWebhookReadinessProvider[];
  ready: boolean;
  operational_attention_required?: boolean;
  missing_secret_providers: string[];
  weak_secret_providers?: string[];
};

type BillingReconciliationAction = {
  tenant_id: string;
  tenant_name?: string;
  action: string;
  reason: string;
  previous_billing_status?: string | null;
  next_billing_status?: string | null;
  changed_fields?: string[];
  applied: boolean;
};

type BillingReconciliationResult = {
  dry_run: boolean;
  inspected_count: number;
  issue_count: number;
  applied_count: number;
  actions: BillingReconciliationAction[];
};

type PaymentProviderIngestionResult = {
  duplicate: boolean;
  mapped_event_type: string;
  event?: BillingEvent & { lifecycle_tenant_update?: BillingTenant | null };
  existing_event?: BillingEvent;
};

const billingStatuses = ['not_configured', 'trialing', 'active', 'past_due', 'cancelled', 'comped'];
const eventTypes = ['note', 'invoice_sent', 'payment_failed', 'subscription_cancelled', 'comp_granted', 'billing_status_changed', 'billing_plan_changed'];
const providerEventTypes = ['invoice.payment_succeeded', 'invoice.payment_failed', 'customer.subscription.created', 'customer.subscription.updated', 'checkout.session.completed', 'customer.subscription.deleted', 'customer.subscription.cancelled', 'payment_intent.succeeded', 'payment_intent.payment_failed', 'customer.subscription.trial_extended'];

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function isoDateInput(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function money(cents?: number | null, currency?: string | null): string {
  if (cents === null || cents === undefined) return '-';
  return `${((cents || 0) / 100).toFixed(2)} ${currency || ''}`.trim();
}

function isValidCurrency(value: string): boolean {
  const normalized = value.trim();
  return !normalized || /^[A-Z]{3}$/.test(normalized);
}

function isValidNonNegativeIntegerText(value: string): boolean {
  const normalized = value.trim();
  return !normalized || /^(0|[1-9]\d*)$/.test(normalized);
}

function isFutureDateInput(value: string): boolean {
  if (!value) return false;
  const candidate = new Date(`${value}T23:59:59`);
  if (Number.isNaN(candidate.getTime())) return false;
  return candidate.getTime() > Date.now();
}

function isJsonObjectText(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const parsed = JSON.parse(value);
    return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed));
  } catch {
    return false;
  }
}

function providerEventRequiresCurrentPeriod(type: string): boolean {
  return ['invoice.payment_succeeded', 'payment_intent.succeeded', 'checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated'].includes(type);
}

function providerEventRequiresTrialEnd(type: string): boolean {
  return type === 'customer.subscription.trial_extended';
}

function formatKeyValueMap(value: Record<string, number | boolean>): string {
  const entries = Object.entries(value || {});
  if (!entries.length) return '-';
  return entries.map(([key, item]) => `${key}: ${String(item)}`).join(' · ');
}

export default function PlatformBillingPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [billingForm, setBillingForm] = useState({
    billing_status: 'not_configured',
    plan_code: '',
    billing_customer_reference: '',
    trial_ends_at: '',
    current_period_ends_at: '',
    billing_notes: ''
  });
  const [eventForm, setEventForm] = useState({
    event_type: 'note',
    amount_cents: '',
    currency: 'EUR',
    external_reference: '',
    note: ''
  });
  const [providerEventForm, setProviderEventForm] = useState({
    provider: 'stripe',
    provider_event_type: 'invoice.payment_succeeded',
    provider_event_id: '',
    provider_event_created_at: '',
    provider_signature: '',
    billing_customer_reference: '',
    amount_cents: '',
    currency: 'EUR',
    current_period_ends_at: '',
    trial_ends_at: '',
    note: '',
    raw_payload: ''
  });
  const [providerEventResult, setProviderEventResult] = useState<PaymentProviderIngestionResult | null>(null);
  const [renewalForm, setRenewalForm] = useState({
    current_period_ends_at: '',
    amount_cents: '',
    currency: 'EUR',
    external_reference: '',
    note: '',
    allow_cancelled_renewal: false
  });
  const [reconciliationResult, setReconciliationResult] = useState<BillingReconciliationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_WRITE);
  const overviewQuery = useQuery({
    queryKey: ['platform', 'billing', statusFilter],
    queryFn: () => platformApiRequest<BillingTenant[]>(`/platform/billing${statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : ''}`)
  });
  const planCatalogQuery = useQuery({
    queryKey: ['platform', 'billing', 'plan-catalog'],
    queryFn: () => platformApiRequest<PlanCatalogResponse>('/platform/billing/plan-catalog')
  });
  const webhookReadinessQuery = useQuery({
    queryKey: ['platform', 'billing', 'provider-webhook-readiness'],
    queryFn: () => platformApiRequest<PaymentProviderWebhookReadiness>('/platform/billing/provider-webhook-readiness')
  });
  const detailsQuery = useQuery({
    queryKey: ['platform', 'billing', selectedTenantId],
    queryFn: () => platformApiRequest<BillingDetails>(`/platform/billing/${selectedTenantId}`),
    enabled: Boolean(selectedTenantId)
  });

  const hasLoadError = Boolean(overviewQuery.error || planCatalogQuery.error || webhookReadinessQuery.error || detailsQuery.error);
  const snapshotGeneratedAt = new Date().toLocaleString();
  const currentFilterLabel = statusFilter || 'all statuses';
  const billingRows = overviewQuery.data || [];
  const totalEvents = billingRows.reduce((sum, tenant) => sum + (tenant.billing_event_count || 0), 0);
  const selectedTenantForLinks = selectedTenantId || '';
  const auditBillingLink = '/platform/audit?category=billing';
  const selectedTenantAuditLink = selectedTenantForLinks ? `/platform/audit?tenant_id=${encodeURIComponent(selectedTenantForLinks)}&category=billing` : '/platform/audit?category=billing';

  const refetchBillingSnapshot = async () => {
    setStatusMessage('Refreshing billing snapshot...');
    await Promise.all([
      overviewQuery.refetch(),
      planCatalogQuery.refetch(),
      webhookReadinessQuery.refetch(),
      selectedTenantId ? detailsQuery.refetch() : Promise.resolve()
    ]);
    setStatusMessage('Billing snapshot refreshed.');
  };

  const selectedPlan = (planCatalogQuery.data?.plans || []).find((plan) => plan.plan_code === billingForm.plan_code) || null;
  const selectedBillingTenant = detailsQuery.data?.tenant;
  useEffect(() => {
    if (!selectedBillingTenant) return;
    const tenant = selectedBillingTenant;
    const currentPeriod = isoDateInput(tenant.current_period_ends_at);
    setBillingForm({
      billing_status: tenant.billing_status || 'not_configured',
      plan_code: tenant.plan_code || '',
      billing_customer_reference: tenant.billing_customer_reference || '',
      trial_ends_at: isoDateInput(tenant.trial_ends_at),
      current_period_ends_at: currentPeriod,
      billing_notes: tenant.billing_notes || ''
    });
    setRenewalForm((current) => ({
      ...current,
      current_period_ends_at: current.current_period_ends_at || currentPeriod
    }));
    setProviderEventForm((current) => ({
      ...current,
      current_period_ends_at: current.current_period_ends_at || currentPeriod,
      trial_ends_at: current.trial_ends_at || isoDateInput(tenant.trial_ends_at),
      billing_customer_reference: current.billing_customer_reference || tenant.billing_customer_reference || ''
    }));
  }, [selectedBillingTenant]);

  const saveBilling = useMutation({
    mutationFn: () => platformApiRequest(`/platform/billing/${selectedTenantId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        ...billingForm,
        plan_code: billingForm.plan_code.trim(),
        billing_customer_reference: billingForm.billing_customer_reference.trim(),
        billing_notes: billingForm.billing_notes.trim(),
        trial_ends_at: billingForm.trial_ends_at || null,
        current_period_ends_at: billingForm.current_period_ends_at || null
      })
    }),
    onSuccess: async () => {
      setStatusMessage('Billing profile saved.');
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing', selectedTenantId] });
    }
  });



  const reconcileBilling = useMutation({
    mutationFn: (dryRun: boolean) => platformApiRequest<BillingReconciliationResult>('/platform/billing/reconcile', {
      method: 'POST',
      body: JSON.stringify({ dry_run: dryRun })
    }),
    onSuccess: async (result) => {
      setReconciliationResult(result);
      setStatusMessage(result.dry_run ? 'Billing reconciliation preview generated.' : 'Billing reconciliation applied.');
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] });
      if (selectedTenantId) await queryClient.invalidateQueries({ queryKey: ['platform', 'billing', selectedTenantId] });
    }
  });

  const renewBilling = useMutation({
    mutationFn: () => platformApiRequest(`/platform/billing/${selectedTenantId}/renew`, {
      method: 'POST',
      body: JSON.stringify({
        current_period_ends_at: renewalForm.current_period_ends_at || null,
        amount_cents: renewalForm.amount_cents ? Number.parseInt(renewalForm.amount_cents, 10) : null,
        currency: renewalForm.currency.trim() || null,
        external_reference: renewalForm.external_reference.trim() || null,
        note: renewalForm.note.trim() || null,
        allow_cancelled_renewal: renewalForm.allow_cancelled_renewal
      })
    }),
    onSuccess: async () => {
      setStatusMessage('Subscription renewed.');
      setRenewalForm({ current_period_ends_at: '', amount_cents: '', currency: 'EUR', external_reference: '', note: '', allow_cancelled_renewal: false });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing', selectedTenantId] });
    }
  });

  const ingestProviderEvent = useMutation({
    mutationFn: () => {
      const endpoint = providerEventForm.billing_customer_reference
        ? '/platform/billing/provider-events'
        : `/platform/billing/${selectedTenantId}/provider-events`;
      let rawPayload: unknown = null;
      if (providerEventForm.raw_payload.trim()) {
        rawPayload = JSON.parse(providerEventForm.raw_payload);
      }

      return platformApiRequest<PaymentProviderIngestionResult>(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          provider: providerEventForm.provider.trim() || 'stripe',
          provider_event_type: providerEventForm.provider_event_type.trim() || null,
          provider_event_id: providerEventForm.provider_event_id.trim() || null,
          provider_event_created_at: providerEventForm.provider_event_created_at || (rawPayload ? null : new Date().toISOString()),
          provider_signature: providerEventForm.provider_signature.trim() || null,
          billing_customer_reference: providerEventForm.billing_customer_reference.trim() || null,
          amount_cents: providerEventForm.amount_cents ? Number.parseInt(providerEventForm.amount_cents, 10) : null,
          currency: providerEventForm.currency.trim() || null,
          current_period_ends_at: providerEventForm.current_period_ends_at || null,
          trial_ends_at: providerEventForm.trial_ends_at || null,
          note: providerEventForm.note.trim() || null,
          raw_payload: rawPayload
        })
      });
    },
    onSuccess: async (result) => {
      setProviderEventResult(result);
      setStatusMessage(result.duplicate ? 'Duplicate provider event ignored.' : 'Provider event ingested.');
      setProviderEventForm((current) => ({ ...current, provider_event_id: '', provider_event_created_at: '', provider_signature: '', amount_cents: '', note: '', raw_payload: '' }));
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing', selectedTenantId] });
    }
  });

  const handlePreviewReconciliation = () => {
    setReconciliationResult(null);
    reconcileBilling.mutate(true);
  };

  const handleApplyReconciliation = () => {
    const confirmed = window.confirm(
      'Apply billing reconciliation now? This can change tenant billing statuses and create billing events.'
    );
    if (!confirmed) return;
    setReconciliationResult(null);
    reconcileBilling.mutate(false);
  };

  const handleRenewSubscription = () => {
    const confirmed = window.confirm('Renew this subscription and record billing evidence?');
    if (!confirmed) return;
    renewBilling.mutate();
  };

  const createEvent = useMutation({
    mutationFn: () => platformApiRequest(`/platform/billing/${selectedTenantId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        event_type: eventForm.event_type,
        amount_cents: eventForm.amount_cents ? Number.parseInt(eventForm.amount_cents, 10) : null,
        currency: eventForm.currency.trim() || null,
        external_reference: eventForm.external_reference.trim() || null,
        note: eventForm.note.trim() || null
      })
    }),
    onSuccess: async () => {
      setStatusMessage('Billing event added.');
      setEventForm({ event_type: 'note', amount_cents: '', currency: 'EUR', external_reference: '', note: '' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'billing', selectedTenantId] });
    }
  });

  const selectedTenant = detailsQuery.data?.tenant || null;
  const billingPeriodInvalid = Boolean(billingForm.trial_ends_at && billingForm.current_period_ends_at && billingForm.current_period_ends_at < billingForm.trial_ends_at);
  const billingProfileChanged = Boolean(selectedTenant && (
    billingForm.billing_status !== (selectedTenant.billing_status || 'not_configured')
    || billingForm.plan_code !== (selectedTenant.plan_code || '')
    || billingForm.billing_customer_reference.trim() !== (selectedTenant.billing_customer_reference || '')
    || billingForm.trial_ends_at !== isoDateInput(selectedTenant.trial_ends_at)
    || billingForm.current_period_ends_at !== isoDateInput(selectedTenant.current_period_ends_at)
    || billingForm.billing_notes.trim() !== (selectedTenant.billing_notes || '')
  ));
  const billingProfileInvalid = billingPeriodInvalid || Boolean(billingForm.plan_code && !selectedPlan);
  const billingProfileValidationMessage = billingPeriodInvalid
    ? 'Current period end must be on or after trial end.'
    : billingForm.plan_code && !selectedPlan
      ? 'Pick a supported catalog plan before saving.'
      : '';
  const canSaveBillingProfile = Boolean(canWrite && selectedTenantId && billingProfileChanged && !billingProfileInvalid && !saveBilling.isPending);

  const renewalValidationMessage = !renewalForm.current_period_ends_at
    ? 'Enter a new paid period end date before renewing.'
    : !isFutureDateInput(renewalForm.current_period_ends_at)
      ? 'New paid period end must be a future date.'
      : !isValidNonNegativeIntegerText(renewalForm.amount_cents)
        ? 'Amount cents must be a non-negative whole number.'
        : !isValidCurrency(renewalForm.currency)
          ? 'Currency must be a 3-letter code, for example EUR.'
          : '';
  const canRenewSubscription = Boolean(canWrite && selectedTenantId && !renewalValidationMessage && !renewBilling.isPending);

  const providerRawPayloadInvalid = !isJsonObjectText(providerEventForm.raw_payload);
  const providerHasRawPayload = Boolean(providerEventForm.raw_payload.trim());
  const providerValidationMessage = !providerEventForm.provider.trim()
    ? 'Enter a provider before ingesting.'
    : providerEventForm.provider.trim().toLowerCase() === 'manual'
      ? 'Use Add billing event for manual lifecycle changes; provider ingestion requires a real provider.'
      : providerRawPayloadInvalid
        ? 'Raw provider payload must be valid JSON object text.'
        : !providerHasRawPayload && !providerEventForm.provider_event_type.trim()
          ? 'Select a provider event type or paste a raw payload.'
          : !providerHasRawPayload && !providerEventForm.provider_event_id.trim()
            ? 'Enter a provider event ID or paste a raw payload.'
            : !providerHasRawPayload && providerEventRequiresCurrentPeriod(providerEventForm.provider_event_type) && !providerEventForm.current_period_ends_at
              ? 'Paid/subscription provider events require current period end.'
              : !providerHasRawPayload && providerEventRequiresTrialEnd(providerEventForm.provider_event_type) && !providerEventForm.trial_ends_at
                ? 'Trial-extension provider events require trial end.'
                : !selectedTenantId && !providerEventForm.billing_customer_reference.trim() && !providerHasRawPayload
                  ? 'Enter a billing customer reference when no tenant is selected.'
                  : !isValidNonNegativeIntegerText(providerEventForm.amount_cents)
                    ? 'Amount cents must be a non-negative whole number.'
                    : !isValidCurrency(providerEventForm.currency)
                      ? 'Currency must be a 3-letter code, for example EUR.'
                      : '';
  const canIngestProviderEvent = Boolean(canWrite && (selectedTenantId || providerEventForm.billing_customer_reference.trim() || providerHasRawPayload) && !providerValidationMessage && !ingestProviderEvent.isPending);

  const billingEventValidationMessage = !eventForm.event_type
    ? 'Select a billing event type before adding an event.'
    : !isValidNonNegativeIntegerText(eventForm.amount_cents)
      ? 'Amount cents must be a non-negative whole number.'
      : !isValidCurrency(eventForm.currency)
        ? 'Currency must be a 3-letter code, for example EUR.'
        : '';
  const canCreateBillingEvent = Boolean(canWrite && selectedTenantId && !billingEventValidationMessage && !createEvent.isPending);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Billing</h1>
          <p style={styles.subtitle}>Track tenant billing status, plan references, renewal dates, invoice/payment events, and billing notes. This is internal billing operations, not a payment-provider integration.</p>
        </div>
        <button style={styles.secondaryButton} onClick={() => void refetchBillingSnapshot()} disabled={overviewQuery.isFetching || planCatalogQuery.isFetching || webhookReadinessQuery.isFetching || detailsQuery.isFetching}>
          {overviewQuery.isFetching || planCatalogQuery.isFetching || webhookReadinessQuery.isFetching || detailsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      <section style={styles.panel}>
        <div style={styles.snapshotGrid}>
          <div style={styles.snapshotCard}><strong>Snapshot</strong><span>{snapshotGeneratedAt}</span></div>
          <div style={styles.snapshotCard}><strong>Source</strong><span>GET /platform/billing · plan catalog · webhook readiness</span></div>
          <div style={styles.snapshotCard}><strong>Filter</strong><span>{currentFilterLabel}</span></div>
          <div style={styles.snapshotCard}><strong>Rows / events</strong><span>{billingRows.length} tenants · {totalEvents} billing events</span></div>
        </div>
        <div style={styles.supportLinks}>
          <Link style={styles.supportLink} to="/platform/tenants">Tenants</Link>
          <Link style={styles.supportLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.supportLink} to="/platform/webhooks">Webhooks</Link>
          <Link style={styles.supportLink} to={auditBillingLink}>Billing audit evidence</Link>
        </div>
        {statusMessage ? <div style={styles.successBox}>{statusMessage}</div> : null}
        {hasLoadError ? (
          <div style={styles.errorBox}>
            <strong>Some billing data failed to load.</strong>
            <span>Retry the billing snapshot, plan catalog, webhook readiness, or selected-tenant details before making billing changes.</span>
            <button style={styles.secondaryButton} onClick={() => void refetchBillingSnapshot()}>Retry billing load</button>
          </div>
        ) : null}
        <div style={styles.toolbar}>
          <label>Status filter{' '}
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">all</option>
              {billingStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          {canWrite ? (
            <div style={styles.toolbarActions}>
              <button style={styles.secondaryButton} onClick={handlePreviewReconciliation} disabled={reconcileBilling.isPending}>
                {reconcileBilling.isPending ? 'Working...' : 'Preview billing reconciliation'}
              </button>
              <button style={styles.button} onClick={handleApplyReconciliation} disabled={reconcileBilling.isPending}>
                {reconcileBilling.isPending ? 'Working...' : 'Apply billing reconciliation'}
              </button>
            </div>
          ) : null}
        </div>
        {overviewQuery.error ? <div style={styles.error}>{readableError(overviewQuery.error)}</div> : null}
        {planCatalogQuery.error ? <div style={styles.error}>Plan catalog unavailable: {readableError(planCatalogQuery.error)}</div> : null}
        {webhookReadinessQuery.error ? <div style={styles.error}>Provider webhook readiness unavailable: {readableError(webhookReadinessQuery.error)}</div> : null}
        {webhookReadinessQuery.data ? (
          <div style={webhookReadinessQuery.data.webhook_operational_health?.status === 'critical' ? styles.errorBox : webhookReadinessQuery.data.ready ? styles.successBox : styles.reconciliationBox}>
            <strong>Public provider webhook readiness: {webhookReadinessQuery.data.ready ? 'ready' : 'not ready'}</strong>
            {webhookReadinessQuery.data.webhook_operational_health ? (
              <span>Operational health: {webhookReadinessQuery.data.webhook_operational_health.status.toUpperCase()} · rejection rate {(webhookReadinessQuery.data.webhook_operational_health.rejection_rate * 100).toFixed(1)}% · duplicate rate {(webhookReadinessQuery.data.webhook_operational_health.duplicate_rate * 100).toFixed(1)}%{webhookReadinessQuery.data.webhook_operational_health.signals.length ? ` · signals: ${webhookReadinessQuery.data.webhook_operational_health.signals.join(', ')}` : ''}</span>
            ) : null}
            <span>Enabled providers: {webhookReadinessQuery.data.enabled_providers.join(', ') || 'none'} · Replay window: {webhookReadinessQuery.data.replay_window_days} days · Signature window: {webhookReadinessQuery.data.signature_window_minutes} minutes</span>
            {webhookReadinessQuery.data.public_webhook_rate_limit ? (
              <span>Application rate limit: {webhookReadinessQuery.data.public_webhook_rate_limit.max_requests} requests per {Math.round(webhookReadinessQuery.data.public_webhook_rate_limit.window_ms / 1000)} seconds per {webhookReadinessQuery.data.public_webhook_rate_limit.key_scope}.</span>
            ) : null}
            {webhookReadinessQuery.data.recent_webhook_activity ? (
              <span>
                Last {webhookReadinessQuery.data.recent_webhook_activity.window_hours}h webhook activity: {webhookReadinessQuery.data.recent_webhook_activity.accepted_count} accepted, {webhookReadinessQuery.data.recent_webhook_activity.duplicate_count} duplicate, {webhookReadinessQuery.data.recent_webhook_activity.rejected_count} rejected.
                {webhookReadinessQuery.data.recent_webhook_activity.rejection_attention_required ? ' Investigate rejected webhooks before relying on provider automation.' : ''}
              </span>
            ) : null}
            <span>Provider-specific secrets are required and must be at least {webhookReadinessQuery.data.provider_specific_secret_min_length || 16} characters. Generic fallback secret accepted for public webhooks: {String(webhookReadinessQuery.data.generic_fallback_secret_accepted_for_public_webhooks)}</span>
            {webhookReadinessQuery.data.weak_secret_providers?.length ? (
              <span>Weak provider secrets: {webhookReadinessQuery.data.weak_secret_providers.join(', ')}. Rotate these before enabling public webhooks.</span>
            ) : null}
            {webhookReadinessQuery.data.providers.length ? (
              <ul style={styles.compactList}>
                {webhookReadinessQuery.data.providers.map((provider) => (
                  <li key={provider.provider}>
                    {provider.provider}: {provider.accepting_public_webhooks ? 'accepting signed webhooks' : provider.provider_specific_secret_configured && provider.provider_specific_secret_length_ok === false ? `weak ${provider.provider_specific_secret_env_key}` : `missing ${provider.provider_specific_secret_env_key}`} · {provider.public_endpoint_path}
                  </li>
                ))}
              </ul>
            ) : <span>No public providers enabled.</span>}
          </div>
        ) : null}
        {reconcileBilling.error ? <div style={styles.error}>Billing reconciliation failed: {readableError(reconcileBilling.error)}</div> : null}
        {reconciliationResult ? (
          <div style={styles.reconciliationBox}>
            <strong>{reconciliationResult.dry_run ? 'Billing reconciliation preview' : 'Billing reconciliation applied'}</strong>
            <span>Inspected: {reconciliationResult.inspected_count} · Issues: {reconciliationResult.issue_count} · Applied: {reconciliationResult.applied_count}</span>
            {reconciliationResult.actions.length ? (
              <ul style={styles.compactList}>
                {reconciliationResult.actions.slice(0, 8).map((action) => (
                  <li key={`${action.tenant_id}-${action.action}-${action.reason}`}>
                    {action.tenant_name || action.tenant_id}: {action.action} ({action.reason}) {action.previous_billing_status || '-'} → {action.next_billing_status || '-'}
                  </li>
                ))}
              </ul>
            ) : <span>No billing drift found.</span>}
          </div>
        ) : null}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tenant</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Plan</th>
              <th style={styles.th}>Customer ref</th>
              <th style={styles.th}>Trial ends</th>
              <th style={styles.th}>Period ends</th>
              <th style={styles.th}>Events</th>
            </tr>
          </thead>
          <tbody>
            {(overviewQuery.data || []).map((tenant) => (
              <tr key={tenant.id}>
                <td style={styles.td}><button style={styles.linkButton} onClick={() => setSelectedTenantId(tenant.id)}>{tenant.name}</button></td>
                <td style={styles.td}>{tenant.billing_status || '-'}</td>
                <td style={styles.td}>{tenant.plan_code || '-'}</td>
                <td style={styles.td}>{tenant.billing_customer_reference || '-'}</td>
                <td style={styles.td}>{isoDateInput(tenant.trial_ends_at) || '-'}</td>
                <td style={styles.td}>{isoDateInput(tenant.current_period_ends_at) || '-'}</td>
                <td style={styles.td}>{tenant.billing_event_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selectedTenantId && detailsQuery.data ? (
        <section style={styles.panel}>
          <h2>{detailsQuery.data.tenant.name}</h2>
          <div style={styles.supportLinks}>
            <Link style={styles.supportLink} to={selectedTenantAuditLink}>Tenant billing audit evidence</Link>
            <Link style={styles.supportLink} to={`/platform/tenant-health?tenant_id=${encodeURIComponent(detailsQuery.data.tenant.id)}`}>Tenant health</Link>
            <Link style={styles.supportLink} to="/platform/tenant-exports">Tenant exports</Link>
          </div>
          {canWrite ? (
            <div style={styles.grid}>
              <label style={styles.label}>Billing status
                <select style={styles.input} value={billingForm.billing_status} onChange={(event) => setBillingForm({ ...billingForm, billing_status: event.target.value })}>
                  {billingStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label style={styles.label}>Plan code
                <select style={styles.input} value={billingForm.plan_code} onChange={(event) => setBillingForm({ ...billingForm, plan_code: event.target.value })}>
                  <option value="">no plan</option>
                  {(planCatalogQuery.data?.plans || []).map((plan) => <option key={plan.plan_code} value={plan.plan_code}>{plan.plan_code} · {plan.commercial_tier}</option>)}
                </select>
              </label>
              <label style={styles.label}>Customer reference
                <input style={styles.input} value={billingForm.billing_customer_reference} onChange={(event) => setBillingForm({ ...billingForm, billing_customer_reference: event.target.value })} />
                <span style={styles.helperText}>Must be unique across tenants; provider webhooks use it to resolve the correct tenant.</span>
              </label>
              <label style={styles.label}>Trial ends
                <input style={styles.input} type="date" value={billingForm.trial_ends_at} onChange={(event) => setBillingForm({ ...billingForm, trial_ends_at: event.target.value })} />
              </label>
              <label style={styles.label}>Current period ends
                <input style={styles.input} type="date" value={billingForm.current_period_ends_at} onChange={(event) => setBillingForm({ ...billingForm, current_period_ends_at: event.target.value })} />
              </label>
              <label style={{ ...styles.label, gridColumn: '1 / -1' }}>Billing notes
                <textarea style={styles.textarea} value={billingForm.billing_notes} onChange={(event) => setBillingForm({ ...billingForm, billing_notes: event.target.value })} />
              </label>
              {selectedPlan ? (
                <div style={styles.planSummary}>
                  <strong>{selectedPlan.plan_code} plan entitlements</strong>
                  <span>Mode: {selectedPlan.recommended_enforcement_mode}</span>
                  <span>Limits: {formatKeyValueMap(selectedPlan.limits)}</span>
                  <span>Features: {formatKeyValueMap(selectedPlan.feature_flags)}</span>
                </div>
              ) : null}
              {billingProfileValidationMessage ? <div style={styles.inlineWarning}>{billingProfileValidationMessage}</div> : null}
              <button style={canSaveBillingProfile ? styles.button : styles.disabledButton} onClick={() => saveBilling.mutate()} disabled={!canSaveBillingProfile}>{saveBilling.isPending ? 'Saving...' : 'Save billing profile'}</button>
            </div>
          ) : null}
          {saveBilling.error ? <div style={styles.error}>{readableError(saveBilling.error)}</div> : null}

          {canWrite ? (
            <div style={styles.eventBox}>
              <h3>Renew subscription</h3>
              <p style={styles.helperText}>Use this for a real paid renewal. It sets the tenant to active, extends the paid period, records a payment event, and adds status-change evidence when needed.</p>
              <div style={styles.grid}>
                <label style={styles.label}>New period ends
                  <input style={styles.input} type="date" value={renewalForm.current_period_ends_at} onChange={(event) => setRenewalForm({ ...renewalForm, current_period_ends_at: event.target.value })} />
                </label>
                <label style={styles.label}>Amount cents
                  <input style={styles.input} inputMode="numeric" value={renewalForm.amount_cents} onChange={(event) => setRenewalForm({ ...renewalForm, amount_cents: event.target.value })} />
                </label>
                <label style={styles.label}>Currency
                  <input style={styles.input} value={renewalForm.currency} onChange={(event) => setRenewalForm({ ...renewalForm, currency: event.target.value.toUpperCase() })} />
                </label>
                <label style={styles.label}>External invoice/payment reference
                  <input style={styles.input} value={renewalForm.external_reference} onChange={(event) => setRenewalForm({ ...renewalForm, external_reference: event.target.value })} />
                </label>
                <label style={{ ...styles.label, gridColumn: '1 / -1' }}>Renewal note
                  <textarea style={styles.textarea} value={renewalForm.note} onChange={(event) => setRenewalForm({ ...renewalForm, note: event.target.value })} />
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={renewalForm.allow_cancelled_renewal} onChange={(event) => setRenewalForm({ ...renewalForm, allow_cancelled_renewal: event.target.checked })} />
                  Allow cancelled tenant renewal override
                </label>
                {renewalValidationMessage ? <div style={styles.inlineWarning}>{renewalValidationMessage}</div> : null}
                <button style={canRenewSubscription ? styles.button : styles.disabledButton} onClick={handleRenewSubscription} disabled={!canRenewSubscription}>{renewBilling.isPending ? 'Renewing...' : 'Renew subscription'}</button>
              </div>
              {renewBilling.error ? <div style={styles.error}>{readableError(renewBilling.error)}</div> : null}
            </div>
          ) : null}

          {canWrite ? (
            <div style={styles.eventBox}>
              <h3>Ingest payment-provider event</h3>
              <p style={styles.helperText}>Use this to process real payment-provider events into billing lifecycle actions. Manual lifecycle notes must use the billing-event form. Customer references must be unique; this prevents one provider customer from being applied to multiple tenants. You can enter normalized fields or paste a raw Stripe-like event payload; raw payloads can provide event ID, type, timestamp, customer, amount, currency, and billing period automatically. The readiness panel above shows exactly which public providers are enabled, which provider-specific secrets are missing or too weak, and which endpoint paths can accept signed webhooks. Accepted, duplicate, rate-limited, and rejected webhook attempts are protected/audited with event/customer/error fingerprints and payload hashes; raw provider payload text is not stored in billing metadata or webhook audit entries. The readiness panel also summarizes the last 24 hours of webhook acceptance/rejection activity and flags degraded webhook health when rejection or duplicate rates become unsafe.</p>
              <div style={styles.grid}>
                <label style={styles.label}>Provider
                  <input style={styles.input} value={providerEventForm.provider} onChange={(event) => setProviderEventForm({ ...providerEventForm, provider: event.target.value })} />
                </label>
                <label style={styles.label}>Provider event type
                  <select style={styles.input} value={providerEventForm.provider_event_type} onChange={(event) => setProviderEventForm({ ...providerEventForm, provider_event_type: event.target.value })}>
                    {providerEventTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label style={styles.label}>Provider event ID
                  <input style={styles.input} value={providerEventForm.provider_event_id} onChange={(event) => setProviderEventForm({ ...providerEventForm, provider_event_id: event.target.value })} />
                </label>
                <label style={styles.label}>Provider signature
                  <input style={styles.input} value={providerEventForm.provider_signature} onChange={(event) => setProviderEventForm({ ...providerEventForm, provider_signature: event.target.value })} placeholder="t=...,v1=..." />
                </label>
                <label style={styles.label}>Billing customer reference
                  <input style={styles.input} value={providerEventForm.billing_customer_reference} onChange={(event) => setProviderEventForm({ ...providerEventForm, billing_customer_reference: event.target.value })} placeholder={selectedTenantId ? 'Optional; current tenant is fallback' : 'Required without tenant selection'} />
                </label>
                <label style={styles.label}>Amount cents
                  <input style={styles.input} inputMode="numeric" value={providerEventForm.amount_cents} onChange={(event) => setProviderEventForm({ ...providerEventForm, amount_cents: event.target.value })} />
                </label>
                <label style={styles.label}>Currency
                  <input style={styles.input} value={providerEventForm.currency} onChange={(event) => setProviderEventForm({ ...providerEventForm, currency: event.target.value.toUpperCase() })} />
                </label>
                <label style={styles.label}>Current period ends
                  <input style={styles.input} type="date" value={providerEventForm.current_period_ends_at} onChange={(event) => setProviderEventForm({ ...providerEventForm, current_period_ends_at: event.target.value })} />
                </label>
                <label style={styles.label}>Trial ends
                  <input style={styles.input} type="date" value={providerEventForm.trial_ends_at} onChange={(event) => setProviderEventForm({ ...providerEventForm, trial_ends_at: event.target.value })} />
                </label>
                <label style={{ ...styles.label, gridColumn: '1 / -1' }}>Raw provider payload JSON
                  <textarea style={styles.textarea} value={providerEventForm.raw_payload} onChange={(event) => setProviderEventForm({ ...providerEventForm, raw_payload: event.target.value })} placeholder='{ "id": "evt_...", "type": "invoice.payment_succeeded", "created": 1760000000, "data": { "object": { "customer": "cus_..." } } }' />
                </label>
                <label style={{ ...styles.label, gridColumn: '1 / -1' }}>Provider note
                  <textarea style={styles.textarea} value={providerEventForm.note} onChange={(event) => setProviderEventForm({ ...providerEventForm, note: event.target.value })} />
                </label>
                {providerValidationMessage ? <div style={styles.inlineWarning}>{providerValidationMessage}</div> : null}
                <button style={canIngestProviderEvent ? styles.button : styles.disabledButton} onClick={() => ingestProviderEvent.mutate()} disabled={!canIngestProviderEvent}>{ingestProviderEvent.isPending ? 'Ingesting...' : 'Ingest provider event'}</button>
              </div>
              {ingestProviderEvent.error ? <div style={styles.error}>{readableError(ingestProviderEvent.error)}</div> : null}
              {providerEventResult ? (
                <div style={providerEventResult.duplicate ? styles.reconciliationBox : styles.successBox}>
                  <strong>{providerEventResult.duplicate ? 'Duplicate provider event ignored' : 'Provider event ingested'}</strong>
                  <span>Mapped to: {providerEventResult.mapped_event_type}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {canWrite ? (
            <div style={styles.eventBox}>
              <h3>Add billing event</h3>
              <div style={styles.grid}>
                <label style={styles.label}>Event type
                  <select style={styles.input} value={eventForm.event_type} onChange={(event) => setEventForm({ ...eventForm, event_type: event.target.value })}>
                    {eventTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                <label style={styles.label}>Amount cents
                  <input style={styles.input} inputMode="numeric" value={eventForm.amount_cents} onChange={(event) => setEventForm({ ...eventForm, amount_cents: event.target.value })} />
                </label>
                <label style={styles.label}>Currency
                  <input style={styles.input} value={eventForm.currency} onChange={(event) => setEventForm({ ...eventForm, currency: event.target.value.toUpperCase() })} />
                </label>
                <label style={styles.label}>External reference
                  <input style={styles.input} value={eventForm.external_reference} onChange={(event) => setEventForm({ ...eventForm, external_reference: event.target.value })} />
                </label>
                <label style={{ ...styles.label, gridColumn: '1 / -1' }}>Note
                  <textarea style={styles.textarea} value={eventForm.note} onChange={(event) => setEventForm({ ...eventForm, note: event.target.value })} />
                </label>
                {billingEventValidationMessage ? <div style={styles.inlineWarning}>{billingEventValidationMessage}</div> : null}
                <button style={canCreateBillingEvent ? styles.button : styles.disabledButton} onClick={() => createEvent.mutate()} disabled={!canCreateBillingEvent}>{createEvent.isPending ? 'Adding...' : 'Add event'}</button>
              </div>
              {createEvent.error ? <div style={styles.error}>{readableError(createEvent.error)}</div> : null}
            </div>
          ) : null}

          <h3>Billing history</h3>
          <div style={styles.events}>
            {detailsQuery.data.events.map((event) => (
              <div key={event.id} style={styles.eventItem}>
                <strong>{event.event_type}</strong>
                <span>{new Date(event.created_at).toLocaleString()}</span>
                <span>{money(event.amount_cents, event.currency)}</span>
                <span>{event.external_reference || '-'}</span>
                <Link style={styles.supportLink} to={`/platform/audit?search=${encodeURIComponent(event.id || event.event_type)}`}>Audit evidence</Link>
                <p>{event.note || 'No note'}</p>
              </div>
            ))}
            {!detailsQuery.data.events.length ? <p>No billing events yet.</p> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '30px' },
  subtitle: { color: '#6b7280', maxWidth: '820px' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)' },
  snapshotGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' },
  snapshotCard: { display: 'grid', gap: '4px', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '12px', background: '#f9fafb', color: '#374151', fontSize: '13px' },
  supportLinks: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' },
  supportLink: { color: '#2563eb', fontWeight: 700, fontSize: '13px', textDecoration: 'none' },
  toolbar: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' },
  toolbarActions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px', color: '#6b7280' },
  td: { padding: '10px', borderBottom: '1px solid #f3f4f6' },
  linkButton: { border: 0, background: 'transparent', color: '#2563eb', cursor: 'pointer', fontWeight: 700, padding: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 700, fontSize: '13px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' },
  input: { padding: '10px', border: '1px solid #d1d5db', borderRadius: '10px' },
  textarea: { padding: '10px', border: '1px solid #d1d5db', borderRadius: '10px', minHeight: '80px' },
  button: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  disabledButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#d1d5db', color: '#fff', cursor: 'not-allowed', fontWeight: 700 },
  inlineWarning: { gridColumn: '1 / -1', color: '#92400e', background: '#fffbeb', border: '1px solid #f59e0b', padding: '10px', borderRadius: '10px', fontSize: '13px' },
  secondaryButton: { padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px', background: '#fff', color: '#111827', cursor: 'pointer', fontWeight: 700 },
  eventBox: { marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' },
  planSummary: { gridColumn: '1 / -1', display: 'grid', gap: '6px', padding: '12px', border: '1px solid #bfdbfe', borderRadius: '12px', background: '#eff6ff', color: '#1e3a8a', fontSize: '13px' },
  reconciliationBox: { display: 'grid', gap: '6px', padding: '12px', border: '1px solid #fde68a', borderRadius: '12px', background: '#fffbeb', color: '#92400e', marginBottom: '12px', fontSize: '13px' },
  successBox: { display: 'grid', gap: '6px', padding: '12px', border: '1px solid #bbf7d0', borderRadius: '12px', background: '#f0fdf4', color: '#166534', marginTop: '12px', fontSize: '13px' },
  helperText: { color: '#6b7280', marginTop: 0, fontSize: '13px' },
  compactList: { margin: 0, paddingLeft: '18px' },
  events: { display: 'grid', gap: '10px' },
  eventItem: { display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '12px', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px' },
  error: { color: '#b91c1c', background: '#fee2e2', padding: '10px', borderRadius: '10px', marginTop: '10px' },
  errorBox: { display: 'grid', gap: '6px', padding: '12px', border: '1px solid #fecaca', borderRadius: '12px', background: '#fef2f2', color: '#991b1b', marginTop: '12px', fontSize: '13px' }
};
