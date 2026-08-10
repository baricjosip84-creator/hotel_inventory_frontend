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

const summaryItems = [
  { key: 'areas_total', label: 'Areas total' },
  { key: 'core_launch_areas_total', label: 'Core launch areas' },
  { key: 'post_launch_controls_total', label: 'Post-launch controls' },
  { key: 'strong_foundation_present', label: 'Strong foundation' },
  { key: 'medium_strong_foundation_present', label: 'Medium-strong foundation' },
  { key: 'medium_foundation_present', label: 'Medium foundation' },
  { key: 'partial_foundation_present', label: 'Partial foundation' },
  { key: 'not_complete', label: 'Not complete' },
  { key: 'manual_certificate_review_required', label: 'Manual certificate review' },
  { key: 'manual_evidence_required', label: 'Manual evidence required' },
  { key: 'ready_launch_gates', label: 'Review-ready gates' },
  { key: 'blocked_launch_gates', label: 'Blocked gates' }
] as const;

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function statusLabel(value: string) {
  const labels: Record<string, string> = {
    strong_foundation_present: 'Strong foundation present',
    medium_strong_foundation_present: 'Medium-strong foundation present',
    medium_foundation_present: 'Medium foundation present',
    partial_foundation_present: 'Partial foundation present',
    not_complete: 'Not complete',
    manual_certificate_review_required: 'Manual certificate review required',
    manual_evidence_required: 'Manual evidence required'
  };
  return labels[value] || humanize(value);
}

