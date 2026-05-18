import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type TenantNote = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  category: string;
  visibility: string;
  title: string;
  body: string;
  pinned: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
  created_by_email?: string | null;
  updated_by_email?: string | null;
};
type NotesResponse = { notes: TenantNote[]; categories: string[]; visibilities: string[] };

const defaultForm = { tenant_id: '', category: 'general', visibility: 'internal', title: '', body: '', pinned: false };
function dateLabel(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }

export default function PlatformTenantNotesPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const [filters, setFilters] = useState({ tenant_id: '', category: '', search: '', include_archived: false });
  const [form, setForm] = useState(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    if (filters.include_archived) params.set('include_archived', 'true');
    params.set('limit', '300');
    return params.toString();
  }, [filters]);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'notes-picker'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const notes = useQuery({ queryKey: ['platform', 'tenant-notes', filters], queryFn: () => platformApiRequest<NotesResponse>(`/platform/tenant-notes?${queryString}`) });

  const saveNote = useMutation({
    mutationFn: () => {
      const body = JSON.stringify({ category: form.category, visibility: form.visibility, title: form.title, body: form.body, pinned: form.pinned });
      if (editingId) return platformApiRequest(`/platform/tenant-notes/${editingId}`, { method: 'PATCH', body });
      return platformApiRequest(`/platform/tenant-notes/tenants/${form.tenant_id}`, { method: 'POST', body });
    },
    onSuccess: async () => {
      setForm(defaultForm);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-notes'] });
    }
  });

  const archiveNote = useMutation({
    mutationFn: (noteId: string) => platformApiRequest(`/platform/tenant-notes/${noteId}/archive`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-notes'] })
  });

  const restoreNote = useMutation({
    mutationFn: (noteId: string) => platformApiRequest(`/platform/tenant-notes/${noteId}/restore`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-notes'] })
  });

  const categories = notes.data?.categories || ['general', 'support', 'billing', 'security', 'onboarding', 'risk', 'operations', 'handover'];
  const visibilities = notes.data?.visibilities || ['internal', 'support', 'leadership'];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Tenant notes</h1>
          <p style={styles.subtitle}>Internal HLA notes for support handovers, risks, billing context, onboarding details, and tenant-specific operational memory.</p>
        </div>
      </header>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.grid4}>
          <label style={styles.label}>Tenant
            <select style={styles.input} value={filters.tenant_id} onChange={(e) => setFilters((v) => ({ ...v, tenant_id: e.target.value }))}>
              <option value="">All tenants</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label style={styles.label}>Category
            <select style={styles.input} value={filters.category} onChange={(e) => setFilters((v) => ({ ...v, category: e.target.value }))}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label style={styles.label}>Search
            <input style={styles.input} value={filters.search} onChange={(e) => setFilters((v) => ({ ...v, search: e.target.value }))} placeholder="title, body, tenant" />
          </label>
          <label style={{ ...styles.label, justifyContent: 'end' }}>
            <span style={styles.checkboxLine}><input type="checkbox" checked={filters.include_archived} onChange={(e) => setFilters((v) => ({ ...v, include_archived: e.target.checked }))} /> Include archived</span>
          </label>
        </div>
      </section>

      {canWrite ? (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>{editingId ? 'Edit note' : 'Add note'}</h2>
          <div style={styles.grid3}>
            <label style={styles.label}>Tenant
              <select style={styles.input} value={form.tenant_id} disabled={Boolean(editingId)} onChange={(e) => setForm((v) => ({ ...v, tenant_id: e.target.value }))}>
                <option value="">Choose tenant</option>
                {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>
            <label style={styles.label}>Category
              <select style={styles.input} value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            </label>
            <label style={styles.label}>Visibility
              <select style={styles.input} value={form.visibility} onChange={(e) => setForm((v) => ({ ...v, visibility: e.target.value }))}>{visibilities.map((visibility) => <option key={visibility} value={visibility}>{visibility}</option>)}</select>
            </label>
          </div>
          <label style={styles.label}>Title
            <input style={styles.input} value={form.title} onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))} />
          </label>
          <label style={styles.label}>Note
            <textarea style={styles.textarea} value={form.body} onChange={(e) => setForm((v) => ({ ...v, body: e.target.value }))} />
          </label>
          <div style={styles.actions}>
            <label style={styles.checkboxLine}><input type="checkbox" checked={form.pinned} onChange={(e) => setForm((v) => ({ ...v, pinned: e.target.checked }))} /> Pin note</label>
            <button style={styles.primaryButton} disabled={!form.title || !form.body || (!editingId && !form.tenant_id) || saveNote.isPending} onClick={() => saveNote.mutate()}>{editingId ? 'Save changes' : 'Create note'}</button>
            {editingId ? <button style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm(defaultForm); }}>Cancel edit</button> : null}
          </div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Notes</h2>
        {notes.isLoading ? <p>Loading notes…</p> : null}
        {!notes.isLoading && !(notes.data?.notes || []).length ? <p style={styles.muted}>No tenant notes found.</p> : null}
        <div style={styles.noteList}>
          {(notes.data?.notes || []).map((note) => (
            <article key={note.id} style={{ ...styles.note, opacity: note.archived_at ? 0.65 : 1 }}>
              <div style={styles.noteTop}>
                <div>
                  <strong>{note.pinned ? '📌 ' : ''}{note.title}</strong>
                  <div style={styles.muted}>{note.tenant_name} · {note.category} · {note.visibility} · Updated {dateLabel(note.updated_at)}</div>
                </div>
                <div style={styles.actions}>
                  {canWrite ? <button style={styles.secondaryButton} onClick={() => { setEditingId(note.id); setForm({ tenant_id: note.tenant_id, category: note.category, visibility: note.visibility, title: note.title, body: note.body, pinned: note.pinned }); }}>Edit</button> : null}
                  {canWrite && !note.archived_at ? <button style={styles.dangerButton} onClick={() => archiveNote.mutate(note.id)}>Archive</button> : null}
                  {canWrite && note.archived_at ? <button style={styles.secondaryButton} onClick={() => restoreNote.mutate(note.id)}>Restore</button> : null}
                </div>
              </div>
              <p style={styles.body}>{note.body}</p>
              <div style={styles.muted}>Created by {note.created_by_email || '—'} · Updated by {note.updated_by_email || '—'}{note.archived_at ? ` · Archived ${dateLabel(note.archived_at)}` : ''}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#64748b', maxWidth: 820 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 12 },
  label: { display: 'grid', gap: 6, fontSize: 13, color: '#334155' },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', fontSize: 14 },
  textarea: { border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, fontSize: 14, minHeight: 110, resize: 'vertical' },
  checkboxLine: { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#334155' },
  actions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  primaryButton: { border: 0, borderRadius: 10, padding: '9px 12px', background: '#0f172a', color: '#fff', cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 11px', background: '#fff', cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 10, padding: '8px 11px', background: '#fff1f2', color: '#991b1b', cursor: 'pointer' },
  muted: { color: '#64748b', fontSize: 13 },
  noteList: { display: 'grid', gap: 12 },
  note: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' },
  noteTop: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  body: { whiteSpace: 'pre-wrap', margin: '12px 0', color: '#0f172a' }
};
