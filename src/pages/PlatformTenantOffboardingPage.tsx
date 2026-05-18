import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string; status?: string; write_locked?: boolean };
type PlatformUser = { id: string; email: string; name?: string | null };
type OffboardingRow = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  tenant_status?: string;
  write_locked?: boolean;
  status: string;
  reason?: string | null;
  scheduled_for?: string | null;
  owner_platform_user_id?: string | null;
  owner_platform_user_email?: string | null;
  checklist: Record<string, boolean>;
  checklist_complete?: boolean;
  notes?: string | null;
  completed_at?: string | null;
  updated_at?: string;
};
type Checks = {
  tenant_user_count: number;
  active_tenant_sessions: number;
  active_support_sessions: number;
  open_incidents: number;
  open_tasks: number;
  last_export_at?: string | null;
};
type Detail = { offboarding: OffboardingRow | null; checks: Checks };

const statuses = ['not_started', 'planned', 'in_progress', 'blocked', 'ready_to_archive', 'completed', 'cancelled'];
const checklistKeys = [
  'customer_notified',
  'billing_closed',
  'final_export_completed',
  'active_users_reviewed',
  'active_sessions_revoked',
  'support_sessions_closed',
  'open_incidents_resolved',
  'open_tasks_closed',
  'tenant_locked',
  'data_retention_confirmed'
];
const labels: Record<string, string> = {
  customer_notified: 'Customer notified',
  billing_closed: 'Billing closed',
  final_export_completed: 'Final export completed',
  active_users_reviewed: 'Active users reviewed',
  active_sessions_revoked: 'Active sessions revoked',
  support_sessions_closed: 'Support sessions closed',
  open_incidents_resolved: 'Open incidents resolved',
  open_tasks_closed: 'Open tasks closed',
  tenant_locked: 'Tenant locked',
  data_retention_confirmed: 'Data retention confirmed'
};

const emptyChecklist = checklistKeys.reduce<Record<string, boolean>>((acc, key) => ({ ...acc, [key]: false }), {});
const blankForm = { tenant_id: '', status: 'planned', reason: '', scheduled_for: '', owner_platform_user_id: '', notes: '', checklist: emptyChecklist };

