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

  return (
    <div style={styles.page}>
      <header>
        <h1 style={styles.title}>Tenant exports</h1>
        <p style={styles.subtitle}>Create audited tenant backup/export packages. This does not restore or mutate tenant data.</p>
      </header>

      <section style={styles.panel}>
        <h2>Select tenant</h2>
        <div style={styles.formRow}>
          <select style={styles.input} value={tenantId} onChange={(event) => setTenantId(event.target.value)}>
            <option value="">Choose tenant…</option>
            {(tenantsQuery.data || []).map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.status || 'unknown'} · {tenant.plan_code || 'no plan'}</option>
            ))}
          </select>
          <select style={styles.input} value={mode} onChange={(event) => setMode(event.target.value as 'summary' | 'full')}>
            <option value="full">Full JSON archive</option>
            <option value="summary">Summary only</option>
          </select>
          <input
            style={styles.input}
            type="number"
            min={1}
            max={50000}
            value={maxRowsPerTable}
            onChange={(event) => setMaxRowsPerTable(Number(event.target.value) || 5000)}
            aria-label="Max rows per table"
          />
          <button style={styles.button} disabled={!tenantId || exportArchive.isPending} onClick={() => exportArchive.mutate()}>
            {exportArchive.isPending ? 'Preparing…' : 'Download export'}
          </button>
        </div>
        {tenantsQuery.error ? <div style={styles.error}>{readableError(tenantsQuery.error)}</div> : null}
        {exportArchive.error ? <div style={styles.error}>{readableError(exportArchive.error)}</div> : null}
      </section>

      {selectedTenant ? (
        <section style={styles.panel}>
          <h2>{selectedTenant.name}</h2>
          {previewQuery.isLoading ? <p>Loading export preview…</p> : null}
          {previewQuery.error ? <div style={styles.error}>{readableError(previewQuery.error)}</div> : null}
          {previewQuery.data ? (
            <>
              <div style={styles.grid}>
                <div style={styles.card}><span>Total rows</span><strong>{previewQuery.data.total_rows}</strong></div>
                <div style={styles.card}><span>Tables</span><strong>{previewQuery.data.tables.length}</strong></div>
                <div style={styles.card}><span>Generated</span><strong>{new Date(previewQuery.data.generated_at).toLocaleString()}</strong></div>
              </div>

              <div style={styles.notice}>
                {(previewQuery.data.notes || []).map((note) => <p key={note}>{note}</p>)}
              </div>

              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Table</th>
                    <th style={styles.th}>Rows</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewQuery.data.tables.map((table) => (
                    <tr key={table.table}>
                      <td style={styles.td}>{table.table}</td>
                      <td style={styles.td}>{table.row_count ?? '-'}</td>
                      <td style={styles.td}>{table.error ? table.error : 'Ready'}</td>
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
  page: { display: 'flex', flexDirection: 'column', gap: '24px' },
  title: { fontSize: '32px', margin: 0 },
  subtitle: { color: '#6b7280', marginTop: '8px' },
  panel: { background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 24px rgba(15,23,42,0.08)' },
  formRow: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', minWidth: '180px' },
  button: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#111827', color: '#fff', cursor: 'pointer' },
  error: { color: '#b91c1c', marginTop: '12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' },
  card: { border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' },
  notice: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px', color: '#374151', marginBottom: '16px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '10px', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '10px', borderBottom: '1px solid #f3f4f6' }
};
