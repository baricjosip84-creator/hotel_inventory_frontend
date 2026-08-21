import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformReleasesPage.css';

type PlatformUser = { id: string; email: string; is_active?: boolean };
type ChangeRequest = { id: string; title: string; status: string };
type ChangeResponse = { change_requests: ChangeRequest[] };
type MaintenanceWindow = { id: string; title: string; status: string; starts_at?: string | null };
type Pagination = { limit: number; offset: number; total: number; has_more: boolean };
type EvidenceAccess = { platform_user_identity: boolean; change_reference: boolean; maintenance_reference: boolean };
type EvidenceContract = {
  application_registry_only: boolean;
  status_is_application_workflow_state: boolean;
  deployed_status_does_not_prove_external_deployment: boolean;
  rolled_back_status_does_not_prove_external_rollback: boolean;
  timestamps_are_application_transition_evidence: boolean;
  linked_change_is_application_reference_only: boolean;
  linked_maintenance_is_application_reference_only: boolean;
};
type Release = {
  id: string; version: string; title: string; release_type: string; status: string; environment: string;
  planned_at?: string | null; deployed_at?: string | null; rolled_back_at?: string | null;
  owner_platform_user_id?: string | null; owner_email?: string | null; owner_present?: boolean;
  change_request_id?: string | null; change_request_title?: string | null; change_request_status?: string | null; change_request_present?: boolean;
  maintenance_window_id?: string | null; maintenance_window_title?: string | null; maintenance_window_status?: string | null; maintenance_window_present?: boolean;
  summary?: string | null; tenant_impact: string; requires_maintenance: boolean; rollback_plan?: string | null; release_notes?: string | null;
  created_at?: string | null; updated_at?: string | null; created_by_email?: string | null; updated_by_email?: string | null;
};
type ReleasesResponse = {
  releases: Release[];
  summary: { total: number; upcoming: number; rolled_back: number; by_status: Record<string, number>; by_type: Record<string, number>; by_environment: Record<string, number> };
  pagination: Pagination; evidence_access: EvidenceAccess; evidence_contract: EvidenceContract;
  release_types: string[]; statuses: string[]; environments: string[]; impacts: string[];
};
type ReleaseForm = {
  version: string; title: string; release_type: string; environment: string; planned_at: string; owner_platform_user_id: string;
  change_request_id: string; maintenance_window_id: string; summary: string; tenant_impact: string; requires_maintenance: boolean;
  rollback_plan: string; release_notes: string;
};