function readableError(error: unknown): string { return error instanceof Error ? error.message : 'Unknown error'; }
function formatDate(value?: string | null): string { return value ? new Date(value).toLocaleString() : '-'; }
function dateTimeLocalToIso(value: string): string | null { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function pretty(value: string): string { return value.replaceAll('_', ' '); }

export default function PlatformTenantOffboardingPage() {
  const qc = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const [tenantId, setTenantId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [archiveOnComplete, setArchiveOnComplete] = useState(true);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'for-offboarding'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const users = useQuery({ queryKey: ['platform', 'users', 'for-offboarding'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  if (statusFilter) query.set('status', statusFilter);
  query.set('include_completed', String(includeCompleted));

  const list = useQuery({ queryKey: ['platform', 'tenant-offboarding', tenantId, statusFilter, includeCompleted], queryFn: () => platformApiRequest<OffboardingRow[]>(`/platform/tenant-offboarding?${query.toString()}`) });
  const detail = useQuery({ queryKey: ['platform', 'tenant-offboarding-detail', tenantId], queryFn: () => platformApiRequest<Detail>(`/platform/tenant-offboarding/${tenantId}`), enabled: Boolean(tenantId) });

  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);
  const rows = list.data || [];
  const selected = detail.data?.offboarding || rows.find((row) => row.tenant_id === tenantId) || null;
  const checks = detail.data?.checks || null;

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['platform', 'tenant-offboarding'] }),
      qc.invalidateQueries({ queryKey: ['platform', 'tenant-offboarding-detail'] }),
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] })
    ]);
  };

  const save = useMutation({
    mutationFn: () => platformApiRequest('/platform/tenant-offboarding', {
      method: 'POST',
      body: JSON.stringify({ ...form, tenant_id: form.tenant_id || tenantId, scheduled_for: dateTimeLocalToIso(form.scheduled_for), owner_platform_user_id: form.owner_platform_user_id || null })
    }),
    onSuccess: invalidate
  });
  const complete = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-offboarding/${id}/complete`, { method: 'POST', body: JSON.stringify({ archiveTenant: archiveOnComplete }) }),
    onSuccess: invalidate
  });
  const cancel = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-offboarding/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled from platform UI' }) }),
    onSuccess: invalidate
  });

  const loadIntoForm = (row: OffboardingRow) => {
    setTenantId(row.tenant_id);
    setForm({
      tenant_id: row.tenant_id,
      status: row.status,
      reason: row.reason || '',
      scheduled_for: row.scheduled_for ? new Date(row.scheduled_for).toISOString().slice(0, 16) : '',
      owner_platform_user_id: row.owner_platform_user_id || '',
      notes: row.notes || '',
      checklist: { ...emptyChecklist, ...(row.checklist || {}) }
    });
  };

  const blockCount = checks ? checks.active_tenant_sessions + checks.active_support_sessions + checks.open_incidents + checks.open_tasks : 0;

  return <div style={styles.page}>
    <header>
      <h1>Tenant offboarding</h1>
      <p style={styles.muted}>Controlled shutdown workflow for tenants before final archive. This keeps exports, sessions, support, billing, incidents, and tasks visible before completion.</p>
    </header>

    <section style={styles.panel}>
      <h2>Filters</h2>
      <div style={styles.grid}>
        <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
          <option value="">All tenants</option>
          {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
        <select style={styles.input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}
        </select>
        <label style={styles.checkboxLabel}><input type="checkbox" checked={includeCompleted} onChange={(event) => setIncludeCompleted(event.target.checked)} /> Include completed/cancelled</label>
      </div>
    </section>

    {tenantId && checks ? <section style={styles.panel}>
      <h2>Readiness checks {selectedTenant ? `for ${selectedTenant.name}` : ''}</h2>
      <div style={styles.metrics}>
        <div style={styles.metric}><strong>{checks.tenant_user_count}</strong><span>tenant users</span></div>
        <div style={styles.metric}><strong>{checks.active_tenant_sessions}</strong><span>active tenant sessions</span></div>
        <div style={styles.metric}><strong>{checks.active_support_sessions}</strong><span>active support sessions</span></div>
        <div style={styles.metric}><strong>{checks.open_incidents}</strong><span>open incidents</span></div>
        <div style={styles.metric}><strong>{checks.open_tasks}</strong><span>open tasks</span></div>
        <div style={styles.metric}><strong>{formatDate(checks.last_export_at)}</strong><span>last export</span></div>
      </div>
      {blockCount > 0 ? <div style={styles.warning}>Completion is blocked until active sessions/support sessions/open incidents/open tasks are cleared.</div> : <div style={styles.success}>No operational blockers detected.</div>}
    </section> : null}

    {canWrite ? <section style={styles.panel}>
      <h2>{selected ? 'Update offboarding workflow' : 'Start offboarding workflow'}</h2>
      <div style={styles.grid}>
        <select style={styles.input} value={form.tenant_id || tenantId} onChange={(event) => setForm({ ...form, tenant_id: event.target.value })}>
          <option value="">Select tenant</option>
          {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select>
        <select style={styles.input} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select>
        <input style={styles.input} type="datetime-local" value={form.scheduled_for} onChange={(event) => setForm({ ...form, scheduled_for: event.target.value })} />
        <select style={styles.input} value={form.owner_platform_user_id} onChange={(event) => setForm({ ...form, owner_platform_user_id: event.target.value })}>
          <option value="">No owner</option>
          {(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
        </select>
      </div>
      <input style={styles.input} placeholder="Reason" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
      <textarea style={styles.textarea} placeholder="Notes" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <div style={styles.checklist}>
        {checklistKeys.map((key) => <label key={key} style={styles.checkItem}>
          <input type="checkbox" checked={Boolean(form.checklist[key])} onChange={(event) => setForm({ ...form, checklist: { ...form.checklist, [key]: event.target.checked } })} />
          {labels[key]}
        </label>)}
      </div>
      <div style={styles.actions}>
        <button style={styles.button} disabled={!(form.tenant_id || tenantId) || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving...' : 'Save workflow'}</button>
        {tenantId ? <>
          <label style={styles.checkboxLabel}><input type="checkbox" checked={archiveOnComplete} onChange={(event) => setArchiveOnComplete(event.target.checked)} /> Archive tenant on completion</label>
          <button style={styles.dangerButton} disabled={!selected?.checklist_complete || blockCount > 0 || complete.isPending} onClick={() => complete.mutate(tenantId)}>Complete offboarding</button>
          <button style={styles.secondaryButton} disabled={cancel.isPending} onClick={() => cancel.mutate(tenantId)}>Cancel workflow</button>
        </> : null}
      </div>
      {save.error ? <div style={styles.error}>{readableError(save.error)}</div> : null}
      {complete.error ? <div style={styles.error}>{readableError(complete.error)}</div> : null}
      {cancel.error ? <div style={styles.error}>{readableError(cancel.error)}</div> : null}
    </section> : null}

    <section style={styles.list}>
      {list.isLoading ? <div style={styles.panel}>Loading...</div> : null}
      {list.error ? <div style={styles.error}>{readableError(list.error)}</div> : null}
      {rows.map((row) => <article key={row.id} style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <strong>{row.tenant_name}</strong>
            <div style={styles.muted}>Tenant status: {row.tenant_status || '-'} · locked: {row.write_locked ? 'yes' : 'no'}</div>
          </div>
          <span style={styles.badge}>{pretty(row.status)}</span>
        </div>
        <p>{row.reason || 'No reason recorded.'}</p>
        <div style={styles.muted}>Owner: {row.owner_platform_user_email || 'unassigned'} · Scheduled: {formatDate(row.scheduled_for)} · Completed: {formatDate(row.completed_at)}</div>
        <div style={styles.progress}>{checklistKeys.filter((key) => row.checklist?.[key]).length}/{checklistKeys.length} checklist items done {row.checklist_complete ? '· ready' : ''}</div>
        <div style={styles.actions}><button style={styles.secondaryButton} onClick={() => loadIntoForm(row)}>Load/Edit</button></div>
      </article>)}
      {!list.isLoading && rows.length === 0 ? <div style={styles.panel}>No offboarding workflows found.</div> : null}
    </section>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 20 },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 },
  muted: { color: '#6b7280', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, width: '100%' },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, width: '100%', minHeight: 80, marginTop: 12 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, color: '#374151' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  metric: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 4 },
  warning: { background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 10, padding: 12, marginTop: 12 },
  success: { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 10, padding: 12, marginTop: 12 },
  checklist: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 12 },
  checkItem: { display: 'flex', gap: 8, alignItems: 'center', background: '#f9fafb', padding: 10, borderRadius: 10 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 },
  button: { padding: '10px 14px', border: 0, borderRadius: 10, background: '#111827', color: '#fff', cursor: 'pointer' },
  secondaryButton: { padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', cursor: 'pointer' },
  dangerButton: { padding: '10px 14px', border: 0, borderRadius: 10, background: '#991b1b', color: '#fff', cursor: 'pointer' },
  error: { color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 10 },
  list: { display: 'grid', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  badge: { padding: '4px 8px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontSize: 12, textTransform: 'capitalize' },
  progress: { marginTop: 10, fontWeight: 700 }
};
