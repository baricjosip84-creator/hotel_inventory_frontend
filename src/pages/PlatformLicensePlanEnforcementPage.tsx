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
import './PlatformLicensePlanEnforcementPage.css';

type PlanDefinition = {
  plan_code: string;
  commercial_tier: string;
  required_limits: string[];
  required_feature_flags: string[];
  recommended_enforcement_mode: string;
  runtime_enforced_limits: string[];
  runtime_unenforced_limits: string[];
  runtime_enforced_feature_flags: string[];
  runtime_unenforced_feature_flags: string[];
  runtime_enforcement_complete: boolean;
};

type LicenseItem = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  billing_status: string;
  plan_code?: string | null;
  commercial_tier?: string | null;
  recommended_enforcement_mode?: string | null;
  configuration_complete: boolean;
  runtime_enforcement_complete: boolean;
  missing_limits: string[];
  invalid_limits: string[];
  missing_feature_flags: string[];
  runtime_enforced_limits: string[];
  runtime_unenforced_limits: string[];
  runtime_enforced_feature_flags: string[];
  runtime_unenforced_feature_flags: string[];
  enforcement_gaps: string[];
  enforcement_state: 'license_enforcement_ready' | 'license_enforcement_review_required' | 'license_enforcement_blocked';
};

type LicenseSummary = {
  tenants_reviewed: number;
  ready_tenants: number;
  tenants_requiring_review: number;
  blocked_tenants: number;
  missing_plan_definitions: number;
  missing_required_limits: number;
  invalid_required_limits: number;
  missing_required_feature_flags: number;
  runtime_incomplete_tenants: number;
  tenants_with_unenforced_limits: number;
  tenants_with_unenforced_feature_flags: number;
  billing_blocked_tenants: number;
};

