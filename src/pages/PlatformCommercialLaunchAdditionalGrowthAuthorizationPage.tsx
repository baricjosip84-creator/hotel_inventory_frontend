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
import './PlatformCommercialLaunchAdditionalGrowthAuthorizationPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type AuthorizationRow = {
  code: string;
  domain: string;
  owner: string;
  source_observation_rows: string[];
  source_observation_posture: string;
  required_authorization_fields: string[];
  authorization_controls: string[];
  authorization_status: string;
  release_condition: string;
};

type AdditionalGrowthAuthorization = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  authorization_rows: AuthorizationRow[];
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
  additional_growth_authorization_persistence: PersistenceBoundary;
  authorization_rules: string[];
  authorization_limitations: string[];
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
  authorization_rows_total: 'Authorization rows',
  blocked_until_expansion_health_observation_ready: 'Blocked rows',
  waiting_for_manual_additional_growth_authorization: 'Awaiting manual authorization',
  authorization_records_persisted_in_application: 'Authorization records stored here'
};

const summaryHelpers: Record<string, string> = {
  authorization_rows_total: 'Read-only authorization templates prepared from Expansion Health evidence',
  blocked_until_expansion_health_observation_ready: 'Rows that cannot proceed because Expansion Health evidence is unresolved or externally unconfirmed',
  waiting_for_manual_additional_growth_authorization: 'Rows whose prerequisites are clear enough for an external manual authorization record',
  authorization_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external authorization outcomes'
};

const sourcePostures = [
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
  { label: 'Expansion health', to: '/platform/commercial-launch-expansion-health-observation' },
  { label: 'Rollout expansion', to: '/platform/commercial-launch-rollout-expansion-authorization' },
  { label: 'Prevention verification', to: '/platform/commercial-launch-prevention-verification' },
  { label: 'Incident closure', to: '/platform/commercial-launch-incident-closure' },
  { label: 'Incident triage', to: '/platform/commercial-launch-incident-triage' }
];

