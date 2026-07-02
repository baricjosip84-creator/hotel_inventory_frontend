import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { platformApiRequest, platformDownload } from '../lib/platformApi';

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

type AuditCountRow = { count: number };
type AuditActionCount = AuditCountRow & { action: string };
type AuditActorCount = AuditCountRow & { platform_user_id: string | null; actor: string };
type AuditTenantCount = AuditCountRow & { tenant_id: string | null; tenant_name: string };
type AuditCategoryCount = AuditCountRow & { category: string };

type AuditSummary = {
  total: { total_events: number; first_event_at: string | null; last_event_at: string | null };
  top_actions: AuditActionCount[];
  top_actors: AuditActorCount[];
  top_tenants: AuditTenantCount[];
  categories: AuditCategoryCount[];
};

const CATEGORY_OPTIONS = [
  { value: '', label: 'All categories' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'support', label: 'Support' },
  { value: 'user', label: 'Platform users' },
  { value: 'session', label: 'Sessions' },
  { value: 'notification', label: 'Notifications' },
  { value: 'billing', label: 'Billing' },
  { value: 'security', label: 'Security' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'announcement', label: 'Announcements' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'export', label: 'Exports' }
];

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
  const [category, setCategory] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [platformUserId, setPlatformUserId] = useState('');
  const [targetType, setTargetType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', limit.trim() || '100');
    if (action.trim()) params.set('action', action.trim());
    if (category.trim()) params.set('category', category.trim());
    if (tenantId.trim()) params.set('tenant_id', tenantId.trim());
    if (platformUserId.trim()) params.set('platform_user_id', platformUserId.trim());
    if (targetType.trim()) params.set('target_type', targetType.trim());
    if (from.trim()) params.set('from', from.trim());
    if (to.trim()) params.set('to', to.trim());
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [action, category, from, limit, platformUserId, search, targetType, tenantId, to]);

  const auditQuery = useQuery({
    queryKey: ['platform', 'audit', queryString],
    queryFn: () => platformApiRequest<PlatformAuditRow[]>(`/platform/audit?${queryString}`)
  });

  const summaryQuery = useQuery({
    queryKey: ['platform', 'audit-summary', queryString],
    queryFn: () => platformApiRequest<AuditSummary>(`/platform/audit/summary?${queryString}`)
  });

  const rows = auditQuery.data || [];
  const summary = summaryQuery.data;
  const parsedLimit = Number(limit);
  const limitIsValid = Number.isInteger(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 500;
  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  const fromIsValid = !from || !Number.isNaN(fromDate?.getTime());
  const toIsValid = !to || !Number.isNaN(toDate?.getTime());
  const dateRangeIsValid = !fromDate || !toDate || fromDate.getTime() <= toDate.getTime();
  const filtersAreValid = limitIsValid && fromIsValid && toIsValid && dateRangeIsValid;
  const activeFilterLabels = [
    category ? `Category: ${category}` : '',
    action.trim() ? `Action: ${action.trim()}` : '',
    targetType.trim() ? `Target type: ${targetType.trim()}` : '',
    tenantId.trim() ? `Tenant ID: ${tenantId.trim()}` : '',
    platformUserId.trim() ? `Platform User ID: ${platformUserId.trim()}` : '',
    from.trim() ? `From: ${from.trim()}` : '',
    to.trim() ? `To: ${to.trim()}` : '',
    search.trim() ? `Search: ${search.trim()}` : ''
  ].filter(Boolean);

  async function refreshAll() {
    setStatusMessage('');
    setExportError('');
    await Promise.all([auditQuery.refetch(), summaryQuery.refetch()]);
  }

  const handleExportCsv = async () => {
    setStatusMessage('');
    setExportError('');
    if (!filtersAreValid) {
      setExportError('Fix invalid filters before exporting audit evidence.');
      return;
    }
    const confirmed = window.confirm('Export the currently filtered platform audit evidence to CSV? This export is itself written to platform audit.');
    if (!confirmed) return;
    setExporting(true);
    try {
      const params = new URLSearchParams(queryString);
      if (!params.get('limit') || Number(params.get('limit')) < 1000) {
        params.set('limit', '1000');
      }
      await platformDownload(`/platform/audit/export.csv?${params.toString()}`, 'platform-audit.csv');
      setStatusMessage('Audit CSV export prepared. The export action is recorded in platform audit.');
    } catch (error) {
      setExportError(readableError(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Platform Audit</h1>
          <p style={styles.subtitle}>Superadmin and platform-support actions across the SaaS control plane.</p>
        </div>
        <div style={styles.headerActions}>
          <button type="button" onClick={refreshAll} disabled={auditQuery.isFetching || summaryQuery.isFetching} style={styles.secondaryButton}>
            {auditQuery.isFetching || summaryQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
          <button type="button" onClick={handleExportCsv} disabled={exporting || !filtersAreValid} style={styles.primaryButton}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </header>

      {statusMessage ? <div style={styles.success}>{statusMessage}</div> : null}
      {exportError ? <div style={styles.error}>{exportError}</div> : null}
      {!filtersAreValid ? <div style={styles.error}>Limit must be 1-500 and date filters must be valid with From before To.</div> : null}

      <section style={styles.metaPanel}>
        <div><strong>Audit source:</strong> GET /platform/audit</div>
        <div><strong>Summary source:</strong> GET /platform/audit/summary</div>
        <div><strong>Export source:</strong> GET /platform/audit/export.csv</div>
        <div><strong>Displayed rows:</strong> {rows.length}</div>
        <div><strong>Current limit:</strong> {limit.trim() || '100'}</div>
        <div><strong>Latest event:</strong> {formatDateTime(summary?.total.last_event_at)}</div>
        <div><strong>Active filters:</strong> {activeFilterLabels.length ? activeFilterLabels.join(' | ') : 'None'}</div>
      </section>

      <nav style={styles.supportLinks} aria-label="Supporting platform pages">
        <Link style={styles.supportLink} to="/platform/security-center">Security Center</Link>
        <Link style={styles.supportLink} to="/platform/support-sessions">Support Sessions</Link>
        <Link style={styles.supportLink} to="/platform/tenant-exports">Tenant Exports</Link>
        <Link style={styles.supportLink} to="/platform/incidents">Incidents</Link>
      </nav>

      <section style={styles.panel}>
        <h2 style={styles.sectionTitle}>Filters</h2>
        <div style={styles.filters}>
          <label style={styles.label}>
            Limit
            <input type="number" min="1" max="500" value={limit} onChange={(event) => setLimit(event.target.value)} style={limitIsValid ? styles.input : styles.inputInvalid} />
          </label>
          <label style={styles.label}>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)} style={styles.input}>
              {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label style={styles.label}>
            Action
            <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="tenant.lock" style={styles.input} />
          </label>
          <label style={styles.label}>
            Target type
            <input value={targetType} onChange={(event) => setTargetType(event.target.value)} placeholder="tenant" style={styles.input} />
          </label>
          <label style={styles.label}>
            Tenant ID
            <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} placeholder="UUID" style={styles.input} />
          </label>
          <label style={styles.label}>
            Platform User ID
            <input value={platformUserId} onChange={(event) => setPlatformUserId(event.target.value)} placeholder="UUID" style={styles.input} />
          </label>
          <label style={styles.label}>
            From
            <input type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} style={fromIsValid && dateRangeIsValid ? styles.input : styles.inputInvalid} />
          </label>
          <label style={styles.label}>
            To
            <input type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} style={toIsValid && dateRangeIsValid ? styles.input : styles.inputInvalid} />
          </label>
          <label style={styles.labelWide}>
            Search
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="actor, tenant, action, target, metadata" style={styles.input} />
          </label>
        </div>
      </section>

      {summary ? (
        <section style={styles.summaryGrid}>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Events</div>
            <div style={styles.metricValue}>{summary.total.total_events}</div>
            <div style={styles.muted}>Latest: {formatDateTime(summary.total.last_event_at)}</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Top category</div>
            <div style={styles.metricValueSmall}>{summary.categories[0]?.category || '-'}</div>
            <div style={styles.muted}>{summary.categories[0]?.count || 0} events</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Top actor</div>
            <div style={styles.metricValueSmall}>{summary.top_actors[0]?.actor || '-'}</div>
            <div style={styles.muted}>{summary.top_actors[0]?.count || 0} events</div>
          </div>
          <div style={styles.metricCard}>
            <div style={styles.metricLabel}>Top tenant</div>
            <div style={styles.metricValueSmall}>{summary.top_tenants[0]?.tenant_name || '-'}</div>
            <div style={styles.muted}>{summary.top_tenants[0]?.count || 0} events</div>
          </div>
        </section>
      ) : null}

      {summary ? (
        <section style={styles.panel}>
          <h2 style={styles.sectionTitle}>Audit Summary</h2>
          <div style={styles.summaryColumns}>
            <SummaryList title="Categories" rows={summary.categories.map((row) => ({ label: row.category, count: row.count }))} />
            <SummaryList title="Top actions" rows={summary.top_actions.map((row) => ({ label: row.action, count: row.count }))} />
            <SummaryList title="Top actors" rows={summary.top_actors.map((row) => ({ label: row.actor, count: row.count }))} />
            <SummaryList title="Top tenants" rows={summary.top_tenants.map((row) => ({ label: row.tenant_name, count: row.count }))} />
          </div>
        </section>
      ) : null}

      {auditQuery.isLoading ? <div style={styles.panel}>Loading platform audit…</div> : null}
      {auditQuery.error ? (
        <div style={styles.errorPanel}>
          <strong>Audit events failed to load.</strong>
          <span>{readableError(auditQuery.error)}</span>
          <button type="button" style={styles.retryButton} onClick={() => auditQuery.refetch()}>Retry audit events</button>
        </div>
      ) : null}
      {summaryQuery.error ? (
        <div style={styles.errorPanel}>
          <strong>Audit summary failed to load.</strong>
          <span>{readableError(summaryQuery.error)}</span>
          <button type="button" style={styles.retryButton} onClick={() => summaryQuery.refetch()}>Retry audit summary</button>
        </div>
      ) : null}

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
                  <td style={styles.tdMonoSmall}>
                    {metadataPreview(row.metadata)}
                    <div style={styles.evidenceLinks}>
                      <Link style={styles.evidenceLink} to={`/platform/audit?action=${encodeURIComponent(row.action)}&target_type=${encodeURIComponent(row.target_type || '')}&search=${encodeURIComponent(row.target_id || row.id)}`}>Evidence query</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : !auditQuery.isLoading ? <div>No platform audit events found.</div> : null}
      </section>
    </div>
  );
}

