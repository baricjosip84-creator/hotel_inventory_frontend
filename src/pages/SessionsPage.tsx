import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
import { getRefreshToken, clearAuthTokens } from '../lib/auth';
import { useNavigate } from 'react-router-dom';

type SessionItem = {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  last_used_at?: string | null;
  expires_at: string;
  revoked: boolean;
};

async function fetchSessions(): Promise<SessionItem[]> {
  return apiRequest<SessionItem[]>('/auth/sessions');
}

async function revokeSession(sessionId: string): Promise<{ success: true }> {
  return apiRequest<{ success: true }>(`/auth/sessions/${sessionId}`, {
    method: 'DELETE'
  });
}

async function revokeAllSessions(): Promise<{ success: true }> {
  return apiRequest<{ success: true }>('/auth/sessions', {
    method: 'DELETE'
  });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatUserAgent(value: string | null | undefined): string {
  if (!value || !value.trim()) {
    return 'Unknown device';
  }

  return value;
}

function formatIp(value: string | null | undefined): string {
  if (!value || !value.trim()) {
    return 'Unknown IP';
  }

  return value;
}

function isProbablyCurrentDevice(session: SessionItem): boolean {
  const refreshToken = getRefreshToken();

  /*
    There is no session-id marker stored client-side yet, so we cannot know the
    exact current session. We use a cautious heuristic for display only:
    non-revoked session with the most recent activity is probably the current one.
  */
  if (!refreshToken) {
    return false;
  }

  return !session.revoked;
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
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in your actual current SessionsPage.

    The real session flows are intentionally unchanged:
    - list account sessions
    - revoke one session
    - revoke all sessions
    - clear local auth state after revoke-all

    This pass is UI-only:
    - added width guards across the page and panel containers
    - improved wrapping for long device/user-agent values
    - improved table resilience on medium-width screens
    - aligned spacing and header behavior with the recently polished pages

    WHY IT CHANGED
    --------------
    Sessions is a real account-security surface and should match the visual
    consistency of the rest of the polished admin/system pages.

    WHAT PROBLEM IT SOLVES
    ----------------------
    Improves readability and responsiveness without changing:
    - backend contract
    - session revoke behavior
    - query keys
    - current-session heuristic
    - auth/logout flow
  */
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: fetchSessions
  });

  const revokeOneMutation = useMutation({
    mutationFn: revokeSession,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('Session revoked.');
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to revoke session.');
      }
      setPageMessage(null);
    }
  });

  const revokeAllMutation = useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('All sessions revoked. You will be returned to login.');
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });

      /*
        Once every backend session is revoked, the local device should also be
        logged out so the UI state stays aligned with the backend.
      */
      clearAuthTokens();
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to revoke all sessions.');
      }
      setPageMessage(null);
    }
  });

  const sessions = useMemo(() => {
    const rows = sessionsQuery.data ?? [];

    return [...rows].sort((a, b) => {
      const aValue = new Date(a.last_used_at || a.created_at).getTime();
      const bValue = new Date(b.last_used_at || b.created_at).getTime();
      return bValue - aValue;
    });
  }, [sessionsQuery.data]);

  const summary = useMemo(() => {
    const total = sessions.length;
    const active = sessions.filter((session) => !session.revoked).length;
    const revoked = sessions.filter((session) => session.revoked).length;
    const expired = sessions.filter((session) => new Date(session.expires_at).getTime() <= Date.now()).length;

    return {
      total,
      active,
      revoked,
      expired
    };
  }, [sessions]);

  const handleRevokeOne = (sessionId: string) => {
    setPageError(null);
    setPageMessage(null);
    revokeOneMutation.mutate(sessionId);
  };

  const handleRevokeAll = () => {
    const confirmed = window.confirm(
      'This will revoke every session for your account, including this device. Continue?'
    );

    if (!confirmed) {
      return;
    }

    setPageError(null);
    setPageMessage(null);
    revokeAllMutation.mutate();
  };

  if (sessionsQuery.isLoading) {
    return <p>Loading sessions...</p>;
  }

  if (sessionsQuery.isError) {
    return (
      <p>
        Failed to load sessions: {(sessionsQuery.error as Error).message || 'Unknown error'}
      </p>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTextBlock}>
          <h2 style={styles.title}>Sessions</h2>
          <p style={styles.description}>
            Review active and revoked sessions for your account and remotely revoke stale access.
          </p>
        </div>

        <button
          type="button"
          style={styles.dangerButton}
          onClick={handleRevokeAll}
          disabled={revokeAllMutation.isPending}
        >
          {revokeAllMutation.isPending ? 'Revoking...' : 'Revoke All Sessions'}
        </button>
      </div>

      {pageError ? <div style={styles.errorBox}>{pageError}</div> : null}
      {pageMessage ? <div style={styles.successBox}>{pageMessage}</div> : null}

      <div style={styles.statsGrid}>
        <StatCard title="Total Sessions" value={summary.total} subtitle="All visible sessions for this account" />
        <StatCard
          title="Active Sessions"
          value={summary.active}
          subtitle="Not revoked on the backend"
          tone={summary.active > 0 ? 'good' : 'warn'}
        />
        <StatCard
          title="Revoked Sessions"
          value={summary.revoked}
          subtitle="No longer usable for refresh"
        />
        <StatCard
          title="Expired Sessions"
          value={summary.expired}
          subtitle="Past their backend expiry time"
          tone={summary.expired > 0 ? 'warn' : 'good'}
        />
      </div>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <div style={styles.panelHeaderText}>
            <h3 style={styles.panelTitle}>Session Inventory</h3>
            <p style={styles.panelSubtitle}>
              Sessions are ordered by last activity so likely-current sessions appear first.
            </p>
          </div>
        </div>

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Network</th>
                <th style={styles.th}>Device</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Last Used</th>
                <th style={styles.th}>Expires</th>
                <th style={styles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td style={styles.emptyCell} colSpan={7}>
                    No sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((session, index) => {
                  const isExpired = new Date(session.expires_at).getTime() <= Date.now();
                  const isCurrentHint = index === 0 && isProbablyCurrentDevice(session);

                  return (
                    <tr key={session.id}>
                      <td style={styles.td}>
                        <div style={styles.statusStack}>
                          <span
                            style={
                              session.revoked
                                ? styles.badgeMuted
                                : isExpired
                                  ? styles.badgeWarning
                                  : styles.badgeOk
                            }
                          >
                            {session.revoked ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                          </span>

                          {isCurrentHint ? <span style={styles.badgeInfo}>Likely current</span> : null}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{formatIp(session.ip_address)}</div>
                        <div style={styles.rowSubtle}>Session ID: {session.id}</div>
                      </td>
                      <td style={styles.tdWide}>{formatUserAgent(session.user_agent)}</td>
                      <td style={styles.td}>{formatDateTime(session.created_at)}</td>
                      <td style={styles.td}>{formatDateTime(session.last_used_at)}</td>
                      <td style={styles.td}>{formatDateTime(session.expires_at)}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={session.revoked ? styles.disabledButton : styles.secondaryButton}
                          onClick={() => handleRevokeOne(session.id)}
                          disabled={session.revoked || revokeOneMutation.isPending}
                        >
                          {revokeOneMutation.isPending ? 'Working...' : 'Revoke'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    /*
      What changed:
      - Added width guards to the page root.

      Why:
      - This page sits inside the shared layout container and renders a wide session table.

      What problem this solves:
      - Prevents unnecessary overflow pressure and keeps the page stable on narrower widths.
    */
    width: '100%',
    minWidth: 0
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    marginBottom: '20px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  headerTextBlock: {
    minWidth: 0
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 800,
    color: '#111827',
    wordBreak: 'break-word'
  },
  description: {
    margin: '8px 0 0',
    color: '#6b7280',
    lineHeight: 1.6,
    maxWidth: '760px',
    wordBreak: 'break-word'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
    width: '100%',
    minWidth: 0
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    minWidth: 0
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statValueGood: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#166534',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statValueWarn: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#92400e',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statValueDanger: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#991b1b',
    lineHeight: 1.2,
    wordBreak: 'break-word'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 3px 14px rgba(15, 23, 42, 0.04)',
    overflow: 'hidden',
    minWidth: 0
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '20px 20px 14px',
    flexWrap: 'wrap',
    minWidth: 0
  },
  panelHeaderText: {
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
    wordBreak: 'break-word'
  },
  panelSubtitle: {
    margin: '6px 0 0',
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  tableWrapper: {
    overflowX: 'auto',
    minWidth: 0
  },
  table: {
    /*
      What changed:
      - Slightly reduced the forced minimum width.

      Why:
      - This table is legitimately wide, but the earlier width threshold was more aggressive than necessary.

      What problem this solves:
      - Eases horizontal scrolling pressure on medium-width screens without changing the actual columns.
    */
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1020px'
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: '#6b7280',
    background: '#f9fafb'
  },
  td: {
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    color: '#111827',
    fontSize: '14px',
    wordBreak: 'break-word'
  },
  tdWide: {
    /*
      What changed:
      - Preserved the dedicated device column width, but improved wrapping behavior.

      Why:
      - User-agent strings are often the longest content on this page.

      What problem this solves:
      - Keeps long device strings readable without forcing more width than necessary.
    */
    padding: '16px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    color: '#111827',
    fontSize: '14px',
    minWidth: '280px',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  rowTitle: {
    fontWeight: 700,
    color: '#111827',
    wordBreak: 'break-word'
  },
  rowSubtle: {
    marginTop: '4px',
    color: '#6b7280',
    fontSize: '12px',
    wordBreak: 'break-all'
  },
  statusStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-start'
  },
  badgeOk: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    background: '#dcfce7',
    color: '#166534'
  },
  badgeWarning: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    background: '#fef3c7',
    color: '#92400e'
  },
  badgeMuted: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    background: '#e5e7eb',
    color: '#374151'
  },
  badgeInfo: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: '999px',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 700,
    background: '#dbeafe',
    color: '#1d4ed8'
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#111827',
    borderRadius: '10px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  disabledButton: {
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    color: '#9ca3af',
    borderRadius: '10px',
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'not-allowed'
  },
  dangerButton: {
    border: 'none',
    background: '#b91c1c',
    color: '#ffffff',
    borderRadius: '10px',
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'pointer'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  errorBox: {
    marginBottom: '16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '12px',
    padding: '12px 14px'
  },
  successBox: {
    marginBottom: '16px',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    borderRadius: '12px',
    padding: '12px 14px'
  }
};