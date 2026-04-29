import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';

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

function readableError(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
}

export default function PlatformSystemHealthPage() {
  const systemHealthQuery = useQuery({
    queryKey: ['platform', 'system-health'],
    queryFn: () => platformApiRequest<SystemHealthResponse>('/platform/system-health')
  });

  const rows = systemHealthQuery.data?.tenants || [];

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>System Health</h1>
        <p style={styles.subtitle}>Global platform health across tenants.</p>
      </header>

      {systemHealthQuery.isLoading ? <div style={styles.panel}>Loading system health…</div> : null}
      {systemHealthQuery.error ? <div style={styles.error}>{readableError(systemHealthQuery.error)}</div> : null}

      <section style={styles.panel}>
        <div style={styles.generatedAt}>
          Generated: {systemHealthQuery.data?.generated_at || '-'}
        </div>
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
                <td style={styles.td}>
                  {row.issues.length ? row.issues.map((issue) => issue.type).join(', ') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  title: {
    margin: 0,
    fontSize: '30px'
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#6b7280'
  },
  panel: {
    background: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 12px 36px rgba(15,23,42,0.08)',
    overflowX: 'auto'
  },
  generatedAt: {
    color: '#6b7280',
    marginBottom: '14px'
  },
  error: {
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '12px',
    padding: '12px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    borderBottom: '1px solid #e5e7eb',
    padding: '10px',
    color: '#6b7280',
    fontSize: '13px'
  },
  td: {
    borderBottom: '1px solid #f3f4f6',
    padding: '12px 10px'
  }
};
