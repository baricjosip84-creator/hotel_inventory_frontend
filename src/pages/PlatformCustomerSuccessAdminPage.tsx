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
import './PlatformCustomerSuccessAdminPage.css';

type RiskFlag = { code: string; severity: string; points: number; message: string };
type CustomerSuccessState = 'customer_success_ready' | 'customer_success_watch' | 'customer_success_at_risk' | 'customer_success_partial_evidence';
type CustomerSuccessItem = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  billing_status: string | null;
  plan_code?: string | null;
  primary_contacts: number;
  open_tasks: number;
  open_urgent_tasks: number;
  overdue_tasks: number;
  unresolved_follow_ups: number;
  last_customer_touch_at?: string | null;
  days_since_last_touch?: number | null;
  open_support_sessions: number | null;
  open_incidents: number | null;
  subscription_readiness_state: string | null;
  license_enforcement_state: string | null;
  success_risk_score: number;
  customer_success_state: CustomerSuccessState;
  risk_flags: RiskFlag[];
  recommended_admin_actions: string[];
};

type CustomerSuccessSummary = {
  tenants_reviewed: number;
  ready_tenants: number;
  watch_tenants: number;
  at_risk_tenants: number;
  partial_evidence_tenants: number;
  tenants_missing_primary_contact: number;
  tenants_with_overdue_tasks: number;
  tenants_with_unresolved_follow_ups: number;
  tenants_without_recent_touch: number;
  tenants_with_open_support_sessions: number | null;
  tenants_with_open_incidents: number | null;
  tenants_with_support_escalations: number | null;
};

type CustomerSuccessPackage = {
  feature: string;
  generated_at: string;
  posture: string;
  health_states: CustomerSuccessState[];
  summary: CustomerSuccessSummary;
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  evidence_access: {
    tenant_directory: boolean;
    tenant_contacts: boolean;
    tenant_tasks: boolean;
    tenant_communications: boolean;
    support_sessions: boolean;
    incidents: boolean;
    billing_subscription: boolean;
    license_plan_enforcement: boolean;
  };
  available_sources: string[];
  omitted_sources: string[];
  evidence_complete: boolean;
  truth_contract: Record<string, boolean>;
  items: CustomerSuccessItem[];
};

