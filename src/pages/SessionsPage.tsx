import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { apiRequest, ApiError } from '../lib/api';
import { clearAuthTokens, isSupportSessionAccess } from '../lib/auth';

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
    method: 'DELETE'
  });
}

async function revokeAllSessions(): Promise<RevokeAllResponse> {
  return apiRequest<RevokeAllResponse>('/auth/sessions', {
    method: 'DELETE'
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
  return `Last refreshed ${new Date(timestamp).toLocaleString()}`;
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn' | 'danger';
}) {
  const toneStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : props.tone === 'danger'
          ? styles.statValueDanger
          : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={toneStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const supportSession = isSupportSessionAccess();

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
    return <div className="app-loading-state" style={styles.statePanel}>Loading sessions…</div>;
  }

  if (sessionsQuery.isError) {
    return (
      <div style={styles.page}>
        <div className="app-error-state" style={styles.statePanel}>
          <strong>Failed to load sessions.</strong>
          <p style={styles.stateText}>{(sessionsQuery.error as Error).message || 'Unknown error'}</p>
          <button type="button" style={styles.secondaryButton} onClick={handleRefresh} disabled={sessionsQuery.isFetching}>
            {sessionsQuery.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTextBlock}>
          <h2 style={styles.title}>Sessions</h2>
          <p style={styles.description}>
            Review your account sessions, identify the current browser, and revoke stale access.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleRefresh}
            disabled={sessionsQuery.isFetching || revokeAllMutation.isPending}
          >
            {sessionsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
          {!supportSession ? (
            <button
              type="button"
              style={revokeAllMutation.isPending || summary.active === 0 ? styles.disabledDangerButton : styles.dangerButton}
              onClick={handleRevokeAll}
              disabled={revokeAllMutation.isPending || summary.active === 0}
              title="Revokes every active account session, including this browser."
            >
              {revokeAllMutation.isPending ? 'Revoking…' : 'Revoke All Sessions'}
            </button>
          ) : null}
        </div>
      </div>

      {supportSession ? (
        <div style={styles.infoBox}>
          This is platform support-session access. It is read-only here and must be ended from the platform Support Sessions page.
        </div>
      ) : (
        <div style={styles.warningBox}>
          <strong>Sign out everywhere:</strong> Revoke All Sessions revokes only currently active sessions, including this browser. Historical revoked and expired records are preserved.
        </div>
      )}

      <div style={styles.metaText}>{formatLastRefreshed(sessionsQuery.dataUpdatedAt)}</div>

      {pageError ? <div className="app-error-state" style={styles.messageBox}>{pageError}</div> : null}
      {pageMessage ? <div className="app-success-state" style={styles.messageBox}>{pageMessage}</div> : null}

      <div className="app-grid-stats" style={styles.statsGrid}>
        <StatCard title="Total Sessions" value={summary.total} subtitle="Historical sessions retained for this account" />
        <StatCard title="Active Sessions" value={summary.active} subtitle="Currently usable refresh sessions" tone={summary.active > 0 ? 'good' : 'warn'} />
        <StatCard title="Revoked Sessions" value={summary.revoked} subtitle="Explicitly disabled sessions" />
        <StatCard title="Expired Sessions" value={summary.expired} subtitle="Ended naturally without revocation" tone={summary.expired > 0 ? 'warn' : 'good'} />
      </div>

      <section className="app-panel" style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelHeaderText}>
            <h3 style={styles.panelTitle}>Session Inventory</h3>
            <p style={styles.panelSubtitle}>
              Active sessions are shown by default. The current browser is pinned first when it matches the selected status.
            </p>
          </div>

          <div style={styles.filters}>
            <label style={styles.filterLabel}>
              <span>Status</span>
              <select
                style={styles.select}
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

            <label style={styles.filterLabel}>
              <span>Rows</span>
              <select
                style={styles.select}
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
        </div>

        <div style={styles.listMetaRow}>
          <span>{rangeLabel}</span>
          <span>Page {page}</span>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.statusColumn }}>Status</th>
                <th style={{ ...styles.th, ...styles.networkColumn }}>Network</th>
                <th style={styles.th}>Device</th>
                <th style={{ ...styles.th, ...styles.dateColumn }}>Created</th>
                <th style={{ ...styles.th, ...styles.dateColumn }}>Last Used</th>
                <th style={{ ...styles.th, ...styles.dateColumn }}>Expires</th>
                <th style={{ ...styles.th, ...styles.actionColumn }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={7}>
                    No {statusFilter === 'all' ? '' : `${statusFilter} `}sessions found.
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
                      ? 'Current session cannot be revoked individually. Use Revoke All Sessions to sign out everywhere.'
                      : session.revoked
                        ? 'Session is already revoked.'
                        : isExpired
                          ? 'Expired sessions no longer need revocation.'
                          : 'Revoke this active session.';

                  return (
                    <tr key={session.id}>
                      <td style={{ ...styles.td, ...styles.statusColumn }}>
                        <div style={styles.statusStack}>
                          <span style={session.revoked ? styles.badgeMuted : isExpired ? styles.badgeWarning : styles.badgeOk}>
                            {session.revoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                          </span>
                          {isCurrent ? <span style={styles.badgeInfo}>CURRENT</span> : null}
                          {session.session_type ? <span style={styles.badgeNeutral}>{formatSessionType(session.session_type)}</span> : null}
                        </div>
                      </td>

                      <td style={{ ...styles.td, ...styles.networkColumn }}>
                        <div style={styles.rowTitle} title={network.detail}>
                          {network.label}
                        </div>
                        {network.detail ? <div style={styles.rowSubtle}>Reported {network.detail}</div> : null}
                        <div style={styles.rowSubtle} title={session.id}>Session {shortenId(session.id)}</div>
                      </td>

                      <td style={styles.tdWide} title={session.user_agent || undefined}>
                        <div style={styles.rowTitle}>{describeDevice(session.user_agent)}</div>
                        <div style={styles.rowSubtle}>Hover for full browser signature</div>
                      </td>
                      <td style={{ ...styles.td, ...styles.dateColumn }}>{formatDateTime(session.created_at)}</td>
                      <td style={{ ...styles.td, ...styles.dateColumn }}>{formatDateTime(session.last_used_at)}</td>
                      <td style={{ ...styles.td, ...styles.dateColumn }}>{formatDateTime(session.expires_at)}</td>

                      <td style={{ ...styles.td, ...styles.actionColumn }}>
                        {supportSession ? (
                          <span style={styles.managedText}>Platform managed</span>
                        ) : (
                          <button
                            type="button"
                            style={revokeDisabled ? styles.disabledButton : styles.secondaryButton}
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

        <div style={styles.pagination}>
          <button
            type="button"
            style={page <= 1 ? styles.disabledButton : styles.secondaryButton}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || sessionsQuery.isFetching}
          >
            Previous
          </button>
          <span style={styles.pageLabel}>Page {page}</span>
          <button
            type="button"
            style={!hasNext ? styles.disabledButton : styles.secondaryButton}
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

const styles: Record<string, CSSProperties> = {
  page: { width: '100%', minWidth: 0 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  headerTextBlock: { minWidth: 0 },
  headerActions: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '28px', fontWeight: 800, color: '#111827' },
  description: { margin: '8px 0 0', color: '#6b7280', lineHeight: 1.6, maxWidth: '760px' },
  statsGrid: { marginBottom: '20px', width: '100%', minWidth: 0 },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    minWidth: 0
  },
  statTitle: { fontSize: '14px', fontWeight: 600, color: '#6b7280', marginBottom: '10px' },
  statValue: { fontSize: '32px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.2 },
  statValueGood: { fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#166534', lineHeight: 1.2 },
  statValueWarn: { fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#92400e', lineHeight: 1.2 },
  statValueDanger: { fontSize: '32px', fontWeight: 700, marginBottom: '8px', color: '#991b1b', lineHeight: 1.2 },
  statSubtitle: { fontSize: '13px', color: '#6b7280', lineHeight: 1.4 },
  messageBox: { marginBottom: '16px' },
  warningBox: {
    marginBottom: '12px',
    border: '1px solid #fde68a',
    background: '#fffbeb',
    color: '#92400e',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '14px',
    lineHeight: 1.5
  },
  infoBox: {
    marginBottom: '12px',
    border: '1px solid #bfdbfe',
    background: '#eff6ff',
    color: '#1e40af',
    borderRadius: '12px',
    padding: '12px 14px',
    fontSize: '14px',
    lineHeight: 1.5
  },
  metaText: { margin: '0 0 16px', color: '#6b7280', fontSize: '13px' },
  statePanel: { padding: '20px', borderRadius: '12px', marginBottom: '16px' },
  stateText: { margin: '8px 0 14px', lineHeight: 1.5 },
  panel: { minWidth: 0, overflow: 'hidden' },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '16px',
    padding: '20px 20px 14px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  panelHeaderText: { minWidth: 0, flex: '1 1 440px' },
  panelTitle: { margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' },
  panelSubtitle: { margin: '6px 0 0', color: '#6b7280', fontSize: '14px', lineHeight: 1.5 },
  filters: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' },
  filterLabel: { display: 'grid', gap: '6px', color: '#374151', fontSize: '12px', fontWeight: 700 },
  select: {
    minWidth: '150px',
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#111827',
    padding: '9px 12px',
    font: 'inherit'
  },
  listMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '0 20px 12px',
    color: '#6b7280',
    fontSize: '12px'
  },
  tableWrapper: { overflowX: 'auto', minWidth: 0 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '1040px' },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#6b7280',
    background: '#f9fafb',
    whiteSpace: 'nowrap'
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    color: '#111827',
    fontSize: '14px'
  },
  tdWide: {
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    color: '#111827',
    fontSize: '14px',
    minWidth: '220px',
    lineHeight: 1.5
  },
  statusColumn: { width: '132px', minWidth: '132px' },
  networkColumn: { width: '190px', minWidth: '190px' },
  dateColumn: { width: '150px', minWidth: '150px' },
  actionColumn: { width: '112px', minWidth: '112px' },
  rowTitle: { fontWeight: 700, color: '#111827' },
  rowSubtle: { marginTop: '5px', color: '#6b7280', fontSize: '12px', lineHeight: 1.4 },
  statusStack: { display: 'flex', flexDirection: 'column', gap: '7px', alignItems: 'flex-start' },
  badgeOk: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    background: '#dcfce7',
    color: '#166534',
    whiteSpace: 'nowrap'
  },
  badgeWarning: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    background: '#fef3c7',
    color: '#92400e',
    whiteSpace: 'nowrap'
  },
  badgeMuted: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    background: '#e5e7eb',
    color: '#374151',
    whiteSpace: 'nowrap'
  },
  badgeInfo: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    background: '#dbeafe',
    color: '#1d4ed8',
    whiteSpace: 'nowrap'
  },
  badgeNeutral: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    background: '#f3f4f6',
    color: '#374151',
    whiteSpace: 'nowrap'
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#111827',
    borderRadius: '10px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    minWidth: '88px'
  },
  disabledButton: {
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    color: '#9ca3af',
    borderRadius: '10px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'not-allowed',
    whiteSpace: 'nowrap',
    minWidth: '88px'
  },
  dangerButton: {
    border: 'none',
    background: '#b91c1c',
    color: '#ffffff',
    borderRadius: '10px',
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  disabledDangerButton: {
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    color: '#9ca3af',
    borderRadius: '10px',
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'not-allowed',
    whiteSpace: 'nowrap'
  },
  managedText: { color: '#6b7280', fontSize: '12px', fontWeight: 700 },
  emptyCell: { padding: '32px 16px', textAlign: 'center', color: '#6b7280' },
  pagination: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px 20px',
    borderTop: '1px solid #f1f5f9'
  },
  pageLabel: { minWidth: '72px', textAlign: 'center', color: '#4b5563', fontSize: '13px', fontWeight: 700 }
};
