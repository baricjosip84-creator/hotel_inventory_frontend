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
import './PlatformCommercialLaunchFinalEvidenceArchivePage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type SourceCadenceStatus = { code: string; status: string; cadence: string };

type FinalEvidenceArchiveRow = {
  code: string;
  source_durable_closure_certification_code: string;
  source_resolution_verification_code: string;
  source_recurrence_resolution_code: string;
  source_recurrence_audit_code: string;
  source_closure_code: string;
  source_exception_code: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_durable_closure_certification_status: string;
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
  required_final_evidence_archive: string[];
  final_evidence_archive_controls: string[];
  final_evidence_archive_status: string;
  release_condition: string;
};

type FinalEvidenceArchive = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  final_evidence_archive_rows: FinalEvidenceArchiveRow[];
  durable_closure_certification_posture: string;
  durable_closure_certification_persistence: PersistenceBoundary | null;
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
  final_evidence_archive_persistence: PersistenceBoundary;
  final_evidence_archive_rules: string[];
  final_evidence_archive_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey =
  | 'durable_closure_certification_posture'
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
  final_evidence_archive_rows_total: 'Final evidence archive rows',
  waiting_for_external_durable_closure_certification_confirmation: 'Blocked by external durable-closure confirmation',
  waiting_for_manual_final_evidence_archive: 'Awaiting external manual archive',
  critical_archive_rows: 'Critical archive templates',
  high_archive_rows: 'High archive templates',
  medium_archive_rows: 'Medium archive templates',
  final_evidence_archive_records_persisted_in_application: 'Archive records stored here'
};

