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
import './PlatformCommercialLaunchIncidentClosurePage.css';

type Persistence = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type ClosureRow = {
  code: string;
  source_triage_code: string;
  source_observation_code: string;
  domain: string;
  owner: string;
  source_triage_status: string;
  source_default_severity: string;
  source_triage_artifact: string;
  source_triage_artifact_storage: string;
  customer_impact_review_required: boolean;
  manual_precondition: string;
  required_closure_fields: string[];
  handoff_decision_values: string[];
  default_handoff_decision: string;
  closure_artifact: string;
  closure_artifact_storage: string;
  closure_requirements: string[];
  closure_status: string;
};

type IncidentClosure = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  closure_rows: ClosureRow[];
  incident_triage_posture: string;
  incident_triage_persistence: Persistence | null;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  closure_persistence: Persistence;
  closure_rules: string[];
  closure_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  closure_rows_total: 'Closure rows',
  waiting_for_post_launch_evidence_review: 'Post-launch review',
  waiting_for_external_go_no_go_confirmation: 'Awaiting Go/No-Go',
  waiting_for_external_smoke_test_confirmation: 'Awaiting smoke test',
  waiting_for_external_launch_window_confirmation: 'Awaiting launch window',
  waiting_for_external_post_launch_observation_confirmation: 'Awaiting observation',
  waiting_for_external_triage_confirmation: 'Awaiting triage confirmation',
  blocked_until_triage_ready: 'Blocked rows',
  closure_records_persisted_in_application: 'Closure records stored here'
};

