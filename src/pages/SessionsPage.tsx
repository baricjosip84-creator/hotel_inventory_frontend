import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { apiRequest, ApiError } from '../lib/api';
import {
  clearAuthTokens,
  getCurrentTenantSessionId,
  isSupportSessionAccess
} from '../lib/auth';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './SessionsPage.css';

type SessionStatusFilter = 'active' | 'revoked' | 'expired' | 'all';

type SessionItem = {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  last_used_at?: string | null;
  expires_at: string;
  revoked: boolean;
  is_current?: boolean;
  is_active?: boolean;
  session_type?: string | null;
  access_level?: string | null;
  reason?: string | null;
};

type SessionSummary = {
  total: number;
  active: number;
  revoked: number;
  expired: number;
};

type SessionPageResponse = {
  rows: SessionItem[];
  page: number;
  page_size: number;
  status: SessionStatusFilter;
  has_next: boolean;
  summary: SessionSummary;
};

type RevokeSessionResponse = {
  success: true;
  revoked?: boolean;
};

type RevokeAllResponse = {
  success: true;
  revoked_count?: number;
};

async function fetchSessions(options: {
  page: number;
  pageSize: number;
  status: SessionStatusFilter;
}): Promise<SessionPageResponse> {
  const params = new URLSearchParams({
    paged: 'true',
    page: String(options.page),
    page_size: String(options.pageSize),
    status: options.status
  });

  return apiRequest<SessionPageResponse>(`/auth/sessions?${params.toString()}`);
}

async function revokeSession(sessionId: string): Promise<RevokeSessionResponse> {
  return apiRequest<RevokeSessionResponse>(`/auth/sessions/${sessionId}`, {
    method: 'DELETE',
    skipMutationFeedback: true
  });
}

