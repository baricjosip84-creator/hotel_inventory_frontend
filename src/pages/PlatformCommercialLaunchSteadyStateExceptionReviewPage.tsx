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
import './PlatformCommercialLaunchSteadyStateExceptionReviewPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type SourceCadenceStatus = { code: string; status: string; cadence: string };

type ExceptionRow = {
  code: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_cadence_codes: string[];
  source_cadence_statuses: SourceCadenceStatus[];
  source_transition_rows: string[];
  source_observation_rows: string[];
  source_authorization_rows: string[];
  source_operations_cadence_posture: string;
  required_review_evidence: string[];
  exception_controls: string[];
  exception_review_status: string;
  release_condition: string;
};

type ExceptionReview = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  exception_rows: ExceptionRow[];
  operations_cadence_posture: string;
  operations_cadence_persistence: PersistenceBoundary | null;
  steady_state_transition_posture: string;
  steady_state_transition_persistence: PersistenceBoundary | null;
  additional_growth_observation_posture: string;
  additional_growth_observation_persistence: PersistenceBoundary | null;
  additional_growth_authorization_posture: string;
  additional_growth_authorization_persistence: PersistenceBoundary | null;
  expansion_health_observation_posture: string;
  expansion_health_observation_persistence: PersistenceBoundary | null;
  rollout_expansion_authorization_posture: string;
  prevention_verification_posture: string;
  incident_closure_posture: string;
  incident_triage_posture: string;
  post_launch_observation_posture: string;
  command_center_posture: string;
  smoke_test_posture: string;
  go_no_go_register_posture: string;
  exception_review_persistence: PersistenceBoundary;
  exception_review_rules: string[];
  exception_review_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey =
  | 'operations_cadence_posture'
  | 'steady_state_transition_posture'
  | 'additional_growth_observation_posture'
  | 'additional_growth_authorization_posture'
  | 'expansion_health_observation_posture'
  | 'rollout_expansion_authorization_posture'
  | 'prevention_verification_posture'
  | 'incident_closure_posture'
  | 'incident_triage_posture'
  | 'post_launch_observation_posture'
  | 'command_center_posture'
  | 'smoke_test_posture'
  | 'go_no_go_register_posture';

const summaryLabels: Record<string, string> = {
  exception_rows_total: 'Exception-review rows',
  waiting_for_operations_cadence_acceptance: 'Blocked by cadence acceptance',
  waiting_for_manual_exception_review: 'Awaiting manual exception review',
  critical_exception_reviews: 'Critical review templates',
  high_exception_reviews: 'High review templates',
  medium_exception_reviews: 'Medium review templates',
  exception_review_records_persisted_in_application: 'Exception-review records stored here'
};

