import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type PreventionRow = {
  code: string;
  source_closure_code: string;
  source_triage_code: string;
  source_observation_code: string;
  domain: string;
  owner: string;
  source_closure_status: string;
  source_default_severity: string;
  source_closure_artifact: string;
  source_closure_artifact_storage: string;
  customer_impact_review_required: boolean;
  manual_precondition: string;
  required_prevention_fields: string[];
  accepted_rollout_expansion_decisions: string[];
  default_rollout_expansion_decision: string;
  prevention_artifact: string;
  prevention_artifact_storage: string;
  prevention_requirements: string[];
  verification_status: string;
};

type PreventionVerification = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  prevention_rows: PreventionRow[];
  incident_closure_posture: string;
  incident_closure_persistence: PersistenceBoundary | null;
  incident_triage_posture: string;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  prevention_persistence: PersistenceBoundary;
  prevention_rules: string[];
  prevention_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

const SOURCE_POSTURE_LINKS = [
  { label: 'Incident closure', key: 'incident_closure_posture', href: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', key: 'incident_triage_posture', href: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch observation', key: 'post_launch_observation_posture', href: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Command center', key: 'command_center_posture', href: '/platform/commercial-launch-day-command-center' },
  { label: 'Smoke test', key: 'smoke_test_posture', href: '/platform/commercial-launch-smoke-test-checklist' },
  { label: 'Go/no-go register', key: 'go_no_go_register_posture', href: '/platform/commercial-launch-go-no-go-register' }
] as const;

const SUPPORTING_LINKS = [
  { label: 'Incident Closure', href: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident Triage', href: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch Observation', href: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Rollout Expansion Authorization', href: '/platform/commercial-launch-rollout-expansion-authorization' }
];

const DOMAIN_EVIDENCE_LINKS: Record<string, { label: string; href: string }[]> = {
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
    { label: 'Incident Closure', href: '/platform/commercial-launch-incident-closure' },
    { label: 'Rollout Expansion Authorization', href: '/platform/commercial-launch-rollout-expansion-authorization' }
  ]
};

function getDomainLinks(domain: string) {
  return DOMAIN_EVIDENCE_LINKS[domain] || [{ label: 'Incident Closure', href: '/platform/commercial-launch-incident-closure' }];
}

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
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
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

export default function PlatformCommercialLaunchPreventionVerificationPage() {
  const prevention = useQuery({
    queryKey: ['platform', 'commercial-launch-prevention-verification'],
    queryFn: () => platformApiRequest<PreventionVerification>('/platform/commercial-launch-prevention-verification'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = prevention.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Prevention Verification</h1>
          <p style={styles.description}>
            <strong>Prevention preparation only.</strong> Step 225 converts Incident Closure rows into external
            prevention-verification evidence requirements. This application does not observe external incident-closure
            completion or prevention-verification outcomes, so a generated row is not proof that prevention was implemented,
            effective, accepted, or cleared for rollout expansion.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button type="button" style={styles.button} onClick={() => prevention.refetch()} disabled={prevention.isFetching}>
            {prevention.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.boundary}>
        <strong>External confirmation boundary.</strong> Before prevention verification can proceed, independently confirm the
        external Incident Closure record for the relevant domain. Any prevention implementation, effectiveness review,
        monitoring re-entry, recurrence watch, customer-success acknowledgement, and rollout-expansion decision must also be
        recorded outside this application.
      </section>

      {prevention.isLoading ? <div style={styles.card}>Loading commercial launch prevention verification board...</div> : null}
      {prevention.error ? (
        <div style={styles.error}>
          <span>Failed to load commercial launch prevention verification board: {errorMessage(prevention.error)}</span>
          <button type="button" style={styles.errorButton} onClick={() => prevention.refetch()} disabled={prevention.isFetching}>
            {prevention.isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.metaGrid}>
            <div style={styles.metaCard}><span style={styles.help}>Snapshot generated</span><strong>{new Date(data.generated_at).toLocaleString()}</strong></div>
            <div style={styles.metaCard}><span style={styles.help}>Incident-closure persistence</span><strong>{data.incident_closure_persistence?.stored_in_application ? 'Stored here' : 'External only'}</strong></div>
            <div style={styles.metaCard}><span style={styles.help}>Prevention-verification persistence</span><strong>{data.prevention_persistence.stored_in_application ? 'Stored here' : 'External only'}</strong></div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Persistence boundary</h2>
            <div style={styles.persistenceGrid}>
              <div style={styles.evidenceBox}>
                <span style={styles.evidenceLabel}>Incident Closure</span>
                <span>{data.incident_closure_persistence?.interpretation || 'Incident Closure persistence details unavailable.'}</span>
              </div>
              <div style={styles.evidenceBox}>
                <span style={styles.evidenceLabel}>Prevention Verification</span>
                <span>{data.prevention_persistence.interpretation}</span>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Supporting pages</h2>
            <div style={styles.linkRow}>{SUPPORTING_LINKS.map((link) => <a key={link.href} href={link.href} style={styles.linkButton}>{link.label}</a>)}</div>
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
                  <strong style={styles.breakText}>{humanize(String(data[source.key] || 'unknown'))}</strong>
                  <span style={styles.openHint}>Open source board →</span>
                </a>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Prevention verification rows</h2>
            <div style={styles.checkGrid}>
              {data.prevention_rows.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div style={styles.breakText}>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.verification_status)}>{humanize(row.verification_status)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Manual precondition</span>
                    <span>{row.manual_precondition}</span>
                  </div>
                  <div style={styles.statusRow}><span>Source closure</span><strong style={styles.breakText}>{humanize(row.source_closure_code)}</strong></div>
                  <div style={styles.statusRow}><span>Source closure status</span><span style={badgeStyle(row.source_closure_status)}>{humanize(row.source_closure_status)}</span></div>
                  <div style={styles.statusRow}><span>Source template severity</span><span style={badgeStyle(row.source_default_severity)}>{humanize(row.source_default_severity)}</span></div>
                  <div style={styles.statusRow}><span>Customer impact review</span><strong>{row.customer_impact_review_required ? 'Required' : 'Not required'}</strong></div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Source closure artifact</span>
                    <strong>{row.source_closure_artifact}</strong>
                    <span style={styles.help}>Storage: {humanize(row.source_closure_artifact_storage)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>External prevention artifact</span>
                    <strong>{row.prevention_artifact}</strong>
                    <span style={styles.help}>Storage: {humanize(row.prevention_artifact_storage)}</span>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Evidence links</span>
                    <div style={styles.linkRow}>{getDomainLinks(row.domain).map((link) => <a key={`${row.code}-${link.href}`} href={link.href} style={styles.smallLinkButton}>{link.label}</a>)}</div>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Prevention requirements</span>
                    <ul style={styles.list}>{row.prevention_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Allowed rollout-expansion decisions</span>
                    <div style={styles.chips}>{row.accepted_rollout_expansion_decisions.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                    <div style={styles.help}>Template default: {humanize(row.default_rollout_expansion_decision)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required external prevention fields</span>
                    <div style={styles.chips}>{row.required_prevention_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}><h2 style={styles.sectionTitle}>Prevention rules</h2><ul style={styles.list}>{data.prevention_rules.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div style={styles.card}><h2 style={styles.sectionTitle}>Prevention limitations</h2><ul style={styles.list}>{data.prevention_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section style={styles.nextStep}><strong>Next best step:</strong> {data.next_best_step}</section>
          <section style={styles.note}>{data.validation_note}</section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#64748b', maxWidth: 1000, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  generated: { color: '#64748b', fontSize: 12 },
  button: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'normal', overflowWrap: 'anywhere' },
  boundary: { background: '#fffbeb', border: '1px solid #fde68a', color: '#78350f', borderRadius: 14, padding: 14, lineHeight: 1.55 },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  metaCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'grid', gap: 6, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)' },
  persistenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 },
  inputCardLink: { display: 'grid', gap: 6, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', color: 'inherit', textDecoration: 'none', minWidth: 0 },
  openHint: { color: 'var(--io-primary-dark)', fontSize: 12, fontWeight: 800 },
  linkRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  linkButton: { display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', background: '#fff', color: 'var(--io-primary-dark)', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 700, textDecoration: 'none' },
  smallLinkButton: { display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', background: '#fff', color: 'var(--io-primary-dark)', borderRadius: 999, padding: '5px 8px', fontSize: 12, fontWeight: 700, textDecoration: 'none', marginTop: 6 },
  checkGrid: { display: 'grid', gap: 12 },
  checkCard: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'grid', gap: 12, minWidth: 0 },
  rowHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  help: { color: '#64748b', fontSize: 12, overflowWrap: 'anywhere' },
  evidenceBox: { display: 'grid', gap: 4, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, overflowWrap: 'anywhere' },
  evidenceLabel: { color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 10, flexWrap: 'wrap' },
  chips: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  chip: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '5px 9px', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 700, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  list: { margin: 0, paddingLeft: 20, color: '#334155', lineHeight: 1.55 },
  nextStep: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', color: 'var(--io-primary-deep)', borderRadius: 14, padding: 14 },
  note: { background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', borderRadius: 14, padding: 14, fontSize: 13 },
  error: { display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', color: '#991b1b', borderRadius: 12, padding: 14, flexWrap: 'wrap', border: '1px solid #fecaca' },
  errorButton: { border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 10, padding: '7px 10px', fontWeight: 800, cursor: 'pointer' },
  breakText: { minWidth: 0, overflowWrap: 'anywhere' }
};
