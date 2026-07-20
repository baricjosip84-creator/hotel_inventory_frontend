import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string; status?: string; write_locked?: boolean };
type PlatformUser = { id: string; email: string; name?: string | null };
type OffboardingRow = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  tenant_status?: string;
  write_locked?: boolean;
  status: string;
  reason?: string | null;
  scheduled_for?: string | null;
  owner_platform_user_id?: string | null;
  owner_platform_user_email?: string | null;
  checklist: Record<string, boolean>;
  checklist_complete?: boolean;
  notes?: string | null;
  completed_at?: string | null;
  updated_at?: string;
};
type Checks = {
  tenant_user_count: number;
  active_tenant_sessions: number;
  active_support_sessions: number;
  open_incidents: number;
  open_tasks: number;
  last_export_at?: string | null;
  legal_hold?: boolean;
  legal_hold_reason?: string | null;
  retain_until?: string | null;
  purge_after_offboarding?: boolean;
};
type Detail = { offboarding: OffboardingRow | null; checks: Checks };

const statuses = ['not_started', 'planned', 'in_progress', 'blocked', 'ready_to_archive', 'completed', 'cancelled'];
const checklistKeys = [
  'customer_notified',
  'billing_closed',
  'final_export_completed',
  'active_users_reviewed',
  'active_sessions_revoked',
  'support_sessions_closed',
  'open_incidents_resolved',
  'open_tasks_closed',
  'tenant_locked',
  'data_retention_confirmed'
];
const labels: Record<string, string> = {
  customer_notified: 'Customer notified',
  billing_closed: 'Billing closed',
  final_export_completed: 'Final export completed',
  active_users_reviewed: 'Active users reviewed',
  active_sessions_revoked: 'Active sessions revoked',
  support_sessions_closed: 'Support sessions closed',
  open_incidents_resolved: 'Open incidents resolved',
  open_tasks_closed: 'Open tasks closed',
  tenant_locked: 'Tenant locked',
  data_retention_confirmed: 'Data retention confirmed'
};

const emptyChecklist = checklistKeys.reduce<Record<string, boolean>>((acc, key) => ({ ...acc, [key]: false }), {});
const blankForm = { tenant_id: '', status: 'planned', reason: '', scheduled_for: '', owner_platform_user_id: '', notes: '', checklist: emptyChecklist };

