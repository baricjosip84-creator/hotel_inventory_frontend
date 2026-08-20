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
import './PlatformCommercialLaunchRolloutExpansionAuthorizationPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type ExpansionRow = {
  code: string;
  source_prevention_code: string;
  source_closure_code: string;
  source_triage_code: string;
  source_observation_code: string;
  domain: string;
  owner: string;
  source_verification_status: string;
  source_default_severity: string;
  source_prevention_artifact: string;
  source_prevention_artifact_storage: string;
  customer_impact_review_required: boolean;
  manual_precondition: string;
  required_authorization_fields: string[];
  accepted_expansion_decisions: string[];
  default_expansion_decision: string;
  authorization_artifact: string;
  authorization_artifact_storage: string;
  expansion_requirements: string[];
  authorization_status: string;
};

type RolloutExpansionAuthorization = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  expansion_rows: ExpansionRow[];
  prevention_verification_posture: string;
  prevention_verification_persistence: PersistenceBoundary | null;
  incident_closure_posture: string;
  incident_triage_posture: string;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  rollout_expansion_persistence: PersistenceBoundary;
  expansion_rules: string[];
  expansion_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  expansion_rows_total: 'Authorization rows',
  waiting_for_post_launch_evidence_review: 'Post-launch review',
  waiting_for_external_go_no_go_confirmation: 'Awaiting Go/No-Go',
  waiting_for_external_smoke_test_confirmation: 'Awaiting smoke test',
  waiting_for_external_launch_window_confirmation: 'Awaiting launch window',
  waiting_for_external_post_launch_observation_confirmation: 'Awaiting observation',
  waiting_for_external_triage_confirmation: 'Awaiting triage confirmation',
  waiting_for_external_incident_closure_confirmation: 'Awaiting closure confirmation',
  waiting_for_external_prevention_verification_confirmation: 'Awaiting prevention confirmation',
  blocked_until_prevention_verification_ready: 'Blocked rows',
  authorization_records_persisted_in_application: 'Authorization records stored here'
};

const summaryHelpers: Record<string, string> = {
  expansion_rows_total: 'External rollout-expansion authorization records prepared by this read-only board',
  waiting_for_post_launch_evidence_review: 'Rows held until upstream post-launch evidence review is resolved',
  waiting_for_external_go_no_go_confirmation: 'Rows waiting for independently confirmed Go/No-Go decisions',
  waiting_for_external_smoke_test_confirmation: 'Rows waiting for independently confirmed smoke-test results',
  waiting_for_external_launch_window_confirmation: 'Rows waiting for the real launch window and production launch to be confirmed',
  waiting_for_external_post_launch_observation_confirmation: 'Rows waiting for an external post-launch observation record',
  waiting_for_external_triage_confirmation: 'Rows waiting for the externally recorded incident-triage record',
  waiting_for_external_incident_closure_confirmation: 'Rows waiting for the externally recorded incident-closure record',
  waiting_for_external_prevention_verification_confirmation: 'Rows waiting for the externally recorded prevention-verification record',
  blocked_until_prevention_verification_ready: 'Rows that cannot proceed with the current Prevention Verification posture',
  authorization_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no authorization outcomes'
};

const sourcePostures = [
  { label: 'Prevention verification', key: 'prevention_verification_posture', to: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident closure', key: 'incident_closure_posture', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', key: 'incident_triage_posture', to: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch observation', key: 'post_launch_observation_posture', to: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Launch command center', key: 'command_center_posture', to: '/platform/commercial-launch-day-command-center' },
  { label: 'Launch smoke test', key: 'smoke_test_posture', to: '/platform/commercial-launch-smoke-test-checklist' },
  { label: 'Launch Go/No-Go', key: 'go_no_go_register_posture', to: '/platform/commercial-launch-go-no-go-register' }
] as const;

