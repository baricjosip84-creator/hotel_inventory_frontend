import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export default function PlatformTenantTasksPage() {
  const qc = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const [tenantId, setTenantId] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);

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
  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);

  const payload = () => ({
    ...form,
    tenant_id: form.tenant_id || tenantId,
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
    onSuccess: async () => { setForm(blankForm); await invalidate(); }
  });

  const update = useMutation({
    mutationFn: (id: string) => platformApiRequest<TenantTask>(`/platform/tenant-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(payload()) }),
    onSuccess: async () => { setEditingId(null); setForm(blankForm); await invalidate(); }
  });

  const complete = useMutation({
    mutationFn: (id: string) => platformApiRequest<TenantTask>(`/platform/tenant-tasks/${id}/complete`, { method: 'POST' }),
    onSuccess: invalidate
  });

  const remove = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-tasks/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate
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
    </header>

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
        <button style={styles.button} disabled={!(form.tenant_id || tenantId) || !form.title || create.isPending || update.isPending} onClick={() => editingId ? update.mutate(editingId) : create.mutate()}>{editingId ? 'Save task' : 'Create task'}</button>
        {editingId ? <button style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm(blankForm); }}>Cancel edit</button> : null}
      </div>
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
      {update.error ? <div style={styles.error}>{readableError(update.error)}</div> : null}
    </section> : null}

    {tasks.error ? <div style={styles.error}>{readableError(tasks.error)}</div> : null}

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
          {!task.is_closed ? <button style={styles.button} disabled={complete.isPending} onClick={() => complete.mutate(task.id)}>Complete</button> : null}
          <button style={styles.secondaryButton} onClick={() => startEdit(task)}>Edit</button>
          <button style={styles.dangerButton} disabled={remove.isPending} onClick={() => remove.mutate(task.id)}>Delete</button>
        </div> : null}
      </article>)}
      {!tasks.isLoading && rows.length === 0 ? <div style={styles.empty}>No tenant tasks match the current filters.</div> : null}
    </section>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px' },
  title: { margin: 0, fontSize: '28px' },
  muted: { color: '#6b7280', margin: '4px 0' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', display: 'grid', gap: '12px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px' },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', minHeight: '80px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px' },
  actions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  button: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#111827', color: '#fff', cursor: 'pointer', width: 'fit-content' },
  secondaryButton: { padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px', background: '#fff', color: '#111827', cursor: 'pointer' },
  dangerButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#991b1b', color: '#fff', cursor: 'pointer' },
  error: { color: '#991b1b', background: '#fee2e2', borderRadius: '10px', padding: '10px' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
  summaryCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between' },
  list: { display: 'grid', gap: '12px' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px' },
  cardTitle: { margin: 0 },
  badges: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-end' },
  badge: { background: '#eef2ff', color: '#3730a3', padding: '4px 10px', borderRadius: '999px', height: 'fit-content' },
  warningBadge: { background: '#ffedd5', color: '#9a3412', padding: '4px 10px', borderRadius: '999px', height: 'fit-content' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px' }
};
