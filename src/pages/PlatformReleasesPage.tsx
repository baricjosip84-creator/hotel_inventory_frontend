import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import { scrollToFormSection } from '../lib/scrollToForm';

type PlatformUser = { id: string; email: string };
type Release = {
  id: string;
  version: string;
  title: string;
  release_type: string;
  status: string;
  environment: string;
  planned_at?: string | null;
  deployed_at?: string | null;
  rolled_back_at?: string | null;
  owner_platform_user_id?: string | null;
  owner_email?: string | null;
  change_request_id?: string | null;
  maintenance_window_id?: string | null;
  summary?: string | null;
  tenant_impact: string;
  requires_maintenance: boolean;
  rollback_plan?: string | null;
  release_notes?: string | null;
};
type ReleasesResponse = {
  releases: Release[];
  summary: { total: number; upcoming: number; rolled_back: number; by_status: Record<string, number>; by_type: Record<string, number>; by_environment: Record<string, number> };
  release_types: string[];
  statuses: string[];
  environments: string[];
  impacts: string[];
};

const emptyForm = {
  version: '',
  title: '',
  release_type: 'minor',
  status: 'planned',
  environment: 'production',
  planned_at: '',
  owner_platform_user_id: '',
  change_request_id: '',
  maintenance_window_id: '',
  summary: '',
  tenant_impact: 'none',
  requires_maintenance: false,
  rollback_plan: '',
  release_notes: ''
};
type ReleaseForm = typeof emptyForm;

function label(value?: string | null) { return value ? value.replace(/_/g, ' ') : '—'; }
function dateTime(value?: string | null) { return value ? new Date(value).toLocaleString() : '—'; }
function toInputDateTime(value?: string | null) { if (!value) return ''; return new Date(value).toISOString().slice(0, 16); }
function toForm(row: Release): ReleaseForm {
  return {
    version: row.version || '',
    title: row.title || '',
    release_type: row.release_type || 'minor',
    status: row.status || 'planned',
    environment: row.environment || 'production',
    planned_at: toInputDateTime(row.planned_at),
    owner_platform_user_id: row.owner_platform_user_id || '',
    change_request_id: row.change_request_id || '',
    maintenance_window_id: row.maintenance_window_id || '',
    summary: row.summary || '',
    tenant_impact: row.tenant_impact || 'none',
    requires_maintenance: Boolean(row.requires_maintenance),
    rollback_plan: row.rollback_plan || '',
    release_notes: row.release_notes || ''
  };
}
function payload(form: ReleaseForm) {
  return {
    ...form,
    planned_at: form.planned_at ? new Date(form.planned_at).toISOString() : null,
    owner_platform_user_id: form.owner_platform_user_id || null,
    change_request_id: form.change_request_id || null,
    maintenance_window_id: form.maintenance_window_id || null,
    summary: form.summary || null,
    rollback_plan: form.rollback_plan || null,
    release_notes: form.release_notes || null
  };
}
function statusStyle(status: string): CSSProperties {
  if (status === 'rolled_back' || status === 'cancelled') return styles.badgeDanger;
  if (status === 'in_progress') return styles.badgeWarn;
  if (status === 'deployed') return styles.badgeGood;
  return styles.badge;
}

