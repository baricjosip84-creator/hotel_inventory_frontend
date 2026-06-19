import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type PlatformUser = { id: string; email: string; name?: string | null };
type PrivacyRequest = {
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  request_type: string;
  status: string;
  priority: string;
  requester_name?: string | null;
  requester_email: string;
  subject_identifier?: string | null;
  summary: string;
  due_at?: string | null;
  assigned_platform_user_id?: string | null;
  assignee_email?: string | null;
  verified_at?: string | null;
  completed_at?: string | null;
  resolution_notes?: string | null;
  rejection_reason?: string | null;
  is_overdue?: boolean;
  created_at: string;
  updated_at: string;
};
type RequestsResponse = { requests: PrivacyRequest[]; request_types: string[]; statuses: string[]; priorities: string[] };
type SummaryResponse = { summary: { total: number; open: number; overdue: number; waiting_tenant: number; high_priority_open: number }; by_type: { request_type: string; count: number }[]; by_status: { status: string; count: number }[] };

const defaultForm = { tenant_id: '', request_type: 'access', status: 'intake', priority: 'normal', requester_name: '', requester_email: '', subject_identifier: '', summary: '', due_at: '', assigned_platform_user_id: '' };
function dateLabel(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function badgeStyle(row: PrivacyRequest): CSSProperties {
  if (row.is_overdue) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (row.status === 'fulfilled') return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  if (row.status === 'rejected' || row.status === 'cancelled') return { ...styles.badge, background: '#e5e7eb', color: '#374151' };
  if (row.priority === 'urgent' || row.priority === 'high') return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dbeafe', color: '#1d4ed8' };
}

export default function PlatformPrivacyRequestsPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_WRITE);
  const [filters, setFilters] = useState({ tenant_id: '', status: '', request_type: '', search: '', overdue: false });
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closeNotes, setCloseNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.request_type) params.set('request_type', filters.request_type);
    if (filters.search) params.set('search', filters.search);
    if (filters.overdue) params.set('overdue', 'true');
    params.set('limit', '200');
    return params.toString();
  }, [filters]);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'privacy-picker'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const users = useQuery({ queryKey: ['platform', 'users', 'privacy-assignee-picker'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users') });
  const summary = useQuery({ queryKey: ['platform', 'privacy-requests', 'summary'], queryFn: () => platformApiRequest<SummaryResponse>('/platform/privacy-requests/summary') });
  const requests = useQuery({ queryKey: ['platform', 'privacy-requests', filters], queryFn: () => platformApiRequest<RequestsResponse>(`/platform/privacy-requests?${queryString}`) });

  const saveRequest = useMutation({
    mutationFn: () => platformApiRequest(editingId ? `/platform/privacy-requests/${editingId}` : '/platform/privacy-requests', {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        tenant_id: form.tenant_id || null,
        request_type: form.request_type,
        status: form.status,
        priority: form.priority,
        requester_name: form.requester_name || null,
        requester_email: form.requester_email,
        subject_identifier: form.subject_identifier || null,
        summary: form.summary,
        due_at: form.due_at || null,
        assigned_platform_user_id: form.assigned_platform_user_id || null
      })
    }),
    onSuccess: () => { setForm(defaultForm); setEditingId(null); queryClient.invalidateQueries({ queryKey: ['platform', 'privacy-requests'] }); }
  });

  const verifyRequest = useMutation({ mutationFn: (id: string) => platformApiRequest(`/platform/privacy-requests/${id}/verify`, { method: 'POST', body: JSON.stringify({ notes: closeNotes }) }), onSuccess: () => { setCloseNotes(''); queryClient.invalidateQueries({ queryKey: ['platform', 'privacy-requests'] }); } });
  const closeRequest = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => platformApiRequest(`/platform/privacy-requests/${id}/close`, { method: 'POST', body: JSON.stringify({ status, resolution_notes: closeNotes, rejection_reason: rejectReason }) }), onSuccess: () => { setCloseNotes(''); setRejectReason(''); queryClient.invalidateQueries({ queryKey: ['platform', 'privacy-requests'] }); } });

  const requestTypes = requests.data?.request_types || ['access', 'export', 'deletion', 'correction', 'consent', 'restriction', 'objection', 'other'];
  const statuses = requests.data?.statuses || ['intake', 'verifying', 'in_progress', 'waiting_tenant', 'fulfilled', 'rejected', 'cancelled'];
  const priorities = requests.data?.priorities || ['low', 'normal', 'high', 'urgent'];
  const rows = requests.data?.requests || [];

  const startEdit = (row: PrivacyRequest) => {
    setEditingId(row.id);
    setForm({ tenant_id: row.tenant_id || '', request_type: row.request_type, status: row.status, priority: row.priority, requester_name: row.requester_name || '', requester_email: row.requester_email, subject_identifier: row.subject_identifier || '', summary: row.summary, due_at: row.due_at ? row.due_at.slice(0, 16) : '', assigned_platform_user_id: row.assigned_platform_user_id || '' });
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Privacy requests</h1>
          <p style={styles.subtitle}>Track data-subject/privacy requests, deadlines, verification, and closure across tenants.</p>
        </div>
      </header>

      <section style={styles.grid}>
        <div style={styles.metric}><strong>{summary.data?.summary.open ?? 0}</strong><span>Open</span></div>
        <div style={styles.metric}><strong>{summary.data?.summary.overdue ?? 0}</strong><span>Overdue</span></div>
        <div style={styles.metric}><strong>{summary.data?.summary.waiting_tenant ?? 0}</strong><span>Waiting tenant</span></div>
        <div style={styles.metric}><strong>{summary.data?.summary.high_priority_open ?? 0}</strong><span>High priority</span></div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>{editingId ? 'Edit privacy request' : 'Create privacy request'}</h2>
        <div style={styles.formGrid}>
          <select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} style={styles.input}><option value="">Platform / no tenant</option>{(tenants.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })} style={styles.input}>{requestTypes.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={styles.input}>{statuses.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={styles.input}>{priorities.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <input value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} placeholder="Requester name" style={styles.input} />
          <input value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} placeholder="Requester email" style={styles.input} />
          <input value={form.subject_identifier} onChange={(e) => setForm({ ...form, subject_identifier: e.target.value })} placeholder="Subject identifier" style={styles.input} />
          <input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} style={styles.input} />
          <select value={form.assigned_platform_user_id} onChange={(e) => setForm({ ...form, assigned_platform_user_id: e.target.value })} style={styles.input}><option value="">Unassigned</option>{(users.data || []).map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}</select>
        </div>
        <textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Request summary" style={styles.textarea} />
        {canWrite ? <button type="button" style={styles.primaryButton} onClick={() => saveRequest.mutate()} disabled={saveRequest.isPending}>{editingId ? 'Save changes' : 'Create request'}</button> : null}
        {editingId ? <button type="button" style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm(defaultForm); }}>Cancel edit</button> : null}
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Filters</h2>
        <div style={styles.formGrid}>
          <select value={filters.tenant_id} onChange={(e) => setFilters({ ...filters, tenant_id: e.target.value })} style={styles.input}><option value="">All tenants</option>{(tenants.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} style={styles.input}><option value="">All statuses</option>{statuses.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <select value={filters.request_type} onChange={(e) => setFilters({ ...filters, request_type: e.target.value })} style={styles.input}><option value="">All types</option>{requestTypes.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search requester, subject, tenant" style={styles.input} />
          <label style={styles.checkbox}><input type="checkbox" checked={filters.overdue} onChange={(e) => setFilters({ ...filters, overdue: e.target.checked })} /> overdue only</label>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Requests</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th>Requester</th><th>Tenant</th><th>Type</th><th>Status</th><th>Due</th><th>Assignee</th><th>Summary</th><th>Actions</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.id}>
                <td>{row.requester_email}<br /><span style={styles.muted}>{row.requester_name || row.subject_identifier || '—'}</span></td>
                <td>{row.tenant_name || 'Platform'}</td>
                <td>{row.request_type}<br /><span style={styles.muted}>{row.priority}</span></td>
                <td><span style={badgeStyle(row)}>{row.is_overdue ? 'overdue' : row.status}</span></td>
                <td>{dateLabel(row.due_at)}</td>
                <td>{row.assignee_email || '—'}</td>
                <td>{row.summary}</td>
                <td style={styles.actions}>{canWrite ? <><button type="button" style={styles.smallButton} onClick={() => startEdit(row)}>Edit</button><button type="button" style={styles.smallButton} onClick={() => verifyRequest.mutate(row.id)}>Verify</button><button type="button" style={styles.smallButton} onClick={() => closeRequest.mutate({ id: row.id, status: 'fulfilled' })}>Fulfill</button><button type="button" style={styles.dangerButton} onClick={() => closeRequest.mutate({ id: row.id, status: 'rejected' })}>Reject</button></> : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={styles.formGrid}>
          <input value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Verification / resolution notes" style={styles.input} />
          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason" style={styles.input} />
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { padding: 24, display: 'grid', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#64748b' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  metric: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fff', display: 'grid', gap: 4 },
  card: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fff', display: 'grid', gap: 12 },
  cardTitle: { margin: 0, fontSize: 18 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  input: { padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 },
  textarea: { minHeight: 80, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 },
  checkbox: { display: 'flex', alignItems: 'center', gap: 8, color: '#334155' },
  primaryButton: { border: 0, borderRadius: 8, padding: '9px 12px', background: '#2563eb', color: '#fff', cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 12px', background: '#fff', cursor: 'pointer' },
  smallButton: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff', cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 8, padding: '6px 8px', background: '#fee2e2', color: '#991b1b', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  badge: { borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  muted: { color: '#64748b', fontSize: 12 },
  actions: { display: 'flex', gap: 6, flexWrap: 'wrap' }
};
