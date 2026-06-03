import type { CSSProperties } from 'react';
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

export default function PlatformTenantLifecyclePage() {
  const q = useQuery({
    queryKey: ['platform', 'tenant-lifecycle', 'governance'],
    queryFn: () => platformApiRequest<TenantLifecycleGovernance>('/platform/tenant-lifecycle/governance')
  });

  return (
    <div style={styles.page}>
      <h1>Tenant lifecycle governance</h1>
      <p style={styles.muted}>Commercial readiness view across tenant creation, provisioning, support, exports, offboarding, billing posture, and lifecycle ownership.</p>

      {q.isLoading ? <section style={styles.panel}>Loading tenant lifecycle governance…</section> : null}
      {q.error ? <section style={styles.error}>{q.error instanceof Error ? q.error.message : 'Failed to load tenant lifecycle governance'}</section> : null}

      {q.data ? (
        <>
          <section style={styles.panel}>
            <h2>Commercial readiness</h2>
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
            <div style={styles.sourceList}>
              {q.data.governance_controls.source_routes.map((route) => <code key={route} style={styles.code}>{route}</code>)}
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
  muted: { color: '#6b7280' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)', overflowX: 'auto' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 },
  card: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fafafa' },
  sourceList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  code: { border: '1px solid #e5e7eb', borderRadius: 10, padding: '6px 8px', background: '#f9fafb' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
  th: { textAlign: 'left', padding: 10, borderBottom: '1px solid #e5e7eb' },
  td: { padding: 10, borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' }
};
