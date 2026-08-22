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
import './PlatformAnnouncementsPage.css';

type Tenant = { id: string; name: string; status?: string | null };
type AnnouncementStatus = 'draft' | 'published' | 'cancelled' | 'expired';
type AnnouncementAudience = 'tenant' | 'platform' | 'all';
type AnnouncementSeverity = 'info' | 'warning' | 'critical';
type Announcement = {
  id: string;
  title: string;
  message: string;
  audience: AnnouncementAudience;
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_status?: string | null;
  tenant_present?: boolean;
  severity: AnnouncementSeverity;
  status: AnnouncementStatus;
  starts_at: string;
  ends_at?: string | null;
  dismissible: boolean;
  created_by_platform_user_id?: string | null;
  created_by_email?: string | null;
  created_by_present?: boolean;
  published_by_platform_user_id?: string | null;
  published_by_email?: string | null;
  published_by_present?: boolean;
  cancelled_by_platform_user_id?: string | null;
  cancelled_by_email?: string | null;
  cancelled_by_present?: boolean;
  cancellation_reason?: string | null;
  is_current?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  cancelled_at?: string | null;
};
type AnnouncementResponse = {
  announcements: Announcement[];
  summary: {
    total: number;
    draft: number;
    published: number;
    expired: number;
    cancelled: number;
    current: number;
    current_tenant_visible: number;
    current_platform_visible: number;
    critical_current: number;
    tenant_specific: number;
  };
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: { tenant_identity: boolean; platform_user_identity: boolean };
  evidence_complete: boolean;
  evidence_contract: {
    application_announcement_records_only: boolean;
    effective_expiry_is_derived_from_the_application_time_window: boolean;
    published_state_means_available_to_the_matching_application_context_during_its_time_window: boolean;
    publication_does_not_prove_browser_delivery_or_customer_receipt: boolean;
    dismissible_is_a_client_display_control_not_acknowledgement_evidence: boolean;
    platform_and_tenant_contexts_expose_only_current_audience_appropriate_message_fields: boolean;
  };
  generated_at: string;
};
type AnnouncementForm = {
  title: string;
  message: string;
  audience: AnnouncementAudience;
  tenant_id: string;
  severity: AnnouncementSeverity;
  starts_at: string;
  ends_at: string;
  dismissible: boolean;
};
type EditForm = Pick<AnnouncementForm, 'title' | 'message' | 'severity' | 'starts_at' | 'ends_at' | 'dismissible'>;

