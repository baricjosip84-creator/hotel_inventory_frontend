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
import './PlatformCommercialLaunchPostLaunchObservationPage.css';

type ExternalPersistence = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type ObservationRow = {
  code: string;
  domain: string;
  owner: string;
  required_evidence: string;
  escalation_trigger: string;
  source_command_center_posture: string;
  source_checkpoints_total: number;
  source_checkpoints_blocked: number;
  source_checkpoints_requiring_evidence_review: number;
  source_checkpoints_awaiting_external_go_no_go_confirmation: number;
  source_checkpoints_awaiting_external_smoke_test_confirmation: number;
  manual_precondition: string;
  required_observation_fields: string[];
  allowed_observation_statuses: string[];
  default_observation_status: string;
  observation_artifact: string;
  observation_artifact_storage: string;
  observation_status: string;
};

type PostLaunchObservation = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  observation_rows: ObservationRow[];
  command_center_posture: string;
  command_center_decision_persistence: ExternalPersistence | null;
  smoke_test_posture: string;
  smoke_test_result_persistence: ExternalPersistence | null;
  go_no_go_register_posture: string;
  go_no_go_decision_persistence: ExternalPersistence | null;
  acceptance_packet_posture: string;
  certificate_posture: string;
  observation_persistence: ExternalPersistence;
  post_launch_rules: string[];
  observation_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  observation_checks_total: 'Observation checks',
  waiting_for_command_center_evidence_review: 'Command Center review',
  waiting_for_external_go_no_go_confirmation: 'Awaiting Go/No-Go confirmation',
  waiting_for_external_smoke_test_confirmation: 'Awaiting smoke confirmation',
  waiting_for_external_launch_window_confirmation: 'Awaiting launch-window confirmation',
  blocked_until_command_center_ready: 'Blocked checks',
  observation_records_persisted_in_application: 'Observations stored here'
};

const summaryHelpers: Record<string, string> = {
  observation_checks_total: 'External post-launch observation records prepared by this board',
  waiting_for_command_center_evidence_review: 'Checks held until Command Center evidence review is resolved',
  waiting_for_external_go_no_go_confirmation: 'Checks waiting for externally recorded Go/No-Go decisions',
  waiting_for_external_smoke_test_confirmation: 'Checks waiting for externally recorded smoke-test results',
  waiting_for_external_launch_window_confirmation: 'Checks waiting for external launch-window and production-launch confirmation',
  blocked_until_command_center_ready: 'Checks that cannot proceed with the current Command Center posture',
  observation_records_persisted_in_application: 'Expected to remain zero because this endpoint is read-only'
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
    || normalized.includes('degradation')
    || normalized.includes('missing')
    || normalized.includes('fail')
  ) return 'danger';
  if (
    normalized.includes('review')
    || normalized.includes('waiting')
    || normalized.includes('external')
    || normalized.includes('manual')
    || normalized.includes('watch')
    || normalized.includes('required')
  ) return 'warn';
  if (normalized.includes('healthy') || normalized.includes('ready') || normalized.includes('clear')) return 'good';
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

function persistenceLabel(value: ExternalPersistence | null) {
  if (!value) return 'Not reported';
  if (value.stored_in_application) return 'Stored in application';
  if (!value.external_records_observable) return 'External records not observable';
  return 'External evidence observable';
}

function getObservationEvidenceLink(row: ObservationRow) {
  const byCode: Record<string, string> = {
    service_health_observation_recorded: '/platform/system-health',
    customer_feedback_window_opened: '/platform/tenant-communications',
    support_intake_reviewed: '/platform/support-cockpit',
    billing_activation_confirmed_or_held: '/platform/billing-subscription-activation',
    incident_review_completed: '/platform/incidents',
    rollback_readiness_reconfirmed: '/platform/deployment-validation',
    first_adoption_signal_reviewed: '/platform/pilot-customer-readiness',
    launch_handoff_closure_prepared: '/platform/commercial-launch-day-command-center'
  };
  return byCode[row.code] || '/platform/commercial-launch-day-command-center';
}

function getObservationEvidenceLabel(row: ObservationRow) {
  const byCode: Record<string, string> = {
    service_health_observation_recorded: 'Open system health',
    customer_feedback_window_opened: 'Open tenant communications',
    support_intake_reviewed: 'Open support cockpit',
    billing_activation_confirmed_or_held: 'Open billing activation',
    incident_review_completed: 'Open incidents',
    rollback_readiness_reconfirmed: 'Open deployment validation',
    first_adoption_signal_reviewed: 'Open pilot readiness',
    launch_handoff_closure_prepared: 'Open command center'
  };
  return byCode[row.code] || 'Open command center';
}

