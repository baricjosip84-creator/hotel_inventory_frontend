import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { saveSupportSessionAccessToken } from '../lib/auth';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

type TenantRow = { id: string; name: string; status?: string };
type SupportStatus = 'pending_approval' | 'active' | 'ended' | 'expired' | 'rejected';
type PlatformSupportSession = {
  id: string;
  platform_user_id: string;
  platform_user_email?: string | null;
  platform_user_name?: string | null;
  tenant_id: string;
  tenant_name?: string | null;
  reason: string;
  access_level?: string;
  ticket_reference?: string | null;
  customer_consent_note?: string | null;
  status: SupportStatus;
  started_at: string;
  expires_at: string;
  ended_at?: string | null;
  ended_by_platform_user_email?: string | null;
  approved_at?: string | null;
  approved_by_platform_user_email?: string | null;
  approval_note?: string | null;
  rejected_at?: string | null;
  rejected_by_platform_user_email?: string | null;
  rejection_reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
};

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

function accessLabel(value?: string): string {
  switch (value) {
    case 'read_only': return 'Read-only';
    case 'inventory_support': return 'Inventory support';
    case 'procurement_support': return 'Procurement support';
    case 'emergency_admin': return 'Emergency admin';
    default: return value || '-';
  }
}

function statusLabel(value: SupportStatus): string {
  return value.replace(/_/g, ' ');
}

