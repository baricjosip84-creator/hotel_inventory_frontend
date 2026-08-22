import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { saveSupportSessionAccessToken } from '../lib/auth';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformSupportSessionsPage.css';

type SupportAccessLevel = 'read_only' | 'inventory_support' | 'procurement_support' | 'emergency_admin';
type SupportStatus = 'pending_approval' | 'active' | 'ended' | 'expired' | 'rejected';
type TenantSupportPolicy = {
  support_enabled?: boolean;
  require_ticket_reference?: boolean;
  require_customer_consent?: boolean;
  emergency_admin_requires_approval?: boolean;
  max_duration_minutes?: number;
  allowed_access_levels?: SupportAccessLevel[];
};
type TenantRow = { id: string; name: string; status?: string | null; support_policy?: TenantSupportPolicy | null };
type PlatformSupportSession = {
  id: string;
  platform_user_id?: string | null;
  platform_user_email?: string | null;
  platform_user_name?: string | null;
  platform_user_identity_restricted: boolean;
  requester_is_current_user: boolean;
  tenant_id?: string | null;
  tenant_name?: string | null;
  tenant_identity_restricted: boolean;
  tenant_linked: boolean;
  reason: string;
  access_level: SupportAccessLevel;
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
};
type SupportSessionResponse = {
  feature: string;
  generated_at: string;
  summary: {
    total_sessions: number;
    active_sessions: number;
    pending_approval_sessions: number;
    expired_sessions: number;
    ended_sessions: number;
    rejected_sessions: number;
    active_emergency_admin_sessions: number;
  };
  evidence_access: { tenant_identity: boolean; platform_user_identity: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_complete: boolean;
  required_permissions_by_source: Record<string, string[]>;
  truth_contract: Record<string, boolean>;
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  sessions: PlatformSupportSession[];
};

const PAGE_SIZE = 50;
const ACCESS_LEVELS: Array<{ value: SupportAccessLevel; label: string }> = [
  { value: 'read_only', label: 'Read-only' },
  { value: 'inventory_support', label: 'Inventory support' },
  { value: 'procurement_support', label: 'Procurement support' },
  { value: 'emergency_admin', label: 'Emergency admin' }
];
const DEFAULT_POLICY: Required<TenantSupportPolicy> = {
  support_enabled: true,
  require_ticket_reference: true,
  require_customer_consent: false,
  emergency_admin_requires_approval: true,
  max_duration_minutes: 120,
  allowed_access_levels: ACCESS_LEVELS.map((item) => item.value)
};

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function formatDateTime(value?: string | null) { if (!value) return 'Not recorded'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString(); }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function accessLabel(value?: string | null) { return ACCESS_LEVELS.find((item) => item.value === value)?.label || pretty(value); }
function normalizedPolicy(value?: TenantSupportPolicy | null): Required<TenantSupportPolicy> {
  const allowed = Array.isArray(value?.allowed_access_levels) && value.allowed_access_levels.length ? value.allowed_access_levels : DEFAULT_POLICY.allowed_access_levels;
  return {
    support_enabled: value?.support_enabled !== false,
    require_ticket_reference: value?.require_ticket_reference !== false,
    require_customer_consent: value?.require_customer_consent === true,
    emergency_admin_requires_approval: value?.emergency_admin_requires_approval !== false,
    max_duration_minutes: Number.isFinite(Number(value?.max_duration_minutes)) ? Number(value?.max_duration_minutes) : DEFAULT_POLICY.max_duration_minutes,
    allowed_access_levels: allowed
  };
}
function statusTone(status: SupportStatus) {
  if (status === 'active') return 'good';
  if (status === 'pending_approval') return 'warn';
  if (status === 'rejected') return 'danger';
  return 'default';
}

export default function PlatformSupportSessionsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState({ tenant_id: '', reason: '', access_level: 'read_only' as SupportAccessLevel, ticket_reference: '', customer_consent_note: '' });
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState('');

  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canStart = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_START) && canReadTenants;
  const canEnd = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_END);
  const canApprove = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_APPROVE) && canReadTenants;

  const status = (searchParams.get('status') || '') as SupportStatus | '';
  const tenantId = canReadTenants ? (searchParams.get('tenant_id') || '') : '';
  const search = searchParams.get('search') || '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'support-session-directory'],
    queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants'),
    enabled: canReadTenants,
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (tenantId) params.set('tenant_id', tenantId);
    if (search.trim()) params.set('search', search.trim());
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    return params.toString();
  }, [status, tenantId, search, offset]);

  const sessions = useQuery({
    queryKey: ['platform', 'support-sessions', queryString],
    queryFn: () => platformApiRequest<SupportSessionResponse>(`/platform/support-sessions?${queryString}`),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });

  const invalidateSessions = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform', 'support-sessions'] });
    await queryClient.invalidateQueries({ queryKey: ['platform', 'dashboard'] });
    await queryClient.invalidateQueries({ queryKey: ['platform', 'audit'] });
    await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-sla'] });
    await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-timeline'] });
    await queryClient.invalidateQueries({ queryKey: ['platform', 'customer-success-admin'] });
  };

  const start = useMutation({
    mutationFn: () => platformApiRequest('/platform/support-sessions', {
      method: 'POST',
      body: JSON.stringify({
        tenant_id: form.tenant_id,
        reason: form.reason.trim(),
        access_level: form.access_level,
        ticket_reference: form.ticket_reference.trim() || null,
        customer_consent_note: form.customer_consent_note.trim() || null
      })
    }),
    onSuccess: async () => {
      setStatusMessage(form.access_level === 'emergency_admin' && selectedPolicy.emergency_admin_requires_approval
        ? 'Emergency-admin support request created and waiting for another authorized operator to approve it.'
        : 'Support session started under the tenant’s current support policy.');
      setForm({ tenant_id: '', reason: '', access_level: 'read_only', ticket_reference: '', customer_consent_note: '' });
      await invalidateSessions();
    }
  });
  const token = useMutation({
    mutationFn: (id: string) => platformApiRequest<{ accessToken: string }>(`/platform/support-sessions/${id}/access-token`, { method: 'POST' }),
    onSuccess: (payload) => {
      setStatusMessage('Tenant support access created after current policy and lifecycle revalidation.');
      saveSupportSessionAccessToken(payload.accessToken);
      window.location.href = '/dashboard';
    }
  });
  const end = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/support-sessions/${id}/end`, { method: 'POST' }),
    onSuccess: async () => { setStatusMessage('Support session ended. Existing support-session tokens are no longer accepted.'); await invalidateSessions(); }
  });
  const approve = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/support-sessions/${id}/approve`, { method: 'POST', body: JSON.stringify({ approval_note: (approvalNotes[id] || '').trim() || null }) }),
    onSuccess: async (_result, id) => { setStatusMessage('Support session request approved after current tenant policy revalidation.'); setApprovalNotes((current) => ({ ...current, [id]: '' })); await invalidateSessions(); }
  });
  const reject = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/support-sessions/${id}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason: (rejectionReasons[id] || '').trim() }) }),
    onSuccess: async (_result, id) => { setStatusMessage('Support session request rejected.'); setRejectionReasons((current) => ({ ...current, [id]: '' })); await invalidateSessions(); }
  });

  const selectedTenant = (tenants.data || []).find((tenant) => tenant.id === form.tenant_id);
  const selectedPolicy = normalizedPolicy(selectedTenant?.support_policy);
  const selectedAccessAllowed = selectedPolicy.allowed_access_levels.includes(form.access_level);
  const trimmedReason = form.reason.trim();
  const trimmedTicket = form.ticket_reference.trim();
  const trimmedConsent = form.customer_consent_note.trim();
  const startValidationMessage = !canStart
    ? 'TENANTS_READ + SUPPORT_SESSION_START are required to start tenant support access.'
    : !form.tenant_id
      ? 'Select a tenant.'
      : selectedTenant?.status === 'archived'
        ? 'Archived tenants cannot receive new support sessions.'
        : !selectedPolicy.support_enabled
          ? 'This tenant has disabled Platform support access.'
          : !selectedAccessAllowed
            ? 'The selected access level is not allowed by this tenant support policy.'
            : selectedPolicy.require_ticket_reference && !trimmedTicket
              ? 'This tenant requires a ticket/reference.'
              : selectedPolicy.require_customer_consent && !trimmedConsent
                ? 'This tenant requires an operator-recorded customer-consent note.'
                : trimmedReason.length < 10
                  ? 'Enter a support reason of at least 10 characters.'
                  : '';
  const canSubmitStart = !startValidationMessage && !start.isPending;

  const data = sessions.data;
  const summary = data?.summary;
  const pagination = data?.pagination;
  const refreshError = sessions.isError && Boolean(data);
  const mutationError = start.error || token.error || end.error || approve.error || reject.error;
  const pageStart = pagination?.total ? pagination.offset + 1 : 0;
  const pageEnd = pagination && data ? Math.min(pagination.offset + data.sessions.length, pagination.total) : 0;

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
    if (!Object.prototype.hasOwnProperty.call(patch, 'offset')) next.delete('offset');
    setSearchParams(next, { replace: true });
  };
  const updateForm = (patch: Partial<typeof form>) => { if (start.error) start.reset(); setStatusMessage(''); setForm((current) => ({ ...current, ...patch })); };
  const refreshAll = async () => { setStatusMessage(''); await Promise.all([sessions.refetch(), ...(canReadTenants ? [tenants.refetch()] : [])]); };
  const tenantDisplay = (row: PlatformSupportSession) => row.tenant_identity_restricted ? 'Restricted tenant identity' : (row.tenant_name || row.tenant_id || 'Tenant');

  return <div className="io-operational-page io-workspace-page platform-support-sessions">
    <OperationalWorkspaceHero
      iconPath="/platform/support-sessions"
      eyebrow="Platform Access Governance"
      title="Support sessions"
      description="Create, approve, enter and end audited tenant support access. Tenant policy, tenant lifecycle and the originating Platform account are revalidated before and during support access."
      meta={<>
        <OperationalWorkspaceMetaPill>SUPPORT_SESSION_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{data?.evidence_complete ? 'Identity evidence complete' : 'Permission-scoped identities'}</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Time-bounded access</OperationalWorkspaceMetaPill>
        {data?.generated_at ? <OperationalWorkspaceMetaPill>Generated {formatDateTime(data.generated_at)}</OperationalWorkspaceMetaPill> : null}
      </>}
      aside={<div className="platform-support-sessions__hero-aside">
        <OperationalWorkspaceStatus value={summary?.active_sessions ? 'Active support access' : summary?.pending_approval_sessions ? 'Approval pending' : 'No active access'} label="recorded application access state" />
        <button type="button" className="app-button app-button--secondary" disabled={sessions.isFetching || tenants.isFetching} onClick={() => void refreshAll()}>{sessions.isFetching ? 'Refreshing…' : 'Refresh'}</button>
      </div>}
    />

    <OperationalWorkspaceStats ariaLabel="Support session summary">
      <OperationalWorkspaceStatCard iconPath="/platform/support-sessions" label="Total" value={summary?.total_sessions ?? '—'} helper="Filtered support-session evidence" loading={!data && sessions.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/support-sessions" label="Active" value={summary?.active_sessions ?? '—'} helper="Unexpired active support sessions" tone={(summary?.active_sessions || 0) > 0 ? 'warn' : 'good'} loading={!data && sessions.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/support-sessions" label="Pending approval" value={summary?.pending_approval_sessions ?? '—'} helper="Unexpired approval requests" tone={(summary?.pending_approval_sessions || 0) > 0 ? 'warn' : 'default'} loading={!data && sessions.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/support-sessions" label="Emergency admin" value={summary?.active_emergency_admin_sessions ?? '—'} helper="Current active emergency-admin sessions" tone={(summary?.active_emergency_admin_sessions || 0) > 0 ? 'danger' : 'default'} loading={!data && sessions.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/support-sessions" label="Expired" value={summary?.expired_sessions ?? '—'} helper="Time-derived expired history" loading={!data && sessions.isLoading} />
    </OperationalWorkspaceStats>

    {refreshError ? <div className="platform-support-sessions__warning" role="status"><strong>Showing the last successful snapshot.</strong><span>Refresh failed: {readableError(sessions.error)}</span></div> : null}
    {data && !data.evidence_complete ? <div className="platform-support-sessions__warning" role="status"><strong>Identity evidence is permission-scoped.</strong><span>Restricted sources: {data.omitted_sources.map(pretty).join(', ')}. Hidden tenant/Platform-user identities are not replaced with guessed values.</span></div> : null}
    {statusMessage ? <div className="platform-support-sessions__success" role="status">{statusMessage}</div> : null}
    {mutationError ? <div className="platform-support-sessions__error" role="alert">{readableError(mutationError)}</div> : null}

    {canStart ? <section className="io-workspace-panel platform-support-sessions__section">
      <OperationalSectionHeader iconPath="/platform/support-sessions" title="Start support access" description="The selected tenant’s current support policy controls ticket, consent-note, access-level, approval and duration requirements. Emergency-admin access can require approval by a different operator." />
      <div className="platform-support-sessions__form-grid">
        <label>Tenant<select value={form.tenant_id} onChange={(event) => updateForm({ tenant_id: event.target.value })}><option value="">Select tenant</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {pretty(tenant.status)}</option>)}</select></label>
        <label>Access level<select value={form.access_level} onChange={(event) => updateForm({ access_level: event.target.value as SupportAccessLevel })}>{ACCESS_LEVELS.map((item) => <option key={item.value} value={item.value} disabled={Boolean(form.tenant_id) && !selectedPolicy.allowed_access_levels.includes(item.value)}>{item.label}</option>)}</select></label>
        <label>Ticket / reference {selectedPolicy.require_ticket_reference ? <span>required</span> : <span>optional</span>}<input value={form.ticket_reference} onChange={(event) => updateForm({ ticket_reference: event.target.value })} maxLength={120} /></label>
        <label className="platform-support-sessions__wide-field">Support reason <span>required</span><textarea value={form.reason} onChange={(event) => updateForm({ reason: event.target.value })} maxLength={1000} rows={3} /></label>
        <label className="platform-support-sessions__wide-field">Customer-consent note {selectedPolicy.require_customer_consent ? <span>required by tenant policy</span> : <span>optional operator evidence</span>}<textarea value={form.customer_consent_note} onChange={(event) => updateForm({ customer_consent_note: event.target.value })} maxLength={1000} rows={2} /></label>
      </div>
      {form.tenant_id ? <div className="platform-support-sessions__policy-strip">
        <span data-state={selectedPolicy.support_enabled ? 'good' : 'danger'}>{selectedPolicy.support_enabled ? 'Support enabled' : 'Support disabled'}</span>
        <span>{selectedPolicy.max_duration_minutes} min maximum active duration</span>
        <span>{selectedPolicy.require_ticket_reference ? 'Ticket required' : 'Ticket optional'}</span>
        <span>{selectedPolicy.require_customer_consent ? 'Consent note required' : 'Consent note optional'}</span>
        <span>{selectedPolicy.emergency_admin_requires_approval ? 'Emergency admin requires approval' : 'Emergency admin policy-authorized'}</span>
      </div> : null}
      <div className="platform-support-sessions__form-actions"><button type="button" className="app-button app-button--primary" disabled={!canSubmitStart} onClick={() => start.mutate()}>{start.isPending ? 'Starting…' : form.access_level === 'emergency_admin' && selectedPolicy.emergency_admin_requires_approval ? 'Request emergency access' : 'Start support session'}</button>{startValidationMessage ? <span>{startValidationMessage}</span> : <span>Access is audited and revalidated on every tenant request.</span>}</div>
    </section> : <div className="platform-support-sessions__warning"><strong>Support-session creation is unavailable.</strong><span>TENANTS_READ + SUPPORT_SESSION_START are required to select a tenant and create tenant support access.</span></div>}

    <section className="io-workspace-panel platform-support-sessions__section">
      <OperationalSectionHeader iconPath="/platform/support-sessions" title="Support-session registry" description="Server-side search, status filtering, tenant targeting and pagination. Expiry is derived from the actual expiration timestamp rather than depending on a prior page read to rewrite status." />
      <div className="platform-support-sessions__filters">
        <label>Status<select value={status} onChange={(event) => updateParams({ status: event.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="pending_approval">Pending approval</option><option value="ended">Ended</option><option value="expired">Expired</option><option value="rejected">Rejected</option></select></label>
        {canReadTenants ? <label>Tenant<select value={tenantId} onChange={(event) => updateParams({ tenant_id: event.target.value })}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label> : null}
        <label className="platform-support-sessions__search">Search<input value={search} onChange={(event) => updateParams({ search: event.target.value })} placeholder={canReadUsers && canReadTenants ? 'Reason, ticket, tenant or requester' : canReadTenants ? 'Reason, ticket or tenant' : 'Reason, ticket, access level or status'} /></label>
        {(status || tenantId || search) ? <button type="button" className="app-button app-button--secondary" onClick={() => setSearchParams({}, { replace: true })}>Clear filters</button> : null}
      </div>

      {sessions.isError && !data ? <div className="platform-support-sessions__blocking-error"><strong>Support-session evidence could not be loaded.</strong><span>{readableError(sessions.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void sessions.refetch()}>Retry</button></div> : null}
      {sessions.isLoading && !data ? <div className="platform-support-sessions__loading">Loading support-session evidence…</div> : null}

      {data ? <div className="platform-support-sessions__registry">
        {data.sessions.map((row) => {
          const rejectionReason = (rejectionReasons[row.id] || '').trim();
          const canApproveRow = canApprove && !row.requester_is_current_user && !approve.isPending;
          const canRejectRow = canApprove && rejectionReason.length >= 5 && !reject.isPending;
          const canEnterRow = canStart && row.requester_is_current_user && !row.tenant_identity_restricted && !token.isPending;
          return <article className="platform-support-sessions__card" key={row.id}>
            <div className="platform-support-sessions__card-header">
              <div><h4>{tenantDisplay(row)}</h4><p>{accessLabel(row.access_level)} · started {formatDateTime(row.started_at)}</p></div>
              <span className="platform-support-sessions__status" data-tone={statusTone(row.status)}>{pretty(row.status)}</span>
            </div>
            <div className="platform-support-sessions__details-grid">
              <div><span>Requester</span><strong>{row.platform_user_identity_restricted ? (row.requester_is_current_user ? 'Current Platform operator' : 'Restricted Platform identity') : (row.platform_user_name || row.platform_user_email || 'Platform user')}</strong><small>{row.requester_is_current_user ? 'This operator owns token issuance for the session' : 'Only the requester can create tenant access from this record'}</small></div>
              <div><span>Ticket / reference</span><strong>{row.ticket_reference || 'Not recorded'}</strong><small>Application reference only</small></div>
              <div><span>Expires</span><strong>{formatDateTime(row.expires_at)}</strong><small>Every support-token request is checked against this timestamp</small></div>
              <div><span>Approval</span><strong>{row.status === 'pending_approval' ? 'Waiting for another operator' : row.approved_at ? `Approved ${formatDateTime(row.approved_at)}` : row.status === 'active' ? 'No separate approval recorded' : 'Not applicable'}</strong><small>{row.approved_by_platform_user_email ? `By ${row.approved_by_platform_user_email}` : row.platform_user_identity_restricted && row.approved_at ? 'Approver identity restricted' : row.approval_note || ''}</small></div>
            </div>
            <div className="platform-support-sessions__reason"><strong>Recorded support reason</strong><span>{row.reason}</span>{row.customer_consent_note ? <><strong>Operator-recorded customer-consent note</strong><span>{row.customer_consent_note}</span></> : null}</div>
            {row.rejection_reason ? <div className="platform-support-sessions__decision" data-tone="danger"><strong>Rejected {formatDateTime(row.rejected_at)}</strong><span>{row.rejection_reason}{row.rejected_by_platform_user_email ? ` · ${row.rejected_by_platform_user_email}` : ''}</span></div> : null}
            {row.ended_at ? <div className="platform-support-sessions__decision"><strong>Ended {formatDateTime(row.ended_at)}</strong><span>{row.ended_by_platform_user_email ? `Ended by ${row.ended_by_platform_user_email}` : row.platform_user_identity_restricted ? 'Ending operator identity restricted' : ''}</span></div> : null}
            <div className="platform-support-sessions__actions">
              {row.status === 'pending_approval' ? <>
                <input placeholder="Approval note (optional)" value={approvalNotes[row.id] || ''} onChange={(event) => setApprovalNotes((current) => ({ ...current, [row.id]: event.target.value }))} maxLength={1000} />
                <button type="button" className="app-button app-button--secondary" disabled={!canApproveRow} title={row.requester_is_current_user ? 'A requester cannot approve their own support-session request.' : undefined} onClick={() => window.confirm(`Approve ${accessLabel(row.access_level)} support access for ${tenantDisplay(row)}? Current tenant policy will be revalidated.`) && approve.mutate(row.id)}>Approve</button>
                <input placeholder="Rejection reason" value={rejectionReasons[row.id] || ''} onChange={(event) => setRejectionReasons((current) => ({ ...current, [row.id]: event.target.value }))} maxLength={1000} />
                <button type="button" className="app-button app-button--secondary" disabled={!canRejectRow} onClick={() => window.confirm(`Reject support-session request for ${tenantDisplay(row)}?`) && reject.mutate(row.id)}>Reject</button>
                {canEnd ? <button type="button" className="app-button app-button--secondary" disabled={end.isPending} onClick={() => window.confirm(`Cancel this pending support session${row.tenant_name ? ` for ${row.tenant_name}` : ''}?`) && end.mutate(row.id)}>Cancel request</button> : null}
              </> : null}
              {row.status === 'active' ? <>
                {canEnterRow ? <button type="button" className="app-button app-button--primary" onClick={() => window.confirm(`Enter ${tenantDisplay(row)} using this support session? Current tenant policy, tenant lifecycle and Platform account state will be revalidated.`) && token.mutate(row.id)}>Enter tenant</button> : row.requester_is_current_user && !canReadTenants ? <span>TENANTS_READ is required to enter tenant access.</span> : !row.requester_is_current_user ? <span>Only the requesting operator can enter this session.</span> : null}
                {canEnd ? <button type="button" className="app-button app-button--secondary" disabled={end.isPending} onClick={() => window.confirm(`End this support session${row.tenant_name ? ` for ${row.tenant_name}` : ''}? Existing support-session tokens will stop authenticating.`) && end.mutate(row.id)}>End session</button> : null}
              </> : null}
            </div>
            <div className="platform-support-sessions__links">
              {canReadTenants && row.tenant_id ? <Link to={`/platform/tenants?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Tenant</Link> : null}
              {canReadAudit ? <Link to={`/platform/audit?target_type=support_sessions&target_id=${encodeURIComponent(row.id)}`}>Audit evidence</Link> : null}
              {canReadUsers && row.platform_user_id ? <Link to={`/platform/users?platform_user_id=${encodeURIComponent(row.platform_user_id)}`}>Requester</Link> : null}
              <span>Session {row.id}</span>
            </div>
          </article>;
        })}
        {!data.sessions.length ? <div className="platform-support-sessions__empty"><strong>No support sessions match these filters.</strong><span>Change the filters or refresh the registry.</span></div> : null}
        <div className="platform-support-sessions__pager"><span>Showing {pageStart}–{pageEnd} of {pagination?.total ?? 0}</span><div><button type="button" className="app-button app-button--secondary" disabled={!pagination || pagination.offset === 0 || sessions.isFetching} onClick={() => updateParams({ offset: String(Math.max(0, (pagination?.offset || 0) - PAGE_SIZE)) })}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!pagination?.has_more || sessions.isFetching} onClick={() => updateParams({ offset: String((pagination?.offset || 0) + PAGE_SIZE) })}>Next</button></div></div>
      </div> : null}
    </section>

    <section className="io-workspace-panel platform-support-sessions__section">
      <OperationalSectionHeader iconPath="/platform/support-sessions" title="Access and evidence boundary" description="Support-session records are application access-control evidence. They do not prove a customer consented, that support work succeeded, or that an issued token was actually used." />
      <div className="platform-support-sessions__truth"><strong>Operator assertions are not external proof.</strong><span>A recorded customer-consent note is an operator-entered application record, not independent proof of customer consent. An Active session means the application currently records an unexpired support session; it does not prove a support token was issued or used. Tenant support policy, tenant lifecycle and the originating Platform account are revalidated before tenant access is accepted.</span></div>
      <div className="platform-support-sessions__coverage">{(data?.available_sources || ['support_sessions']).map((source) => <span key={source} data-state="available">{pretty(source)} · available</span>)}{(data?.omitted_sources || []).map((source) => <span key={source} data-state="restricted">{pretty(source)} · restricted</span>)}</div>
      <div className="platform-support-sessions__supporting-links">
        {canReadTenants ? <Link to="/platform/tenants">Tenants</Link> : null}
        {canReadAudit ? <Link to="/platform/audit?source=support_sessions">Platform Audit</Link> : null}
        {canReadUsers ? <Link to="/platform/users">Platform Users</Link> : null}
      </div>
    </section>
  </div>;
}
