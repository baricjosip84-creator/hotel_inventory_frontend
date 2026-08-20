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

type CertificateControl = {
  code: string;
  domain: string;
  required_evidence: string;
  acceptance_owner: string;
  acceptance_rule: string;
  source_key: string;
  source_available: boolean;
  source_posture: string;
  source_summary: Record<string, unknown>;
  source_validation_note: string | null;
  source_error_code: string | null;
  evidence_scope: EvidenceScope;
  launch_area_code: string | null;
  launch_area_status: string;
  launch_gate: string;
  evidence_status: string;
  manual_acceptance_status: string;
};

type TenantScope = {
  available: boolean;
  total_tenants: number | null;
  review_limit: number;
  error_code?: string;
};

type CommercialLaunchCertificate = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  certificate_controls: CertificateControl[];
  tenant_scope: TenantScope;
  launch_readiness_posture: string;
  launch_readiness_registry_note: string;
  commercial_readiness_closure_posture: string;
  required_manual_acceptance: string[];
  certificate_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function getControlReviewLink(control: CertificateControl) {
  const byCode: Record<string, string> = {
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
  return byCode[control.code] || '/platform/commercial-launch-readiness';
}

function getControlReviewLabel(control: CertificateControl) {
  const byCode: Record<string, string> = {
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
  return byCode[control.code] || 'Open readiness page';
}

function badgeStyle(value: string): CSSProperties {
  const normalized = value.toLowerCase();
  if (normalized === 'loading' || normalized.includes('no_tenants') || normalized.includes('not_limited')) {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (
    normalized.includes('blocked')
    || normalized.includes('missing')
    || normalized.includes('unavailable')
    || normalized.includes('incomplete')
    || normalized.includes('not_launchable')
    || normalized.includes('failed')
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
  if (
    normalized.includes('ready')
    || normalized.includes('clear')
    || normalized.includes('present')
    || normalized.includes('full_population')
  ) {
    return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  }
  return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
}

function neutralBadgeStyle(): CSSProperties {
  return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Failed to load commercial launch certificate.';
}

export default function PlatformCommercialLaunchCertificatePage() {
  const certificate = useQuery({
    queryKey: ['platform', 'commercial-launch-certificate'],
    queryFn: () => platformApiRequest<CommercialLaunchCertificate>('/platform/commercial-launch-certificate'),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const data = certificate.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Certificate Board</h1>
          <p style={styles.description}>
            Step 217 is an internal certificate precheck. It now evaluates the current postures from the real
            provisioning, onboarding, billing, support, monitoring, backup/restore, deployment, documentation,
            pilot, and commercial-closure evidence sources. It does not persist owner signoff or issue an external certificate.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void certificate.refetch()}
            disabled={certificate.isFetching}
          >
            {certificate.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.warningCard}>
        <strong>Internal precheck only.</strong> A green evidence source means its current technical/readiness posture is clear enough to enter manual owner acceptance. It does not mean the owner has signed, the customer has accepted launch, or a production certificate has been issued.
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting readiness pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-readiness">Launch readiness registry</Link>
          <Link style={styles.quickLink} to="/platform/commercial-readiness-verification-program">Readiness verification</Link>
          <Link style={styles.quickLink} to="/platform/tenant-provisioning-hardening">Provisioning</Link>
          <Link style={styles.quickLink} to="/platform/customer-onboarding-checklist">Onboarding</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.quickLink} to="/platform/support-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/monitoring-readiness">Monitoring</Link>
          <Link style={styles.quickLink} to="/platform/backup-restore-validation">Backup restore</Link>
          <Link style={styles.quickLink} to="/platform/deployment-validation">Deployment validation</Link>
          <Link style={styles.quickLink} to="/platform/documentation-completeness">Documentation</Link>
          <Link style={styles.quickLink} to="/platform/pilot-customer-readiness">Pilot readiness</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-acceptance-packet">Launch acceptance</Link>
        </div>
      </section>

      {certificate.isLoading ? <div style={styles.card}>Loading commercial launch certificate...</div> : null}
      {certificate.error ? (
        <div style={styles.error}>
          <strong>Unable to load Launch Certificate.</strong>
          <span style={styles.errorDetail}>{errorMessage(certificate.error)}</span>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void certificate.refetch()}
            disabled={certificate.isFetching}
          >
            {certificate.isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Snapshot metadata</h2>
            <div style={styles.metadataGrid}>
              <div style={styles.metadataItem}><strong>Phase</strong><span>{data.phase}</span></div>
              <div style={styles.metadataItem}><strong>Step</strong><span>{data.step}</span></div>
              <div style={styles.metadataItem}><strong>Generated</strong><span>{data.generated_at ? new Date(data.generated_at).toLocaleString() : '-'}</span></div>
              <div style={styles.metadataItem}><strong>Tenant population</strong><span>{data.tenant_scope.total_tenants ?? 'Unavailable'}</span></div>
              <div style={styles.metadataItem}><strong>Tenant review cap</strong><span>{data.tenant_scope.review_limit}</span></div>
              <div style={styles.metadataItem}><strong>Tenant scope query</strong><span>{data.tenant_scope.available ? 'Available' : humanize(data.tenant_scope.error_code || 'unavailable')}</span></div>
            </div>
            <p style={styles.validationText}>{data.validation_note}</p>
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
            <h2 style={styles.sectionTitle}>Certificate posture inputs</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}>
                <span style={styles.help}>Launch readiness registry posture</span>
                <strong>{humanize(data.launch_readiness_posture)}</strong>
                <span style={styles.help}>{data.launch_readiness_registry_note}</span>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Commercial readiness closure posture</span>
                <strong>{humanize(data.commercial_readiness_closure_posture)}</strong>
                <span style={styles.help}>Closure remains a separate owner/security review input; its static registry does not persist execution results.</span>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Certificate controls</h2>
            <div style={styles.controlGrid}>
              {data.certificate_controls.map((control) => (
                <article key={control.code} style={styles.controlCard}>
                  <div style={styles.controlHeader}>
                    <div style={styles.controlTitleBlock}>
                      <strong>{humanize(control.code)}</strong>
                      <div style={styles.help}>{humanize(control.domain)} · owner: {humanize(control.acceptance_owner)}</div>
                    </div>
                    <span style={badgeStyle(control.evidence_status)}>{humanize(control.evidence_status)}</span>
                  </div>

                  <p style={styles.reason}>{control.acceptance_rule}</p>

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Current upstream posture</span>
                    <span style={badgeStyle(control.source_posture)}>{humanize(control.source_posture)}</span>
                    {control.source_error_code ? <span style={styles.sourceError}>Source error: {humanize(control.source_error_code)}</span> : null}
                    {control.source_validation_note ? <span style={styles.help}>{control.source_validation_note}</span> : null}
                  </div>

                  {control.evidence_scope.mode === 'tenant_population' ? (
                    <div style={styles.evidenceBox}>
                      <span style={styles.evidenceLabel}>Tenant evidence scope</span>
                      <span style={badgeStyle(control.evidence_scope.status)}>{humanize(control.evidence_scope.status)}</span>
                      <span style={styles.help}>
                        Evaluated {control.evidence_scope.evaluated_tenants}
                        {control.evidence_scope.total_tenants !== null ? ` of ${control.evidence_scope.total_tenants}` : ''}
                        {control.evidence_scope.review_limit ? ` · cap ${control.evidence_scope.review_limit}` : ''}
                      </span>
                    </div>
                  ) : null}

                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence surface</span>
                    <strong style={styles.wrapAnywhere}>{control.required_evidence}</strong>
                  </div>

                  <Link style={styles.controlLink} to={getControlReviewLink(control)}>{getControlReviewLabel(control)}</Link>

                  <div style={styles.statusRow}>
                    <span>Static registry gate (context only)</span>
                    <span style={neutralBadgeStyle()}>{humanize(control.launch_gate)}</span>
                  </div>
                  <div style={styles.statusRow}>
                    <span>Manual acceptance</span>
                    <span style={badgeStyle(control.manual_acceptance_status)}>{humanize(control.manual_acceptance_status)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Required manual acceptance</h2>
              <ul style={styles.list}>
                {data.required_manual_acceptance.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Certificate limitations</h2>
              <ul style={styles.list}>
                {data.certificate_limitations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </section>

          <section style={styles.nextStep}><strong>Next best step:</strong> {data.next_best_step}</section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: 18, minWidth: 0 , color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#64748b', maxWidth: 1000, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8, minWidth: 0 },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', maxWidth: '100%', overflowWrap: 'anywhere' },
  warningCard: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#78350f', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', textTransform: 'capitalize', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  inputCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', display: 'grid', gap: 6, minWidth: 0, overflowWrap: 'anywhere' },
  controlGrid: { display: 'grid', gap: 14 },
  controlCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc', display: 'grid', gap: 12, minWidth: 0 },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
  controlTitleBlock: { minWidth: 0, overflowWrap: 'anywhere' },
  reason: { color: '#334155', lineHeight: 1.45, margin: 0 },
  help: { color: '#64748b', fontSize: 12, lineHeight: 1.45, overflowWrap: 'anywhere' },
  evidenceBox: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 6, minWidth: 0 },
  evidenceLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize' },
  sourceError: { color: '#991b1b', fontSize: 12, fontWeight: 700, overflowWrap: 'anywhere' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 8, flexWrap: 'wrap' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 },
  list: { margin: 0, paddingLeft: 22, color: '#334155', lineHeight: 1.7 },
  nextStep: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', borderRadius: 14, padding: 14, color: 'var(--io-primary-deep)', lineHeight: 1.5 },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  errorButton: { justifySelf: 'start', border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  error: { background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 12, padding: 12, display: 'grid', gap: 8 },
  errorDetail: { fontSize: 12, overflowWrap: 'anywhere' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  metadataItem: { display: 'grid', gap: 4, minWidth: 0, overflowWrap: 'anywhere' },
  validationText: { margin: '14px 0 0', color: '#475569', lineHeight: 1.5 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  controlLink: { justifySelf: 'start', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 999, padding: '6px 10px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
  wrapAnywhere: { overflowWrap: 'anywhere' }
};
