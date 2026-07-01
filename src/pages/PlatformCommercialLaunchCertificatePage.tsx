import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type CertificateControl = {
  code: string;
  domain: string;
  required_evidence: string;
  acceptance_owner: string;
  acceptance_rule: string;
  launch_area_code: string | null;
  launch_area_status: string;
  launch_gate: string;
  evidence_status: string;
  manual_acceptance_status: string;
};

type CommercialLaunchCertificate = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  certificate_controls: CertificateControl[];
  launch_readiness_posture: string;
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
    support_operations_accepted: '/platform/support-operations-cockpit',
    production_monitoring_accepted: '/platform/production-monitoring-readiness',
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
  if (value.includes('blocked') || value.includes('missing')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('manual') || value.includes('required') || value.includes('review')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchCertificatePage() {
  const certificate = useQuery({
    queryKey: ['platform', 'commercial-launch-certificate'],
    queryFn: () => platformApiRequest<CommercialLaunchCertificate>('/platform/commercial-launch-certificate')
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
            Step 217 assembles the final manual launch-certificate review across provisioning, onboarding,
            billing, support, monitoring, backup/restore, deployment, documentation, pilot readiness, and
            commercial readiness closure evidence. It does not automatically certify external customer proof.
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

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting readiness pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-readiness">Launch readiness</Link>
          <Link style={styles.quickLink} to="/platform/tenant-provisioning-hardening">Provisioning</Link>
          <Link style={styles.quickLink} to="/platform/customer-onboarding-checklist">Onboarding</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.quickLink} to="/platform/support-operations-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/production-monitoring-readiness">Monitoring</Link>
          <Link style={styles.quickLink} to="/platform/backup-restore-validation">Backup restore</Link>
          <Link style={styles.quickLink} to="/platform/deployment-validation">Deployment validation</Link>
          <Link style={styles.quickLink} to="/platform/documentation-completeness">Documentation</Link>
          <Link style={styles.quickLink} to="/platform/pilot-customer-readiness">Pilot readiness</Link>
        </div>
      </section>

      {certificate.isLoading ? <div style={styles.card}>Loading commercial launch certificate...</div> : null}
      {certificate.error ? (
        <div style={styles.error}>
          Failed to load commercial launch certificate.
          <button type="button" style={styles.errorButton} onClick={() => void certificate.refetch()}>Retry</button>
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
            <h2 style={styles.sectionTitle}>Certificate posture inputs</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}>
                <span style={styles.help}>Launch readiness posture</span>
                <strong>{humanize(data.launch_readiness_posture)}</strong>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Commercial readiness closure posture</span>
                <strong>{humanize(data.commercial_readiness_closure_posture)}</strong>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Certificate controls</h2>
            <div style={styles.controlGrid}>
              {data.certificate_controls.map((control) => (
                <article key={control.code} style={styles.controlCard}>
                  <div style={styles.controlHeader}>
                    <div>
                      <strong>{humanize(control.code)}</strong>
                      <div style={styles.help}>{humanize(control.domain)} · owner: {humanize(control.acceptance_owner)}</div>
                    </div>
                    <span style={badgeStyle(control.evidence_status)}>{humanize(control.evidence_status)}</span>
                  </div>
                  <p style={styles.reason}>{control.acceptance_rule}</p>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence</span>
                    <strong>{control.required_evidence}</strong>
                  </div>
                  <Link style={styles.controlLink} to={getControlReviewLink(control)}>{getControlReviewLabel(control)}</Link>
                  <div style={styles.statusRow}>
                    <span>Launch gate</span>
                    <span style={badgeStyle(control.launch_gate)}>{humanize(control.launch_gate)}</span>
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
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  inputCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb', display: 'grid', gap: 6 },
  controlGrid: { display: 'grid', gap: 14 },
  controlCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#f9fafb', display: 'grid', gap: 12 },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  reason: { color: '#4b5563', lineHeight: 1.45, margin: 0 },
  help: { color: '#6b7280', fontSize: 12 },
  evidenceBox: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 4 },
  evidenceLabel: { color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: 8 },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 },
  list: { margin: 0, paddingLeft: 22, color: '#374151', lineHeight: 1.7 },
  nextStep: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 14, color: '#1e3a8a' },
  note: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 10, padding: '8px 12px', fontWeight: 800, cursor: 'pointer' },
  errorButton: { marginLeft: 12, border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '7px 11px', textDecoration: 'none', fontSize: 13, fontWeight: 800 },
  controlLink: { justifySelf: 'start', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '7px 11px', textDecoration: 'none', fontSize: 13, fontWeight: 800 },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12 }
};
