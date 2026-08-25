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
import './PlatformTenantTasksPage.css';

type Tenant = { id: string; name: string; location?: string | null };
type PlatformUser = { id: string; email: string; name?: string | null; role?: string; is_active?: boolean };
type TenantTask = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  title: string;
  description?: string | null;
  category: string;
  priority: string;
  status: string;
  due_at?: string | null;
  assigned_platform_user_id?: string | null;
  assigned_platform_user_email?: string | null;
  created_by_platform_user_email?: string | null;
  completed_by_platform_user_email?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_overdue?: boolean;
  is_closed?: boolean;
};
type TasksResponse = {
  tasks: TenantTask[];
  pagination: { limit: number; offset: number; has_more: boolean };
};
type TaskSummary = {
  open_count: number;
  blocked_count: number;
  overdue_count: number;
  urgent_count: number;
  by_category: Array<{ category: string; count: number }>;
};
type Feedback = { tone: 'good' | 'warn'; text: string } | null;
type EditingContext = { id: string; tenantId: string; tenantName: string } | null;

const categories = ['general', 'onboarding', 'support', 'billing', 'security', 'migration', 'offboarding'] as const;
const priorities = ['low', 'normal', 'high', 'urgent'] as const;
const statuses = ['open', 'in_progress', 'blocked', 'completed', 'cancelled'] as const;
const PAGE_SIZE = 100;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const blankForm = {
  tenant_id: '',
  title: '',
  description: '',
  category: 'general',
  priority: 'normal',
  status: 'open',
  due_at: '',
  assigned_platform_user_id: ''
};

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function humanize(value: string | null | undefined) {
  const text = String(value || '').trim().replaceAll('_', ' ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not set';
}

function dateTime(value: string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

function toLocalDateTimeInput(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function localInputToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isKnownValue<T extends readonly string[]>(value: string, values: T): value is T[number] {
  return values.includes(value as T[number]);
}

export default function PlatformTenantTasksPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState(blankForm);
  const [editing, setEditing] = useState<EditingContext>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadBilling = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ);
  const canReadRunbooks = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ);
  const canOpenSupportCockpit = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ)
    && hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedStatus = searchParams.get('status') || '';
  const requestedCategory = searchParams.get('category') || '';
  const requestedPriority = searchParams.get('priority') || '';
  const requestedAssignee = searchParams.get('assigned_platform_user_id') || '';
  const requestedIncludeClosed = searchParams.get('include_closed');
  const requestedOverdueOnly = searchParams.get('overdue_only');

  const tenantId = uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const status = isKnownValue(requestedStatus, statuses) ? requestedStatus : '';
  const category = isKnownValue(requestedCategory, categories) ? requestedCategory : '';
  const priority = isKnownValue(requestedPriority, priorities) ? requestedPriority : '';
  const assignedPlatformUserId = uuidPattern.test(requestedAssignee) ? requestedAssignee : '';
  const includeClosed = requestedIncludeClosed === 'true';
  const overdueOnly = requestedOverdueOnly === 'true';

  const invalidTenantFilter = Boolean(requestedTenantId && !tenantId);
  const invalidStatusFilter = Boolean(requestedStatus && !status);
  const invalidCategoryFilter = Boolean(requestedCategory && !category);
  const invalidPriorityFilter = Boolean(requestedPriority && !priority);
  const invalidAssigneeFilter = Boolean(requestedAssignee && !assignedPlatformUserId);
  const invalidIncludeClosedFilter = requestedIncludeClosed !== null && requestedIncludeClosed !== 'true' && requestedIncludeClosed !== 'false';
  const invalidOverdueOnlyFilter = requestedOverdueOnly !== null && requestedOverdueOnly !== 'true' && requestedOverdueOnly !== 'false';
  const invalidFilters = invalidTenantFilter || invalidStatusFilter || invalidCategoryFilter || invalidPriorityFilter || invalidAssigneeFilter || invalidIncludeClosedFilter || invalidOverdueOnlyFilter;

  useEffect(() => {
    setOffset(0);
  }, [tenantId, status, category, priority, assignedPlatformUserId, includeClosed, overdueOnly, invalidFilters]);

  useEffect(() => {
    if (!editing) setForm((current) => ({ ...current, tenant_id: tenantId || '' }));
  }, [tenantId, editing]);

  useEffect(() => {
    if (editing && tenantId && editing.tenantId !== tenantId) {
      setEditing(null);
      setForm({ ...blankForm, tenant_id: tenantId });
    }
  }, [tenantId, editing]);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'tasks-picker'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const platformUsers = useQuery({
    queryKey: ['platform', 'users', 'tasks-picker'],
    queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'),
    enabled: canReadPlatformUsers,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const summary = useQuery({
    queryKey: ['platform', 'tenant-tasks', 'summary'],
    queryFn: () => platformApiRequest<TaskSummary>('/platform/tenant-tasks/summary'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const tasks = useQuery({
    queryKey: ['platform', 'tenant-tasks', tenantId, status, category, priority, assignedPlatformUserId, includeClosed, overdueOnly, offset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), include_closed: String(includeClosed) });
      if (tenantId) params.set('tenant_id', tenantId);
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (priority) params.set('priority', priority);
      if (assignedPlatformUserId) params.set('assigned_platform_user_id', assignedPlatformUserId);
      if (overdueOnly) params.set('overdue_only', 'true');
      return platformApiRequest<TasksResponse>(`/platform/tenant-tasks?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const rows = tasks.data?.tasks || [];
  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);
  const selectedTenantLabel = selectedTenant?.name || (tenantId ? 'Selected tenant' : 'All tenants');
  const activePlatformUsers = useMemo(() => (platformUsers.data || []).filter((user) => user.is_active !== false), [platformUsers.data]);
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const hasPreviousPage = offset > 0;
  const hasNextPage = tasks.data?.pagination?.has_more === true;

  const initialTasksError = tasks.isError && tasks.data === undefined;
  const refreshTasksError = tasks.isError && tasks.data !== undefined;
  const initialTenantsError = tenants.isError && tenants.data === undefined;
  const refreshTenantsError = tenants.isError && tenants.data !== undefined;
  const refreshSummaryError = summary.isError && summary.data !== undefined;
  const initialSummaryError = summary.isError && summary.data === undefined;
  const refreshUsersError = canReadPlatformUsers && platformUsers.isError && platformUsers.data !== undefined;
  const initialUsersError = canReadPlatformUsers && platformUsers.isError && platformUsers.data === undefined;
  const refreshing = tasks.isFetching || tenants.isFetching || summary.isFetching || (canReadPlatformUsers && platformUsers.isFetching);

  const updateFilter = (key: 'tenant_id' | 'status' | 'category' | 'priority' | 'assigned_platform_user_id' | 'include_closed' | 'overdue_only', value: string | boolean) => {
    const next = new URLSearchParams(searchParams);
    if (typeof value === 'boolean') {
      if (value) next.set(key, 'true');
      else next.delete(key);
    } else if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setFeedback(null);
  };

  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (invalidTenantFilter) next.delete('tenant_id');
    if (invalidStatusFilter) next.delete('status');
    if (invalidCategoryFilter) next.delete('category');
    if (invalidPriorityFilter) next.delete('priority');
    if (invalidAssigneeFilter) next.delete('assigned_platform_user_id');
    if (invalidIncludeClosedFilter) next.delete('include_closed');
    if (invalidOverdueOnlyFilter) next.delete('overdue_only');
    setSearchParams(next, { replace: true });
  };

  const refreshAll = async () => {
    setFeedback(null);
    const work: Array<Promise<unknown>> = [tenants.refetch(), summary.refetch()];
    if (!invalidFilters) work.push(tasks.refetch());
    if (canReadPlatformUsers) work.push(platformUsers.refetch());
    await Promise.all(work);
  };

  const resetEditor = () => {
    setEditing(null);
    setForm({ ...blankForm, tenant_id: tenantId || '' });
    createTask.reset();
    updateTask.reset();
  };

  const mutablePayload = () => {
    const payload: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      priority: form.priority,
      status: form.status,
      due_at: localInputToIso(form.due_at)
    };
    if (canReadPlatformUsers) payload.assigned_platform_user_id = form.assigned_platform_user_id || null;
    return payload;
  };

  const createTask = useMutation({
    mutationFn: () => platformApiRequest<TenantTask>('/platform/tenant-tasks', {
      method: 'POST',
      body: JSON.stringify({ ...mutablePayload(), tenant_id: form.tenant_id })
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setForm({ ...blankForm, tenant_id: tenantId || '' });
      setFeedback({ tone: 'good', text: 'Tenant task created.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-tasks'] });
    }
  });

  const updateTask = useMutation({
    mutationFn: (id: string) => platformApiRequest<TenantTask>(`/platform/tenant-tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(mutablePayload())
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setEditing(null);
      setForm({ ...blankForm, tenant_id: tenantId || '' });
      setFeedback({ tone: 'good', text: 'Tenant task updated.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-tasks'] });
    }
  });

  const completeTask = useMutation({
    mutationFn: (id: string) => platformApiRequest<TenantTask>(`/platform/tenant-tasks/${id}/complete`, { method: 'POST' }),
    onMutate: () => setFeedback(null),
    onSuccess: async (_data, id) => {
      if (editing?.id === id) resetEditor();
      setFeedback({ tone: 'good', text: 'Tenant task marked completed.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-tasks'] });
    }
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-tasks/${id}`, { method: 'DELETE' }),
    onMutate: () => setFeedback(null),
    onSuccess: async (_data, id) => {
      if (editing?.id === id) resetEditor();
      setFeedback({ tone: 'good', text: 'Tenant task permanently deleted.' });
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-tasks'] });
    }
  });

  const saving = createTask.isPending || updateTask.isPending;
  const mutationError = createTask.error || updateTask.error || completeTask.error || deleteTask.error;
  const canSave = Boolean(form.tenant_id && form.title.trim());

  const startEdit = (task: TenantTask) => {
    updateFilter('tenant_id', task.tenant_id);
    setEditing({ id: task.id, tenantId: task.tenant_id, tenantName: task.tenant_name || task.tenant_id });
    setForm({
      tenant_id: task.tenant_id,
      title: task.title,
      description: task.description || '',
      category: isKnownValue(task.category, categories) ? task.category : 'general',
      priority: isKnownValue(task.priority, priorities) ? task.priority : 'normal',
      status: isKnownValue(task.status, statuses) ? task.status : 'open',
      due_at: toLocalDateTimeInput(task.due_at),
      assigned_platform_user_id: canReadPlatformUsers ? (task.assigned_platform_user_id || '') : ''
    });
    createTask.reset();
    updateTask.reset();
    scrollToFormSection('platform-tenant-tasks-form');
  };

  const completeSelectedTask = (task: TenantTask) => {
    if (window.confirm(`Mark “${task.title}” complete? This records completion of the application task; it does not independently prove an external/customer outcome.`)) {
      completeTask.mutate(task.id);
    }
  };

  const deleteSelectedTask = (task: TenantTask) => {
    if (window.confirm(`Permanently delete “${task.title}”? Prefer Cancel when the task should remain in operational history. Deletion can remove this task from timeline/readiness evidence.`)) {
      deleteTask.mutate(task.id);
    }
  };

  const heroStatus = invalidFilters ? 'Filter invalid' : initialTasksError ? 'Unavailable' : refreshTasksError ? 'Stale snapshot' : tasks.isLoading && !tasks.data ? 'Loading' : 'Operational queue';
  const heroStatusLabel = invalidFilters ? 'Clear invalid URL filters' : initialTasksError ? 'Retry required' : refreshTasksError ? 'Last successful data retained' : 'Application-maintained tenant work';

  const currentAssignedUserMissing = Boolean(form.assigned_platform_user_id && !activePlatformUsers.some((user) => user.id === form.assigned_platform_user_id));

  return (
    <div className="io-operational-page io-workspace-page platform-tenant-tasks">
      <OperationalWorkspaceHero
        iconPath="/platform/tenant-tasks"
        eyebrow="Platform tenant operations"
        title="Tenant tasks"
        description="Track Platform-owned work for a tenant across onboarding, support, billing, security, migration and offboarding. Task status and completion are application-maintained operational state; they do not independently prove an external/customer outcome was completed."
        meta={(
          <>
            <OperationalWorkspaceMetaPill>Source · GET /platform/tenant-tasks</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Read · TENANTS_READ</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Write · TENANTS_UPDATE</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Operator identity · PLATFORM_USERS_READ</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Current view · {selectedTenantLabel}</OperationalWorkspaceMetaPill>
          </>
        )}
        aside={(
          <div className="platform-tenant-tasks__hero-aside">
            <OperationalWorkspaceStatus value={heroStatus} label={heroStatusLabel} />
            <div className="platform-tenant-tasks__refresh-block">
              <button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={refreshing}>Refresh</button>
              <span>{refreshing ? 'Refreshing…' : 'Refresh task, summary and supporting selectors'}</span>
            </div>
          </div>
        )}
      />

      {refreshTasksError ? <div className="platform-tenant-tasks__warning">Task refresh failed. Showing the last successful task snapshot.</div> : null}
      {refreshTenantsError ? <div className="platform-tenant-tasks__warning">Tenant selector refresh failed. Showing the last successful tenant selector snapshot.</div> : null}
      {refreshSummaryError ? <div className="platform-tenant-tasks__warning">Task summary refresh failed. Showing the last successful global summary.</div> : null}
      {refreshUsersError ? <div className="platform-tenant-tasks__warning">Platform-user selector refresh failed. Showing the last successful assignment list.</div> : null}
      {feedback ? <div className="platform-tenant-tasks__feedback" data-tone={feedback.tone}>{feedback.text}</div> : null}
      {mutationError ? <div className="platform-tenant-tasks__warning">Action failed: {readableError(mutationError)}</div> : null}

      {invalidFilters ? (
        <div className="platform-tenant-tasks__blocking-error">
          <strong>One or more URL filters are invalid.</strong>
          <span>The task registry is not loaded until the invalid filter is cleared.</span>
          <button type="button" className="app-button app-button--secondary" onClick={clearInvalidFilters}>Clear invalid filters</button>
        </div>
      ) : null}

      {initialTenantsError ? (
        <div className="platform-tenant-tasks__blocking-error">
          <strong>Tenant selector could not be loaded.</strong>
          <span>{readableError(tenants.error)}</span>
          <button type="button" className="app-button app-button--secondary" onClick={() => tenants.refetch()}>Retry tenants</button>
        </div>
      ) : null}

      {initialSummaryError ? (
        <div className="platform-tenant-tasks__warning">Global task summary could not be loaded: {readableError(summary.error)} <button type="button" className="app-button app-button--secondary" onClick={() => summary.refetch()}>Retry summary</button></div>
      ) : null}
      {initialUsersError ? <div className="platform-tenant-tasks__warning">Platform-user assignment selector could not be loaded: {readableError(platformUsers.error)}. Task records remain available; assignment changes are unavailable until this is retried.</div> : null}

      <OperationalWorkspaceStats ariaLabel="Tenant task operational summary">
        <OperationalWorkspaceStatCard label="Loaded tasks" value={rows.length} helper="Current page only; not an all-registry total" tone="neutral" iconPath="/platform/tenant-tasks" loading={tasks.isLoading && !tasks.data} />
        <OperationalWorkspaceStatCard label="Open" value={summary.data?.open_count ?? '—'} helper="Global application total; not filter-scoped" tone={(summary.data?.open_count || 0) > 0 ? 'blue' : 'good'} iconPath="/platform/tenant-tasks" loading={summary.isLoading && !summary.data} />
        <OperationalWorkspaceStatCard label="Blocked" value={summary.data?.blocked_count ?? '—'} helper="Global application total; not filter-scoped" tone={(summary.data?.blocked_count || 0) > 0 ? 'warn' : 'good'} iconPath="/platform/tenant-health" loading={summary.isLoading && !summary.data} />
        <OperationalWorkspaceStatCard label="Overdue" value={summary.data?.overdue_count ?? '—'} helper="Global open tasks past due" tone={(summary.data?.overdue_count || 0) > 0 ? 'warn' : 'good'} iconPath="/platform/customer-success-admin" loading={summary.isLoading && !summary.data} />
        <OperationalWorkspaceStatCard label="Urgent" value={summary.data?.urgent_count ?? '—'} helper="Global open tasks with urgent priority" tone={(summary.data?.urgent_count || 0) > 0 ? 'warn' : 'good'} iconPath="/platform/support-operations-cockpit" loading={summary.isLoading && !summary.data} />
      </OperationalWorkspaceStats>

      <section className="io-workspace-card platform-tenant-tasks__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-tasks"
          title="Task filters"
          description="Filters are stored in the URL so Tenants, Customer Success, onboarding, support and readiness pages can carry tenant/task context safely."
        />
        <div className="platform-tenant-tasks__form-grid platform-tenant-tasks__form-grid--filters">
          <label>Tenant
            <select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)} disabled={Boolean(initialTenantsError)}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label>Status
            <select value={status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">All statuses</option>
              {statuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
          </label>
          <label>Category
            <select value={category} onChange={(event) => updateFilter('category', event.target.value)}>
              <option value="">All categories</option>
              {categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
          </label>
          <label>Priority
            <select value={priority} onChange={(event) => updateFilter('priority', event.target.value)}>
              <option value="">All priorities</option>
              {priorities.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
          </label>
          {canReadPlatformUsers ? (
            <label>Assigned operator
              <select value={assignedPlatformUserId} onChange={(event) => updateFilter('assigned_platform_user_id', event.target.value)} disabled={Boolean(initialUsersError)}>
                <option value="">All assignees</option>
                {activePlatformUsers.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
              </select>
            </label>
          ) : assignedPlatformUserId ? (
            <div className="platform-tenant-tasks__inline-note">An assigned-operator filter is active. Operator identity is hidden without PLATFORM_USERS_READ. <button type="button" className="app-button app-button--secondary" onClick={() => updateFilter('assigned_platform_user_id', '')}>Clear</button></div>
          ) : null}
          <label className="platform-tenant-tasks__checkbox"><input type="checkbox" checked={includeClosed} onChange={(event) => updateFilter('include_closed', event.target.checked)} /> Include completed/cancelled</label>
          <label className="platform-tenant-tasks__checkbox"><input type="checkbox" checked={overdueOnly} onChange={(event) => updateFilter('overdue_only', event.target.checked)} /> Overdue only</label>
        </div>
      </section>

      {canWrite ? (
        <section id="platform-tenant-tasks-form" className="io-workspace-card platform-tenant-tasks__section">
          <OperationalSectionHeader
            iconPath="/platform/tenant-tasks"
            title={editing ? `Edit task · ${editing.tenantName}` : 'Create tenant task'}
            description={editing ? 'Tenant ownership is immutable after creation. Update the task state, due date, priority, description or assignment without silently moving evidence to another tenant.' : 'Create application-owned Platform work for a specific tenant. Use Cancel rather than Delete when the historical task record should remain visible.'}
          />

          {editing ? <div className="platform-tenant-tasks__inline-note"><strong>Tenant fixed:</strong> {editing.tenantName} · {editing.tenantId}</div> : null}
          <div className="platform-tenant-tasks__form-grid">
            {!editing ? (
              <label>Tenant
                <select value={form.tenant_id} onChange={(event) => setForm({ ...form, tenant_id: event.target.value })} disabled={Boolean(initialTenantsError)}>
                  <option value="">Select tenant</option>
                  {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
                </select>
              </label>
            ) : null}
            <label className="platform-tenant-tasks__title-field">Title
              <input value={form.title} maxLength={200} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Operational task" />
            </label>
            <label>Category
              <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select>
            </label>
            <label>Priority
              <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{priorities.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select>
            </label>
            <label>Status
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select>
            </label>
            <label>Due at
              <input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} />
            </label>
            {canReadPlatformUsers ? (
              <label>Assigned operator
                <select value={form.assigned_platform_user_id} onChange={(event) => setForm({ ...form, assigned_platform_user_id: event.target.value })} disabled={Boolean(initialUsersError)}>
                  <option value="">Unassigned</option>
                  {currentAssignedUserMissing ? <option value={form.assigned_platform_user_id}>Current assignee · unavailable/inactive</option> : null}
                  {activePlatformUsers.map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
                </select>
              </label>
            ) : <div className="platform-tenant-tasks__inline-note">Assignment changes require PLATFORM_USERS_READ. Task editing remains available without exposing the Platform user directory.</div>}
          </div>
          <label className="platform-tenant-tasks__notes-label">Description / next step
            <textarea value={form.description} maxLength={4000} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe the next operational step, blocker, or expected result." />
          </label>
          <div className="platform-tenant-tasks__action-row">
            <button type="button" className="app-button app-button--primary" disabled={!canSave || saving} onClick={() => editing ? updateTask.mutate(editing.id) : createTask.mutate()}>{saving ? 'Saving…' : editing ? 'Save task' : 'Create task'}</button>
            {editing ? <button type="button" className="app-button app-button--secondary" onClick={resetEditor} disabled={saving}>Cancel edit</button> : null}
          </div>
        </section>
      ) : null}

      <section className="io-workspace-card platform-tenant-tasks__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-tasks"
          title="Task registry"
          description="Urgent and high-priority tasks sort first, then due date and creation time. The API uses deterministic ID tie-breaking and bounded pagination. Current-page metrics are not all-registry totals."
          actions={(
            <div className="platform-tenant-tasks__pagination">
              <button type="button" className="app-button app-button--secondary" disabled={!hasPreviousPage || tasks.isFetching} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}>Previous</button>
              <span>Page {pageNumber}</span>
              <button type="button" className="app-button app-button--secondary" disabled={!hasNextPage || tasks.isFetching} onClick={() => setOffset(offset + PAGE_SIZE)}>Next</button>
            </div>
          )}
        />

        {initialTasksError ? (
          <div className="platform-tenant-tasks__blocking-error">
            <strong>Tenant tasks could not be loaded.</strong>
            <span>{readableError(tasks.error)}</span>
            <button type="button" className="app-button app-button--secondary" onClick={() => tasks.refetch()}>Retry</button>
          </div>
        ) : null}
        {tasks.isLoading && !tasks.data && !invalidFilters ? <div className="platform-tenant-tasks__loading">Loading tenant tasks…</div> : null}
        {!initialTasksError && !tasks.isLoading && !invalidFilters && rows.length === 0 ? (
          <div className="platform-tenant-tasks__empty">
            <strong>No stored tenant tasks match this view.</strong>
            <span>This means the application returned no matching task rows for these filters. It does not prove no external, customer, support, billing or operational work exists elsewhere.</span>
          </div>
        ) : null}

        {rows.length ? (
          <div className="platform-tenant-tasks__list">
            {rows.map((task) => (
              <article key={task.id} className="platform-tenant-tasks__card" data-overdue={task.is_overdue ? 'true' : 'false'} data-closed={task.is_closed ? 'true' : 'false'}>
                <div className="platform-tenant-tasks__card-header">
                  <div className="platform-tenant-tasks__card-title">
                    <h4>{task.title}</h4>
                    <div className="platform-tenant-tasks__badge-row">
                      <span className="platform-tenant-tasks__badge" data-tone="platform">{humanize(task.category)}</span>
                      <span className="platform-tenant-tasks__badge" data-tone={task.priority === 'urgent' || task.priority === 'high' ? 'warn' : 'neutral'}>{humanize(task.priority)}</span>
                      <span className="platform-tenant-tasks__badge" data-tone={task.status === 'completed' ? 'good' : task.status === 'blocked' ? 'warn' : 'neutral'}>{humanize(task.status)}</span>
                      {task.is_overdue ? <span className="platform-tenant-tasks__badge" data-tone="warn">Overdue</span> : null}
                    </div>
                  </div>
                  <div className="platform-tenant-tasks__tenant-label"><strong>{task.tenant_name || task.tenant_id}</strong><span>{task.tenant_id}</span></div>
                </div>

                <div className="platform-tenant-tasks__evidence-grid">
                  <div><span>Due</span><strong>{dateTime(task.due_at)}</strong></div>
                  <div><span>Completed</span><strong>{dateTime(task.completed_at)}</strong></div>
                  <div><span>Created</span><strong>{dateTime(task.created_at)}</strong></div>
                  <div><span>Updated</span><strong>{dateTime(task.updated_at)}</strong></div>
                </div>

                {task.description ? <p className="platform-tenant-tasks__notes">{task.description}</p> : <div className="platform-tenant-tasks__inline-note">No description or next-step text is stored for this task.</div>}

                {canReadPlatformUsers ? (
                  <div className="platform-tenant-tasks__provenance">
                    <span>Assigned · {task.assigned_platform_user_email || 'Unassigned'}</span>
                    <span>Created by · {task.created_by_platform_user_email || 'Unknown platform operator'}</span>
                    {task.completed_at ? <span>Completed by · {task.completed_by_platform_user_email || 'Unknown platform operator'}</span> : null}
                  </div>
                ) : <div className="platform-tenant-tasks__identity-note">Platform operator identity fields are redacted by the API unless PLATFORM_USERS_READ is present.</div>}

                <div className="platform-tenant-tasks__truth-note">This row records application-maintained task state. “Completed” means this Platform task record was marked completed; it does not independently prove an external deliverable, customer acknowledgement, billing outcome, security result or other real-world outcome.</div>

                <div className="platform-tenant-tasks__action-row">
                  {canWrite && !task.is_closed ? <button type="button" className="app-button app-button--primary" onClick={() => completeSelectedTask(task)} disabled={completeTask.isPending}>Complete</button> : null}
                  {canWrite ? <button type="button" className="app-button app-button--secondary" onClick={() => startEdit(task)} disabled={saving}>Edit</button> : null}
                  <Link className="app-button app-button--secondary" to={`/platform/tenants?tenant_id=${encodeURIComponent(task.tenant_id)}`}>Tenant record</Link>
                  <Link className="app-button app-button--secondary" to={`/platform/tenant-communications?tenant_id=${encodeURIComponent(task.tenant_id)}`}>Communications</Link>
                  <Link className="app-button app-button--secondary" to={`/platform/tenant-timeline?tenant_id=${encodeURIComponent(task.tenant_id)}`}>Timeline</Link>
                  {canWrite ? <button type="button" className="app-button app-button--danger" onClick={() => deleteSelectedTask(task)} disabled={deleteTask.isPending}>Delete permanently</button> : null}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="io-workspace-card platform-tenant-tasks__section">
        <OperationalSectionHeader
          iconPath="/platform/tenant-timeline"
          title="Supporting tenant operations"
          description="Open the underlying tenant, communication, note, timeline, customer-success, support, billing, runbook or Platform-user surfaces when task evidence points to work that must be verified or completed elsewhere."
        />
        <div className="platform-tenant-tasks__link-row">
          <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link>
          <Link to={tenantId ? `/platform/tenant-contacts?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-contacts'}>Tenant contacts</Link>
          <Link to={tenantId ? `/platform/tenant-notes?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-notes'}>Tenant notes</Link>
          <Link to={tenantId ? `/platform/tenant-communications?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-communications'}>Communications</Link>
          <Link to={tenantId ? `/platform/tenant-timeline?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-timeline'}>Tenant timeline</Link>
          <Link to={tenantId ? `/platform/customer-success-admin?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/customer-success-admin'}>Customer Success</Link>
          {canOpenSupportCockpit ? <Link to={tenantId ? `/platform/support-operations-cockpit?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/support-operations-cockpit'}>Support Operations</Link> : null}
          {canReadBilling && tenantId ? <Link to={`/platform/billing?tenant_id=${encodeURIComponent(tenantId)}`}>Billing</Link> : null}
          {canReadRunbooks ? <Link to="/platform/runbooks">Runbooks</Link> : null}
          {canReadPlatformUsers ? <Link to="/platform/users">Platform users</Link> : null}
        </div>
      </section>
    </div>
  );
}
