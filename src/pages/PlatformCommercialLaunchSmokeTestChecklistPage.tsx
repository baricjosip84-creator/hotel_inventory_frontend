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
import './PlatformCommercialLaunchSmokeTestChecklistPage.css';

type SmokeTestRow = {
  code: string;
  domain: string;
  owner: string;
  required_evidence: string;
  failure_policy: string;
  source_register_posture: string;
  source_acceptance_packet_posture: string;
  manual_precondition: string;
  required_result_fields: string[];
  allowed_results: string[];
  default_result: string;
  result_artifact: string;
  result_artifact_storage: string;
  smoke_test_status: string;
};

type ExternalPersistence = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type CommercialLaunchSmokeTestChecklist = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  smoke_tests: SmokeTestRow[];
  go_no_go_register_posture: string;
  go_no_go_register_summary: Record<string, number>;
  go_no_go_decision_persistence: ExternalPersistence | null;
  acceptance_packet_posture: string;
  certificate_posture: string;
  result_persistence: ExternalPersistence;
  execution_rules: string[];
  launch_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  smoke_tests_total: 'Smoke-test rows',
  smoke_tests_requiring_evidence_review: 'Evidence review required',
  smoke_tests_awaiting_external_go_no_go_confirmation: 'Awaiting Go/No-Go confirmation',
  smoke_tests_waiting_for_decisions: 'Waiting for decisions',
  smoke_tests_blocked: 'Blocked rows',
  result_records_persisted_in_application: 'Results stored here'
};

const summaryHelpers: Record<string, string> = {
  smoke_tests_total: 'Manual launch-environment checks prepared by this board',
  smoke_tests_requiring_evidence_review: 'Upstream evidence still needs review before final decisions',
  smoke_tests_awaiting_external_go_no_go_confirmation: 'Rows waiting for externally recorded Go/No-Go decisions',
  smoke_tests_waiting_for_decisions: 'Combined review and external-decision prerequisite count',
  smoke_tests_blocked: 'Rows that cannot proceed until upstream launch evidence is ready',
  result_records_persisted_in_application: 'Expected to remain zero on this read-only preparation surface'
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
    || normalized.includes('fail')
    || normalized.includes('missing')
    || normalized.includes('unavailable')
  ) return 'danger';
  if (
    normalized.includes('review')
    || normalized.includes('waiting')
    || normalized.includes('required')
    || normalized.includes('manual')
    || normalized.includes('conditional')
    || normalized.includes('external')
  ) return 'warn';
  if (normalized.includes('ready') || normalized.includes('clear') || normalized.includes('pass')) return 'good';
  if (normalized.includes('not run') || normalized.includes('not_run') || normalized.includes('not persisted')) return 'neutral';
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

function getSmokeTestEvidenceLink(row: SmokeTestRow) {
  const byCode: Record<string, string> = {
    operator_login_and_session_smoke_test: '/platform/sessions',
    pilot_tenant_access_smoke_test: '/platform/pilot-customer-readiness',
    product_stock_and_report_smoke_test: '/platform/customer-onboarding-checklist',
    shipment_receiving_smoke_test: '/platform/customer-onboarding-checklist',
    platform_support_cockpit_smoke_test: '/platform/support-cockpit',
    billing_subscription_visibility_smoke_test: '/platform/billing-subscription-activation',
    monitoring_incident_smoke_test: '/platform/monitoring-readiness',
    backup_restore_evidence_smoke_test: '/platform/backup-restore-validation',
    documentation_support_handover_smoke_test: '/platform/documentation-completeness',
    rollback_decision_path_smoke_test: '/platform/deployment-validation'
  };
  return byCode[row.code] || '/platform/commercial-launch-go-no-go-register';
}

function getSmokeTestEvidenceLabel(row: SmokeTestRow) {
  const byDomain: Record<string, string> = {
    authentication: 'Open platform sessions',
    tenant_access: 'Open pilot readiness',
    inventory_core: 'Open onboarding evidence',
    receiving_workflow: 'Open onboarding evidence',
    platform_operations: 'Open support cockpit',
    billing_visibility: 'Open billing activation',
    monitoring_incidents: 'Open monitoring readiness',
    backup_recovery: 'Open backup restore',
    documentation_support: 'Open documentation completeness',
    rollback_readiness: 'Open deployment validation'
  };
  return byDomain[row.domain] || 'Open Go/No-Go register';
}