export default function PlatformSupportSessionsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ tenant_id: '', reason: '', access_level: 'read_only', ticket_reference: '', customer_consent_note: '' });
  const [status, setStatus] = useState<SupportStatus | ''>('active');
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState('');

  const canStart = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_START);
  const canEnd = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_END);
  const canApprove = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_APPROVE);

  const tenants = useQuery({ queryKey: ['platform', 'tenants'], queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants') });
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (status) params.set('status', status);
    return params.toString();
  }, [status]);

  const sessions = useQuery({ queryKey: ['platform', 'support-sessions', queryString], queryFn: () => platformApiRequest<PlatformSupportSession[]>(`/platform/support-sessions?${queryString}`) });

  const invalidateSessions = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform', 'support-sessions'] });
    await queryClient.invalidateQueries({ queryKey: ['platform', 'dashboard'] });
    await queryClient.invalidateQueries({ queryKey: ['platform', 'audit'] });
  };

  const start = useMutation({
    mutationFn: () => platformApiRequest<PlatformSupportSession>('/platform/support-sessions', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: form.tenant_id,
        reason: form.reason.trim(),
        access_level: form.access_level,
        ticket_reference: form.ticket_reference.trim() || null,
        customer_consent_note: form.customer_consent_note.trim() || null
      })
    }),
    onSuccess: async (created) => {
      setStatusMessage(created.status === 'pending_approval' ? 'Support session request created and waiting for approval.' : 'Support session started.');
      setForm({ tenant_id: '', reason: '', access_level: 'read_only', ticket_reference: '', customer_consent_note: '' });
      await invalidateSessions();
    }
  });

  const token = useMutation({
    mutationFn: (id: string) => platformApiRequest<{ accessToken: string }>(`/platform/support-sessions/${id}/access-token`, { method: 'POST' }),
    onSuccess: (payload) => {
      setStatusMessage('Tenant support access token created. Redirecting to tenant dashboard.');
      saveSupportSessionAccessToken(payload.accessToken);
      window.location.href = '/dashboard';
    }
  });

  const end = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/support-sessions/${id}/end`, { method: 'POST' }),
    onSuccess: async () => {
      setStatusMessage('Support session ended.');
      await invalidateSessions();
    }
  });
  const approve = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/support-sessions/${id}/approve`, { method: 'POST', body: JSON.stringify({ approval_note: (approvalNotes[id] || '').trim() || null }) }),
    onSuccess: async (_result, id) => {
      setStatusMessage('Support session request approved.');
      setApprovalNotes((current) => ({ ...current, [id]: '' }));
      await invalidateSessions();
    }
  });
  const reject = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/support-sessions/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason: rejectionReasons[id].trim() }) }),
    onSuccess: async (_result, id) => {
      setStatusMessage('Support session request rejected.');
      setRejectionReasons((current) => ({ ...current, [id]: '' }));
      await invalidateSessions();
    }
  });

  const trimmedReason = form.reason.trim();
  const trimmedTicketReference = form.ticket_reference.trim();
  const startValidationMessage = !form.tenant_id
    ? 'Select a tenant before starting a support session.'
    : trimmedTicketReference.length === 0
      ? 'Enter a ticket/reference before starting a support session.'
      : trimmedReason.length < 10
        ? 'Enter a support reason of at least 10 characters.'
        : '';
  const canSubmitStart = canStart && !startValidationMessage && !start.isPending;
  const rows = sessions.data || [];
  const activeCount = rows.filter((row) => row.status === 'active').length;
  const pendingCount = rows.filter((row) => row.status === 'pending_approval').length;
  const emergencyCount = rows.filter((row) => row.access_level === 'emergency_admin').length;
  const statusFilterLabel = status ? statusLabel(status) : 'all statuses';

  const updateForm = (patch: Partial<typeof form>) => {
    if (start.error) start.reset();
    setStatusMessage('');
    setForm({ ...form, ...patch });
  };

  const refreshAll = async () => {
    setStatusMessage('');
    await Promise.all([sessions.refetch(), tenants.refetch()]);
  };

  const confirmAndOpenAccess = (row: PlatformSupportSession) => {
    if (window.confirm(`Create tenant access for ${row.tenant_name || row.tenant_id}? Use this only for ticket ${row.ticket_reference || 'without ticket reference'}.`)) {
      token.mutate(row.id);
    }
  };

  const confirmAndEnd = (row: PlatformSupportSession) => {
    if (window.confirm(`End support session for ${row.tenant_name || row.tenant_id}?`)) {
      end.mutate(row.id);
    }
  };

  const confirmAndApprove = (row: PlatformSupportSession) => {
    if (window.confirm(`Approve ${accessLabel(row.access_level)} support access for ${row.tenant_name || row.tenant_id}?`)) {
      approve.mutate(row.id);
    }
  };

  const confirmAndReject = (row: PlatformSupportSession) => {
    if (window.confirm(`Reject support session request for ${row.tenant_name || row.tenant_id}?`)) {
      reject.mutate(row.id);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Support sessions</h1>
          <p style={styles.subtitle}>Audited platform support access. Emergency admin sessions require approval before tenant access can be created.</p>
        </div>
        <button style={styles.button} onClick={() => void refreshAll()} disabled={sessions.isFetching || tenants.isFetching}>Refresh</button>
      </header>

      <section style={styles.metadataPanel}>
        <span><b>Snapshot:</b> {sessions.isFetching || tenants.isFetching ? 'Refreshing' : 'Loaded'} · {new Date().toLocaleString()}</span>
        <span><b>Source:</b> /platform/support-sessions, /platform/tenants, /platform/audit</span>
        <span><b>Filter:</b> {statusFilterLabel} · limit 100</span>
        <span><b>Rows:</b> {rows.length} listed · {activeCount} active · {pendingCount} pending approval · {emergencyCount} emergency admin</span>
      </section>

      <nav style={styles.supportLinks} aria-label="Supporting Platform pages">
        <a style={styles.supportLink} href="/platform/tenants">Tenants</a>
        <a style={styles.supportLink} href="/platform/tenant-health">Tenant health</a>
        <a style={styles.supportLink} href="/platform/incidents">Incidents</a>
        <a style={styles.supportLink} href="/platform/audit">Audit</a>
      </nav>

      {statusMessage ? <div style={styles.success}>{statusMessage}</div> : null}
      {tenants.error ? <div style={styles.errorWithAction}><span>{readableError(tenants.error)}</span><button style={styles.buttonSmall} onClick={() => void tenants.refetch()}>Retry tenants</button></div> : null}
      {sessions.error ? <div style={styles.errorWithAction}><span>{readableError(sessions.error)}</span><button style={styles.buttonSmall} onClick={() => void sessions.refetch()}>Retry sessions</button></div> : null}

      <section style={styles.panel}>
        <h2>Start support session</h2>
        <div style={styles.note}>Emergency admin requests are created as pending approval. A different authorized platform user must approve them.</div>
        <div style={styles.formGrid}>
          <label style={styles.label}>Tenant
            <select style={styles.input} value={form.tenant_id} onChange={(event) => updateForm({ tenant_id: event.target.value })}>
              <option value="">Select tenant</option>
              {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} ({tenant.status || 'active'})</option>)}
            </select>
          </label>
          <label style={styles.label}>Access level
            <select style={styles.input} value={form.access_level} onChange={(event) => updateForm({ access_level: event.target.value })}>
              <option value="read_only">Read-only</option>
              <option value="inventory_support">Inventory support</option>
              <option value="procurement_support">Procurement support</option>
              <option value="emergency_admin">Emergency admin - requires approval</option>
            </select>
          </label>
          <label style={styles.label}>Ticket/reference
            <input style={styles.input} value={form.ticket_reference} onChange={(event) => updateForm({ ticket_reference: event.target.value })} placeholder="Support ticket, case, or customer reference" />
          </label>
          <label style={styles.label}>Reason
            <input style={styles.input} value={form.reason} onChange={(event) => updateForm({ reason: event.target.value })} placeholder="At least 10 characters" />
          </label>
          <label style={styles.label}>Customer consent note
            <input style={styles.input} value={form.customer_consent_note} onChange={(event) => updateForm({ customer_consent_note: event.target.value })} placeholder="Optional unless required by tenant policy" />
          </label>
          <button style={canSubmitStart ? styles.button : styles.buttonDisabled} onClick={() => start.mutate()} disabled={!canSubmitStart}>Start/request</button>
        </div>
        {!canStart ? <div style={styles.error}>Your platform role cannot start support sessions.</div> : null}
        {canStart && startValidationMessage ? <div style={styles.warning}>{startValidationMessage}</div> : null}
        {start.error ? <div style={styles.error}>{readableError(start.error)}</div> : null}
      </section>

      <section style={styles.panel}>
        <div style={styles.headerRow}>
          <h2>Sessions</h2>
          <select value={status} onChange={(event) => setStatus(event.target.value as SupportStatus | '')} style={styles.input}>
            <option value="pending_approval">Pending approval</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
        </div>
        {sessions.isLoading ? 'Loading...' : null}
        {token.error ? <div style={styles.error}>{readableError(token.error)}</div> : null}
        {approve.error ? <div style={styles.error}>{readableError(approve.error)}</div> : null}
        {reject.error ? <div style={styles.error}>{readableError(reject.error)}</div> : null}
        {end.error ? <div style={styles.error}>{readableError(end.error)}</div> : null}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Tenant</th>
              <th style={styles.th}>Access</th>
              <th style={styles.th}>Ticket</th>
              <th style={styles.th}>Platform user</th>
              <th style={styles.th}>Reason</th>
              <th style={styles.th}>Approval</th>
              <th style={styles.th}>Timing/evidence</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rejectionReason = (rejectionReasons[row.id] || '').trim();
              const canRejectRow = canApprove && rejectionReason.length >= 5 && !reject.isPending;
              return (
                <tr key={row.id}>
                  <td style={styles.td}><span style={row.status === 'pending_approval' ? styles.pendingBadge : styles.badge}>{row.status}</span></td>
                  <td style={styles.td}>
                    {row.tenant_name || row.tenant_id}
                    <div style={styles.smallText}>{row.tenant_id}</div>
                    <a style={styles.evidenceLink} href={`/platform/tenants?search=${encodeURIComponent(row.tenant_name || row.tenant_id)}`}>Tenant evidence</a>
                  </td>
                  <td style={styles.td}>{accessLabel(row.access_level)}</td>
                  <td style={styles.td}>{row.ticket_reference || '-'}</td>
                  <td style={styles.td}>{row.platform_user_name || row.platform_user_email || row.platform_user_id}</td>
                  <td style={styles.td}>{row.reason}{row.customer_consent_note ? <div style={styles.smallText}>Consent: {row.customer_consent_note}</div> : null}</td>
                  <td style={styles.td}>
                    {row.status === 'pending_approval' ? 'Waiting' : row.approved_at ? `Approved ${formatDateTime(row.approved_at)}` : row.rejected_at ? `Rejected ${formatDateTime(row.rejected_at)}` : '-'}
                    {row.approved_by_platform_user_email ? <div style={styles.smallText}>by {row.approved_by_platform_user_email}</div> : null}
                    {row.approval_note ? <div style={styles.smallText}>Note: {row.approval_note}</div> : null}
                    {row.rejected_by_platform_user_email ? <div style={styles.smallText}>by {row.rejected_by_platform_user_email}</div> : null}
                    {row.rejection_reason ? <div style={styles.smallText}>{row.rejection_reason}</div> : null}
                    {row.ended_by_platform_user_email ? <div style={styles.smallText}>Ended by {row.ended_by_platform_user_email}</div> : null}
                  </td>
                  <td style={styles.td}>
                    <div>Started: {formatDateTime(row.started_at)}</div>
                    <div>Expires: {formatDateTime(row.expires_at)}</div>
                    {row.ended_at ? <div>Ended: {formatDateTime(row.ended_at)}</div> : null}
                    <a style={styles.evidenceLink} href={`/platform/audit?search=${encodeURIComponent(row.id)}`}>Audit evidence</a>
                    <div style={styles.smallText}>Session ID: {row.id}</div>
                  </td>
                  <td style={styles.td}>
                    {row.status === 'pending_approval' ? (
                      <div style={styles.actionStack}>
                        <input style={styles.inputSmall} placeholder="Approval note" value={approvalNotes[row.id] || ''} onChange={(event) => setApprovalNotes({ ...approvalNotes, [row.id]: event.target.value })} />
                        <button style={styles.buttonSmall} onClick={() => confirmAndApprove(row)} disabled={!canApprove || approve.isPending}>Approve</button>
                        <input style={styles.inputSmall} placeholder="Reject reason" value={rejectionReasons[row.id] || ''} onChange={(event) => setRejectionReasons({ ...rejectionReasons, [row.id]: event.target.value })} />
                        <button style={canRejectRow ? styles.buttonSmall : styles.buttonDisabledSmall} onClick={() => confirmAndReject(row)} disabled={!canRejectRow}>Reject</button>
                        <button style={styles.buttonSmall} onClick={() => confirmAndEnd(row)} disabled={!canEnd || end.isPending}>Cancel</button>
                        {canApprove && !canRejectRow ? <div style={styles.smallText}>Reject reason must be at least 5 characters.</div> : null}
                      </div>
                    ) : row.status === 'active' ? (
                      <>
                        <button style={styles.buttonSmall} onClick={() => confirmAndOpenAccess(row)} disabled={!canStart || token.isPending}>Enter</button>{' '}
                        <button style={styles.buttonSmall} onClick={() => confirmAndEnd(row)} disabled={!canEnd || end.isPending}>End</button>
                      </>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  subtitle: { margin: '6px 0 0', color: '#64748b', lineHeight: 1.5 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  metadataPanel: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, color: '#334155', fontSize: 13 },
  supportLinks: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  supportLink: { border: '1px solid var(--io-primary-border)', background: '#fff', color: 'var(--io-primary-dark)', borderRadius: 999, padding: '7px 11px', textDecoration: 'none', fontSize: 13, fontWeight: 700 },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', overflowX: 'auto', minWidth: 0 },
  note: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', color: 'var(--io-primary-deep)', borderRadius: 10, padding: 12, marginBottom: 12 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, alignItems: 'end' },
  label: { display: 'flex', flexDirection: 'column', gap: 6, color: '#334155', fontSize: 13, fontWeight: 700 },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', color: '#0f172a', minWidth: 0 },
  inputSmall: { padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 9, minWidth: 150, background: '#fff', color: '#0f172a' },
  button: { padding: '9px 13px', borderRadius: 9, border: '1px solid var(--io-primary)', background: 'var(--io-primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 1px 2px rgba(15,23,42,.05)' },
  buttonDisabled: { padding: '9px 13px', borderRadius: 9, border: '1px solid #cbd5e1', cursor: 'not-allowed', background: '#e2e8f0', color: '#64748b', fontWeight: 700 },
  buttonSmall: { padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: 700 },
  buttonDisabledSmall: { padding: '7px 10px', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'not-allowed', background: '#e2e8f0', color: '#64748b', fontWeight: 700 },
  success: { background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 10, padding: 12 },
  warning: { background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginTop: 12 },
  error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: 12, marginTop: 12 },
  errorWithAction: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 10, padding: 12 },
  table: { width: '100%', borderCollapse: 'collapse', color: '#334155' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '10px 8px', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #f1f5f9', padding: '12px 8px', verticalAlign: 'top' },
  badge: { display: 'inline-block', padding: '4px 9px', borderRadius: 999, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 },
  pendingBadge: { display: 'inline-block', padding: '4px 9px', borderRadius: 999, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: 12, fontWeight: 700 },
  smallText: { color: '#64748b', fontSize: 12, marginTop: 4 },
  evidenceLink: { color: 'var(--io-primary-dark)', fontSize: 12, display: 'inline-block', marginTop: 4, fontWeight: 700 },
  actionStack: { display: 'flex', flexWrap: 'wrap', gap: 8, maxWidth: 380 }
};
