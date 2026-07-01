import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type RetentionRenewalCertificationRow = {
  code: string;
  source_retention_renewal_acceptance_code: string;
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
  source_retention_renewal_acceptance_status: string;
  required_retention_renewal_acceptance: string[];
  required_retention_renewal_certification: string[];
  retention_renewal_certification_controls: string[];
  retention_renewal_certification_status: string;
  release_condition: string;
};

type RetentionRenewalCertificationBoard = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  retention_renewal_certification_rows: RetentionRenewalCertificationRow[];
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
  retention_renewal_certification_rules: string[];
  retention_renewal_certification_limitations: string[];
  next_best_step: string;
  validation_note: string;
};


type PageLink = {
  label: string;
  to: string;
};

const supportingLinks: PageLink[] = [
  { label: 'Renewal Acceptance', to: '/platform/commercial-launch-retention-renewal-acceptance-docket' },
  { label: 'Retention Renewal', to: '/platform/commercial-launch-retention-renewal-review' },
  { label: 'Evidence Retention Seal', to: '/platform/commercial-launch-evidence-retention-seal' },
  { label: 'Final Evidence Archive', to: '/platform/commercial-launch-final-evidence-archive' },
  { label: 'Durable Closure', to: '/platform/commercial-launch-durable-closure-certification' },
  { label: 'Resolution Verification', to: '/platform/commercial-launch-steady-state-resolution-verification' },
  { label: 'Recurrence Resolution', to: '/platform/commercial-launch-steady-state-recurrence-resolution' },
  { label: 'Recurrence Audit', to: '/platform/commercial-launch-steady-state-recurrence-audit' },
  { label: 'Exception Closure', to: '/platform/commercial-launch-steady-state-exception-closure' },
  { label: 'Exception Review', to: '/platform/commercial-launch-steady-state-exception-review' },
  { label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-State Transition', to: '/platform/commercial-launch-steady-state-transition' },
  { label: 'Runbooks', to: '/platform/runbooks' },
  { label: 'Support Cockpit', to: '/platform/support-cockpit' },
  { label: 'Billing', to: '/platform/billing' },
  { label: 'Customer Success', to: '/platform/customer-success' }
];

const sourcePostureLinks: PageLink[] = [
  { label: 'Retention renewal acceptance', to: '/platform/commercial-launch-retention-renewal-acceptance-docket' },
  { label: 'Retention renewal review', to: '/platform/commercial-launch-retention-renewal-review' },
  { label: 'Evidence retention seal', to: '/platform/commercial-launch-evidence-retention-seal' },
  { label: 'Final evidence archive', to: '/platform/commercial-launch-final-evidence-archive' },
  { label: 'Durable closure', to: '/platform/commercial-launch-durable-closure-certification' },
  { label: 'Resolution verification', to: '/platform/commercial-launch-steady-state-resolution-verification' },
  { label: 'Recurrence resolution', to: '/platform/commercial-launch-steady-state-recurrence-resolution' },
  { label: 'Recurrence audit', to: '/platform/commercial-launch-steady-state-recurrence-audit' },
  { label: 'Exception closure', to: '/platform/commercial-launch-steady-state-exception-closure' },
  { label: 'Exception review', to: '/platform/commercial-launch-steady-state-exception-review' },
  { label: 'Operations cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-state transition', to: '/platform/commercial-launch-steady-state-transition' }
];

function evidenceLinksForRow(row: RetentionRenewalCertificationRow): PageLink[] {
  const links: PageLink[] = [
    { label: 'Renewal Acceptance', to: '/platform/commercial-launch-retention-renewal-acceptance-docket' },
    { label: 'Retention Renewal', to: '/platform/commercial-launch-retention-renewal-review' },
    { label: 'Evidence Retention Seal', to: '/platform/commercial-launch-evidence-retention-seal' },
    { label: 'Final Evidence Archive', to: '/platform/commercial-launch-final-evidence-archive' },
    { label: 'Durable Closure', to: '/platform/commercial-launch-durable-closure-certification' },
    { label: 'Resolution Verification', to: '/platform/commercial-launch-steady-state-resolution-verification' },
    { label: 'Recurrence Resolution', to: '/platform/commercial-launch-steady-state-recurrence-resolution' },
    { label: 'Recurrence Audit', to: '/platform/commercial-launch-steady-state-recurrence-audit' },
    { label: 'Exception Closure', to: '/platform/commercial-launch-steady-state-exception-closure' }
  ];

  if (row.domain.includes('missed_cadence')) {
    links.push({ label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' });
    links.push({ label: 'Monitoring Readiness', to: '/platform/monitoring-readiness' });
  }
  if (row.domain.includes('health_regression')) {
    links.push({ label: 'System Health', to: '/platform/system-health' });
    links.push({ label: 'Dependencies', to: '/platform/dependencies' });
    links.push({ label: 'Deployment Validation', to: '/platform/deployment-validation' });
  }
  if (row.domain.includes('customer_adoption')) {
    links.push({ label: 'Customer Success', to: '/platform/customer-success' });
    links.push({ label: 'Announcements', to: '/platform/announcements' });
  }
  if (row.domain.includes('support_sla')) {
    links.push({ label: 'Support Cockpit', to: '/platform/support-cockpit' });
    links.push({ label: 'Incidents', to: '/platform/incidents' });
  }
  if (row.domain.includes('billing_entitlement')) {
    links.push({ label: 'Billing', to: '/platform/billing' });
    links.push({ label: 'Tenants', to: '/platform/tenants' });
  }
  if (row.domain.includes('backup_restore')) {
    links.push({ label: 'Backup Restore', to: '/platform/backup-restore-validation' });
    links.push({ label: 'Tenant Exports', to: '/platform/tenant-exports' });
    links.push({ label: 'Runbooks', to: '/platform/runbooks' });
  }
  if (row.domain.includes('deployment_smoke_test')) {
    links.push({ label: 'Smoke Test', to: '/platform/commercial-launch-smoke-test-checklist' });
    links.push({ label: 'Releases', to: '/platform/releases' });
  }
  if (row.domain.includes('incident_prevention')) {
    links.push({ label: 'Incident Closure', to: '/platform/commercial-launch-incident-closure' });
    links.push({ label: 'Prevention Verification', to: '/platform/commercial-launch-prevention-verification' });
    links.push({ label: 'Runbooks', to: '/platform/runbooks' });
  }
  if (row.domain.includes('growth_governance')) {
    links.push({ label: 'Growth Observation', to: '/platform/commercial-launch-additional-growth-observation' });
    links.push({ label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' });
    links.push({ label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' });
  }

  return links;
}

function renderLinks(links: PageLink[]) {
  return (
    <div style={styles.linkList}>
      {links.map((link) => (
        <a key={`${link.label}-${link.to}`} href={link.to} style={styles.link}>{link.label}</a>
      ))}
    </div>
  );
}

function humanize(value?: string) {
  return String(value || 'not available').replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('critical') || value.includes('blocked') || value.includes('rollback') || value.includes('hold')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('high') || value.includes('waiting') || value.includes('manual') || value.includes('renewal')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchRetentionRenewalCertificationPage() {
  const certificationBoard = useQuery({
    queryKey: ['platform', 'commercial-launch-retention-renewal-certification'],
    queryFn: () => platformApiRequest<RetentionRenewalCertificationBoard>('/platform/commercial-launch-retention-renewal-certification')
  });

  const data = certificationBoard.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Retention Renewal Certification Board</h1>
          <p style={styles.description}>
            Step 242 turns retention renewal acceptance docket rows into a read-only certification board.
            It requires accepted docket locators, accountable owner certification, renewed evidence locators,
            and next certification review dates before the renewed launch governance cycle is treated as closed.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button type="button" style={styles.button} onClick={() => certificationBoard.refetch()} disabled={certificationBoard.isFetching}>
            {certificationBoard.isFetching ? 'Refreshing...' : certificationBoard.error ? 'Retry' : 'Refresh'}
          </button>
        </div>
      </section>

      {certificationBoard.isLoading ? <div style={styles.card}>Loading commercial launch retention renewal certification board...</div> : null}
      {certificationBoard.error ? <div style={styles.error}>Failed to load commercial launch retention renewal certification board.</div> : null}

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
            <h2 style={styles.sectionTitle}>Snapshot metadata</h2>
            <div style={styles.metaGrid}>
              <span><strong>Phase:</strong> {data.phase}</span>
              <span><strong>Step:</strong> {data.step}</span>
              <span><strong>Generated:</strong> {new Date(data.generated_at).toLocaleString()}</span>
              <span><strong>Overall posture:</strong> {humanize(data.posture)}</span>
            </div>
            <div style={styles.supportingLinks}>{renderLinks(supportingLinks)}</div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Certification dependency chain</h2>
            <div style={styles.chainGrid}>
              <span><a href={sourcePostureLinks[0].to} style={styles.link}>Retention renewal acceptance</a>: <strong>{humanize(data.retention_renewal_acceptance_posture)}</strong></span>
              <span><a href={sourcePostureLinks[1].to} style={styles.link}>Retention renewal review</a>: <strong>{humanize(data.retention_renewal_review_posture)}</strong></span>
              <span><a href={sourcePostureLinks[2].to} style={styles.link}>Evidence retention seal</a>: <strong>{humanize(data.evidence_retention_seal_posture)}</strong></span>
              <span><a href={sourcePostureLinks[3].to} style={styles.link}>Final evidence archive</a>: <strong>{humanize(data.final_evidence_archive_posture)}</strong></span>
              <span><a href={sourcePostureLinks[4].to} style={styles.link}>Durable closure</a>: <strong>{humanize(data.durable_closure_certification_posture)}</strong></span>
              <span><a href={sourcePostureLinks[5].to} style={styles.link}>Resolution verification</a>: <strong>{humanize(data.resolution_verification_posture)}</strong></span>
              <span><a href={sourcePostureLinks[6].to} style={styles.link}>Recurrence resolution</a>: <strong>{humanize(data.recurrence_resolution_posture)}</strong></span>
              <span><a href={sourcePostureLinks[7].to} style={styles.link}>Recurrence audit</a>: <strong>{humanize(data.recurrence_audit_posture)}</strong></span>
              <span><a href={sourcePostureLinks[8].to} style={styles.link}>Exception closure</a>: <strong>{humanize(data.exception_closure_posture)}</strong></span>
              <span><a href={sourcePostureLinks[9].to} style={styles.link}>Exception review</a>: <strong>{humanize(data.exception_review_posture)}</strong></span>
              <span><a href={sourcePostureLinks[10].to} style={styles.link}>Operations cadence</a>: <strong>{humanize(data.operations_cadence_posture)}</strong></span>
              <span><a href={sourcePostureLinks[11].to} style={styles.link}>Steady-state transition</a>: <strong>{humanize(data.steady_state_transition_posture)}</strong></span>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Retention renewal certification rows</h2>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Code</th>
                    <th style={styles.th}>Domain</th>
                    <th style={styles.th}>Owner</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Certification status</th>
                    <th style={styles.th}>Required certification evidence</th>
                    <th style={styles.th}>Controls</th>
                    <th style={styles.th}>Evidence links</th>
                  </tr>
                </thead>
                <tbody>
                  {data.retention_renewal_certification_rows.map((row) => (
                    <tr key={row.code}>
                      <td style={styles.td}>
                        <strong>{humanize(row.code)}</strong><br />
                        <span style={styles.small}>Acceptance: {humanize(row.source_retention_renewal_acceptance_code)}</span><br />
                        <span style={styles.small}>Renewal review: {humanize(row.source_retention_renewal_review_code)}</span><br />
                        <span style={styles.small}>Retention seal: {humanize(row.source_evidence_retention_seal_code)}</span><br />
                        <span style={styles.small}>Final archive: {humanize(row.source_final_evidence_archive_code)}</span><br />
                        <span style={styles.small}>Verification: {humanize(row.source_resolution_verification_code)}</span><br />
                        <span style={styles.small}>Resolution: {humanize(row.source_recurrence_resolution_code)}</span><br />
                        <span style={styles.small}>Audit: {humanize(row.source_recurrence_audit_code)}</span>
                      </td>
                      <td style={styles.td}>{humanize(row.domain)}</td>
                      <td style={styles.td}>{humanize(row.owner)}</td>
                      <td style={styles.td}><span style={badgeStyle(row.severity_hint)}>{humanize(row.severity_hint)}</span></td>
                      <td style={styles.td}><span style={badgeStyle(row.retention_renewal_certification_status)}>{humanize(row.retention_renewal_certification_status)}</span></td>
                      <td style={styles.td}>{row.required_retention_renewal_certification.join(', ')}</td>
                      <td style={styles.td}><ul style={styles.list}>{row.retention_renewal_certification_controls.map((control) => <li key={control}>{control}</li>)}</ul></td>
                      <td style={styles.td}>{renderLinks(evidenceLinksForRow(row))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={styles.twoColumn}>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Retention renewal certification rules</h2>
              <ul style={styles.list}>{data.retention_renewal_certification_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </article>
            <article style={styles.card}>
              <h2 style={styles.sectionTitle}>Limitations</h2>
              <ul style={styles.list}>{data.retention_renewal_certification_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
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
  button: { border: '1px solid #cbd5e1', borderRadius: '0.75rem', background: '#ffffff', color: '#0f172a', cursor: 'pointer', fontWeight: 700, padding: '0.5rem 0.75rem' },
  badge: { display: 'inline-flex', borderRadius: '999px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' },
  metricCard: { border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', background: '#ffffff' },
  metricLabel: { display: 'block', color: '#64748b', fontSize: '0.82rem', textTransform: 'capitalize' },
  metricValue: { display: 'block', marginTop: '0.35rem', fontSize: '1.45rem', color: '#0f172a' },
  card: { border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', background: '#ffffff' },
  sectionTitle: { margin: '0 0 0.75rem', color: '#0f172a', fontSize: '1.1rem' },
  chainGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem', color: '#475569' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.65rem', color: '#475569' },
  supportingLinks: { marginTop: '0.85rem' },
  linkList: { display: 'flex', flexWrap: 'wrap', gap: '0.45rem' },
  link: { color: '#2563eb', fontWeight: 700, textDecoration: 'none' },
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
