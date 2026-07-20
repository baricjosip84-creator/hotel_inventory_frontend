import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type Incident = {
  id: string;
  title: string;
  summary?: string | null;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'cancelled';
  severity: 'minor' | 'major' | 'critical';
  impact: 'none' | 'degraded' | 'partial_outage' | 'major_outage';
  scope: 'platform' | 'tenant';
  tenant_id?: string | null;
  tenant_name?: string | null;
  started_at: string;
  resolved_at?: string | null;
  public_message?: string | null;
  internal_notes?: string | null;
  created_by_email?: string | null;
  resolved_by_email?: string | null;
  update_count?: number;
  updates?: Array<{ id: string; status: string; message: string; is_public: boolean; created_at: string; created_by_email?: string | null }>;
};

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function localDateTimeValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value?: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function isClosedIncident(status?: string | null): boolean {
  return status === 'resolved' || status === 'cancelled';
}

export default function PlatformIncidentsPage() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_WRITE);
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    severity: searchParams.get('severity') || '',
    scope: searchParams.get('scope') || '',
    tenant_id: searchParams.get('tenant_id') || '',
    include_resolved: searchParams.get('include_resolved') || 'false'
  });
  const [form, setForm] = useState({
    title: '',
    summary: '',
    severity: 'minor',
    impact: 'degraded',
    scope: 'platform',
    tenant_id: '',
    started_at: localDateTimeValue(new Date()),
    public_message: '',
    internal_notes: '',
    initial_update: ''
  });
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState({ status: 'monitoring', message: '', is_public: true });
  const [cancelReason, setCancelReason] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const query = new URLSearchParams({ limit: '200', include_resolved: filters.include_resolved });
  if (filters.status) query.set('status', filters.status);
  if (filters.severity) query.set('severity', filters.severity);
  if (filters.scope) query.set('scope', filters.scope);
  if (filters.tenant_id) query.set('tenant_id', filters.tenant_id);

  const incidents = useQuery({
    queryKey: ['platform', 'incidents', filters],
    queryFn: () => platformApiRequest<Incident[]>(`/platform/incidents?${query.toString()}`)
  });

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-incidents'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const selectedIncident = useQuery({
    queryKey: ['platform', 'incidents', selectedIncidentId],
    queryFn: () => platformApiRequest<Incident>(`/platform/incidents/${selectedIncidentId}`),
    enabled: Boolean(selectedIncidentId)
  });

  const refreshAll = async () => {
    setStatusMessage('Refreshing incident evidence...');
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['platform', 'incidents'] }),
      qc.invalidateQueries({ queryKey: ['platform', 'tenants', 'for-incidents'] })
    ]);
    if (selectedIncidentId) {
      await qc.invalidateQueries({ queryKey: ['platform', 'incidents', selectedIncidentId] });
    }
    setStatusMessage('Incident evidence refreshed.');
  };

  const create = useMutation({
    mutationFn: () => platformApiRequest<Incident>('/platform/incidents', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title.trim(),
        summary: form.summary.trim() || null,
        severity: form.severity,
        impact: form.impact,
        scope: form.scope,
        tenant_id: form.scope === 'tenant' ? form.tenant_id : null,
        started_at: new Date(form.started_at).toISOString(),
        public_message: form.public_message.trim() || null,
        internal_notes: form.internal_notes.trim() || null,
        initial_update: form.initial_update.trim() || form.public_message.trim() || form.summary.trim() || null
      })
    }),
    onSuccess: async (incident) => {
      setForm({ ...form, title: '', summary: '', public_message: '', internal_notes: '', initial_update: '' });
      setStatusMessage('Incident created.');
      setSelectedIncidentId(incident.id);
      await qc.invalidateQueries({ queryKey: ['platform', 'incidents'] });
    }
  });

  const addUpdate = useMutation({
    mutationFn: () => platformApiRequest<Incident>(`/platform/incidents/${selectedIncidentId}/updates`, {
      method: 'POST',
      body: JSON.stringify({ ...updateForm, message: updateForm.message.trim() })
    }),
    onSuccess: async () => {
      setUpdateForm({ ...updateForm, message: '' });
      setStatusMessage(updateForm.status === 'resolved' ? 'Incident resolved.' : 'Incident update added.');
      await qc.invalidateQueries({ queryKey: ['platform', 'incidents'] });
    }
  });

  const cancel = useMutation({
    mutationFn: () => platformApiRequest<Incident>(`/platform/incidents/${selectedIncidentId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: cancelReason.trim() }) }),
    onSuccess: async () => {
      setCancelReason('');
      setStatusMessage('Incident cancelled.');
      await qc.invalidateQueries({ queryKey: ['platform', 'incidents'] });
    }
  });

  const rows = useMemo(() => incidents.data ?? [], [incidents.data]);
  const openIncidents = useMemo(() => rows.filter((incident) => !['resolved', 'cancelled'].includes(incident.status)), [rows]);
  const trimmedTitle = form.title.trim();
  const tenantIncidentNeedsTenant = form.scope === 'tenant' && !form.tenant_id;
  const missingStartedAt = !form.started_at || Number.isNaN(new Date(form.started_at).getTime());
  const createDisabled = create.isPending || !trimmedTitle || tenantIncidentNeedsTenant || missingStartedAt;
  const createDisabledReason = !trimmedTitle
    ? 'Enter an incident title before creating.'
    : tenantIncidentNeedsTenant
      ? 'Select a tenant for tenant-specific incidents.'
      : missingStartedAt
        ? 'Select a valid start date and time.'
        : '';
  const updateDisabled = addUpdate.isPending || !updateForm.message.trim();
  const cancelDisabled = cancel.isPending || !cancelReason.trim();
  const tenantLoadError = tenants.error ? readableError(tenants.error) : '';
  const incidentLoadError = incidents.error ? readableError(incidents.error) : '';
  const detailLoadError = selectedIncident.error ? readableError(selectedIncident.error) : '';
  const activeFilterSummary = [
    filters.status ? `status=${filters.status}` : 'all statuses',
    filters.severity ? `severity=${filters.severity}` : 'all severities',
    filters.scope ? `scope=${filters.scope}` : 'all scopes',
    filters.tenant_id ? 'tenant selected' : 'all tenants',
    filters.include_resolved === 'true' ? 'including closed' : 'open only'
  ].join(' · ');
  const selectedIncidentIsClosed = isClosedIncident(selectedIncident.data?.status);

  return <div style={styles.page}>
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>Platform incidents</h1>
        <p style={styles.muted}>Track unplanned outages or degraded service separately from maintenance and announcements.</p>
      </div>
      <button style={styles.secondaryButton} type="button" onClick={() => void refreshAll()} disabled={incidents.isFetching || tenants.isFetching}>Refresh</button>
    </header>

    {statusMessage ? <div style={styles.success}>{statusMessage}</div> : null}

    {(incidentLoadError || tenantLoadError || detailLoadError) ? <section style={styles.errorPanel}>
      <b>Load issue</b>
      {incidentLoadError ? <span>Incidents: {incidentLoadError}</span> : null}
      {tenantLoadError ? <span>Tenants: {tenantLoadError}</span> : null}
      {detailLoadError ? <span>Selected incident: {detailLoadError}</span> : null}
      <button style={styles.button} type="button" onClick={() => void refreshAll()}>Retry</button>
    </section> : null}

    <section style={styles.metadataPanel}>
      <span><b>Snapshot source:</b> /platform/incidents, /platform/incidents/:id, /platform/tenants, /incident-context/current</span>
      <span><b>Current filters:</b> {activeFilterSummary}</span>
      <span><b>Rows shown:</b> {rows.length} · <b>Tenant options:</b> {(tenants.data || []).length} · <b>Selected incident:</b> {selectedIncidentId || 'None'}</span>
    </section>

    <section style={styles.linksPanel}>
      <Link style={styles.linkButton} to="/platform/maintenance">Maintenance</Link>
      <Link style={styles.linkButton} to="/platform/announcements">Announcements</Link>
      <Link style={styles.linkButton} to="/platform/operational-jobs">Operational jobs</Link>
      <Link style={styles.linkButton} to="/platform/audit">Platform audit</Link>
      <Link style={styles.linkButton} to="/platform/support-operations-cockpit">Support cockpit</Link>
    </section>

    <section style={styles.summaryGrid}>
      <div style={styles.summaryCard}><b>Open</b><span>{openIncidents.length}</span></div>
      <div style={styles.summaryCard}><b>Critical</b><span>{openIncidents.filter((i) => i.severity === 'critical').length}</span></div>
      <div style={styles.summaryCard}><b>Platform-wide</b><span>{openIncidents.filter((i) => i.scope === 'platform').length}</span></div>
      <div style={styles.summaryCard}><b>Tenant-specific</b><span>{openIncidents.filter((i) => i.scope === 'tenant').length}</span></div>
    </section>

    {canWrite ? <section style={styles.panel}>
      <h2>Create incident</h2>
      <p style={styles.muted}>Scope only controls whether the incident is platform-wide or tied to one tenant. The four cards above are counters, not create options.</p>
      <div style={styles.formGrid}>
        <label style={styles.fieldLabel}>
          Title
          <input style={styles.input} placeholder="Incident title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label style={styles.fieldLabel}>
          Severity
          <select style={styles.input} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            <option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option>
          </select>
        </label>
        <label style={styles.fieldLabel}>
          Impact
          <select style={styles.input} value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })}>
            <option value="none">None</option><option value="degraded">Degraded</option><option value="partial_outage">Partial outage</option><option value="major_outage">Major outage</option>
          </select>
        </label>
        <label style={styles.fieldLabel}>
          Scope
          <select style={styles.input} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value, tenant_id: '' })}>
            <option value="platform">Platform-wide</option><option value="tenant">Tenant-specific</option>
          </select>
        </label>
        {form.scope === 'tenant' ? <label style={styles.fieldLabel}>
          Tenant
          <select style={styles.input} value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}>
            <option value="">Select tenant</option>
            {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label> : null}
        <label style={styles.fieldLabel}>
          Started at
          <input style={styles.input} type="datetime-local" value={form.started_at} onChange={(e) => setForm({ ...form, started_at: e.target.value })} />
        </label>
      </div>
      <label style={styles.fieldLabel}>
        Internal summary
        <textarea style={styles.textarea} placeholder="Brief internal summary" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
      </label>
      <label style={styles.fieldLabel}>
        Public message
        <textarea style={styles.textarea} placeholder="Message shown to affected tenant users" value={form.public_message} onChange={(e) => setForm({ ...form, public_message: e.target.value })} />
      </label>
      <label style={styles.fieldLabel}>
        Internal notes
        <textarea style={styles.textarea} placeholder="Internal notes" value={form.internal_notes} onChange={(e) => setForm({ ...form, internal_notes: e.target.value })} />
      </label>
      {createDisabledReason ? <div style={styles.inlineHint}>{createDisabledReason}</div> : null}
      <button style={createDisabled ? styles.disabledButton : styles.button} type="button" onClick={() => create.mutate()} disabled={createDisabled}>Create incident</button>
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
    </section> : null}

    <section style={styles.panel}>
      <h2>Filters</h2>
      {searchParams.get('tenant_id') ? <p style={styles.muted}>Opened with tenant_id from URL. <Link to="/platform/incidents">Clear URL filter</Link></p> : null}
      <div style={styles.filters}>
        <label style={styles.filterLabel}>
          Status
          <select style={styles.input} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option><option value="investigating">Investigating</option><option value="identified">Identified</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option><option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label style={styles.filterLabel}>
          Severity
          <select style={styles.input} value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
            <option value="">All severities</option><option value="minor">Minor</option><option value="major">Major</option><option value="critical">Critical</option>
          </select>
        </label>
        <label style={styles.filterLabel}>
          Scope
          <select style={styles.input} value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
            <option value="">All scopes</option><option value="platform">Platform-wide</option><option value="tenant">Tenant-specific</option>
          </select>
        </label>
        <label style={styles.filterLabel}>
          Tenant
          <select style={styles.input} value={filters.tenant_id} onChange={(e) => setFilters({ ...filters, tenant_id: e.target.value, scope: e.target.value ? 'tenant' : filters.scope })}>
            <option value="">All tenants</option>
            {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label>
        <label style={styles.filterLabel}>
          Visibility
          <select style={styles.input} value={filters.include_resolved} onChange={(e) => setFilters({ ...filters, include_resolved: e.target.value })}>
            <option value="false">Open only</option><option value="true">Include resolved/cancelled</option>
          </select>
        </label>
      </div>
    </section>

    <section style={styles.grid}>
      <div style={styles.list}>
        {rows.map((incident) => <article key={incident.id} style={styles.card} onClick={() => setSelectedIncidentId(incident.id)}>
          <div style={styles.cardHeader}>
            <div>
              <h3 style={styles.cardTitle}>{incident.title}</h3>
              <p style={styles.muted}>{incident.scope === 'platform' ? 'Platform-wide' : `Tenant: ${incident.tenant_name || incident.tenant_id}`}</p>
            </div>
            <div style={styles.badges}><span style={styles.badge}>{incident.status}</span><span style={incident.severity === 'critical' ? styles.criticalBadge : styles.badge}>{incident.severity}</span></div>
          </div>
          {incident.summary ? <p>{incident.summary}</p> : null}
          <p style={styles.muted}>Impact: {incident.impact} · Started: {formatDateTime(incident.started_at)} · Updates: {incident.update_count || 0}</p>
          <div style={styles.evidenceLinks}>
            <Link style={styles.inlineLink} to={`/platform/audit?target_id=${incident.id}`}>Audit evidence</Link>
            {incident.scope === 'tenant' && incident.tenant_id ? <Link style={styles.inlineLink} to={`/platform/incidents?tenant_id=${incident.tenant_id}`}>Tenant incident filter</Link> : null}
          </div>
        </article>)}
        {!incidents.isLoading && rows.length === 0 ? <div style={styles.empty}>No incidents match the current filters.</div> : null}
      </div>

      <aside style={styles.panel}>
        <h2>Incident detail</h2>
        {selectedIncident.data ? <>
          <h3 style={styles.cardTitle}>{selectedIncident.data.title}</h3>
          <p style={styles.muted}>Status: {selectedIncident.data.status} · Severity: {selectedIncident.data.severity} · Impact: {selectedIncident.data.impact}</p>
          <div style={styles.detailMeta}>
            <span><b>Scope:</b> {selectedIncident.data.scope === 'platform' ? 'Platform-wide' : selectedIncident.data.tenant_name || selectedIncident.data.tenant_id || 'Tenant-specific'}</span>
            <span><b>Started:</b> {formatDateTime(selectedIncident.data.started_at)}</span>
            <span><b>Resolved:</b> {formatDateTime(selectedIncident.data.resolved_at)}</span>
            <span><b>Created by:</b> {selectedIncident.data.created_by_email || 'Not recorded'}</span>
            <span><b>Resolved by:</b> {selectedIncident.data.resolved_by_email || 'Not recorded'}</span>
          </div>
          <div style={styles.evidenceLinks}>
            <Link style={styles.inlineLink} to={`/platform/audit?target_id=${selectedIncident.data.id}`}>Audit evidence</Link>
            {selectedIncident.data.tenant_id ? <Link style={styles.inlineLink} to={`/platform/tenant-timeline?tenant_id=${selectedIncident.data.tenant_id}`}>Tenant timeline</Link> : null}
            {selectedIncident.data.tenant_id ? <Link style={styles.inlineLink} to={`/platform/support-operations-cockpit?tenant_id=${selectedIncident.data.tenant_id}`}>Support context</Link> : null}
          </div>
          {selectedIncident.data.public_message ? <p><b>Public:</b> {selectedIncident.data.public_message}</p> : null}
          {selectedIncident.data.internal_notes ? <p><b>Internal:</b> {selectedIncident.data.internal_notes}</p> : null}
          {canWrite && !selectedIncidentIsClosed ? <div style={styles.updateBox}>
            <h3>Add update</h3>
            <label style={styles.fieldLabel}>
              New status
              <select style={styles.input} value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })}>
                <option value="investigating">Investigating</option><option value="identified">Identified</option><option value="monitoring">Monitoring</option><option value="resolved">Resolved</option>
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Update message
              <textarea style={styles.textarea} placeholder="Update message" value={updateForm.message} onChange={(e) => setUpdateForm({ ...updateForm, message: e.target.value })} />
            </label>
            <label style={styles.checkboxLabel}><input type="checkbox" checked={updateForm.is_public} onChange={(e) => setUpdateForm({ ...updateForm, is_public: e.target.checked })} /> Visible to affected tenant users</label>
            <button style={updateDisabled ? styles.disabledButton : styles.button} type="button" onClick={() => { if (updateForm.status !== 'resolved' || window.confirm('Resolve this incident? Closed incidents cannot receive new updates.')) addUpdate.mutate(); }} disabled={updateDisabled}>Add update</button>
            <div style={styles.cancelRow}>
              <label style={styles.fieldLabel}>
                Cancel reason
                <input style={styles.input} placeholder="Reason required before cancelling" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              </label>
              <button style={cancelDisabled ? styles.disabledDangerButton : styles.dangerButton} type="button" onClick={() => { if (window.confirm('Cancel this incident? The cancellation update will be internal.')) cancel.mutate(); }} disabled={cancelDisabled}>Cancel incident</button>
            </div>
            {addUpdate.error ? <div style={styles.error}>{readableError(addUpdate.error)}</div> : null}
            {cancel.error ? <div style={styles.error}>{readableError(cancel.error)}</div> : null}
          </div> : null}
          <h3>Updates</h3>
          <div style={styles.timeline}>{(selectedIncident.data.updates || []).map((update) => <div key={update.id} style={styles.timelineItem}>
            <b>{update.status}</b> · {formatDateTime(update.created_at)} · {update.is_public ? 'public' : 'internal'}
            <div>{update.message}</div>
            <span style={styles.muted}>Source: incident timeline update · Actor: {update.created_by_email || 'Not recorded'}</span>
          </div>)}</div>
        </> : <p style={styles.muted}>Select an incident to see updates and actions.</p>}
      </aside>
    </section>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px' },
  header: { display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '28px' },
  muted: { color: '#6b7280', margin: '4px 0' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
  summaryCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', display: 'grid', gap: '12px', alignSelf: 'start' },
  metadataPanel: { background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px', padding: '14px', display: 'grid', gap: '6px', color: '#334155' },
  linksPanel: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  errorPanel: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '14px', padding: '14px', display: 'grid', gap: '8px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' },
  filters: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 420px)', gap: '16px', alignItems: 'start' },
  list: { display: 'grid', gap: '12px' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', cursor: 'pointer' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px' },
  cardTitle: { margin: 0 },
  badges: { display: 'flex', gap: '6px', alignItems: 'start', flexWrap: 'wrap' },
  badge: { background: '#eef2ff', color: '#3730a3', padding: '4px 10px', borderRadius: '999px', height: 'fit-content' },
  criticalBadge: { background: '#7f1d1d', color: '#fff', padding: '4px 10px', borderRadius: '999px', height: 'fit-content' },
  fieldLabel: { display: 'grid', gap: '6px', fontWeight: 600 },
  filterLabel: { display: 'grid', gap: '6px', fontWeight: 600 },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px' },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', minHeight: '80px', fontFamily: 'inherit' },
  button: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#111827', color: '#fff', cursor: 'pointer', width: 'fit-content' },
  secondaryButton: { padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: '10px', background: '#fff', color: '#111827', cursor: 'pointer', width: 'fit-content' },
  linkButton: { display: 'inline-flex', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '999px', background: '#fff', color: '#111827', textDecoration: 'none' },
  inlineLink: { color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 },
  disabledButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#9ca3af', color: '#fff', cursor: 'not-allowed', width: 'fit-content', opacity: 0.75 },
  dangerButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#991b1b', color: '#fff', cursor: 'pointer' },
  disabledDangerButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#bca5a5', color: '#fff', cursor: 'not-allowed', opacity: 0.75 },
  inlineHint: { color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '10px' },
  success: { color: '#166534', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '10px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px' },
  cancelRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' },
  updateBox: { border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', display: 'grid', gap: '10px' },
  detailMeta: { display: 'grid', gap: '4px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' },
  evidenceLinks: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' },
  timeline: { display: 'grid', gap: '8px' },
  timelineItem: { borderLeft: '3px solid #d1d5db', paddingLeft: '10px', lineHeight: 1.45 },
  error: { color: '#991b1b', background: '#fee2e2', borderRadius: '10px', padding: '10px' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px' }
};