const summaryHelpers: Record<string, string> = {
  closure_rows_total: 'External incident-closure records prepared by this read-only board',
  waiting_for_post_launch_evidence_review: 'Rows held until the upstream post-launch evidence review is resolved',
  waiting_for_external_go_no_go_confirmation: 'Rows waiting for independently confirmed Go/No-Go decisions',
  waiting_for_external_smoke_test_confirmation: 'Rows waiting for independently confirmed smoke-test results',
  waiting_for_external_launch_window_confirmation: 'Rows waiting for the real launch window and production launch to be confirmed',
  waiting_for_external_post_launch_observation_confirmation: 'Rows waiting for an external post-launch observation record',
  waiting_for_external_triage_confirmation: 'Rows waiting for the externally recorded incident-triage record',
  blocked_until_triage_ready: 'Rows that cannot proceed with the current Incident Triage posture',
  closure_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no closure outcomes'
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not available';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'not_reviewed' || normalized === 'not reviewed') return 'neutral';
  if (
    normalized.includes('blocked')
    || normalized.includes('sev1')
    || normalized.includes('rolled_back')
    || normalized.includes('fail')
  ) return 'danger';
  if (
    normalized.includes('waiting')
    || normalized.includes('external')
    || normalized.includes('manual')
    || normalized.includes('review')
    || normalized.includes('watch')
    || normalized.includes('required')
    || normalized.includes('preparation')
  ) return 'warn';
  if (
    normalized.includes('accepted')
    || normalized.includes('ready')
    || normalized.includes('healthy')
    || normalized.includes('clear')
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
  return 'Unknown API error';
}

function persistenceLabel(value: Persistence | null) {
  if (!value) return 'Not reported';
  if (value.stored_in_application) return 'Stored in application';
  if (!value.external_records_observable) return 'External records not observable';
  return 'External evidence observable';
}

function getClosureEvidenceLink(row: ClosureRow) {
  const bySource: Record<string, string> = {
    service_health_observation_recorded_triage: '/platform/system-health',
    customer_feedback_window_opened_triage: '/platform/tenant-communications',
    support_intake_reviewed_triage: '/platform/support-cockpit',
    billing_activation_confirmed_or_held_triage: '/platform/billing-subscription-activation',
    incident_review_completed_triage: '/platform/incidents',
    rollback_readiness_reconfirmed_triage: '/platform/deployment-validation',
    first_adoption_signal_reviewed_triage: '/platform/pilot-customer-readiness',
    launch_handoff_closure_prepared_triage: '/platform/commercial-launch-post-launch-observation'
  };
  const byDomain: Record<string, string> = {
    service_health: '/platform/system-health',
    customer_feedback: '/platform/tenant-communications',
    support_intake: '/platform/support-cockpit',
    billing_confirmation: '/platform/billing-subscription-activation',
    incident_review: '/platform/incidents',
    rollback_readiness: '/platform/deployment-validation',
    adoption_signal: '/platform/pilot-customer-readiness',
    handoff_closure: '/platform/commercial-launch-post-launch-observation'
  };
  return bySource[row.source_triage_code] || byDomain[row.domain] || '/platform/commercial-launch-incident-triage';
}

function getClosureEvidenceLabel(row: ClosureRow) {
  const byDomain: Record<string, string> = {
    service_health: 'Open system health',
    customer_feedback: 'Open tenant communications',
    support_intake: 'Open support cockpit',
    billing_confirmation: 'Open billing activation',
    incident_review: 'Open incidents',
    rollback_readiness: 'Open deployment validation',
    adoption_signal: 'Open pilot readiness',
    handoff_closure: 'Open post-launch observation'
  };
  return byDomain[row.domain] || 'Open incident triage';
}

export default function PlatformCommercialLaunchIncidentClosurePage() {
  const closure = useQuery({
    queryKey: ['platform', 'commercial-launch-incident-closure'],
    queryFn: () => platformApiRequest<IncidentClosure>('/platform/commercial-launch-incident-closure'),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const data = closure.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = closure.isError && !data;
  const refreshError = closure.isError && Boolean(data);
  const requestError = readableError(closure.error);

  return (
    <div className="io-operational-page io-workspace-page platform-incident-closure">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-incident-closure"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Incident Closure"
        description="Read-only preparation for external incident-closure decisions after Incident Triage. It organizes final severity, customer-impact resolution, rollback outcome, customer communication, prevention, handoff, evidence and closure ownership without claiming that any external triage or closure outcome exists."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 224 — Commercial Launch Incident Closure Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Closure preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External closure record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-incident-closure__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? data.summary.closure_rows_total ?? data.closure_rows.length : '—'}
              label="incident closure rows"
            />
            {data ? (
              <span className="platform-incident-closure__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-incident-closure__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void closure.refetch()}
                disabled={closure.isFetching}
              >
                {closure.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-incident-closure__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-incident-closure"
          title="External confirmation boundary"
          description="This board prepares the structure of an incident-closure record; it does not observe or persist the real triage or closure decision."
        />
        <div className="platform-incident-closure__boundary-grid">
          <div className="platform-incident-closure__boundary-notice">
            <strong>Closure preparation only.</strong>
            <span>
              The application cannot confirm that external Go/No-Go decisions, smoke-test results, launch-window decisions, post-launch observations, incident-triage outcomes or incident-closure outcomes were recorded elsewhere. Resolve the current prerequisite and independently confirm the source triage record before recording closure.
            </span>
          </div>
          <div className="platform-incident-closure__supporting-pages">
            <strong>Supporting incident-closure pages</strong>
            <span>This page already requires the evidence permissions used by these destinations, so these shortcuts do not bypass a stricter destination permission boundary.</span>
            <div className="platform-incident-closure__link-row">
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-incident-triage">Incident triage</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-post-launch-observation">Post-launch observation</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-day-command-center">Launch command center</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-go-no-go-register">Launch Go/No-Go</Link>
              <Link className="app-button app-button--secondary" to="/platform/incidents">Incidents</Link>
              <Link className="app-button app-button--secondary" to="/platform/system-health">System health</Link>
              <Link className="app-button app-button--secondary" to="/platform/support-cockpit">Support cockpit</Link>
              <Link className="app-button app-button--secondary" to="/platform/billing-subscription-activation">Billing activation</Link>
              <Link className="app-button app-button--secondary" to="/platform/tenant-communications">Tenant communications</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-prevention-verification">Prevention verification</Link>
            </div>
          </div>
        </div>
      </section>

      {closure.isLoading ? (
        <section className="app-panel app-panel--padded">Loading Commercial Launch Incident Closure…</section>
      ) : null}

      {initialLoadError ? (
        <section className="app-error-state platform-incident-closure__feedback" role="alert">
          <strong>Unable to load Commercial Launch Incident Closure.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-incident-closure__retry"
            onClick={() => void closure.refetch()}
            disabled={closure.isFetching}
          >
            {closure.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-incident-closure__feedback platform-incident-closure__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Incident Closure snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-incident-closure__retry"
            onClick={() => void closure.refetch()}
            disabled={closure.isFetching}
          >
            {closure.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Incident closure summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-incident-closure"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only incident-closure preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-incident-closure__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-incident-triage"
              title="Source launch posture"
              description="Current upstream postures and persistence boundaries supplied by the launch evidence chain."
            />
            <div className="platform-incident-closure__source-grid">
              <div><strong>Incident triage</strong><span>{humanize(data.incident_triage_posture)}</span><Link to="/platform/commercial-launch-incident-triage">Open Incident Triage</Link></div>
              <div><strong>Post-launch observation</strong><span>{humanize(data.post_launch_observation_posture)}</span><Link to="/platform/commercial-launch-post-launch-observation">Open Post-Launch Observation</Link></div>
              <div><strong>Launch command center</strong><span>{humanize(data.command_center_posture)}</span><Link to="/platform/commercial-launch-day-command-center">Open Command Center</Link></div>
              <div><strong>Smoke test</strong><span>{humanize(data.smoke_test_posture)}</span><Link to="/platform/commercial-launch-smoke-test-checklist">Open Launch Smoke Test</Link></div>
              <div><strong>Go/No-Go register</strong><span>{humanize(data.go_no_go_register_posture)}</span><Link to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link></div>
            </div>

            <div className="platform-incident-closure__persistence-grid">
              <div>
                <strong>Incident-triage persistence</strong>
                <span>{persistenceLabel(data.incident_triage_persistence)}</span>
                <small>{data.incident_triage_persistence?.interpretation || 'No persistence statement reported.'}</small>
              </div>
              <div>
                <strong>Incident-closure persistence</strong>
                <span>{persistenceLabel(data.closure_persistence)}</span>
                <small>{data.closure_persistence.interpretation}</small>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-incident-closure__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-incident-closure"
              title="Closure preparation rows"
              description="Each row is an external closure template. The status shown here is the prerequisite posture, not a stored final severity, handoff decision or completed incident closure."
            />

            {data.closure_rows.length === 0 ? (
              <div className="platform-incident-closure__empty-state">
                <strong>No closure preparation rows were produced.</strong>
                <span>This is not evidence that there are no incidents to close or that incident closure is complete. Review Incident Triage and its external evidence availability.</span>
              </div>
            ) : (
              <div className="platform-incident-closure__row-grid">
                {data.closure_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-incident-closure__row-card">
                    <div className="platform-incident-closure__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span>
                      </div>
                      <span className="platform-incident-closure__status-badge" data-tone={badgeTone(row.closure_status)}>
                        {humanize(row.closure_status)}
                      </span>
                    </div>

                    <div className="platform-incident-closure__source-summary">
                      <div><span>Source observation</span><strong>{humanize(row.source_observation_code)}</strong><small>Upstream post-launch observation reference.</small></div>
                      <div><span>Source triage</span><strong>{humanize(row.source_triage_code)}</strong></div>
                      <div><span>Source prerequisite</span><strong>{humanize(row.source_triage_status)}</strong></div>
                      <div><span>Customer impact review</span><strong>{row.customer_impact_review_required ? 'Required' : 'Not required'}</strong></div>
                      <div><span>Source template default severity</span><strong>{humanize(row.source_default_severity)}</strong><small>Template default only; not an observed final severity.</small></div>
                      <div><span>Template default handoff decision</span><strong>{humanize(row.default_handoff_decision)}</strong><small>Template default only; not an observed handoff decision.</small></div>
                    </div>

                    <div className="platform-incident-closure__precondition-box">
                      <strong>Manual precondition</strong>
                      <span>{row.manual_precondition}</span>
                    </div>

                    <div className="platform-incident-closure__row-actions">
                      <Link className="app-button app-button--secondary" to={getClosureEvidenceLink(row)}>{getClosureEvidenceLabel(row)}</Link>
                    </div>

                    <div className="platform-incident-closure__artifact-grid">
                      <div>
                        <strong>Source triage artifact</strong>
                        <span>{row.source_triage_artifact}</span>
                        <small>{humanize(row.source_triage_artifact_storage)}</small>
                      </div>
                      <div>
                        <strong>External closure artifact</strong>
                        <span>{row.closure_artifact}</span>
                        <small>{humanize(row.closure_artifact_storage)}</small>
                      </div>
                    </div>

                    <div className="platform-incident-closure__evidence-box">
                      <strong>Closure requirements</strong>
                      <ul>{row.closure_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>

                    <div className="platform-incident-closure__field-groups">
                      <div>
                        <strong>Allowed handoff decisions</strong>
                        <div className="platform-incident-closure__chips">
                          {row.handoff_decision_values.map((item) => (
                            <span key={item} data-tone={badgeTone(item)}>{humanize(item)}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong>Required external closure fields</strong>
                        <div className="platform-incident-closure__chips">
                          {row.required_closure_fields.map((field) => <span key={field}>{humanize(field)}</span>)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-incident-closure__rules-grid">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-incident-closure"
                title="Closure rules"
                description="Guardrails that determine when an external incident-closure record may be prepared and accepted."
              />
              <ul>{data.closure_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-incident-closure"
                title="Closure limitations"
                description="Claims and actions this read-only board deliberately does not make."
              />
              <ul>{data.closure_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-incident-closure__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>

          <section className="app-panel app-panel--padded platform-incident-closure__snapshot-note">
            <strong>Snapshot metadata</strong>
            <span>{data.phase} · {data.step}</span>
            <span>Generated: {formatDateTime(data.generated_at)}</span>
            <small>{data.validation_note}</small>
          </section>
        </>
      ) : null}
    </div>
  );
}
