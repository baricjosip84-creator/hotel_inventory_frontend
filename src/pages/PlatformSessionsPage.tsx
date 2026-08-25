import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
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
import './PlatformSessionsPage.css';

type SessionStatus = 'active' | 'revoked' | 'expired';
type PlatformUserDirectoryRow = { id: string; email: string; name: string; role: string; is_active?: boolean };
type Session = {
  id: string;
  platform_user_id: string | null;
  platform_user_email: string | null;
  platform_user_name: string | null;
  platform_user_role: string | null;
  platform_user_identity_restricted: boolean;
  platform_user_linked: boolean;
  revoked: boolean;
  is_active: boolean;
  is_current: boolean;
  expires_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  last_used_at?: string | null;
  created_at: string;
};
type PlatformSessionsResponse = {
  feature: string;
  generated_at: string;
  summary: {
    total_sessions: number;
    active_sessions: number;
    revoked_sessions: number;
    expired_sessions: number;
  };
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  current_session: {
    tracked: boolean;
    session_id: string | null;
    record_active: boolean | null;
    revoked: boolean | null;
    expires_at: string | null;
    last_used_at: string | null;
  };
  evidence_access: { platform_sessions: boolean; platform_user_identity: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_complete: boolean;
  required_permissions_by_source: Record<string, string[]>;
  truth_contract: Record<string, boolean>;
  sessions: Session[];
};

const PAGE_SIZE = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString();
}
function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function statusOf(session: Session): SessionStatus { if (session.revoked) return 'revoked'; return session.is_active ? 'active' : 'expired'; }
function statusLabel(session: Session) { if (session.is_current && session.is_active) return 'Current browser'; return pretty(statusOf(session)); }
function statusTone(session: Session) { if (session.is_current && session.is_active) return 'current'; if (session.is_active) return 'good'; if (session.revoked) return 'danger'; return 'neutral'; }
function shortId(value: string) { return `${value.slice(0, 8)}…${value.slice(-4)}`; }

