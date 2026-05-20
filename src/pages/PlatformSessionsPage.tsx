import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';

type Session = {
  id: string;
  platform_user_email: string;
  platform_user_name: string | null;
  platform_user_role: string;
  revoked: boolean;
  is_active: boolean;
  is_current: boolean;
  expires_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  last_used_at?: string | null;
  created_at: string;
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown error';
}

function statusLabel(session: Session): string {
  if (session.revoked) return 'Revoked';
  if (!session.is_active) return 'Expired';
  return session.is_current ? 'Current session' : 'Active';
}

export default function PlatformSessionsPage() {
  const qc = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const sessionsQuery = useQuery({
    queryKey: ['platform', 'sessions', { activeOnly }],
    queryFn: () => platformApiRequest<Session[]>(`/platform/sessions?limit=300${activeOnly ? '&active_only=true' : ''}`)
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/sessions/${id}/revoke`, { method: 'POST' }),
    onMutate: () => setActionError(null),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['platform', 'sessions'] });
    },
    onError: (error) => {
      setActionError(readableError(error));
    }
  });

  const summary = useMemo(() => {
    const rows = sessionsQuery.data || [];
    return {
      total: rows.length,
      active: rows.filter((row) => row.is_active).length,
      revoked: rows.filter((row) => row.revoked).length,
      current: rows.find((row) => row.is_current) || null
    };
  }, [sessionsQuery.data]);

  return (
    <div style={styles.page}>
      <div>
        <h1 style={styles.title}>Platform sessions</h1>
        <p style={styles.muted}>
          Review active platform staff sessions, identify the current browser session, and revoke stale or suspicious access.
        </p>
      </div>

      <section style={styles.statGrid}>
        <div style={styles.statCard}><span style={styles.muted}>Rows</span><strong>{summary.total}</strong></div>
        <div style={styles.statCard}><span style={styles.muted}>Active</span><strong>{summary.active}</strong></div>
        <div style={styles.statCard}><span style={styles.muted}>Revoked</span><strong>{summary.revoked}</strong></div>
        <div style={styles.statCard}><span style={styles.muted}>Current session</span><strong>{summary.current ? 'Visible' : 'Not listed'}</strong></div>
      </section>

      <section style={styles.panel}>
        <div style={styles.toolbar}>
          <label style={styles.checkboxLabel}>
            <input checked={activeOnly} type="checkbox" onChange={(event) => setActiveOnly(event.target.checked)} />
            Active sessions only
          </label>
          <button style={styles.button} type="button" onClick={() => sessionsQuery.refetch()} disabled={sessionsQuery.isFetching}>
            Refresh
          </button>
        </div>

        {actionError ? <div style={styles.error}>{actionError}</div> : null}
        {sessionsQuery.error ? <div style={styles.error}>{readableError(sessionsQuery.error)}</div> : null}
        {sessionsQuery.isLoading ? <div style={styles.empty}>Loading sessions…</div> : null}

        {!sessionsQuery.isLoading && !sessionsQuery.data?.length ? (
          <div style={styles.empty}>No platform sessions found.</div>
        ) : null}

        {sessionsQuery.data?.length ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>User</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>IP</th>
                <th style={styles.th}>Last used</th>
                <th style={styles.th}>Expires</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessionsQuery.data.map((session) => (
                <tr key={session.id}>
                  <td style={styles.td}>
                    <strong>{session.platform_user_name || session.platform_user_email}</strong><br />
                    <span style={styles.muted}>{session.platform_user_email}</span>
                  </td>
                  <td style={styles.td}>{session.platform_user_role}</td>
                  <td style={styles.td}>
                    <span style={session.is_current ? styles.currentBadge : session.is_active ? styles.activeBadge : styles.mutedBadge}>
                      {statusLabel(session)}
                    </span>
                  </td>
                  <td style={styles.td}>{session.ip_address || '-'}</td>
                  <td style={styles.td}>{formatDateTime(session.last_used_at || session.created_at)}</td>
                  <td style={styles.td}>{formatDateTime(session.expires_at)}</td>
                  <td style={styles.td}>
                    {session.is_active ? (
                      <button
                        style={session.is_current ? styles.dangerButton : styles.button}
                        type="button"
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate(session.id)}
                        title={session.is_current ? 'Revoking this session will force this browser back to platform login on the next request.' : undefined}
                      >
                        {session.is_current ? 'Revoke current' : 'Revoke'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  title: { margin: 0 },
  muted: { color: '#6b7280' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  statCard: { background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 12px 36px rgba(15,23,42,.08)', display: 'grid', gap: 6 },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)', overflowX: 'auto' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14 },
  checkboxLabel: { display: 'inline-flex', alignItems: 'center', gap: 8 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' },
  td: { padding: 10, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' },
  button: { padding: '8px 10px', borderRadius: 10, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' },
  dangerButton: { padding: '8px 10px', borderRadius: 10, border: '1px solid #fecaca', cursor: 'pointer', background: '#fef2f2', color: '#991b1b' },
  activeBadge: { display: 'inline-block', borderRadius: 999, padding: '4px 8px', background: '#ecfdf5', color: '#047857', fontSize: 12 },
  currentBadge: { display: 'inline-block', borderRadius: 999, padding: '4px 8px', background: '#eef2ff', color: '#3730a3', fontSize: 12 },
  mutedBadge: { display: 'inline-block', borderRadius: 999, padding: '4px 8px', background: '#f3f4f6', color: '#4b5563', fontSize: 12 },
  empty: { padding: 16, borderRadius: 12, background: '#f9fafb', color: '#6b7280' },
  error: { padding: 12, borderRadius: 12, background: '#fef2f2', color: '#991b1b', marginBottom: 12 }
};