export default function PlatformReleasesPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_WRITE);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const [filters, setFilters] = useState({ status: '', environment: '', release_type: '', search: '', upcoming_only: false });
  const [form, setForm] = useState<ReleaseForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.environment) params.set('environment', filters.environment);
    if (filters.release_type) params.set('release_type', filters.release_type);
    if (filters.search) params.set('search', filters.search);
    if (filters.upcoming_only) params.set('upcoming_only', 'true');
    params.set('limit', '300');
    return params.toString();
  }, [filters]);

  const releases = useQuery({ queryKey: ['platform', 'releases', filters], queryFn: () => platformApiRequest<ReleasesResponse>(`/platform/releases?${queryString}`) });
  const users = useQuery({ queryKey: ['platform', 'release-users'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite && canReadUsers });

  const save = useMutation({
    mutationFn: () => {
      const body = JSON.stringify(payload(form));
      if (editingId) return platformApiRequest(`/platform/releases/${editingId}`, { method: 'PATCH', body });
      return platformApiRequest('/platform/releases', { method: 'POST', body });
    },
    onSuccess: async () => { setForm(emptyForm); setEditingId(null); await queryClient.invalidateQueries({ queryKey: ['platform', 'releases'] }); }
  });
  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => platformApiRequest(`/platform/releases/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'releases'] })
  });

  const response = releases.data;
  const releaseTypes = response?.release_types || ['major', 'minor', 'patch', 'hotfix', 'maintenance'];
  const statuses = response?.statuses || ['planned', 'in_progress', 'deployed', 'rolled_back', 'cancelled'];
  const environments = response?.environments || ['development', 'staging', 'production'];
  const impacts = response?.impacts || ['none', 'low', 'medium', 'high'];
  const summary = response?.summary;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Releases</h1>
          <p style={styles.subtitle}>Track HLA deployments, tenant impact, rollback notes, owners, and deployment state.</p>
        </div>
      </header>

      <section style={styles.metrics}>
        <div style={styles.metric}><strong>{summary?.total ?? 0}</strong><span>Total shown</span></div>
        <div style={styles.metric}><strong>{summary?.upcoming ?? 0}</strong><span>Upcoming / active</span></div>
        <div style={styles.metric}><strong>{summary?.by_status?.deployed ?? 0}</strong><span>Deployed</span></div>
        <div style={styles.metric}><strong>{summary?.rolled_back ?? 0}</strong><span>Rolled back</span></div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.grid4}>
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select value={filters.environment} onChange={(event) => setFilters((prev) => ({ ...prev, environment: event.target.value }))} style={styles.input}><option value="">All environments</option>{environments.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select value={filters.release_type} onChange={(event) => setFilters((prev) => ({ ...prev, release_type: event.target.value }))} style={styles.input}><option value="">All types</option>{releaseTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
          <input value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} placeholder="Search version, title, notes" style={styles.input} />
        </div>
        <label style={styles.checkRow}><input type="checkbox" checked={filters.upcoming_only} onChange={(event) => setFilters((prev) => ({ ...prev, upcoming_only: event.target.checked }))} /> Upcoming only</label>
      </section>

      {canWrite ? (
        <section id="platform-releases-form" style={styles.panel}>
          <h2 style={styles.sectionTitle}>{editingId ? 'Edit release' : 'Create release'}</h2>
          <div style={styles.grid3}>
            <input value={form.version} onChange={(event) => setForm((prev) => ({ ...prev, version: event.target.value }))} placeholder="Version, e.g. 1.7.0" style={styles.input} />
            <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Release title" style={styles.input} />
            <input type="datetime-local" value={form.planned_at} onChange={(event) => setForm((prev) => ({ ...prev, planned_at: event.target.value }))} style={styles.input} />
            <select value={form.release_type} onChange={(event) => setForm((prev) => ({ ...prev, release_type: event.target.value }))} style={styles.input}>{releaseTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <select value={form.environment} onChange={(event) => setForm((prev) => ({ ...prev, environment: event.target.value }))} style={styles.input}>{environments.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <select value={form.tenant_impact} onChange={(event) => setForm((prev) => ({ ...prev, tenant_impact: event.target.value }))} style={styles.input}>{impacts.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select>
            <select value={form.owner_platform_user_id} onChange={(event) => setForm((prev) => ({ ...prev, owner_platform_user_id: event.target.value }))} style={styles.input}><option value="">No owner</option>{(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select>
            <label style={styles.checkRow}><input type="checkbox" checked={form.requires_maintenance} onChange={(event) => setForm((prev) => ({ ...prev, requires_maintenance: event.target.checked }))} /> Requires maintenance</label>
          </div>
          <textarea value={form.summary} onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))} placeholder="Short operational summary" style={styles.textarea} />
          <textarea value={form.release_notes} onChange={(event) => setForm((prev) => ({ ...prev, release_notes: event.target.value }))} placeholder="Release notes" style={styles.textarea} />
          <textarea value={form.rollback_plan} onChange={(event) => setForm((prev) => ({ ...prev, rollback_plan: event.target.value }))} placeholder="Rollback plan" style={styles.textarea} />
          <div style={styles.actions}>
            <button type="button" onClick={() => save.mutate()} disabled={save.isPending} style={styles.primaryButton}>{editingId ? 'Save release' : 'Create release'}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} style={styles.secondaryButton}>Cancel edit</button> : null}
          </div>
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Release list</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Release</th><th style={styles.th}>Status</th><th style={styles.th}>Environment</th><th style={styles.th}>Impact</th><th style={styles.th}>Owner</th><th style={styles.th}>Dates</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {(response?.releases || []).map((release) => (
                <tr key={release.id}>
                  <td style={styles.td}><strong>{release.version}</strong><br />{release.title}<br /><span style={styles.muted}>{release.summary || 'No summary'}</span></td>
                  <td style={styles.td}><span style={statusStyle(release.status)}>{label(release.status)}</span><br /><span style={styles.muted}>{label(release.release_type)}</span></td>
                  <td style={styles.td}>{label(release.environment)}</td>
                  <td style={styles.td}>{label(release.tenant_impact)}{release.requires_maintenance ? <><br /><span style={styles.badgeWarn}>maintenance</span></> : null}</td>
                  <td style={styles.td}>{release.owner_email || '—'}</td>
                  <td style={styles.td}><span style={styles.muted}>Planned:</span> {dateTime(release.planned_at)}<br /><span style={styles.muted}>Deployed:</span> {dateTime(release.deployed_at)}</td>
                  <td style={styles.td}>
                    {canWrite ? (
                      <div style={styles.rowActions}>
                        <button type="button" onClick={() => { setEditingId(release.id); setForm(toForm(release)); scrollToFormSection('platform-releases-form'); }} style={styles.smallButton}>Edit</button>
                        {release.status !== 'in_progress' ? <button type="button" onClick={() => transition.mutate({ id: release.id, status: 'in_progress' })} style={styles.smallButton}>Start</button> : null}
                        {release.status !== 'deployed' ? <button type="button" onClick={() => transition.mutate({ id: release.id, status: 'deployed' })} style={styles.smallButton}>Deploy</button> : null}
                        {release.status !== 'rolled_back' ? <button type="button" onClick={() => transition.mutate({ id: release.id, status: 'rolled_back' })} style={styles.dangerButton}>Rollback</button> : null}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {!response?.releases?.length ? <tr><td style={styles.td} colSpan={7}>No releases found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gap: 4 },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gap: 12 },
  sectionTitle: { margin: 0, fontSize: 18 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 },
  input: { border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', width: '100%' },
  textarea: { border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', minHeight: 76, width: '100%' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, color: '#374151' },
  actions: { display: 'flex', gap: 8 },
  primaryButton: { border: 0, borderRadius: 8, padding: '10px 14px', background: '#111827', color: '#fff', cursor: 'pointer' },
  secondaryButton: { border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 14px', background: '#fff', cursor: 'pointer' },
  smallButton: { border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 8px', background: '#fff', cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 6, padding: '6px 8px', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: 10, fontSize: 12, color: '#6b7280', textTransform: 'uppercase' },
  td: { borderBottom: '1px solid #f3f4f6', padding: 10, verticalAlign: 'top' },
  muted: { color: '#6b7280', fontSize: 12 },
  badge: { display: 'inline-block', borderRadius: 999, background: '#eef2ff', color: '#3730a3', padding: '2px 8px', fontSize: 12 },
  badgeGood: { display: 'inline-block', borderRadius: 999, background: '#ecfdf5', color: '#047857', padding: '2px 8px', fontSize: 12 },
  badgeWarn: { display: 'inline-block', borderRadius: 999, background: '#fffbeb', color: '#92400e', padding: '2px 8px', fontSize: 12 },
  badgeDanger: { display: 'inline-block', borderRadius: 999, background: '#fef2f2', color: '#991b1b', padding: '2px 8px', fontSize: 12 },
  rowActions: { display: 'flex', flexWrap: 'wrap', gap: 6 }
};
