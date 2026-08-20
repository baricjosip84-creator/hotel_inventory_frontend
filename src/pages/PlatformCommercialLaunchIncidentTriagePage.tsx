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
import './PlatformCommercialLaunchIncidentTriagePage.css';

type Persistence = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type TriageRow = {
  code: string;
  source_observation_code: string;
  domain: string;
  owner: string;
  source_observation_status: string;
  source_observation_artifact: string;
  source_observation_artifact_storage: string;
  escalation_trigger: string;
  customer_impact_review_required: boolean;
  severity_values: string[];
  default_severity: string;
  manual_precondition: string;
  required_triage_fields: string[];
  triage_artifact: string;
  triage_artifact_storage: string;
  triage_actions: string[];
  triage_status: string;
};

type IncidentTriage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  triage_rows: TriageRow[];
  post_launch_observation_posture: string;
  post_launch_observation_persistence: Persistence | null;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  triage_persistence: Persistence;
  triage_rules: string[];
  triage_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  triage_rows_total: 'Triage rows',
  waiting_for_post_launch_evidence_review: 'Post-launch review',
  waiting_for_external_go_no_go_confirmation: 'Awaiting Go/No-Go',
  waiting_for_external_smoke_test_confirmation: 'Awaiting smoke test',
  waiting_for_external_launch_window_confirmation: 'Awaiting launch window',
  waiting_for_external_post_launch_observation_confirmation: 'Awaiting observation',
  blocked_until_post_launch_observation_ready: 'Blocked rows',
  triage_records_persisted_in_application: 'Triage records stored here'
};

