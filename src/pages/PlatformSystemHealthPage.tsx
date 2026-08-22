import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
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
import './PlatformSystemHealthPage.css';

type HealthStatus = 'healthy' | 'degraded' | 'not_monitored';
type HealthIssue = { type: 'BLOCKING_ALERTS' | 'NEGATIVE_STOCK' | 'FINALIZED_SHIPMENT_INCOMPLETE'; count: number; message: string };
type TenantHealthRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  status: HealthStatus;
  monitored: boolean;
  issue_count: number | null;
  affected_evidence_count: number | null;
  evidence: {
    blocking_alerts: number | null;
    negative_stock_rows: number | null;
    incomplete_finalized_shipments: number | null;
  };
  issues: HealthIssue[];
  derived_alert_active: boolean;
  derived_alert_sync: 'aligned' | 'pending_resolution' | 'pending_creation' | 'clear';
};
type SystemHealthResponse = {
  generated_at: string;
  tenants: TenantHealthRow[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    not_monitored: number;
    issue_categories: number;
    affected_evidence: number;
    derived_alerts_pending_resolution: number;
    derived_alerts_pending_creation: number;
  };
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: { tenant_identity: boolean; tenant_application_integrity: boolean };
  evidence_complete: boolean;
  evidence_contract: {
    system_health_read_is_derived_tenant_application_integrity_evidence: boolean;
    derived_system_health_alert_is_excluded_from_its_own_blocking_source: boolean;
    raw_tenant_alert_messages_are_not_exposed: boolean;
    archived_tenants_are_not_currently_monitored_by_default: boolean;
    healthy_does_not_prove_external_infrastructure_or_customer_visible_uptime: boolean;
    generated_snapshot_does_not_prove_future_health: boolean;
  };
};
type IdempotencyRow = {
  id: string;
  method: string;
  path: string;
  created_at: string;
  completed_at?: string | null;
  expires_at?: string | null;
};

type SupportLink = { label: string; to: string; allowed: boolean };

