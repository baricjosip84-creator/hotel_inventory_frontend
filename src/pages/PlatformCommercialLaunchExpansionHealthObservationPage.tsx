import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type ObservationRow = {
  code: string;
  source_expansion_code: string;
  source_prevention_code: string;
  source_closure_code: string;
  domain: string;
  owner: string;
  source_authorization_status: string;
  customer_impact_review_required: boolean;
  required_observation_fields: string[];
  accepted_next_expansion_recommendations: string[];
  observation_requirements: string[];
  observation_status: string;
};

type ExpansionHealthObservation = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  observation_rows: ObservationRow[];
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
  { label: 'Rollout Expansion', to: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Prevention Verification', to: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident Closure', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident Triage', to: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch Observation', to: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Launch Command Center', to: '/platform/commercial-launch-day-command-center' },
  { label: 'Launch Smoke Test', to: '/platform/commercial-launch-smoke-test-checklist' },
  { label: 'Launch Go/No-Go', to: '/platform/commercial-launch-go-no-go-register' }
];

const sourcePostureLinks: PageLink[] = [
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
    { label: 'Expansion evidence', to: '/platform/commercial-launch-rollout-expansion-authorization' },
    { label: 'Prevention evidence', to: '/platform/commercial-launch-prevention-verification' }
  ];

  if (row.domain.includes('service_health')) {
    links.push({ label: 'System Health', to: '/platform/system-health' });
  }
  if (row.domain.includes('customer_feedback') || row.domain.includes('adoption_signal')) {
    links.push({ label: 'Customer Success', to: '/platform/customer-success' });
  }
  if (row.domain.includes('support_intake')) {
    links.push({ label: 'Support Cockpit', to: '/platform/support-cockpit' });
  }
  if (row.domain.includes('billing_confirmation')) {
    links.push({ label: 'Billing', to: '/platform/billing' });
  }
  if (row.domain.includes('incident_review')) {
    links.push({ label: 'Incidents', to: '/platform/incidents' });
  }
  if (row.domain.includes('rollback_readiness')) {
    links.push({ label: 'Runbooks', to: '/platform/runbooks' });
  }
  if (row.domain.includes('handoff_closure')) {
    links.push({ label: 'Operational Jobs', to: '/platform/operational-jobs' });
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
  if (value.includes('waiting') || value.includes('manual') || value.includes('watch') || value.includes('not_reviewed')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchExpansionHealthObservationPage() {
  const observation = useQuery({
    queryKey: ['platform', 'commercial-launch-expansion-health-observation'],
    queryFn: () => platformApiRequest<ExpansionHealthObservation>('/platform/commercial-launch-expansion-health-observation')
  });

  const data = observation.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Expansion Health Observation</h1>
          <p style={styles.description}>
            Step 227 turns rollout expansion authorization rows into expanded-cohort health observation requirements. It tracks
            tenant sample health, support and customer-success feedback, billing and entitlement review, incidents, rollback readiness,
            adoption signals, and next expansion recommendations without mutating tenants, enabling features, changing billing,
            notifying customers, triggering rollback, or authorizing additional rollout automatically.
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

      {observation.isLoading ? <div style={styles.card}>Loading commercial launch expansion health observation board...</div> : null}
      {observation.error ? <div style={styles.error}>Failed to load commercial launch expansion health observation board.</div> : null}

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
                    <th style={styles.th}>Requirements</th>
                    <th style={styles.th}>Evidence links</th>
                  </tr>
                </thead>
                <tbody>
                  {data.observation_rows.map((row) => (
                    <tr key={row.code}>
                      <td style={styles.td}>{row.code}</td>
                      <td style={styles.td}>{humanize(row.domain)}</td>
                      <td style={styles.td}>{row.owner}</td>
                      <td style={styles.td}><span style={badgeStyle(row.observation_status)}>{humanize(row.observation_status)}</span></td>
                      <td style={styles.td}>{row.required_observation_fields.join(', ')}</td>
                      <td style={styles.td}>
                        <ul style={styles.list}>{row.observation_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                      </td>
                      <td style={styles.td}>{renderLinks(evidenceLinksForRow(row))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.twoCol}>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Rules</h2>
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
  header: { display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '1.5rem', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' },
  eyebrow: { margin: 0, color: '#4f46e5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' },
  title: { margin: '0.25rem 0', fontSize: '1.875rem', color: '#111827' },
  description: { margin: 0, color: '#4b5563', lineHeight: 1.6 },
  headerMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', minWidth: '220px' },
  button: { border: '1px solid #4f46e5', background: '#4f46e5', color: '#fff', borderRadius: '10px', padding: '0.5rem 0.8rem', fontWeight: 700, cursor: 'pointer' },
  generated: { color: '#6b7280', fontSize: '0.85rem' },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: '999px', padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' },
  metricCard: { padding: '1rem', background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb' },
  metricLabel: { display: 'block', color: '#6b7280', fontSize: '0.8rem', textTransform: 'capitalize' },
  metricValue: { display: 'block', marginTop: '0.35rem', color: '#111827', fontSize: '1.5rem' },
  card: { padding: '1.25rem', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', color: '#374151' },
  supportingLinks: { marginTop: '1rem' },
  sectionTitle: { margin: '0 0 0.75rem', color: '#111827', fontSize: '1.1rem' },
  chainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem', color: '#374151' },
  linkList: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  link: { display: 'inline-flex', alignItems: 'center', borderRadius: '999px', border: '1px solid #c7d2fe', padding: '0.25rem 0.55rem', color: '#4338ca', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700 },
  inlineLink: { color: '#4338ca', fontWeight: 700, textDecoration: 'none' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb', color: '#374151', fontSize: '0.8rem' },
  td: { verticalAlign: 'top', padding: '0.75rem', borderBottom: '1px solid #f3f4f6', color: '#374151', fontSize: '0.85rem' },
  list: { margin: 0, paddingLeft: '1.2rem', color: '#4b5563', lineHeight: 1.6 },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' },
  note: { margin: '0.75rem 0 0', color: '#6b7280', fontSize: '0.9rem' },
  error: { padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '12px' }
};
