import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type ExternalPersistence = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type ObservationRow = {
  code: string;
  domain: string;
  owner: string;
  required_evidence: string;
  escalation_trigger: string;
  source_command_center_posture: string;
  source_checkpoints_total: number;
  source_checkpoints_blocked: number;
  source_checkpoints_requiring_evidence_review: number;
  source_checkpoints_awaiting_external_go_no_go_confirmation: number;
  source_checkpoints_awaiting_external_smoke_test_confirmation: number;
  manual_precondition: string;
  required_observation_fields: string[];
  allowed_observation_statuses: string[];
  default_observation_status: string;
  observation_artifact: string;
  observation_artifact_storage: string;
  observation_status: string;
};

type PostLaunchObservation = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  observation_rows: ObservationRow[];
  command_center_posture: string;
  command_center_decision_persistence: ExternalPersistence | null;
  smoke_test_posture: string;
  smoke_test_result_persistence: ExternalPersistence | null;
  go_no_go_register_posture: string;
  go_no_go_decision_persistence: ExternalPersistence | null;
  acceptance_packet_posture: string;
  certificate_posture: string;
  observation_persistence: ExternalPersistence;
  post_launch_rules: string[];
  observation_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unable to load the commercial launch post-launch observation board.';
}

function getObservationEvidenceLink(row: ObservationRow) {
  const byCode: Record<string, string> = {
    service_health_observation_recorded: '/platform/system-health',
    customer_feedback_window_opened: '/platform/tenant-communications',
    support_intake_reviewed: '/platform/support-cockpit',
    billing_activation_confirmed_or_held: '/platform/billing-subscription-activation',
    incident_review_completed: '/platform/incidents',
    rollback_readiness_reconfirmed: '/platform/deployment-validation',
    first_adoption_signal_reviewed: '/platform/pilot-customer-readiness',
    launch_handoff_closure_prepared: '/platform/commercial-launch-day-command-center'
  };
  return byCode[row.code] || '/platform/commercial-launch-day-command-center';
}

function getObservationEvidenceLabel(row: ObservationRow) {
  const byCode: Record<string, string> = {
    service_health_observation_recorded: 'Open system health',
    customer_feedback_window_opened: 'Open tenant communications',
    support_intake_reviewed: 'Open support cockpit',
    billing_activation_confirmed_or_held: 'Open billing activation',
    incident_review_completed: 'Open incidents',
    rollback_readiness_reconfirmed: 'Open deployment validation',
    first_adoption_signal_reviewed: 'Open pilot readiness',
    launch_handoff_closure_prepared: 'Open command center'
  };
  return byCode[row.code] || 'Open command center';
}

