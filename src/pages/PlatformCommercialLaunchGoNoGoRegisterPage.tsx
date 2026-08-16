import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type EvidenceScope = {
  mode: string;
  status: string;
  review_limit: number | null;
  evaluated_tenants: number;
  total_tenants: number | null;
};

type GoNoGoRow = {
  code: string;
  source_packet: string;
  source_control: string;
  source_key: string | null;
  domain: string;
  decision_owner: string;
  required_evidence: string;
  evidence_status: string | null;
  source_available: boolean;
  source_posture: string;
  source_summary: Record<string, unknown>;
  source_validation_note: string | null;
  source_error_code: string | null;
  evidence_scope: EvidenceScope | null;
  launch_area_status: string;
  launch_gate: string;
  launch_gate_context_only: boolean;
  acceptance_artifact: string;
  acceptance_artifact_storage: string;
  acceptance_statement: string | null;
  packet_status: string;
  default_decision: string;
  allowed_decisions: string[];
  decision_artifact: string;
  decision_artifact_storage: string;
  required_decision_fields: string[];
  conditional_go_extra_fields: string[];
  no_go_extra_fields: string[];
  register_status: string;
};

type CommercialLaunchGoNoGoRegister = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  go_no_go_register: GoNoGoRow[];
  acceptance_packet_posture: string;
  acceptance_summary: Record<string, unknown>;
  acceptance_persistence: {
    stored_in_application: boolean;
    external_records_observable: boolean;
    interpretation: string;
  } | null;
  certificate_posture: string;
  launch_readiness_posture: string;
  tenant_scope: {
    available: boolean;
    total_tenants: number | null;
    review_limit: number;
    error_code?: string;
  } | null;
  decision_persistence: {
    stored_in_application: boolean;
    external_records_observable: boolean;
    interpretation: string;
  };
  decision_requirements: string[];
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

function getDecisionEvidenceLink(row: GoNoGoRow) {
  const bySourceControl: Record<string, string> = {
    tenant_provisioning_accepted: '/platform/tenant-provisioning-hardening',
    customer_onboarding_accepted: '/platform/customer-onboarding-checklist',
    billing_subscription_accepted: '/platform/billing-subscription-activation',
    support_operations_accepted: '/platform/support-cockpit',
    production_monitoring_accepted: '/platform/monitoring-readiness',
    backup_restore_accepted: '/platform/backup-restore-validation',
    deployment_validation_accepted: '/platform/deployment-validation',
    documentation_completeness_accepted: '/platform/documentation-completeness',
    pilot_customer_readiness_accepted: '/platform/pilot-customer-readiness',
    commercial_readiness_closure_accepted: '/platform/commercial-readiness-verification-program'
  };
  return bySourceControl[row.source_control] || '/platform/commercial-launch-acceptance';
}

function getDecisionEvidenceLabel(row: GoNoGoRow) {
  const bySourceControl: Record<string, string> = {
    tenant_provisioning_accepted: 'Open provisioning evidence',
    customer_onboarding_accepted: 'Open onboarding evidence',
    billing_subscription_accepted: 'Open billing activation',
    support_operations_accepted: 'Open support cockpit',
    production_monitoring_accepted: 'Open monitoring readiness',
    backup_restore_accepted: 'Open backup restore',
    deployment_validation_accepted: 'Open deployment validation',
    documentation_completeness_accepted: 'Open documentation completeness',
    pilot_customer_readiness_accepted: 'Open pilot readiness',
    commercial_readiness_closure_accepted: 'Open readiness verification'
  };
  return bySourceControl[row.source_control] || 'Open acceptance packet';
}

