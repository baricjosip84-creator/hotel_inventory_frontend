import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type ReportItem = {
  type: string;
  id: string;
  tenant_id?: string | null;
  title?: string;
  name?: string;
  tenant_name?: string | null;
  status?: string;
  owner_email?: string | null;
  risk_flags: string[];
  report_state: string;
};

type LegalComplianceReport = {
  feature: string;
  phase: number;
  step: number;
  posture: string;
  summary: {
    total_report_items: number;
    legal_documents: number;
    privacy_requests: number;
    access_reviews: number;
    compliance_risks: number;
    vendors: number;
    items_requiring_review: number;
    expired_or_expiring_documents: number;
    overdue_privacy_requests: number;
    overdue_access_reviews: number;
    open_high_compliance_risks: number;
    vendors_requiring_legal_review: number;
    tenants_with_legal_findings: number;
  };
  reporting_controls: {
    read_only: boolean;
    mutation_owners: string[];
    source_routes: string[];
    no_subject_data_export: boolean;
    no_secret_export: boolean;
    no_document_body_export: boolean;
    correlates_existing_surfaces: string[];
  };
  correlated_postures: {
    compliance_export_package: string;
    integration_monitoring_surface: string;
  };
  documents: ReportItem[];
  privacy_requests: ReportItem[];
  access_reviews: ReportItem[];
  compliance_risks: ReportItem[];
  vendors: ReportItem[];
};

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('overdue') || value.includes('high')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('review') || value.includes('open')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function FlagList({ flags }: { flags: string[] }) {
  if (!flags.length) return <span style={styles.help}>No flags</span>;
  return <div style={styles.flags}>{flags.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>)}</div>;
}

function sourceLabel(route: string) {
  return route.replace('/api/platform/', '').replace(/-/g, ' ');
}

function SourceLink({ href, children }: { href: string; children: string }) {
  return <a href={href} style={styles.sourceLink}>{children}</a>;
}

function itemLabel(item: ReportItem) {
  return item.title || item.name || item.id;
}

function sourceHrefFor(item: ReportItem) {
  switch (item.type) {
    case 'legal_document':
      return '/platform/compliance-documents';
    case 'privacy_request':
      return '/platform/privacy-requests';
    case 'access_review':
      return '/platform/access-reviews';
    case 'compliance_risk':
      return '/platform/risk-register';
    case 'vendor_legal':
      return '/platform/vendors';
    default:
      return '/platform/legal-compliance-reporting';
  }
}

function sourceTextFor(item: ReportItem) {
  switch (item.type) {
    case 'legal_document':
      return 'Fix in Compliance Docs';
    case 'privacy_request':
      return 'Fix in Privacy Requests';
    case 'access_review':
      return 'Fix in Access Reviews';
    case 'compliance_risk':
      return 'Fix in Risk Register';
    case 'vendor_legal':
      return 'Fix in Vendors';
    default:
      return 'Open source area';
  }
}

