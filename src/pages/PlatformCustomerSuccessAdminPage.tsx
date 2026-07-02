import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { platformApiRequest } from '../lib/platformApi';

type RiskFlag = { code: string; severity: string; points: number; message: string };
type CustomerSuccessItem = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  billing_status: string;
  plan_code?: string | null;
  primary_contacts: number;
  open_tasks: number;
  open_urgent_tasks: number;
  overdue_tasks: number;
  unresolved_follow_ups: number;
  days_since_last_touch?: number | null;
  open_support_sessions: number;
  open_incidents: number;
  subscription_readiness_state: string;
  license_enforcement_state: string;
  success_risk_score: number;
  customer_success_state: string;
  risk_flags: RiskFlag[];
  recommended_admin_actions: string[];
};
type CustomerSuccessPackage = { posture: string; health_states: string[]; summary: Record<string, number>; items: CustomerSuccessItem[] };
type Tenant = { id: string; name: string; status?: string };
type FilterState = { tenant_id: string; state: string };

const healthStates = ['customer_success_ready', 'customer_success_watch', 'customer_success_at_risk'];
const metrics = ['tenants_reviewed', 'ready_tenants', 'watch_tenants', 'at_risk_tenants', 'tenants_missing_primary_contact', 'tenants_with_overdue_tasks', 'tenants_with_unresolved_follow_ups', 'tenants_with_support_escalations'];

