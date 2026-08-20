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
import './PlatformCommercialLaunchGoNoGoRegisterPage.css';

type EvidenceScope = {
  mode: string;
  status: string;
  review_limit: number | null;
  evaluated_tenants: number;
  total_tenants: number | null;
};

type GoNoGoRow = {
  code: string;
  source_packet: string;
  source_control: string;
  source_key: string | null;
  domain: string;
  decision_owner: string;
  required_evidence: string;
  evidence_status: string | null;
  source_available: boolean;
  source_posture: string;
  source_summary: Record<string, unknown>;
  source_validation_note: string | null;
  source_error_code: string | null;
  evidence_scope: EvidenceScope | null;
  launch_area_status: string;
  launch_gate: string;
  launch_gate_context_only: boolean;
  acceptance_artifact: string;
  acceptance_artifact_storage: string;
  acceptance_statement: string | null;
  packet_status: string;
  default_decision: string;
  allowed_decisions: string[];
  decision_artifact: string;
  decision_artifact_storage: string;
  required_decision_fields: string[];
  conditional_go_extra_fields: string[];
  no_go_extra_fields: string[];
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
  acceptance_summary: Record<string, unknown>;
  acceptance_persistence: {
    stored_in_application: boolean;
    external_records_observable: boolean;
    interpretation: string;
  } | null;
  certificate_posture: string;
  launch_readiness_posture: string;
  tenant_scope: {
    available: boolean;
    total_tenants: number | null;
    review_limit: number;
    error_code?: string;
  } | null;
  decision_persistence: {
    stored_in_application: boolean;
    external_records_observable: boolean;
    interpretation: string;
  };
  decision_requirements: string[];
  launch_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  register_rows_total: 'Decision rows',
  rows_ready_for_decision: 'Ready for decision',
  rows_requiring_evidence_review: 'Evidence review required',
  rows_blocked: 'Blocked rows',
  decisions_required: 'External decisions required',
  decision_records_persisted_in_application: 'Decisions stored here'
};

const summaryHelpers: Record<string, string> = {
  register_rows_total: 'Owner decision records prepared from Launch Acceptance',
  rows_ready_for_decision: 'Evidence ready for an authorized external decision',
  rows_requiring_evidence_review: 'Evidence still needs review before decision',
  rows_blocked: 'Acceptance evidence is not ready for decision',
  decisions_required: 'Go, no-go or conditional-go decisions required externally',
  decision_records_persisted_in_application: 'Expected to remain zero on this read-only board'
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not available';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (
    normalized.includes('blocked')
    || normalized.includes('no_go')
    || normalized.includes('missing')
    || normalized.includes('unavailable')
    || normalized.includes('failed')
  ) return 'danger';
  if (
    normalized.includes('manual')
    || normalized.includes('required')
    || normalized.includes('review')
    || normalized.includes('conditional')
    || normalized.includes('external')
  ) return 'warn';
  if (normalized.includes('ready') || normalized.includes('clear') || normalized.includes('present')) return 'good';
  if (normalized.includes('context_only') || normalized.includes('not_recorded')) return 'neutral';
  return 'accent';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unknown API error';
}

function displayEvidenceValue(value: unknown) {
  if (value === null || value === undefined) return 'Not available';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return 'Structured evidence';
    }
  }
  return String(value);
}

