import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type TenantLifecycleTenant = {
  id: string;
  name: string;
  location?: string | null;
  organization_type?: string | null;
  status: string;
  lifecycle_bucket: string;
  billing_status: string;
  plan_code: string;
  write_locked: boolean;
  readiness: 'commercially_ready' | 'attention_required' | 'blocked';
  blockers: string[];
  warnings: string[];
  feature_flag_count: number;
  limit_count: number;
  support_enabled: boolean;
  updated_at?: string | null;
};

type TenantLifecycleGovernance = {
  feature: string;
  phase: number;
  step: number;
  posture: string;
  summary: {
    total_tenants: number;
    active_lifecycle_tenants: number;
    attention_lifecycle_tenants: number;
    closed_lifecycle_tenants: number;
    write_locked_tenants: number;
    billing_attention_tenants: number;
    readiness_blocked_tenants: number;
    readiness_attention_tenants: number;
    commercially_ready_tenants: number;
    open_offboarding_tenants: number;
  };
  governance_controls: {
    source_routes: string[];
    read_only: boolean;
    mutation_owner: string;
  };
  tenants: TenantLifecycleTenant[];
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function formatToken(value: string) {
  return value.replace(/_/g, ' ');
}

const sourceRouteLinks: Record<string, string> = {
  '/api/platform/tenants': '/platform/tenants',
  '/api/platform/provisioning': '/platform/provisioning',
  '/api/platform/tenant-offboarding': '/platform/tenant-offboarding',
  '/api/platform/tenant-exports': '/platform/tenant-exports',
  '/api/platform/tenant-health': '/platform/tenant-health',
  '/api/platform/tenant-timeline': '/platform/tenant-timeline'
};

const supportingPages = [
  { label: 'Tenants', to: '/platform/tenants' },
  { label: 'Provisioning', to: '/platform/provisioning' },
  { label: 'Tenant Offboarding', to: '/platform/tenant-offboarding' },
  { label: 'Tenant Exports', to: '/platform/tenant-exports' },
  { label: 'Tenant Health', to: '/platform/tenant-health' },
  { label: 'Tenant Timeline', to: '/platform/tenant-timeline' }
];

function tenantEvidenceLinks(tenant: TenantLifecycleTenant) {
  const links = [
    { label: 'Tenants', to: '/platform/tenants' },
    { label: 'Timeline', to: `/platform/tenant-timeline?tenant_id=${tenant.id}` },
    { label: 'Health', to: `/platform/tenant-health?tenant_id=${tenant.id}` }
  ];

  if (tenant.status === 'offboarding' || tenant.blockers.includes('offboarding_in_progress')) {
    links.push({ label: 'Offboarding', to: '/platform/tenant-offboarding' });
  }
  if (tenant.warnings.some((warning) => warning.includes('billing')) || ['not_configured', 'past_due', 'cancelled'].includes(tenant.billing_status)) {
    links.push({ label: 'Billing', to: '/platform/billing' });
  }
  if (tenant.warnings.includes('commercial_limits_not_configured') || tenant.warnings.includes('feature_flags_not_configured') || tenant.write_locked) {
    links.push({ label: 'Tenant setup', to: '/platform/tenants' });
  }
  if (tenant.warnings.includes('support_policy_disabled')) {
    links.push({ label: 'Support cockpit', to: '/platform/support-operations-cockpit' });
  }

  return links;
}

export default function PlatformTenantLifecyclePage() {
  const q = useQuery({
    queryKey: ['platform', 'tenant-lifecycle', 'governance'],
    queryFn: () => platformApiRequest<TenantLifecycleGovernance>('/platform/tenant-lifecycle/governance')
  });

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1>Tenant lifecycle governance</h1>
          <p style={styles.muted}>Commercial readiness view across tenant creation, provisioning, support, exports, offboarding, billing posture, and lifecycle ownership.</p>
        </div>
        <button style={styles.button} type="button" onClick={() => q.refetch()} disabled={q.isFetching}>
          {q.isFetching ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {q.isLoading ? <section style={styles.panel}>Loading tenant lifecycle governance…</section> : null}
      {q.error ? (
        <section style={styles.error}>
          <span>{q.error instanceof Error ? q.error.message : 'Failed to load tenant lifecycle governance'}</span>
          <button style={styles.errorButton} type="button" onClick={() => q.refetch()} disabled={q.isFetching}>Retry</button>
        </section>
      ) : null}

      {q.data ? (
        <>
          <section style={styles.panel}>
            <h2>Commercial readiness</h2>
            <div style={styles.metadataGrid}>
              <div><strong>Snapshot source</strong><span>GET /platform/tenant-lifecycle/governance</span></div>
              <div><strong>Feature</strong><span>{q.data.feature}</span></div>
              <div><strong>Phase / step</strong><span>{q.data.phase} / {q.data.step}</span></div>
              <div><strong>Last refreshed</strong><span>{new Date().toLocaleString()}</span></div>
            </div>
            <div style={styles.cards}>
              <div style={styles.card}>Posture<br /><b>{formatToken(q.data.posture)}</b></div>
              <div style={styles.card}>Total tenants<br /><b>{q.data.summary.total_tenants}</b></div>
              <div style={styles.card}>Commercially ready<br /><b>{q.data.summary.commercially_ready_tenants}</b></div>
              <div style={styles.card}>Attention required<br /><b>{q.data.summary.readiness_attention_tenants}</b></div>
              <div style={styles.card}>Blocked<br /><b>{q.data.summary.readiness_blocked_tenants}</b></div>
              <div style={styles.card}>Billing attention<br /><b>{q.data.summary.billing_attention_tenants}</b></div>
              <div style={styles.card}>Write locked<br /><b>{q.data.summary.write_locked_tenants}</b></div>
              <div style={styles.card}>Offboarding<br /><b>{q.data.summary.open_offboarding_tenants}</b></div>
            </div>
          </section>

          <section style={styles.panel}>
            <h2>Governance controls</h2>
            <p style={styles.muted}>This surface is read-only. Mutations remain owned by the existing specialized lifecycle routes.</p>
            <div style={styles.metadataGrid}>
              <div><strong>Read-only</strong><span>{q.data.governance_controls.read_only ? 'Yes' : 'No'}</span></div>
              <div><strong>Mutation owner</strong><span>{formatToken(q.data.governance_controls.mutation_owner)}</span></div>
              <div><strong>Source routes</strong><span>{q.data.governance_controls.source_routes.length}</span></div>
            </div>
            <h3>Supporting pages</h3>
            <div style={styles.sourceList}>
              {supportingPages.map((link) => <Link key={link.to} style={styles.linkButton} to={link.to}>{link.label}</Link>)}
            </div>
            <h3>Source posture links</h3>
            <div style={styles.sourceList}>
              {q.data.governance_controls.source_routes.map((route) => {
                const to = sourceRouteLinks[route];
                return to ? <Link key={route} style={styles.codeLink} to={to}>{route}</Link> : <code key={route} style={styles.code}>{route}</code>;
              })}
            </div>
          </section>

          <section style={styles.panel}>
            <h2>Tenant readiness queue</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Tenant</th>
                  <th style={styles.th}>Lifecycle</th>
                  <th style={styles.th}>Commercial state</th>
                  <th style={styles.th}>Readiness signals</th>
                  <th style={styles.th}>Updated</th>
                  <th style={styles.th}>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {q.data.tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td style={styles.td}>
                      <b>{tenant.name}</b><br />
                      <span style={styles.muted}>{tenant.organization_type || '—'} · {tenant.location || 'No location'}</span>
                    </td>
                    <td style={styles.td}>{tenant.status}<br /><span style={styles.muted}>{tenant.lifecycle_bucket}</span></td>
                    <td style={styles.td}>{tenant.readiness}<br /><span style={styles.muted}>{tenant.plan_code} · {tenant.billing_status}</span></td>
                    <td style={styles.td}>
                      {tenant.blockers.length ? <div><b>Blockers:</b> {tenant.blockers.map(formatToken).join(', ')}</div> : null}
                      {tenant.warnings.length ? <div><b>Warnings:</b> {tenant.warnings.map(formatToken).join(', ')}</div> : null}
                      {!tenant.blockers.length && !tenant.warnings.length ? 'Ready' : null}
                    </td>
                    <td style={styles.td}>{formatDate(tenant.updated_at)}</td>
                    <td style={styles.td}>
                      <div style={styles.evidenceLinks}>
                        {tenantEvidenceLinks(tenant).map((link) => <Link key={`${tenant.id}-${link.label}-${link.to}`} style={styles.inlineLink} to={link.to}>{link.label}</Link>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  headerRow: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  muted: { color: '#6b7280' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)', overflowX: 'auto' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, margin: '12px 0' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 },
  card: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fafafa' },
  sourceList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  code: { border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 8px', background: '#f9fafb' },
  codeLink: { border: '1px solid #dbeafe', borderRadius: 10, padding: '6px 8px', background: '#eff6ff', color: '#1d4ed8', textDecoration: 'none', fontFamily: 'monospace' },
  button: { border: '1px solid #2563eb', borderRadius: 10, padding: '8px 12px', background: '#2563eb', color: '#fff', cursor: 'pointer' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  errorButton: { border: '1px solid #991b1b', borderRadius: 8, padding: '6px 10px', background: '#fff', color: '#991b1b', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' },
  td: { padding: 10, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' },
  linkButton: { border: '1px solid #dbeafe', borderRadius: 10, padding: '6px 10px', background: '#eff6ff', color: '#1d4ed8', textDecoration: 'none' },
  evidenceLinks: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  inlineLink: { color: '#1d4ed8', textDecoration: 'none', fontWeight: 600 }
};
