import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformApiRequest } from '../lib/platformApi';

type PlanDefinition = { plan_code: string; commercial_tier: string; required_limits: string[]; required_feature_flags: string[]; recommended_enforcement_mode: string };
type LicenseItem = { tenant_id: string; tenant_name: string; tenant_status: string; billing_status: string; plan_code?: string | null; commercial_tier?: string | null; recommended_enforcement_mode?: string | null; missing_limits: string[]; missing_feature_flags: string[]; enforcement_gaps: string[]; enforcement_state: string };
type LicensePackage = { posture: string; plan_definitions: PlanDefinition[]; summary: Record<string, number>; items: LicenseItem[] };
type Tenant = { id: string; name: string; status?: string; billing_status?: string; plan_code?: string | null };
type FilterState = { tenant_id: string; plan_code: string; billing_status: string };

const billingStatuses = ['not_configured', 'trialing', 'active', 'past_due', 'cancelled', 'comped'];

function badgeStyle(value: string): CSSProperties { if (value.includes('blocked')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' }; if (value.includes('review')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' }; return { ...styles.badge, background: '#dcfce7', color: '#166534' }; }
function Chips({ values }: { values: string[] }) { return <div style={styles.flags}>{values.length ? values.map((value) => <span key={value} style={styles.flag}>{value}</span>) : <span style={styles.help}>None</span>}</div>; }

function readableError(error: unknown): string { return error instanceof Error ? error.message : 'Unknown error'; }
function metricLabel(value: string) { return value.replaceAll('_', ' '); }
function buildQuery(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
  if (filters.plan_code.trim()) params.set('plan_code', filters.plan_code.trim());
  if (filters.billing_status) params.set('billing_status', filters.billing_status);
  const query = params.toString();
  return query ? `/platform/license-plan-enforcement?${query}` : '/platform/license-plan-enforcement';
}

