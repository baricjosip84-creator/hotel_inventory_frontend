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
import './PlatformCommercialLaunchPreventionVerificationPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type PreventionRow = {
  code: string;
  source_closure_code: string;
  source_triage_code: string;
  source_observation_code: string;
  domain: string;
  owner: string;
  source_closure_status: string;
  source_default_severity: string;
  source_closure_artifact: string;
  source_closure_artifact_storage: string;
  customer_impact_review_required: boolean;
  manual_precondition: string;
  required_prevention_fields: string[];
  accepted_rollout_expansion_decisions: string[];
  default_rollout_expansion_decision: string;
  prevention_artifact: string;
  prevention_artifact_storage: string;
  prevention_requirements: string[];
  verification_status: string;
};

type PreventionVerification = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  prevention_rows: PreventionRow[];
  incident_closure_posture: string;
  incident_closure_persistence: PersistenceBoundary | null;
  incident_triage_posture: string;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  prevention_persistence: PersistenceBoundary;
  prevention_rules: string[];
  prevention_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  prevention_rows_total: 'Prevention rows',
  waiting_for_post_launch_evidence_review: 'Post-launch review',
  waiting_for_external_go_no_go_confirmation: 'Awaiting Go/No-Go',
  waiting_for_external_smoke_test_confirmation: 'Awaiting smoke test',
  waiting_for_external_launch_window_confirmation: 'Awaiting launch window',
  waiting_for_external_post_launch_observation_confirmation: 'Awaiting observation',
  waiting_for_external_triage_confirmation: 'Awaiting triage confirmation',
  waiting_for_external_incident_closure_confirmation: 'Awaiting closure confirmation',
  blocked_until_incident_closure_ready: 'Blocked rows',
  prevention_records_persisted_in_application: 'Prevention records stored here'
};

const summaryHelpers: Record<string, string> = {
  prevention_rows_total: 'External prevention-verification records prepared by this read-only board',
  waiting_for_post_launch_evidence_review: 'Rows held until upstream post-launch evidence review is resolved',
  waiting_for_external_go_no_go_confirmation: 'Rows waiting for independently confirmed Go/No-Go decisions',
  waiting_for_external_smoke_test_confirmation: 'Rows waiting for independently confirmed smoke-test results',
  waiting_for_external_launch_window_confirmation: 'Rows waiting for the real launch window and production launch to be confirmed',
  waiting_for_external_post_launch_observation_confirmation: 'Rows waiting for an external post-launch observation record',
  waiting_for_external_triage_confirmation: 'Rows waiting for the externally recorded incident-triage record',
  waiting_for_external_incident_closure_confirmation: 'Rows waiting for the externally recorded incident-closure record',
  blocked_until_incident_closure_ready: 'Rows that cannot proceed with the current Incident Closure posture',
  prevention_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no prevention outcomes'
};

