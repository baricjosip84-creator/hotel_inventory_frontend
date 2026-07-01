import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type ClosureRow = {
  code: string;
  source_triage_code: string;
  domain: string;
  owner: string;
  source_triage_status: string;
  customer_impact_review_required: boolean;
  accepted_handoff_decisions: string[];
  source_default_severity: string;
  required_closure_fields: string[];
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
  post_launch_observation_posture: string;
  incident_triage_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  closure_rules: string[];
  closure_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}



function getClosureEvidenceLink(row: ClosureRow) {
  const bySource: Record<string, string> = {
    service_health_observation_recorded_triage: '/platform/system-health',
    customer_feedback_window_opened_triage: '/platform/communications',
    support_intake_reviewed_triage: '/platform/support-operations-cockpit',
    billing_activation_confirmed_or_held_triage: '/platform/billing-subscription-activation',
    incident_review_completed_triage: '/platform/incidents',
    rollback_readiness_reconfirmed_triage: '/platform/deployment-validation',
    first_adoption_signal_reviewed_triage: '/platform/pilot-customer-readiness',
    launch_handoff_closure_prepared_triage: '/platform/commercial-launch-post-launch-observation'
  };
  const byDomain: Record<string, string> = {
    service_health: '/platform/system-health',
    customer_feedback: '/platform/communications',
    support_intake: '/platform/support-operations-cockpit',
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
    customer_feedback: 'Open communications',
    support_intake: 'Open support cockpit',
    billing_confirmation: 'Open billing activation',
    incident_review: 'Open incidents',
    rollback_readiness: 'Open deployment validation',
    adoption_signal: 'Open pilot readiness',
    handoff_closure: 'Open post-launch observation'
  };
  return byDomain[row.domain] || 'Open incident triage';
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('sev1') || value.includes('rollback')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('waiting') || value.includes('manual') || value.includes('watch') || value.includes('not_reviewed')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchIncidentClosurePage() {
  const closure = useQuery({
    queryKey: ['platform', 'commercial-launch-incident-closure'],
    queryFn: () => platformApiRequest<IncidentClosure>('/platform/commercial-launch-incident-closure')
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
            Step 224 turns incident triage rows into a manual incident closure board. It tracks final severity,
            customer-impact resolution, rollback outcome, customer communication completion, prevention action,
            handoff decision, closure evidence, and closure owner without closing incidents, sending communications,
            changing billing, rolling back systems, or mutating tenant state.
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
        </div>
      </section>

      {closure.isLoading ? <div style={styles.card}>Loading commercial launch incident closure board...</div> : null}
      {closure.error ? (
        <div style={styles.error}>
          Failed to load commercial launch incident closure board.
          <button type="button" style={styles.errorButton} onClick={() => void closure.refetch()}>Retry</button>
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
            <h2 style={styles.sectionTitle}>Source postures</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}><span style={styles.help}>Incident triage</span><strong>{humanize(data.incident_triage_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-incident-triage">Open Incident Triage</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Post-launch observation</span><strong>{humanize(data.post_launch_observation_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-post-launch-observation">Open Post Launch Observation</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Command center</span><strong>{humanize(data.command_center_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-day-command-center">Open Command Center</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Smoke test</span><strong>{humanize(data.smoke_test_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-smoke-test-checklist">Open Launch Smoke Test</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Go/no-go register</span><strong>{humanize(data.go_no_go_register_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link></div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Closure rows</h2>
            <div style={styles.checkGrid}>
              {data.closure_rows.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.closure_status)}>{humanize(row.closure_status)}</span>
                  </div>
                  <div style={styles.statusRow}><span>Source triage</span><strong>{humanize(row.source_triage_code)}</strong></div>
                  <div style={styles.statusRow}><span>Source status</span><span style={badgeStyle(row.source_triage_status)}>{humanize(row.source_triage_status)}</span></div>
                  <div style={styles.statusRow}><span>Source default severity</span><span style={badgeStyle(row.source_default_severity)}>{humanize(row.source_default_severity)}</span></div>
                  <div style={styles.statusRow}><span>Customer impact review</span><strong>{row.customer_impact_review_required ? 'Required' : 'Not required'}</strong></div>
                  <Link style={styles.packetLink} to={getClosureEvidenceLink(row)}>{getClosureEvidenceLabel(row)}</Link>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Closure requirements</span>
                    <ul style={styles.list}>{row.closure_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Accepted handoff decisions</span>
                    <div style={styles.chips}>{row.accepted_handoff_decisions.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required closure fields</span>
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
  page: { display: 'grid', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  eyebrow: { margin: 0, color: '#6b7280', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28 },
  description: { margin: 0, color: '#4b5563', maxWidth: 1000, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  generated: { color: '#6b7280', fontSize: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730a3', borderRadius: 999, padding: '7px 11px', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  errorButton: { marginLeft: 12, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  sourceLink: { marginTop: 4, color: '#2563eb', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  packetLink: { justifySelf: 'start', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730a3', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  metricValue: { fontSize: 26, fontWeight: 900 },
  metricLabel: { color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 },
  inputCard: { display: 'grid', gap: 6, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb' },
  checkGrid: { display: 'grid', gap: 12 },
  checkCard: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, display: 'grid', gap: 12 },
  rowHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  help: { color: '#6b7280', fontSize: 12 },
  evidenceBox: { display: 'grid', gap: 4, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 },
  evidenceLabel: { color: '#6b7280', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 10 },
  chips: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  chip: { background: '#eef2ff', color: '#3730a3', borderRadius: 999, padding: '5px 8px', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  list: { margin: 0, paddingLeft: 20, color: '#374151', lineHeight: 1.55 },
  nextStep: { background: '#ecfeff', border: '1px solid #a5f3fc', color: '#155e75', borderRadius: 14, padding: 14 },
  note: { background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', borderRadius: 14, padding: 14, fontSize: 13 },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 14 }
};
