import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import './PlatformIntegrationMonitoringPage.css';

type Tenant = { id: string; name: string };
type SourceFamily = 'webhooks' | 'service_dependencies' | 'api_clients';
type Pagination = { limit: number; offset: number; has_more: boolean };
type EvidenceAccess = {
  webhooks: boolean;
  service_dependencies: boolean;
  api_clients: boolean;
  notifications: boolean;
  tenant: boolean;
  platform_user_identity: boolean;
  vendor_identity: boolean;
};

type RiskItem = {
  type: 'webhook' | 'service_dependency' | 'api_client';
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  name: string;
  risk_flags: string[];
  health_state: string;
  is_revoked?: boolean;
};

type WebhookItem = RiskItem & {
  type: 'webhook';
  event_types: string[];
  is_enabled: boolean;
  last_delivery_at?: string | null;
  last_delivery_status?: string | null;
  consecutive_failure_count: number;
};

type DependencyItem = RiskItem & {
  type: 'service_dependency';
  category: string;
  status: string;
  business_impact: string;
  vendor_name?: string | null;
  owner_email?: string | null;
  owner_present: boolean;
  last_checked_at?: string | null;
  days_since_last_checked?: number | null;
  escalation_url_present: boolean;
};

type ApiClientItem = RiskItem & {
  type: 'api_client';
  credential_source: 'platform_api_keys' | 'tenant_api_clients';
  credential_contract: 'inv_live_public_api' | 'legacy_hla_accepted';
  key_prefix: string;
  scopes: string[];
  unsupported_scopes: string[];
  public_api_compatible: boolean;
  network_allowlist_supported: boolean;
  allowed_ip_count: number | null;
  last_used_at?: string | null;
  days_since_last_used?: number | null;
  created_at?: string | null;
  days_since_created?: number | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  is_expired: boolean;
};

type IntegrationNotificationScanResponse = {
  scanned_at: string;
  posture: string;
  integrations_checked: number;
  risks_found: number;
  notifications_touched: number;
  created: number;
  refreshed: number;
  auto_resolved?: number;
  sla_escalated?: number;
  routing_escalated?: number;
};

type IntegrationMonitoringSurface = {
  feature: string;
  phase: number;
  step: number;
  posture: string;
  summary: {
    scope: string;
    total_integrations: number;
    webhooks: number;
    service_dependencies: number;
    api_clients: number;
    platform_api_clients: number;
    tenant_api_clients: number;
    revoked_api_client_history: number;
    integrations_requiring_review: number;
    unhealthy_dependencies: number;
    critical_unhealthy_dependencies: number;
    webhooks_with_delivery_failures: number;
    stale_dependency_checks: number;
    stale_api_clients: number;
    expired_api_clients: number;
    unsupported_scope_api_clients: number;
    tenants_with_monitored_integrations: number | null;
    active_integration_notifications: number | null;
    integration_risks_without_active_notifications: number | null;
    critical_open_sla_breaches: number | null;
  };
  pagination: Pagination;
  evidence_access: EvidenceAccess;
  available_sources: string[];
  omitted_sources: string[];
  monitoring_controls: {
    read_only: boolean;
    mutation_owners: string[];
    source_routes: string[];
    no_secret_export: boolean;
    no_secret_hash_export: boolean;
    secret_material_fields_blocked: string[];
    webhook_failure_threshold: number;
    stale_dependency_check_days: number;
    stale_api_client_days: number;
    never_used_grace_days: number;
    revoked_credentials_drive_posture: boolean;
    include_revoked_history: boolean;
    selected_sources: string[];
    required_controls: string[];
    notification_coverage_scope: string;
    public_api_contract: {
      accepted_prefixes: string[];
      preferred_new_key_format: string;
      supported_scopes: string[];
      platform_key_ip_allowlist_enforced: boolean;
      tenant_api_client_ip_allowlist_supported: boolean;
    };
  };
  truthfulness: {
    application_evidence_only: boolean;
    credential_exists_means_connected: boolean;
    last_used_at_means_authenticated_request_seen: boolean;
    last_used_at_proves_request_outcome: boolean;
    persisted_public_api_success_failure_counts_available: boolean;
    absence_of_usage_proves_no_external_integration: boolean;
    interpretation: string;
  };
  notification_coverage: {
    active_risk_keys: number;
    active_integration_notifications: number;
    integration_risks_without_active_notifications: number;
    critical_open_sla_breaches: number;
  } | null;
  webhooks: WebhookItem[];
  service_dependencies: DependencyItem[];
  api_clients: ApiClientItem[];
};