const supportingLinks = [
  { label: 'Prevention verification', to: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident closure', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', to: '/platform/commercial-launch-incident-triage' },
  { label: 'Expansion health', to: '/platform/commercial-launch-expansion-health-observation' }
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
    { label: 'Prevention verification', to: '/platform/commercial-launch-prevention-verification' },
    { label: 'Expansion health', to: '/platform/commercial-launch-expansion-health-observation' }
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

function evidenceLinksForDomain(domain: string) {
  return domainEvidenceLinks[domain] || [
    { label: 'Prevention verification', to: '/platform/commercial-launch-prevention-verification' }
  ];
}

export default function PlatformCommercialLaunchRolloutExpansionAuthorizationPage() {
  const expansion = useQuery({
    queryKey: ['platform', 'commercial-launch-rollout-expansion-authorization'],
    queryFn: () => platformApiRequest<RolloutExpansionAuthorization>('/platform/commercial-launch-rollout-expansion-authorization'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = expansion.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = expansion.isError && !data;
  const refreshError = expansion.isError && Boolean(data);
  const requestError = readableError(expansion.error);

  return (
    <div className="io-operational-page io-workspace-page platform-rollout-expansion">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-rollout-expansion-authorization"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Rollout Expansion Authorization"
        description="Read-only preparation for external rollout-expansion authorization after Prevention Verification. It organizes source lineage, requested scope, prevention evidence, support and customer-success capacity, rollback readiness, monitoring ownership, product/executive approval and expansion decisions without claiming that an external prevention record or rollout authorization exists."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 226 — Commercial Launch Rollout Expansion Authorization Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Rollout expansion preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External authorization record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-rollout-expansion__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? data.summary.expansion_rows_total ?? data.expansion_rows.length : '—'}
              label="rollout authorization rows"
            />
            {data ? (
              <span className="platform-rollout-expansion__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-rollout-expansion__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void expansion.refetch()}
                disabled={expansion.isFetching}
              >
                {expansion.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-rollout-expansion__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-rollout-expansion-authorization"
          title="External confirmation boundary"
          description="This board prepares the structure of a rollout-expansion authorization record; it does not observe or persist the real Prevention Verification or rollout-expansion decision."
        />
        <div className="platform-rollout-expansion__boundary-grid">
          <div className="platform-rollout-expansion__boundary-notice">
            <strong>Rollout expansion preparation only.</strong>
            <span>
              Before rollout expansion can be authorized, independently confirm the external Prevention Verification record for the relevant domain. Requested tenant scope, prevention evidence, support/customer-success capacity, rollback readiness, monitoring ownership, product/executive approval and the final expansion decision must be recorded outside this application.
            </span>
          </div>
          <div className="platform-rollout-expansion__supporting-pages">
            <strong>Supporting rollout-authorization pages</strong>
            <span>This page already requires the evidence permissions used by these destinations, so these shortcuts do not bypass a stricter destination permission boundary.</span>
            <div className="platform-rollout-expansion__link-row">
              {supportingLinks.map((link) => (
                <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {expansion.isLoading ? (
        <section className="app-panel app-panel--padded">Loading Commercial Launch Rollout Expansion Authorization…</section>
      ) : null}

      {initialLoadError ? (
        <section className="app-error-state platform-rollout-expansion__feedback" role="alert">
          <strong>Unable to load Commercial Launch Rollout Expansion Authorization.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-rollout-expansion__retry"
            onClick={() => void expansion.refetch()}
            disabled={expansion.isFetching}
          >
            {expansion.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-rollout-expansion__feedback platform-rollout-expansion__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Rollout Expansion Authorization snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-rollout-expansion__retry"
            onClick={() => void expansion.refetch()}
            disabled={expansion.isFetching}
          >
            {expansion.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Rollout expansion authorization summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-rollout-expansion-authorization"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only rollout-expansion authorization preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-rollout-expansion__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-prevention-verification"
              title="Source launch posture"
              description="Current upstream launch postures and persistence boundaries supplied by the prevention-to-rollout evidence chain."
            />
            <div className="platform-rollout-expansion__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}>
                  <strong>{source.label}</strong>
                  <span>{humanize(data[source.key])}</span>
                  <Link to={source.to}>Open source board</Link>
                </div>
              ))}
            </div>
            <div className="platform-rollout-expansion__persistence-grid">
              <div>
                <strong>Prevention-verification persistence</strong>
                <span>{persistenceLabel(data.prevention_verification_persistence)}</span>
                <small>{data.prevention_verification_persistence?.interpretation || 'Prevention Verification persistence details are not available in this snapshot.'}</small>
              </div>
              <div>
                <strong>Rollout-authorization persistence</strong>
                <span>{persistenceLabel(data.rollout_expansion_persistence)}</span>
                <small>{data.rollout_expansion_persistence.interpretation}</small>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-rollout-expansion__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-rollout-expansion-authorization"
              title="Rollout expansion authorization rows"
              description="External authorization templates derived from Prevention Verification. Each row preserves its observation → triage → closure → prevention lineage and remains read-only in this application."
            />

            {data.expansion_rows.length === 0 ? (
              <div className="platform-rollout-expansion__empty-state">
                <strong>No rollout-expansion authorization rows were produced.</strong>
                <span>This is not evidence that expansion is authorized, unnecessary or complete; it only means the current read-only source board returned no rows.</span>
              </div>
            ) : (
              <div className="platform-rollout-expansion__row-grid">
                {data.expansion_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-rollout-expansion__row-card">
                    <div className="platform-rollout-expansion__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span>
                      </div>
                      <span className="platform-rollout-expansion__status-badge" data-tone={badgeTone(row.authorization_status)}>
                        {humanize(row.authorization_status)}
                      </span>
                    </div>

                    <div className="platform-rollout-expansion__source-summary">
                      <div><span>Source observation</span><strong>{humanize(row.source_observation_code)}</strong><small>Upstream post-launch observation reference.</small></div>
                      <div><span>Source triage</span><strong>{humanize(row.source_triage_code)}</strong><small>Upstream incident-triage reference.</small></div>
                      <div><span>Source closure</span><strong>{humanize(row.source_closure_code)}</strong><small>Upstream incident-closure reference.</small></div>
                      <div><span>Source prevention</span><strong>{humanize(row.source_prevention_code)}</strong><small>External prevention-verification template reference.</small></div>
                      <div><span>Source prevention prerequisite</span><strong>{humanize(row.source_verification_status)}</strong></div>
                      <div><span>Customer impact review</span><strong>{row.customer_impact_review_required ? 'Required' : 'Not required'}</strong></div>
                      <div><span>Source template default severity</span><strong>{humanize(row.source_default_severity)}</strong><small>Template default only; not an observed final severity.</small></div>
                      <div><span>Template default expansion decision</span><strong>{humanize(row.default_expansion_decision)}</strong><small>Template default only; not an observed rollout-expansion decision.</small></div>
                    </div>

                    <div className="platform-rollout-expansion__precondition-box">
                      <strong>Manual precondition</strong>
                      <span>{row.manual_precondition}</span>
                    </div>

                    <div className="platform-rollout-expansion__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => (
                        <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>
                      ))}
                    </div>

                    <div className="platform-rollout-expansion__artifact-grid">
                      <div>
                        <strong>Source prevention artifact</strong>
                        <span>{row.source_prevention_artifact}</span>
                        <small>{humanize(row.source_prevention_artifact_storage)}</small>
                      </div>
                      <div>
                        <strong>External authorization artifact</strong>
                        <span>{row.authorization_artifact}</span>
                        <small>{humanize(row.authorization_artifact_storage)}</small>
                      </div>
                    </div>

                    <div className="platform-rollout-expansion__evidence-box">
                      <strong>Expansion requirements</strong>
                      <ul>{row.expansion_requirements.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>

                    <div className="platform-rollout-expansion__field-groups">
                      <div>
                        <strong>Allowed expansion decisions</strong>
                        <div className="platform-rollout-expansion__chips">
                          {row.accepted_expansion_decisions.map((item) => (
                            <span key={item} data-tone={badgeTone(item)}>{humanize(item)}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong>Required external authorization fields</strong>
                        <div className="platform-rollout-expansion__chips">
                          {row.required_authorization_fields.map((field) => <span key={field}>{humanize(field)}</span>)}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-rollout-expansion__rules-grid">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-rollout-expansion-authorization"
                title="Expansion rules"
                description="Guardrails that determine when an external rollout-expansion authorization record may be prepared and accepted."
              />
              <ul>{data.expansion_rules.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-rollout-expansion-authorization"
                title="Expansion limitations"
                description="Claims and actions this read-only authorization board deliberately does not make."
              />
              <ul>{data.expansion_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-rollout-expansion__next-step">
            <strong>Next best step</strong>
            <span>{data.next_best_step}</span>
          </section>

          <section className="app-panel app-panel--padded platform-rollout-expansion__snapshot-note">
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
