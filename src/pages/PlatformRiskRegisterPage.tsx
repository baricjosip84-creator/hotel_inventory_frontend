import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
function dateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}
function toInputDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16);
}
function clean(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}
function isValidDateTimeLocal(value: string) {
  return !value || !Number.isNaN(new Date(value).getTime());
}
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
    tenant_id: clean(form.tenant_id),
    title: form.title.trim(),
    description: clean(form.description),
    category: form.category,
    status: form.status,
    likelihood: form.likelihood,
    impact: form.impact,
    owner_platform_user_id: clean(form.owner_platform_user_id),
    mitigation_plan: clean(form.mitigation_plan),
    contingency_plan: clean(form.contingency_plan),
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
  const [message, setMessage] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters.status) params.set('status', filters.status);
    if (filters.category) params.set('category', filters.category);
    if (filters.search.trim()) params.set('search', filters.search.trim());
    if (filters.due_only) params.set('due_only', 'true');
    params.set('limit', '300');
    return params.toString();
  }, [filters]);

  const risks = useQuery({ queryKey: ['platform', 'risk-register', filters], queryFn: () => platformApiRequest<RisksResponse>(`/platform/risk-register?${queryString}`) });
  const tenants = useQuery({ queryKey: ['platform', 'risk-tenants'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const users = useQuery({ queryKey: ['platform', 'risk-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite && canReadUsers });

  const refreshPage = async () => {
    setMessage('');
    await Promise.all([
      risks.refetch(),
      tenants.refetch(),
      canWrite && canReadUsers ? users.refetch() : Promise.resolve()
    ]);
  };

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify(payload(form));
      if (editingId) return platformApiRequest(`/platform/risk-register/${editingId}`, { method: 'PATCH', body });
      return platformApiRequest('/platform/risk-register', { method: 'POST', body });
    },
    onSuccess: async () => {
      const action = editingId ? 'Risk changes saved.' : 'Risk created.';
      setForm(emptyForm);
      setEditingId(null);
      setMessage(action);
      await queryClient.invalidateQueries({ queryKey: ['platform', 'risk-register'] });
    }
  });

  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => platformApiRequest(`/platform/risk-register/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    onSuccess: async (_data, variables) => {
      setMessage(variables.status === 'closed' ? 'Risk closed.' : 'Risk moved to mitigating.');
      await queryClient.invalidateQueries({ queryKey: ['platform', 'risk-register'] });
    }
  });

  const response = risks.data;
  const categories = response?.categories || ['operational', 'security', 'billing', 'vendor', 'compliance', 'data', 'release', 'support', 'other'];
  const statuses = response?.statuses || ['open', 'monitoring', 'mitigating', 'accepted', 'closed', 'cancelled'];
  const levels = response?.levels || ['low', 'medium', 'high', 'critical'];
  const summary = response?.summary;
  const invalidReviewDate = !isValidDateTimeLocal(form.review_due_at);
  const saveDisabled = save.isPending || !form.title.trim() || invalidReviewDate;
  const saveHelp = !form.title.trim()
    ? 'Enter a risk title before creating or saving a risk.'
    : invalidReviewDate
      ? 'Review due date must be a valid date and time.'
      : '';

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Risk register</h1>
          <p style={styles.subtitle}>Track HLA operational, tenant, vendor, billing, security, release, and compliance risks in one place.</p>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={() => { void refreshPage(); }} disabled={risks.isFetching || tenants.isFetching || users.isFetching}>
          {risks.isFetching || tenants.isFetching || users.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <section style={styles.metaCard}>
        <span>Source: GET /platform/risk-register</span>
        <span>Limit: 300</span>
        <span>Visible risks: {response?.risks.length ?? 0}</span>
        <span>Filters: {queryString || 'limit=300'}</span>
      </section>

      <section style={styles.linkCard}>
        <strong>Supporting Platform pages:</strong>
        <Link to="/platform/tenants">Tenants</Link>
        <Link to="/platform/vendors">Vendors</Link>
        <Link to="/platform/service-dependencies">Service Dependencies</Link>
        <Link to="/platform/incidents">Incidents</Link>
        <Link to="/platform/releases">Releases</Link>
        <Link to="/platform/audit">Audit</Link>
      </section>

      {message ? <div style={styles.success}>{message}</div> : null}

      {risks.error ? (
        <section style={styles.errorCard}>
          <strong>Risk register could not be loaded.</strong>
          <span>{(risks.error as Error).message}</span>
          <button type="button" style={styles.secondaryButton} onClick={() => risks.refetch()}>Retry</button>
        </section>
      ) : null}

      <section style={styles.metrics}>
        <div style={styles.metric}><strong>{summary?.total ?? 0}</strong><span>Total shown</span></div>
        <div style={styles.metric}><strong>{summary?.open ?? 0}</strong><span>Open / active</span></div>
        <div style={styles.metric}><strong>{summary?.high_attention ?? 0}</strong><span>High attention</span></div>
        <div style={styles.metric}><strong>{summary?.review_due ?? 0}</strong><span>Review due</span></div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.grid4}>
          <label style={styles.label}>Tenant
            <select value={filters.tenant_id} onChange={(event) => setFilters((prev) => ({ ...prev, tenant_id: event.target.value }))} style={styles.input}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
          </label>
          <label style={styles.label}>Status
            <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          </label>
          <label style={styles.label}>Category
            <select value={filters.category} onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))} style={styles.input}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          </label>
          <label style={styles.label}>Search
            <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search title, plans, description" style={styles.input} />
          </label>
        </div>
        <label style={styles.checkRow}><input type="checkbox" checked={filters.due_only} onChange={(event) => setFilters((prev) => ({ ...prev, due_only: event.target.checked }))} /> Review due only</label>
      </section>

      {canWrite ? (
        <section id="platform-risk-register-form" style={styles.panel}>
          <h2 style={styles.sectionTitle}>{editingId ? 'Edit risk' : 'Create risk'}</h2>
          <div style={styles.grid3}>
            <label style={styles.label}>Risk title
              <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Risk title" style={styles.input} />
            </label>
            <label style={styles.label}>Tenant
              <select value={form.tenant_id} onChange={(event) => setForm((prev) => ({ ...prev, tenant_id: event.target.value }))} style={styles.input}><option value="">Platform-wide risk</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
            </label>
            <label style={styles.label}>Owner
              <select value={form.owner_platform_user_id} onChange={(event) => setForm((prev) => ({ ...prev, owner_platform_user_id: event.target.value }))} style={styles.input}><option value="">No owner</option>{(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select>
            </label>
            <label style={styles.label}>Category
              <select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))} style={styles.input}>{categories.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            </label>
            <label style={styles.label}>Status
              <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            </label>
            <label style={styles.label}>Review due at
              <input type="datetime-local" value={form.review_due_at} onChange={(event) => setForm((prev) => ({ ...prev, review_due_at: event.target.value }))} style={styles.input} />
            </label>
            <label style={styles.label}>Likelihood
              <select value={form.likelihood} onChange={(event) => setForm((prev) => ({ ...prev, likelihood: event.target.value }))} style={styles.input}>{levels.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            </label>
            <label style={styles.label}>Impact
              <select value={form.impact} onChange={(event) => setForm((prev) => ({ ...prev, impact: event.target.value }))} style={styles.input}>{levels.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            </label>
          </div>
          <label style={styles.label}>Description
            <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="What can go wrong and who is affected?" style={styles.textarea} />
          </label>
          <label style={styles.label}>Mitigation plan
            <textarea value={form.mitigation_plan} onChange={(event) => setForm((prev) => ({ ...prev, mitigation_plan: event.target.value }))} placeholder="Mitigation plan" style={styles.textarea} />
          </label>
          <label style={styles.label}>Contingency plan
            <textarea value={form.contingency_plan} onChange={(event) => setForm((prev) => ({ ...prev, contingency_plan: event.target.value }))} placeholder="Contingency plan" style={styles.textarea} />
          </label>
          <div style={styles.actions}>
            <button type="button" onClick={() => { if (!saveDisabled) save.mutate(); }} disabled={saveDisabled} style={saveDisabled ? styles.disabledButton : styles.primaryButton}>{save.isPending ? 'Saving…' : editingId ? 'Save risk' : 'Create risk'}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); setMessage('Risk edit cancelled.'); }} style={styles.secondaryButton}>Cancel edit</button> : null}
            {saveHelp ? <span style={styles.validationMessage}>{saveHelp}</span> : null}
            {save.error ? <span style={styles.validationMessage}>{(save.error as Error).message}</span> : null}
          </div>
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Risk list</h2>
        {risks.isLoading ? <p>Loading risks…</p> : null}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Risk</th><th style={styles.th}>Status</th><th style={styles.th}>Severity</th><th style={styles.th}>Owner</th><th style={styles.th}>Review</th><th style={styles.th}>Plans</th><th style={styles.th}>Evidence</th><th style={styles.th}>Actions</th></tr></thead>
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
                    <span style={styles.muted}>Risk ID: {risk.id.slice(0, 8)}…</span><br />
                    {risk.tenant_id ? <Link to={`/platform/tenants?tenant_id=${risk.tenant_id}`}>Tenant record</Link> : <span style={styles.muted}>Scope: Platform-wide</span>}<br />
                    <Link to="/platform/audit">Audit evidence</Link>
                  </td>
                  <td style={styles.td}>
                    {canWrite ? <button type="button" onClick={() => { setMessage(''); setEditingId(risk.id); setForm(toForm(risk)); scrollToFormSection('platform-risk-register-form'); }} style={styles.secondaryButton}>Edit</button> : null}
                    {canWrite && !['closed', 'cancelled'].includes(risk.status) ? <button type="button" disabled={transition.isPending} onClick={() => { if (window.confirm(`Close risk ${risk.title}?`)) transition.mutate({ id: risk.id, status: 'closed' }); }} style={styles.secondaryButton}>Close</button> : null}
                    {canWrite && risk.status !== 'mitigating' && !['closed', 'cancelled'].includes(risk.status) ? <button type="button" disabled={transition.isPending} onClick={() => { if (window.confirm(`Move risk ${risk.title} to mitigating?`)) transition.mutate({ id: risk.id, status: 'mitigating' }); }} style={styles.secondaryButton}>Mitigate</button> : null}
                    {!canWrite ? '—' : null}
                  </td>
                </tr>
              ))}
              {!risks.isLoading && !(response?.risks || []).length ? <tr><td colSpan={8} style={styles.empty}>No risks match the current filters.</td></tr> : null}
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
  metaCard: { display: 'flex', gap: 12, flexWrap: 'wrap', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '10px 12px', color: '#475569', fontSize: 12, fontWeight: 700 },
  linkCard: { display: 'flex', gap: 12, flexWrap: 'wrap', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '10px 12px', alignItems: 'center' },
  errorCard: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 12px', background: '#fff1f2', color: '#991b1b' },
  success: { border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 12, padding: '10px 12px', fontWeight: 800 },
  sectionTitle: { margin: 0, fontSize: 18 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 },
  label: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 700, color: '#374151' },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 10px', minHeight: 38 },
  textarea: { border: '1px solid #cbd5e1', borderRadius: 10, padding: 10, minHeight: 70, resize: 'vertical' },
  checkRow: { display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  primaryButton: { border: 0, borderRadius: 10, padding: '9px 12px', background: '#0f172a', color: '#fff', cursor: 'pointer', fontWeight: 800 },
  disabledButton: { border: 0, borderRadius: 10, padding: '9px 12px', background: '#cbd5e1', color: '#fff', cursor: 'not-allowed', fontWeight: 800 },
  validationMessage: { color: '#b91c1c', fontWeight: 700, alignSelf: 'center' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '7px 10px', background: '#fff', cursor: 'pointer', marginRight: 6, marginTop: 4, fontWeight: 700 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 10, color: '#475569' },
  td: { borderBottom: '1px solid #f1f5f9', padding: 10, verticalAlign: 'top' },
  empty: { textAlign: 'center', padding: 24, color: '#64748b' },
  muted: { color: '#64748b', fontSize: 12 },
  badge: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#e0f2fe', color: '#075985', fontSize: 12, fontWeight: 800 },
  badgeGood: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#dcfce7', color: '#166534', fontSize: 12, fontWeight: 800 },
  badgeWarn: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#fef3c7', color: '#92400e', fontSize: 12, fontWeight: 800 },
  badgeDanger: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 800 },
  badgeMuted: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#e2e8f0', color: '#475569', fontSize: 12, fontWeight: 800 }
};
