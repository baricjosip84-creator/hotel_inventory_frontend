import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
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

function formatIssueTypes(issues: TenantHealthRow['issues']): string {
  return issues.length ? issues.map((issue) => issue.type).join(', ') : '-';
}

function issueInvestigationLinks(row: TenantHealthRow) {
  const issueTypes = new Set(row.issues.map((issue) => issue.type));
  const params = `tenant_id=${encodeURIComponent(row.tenant_id)}`;
  const links = [
    { label: 'Tenant health', to: `/platform/tenant-health?${params}` },
    { label: 'Support cockpit', to: `/platform/support-operations-cockpit?${params}` },
    { label: 'Audit evidence', to: `/platform/audit?tenant_id=${encodeURIComponent(row.tenant_id)}&entity_type=system_health` }
  ];

  if (issueTypes.has('BLOCKING_ALERTS') || [...issueTypes].some((type) => type.endsWith('BLOCKING'))) {
    links.unshift({ label: 'Alerts', to: `/alerts?${params}` });
  }
  if (issueTypes.has('NEGATIVE_STOCK')) {
    links.unshift({ label: 'Stock', to: `/stock?${params}` });
  }
  if (issueTypes.has('FINALIZED_SHIPMENT_INCOMPLETE')) {
    links.unshift({ label: 'Shipments', to: `/shipments?${params}` });
  }

  return links;
}

