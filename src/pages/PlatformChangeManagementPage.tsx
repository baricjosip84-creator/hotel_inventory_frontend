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
import './PlatformChangeManagementPage.css';

type Tenant = { id: string; name: string };
type MaintenanceWindow = { id: string; title: string; scope: 'platform' | 'tenant'; tenant_id?: string | null; status: string };
type Runbook = { id: string; title: string; is_active: boolean };
type EvidenceAccess = { tenant: boolean; maintenance: boolean; runbook: boolean; platform_user_identity: boolean };
type ChangeRequest = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  risk_level: string;
  status: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  maintenance_window_id?: string | null;
  maintenance_window_title?: string | null;
  runbook_id?: string | null;
  runbook_title?: string | null;
  requested_by_email?: string | null;
  approved_by_email?: string | null;
  rejected_by_email?: string | null;
  cancelled_by_email?: string | null;
  executed_by_email?: string | null;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  approval_reason?: string | null;
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  execution_notes?: string | null;
  created_at: string;
  evidence_access?: EvidenceAccess;
};
type ChangeResponse = { change_requests: ChangeRequest[]; evidence_access: EvidenceAccess; pagination: { limit: number; offset: number; has_more: boolean } };
type SummaryResponse = {
  pending_approval: number;
  open_high_risk: number;
  by_status: Array<{ status: string; count: number }>;
  open_by_risk: Array<{ risk_level: string; count: number }>;
};
type RunbookResponse = { runbooks: Runbook[] };
type DraftState = {
  title: string;
  description: string;
  category: string;
  risk_level: string;
  tenant_id: string;
  maintenance_window_id: string;
  runbook_id: string;
  planned_start_at: string;
  planned_end_at: string;
};

