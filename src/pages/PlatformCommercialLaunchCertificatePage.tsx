import { useMemo } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformCommercialLaunchCertificatePage.css';

type EvidenceScope = {
  mode: string;
  status: string;
  review_limit: number | null;
  evaluated_tenants: number;
  total_tenants: number | null;
};

type CertificateControl = {
  code: string;
  domain: string;
  required_evidence: string;
  acceptance_owner: string;
  acceptance_rule: string;
  source_key: string;
  source_available: boolean;
  source_posture: string;
  source_summary: Record<string, unknown>;
  source_validation_note: string | null;
  source_error_code: string | null;
  evidence_scope: EvidenceScope;
  launch_area_code: string | null;
  launch_area_status: string;
  launch_gate: string;
  evidence_status: string;
  manual_acceptance_status: string;
};

type TenantScope = {
  available: boolean;
  total_tenants: number | null;
  review_limit: number;
  error_code?: string;
};

type CommercialLaunchCertificate = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  certificate_controls: CertificateControl[];
  tenant_scope: TenantScope;
  launch_readiness_posture: string;
  launch_readiness_registry_note: string;
  commercial_readiness_closure_posture: string;
  required_manual_acceptance: string[];
  certificate_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

type SummaryItem = {
  key: string;
  label: string;
  helper: string;
  tone?: 'default' | 'neutral' | 'good' | 'warn' | 'danger';
};

const summaryItems: SummaryItem[] = [
  { key: 'controls_total', label: 'Controls reviewed', helper: 'Owner/evidence domains in this certificate precheck.' },
  { key: 'evidence_surfaces_ready', label: 'Evidence ready', helper: 'Upstream evidence surfaces clear for manual owner review.', tone: 'good' },
  { key: 'evidence_reviews_required', label: 'Evidence review', helper: 'Sources or scope still require explicit review.', tone: 'warn' },
  { key: 'evidence_surfaces_blocked', label: 'Evidence blocked', helper: 'Known upstream evidence blockers.', tone: 'danger' },
  { key: 'evidence_sources_unavailable', label: 'Sources unavailable', helper: 'Evidence sources that could not be loaded.', tone: 'danger' },
  { key: 'scope_reviews_required', label: 'Scope review', helper: 'Tenant evidence windows requiring broader review.', tone: 'warn' },
  { key: 'manual_acceptances_required', label: 'Manual acceptances', helper: 'Owner decisions that remain intentionally outside this board.', tone: 'warn' },
  { key: 'certificate_issued', label: 'Certificates issued', helper: 'This read-only board never issues a production certificate.', tone: 'neutral' }
];

const summaryLabels: Record<string, string> = {
  controls_total: 'Controls reviewed',
  evidence_surfaces_ready: 'Evidence surfaces ready',
  evidence_reviews_required: 'Evidence reviews required',
  evidence_surfaces_blocked: 'Evidence surfaces blocked',
  evidence_sources_unavailable: 'Evidence sources unavailable',
  scope_reviews_required: 'Scope reviews required',
  manual_acceptances_required: 'Manual acceptances required',
  certificate_issued: 'Certificates issued'
};

const statusLabels: Record<string, string> = {
  commercial_launch_certificate_blocked_by_evidence: 'Blocked by evidence',
  commercial_launch_certificate_ready_for_manual_evidence_review: 'Ready for manual evidence review',
  commercial_launch_certificate_ready_for_manual_acceptance: 'Ready for manual acceptance',
  evidence_surface_ready: 'Evidence surface ready',
  evidence_review_required: 'Evidence review required',
  evidence_surface_blocked: 'Evidence surface blocked',
  evidence_source_unavailable: 'Evidence source unavailable',
  full_population: 'Full tenant population',
  full_population_inferred: 'Full tenant population inferred',
  scope_limit_review_required: 'Scope review required',
  not_limited_by_certificate: 'Not limited by certificate',
  manual_acceptance_required: 'Manual acceptance required'
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
    || normalized.includes('unavailable')
    || normalized.includes('incomplete')
    || normalized.includes('not_launchable')
    || normalized.includes('failed')
  ) return 'danger';
  if (
    normalized.includes('manual')
    || normalized.includes('required')
    || normalized.includes('review')
    || normalized.includes('external')
    || normalized.includes('partial')
    || normalized.includes('scope_limit')
  ) return 'warn';
  if (normalized.includes('no_tenants') || normalized.includes('not_limited')) return 'neutral';
  if (
    normalized.includes('ready')
    || normalized.includes('clear')
    || normalized.includes('present')
    || normalized.includes('full_population')
  ) return 'good';
  return 'accent';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'The platform request failed.';
}