const summaryHelpers: Record<string, string> = {
  final_evidence_archive_rows_total: 'Read-only archive templates derived from Durable Closure Certification',
  waiting_for_external_durable_closure_certification_confirmation: 'Rows blocked until the external durable-closure certification record is independently confirmed',
  waiting_for_manual_final_evidence_archive: 'Rows ready only for an external manual archive record',
  critical_archive_rows: 'Template severity hints only; not observed external archive severity',
  high_archive_rows: 'Template severity hints only; not observed external archive severity',
  medium_archive_rows: 'Template severity hints only; not observed external archive severity',
  final_evidence_archive_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external archive packets or acceptance decisions'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
  { label: 'Durable closure certification', key: 'durable_closure_certification_posture', to: '/platform/commercial-launch-durable-closure-certification' },
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
  { label: 'Durable Closure', to: '/platform/commercial-launch-durable-closure-certification' },
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
    { label: 'Durable Closure', to: '/platform/commercial-launch-durable-closure-certification' },
    { label: 'Resolution Verification', to: '/platform/commercial-launch-steady-state-resolution-verification' },
    { label: 'Recurrence Resolution', to: '/platform/commercial-launch-steady-state-recurrence-resolution' },
    { label: 'Recurrence Audit', to: '/platform/commercial-launch-steady-state-recurrence-audit' },
    { label: 'Exception Closure', to: '/platform/commercial-launch-steady-state-exception-closure' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchFinalEvidenceArchivePage() {
  const finalEvidenceArchive = useQuery({
    queryKey: ['platform', 'commercial-launch-final-evidence-archive'],
    queryFn: () => platformApiRequest<FinalEvidenceArchive>('/platform/commercial-launch-final-evidence-archive'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = finalEvidenceArchive.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = finalEvidenceArchive.isError && !data;
  const refreshError = finalEvidenceArchive.isError && Boolean(data);
  const requestError = readableError(finalEvidenceArchive.error);

  return (
    <div className="io-operational-page io-workspace-page platform-final-evidence-archive">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-final-evidence-archive"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Final Evidence Archive"
        description="Read-only final-archive preparation after Durable Closure Certification. It organizes archive packets, owner signoff exports, sustainment evidence, reopen-threshold and next-review records without claiming that external certification or archive acceptance has occurred."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 238 — Commercial Launch Final Evidence Archive Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Final evidence archive preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External certification record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-final-evidence-archive__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.final_evidence_archive_rows_total ?? data.final_evidence_archive_rows.length : '—'} label="archive rows" />
            {data ? <span className="platform-final-evidence-archive__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-final-evidence-archive__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void finalEvidenceArchive.refetch()} disabled={finalEvidenceArchive.isFetching}>
                {finalEvidenceArchive.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-final-evidence-archive__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-final-evidence-archive"
          title="External final-evidence archive boundary"
          description="This board prepares final-evidence archive requirements; it cannot observe or persist the real external Durable Closure Certification decision or external archive packets, owner signoffs, sustainment acceptances, reopen-threshold archives, next-review records or archive acceptance outcomes."
        />
        <div className="platform-final-evidence-archive__boundary-grid">
          <div className="platform-final-evidence-archive__boundary-notice">
            <strong>Final evidence archive preparation only.</strong>
            <span>Independently confirm the external Durable Closure Certification record before treating these archive rows as active. A zero stored-archive count does not prove that no external final-archive record exists.</span>
          </div>
          <div className="platform-final-evidence-archive__supporting-pages">
            <strong>Supporting operations pages</strong>
            <span>Core shortcuts stay inside this page&apos;s 12-permission evidence boundary. Announcements and Releases appear only when the current operator also has those destination permissions.</span>
            <div className="platform-final-evidence-archive__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {finalEvidenceArchive.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Final Evidence Archive…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-final-evidence-archive__feedback" role="alert">
          <strong>Unable to load Commercial Launch Final Evidence Archive.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-final-evidence-archive__retry" onClick={() => void finalEvidenceArchive.refetch()} disabled={finalEvidenceArchive.isFetching}>
            {finalEvidenceArchive.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-final-evidence-archive__feedback platform-final-evidence-archive__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Final Evidence Archive snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-final-evidence-archive__retry" onClick={() => void finalEvidenceArchive.refetch()} disabled={finalEvidenceArchive.isFetching}>
            {finalEvidenceArchive.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Final evidence archive summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard key={key} iconPath="/platform/commercial-launch-final-evidence-archive" label={summaryLabels[key] || humanize(key)} value={value} helper={summaryHelpers[key] || 'Read-only derived snapshot metric'} />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-final-evidence-archive__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-final-evidence-archive" title="Current evidence chain" description="Current upstream posture and persistence context used to prepare the final-evidence archive board." />
            <div className="platform-final-evidence-archive__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}><strong>{source.label}</strong><span>{humanize(data[source.key])}</span><Link to={source.to}>Open source page</Link></div>
              ))}
            </div>
            <div className="platform-final-evidence-archive__persistence-grid">
              {[
                ['Durable-closure certification persistence', data.durable_closure_certification_persistence],
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
                ['Final evidence archive persistence', data.final_evidence_archive_persistence]
              ].map(([label, boundary]) => {
                const typedBoundary = boundary as PersistenceBoundary | null;
                return <div key={String(label)}><strong>{String(label)}</strong><span>{persistenceLabel(typedBoundary)}</span><small>{typedBoundary?.interpretation || 'No persistence interpretation reported.'}</small></div>;
              })}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-final-evidence-archive__rows-section">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-final-evidence-archive" title="Final evidence archive rows" description="Prepared final-evidence archive requirements. Status and severity are preparation metadata, not observed external archive outcomes." />
            {data.final_evidence_archive_rows.length === 0 ? (
              <div className="platform-final-evidence-archive__empty-state">
                <strong>No final-evidence archive rows were produced.</strong>
                <span>This is not evidence that durable closure was externally certified or that launch evidence has been archived. The derived board remains blocked until source evidence can be established.</span>
              </div>
            ) : (
              <div className="platform-final-evidence-archive__row-grid">
                {data.final_evidence_archive_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-final-evidence-archive__row-card">
                    <div className="platform-final-evidence-archive__row-heading">
                      <div><h3>{humanize(row.code)}</h3><span>{humanize(row.domain)} · Owner: {humanize(row.owner)}</span></div>
                      <div className="platform-final-evidence-archive__row-badges">
                        <span className="platform-final-evidence-archive__status-badge" data-tone={badgeTone(row.severity_hint)}>{humanize(row.severity_hint)} severity hint</span>
                        <span className="platform-final-evidence-archive__status-badge" data-tone={badgeTone(row.final_evidence_archive_status)}>{humanize(row.final_evidence_archive_status)}</span>
                      </div>
                    </div>
                    <div className="platform-final-evidence-archive__template-note">Severity is a template hint; not an observed external archive severity. Final archive status is preparation metadata only; not an observed external archive acceptance outcome.</div>
                    <div className="platform-final-evidence-archive__source-summary">
                      <div><strong>Source Durable Closure Certification row</strong><span>{humanize(row.source_durable_closure_certification_code)}</span><small>{humanize(row.source_durable_closure_certification_status)}</small></div>
                      <div><strong>Source Resolution Verification row</strong><span>{humanize(row.source_resolution_verification_code)}</span><small>{humanize(row.source_resolution_verification_status)}</small></div>
                      <div><strong>Source recurrence resolution row</strong><span>{humanize(row.source_recurrence_resolution_code)}</span><small>{humanize(row.source_recurrence_resolution_status)}</small></div>
                      <div><strong>Source recurrence audit row</strong><span>{humanize(row.source_recurrence_audit_code)}</span><small>{humanize(row.source_recurrence_audit_status)}</small></div>
                      <div><strong>Source exception closure row</strong><span>{humanize(row.source_closure_code)}</span><small>{humanize(row.source_closure_status)}</small></div>
                      <div><strong>Source exception review row</strong><span>{humanize(row.source_exception_code)}</span><small>{humanize(row.source_exception_review_status)}</small></div>
                      <div><strong>Release condition</strong><span>{humanize(row.release_condition)}</span></div>
                    </div>
                    <div className="platform-final-evidence-archive__source-rows"><strong>Source Operations Cadence statuses</strong><div className="platform-final-evidence-archive__chips">{row.source_cadence_statuses.length ? row.source_cadence_statuses.map((source) => <span key={`${source.code}-${source.status}`}>{humanize(source.code)} · {humanize(source.status)} · {humanize(source.cadence)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-final-evidence-archive__source-rows"><strong>Source Steady-state Transition row references</strong><div className="platform-final-evidence-archive__chips">{row.source_transition_rows.length ? row.source_transition_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-final-evidence-archive__source-rows"><strong>Source Additional Growth Observation row references</strong><div className="platform-final-evidence-archive__chips">{row.source_observation_rows.length ? row.source_observation_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-final-evidence-archive__source-rows"><strong>Source Additional Growth Authorization row references</strong><div className="platform-final-evidence-archive__chips">{row.source_authorization_rows.length ? row.source_authorization_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-final-evidence-archive__field-groups">
                      <div><strong>Required source recurrence-audit evidence</strong><div className="platform-final-evidence-archive__chips">{row.required_recurrence_audit_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source recurrence-resolution evidence</strong><div className="platform-final-evidence-archive__chips">{row.required_recurrence_resolution_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source resolution-verification evidence</strong><div className="platform-final-evidence-archive__chips">{row.required_resolution_verification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source durable-closure certification evidence</strong><div className="platform-final-evidence-archive__chips">{row.required_durable_closure_certification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external final-archive evidence</strong><div className="platform-final-evidence-archive__chips">{row.required_final_evidence_archive.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Final evidence archive controls</strong><ul>{row.final_evidence_archive_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                    <div className="platform-final-evidence-archive__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-final-evidence-archive__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-final-evidence-archive" title="Final evidence archive rules" description="Conditions that keep final evidence archive manual and evidence-gated." /><ul>{data.final_evidence_archive_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-final-evidence-archive" title="Limitations" description="What this read-only final-archive board does not observe, certify, persist or execute." /><ul>{data.final_evidence_archive_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-final-evidence-archive__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-final-evidence-archive__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
