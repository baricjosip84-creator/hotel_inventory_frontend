import { useEffect, useMemo, useState } from 'react';
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
import './PlatformTenantLifecyclePage.css';

type TenantOption = { id: string; name: string; status?: string };
type ConfigurationPosture = 'ready' | 'attention_required' | 'blocked';
type LifecycleStatus = 'trial' | 'active' | 'suspended' | 'maintenance' | 'offboarding' | 'archived';
type TenantLifecycleTenant = {
  id: string;
  name: string;
  location?: string | null;
  organization_type?: string | null;
  status: LifecycleStatus | string;
  lifecycle_bucket: string;
  billing_status: string;
  plan_code: string;
  write_locked: boolean;
  configuration_posture: ConfigurationPosture;
  configuration_scope: 'tenant_record_only';
  commercial_readiness_proven: false;
  blockers: string[];
  warnings: string[];
  feature_flag_count: number;
  limit_count: number;
  support_enabled: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};
type SupportingRoute = { route: string; purpose: string; permission: string };
type TenantLifecycleGovernance = {
  feature: string;
  phase: number;
  step: number;
  generated_at: string;
  posture: string;
  summary_scope: 'loaded_page';
  summary: {
    loaded_tenants: number;
    active_lifecycle_tenants: number;
    attention_lifecycle_tenants: number;
    closed_lifecycle_tenants: number;
    write_locked_tenants: number;
    billing_attention_tenants: number;
    configuration_blocked_tenants: number;
    configuration_attention_tenants: number;
    configuration_ready_tenants: number;
    offboarding_tenants: number;
  };
  pagination: { limit: number; offset: number; has_more: boolean };
  governance_controls: {
    read_only: boolean;
    mutation_owner: string;
    evidence_scope: 'tenant_record_configuration_only';
    external_evidence_consumed: false;
    commercial_readiness_proven: false;
    supporting_routes_are_evidence: false;
    supporting_routes: SupportingRoute[];
  };
  tenants: TenantLifecycleTenant[];
};

const PAGE_SIZE = 100;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const lifecycleStatuses: LifecycleStatus[] = ['trial', 'active', 'suspended', 'maintenance', 'offboarding', 'archived'];

const supportingRouteLinks: Record<string, { label: string; to: string }> = {
  '/api/platform/tenants': { label: 'Tenants', to: '/platform/tenants' },
  '/api/platform/provisioning': { label: 'Provisioning', to: '/platform/provisioning' },
  '/api/platform/tenant-offboarding': { label: 'Tenant offboarding', to: '/platform/tenant-offboarding' },
  '/api/platform/tenant-exports': { label: 'Tenant exports', to: '/platform/tenant-exports' },
  '/api/platform/tenant-health': { label: 'Tenant health', to: '/platform/tenant-health' },
  '/api/platform/tenant-timeline': { label: 'Tenant timeline', to: '/platform/tenant-timeline' }
};

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}
function humanize(value: string | null | undefined) {
  const text = String(value || '').replaceAll('_', ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not recorded';
}
function dateTime(value: string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}
function postureTone(value: ConfigurationPosture) {
  if (value === 'blocked') return 'danger';
  if (value === 'attention_required') return 'warn';
  return 'good';
}
function canOpenRoute(permission: string) {
  if (permission === 'TENANTS_READ') return hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  if (permission === 'TENANTS_EXPORT') return hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT);
  return false;
}
function canOpenSupportCockpit() {
  return [
    PLATFORM_PERMISSIONS.TENANTS_READ,
    PLATFORM_PERMISSIONS.PLATFORM_SLA_READ,
    PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ
  ].every((permission) => hasPlatformPermission(permission));
}

export default function PlatformTenantLifecyclePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [offset, setOffset] = useState(0);
  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedStatus = searchParams.get('status') || '';
  const tenantId = uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const status = lifecycleStatuses.includes(requestedStatus as LifecycleStatus) ? requestedStatus as LifecycleStatus : '';
  const invalidTenantFilter = Boolean(requestedTenantId && !tenantId);
  const invalidStatusFilter = Boolean(requestedStatus && !status);
  const invalidFilters = invalidTenantFilter || invalidStatusFilter;

  useEffect(() => { setOffset(0); }, [tenantId, status, invalidFilters]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'lifecycle-selector'],
    queryFn: () => platformApiRequest<TenantOption[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const lifecycle = useQuery({
    queryKey: ['platform', 'tenant-lifecycle', 'governance', tenantId, status, offset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) params.set('tenant_id', tenantId);
      if (status) params.set('status', status);
      // Foundation endpoint: platformApiRequest<TenantLifecycleGovernance>('/platform/tenant-lifecycle/governance')
      return platformApiRequest<TenantLifecycleGovernance>(`/platform/tenant-lifecycle/governance?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);
  const selectedTenantLabel = selectedTenant?.name || (tenantId ? 'Selected tenant' : 'All tenants');
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const initialLifecycleError = lifecycle.isError && lifecycle.data === undefined;
  const refreshLifecycleError = lifecycle.isError && lifecycle.data !== undefined;
  const initialTenantsError = tenants.isError && tenants.data === undefined;
  const refreshTenantsError = tenants.isError && tenants.data !== undefined;
  const refreshing = lifecycle.isFetching || tenants.isFetching;

  const updateFilter = (key: 'tenant_id' | 'status', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (invalidTenantFilter) next.delete('tenant_id');
    if (invalidStatusFilter) next.delete('status');
    setSearchParams(next, { replace: true });
  };
  const refreshAll = async () => {
    const work: Array<Promise<unknown>> = [tenants.refetch()];
    if (!invalidFilters) work.push(lifecycle.refetch());
    await Promise.all(work);
  };

  const heroStatus = invalidFilters
    ? 'Filter invalid'
    : initialLifecycleError
      ? 'Unavailable'
      : refreshLifecycleError
        ? 'Stale snapshot'
        : lifecycle.isLoading && !lifecycle.data
          ? 'Loading'
          : 'Configuration snapshot';
  const heroLabel = invalidFilters
    ? 'Clear invalid URL filters'
    : initialLifecycleError
      ? 'Retry required'
      : refreshLifecycleError
        ? 'Last successful data retained'
        : 'Tenant-record evidence only';

  const perTenantLinks = (tenant: TenantLifecycleTenant) => {
    const links = [
      { label: 'Tenant', to: `/platform/tenants?tenant_id=${encodeURIComponent(tenant.id)}` },
      { label: 'Timeline', to: `/platform/tenant-timeline?tenant_id=${encodeURIComponent(tenant.id)}` },
      { label: 'Health', to: `/platform/tenant-health?tenant_id=${encodeURIComponent(tenant.id)}` },
      { label: 'Tasks', to: `/platform/tenant-tasks?tenant_id=${encodeURIComponent(tenant.id)}` }
    ];
    if (tenant.status === 'offboarding') links.push({ label: 'Offboarding', to: `/platform/tenant-offboarding?tenant_id=${encodeURIComponent(tenant.id)}` });
    if (hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)) links.push({ label: 'Billing', to: `/platform/billing?tenant_id=${encodeURIComponent(tenant.id)}` });
    if (canOpenSupportCockpit()) links.push({ label: 'Support cockpit', to: `/platform/support-operations-cockpit?tenant_id=${encodeURIComponent(tenant.id)}` });
    return links;
  };

  return (
    <div className="platform-tenant-lifecycle">
      <OperationalWorkspaceHero
        iconPath="/platform/tenant-lifecycle"
        eyebrow="Platform tenant operations"
        title="Tenant lifecycle"
        description="A read-only tenant-record configuration board for lifecycle status, plan, billing posture, write locks, feature flags, commercial limits, support policy and lifecycle ownership. Commercial readiness is not proven by this board: it does not consume or observe provisioning execution, health, timeline, export, offboarding completion, customer acceptance or other external lifecycle outcomes."
        meta={<>
          <OperationalWorkspaceMetaPill>Source · GET /platform/tenant-lifecycle/governance</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Permission · TENANTS_READ</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Read-only · yes</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Evidence · tenant record only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Summary · loaded page only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Current view · {selectedTenantLabel}</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-tenant-lifecycle__hero-aside"><OperationalWorkspaceStatus value={heroStatus} label={heroLabel} /><div className="platform-tenant-lifecycle__refresh-block"><button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button><span>{lifecycle.data ? `Generated ${dateTime(lifecycle.data.generated_at)}` : 'No lifecycle snapshot loaded'}</span></div></div>}
      />

      {invalidFilters ? <section className="platform-tenant-lifecycle__blocking-error"><strong>Invalid lifecycle URL filter</strong><span>{invalidTenantFilter ? 'tenant_id must be a UUID. ' : ''}{invalidStatusFilter ? 'status must be a supported lifecycle status.' : ''}</span><button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button></section> : null}
      {initialLifecycleError ? <section className="platform-tenant-lifecycle__blocking-error"><strong>Tenant lifecycle is unavailable</strong><span>{readableError(lifecycle.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => lifecycle.refetch()} disabled={lifecycle.isFetching}>Retry</button></section> : null}
      {refreshLifecycleError ? <div className="platform-tenant-lifecycle__warning">Showing the last successful lifecycle snapshot. Refresh failed: {readableError(lifecycle.error)}</div> : null}
      {initialTenantsError ? <div className="platform-tenant-lifecycle__warning">Tenant selector is unavailable: {readableError(tenants.error)}</div> : null}
      {refreshTenantsError ? <div className="platform-tenant-lifecycle__warning">Showing the last successful tenant selector snapshot. Refresh failed: {readableError(tenants.error)}</div> : null}

      <section className="io-workspace-panel platform-tenant-lifecycle__section">
        <OperationalSectionHeader iconPath="/platform/tenant-lifecycle" title="View controls" description="Filters are stored in the URL. Pagination is server-bounded and deterministic." />
        <div className="platform-tenant-lifecycle__filter-grid">
          <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)} disabled={tenants.isLoading && !tenants.data}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label>Lifecycle status<select value={status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option>{lifecycleStatuses.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
          <div className="platform-tenant-lifecycle__filter-summary"><span>Page</span><strong>{pageNumber}</strong></div>
          <div className="platform-tenant-lifecycle__filter-summary"><span>Scope</span><strong>{tenantId ? 'Single tenant' : status ? humanize(status) : 'All tenants'}</strong></div>
        </div>
      </section>

      {lifecycle.data ? <OperationalWorkspaceStats ariaLabel="Loaded tenant lifecycle configuration summary">
        <OperationalWorkspaceStatCard label="Loaded tenants" value={lifecycle.data.summary.loaded_tenants} helper="Current page only" tone="neutral" />
        <OperationalWorkspaceStatCard label="Configuration ready" value={lifecycle.data.summary.configuration_ready_tenants} helper="Tenant record has no listed blockers/warnings" tone="good" />
        <OperationalWorkspaceStatCard label="Attention" value={lifecycle.data.summary.configuration_attention_tenants} helper="Configuration warnings exist" tone="warn" />
        <OperationalWorkspaceStatCard label="Blocked" value={lifecycle.data.summary.configuration_blocked_tenants} helper="Lifecycle blocker in tenant record" tone="danger" />
        <OperationalWorkspaceStatCard label="Billing attention" value={lifecycle.data.summary.billing_attention_tenants} helper="Tenant-record billing posture only" tone="warn" />
        <OperationalWorkspaceStatCard label="Write locked" value={lifecycle.data.summary.write_locked_tenants} helper="Writes currently locked" tone="warn" />
        <OperationalWorkspaceStatCard label="Offboarding" value={lifecycle.data.summary.offboarding_tenants} helper="Loaded page only" tone="neutral" />
      </OperationalWorkspaceStats> : null}

      <section className="io-workspace-panel platform-tenant-lifecycle__section">
        <OperationalSectionHeader iconPath="/platform/tenant-lifecycle" title="Evidence boundary" description="This page classifies tenant-record configuration only. Supporting pages are navigation destinations, not evidence consumed by this lifecycle response." />
        <div className="platform-tenant-lifecycle__truth-note"><strong>Commercial readiness is not proven.</strong> A tenant marked <em>Configuration ready</em> only means the tenant record has none of this board’s configured blockers or warnings. It does not prove provisioning completion, operational health, export availability, offboarding closure, billing settlement, customer acceptance, launch approval or any external outcome.</div>
        {lifecycle.data ? <div className="platform-tenant-lifecycle__evidence-grid">
          <div><span>Evidence scope</span><strong>{humanize(lifecycle.data.governance_controls.evidence_scope)}</strong></div>
          <div><span>External evidence consumed</span><strong>{lifecycle.data.governance_controls.external_evidence_consumed ? 'Yes' : 'No'}</strong></div>
          <div><span>Commercial readiness proven</span><strong>{lifecycle.data.governance_controls.commercial_readiness_proven ? 'Yes' : 'No'}</strong></div>
          <div><span>Supporting routes are evidence</span><strong>{lifecycle.data.governance_controls.supporting_routes_are_evidence ? 'Yes' : 'No'}</strong></div>
          <div><span>Mutation owner</span><strong>{humanize(lifecycle.data.governance_controls.mutation_owner)}</strong></div>
        </div> : null}
        {lifecycle.data ? <div className="platform-tenant-lifecycle__supporting-grid">{lifecycle.data.governance_controls.supporting_routes.map((item) => {
          const link = supportingRouteLinks[item.route];
          const allowed = canOpenRoute(item.permission);
          return <div key={item.route} data-state={allowed ? 'available' : 'restricted'}><span>{humanize(item.purpose)}</span><strong>{item.route}</strong><small>{allowed ? `${item.permission} available` : `${item.permission} required`}</small>{link && allowed ? <Link to={link.to}>{link.label}</Link> : null}</div>;
        })}</div> : null}
      </section>

      <section className="io-workspace-panel platform-tenant-lifecycle__section">
        <OperationalSectionHeader iconPath="/platform/tenant-lifecycle" title="Tenant configuration queue" description="Blockers and warnings are derived from the tenant record. They are preparation signals, not proof that another lifecycle workflow has or has not occurred." />
        {!lifecycle.data && lifecycle.isLoading && !invalidFilters ? <div className="platform-tenant-lifecycle__loading">Loading tenant lifecycle configuration…</div> : null}
        {lifecycle.data && lifecycle.data.tenants.length === 0 ? <div className="platform-tenant-lifecycle__empty"><strong>No tenants match this loaded view.</strong><span>This does not establish anything about external tenant lifecycle activity. Change the filters or refresh the application snapshot.</span></div> : null}
        {lifecycle.data?.tenants.length ? <div className="platform-tenant-lifecycle__list">{lifecycle.data.tenants.map((tenant) => <article className="platform-tenant-lifecycle__card" key={tenant.id}>
          <div className="platform-tenant-lifecycle__card-header"><div><h4>{tenant.name}</h4><div className="platform-tenant-lifecycle__provenance"><span>{tenant.organization_type || 'Organization type not recorded'}</span><span>·</span><span>{tenant.location || 'Location not recorded'}</span><span>·</span><span>Updated {dateTime(tenant.updated_at)}</span></div></div><span className="platform-tenant-lifecycle__posture" data-tone={postureTone(tenant.configuration_posture)}>{humanize(tenant.configuration_posture)}</span></div>
          <div className="platform-tenant-lifecycle__metrics-grid">
            <div><span>Lifecycle</span><strong>{humanize(tenant.status)} · {humanize(tenant.lifecycle_bucket)}</strong></div>
            <div><span>Plan</span><strong>{tenant.plan_code || 'Not configured'}</strong></div>
            <div><span>Billing posture</span><strong>{humanize(tenant.billing_status)}</strong></div>
            <div><span>Feature flags</span><strong>{tenant.feature_flag_count}</strong></div>
            <div><span>Commercial limits</span><strong>{tenant.limit_count}</strong></div>
            <div><span>Support</span><strong>{tenant.support_enabled ? 'Enabled in tenant policy' : 'Disabled in tenant policy'}</strong></div>
            <div><span>Write lock</span><strong>{tenant.write_locked ? 'Locked' : 'Not locked'}</strong></div>
            <div><span>Readiness proof</span><strong>Not provided by this board</strong></div>
          </div>
          {tenant.blockers.length || tenant.warnings.length ? <div className="platform-tenant-lifecycle__signals">{tenant.blockers.map((signal) => <div key={`blocker-${signal}`} data-tone="danger"><span>Blocker</span><strong>{humanize(signal)}</strong></div>)}{tenant.warnings.map((signal) => <div key={`warning-${signal}`} data-tone="warn"><span>Warning</span><strong>{humanize(signal)}</strong></div>)}</div> : <div className="platform-tenant-lifecycle__clear-signal">No tenant-record configuration blockers or warnings were found. Deeper lifecycle evidence has not been evaluated here.</div>}
          <div className="platform-tenant-lifecycle__link-row">{perTenantLinks(tenant).map((link) => <Link key={`${tenant.id}-${link.to}`} to={link.to}>{link.label}</Link>)}</div>
        </article>)}</div> : null}
        {lifecycle.data ? <div className="platform-tenant-lifecycle__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || lifecycle.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} tenants</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!lifecycle.data.pagination.has_more || lifecycle.isFetching}>Next</button></div> : null}
      </section>

      <section className="io-workspace-panel platform-tenant-lifecycle__section">
        <OperationalSectionHeader iconPath="/platform/tenant-lifecycle" title="Supporting operations" description="Open only destinations your current Platform permission snapshot allows." />
        <div className="platform-tenant-lifecycle__link-row"><Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link><Link to="/platform/provisioning">Provisioning</Link><Link to={tenantId ? `/platform/tenant-offboarding?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-offboarding'}>Tenant offboarding</Link><Link to={tenantId ? `/platform/tenant-health?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-health'}>Tenant health</Link><Link to={tenantId ? `/platform/tenant-timeline?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-timeline'}>Tenant timeline</Link>{hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_EXPORT) ? <Link to="/platform/tenant-exports">Tenant exports</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? <Link to={tenantId ? `/platform/billing?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/billing'}>Billing</Link> : null}{canOpenSupportCockpit() ? <Link to={tenantId ? `/platform/support-operations-cockpit?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/support-operations-cockpit'}>Support cockpit</Link> : null}</div>
      </section>
    </div>
  );
}
