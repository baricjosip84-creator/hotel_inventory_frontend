import { useMemo, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';

type DocumentationEvidenceDetail = {
  source_scope: string;
  relative_path: string;
  repository_available: boolean;
  file_present: boolean | null;
  file_size_bytes: number | null;
  structure_complete: boolean | null;
  required_markers_total: number;
  required_markers_present: number | null;
  missing_structure_markers: string[];
  index_reference_required: boolean;
  index_reference_present: boolean | null;
};

type DocumentationControl = {
  code: string;
  label: string;
  area: string;
  evidence_key: string;
  source_scope: string;
  relative_path: string;
  launch_reason: string;
  evidence_value: boolean | null;
  evidence_detail: DocumentationEvidenceDetail;
  status: string;
};

type DocumentationCompletenessPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  repository_access: {
    backend_repository_available: boolean;
    frontend_repository_available: boolean;
    frontend_repository_source: string;
  };
  documentation_index: {
    relative_path: string;
    required_references_total: number;
    required_references_present: number;
    missing_references: string[];
    references_complete: boolean;
  };
  documentation_evidence: Record<string, boolean | null>;
  documentation_evidence_details: Record<string, DocumentationEvidenceDetail>;
  documentation_controls: DocumentationControl[];
  required_manual_acceptance: string[];
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
  if (
    normalized.includes('blocked')
    || normalized.includes('missing')
    || normalized.includes('incomplete')
    || normalized.includes('unavailable')
  ) {
    return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
  }
  if (
    normalized.includes('review')
    || normalized.includes('required')
    || normalized.includes('manual')
    || normalized.includes('acceptance')
    || normalized.includes('external')
  ) {
    return { ...styles.badge, background: '#fef3c7', color: '#92400e' };
  }
  if (normalized.includes('ready') || normalized.includes('present') || normalized.includes('complete')) {
    return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  }
  return { ...styles.badge, background: '#f1f5f9', color: '#475569' };
}

function evidenceState(value: boolean | null | undefined) {
  if (value === true) return 'present';
  if (value === false) return 'missing or incomplete';
  return 'external review required';
}

function yesNoReview(value: boolean | null | undefined) {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'not inspectable here';
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unknown error';
}

