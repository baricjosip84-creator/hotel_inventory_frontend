import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformTenantExportsPage.css';

type TenantRow = { id: string; name: string; status?: string; billing_status?: string; plan_code?: string };
type ExportTablePreview = { table: string; row_count: number | null; error_code?: string; error?: string };
type TenantExportPreview = {
  tenant: TenantRow;
  generated_at: string;
  tables: ExportTablePreview[];
  counted_rows: number;
  total_rows: number | null;
  evidence_complete: boolean;
  failed_tables: string[];
  export_scope: {
    tenant_owned_tables_only: boolean;
    platform_control_plane_tables_excluded: boolean;
    secret_and_credential_material_excluded: boolean;
    special_child_tables: string[];
  };
  notes?: string[];
};
type ExportedTable = {
  columns: string[];
  redacted_columns: string[];
  rows: unknown[];
  source_row_count: number;
  exported_rows: number;
  truncated: boolean;
};
type TenantExportArchive = TenantExportPreview & {
  export_version: number;
  mode: 'summary' | 'full';
  max_rows_per_table: number;
  complete: boolean;
  truncated_tables: string[];
  redacted_sensitive_columns_count: number;
  archive_contract: {
    repeatable_read_snapshot: boolean;
    source_read_complete: boolean;
    row_data_complete: boolean | null;
    row_data_complete_requires_no_truncation: boolean;
    audit_event_records_application_generation_only: boolean;
    does_not_prove_external_delivery_or_receipt: boolean;
    does_not_prove_database_restore_capability: boolean;
  };
  data: Record<string, ExportedTable>;
};

