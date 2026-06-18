import { useMemo, type CSSProperties } from 'react';
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
        </div>
      </section>

      {register.isLoading ? <div style={styles.card}>Loading commercial launch go/no-go register...</div> : null}
      {register.error ? <div style={styles.error}>Failed to load commercial launch go/no-go register.</div> : null}

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
            <h2 style={styles.sectionTitle}>Source postures</h2>
            <div style={styles.inputGrid}>
              <div style={styles.inputCard}><span style={styles.help}>Acceptance packet</span><strong>{humanize(data.acceptance_packet_posture)}</strong></div>
              <div style={styles.inputCard}><span style={styles.help}>Certificate</span><strong>{humanize(data.certificate_posture)}</strong></div>
              <div style={styles.inputCard}><span style={styles.help}>Launch readiness</span><strong>{humanize(data.launch_readiness_posture)}</strong></div>
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
  error: { background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 14, padding: 14 }
};
