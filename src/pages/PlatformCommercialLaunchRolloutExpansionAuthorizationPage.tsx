import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type ExpansionRow = {
  code: string;
  source_prevention_code: string;
  source_closure_code: string;
  source_triage_code: string;
  domain: string;
  owner: string;
  source_verification_status: string;
  source_default_severity: string;
  customer_impact_review_required: boolean;
  required_authorization_fields: string[];
  accepted_expansion_decisions: string[];
  expansion_requirements: string[];
  authorization_status: string;
};

type RolloutExpansionAuthorization = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  expansion_rows: ExpansionRow[];
  prevention_verification_posture: string;
  incident_triage_posture: string;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  expansion_rules: string[];
  expansion_limitations: string[];
  next_best_step: string;
  validation_note: string;
};


const SOURCE_POSTURE_LINKS = [
  { label: 'Prevention verification', key: 'prevention_verification_posture', href: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident triage', key: 'incident_triage_posture', href: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch observation', key: 'post_launch_observation_posture', href: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Command center', key: 'command_center_posture', href: '/platform/commercial-launch-day-command-center' },
  { label: 'Smoke test', key: 'smoke_test_posture', href: '/platform/commercial-launch-smoke-test-checklist' },
  { label: 'Go/no-go register', key: 'go_no_go_register_posture', href: '/platform/commercial-launch-go-no-go-register' }
] as const;

const SUPPORTING_LINKS = [
  { label: 'Prevention Verification', href: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident Closure', href: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident Triage', href: '/platform/commercial-launch-incident-triage' },
  { label: 'Expansion Health', href: '/platform/commercial-launch-expansion-health' }
];

const DOMAIN_EVIDENCE_LINKS: Record<string, { label: string; href: string }[]> = {
  service_health: [
    { label: 'System Health', href: '/platform/system-health' },
    { label: 'Monitoring Readiness', href: '/platform/production-monitoring-readiness' }
  ],
  customer_feedback: [
    { label: 'Customer Success', href: '/platform/customer-success-admin' },
    { label: 'Communications', href: '/platform/tenant-communications' }
  ],
  support_intake: [
    { label: 'Support Cockpit', href: '/platform/support-operations-cockpit' },
    { label: 'Tenant SLA', href: '/platform/tenant-sla' }
  ],
  billing_confirmation: [
    { label: 'Billing', href: '/platform/billing' },
    { label: 'Billing Activation', href: '/platform/billing-subscription-activation' },
    { label: 'License Enforcement', href: '/platform/license-plan-enforcement' }
  ],
  incident_review: [
    { label: 'Incidents', href: '/platform/incidents' },
    { label: 'Incident Closure', href: '/platform/commercial-launch-incident-closure' }
  ],
  rollback_readiness: [
    { label: 'Runbooks', href: '/platform/runbooks' },
    { label: 'Launch Command Center', href: '/platform/commercial-launch-day-command-center' }
  ],
  adoption_signal: [
    { label: 'Tenant Health', href: '/platform/tenant-health' },
    { label: 'Customer Success', href: '/platform/customer-success-admin' }
  ],
  handoff_closure: [
    { label: 'Prevention Verification', href: '/platform/commercial-launch-prevention-verification' },
    { label: 'Expansion Health', href: '/platform/commercial-launch-expansion-health' }
  ]
};

function getDomainLinks(domain: string) {
  return DOMAIN_EVIDENCE_LINKS[domain] || [{ label: 'Prevention Verification', href: '/platform/commercial-launch-prevention-verification' }];
}

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('rollback') || value.includes('hold')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('waiting') || value.includes('manual') || value.includes('watch') || value.includes('not_reviewed')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchRolloutExpansionAuthorizationPage() {
  const expansion = useQuery({
    queryKey: ['platform', 'commercial-launch-rollout-expansion-authorization'],
    queryFn: () => platformApiRequest<RolloutExpansionAuthorization>('/platform/commercial-launch-rollout-expansion-authorization')
  });

  const data = expansion.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Commercial Launch Rollout Expansion Authorization</h1>
          <p style={styles.description}>
            Step 226 turns prevention verification rows into rollout expansion authorization requirements. It tracks
            requested tenant scope, prevention evidence, support/customer-success capacity, rollback readiness, monitoring owner, product/executive approval, and expansion decision without
            mutating tenants, enabling features, changing billing, notifying customers, triggering rollback, or authorizing rollout expansion automatically.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button type="button" style={styles.button} onClick={() => expansion.refetch()} disabled={expansion.isFetching}>
            {expansion.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      {expansion.isLoading ? <div style={styles.card}>Loading commercial launch rollout expansion authorization board...</div> : null}
      {expansion.error ? (
        <div style={styles.error}>
          Failed to load commercial launch rollout expansion authorization board.
          <button type="button" style={styles.errorButton} onClick={() => expansion.refetch()} disabled={expansion.isFetching}>
            Retry
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section style={styles.metaGrid}>
            <div style={styles.metaCard}>
              <span style={styles.help}>Snapshot generated</span>
              <strong>{new Date(data.generated_at).toLocaleString()}</strong>
            </div>
            <div style={styles.metaCard}>
              <span style={styles.help}>Phase</span>
              <strong>{humanize(data.phase)}</strong>
            </div>
            <div style={styles.metaCard}>
              <span style={styles.help}>Step</span>
              <strong>{humanize(data.step)}</strong>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Supporting pages</h2>
            <div style={styles.linkRow}>
              {SUPPORTING_LINKS.map((link) => <a key={link.href} href={link.href} style={styles.linkButton}>{link.label}</a>)}
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
              {SOURCE_POSTURE_LINKS.map((source) => (
                <a key={source.key} href={source.href} style={styles.inputCardLink}>
                  <span style={styles.help}>{source.label}</span>
                  <strong>{humanize(String(data[source.key]))}</strong>
                  <span style={styles.openHint}>Open source board →</span>
                </a>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Rollout expansion authorization rows</h2>
            <div style={styles.checkGrid}>
              {data.expansion_rows.map((row) => (
                <article key={row.code} style={styles.checkCard}>
                  <div style={styles.rowHeader}>
                    <div>
                      <strong>{humanize(row.code)}</strong>
                      <div style={styles.help}>{humanize(row.domain)} · owner: {humanize(row.owner)}</div>
                    </div>
                    <span style={badgeStyle(row.authorization_status)}>{humanize(row.authorization_status)}</span>
                  </div>
                  <div style={styles.statusRow}><span>Source prevention</span><strong>{humanize(row.source_prevention_code)}</strong></div>
                  <div style={styles.statusRow}><span>Source status</span><span style={badgeStyle(row.source_verification_status)}>{humanize(row.source_verification_status)}</span></div>
                  <div style={styles.statusRow}><span>Source default severity</span><span style={badgeStyle(row.source_default_severity)}>{humanize(row.source_default_severity)}</span></div>
                  <div style={styles.statusRow}><span>Customer impact review</span><strong>{row.customer_impact_review_required ? 'Required' : 'Not required'}</strong></div>
                  <div>
                    <span style={styles.evidenceLabel}>Evidence links</span>
                    <div style={styles.linkRow}>{getDomainLinks(row.domain).map((link) => <a key={`${row.code}-${link.href}`} href={link.href} style={styles.smallLinkButton}>{link.label}</a>)}</div>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Expansion requirements</span>
                    <ul style={styles.list}>{row.expansion_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Accepted expansion decisions</span>
                    <div style={styles.chips}>{row.accepted_expansion_decisions.map((item) => <span key={item} style={styles.chip}>{humanize(item)}</span>)}</div>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required authorization fields</span>
                    <div style={styles.chips}>{row.required_authorization_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Expansion rules</h2>
              <ul style={styles.list}>{data.expansion_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Expansion limitations</h2>
              <ul style={styles.list}>{data.expansion_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
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
  button: { border: '1px solid #c7d2fe', background: '#eef2ff', color: '#3730a3', borderRadius: 10, padding: '8px 12px', fontWeight: 800, cursor: 'pointer' },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  metaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  metaCard: { background: '#fff', border: '1px solid #dbeafe', borderRadius: 14, padding: 14, display: 'grid', gap: 6 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  metricValue: { fontSize: 26, fontWeight: 900 },
  metricLabel: { color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  inputGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 },
  inputCard: { display: 'grid', gap: 6, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb' },
  inputCardLink: { display: 'grid', gap: 6, border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb', color: 'inherit', textDecoration: 'none' },
  openHint: { color: '#2563eb', fontSize: 12, fontWeight: 800 },
  linkRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  linkButton: { display: 'inline-flex', alignItems: 'center', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '7px 10px', fontSize: 12, fontWeight: 800, textDecoration: 'none' },
  smallLinkButton: { display: 'inline-flex', alignItems: 'center', border: '1px solid #dbeafe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '5px 8px', fontSize: 12, fontWeight: 700, textDecoration: 'none', marginTop: 6 },
  checkGrid: { display: 'grid', gap: 12 },
  checkCard: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, display: 'grid', gap: 12 },
  rowHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  help: { color: '#6b7280', fontSize: 12 },
  evidenceBox: { display: 'grid', gap: 4, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 },
  evidenceLabel: { color: '#6b7280', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: 10 },
  chips: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  chip: { background: '#eef2ff', color: '#3730a3', borderRadius: 999, padding: '5px 8px', fontSize: 12, fontWeight: 700, textTransform: 'capitalize' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  list: { margin: 0, paddingLeft: 20, color: '#374151', lineHeight: 1.55 },
  nextStep: { background: '#ecfeff', border: '1px solid #a5f3fc', color: '#155e75', borderRadius: 14, padding: 14 },
  note: { background: '#f8fafc', border: '1px dashed #cbd5e1', color: '#475569', borderRadius: 14, padding: 14, fontSize: 13 },
  error: { display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 14 },
  errorButton: { border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 10, padding: '7px 10px', fontWeight: 800, cursor: 'pointer' }
};