export default function PlatformSessionsPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canRevoke = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_REVOKE);
  const canReadSecurity = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SECURITY_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadPermissionAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ACCESS_REVIEWS_READ);

  const requestedStatus = searchParams.get('status') || '';
  const status = ['active', 'revoked', 'expired'].includes(requestedStatus) ? requestedStatus as SessionStatus : '';
  const requestedUserId = searchParams.get('platform_user_id') || '';
  const requestedSearch = searchParams.get('search') || '';
  const search = requestedSearch.length <= 200 ? requestedSearch : '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);
  const invalidFilters = Boolean(
    (requestedStatus && !status)
    || (requestedSearch && !search)
    || (requestedUserId && !UUID_RE.test(requestedUserId))
  );
  const identityFilterForbidden = Boolean(requestedUserId && !canReadUsers);

  const usersQuery = useQuery({
    queryKey: ['platform', 'users', 'session-filter-directory'],
    queryFn: () => platformApiRequest<PlatformUserDirectoryRow[]>('/platform/users'),
    enabled: canReadUsers,
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ workspace: 'true', limit: String(PAGE_SIZE), offset: String(offset) });
    if (status) params.set('status', status);
    if (requestedUserId) params.set('platform_user_id', requestedUserId);
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [status, requestedUserId, search, offset]);

  const sessionsQuery = useQuery({
    queryKey: ['platform', 'sessions', 'workspace', queryString],
    queryFn: () => platformApiRequest<PlatformSessionsResponse>(`/platform/sessions?${queryString}`),
    enabled: !invalidFilters && !identityFilterForbidden,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/sessions/${id}/revoke`, { method: 'POST' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform', 'sessions'] }),
        queryClient.invalidateQueries({ queryKey: ['platform', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['platform', 'security'] }),
        queryClient.invalidateQueries({ queryKey: ['platform', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['platform', 'permission-audit'] }),
        queryClient.invalidateQueries({ queryKey: ['platform', 'audit'] })
      ]);
    }
  });

  const rawData = sessionsQuery.data as PlatformSessionsResponse | Session[] | undefined;
  const legacySessions = Array.isArray(rawData) ? rawData : null;
  const data = legacySessions ? undefined : rawData;
  const sessions = legacySessions || (Array.isArray(data?.sessions) ? data.sessions : []);
  const summary = data?.summary;
  const pagination = data?.pagination;
  const currentSession = data?.current_session;
  const evidenceAccess = data?.evidence_access || { platform_sessions: true, platform_user_identity: canReadUsers };
  const evidenceComplete = data?.evidence_complete ?? canReadUsers;
  const directoryUsers = Array.isArray(usersQuery.data) ? usersQuery.data : [];
  const refreshError = sessionsQuery.isError && Boolean(rawData);
  const pageStart = pagination?.total ? pagination.offset + 1 : 0;
  const pageEnd = pagination ? Math.min(pagination.offset + sessions.length, pagination.total) : sessions.length;

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key); }
    if (!Object.prototype.hasOwnProperty.call(patch, 'offset')) next.delete('offset');
    setSearchParams(next, { replace: true });
  };

  const refreshAll = async () => {
    await Promise.all([
      sessionsQuery.refetch(),
      ...(canReadUsers ? [usersQuery.refetch()] : [])
    ]);
  };

  const currentStatus = !data
    ? 'Loading'
    : !currentSession?.tracked
      ? 'Session untracked'
      : currentSession.record_active
        ? 'Current browser tracked'
        : 'Current record inactive';

  return <div className="io-operational-page io-workspace-page platform-sessions">
    <OperationalWorkspaceHero
      iconPath="/platform/sessions"
      eyebrow="Platform Access Governance"
      title="Platform sessions"
      description="Review application session records for Platform staff, identify the currently authenticated browser record, and revoke another active session through an audited lifecycle action. Platform-user identity is independently permission-scoped."
      meta={<>
        <OperationalWorkspaceMetaPill>PLATFORM_SESSIONS_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{evidenceAccess.platform_user_identity ? 'Platform identity visible' : 'Platform identity restricted'}</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{canRevoke ? 'Revocation enabled' : 'Read-only registry'}</OperationalWorkspaceMetaPill>
        {data?.generated_at ? <OperationalWorkspaceMetaPill>Generated {formatDateTime(data.generated_at)}</OperationalWorkspaceMetaPill> : null}
      </>}
      aside={<div className="platform-sessions__hero-aside">
        <OperationalWorkspaceStatus value={currentStatus} label="current Platform browser session record" />
        <button type="button" className="app-button app-button--secondary" disabled={sessionsQuery.isFetching || usersQuery.isFetching || invalidFilters || identityFilterForbidden} onClick={() => void refreshAll()}>{sessionsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
      </div>}
    />

    <OperationalWorkspaceStats ariaLabel="Platform session summary">
      <OperationalWorkspaceStatCard iconPath="/platform/sessions" label="Matching records" value={summary?.total_sessions ?? '—'} helper="Registry-wide count for the current filters" loading={!data && sessionsQuery.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/sessions" label="Active" value={summary?.active_sessions ?? '—'} helper="Unrevoked, unexpired session records" tone={(summary?.active_sessions || 0) > 0 ? 'blue' : 'neutral'} loading={!data && sessionsQuery.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/sessions" label="Revoked" value={summary?.revoked_sessions ?? '—'} helper="Explicitly revoked session history" tone={(summary?.revoked_sessions || 0) > 0 ? 'warn' : 'neutral'} loading={!data && sessionsQuery.isLoading} />
      <OperationalWorkspaceStatCard iconPath="/platform/sessions" label="Expired" value={summary?.expired_sessions ?? '—'} helper="Unrevoked records whose expiry has passed" loading={!data && sessionsQuery.isLoading} />
    </OperationalWorkspaceStats>

    {refreshError ? <div className="platform-sessions__warning" role="status"><strong>Showing the last successful snapshot.</strong><span>Refresh failed: {readableError(sessionsQuery.error)}</span></div> : null}
    {rawData && !evidenceComplete ? <div className="platform-sessions__warning" role="status"><strong>Platform-user identity evidence is restricted.</strong><span>Session state, IP/user-agent request metadata and lifecycle remain visible; names, emails, roles and user-target filters require PLATFORM_USERS_READ.</span></div> : null}
    {revokeMutation.error ? <div className="platform-sessions__error" role="alert">{readableError(revokeMutation.error)}</div> : null}

    <section className="io-workspace-panel platform-sessions__section">
      <OperationalSectionHeader iconPath="/platform/sessions" title="Session registry" description="Filter server-side across the full Platform-session registry. Search always covers session ID, IP and user-agent metadata; Platform-user name/email/role are added only when PLATFORM_USERS_READ is available." />
      <div className="platform-sessions__filter-grid">
        <label>Status<select value={status} onChange={(event) => updateParams({ status: event.target.value || null })}><option value="">All record states</option><option value="active">Active</option><option value="revoked">Revoked</option><option value="expired">Expired</option></select></label>
        {canReadUsers ? <label>Platform user<select value={requestedUserId} onChange={(event) => updateParams({ platform_user_id: event.target.value || null })}><option value="">All Platform users</option>{directoryUsers.map((user) => <option key={user.id} value={user.id}>{user.name || user.email} · {pretty(user.role)}</option>)}</select></label> : null}
        <label className="platform-sessions__search">Search<input value={requestedSearch} onChange={(event) => updateParams({ search: event.target.value || null })} maxLength={200} placeholder={canReadUsers ? 'Session ID, IP, user agent, name, email or role' : 'Session ID, IP or user agent'} /></label>
        <div className="platform-sessions__filter-actions"><button type="button" className="app-button app-button--secondary" disabled={!status && !requestedUserId && !requestedSearch} onClick={() => setSearchParams({}, { replace: true })}>Clear filters</button></div>
      </div>
      {invalidFilters ? <div className="platform-sessions__validation">The URL contains an invalid Platform Sessions filter. Clear the filters before loading evidence.</div> : null}
      {identityFilterForbidden ? <div className="platform-sessions__validation">PLATFORM_USERS_READ is required to target a specific Platform user. The restricted filter was not sent to the API.</div> : null}

      {!data && sessionsQuery.isLoading ? <div className="platform-sessions__loading">Loading Platform session evidence…</div> : null}
      {!data && sessionsQuery.isError ? <div className="platform-sessions__blocking-error" role="alert"><strong>Platform Sessions could not be loaded.</strong><span>{readableError(sessionsQuery.error)}</span><button type="button" className="app-button app-button--secondary" disabled={sessionsQuery.isFetching} onClick={() => void sessionsQuery.refetch()}>Retry</button></div> : null}

      {sessions.length ? <div className="platform-sessions__table-wrap"><table className="platform-sessions__table"><thead><tr><th>Session</th><th>Platform user</th><th>Status</th><th>Network evidence</th><th>Activity</th><th>Expires</th><th>Actions</th></tr></thead><tbody>{sessions.map((session) => <tr key={session.id}>
        <td><strong>{shortId(session.id)}</strong><small>{session.id}</small></td>
        <td>{session.platform_user_identity_restricted ? <><strong>Restricted Platform user</strong><small>PLATFORM_USERS_READ required</small></> : <><strong>{session.platform_user_name || session.platform_user_email || 'Platform user'}</strong><small>{session.platform_user_email || 'No email'} · {pretty(session.platform_user_role)}</small></>}</td>
        <td><span className="platform-sessions__badge" data-tone={statusTone(session)}>{statusLabel(session)}</span>{session.is_current ? <small>This browser</small> : null}</td>
        <td><strong>{session.ip_address || 'Not recorded'}</strong><small className="platform-sessions__wrap">{session.user_agent || 'User agent not recorded'}</small></td>
        <td><strong>{formatDateTime(session.last_used_at || session.created_at)}</strong><small>Created {formatDateTime(session.created_at)}</small></td>
        <td>{formatDateTime(session.expires_at)}</td>
        <td>{session.is_current && session.is_active ? <span className="platform-sessions__action-note">Sign out to end this browser session.</span> : session.is_active && canRevoke ? <button type="button" className="app-button app-button--danger" disabled={revokeMutation.isPending} onClick={() => window.confirm('Revoke this active Platform session? The bearer will be rejected on its next authenticated request.') && revokeMutation.mutate(session.id)}>Revoke session</button> : session.is_active ? <span className="platform-sessions__action-note">PLATFORM_SESSIONS_REVOKE required</span> : <span className="platform-sessions__action-note">Historical record</span>}</td>
      </tr>)}</tbody></table></div> : rawData ? <div className="platform-sessions__empty"><strong>No Platform sessions matched.</strong><span>No application session record matched the current permission-scoped filters.</span></div> : null}

      {pagination ? <div className="platform-sessions__pagination"><span>Showing {pageStart}–{pageEnd} of {pagination.total}</span><button type="button" className="app-button app-button--secondary" disabled={pagination.offset === 0 || sessionsQuery.isFetching} onClick={() => updateParams({ offset: String(Math.max(0, pagination.offset - PAGE_SIZE)) })}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!pagination.has_more || sessionsQuery.isFetching} onClick={() => updateParams({ offset: String(pagination.offset + PAGE_SIZE) })}>Next</button></div> : null}
    </section>

    <section className="io-workspace-panel platform-sessions__section">
      <OperationalSectionHeader iconPath="/platform/sessions" title="Evidence interpretation" description="Platform Sessions is an application session registry, not a physical-device or human-presence monitor." />
      <div className="platform-sessions__truth-grid"><div><strong>Active session record</strong><span>Means the application record is unrevoked and unexpired. Every authenticated request still revalidates the current Platform account and current role permissions.</span></div><div><strong>IP and user agent</strong><span>Are application request metadata. They do not independently prove device identity, ownership, location or the person using the browser.</span></div><div><strong>Last used</strong><span>Reflects application session/refresh activity. It does not prove continuous human presence or that the browser remained under the same operator&apos;s control.</span></div><div><strong>Revocation</strong><span>Records application invalidation. It does not prove a copied credential was erased from an external browser or device.</span></div></div>
    </section>

    <section className="io-workspace-panel platform-sessions__section">
      <OperationalSectionHeader iconPath="/platform/sessions" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." />
      <div className="platform-sessions__supporting-links">{canReadUsers ? <Link to="/platform/users">Platform users</Link> : null}{canReadSecurity ? <Link to="/platform/security">Security</Link> : null}{canReadPermissionAudit ? <Link to="/platform/permission-audit">Permission audit</Link> : null}{canReadAudit ? <Link to="/platform/audit?source=platform_sessions">Platform audit</Link> : null}</div>
    </section>
  </div>;
}