function badgeStyle(value: string): CSSProperties {
  if (value.includes('not_ready') || value.includes('blocked') || value.includes('not_complete')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (value.includes('manual_') || value.includes('partial') || value === 'medium_foundation_present') {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (value.includes('medium_strong')) {
    return { ...styles.badge, background: '#dbeafe', color: '#1d4ed8' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function postureStyle(value: string): CSSProperties {
  if (value.includes('not_ready') || value.includes('blocked')) {
    return { ...styles.postureBadge, background: '#fee2e2', color: '#991b1b' };
  }
  return { ...styles.postureBadge, background: '#dbeafe', color: '#1d4ed8' };
}

function SmallList({ items }: { items: string[] }) {
  return (
    <ul style={styles.list}>
      {items.map((item) => <li key={item} style={styles.listItem}>{item}</li>)}
    </ul>
  );
}

function AreaCard({ area }: { area: LaunchReadinessArea }) {
  return (
    <article style={styles.areaCard}>
      <div style={styles.areaHeader}>
        <div style={styles.areaHeadingText}>
          <h3 style={styles.areaTitle}>{area.label}</h3>
          <div style={styles.help}>{humanize(area.domain)}</div>
        </div>
        <span style={badgeStyle(area.current_status)}>{statusLabel(area.current_status)}</span>
      </div>

      <div style={styles.nextStep}>
        <strong>Next best step:</strong> {area.next_best_step}
      </div>

      <div style={styles.gateLine}>
        <strong>Review gate</strong>
        <span style={styles.gateValue}>{humanize(area.launch_gate)}</span>
      </div>

      <details style={styles.details}>
        <summary style={styles.detailsSummary}>Evidence surfaces ({area.evidence_surfaces.length})</summary>
        <div style={styles.detailsBody}><SmallList items={area.evidence_surfaces} /></div>
      </details>

      <details style={styles.details}>
        <summary style={styles.detailsSummary}>Required controls ({area.required_launch_controls.length})</summary>
        <div style={styles.detailsBody}><SmallList items={area.required_launch_controls} /></div>
      </details>
    </article>
  );
}

export default function PlatformCommercialLaunchReadinessPage() {
  const readinessQuery = useQuery({
    queryKey: ['platform', 'commercial-launch-readiness'],
    queryFn: () => platformApiRequest<LaunchReadinessPackage>('/platform/commercial-launch-readiness'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const data = readinessQuery.data;
  const summary = data?.summary || {};
  const coreAreas = data?.areas.filter((area) => area.domain !== 'post_launch_controls') || [];
  const postLaunchAreas = data?.areas.filter((area) => area.domain === 'post_launch_controls') || [];
  const errorMessage = readinessQuery.error instanceof Error
    ? readinessQuery.error.message
    : 'The launch-readiness package could not be retrieved.';

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerCopy}>
          <h1 style={styles.title}>Commercial launch readiness</h1>
          <p style={styles.subtitle}>
            Read-only capability board for the ten core launch areas and the post-launch evidence-governance chain.
            It shows what review surfaces and manual controls exist; it does not certify a real customer launch.
          </p>
        </div>
        <div style={styles.headerActions}>
          {data ? <span style={postureStyle(data.posture)}>{humanize(data.posture)}</span> : null}
          <button
            type="button"
            style={styles.refreshButton}
            onClick={() => readinessQuery.refetch()}
            disabled={readinessQuery.isFetching}
          >
            {readinessQuery.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {readinessQuery.isLoading ? (
        <section style={styles.card}>Loading commercial launch readiness…</section>
      ) : null}

      {readinessQuery.error ? (
        <section style={styles.errorCard}>
          <strong>Unable to load commercial launch readiness.</strong>
          <span style={styles.errorText}>{errorMessage}</span>
          <button type="button" style={styles.retryButton} onClick={() => readinessQuery.refetch()}>Retry</button>
        </section>
      ) : null}

      {data ? (
        <>
          <section style={styles.metaCard}>
            <div><strong>{data.phase}</strong><br /><span style={styles.help}>{data.step}</span></div>
            <div>
              <strong>Last refreshed</strong><br />
              <span style={styles.help}>{new Date(data.generated_at).toLocaleString()}</span>
            </div>
            <div style={styles.note}>{data.validation_note}</div>
          </section>

          <section style={styles.summaryGrid} aria-label="Launch readiness summary">
            {summaryItems.map(({ key, label }) => (
              <div key={key} style={styles.summaryCard}>
                <strong style={styles.summaryLabel}>{label}</strong>
                <div style={styles.metric}>{summary[key] ?? 0}</div>
              </div>
            ))}
          </section>

          <section style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Core launch readiness</h2>
              <p style={styles.sectionDescription}>
                Ten pre-launch capability areas. Foundation labels describe implementation/evidence posture, not proof that a launch has succeeded.
              </p>
            </div>
            <span style={styles.countBadge}>{coreAreas.length} areas</span>
          </section>
          <section style={styles.areaGrid}>
            {coreAreas.map((area) => <AreaCard key={area.code} area={area} />)}
          </section>

          <section style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Post-launch evidence controls</h2>
              <p style={styles.sectionDescription}>
                Manual governance checkpoints for incident closure, rollout, steady-state operations, retention, and renewal evidence.
                “Manual evidence required” is intentionally not treated as a completed green state.
              </p>
            </div>
            <span style={styles.countBadge}>{postLaunchAreas.length} controls</span>
          </section>
          <section style={styles.areaGrid}>
            {postLaunchAreas.map((area) => <AreaCard key={area.code} area={area} />)}
          </section>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, overflowX: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  headerCopy: { minWidth: 0, flex: '1 1 620px' },
  headerActions: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '6px 0 0', color: '#6b7280', maxWidth: 980, lineHeight: 1.5 },
  badge: { padding: '7px 10px', borderRadius: 999, fontWeight: 800, fontSize: 11, textTransform: 'capitalize', textAlign: 'center', lineHeight: 1.25, maxWidth: 200 },
  postureBadge: { padding: '8px 12px', borderRadius: 999, fontWeight: 800, fontSize: 12, textTransform: 'capitalize', textAlign: 'center', lineHeight: 1.25, maxWidth: 320 },
  refreshButton: { border: '1px solid #cbd5e1', background: '#fff', borderRadius: 10, padding: '9px 13px', fontWeight: 800, cursor: 'pointer' },
  retryButton: { border: '1px solid #fecaca', background: '#fff', color: '#991b1b', borderRadius: 10, padding: '8px 12px', fontWeight: 800, cursor: 'pointer', alignSelf: 'flex-start' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  errorCard: { background: '#fff7f7', border: '1px solid #fecaca', borderRadius: 14, padding: 18, display: 'grid', gap: 8, color: '#991b1b' },
  errorText: { color: '#7f1d1d', lineHeight: 1.4, overflowWrap: 'anywhere' },
  metaCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, minWidth: 0 },
  note: { color: '#374151', lineHeight: 1.5 },
  help: { color: '#6b7280', fontSize: 12, overflowWrap: 'anywhere' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, minWidth: 0 },
  summaryCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', minWidth: 0 },
  summaryLabel: { display: 'block', lineHeight: 1.3, fontSize: 13 },
  metric: { fontSize: 27, fontWeight: 900, marginTop: 8 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 6 },
  sectionTitle: { margin: 0, fontSize: 22 },
  sectionDescription: { margin: '5px 0 0', color: '#6b7280', lineHeight: 1.45, maxWidth: 980 },
  countBadge: { padding: '6px 10px', borderRadius: 999, background: '#eef2ff', color: '#3730a3', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' },
  areaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, minWidth: 0 },
  areaCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18, display: 'grid', gap: 13, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', minWidth: 0, alignContent: 'start' },
  areaHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', minWidth: 0 },
  areaHeadingText: { flex: '1 1 170px', minWidth: 0 },
  areaTitle: { margin: 0, fontSize: 19, lineHeight: 1.25, overflowWrap: 'anywhere' },
  list: { margin: 0, paddingLeft: 20, color: '#374151', lineHeight: 1.5, minWidth: 0 },
  listItem: { overflowWrap: 'anywhere', wordBreak: 'break-word' },
  nextStep: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, color: '#111827', lineHeight: 1.5, overflowWrap: 'anywhere' },
  gateLine: { display: 'grid', gap: 3, color: '#374151', fontSize: 12, minWidth: 0 },
  gateValue: { color: '#6b7280', overflowWrap: 'anywhere' },
  details: { borderTop: '1px solid #eef2f7', paddingTop: 9, minWidth: 0 },
  detailsSummary: { cursor: 'pointer', fontWeight: 800, color: '#374151', lineHeight: 1.4 },
  detailsBody: { marginTop: 9, minWidth: 0 }
};
