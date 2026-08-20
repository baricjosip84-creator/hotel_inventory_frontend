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
import './PlatformCommercialLaunchAdditionalGrowthObservationPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type ObservationRow = {
  code: string;
  domain: string;
  owner: string;
  source_authorization_rows: string[];
  source_authorization_posture: string;
  required_observation_evidence: string[];
  observation_controls: string[];
  observation_status: string;
  release_condition: string;
};

type AdditionalGrowthObservation = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  observation_rows: ObservationRow[];
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
  additional_growth_observation_persistence: PersistenceBoundary;
  observation_rules: string[];
  observation_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };

const summaryLabels: Record<string, string> = {
  observation_rows_total: 'Observation rows',
  blocked_until_additional_growth_authorization_ready: 'Blocked rows',
  waiting_for_manual_additional_growth_observation: 'Awaiting manual observation',
  observation_records_persisted_in_application: 'Observation records stored here'
};

const summaryHelpers: Record<string, string> = {
  observation_rows_total: 'Read-only post-growth observation templates derived from Additional Growth Authorization',
  blocked_until_additional_growth_authorization_ready: 'Rows that cannot proceed because authorization evidence is unresolved or externally unconfirmed',
  waiting_for_manual_additional_growth_observation: 'Rows ready only for an external manual observation record',
  observation_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external observation outcomes'
};

const sourcePostures = [
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
] as const;

