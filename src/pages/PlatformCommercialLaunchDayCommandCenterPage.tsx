import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type ExternalPersistence = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type CommandCenterCheckpoint = {
  code: string;
  domain: string;
  owner: string;
  required_evidence: string;
  hold_trigger: string;
  source_smoke_test_posture: string;
  source_smoke_tests_total: number;
  source_smoke_tests_requiring_evidence_review: number;
  source_smoke_tests_awaiting_external_go_no_go_confirmation: number;
  source_smoke_tests_blocked: number;
  manual_precondition: string;
  required_decision_fields: string[];
  allowed_decision_statuses: string[];
  default_decision_status: string;
  decision_artifact: string;
  decision_artifact_storage: string;
  command_center_status: string;
};

type CommercialLaunchDayCommandCenter = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  checkpoints: CommandCenterCheckpoint[];
  smoke_test_posture: string;
  smoke_test_summary: Record<string, number>;
  smoke_test_result_persistence: ExternalPersistence | null;
  go_no_go_register_posture: string;
  go_no_go_decision_persistence: ExternalPersistence | null;
  acceptance_packet_posture: string;
  certificate_posture: string;
  decision_persistence: ExternalPersistence;
  command_center_rules: string[];
  launch_day_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unable to load the commercial launch day command center.';
}

function getCheckpointEvidenceLink(row: CommandCenterCheckpoint) {
  const byCode: Record<string, string> = {
    launch_window_owner_confirmed: '/platform/commercial-launch-go-no-go-register',
    smoke_test_runner_confirmed: '/platform/commercial-launch-smoke-test-checklist',
    customer_success_launch_contact_confirmed: '/platform/pilot-customer-readiness',
    support_escalation_path_confirmed: '/platform/support-cockpit',
    billing_activation_hold_confirmed: '/platform/billing-subscription-activation',
    incident_commander_confirmed: '/platform/incidents',
    rollback_decision_owner_confirmed: '/platform/deployment-validation',
    post_launch_observation_window_confirmed: '/platform/monitoring-readiness'
  };
  return byCode[row.code] || '/platform/commercial-launch-smoke-test-checklist';
}

function getCheckpointEvidenceLabel(row: CommandCenterCheckpoint) {
  const byDomain: Record<string, string> = {
    launch_window_control: 'Open go/no-go register',
    smoke_test_execution: 'Open smoke-test checklist',
    customer_communication: 'Open pilot readiness',
    support_readiness: 'Open support cockpit',
    billing_activation_control: 'Open billing activation',
    incident_response: 'Open incidents',
    rollback_control: 'Open deployment validation',
    post_launch_observation: 'Open monitoring readiness'
  };
  return byDomain[row.domain] || 'Open smoke-test checklist';
}

