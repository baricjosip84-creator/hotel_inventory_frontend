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
import './PlatformDeploymentValidationPage.css';

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

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

type SupportLink = {
  label: string;
  to: string;
  allowed: boolean;
};

const summaryLabels: Record<string, string> = {
  controls_total: 'Controls reviewed',
  controls_with_evidence: 'Evidence present',
  deployment_blockers: 'Deployment blockers',
  review_required: 'Review required',
  frontend_ci_evidence_required: 'Frontend CI evidence',
  runtime_gate_artifact_review_required: 'Runtime artifact review'
};

const statusLabels: Record<string, string> = {
  deployment_validation_blocked: 'Deployment validation blocked',
  deployment_precheck_ready_for_external_evidence: 'Precheck ready for external evidence',
  deployment_validation_ready: 'Deployment validation ready',
  evidence_present: 'Evidence present',
  deployment_evidence_missing: 'Deployment evidence missing',
  runtime_configuration_missing: 'Runtime configuration missing',
  runtime_deployment_identity_missing: 'Runtime deployment identity missing',
  frontend_ci_evidence_required: 'Frontend CI evidence required',
  runtime_gate_artifact_review_required: 'Runtime gate artifact review required',
  runtime_environment_review_required: 'Runtime environment review required',
  runtime_configuration_review_required: 'Runtime configuration review required'
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
  if (normalized.includes('blocked') || normalized.includes('missing') || normalized.includes('unsafe')) return 'danger';
  if (
    normalized.includes('review')
    || normalized.includes('required')
    || normalized.includes('external')
    || normalized.includes('waived')
  ) return 'warn';
  if (normalized.includes('ready') || normalized.includes('present') || normalized.includes('safe')) return 'good';
  if (normalized.includes('not_available')) return 'neutral';
  return 'accent';
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return 'Not available on this surface';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString();
  }
  return String(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
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
  const summary = data?.summary || {};
  const detailSummary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const platformEvidence = useMemo(() => Object.entries(data?.platform_evidence || {}), [data?.platform_evidence]);
  const refreshError = validation.isError && Boolean(data);
  const initialLoadError = validation.isError && !data;
  const errorMessage = readableError(validation.error);

  const supportingPages: SupportLink[] = [
    {
      label: 'Monitoring readiness',
      to: '/platform/production-monitoring-readiness',
      allowed: [
        PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ,
        PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ,
        PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ
      ].every((permission) => hasPlatformPermission(permission))
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
      label: 'Releases',
      to: '/platform/releases',
      allowed: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ)
    },
    {
      label: 'Change management',
      to: '/platform/change-management',
      allowed: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_CHANGES_READ)
    },
    {
      label: 'Deployment runbooks',
      to: '/platform/runbooks?category=deployment',
      allowed: hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_RUNBOOKS_READ)
    },
    {
      label: 'System health',
      to: '/platform/system-health',
      allowed: hasPlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ)
    }
  ];
  const accessibleSupportingPages = supportingPages.filter((item) => item.allowed);
  const hiddenSupportingPageCount = supportingPages.length - accessibleSupportingPages.length;

  return (
    <div className="io-operational-page io-workspace-page platform-deployment-validation">
      <OperationalWorkspaceHero
        iconPath="/platform/deployment-validation"
        eyebrow="Platform Commercial Launch Readiness"
        title="Deployment Validation"
        description="Read-only technical deployment precheck for checked-in backend foundations, current runtime configuration, and the handoff to the frontend-owned automatic Deployment Readiness Gate. This page does not deploy services or certify a production release by itself."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 214 — Deployment Validation Gate'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Operator precheck only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Live gate evidence stays external</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-deployment-validation__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.controls_with_evidence ?? 0}/${summary.controls_total ?? 0}` : '—'}
              label="controls with evidence on this surface"
            />
            {data ? (
              <span className="platform-deployment-validation__status-badge" data-tone={badgeTone(data.posture)}>
                {displayStatus(data.posture)}
              </span>
            ) : null}
            <div className="platform-deployment-validation__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void validation.refetch()}
                disabled={validation.isFetching}
              >
                {validation.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel="Deployment validation key metrics">
        <OperationalWorkspaceStatCard
          iconPath="/platform/deployment-validation"
          label="Controls reviewed"
          value={summary.controls_total ?? 0}
          helper="Static, runtime, frontend-repository and external-evidence controls"
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/deployment-validation"
          label="Evidence present"
          value={summary.controls_with_evidence ?? 0}
          helper="Controls proven directly by this surface"
          tone="good"
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/system-health"
          label="Deployment blockers"
          value={summary.deployment_blockers ?? 0}
          helper="Missing foundations or unsafe production runtime configuration"
          tone={(summary.deployment_blockers ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/deployment-validation"
          label="Review required"
          value={summary.review_required ?? 0}
          helper="Non-blocking runtime or external evidence still needs operator review"
          tone={(summary.review_required ?? 0) > 0 ? 'warn' : 'default'}
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/deployment-validation"
          label="Frontend CI evidence"
          value={summary.frontend_ci_evidence_required ?? 0}
          helper="Frontend source evidence must be confirmed by the frontend CI repository"
          tone={(summary.frontend_ci_evidence_required ?? 0) > 0 ? 'warn' : 'default'}
          loading={!data && validation.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/deployment-validation"
          label="Artifact review"
          value={summary.runtime_gate_artifact_review_required ?? 0}
          helper="Retained Deployment Readiness Gate artifact still needs external review"
          tone={(summary.runtime_gate_artifact_review_required ?? 0) > 0 ? 'warn' : 'default'}
          loading={!data && validation.isLoading}
        />
      </OperationalWorkspaceStats>

      <section className="app-panel app-panel--padded platform-deployment-validation__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/deployment-validation"
          title="Validation boundary"
          description="The application can prove backend source/runtime foundations, but live post-release evidence remains owned by the frontend GitHub Actions Deployment Readiness Gate."
        />
        <div className="platform-deployment-validation__boundary-grid">
          <div className="platform-deployment-validation__external-notice">
            <strong>Live evidence is external.</strong>
            <span>
              This application does not query or persist the Deployment Readiness Gate HTML/JSON artifact. An amber external-evidence state therefore means operator review is still required; it does not prove the deployment failed.
            </span>
          </div>
          <div className="platform-deployment-validation__supporting-pages">
            <strong>Supporting pages</strong>
            <div className="platform-deployment-validation__link-row">
              {accessibleSupportingPages.map((item) => (
                <Link key={item.to} className="app-button app-button--secondary" to={item.to}>{item.label}</Link>
              ))}
            </div>
            {hiddenSupportingPageCount > 0 ? (
              <span className="platform-deployment-validation__permission-note">
                {hiddenSupportingPageCount} supporting {hiddenSupportingPageCount === 1 ? 'page is' : 'pages are'} hidden because your platform role does not include the required read permission.
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {validation.isLoading && !data ? (
        <section className="app-panel app-panel--padded platform-deployment-validation__feedback">
          <strong>Loading deployment validation…</strong>
          <span>Reviewing backend source controls, runtime posture and deployment-readiness handoff evidence.</span>
        </section>
      ) : null}

      {initialLoadError ? (
        <section className="app-panel app-panel--padded platform-deployment-validation__feedback platform-deployment-validation__feedback--error">
          <strong>Unable to load deployment validation.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-deployment-validation__retry"
            onClick={() => void validation.refetch()}
            disabled={validation.isFetching}
          >
            {validation.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-deployment-validation__feedback platform-deployment-validation__feedback--warning">
          <strong>Latest refresh failed.</strong>
          <span>Showing the last successful deployment-validation snapshot. Refresh error: {errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-deployment-validation__retry"
            onClick={() => void validation.refetch()}
            disabled={validation.isFetching}
          >
            {validation.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="app-panel app-panel--padded platform-deployment-validation__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/deployment-validation"
              title="Validation program"
              description="Snapshot identity, summary detail and the precise boundary of what this read-only technical precheck can prove."
            />
            <div className="platform-deployment-validation__program-grid">
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Current posture</strong><span>{displayStatus(data.posture)}</span></div>
            </div>
            <details className="platform-deployment-validation__validation-note">
              <summary>Read exact validation boundary</summary>
              <p>{data.validation_note}</p>
            </details>
          </section>

          <section className="app-panel app-panel--padded platform-deployment-validation__summary-panel">
            <OperationalSectionHeader
              iconPath="/platform/deployment-validation"
              title="Detailed summary"
              description="Complete counters returned by the validation service, including blocking and external-review requirements."
            />
            <div className="platform-deployment-validation__summary-grid">
              {detailSummary.map(([key, value]) => (
                <div key={key} className="platform-deployment-validation__summary-item">
                  <span>{displaySummaryKey(key)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-deployment-validation__evidence-panel">
            <OperationalSectionHeader
              iconPath="/platform/system-health"
              title="Platform evidence"
              description="Status and counts only. Configured CORS origins, tokens, secrets and external artifact contents are deliberately not returned."
            />
            <div className="platform-deployment-validation__evidence-grid">
              {platformEvidence.map(([key, value]) => (
                <div key={key} className="platform-deployment-validation__evidence-item">
                  <span>{humanize(key)}</span>
                  <strong>{formatValue(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-deployment-validation__controls-panel">
            <OperationalSectionHeader
              iconPath="/platform/deployment-validation"
              title="Deployment validation controls"
              description="Each control shows the evidence source, current evidence value and operator-facing launch reason without mutating deployment state."
            />
            <div className="platform-deployment-validation__control-grid">
              {data.deployment_validation_controls.map((control) => (
                <article key={control.code} className="app-panel platform-deployment-validation__control-card">
                  <div className="platform-deployment-validation__control-heading">
                    <div>
                      <h3>{control.label}</h3>
                      <code>{control.code}</code>
                    </div>
                    <span className="platform-deployment-validation__status-badge" data-tone={badgeTone(control.status)}>
                      {displayStatus(control.status)}
                    </span>
                  </div>
                  <p>{control.launch_reason}</p>
                  <div className="platform-deployment-validation__control-meta">
                    <div><span>Evidence scope</span><strong>{humanize(control.evidence_scope)}</strong></div>
                    <div><span>Evidence key</span><code>{control.evidence_key}</code></div>
                    <div><span>Evidence value</span><strong>{control.evidence_value}</strong></div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="platform-deployment-validation__two-column">
            <section className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/deployment-validation"
                title="Automatic runtime gate coverage"
                description="Repeatable checks already owned by the frontend Deployment Readiness Gate."
              />
              <ul className="platform-deployment-validation__list">
                {data.automatic_runtime_gate_coverage.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>

            <section className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/deployment-validation"
                title="Operator follow-up"
                description="The automatic workflow is the normal release path. Manual execution is a fallback, not an unconditional requirement."
              />
              <ul className="platform-deployment-validation__list">
                {data.operator_follow_up.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>
          </div>

          <section className="app-panel app-panel--padded platform-deployment-validation__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>
        </>
      ) : null}
    </div>
  );
}
