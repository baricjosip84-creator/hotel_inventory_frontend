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

export default function PlatformEnterpriseIdentityGovernancePage() {
  const governanceQuery = useQuery({
    queryKey: ['platform', 'enterprise-identity', 'governance'],
    queryFn: () => platformApiRequest<EnterpriseIdentityGovernance>('/platform/enterprise-identity/governance')
  });

  const data = governanceQuery.data;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Enterprise identity governance</h1>
          <p style={styles.subtitle}>Read-only SSO, provider, domain discovery, JIT provisioning, and identity audit posture for commercial security readiness.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
      </header>

      {governanceQuery.isLoading ? <section style={styles.card}>Loading enterprise identity governance…</section> : null}
      {governanceQuery.error ? <section style={styles.card}>Unable to load enterprise identity governance.</section> : null}

      {data ? (
        <>
          <section style={styles.summaryGrid}>
            <div style={styles.card}><strong>Enabled providers</strong><div style={styles.metric}>{data.provider_count}</div><span style={styles.help}>{data.enabled_providers.join(', ') || 'none'}</span></div>
            <div style={styles.card}><strong>Password fallback</strong><div style={styles.metric}>{data.password_login_fallback_allowed ? 'On' : 'Off'}</div></div>
            <div style={styles.card}><strong>Tenant discovery</strong><div style={styles.metric}>{data.tenant_domain_discovery_enabled ? 'On' : 'Off'}</div></div>
            <div style={styles.card}><strong>JIT provisioning</strong><div style={styles.metric}>{data.jit_provisioning_allowed ? 'On' : 'Off'}</div></div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Attention signals</h2>
            <div style={styles.flags}>{data.attention.length ? data.attention.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>) : <span style={styles.help}>No identity governance attention signals.</span>}</div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Provider configuration status</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Provider</th><th style={styles.th}>Enabled</th><th style={styles.th}>Configuration</th></tr></thead>
                <tbody>
                  {Object.entries(data.config.providers).map(([provider, config]) => (
                    <tr key={provider}>
                      <td style={styles.td}><strong>{provider.toUpperCase()}</strong></td>
                      <td style={styles.td}>{valueText(config.enabled)}</td>
                      <td style={styles.td}><div style={styles.flags}>{Object.entries(config).filter(([key]) => key !== 'enabled').map(([key, value]) => <span key={key} style={styles.flag}>{key}: {valueText(value)}</span>)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Enforcement and audit controls</h2>
            <div style={styles.flags}>{Object.entries({ ...data.config.enforcement, ...data.config.audit }).map(([key, value]) => <span key={key} style={styles.flag}>{key}: {valueText(value)}</span>)}</div>
          </section>
        </>
      ) : null}
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