const supportingLinks: PageLink[] = [
  { label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' },
  { label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' },
  { label: 'Rollout Expansion', to: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Incidents', to: '/platform/incidents' },
  { label: 'Support Cockpit', to: '/platform/support-cockpit' },
  { label: 'Billing', to: '/platform/billing' }
];

const domainEvidenceLinks: Record<string, PageLink[]> = {
  tenant_scope: [
    { label: 'Tenant lifecycle', to: '/platform/tenant-lifecycle' },
    { label: 'Tenants', to: '/platform/tenants' }
  ],
  runtime_health: [
    { label: 'System health', to: '/platform/system-health' },
    { label: 'Monitoring readiness', to: '/platform/production-monitoring-readiness' },
    { label: 'Operational jobs', to: '/platform/operational-jobs', permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ }
  ],
  support_load: [{ label: 'Support cockpit', to: '/platform/support-cockpit' }],
  customer_success: [{ label: 'Customer success', to: '/platform/customer-success-admin' }],
  billing_entitlements: [{ label: 'Billing', to: '/platform/billing' }],
  incident_monitoring: [
    { label: 'Incidents', to: '/platform/incidents' },
    { label: 'Incident triage', to: '/platform/commercial-launch-incident-triage' }
  ],
  rollback_readiness: [
    { label: 'Runbooks', to: '/platform/runbooks' },
    { label: 'Operational jobs', to: '/platform/operational-jobs', permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ }
  ],
  next_growth_decision: [
    { label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' },
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
    { label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' },
    { label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchAdditionalGrowthObservationPage() {
  const observation = useQuery({
    queryKey: ['platform', 'commercial-launch-additional-growth-observation'],
    queryFn: () => platformApiRequest<AdditionalGrowthObservation>('/platform/commercial-launch-additional-growth-observation'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = observation.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = observation.isError && !data;
  const refreshError = observation.isError && Boolean(data);
  const requestError = readableError(observation.error);

  return (
    <div className="io-operational-page io-workspace-page platform-additional-growth-observation">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-additional-growth-observation"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Additional Growth Observation"
        description="Read-only post-growth observation preparation after Additional Growth Authorization. It organizes tenant scope, runtime health, support load, customer-success feedback, billing and entitlement posture, incident signals, rollback readiness and the next-growth decision without claiming that external observation evidence exists or expanding rollout automatically."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 229 — Commercial Launch Additional Growth Observation Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Observation preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External observation record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-additional-growth-observation__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.observation_rows_total ?? data.observation_rows.length : '—'} label="observation rows" />
            {data ? <span className="platform-additional-growth-observation__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-additional-growth-observation__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void observation.refetch()} disabled={observation.isFetching}>
                {observation.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-additional-growth-observation__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-additional-growth-observation"
          title="External observation boundary"
          description="This board prepares the post-growth observation checklist; it cannot observe or persist the real Additional Growth Authorization decision or the real post-growth observation outcomes."
        />
        <div className="platform-additional-growth-observation__boundary-grid">
          <div className="platform-additional-growth-observation__boundary-notice">
            <strong>Additional-growth observation preparation only.</strong>
            <span>Independently confirm the external Additional Growth Authorization record before treating these rows as active post-growth observation work. All health, support, customer-success, billing, incident, rollback and next-growth outcomes must be recorded externally.</span>
          </div>
          <div className="platform-additional-growth-observation__supporting-pages">
            <strong>Supporting observation pages</strong>
            <span>Shortcuts are shown only when the current operator can open the destination. Operational Jobs remains hidden without its additional jobs-read permission.</span>
            <div className="platform-additional-growth-observation__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {observation.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Additional Growth Observation…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-additional-growth-observation__feedback" role="alert">
          <strong>Unable to load Commercial Launch Additional Growth Observation.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-additional-growth-observation__retry" onClick={() => void observation.refetch()} disabled={observation.isFetching}>
            {observation.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-additional-growth-observation__feedback platform-additional-growth-observation__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Additional Growth Observation snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-additional-growth-observation__retry" onClick={() => void observation.refetch()} disabled={observation.isFetching}>
            {observation.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Additional growth observation summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-additional-growth-observation"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only observation-preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-additional-growth-observation__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-additional-growth-authorization" title="Source launch posture" description="Current upstream launch postures and persistence boundaries inherited through Additional Growth Authorization." />
            <div className="platform-additional-growth-observation__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}>
                  <strong>{source.label}</strong>
                  <span>{humanize(data[source.key])}</span>
                  <Link to={source.to}>Open source board</Link>
                </div>
              ))}
            </div>
            <div className="platform-additional-growth-observation__persistence-grid">
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
                <small>{data.additional_growth_observation_persistence.interpretation}</small>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-additional-growth-observation__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-additional-growth-observation"
              title="Additional-growth observation rows"
              description="Manual post-growth observation requirements derived from Additional Growth Authorization. Preparation status and release conditions are system guidance only; they are not observed external health or next-growth decisions."
            />
            {data.observation_rows.length === 0 ? (
              <div className="platform-additional-growth-observation__empty-state">
                <strong>No additional-growth observation rows were produced.</strong>
                <span>This is not evidence that additional growth was authorized, that the expanded cohort is healthy, or that further growth is safe; it only means the current read-only source board returned no observation rows.</span>
              </div>
            ) : (
              <div className="platform-additional-growth-observation__row-grid">
                {data.observation_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-additional-growth-observation__row-card">
                    <div className="platform-additional-growth-observation__row-heading">
                      <div><h3>{humanize(row.code)}</h3><span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span></div>
                      <span className="platform-additional-growth-observation__status-badge" data-tone={badgeTone(row.observation_status)}>{humanize(row.observation_status)}</span>
                    </div>
                    <div className="platform-additional-growth-observation__source-summary">
                      <div>
                        <span>Source Additional Growth Authorization posture</span>
                        <strong>{humanize(row.source_authorization_posture)}</strong>
                        <small>Preparation status only; not an observed external post-growth outcome.</small>
                      </div>
                      <div>
                        <span>Release condition</span>
                        <strong>{humanize(row.release_condition)}</strong>
                        <small>Manual external observation is required before any further rollout wave.</small>
                      </div>
                    </div>
                    <div className="platform-additional-growth-observation__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                    <div className="platform-additional-growth-observation__source-rows">
                      <strong>Source Additional Growth Authorization row references</strong>
                      <div className="platform-additional-growth-observation__chips">{row.source_authorization_rows.map((sourceCode) => <span key={sourceCode}>{humanize(sourceCode)}</span>)}</div>
                    </div>
                    <div className="platform-additional-growth-observation__field-groups">
                      <div>
                        <strong>Required external observation evidence</strong>
                        <div className="platform-additional-growth-observation__chips">{row.required_observation_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div>
                      </div>
                      <div><strong>Observation controls</strong><ul>{row.observation_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-additional-growth-observation__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-additional-growth-observation" title="Observation rules" description="Conditions that keep further rollout growth manual and evidence-gated." /><ul>{data.observation_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-additional-growth-observation" title="Limitations" description="What this read-only board does not certify, persist or execute." /><ul>{data.observation_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-additional-growth-observation__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-additional-growth-observation__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
