import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type CommandCenterCheckpoint = {
  code: string;
  domain: string;
  owner: string;
  required_evidence: string;
  hold_trigger: string;
  source_smoke_test_posture: string;
  source_smoke_tests_total: number;
  source_smoke_tests_blocked: number;
  source_smoke_tests_waiting_for_decisions: number;
  required_decision_fields: string[];
  allowed_decision_statuses: string[];
  default_decision_status: string;
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
  go_no_go_register_posture: string;
  acceptance_packet_posture: string;
  certificate_posture: string;
  command_center_rules: string[];
  launch_day_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('hold') || value.includes('missing')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('waiting') || value.includes('manual') || value.includes('ready') || value.includes('not_reviewed') || value.includes('conditional')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchDayCommandCenterPage() {
  const commandCenter = useQuery({
    queryKey: ['platform', 'commercial-launch-day-command-center'],
    queryFn: () => platformApiRequest<CommercialLaunchDayCommandCenter>('/platform/commercial-launch-day-command-center')
  });

  const data = commandCenter.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Day Command Center</h1>
          <p style={styles.description}>
            Step 221 converts the launch smoke-test checklist into a launch-window command center. It defines owners,
            communication checkpoints, incident response, billing hold, rollback controls, and post-launch observation
            evidence, while staying read-only and avoiding any automatic launch, billing, tenant, or notification action.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
        </div>
      </section>

      {commandCenter.isLoading ? <div style={styles.card}>Loading commercial launch day command center...</div> : null}
      {commandCenter.error ? <div style={styles.error}>Failed to load commercial launch day command center.</div> : null}

      {data ? (
        <>
          <section style={styles.grid}>
            {summary.map(([key, value]) => (
              <div key={key} style={styles.metric}>
                <div style={styles.metricValue}>{value}</div>
                <div style={styles.metricLabel}>{humanize(key)}</div>
              </div>
            ))}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Source launch postures</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}><span style={styles.help}>Smoke test</span><strong>{humanize(data.smoke_test_posture)}</strong></div>
              <div style={styles.inputCard}><span style={styles.help}>Go/no-go register</span><strong>{humanize(data.go_no_go_register_posture)}</strong></div>
              <div style={styles.inputCard}><span style={styles.help}>Acceptance packet</span><strong>{humanize(data.acceptance_packet_posture)}</strong></div>
              <div style={styles.inputCard}><span style={styles.help}>Certificate</span><strong>{humanize(data.certificate_posture)}</strong></div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Launch-window checkpoints</h2>
            <div style={styles.checkGrid}>
              {data.checkpoints.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.command_center_status)}>{humanize(row.command_center_status)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence</span>
                    <strong>{row.required_evidence}</strong>
                  </div>
                  <div style={styles.statusRow}><span>Default decision</span><span style={badgeStyle(row.default_decision_status)}>{humanize(row.default_decision_status)}</span></div>
                  <div style={styles.statusRow}><span>Hold trigger</span><strong>{humanize(row.hold_trigger)}</strong></div>
                  <div style={styles.statusRow}><span>Source smoke tests</span><strong>{row.source_smoke_tests_total} total · {row.source_smoke_tests_blocked} blocked · {row.source_smoke_tests_waiting_for_decisions} waiting</strong></div>
                  <div>
                    <span style={styles.evidenceLabel}>Allowed decision statuses</span>
                    <div style={styles.chips}>{row.allowed_decision_statuses.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required decision fields</span>
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
  page: { display: 'grid', gap: 18 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  eyebrow: { margin: 0, color: '#6b7280', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28 },
  description: { margin: 0, color: '#4b5563', maxWidth: 1000, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  generated: { color: '#6b7280', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  metricValue: { fontSize: 26, fontWeight: 900 },
  metricLabel: { color: '#6b7280', textTransform: 'capitalize', fontSize: 12, marginTop: 4 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  inputCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb', display: 'grid', gap: 6 },
  checkGrid: { display: 'grid', gap: 14 },
  checkCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#f9fafb', display: 'grid', gap: 12 },
  rowHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  help: { color: '#6b7280', fontSize: 12 },
  evidenceBox: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 4 },
  evidenceLabel: { color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { border: '1px solid #d1d5db', borderRadius: 999, padding: '5px 9px', background: '#fff', color: '#374151', fontSize: 12, textTransform: 'capitalize' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: 10, color: '#374151' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 },
  list: { margin: 0, paddingLeft: 20, color: '#374151', lineHeight: 1.6 },
  nextStep: { background: '#eef2ff', border: '1px solid #c7d2fe', color: '#3730a3', borderRadius: 14, padding: 14 },
  note: { background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', borderRadius: 14, padding: 14 },
  error: { background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 14, padding: 14 }
};
