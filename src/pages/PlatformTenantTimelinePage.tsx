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
import './PlatformTenantTimelinePage.css';

type Tenant = { id: string; name: string; location?: string | null };
type TimelineEvent = {
  id: string; source: string; source_id: string; tenant_id: string; tenant_name: string; title: string;
  details?: string | null; status?: string | null; severity?: string | null; actor_email?: string | null;
  happened_at: string; metadata?: Record<string, unknown>;
};
type TimelineResponse = {
  tenant_id: string | null; days: number; limit: number; offset: number; source: string | null;
  available_sources: string[]; omitted_sources: string[]; actor_identity_redacted: boolean;
  counts: Record<string, number>; pagination: { limit: number; offset: number; has_more: boolean }; events: TimelineEvent[];
};

type SourceOption = { value: string; label: string; permission: string; path: string };
const ALL_SOURCES: SourceOption[] = [
  { value: 'audit', label: 'Audit', permission: PLATFORM_PERMISSIONS.AUDIT_READ, path: '/platform/audit' },
  { value: 'support_session', label: 'Support sessions', permission: PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ, path: '/platform/support-sessions' },
  { value: 'incident', label: 'Incidents', permission: PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ, path: '/platform/incidents' },
  { value: 'maintenance', label: 'Maintenance', permission: PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ, path: '/platform/maintenance' },
  { value: 'tenant_task', label: 'Tenant tasks', permission: PLATFORM_PERMISSIONS.TENANTS_READ, path: '/platform/tenant-tasks' },
  { value: 'tenant_communication', label: 'Communications', permission: PLATFORM_PERMISSIONS.TENANTS_READ, path: '/platform/tenant-communications' },
  { value: 'billing_event', label: 'Billing events', permission: PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ, path: '/platform/billing' },
  { value: 'data_retention', label: 'Data retention', permission: PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ, path: '/platform/data-retention' },
  { value: 'offboarding', label: 'Offboarding', permission: PLATFORM_PERMISSIONS.TENANTS_READ, path: '/platform/tenant-offboarding' }
];
const PAGE_SIZE = 100;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
function importantMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return [];
  const keys = ['ticket_reference', 'access_level', 'starts_at', 'ends_at', 'due_at', 'completed_at', 'retain_until', 'scheduled_for', 'impact', 'channel', 'direction', 'contact_name', 'contact_email', 'follow_up_due_at', 'amount_cents', 'currency', 'external_reference'];
  return keys.filter((key) => metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '').map((key) => `${humanize(key)}: ${String(metadata[key])}`);
}
function eventSearchText(event: TimelineEvent) {
  return [event.title, event.details, event.source, event.tenant_name, event.status, event.severity, event.actor_email, ...importantMetadata(event.metadata)].filter(Boolean).join(' ').toLowerCase();
}

