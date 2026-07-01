import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type DeploymentControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value: number;
  status: string;
};

type DeploymentValidationPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  platform_evidence: Record<string, string | number | boolean | null>;
  deployment_validation_controls: DeploymentControl[];
  required_manual_smoke_test: string[];
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
  if (value.includes('manual') || value.includes('required') || value.includes('test')) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  return { ...styles.badge, background: '#dcfce7', color: '#166534' };
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' && value.includes('T')) return new Date(value).toLocaleString();
  return String(value);
}

export default function PlatformDeploymentValidationPage() {
  const validation = useQuery({
    queryKey: ['platform', 'deployment-validation'],
    queryFn: () => platformApiRequest<DeploymentValidationPackage>('/platform/deployment-validation')
  });

  const data = validation.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Deployment Validation Gate</h1>
          <p style={styles.description}>
            Step 214 joins Render/backend configuration, frontend managed-build guards, migration checks,
            health checks, CORS/rate-limit posture, and required live smoke-test evidence into one read-only deployment gate.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void validation.refetch()}
            disabled={validation.isFetching}
          >
            {validation.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/production-monitoring-readiness">Monitoring readiness</Link>
          <Link style={styles.quickLink} to="/platform/backup-restore-validation">Backup restore</Link>
          <Link style={styles.quickLink} to="/platform/documentation-completeness">Documentation</Link>
          <Link style={styles.quickLink} to="/platform/runbooks?category=deployment">Deployment runbooks</Link>
          <Link style={styles.quickLink} to="/platform/system-health">System health</Link>
        </div>
      </section>

      {validation.isLoading ? <div style={styles.card}>Loading deployment validation...</div> : null}
      {validation.error ? (
        <div style={styles.error}>
          Failed to load deployment validation.
          <button type="button" style={styles.errorButton} onClick={() => void validation.refetch()}>Retry</button>
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
            <h2 style={styles.sectionTitle}>Platform evidence</h2>
            <div style={styles.evidenceGrid}>
              {Object.entries(data.platform_evidence).map(([key, value]) => (
                <div key={key} style={styles.evidenceItem}>
                  <span style={styles.evidenceLabel}>{humanize(key)}</span>
                  <strong>{formatValue(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Deployment validation controls</h2>
            <div style={styles.controlGrid}>
              {data.deployment_validation_controls.map((control) => (
                <article key={control.code} style={styles.controlCard}>
                  <div style={styles.controlHeader}>
                    <strong>{control.label}</strong>
                    <span style={badgeStyle(control.status)}>{humanize(control.status)}</span>
                  </div>
                  <p style={styles.reason}>{control.launch_reason}</p>
                  <span style={styles.help}>Evidence: {humanize(control.evidence_key)} · value {control.evidence_value}</span>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Required manual live smoke test</h2>
            <ul style={styles.list}>
              {data.required_manual_smoke_test.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
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
  description: { margin: 0, color: '#4b5563', maxWidth: 940, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8 },
  generated: { color: '#6b7280', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16 },
  metricValue: { fontSize: 26, fontWeight: 900 },
  metricLabel: { color: '#6b7280', textTransform: 'capitalize', fontSize: 12, marginTop: 4 },
  sectionTitle: { margin: '0 0 12px', fontSize: 18 },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  evidenceItem: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb', display: 'grid', gap: 4 },
  evidenceLabel: { color: '#6b7280', fontSize: 12, textTransform: 'capitalize' },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  controlCard: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#f9fafb' },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' },
  reason: { color: '#4b5563', lineHeight: 1.45, margin: '8px 0' },
  help: { color: '#6b7280', fontSize: 12 },
  list: { margin: 0, paddingLeft: 22, color: '#374151', lineHeight: 1.7 },
  nextStep: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: 14, color: '#1e3a8a' },
  note: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between' },
  errorButton: { border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 10, padding: '8px 12px', fontWeight: 800, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  quickLink: { border: '1px solid #cbd5e1', borderRadius: '999px', padding: '4px 8px', color: '#0f766e', textDecoration: 'none', fontSize: '12px', fontWeight: 700 }
};