function readableError(error: unknown): string { return error instanceof Error ? error.message : 'Unknown error'; }
function formatDate(value?: string | null): string { return value ? new Date(value).toLocaleString() : '-'; }
function dateTimeLocalToIso(value: string): string | null { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function isValidDateInput(value: string) { return !value || !Number.isNaN(new Date(value).getTime()); }
function pretty(value: string): string { return value.replaceAll('_', ' '); }
function trimOrNull(value: string) { const trimmed = value.trim(); return trimmed || null; }
function normalizeForm(value: typeof blankForm) {
  return JSON.stringify({
    tenant_id: value.tenant_id || '',
    status: value.status || 'planned',
    reason: value.reason.trim(),
    scheduled_for: value.scheduled_for || '',
    owner_platform_user_id: value.owner_platform_user_id || '',
    notes: value.notes.trim(),
    checklist: checklistKeys.reduce<Record<string, boolean>>((acc, key) => ({ ...acc, [key]: Boolean(value.checklist?.[key]) }), {})
  });
}
function SourceLink({ to, children }: { to: string; children: string }) { return <Link to={to} style={styles.link}>{children}</Link>; }

export default function PlatformTenantOffboardingPage() {
  const qc = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_UPDATE);
  const [tenantId, setTenantId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [originalForm, setOriginalForm] = useState<typeof blankForm | null>(null);
  const [archiveOnComplete, setArchiveOnComplete] = useState(true);
  const [loadedWorkflowId, setLoadedWorkflowId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'for-offboarding'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const users = useQuery({ queryKey: ['platform', 'users', 'for-offboarding'], queryFn: () => platformApiRequest<PlatformUser[]>('/platform/users'), enabled: canWrite });

  const queryString = useMemo(() => {
    const query = new URLSearchParams();
    if (tenantId) query.set('tenant_id', tenantId);
    if (statusFilter) query.set('status', statusFilter);
    query.set('include_completed', String(includeCompleted));
    query.set('limit', '200');
    return query.toString();
  }, [tenantId, statusFilter, includeCompleted]);

  const list = useQuery({ queryKey: ['platform', 'tenant-offboarding', tenantId, statusFilter, includeCompleted], queryFn: () => platformApiRequest<OffboardingRow[]>(`/platform/tenant-offboarding?${queryString}`) });
  const detail = useQuery({ queryKey: ['platform', 'tenant-offboarding-detail', tenantId], queryFn: () => platformApiRequest<Detail>(`/platform/tenant-offboarding/${tenantId}`), enabled: Boolean(tenantId) });

  const selectedTenant = useMemo(() => (tenants.data || []).find((tenant) => tenant.id === tenantId), [tenants.data, tenantId]);
  const rows = list.data || [];
  const selected = detail.data?.offboarding || rows.find((row) => row.tenant_id === tenantId) || null;
  const checks = detail.data?.checks || null;
  const isLoading = tenants.isLoading || users.isLoading || list.isLoading || detail.isLoading;
  const loadError = tenants.error || users.error || list.error || detail.error;

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['platform', 'tenant-offboarding'] }),
      qc.invalidateQueries({ queryKey: ['platform', 'tenant-offboarding-detail'] }),
      qc.invalidateQueries({ queryKey: ['platform', 'tenants'] })
    ]);
  };

  const refreshAll = () => {
    setStatusMessage('Refreshing tenant offboarding evidence...');
    tenants.refetch();
    users.refetch();
    list.refetch();
    if (tenantId) detail.refetch();
  };

  const save = useMutation({
    mutationFn: () => platformApiRequest('/platform/tenant-offboarding', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: form.tenant_id || tenantId,
        status: form.status,
        reason: trimOrNull(form.reason),
        scheduled_for: dateTimeLocalToIso(form.scheduled_for),
        owner_platform_user_id: form.owner_platform_user_id || null,
        notes: trimOrNull(form.notes),
        checklist: form.checklist
      })
    }),
    onSuccess: async () => {
      setStatusMessage(selected ? 'Offboarding workflow updated.' : 'Offboarding workflow saved.');
      await invalidate();
      const savedForm = { ...form, tenant_id: form.tenant_id || tenantId, reason: form.reason.trim(), notes: form.notes.trim(), checklist: { ...form.checklist } };
      setForm(savedForm);
      setOriginalForm(savedForm);
      setLoadedWorkflowId(selected?.id || loadedWorkflowId);
    }
  });
  const complete = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-offboarding/${id}/complete`, { method: 'POST', body: JSON.stringify({ archiveTenant: archiveOnComplete }) }),
    onSuccess: async () => { setStatusMessage(archiveOnComplete ? 'Offboarding completed and tenant archived/write-locked.' : 'Offboarding completed.'); await invalidate(); }
  });
  const cancel = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/tenant-offboarding/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled from platform UI' }) }),
    onSuccess: async () => { setStatusMessage('Offboarding workflow cancelled.'); await invalidate(); }
  });

  const buildFormFromWorkflow = useCallback((row: OffboardingRow): typeof blankForm => ({
    tenant_id: row.tenant_id,
    status: row.status,
    reason: row.reason || '',
    scheduled_for: row.scheduled_for ? new Date(row.scheduled_for).toISOString().slice(0, 16) : '',
    owner_platform_user_id: row.owner_platform_user_id || '',
    notes: row.notes || '',
    checklist: { ...emptyChecklist, ...(row.checklist || {}) }
  }), []);

  const loadWorkflowIntoForm = useCallback((row: OffboardingRow) => {
    const nextForm = buildFormFromWorkflow(row);
    setForm(nextForm);
    setOriginalForm(nextForm);
    setLoadedWorkflowId(row.id);
  }, [buildFormFromWorkflow]);

  const resetFormForTenant = (nextTenantId: string) => {
    setTenantId(nextTenantId);
    setForm({ ...blankForm, tenant_id: nextTenantId });
    setOriginalForm(null);
    setLoadedWorkflowId(null);
  };

  const selectedTenantId = form.tenant_id || tenantId;
  const isUpdateWorkflow = Boolean(selected && originalForm && loadedWorkflowId === selected.id);
  const isCreateWorkflow = Boolean(selectedTenantId && !selected);

  useEffect(() => {
    if (!tenantId) {
      setForm(blankForm);
      setOriginalForm(null);
      setLoadedWorkflowId(null);
      return;
    }

    if (detail.isFetching) {
      return;
    }

    if (detail.data?.offboarding) {
      if (loadedWorkflowId !== detail.data.offboarding.id) {
        loadWorkflowIntoForm(detail.data.offboarding);
      }
      return;
    }

    if (form.tenant_id !== tenantId || loadedWorkflowId) {
      setForm({ ...blankForm, tenant_id: tenantId });
      setOriginalForm(null);
      setLoadedWorkflowId(null);
    }
  }, [detail.data?.offboarding, detail.isFetching, form.tenant_id, loadWorkflowIntoForm, loadedWorkflowId, tenantId]);

  const isFormDirty = isUpdateWorkflow && originalForm ? normalizeForm(form) !== normalizeForm(originalForm) : false;
  const hasCreateRequiredFields = Boolean(selectedTenantId && form.reason.trim());
  const invalidScheduledFor = !isValidDateInput(form.scheduled_for);
  const readyToArchiveWithIncompleteChecklist = form.status === 'ready_to_archive' && !checklistKeys.every((key) => Boolean(form.checklist[key]));
  const canSaveWorkflow = !save.isPending && !invalidScheduledFor && !readyToArchiveWithIncompleteChecklist && (isUpdateWorkflow ? isFormDirty : isCreateWorkflow && hasCreateRequiredFields);
  const blockCount = checks ? checks.active_tenant_sessions + checks.active_support_sessions + checks.open_incidents + checks.open_tasks : 0;
  const isTerminalWorkflow = selected?.status === 'completed' || selected?.status === 'cancelled';
  const completionBlockers = [
    !selected ? 'Create or select a workflow before completing offboarding.' : '',
    selected && !selected.checklist_complete ? 'Complete all checklist items before completing offboarding.' : '',
    selected && blockCount > 0 ? 'Clear active sessions, support sessions, open incidents, and open tasks before completing offboarding.' : '',
    selected && checks?.legal_hold ? 'Resolve the tenant legal hold before completing offboarding or archiving.' : '',
    selected && isTerminalWorkflow ? 'Completed or cancelled workflows cannot be completed again.' : ''
  ].filter(Boolean);
  const canCompleteWorkflow = Boolean(selected && selected.checklist_complete && blockCount === 0 && !checks?.legal_hold && !isTerminalWorkflow && !complete.isPending);
  const canCancelWorkflow = Boolean(selected && !isTerminalWorkflow && !cancel.isPending);
  const openWorkflowCount = rows.filter((row) => !['completed', 'cancelled'].includes(row.status)).length;
  const completeWorkflowCount = rows.filter((row) => row.status === 'completed').length;
  const cancelledWorkflowCount = rows.filter((row) => row.status === 'cancelled').length;
  const selectedWorkflowLabel = selected ? `${selected.tenant_name || selectedTenant?.name || 'Selected tenant'} · ${pretty(selected.status)}` : selectedTenant ? `${selectedTenant.name} · no workflow yet` : 'No tenant selected';

  return <div style={styles.page}>
    <header style={styles.header}>
      <div>
        <h1>Tenant offboarding</h1>
        <p style={styles.muted}>Controlled shutdown workflow for tenants before final archive. This keeps exports, sessions, support, billing, incidents, and tasks visible before completion.</p>
      </div>
      <button type="button" style={styles.secondaryButton} onClick={refreshAll} disabled={isLoading}>{isLoading ? 'Refreshing...' : 'Refresh'}</button>
    </header>

    {statusMessage ? <div style={styles.info}>{statusMessage}</div> : null}
    {loadError ? <section style={styles.errorPanel}>
      <strong>Tenant offboarding data could not be loaded.</strong>
      <span>{readableError(loadError)}</span>
      <button type="button" style={styles.secondaryButton} onClick={refreshAll}>Retry</button>
    </section> : null}

    <section style={styles.metrics}>
      <div style={styles.metric}><strong>{rows.length}</strong><span>Total shown</span></div>
      <div style={styles.metric}><strong>{openWorkflowCount}</strong><span>Open workflows</span></div>
      <div style={styles.metric}><strong>{completeWorkflowCount}</strong><span>Completed</span></div>
      <div style={styles.metric}><strong>{cancelledWorkflowCount}</strong><span>Cancelled</span></div>
    </section>

    <section style={styles.metaGrid}>
      <div><strong>Snapshot source</strong><span>GET /platform/tenant-offboarding?limit=200 and selected tenant readiness detail.</span></div>
      <div><strong>Current filters</strong><span>{tenantId || 'all tenants'} · {statusFilter || 'all statuses'} · {includeCompleted ? 'including completed/cancelled' : 'active only'}</span></div>
      <div><strong>Selected workflow</strong><span>{selectedWorkflowLabel}</span></div>
      <div><strong>Readiness source</strong><span>Tenant users, tenant sessions, support sessions, incidents, tasks, export audit, and retention/legal-hold checks.</span></div>
    </section>

    <section style={styles.supportingLinks}>
      <strong>Supporting Platform pages</strong>
      <SourceLink to="/platform/tenants">Tenants</SourceLink>
      <SourceLink to="/platform/tenant-lifecycle">Tenant Lifecycle</SourceLink>
      <SourceLink to="/platform/tenant-tasks">Tenant Tasks</SourceLink>
      <SourceLink to="/platform/support-sessions">Support Sessions</SourceLink>
      <SourceLink to="/platform/tenant-exports">Tenant Exports</SourceLink>
      <SourceLink to="/platform/data-retention">Data Retention</SourceLink>
      <SourceLink to="/platform/audit">Audit</SourceLink>
    </section>

    <section style={styles.panel}>
      <h2>Filters</h2>
      <div style={styles.grid}>
        <label style={styles.fieldLabel}>Tenant
          <select style={styles.input} value={tenantId} onChange={(event) => resetFormForTenant(event.target.value)}>
            <option value="">All tenants</option>
            {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label>
        <label style={styles.fieldLabel}>Status
          <select style={styles.input} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All statuses</option>
            {statuses.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}
          </select>
        </label>
        <label style={styles.checkboxLabel}><input type="checkbox" checked={includeCompleted} onChange={(event) => setIncludeCompleted(event.target.checked)} /> Include completed/cancelled</label>
      </div>
    </section>

    {tenantId && checks ? <section style={styles.panel}>
      <h2>Readiness checks {selectedTenant ? `for ${selectedTenant.name}` : ''}</h2>
      <div style={styles.metrics}>
        <div style={styles.metric}><strong>{checks.tenant_user_count}</strong><span>tenant users</span></div>
        <div style={styles.metric}><strong>{checks.active_tenant_sessions}</strong><span>active tenant sessions</span></div>
        <div style={styles.metric}><strong>{checks.active_support_sessions}</strong><span>active support sessions</span></div>
        <div style={styles.metric}><strong>{checks.open_incidents}</strong><span>open incidents</span></div>
        <div style={styles.metric}><strong>{checks.open_tasks}</strong><span>open tasks</span></div>
        <div style={styles.metric}><strong>{formatDate(checks.last_export_at)}</strong><span>last export</span></div>
        <div style={styles.metric}><strong>{checks.legal_hold ? 'Yes' : 'No'}</strong><span>legal hold</span></div>
        <div style={styles.metric}><strong>{checks.purge_after_offboarding ? 'Yes' : 'No'}</strong><span>purge intent</span></div>
      </div>
      {checks.legal_hold ? <div style={styles.warning}>Legal hold is active{checks.legal_hold_reason ? `: ${checks.legal_hold_reason}` : ''}. Backend completion can reject this workflow until retention is resolved.</div> : null}
      {checks.retain_until ? <div style={styles.info}>Retention date: {formatDate(checks.retain_until)}</div> : null}
      {blockCount > 0 ? <div style={styles.warning}>Completion is blocked until active sessions/support sessions/open incidents/open tasks are cleared.</div> : <div style={styles.success}>No operational blockers detected.</div>}
    </section> : null}

    {canWrite ? <section style={styles.panel}>
      <h2>{selected ? 'Update offboarding workflow' : 'Start offboarding workflow'}</h2>
      {!selectedTenantId ? <div style={styles.warning}>Select a tenant before saving an offboarding workflow.</div> : null}
      {isCreateWorkflow && selectedTenantId && !form.reason.trim() ? <div style={styles.warning}>Reason is required before creating an offboarding workflow.</div> : null}
      {invalidScheduledFor ? <div style={styles.warning}>Planned date must be a valid date/time.</div> : null}
      {readyToArchiveWithIncompleteChecklist ? <div style={styles.warning}>Complete every checklist item before setting status to ready to archive.</div> : null}
      <div style={styles.grid}>
        <label style={styles.fieldLabel}>Tenant
          <select style={styles.input} value={form.tenant_id || tenantId} onChange={(event) => resetFormForTenant(event.target.value)}>
            <option value="">Select tenant</option>
            {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label>
        <label style={styles.fieldLabel}>Workflow status
          <select style={styles.input} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statuses.map((value) => <option key={value} value={value}>{pretty(value)}</option>)}</select>
        </label>
        <label style={styles.fieldLabel}>Planned date
          <input style={styles.input} type="datetime-local" value={form.scheduled_for} onChange={(event) => setForm({ ...form, scheduled_for: event.target.value })} />
        </label>
        <label style={styles.fieldLabel}>Owner
          <select style={styles.input} value={form.owner_platform_user_id} onChange={(event) => setForm({ ...form, owner_platform_user_id: event.target.value })}>
            <option value="">No owner</option>
            {(users.data || []).map((user) => <option key={user.id} value={user.id}>{user.email}</option>)}
          </select>
        </label>
      </div>
      <label style={styles.fieldLabel}>Reason
        <input style={styles.input} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} />
      </label>
      <label style={styles.fieldLabel}>Notes
        <textarea style={styles.textarea} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>
      <div style={styles.checklist}>
        {checklistKeys.map((key) => <label key={key} style={styles.checkItem}>
          <input type="checkbox" checked={Boolean(form.checklist[key])} onChange={(event) => setForm({ ...form, checklist: { ...form.checklist, [key]: event.target.checked } })} />
          {labels[key]}
        </label>)}
      </div>
      <div style={styles.actions}>
        <button type="button" style={canSaveWorkflow ? styles.button : styles.disabledButton} disabled={!canSaveWorkflow} onClick={() => save.mutate()}>{save.isPending ? 'Saving...' : isUpdateWorkflow ? 'Save changes' : 'Save workflow'}</button>
        {tenantId ? <>
          <label style={styles.checkboxLabel}><input type="checkbox" checked={archiveOnComplete} onChange={(event) => setArchiveOnComplete(event.target.checked)} /> Archive tenant on completion</label>
          <button type="button" style={canCompleteWorkflow ? styles.dangerButton : styles.disabledDangerButton} disabled={!canCompleteWorkflow} onClick={() => { if (canCompleteWorkflow && window.confirm('Complete this offboarding workflow? This may archive and write-lock the tenant.')) complete.mutate(tenantId); }}>Complete offboarding</button>
          <button type="button" style={canCancelWorkflow ? styles.secondaryButton : styles.disabledButton} disabled={!canCancelWorkflow} onClick={() => { if (canCancelWorkflow && window.confirm('Cancel this offboarding workflow?')) cancel.mutate(tenantId); }}>Cancel workflow</button>
        </> : null}
      </div>
      {completionBlockers.length ? <div style={styles.warning}>{completionBlockers[0]}</div> : null}
      {save.error ? <div style={styles.error}>{readableError(save.error)}</div> : null}
      {complete.error ? <div style={styles.error}>{readableError(complete.error)}</div> : null}
      {cancel.error ? <div style={styles.error}>{readableError(cancel.error)}</div> : null}
    </section> : null}

    <section style={styles.list}>
      {list.isLoading ? <div style={styles.panel}>Loading...</div> : null}
      {rows.map((row) => <article key={row.id} style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <strong>{row.tenant_name}</strong>
            <div style={styles.muted}>Tenant status: {row.tenant_status || '-'} · locked: {row.write_locked ? 'yes' : 'no'} · updated: {formatDate(row.updated_at)}</div>
          </div>
          <span style={styles.badge}>{pretty(row.status)}</span>
        </div>
        <p>{row.reason || 'No reason recorded.'}</p>
        <div style={styles.muted}>Owner: {row.owner_platform_user_email || 'unassigned'} · Scheduled: {formatDate(row.scheduled_for)} · Completed: {formatDate(row.completed_at)}</div>
        {row.notes ? <p style={styles.muted}>Notes: {row.notes}</p> : null}
        <div style={styles.progress}>{checklistKeys.filter((key) => row.checklist?.[key]).length}/{checklistKeys.length} checklist items done {row.checklist_complete ? '· ready' : ''}</div>
        <div style={styles.rowLinks}><SourceLink to="/platform/tenant-exports">Export evidence</SourceLink><SourceLink to="/platform/data-retention">Retention evidence</SourceLink><SourceLink to="/platform/audit">Audit trail</SourceLink></div>
      </article>)}
      {!list.isLoading && rows.length === 0 ? <div style={styles.panel}>No offboarding workflows found.</div> : null}
    </section>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 },
  muted: { color: '#6b7280', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, width: '100%' },
  fieldLabel: { display: 'grid', gap: 6, fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 12 },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 10, width: '100%', minHeight: 80, marginTop: 12 },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: 8, color: '#374151' },
  metrics: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  metric: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 4, background: '#fff' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  supportingLinks: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 },
  link: { color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' },
  rowLinks: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  warning: { background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', borderRadius: 10, padding: 12, marginTop: 12 },
  info: { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, marginTop: 12 },
  success: { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', borderRadius: 10, padding: 12, marginTop: 12 },
  checklist: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 12 },
  checkItem: { display: 'flex', gap: 8, alignItems: 'center', background: '#f9fafb', padding: 10, borderRadius: 10 },
  actions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 },
  button: { padding: '10px 14px', border: 0, borderRadius: 10, background: '#111827', color: '#fff', cursor: 'pointer' },
  disabledButton: { padding: '10px 14px', border: 0, borderRadius: 10, background: '#9ca3af', color: '#fff', cursor: 'not-allowed' },
  disabledDangerButton: { padding: '10px 14px', border: 0, borderRadius: 10, background: '#d1d5db', color: '#6b7280', cursor: 'not-allowed' },
  secondaryButton: { padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', cursor: 'pointer' },
  dangerButton: { padding: '10px 14px', border: 0, borderRadius: 10, background: '#991b1b', color: '#fff', cursor: 'pointer' },
  error: { color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 10 },
  errorPanel: { display: 'grid', gap: 8, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', padding: 12, borderRadius: 10 },
  list: { display: 'grid', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  badge: { padding: '4px 8px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontSize: 12, textTransform: 'capitalize' },
  progress: { marginTop: 10, fontWeight: 700 }
};
