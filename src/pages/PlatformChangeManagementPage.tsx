import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type ChangeRequest = {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  risk_level: string;
  status: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  maintenance_window_title?: string | null;
  runbook_title?: string | null;
  requested_by_email?: string | null;
  approved_by_email?: string | null;
  rejected_by_email?: string | null;
  cancelled_by_email?: string | null;
  executed_by_email?: string | null;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  approval_reason?: string | null;
  rejection_reason?: string | null;
  cancellation_reason?: string | null;
  execution_notes?: string | null;
  created_at: string;
};

type ChangeResponse = { change_requests: ChangeRequest[] };
type SummaryResponse = {
  pending_approval: number;
  open_high_risk: number;
  by_status: Array<{ status: string; count: number }>;
  open_by_risk: Array<{ risk_level: string; count: number }>;
};

type DraftState = {
  title: string;
  description: string;
  category: string;
  risk_level: string;
  tenant_id: string;
  planned_start_at: string;
  planned_end_at: string;
  submit_for_approval: boolean;
};

const categories = ['maintenance', 'billing', 'entitlement', 'security', 'migration', 'operational', 'support'];
const risks = ['low', 'medium', 'high', 'critical'];
const statuses = ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled', 'executed'];
const defaultDraft: DraftState = { title: '', description: '', category: 'operational', risk_level: 'medium', tenant_id: '', planned_start_at: '', planned_end_at: '', submit_for_approval: true };

function toLocalDateTimeInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function changeToDraft(change: ChangeRequest): DraftState {
  return {
    title: change.title || '',
    description: change.description || '',
    category: change.category || 'operational',
    risk_level: change.risk_level || 'medium',
    tenant_id: change.tenant_id || '',
    planned_start_at: toLocalDateTimeInput(change.planned_start_at),
    planned_end_at: toLocalDateTimeInput(change.planned_end_at),
    submit_for_approval: change.status === 'pending_approval'
  };
}

