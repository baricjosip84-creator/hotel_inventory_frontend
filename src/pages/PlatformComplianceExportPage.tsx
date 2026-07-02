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

function numberValue(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function isBadDate(value?: string | null) {
  return Boolean(value) && Number.isNaN(new Date(value as string).getTime());
}

function sourceLabel(route: string) {
  return route.replace('/api/platform/', '').replace(/-/g, ' ');
}

function SourceLink({ href, children }: { href: string; children: string }) {
  return <a href={href} style={styles.sourceLink}>{children}</a>;
}

export default function PlatformComplianceExportPage() {
  const packageQuery = useQuery({
    queryKey: ['platform', 'compliance-export', 'package'],
    queryFn: () => platformApiRequest<ComplianceExportPackage>('/platform/compliance-export/package')
  });

  const data = packageQuery.data;
  const summary = data?.summary;
  const documents = data?.documents || [];
  const isRefreshing = packageQuery.isFetching && !packageQuery.isLoading;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Compliance export package</h1>
          <p style={styles.subtitle}>Read-only commercial readiness package for compliance documents, privacy queue, tenant export evidence, audit retention, and permission review posture.</p>
          <div style={styles.metaRow}>
            <span style={styles.metaPill}>Source: /platform/compliance-export/package</span>
            <span style={styles.metaPill}>Mode: controlled read-only snapshot</span>
            {data ? <span style={styles.metaPill}>Phase {data.phase} · Step {data.step}</span> : null}
            {data ? <span style={styles.metaPill}>Feature: {data.feature}</span> : null}
          </div>
        </div>
        <div style={styles.headerActions}>
          {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
          <button type="button" style={styles.primaryButton} onClick={() => packageQuery.refetch()} disabled={packageQuery.isFetching}>
            {isRefreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {packageQuery.isLoading ? <section style={styles.card}>Loading compliance export package…</section> : null}
      {packageQuery.error ? (
        <section style={styles.errorCard}>
          <strong>Unable to load compliance export package.</strong>
          <p style={styles.subtitle}>The backend package snapshot could not be loaded. Retry after checking platform compliance read access and backend availability.</p>
          <button type="button" style={styles.primaryButton} onClick={() => packageQuery.refetch()} disabled={packageQuery.isFetching}>Retry</button>
        </section>
      ) : null}

      {summary ? (
        <section style={styles.summaryGrid}>
          <div style={styles.card}><strong>Total documents</strong><div style={styles.metric}>{summary.total_documents}</div><span style={styles.help}>Package rows returned</span></div>
          <div style={styles.card}><strong>Active documents</strong><div style={styles.metric}>{summary.active_documents}</div><span style={styles.help}>Currently active evidence</span></div>
          <div style={styles.card}><strong>Documents requiring review</strong><div style={styles.metric}>{summary.documents_requiring_review}</div><span style={styles.help}>Rows with one or more flags</span></div>
          <div style={styles.card}><strong>Expiring soon</strong><div style={styles.metric}>{summary.documents_expiring_soon}</div><span style={styles.help}>45-day document window</span></div>
          <div style={styles.card}><strong>Missing external evidence</strong><div style={styles.metric}>{summary.documents_missing_external_evidence}</div><span style={styles.help}>No evidence link on source record</span></div>
          <div style={styles.card}><strong>Open privacy requests</strong><div style={styles.metric}>{summary.open_privacy_requests}</div><span style={styles.help}>{summary.overdue_privacy_requests} overdue</span></div>
          <div style={styles.card}><strong>Blocking privacy requests</strong><div style={styles.metric}>{summary.open_blocking_privacy_requests}</div><span style={styles.help}>Blocking open statuses</span></div>
          <div style={styles.card}><strong>Tenants missing export evidence</strong><div style={styles.metric}>{summary.tenants_missing_export_evidence}</div><span style={styles.help}>{summary.tenants_with_export_evidence}/{summary.total_tenants} with evidence</span></div>
          <div style={styles.card}><strong>Retention holds</strong><div style={styles.metric}>{summary.tenants_with_retention_holds}</div><span style={styles.help}>{summary.tenants_due_for_retention_review} due for retention review</span></div>
          <div style={styles.card}><strong>Permission attention</strong><div style={styles.metric}>{summary.permission_attention_required}</div><span style={styles.help}>{summary.users_requiring_permission_review} users · {summary.api_keys_requiring_permission_review} API keys</span></div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Supporting Platform pages</h2>
        <div style={styles.linkGrid}>
          <SourceLink href="/platform/compliance-documents">Compliance Docs</SourceLink>
          <SourceLink href="/platform/privacy-requests">Privacy Requests</SourceLink>
          <SourceLink href="/platform/tenant-exports">Tenant Exports</SourceLink>
          <SourceLink href="/platform/audit-retention">Audit Retention</SourceLink>
          <SourceLink href="/platform/permission-audit">Permission Audit</SourceLink>
          <SourceLink href="/platform/access-reviews">Access Reviews</SourceLink>
        </div>
      </section>

      {summary ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Missing required document types</h2>
          <div style={styles.flags}>
            {summary.missing_required_document_types.length
              ? summary.missing_required_document_types.map((type) => <span key={type} style={styles.dangerFlag}>{type}</span>)
              : <span style={styles.help}>All required document types are represented by active evidence.</span>}
          </div>
          <p style={styles.subtitle}>Required: {summary.required_document_types.join(', ')}</p>
          <p style={styles.help}>Correction owner: Compliance Docs. Add or update active dpa, security, privacy, and subprocessor evidence there.</p>
        </section>
      ) : null}

      {data ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Governance controls</h2>
          <div style={styles.metadataGrid}>
            <div><strong>Read-only</strong><br /><span style={styles.help}>{String(data.governance_controls.read_only)}</span></div>
            <div><strong>Export package owner</strong><br /><span style={styles.help}>{data.governance_controls.export_package_owner}</span></div>
            <div><strong>Mutation owner</strong><br /><span style={styles.help}>{data.governance_controls.mutation_owner}</span></div>
            <div><strong>No raw secret export</strong><br /><span style={styles.help}>{String(data.governance_controls.no_raw_secret_export)}</span></div>
            <div><strong>No subject data export</strong><br /><span style={styles.help}>{String(data.governance_controls.no_subject_data_export)}</span></div>
            <div><strong>Document row limit</strong><br /><span style={styles.help}>Backend package returns up to 250 document rows.</span></div>
          </div>
          <h3 style={styles.smallTitle}>Source routes</h3>
          <div style={styles.flags}>{data.governance_controls.source_routes.map((route) => <span key={route} style={styles.flag}>{sourceLabel(route)}</span>)}</div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Document package evidence</h2>
        <p style={styles.subtitle}>Rows are classified by backend document risk flags. Use the evidence links to fix source records, then Refresh this package snapshot.</p>
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
                <th style={styles.th}>Source</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => {
                const expirationInvalid = isBadDate(document.expires_at);
                const reviewedInvalid = isBadDate(document.reviewed_at);
                return (
                  <tr key={document.id}>
                    <td style={styles.td}>
                      <strong>{document.title}</strong><br />
                      <span style={styles.help}>{document.document_type} · {document.status}</span><br />
                      <span style={document.package_ready ? styles.readyText : styles.reviewText}>{document.package_ready ? 'Package ready' : 'Needs source review'}</span>
                    </td>
                    <td style={styles.td}>{document.tenant_name || 'Platform-wide'}</td>
                    <td style={styles.td}>{document.owner_email || '—'}</td>
                    <td style={styles.td}>{expirationInvalid ? 'Invalid date' : dateOnly(document.expires_at)}<br /><span style={styles.help}>{numberValue(document.days_until_expiration)} days</span></td>
                    <td style={styles.td}>{reviewedInvalid ? 'Invalid date' : dateOnly(document.reviewed_at)}</td>
                    <td style={styles.td}>{document.external_url_present ? 'External evidence linked' : 'Missing evidence link'}</td>
                    <td style={styles.td}><FlagList flags={document.risk_flags} /></td>
                    <td style={styles.td}>
                      <a href="/platform/compliance-documents" style={styles.sourceLink}>Fix in Compliance Docs</a>
                      {document.tenant_id ? <><br /><a href={`/platform/tenants/${document.tenant_id}`} style={styles.sourceLink}>Tenant source</a></> : null}
                    </td>
                  </tr>
                );
              })}
              {!documents.length ? <tr><td style={styles.td} colSpan={8}>No compliance export package documents available.</td></tr> : null}
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
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  errorCard: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metric: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  cardTitle: { margin: '0 0 10px', fontSize: 18 },
  smallTitle: { margin: '14px 0 8px', fontSize: 14 },
  flags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  flag: { background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  dangerFlag: { background: '#fee2e2', color: '#991b1b', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  help: { color: '#6b7280', fontSize: 12 },
  readyText: { color: '#166534', fontSize: 12, fontWeight: 700 },
  reviewText: { color: '#92400e', fontSize: 12, fontWeight: 700 },
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