export default function PlatformTenantTimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const accessibleSourceOptions = useMemo(() => ALL_SOURCES.filter((option) => hasPlatformPermission(option.permission)), []);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedSource = searchParams.get('source') || '';
  const requestedDays = searchParams.get('days') || '90';
  const tenantId = uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const daysNumber = Number(requestedDays);
  const days = Number.isInteger(daysNumber) && daysNumber >= 1 && daysNumber <= 3650 ? String(daysNumber) : '90';
  const source = accessibleSourceOptions.some((option) => option.value === requestedSource) ? requestedSource : '';
  const invalidTenantFilter = Boolean(requestedTenantId && !tenantId);
  const invalidDaysFilter = requestedDays !== days;
  const knownSource = ALL_SOURCES.some((option) => option.value === requestedSource);
  const forbiddenSourceFilter = Boolean(requestedSource && knownSource && !source);
  const invalidSourceFilter = Boolean(requestedSource && !knownSource);
  const invalidFilters = invalidTenantFilter || invalidDaysFilter || forbiddenSourceFilter || invalidSourceFilter;

  useEffect(() => { setOffset(0); }, [tenantId, source, days, invalidFilters]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'timeline-selector'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const timeline = useQuery({
    queryKey: ['platform', 'tenant-timeline', tenantId, days, source, offset],
    queryFn: () => {
      const params = new URLSearchParams({ days, limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) params.set('tenant_id', tenantId);
      if (source) params.set('source', source);
      return platformApiRequest<TimelineResponse>(`/platform/tenant-timeline?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const events = useMemo(() => timeline.data?.events || [], [timeline.data?.events]);
  const selectedTenant = (tenants.data || []).find((tenant) => tenant.id === tenantId);
  const selectedTenantLabel = selectedTenant?.name || (tenantId ? 'Selected tenant' : 'All tenants');
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const visibleEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? events.filter((event) => eventSearchText(event).includes(term)) : events;
  }, [events, search]);
  const initialTimelineError = timeline.isError && timeline.data === undefined;
  const refreshTimelineError = timeline.isError && timeline.data !== undefined;
  const initialTenantsError = tenants.isError && tenants.data === undefined;
  const refreshTenantsError = tenants.isError && tenants.data !== undefined;
  const refreshing = timeline.isFetching || tenants.isFetching;

  const updateFilter = (key: 'tenant_id' | 'source' | 'days', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (invalidTenantFilter) next.delete('tenant_id');
    if (invalidDaysFilter) next.set('days', '90');
    if (invalidSourceFilter || forbiddenSourceFilter) next.delete('source');
    setSearchParams(next, { replace: true });
  };
  const refreshAll = async () => {
    const work: Array<Promise<unknown>> = [tenants.refetch()];
    if (!invalidFilters) work.push(timeline.refetch());
    await Promise.all(work);
  };

  const heroStatus = invalidFilters ? 'Filter invalid' : initialTimelineError ? 'Unavailable' : refreshTimelineError ? 'Stale snapshot' : timeline.isLoading && !timeline.data ? 'Loading' : 'Read-only evidence';
  const heroLabel = invalidFilters ? 'Clear invalid URL filters' : initialTimelineError ? 'Retry required' : refreshTimelineError ? 'Last successful data retained' : 'Permission-scoped tenant history';

  return (
    <div className="platform-tenant-timeline">
      <OperationalWorkspaceHero
        iconPath="/platform/tenant-timeline"
        eyebrow="Platform tenant operations"
        title="Tenant timeline"
        description="Read-only tenant history assembled from Platform evidence sources. The feed is permission-scoped: sources you cannot read are omitted, and operator identity is hidden unless PLATFORM_USERS_READ is granted. A timeline event records application evidence; it does not independently prove an external outcome occurred."
        meta={<>
          <OperationalWorkspaceMetaPill>Source · GET /platform/tenant-timeline</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Base read · TENANTS_READ</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Source permissions · enforced individually</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Operator identity · PLATFORM_USERS_READ</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Current view · {selectedTenantLabel}</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-tenant-timeline__hero-aside"><OperationalWorkspaceStatus value={heroStatus} label={heroLabel} /><div className="platform-tenant-timeline__refresh-block"><button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={refreshing}>Refresh</button><span>{refreshing ? 'Refreshing…' : 'Refresh timeline and tenant selector'}</span></div></div>}
      />

      {refreshTimelineError ? <div className="platform-tenant-timeline__warning">Timeline refresh failed. Showing the last successful timeline snapshot.</div> : null}
      {refreshTenantsError ? <div className="platform-tenant-timeline__warning">Tenant selector refresh failed. Showing the last successful tenant selector snapshot.</div> : null}
      {invalidFilters ? <div className="platform-tenant-timeline__blocking-error"><strong>One or more URL filters are invalid or not permitted.</strong><span>{forbiddenSourceFilter ? 'The requested source requires a Platform permission you do not have.' : 'The timeline is not loaded until the invalid filter is cleared.'}</span><button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button></div> : null}
      {initialTenantsError ? <div className="platform-tenant-timeline__blocking-error"><strong>Tenant selector could not be loaded.</strong><span>{readableError(tenants.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => tenants.refetch()}>Retry tenants</button></div> : null}

      <OperationalWorkspaceStats ariaLabel="Tenant timeline snapshot summary">
        <OperationalWorkspaceStatCard label="Loaded events" value={events.length} helper="Current page only; not an all-history total" tone="neutral" iconPath="/platform/tenant-timeline" loading={timeline.isLoading && !timeline.data} />
        <OperationalWorkspaceStatCard label="Visible after search" value={visibleEvents.length} helper="Local search over the loaded page" tone="blue" iconPath="/platform/tenant-timeline" loading={timeline.isLoading && !timeline.data} />
        <OperationalWorkspaceStatCard label="Available sources" value={timeline.data?.available_sources.length ?? accessibleSourceOptions.length} helper="Sources permitted for this operator" tone="good" iconPath="/platform/tenant-tasks" loading={timeline.isLoading && !timeline.data} />
        <OperationalWorkspaceStatCard label="Omitted sources" value={timeline.data?.omitted_sources.length ?? (ALL_SOURCES.length - accessibleSourceOptions.length)} helper="Hidden by source permission boundary" tone={(timeline.data?.omitted_sources.length || 0) > 0 ? 'warn' : 'good'} iconPath="/platform/permissions" loading={timeline.isLoading && !timeline.data} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-card platform-tenant-timeline__section">
        <OperationalSectionHeader iconPath="/platform/tenant-timeline" title="Timeline filters" description="Tenant, source and time-window filters are stored in the URL. Search is local to the currently loaded page." />
        <div className="platform-tenant-timeline__filter-grid">
          <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)} disabled={Boolean(initialTenantsError)}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label>Source<select value={source} onChange={(event) => updateFilter('source', event.target.value)}><option value="">All permitted sources</option>{accessibleSourceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Days<input type="number" min="1" max="3650" value={days} onChange={(event) => updateFilter('days', event.target.value)} /></label>
          <label className="platform-tenant-timeline__search">Search loaded page<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, details, status, metadata…" /></label>
        </div>
        <div className="platform-tenant-timeline__truth-note">Source access is fail-closed. Audit, support, incident, maintenance, billing and retention events appear only when their own read permissions are present. Actor identity is {canReadPlatformUsers ? 'visible because PLATFORM_USERS_READ is granted.' : 'redacted because PLATFORM_USERS_READ is not granted.'}</div>
      </section>

      <section className="io-workspace-card platform-tenant-timeline__section">
        <OperationalSectionHeader iconPath="/platform/tenant-timeline" title="Permission-scoped event stream" description={`Page ${pageNumber} · ${selectedTenantLabel} · ${source ? humanize(source) : 'All permitted sources'} · last ${days} day(s).`} />
        {initialTimelineError ? <div className="platform-tenant-timeline__blocking-error"><strong>Timeline could not be loaded.</strong><span>{readableError(timeline.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => timeline.refetch()}>Retry timeline</button></div> : null}
        {timeline.isLoading && !timeline.data ? <div className="platform-tenant-timeline__loading">Loading permission-scoped timeline…</div> : null}
        {!initialTimelineError && !timeline.isLoading && visibleEvents.length === 0 ? <div className="platform-tenant-timeline__empty"><strong>No events on this loaded page.</strong><span>This means no visible application timeline evidence matched the current filters/page. It does not prove that no external activity occurred.</span></div> : null}
        <div className="platform-tenant-timeline__list">
          {visibleEvents.map((event) => {
            const metadata = importantMetadata(event.metadata);
            return <article key={event.id} className="platform-tenant-timeline__card">
              <div className="platform-tenant-timeline__card-header"><div><h4>{humanize(event.title)}</h4><div className="platform-tenant-timeline__provenance"><span>{event.tenant_name}</span><span>{humanize(event.source)}</span><span>{dateTime(event.happened_at)}</span></div></div><div className="platform-tenant-timeline__badge-row">{event.status ? <span className="platform-tenant-timeline__badge">{humanize(event.status)}</span> : null}{event.severity ? <span className="platform-tenant-timeline__badge" data-tone="warn">{humanize(event.severity)}</span> : null}</div></div>
              {event.details ? <p>{event.details}</p> : null}
              <div className="platform-tenant-timeline__evidence-grid"><div><span>Source record</span><strong>{event.source_id}</strong></div><div><span>Actor</span><strong>{event.actor_email || (timeline.data?.actor_identity_redacted ? 'Hidden by permission' : 'System / not recorded')}</strong></div>{metadata.slice(0, 6).map((item) => <div key={item}><span>Evidence</span><strong>{item}</strong></div>)}</div>
              <div className="platform-tenant-timeline__link-row"><Link to={`/platform/tenants?tenant_id=${encodeURIComponent(event.tenant_id)}`}>Tenant</Link>{ALL_SOURCES.find((option) => option.value === event.source)?.path ? <Link to={`${ALL_SOURCES.find((option) => option.value === event.source)!.path}?tenant_id=${encodeURIComponent(event.tenant_id)}`}>Open source workspace</Link> : null}</div>
            </article>;
          })}
        </div>
        <div className="platform-tenant-timeline__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || timeline.isFetching}>Previous</button><span>Page {pageNumber}</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!timeline.data?.pagination.has_more || timeline.isFetching}>Next</button></div>
      </section>

      <section className="io-workspace-card platform-tenant-timeline__section">
        <OperationalSectionHeader iconPath="/platform/tenant-timeline" title="Supporting tenant operations" description="Open adjacent tenant evidence surfaces. Links remain permission-aware." />
        <div className="platform-tenant-timeline__link-row"><Link to={tenantId ? `/platform/tenant-tasks?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-tasks'}>Tenant tasks</Link><Link to={tenantId ? `/platform/tenant-communications?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-communications'}>Communications</Link><Link to={tenantId ? `/platform/tenant-notes?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-notes'}>Tenant notes</Link>{hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? <Link to="/platform/incidents">Incidents</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ) ? <Link to={tenantId ? `/platform/billing?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/billing'}>Billing</Link> : null}{hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ) ? <Link to="/platform/audit">Platform audit</Link> : null}</div>
      </section>
    </div>
  );
}