const summaryHelpers: Record<string, string> = {
  exception_rows_total: 'Read-only exception-review templates derived from Steady-state Operations Cadence',
  waiting_for_operations_cadence_acceptance: 'Rows that remain blocked because cadence evidence is unresolved or externally unconfirmed',
  waiting_for_manual_exception_review: 'Rows ready only for an external manual exception-review record',
  critical_exception_reviews: 'Template severity hints only; not observed external incident severity',
  high_exception_reviews: 'Template severity hints only; not observed external incident severity',
  medium_exception_reviews: 'Template severity hints only; not observed external incident severity',
  exception_review_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external exception-review decisions or closure records'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
  { label: 'Operations cadence', key: 'operations_cadence_posture', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-state transition', key: 'steady_state_transition_posture', to: '/platform/commercial-launch-steady-state-transition' },
  { label: 'Additional growth observation', key: 'additional_growth_observation_posture', to: '/platform/commercial-launch-additional-growth-observation' },
  { label: 'Additional growth authorization', key: 'additional_growth_authorization_posture', to: '/platform/commercial-launch-additional-growth-authorization' },
  { label: 'Expansion health observation', key: 'expansion_health_observation_posture', to: '/platform/commercial-launch-expansion-health-observation' },
  { label: 'Rollout expansion authorization', key: 'rollout_expansion_authorization_posture', to: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Prevention verification', key: 'prevention_verification_posture', to: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident closure', key: 'incident_closure_posture', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', key: 'incident_triage_posture', to: '/platform/commercial-launch-incident-triage' },
  { label: 'Post-launch observation', key: 'post_launch_observation_posture', to: '/platform/commercial-launch-post-launch-observation' },
  { label: 'Launch command center', key: 'command_center_posture', to: '/platform/commercial-launch-day-command-center' },
  { label: 'Launch smoke test', key: 'smoke_test_posture', to: '/platform/commercial-launch-smoke-test-checklist' },
  { label: 'Launch Go/No-Go', key: 'go_no_go_register_posture', to: '/platform/commercial-launch-go-no-go-register' }
];

const supportingLinks: PageLink[] = [
  { label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-State Transition', to: '/platform/commercial-launch-steady-state-transition' },
  { label: 'Additional Growth Observation', to: '/platform/commercial-launch-additional-growth-observation' },
  { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' },
  { label: 'Backup Restore', to: '/platform/backup-restore-validation' },
  { label: 'Support Operations', to: '/platform/support-operations-cockpit' },
  { label: 'Incidents', to: '/platform/incidents' }
];

const domainEvidenceLinks: Record<string, PageLink[]> = {
  missed_cadence: [
    { label: 'Steady-State Transition', to: '/platform/commercial-launch-steady-state-transition' },
    { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' }
  ],
  health_regression: [
    { label: 'System Health', to: '/platform/system-health' },
    { label: 'Dependencies', to: '/platform/service-dependencies' },
    { label: 'Deployment Validation', to: '/platform/deployment-validation' },
    { label: 'Operational Jobs', to: '/platform/operational-jobs', permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ }
  ],
  customer_adoption_risk: [
    { label: 'Customer Success', to: '/platform/customer-success-admin' },
    { label: 'Announcements', to: '/platform/announcements', permission: PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ }
  ],
  support_sla_risk: [
    { label: 'Support Operations', to: '/platform/support-operations-cockpit' },
    { label: 'Incidents', to: '/platform/incidents' }
  ],
  billing_entitlement_exception: [
    { label: 'Billing', to: '/platform/billing' },
    { label: 'Tenants', to: '/platform/tenants' }
  ],
  backup_restore_gap: [
    { label: 'Backup Restore', to: '/platform/backup-restore-validation' },
    { label: 'Tenant Exports', to: '/platform/tenant-exports' },
    { label: 'Runbooks', to: '/platform/runbooks' }
  ],
  deployment_smoke_test_gap: [
    { label: 'Deployment Validation', to: '/platform/deployment-validation' },
    { label: 'Smoke Test', to: '/platform/commercial-launch-smoke-test-checklist' },
    { label: 'Releases', to: '/platform/releases', permission: PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ }
  ],
  incident_prevention_gap: [
    { label: 'Prevention Verification', to: '/platform/commercial-launch-prevention-verification' },
    { label: 'Incident Closure', to: '/platform/commercial-launch-incident-closure' },
    { label: 'Runbooks', to: '/platform/runbooks' }
  ],
  growth_governance_exception: [
    { label: 'Growth Observation', to: '/platform/commercial-launch-additional-growth-observation' },
    { label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' },
    { label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' }
  ]
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not available';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('critical') || normalized.includes('blocked') || normalized.includes('rollback') || normalized.includes('fail')) return 'danger';
  if (normalized.includes('high') || normalized.includes('waiting') || normalized.includes('manual') || normalized.includes('review') || normalized.includes('external') || normalized.includes('preparation') || normalized.includes('required') || normalized.includes('hold')) return 'warn';
  if (normalized.includes('ready') || normalized.includes('approved') || normalized.includes('accepted') || normalized.includes('continue')) return 'good';
  if (normalized.includes('medium') || normalized.includes('not reviewed') || normalized.includes('not_reviewed')) return 'neutral';
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
  return visibleLinks([
    { label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchSteadyStateExceptionReviewPage() {
  const exceptionReview = useQuery({
    queryKey: ['platform', 'commercial-launch-steady-state-exception-review'],
    queryFn: () => platformApiRequest<ExceptionReview>('/platform/commercial-launch-steady-state-exception-review'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = exceptionReview.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = exceptionReview.isError && !data;
  const refreshError = exceptionReview.isError && Boolean(data);
  const requestError = readableError(exceptionReview.error);

  return (
    <div className="io-operational-page io-workspace-page platform-steady-state-exception-review">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-steady-state-exception-review"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Steady-State Exception Review"
        description="Read-only exception-review preparation after Steady-state Operations Cadence. It organizes missed cadence, platform-health, customer adoption, support SLA, billing entitlement, backup/restore, deployment smoke-test, incident-prevention and growth-governance review requirements without opening or closing real exceptions."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 232 — Commercial Launch Steady-State Exception Review Queue'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Exception review preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External exception decision required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-steady-state-exception-review__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.exception_rows_total ?? data.exception_rows.length : '—'} label="exception-review rows" />
            {data ? <span className="platform-steady-state-exception-review__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-steady-state-exception-review__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void exceptionReview.refetch()} disabled={exceptionReview.isFetching}>
                {exceptionReview.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-steady-state-exception-review__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-steady-state-exception-review"
          title="External exception-review boundary"
          description="This queue prepares review requirements; it cannot observe or persist the real Operations Cadence acceptance record or real external exception-review decisions and closure records."
        />
        <div className="platform-steady-state-exception-review__boundary-grid">
          <div className="platform-steady-state-exception-review__boundary-notice">
            <strong>Exception review preparation only.</strong>
            <span>Independently confirm the external Steady-state Operations Cadence record before treating these rows as active exception reviews. A zero stored-review count does not prove that no external exception-review record exists.</span>
          </div>
          <div className="platform-steady-state-exception-review__supporting-pages">
            <strong>Supporting operations pages</strong>
            <span>Core shortcuts stay inside this page&apos;s 12-permission evidence boundary. Operational Jobs, Announcements and Releases appear only when the current operator also has those destination permissions.</span>
            <div className="platform-steady-state-exception-review__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {exceptionReview.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Steady-State Exception Review…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-steady-state-exception-review__feedback" role="alert">
          <strong>Unable to load Commercial Launch Steady-State Exception Review.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-steady-state-exception-review__retry" onClick={() => void exceptionReview.refetch()} disabled={exceptionReview.isFetching}>
            {exceptionReview.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-steady-state-exception-review__feedback platform-steady-state-exception-review__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Steady-State Exception Review snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-steady-state-exception-review__retry" onClick={() => void exceptionReview.refetch()} disabled={exceptionReview.isFetching}>
            {exceptionReview.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Steady-state exception review summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-steady-state-exception-review"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Read-only derived snapshot metric'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-steady-state-exception-review__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-exception-review" title="Current evidence chain" description="Current upstream posture and persistence context used to prepare the exception-review queue." />
            <div className="platform-steady-state-exception-review__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}>
                  <strong>{source.label}</strong>
                  <span>{humanize(data[source.key])}</span>
                  <Link to={source.to}>Open source page</Link>
                </div>
              ))}
            </div>
            <div className="platform-steady-state-exception-review__persistence-grid">
              {[
                ['Operations cadence persistence', data.operations_cadence_persistence],
                ['Steady-state transition persistence', data.steady_state_transition_persistence],
                ['Additional-growth observation persistence', data.additional_growth_observation_persistence],
                ['Additional-growth authorization persistence', data.additional_growth_authorization_persistence],
                ['Expansion-health observation persistence', data.expansion_health_observation_persistence],
                ['Exception-review persistence', data.exception_review_persistence]
              ].map(([label, boundary]) => {
                const typedBoundary = boundary as PersistenceBoundary | null;
                return <div key={String(label)}><strong>{String(label)}</strong><span>{persistenceLabel(typedBoundary)}</span><small>{typedBoundary?.interpretation || 'No persistence interpretation reported.'}</small></div>;
              })}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-exception-review__rows-section">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-exception-review" title="Exception review rows" description="Prepared manual review requirements. Status and severity are preparation metadata, not observed external review outcomes." />
            {data.exception_rows.length === 0 ? (
              <div className="platform-steady-state-exception-review__empty-state">
                <strong>No exception-review rows were produced.</strong>
                <span>This is not evidence that steady-state operations are exception-free or that external exception reviews are complete. The derived board remains blocked until source evidence can be established.</span>
              </div>
            ) : (
              <div className="platform-steady-state-exception-review__row-grid">
                {data.exception_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-steady-state-exception-review__row-card">
                    <div className="platform-steady-state-exception-review__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · Owner: {humanize(row.owner)}</span>
                      </div>
                      <div className="platform-steady-state-exception-review__row-badges">
                        <span className="platform-steady-state-exception-review__status-badge" data-tone={badgeTone(row.severity_hint)}>{humanize(row.severity_hint)} severity hint</span>
                        <span className="platform-steady-state-exception-review__status-badge" data-tone={badgeTone(row.exception_review_status)}>{humanize(row.exception_review_status)}</span>
                      </div>
                    </div>
                    <div className="platform-steady-state-exception-review__template-note">Severity is a template hint; not an observed external exception severity. Preparation status only; not an observed external exception-review outcome.</div>
                    <div className="platform-steady-state-exception-review__source-summary">
                      <div><strong>Source Operations Cadence posture</strong><span>{humanize(row.source_operations_cadence_posture)}</span></div>
                      <div><strong>Release condition</strong><span>{humanize(row.release_condition)}</span></div>
                    </div>
                    <div className="platform-steady-state-exception-review__source-rows">
                      <strong>Source cadence statuses</strong>
                      <div className="platform-steady-state-exception-review__chips">{row.source_cadence_statuses.map((source) => <span key={`${source.code}-${source.status}`}>{humanize(source.code)} · {humanize(source.status)} · {humanize(source.cadence)}</span>)}</div>
                    </div>
                    <div className="platform-steady-state-exception-review__source-rows"><strong>Source Steady-state Transition row references</strong><div className="platform-steady-state-exception-review__chips">{row.source_transition_rows.length ? row.source_transition_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-exception-review__source-rows"><strong>Source Additional Growth Observation row references</strong><div className="platform-steady-state-exception-review__chips">{row.source_observation_rows.length ? row.source_observation_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-exception-review__source-rows"><strong>Source Additional Growth Authorization row references</strong><div className="platform-steady-state-exception-review__chips">{row.source_authorization_rows.length ? row.source_authorization_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-exception-review__field-groups">
                      <div><strong>Required external review evidence</strong><div className="platform-steady-state-exception-review__chips">{row.required_review_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Exception controls</strong><ul>{row.exception_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                    <div className="platform-steady-state-exception-review__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-steady-state-exception-review__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-exception-review" title="Exception review rules" description="Conditions that keep exception review manual and evidence-gated." /><ul>{data.exception_review_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-exception-review" title="Limitations" description="What this read-only exception queue does not observe, certify, persist or execute." /><ul>{data.exception_review_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-exception-review__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-steady-state-exception-review__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
