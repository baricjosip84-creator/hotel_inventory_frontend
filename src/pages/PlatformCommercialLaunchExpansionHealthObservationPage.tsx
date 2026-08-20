import { useMemo } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS, type PlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformCommercialLaunchExpansionHealthObservationPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type ObservationRow = {
  code: string;
  source_expansion_code: string;
  source_prevention_code: string;
  source_closure_code: string;
  source_triage_code: string;
  source_observation_code: string;
  domain: string;
  owner: string;
  source_authorization_status: string;
  source_authorization_artifact: string;
  source_authorization_artifact_storage: string;
  customer_impact_review_required: boolean;
  manual_precondition: string;
  required_observation_fields: string[];
  accepted_next_expansion_recommendations: string[];
  default_next_expansion_recommendation: string;
  observation_artifact: string;
  observation_artifact_storage: string;
  observation_requirements: string[];
  observation_status: string;
};

type ExpansionHealthObservation = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  observation_rows: ObservationRow[];
  rollout_expansion_authorization_posture: string;
  rollout_expansion_authorization_persistence: PersistenceBoundary | null;
  prevention_verification_posture: string;
  incident_closure_posture: string;
  incident_triage_posture: string;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  expansion_health_persistence: PersistenceBoundary;
  observation_rules: string[];
  observation_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

type PageLink = {
  label: string;
  to: string;
  permission?: PlatformPermission;
};

const summaryLabels: Record<string, string> = {
  observation_rows_total: 'Observation rows',
  waiting_for_post_launch_evidence_review: 'Post-launch review',
  waiting_for_external_go_no_go_confirmation: 'Awaiting Go/No-Go',
  waiting_for_external_smoke_test_confirmation: 'Awaiting smoke test',
  waiting_for_external_launch_window_confirmation: 'Awaiting launch window',
  waiting_for_external_post_launch_observation_confirmation: 'Awaiting observation',
  waiting_for_external_triage_confirmation: 'Awaiting triage confirmation',
  waiting_for_external_incident_closure_confirmation: 'Awaiting closure confirmation',
  waiting_for_external_prevention_verification_confirmation: 'Awaiting prevention confirmation',
  waiting_for_external_rollout_expansion_authorization_confirmation: 'Awaiting rollout authorization',
  blocked_until_rollout_expansion_authorization_ready: 'Blocked rows',
  observation_records_persisted_in_application: 'Observation records stored here'
};

const summaryHelpers: Record<string, string> = {
  observation_rows_total: 'Expanded-cohort observation templates prepared by this read-only board',
  waiting_for_post_launch_evidence_review: 'Rows held until upstream post-launch evidence review is resolved',
  waiting_for_external_go_no_go_confirmation: 'Rows waiting for independently confirmed Go/No-Go decisions',
  waiting_for_external_smoke_test_confirmation: 'Rows waiting for independently confirmed smoke-test results',
  waiting_for_external_launch_window_confirmation: 'Rows waiting for the real launch window and production launch to be confirmed',
  waiting_for_external_post_launch_observation_confirmation: 'Rows waiting for an external post-launch observation record',
  waiting_for_external_triage_confirmation: 'Rows waiting for the externally recorded incident-triage record',
  waiting_for_external_incident_closure_confirmation: 'Rows waiting for the externally recorded incident-closure record',
  waiting_for_external_prevention_verification_confirmation: 'Rows waiting for the externally recorded prevention-verification record',
  waiting_for_external_rollout_expansion_authorization_confirmation: 'Rows waiting for the externally recorded rollout-expansion authorization',
  blocked_until_rollout_expansion_authorization_ready: 'Rows that cannot proceed with the current Rollout Expansion posture',
  observation_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no expansion-health outcomes'
};