const summaryHelpers: Record<string, string> = {
  triage_rows_total: 'External incident-triage records prepared by this read-only queue',
  waiting_for_post_launch_evidence_review: 'Rows held until the upstream evidence review is resolved',
  waiting_for_external_go_no_go_confirmation: 'Rows waiting for independently confirmed Go/No-Go decisions',
  waiting_for_external_smoke_test_confirmation: 'Rows waiting for independently confirmed smoke-test results',
  waiting_for_external_launch_window_confirmation: 'Rows waiting for the real launch window and production launch to be confirmed',
  waiting_for_external_post_launch_observation_confirmation: 'Rows waiting for an external post-launch observation record',
  blocked_until_post_launch_observation_ready: 'Rows that cannot proceed with the current upstream posture',
  triage_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no triage outcomes'
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
    || normalized.includes('fail')
    || normalized.includes('degradation')
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
  if (normalized.includes('ready') || normalized.includes('healthy') || normalized.includes('clear')) return 'good';
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

function getTriageEvidenceLink(row: TriageRow) {
  const bySource: Record<string, string> = {
    service_health_observation_recorded: '/platform/system-health',
    customer_feedback_window_opened: '/platform/tenant-communications',
    support_intake_reviewed: '/platform/support-cockpit',
    billing_activation_confirmed_or_held: '/platform/billing-subscription-activation',
    incident_review_completed: '/platform/incidents',
    rollback_readiness_reconfirmed: '/platform/deployment-validation',
    first_adoption_signal_reviewed: '/platform/pilot-customer-readiness',
    launch_handoff_closure_prepared: '/platform/commercial-launch-post-launch-observation'
  };
  return bySource[row.source_observation_code] || '/platform/commercial-launch-post-launch-observation';
}

function getTriageEvidenceLabel(row: TriageRow) {
  const bySource: Record<string, string> = {
    service_health_observation_recorded: 'Open system health',
    customer_feedback_window_opened: 'Open tenant communications',
    support_intake_reviewed: 'Open support cockpit',
    billing_activation_confirmed_or_held: 'Open billing activation',
    incident_review_completed: 'Open incidents',
    rollback_readiness_reconfirmed: 'Open deployment validation',
    first_adoption_signal_reviewed: 'Open pilot readiness',
    launch_handoff_closure_prepared: 'Open post-launch observation'
  };
  return bySource[row.source_observation_code] || 'Open post-launch observation';
}

export default function PlatformCommercialLaunchIncidentTriagePage() {
  const triage = useQuery({
    queryKey: ['platform', 'commercial-launch-incident-triage'],
    queryFn: () => platformApiRequest<IncidentTriage>('/platform/commercial-launch-incident-triage'),
    staleTime: 30_000,
    refetchOnWindowFocus: false
  });

  const data = triage.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = triage.isError && !data;
  const refreshError = triage.isError && Boolean(data);
  const requestError = readableError(triage.error);

  return (
    <div className="io-operational-page io-workspace-page platform-incident-triage">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-incident-triage"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Incident Triage"
        description="Read-only preparation for external incident-triage decisions after post-launch observation. It organizes severity, customer impact, ownership, communication, rollback, follow-up and closure evidence without claiming that any external observation or triage outcome exists."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 223 — Commercial Launch Incident Triage Queue'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Triage preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External triage record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-incident-triage__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? data.summary.triage_rows_total ?? data.triage_rows.length : '—'}
              label="incident triage rows"
            />
            {data ? (
              <span className="platform-incident-triage__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-incident-triage__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void triage.refetch()}
                disabled={triage.isFetching}
              >
                {triage.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-incident-triage__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-incident-triage"
          title="External confirmation boundary"
          description="This queue prepares the structure of an incident-triage record; it does not observe or persist the real triage decision."
        />
        <div className="platform-incident-triage__boundary-grid">
          <div className="platform-incident-triage__boundary-notice">
            <strong>Triage preparation only.</strong>
            <span>
              The application cannot confirm that external Go/No-Go decisions, smoke-test results, launch-window decisions, post-launch observations or incident-triage outcomes were recorded elsewhere. Confirm the source observation independently before recording severity or any follow-up decision.
            </span>
          </div>
          <div className="platform-incident-triage__supporting-pages">
            <strong>Supporting incident-triage pages</strong>
            <span>This page already requires the evidence permissions used by these destinations, so these shortcuts do not bypass a stricter destination permission boundary.</span>
            <div className="platform-incident-triage__link-row">
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-post-launch-observation">Post-launch observation</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-day-command-center">Launch command center</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-smoke-test-checklist">Launch smoke test</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-go-no-go-register">Launch Go/No-Go</Link>
              <Link className="app-button app-button--secondary" to="/platform/incidents">Incidents</Link>
              <Link className="app-button app-button--secondary" to="/platform/system-health">System health</Link>
              <Link className="app-button app-button--secondary" to="/platform/support-cockpit">Support cockpit</Link>
              <Link className="app-button app-button--secondary" to="/platform/billing-subscription-activation">Billing activation</Link>
              <Link className="app-button app-button--secondary" to="/platform/tenant-communications">Tenant communications</Link>
              <Link className="app-button app-button--secondary" to="/platform/commercial-launch-incident-closure">Incident closure</Link>
            </div>
          </div>
        </div>
      </section>

      {triage.isLoading ? (
        <section className="app-panel app-panel--padded">Loading Commercial Launch Incident Triage…</section>
      ) : null}

      {initialLoadError ? (
        <section className="app-error-state platform-incident-triage__feedback" role="alert">
          <strong>Unable to load Commercial Launch Incident Triage.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-incident-triage__retry"
            onClick={() => void triage.refetch()}
            disabled={triage.isFetching}
          >
            {triage.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-incident-triage__feedback platform-incident-triage__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Incident Triage snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-incident-triage__retry"
            onClick={() => void triage.refetch()}
            disabled={triage.isFetching}
          >
            {triage.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Incident triage summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-incident-triage"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only incident-triage preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-incident-triage__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-post-launch-observation"
              title="Source launch posture"
              description="Current upstream postures and persistence boundaries supplied by the launch evidence chain."
            />
            <div className="platform-incident-triage__source-grid">
              <div><strong>Post-launch observation</strong><span>{humanize(data.post_launch_observation_posture)}</span><Link to="/platform/commercial-launch-post-launch-observation">Open Post-Launch Observation</Link></div>
              <div><strong>Launch command center</strong><span>{humanize(data.command_center_posture)}</span><Link to="/platform/commercial-launch-day-command-center">Open Command Center</Link></div>
              <div><strong>Smoke test</strong><span>{humanize(data.smoke_test_posture)}</span><Link to="/platform/commercial-launch-smoke-test-checklist">Open Launch Smoke Test</Link></div>
              <div><strong>Go/No-Go register</strong><span>{humanize(data.go_no_go_register_posture)}</span><Link to="/platform/commercial-launch-go-no-go-register">Open Launch Go/No-Go</Link></div>
            </div>

            <div className="platform-incident-triage__persistence-grid">
              <div>
                <strong>Post-launch observation persistence</strong>
                <span>{persistenceLabel(data.post_launch_observation_persistence)}</span>
                <small>{data.post_launch_observation_persistence?.interpretation || 'No persistence statement reported.'}</small>
              </div>
              <div>
                <strong>Incident-triage persistence</strong>
                <span>{persistenceLabel(data.triage_persistence)}</span>
                <small>{data.triage_persistence.interpretation}</small>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-incident-triage__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-incident-triage"
              title="Triage preparation rows"
              description="Each row is an external triage template. The status shown here is the prerequisite posture, not a stored incident severity or completed triage decision."
            />

            {data.triage_rows.length === 0 ? (
              <div className="platform-incident-triage__empty-state">
                <strong>No triage preparation rows were produced.</strong>
                <span>This is not evidence that the launch is incident-free. Review the upstream Post-Launch Observation source and its evidence availability.</span>
              </div>
            ) : (
              <div className="platform-incident-triage__row-grid">
                {data.triage_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-incident-triage__row-card">
                    <div className="platform-incident-triage__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span>
                      </div>
                      <span className="platform-incident-triage__status-badge" data-tone={badgeTone(row.triage_status)}>
                        {humanize(row.triage_status)}
                      </span>
                    </div>

                    <div className="platform-incident-triage__source-summary">
                      <div><span>Source observation</span><strong>{humanize(row.source_observation_code)}</strong></div>
                      <div><span>Source prerequisite</span><strong>{humanize(row.source_observation_status)}</strong></div>
                      <div><span>Customer impact review</span><strong>{row.customer_impact_review_required ? 'Required' : 'Not required'}</strong></div>
                      <div><span>Template default severity</span><strong>{humanize(row.default_severity)}</strong><small>Template default only; not an observed severity.</small></div>
                    </div>

                    <div className="platform-incident-triage__precondition-box">
                      <strong>Manual precondition</strong>
                      <span>{row.manual_precondition}</span>
                    </div>

                    <div className="platform-incident-triage__evidence-box">
                      <strong>Escalation trigger</strong>
                      <span>{humanize(row.escalation_trigger)}</span>
                    </div>

                    <div className="platform-incident-triage__row-actions">
                      <Link className="app-button app-button--secondary" to={getTriageEvidenceLink(row)}>{getTriageEvidenceLabel(row)}</Link>
                    </div>

                    <div className="platform-incident-triage__artifact-grid">
                      <div>
                        <strong>Source observation artifact</strong>
                        <span>{row.source_observation_artifact}</span>
                        <small>{humanize(row.source_observation_artifact_storage)}</small>
                      </div>
                      <div>
                        <strong>External triage artifact</strong>
                        <span>{row.triage_artifact}</span>
                        <small>{humanize(row.triage_artifact_storage)}</small>
                      </div>
                    </div>

                    <div className="platform-incident-triage__evidence-box">
                      <strong>Triage actions</strong>
                      <ul>{row.triage_actions.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>

                    <div className="platform-incident-triage__field-groups">
                      <div>
                        <strong>Allowed severity values</strong>
                        <div className="platform-incident-triage__chips">
                          {row.severity_values.map((item) => (
                            <span key={item} data-tone={badgeTone(item)}>{humanize(item)}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong>Required external triage fields</strong>
                        <div className="platform-incident-triage__chips">
                          {row.required_triage_fields.map((field) => <span key={field}>{humanize(field)}</span>)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-incident-triage__rules-grid">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-incident-triage"
                title="Triage rules"
                description="Guardrails that determine when an external incident-triage record may be prepared."
              />
              <ul>{data.triage_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-incident-triage"
                title="Triage limitations"
                description="Claims and actions this read-only queue deliberately does not make."
              />
              <ul>{data.triage_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-incident-triage__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>

          <section className="app-panel app-panel--padded platform-incident-triage__snapshot-note">
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
