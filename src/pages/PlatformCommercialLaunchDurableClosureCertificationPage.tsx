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
import './PlatformCommercialLaunchDurableClosureCertificationPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type SourceCadenceStatus = { code: string; status: string; cadence: string };

type DurableClosureCertificationRow = {
  code: string;
  source_resolution_verification_code: string;
  source_recurrence_resolution_code: string;
  source_recurrence_audit_code: string;
  source_closure_code: string;
  source_exception_code: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_resolution_verification_status: string;
  source_recurrence_resolution_status: string;
  source_recurrence_audit_status: string;
  source_closure_status: string;
  source_exception_review_status: string;
  source_cadence_statuses: SourceCadenceStatus[];
  source_transition_rows: string[];
  source_observation_rows: string[];
  source_authorization_rows: string[];
  required_recurrence_audit_evidence: string[];
  required_recurrence_resolution_evidence: string[];
  required_resolution_verification_evidence: string[];
  required_durable_closure_certification_evidence: string[];
  durable_closure_certification_controls: string[];
  durable_closure_certification_status: string;
  release_condition: string;
};

type DurableClosureCertification = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  durable_closure_certification_rows: DurableClosureCertificationRow[];
  resolution_verification_posture: string;
  resolution_verification_persistence: PersistenceBoundary | null;
  recurrence_resolution_posture: string;
  recurrence_resolution_persistence: PersistenceBoundary | null;
  recurrence_audit_posture: string;
  recurrence_audit_persistence: PersistenceBoundary | null;
  exception_closure_posture: string;
  exception_closure_persistence: PersistenceBoundary | null;
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
  durable_closure_certification_persistence: PersistenceBoundary;
  durable_closure_certification_rules: string[];
  durable_closure_certification_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey =
  | 'resolution_verification_posture'
  | 'recurrence_resolution_posture'
  | 'recurrence_audit_posture'
  | 'exception_closure_posture'
  | 'exception_review_posture'
  | 'operations_cadence_posture'
  | 'steady_state_transition_posture'
  | 'additional_growth_observation_posture'
  | 'additional_growth_authorization_posture'
  | 'expansion_health_observation_posture';

const summaryLabels: Record<string, string> = {
  durable_closure_certification_rows_total: 'Durable-closure certification rows',
  waiting_for_external_resolution_verification_confirmation: 'Blocked by external verification confirmation',
  waiting_for_manual_durable_closure_certification: 'Awaiting external manual certification',
  critical_certification_rows: 'Critical certification templates',
  high_certification_rows: 'High certification templates',
  medium_certification_rows: 'Medium certification templates',
  durable_closure_certification_records_persisted_in_application: 'Certification records stored here'
};

