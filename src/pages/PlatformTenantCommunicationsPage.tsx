import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { scrollToFormSection } from '../lib/scrollToForm';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type Communication = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  channel: string;
  direction: string;
  subject: string;
  summary: string;
  external_reference?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  occurred_at: string;
  follow_up_required: boolean;
  follow_up_due_at?: string | null;
  resolved_at?: string | null;
  archived_at?: string | null;
  created_by_email?: string | null;
  updated_by_email?: string | null;
  resolved_by_email?: string | null;
};
type Response = { communications: Communication[]; summary: { total: number; open_followups: number; archived: number; by_channel: Record<string, number> }; channels: string[]; directions: string[] };

const defaultForm = { tenant_id: '', channel: 'email', direction: 'outbound', subject: '', summary: '', external_reference: '', contact_name: '', contact_email: '', occurred_at: '', follow_up_required: false, follow_up_due_at: '' };
function dateLabel(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function inputDateTime(value?: string | null) { if (!value) return ''; const d = new Date(value); if (Number.isNaN(d.getTime())) return ''; return d.toISOString().slice(0, 16); }
function readableError(error: unknown): string { return error instanceof Error ? error.message : 'Unknown error'; }

export default function PlatformTenantCommunicationsPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const [filters, setFilters] = useState({ tenant_id: '', channel: '', direction: '', follow_up: '', search: '', include_archived: false });
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters.channel) params.set('channel', filters.channel);
    if (filters.direction) params.set('direction', filters.direction);
    if (filters.follow_up) params.set('follow_up', filters.follow_up);
    if (filters.search) params.set('search', filters.search);
    if (filters.include_archived) params.set('include_archived', 'true');
    params.set('limit', '300');
    return params.toString();
  }, [filters]);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'communications-picker'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const communications = useQuery({ queryKey: ['platform', 'tenant-communications', filters], queryFn: () => platformApiRequest<Response>(`/platform/tenant-communications?${queryString}`) });

  const refreshAll = async () => {
    setMessage('');
    await Promise.all([tenants.refetch(), communications.refetch()]);
  };

  const communicationRows = communications.data?.communications || [];
  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === filters.tenant_id || tenant.id === form.tenant_id), [tenants.data, filters.tenant_id, form.tenant_id]);

  const communicationPayload = () => ({
    tenant_id: form.tenant_id,
    channel: form.channel,
    direction: form.direction,
    subject: form.subject.trim(),
    summary: form.summary.trim(),
    external_reference: form.external_reference.trim() || '',
    contact_name: form.contact_name.trim() || '',
    contact_email: form.contact_email.trim() || '',
    occurred_at: form.occurred_at || null,
    follow_up_required: form.follow_up_required,
    follow_up_due_at: form.follow_up_due_at || null
  });

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = communicationPayload();
      const body = JSON.stringify(payload);
      if (editingId) return platformApiRequest(`/platform/tenant-communications/${editingId}`, { method: 'PATCH', body });
      return platformApiRequest(`/platform/tenant-communications/tenants/${form.tenant_id}`, { method: 'POST', body });
    },
    onSuccess: async () => {
      setMessage(editingId ? 'Communication updated.' : 'Communication logged.');
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-communications'] });
    }
  });

  const resolveFollowUp = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-communications/${id}/resolve-follow-up`, { method: 'POST' }),
    onSuccess: async () => {
      setMessage('Communication follow-up resolved.');
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-communications'] });
    }
  });

  const archive = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-communications/${id}/archive`, { method: 'POST' }),
    onSuccess: async () => {
      setMessage('Communication archived.');
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-communications'] });
    }
  });

  const channels = communications.data?.channels || ['email', 'phone', 'meeting', 'chat', 'ticket', 'onsite', 'other'];
  const directions = communications.data?.directions || ['inbound', 'outbound', 'internal'];
  const summary = communications.data?.summary;
  const canSave = Boolean(form.subject.trim()) && Boolean(form.summary.trim()) && (Boolean(editingId) || Boolean(form.tenant_id));

  const startEdit = (item: Communication) => {
    setMessage('');
    setEditingId(item.id);
    setForm({ tenant_id: item.tenant_id, channel: item.channel, direction: item.direction, subject: item.subject, summary: item.summary, external_reference: item.external_reference || '', contact_name: item.contact_name || '', contact_email: item.contact_email || '', occurred_at: inputDateTime(item.occurred_at), follow_up_required: item.follow_up_required, follow_up_due_at: inputDateTime(item.follow_up_due_at) });
    scrollToFormSection('platform-tenant-communications-form');
  };

  const resolveSelectedFollowUp = (item: Communication) => {
    const ok = window.confirm(`Resolve follow-up for "${item.subject}"?`);
    if (ok) resolveFollowUp.mutate(item.id);
  };

  const archiveSelectedCommunication = (item: Communication) => {
    const ok = window.confirm(`Archive communication "${item.subject}"?`);
    if (ok) archive.mutate(item.id);
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Tenant communications</h1>
          <p style={styles.subtitle}>Track real contact with tenants: calls, emails, meetings, tickets, follow-ups, and customer-success handovers.</p>
        </div>
        <button style={styles.secondaryButton} onClick={refreshAll} disabled={tenants.isFetching || communications.isFetching}>{tenants.isFetching || communications.isFetching ? 'Refreshing...' : 'Refresh'}</button>
      </header>

      <section style={styles.metadataGrid}>
        <div style={styles.metadataCard}><b>Source</b><span>GET /platform/tenant-communications</span></div>
        <div style={styles.metadataCard}><b>Tenant filter</b><span>{selectedTenant?.name || 'All tenants'}</span></div>
        <div style={styles.metadataCard}><b>Channel / Direction</b><span>{filters.channel || 'All channels'} / {filters.direction || 'All directions'}</span></div>
        <div style={styles.metadataCard}><b>Loaded rows</b><span>{communications.isLoading ? 'Loading...' : communicationRows.length}</span></div>
      </section>

      <section style={styles.metrics}>
        <div style={styles.metric}><strong>{summary?.total ?? 0}</strong><span>Total shown</span></div>
        <div style={styles.metric}><strong>{summary?.open_followups ?? 0}</strong><span>Open follow-ups</span></div>
        <div style={styles.metric}><strong>{summary?.archived ?? 0}</strong><span>Archived shown</span></div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.grid6}>
          <label style={styles.label}>Tenant
            <select style={styles.input} value={filters.tenant_id} onChange={(e) => setFilters((v) => ({ ...v, tenant_id: e.target.value }))}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label style={styles.label}>Channel
            <select style={styles.input} value={filters.channel} onChange={(e) => setFilters((v) => ({ ...v, channel: e.target.value }))}>
              <option value="">All</option>{channels.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={styles.label}>Direction
            <select style={styles.input} value={filters.direction} onChange={(e) => setFilters((v) => ({ ...v, direction: e.target.value }))}>
              <option value="">All</option>{directions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label style={styles.label}>Follow-up
            <select style={styles.input} value={filters.follow_up} onChange={(e) => setFilters((v) => ({ ...v, follow_up: e.target.value }))}>
              <option value="">All</option><option value="true">Required</option><option value="false">Not required</option>
            </select>
          </label>
          <label style={styles.label}>Search
            <input style={styles.input} value={filters.search} onChange={(e) => setFilters((v) => ({ ...v, search: e.target.value }))} placeholder="subject, contact, ticket" />
          </label>
          <label style={{ ...styles.label, justifyContent: 'end' }}><span style={styles.checkboxLine}><input type="checkbox" checked={filters.include_archived} onChange={(e) => setFilters((v) => ({ ...v, include_archived: e.target.checked }))} /> Include archived</span></label>
        </div>
      </section>

      {canWrite ? (
        <section id="platform-tenant-communications-form" style={styles.card}>
          <h2 style={styles.sectionTitle}>{editingId ? 'Edit communication' : 'Log communication'}</h2>
          <div style={styles.grid4}>
            <label style={styles.label}>Tenant
              <select style={styles.input} value={form.tenant_id} disabled={Boolean(editingId)} onChange={(e) => setForm((v) => ({ ...v, tenant_id: e.target.value }))}>
                <option value="">Choose tenant</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>
            <label style={styles.label}>Channel
              <select style={styles.input} value={form.channel} onChange={(e) => setForm((v) => ({ ...v, channel: e.target.value }))}>{channels.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </label>
            <label style={styles.label}>Direction
              <select style={styles.input} value={form.direction} onChange={(e) => setForm((v) => ({ ...v, direction: e.target.value }))}>{directions.map((d) => <option key={d} value={d}>{d}</option>)}</select>
            </label>
            <label style={styles.label}>Occurred at
              <input style={styles.input} type="datetime-local" value={form.occurred_at} onChange={(e) => setForm((v) => ({ ...v, occurred_at: e.target.value }))} />
            </label>
          </div>
          <div style={styles.grid3}>
            <label style={styles.label}>Contact name<input style={styles.input} value={form.contact_name} onChange={(e) => setForm((v) => ({ ...v, contact_name: e.target.value }))} /></label>
            <label style={styles.label}>Contact email<input style={styles.input} value={form.contact_email} onChange={(e) => setForm((v) => ({ ...v, contact_email: e.target.value }))} /></label>
            <label style={styles.label}>Ticket/reference<input style={styles.input} value={form.external_reference} onChange={(e) => setForm((v) => ({ ...v, external_reference: e.target.value }))} /></label>
          </div>
          <label style={styles.label}>Subject<input style={styles.input} value={form.subject} onChange={(e) => setForm((v) => ({ ...v, subject: e.target.value }))} /></label>
          <label style={styles.label}>Summary<textarea style={styles.textarea} value={form.summary} onChange={(e) => setForm((v) => ({ ...v, summary: e.target.value }))} /></label>
          <div style={styles.actions}>
            <label style={styles.checkboxLine}><input type="checkbox" checked={form.follow_up_required} onChange={(e) => setForm((v) => ({ ...v, follow_up_required: e.target.checked }))} /> Follow-up required</label>
            <label style={styles.labelInline}>Due <input style={styles.input} type="datetime-local" value={form.follow_up_due_at} onChange={(e) => setForm((v) => ({ ...v, follow_up_due_at: e.target.value }))} /></label>
            <button style={styles.primaryButton} disabled={!canSave || save.isPending} onClick={() => save.mutate()}>{editingId ? 'Save changes' : 'Log communication'}</button>
            {editingId ? <button style={styles.secondaryButton} onClick={resetForm}>Cancel edit</button> : null}
          </div>
          {save.error ? <div style={styles.error}>Save failed: {readableError(save.error)}</div> : null}
        </section>
      ) : null}

      {message ? <div style={styles.success}>{message}</div> : null}
      {tenants.error ? <div style={styles.error}>Tenant list failed: {readableError(tenants.error)} <button style={styles.inlineButton} onClick={() => tenants.refetch()}>Retry tenants</button></div> : null}
      {communications.error ? <div style={styles.error}>Communications failed: {readableError(communications.error)} <button style={styles.inlineButton} onClick={() => communications.refetch()}>Retry communications</button></div> : null}
      {resolveFollowUp.error ? <div style={styles.error}>Resolve failed: {readableError(resolveFollowUp.error)}</div> : null}
      {archive.error ? <div style={styles.error}>Archive failed: {readableError(archive.error)}</div> : null}

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Communication log</h2>
        {communications.isLoading ? <p>Loading communications…</p> : null}
        {!communications.isLoading && !communicationRows.length ? <p style={styles.muted}>No communications found.</p> : null}
        <div style={styles.list}>
          {communicationRows.map((item) => (
            <article key={item.id} style={{ ...styles.item, opacity: item.archived_at ? 0.6 : 1 }}>
              <div style={styles.itemTop}>
                <div>
                  <strong>{item.subject}</strong>
                  <div style={styles.muted}>{item.tenant_name} · {item.channel} · {item.direction} · {dateLabel(item.occurred_at)}</div>
                  <div style={styles.muted}>{item.contact_name || 'No contact'} {item.contact_email ? `· ${item.contact_email}` : ''} {item.external_reference ? `· ${item.external_reference}` : ''}</div>
                </div>
                <div style={styles.actions}>
                  {item.follow_up_required && !item.resolved_at ? <span style={styles.badge}>follow-up {item.follow_up_due_at ? `due ${dateLabel(item.follow_up_due_at)}` : 'open'}</span> : null}
                  {canWrite ? <button style={styles.secondaryButton} onClick={() => startEdit(item)}>Edit</button> : null}
                  {canWrite && item.follow_up_required && !item.resolved_at ? <button style={styles.secondaryButton} onClick={() => resolveSelectedFollowUp(item)} disabled={resolveFollowUp.isPending}>Resolve follow-up</button> : null}
                  {canWrite && !item.archived_at ? <button style={styles.dangerButton} onClick={() => archiveSelectedCommunication(item)} disabled={archive.isPending}>Archive</button> : null}
                </div>
              </div>
              <p style={styles.body}>{item.summary}</p>
              <div style={styles.muted}>Created by {item.created_by_email || '—'} · Updated by {item.updated_by_email || '—'}{item.resolved_at ? ` · Follow-up resolved by ${item.resolved_by_email || '—'} at ${dateLabel(item.resolved_at)}` : ''}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 16 }, header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }, title: { margin: 0, fontSize: 28 }, subtitle: { margin: '6px 0 0', color: '#64748b', maxWidth: 860 },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }, metadataCard: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, display: 'grid', gap: 4 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }, metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'grid', gap: 4 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)' }, sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  grid6: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 12 }, grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 12 }, grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 12 },
  label: { display: 'grid', gap: 6, fontSize: 13, color: '#334155' }, labelInline: { display: 'inline-flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#334155' }, input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', fontSize: 14 }, textarea: { border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, fontSize: 14, minHeight: 105, resize: 'vertical' },
  checkboxLine: { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#334155' }, actions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, primaryButton: { border: 0, borderRadius: 10, padding: '9px 12px', background: '#0f172a', color: '#fff', cursor: 'pointer' }, secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 11px', background: '#fff', cursor: 'pointer' }, dangerButton: { border: '1px solid #fecaca', borderRadius: 10, padding: '8px 11px', background: '#fff1f2', color: '#991b1b', cursor: 'pointer' },
  muted: { color: '#64748b', fontSize: 13 }, success: { color: '#065f46', background: '#d1fae5', borderRadius: 10, padding: 10 }, error: { color: '#991b1b', background: '#fee2e2', borderRadius: 10, padding: 10 }, inlineButton: { marginLeft: 8, padding: '6px 10px', border: '1px solid #991b1b', borderRadius: 8, background: '#fff', color: '#991b1b', cursor: 'pointer' }, list: { display: 'grid', gap: 12 }, item: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }, itemTop: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }, body: { whiteSpace: 'pre-wrap', margin: '12px 0', color: '#0f172a' }, badge: { borderRadius: 999, padding: '5px 8px', background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', fontSize: 12 }
};
