import { useEffect, useState } from 'react';
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
import './PlatformApiClientGovernancePage.css';

type Tenant = { id: string; name: string };
type Pagination = { limit: number; offset: number; has_more: boolean };
type EvidenceAccess = { tenant: boolean; platform_user_identity: boolean };
type ApiClientRow = {
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  name: string;
  description?: string | null;
  key_prefix: string;
  scopes: string[];
  allowed_ips: string[];
  allowed_ip_count: number;
  expires_at?: string | null;
  last_used_at?: string | null;
  last_used_ip?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by_email?: string | null;
  revoked_at?: string | null;
  is_active: boolean;
  is_expired: boolean;
  days_since_created?: number | null;
  days_since_last_used?: number | null;
  days_until_expiration?: number | null;
  risk_flags: string[];
  public_api_compatible: boolean;
  governance_state: string;
};
type Summary = {
  total_clients: number;
  governance_relevant_clients: number;
  active_clients: number;
  revoked_clients: number;
  clients_requiring_review: number;
  clients_without_expiration: number;
  clients_without_network_allowlist: number;
  stale_clients: number;
  write_scoped_clients: number;
  critical_clients_without_network_control: number;
  expiring_soon_clients: number;
  expired_clients: number;
  clients_without_scopes: number;
  clients_with_unsupported_scopes: number;
  tenants_with_clients: number | null;
};
type ApiClientGovernancePackage = {
  feature: string;
  phase: number;
  step: number;
  posture: string;
  summary: Summary;
  evidence_access: EvidenceAccess;
  pagination: Pagination;
  governance_controls: {
    read_only: boolean;
    mutation_owner: string;
    source_routes: string[];
    no_raw_secret_export: boolean;
    no_key_hash_export: boolean;
    secret_material_fields_blocked: string[];
    required_controls: string[];
    supported_scopes: string[];
    write_scopes: string[];
    stale_days: number;
    expiring_soon_days: number;
    revoked_clients_drive_posture: boolean;
    never_used_grace_days: number;
    summary_scope: string;
    page_scope: string;
  };
  truthfulness: {
    posture_is_external_integration_certification: boolean;
    last_used_is_application_observed_api_usage_only: boolean;
    no_clients_means_external_integrations_absent: boolean;
    interpretation: string;
  };
  api_clients: ApiClientRow[];
};

const PAGE_SIZE = 50;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}
function dateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString();
}
function pretty(value: string) {
  return value.replace(/^api_client_/, '').replace(/_/g, ' ');
}
function postureLabel(value?: string) {
  if (!value) return 'Awaiting snapshot';
  if (value === 'api_client_governance_ready') return 'Governed';
  if (value === 'api_client_governance_review_required') return 'Review required';
  if (value === 'api_client_governance_blocked') return 'Blocked';
  if (value === 'api_client_governance_no_active_clients') return 'No active clients';
  return pretty(value);
}
function postureTone(value?: string) {
  if (value?.includes('blocked')) return 'danger';
  if (value?.includes('review')) return 'warn';
  if (value?.includes('ready')) return 'good';
  return 'neutral';
}
function lifecycleLink(client: ApiClientRow) {
  const params = new URLSearchParams({ search: client.key_prefix, include_revoked: 'true' });
  return `/platform/api-keys?${params.toString()}`;
}
function auditLink(client: ApiClientRow) {
  const params = new URLSearchParams({ target_type: 'platform_api_key', target_id: client.id });
  return `/platform/audit?${params.toString()}`;
}