function readableError(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error'; }
function dateTime(value?: string | null) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString();
}
function pretty(value?: string | null) { return value ? value.replaceAll('_', ' ') : 'Not recorded'; }
function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function PlatformTenantExportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id') || '';
  const [mode, setMode] = useState<'summary' | 'full'>('full');
  const [maxRowsPerTable, setMaxRowsPerTable] = useState(5000);
  const [message, setMessage] = useState('');

  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadCompliance = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_COMPLIANCE_READ);
  const canReadRetention = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DATA_RETENTION_READ);

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants', 'tenant-export-directory'],
    queryFn: () => platformApiRequest<TenantRow[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });
  const selectedTenant = useMemo(() => (tenantsQuery.data || []).find((tenant) => tenant.id === tenantId) || null, [tenantId, tenantsQuery.data]);
  const previewQuery = useQuery({
    queryKey: ['platform', 'tenant-exports', tenantId, 'preview'],
    queryFn: () => platformApiRequest<TenantExportPreview>(`/platform/tenant-exports/${encodeURIComponent(tenantId)}/preview`),
    enabled: Boolean(tenantId),
    refetchOnWindowFocus: false,
    staleTime: 15_000
  });

  const exportArchive = useMutation({
    mutationFn: () => platformApiRequest<TenantExportArchive>(`/platform/tenant-exports/${encodeURIComponent(tenantId)}/archive`, {
      method: 'POST',
      body: JSON.stringify({ mode, max_rows_per_table: maxRowsPerTable })
    }),
    onSuccess: (payload) => {
      const safeName = (payload.tenant.name || 'tenant').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      downloadJson(`${safeName || 'tenant'}-${payload.mode === 'summary' ? 'export-summary' : 'tenant-data-export'}.json`, payload);
      if (payload.mode === 'full' && payload.truncated_tables.length) {
        setMessage(`Export generated with ${payload.truncated_tables.length} truncated table${payload.truncated_tables.length === 1 ? '' : 's'}. It is not a complete row-data package.`);
      } else {
        setMessage(payload.mode === 'summary' ? 'Summary evidence package generated and downloaded.' : 'Tenant row-data export generated without row-limit truncation.');
      }
    }
  });

  const setTenant = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('tenant_id', value); else next.delete('tenant_id');
    setSearchParams(next, { replace: true });
    setMessage('');
  };
  const refresh = async () => {
    await tenantsQuery.refetch();
    if (tenantId) await previewQuery.refetch();
  };

  const data = previewQuery.data;
  const isValidRowLimit = Number.isInteger(maxRowsPerTable) && maxRowsPerTable >= 1 && maxRowsPerTable <= 50000;
  const failedTables = data?.failed_tables.length || 0;
  const readableTables = (data?.tables.length || 0) - failedTables;
  const canGenerate = Boolean(tenantId && data?.evidence_complete && isValidRowLimit && !exportArchive.isPending);
  const mutationError = exportArchive.error ? readableError(exportArchive.error) : '';

  return <div className="io-operational-page io-workspace-page platform-tenant-exports">
    <OperationalWorkspaceHero
      iconPath="/platform/tenant-exports"
      eyebrow="Platform · Data portability"
      title="Tenant exports"
      description="Inspect tenant-scoped export coverage and generate audited JSON evidence packages without mixing Platform control-plane records into tenant data."
      meta={<><OperationalWorkspaceMetaPill>Requires tenant read + export permission</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>Repeatable-read archive snapshot</OperationalWorkspaceMetaPill><OperationalWorkspaceMetaPill>Secrets and Platform tables excluded</OperationalWorkspaceMetaPill></>}
      aside={<div className="platform-tenant-exports__hero-aside"><OperationalWorkspaceStatus value={selectedTenant ? selectedTenant.name : 'No tenant'} label={data?.evidence_complete ? 'source preview complete' : tenantId ? 'preview pending / partial' : 'select tenant'} /><button type="button" className="app-button app-button--secondary" disabled={tenantsQuery.isFetching || previewQuery.isFetching} onClick={() => void refresh()}>{tenantsQuery.isFetching || previewQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button></div>}
    />

    {message ? <div className={message.includes('not a complete') ? 'platform-tenant-exports__warning' : 'platform-tenant-exports__success'}><span>{message}</span><button type="button" className="app-button app-button--secondary" onClick={() => setMessage('')}>Dismiss</button></div> : null}
    {mutationError ? <div className="platform-tenant-exports__warning"><strong>Export generation failed.</strong><span>{mutationError}</span></div> : null}
    {previewQuery.isError && data ? <div className="platform-tenant-exports__warning"><strong>Showing the last successful snapshot.</strong><span>{readableError(previewQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void previewQuery.refetch()}>Retry</button></div> : null}
    {tenantsQuery.isError && tenantsQuery.data ? <div className="platform-tenant-exports__warning"><strong>Showing the last successful tenant directory.</strong><span>{readableError(tenantsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void tenantsQuery.refetch()}>Retry</button></div> : null}

    <section className="platform-tenant-exports__section">
      <OperationalSectionHeader iconPath="/platform/tenant-exports" title="Export target" description="Choose the tenant and package shape. Full mode includes row data up to the per-table limit; summary mode contains counts and scope evidence only." />
      {tenantsQuery.isError && !tenantsQuery.data ? <div className="platform-tenant-exports__blocking-error"><strong>Tenant directory could not be loaded.</strong><span>{readableError(tenantsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void tenantsQuery.refetch()}>Retry</button></div> : null}
      <div className="platform-tenant-exports__controls">
        <label>Tenant<select value={tenantId} onChange={(event) => setTenant(event.target.value)}><option value="">Choose tenant…</option>{(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {pretty(tenant.status)} · {tenant.plan_code || 'no plan'}</option>)}</select></label>
        <label>Package mode<select value={mode} onChange={(event) => setMode(event.target.value as 'summary' | 'full')}><option value="full">Tenant row-data export</option><option value="summary">Summary evidence only</option></select></label>
        <label>Max rows per table<input type="number" min={1} max={50000} value={maxRowsPerTable} onChange={(event) => setMaxRowsPerTable(Number(event.target.value))} /></label>
        <button type="button" className="app-button app-button--primary" disabled={!canGenerate} onClick={() => {
          const warning = mode === 'full'
            ? 'Generate and download tenant row data? The result contains sensitive tenant business data. Per-table row limits can make the package incomplete; inspect truncation evidence after generation.'
            : 'Generate and download a tenant export summary? The summary records application evidence only and contains no table row payloads.';
          if (window.confirm(warning)) exportArchive.mutate();
        }}>{exportArchive.isPending ? 'Generating…' : mode === 'full' ? 'Generate row-data export' : 'Generate summary'}</button>
      </div>
      {!isValidRowLimit ? <div className="platform-tenant-exports__validation">Max rows per table must be a whole number from 1 to 50,000.</div> : null}
      {tenantId && data && !data.evidence_complete ? <div className="platform-tenant-exports__warning"><strong>Source preview is incomplete.</strong><span>{failedTables} table{failedTables === 1 ? '' : 's'} could not be read. Export generation fails closed until every in-scope source is readable.</span></div> : null}
    </section>

    <OperationalWorkspaceStats ariaLabel="Tenant export evidence summary">
      <OperationalWorkspaceStatCard iconPath="/platform/tenant-exports" label="In-scope tables" value={data?.tables.length ?? '—'} helper={data ? `${readableTables} readable · ${failedTables} failed` : 'Select a tenant to inspect export scope'} tone={failedTables ? 'warn' : 'default'} />
      <OperationalWorkspaceStatCard iconPath="/platform/tenant-exports" label="Counted rows" value={data ? data.counted_rows.toLocaleString() : '—'} helper={data?.evidence_complete ? 'Complete count across current tenant export scope' : data ? 'Partial count; do not treat as total rows' : 'No preview loaded'} tone={data && !data.evidence_complete ? 'warn' : 'default'} />
      <OperationalWorkspaceStatCard iconPath="/platform/tenant-exports" label="Total rows" value={data?.total_rows == null ? 'Restricted by error' : data.total_rows.toLocaleString()} helper={data?.evidence_complete ? 'Point-in-time preview total' : 'Unavailable until every source count succeeds'} tone={data && !data.evidence_complete ? 'warn' : 'default'} />
      <OperationalWorkspaceStatCard iconPath="/platform/tenant-exports" label="Snapshot" value={data ? dateTime(data.generated_at) : '—'} helper="Preview timestamp; export generation takes its own repeatable-read snapshot" tone="neutral" />
    </OperationalWorkspaceStats>

    <section className="platform-tenant-exports__section">
      <OperationalSectionHeader iconPath="/platform/tenant-exports" title="Export scope evidence" description="The export contract includes tenant-owned application tables and explicit tenant-owned child tables. Platform control-plane tables and reusable credential/authentication material are excluded." actions={tenantId ? <button type="button" className="app-button app-button--secondary" disabled={previewQuery.isFetching} onClick={() => void previewQuery.refetch()}>{previewQuery.isFetching ? 'Refreshing…' : 'Refresh preview'}</button> : undefined} />
      {previewQuery.isLoading && !data ? <div className="platform-tenant-exports__loading">Loading tenant export preview…</div> : null}
      {previewQuery.isError && !data ? <div className="platform-tenant-exports__blocking-error"><strong>Tenant export preview could not be loaded.</strong><span>{readableError(previewQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => void previewQuery.refetch()}>Retry</button></div> : null}
      {!tenantId ? <div className="platform-tenant-exports__empty"><strong>No tenant selected.</strong><span>Select a tenant to inspect its exportable application-data scope.</span></div> : null}
      {data ? <>
        <div className="platform-tenant-exports__truth-note"><strong>Evidence boundary</strong><span>A generated package proves only that the application assembled the visible export evidence. It does not prove secure external delivery, recipient receipt, completeness beyond configured row limits, database backup coverage, or restore capability.</span></div>
        <div className="platform-tenant-exports__scope-grid">
          <div><span>Tenant-owned tables only</span><strong>{data.export_scope.tenant_owned_tables_only ? 'Yes' : 'No'}</strong></div>
          <div><span>Platform control plane excluded</span><strong>{data.export_scope.platform_control_plane_tables_excluded ? 'Yes' : 'No'}</strong></div>
          <div><span>Credential/auth material excluded</span><strong>{data.export_scope.secret_and_credential_material_excluded ? 'Yes' : 'No'}</strong></div>
          <div><span>Explicit child tables</span><strong>{data.export_scope.special_child_tables.join(', ') || 'None'}</strong></div>
        </div>
        <div className="platform-tenant-exports__notes">{(data.notes || []).map((note) => <span key={note}>{note}</span>)}</div>
        <div className="platform-tenant-exports__table-wrap"><table><thead><tr><th>Table</th><th>Rows</th><th>Preview state</th></tr></thead><tbody>{data.tables.map((table) => <tr key={table.table}><td><strong>{table.table}</strong></td><td>{table.row_count == null ? 'Unavailable' : table.row_count.toLocaleString()}</td><td><span className="platform-tenant-exports__badge" data-tone={table.error ? 'warn' : 'good'}>{table.error ? 'Read failed' : 'Readable'}</span>{table.error ? <small>{table.error}</small> : null}</td></tr>)}</tbody></table></div>
      </> : null}
    </section>

    <section className="platform-tenant-exports__section">
      <OperationalSectionHeader iconPath="/platform/tenant-exports" title="Supporting evidence" description="Open only the Platform evidence areas you are authorized to read." />
      <div className="platform-tenant-exports__supporting-links">
        <Link to={tenantId ? `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenants'}>Tenants</Link>
        <Link to={tenantId ? `/platform/tenant-offboarding?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/tenant-offboarding'}>Tenant offboarding</Link>
        {canReadCompliance ? <Link to="/platform/compliance-export">Compliance export</Link> : null}
        {canReadCompliance ? <Link to="/platform/legal-compliance-reporting">Legal & compliance</Link> : null}
        {canReadRetention ? <Link to={tenantId ? `/platform/data-retention?tenant_id=${encodeURIComponent(tenantId)}` : '/platform/data-retention'}>Data retention</Link> : null}
        {canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}
      </div>
    </section>
  </div>;
}
