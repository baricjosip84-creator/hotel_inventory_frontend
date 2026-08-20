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
import './PlatformCommercialLaunchDayCommandCenterPage.css';

type ExternalPersistence = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type CommandCenterCheckpoint = {
  code: string;
  domain: string;
  owner: string;
  required_evidence: string;
  hold_trigger: string;
  source_smoke_test_posture: string;
  source_smoke_tests_total: number;
  source_smoke_tests_requiring_evidence_review: number;
  source_smoke_tests_awaiting_external_go_no_go_confirmation: number;
  source_smoke_tests_blocked: number;
  manual_precondition: string;
  required_decision_fields: string[];
  allowed_decision_statuses: string[];
  default_decision_status: string;
  decision_artifact: string;
  decision_artifact_storage: string;
  command_center_status: string;
};

type CommercialLaunchDayCommandCenter = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  checkpoints: CommandCenterCheckpoint[];
  smoke_test_posture: string;
  smoke_test_summary: Record<string, number>;
  smoke_test_result_persistence: ExternalPersistence | null;
  go_no_go_register_posture: string;
  go_no_go_decision_persistence: ExternalPersistence | null;
  acceptance_packet_posture: string;
  certificate_posture: string;
  decision_persistence: ExternalPersistence;
  command_center_rules: string[];
  launch_day_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  checkpoints_total: 'Launch-window checkpoints',
  checkpoints_requiring_evidence_review: 'Evidence review required',
  checkpoints_awaiting_external_go_no_go_confirmation: 'Awaiting Go/No-Go confirmation',
  checkpoints_awaiting_external_smoke_test_confirmation: 'Awaiting smoke-test confirmation',
  checkpoints_blocked: 'Blocked checkpoints',
  decision_records_persisted_in_application: 'Decisions stored here'
};