export default function PlatformApiClientGovernancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadPermissionAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ);
  const canReadDependencies = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedIncludeRevoked = searchParams.get('include_revoked') || '';
  const tenantId = canReadTenants && uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const includeRevoked = requestedIncludeRevoked === 'true';
  const invalidFilters = Boolean(
    (requestedTenantId && !tenantId) ||
    (requestedSearch && !search) ||
    (requestedIncludeRevoked && !['true', 'false'].includes(requestedIncludeRevoked))
  );

  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(0), [tenantId, search, includeRevoked, invalidFilters]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'api-client-governance-picker'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canReadTenants,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const governanceQuery = useQuery({
    queryKey: ['platform', 'api-client-governance', tenantId, search, includeRevoked, offset],
    queryFn: () => {
      // Foundation endpoint: platformApiRequest<ApiClientGovernancePackage>('/platform/api-client-governance/governance')
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) params.set('tenant_id', tenantId);
      if (search.trim()) params.set('search', search.trim());
      if (includeRevoked) params.set('include_revoked', 'true');
      return platformApiRequest<ApiClientGovernancePackage>(`/platform/api-client-governance/governance?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = governanceQuery.data;
  const summary = data?.summary;
  const clients = data?.api_clients || [];
  const access = data?.evidence_access || { tenant: canReadTenants, platform_user_identity: canReadPlatformUsers };
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const initialError = governanceQuery.isError && governanceQuery.data === undefined;
  const refreshError = governanceQuery.isError && governanceQuery.data !== undefined;

  const updateFilter = (key: 'tenant_id' | 'search' | 'include_revoked', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    for (const key of ['tenant_id', 'search', 'include_revoked']) next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const refreshAll = async () => {
    const work: Array<Promise<unknown>> = [governanceQuery.refetch()];
    if (canReadTenants) work.push(tenants.refetch());
    await Promise.all(work);
  };

  return (
    <div className="io-operational-page io-workspace-page platform-api-client-governance">
      <OperationalWorkspaceHero
        iconPath="/platform/api-client-governance"
        eyebrow="Platform operations"
        title="API client governance"
        description="Review application-recorded security and usage posture for Platform-managed public API credentials without exposing raw secrets or key hashes."
        meta={<>
          <OperationalWorkspaceMetaPill>Read-only governance board</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Public API scope contract</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Page size: {PAGE_SIZE}</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-api-client-governance__hero-aside">
          <OperationalWorkspaceStatus value={refreshError ? 'Stale snapshot' : invalidFilters ? 'Filter blocked' : postureLabel(data?.posture)} label="Application governance posture" />
          <div className="platform-api-client-governance__refresh-block">
            <button type="button" className="app-button app-button--secondary" onClick={() => void refreshAll()} disabled={governanceQuery.isFetching || invalidFilters}>{governanceQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
            <span>{data ? `Loaded ${clients.length} client records on page ${pageNumber}` : 'Awaiting governance snapshot'}</span>
          </div>
        </div>}
      />

      {refreshError ? <div className="platform-api-client-governance__warning"><strong>Showing the last successful API client governance snapshot.</strong> Refresh failed: {readableError(governanceQuery.error)}</div> : null}
      {tenants.isError && canReadTenants ? <div className="platform-api-client-governance__warning"><strong>Tenant directory unavailable.</strong> Governance remains visible, but tenant filtering is temporarily unavailable.</div> : null}

      <OperationalWorkspaceStats ariaLabel="API client governance registry metrics">
        <OperationalWorkspaceStatCard label="Governed clients" value={summary?.governance_relevant_clients ?? '—'} helper="Filtered registry; revoked history does not drive posture" tone={summary?.governance_relevant_clients ? 'slate' : 'neutral'} loading={governanceQuery.isLoading && !data} />
        <OperationalWorkspaceStatCard label="Require review" value={summary?.clients_requiring_review ?? '—'} helper="Active/expired credentials with recorded governance findings" tone={summary?.clients_requiring_review ? 'warn' : 'good'} loading={governanceQuery.isLoading && !data} />
        <OperationalWorkspaceStatCard label="Critical clients without network control" value={(summary?.critical_clients_without_network_control ?? 0) + (summary?.expired_clients ?? 0) + (summary?.clients_without_expiration ?? 0) + (summary?.clients_without_scopes ?? 0) + (summary?.clients_with_unsupported_scopes ?? 0)} helper="Credential-control findings that block a clean posture" tone={data?.posture?.includes('blocked') ? 'danger' : 'neutral'} loading={governanceQuery.isLoading && !data} />
        <OperationalWorkspaceStatCard label="Stale usage" value={summary?.stale_clients ?? '—'} helper={`No observed use or stale use beyond ${data?.governance_controls.stale_days ?? 90} days`} tone={summary?.stale_clients ? 'warn' : 'neutral'} loading={governanceQuery.isLoading && !data} />
        <OperationalWorkspaceStatCard label="Revoked history" value={summary?.revoked_clients ?? '—'} helper="Shown only when included; never drives governance posture" tone="neutral" loading={governanceQuery.isLoading && !data} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-panel platform-api-client-governance__section">
        <OperationalSectionHeader iconPath="/platform/api-client-governance" title="Evidence and truth boundary" description="The posture is derived from application credential configuration and API usage evidence only." />
        <div className="platform-api-client-governance__truth-note">
          <strong>What this board does not prove</strong>
          {data?.truthfulness.interpretation || 'This board does not certify an external integration, customer approval, or successful business outcome.'}
        </div>
        <div className="platform-api-client-governance__evidence-grid">
          <div data-state={access.tenant ? 'available' : 'restricted'}><span>Tenant identity</span><strong>{access.tenant ? 'Available' : 'Redacted'}</strong><small>TENANTS_READ</small></div>
          <div data-state={access.platform_user_identity ? 'available' : 'restricted'}><span>Creator identity</span><strong>{access.platform_user_identity ? 'Available' : 'Redacted'}</strong><small>PLATFORM_USERS_READ</small></div>
          <div><span>Revoked keys</span><strong>{data?.governance_controls.revoked_clients_drive_posture === false ? 'Historical only' : 'Posture-driving'}</strong><small>Revocation removes application authentication</small></div>
          <div><span>Never-used grace</span><strong>{data?.governance_controls.never_used_grace_days ?? 90} days</strong><small>New keys are not immediately marked stale</small></div>
        </div>
      </section>

      <section className="io-workspace-panel platform-api-client-governance__section">
        <OperationalSectionHeader iconPath="/platform/api-client-governance" title="Governance controls" description="Read-only checks over the public API credential registry." />
        <div className="platform-api-client-governance__control-grid">
          <div><span>Mutation owner</span><strong>{data?.governance_controls.mutation_owner || 'platform_api_keys'}</strong></div>
          <div><span>No raw secret export</span><strong>{data?.governance_controls.no_raw_secret_export === false ? 'False' : 'True'}</strong></div>
          <div><span>No key hash export</span><strong>{data?.governance_controls.no_key_hash_export === false ? 'False' : 'True'}</strong></div>
          <div><span>Summary scope</span><strong>{data?.governance_controls.summary_scope ? pretty(data.governance_controls.summary_scope) : 'Filtered registry'}</strong></div>
        </div>
        <div className="platform-api-client-governance__chips">{(data?.governance_controls.required_controls || []).map((control) => <span key={control}>{pretty(control)}</span>)}</div>
      </section>

      <section className="io-workspace-panel platform-api-client-governance__section">
        <OperationalSectionHeader iconPath="/platform/api-client-governance" title="Governance registry" description="Registry totals cover all records matching the current filters; the evidence cards below are a bounded page." />
        <div className="platform-api-client-governance__filter-grid">
          {canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-api-client-governance__restricted-filter">Tenant filter restricted · TENANTS_READ required</div>}
          <label>Search<input value={search} onChange={(event) => updateFilter('search', event.target.value)} maxLength={200} placeholder={canReadTenants ? 'Name, description, prefix, tenant' : 'Name, description, prefix'} /></label>
          <label className="platform-api-client-governance__checkbox"><input type="checkbox" checked={includeRevoked} onChange={(event) => updateFilter('include_revoked', event.target.checked ? 'true' : '')} />Include revoked history</label>
        </div>

        {invalidFilters ? <div className="platform-api-client-governance__blocking-error"><strong>Invalid or unauthorized URL filter</strong><span>Clear the invalid filter before loading governance evidence.</span><button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button></div> : null}
        {initialError ? <div className="platform-api-client-governance__blocking-error"><strong>API client governance unavailable</strong><span>{readableError(governanceQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void governanceQuery.refetch()}>Retry</button></div> : null}
        {governanceQuery.isLoading && !data ? <div className="platform-api-client-governance__loading">Loading API client governance…</div> : null}

        {data ? <div className="platform-api-client-governance__posture-row">
          <span>Filtered registry posture</span><strong data-tone={postureTone(data.posture)}>{postureLabel(data.posture)}</strong><small>{summary?.governance_relevant_clients ?? 0} non-revoked credential records considered</small>
        </div> : null}

        {clients.length ? <div className="platform-api-client-governance__list">{clients.map((client) => <article className="platform-api-client-governance__card" key={client.id}>
          <div className="platform-api-client-governance__card-header">
            <div><h4>{client.name}</h4><p>{client.description || 'No description recorded.'}</p></div>
            <div className="platform-api-client-governance__badges">
              <span data-tone={client.revoked_at ? 'neutral' : client.risk_flags.length ? 'warn' : 'good'}>{pretty(client.governance_state)}</span>
              <span data-tone={client.public_api_compatible ? 'good' : 'danger'}>{client.public_api_compatible ? 'Public API compatible' : 'Scope migration required'}</span>
            </div>
          </div>
          <div className="platform-api-client-governance__metrics-grid">
            <div><span>Tenant</span><strong>{access.tenant ? (client.tenant_name || client.tenant_id || 'Not recorded') : 'Redacted'}</strong></div>
            <div><span>Prefix</span><strong><code>{client.key_prefix}…</code></strong></div>
            <div><span>Created</span><strong>{dateTime(client.created_at)}</strong></div>
            <div><span>Created by</span><strong>{access.platform_user_identity ? (client.created_by_email || 'Not recorded') : 'Redacted'}</strong></div>
            <div><span>Expires</span><strong>{client.expires_at ? dateTime(client.expires_at) : 'No expiration'}</strong></div>
            <div><span>Last used</span><strong>{client.last_used_at ? dateTime(client.last_used_at) : 'Never observed'}</strong></div>
            <div><span>Last used IP</span><strong>{client.last_used_ip || 'Not recorded'}</strong></div>
            <div><span>Network allowlist</span><strong>{client.allowed_ip_count ? `${client.allowed_ip_count} exact IP${client.allowed_ip_count === 1 ? '' : 's'}` : 'Not configured'}</strong></div>
          </div>
          <div className="platform-api-client-governance__scope-list">{client.scopes.length ? client.scopes.map((scope) => <span key={scope} data-tone={data.governance_controls.supported_scopes.includes(scope) ? 'neutral' : 'danger'}>{scope}{data.governance_controls.supported_scopes.includes(scope) ? '' : ' · unsupported'}</span>) : <span data-tone="danger">No scopes</span>}</div>
          <div className="platform-api-client-governance__findings">
            <span>Governance findings</span>
            <div className="platform-api-client-governance__chips">{client.risk_flags.length ? client.risk_flags.map((flag) => <span key={flag} data-tone={flag.includes('expired') || flag.includes('unsupported') || flag.includes('critical') || flag.includes('missing') ? 'danger' : 'warn'}>{pretty(flag)}</span>) : <span data-tone="good">No active findings</span>}</div>
          </div>
          {client.revoked_at ? <div className="platform-api-client-governance__history-note"><strong>Revoked {dateTime(client.revoked_at)}</strong><span>This record is historical evidence and does not drive the active governance posture.</span></div> : null}
          <div className="platform-api-client-governance__source-links">
            <Link to={lifecycleLink(client)}>API key lifecycle</Link>
            {canReadAudit ? <Link to={auditLink(client)}>Audit evidence</Link> : null}
            {canReadTenants && client.tenant_id ? <Link to={`/platform/tenants?tenant_id=${encodeURIComponent(client.tenant_id)}`}>Tenant source</Link> : null}
          </div>
        </article>)}</div> : data ? <div className="platform-api-client-governance__empty"><strong>No API client records matched.</strong><span>This means the application registry produced no records for the current filters. It does not prove that no external integration, external credential, or external API activity exists.</span></div> : null}

        {data ? <div className="platform-api-client-governance__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || governanceQuery.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} client records</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!data.pagination.has_more || governanceQuery.isFetching}>Next</button></div> : null}
      </section>

      <section className="io-workspace-panel platform-api-client-governance__section">
        <OperationalSectionHeader iconPath="/platform/api-client-governance" title="Supporting operations" description="Open only destinations permitted by the current Platform permission snapshot." />
        <div className="platform-api-client-governance__supporting-links">
          <Link to="/platform/api-keys">API keys lifecycle</Link>
          {canReadTenants ? <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link> : null}
          {canReadDependencies ? <Link to="/platform/integration-monitoring">Integration monitoring</Link> : null}
          {canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}
          {canReadPermissionAudit ? <Link to="/platform/permission-audit">Permission audit</Link> : null}
        </div>
      </section>
    </div>
  );
}
