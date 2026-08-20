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
  page: { display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, color: '#0f172a' },
  title: { margin: 0, fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  muted: { color: '#64748b', lineHeight: 1.5 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 },
  statCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', display: 'grid', gap: 6 },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', overflowX: 'auto', minWidth: 0 },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  checkboxLabel: { display: 'inline-flex', alignItems: 'center', gap: 8, color: '#334155', fontWeight: 700 },
  table: { width: '100%', borderCollapse: 'collapse', color: '#334155' },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' },
  td: { padding: '12px 8px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  button: { padding: '8px 11px', borderRadius: 9, border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff', color: '#0f172a', fontWeight: 700 },
  dangerButton: { padding: '8px 11px', borderRadius: 9, border: '1px solid #fecaca', cursor: 'pointer', background: '#fff', color: '#b91c1c', fontWeight: 700 },
  activeBadge: { display: 'inline-block', borderRadius: 999, padding: '4px 9px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', fontSize: 12, fontWeight: 700 },
  currentBadge: { display: 'inline-block', borderRadius: 999, padding: '4px 9px', background: 'var(--io-primary-soft-strong)', color: 'var(--io-primary-dark)', border: '1px solid var(--io-primary-border)', fontSize: 12, fontWeight: 700 },
  mutedBadge: { display: 'inline-block', borderRadius: 999, padding: '4px 9px', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 },
  empty: { padding: 16, borderRadius: 12, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b' },
  error: { padding: 12, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: 12 }
};