function getControlReviewLink(control: CertificateControl) {
  const byCode: Record<string, string> = {
    tenant_provisioning_accepted: '/platform/tenant-provisioning-hardening',
    customer_onboarding_accepted: '/platform/customer-onboarding-checklist',
    billing_subscription_accepted: '/platform/billing-subscription-activation',
    support_operations_accepted: '/platform/support-cockpit',
    production_monitoring_accepted: '/platform/monitoring-readiness',
    backup_restore_accepted: '/platform/backup-restore-validation',
    deployment_validation_accepted: '/platform/deployment-validation',
    documentation_completeness_accepted: '/platform/documentation-completeness',
    pilot_customer_readiness_accepted: '/platform/pilot-customer-readiness',
    commercial_readiness_closure_accepted: '/platform/commercial-readiness-verification-program'
  };
  return byCode[control.code] || '/platform/commercial-launch-readiness';
}

function getControlReviewLabel(control: CertificateControl) {
  const byCode: Record<string, string> = {
    tenant_provisioning_accepted: 'Open provisioning evidence',
    customer_onboarding_accepted: 'Open onboarding evidence',
    billing_subscription_accepted: 'Open billing activation',
    support_operations_accepted: 'Open support cockpit',
    production_monitoring_accepted: 'Open monitoring readiness',
    backup_restore_accepted: 'Open backup restore',
    deployment_validation_accepted: 'Open deployment validation',
    documentation_completeness_accepted: 'Open documentation completeness',
    pilot_customer_readiness_accepted: 'Open pilot readiness',
    commercial_readiness_closure_accepted: 'Open readiness verification'
  };
  return byCode[control.code] || 'Open readiness page';
}

