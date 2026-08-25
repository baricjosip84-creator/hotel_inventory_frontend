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
import './PlatformCapacityPlanningPage.css';

type PlatformUser = { id: string; email: string; is_active?: boolean };
type Dependency = { id: string; name: string; status?: string; archived_at?: string | null; is_archived?: boolean };
type Pagination = { limit: number; offset: number; total: number; has_more: boolean };
type EvidenceAccess = { dependency_identity: boolean; platform_user_identity: boolean };
type EvidenceContract = {
  application_registry_only: boolean;
  current_usage_is_operator_recorded: boolean;
  capacity_limit_is_operator_recorded: boolean;
  projected_exhaustion_is_operator_recorded_estimate: boolean;
  no_external_infrastructure_telemetry_verified: boolean;
  status_is_application_workflow_state: boolean;
  resolved_status_does_not_prove_external_capacity_issue_resolved: boolean;
  dependency_linkage_is_application_context_only: boolean;
};
type CapacityResource = {
  id: string;
  dependency_id?: string | null;
  dependency_name?: string | null;
  dependency_present?: boolean;
  name: string;
  resource_type: string;
  environment: string;
  status: string;
  unit: string;
  current_usage: string | number;
  capacity_limit: string | number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  usage_percent?: string | number | null;
  projected_exhaustion_at?: string | null;
  owner_platform_user_id?: string | null;
  owner_email?: string | null;
  owner_present?: boolean;
  scaling_plan?: string | null;
  notes?: string | null;
  archived_at?: string | null;
  is_archived?: boolean;
  updated_at: string;
  updated_by_email?: string | null;
};
type CapacityResponse = {
  resources: CapacityResource[];
  summary: { total: number; warning: number; critical: number; exhausting_soon: number; unconfigured_limit: number; by_status: Record<string, number>; by_type: Record<string, number> };
  pagination: Pagination;
  evidence_access: EvidenceAccess;
  evidence_contract: EvidenceContract;
  resource_types: string[];
  environments: string[];
  statuses: string[];
};
type CapacityForm = {
  dependency_id: string; name: string; resource_type: string; environment: string; status: string; unit: string;
  current_usage: string; capacity_limit: string; warning_threshold_percent: string; critical_threshold_percent: string;
  projected_exhaustion_at: string; owner_platform_user_id: string; scaling_plan: string; notes: string;
};
type UsageDraft = { current_usage: string; capacity_limit: string; projected_exhaustion_at: string; status: string };

