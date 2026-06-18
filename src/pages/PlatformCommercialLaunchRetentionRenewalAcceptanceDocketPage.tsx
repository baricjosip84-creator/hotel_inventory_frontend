import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type RetentionRenewalAcceptanceDocketRow = {
  code: string;
  source_retention_renewal_review_code: string;
  source_evidence_retention_seal_code: string;
  source_final_evidence_archive_code: string;
  source_durable_closure_certification_code: string;
  source_resolution_verification_code: string;
  source_recurrence_resolution_code: string;
  source_recurrence_audit_code: string;
  source_closure_code: string;
  source_exception_code: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_retention_renewal_review_status: string;
  required_evidence_retention_seal: string[];
  required_retention_renewal_acceptance: string[];
  retention_renewal_acceptance_controls: string[];
  retention_renewal_acceptance_status: string;
  release_condition: string;
};

type RetentionRenewalAcceptanceDocket = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  retention_renewal_acceptance_docket_rows: RetentionRenewalAcceptanceDocketRow[];
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
  retention_renewal_acceptance_rules: string[];
  retention_renewal_acceptance_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('critical') || value.includes('blocked') || value.includes('rollback') || value.includes('hold')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('high') || value.includes('waiting') || value.includes('manual') || value.includes('renewal')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchRetentionRenewalAcceptanceDocketPage() {
  const retentionRenewalAcceptanceDocket = useQuery({
    queryKey: ['platform', 'commercial-launch-retention-renewal-acceptance-docket'],
    queryFn: () => platformApiRequest<RetentionRenewalAcceptanceDocket>('/platform/commercial-launch-retention-renewal-acceptance-docket')
  });

  const data = retentionRenewalAcceptanceDocket.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Retention Renewal Acceptance Docket</h1>
          <p style={styles.description}>
            Step 241 turns retention renewal review rows into a read-only retention renewal acceptance docket.
            It requires renewal review packet locators, accountable owner acceptance, leadership acknowledgement,
            and next review dates before retention renewal governance is treated as closed.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
        </div>
      </section>

      {retentionRenewalAcceptanceDocket.isLoading ? <div style={styles.card}>Loading commercial launch retention renewal acceptance docket...</div> : null}
      {retentionRenewalAcceptanceDocket.error ? <div style={styles.error}>Failed to load commercial launch retention renewal acceptance docket.</div> : null}

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
            <h2 style={styles.sectionTitle}>Retention renewal acceptance dependency chain</h2>
            <div style={styles.chainGrid}>
              <span>Retention renewal review: <strong>{humanize(data.retention_renewal_review_posture)}</strong></span>
              <span>Evidence retention seal: <strong>{humanize(data.evidence_retention_seal_posture)}</strong></span>
              <span>Final evidence archive: <strong>{humanize(data.final_evidence_archive_posture)}</strong></span>
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
            <h2 style={styles.sectionTitle}>Retention renewal acceptance docket rows</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Domain</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Acceptance status</th>
                    <th style={styles.th}>Required acceptance evidence</th>
                    <th style={styles.th}>Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {data.retention_renewal_acceptance_docket_rows.map((row) => (
                    <tr key={row.code}>
                      <td style={styles.td}>
                        <strong>{humanize(row.code)}</strong><br />
                        <span style={styles.small}>Renewal review: {humanize(row.source_retention_renewal_review_code)}</span><br />
                        <span style={styles.small}>Retention seal: {humanize(row.source_evidence_retention_seal_code)}</span><br />
                        <span style={styles.small}>Final archive: {humanize(row.source_final_evidence_archive_code)}</span><br />
                        <span style={styles.small}>Verification: {humanize(row.source_resolution_verification_code)}</span><br />
                        <span style={styles.small}>Resolution: {humanize(row.source_recurrence_resolution_code)}</span><br />
                        <span style={styles.small}>Audit: {humanize(row.source_recurrence_audit_code)}</span><br />
                        <span style={styles.small}>Closure: {humanize(row.source_closure_code)}</span><br />
                        <span style={styles.small}>Exception: {humanize(row.source_exception_code)}</span>
                      </td>
                      <td style={styles.td}>{humanize(row.domain)}</td>
                      <td style={styles.td}>{humanize(row.owner)}</td>
                      <td style={styles.td}><span style={badgeStyle(row.severity_hint)}>{humanize(row.severity_hint)}</span></td>
                      <td style={styles.td}><span style={badgeStyle(row.retention_renewal_acceptance_status)}>{humanize(row.retention_renewal_acceptance_status)}</span></td>
                      <td style={styles.td}>{row.required_retention_renewal_acceptance.join(', ')}</td>
                      <td style={styles.td}><ul style={styles.list}>{row.retention_renewal_acceptance_controls.map((control) => <li key={control}>{control}</li>)}</ul></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.twoColumn}>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Retention renewal acceptance rules</h2>
              <ul style={styles.list}>{data.retention_renewal_acceptance_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </article>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Limitations</h2>
              <ul style={styles.list}>{data.retention_renewal_acceptance_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
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
  page: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' },
  headerMeta: { display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' },
  eyebrow: { margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700 },
  title: { margin: '0.2rem 0', fontSize: '1.85rem', color: '#0f172a' },
  description: { margin: 0, color: '#475569', lineHeight: 1.6, maxWidth: '72rem' },
  generated: { color: '#64748b', fontSize: '0.85rem' },
  badge: { display: 'inline-flex', borderRadius: '999px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' },
  metricCard: { border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', background: '#ffffff' },
  metricLabel: { display: 'block', color: '#64748b', fontSize: '0.82rem', textTransform: 'capitalize' },
  metricValue: { display: 'block', marginTop: '0.35rem', fontSize: '1.45rem', color: '#0f172a' },
  card: { border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', background: '#ffffff' },
  sectionTitle: { margin: '0 0 0.75rem', color: '#0f172a', fontSize: '1.1rem' },
  chainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem', color: '#475569' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '0.75rem', color: '#475569', fontSize: '0.8rem' },
  td: { verticalAlign: 'top', borderBottom: '1px solid #f1f5f9', padding: '0.75rem', color: '#334155', fontSize: '0.9rem' },
  list: { margin: 0, paddingLeft: '1.2rem', color: '#475569', lineHeight: 1.6 },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' },
  note: { margin: '0.75rem 0 0', color: '#64748b', lineHeight: 1.6 },
  small: { color: '#64748b', fontSize: '0.78rem' },
  error: { border: '1px solid #fecaca', borderRadius: '1rem', padding: '1rem', background: '#fef2f2', color: '#991b1b' }
};