export default function PlatformSystemHealthPage() {
  const [searchParams] = useSearchParams();
  const selectedTenantId = searchParams.get('tenant_id') || '';
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

  const allRows = systemHealthQuery.data?.tenants || [];
  const rows = selectedTenantId ? allRows.filter((row) => row.tenant_id === selectedTenantId) : allRows;
  const stuckIdempotencyRows = diagnosticsQuery.data || [];
  const degradedRows = rows.filter((row) => row.status !== 'healthy');
  const totalIssues = rows.reduce((sum, row) => sum + row.issue_count, 0);
  const lastGeneratedAt = systemHealthQuery.data?.generated_at || null;

  async function refreshAll() {
    await Promise.all([
      systemHealthQuery.refetch(),
      canViewPlatformDiagnostics ? diagnosticsQuery.refetch() : Promise.resolve()
    ]);
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>System Health</h1>
          <p style={styles.subtitle}>Global platform health and diagnostics across tenants.</p>
        </div>
        <button type="button" style={styles.secondaryButton} onClick={refreshAll} disabled={systemHealthQuery.isFetching || diagnosticsQuery.isFetching}>
          {systemHealthQuery.isFetching || diagnosticsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <section style={styles.metaPanel}>
        <div><strong>Snapshot source:</strong> GET /platform/system-health</div>
        <div><strong>Diagnostics source:</strong> GET /platform/diagnostics/stuck-idempotency</div>
        <div><strong>Generated:</strong> {formatDateTime(lastGeneratedAt)}</div>
        <div><strong>Tenant filter:</strong> {selectedTenantId || 'All tenants'}</div>
        <div><strong>Displayed tenants:</strong> {rows.length}</div>
        <div><strong>Degraded tenants:</strong> {degradedRows.length}</div>
        <div><strong>Total issues:</strong> {totalIssues}</div>
      </section>

      <nav style={styles.supportLinks} aria-label="Supporting platform pages">
        <Link style={styles.supportLink} to="/platform/tenant-health">Tenant Health</Link>
        <Link style={styles.supportLink} to="/platform/incidents">Incidents</Link>
        <Link style={styles.supportLink} to="/platform/support-operations-cockpit">Support Cockpit</Link>
        <Link style={styles.supportLink} to="/platform/audit">Audit</Link>
      </nav>

      {systemHealthQuery.isLoading ? <div style={styles.panel}>Loading system health…</div> : null}
      {systemHealthQuery.error ? (
        <div style={styles.errorPanel}>
          <strong>System health failed to load.</strong>
          <span>{readableError(systemHealthQuery.error)}</span>
          <button type="button" style={styles.retryButton} onClick={() => systemHealthQuery.refetch()}>Retry system health</button>
        </div>
      ) : null}

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Tenant Health</h2>
        <div style={styles.generatedAt}>Generated: {formatDateTime(systemHealthQuery.data?.generated_at)}</div>
        {selectedTenantId ? (
          <div style={styles.filterNotice}>
            Focused by tenant_id from URL. <Link to="/platform/system-health" style={styles.filterLink}>Show all tenants</Link>
          </div>
        ) : null}
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Tenant</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Issues</th>
              <th style={styles.th}>Details</th>
              <th style={styles.th}>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.tenant_id}>
                <td style={styles.td}>
                  <strong>{row.tenant_name}</strong>
                  <div style={styles.rowMeta}>{row.tenant_id}</div>
                </td>
                <td style={styles.td}><span style={row.status === 'healthy' ? styles.badgeOk : styles.badgeWarn}>{row.status}</span></td>
                <td style={styles.td}>{row.issue_count}</td>
                <td style={styles.td}>
                  <div>{formatIssueTypes(row.issues)}</div>
                  {row.issues.length ? (
                    <ul style={styles.issueList}>
                      {row.issues.map((issue) => (
                        <li key={`${row.tenant_id}-${issue.type}-${issue.message}`}><strong>{issue.type}:</strong> {issue.message}</li>
                      ))}
                    </ul>
                  ) : null}
                </td>
                <td style={styles.td}>
                  <div style={styles.evidenceLinks}>
                    {issueInvestigationLinks(row).map((link) => (
                      <Link key={link.label} to={link.to} style={styles.evidenceLink}>{link.label}</Link>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && !systemHealthQuery.isLoading ? (
              <tr><td style={styles.td} colSpan={5}>No tenant health rows match the current filter.</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Platform Diagnostics</h2>
        <p style={styles.sectionSubtitle}>Global diagnostics that should not be exposed inside tenant admin routes.</p>
        <div style={styles.generatedAt}>Diagnostics permission: {canViewPlatformDiagnostics ? 'DIAGNOSTICS_READ available' : 'DIAGNOSTICS_READ missing'}</div>

        {!canViewPlatformDiagnostics ? <div style={styles.error}>Your platform role cannot read platform diagnostics.</div> : null}
        {canViewPlatformDiagnostics && diagnosticsQuery.isLoading ? <div>Loading diagnostics…</div> : null}
        {canViewPlatformDiagnostics && diagnosticsQuery.error ? (
          <div style={styles.errorPanel}>
            <strong>Diagnostics failed to load.</strong>
            <span>{readableError(diagnosticsQuery.error)}</span>
            <button type="button" style={styles.retryButton} onClick={() => diagnosticsQuery.refetch()}>Retry diagnostics</button>
          </div>
        ) : null}

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
                <th style={styles.th}>Evidence</th>
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
                  <td style={styles.td}>
                    <Link style={styles.evidenceLink} to={`/platform/audit?entity_type=idempotency_key&entity_id=${encodeURIComponent(row.id)}`}>Audit evidence</Link>
                  </td>
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
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' },
  title: { margin: 0, fontSize: '30px' },
  subtitle: { margin: '8px 0 0', color: '#6b7280' },
  panel: { background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 12px 36px rgba(15,23,42,0.08)', overflowX: 'auto' },
  metaPanel: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', color: '#334155' },
  supportLinks: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  supportLink: { background: '#eef2ff', color: '#3730a3', borderRadius: '999px', padding: '8px 12px', fontWeight: 700, textDecoration: 'none' },
  sectionTitle: { margin: '0 0 6px', fontSize: '20px' },
  sectionSubtitle: { margin: '0 0 18px', color: '#6b7280' },
  smallTitle: { margin: '16px 0 10px', fontSize: '16px' },
  generatedAt: { color: '#6b7280', marginBottom: '14px' },
  filterNotice: { background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: '12px', color: '#155e75', padding: '10px', marginBottom: '12px' },
  filterLink: { color: '#0f766e', fontWeight: 700, marginLeft: '8px' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px' },
  errorPanel: { display: 'flex', flexDirection: 'column', gap: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px' },
  retryButton: { alignSelf: 'flex-start', border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: '8px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: '10px', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px', color: '#6b7280', fontSize: '13px' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', verticalAlign: 'top' },
  tdMono: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', fontFamily: 'monospace', wordBreak: 'break-all', verticalAlign: 'top' },
  rowMeta: { marginTop: '4px', color: '#64748b', fontSize: '12px', wordBreak: 'break-all' },
  badgeOk: { display: 'inline-flex', borderRadius: '999px', background: '#dcfce7', color: '#166534', padding: '4px 8px', fontWeight: 700 },
  badgeWarn: { display: 'inline-flex', borderRadius: '999px', background: '#fef3c7', color: '#92400e', padding: '4px 8px', fontWeight: 700 },
  issueList: { margin: '8px 0 0', paddingLeft: '18px', color: '#475569' },
  evidenceLinks: { display: 'flex', flexDirection: 'column', gap: '6px' },
  evidenceLink: { color: '#2563eb', fontWeight: 700, textDecoration: 'none' }
};
