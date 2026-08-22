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
import './PlatformIncidentsPage.css';

type Tenant = { id: string; name: string; status?: string };
type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'cancelled';
type Incident = {
  id: string;
  title: string;
  summary?: string | null;
  status: IncidentStatus;
  severity: 'minor' | 'major' | 'critical';
  impact: 'none' | 'degraded' | 'partial_outage' | 'major_outage';
  scope: 'platform' | 'tenant';
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_present?: boolean;
  started_at: string;
  resolved_at?: string | null;
  public_message?: string | null;
  internal_notes?: string | null;
  created_by_platform_user_id?: string | null;
  created_by_email?: string | null;
  created_by_present?: boolean;
  resolved_by_platform_user_id?: string | null;
  resolved_by_email?: string | null;
  resolved_by_present?: boolean;
  update_count?: number;
  last_update_at?: string | null;
  is_open?: boolean;
  updates?: Array<{
    id: string;
    status: string;
    message: string;
    is_public: boolean;
    created_at: string;
    created_by_platform_user_id?: string | null;
    created_by_email?: string | null;
    created_by_present?: boolean;
  }>;
  evidence_access?: { tenant_identity: boolean; platform_user_identity: boolean };
};
type IncidentSummary = { total: number; open: number; critical_open: number; platform_open: number; tenant_open: number; resolved: number; cancelled: number };
type IncidentResponse = {
  records: Incident[];
  summary: IncidentSummary;
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: { tenant_identity: boolean; platform_user_identity: boolean };
  evidence_complete: boolean;
  evidence_contract: {
    application_incident_records_only: boolean;
    lifecycle_state_is_operator_recorded_application_evidence: boolean;
    resolved_status_does_not_prove_external_service_recovery_or_customer_acceptance: boolean;
    public_title_and_public_message_are_tenant_visible_while_open: boolean;
    internal_summary_and_internal_notes_are_never_returned_by_tenant_incident_context: boolean;
    incident_update_is_tenant_visible_only_when_explicitly_marked_public: boolean;
    incident_state_does_not_replace_external_monitoring_or_root_cause_evidence: boolean;
  };
  generated_at: string;
};
type IncidentCreateForm = {
  title: string;
  summary: string;
  severity: string;
  impact: string;
  scope: 'platform' | 'tenant';
  tenant_id: string;
  started_at: string;
  public_message: string;
  internal_notes: string;
  initial_update: string;
  initial_update_public: boolean;
};
type IncidentEditForm = { title: string; summary: string; severity: string; impact: string; public_message: string; internal_notes: string };

