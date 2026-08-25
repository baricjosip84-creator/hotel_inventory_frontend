import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformSubscriptionReadinessPage.css';

type SubscriptionItem = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  billing_status: string;
  plan_code?: string | null;
  billing_customer_reference_present: boolean;
  trial_ends_at?: string | null;
  current_period_ends_at?: string | null;
  days_until_trial_end?: number | null;
  days_until_period_end?: number | null;
  billing_event_count: number;
  payment_provider_event_count: number;
  operator_recorded_event_count: number;
  last_billing_event_at?: string | null;
  last_payment_provider_event_at?: string | null;
  risk_flags: string[];
  readiness_state: 'subscription_ready' | 'subscription_review_required' | 'subscription_blocked';
};

type SubscriptionSummary = {
  tenants_reviewed: number;
  ready_tenants: number;
  tenants_requiring_review: number;
  blocked_tenants: number;
  trials_ending_soon: number;
  periods_ending_soon: number;
  past_due_tenants: number;
  missing_plan_codes: number;
  missing_customer_references: number;
  missing_billing_event_history: number;
  payment_provider_events: number;
  operator_recorded_events: number;
};

type SubscriptionPackage = {
  feature: string;
  generated_at: string;
  posture: string;
  summary: SubscriptionSummary;
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  evidence_access: { tenant_identity: boolean; billing_subscription: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_complete: boolean;
  required_permissions_by_source: Record<string, string[]>;
  truth_contract: Record<string, boolean>;
  items: SubscriptionItem[];
};

const PAGE_SIZE = 50;
const BILLING_STATUSES = ['not_configured', 'trialing', 'active', 'past_due', 'cancelled', 'comped'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function pretty(value?: string | null) {
  return value ? value.replaceAll('_', ' ') : 'Not recorded';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

function stateTone(value: string) {
  if (value === 'subscription_blocked') return 'danger' as const;
  if (value === 'subscription_review_required') return 'warn' as const;
  return 'good' as const;
}

export default function PlatformSubscriptionReadinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedStatus = searchParams.get('status') || '';
  const status = BILLING_STATUSES.includes(requestedStatus) ? requestedStatus : '';
  const requestedSearch = searchParams.get('search') || '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);
  const invalidFilters = Boolean((requestedTenantId && !UUID_RE.test(requestedTenantId)) || (requestedStatus && !status) || (requestedSearch && !search));

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (requestedTenantId) params.set('tenant_id', requestedTenantId);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [requestedTenantId, status, search, offset]);

  const readinessQuery = useQuery({
    queryKey: ['platform', 'subscription-readiness', queryString],
    queryFn: () => platformApiRequest<SubscriptionPackage>(`/platform/subscription-readiness?${queryString}`),
    enabled: !invalidFilters,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });

  const data = readinessQuery.data;
  const summary = data?.summary;
  const items = Array.isArray(data?.items) ? data.items.map((item) => ({ ...item, risk_flags: Array.isArray(item.risk_flags) ? item.risk_flags : [] })) : [];
  const pagination = data?.pagination;
  const selectedTenant = requestedTenantId ? items.find((item) => item.tenant_id === requestedTenantId) : null;
  const showingStaleSnapshot = Boolean(readinessQuery.isError && data);

  function updateFilters(next: { tenant_id?: string; status?: string; search?: string; offset?: number }) {
    const params = new URLSearchParams(searchParams);
    const entries: Array<[string, string | number | undefined]> = Object.entries(next) as Array<[string, string | number | undefined]>;
    for (const [key, value] of entries) {
      if (value === undefined || value === '' || value === 0) params.delete(key);
      else params.set(key, String(value));
    }
    if (!Object.prototype.hasOwnProperty.call(next, 'offset')) params.delete('offset');
    setSearchParams(params, { replace: true });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  return <div className="io-operational-page io-workspace-page platform-subscription-readiness">
    <OperationalWorkspaceHero
      iconPath="/platform/subscription-readiness"
      eyebrow="Platform commercial evidence"
      title="Subscription readiness"
      description="Review application billing/subscription configuration, lifecycle windows and billing-history evidence before commercial activation or renewal decisions."
      meta={<>
        <OperationalWorkspaceMetaPill>Tenant identity protected by TENANTS_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Billing evidence protected by PLATFORM_BILLING_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Read only</OperationalWorkspaceMetaPill>
      </>}
      aside={<div className="platform-subscription-readiness__hero-aside">
        <OperationalWorkspaceStatus value={pretty(data?.posture || 'Loading')} label="Current application posture" />
        <button type="button" className="app-button app-button--secondary" onClick={() => readinessQuery.refetch()} disabled={readinessQuery.isFetching || invalidFilters}>
          {readinessQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>}
    />

    {invalidFilters ? <section className="platform-subscription-readiness__error"><strong>Invalid readiness filters.</strong><span>Clear the URL filters and retry.</span><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></section> : null}
    {readinessQuery.isError && !data && !invalidFilters ? <section className="platform-subscription-readiness__blocking-error"><strong>Subscription readiness failed to load.</strong><span>{readableError(readinessQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => readinessQuery.refetch()}>Retry</button></section> : null}
    {showingStaleSnapshot ? <section className="platform-subscription-readiness__warning"><strong>Showing the last successful snapshot.</strong><span>The latest refresh failed: {readableError(readinessQuery.error)}</span></section> : null}

    <OperationalWorkspaceStats ariaLabel="Subscription readiness summary">
      <OperationalWorkspaceStatCard label="Reviewed" value={summary?.tenants_reviewed ?? '—'} helper="Registry-wide for current filters" loading={readinessQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Ready" value={summary?.ready_tenants ?? '—'} tone="good" helper="Application readiness clear" loading={readinessQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Review" value={summary?.tenants_requiring_review ?? '—'} tone="warn" helper="Attention but not hard-blocked" loading={readinessQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Blocked" value={summary?.blocked_tenants ?? '—'} tone="danger" helper="Billing/period blocker present" loading={readinessQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Past due" value={summary?.past_due_tenants ?? '—'} tone="danger" helper="Application billing status" loading={readinessQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="No billing history" value={summary?.missing_billing_event_history ?? '—'} tone="warn" helper="No application billing-event rows" loading={readinessQuery.isLoading && !data} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-subscription-readiness__section">
      <OperationalSectionHeader iconPath="/platform/subscription-readiness" title="Readiness filters" description="Filters are URL-backed so links from Billing, Customer Success and other Platform workspaces open the intended tenant evidence." />
      <div className="platform-subscription-readiness__filters">
        <label>Search tenant / plan / customer reference
          <input value={search} maxLength={200} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Search…" />
        </label>
        <label>Billing status
          <select value={status} onChange={(event) => updateFilters({ status: event.target.value })}>
            <option value="">All statuses</option>
            {BILLING_STATUSES.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}
          </select>
        </label>
        <div className="platform-subscription-readiness__filter-actions">
          {requestedTenantId ? <span className="platform-subscription-readiness__scope">Tenant: {selectedTenant?.tenant_name || requestedTenantId}</span> : null}
          {(requestedTenantId || status || search) ? <button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button> : null}
        </div>
      </div>
    </section>

    <section className="io-workspace-panel platform-subscription-readiness__section">
      <OperationalSectionHeader iconPath="/platform/billing" title="Tenant subscription evidence" description="The table is paginated; KPI totals describe the full filtered registry, not just this page." />
      {readinessQuery.isLoading && !data ? <div className="platform-subscription-readiness__empty">Loading subscription readiness…</div> : null}
      {data ? <>
        <div className="platform-subscription-readiness__table-wrap"><table className="platform-subscription-readiness__table">
          <thead><tr><th>Tenant</th><th>Billing</th><th>Plan</th><th>Lifecycle windows</th><th>Billing history</th><th>Readiness</th><th>Evidence</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.tenant_id}>
            <td><strong>{item.tenant_name}</strong><small>{pretty(item.tenant_status)}</small></td>
            <td><span className="platform-subscription-readiness__badge" data-tone={stateTone(item.readiness_state)}>{pretty(item.billing_status)}</span><small>Customer reference: {item.billing_customer_reference_present ? 'recorded' : 'missing / not required'}</small></td>
            <td><strong>{item.plan_code || 'Not recorded'}</strong></td>
            <td><strong>Trial: {item.days_until_trial_end ?? '—'} days</strong><small>{formatDateTime(item.trial_ends_at)}</small><strong>Period: {item.days_until_period_end ?? '—'} days</strong><small>{formatDateTime(item.current_period_ends_at)}</small></td>
            <td><strong>{item.billing_event_count} total</strong><small>{item.payment_provider_event_count} provider-shaped · {item.operator_recorded_event_count} operator-recorded</small><small>Last: {formatDateTime(item.last_billing_event_at)}</small></td>
            <td><span className="platform-subscription-readiness__badge" data-tone={stateTone(item.readiness_state)}>{pretty(item.readiness_state)}</span><div className="platform-subscription-readiness__flags">{item.risk_flags.length ? item.risk_flags.map((flag) => <span key={flag}>{pretty(flag)}</span>) : <small>No readiness flags</small>}</div></td>
            <td><div className="platform-subscription-readiness__links"><Link to={`/platform/billing?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Billing record</Link><Link to={`/platform/tenants?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant record</Link>{canReadAudit ? <Link to={`/platform/audit?tenant_id=${encodeURIComponent(item.tenant_id)}&source=billing`}>Billing audit</Link> : null}</div></td>
          </tr>)}{!items.length ? <tr><td colSpan={7}><div className="platform-subscription-readiness__empty">No subscription-readiness rows match the current filters.</div></td></tr> : null}</tbody>
        </table></div>
        <div className="platform-subscription-readiness__pagination"><span>Showing {pagination ? Math.min(pagination.offset + 1, pagination.total) : 0}–{pagination ? Math.min(pagination.offset + items.length, pagination.total) : items.length} of {pagination?.total ?? items.length}</span><button type="button" className="app-button app-button--secondary" disabled={!pagination || pagination.offset <= 0 || readinessQuery.isFetching} onClick={() => updateFilters({ offset: Math.max(0, (pagination?.offset || 0) - PAGE_SIZE) })}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!pagination?.has_more || readinessQuery.isFetching} onClick={() => updateFilters({ offset: (pagination?.offset || 0) + PAGE_SIZE })}>Next</button></div>
      </> : null}
    </section>

    <section className="io-workspace-panel platform-subscription-readiness__section">
      <OperationalSectionHeader iconPath="/platform/subscription-readiness" title="Evidence meaning" description="This page is intentionally narrower than external payment, legal or customer-success certification." />
      <div className="platform-subscription-readiness__truth-grid">
        <div><strong>Subscription ready</strong><span>The current application billing configuration, required dates and application billing history have no defined blocker/review flag. It is not payment certification.</span></div>
        <div><strong>Billing event history</strong><span>Shows records stored by the application. A note, invoice-sent entry or lifecycle event does not prove an external payment occurred or a customer received anything.</span></div>
        <div><strong>Provider-shaped event</strong><span>Shows application-ingested provider evidence under the Billing contract. It does not independently prove bank settlement, refund completion or external account ownership.</span></div>
        <div><strong>Comped subscription</strong><span>A comped tenant does not require a paid current-period end. Historical paid-period dates therefore do not create a false expiration blocker.</span></div>
      </div>
    </section>

    <section className="io-workspace-panel platform-subscription-readiness__section">
      <OperationalSectionHeader iconPath="/platform/subscription-readiness" title="Supporting operations" description="Use the source records when a readiness flag needs investigation or correction." />
      <div className="platform-subscription-readiness__links platform-subscription-readiness__links--row"><Link to="/platform/billing">Billing</Link><Link to="/platform/billing-subscription-activation">Billing activation</Link><Link to="/platform/tenants">Tenants</Link>{canReadAudit ? <Link to="/platform/audit?source=billing">Billing audit</Link> : null}</div>
    </section>
  </div>;
}
