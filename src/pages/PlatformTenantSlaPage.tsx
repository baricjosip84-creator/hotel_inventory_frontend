import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type SlaRow = {
  tenant_id: string;
  tenant_name: string;
  is_active: boolean;
  response_target_minutes: number;
  incident_resolution_target_hours: number;
  task_overdue_grace_hours: number;
  review_frequency: 'daily' | 'weekly' | 'monthly';
  escalation_notes?: string;
  breach_count: number;
  status: 'within_sla' | 'breached';
  counts: Record<string, number>;
};
type SlaOverview = {
  generated_at: string;
  summary: { tenants: number; breached: number; within_sla: number; inactive_policies: number };
  tenants: SlaRow[];
};
type PolicyResponse = {
  policies: Array<{
    tenant_id: string;
    response_target_minutes: number;
    incident_resolution_target_hours: number;
    task_overdue_grace_hours: number;
    review_frequency: 'daily' | 'weekly' | 'monthly';
    escalation_notes?: string;
    is_active: boolean;
  }>;
};

type SlaScanResult = {
  scanned_at: string;
  tenants_checked: number;
  breached_tenants: number;
  created: number;
  refreshed: number;
  notifications_touched: number;
  summary: SlaOverview['summary'];
};

type FormState = {
  tenant_id: string;
  response_target_minutes: string;
  incident_resolution_target_hours: string;
  task_overdue_grace_hours: string;
  review_frequency: 'daily' | 'weekly' | 'monthly';
  escalation_notes: string;
  is_active: boolean;
};

const defaultForm: FormState = {
  tenant_id: '',
  response_target_minutes: '60',
  incident_resolution_target_hours: '24',
  task_overdue_grace_hours: '24',
  review_frequency: 'weekly',
  escalation_notes: '',
  is_active: true
};