type LicensePackage = {
  feature: string;
  generated_at: string;
  posture: string;
  plan_definitions: PlanDefinition[];
  runtime_guard_catalog: { enforced_limit_keys: string[]; enforced_feature_keys: string[] };
  summary: LicenseSummary;
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  evidence_access: Record<string, boolean>;
  available_sources: string[];
  omitted_sources: string[];
  evidence_complete: boolean;
  truth_contract: Record<string, boolean>;
  items: LicenseItem[];
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

function stateTone(value: string) {
  if (value.includes('blocked')) return 'danger' as const;
  if (value.includes('review')) return 'warn' as const;
  return 'good' as const;
}

function Chips({ values, empty = 'None' }: { values: string[]; empty?: string }) {
  return <div className="platform-license-plan__chips">{values.length ? values.map((value) => <span key={value}>{pretty(value)}</span>) : <small>{empty}</small>}</div>;
}

export default function PlatformLicensePlanEnforcementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedPlanCode = searchParams.get('plan_code') || '';
  const requestedBillingStatus = searchParams.get('billing_status') || '';
  const requestedSearch = searchParams.get('search') || '';
  const planCode = requestedPlanCode.length <= 80 ? requestedPlanCode : '';
  const billingStatus = BILLING_STATUSES.includes(requestedBillingStatus) ? requestedBillingStatus : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const includeHistory = searchParams.get('include_history') === 'true';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);
  const invalidFilters = Boolean(
    (requestedTenantId && !UUID_RE.test(requestedTenantId))
    || (requestedPlanCode && !planCode)
    || (requestedBillingStatus && !billingStatus)
    || (requestedSearch && !search)
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (requestedTenantId) params.set('tenant_id', requestedTenantId);
    if (planCode.trim()) params.set('plan_code', planCode.trim());
    if (billingStatus) params.set('billing_status', billingStatus);
    if (search.trim()) params.set('search', search.trim());
    if (includeHistory) params.set('include_history', 'true');
    return params.toString();
  }, [requestedTenantId, planCode, billingStatus, search, includeHistory, offset]);

  const enforcementQuery = useQuery({
    queryKey: ['platform', 'license-plan-enforcement', queryString],
    queryFn: () => platformApiRequest<LicensePackage>(`/platform/license-plan-enforcement?${queryString}`),
    enabled: !invalidFilters,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });

  const data = enforcementQuery.data;
  const summary = data?.summary;
  const planDefinitions = Array.isArray(data?.plan_definitions) ? data.plan_definitions.map((plan) => ({
    ...plan,
    required_limits: Array.isArray(plan.required_limits) ? plan.required_limits : [],
    required_feature_flags: Array.isArray(plan.required_feature_flags) ? plan.required_feature_flags : [],
    runtime_enforced_limits: Array.isArray(plan.runtime_enforced_limits) ? plan.runtime_enforced_limits : [],
    runtime_unenforced_limits: Array.isArray(plan.runtime_unenforced_limits) ? plan.runtime_unenforced_limits : [],
    runtime_enforced_feature_flags: Array.isArray(plan.runtime_enforced_feature_flags) ? plan.runtime_enforced_feature_flags : [],
    runtime_unenforced_feature_flags: Array.isArray(plan.runtime_unenforced_feature_flags) ? plan.runtime_unenforced_feature_flags : []
  })) : [];
  const items = Array.isArray(data?.items) ? data.items.map((item) => ({
    ...item,
    missing_limits: Array.isArray(item.missing_limits) ? item.missing_limits : [],
    invalid_limits: Array.isArray(item.invalid_limits) ? item.invalid_limits : [],
    missing_feature_flags: Array.isArray(item.missing_feature_flags) ? item.missing_feature_flags : [],
    runtime_enforced_limits: Array.isArray(item.runtime_enforced_limits) ? item.runtime_enforced_limits : [],
    runtime_unenforced_limits: Array.isArray(item.runtime_unenforced_limits) ? item.runtime_unenforced_limits : [],
    runtime_enforced_feature_flags: Array.isArray(item.runtime_enforced_feature_flags) ? item.runtime_enforced_feature_flags : [],
    runtime_unenforced_feature_flags: Array.isArray(item.runtime_unenforced_feature_flags) ? item.runtime_unenforced_feature_flags : [],
    enforcement_gaps: Array.isArray(item.enforcement_gaps) ? item.enforcement_gaps : []
  })) : [];
  const pagination = data?.pagination;
  const selectedTenant = requestedTenantId ? items.find((item) => item.tenant_id === requestedTenantId) : null;
  const showingStaleSnapshot = Boolean(enforcementQuery.isError && data);

  function updateFilters(next: { tenant_id?: string; plan_code?: string; billing_status?: string; search?: string; include_history?: boolean; offset?: number }) {
    const params = new URLSearchParams(searchParams);
    const entries = Object.entries(next);
    for (const [key, value] of entries) {
      if (value === undefined || value === '' || value === false || value === 0) params.delete(key);
      else params.set(key, String(value));
    }
    if (!Object.prototype.hasOwnProperty.call(next, 'offset')) params.delete('offset');
    setSearchParams(params, { replace: true });
  }

  function clearFilters() {
    setSearchParams({}, { replace: true });
  }

  return <div className="io-operational-page io-workspace-page platform-license-plan">
    <OperationalWorkspaceHero
      iconPath="/platform/license-plan-enforcement"
      eyebrow="Platform commercial evidence"
      title="License & plan enforcement"
      description="Compare tenant plan configuration with the runtime limit and feature guards that are actually wired into the application. Configured metadata is kept separate from real runtime enforcement coverage."
      meta={<>
        <OperationalWorkspaceMetaPill>Tenant identity protected by TENANTS_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Plan evidence protected by PLATFORM_BILLING_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Read only</OperationalWorkspaceMetaPill>
      </>}
      aside={<div className="platform-license-plan__hero-aside">
        <OperationalWorkspaceStatus value={pretty(data?.posture || 'Loading')} label="Current application posture" />
        <button type="button" className="app-button app-button--secondary" onClick={() => enforcementQuery.refetch()} disabled={enforcementQuery.isFetching || invalidFilters}>
          {enforcementQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>}
    />

    {invalidFilters ? <section className="platform-license-plan__error"><strong>Invalid enforcement filters.</strong><span>Clear the URL filters and retry.</span><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></section> : null}
    {enforcementQuery.isError && !data && !invalidFilters ? <section className="platform-license-plan__blocking-error"><strong>License and plan enforcement failed to load.</strong><span>{readableError(enforcementQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => enforcementQuery.refetch()}>Retry</button></section> : null}
    {showingStaleSnapshot ? <section className="platform-license-plan__warning"><strong>Showing the last successful snapshot.</strong><span>The latest refresh failed: {readableError(enforcementQuery.error)}</span></section> : null}

    <OperationalWorkspaceStats ariaLabel="License and plan enforcement summary">
      <OperationalWorkspaceStatCard label="Reviewed" value={summary?.tenants_reviewed ?? '—'} helper="Registry-wide for current filters" loading={enforcementQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Ready" value={summary?.ready_tenants ?? '—'} tone="good" helper="Configured and runtime-covered" loading={enforcementQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Review" value={summary?.tenants_requiring_review ?? '—'} tone="warn" helper="Configuration or runtime coverage gap" loading={enforcementQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Blocked" value={summary?.blocked_tenants ?? '—'} tone="danger" helper="Billing or plan-definition blocker" loading={enforcementQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Runtime incomplete" value={summary?.runtime_incomplete_tenants ?? '—'} tone="warn" helper="Required controls not wired to guards" loading={enforcementQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Invalid limits" value={summary?.invalid_required_limits ?? '—'} tone="warn" helper="Configured value is not enforceable" loading={enforcementQuery.isLoading && !data} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-license-plan__section">
      <OperationalSectionHeader iconPath="/platform/license-plan-enforcement" title="Enforcement filters" description="Filters are URL-backed so links from Billing, Customer Success and commercial-readiness workspaces open the intended evidence." />
      <div className="platform-license-plan__filters">
        <label>Search tenant / plan / billing status
          <input value={search} maxLength={200} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Search…" />
        </label>
        <label>Plan code
          <select value={planCode} onChange={(event) => updateFilters({ plan_code: event.target.value })}>
            <option value="">All plans</option>
            {planDefinitions.map((plan) => <option key={plan.plan_code} value={plan.plan_code}>{plan.plan_code}</option>)}
          </select>
        </label>
        <label>Billing status
          <select value={billingStatus} onChange={(event) => updateFilters({ billing_status: event.target.value })}>
            <option value="">All statuses</option>
            {BILLING_STATUSES.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}
          </select>
        </label>
        <label className="platform-license-plan__history"><input type="checkbox" checked={includeHistory} onChange={(event) => updateFilters({ include_history: event.target.checked })} />Include archived tenants</label>
        <div className="platform-license-plan__filter-actions">
          <button type="button" className="app-button app-button--secondary" onClick={clearFilters} disabled={!searchParams.toString()}>Clear filters</button>
        </div>
      </div>
      {requestedTenantId ? <div className="platform-license-plan__scope"><strong>Tenant scope:</strong> {selectedTenant?.tenant_name || requestedTenantId}</div> : null}
    </section>

    <section className="io-workspace-panel platform-license-plan__section">
      <OperationalSectionHeader iconPath="/platform/license-plan-enforcement" title="Plan catalog vs runtime guard coverage" description="The plan catalog defines commercial metadata. Runtime coverage is derived separately from the tenant plan-limit and feature-entitlement guard catalogs currently wired into the application." />
      {data ? <div className="platform-license-plan__plan-grid">{planDefinitions.map((plan) => <article key={plan.plan_code} className="platform-license-plan__plan-card">
        <div className="platform-license-plan__plan-head"><div><strong>{plan.plan_code}</strong><small>{pretty(plan.commercial_tier)}</small></div><span className="platform-license-plan__badge" data-tone={plan.runtime_enforcement_complete ? 'good' : 'warn'}>{plan.runtime_enforcement_complete ? 'Runtime covered' : 'Runtime incomplete'}</span></div>
        <dl><div><dt>Catalog mode</dt><dd>{pretty(plan.recommended_enforcement_mode)}</dd></div></dl>
        <div><strong>Required limits</strong><Chips values={plan.required_limits} /></div>
        <div><strong>Runtime-enforced limits</strong><Chips values={plan.runtime_enforced_limits} /></div>
        <div><strong>Unenforced required limits</strong><Chips values={plan.runtime_unenforced_limits} empty="None — all required limits have a runtime guard" /></div>
        <div><strong>Required features</strong><Chips values={plan.required_feature_flags} /></div>
        <div><strong>Runtime-enforced features</strong><Chips values={plan.runtime_enforced_feature_flags} /></div>
        <div><strong>Unenforced required features</strong><Chips values={plan.runtime_unenforced_feature_flags} empty="None — all required features have a runtime guard" /></div>
        <Link to={`/platform/license-plan-enforcement?plan_code=${encodeURIComponent(plan.plan_code)}`}>Filter tenant evidence</Link>
      </article>)}</div> : <div className="platform-license-plan__empty">Loading plan catalog…</div>}
    </section>

    <section className="io-workspace-panel platform-license-plan__section">
      <OperationalSectionHeader iconPath="/platform/license-plan-enforcement" title="Tenant enforcement evidence" description="A tenant is Ready only when the plan is known, application billing state is not blocked, required metadata is configured, and every required plan control has runtime guard coverage." />
      {data ? <>
        <div className="platform-license-plan__table-wrap"><table className="platform-license-plan__table">
          <thead><tr><th>Tenant</th><th>Billing / plan</th><th>Configuration</th><th>Runtime coverage</th><th>Gaps</th><th>Evidence</th></tr></thead>
          <tbody>{items.map((item) => <tr key={item.tenant_id}>
            <td><strong>{item.tenant_name}</strong><small>{pretty(item.tenant_status)}</small></td>
            <td><span className="platform-license-plan__badge" data-tone={stateTone(item.enforcement_state)}>{pretty(item.billing_status)}</span><strong>{item.plan_code || 'No plan code'}</strong><small>{pretty(item.commercial_tier)} · catalog mode {pretty(item.recommended_enforcement_mode)}</small></td>
            <td><strong>{item.configuration_complete ? 'Configuration complete' : 'Configuration review'}</strong><small>Missing limits</small><Chips values={item.missing_limits} /><small>Invalid limits</small><Chips values={item.invalid_limits} /><small>Missing features</small><Chips values={item.missing_feature_flags} /></td>
            <td><span className="platform-license-plan__badge" data-tone={item.runtime_enforcement_complete ? 'good' : 'warn'}>{item.runtime_enforcement_complete ? 'Complete' : 'Incomplete'}</span><small>Unenforced limits</small><Chips values={item.runtime_unenforced_limits} /><small>Unenforced features</small><Chips values={item.runtime_unenforced_feature_flags} /></td>
            <td><span className="platform-license-plan__badge" data-tone={stateTone(item.enforcement_state)}>{pretty(item.enforcement_state)}</span><Chips values={item.enforcement_gaps} empty="No defined gaps" /></td>
            <td><div className="platform-license-plan__links"><Link to={`/platform/tenants?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant record</Link><Link to={`/platform/billing?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Billing record</Link><Link to={`/platform/subscription-readiness?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Subscription readiness</Link>{canReadAudit ? <Link to={`/platform/audit?tenant_id=${encodeURIComponent(item.tenant_id)}&source=billing`}>Billing audit</Link> : null}</div></td>
          </tr>)}{!items.length ? <tr><td colSpan={6}><div className="platform-license-plan__empty">No license/plan rows match the current filters.</div></td></tr> : null}</tbody>
        </table></div>
        <div className="platform-license-plan__pagination"><span>Showing {pagination ? Math.min(pagination.offset + 1, pagination.total) : 0}–{pagination ? Math.min(pagination.offset + items.length, pagination.total) : items.length} of {pagination?.total ?? items.length}</span><button type="button" className="app-button app-button--secondary" disabled={!pagination || pagination.offset <= 0 || enforcementQuery.isFetching} onClick={() => updateFilters({ offset: Math.max(0, (pagination?.offset || 0) - PAGE_SIZE) })}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!pagination?.has_more || enforcementQuery.isFetching} onClick={() => updateFilters({ offset: (pagination?.offset || 0) + PAGE_SIZE })}>Next</button></div>
      </> : null}
    </section>

    <section className="io-workspace-panel platform-license-plan__section">
      <OperationalSectionHeader iconPath="/platform/license-plan-enforcement" title="Evidence meaning" description="This page reports application plan configuration and the runtime guard coverage implemented in this codebase. It is not an external licensing or contract certification system." />
      <div className="platform-license-plan__truth-grid">
        <div><strong>Configured ≠ enforced</strong><span>A feature flag or limit stored on the tenant is configuration evidence. It is only called runtime-covered here when the current tenant guard catalog contains a matching control.</span></div>
        <div><strong>Catalog mode ≠ implementation</strong><span>A recommended mode such as contract limit enforcement is plan-catalog metadata. Its presence does not prove a matching runtime engine exists.</span></div>
        <div><strong>Ready is narrow</strong><span>Ready means the defined application billing/plan/configuration checks are clear and required controls have runtime guard coverage. It does not prove a commercial contract, payment, or external license state.</span></div>
        <div><strong>Current known gaps</strong><span>Standard and Enterprise can remain Review Required when required integration/API/identity controls are configured but not yet represented by current tenant runtime guards.</span></div>
      </div>
    </section>

    <section className="io-workspace-panel platform-license-plan__section">
      <OperationalSectionHeader iconPath="/platform/license-plan-enforcement" title="Supporting operations" description="Use the source records to correct plan configuration or investigate the commercial state behind an enforcement finding." />
      <div className="platform-license-plan__links platform-license-plan__links--row"><Link to="/platform/billing">Billing</Link><Link to="/platform/subscription-readiness">Subscription readiness</Link><Link to="/platform/billing-subscription-activation">Billing activation</Link><Link to="/platform/tenants">Tenants</Link><Link to="/platform/tenant-health">Tenant health</Link>{canReadAudit ? <Link to="/platform/audit?source=billing">Billing audit</Link> : null}</div>
    </section>
  </div>;
}
