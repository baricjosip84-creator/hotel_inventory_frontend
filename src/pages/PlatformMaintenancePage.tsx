import { useMemo, useState } from 'react';
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
import './PlatformMaintenancePage.css';

type Tenant = { id: string; name: string; status?: string | null };
type MaintenanceStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';
type MaintenanceWindow = {
  id: string;
  title: string;
  message?: string | null;
  scope: 'platform' | 'tenant';
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_status?: string | null;
  tenant_present?: boolean;
  starts_at: string;
  ends_at: string;
  status: MaintenanceStatus;
  lock_writes: boolean;
  created_by_platform_user_id?: string | null;
  created_by_email?: string | null;
  created_by_present?: boolean;
  cancelled_by_platform_user_id?: string | null;
  cancelled_by_email?: string | null;
  cancelled_by_present?: boolean;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  completed_at?: string | null;
  is_current?: boolean;
  is_terminal?: boolean;
};
type MaintenanceResponse = {
  windows: MaintenanceWindow[];
  summary: {
    total: number;
    scheduled: number;
    active: number;
    completed: number;
    cancelled: number;
    platform_scoped: number;
    tenant_scoped: number;
    active_write_locks: number;
  };
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: { tenant_identity: boolean; platform_user_identity: boolean };
  evidence_complete: boolean;
  evidence_contract: {
    application_maintenance_records_only: boolean;
    effective_phase_is_derived_from_application_time_and_terminal_state: boolean;
    lock_writes_is_an_application_request_guard_not_proof_of_external_downtime: boolean;
    tenant_message_is_tenant_visible_during_current_or_upcoming_non_terminal_windows: boolean;
    maintenance_completion_does_not_prove_external_work_or_customer_acceptance: boolean;
    maintenance_records_do_not_prove_customer_notification_delivery: boolean;
    maintenance_records_do_not_replace_external_service_health_or_change_execution_evidence: boolean;
  };
  generated_at: string;
};
type MaintenanceForm = {
  title: string;
  message: string;
  scope: 'platform' | 'tenant';
  tenant_id: string;
  starts_at: string;
  ends_at: string;
  lock_writes: boolean;
};
type MaintenanceEditForm = Pick<MaintenanceForm, 'title' | 'message' | 'starts_at' | 'ends_at' | 'lock_writes'>;

