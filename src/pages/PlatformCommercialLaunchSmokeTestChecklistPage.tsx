import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type SmokeTestRow = {
  code: string;
  domain: string;
  owner: string;
  required_evidence: string;
  failure_policy: string;
  source_register_posture: string;
  source_acceptance_packet_posture: string;
  required_result_fields: string[];
  allowed_results: string[];
  default_result: string;
  smoke_test_status: string;
};

type CommercialLaunchSmokeTestChecklist = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  smoke_tests: SmokeTestRow[];
  go_no_go_register_posture: string;
  acceptance_packet_posture: string;
  certificate_posture: string;
  execution_rules: string[];
  launch_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}


function getSmokeTestEvidenceLink(row: SmokeTestRow) {
  const byCode: Record<string, string> = {
    operator_login_and_session_smoke_test: '/platform/sessions',
    pilot_tenant_access_smoke_test: '/platform/pilot-customer-readiness',
    product_stock_and_report_smoke_test: '/platform/customer-onboarding-checklist',
    shipment_receiving_smoke_test: '/platform/customer-onboarding-checklist',
    platform_support_cockpit_smoke_test: '/platform/support-operations-cockpit',
    billing_subscription_visibility_smoke_test: '/platform/billing-subscription-activation',
    monitoring_incident_smoke_test: '/platform/production-monitoring-readiness',
    backup_restore_evidence_smoke_test: '/platform/backup-restore-validation',
    documentation_support_handover_smoke_test: '/platform/documentation-completeness',
    rollback_decision_path_smoke_test: '/platform/deployment-validation'
  };
  const byDomain: Record<string, string> = {
    authentication: '/platform/sessions',
    tenant_access: '/platform/pilot-customer-readiness',
    inventory_core: '/platform/customer-onboarding-checklist',
    receiving_workflow: '/platform/customer-onboarding-checklist',
    platform_operations: '/platform/support-operations-cockpit',
    billing_visibility: '/platform/billing-subscription-activation',
    monitoring_incidents: '/platform/production-monitoring-readiness',
    backup_recovery: '/platform/backup-restore-validation',
    documentation_support: '/platform/documentation-completeness',
    rollback_readiness: '/platform/deployment-validation'
  };
  return byCode[row.code] || byDomain[row.domain] || '/platform/commercial-launch-go-no-go-register';
}

function getSmokeTestEvidenceLabel(row: SmokeTestRow) {
  const byDomain: Record<string, string> = {
    authentication: 'Open platform sessions',
    tenant_access: 'Open pilot readiness',
    inventory_core: 'Open onboarding evidence',
    receiving_workflow: 'Open onboarding evidence',
    platform_operations: 'Open support cockpit',
    billing_visibility: 'Open billing activation',
    monitoring_incidents: 'Open monitoring readiness',
    backup_recovery: 'Open backup restore',
    documentation_support: 'Open documentation completeness',
    rollback_readiness: 'Open deployment validation'
  };
  return byDomain[row.domain] || 'Open go/no-go register';
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('fail')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('waiting') || value.includes('manual') || value.includes('ready') || value.includes('not_run') || value.includes('conditional')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchSmokeTestChecklistPage() {
  const checklist = useQuery({
    queryKey: ['platform', 'commercial-launch-smoke-test-checklist'],
    queryFn: () => platformApiRequest<CommercialLaunchSmokeTestChecklist>('/platform/commercial-launch-smoke-test-checklist')
  });

  const data = checklist.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Smoke Test Checklist</h1>
          <p style={styles.description}>
            Step 220 converts the final go/no-go register into manual live smoke-test rows for the target launch
            environment. It defines the exact owner, evidence, result fields, and failure policy for each launch smoke
            test, but remains read-only and does not run tests, persist approvals, activate tenants, or activate billing.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void checklist.refetch()}
            disabled={checklist.isFetching}
          >
            {checklist.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting launch pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-go-no-go-register">Launch go/no-go</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-acceptance-packet">Launch acceptance</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-certificate">Launch certificate</Link>
          <Link style={styles.quickLink} to="/platform/pilot-customer-readiness">Pilot readiness</Link>
          <Link style={styles.quickLink} to="/platform/support-operations-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.quickLink} to="/platform/production-monitoring-readiness">Monitoring readiness</Link>
          <Link style={styles.quickLink} to="/platform/backup-restore-validation">Backup restore</Link>
          <Link style={styles.quickLink} to="/platform/documentation-completeness">Documentation</Link>
          <Link style={styles.quickLink} to="/platform/deployment-validation">Deployment validation</Link>
        </div>
      </section>

      {checklist.isLoading ? <div style={styles.card}>Loading commercial launch smoke-test checklist...</div> : null}
      {checklist.error ? (
        <div style={styles.error}>
          Failed to load commercial launch smoke-test checklist.
          <button type="button" style={styles.errorButton} onClick={() => void checklist.refetch()}>Retry</button>
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
              <div style={styles.inputCard}><span style={styles.help}>Go/no-go register</span><strong>{humanize(data.go_no_go_register_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Acceptance packet</span><strong>{humanize(data.acceptance_packet_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-acceptance-packet">Open Launch Acceptance</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Certificate</span><strong>{humanize(data.certificate_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-certificate">Open Launch Certificate</Link></div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Smoke-test rows</h2>
            <div style={styles.checkGrid}>
              {data.smoke_tests.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.smoke_test_status)}>{humanize(row.smoke_test_status)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence</span>
                    <strong>{row.required_evidence}</strong>
                  </div>
                  <Link style={styles.packetLink} to={getSmokeTestEvidenceLink(row)}>{getSmokeTestEvidenceLabel(row)}</Link>
                  <div style={styles.statusRow}><span>Default result</span><span style={badgeStyle(row.default_result)}>{humanize(row.default_result)}</span></div>
                  <div style={styles.statusRow}><span>Failure policy</span><strong>{humanize(row.failure_policy)}</strong></div>
                  <div>
                    <span style={styles.evidenceLabel}>Allowed results</span>
                    <div style={styles.chips}>{row.allowed_results.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required result fields</span>
                    <div style={styles.chips}>{row.required_result_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Execution rules</h2>
              <ul style={styles.list}>{data.execution_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Launch limitations</h2>
              <ul style={styles.list}>{data.launch_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
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

  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730a3', borderRadius: 999, padding: '7px 11px', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  secondaryButton: { border: '1px solid #d1d5db', background: '#fff', color: '#374151', borderRadius: 999, padding: '7px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  errorButton: { marginLeft: 12, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  sourceLink: { marginTop: 4, color: '#2563eb', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  packetLink: { justifySelf: 'start', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730a3', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  metricValue: { fontSize: 26, fontWeight: 900 },
  metricLabel: { color: '#6b7280', textTransform: 'capitalize', fontSize: 12, marginTop: 4 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
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
