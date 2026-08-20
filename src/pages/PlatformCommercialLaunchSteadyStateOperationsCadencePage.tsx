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
import './PlatformCommercialLaunchSteadyStateOperationsCadencePage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type CadenceRow = {
  code: string;
  domain: string;
  owner: string;
  cadence: string;
  source_transition_rows: string[];
  source_observation_rows: string[];
  source_authorization_rows: string[];
  source_transition_posture: string;
  required_cadence_evidence: string[];
  cadence_controls: string[];
  cadence_status: string;
  release_condition: string;
};

type OperationsCadence = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  cadence_rows: CadenceRow[];
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
  steady_state_operations_cadence_persistence: PersistenceBoundary;
  cadence_rules: string[];
  cadence_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey =
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
  cadence_rows_total: 'Cadence rows',
  blocked_until_steady_state_transition_ready: 'Blocked rows',
  waiting_for_manual_operations_cadence_acceptance: 'Awaiting manual cadence acceptance',
  cadence_records_persisted_in_application: 'Cadence records stored here'
};

const summaryHelpers: Record<string, string> = {
  cadence_rows_total: 'Read-only recurring operations cadence templates derived from Steady-state Transition',
  blocked_until_steady_state_transition_ready: 'Rows that cannot proceed because transition evidence remains unresolved or externally unconfirmed',
  waiting_for_manual_operations_cadence_acceptance: 'Rows ready only for an external manual operations-cadence acceptance record',
  cadence_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external cadence acceptance or completion outcomes'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
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
  { label: 'Steady-State Transition', to: '/platform/commercial-launch-steady-state-transition' },
  { label: 'Additional Growth Observation', to: '/platform/commercial-launch-additional-growth-observation' },
  { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' },
  { label: 'Backup Restore', to: '/platform/backup-restore-validation' },
  { label: 'Deployment Validation', to: '/platform/deployment-validation' },
  { label: 'Runbooks', to: '/platform/runbooks' }
];

const domainEvidenceLinks: Record<string, PageLink[]> = {
  executive_review: [
    { label: 'Launch Acceptance', to: '/platform/commercial-launch-acceptance-packet' },
    { label: 'Launch Certificate', to: '/platform/commercial-launch-certificate' },
    { label: 'Go/No-Go Register', to: '/platform/commercial-launch-go-no-go-register' }
  ],
  platform_health: [
    { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' },
    { label: 'System Health', to: '/platform/system-health' },
    { label: 'Dependencies', to: '/platform/service-dependencies' },
    { label: 'Operational Jobs', to: '/platform/operational-jobs', permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ }
  ],
  customer_success: [
    { label: 'Customer Success', to: '/platform/customer-success-admin' },
    { label: 'Announcements', to: '/platform/announcements', permission: PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ }
  ],
  support_operations: [
    { label: 'Support Cockpit', to: '/platform/support-operations-cockpit' },
    { label: 'Incidents', to: '/platform/incidents' }
  ],
  billing_entitlements: [
    { label: 'Billing', to: '/platform/billing' },
    { label: 'Tenants', to: '/platform/tenants' }
  ],
  backup_restore: [
    { label: 'Backup Restore', to: '/platform/backup-restore-validation' },
    { label: 'Tenant Exports', to: '/platform/tenant-exports' },
    { label: 'Runbooks', to: '/platform/runbooks' }
  ],
  deployment_smoke_tests: [
    { label: 'Deployment Validation', to: '/platform/deployment-validation' },
    { label: 'Smoke Test', to: '/platform/commercial-launch-smoke-test-checklist' },
    { label: 'Releases', to: '/platform/releases', permission: PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ }
  ],
  incident_prevention: [
    { label: 'Prevention Verification', to: '/platform/commercial-launch-prevention-verification' },
    { label: 'Incident Closure', to: '/platform/commercial-launch-incident-closure' },
    { label: 'Runbooks', to: '/platform/runbooks' }
  ],
  growth_governance: [
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
  if (normalized.includes('blocked') || normalized.includes('rollback') || normalized.includes('fail')) return 'danger';
  if (normalized.includes('waiting') || normalized.includes('manual') || normalized.includes('review') || normalized.includes('external') || normalized.includes('preparation') || normalized.includes('required') || normalized.includes('hold')) return 'warn';
  if (normalized.includes('ready') || normalized.includes('approved') || normalized.includes('accepted') || normalized.includes('continue')) return 'good';
  if (normalized.includes('not reviewed') || normalized.includes('not_reviewed')) return 'neutral';
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
    { label: 'Steady-State Transition', to: '/platform/commercial-launch-steady-state-transition' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchSteadyStateOperationsCadencePage() {
  const cadence = useQuery({
    queryKey: ['platform', 'commercial-launch-steady-state-operations-cadence'],
    queryFn: () => platformApiRequest<OperationsCadence>('/platform/commercial-launch-steady-state-operations-cadence'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = cadence.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = cadence.isError && !data;
  const refreshError = cadence.isError && Boolean(data);
  const requestError = readableError(cadence.error);

  return (
    <div className="io-operational-page io-workspace-page platform-steady-state-operations-cadence">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-steady-state-operations-cadence"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Steady-State Operations Cadence"
        description="Read-only recurring-operations preparation after Steady-state Transition. It organizes executive, platform-health, customer-success, support, billing, backup/restore, release, incident-prevention and future-growth cadence obligations without scheduling work or claiming that external transition or cadence records exist."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 231 — Commercial Launch Steady-State Operations Cadence Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Cadence preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External cadence acceptance required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-steady-state-operations-cadence__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.cadence_rows_total ?? data.cadence_rows.length : '—'} label="cadence rows" />
            {data ? <span className="platform-steady-state-operations-cadence__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-steady-state-operations-cadence__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void cadence.refetch()} disabled={cadence.isFetching}>
                {cadence.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-steady-state-operations-cadence__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-steady-state-operations-cadence"
          title="External cadence boundary"
          description="This board prepares recurring cadence obligations; it cannot observe or persist the real Steady-state Transition acceptance record or real recurring cadence acceptance/completion records."
        />
        <div className="platform-steady-state-operations-cadence__boundary-grid">
          <div className="platform-steady-state-operations-cadence__boundary-notice">
            <strong>Operations cadence preparation only.</strong>
            <span>Independently confirm the external Steady-state Transition record before treating these rows as active steady-state cadence work. Cadence completion and acceptance must be recorded in the operational systems of record outside this read-only board.</span>
          </div>
          <div className="platform-steady-state-operations-cadence__supporting-pages">
            <strong>Supporting operations pages</strong>
            <span>Core shortcuts stay inside this page&apos;s evidence permission boundary. Domain-specific Operational Jobs, Announcements and Releases shortcuts appear only when the current operator also has those destination permissions.</span>
            <div className="platform-steady-state-operations-cadence__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {cadence.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Steady-State Operations Cadence…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-steady-state-operations-cadence__feedback" role="alert">
          <strong>Unable to load Commercial Launch Steady-State Operations Cadence.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-steady-state-operations-cadence__retry" onClick={() => void cadence.refetch()} disabled={cadence.isFetching}>
            {cadence.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-steady-state-operations-cadence__feedback platform-steady-state-operations-cadence__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Steady-State Operations Cadence snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-steady-state-operations-cadence__retry" onClick={() => void cadence.refetch()} disabled={cadence.isFetching}>
            {cadence.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Steady-state operations cadence summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-steady-state-operations-cadence"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only cadence-preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-steady-state-operations-cadence__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-transition" title="Source launch posture" description="Current upstream launch postures and persistence boundaries inherited through Steady-state Transition." />
            <div className="platform-steady-state-operations-cadence__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}>
                  <strong>{source.label}</strong>
                  <span>{humanize(data[source.key])}</span>
                  <Link to={source.to}>Open source board</Link>
                </div>
              ))}
            </div>
            <div className="platform-steady-state-operations-cadence__persistence-grid">
              <div><strong>Expansion-health persistence</strong><span>{persistenceLabel(data.expansion_health_observation_persistence)}</span><small>{data.expansion_health_observation_persistence?.interpretation || 'Expansion Health persistence details are not available in this snapshot.'}</small></div>
              <div><strong>Additional-growth authorization persistence</strong><span>{persistenceLabel(data.additional_growth_authorization_persistence)}</span><small>{data.additional_growth_authorization_persistence?.interpretation || 'Authorization persistence details are not available in this snapshot.'}</small></div>
              <div><strong>Additional-growth observation persistence</strong><span>{persistenceLabel(data.additional_growth_observation_persistence)}</span><small>{data.additional_growth_observation_persistence?.interpretation || 'Observation persistence details are not available in this snapshot.'}</small></div>
              <div><strong>Steady-state transition persistence</strong><span>{persistenceLabel(data.steady_state_transition_persistence)}</span><small>{data.steady_state_transition_persistence?.interpretation || 'Transition persistence details are not available in this snapshot.'}</small></div>
              <div><strong>Operations cadence persistence</strong><span>{persistenceLabel(data.steady_state_operations_cadence_persistence)}</span><small>{data.steady_state_operations_cadence_persistence.interpretation}</small></div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-operations-cadence__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-steady-state-operations-cadence"
              title="Operations cadence rows"
              description="Manual recurring-operations obligations derived from Steady-state Transition. Cadence status and release conditions are preparation guidance only; they are not observed external cadence outcomes."
            />
            {data.cadence_rows.length === 0 ? (
              <div className="platform-steady-state-operations-cadence__empty-state">
                <strong>No operations cadence rows were produced.</strong>
                <span>This is not evidence that steady-state cadence is accepted, scheduled, completed or operationally mature; it only means the current read-only board returned no cadence rows.</span>
              </div>
            ) : (
              <div className="platform-steady-state-operations-cadence__row-grid">
                {data.cadence_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-steady-state-operations-cadence__row-card">
                    <div className="platform-steady-state-operations-cadence__row-heading">
                      <div><h3>{humanize(row.code)}</h3><span>{humanize(row.domain)} · owner: {humanize(row.owner)} · cadence: {humanize(row.cadence)}</span></div>
                      <span className="platform-steady-state-operations-cadence__status-badge" data-tone={badgeTone(row.cadence_status)}>{humanize(row.cadence_status)}</span>
                    </div>
                    <div className="platform-steady-state-operations-cadence__source-summary">
                      <div><span>Source Steady-state Transition posture</span><strong>{humanize(row.source_transition_posture)}</strong><small>Preparation status only; not an observed external cadence outcome.</small></div>
                      <div><span>Release condition</span><strong>{humanize(row.release_condition)}</strong><small>Manual external cadence acceptance is required before launch work is treated as durably closed.</small></div>
                    </div>
                    <div className="platform-steady-state-operations-cadence__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                    <div className="platform-steady-state-operations-cadence__source-rows"><strong>Source Steady-state Transition row references</strong><div className="platform-steady-state-operations-cadence__chips">{row.source_transition_rows.map((sourceCode) => <span key={sourceCode}>{humanize(sourceCode)}</span>)}</div></div>
                    <div className="platform-steady-state-operations-cadence__source-rows"><strong>Source Additional Growth Observation row references</strong><div className="platform-steady-state-operations-cadence__chips">{row.source_observation_rows.map((sourceCode) => <span key={sourceCode}>{humanize(sourceCode)}</span>)}</div></div>
                    <div className="platform-steady-state-operations-cadence__source-rows"><strong>Source Additional Growth Authorization row references</strong><div className="platform-steady-state-operations-cadence__chips">{row.source_authorization_rows.map((sourceCode) => <span key={sourceCode}>{humanize(sourceCode)}</span>)}</div></div>
                    <div className="platform-steady-state-operations-cadence__field-groups">
                      <div><strong>Required external cadence evidence</strong><div className="platform-steady-state-operations-cadence__chips">{row.required_cadence_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Cadence controls</strong><ul>{row.cadence_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-steady-state-operations-cadence__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-operations-cadence" title="Cadence rules" description="Conditions that keep steady-state recurring operations manual and evidence-gated." /><ul>{data.cadence_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-operations-cadence" title="Limitations" description="What this read-only cadence board does not schedule, certify, persist or execute." /><ul>{data.cadence_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-operations-cadence__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-steady-state-operations-cadence__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