const PAGE_SIZE = 50;
const categories = ['maintenance', 'billing', 'entitlement', 'security', 'migration', 'operational', 'support'] as const;
const risks = ['low', 'medium', 'high', 'critical'] as const;
const statuses = ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled', 'executed'] as const;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emptyDraft = (): DraftState => ({ title: '', description: '', category: 'operational', risk_level: 'medium', tenant_id: '', maintenance_window_id: '', runbook_id: '', planned_start_at: '', planned_end_at: '' });

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}
function humanize(value: string | null | undefined) {
  const text = String(value || '').replaceAll('_', ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not recorded';
}
function dateTime(value: string | null | undefined) {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}
function toLocalDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function changeToDraft(change: ChangeRequest): DraftState {
  return {
    title: change.title || '',
    description: change.description || '',
    category: change.category || 'operational',
    risk_level: change.risk_level || 'medium',
    tenant_id: change.tenant_id || '',
    maintenance_window_id: change.maintenance_window_id || '',
    runbook_id: change.runbook_id || '',
    planned_start_at: toLocalDateTimeInput(change.planned_start_at),
    planned_end_at: toLocalDateTimeInput(change.planned_end_at)
  };
}
function statusTone(status: string) {
  if (status === 'approved' || status === 'executed') return 'good';
  if (status === 'pending_approval') return 'warn';
  if (status === 'rejected' || status === 'cancelled') return 'danger';
  return 'neutral';
}
function riskTone(risk: string) {
  if (risk === 'critical') return 'danger';
  if (risk === 'high') return 'warn';
  return 'neutral';
}

export default function PlatformChangeManagementPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_WRITE);
  const canApprove = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_APPROVE);
  const canExecute = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_EXECUTE);
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadMaintenance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ);
  const canReadRunbooks = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadReleases = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ);

  const requestedStatus = searchParams.get('status') || '';
  const requestedCategory = searchParams.get('category') || '';
  const requestedRisk = searchParams.get('risk_level') || '';
  const requestedTenant = searchParams.get('tenant_id') || '';
  const requestedSearch = searchParams.get('search') || '';
  const status = statuses.includes(requestedStatus as typeof statuses[number]) ? requestedStatus : '';
  const category = categories.includes(requestedCategory as typeof categories[number]) ? requestedCategory : '';
  const risk = risks.includes(requestedRisk as typeof risks[number]) ? requestedRisk : '';
  const tenantId = canReadTenants && uuidPattern.test(requestedTenant) ? requestedTenant : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const invalidFilters = Boolean(
    (requestedStatus && !status) ||
    (requestedCategory && !category) ||
    (requestedRisk && !risk) ||
    (requestedTenant && !tenantId) ||
    (requestedSearch && !search)
  );

  const [offset, setOffset] = useState(0);
  const [draft, setDraft] = useState<DraftState>(() => emptyDraft());
  const [editingId, setEditingId] = useState('');
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => { setOffset(0); }, [status, category, risk, tenantId, search, invalidFilters]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'change-management-selector'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canReadTenants,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const maintenance = useQuery({
    queryKey: ['platform', 'maintenance', 'change-management-selector'],
    queryFn: () => platformApiRequest<MaintenanceWindow[]>('/platform/maintenance?limit=200&include_past=true'),
    enabled: canWrite && canReadMaintenance,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const runbooks = useQuery({
    queryKey: ['platform', 'runbooks', 'change-management-selector'],
    queryFn: () => platformApiRequest<RunbookResponse>('/platform/runbooks?active=true&limit=200&offset=0'),
    enabled: canWrite && canReadRunbooks,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const summary = useQuery({
    queryKey: ['platform', 'change-management', 'summary'],
    queryFn: () => platformApiRequest<SummaryResponse>('/platform/change-management/summary'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const changes = useQuery({
    queryKey: ['platform', 'change-management', 'list', status, category, risk, tenantId, search, offset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (risk) params.set('risk_level', risk);
      if (tenantId) params.set('tenant_id', tenantId);
      if (search.trim()) params.set('search', search.trim());
      return platformApiRequest<ChangeResponse>(`/platform/change-management?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const maintenanceOptions = useMemo(() => (maintenance.data || []).filter((window) => window.scope === 'platform' || Boolean(draft.tenant_id && window.tenant_id === draft.tenant_id)), [maintenance.data, draft.tenant_id]);
  const executedCount = summary.data?.by_status.find((item) => item.status === 'executed')?.count || 0;
  const openCount = (summary.data?.by_status || []).filter((item) => ['draft', 'pending_approval', 'approved'].includes(item.status)).reduce((sum, item) => sum + item.count, 0);
  const initialChangesError = changes.isError && changes.data === undefined;
  const refreshChangesError = changes.isError && changes.data !== undefined;
  const initialSummaryError = summary.isError && summary.data === undefined;
  const refreshSummaryError = summary.isError && summary.data !== undefined;
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;

  const updateFilter = (key: 'status' | 'category' | 'risk_level' | 'tenant_id' | 'search', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    for (const key of ['status', 'category', 'risk_level', 'tenant_id', 'search']) next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const resetForm = () => {
    setDraft(emptyDraft());
    setEditingId('');
    setFormError('');
  };
  const payloadFromDraft = () => {
    const payload: Record<string, unknown> = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      category: draft.category,
      risk_level: draft.risk_level,
      planned_start_at: toIsoOrNull(draft.planned_start_at),
      planned_end_at: toIsoOrNull(draft.planned_end_at)
    };
    if (canReadTenants) payload.tenant_id = draft.tenant_id || null;
    if (canReadMaintenance) payload.maintenance_window_id = draft.maintenance_window_id || null;
    if (canReadRunbooks) payload.runbook_id = draft.runbook_id || null;
    return payload;
  };
  const refreshAll = async () => {
    const work: Array<Promise<unknown>> = [changes.refetch(), summary.refetch()];
    if (canReadTenants) work.push(tenants.refetch());
    if (canWrite && canReadMaintenance) work.push(maintenance.refetch());
    if (canWrite && canReadRunbooks) work.push(runbooks.refetch());
    await Promise.all(work);
  };
  const invalidateChangeData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platform', 'change-management'] }),
      queryClient.invalidateQueries({ queryKey: ['platform', 'releases'] })
    ]);
  };

  const createChange = useMutation({
    mutationFn: ({ submit }: { submit: boolean }) => platformApiRequest<ChangeRequest>('/platform/change-management', {
      method: 'POST',
      body: JSON.stringify({ ...payloadFromDraft(), submit_for_approval: submit })
    }),
    onSuccess: async (change) => {
      setMessage(change.status === 'pending_approval' ? 'Change request submitted for approval.' : 'Change draft saved.');
      resetForm();
      await invalidateChangeData();
    }
  });
  const updateChange = useMutation({
    mutationFn: ({ id, submit, directSubmit = false }: { id: string; submit: boolean; directSubmit?: boolean }) => platformApiRequest<ChangeRequest>(`/platform/change-management/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(directSubmit ? { submit_for_approval: true } : { ...payloadFromDraft(), ...(submit ? { submit_for_approval: true } : {}) })
    }),
    onSuccess: async (change) => {
      setMessage(change.status === 'pending_approval' ? 'Change request is pending approval.' : 'Change request updated.');
      resetForm();
      await invalidateChangeData();
    }
  });
  const actionChange = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' | 'cancel' | 'execute' }) => platformApiRequest<ChangeRequest>(`/platform/change-management/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify(action === 'execute' ? { notes: actionNotes[id]?.trim() || null } : { reason: actionNotes[id]?.trim() || null })
    }),
    onSuccess: async (change) => {
      setMessage(`Change request recorded as ${humanize(change.status).toLowerCase()}.`);
      setActionNotes((current) => ({ ...current, [change.id]: '' }));
      await invalidateChangeData();
    }
  });

  const mutating = createChange.isPending || updateChange.isPending || actionChange.isPending;

  const submitForm = (submit: boolean) => {
    if (!draft.title.trim()) return setFormError('Title is required.');
    const start = draft.planned_start_at ? new Date(draft.planned_start_at).getTime() : null;
    const end = draft.planned_end_at ? new Date(draft.planned_end_at).getTime() : null;
    if ((start !== null && Number.isNaN(start)) || (end !== null && Number.isNaN(end))) return setFormError('Planned times are invalid.');
    if (start !== null && end !== null && end <= start) return setFormError('Planned end must be after planned start.');
    setFormError('');
    setMessage('');
    if (editingId) updateChange.mutate({ id: editingId, submit }); else createChange.mutate({ submit });
  };
  const startEdit = (change: ChangeRequest) => {
    setDraft(changeToDraft(change));
    setEditingId(change.id);
    setFormError('');
    setMessage(`Editing ${change.title}.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const actionError = createChange.error || updateChange.error || actionChange.error;
  const heroStatus = invalidFilters ? 'Filter invalid' : initialChangesError ? 'Unavailable' : refreshChangesError ? 'Stale snapshot' : 'Governed changes';
  const heroLabel = invalidFilters ? 'Clear invalid URL filters' : initialChangesError ? 'Retry required' : refreshChangesError ? 'Last successful data retained' : 'Approval-controlled application records';
  const access = changes.data?.evidence_access || { tenant: canReadTenants, maintenance: canReadMaintenance, runbook: canReadRunbooks, platform_user_identity: canReadPlatformUsers };

  return (
    <div className="platform-change-management">
      <OperationalWorkspaceHero
        iconPath="/platform/change-management"
        eyebrow="Platform operations"
        title="Change management"
        description="Govern platform change requests from draft through approval, cancellation and execution recording. Application execution ≠ external outcome. An executed record means the Platform change workflow was marked executed; it does not prove a maintenance task, deployment, runbook, customer communication or external system outcome occurred successfully."
        meta={<>
          <OperationalWorkspaceMetaPill>Permission · PLATFORM_CHANGES_READ</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Linked evidence · permission scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Page size · {PAGE_SIZE}</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-change-management__hero-aside">
          <OperationalWorkspaceStatus value={heroStatus} label={heroLabel} />
          <div className="platform-change-management__refresh-block">
            <button type="button" className="app-button app-button--secondary" onClick={() => void refreshAll()} disabled={changes.isFetching || summary.isFetching || invalidFilters}>{changes.isFetching || summary.isFetching ? 'Refreshing…' : 'Refresh'}</button>
            <span>Server pagination · deterministic newest-first ordering</span>
          </div>
        </div>}
      />

      {refreshChangesError || refreshSummaryError ? <div className="platform-change-management__warning">Showing the last successful Change Management snapshot. Refresh failed: {readableError(changes.error || summary.error)}</div> : null}
      {message ? <div className="platform-change-management__success">{message}</div> : null}
      {actionError ? <div className="platform-change-management__warning">Action failed: {readableError(actionError)}</div> : null}

      <OperationalWorkspaceStats ariaLabel="Change management summary">
        <OperationalWorkspaceStatCard label="Open changes" value={openCount} helper="Draft + pending + approved" loading={summary.isLoading && !summary.data} />
        <OperationalWorkspaceStatCard label="Pending approval" value={summary.data?.pending_approval || 0} helper="Awaiting independent approval" tone={(summary.data?.pending_approval || 0) > 0 ? 'warn' : 'neutral'} loading={summary.isLoading && !summary.data} />
        <OperationalWorkspaceStatCard label="Open high risk" value={summary.data?.open_high_risk || 0} helper="High + critical open records" tone={(summary.data?.open_high_risk || 0) > 0 ? 'danger' : 'neutral'} loading={summary.isLoading && !summary.data} />
        <OperationalWorkspaceStatCard label="Executed records" value={executedCount} helper="Application workflow records only" loading={summary.isLoading && !summary.data} />
      </OperationalWorkspaceStats>

      {initialSummaryError ? <div className="platform-change-management__warning">Summary unavailable: {readableError(summary.error)}. The registry can still be used if it loaded successfully.</div> : null}

      <section className="io-workspace-panel platform-change-management__section">
        <OperationalSectionHeader iconPath="/platform/change-management" title="Evidence boundary" description="Change records are readable with PLATFORM_CHANGES_READ; linked source identities are returned only when their own read permission is present." />
        <div className="platform-change-management__evidence-grid">
          <div data-state={access.tenant ? 'available' : 'restricted'}><span>Tenant evidence</span><strong>{access.tenant ? 'Available' : 'Redacted'}</strong><small>TENANTS_READ</small></div>
          <div data-state={access.maintenance ? 'available' : 'restricted'}><span>Maintenance evidence</span><strong>{access.maintenance ? 'Available' : 'Redacted'}</strong><small>PLATFORM_MAINTENANCE_READ</small></div>
          <div data-state={access.runbook ? 'available' : 'restricted'}><span>Runbook evidence</span><strong>{access.runbook ? 'Available' : 'Redacted'}</strong><small>PLATFORM_RUNBOOKS_READ</small></div>
          <div data-state={access.platform_user_identity ? 'available' : 'restricted'}><span>Operator identity</span><strong>{access.platform_user_identity ? 'Available' : 'Redacted'}</strong><small>PLATFORM_USERS_READ</small></div>
        </div>
        <div className="platform-change-management__truth-note"><strong>Truth boundary</strong>Approval, rejection, cancellation and execution are application governance states. They are not external deployment, customer acceptance, maintenance-success or runbook-completion evidence.</div>
      </section>

      {canWrite ? <section className="io-workspace-panel platform-change-management__section">
        <OperationalSectionHeader iconPath="/platform/change-management" title={editingId ? 'Edit change request' : 'Prepare change request'} description="High and critical drafts automatically enter pending approval. Linked tenant, maintenance and runbook evidence can only be changed when the corresponding read permission is available." actions={editingId ? <button type="button" className="app-button app-button--secondary" onClick={resetForm} disabled={mutating}>Cancel edit</button> : undefined} />
        <div className="platform-change-management__form-grid">
          <label>Title<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={200} /></label>
          <label>Category<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label>Risk level<select value={draft.risk_level} onChange={(event) => setDraft((current) => ({ ...current, risk_level: event.target.value }))}>{risks.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          {canReadTenants ? <label>Tenant<select value={draft.tenant_id} onChange={(event) => setDraft((current) => ({ ...current, tenant_id: event.target.value, maintenance_window_id: '' }))}><option value="">Platform-wide / none</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-change-management__restricted-field"><span>Tenant link</span><strong>Restricted</strong><small>TENANTS_READ required</small></div>}
          {canReadMaintenance ? <label>Maintenance window<select value={draft.maintenance_window_id} onChange={(event) => setDraft((current) => ({ ...current, maintenance_window_id: event.target.value }))}><option value="">No linked maintenance</option>{maintenanceOptions.map((window) => <option key={window.id} value={window.id}>{window.title} · {humanize(window.status)}</option>)}</select></label> : <div className="platform-change-management__restricted-field"><span>Maintenance link</span><strong>Restricted</strong><small>PLATFORM_MAINTENANCE_READ required</small></div>}
          {canReadRunbooks ? <label>Runbook<select value={draft.runbook_id} onChange={(event) => setDraft((current) => ({ ...current, runbook_id: event.target.value }))}><option value="">No linked runbook</option>{(runbooks.data?.runbooks || []).map((runbook) => <option key={runbook.id} value={runbook.id}>{runbook.title}</option>)}</select></label> : <div className="platform-change-management__restricted-field"><span>Runbook link</span><strong>Restricted</strong><small>PLATFORM_RUNBOOKS_READ required</small></div>}
          <label>Planned start<input type="datetime-local" value={draft.planned_start_at} onChange={(event) => setDraft((current) => ({ ...current, planned_start_at: event.target.value }))} /></label>
          <label>Planned end<input type="datetime-local" value={draft.planned_end_at} onChange={(event) => setDraft((current) => ({ ...current, planned_end_at: event.target.value }))} /></label>
          <label className="platform-change-management__span-two">Description<textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} maxLength={5000} /></label>
        </div>
        {formError ? <div className="platform-change-management__warning">{formError}</div> : null}
        <div className="platform-change-management__actions">
          <button type="button" className="app-button app-button--secondary" onClick={() => submitForm(false)} disabled={mutating || !draft.title.trim()}>{editingId ? 'Save changes' : 'Save draft'}</button>
          {(!editingId || changes.data?.change_requests.find((change) => change.id === editingId)?.status === 'draft') ? <button type="button" className="app-button" onClick={() => submitForm(true)} disabled={mutating || !draft.title.trim()}>Submit for approval</button> : null}
        </div>
      </section> : null}

      <section className="io-workspace-panel platform-change-management__section">
        <OperationalSectionHeader iconPath="/platform/change-management" title="Change registry" description="Filter and review application change-governance records. Tenant filtering is available only with TENANTS_READ." />
        <div className="platform-change-management__filter-grid">
          <label>Status<select value={status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label>Category<select value={category} onChange={(event) => updateFilter('category', event.target.value)}><option value="">All categories</option>{categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          <label>Risk<select value={risk} onChange={(event) => updateFilter('risk_level', event.target.value)}><option value="">All risk levels</option>{risks.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
          {canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-change-management__restricted-filter">Tenant filter restricted · TENANTS_READ required</div>}
          <label>Search<input value={search} onChange={(event) => updateFilter('search', event.target.value)} placeholder="Title or description" maxLength={200} /></label>
        </div>

        {invalidFilters ? <div className="platform-change-management__blocking-error"><strong>Invalid or unauthorized URL filter</strong><span>Clear the invalid filter before loading Change Management data.</span><button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button></div> : null}
        {initialChangesError ? <div className="platform-change-management__blocking-error"><strong>Change registry unavailable</strong><span>{readableError(changes.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void changes.refetch()}>Retry</button></div> : null}
        {changes.isLoading && !changes.data ? <div className="platform-change-management__loading">Loading change requests…</div> : null}

        {changes.data?.change_requests.length ? <div className="platform-change-management__list">
          {changes.data.change_requests.map((change) => <article className="platform-change-management__card" key={change.id}>
            <div className="platform-change-management__card-header">
              <div><h4>{change.title}</h4><p>{change.description || 'No description recorded.'}</p></div>
              <div className="platform-change-management__badges"><span data-tone={statusTone(change.status)}>{humanize(change.status)}</span><span data-tone={riskTone(change.risk_level)}>{humanize(change.risk_level)} risk</span></div>
            </div>
            <div className="platform-change-management__metrics-grid">
              <div><span>Category</span><strong>{humanize(change.category)}</strong></div>
              <div><span>Tenant</span><strong>{access.tenant ? (change.tenant_name || 'Platform-wide') : 'Redacted'}</strong></div>
              <div><span>Requested by</span><strong>{access.platform_user_identity ? (change.requested_by_email || 'Not recorded') : 'Redacted'}</strong></div>
              <div><span>Created</span><strong>{dateTime(change.created_at)}</strong></div>
              <div><span>Planned start</span><strong>{dateTime(change.planned_start_at)}</strong></div>
              <div><span>Planned end</span><strong>{dateTime(change.planned_end_at)}</strong></div>
              <div><span>Maintenance</span><strong>{access.maintenance ? (change.maintenance_window_title || 'Not linked') : 'Redacted'}</strong></div>
              <div><span>Runbook</span><strong>{access.runbook ? (change.runbook_title || 'Not linked') : 'Redacted'}</strong></div>
            </div>
            <div className="platform-change-management__decision-grid">
              {change.approval_reason ? <div><span>Approval reason</span><strong>{change.approval_reason}</strong></div> : null}
              {change.rejection_reason ? <div><span>Rejection reason</span><strong>{change.rejection_reason}</strong></div> : null}
              {change.cancellation_reason ? <div><span>Cancellation reason</span><strong>{change.cancellation_reason}</strong></div> : null}
              {change.execution_notes ? <div><span>Execution notes</span><strong>{change.execution_notes}</strong></div> : null}
            </div>
            <div className="platform-change-management__source-links">
              {canReadAudit ? <Link to={`/platform/audit?target_type=platform_change_requests&target_id=${encodeURIComponent(change.id)}`}>Audit evidence</Link> : null}
              {canReadTenants && change.tenant_id ? <Link to={`/platform/tenants?tenant_id=${encodeURIComponent(change.tenant_id)}`}>Tenant source</Link> : null}
              {canReadMaintenance && change.maintenance_window_id ? <Link to="/platform/maintenance">Maintenance source</Link> : null}
              {canReadRunbooks && change.runbook_id ? <Link to="/platform/runbooks">Runbook source</Link> : null}
            </div>
            {(canApprove && change.status === 'pending_approval') || (canExecute && change.status === 'approved') || (canWrite && ['draft', 'pending_approval', 'approved'].includes(change.status)) ? <label className="platform-change-management__action-note">Reason / execution note<input value={actionNotes[change.id] || ''} onChange={(event) => setActionNotes((current) => ({ ...current, [change.id]: event.target.value }))} maxLength={5000} placeholder="Optional note for the next action" /></label> : null}
            <div className="platform-change-management__actions">
              {canWrite && ['draft', 'pending_approval'].includes(change.status) ? <button type="button" className="app-button app-button--secondary" onClick={() => startEdit(change)} disabled={mutating}>Edit</button> : null}
              {canWrite && change.status === 'draft' ? <button type="button" className="app-button" onClick={() => updateChange.mutate({ id: change.id, submit: true, directSubmit: true })} disabled={mutating}>Submit for approval</button> : null}
              {canApprove && change.status === 'pending_approval' ? <button type="button" className="app-button" onClick={() => window.confirm('Approve this change request?') && actionChange.mutate({ id: change.id, action: 'approve' })} disabled={mutating}>Approve</button> : null}
              {canApprove && change.status === 'pending_approval' ? <button type="button" className="app-button app-button--danger" onClick={() => window.confirm('Reject this change request?') && actionChange.mutate({ id: change.id, action: 'reject' })} disabled={mutating}>Reject</button> : null}
              {canExecute && change.status === 'approved' ? <button type="button" className="app-button" onClick={() => window.confirm('Record this approved change as executed in the application? This does not prove an external outcome.') && actionChange.mutate({ id: change.id, action: 'execute' })} disabled={mutating}>Mark executed</button> : null}
              {canWrite && ['draft', 'pending_approval', 'approved'].includes(change.status) ? <button type="button" className="app-button app-button--secondary" onClick={() => window.confirm('Cancel this change request?') && actionChange.mutate({ id: change.id, action: 'cancel' })} disabled={mutating}>Cancel</button> : null}
            </div>
          </article>)}
        </div> : changes.data ? <div className="platform-change-management__empty"><strong>No change requests found.</strong><span>This means no application change records matched the current filters. It does not prove no external or unrecorded change activity occurred.</span></div> : null}

        {changes.data ? <div className="platform-change-management__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || changes.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} change requests</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!changes.data.pagination.has_more || changes.isFetching}>Next</button></div> : null}
      </section>

      <section className="io-workspace-panel platform-change-management__section">
        <OperationalSectionHeader iconPath="/platform/change-management" title="Supporting operations" description="Open only destinations allowed by your current Platform permission snapshot." />
        <div className="platform-change-management__supporting-links">
          {canReadTenants ? <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link> : null}
          {canReadMaintenance ? <Link to="/platform/maintenance">Maintenance</Link> : null}
          {canReadRunbooks ? <Link to="/platform/runbooks">Runbooks</Link> : null}
          {canReadReleases ? <Link to="/platform/releases">Releases</Link> : null}
          {canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}
        </div>
      </section>
    </div>
  );
}
