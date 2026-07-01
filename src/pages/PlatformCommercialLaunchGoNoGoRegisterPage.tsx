import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type GoNoGoRow = {
  code: string;
  source_packet: string;
  source_control: string;
  domain: string;
  decision_owner: string;
  required_evidence: string;
  acceptance_artifact: string;
  packet_status: string;
  default_decision: string;
  allowed_decisions: string[];
  required_decision_fields: string[];
  conditional_go_extra_fields: string[];
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
  certificate_posture: string;
  launch_readiness_posture: string;
  decision_requirements: string[];
  launch_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}


function getDecisionEvidenceLink(row: GoNoGoRow) {
  const bySourceControl: Record<string, string> = {
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
  return bySourceControl[row.source_control] || '/platform/commercial-launch-acceptance-packet';
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
  if (value.includes('blocked') || value.includes('no_go')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('manual') || value.includes('conditional') || value.includes('ready') || value.includes('not_recorded')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchGoNoGoRegisterPage() {
  const register = useQuery({
    queryKey: ['platform', 'commercial-launch-go-no-go-register'],
    queryFn: () => platformApiRequest<CommercialLaunchGoNoGoRegister>('/platform/commercial-launch-go-no-go-register')
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
            Step 219 converts owner acceptance packets into final go/no-go decision rows. It shows exactly
            which owners must record launch decisions, what evidence is required, and which conditional-go
            fields are mandatory. It remains read-only and does not activate tenants, billing, or production launch.
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

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting launch pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/commercial-launch-acceptance-packet">Launch acceptance</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-certificate">Launch certificate</Link>
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

      {register.isLoading ? <div style={styles.card}>Loading commercial launch go/no-go register...</div> : null}
      {register.error ? (
        <div style={styles.error}>
          Failed to load commercial launch go/no-go register.
          <button type="button" style={styles.errorButton} onClick={() => void register.refetch()}>Retry</button>
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
              <div style={styles.inputCard}><span style={styles.help}>Acceptance packet</span><strong>{humanize(data.acceptance_packet_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-acceptance-packet">Open Launch Acceptance</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Certificate</span><strong>{humanize(data.certificate_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-certificate">Open Launch Certificate</Link></div>
              <div style={styles.inputCard}><span style={styles.help}>Launch readiness</span><strong>{humanize(data.launch_readiness_posture)}</strong><Link style={styles.sourceLink} to="/platform/commercial-launch-readiness">Open Launch Readiness</Link></div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Go/no-go decision rows</h2>
            <div style={styles.registerGrid}>
              {data.go_no_go_register.map((row) => (
                <article key={row.code} style={styles.registerCard}>
                  <div style={styles.rowHeader}>
                    <div>
                      <strong>{humanize(row.source_control)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.decision_owner)}</div>
                    </div>
                    <span style={badgeStyle(row.register_status)}>{humanize(row.register_status)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence</span>
                    <strong>{row.required_evidence}</strong>
                  </div>
                  <Link style={styles.packetLink} to={getDecisionEvidenceLink(row)}>{getDecisionEvidenceLabel(row)}</Link>
                  <div style={styles.statusRow}><span>Default decision</span><span style={badgeStyle(row.default_decision)}>{humanize(row.default_decision)}</span></div>
                  <div style={styles.statusRow}><span>Acceptance packet</span><span style={badgeStyle(row.packet_status)}>{humanize(row.packet_status)}</span></div>
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
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  inputCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb', display: 'grid', gap: 6 },
  registerGrid: { display: 'grid', gap: 14 },
  registerCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#f9fafb', display: 'grid', gap: 12 },
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
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#334155', borderRadius: 10, padding: '8px 12px', fontWeight: 800, cursor: 'pointer' },
  errorButton: { marginLeft: 12, border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  quickLink: { color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '7px 11px', textDecoration: 'none', fontSize: 13, fontWeight: 800 },
  packetLink: { justifySelf: 'start', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '7px 11px', textDecoration: 'none', fontSize: 13, fontWeight: 800 },
  sourceLink: { justifySelf: 'start', color: '#1d4ed8', textDecoration: 'none', fontSize: 13, fontWeight: 800 },
  error: { background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 14, padding: 14 }
};
