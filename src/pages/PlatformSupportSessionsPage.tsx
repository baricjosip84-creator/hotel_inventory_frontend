import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';

 type PlatformSupportSession = {
  id: string;
  platform_user_id: string;
  platform_user_email?: string | null;
  platform_user_name?: string | null;
  tenant_id: string;
  tenant_name?: string | null;
  reason: string;
  status: 'active' | 'ended' | 'expired';
  started_at: string;
  expires_at: string;
  ended_at?: string | null;
};

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Unknown error';
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleString();
}

export default function PlatformSupportSessionsPage() {
  const queryClient = useQueryClient();
  const [tenantId, setTenantId] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('active');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (status) params.set('status', status);
    return params.toString();
  }, [status]);

  const sessionsQuery = useQuery({
    queryKey: ['platform', 'support-sessions', queryString],
    queryFn: () => platformApiRequest<PlatformSupportSession[]>(`/platform/support-sessions?${queryString}`)
  });

  const startMutation = useMutation({
    mutationFn: () =>
      platformApiRequest<PlatformSupportSession>('/platform/support-sessions', {
        method: 'POST',
        body: JSON.stringify({ tenant_id: tenantId.trim(), reason: reason.trim() })
      }),
    onSuccess: () => {
      setTenantId('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['platform', 'support-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'audit'] });
    }
  });

  const endMutation = useMutation({
    mutationFn: (sessionId: string) =>
      platformApiRequest<PlatformSupportSession>(`/platform/support-sessions/${sessionId}/end`, {
        method: 'POST'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'support-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'audit'] });
    }
  });

  const rows = sessionsQuery.data || [];

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Support Sessions</h1>
        <p style={styles.subtitle}>Audited platform support context for tenant troubleshooting. This does not impersonate a tenant user yet.</p>
      </header>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Start support session</h2>
        <div style={styles.formGrid}>
          <label style={styles.label}>
            Tenant ID
            <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} placeholder="Tenant UUID" style={styles.input} />
          </label>
          <label style={styles.label}>
            Reason
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why support access is needed" style={styles.input} />
          </label>
          <button type="button" style={styles.button} onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
            {startMutation.isPending ? 'Starting…' : 'Start'}
          </button>
        </div>
        {startMutation.error ? <div style={styles.error}>{readableError(startMutation.error)}</div> : null}
      </section>

      <section style={styles.panel}>
        <div style={styles.headerRow}>
          <h2 style={styles.sectionTitle}>Sessions</h2>
          <label style={styles.labelInline}>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={styles.select}>
              <option value="active">Active</option>
              <option value="ended">Ended</option>
              <option value="expired">Expired</option>
              <option value="">All</option>
            </select>
          </label>
        </div>

        {sessionsQuery.isLoading ? <div>Loading support sessions…</div> : null}
        {sessionsQuery.error ? <div style={styles.error}>{readableError(sessionsQuery.error)}</div> : null}
        {endMutation.error ? <div style={styles.error}>{readableError(endMutation.error)}</div> : null}

        {rows.length ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>Platform user</th>
                <th style={styles.th}>Reason</th>
                <th style={styles.th}>Started</th>
                <th style={styles.th}>Expires</th>
                <th style={styles.th}>Ended</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.status}</td>
                  <td style={styles.td}>{row.tenant_name || row.tenant_id}<div style={styles.muted}>{row.tenant_id}</div></td>
                  <td style={styles.td}>{row.platform_user_name || row.platform_user_email || row.platform_user_id}</td>
                  <td style={styles.td}>{row.reason}</td>
                  <td style={styles.td}>{formatDateTime(row.started_at)}</td>
                  <td style={styles.td}>{formatDateTime(row.expires_at)}</td>
                  <td style={styles.td}>{formatDateTime(row.ended_at)}</td>
                  <td style={styles.td}>
                    {row.status === 'active' ? (
                      <button type="button" style={styles.buttonSmall} onClick={() => endMutation.mutate(row.id)} disabled={endMutation.isPending}>
                        End
                      </button>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !sessionsQuery.isLoading ? <div>No support sessions found.</div> : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '20px' },
  title: { margin: 0, fontSize: '30px' },
  subtitle: { margin: '8px 0 0', color: '#6b7280' },
  panel: { background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 12px 36px rgba(15,23,42,0.08)', overflowX: 'auto' },
  sectionTitle: { margin: '0 0 14px', fontSize: '20px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(280px, 2fr) auto', gap: '12px', alignItems: 'end' },
  headerRow: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#374151' },
  labelInline: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#374151' },
  input: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px', fontSize: '14px' },
  select: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px', fontSize: '14px' },
  button: { border: 0, borderRadius: '10px', padding: '11px 16px', cursor: 'pointer', background: '#111827', color: '#fff', fontWeight: 700 },
  buttonSmall: { border: 0, borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', background: '#111827', color: '#fff', fontWeight: 700 },
  error: { marginTop: '12px', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px', color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', verticalAlign: 'top' },
  muted: { color: '#6b7280', fontSize: '12px', marginTop: '4px', wordBreak: 'break-all' }
};
