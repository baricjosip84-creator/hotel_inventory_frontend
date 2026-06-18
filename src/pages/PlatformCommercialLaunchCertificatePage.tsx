import { useMemo, type CSSProperties } from 'react';
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
        </div>
      </section>

      {certificate.isLoading ? <div style={styles.card}>Loading commercial launch certificate...</div> : null}
      {certificate.error ? <div style={styles.error}>Failed to load commercial launch certificate.</div> : null}

      {data ? (
        <>
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
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12 }
};
