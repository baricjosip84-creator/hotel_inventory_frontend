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

type AcceptancePacket = {
  code: string;
  source_control: string;
  source_key: string | null;
  domain: string;
  acceptance_owner: string;
  acceptance_rule: string | null;
  required_evidence: string;
  evidence_status: string;
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
  required_statement: string;
  required_acceptance_fields: string[];
  packet_status: string;
};

type CommercialLaunchAcceptancePacket = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  acceptance_packets: AcceptancePacket[];
  certificate_posture: string;
  certificate_summary: Record<string, unknown>;
  certificate_validation_note: string | null;
  certificate_registry_note: string | null;
  tenant_scope: {
    available: boolean;
    total_tenants: number | null;
    review_limit: number;
    error_code?: string;
  } | null;
  launch_readiness_posture: string;
  acceptance_persistence: {
    stored_in_application: boolean;
    external_records_observable: boolean;
    interpretation: string;
  };
  required_packet_controls: string[];
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

function getPacketReviewLink(packet: AcceptancePacket) {
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
  return bySourceControl[packet.source_control] || '/platform/commercial-launch-certificate';
}

function getPacketReviewLabel(packet: AcceptancePacket) {
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
  return bySourceControl[packet.source_control] || 'Open certificate evidence';
}

function badgeStyle(value: string): CSSProperties {
  const normalized = value.toLowerCase();
  if (normalized === 'loading' || normalized.includes('context_only') || normalized.includes('not_limited')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (
    normalized.includes('blocked')
    || normalized.includes('missing')
    || normalized.includes('unavailable')
    || normalized.includes('failed')
    || normalized.includes('incomplete')
  ) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (
    normalized.includes('manual')
    || normalized.includes('required')
    || normalized.includes('review')
    || normalized.includes('external')
    || normalized.includes('partial')
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

export default function PlatformCommercialLaunchAcceptancePacketPage() {
  const packet = useQuery({
    queryKey: ['platform', 'commercial-launch-acceptance-packet'],
    queryFn: () => platformApiRequest<CommercialLaunchAcceptancePacket>('/platform/commercial-launch-acceptance-packet'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = packet.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Acceptance Packet</h1>
          <p style={styles.description}>
            Step 218 prepares owner signoff packets from the current Launch Certificate evidence. It preserves
            blocked and review-required states instead of treating the static Launch Readiness registry as proof.
            Signatures and external approval tickets are not stored or observable by this page.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void packet.refetch()}
            disabled={packet.isFetching}
          >
            {packet.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.warningCard}>
        <strong>Owner-signoff preparation only.</strong>
        <span>
          A packet marked ready means its current technical evidence is ready for an owner to review and sign externally.
          It does not mean an owner has signed, a go/no-go decision exists, or production launch has been approved.
        </span>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting readiness pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-certificate">Launch certificate</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-readiness">Launch readiness registry</Link>
          <Link style={styles.quickLink} to="/platform/tenant-provisioning-hardening">Provisioning</Link>
          <Link style={styles.quickLink} to="/platform/customer-onboarding-checklist">Onboarding</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.quickLink} to="/platform/support-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/monitoring-readiness">Monitoring</Link>
          <Link style={styles.quickLink} to="/platform/backup-restore-validation">Backup restore</Link>
          <Link style={styles.quickLink} to="/platform/deployment-validation">Deployment validation</Link>
          <Link style={styles.quickLink} to="/platform/documentation-completeness">Documentation</Link>
          <Link style={styles.quickLink} to="/platform/pilot-customer-readiness">Pilot readiness</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-go-no-go-register">Launch go/no-go</Link>
        </div>
      </section>

      {packet.isLoading ? <div style={styles.card}>Loading commercial launch acceptance packet...</div> : null}
      {packet.error ? (
        <div style={styles.error}>
          <div><strong>Failed to load commercial launch acceptance packet.</strong></div>
          <div style={styles.errorDetail}>{errorMessage(packet.error)}</div>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void packet.refetch()}
            disabled={packet.isFetching}
          >
            {packet.isFetching ? 'Retrying...' : 'Retry'}
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
            <h2 style={styles.sectionTitle}>Certificate context</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}>
                <span style={styles.help}>Current Launch Certificate posture</span>
                <strong>{humanize(data.certificate_posture)}</strong>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Static Launch Readiness registry posture</span>
                <strong>{humanize(data.launch_readiness_posture)}</strong>
                <span style={styles.help}>Context only — current certificate evidence controls signoff readiness.</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Tenant evidence population</span>
                <strong>
                  {data.tenant_scope?.total_tenants == null ? 'Unavailable' : `${data.tenant_scope.total_tenants} tenants`}
                </strong>
                <span style={styles.help}>Tenant-scoped certificate sources review up to {data.tenant_scope?.review_limit ?? 300} tenants per board.</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Signoff persistence</span>
                <strong>{data.acceptance_persistence.stored_in_application ? 'Stored in application' : 'External only'}</strong>
                <span style={styles.help}>{data.acceptance_persistence.interpretation}</span>
              </div>
            </div>
            {data.certificate_registry_note ? <p style={styles.contextNote}>{data.certificate_registry_note}</p> : null}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Owner acceptance packets</h2>
            <div style={styles.packetGrid}>
              {data.acceptance_packets.map((item) => (
                <article key={item.code} style={styles.packetCard}>
                  <div style={styles.packetHeader}>
                    <div style={styles.wrapAnywhere}>
                      <strong>{humanize(item.source_control)}</strong>
                      <div style={styles.help}>{humanize(item.domain)} · owner: {humanize(item.acceptance_owner)}</div>
                    </div>
                    <span style={badgeStyle(item.packet_status)}>{humanize(item.packet_status)}</span>
                  </div>

                  <div style={styles.statusGrid}>
                    <div style={styles.inputCard}>
                      <span style={styles.help}>Current certificate evidence</span>
                      <span style={badgeStyle(item.evidence_status)}>{humanize(item.evidence_status)}</span>
                    </div>
                    <div style={styles.inputCard}>
                      <span style={styles.help}>Current upstream posture</span>
                      <strong style={styles.wrapAnywhere}>{humanize(item.source_posture)}</strong>
                    </div>
                    <div style={styles.inputCard}>
                      <span style={styles.help}>Evidence scope</span>
                      <strong>{item.evidence_scope ? humanize(item.evidence_scope.status) : 'Not scope-limited'}</strong>
                      {item.evidence_scope ? (
                        <span style={styles.help}>
                          Evaluated {item.evidence_scope.evaluated_tenants}
                          {item.evidence_scope.total_tenants == null ? '' : ` of ${item.evidence_scope.total_tenants}`} tenants
                        </span>
                      ) : null}
                    </div>
                    <div style={styles.inputCard}>
                      <span style={styles.help}>Static registry gate</span>
                      <span style={neutralBadgeStyle()}>{humanize(item.launch_gate)}</span>
                      <span style={styles.help}>Context only</span>
                    </div>
                  </div>

                  {item.source_error_code ? (
                    <div style={styles.sourceError}>Evidence source error: {item.source_error_code}</div>
                  ) : null}
                  {item.source_validation_note ? (
                    <div style={styles.sourceNote}>{item.source_validation_note}</div>
                  ) : null}

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence endpoint</span>
                    <strong style={styles.wrapAnywhere}>{item.required_evidence}</strong>
                    {item.acceptance_rule ? <p style={styles.reason}>{item.acceptance_rule}</p> : null}
                  </div>
                  <Link style={styles.packetLink} to={getPacketReviewLink(item)}>{getPacketReviewLabel(item)}</Link>

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>External acceptance artifact</span>
                    <strong>{item.acceptance_artifact}</strong>
                    <p style={styles.reason}>{item.required_statement}</p>
                    <span style={styles.help}>Storage: {humanize(item.acceptance_artifact_storage)}</span>
                  </div>

                  <div>
                    <span style={styles.evidenceLabel}>Required acceptance fields</span>
                    <div style={styles.chips}>
                      {item.required_acceptance_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Required packet controls</h2>
              <ul style={styles.list}>{data.required_packet_controls.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Launch limitations carried forward</h2>
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
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'normal', overflowWrap: 'anywhere' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', textTransform: 'capitalize', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  warningCard: { display: 'grid', gap: 6, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  inputCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', display: 'grid', gap: 6, minWidth: 0 },
  packetGrid: { display: 'grid', gap: 14 },
  packetCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc', display: 'grid', gap: 12, minWidth: 0 },
  packetHeader: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  statusGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  reason: { color: '#334155', lineHeight: 1.45, margin: '8px 0 0' },
  help: { color: '#64748b', fontSize: 12, lineHeight: 1.45, overflowWrap: 'anywhere' },
  evidenceBox: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 4, minWidth: 0 },
  evidenceLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '5px 9px', background: '#fff', color: '#334155', fontSize: 12, textTransform: 'capitalize' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 },
  list: { margin: 0, paddingLeft: 22, color: '#334155', lineHeight: 1.7 },
  nextStep: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', borderRadius: 14, padding: 14, color: 'var(--io-primary-deep)' },
  note: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e' },
  contextNote: { margin: '12px 0 0', color: '#475569', lineHeight: 1.5 },
  sourceError: { background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 10, padding: 10, overflowWrap: 'anywhere' },
  sourceNote: { background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', borderRadius: 10, padding: 10, lineHeight: 1.45, overflowWrap: 'anywhere' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  errorButton: { marginTop: 10, border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  packetLink: { justifySelf: 'start', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 12, padding: 12 },
  errorDetail: { marginTop: 6, fontSize: 13, overflowWrap: 'anywhere' },
  wrapAnywhere: { overflowWrap: 'anywhere', minWidth: 0 }
};
