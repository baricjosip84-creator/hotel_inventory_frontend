import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type TriageRow = {
  code: string;
  source_observation_code: string;
  domain: string;
  owner: string;
  source_observation_status: string;
  escalation_trigger: string;
  customer_impact_review_required: boolean;
  severity_values: string[];
  default_severity: string;
  required_triage_fields: string[];
  triage_actions: string[];
  triage_status: string;
};

type IncidentTriage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  triage_rows: TriageRow[];
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  triage_rules: string[];
  triage_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}


function getTriageEvidenceLink(row: TriageRow) {
  const bySource: Record<string, string> = {
    service_health_observation_recorded: '/platform/system-health',
    customer_feedback_window_opened: '/platform/communications',
    support_intake_reviewed: '/platform/support-operations-cockpit',
    billing_activation_confirmed_or_held: '/platform/billing-subscription-activation',
    incident_review_completed: '/platform/incidents',
    rollback_readiness_reconfirmed: '/platform/deployment-validation',
    first_adoption_signal_reviewed: '/platform/pilot-customer-readiness',
    launch_handoff_closure_prepared: '/platform/commercial-launch-post-launch-observation'
  };
  const byDomain: Record<string, string> = {
    'Service health': '/platform/system-health',
    'Customer feedback': '/platform/communications',
    'Support intake': '/platform/support-operations-cockpit',
    'Billing confirmation': '/platform/billing-subscription-activation',
    'Incident review': '/platform/incidents',
    'Rollback readiness': '/platform/deployment-validation',
    'Adoption signal': '/platform/pilot-customer-readiness',
    'Handoff closure': '/platform/commercial-launch-post-launch-observation'
  };
  return bySource[row.source_observation_code] || byDomain[row.domain] || '/platform/commercial-launch-post-launch-observation';
}

function getTriageEvidenceLabel(row: TriageRow) {
  const bySource: Record<string, string> = {
    service_health_observation_recorded: 'Open system health',
    customer_feedback_window_opened: 'Open communications',
    support_intake_reviewed: 'Open support cockpit',
    billing_activation_confirmed_or_held: 'Open billing activation',
    incident_review_completed: 'Open incidents',
    rollback_readiness_reconfirmed: 'Open deployment validation',
    first_adoption_signal_reviewed: 'Open pilot readiness',
    launch_handoff_closure_prepared: 'Open post-launch observation'
  };
  return bySource[row.source_observation_code] || 'Open post-launch observation';
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('sev1') || value.includes('rollback')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('waiting') || value.includes('manual') || value.includes('watch') || value.includes('not_reviewed')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchIncidentTriagePage() {
  const triage = useQuery({
    queryKey: ['platform', 'commercial-launch-incident-triage'],
    queryFn: () => platformApiRequest<IncidentTriage>('/platform/commercial-launch-incident-triage')
  });

  const data = triage.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Incident Triage</h1>
          <p style={styles.description}>
            Step 223 turns post-launch observation rows into an operator triage queue. It tracks severity assignment,
            customer-impact review, owner routing, communication ownership, rollback decisioning, follow-up due time,
            and closure evidence without creating incidents, sending communications, changing billing, or mutating tenant state.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void triage.refetch()}
            disabled={triage.isFetching}
          >
            {triage.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting incident triage pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-post-launch-observation">Post-launch observation</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-day-command-center">Launch command center</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-go-no-go-register">Launch go/no-go</Link>
          <Link style={styles.quickLink} to="/platform/incidents">Incidents</Link>
          <Link style={styles.quickLink} to="/platform/system-health">System health</Link>
          <Link style={styles.quickLink} to="/platform/support-operations-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
        </div>
      </section>

      {triage.isLoading ? <div style={styles.card}>Loading commercial launch incident triage queue...</div> : null}
      {triage.error ? (
        <div style={styles.error}>
          Failed to load commercial launch incident triage queue.
          <button type="button" style={styles.errorButton} onClick={() => void triage.refetch()}>Retry</button>
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
              <div style={styles.inputCard}><span style={styles.help}>Post-launch observation</span><strong>{humanize(data.post_launch_observation_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-post-launch-observation">Open Post Launch Observation</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Command center</span><strong>{humanize(data.command_center_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-day-command-center">Open Command Center</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Smoke test</span><strong>{humanize(data.smoke_test_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-smoke-test-checklist">Open Launch Smoke Test</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Go/no-go register</span><strong>{humanize(data.go_no_go_register_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link></div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Triage rows</h2>
            <div style={styles.checkGrid}>
              {data.triage_rows.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.triage_status)}>{humanize(row.triage_status)}</span>
                  </div>
                  <div style={styles.statusRow}><span>Source observation</span><strong>{humanize(row.source_observation_code)}</strong></div>
                  <div style={styles.statusRow}><span>Source status</span><span style={badgeStyle(row.source_observation_status)}>{humanize(row.source_observation_status)}</span></div>
                  <div style={styles.statusRow}><span>Default severity</span><span style={badgeStyle(row.default_severity)}>{humanize(row.default_severity)}</span></div>
                  <div style={styles.statusRow}><span>Escalation trigger</span><strong>{humanize(row.escalation_trigger)}</strong></div>
                  <Link style={styles.packetLink} to={getTriageEvidenceLink(row)}>{getTriageEvidenceLabel(row)}</Link>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Triage actions</span>
                    <ul style={styles.list}>{row.triage_actions.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Severity values</span>
                    <div style={styles.chips}>{row.severity_values.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required triage fields</span>
                    <div style={styles.chips}>{row.required_triage_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Triage rules</h2>
              <ul style={styles.list}>{data.triage_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Triage limitations</h2>
              <ul style={styles.list}>{data.triage_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
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
