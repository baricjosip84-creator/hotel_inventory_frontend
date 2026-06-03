import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type ComplianceDocumentPackageRow = {
  id: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  title: string;
  document_type: string;
  status: string;
  owner_email?: string | null;
  external_url_present: boolean;
  expires_at?: string | null;
  reviewed_at?: string | null;
  days_until_expiration?: number | null;
  risk_flags: string[];
  package_ready: boolean;
};

type ComplianceExportPackage = {
  feature: string;
  phase: number;
  step: number;
  posture: string;
  summary: {
    total_documents: number;
    active_documents: number;
    documents_requiring_review: number;
    documents_expiring_soon: number;
    documents_missing_external_evidence: number;
    required_document_types: string[];
    missing_required_document_types: string[];
    total_privacy_requests: number;
    open_privacy_requests: number;
    open_blocking_privacy_requests: number;
    overdue_privacy_requests: number;
    total_tenants: number;
    tenants_with_export_evidence: number;
    tenants_missing_export_evidence: number;
    tenants_with_retention_holds: number;
    tenants_due_for_retention_review: number;
    permission_attention_required: number;
    users_requiring_permission_review: number;
    api_keys_requiring_permission_review: number;
  };
  governance_controls: {
    read_only: boolean;
    export_package_owner: string;
    mutation_owner: string;
    source_routes: string[];
    no_raw_secret_export: boolean;
    no_subject_data_export: boolean;
  };
  documents: ComplianceDocumentPackageRow[];
};

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('review')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function FlagList({ flags }: { flags: string[] }) {
  if (!flags.length) return <span style={styles.help}>No flags</span>;
  return <div style={styles.flags}>{flags.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>)}</div>;
}

function dateOnly(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function PlatformComplianceExportPage() {
  const packageQuery = useQuery({
    queryKey: ['platform', 'compliance-export', 'package'],
    queryFn: () => platformApiRequest<ComplianceExportPackage>('/platform/compliance-export/package')
  });

  const data = packageQuery.data;
  const summary = data?.summary;
  const documents = data?.documents || [];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Compliance export package</h1>
          <p style={styles.subtitle}>Read-only commercial readiness package for compliance documents, privacy queue, tenant export evidence, audit retention, and permission review posture.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
      </header>

      {packageQuery.isLoading ? <section style={styles.card}>Loading compliance export package…</section> : null}
      {packageQuery.error ? <section style={styles.card}>Unable to load compliance export package.</section> : null}

      {summary ? (
        <section style={styles.summaryGrid}>
          <div style={styles.card}><strong>Total documents</strong><div style={styles.metric}>{summary.total_documents}</div></div>
          <div style={styles.card}><strong>Documents requiring review</strong><div style={styles.metric}>{summary.documents_requiring_review}</div></div>
          <div style={styles.card}><strong>Missing external evidence</strong><div style={styles.metric}>{summary.documents_missing_external_evidence}</div></div>
          <div style={styles.card}><strong>Open privacy requests</strong><div style={styles.metric}>{summary.open_privacy_requests}</div></div>
          <div style={styles.card}><strong>Blocking privacy requests</strong><div style={styles.metric}>{summary.open_blocking_privacy_requests}</div></div>
          <div style={styles.card}><strong>Tenants missing export evidence</strong><div style={styles.metric}>{summary.tenants_missing_export_evidence}</div></div>
          <div style={styles.card}><strong>Retention holds</strong><div style={styles.metric}>{summary.tenants_with_retention_holds}</div></div>
          <div style={styles.card}><strong>Permission attention</strong><div style={styles.metric}>{summary.permission_attention_required}</div></div>
        </section>
      ) : null}

      {summary ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Missing required document types</h2>
          <div style={styles.flags}>
            {summary.missing_required_document_types.length
              ? summary.missing_required_document_types.map((type) => <span key={type} style={styles.flag}>{type}</span>)
              : <span style={styles.help}>All required document types are represented by active evidence.</span>}
          </div>
          <p style={styles.subtitle}>Required: {summary.required_document_types.join(', ')}</p>
        </section>
      ) : null}

      {data ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Governance controls</h2>
          <p style={styles.subtitle}>Read-only: {String(data.governance_controls.read_only)} · Mutation owner: {data.governance_controls.mutation_owner}</p>
          <p style={styles.subtitle}>No raw secret export: {String(data.governance_controls.no_raw_secret_export)} · No subject data export: {String(data.governance_controls.no_subject_data_export)}</p>
          <div style={styles.flags}>{data.governance_controls.source_routes.map((route) => <span key={route} style={styles.flag}>{route}</span>)}</div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Document package evidence</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Document</th>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>Owner</th>
                <th style={styles.th}>Expiration</th>
                <th style={styles.th}>Reviewed</th>
                <th style={styles.th}>Evidence</th>
                <th style={styles.th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td style={styles.td}><strong>{document.title}</strong><br /><span style={styles.help}>{document.document_type} · {document.status}</span></td>
                  <td style={styles.td}>{document.tenant_name || 'Platform-wide'}</td>
                  <td style={styles.td}>{document.owner_email || '—'}</td>
                  <td style={styles.td}>{dateOnly(document.expires_at)}<br /><span style={styles.help}>{document.days_until_expiration ?? '—'} days</span></td>
                  <td style={styles.td}>{dateOnly(document.reviewed_at)}</td>
                  <td style={styles.td}>{document.external_url_present ? 'External evidence linked' : 'Missing evidence link'}</td>
                  <td style={styles.td}><FlagList flags={document.risk_flags} /></td>
                </tr>
              ))}
              {!documents.length ? <tr><td style={styles.td} colSpan={7}>No compliance export package documents available.</td></tr> : null}
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
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
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
