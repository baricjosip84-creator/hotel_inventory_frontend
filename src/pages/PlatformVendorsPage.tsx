import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type PlatformUser = { id: string; email: string; name?: string | null };
type Vendor = {
  id: string;
  name: string;
  category: string;
  status: string;
  risk_level: string;
  primary_contact_name?: string | null;
  primary_contact_email?: string | null;
  primary_contact_phone?: string | null;
  website_url?: string | null;
  account_reference?: string | null;
  sla_reference?: string | null;
  contract_start_date?: string | null;
  contract_renewal_date?: string | null;
  owner_platform_user_id?: string | null;
  owner_email?: string | null;
  dependency_notes?: string | null;
  internal_notes?: string | null;
  archived_at?: string | null;
  updated_at?: string | null;
};

type VendorsResponse = {
  vendors: Vendor[];
  summary: {
    total: number;
    archived: number;
    renewal_due: number;
    by_category: Record<string, number>;
    by_status: Record<string, number>;
    by_risk: Record<string, number>;
  };
  categories: string[];
  statuses: string[];
  risk_levels: string[];
};

const emptyForm = {
  name: '',
  category: 'other',
  status: 'active',
  risk_level: 'medium',
  primary_contact_name: '',
  primary_contact_email: '',
  primary_contact_phone: '',
  website_url: '',
  account_reference: '',
  sla_reference: '',
  contract_start_date: '',
  contract_renewal_date: '',
  owner_platform_user_id: '',
  dependency_notes: '',
  internal_notes: ''
};

type VendorForm = typeof emptyForm;