const summaryHelpers: Record<string, string> = {
  checkpoints_total: 'Owner and evidence templates prepared for the real launch window',
  checkpoints_requiring_evidence_review: 'Checkpoints held until upstream launch evidence is reviewed',
  checkpoints_awaiting_external_go_no_go_confirmation: 'Waiting for externally recorded launch decisions',
  checkpoints_awaiting_external_smoke_test_confirmation: 'Waiting for externally recorded smoke-test outcomes',
  checkpoints_blocked: 'Checkpoints that cannot proceed with the current smoke-test prerequisite posture',
  decision_records_persisted_in_application: 'Expected to remain zero on this read-only preparation surface'
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not available';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('hold') || normalized.includes('missing')) return 'danger';
  if (
    normalized.includes('review')
    || normalized.includes('waiting')
    || normalized.includes('external')
    || normalized.includes('manual')
    || normalized.includes('conditional')
    || normalized.includes('required')
  ) return 'warn';
  if (normalized.includes('ready') || normalized.includes('clear') || normalized.includes('pass')) return 'good';
  if (normalized.includes('not reviewed') || normalized.includes('not_reviewed') || normalized.includes('preparation')) return 'neutral';
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

function getCheckpointEvidenceLink(row: CommandCenterCheckpoint) {
  const byCode: Record<string, string> = {
    launch_window_owner_confirmed: '/platform/commercial-launch-go-no-go-register',
    smoke_test_runner_confirmed: '/platform/commercial-launch-smoke-test-checklist',
    customer_success_launch_contact_confirmed: '/platform/pilot-customer-readiness',
    support_escalation_path_confirmed: '/platform/support-cockpit',
    billing_activation_hold_confirmed: '/platform/billing-subscription-activation',
    incident_commander_confirmed: '/platform/incidents',
    rollback_decision_owner_confirmed: '/platform/deployment-validation',
    post_launch_observation_window_confirmed: '/platform/monitoring-readiness'
  };
  return byCode[row.code] || '/platform/commercial-launch-smoke-test-checklist';
}

function getCheckpointEvidenceLabel(row: CommandCenterCheckpoint) {
  const byDomain: Record<string, string> = {
    launch_window_control: 'Open Go/No-Go register',
    smoke_test_execution: 'Open smoke-test checklist',
    customer_communication: 'Open pilot readiness',
    support_readiness: 'Open support cockpit',
    billing_activation_control: 'Open billing activation',
    incident_response: 'Open incidents',
    rollback_control: 'Open deployment validation',
    post_launch_observation: 'Open monitoring readiness'
  };
  return byDomain[row.domain] || 'Open smoke-test checklist';
}

export default function PlatformCommercialLaunchDayCommandCenterPage() {
  const commandCenter = useQuery({
    queryKey: ['platform', 'commercial-launch-day-command-center'],
    queryFn: () => platformApiRequest<CommercialLaunchDayCommandCenter>('/platform/commercial-launch-day-command-center'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = commandCenter.data;
  const summary = data?.summary || {};
  const smokeTestSummary = useMemo(() => Object.entries(data?.smoke_test_summary || {}), [data?.smoke_test_summary]);
  const initialLoadError = commandCenter.isError && !data;
  const refreshError = commandCenter.isError && Boolean(data);
  const requestError = readableError(commandCenter.error);

  return (
    <div className="io-operational-page io-workspace-page platform-launch-command-center">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-day-command-center"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Day Command Center"
        description="Read-only launch-window preparation for owners, decision references, customer/support coordination, billing holds, incident response, rollback control and post-launch observation. It organizes the real launch window without executing launch actions or claiming external decisions exist."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 221 — Commercial Launch Day Command Center'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External decision records required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-launch-command-center__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? summary.checkpoints_total ?? data.checkpoints.length : '—'}
              label="launch-window checkpoints"
            />
            {data ? (
              <span className="platform-launch-command-center__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-launch-command-center__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void commandCenter.refetch()}
                disabled={commandCenter.isFetching}
              >
                {commandCenter.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-launch-command-center__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-day-command-center"
          title="Launch-window boundary"
          description="The board prepares launch-day decision records, but external decisions and live smoke-test outcomes remain outside the application."
        />
        <div className="platform-launch-command-center__boundary-grid">
          <div className="platform-launch-command-center__boundary-notice">
            <strong>Preparation only.</strong>
            <span>
              This application cannot observe external go/no-go decisions, smoke-test execution records, or launch-window command-center decisions. A checkpoint row is a record template, not proof that its prerequisite or decision has been completed.
            </span>
          </div>
          <div className="platform-launch-command-center__supporting-pages">
            <strong>Supporting launch pages</strong>
            <span>This page already requires the evidence permissions used by these destinations, including Platform Sessions for the launch smoke-test path.</span>
            <div className="platform-launch-command-center__link-row">
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-go-no-go-register">Launch Go/No-Go</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-acceptance-packet">Launch acceptance</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-certificate">Launch certificate</Link>
              <Link className="app-button app-button--secondary" to="/platform/support-cockpit">Support cockpit</Link>
              <Link className="app-button app-button--secondary" to="/platform/billing-subscription-activation">Billing activation</Link>
              <Link className="app-button app-button--secondary" to="/platform/incidents">Incidents</Link>
              <Link className="app-button app-button--secondary" to="/platform/monitoring-readiness">Monitoring readiness</Link>
              <Link className="app-button app-button--secondary" to="/platform/deployment-validation">Deployment validation</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-post-launch-observation">Post-launch observation</Link>
            </div>
          </div>
        </div>
      </section>

      {commandCenter.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Day Command Center…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-launch-command-center__feedback" role="alert">
          <strong>Unable to load Commercial Launch Day Command Center.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-launch-command-center__retry"
            onClick={() => void commandCenter.refetch()}
            disabled={commandCenter.isFetching}
          >
            {commandCenter.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-launch-command-center__feedback platform-launch-command-center__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Day Command Center snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-launch-command-center__retry"
            onClick={() => void commandCenter.refetch()}
            disabled={commandCenter.isFetching}
          >
            {commandCenter.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Commercial launch command-center summary">
            {Object.keys(summaryLabels).map((key) => (
              <OperationalWorkspaceStatCard
                key={key}
                label={summaryLabels[key]}
                value={summary[key] ?? 0}
                helper={summaryHelpers[key]}
                tone={key === 'checkpoints_blocked' && (summary[key] ?? 0) > 0 ? 'danger' : key === 'checkpoints_requiring_evidence_review' && (summary[key] ?? 0) > 0 ? 'warn' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-launch-command-center__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-day-command-center"
              title="Current launch prerequisite context"
              description="Current upstream launch postures and persistence boundaries are shown separately from the external decisions that this application cannot observe."
            />
            <div className="platform-launch-command-center__context-grid">
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Smoke-test posture</strong><span>{humanize(data.smoke_test_posture)}</span></div>
              <div><strong>Go/No-Go register posture</strong><span>{humanize(data.go_no_go_register_posture)}</span></div>
              <div><strong>Acceptance packet posture</strong><span>{humanize(data.acceptance_packet_posture)}</span></div>
              <div><strong>Certificate posture</strong><span>{humanize(data.certificate_posture)}</span></div>
              <div><strong>Command-center posture</strong><span>{humanize(data.posture)}</span></div>
            </div>
            <div className="platform-launch-command-center__persistence-grid">
              <div>
                <strong>Go/No-Go decision persistence</strong>
                <span>{data.go_no_go_decision_persistence?.stored_in_application ? 'Stored in application' : 'External only'}</span>
                <small>{data.go_no_go_decision_persistence?.interpretation || 'External Go/No-Go decision records are not observable by this page.'}</small>
              </div>
              <div>
                <strong>Smoke-test result persistence</strong>
                <span>{data.smoke_test_result_persistence?.stored_in_application ? 'Stored in application' : 'External only'}</span>
                <small>{data.smoke_test_result_persistence?.interpretation || 'External smoke-test result records are not observable by this page.'}</small>
              </div>
              <div>
                <strong>Command-center decision persistence</strong>
                <span>{data.decision_persistence.stored_in_application ? 'Stored in application' : 'External only'}</span>
                <small>{data.decision_persistence.interpretation}</small>
              </div>
            </div>
            {smokeTestSummary.length > 0 ? (
              <details className="platform-launch-command-center__details">
                <summary>Current smoke-test summary</summary>
                <div className="platform-launch-command-center__source-summary">
                  {smokeTestSummary.map(([key, value]) => (
                    <div key={key}><span>{humanize(key)}</span><strong>{value}</strong></div>
                  ))}
                </div>
              </details>
            ) : null}
          </section>

          <section className="platform-launch-command-center__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-day-command-center"
              title="Launch-window checkpoints"
              description="Each checkpoint is an external decision template. Its status describes the current prerequisite posture, not a stored launch-day decision."
            />
            {data.checkpoints.length > 0 ? (
              <div className="platform-launch-command-center__row-grid">
                {data.checkpoints.map((row) => (
                  <article key={row.code} className="app-panel platform-launch-command-center__row-card">
                    <div className="platform-launch-command-center__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span>
                      </div>
                      <span className="platform-launch-command-center__status-badge" data-tone={badgeTone(row.command_center_status)}>{humanize(row.command_center_status)}</span>
                    </div>

                    <div className="platform-launch-command-center__status-grid">
                      <div><strong>Source smoke-test posture</strong><span>{humanize(row.source_smoke_test_posture)}</span></div>
                      <div><strong>Smoke-test rows</strong><span>{row.source_smoke_tests_total}</span></div>
                      <div><strong>Evidence review rows</strong><span>{row.source_smoke_tests_requiring_evidence_review}</span></div>
                      <div><strong>Awaiting external Go/No-Go</strong><span>{row.source_smoke_tests_awaiting_external_go_no_go_confirmation}</span></div>
                      <div><strong>Blocked smoke-test rows</strong><span>{row.source_smoke_tests_blocked}</span></div>
                      <div>
                        <strong>Template default decision</strong>
                        <span className="platform-launch-command-center__status-badge" data-tone={badgeTone(row.default_decision_status)}>{humanize(row.default_decision_status)}</span>
                        <small>A template default of not reviewed is not proof that no external decision exists.</small>
                      </div>
                    </div>

                    <div className="platform-launch-command-center__precondition-box">
                      <strong>Manual precondition</strong>
                      <span>{row.manual_precondition}</span>
                    </div>

                    <div className="platform-launch-command-center__evidence-box">
                      <strong>Required evidence</strong>
                      <span>{row.required_evidence}</span>
                      <div className="platform-launch-command-center__row-actions">
                        <Link className="app-button app-button--secondary" to={getCheckpointEvidenceLink(row)}>{getCheckpointEvidenceLabel(row)}</Link>
                      </div>
                    </div>

                    <div className="platform-launch-command-center__artifact-grid">
                      <div><strong>Hold trigger</strong><span>{humanize(row.hold_trigger)}</span></div>
                      <div><strong>External decision artifact</strong><span>{row.decision_artifact}</span><small>Storage: {humanize(row.decision_artifact_storage)}</small></div>
                    </div>

                    <div className="platform-launch-command-center__field-groups">
                      <div><strong>Allowed external decision statuses</strong><div>{row.allowed_decision_statuses.map((item) => <span key={item}>{humanize(item)}</span>)}</div></div>
                      <div><strong>Required external decision fields</strong><div>{row.required_decision_fields.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <section className="app-panel app-panel--padded platform-launch-command-center__empty-state">
                <strong>No command-center checkpoints are available.</strong>
                <span>Review the Launch Smoke Test prerequisite before preparing the real launch window.</span>
              </section>
            )}
          </section>

          <section className="platform-launch-command-center__two-column">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-day-command-center"
                title="Command center rules"
                description="Operating rules for preparing and controlling the real launch window."
              />
              <ul className="platform-launch-command-center__list">{data.command_center_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-day-command-center"
                title="Launch-day limitations"
                description="Important boundaries on what this read-only workspace can prove or execute."
              />
              <ul className="platform-launch-command-center__list">{data.launch_day_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-launch-command-center__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>

          <section className="app-panel app-panel--padded platform-launch-command-center__validation-note">
            <strong>Validation boundary</strong>
            <span>{data.validation_note}</span>
          </section>
        </>
      ) : null}
    </div>
  );
}