const PAGE_SIZE = 50;
const RESOURCE_TYPES = ['database', 'storage', 'compute', 'queue', 'email', 'sms', 'api', 'integration', 'support', 'other'];
const ENVIRONMENTS = ['development', 'staging', 'production', 'shared'];
const STATUSES = ['tracking', 'watch', 'scaling_needed', 'scaling_in_progress', 'resolved', 'archived'];
const MUTABLE_STATUSES = STATUSES.filter((status) => status !== 'archived');
const emptyForm = (): CapacityForm => ({
  dependency_id: '', name: '', resource_type: 'other', environment: 'production', status: 'tracking', unit: 'units', current_usage: '0', capacity_limit: '0',
  warning_threshold_percent: '75', critical_threshold_percent: '90', projected_exhaustion_at: '', owner_platform_user_id: '', scaling_plan: '', notes: ''
});

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function clean(value: string) { const text = value.trim(); return text || null; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function dateTime(value?: string | null) { if (!value) return 'Not recorded'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString(); }
function toLocalDateTimeInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value); if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function numberText(value: string | number | null | undefined) { return value === null || value === undefined || value === '' ? '0' : String(value); }
function usagePercent(resource: CapacityResource) {
  if (resource.usage_percent !== null && resource.usage_percent !== undefined) return Number(resource.usage_percent);
  const limit = Number(resource.capacity_limit || 0); if (!limit) return null;
  return Math.round((Number(resource.current_usage || 0) / limit) * 10000) / 100;
}
function statusTone(status?: string | null, percent?: number | null) {
  if (status === 'archived') return 'neutral';
  if (status === 'scaling_needed' || (percent !== null && percent !== undefined && percent >= 90)) return 'danger';
  if (status === 'watch' || status === 'scaling_in_progress' || (percent !== null && percent !== undefined && percent >= 75)) return 'warn';
  if (status === 'resolved') return 'good';
  return 'neutral';
}
function toForm(row: CapacityResource): CapacityForm {
  return {
    dependency_id: row.dependency_id || '', name: row.name || '', resource_type: row.resource_type || 'other', environment: row.environment || 'production',
    status: row.status === 'archived' ? 'tracking' : row.status || 'tracking', unit: row.unit || 'units', current_usage: numberText(row.current_usage), capacity_limit: numberText(row.capacity_limit),
    warning_threshold_percent: String(row.warning_threshold_percent || 75), critical_threshold_percent: String(row.critical_threshold_percent || 90),
    projected_exhaustion_at: toLocalDateTimeInput(row.projected_exhaustion_at), owner_platform_user_id: row.owner_platform_user_id || '', scaling_plan: row.scaling_plan || '', notes: row.notes || ''
  };
}
function usageDraft(row: CapacityResource): UsageDraft {
  return { current_usage: numberText(row.current_usage), capacity_limit: numberText(row.capacity_limit), projected_exhaustion_at: toLocalDateTimeInput(row.projected_exhaustion_at), status: '' };
}

export default function PlatformCapacityPlanningPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CAPACITY_WRITE);
  const canReadDependencies = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadRisks = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_READ);
  const canReadJobs = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const requestedStatus = searchParams.get('status') || '';
  const requestedType = searchParams.get('resource_type') || '';
  const requestedEnvironment = searchParams.get('environment') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedAttention = searchParams.get('attention_only');
  const requestedArchived = searchParams.get('include_archived') || '';
  const status = STATUSES.includes(requestedStatus) ? requestedStatus : '';
  const resourceType = RESOURCE_TYPES.includes(requestedType) ? requestedType : '';
  const environment = ENVIRONMENTS.includes(requestedEnvironment) ? requestedEnvironment : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const attentionOnly = requestedAttention === null ? true : requestedAttention === 'true';
  const includeArchived = requestedArchived === 'true';
  const invalidFilters = Boolean(
    (requestedStatus && !status) || (requestedType && !resourceType) || (requestedEnvironment && !environment) ||
    (requestedSearch && !search) || (requestedAttention !== null && !['true', 'false'].includes(requestedAttention)) ||
    (requestedArchived && !['true', 'false'].includes(requestedArchived))
  );

  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<CapacityForm>(() => emptyForm());
  const [editingId, setEditingId] = useState('');
  const [usageEditingId, setUsageEditingId] = useState('');
  const [usage, setUsage] = useState<UsageDraft>({ current_usage: '0', capacity_limit: '0', projected_exhaustion_at: '', status: '' });
  const [message, setMessage] = useState('');
  const [mutationError, setMutationError] = useState('');

  useEffect(() => { setOffset(0); }, [status, resourceType, environment, search, attentionOnly, includeArchived, invalidFilters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), attention_only: String(attentionOnly), include_archived: String(includeArchived) });
    if (status) params.set('status', status);
    if (resourceType) params.set('resource_type', resourceType);
    if (environment) params.set('environment', environment);
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [status, resourceType, environment, search, attentionOnly, includeArchived, offset]);

  const capacity = useQuery({
    queryKey: ['platform', 'capacity-planning', status, resourceType, environment, search, attentionOnly, includeArchived, offset],
    queryFn: () => platformApiRequest<CapacityResponse>(`/platform/capacity-planning?${queryString}`), enabled: !invalidFilters,
    refetchOnWindowFocus: false, staleTime: 30_000
  });
  const dependencies = useQuery({
    queryKey: ['platform', 'capacity-dependencies'], queryFn: () => platformApiRequest<{ dependencies: Dependency[] }>('/platform/service-dependencies?limit=500&include_archived=false'),
    enabled: canReadDependencies, refetchOnWindowFocus: false, staleTime: 30_000
  });
  const users = useQuery({
    queryKey: ['platform', 'capacity-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'),
    enabled: canReadUsers, refetchOnWindowFocus: false, staleTime: 30_000
  });

  const updateFilter = (key: string, value: string | boolean) => {
    const next = new URLSearchParams(searchParams);
    if (value === '' || value === false) next.delete(key); else next.set(key, String(value));
    if (key === 'attention_only' && value === false) next.set('attention_only', 'false');
    setSearchParams(next, { replace: true });
  };
  const clearFilters = () => { setSearchParams({ attention_only: 'false' }, { replace: true }); setOffset(0); };

  const thresholdWindowValid = Number.isInteger(Number(form.warning_threshold_percent)) && Number.isInteger(Number(form.critical_threshold_percent)) &&
    Number(form.warning_threshold_percent) >= 1 && Number(form.warning_threshold_percent) <= 100 && Number(form.critical_threshold_percent) >= 1 &&
    Number(form.critical_threshold_percent) <= 100 && Number(form.warning_threshold_percent) < Number(form.critical_threshold_percent);
  const numericFormValid = Number.isFinite(Number(form.capacity_limit)) && Number(form.capacity_limit) >= 0 && (!editingId ? Number.isFinite(Number(form.current_usage)) && Number(form.current_usage) >= 0 : true);
  const projectedDateInvalid = Boolean(form.projected_exhaustion_at && Number.isNaN(new Date(form.projected_exhaustion_at).getTime()));
  const saveDisabled = !form.name.trim() || !form.unit.trim() || !thresholdWindowValid || !numericFormValid || projectedDateInvalid;

  const detailsPayload = () => {
    const body: Record<string, unknown> = {
      name: form.name.trim(), resource_type: form.resource_type, environment: form.environment, status: form.status, unit: form.unit.trim(),
      capacity_limit: Number(form.capacity_limit), warning_threshold_percent: Number(form.warning_threshold_percent), critical_threshold_percent: Number(form.critical_threshold_percent),
      projected_exhaustion_at: form.projected_exhaustion_at ? new Date(form.projected_exhaustion_at).toISOString() : null, scaling_plan: clean(form.scaling_plan), notes: clean(form.notes)
    };
    if (!editingId) body.current_usage = Number(form.current_usage);
    if (canReadDependencies) body.dependency_id = clean(form.dependency_id);
    if (canReadUsers) body.owner_platform_user_id = clean(form.owner_platform_user_id);
    return body;
  };

  const saveResource = useMutation({
    mutationFn: () => platformApiRequest(editingId ? `/platform/capacity-planning/${editingId}` : '/platform/capacity-planning', { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(detailsPayload()) }),
    onSuccess: async () => {
      setMessage(editingId ? 'Capacity resource details saved.' : 'Capacity resource created.'); setMutationError(''); setEditingId(''); setForm(emptyForm());
      await queryClient.invalidateQueries({ queryKey: ['platform', 'capacity-planning'] });
    },
    onError: (error) => { setMessage(''); setMutationError(readableError(error)); }
  });
  const recordUsage = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { current_usage: Number(usage.current_usage), capacity_limit: Number(usage.capacity_limit), projected_exhaustion_at: usage.projected_exhaustion_at ? new Date(usage.projected_exhaustion_at).toISOString() : null };
      if (usage.status) body.status = usage.status;
      return platformApiRequest(`/platform/capacity-planning/${usageEditingId}/usage`, { method: 'POST', body: JSON.stringify(body) });
    },
    onSuccess: async () => { setMessage('Usage evidence recorded.'); setMutationError(''); setUsageEditingId(''); await queryClient.invalidateQueries({ queryKey: ['platform', 'capacity-planning'] }); },
    onError: (error) => { setMessage(''); setMutationError(readableError(error)); }
  });
  const archiveResource = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/capacity-planning/${id}/archive`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: async () => { setMessage('Capacity resource archived.'); setMutationError(''); setEditingId(''); setUsageEditingId(''); await queryClient.invalidateQueries({ queryKey: ['platform', 'capacity-planning'] }); },
    onError: (error) => { setMessage(''); setMutationError(readableError(error)); }
  });

  const response = capacity.data;
  const summary = response?.summary;
  const pagination = response?.pagination;
  const resourceTypes = response?.resource_types || RESOURCE_TYPES;
  const environments = response?.environments || ENVIRONMENTS;
  const statuses = response?.statuses || STATUSES;
  const mutableStatuses = statuses.filter((item) => item !== 'archived');
  const deps = (dependencies.data?.dependencies || []).filter((item) => item.status !== 'archived' && !item.archived_at && !item.is_archived);
  const activeUsers = (users.data || []).filter((user) => user.is_active !== false);
  const blockingError = capacity.isError && !response;
  const staleWarning = capacity.isError && Boolean(response);
  const sourceWarning = (canReadDependencies && dependencies.isError) || (canReadUsers && users.isError);
  const refreshBusy = capacity.isFetching || (canReadDependencies && dependencies.isFetching) || (canReadUsers && users.isFetching);
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const accessLabel = response?.evidence_access?.dependency_identity && response?.evidence_access?.platform_user_identity ? 'Full linked identity evidence' : 'Partial linked identity evidence';

  const startEdit = (resource: CapacityResource) => {
    if (resource.is_archived || resource.status === 'archived') return;
    setMessage(''); setMutationError(''); setUsageEditingId(''); setEditingId(resource.id); setForm(toForm(resource)); scrollToFormSection('platform-capacity-planning-form');
  };
  const startUsage = (resource: CapacityResource) => {
    if (resource.is_archived || resource.status === 'archived') return;
    setMessage(''); setMutationError(''); setEditingId(''); setUsageEditingId(resource.id); setUsage(usageDraft(resource));
  };
  const usageDraftInvalid = !Number.isFinite(Number(usage.current_usage)) || Number(usage.current_usage) < 0 || !Number.isFinite(Number(usage.capacity_limit)) || Number(usage.capacity_limit) < 0 || Boolean(usage.projected_exhaustion_at && Number.isNaN(new Date(usage.projected_exhaustion_at).getTime()));

  return <div className="io-operational-page io-workspace-page platform-capacity-planning">
    <OperationalWorkspaceHero
      iconPath="/platform/capacity-planning" eyebrow="Platform operations" title="Capacity planning"
      description="Track operator-recorded capacity limits, usage observations, scaling plans and projected exhaustion without presenting application records as live infrastructure telemetry."
      meta={<><OperationalWorkspaceMetaPill>Registry-wide filtered summary</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>{accessLabel}</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>50 rows per page</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-capacity-planning__hero-aside"><OperationalWorkspaceStatus value={summary?.critical ?? '—'} label="Critical usage records" /><div className="platform-capacity-planning__refresh-block"><button type="button" className="app-button app-button--secondary" disabled={refreshBusy || invalidFilters} onClick={() => { setMessage(''); setMutationError(''); void capacity.refetch(); if (canReadDependencies) void dependencies.refetch(); if (canReadUsers) void users.refetch(); }}>{refreshBusy ? 'Refreshing…' : 'Refresh'}</button><span>{capacity.dataUpdatedAt ? `Last successful snapshot ${new Date(capacity.dataUpdatedAt).toLocaleString()}` : 'No successful snapshot yet'}</span></div></div>}
    />

    {invalidFilters ? <div className="platform-capacity-planning__warning"><strong>Invalid URL filter.</strong><span>Clear the filters to load capacity evidence safely.</span><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></div> : null}
    {staleWarning ? <div className="platform-capacity-planning__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(capacity.error)}</span><button type="button" className="app-button app-button--secondary" disabled={capacity.isFetching} onClick={() => void capacity.refetch()}>Retry</button></div> : null}
    {sourceWarning ? <div className="platform-capacity-planning__warning"><strong>Supporting directory refresh failed.</strong><span>The capacity registry remains visible, but dependency or owner selectors may be unavailable until refreshed.</span></div> : null}
    {message ? <div className="platform-capacity-planning__success"><strong>{message}</strong><button type="button" className="app-button app-button--ghost" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-capacity-planning__warning"><strong>Action failed.</strong><span>{mutationError}</span><button type="button" className="app-button app-button--ghost" onClick={() => setMutationError('')}>Dismiss</button></div> : null}

    <OperationalWorkspaceStats>
      <OperationalWorkspaceStatCard label="Filtered resources" value={summary?.total ?? '—'} hint="Registry-wide filtered total" />
      <OperationalWorkspaceStatCard label="Critical" value={summary?.critical ?? '—'} hint="Active records at/above recorded critical threshold" tone={summary?.critical ? 'danger' : 'neutral'} />
      <OperationalWorkspaceStatCard label="Warning" value={summary?.warning ?? '—'} hint="Active records between recorded thresholds" tone={summary?.warning ? 'warn' : 'neutral'} />
      <OperationalWorkspaceStatCard label="Exhausting ≤30d" value={summary?.exhausting_soon ?? '—'} hint="Operator-recorded projection date" tone={summary?.exhausting_soon ? 'warn' : 'neutral'} />
      <OperationalWorkspaceStatCard label="Limit not configured" value={summary?.unconfigured_limit ?? '—'} hint="Active records with zero/unknown limit" tone={summary?.unconfigured_limit ? 'warn' : 'neutral'} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-capacity-planning__section">
      <OperationalSectionHeader iconPath="/platform/capacity-planning" title="Evidence boundary" description="What this page can and cannot establish." />
      <div className="platform-capacity-planning__truth-note"><strong>Application evidence only.</strong><span>Current usage, capacity limits and exhaustion dates are operator-recorded values. This page does not poll infrastructure, verify vendor limits, or prove that a resolved record means an external capacity issue was actually eliminated.</span></div>
    </section>

    <section className="io-workspace-panel platform-capacity-planning__section">
      <OperationalSectionHeader iconPath="/platform/capacity-planning" title="Filters" description="Filters are stored in the URL. Attention-only is enabled by default and includes active resources with no configured limit." />
      <div className="platform-capacity-planning__filter-grid">
        <label>Status<select value={status} onChange={(event) => updateFilter('status', event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Resource type<select value={resourceType} onChange={(event) => updateFilter('resource_type', event.target.value)}><option value="">All types</option>{resourceTypes.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Environment<select value={environment} onChange={(event) => updateFilter('environment', event.target.value)}><option value="">All environments</option>{environments.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label className="platform-capacity-planning__search">Search<input value={search} onChange={(event) => updateFilter('search', event.target.value)} maxLength={200} placeholder="Resource, plan, notes…" /></label>
        <label className="platform-capacity-planning__checkbox"><input type="checkbox" checked={attentionOnly} onChange={(event) => updateFilter('attention_only', event.target.checked)} /> Attention only</label>
        <label className="platform-capacity-planning__checkbox"><input type="checkbox" checked={includeArchived} onChange={(event) => updateFilter('include_archived', event.target.checked)} /> Include archived</label>
      </div>
      <div className="platform-capacity-planning__actions"><button type="button" className="app-button app-button--secondary" onClick={clearFilters}>Clear filters</button></div>
    </section>

    {canWrite ? <section id="platform-capacity-planning-form" className="io-workspace-panel platform-capacity-planning__section">
      <OperationalSectionHeader iconPath="/platform/capacity-planning" title={editingId ? 'Edit capacity resource' : 'Create capacity resource'} description={editingId ? 'Edit registry configuration. Current usage is recorded separately so usage evidence has its own audit event.' : 'Register a resource and its initial operator-recorded capacity evidence.'} actions={editingId ? <button type="button" className="app-button app-button--ghost" onClick={() => { setEditingId(''); setForm(emptyForm()); setMutationError(''); }}>Cancel edit</button> : undefined} />
      <div className="platform-capacity-planning__form-grid">
        <label>Resource name<input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={200} /></label>
        <label>Type<select value={form.resource_type} onChange={(event) => setForm((current) => ({ ...current, resource_type: event.target.value }))}>{resourceTypes.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Environment<select value={form.environment} onChange={(event) => setForm((current) => ({ ...current, environment: event.target.value }))}>{environments.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Workflow status<select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>{mutableStatuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
        <label>Unit<input value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} maxLength={80} /></label>
        {!editingId ? <label>Initial current usage<input type="number" min="0" step="any" value={form.current_usage} onChange={(event) => setForm((current) => ({ ...current, current_usage: event.target.value }))} /></label> : <div className="platform-capacity-planning__form-restricted"><strong>Usage handled separately</strong><span>Use Record usage on the resource card to create a dedicated usage audit event.</span></div>}
        <label>Capacity limit<input type="number" min="0" step="any" value={form.capacity_limit} onChange={(event) => setForm((current) => ({ ...current, capacity_limit: event.target.value }))} /></label>
        <label>Projected exhaustion<input type="datetime-local" value={form.projected_exhaustion_at} onChange={(event) => setForm((current) => ({ ...current, projected_exhaustion_at: event.target.value }))} /></label>
        <label>Warning threshold %<input type="number" min="1" max="100" step="1" value={form.warning_threshold_percent} onChange={(event) => setForm((current) => ({ ...current, warning_threshold_percent: event.target.value }))} /></label>
        <label>Critical threshold %<input type="number" min="1" max="100" step="1" value={form.critical_threshold_percent} onChange={(event) => setForm((current) => ({ ...current, critical_threshold_percent: event.target.value }))} /></label>
        {canReadDependencies ? <label>Service dependency<select value={form.dependency_id} onChange={(event) => setForm((current) => ({ ...current, dependency_id: event.target.value }))}><option value="">No dependency</option>{deps.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <div className="platform-capacity-planning__form-restricted"><strong>Dependency linkage restricted</strong><span>Existing linkage is preserved. PLATFORM_DEPENDENCIES_READ is required to create/change it.</span></div>}
        {canReadUsers ? <label>Owner<select value={form.owner_platform_user_id} onChange={(event) => setForm((current) => ({ ...current, owner_platform_user_id: event.target.value }))}><option value="">No owner</option>{activeUsers.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label> : <div className="platform-capacity-planning__form-restricted"><strong>Owner linkage restricted</strong><span>Existing owner is preserved. PLATFORM_USERS_READ is required to create/change it.</span></div>}
        <label className="platform-capacity-planning__span-all">Scaling plan<textarea value={form.scaling_plan} onChange={(event) => setForm((current) => ({ ...current, scaling_plan: event.target.value }))} maxLength={4000} /></label>
        <label className="platform-capacity-planning__span-all">Notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} maxLength={4000} /></label>
      </div>
      {!form.name.trim() ? <div className="platform-capacity-planning__validation">Enter a resource name before saving.</div> : !form.unit.trim() ? <div className="platform-capacity-planning__validation">Enter a unit before saving.</div> : !numericFormValid ? <div className="platform-capacity-planning__validation">Usage and capacity limit must be valid non-negative numbers.</div> : !thresholdWindowValid ? <div className="platform-capacity-planning__validation">Warning threshold must be 1–100 and lower than the critical threshold.</div> : projectedDateInvalid ? <div className="platform-capacity-planning__validation">Projected exhaustion must be a valid local date and time.</div> : null}
      <div className="platform-capacity-planning__actions"><button type="button" className="app-button app-button--primary" disabled={saveDisabled || saveResource.isPending} onClick={() => saveResource.mutate()}>{saveResource.isPending ? 'Saving…' : editingId ? 'Save details' : 'Create resource'}</button></div>
    </section> : null}

    <section className="io-workspace-panel platform-capacity-planning__section">
      <OperationalSectionHeader iconPath="/platform/capacity-planning" title="Capacity registry" description="High-attention active records are ordered first. Usage percentages are derived only from the recorded usage and recorded limit." />
      {blockingError ? <div className="platform-capacity-planning__blocking-error"><strong>Capacity planning could not be loaded.</strong><span>{readableError(capacity.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void capacity.refetch()} disabled={capacity.isFetching}>Retry</button></div> : null}
      {!blockingError && capacity.isLoading ? <div className="platform-capacity-planning__loading">Loading capacity evidence…</div> : null}
      {!blockingError && response && !response.resources.length ? <div className="platform-capacity-planning__empty"><strong>No capacity resources match the current filters.</strong><span>This means no matching application records were found; it does not prove that infrastructure has no capacity constraint.</span></div> : null}
      {response?.resources.length ? <div className="platform-capacity-planning__list">{response.resources.map((resource) => {
        const percent = usagePercent(resource);
        const archived = Boolean(resource.is_archived || resource.status === 'archived');
        const projectedSoon = Boolean(resource.projected_exhaustion_at && new Date(resource.projected_exhaustion_at).getTime() <= Date.now() + 30 * 86400000 && !['resolved', 'archived'].includes(resource.status));
        return <article className="platform-capacity-planning__card" key={resource.id}>
          <div className="platform-capacity-planning__card-header"><div><h4>{resource.name}</h4><p>{resource.notes || 'No application note recorded.'}</p></div><div className="platform-capacity-planning__badges"><span data-tone={statusTone(resource.status, percent)}>{pretty(resource.status)}</span><span>{pretty(resource.resource_type)}</span><span>{pretty(resource.environment)}</span>{projectedSoon ? <span data-tone="warn">Projected ≤30d</span> : null}</div></div>
          <div className="platform-capacity-planning__metrics-grid">
            <div><span>Usage</span><strong>{numberText(resource.current_usage)} {resource.unit}</strong></div>
            <div><span>Recorded limit</span><strong>{Number(resource.capacity_limit) > 0 ? `${numberText(resource.capacity_limit)} ${resource.unit}` : 'Not configured'}</strong></div>
            <div><span>Derived usage</span><strong>{percent === null ? 'Unavailable · no limit' : `${percent.toFixed(2)}%`}</strong></div>
            <div><span>Thresholds</span><strong>{resource.warning_threshold_percent}% / {resource.critical_threshold_percent}%</strong></div>
            <div><span>Projected exhaustion</span><strong>{dateTime(resource.projected_exhaustion_at)}</strong></div>
            <div><span>Updated</span><strong>{dateTime(resource.updated_at)}</strong></div>
            <div><span>Dependency</span><strong>{resource.dependency_name || (resource.dependency_present ? 'Linked · identity restricted' : 'Not linked')}</strong></div>
            <div><span>Owner</span><strong>{resource.owner_email || (resource.owner_present ? 'Assigned · identity restricted' : 'Not assigned')}</strong></div>
            <div><span>Updated by</span><strong>{resource.updated_by_email || 'Identity unavailable / restricted'}</strong></div>
          </div>
          <div className="platform-capacity-planning__plan"><strong>Scaling plan</strong><span>{resource.scaling_plan || 'Not recorded'}</span></div>
          {usageEditingId === resource.id && canWrite && !archived ? <div className="platform-capacity-planning__usage-editor">
            <strong>Record usage evidence</strong><span>Use an empty status override to let the application derive tracking/watch/scaling-needed from the recorded usage and thresholds.</span>
            <div className="platform-capacity-planning__usage-grid">
              <label>Current usage<input type="number" min="0" step="any" value={usage.current_usage} onChange={(event) => setUsage((current) => ({ ...current, current_usage: event.target.value }))} /></label>
              <label>Capacity limit<input type="number" min="0" step="any" value={usage.capacity_limit} onChange={(event) => setUsage((current) => ({ ...current, capacity_limit: event.target.value }))} /></label>
              <label>Projected exhaustion<input type="datetime-local" value={usage.projected_exhaustion_at} onChange={(event) => setUsage((current) => ({ ...current, projected_exhaustion_at: event.target.value }))} /></label>
              <label>Status override<select value={usage.status} onChange={(event) => setUsage((current) => ({ ...current, status: event.target.value }))}><option value="">Auto-derive</option>{mutableStatuses.map((item) => <option key={item} value={item}>{pretty(item)}</option>)}</select></label>
            </div>
            {usageDraftInvalid ? <div className="platform-capacity-planning__validation">Usage/limit must be non-negative numbers and projected exhaustion must be a valid local date/time.</div> : null}
            <div className="platform-capacity-planning__actions"><button type="button" className="app-button app-button--ghost" onClick={() => setUsageEditingId('')}>Cancel</button><button type="button" className="app-button app-button--primary" disabled={usageDraftInvalid || recordUsage.isPending} onClick={() => recordUsage.mutate()}>{recordUsage.isPending ? 'Recording…' : 'Record usage'}</button></div>
          </div> : null}
          <div className="platform-capacity-planning__card-footer">
            <div className="platform-capacity-planning__source-links">{canReadDependencies && resource.dependency_id ? <Link to="/platform/service-dependencies">Service dependency</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div>
            {canWrite ? <div className="platform-capacity-planning__actions">{archived ? <span className="platform-capacity-planning__immutable">Archived · registry evidence immutable</span> : <><button type="button" className="app-button app-button--secondary" onClick={() => startEdit(resource)}>Edit details</button><button type="button" className="app-button app-button--secondary" onClick={() => startUsage(resource)}>Record usage</button><button type="button" className="app-button app-button--secondary" disabled={archiveResource.isPending} onClick={() => { if (window.confirm(`Archive capacity resource ${resource.name}?`)) archiveResource.mutate(resource.id); }}>Archive</button></>}</div> : null}
          </div>
        </article>;
      })}</div> : null}
      {response ? <div className="platform-capacity-planning__pagination"><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))} disabled={offset === 0 || capacity.isFetching}>Previous</button><span>Page {pageNumber} · up to {PAGE_SIZE} resources · {pagination?.total ?? 0} filtered total</span><button type="button" className="app-button app-button--secondary" onClick={() => setOffset((value) => value + PAGE_SIZE)} disabled={!pagination?.has_more || capacity.isFetching}>Next</button></div> : null}
    </section>

    <section className="io-workspace-panel platform-capacity-planning__section"><OperationalSectionHeader iconPath="/platform/capacity-planning" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." /><div className="platform-capacity-planning__supporting-links">{canReadDependencies ? <Link to="/platform/service-dependencies">Service dependencies</Link> : null}{canReadRisks ? <Link to="/platform/risk-register">Risk register</Link> : null}{canReadJobs ? <Link to="/platform/operational-jobs">Operational jobs</Link> : null}{canReadUsers ? <Link to="/platform/users">Platform users</Link> : null}{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}</div></section>
  </div>;
}