function badgeStyle(status: SlaRow['status']): CSSProperties {
  return status === 'breached'
    ? { ...styles.badge, background: '#fee2e2', color: '#991b1b' }
    : { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformTenantSlaPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState(searchParams.get('tenant_id') || '');
  const [onlyBreached, setOnlyBreached] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'sla-picker'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const overviewQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (tenantId) params.set('tenant_id', tenantId);
    return params.toString();
  }, [tenantId]);

  const overview = useQuery({
    queryKey: ['platform', 'tenant-sla', 'overview', tenantId],
    queryFn: () => platformApiRequest<SlaOverview>(`/platform/tenant-sla/overview${overviewQuery ? `?${overviewQuery}` : ''}`)
  });

  const policies = useQuery({
    queryKey: ['platform', 'tenant-sla', 'policies'],
    queryFn: () => platformApiRequest<PolicyResponse>('/platform/tenant-sla')
  });

  const savePolicy = useMutation({
    mutationFn: () => platformApiRequest(`/platform/tenant-sla/${form.tenant_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        response_target_minutes: Number(form.response_target_minutes) || 60,
        incident_resolution_target_hours: Number(form.incident_resolution_target_hours) || 24,
        task_overdue_grace_hours: Number(form.task_overdue_grace_hours),
        review_frequency: form.review_frequency,
        escalation_notes: form.escalation_notes.trim(),
        is_active: form.is_active
      })
    }),
    onSuccess: () => {
      window.alert('SLA policy saved.');
      setForm(defaultForm);
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-sla'] });
    }
  });

  const scan = useMutation({
    mutationFn: () => platformApiRequest<SlaScanResult>('/platform/tenant-sla/scan', { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-sla'] });
      void queryClient.invalidateQueries({ queryKey: ['platform', 'notifications'] });
    }
  });

  const rows = (overview.data?.tenants || []).filter((row) => !onlyBreached || row.breach_count > 0);
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_WRITE);
  const tenantError = tenants.error instanceof Error ? tenants.error.message : tenants.error ? 'Tenant list failed to load' : '';
  const overviewError = overview.error instanceof Error ? overview.error.message : overview.error ? 'Tenant SLA overview failed to load' : '';
  const policiesError = policies.error instanceof Error ? policies.error.message : policies.error ? 'Tenant SLA policies failed to load' : '';
  const selectedTenantName = tenantId ? tenants.data?.find((tenant) => tenant.id === tenantId)?.name || 'Selected tenant' : 'All tenants';
  const responseTarget = Number(form.response_target_minutes);
  const incidentTarget = Number(form.incident_resolution_target_hours);
  const taskGrace = Number(form.task_overdue_grace_hours);
  const formIsValid = Boolean(form.tenant_id) && Number.isInteger(responseTarget) && responseTarget >= 1 && responseTarget <= 10080 && Number.isInteger(incidentTarget) && incidentTarget >= 1 && incidentTarget <= 8760 && Number.isInteger(taskGrace) && taskGrace >= 0 && taskGrace <= 8760;

  function refreshAll() {
    void tenants.refetch();
    void overview.refetch();
    void policies.refetch();
  }

  function loadPolicy(tenant: SlaRow) {
    const existing = policies.data?.policies.find((policy) => policy.tenant_id === tenant.tenant_id);
    setForm({
      tenant_id: tenant.tenant_id,
      response_target_minutes: String(existing?.response_target_minutes ?? tenant.response_target_minutes),
      incident_resolution_target_hours: String(existing?.incident_resolution_target_hours ?? tenant.incident_resolution_target_hours),
      task_overdue_grace_hours: String(existing?.task_overdue_grace_hours ?? tenant.task_overdue_grace_hours),
      review_frequency: existing?.review_frequency ?? tenant.review_frequency,
      escalation_notes: existing?.escalation_notes ?? tenant.escalation_notes ?? '',
      is_active: existing?.is_active ?? tenant.is_active
    });
  }

  return (
    <div style={styles.page}>
      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Tenant SLA</h1>
          <p style={styles.muted}>Operational targets for HLA/platform response, incident resolution, and overdue tenant work. This turns support expectations into visible breaches instead of hidden promises.</p>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={refreshAll} disabled={tenants.isFetching || overview.isFetching || policies.isFetching}>Refresh</button>
      </header>

      <section style={styles.metaPanel}>
        <span><strong>Snapshot:</strong> {overview.data?.generated_at ? new Date(overview.data.generated_at).toLocaleString() : 'Not loaded'}</span>
        <span><strong>Tenant scope:</strong> {selectedTenantName}</span>
        <span><strong>Breached filter:</strong> {onlyBreached ? 'Breached only' : 'All SLA rows'}</span>
        <span><strong>Rows shown:</strong> {rows.length}</span>
      </section>

      <nav style={styles.linkRow} aria-label="Related SLA source pages">
        <a style={styles.link} href="/platform/tenant-health">Tenant Health</a>
        <a style={styles.link} href="/platform/incidents">Incidents</a>
        <a style={styles.link} href="/platform/tenant-tasks">Tenant Tasks</a>
        <a style={styles.link} href="/platform/support-sessions">Support Sessions</a>
        <a style={styles.link} href="/platform/notifications">Notifications</a>
      </nav>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Overview</h2>
        {tenantError || overviewError || policiesError ? (
          <div style={styles.errorBox}>
            <strong>Load problem</strong>
            {tenantError ? <span>{tenantError}</span> : null}
            {overviewError ? <span>{overviewError}</span> : null}
            {policiesError ? <span>{policiesError}</span> : null}
            <button type="button" style={styles.smallButton} onClick={refreshAll}>Retry</button>
          </div>
        ) : null}
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}><strong>{overview.data?.summary.tenants ?? 0}</strong><span>Tenants tracked</span></div>
          <div style={styles.summaryCard}><strong>{overview.data?.summary.breached ?? 0}</strong><span>Breached</span></div>
          <div style={styles.summaryCard}><strong>{overview.data?.summary.within_sla ?? 0}</strong><span>Within SLA</span></div>
          <div style={styles.summaryCard}><strong>{overview.data?.summary.inactive_policies ?? 0}</strong><span>Inactive policies</span></div>
        </div>
        <div style={styles.filterGrid}>
          <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
            <option value="">All tenants</option>
            {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={onlyBreached} onChange={(event) => setOnlyBreached(event.target.checked)} />
            Breached only
          </label>
          <button type="button" style={styles.button} onClick={refreshAll} disabled={tenants.isFetching || overview.isFetching || policies.isFetching}>Refresh</button>
          {canWrite ? <button type="button" style={styles.secondaryButton} onClick={() => scan.mutate()} disabled={scan.isPending}>{scan.isPending ? 'Syncing...' : 'Sync SLA notifications'}</button> : null}
        </div>
        {canWrite ? (
          <p style={styles.helpText}>This action scans the current SLA overview and keeps one open SLA platform notification for each active breached tenant; existing open SLA notifications are refreshed instead of duplicated.</p>
        ) : null}
        {scan.data ? (
          <p style={styles.successText}>SLA notification sync complete: checked {scan.data.tenants_checked} tenant(s); {scan.data.breached_tenants} breached tenant(s); {scan.data.created} created, {scan.data.refreshed} refreshed, {scan.data.notifications_touched} total touched.</p>
        ) : null}
        {scan.error ? <p style={styles.errorText}>{scan.error instanceof Error ? scan.error.message : 'SLA notification sync failed'}</p> : null}
      </section>

      {canWrite ? (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>SLA policy</h2>
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>
              Tenant
              <select style={styles.input} value={form.tenant_id} onChange={(event) => setForm((current) => ({ ...current, tenant_id: event.target.value }))}>
                <option value="">Select tenant</option>
                {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Response SLA (minutes)
              <input style={styles.input} type="number" min="1" value={form.response_target_minutes} onChange={(event) => setForm((current) => ({ ...current, response_target_minutes: event.target.value }))} />
            </label>
            <label style={styles.fieldLabel}>
              Incident SLA (hours)
              <input style={styles.input} type="number" min="1" value={form.incident_resolution_target_hours} onChange={(event) => setForm((current) => ({ ...current, incident_resolution_target_hours: event.target.value }))} />
            </label>
            <label style={styles.fieldLabel}>
              Task grace period (hours)
              <input style={styles.input} type="number" min="0" value={form.task_overdue_grace_hours} onChange={(event) => setForm((current) => ({ ...current, task_overdue_grace_hours: event.target.value }))} />
            </label>
            <label style={styles.fieldLabel}>
              Review cadence
              <select style={styles.input} value={form.review_frequency} onChange={(event) => setForm((current) => ({ ...current, review_frequency: event.target.value as FormState['review_frequency'] }))}>
                <option value="daily">Daily review</option>
                <option value="weekly">Weekly review</option>
                <option value="monthly">Monthly review</option>
              </select>
            </label>
            <label style={styles.fieldLabel}>
              Active policy
              <span style={styles.checkboxField}>
                <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
                Policy is active
              </span>
            </label>
            <label style={{ ...styles.fieldLabel, gridColumn: '1 / -1' }}>
              Escalation notes
              <textarea style={{ ...styles.input, minHeight: 96, resize: 'vertical' }} value={form.escalation_notes} onChange={(event) => setForm((current) => ({ ...current, escalation_notes: event.target.value }))} placeholder="Add escalation instructions, owner notes, or review context." />
            </label>
            <p style={styles.helperText}>These thresholds determine when tenant work is considered overdue and when SLA notifications are generated. Response must be 1-10080 minutes, incident must be 1-8760 hours, and task grace must be 0-8760 hours.</p>
            <button type="button" style={styles.button} onClick={() => savePolicy.mutate()} disabled={!formIsValid || savePolicy.isPending}>{savePolicy.isPending ? 'Saving...' : 'Save policy'}</button>
          </div>
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>SLA status</h2>
        {overview.isLoading ? <p style={styles.muted}>Loading SLA status...</p> : null}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr><th>Tenant</th><th>Status</th><th>Targets</th><th>Breaches</th><th>Open work</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.tenant_id}>
                  <td><strong>{row.tenant_name}</strong><br /><span style={styles.muted}>{row.is_active ? 'active policy' : 'inactive policy'}</span></td>
                  <td><span style={badgeStyle(row.status)}>{row.status === 'breached' ? 'Breached' : 'Within SLA'}</span></td>
                  <td>{row.response_target_minutes}m response<br />{row.incident_resolution_target_hours}h incident<br />{row.task_overdue_grace_hours}h task grace</td>
                  <td>{row.breach_count}<br /><span style={styles.muted}>Incident {row.counts.breached_open_incidents} · Task {row.counts.overdue_tasks_after_grace} · Support {row.counts.support_response_breaches}</span></td>
                  <td>Incidents {row.counts.open_incidents}<br />Tasks {row.counts.open_tasks}<br />Support approvals {row.counts.pending_support_approvals}</td>
                  <td>
                    <div style={styles.actionStack}>
                      {canWrite ? <button type="button" style={styles.smallButton} onClick={() => loadPolicy(row)}>Edit policy</button> : null}
                      <a style={styles.rowLink} href={`/platform/tenant-health?tenant_id=${row.tenant_id}`}>Health</a>
                      <a style={styles.rowLink} href={`/platform/tenant-tasks?tenant_id=${row.tenant_id}`}>Tasks</a>
                      <a style={styles.rowLink} href={`/platform/tenant-timeline?tenant_id=${row.tenant_id}`}>Timeline</a>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={6} style={styles.empty}>No SLA rows match the current filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 24 },
  headerRow: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  title: { margin: 0, fontSize: 30 },
  muted: { color: '#6b7280', fontSize: 13 },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)' },
  metaPanel: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, color: '#374151', fontSize: 13 },
  linkRow: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  link: { border: '1px solid #bfdbfe', borderRadius: 999, padding: '7px 10px', color: '#1d4ed8', textDecoration: 'none', fontSize: 13, fontWeight: 700, background: '#eff6ff' },
  rowLink: { color: '#1d4ed8', fontSize: 12, fontWeight: 700, textDecoration: 'none' },
  actionStack: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 },
  errorBox: { display: 'flex', flexDirection: 'column', gap: 8, border: '1px solid #fecaca', borderRadius: 12, padding: 12, marginBottom: 16, background: '#fef2f2', color: '#991b1b', fontSize: 13 },
  sectionTitle: { marginTop: 0, fontSize: 18 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 },
  summaryCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 4 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto auto auto', gap: 12, alignItems: 'center' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'center' },
  input: { border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#fff' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, color: '#374151', fontSize: 13, fontWeight: 700 },
  helperText: { gridColumn: '1 / -1', margin: '0 0 2px', color: '#6b7280', fontSize: 13 },
  helpText: { margin: '12px 0 0', color: '#6b7280', fontSize: 13 },
  successText: { margin: '12px 0 0', color: '#166534', fontSize: 14, fontWeight: 700 },
  errorText: { margin: '12px 0 0', color: '#991b1b', fontSize: 14, fontWeight: 700 },
  checkboxField: { border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'center', color: '#111827', fontSize: 14, fontWeight: 500, background: '#fff' },
  checkboxLabel: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 },
  button: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#111827', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #111827', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#111827', fontWeight: 700, cursor: 'pointer' },
  smallButton: { border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 10px', background: '#fff', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  badge: { display: 'inline-flex', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  empty: { textAlign: 'center', color: '#6b7280', padding: 24 }
};
