import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { platformApiRequest } from '../lib/platformApi';

type ApiClientRow = {
  id: string;
  tenant_name?: string | null;
  name: string;
  key_prefix: string;
  scopes: string[];
  allowed_ip_count: number;
  expires_at?: string | null;
  last_used_at?: string | null;
  days_since_last_used?: number | null;
  days_until_expiration?: number | null;
  risk_flags: string[];
  governance_state: string;
};

type ApiClientGovernancePackage = {
  feature: string;
  phase: number;
  step: number;
  posture: string;
  summary: {
    total_clients: number;
    active_clients: number;
    clients_requiring_review: number;
    clients_without_expiration: number;
    clients_without_network_allowlist: number;
    stale_clients: number;
    write_scoped_clients: number;
    critical_clients_without_network_control: number;
    expiring_soon_clients: number;
    expired_clients: number;
    tenants_with_clients: number;
  };
  governance_controls: {
    read_only: boolean;
    mutation_owner: string;
    source_routes: string[];
    no_raw_secret_export: boolean;
    no_key_hash_export: boolean;
    secret_material_fields_blocked: string[];
    required_controls: string[];
    supported_scopes: string[];
    write_scopes: string[];
    stale_days: number;
    expiring_soon_days: number;
  };
  api_clients: ApiClientRow[];
};

