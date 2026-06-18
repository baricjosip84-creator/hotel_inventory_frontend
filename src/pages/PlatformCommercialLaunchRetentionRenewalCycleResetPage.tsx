import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type RetentionRenewalCycleResetRow = {
  code: string;
  source_retention_renewal_archive_seal_code: string;
  source_retention_renewal_final_seal_code: string;
  source_retention_renewal_certification_code: string;
  source_retention_renewal_acceptance_code: string;
  source_retention_renewal_review_code: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_retention_renewal_archive_seal_status: string;
  required_retention_renewal_cycle_reset: string[];
  retention_renewal_cycle_reset_controls: string[];
  retention_renewal_cycle_reset_status: string;
  release_condition: string;
};

type RetentionRenewalCycleResetBoard = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  retention_renewal_cycle_reset_rows: RetentionRenewalCycleResetRow[];
  retention_renewal_archive_seal_posture: string;
  retention_renewal_final_seal_posture: string;
  retention_renewal_certification_posture: string;
  retention_renewal_acceptance_posture: string;
  retention_renewal_review_posture: string;
  evidence_retention_seal_posture: string;
  final_evidence_archive_posture: string;
  durable_closure_certification_posture: string;
  resolution_verification_posture: string;
  recurrence_resolution_posture: string;
  recurrence_audit_posture: string;
  exception_closure_posture: string;
  exception_review_posture: string;
  operations_cadence_posture: string;
  steady_state_transition_posture: string;
  retention_renewal_cycle_reset_rules: string[];
  retention_renewal_cycle_reset_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value?: string) {
  return String(value || 'not available').replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('critical') || value.includes('blocked') || value.includes('hold')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('high') || value.includes('waiting') || value.includes('manual') || value.includes('reset') || value.includes('renewal')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchRetentionRenewalCycleResetPage() {
  const cycleResetBoard = useQuery({
    queryKey: ['platform', 'commercial-launch-retention-renewal-cycle-reset'],
    queryFn: () => platformApiRequest<RetentionRenewalCycleResetBoard>('/platform/commercial-launch-retention-renewal-cycle-reset')
  });

  const data = cycleResetBoard.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Retention Renewal Cycle Reset Board</h1>
          <p style={styles.description}>
            Step 245 turns retention renewal archive seal rows into a read-only next-cycle reset board.
            It requires archive seal locators, next-cycle owner assignments, cadence references, renewal scope confirmation,
            and owner acceptance before the renewed governance cycle is treated as ready for the next review window.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
        </div>
      </section>

      {cycleResetBoard.isLoading ? <div style={styles.card}>Loading commercial launch retention renewal cycle reset board...</div> : null}
      {cycleResetBoard.error ? <div style={styles.error}>Failed to load commercial launch retention renewal cycle reset board.</div> : null}

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
            <h2 style={styles.sectionTitle}>Cycle reset dependency chain</h2>
            <div style={styles.chainGrid}>
              <span>Archive seal: <strong>{humanize(data.retention_renewal_archive_seal_posture)}</strong></span>
              <span>Final seal: <strong>{humanize(data.retention_renewal_final_seal_posture)}</strong></span>
              <span>Certification: <strong>{humanize(data.retention_renewal_certification_posture)}</strong></span>
              <span>Acceptance: <strong>{humanize(data.retention_renewal_acceptance_posture)}</strong></span>
              <span>Renewal review: <strong>{humanize(data.retention_renewal_review_posture)}</strong></span>
              <span>Evidence retention seal: <strong>{humanize(data.evidence_retention_seal_posture)}</strong></span>
              <span>Final archive: <strong>{humanize(data.final_evidence_archive_posture)}</strong></span>
              <span>Durable closure: <strong>{humanize(data.durable_closure_certification_posture)}</strong></span>
              <span>Resolution verification: <strong>{humanize(data.resolution_verification_posture)}</strong></span>
              <span>Recurrence resolution: <strong>{humanize(data.recurrence_resolution_posture)}</strong></span>
              <span>Recurrence audit: <strong>{humanize(data.recurrence_audit_posture)}</strong></span>
              <span>Exception closure: <strong>{humanize(data.exception_closure_posture)}</strong></span>
              <span>Exception review: <strong>{humanize(data.exception_review_posture)}</strong></span>
              <span>Operations cadence: <strong>{humanize(data.operations_cadence_posture)}</strong></span>
              <span>Steady-state transition: <strong>{humanize(data.steady_state_transition_posture)}</strong></span>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Retention renewal cycle reset rows</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Domain</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Cycle reset status</th>
                    <th style={styles.th}>Required reset evidence</th>
                    <th style={styles.th}>Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {data.retention_renewal_cycle_reset_rows.map((row) => (
                    <tr key={row.code}>
                      <td style={styles.td}>
                        <strong>{humanize(row.code)}</strong><br />
                        <span style={styles.small}>Archive seal: {humanize(row.source_retention_renewal_archive_seal_code)}</span><br />
                        <span style={styles.small}>Final seal: {humanize(row.source_retention_renewal_final_seal_code)}</span><br />
                        <span style={styles.small}>Certification: {humanize(row.source_retention_renewal_certification_code)}</span><br />
                        <span style={styles.small}>Acceptance: {humanize(row.source_retention_renewal_acceptance_code)}</span><br />
                        <span style={styles.small}>Review: {humanize(row.source_retention_renewal_review_code)}</span>
                      </td>
                      <td style={styles.td}>{humanize(row.domain)}</td>
                      <td style={styles.td}>{humanize(row.owner)}</td>
                      <td style={styles.td}><span style={badgeStyle(row.severity_hint)}>{humanize(row.severity_hint)}</span></td>
                      <td style={styles.td}><span style={badgeStyle(row.retention_renewal_cycle_reset_status)}>{humanize(row.retention_renewal_cycle_reset_status)}</span></td>
                      <td style={styles.td}>{row.required_retention_renewal_cycle_reset.join(', ')}</td>
                      <td style={styles.td}><ul style={styles.list}>{row.retention_renewal_cycle_reset_controls.map((control) => <li key={control}>{control}</li>)}</ul></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Rules and limitations</h2>
            <div style={styles.twoColumns}>
              <div>
                <h3 style={styles.subTitle}>Rules</h3>
                <ul style={styles.list}>{data.retention_renewal_cycle_reset_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
              </div>
              <div>
                <h3 style={styles.subTitle}>Limitations</h3>
                <ul style={styles.list}>{data.retention_renewal_cycle_reset_limitations.map((rule) => <li key={rule}>{rule}</li>)}</ul>
              </div>
            </div>
            <p style={styles.note}><strong>Next best step:</strong> {data.next_best_step}</p>
            <p style={styles.note}>{data.validation_note}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 24 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 },
  title: { margin: '8px 0', fontSize: 32, lineHeight: 1.1 },
  description: { margin: 0, maxWidth: 900, color: '#475569', lineHeight: 1.6 },
  headerMeta: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 },
  metricCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18 },
  metricLabel: { display: 'block', color: '#64748b', fontSize: 12, textTransform: 'capitalize' },
  metricValue: { display: 'block', marginTop: 8, fontSize: 28 },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20 },
  sectionTitle: { margin: '0 0 16px', fontSize: 20 },
  subTitle: { margin: '0 0 8px', fontSize: 16 },
  chainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, color: '#475569' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: 12, color: '#475569', fontSize: 12, textTransform: 'uppercase' },
  td: { verticalAlign: 'top', borderBottom: '1px solid #e2e8f0', padding: 12, color: '#334155', fontSize: 13 },
  small: { color: '#64748b', fontSize: 12 },
  list: { margin: 0, paddingLeft: 18 },
  twoColumns: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 },
  note: { margin: '16px 0 0', color: '#475569', lineHeight: 1.6 },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 16 }
};
