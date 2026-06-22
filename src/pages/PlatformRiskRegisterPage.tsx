import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type Tenant = { id: string; name: string };
type PlatformUser = { id: string; email: string };
type Risk = {
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  title: string;
  description?: string | null;
  category: string;
  status: string;
  likelihood: string;
  impact: string;
  severity_score: number;
  owner_platform_user_id?: string | null;
  owner_email?: string | null;
  mitigation_plan?: string | null;
  contingency_plan?: string | null;
  review_due_at?: string | null;
  updated_at: string;
};
type RisksResponse = {
  risks: Risk[];
  summary: { total: number; open: number; high_attention: number; review_due: number; by_status: Record<string, number>; by_category: Record<string, number> };
  categories: string[];
  statuses: string[];
  levels: string[];
};

const emptyForm = {
  tenant_id: '',
  title: '',
  description: '',
  category: 'operational',
  status: 'open',
  likelihood: 'medium',
  impact: 'medium',
  owner_platform_user_id: '',
  mitigation_plan: '',
  contingency_plan: '',
  review_due_at: ''
};
type RiskForm = typeof emptyForm;

function label(value?: string | null) { return value ? value.replace(/_/g, ' ') : '—'; }
function dateTime(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function toInputDateTime(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 16) : ''; }
function toForm(row: Risk): RiskForm {
  return {
    tenant_id: row.tenant_id || '',
    title: row.title || '',
    description: row.description || '',
    category: row.category || 'operational',
    status: row.status || 'open',
    likelihood: row.likelihood || 'medium',
    impact: row.impact || 'medium',
    owner_platform_user_id: row.owner_platform_user_id || '',
    mitigation_plan: row.mitigation_plan || '',
    contingency_plan: row.contingency_plan || '',
    review_due_at: toInputDateTime(row.review_due_at)
  };
}
function payload(form: RiskForm) {
  return {
    ...form,
    tenant_id: form.tenant_id || null,
    owner_platform_user_id: form.owner_platform_user_id || null,
    description: form.description || null,
    mitigation_plan: form.mitigation_plan || null,
    contingency_plan: form.contingency_plan || null,
    review_due_at: form.review_due_at ? new Date(form.review_due_at).toISOString() : null
  };
}
function severityStyle(score: number): CSSProperties {
  if (score >= 12) return styles.badgeDanger;
  if (score >= 9) return styles.badgeWarn;
  return styles.badge;
}
function statusStyle(status: string): CSSProperties {
  if (status === 'closed' || status === 'accepted') return styles.badgeGood;
  if (status === 'cancelled') return styles.badgeMuted;
  if (status === 'mitigating') return styles.badgeWarn;
  return styles.badge;
}