const PAGE_SIZE = 50;
const VALID_STATUSES = new Set<HealthStatus>(['healthy', 'degraded', 'not_monitored']);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readableError(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown error';
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

function pretty(value?: string | null) {
  return value ? value.replaceAll('_', ' ') : 'Not recorded';
}

function statusTone(status: HealthStatus) {
  if (status === 'healthy') return 'good';
  if (status === 'degraded') return 'danger';
  return 'neutral';
}

function syncTone(sync: TenantHealthRow['derived_alert_sync']) {
  if (sync === 'aligned' || sync === 'clear') return 'good';
  return 'warn';
}

function evidenceValue(value: number | null) {
  return value === null ? 'Not monitored' : String(value);
}

export default function PlatformSystemHealthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTenantId = searchParams.get('tenant_id') || '';
  const tenantId = uuidPattern.test(rawTenantId) ? rawTenantId : '';
  const rawStatus = searchParams.get('status') || '';
  const status = VALID_STATUSES.has(rawStatus as HealthStatus) ? rawStatus as HealthStatus : '';
  const search = searchParams.get('search') || '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);
  const includeArchived = searchParams.get('include_archived') === 'true' || status === 'not_monitored';
  const [searchDraft, setSearchDraft] = useState(search);

  const canReadDiagnostics = hasPlatformPermission(PLATFORM_PERMISSIONS.DIAGNOSTICS_READ);
  const canReadIncidents = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canOpenSupportCockpit = [
    PLATFORM_PERMISSIONS.TENANTS_READ,
    PLATFORM_PERMISSIONS.PLATFORM_SLA_READ,
    PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ
  ].every((permission) => hasPlatformPermission(permission));

  useEffect(() => setSearchDraft(search), [search]);

  const listParams = useMemo(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenant_id', tenantId);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    if (includeArchived) params.set('include_archived', 'true');
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params.toString();
  }, [tenantId, status, search, includeArchived, offset]);

  const systemHealthQuery = useQuery({
    queryKey: ['platform', 'system-health', 'registry', listParams],
    queryFn: () => platformApiRequest<SystemHealthResponse>(`/platform/system-health?${listParams}`),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    placeholderData: (previous) => previous
  });

  const diagnosticsQuery = useQuery({
    queryKey: ['platform', 'diagnostics', 'stuck-idempotency', 100],
    queryFn: () => platformApiRequest<IdempotencyRow[]>('/platform/diagnostics/stuck-idempotency?limit=100'),
    enabled: canReadDiagnostics,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    placeholderData: (previous) => previous
  });

  const data = systemHealthQuery.data;
  const summary = data?.summary;
  const rows = data?.tenants || [];
  const pagination = data?.pagination;
  const invalidTenantFilter = Boolean(rawTenantId) && !tenantId;
  const invalidStatusFilter = Boolean(rawStatus) && !status;
  const initialLoadError = systemHealthQuery.isError && !data;
  const refreshError = systemHealthQuery.isError && Boolean(data);
  const diagnosticsInitialError = diagnosticsQuery.isError && !diagnosticsQuery.data;
  const diagnosticsRefreshError = diagnosticsQuery.isError && Boolean(diagnosticsQuery.data);

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!Object.prototype.hasOwnProperty.call(patch, 'offset')) next.delete('offset');
    if ((patch.status ?? next.get('status')) === 'not_monitored') next.set('include_archived', 'true');
    setSearchParams(next, { replace: true });
  }

  function applySearch(event: FormEvent) {
    event.preventDefault();
    updateParams({ search: searchDraft.trim() || null });
  }

  async function refreshAll() {
    const jobs: Promise<unknown>[] = [systemHealthQuery.refetch()];
    if (canReadDiagnostics) jobs.push(diagnosticsQuery.refetch());
    await Promise.allSettled(jobs);
  }

  const supportLinks: SupportLink[] = [
    { label: 'Tenant Health', to: tenantId ? `/platform/tenant-health?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-health', allowed: true },
    { label: 'Incidents', to: tenantId ? `/platform/incidents?scope=tenant&tenant_id=${encodeURIComponent(tenantId)}&include_resolved=false` : '/platform/incidents', allowed: canReadIncidents },
    { label: 'Support Cockpit', to: tenantId ? `/platform/support-operations-cockpit?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/support-operations-cockpit', allowed: canOpenSupportCockpit },
    { label: 'Audit', to: tenantId ? `/platform/audit?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/audit', allowed: canReadAudit }
  ];
  const accessibleSupportLinks = supportLinks.filter((item) => item.allowed);

  return (
    <div className="io-operational-page io-workspace-page platform-system-health">
      <OperationalWorkspaceHero
        iconPath="/platform/system-health"
        eyebrow="Platform Operations"
        title="System Health"
        description="Read-only tenant application-integrity monitoring for unresolved blocking alerts, negative stock, and incomplete received shipments. This workspace does not prove infrastructure availability, external-service health, or customer-visible uptime."
        meta={<>
          <OperationalWorkspaceMetaPill>SYSTEM_HEALTH_READ + TENANTS_READ</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Derived application evidence</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Read only</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-system-health__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary?.degraded ?? 0}` : '—'}
              label="degraded tenants in filtered registry"
            />
            <div className="platform-system-health__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void refreshAll()}
                disabled={systemHealthQuery.isFetching || diagnosticsQuery.isFetching}
              >
                {systemHealthQuery.isFetching || diagnosticsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel="System Health key metrics">
        <OperationalWorkspaceStatCard iconPath="/platform/system-health" label="Tenants in scope" value={summary?.total ?? 0} helper="Registry-wide filtered scope, not just this page" loading={!data && systemHealthQuery.isLoading} />
        <OperationalWorkspaceStatCard iconPath="/platform/system-health" label="Healthy" value={summary?.healthy ?? 0} helper="All three application integrity checks clear" tone="good" loading={!data && systemHealthQuery.isLoading} />
        <OperationalWorkspaceStatCard iconPath="/platform/system-health" label="Degraded" value={summary?.degraded ?? 0} helper="At least one current integrity category has evidence" tone={(summary?.degraded ?? 0) > 0 ? 'danger' : 'default'} loading={!data && systemHealthQuery.isLoading} />
        <OperationalWorkspaceStatCard iconPath="/platform/system-health" label="Issue categories" value={summary?.issue_categories ?? 0} helper="Current health categories across filtered tenants" tone={(summary?.issue_categories ?? 0) > 0 ? 'warn' : 'default'} loading={!data && systemHealthQuery.isLoading} />
        <OperationalWorkspaceStatCard iconPath="/platform/system-health" label="Affected evidence" value={summary?.affected_evidence ?? 0} helper="Underlying alert, stock-row and shipment counts" tone={(summary?.affected_evidence ?? 0) > 0 ? 'warn' : 'default'} loading={!data && systemHealthQuery.isLoading} />
        <OperationalWorkspaceStatCard
          iconPath="/platform/system-health"
          label="Alert sync pending"
          value={(summary?.derived_alerts_pending_resolution ?? 0) + (summary?.derived_alerts_pending_creation ?? 0)}
          helper="Derived System Health alerts awaiting the scheduled synchronization cycle"
          tone={((summary?.derived_alerts_pending_resolution ?? 0) + (summary?.derived_alerts_pending_creation ?? 0)) > 0 ? 'warn' : 'good'}
          loading={!data && systemHealthQuery.isLoading}
        />
      </OperationalWorkspaceStats>

      {(invalidTenantFilter || invalidStatusFilter) ? (
        <div className="platform-system-health__warning" role="status">
          Invalid or unauthorized URL filter was ignored. Use the workspace controls below.
        </div>
      ) : null}

      {refreshError ? (
        <div className="platform-system-health__warning" role="status">
          <strong>Showing the last successful System Health snapshot.</strong>
          <span>Refresh failed: {readableError(systemHealthQuery.error)}</span>
        </div>
      ) : null}

      {initialLoadError ? (
        <div className="platform-system-health__blocking-error" role="alert">
          <strong>System Health failed to load.</strong>
          <span>{readableError(systemHealthQuery.error)}</span>
          <button type="button" className="app-button app-button--secondary" onClick={() => void systemHealthQuery.refetch()}>Retry</button>
        </div>
      ) : null}

      <section className="io-workspace-section platform-system-health__section">
        <OperationalSectionHeader
          iconPath="/platform/system-health"
          title="Health registry"
          description="Server-filtered current tenant integrity evidence. The derived SYSTEM_HEALTH_DEGRADED_BLOCKING alert is deliberately excluded from the evidence that decides health so it cannot keep itself alive."
        />

        <div className="platform-system-health__filters">
          <form onSubmit={applySearch} className="platform-system-health__search-form">
            <label>
              Search tenant
              <input value={searchDraft} maxLength={200} placeholder="Tenant name or ID" onChange={(event) => setSearchDraft(event.target.value)} />
            </label>
            <button type="submit" className="app-button app-button--secondary" disabled={systemHealthQuery.isFetching}>Search</button>
            {search ? <button type="button" className="app-button app-button--secondary" onClick={() => { setSearchDraft(''); updateParams({ search: null }); }}>Clear search</button> : null}
          </form>
          <label>
            Health status
            <select value={status} onChange={(event) => updateParams({ status: event.target.value || null })}>
              <option value="">All current statuses</option>
              <option value="healthy">Healthy</option>
              <option value="degraded">Degraded</option>
              <option value="not_monitored">Not monitored / archived</option>
            </select>
          </label>
          <label>
            Archived tenants
            <select value={includeArchived ? 'true' : 'false'} onChange={(event) => updateParams({ include_archived: event.target.value === 'true' ? 'true' : null })}>
              <option value="false">Exclude by default</option>
              <option value="true">Include archived</option>
            </select>
          </label>
        </div>

        {tenantId ? (
          <div className="platform-system-health__scope-notice">
            Exact tenant scope from URL: <code>{tenantId}</code>
            <button type="button" className="app-button app-button--secondary" onClick={() => updateParams({ tenant_id: null })}>Show registry</button>
          </div>
        ) : null}

        <div className="platform-system-health__support-links" aria-label="Supporting platform pages">
          {accessibleSupportLinks.map((item) => <Link key={item.label} to={item.to}>{item.label}</Link>)}
          {accessibleSupportLinks.length < supportLinks.length ? <span>{supportLinks.length - accessibleSupportLinks.length} supporting link(s) hidden by permission.</span> : null}
        </div>

        {data ? (
          <div className="platform-system-health__evidence-summary">
            <div><span>Evidence completeness</span><strong>{data.evidence_complete ? 'Complete' : 'Partial'}</strong></div>
            <div><span>Available sources</span><strong>{data.available_sources.length}</strong></div>
            <div><span>Omitted sources</span><strong>{data.omitted_sources.length}</strong></div>
            <div><span>Tenant identity</span><strong>{data.evidence_access.tenant_identity ? 'Available' : 'Restricted'}</strong></div>
          </div>
        ) : null}

        {!data && systemHealthQuery.isLoading ? <div className="platform-system-health__loading">Loading System Health…</div> : null}
        {data ? (
          <div className="platform-system-health__table-wrap">
            <table className="platform-system-health__table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Health</th>
                  <th>Issues</th>
                  <th>Underlying evidence</th>
                  <th>Derived alert sync</th>
                  <th>Evidence links</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.tenant_id}>
                    <td>
                      <strong>{row.tenant_name}</strong>
                      <span>{pretty(row.tenant_status)} · {row.tenant_id}</span>
                    </td>
                    <td>
                      <span className="platform-system-health__badge" data-tone={statusTone(row.status)}>{pretty(row.status)}</span>
                      <small>{row.issue_count === null ? 'Not evaluated as current health' : `${row.issue_count} category${row.issue_count === 1 ? '' : 'ies'}`}</small>
                    </td>
                    <td>
                      {row.issues.length ? (
                        <div className="platform-system-health__issues">
                          {row.issues.map((issue) => (
                            <div key={issue.type}>
                              <strong>{pretty(issue.type)}</strong>
                              <span>{issue.message}</span>
                            </div>
                          ))}
                        </div>
                      ) : <span className="platform-system-health__quiet">{row.monitored ? 'No current issue categories.' : 'Archived tenant is not currently monitored.'}</span>}
                    </td>
                    <td>
                      <div className="platform-system-health__evidence-grid">
                        <span>Blocking alerts <strong>{evidenceValue(row.evidence.blocking_alerts)}</strong></span>
                        <span>Negative stock <strong>{evidenceValue(row.evidence.negative_stock_rows)}</strong></span>
                        <span>Incomplete shipments <strong>{evidenceValue(row.evidence.incomplete_finalized_shipments)}</strong></span>
                      </div>
                    </td>
                    <td>
                      <span className="platform-system-health__badge" data-tone={syncTone(row.derived_alert_sync)}>{pretty(row.derived_alert_sync)}</span>
                      <small>{row.derived_alert_active ? 'Derived blocking alert currently exists.' : 'No derived System Health alert is active.'}</small>
                    </td>
                    <td>
                      <div className="platform-system-health__row-links">
                        <Link to={`/platform/tenant-health?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Tenant Health</Link>
                        {canReadIncidents ? <Link to={`/platform/incidents?scope=tenant&tenant_id=${encodeURIComponent(row.tenant_id)}&include_resolved=false`}>Incidents</Link> : null}
                        {canOpenSupportCockpit ? <Link to={`/platform/support-operations-cockpit?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Support</Link> : null}
                        {canReadAudit ? <Link to={`/platform/audit?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Audit</Link> : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length ? <tr><td colSpan={6} className="platform-system-health__empty">No System Health rows match the current server filters.</td></tr> : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {data ? (
          <div className="platform-system-health__pagination">
            <span>Showing {pagination?.total ? Math.min(offset + 1, pagination.total) : 0}–{Math.min(offset + rows.length, pagination?.total ?? 0)} of {pagination?.total ?? 0}</span>
            <button type="button" className="app-button app-button--secondary" disabled={offset <= 0 || systemHealthQuery.isFetching} onClick={() => updateParams({ offset: String(Math.max(0, offset - PAGE_SIZE)) })}>Previous</button>
            <button type="button" className="app-button app-button--secondary" disabled={!pagination?.has_more || systemHealthQuery.isFetching} onClick={() => updateParams({ offset: String(offset + PAGE_SIZE) })}>Next</button>
          </div>
        ) : null}
      </section>

      <section className="io-workspace-section platform-system-health__section">
        <OperationalSectionHeader
          iconPath="/platform/system-health"
          title="Platform diagnostics"
          description="Optional global diagnostics remain separately protected by DIAGNOSTICS_READ. Missing diagnostics permission does not turn tenant System Health counts into fake zeroes."
        />

        {!canReadDiagnostics ? (
          <div className="platform-system-health__restricted">
            <strong>Restricted</strong>
            <span>Your Platform role does not include DIAGNOSTICS_READ. Tenant System Health evidence above remains complete for its own defined sources.</span>
          </div>
        ) : null}

        {canReadDiagnostics && diagnosticsRefreshError ? (
          <div className="platform-system-health__warning" role="status">
            <strong>Showing the last successful diagnostics snapshot.</strong>
            <span>Refresh failed: {readableError(diagnosticsQuery.error)}</span>
          </div>
        ) : null}

        {canReadDiagnostics && diagnosticsInitialError ? (
          <div className="platform-system-health__blocking-error" role="alert">
            <strong>Platform diagnostics failed to load.</strong>
            <span>{readableError(diagnosticsQuery.error)}</span>
            <button type="button" className="app-button app-button--secondary" onClick={() => void diagnosticsQuery.refetch()}>Retry diagnostics</button>
          </div>
        ) : null}

        {canReadDiagnostics && !diagnosticsQuery.data && diagnosticsQuery.isLoading ? <div className="platform-system-health__loading">Loading platform diagnostics…</div> : null}

        {canReadDiagnostics && diagnosticsQuery.data ? (
          <div className="platform-system-health__diagnostics">
            <div className="platform-system-health__diagnostics-meta">
              <strong>{diagnosticsQuery.data.length}</strong>
              <span>stuck idempotency record(s), capped at 100 oldest records by this diagnostic read</span>
            </div>
            <div className="platform-system-health__table-wrap">
              <table className="platform-system-health__table">
                <thead><tr><th>Method</th><th>Path</th><th>Created</th><th>Expires</th><th>Record</th></tr></thead>
                <tbody>
                  {diagnosticsQuery.data.map((row) => (
                    <tr key={row.id}>
                      <td><strong>{row.method}</strong></td>
                      <td><code>{row.path}</code></td>
                      <td>{formatDateTime(row.created_at)}</td>
                      <td>{formatDateTime(row.expires_at)}</td>
                      <td>{canReadAudit ? <Link to={`/platform/audit?entity_type=idempotency_key&entity_id=${encodeURIComponent(row.id)}`}>Audit evidence</Link> : <span className="platform-system-health__quiet">ID {row.id.slice(0, 8)}…</span>}</td>
                    </tr>
                  ))}
                  {!diagnosticsQuery.data.length ? <tr><td colSpan={5} className="platform-system-health__empty">No stuck idempotency records in the bounded diagnostic result.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      <section className="io-workspace-section platform-system-health__truth">
        <OperationalSectionHeader
          iconPath="/platform/system-health"
          title="Evidence boundary"
          description="System Health is application evidence, not an external availability certificate."
        />
        <div className="platform-system-health__truth-grid">
          <div><strong>Healthy means</strong><span>No current evidence in the three defined tenant integrity categories at snapshot time.</span></div>
          <div><strong>Healthy does not mean</strong><span>Database, hosting, network, vendor, webhook, email, browser, or customer-visible uptime has been externally verified.</span></div>
          <div><strong>Derived alert rule</strong><span>The System Health blocking alert is a synchronized consequence of underlying evidence and is never allowed to become evidence for itself.</span></div>
          <div><strong>Snapshot rule</strong><span>This read is point-in-time application evidence and does not prove future health or successful remediation outside the application.</span></div>
        </div>
      </section>
    </div>
  );
}
