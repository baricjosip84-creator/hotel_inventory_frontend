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
import './PlatformCommercialLaunchSteadyStateTransitionPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type TransitionRow = {
  code: string;
  domain: string;
  owner: string;
  source_observation_rows: string[];
  source_authorization_rows: string[];
  source_observation_posture: string;
  required_transition_evidence: string[];
  transition_controls: string[];
  transition_status: string;
  release_condition: string;
};

type SteadyStateTransition = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  transition_rows: TransitionRow[];
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
  steady_state_transition_persistence: PersistenceBoundary;
  transition_rules: string[];
  transition_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey =
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
  transition_rows_total: 'Transition rows',
  blocked_until_additional_growth_observation_ready: 'Blocked rows',
  waiting_for_manual_steady_state_transition_acceptance: 'Awaiting manual transition acceptance',
  transition_records_persisted_in_application: 'Transition records stored here'
};

const summaryHelpers: Record<string, string> = {
  transition_rows_total: 'Read-only steady-state transition templates derived from Additional Growth Observation',
  blocked_until_additional_growth_observation_ready: 'Rows that cannot proceed because observation evidence is unresolved or externally unconfirmed',
  waiting_for_manual_steady_state_transition_acceptance: 'Rows ready only for an external manual transition acceptance record',
  transition_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external transition acceptance outcomes'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
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
  { label: 'Additional Growth Observation', to: '/platform/commercial-launch-additional-growth-observation' },
  { label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' },
  { label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' },
  { label: 'Support Cockpit', to: '/platform/support-operations-cockpit' },
  { label: 'Billing', to: '/platform/billing' },
  { label: 'Runbooks', to: '/platform/runbooks' }
];

const domainEvidenceLinks: Record<string, PageLink[]> = {
  growth_exit: [
    { label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' },
    { label: 'Launch Acceptance', to: '/platform/commercial-launch-acceptance' }
  ],
  operating_cadence: [
    { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' },
    { label: 'Operational Jobs', to: '/platform/operational-jobs', permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ },
    { label: 'Backup Restore', to: '/platform/backup-restore-validation' },
    { label: 'Deployment Validation', to: '/platform/deployment-validation' }
  ],
  support_handover: [
    { label: 'Support Cockpit', to: '/platform/support-operations-cockpit' },
    { label: 'Incidents', to: '/platform/incidents' }
  ],
  customer_success_handover: [
    { label: 'Customer Success', to: '/platform/customer-success-admin' },
    { label: 'Announcements', to: '/platform/announcements', permission: PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ }
  ],
  billing_entitlements: [
    { label: 'Billing', to: '/platform/billing' },
    { label: 'Tenants', to: '/platform/tenants' }
  ],
  monitoring_ownership: [
    { label: 'System Health', to: '/platform/system-health' },
    { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' },
    { label: 'Dependencies', to: '/platform/service-dependencies' }
  ],
  incident_prevention: [
    { label: 'Incident Closure', to: '/platform/commercial-launch-incident-closure' },
    { label: 'Prevention Verification', to: '/platform/commercial-launch-prevention-verification' },
    { label: 'Runbooks', to: '/platform/runbooks' }
  ],
  executive_acceptance: [
    { label: 'Go/No-Go Register', to: '/platform/commercial-launch-go-no-go-register' },
    { label: 'Launch Certificate', to: '/platform/commercial-launch-certificate' },
    { label: 'Launch Acceptance', to: '/platform/commercial-launch-acceptance' }
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
    { label: 'Additional Growth Observation', to: '/platform/commercial-launch-additional-growth-observation' },
    { label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchSteadyStateTransitionPage() {
  const transition = useQuery({
    queryKey: ['platform', 'commercial-launch-steady-state-transition'],
    queryFn: () => platformApiRequest<SteadyStateTransition>('/platform/commercial-launch-steady-state-transition'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = transition.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = transition.isError && !data;
  const refreshError = transition.isError && Boolean(data);
  const requestError = readableError(transition.error);

  return (
    <div className="io-operational-page io-workspace-page platform-steady-state-transition">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-steady-state-transition"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Steady-State Transition"
        description="Read-only launch-to-steady-state transition preparation after Additional Growth Observation. It organizes growth exit, operating cadence, support and customer-success handover, billing entitlement reconciliation, monitoring ownership, incident prevention and executive acceptance without claiming that external observation or transition acceptance records exist or closing launch automatically."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 230 — Commercial Launch Steady-State Transition Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Transition preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External transition acceptance required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-steady-state-transition__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.transition_rows_total ?? data.transition_rows.length : '—'} label="transition rows" />
            {data ? <span className="platform-steady-state-transition__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-steady-state-transition__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void transition.refetch()} disabled={transition.isFetching}>
                {transition.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-steady-state-transition__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-steady-state-transition"
          title="External transition boundary"
          description="This board prepares the steady-state transition checklist; it cannot observe or persist the real Additional Growth Observation record or the real steady-state transition acceptance outcomes."
        />
        <div className="platform-steady-state-transition__boundary-grid">
          <div className="platform-steady-state-transition__boundary-notice">
            <strong>Steady-state transition preparation only.</strong>
            <span>Independently confirm the external Additional Growth Observation record before treating these rows as active transition work. Growth exit, cadence, handover, billing, monitoring, prevention and executive acceptance outcomes must be recorded in their external systems of record.</span>
          </div>
          <div className="platform-steady-state-transition__supporting-pages">
            <strong>Supporting transition pages</strong>
            <span>Shortcuts are shown only when the current operator can open the destination. Operational Jobs and Announcements remain hidden without their additional permissions.</span>
            <div className="platform-steady-state-transition__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {transition.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Steady-State Transition…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-steady-state-transition__feedback" role="alert">
          <strong>Unable to load Commercial Launch Steady-State Transition.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-steady-state-transition__retry" onClick={() => void transition.refetch()} disabled={transition.isFetching}>
            {transition.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-steady-state-transition__feedback platform-steady-state-transition__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Steady-State Transition snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-steady-state-transition__retry" onClick={() => void transition.refetch()} disabled={transition.isFetching}>
            {transition.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Steady-state transition summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-steady-state-transition"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only transition-preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-steady-state-transition__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-additional-growth-observation" title="Source launch posture" description="Current upstream launch postures and persistence boundaries inherited through Additional Growth Observation." />
            <div className="platform-steady-state-transition__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}>
                  <strong>{source.label}</strong>
                  <span>{humanize(data[source.key])}</span>
                  <Link to={source.to}>Open source board</Link>
                </div>
              ))}
            </div>
            <div className="platform-steady-state-transition__persistence-grid">
              <div>
                <strong>Expansion-health persistence</strong>
                <span>{persistenceLabel(data.expansion_health_observation_persistence)}</span>
                <small>{data.expansion_health_observation_persistence?.interpretation || 'Expansion Health persistence details are not available in this snapshot.'}</small>
              </div>
              <div>
                <strong>Additional-growth authorization persistence</strong>
                <span>{persistenceLabel(data.additional_growth_authorization_persistence)}</span>
                <small>{data.additional_growth_authorization_persistence?.interpretation || 'Authorization persistence details are not available in this snapshot.'}</small>
              </div>
              <div>
                <strong>Additional-growth observation persistence</strong>
                <span>{persistenceLabel(data.additional_growth_observation_persistence)}</span>
                <small>{data.additional_growth_observation_persistence?.interpretation || 'Observation persistence details are not available in this snapshot.'}</small>
              </div>
              <div>
                <strong>Steady-state transition persistence</strong>
                <span>{persistenceLabel(data.steady_state_transition_persistence)}</span>
                <small>{data.steady_state_transition_persistence.interpretation}</small>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-transition__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-steady-state-transition"
              title="Steady-state transition rows"
              description="Manual launch-to-steady-state transition requirements derived from Additional Growth Observation. Preparation status and release conditions are system guidance only; they are not observed external transition outcomes."
            />
            {data.transition_rows.length === 0 ? (
              <div className="platform-steady-state-transition__empty-state">
                <strong>No steady-state transition rows were produced.</strong>
                <span>This is not evidence that launch is closed, that steady-state ownership was accepted, or that transition evidence exists; it only means the current read-only board returned no transition rows.</span>
              </div>
            ) : (
              <div className="platform-steady-state-transition__row-grid">
                {data.transition_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-steady-state-transition__row-card">
                    <div className="platform-steady-state-transition__row-heading">
                      <div><h3>{humanize(row.code)}</h3><span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span></div>
                      <span className="platform-steady-state-transition__status-badge" data-tone={badgeTone(row.transition_status)}>{humanize(row.transition_status)}</span>
                    </div>
                    <div className="platform-steady-state-transition__source-summary">
                      <div>
                        <span>Source Additional Growth Observation posture</span>
                        <strong>{humanize(row.source_observation_posture)}</strong>
                        <small>Preparation status only; not an observed external transition outcome.</small>
                      </div>
                      <div>
                        <span>Release condition</span>
                        <strong>{humanize(row.release_condition)}</strong>
                        <small>Manual external transition acceptance is required before launch work is treated as operationally closed.</small>
                      </div>
                    </div>
                    <div className="platform-steady-state-transition__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                    <div className="platform-steady-state-transition__source-rows">
                      <strong>Source Additional Growth Observation row references</strong>
                      <div className="platform-steady-state-transition__chips">{row.source_observation_rows.map((sourceCode) => <span key={sourceCode}>{humanize(sourceCode)}</span>)}</div>
                    </div>
                    <div className="platform-steady-state-transition__source-rows">
                      <strong>Source Additional Growth Authorization row references</strong>
                      <div className="platform-steady-state-transition__chips">{row.source_authorization_rows.map((sourceCode) => <span key={sourceCode}>{humanize(sourceCode)}</span>)}</div>
                    </div>
                    <div className="platform-steady-state-transition__field-groups">
                      <div>
                        <strong>Required external transition evidence</strong>
                        <div className="platform-steady-state-transition__chips">{row.required_transition_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div>
                      </div>
                      <div><strong>Transition controls</strong><ul>{row.transition_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-steady-state-transition__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-transition" title="Transition rules" description="Conditions that keep launch-to-steady-state handover manual and evidence-gated." /><ul>{data.transition_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-transition" title="Limitations" description="What this read-only board does not certify, persist or execute." /><ul>{data.transition_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-transition__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-steady-state-transition__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