export default function PlatformLicensePlanEnforcementPage() {
  const [filters, setFilters] = useState<FilterState>({ tenant_id: '', plan_code: '', billing_status: '' });
  const endpoint = useMemo(() => buildQuery(filters), [filters]);

  const enforcementQuery = useQuery({
    queryKey: ['platform', 'license-plan-enforcement', filters],
    queryFn: () => platformApiRequest<LicensePackage>(endpoint)
  });
  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants', 'license-plan-enforcement-filter'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const data = enforcementQuery.data;
  const summary = data?.summary || {};
  const items = data?.items || [];
  const metrics = ['tenants_reviewed', 'ready_tenants', 'tenants_requiring_review', 'blocked_tenants', 'missing_plan_definitions', 'missing_required_limits', 'missing_required_feature_flags', 'billing_blocked_tenants'];
  const selectedTenantName = tenantsQuery.data?.find((tenant) => tenant.id === filters.tenant_id)?.name || filters.tenant_id || 'All tenants';
  const hasFilters = Boolean(filters.tenant_id || filters.plan_code.trim() || filters.billing_status);
  const planOptions = Array.from(new Set([...(data?.plan_definitions || []).map((plan) => plan.plan_code), 'starter', 'standard', 'enterprise'])).filter(Boolean);

  async function refreshAll() {
    await Promise.all([enforcementQuery.refetch(), tenantsQuery.refetch()]);
  }

  function clearFilters() {
    setFilters({ tenant_id: '', plan_code: '', billing_status: '' });
  }

  return <div style={styles.page}>
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>License & plan enforcement</h1>
        <p style={styles.subtitle}>Read-only commercial entitlement and plan-limit readiness before runtime enforcement is wired into tenant workflows.</p>
      </div>
      <div style={styles.headerActions}>
        {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
        <button type="button" style={styles.secondaryButton} onClick={refreshAll} disabled={enforcementQuery.isFetching || tenantsQuery.isFetching}>{enforcementQuery.isFetching || tenantsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
      </div>
    </header>

    <section style={styles.metaPanel}>
      <div><strong>Snapshot source:</strong> GET {endpoint}</div>
      <div><strong>Tenant filter:</strong> {selectedTenantName}</div>
      <div><strong>Plan filter:</strong> {filters.plan_code.trim() || 'All plans'}</div>
      <div><strong>Billing status filter:</strong> {filters.billing_status || 'All statuses'}</div>
      <div><strong>Displayed tenants:</strong> {items.length}</div>
      <div><strong>Blocked tenants:</strong> {summary.blocked_tenants ?? 0}</div>
      <div><strong>Review tenants:</strong> {summary.tenants_requiring_review ?? 0}</div>
      <div><strong>Billing blocked:</strong> {summary.billing_blocked_tenants ?? 0}</div>
    </section>

    <nav style={styles.supportLinks} aria-label="Supporting Platform pages">
      <Link style={styles.supportLink} to="/platform/billing">Billing</Link>
      <Link style={styles.supportLink} to="/platform/subscription-readiness">Subscription Readiness</Link>
      <Link style={styles.supportLink} to="/platform/tenants">Tenants</Link>
      <Link style={styles.supportLink} to="/platform/tenant-health">Tenant Health</Link>
      <Link style={styles.supportLink} to="/platform/audit">System Audit</Link>
    </nav>

    <section style={styles.card}>
      <h2 style={styles.cardTitle}>Enforcement filters</h2>
      <div style={styles.filterGrid}>
        <label style={styles.label}>Tenant
          <select style={styles.input} value={filters.tenant_id} onChange={(event) => setFilters({ ...filters, tenant_id: event.target.value })}>
            <option value="">All tenants</option>
            {(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label>
        <label style={styles.label}>Plan code
          <select style={styles.input} value={filters.plan_code} onChange={(event) => setFilters({ ...filters, plan_code: event.target.value })}>
            <option value="">All plans</option>
            {planOptions.map((planCode) => <option key={planCode} value={planCode}>{planCode}</option>)}
          </select>
        </label>
        <label style={styles.label}>Billing status
          <select style={styles.input} value={filters.billing_status} onChange={(event) => setFilters({ ...filters, billing_status: event.target.value })}>
            <option value="">All statuses</option>
            {billingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <div style={styles.filterActions}>
          <button type="button" style={styles.secondaryButton} onClick={() => enforcementQuery.refetch()} disabled={enforcementQuery.isFetching}>Apply / retry</button>
          {hasFilters ? <button type="button" style={styles.linkButton} onClick={clearFilters}>Clear filters</button> : null}
        </div>
      </div>
      {tenantsQuery.error ? <p style={styles.errorText}>Tenant filter failed to load: {readableError(tenantsQuery.error)}</p> : null}
    </section>

    {enforcementQuery.isLoading ? <section style={styles.card}>Loading license and plan enforcement…</section> : null}
    {enforcementQuery.error ? <section style={styles.errorPanel}><strong>License and plan enforcement failed to load.</strong><span>{readableError(enforcementQuery.error)}</span><button type="button" style={styles.retryButton} onClick={() => enforcementQuery.refetch()}>Retry license enforcement</button></section> : null}

    {data ? <section style={styles.summaryGrid}>{metrics.map((key) => <div key={key} style={styles.card}><strong>{metricLabel(key)}</strong><div style={styles.metric}>{summary[key] ?? 0}</div></div>)}</section> : null}

    {data ? <section style={styles.card}>
      <h2 style={styles.cardTitle}>Plan definitions</h2>
      <p style={styles.helpBlock}>Source: backend plan catalog used by GET /platform/license-plan-enforcement. These rows are evidence for required limits, feature flags, commercial tier, and recommended enforcement mode.</p>
      <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Plan</th><th style={styles.th}>Tier</th><th style={styles.th}>Limits</th><th style={styles.th}>Features</th><th style={styles.th}>Mode</th><th style={styles.th}>Evidence</th></tr></thead><tbody>{data.plan_definitions.map((plan) => <tr key={plan.plan_code}><td style={styles.td}><strong>{plan.plan_code}</strong></td><td style={styles.td}>{plan.commercial_tier}</td><td style={styles.td}><Chips values={plan.required_limits} /></td><td style={styles.td}><Chips values={plan.required_feature_flags} /></td><td style={styles.td}>{plan.recommended_enforcement_mode}</td><td style={styles.td}><Link style={styles.evidenceLink} to={`/platform/license-plan-enforcement?plan_code=${encodeURIComponent(plan.plan_code)}`}>Filter tenants</Link></td></tr>)}</tbody></table></div>
    </section> : null}

    <section style={styles.card}>
      <h2 style={styles.cardTitle}>Tenant enforcement evidence</h2>
      <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Tenant</th><th style={styles.th}>Billing</th><th style={styles.th}>Plan</th><th style={styles.th}>Missing limits</th><th style={styles.th}>Missing features</th><th style={styles.th}>Gaps</th><th style={styles.th}>Evidence</th></tr></thead><tbody>{items.map((item) => <tr key={item.tenant_id}><td style={styles.td}><strong>{item.tenant_name}</strong><br /><span style={styles.help}>{item.tenant_status} · {item.enforcement_state}</span></td><td style={styles.td}>{item.billing_status}</td><td style={styles.td}>{item.plan_code || '—'}<br /><span style={styles.help}>{item.commercial_tier || '—'} · {item.recommended_enforcement_mode || '—'}</span></td><td style={styles.td}><Chips values={item.missing_limits} /></td><td style={styles.td}><Chips values={item.missing_feature_flags} /></td><td style={styles.td}><Chips values={item.enforcement_gaps} /></td><td style={styles.td}><div style={styles.evidenceLinks}><Link style={styles.evidenceLink} to={`/platform/tenants?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant record</Link><Link style={styles.evidenceLink} to={`/platform/billing?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Billing record</Link><Link style={styles.evidenceLink} to={`/platform/subscription-readiness?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Subscription readiness</Link><Link style={styles.evidenceLink} to={`/platform/audit?tenant_id=${encodeURIComponent(item.tenant_id)}&category=billing`}>Billing audit</Link></div></td></tr>)}{!items.length ? <tr><td style={styles.td} colSpan={7}>No license enforcement rows available.</td></tr> : null}</tbody></table></div>
    </section>
  </div>;
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
  helpBlock: { color: '#6b7280', fontSize: 13, marginTop: -4 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px 8px', color: '#374151', fontSize: 13 },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 8px', verticalAlign: 'top' },
  evidenceLinks: { display: 'flex', flexDirection: 'column', gap: 6 },
  evidenceLink: { color: '#2563eb', fontSize: 12, fontWeight: 700, textDecoration: 'none' }
};
