import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
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
import './PlatformRunbooksPage.css';

type Tenant = { id: string; name: string };
type Pagination = { limit: number; offset: number; has_more: boolean };
type EvidenceAccess = { tenant: boolean; incident: boolean; tenant_task: boolean; platform_user_identity: boolean };
type Runbook = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  severity: string;
  is_active: boolean;
  owner_role?: string | null;
  step_count: number;
  execution_count?: number;
  active_execution_count?: number;
  created_by_platform_user_email?: string | null;
  updated_by_platform_user_email?: string | null;
  actor_identity_restricted?: boolean;
};
type RunbookStep = { id: string; step_order: number; title: string; instructions?: string | null; expected_result?: string | null; is_required: boolean };
type RunbookDetail = Runbook & { steps: RunbookStep[] };
type ExecutionStep = RunbookStep & {
  status: 'pending' | 'done' | 'skipped';
  notes?: string | null;
  completed_at?: string | null;
  completed_by_platform_user_email?: string | null;
};
type Execution = {
  id: string;
  runbook_id: string;
  runbook_title: string;
  runbook_category: string;
  runbook_severity: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  incident_id?: string | null;
  task_id?: string | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  reason: string;
  notes?: string | null;
  started_at: string;
  completed_at?: string | null;
  started_by_platform_user_email?: string | null;
  completed_by_platform_user_email?: string | null;
  done_steps?: number;
  total_steps?: number;
  evidence_access?: EvidenceAccess;
  steps?: ExecutionStep[];
};
type RunbooksResponse = { runbooks: Runbook[]; pagination: Pagination };
type ExecutionsResponse = { executions: Execution[]; evidence_access: EvidenceAccess; pagination: Pagination };
type SummaryResponse = { active_executions: number; active_critical_runbooks: number; active_runbooks: number; by_category: Array<{ category: string; count: number }> };
type StepDraft = { title: string; instructions: string; expected_result: string; is_required: boolean };
type RunbookDraft = { title: string; description: string; category: string; severity: string; owner_role: string; is_active: boolean; steps: StepDraft[] };

const categories = ['general', 'support', 'incident', 'billing', 'security', 'maintenance', 'offboarding'] as const;
const severities = ['low', 'medium', 'high', 'critical'] as const;
const executionStatuses = ['in_progress', 'completed', 'cancelled'] as const;
const PAGE_SIZE = 50;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultStep: StepDraft = { title: '', instructions: '', expected_result: '', is_required: true };
const emptyRunbookDraft = (): RunbookDraft => ({ title: '', description: '', category: 'general', severity: 'medium', owner_role: '', is_active: true, steps: [{ ...defaultStep }] });

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
function severityTone(value: string) {
  if (value === 'critical') return 'danger';
  if (value === 'high') return 'warn';
  return 'neutral';
}
function executionTone(value: Execution['status']) {
  if (value === 'completed') return 'good';
  if (value === 'cancelled') return 'danger';
  return 'warn';
}