const PAGE_SIZE = 50;
function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function localDateTimeValue(date: Date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function formatDateTime(value?: string | null) { if (!value) return 'Not recorded'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString(); }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function isClosed(status?: string | null) { return status === 'resolved' || status === 'cancelled'; }
function identityLabel(email: string | null | undefined, present: boolean | undefined, allowed: boolean) { if (!allowed && present) return 'Restricted'; return email || 'Not recorded'; }
function createInitialForm(): IncidentCreateForm {
  return { title: '', summary: '', severity: 'minor', impact: 'degraded', scope: 'platform', tenant_id: '', started_at: localDateTimeValue(new Date()), public_message: '', internal_notes: '', initial_update: '', initial_update_public: false };
}
function editFormFromIncident(incident: Incident): IncidentEditForm {
  return { title: incident.title || '', summary: incident.summary || '', severity: incident.severity, impact: incident.impact, public_message: incident.public_message || '', internal_notes: incident.internal_notes || '' };
}
function normalizeEdit(form: IncidentEditForm) { return { ...form, title: form.title.trim(), summary: form.summary.trim(), public_message: form.public_message.trim(), internal_notes: form.internal_notes.trim() }; }

export default function PlatformIncidentsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_WRITE);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadMaintenance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ);
  const canReadAnnouncements = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ);
  const canReadJobs = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ);
  const canReadSla = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ);
  const canReadSupport = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ);
  const canOpenSupportCockpit = canReadTenants && canReadSla && canReadSupport;

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const tenantId = canReadTenants ? requestedTenantId : '';
  const status = searchParams.get('status') || '';
  const severity = searchParams.get('severity') || '';
  const scope = searchParams.get('scope') || '';
  const includeResolved = searchParams.get('include_resolved') === 'true';
  const search = searchParams.get('search') || '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);

  const [form, setForm] = useState<IncidentCreateForm>(() => createInitialForm());
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [editForm, setEditForm] = useState<IncidentEditForm | null>(null);
  const [updateForm, setUpdateForm] = useState({ status: 'monitoring', message: '', is_public: false });
  const [cancelReason, setCancelReason] = useState('');
  const [message, setMessage] = useState('');

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants', 'incident-directory'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canReadTenants,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const listParams = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (severity) params.set('severity', severity);
    if (scope) params.set('scope', scope);
    if (tenantId) params.set('tenant_id', tenantId);
    if (includeResolved) params.set('include_resolved', 'true'); else params.set('include_resolved', 'false');
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params.toString();
  }, [status, severity, scope, tenantId, includeResolved, search, offset]);

  const incidentsQuery = useQuery({
    queryKey: ['platform', 'incidents', 'registry', listParams],
    queryFn: () => platformApiRequest<IncidentResponse>(`/platform/incidents?${listParams}`),
    refetchOnWindowFocus: false,
    staleTime: 15_000,
    placeholderData: (previous) => previous
  });
  const selectedIncidentQuery = useQuery({
    queryKey: ['platform', 'incidents', 'detail', selectedIncidentId],
    queryFn: () => platformApiRequest<Incident>(`/platform/incidents/${encodeURIComponent(selectedIncidentId || '')}`),
    enabled: Boolean(selectedIncidentId),
    refetchOnWindowFocus: false,
    staleTime: 10_000
  });

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
    if (!Object.prototype.hasOwnProperty.call(patch, 'offset')) next.delete('offset');
    setSearchParams(next, { replace: true });
    setMessage('');
  };
  const invalidateIncidents = async () => { await queryClient.invalidateQueries({ queryKey: ['platform', 'incidents'] }); };
  const refresh = async () => {
    const jobs: Promise<unknown>[] = [incidentsQuery.refetch()];
    if (canReadTenants) jobs.push(tenantsQuery.refetch());
    if (selectedIncidentId) jobs.push(selectedIncidentQuery.refetch());
    await Promise.allSettled(jobs);
  };

  const createMutation = useMutation({
    mutationFn: () => platformApiRequest<Incident>('/platform/incidents', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        severity: form.severity,
        impact: form.impact,
        scope: form.scope,
        tenant_id: form.scope === 'tenant' ? form.tenant_id : null,
        started_at: new Date(form.started_at).toISOString(),
        public_message: form.public_message.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
        initial_update: form.initial_update.trim() || null,
        initial_update_public: form.initial_update_public
      })
    }),
    onSuccess: async (incident) => {
      setForm(createInitialForm());
      setMessage('Incident created in Investigating state.');
      setSelectedIncidentId(incident.id);
      await invalidateIncidents();
    }
  });
  const editMutation = useMutation({
    mutationFn: () => {
      if (!editing || !editForm) throw new Error('Select an incident to edit.');
      const normalized = normalizeEdit(editForm);
      return platformApiRequest<Incident>(`/platform/incidents/${encodeURIComponent(editing.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: normalized.title, summary: normalized.summary || null, severity: normalized.severity, impact: normalized.impact, public_message: normalized.public_message || null, internal_notes: normalized.internal_notes || null })
      });
    },
    onSuccess: async () => { setEditing(null); setEditForm(null); setMessage('Incident details updated.'); await invalidateIncidents(); }
  });
  const addUpdateMutation = useMutation({
    mutationFn: () => {
      if (!selectedIncidentId) throw new Error('Select an incident first.');
      return platformApiRequest<Incident>(`/platform/incidents/${encodeURIComponent(selectedIncidentId)}/updates`, { method: 'POST', body: JSON.stringify({ status: updateForm.status, message: updateForm.message.trim(), is_public: updateForm.is_public }) });
    },
    onSuccess: async () => { const resolved = updateForm.status === 'resolved'; setUpdateForm({ status: 'monitoring', message: '', is_public: false }); setMessage(resolved ? 'Incident resolved with a timeline update.' : 'Incident update recorded.'); await invalidateIncidents(); }
  });
  const cancelMutation = useMutation({
    mutationFn: () => {
      if (!selectedIncidentId) throw new Error('Select an incident first.');
      return platformApiRequest<Incident>(`/platform/incidents/${encodeURIComponent(selectedIncidentId)}/cancel`, { method: 'POST', body: JSON.stringify({ reason: cancelReason.trim() }) });
    },
    onSuccess: async () => { setCancelReason(''); setMessage('Incident cancelled with an internal audit/timeline reason.'); await invalidateIncidents(); }
  });

  const data = incidentsQuery.data;
  const rows = data?.records || [];
  const summary = data?.summary;
  const initialError = incidentsQuery.isError && !data;
  const refreshError = incidentsQuery.isError && Boolean(data);
  const partialEvidence = Boolean(data && !data.evidence_complete);
  const heroStatus = initialError ? 'Unavailable' : refreshError ? 'Stale snapshot' : incidentsQuery.isLoading && !data ? 'Loading' : partialEvidence ? 'Partial evidence' : `${summary?.open ?? 0} open`;
  const selected = selectedIncidentQuery.data;
  const selectedClosed = isClosed(selected?.status);
  const createStartedInvalid = !form.started_at || Number.isNaN(new Date(form.started_at).getTime());
  const createTenantInvalid = form.scope === 'tenant' && (!canReadTenants || !form.tenant_id);
  const createDisabled = createMutation.isPending || !form.title.trim() || createStartedInvalid || createTenantInvalid;
  const editChanged = Boolean(editing && editForm && JSON.stringify(normalizeEdit(editForm)) !== JSON.stringify(normalizeEdit(editFormFromIncident(editing))));
  const editDisabled = editMutation.isPending || !editForm?.title.trim() || !editChanged;
  const updateDisabled = addUpdateMutation.isPending || !updateForm.message.trim();
  const cancelDisabled = cancelMutation.isPending || !cancelReason.trim();
  const mutationError = createMutation.error || editMutation.error || addUpdateMutation.error || cancelMutation.error;

  const beginEdit = (incident: Incident) => { setEditing(incident); setEditForm(editFormFromIncident(incident)); editMutation.reset(); };

  return <div className="platform-incidents">
    <OperationalWorkspaceHero
      iconPath="/platform/incidents"
      eyebrow="Platform operations"
      title="Incidents"
      description="Record unplanned service incidents, operator updates, and tenant-visible communications without confusing application records with proof of external service health or customer recovery."
      meta={<><OperationalWorkspaceMetaPill>{data?.generated_at ? `Snapshot ${formatDateTime(data.generated_at)}` : 'Incident registry'}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{canWrite ? 'Write enabled' : 'Read only'}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{data?.pagination ? `${data.pagination.total} matching` : 'Registry evidence'}</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-incidents__hero-aside"><OperationalWorkspaceStatus value={heroStatus} label="Current incident evidence" /><button type="button" className="app-button app-button--secondary" onClick={() => void refresh()} disabled={incidentsQuery.isFetching || tenantsQuery.isFetching || selectedIncidentQuery.isFetching}>{incidentsQuery.isFetching || tenantsQuery.isFetching || selectedIncidentQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button></div>}
    />

    {message ? <div className="platform-incidents__success"><span>{message}</span><button type="button" className="app-button app-button--ghost" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {requestedTenantId && !canReadTenants ? <div className="platform-incidents__warning"><strong>Tenant filter restricted.</strong><span>TENANTS_READ is required before a tenant can be selected or identified. The requested tenant filter was not sent to the API.</span></div> : null}
    {refreshError ? <div className="platform-incidents__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(incidentsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void incidentsQuery.refetch()}>Retry</button></div> : null}
    {incidentsQuery.isPlaceholderData && incidentsQuery.isFetching && !refreshError ? <div className="platform-incidents__warning"><strong>Updating incident filters.</strong><span>Showing the previous successful snapshot until the new filtered registry arrives.</span></div> : null}
    {data && data.omitted_sources.length ? <div className="platform-incidents__warning"><strong>Protected identity evidence is partial.</strong><span>Restricted sources: {data.omitted_sources.join(', ')}. Incident counts remain incident-registry evidence; hidden tenant/operator identity is not converted to fake “not recorded” evidence.</span></div> : null}
    {tenantsQuery.isError && canReadTenants ? <div className="platform-incidents__warning"><strong>Tenant directory unavailable.</strong><span>Incident registry evidence remains available, but tenant filtering and tenant-specific creation are incomplete until the directory reloads.</span></div> : null}

    <OperationalWorkspaceStats ariaLabel="Incident registry summary">
      <OperationalWorkspaceStatCard label="Open" value={data ? summary?.open ?? 0 : '—'} helper="All matching non-terminal incidents" tone={(summary?.open || 0) > 0 ? 'warn' : 'good'} iconPath="/platform/incidents" loading={incidentsQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Critical open" value={data ? summary?.critical_open ?? 0 : '—'} helper="Critical incidents still active" tone={(summary?.critical_open || 0) > 0 ? 'danger' : 'good'} iconPath="/platform/incidents" loading={incidentsQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Platform open" value={data ? summary?.platform_open ?? 0 : '—'} helper="Platform-wide active incidents" tone="neutral" iconPath="/platform/incidents" loading={incidentsQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Tenant open" value={data ? summary?.tenant_open ?? 0 : '—'} helper="Tenant-scoped active incidents" tone="neutral" iconPath="/platform/tenants" loading={incidentsQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Resolved" value={data ? summary?.resolved ?? 0 : '—'} helper="Matching resolved history" tone="good" iconPath="/platform/incidents" loading={incidentsQuery.isLoading && !data} />
    </OperationalWorkspaceStats>

    {canWrite ? <section className="platform-incidents__section" id="platform-incidents-create">
      <OperationalSectionHeader iconPath="/platform/incidents" title="Create incident" description="New incidents always begin in Investigating. Incident title and Public message are tenant-visible while an open incident affects that tenant; Internal summary and Internal notes are never returned by tenant incident context." />
      <div className="app-panel app-panel--padded platform-incidents__form-grid">
        <label className="platform-incidents__span-2">Incident title <small>Tenant-visible while the incident is open.</small><input value={form.title} maxLength={250} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Short operational title" /></label>
        <label>Severity<select value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))}><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option></select></label>
        <label>Impact<select value={form.impact} onChange={(event) => setForm((current) => ({ ...current, impact: event.target.value }))}><option value="none">None</option><option value="degraded">Degraded</option><option value="partial_outage">Partial outage</option><option value="major_outage">Major outage</option></select></label>
        <label>Scope<select value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value as 'platform' | 'tenant', tenant_id: '' }))}><option value="platform">Platform-wide</option>{canReadTenants ? <option value="tenant">Tenant-specific</option> : null}</select></label>
        {form.scope === 'tenant' && canReadTenants ? <label>Tenant<select value={form.tenant_id} onChange={(event) => setForm((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Select tenant</option>{(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : null}
        <label>Started at<input type="datetime-local" value={form.started_at} onChange={(event) => setForm((current) => ({ ...current, started_at: event.target.value }))} /></label>
        <label className="platform-incidents__span-2">Internal summary <small>Platform operators only.</small><textarea value={form.summary} maxLength={4000} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} /></label>
        <label className="platform-incidents__span-2">Public message <small>Shown to affected tenant users while the incident is open.</small><textarea value={form.public_message} maxLength={4000} onChange={(event) => setForm((current) => ({ ...current, public_message: event.target.value }))} /></label>
        <label className="platform-incidents__span-2">Internal notes <small>Platform operators only.</small><textarea value={form.internal_notes} maxLength={4000} onChange={(event) => setForm((current) => ({ ...current, internal_notes: event.target.value }))} /></label>
        <label className="platform-incidents__span-2">Initial timeline update <small>Optional. It remains internal unless the checkbox below is explicitly selected.</small><textarea value={form.initial_update} maxLength={4000} onChange={(event) => setForm((current) => ({ ...current, initial_update: event.target.value }))} /></label>
        <label className="platform-incidents__checkbox platform-incidents__span-2"><input type="checkbox" checked={form.initial_update_public} onChange={(event) => setForm((current) => ({ ...current, initial_update_public: event.target.checked }))} /> Make the initial timeline update visible to affected tenant users</label>
        {createTenantInvalid ? <div className="platform-incidents__validation">Select a tenant before creating a tenant-scoped incident.</div> : null}
        {createStartedInvalid ? <div className="platform-incidents__validation">Started at must be a valid date and time.</div> : null}
        <div className="platform-incidents__actions platform-incidents__span-all"><button type="button" className="app-button app-button--primary" disabled={createDisabled} onClick={() => createMutation.mutate()}>{createMutation.isPending ? 'Creating…' : 'Create incident'}</button></div>
      </div>
    </section> : null}

    <section className="platform-incidents__section">
      <OperationalSectionHeader iconPath="/platform/incidents" title="Incident registry" description="Search and filters apply server-side. KPI counts describe the full filtered registry, not only the loaded page." />
      <div className="app-panel app-panel--padded platform-incidents__filters">
        <label className="platform-incidents__search">Search<input value={search} onChange={(event) => updateParams({ search: event.target.value || null })} placeholder={canReadTenants ? 'Title, incident text, public message, tenant…' : 'Title, incident text, public message…'} /></label>
        <label>Status<select value={status} onChange={(event) => updateParams({ status: event.target.value || null })}><option value="">All statuses</option><option value="investigating">Investigating</option><option value="identified">Identified</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option><option value="cancelled">Cancelled</option></select></label>
        <label>Severity<select value={severity} onChange={(event) => updateParams({ severity: event.target.value || null })}><option value="">All severities</option><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option></select></label>
        <label>Scope<select value={scope} onChange={(event) => updateParams({ scope: event.target.value || null })}><option value="">All scopes</option><option value="platform">Platform-wide</option><option value="tenant">Tenant-specific</option></select></label>
        {canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateParams({ tenant_id: event.target.value || null, scope: event.target.value ? 'tenant' : scope || null })}><option value="">All tenants</option>{(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : null}
        <label>Visibility<select value={includeResolved ? 'true' : 'false'} onChange={(event) => updateParams({ include_resolved: event.target.value === 'true' ? 'true' : null })}><option value="false">Open only</option><option value="true">Include closed</option></select></label>
      </div>

      {initialError ? <div className="platform-incidents__blocking-error"><strong>Incident registry unavailable</strong><span>{readableError(incidentsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void incidentsQuery.refetch()}>Retry</button></div> : null}
      {incidentsQuery.isLoading && !data ? <div className="platform-incidents__loading">Loading incident evidence…</div> : null}
      {data ? <div className="platform-incidents__list">
        {rows.map((incident) => <article key={incident.id} className="platform-incidents__card">
          <div className="platform-incidents__card-header"><div><h4>{incident.title}</h4><p>{incident.scope === 'platform' ? 'Platform-wide' : canReadTenants ? `Tenant: ${incident.tenant_name || 'Tenant record unavailable'}` : 'Tenant-specific · identity restricted'}</p></div><div className="platform-incidents__badges"><span data-tone={isClosed(incident.status) ? 'neutral' : 'warn'}>{pretty(incident.status)}</span><span data-tone={incident.severity === 'critical' ? 'danger' : incident.severity === 'major' ? 'warn' : 'neutral'}>{pretty(incident.severity)}</span><span>{pretty(incident.impact)}</span></div></div>
          {incident.summary ? <p className="platform-incidents__summary"><strong>Internal summary:</strong> {incident.summary}</p> : null}
          <div className="platform-incidents__metrics-grid"><div><span>Started</span><strong>{formatDateTime(incident.started_at)}</strong></div><div><span>Last update</span><strong>{formatDateTime(incident.last_update_at)}</strong></div><div><span>Timeline entries</span><strong>{incident.update_count ?? 0}</strong></div></div>
          <div className="platform-incidents__card-footer"><div className="platform-incidents__source-links">{canReadAudit ? <Link to={`/platform/audit?target_id=${encodeURIComponent(incident.id)}`}>Audit</Link> : null}{canReadTenants && incident.tenant_id ? <Link to={`/platform/tenant-timeline?tenant_id=${encodeURIComponent(incident.tenant_id)}&source=incident`}>Tenant timeline</Link> : null}</div><button type="button" className="app-button app-button--secondary" onClick={() => { setSelectedIncidentId(incident.id); setEditing(null); setEditForm(null); }}>Open detail</button></div>
        </article>)}
        {!rows.length ? <div className="platform-incidents__empty"><strong>No incidents match the current filters.</strong><span>Change filters or create a new incident if an unplanned operational event needs to be recorded.</span></div> : null}
      </div> : null}
      {data ? <div className="platform-incidents__pagination"><button type="button" className="app-button app-button--secondary" disabled={offset <= 0 || incidentsQuery.isFetching} onClick={() => updateParams({ offset: String(Math.max(0, offset - PAGE_SIZE)) })}>Previous</button><span>{data.pagination.total ? `${offset + 1}–${Math.min(offset + rows.length, data.pagination.total)} of ${data.pagination.total}` : '0 records'}</span><button type="button" className="app-button app-button--secondary" disabled={!data.pagination.has_more || incidentsQuery.isFetching} onClick={() => updateParams({ offset: String(offset + PAGE_SIZE) })}>Next</button></div> : null}
    </section>

    <section className="platform-incidents__section">
      <OperationalSectionHeader iconPath="/platform/incidents" title="Incident detail & lifecycle" description="Ordinary Edit changes non-lifecycle details only. Resolve is recorded through an incident timeline update; Cancel is a separate reason-required terminal action." />
      {!selectedIncidentId ? <div className="platform-incidents__empty"><strong>No incident selected.</strong><span>Open an incident from the registry to inspect its timeline and lifecycle actions.</span></div> : selectedIncidentQuery.isLoading && !selected ? <div className="platform-incidents__loading">Loading selected incident…</div> : selectedIncidentQuery.isError && !selected ? <div className="platform-incidents__blocking-error"><strong>Incident detail unavailable</strong><span>{readableError(selectedIncidentQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void selectedIncidentQuery.refetch()}>Retry</button></div> : selected ? <div className="platform-incidents__detail-grid">
        <div className="app-panel app-panel--padded platform-incidents__detail">
          <div className="platform-incidents__card-header"><div><h4>{selected.title}</h4><p>{pretty(selected.status)} · {pretty(selected.severity)} · {pretty(selected.impact)}</p></div><div className="platform-incidents__badges"><span data-tone={selectedClosed ? 'neutral' : 'warn'}>{selectedClosed ? 'Terminal history' : 'Active incident'}</span></div></div>
          <div className="platform-incidents__metrics-grid"><div><span>Scope</span><strong>{selected.scope === 'platform' ? 'Platform-wide' : canReadTenants ? selected.tenant_name || 'Tenant record unavailable' : 'Tenant-specific · restricted'}</strong></div><div><span>Started</span><strong>{formatDateTime(selected.started_at)}</strong></div><div><span>Resolved</span><strong>{formatDateTime(selected.resolved_at)}</strong></div><div><span>Created by</span><strong>{identityLabel(selected.created_by_email, selected.created_by_present, canReadPlatformUsers)}</strong></div><div><span>Resolved by</span><strong>{identityLabel(selected.resolved_by_email, selected.resolved_by_present, canReadPlatformUsers)}</strong></div></div>
          {selected.public_message ? <div className="platform-incidents__public-note"><strong>Tenant-visible public message</strong><span>{selected.public_message}</span></div> : null}
          {selected.summary ? <div className="platform-incidents__internal-note"><strong>Internal summary</strong><span>{selected.summary}</span></div> : null}
          {selected.internal_notes ? <div className="platform-incidents__internal-note"><strong>Internal notes</strong><span>{selected.internal_notes}</span></div> : null}
          <div className="platform-incidents__source-links">{canReadAudit ? <Link to={`/platform/audit?target_id=${encodeURIComponent(selected.id)}`}>Audit evidence</Link> : null}{canReadTenants && selected.tenant_id ? <Link to={`/platform/tenant-timeline?tenant_id=${encodeURIComponent(selected.tenant_id)}&source=incident`}>Tenant timeline</Link> : null}{canOpenSupportCockpit && selected.tenant_id ? <Link to={`/platform/support-operations-cockpit?tenant_id=${encodeURIComponent(selected.tenant_id)}`}>Support context</Link> : null}</div>
          {canWrite && !selectedClosed ? <div className="platform-incidents__actions"><button type="button" className="app-button app-button--secondary" onClick={() => beginEdit(selected)}>Edit details</button></div> : selectedClosed ? <div className="platform-incidents__immutable">Resolved/cancelled incident details are immutable historical evidence.</div> : null}
        </div>

        <div className="app-panel app-panel--padded platform-incidents__timeline-panel">
          <h4>Timeline updates</h4>
          {(selected.updates || []).length ? <div className="platform-incidents__timeline">{(selected.updates || []).map((update) => <div key={update.id} className="platform-incidents__timeline-item"><div><strong>{pretty(update.status)}</strong><span>{formatDateTime(update.created_at)} · {update.is_public ? 'Tenant-visible' : 'Internal'}</span></div><p>{update.message}</p><small>Actor: {identityLabel(update.created_by_email, update.created_by_present, canReadPlatformUsers)}</small></div>)}</div> : <div className="platform-incidents__empty"><strong>No timeline updates.</strong><span>The incident registry has no update rows for this incident.</span></div>}
          {canWrite && !selectedClosed ? <div className="platform-incidents__lifecycle-box"><h4>Add timeline update</h4><label>Status<select value={updateForm.status} onChange={(event) => setUpdateForm((current) => ({ ...current, status: event.target.value }))}><option value="investigating">Investigating</option><option value="identified">Identified</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option></select></label><label>Update message<textarea value={updateForm.message} maxLength={4000} onChange={(event) => setUpdateForm((current) => ({ ...current, message: event.target.value }))} /></label><label className="platform-incidents__checkbox"><input type="checkbox" checked={updateForm.is_public} onChange={(event) => setUpdateForm((current) => ({ ...current, is_public: event.target.checked }))} /> Make this update visible to affected tenant users</label><button type="button" className="app-button app-button--primary" disabled={updateDisabled} onClick={() => { if (updateForm.status !== 'resolved' || window.confirm('Resolve this incident? Resolution makes incident history terminal.')) addUpdateMutation.mutate(); }}>{addUpdateMutation.isPending ? 'Recording…' : updateForm.status === 'resolved' ? 'Resolve incident' : 'Add update'}</button><div className="platform-incidents__cancel-box"><label>Cancellation reason<input value={cancelReason} maxLength={2000} onChange={(event) => setCancelReason(event.target.value)} placeholder="Required reason" /></label><button type="button" className="app-button app-button--danger" disabled={cancelDisabled} onClick={() => { if (window.confirm('Cancel this incident? Cancellation is terminal and the reason is recorded internally.')) cancelMutation.mutate(); }}>{cancelMutation.isPending ? 'Cancelling…' : 'Cancel incident'}</button></div></div> : null}
        </div>
      </div> : null}

      {editing && editForm ? <div className="app-panel app-panel--padded platform-incidents__edit-panel"><OperationalSectionHeader iconPath="/platform/incidents" title={`Edit details · ${editing.title}`} description="Lifecycle status, scope, tenant linkage and start/resolution history cannot be changed here." /><div className="platform-incidents__form-grid"><label className="platform-incidents__span-2">Title<input value={editForm.title} maxLength={250} onChange={(event) => setEditForm((current) => current ? { ...current, title: event.target.value } : current)} /></label><label>Severity<select value={editForm.severity} onChange={(event) => setEditForm((current) => current ? { ...current, severity: event.target.value } : current)}><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option></select></label><label>Impact<select value={editForm.impact} onChange={(event) => setEditForm((current) => current ? { ...current, impact: event.target.value } : current)}><option value="none">None</option><option value="degraded">Degraded</option><option value="partial_outage">Partial outage</option><option value="major_outage">Major outage</option></select></label><label className="platform-incidents__span-2">Internal summary<textarea value={editForm.summary} maxLength={4000} onChange={(event) => setEditForm((current) => current ? { ...current, summary: event.target.value } : current)} /></label><label className="platform-incidents__span-2">Public message<textarea value={editForm.public_message} maxLength={4000} onChange={(event) => setEditForm((current) => current ? { ...current, public_message: event.target.value } : current)} /></label><label className="platform-incidents__span-2">Internal notes<textarea value={editForm.internal_notes} maxLength={4000} onChange={(event) => setEditForm((current) => current ? { ...current, internal_notes: event.target.value } : current)} /></label><div className="platform-incidents__actions platform-incidents__span-all"><button type="button" className="app-button app-button--primary" disabled={editDisabled} onClick={() => editMutation.mutate()}>{editMutation.isPending ? 'Saving…' : 'Save changes'}</button><button type="button" className="app-button app-button--secondary" disabled={editMutation.isPending} onClick={() => { setEditing(null); setEditForm(null); }}>Cancel edit</button></div></div></div> : null}
    </section>

    {mutationError ? <div className="platform-incidents__blocking-error"><strong>Incident action failed</strong><span>{readableError(mutationError)}</span></div> : null}

    <section className="platform-incidents__section">
      <OperationalSectionHeader iconPath="/platform/incidents" title="Evidence boundary" description="Incident records are operational application evidence, not an external monitoring certificate." />
      <div className="platform-incidents__truth-note"><strong>Recorded incident state does not prove the external service state.</strong><span>Investigating/identified/monitoring/resolved/cancelled are operator-recorded application states. “Resolved” does not prove customer recovery, root-cause completion, SLA satisfaction, or external service restoration. Tenant incident context receives only the tenant-visible title/public message and updates explicitly marked public; internal summaries, notes, metadata and Platform-user identities are excluded.</span></div>
      <div className="platform-incidents__supporting-links">{canReadMaintenance ? <Link to="/platform/maintenance">Maintenance</Link> : null}{canReadAnnouncements ? <Link to="/platform/announcements">Announcements</Link> : null}{canReadJobs ? <Link to="/platform/operational-jobs">Operational jobs</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}{canOpenSupportCockpit ? <Link to="/platform/support-operations-cockpit">Support cockpit</Link> : null}</div>
    </section>
  </div>;
}
