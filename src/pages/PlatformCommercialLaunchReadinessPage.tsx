import { useQuery } from '@tanstack/react-query';
import type { CSSProperties } from 'react';
import { platformApiRequest } from '../lib/platformApi';

type LaunchReadinessArea = {
  code: string;
  domain: string;
  label: string;
  current_status: string;
  evidence_surfaces: string[];
  required_launch_controls: string[];
  next_best_step: string;
  launch_gate: string;
};

type LaunchReadinessPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  areas: LaunchReadinessArea[];
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('not_ready') || value.includes('blocked') || value.includes('not_complete')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('partial') || value.includes('medium') || value.includes('requires')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function SmallList({ items }: { items: string[] }) {
  return (
    <ul style={styles.list}>
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export default function PlatformCommercialLaunchReadinessPage() {
  const readinessQuery = useQuery({
    queryKey: ['platform', 'commercial-launch-readiness'],
    queryFn: () => platformApiRequest<LaunchReadinessPackage>('/platform/commercial-launch-readiness')
  });

  const data = readinessQuery.data;
  const summary = data?.summary || {};
  const summaryKeys = [
    'areas_total',
    'strong_foundation_present',
    'medium_strong_foundation_present',
    'medium_foundation_present',
    'partial_foundation_present',
    'not_complete',
    'ready_launch_gates',
    'blocked_launch_gates'
  ];

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Commercial launch readiness</h1>
          <p style={styles.subtitle}>One control-plane board for the ten launch areas: onboarding, provisioning, billing, support, monitoring, backup, deployment, documentation, pilot readiness, and final certificate.</p>
        </div>
        {data ? <span style={badgeStyle(data.posture)}>{humanize(data.posture)}</span> : null}
      </header>

      {readinessQuery.isLoading ? <section style={styles.card}>Loading commercial launch readiness…</section> : null}
      {readinessQuery.error ? <section style={styles.card}>Unable to load commercial launch readiness.</section> : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div><strong>Generated</strong><br /><span style={styles.help}>{new Date(data.generated_at).toLocaleString()}</span></div>
            <div style={styles.note}>{data.validation_note}</div>
          </section>

          <section style={styles.summaryGrid}>
            {summaryKeys.map((key) => (
              <div key={key} style={styles.card}>
                <strong>{humanize(key)}</strong>
                <div style={styles.metric}>{summary[key] ?? 0}</div>
              </div>
            ))}
          </section>

          <section style={styles.areaGrid}>
            {data.areas.map((area) => (
              <article key={area.code} style={styles.areaCard}>
                <div style={styles.areaHeader}>
                  <div>
                    <h2 style={styles.areaTitle}>{area.label}</h2>
                    <div style={styles.help}>{humanize(area.domain)}</div>
                  </div>
                  <span style={badgeStyle(area.current_status)}>{humanize(area.current_status)}</span>
                </div>

                <div style={styles.sectionBlock}>
                  <strong>Evidence surfaces</strong>
                  <SmallList items={area.evidence_surfaces} />
                </div>

                <div style={styles.sectionBlock}>
                  <strong>Required launch controls</strong>
                  <SmallList items={area.required_launch_controls} />
                </div>

                <div style={styles.nextStep}>
                  <strong>Next best step:</strong> {area.next_best_step}
                </div>
                <div style={styles.help}>Launch gate: {humanize(area.launch_gate)}</div>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280', maxWidth: 900 },
  badge: { padding: '8px 12px', borderRadius: 999, fontWeight: 800, whiteSpace: 'nowrap', fontSize: 12, textTransform: 'capitalize' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  metaCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 },
  note: { color: '#374151', lineHeight: 1.5 },
  help: { color: '#6b7280', fontSize: 12 },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  metric: { fontSize: 28, fontWeight: 900, marginTop: 8 },
  areaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 },
  areaCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, display: 'grid', gap: 14, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  areaHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  areaTitle: { margin: 0, fontSize: 20 },
  sectionBlock: { display: 'grid', gap: 6 },
  list: { margin: 0, paddingLeft: 20, color: '#374151', lineHeight: 1.5 },
  nextStep: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, color: '#111827', lineHeight: 1.5 }
};
