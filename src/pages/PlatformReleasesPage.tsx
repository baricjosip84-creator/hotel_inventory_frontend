import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
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
function trimToNull(value?: string | null) { const cleaned = (value || '').trim(); return cleaned || null; }
function isValidOptionalDate(value?: string | null) { if (!value) return true; return !Number.isNaN(new Date(value).getTime()); }
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
    version: form.version.trim(),
    title: form.title.trim(),
    planned_at: form.planned_at ? new Date(form.planned_at).toISOString() : null,
    owner_platform_user_id: form.owner_platform_user_id || null,
    change_request_id: trimToNull(form.change_request_id),
    maintenance_window_id: trimToNull(form.maintenance_window_id),
    summary: trimToNull(form.summary),
    rollback_plan: trimToNull(form.rollback_plan),
    release_notes: trimToNull(form.release_notes)
  };
}

function canStartRelease(status: string) { return status === 'planned'; }
function canDeployRelease(status: string) { return status === 'in_progress'; }
function canRollbackRelease(status: string) { return status === 'in_progress' || status === 'deployed'; }
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const releaseFormValid = form.version.trim().length > 0 && form.title.trim().length > 0 && isValidOptionalDate(form.planned_at);

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
    onSuccess: async () => {
      setStatusMessage(editingId ? 'Release changes saved.' : 'Release created.');
      setForm(emptyForm);
      setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['platform', 'releases'] });
    }
  });
  const transition = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => platformApiRequest(`/platform/releases/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
    onSuccess: async (_data, variables) => {
      setStatusMessage(`Release marked ${label(variables.status)}.`);
      await queryClient.invalidateQueries({ queryKey: ['platform', 'releases'] });
    }
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
        <button type="button" onClick={() => releases.refetch()} disabled={releases.isFetching} style={styles.secondaryButton}>
          {releases.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {releases.isError ? (
        <section style={styles.errorPanel}>
          <strong>Release data could not be loaded.</strong>
          <span>Check platform release permissions or backend availability, then retry.</span>
          <button type="button" onClick={() => releases.refetch()} style={styles.secondaryButton}>Retry</button>
        </section>
      ) : null}

      {statusMessage ? <div style={styles.successPanel}>{statusMessage}</div> : null}

      <section style={styles.metaPanel}>
        <span><strong>Snapshot:</strong> {new Date().toLocaleString()}</span>
        <span><strong>Source:</strong> GET /api/platform/releases?{queryString}</span>
        <span><strong>Filters:</strong> status {filters.status || 'all'} · environment {filters.environment || 'all'} · type {filters.release_type || 'all'} · search {filters.search.trim() || 'none'} · upcoming only {filters.upcoming_only ? 'yes' : 'no'}</span>
      </section>

      <section style={styles.linkPanel}>
        <strong>Supporting Platform pages</strong>
        <div style={styles.linkGrid}>
          <Link to="/platform/change-management" style={styles.link}>Change Management</Link>
          <Link to="/platform/maintenance" style={styles.link}>Maintenance</Link>
          <Link to="/platform/runbooks" style={styles.link}>Runbooks</Link>
          <Link to="/platform/operational-jobs" style={styles.link}>Operational Jobs</Link>
          <Link to="/platform/audit" style={styles.link}>Audit</Link>
        </div>
      </section>

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
          {!releaseFormValid ? <div style={styles.validation}>Version and title are required, and the planned date must be valid.</div> : null}
          <div style={styles.grid3}>
            <label style={styles.fieldLabel}>Version<input value={form.version} onChange={(event) => setForm((prev) => ({ ...prev, version: event.target.value }))} placeholder="Example: 1.7.0" style={styles.input} /></label>
            <label style={styles.fieldLabel}>Release title<input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Release title" style={styles.input} /></label>
            <label style={styles.fieldLabel}>Planned at<input type="datetime-local" value={form.planned_at} onChange={(event) => setForm((prev) => ({ ...prev, planned_at: event.target.value }))} style={styles.input} /></label>
            <label style={styles.fieldLabel}>Release type<select value={form.release_type} onChange={(event) => setForm((prev) => ({ ...prev, release_type: event.target.value }))} style={styles.input}>{releaseTypes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label style={styles.fieldLabel}>Status<select value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} style={styles.input}>{statuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label style={styles.fieldLabel}>Environment<select value={form.environment} onChange={(event) => setForm((prev) => ({ ...prev, environment: event.target.value }))} style={styles.input}>{environments.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label style={styles.fieldLabel}>Tenant impact<select value={form.tenant_impact} onChange={(event) => setForm((prev) => ({ ...prev, tenant_impact: event.target.value }))} style={styles.input}>{impacts.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
            <label style={styles.fieldLabel}>Owner<select value={form.owner_platform_user_id} onChange={(event) => setForm((prev) => ({ ...prev, owner_platform_user_id: event.target.value }))} style={styles.input}><option value="">No owner</option>{(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}</select></label>
            <label style={styles.checkRow}><input type="checkbox" checked={form.requires_maintenance} onChange={(event) => setForm((prev) => ({ ...prev, requires_maintenance: event.target.checked }))} /> Requires maintenance</label>
          </div>
          <label style={styles.fieldLabel}>Summary<textarea value={form.summary} onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))} placeholder="Short operational summary" style={styles.textarea} /></label>
          <label style={styles.fieldLabel}>Release notes<textarea value={form.release_notes} onChange={(event) => setForm((prev) => ({ ...prev, release_notes: event.target.value }))} placeholder="Release notes" style={styles.textarea} /></label>
          <label style={styles.fieldLabel}>Rollback plan<textarea value={form.rollback_plan} onChange={(event) => setForm((prev) => ({ ...prev, rollback_plan: event.target.value }))} placeholder="Rollback plan" style={styles.textarea} /></label>
          <div style={styles.actions}>
            <button type="button" onClick={() => save.mutate()} disabled={save.isPending || !releaseFormValid} style={save.isPending || !releaseFormValid ? styles.disabledButton : styles.primaryButton}>{editingId ? 'Save release' : 'Create release'}</button>
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
                  <td style={styles.td}><strong>{release.version}</strong><br />{release.title}<br /><span style={styles.muted}>{release.summary || 'No summary'}</span><br /><span style={styles.muted}>Notes: {release.release_notes || 'None'}</span><br /><span style={styles.muted}>Rollback: {release.rollback_plan || 'None'}</span></td>
                  <td style={styles.td}><span style={statusStyle(release.status)}>{label(release.status)}</span><br /><span style={styles.muted}>{label(release.release_type)}</span></td>
                  <td style={styles.td}>{label(release.environment)}</td>
                  <td style={styles.td}>{label(release.tenant_impact)}{release.requires_maintenance ? <><br /><span style={styles.badgeWarn}>maintenance</span></> : null}</td>
                  <td style={styles.td}>{release.owner_email || '—'}</td>
                  <td style={styles.td}><span style={styles.muted}>Planned:</span> {dateTime(release.planned_at)}<br /><span style={styles.muted}>Deployed:</span> {dateTime(release.deployed_at)}<br /><span style={styles.muted}>Rolled back:</span> {dateTime(release.rolled_back_at)}<br />{release.change_request_id ? <><Link to="/platform/change-management" style={styles.inlineLink}>Change evidence</Link><br /></> : null}{release.maintenance_window_id ? <><Link to="/platform/maintenance" style={styles.inlineLink}>Maintenance evidence</Link><br /></> : null}<Link to="/platform/audit" style={styles.inlineLink}>Audit evidence</Link></td>
                  <td style={styles.td}>
                    {canWrite ? (
                      <div style={styles.rowActions}>
                        <button type="button" onClick={() => { setEditingId(release.id); setForm(toForm(release)); scrollToFormSection('platform-releases-form'); }} style={styles.smallButton}>Edit</button>
                        {canStartRelease(release.status) ? <button type="button" onClick={() => window.confirm('Start this release and move it to in progress?') && transition.mutate({ id: release.id, status: 'in_progress' })} style={styles.smallButton}>Start</button> : null}
                        {canDeployRelease(release.status) ? <button type="button" onClick={() => window.confirm('Mark this release as deployed?') && transition.mutate({ id: release.id, status: 'deployed' })} style={styles.smallButton}>Deploy</button> : null}
                        {canRollbackRelease(release.status) ? <button type="button" onClick={() => window.confirm('Mark this release as rolled back? Only continue if rollback was actually executed or accepted as rollback state.') && transition.mutate({ id: release.id, status: 'rolled_back' })} style={styles.dangerButton}>Rollback</button> : null}
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
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  subtitle: { margin: '6px 0 0', color: '#64748b', maxWidth: 900, fontSize: 13, lineHeight: 1.5 },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'grid', gap: 4, color: '#334155' },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, display: 'grid', gap: 12, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metaPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'grid', gap: 6, color: '#475569', fontSize: 12, fontWeight: 700 },
  linkPanel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, display: 'grid', gap: 10 },
  linkGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  link: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '6px 10px', background: '#fff', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  inlineLink: { color: 'var(--io-primary-dark)', fontSize: 12, textDecoration: 'none', fontWeight: 700 },
  successPanel: { border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 12, padding: '10px 12px', fontWeight: 700 },
  errorPanel: { border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 12, padding: 12, display: 'grid', gap: 8 },
  sectionTitle: { margin: 0, fontSize: 18, color: '#0f172a', letterSpacing: '-.015em' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 },
  input: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', width: '100%', background: '#fff', color: '#0f172a', minWidth: 0 },
  fieldLabel: { display: 'grid', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 },
  validation: { border: '1px solid #fde68a', borderRadius: 10, padding: '10px 12px', background: '#fffbeb', color: '#92400e', fontWeight: 700 },
  textarea: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', minHeight: 76, width: '100%', background: '#fff', color: '#0f172a' },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, color: '#334155' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  primaryButton: { border: '1px solid var(--io-primary)', borderRadius: 9, padding: '9px 13px', background: 'var(--io-primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 1px 2px rgba(15,23,42,.05)' },
  disabledButton: { border: '1px solid #cbd5e1', borderRadius: 9, padding: '9px 13px', background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed', opacity: 0.85, fontWeight: 700 },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 9, padding: '8px 10px', background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: 700 },
  smallButton: { border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 8px', background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: 700 },
  dangerButton: { border: '1px solid #dc2626', borderRadius: 8, padding: '6px 8px', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', color: '#334155' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 10, fontSize: 12, color: '#64748b', textTransform: 'uppercase' },
  td: { borderBottom: '1px solid #f1f5f9', padding: 10, verticalAlign: 'top' },
  muted: { color: '#64748b', fontSize: 12 },
  badge: { display: 'inline-block', borderRadius: 999, background: 'var(--io-primary-soft-strong)', color: 'var(--io-primary-dark)', padding: '4px 9px', fontSize: 12, fontWeight: 700 },
  badgeGood: { display: 'inline-block', borderRadius: 999, background: '#dcfce7', color: '#166534', padding: '4px 9px', fontSize: 12, fontWeight: 700 },
  badgeWarn: { display: 'inline-block', borderRadius: 999, background: '#fef3c7', color: '#92400e', padding: '4px 9px', fontSize: 12, fontWeight: 700 },
  badgeDanger: { display: 'inline-block', borderRadius: 999, background: '#fee2e2', color: '#991b1b', padding: '4px 9px', fontSize: 12, fontWeight: 700 },
  rowActions: { display: 'flex', flexWrap: 'wrap', gap: 6 }
};