export default function PlatformCommercialLaunchCertificatePage() {
  const certificate = useQuery({
    queryKey: ['platform', 'commercial-launch-certificate'],
    queryFn: () => platformApiRequest<CommercialLaunchCertificate>('/platform/commercial-launch-certificate'),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const data = certificate.data;
  const summary = data?.summary || {};
  const detailedSummary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = certificate.isError && !data;
  const refreshError = certificate.isError && Boolean(data);
  const errorMessage = readableError(certificate.error);

  return (
    <div className="io-operational-page io-workspace-page platform-launch-certificate">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-certificate"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Certificate"
        description="Read-only final launch-certificate precheck that joins the current provisioning, onboarding, billing, support, monitoring, backup/restore, deployment, documentation, pilot and commercial-closure evidence postures without pretending that owner signoff or an external certificate already exists."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 217 — Commercial Launch Certificate Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Internal precheck only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Manual owner acceptance required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-launch-certificate__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.evidence_surfaces_ready ?? 0}/${summary.controls_total ?? 0}` : '—'}
              label="evidence surfaces ready for owner review"
            />
            {data ? (
              <span className="platform-launch-certificate__status-badge" data-tone={badgeTone(data.posture)}>
                {displayStatus(data.posture)}
              </span>
            ) : null}
            <div className="platform-launch-certificate__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void certificate.refetch()}
                disabled={certificate.isFetching}
              >
                {certificate.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-launch-certificate__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-certificate"
          title="Certificate boundary"
          description="The board combines current internal evidence postures, then stops before the human launch decision."
        />
        <div className="platform-launch-certificate__boundary-grid">
          <div className="platform-launch-certificate__boundary-notice">
            <strong>Internal precheck only.</strong>
            <span>
              A green evidence source means its current technical/readiness posture is clear enough to enter manual owner acceptance. It does not mean an owner signed, a customer accepted launch, a live restore succeeded, payment settlement was proven or a production certificate was issued.
            </span>
          </div>
          <div className="platform-launch-certificate__supporting-pages">
            <strong>Supporting readiness pages</strong>
            <span>This page already requires the combined read permissions needed by these underlying evidence surfaces.</span>
            <div className="platform-launch-certificate__link-row">
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-readiness">Launch readiness</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-readiness-verification-program">Readiness verification</Link>
              <Link className="app-button app-button--secondary" to="/platform/tenant-provisioning-hardening">Provisioning</Link>
              <Link className="app-button app-button--secondary" to="/platform/customer-onboarding-checklist">Onboarding</Link>
              <Link className="app-button app-button--secondary" to="/platform/billing-subscription-activation">Billing activation</Link>
              <Link className="app-button app-button--secondary" to="/platform/support-cockpit">Support cockpit</Link>
              <Link className="app-button app-button--secondary" to="/platform/monitoring-readiness">Monitoring</Link>
              <Link className="app-button app-button--secondary" to="/platform/backup-restore-validation">Backup restore</Link>
              <Link className="app-button app-button--secondary" to="/platform/deployment-validation">Deployment validation</Link>
              <Link className="app-button app-button--secondary" to="/platform/documentation-completeness">Documentation</Link>
              <Link className="app-button app-button--secondary" to="/platform/pilot-customer-readiness">Pilot readiness</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-acceptance-packet">Launch acceptance</Link>
            </div>
          </div>
        </div>
      </section>

      {certificate.isLoading ? <section className="app-panel app-panel--padded">Loading commercial launch certificate…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-launch-certificate__feedback" role="alert">
          <strong>Unable to load Commercial Launch Certificate.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-launch-certificate__retry"
            onClick={() => void certificate.refetch()}
            disabled={certificate.isFetching}
          >
            {certificate.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-launch-certificate__feedback platform-launch-certificate__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Certificate snapshot. {errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-launch-certificate__retry"
            onClick={() => void certificate.refetch()}
            disabled={certificate.isFetching}
          >
            {certificate.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Commercial launch certificate summary">
            {summaryItems.map((item) => (
              <OperationalWorkspaceStatCard
                key={item.key}
                label={item.label}
                value={summary[item.key] ?? 0}
                helper={item.helper}
                tone={item.tone}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-launch-certificate__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-certificate"
              title="Certificate posture inputs"
              description="Snapshot identity, tenant evidence scope and the two higher-level readiness inputs used for context. Current evidence decisions come from the real upstream source postures, not the static registry gate labels."
            />
            <div className="platform-launch-certificate__program-grid">
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Tenant population</strong><span>{data.tenant_scope.total_tenants ?? 'Unavailable'}</span></div>
              <div><strong>Tenant review cap</strong><span>{data.tenant_scope.review_limit}</span></div>
              <div><strong>Tenant scope query</strong><span>{data.tenant_scope.available ? 'Available' : displayStatus(data.tenant_scope.error_code || 'unavailable')}</span></div>
              <div><strong>Launch readiness registry</strong><span>{displayStatus(data.launch_readiness_posture)}</span></div>
              <div><strong>Commercial readiness closure</strong><span>{displayStatus(data.commercial_readiness_closure_posture)}</span></div>
            </div>
            <div className="platform-launch-certificate__registry-note">
              <strong>Static registry is context only</strong>
              <span>{data.launch_readiness_registry_note}</span>
            </div>
            <details className="platform-launch-certificate__details">
              <summary>Detailed certificate counters</summary>
              <div className="platform-launch-certificate__summary-grid">
                {detailedSummary.map(([key, value]) => (
                  <div key={key}>
                    <span>{displaySummaryKey(key)}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </details>
            <details className="platform-launch-certificate__details">
              <summary>Validation note</summary>
              <p>{data.validation_note}</p>
            </details>
          </section>

          <section className="platform-launch-certificate__controls-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-certificate"
              title="Certificate controls"
              description="Each control shows its current upstream posture, evidence scope, static registry context and the manual acceptance that still remains outside this read-only board."
            />
            <div className="platform-launch-certificate__control-grid">
              {data.certificate_controls.map((control) => (
                <article key={control.code} className="app-panel platform-launch-certificate__control-card">
                  <div className="platform-launch-certificate__control-heading">
                    <div>
                      <h3>{humanize(control.code)}</h3>
                      <span>{humanize(control.domain)} · owner: {humanize(control.acceptance_owner)}</span>
                    </div>
                    <span className="platform-launch-certificate__status-badge" data-tone={badgeTone(control.evidence_status)}>
                      {displayStatus(control.evidence_status)}
                    </span>
                  </div>

                  <p>{control.acceptance_rule}</p>

                  <div className="platform-launch-certificate__control-meta-grid">
                    <div>
                      <span>Current upstream posture</span>
                      <strong data-tone={badgeTone(control.source_posture)}>{displayStatus(control.source_posture)}</strong>
                    </div>
                    <div>
                      <span>Manual acceptance</span>
                      <strong data-tone={badgeTone(control.manual_acceptance_status)}>{displayStatus(control.manual_acceptance_status)}</strong>
                    </div>
                    <div>
                      <span>Static registry gate (context only)</span>
                      <strong data-tone="neutral">{displayStatus(control.launch_gate)}</strong>
                    </div>
                    <div>
                      <span>Launch area status</span>
                      <strong data-tone="neutral">{displayStatus(control.launch_area_status)}</strong>
                    </div>
                  </div>

                  {control.evidence_scope.mode === 'tenant_population' ? (
                    <div className="platform-launch-certificate__scope-box">
                      <div>
                        <span>Tenant evidence scope</span>
                        <strong data-tone={badgeTone(control.evidence_scope.status)}>{displayStatus(control.evidence_scope.status)}</strong>
                      </div>
                      <span>
                        Evaluated {control.evidence_scope.evaluated_tenants}
                        {control.evidence_scope.total_tenants !== null ? ` of ${control.evidence_scope.total_tenants}` : ''}
                        {control.evidence_scope.review_limit ? ` · cap ${control.evidence_scope.review_limit}` : ''}
                      </span>
                    </div>
                  ) : null}

                  <div className="platform-launch-certificate__evidence-path">
                    <span>Required evidence surface</span>
                    <code>{control.required_evidence}</code>
                  </div>

                  {control.source_error_code ? (
                    <div className="platform-launch-certificate__source-warning" role="status">
                      <strong>Evidence source error</strong>
                      <span>{humanize(control.source_error_code)}</span>
                    </div>
                  ) : null}

                  {control.source_validation_note ? (
                    <details className="platform-launch-certificate__details platform-launch-certificate__details--control">
                      <summary>Source validation note</summary>
                      <p>{control.source_validation_note}</p>
                    </details>
                  ) : null}

                  <div className="platform-launch-certificate__control-actions">
                    <Link className="app-button app-button--secondary" to={getControlReviewLink(control)}>
                      {getControlReviewLabel(control)}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="platform-launch-certificate__decision-grid">
            <div className="app-panel app-panel--padded platform-launch-certificate__decision-panel">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-certificate"
                title="Required manual acceptance"
                description="These decisions are deliberately not persisted or inferred by this board."
              />
              <ul className="platform-launch-certificate__list">
                {data.required_manual_acceptance.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div className="app-panel app-panel--padded platform-launch-certificate__decision-panel">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-certificate"
                title="Certificate limitations"
                description="What this evidence precheck cannot prove on its own."
              />
              <ul className="platform-launch-certificate__list">
                {data.certificate_limitations.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-launch-certificate__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>
        </>
      ) : null}
    </div>
  );
}