async function revokeAllSessions(): Promise<RevokeAllResponse> {
  return apiRequest<RevokeAllResponse>('/auth/sessions', {
    method: 'DELETE',
    skipMutationFeedback: true
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function describeNetwork(value: string | null | undefined): { label: string; detail?: string } {
  const ip = value?.trim();
  if (!ip) return { label: 'Unknown network' };

  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return { label: 'Proxy / local', detail: ip };
  }

  return { label: ip };
}

function formatSessionType(value: string | null | undefined): string {
  if (value === 'support_session') return 'Support session';
  if (!value) return 'Tenant session';

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function describeDevice(value: string | null | undefined): string {
  if (!value?.trim()) return 'Unknown device';
  const ua = value;

  const os = /Windows NT/i.test(ua)
    ? 'Windows'
    : /Android/i.test(ua)
      ? 'Android'
      : /iPhone|iPad|iPod/i.test(ua)
        ? 'iOS'
        : /Mac OS X|Macintosh/i.test(ua)
          ? 'macOS'
          : /Linux|Ubuntu/i.test(ua)
            ? 'Linux'
            : 'Unknown OS';

  const version = (pattern: RegExp) => ua.match(pattern)?.[1]?.replace(/_/g, '.');
  const playwrightVersion = version(/Playwright\/([\d.]+)/i);
  if (playwrightVersion) return `Playwright ${playwrightVersion} automation on ${os}`;

  const operaVersion = version(/OPR\/([\d.]+)/i);
  if (operaVersion) return `Opera ${operaVersion} on ${os}`;

  const headlessChromeVersion = version(/HeadlessChrome\/([\d.]+)/i);
  if (headlessChromeVersion) return `Headless Chrome ${headlessChromeVersion} on ${os}`;

  const edgeVersion = version(/Edg\/([\d.]+)/i);
  if (edgeVersion) return `Edge ${edgeVersion} on ${os}`;

  const chromeVersion = version(/Chrome\/([\d.]+)/i);
  if (chromeVersion) return `Chrome ${chromeVersion} on ${os}`;

  const firefoxVersion = version(/Firefox\/([\d.]+)/i);
  if (firefoxVersion) return `Firefox ${firefoxVersion} on ${os}`;

  const safariVersion = version(/Version\/([\d.]+).*Safari/i);
  if (safariVersion) return `Safari ${safariVersion} on ${os}`;

  return `Browser on ${os}`;
}

function shortenId(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function formatLastRefreshed(timestamp: number): string {
  if (!timestamp) return 'Not refreshed yet';
  return new Date(timestamp).toLocaleString();
}

function sessionStatusLabel(status: SessionStatusFilter, summary: SessionSummary): string {
  if (status === 'active' && summary.active === 0) return 'NO ACTIVE SESSIONS';
  if (status === 'all') return 'ALL SESSIONS';
  return `${status.toUpperCase()} SESSIONS`;
}

function StatusBadge({
  children,
  tone = 'neutral'
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'danger' | 'blue';
}) {
  return <span className={`sessions-badge sessions-badge--${tone}`}>{children}</span>;
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const supportSession = isSupportSessionAccess();
  const currentTenantSessionId = getCurrentTenantSessionId();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState<SessionStatusFilter>('active');
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ['auth-sessions', { page, pageSize, statusFilter }],
    queryFn: () => fetchSessions({ page, pageSize, status: statusFilter }),
    staleTime: 15_000,
    refetchOnWindowFocus: false
  });

  const sessions = sessionsQuery.data?.rows ?? [];
  const summary = sessionsQuery.data?.summary ?? { total: 0, active: 0, revoked: 0, expired: 0 };
  const hasNext = sessionsQuery.data?.has_next === true;
  const currentBrowserTrackingUnavailable = !supportSession && (!currentTenantSessionId || summary.active === 0);

  useEffect(() => {
    if (!sessionsQuery.data || sessionsQuery.isFetching || page <= 1 || sessions.length > 0 || hasNext) return;
    setPage((current) => Math.max(1, current - 1));
  }, [hasNext, page, sessions.length, sessionsQuery.data, sessionsQuery.isFetching]);

  const revokeOneMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: async (result) => {
      setPageError(null);
      setPageMessage(result.revoked === false ? 'Session was already inactive or unavailable.' : 'Session revoked.');
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
    },
    onError: (error) => {
      setPageError(error instanceof ApiError ? error.message : 'Failed to revoke session.');
      setPageMessage(null);
    },
    onSettled: () => setRevokingSessionId(null)
  });

  const revokeAllMutation = useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage(null);

      // The current backend session is now revoked, so do not trigger another
      // authenticated list request before clearing local credentials.
      await queryClient.cancelQueries({ queryKey: ['auth-sessions'] });
      queryClient.removeQueries({ queryKey: ['auth-sessions'] });
      clearAuthTokens();
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      setPageError(error instanceof ApiError ? error.message : 'Failed to revoke all sessions.');
      setPageMessage(null);
    }
  });

  const rangeLabel = useMemo(() => {
    if (!sessions.length) return 'No sessions on this page';
    const start = (page - 1) * pageSize + 1;
    const end = start + sessions.length - 1;
    return `Showing ${start}–${end}`;
  }, [page, pageSize, sessions.length]);

  const handleRefresh = async () => {
    setPageError(null);
    setPageMessage(null);

    try {
      const result = await sessionsQuery.refetch();
      if (result.error) {
        setPageError(result.error instanceof ApiError ? result.error.message : 'Failed to refresh sessions.');
        return;
      }
      setPageMessage('Sessions refreshed.');
    } catch (error) {
      setPageError(error instanceof ApiError ? error.message : 'Failed to refresh sessions.');
    }
  };

  const handleRevokeOne = (sessionId: string) => {
    setPageError(null);
    setPageMessage(null);
    setRevokingSessionId(sessionId);
    revokeOneMutation.mutate(sessionId);
  };

  const handleRevokeAll = () => {
    const confirmed = window.confirm(
      'This will revoke every active session for your account, including this browser, and return you to login. Continue?'
    );
    if (!confirmed) return;

    setPageError(null);
    setPageMessage(null);
    revokeAllMutation.mutate();
  };

  const changeStatus = (nextStatus: SessionStatusFilter) => {
    setStatusFilter(nextStatus);
    setPage(1);
    setPageError(null);
    setPageMessage(null);
  };

  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
    setPageError(null);
    setPageMessage(null);
  };

  if (sessionsQuery.isLoading) {
    return <div className="app-loading-state sessions-state-panel">Loading sessions…</div>;
  }

  if (sessionsQuery.isError) {
    return (
      <div className="sessions-page io-operational-page io-workspace-page">
        <div className="app-error-state sessions-state-panel">
          <strong>Failed to load sessions.</strong>
          <p>{(sessionsQuery.error as Error).message || 'Unknown error'}</p>
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={() => void handleRefresh()}
            disabled={sessionsQuery.isFetching}
          >
            {sessionsQuery.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const heroStatus = supportSession
    ? 'Platform managed'
    : currentBrowserTrackingUnavailable
      ? 'Attention'
      : `${summary.active} active`;
  const heroStatusLabel = supportSession
    ? `support-session access · refreshed ${formatLastRefreshed(sessionsQuery.dataUpdatedAt)}`
    : currentBrowserTrackingUnavailable
      ? 'current browser is not represented by an active tracked session'
      : `account session posture · refreshed ${formatLastRefreshed(sessionsQuery.dataUpdatedAt)}`;

  return (
    <div className="sessions-page io-operational-page io-workspace-page" id="sessions-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/sessions"
        eyebrow="Account access & security"
        title="Sessions"
        description="Review browser sessions for your account, identify the current browser, and revoke stale access without affecting other tenant users."
        meta={
          <>
            <OperationalWorkspaceMetaPill>Account-scoped</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Current browser protected</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>{supportSession ? 'Platform-managed support access' : 'Revoke actions audited'}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Historical records retained</OperationalWorkspaceMetaPill>
          </>
        }
        aside={
          <div className="sessions-hero-actions">
            <OperationalWorkspaceStatus value={heroStatus} label={heroStatusLabel} />
            <button
              type="button"
              className="app-button app-button--secondary"
              onClick={() => void handleRefresh()}
              disabled={sessionsQuery.isFetching || revokeAllMutation.isPending}
            >
              {sessionsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            {!supportSession ? (
              <button
                type="button"
                className="app-button app-button--danger"
                onClick={handleRevokeAll}
                disabled={revokeAllMutation.isPending || summary.active === 0}
                title="Revokes every active account session, including this browser."
              >
                {revokeAllMutation.isPending ? 'Revoking…' : 'Revoke all sessions'}
              </button>
            ) : null}
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel="Account session overview">
        <OperationalWorkspaceStatCard
          label="Total sessions"
          value={summary.total}
          helper="Historical session records retained for this account"
          tone="neutral"
          iconPath="/sessions"
        />
        <OperationalWorkspaceStatCard
          label="Active sessions"
          value={summary.active}
          helper="Currently usable refresh sessions"
          tone={summary.active > 0 ? 'blue' : 'neutral'}
          iconPath="/admin-system"
        />
        <OperationalWorkspaceStatCard
          label="Revoked sessions"
          value={summary.revoked}
          helper="Sessions explicitly disabled before expiry"
          tone="neutral"
          iconPath="/audit"
        />
        <OperationalWorkspaceStatCard
          label="Expired sessions"
          value={summary.expired}
          helper="Sessions that ended naturally without revocation"
          tone="neutral"
          iconPath="/reliability-command"
        />
      </OperationalWorkspaceStats>

      {pageError ? <div className="app-error-state sessions-message" role="alert">{pageError}</div> : null}
      {pageMessage ? <div className="app-success-state sessions-message" role="status">{pageMessage}</div> : null}

      {supportSession ? (
        <div className="app-info-state sessions-guidance" role="status">
          <strong>Platform support access is read-only here.</strong>
          <span>This support session must be ended from the platform Support Sessions page.</span>
        </div>
      ) : currentBrowserTrackingUnavailable ? (
        <div className="app-info-state sessions-guidance" role="status">
          <strong>Current browser is not yet tracked.</strong>
          <span>This signed-in browser is not represented by an active tracked session. Sign out and sign back in once to create a tracked session and bring this browser under Sessions management.</span>
        </div>
      ) : (
        <div className="app-warning-state sessions-guidance">
          <strong>Sign out everywhere.</strong>
          <span>Revoke all sessions disables every currently active session, including this browser, and returns you to login. Revoked and expired history is preserved.</span>
        </div>
      )}

      <section className="app-panel sessions-panel">
        <OperationalSectionHeader
          iconPath="/sessions"
          title="Session inventory"
          description="Active sessions are shown by default. The current browser is pinned first when it matches the selected status."
          actions={<StatusBadge tone={statusFilter === 'active' && summary.active === 0 ? 'neutral' : 'blue'}>{sessionStatusLabel(statusFilter, summary)}</StatusBadge>}
        />

        <div className="sessions-toolbar">
          <div className="sessions-filters" aria-label="Session inventory filters">
            <label className="sessions-filter-field">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) => changeStatus(event.target.value as SessionStatusFilter)}
                disabled={sessionsQuery.isFetching}
              >
                <option value="active">Active ({summary.active})</option>
                <option value="revoked">Revoked ({summary.revoked})</option>
                <option value="expired">Expired ({summary.expired})</option>
                <option value="all">All ({summary.total})</option>
              </select>
            </label>

            <label className="sessions-filter-field">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(event) => changePageSize(Number(event.target.value))}
                disabled={sessionsQuery.isFetching}
              >
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
            </label>
          </div>

          <div className="sessions-list-meta" aria-live="polite">
            <span>{rangeLabel}</span>
            <span>Page {page}</span>
          </div>
        </div>

        <div className="sessions-table-wrapper">
          <table className="sessions-table">
            <thead>
              <tr>
                <th className="sessions-col-status">Status</th>
                <th className="sessions-col-network">Network</th>
                <th>Device</th>
                <th className="sessions-col-date">Created</th>
                <th className="sessions-col-date">Last used</th>
                <th className="sessions-col-date">Expires</th>
                <th className="sessions-col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td className="sessions-empty-cell" colSpan={7}>
                    <strong>No {statusFilter === 'all' ? '' : `${statusFilter} `}sessions found.</strong>
                    <span>{statusFilter === 'active' ? 'There are no tracked active sessions for this account in the current view.' : 'Choose another status to review the retained session history.'}</span>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const isExpired = typeof session.is_active === 'boolean'
                    ? !session.revoked && !session.is_active
                    : !session.revoked && new Date(session.expires_at).getTime() <= Date.now();
                  const isCurrent = Boolean(session.is_current);
                  const network = describeNetwork(session.ip_address);
                  const canRevoke = !supportSession && !session.revoked && !isExpired && !isCurrent;
                  const isRowPending = revokingSessionId === session.id && revokeOneMutation.isPending;
                  const revokeDisabled = !canRevoke || revokeOneMutation.isPending || revokeAllMutation.isPending;
                  const revokeTitle = supportSession
                    ? 'Support sessions must be ended from the platform Support Sessions page.'
                    : isCurrent
                      ? 'Current session cannot be revoked individually. Use Revoke all sessions to sign out everywhere.'
                      : session.revoked
                        ? 'Session is already revoked.'
                        : isExpired
                          ? 'Expired sessions no longer need revocation.'
                          : 'Revoke this active session.';

                  return (
                    <tr key={session.id} className={isCurrent ? 'sessions-row sessions-row--current' : 'sessions-row'}>
                      <td className="sessions-col-status">
                        <div className="sessions-status-stack">
                          <StatusBadge tone={session.revoked ? 'neutral' : isExpired ? 'warn' : 'good'}>
                            {session.revoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                          </StatusBadge>
                          {isCurrent ? <StatusBadge tone="blue">CURRENT</StatusBadge> : null}
                          {session.session_type ? <StatusBadge tone="neutral">{formatSessionType(session.session_type)}</StatusBadge> : null}
                        </div>
                      </td>

                      <td className="sessions-col-network">
                        <div className="sessions-row-title" title={network.detail}>{network.label}</div>
                        {network.detail ? <div className="sessions-row-subtle">Reported {network.detail}</div> : null}
                        <div className="sessions-row-subtle" title={session.id}>Session {shortenId(session.id)}</div>
                      </td>

                      <td className="sessions-device-cell" title={session.user_agent || undefined}>
                        <div className="sessions-row-title">{describeDevice(session.user_agent)}</div>
                        <div className="sessions-row-subtle">Hover for full browser signature</div>
                      </td>
                      <td className="sessions-col-date">{formatDateTime(session.created_at)}</td>
                      <td className="sessions-col-date">{formatDateTime(session.last_used_at)}</td>
                      <td className="sessions-col-date">{formatDateTime(session.expires_at)}</td>

                      <td className="sessions-col-action">
                        {supportSession ? (
                          <span className="sessions-managed-text">Platform managed</span>
                        ) : (
                          <button
                            type="button"
                            className="app-button app-button--secondary app-button--compact"
                            onClick={() => handleRevokeOne(session.id)}
                            disabled={revokeDisabled}
                            title={revokeTitle}
                          >
                            {isRowPending ? 'Revoking…' : 'Revoke'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="sessions-pagination">
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || sessionsQuery.isFetching}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={() => setPage((current) => current + 1)}
            disabled={!hasNext || sessionsQuery.isFetching}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
