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
import './PlatformTenantHealthPage.css';

type Tenant = { id: string; name: string; location?: string | null };
type HealthIssue = { source: string; code: string; severity: 'info' | 'warning' | 'critical'; points: number; message: string };
type Usage = { key: string; label: string; used: number; limit: number; percent_used: number };
type HealthBand = 'healthy' | 'watch' | 'risk' | 'critical' | 'partial';
type TenantHealth = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  billing_status: string;
  plan_code: string;
  write_locked: boolean;
  score: number | null;
  band: HealthBand;
  score_complete: boolean;
  last_activity_at?: string | null;
  activity_evidence_complete: boolean;
  counts: Record<string, number | null>;
  usage: Usage[];
  issues: HealthIssue[];
};
type HealthResponse = {
  generated_at: string;
  evidence: { available: string[]; omitted: string[]; complete: boolean };
  summary_scope: 'loaded_page' | 'full_scan_scope';
  summary: { total: number; healthy: number; watch: number; risk: number; critical: number; partial: number };
  pagination: { limit: number; offset: number; has_more: boolean } | null;
  tenants: TenantHealth[];
};
type ScanResult = {
  scanned_at: string;
  threshold: number;
  tenants_checked: number;
  unhealthy_tenants: number;
  notifications_touched: number;
  created: number;
  refreshed: number;
  resolved_recovered: number;
  resolved_duplicates: number;
};

type EvidenceOption = { key: string; label: string; permission: string };
const HEALTH_EVIDENCE: EvidenceOption[] = [
  { key: 'tenant_core', label: 'Tenant core, usage and tasks', permission: PLATFORM_PERMISSIONS.TENANTS_READ },
  { key: 'incidents', label: 'Incidents', permission: PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ },
  { key: 'support_sessions', label: 'Support sessions', permission: PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ },
  { key: 'notifications', label: 'Platform notifications', permission: PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ },
  { key: 'audit_activity', label: 'Tenant audit activity', permission: PLATFORM_PERMISSIONS.AUDIT_READ }
];
const FULL_SCAN_READ_PERMISSIONS = HEALTH_EVIDENCE.map((item) => item.permission);
const PAGE_SIZE = 100;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validBands: HealthBand[] = ['healthy', 'watch', 'risk', 'critical', 'partial'];

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
function countValue(value: number | null | undefined) {
  return value === null || value === undefined ? 'Hidden by permission' : String(value);
}
function bandTone(band: HealthBand) {
  if (band === 'critical') return 'critical';
  if (band === 'risk' || band === 'watch' || band === 'partial') return 'warn';
  return 'good';
}

