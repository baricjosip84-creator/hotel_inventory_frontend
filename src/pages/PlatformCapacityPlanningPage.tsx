import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type PlatformUser = { id: string; email: string };
type Dependency = { id: string; name: string; status?: string };
type CapacityResource = {
  id: string;
  dependency_id?: string | null;
  dependency_name?: string | null;
  name: string;
  resource_type: string;
  environment: string;
  status: string;
  unit: string;
  current_usage: string | number;
  capacity_limit: string | number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  usage_percent?: string | number | null;
  projected_exhaustion_at?: string | null;
  owner_platform_user_id?: string | null;
  owner_email?: string | null;
  scaling_plan?: string | null;
  notes?: string | null;
  updated_at: string;
};
type CapacityResponse = {
  resources: CapacityResource[];
  summary: { total: number; warning: number; critical: number; exhausting_soon: number; by_status: Record<string, number>; by_type: Record<string, number> };
  resource_types: string[];
  environments: string[];
  statuses: string[];
};

const emptyForm = {
  dependency_id: '',
  name: '',
  resource_type: 'other',
  environment: 'production',
  status: 'tracking',
  unit: 'units',
  current_usage: '0',
  capacity_limit: '0',
  warning_threshold_percent: '75',
  critical_threshold_percent: '90',
  projected_exhaustion_at: '',
  owner_platform_user_id: '',
  scaling_plan: '',
  notes: ''
};
type CapacityForm = typeof emptyForm;

function label(value?: string | null) { return value ? value.replace(/_/g, ' ') : '—'; }
function dateTime(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function toInputDateTime(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 16) : ''; }
function numberText(value: string | number | null | undefined) { return value === null || value === undefined || value === '' ? '0' : String(value); }
function percent(resource: CapacityResource) {
  if (resource.usage_percent !== null && resource.usage_percent !== undefined) return Number(resource.usage_percent);
  const limit = Number(resource.capacity_limit || 0);
  if (!limit) return null;
  return Math.round((Number(resource.current_usage || 0) / limit) * 10000) / 100;
}
function statusStyle(status: string, usage: number | null): CSSProperties {
  if (status === 'archived') return styles.badgeMuted;
  if (status === 'scaling_needed' || (usage !== null && usage >= 90)) return styles.badgeDanger;
  if (status === 'watch' || status === 'scaling_in_progress' || (usage !== null && usage >= 75)) return styles.badgeWarn;
  if (status === 'resolved') return styles.badgeGood;
  return styles.badge;
}
function toForm(row: CapacityResource): CapacityForm {
  return {
    dependency_id: row.dependency_id || '',
    name: row.name || '',
    resource_type: row.resource_type || 'other',
    environment: row.environment || 'production',
    status: row.status || 'tracking',
    unit: row.unit || 'units',
    current_usage: numberText(row.current_usage),
    capacity_limit: numberText(row.capacity_limit),
    warning_threshold_percent: String(row.warning_threshold_percent || 75),
    critical_threshold_percent: String(row.critical_threshold_percent || 90),
    projected_exhaustion_at: toInputDateTime(row.projected_exhaustion_at),
    owner_platform_user_id: row.owner_platform_user_id || '',
    scaling_plan: row.scaling_plan || '',
    notes: row.notes || ''
  };
}
function payload(form: CapacityForm) {
  return {
    dependency_id: form.dependency_id || null,
    name: form.name,
    resource_type: form.resource_type,
    environment: form.environment,
    status: form.status,
    unit: form.unit || 'units',
    current_usage: Number(form.current_usage || 0),
    capacity_limit: Number(form.capacity_limit || 0),
    warning_threshold_percent: Number(form.warning_threshold_percent || 75),
    critical_threshold_percent: Number(form.critical_threshold_percent || 90),
    projected_exhaustion_at: form.projected_exhaustion_at ? new Date(form.projected_exhaustion_at).toISOString() : null,
    owner_platform_user_id: form.owner_platform_user_id || null,
    scaling_plan: form.scaling_plan || null,
    notes: form.notes || null
  };
}

export default function PlatformCapacityPlanningPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CAPACITY_WRITE);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const [filters, setFilters] = useState({ status: '', resource_type: '', environment: '', search: '', attention_only: true, include_archived: false });
  const [form, setForm] = useState<CapacityForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const resourceNameEntered = form.name.trim().length > 0;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.resource_type) params.set('resource_type', filters.resource_type);
    if (filters.environment) params.set('environment', filters.environment);
    if (filters.search) params.set('search', filters.search);
    if (filters.attention_only) params.set('attention_only', 'true');
    if (filters.include_archived) params.set('include_archived', 'true');
    params.set('limit', '300');
    return params.toString();
  }, [filters]);

  const capacity = useQuery({ queryKey: ['platform', 'capacity-planning', filters], queryFn: () => platformApiRequest<CapacityResponse>(`/platform/capacity-planning?${queryString}`) });
  const dependencies = useQuery({ queryKey: ['platform', 'capacity-dependencies'], queryFn: () => platformApiRequest<{ dependencies: Dependency[] }>('/platform/service-dependencies?limit=500') });
  const users = useQuery({ queryKey: ['platform', 'capacity-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite && canReadUsers });

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify(payload(form));
      if (editingId) return platformApiRequest(`/platform/capacity-planning/${editingId}`, { method: 'PATCH', body });
      return platformApiRequest('/platform/capacity-planning', { method: 'POST', body });
    },
    onSuccess: async () => {
      const wasEditing = Boolean(editingId);
      setForm(emptyForm);
      setEditingId(null);
      if (!wasEditing) setFilters((prev) => (prev.attention_only ? { ...prev, attention_only: false } : prev));
      await queryClient.invalidateQueries({ queryKey: ['platform', 'capacity-planning'] });
    }
  });
  const archive = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/capacity-planning/${id}/archive`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'capacity-planning'] })
  });

  const response = capacity.data;
  const resourceTypes = response?.resource_types || ['database', 'storage', 'compute', 'queue', 'email', 'sms', 'api', 'integration', 'support', 'other'];
  const environments = response?.environments || ['development', 'staging', 'production', 'shared'];
  const statuses = response?.statuses || ['tracking', 'watch', 'scaling_needed', 'scaling_in_progress', 'resolved', 'archived'];
  const deps = dependencies.data?.dependencies || [];
  const summary = response?.summary;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Capacity planning</h1>
          <p style={styles.subtitle}>Track platform limits before they become tenant outages: database, storage, queues, integrations, support capacity, and other shared resources.</p>
        </div>
      </header>

      <section style={styles.metrics}>
        <div style={styles.metric}><strong>{summary?.total ?? 0}</strong><span>Total shown</span></div>
        <div style={styles.metric}><strong>{summary?.warning ?? 0}</strong><span>Warning</span></div>
        <div style={styles.metric}><strong>{summary?.critical ?? 0}</strong><span>Critical</span></div>
        <div style={styles.metric}><strong>{summary?.exhausting_soon ?? 0}</strong><span>Exhausting soon</span></div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.grid4}>
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select value={filters.resource_type} onChange={(event) => setFilters((prev) => ({ ...prev, resource_type: event.target.value }))} style={styles.input}><option value="">All resource types</option>{resourceTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select value={filters.environment} onChange={(event) => setFilters((prev) => ({ ...prev, environment: event.target.value }))} style={styles.input}><option value="">All environments</option>{environments.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search resources, plans, notes" style={styles.input} />
        </div>
        <div style={styles.inlineChecks}>
          <label style={styles.checkRow}><input type="checkbox" checked={filters.attention_only} onChange={(event) => setFilters((prev) => ({ ...prev, attention_only: event.target.checked }))} /> Attention only</label>
          <label style={styles.checkRow}><input type="checkbox" checked={filters.include_archived} onChange={(event) => setFilters((prev) => ({ ...prev, include_archived: event.target.checked }))} /> Include archived</label>
        </div>
      </section>

      {canWrite ? (
        <section id="platform-capacity-planning-form" style={styles.panel}>
          <h2 style={styles.sectionTitle}>{editingId ? 'Edit capacity resource' : 'Add capacity resource'}</h2>
          <div style={styles.grid3}>
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Resource name" style={styles.input} />
            <select value={form.dependency_id} onChange={(event) => setForm((prev) => ({ ...prev, dependency_id: event.target.value }))} style={styles.input}><option value="">No dependency link</option>{deps.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            <select value={form.owner_platform_user_id} onChange={(event) => setForm((prev) => ({ ...prev, owner_platform_user_id: event.target.value }))} style={styles.input}><option value="">No owner</option>{(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select>
            <select value={form.resource_type} onChange={(event) => setForm((prev) => ({ ...prev, resource_type: event.target.value }))} style={styles.input}>{resourceTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <select value={form.environment} onChange={(event) => setForm((prev) => ({ ...prev, environment: event.target.value }))} style={styles.input}>{environments.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <input value={form.current_usage} onChange={(event) => setForm((prev) => ({ ...prev, current_usage: event.target.value }))} type="number" min="0" placeholder="Current usage" style={styles.input} />
            <input value={form.capacity_limit} onChange={(event) => setForm((prev) => ({ ...prev, capacity_limit: event.target.value }))} type="number" min="0" placeholder="Capacity limit" style={styles.input} />
            <input value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))} placeholder="Unit" style={styles.input} />
            <input value={form.warning_threshold_percent} onChange={(event) => setForm((prev) => ({ ...prev, warning_threshold_percent: event.target.value }))} type="number" min="1" max="100" placeholder="Warning %" style={styles.input} />
            <input value={form.critical_threshold_percent} onChange={(event) => setForm((prev) => ({ ...prev, critical_threshold_percent: event.target.value }))} type="number" min="1" max="100" placeholder="Critical %" style={styles.input} />
            <input value={form.projected_exhaustion_at} onChange={(event) => setForm((prev) => ({ ...prev, projected_exhaustion_at: event.target.value }))} type="datetime-local" style={styles.input} />
          </div>
          <textarea value={form.scaling_plan} onChange={(event) => setForm((prev) => ({ ...prev, scaling_plan: event.target.value }))} placeholder="Scaling plan" style={styles.textarea} />
          <textarea value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Notes" style={styles.textarea} />
          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={save.isPending || !resourceNameEntered}
              style={save.isPending || !resourceNameEntered ? styles.disabledButton : styles.primaryButton}
            >{editingId ? 'Save resource' : 'Add resource'}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} style={styles.secondaryButton}>Cancel edit</button> : null}
            {!resourceNameEntered ? <span style={styles.errorText}>Enter a resource name before creating or saving a capacity resource.</span> : null}
          </div>
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Resources</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Resource</th><th style={styles.th}>Usage</th><th style={styles.th}>Status</th><th style={styles.th}>Owner</th><th style={styles.th}>Exhaustion</th><th style={styles.th}>Plan</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {(response?.resources || []).map((resource) => {
                const usage = percent(resource);
                return (
                  <tr key={resource.id}>
                    <td style={styles.td}><strong>{resource.name}</strong><br /><span style={styles.muted}>{label(resource.resource_type)} · {label(resource.environment)} · {resource.dependency_name || 'No dependency'}</span></td>
                    <td style={styles.td}><strong>{numberText(resource.current_usage)} / {numberText(resource.capacity_limit)} {resource.unit}</strong><br /><span style={usage !== null && usage >= Number(resource.critical_threshold_percent) ? styles.dangerText : usage !== null && usage >= Number(resource.warning_threshold_percent) ? styles.warnText : styles.muted}>{usage === null ? 'No limit set' : `${usage}% used`}</span></td>
                    <td style={styles.td}><span style={statusStyle(resource.status, usage)}>{label(resource.status)}</span><br /><span style={styles.muted}>Warn {resource.warning_threshold_percent}% / Critical {resource.critical_threshold_percent}%</span></td>
                    <td style={styles.td}>{resource.owner_email || '—'}</td>
                    <td style={styles.td}>{dateTime(resource.projected_exhaustion_at)}<br /><span style={styles.muted}>Updated {dateTime(resource.updated_at)}</span></td>
                    <td style={styles.td}><strong>Scaling:</strong> {resource.scaling_plan || '—'}<br /><strong>Notes:</strong> {resource.notes || '—'}</td>
                    <td style={styles.td}>{canWrite ? <button type="button" onClick={() => { setEditingId(resource.id); setForm(toForm(resource)); scrollToFormSection('platform-capacity-planning-form'); }} style={styles.secondaryButton}>Edit</button> : null}{canWrite && resource.status !== 'archived' ? <button type="button" onClick={() => archive.mutate(resource.id)} style={styles.secondaryButton}>Archive</button> : null}</td>
                  </tr>
                );
              })}
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
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14 },
  textarea: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, minHeight: 72 },
  inlineChecks: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, color: '#334155' },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  primaryButton: { border: 0, borderRadius: 10, background: '#0f172a', color: '#fff', padding: '9px 13px', cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#0f172a', padding: '7px 10px', cursor: 'pointer', marginRight: 6, marginBottom: 6 },
  disabledButton: { border: 0, borderRadius: 10, background: '#cbd5e1', color: '#fff', padding: '9px 13px', cursor: 'not-allowed' },
  errorText: { color: '#b91c1c', fontWeight: 700, alignSelf: 'center' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 980 },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 10, fontSize: 12, color: '#64748b' },
  td: { borderBottom: '1px solid #f1f5f9', padding: 10, verticalAlign: 'top', fontSize: 14 },
  muted: { color: '#64748b', fontSize: 12 },
  warnText: { color: '#92400e', fontSize: 12 },
  dangerText: { color: '#991b1b', fontSize: 12 },
  badge: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#e0f2fe', color: '#0369a1', fontSize: 12, textTransform: 'capitalize' },
  badgeWarn: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#fef3c7', color: '#92400e', fontSize: 12, textTransform: 'capitalize' },
  badgeDanger: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#fee2e2', color: '#991b1b', fontSize: 12, textTransform: 'capitalize' },
  badgeGood: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#dcfce7', color: '#166534', fontSize: 12, textTransform: 'capitalize' },
  badgeMuted: { display: 'inline-block', borderRadius: 999, padding: '3px 8px', background: '#e2e8f0', color: '#475569', fontSize: 12, textTransform: 'capitalize' }
};