function dateOnly(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('review')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function FlagList({ flags }: { flags: string[] }) {
  if (!flags.length) return <span style={styles.help}>No flags</span>;
  return <div style={styles.flags}>{flags.map((flag) => <span key={flag} style={styles.flag}>{flag}</span>)}</div>;
}

function formatRefreshTime(value?: number) {
  return value ? new Date(value).toLocaleString() : 'Not loaded yet';
}

export default function PlatformApiClientGovernancePage() {
  const governanceQuery = useQuery({
    queryKey: ['platform', 'api-client-governance'],
    queryFn: () => platformApiRequest<ApiClientGovernancePackage>('/platform/api-client-governance/governance')
  });

  const data = governanceQuery.data;
  const summary = data?.summary;
  const clients = data?.api_clients || [];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>API client governance</h1>
          <p style={styles.subtitle}>Commercial readiness posture for tenant-bound API clients, scopes, expiration, network controls, and usage monitoring.</p>
        </div>
        <div style={styles.headerActions}>
          {data ? <span style={badgeStyle(data.posture)}>{data.posture}</span> : null}
          <button type="button" style={styles.secondaryButton} onClick={() => governanceQuery.refetch()} disabled={governanceQuery.isFetching}>
            {governanceQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {governanceQuery.isLoading ? <section style={styles.card}>Loading API client governance…</section> : null}
      {governanceQuery.error ? (
        <section style={styles.errorCard}>
          <strong>Unable to load API client governance.</strong>
          <p style={styles.subtitle}>Check platform authentication, platform.api_keys.read permission, and backend availability.</p>
          <button type="button" style={styles.secondaryButton} onClick={() => governanceQuery.refetch()} disabled={governanceQuery.isFetching}>
            Retry
          </button>
        </section>
      ) : null}

      {data ? (
        <section style={styles.metadataCard}>
          <div><strong>Snapshot</strong><br /><span style={styles.help}>Loaded {clients.length} evidence rows · Last refreshed {formatRefreshTime(governanceQuery.dataUpdatedAt)}</span></div>
          <div><strong>Source</strong><br /><span style={styles.help}>GET /platform/api-client-governance/governance · Mutation owner {data.governance_controls.mutation_owner}</span></div>
          <div><strong>Thresholds</strong><br /><span style={styles.help}>Stale &gt; {data.governance_controls.stale_days} days · Expiring soon ≤ {data.governance_controls.expiring_soon_days} days</span></div>
        </section>
      ) : null}

      <section style={styles.linkCard}>
        <strong>Supporting Platform pages</strong>
        <div style={styles.linkList}>
          <Link to="/platform/api-keys">API Keys lifecycle</Link>
          <Link to="/platform/audit">Platform audit</Link>
          <Link to="/platform/permission-audit">Permission audit</Link>
        </div>
      </section>

      {summary ? (
        <section style={styles.summaryGrid}>
          <div style={styles.card}><strong>Total clients</strong><div style={styles.metric}>{summary.total_clients}</div></div>
          <div style={styles.card}><strong>Clients requiring review</strong><div style={styles.metric}>{summary.clients_requiring_review}</div></div>
          <div style={styles.card}><strong>Without expiration</strong><div style={styles.metric}>{summary.clients_without_expiration}</div></div>
          <div style={styles.card}><strong>Without network allowlist</strong><div style={styles.metric}>{summary.clients_without_network_allowlist}</div></div>
          <div style={styles.card}><strong>Stale clients</strong><div style={styles.metric}>{summary.stale_clients}</div></div>
          <div style={styles.card}><strong>Write-scoped clients</strong><div style={styles.metric}>{summary.write_scoped_clients}</div></div>
          <div style={styles.card}><strong>Critical clients without network control</strong><div style={styles.metric}>{summary.critical_clients_without_network_control}</div></div>
          <div style={styles.card}><strong>Expiring soon</strong><div style={styles.metric}>{summary.expiring_soon_clients}</div></div>
        </section>
      ) : null}

      {data ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Governance controls</h2>
          <p style={styles.subtitle}>Mutation owner: {data.governance_controls.mutation_owner} · Read-only: {String(data.governance_controls.read_only)}</p>
          <p style={styles.subtitle}>Source routes: {data.governance_controls.source_routes.join(', ')}</p>
          <p style={styles.subtitle}>No raw secret export: {String(data.governance_controls.no_raw_secret_export)} · No key hash export: {String(data.governance_controls.no_key_hash_export)}</p>
          <div style={styles.flags}>{data.governance_controls.required_controls.map((control) => <span key={control} style={styles.flag}>{control}</span>)}</div>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Client evidence</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Tenant</th>
                <th style={styles.th}>Scopes</th>
                <th style={styles.th}>Network</th>
                <th style={styles.th}>Expiration</th>
                <th style={styles.th}>Last used</th>
                <th style={styles.th}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td style={styles.td}><strong>{client.name}</strong><br /><span style={styles.help}>{client.key_prefix} · {client.governance_state}</span></td>
                  <td style={styles.td}>{client.tenant_name || '—'}</td>
                  <td style={styles.td}><div style={styles.flags}>{client.scopes.map((scope) => <span key={scope} style={styles.flag}>{scope}</span>)}</div></td>
                  <td style={styles.td}>{client.allowed_ip_count} allowlisted</td>
                  <td style={styles.td}>{dateOnly(client.expires_at)}<br /><span style={styles.help}>{client.days_until_expiration ?? '—'} days</span></td>
                  <td style={styles.td}>{dateOnly(client.last_used_at)}<br /><span style={styles.help}>{client.days_since_last_used ?? '—'} days ago</span></td>
                  <td style={styles.td}>
                    <FlagList flags={client.risk_flags} />
                    <div style={styles.rowLinks}>
                      <Link to="/platform/api-keys">Lifecycle page</Link>
                      <Link to={`/platform/audit?entity_id=${encodeURIComponent(client.id)}`}>Audit evidence</Link>
                    </div>
                  </td>
                </tr>
              ))}
              {!clients.length ? <tr><td style={styles.td} colSpan={7}>No API clients available for governance review.</td></tr> : null}
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
  headerActions: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 700, whiteSpace: 'nowrap' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  errorCard: { background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 14, padding: 18 },
  metadataCard: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  linkCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  linkList: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', color: '#111827', borderRadius: 10, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  metric: { fontSize: 28, fontWeight: 800, marginTop: 8 },
  cardTitle: { margin: '0 0 10px', fontSize: 18 },
  flags: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  flag: { background: '#eef2ff', color: '#3730a3', padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 700 },
  help: { color: '#6b7280', fontSize: 12 },
  rowLinks: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8, fontSize: 12 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px 8px', color: '#374151', fontSize: 13 },
  td: { borderBottom: '1px solid #f3f4f6', padding: '12px 8px', verticalAlign: 'top' }
};