export default function PlatformTenantHealthPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offset, setOffset] = useState(0);
  const [threshold, setThreshold] = useState('70');
  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedBand = searchParams.get('band') || '';
  const tenantId = uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const band = validBands.includes(requestedBand as HealthBand) ? requestedBand as HealthBand : '';
  const invalidTenantFilter = Boolean(requestedTenantId && !tenantId);
  const invalidBandFilter = Boolean(requestedBand && !band);
  const invalidFilters = invalidTenantFilter || invalidBandFilter;

  useEffect(() => { setOffset(0); }, [tenantId, band, invalidFilters]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'health-selector'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const health = useQuery({
    queryKey: ['platform', 'tenant-health', tenantId, offset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) params.set('tenant_id', tenantId);
      return platformApiRequest<HealthResponse>(`/platform/tenant-health?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const selectedTenant = (tenants.data || []).find((tenant) => tenant.id === tenantId);
  const selectedTenantLabel = selectedTenant?.name || (tenantId ? 'Selected tenant' : 'All tenants');
  const rows = useMemo(() => (health.data?.tenants || []).filter((tenant) => !band || tenant.band === band), [health.data?.tenants, band]);
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const availableEvidence = health.data?.evidence.available || HEALTH_EVIDENCE.filter((item) => hasPlatformPermission(item.permission)).map((item) => item.key);
  const omittedEvidence = health.data?.evidence.omitted || HEALTH_EVIDENCE.filter((item) => !hasPlatformPermission(item.permission)).map((item) => item.key);
  const canScan = FULL_SCAN_READ_PERMISSIONS.every((permission) => hasPlatformPermission(permission))
    && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_WRITE);
  const thresholdNumber = Number(threshold);
  const thresholdValid = Number.isInteger(thresholdNumber) && thresholdNumber >= 0 && thresholdNumber <= 100;

  const scan = useMutation({
    mutationFn: () => platformApiRequest<ScanResult>('/platform/tenant-health/scan', {
      method: 'POST',
      body: JSON.stringify({ threshold: thresholdNumber, ...(tenantId ? { tenant_id: tenantId } : {}) })
    }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-health'] });
      void queryClient.invalidateQueries({ queryKey: ['platform', 'notifications'] });
    }
  });

  const initialHealthError = health.isError && health.data === undefined;
  const refreshHealthError = health.isError && health.data !== undefined;
  const initialTenantsError = tenants.isError && tenants.data === undefined;
  const refreshTenantsError = tenants.isError && tenants.data !== undefined;
  const refreshing = health.isFetching || tenants.isFetching;
  const partialEvidence = Boolean(health.data && !health.data.evidence.complete);

  const updateFilter = (key: 'tenant_id' | 'band', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (invalidTenantFilter) next.delete('tenant_id');
    if (invalidBandFilter) next.delete('band');
    setSearchParams(next, { replace: true });
  };
  const refreshAll = async () => {
    const work: Array<Promise<unknown>> = [tenants.refetch()];
    if (!invalidFilters) work.push(health.refetch());
    await Promise.all(work);
  };

  const heroStatus = invalidFilters ? 'Filter invalid' : initialHealthError ? 'Unavailable' : refreshHealthError ? 'Stale snapshot' : health.isLoading && !health.data ? 'Loading' : partialEvidence ? 'Partial evidence' : 'Heuristic snapshot';
  const heroLabel = invalidFilters ? 'Clear invalid URL filters' : initialHealthError ? 'Retry required' : refreshHealthError ? 'Last successful data retained' : partialEvidence ? 'Final score withheld' : 'Complete permitted evidence';

  return (
    <div className="io-operational-page io-workspace-page platform-tenant-health">
      <OperationalWorkspaceHero
        iconPath="/platform/tenant-health"
        eyebrow="Platform tenant operations"
        title="Tenant health"
        description="A read-only heuristic health snapshot built from application evidence. Protected incident, support, notification and audit inputs are permission-scoped. If any score-driving evidence is unavailable, the application withholds the final score and band rather than presenting an incomplete result as healthy. This score is an operational heuristic, not an SLA, medical-style diagnosis, customer acceptance, or proof of an external outcome."
        meta={<>
          <OperationalWorkspaceMetaPill>Source · GET /platform/tenant-health</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Base read · TENANTS_READ</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Protected evidence · permission-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Summary · loaded page only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Current view · {selectedTenantLabel}</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-tenant-health__hero-aside"><OperationalWorkspaceStatus value={heroStatus} label={heroLabel} /><div className="platform-tenant-health__refresh-block"><button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={refreshing}>Refresh</button><span>{refreshing ? 'Refreshing…' : 'Refresh health and tenant selector'}</span></div></div>}
      />

      {refreshHealthError ? <div className="platform-tenant-health__warning">Health refresh failed. Showing the last successful health snapshot.</div> : null}
      {refreshTenantsError ? <div className="platform-tenant-health__warning">Tenant selector refresh failed. Showing the last successful tenant selector snapshot.</div> : null}
      {invalidFilters ? <div className="platform-tenant-health__blocking-error"><strong>One or more URL filters are invalid.</strong><span>The health board is not loaded until the invalid filter is cleared.</span><button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button></div> : null}
      {initialTenantsError ? <div className="platform-tenant-health__blocking-error"><strong>Tenant selector could not be loaded.</strong><span>{readableError(tenants.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => tenants.refetch()}>Retry tenants</button></div> : null}

      <OperationalWorkspaceStats ariaLabel="Tenant health loaded-page summary">
        <OperationalWorkspaceStatCard label="Loaded tenants" value={health.data?.summary.total ?? 0} helper="Current page only; not a global tenant total" tone="neutral" iconPath="/platform/tenants" loading={health.isLoading && !health.data} />
        <OperationalWorkspaceStatCard label="Healthy" value={health.data?.summary.healthy ?? 0} helper="Complete-evidence healthy rows on this page" tone="good" iconPath="/platform/tenant-health" loading={health.isLoading && !health.data} />
        <OperationalWorkspaceStatCard label="Risk / critical" value={(health.data?.summary.risk || 0) + (health.data?.summary.critical || 0)} helper="Complete-evidence risk or critical rows on this page" tone={(health.data?.summary.risk || 0) + (health.data?.summary.critical || 0) > 0 ? 'warn' : 'good'} iconPath="/platform/incidents" loading={health.isLoading && !health.data} />
        <OperationalWorkspaceStatCard label="Partial evidence" value={health.data?.summary.partial ?? 0} helper="Rows with final score intentionally withheld" tone={(health.data?.summary.partial || 0) > 0 ? 'warn' : 'good'} iconPath="/platform/permissions" loading={health.isLoading && !health.data} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-card platform-tenant-health__section">
        <OperationalSectionHeader iconPath="/platform/tenant-health" title="Health filters and evidence boundary" description="Tenant and band filters are stored in the URL. Pagination is server-bounded. Health-band filtering applies to the currently loaded page." />
        <div className="platform-tenant-health__filter-grid">
          <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)} disabled={Boolean(initialTenantsError)}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label>Health band<select value={band} onChange={(event) => updateFilter('band', event.target.value)}><option value="">All bands</option><option value="healthy">Healthy</option><option value="watch">Watch</option><option value="risk">Risk</option><option value="critical">Critical</option><option value="partial">Partial evidence</option></select></label>
          <div className="platform-tenant-health__evidence-summary"><span>Evidence available</span><strong>{availableEvidence.length}/{HEALTH_EVIDENCE.length}</strong></div>
          <div className="platform-tenant-health__evidence-summary"><span>Evidence omitted</span><strong>{omittedEvidence.length}</strong></div>
        </div>
        <div className="platform-tenant-health__evidence-grid">
          {HEALTH_EVIDENCE.map((item) => {
            const available = availableEvidence.includes(item.key);
            return <div key={item.key} data-state={available ? 'available' : 'omitted'}><span>{item.label}</span><strong>{available ? 'Available' : 'Hidden by permission'}</strong></div>;
          })}
        </div>
        <div className="platform-tenant-health__truth-note">A final score is emitted only when all score-driving protected evidence is available. Hidden incident, support, notification or audit evidence is not treated as zero. Tenant-health notifications are also excluded from notification penalties so the scoring system cannot penalize itself.</div>
      </section>

      <section className="io-workspace-card platform-tenant-health__section">
        <OperationalSectionHeader iconPath="/platform/notifications" title="Health notification reconciliation" description="Synchronize unresolved tenant-health notifications from a complete health snapshot. This is a write action and therefore has a stricter permission boundary than reading the health page." />
        <div className="platform-tenant-health__scan-row">
          <label>Threshold<input type="number" min="0" max="100" step="1" value={threshold} onChange={(event) => setThreshold(event.target.value)} /></label>
          {canScan ? <button type="button" className="app-button app-button--secondary" onClick={() => scan.mutate()} disabled={!thresholdValid || scan.isPending || invalidFilters}>{scan.isPending ? 'Reconciling…' : 'Reconcile health notifications'}</button> : null}
        </div>
        {!thresholdValid ? <div className="platform-tenant-health__warning">Threshold must be a whole number from 0 to 100.</div> : null}
        {!canScan ? <div className="platform-tenant-health__truth-note">Notification reconciliation is unavailable unless TENANTS_READ, PLATFORM_INCIDENTS_READ, SUPPORT_SESSION_READ, PLATFORM_NOTIFICATIONS_READ, AUDIT_READ and PLATFORM_NOTIFICATIONS_WRITE are all granted.</div> : null}
        {scan.data ? <div className="platform-tenant-health__success">Reconciliation complete: checked {scan.data.tenants_checked}; at/below threshold {scan.data.unhealthy_tenants}; created {scan.data.created}; refreshed {scan.data.refreshed}; recovered resolved {scan.data.resolved_recovered}; duplicates resolved {scan.data.resolved_duplicates}.</div> : null}
        {scan.error ? <div className="platform-tenant-health__blocking-error"><strong>Notification reconciliation failed.</strong><span>{readableError(scan.error)}</span></div> : null}
      </section>

      <section className="io-workspace-card platform-tenant-health__section">
        <OperationalSectionHeader iconPath="/platform/tenant-health" title="Tenant health snapshot" description={`Page ${pageNumber} · ${selectedTenantLabel} · ${band ? humanize(band) : 'All health bands'}. Risk-first ordering applies within the loaded page when complete scores exist.`} />
        {initialHealthError ? <div className="platform-tenant-health__blocking-error"><strong>Tenant health could not be loaded.</strong><span>{readableError(health.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => health.refetch()}>Retry health</button></div> : null}
        {health.isLoading && !health.data ? <div className="platform-tenant-health__loading">Loading permission-scoped tenant health…</div> : null}
        {!initialHealthError && !health.isLoading && rows.length === 0 ? <div className="platform-tenant-health__empty"><strong>No tenant rows on this loaded page match the current filters.</strong><span>This means no visible application health rows matched this page/filter combination. It does not prove that no operational or external risk exists.</span></div> : null}
        <div className="platform-tenant-health__list">
          {rows.map((tenant) => <article key={tenant.tenant_id} className="platform-tenant-health__card">
            <div className="platform-tenant-health__card-header"><div><h4>{tenant.tenant_name}</h4><div className="platform-tenant-health__provenance"><span>{humanize(tenant.status)}</span><span>{humanize(tenant.billing_status)}</span><span>{tenant.plan_code || 'No plan recorded'}</span><span>{tenant.write_locked ? 'Writes locked' : 'Writes available'}</span></div></div><div className="platform-tenant-health__score"><strong>{tenant.score ?? '—'}</strong><span data-tone={bandTone(tenant.band)}>{tenant.band === 'partial' ? 'Partial evidence' : humanize(tenant.band)}</span></div></div>
            <div className="platform-tenant-health__metrics-grid"><div><span>Users</span><strong>{countValue(tenant.counts.users)}</strong></div><div><span>Products</span><strong>{countValue(tenant.counts.products)}</strong></div><div><span>Locations</span><strong>{countValue(tenant.counts.storage_locations)}</strong></div><div><span>Incidents</span><strong>{countValue(tenant.counts.open_incidents)}</strong></div><div><span>Notifications</span><strong>{countValue(tenant.counts.open_notifications)}</strong></div><div><span>Support sessions</span><strong>{countValue(tenant.counts.active_support_sessions)}</strong></div><div><span>Overdue tasks</span><strong>{countValue(tenant.counts.overdue_tasks)}</strong></div><div><span>Last visible activity</span><strong>{dateTime(tenant.last_activity_at)}</strong></div></div>
            {!tenant.activity_evidence_complete ? <div className="platform-tenant-health__warning">Audit activity is hidden by permission, so inactivity/staleness is not scored and the visible activity timestamp is incomplete.</div> : null}
            {tenant.usage.length ? <div className="platform-tenant-health__usage-row">{tenant.usage.map((usage) => <span key={usage.key}>{humanize(usage.label)} · {usage.used}/{usage.limit} · {usage.percent_used}%</span>)}</div> : null}
            {tenant.issues.length ? <div className="platform-tenant-health__issues">{tenant.issues.slice(0, 10).map((issue) => <div key={`${issue.source}:${issue.code}`}><span data-severity={issue.severity}>{humanize(issue.severity)}</span><p>{issue.message}</p><small>{humanize(issue.source)} · -{issue.points} heuristic points</small></div>)}</div> : <div className="platform-tenant-health__empty"><strong>No issues detected in the permitted evidence on this snapshot.</strong><span>{tenant.score_complete ? 'The application heuristic found no scored issues; this is not proof of external health.' : 'Protected omitted evidence can still contain risk, so no final health score is emitted.'}</span></div>}
            <div className="platform-tenant-health__link-row"><Link to={`/platform/tenants?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Tenant</Link><Link to={`/platform/tenant-timeline?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Timeline</Link><Link to={`/platform/tenant-tasks?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Tasks</Link>{hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? <Link to="/platform/incidents">Incidents</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ) ? <Link to={`/platform/notifications?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Notifications</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? <Link to={`/platform/support-sessions?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Support sessions</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? <Link to={`/platform/billing?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Billing</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? <Link to={`/platform/audit?tenant_id=${encodeURIComponent(tenant.tenant_id)}`}>Audit</Link> : null}</div>
          </article>)}
        </div>
        <div className="platform-tenant-health__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || health.isFetching}>Previous</button><span>Page {pageNumber}</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!health.data?.pagination?.has_more || health.isFetching}>Next</button></div>
      </section>

      <section className="io-workspace-card platform-tenant-health__section">
        <OperationalSectionHeader iconPath="/platform/tenant-health" title="Supporting tenant operations" description="Open adjacent tenant evidence surfaces. Links remain permission-aware and carry the selected tenant where the destination supports it." />
        <div className="platform-tenant-health__link-row"><Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link><Link to={tenantId ? `/platform/tenant-tasks?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-tasks'}>Tenant tasks</Link><Link to={tenantId ? `/platform/tenant-timeline?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-timeline'}>Tenant timeline</Link>{hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? <Link to="/platform/incidents">Incidents</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ) ? <Link to="/platform/notifications">Notifications</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? <Link to="/platform/support-sessions">Support sessions</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? <Link to={tenantId ? `/platform/billing?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/billing'}>Billing</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? <Link to="/platform/audit">Platform audit</Link> : null}</div>
      </section>
    </div>
  );
}