const sourcePostures = [
  { label: 'Rollout expansion authorization', key: 'rollout_expansion_authorization_posture', to: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Prevention verification', key: 'prevention_verification_posture', to: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident closure', key: 'incident_closure_posture', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', key: 'incident_triage_posture', to: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch observation', key: 'post_launch_observation_posture', to: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Launch command center', key: 'command_center_posture', to: '/platform/commercial-launch-day-command-center' },
  { label: 'Launch smoke test', key: 'smoke_test_posture', to: '/platform/commercial-launch-smoke-test-checklist' },
  { label: 'Launch Go/No-Go', key: 'go_no_go_register_posture', to: '/platform/commercial-launch-go-no-go-register' }
] as const;

const supportingLinks: PageLink[] = [
  { label: 'Rollout expansion', to: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Prevention verification', to: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident closure', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Additional growth authorization', to: '/platform/commercial-launch-additional-growth-authorization' }
];

const domainEvidenceLinks: Record<string, PageLink[]> = {
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
    { label: 'Operational jobs', to: '/platform/operational-jobs', permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ },
    { label: 'Additional growth authorization', to: '/platform/commercial-launch-additional-growth-authorization' }
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
  if (normalized.includes('blocked') || normalized.includes('rollback') || normalized.includes('fail')) return 'danger';
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
    || normalized.includes('approved')
    || normalized.includes('ready')
    || normalized.includes('healthy')
    || normalized.includes('clear')
    || normalized.includes('continue')
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

function visibleLinks(links: PageLink[]) {
  return links.filter((link) => !link.permission || hasPlatformPermission(link.permission));
}

function evidenceLinksForDomain(domain: string) {
  return visibleLinks(domainEvidenceLinks[domain] || [
    { label: 'Rollout expansion', to: '/platform/commercial-launch-rollout-expansion-authorization' }
  ]);
}

export default function PlatformCommercialLaunchExpansionHealthObservationPage() {
  const observation = useQuery({
    queryKey: ['platform', 'commercial-launch-expansion-health-observation'],
    queryFn: () => platformApiRequest<ExpansionHealthObservation>('/platform/commercial-launch-expansion-health-observation'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = observation.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = observation.isError && !data;
  const refreshError = observation.isError && Boolean(data);
  const requestError = readableError(observation.error);

  return (
    <div className="io-operational-page io-workspace-page platform-expansion-health">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-expansion-health-observation"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Expansion Health Observation"
        description="Read-only preparation for expanded-cohort health observation after Rollout Expansion Authorization. It organizes the complete source lineage, cohort-health evidence, support/customer-success review, billing/entitlement review, incident and rollback evidence, adoption signals and next-growth recommendation without claiming that rollout expansion occurred or that an external observation record exists."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 227 — Commercial Launch Expansion Health Observation Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Expansion-health preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External observation record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-expansion-health__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? data.summary.observation_rows_total ?? data.observation_rows.length : '—'}
              label="expansion health rows"
            />
            {data ? (
              <span className="platform-expansion-health__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-expansion-health__refresh-block">
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

      <section className="app-panel app-panel--padded platform-expansion-health__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-expansion-health-observation"
          title="External confirmation boundary"
          description="This board prepares an expanded-cohort observation record; it does not observe or persist the real rollout-expansion authorization or the real expansion-health result."
        />
        <div className="platform-expansion-health__boundary-grid">
          <div className="platform-expansion-health__boundary-notice">
            <strong>Expansion-health preparation only.</strong>
            <span>
              Before expanded-cohort health observation can be accepted, independently confirm the external Rollout Expansion authorization record for the relevant domain. Actual cohort health, support/customer-success, billing/entitlement, incident, rollback, adoption and next-expansion evidence must be recorded outside this application.
            </span>
          </div>
          <div className="platform-expansion-health__supporting-pages">
            <strong>Supporting expansion-health pages</strong>
            <span>Shortcuts are shown only when the current operator can open the destination. In particular, Operational Jobs remains hidden without its additional jobs-read permission.</span>
            <div className="platform-expansion-health__link-row">
              {visibleLinks(supportingLinks).map((link) => (
                <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {observation.isLoading ? (
        <section className="app-panel app-panel--padded">Loading Commercial Launch Expansion Health Observation…</section>
      ) : null}

      {initialLoadError ? (
        <section className="app-error-state platform-expansion-health__feedback" role="alert">
          <strong>Unable to load Commercial Launch Expansion Health Observation.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-expansion-health__retry"
            onClick={() => void observation.refetch()}
            disabled={observation.isFetching}
          >
            {observation.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-expansion-health__feedback platform-expansion-health__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Expansion Health Observation snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-expansion-health__retry"
            onClick={() => void observation.refetch()}
            disabled={observation.isFetching}
          >
            {observation.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Expansion health observation summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-expansion-health-observation"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only expanded-cohort observation preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-expansion-health__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-rollout-expansion-authorization"
              title="Source launch posture"
              description="Current upstream launch postures and persistence boundaries supplied by the rollout-expansion evidence chain."
            />
            <div className="platform-expansion-health__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}>
                  <strong>{source.label}</strong>
                  <span>{humanize(data[source.key])}</span>
                  <Link to={source.to}>Open source board</Link>
                </div>
              ))}
            </div>
            <div className="platform-expansion-health__persistence-grid">
              <div>
                <strong>Rollout-authorization persistence</strong>
                <span>{persistenceLabel(data.rollout_expansion_authorization_persistence)}</span>
                <small>{data.rollout_expansion_authorization_persistence?.interpretation || 'Rollout Expansion persistence details are not available in this snapshot.'}</small>
              </div>
              <div>
                <strong>Expansion-health persistence</strong>
                <span>{persistenceLabel(data.expansion_health_persistence)}</span>
                <small>{data.expansion_health_persistence.interpretation}</small>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-expansion-health__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-expansion-health-observation"
              title="Expansion health observation rows"
              description="External observation templates derived from Rollout Expansion Authorization. Each row preserves its observation → triage → closure → prevention → rollout → expansion-health lineage and remains read-only in this application."
            />

            {data.observation_rows.length === 0 ? (
              <div className="platform-expansion-health__empty-state">
                <strong>No expansion-health observation rows were produced.</strong>
                <span>This is not evidence that rollout expansion did not occur, that the expanded cohort is healthy, or that additional growth is safe; it only means the current read-only source board returned no rows.</span>
              </div>
            ) : (
              <div className="platform-expansion-health__row-grid">
                {data.observation_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-expansion-health__row-card">
                    <div className="platform-expansion-health__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span>
                      </div>
                      <span className="platform-expansion-health__status-badge" data-tone={badgeTone(row.observation_status)}>
                        {humanize(row.observation_status)}
                      </span>
                    </div>

                    <div className="platform-expansion-health__source-summary">
                      <div><span>Source observation</span><strong>{humanize(row.source_observation_code)}</strong><small>Upstream post-launch observation reference.</small></div>
                      <div><span>Source triage</span><strong>{humanize(row.source_triage_code)}</strong><small>Upstream incident-triage reference.</small></div>
                      <div><span>Source closure</span><strong>{humanize(row.source_closure_code)}</strong><small>Upstream incident-closure reference.</small></div>
                      <div><span>Source prevention</span><strong>{humanize(row.source_prevention_code)}</strong><small>Upstream prevention-verification reference.</small></div>
                      <div><span>Source rollout authorization</span><strong>{humanize(row.source_expansion_code)}</strong><small>External rollout-expansion authorization template reference.</small></div>
                      <div><span>Source authorization status</span><strong>{humanize(row.source_authorization_status)}</strong></div>
                      <div><span>Customer impact review</span><strong>{row.customer_impact_review_required ? 'Required' : 'Not required'}</strong></div>
                      <div><span>Template default recommendation</span><strong>{humanize(row.default_next_expansion_recommendation)}</strong><small>Template default only; not an observed health or growth decision.</small></div>
                    </div>

                    <div className="platform-expansion-health__precondition-box">
                      <strong>Manual precondition</strong>
                      <span>{row.manual_precondition}</span>
                    </div>

                    <div className="platform-expansion-health__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => (
                        <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>
                      ))}
                    </div>

                    <div className="platform-expansion-health__artifact-grid">
                      <div>
                        <strong>Source authorization artifact</strong>
                        <span>{row.source_authorization_artifact}</span>
                        <small>{humanize(row.source_authorization_artifact_storage)}</small>
                      </div>
                      <div>
                        <strong>External observation artifact</strong>
                        <span>{row.observation_artifact}</span>
                        <small>{humanize(row.observation_artifact_storage)}</small>
                      </div>
                    </div>

                    <div className="platform-expansion-health__evidence-box">
                      <strong>Expansion-health observation requirements</strong>
                      <ul>{row.observation_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>

                    <div className="platform-expansion-health__field-groups">
                      <div>
                        <strong>Allowed next-expansion recommendations</strong>
                        <div className="platform-expansion-health__chips">
                          {row.accepted_next_expansion_recommendations.map((item) => (
                            <span key={item} data-tone={badgeTone(item)}>{humanize(item)}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong>Required external observation fields</strong>
                        <div className="platform-expansion-health__chips">
                          {row.required_observation_fields.map((field) => <span key={field}>{humanize(field)}</span>)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-expansion-health__rules-grid">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-expansion-health-observation"
                title="Observation rules"
                description="Guardrails that determine when an external expanded-cohort observation record may be prepared and accepted."
              />
              <ul>{data.observation_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-expansion-health-observation"
                title="Observation limitations"
                description="Claims and actions this read-only expansion-health board deliberately does not make."
              />
              <ul>{data.observation_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-expansion-health__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>

          <section className="app-panel app-panel--padded platform-expansion-health__snapshot-note">
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