const PAGE_SIZE = 50;
const SOURCE_OPTIONS: Array<{ value: SourceFamily; label: string }> = [
  { value: 'service_dependencies', label: 'Service dependencies' },
  { value: 'webhooks', label: 'Webhooks' },
  { value: 'api_clients', label: 'Public API clients' }
];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}
function pretty(value: string) {
  return value.replace(/^integration_monitoring_/, '').replace(/^integration_/, '').replace(/^api_client_/, '').replace(/_/g, ' ');
}
function dateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString();
}
function postureLabel(value?: string) {
  if (!value) return 'Awaiting snapshot';
  if (value === 'integration_monitoring_escalation_breached') return 'Escalation breached';
  if (value === 'integration_monitoring_blocked') return 'Blocked';
  if (value === 'integration_monitoring_partial_evidence') return 'Partial evidence';
  if (value === 'integration_monitoring_notification_gap') return 'Notification gap';
  if (value === 'integration_monitoring_review_required') return 'Review required';
  if (value === 'integration_monitoring_no_observed_evidence') return 'No observed evidence';
  if (value === 'integration_monitoring_no_recorded_findings') return 'No recorded findings';
  return pretty(value);
}
function postureTone(value?: string) {
  if (value?.includes('blocked') || value?.includes('breached')) return 'danger';
  if (value?.includes('review') || value?.includes('partial') || value?.includes('gap')) return 'warn';
  if (value?.includes('no_recorded_findings')) return 'good';
  return 'neutral';
}
function findingTone(flag: string) {
  if (flag.includes('critical') || flag.includes('expired') || flag.includes('unsupported') || flag.includes('failure_threshold')) return 'danger';
  return 'warn';
}
function sourceLabel(item: RiskItem) {
  if (item.type === 'webhook') return 'Webhook';
  if (item.type === 'service_dependency') return 'Service dependency';
  const client = item as ApiClientItem;
  return client.credential_source === 'tenant_api_clients' ? 'Tenant-created API client' : 'Platform-created API key';
}

export default function PlatformIntegrationMonitoringPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadNotifications = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ);
  const canWriteNotifications = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_WRITE);
  const canReadApiKeys = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ);
  const canReadWebhooks = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ);
  const canReadVendors = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ);
  const canReadDependencies = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);

  const sourcePermission: Record<SourceFamily, boolean> = {
    webhooks: canReadWebhooks,
    service_dependencies: canReadDependencies,
    api_clients: canReadApiKeys
  };

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedSource = searchParams.get('source') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedIncludeRevoked = searchParams.get('include_revoked') || '';
  const tenantId = canReadTenants && uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const source = SOURCE_OPTIONS.some((option) => option.value === requestedSource) && sourcePermission[requestedSource as SourceFamily] ? requestedSource as SourceFamily : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const includeRevoked = requestedIncludeRevoked === 'true';
  const invalidFilters = Boolean(
    (requestedTenantId && !tenantId) ||
    (requestedSource && !source) ||
    (requestedSearch && !search) ||
    (requestedIncludeRevoked && !['true', 'false'].includes(requestedIncludeRevoked))
  );

  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(0), [tenantId, source, search, includeRevoked, invalidFilters]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'integration-monitoring-picker'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canReadTenants,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const monitoringQuery = useQuery({
    queryKey: ['platform', 'integration-monitoring', tenantId, source, search, includeRevoked, offset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) params.set('tenant_id', tenantId);
      if (source) params.set('source', source);
      if (search.trim()) params.set('search', search.trim());
      if (includeRevoked) params.set('include_revoked', 'true');
      return platformApiRequest<IntegrationMonitoringSurface>(`/platform/integration-monitoring/surface?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const canRunNotificationScan = canReadNotifications && canWriteNotifications && canReadDependencies && canReadWebhooks && canReadApiKeys && canReadTenants && canReadUsers && canReadVendors;
  const runNotificationScan = useMutation({
    mutationFn: () => platformApiRequest<IntegrationNotificationScanResponse>('/platform/notifications/integration-monitoring-scan', { method: 'POST' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform', 'integration-monitoring'] }),
        queryClient.invalidateQueries({ queryKey: ['platform', 'notifications'] })
      ]);
    }
  });

  const data = monitoringQuery.data;
  const summary = data?.summary;
  const access = data?.evidence_access;
  const evidence = useMemo<RiskItem[]>(() => [...(data?.service_dependencies || []), ...(data?.webhooks || []), ...(data?.api_clients || [])], [data]);
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const initialError = monitoringQuery.isError && monitoringQuery.data === undefined;
  const refreshError = monitoringQuery.isError && monitoringQuery.data !== undefined;
  const loadedAt = data && monitoringQuery.dataUpdatedAt ? dateTime(new Date(monitoringQuery.dataUpdatedAt).toISOString()) : 'Not loaded';

  const updateFilter = (key: 'tenant_id' | 'source' | 'search' | 'include_revoked', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    for (const key of ['tenant_id', 'source', 'search', 'include_revoked']) next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const refreshAll = async () => {
    const requests: Array<Promise<unknown>> = [monitoringQuery.refetch()];
    if (canReadTenants) requests.push(tenants.refetch());
    await Promise.all(requests);
  };

  return (
    <div className="platform-integration-monitoring">
      <OperationalWorkspaceHero
        iconPath="/platform/integration-monitoring"
        eyebrow="Platform operations"
        title="Integration monitoring"
        description="Review application-recorded integration evidence without treating credential existence, internal metadata, or missing records as proof of an external customer outcome."
        meta={<>
          <OperationalWorkspaceMetaPill>Read-only monitoring board</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Unified public API credential evidence</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Page size: {PAGE_SIZE}</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-integration-monitoring__hero-aside">
          <OperationalWorkspaceStatus value={refreshError ? 'Stale snapshot' : invalidFilters ? 'Filter blocked' : postureLabel(data?.posture)} label="Application monitoring posture" />
          <div className="platform-integration-monitoring__refresh-block">
            <button type="button" className="app-button app-button--secondary" onClick={() => void refreshAll()} disabled={monitoringQuery.isFetching || invalidFilters}>{monitoringQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
            <span>{data ? `Loaded ${evidence.length} evidence rows · page ${pageNumber}` : 'Awaiting monitoring snapshot'}</span>
          </div>
        </div>}
      />

      {refreshError ? <div className="platform-integration-monitoring__warning"><strong>Showing the last successful integration monitoring snapshot.</strong> Refresh failed: {readableError(monitoringQuery.error)}</div> : null}
      {tenants.isError && canReadTenants ? <div className="platform-integration-monitoring__warning"><strong>Tenant directory unavailable.</strong> Monitoring remains available, but tenant filtering is temporarily unavailable.</div> : null}

      <OperationalWorkspaceStats ariaLabel="Integration monitoring loaded-page metrics">
        <OperationalWorkspaceStatCard label="Evidence rows" value={summary?.total_integrations ?? '—'} helper="Loaded page only; not an external-integration count" tone="slate" loading={monitoringQuery.isLoading && !data} />
        <OperationalWorkspaceStatCard label="Require review" value={summary?.integrations_requiring_review ?? '—'} helper="Recorded findings on the loaded evidence page" tone={summary?.integrations_requiring_review ? 'warn' : 'good'} loading={monitoringQuery.isLoading && !data} />
        <OperationalWorkspaceStatCard label="Webhook delivery failures" value={summary?.webhooks_with_delivery_failures ?? '—'} helper={`Threshold: ${data?.monitoring_controls.webhook_failure_threshold ?? 3} consecutive failures`} tone={summary?.webhooks_with_delivery_failures ? 'danger' : 'neutral'} loading={monitoringQuery.isLoading && !data} />
        <OperationalWorkspaceStatCard label="Stale API usage" value={summary?.stale_api_clients ?? '—'} helper={`Never-used grace / stale threshold: ${data?.monitoring_controls.stale_api_client_days ?? 90} days`} tone={summary?.stale_api_clients ? 'warn' : 'neutral'} loading={monitoringQuery.isLoading && !data} />
        <OperationalWorkspaceStatCard label="Notification gaps" value={summary?.integration_risks_without_active_notifications ?? (canReadNotifications ? '—' : 'Restricted')} helper="Loaded-page risk coverage only" tone={(summary?.integration_risks_without_active_notifications || 0) > 0 ? 'warn' : 'neutral'} loading={monitoringQuery.isLoading && !data} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-panel platform-integration-monitoring__section">
        <OperationalSectionHeader iconPath="/platform/integration-monitoring" title="Evidence and truth boundary" description="Protected source evidence is permission-scoped on the server, not merely hidden in this page." />
        <div className="platform-integration-monitoring__truth-note">
          <strong>What this board does not prove</strong>
          <span>{data?.truthfulness.interpretation || 'Application monitoring records do not certify an external integration, customer authorization, or successful external work.'}</span>
        </div>
        <div className="platform-integration-monitoring__evidence-grid">
          <div data-state={access?.service_dependencies ? 'available' : 'restricted'}><span>Service dependencies</span><strong>{access?.service_dependencies ? 'Available' : 'Restricted'}</strong><small>PLATFORM_DEPENDENCIES_READ</small></div>
          <div data-state={access?.webhooks ? 'available' : 'restricted'}><span>Webhooks</span><strong>{access?.webhooks ? 'Available' : 'Omitted'}</strong><small>PLATFORM_WEBHOOKS_READ</small></div>
          <div data-state={access?.api_clients ? 'available' : 'restricted'}><span>Public API clients</span><strong>{access?.api_clients ? 'Available' : 'Omitted'}</strong><small>PLATFORM_API_KEYS_READ</small></div>
          <div data-state={access?.notifications ? 'available' : 'restricted'}><span>Notification coverage</span><strong>{access?.notifications ? 'Available' : 'Omitted'}</strong><small>PLATFORM_NOTIFICATIONS_READ</small></div>
          <div data-state={access?.tenant ? 'available' : 'restricted'}><span>Tenant identity</span><strong>{access?.tenant ? 'Available' : 'Redacted'}</strong><small>TENANTS_READ</small></div>
          <div data-state={access?.platform_user_identity ? 'available' : 'restricted'}><span>Dependency owner identity</span><strong>{access?.platform_user_identity ? 'Available' : 'Redacted'}</strong><small>PLATFORM_USERS_READ</small></div>
          <div data-state={access?.vendor_identity ? 'available' : 'restricted'}><span>Vendor identity</span><strong>{access?.vendor_identity ? 'Available' : 'Redacted'}</strong><small>PLATFORM_VENDORS_READ</small></div>
          <div><span>Public API request outcome counts</span><strong>Not persisted here</strong><small>Last used means authenticated request observed, not successful work</small></div>
        </div>
        {data?.omitted_sources.length ? <div className="platform-integration-monitoring__partial-note"><strong>Partial source visibility:</strong> {data.omitted_sources.map(pretty).join(', ')} omitted by the current permission snapshot.</div> : null}
      </section>

      <section className="io-workspace-panel platform-integration-monitoring__section">
        <OperationalSectionHeader iconPath="/platform/integration-monitoring" title="Monitoring evidence" description="URL-backed filters and bounded server pagination over evidence the current operator is allowed to read." />
        <div className="platform-integration-monitoring__filter-grid">
          {canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)}><option value="">All tenant scopes</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select><small>Tenant filtering excludes platform-wide service dependencies.</small></label> : <div className="platform-integration-monitoring__restricted-filter">Tenant filter restricted · TENANTS_READ required</div>}
          <label>Source<select value={source} onChange={(event) => updateFilter('source', event.target.value)}><option value="">All permitted sources</option>{SOURCE_OPTIONS.filter((option) => sourcePermission[option.value]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Search<input value={search} onChange={(event) => updateFilter('search', event.target.value)} maxLength={200} placeholder={canReadTenants ? 'Name, prefix, tenant' : 'Name or prefix'} /></label>
          {canReadApiKeys ? <label className="platform-integration-monitoring__checkbox"><input type="checkbox" checked={includeRevoked} onChange={(event) => updateFilter('include_revoked', event.target.checked ? 'true' : '')} />Include revoked API credential history</label> : <div className="platform-integration-monitoring__restricted-filter">API client history omitted · PLATFORM_API_KEYS_READ required</div>}
        </div>

        {invalidFilters ? <div className="platform-integration-monitoring__blocking-error"><strong>Invalid or unauthorized URL filter</strong><span>Clear the invalid filter before loading monitoring evidence. A protected source cannot be requested through a URL to bypass its permission.</span><button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button></div> : null}
        {initialError ? <div className="platform-integration-monitoring__blocking-error"><strong>Integration monitoring unavailable</strong><span>{readableError(monitoringQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void monitoringQuery.refetch()}>Retry</button></div> : null}
        {monitoringQuery.isLoading && !data ? <div className="platform-integration-monitoring__loading">Loading permitted integration evidence…</div> : null}

        {data ? <div className="platform-integration-monitoring__posture-row"><span>Loaded evidence posture</span><strong data-tone={postureTone(data.posture)}>{postureLabel(data.posture)}</strong><small>Snapshot: {loadedAt} · summary scope: loaded evidence page</small></div> : null}

        {evidence.length ? <div className="platform-integration-monitoring__list">{evidence.map((item) => {
          const webhook = item.type === 'webhook' ? item as WebhookItem : null;
          const dependency = item.type === 'service_dependency' ? item as DependencyItem : null;
          const client = item.type === 'api_client' ? item as ApiClientItem : null;
          return <article className="platform-integration-monitoring__card" key={`${item.type}:${item.id}`}>
            <div className="platform-integration-monitoring__card-header">
              <div><h4>{item.name}</h4><p>{sourceLabel(item)}</p></div>
              <div className="platform-integration-monitoring__badges"><span data-tone={item.is_revoked ? 'neutral' : item.risk_flags.length ? 'warn' : 'good'}>{pretty(item.health_state)}</span>{client ? <span data-tone={client.public_api_compatible ? 'good' : 'danger'}>{client.public_api_compatible ? 'Public API scope compatible' : 'Scope migration required'}</span> : null}</div>
            </div>

            <div className="platform-integration-monitoring__metrics-grid">
              {item.type !== 'service_dependency' ? <div><span>Tenant</span><strong>{access?.tenant ? (item.tenant_name || item.tenant_id || 'Not bound') : 'Redacted'}</strong></div> : <div><span>Scope</span><strong>Platform-wide dependency</strong></div>}
              {webhook ? <><div><span>Enabled</span><strong>{webhook.is_enabled ? 'Yes' : 'No'}</strong></div><div><span>Last delivery</span><strong>{dateTime(webhook.last_delivery_at)}</strong></div><div><span>Last delivery status</span><strong>{webhook.last_delivery_status || 'Not recorded'}</strong></div><div><span>Consecutive failures</span><strong>{webhook.consecutive_failure_count}</strong></div><div><span>Subscribed events</span><strong>{webhook.event_types.length}</strong></div></> : null}
              {dependency ? <><div><span>Status</span><strong>{pretty(dependency.status)}</strong></div><div><span>Business impact</span><strong>{pretty(dependency.business_impact)}</strong></div><div><span>Owner</span><strong>{dependency.owner_present ? (access?.platform_user_identity ? (dependency.owner_email || 'Recorded') : 'Recorded · identity redacted') : 'Missing'}</strong></div><div><span>Vendor</span><strong>{access?.vendor_identity ? (dependency.vendor_name || 'Not linked') : 'Redacted'}</strong></div><div><span>Last checked</span><strong>{dateTime(dependency.last_checked_at)}</strong></div></> : null}
              {client ? <><div><span>Credential registry</span><strong>{client.credential_source === 'tenant_api_clients' ? 'Tenant-created' : 'Platform-created'}</strong></div><div><span>Credential contract</span><strong>{client.credential_contract === 'legacy_hla_accepted' ? 'Legacy hla_ · accepted for migration' : 'inv_live public API'}</strong></div><div><span>Prefix</span><strong><code>{client.key_prefix || 'Not recorded'}…</code></strong></div><div><span>Last authenticated request</span><strong>{dateTime(client.last_used_at)}</strong></div><div><span>Expires</span><strong>{client.expires_at ? dateTime(client.expires_at) : 'No expiration recorded'}</strong></div><div><span>IP allowlist</span><strong>{client.network_allowlist_supported ? `${client.allowed_ip_count || 0} configured` : 'Not supported by tenant client model'}</strong></div></> : null}
            </div>

            {client ? <div className="platform-integration-monitoring__scope-list">{client.scopes.length ? client.scopes.map((scopeName) => <span key={scopeName} data-tone={client.unsupported_scopes.includes(scopeName) ? 'danger' : 'neutral'}>{scopeName}{client.unsupported_scopes.includes(scopeName) ? ' · unsupported' : ''}</span>) : <span data-tone="danger">No scopes</span>}</div> : null}
            <div className="platform-integration-monitoring__findings"><span>Monitoring findings</span><div className="platform-integration-monitoring__chips">{item.risk_flags.length ? item.risk_flags.map((flag) => <span key={flag} data-tone={findingTone(flag)}>{pretty(flag)}</span>) : <span data-tone="good">No recorded findings in this evidence</span>}</div></div>
            {client?.is_revoked ? <div className="platform-integration-monitoring__history-note"><strong>Revoked credential history</strong><span>Visible because revoked history was explicitly included. It does not drive the current monitoring posture.</span></div> : null}
            <div className="platform-integration-monitoring__source-links">
              {webhook && canReadWebhooks ? <Link to="/platform/webhooks">Webhook source</Link> : null}
              {dependency && canReadDependencies ? <Link to="/platform/service-dependencies">Dependency source</Link> : null}
              {client?.credential_source === 'platform_api_keys' && canReadApiKeys ? <Link to={`/platform/api-keys?search=${encodeURIComponent(client.key_prefix)}&include_revoked=true`}>API key lifecycle</Link> : null}
              {client?.credential_source === 'tenant_api_clients' ? <span>Tenant-managed credential · no Platform lifecycle action</span> : null}
              {canReadTenants && item.tenant_id ? <Link to={`/platform/tenants?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant source</Link> : null}
            </div>
          </article>;
        })}</div> : data ? <div className="platform-integration-monitoring__empty"><strong>No application evidence matched.</strong><span>This means the permitted application sources returned no rows for the current filters. It does not prove that no external integration or external activity exists.</span></div> : null}

        {data ? <div className="platform-integration-monitoring__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || monitoringQuery.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} evidence rows</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!data.pagination.has_more || monitoringQuery.isFetching}>Next</button></div> : null}
      </section>

      <section className="io-workspace-panel platform-integration-monitoring__section">
        <OperationalSectionHeader iconPath="/platform/notifications" title="Notification reconciliation" description="The manual scan consumes all protected monitoring sources, tenant identity, dependency owner/vendor identity, and active notification state." actions={<button type="button" className="app-button app-button--primary" disabled={!canRunNotificationScan || runNotificationScan.isPending} onClick={() => runNotificationScan.mutate()}>{runNotificationScan.isPending ? 'Reconciling…' : 'Run notification reconciliation'}</button>} />
        {!canRunNotificationScan ? <div className="platform-integration-monitoring__permission-note">Manual reconciliation is disabled unless the operator has notification read/write plus Dependency, Webhook, API Key, Tenant, Platform User, and Vendor read permissions. Scheduled system reconciliation remains independent of this UI permission set.</div> : null}
        {runNotificationScan.data ? <div className="platform-integration-monitoring__success"><strong>Reconciliation complete.</strong><span>{runNotificationScan.data.risks_found} recorded risks; {runNotificationScan.data.notifications_touched} notifications touched ({runNotificationScan.data.created} created, {runNotificationScan.data.refreshed} refreshed, {runNotificationScan.data.auto_resolved || 0} auto-resolved).</span></div> : null}
        {runNotificationScan.isError ? <div className="platform-integration-monitoring__mutation-error"><strong>Reconciliation failed.</strong><span>{readableError(runNotificationScan.error)}</span></div> : null}
      </section>

      <section className="io-workspace-panel platform-integration-monitoring__section">
        <OperationalSectionHeader iconPath="/platform/integration-monitoring" title="Monitoring controls and supporting operations" description="Only destinations permitted by the current Platform permission snapshot are shown." />
        <div className="platform-integration-monitoring__control-grid">
          <div><span>Public API credential registries</span><strong>Platform + tenant-created</strong></div>
          <div><span>Preferred key contract</span><strong>{data?.monitoring_controls.public_api_contract.preferred_new_key_format || 'inv_live_<prefix>_<secret>'}</strong></div>
          <div><span>Never-used grace</span><strong>{data?.monitoring_controls.never_used_grace_days ?? 90} days</strong></div>
          <div><span>Revoked credentials drive posture</span><strong>{data?.monitoring_controls.revoked_credentials_drive_posture === false ? 'No · historical only' : 'Unknown'}</strong></div>
          <div><span>Raw secret export</span><strong>{data?.monitoring_controls.no_secret_export === false ? 'Allowed' : 'Blocked'}</strong></div>
          <div><span>Request success/failure counts</span><strong>Not persisted by this surface</strong></div>
        </div>
        <div className="platform-integration-monitoring__supporting-links">
          {canReadDependencies ? <Link to="/platform/service-dependencies">Service dependencies</Link> : null}
          {canReadWebhooks ? <Link to="/platform/webhooks">Webhooks</Link> : null}
          {canReadApiKeys ? <Link to="/platform/api-keys">API keys</Link> : null}
          {canReadApiKeys ? <Link to="/platform/api-client-governance">API client governance</Link> : null}
          {canReadNotifications ? <Link to="/platform/notifications">Notifications</Link> : null}
          {canReadTenants ? <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link> : null}
          {canReadVendors ? <Link to="/platform/vendors">Vendors</Link> : null}
        </div>
      </section>
    </div>
  );
}
