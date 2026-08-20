import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type DeploymentControl = {
  code: string;
  label: string;
  evidence_key: string;
  evidence_scope: string;
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
  automatic_runtime_gate_coverage: string[];
  operator_follow_up: string[];
  next_best_step: string;
  validation_note: string;
};

function humanize(value: string) {
  return value.replaceAll('_', ' ');
}

function badgeStyle(value: string): CSSProperties {
  const normalized = value.toLowerCase();
  if (normalized === 'loading') {
    return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
  }
  if (normalized.includes('blocked') || normalized.includes('missing') || normalized.includes('unsafe')) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (
    normalized.includes('review')
    || normalized.includes('required')
    || normalized.includes('external')
    || normalized.includes('waived')
  ) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (normalized.includes('ready') || normalized.includes('present') || normalized.includes('safe')) {
    return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  }
  return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return 'not available on this surface';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
  }
  return String(value);
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unknown error';
}

export default function PlatformDeploymentValidationPage() {
  const validation = useQuery({
    queryKey: ['platform', 'deployment-validation'],
    queryFn: () => platformApiRequest<DeploymentValidationPackage>('/platform/deployment-validation'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = validation.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Deployment Validation</h1>
          <p style={styles.description}>
            Operator precheck only. This page reviews backend deployment foundations and the running backend configuration,
            then points operators to the frontend-owned automatic Deployment Readiness Gate for live Render/Vercel evidence.
            It does not deploy services or certify a production release by itself.
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

      <section style={styles.notice}>
        <strong>Live evidence is external.</strong> The canonical post-release gate runs from the frontend GitHub Actions workflow.
        This application does not query or persist that HTML/JSON artifact, so an amber external-evidence state is not the same as a failed deployment.
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/production-monitoring-readiness">Monitoring readiness</Link>
          <Link style={styles.quickLink} to="/platform/backup-restore-validation">Backup restore</Link>
          <Link style={styles.quickLink} to="/platform/releases">Releases</Link>
          <Link style={styles.quickLink} to="/platform/change-management">Change management</Link>
          <Link style={styles.quickLink} to="/platform/runbooks?category=deployment">Deployment runbooks</Link>
          <Link style={styles.quickLink} to="/platform/system-health">System health</Link>
        </div>
      </section>

      {validation.isLoading ? <div style={styles.card}>Loading deployment validation...</div> : null}
      {validation.error ? (
        <div style={styles.error}>
          <span>Unable to load deployment validation: {readableError(validation.error)}</span>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void validation.refetch()}
            disabled={validation.isFetching}
          >
            {validation.isFetching ? 'Retrying...' : 'Retry'}
          </button>
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
              <div><strong>Validation boundary</strong><span>{data.validation_note}</span></div>
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
            <p style={styles.helpText}>
              Runtime evidence exposes status/counts only. Configured CORS origins, tokens, secrets, and external artifact contents are not returned.
            </p>
            <div style={styles.evidenceGrid}>
              {Object.entries(data.platform_evidence).map(([key, value]) => (
                <div key={key} style={styles.evidenceItem}>
                  <span style={styles.evidenceLabel}>{humanize(key)}</span>
                  <strong style={styles.wrap}>{formatValue(value)}</strong>
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
                    <strong style={styles.wrap}>{control.label}</strong>
                    <span style={badgeStyle(control.status)}>{humanize(control.status)}</span>
                  </div>
                  <p style={styles.reason}>{control.launch_reason}</p>
                  <div style={styles.controlMeta}>
                    <span>Scope: {humanize(control.evidence_scope)}</span>
                    <span>Evidence: {humanize(control.evidence_key)} · value {control.evidence_value}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section style={styles.twoColumn}>
            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Automatic runtime gate coverage</h2>
              <p style={styles.helpText}>
                These are the repeatable checks already owned by the current frontend Deployment Readiness Gate.
              </p>
              <ul style={styles.list}>
                {data.automatic_runtime_gate_coverage.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div style={styles.card}>
              <h2 style={styles.sectionTitle}>Operator follow-up</h2>
              <p style={styles.helpText}>
                The automatic workflow is the normal release path. Manual execution is a fallback, not an unconditional requirement.
              </p>
              <ul style={styles.list}>
                {data.operator_follow_up.map((item) => (
                  <li key={item}>{item}</li>
                ))}
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
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#64748b', maxWidth: 980, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8, minWidth: 0 },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'nowrap' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  notice: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  twoColumn: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', textTransform: 'capitalize', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  evidenceItem: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', display: 'grid', gap: 4, minWidth: 0 },
  evidenceLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize', overflowWrap: 'anywhere' },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  controlCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', minWidth: 0 },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
  controlMeta: { color: '#64748b', fontSize: 12, display: 'grid', gap: 4, overflowWrap: 'anywhere' },
  reason: { color: '#334155', lineHeight: 1.45, margin: '8px 0', overflowWrap: 'anywhere' },
  helpText: { color: '#64748b', fontSize: 13, lineHeight: 1.5, margin: '0 0 12px' },
  list: { margin: 0, paddingLeft: 22, color: '#334155', lineHeight: 1.7 },
  nextStep: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', borderRadius: 14, padding: 14, color: 'var(--io-primary-deep)', overflowWrap: 'anywhere' },
  note: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e', overflowWrap: 'anywhere' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  errorButton: { border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  quickLink: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '4px 8px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontWeight: 700, fontSize: 12 },
  wrap: { overflowWrap: 'anywhere', minWidth: 0 }
};