function badgeStyle(value: string): CSSProperties {
  if (value.includes('risk')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('watch')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function severityStyle(value: string): CSSProperties {
  if (value === 'critical' || value === 'high') return { ...styles.flag, background: '#fee2e2', color: '#991b1b' };
  if (value === 'medium' || value === 'warning') return { ...styles.flag, background: '#fef3c7', color: '#92400e' };
  return styles.flag;
}

function Chips({ values }: { values: string[] }) {
  return <div style={styles.flags}>{values.length ? values.map((value) => <span key={value} style={styles.flag}>{value}</span>) : <span style={styles.help}>None</span>}</div>;
}

function RiskChips({ values }: { values: RiskFlag[] }) {
  return <div style={styles.flags}>{values.length ? values.map((flag) => <span key={flag.code} style={severityStyle(flag.severity)} title={`${flag.message} (${flag.points} points)`}>{flag.code} · {flag.points}</span>) : <span style={styles.help}>None</span>}</div>;
}

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function metricLabel(value: string) {
  return value.replaceAll('_', ' ');
}

function buildQuery(filters: FilterState) {
  const params = new URLSearchParams();
  if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
  if (filters.state) params.set('state', filters.state);
  const query = params.toString();
  return query ? `/platform/customer-success-admin?${query}` : '/platform/customer-success-admin';
}

function actionTarget(action: string, tenantId: string) {
  switch (action) {
    case 'assign_primary_customer_contact':
      return `/platform/tenant-contacts?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'schedule_customer_check_in':
    case 'resolve_customer_follow_ups':
      return `/platform/communications?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'clear_customer_success_task_backlog':
      return `/platform/tenant-tasks?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'review_subscription_billing_blockers':
      return `/platform/subscription-readiness?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'review_license_plan_enforcement_blockers':
      return `/platform/license-plan-enforcement?tenant_id=${encodeURIComponent(tenantId)}`;
    case 'coordinate_support_escalation':
      return `/platform/support-sessions?tenant_id=${encodeURIComponent(tenantId)}`;
    default:
      return `/platform/tenants?tenant_id=${encodeURIComponent(tenantId)}`;
  }
}

export default function PlatformCustomerSuccessAdminPage() {
  const [filters, setFilters] = useState<FilterState>({ tenant_id: '', state: '' });
  const endpoint = useMemo(() => buildQuery(filters), [filters]);

  const successQuery = useQuery({
    queryKey: ['platform', 'customer-success-admin', filters],
    queryFn: () => platformApiRequest<CustomerSuccessPackage>(endpoint)
  });
  const tenantsQuery = useQuery({
    queryKey: ['platform', 'tenants', 'customer-success-admin-filter'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const data = successQuery.data;
  const summary = data?.summary || {};
  const items = data?.items || [];
  const selectedTenantName = tenantsQuery.data?.find((tenant) => tenant.id === filters.tenant_id)?.name || filters.tenant_id || 'All tenants';
  const hasFilters = Boolean(filters.tenant_id || filters.state);
  const atRiskCount = summary.at_risk_tenants ?? items.filter((item) => item.customer_success_state === 'customer_success_at_risk').length;
  const watchCount = summary.watch_tenants ?? items.filter((item) => item.customer_success_state === 'customer_success_watch').length;

  async function refreshAll() {
    await Promise.all([successQuery.refetch(), tenantsQuery.refetch()]);
  }

  function clearFilters() {
    setFilters({ tenant_id: '', state: '' });
  }

  return <div style={styles.page}>
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>Customer success admin</h1>
        <p style={styles.subtitle}>Commercial admin cockpit for tenant success risk, lifecycle blockers, contacts, communications, support escalations, and recommended admin actions.</p>
      </div>
      <div style={styles.headerActions}>
        {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
        <button type="button" style={styles.secondaryButton} onClick={refreshAll} disabled={successQuery.isFetching || tenantsQuery.isFetching}>{successQuery.isFetching || tenantsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
      </div>
    </header>

    <section style={styles.metaPanel}>
      <div><strong>Snapshot source:</strong> GET {endpoint}</div>
      <div><strong>Tenant filter:</strong> {selectedTenantName}</div>
      <div><strong>Health filter:</strong> {filters.state || 'All health states'}</div>
      <div><strong>Displayed tenants:</strong> {items.length}</div>
      <div><strong>At-risk tenants:</strong> {atRiskCount}</div>
      <div><strong>Watch tenants:</strong> {watchCount}</div>
      <div><strong>Missing primary contact:</strong> {summary.tenants_missing_primary_contact ?? 0}</div>
      <div><strong>Support escalations:</strong> {summary.tenants_with_support_escalations ?? 0}</div>
    </section>

    <nav style={styles.supportLinks} aria-label="Supporting Platform pages">
      <Link style={styles.supportLink} to="/platform/tenant-contacts">Tenant Contacts</Link>
      <Link style={styles.supportLink} to="/platform/tenant-tasks">Tenant Tasks</Link>
      <Link style={styles.supportLink} to="/platform/communications">Communications</Link>
      <Link style={styles.supportLink} to="/platform/support-sessions">Support Sessions</Link>
      <Link style={styles.supportLink} to="/platform/incidents">Incidents</Link>
      <Link style={styles.supportLink} to="/platform/billing">Billing</Link>
      <Link style={styles.supportLink} to="/platform/subscription-readiness">Subscription Readiness</Link>
      <Link style={styles.supportLink} to="/platform/license-plan-enforcement">License Enforcement</Link>
      <Link style={styles.supportLink} to="/platform/audit">System Audit</Link>
    </nav>

    <section style={styles.card}>
      <h2 style={styles.cardTitle}>Customer success filters</h2>
      <div style={styles.filterGrid}>
        <label style={styles.label}>Tenant
          <select style={styles.input} value={filters.tenant_id} onChange={(event) => setFilters({ ...filters, tenant_id: event.target.value })}>
            <option value="">All tenants</option>
            {(tenantsQuery.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
          </select>
        </label>
        <label style={styles.label}>Health state
          <select style={styles.input} value={filters.state} onChange={(event) => setFilters({ ...filters, state: event.target.value })}>
            <option value="">All states</option>
            {healthStates.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        <div style={styles.filterActions}>
          <button type="button" style={styles.secondaryButton} onClick={() => successQuery.refetch()} disabled={successQuery.isFetching}>Apply / retry</button>
          {hasFilters ? <button type="button" style={styles.linkButton} onClick={clearFilters}>Clear filters</button> : null}
        </div>
      </div>
      {tenantsQuery.error ? <p style={styles.errorText}>Tenant filter failed to load: {readableError(tenantsQuery.error)}</p> : null}
    </section>

    {successQuery.isLoading ? <section style={styles.card}>Loading customer success admin tooling…</section> : null}
    {successQuery.error ? <section style={styles.errorPanel}><strong>Customer success admin tooling failed to load.</strong><span>{readableError(successQuery.error)}</span><button type="button" style={styles.retryButton} onClick={() => successQuery.refetch()}>Retry customer success</button></section> : null}

    {data ? <section style={styles.summaryGrid}>{metrics.map((key) => <div key={key} style={styles.card}><strong>{metricLabel(key)}</strong><div style={styles.metric}>{summary[key] ?? 0}</div></div>)}</section> : null}

    {data ? <section style={styles.card}>
      <h2 style={styles.cardTitle}>Health states</h2>
      <p style={styles.helpBlock}>Source: backend customer-success snapshot. State filters are backend-supported and this page remains read-only.</p>
      <Chips values={data.health_states} />
    </section> : null}

    <section style={styles.card}>
      <h2 style={styles.cardTitle}>Tenant customer success evidence</h2>
      <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Tenant</th><th style={styles.th}>Commercial state</th><th style={styles.th}>Contacts & tasks</th><th style={styles.th}>Touch & support</th><th style={styles.th}>Risk</th><th style={styles.th}>Actions</th><th style={styles.th}>Evidence</th></tr></thead><tbody>{items.map((item) => <tr key={item.tenant_id}><td style={styles.td}><strong>{item.tenant_name}</strong><br /><span style={styles.help}>{item.tenant_status} · {item.customer_success_state}</span></td><td style={styles.td}>{item.billing_status}<br /><span style={styles.help}>{item.plan_code || '—'} · {item.subscription_readiness_state} · {item.license_enforcement_state}</span></td><td style={styles.td}>Contacts: {item.primary_contacts}<br /><span style={styles.help}>Open: {item.open_tasks}, urgent: {item.open_urgent_tasks}, overdue: {item.overdue_tasks}</span></td><td style={styles.td}>Last touch: {item.days_since_last_touch ?? '—'} days<br /><span style={styles.help}>Follow-ups: {item.unresolved_follow_ups}, support: {item.open_support_sessions}, incidents: {item.open_incidents}</span></td><td style={styles.td}><strong>{item.success_risk_score}</strong><br /><RiskChips values={item.risk_flags} /></td><td style={styles.td}><div style={styles.evidenceLinks}>{item.recommended_admin_actions.length ? item.recommended_admin_actions.map((action) => <Link key={action} style={styles.evidenceLink} to={actionTarget(action, item.tenant_id)}>{action}</Link>) : <span style={styles.help}>None</span>}</div></td><td style={styles.td}><div style={styles.evidenceLinks}><Link style={styles.evidenceLink} to={`/platform/tenants?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant record</Link><Link style={styles.evidenceLink} to={`/platform/tenant-health?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Tenant health</Link><Link style={styles.evidenceLink} to={`/platform/billing?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Billing record</Link><Link style={styles.evidenceLink} to={`/platform/audit?tenant_id=${encodeURIComponent(item.tenant_id)}`}>Audit evidence</Link></div></td></tr>)}{!items.length ? <tr><td style={styles.td} colSpan={7}>No customer success admin rows available.</td></tr> : null}</tbody></table></div>
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