const domainEvidenceLinks: Record<string, PageLink[]> = {
  tenant_scope: [
    { label: 'Tenant lifecycle', to: '/platform/tenant-lifecycle' },
    { label: 'Tenants', to: '/platform/tenants' }
  ],
  health_evidence: [
    { label: 'System health', to: '/platform/system-health' },
    { label: 'Monitoring readiness', to: '/platform/production-monitoring-readiness' }
  ],
  support_capacity: [
    { label: 'Support cockpit', to: '/platform/support-cockpit' },
    { label: 'Tenant SLA', to: '/platform/tenant-sla' }
  ],
  customer_success: [
    { label: 'Customer success', to: '/platform/customer-success-admin' }
  ],
  billing_entitlements: [
    { label: 'Billing', to: '/platform/billing' },
    { label: 'Billing activation', to: '/platform/billing-subscription-activation' }
  ],
  incident_risk: [
    { label: 'Incidents', to: '/platform/incidents' },
    { label: 'Incident closure', to: '/platform/commercial-launch-incident-closure' }
  ],
  rollback_monitoring: [
    { label: 'Runbooks', to: '/platform/runbooks' },
    { label: 'Operational jobs', to: '/platform/operational-jobs', permission: PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ }
  ],
  executive_approval: [
    { label: 'Launch certificate', to: '/platform/commercial-launch-certificate' },
    { label: 'Launch acceptance', to: '/platform/commercial-launch-acceptance' }
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
  if (
    normalized.includes('waiting')
    || normalized.includes('manual')
    || normalized.includes('review')
    || normalized.includes('external')
    || normalized.includes('preparation')
    || normalized.includes('required')
    || normalized.includes('hold')
  ) return 'warn';
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
    { label: 'Expansion health', to: '/platform/commercial-launch-expansion-health-observation' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchAdditionalGrowthAuthorizationPage() {
  const authorization = useQuery({
    queryKey: ['platform', 'commercial-launch-additional-growth-authorization'],
    queryFn: () => platformApiRequest<AdditionalGrowthAuthorization>('/platform/commercial-launch-additional-growth-authorization'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = authorization.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = authorization.isError && !data;
  const refreshError = authorization.isError && Boolean(data);
  const requestError = readableError(authorization.error);

  return (
    <div className="io-operational-page io-workspace-page platform-additional-growth-authorization">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-additional-growth-authorization"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Additional Growth Authorization"
        description="Read-only preparation for a manual additional-growth authorization after Expansion Health. It organizes tenant-scope limits, expanded-cohort health acceptance, support and customer-success capacity, billing and entitlement review, incident risk, rollback monitoring and executive approval without claiming that an external authorization exists or expanding rollout automatically."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 228 — Commercial Launch Additional Growth Authorization Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Authorization preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External authorization record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-additional-growth-authorization__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? data.summary.authorization_rows_total ?? data.authorization_rows.length : '—'}
              label="authorization rows"
            />
            {data ? (
              <span className="platform-additional-growth-authorization__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-additional-growth-authorization__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void authorization.refetch()}
                disabled={authorization.isFetching}
              >
                {authorization.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-additional-growth-authorization__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-additional-growth-authorization"
          title="External authorization boundary"
          description="This board prepares the authorization packet; it cannot observe or persist the real expanded-cohort health acceptance or the real additional-growth authorization decision."
        />
        <div className="platform-additional-growth-authorization__boundary-grid">
          <div className="platform-additional-growth-authorization__boundary-notice">
            <strong>Additional-growth authorization preparation only.</strong>
            <span>
              Independently confirm the external Expansion Health observation before using these rows for approval. Any tenant-scope, health, support, customer-success, billing, incident-risk, rollback or executive decision must be recorded in the external system of record.
            </span>
          </div>
          <div className="platform-additional-growth-authorization__supporting-pages">
            <strong>Supporting authorization pages</strong>
            <span>Shortcuts are shown only when the current operator can open the destination. Operational Jobs remains hidden without its additional jobs-read permission.</span>
            <div className="platform-additional-growth-authorization__link-row">
              {visibleLinks(supportingLinks).map((link) => (
                <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {authorization.isLoading ? (
        <section className="app-panel app-panel--padded">Loading Commercial Launch Additional Growth Authorization…</section>
      ) : null}

      {initialLoadError ? (
        <section className="app-error-state platform-additional-growth-authorization__feedback" role="alert">
          <strong>Unable to load Commercial Launch Additional Growth Authorization.</strong>
          <span>{requestError}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-additional-growth-authorization__retry"
            onClick={() => void authorization.refetch()}
            disabled={authorization.isFetching}
          >
            {authorization.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-additional-growth-authorization__feedback platform-additional-growth-authorization__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Additional Growth Authorization snapshot. {requestError}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-additional-growth-authorization__retry"
            onClick={() => void authorization.refetch()}
            disabled={authorization.isFetching}
          >
            {authorization.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Additional growth authorization summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard
                key={key}
                iconPath="/platform/commercial-launch-additional-growth-authorization"
                label={summaryLabels[key] || humanize(key)}
                value={value}
                helper={summaryHelpers[key] || 'Current read-only authorization-preparation snapshot'}
                tone={key.includes('blocked') && value > 0 ? 'danger' : key.includes('waiting') && value > 0 ? 'warn' : key.includes('persisted') ? 'neutral' : 'default'}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-additional-growth-authorization__context-panel">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-expansion-health-observation"
              title="Source launch posture"
              description="Current upstream launch postures and persistence boundaries inherited from Expansion Health."
            />
            <div className="platform-additional-growth-authorization__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}>
                  <strong>{source.label}</strong>
                  <span>{humanize(data[source.key])}</span>
                  <Link to={source.to}>Open source board</Link>
                </div>
              ))}
            </div>
            <div className="platform-additional-growth-authorization__persistence-grid">
              <div>
                <strong>Expansion-health persistence</strong>
                <span>{persistenceLabel(data.expansion_health_observation_persistence)}</span>
                <small>{data.expansion_health_observation_persistence?.interpretation || 'Expansion Health persistence details are not available in this snapshot.'}</small>
              </div>
              <div>
                <strong>Additional-growth authorization persistence</strong>
                <span>{persistenceLabel(data.additional_growth_authorization_persistence)}</span>
                <small>{data.additional_growth_authorization_persistence.interpretation}</small>
              </div>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-additional-growth-authorization__rows-section">
            <OperationalSectionHeader
              iconPath="/platform/commercial-launch-additional-growth-authorization"
              title="Additional-growth authorization rows"
              description="Manual authorization requirements derived from Expansion Health. Preparation status and release conditions are system guidance only; they are not observed external approval decisions."
            />

            {data.authorization_rows.length === 0 ? (
              <div className="platform-additional-growth-authorization__empty-state">
                <strong>No additional-growth authorization rows were produced.</strong>
                <span>This is not evidence that the expanded cohort is healthy, that authorization occurred, or that more rollout growth is safe; it only means the current read-only source board returned no authorization rows.</span>
              </div>
            ) : (
              <div className="platform-additional-growth-authorization__row-grid">
                {data.authorization_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-additional-growth-authorization__row-card">
                    <div className="platform-additional-growth-authorization__row-heading">
                      <div>
                        <h3>{humanize(row.code)}</h3>
                        <span>{humanize(row.domain)} · owner: {humanize(row.owner)}</span>
                      </div>
                      <span className="platform-additional-growth-authorization__status-badge" data-tone={badgeTone(row.authorization_status)}>
                        {humanize(row.authorization_status)}
                      </span>
                    </div>

                    <div className="platform-additional-growth-authorization__source-summary">
                      <div>
                        <span>Source Expansion Health posture</span>
                        <strong>{humanize(row.source_observation_posture)}</strong>
                        <small>Preparation status only; not an observed external authorization decision.</small>
                      </div>
                      <div>
                        <span>Release condition</span>
                        <strong>{humanize(row.release_condition)}</strong>
                        <small>Manual external authorization is required before further rollout growth.</small>
                      </div>
                    </div>

                    <div className="platform-additional-growth-authorization__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => (
                        <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>
                      ))}
                    </div>

                    <div className="platform-additional-growth-authorization__source-rows">
                      <strong>Source Expansion Health row references</strong>
                      <div className="platform-additional-growth-authorization__chips">
                        {row.source_observation_rows.map((sourceCode) => <span key={sourceCode}>{humanize(sourceCode)}</span>)}
                      </div>
                    </div>

                    <div className="platform-additional-growth-authorization__field-groups">
                      <div>
                        <strong>Required external authorization fields</strong>
                        <div className="platform-additional-growth-authorization__chips">
                          {row.required_authorization_fields.map((field) => <span key={field}>{humanize(field)}</span>)}
                        </div>
                      </div>
                      <div>
                        <strong>Authorization controls</strong>
                        <ul>{row.authorization_controls.map((control) => <li key={control}>{control}</li>)}</ul>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-additional-growth-authorization__rules-grid">
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-additional-growth-authorization"
                title="Authorization rules"
                description="Conditions that keep additional rollout growth manual and evidence-gated."
              />
              <ul>{data.authorization_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
            </div>
            <div className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/commercial-launch-additional-growth-authorization"
                title="Limitations"
                description="What this read-only board does not certify, persist or execute."
              />
              <ul>{data.authorization_limitations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-additional-growth-authorization__next-step">
            <strong>Next operator step</strong>
            <span>{data.next_best_step}</span>
          </section>

          <section className="app-panel app-panel--padded platform-additional-growth-authorization__snapshot-note">
            <strong>Snapshot interpretation</strong>
            <span>{data.validation_note}</span>
            <small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small>
          </section>
        </>
      ) : null}
    </div>
  );
}