const PAGE_SIZE = 50;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function localDateTimeValue(value: Date | string) { const date = value instanceof Date ? value : new Date(value); const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function formatDateTime(value?: string | null) { if (!value) return 'Not recorded'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(); }
function identityLabel(email: string | null | undefined, present: boolean | undefined, allowed: boolean) { if (!allowed && present) return 'Restricted'; return email || 'Not recorded'; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function statusTone(status: AnnouncementStatus) { if (status === 'published') return 'good'; if (status === 'cancelled') return 'danger'; if (status === 'expired') return 'neutral'; return 'warn'; }
function severityTone(severity: AnnouncementSeverity) { if (severity === 'critical') return 'danger'; if (severity === 'warning') return 'warn'; return 'neutral'; }
function initialForm(): AnnouncementForm {
  return {
    title: '',
    message: '',
    audience: 'all',
    tenant_id: '',
    severity: 'info',
    starts_at: localDateTimeValue(new Date()),
    ends_at: '',
    dismissible: true
  };
}
function editFrom(row: Announcement): EditForm {
  return {
    title: row.title,
    message: row.message,
    severity: row.severity,
    starts_at: localDateTimeValue(row.starts_at),
    ends_at: row.ends_at ? localDateTimeValue(row.ends_at) : '',
    dismissible: row.dismissible
  };
}

export default function PlatformAnnouncementsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_WRITE);
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadMaintenance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ);
  const canReadIncidents = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const status = searchParams.get('status') || '';
  const audience = searchParams.get('audience') || '';
  const search = searchParams.get('search') || '';
  const requestedTenantId = searchParams.get('tenant_id') || '';
  const tenantId = canReadTenants && uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const includeExpired = searchParams.get('include_expired') === 'true' || status === 'expired' || status === 'cancelled';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);

  const [form, setForm] = useState<AnnouncementForm>(() => initialForm());
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants', 'announcements-directory'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canReadTenants,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const listParams = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (audience) params.set('audience', audience);
    if (tenantId) params.set('tenant_id', tenantId);
    if (search.trim()) params.set('search', search.trim());
    params.set('include_expired', includeExpired ? 'true' : 'false');
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params.toString();
  }, [status, audience, tenantId, search, includeExpired, offset]);

  const announcementsQuery = useQuery({
    queryKey: ['platform', 'announcements', 'registry', listParams],
    queryFn: () => platformApiRequest<AnnouncementResponse>(`/platform/announcements?${listParams}`),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    placeholderData: (previous) => previous
  });

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
    if (!Object.prototype.hasOwnProperty.call(patch, 'offset')) next.delete('offset');
    const nextStatus = patch.status ?? next.get('status');
    if (nextStatus === 'expired' || nextStatus === 'cancelled') next.set('include_expired', 'true');
    setSearchParams(next, { replace: true });
    setMessage('');
  };
  const invalidateAnnouncements = async () => { await queryClient.invalidateQueries({ queryKey: ['platform', 'announcements'] }); };
  const refresh = async () => {
    const jobs: Promise<unknown>[] = [announcementsQuery.refetch()];
    if (canReadTenants) jobs.push(tenantsQuery.refetch());
    await Promise.allSettled(jobs);
  };

  const createMutation = useMutation({
    mutationFn: () => platformApiRequest<Announcement>('/platform/announcements', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title.trim(),
        message: form.message.trim(),
        audience: form.audience,
        tenant_id: form.audience === 'tenant' ? form.tenant_id : null,
        severity: form.severity,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        dismissible: form.dismissible
      })
    }),
    onSuccess: async (created) => { setForm(initialForm()); setMessage(`Draft announcement created: ${created.title}. Publish it explicitly when ready.`); await invalidateAnnouncements(); }
  });
  const editMutation = useMutation({
    mutationFn: () => {
      if (!editing || !editForm) throw new Error('Select an announcement to edit.');
      const body: Record<string, unknown> = {
        title: editForm.title.trim(),
        message: editForm.message.trim(),
        severity: editForm.severity,
        ends_at: editForm.ends_at ? new Date(editForm.ends_at).toISOString() : null,
        dismissible: editForm.dismissible
      };
      if (editing.status !== 'published') body.starts_at = new Date(editForm.starts_at).toISOString();
      return platformApiRequest<Announcement>(`/platform/announcements/${encodeURIComponent(editing.id)}`, { method: 'PATCH', body: JSON.stringify(body) });
    },
    onSuccess: async (updated) => { setEditing(null); setEditForm(null); setMessage(updated.status === 'expired' ? 'Announcement details updated. It remains Expired until explicitly published again.' : 'Announcement details updated.'); await invalidateAnnouncements(); }
  });
  const publishMutation = useMutation({
    mutationFn: (id: string) => platformApiRequest<Announcement>(`/platform/announcements/${encodeURIComponent(id)}/publish`, { method: 'POST' }),
    onSuccess: async () => { setMessage('Announcement published. It is available to its matching application audience during the configured time window.'); await invalidateAnnouncements(); }
  });
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => platformApiRequest<Announcement>(`/platform/announcements/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }),
    onSuccess: async (_row, variables) => { setCancelReasonById((current) => ({ ...current, [variables.id]: '' })); setMessage('Announcement cancelled.'); await invalidateAnnouncements(); }
  });

  const data = announcementsQuery.data;
  const rows = data?.announcements || [];
  const summary = data?.summary;
  const pagination = data?.pagination;
  const blockingError = announcementsQuery.isError && !data;
  const staleWarning = announcementsQuery.isError && Boolean(data);
  const invalidTenantFilter = Boolean(requestedTenantId) && (!canReadTenants || !uuidPattern.test(requestedTenantId));
  const visibleStart = pagination && pagination.total ? pagination.offset + 1 : 0;
  const visibleEnd = pagination ? Math.min(pagination.offset + rows.length, pagination.total) : rows.length;

  const formStartsValid = Boolean(form.starts_at && !Number.isNaN(new Date(form.starts_at).getTime()));
  const formEndsValid = !form.ends_at || (formStartsValid && !Number.isNaN(new Date(form.ends_at).getTime()) && new Date(form.ends_at).getTime() > new Date(form.starts_at).getTime());
  const formBlocked = !form.title.trim() || !form.message.trim() || !formStartsValid || !formEndsValid || (form.audience === 'tenant' && (!canReadTenants || !form.tenant_id));

  const editStartsValid = Boolean(editForm?.starts_at && !Number.isNaN(new Date(editForm.starts_at).getTime()));
  const editEndsValid = !editForm?.ends_at || (editStartsValid && !Number.isNaN(new Date(editForm.ends_at).getTime()) && new Date(editForm.ends_at).getTime() > new Date(editForm.starts_at).getTime());
  const editBlocked = !editForm?.title.trim() || !editForm?.message.trim() || !editStartsValid || !editEndsValid;

  return <div className="platform-announcements">
    <OperationalWorkspaceHero
      iconPath="/platform/announcements"
      eyebrow="Platform communications"
      title="Announcements"
      description="Manage application messages for tenants and Platform staff. Create records as drafts, publish deliberately, and keep audience identity behind its source permissions."
      meta={<>
        <OperationalWorkspaceMetaPill>Registry: PLATFORM_ANNOUNCEMENTS_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Tenant identity: TENANTS_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Operator identity: PLATFORM_USERS_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{data?.generated_at ? `Snapshot ${formatDateTime(data.generated_at)}` : 'Snapshot pending'}</OperationalWorkspaceMetaPill>
      </>}
      aside={<div className="platform-announcements__hero-aside">
        <OperationalWorkspaceStatus value={summary?.current ?? '—'} label="current application messages" />
        <button type="button" className="app-button app-button--secondary" onClick={() => void refresh()} disabled={announcementsQuery.isFetching || tenantsQuery.isFetching}>Refresh</button>
      </div>}
    />

    {message ? <div className="platform-announcements__success"><span>{message}</span><button type="button" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {staleWarning ? <div className="platform-announcements__warning"><strong>Showing the last successful announcement snapshot.</strong><span>{readableError(announcementsQuery.error)}</span><button type="button" onClick={() => void announcementsQuery.refetch()}>Retry</button></div> : null}
    {invalidTenantFilter ? <div className="platform-announcements__warning">Invalid or unauthorized URL filter was ignored. Tenant filtering requires TENANTS_READ and a valid tenant UUID.</div> : null}
    {data && !data.evidence_complete ? <div className="platform-announcements__warning"><strong>Partial identity evidence.</strong><span>Restricted sources: {data.omitted_sources.join(', ') || 'none'}.</span></div> : null}

    <OperationalWorkspaceStats ariaLabel="Announcement registry summary">
      <OperationalWorkspaceStatCard label="Current" value={summary?.current ?? 0} helper="Published and inside its application time window" tone={(summary?.current || 0) ? 'good' : 'neutral'} />
      <OperationalWorkspaceStatCard label="Tenant visible" value={summary?.current_tenant_visible ?? 0} helper="Current tenant/all audience records" />
      <OperationalWorkspaceStatCard label="Platform visible" value={summary?.current_platform_visible ?? 0} helper="Current platform/all audience records" />
      <OperationalWorkspaceStatCard label="Critical current" value={summary?.critical_current ?? 0} helper="Current records marked critical" tone={(summary?.critical_current || 0) ? 'danger' : 'neutral'} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-section platform-announcements__section">
      <OperationalSectionHeader iconPath="/platform/announcements" title="Registry filters" description="Status uses effective expiry from the configured end time rather than trusting a stale stored label." />
      <div className="platform-announcements__filters">
        <label className="platform-announcements__search">Search<input value={search} onChange={(event) => updateParams({ search: event.target.value || null })} placeholder="Title, message or cancellation reason" /></label>
        <label>Status<select value={status} onChange={(event) => updateParams({ status: event.target.value || null })}><option value="">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="expired">Expired</option><option value="cancelled">Cancelled</option></select></label>
        <label>Audience<select value={audience} onChange={(event) => updateParams({ audience: event.target.value || null })}><option value="">All audiences</option><option value="tenant">One tenant</option><option value="platform">Platform staff</option><option value="all">Tenants + Platform</option></select></label>
        <label>History<select value={includeExpired ? 'true' : 'false'} onChange={(event) => updateParams({ include_expired: event.target.value })}><option value="false">Current/future + drafts</option><option value="true">Include expired/cancelled</option></select></label>
        {canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateParams({ tenant_id: event.target.value || null })}><option value="">All tenant targets</option>{(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}{tenant.status ? ` · ${tenant.status}` : ''}</option>)}</select></label> : null}
      </div>
    </section>

    {canWrite ? <section className="io-workspace-section platform-announcements__section">
      <OperationalSectionHeader iconPath="/platform/announcements" title="Create draft" description="Creation never publishes. Review the draft in the registry, then use the dedicated Publish action." />
      <div className="platform-announcements__form-grid">
        <label>Title<input value={form.title} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label>
        <label>Audience<select value={form.audience} onChange={(event) => setForm((current) => ({ ...current, audience: event.target.value as AnnouncementAudience, tenant_id: '' }))}><option value="all">Tenants + Platform</option><option value="platform">Platform staff only</option><option value="tenant" disabled={!canReadTenants}>One tenant{!canReadTenants ? ' · requires TENANTS_READ' : ''}</option></select></label>
        {form.audience === 'tenant' ? <label>Tenant<select value={form.tenant_id} onChange={(event) => setForm((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Select tenant</option>{(tenantsQuery.data || []).filter((tenant) => tenant.status !== 'archived').map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : null}
        <label>Severity<select value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value as AnnouncementSeverity }))}><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select></label>
        <label>Starts at<input type="datetime-local" value={form.starts_at} onChange={(event) => setForm((current) => ({ ...current, starts_at: event.target.value }))} /></label>
        <label>Ends at<input type="datetime-local" value={form.ends_at} onChange={(event) => setForm((current) => ({ ...current, ends_at: event.target.value }))} /></label>
        <label className="platform-announcements__checkbox"><input type="checkbox" checked={form.dismissible} onChange={(event) => setForm((current) => ({ ...current, dismissible: event.target.checked }))} /> Audience may dismiss this notice in the current app session</label>
        <label className="platform-announcements__span-all">Message<textarea value={form.message} maxLength={5000} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} /></label>
        {formBlocked ? <div className="platform-announcements__validation">Complete title/message, provide a valid time window, and select an authorized tenant when using the one-tenant audience.</div> : null}
      </div>
      <div className="platform-announcements__actions"><button type="button" className="app-button app-button--primary" disabled={formBlocked || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? 'Creating…' : 'Create draft'}</button></div>
      {createMutation.isError ? <div className="platform-announcements__warning">Create failed: {readableError(createMutation.error)}</div> : null}
    </section> : null}

    <section className="io-workspace-section platform-announcements__section">
      <OperationalSectionHeader
        iconPath="/platform/announcements"
        title="Announcement registry"
        description={pagination ? `Showing ${visibleStart}–${visibleEnd} of ${pagination.total} matching records.` : 'Announcement registry.'}
        actions={<div className="platform-announcements__supporting-links">
          {canReadMaintenance ? <Link to="/platform/maintenance">Maintenance</Link> : null}
          {canReadIncidents ? <Link to="/platform/incidents">Incidents</Link> : null}
          {canReadTenants ? <Link to="/platform/tenants">Tenants</Link> : null}
          {canReadAudit ? <Link to="/platform/audit">Audit</Link> : null}
        </div>}
      />

      <div className="platform-announcements__truth-note"><strong>Evidence boundary</strong><span>Published means the application record is eligible for its matching tenant or Platform context during its configured window. It does not prove browser delivery, customer receipt, reading, acknowledgement, or successful external communication.</span></div>

      {blockingError ? <div className="platform-announcements__blocking-error"><strong>Announcement registry could not be loaded.</strong><span>{readableError(announcementsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void announcementsQuery.refetch()}>Retry</button></div> : null}
      {announcementsQuery.isLoading && !data ? <div className="platform-announcements__loading">Loading announcement registry…</div> : null}
      {!blockingError && !announcementsQuery.isLoading && rows.length === 0 ? <div className="platform-announcements__empty"><strong>No application announcement evidence matched.</strong><span>This does not prove no external message was sent; it means no records matched this application registry/filter.</span></div> : null}

      <div className="platform-announcements__list">
        {rows.map((row) => {
          const isEditing = editing?.id === row.id && editForm;
          const cancelReason = cancelReasonById[row.id] || '';
          const tenantLabel = row.audience !== 'tenant' ? pretty(row.audience) : canReadTenants ? (row.tenant_name || 'Tenant record') : 'Tenant-specific · Restricted identity';
          const canEdit = canWrite && row.status !== 'cancelled';
          const canPublish = canWrite && (row.status === 'draft' || row.status === 'expired');
          return <article key={row.id} className="platform-announcements__card">
            <div className="platform-announcements__card-header">
              <div><h4>{row.title}</h4><p>{tenantLabel}</p></div>
              <div className="platform-announcements__badges"><span data-tone={statusTone(row.status)}>{row.status}</span><span data-tone={severityTone(row.severity)}>{row.severity}</span>{row.is_current ? <span data-tone="good">current</span> : null}</div>
            </div>
            <div className="platform-announcements__public-note"><strong>Audience message</strong><span>{row.message}</span></div>
            <div className="platform-announcements__metrics-grid">
              <div><span>Starts</span><strong>{formatDateTime(row.starts_at)}</strong></div>
              <div><span>Ends</span><strong>{row.ends_at ? formatDateTime(row.ends_at) : 'No configured end'}</strong></div>
              <div><span>Dismissible</span><strong>{row.dismissible ? 'Yes · session display control' : 'No'}</strong></div>
              <div><span>Created by</span><strong>{identityLabel(row.created_by_email, row.created_by_present, canReadPlatformUsers)}</strong></div>
              <div><span>Published by</span><strong>{identityLabel(row.published_by_email, row.published_by_present, canReadPlatformUsers)}</strong></div>
              <div><span>Published at</span><strong>{formatDateTime(row.published_at)}</strong></div>
            </div>
            {row.status === 'cancelled' ? <div className="platform-announcements__cancelled"><strong>Cancelled</strong><span>{row.cancellation_reason || 'No cancellation reason recorded'} · {formatDateTime(row.cancelled_at)} · {identityLabel(row.cancelled_by_email, row.cancelled_by_present, canReadPlatformUsers)}</span></div> : null}
            {row.status === 'expired' ? <div className="platform-announcements__expired"><strong>Expired</strong><span>Editing an expired record does not reactivate it. Give it a future end time if needed, save, then use Publish explicitly.</span></div> : null}

            {canWrite ? <div className="platform-announcements__actions">
              {canEdit ? <button type="button" className="app-button app-button--secondary" onClick={() => { setEditing(row); setEditForm(editFrom(row)); }}>Edit</button> : null}
              {canPublish ? <button type="button" className="app-button app-button--primary" disabled={publishMutation.isPending} onClick={() => publishMutation.mutate(row.id)}>Publish</button> : null}
            </div> : null}

            {isEditing && editForm ? <div className="platform-announcements__edit-panel">
              <strong>Edit announcement details</strong>
              <div className="platform-announcements__form-grid">
                <label>Title<input value={editForm.title} maxLength={200} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} /></label>
                <label>Severity<select value={editForm.severity} onChange={(event) => setEditForm({ ...editForm, severity: event.target.value as AnnouncementSeverity })}><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select></label>
                <label>Starts at<input type="datetime-local" value={editForm.starts_at} disabled={row.status === 'published'} onChange={(event) => setEditForm({ ...editForm, starts_at: event.target.value })} /><small>{row.status === 'published' ? 'Published start history is immutable.' : 'Editable before publication or while preparing an expired record.'}</small></label>
                <label>Ends at<input type="datetime-local" value={editForm.ends_at} onChange={(event) => setEditForm({ ...editForm, ends_at: event.target.value })} /></label>
                <label className="platform-announcements__checkbox"><input type="checkbox" checked={editForm.dismissible} onChange={(event) => setEditForm({ ...editForm, dismissible: event.target.checked })} /> Dismissible in the current app session</label>
                <label className="platform-announcements__span-all">Message<textarea value={editForm.message} maxLength={5000} onChange={(event) => setEditForm({ ...editForm, message: event.target.value })} /></label>
                {editBlocked ? <div className="platform-announcements__validation">Title/message and a valid time window are required.</div> : null}
              </div>
              <div className="platform-announcements__actions"><button type="button" className="app-button app-button--primary" disabled={Boolean(editBlocked) || editMutation.isPending} onClick={() => editMutation.mutate()}>{editMutation.isPending ? 'Saving…' : 'Save details'}</button><button type="button" className="app-button app-button--secondary" onClick={() => { setEditing(null); setEditForm(null); }}>Cancel edit</button></div>
              {editMutation.isError ? <div className="platform-announcements__warning">Edit failed: {readableError(editMutation.error)}</div> : null}
            </div> : null}

            {canWrite && row.status !== 'cancelled' ? <div className="platform-announcements__cancel-box"><label>Cancellation reason<input value={cancelReason} maxLength={1000} placeholder="Reason is required" onChange={(event) => setCancelReasonById((current) => ({ ...current, [row.id]: event.target.value }))} /></label><button type="button" className="app-button app-button--danger" disabled={!cancelReason.trim() || cancelMutation.isPending} onClick={() => { if (globalThis.confirm(`Cancel announcement “${row.title}”?`)) cancelMutation.mutate({ id: row.id, reason: cancelReason }); }}>Cancel announcement</button></div> : null}
          </article>;
        })}
      </div>

      {publishMutation.isError ? <div className="platform-announcements__warning">Publish failed: {readableError(publishMutation.error)}</div> : null}
      {cancelMutation.isError ? <div className="platform-announcements__warning">Cancellation failed: {readableError(cancelMutation.error)}</div> : null}
      {pagination && pagination.total > 0 ? <div className="platform-announcements__pagination"><span>{visibleStart}–{visibleEnd} of {pagination.total}</span><button type="button" className="app-button app-button--secondary" disabled={pagination.offset === 0 || announcementsQuery.isFetching} onClick={() => updateParams({ offset: String(Math.max(0, pagination.offset - pagination.limit)) })}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!pagination.has_more || announcementsQuery.isFetching} onClick={() => updateParams({ offset: String(pagination.offset + pagination.limit) })}>Next</button></div> : null}
    </section>
  </div>;
}