function getDecisionEvidenceLink(row: GoNoGoRow) {
  const bySourceControl: Record<string, string> = {
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
  return bySourceControl[row.source_control] || '/platform/commercial-launch-acceptance-packet';
}

function getDecisionEvidenceLabel(row: GoNoGoRow) {
  const bySourceControl: Record<string, string> = {
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
  return bySourceControl[row.source_control] || 'Open acceptance packet';
}

export default function PlatformCommercialLaunchGoNoGoRegisterPage() {
  const register = useQuery({
    queryKey: ['platform', 'commercial-launch-go-no-go-register'],
    queryFn: () => platformApiRequest<CommercialLaunchGoNoGoRegister>('/platform/commercial-launch-go-no-go-register'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = register.data;
  const summary = data?.summary || {};
  const detailedSummary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const acceptanceSummary = useMemo(() => Object.entries(data?.acceptance_summary || {}), [data?.acceptance_summary]);
  const initialLoadError = register.isError && !data;
  const refreshError = register.isError && Boolean(data);
  const requestError = readableError(register.error);
  const canOpenSmokeTest = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SESSIONS_READ);

  return (
    <div className="io-operational-page io-workspace-page platform-launch-go-no-go">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-go-no-go-register"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Go/No-Go Register"
        description="Read-only final decision preparation built from the current Launch Acceptance packets. It preserves ready, review-required and blocked evidence states while keeping every actual go/no-go decision outside this application."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 219 — Commercial Launch Go/No-Go Register'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Decision preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External decision records required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-launch-go-no-go__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.rows_ready_for_decision ?? 0}/${summary.register_rows_total ?? 0}` : '—'}
              label="rows ready for external decision"
            />
            {data ? (
              <span className="platform-launch-go-no-go__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-launch-go-no-go__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void register.refetch()}
                disabled={register.isFetching}
              >
                {register.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-launch-go-no-go__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-go-no-go-register"
          title="Decision boundary"
          description="This board prepares accountable decision rows, then stops before any external approval, production execution or customer launch action."
        />
        <div className="platform-launch-go-no-go__boundary-grid">
          <div className="platform-launch-go-no-go__boundary-notice">
            <strong>Decision-preparation only.</strong>
            <span>
              A row marked ready means its current acceptance evidence is ready for an authorized owner to make and record a decision externally. This page cannot observe external decisions, cannot approve launch, and does not start deployment.
            </span>
          </div>
          <div className="platform-launch-go-no-go__supporting-pages">
            <strong>Supporting launch pages</strong>
            <span>These shortcuts stay inside the operator&apos;s current permission boundary. The smoke-test page is only shown when the additional Platform Sessions read permission is available.</span>
            <div className="platform-launch-go-no-go__link-row">
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-acceptance-packet">Launch acceptance</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-certificate">Launch certificate</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-readiness">Launch readiness</Link>
              <Link className="app-button app-button--secondary" to="/platform/tenant-provisioning-hardening">Provisioning</Link>
              <Link className="app-button app-button--secondary" to="/platform/customer-onboarding-checklist">Onboarding</Link>
              <Link className="app-button app-button--secondary" to="/platform/billing-subscription-activation">Billing activation</Link>
              <Link className="app-button app-button--secondary" to="/platform/support-cockpit">Support cockpit</Link>
              <Link className="app-button app-button--secondary" to="/platform/monitoring-readiness">Monitoring</Link>
              <Link className="app-button app-button--secondary" to="/platform/backup-restore-validation">Backup restore</Link>
              <Link className="app-button app-button--secondary" to="/platform/deployment-validation">Deployment validation</Link>
              <Link className="app-button app-button--secondary" to="/platform/documentation-completeness">Documentation</Link>
              <Link className="app-button app-button--secondary" to="/platform/pilot-customer-readiness">Pilot readiness</Link>
              {canOpenSmokeTest ? (
                <Link className="app-button app-button--secondary" to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {register.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Go/No-Go Register…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-launch-go-no-go__feedback" role="alert">
          <strong>Unable to load Commercial Launch Go/No-Go Register.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-launch-go-no-go__retry"
            onClick={() => void register.refetch()}
            disabled={register.isFetching}
          >
            {register.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-launch-go-no-go__feedback platform-launch-go-no-go__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Go/No-Go Register snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-launch-go-no-go__retry"
            onClick={() => void register.refetch()}
            disabled={register.isFetching}
          >
            {register.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Commercial launch go/no-go summary">
            {Object.keys(summaryLabels).map((key) => (
              <OperationalWorkspaceStatCard
                key={key}
                label={summaryLabels[key]}
                value={summary[key] ?? 0}
                helper={summaryHelpers[key]}
                tone={key === 'rows_blocked' && (summary[key] ?? 0) > 0 ? 'danger' : key === 'rows_requiring_evidence_review' && (summary[key] ?? 0) > 0 ? 'warn' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-launch-go-no-go__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-go-no-go-register"
              title="Current decision context"
              description="Snapshot identity, upstream acceptance/certificate posture, tenant evidence scope and the external decision persistence boundary."
            />
            <div className="platform-launch-go-no-go__context-grid">
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Launch Acceptance posture</strong><span>{humanize(data.acceptance_packet_posture)}</span></div>
              <div><strong>Launch Certificate posture</strong><span>{humanize(data.certificate_posture)}</span></div>
              <div><strong>Static Launch Readiness registry</strong><span>{humanize(data.launch_readiness_posture)}</span><small>Context only — current acceptance evidence controls decision readiness.</small></div>
              <div><strong>Tenant evidence population</strong><span>{data.tenant_scope?.total_tenants == null ? 'Unavailable' : `${data.tenant_scope.total_tenants} tenants`}</span></div>
              <div><strong>Tenant review cap</strong><span>{data.tenant_scope?.review_limit ?? 'Not available'}</span></div>
            </div>
            <div className="platform-launch-go-no-go__persistence-note">
              <strong>Final go/no-go decisions are not stored or observable here</strong>
              <span>{data.decision_persistence.interpretation}</span>
            </div>
            {data.acceptance_persistence ? (
              <div className="platform-launch-go-no-go__persistence-note platform-launch-go-no-go__persistence-note--secondary">
                <strong>Launch Acceptance signoffs are external too</strong>
                <span>{data.acceptance_persistence.interpretation}</span>
              </div>
            ) : null}
            {acceptanceSummary.length > 0 ? (
              <details className="platform-launch-go-no-go__details">
                <summary>Launch Acceptance summary carried into this register</summary>
                <div className="platform-launch-go-no-go__summary-grid">
                  {acceptanceSummary.map(([key, value]) => (
                    <div key={key}><span>{humanize(key)}</span><strong>{displayEvidenceValue(value)}</strong></div>
                  ))}
                </div>
              </details>
            ) : null}
            <details className="platform-launch-go-no-go__details">
              <summary>Full register summary</summary>
              <div className="platform-launch-go-no-go__summary-grid">
                {detailedSummary.map(([key, value]) => (
                  <div key={key}><span>{humanize(key)}</span><strong>{value}</strong></div>
                ))}
              </div>
            </details>
          </section>

          <section className="platform-launch-go-no-go__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-go-no-go-register"
              title="Go/no-go decision rows"
              description="Each row carries its current evidence posture into an external decision template without inventing a decision that the application cannot observe."
            />
            {data.go_no_go_register.length > 0 ? (
              <div className="platform-launch-go-no-go__row-grid">
                {data.go_no_go_register.map((row) => {
                  const sourceSummary = Object.entries(row.source_summary || {});
                  return (
                    <article key={row.code} className="app-panel platform-launch-go-no-go__row-card">
                      <div className="platform-launch-go-no-go__row-heading">
                        <div>
                          <h3>{humanize(row.source_control)}</h3>
                          <span>{humanize(row.domain)} · owner: {humanize(row.decision_owner)}</span>
                        </div>
                        <span className="platform-launch-go-no-go__status-badge" data-tone={badgeTone(row.register_status)}>{humanize(row.register_status)}</span>
                      </div>

                      <div className="platform-launch-go-no-go__status-grid">
                        <div><strong>Current acceptance packet</strong><span className="platform-launch-go-no-go__status-badge" data-tone={badgeTone(row.packet_status)}>{humanize(row.packet_status)}</span></div>
                        <div><strong>Current certificate evidence</strong><span className="platform-launch-go-no-go__status-badge" data-tone={badgeTone(row.evidence_status)}>{humanize(row.evidence_status)}</span></div>
                        <div><strong>Current upstream posture</strong><span>{humanize(row.source_posture)}</span></div>
                        <div><strong>Evidence source</strong><span>{row.source_available ? 'Available' : 'Unavailable'}</span></div>
                        <div><strong>Evidence scope</strong><span>{row.evidence_scope ? humanize(row.evidence_scope.status) : 'Not scope-limited'}</span>{row.evidence_scope ? <small>Evaluated {row.evidence_scope.evaluated_tenants}{row.evidence_scope.total_tenants == null ? '' : ` of ${row.evidence_scope.total_tenants}`} tenants</small> : null}</div>
                        <div><strong>Static registry gate</strong><span>{humanize(row.launch_gate)}</span><small>{row.launch_gate_context_only ? 'Context only' : 'Current control'}</small></div>
                      </div>

                      {row.source_error_code ? <div className="platform-launch-go-no-go__source-error"><strong>Evidence source error</strong><span>{row.source_error_code}</span></div> : null}
                      {row.source_validation_note ? <div className="platform-launch-go-no-go__source-note"><strong>Source validation note</strong><span>{row.source_validation_note}</span></div> : null}

                      <div className="platform-launch-go-no-go__evidence-box">
                        <strong>Current source evidence summary</strong>
                        {sourceSummary.length > 0 ? (
                          <div className="platform-launch-go-no-go__source-summary">
                            {sourceSummary.map(([key, value]) => <div key={key}><span>{humanize(key)}</span><strong>{displayEvidenceValue(value)}</strong></div>)}
                          </div>
                        ) : <span>No current source summary was returned for this decision row.</span>}
                      </div>

                      <div className="platform-launch-go-no-go__evidence-box">
                        <strong>Required evidence endpoint</strong>
                        <span>{row.required_evidence}</span>
                        <div className="platform-launch-go-no-go__row-actions">
                          <Link className="app-button app-button--secondary" to={getDecisionEvidenceLink(row)}>{getDecisionEvidenceLabel(row)}</Link>
                        </div>
                      </div>

                      <div className="platform-launch-go-no-go__artifact-grid">
                        <div>
                          <strong>External acceptance artifact</strong>
                          <span>{row.acceptance_artifact}</span>
                          {row.acceptance_statement ? <p>{row.acceptance_statement}</p> : null}
                          <small>Storage: {humanize(row.acceptance_artifact_storage)}</small>
                        </div>
                        <div>
                          <strong>External go/no-go decision artifact</strong>
                          <span>{row.decision_artifact}</span>
                          <small>Storage: {humanize(row.decision_artifact_storage)}</small>
                          <small>The default template state is not proof that no external decision exists.</small>
                        </div>
                      </div>

                      <div className="platform-launch-go-no-go__decision-state">
                        <strong>Decision template state</strong>
                        <span className="platform-launch-go-no-go__status-badge" data-tone={badgeTone(row.default_decision)}>{humanize(row.default_decision)}</span>
                      </div>

                      <div className="platform-launch-go-no-go__field-groups">
                        <div><strong>Allowed decisions</strong><div>{row.allowed_decisions.map((item) => <span key={item}>{humanize(item)}</span>)}</div></div>
                        <div><strong>Required decision fields</strong><div>{row.required_decision_fields.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                        <div><strong>Conditional-go extra fields</strong><div>{row.conditional_go_extra_fields.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                        <div><strong>No-go extra fields</strong><div>{row.no_go_extra_fields.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <section className="app-panel app-panel--padded platform-launch-go-no-go__empty-state">
                <strong>No go/no-go decision rows are available.</strong>
                <span>Review Launch Acceptance and Launch Certificate inputs before requesting any external launch decision.</span>
              </section>
            )}
          </section>

          <section className="platform-launch-go-no-go__two-column">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-go-no-go-register"
                title="Decision requirements"
                description="Requirements that must remain true before an external go/no-go record can be relied upon."
              />
              <ul className="platform-launch-go-no-go__list">{data.decision_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-go-no-go-register"
                title="Launch limitations"
                description="Known limitations inherited from the upstream Launch Acceptance and certificate evidence."
              />
              <ul className="platform-launch-go-no-go__list">{data.launch_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-launch-go-no-go__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>
          <section className="app-panel app-panel--padded platform-launch-go-no-go__validation-note">
            <strong>Validation boundary</strong>
            <span>{data.validation_note}</span>
          </section>
        </>
      ) : null}
    </div>
  );
}
