import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type Persistence = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type ClosureRow = {
  code: string;
  source_triage_code: string;
  source_observation_code: string;
  domain: string;
  owner: string;
  source_triage_status: string;
  source_default_severity: string;
  source_triage_artifact: string;
  source_triage_artifact_storage: string;
  customer_impact_review_required: boolean;
  manual_precondition: string;
  required_closure_fields: string[];
  handoff_decision_values: string[];
  default_handoff_decision: string;
  closure_artifact: string;
  closure_artifact_storage: string;
  closure_requirements: string[];
  closure_status: string;
};

type IncidentClosure = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  closure_rows: ClosureRow[];
  incident_triage_posture: string;
  incident_triage_persistence: Persistence | null;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  closure_persistence: Persistence;
  closure_rules: string[];
  closure_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string | null | undefined) {
  return (value || 'unknown').replaceAll('_', ' ');
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unknown error';
}

function getClosureEvidenceLink(row: ClosureRow) {
  const bySource: Record<string, string> = {
    service_health_observation_recorded_triage: '/platform/system-health',
    customer_feedback_window_opened_triage: '/platform/tenant-communications',
    support_intake_reviewed_triage: '/platform/support-cockpit',
    billing_activation_confirmed_or_held_triage: '/platform/billing-subscription-activation',
    incident_review_completed_triage: '/platform/incidents',
    rollback_readiness_reconfirmed_triage: '/platform/deployment-validation',
    first_adoption_signal_reviewed_triage: '/platform/pilot-customer-readiness',
    launch_handoff_closure_prepared_triage: '/platform/commercial-launch-post-launch-observation'
  };
  const byDomain: Record<string, string> = {
    service_health: '/platform/system-health',
    customer_feedback: '/platform/tenant-communications',
    support_intake: '/platform/support-cockpit',
    billing_confirmation: '/platform/billing-subscription-activation',
    incident_review: '/platform/incidents',
    rollback_readiness: '/platform/deployment-validation',
    adoption_signal: '/platform/pilot-customer-readiness',
    handoff_closure: '/platform/commercial-launch-post-launch-observation'
  };
  return bySource[row.source_triage_code] || byDomain[row.domain] || '/platform/commercial-launch-incident-triage';
}

function getClosureEvidenceLabel(row: ClosureRow) {
  const byDomain: Record<string, string> = {
    service_health: 'Open system health',
    customer_feedback: 'Open tenant communications',
    support_intake: 'Open support cockpit',
    billing_confirmation: 'Open billing activation',
    incident_review: 'Open incidents',
    rollback_readiness: 'Open deployment validation',
    adoption_signal: 'Open pilot readiness',
    handoff_closure: 'Open post-launch observation'
  };
  return byDomain[row.domain] || 'Open incident triage';
}

