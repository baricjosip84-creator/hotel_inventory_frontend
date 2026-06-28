import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
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

export default function PlatformIncidentsPage() {
  const qc = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_WRITE);
  const [filters, setFilters] = useState({ status: '', severity: '', scope: '', include_resolved: 'false' });
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

  const query = new URLSearchParams({ limit: '200', include_resolved: filters.include_resolved });
  if (filters.status) query.set('status', filters.status);
  if (filters.severity) query.set('severity', filters.severity);
  if (filters.scope) query.set('scope', filters.scope);

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

  const create = useMutation({
    mutationFn: () => platformApiRequest<Incident>('/platform/incidents', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        summary: form.summary || null,
        severity: form.severity,
        impact: form.impact,
        scope: form.scope,
        tenant_id: form.scope === 'tenant' ? form.tenant_id : null,
        started_at: new Date(form.started_at).toISOString(),
        public_message: form.public_message || null,
        internal_notes: form.internal_notes || null,
        initial_update: form.initial_update || form.public_message || form.summary || null
      })
    }),
    onSuccess: async (incident) => {
      setForm({ ...form, title: '', summary: '', public_message: '', internal_notes: '', initial_update: '' });
      setSelectedIncidentId(incident.id);
      await qc.invalidateQueries({ queryKey: ['platform', 'incidents'] });
    }
  });

  const addUpdate = useMutation({
    mutationFn: () => platformApiRequest<Incident>(`/platform/incidents/${selectedIncidentId}/updates`, {
      method: 'POST',
      body: JSON.stringify(updateForm)
    }),
    onSuccess: async () => {
      setUpdateForm({ ...updateForm, message: '' });
      await qc.invalidateQueries({ queryKey: ['platform', 'incidents'] });
    }
  });

  const cancel = useMutation({
    mutationFn: () => platformApiRequest<Incident>(`/platform/incidents/${selectedIncidentId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: cancelReason }) }),
    onSuccess: async () => {
      setCancelReason('');
      await qc.invalidateQueries({ queryKey: ['platform', 'incidents'] });
    }
  });

  const rows = incidents.data || [];
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

  return <div style={styles.page}>
    <header>
      <h1 style={styles.title}>Platform incidents</h1>
      <p style={styles.muted}>Track unplanned outages or degraded service separately from maintenance and announcements.</p>
    </header>

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
      <button style={createDisabled ? styles.disabledButton : styles.button} onClick={() => create.mutate()} disabled={createDisabled}>Create incident</button>
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
    </section> : null}

    <section style={styles.panel}>
      <h2>Filters</h2>
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
          Visibility
          <select style={styles.input} value={filters.include_resolved} onChange={(e) => setFilters({ ...filters, include_resolved: e.target.value })}>
            <option value="false">Open only</option><option value="true">Include resolved/cancelled</option>
          </select>
        </label>
      </div>
    </section>

    {incidents.error ? <div style={styles.error}>{readableError(incidents.error)}</div> : null}

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
          <p style={styles.muted}>Impact: {incident.impact} · Started: {new Date(incident.started_at).toLocaleString()} · Updates: {incident.update_count || 0}</p>
        </article>)}
        {!incidents.isLoading && rows.length === 0 ? <div style={styles.empty}>No incidents match the current filters.</div> : null}
      </div>

      <aside style={styles.panel}>
        <h2>Incident detail</h2>
        {selectedIncident.data ? <>
          <h3 style={styles.cardTitle}>{selectedIncident.data.title}</h3>
          <p style={styles.muted}>Status: {selectedIncident.data.status} · Severity: {selectedIncident.data.severity} · Impact: {selectedIncident.data.impact}</p>
          {selectedIncident.data.public_message ? <p><b>Public:</b> {selectedIncident.data.public_message}</p> : null}
          {selectedIncident.data.internal_notes ? <p><b>Internal:</b> {selectedIncident.data.internal_notes}</p> : null}
          {canWrite && !['resolved', 'cancelled'].includes(selectedIncident.data.status) ? <div style={styles.updateBox}>
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
            <button style={updateDisabled ? styles.disabledButton : styles.button} onClick={() => addUpdate.mutate()} disabled={updateDisabled}>Add update</button>
            <div style={styles.cancelRow}>
              <label style={styles.fieldLabel}>
                Cancel reason
                <input style={styles.input} placeholder="Reason required before cancelling" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              </label>
              <button style={cancelDisabled ? styles.disabledDangerButton : styles.dangerButton} onClick={() => cancel.mutate()} disabled={cancelDisabled}>Cancel incident</button>
            </div>
            {addUpdate.error ? <div style={styles.error}>{readableError(addUpdate.error)}</div> : null}
            {cancel.error ? <div style={styles.error}>{readableError(cancel.error)}</div> : null}
          </div> : null}
          <h3>Updates</h3>
          <div style={styles.timeline}>{(selectedIncident.data.updates || []).map((update) => <div key={update.id} style={styles.timelineItem}>
            <b>{update.status}</b> · {new Date(update.created_at).toLocaleString()} · {update.is_public ? 'public' : 'internal'}
            <div>{update.message}</div>
          </div>)}</div>
        </> : <p style={styles.muted}>Select an incident to see updates and actions.</p>}
      </aside>
    </section>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px' },
  title: { margin: 0, fontSize: '28px' },
  muted: { color: '#6b7280', margin: '4px 0' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
  summaryCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', display: 'grid', gap: '12px', alignSelf: 'start' },
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
  disabledButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#9ca3af', color: '#fff', cursor: 'not-allowed', width: 'fit-content', opacity: 0.75 },
  dangerButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#991b1b', color: '#fff', cursor: 'pointer' },
  disabledDangerButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#bca5a5', color: '#fff', cursor: 'not-allowed', opacity: 0.75 },
  inlineHint: { color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '10px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px' },
  cancelRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px' },
  updateBox: { border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', display: 'grid', gap: '10px' },
  timeline: { display: 'grid', gap: '8px' },
  timelineItem: { borderLeft: '3px solid #d1d5db', paddingLeft: '10px', lineHeight: 1.45 },
  error: { color: '#991b1b', background: '#fee2e2', borderRadius: '10px', padding: '10px' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px' }
};