function badgeStyle(value: string): CSSProperties {
  const normalized = value.toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('missing') || normalized.includes('degradation')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (
    normalized.includes('review')
    || normalized.includes('waiting')
    || normalized.includes('external')
    || normalized.includes('manual')
    || normalized.includes('watch')
    || normalized.includes('not_reviewed')
  ) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (normalized.includes('loading') || normalized.includes('unknown') || normalized.includes('preparation')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function persistenceLabel(value: ExternalPersistence | null) {
  if (!value) return 'Not reported';
  if (value.stored_in_application) return 'Stored in application';
  if (!value.external_records_observable) return 'External records not observable';
  return 'External evidence';
}

export default function PlatformCommercialLaunchPostLaunchObservationPage() {
  const observation = useQuery({
    queryKey: ['platform', 'commercial-launch-post-launch-observation'],
    queryFn: () => platformApiRequest<PostLaunchObservation>('/platform/commercial-launch-post-launch-observation'),
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
          <h1 style={styles.title}>Commercial Launch Post-Launch Observation</h1>
          <p style={styles.description}>
            <strong>Observation preparation only.</strong> Step 222 prepares the evidence record for first-production
            observation after the real launch window. This application cannot observe external go/no-go decisions,
            smoke-test results, launch-window checkpoint decisions, or post-launch observation outcomes, so it does not
            infer that launch occurred or that any observation result has been recorded.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void observation.refetch()}
            disabled={observation.isFetching}
          >
            {observation.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.notice}>
        <strong>External confirmation boundary.</strong> Before recording post-launch observations, an operator must
        independently confirm the external launch-window decision record and the real production launch. This read-only
        board stores none of those decisions or observation outcomes.
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting launch and observation pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-day-command-center">Launch command center</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-go-no-go-register">Launch go/no-go</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-acceptance">Launch acceptance</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-certificate">Launch certificate</Link>
          <Link style={styles.quickLink} to="/platform/monitoring-readiness">Monitoring readiness</Link>
          <Link style={styles.quickLink} to="/platform/system-health">System health</Link>
          <Link style={styles.quickLink} to="/platform/incidents">Incidents</Link>
          <Link style={styles.quickLink} to="/platform/support-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/tenant-communications">Tenant communications</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-incident-triage">Incident triage</Link>
        </div>
      </section>

      {observation.isLoading ? <div style={styles.card}>Loading commercial launch post-launch observation board...</div> : null}
      {observation.error ? (
        <div style={styles.error}>
          <div><strong>Failed to load commercial launch post-launch observation board.</strong></div>
          <div style={styles.errorDetail}>{errorMessage(observation.error)}</div>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void observation.refetch()}
            disabled={observation.isFetching}
          >
            {observation.isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Snapshot metadata</h2>
            <div style={styles.metadataGrid}>
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{data.generated_at ? new Date(data.generated_at).toLocaleString() : '-'}</span></div>
              <div><strong>Validation</strong><span>{data.validation_note}</span></div>
            </div>
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
            <h2 style={styles.sectionTitle}>External evidence persistence</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}>
                <span style={styles.help}>Command-center decision persistence</span>
                <strong>{persistenceLabel(data.command_center_decision_persistence)}</strong>
                <span style={styles.help}>{data.command_center_decision_persistence?.interpretation || 'No persistence statement reported.'}</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Smoke-test result persistence</span>
                <strong>{persistenceLabel(data.smoke_test_result_persistence)}</strong>
                <span style={styles.help}>{data.smoke_test_result_persistence?.interpretation || 'No persistence statement reported.'}</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Go/no-go decision persistence</span>
                <strong>{persistenceLabel(data.go_no_go_decision_persistence)}</strong>
                <span style={styles.help}>{data.go_no_go_decision_persistence?.interpretation || 'No persistence statement reported.'}</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Post-launch observation persistence</span>
                <strong>{persistenceLabel(data.observation_persistence)}</strong>
                <span style={styles.help}>{data.observation_persistence.interpretation}</span>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Source launch postures</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}><span style={styles.help}>Command center</span><strong>{humanize(data.command_center_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-day-command-center">Open Command Center</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Smoke test</span><strong>{humanize(data.smoke_test_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-smoke-test-checklist">Open Launch Smoke Test</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Go/no-go register</span><strong>{humanize(data.go_no_go_register_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Acceptance packet</span><strong>{humanize(data.acceptance_packet_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-acceptance">Open Launch Acceptance</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Certificate</span><strong>{humanize(data.certificate_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-certificate">Open Launch Certificate</Link></div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Observation preparation checks</h2>
            <div style={styles.checkGrid}>
              {data.observation_rows.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div style={styles.wrap}>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.observation_status)}>{humanize(row.observation_status)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence</span>
                    <strong>{row.required_evidence}</strong>
                  </div>
                  <div style={styles.preconditionBox}>
                    <span style={styles.evidenceLabel}>Manual precondition</span>
                    <strong>{row.manual_precondition}</strong>
                  </div>
                  <Link style={styles.packetLink} to={getObservationEvidenceLink(row)}>{getObservationEvidenceLabel(row)}</Link>
                  <div style={styles.statusRow}><span>External observation artifact</span><strong>{row.observation_artifact}</strong></div>
                  <div style={styles.statusRow}><span>Artifact storage</span><strong>{humanize(row.observation_artifact_storage)}</strong></div>
                  <div style={styles.statusRow}><span>Template default observation result</span><span style={badgeStyle(row.default_observation_status)}>{humanize(row.default_observation_status)}</span></div>
                  <div style={styles.statusRow}><span>Escalation trigger</span><strong>{humanize(row.escalation_trigger)}</strong></div>
                  <div style={styles.statusRow}>
                    <span>Source checkpoints</span>
                    <strong>
                      {row.source_checkpoints_total} total · {row.source_checkpoints_blocked} blocked ·{' '}
                      {row.source_checkpoints_requiring_evidence_review} review ·{' '}
                      {row.source_checkpoints_awaiting_external_go_no_go_confirmation} go/no-go confirmation ·{' '}
                      {row.source_checkpoints_awaiting_external_smoke_test_confirmation} smoke confirmation
                    </strong>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Allowed external observation statuses</span>
                    <div style={styles.chips}>{row.allowed_observation_statuses.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required external observation fields</span>
                    <div style={styles.chips}>{row.required_observation_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Post-launch rules</h2>
              <ul style={styles.list}>{data.post_launch_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Observation limitations</h2>
              <ul style={styles.list}>{data.observation_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
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
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'center' },
  notice: { background: '#fffbeb', border: '1px solid #fde68a', color: '#78350f', borderRadius: 14, padding: 14, lineHeight: 1.5 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  errorButton: { marginTop: 10, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  errorDetail: { marginTop: 6, fontSize: 12, overflowWrap: 'anywhere' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  sourceLink: { marginTop: 4, color: 'var(--io-primary-dark)', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  packetLink: { justifySelf: 'start', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 },
  inputCard: { display: 'grid', gap: 6, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', minWidth: 0, overflowWrap: 'anywhere' },
  checkGrid: { display: 'grid', gap: 12 },
  checkCard: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'grid', gap: 12, minWidth: 0 },
  rowHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  wrap: { minWidth: 0, overflowWrap: 'anywhere' },
  help: { color: '#64748b', fontSize: 12, overflowWrap: 'anywhere' },
  evidenceBox: { display: 'grid', gap: 4, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, overflowWrap: 'anywhere' },
  preconditionBox: { display: 'grid', gap: 4, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 12, color: '#78350f', overflowWrap: 'anywhere' },
  evidenceLabel: { color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', borderTop: '1px solid #e2e8f0', paddingTop: 10, flexWrap: 'wrap', overflowWrap: 'anywhere' },
  chips: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  chip: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '5px 9px', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 700, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  list: { margin: 0, paddingLeft: 20, color: '#334155', lineHeight: 1.55 },
  nextStep: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', color: 'var(--io-primary-deep)', borderRadius: 14, padding: 14, overflowWrap: 'anywhere' },
  note: { background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', borderRadius: 14, padding: 14, fontSize: 13, overflowWrap: 'anywhere' },
  error: { background: '#fef2f2', color: '#991b1b', borderRadius: 12, padding: 14, border: '1px solid #fecaca' },
};
