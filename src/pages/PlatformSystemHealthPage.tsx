import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';

type TenantHealthRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  issue_count: number;
  issues: Array<{ type: string; message: string }>;
};

type SystemHealthResponse = {
  generated_at: string;
  tenants: TenantHealthRow[];
};

type IdempotencyRow = {
  id: string;
  idempotency_key: string;
  method: string;
  path: string;
  created_at: string;
  expires_at?: string | null;
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

export default function PlatformSystemHealthPage() {
  const canViewPlatformDiagnostics = hasPlatformPermission(PLATFORM_PERMISSIONS.DIAGNOSTICS_READ);

  const systemHealthQuery = useQuery({
    queryKey: ['platform', 'system-health'],
    queryFn: () => platformApiRequest<SystemHealthResponse>('/platform/system-health')
  });

  const diagnosticsQuery = useQuery({
    queryKey: ['platform', 'diagnostics', 'stuck-idempotency'],
    queryFn: () => platformApiRequest<IdempotencyRow[]>('/platform/diagnostics/stuck-idempotency'),
    enabled: canViewPlatformDiagnostics
  });

  const rows = systemHealthQuery.data?.tenants || [];
  const stuckIdempotencyRows = diagnosticsQuery.data || [];

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>System Health</h1>
        <p style={styles.subtitle}>Global platform health and diagnostics across tenants.</p>
      </header>

      {systemHealthQuery.isLoading ? <div style={styles.panel}>Loading system health…</div> : null}
      {systemHealthQuery.error ? <div style={styles.error}>{readableError(systemHealthQuery.error)}</div> : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Tenant Health</h2>
        <div style={styles.generatedAt}>Generated: {systemHealthQuery.data?.generated_at || '-'}</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tenant</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Issues</th>
              <th style={styles.th}>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tenant_id}>
                <td style={styles.td}>{row.tenant_name}</td>
                <td style={styles.td}>{row.status}</td>
                <td style={styles.td}>{row.issue_count}</td>
                <td style={styles.td}>{row.issues.length ? row.issues.map((issue) => issue.type).join(', ') : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Platform Diagnostics</h2>
        <p style={styles.sectionSubtitle}>Global diagnostics that should not be exposed inside tenant admin routes.</p>

        {!canViewPlatformDiagnostics ? <div style={styles.error}>Your platform role cannot read platform diagnostics.</div> : null}
        {canViewPlatformDiagnostics && diagnosticsQuery.isLoading ? <div>Loading diagnostics…</div> : null}
        {canViewPlatformDiagnostics && diagnosticsQuery.error ? <div style={styles.error}>{readableError(diagnosticsQuery.error)}</div> : null}

        <h3 style={styles.smallTitle}>Stuck Idempotency Keys</h3>
        {canViewPlatformDiagnostics && stuckIdempotencyRows.length ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Method</th>
                <th style={styles.th}>Path</th>
                <th style={styles.th}>Key</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Expires</th>
              </tr>
            </thead>
            <tbody>
              {stuckIdempotencyRows.map((row) => (
                <tr key={row.id}>
                  <td style={styles.td}>{row.method}</td>
                  <td style={styles.td}>{row.path}</td>
                  <td style={styles.tdMono}>{row.idempotency_key}</td>
                  <td style={styles.td}>{formatDateTime(row.created_at)}</td>
                  <td style={styles.td}>{formatDateTime(row.expires_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : canViewPlatformDiagnostics && !diagnosticsQuery.isLoading ? <div>No stuck idempotency keys.</div> : null}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '20px' },
  title: { margin: 0, fontSize: '30px' },
  subtitle: { margin: '8px 0 0', color: '#6b7280' },
  panel: { background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 12px 36px rgba(15,23,42,0.08)', overflowX: 'auto' },
  sectionTitle: { margin: '0 0 6px', fontSize: '20px' },
  sectionSubtitle: { margin: '0 0 18px', color: '#6b7280' },
  smallTitle: { margin: '16px 0 10px', fontSize: '16px' },
  generatedAt: { color: '#6b7280', marginBottom: '14px' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px', color: '#6b7280', fontSize: '13px' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px' },
  tdMono: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', fontFamily: 'monospace', wordBreak: 'break-all' }
};