const PAGE_SIZE = 50;
const RELEASE_TYPES = ['major', 'minor', 'patch', 'hotfix', 'maintenance'];
const STATUSES = ['planned', 'in_progress', 'deployed', 'rolled_back', 'cancelled'];
const ENVIRONMENTS = ['development', 'staging', 'production'];
const IMPACTS = ['none', 'low', 'medium', 'high'];
const TERMINAL = new Set(['deployed', 'rolled_back', 'cancelled']);
const emptyForm = (): ReleaseForm => ({ version: '', title: '', release_type: 'minor', environment: 'production', planned_at: '', owner_platform_user_id: '', change_request_id: '', maintenance_window_id: '', summary: '', tenant_impact: 'none', requires_maintenance: false, rollback_plan: '', release_notes: '' });

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function clean(value: string) { const text = value.trim(); return text || null; }
function pretty(value?: string | null) { const text = String(value || '').replaceAll('_', ' ').trim(); return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not recorded'; }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString(); }
function toLocalDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function toIsoOrNull(value: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function statusTone(status: string) { if (status === 'deployed') return 'good'; if (status === 'in_progress') return 'warn'; if (status === 'rolled_back' || status === 'cancelled') return 'danger'; return 'neutral'; }
function toForm(row: Release): ReleaseForm {
  return { version: row.version || '', title: row.title || '', release_type: row.release_type || 'minor', environment: row.environment || 'production', planned_at: toLocalDateTimeInput(row.planned_at), owner_platform_user_id: row.owner_platform_user_id || '', change_request_id: row.change_request_id || '', maintenance_window_id: row.maintenance_window_id || '', summary: row.summary || '', tenant_impact: row.tenant_impact || 'none', requires_maintenance: Boolean(row.requires_maintenance), rollback_plan: row.rollback_plan || '', release_notes: row.release_notes || '' };
}

export default function PlatformReleasesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_WRITE);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadChanges = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_READ);
  const canReadMaintenance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadJobs = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ);

  const requestedStatus = searchParams.get('status') || '';
  const requestedEnvironment = searchParams.get('environment') || '';
  const requestedType = searchParams.get('release_type') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedUpcoming = searchParams.get('upcoming_only') || '';
  const status = STATUSES.includes(requestedStatus) ? requestedStatus : '';
  const environment = ENVIRONMENTS.includes(requestedEnvironment) ? requestedEnvironment : '';
  const releaseType = RELEASE_TYPES.includes(requestedType) ? requestedType : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const upcomingOnly = requestedUpcoming === 'true';
  const invalidFilters = Boolean((requestedStatus && !status) || (requestedEnvironment && !environment) || (requestedType && !releaseType) || (requestedSearch && !search) || (requestedUpcoming && !['true', 'false'].includes(requestedUpcoming)));

  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<ReleaseForm>(() => emptyForm());
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');
  useEffect(() => { setOffset(0); }, [status, environment, releaseType, search, upcomingOnly, invalidFilters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (status) params.set('status', status); if (environment) params.set('environment', environment); if (releaseType) params.set('release_type', releaseType);
    if (search.trim()) params.set('search', search.trim()); if (upcomingOnly) params.set('upcoming_only', 'true');
    return params.toString();
  }, [status, environment, releaseType, search, upcomingOnly, offset]);

  const releases = useQuery({
    queryKey: ['platform', 'releases', status, environment, releaseType, search, upcomingOnly, offset],
    queryFn: () => platformApiRequest<ReleasesResponse>(`/platform/releases?${queryString}`),
    enabled: !invalidFilters,
    placeholderData: (previousData) => previousData
  });
  const users = useQuery({ queryKey: ['platform', 'release-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite && canReadUsers });
  const changes = useQuery({ queryKey: ['platform', 'release-change-requests'], queryFn: () => platformApiRequest<ChangeResponse>('/platform/change-management?limit=300&offset=0'), enabled: canWrite && canReadChanges });
  const maintenance = useQuery({ queryKey: ['platform', 'release-maintenance'], queryFn: () => platformApiRequest<MaintenanceWindow[]>('/platform/maintenance?limit=300&include_past=true'), enabled: canWrite && canReadMaintenance });

  const buildPayload = () => {
    const body: Record<string, unknown> = {
      version: form.version.trim(), title: form.title.trim(), release_type: form.release_type, environment: form.environment,
      planned_at: toIsoOrNull(form.planned_at), summary: clean(form.summary), tenant_impact: form.tenant_impact,
      requires_maintenance: form.requires_maintenance, rollback_plan: clean(form.rollback_plan), release_notes: clean(form.release_notes)
    };
    if (canReadUsers) body.owner_platform_user_id = form.owner_platform_user_id || null;
    if (canReadChanges) body.change_request_id = form.change_request_id || null;
    if (canReadMaintenance) body.maintenance_window_id = form.maintenance_window_id || null;
    return body;
  };

  const save = useMutation({
    mutationFn: () => platformApiRequest(editingId ? `/platform/releases/${editingId}` : '/platform/releases', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(buildPayload()) }),
    onSuccess: async () => { setMessage(editingId ? 'Release details saved.' : 'Release registered as planned.'); setMutationError(''); setEditingId(''); setForm(emptyForm()); await queryClient.invalidateQueries({ queryKey: ['platform', 'releases'] }); },
    onError: (error) => setMutationError(readableError(error))
  });
  const transition = useMutation({
    mutationFn: ({ id, status: nextStatus }: { id: string; status: string }) => platformApiRequest(`/platform/releases/${id}/status`, { method: 'POST', body: JSON.stringify({ status: nextStatus }) }),
    onSuccess: async (_data, variables) => { setMessage(`Release workflow moved to ${pretty(variables.status)}.`); setMutationError(''); await queryClient.invalidateQueries({ queryKey: ['platform', 'releases'] }); },
    onError: (error) => setMutationError(readableError(error))
  });

  const response = releases.data;
  const summary = response?.summary;
  const pagination = response?.pagination;
  const blockingError = releases.isError && !releases.data;
  const staleWarning = releases.isError && Boolean(releases.data);
  const refreshBusy = releases.isFetching || users.isFetching || changes.isFetching || maintenance.isFetching;
  const formInvalid = !form.version.trim() || !form.title.trim() || Boolean(form.planned_at && Number.isNaN(new Date(form.planned_at).getTime()));
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const evidenceLabel = response?.evidence_access?.platform_user_identity && response?.evidence_access?.change_reference && response?.evidence_access?.maintenance_reference ? 'Full linked evidence' : 'Partial linked evidence';

  const updateFilter = (key: string, value: string | boolean) => {
    const next = new URLSearchParams(searchParams);
    const normalized = typeof value === 'boolean' ? (value ? 'true' : '') : value;
    if (normalized) next.set(key, normalized); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => { setSearchParams({}, { replace: true }); setOffset(0); };
  const startEdit = (release: Release) => { if (TERMINAL.has(release.status)) return; setMessage(''); setMutationError(''); setEditingId(release.id); setForm(toForm(release)); scrollToFormSection('platform-releases-form'); };
  const runTransition = (release: Release, nextStatus: string, prompt: string) => { if (window.confirm(prompt)) transition.mutate({ id: release.id, status: nextStatus }); };

  return <div className="platform-releases">
    <OperationalWorkspaceHero
      iconPath="/platform/releases" eyebrow="Platform operations" title="Releases"
      description="Track the application release registry, planned tenant impact and recorded lifecycle transitions without treating registry status as proof that an external deployment or rollback actually occurred."
      meta={<><OperationalWorkspaceMetaPill>Registry-wide filtered summary</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{evidenceLabel}</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-releases__hero-aside"><OperationalWorkspaceStatus value={summary?.upcoming ?? '—'} label="Planned / in progress" /><div className="platform-releases__refresh-block"><button type="button" className="app-button app-button--secondary" disabled={refreshBusy || invalidFilters} onClick={() => { setMessage(''); setMutationError(''); void releases.refetch(); if (canReadUsers) void users.refetch(); if (canReadChanges) void changes.refetch(); if (canReadMaintenance) void maintenance.refetch(); }}>{refreshBusy ? 'Refreshing…' : 'Refresh'}</button><span>{releases.dataUpdatedAt ? `Last successful snapshot ${new Date(releases.dataUpdatedAt).toLocaleString()}` : 'No successful snapshot yet'}</span></div></div>}
    />

    {invalidFilters ? <div className="platform-releases__warning"><strong>Invalid URL filter.</strong><span>Clear the filters to load release evidence safely.</span><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></div> : null}
    {staleWarning ? <div className="platform-releases__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(releases.error)}</span><button type="button" className="app-button app-button--secondary" disabled={releases.isFetching} onClick={() => void releases.refetch()}>Retry</button></div> : null}
    {message ? <div className="platform-releases__success"><strong>{message}</strong><button type="button" className="app-button app-button--ghost" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-releases__warning"><strong>Action failed.</strong><span>{mutationError}</span><button type="button" className="app-button app-button--ghost" onClick={() => setMutationError('')}>Dismiss</button></div> : null}

    <OperationalWorkspaceStats ariaLabel="Release registry summary">
      <OperationalWorkspaceStatCard label="Filtered releases" value={summary?.total ?? '—'} helper="Across the filtered registry, not only this page." />
      <OperationalWorkspaceStatCard label="Upcoming" value={summary?.upcoming ?? '—'} tone="warn" helper="Planned or in-progress application workflow records." />
      <OperationalWorkspaceStatCard label="Deployed" value={summary?.by_status?.deployed ?? 0} tone="good" helper="Recorded deployed state only; not external deployment proof." />
      <OperationalWorkspaceStatCard label="Rolled back" value={summary?.rolled_back ?? '—'} tone={summary?.rolled_back ? 'danger' : 'neutral'} helper="Recorded rollback workflow state." />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-releases__section">
      <OperationalSectionHeader iconPath="/platform/releases" title="Evidence boundary" description="What release records on this page establish—and what they do not." />
      <div className="platform-releases__truth-note"><strong>Application evidence only.</strong><span>A planned, deployed, rolled-back or cancelled status is a Platform workflow record. It does not independently prove that a hosting provider, deployment system, customer environment or external rollback actually reached that outcome. Linked change and maintenance records are application references, not external verification.</span></div>
    </section>

    <section className="io-workspace-panel platform-releases__section">
      <OperationalSectionHeader iconPath="/platform/releases" title="Filters" description="Filters are stored in the URL; pagination is server-side." />
      <div className="platform-releases__filter-grid">
        <label>Status<select value={status} onChange={(e) => updateFilter('status', e.target.value)}><option value="">All statuses</option>{STATUSES.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Environment<select value={environment} onChange={(e) => updateFilter('environment', e.target.value)}><option value="">All environments</option>{ENVIRONMENTS.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Type<select value={releaseType} onChange={(e) => updateFilter('release_type', e.target.value)}><option value="">All types</option>{RELEASE_TYPES.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label className="platform-releases__search">Search<input value={search} maxLength={200} placeholder="Version, title, summary or notes" onChange={(e) => updateFilter('search', e.target.value)} /></label>
        <label className="platform-releases__checkbox"><input type="checkbox" checked={upcomingOnly} onChange={(e) => updateFilter('upcoming_only', e.target.checked)} /> Upcoming only</label>
      </div>
      <div className="platform-releases__actions"><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></div>
    </section>

    {canWrite ? <section id="platform-releases-form" className="io-workspace-panel platform-releases__section">
      <OperationalSectionHeader iconPath="/platform/releases" title={editingId ? 'Edit release details' : 'Register planned release'} description={editingId ? 'Lifecycle state is changed only through the dedicated status actions; terminal release history is immutable.' : 'New records always enter Planned state. Link protected evidence only when your permission snapshot allows it.'} actions={editingId ? <button type="button" className="app-button app-button--ghost" onClick={() => { setEditingId(''); setForm(emptyForm()); setMutationError(''); }}>Cancel edit</button> : undefined} />
      <div className="platform-releases__form-grid">
        <label>Version<input value={form.version} maxLength={80} onChange={(e) => setForm((value) => ({ ...value, version: e.target.value }))} /></label>
        <label>Title<input value={form.title} maxLength={255} onChange={(e) => setForm((value) => ({ ...value, title: e.target.value }))} /></label>
        <label>Release type<select value={form.release_type} onChange={(e) => setForm((value) => ({ ...value, release_type: e.target.value }))}>{RELEASE_TYPES.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Environment<select value={form.environment} onChange={(e) => setForm((value) => ({ ...value, environment: e.target.value }))}>{ENVIRONMENTS.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Planned time<input type="datetime-local" value={form.planned_at} onChange={(e) => setForm((value) => ({ ...value, planned_at: e.target.value }))} /></label>
        <label>Tenant impact<select value={form.tenant_impact} onChange={(e) => setForm((value) => ({ ...value, tenant_impact: e.target.value }))}>{IMPACTS.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        {canReadUsers ? <label>Owner<select value={form.owner_platform_user_id} onChange={(e) => setForm((value) => ({ ...value, owner_platform_user_id: e.target.value }))}><option value="">No owner</option>{(users.data || []).filter((user) => user.is_active !== false).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label> : <div className="platform-releases__restricted"><strong>Owner linkage restricted</strong><span>PLATFORM_USERS_READ is required to view or change the owner. Existing hidden linkage is preserved.</span></div>}
        {canReadChanges ? <label>Change request<select value={form.change_request_id} onChange={(e) => setForm((value) => ({ ...value, change_request_id: e.target.value }))}><option value="">No linked change</option>{(changes.data?.change_requests || []).filter((change) => !['rejected', 'cancelled'].includes(change.status)).map((change) => <option key={change.id} value={change.id}>{change.title} · {pretty(change.status)}</option>)}</select></label> : <div className="platform-releases__restricted"><strong>Change evidence restricted</strong><span>PLATFORM_CHANGES_READ is required to view or change change-request linkage. Existing hidden linkage is preserved.</span></div>}
        {canReadMaintenance ? <label>Maintenance window<select value={form.maintenance_window_id} onChange={(e) => setForm((value) => ({ ...value, maintenance_window_id: e.target.value }))}><option value="">No linked window</option>{(maintenance.data || []).filter((window) => window.status !== 'cancelled').map((window) => <option key={window.id} value={window.id}>{window.title} · {pretty(window.status)}</option>)}</select></label> : <div className="platform-releases__restricted"><strong>Maintenance evidence restricted</strong><span>PLATFORM_MAINTENANCE_READ is required to view or change maintenance linkage. Existing hidden linkage is preserved.</span></div>}
        <label className="platform-releases__checkbox"><input type="checkbox" checked={form.requires_maintenance} onChange={(e) => setForm((value) => ({ ...value, requires_maintenance: e.target.checked }))} /> Requires maintenance</label>
        <label className="platform-releases__span-all">Summary<textarea value={form.summary} maxLength={5000} onChange={(e) => setForm((value) => ({ ...value, summary: e.target.value }))} /></label>
        <label className="platform-releases__span-all">Release notes<textarea value={form.release_notes} maxLength={12000} onChange={(e) => setForm((value) => ({ ...value, release_notes: e.target.value }))} /></label>
        <label className="platform-releases__span-all">Rollback plan<textarea value={form.rollback_plan} maxLength={8000} onChange={(e) => setForm((value) => ({ ...value, rollback_plan: e.target.value }))} /></label>
      </div>
      {formInvalid ? <div className="platform-releases__validation">Enter a version and title, and use a valid planned time if one is set.</div> : null}
      <div className="platform-releases__actions"><button type="button" className="app-button app-button--primary" disabled={formInvalid || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : editingId ? 'Save details' : 'Register release'}</button></div>
    </section> : null}

    <section className="io-workspace-panel platform-releases__section">
      <OperationalSectionHeader iconPath="/platform/releases" title="Release registry" description="Registry entries are ordered by their recorded planning/deployment chronology. Status transitions are deliberate lifecycle actions." />
      {blockingError ? <div className="platform-releases__blocking-error"><strong>Release registry could not be loaded.</strong><span>{readableError(releases.error)}</span><button type="button" className="app-button app-button--secondary" disabled={releases.isFetching} onClick={() => void releases.refetch()}>Retry</button></div> : null}
      {!blockingError && releases.isLoading ? <div className="platform-releases__loading">Loading release registry…</div> : null}
      {!blockingError && response && !response.releases.length ? <div className="platform-releases__empty"><strong>No releases match these filters.</strong><span>This means no matching application registry records were returned; it does not establish that no external deployment activity exists.</span></div> : null}
      <div className="platform-releases__list">
        {(response?.releases || []).map((release) => {
          const terminal = TERMINAL.has(release.status);
          return <article className="platform-releases__card" key={release.id}>
            <div className="platform-releases__card-header"><div><h4>{release.version} · {release.title}</h4><p>{release.summary || 'No operational summary recorded.'}</p></div><div className="platform-releases__badges"><span data-tone={statusTone(release.status)}>{pretty(release.status)}</span><span>{pretty(release.release_type)}</span><span>{pretty(release.environment)}</span><span data-tone={release.tenant_impact === 'high' ? 'danger' : release.tenant_impact === 'medium' ? 'warn' : 'neutral'}>{pretty(release.tenant_impact)} impact</span></div></div>
            <div className="platform-releases__metrics-grid">
              <div><span>Planned</span><strong>{dateTime(release.planned_at)}</strong></div><div><span>Deployed state recorded</span><strong>{dateTime(release.deployed_at)}</strong></div><div><span>Rollback state recorded</span><strong>{dateTime(release.rolled_back_at)}</strong></div>
              <div><span>Owner</span><strong>{release.owner_email || (release.owner_present ? 'Linked · identity restricted' : 'Not assigned')}</strong></div><div><span>Change evidence</span><strong>{release.change_request_title || (release.change_request_present ? 'Linked · evidence restricted' : 'Not linked')}</strong></div><div><span>Maintenance</span><strong>{release.maintenance_window_title || (release.maintenance_window_present ? 'Linked · evidence restricted' : release.requires_maintenance ? 'Required · no visible linked window' : 'Not required')}</strong></div>
            </div>
            <div className="platform-releases__notes"><div><strong>Release notes</strong><span>{release.release_notes || 'Not recorded'}</span></div><div><strong>Rollback plan</strong><span>{release.rollback_plan || 'Not recorded'}</span></div></div>
            <div className="platform-releases__card-footer">
              <div className="platform-releases__source-links">{canReadChanges && release.change_request_id ? <Link to="/platform/change-management">Change Management</Link> : null}{canReadMaintenance && release.maintenance_window_id ? <Link to="/platform/maintenance">Maintenance</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div>
              {canWrite ? <div className="platform-releases__actions">{!terminal ? <button type="button" className="app-button app-button--secondary" onClick={() => startEdit(release)}>Edit details</button> : <span className="platform-releases__immutable">Terminal release history · details immutable</span>}{release.status === 'planned' ? <><button type="button" className="app-button app-button--secondary" disabled={transition.isPending} onClick={() => runTransition(release, 'in_progress', 'Move this release workflow to In progress? This records application workflow state only.')}>Start</button><button type="button" className="app-button app-button--secondary" disabled={transition.isPending} onClick={() => runTransition(release, 'cancelled', 'Cancel this planned release record?')}>Cancel</button></> : null}{release.status === 'in_progress' ? <><button type="button" className="app-button app-button--primary" disabled={transition.isPending} onClick={() => runTransition(release, 'deployed', 'Record this release as Deployed? Only continue when the Platform workflow should record that state; this does not verify an external deployment provider.')}>Record deployed</button><button type="button" className="app-button app-button--secondary" disabled={transition.isPending} onClick={() => runTransition(release, 'rolled_back', 'Record this release as Rolled back? This is application evidence, not external rollback verification.')}>Record rollback</button><button type="button" className="app-button app-button--secondary" disabled={transition.isPending} onClick={() => runTransition(release, 'cancelled', 'Cancel this in-progress release record?')}>Cancel</button></> : null}{release.status === 'deployed' ? <button type="button" className="app-button app-button--secondary" disabled={transition.isPending} onClick={() => runTransition(release, 'rolled_back', 'Record this deployed release as Rolled back? This does not independently verify external rollback completion.')}>Record rollback</button> : null}</div> : null}
            </div>
          </article>;
        })}
      </div>
      {response ? <div className="platform-releases__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || releases.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} releases · {pagination?.total ?? 0} filtered total</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!pagination?.has_more || releases.isFetching}>Next</button></div> : null}
    </section>

    <section className="io-workspace-panel platform-releases__section"><OperationalSectionHeader iconPath="/platform/releases" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." /><div className="platform-releases__supporting-links">{canReadChanges ? <Link to="/platform/change-management">Change Management</Link> : null}{canReadMaintenance ? <Link to="/platform/maintenance">Maintenance</Link> : null}{canReadJobs ? <Link to="/platform/operational-jobs">Operational jobs</Link> : null}{canReadUsers ? <Link to="/platform/users">Platform users</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div></section>
  </div>;
}
