import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type TenantAuditRetention = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  retention_policy: string;
  retention_days: number;
  retain_until?: string | null;
  legal_hold: boolean;
  audit_event_count: number;
  audit_export_events: number;
  first_audit_event_at?: string | null;
  last_audit_event_at?: string | null;
  audit_age_days?: number | null;
  due_for_retention_review: boolean;
  purge_blocked: boolean;
  risk_flags: string[];
};

type AuditRetentionPolicy = {
  feature: string;
  phase: number;
  step: number;
  posture: string;
  summary: {
    total_tenants: number;
    tenants_with_audit_events: number;
    tenants_due_for_retention_review: number;
    tenants_with_legal_hold: number;
    tenants_with_purge_blocked: number;
    tenants_missing_export_evidence: number;
    tenants_with_extended_retention: number;
  };
  governance_controls: {
    read_only: boolean;
    deletion_owner: string;
    mutation_owner: string;
    source_routes: string[];
    default_audit_retention_days: number;
    extended_audit_retention_days: number;
  };
  tenants: TenantAuditRetention[];
};

function badgeStyle(value: string): CSSProperties {
  if (value.includes('hold')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('review')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function FlagList({ flags }: { flags: string[] }) {
  if (!flags.length) return <span style={styles.help}>No flags</span>;
  return <div style={styles.flags}>{flags.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>)}</div>;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function PlatformAuditRetentionPage() {
  const policy = useQuery({
    queryKey: ['platform', 'audit-retention', 'policy'],
    queryFn: () => platformApiRequest<AuditRetentionPolicy>('/platform/audit-retention/policy')
  });

  const data = policy.data;
  const summary = data?.summary;
  const tenants = data?.tenants || [];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Audit retention policy</h1>
          <p style={styles.subtitle}>Read-only enterprise posture for audit-log age, export evidence, legal holds, and tenant data-retention blockers.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
      </header>

      {policy.isLoading ? <section style={styles.card}>Loading audit retention posture…</section> : null}
      {policy.error ? <section style={styles.card}>Unable to load audit retention posture.</section> : null}

      {summary ? (
        <section style={styles.summaryGrid}>
          <div style={styles.card}><strong>Total tenants</strong><div style={styles.metric}>{summary.total_tenants}</div></div>
          <div style={styles.card}><strong>Tenants with audit events</strong><div style={styles.metric}>{summary.tenants_with_audit_events}</div></div>
          <div style={styles.card}><strong>Tenants due for review</strong><div style={styles.metric}>{summary.tenants_due_for_retention_review}</div></div>
          <div style={styles.card}><strong>Legal holds</strong><div style={styles.metric}>{summary.tenants_with_legal_hold}</div></div>
          <div style={styles.card}><strong>Purge blocked</strong><div style={styles.metric}>{summary.tenants_with_purge_blocked}</div></div>
          <div style={styles.card}><strong>Tenants missing export evidence</strong><div style={styles.metric}>{summary.tenants_missing_export_evidence}</div></div>
          <div style={styles.card}><strong>Extended retention</strong><div style={styles.metric}>{summary.tenants_with_extended_retention}</div></div>
        </section>
      ) : null}

      {data ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Governance controls</h2>
          <p style={styles.subtitle}>Read-only: {String(data.governance_controls.read_only)} · Deletion owner: {data.governance_controls.deletion_owner}</p>
          <p style={styles.subtitle}>Mutation owner: {data.governance_controls.mutation_owner}</p>
          <div style={styles.flags}>{data.governance_controls.source_routes.map((route) => <span key={route} style={styles.flag}>{route}</span>)}</div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Tenant audit retention posture</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>Policy</th>
                <th style={styles.th}>Audit events</th>
                <th style={styles.th}>Audit age</th>
                <th style={styles.th}>Retain until</th>
                <th style={styles.th}>Legal hold</th>
                <th style={styles.th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.tenant_id}>
                  <td style={styles.td}><strong>{tenant.tenant_name}</strong><br /><span style={styles.help}>{tenant.tenant_status}</span></td>
                  <td style={styles.td}>{tenant.retention_policy}<br /><span style={styles.help}>{tenant.retention_days} days</span></td>
                  <td style={styles.td}>{tenant.audit_event_count}<br /><span style={styles.help}>{tenant.audit_export_events} exports</span></td>
                  <td style={styles.td}>{tenant.audit_age_days ?? '—'} days<br /><span style={styles.help}>{formatDate(tenant.first_audit_event_at)} → {formatDate(tenant.last_audit_event_at)}</span></td>
                  <td style={styles.td}>{formatDate(tenant.retain_until)}</td>
                  <td style={styles.td}>{tenant.legal_hold ? 'Yes' : 'No'}</td>
                  <td style={styles.td}><FlagList flags={tenant.risk_flags} /></td>
                </tr>
              ))}
              {!tenants.length ? <tr><td style={styles.td} colSpan={7}>No tenant audit retention posture available.</td></tr> : null}
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
