import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type ObservationRow = {
  code: string;
  domain: string;
  owner: string;
  source_authorization_rows: string[];
  source_authorization_posture: string;
  required_observation_evidence: string[];
  observation_controls: string[];
  observation_status: string;
  release_condition: string;
};

type AdditionalGrowthObservation = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  observation_rows: ObservationRow[];
  additional_growth_authorization_posture: string;
  expansion_health_observation_posture: string;
  rollout_expansion_authorization_posture: string;
  prevention_verification_posture: string;
  incident_closure_posture: string;
  incident_triage_posture: string;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  observation_rules: string[];
  observation_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type PageLink = {
  label: string;
  to: string;
};

const supportingLinks: PageLink[] = [
  { label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' },
  { label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' },
  { label: 'Rollout Expansion', to: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Incidents', to: '/platform/incidents' },
  { label: 'Support Cockpit', to: '/platform/support-cockpit' },
  { label: 'Billing', to: '/platform/billing' }
];

const sourcePostureLinks: PageLink[] = [
  { label: 'Additional growth authorization', to: '/platform/commercial-launch-additional-growth-authorization' },
  { label: 'Expansion health observation', to: '/platform/commercial-launch-expansion-health-observation' },
  { label: 'Rollout expansion authorization', to: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Prevention verification', to: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident closure', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', to: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch observation', to: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Command center', to: '/platform/commercial-launch-day-command-center' },
  { label: 'Smoke test', to: '/platform/commercial-launch-smoke-test-checklist' },
  { label: 'Go/no-go register', to: '/platform/commercial-launch-go-no-go-register' }
];

function evidenceLinksForRow(row: ObservationRow): PageLink[] {
  const links: PageLink[] = [
    { label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' },
    { label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' }
  ];

  if (row.domain.includes('tenant_scope')) {
    links.push({ label: 'Tenant Lifecycle', to: '/platform/tenant-lifecycle' });
    links.push({ label: 'Tenants', to: '/platform/tenants' });
  }
  if (row.domain.includes('runtime_health')) {
    links.push({ label: 'System Health', to: '/platform/system-health' });
    links.push({ label: 'Monitoring', to: '/platform/monitoring-readiness' });
    links.push({ label: 'Operational Jobs', to: '/platform/operational-jobs' });
  }
  if (row.domain.includes('support_load')) {
    links.push({ label: 'Support Cockpit', to: '/platform/support-cockpit' });
  }
  if (row.domain.includes('customer_success')) {
    links.push({ label: 'Customer Success', to: '/platform/customer-success' });
  }
  if (row.domain.includes('billing_entitlements')) {
    links.push({ label: 'Billing', to: '/platform/billing' });
  }
  if (row.domain.includes('incident_monitoring')) {
    links.push({ label: 'Incidents', to: '/platform/incidents' });
    links.push({ label: 'Incident Triage', to: '/platform/commercial-launch-incident-triage' });
  }
  if (row.domain.includes('rollback_readiness')) {
    links.push({ label: 'Runbooks', to: '/platform/runbooks' });
    links.push({ label: 'Operational Jobs', to: '/platform/operational-jobs' });
  }
  if (row.domain.includes('next_growth_decision')) {
    links.push({ label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' });
    links.push({ label: 'Launch Acceptance', to: '/platform/commercial-launch-acceptance' });
  }

  return links;
}

function renderLinks(links: PageLink[]) {
  return (
    <div style={styles.linkList}>
      {links.map((link) => (
        <a key={`${link.label}-${link.to}`} href={link.to} style={styles.link}>{link.label}</a>
      ))}
    </div>
  );
}

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('rollback') || value.includes('hold')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('waiting') || value.includes('manual') || value.includes('not_reviewed')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchAdditionalGrowthObservationPage() {
  const observation = useQuery({
    queryKey: ['platform', 'commercial-launch-additional-growth-observation'],
    queryFn: () => platformApiRequest<AdditionalGrowthObservation>('/platform/commercial-launch-additional-growth-observation')
  });

  const data = observation.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Additional Growth Observation</h1>
          <p style={styles.description}>
            Step 229 turns manual additional-growth authorization into a post-growth observation board. It tracks actual tenant scope,
            runtime health, support load, customer-success feedback, billing and entitlement posture, incident signals, rollback readiness,
            and the next growth decision without mutating tenants, changing feature flags, updating billing, sending messages, or expanding rollout automatically.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button type="button" style={styles.button} onClick={() => observation.refetch()} disabled={observation.isFetching}>
            {observation.isFetching ? 'Refreshing...' : observation.error ? 'Retry' : 'Refresh'}
          </button>
        </div>
      </section>

      {observation.isLoading ? <div style={styles.card}>Loading commercial launch additional growth observation board...</div> : null}
      {observation.error ? <div style={styles.error}>Failed to load commercial launch additional growth observation board.</div> : null}

      {data ? (
        <>
          <section style={styles.grid}>
            {summary.map(([key, value]) => (
              <article key={key} style={styles.metricCard}>
                <span style={styles.metricLabel}>{humanize(key)}</span>
                <strong style={styles.metricValue}>{value}</strong>
              </article>
            ))}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Snapshot metadata</h2>
            <div style={styles.metaGrid}>
              <span><strong>Phase:</strong> {data.phase}</span>
              <span><strong>Step:</strong> {data.step}</span>
              <span><strong>Generated:</strong> {new Date(data.generated_at).toLocaleString()}</span>
              <span><strong>Overall posture:</strong> {humanize(data.posture)}</span>
            </div>
            <div style={styles.supportingLinks}>{renderLinks(supportingLinks)}</div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Observation chain</h2>
            <div style={styles.chainGrid}>
              {sourcePostureLinks.map((link) => {
                const postureMap: Record<string, string> = {
                  'Additional growth authorization': data.additional_growth_authorization_posture,
                  'Expansion health observation': data.expansion_health_observation_posture,
                  'Rollout expansion authorization': data.rollout_expansion_authorization_posture,
                  'Prevention verification': data.prevention_verification_posture,
                  'Incident closure': data.incident_closure_posture,
                  'Incident triage': data.incident_triage_posture,
                  'Post-launch observation': data.post_launch_observation_posture,
                  'Command center': data.command_center_posture,
                  'Smoke test': data.smoke_test_posture,
                  'Go/no-go register': data.go_no_go_register_posture
                };
                return (
                  <span key={link.label}>
                    <a href={link.to} style={styles.inlineLink}>{link.label}</a>: <strong>{humanize(postureMap[link.label])}</strong>
                  </span>
                );
              })}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Observation rows</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Domain</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Required evidence</th>
                    <th style={styles.th}>Controls</th>
                    <th style={styles.th}>Evidence links</th>
                  </tr>
                </thead>
                <tbody>
                  {data.observation_rows.map((row) => (
                    <tr key={row.code}>
                      <td style={styles.td}><strong>{humanize(row.code)}</strong></td>
                      <td style={styles.td}>{humanize(row.domain)}</td>
                      <td style={styles.td}>{humanize(row.owner)}</td>
                      <td style={styles.td}><span style={badgeStyle(row.observation_status)}>{humanize(row.observation_status)}</span></td>
                      <td style={styles.td}>{row.required_observation_evidence.join(', ')}</td>
                      <td style={styles.td}>
                        <ul style={styles.list}>
                          {row.observation_controls.map((control) => <li key={control}>{control}</li>)}
                        </ul>
                      </td>
                      <td style={styles.td}>{renderLinks(evidenceLinksForRow(row))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.twoColumn}>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Observation rules</h2>
              <ul style={styles.list}>{data.observation_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </article>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Limitations</h2>
              <ul style={styles.list}>{data.observation_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </article>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Next best step</h2>
            <p style={styles.description}>{data.next_best_step}</p>
            <p style={styles.note}>{data.validation_note}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', padding: '1.5rem', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' },
  headerMeta: { display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', minWidth: '220px' },
  eyebrow: { margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700 },
  title: { margin: '0.2rem 0', fontSize: '1.85rem', color: '#0f172a' },
  description: { margin: 0, color: '#475569', lineHeight: 1.6, maxWidth: '72rem' },
  button: { border: '1px solid #4f46e5', background: '#4f46e5', color: '#fff', borderRadius: '10px', padding: '0.5rem 0.8rem', fontWeight: 700, cursor: 'pointer' },
  generated: { color: '#64748b', fontSize: '0.85rem' },
  badge: { display: 'inline-flex', borderRadius: '999px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' },
  metricCard: { border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', background: '#ffffff' },
  metricLabel: { display: 'block', color: '#64748b', fontSize: '0.82rem', textTransform: 'capitalize' },
  metricValue: { display: 'block', marginTop: '0.35rem', fontSize: '1.45rem', color: '#0f172a' },
  card: { border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', background: '#ffffff' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', color: '#374151' },
  supportingLinks: { marginTop: '1rem' },
  sectionTitle: { margin: '0 0 0.75rem', color: '#0f172a', fontSize: '1.1rem' },
  chainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.65rem', color: '#475569' },
  linkList: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  link: { display: 'inline-flex', alignItems: 'center', borderRadius: '999px', border: '1px solid #c7d2fe', padding: '0.25rem 0.55rem', color: '#4338ca', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700 },
  inlineLink: { color: '#4338ca', fontWeight: 700, textDecoration: 'none' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '0.75rem', color: '#475569', fontSize: '0.8rem' },
  td: { verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', padding: '0.75rem', color: '#334155', fontSize: '0.9rem' },
  list: { margin: 0, paddingLeft: '1.2rem', color: '#475569', lineHeight: 1.6 },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' },
  note: { margin: '0.75rem 0 0', color: '#64748b', lineHeight: 1.6 },
  error: { border: '1px solid #fecaca', borderRadius: '1rem', padding: '1rem', background: '#fef2f2', color: '#991b1b' }
};
