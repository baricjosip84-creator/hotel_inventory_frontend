import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformApiRequest } from '../lib/platformApi';

type Tenant = { id: string; name: string; status?: string; billing_status?: string; plan_code?: string | null };
type SubscriptionItem = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  billing_status: string;
  plan_code?: string | null;
  readiness_state: string;
  risk_flags: string[];
  days_until_trial_end?: number | null;
  days_until_period_end?: number | null;
  billing_event_count: number;
  last_billing_event_at?: string | null;
};
type SubscriptionPackage = { posture: string; summary: Record<string, number>; items: SubscriptionItem[] };

type FilterState = { tenant_id: string; status: string };

const billingStatuses = ['not_configured', 'trialing', 'active', 'past_due', 'cancelled', 'comped'];
const metricEntries = [
  'tenants_reviewed',
  'ready_tenants',
  'tenants_requiring_review',
  'blocked_tenants',
  'trials_ending_soon',
  'past_due_tenants',
  'missing_plan_codes',
  'missing_customer_references',
  'missing_billing_event_history'
];

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('review')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function FlagList({ flags }: { flags: string[] }) {
  return (
    <div style={styles.flags}>
      {flags.length ? flags.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>) : <span style={styles.help}>No flags</span>}
    </div>
  );
}

function dateOnly(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function metricLabel(value: string) {
  return value.replaceAll('_', ' ');
}

function buildQuery(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
  if (filters.status) params.set('status', filters.status);
  const query = params.toString();
  return query ? `/platform/subscription-readiness?${query}` : '/platform/subscription-readiness';
}

export default function PlatformSubscriptionReadinessPage() {
  const [filters, setFilters] = useState<FilterState>({ tenant_id: '', status: '' });
  const endpoint = useMemo(() => buildQuery(filters), [filters]);

  const readinessQuery = useQuery({
    queryKey: ['platform', 'subscription-readiness', filters],
    queryFn: () => platformApiRequest<SubscriptionPackage>(endpoint)
  });

  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants', 'subscription-readiness-filter'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const data = readinessQuery.data;
  const summary = data?.summary || {};
  const items = data?.items || [];
  const selectedTenantName = tenantsQuery.data?.find((tenant) => tenant.id === filters.tenant_id)?.name || filters.tenant_id || 'All tenants';
  const blockedCount = summary.blocked_tenants ?? 0;
  const reviewCount = summary.tenants_requiring_review ?? 0;
  const missingEvidenceCount = summary.missing_billing_event_history ?? 0;
  const hasFilters = Boolean(filters.tenant_id || filters.status);

  async function refreshAll() {
    await Promise.all([readinessQuery.refetch(), tenantsQuery.refetch()]);
  }

  function clearFilters() {
    setFilters({ tenant_id: '', status: '' });
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Subscription readiness</h1>
          <p style={styles.subtitle}>Read-only billing and subscription posture for commercial activation, renewal, and blocker review.</p>
        </div>
        <div style={styles.headerActions}>
          {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
          <button type="button" style={styles.secondaryButton} onClick={refreshAll} disabled={readinessQuery.isFetching || tenantsQuery.isFetching}>
            {readinessQuery.isFetching || tenantsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      <section style={styles.metaPanel}>
        <div><strong>Snapshot source:</strong> GET {endpoint}</div>
        <div><strong>Tenant filter:</strong> {selectedTenantName}</div>
        <div><strong>Billing status filter:</strong> {filters.status || 'All statuses'}</div>
        <div><strong>Displayed tenants:</strong> {items.length}</div>
        <div><strong>Blocked tenants:</strong> {blockedCount}</div>
        <div><strong>Review tenants:</strong> {reviewCount}</div>
        <div><strong>Missing billing evidence:</strong> {missingEvidenceCount}</div>
      </section>

      <nav style={styles.supportLinks} aria-label="Supporting Platform pages">
        <Link style={styles.supportLink} to="/platform/billing">Billing</Link>
        <Link style={styles.supportLink} to="/platform/tenants">Tenants</Link>
        <Link style={styles.supportLink} to="/platform/audit">System Audit</Link>
        <Link style={styles.supportLink} to="/platform/tenant-health">Tenant Health</Link>
      </nav>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Readiness filters</h2>
        <div style={styles.filterGrid}>
          <label style={styles.label}>Tenant
            <select style={styles.input} value={filters.tenant_id} onChange={(event) => setFilters({ ...filters, tenant_id: event.target.value })}>
              <option value="">All tenants</option>
              {(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label style={styles.label}>Billing status
            <select style={styles.input} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">All statuses</option>
              {billingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <div style={styles.filterActions}>
            <button type="button" style={styles.secondaryButton} onClick={() => readinessQuery.refetch()} disabled={readinessQuery.isFetching}>Apply / retry</button>
            {hasFilters ? <button type="button" style={styles.linkButton} onClick={clearFilters}>Clear filters</button> : null}
          </div>
        </div>
        {tenantsQuery.error ? <p style={styles.errorText}>Tenant filter failed to load: {readableError(tenantsQuery.error)}</p> : null}
      </section>

      {readinessQuery.isLoading ? <section style={styles.card}>Loading subscription readiness…</section> : null}
      {readinessQuery.error ? (
        <section style={styles.errorPanel}>
          <strong>Subscription readiness failed to load.</strong>
          <span>{readableError(readinessQuery.error)}</span>
          <button type="button" style={styles.retryButton} onClick={() => readinessQuery.refetch()}>Retry subscription readiness</button>
        </section>
      ) : null}

      {data ? <section style={styles.summaryGrid}>{metricEntries.map((key) => <div key={key} style={styles.card}><strong>{metricLabel(key)}</strong><div style={styles.metric}>{summary[key] ?? 0}</div></div>)}</section> : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Tenant subscription evidence</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>Billing</th>
                <th style={styles.th}>Plan</th>
                <th style={styles.th}>Windows</th>
                <th style={styles.th}>Events</th>
                <th style={styles.th}>Flags</th>
                <th style={styles.th}>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.tenant_id}>
                  <td style={styles.td}>
                    <strong>{item.tenant_name}</strong><br />
                    <span style={styles.help}>{item.tenant_status} · {item.readiness_state}</span>
                  </td>
                  <td style={styles.td}>{item.billing_status}</td>
                  <td style={styles.td}>{item.plan_code || '—'}</td>
                  <td style={styles.td}>Trial: {item.days_until_trial_end ?? '—'} days<br /><span style={styles.help}>Period: {item.days_until_period_end ?? '—'} days</span></td>
                  <td style={styles.td}>{item.billing_event_count}<br /><span style={styles.help}>Last event: {dateOnly(item.last_billing_event_at)}</span></td>
                  <td style={styles.td}><FlagList flags={item.risk_flags} /></td>
                  <td style={styles.td}>
                    <div style={styles.evidenceLinks}>
                      <Link style={styles.evidenceLink} to={`/platform/billing?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Billing record</Link>
                      <Link style={styles.evidenceLink} to={`/platform/tenants?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant record</Link>
                      <Link style={styles.evidenceLink} to={`/platform/audit?tenant_id=${encodeURIComponent(item.tenant_id)}&category=billing`}>Billing audit</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length ? <tr><td style={styles.td} colSpan={7}>No subscription readiness rows available.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  headerActions: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap' },
  metaPanel: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, padding: 14, border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: 14, color: '#1e3a8a', fontSize: 13 },
  supportLinks: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  supportLink: { border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '6px 10px', textDecoration: 'none', fontWeight: 700, fontSize: 13 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metric: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  cardTitle: { margin: '0 0 10px', fontSize: 18 },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' },
  filterActions: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  label: { display: 'flex', flexDirection: 'column', gap: 6, color: '#374151', fontWeight: 700, fontSize: 13 },
  input: { border: '1px solid #d1d5db', borderRadius: 8, padding: '9px 10px', font: 'inherit', background: '#fff' },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', color: '#111827', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 },
  retryButton: { border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontWeight: 700, width: 'fit-content' },
  linkButton: { border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontWeight: 700, padding: 0 },
  errorPanel: { display: 'flex', flexDirection: 'column', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 14, padding: 16 },
  errorText: { color: '#991b1b', margin: '10px 0 0', fontSize: 13 },
  flags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  flag: { background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  help: { color: '#6b7280', fontSize: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px 8px', color: '#374151', fontSize: 13 },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 8px', verticalAlign: 'top' },
  evidenceLinks: { display: 'flex', flexDirection: 'column', gap: 6 },
  evidenceLink: { color: '#2563eb', fontSize: 12, fontWeight: 700, textDecoration: 'none' }
};