export default function PlatformRiskRegisterPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RISKS_WRITE);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const [filters, setFilters] = useState({ tenant_id: '', status: '', category: '', search: '', due_only: false });
  const [form, setForm] = useState<RiskForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.search) params.set('search', filters.search);
    if (filters.due_only) params.set('due_only', 'true');
    params.set('limit', '300');
    return params.toString();
  }, [filters]);

  const risks = useQuery({ queryKey: ['platform', 'risk-register', filters], queryFn: () => platformApiRequest<RisksResponse>(`/platform/risk-register?${queryString}`) });
  const tenants = useQuery({ queryKey: ['platform', 'risk-tenants'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const users = useQuery({ queryKey: ['platform', 'risk-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite && canReadUsers });

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify(payload(form));
      if (editingId) return platformApiRequest(`/platform/risk-register/${editingId}`, { method: 'PATCH', body });
      return platformApiRequest('/platform/risk-register', { method: 'POST', body });
    },
    onSuccess: async () => { setForm(emptyForm); setEditingId(null); await queryClient.invalidateQueries({ queryKey: ['platform', 'risk-register'] }); }
  });
  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => platformApiRequest(`/platform/risk-register/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'risk-register'] })
  });

  const response = risks.data;
  const categories = response?.categories || ['operational', 'security', 'billing', 'vendor', 'compliance', 'data', 'release', 'support', 'other'];
  const statuses = response?.statuses || ['open', 'monitoring', 'mitigating', 'accepted', 'closed', 'cancelled'];
  const levels = response?.levels || ['low', 'medium', 'high', 'critical'];
  const summary = response?.summary;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Risk register</h1>
          <p style={styles.subtitle}>Track HLA operational, tenant, vendor, billing, security, release, and compliance risks in one place.</p>
        </div>
      </header>

      <section style={styles.metrics}>
        <div style={styles.metric}><strong>{summary?.total ?? 0}</strong><span>Total shown</span></div>
        <div style={styles.metric}><strong>{summary?.open ?? 0}</strong><span>Open / active</span></div>
        <div style={styles.metric}><strong>{summary?.high_attention ?? 0}</strong><span>High attention</span></div>
        <div style={styles.metric}><strong>{summary?.review_due ?? 0}</strong><span>Review due</span></div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.grid4}>
          <select value={filters.tenant_id} onChange={(event) => setFilters((prev) => ({ ...prev, tenant_id: event.target.value }))} style={styles.input}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))} style={styles.input}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search title, plans, description" style={styles.input} />
        </div>
        <label style={styles.checkRow}><input type="checkbox" checked={filters.due_only} onChange={(event) => setFilters((prev) => ({ ...prev, due_only: event.target.checked }))} /> Review due only</label>
      </section>

      {canWrite ? (
        <section id="platform-risk-register-form" style={styles.panel}>
          <h2 style={styles.sectionTitle}>{editingId ? 'Edit risk' : 'Create risk'}</h2>
          <div style={styles.grid3}>
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Risk title" style={styles.input} />
            <select value={form.tenant_id} onChange={(event) => setForm((prev) => ({ ...prev, tenant_id: event.target.value }))} style={styles.input}><option value="">Platform-wide risk</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
            <select value={form.owner_platform_user_id} onChange={(event) => setForm((prev) => ({ ...prev, owner_platform_user_id: event.target.value }))} style={styles.input}><option value="">No owner</option>{(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select>
            <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} style={styles.input}>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <input type="datetime-local" value={form.review_due_at} onChange={(event) => setForm((prev) => ({ ...prev, review_due_at: event.target.value }))} style={styles.input} />
            <select value={form.likelihood} onChange={(event) => setForm((prev) => ({ ...prev, likelihood: event.target.value }))} style={styles.input}>{levels.map((item) => <option key={item} value={item}>Likelihood: {label(item)}</option>)}</select>
            <select value={form.impact} onChange={(event) => setForm((prev) => ({ ...prev, impact: event.target.value }))} style={styles.input}>{levels.map((item) => <option key={item} value={item}>Impact: {label(item)}</option>)}</select>
          </div>
          <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="What can go wrong and who is affected?" style={styles.textarea} />
          <textarea value={form.mitigation_plan} onChange={(event) => setForm((prev) => ({ ...prev, mitigation_plan: event.target.value }))} placeholder="Mitigation plan" style={styles.textarea} />
          <textarea value={form.contingency_plan} onChange={(event) => setForm((prev) => ({ ...prev, contingency_plan: event.target.value }))} placeholder="Contingency plan" style={styles.textarea} />
          <div style={styles.actions}>
            <button type="button" onClick={() => save.mutate()} disabled={save.isPending} style={styles.primaryButton}>{editingId ? 'Save risk' : 'Create risk'}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} style={styles.secondaryButton}>Cancel edit</button> : null}
          </div>
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Risk list</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Risk</th><th style={styles.th}>Status</th><th style={styles.th}>Severity</th><th style={styles.th}>Owner</th><th style={styles.th}>Review</th><th style={styles.th}>Plans</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {(response?.risks || []).map((risk) => (
                <tr key={risk.id}>
                  <td style={styles.td}><strong>{risk.title}</strong><br /><span style={styles.muted}>{risk.tenant_name || 'Platform-wide'} · {label(risk.category)}</span><br />{risk.description || 'No description'}</td>
                  <td style={styles.td}><span style={statusStyle(risk.status)}>{label(risk.status)}</span></td>
                  <td style={styles.td}><span style={severityStyle(risk.severity_score)}>{risk.severity_score}</span><br /><span style={styles.muted}>L: {label(risk.likelihood)} / I: {label(risk.impact)}</span></td>
                  <td style={styles.td}>{risk.owner_email || '—'}</td>
                  <td style={styles.td}>{dateTime(risk.review_due_at)}<br /><span style={styles.muted}>Updated {dateTime(risk.updated_at)}</span></td>
                  <td style={styles.td}><strong>Mitigation:</strong> {risk.mitigation_plan || '—'}<br /><strong>Contingency:</strong> {risk.contingency_plan || '—'}</td>
                  <td style={styles.td}>
                    {canWrite ? <button type="button" onClick={() => { setEditingId(risk.id); setForm(toForm(risk)); scrollToFormSection('platform-risk-register-form'); }} style={styles.secondaryButton}>Edit</button> : null}
                    {canWrite && !['closed', 'cancelled'].includes(risk.status) ? <button type="button" onClick={() => transition.mutate({ id: risk.id, status: 'closed' })} style={styles.secondaryButton}>Close</button> : null}
                    {canWrite && risk.status !== 'mitigating' && !['closed', 'cancelled'].includes(risk.status) ? <button type="button" onClick={() => transition.mutate({ id: risk.id, status: 'mitigating' })} style={styles.secondaryButton}>Mitigate</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#64748b' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  metric: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#fff', display: 'grid', gap: 4 },
  panel: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, background: '#fff', display: 'grid', gap: 12 },
  sectionTitle: { margin: 0, fontSize: 18 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', minHeight: 38 },
  textarea: { border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, minHeight: 70 },
  checkRow: { display: 'flex', gap: 8, alignItems: 'center' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  primaryButton: { border: 0, borderRadius: 10, padding: '9px 12px', background: '#0f172a', color: '#fff', cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 10px', background: '#fff', cursor: 'pointer', marginRight: 6, marginTop: 4 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 10, color: '#475569' },
  td: { borderBottom: '1px solid #f1f5f9', padding: 10, verticalAlign: 'top' },
  muted: { color: '#64748b', fontSize: 12 },
  badge: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#e0f2fe', color: '#075985', fontSize: 12 },
  badgeGood: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#dcfce7', color: '#166534', fontSize: 12 },
  badgeWarn: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#fef3c7', color: '#92400e', fontSize: 12 },
  badgeDanger: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#fee2e2', color: '#991b1b', fontSize: 12 },
  badgeMuted: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#e2e8f0', color: '#475569', fontSize: 12 }
};