export default function PlatformChangeManagementPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_WRITE);
  const canApprove = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_APPROVE);
  const canExecute = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_EXECUTE);
  const [filters, setFilters] = useState({ status: '', category: '', risk_level: '', tenant_id: '', search: '' });
  const [draft, setDraft] = useState<DraftState>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [formError, setFormError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    params.set('limit', '200');
    return params.toString();
  }, [filters]);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'change-management'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const summary = useQuery({ queryKey: ['platform', 'change-management', 'summary'], queryFn: () => platformApiRequest<SummaryResponse>('/platform/change-management/summary') });
  const changes = useQuery({ queryKey: ['platform', 'change-management', filters], queryFn: () => platformApiRequest<ChangeResponse>(`/platform/change-management?${queryString}`) });

  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['platform', 'change-management'] });
  };

  const resetForm = () => {
    setDraft(defaultDraft);
    setEditingId(null);
    setFormError('');
  };

  const payloadFromDraft = (override: Partial<DraftState> = {}) => {
    const next = { ...draft, ...override };
    return {
      ...next,
      tenant_id: next.tenant_id || null,
      planned_start_at: next.planned_start_at || null,
      planned_end_at: next.planned_end_at || null
    };
  };

  const createChange = useMutation({
    mutationFn: ({ submitForApproval = false }: { submitForApproval?: boolean } = {}) => platformApiRequest<ChangeRequest>('/platform/change-management', {
      method: 'POST',
      body: JSON.stringify(payloadFromDraft({ submit_for_approval: submitForApproval }))
    }),
    onSuccess: (change) => {
      setStatusMessage(change.status === 'pending_approval' ? 'Change request submitted for approval.' : 'Draft saved successfully.');
      resetForm();
      refreshAll();
    }
  });

  const updateChange = useMutation({
    mutationFn: ({ id, submitForApproval = false, draftOverride }: { id: string; submitForApproval?: boolean; draftOverride?: DraftState }) => platformApiRequest<ChangeRequest>(`/platform/change-management/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payloadFromDraft({ ...(draftOverride ?? {}), ...(submitForApproval ? { submit_for_approval: true } : {}) }))
    }),
    onSuccess: (change) => {
      setStatusMessage(change.status === 'pending_approval' ? 'Change request submitted for approval.' : 'Draft saved successfully.');
      resetForm();
      refreshAll();
    }
  });

  const runAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' | 'cancel' | 'execute' }) => platformApiRequest<ChangeRequest>(`/platform/change-management/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify(action === 'execute' ? { notes: actionReason } : { reason: actionReason })
    }),
    onSuccess: (change) => {
      setStatusMessage(`Change request ${change.status}.`);
      setActionReason('');
      refreshAll();
    }
  });

  const handleSubmitForm = (submitForApproval = false) => {
    if (!draft.title.trim()) {
      setFormError('Title is required before saving or submitting a change request.');
      return;
    }
    setFormError('');
    if (editingId) {
      updateChange.mutate({ id: editingId, submitForApproval });
    } else {
      createChange.mutate({ submitForApproval });
    }
  };

  const startEdit = (change: ChangeRequest) => {
    setDraft(changeToDraft(change));
    setEditingId(change.id);
    setFormError('');
    setStatusMessage(`Editing change request: ${change.title}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isMutating = createChange.isPending || updateChange.isPending || runAction.isPending;

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Platform change management</h1>
        <p style={styles.muted}>Review risky HLA/platform work before it is executed. Use this for migrations, security changes, entitlement changes, billing changes, maintenance work, and operational fixes that need approval.</p>
      </header>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Summary</h2>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}><strong>{summary.data?.pending_approval ?? 0}</strong><span>Pending approval</span></div>
          <div style={styles.summaryCard}><strong>{summary.data?.open_high_risk ?? 0}</strong><span>Open high/critical risk</span></div>
          <div style={styles.summaryCard}><strong>{changes.data?.change_requests.length ?? 0}</strong><span>Visible changes</span></div>
        </div>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.formGrid}>
          <label style={styles.fieldLabel}>Status<select style={styles.input} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label style={styles.fieldLabel}>Category<select style={styles.input} value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label style={styles.fieldLabel}>Risk<select style={styles.input} value={filters.risk_level} onChange={(event) => setFilters((current) => ({ ...current, risk_level: event.target.value }))}><option value="">All risks</option>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label style={styles.fieldLabel}>Tenant<select style={styles.input} value={filters.tenant_id} onChange={(event) => setFilters((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">All tenants</option>{tenants.data?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label style={styles.fieldLabel}>Search<input style={styles.input} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search title/description" /></label>
          <button type="button" style={styles.button} onClick={refreshAll}>Refresh</button>
        </div>
      </section>

      {canWrite ? (
        <section style={styles.panel}>
          <div style={styles.formHeader}>
            <h2 style={styles.sectionTitle}>{editingId ? 'Edit change request' : 'Create change request'}</h2>
            {editingId ? <button type="button" style={styles.secondaryButton} onClick={resetForm}>Cancel edit</button> : null}
          </div>
          <div style={styles.formGrid}>
            <label style={styles.fieldLabel}>Title<input style={styles.input} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" /></label>
            <label style={styles.fieldLabel}>Category<select style={styles.input} value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label style={styles.fieldLabel}>Risk<select style={styles.input} value={draft.risk_level} onChange={(event) => setDraft((current) => ({ ...current, risk_level: event.target.value }))}>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label style={styles.fieldLabel}>Tenant<select style={styles.input} value={draft.tenant_id} onChange={(event) => setDraft((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Platform-wide / no tenant</option>{tenants.data?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
            <label style={styles.fieldLabel}>Planned start<input style={styles.input} type="datetime-local" value={draft.planned_start_at} onChange={(event) => setDraft((current) => ({ ...current, planned_start_at: event.target.value }))} /></label>
            <label style={styles.fieldLabel}>Planned end<input style={styles.input} type="datetime-local" value={draft.planned_end_at} onChange={(event) => setDraft((current) => ({ ...current, planned_end_at: event.target.value }))} /></label>
            <label style={{ ...styles.fieldLabel, gridColumn: '1 / -1' }}>Description / rollback / customer impact<textarea style={{ ...styles.input, minHeight: 80 }} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What will change, why, rollback notes, customer impact" /></label>
          </div>
          {formError ? <p style={styles.errorText}>{formError}</p> : null}
          {statusMessage ? <p style={styles.successText}>{statusMessage}</p> : null}
          <div style={styles.actions}>
            <button type="button" style={styles.button} disabled={isMutating} onClick={() => handleSubmitForm(false)}>Save draft</button>
            <button type="button" style={styles.button} disabled={isMutating} onClick={() => handleSubmitForm(true)}>Submit for approval</button>
          </div>
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Change requests</h2>
        <label style={{ ...styles.fieldLabel, maxWidth: 420 }}>Reason / execution notes<input style={{ ...styles.input, marginBottom: 12 }} value={actionReason} onChange={(event) => setActionReason(event.target.value)} placeholder="Reason / execution notes for next action" /></label>
        <div style={styles.list}>
          {changes.data?.change_requests.map((change) => (
            <article key={change.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <h3 style={styles.cardTitle}>{change.title}</h3>
                  <p style={styles.muted}>{change.description || 'No description'} </p>
                </div>
                <div style={styles.badges}>
                  <span style={badgeStyle(change.status)}>{change.status}</span>
                  <span style={riskBadgeStyle(change.risk_level)}>{change.risk_level}</span>
                </div>
              </div>
              <div style={styles.metaGrid}>
                <span><strong>Category:</strong> {change.category}</span>
                <span><strong>Tenant:</strong> {change.tenant_name || 'Platform-wide'}</span>
                <span><strong>Requested by:</strong> {change.requested_by_email || 'Unknown'}</span>
                <span><strong>Created:</strong> {new Date(change.created_at).toLocaleString()}</span>
                <span><strong>Planned:</strong> {change.planned_start_at ? new Date(change.planned_start_at).toLocaleString() : 'Not set'}</span>
                <span><strong>Approved by:</strong> {change.approved_by_email || '-'}</span>
              </div>
              {change.approval_reason ? <p style={styles.muted}><strong>Approval reason:</strong> {change.approval_reason}</p> : null}
              {change.rejection_reason ? <p style={styles.muted}><strong>Rejection reason:</strong> {change.rejection_reason}</p> : null}
              {change.cancellation_reason ? <p style={styles.muted}><strong>Cancellation reason:</strong> {change.cancellation_reason}</p> : null}
              {change.execution_notes ? <p style={styles.muted}><strong>Execution notes:</strong> {change.execution_notes}</p> : null}
              <div style={styles.actions}>
                {canWrite && ['draft', 'pending_approval'].includes(change.status) ? <button type="button" style={styles.secondaryButton} onClick={() => startEdit(change)}>Edit</button> : null}
                {canWrite && change.status === 'draft' ? <button type="button" style={styles.button} onClick={() => updateChange.mutate({ id: change.id, submitForApproval: true, draftOverride: changeToDraft(change) })}>Submit for approval</button> : null}
                {canApprove && change.status === 'pending_approval' ? <button type="button" style={styles.button} onClick={() => runAction.mutate({ id: change.id, action: 'approve' })}>Approve</button> : null}
                {canApprove && change.status === 'pending_approval' ? <button type="button" style={styles.dangerButton} onClick={() => runAction.mutate({ id: change.id, action: 'reject' })}>Reject</button> : null}
                {canExecute && change.status === 'approved' ? <button type="button" style={styles.button} onClick={() => runAction.mutate({ id: change.id, action: 'execute' })}>Mark executed</button> : null}
                {canWrite && !['cancelled', 'executed', 'rejected'].includes(change.status) ? <button type="button" style={styles.secondaryButton} onClick={() => runAction.mutate({ id: change.id, action: 'cancel' })}>Cancel</button> : null}
              </div>
            </article>
          ))}
          {!changes.data?.change_requests.length ? <p style={styles.muted}>No change requests found.</p> : null}
        </div>
      </section>
    </div>
  );
}

function badgeStyle(status: string): CSSProperties {
  const background = status === 'approved' ? '#dcfce7' : status === 'pending_approval' ? '#fef3c7' : status === 'rejected' || status === 'cancelled' ? '#fee2e2' : status === 'executed' ? '#dbeafe' : '#f3f4f6';
  return { ...styles.badge, background };
}

function riskBadgeStyle(risk: string): CSSProperties {
  const background = risk === 'critical' ? '#fecaca' : risk === 'high' ? '#fed7aa' : risk === 'medium' ? '#fef3c7' : '#dcfce7';
  return { ...styles.badge, background };
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 20 },
  title: { fontSize: 28, fontWeight: 800, margin: 0 },
  muted: { color: '#6b7280', margin: '4px 0' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  sectionTitle: { marginTop: 0, fontSize: 18 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  summaryCard: { display: 'grid', gap: 4, padding: 16, borderRadius: 12, background: '#f9fafb' },
  formHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 },
  fieldLabel: { display: 'grid', gap: 6, fontSize: 12, fontWeight: 700, color: '#111827' },
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', font: 'inherit', fontWeight: 400 },
  checkbox: { display: 'flex', alignItems: 'center', gap: 8, color: '#374151' },
  button: { padding: '10px 12px', borderRadius: 10, border: 0, background: '#111827', color: '#fff', cursor: 'pointer' },
  secondaryButton: { padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' },
  dangerButton: { padding: '10px 12px', borderRadius: 10, border: 0, background: '#991b1b', color: '#fff', cursor: 'pointer' },
  errorText: { color: '#991b1b', fontWeight: 700, margin: '0 0 12px' },
  successText: { color: '#166534', fontWeight: 700, margin: '0 0 12px' },
  list: { display: 'grid', gap: 12 },
  card: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, display: 'grid', gap: 12 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  cardTitle: { margin: 0, fontSize: 18 },
  badges: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  badge: { padding: '4px 8px', borderRadius: 999, fontSize: 12, color: '#111827' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, color: '#374151' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' }
};
