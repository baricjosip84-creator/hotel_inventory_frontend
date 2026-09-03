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
  // OperationalWorkspaceMetaPill, // v3.49.107: tenant title info pills intentionally hidden.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import { useAppTranslation } from '../i18n/I18nContext';
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

function formatDateTime(value: string | null | undefined, locale: string): string {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
}

function describeNetwork(value: string | null | undefined, ui: (text: string) => string): { label: string; detail?: string } {
  const ip = value?.trim();
  if (!ip) return { label: ui('Unknown network') };

  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return { label: ui('Proxy / local'), detail: ip };
  }

  return { label: ip };
}

function formatSessionType(value: string | null | undefined, ui: (text: string) => string): string {
  if (value === 'support_session') return ui('Support session');
  if (!value) return ui('Tenant session');

  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function describeDevice(value: string | null | undefined, ui: (text: string) => string): string {
  if (!value?.trim()) return ui('Unknown device');
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
            : ui('Unknown OS');

  const version = (pattern: RegExp) => ua.match(pattern)?.[1]?.replace(/_/g, '.');
  const playwrightVersion = version(/Playwright\/([\d.]+)/i);
  if (playwrightVersion) return `Playwright ${playwrightVersion} · ${ui('automation on')} ${os}`;

  const operaVersion = version(/OPR\/([\d.]+)/i);
  if (operaVersion) return `Opera ${operaVersion} · ${ui('Browser on')} ${os}`;

  const headlessChromeVersion = version(/HeadlessChrome\/([\d.]+)/i);
  if (headlessChromeVersion) return `Headless Chrome ${headlessChromeVersion} · ${ui('Browser on')} ${os}`;

  const edgeVersion = version(/Edg\/([\d.]+)/i);
  if (edgeVersion) return `Edge ${edgeVersion} · ${ui('Browser on')} ${os}`;

  const chromeVersion = version(/Chrome\/([\d.]+)/i);
  if (chromeVersion) return `Chrome ${chromeVersion} · ${ui('Browser on')} ${os}`;

  const firefoxVersion = version(/Firefox\/([\d.]+)/i);
  if (firefoxVersion) return `Firefox ${firefoxVersion} · ${ui('Browser on')} ${os}`;

  const safariVersion = version(/Version\/([\d.]+).*Safari/i);
  if (safariVersion) return `Safari ${safariVersion} · ${ui('Browser on')} ${os}`;

  return `${ui('Browser on')} ${os}`;
}

function shortenId(value: string): string {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-8)}`;
}

function formatLastRefreshed(timestamp: number, locale: string, ui: (text: string) => string): string {
  if (!timestamp) return ui('Not refreshed yet');
  return new Date(timestamp).toLocaleString(locale);
}

function sessionStatusLabel(status: SessionStatusFilter, summary: SessionSummary, ui: (text: string) => string): string {
  if (status === 'active' && summary.active === 0) return ui('NO ACTIVE SESSIONS');
  if (status === 'all') return ui('ALL SESSIONS');
  if (status === 'revoked') return ui('REVOKED SESSIONS');
  if (status === 'expired') return ui('EXPIRED SESSIONS');
  return ui('ACTIVE SESSIONS');
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
  const { locale, ui } = useAppTranslation();
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
      setPageMessage(result.revoked === false ? ui("Session was already inactive or unavailable.") : ui("Session revoked."));
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
    },
    onError: (error) => {
      setPageError(error instanceof ApiError ? error.message : ui("Failed to revoke session."));
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
      setPageError(error instanceof ApiError ? error.message : ui("Failed to revoke all sessions."));
      setPageMessage(null);
    }
  });

  const rangeLabel = useMemo(() => {
    if (!sessions.length) return ui('No sessions on this page');
    const start = (page - 1) * pageSize + 1;
    const end = start + sessions.length - 1;
    return `${ui("Showing")} ${start}–${end}`;
  }, [page, pageSize, sessions.length, ui]);

  const handleRefresh = async () => {
    setPageError(null);
    setPageMessage(null);

    try {
      const result = await sessionsQuery.refetch();
      if (result.error) {
        setPageError(result.error instanceof ApiError ? result.error.message : ui("Failed to refresh sessions."));
        return;
      }
      setPageMessage(ui("Sessions refreshed."));
    } catch (error) {
      setPageError(error instanceof ApiError ? error.message : ui("Failed to refresh sessions."));
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
      ui("This will revoke every active session for your account, including this browser, and return you to login. Continue?")
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
    return <div className="app-loading-state sessions-state-panel">{ui("Loading sessions…")}</div>;
  }

  if (sessionsQuery.isError) {
    return (
      <div className="sessions-page io-operational-page io-workspace-page">
        <div className="app-error-state sessions-state-panel">
          <strong>{ui("Failed to load sessions.")}</strong>
          <p>{(sessionsQuery.error as Error).message || ui('Unknown error')}</p>
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={() => void handleRefresh()}
            disabled={sessionsQuery.isFetching}
          >
            {sessionsQuery.isFetching ? ui("Retrying…") : ui("Retry")}
          </button>
        </div>
      </div>
    );
  }

  const heroStatus = supportSession
    ? ui("Platform managed")
    : currentBrowserTrackingUnavailable
      ? ui("Attention")
      : `${summary.active} ${ui("active")}`;
  const heroStatusLabel = supportSession
    ? `${ui("support-session access · refreshed")} ${formatLastRefreshed(sessionsQuery.dataUpdatedAt, locale, ui)}`
    : currentBrowserTrackingUnavailable
      ? ui("current browser is not represented by an active tracked session")
      : `${ui("account session posture · refreshed")} ${formatLastRefreshed(sessionsQuery.dataUpdatedAt, locale, ui)}`;

  return (
    <div className="sessions-page io-operational-page io-workspace-page" id="sessions-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/sessions"
        eyebrow={ui("Account access & security")}
        title={ui("Sessions")}
        description={ui("Review browser sessions for your account, identify the current browser, and revoke stale access without affecting other tenant users.")}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
                      <>
                        <OperationalWorkspaceMetaPill>{ui("Account-scoped")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui("Current browser protected")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{supportSession ? ui("Platform-managed support access") : ui("Revoke actions audited")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui("Historical records retained")}</OperationalWorkspaceMetaPill>
                      </>
                    
          */
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
              {sessionsQuery.isFetching ? ui("Refreshing…") : ui("Refresh")}
            </button>
            {!supportSession ? (
              <button
                type="button"
                className="app-button app-button--danger"
                onClick={handleRevokeAll}
                disabled={revokeAllMutation.isPending || summary.active === 0}
                title={ui("Revokes every active account session, including this browser.")}
              >
                {revokeAllMutation.isPending ? ui("Revoking…") : ui("Revoke all sessions")}
              </button>
            ) : null}
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel={ui("Account session overview")}>
        <OperationalWorkspaceStatCard
          label={ui("Total sessions")}
          value={summary.total}
          helper={ui("Historical session records retained for this account")}
          tone="neutral"
          iconPath="/sessions"
        />
        <OperationalWorkspaceStatCard
          label={ui("Active sessions")}
          value={summary.active}
          helper={ui("Currently usable refresh sessions")}
          tone={summary.active > 0 ? 'blue' : 'neutral'}
          iconPath="/admin-system"
        />
        <OperationalWorkspaceStatCard
          label={ui("Revoked sessions")}
          value={summary.revoked}
          helper={ui("Sessions explicitly disabled before expiry")}
          tone="neutral"
          iconPath="/audit"
        />
        <OperationalWorkspaceStatCard
          label={ui("Expired sessions")}
          value={summary.expired}
          helper={ui("Sessions that ended naturally without revocation")}
          tone="neutral"
          iconPath="/reliability-command"
        />
      </OperationalWorkspaceStats>

      {pageError ? <div className="app-error-state sessions-message" role="alert">{pageError}</div> : null}
      {pageMessage ? <div className="app-success-state sessions-message" role="status">{pageMessage}</div> : null}

      {supportSession ? (
        <div className="app-info-state sessions-guidance" role="status">
          <strong>{ui("Platform support access is read-only here.")}</strong>
          <span>{ui("This support session must be ended from the platform Support Sessions page.")}</span>
        </div>
      ) : currentBrowserTrackingUnavailable ? (
        <div className="app-info-state sessions-guidance" role="status">
          <strong>{ui("Current browser is not yet tracked.")}</strong>
          <span>{ui("This signed-in browser is not represented by an active tracked session. Sign out and sign back in once to create a tracked session and bring this browser under Sessions management.")}</span>
        </div>
      ) : (
        <div className="app-warning-state sessions-guidance">
          <strong>{ui("Sign out everywhere.")}</strong>
          <span>{ui("Revoke all sessions disables every currently active session, including this browser, and returns you to login. Revoked and expired history is preserved.")}</span>
        </div>
      )}

      <section className="app-panel sessions-panel">
        <OperationalSectionHeader
          iconPath="/sessions"
          title={ui("Session inventory")}
          description={ui("Active sessions are shown by default. The current browser is pinned first when it matches the selected status.")}
          actions={<StatusBadge tone={statusFilter === 'active' && summary.active === 0 ? 'neutral' : 'blue'}>{sessionStatusLabel(statusFilter, summary, ui)}</StatusBadge>}
        />

        <div className="sessions-toolbar">
          <div className="sessions-filters" aria-label={ui("Session inventory filters")}>
            <label className="sessions-filter-field">
              <span>{ui("Status")}</span>
              <select
                value={statusFilter}
                onChange={(event) => changeStatus(event.target.value as SessionStatusFilter)}
                disabled={sessionsQuery.isFetching}
              >
                <option value="active">{ui("Active (")}{summary.active})</option>
                <option value="revoked">{ui("Revoked (")}{summary.revoked})</option>
                <option value="expired">{ui("Expired (")}{summary.expired})</option>
                <option value="all">{ui("All (")}{summary.total})</option>
              </select>
            </label>

            <label className="sessions-filter-field">
              <span>{ui("Rows")}</span>
              <select
                value={pageSize}
                onChange={(event) => changePageSize(Number(event.target.value))}
                disabled={sessionsQuery.isFetching}
              >
                <option value={25}>{ui("25 / page")}</option>
                <option value={50}>{ui("50 / page")}</option>
                <option value={100}>{ui("100 / page")}</option>
              </select>
            </label>
          </div>

          <div className="sessions-list-meta" aria-live="polite">
            <span>{rangeLabel}</span>
            <span>{ui("Page")} {page}</span>
          </div>
        </div>

        <div className="sessions-table-wrapper">
          <table className="sessions-table">
            <thead>
              <tr>
                <th className="sessions-col-status">{ui("Status")}</th>
                <th className="sessions-col-network">{ui("Network")}</th>
                <th>{ui("Device")}</th>
                <th className="sessions-col-date">{ui("Created")}</th>
                <th className="sessions-col-date">{ui("Last used")}</th>
                <th className="sessions-col-date">{ui("Expires")}</th>
                <th className="sessions-col-action">{ui("Action")}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td className="sessions-empty-cell" colSpan={7}>
                    <strong>{ui("No")} {statusFilter === 'all' ? '' : `${statusFilter} `}{ui("sessions found.")}</strong>
                    <span>{statusFilter === 'active' ? ui("There are no tracked active sessions for this account in the current view.") : ui("Choose another status to review the retained session history.")}</span>
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const isExpired = typeof session.is_active === 'boolean'
                    ? !session.revoked && !session.is_active
                    : !session.revoked && new Date(session.expires_at).getTime() <= Date.now();
                  const isCurrent = Boolean(session.is_current);
                  const network = describeNetwork(session.ip_address, ui);
                  const canRevoke = !supportSession && !session.revoked && !isExpired && !isCurrent;
                  const isRowPending = revokingSessionId === session.id && revokeOneMutation.isPending;
                  const revokeDisabled = !canRevoke || revokeOneMutation.isPending || revokeAllMutation.isPending;
                  const revokeTitle = supportSession
                    ? ui("Support sessions must be ended from the platform Support Sessions page.")
                    : isCurrent
                      ? ui("Current session cannot be revoked individually. Use Revoke all sessions to sign out everywhere.")
                      : session.revoked
                        ? ui("Session is already revoked.")
                        : isExpired
                          ? ui("Expired sessions no longer need revocation.")
                          : ui("Revoke this active session.");

                  return (
                    <tr key={session.id} className={isCurrent ? 'sessions-row sessions-row--current' : 'sessions-row'}>
                      <td className="sessions-col-status">
                        <div className="sessions-status-stack">
                          <StatusBadge tone={session.revoked ? 'neutral' : isExpired ? 'warn' : 'good'}>
                            {session.revoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                          </StatusBadge>
                          {isCurrent ? <StatusBadge tone="blue">{ui("CURRENT")}</StatusBadge> : null}
                          {session.session_type ? <StatusBadge tone="neutral">{formatSessionType(session.session_type, ui)}</StatusBadge> : null}
                        </div>
                      </td>

                      <td className="sessions-col-network">
                        <div className="sessions-row-title" title={network.detail}>{network.label}</div>
                        {network.detail ? <div className="sessions-row-subtle">{ui("Reported")} {network.detail}</div> : null}
                        <div className="sessions-row-subtle" title={session.id}>{ui("Session")} {shortenId(session.id)}</div>
                      </td>

                      <td className="sessions-device-cell" title={session.user_agent || undefined}>
                        <div className="sessions-row-title">{describeDevice(session.user_agent, ui)}</div>
                        <div className="sessions-row-subtle">{ui("Hover for full browser signature")}</div>
                      </td>
                      <td className="sessions-col-date">{formatDateTime(session.created_at, locale)}</td>
                      <td className="sessions-col-date">{formatDateTime(session.last_used_at, locale)}</td>
                      <td className="sessions-col-date">{formatDateTime(session.expires_at, locale)}</td>

                      <td className="sessions-col-action">
                        {supportSession ? (
                          <span className="sessions-managed-text">{ui("Platform managed")}</span>
                        ) : (
                          <button
                            type="button"
                            className="app-button app-button--secondary app-button--compact"
                            onClick={() => handleRevokeOne(session.id)}
                            disabled={revokeDisabled}
                            title={revokeTitle}
                          >
                            {isRowPending ? ui("Revoking…") : ui("Revoke")}
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
            {ui("Previous")}
          </button>
          <span>{ui("Page")} {page}</span>
          <button
            type="button"
            className="app-button app-button--secondary"
            onClick={() => setPage((current) => current + 1)}
            disabled={!hasNext || sessionsQuery.isFetching}
          >
            {ui("Next")}
          </button>
        </div>
      </section>
    </div>
  );
}