const PAGE_SIZE = 50;
const HEALTH_STATES: CustomerSuccessState[] = ['customer_success_ready', 'customer_success_watch', 'customer_success_at_risk', 'customer_success_partial_evidence'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function pretty(value?: string | null) {
  return value ? value.replaceAll('_', ' ') : 'Not recorded';
}

function stateTone(value?: string | null) {
  if (!value) return 'neutral' as const;
  if (value.includes('at_risk') || value.includes('blocked')) return 'danger' as const;
  if (value.includes('watch') || value.includes('review')) return 'warn' as const;
  if (value.includes('partial')) return 'neutral' as const;
  return 'good' as const;
}

function RiskChips({ values }: { values: RiskFlag[] }) {
  if (!values.length) return <small className="platform-customer-success__muted">No known application risk flags.</small>;
  return <div className="platform-customer-success__chips">{values.map((flag) => <span key={flag.code} data-tone={flag.severity === 'critical' || flag.severity === 'high' ? 'danger' : flag.severity === 'warning' || flag.severity === 'medium' ? 'warn' : 'neutral'} title={`${flag.message} (${flag.points} points)`}>{pretty(flag.code)} · {flag.points}</span>)}</div>;
}

function actionLabel(action: string) {
  return pretty(action);
}

function actionTarget(action: string, tenantId: string) {
  switch (action) {
    case 'assign_primary_customer_contact': return `/platform/tenant-contacts?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'schedule_customer_check_in':
    case 'resolve_customer_follow_ups': return `/platform/communications?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'clear_customer_success_task_backlog': return `/platform/tenant-tasks?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'review_subscription_billing_blockers': return `/platform/subscription-readiness?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'review_license_plan_enforcement_blockers': return `/platform/license-plan-enforcement?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'coordinate_support_escalation': return `/platform/support-sessions?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'review_incident_escalation': return `/platform/incidents?tenant_id=${encodeURIComponent(tenantId)}`;
    default: return `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}`;
  }
}

export default function PlatformCustomerSuccessAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canReadIncidents = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ);
  const canReadBilling = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ);
  const canReadSupportSessions = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedState = searchParams.get('state') || '';
  const requestedSearch = searchParams.get('search') || '';
  const state = HEALTH_STATES.includes(requestedState as CustomerSuccessState) ? requestedState as CustomerSuccessState : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const includeHistory = searchParams.get('include_history') === 'true';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);
  const invalidFilters = Boolean((requestedTenantId && !UUID_RE.test(requestedTenantId)) || (requestedState && !state) || (requestedSearch && !search));

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (requestedTenantId) params.set('tenant_id', requestedTenantId);
    if (state) params.set('state', state);
    if (search.trim()) params.set('search', search.trim());
    if (includeHistory) params.set('include_history', 'true');
    return params.toString();
  }, [requestedTenantId, state, search, includeHistory, offset]);

  const successQuery = useQuery({
    queryKey: ['platform', 'customer-success-admin', queryString],
    queryFn: () => platformApiRequest<CustomerSuccessPackage>(`/platform/customer-success-admin?${queryString}`),
    enabled: !invalidFilters,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });

  const data = successQuery.data;
  const summary = data?.summary;
  const items = data?.items || [];
  const pagination = data?.pagination;
  const selectedTenant = requestedTenantId ? items.find((item) => item.tenant_id === requestedTenantId) : null;
  const showingStaleSnapshot = Boolean(successQuery.isError && data);

  function updateFilters(next: { tenant_id?: string; state?: string; search?: string; include_history?: boolean; offset?: number }) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === '' || value === false || value === 0) params.delete(key);
      else params.set(key, String(value));
    }
    if (!Object.prototype.hasOwnProperty.call(next, 'offset')) params.delete('offset');
    setSearchParams(params, { replace: true });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  return <div className="platform-customer-success">
    <OperationalWorkspaceHero
      iconPath="/platform/customer-success-admin"
      eyebrow="Platform customer operations"
      title="Customer success"
      description="Triage tenant customer-success signals from application contacts, tasks, communications and independently permission-scoped Billing, Support Session and Incident evidence. Partial evidence is never called Ready."
      meta={<>
        <OperationalWorkspaceMetaPill>Tenant evidence protected by TENANTS_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Protected sources scoped independently</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Read only</OperationalWorkspaceMetaPill>
      </>}
      aside={<div className="platform-customer-success__hero-aside">
        <OperationalWorkspaceStatus value={pretty(data?.posture || 'Loading')} label="Current application posture" />
        <button type="button" className="app-button app-button--secondary" onClick={() => successQuery.refetch()} disabled={successQuery.isFetching || invalidFilters}>{successQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
      </div>}
    />

    {invalidFilters ? <section className="platform-customer-success__error"><strong>Invalid Customer Success filters.</strong><span>Clear the URL filters and retry.</span><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></section> : null}
    {successQuery.isError && !data && !invalidFilters ? <section className="platform-customer-success__blocking-error"><strong>Customer Success failed to load.</strong><span>{readableError(successQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => successQuery.refetch()}>Retry</button></section> : null}
    {showingStaleSnapshot ? <section className="platform-customer-success__warning"><strong>Showing the last successful snapshot.</strong><span>The latest refresh failed: {readableError(successQuery.error)}</span></section> : null}
    {data && !data.evidence_complete ? <section className="platform-customer-success__warning"><strong>Partial evidence.</strong><span>Restricted source families: {data.omitted_sources.map(pretty).join(', ') || 'None'}. Known blockers remain visible, but otherwise-clean tenants are not called Ready until protected evidence is available.</span></section> : null}

    <OperationalWorkspaceStats ariaLabel="Customer Success summary">
      <OperationalWorkspaceStatCard label="Reviewed" value={summary?.tenants_reviewed ?? '—'} helper="Registry-wide for current filters" loading={successQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Ready" value={summary?.ready_tenants ?? '—'} tone="good" helper="Complete authorized evidence; no defined risk" loading={successQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Watch" value={summary?.watch_tenants ?? '—'} tone="warn" helper="Known application follow-up signal" loading={successQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="At risk" value={summary?.at_risk_tenants ?? '—'} tone="danger" helper="Known high-weight application blockers" loading={successQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Partial evidence" value={summary?.partial_evidence_tenants ?? '—'} helper="Otherwise clean, but protected sources omitted" loading={successQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Missing primary contact" value={summary?.tenants_missing_primary_contact ?? '—'} tone="warn" helper="Application contact registry" loading={successQuery.isLoading && !data} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-customer-success__section">
      <OperationalSectionHeader iconPath="/platform/customer-success-admin" title="Customer Success filters" description="Filters are URL-backed so links from Tenants, Contacts, Tasks, Communications and commercial-readiness workspaces open the intended tenant evidence." />
      <div className="platform-customer-success__filters">
        <label>Search tenant
          <input value={search} maxLength={200} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Tenant name…" />
        </label>
        <label>Customer Success state
          <select value={state} onChange={(event) => updateFilters({ state: event.target.value })}>
            <option value="">All states</option>
            {HEALTH_STATES.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}
          </select>
        </label>
        <label className="platform-customer-success__history"><input type="checkbox" checked={includeHistory} onChange={(event) => updateFilters({ include_history: event.target.checked })} />Include archived tenants</label>
        <div className="platform-customer-success__filter-actions"><button type="button" className="app-button app-button--secondary" onClick={clearFilters} disabled={!searchParams.toString()}>Clear filters</button></div>
      </div>
      {requestedTenantId ? <div className="platform-customer-success__scope"><strong>Tenant scope:</strong> {selectedTenant?.tenant_name || requestedTenantId}</div> : null}
    </section>

    <section className="io-workspace-panel platform-customer-success__section">
      <OperationalSectionHeader iconPath="/platform/customer-success-admin" title="Evidence access" description="Customer Success uses TENANTS_READ-owned contacts/tasks/communications and independently protected Support Session, Incident and Billing evidence. Restricted sources are not queried." />
      <div className="platform-customer-success__source-grid">
        {Object.entries(data?.evidence_access || {}).map(([source, available]) => <div key={source}><strong>{pretty(source)}</strong><span className="platform-customer-success__badge" data-tone={available ? 'good' : 'neutral'}>{available ? 'Available' : 'Restricted'}</span></div>)}
        {!data ? <div className="platform-customer-success__empty">Loading evidence access…</div> : null}
      </div>
    </section>

    <section className="io-workspace-panel platform-customer-success__section">
      <OperationalSectionHeader iconPath="/platform/customer-success-admin" title="Tenant Customer Success evidence" description="The score is an application triage heuristic. Known blockers remain visible even when another protected source is unavailable; incomplete evidence never upgrades a tenant to Ready." />
      {data ? <>
        <div className="platform-customer-success__table-wrap"><table className="platform-customer-success__table">
          <thead><tr><th>Tenant</th><th>Commercial</th><th>Contacts & tasks</th><th>Touch & escalation</th><th>Risk</th><th>Recommended actions</th><th>Evidence</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.tenant_id}>
            <td><strong>{item.tenant_name}</strong><span className="platform-customer-success__badge" data-tone={stateTone(item.customer_success_state)}>{pretty(item.customer_success_state)}</span><small>{pretty(item.tenant_status)}</small></td>
            <td>{data.evidence_access.billing_subscription ? <><strong>{pretty(item.billing_status)}</strong><small>{item.plan_code || 'No plan'} · {pretty(item.subscription_readiness_state)} · {pretty(item.license_enforcement_state)}</small></> : <><strong>Restricted</strong><small>PLATFORM_BILLING_READ required</small></>}</td>
            <td><strong>Contacts {item.primary_contacts}</strong><small>Open tasks {item.open_tasks} · urgent {item.open_urgent_tasks} · overdue {item.overdue_tasks}</small></td>
            <td><strong>Last recorded touch {item.days_since_last_touch ?? '—'} days</strong><small>Follow-ups {item.unresolved_follow_ups} · support {item.open_support_sessions ?? 'Restricted'} · incidents {item.open_incidents ?? 'Restricted'}</small></td>
            <td><strong>Score {item.success_risk_score}</strong><RiskChips values={item.risk_flags} /></td>
            <td><div className="platform-customer-success__links">{item.recommended_admin_actions.length ? item.recommended_admin_actions.map((action) => <Link key={action} to={actionTarget(action, item.tenant_id)}>{actionLabel(action)}</Link>) : <small className="platform-customer-success__muted">No defined action from visible evidence.</small>}</div></td>
            <td><div className="platform-customer-success__links"><Link to={`/platform/tenants?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant record</Link><Link to={`/platform/tenant-health?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant health</Link>{canReadSupportSessions ? <Link to={`/platform/support-sessions?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Support Sessions</Link> : null}{canReadIncidents ? <Link to={`/platform/incidents?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Incidents</Link> : null}{canReadBilling ? <Link to={`/platform/billing?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Billing</Link> : null}{canReadAudit ? <Link to={`/platform/audit?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Audit</Link> : null}</div></td>
          </tr>)}{!items.length ? <tr><td colSpan={7}><div className="platform-customer-success__empty">No Customer Success rows match the current filters.</div></td></tr> : null}</tbody>
        </table></div>
        <div className="platform-customer-success__pagination"><span>Showing {pagination ? Math.min(pagination.offset + 1, pagination.total) : 0}–{pagination ? Math.min(pagination.offset + items.length, pagination.total) : items.length} of {pagination?.total ?? items.length}</span><button type="button" className="app-button app-button--secondary" disabled={!pagination || pagination.offset <= 0 || successQuery.isFetching} onClick={() => updateFilters({ offset: Math.max(0, (pagination?.offset || 0) - PAGE_SIZE) })}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!pagination?.has_more || successQuery.isFetching} onClick={() => updateFilters({ offset: (pagination?.offset || 0) + PAGE_SIZE })}>Next</button></div>
      </> : <div className="platform-customer-success__empty">Loading Customer Success evidence…</div>}
    </section>

    <section className="io-workspace-panel platform-customer-success__section">
      <OperationalSectionHeader iconPath="/platform/customer-success-admin" title="Evidence meaning" description="This workspace is an internal application triage surface. It does not independently prove customer sentiment, communication, payment, support acceptance, incident impact or commercial success." />
      <div className="platform-customer-success__truth-grid">
        <div><strong>Recorded touch ≠ external contact proof</strong><span>Communication timestamps only show records stored in this application. Calls, meetings or messages outside the application may not be represented.</span></div>
        <div><strong>Risk score is a heuristic</strong><span>The score combines defined application signals for operator triage. It is not a measured customer-health, churn-probability or satisfaction score.</span></div>
        <div><strong>Billing state ≠ settlement</strong><span>Application billing/subscription records do not independently prove bank settlement, contract status or customer receipt.</span></div>
        <div><strong>Ready requires complete evidence</strong><span>If Billing, Support Session or Incident evidence is restricted, an otherwise-clean tenant is reported as Partial evidence rather than Ready.</span></div>
      </div>
    </section>

    <section className="io-workspace-panel platform-customer-success__section">
      <OperationalSectionHeader iconPath="/platform/customer-success-admin" title="Supporting operations" description="Open the source workspaces you are authorized to use. Links to protected evidence are hidden when the corresponding permission is unavailable." />
      <div className="platform-customer-success__links platform-customer-success__links--row"><Link to="/platform/tenant-contacts">Tenant contacts</Link><Link to="/platform/tenant-tasks">Tenant tasks</Link><Link to="/platform/communications">Communications</Link>{canReadSupportSessions ? <Link to="/platform/support-sessions">Support Sessions</Link> : null}{canReadIncidents ? <Link to="/platform/incidents">Incidents</Link> : null}{canReadBilling ? <Link to="/platform/billing">Billing</Link> : null}{canReadBilling ? <Link to="/platform/subscription-readiness">Subscription readiness</Link> : null}{canReadBilling ? <Link to="/platform/license-plan-enforcement">License enforcement</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform Audit</Link> : null}</div>
    </section>
  </div>;
}
