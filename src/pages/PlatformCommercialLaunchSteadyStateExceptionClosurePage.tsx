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
import './PlatformCommercialLaunchSteadyStateExceptionClosurePage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type SourceCadenceStatus = { code: string; status: string; cadence: string };

type ClosureRow = {
  code: string;
  source_exception_code: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_exception_review_status: string;
  source_cadence_statuses: SourceCadenceStatus[];
  source_transition_rows: string[];
  source_observation_rows: string[];
  source_authorization_rows: string[];
  required_review_evidence: string[];
  required_closure_evidence: string[];
  closure_controls: string[];
  closure_status: string;
  release_condition: string;
};

type ExceptionClosure = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  closure_rows: ClosureRow[];
  exception_review_posture: string;
  exception_review_persistence: PersistenceBoundary | null;
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
  exception_closure_persistence: PersistenceBoundary;
  closure_rules: string[];
  closure_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey =
  | 'exception_review_posture'
  | 'operations_cadence_posture'
  | 'steady_state_transition_posture'
  | 'additional_growth_observation_posture'
  | 'additional_growth_authorization_posture'
  | 'expansion_health_observation_posture';

const summaryLabels: Record<string, string> = {
  closure_rows_total: 'Exception-closure rows',
  waiting_for_exception_review_completion: 'Blocked by exception review',
  waiting_for_manual_exception_closure: 'Awaiting external manual closure',
  critical_closure_rows: 'Critical closure templates',
  high_closure_rows: 'High closure templates',
  medium_closure_rows: 'Medium closure templates',
  exception_closure_records_persisted_in_application: 'Exception-closure records stored here'
};

