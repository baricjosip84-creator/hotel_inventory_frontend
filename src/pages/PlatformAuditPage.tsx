import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';

type PlatformAuditRow = {
  id: string;
  platform_user_id: string | null;
  platform_user_email: string | null;
  platform_user_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
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

function metadataPreview(metadata: Record<string, unknown> | null): string {
  if (!metadata || !Object.keys(metadata).length) return '-';

  try {
    return JSON.stringify(metadata);
  } catch {
    return '[unreadable metadata]';
  }
}

export default function PlatformAuditPage() {
  const [limit, setLimit] = useState('100');
  const [action, setAction] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [platformUserId, setPlatformUserId] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', limit || '100');
    if (action.trim()) params.set('action', action.trim());
    if (tenantId.trim()) params.set('tenant_id', tenantId.trim());
    if (platformUserId.trim()) params.set('platform_user_id', platformUserId.trim());
    return params.toString();
  }, [action, limit, platformUserId, tenantId]);

  const auditQuery = useQuery({
    queryKey: ['platform', 'audit', queryString],
    queryFn: () => platformApiRequest<PlatformAuditRow[]>(`/platform/audit?${queryString}`)
  });

  const rows = auditQuery.data || [];

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Platform Audit</h1>
        <p style={styles.subtitle}>Superadmin and platform-support actions across the SaaS control plane.</p>
      </header>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.filters}>
          <label style={styles.label}>
            Limit
            <input
              type="number"
              min="1"
              max="500"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Action
            <input
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="tenant.lock"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Tenant ID
            <input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="UUID"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            Platform User ID
            <input
              value={platformUserId}
              onChange={(event) => setPlatformUserId(event.target.value)}
              placeholder="UUID"
              style={styles.input}
            />
          </label>
        </div>
      </section>

      {auditQuery.isLoading ? <div style={styles.panel}>Loading platform audit…</div> : null}
      {auditQuery.error ? <div style={styles.error}>{readableError(auditQuery.error)}</div> : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Audit Events</h2>
        {rows.length ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Action</th>
                <th style={styles.th}>Actor</th>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>Target</th>
                <th style={styles.th}>IP</th>
                <th style={styles.th}>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{formatDateTime(row.created_at)}</td>
                  <td style={styles.tdMono}>{row.action}</td>
                  <td style={styles.td}>
                    {row.platform_user_name || row.platform_user_email || row.platform_user_id || '-'}
                    {row.platform_user_email && row.platform_user_name ? <div style={styles.muted}>{row.platform_user_email}</div> : null}
                  </td>
                  <td style={styles.td}>
                    {row.tenant_name || row.tenant_id || '-'}
                    {row.tenant_name && row.tenant_id ? <div style={styles.muted}>{row.tenant_id}</div> : null}
                  </td>
                  <td style={styles.td}>
                    {row.target_type || '-'}
                    {row.target_id ? <div style={styles.muted}>{row.target_id}</div> : null}
                  </td>
                  <td style={styles.td}>{row.ip_address || '-'}</td>
                  <td style={styles.tdMonoSmall}>{metadataPreview(row.metadata)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !auditQuery.isLoading ? <div>No platform audit events found.</div> : null}
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
  filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#374151' },
  input: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px', fontSize: '14px' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px', color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', verticalAlign: 'top' },
  tdMono: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', fontFamily: 'monospace', verticalAlign: 'top', whiteSpace: 'nowrap' },
  tdMonoSmall: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', fontFamily: 'monospace', fontSize: '12px', verticalAlign: 'top', maxWidth: '320px', wordBreak: 'break-word' },
  muted: { color: '#6b7280', fontSize: '12px', marginTop: '4px', wordBreak: 'break-all' }
};