export default function PlatformDocumentationCompletenessPage() {
  const documentation = useQuery({
    queryKey: ['platform', 'documentation-completeness'],
    queryFn: () => platformApiRequest<DocumentationCompletenessPackage>('/platform/documentation-completeness'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = documentation.data;
  const summary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);

  return (
    <div style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>Platform Commercial Launch Readiness</p>
          <h1 style={styles.title}>Documentation Completeness Board</h1>
          <p style={styles.description}>
            Operator precheck only. Step 215 verifies the checked-in commercial launch documentation package by file presence,
            expected Markdown structure, and index references. It does not prove that guidance is current, owner-approved,
            customer-accepted, or validated in production.
          </p>
        </div>
        <div style={styles.headerMeta}>
          <span style={badgeStyle(data?.posture || 'loading')}>{humanize(data?.posture || 'loading')}</span>
          <span style={styles.generated}>{data?.generated_at ? new Date(data.generated_at).toLocaleString() : 'Not generated yet'}</span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => void documentation.refetch()}
            disabled={documentation.isFetching}
          >
            {documentation.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </section>

      <section style={styles.notice}>
        <strong>Static repository evidence only.</strong> A green control means the expected document is structurally present and indexed;
        it is not launch certification. Frontend documentation is reviewed externally when the separate frontend repository is not available to the backend runtime.
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Supporting pages</h2>
        <div style={styles.quickLinks}>
          <Link style={styles.quickLink} to="/platform/runbooks?category=documentation">Documentation runbooks</Link>
          <Link style={styles.quickLink} to="/platform/customer-onboarding-checklist">Onboarding checklist</Link>
          <Link style={styles.quickLink} to="/platform/support-operations-cockpit">Support cockpit</Link>
          <Link style={styles.quickLink} to="/platform/billing-subscription-activation">Billing activation</Link>
          <Link style={styles.quickLink} to="/platform/backup-restore-validation">Backup restore</Link>
          <Link style={styles.quickLink} to="/platform/deployment-validation">Deployment validation</Link>
          <Link style={styles.quickLink} to="/platform/commercial-launch-readiness">Launch readiness</Link>
        </div>
      </section>

      {documentation.isLoading ? <div style={styles.card}>Loading documentation completeness...</div> : null}
      {documentation.error ? (
        <div style={styles.error}>
          <span>Unable to load documentation completeness: {readableError(documentation.error)}</span>
          <button
            type="button"
            style={styles.errorButton}
            onClick={() => void documentation.refetch()}
            disabled={documentation.isFetching}
          >
            {documentation.isFetching ? 'Retrying...' : 'Retry'}
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
              <div><strong>Generated</strong><span>{new Date(data.generated_at).toLocaleString()}</span></div>
              <div><strong>Backend repository</strong><span>{data.repository_access.backend_repository_available ? 'available' : 'unavailable'}</span></div>
              <div><strong>Frontend repository</strong><span>{data.repository_access.frontend_repository_available ? 'available to backend precheck' : 'external review required'}</span></div>
              <div><strong>Frontend source resolution</strong><span>{humanize(data.repository_access.frontend_repository_source)}</span></div>
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
            <h2 style={styles.sectionTitle}>Documentation index integrity</h2>
            <div style={styles.metadataGrid}>
              <div><strong>Index</strong><span>{data.documentation_index.relative_path}</span></div>
              <div><strong>Required references</strong><span>{data.documentation_index.required_references_present}/{data.documentation_index.required_references_total}</span></div>
              <div><strong>References complete</strong><span>{data.documentation_index.references_complete ? 'yes' : 'no'}</span></div>
              <div>
                <strong>Missing references</strong>
                <span>{data.documentation_index.missing_references.length ? data.documentation_index.missing_references.join(', ') : 'none'}</span>
              </div>
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Documentation evidence</h2>
            <div style={styles.evidenceGrid}>
              {Object.entries(data.documentation_evidence).map(([key, value]) => (
                <div key={key} style={styles.evidenceItem}>
                  <span style={styles.evidenceLabel}>{humanize(key)}</span>
                  <strong>{evidenceState(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Documentation controls</h2>
            <div style={styles.controlGrid}>
              {data.documentation_controls.map((control) => (
                <article key={control.code} style={styles.controlCard}>
                  <div style={styles.controlHeader}>
                    <strong>{control.label}</strong>
                    <span style={badgeStyle(control.status)}>{humanize(control.status)}</span>
                  </div>
                  <p style={styles.reason}>{control.launch_reason}</p>
                  <dl style={styles.detailList}>
                    <div><dt>Source</dt><dd>{humanize(control.source_scope)}</dd></div>
                    <div><dt>Path</dt><dd>{control.relative_path}</dd></div>
                    <div><dt>Repository available</dt><dd>{yesNoReview(control.evidence_detail.repository_available)}</dd></div>
                    <div><dt>File present</dt><dd>{yesNoReview(control.evidence_detail.file_present)}</dd></div>
                    <div><dt>Structure complete</dt><dd>{yesNoReview(control.evidence_detail.structure_complete)}</dd></div>
                    <div>
                      <dt>Required markers</dt>
                      <dd>{control.evidence_detail.required_markers_present ?? 'external'}/{control.evidence_detail.required_markers_total}</dd>
                    </div>
                    {control.evidence_detail.index_reference_required ? (
                      <div><dt>Indexed</dt><dd>{yesNoReview(control.evidence_detail.index_reference_present)}</dd></div>
                    ) : null}
                  </dl>
                  {control.evidence_detail.missing_structure_markers.length ? (
                    <p style={styles.warningText}>
                      Missing structure markers: {control.evidence_detail.missing_structure_markers.join(' · ')}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Required manual acceptance</h2>
            <ul style={styles.list}>
              {data.required_manual_acceptance.map((item) => (
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
  page: { display: 'grid', gap: 18, minWidth: 0, color: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' },
  eyebrow: { margin: 0, color: '#64748b', fontSize: 12, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { margin: '4px 0', fontSize: 28, lineHeight: 1.15, letterSpacing: '-.025em', color: '#0f172a' },
  description: { margin: 0, color: '#64748b', maxWidth: 940, lineHeight: 1.5 },
  headerMeta: { display: 'grid', justifyItems: 'end', gap: 8, minWidth: 0 },
  generated: { color: '#64748b', fontSize: 12 },
  badge: { padding: '7px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, textTransform: 'capitalize', whiteSpace: 'normal', overflowWrap: 'anywhere' },
  card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  notice: { background: '#fefce8', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#854d0e', lineHeight: 1.5 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  metric: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, boxShadow: '0 1px 2px rgba(15,23,42,.03), 0 8px 24px rgba(15,23,42,.04)', minWidth: 0 },
  metricValue: { fontSize: 30, lineHeight: 1.1, fontWeight: 800, color: '#0f172a' },
  metricLabel: { color: '#64748b', textTransform: 'capitalize', fontSize: 12, marginTop: 4, overflowWrap: 'anywhere' },
  sectionTitle: { margin: '0 0 12px', fontSize: 18, letterSpacing: '-.015em', color: '#0f172a' },
  evidenceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 },
  evidenceItem: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', display: 'grid', gap: 4, minWidth: 0, overflowWrap: 'anywhere' },
  evidenceLabel: { color: '#64748b', fontSize: 12, textTransform: 'capitalize' },
  controlGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 },
  controlCard: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc', minWidth: 0, overflowWrap: 'anywhere' },
  controlHeader: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', flexWrap: 'wrap' },
  reason: { color: '#334155', lineHeight: 1.45, margin: '8px 0' },
  detailList: { margin: 0, display: 'grid', gap: 5, fontSize: 12 },
  warningText: { margin: '10px 0 0', color: '#991b1b', fontSize: 12, lineHeight: 1.4 },
  list: { margin: 0, paddingLeft: 22, color: '#334155', lineHeight: 1.7 },
  nextStep: { background: 'var(--io-primary-soft)', border: '1px solid var(--io-primary-border)', borderRadius: 14, padding: 14, color: 'var(--io-primary-deep)', overflowWrap: 'anywhere' },
  note: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 14, color: '#92400e', overflowWrap: 'anywhere' },
  error: { background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12, display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  errorButton: { border: '1px solid #991b1b', background: '#fff', color: '#991b1b', borderRadius: 8, padding: '6px 10px', fontWeight: 800, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', borderRadius: 9, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' },
  metadataGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 },
  quickLinks: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' },
  quickLink: { border: '1px solid #cbd5e1', borderRadius: '999px', padding: '4px 8px', color: 'var(--io-primary-dark)', textDecoration: 'none', fontSize: 12, fontWeight: 700 },
};