function badgeStyle(value: string): CSSProperties {
  const normalized = value.toLowerCase();
  if (normalized === 'loading' || normalized.includes('context_only') || normalized.includes('not_recorded')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (
    normalized.includes('blocked')
    || normalized.includes('no_go')
    || normalized.includes('missing')
    || normalized.includes('unavailable')
    || normalized.includes('failed')
  ) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (
    normalized.includes('manual')
    || normalized.includes('required')
    || normalized.includes('review')
    || normalized.includes('conditional')
    || normalized.includes('external')
  ) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (normalized.includes('ready') || normalized.includes('clear') || normalized.includes('present')) {
    return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  }
  return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
}

function neutralBadgeStyle(): CSSProperties {
  return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
}

export default function PlatformCommercialLaunchGoNoGoRegisterPage() {
  const register = useQuery({
    queryKey: ['platform', 'commercial-launch-go-no-go-register'],
    queryFn: () => platformApiRequest<CommercialLaunchGoNoGoRegister>('/platform/commercial-launch-go-no-go-register'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = register.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Go/No-Go Register</h1>
          <p style={styles.description}>
            Step 219 prepares final go/no-go decision rows from the current Launch Acceptance packets. It preserves
            ready, review-required, and blocked evidence states and carries the current upstream posture and scope into
            each owner decision row. Final decisions remain external to this application.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void register.refetch()}
            disabled={register.isFetching}
          >
            {register.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.warningCard}>
        <strong>Decision-preparation only.</strong>
        <span>
          A row marked ready means its current acceptance evidence is ready for an authorized owner to make and record
          a decision externally. This page cannot observe external decisions, cannot approve launch, and does not start deployment.
        </span>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting launch pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-acceptance">Launch acceptance</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-certificate">Launch certificate</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-readiness">Launch readiness</Link>
          <Link style={styles.quickLink} to="/platform/tenant-provisioning-hardening">Provisioning</Link>
          <Link style={styles.quickLink} to="/platform/customer-onboarding-checklist">Onboarding</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.quickLink} to="/platform/support-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/monitoring-readiness">Monitoring</Link>
          <Link style={styles.quickLink} to="/platform/backup-restore-validation">Backup restore</Link>
          <Link style={styles.quickLink} to="/platform/deployment-validation">Deployment validation</Link>
          <Link style={styles.quickLink} to="/platform/documentation-completeness">Documentation</Link>
          <Link style={styles.quickLink} to="/platform/pilot-customer-readiness">Pilot readiness</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
        </div>
      </section>

      {register.isLoading ? <div style={styles.card}>Loading commercial launch go/no-go register...</div> : null}
      {register.error ? (
        <div style={styles.error}>
          <div><strong>Failed to load commercial launch go/no-go register.</strong></div>
          <div style={styles.errorDetail}>{errorMessage(register.error)}</div>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void register.refetch()}
            disabled={register.isFetching}
          >
            {register.isFetching ? 'Retrying...' : 'Retry'}
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
            <h2 style={styles.sectionTitle}>Decision context</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}>
                <span style={styles.help}>Current Launch Acceptance posture</span>
                <strong style={styles.wrapAnywhere}>{humanize(data.acceptance_packet_posture)}</strong>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Current Launch Certificate posture</span>
                <strong style={styles.wrapAnywhere}>{humanize(data.certificate_posture)}</strong>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Static Launch Readiness registry posture</span>
                <strong style={styles.wrapAnywhere}>{humanize(data.launch_readiness_posture)}</strong>
                <span style={styles.help}>Context only — current acceptance evidence controls decision readiness.</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Tenant evidence population</span>
                <strong>{data.tenant_scope?.total_tenants == null ? 'Unavailable' : `${data.tenant_scope.total_tenants} tenants`}</strong>
                <span style={styles.help}>Tenant-scoped sources review up to {data.tenant_scope?.review_limit ?? 300} tenants per board.</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Decision persistence</span>
                <strong>{data.decision_persistence.stored_in_application ? 'Stored in application' : 'External only'}</strong>
                <span style={styles.help}>{data.decision_persistence.interpretation}</span>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Go/no-go decision rows</h2>
            <div style={styles.registerGrid}>
              {data.go_no_go_register.map((row) => (
                <article key={row.code} style={styles.registerCard}>
                  <div style={styles.rowHeader}>
                    <div style={styles.wrapAnywhere}>
                      <strong>{humanize(row.source_control)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.decision_owner)}</div>
                    </div>
                    <span style={badgeStyle(row.register_status)}>{humanize(row.register_status)}</span>
                  </div>

                  <div style={styles.statusGrid}>
                    <div style={styles.inputCard}>
                      <span style={styles.help}>Current acceptance packet</span>
                      <span style={badgeStyle(row.packet_status)}>{humanize(row.packet_status)}</span>
                    </div>
                    <div style={styles.inputCard}>
                      <span style={styles.help}>Current certificate evidence</span>
                      <span style={badgeStyle(row.evidence_status || 'unknown')}>{humanize(row.evidence_status || 'unknown')}</span>
                    </div>
                    <div style={styles.inputCard}>
                      <span style={styles.help}>Current upstream posture</span>
                      <strong style={styles.wrapAnywhere}>{humanize(row.source_posture)}</strong>
                    </div>
                    <div style={styles.inputCard}>
                      <span style={styles.help}>Evidence scope</span>
                      <strong>{row.evidence_scope ? humanize(row.evidence_scope.status) : 'Not scope-limited'}</strong>
                      {row.evidence_scope ? (
                        <span style={styles.help}>
                          Evaluated {row.evidence_scope.evaluated_tenants}
                          {row.evidence_scope.total_tenants == null ? '' : ` of ${row.evidence_scope.total_tenants}`} tenants
                        </span>
                      ) : null}
                    </div>
                    <div style={styles.inputCard}>
                      <span style={styles.help}>Static registry gate</span>
                      <span style={neutralBadgeStyle()}>{humanize(row.launch_gate)}</span>
                      <span style={styles.help}>Context only</span>
                    </div>
                  </div>

                  {row.source_error_code ? <div style={styles.sourceError}>Evidence source error: {row.source_error_code}</div> : null}
                  {row.source_validation_note ? <div style={styles.sourceNote}>{row.source_validation_note}</div> : null}

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence endpoint</span>
                    <strong style={styles.wrapAnywhere}>{row.required_evidence}</strong>
                  </div>
                  <Link style={styles.packetLink} to={getDecisionEvidenceLink(row)}>{getDecisionEvidenceLabel(row)}</Link>

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>External acceptance artifact</span>
                    <strong>{row.acceptance_artifact}</strong>
                    {row.acceptance_statement ? <p style={styles.reason}>{row.acceptance_statement}</p> : null}
                    <span style={styles.help}>Storage: {humanize(row.acceptance_artifact_storage)}</span>
                  </div>

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>External go/no-go decision artifact</span>
                    <strong>{row.decision_artifact}</strong>
                    <span style={styles.help}>Storage: {humanize(row.decision_artifact_storage)}</span>
                    <span style={styles.help}>The default template state is not proof that no external decision exists.</span>
                  </div>

                  <div style={styles.statusRow}>
                    <span>Decision template state</span>
                    <span style={badgeStyle(row.default_decision)}>{humanize(row.default_decision)}</span>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Allowed decisions</span>
                    <div style={styles.chips}>{row.allowed_decisions.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required decision fields</span>
                    <div style={styles.chips}>{row.required_decision_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Conditional-go extra fields</span>
                    <div style={styles.chips}>{row.conditional_go_extra_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>No-go extra fields</span>
                    <div style={styles.chips}>{row.no_go_extra_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Decision requirements</h2>
              <ul style={styles.list}>{data.decision_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
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
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#64748b', maxWidth: 1000, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'normal', overflowWrap: 'anywhere' },
  warningCard: { display: 'grid', gap: 5, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', borderRadius: 14, padding: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', textTransform: 'capitalize', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  inputCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', display: 'grid', gap: 6, minWidth: 0, overflowWrap: 'anywhere' },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  registerGrid: { display: 'grid', gap: 14 },
  registerCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc', display: 'grid', gap: 12, minWidth: 0 },
  rowHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
  help: { color: '#64748b', fontSize: 12, lineHeight: 1.45 },
  evidenceBox: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 4, minWidth: 0, overflowWrap: 'anywhere' },
  evidenceLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize' },
  reason: { margin: 0, color: '#334155', fontSize: 13, lineHeight: 1.5 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '5px 9px', background: '#fff', color: '#334155', fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 10, color: '#334155', flexWrap: 'wrap' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 },
  list: { margin: 0, paddingLeft: 20, color: '#334155', lineHeight: 1.6 },
  nextStep: { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a', borderRadius: 14, padding: 14 },
  note: { background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', borderRadius: 14, padding: 14 },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  errorButton: { border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer', justifySelf: 'start' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: '#1d4ed8', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  packetLink: { justifySelf: 'start', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: '#1d4ed8', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  sourceError: { background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: 10, overflowWrap: 'anywhere' },
  sourceNote: { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: 10, padding: 10, lineHeight: 1.45 },
  error: { display: 'grid', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 14, padding: 14 },
  errorDetail: { fontSize: 13, overflowWrap: 'anywhere' },
  wrapAnywhere: { overflowWrap: 'anywhere', minWidth: 0 }
};
