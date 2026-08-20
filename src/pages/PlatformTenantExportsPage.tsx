import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';

type TenantRow = { id: string; name: string; status?: string; billing_status?: string; plan_code?: string };
type ExportTablePreview = { table: string; row_count: number | null; error?: string };
type TenantExportPreview = {
  tenant: TenantRow;
  generated_at: string;
  tables: ExportTablePreview[];
  total_rows: number;
  notes?: string[];
};

type TenantExportArchive = TenantExportPreview & {
  export_version: number;
  mode: 'summary' | 'full';
  max_rows_per_table: number;
  data: Record<string, { rows: unknown[]; exported_rows: number; truncated: boolean }>;
};

function readableError(error: unknown): string {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function formatDateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—';
}

function tableStatusStyle(table: ExportTablePreview): CSSProperties {
  return table.error ? { ...styles.badge, background: '#fee2e2', color: '#991b1b' } : { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function SourceLink({ href, children }: { href: string; children: string }) {
  return <a href={href} style={styles.sourceLink}>{children}</a>;
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlatformTenantExportsPage() {
  const [tenantId, setTenantId] = useState(() => new URLSearchParams(window.location.search).get('tenant_id') || '');
  const [mode, setMode] = useState<'summary' | 'full'>('full');
  const [maxRowsPerTable, setMaxRowsPerTable] = useState(5000);

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants'],
    queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants')
  });

  const selectedTenant = useMemo(
    () => (tenantsQuery.data || []).find((tenant) => tenant.id === tenantId) || null,
    [tenantId, tenantsQuery.data]
  );

  const previewQuery = useQuery({
    queryKey: ['platform', 'tenant-exports', tenantId, 'preview'],
    queryFn: () => platformApiRequest<TenantExportPreview>(`/platform/tenant-exports/${tenantId}/preview`),
    enabled: Boolean(tenantId)
  });

  const exportArchive = useMutation({
    mutationFn: () => platformApiRequest<TenantExportArchive>(`/platform/tenant-exports/${tenantId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ mode, max_rows_per_table: maxRowsPerTable })
    }),
    onSuccess: (payload) => {
      const safeName = (payload.tenant.name || 'tenant').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      downloadJson(`${safeName || 'tenant'}-${payload.mode}-export.json`, payload);
    }
  });

  const isValidRowLimit = Number.isInteger(maxRowsPerTable) && maxRowsPerTable >= 1 && maxRowsPerTable <= 50000;
  const isPreparing = exportArchive.isPending;
  const isRefreshingTenants = tenantsQuery.isFetching && !tenantsQuery.isLoading;
  const isRefreshingPreview = previewQuery.isFetching && !previewQuery.isLoading;
  const tablesWithErrors = (previewQuery.data?.tables || []).filter((table) => table.error).length;
  const readyTables = (previewQuery.data?.tables || []).filter((table) => !table.error).length;
  const exportDisabled = !tenantId || !isValidRowLimit || isPreparing;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Tenant exports</h1>
          <p style={styles.subtitle}>Create audited tenant backup/export packages. This does not restore or mutate tenant data.</p>
          <div style={styles.metaRow}>
            <span style={styles.metaPill}>Source: /platform/tenant-exports</span>
            <span style={styles.metaPill}>Mode: {mode === 'full' ? 'full JSON archive' : 'summary-only evidence'}</span>
            <span style={styles.metaPill}>Row limit: {isValidRowLimit ? maxRowsPerTable.toLocaleString() : 'invalid'}</span>
            {selectedTenant ? <span style={styles.metaPill}>Tenant: {selectedTenant.name}</span> : null}
          </div>
        </div>
        <div style={styles.headerActions}>
          <button type="button" style={styles.primaryButton} onClick={() => { tenantsQuery.refetch(); if (tenantId) previewQuery.refetch(); }} disabled={tenantsQuery.isFetching || previewQuery.isFetching}>
            {isRefreshingTenants || isRefreshingPreview ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {(tenantsQuery.error || previewQuery.error) ? (
        <section style={styles.errorCard}>
          <strong>Unable to load tenant export data.</strong>
          <p style={styles.subtitle}>{readableError(tenantsQuery.error || previewQuery.error)}</p>
          <button type="button" style={styles.primaryButton} onClick={() => { tenantsQuery.refetch(); if (tenantId) previewQuery.refetch(); }} disabled={tenantsQuery.isFetching || previewQuery.isFetching}>Retry</button>
        </section>
      ) : null}

      <section style={styles.panel}>
        <h2>Select tenant</h2>
        <p style={styles.help}>Exports are sensitive tenant packages. Check the preview and keep downloaded JSON files in an approved secure location.</p>
        <div style={styles.formRow}>
          <label style={styles.fieldLabel}>
            Tenant
            <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
              <option value="">Choose tenant…</option>
              {(tenantsQuery.data || []).map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.status || 'unknown'} · {tenant.plan_code || 'no plan'}</option>
              ))}
            </select>
          </label>
          <label style={styles.fieldLabel}>
            Export mode
            <select style={styles.input} value={mode} onChange={(event) => setMode(event.target.value as 'summary' | 'full')}>
              <option value="full">Full JSON archive</option>
              <option value="summary">Summary only</option>
            </select>
          </label>
          <label style={styles.fieldLabel}>
            Max rows per table
            <input
              style={isValidRowLimit ? styles.input : { ...styles.input, borderColor: '#dc2626' }}
              type="number"
              min={1}
              max={50000}
              value={maxRowsPerTable}
              onChange={(event) => setMaxRowsPerTable(Number(event.target.value))}
              aria-label="Max rows per table"
            />
          </label>
          <button
            type="button"
            style={exportDisabled ? styles.disabledButton : styles.button}
            disabled={exportDisabled}
            onClick={() => {
              if (mode === 'full' && !window.confirm('Download a full tenant JSON archive? Treat the file as sensitive tenant data and store it only in an approved secure location.')) {
                return;
              }
              exportArchive.mutate();
            }}
          >
            {isPreparing ? 'Preparing…' : 'Download export'}
          </button>
        </div>
        {!isValidRowLimit ? <div style={styles.error}>Max rows per table must be a whole number from 1 to 50,000.</div> : null}
        {exportArchive.error ? <div style={styles.error}>{readableError(exportArchive.error)}</div> : null}
        {exportArchive.isSuccess ? <div style={styles.success}>Export package generated and downloaded.</div> : null}
      </section>

      <section style={styles.panel}>
        <h2>Supporting Platform pages</h2>
        <div style={styles.linkGrid}>
          <SourceLink href="/platform/tenant-offboarding">Tenant Offboarding</SourceLink>
          <SourceLink href="/platform/compliance-export">Compliance Export</SourceLink>
          <SourceLink href="/platform/legal-compliance-reporting">Legal & Compliance Reporting</SourceLink>
          <SourceLink href="/platform/audit">Audit</SourceLink>
          <SourceLink href="/platform/tenants">Tenants</SourceLink>
        </div>
      </section>

      {selectedTenant ? (
        <section style={styles.panel}>
          <div style={styles.sectionHeader}>
            <div>
              <h2>{selectedTenant.name}</h2>
              <p style={styles.help}>Tenant status: {selectedTenant.status || 'unknown'} · Billing: {selectedTenant.billing_status || 'unknown'} · Plan: {selectedTenant.plan_code || 'no plan'}</p>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={() => previewQuery.refetch()} disabled={previewQuery.isFetching}>{isRefreshingPreview ? 'Refreshing preview…' : 'Refresh preview'}</button>
          </div>
          {previewQuery.isLoading ? <p>Loading export preview…</p> : null}
          {previewQuery.data ? (
            <>
              <div style={styles.grid}>
                <div style={styles.card}><span>Total rows</span><strong>{previewQuery.data.total_rows.toLocaleString()}</strong><small style={styles.help}>Counted by backend preview</small></div>
                <div style={styles.card}><span>Tables</span><strong>{previewQuery.data.tables.length}</strong><small style={styles.help}>{readyTables} ready · {tablesWithErrors} errors</small></div>
                <div style={styles.card}><span>Generated</span><strong>{formatDateTime(previewQuery.data.generated_at)}</strong><small style={styles.help}>Snapshot timestamp</small></div>
              </div>

              <div style={styles.notice}>
                <strong>Export evidence notes</strong>
                {(previewQuery.data.notes || []).length ? (previewQuery.data.notes || []).map((note) => <p key={note}>{note}</p>) : <p>No backend notes returned.</p>}
                <p style={styles.help}>Audit evidence is written by the backend when an archive or summary package is generated.</p>
              </div>

              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Table</th>
                    <th style={styles.th}>Rows</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {previewQuery.data.tables.map((table) => (
                    <tr key={table.table}>
                      <td style={styles.td}>{table.table}</td>
                      <td style={styles.td}>{table.row_count == null ? '—' : table.row_count.toLocaleString()}</td>
                      <td style={styles.td}><span style={tableStatusStyle(table)}>{table.error ? 'Error' : 'Ready'}</span>{table.error ? <div style={styles.errorText}>{table.error}</div> : null}</td>
                      <td style={styles.td}><SourceLink href="/platform/audit">Audit trail</SourceLink></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );

}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' },
  title: { fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a', margin: 0 },
  subtitle: { color: '#64748b', margin: '6px 0 0', fontSize: 13, lineHeight: 1.5 },
  metaRow: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 },
  metaPill: { display: 'inline-flex', border: '1px solid var(--io-primary-border)', background: 'var(--io-primary-soft)', color: 'var(--io-primary-dark)', borderRadius: 999, padding: '4px 9px', fontSize: 12, fontWeight: 700 },
  panel: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  formRow: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' },
  fieldLabel: { display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, color: '#334155', fontSize: 13 },
  input: { padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 10, minWidth: 180, background: '#fff', color: '#0f172a', font: 'inherit' },
  button: { padding: '9px 13px', border: '1px solid var(--io-primary)', borderRadius: 9, background: 'var(--io-primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 1px 2px rgba(15,23,42,.05)' },
  primaryButton: { padding: '9px 13px', border: '1px solid var(--io-primary)', borderRadius: 9, background: 'var(--io-primary)', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 1px 2px rgba(15,23,42,.05)' },
  secondaryButton: { padding: '9px 13px', border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', color: '#0f172a', cursor: 'pointer', fontWeight: 700 },
  disabledButton: { padding: '9px 13px', border: '1px solid #cbd5e1', borderRadius: 9, background: '#e2e8f0', color: '#64748b', cursor: 'not-allowed', fontWeight: 700 },
  error: { color: '#991b1b', marginTop: 12, fontWeight: 600 },
  errorText: { color: '#991b1b', marginTop: 4, fontSize: 12 },
  success: { color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 12px', marginTop: 12 },
  errorCard: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: 18, color: '#991b1b' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 },
  card: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, background: '#fff', color: '#334155' },
  notice: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, color: '#475569', marginBottom: 16 },
  table: { width: '100%', borderCollapse: 'collapse', color: '#334155' },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 12 },
  td: { padding: '11px 8px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  help: { color: '#64748b', fontSize: 13 },
  linkGrid: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  sourceLink: { color: 'var(--io-primary-dark)', textDecoration: 'none', fontWeight: 700 },
  badge: { display: 'inline-flex', borderRadius: 999, padding: '4px 9px', fontWeight: 700, fontSize: 12 }
};
