import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type ReportItem = {
  type: string;
  id: string;
  title?: string;
  name?: string;
  tenant_name?: string | null;
  status?: string;
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
  if (value.includes('blocked') || value.includes('overdue')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('review')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function FlagList({ flags }: { flags: string[] }) {
  if (!flags.length) return <span style={styles.help}>No flags</span>;
  return <div style={styles.flags}>{flags.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>)}</div>;
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

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Legal & compliance reporting</h1>
          <p style={styles.subtitle}>Commercial readiness posture for legal documents, privacy requests, access reviews, compliance risks, and vendors.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
      </header>

      {reportQuery.isLoading ? <section style={styles.card}>Loading legal compliance reporting…</section> : null}
      {reportQuery.error ? <section style={styles.card}>Unable to load legal compliance reporting.</section> : null}

      {summary ? (
        <section style={styles.summaryGrid}>
          <div style={styles.card}><strong>Total report items</strong><div style={styles.metric}>{summary.total_report_items}</div></div>
          <div style={styles.card}><strong>Requiring review</strong><div style={styles.metric}>{summary.items_requiring_review}</div></div>
          <div style={styles.card}><strong>Expired / expiring documents</strong><div style={styles.metric}>{summary.expired_or_expiring_documents}</div></div>
          <div style={styles.card}><strong>Overdue privacy requests</strong><div style={styles.metric}>{summary.overdue_privacy_requests}</div></div>
          <div style={styles.card}><strong>Overdue access reviews</strong><div style={styles.metric}>{summary.overdue_access_reviews}</div></div>
          <div style={styles.card}><strong>High compliance risks</strong><div style={styles.metric}>{summary.open_high_compliance_risks}</div></div>
          <div style={styles.card}><strong>Vendor legal reviews</strong><div style={styles.metric}>{summary.vendors_requiring_legal_review}</div></div>
          <div style={styles.card}><strong>Tenants with findings</strong><div style={styles.metric}>{summary.tenants_with_legal_findings}</div></div>
        </section>
      ) : null}

      {data ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Reporting controls</h2>
          <p style={styles.subtitle}>Read-only: {String(data.reporting_controls.read_only)} · No subject data export: {String(data.reporting_controls.no_subject_data_export)} · No document body export: {String(data.reporting_controls.no_document_body_export)} · No secret export: {String(data.reporting_controls.no_secret_export)}</p>
          <p style={styles.subtitle}>Correlated postures: compliance export {data.correlated_postures.compliance_export_package}; integration monitoring {data.correlated_postures.integration_monitoring_surface}</p>
          <div style={styles.flags}>{data.reporting_controls.mutation_owners.map((owner) => <span key={owner} style={styles.flag}>{owner}</span>)}</div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Legal/compliance evidence</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Item</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>State</th>
                <th style={styles.th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((item) => (
                <tr key={`${item.type}:${item.id}`}>
                  <td style={styles.td}><strong>{item.title || item.name || item.id}</strong></td>
                  <td style={styles.td}>{item.type}</td>
                  <td style={styles.td}>{item.tenant_name || 'Platform-wide'}</td>
                  <td style={styles.td}><span style={badgeStyle(item.report_state)}>{item.report_state}</span></td>
                  <td style={styles.td}><FlagList flags={item.risk_flags} /></td>
                </tr>
              ))}
              {!evidence.length ? <tr><td style={styles.td} colSpan={5}>No legal/compliance evidence available for reporting review.</td></tr> : null}
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
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metric: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  cardTitle: { margin: '0 0 10px', fontSize: 18 },
  flags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  flag: { background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  help: { color: '#6b7280', fontSize: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px 8px', color: '#374151', fontSize: 13 },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 8px', verticalAlign: 'top' }
};