const PAGE_SIZE = 50;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function localDateTimeValue(value: Date | string) { const date = value instanceof Date ? value : new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function formatDateTime(value?: string | null) { if (!value) return 'Not recorded'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(); }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function identityLabel(email: string | null | undefined, present: boolean | undefined, allowed: boolean) { if (!allowed && present) return 'Restricted'; return email || 'Not recorded'; }
function statusTone(status: MaintenanceStatus) { if (status === 'active') return 'warn'; if (status === 'cancelled') return 'danger'; if (status === 'completed') return 'good'; return 'neutral'; }
function createInitialForm(): MaintenanceForm {
  return {
    title: '',
    message: '',
    scope: 'platform',
    tenant_id: '',
    starts_at: localDateTimeValue(new Date(Date.now() + 60 * 60_000)),
    ends_at: localDateTimeValue(new Date(Date.now() + 2 * 60 * 60_000)),
    lock_writes: false
  };
}
function editFormFromWindow(window: MaintenanceWindow): MaintenanceEditForm {
  return { title: window.title, message: window.message || '', starts_at: localDateTimeValue(window.starts_at), ends_at: localDateTimeValue(window.ends_at), lock_writes: window.lock_writes };
}

export default function PlatformMaintenancePage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_WRITE);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadIncidents = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ);
  const canReadReleases = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ);
  const canReadAnnouncements = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ);
  const canReadJobs = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const tenantId = canReadTenants && uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const status = searchParams.get('status') || '';
  const scope = searchParams.get('scope') || '';
  const includePast = searchParams.get('include_past') === 'true';
  const search = searchParams.get('search') || '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);

  const [form, setForm] = useState<MaintenanceForm>(() => createInitialForm());
  const [editing, setEditing] = useState<MaintenanceWindow | null>(null);
  const [editForm, setEditForm] = useState<MaintenanceEditForm | null>(null);
  const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({});
  const [completionNoteById, setCompletionNoteById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants', 'maintenance-directory'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canReadTenants,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const listParams = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (scope) params.set('scope', scope);
    if (tenantId) params.set('tenant_id', tenantId);
    if (search.trim()) params.set('search', search.trim());
    params.set('include_past', includePast ? 'true' : 'false');
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params.toString();
  }, [status, scope, tenantId, search, includePast, offset]);

  const maintenanceQuery = useQuery({
    queryKey: ['platform', 'maintenance', 'registry', listParams],
    queryFn: () => platformApiRequest<MaintenanceResponse>(`/platform/maintenance?${listParams}`),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    placeholderData: (previous) => previous
  });

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
    if (!Object.prototype.hasOwnProperty.call(patch, 'offset')) next.delete('offset');
    setSearchParams(next, { replace: true });
    setMessage('');
  };
  const invalidateMaintenance = async () => { await queryClient.invalidateQueries({ queryKey: ['platform', 'maintenance'] }); };
  const refresh = async () => {
    const jobs: Promise<unknown>[] = [maintenanceQuery.refetch()];
    if (canReadTenants) jobs.push(tenantsQuery.refetch());
    await Promise.allSettled(jobs);
  };

  const createMutation = useMutation({
    mutationFn: () => platformApiRequest<MaintenanceWindow>('/platform/maintenance', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title.trim(),
        message: form.message.trim() || null,
        scope: form.scope,
        tenant_id: form.scope === 'tenant' ? form.tenant_id : null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        lock_writes: form.lock_writes
      })
    }),
    onSuccess: async (created) => {
      setForm(createInitialForm());
      setMessage(`Maintenance window created: ${created.title}.`);
      await invalidateMaintenance();
    }
  });
  const editMutation = useMutation({
    mutationFn: () => {
      if (!editing || !editForm) throw new Error('Select a maintenance window to edit.');
      const body: Record<string, unknown> = {
        title: editForm.title.trim(),
        message: editForm.message.trim() || null,
        ends_at: new Date(editForm.ends_at).toISOString(),
        lock_writes: editForm.lock_writes
      };
      if (editing.status === 'scheduled') body.starts_at = new Date(editForm.starts_at).toISOString();
      return platformApiRequest<MaintenanceWindow>(`/platform/maintenance/${encodeURIComponent(editing.id)}`, { method: 'PATCH', body: JSON.stringify(body) });
    },
    onSuccess: async () => { setEditing(null); setEditForm(null); setMessage('Maintenance window details updated.'); await invalidateMaintenance(); }
  });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => platformApiRequest<MaintenanceWindow>(`/platform/maintenance/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }),
    onSuccess: async (_window, variables) => {
      setCancelReasonById((current) => ({ ...current, [variables.id]: '' }));
      setMessage('Maintenance window cancelled. Active write-lock enforcement stops immediately.');
      await invalidateMaintenance();
    }
  });
  const completeMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => platformApiRequest<MaintenanceWindow>(`/platform/maintenance/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify({ note: note.trim() || null }) }),
    onSuccess: async (_window, variables) => {
      setCompletionNoteById((current) => ({ ...current, [variables.id]: '' }));
      setMessage('Active maintenance marked completed. Active write-lock enforcement stops immediately.');
      await invalidateMaintenance();
    }
  });

  const data = maintenanceQuery.data;
  const windows = data?.windows || [];
  const summary = data?.summary;
  const pagination = data?.pagination;
  const requestedTenantInvalid = Boolean(requestedTenantId && (!canReadTenants || !uuidPattern.test(requestedTenantId)));
  const creatingTenantScope = form.scope === 'tenant';
  const createStart = new Date(form.starts_at).getTime();
  const createEnd = new Date(form.ends_at).getTime();
  const createValidation = !form.title.trim()
    ? 'Enter a maintenance title.'
    : creatingTenantScope && !canReadTenants
      ? 'TENANTS_READ is required for tenant-specific maintenance.'
      : creatingTenantScope && !form.tenant_id
        ? 'Select a tenant for tenant-specific maintenance.'
        : Number.isNaN(createStart) || Number.isNaN(createEnd)
          ? 'Choose valid start and end times.'
          : createEnd <= createStart
            ? 'End time must be after start time.'
            : createEnd <= Date.now()
              ? 'End time must still be in the future.'
              : '';
  const editStart = editForm ? new Date(editForm.starts_at).getTime() : Number.NaN;
  const editEnd = editForm ? new Date(editForm.ends_at).getTime() : Number.NaN;
  const editValidation = !editForm?.title.trim()
    ? 'Title is required.'
    : Number.isNaN(editStart) || Number.isNaN(editEnd)
      ? 'Choose valid start and end times.'
      : editEnd <= editStart
        ? 'End time must be after start time.'
        : editEnd <= Date.now()
          ? 'End time must still be in the future.'
          : '';
  const staleWarning = maintenanceQuery.isError && Boolean(maintenanceQuery.data);
  const blockingError = maintenanceQuery.isError && !maintenanceQuery.data;
  const snapshotLabel = data?.generated_at ? formatDateTime(data.generated_at) : 'Not loaded';
  const visibleStart = pagination && pagination.total ? pagination.offset + 1 : 0;
  const visibleEnd = pagination ? Math.min(pagination.offset + windows.length, pagination.total) : windows.length;

  return (
    <div className="platform-maintenance">
      <OperationalWorkspaceHero
        iconPath="/platform/maintenance"
        eyebrow="Platform operations"
        title="Maintenance"
        description="Schedule planned application maintenance, publish tenant-visible notices, and optionally enforce real application write locks during active windows. Window records describe application control-plane state; they do not prove external maintenance work or customer receipt."
        meta={<>
          <OperationalWorkspaceMetaPill>Snapshot {snapshotLabel}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{data?.evidence_complete ? 'Full identity evidence' : 'Partial identity evidence'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{includePast ? 'History included' : 'Current + upcoming'}</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-maintenance__hero-aside">
          <OperationalWorkspaceStatus value={maintenanceQuery.isLoading ? 'Loading' : `${summary?.active || 0} active`} label={`${summary?.active_write_locks || 0} active write-lock window${(summary?.active_write_locks || 0) === 1 ? '' : 's'}`} />
          <button type="button" className="app-button app-button--secondary" onClick={() => void refresh()} disabled={maintenanceQuery.isFetching || tenantsQuery.isFetching}>{maintenanceQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
        </div>}
      />

      {requestedTenantInvalid ? <div className="platform-maintenance__warning">Invalid or unauthorized URL filter: tenant targeting requires a valid tenant id and TENANTS_READ.</div> : null}
      {staleWarning ? <div className="platform-maintenance__warning">Showing the last successful maintenance snapshot. Refresh failed: {readableError(maintenanceQuery.error)}</div> : null}
      {message ? <div className="platform-maintenance__success"><span>{message}</span><button type="button" className="app-button app-button--secondary" onClick={() => setMessage('')}>Dismiss</button></div> : null}

      <OperationalWorkspaceStats ariaLabel="Maintenance registry summary">
        <OperationalWorkspaceStatCard label="Matched windows" value={summary?.total ?? 0} helper="Registry-wide under current filters" loading={maintenanceQuery.isLoading} />
        <OperationalWorkspaceStatCard label="Active" value={summary?.active ?? 0} helper="Time-derived current phase" tone={(summary?.active || 0) > 0 ? 'warn' : 'neutral'} loading={maintenanceQuery.isLoading} />
        <OperationalWorkspaceStatCard label="Scheduled" value={summary?.scheduled ?? 0} helper="Upcoming non-terminal windows" loading={maintenanceQuery.isLoading} />
        <OperationalWorkspaceStatCard label="Write locks" value={summary?.active_write_locks ?? 0} helper="Active windows enforcing app writes" tone={(summary?.active_write_locks || 0) > 0 ? 'danger' : 'good'} loading={maintenanceQuery.isLoading} />
        <OperationalWorkspaceStatCard label="Completed" value={summary?.completed ?? 0} helper="Elapsed or explicitly completed" tone="good" loading={maintenanceQuery.isLoading} />
        <OperationalWorkspaceStatCard label="Cancelled" value={summary?.cancelled ?? 0} helper="Cancelled application windows" tone="neutral" loading={maintenanceQuery.isLoading} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-section platform-maintenance__section">
        <OperationalSectionHeader iconPath="/platform/maintenance" title="Evidence and truth boundary" description="Maintenance records, tenant visibility and write-lock enforcement are application evidence only." />
        <div className="platform-maintenance__truth-note">
          <strong>What this workspace proves</strong>
          <span>The application recorded a planned window, derives its current phase from the scheduled times, and—when <b>Lock writes</b> is enabled—guards tenant application write requests while that window is active.</span>
          <strong>What this workspace does not prove</strong>
          <span>It does not prove infrastructure work occurred, an external service was unavailable or recovered, a customer received or accepted the notice, or a linked release/change actually executed successfully.</span>
        </div>
        {!data?.evidence_complete && data ? <div className="platform-maintenance__warning">Some identity evidence is restricted. Tenant identity requires TENANTS_READ and Platform operator identity requires PLATFORM_USERS_READ. Restricted identity is shown as Restricted rather than a fake blank value.</div> : null}
      </section>

      <section className="io-workspace-section platform-maintenance__section">
        <OperationalSectionHeader iconPath="/platform/maintenance" title="Filters" description="Search and paginate the server-side maintenance registry. Status is the effective phase, not a stale stored label." />
        <div className="platform-maintenance__filters">
          <label className="platform-maintenance__search">Search<input value={search} onChange={(event) => updateParams({ search: event.target.value || null })} placeholder="Title, tenant-visible message, cancellation reason…" /></label>
          <label>Status<select value={status} onChange={(event) => { const nextStatus = event.target.value; updateParams({ status: nextStatus || null, include_past: ['completed', 'cancelled'].includes(nextStatus) ? 'true' : includePast ? 'true' : null }); }}><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
          <label>Scope<select value={scope} onChange={(event) => updateParams({ scope: event.target.value || null })}><option value="">All scopes</option><option value="platform">Platform-wide</option><option value="tenant">Tenant-specific</option></select></label>
          {canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateParams({ tenant_id: event.target.value || null })}><option value="">All tenants</option>{(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}{tenant.status ? ` (${pretty(tenant.status)})` : ''}</option>)}</select></label> : null}
          <label className="platform-maintenance__checkbox"><input type="checkbox" checked={includePast} onChange={(event) => updateParams({ include_past: event.target.checked ? 'true' : null })} />Include completed/cancelled history</label>
        </div>
        {canReadTenants && tenantsQuery.isError ? <div className="platform-maintenance__warning">Tenant directory unavailable. Platform-wide maintenance remains usable; tenant selection is temporarily unavailable. <button type="button" className="app-button app-button--secondary" onClick={() => void tenantsQuery.refetch()}>Retry tenant directory</button></div> : null}
      </section>

      {canWrite ? <section className="io-workspace-section platform-maintenance__section">
        <OperationalSectionHeader iconPath="/platform/maintenance" title="Create maintenance window" description="New windows begin as Scheduled unless their start time has already arrived. Tenant targeting is allowed only with TENANTS_READ." />
        <div className="platform-maintenance__form-grid">
          <label className="platform-maintenance__span-2">Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} maxLength={200} placeholder="Planned database maintenance" /></label>
          <label>Scope<select value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value as 'platform' | 'tenant', tenant_id: '' })}><option value="platform">Platform-wide</option>{canReadTenants ? <option value="tenant">Tenant-specific</option> : null}</select><small>{canReadTenants ? 'Tenant-specific targeting is available.' : 'TENANTS_READ is required to target a tenant.'}</small></label>
          {creatingTenantScope ? <label>Tenant<select value={form.tenant_id} onChange={(event) => setForm({ ...form, tenant_id: event.target.value })}><option value="">Select tenant</option>{(tenantsQuery.data || []).filter((tenant) => tenant.status !== 'archived').map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}{tenant.status ? ` (${pretty(tenant.status)})` : ''}</option>)}</select></label> : null}
          <label>Starts at<input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} /></label>
          <label>Ends at<input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} /></label>
          <label className="platform-maintenance__checkbox"><input type="checkbox" checked={form.lock_writes} onChange={(event) => setForm({ ...form, lock_writes: event.target.checked })} />Lock application writes while active</label>
          <label className="platform-maintenance__span-all">Tenant-visible message<textarea value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} maxLength={5000} placeholder="Message shown to affected tenant users while this window is current or upcoming." /></label>
          {createValidation ? <div className="platform-maintenance__validation">{createValidation}</div> : null}
        </div>
        <div className="platform-maintenance__actions"><button type="button" className="app-button" disabled={Boolean(createValidation) || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? 'Creating…' : 'Create window'}</button></div>
        {createMutation.isError ? <div className="platform-maintenance__warning">Create failed: {readableError(createMutation.error)}</div> : null}
      </section> : null}

      <section className="io-workspace-section platform-maintenance__section">
        <OperationalSectionHeader
          iconPath="/platform/maintenance"
          title="Maintenance registry"
          description={pagination ? `Showing ${visibleStart}–${visibleEnd} of ${pagination.total} matching windows.` : 'Current maintenance registry.'}
          actions={<div className="platform-maintenance__supporting-links">
            {canReadIncidents ? <Link to="/platform/incidents">Incidents</Link> : null}
            {canReadReleases ? <Link to="/platform/releases">Releases</Link> : null}
            {canReadAnnouncements ? <Link to="/platform/announcements">Announcements</Link> : null}
            {canReadJobs ? <Link to="/platform/operational-jobs?category=maintenance">Operational jobs</Link> : null}
            {canReadAudit ? <Link to="/platform/audit">Audit</Link> : null}
          </div>}
        />

        {blockingError ? <div className="platform-maintenance__blocking-error"><strong>Maintenance registry could not be loaded.</strong><span>{readableError(maintenanceQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void maintenanceQuery.refetch()}>Retry</button></div> : null}
        {maintenanceQuery.isLoading && !data ? <div className="platform-maintenance__loading">Loading maintenance registry…</div> : null}
        {!blockingError && !maintenanceQuery.isLoading && windows.length === 0 ? <div className="platform-maintenance__empty"><strong>No application maintenance evidence matched.</strong><span>This does not prove that no external maintenance work exists; it means no records matched this application registry/filter.</span></div> : null}

        <div className="platform-maintenance__list">
          {windows.map((window) => {
            const tenantLabel = window.scope === 'platform' ? 'Platform-wide' : canReadTenants ? (window.tenant_name || 'Tenant record') : 'Tenant-specific · Restricted identity';
            const canEditWindow = canWrite && !window.is_terminal;
            const isEditing = editing?.id === window.id && editForm;
            const cancelReason = cancelReasonById[window.id] || '';
            const completionNote = completionNoteById[window.id] || '';
            return <article key={window.id} className="platform-maintenance__card">
              <div className="platform-maintenance__card-header">
                <div><h4>{window.title}</h4><p>{tenantLabel}</p></div>
                <div className="platform-maintenance__badges"><span data-tone={statusTone(window.status)}>{pretty(window.status)}</span>{window.lock_writes ? <span data-tone={window.status === 'active' ? 'danger' : 'warn'}>Write lock</span> : <span>No write lock</span>}</div>
              </div>
              {window.message ? <div className="platform-maintenance__public-note"><strong>Tenant-visible message</strong><span>{window.message}</span></div> : <div className="platform-maintenance__public-note"><strong>Tenant-visible message</strong><span>No message recorded.</span></div>}
              <div className="platform-maintenance__metrics-grid">
                <div><span>Starts</span><strong>{formatDateTime(window.starts_at)}</strong></div>
                <div><span>Ends</span><strong>{formatDateTime(window.ends_at)}</strong></div>
                <div><span>Current phase</span><strong>{pretty(window.status)}</strong></div>
                <div><span>Created by</span><strong>{identityLabel(window.created_by_email, window.created_by_present, canReadPlatformUsers)}</strong></div>
                <div><span>Tenant identity</span><strong>{window.scope === 'platform' ? 'Not applicable' : canReadTenants ? (window.tenant_name || 'Not recorded') : window.tenant_present ? 'Restricted' : 'Not recorded'}</strong></div>
                <div><span>Application write guard</span><strong>{window.lock_writes ? (window.status === 'active' ? 'Enforcing now' : window.status === 'scheduled' ? 'Will enforce when active' : 'Not active') : 'Not requested'}</strong></div>
              </div>
              {window.status === 'cancelled' ? <div className="platform-maintenance__cancelled"><strong>Cancellation evidence</strong><span>{window.cancellation_reason || 'No reason recorded'} · {formatDateTime(window.cancelled_at)} · {identityLabel(window.cancelled_by_email, window.cancelled_by_present, canReadPlatformUsers)}</span></div> : null}
              {window.status === 'completed' ? <div className="platform-maintenance__completed"><strong>Completion evidence</strong><span>{formatDateTime(window.completed_at)}. This application state does not prove external maintenance work completed successfully.</span></div> : null}

              {isEditing ? <div className="platform-maintenance__edit-panel">
                <strong>Edit ordinary window details</strong>
                <div className="platform-maintenance__form-grid">
                  <label className="platform-maintenance__span-2">Title<input value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /></label>
                  {window.status === 'scheduled' ? <label>Starts at<input type="datetime-local" value={editForm.starts_at} onChange={(event) => setEditForm({ ...editForm, starts_at: event.target.value })} /></label> : <label>Starts at<input type="datetime-local" value={editForm.starts_at} disabled /><small>Active-window start history is immutable.</small></label>}
                  <label>Ends at<input type="datetime-local" value={editForm.ends_at} onChange={(event) => setEditForm({ ...editForm, ends_at: event.target.value })} /></label>
                  <label className="platform-maintenance__checkbox"><input type="checkbox" checked={editForm.lock_writes} onChange={(event) => setEditForm({ ...editForm, lock_writes: event.target.checked })} />Lock application writes while active</label>
                  <label className="platform-maintenance__span-all">Tenant-visible message<textarea value={editForm.message} onChange={(event) => setEditForm({ ...editForm, message: event.target.value })} /></label>
                  {editValidation ? <div className="platform-maintenance__validation">{editValidation}</div> : null}
                </div>
                <div className="platform-maintenance__actions"><button type="button" className="app-button" disabled={Boolean(editValidation) || editMutation.isPending} onClick={() => editMutation.mutate()}>{editMutation.isPending ? 'Saving…' : 'Save details'}</button><button type="button" className="app-button app-button--secondary" onClick={() => { setEditing(null); setEditForm(null); }}>Close editor</button></div>
                {editMutation.isError ? <div className="platform-maintenance__warning">Edit failed: {readableError(editMutation.error)}</div> : null}
              </div> : null}

              {canEditWindow ? <div className="platform-maintenance__lifecycle-box">
                <div className="platform-maintenance__actions"><button type="button" className="app-button app-button--secondary" onClick={() => { setEditing(window); setEditForm(editFormFromWindow(window)); setMessage(''); }}>Edit details</button>{canReadAudit ? <Link className="app-button app-button--secondary" to={`/platform/audit?target=${encodeURIComponent(window.id)}`}>Audit evidence</Link> : null}{window.scope === 'tenant' && window.tenant_id && canReadTenants ? <Link className="app-button app-button--secondary" to={`/platform/tenants?tenant=${encodeURIComponent(window.tenant_id)}`}>Tenant record</Link> : null}</div>
                {window.status === 'active' ? <div className="platform-maintenance__complete-box"><label>Completion note<input value={completionNote} onChange={(event) => setCompletionNoteById((current) => ({ ...current, [window.id]: event.target.value }))} maxLength={1000} placeholder="Optional application completion note" /></label><button type="button" className="app-button" disabled={completeMutation.isPending} onClick={() => { if (globalThis.confirm(`Mark maintenance window “${window.title}” completed now?`)) completeMutation.mutate({ id: window.id, note: completionNote }); }}>{completeMutation.isPending ? 'Completing…' : 'Complete now'}</button></div> : null}
                <div className="platform-maintenance__cancel-box"><label>Cancellation reason<input value={cancelReason} onChange={(event) => setCancelReasonById((current) => ({ ...current, [window.id]: event.target.value }))} maxLength={1000} placeholder="Reason required" /></label><button type="button" className="app-button app-button--danger" disabled={!cancelReason.trim() || cancelMutation.isPending} onClick={() => { if (globalThis.confirm(`Cancel maintenance window “${window.title}”?`)) cancelMutation.mutate({ id: window.id, reason: cancelReason }); }}>{cancelMutation.isPending ? 'Cancelling…' : 'Cancel window'}</button></div>
                {completeMutation.isError ? <div className="platform-maintenance__warning">Completion failed: {readableError(completeMutation.error)}</div> : null}
                {cancelMutation.isError ? <div className="platform-maintenance__warning">Cancellation failed: {readableError(cancelMutation.error)}</div> : null}
              </div> : null}
            </article>;
          })}
        </div>

        {pagination ? <div className="platform-maintenance__pagination"><button type="button" className="app-button app-button--secondary" disabled={pagination.offset <= 0 || maintenanceQuery.isFetching} onClick={() => updateParams({ offset: String(Math.max(0, pagination.offset - PAGE_SIZE)) })}>Previous</button><span>{visibleStart}–{visibleEnd} of {pagination.total}</span><button type="button" className="app-button app-button--secondary" disabled={!pagination.has_more || maintenanceQuery.isFetching} onClick={() => updateParams({ offset: String(pagination.offset + PAGE_SIZE) })}>Next</button></div> : null}
      </section>
    </div>
  );
}