export default function PlatformCommercialLaunchSmokeTestChecklistPage() {
  const checklist = useQuery({
    queryKey: ['platform', 'commercial-launch-smoke-test-checklist'],
    queryFn: () => platformApiRequest<CommercialLaunchSmokeTestChecklist>('/platform/commercial-launch-smoke-test-checklist'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = checklist.data;
  const summary = data?.summary || {};
  const registerSummary = useMemo(() => Object.entries(data?.go_no_go_register_summary || {}), [data?.go_no_go_register_summary]);
  const initialLoadError = checklist.isError && !data;
  const refreshError = checklist.isError && Boolean(data);
  const requestError = readableError(checklist.error);

  return (
    <div className="io-operational-page io-workspace-page platform-launch-smoke-test">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-smoke-test-checklist"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Smoke Test Checklist"
        description="Read-only preparation for the manual checks that must be executed in the exact launch environment after the external Go/No-Go decision set has been confirmed. This page defines evidence, owners, failure policy and external result fields without claiming that a smoke test has run."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 220 — Commercial Launch Smoke Test Checklist'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Execution preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External result records required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-launch-smoke-test__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? summary.smoke_tests_total ?? data.smoke_tests.length : '—'}
              label="manual smoke-test rows"
            />
            {data ? (
              <span className="platform-launch-smoke-test__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-launch-smoke-test__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void checklist.refetch()}
                disabled={checklist.isFetching}
              >
                {checklist.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-launch-smoke-test__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-smoke-test-checklist"
          title="Execution boundary"
          description="The checklist prepares live launch checks, but the application neither performs those checks nor observes their external result records."
        />
        <div className="platform-launch-smoke-test__boundary-grid">
          <div className="platform-launch-smoke-test__boundary-notice">
            <strong>Execution-preparation only.</strong>
            <span>
              Before any row is executed, confirm the externally recorded Go/No-Go decision set and its evidence reference. A prepared row is not a passing result, and a zero persisted-result count does not prove that no external smoke test has been run.
            </span>
          </div>
          <div className="platform-launch-smoke-test__supporting-pages">
            <strong>Supporting launch pages</strong>
            <span>This page already requires the evidence permissions used by these destinations, including Platform Sessions for the authentication smoke test.</span>
            <div className="platform-launch-smoke-test__link-row">
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-go-no-go-register">Launch Go/No-Go</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-acceptance-packet">Launch acceptance</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-certificate">Launch certificate</Link>
              <Link className="app-button app-button--secondary" to="/platform/pilot-customer-readiness">Pilot readiness</Link>
              <Link className="app-button app-button--secondary" to="/platform/support-cockpit">Support cockpit</Link>
              <Link className="app-button app-button--secondary" to="/platform/billing-subscription-activation">Billing activation</Link>
              <Link className="app-button app-button--secondary" to="/platform/monitoring-readiness">Monitoring</Link>
              <Link className="app-button app-button--secondary" to="/platform/backup-restore-validation">Backup restore</Link>
              <Link className="app-button app-button--secondary" to="/platform/documentation-completeness">Documentation</Link>
              <Link className="app-button app-button--secondary" to="/platform/deployment-validation">Deployment validation</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-day-command-center">Launch command center</Link>
            </div>
          </div>
        </div>
      </section>

      {checklist.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Smoke Test Checklist…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-launch-smoke-test__feedback" role="alert">
          <strong>Unable to load Commercial Launch Smoke Test Checklist.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-launch-smoke-test__retry"
            onClick={() => void checklist.refetch()}
            disabled={checklist.isFetching}
          >
            {checklist.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-launch-smoke-test__feedback platform-launch-smoke-test__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Smoke Test Checklist snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-launch-smoke-test__retry"
            onClick={() => void checklist.refetch()}
            disabled={checklist.isFetching}
          >
            {checklist.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Commercial launch smoke-test summary">
            {Object.keys(summaryLabels).map((key) => (
              <OperationalWorkspaceStatCard
                key={key}
                label={summaryLabels[key]}
                value={summary[key] ?? 0}
                helper={summaryHelpers[key]}
                tone={key === 'smoke_tests_blocked' && (summary[key] ?? 0) > 0 ? 'danger' : key === 'smoke_tests_requiring_evidence_review' && (summary[key] ?? 0) > 0 ? 'warn' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-launch-smoke-test__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-smoke-test-checklist"
              title="Current execution prerequisite context"
              description="The current Go/No-Go and acceptance postures are shown separately from the external decisions and smoke-test results that this application cannot observe."
            />
            <div className="platform-launch-smoke-test__context-grid">
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Go/No-Go register posture</strong><span>{humanize(data.go_no_go_register_posture)}</span></div>
              <div><strong>Acceptance packet posture</strong><span>{humanize(data.acceptance_packet_posture)}</span></div>
              <div><strong>Certificate posture</strong><span>{humanize(data.certificate_posture)}</span></div>
            </div>
            <div className="platform-launch-smoke-test__persistence-grid">
              <div>
                <strong>Go/No-Go decision persistence</strong>
                <span>{data.go_no_go_decision_persistence?.stored_in_application ? 'Stored in application' : 'External only'}</span>
                <small>{data.go_no_go_decision_persistence?.interpretation || 'External decision records are not observable by this page.'}</small>
              </div>
              <div>
                <strong>Smoke-test result persistence</strong>
                <span>{data.result_persistence.stored_in_application ? 'Stored in application' : 'External only'}</span>
                <small>{data.result_persistence.interpretation}</small>
              </div>
            </div>
            {registerSummary.length > 0 ? (
              <details className="platform-launch-smoke-test__details">
                <summary>Current Go/No-Go register summary</summary>
                <div className="platform-launch-smoke-test__register-summary">
                  {registerSummary.map(([key, value]) => (
                    <div key={key}><span>{humanize(key)}</span><strong>{value}</strong></div>
                  ))}
                </div>
              </details>
            ) : null}
          </section>

          <section className="platform-launch-smoke-test__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-smoke-test-checklist"
              title="Smoke-test rows"
              description="Each row is an external execution template. The status shown here describes prerequisites, not a live or historical test result."
            />
            {data.smoke_tests.length > 0 ? (
              <div className="platform-launch-smoke-test__row-grid">
                {data.smoke_tests.map((row) => (
                  <article key={row.code} className="app-panel platform-launch-smoke-test__row-card">
                    <div className="platform-launch-smoke-test__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span>
                      </div>
                      <span className="platform-launch-smoke-test__status-badge" data-tone={badgeTone(row.smoke_test_status)}>{humanize(row.smoke_test_status)}</span>
                    </div>

                    <div className="platform-launch-smoke-test__status-grid">
                      <div><strong>Source Go/No-Go posture</strong><span>{humanize(row.source_register_posture)}</span></div>
                      <div><strong>Source acceptance posture</strong><span>{humanize(row.source_acceptance_packet_posture)}</span></div>
                      <div><strong>Template default result</strong><span className="platform-launch-smoke-test__status-badge" data-tone={badgeTone(row.default_result)}>{humanize(row.default_result)}</span><small>Template state only; not proof that no external result exists.</small></div>
                      <div><strong>Result storage</strong><span>{humanize(row.result_artifact_storage)}</span></div>
                    </div>

                    <div className="platform-launch-smoke-test__evidence-box">
                      <strong>Required live evidence</strong>
                      <span>{row.required_evidence}</span>
                      <div className="platform-launch-smoke-test__row-actions">
                        <Link className="app-button app-button--secondary" to={getSmokeTestEvidenceLink(row)}>{getSmokeTestEvidenceLabel(row)}</Link>
                      </div>
                    </div>

                    <div className="platform-launch-smoke-test__precondition-box">
                      <strong>Manual precondition</strong>
                      <span>{row.manual_precondition}</span>
                    </div>

                    <div className="platform-launch-smoke-test__artifact-grid">
                      <div>
                        <strong>Failure policy</strong>
                        <span>{humanize(row.failure_policy)}</span>
                      </div>
                      <div>
                        <strong>External result artifact</strong>
                        <span>{row.result_artifact}</span>
                        <small>Storage: {humanize(row.result_artifact_storage)}</small>
                      </div>
                    </div>

                    <div className="platform-launch-smoke-test__field-groups">
                      <div><strong>Allowed results</strong><div>{row.allowed_results.map((item) => <span key={item}>{humanize(item)}</span>)}</div></div>
                      <div><strong>Required external result fields</strong><div>{row.required_result_fields.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <section className="app-panel app-panel--padded platform-launch-smoke-test__empty-state">
                <strong>No smoke-test rows are available.</strong>
                <span>Review the Launch Go/No-Go register and upstream acceptance evidence before preparing manual launch-environment testing.</span>
              </section>
            )}
          </section>

          <section className="platform-launch-smoke-test__two-column">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-smoke-test-checklist"
                title="Execution rules"
                description="Rules that govern how the external smoke test must be executed and recorded."
              />
              <ul className="platform-launch-smoke-test__list">{data.execution_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-smoke-test-checklist"
                title="Launch limitations"
                description="Known limitations inherited from the upstream launch decision evidence."
              />
              <ul className="platform-launch-smoke-test__list">{data.launch_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-launch-smoke-test__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>
          <section className="app-panel app-panel--padded platform-launch-smoke-test__validation-note">
            <strong>Validation boundary</strong>
            <span>{data.validation_note}</span>
          </section>
        </>
      ) : null}
    </div>
  );
}
