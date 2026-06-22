import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type PlatformUser = { id: string; email: string };
type Vendor = { id: string; name: string };
type VendorsResponse = { vendors: Vendor[] };
type Dependency = {
  id: string;
  vendor_id?: string | null;
  vendor_name?: string | null;
  name: string;
  category: string;
  status: string;
  business_impact: string;
  owner_platform_user_id?: string | null;
  owner_email?: string | null;
  status_page_url?: string | null;
  escalation_url?: string | null;
  check_notes?: string | null;
  last_checked_at?: string | null;
  last_status_change_at?: string | null;
  archived_at?: string | null;
};

type DependenciesResponse = {
  dependencies: Dependency[];
  summary: { total: number; archived: number; attention: number; by_status: Record<string, number>; by_category: Record<string, number>; by_impact: Record<string, number> };
  categories: string[];
  statuses: string[];
  impacts: string[];
};

const emptyForm = {
  name: '',
  vendor_id: '',
  category: 'other',
  status: 'operational',
  business_impact: 'medium',
  owner_platform_user_id: '',
  status_page_url: '',
  escalation_url: '',
  check_notes: ''
};

type DependencyForm = typeof emptyForm;

function label(value?: string | null) { return value ? String(value).replace(/_/g, ' ') : '—'; }
function dateTime(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function toForm(row: Dependency): DependencyForm {
  return {
    name: row.name || '',
    vendor_id: row.vendor_id || '',
    category: row.category || 'other',
    status: row.status || 'operational',
    business_impact: row.business_impact || 'medium',
    owner_platform_user_id: row.owner_platform_user_id || '',
    status_page_url: row.status_page_url || '',
    escalation_url: row.escalation_url || '',
    check_notes: row.check_notes || ''
  };
}
function payload(form: DependencyForm) {
  return {
    ...form,
    vendor_id: form.vendor_id || null,
    owner_platform_user_id: form.owner_platform_user_id || null,
    status_page_url: form.status_page_url || null,
    escalation_url: form.escalation_url || null,
    check_notes: form.check_notes || null
  };
}
function statusStyle(status: string): CSSProperties {
  if (status === 'major_outage' || status === 'partial_outage') return styles.badgeDanger;
  if (status === 'degraded' || status === 'unknown') return styles.badgeWarn;
  if (status === 'archived') return styles.badgeMuted;
  return styles.badge;
}

export default function PlatformServiceDependenciesPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_WRITE);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const [filters, setFilters] = useState({ status: '', category: '', business_impact: '', search: '', only_attention: false, include_archived: false });
  const [form, setForm] = useState<DependencyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.business_impact) params.set('business_impact', filters.business_impact);
    if (filters.search) params.set('search', filters.search);
    if (filters.only_attention) params.set('only_attention', 'true');
    if (filters.include_archived) params.set('include_archived', 'true');
    params.set('limit', '300');
    return params.toString();
  }, [filters]);

  const dependencies = useQuery({ queryKey: ['platform', 'service-dependencies', filters], queryFn: () => platformApiRequest<DependenciesResponse>(`/platform/service-dependencies?${queryString}`) });
  const vendors = useQuery({ queryKey: ['platform', 'dependency-vendors'], queryFn: () => platformApiRequest<VendorsResponse>('/platform/vendors?limit=500') });
  const users = useQuery({ queryKey: ['platform', 'dependency-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite && canReadUsers });

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify(payload(form));
      if (editingId) return platformApiRequest(`/platform/service-dependencies/${editingId}`, { method: 'PATCH', body });
      return platformApiRequest('/platform/service-dependencies', { method: 'POST', body });
    },
    onSuccess: async () => { setForm(emptyForm); setEditingId(null); await queryClient.invalidateQueries({ queryKey: ['platform', 'service-dependencies'] }); }
  });
  const markChecked = useMutation({
    mutationFn: (dependency: Dependency) => platformApiRequest(`/platform/service-dependencies/${dependency.id}/check`, { method: 'POST', body: JSON.stringify({ status: dependency.status, check_notes: dependency.check_notes || null }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'service-dependencies'] })
  });
  const archive = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/service-dependencies/${id}/archive`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'service-dependencies'] })
  });

  const categories = dependencies.data?.categories || ['payment', 'email', 'sms', 'storage', 'hosting', 'monitoring', 'integration', 'security', 'support', 'other'];
  const statuses = dependencies.data?.statuses || ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance', 'unknown', 'archived'];
  const impacts = dependencies.data?.impacts || ['low', 'medium', 'high', 'critical'];
  const summary = dependencies.data?.summary;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Service dependencies</h1>
          <p style={styles.subtitle}>Track external services HLA depends on: payments, email, SMS, hosting, storage, security, integrations, and support vendors.</p>
        </div>
      </header>

      <section style={styles.metrics}>
        <div style={styles.metric}><strong>{summary?.total ?? 0}</strong><span>Total shown</span></div>
        <div style={styles.metric}><strong>{summary?.attention ?? 0}</strong><span>Need attention</span></div>
        <div style={styles.metric}><strong>{summary?.by_status?.major_outage ?? 0}</strong><span>Major outage</span></div>
        <div style={styles.metric}><strong>{summary?.by_impact?.critical ?? 0}</strong><span>Critical impact</span></div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.grid6}>
          <label style={styles.label}>Status<select style={styles.input} value={filters.status} onChange={(e) => setFilters((v) => ({ ...v, status: e.target.value }))}><option value="">All</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          <label style={styles.label}>Category<select style={styles.input} value={filters.category} onChange={(e) => setFilters((v) => ({ ...v, category: e.target.value }))}><option value="">All</option>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          <label style={styles.label}>Impact<select style={styles.input} value={filters.business_impact} onChange={(e) => setFilters((v) => ({ ...v, business_impact: e.target.value }))}><option value="">All</option>{impacts.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          <label style={styles.label}>Search<input style={styles.input} value={filters.search} onChange={(e) => setFilters((v) => ({ ...v, search: e.target.value }))} placeholder="dependency, vendor, notes" /></label>
          <label style={{ ...styles.label, justifyContent: 'end' }}><span style={styles.checkboxLine}><input type="checkbox" checked={filters.only_attention} onChange={(e) => setFilters((v) => ({ ...v, only_attention: e.target.checked }))} /> Attention only</span></label>
          <label style={{ ...styles.label, justifyContent: 'end' }}><span style={styles.checkboxLine}><input type="checkbox" checked={filters.include_archived} onChange={(e) => setFilters((v) => ({ ...v, include_archived: e.target.checked }))} /> Include archived</span></label>
        </div>
      </section>

      {canWrite ? (
        <section id="platform-service-dependencies-form" style={styles.card}>
          <h2 style={styles.sectionTitle}>{editingId ? 'Edit dependency' : 'Add dependency'}</h2>
          <div style={styles.grid4}>
            <label style={styles.label}>Name<input style={styles.input} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></label>
            <label style={styles.label}>Vendor<select style={styles.input} value={form.vendor_id} onChange={(e) => setForm((v) => ({ ...v, vendor_id: e.target.value }))}><option value="">No vendor linked</option>{(vendors.data?.vendors || []).map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
            <label style={styles.label}>Category<select style={styles.input} value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label style={styles.label}>Status<select style={styles.input} value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>{statuses.filter((item) => item !== 'archived').map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          </div>
          <div style={styles.grid4}>
            <label style={styles.label}>Business impact<select style={styles.input} value={form.business_impact} onChange={(e) => setForm((v) => ({ ...v, business_impact: e.target.value }))}>{impacts.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label style={styles.label}>Owner<select style={styles.input} value={form.owner_platform_user_id} onChange={(e) => setForm((v) => ({ ...v, owner_platform_user_id: e.target.value }))}><option value="">Unassigned</option>{(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label>
            <label style={styles.label}>Status page URL<input style={styles.input} value={form.status_page_url} onChange={(e) => setForm((v) => ({ ...v, status_page_url: e.target.value }))} /></label>
            <label style={styles.label}>Escalation URL<input style={styles.input} value={form.escalation_url} onChange={(e) => setForm((v) => ({ ...v, escalation_url: e.target.value }))} /></label>
          </div>
          <label style={styles.label}>Check notes<textarea style={styles.textarea} value={form.check_notes} onChange={(e) => setForm((v) => ({ ...v, check_notes: e.target.value }))} /></label>
          <div style={styles.actions}>
            <button type="button" style={styles.primaryButton} disabled={!form.name || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create dependency'}</button>
            {editingId ? <button type="button" style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</button> : null}
            {save.error ? <span style={styles.error}>{(save.error as Error).message}</span> : null}
          </div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Dependencies</h2>
        {dependencies.isLoading ? <p>Loading dependencies…</p> : null}
        {dependencies.error ? <p style={styles.error}>{(dependencies.error as Error).message}</p> : null}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th>Name</th><th>Vendor</th><th>Status</th><th>Impact</th><th>Owner</th><th>Last check</th><th>Links</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {(dependencies.data?.dependencies || []).map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.name}</strong><br /><span style={styles.muted}>{label(row.category)}</span></td>
                  <td>{row.vendor_name || '—'}</td>
                  <td><span style={statusStyle(row.status)}>{label(row.status)}</span><br /><span style={styles.muted}>Changed {dateTime(row.last_status_change_at)}</span></td>
                  <td><span style={row.business_impact === 'critical' || row.business_impact === 'high' ? styles.badgeDanger : styles.badge}>{label(row.business_impact)}</span></td>
                  <td>{row.owner_email || '—'}</td>
                  <td>{dateTime(row.last_checked_at)}</td>
                  <td>{row.status_page_url ? <a href={row.status_page_url} target="_blank" rel="noreferrer">status</a> : '—'} {row.escalation_url ? <a href={row.escalation_url} target="_blank" rel="noreferrer"> escalate</a> : ''}</td>
                  <td><span style={styles.muted}>{row.check_notes || '—'}</span></td>
                  <td>{canWrite ? <div style={styles.rowActions}>
                    <button style={styles.smallButton} onClick={() => { setEditingId(row.id); setForm(toForm(row)); scrollToFormSection('platform-service-dependencies-form'); }}>Edit</button>
                    <button style={styles.smallButton} disabled={markChecked.isPending} onClick={() => markChecked.mutate(row)}>Mark checked</button>
                    {!row.archived_at ? <button style={styles.dangerButton} disabled={archive.isPending} onClick={() => archive.mutate(row.id)}>Archive</button> : null}
                  </div> : '—'}</td>
                </tr>
              ))}
              {dependencies.data && dependencies.data.dependencies.length === 0 ? <tr><td colSpan={9}>No service dependencies match these filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#64748b' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.04)' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'grid', gap: 4 },
  grid6: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 12 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 12 },
  label: { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 },
  input: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', font: 'inherit' },
  textarea: { border: '1px solid #cbd5e1', borderRadius: 8, padding: 10, minHeight: 80, font: 'inherit' },
  checkboxLine: { display: 'inline-flex', gap: 8, alignItems: 'center', fontWeight: 500 },
  actions: { display: 'flex', gap: 10, alignItems: 'center', marginTop: 12 },
  primaryButton: { border: 0, borderRadius: 8, background: '#0f172a', color: '#fff', padding: '9px 14px', cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '9px 14px', cursor: 'pointer' },
  smallButton: { border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff', padding: '6px 9px', cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 8, background: '#fff1f2', color: '#991b1b', padding: '6px 9px', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  rowActions: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  badge: { display: 'inline-block', borderRadius: 999, background: '#ecfdf5', color: '#166534', padding: '3px 8px', fontSize: 12 },
  badgeWarn: { display: 'inline-block', borderRadius: 999, background: '#fffbeb', color: '#92400e', padding: '3px 8px', fontSize: 12 },
  badgeDanger: { display: 'inline-block', borderRadius: 999, background: '#fef2f2', color: '#991b1b', padding: '3px 8px', fontSize: 12 },
  badgeMuted: { display: 'inline-block', borderRadius: 999, background: '#f1f5f9', color: '#475569', padding: '3px 8px', fontSize: 12 },
  muted: { color: '#64748b', fontSize: 12 },
  error: { color: '#b91c1c' }
};
