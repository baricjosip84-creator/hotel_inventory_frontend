import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type ObservationRow = {
  code: string;
  source_expansion_code: string;
  source_prevention_code: string;
  source_closure_code: string;
  domain: string;
  owner: string;
  source_authorization_status: string;
  source_authorization_artifact: string;
  source_authorization_artifact_storage: string;
  customer_impact_review_required: boolean;
  manual_precondition: string;
  required_observation_fields: string[];
  accepted_next_expansion_recommendations: string[];
  default_next_expansion_recommendation: string;
  observation_artifact: string;
  observation_artifact_storage: string;
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
  rollout_expansion_authorization_persistence: PersistenceBoundary | null;
  prevention_verification_posture: string;
  incident_closure_posture: string;
  incident_triage_posture: string;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  expansion_health_persistence: PersistenceBoundary;
  observation_rules: string[];
  observation_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type PageLink = {
  label: string;
  href: string;
};

const SOURCE_POSTURE_LINKS = [
  { label: 'Rollout expansion authorization', key: 'rollout_expansion_authorization_posture', href: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Prevention verification', key: 'prevention_verification_posture', href: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident closure', key: 'incident_closure_posture', href: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', key: 'incident_triage_posture', href: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch observation', key: 'post_launch_observation_posture', href: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Command center', key: 'command_center_posture', href: '/platform/commercial-launch-day-command-center' },
  { label: 'Smoke test', key: 'smoke_test_posture', href: '/platform/commercial-launch-smoke-test-checklist' },
  { label: 'Go/no-go register', key: 'go_no_go_register_posture', href: '/platform/commercial-launch-go-no-go-register' }
] as const;

const SUPPORTING_LINKS: PageLink[] = [
  { label: 'Rollout Expansion', href: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Prevention Verification', href: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident Closure', href: '/platform/commercial-launch-incident-closure' },
  { label: 'Additional Growth Authorization', href: '/platform/commercial-launch-additional-growth-authorization' }
];

const DOMAIN_EVIDENCE_LINKS: Record<string, PageLink[]> = {
  service_health: [
    { label: 'System Health', href: '/platform/system-health' },
    { label: 'Monitoring Readiness', href: '/platform/production-monitoring-readiness' }
  ],
  customer_feedback: [
    { label: 'Customer Success', href: '/platform/customer-success-admin' },
    { label: 'Communications', href: '/platform/tenant-communications' }
  ],
  support_intake: [
    { label: 'Support Cockpit', href: '/platform/support-cockpit' },
    { label: 'Tenant SLA', href: '/platform/tenant-sla' }
  ],
  billing_confirmation: [
    { label: 'Billing', href: '/platform/billing' },
    { label: 'Billing Activation', href: '/platform/billing-subscription-activation' },
    { label: 'License Enforcement', href: '/platform/license-plan-enforcement' }
  ],
  incident_review: [
    { label: 'Incidents', href: '/platform/incidents' },
    { label: 'Incident Closure', href: '/platform/commercial-launch-incident-closure' }
  ],
  rollback_readiness: [
    { label: 'Runbooks', href: '/platform/runbooks' },
    { label: 'Launch Command Center', href: '/platform/commercial-launch-day-command-center' }
  ],
  adoption_signal: [
    { label: 'Tenant Health', href: '/platform/tenant-health' },
    { label: 'Customer Success', href: '/platform/customer-success-admin' }
  ],
  handoff_closure: [
    { label: 'Operational Jobs', href: '/platform/operational-jobs' },
    { label: 'Additional Growth Authorization', href: '/platform/commercial-launch-additional-growth-authorization' }
  ]
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unknown error';
}

function badgeStyle(value: string): CSSProperties {
  const normalized = value.toLowerCase();
  if (normalized === 'loading' || normalized === 'unknown' || normalized === 'not generated yet') {
    return { ...styles.badge, background: '#e5e7eb', color: '#374151' };
  }
  if (normalized.includes('blocked') || normalized.includes('rollback') || normalized.includes('hold')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (
    normalized.includes('waiting')
    || normalized.includes('manual')
    || normalized.includes('external')
    || normalized.includes('watch')
    || normalized.includes('not_reviewed')
    || normalized.includes('preparation')
  ) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function linkRow(links: PageLink[]) {
  return <div style={styles.linkRow}>{links.map((link) => <a key={link.href} href={link.href} style={styles.linkButton}>{link.label}</a>)}</div>;
}

export default function PlatformCommercialLaunchExpansionHealthObservationPage() {
  const observation = useQuery({
    queryKey: ['platform', 'commercial-launch-expansion-health-observation'],
    queryFn: () => platformApiRequest<ExpansionHealthObservation>('/platform/commercial-launch-expansion-health-observation'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
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
            <strong>Expansion-health preparation only.</strong> Step 227 converts Rollout Expansion rows into external expanded-cohort
            health-observation evidence requirements. This application does not observe external rollout-expansion authorization or
            expansion-health outcomes, so a generated row is not proof that expansion occurred, the cohort is healthy, or additional
            growth is safe.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button type="button" style={styles.button} onClick={() => observation.refetch()} disabled={observation.isFetching}>
            {observation.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.boundary}>
        <strong>External confirmation boundary.</strong> Before expanded-cohort health observation can be recorded, independently confirm
        the external Rollout Expansion authorization record for the relevant domain. The actual cohort health, support/customer-success,
        billing/entitlement, incident, rollback, adoption, and next-expansion evidence must also be recorded outside this application.
      </section>

      {observation.isLoading ? <div style={styles.card}>Loading commercial launch expansion health observation board...</div> : null}
      {observation.error ? (
        <div style={styles.error}>
          <span>Failed to load commercial launch expansion health observation board: {errorMessage(observation.error)}</span>
          <button type="button" style={styles.errorButton} onClick={() => observation.refetch()} disabled={observation.isFetching}>
            {observation.isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.metaGrid}>
            <div style={styles.metaCard}><span style={styles.help}>Snapshot generated</span><strong>{new Date(data.generated_at).toLocaleString()}</strong></div>
            <div style={styles.metaCard}><span style={styles.help}>Rollout-authorization persistence</span><strong>{data.rollout_expansion_authorization_persistence?.stored_in_application ? 'Stored here' : 'External only'}</strong></div>
            <div style={styles.metaCard}><span style={styles.help}>Expansion-health persistence</span><strong>{data.expansion_health_persistence.stored_in_application ? 'Stored here' : 'External only'}</strong></div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Persistence boundary</h2>
            <div style={styles.persistenceGrid}>
              <div style={styles.evidenceBox}>
                <span style={styles.evidenceLabel}>Rollout Expansion Authorization</span>
                <span>{data.rollout_expansion_authorization_persistence?.interpretation || 'Rollout Expansion persistence details unavailable.'}</span>
              </div>
              <div style={styles.evidenceBox}>
                <span style={styles.evidenceLabel}>Expansion Health Observation</span>
                <span>{data.expansion_health_persistence.interpretation}</span>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Supporting pages</h2>
            {linkRow(SUPPORTING_LINKS)}
          </section>

          <section style={styles.grid}>
            {summary.map(([key, value]) => (
              <div key={key} style={styles.metric}>
                <div style={styles.metricValue}>{value}</div>
                <div style={styles.metricLabel}>{humanize(key)}</div>
              </div>
            ))}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Source postures</h2>
            <div style={styles.inputGrid}>
              {SOURCE_POSTURE_LINKS.map((source) => (
                <a key={source.key} href={source.href} style={styles.inputCardLink}>
                  <span style={styles.help}>{source.label}</span>
                  <strong>{humanize(String(data[source.key]))}</strong>
                  <span style={styles.openHint}>Open source board →</span>
                </a>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Observation rows</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Domain / owner</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Manual precondition</th>
                    <th style={styles.th}>Evidence artifacts</th>
                    <th style={styles.th}>Recommendation contract</th>
                    <th style={styles.th}>Requirements</th>
                    <th style={styles.th}>Evidence pages</th>
                  </tr>
                </thead>
                <tbody>
                  {data.observation_rows.map((row) => (
                    <tr key={row.code}>
                      <td style={styles.td}>
                        <strong>{humanize(row.domain)}</strong>
                        <span style={styles.subtle}>{row.owner}</span>
                        <span style={styles.codeText}>{row.code}</span>
                      </td>
                      <td style={styles.td}>
                        <span style={badgeStyle(row.observation_status)}>{humanize(row.observation_status)}</span>
                        <span style={styles.subtle}>Source authorization: {humanize(row.source_authorization_status)}</span>
                      </td>
                      <td style={styles.td}>{row.manual_precondition}</td>
                      <td style={styles.td}>
                        <strong>Source authorization artifact</strong>
                        <span>{row.source_authorization_artifact}</span>
                        <span style={styles.subtle}>{humanize(row.source_authorization_artifact_storage)}</span>
                        <strong style={styles.artifactGap}>External observation artifact</strong>
                        <span>{row.observation_artifact}</span>
                        <span style={styles.subtle}>{humanize(row.observation_artifact_storage)}</span>
                      </td>
                      <td style={styles.td}>
                        <strong>Allowed recommendations</strong>
                        <span>{row.accepted_next_expansion_recommendations.map(humanize).join(', ')}</span>
                        <strong style={styles.artifactGap}>Template default</strong>
                        <span>{humanize(row.default_next_expansion_recommendation)}</span>
                        <strong style={styles.artifactGap}>Required external observation fields</strong>
                        <span>{row.required_observation_fields.join(', ')}</span>
                      </td>
                      <td style={styles.td}><ul style={styles.list}>{row.observation_requirements.map((item) => <li key={item}>{item}</li>)}</ul></td>
                      <td style={styles.td}>{linkRow(DOMAIN_EVIDENCE_LINKS[row.domain] || [{ label: 'Rollout Expansion', href: '/platform/commercial-launch-rollout-expansion-authorization' }])}</td>
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
  page: { display: 'flex', flexDirection: 'column', gap: '1.25rem', minWidth: 0 },
  header: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '1rem', padding: '1.5rem', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' },
  eyebrow: { margin: 0, color: '#4f46e5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' },
  title: { margin: '0.25rem 0', fontSize: '1.875rem', color: '#111827' },
  description: { margin: 0, color: '#4b5563', lineHeight: 1.6, overflowWrap: 'anywhere' },
  headerMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', minWidth: '220px' },
  button: { border: '1px solid #4f46e5', background: '#4f46e5', color: '#fff', borderRadius: '10px', padding: '0.5rem 0.8rem', fontWeight: 700, cursor: 'pointer' },
  generated: { color: '#6b7280', fontSize: '0.85rem' },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: '999px', padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  boundary: { padding: '1rem 1.15rem', borderRadius: '14px', border: '1px solid #f59e0b', background: '#fffbeb', color: '#92400e', lineHeight: 1.55 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' },
  metaCard: { display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '1rem', borderRadius: '14px', border: '1px solid #e5e7eb', background: '#fff', minWidth: 0, overflowWrap: 'anywhere' },
  persistenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' },
  evidenceBox: { display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.9rem', borderRadius: '12px', background: '#f9fafb', color: '#374151', lineHeight: 1.5, overflowWrap: 'anywhere' },
  evidenceLabel: { fontWeight: 700, color: '#111827' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' },
  metric: { padding: '1rem', background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', minWidth: 0 },
  metricLabel: { color: '#6b7280', fontSize: '0.78rem', overflowWrap: 'anywhere' },
  metricValue: { color: '#111827', fontSize: '1.45rem', fontWeight: 800 },
  card: { padding: '1.25rem', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb', minWidth: 0 },
  sectionTitle: { margin: '0 0 0.75rem', color: '#111827', fontSize: '1.1rem' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.75rem' },
  inputCardLink: { display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '0.85rem', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#111827', textDecoration: 'none', background: '#f9fafb', overflowWrap: 'anywhere' },
  help: { color: '#6b7280', fontSize: '0.8rem' },
  openHint: { color: '#4f46e5', fontSize: '0.75rem', fontWeight: 700 },
  linkRow: { display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  linkButton: { display: 'inline-flex', borderRadius: '999px', border: '1px solid #c7d2fe', padding: '0.3rem 0.6rem', color: '#4338ca', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700 },
  tableWrap: { overflowX: 'auto', maxWidth: '100%' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '1480px' },
  th: { textAlign: 'left', padding: '0.75rem', borderBottom: '1px solid #e5e7eb', color: '#374151', fontSize: '0.8rem' },
  td: { verticalAlign: 'top', padding: '0.75rem', borderBottom: '1px solid #f3f4f6', color: '#374151', fontSize: '0.85rem', lineHeight: 1.5, overflowWrap: 'anywhere' },
  subtle: { display: 'block', marginTop: '0.35rem', color: '#6b7280', fontSize: '0.78rem' },
  codeText: { display: 'block', marginTop: '0.35rem', color: '#6b7280', fontFamily: 'monospace', fontSize: '0.72rem', overflowWrap: 'anywhere' },
  artifactGap: { display: 'block', marginTop: '0.7rem' },
  list: { margin: 0, paddingLeft: '1.2rem', color: '#4b5563', lineHeight: 1.6 },
  twoCol: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' },
  note: { margin: '0.75rem 0 0', color: '#6b7280', fontSize: '0.9rem', overflowWrap: 'anywhere' },
  error: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '12px', overflowWrap: 'anywhere' },
  errorButton: { border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: '9px', padding: '0.4rem 0.7rem', fontWeight: 700, cursor: 'pointer' }
};