function dateOnly(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function label(value?: string | null) {
  return value ? String(value).replace(/_/g, ' ') : '—';
}

function toForm(vendor: Vendor): VendorForm {
  return {
    name: vendor.name || '',
    category: vendor.category || 'other',
    status: vendor.status || 'active',
    risk_level: vendor.risk_level || 'medium',
    primary_contact_name: vendor.primary_contact_name || '',
    primary_contact_email: vendor.primary_contact_email || '',
    primary_contact_phone: vendor.primary_contact_phone || '',
    website_url: vendor.website_url || '',
    account_reference: vendor.account_reference || '',
    sla_reference: vendor.sla_reference || '',
    contract_start_date: dateOnly(vendor.contract_start_date),
    contract_renewal_date: dateOnly(vendor.contract_renewal_date),
    owner_platform_user_id: vendor.owner_platform_user_id || '',
    dependency_notes: vendor.dependency_notes || '',
    internal_notes: vendor.internal_notes || ''
  };
}

function payloadFromForm(form: VendorForm) {
  return {
    ...form,
    primary_contact_name: form.primary_contact_name || null,
    primary_contact_email: form.primary_contact_email || null,
    primary_contact_phone: form.primary_contact_phone || null,
    website_url: form.website_url || null,
    account_reference: form.account_reference || null,
    sla_reference: form.sla_reference || null,
    contract_start_date: form.contract_start_date || null,
    contract_renewal_date: form.contract_renewal_date || null,
    owner_platform_user_id: form.owner_platform_user_id || null,
    dependency_notes: form.dependency_notes || null,
    internal_notes: form.internal_notes || null
  };
}

export default function PlatformVendorsPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_WRITE);
  const canReadPlatformUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const [filters, setFilters] = useState({ category: '', status: '', risk_level: '', search: '', renewal_due: false, include_archived: false });
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.status) params.set('status', filters.status);
    if (filters.risk_level) params.set('risk_level', filters.risk_level);
    if (filters.search) params.set('search', filters.search);
    if (filters.renewal_due) params.set('renewal_due', 'true');
    if (filters.include_archived) params.set('include_archived', 'true');
    params.set('limit', '300');
    return params.toString();
  }, [filters]);

  const vendors = useQuery({ queryKey: ['platform', 'vendors', filters], queryFn: () => platformApiRequest<VendorsResponse>(`/platform/vendors?${queryString}`) });
  const users = useQuery({ queryKey: ['platform', 'vendor-owner-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite && canReadPlatformUsers });

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify(payloadFromForm(form));
      if (editingId) return platformApiRequest(`/platform/vendors/${editingId}`, { method: 'PATCH', body });
      return platformApiRequest('/platform/vendors', { method: 'POST', body });
    },
    onSuccess: async () => {
      setForm(emptyForm);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['platform', 'vendors'] });
    }
  });

  const archive = useMutation({
    mutationFn: (vendorId: string) => platformApiRequest(`/platform/vendors/${vendorId}/archive`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'vendors'] })
  });

  const categories = vendors.data?.categories || ['payment', 'infrastructure', 'messaging', 'integrations', 'support', 'security', 'legal', 'other'];
  const statuses = vendors.data?.statuses || ['active', 'watch', 'renewal_due', 'inactive', 'archived'];
  const riskLevels = vendors.data?.risk_levels || ['low', 'medium', 'high', 'critical'];
  const summary = vendors.data?.summary;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Platform vendors</h1>
          <p style={styles.subtitle}>Track HLA vendors and partners that affect platform operations: infrastructure, payments, messaging, integrations, support, legal, and security.</p>
        </div>
      </header>

      <section style={styles.metrics}>
        <div style={styles.metric}><strong>{summary?.total ?? 0}</strong><span>Total shown</span></div>
        <div style={styles.metric}><strong>{summary?.renewal_due ?? 0}</strong><span>Renewal due soon</span></div>
        <div style={styles.metric}><strong>{summary?.by_risk?.critical ?? 0}</strong><span>Critical risk</span></div>
        <div style={styles.metric}><strong>{summary?.archived ?? 0}</strong><span>Archived shown</span></div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.grid6}>
          <label style={styles.label}>Category
            <select style={styles.input} value={filters.category} onChange={(e) => setFilters((v) => ({ ...v, category: e.target.value }))}>
              <option value="">All</option>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </label>
          <label style={styles.label}>Status
            <select style={styles.input} value={filters.status} onChange={(e) => setFilters((v) => ({ ...v, status: e.target.value }))}>
              <option value="">All</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </label>
          <label style={styles.label}>Risk
            <select style={styles.input} value={filters.risk_level} onChange={(e) => setFilters((v) => ({ ...v, risk_level: e.target.value }))}>
              <option value="">All</option>{riskLevels.map((item) => <option key={item} value={item}>{label(item)}</option>)}
            </select>
          </label>
          <label style={styles.label}>Search
            <input style={styles.input} value={filters.search} onChange={(e) => setFilters((v) => ({ ...v, search: e.target.value }))} placeholder="name, contact, account, SLA" />
          </label>
          <label style={{ ...styles.label, justifyContent: 'end' }}><span style={styles.checkboxLine}><input type="checkbox" checked={filters.renewal_due} onChange={(e) => setFilters((v) => ({ ...v, renewal_due: e.target.checked }))} /> Renewal due</span></label>
          <label style={{ ...styles.label, justifyContent: 'end' }}><span style={styles.checkboxLine}><input type="checkbox" checked={filters.include_archived} onChange={(e) => setFilters((v) => ({ ...v, include_archived: e.target.checked }))} /> Include archived</span></label>
        </div>
      </section>

      {canWrite ? (
        <section id="platform-vendors-form" style={styles.card}>
          <h2 style={styles.sectionTitle}>{editingId ? 'Edit vendor' : 'Add vendor'}</h2>
          <div style={styles.grid4}>
            <label style={styles.label}>Name<input style={styles.input} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} /></label>
            <label style={styles.label}>Category<select style={styles.input} value={form.category} onChange={(e) => setForm((v) => ({ ...v, category: e.target.value }))}>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label style={styles.label}>Status<select style={styles.input} value={form.status} onChange={(e) => setForm((v) => ({ ...v, status: e.target.value }))}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label style={styles.label}>Risk<select style={styles.input} value={form.risk_level} onChange={(e) => setForm((v) => ({ ...v, risk_level: e.target.value }))}>{riskLevels.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
          </div>
          <div style={styles.grid3}>
            <label style={styles.label}>Contact name<input style={styles.input} value={form.primary_contact_name} onChange={(e) => setForm((v) => ({ ...v, primary_contact_name: e.target.value }))} /></label>
            <label style={styles.label}>Contact email<input style={styles.input} value={form.primary_contact_email} onChange={(e) => setForm((v) => ({ ...v, primary_contact_email: e.target.value }))} /></label>
            <label style={styles.label}>Contact phone<input style={styles.input} value={form.primary_contact_phone} onChange={(e) => setForm((v) => ({ ...v, primary_contact_phone: e.target.value }))} /></label>
          </div>
          <div style={styles.grid3}>
            <label style={styles.label}>Website URL<input style={styles.input} value={form.website_url} onChange={(e) => setForm((v) => ({ ...v, website_url: e.target.value }))} /></label>
            <label style={styles.label}>Account/reference<input style={styles.input} value={form.account_reference} onChange={(e) => setForm((v) => ({ ...v, account_reference: e.target.value }))} /></label>
            <label style={styles.label}>SLA reference<input style={styles.input} value={form.sla_reference} onChange={(e) => setForm((v) => ({ ...v, sla_reference: e.target.value }))} /></label>
          </div>
          <div style={styles.grid3}>
            <label style={styles.label}>Contract start<input style={styles.input} type="date" value={form.contract_start_date} onChange={(e) => setForm((v) => ({ ...v, contract_start_date: e.target.value }))} /></label>
            <label style={styles.label}>Renewal date<input style={styles.input} type="date" value={form.contract_renewal_date} onChange={(e) => setForm((v) => ({ ...v, contract_renewal_date: e.target.value }))} /></label>
            <label style={styles.label}>Owner
              <select style={styles.input} value={form.owner_platform_user_id} onChange={(e) => setForm((v) => ({ ...v, owner_platform_user_id: e.target.value }))}>
                <option value="">Unassigned</option>{(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
              </select>
            </label>
          </div>
          <div style={styles.grid2}>
            <label style={styles.label}>Dependency notes<textarea style={styles.textarea} value={form.dependency_notes} onChange={(e) => setForm((v) => ({ ...v, dependency_notes: e.target.value }))} /></label>
            <label style={styles.label}>Internal notes<textarea style={styles.textarea} value={form.internal_notes} onChange={(e) => setForm((v) => ({ ...v, internal_notes: e.target.value }))} /></label>
          </div>
          <div style={styles.actions}>
            <button type="button" style={styles.primaryButton} disabled={!form.name || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : editingId ? 'Save changes' : 'Create vendor'}</button>
            {editingId ? <button type="button" style={styles.secondaryButton} onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel edit</button> : null}
            {save.error ? <span style={styles.error}>{(save.error as Error).message}</span> : null}
          </div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Vendors</h2>
        {vendors.isLoading ? <p>Loading vendors…</p> : null}
        {vendors.error ? <p style={styles.error}>{(vendors.error as Error).message}</p> : null}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th>Name</th><th>Category</th><th>Status</th><th>Risk</th><th>Contact</th><th>Owner</th><th>Renewal</th><th>Notes</th><th>Actions</th></tr></thead>
            <tbody>
              {(vendors.data?.vendors || []).map((vendor) => (
                <tr key={vendor.id}>
                  <td><strong>{vendor.name}</strong><br /><span style={styles.muted}>{vendor.website_url || vendor.account_reference || '—'}</span></td>
                  <td>{label(vendor.category)}</td>
                  <td><span style={vendor.archived_at ? styles.badgeMuted : styles.badge}>{label(vendor.status)}</span></td>
                  <td><span style={vendor.risk_level === 'critical' || vendor.risk_level === 'high' ? styles.badgeDanger : styles.badge}>{label(vendor.risk_level)}</span></td>
                  <td>{vendor.primary_contact_name || '—'}<br /><span style={styles.muted}>{vendor.primary_contact_email || vendor.primary_contact_phone || ''}</span></td>
                  <td>{vendor.owner_email || '—'}</td>
                  <td>{dateOnly(vendor.contract_renewal_date) || '—'}<br /><span style={styles.muted}>{vendor.sla_reference || ''}</span></td>
                  <td><span style={styles.muted}>{vendor.dependency_notes || vendor.internal_notes || '—'}</span></td>
                  <td>
                    {canWrite ? <div style={styles.rowActions}>
                      <button type="button" style={styles.secondaryButton} onClick={() => { setEditingId(vendor.id); setForm(toForm(vendor)); scrollToFormSection('platform-vendors-form'); }}>Edit</button>
                      {!vendor.archived_at ? <button type="button" style={styles.dangerButton} disabled={archive.isPending} onClick={() => archive.mutate(vendor.id)}>Archive</button> : null}
                    </div> : '—'}
                  </td>
                </tr>
              ))}
              {!vendors.isLoading && !(vendors.data?.vendors || []).length ? <tr><td colSpan={9} style={styles.empty}>No vendors match the current filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' },
  title: { margin: 0, fontSize: 30, fontWeight: 800 },
  subtitle: { margin: '6px 0 0', color: '#5f6472', maxWidth: 820 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e6e8ef', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 4 },
  card: { background: '#fff', border: '1px solid #e6e8ef', borderRadius: 16, padding: 18, boxShadow: '0 8px 18px rgba(15,23,42,0.04)' },
  sectionTitle: { margin: '0 0 14px', fontSize: 18 },
  grid6: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 12 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 12 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 12 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 12 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: '#374151' },
  input: { border: '1px solid #d7dbe7', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fff' },
  textarea: { border: '1px solid #d7dbe7', borderRadius: 10, padding: '10px 12px', fontSize: 14, minHeight: 84, resize: 'vertical' },
  checkboxLine: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 },
  actions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  rowActions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  primaryButton: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#111827', color: '#fff', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d7dbe7', borderRadius: 10, padding: '8px 10px', background: '#fff', color: '#111827', fontWeight: 700, cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 10, padding: '8px 10px', background: '#fff1f2', color: '#991b1b', fontWeight: 700, cursor: 'pointer' },
  error: { color: '#b91c1c', fontWeight: 700 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  muted: { color: '#6b7280', fontSize: 12 },
  badge: { display: 'inline-block', padding: '4px 8px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontWeight: 800 },
  badgeDanger: { display: 'inline-block', padding: '4px 8px', borderRadius: 999, background: '#fee2e2', color: '#991b1b', fontWeight: 800 },
  badgeMuted: { display: 'inline-block', padding: '4px 8px', borderRadius: 999, background: '#f3f4f6', color: '#6b7280', fontWeight: 800 },
  empty: { textAlign: 'center', padding: 24, color: '#6b7280' }
};