function badgeStyle(value: string): CSSProperties {
  const normalized = value.toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('hold') || normalized.includes('missing')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (
    normalized.includes('review')
    || normalized.includes('waiting')
    || normalized.includes('external')
    || normalized.includes('manual')
    || normalized.includes('conditional')
    || normalized.includes('not reviewed')
    || normalized.includes('not_reviewed')
  ) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (normalized.includes('loading') || normalized.includes('unknown') || normalized.includes('preparation')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchDayCommandCenterPage() {
  const commandCenter = useQuery({
    queryKey: ['platform', 'commercial-launch-day-command-center'],
    queryFn: () => platformApiRequest<CommercialLaunchDayCommandCenter>('/platform/commercial-launch-day-command-center'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = commandCenter.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div style={styles.headerCopy}>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Day Command Center</h1>
          <p style={styles.description}>
            Step 221 is a launch-window preparation board. It organizes owners, communication checkpoints, incident
            response, billing holds, rollback controls, and post-launch observation evidence without executing launch
            actions or claiming that external decisions or smoke-test results exist.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void commandCenter.refetch()}
            disabled={commandCenter.isFetching}
          >
            {commandCenter.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.warningCard}>
        <strong>Preparation only.</strong> This application cannot observe external go/no-go decisions, smoke-test
        execution records, or launch-window command-center decisions. A checkpoint row is a record template, not proof
        that the launch prerequisite or decision has been completed.
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting launch pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-go-no-go-register">Launch go/no-go</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-acceptance">Launch acceptance</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-certificate">Launch certificate</Link>
          <Link style={styles.quickLink} to="/platform/support-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.quickLink} to="/platform/incidents">Incidents</Link>
          <Link style={styles.quickLink} to="/platform/monitoring-readiness">Monitoring readiness</Link>
          <Link style={styles.quickLink} to="/platform/deployment-validation">Deployment validation</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-post-launch-observation">Post-launch observation</Link>
        </div>
      </section>

      {commandCenter.isLoading ? <div style={styles.card}>Loading commercial launch day command center...</div> : null}
      {commandCenter.error ? (
        <div style={styles.error}>
          <div><strong>Failed to load commercial launch day command center.</strong><div style={styles.errorDetail}>{errorMessage(commandCenter.error)}</div></div>
          <button type="button" style={styles.errorButton} onClick={() => void commandCenter.refetch()} disabled={commandCenter.isFetching}>
            {commandCenter.isFetching ? 'Retrying...' : 'Retry'}
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
              <div><strong>Generated</strong><span>{new Date(data.generated_at).toLocaleString()}</span></div>
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
            <h2 style={styles.sectionTitle}>Source launch postures and external persistence</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}><span style={styles.help}>Smoke test</span><strong>{humanize(data.smoke_test_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-smoke-test-checklist">Open Launch Smoke Test</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Go/no-go register</span><strong>{humanize(data.go_no_go_register_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Acceptance packet</span><strong>{humanize(data.acceptance_packet_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-acceptance">Open Launch Acceptance</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Certificate</span><strong>{humanize(data.certificate_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-certificate">Open Launch Certificate</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Go/no-go decision persistence</span><strong>{data.go_no_go_decision_persistence?.stored_in_application ? 'Stored in application' : 'External / not stored'}</strong><span>{data.go_no_go_decision_persistence?.interpretation || 'No persistence metadata returned.'}</span></div>
              <div style={styles.inputCard}><span style={styles.help}>Smoke-test result persistence</span><strong>{data.smoke_test_result_persistence?.stored_in_application ? 'Stored in application' : 'External / not stored'}</strong><span>{data.smoke_test_result_persistence?.interpretation || 'No persistence metadata returned.'}</span></div>
              <div style={styles.inputCard}><span style={styles.help}>Command-center decision persistence</span><strong>{data.decision_persistence.stored_in_application ? 'Stored in application' : 'External / not stored'}</strong><span>{data.decision_persistence.interpretation}</span></div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Launch-window checkpoints</h2>
            <div style={styles.checkGrid}>
              {data.checkpoints.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div style={styles.rowHeaderCopy}>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.command_center_status)}>{humanize(row.command_center_status)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Manual precondition</span>
                    <strong>{row.manual_precondition}</strong>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence</span>
                    <strong>{row.required_evidence}</strong>
                  </div>
                  <Link style={styles.packetLink} to={getCheckpointEvidenceLink(row)}>{getCheckpointEvidenceLabel(row)}</Link>
                  <div style={styles.statusRow}><span>Template default decision</span><span style={badgeStyle(row.default_decision_status)}>{humanize(row.default_decision_status)}</span></div>
                  <div style={styles.statusRow}><span>Hold trigger</span><strong>{humanize(row.hold_trigger)}</strong></div>
                  <div style={styles.statusRow}><span>External decision artifact</span><strong>{row.decision_artifact}</strong></div>
                  <div style={styles.statusRow}><span>Artifact storage</span><strong>{humanize(row.decision_artifact_storage)}</strong></div>
                  <div style={styles.statusRow}>
                    <span>Source smoke tests</span>
                    <strong>
                      {row.source_smoke_tests_total} total · {row.source_smoke_tests_requiring_evidence_review} review ·{' '}
                      {row.source_smoke_tests_awaiting_external_go_no_go_confirmation} external confirmation · {row.source_smoke_tests_blocked} blocked
                    </strong>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Allowed external decision statuses</span>
                    <div style={styles.chips}>{row.allowed_decision_statuses.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required external decision fields</span>
                    <div style={styles.chips}>{row.required_decision_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Command center rules</h2>
              <ul style={styles.list}>{data.command_center_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Launch-day limitations</h2>
              <ul style={styles.list}>{data.launch_day_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
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
  headerCopy: { minWidth: 0, flex: '1 1 620px' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a', overflowWrap: 'anywhere' },
  description: { margin: 0, color: '#64748b', maxWidth: 1000, lineHeight: 1.5, overflowWrap: 'anywhere' },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8, minWidth: 0 },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'normal', overflowWrap: 'anywhere', textAlign: 'center' },
  warningCard: { background: '#fffbeb', border: '1px solid #fde68a', color: '#78350f', borderRadius: 14, padding: 14, lineHeight: 1.5, overflowWrap: 'anywhere' },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: '#1d4ed8', textDecoration: 'none', fontSize: 12, fontWeight: 700, overflowWrap: 'anywhere' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  errorButton: { border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  errorDetail: { marginTop: 4, fontSize: 12, overflowWrap: 'anywhere' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  sourceLink: { marginTop: 4, color: '#1d4ed8', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  packetLink: { justifySelf: 'start', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: '#1d4ed8', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', textTransform: 'capitalize', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a', overflowWrap: 'anywhere' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  inputCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', display: 'grid', gap: 6, minWidth: 0, overflowWrap: 'anywhere' },
  checkGrid: { display: 'grid', gap: 14 },
  checkCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc', display: 'grid', gap: 12, minWidth: 0 },
  rowHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
  rowHeaderCopy: { minWidth: 0, flex: '1 1 360px', overflowWrap: 'anywhere' },
  help: { color: '#64748b', fontSize: 12 },
  evidenceBox: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 4, overflowWrap: 'anywhere' },
  evidenceLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '5px 9px', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 700, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 10, color: '#334155', flexWrap: 'wrap', overflowWrap: 'anywhere' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 },
  list: { margin: 0, paddingLeft: 20, color: '#334155', lineHeight: 1.6, overflowWrap: 'anywhere' },
  nextStep: { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', borderRadius: 14, padding: 14, overflowWrap: 'anywhere' },
  note: { background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', borderRadius: 14, padding: 14, overflowWrap: 'anywhere' },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 14, padding: 14, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }
};
