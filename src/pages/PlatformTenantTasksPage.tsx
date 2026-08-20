import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type Tenant = { id: string; name: string; location?: string | null };
type PlatformUser = { id: string; email: string; name?: string | null; role?: string };
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
  completed_at?: string | null;
  is_overdue?: boolean;
  is_closed?: boolean;
};
type TaskSummary = { open_count: number; blocked_count: number; overdue_count: number; urgent_count: number; by_category: Array<{ category: string; count: number }> };

const categories = ['general', 'onboarding', 'support', 'billing', 'security', 'migration', 'offboarding'];
const priorities = ['low', 'normal', 'high', 'urgent'];
const statuses = ['open', 'in_progress', 'blocked', 'completed', 'cancelled'];

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
  return error instanceof Error ? error.message : 'Unknown error';
}

function dateTimeLocalToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function selectedTenantName(tenants: Tenant[], tenantId: string): string {
  return tenants.find((tenant) => tenant.id === tenantId)?.name || tenantId;
}

export default function PlatformTenantTasksPage() {
  const qc = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'for-tasks'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const users = useQuery({ queryKey: ['platform', 'users', 'for-tasks'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite });
  const summary = useQuery({ queryKey: ['platform', 'tenant-tasks', 'summary'], queryFn: () => platformApiRequest<TaskSummary>('/platform/tenant-tasks/summary') });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  if (status) query.set('status', status);
  if (category) query.set('category', category);
  query.set('include_closed', String(includeClosed));
  if (overdueOnly) query.set('overdue_only', 'true');

  const tasks = useQuery({
    queryKey: ['platform', 'tenant-tasks', tenantId, status, category, includeClosed, overdueOnly],
    queryFn: () => platformApiRequest<TenantTask[]>(`/platform/tenant-tasks?${query.toString()}`)
  });

  const rows = tasks.data || [];
  const activeFilters = [
    tenantId ? `tenant: ${selectedTenantName(tenants.data || [], tenantId)}` : 'tenant: all',
    status ? `status: ${status}` : 'status: all',
    category ? `category: ${category}` : 'category: all',
    includeClosed ? 'closed: included' : 'closed: hidden',
    overdueOnly ? 'overdue only' : 'overdue: all'
  ];
  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);

  const payload = () => ({
    ...form,
    tenant_id: (form.tenant_id || tenantId).trim(),
    title: form.title.trim(),
    description: form.description.trim() || null,
    due_at: dateTimeLocalToIso(form.due_at),
    assigned_platform_user_id: form.assigned_platform_user_id || null
  });

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['platform', 'tenant-tasks'] }),
      qc.invalidateQueries({ queryKey: ['platform', 'tenant-tasks', 'summary'] })
    ]);
  };

  const create = useMutation({
    mutationFn: () => platformApiRequest<TenantTask>('/platform/tenant-tasks', { method: 'POST', body: JSON.stringify(payload()) }),
    onSuccess: async () => { setSuccessMessage('Task created.'); setForm(blankForm); await invalidate(); }
  });

  const update = useMutation({
    mutationFn: (id: string) => platformApiRequest<TenantTask>(`/platform/tenant-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload()) }),
    onSuccess: async () => { setSuccessMessage('Task updated.'); setEditingId(null); setForm(blankForm); await invalidate(); }
  });

  const complete = useMutation({
    mutationFn: (id: string) => platformApiRequest<TenantTask>(`/platform/tenant-tasks/${id}/complete`, { method: 'POST' }),
    onSuccess: async () => { setSuccessMessage('Task completed.'); await invalidate(); }
  });

  const remove = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-tasks/${id}`, { method: 'DELETE' }),
    onSuccess: async () => { setSuccessMessage('Task deleted.'); await invalidate(); }
  });

  const startEdit = (task: TenantTask) => {
    setEditingId(task.id);
    scrollToFormSection('platform-tenant-tasks-form');
    setTenantId(task.tenant_id);
    setForm({
      tenant_id: task.tenant_id,
      title: task.title,
      description: task.description || '',
      category: task.category || 'general',
      priority: task.priority || 'normal',
      status: task.status || 'open',
      due_at: task.due_at ? task.due_at.slice(0, 16) : '',
      assigned_platform_user_id: task.assigned_platform_user_id || ''
    });
  };

  return <div style={styles.page}>
    <header>
      <h1 style={styles.title}>Tenant tasks</h1>
      <p style={styles.muted}>Track platform/HLA work that has to happen for a tenant: onboarding, support follow-up, billing, security, migrations, and offboarding.</p>
      <div style={styles.actions}>
        <button style={styles.secondaryButton} onClick={() => { setSuccessMessage(''); summary.refetch(); tasks.refetch(); tenants.refetch(); if (canWrite) users.refetch(); }}>Refresh</button>
      </div>
    </header>

    <section style={styles.metaPanel}>
      <span><b>Source:</b> Platform tenant tasks API</span>
      <span><b>Filters:</b> {activeFilters.join(' · ')}</span>
      <span><b>Rows shown:</b> {tasks.isLoading ? 'loading' : rows.length}</span>
      <span><b>Summary:</b> {summary.isLoading ? 'loading' : 'loaded'}</span>
    </section>

    {successMessage ? <div style={styles.success}>{successMessage}</div> : null}
    {tenants.error ? <div style={styles.error}>{readableError(tenants.error)} <button style={styles.inlineButton} onClick={() => tenants.refetch()}>Retry tenants</button></div> : null}
    {summary.error ? <div style={styles.error}>{readableError(summary.error)} <button style={styles.inlineButton} onClick={() => summary.refetch()}>Retry summary</button></div> : null}

    <section style={styles.summaryGrid}>
      <div style={styles.summaryCard}><b>Open</b><span>{summary.data?.open_count ?? '-'}</span></div>
      <div style={styles.summaryCard}><b>Blocked</b><span>{summary.data?.blocked_count ?? '-'}</span></div>
      <div style={styles.summaryCard}><b>Overdue</b><span>{summary.data?.overdue_count ?? '-'}</span></div>
      <div style={styles.summaryCard}><b>Urgent</b><span>{summary.data?.urgent_count ?? '-'}</span></div>
    </section>

    <section style={styles.panel}>
      <h2>Filters</h2>
      <div style={styles.formGrid}>
        <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
          <option value="">All tenants</option>
          {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
        <select style={styles.input} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <select style={styles.input} value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <label style={styles.checkboxLabel}><input type="checkbox" checked={includeClosed} onChange={(event) => setIncludeClosed(event.target.checked)} /> Include closed</label>
        <label style={styles.checkboxLabel}><input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} /> Overdue only</label>
      </div>
    </section>

    {canWrite ? <section id="platform-tenant-tasks-form" style={styles.panel}>
      <h2>{editingId ? 'Edit task' : 'Add task'} {selectedTenant ? `for ${selectedTenant.name}` : ''}</h2>
      <div style={styles.formGrid}>
        <select style={styles.input} value={form.tenant_id || tenantId} onChange={(event) => setForm({ ...form, tenant_id: event.target.value })}>
          <option value="">Select tenant</option>
          {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
        <input style={styles.input} placeholder="Task title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <select style={styles.input} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select style={styles.input} value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{priorities.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <select style={styles.input} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select>
        <input style={styles.input} type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} />
        <select style={styles.input} value={form.assigned_platform_user_id} onChange={(event) => setForm({ ...form, assigned_platform_user_id: event.target.value })}>
          <option value="">Unassigned</option>
          {(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
        </select>
      </div>
      <textarea style={styles.textarea} placeholder="Description / next step" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <div style={styles.actions}>
        <button style={styles.button} disabled={!(form.tenant_id || tenantId).trim() || !form.title.trim() || create.isPending || update.isPending} onClick={() => editingId ? update.mutate(editingId) : create.mutate()}>{editingId ? 'Save task' : 'Create task'}</button>
        {editingId ? <button style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm(blankForm); }}>Cancel edit</button> : null}
      </div>
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
      {update.error ? <div style={styles.error}>{readableError(update.error)}</div> : null}
    </section> : null}

    {tasks.error ? <div style={styles.error}>{readableError(tasks.error)} <button style={styles.inlineButton} onClick={() => tasks.refetch()}>Retry tasks</button></div> : null}

    <section style={styles.list}>
      {rows.map((task) => <article key={task.id} style={{ ...styles.card, borderColor: task.is_overdue ? '#f97316' : '#e5e7eb' }}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>{task.title}</h3>
            <p style={styles.muted}>{task.tenant_name || task.tenant_id} · {task.category} · due {formatDate(task.due_at)}</p>
          </div>
          <div style={styles.badges}>
            <span style={styles.badge}>{task.priority}</span>
            <span style={styles.badge}>{task.status}</span>
            {task.is_overdue ? <span style={styles.warningBadge}>overdue</span> : null}
          </div>
        </div>
        {task.description ? <p>{task.description}</p> : null}
        <p style={styles.muted}>Assigned: {task.assigned_platform_user_email || 'unassigned'} · Created by: {task.created_by_platform_user_email || '-'}</p>
        {canWrite ? <div style={styles.actions}>
          {!task.is_closed ? <button style={styles.button} disabled={complete.isPending} onClick={() => { if (window.confirm('Mark this tenant task as complete?')) complete.mutate(task.id); }}>Complete</button> : null}
          <button style={styles.secondaryButton} onClick={() => startEdit(task)}>Edit</button>
          <button style={styles.dangerButton} disabled={remove.isPending} onClick={() => { if (window.confirm('Delete this tenant task? This cannot be undone.')) remove.mutate(task.id); }}>Delete</button>
        </div> : null}
      </article>)}
      {!tasks.isLoading && rows.length === 0 ? <div style={styles.empty}>No tenant tasks match the current filters.</div> : null}
    </section>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  muted: { color: '#64748b', margin: '4px 0', lineHeight: 1.5 },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, display: 'grid', gap: 12, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#0f172a', minWidth: 0 },
  textarea: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, minHeight: 80, background: '#fff', color: '#0f172a' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, color: '#334155' },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  button: { padding: '9px 13px', border: '1px solid var(--io-primary)', borderRadius: 9, background: 'var(--io-primary)', color: '#fff', cursor: 'pointer', width: 'fit-content', fontWeight: 700, boxShadow: '0 1px 2px rgba(15,23,42,.05)' },
  secondaryButton: { padding: '9px 13px', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: 700 },
  dangerButton: { padding: '9px 13px', border: '1px solid #fecaca', borderRadius: 9, background: '#fff', color: '#b91c1c', cursor: 'pointer', fontWeight: 700 },
  error: { color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12 },
  success: { color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12 },
  inlineButton: { marginLeft: 10, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: 700 },
  metaPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 12, flexWrap: 'wrap', color: '#475569', fontSize: 13 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  summaryCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)' },
  list: { display: 'grid', gap: 12 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  cardTitle: { margin: 0, color: '#0f172a' },
  badges: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-end' },
  badge: { background: 'var(--io-primary-soft)', color: 'var(--io-primary-dark)', border: '1px solid var(--io-primary-border)', padding: '4px 10px', borderRadius: 999, height: 'fit-content', fontSize: 12, fontWeight: 700 },
  warningBadge: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: 999, height: 'fit-content', fontSize: 12, fontWeight: 700 },
  empty: { background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 12, padding: 18, color: '#64748b' }
};