export default function PlatformRunbooksPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_WRITE);
  const canExecute = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_EXECUTE);
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadIncidents = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadMaintenance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_READ);

  const requestedCategory = searchParams.get('category') || '';
  const requestedSeverity = searchParams.get('severity') || '';
  const requestedActive = searchParams.get('active') || '';
  const requestedSearch = searchParams.get('search') || '';
  const requestedExecutionStatus = searchParams.get('execution_status') || '';
  const requestedTenantId = searchParams.get('tenant_id') || '';
  const category = categories.includes(requestedCategory as typeof categories[number]) ? requestedCategory : '';
  const severity = severities.includes(requestedSeverity as typeof severities[number]) ? requestedSeverity : '';
  const active = requestedActive === 'true' || requestedActive === 'false' ? requestedActive : '';
  const executionStatus = executionStatuses.includes(requestedExecutionStatus as typeof executionStatuses[number]) ? requestedExecutionStatus : '';
  const tenantId = canReadTenants && uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const invalidFilters = Boolean(
    (requestedCategory && !category) ||
    (requestedSeverity && !severity) ||
    (requestedActive && !active) ||
    (requestedExecutionStatus && !executionStatus) ||
    (requestedTenantId && (!canReadTenants || !tenantId)) ||
    (requestedSearch && !search)
  );

  const [runbookOffset, setRunbookOffset] = useState(0);
  const [executionOffset, setExecutionOffset] = useState(0);
  const [selectedRunbookId, setSelectedRunbookId] = useState('');
  const [selectedExecutionId, setSelectedExecutionId] = useState('');
  const [createDraft, setCreateDraft] = useState<RunbookDraft>(() => emptyRunbookDraft());
  const [editDraft, setEditDraft] = useState<RunbookDraft>(() => emptyRunbookDraft());
  const [executionDraft, setExecutionDraft] = useState({ runbook_id: '', tenant_id: '', incident_id: '', task_id: '', reason: '', notes: '' });
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});
  const [closeNotes, setCloseNotes] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { setRunbookOffset(0); }, [category, severity, active, search, invalidFilters]);
  useEffect(() => { setExecutionOffset(0); }, [executionStatus, tenantId, invalidFilters]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'runbooks-selector'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    enabled: canExecute && canReadTenants,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const summary = useQuery({
    queryKey: ['platform', 'runbooks', 'summary'],
    queryFn: () => platformApiRequest<SummaryResponse>('/platform/runbooks/summary'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const runbooks = useQuery({
    queryKey: ['platform', 'runbooks', 'list', category, severity, active, search, runbookOffset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(runbookOffset) });
      if (category) params.set('category', category);
      if (severity) params.set('severity', severity);
      if (active) params.set('active', active);
      if (search.trim()) params.set('search', search.trim());
      return platformApiRequest<RunbooksResponse>(`/platform/runbooks?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const executions = useQuery({
    queryKey: ['platform', 'runbooks', 'executions', executionStatus, tenantId, executionOffset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(executionOffset) });
      if (executionStatus) params.set('status', executionStatus);
      if (tenantId) params.set('tenant_id', tenantId);
      return platformApiRequest<ExecutionsResponse>(`/platform/runbooks/executions?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const selectedRunbook = useQuery({
    queryKey: ['platform', 'runbooks', 'detail', selectedRunbookId],
    enabled: Boolean(selectedRunbookId),
    queryFn: () => platformApiRequest<RunbookDetail>(`/platform/runbooks/${selectedRunbookId}`),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const selectedExecution = useQuery({
    queryKey: ['platform', 'runbooks', 'execution-detail', selectedExecutionId],
    enabled: Boolean(selectedExecutionId),
    queryFn: () => platformApiRequest<Execution>(`/platform/runbooks/executions/${selectedExecutionId}`),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  useEffect(() => {
    if (!selectedRunbook.data) return;
    setEditDraft({
      title: selectedRunbook.data.title,
      description: selectedRunbook.data.description || '',
      category: selectedRunbook.data.category,
      severity: selectedRunbook.data.severity,
      owner_role: selectedRunbook.data.owner_role || '',
      is_active: selectedRunbook.data.is_active,
      steps: selectedRunbook.data.steps.map((step) => ({ title: step.title, instructions: step.instructions || '', expected_result: step.expected_result || '', is_required: step.is_required }))
    });
  }, [selectedRunbook.data]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const step of selectedExecution.data?.steps || []) next[step.id] = step.notes || '';
    setStepNotes(next);
    setCloseNotes(selectedExecution.data?.notes || '');
  }, [selectedExecution.data]);

  const runbookPage = Math.floor(runbookOffset / PAGE_SIZE) + 1;
  const executionPage = Math.floor(executionOffset / PAGE_SIZE) + 1;
  const initialError = (summary.isError && summary.data === undefined) || (runbooks.isError && runbooks.data === undefined) || (executions.isError && executions.data === undefined);
  const staleError = (summary.isError && summary.data !== undefined) || (runbooks.isError && runbooks.data !== undefined) || (executions.isError && executions.data !== undefined);
  const refreshing = summary.isFetching || runbooks.isFetching || executions.isFetching || tenants.isFetching;
  const structuralLocked = Boolean((selectedRunbook.data?.execution_count || 0) > 0);
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    for (const key of ['category', 'severity', 'active', 'search', 'execution_status', 'tenant_id']) next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const refreshAll = async () => {
    const work: Array<Promise<unknown>> = [summary.refetch()];
    if (!invalidFilters) work.push(runbooks.refetch(), executions.refetch());
    if (canExecute && canReadTenants) work.push(tenants.refetch());
    if (selectedRunbookId) work.push(selectedRunbook.refetch());
    if (selectedExecutionId) work.push(selectedExecution.refetch());
    await Promise.all(work);
  };
  const invalidateRunbooks = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform', 'runbooks'] });
  };

  const normalizeDraftPayload = (draft: RunbookDraft) => ({
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    category: draft.category,
    severity: draft.severity,
    owner_role: draft.owner_role.trim() || null,
    is_active: draft.is_active,
    steps: draft.steps.map((step) => ({ title: step.title.trim(), instructions: step.instructions.trim() || null, expected_result: step.expected_result.trim() || null, is_required: step.is_required }))
  });

  const createRunbook = useMutation({
    mutationFn: () => platformApiRequest<RunbookDetail>('/platform/runbooks', { method: 'POST', body: JSON.stringify(normalizeDraftPayload(createDraft)) }),
    onSuccess: async (data) => {
      setCreateDraft(emptyRunbookDraft());
      setSelectedRunbookId(data.id);
      setMessage('Runbook created. The application record does not prove any external operational outcome.');
      await invalidateRunbooks();
    }
  });
  const updateRunbook = useMutation({
    mutationFn: () => {
      if (!selectedRunbookId) throw new Error('Select a runbook first.');
      const payload = structuralLocked
        ? { description: editDraft.description.trim() || null, owner_role: editDraft.owner_role.trim() || null, is_active: editDraft.is_active }
        : { title: editDraft.title.trim(), description: editDraft.description.trim() || null, category: editDraft.category, severity: editDraft.severity, owner_role: editDraft.owner_role.trim() || null, is_active: editDraft.is_active };
      return platformApiRequest<RunbookDetail>(`/platform/runbooks/${selectedRunbookId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    },
    onSuccess: async () => { setMessage('Runbook definition saved.'); await invalidateRunbooks(); }
  });
  const replaceSteps = useMutation({
    mutationFn: () => {
      if (!selectedRunbookId) throw new Error('Select a runbook first.');
      return platformApiRequest<RunbookDetail>(`/platform/runbooks/${selectedRunbookId}/steps`, {
        method: 'PUT',
        body: JSON.stringify({ steps: normalizeDraftPayload(editDraft).steps })
      });
    },
    onSuccess: async () => { setMessage('Runbook steps saved.'); await invalidateRunbooks(); }
  });
  const startExecution = useMutation({
    mutationFn: () => platformApiRequest<Execution>('/platform/runbooks/executions', {
      method: 'POST',
      body: JSON.stringify({
        runbook_id: executionDraft.runbook_id,
        tenant_id: canReadTenants ? executionDraft.tenant_id || null : null,
        incident_id: canReadIncidents ? executionDraft.incident_id.trim() || null : null,
        task_id: canReadTenants ? executionDraft.task_id.trim() || null : null,
        reason: executionDraft.reason.trim(),
        notes: executionDraft.notes.trim() || null
      })
    }),
    onSuccess: async (data) => {
      setExecutionDraft({ runbook_id: '', tenant_id: '', incident_id: '', task_id: '', reason: '', notes: '' });
      setSelectedExecutionId(data.id);
      setMessage('Runbook execution started. This records application checklist work; it does not prove an external action succeeded.');
      await invalidateRunbooks();
    }
  });
  const updateStep = useMutation({
    mutationFn: ({ executionId, stepId, status, notes }: { executionId: string; stepId: string; status: ExecutionStep['status']; notes: string }) => platformApiRequest<Execution>(`/platform/runbooks/executions/${executionId}/steps/${stepId}`, { method: 'PATCH', body: JSON.stringify({ status, notes: notes.trim() || null }) }),
    onSuccess: async () => { setMessage('Execution step saved.'); await invalidateRunbooks(); }
  });
  const closeExecution = useMutation({
    mutationFn: ({ executionId, action }: { executionId: string; action: 'complete' | 'cancel' }) => platformApiRequest<Execution>(`/platform/runbooks/executions/${executionId}/${action}`, { method: 'POST', body: JSON.stringify({ notes: closeNotes.trim() || null }) }),
    onSuccess: async (_data, variables) => { setMessage(variables.action === 'complete' ? 'Execution marked complete in the application.' : 'Execution cancelled in the application.'); await invalidateRunbooks(); }
  });

  const mutationError = createRunbook.error || updateRunbook.error || replaceSteps.error || startExecution.error || updateStep.error || closeExecution.error;

  const canCreate = createDraft.title.trim().length > 0 && createDraft.steps.length > 0 && createDraft.steps.every((step) => step.title.trim().length > 0);
  const canSaveDefinition = selectedRunbookId && editDraft.title.trim().length > 0;
  const canSaveSteps = selectedRunbookId && !structuralLocked && editDraft.steps.length > 0 && editDraft.steps.every((step) => step.title.trim().length > 0);
  const linkedIdsValid = (!executionDraft.incident_id.trim() || uuidPattern.test(executionDraft.incident_id.trim())) && (!executionDraft.task_id.trim() || uuidPattern.test(executionDraft.task_id.trim()));
  const canStart = executionDraft.runbook_id && executionDraft.reason.trim().length > 0 && linkedIdsValid;
  const selectedTenantName = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId)?.name, [tenants.data, tenantId]);

  const heroStatus = invalidFilters ? 'Filter invalid' : initialError ? 'Unavailable' : staleError ? 'Stale snapshot' : refreshing && !runbooks.data ? 'Loading' : 'Operational';
  const heroLabel = invalidFilters ? 'Clear invalid URL filters' : initialError ? 'Retry required' : staleError ? 'Last successful data retained' : 'Runbook registry and execution evidence';

  return (
    <div className="platform-runbooks">
      <OperationalWorkspaceHero
        iconPath="/platform/runbooks"
        eyebrow="Platform operations"
        title="Runbooks"
        description="Operational checklist definitions and auditable application execution records. Runbook completion means required steps were marked done in this application; it does not prove an external recovery, customer action, vendor response, incident resolution, security outcome, maintenance result, billing settlement, or offboarding completion."
        meta={<>
          <OperationalWorkspaceMetaPill>Read · PLATFORM_RUNBOOKS_READ</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Write · PLATFORM_RUNBOOKS_WRITE</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Execute · PLATFORM_RUNBOOKS_EXECUTE</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Page size · {PAGE_SIZE}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Evidence · permission scoped</OperationalWorkspaceMetaPill>
        </>}
        aside={<div className="platform-runbooks__hero-aside"><OperationalWorkspaceStatus value={heroStatus} label={heroLabel} /><div className="platform-runbooks__refresh-block"><button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button><span>Runbook page {runbookPage} · execution page {executionPage}</span></div></div>}
      />

      {invalidFilters ? <section className="platform-runbooks__blocking-error"><strong>Invalid Runbooks URL filter</strong><span>Category, severity, active state, execution status, search length and tenant filter must match supported values and your permissions.</span><button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button></section> : null}
      {initialError ? <section className="platform-runbooks__blocking-error"><strong>Runbook data is unavailable</strong><span>{readableError(summary.error || runbooks.error || executions.error)}</span><button type="button" className="app-button app-button--secondary" onClick={refreshAll}>Retry</button></section> : null}
      {staleError ? <div className="platform-runbooks__warning">Showing the last successful Runbooks snapshot. Refresh failed: {readableError(summary.error || runbooks.error || executions.error)}</div> : null}
      {tenants.isError && tenants.data === undefined ? <div className="platform-runbooks__warning">Tenant selector is unavailable. Platform-wide executions remain available: {readableError(tenants.error)}</div> : null}
      {message ? <div className="platform-runbooks__success">{message}</div> : null}
      {mutationError ? <div className="platform-runbooks__warning">Mutation failed: {readableError(mutationError)}</div> : null}

      {summary.data ? <OperationalWorkspaceStats ariaLabel="Runbook registry summary">
        <OperationalWorkspaceStatCard label="Active runbooks" value={summary.data.active_runbooks} helper="Global registry count" tone="neutral" />
        <OperationalWorkspaceStatCard label="Critical runbooks" value={summary.data.active_critical_runbooks} helper="Active critical definitions" tone="danger" />
        <OperationalWorkspaceStatCard label="Active executions" value={summary.data.active_executions} helper="Global in-application executions" tone="warn" />
        <OperationalWorkspaceStatCard label="Loaded runbooks" value={runbooks.data?.runbooks.length ?? 0} helper="Current page only" tone="neutral" />
        <OperationalWorkspaceStatCard label="Loaded executions" value={executions.data?.executions.length ?? 0} helper="Current page only" tone="neutral" />
      </OperationalWorkspaceStats> : null}

      <section className="io-workspace-panel platform-runbooks__section">
        <OperationalSectionHeader iconPath="/platform/runbooks" title="Evidence boundary" description="Runbook definitions are governed by Runbooks permissions. Linked tenant, incident, tenant-task and Platform-user identity evidence is independently restricted by its source permission." />
        <div className="platform-runbooks__evidence-grid">
          <div data-state={canReadTenants ? 'available' : 'restricted'}><span>Tenant evidence</span><strong>{canReadTenants ? 'Available' : 'Restricted'}</strong><small>TENANTS_READ</small></div>
          <div data-state={canReadIncidents ? 'available' : 'restricted'}><span>Incident evidence</span><strong>{canReadIncidents ? 'Available' : 'Restricted'}</strong><small>PLATFORM_INCIDENTS_READ</small></div>
          <div data-state={canReadTenants ? 'available' : 'restricted'}><span>Tenant-task evidence</span><strong>{canReadTenants ? 'Available' : 'Restricted'}</strong><small>TENANTS_READ</small></div>
          <div data-state={canReadPlatformUsers ? 'available' : 'restricted'}><span>Operator identity</span><strong>{canReadPlatformUsers ? 'Available' : 'Redacted'}</strong><small>PLATFORM_USERS_READ</small></div>
        </div>
        <div className="platform-runbooks__truth-note"><strong>Application execution ≠ external outcome.</strong> A completed runbook only proves that required checklist steps were marked done in this application. Any external result still requires its own authoritative evidence.</div>
        <div className="platform-runbooks__supporting-grid">
          {canReadIncidents ? <Link to="/platform/incidents">Incidents</Link> : <span>Incidents restricted</span>}
          {canReadMaintenance ? <Link to="/platform/maintenance">Maintenance</Link> : <span>Maintenance restricted</span>}
          {canReadTenants ? <Link to="/platform/tenant-tasks">Tenant tasks</Link> : <span>Tenant tasks restricted</span>}
          {canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : <span>Audit restricted</span>}
        </div>
      </section>

      <section className="io-workspace-panel platform-runbooks__section">
        <OperationalSectionHeader iconPath="/platform/runbooks" title="Registry controls" description="Filters are URL-backed. Runbook and execution lists use deterministic server pagination." />
        <div className="platform-runbooks__filter-grid">
          <label>Category<select value={category} onChange={(event) => updateFilter('category', event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
          <label>Severity<select value={severity} onChange={(event) => updateFilter('severity', event.target.value)}><option value="">All severities</option>{severities.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
          <label>Active state<select value={active} onChange={(event) => updateFilter('active', event.target.value)}><option value="">All</option><option value="true">Active</option><option value="false">Inactive</option></select></label>
          <label>Search<input value={search} onChange={(event) => updateFilter('search', event.target.value)} maxLength={200} placeholder="Title, description, owner" /></label>
          <div className="platform-runbooks__filter-summary"><span>Runbook page</span><strong>{runbookPage}</strong></div>
        </div>
        <div className="platform-runbooks__filter-grid platform-runbooks__filter-grid--executions">
          <label>Execution status<select value={executionStatus} onChange={(event) => updateFilter('execution_status', event.target.value)}><option value="">All statuses</option>{executionStatuses.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
          {canReadTenants ? <label>Execution tenant<select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)} disabled={tenants.isLoading && !tenants.data}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-runbooks__restricted-filter">Tenant execution filtering requires TENANTS_READ.</div>}
          <div className="platform-runbooks__filter-summary"><span>Execution page</span><strong>{executionPage}</strong></div>
          <div className="platform-runbooks__filter-summary"><span>Execution scope</span><strong>{tenantId ? selectedTenantName || 'Selected tenant' : 'All authorized evidence'}</strong></div>
        </div>
      </section>

      {canWrite ? <section className="io-workspace-panel platform-runbooks__section">
        <OperationalSectionHeader iconPath="/platform/runbooks" title="Create runbook" description="Create an operational checklist. Step order is normalized by the server. Once execution history exists, title/category/severity/steps become structurally locked to protect historical evidence." />
        <RunbookEditor draft={createDraft} setDraft={setCreateDraft} allowStructuralEdit submitting={createRunbook.isPending} />
        <div className="platform-runbooks__actions"><button type="button" className="app-button" disabled={!canCreate || createRunbook.isPending} onClick={() => createRunbook.mutate()}>{createRunbook.isPending ? 'Creating…' : 'Create runbook'}</button></div>
      </section> : null}

      <section className="platform-runbooks__columns">
        <div className="io-workspace-panel platform-runbooks__section">
          <OperationalSectionHeader iconPath="/platform/runbooks" title="Runbook registry" description="Counts are corrected for step/execution join multiplication. Loaded rows are the current page only." />
          {runbooks.isLoading && !runbooks.data ? <div className="platform-runbooks__loading">Loading runbooks…</div> : null}
          {!runbooks.isLoading && runbooks.data?.runbooks.length === 0 ? <div className="platform-runbooks__empty"><strong>No runbooks match this view.</strong><span>This only describes the current application registry/filter; it does not prove no external procedures exist.</span></div> : null}
          <div className="platform-runbooks__card-list">{(runbooks.data?.runbooks || []).map((runbook) => <button type="button" key={runbook.id} className={`platform-runbooks__runbook-card${selectedRunbookId === runbook.id ? ' is-selected' : ''}`} onClick={() => setSelectedRunbookId(runbook.id)}><div><strong>{runbook.title}</strong><span>{humanize(runbook.category)} · {humanize(runbook.severity)}</span></div><div className="platform-runbooks__card-meta"><span>{runbook.step_count} steps</span><span>{runbook.execution_count || 0} executions</span><span>{runbook.active_execution_count || 0} active</span><span>{runbook.is_active ? 'Active' : 'Inactive'}</span></div></button>)}</div>
          <div className="platform-runbooks__pagination"><button type="button" className="app-button app-button--secondary" disabled={runbookOffset === 0 || runbooks.isFetching} onClick={() => setRunbookOffset((value) => Math.max(0, value - PAGE_SIZE))}>Previous</button><span>Page {runbookPage}</span><button type="button" className="app-button app-button--secondary" disabled={!runbooks.data?.pagination.has_more || runbooks.isFetching} onClick={() => setRunbookOffset((value) => value + PAGE_SIZE)}>Next</button></div>
        </div>

        <div className="io-workspace-panel platform-runbooks__section">
          <OperationalSectionHeader iconPath="/platform/runbooks" title="Runbook detail" description="Execution history locks structural fields so previously executed checklist evidence cannot be rewritten." />
          {selectedRunbook.isLoading && !selectedRunbook.data ? <div className="platform-runbooks__loading">Loading runbook detail…</div> : null}
          {selectedRunbook.isError && selectedRunbook.data === undefined ? <div className="platform-runbooks__blocking-error"><strong>Runbook detail unavailable</strong><span>{readableError(selectedRunbook.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => selectedRunbook.refetch()}>Retry</button></div> : null}
          {selectedRunbook.isError && selectedRunbook.data !== undefined ? <div className="platform-runbooks__warning">Showing the last successful runbook detail snapshot. Refresh failed: {readableError(selectedRunbook.error)}</div> : null}
          {!selectedRunbookId ? <div className="platform-runbooks__empty"><strong>Select a runbook.</strong><span>Its definition, steps and execution-history lock state will appear here.</span></div> : null}
          {selectedRunbook.data ? <>
            <div className="platform-runbooks__detail-head"><div><h4>{selectedRunbook.data.title}</h4><span>{humanize(selectedRunbook.data.category)} · {humanize(selectedRunbook.data.severity)} · {selectedRunbook.data.is_active ? 'Active' : 'Inactive'}</span></div><span className="platform-runbooks__posture" data-tone={severityTone(selectedRunbook.data.severity)}>{humanize(selectedRunbook.data.severity)}</span></div>
            <p className="platform-runbooks__description">{selectedRunbook.data.description || 'No description recorded.'}</p>
            <div className="platform-runbooks__detail-metrics"><div><span>Steps</span><strong>{selectedRunbook.data.step_count}</strong></div><div><span>Execution history</span><strong>{selectedRunbook.data.execution_count || 0}</strong></div><div><span>Active executions</span><strong>{selectedRunbook.data.active_execution_count || 0}</strong></div><div><span>Owner role</span><strong>{selectedRunbook.data.owner_role || 'Not assigned'}</strong></div></div>
            {structuralLocked ? <div className="platform-runbooks__warning">Structural history lock is active. Title, category, severity and steps cannot be changed after execution history exists; description, owner role and active state remain maintainable.</div> : null}
            <ol className="platform-runbooks__ordered-list">{selectedRunbook.data.steps.map((step) => <li key={step.id}><strong>{step.step_order}. {step.title}</strong><span>{step.instructions || 'No instructions recorded.'}</span><small>Expected: {step.expected_result || 'Not specified'} · {step.is_required ? 'Required' : 'Optional'}</small></li>)}</ol>
            {canWrite ? <div className="platform-runbooks__maintenance"><h4>Maintain selected runbook</h4><RunbookEditor draft={editDraft} setDraft={setEditDraft} allowStructuralEdit={!structuralLocked} submitting={updateRunbook.isPending || replaceSteps.isPending} /><div className="platform-runbooks__actions"><button type="button" className="app-button" disabled={!canSaveDefinition || updateRunbook.isPending} onClick={() => updateRunbook.mutate()}>{updateRunbook.isPending ? 'Saving…' : 'Save definition'}</button><button type="button" className="app-button app-button--secondary" disabled={!canSaveSteps || replaceSteps.isPending} onClick={() => replaceSteps.mutate()}>{replaceSteps.isPending ? 'Saving steps…' : 'Save steps'}</button></div></div> : null}
          </> : null}
        </div>
      </section>

      {canExecute ? <section className="io-workspace-panel platform-runbooks__section">
        <OperationalSectionHeader iconPath="/platform/runbooks" title="Start runbook execution" description="Optional tenant/incident/task references are accepted only when you hold the matching source read permission. Cross-tenant linked references are rejected by the server." />
        <div className="platform-runbooks__execution-form">
          <label>Runbook<select value={executionDraft.runbook_id} onChange={(event) => setExecutionDraft((current) => ({ ...current, runbook_id: event.target.value }))}><option value="">Select active runbook</option>{(runbooks.data?.runbooks || []).filter((runbook) => runbook.is_active).map((runbook) => <option key={runbook.id} value={runbook.id}>{runbook.title}</option>)}</select></label>
          {canReadTenants ? <label>Tenant<select value={executionDraft.tenant_id} onChange={(event) => setExecutionDraft((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Platform-wide / infer from linked evidence</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : <div className="platform-runbooks__restricted-filter">Tenant linking requires TENANTS_READ.</div>}
          {canReadIncidents ? <label>Incident ID<input value={executionDraft.incident_id} onChange={(event) => setExecutionDraft((current) => ({ ...current, incident_id: event.target.value }))} placeholder="Optional incident UUID" /></label> : null}
          {canReadTenants ? <label>Tenant task ID<input value={executionDraft.task_id} onChange={(event) => setExecutionDraft((current) => ({ ...current, task_id: event.target.value }))} placeholder="Optional tenant-task UUID" /></label> : null}
          <label className="platform-runbooks__span-two">Reason / ticket context<input value={executionDraft.reason} onChange={(event) => setExecutionDraft((current) => ({ ...current, reason: event.target.value }))} maxLength={1000} placeholder="Why this execution is being started" /></label>
          <label className="platform-runbooks__span-two">Notes<textarea value={executionDraft.notes} onChange={(event) => setExecutionDraft((current) => ({ ...current, notes: event.target.value }))} maxLength={4000} placeholder="Optional application notes" /></label>
        </div>
        {!linkedIdsValid ? <div className="platform-runbooks__warning">Incident/task references must be valid UUIDs.</div> : null}
        <div className="platform-runbooks__actions"><button type="button" className="app-button" disabled={!canStart || startExecution.isPending} onClick={() => startExecution.mutate()}>{startExecution.isPending ? 'Starting…' : 'Start execution'}</button></div>
      </section> : null}

      <section className="io-workspace-panel platform-runbooks__section">
        <OperationalSectionHeader iconPath="/platform/runbooks" title="Execution registry" description="Linked source fields are redacted server-side when their source permission is unavailable. Loaded rows are the current page only." />
        {executions.isLoading && !executions.data ? <div className="platform-runbooks__loading">Loading executions…</div> : null}
        {!executions.isLoading && executions.data?.executions.length === 0 ? <div className="platform-runbooks__empty"><strong>No execution records match this view.</strong><span>This does not prove no external procedure was performed.</span></div> : null}
        <div className="platform-runbooks__execution-list">{(executions.data?.executions || []).map((execution) => <article key={execution.id} className="platform-runbooks__execution-card"><div className="platform-runbooks__execution-head"><div><h4>{execution.runbook_title}</h4><span>{humanize(execution.runbook_category)} · {humanize(execution.runbook_severity)} · started {dateTime(execution.started_at)}</span></div><span className="platform-runbooks__posture" data-tone={executionTone(execution.status)}>{humanize(execution.status)}</span></div><p>{execution.reason}</p><div className="platform-runbooks__detail-metrics"><div><span>Tenant</span><strong>{canReadTenants ? execution.tenant_name || 'Platform-wide / not linked' : 'Restricted'}</strong></div><div><span>Progress</span><strong>{execution.done_steps ?? 0}/{execution.total_steps ?? 0}</strong></div><div><span>Started by</span><strong>{canReadPlatformUsers ? execution.started_by_platform_user_email || 'Not recorded' : 'Redacted'}</strong></div><div><span>Incident</span><strong>{canReadIncidents ? execution.incident_id || 'Not linked' : 'Restricted'}</strong></div></div><div className="platform-runbooks__actions"><button type="button" className="app-button app-button--secondary" onClick={() => setSelectedExecutionId(execution.id)}>Open execution</button>{canReadAudit ? <Link to="/platform/audit">Audit evidence</Link> : null}{canReadTenants && execution.tenant_id ? <Link to={`/platform/tenant-timeline?tenant_id=${encodeURIComponent(execution.tenant_id)}`}>Tenant timeline</Link> : null}</div></article>)}</div>
        <div className="platform-runbooks__pagination"><button type="button" className="app-button app-button--secondary" disabled={executionOffset === 0 || executions.isFetching} onClick={() => setExecutionOffset((value) => Math.max(0, value - PAGE_SIZE))}>Previous</button><span>Page {executionPage}</span><button type="button" className="app-button app-button--secondary" disabled={!executions.data?.pagination.has_more || executions.isFetching} onClick={() => setExecutionOffset((value) => value + PAGE_SIZE)}>Next</button></div>
      </section>

      {selectedExecutionId ? <section className="io-workspace-panel platform-runbooks__section">
        <OperationalSectionHeader iconPath="/platform/runbooks" title="Execution detail" description="Step status and notes are application evidence. Required steps must be done before application completion." />
        {selectedExecution.isLoading && !selectedExecution.data ? <div className="platform-runbooks__loading">Loading execution detail…</div> : null}
        {selectedExecution.isError && selectedExecution.data === undefined ? <div className="platform-runbooks__blocking-error"><strong>Execution detail unavailable</strong><span>{readableError(selectedExecution.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => selectedExecution.refetch()}>Retry</button></div> : null}
        {selectedExecution.isError && selectedExecution.data !== undefined ? <div className="platform-runbooks__warning">Showing the last successful execution detail snapshot. Refresh failed: {readableError(selectedExecution.error)}</div> : null}
        {selectedExecution.data ? <>
          <div className="platform-runbooks__execution-head"><div><h4>{selectedExecution.data.runbook_title}</h4><span>{selectedExecution.data.reason} · {dateTime(selectedExecution.data.started_at)}</span></div><span className="platform-runbooks__posture" data-tone={executionTone(selectedExecution.data.status)}>{humanize(selectedExecution.data.status)}</span></div>
          <div className="platform-runbooks__detail-metrics"><div><span>Tenant evidence</span><strong>{canReadTenants ? selectedExecution.data.tenant_name || 'Not linked' : 'Restricted'}</strong></div><div><span>Incident evidence</span><strong>{canReadIncidents ? selectedExecution.data.incident_id || 'Not linked' : 'Restricted'}</strong></div><div><span>Tenant task</span><strong>{canReadTenants ? selectedExecution.data.task_id || 'Not linked' : 'Restricted'}</strong></div><div><span>Operator identity</span><strong>{canReadPlatformUsers ? selectedExecution.data.started_by_platform_user_email || 'Not recorded' : 'Redacted'}</strong></div></div>
          <div className="platform-runbooks__step-list">{(selectedExecution.data.steps || []).map((step) => <div key={step.id} className="platform-runbooks__execution-step"><div className="platform-runbooks__step-copy"><strong>{step.step_order}. {step.title}</strong><span>{step.instructions || 'No instructions recorded.'}</span><small>Expected: {step.expected_result || 'Not specified'} · {step.is_required ? 'Required' : 'Optional'} · completed {dateTime(step.completed_at)}</small></div><span className="platform-runbooks__posture" data-tone={step.status === 'done' ? 'good' : step.status === 'skipped' ? 'neutral' : 'warn'}>{humanize(step.status)}</span>{canExecute && selectedExecution.data?.status === 'in_progress' ? <div className="platform-runbooks__step-actions"><input value={stepNotes[step.id] ?? ''} onChange={(event) => setStepNotes((current) => ({ ...current, [step.id]: event.target.value }))} maxLength={4000} placeholder="Step note" /><button type="button" className="app-button app-button--secondary" disabled={updateStep.isPending} onClick={() => updateStep.mutate({ executionId: selectedExecution.data!.id, stepId: step.id, status: 'done', notes: stepNotes[step.id] || '' })}>Done</button><button type="button" className="app-button app-button--secondary" disabled={updateStep.isPending} onClick={() => updateStep.mutate({ executionId: selectedExecution.data!.id, stepId: step.id, status: 'skipped', notes: stepNotes[step.id] || '' })}>Skip</button><button type="button" className="app-button app-button--secondary" disabled={updateStep.isPending} onClick={() => updateStep.mutate({ executionId: selectedExecution.data!.id, stepId: step.id, status: 'pending', notes: stepNotes[step.id] || '' })}>Reset</button><button type="button" className="app-button app-button--secondary" disabled={updateStep.isPending} onClick={() => updateStep.mutate({ executionId: selectedExecution.data!.id, stepId: step.id, status: step.status, notes: stepNotes[step.id] || '' })}>Save note</button></div> : null}</div>)}</div>
          {canExecute && selectedExecution.data.status === 'in_progress' ? <div className="platform-runbooks__close-panel"><label>Execution close notes<textarea value={closeNotes} onChange={(event) => setCloseNotes(event.target.value)} maxLength={4000} placeholder="Optional completion/cancellation notes" /></label><div className="platform-runbooks__actions"><button type="button" className="app-button" disabled={closeExecution.isPending} onClick={() => { if (window.confirm('Complete this execution in the application? Required steps must already be done.')) closeExecution.mutate({ executionId: selectedExecution.data!.id, action: 'complete' }); }}>Complete execution</button><button type="button" className="app-button app-button--danger" disabled={closeExecution.isPending} onClick={() => { if (window.confirm('Cancel this execution in the application?')) closeExecution.mutate({ executionId: selectedExecution.data!.id, action: 'cancel' }); }}>Cancel execution</button></div></div> : null}
        </> : null}
      </section> : null}
    </div>
  );
}

function RunbookEditor({ draft, setDraft, allowStructuralEdit, submitting }: { draft: RunbookDraft; setDraft: Dispatch<SetStateAction<RunbookDraft>>; allowStructuralEdit: boolean; submitting: boolean }) {
  const updateStep = (index: number, patch: Partial<StepDraft>) => setDraft((current) => ({ ...current, steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, ...patch } : step) }));
  const addStep = () => setDraft((current) => ({ ...current, steps: [...current.steps, { ...defaultStep }] }));
  const removeStep = (index: number) => {
    if (!window.confirm('Remove this runbook step from the draft?')) return;
    setDraft((current) => ({ ...current, steps: current.steps.filter((_, stepIndex) => stepIndex !== index) }));
  };
  return <div className="platform-runbooks__editor">
    <div className="platform-runbooks__editor-grid">
      <label>Title<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} maxLength={200} disabled={!allowStructuralEdit || submitting} /></label>
      <label>Category<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} disabled={!allowStructuralEdit || submitting}>{categories.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
      <label>Severity<select value={draft.severity} onChange={(event) => setDraft((current) => ({ ...current, severity: event.target.value }))} disabled={!allowStructuralEdit || submitting}>{severities.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
      <label>Owner role<input value={draft.owner_role} onChange={(event) => setDraft((current) => ({ ...current, owner_role: event.target.value }))} maxLength={120} disabled={submitting} /></label>
      <label className="platform-runbooks__span-two">Description<textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} maxLength={5000} disabled={submitting} /></label>
      <label className="platform-runbooks__checkbox"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))} disabled={submitting} /> Active definition</label>
    </div>
    <div className="platform-runbooks__step-editor-list">{draft.steps.map((step, index) => <div key={`${index}-${step.title}`} className="platform-runbooks__step-editor"><label>Step {index + 1} title<input value={step.title} onChange={(event) => updateStep(index, { title: event.target.value })} maxLength={200} disabled={!allowStructuralEdit || submitting} /></label><label>Instructions<textarea value={step.instructions} onChange={(event) => updateStep(index, { instructions: event.target.value })} maxLength={8000} disabled={!allowStructuralEdit || submitting} /></label><label>Expected result<input value={step.expected_result} onChange={(event) => updateStep(index, { expected_result: event.target.value })} maxLength={2000} disabled={!allowStructuralEdit || submitting} /></label><label className="platform-runbooks__checkbox"><input type="checkbox" checked={step.is_required} onChange={(event) => updateStep(index, { is_required: event.target.checked })} disabled={!allowStructuralEdit || submitting} /> Required</label>{allowStructuralEdit && draft.steps.length > 1 ? <button type="button" className="app-button app-button--danger" disabled={submitting} onClick={() => removeStep(index)}>Remove step</button> : null}</div>)}</div>
    {allowStructuralEdit ? <button type="button" className="app-button app-button--secondary" disabled={submitting} onClick={addStep}>Add step</button> : null}
  </div>;
}