const summaryHelpers: Record<string, string> = {
  closure_rows_total: 'Read-only closure templates derived from Steady-state Exception Review',
  waiting_for_exception_review_completion: 'Rows blocked because exception-review evidence remains unresolved or externally unconfirmed',
  waiting_for_manual_exception_closure: 'Rows ready only for an external manual closure record',
  critical_closure_rows: 'Template severity hints only; not observed external exception severity',
  high_closure_rows: 'Template severity hints only; not observed external exception severity',
  medium_closure_rows: 'Template severity hints only; not observed external exception severity',
  exception_closure_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external exception-closure records or signoffs'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
  { label: 'Exception review', key: 'exception_review_posture', to: '/platform/commercial-launch-steady-state-exception-review' },
  { label: 'Operations cadence', key: 'operations_cadence_posture', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-state transition', key: 'steady_state_transition_posture', to: '/platform/commercial-launch-steady-state-transition' },
  { label: 'Additional growth observation', key: 'additional_growth_observation_posture', to: '/platform/commercial-launch-additional-growth-observation' },
  { label: 'Additional growth authorization', key: 'additional_growth_authorization_posture', to: '/platform/commercial-launch-additional-growth-authorization' },
  { label: 'Expansion health observation', key: 'expansion_health_observation_posture', to: '/platform/commercial-launch-expansion-health-observation' }
];

const supportingLinks: PageLink[] = [
  { label: 'Exception Review', to: '/platform/commercial-launch-steady-state-exception-review' },
  { label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-State Transition', to: '/platform/commercial-launch-steady-state-transition' },
  { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' },
  { label: 'Backup Restore', to: '/platform/backup-restore-validation' },
  { label: 'Support Operations', to: '/platform/support-operations-cockpit' },
  { label: 'Incidents', to: '/platform/incidents' }
];

const domainEvidenceLinks: Record<string, PageLink[]> = {
  missed_cadence: [
    { label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
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
    { label: 'Smoke Test', to: '/platform/commercial-launch-smoke-test-checklist' },
    { label: 'Deployment Validation', to: '/platform/deployment-validation' },
    { label: 'Releases', to: '/platform/releases', permission: PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ }
  ],
  incident_prevention_gap: [
    { label: 'Incident Closure', to: '/platform/commercial-launch-incident-closure' },
    { label: 'Prevention Verification', to: '/platform/commercial-launch-prevention-verification' },
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
  if (normalized.includes('medium')) return 'neutral';
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
    { label: 'Exception Review', to: '/platform/commercial-launch-steady-state-exception-review' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchSteadyStateExceptionClosurePage() {
  const exceptionClosure = useQuery({
    queryKey: ['platform', 'commercial-launch-steady-state-exception-closure'],
    queryFn: () => platformApiRequest<ExceptionClosure>('/platform/commercial-launch-steady-state-exception-closure'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = exceptionClosure.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = exceptionClosure.isError && !data;
  const refreshError = exceptionClosure.isError && Boolean(data);
  const requestError = readableError(exceptionClosure.error);

  return (
    <div className="io-operational-page io-workspace-page platform-steady-state-exception-closure">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-steady-state-exception-closure"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Steady-State Exception Closure"
        description="Read-only closure preparation after Steady-state Exception Review. It organizes domain-specific closure evidence, owner signoff and post-closure validation without closing tickets, incidents, billing exceptions, customer-success tasks, backup gaps or release gates."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 233 — Commercial Launch Steady-State Exception Closure Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Exception closure preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External closure record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-steady-state-exception-closure__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.closure_rows_total ?? data.closure_rows.length : '—'} label="exception-closure rows" />
            {data ? <span className="platform-steady-state-exception-closure__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-steady-state-exception-closure__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void exceptionClosure.refetch()} disabled={exceptionClosure.isFetching}>
                {exceptionClosure.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-steady-state-exception-closure__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-steady-state-exception-closure"
          title="External exception-closure boundary"
          description="This board prepares closure requirements; it cannot observe or persist the real Exception Review acceptance record or real external exception-closure evidence, decisions and signoffs."
        />
        <div className="platform-steady-state-exception-closure__boundary-grid">
          <div className="platform-steady-state-exception-closure__boundary-notice">
            <strong>Exception closure preparation only.</strong>
            <span>Independently confirm the external Steady-state Exception Review record before treating these closure rows as active. A zero stored-closure count does not prove that no external exception-closure record exists.</span>
          </div>
          <div className="platform-steady-state-exception-closure__supporting-pages">
            <strong>Supporting operations pages</strong>
            <span>Core shortcuts stay inside this page&apos;s 12-permission evidence boundary. Operational Jobs, Announcements and Releases appear only when the current operator also has those destination permissions.</span>
            <div className="platform-steady-state-exception-closure__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {exceptionClosure.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Steady-State Exception Closure…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-steady-state-exception-closure__feedback" role="alert">
          <strong>Unable to load Commercial Launch Steady-State Exception Closure.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-steady-state-exception-closure__retry" onClick={() => void exceptionClosure.refetch()} disabled={exceptionClosure.isFetching}>
            {exceptionClosure.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-steady-state-exception-closure__feedback platform-steady-state-exception-closure__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Steady-State Exception Closure snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-steady-state-exception-closure__retry" onClick={() => void exceptionClosure.refetch()} disabled={exceptionClosure.isFetching}>
            {exceptionClosure.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Steady-state exception closure summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-steady-state-exception-closure"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Read-only derived snapshot metric'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-steady-state-exception-closure__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-exception-closure" title="Current evidence chain" description="Current upstream posture and persistence context used to prepare the exception-closure board." />
            <div className="platform-steady-state-exception-closure__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}>
                  <strong>{source.label}</strong>
                  <span>{humanize(data[source.key])}</span>
                  <Link to={source.to}>Open source page</Link>
                </div>
              ))}
            </div>
            <div className="platform-steady-state-exception-closure__persistence-grid">
              {[
                ['Exception-review persistence', data.exception_review_persistence],
                ['Operations cadence persistence', data.operations_cadence_persistence],
                ['Steady-state transition persistence', data.steady_state_transition_persistence],
                ['Additional-growth observation persistence', data.additional_growth_observation_persistence],
                ['Additional-growth authorization persistence', data.additional_growth_authorization_persistence],
                ['Expansion-health observation persistence', data.expansion_health_observation_persistence],
                ['Exception-closure persistence', data.exception_closure_persistence]
              ].map(([label, boundary]) => {
                const typedBoundary = boundary as PersistenceBoundary | null;
                return <div key={String(label)}><strong>{String(label)}</strong><span>{persistenceLabel(typedBoundary)}</span><small>{typedBoundary?.interpretation || 'No persistence interpretation reported.'}</small></div>;
              })}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-exception-closure__rows-section">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-exception-closure" title="Exception closure rows" description="Prepared manual closure requirements. Status and severity are preparation metadata, not observed external closure outcomes." />
            {data.closure_rows.length === 0 ? (
              <div className="platform-steady-state-exception-closure__empty-state">
                <strong>No exception-closure rows were produced.</strong>
                <span>This is not evidence that steady-state exceptions are closed or that external closure work is complete. The derived board remains blocked until source evidence can be established.</span>
              </div>
            ) : (
              <div className="platform-steady-state-exception-closure__row-grid">
                {data.closure_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-steady-state-exception-closure__row-card">
                    <div className="platform-steady-state-exception-closure__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · Owner: {humanize(row.owner)}</span>
                      </div>
                      <div className="platform-steady-state-exception-closure__row-badges">
                        <span className="platform-steady-state-exception-closure__status-badge" data-tone={badgeTone(row.severity_hint)}>{humanize(row.severity_hint)} severity hint</span>
                        <span className="platform-steady-state-exception-closure__status-badge" data-tone={badgeTone(row.closure_status)}>{humanize(row.closure_status)}</span>
                      </div>
                    </div>
                    <div className="platform-steady-state-exception-closure__template-note">Severity is a template hint; not an observed external exception severity. Closure status is preparation metadata only; not an observed external closure outcome.</div>
                    <div className="platform-steady-state-exception-closure__source-summary">
                      <div><strong>Source exception review row</strong><span>{humanize(row.source_exception_code)}</span><small>{humanize(row.source_exception_review_status)}</small></div>
                      <div><strong>Release condition</strong><span>{humanize(row.release_condition)}</span></div>
                    </div>
                    <div className="platform-steady-state-exception-closure__source-rows">
                      <strong>Source Operations Cadence statuses</strong>
                      <div className="platform-steady-state-exception-closure__chips">{row.source_cadence_statuses.length ? row.source_cadence_statuses.map((source) => <span key={`${source.code}-${source.status}`}>{humanize(source.code)} · {humanize(source.status)} · {humanize(source.cadence)}</span>) : <span>None reported</span>}</div>
                    </div>
                    <div className="platform-steady-state-exception-closure__source-rows"><strong>Source Steady-state Transition row references</strong><div className="platform-steady-state-exception-closure__chips">{row.source_transition_rows.length ? row.source_transition_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-exception-closure__source-rows"><strong>Source Additional Growth Observation row references</strong><div className="platform-steady-state-exception-closure__chips">{row.source_observation_rows.length ? row.source_observation_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-exception-closure__source-rows"><strong>Source Additional Growth Authorization row references</strong><div className="platform-steady-state-exception-closure__chips">{row.source_authorization_rows.length ? row.source_authorization_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-exception-closure__field-groups">
                      <div><strong>Required source review evidence</strong><div className="platform-steady-state-exception-closure__chips">{row.required_review_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external closure evidence</strong><div className="platform-steady-state-exception-closure__chips">{row.required_closure_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Closure controls</strong><ul>{row.closure_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                    <div className="platform-steady-state-exception-closure__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-steady-state-exception-closure__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-exception-closure" title="Closure rules" description="Conditions that keep exception closure manual and evidence-gated." /><ul>{data.closure_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-exception-closure" title="Limitations" description="What this read-only closure board does not observe, certify, persist or execute." /><ul>{data.closure_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-exception-closure__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-steady-state-exception-closure__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
