import { useMemo } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformDocumentationCompletenessPage.css';

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

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

type SupportLink = {
  label: string;
  to: string;
  allowed: boolean;
};

const summaryLabels: Record<string, string> = {
  controls_total: 'Controls reviewed',
  documentation_present: 'Documentation present',
  documentation_missing: 'Missing documents',
  documentation_structure_incomplete: 'Structure incomplete',
  documentation_index_reference_missing: 'Index references missing',
  documentation_source_unavailable: 'Sources unavailable',
  external_repository_review_required: 'External repository review',
  launch_blockers: 'Launch blockers',
  review_required: 'Review required'
};

const statusLabels: Record<string, string> = {
  documentation_launch_blocked: 'Documentation launch blocked',
  documentation_review_required: 'Documentation review required',
  documentation_ready_for_manual_acceptance: 'Ready for manual acceptance',
  documentation_present: 'Documentation present',
  documentation_missing: 'Documentation missing',
  documentation_structure_incomplete: 'Structure incomplete',
  documentation_index_reference_missing: 'Index reference missing',
  documentation_source_unavailable: 'Documentation source unavailable',
  external_repository_review_required: 'External repository review required'
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function displayStatus(value: string | null | undefined) {
  if (!value) return 'Not available';
  return statusLabels[value] || humanize(value);
}

function displaySummaryKey(value: string) {
  return summaryLabels[value] || humanize(value);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (
    normalized.includes('blocked')
    || normalized.includes('missing')
    || normalized.includes('incomplete')
    || normalized.includes('source_unavailable')
  ) return 'danger';
  if (
    normalized.includes('review')
    || normalized.includes('required')
    || normalized.includes('manual')
    || normalized.includes('acceptance')
    || normalized.includes('external')
  ) return 'warn';
  if (normalized.includes('ready') || normalized.includes('present') || normalized.includes('complete')) return 'good';
  return 'accent';
}

function evidenceState(value: boolean | null | undefined) {
  if (value === true) return 'Present';
  if (value === false) return 'Missing or incomplete';
  return 'External review required';
}

function evidenceTone(value: boolean | null | undefined): BadgeTone {
  if (value === true) return 'good';
  if (value === false) return 'danger';
  return 'warn';
}

function yesNoReview(value: boolean | null | undefined) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not inspectable here';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function formatBytes(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Not available';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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
  const summary = data?.summary || {};
  const detailSummary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const documentationEvidence = useMemo(() => Object.entries(data?.documentation_evidence || {}), [data?.documentation_evidence]);
  const refreshError = documentation.isError && Boolean(data);
  const initialLoadError = documentation.isError && !data;
  const errorMessage = readableError(documentation.error);

  const supportingPages: SupportLink[] = [
    {
      label: 'Documentation runbooks',
      to: '/platform/runbooks?category=documentation',
      allowed: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
    },
    {
      label: 'Onboarding checklist',
      to: '/platform/customer-onboarding-checklist',
      allowed: hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ)
    },
    {
      label: 'Support cockpit',
      to: '/platform/support-operations-cockpit',
      allowed: [
        PLATFORM_PERMISSIONS.TENANTS_READ,
        PLATFORM_PERMISSIONS.PLATFORM_SLA_READ,
        PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ,
        PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ
      ].every((permission) => hasPlatformPermission(permission))
    },
    {
      label: 'Billing activation',
      to: '/platform/billing-subscription-activation',
      allowed: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ)
    },
    {
      label: 'Backup restore',
      to: '/platform/backup-restore-validation',
      allowed: [
        PLATFORM_PERMISSIONS.TENANTS_READ,
        PLATFORM_PERMISSIONS.TENANTS_EXPORT,
        PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ
      ].every((permission) => hasPlatformPermission(permission))
    },
    {
      label: 'Deployment validation',
      to: '/platform/deployment-validation',
      allowed: hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
    },
    {
      label: 'Launch readiness',
      to: '/platform/commercial-launch-readiness',
      allowed: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DASHBOARD_READ)
    }
  ];
  const accessibleSupportingPages = supportingPages.filter((item) => item.allowed);
  const hiddenSupportingPageCount = supportingPages.length - accessibleSupportingPages.length;

  return (
    <div className="io-operational-page io-workspace-page platform-documentation-completeness">
      <OperationalWorkspaceHero
        iconPath="/platform/documentation-completeness"
        eyebrow="Platform Commercial Launch Readiness"
        title="Documentation Completeness"
        description="Read-only operator precheck for the checked-in commercial launch documentation package. It verifies file presence, expected Markdown structure and documentation-index references without treating static repository evidence as launch certification."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 215 — Documentation Completeness Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Operator precheck only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Static repository evidence only</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-documentation-completeness__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.documentation_present ?? 0}/${summary.controls_total ?? 0}` : '—'}
              label="controls structurally present"
            />
            {data ? (
              <span className="platform-documentation-completeness__status-badge" data-tone={badgeTone(data.posture)}>
                {displayStatus(data.posture)}
              </span>
            ) : null}
            <div className="platform-documentation-completeness__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void documentation.refetch()}
                disabled={documentation.isFetching}
              >
                {documentation.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel="Documentation completeness key metrics">
        <OperationalWorkspaceStatCard
          iconPath="/platform/documentation-completeness"
          label="Controls reviewed"
          value={summary.controls_total ?? 0}
          helper="Required documentation controls in the launch package"
          loading={!data && documentation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/documentation-completeness"
          label="Documentation present"
          value={summary.documentation_present ?? 0}
          helper="Structurally valid and indexed controls proven here"
          tone="good"
          loading={!data && documentation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/commercial-launch-readiness"
          label="Launch blockers"
          value={summary.launch_blockers ?? 0}
          helper="Missing, incomplete, unindexed or unavailable required documentation"
          tone={(summary.launch_blockers ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && documentation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/documentation-completeness"
          label="Review required"
          value={summary.review_required ?? 0}
          helper="External repository evidence still requiring operator review"
          tone={(summary.review_required ?? 0) > 0 ? 'warn' : 'default'}
          loading={!data && documentation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/documentation-completeness"
          label="Structure incomplete"
          value={summary.documentation_structure_incomplete ?? 0}
          helper="Files present but missing required Markdown structure"
          tone={(summary.documentation_structure_incomplete ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && documentation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/documentation-completeness"
          label="Index references missing"
          value={summary.documentation_index_reference_missing ?? 0}
          helper="Required documents not referenced by the commercial launch index"
          tone={(summary.documentation_index_reference_missing ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && documentation.isLoading}
        />
      </OperationalWorkspaceStats>

      <section className="app-panel app-panel--padded platform-documentation-completeness__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/documentation-completeness"
          title="Validation boundary"
          description="A green control means the expected document is structurally present and indexed. It does not prove that guidance is current, owner-approved, customer-accepted or validated in production."
        />
        <div className="platform-documentation-completeness__boundary-grid">
          <div className="platform-documentation-completeness__static-notice">
            <strong>Static repository evidence only.</strong>
            <span>
              Frontend documentation is reported as external review required when the separate frontend repository is not available to the backend runtime. That state does not mean the frontend document is missing.
            </span>
          </div>
          <div className="platform-documentation-completeness__supporting-pages">
            <strong>Supporting pages</strong>
            <div className="platform-documentation-completeness__link-row">
              {accessibleSupportingPages.map((item) => (
                <Link key={item.to} className="app-button app-button--secondary" to={item.to}>{item.label}</Link>
              ))}
            </div>
            {hiddenSupportingPageCount > 0 ? (
              <span className="platform-documentation-completeness__permission-note">
                {hiddenSupportingPageCount} supporting {hiddenSupportingPageCount === 1 ? 'page is' : 'pages are'} hidden because your platform role does not include the required read permission.
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {documentation.isLoading && !data ? (
        <section className="app-panel app-panel--padded platform-documentation-completeness__feedback">
          <strong>Loading documentation completeness…</strong>
          <span>Checking repository availability, required files, Markdown structure and documentation-index references.</span>
        </section>
      ) : null}

      {initialLoadError ? (
        <section className="app-panel app-panel--padded platform-documentation-completeness__feedback platform-documentation-completeness__feedback--error">
          <strong>Unable to load documentation completeness.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-documentation-completeness__retry"
            onClick={() => void documentation.refetch()}
            disabled={documentation.isFetching}
          >
            {documentation.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-documentation-completeness__feedback platform-documentation-completeness__feedback--warning">
          <strong>Latest refresh failed.</strong>
          <span>Showing the last successful documentation-completeness snapshot. Refresh error: {errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-documentation-completeness__retry"
            onClick={() => void documentation.refetch()}
            disabled={documentation.isFetching}
          >
            {documentation.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="app-panel app-panel--padded platform-documentation-completeness__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/documentation-completeness"
              title="Documentation program"
              description="Snapshot identity, repository visibility and the precise boundary of what this read-only static precheck can prove."
            />
            <div className="platform-documentation-completeness__program-grid">
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Current posture</strong><span>{displayStatus(data.posture)}</span></div>
              <div><strong>Backend repository</strong><span>{data.repository_access.backend_repository_available ? 'Available' : 'Unavailable'}</span></div>
              <div><strong>Frontend repository</strong><span>{data.repository_access.frontend_repository_available ? 'Available to backend precheck' : 'External review required'}</span></div>
              <div><strong>Frontend source resolution</strong><span>{humanize(data.repository_access.frontend_repository_source)}</span></div>
              <div><strong>Evidence detail records</strong><span>{Object.keys(data.documentation_evidence_details).length}</span></div>
            </div>
            <details className="platform-documentation-completeness__validation-note">
              <summary>Read exact validation boundary</summary>
              <p>{data.validation_note}</p>
            </details>
          </section>

          <section className="app-panel app-panel--padded platform-documentation-completeness__summary-panel">
            <OperationalSectionHeader
              iconPath="/platform/documentation-completeness"
              title="Detailed summary"
              description="Complete counters returned by the documentation service, including blocking and external-review states."
            />
            <div className="platform-documentation-completeness__summary-grid">
              {detailSummary.map(([key, value]) => (
                <div key={key} className="platform-documentation-completeness__summary-item">
                  <span>{displaySummaryKey(key)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-documentation-completeness__index-panel">
            <OperationalSectionHeader
              iconPath="/platform/documentation-completeness"
              title="Documentation index integrity"
              description="Confirms the commercial launch index still references every document that is required to be indexed."
            />
            <div className="platform-documentation-completeness__index-grid">
              <div><strong>Index</strong><span>{data.documentation_index.relative_path}</span></div>
              <div><strong>Required references</strong><span>{data.documentation_index.required_references_present}/{data.documentation_index.required_references_total}</span></div>
              <div><strong>References complete</strong><span>{data.documentation_index.references_complete ? 'Yes' : 'No'}</span></div>
              <div>
                <strong>Missing references</strong>
                <span>{data.documentation_index.missing_references.length ? data.documentation_index.missing_references.join(', ') : 'None'}</span>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-documentation-completeness__evidence-panel">
            <OperationalSectionHeader
              iconPath="/platform/documentation-completeness"
              title="Documentation evidence"
              description="High-level evidence states. External review required means the source cannot be inspected by this backend runtime; it is not treated as a missing file."
            />
            <div className="platform-documentation-completeness__evidence-grid">
              {documentationEvidence.map(([key, value]) => (
                <div key={key} className="platform-documentation-completeness__evidence-item">
                  <span>{humanize(key)}</span>
                  <strong data-tone={evidenceTone(value)}>{evidenceState(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-documentation-completeness__controls-panel">
            <OperationalSectionHeader
              iconPath="/platform/documentation-completeness"
              title="Documentation controls"
              description="Each control shows the repository source, expected path, structural evidence and index-reference result without mutating repository content."
            />
            <div className="platform-documentation-completeness__control-grid">
              {data.documentation_controls.map((control) => (
                <article key={control.code} className="app-panel platform-documentation-completeness__control-card">
                  <div className="platform-documentation-completeness__control-heading">
                    <div>
                      <h3>{control.label}</h3>
                      <code>{control.code}</code>
                    </div>
                    <span className="platform-documentation-completeness__status-badge" data-tone={badgeTone(control.status)}>
                      {displayStatus(control.status)}
                    </span>
                  </div>
                  <p>{control.launch_reason}</p>
                  <div className="platform-documentation-completeness__control-meta">
                    <div><span>Area</span><strong>{humanize(control.area)}</strong></div>
                    <div><span>Source</span><strong>{humanize(control.source_scope)}</strong></div>
                    <div><span>Path</span><code>{control.relative_path}</code></div>
                    <div><span>Repository available</span><strong>{yesNoReview(control.evidence_detail.repository_available)}</strong></div>
                    <div><span>File present</span><strong>{yesNoReview(control.evidence_detail.file_present)}</strong></div>
                    <div><span>File size</span><strong>{formatBytes(control.evidence_detail.file_size_bytes)}</strong></div>
                    <div><span>Structure complete</span><strong>{yesNoReview(control.evidence_detail.structure_complete)}</strong></div>
                    <div>
                      <span>Required markers</span>
                      <strong>{control.evidence_detail.required_markers_present ?? 'External'}/{control.evidence_detail.required_markers_total}</strong>
                    </div>
                    {control.evidence_detail.index_reference_required ? (
                      <div><span>Indexed</span><strong>{yesNoReview(control.evidence_detail.index_reference_present)}</strong></div>
                    ) : null}
                  </div>
                  {control.evidence_detail.missing_structure_markers.length ? (
                    <div className="platform-documentation-completeness__missing-markers">
                      <strong>Missing structure markers</strong>
                      <ul>
                        {control.evidence_detail.missing_structure_markers.map((marker) => <li key={marker}>{marker}</li>)}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <div className="platform-documentation-completeness__two-column">
            <section className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/documentation-completeness"
                title="Required manual acceptance"
                description="Repository evidence is only the precheck. These owner confirmations remain required before relying on the package for launch."
              />
              <ul className="platform-documentation-completeness__list">
                {data.required_manual_acceptance.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>

            <section className="app-panel app-panel--padded platform-documentation-completeness__next-step">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-readiness"
                title="Next operator step"
                description="The service returns the next action based on the current documentation posture."
              />
              <strong>Next best step</strong>
              <span>{data.next_best_step}</span>
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
