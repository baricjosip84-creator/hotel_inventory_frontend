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

const categories = ['maintenance', 'billing', 'entitlement', 'security', 'migration', 'operational', 'support'];
const risks = ['low', 'medium', 'high', 'critical'];
const statuses = ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled', 'executed'];

export default function PlatformChangeManagementPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_WRITE);
  const canApprove = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_APPROVE);
  const canExecute = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_EXECUTE);
  const [filters, setFilters] = useState({ status: '', category: '', risk_level: '', tenant_id: '', search: '' });
  const [draft, setDraft] = useState({ title: '', description: '', category: 'operational', risk_level: 'medium', tenant_id: '', planned_start_at: '', planned_end_at: '', submit_for_approval: true });
  const [actionReason, setActionReason] = useState('');

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

  const createChange = useMutation({
    mutationFn: () => platformApiRequest('/platform/change-management', {
      method: 'POST',
      body: JSON.stringify({ ...draft, tenant_id: draft.tenant_id || null, planned_start_at: draft.planned_start_at || null, planned_end_at: draft.planned_end_at || null })
    }),
    onSuccess: () => {
      setDraft({ title: '', description: '', category: 'operational', risk_level: 'medium', tenant_id: '', planned_start_at: '', planned_end_at: '', submit_for_approval: true });
      refreshAll();
    }
  });

  const runAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' | 'cancel' | 'execute' }) => platformApiRequest(`/platform/change-management/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify(action === 'execute' ? { notes: actionReason } : { reason: actionReason })
    }),
    onSuccess: () => { setActionReason(''); refreshAll(); }
  });

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
          <select style={styles.input} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select style={styles.input} value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select style={styles.input} value={filters.risk_level} onChange={(event) => setFilters((current) => ({ ...current, risk_level: event.target.value }))}><option value="">All risks</option>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select style={styles.input} value={filters.tenant_id} onChange={(event) => setFilters((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">All tenants</option>{tenants.data?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
          <input style={styles.input} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search title/description" />
          <button type="button" style={styles.button} onClick={refreshAll}>Refresh</button>
        </div>
      </section>

      {canWrite ? (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Create change request</h2>
          <div style={styles.formGrid}>
            <input style={styles.input} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" />
            <select style={styles.input} value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select style={styles.input} value={draft.risk_level} onChange={(event) => setDraft((current) => ({ ...current, risk_level: event.target.value }))}>{risks.map((item) => <option key={item} value={item}>{item}</option>)}</select>
            <select style={styles.input} value={draft.tenant_id} onChange={(event) => setDraft((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Platform-wide / no tenant</option>{tenants.data?.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>
            <input style={styles.input} type="datetime-local" value={draft.planned_start_at} onChange={(event) => setDraft((current) => ({ ...current, planned_start_at: event.target.value }))} />
            <input style={styles.input} type="datetime-local" value={draft.planned_end_at} onChange={(event) => setDraft((current) => ({ ...current, planned_end_at: event.target.value }))} />
            <textarea style={{ ...styles.input, gridColumn: '1 / -1', minHeight: 80 }} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} placeholder="What will change, why, rollback notes, customer impact" />
            <label style={styles.checkbox}><input type="checkbox" checked={draft.submit_for_approval} onChange={(event) => setDraft((current) => ({ ...current, submit_for_approval: event.target.checked }))} /> Submit for approval immediately</label>
          </div>
          <button type="button" style={styles.button} disabled={!draft.title || createChange.isPending} onClick={() => createChange.mutate()}>Create change request</button>
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Change requests</h2>
        <input style={{ ...styles.input, marginBottom: 12 }} value={actionReason} onChange={(event) => setActionReason(event.target.value)} placeholder="Reason / execution notes for next action" />
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
              <div style={styles.actions}>
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
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 },
  input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', font: 'inherit' },
  checkbox: { display: 'flex', alignItems: 'center', gap: 8, color: '#374151' },
  button: { padding: '10px 12px', borderRadius: 10, border: 0, background: '#111827', color: '#fff', cursor: 'pointer' },
  secondaryButton: { padding: '10px 12px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' },
  dangerButton: { padding: '10px 12px', borderRadius: 10, border: 0, background: '#991b1b', color: '#fff', cursor: 'pointer' },
  list: { display: 'grid', gap: 12 },
  card: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, display: 'grid', gap: 12 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  cardTitle: { margin: 0, fontSize: 18 },
  badges: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  badge: { padding: '4px 8px', borderRadius: 999, fontSize: 12, color: '#111827' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, color: '#374151' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' }
};