const summaryHelpers: Record<string, string> = {
  durable_closure_certification_rows_total: 'Read-only certification templates derived from Steady-state Resolution Verification',
  waiting_for_external_resolution_verification_confirmation: 'Rows blocked until the external resolution-verification record is independently confirmed',
  waiting_for_manual_durable_closure_certification: 'Rows ready only for an external manual durable-closure certification record',
  critical_certification_rows: 'Template severity hints only; not observed external certification severity',
  high_certification_rows: 'Template severity hints only; not observed external certification severity',
  medium_certification_rows: 'Template severity hints only; not observed external certification severity',
  durable_closure_certification_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external durable-closure certificates or signoffs'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
  { label: 'Resolution verification', key: 'resolution_verification_posture', to: '/platform/commercial-launch-steady-state-resolution-verification' },
  { label: 'Recurrence resolution', key: 'recurrence_resolution_posture', to: '/platform/commercial-launch-steady-state-recurrence-resolution' },
  { label: 'Recurrence audit', key: 'recurrence_audit_posture', to: '/platform/commercial-launch-steady-state-recurrence-audit' },
  { label: 'Exception closure', key: 'exception_closure_posture', to: '/platform/commercial-launch-steady-state-exception-closure' },
  { label: 'Exception review', key: 'exception_review_posture', to: '/platform/commercial-launch-steady-state-exception-review' },
  { label: 'Operations cadence', key: 'operations_cadence_posture', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-state transition', key: 'steady_state_transition_posture', to: '/platform/commercial-launch-steady-state-transition' },
  { label: 'Additional growth observation', key: 'additional_growth_observation_posture', to: '/platform/commercial-launch-additional-growth-observation' },
  { label: 'Additional growth authorization', key: 'additional_growth_authorization_posture', to: '/platform/commercial-launch-additional-growth-authorization' },
  { label: 'Expansion health observation', key: 'expansion_health_observation_posture', to: '/platform/commercial-launch-expansion-health-observation' }
];

const supportingLinks: PageLink[] = [
  { label: 'Resolution Verification', to: '/platform/commercial-launch-steady-state-resolution-verification' },
  { label: 'Recurrence Resolution', to: '/platform/commercial-launch-steady-state-recurrence-resolution' },
  { label: 'Recurrence Audit', to: '/platform/commercial-launch-steady-state-recurrence-audit' },
  { label: 'Exception Closure', to: '/platform/commercial-launch-steady-state-exception-closure' },
  { label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' },
  { label: 'Backup Restore', to: '/platform/backup-restore-validation' },
  { label: 'Support Operations', to: '/platform/support-operations-cockpit' },
  { label: 'Service Dependencies', to: '/platform/service-dependencies' },
  { label: 'Announcements', to: '/platform/announcements', permission: PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ },
  { label: 'Releases', to: '/platform/releases', permission: PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ }
];

const domainEvidenceLinks: Record<string, PageLink[]> = {
  missed_cadence: [
    { label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' },
    { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' }
  ],
  health_regression: [
    { label: 'System Health', to: '/platform/system-health' },
    { label: 'Dependencies', to: '/platform/service-dependencies' },
    { label: 'Deployment Validation', to: '/platform/deployment-validation' }
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
    { label: 'Resolution Verification', to: '/platform/commercial-launch-steady-state-resolution-verification' },
    { label: 'Recurrence Resolution', to: '/platform/commercial-launch-steady-state-recurrence-resolution' },
    { label: 'Recurrence Audit', to: '/platform/commercial-launch-steady-state-recurrence-audit' },
    { label: 'Exception Closure', to: '/platform/commercial-launch-steady-state-exception-closure' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchDurableClosureCertificationPage() {
  const durableClosureCertification = useQuery({
    queryKey: ['platform', 'commercial-launch-durable-closure-certification'],
    queryFn: () => platformApiRequest<DurableClosureCertification>('/platform/commercial-launch-durable-closure-certification'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = durableClosureCertification.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = durableClosureCertification.isError && !data;
  const refreshError = durableClosureCertification.isError && Boolean(data);
  const requestError = readableError(durableClosureCertification.error);

  return (
    <div className="io-operational-page io-workspace-page platform-durable-closure-certification">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-durable-closure-certification"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Durable Closure Certification"
        description="Read-only durable-closure preparation after Steady-state Resolution Verification. It organizes owner signoff, sustainment acceptance, reopen-threshold, next-review and escalation evidence without claiming that external verification or durable closure certification has occurred."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 237 — Commercial Launch Durable Closure Certification Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Durable closure certification preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External certification record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-durable-closure-certification__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.durable_closure_certification_rows_total ?? data.durable_closure_certification_rows.length : '—'} label="certification rows" />
            {data ? <span className="platform-durable-closure-certification__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-durable-closure-certification__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void durableClosureCertification.refetch()} disabled={durableClosureCertification.isFetching}>
                {durableClosureCertification.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-durable-closure-certification__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-durable-closure-certification"
          title="External durable-closure certification boundary"
          description="This board prepares durable-closure certification requirements; it cannot observe or persist the real external Resolution Verification decision or real durable-closure certificates, owner signoffs, sustainment acceptances, reopen-threshold decisions, next-review records and escalation outcomes."
        />
        <div className="platform-durable-closure-certification__boundary-grid">
          <div className="platform-durable-closure-certification__boundary-notice">
            <strong>Durable closure certification preparation only.</strong>
            <span>Independently confirm the external Steady-state Resolution Verification record before treating these certification rows as active. A zero stored-certification count does not prove that no external durable-closure record exists.</span>
          </div>
          <div className="platform-durable-closure-certification__supporting-pages">
            <strong>Supporting operations pages</strong>
            <span>Core shortcuts stay inside this page&apos;s 12-permission evidence boundary. Announcements and Releases appear only when the current operator also has those destination permissions.</span>
            <div className="platform-durable-closure-certification__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {durableClosureCertification.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Durable Closure Certification…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-durable-closure-certification__feedback" role="alert">
          <strong>Unable to load Commercial Launch Durable Closure Certification.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-durable-closure-certification__retry" onClick={() => void durableClosureCertification.refetch()} disabled={durableClosureCertification.isFetching}>
            {durableClosureCertification.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-durable-closure-certification__feedback platform-durable-closure-certification__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Durable Closure Certification snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-durable-closure-certification__retry" onClick={() => void durableClosureCertification.refetch()} disabled={durableClosureCertification.isFetching}>
            {durableClosureCertification.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Durable closure certification summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard key={key} iconPath="/platform/commercial-launch-durable-closure-certification" label={summaryLabels[key] || humanize(key)} value={value} helper={summaryHelpers[key] || 'Read-only derived snapshot metric'} />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-durable-closure-certification__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-durable-closure-certification" title="Current evidence chain" description="Current upstream posture and persistence context used to prepare the durable-closure certification board." />
            <div className="platform-durable-closure-certification__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}><strong>{source.label}</strong><span>{humanize(data[source.key])}</span><Link to={source.to}>Open source page</Link></div>
              ))}
            </div>
            <div className="platform-durable-closure-certification__persistence-grid">
              {[
                ['Resolution-verification persistence', data.resolution_verification_persistence],
                ['Recurrence-resolution persistence', data.recurrence_resolution_persistence],
                ['Recurrence-audit persistence', data.recurrence_audit_persistence],
                ['Exception-closure persistence', data.exception_closure_persistence],
                ['Exception-review persistence', data.exception_review_persistence],
                ['Operations cadence persistence', data.operations_cadence_persistence],
                ['Steady-state transition persistence', data.steady_state_transition_persistence],
                ['Additional-growth observation persistence', data.additional_growth_observation_persistence],
                ['Additional-growth authorization persistence', data.additional_growth_authorization_persistence],
                ['Expansion-health observation persistence', data.expansion_health_observation_persistence],
                ['Durable-closure certification persistence', data.durable_closure_certification_persistence]
              ].map(([label, boundary]) => {
                const typedBoundary = boundary as PersistenceBoundary | null;
                return <div key={String(label)}><strong>{String(label)}</strong><span>{persistenceLabel(typedBoundary)}</span><small>{typedBoundary?.interpretation || 'No persistence interpretation reported.'}</small></div>;
              })}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-durable-closure-certification__rows-section">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-durable-closure-certification" title="Durable closure certification rows" description="Prepared durable-closure certification requirements. Status and severity are preparation metadata, not observed external certification outcomes." />
            {data.durable_closure_certification_rows.length === 0 ? (
              <div className="platform-durable-closure-certification__empty-state">
                <strong>No durable-closure certification rows were produced.</strong>
                <span>This is not evidence that resolution verification was externally accepted or that the commercial launch track is durably closed. The derived board remains blocked until source evidence can be established.</span>
              </div>
            ) : (
              <div className="platform-durable-closure-certification__row-grid">
                {data.durable_closure_certification_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-durable-closure-certification__row-card">
                    <div className="platform-durable-closure-certification__row-heading">
                      <div><h3>{humanize(row.code)}</h3><span>{humanize(row.domain)} · Owner: {humanize(row.owner)}</span></div>
                      <div className="platform-durable-closure-certification__row-badges">
                        <span className="platform-durable-closure-certification__status-badge" data-tone={badgeTone(row.severity_hint)}>{humanize(row.severity_hint)} severity hint</span>
                        <span className="platform-durable-closure-certification__status-badge" data-tone={badgeTone(row.durable_closure_certification_status)}>{humanize(row.durable_closure_certification_status)}</span>
                      </div>
                    </div>
                    <div className="platform-durable-closure-certification__template-note">Severity is a template hint; not an observed external certification severity. Durable-closure certification status is preparation metadata only; not an observed external certification outcome.</div>
                    <div className="platform-durable-closure-certification__source-summary">
                      <div><strong>Source Resolution Verification row</strong><span>{humanize(row.source_resolution_verification_code)}</span><small>{humanize(row.source_resolution_verification_status)}</small></div>
                      <div><strong>Source recurrence resolution row</strong><span>{humanize(row.source_recurrence_resolution_code)}</span><small>{humanize(row.source_recurrence_resolution_status)}</small></div>
                      <div><strong>Source recurrence audit row</strong><span>{humanize(row.source_recurrence_audit_code)}</span><small>{humanize(row.source_recurrence_audit_status)}</small></div>
                      <div><strong>Source exception closure row</strong><span>{humanize(row.source_closure_code)}</span><small>{humanize(row.source_closure_status)}</small></div>
                      <div><strong>Source exception review row</strong><span>{humanize(row.source_exception_code)}</span><small>{humanize(row.source_exception_review_status)}</small></div>
                      <div><strong>Release condition</strong><span>{humanize(row.release_condition)}</span></div>
                    </div>
                    <div className="platform-durable-closure-certification__source-rows"><strong>Source Operations Cadence statuses</strong><div className="platform-durable-closure-certification__chips">{row.source_cadence_statuses.length ? row.source_cadence_statuses.map((source) => <span key={`${source.code}-${source.status}`}>{humanize(source.code)} · {humanize(source.status)} · {humanize(source.cadence)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-durable-closure-certification__source-rows"><strong>Source Steady-state Transition row references</strong><div className="platform-durable-closure-certification__chips">{row.source_transition_rows.length ? row.source_transition_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-durable-closure-certification__source-rows"><strong>Source Additional Growth Observation row references</strong><div className="platform-durable-closure-certification__chips">{row.source_observation_rows.length ? row.source_observation_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-durable-closure-certification__source-rows"><strong>Source Additional Growth Authorization row references</strong><div className="platform-durable-closure-certification__chips">{row.source_authorization_rows.length ? row.source_authorization_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-durable-closure-certification__field-groups">
                      <div><strong>Required source recurrence-audit evidence</strong><div className="platform-durable-closure-certification__chips">{row.required_recurrence_audit_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source recurrence-resolution evidence</strong><div className="platform-durable-closure-certification__chips">{row.required_recurrence_resolution_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source resolution-verification evidence</strong><div className="platform-durable-closure-certification__chips">{row.required_resolution_verification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external durable-closure certification evidence</strong><div className="platform-durable-closure-certification__chips">{row.required_durable_closure_certification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Durable closure certification controls</strong><ul>{row.durable_closure_certification_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                    <div className="platform-durable-closure-certification__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-durable-closure-certification__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-durable-closure-certification" title="Durable closure certification rules" description="Conditions that keep durable closure certification manual and evidence-gated." /><ul>{data.durable_closure_certification_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-durable-closure-certification" title="Limitations" description="What this read-only durable-closure board does not observe, certify, persist or execute." /><ul>{data.durable_closure_certification_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-durable-closure-certification__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-durable-closure-certification__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
