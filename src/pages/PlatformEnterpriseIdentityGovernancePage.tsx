import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type EnterpriseIdentityGovernance = {
  posture: string;
  enabled_providers: string[];
  provider_count: number;
  password_login_fallback_allowed: boolean;
  tenant_domain_discovery_enabled: boolean;
  jit_provisioning_allowed: boolean;
  attention: string[];
  config: {
    enforcement: Record<string, boolean | number | string>;
    providers: Record<string, Record<string, boolean | string | string[]>>;
    audit: Record<string, boolean | number | string>;
  };
};

function badgeStyle(value: string): CSSProperties {
  if (value.includes('attention')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function valueText(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

function booleanStatus(value: unknown) {
  if (typeof value !== 'boolean') return 'not reported';
  return value ? 'enabled' : 'disabled';
}

function SourceLink({ href, children }: { href: string; children: string }) {
  return <a href={href} style={styles.sourceLink}>{children}</a>;
}

export default function PlatformEnterpriseIdentityGovernancePage() {
  const governanceQuery = useQuery({
    queryKey: ['platform', 'enterprise-identity', 'governance'],
    queryFn: () => platformApiRequest<EnterpriseIdentityGovernance>('/platform/enterprise-identity/governance')
  });

  const data = governanceQuery.data;
  const providerEntries = Object.entries(data?.config.providers || {});
  const enforcementEntries = Object.entries(data?.config.enforcement || {});
  const auditEntries = Object.entries(data?.config.audit || {});
  const lastUpdated = dataUpdatedText(governanceQuery.dataUpdatedAt);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Enterprise identity governance</h1>
          <p style={styles.subtitle}>Read-only SSO, provider, domain discovery, JIT provisioning, and identity audit posture for commercial security readiness.</p>
          <div style={styles.metaRow}>
            <span style={styles.metaPill}>Source: GET /platform/enterprise-identity/governance</span>
            <span style={styles.metaPill}>Permission: platform.security.read</span>
            <span style={styles.metaPill}>Last updated: {lastUpdated}</span>
          </div>
        </div>
        <div style={styles.headerActions}>
          {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
          <button type="button" style={styles.secondaryButton} disabled={governanceQuery.isFetching} onClick={() => governanceQuery.refetch()}>
            {governanceQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {governanceQuery.isLoading ? <section style={styles.card}>Loading enterprise identity governance…</section> : null}
      {governanceQuery.error ? (
        <section style={styles.errorCard}>
          <strong>Unable to load enterprise identity governance.</strong>
          <p style={styles.subtitle}>Check platform security read access, backend availability, and enterprise identity environment configuration, then retry.</p>
          <button type="button" style={styles.secondaryButton} disabled={governanceQuery.isFetching} onClick={() => governanceQuery.refetch()}>
            Retry
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <section style={styles.summaryGrid}>
            <div style={styles.card}><strong>Enabled providers</strong><div style={styles.metric}>{data.provider_count}</div><span style={styles.help}>{data.enabled_providers.join(', ') || 'none'}</span></div>
            <div style={styles.card}><strong>Password fallback</strong><div style={styles.metric}>{data.password_login_fallback_allowed ? 'On' : 'Off'}</div><span style={styles.help}>{booleanStatus(data.password_login_fallback_allowed)}</span></div>
            <div style={styles.card}><strong>Tenant discovery</strong><div style={styles.metric}>{data.tenant_domain_discovery_enabled ? 'On' : 'Off'}</div><span style={styles.help}>{booleanStatus(data.tenant_domain_discovery_enabled)}</span></div>
            <div style={styles.card}><strong>JIT provisioning</strong><div style={styles.metric}>{data.jit_provisioning_allowed ? 'On' : 'Off'}</div><span style={styles.help}>{booleanStatus(data.jit_provisioning_allowed)}</span></div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Snapshot metadata</h2>
            <div style={styles.flags}>
              <span style={styles.flag}>posture: {data.posture}</span>
              <span style={styles.flag}>providers: {data.provider_count}</span>
              <span style={styles.flag}>attention signals: {data.attention.length}</span>
              <span style={styles.flag}>enforcement controls: {enforcementEntries.length}</span>
              <span style={styles.flag}>audit controls: {auditEntries.length}</span>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Supporting Platform pages</h2>
            <p style={styles.subtitle}>Use these pages for related evidence. This governance page stays read-only and does not edit SSO configuration.</p>
            <div style={styles.linkGrid}>
              <SourceLink href="/platform/system-audit">System Audit</SourceLink>
              <SourceLink href="/platform/permission-audit">Permission Audit</SourceLink>
              <SourceLink href="/platform/access-reviews">Access Reviews</SourceLink>
              <SourceLink href="/platform/compliance-documents">Compliance Documents</SourceLink>
              <SourceLink href="/platform/compliance-export">Compliance Export</SourceLink>
              <SourceLink href="/platform/legal-compliance-reporting">Legal & Compliance Reporting</SourceLink>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Attention signals</h2>
            <div style={styles.flags}>{data.attention.length ? data.attention.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>) : <span style={styles.help}>No identity governance attention signals.</span>}</div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Provider configuration status</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Provider</th><th style={styles.th}>Enabled</th><th style={styles.th}>Configuration</th><th style={styles.th}>Evidence</th></tr></thead>
                <tbody>
                  {providerEntries.map(([provider, config]) => (
                    <tr key={provider}>
                      <td style={styles.td}><strong>{provider.toUpperCase()}</strong></td>
                      <td style={styles.td}>{valueText(config.enabled)}</td>
                      <td style={styles.td}><div style={styles.flags}>{Object.entries(config).filter(([key]) => key !== 'enabled').map(([key, value]) => <span key={key} style={styles.flag}>{key}: {valueText(value)}</span>)}</div></td>
                      <td style={styles.td}><a href={`/platform/system-audit?search=${encodeURIComponent(provider)}`} style={styles.sourceLink}>Audit evidence</a></td>
                    </tr>
                  ))}
                  {!providerEntries.length ? <tr><td style={styles.td} colSpan={4}>No enterprise identity provider configuration returned.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Enforcement and audit controls</h2>
            <div style={styles.controlGrid}>
              <div>
                <strong>Enforcement controls</strong>
                <div style={styles.flags}>{enforcementEntries.map(([key, value]) => <span key={key} style={styles.flag}>{key}: {valueText(value)}</span>)}</div>
              </div>
              <div>
                <strong>Audit controls</strong>
                <div style={styles.flags}>{auditEntries.map(([key, value]) => <span key={key} style={styles.flag}>{key}: {valueText(value)}</span>)}</div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function dataUpdatedText(value: number) {
  if (!value) return 'not loaded';
  return new Date(value).toLocaleString();
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap' },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', color: '#111827', padding: '8px 12px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  errorCard: { background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metric: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  cardTitle: { margin: '0 0 10px', fontSize: 18 },
  flags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  flag: { background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  help: { color: '#6b7280', fontSize: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px 8px', color: '#374151', fontSize: 13 },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 8px', verticalAlign: 'top' },
  metaRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  metaPill: { background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', borderRadius: 999, padding: '4px 8px', fontSize: 12, fontWeight: 700 },
  linkGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  sourceLink: { color: '#2563eb', fontWeight: 700, textDecoration: 'none' },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }
};