function SummaryList({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div style={styles.summaryList}>
      <h3 style={styles.summaryTitle}>{title}</h3>
      {rows.length ? rows.map((row) => (
        <div key={`${title}-${row.label}`} style={styles.summaryItem}>
          <span style={styles.summaryLabel}>{row.label || '-'}</span>
          <strong>{row.count}</strong>
        </div>
      )) : <div style={styles.muted}>No data.</div>}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '20px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' },
  headerActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '30px' },
  subtitle: { margin: '8px 0 0', color: '#6b7280' },
  panel: { background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 12px 36px rgba(15,23,42,0.08)', overflowX: 'auto' },
  sectionTitle: { margin: '0 0 14px', fontSize: '20px' },
  filters: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' },
  label: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#374151' },
  labelWide: { display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#374151', gridColumn: 'span 2' },
  input: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', background: '#fff' },
  inputInvalid: { border: '1px solid #dc2626', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', background: '#fff7f7' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px' },
  success: { background: '#dcfce7', color: '#166534', borderRadius: '12px', padding: '12px' },
  errorPanel: { display: 'flex', flexDirection: 'column', gap: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', padding: '12px' },
  retryButton: { alignSelf: 'flex-start', border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: '8px', padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: '10px', padding: '10px 14px', fontWeight: 700, cursor: 'pointer' },
  metaPanel: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', color: '#334155' },
  supportLinks: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  supportLink: { background: '#eef2ff', color: '#3730a3', borderRadius: '999px', padding: '8px 12px', fontWeight: 700, textDecoration: 'none' },
  primaryButton: { border: 0, background: '#111827', color: '#fff', borderRadius: '10px', padding: '10px 14px', fontWeight: 800, cursor: 'pointer' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' },
  metricCard: { background: '#fff', borderRadius: '16px', padding: '18px', boxShadow: '0 12px 36px rgba(15,23,42,0.08)' },
  metricLabel: { color: '#6b7280', fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' },
  metricValue: { fontSize: '30px', fontWeight: 900, marginTop: '8px' },
  metricValueSmall: { fontSize: '20px', fontWeight: 900, marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis' },
  summaryColumns: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' },
  summaryList: { border: '1px solid #e5e7eb', borderRadius: '14px', padding: '14px' },
  summaryTitle: { margin: '0 0 10px', fontSize: '15px' },
  summaryItem: { display: 'flex', justifyContent: 'space-between', gap: '10px', borderTop: '1px solid #f3f4f6', padding: '8px 0' },
  summaryLabel: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px', color: '#6b7280', fontSize: '13px', whiteSpace: 'nowrap' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', verticalAlign: 'top' },
  tdMono: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', fontFamily: 'monospace', verticalAlign: 'top', whiteSpace: 'nowrap' },
  tdMonoSmall: { borderBottom: '1px solid #f3f4f6', padding: '12px 10px', fontFamily: 'monospace', fontSize: '12px', verticalAlign: 'top', maxWidth: '320px', wordBreak: 'break-word' },
  evidenceLinks: { display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' },
  evidenceLink: { color: '#2563eb', fontWeight: 700, textDecoration: 'none', fontFamily: 'system-ui, sans-serif' },
  muted: { color: '#6b7280', fontSize: '12px', marginTop: '4px', wordBreak: 'break-all' }
};
