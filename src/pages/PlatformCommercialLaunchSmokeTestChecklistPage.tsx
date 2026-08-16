import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router';
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
  manual_precondition: string;
  required_result_fields: string[];
  allowed_results: string[];
  default_result: string;
  result_artifact: string;
  result_artifact_storage: string;
  smoke_test_status: string;
};

type ExternalPersistence = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type CommercialLaunchSmokeTestChecklist = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  smoke_tests: SmokeTestRow[];
  go_no_go_register_posture: string;
  go_no_go_register_summary: Record<string, number>;
  go_no_go_decision_persistence: ExternalPersistence | null;
  acceptance_packet_posture: string;
  certificate_posture: string;
  result_persistence: ExternalPersistence;
  execution_rules: string[];
  launch_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return 'Unknown API error';
}

function getSmokeTestEvidenceLink(row: SmokeTestRow) {
  const byCode: Record<string, string> = {
    operator_login_and_session_smoke_test: '/platform/sessions',
    pilot_tenant_access_smoke_test: '/platform/pilot-customer-readiness',
    product_stock_and_report_smoke_test: '/platform/customer-onboarding-checklist',
    shipment_receiving_smoke_test: '/platform/customer-onboarding-checklist',
    platform_support_cockpit_smoke_test: '/platform/support-cockpit',
    billing_subscription_visibility_smoke_test: '/platform/billing-subscription-activation',
    monitoring_incident_smoke_test: '/platform/monitoring-readiness',
    backup_restore_evidence_smoke_test: '/platform/backup-restore-validation',
    documentation_support_handover_smoke_test: '/platform/documentation-completeness',
    rollback_decision_path_smoke_test: '/platform/deployment-validation'
  };
  return byCode[row.code] || '/platform/commercial-launch-go-no-go-register';
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
  const normalized = value.toLowerCase();
  if (normalized === 'loading' || normalized.includes('not_run') || normalized.includes('external_not_persisted')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (
    normalized.includes('blocked')
    || normalized.includes('fail')
    || normalized.includes('missing')
    || normalized.includes('unavailable')
  ) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (
    normalized.includes('review')
    || normalized.includes('waiting')
    || normalized.includes('required')
    || normalized.includes('manual')
    || normalized.includes('conditional')
    || normalized.includes('external')
  ) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (normalized.includes('ready') || normalized.includes('clear') || normalized.includes('pass')) {
    return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  }
  return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
}

export default function PlatformCommercialLaunchSmokeTestChecklistPage() {
  const checklist = useQuery({
    queryKey: ['platform', 'commercial-launch-smoke-test-checklist'],
    queryFn: () => platformApiRequest<CommercialLaunchSmokeTestChecklist>('/platform/commercial-launch-smoke-test-checklist'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
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
            Step 220 prepares the manual live smoke-test rows for the exact launch environment. It preserves the current
            Go/No-Go prerequisite posture and defines owners, evidence, failure policy, and external result fields, but it
            cannot observe external go/no-go decisions or smoke-test execution records.
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

      <section style={styles.warningCard}>
        <strong>Execution-preparation only.</strong>
        <span>
          This application does not store or observe final external Go/No-Go decisions or smoke-test results. Before any
          row is executed, the launch operator must independently confirm the external decision record and keep the
          smoke-test result evidence outside this read-only board.
        </span>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting launch pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-go-no-go-register">Launch go/no-go</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-acceptance">Launch acceptance</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-certificate">Launch certificate</Link>
          <Link style={styles.quickLink} to="/platform/pilot-customer-readiness">Pilot readiness</Link>
          <Link style={styles.quickLink} to="/platform/support-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.quickLink} to="/platform/monitoring-readiness">Monitoring readiness</Link>
          <Link style={styles.quickLink} to="/platform/backup-restore-validation">Backup restore</Link>
          <Link style={styles.quickLink} to="/platform/documentation-completeness">Documentation</Link>
          <Link style={styles.quickLink} to="/platform/deployment-validation">Deployment validation</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-day-command-center">Launch command center</Link>
        </div>
      </section>

      {checklist.isLoading ? <div style={styles.card}>Loading commercial launch smoke-test checklist...</div> : null}
      {checklist.error ? (
        <div style={styles.error}>
          <div><strong>Failed to load commercial launch smoke-test checklist.</strong></div>
          <div style={styles.errorDetail}>{errorMessage(checklist.error)}</div>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void checklist.refetch()}
            disabled={checklist.isFetching}
          >
            {checklist.isFetching ? 'Retrying...' : 'Retry'}
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
              <div><strong>Validation</strong><span style={styles.wrapAnywhere}>{data.validation_note}</span></div>
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
            <h2 style={styles.sectionTitle}>Execution prerequisite context</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}>
                <span style={styles.help}>Go/no-go register posture</span>
                <strong style={styles.wrapAnywhere}>{humanize(data.go_no_go_register_posture)}</strong>
                <Link style={styles.sourceLink} to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Acceptance packet posture</span>
                <strong style={styles.wrapAnywhere}>{humanize(data.acceptance_packet_posture)}</strong>
                <Link style={styles.sourceLink} to="/platform/commercial-launch-acceptance">Open Launch Acceptance</Link>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Certificate posture</span>
                <strong style={styles.wrapAnywhere}>{humanize(data.certificate_posture)}</strong>
                <Link style={styles.sourceLink} to="/platform/commercial-launch-certificate">Open Launch Certificate</Link>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Go/no-go decision persistence</span>
                <strong>{data.go_no_go_decision_persistence?.stored_in_application ? 'Stored in application' : 'External only'}</strong>
                <span style={styles.help}>{data.go_no_go_decision_persistence?.interpretation || 'External decision records are not observable by this page.'}</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Smoke-test result persistence</span>
                <strong>{data.result_persistence.stored_in_application ? 'Stored in application' : 'External only'}</strong>
                <span style={styles.help}>{data.result_persistence.interpretation}</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Go/no-go decision rows</span>
                <strong>{data.go_no_go_register_summary.decisions_required ?? data.go_no_go_register_summary.register_rows_total ?? 0}</strong>
                <span style={styles.help}>This count describes required decision rows, not observed external decisions.</span>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Smoke-test rows</h2>
            <div style={styles.checkGrid}>
              {data.smoke_tests.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div style={styles.wrapAnywhere}>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.smoke_test_status)}>{humanize(row.smoke_test_status)}</span>
                  </div>

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required live evidence</span>
                    <strong style={styles.wrapAnywhere}>{row.required_evidence}</strong>
                  </div>
                  <Link style={styles.packetLink} to={getSmokeTestEvidenceLink(row)}>{getSmokeTestEvidenceLabel(row)}</Link>

                  <div style={styles.preconditionBox}>
                    <span style={styles.evidenceLabel}>Manual precondition</span>
                    <strong>{row.manual_precondition}</strong>
                  </div>

                  <div style={styles.statusRow}>
                    <span>Template default result</span>
                    <span style={badgeStyle(row.default_result)}>{humanize(row.default_result)}</span>
                  </div>
                  <div style={styles.statusRow}><span>Failure policy</span><strong style={styles.wrapAnywhere}>{humanize(row.failure_policy)}</strong></div>
                  <div style={styles.statusRow}><span>Result storage</span><strong>{humanize(row.result_artifact_storage)}</strong></div>

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>External result artifact</span>
                    <strong>{row.result_artifact}</strong>
                  </div>

                  <div>
                    <span style={styles.evidenceLabel}>Allowed results</span>
                    <div style={styles.chips}>{row.allowed_results.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required external result fields</span>
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
  page: { display: 'grid', gap: 18, minWidth: 0 , color: '#0f172a' },
  header: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#64748b', maxWidth: 1000, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8, minWidth: 0 },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'normal', overflowWrap: 'anywhere' },
  warningCard: { display: 'grid', gap: 5, background: '#fffbeb', border: '1px solid #fde68a', color: '#78350f', borderRadius: 14, padding: 14 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: '#1d4ed8', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  errorButton: { marginTop: 8, border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 999, padding: '5px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  errorDetail: { marginTop: 6, fontSize: 12, overflowWrap: 'anywhere' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  sourceLink: { marginTop: 4, color: '#1d4ed8', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  packetLink: { justifySelf: 'start', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: '#1d4ed8', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', textTransform: 'capitalize', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  inputCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', display: 'grid', gap: 6, minWidth: 0 },
  checkGrid: { display: 'grid', gap: 14 },
  checkCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc', display: 'grid', gap: 12, minWidth: 0 },
  rowHeader: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  help: { color: '#64748b', fontSize: 12, overflowWrap: 'anywhere' },
  evidenceBox: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 4, minWidth: 0 },
  preconditionBox: { border: '1px solid #fde68a', borderRadius: 12, padding: 10, background: '#fffbeb', display: 'grid', gap: 4 },
  evidenceLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '5px 9px', background: '#fff', color: '#334155', fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  statusRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 10, color: '#334155' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 },
  list: { margin: 0, paddingLeft: 20, color: '#334155', lineHeight: 1.6 },
  nextStep: { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', borderRadius: 14, padding: 14 },
  note: { background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', borderRadius: 14, padding: 14 },
  error: { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 14, padding: 14 },
  wrapAnywhere: { overflowWrap: 'anywhere', wordBreak: 'break-word', minWidth: 0 }
};