function badgeStyle(value: string | null | undefined): CSSProperties {
  const normalized = (value || '').toLowerCase();
  if (!normalized || normalized === 'loading' || normalized.includes('unknown')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (normalized.includes('blocked') || normalized.includes('sev1') || normalized.includes('rolled_back')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (
    normalized.includes('waiting')
    || normalized.includes('external')
    || normalized.includes('manual')
    || normalized.includes('review')
    || normalized.includes('watch')
    || normalized.includes('not_reviewed')
    || normalized.includes('preparation')
  ) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchIncidentClosurePage() {
  const closure = useQuery({
    queryKey: ['platform', 'commercial-launch-incident-closure'],
    queryFn: () => platformApiRequest<IncidentClosure>('/platform/commercial-launch-incident-closure'),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const data = closure.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Incident Closure</h1>
          <p style={styles.description}>
            <strong>Closure preparation only.</strong> Step 224 converts Incident Triage rows into external final-severity,
            customer-impact, rollback, customer-communication, prevention, handoff, evidence, and closure-owner
            requirements. This application does not observe or persist the external triage records or the resulting
            incident-closure decisions.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void closure.refetch()}
            disabled={closure.isFetching}
          >
            {closure.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.boundaryCard}>
        <strong>External confirmation boundary.</strong>
        <span>
          This board can prepare closure records, but it cannot confirm external Go/No-Go decisions, smoke-test
          results, launch-window decisions, post-launch observations, triage outcomes, or incident-closure outcomes.
          Resolve the current prerequisite and independently confirm the source triage record before recording closure.
        </span>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting incident closure pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-incident-triage">Incident triage</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-post-launch-observation">Post-launch observation</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-day-command-center">Launch command center</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-go-no-go-register">Launch go/no-go</Link>
          <Link style={styles.quickLink} to="/platform/incidents">Incidents</Link>
          <Link style={styles.quickLink} to="/platform/system-health">System health</Link>
          <Link style={styles.quickLink} to="/platform/support-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.quickLink} to="/platform/tenant-communications">Tenant communications</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-prevention-verification">Prevention verification</Link>
        </div>
      </section>

      {closure.isLoading ? <div style={styles.card}>Loading commercial launch incident closure preparation...</div> : null}
      {closure.error ? (
        <div style={styles.error}>
          <strong>Failed to load commercial launch incident closure.</strong>
          <span>{errorMessage(closure.error)}</span>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void closure.refetch()}
            disabled={closure.isFetching}
          >
            {closure.isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Snapshot metadata</h2>
            <div style={styles.metadataGrid}>
              <div style={styles.metadataItem}><strong>Phase</strong><span>{data.phase}</span></div>
              <div style={styles.metadataItem}><strong>Step</strong><span>{data.step}</span></div>
              <div style={styles.metadataItem}><strong>Generated</strong><span>{data.generated_at ? new Date(data.generated_at).toLocaleString() : '-'}</span></div>
              <div style={styles.metadataItem}><strong>Validation</strong><span>{data.validation_note}</span></div>
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

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Incident-triage persistence</h2>
              <div style={styles.statusRow}><span>Stored in application</span><strong>{data.incident_triage_persistence?.stored_in_application ? 'Yes' : 'No'}</strong></div>
              <div style={styles.statusRow}><span>External records observable</span><strong>{data.incident_triage_persistence?.external_records_observable ? 'Yes' : 'No'}</strong></div>
              <p style={styles.help}>{data.incident_triage_persistence?.interpretation || 'Incident-triage persistence metadata is unavailable.'}</p>
            </div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Incident-closure persistence</h2>
              <div style={styles.statusRow}><span>Stored in application</span><strong>{data.closure_persistence.stored_in_application ? 'Yes' : 'No'}</strong></div>
              <div style={styles.statusRow}><span>External records observable</span><strong>{data.closure_persistence.external_records_observable ? 'Yes' : 'No'}</strong></div>
              <p style={styles.help}>{data.closure_persistence.interpretation}</p>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Source postures</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}><span style={styles.help}>Incident triage</span><strong>{humanize(data.incident_triage_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-incident-triage">Open Incident Triage</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Post-launch observation</span><strong>{humanize(data.post_launch_observation_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-post-launch-observation">Open Post-Launch Observation</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Command center</span><strong>{humanize(data.command_center_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-day-command-center">Open Command Center</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Smoke test</span><strong>{humanize(data.smoke_test_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-smoke-test-checklist">Open Launch Smoke Test</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Go/no-go register</span><strong>{humanize(data.go_no_go_register_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link></div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Closure preparation rows</h2>
            <div style={styles.checkGrid}>
              {data.closure_rows.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div style={styles.wrapAnywhere}>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.closure_status)}>{humanize(row.closure_status)}</span>
                  </div>
                  <div style={styles.statusRow}><span>Source triage</span><strong style={styles.wrapAnywhere}>{humanize(row.source_triage_code)}</strong></div>
                  <div style={styles.statusRow}><span>Source prerequisite status</span><span style={badgeStyle(row.source_triage_status)}>{humanize(row.source_triage_status)}</span></div>
                  <div style={styles.statusRow}><span>Source template default severity</span><span style={badgeStyle(row.source_default_severity)}>{humanize(row.source_default_severity)}</span></div>
                  <div style={styles.statusRow}><span>Template default handoff decision</span><span style={badgeStyle(row.default_handoff_decision)}>{humanize(row.default_handoff_decision)}</span></div>
                  <div style={styles.statusRow}><span>Customer impact review</span><strong>{row.customer_impact_review_required ? 'Required' : 'Not required'}</strong></div>
                  <Link style={styles.packetLink} to={getClosureEvidenceLink(row)}>{getClosureEvidenceLabel(row)}</Link>

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Manual precondition</span>
                    <span>{row.manual_precondition}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Source triage artifact</span>
                    <strong>{row.source_triage_artifact}</strong>
                    <span>{humanize(row.source_triage_artifact_storage)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>External closure artifact</span>
                    <strong>{row.closure_artifact}</strong>
                    <span>{humanize(row.closure_artifact_storage)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Closure requirements</span>
                    <ul style={styles.list}>{row.closure_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Allowed handoff decisions</span>
                    <div style={styles.chips}>{row.handoff_decision_values.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required external closure fields</span>
                    <div style={styles.chips}>{row.required_closure_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Closure rules</h2>
              <ul style={styles.list}>{data.closure_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Closure limitations</h2>
              <ul style={styles.list}>{data.closure_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
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
  header: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#64748b', maxWidth: 1000, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  generated: { color: '#64748b', fontSize: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: '#1d4ed8', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  errorButton: { justifySelf: 'start', border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  metadataItem: { display: 'grid', gap: 5, overflowWrap: 'anywhere' },
  sourceLink: { marginTop: 4, color: '#1d4ed8', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  packetLink: { justifySelf: 'start', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: '#1d4ed8', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  boundaryCard: { display: 'grid', gap: 6, background: '#fffbeb', border: '1px solid #fde68a', color: '#78350f', borderRadius: 14, padding: 14, lineHeight: 1.5 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 },
  inputCard: { display: 'grid', gap: 6, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', minWidth: 0, overflowWrap: 'anywhere' },
  checkGrid: { display: 'grid', gap: 12 },
  checkCard: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'grid', gap: 12, minWidth: 0 },
  rowHeader: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  help: { color: '#64748b', fontSize: 12, lineHeight: 1.45, overflowWrap: 'anywhere' },
  evidenceBox: { display: 'grid', gap: 5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, overflowWrap: 'anywhere' },
  evidenceLabel: { color: '#64748b', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' },
  statusRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 10, overflowWrap: 'anywhere' },
  chips: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  chip: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '5px 9px', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 700, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  list: { margin: 0, paddingLeft: 20, color: '#334155', lineHeight: 1.55 },
  nextStep: { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', borderRadius: 14, padding: 14, overflowWrap: 'anywhere' },
  note: { background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', borderRadius: 14, padding: 14, fontSize: 13, overflowWrap: 'anywhere' },
  error: { display: 'grid', gap: 8, background: '#fef2f2', color: '#991b1b', borderRadius: 12, padding: 14, overflowWrap: 'anywhere', border: '1px solid #fecaca' },
  wrapAnywhere: { minWidth: 0, overflowWrap: 'anywhere' }
};
