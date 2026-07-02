import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

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
function trimOrNull(value: string) { const trimmed = value.trim(); return trimmed || null; }
function isValidEmail(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()); }
function isValidDateInput(value: string) { return !value || !Number.isNaN(new Date(value).getTime()); }
function SourceLink({ href, children }: { href: string; children: string }) { return <a href={href} style={styles.link}>{children}</a>; }

export default function PlatformPrivacyRequestsPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_PRIVACY_WRITE);
  const [filters, setFilters] = useState({ tenant_id: '', status: '', request_type: '', search: '', overdue: false });
  const [form, setForm] = useState(defaultForm);
  const [originalForm, setOriginalForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [closeNotes, setCloseNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.request_type) params.set('request_type', filters.request_type);
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.overdue) params.set('overdue', 'true');
    params.set('limit', '200');
    return params.toString();
  }, [filters]);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'privacy-picker'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const users = useQuery({ queryKey: ['platform', 'users', 'privacy-assignee-picker'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users') });
  const summary = useQuery({ queryKey: ['platform', 'privacy-requests', 'summary'], queryFn: () => platformApiRequest<SummaryResponse>('/platform/privacy-requests/summary') });
  const requests = useQuery({ queryKey: ['platform', 'privacy-requests', filters], queryFn: () => platformApiRequest<RequestsResponse>(`/platform/privacy-requests?${queryString}`) });
  const isLoading = tenants.isLoading || users.isLoading || summary.isLoading || requests.isLoading;
  const loadError = tenants.error || users.error || summary.error || requests.error;
  const refreshAll = () => {
    setStatusMessage('Refreshing privacy request evidence...');
    tenants.refetch();
    users.refetch();
    summary.refetch();
    requests.refetch();
  };

  const saveRequest = useMutation({
    mutationFn: () => platformApiRequest(editingId ? `/platform/privacy-requests/${editingId}` : '/platform/privacy-requests', {
      method: editingId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        tenant_id: form.tenant_id || null,
        request_type: form.request_type,
        status: form.status,
        priority: form.priority,
        requester_name: trimOrNull(form.requester_name),
        requester_email: form.requester_email.trim(),
        subject_identifier: trimOrNull(form.subject_identifier),
        summary: form.summary.trim(),
        due_at: form.due_at || null,
        assigned_platform_user_id: form.assigned_platform_user_id || null
      })
    }),
    onSuccess: () => { setStatusMessage(editingId ? 'Privacy request updated.' : 'Privacy request created.'); setForm(defaultForm); setOriginalForm(defaultForm); setEditingId(null); queryClient.invalidateQueries({ queryKey: ['platform', 'privacy-requests'] }); }
  });

  const verifyRequest = useMutation({ mutationFn: (id: string) => platformApiRequest(`/platform/privacy-requests/${id}/verify`, { method: 'POST', body: JSON.stringify({ notes: closeNotes.trim() }) }), onSuccess: () => { setStatusMessage('Privacy request verified.'); setCloseNotes(''); queryClient.invalidateQueries({ queryKey: ['platform', 'privacy-requests'] }); } });
  const closeRequest = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => platformApiRequest(`/platform/privacy-requests/${id}/close`, { method: 'POST', body: JSON.stringify({ status, resolution_notes: closeNotes.trim(), rejection_reason: rejectReason.trim() }) }), onSuccess: (_data, variables) => { setStatusMessage(variables.status === 'rejected' ? 'Privacy request rejected.' : 'Privacy request fulfilled.'); setCloseNotes(''); setRejectReason(''); queryClient.invalidateQueries({ queryKey: ['platform', 'privacy-requests'] }); } });

  const requestTypes = requests.data?.request_types || ['access', 'export', 'deletion', 'correction', 'consent', 'restriction', 'objection', 'other'];
  const statuses = requests.data?.statuses || ['intake', 'verifying', 'in_progress', 'waiting_tenant', 'fulfilled', 'rejected', 'cancelled'];
  const priorities = requests.data?.priorities || ['low', 'normal', 'high', 'urgent'];
  const rows = requests.data?.requests || [];
  const hasOpenRequests = rows.some((row) => !['fulfilled', 'rejected', 'cancelled'].includes(row.status));
  const isRequestClosed = (status: string) => ['fulfilled', 'rejected', 'cancelled'].includes(status);
  const closeActionDisabled = closeRequest.isPending || !closeNotes.trim();
  const rejectActionDisabled = closeRequest.isPending || !rejectReason.trim();

  const startEdit = (row: PrivacyRequest) => {
    const nextForm = { tenant_id: row.tenant_id || '', request_type: row.request_type, status: row.status, priority: row.priority, requester_name: row.requester_name || '', requester_email: row.requester_email, subject_identifier: row.subject_identifier || '', summary: row.summary, due_at: row.due_at ? row.due_at.slice(0, 16) : '', assigned_platform_user_id: row.assigned_platform_user_id || '' };
    setEditingId(row.id);
    setForm(nextForm);
    setOriginalForm(nextForm);
    scrollToFormSection('platform-privacy-requests-form');
  };

  const requiredFieldsMissing = !form.requester_email.trim() || !form.summary.trim();
  const invalidEmail = Boolean(form.requester_email.trim()) && !isValidEmail(form.requester_email);
  const invalidDueAt = !isValidDateInput(form.due_at);
  const formChanged = JSON.stringify(form) !== JSON.stringify(editingId ? originalForm : defaultForm);
  const saveDisabled = saveRequest.isPending || requiredFieldsMissing || invalidEmail || invalidDueAt || Boolean(editingId && !formChanged);
  const showRequiredMessage = requiredFieldsMissing && (Boolean(editingId) || Boolean(form.requester_email.trim()) || Boolean(form.summary.trim()));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Privacy requests</h1>
          <p style={styles.subtitle}>Track data-subject/privacy requests, deadlines, verification, and closure across tenants.</p>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={refreshAll} disabled={isLoading}>{isLoading ? 'Refreshing...' : 'Refresh'}</button>
      </header>

      {statusMessage ? <div style={styles.notice}>{statusMessage}</div> : null}
      {loadError ? (
        <section style={styles.errorPanel}>
          <strong>Privacy request data could not be loaded.</strong>
          <span>Retry the source lists, summary, and request table before making workflow decisions.</span>
          <button type="button" style={styles.secondaryButton} onClick={refreshAll}>Retry</button>
        </section>
      ) : null}

      <section style={styles.grid}>
        <div style={styles.metric}><strong>{summary.data?.summary.open ?? 0}</strong><span>Open</span></div>
        <div style={styles.metric}><strong>{summary.data?.summary.overdue ?? 0}</strong><span>Overdue</span></div>
        <div style={styles.metric}><strong>{summary.data?.summary.waiting_tenant ?? 0}</strong><span>Waiting tenant</span></div>
        <div style={styles.metric}><strong>{summary.data?.summary.high_priority_open ?? 0}</strong><span>High priority</span></div>
      </section>

      <section style={styles.metaGrid}>
        <div><strong>Snapshot source</strong><span>GET /platform/privacy-requests/summary and /platform/privacy-requests?limit=200</span></div>
        <div><strong>Current filters</strong><span>{filters.tenant_id || 'all tenants'} · {filters.status || 'all statuses'} · {filters.request_type || 'all types'} · {filters.overdue ? 'overdue only' : 'all due states'}</span></div>
        <div><strong>Rows shown</strong><span>{rows.length} request records</span></div>
        <div><strong>Workflow owner</strong><span>Platform Privacy Requests; source evidence is stored in platform audit events.</span></div>
      </section>

      <section style={styles.supportingLinks}>
        <strong>Supporting Platform pages</strong>
        <SourceLink href="/platform/compliance-docs">Compliance Docs</SourceLink>
        <SourceLink href="/platform/compliance-export">Compliance Export</SourceLink>
        <SourceLink href="/platform/legal-compliance-reporting">Legal & Compliance Reporting</SourceLink>
        <SourceLink href="/platform/access-reviews">Access Reviews</SourceLink>
        <SourceLink href="/platform/tenants">Tenants</SourceLink>
      </section>

      <section id="platform-privacy-requests-form" style={styles.card}>
        <h2 style={styles.cardTitle}>{editingId ? 'Edit privacy request' : 'Create privacy request'}</h2>
        {showRequiredMessage ? <div style={styles.validation}>Requester email and request summary are required.</div> : null}
        {invalidEmail ? <div style={styles.validation}>Requester email must be a valid email address.</div> : null}
        {invalidDueAt ? <div style={styles.validation}>Due at must be a valid date/time.</div> : null}
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>Tenant<select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} style={styles.input}><option value="">Platform / no tenant</option>{(tenants.data || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label style={styles.fieldLabel}>Request type<select value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })} style={styles.input}>{requestTypes.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label style={styles.fieldLabel}>Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={styles.input}>{statuses.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label style={styles.fieldLabel}>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={styles.input}>{priorities.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label style={styles.fieldLabel}>Requester name<input value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} placeholder="Requester name" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Requester email<input value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} placeholder="requester@example.com" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Subject identifier<input value={form.subject_identifier} onChange={(e) => setForm({ ...form, subject_identifier: e.target.value })} placeholder="Subject identifier" style={styles.input} /></label>
          <label style={styles.fieldLabel}>Due at<input type="datetime-local" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} style={styles.input} /></label>
          <label style={styles.fieldLabel}>Assignee<select value={form.assigned_platform_user_id} onChange={(e) => setForm({ ...form, assigned_platform_user_id: e.target.value })} style={styles.input}><option value="">Unassigned</option>{(users.data || []).map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}</select></label>
        </div>
        <label style={styles.fieldLabel}>Request summary<textarea value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Request summary" style={styles.textarea} /></label>
        {canWrite ? <button type="button" style={saveDisabled ? styles.disabledButton : styles.primaryButton} onClick={() => saveRequest.mutate()} disabled={saveDisabled}>{editingId ? 'Save changes' : 'Create request'}</button> : null}
        {editingId ? <button type="button" style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm(defaultForm); setOriginalForm(defaultForm); }}>Cancel edit</button> : null}
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
                <td>{row.summary}<br /><span style={styles.muted}>Created {dateLabel(row.created_at)} · Updated {dateLabel(row.updated_at)}</span>{row.verified_at ? <><br /><span style={styles.muted}>Verified {dateLabel(row.verified_at)}</span></> : null}{row.completed_at ? <><br /><span style={styles.muted}>Closed {dateLabel(row.completed_at)}</span></> : null}{row.resolution_notes ? <><br /><span style={styles.muted}>Notes: {row.resolution_notes}</span></> : null}{row.rejection_reason ? <><br /><span style={styles.muted}>Reject reason: {row.rejection_reason}</span></> : null}<br /><SourceLink href="/platform/audit">Audit evidence</SourceLink></td>
                <td style={styles.actions}>{canWrite ? (isRequestClosed(row.status) ? <span style={styles.muted}>Closed</span> : <><button type="button" style={styles.smallButton} onClick={() => startEdit(row)} disabled={saveRequest.isPending}>Edit</button><button type="button" style={verifyRequest.isPending ? styles.disabledSmallButton : styles.smallButton} onClick={() => { if (window.confirm('Verify this privacy request and move it to in_progress?')) verifyRequest.mutate(row.id); }} disabled={verifyRequest.isPending}>Verify</button><button type="button" style={closeActionDisabled ? styles.disabledSmallButton : styles.smallButton} onClick={() => { if (window.confirm('Fulfill and close this privacy request?')) closeRequest.mutate({ id: row.id, status: 'fulfilled' }); }} disabled={closeActionDisabled}>Fulfill</button><button type="button" style={rejectActionDisabled ? styles.disabledDangerButton : styles.dangerButton} onClick={() => { if (window.confirm('Reject and close this privacy request?')) closeRequest.mutate({ id: row.id, status: 'rejected' }); }} disabled={rejectActionDisabled}>Reject</button></>) : '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {canWrite && hasOpenRequests ? (
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>Verification / resolution notes<input value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} placeholder="Verification / resolution notes" style={styles.input} /></label>
            <label style={styles.fieldLabel}>Rejection reason<input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason" style={styles.input} /></label>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { padding: 24, display: 'grid', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#64748b' },
  notice: { border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 12px', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700 },
  errorPanel: { border: '1px solid #fecaca', borderRadius: 12, padding: 16, background: '#fef2f2', color: '#991b1b', display: 'grid', gap: 8 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  metric: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fff', display: 'grid', gap: 4 },
  card: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fff', display: 'grid', gap: 12 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  supportingLinks: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  cardTitle: { margin: 0, fontSize: 18 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  fieldLabel: { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, color: '#334155' },
  validation: { border: '1px solid #facc15', borderRadius: 8, padding: '9px 12px', background: '#fefce8', color: '#92400e', fontWeight: 700 },
  input: { width: '100%', boxSizing: 'border-box', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 },
  textarea: { width: '100%', boxSizing: 'border-box', minHeight: 80, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 },
  checkbox: { display: 'flex', alignItems: 'center', gap: 8, color: '#334155' },
  primaryButton: { border: 0, borderRadius: 8, padding: '9px 12px', background: '#2563eb', color: '#fff', cursor: 'pointer' },
  disabledButton: { border: 0, borderRadius: 8, padding: '9px 12px', background: '#9ca3af', color: '#fff', cursor: 'not-allowed' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '9px 12px', background: '#fff', cursor: 'pointer' },
  smallButton: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff', cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 8, padding: '6px 8px', background: '#fee2e2', color: '#991b1b', cursor: 'pointer' },
  disabledSmallButton: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#e5e7eb', color: '#64748b', cursor: 'not-allowed' },
  disabledDangerButton: { border: '1px solid #fecaca', borderRadius: 8, padding: '6px 8px', background: '#fee2e2', color: '#991b1b', opacity: 0.55, cursor: 'not-allowed' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  badge: { borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  muted: { color: '#64748b', fontSize: 12 },
  link: { color: '#2563eb', fontWeight: 700, textDecoration: 'none' },
  actions: { display: 'flex', gap: 6, flexWrap: 'wrap' }
};