const sourcePostures = [
  { label: 'Incident closure', key: 'incident_closure_posture', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', key: 'incident_triage_posture', to: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch observation', key: 'post_launch_observation_posture', to: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Launch command center', key: 'command_center_posture', to: '/platform/commercial-launch-day-command-center' },
  { label: 'Launch smoke test', key: 'smoke_test_posture', to: '/platform/commercial-launch-smoke-test-checklist' },
  { label: 'Launch Go/No-Go', key: 'go_no_go_register_posture', to: '/platform/commercial-launch-go-no-go-register' }
] as const;

const supportingLinks = [
  { label: 'Incident closure', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', to: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch observation', to: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Rollout expansion authorization', to: '/platform/commercial-launch-rollout-expansion-authorization' }
];

const domainEvidenceLinks: Record<string, { label: string; to: string }[]> = {
  service_health: [
    { label: 'System health', to: '/platform/system-health' },
    { label: 'Monitoring readiness', to: '/platform/production-monitoring-readiness' }
  ],
  customer_feedback: [
    { label: 'Customer success', to: '/platform/customer-success-admin' },
    { label: 'Tenant communications', to: '/platform/tenant-communications' }
  ],
  support_intake: [
    { label: 'Support cockpit', to: '/platform/support-cockpit' },
    { label: 'Tenant SLA', to: '/platform/tenant-sla' }
  ],
  billing_confirmation: [
    { label: 'Billing', to: '/platform/billing' },
    { label: 'Billing activation', to: '/platform/billing-subscription-activation' },
    { label: 'License enforcement', to: '/platform/license-plan-enforcement' }
  ],
  incident_review: [
    { label: 'Incidents', to: '/platform/incidents' },
    { label: 'Incident closure', to: '/platform/commercial-launch-incident-closure' }
  ],
  rollback_readiness: [
    { label: 'Runbooks', to: '/platform/runbooks' },
    { label: 'Launch command center', to: '/platform/commercial-launch-day-command-center' }
  ],
  adoption_signal: [
    { label: 'Tenant health', to: '/platform/tenant-health' },
    { label: 'Customer success', to: '/platform/customer-success-admin' }
  ],
  handoff_closure: [
    { label: 'Incident closure', to: '/platform/commercial-launch-incident-closure' },
    { label: 'Rollout expansion authorization', to: '/platform/commercial-launch-rollout-expansion-authorization' }
  ]
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
    || normalized.includes('rollback')
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
    || normalized.includes('hold')
  ) return 'warn';
  if (
    normalized.includes('accepted')
    || normalized.includes('ready')
    || normalized.includes('healthy')
    || normalized.includes('clear')
    || normalized === 'continue'
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

function persistenceLabel(value: PersistenceBoundary | null) {
  if (!value) return 'Not reported';
  if (value.stored_in_application) return 'Stored in application';
  if (!value.external_records_observable) return 'External records not observable';
  return 'External evidence observable';
}

function evidenceLinksForDomain(domain: string) {
  return domainEvidenceLinks[domain] || [
    { label: 'Incident closure', to: '/platform/commercial-launch-incident-closure' }
  ];
}

export default function PlatformCommercialLaunchPreventionVerificationPage() {
  const prevention = useQuery({
    queryKey: ['platform', 'commercial-launch-prevention-verification'],
    queryFn: () => platformApiRequest<PreventionVerification>('/platform/commercial-launch-prevention-verification'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = prevention.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = prevention.isError && !data;
  const refreshError = prevention.isError && Boolean(data);
  const requestError = readableError(prevention.error);

  return (
    <div className="io-operational-page io-workspace-page platform-prevention-verification">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-prevention-verification"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Prevention Verification"
        description="Read-only preparation for external prevention-verification decisions after Incident Closure. It organizes source traceability, prevention actions, implementation evidence, effectiveness review, monitoring re-entry, recurrence ownership, customer-success acknowledgement and rollout-expansion decisions without claiming that external closure or prevention outcomes exist."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 225 — Commercial Launch Prevention Verification Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Prevention preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External prevention record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-prevention-verification__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? data.summary.prevention_rows_total ?? data.prevention_rows.length : '—'}
              label="prevention verification rows"
            />
            {data ? (
              <span className="platform-prevention-verification__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-prevention-verification__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void prevention.refetch()}
                disabled={prevention.isFetching}
              >
                {prevention.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-prevention-verification__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-prevention-verification"
          title="External confirmation boundary"
          description="This board prepares the structure of a prevention-verification record; it does not observe or persist the real Incident Closure or prevention decision."
        />
        <div className="platform-prevention-verification__boundary-grid">
          <div className="platform-prevention-verification__boundary-notice">
            <strong>Prevention preparation only.</strong>
            <span>
              Before prevention verification can proceed, independently confirm the external Incident Closure record for the relevant domain. Prevention implementation, effectiveness review, monitoring re-entry, recurrence watch, customer-success acknowledgement and rollout-expansion decisions must be recorded outside this application.
            </span>
          </div>
          <div className="platform-prevention-verification__supporting-pages">
            <strong>Supporting prevention-verification pages</strong>
            <span>This page already requires the evidence permissions used by these destinations, so these shortcuts do not bypass a stricter destination permission boundary.</span>
            <div className="platform-prevention-verification__link-row">
              {supportingLinks.map((link) => (
                <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {prevention.isLoading ? (
        <section className="app-panel app-panel--padded">Loading Commercial Launch Prevention Verification…</section>
      ) : null}

      {initialLoadError ? (
        <section className="app-error-state platform-prevention-verification__feedback" role="alert">
          <strong>Unable to load Commercial Launch Prevention Verification.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-prevention-verification__retry"
            onClick={() => void prevention.refetch()}
            disabled={prevention.isFetching}
          >
            {prevention.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-prevention-verification__feedback platform-prevention-verification__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Prevention Verification snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-prevention-verification__retry"
            onClick={() => void prevention.refetch()}
            disabled={prevention.isFetching}
          >
            {prevention.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Prevention verification summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-prevention-verification"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only prevention-verification preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-prevention-verification__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-incident-closure"
              title="Source launch posture"
              description="Current upstream launch postures and persistence boundaries supplied by the incident-to-prevention evidence chain."
            />
            <div className="platform-prevention-verification__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}>
                  <strong>{source.label}</strong>
                  <span>{humanize(data[source.key])}</span>
                  <Link to={source.to}>Open source board</Link>
                </div>
              ))}
            </div>
            <div className="platform-prevention-verification__persistence-grid">
              <div>
                <strong>Incident-closure persistence</strong>
                <span>{persistenceLabel(data.incident_closure_persistence)}</span>
                <small>{data.incident_closure_persistence?.interpretation || 'Incident Closure persistence details are not available in this snapshot.'}</small>
              </div>
              <div>
                <strong>Prevention-verification persistence</strong>
                <span>{persistenceLabel(data.prevention_persistence)}</span>
                <small>{data.prevention_persistence.interpretation}</small>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-prevention-verification__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-prevention-verification"
              title="Prevention verification rows"
              description="External prevention-verification templates derived from Incident Closure. Each row preserves its observation → triage → closure lineage and remains read-only in this application."
            />

            {data.prevention_rows.length === 0 ? (
              <div className="platform-prevention-verification__empty-state">
                <strong>No prevention preparation rows were produced.</strong>
                <span>This is not evidence that prevention is complete or that no external prevention-verification work exists; it only means the current read-only source board returned no rows.</span>
              </div>
            ) : (
              <div className="platform-prevention-verification__row-grid">
                {data.prevention_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-prevention-verification__row-card">
                    <div className="platform-prevention-verification__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span>
                      </div>
                      <span className="platform-prevention-verification__status-badge" data-tone={badgeTone(row.verification_status)}>
                        {humanize(row.verification_status)}
                      </span>
                    </div>

                    <div className="platform-prevention-verification__source-summary">
                      <div><span>Source observation</span><strong>{humanize(row.source_observation_code)}</strong><small>Upstream post-launch observation reference.</small></div>
                      <div><span>Source triage</span><strong>{humanize(row.source_triage_code)}</strong><small>Upstream incident-triage reference.</small></div>
                      <div><span>Source closure</span><strong>{humanize(row.source_closure_code)}</strong><small>External incident-closure template reference.</small></div>
                      <div><span>Source closure prerequisite</span><strong>{humanize(row.source_closure_status)}</strong></div>
                      <div><span>Customer impact review</span><strong>{row.customer_impact_review_required ? 'Required' : 'Not required'}</strong></div>
                      <div><span>Source template default severity</span><strong>{humanize(row.source_default_severity)}</strong><small>Template default only; not an observed final severity.</small></div>
                      <div><span>Template default rollout decision</span><strong>{humanize(row.default_rollout_expansion_decision)}</strong><small>Template default only; not an observed rollout-expansion decision.</small></div>
                    </div>

                    <div className="platform-prevention-verification__precondition-box">
                      <strong>Manual precondition</strong>
                      <span>{row.manual_precondition}</span>
                    </div>

                    <div className="platform-prevention-verification__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => (
                        <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>
                      ))}
                    </div>

                    <div className="platform-prevention-verification__artifact-grid">
                      <div>
                        <strong>Source closure artifact</strong>
                        <span>{row.source_closure_artifact}</span>
                        <small>{humanize(row.source_closure_artifact_storage)}</small>
                      </div>
                      <div>
                        <strong>External prevention artifact</strong>
                        <span>{row.prevention_artifact}</span>
                        <small>{humanize(row.prevention_artifact_storage)}</small>
                      </div>
                    </div>

                    <div className="platform-prevention-verification__evidence-box">
                      <strong>Prevention requirements</strong>
                      <ul>{row.prevention_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>

                    <div className="platform-prevention-verification__field-groups">
                      <div>
                        <strong>Allowed rollout-expansion decisions</strong>
                        <div className="platform-prevention-verification__chips">
                          {row.accepted_rollout_expansion_decisions.map((item) => (
                            <span key={item} data-tone={badgeTone(item)}>{humanize(item)}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong>Required external prevention fields</strong>
                        <div className="platform-prevention-verification__chips">
                          {row.required_prevention_fields.map((field) => <span key={field}>{humanize(field)}</span>)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-prevention-verification__rules-grid">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-prevention-verification"
                title="Prevention rules"
                description="Guardrails that determine when an external prevention-verification record may be prepared and accepted."
              />
              <ul>{data.prevention_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-prevention-verification"
                title="Prevention limitations"
                description="Claims and actions this read-only board deliberately does not make."
              />
              <ul>{data.prevention_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-prevention-verification__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>

          <section className="app-panel app-panel--padded platform-prevention-verification__snapshot-note">
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