export default function PlatformLegalComplianceReportingPage() {
  const reportQuery = useQuery({
    queryKey: ['platform', 'legal-compliance-reporting'],
    queryFn: () => platformApiRequest<LegalComplianceReport>('/platform/legal-compliance-reporting/report')
  });

  const data = reportQuery.data;
  const summary = data?.summary;
  const evidence: ReportItem[] = [
    ...(data?.documents || []),
    ...(data?.privacy_requests || []),
    ...(data?.access_reviews || []),
    ...(data?.compliance_risks || []),
    ...(data?.vendors || [])
  ];
  const isRefreshing = reportQuery.isFetching && !reportQuery.isLoading;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Legal & compliance reporting</h1>
          <p style={styles.subtitle}>Read-only commercial readiness posture for legal documents, privacy requests, access reviews, compliance risks, vendors, and correlated compliance surfaces.</p>
          <div style={styles.metaRow}>
            <span style={styles.metaPill}>Source: /platform/legal-compliance-reporting/report</span>
            <span style={styles.metaPill}>Mode: controlled read-only report</span>
            {data ? <span style={styles.metaPill}>Phase {data.phase} · Step {data.step}</span> : null}
            {data ? <span style={styles.metaPill}>Feature: {data.feature}</span> : null}
          </div>
        </div>
        <div style={styles.headerActions}>
          {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
          <button type="button" style={styles.primaryButton} onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {reportQuery.isLoading ? <section style={styles.card}>Loading legal compliance reporting…</section> : null}
      {reportQuery.error ? (
        <section style={styles.errorCard}>
          <strong>Unable to load legal compliance reporting.</strong>
          <p style={styles.subtitle}>The backend report snapshot could not be loaded. Retry after checking platform compliance read access and backend availability.</p>
          <button type="button" style={styles.primaryButton} onClick={() => reportQuery.refetch()} disabled={reportQuery.isFetching}>Retry</button>
        </section>
      ) : null}

      {summary ? (
        <section style={styles.summaryGrid}>
          <div style={styles.card}><strong>Total report items</strong><div style={styles.metric}>{summary.total_report_items}</div><span style={styles.help}>{summary.legal_documents} docs · {summary.privacy_requests} privacy · {summary.access_reviews} reviews</span></div>
          <div style={styles.card}><strong>Requiring review</strong><div style={styles.metric}>{summary.items_requiring_review}</div><span style={styles.help}>Rows with one or more flags</span></div>
          <div style={styles.card}><strong>Expired / expiring documents</strong><div style={styles.metric}>{summary.expired_or_expiring_documents}</div><span style={styles.help}>Legal document validity window</span></div>
          <div style={styles.card}><strong>Overdue privacy requests</strong><div style={styles.metric}>{summary.overdue_privacy_requests}</div><span style={styles.help}>Blocking privacy queue signal</span></div>
          <div style={styles.card}><strong>Overdue access reviews</strong><div style={styles.metric}>{summary.overdue_access_reviews}</div><span style={styles.help}>Access governance signal</span></div>
          <div style={styles.card}><strong>High compliance risks</strong><div style={styles.metric}>{summary.open_high_compliance_risks}</div><span style={styles.help}>{summary.compliance_risks} compliance risk rows</span></div>
          <div style={styles.card}><strong>Vendor legal reviews</strong><div style={styles.metric}>{summary.vendors_requiring_legal_review}</div><span style={styles.help}>{summary.vendors} vendor rows checked</span></div>
          <div style={styles.card}><strong>Tenants with findings</strong><div style={styles.metric}>{summary.tenants_with_legal_findings}</div><span style={styles.help}>Tenant-linked flagged rows</span></div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Supporting Platform pages</h2>
        <div style={styles.linkGrid}>
          <SourceLink href="/platform/compliance-documents">Compliance Docs</SourceLink>
          <SourceLink href="/platform/privacy-requests">Privacy Requests</SourceLink>
          <SourceLink href="/platform/access-reviews">Access Reviews</SourceLink>
          <SourceLink href="/platform/risk-register">Risk Register</SourceLink>
          <SourceLink href="/platform/vendors">Vendors</SourceLink>
          <SourceLink href="/platform/compliance-export">Compliance Export</SourceLink>
          <SourceLink href="/platform/integration-monitoring">Integration Monitoring</SourceLink>
        </div>
      </section>

      {data ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Reporting controls</h2>
          <div style={styles.metadataGrid}>
            <div><strong>Read-only</strong><br /><span style={styles.help}>{String(data.reporting_controls.read_only)}</span></div>
            <div><strong>No subject data export</strong><br /><span style={styles.help}>{String(data.reporting_controls.no_subject_data_export)}</span></div>
            <div><strong>No document body export</strong><br /><span style={styles.help}>{String(data.reporting_controls.no_document_body_export)}</span></div>
            <div><strong>No secret export</strong><br /><span style={styles.help}>{String(data.reporting_controls.no_secret_export)}</span></div>
            <div><strong>Compliance export posture</strong><br /><span style={styles.help}>{data.correlated_postures.compliance_export_package}</span></div>
            <div><strong>Integration posture</strong><br /><span style={styles.help}>{data.correlated_postures.integration_monitoring_surface}</span></div>
          </div>
          <h3 style={styles.smallTitle}>Mutation owners</h3>
          <div style={styles.flags}>{data.reporting_controls.mutation_owners.map((owner) => <span key={owner} style={styles.flag}>{owner}</span>)}</div>
          <h3 style={styles.smallTitle}>Source routes</h3>
          <div style={styles.flags}>{data.reporting_controls.source_routes.map((route) => <span key={route} style={styles.flag}>{sourceLabel(route)}</span>)}</div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Legal/compliance evidence</h2>
        <p style={styles.subtitle}>Rows are classified by backend risk flags. Use the source links to fix records on the owning page, then Refresh this report snapshot.</p>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>State</th>
                <th style={styles.th}>Flags</th>
                <th style={styles.th}>Source</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <tr key={`${item.type}:${item.id}`}>
                  <td style={styles.td}>
                    <strong>{itemLabel(item)}</strong><br />
                    <span style={styles.help}>{item.status || 'status unavailable'}{item.owner_email ? ` · ${item.owner_email}` : ''}</span>
                  </td>
                  <td style={styles.td}>{item.type}</td>
                  <td style={styles.td}>{item.tenant_name || 'Platform-wide'}</td>
                  <td style={styles.td}><span style={badgeStyle(item.report_state)}>{item.report_state}</span></td>
                  <td style={styles.td}><FlagList flags={item.risk_flags} /></td>
                  <td style={styles.td}>
                    <a href={sourceHrefFor(item)} style={styles.sourceLink}>{sourceTextFor(item)}</a>
                    {item.tenant_id ? <><br /><a href={`/platform/tenants/${item.tenant_id}`} style={styles.sourceLink}>Tenant source</a></> : null}
                  </td>
                </tr>
              ))}
              {!evidence.length ? <tr><td style={styles.td} colSpan={6}>No legal/compliance evidence available for reporting review.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  errorCard: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metric: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  cardTitle: { margin: '0 0 10px', fontSize: 18 },
  smallTitle: { margin: '14px 0 8px', fontSize: 14 },
  flags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  flag: { background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  help: { color: '#6b7280', fontSize: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px 8px', color: '#374151', fontSize: 13 },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 8px', verticalAlign: 'top' },
  primaryButton: { border: '1px solid #1d4ed8', background: '#1d4ed8', color: '#fff', borderRadius: 10, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaPill: { background: '#f3f4f6', color: '#374151', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  linkGrid: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  sourceLink: { color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }
};