export default function PlatformCommercialLaunchPostLaunchObservationPage() {
  const observation = useQuery({
    queryKey: ['platform', 'commercial-launch-post-launch-observation'],
    queryFn: () => platformApiRequest<PostLaunchObservation>('/platform/commercial-launch-post-launch-observation'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = observation.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = observation.isError && !data;
  const refreshError = observation.isError && Boolean(data);
  const requestError = readableError(observation.error);

  return (
    <div className="io-operational-page io-workspace-page platform-post-launch-observation">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-post-launch-observation"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Post-Launch Observation"
        description="Read-only preparation for the first production observation window after a real commercial launch. It organizes health, customer, support, billing, incident, rollback, adoption and handoff evidence without claiming that launch occurred or that any external observation result exists."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 222 — Commercial Launch Post-Launch Observation Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Observation preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External observation records required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-post-launch-observation__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? data.summary.observation_checks_total ?? data.observation_rows.length : '—'}
              label="post-launch observation checks"
            />
            {data ? (
              <span className="platform-post-launch-observation__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-post-launch-observation__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void observation.refetch()}
                disabled={observation.isFetching}
              >
                {observation.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-post-launch-observation__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-post-launch-observation"
          title="External confirmation boundary"
          description="The board becomes useful only after the real launch-window prerequisites are independently confirmed outside this application."
        />
        <div className="platform-post-launch-observation__boundary-grid">
          <div className="platform-post-launch-observation__boundary-notice">
            <strong>Observation preparation only.</strong>
            <span>
              This application cannot observe external go/no-go decisions, smoke-test results, launch-window checkpoint decisions, the real production launch, or post-launch observation outcomes. A prepared observation row is not proof that launch occurred or that any result has been recorded.
            </span>
          </div>
          <div className="platform-post-launch-observation__supporting-pages">
            <strong>Supporting launch and observation pages</strong>
            <span>This page already requires the evidence permissions used by these destinations, so the shortcuts do not bypass a stricter destination permission boundary.</span>
            <div className="platform-post-launch-observation__link-row">
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-day-command-center">Launch command center</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-go-no-go-register">Launch Go/No-Go</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-acceptance">Launch acceptance</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-certificate">Launch certificate</Link>
              <Link className="app-button app-button--secondary" to="/platform/monitoring-readiness">Monitoring readiness</Link>
              <Link className="app-button app-button--secondary" to="/platform/system-health">System health</Link>
              <Link className="app-button app-button--secondary" to="/platform/incidents">Incidents</Link>
              <Link className="app-button app-button--secondary" to="/platform/support-cockpit">Support cockpit</Link>
              <Link className="app-button app-button--secondary" to="/platform/tenant-communications">Tenant communications</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-incident-triage">Incident triage</Link>
            </div>
          </div>
        </div>
      </section>

      {observation.isLoading ? (
        <section className="app-panel app-panel--padded">Loading Commercial Launch Post-Launch Observation…</section>
      ) : null}

      {initialLoadError ? (
        <section className="app-error-state platform-post-launch-observation__feedback" role="alert">
          <strong>Unable to load Commercial Launch Post-Launch Observation.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-post-launch-observation__retry"
            onClick={() => void observation.refetch()}
            disabled={observation.isFetching}
          >
            {observation.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-post-launch-observation__feedback platform-post-launch-observation__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Post-Launch Observation snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-post-launch-observation__retry"
            onClick={() => void observation.refetch()}
            disabled={observation.isFetching}
          >
            {observation.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Post-launch observation summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-post-launch-observation"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only observation preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-post-launch-observation__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-day-command-center"
              title="Source launch posture"
              description="Current upstream launch states and persistence boundaries supplied by the Command Center evidence chain."
            />
            <div className="platform-post-launch-observation__source-grid">
              <div><strong>Command center</strong><span>{humanize(data.command_center_posture)}</span><Link to="/platform/commercial-launch-day-command-center">Open Command Center</Link></div>
              <div><strong>Smoke test</strong><span>{humanize(data.smoke_test_posture)}</span><Link to="/platform/commercial-launch-smoke-test-checklist">Open Launch Smoke Test</Link></div>
              <div><strong>Go/No-Go register</strong><span>{humanize(data.go_no_go_register_posture)}</span><Link to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link></div>
              <div><strong>Acceptance packet</strong><span>{humanize(data.acceptance_packet_posture)}</span><Link to="/platform/commercial-launch-acceptance">Open Launch Acceptance</Link></div>
              <div><strong>Certificate</strong><span>{humanize(data.certificate_posture)}</span><Link to="/platform/commercial-launch-certificate">Open Launch Certificate</Link></div>
            </div>

            <div className="platform-post-launch-observation__persistence-grid">
              <div>
                <strong>Command-center decision persistence</strong>
                <span>{persistenceLabel(data.command_center_decision_persistence)}</span>
                <small>{data.command_center_decision_persistence?.interpretation || 'No persistence statement reported.'}</small>
              </div>
              <div>
                <strong>Smoke-test result persistence</strong>
                <span>{persistenceLabel(data.smoke_test_result_persistence)}</span>
                <small>{data.smoke_test_result_persistence?.interpretation || 'No persistence statement reported.'}</small>
              </div>
              <div>
                <strong>Go/no-go decision persistence</strong>
                <span>{persistenceLabel(data.go_no_go_decision_persistence)}</span>
                <small>{data.go_no_go_decision_persistence?.interpretation || 'No persistence statement reported.'}</small>
              </div>
              <div>
                <strong>Post-launch observation persistence</strong>
                <span>{persistenceLabel(data.observation_persistence)}</span>
                <small>{data.observation_persistence.interpretation}</small>
              </div>
            </div>
          </section>

          <section className="platform-post-launch-observation__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-post-launch-observation"
              title="Observation preparation checks"
              description="Eight external evidence records covering health, customer feedback, support, billing, incidents, rollback, adoption and handoff."
            />

            {data.observation_rows.length === 0 ? (
              <div className="app-panel app-panel--padded platform-post-launch-observation__empty-state">
                No post-launch observation checks were returned. This is not evidence that observation is complete; refresh the board or review the source Command Center posture.
              </div>
            ) : (
              <div className="platform-post-launch-observation__row-grid">
                {data.observation_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-post-launch-observation__row-card">
                    <div className="platform-post-launch-observation__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span>
                      </div>
                      <span className="platform-post-launch-observation__status-badge" data-tone={badgeTone(row.observation_status)}>
                        {humanize(row.observation_status)}
                      </span>
                    </div>

                    <div className="platform-post-launch-observation__source-summary">
                      <div><span>Command Center posture</span><strong>{humanize(row.source_command_center_posture)}</strong></div>
                      <div><span>Source checkpoints</span><strong>{row.source_checkpoints_total}</strong></div>
                      <div><span>Blocked</span><strong>{row.source_checkpoints_blocked}</strong></div>
                      <div><span>Evidence review</span><strong>{row.source_checkpoints_requiring_evidence_review}</strong></div>
                      <div><span>Go/No-Go confirmation</span><strong>{row.source_checkpoints_awaiting_external_go_no_go_confirmation}</strong></div>
                      <div><span>Smoke confirmation</span><strong>{row.source_checkpoints_awaiting_external_smoke_test_confirmation}</strong></div>
                    </div>

                    <div className="platform-post-launch-observation__precondition-box">
                      <strong>Manual precondition</strong>
                      <span>{row.manual_precondition}</span>
                    </div>

                    <div className="platform-post-launch-observation__evidence-box">
                      <strong>Required evidence</strong>
                      <span>{row.required_evidence}</span>
                      <div className="platform-post-launch-observation__row-actions">
                        <Link className="app-button app-button--secondary" to={getObservationEvidenceLink(row)}>{getObservationEvidenceLabel(row)}</Link>
                      </div>
                    </div>

                    <div className="platform-post-launch-observation__artifact-grid">
                      <div><strong>External observation artifact</strong><span>{row.observation_artifact}</span></div>
                      <div><strong>Artifact storage</strong><span>{humanize(row.observation_artifact_storage)}</span></div>
                      <div>
                        <strong>Template default observation result</strong>
                        <span className="platform-post-launch-observation__status-badge" data-tone={badgeTone(row.default_observation_status)}>{humanize(row.default_observation_status)}</span>
                        <small>Template default only; it does not prove that no external observation record exists.</small>
                      </div>
                      <div><strong>Escalation trigger</strong><span>{humanize(row.escalation_trigger)}</span></div>
                    </div>

                    <div className="platform-post-launch-observation__field-groups">
                      <div>
                        <strong>Allowed external observation statuses</strong>
                        <div className="platform-post-launch-observation__chips">
                          {row.allowed_observation_statuses.map((item) => <span key={item}>{humanize(item)}</span>)}
                        </div>
                      </div>
                      <div>
                        <strong>Required external observation fields</strong>
                        <div className="platform-post-launch-observation__chips">
                          {row.required_observation_fields.map((field) => <span key={field}>{humanize(field)}</span>)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-post-launch-observation__rules-grid">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-post-launch-observation"
                title="Post-launch rules"
                description="Conditions that keep the observation window open until externally recorded evidence is complete."
              />
              <ul>{data.post_launch_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-post-launch-observation"
                title="Observation limitations"
                description="What this read-only evidence-preparation page cannot prove or change."
              />
              <ul>{data.observation_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-post-launch-observation__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>

          <section className="app-panel app-panel--padded platform-post-launch-observation__validation-note">
            <strong>Snapshot validation</strong>
            <span>{data.validation_note}</span>
            <small>Generated: {formatDateTime(data.generated_at)} · Phase: {data.phase}</small>
          </section>
        </>
      ) : null}
    </div>
  );
}
