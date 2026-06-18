import { useMemo, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type AcceptancePacket = {
  code: string;
  source_control: string;
  domain: string;
  acceptance_owner: string;
  required_evidence: string;
  evidence_status: string;
  launch_gate: string;
  acceptance_artifact: string;
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
  launch_readiness_posture: string;
  required_packet_controls: string[];
  launch_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('blocked') || value.includes('missing')) return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  if (value.includes('manual') || value.includes('required') || value.includes('ready')) return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

export default function PlatformCommercialLaunchAcceptancePacketPage() {
  const packet = useQuery({
    queryKey: ['platform', 'commercial-launch-acceptance-packet'],
    queryFn: () => platformApiRequest<CommercialLaunchAcceptancePacket>('/platform/commercial-launch-acceptance-packet')
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
            Step 218 converts the commercial launch certificate controls into owner-facing signoff packets.
            It prepares the exact evidence, owner, required statement, acceptance fields, and limitations that
            must be manually accepted before go-live. It does not store signatures or automatically approve launch.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
        </div>
      </section>

      {packet.isLoading ? <div style={styles.card}>Loading commercial launch acceptance packet...</div> : null}
      {packet.error ? <div style={styles.error}>Failed to load commercial launch acceptance packet.</div> : null}

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
              <div style={styles.inputCard}>
                <span style={styles.help}>Certificate posture</span>
                <strong>{humanize(data.certificate_posture)}</strong>
              </div>
              <div style={styles.inputCard}>
                <span style={styles.help}>Launch readiness posture</span>
                <strong>{humanize(data.launch_readiness_posture)}</strong>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Owner acceptance packets</h2>
            <div style={styles.packetGrid}>
              {data.acceptance_packets.map((item) => (
                <article key={item.code} style={styles.packetCard}>
                  <div style={styles.packetHeader}>
                    <div>
                      <strong>{humanize(item.source_control)}</strong>
                      <div style={styles.help}>{humanize(item.domain)} · owner: {humanize(item.acceptance_owner)}</div>
                    </div>
                    <span style={badgeStyle(item.packet_status)}>{humanize(item.packet_status)}</span>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Required evidence</span>
                    <strong>{item.required_evidence}</strong>
                  </div>
                  <div style={styles.evidenceBox}>
                    <span style={styles.evidenceLabel}>Acceptance artifact</span>
                    <strong>{item.acceptance_artifact}</strong>
                    <p style={styles.reason}>{item.required_statement}</p>
                  </div>
                  <div>
                    <span style={styles.evidenceLabel}>Required acceptance fields</span>
                    <div style={styles.chips}>
                      {item.required_acceptance_fields.map((field) => <span key={field} style={styles.chip}>{humanize(field)}</span>)}
                    </div>
                  </div>
                  <div style={styles.statusRow}>
                    <span>Evidence</span>
                    <span style={badgeStyle(item.evidence_status)}>{humanize(item.evidence_status)}</span>
                  </div>
                  <div style={styles.statusRow}>
                    <span>Launch gate</span>
                    <span style={badgeStyle(item.launch_gate)}>{humanize(item.launch_gate)}</span>
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
  packetGrid: { display: 'grid', gap: 14 },
  packetCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, background: '#f9fafb', display: 'grid', gap: 12 },
  packetHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  reason: { color: '#4b5563', lineHeight: 1.45, margin: '8px 0 0' },
  help: { color: '#6b7280', fontSize: 12 },
  evidenceBox: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, background: '#fff', display: 'grid', gap: 4 },
  evidenceLabel: { color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { border: '1px solid #d1d5db', borderRadius: 999, padding: '5px 9px', background: '#fff', color: '#374151', fontSize: 12, textTransform: 'capitalize' },
  statusRow: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', borderTop: '1px solid #e5e7eb', paddingTop: 8 },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 },
  list: { margin: 0, paddingLeft: 22, color: '#374151', lineHeight: 1.7 },
  nextStep: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 14, color: '#1e3a8a' },
  note: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12 }
};
