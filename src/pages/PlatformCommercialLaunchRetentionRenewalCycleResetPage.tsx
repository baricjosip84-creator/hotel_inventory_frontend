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
import './PlatformCommercialLaunchRetentionRenewalCycleResetPage.css';

type PersistenceBoundary = { stored_in_application: boolean; external_records_observable: boolean; interpretation: string };
type SourceCadenceStatus = { code: string; status: string; cadence: string };

type RetentionRenewalCycleResetRow = {
  code: string;
  source_retention_renewal_archive_seal_code: string;
  source_retention_renewal_final_seal_code: string;
  source_retention_renewal_certification_code: string;
  source_retention_renewal_acceptance_code: string;
  source_retention_renewal_review_code: string;
  source_evidence_retention_seal_code: string;
  source_final_evidence_archive_code: string;
  source_durable_closure_certification_code: string;
  source_resolution_verification_code: string;
  source_recurrence_resolution_code: string;
  source_recurrence_audit_code: string;
  source_closure_code: string;
  source_exception_code: string;
  domain: string; owner: string; severity_hint: string;
  source_retention_renewal_archive_seal_status: string;
  source_retention_renewal_final_seal_status: string;
  source_retention_renewal_certification_status: string;
  source_retention_renewal_acceptance_status: string;
  source_retention_renewal_review_status: string;
  source_evidence_retention_seal_status: string;
  source_final_evidence_archive_status: string;
  source_durable_closure_certification_status: string;
  source_resolution_verification_status: string;
  source_recurrence_resolution_status: string;
  source_recurrence_audit_status: string;
  source_closure_status: string;
  source_exception_review_status: string;
  source_cadence_statuses: SourceCadenceStatus[];
  source_transition_rows: string[]; source_observation_rows: string[]; source_authorization_rows: string[];
  required_recurrence_audit_evidence: string[]; required_recurrence_resolution_evidence: string[]; required_resolution_verification_evidence: string[];
  required_durable_closure_certification_evidence: string[]; required_final_evidence_archive: string[]; required_evidence_retention_seal: string[];
  required_retention_renewal_review: string[]; required_retention_renewal_acceptance: string[]; required_retention_renewal_certification: string[];
  required_retention_renewal_final_seal: string[];
  required_retention_renewal_archive_seal: string[]; required_retention_renewal_cycle_reset: string[]; retention_renewal_cycle_reset_controls: string[]; retention_renewal_cycle_reset_status: string; release_condition: string;
};

type RetentionRenewalCycleResetBoard = {
  phase: string; step: string; posture: string; generated_at: string; summary: Record<string, number>;
  retention_renewal_cycle_reset_rows: RetentionRenewalCycleResetRow[];
  retention_renewal_archive_seal_posture: string; retention_renewal_archive_seal_persistence: PersistenceBoundary | null;
  retention_renewal_final_seal_posture: string; retention_renewal_final_seal_persistence: PersistenceBoundary | null;
  retention_renewal_certification_posture: string; retention_renewal_certification_persistence: PersistenceBoundary | null;
  retention_renewal_acceptance_posture: string; retention_renewal_acceptance_persistence: PersistenceBoundary | null;
  retention_renewal_review_posture: string; retention_renewal_review_persistence: PersistenceBoundary | null;
  evidence_retention_seal_posture: string; evidence_retention_seal_persistence: PersistenceBoundary | null;
  final_evidence_archive_posture: string; final_evidence_archive_persistence: PersistenceBoundary | null;
  durable_closure_certification_posture: string; durable_closure_certification_persistence: PersistenceBoundary | null;
  resolution_verification_posture: string; resolution_verification_persistence: PersistenceBoundary | null;
  recurrence_resolution_posture: string; recurrence_resolution_persistence: PersistenceBoundary | null;
  recurrence_audit_posture: string; recurrence_audit_persistence: PersistenceBoundary | null;
  exception_closure_posture: string; exception_closure_persistence: PersistenceBoundary | null;
  exception_review_posture: string; exception_review_persistence: PersistenceBoundary | null;
  operations_cadence_posture: string; operations_cadence_persistence: PersistenceBoundary | null;
  steady_state_transition_posture: string; steady_state_transition_persistence: PersistenceBoundary | null;
  additional_growth_observation_posture: string; additional_growth_observation_persistence: PersistenceBoundary | null;
  additional_growth_authorization_posture: string; additional_growth_authorization_persistence: PersistenceBoundary | null;
  expansion_health_observation_posture: string; expansion_health_observation_persistence: PersistenceBoundary | null;
  retention_renewal_cycle_reset_persistence: PersistenceBoundary;
  retention_renewal_cycle_reset_rules: string[]; retention_renewal_cycle_reset_limitations: string[]; next_best_step: string; validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey =
  | 'retention_renewal_archive_seal_posture'
  | 'retention_renewal_final_seal_posture'
  | 'retention_renewal_certification_posture'
  | 'retention_renewal_acceptance_posture'
  | 'retention_renewal_review_posture'
  | 'evidence_retention_seal_posture'
  | 'final_evidence_archive_posture'
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
  retention_renewal_cycle_reset_rows_total: 'Cycle-reset rows',
  waiting_for_external_retention_renewal_archive_seal_confirmation: 'Blocked by external archive-seal confirmation',
  waiting_for_manual_retention_renewal_cycle_reset: 'Awaiting external manual cycle reset',
  critical_cycle_reset_rows: 'Critical cycle-reset templates', high_cycle_reset_rows: 'High cycle-reset templates', medium_cycle_reset_rows: 'Medium cycle-reset templates',
  retention_renewal_cycle_reset_records_persisted_in_application: 'Cycle-reset records stored here'
};

const summaryHelpers: Record<string, string> = {
  retention_renewal_cycle_reset_rows_total: 'Read-only cycle-reset templates derived from Retention Renewal Archive Seal',
  waiting_for_external_retention_renewal_archive_seal_confirmation: 'Rows blocked until the external archive-seal record is independently confirmed',
  waiting_for_manual_retention_renewal_cycle_reset: 'Rows prepared only for an external manual cycle-reset record',
  critical_cycle_reset_rows: 'Template severity hints only; not observed external cycle-reset severity', high_cycle_reset_rows: 'Template severity hints only; not observed external cycle-reset severity', medium_cycle_reset_rows: 'Template severity hints only; not observed external cycle-reset severity',
  retention_renewal_cycle_reset_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external cycle-reset records or decisions'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
  { label: 'Retention renewal archive seal', key: 'retention_renewal_archive_seal_posture', to: '/platform/commercial-launch-retention-renewal-archive-seal' },
  { label: 'Retention renewal final seal', key: 'retention_renewal_final_seal_posture', to: '/platform/commercial-launch-retention-renewal-final-seal' },
  { label: 'Retention renewal certification', key: 'retention_renewal_certification_posture', to: '/platform/commercial-launch-retention-renewal-certification' },
  { label: 'Retention renewal acceptance', key: 'retention_renewal_acceptance_posture', to: '/platform/commercial-launch-retention-renewal-acceptance-docket' },
  { label: 'Retention renewal review', key: 'retention_renewal_review_posture', to: '/platform/commercial-launch-retention-renewal-review' },
  { label: 'Evidence retention seal', key: 'evidence_retention_seal_posture', to: '/platform/commercial-launch-evidence-retention-seal' },
  { label: 'Final evidence archive', key: 'final_evidence_archive_posture', to: '/platform/commercial-launch-final-evidence-archive' },
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
  { label: 'Retention Renewal Archive Seal', to: '/platform/commercial-launch-retention-renewal-archive-seal' },
  { label: 'Retention Renewal Final Seal', to: '/platform/commercial-launch-retention-renewal-final-seal' },
  { label: 'Retention Renewal Certification', to: '/platform/commercial-launch-retention-renewal-certification' },
  { label: 'Retention Renewal Acceptance', to: '/platform/commercial-launch-retention-renewal-acceptance-docket' },
  { label: 'Retention Renewal Review', to: '/platform/commercial-launch-retention-renewal-review' },
  { label: 'Evidence Retention Seal', to: '/platform/commercial-launch-evidence-retention-seal' },
  { label: 'Final Evidence Archive', to: '/platform/commercial-launch-final-evidence-archive' },
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
  missed_cadence: [{ label: 'Operations Cadence', to: '/platform/commercial-launch-steady-state-operations-cadence' }, { label: 'Production Monitoring', to: '/platform/production-monitoring-readiness' }],
  health_regression: [{ label: 'System Health', to: '/platform/system-health' }, { label: 'Dependencies', to: '/platform/service-dependencies' }, { label: 'Deployment Validation', to: '/platform/deployment-validation' }],
  customer_adoption_risk: [{ label: 'Customer Success', to: '/platform/customer-success-admin' }, { label: 'Announcements', to: '/platform/announcements', permission: PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_READ }],
  support_sla_risk: [{ label: 'Support Operations', to: '/platform/support-operations-cockpit' }, { label: 'Incidents', to: '/platform/incidents' }],
  billing_entitlement_exception: [{ label: 'Billing', to: '/platform/billing' }, { label: 'Tenants', to: '/platform/tenants' }],
  backup_restore_gap: [{ label: 'Backup Restore', to: '/platform/backup-restore-validation' }, { label: 'Tenant Exports', to: '/platform/tenant-exports' }, { label: 'Runbooks', to: '/platform/runbooks' }],
  deployment_smoke_test_gap: [{ label: 'Smoke Test', to: '/platform/commercial-launch-smoke-test-checklist' }, { label: 'Deployment Validation', to: '/platform/deployment-validation' }, { label: 'Releases', to: '/platform/releases', permission: PLATFORM_PERMISSIONS.PLATFORM_RELEASES_READ }],
  incident_prevention_gap: [{ label: 'Incident Closure', to: '/platform/commercial-launch-incident-closure' }, { label: 'Prevention Verification', to: '/platform/commercial-launch-prevention-verification' }, { label: 'Runbooks', to: '/platform/runbooks' }],
  growth_governance_exception: [{ label: 'Growth Observation', to: '/platform/commercial-launch-additional-growth-observation' }, { label: 'Additional Growth Authorization', to: '/platform/commercial-launch-additional-growth-authorization' }, { label: 'Expansion Health', to: '/platform/commercial-launch-expansion-health-observation' }]
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not available';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('critical') || normalized.includes('blocked') || normalized.includes('rollback') || normalized.includes('fail')) return 'danger';
  if (normalized.includes('high') || normalized.includes('waiting') || normalized.includes('manual') || normalized.includes('review') || normalized.includes('acceptance') || normalized.includes('external') || normalized.includes('preparation') || normalized.includes('required') || normalized.includes('hold')) return 'warn';
  if (normalized.includes('ready') || normalized.includes('continue')) return 'good';
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
    { label: 'Retention Renewal Archive Seal', to: '/platform/commercial-launch-retention-renewal-archive-seal' },
    { label: 'Retention Renewal Final Seal', to: '/platform/commercial-launch-retention-renewal-final-seal' },
    { label: 'Retention Renewal Certification', to: '/platform/commercial-launch-retention-renewal-certification' },
    { label: 'Retention Renewal Acceptance', to: '/platform/commercial-launch-retention-renewal-acceptance-docket' },
    { label: 'Retention Renewal Review', to: '/platform/commercial-launch-retention-renewal-review' },
    { label: 'Evidence Retention Seal', to: '/platform/commercial-launch-evidence-retention-seal' },
    { label: 'Final Evidence Archive', to: '/platform/commercial-launch-final-evidence-archive' },
    { label: 'Durable Closure', to: '/platform/commercial-launch-durable-closure-certification' },
    { label: 'Resolution Verification', to: '/platform/commercial-launch-steady-state-resolution-verification' },
    { label: 'Recurrence Resolution', to: '/platform/commercial-launch-steady-state-recurrence-resolution' },
    { label: 'Recurrence Audit', to: '/platform/commercial-launch-steady-state-recurrence-audit' },
    { label: 'Exception Closure', to: '/platform/commercial-launch-steady-state-exception-closure' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchRetentionRenewalCycleResetPage() {
  const cycleResetBoard = useQuery({
    queryKey: ['platform', 'commercial-launch-retention-renewal-cycle-reset'],
    queryFn: () => platformApiRequest<RetentionRenewalCycleResetBoard>('/platform/commercial-launch-retention-renewal-cycle-reset'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = cycleResetBoard.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = cycleResetBoard.isError && !data;
  const refreshError = cycleResetBoard.isError && Boolean(data);
  const requestError = readableError(cycleResetBoard.error);

  return (
    <div className="io-operational-page io-workspace-page platform-retention-renewal-cycle-reset">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-retention-renewal-cycle-reset"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Retention Renewal Cycle Reset"
        description="Read-only next-cycle reset preparation after Retention Renewal Archive Seal. It organizes archive-seal evidence locators, next-cycle owner assignments, cadence references, renewal-scope confirmation and accountable-owner acceptance without claiming that an external archive-seal or cycle-reset decision has occurred."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 244 — Commercial Launch Retention Renewal Cycle Reset Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Retention renewal cycle-reset preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External archive-seal confirmation required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-retention-renewal-cycle-reset__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.retention_renewal_cycle_reset_rows_total ?? data.retention_renewal_cycle_reset_rows.length : '—'} label="cycle-reset rows" />
            {data ? <span className="platform-retention-renewal-cycle-reset__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-retention-renewal-cycle-reset__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void cycleResetBoard.refetch()} disabled={cycleResetBoard.isFetching}>
                {cycleResetBoard.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-retention-renewal-cycle-reset__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-retention-renewal-cycle-reset"
          title="External retention-renewal cycle-reset boundary"
          description="This board prepares next-cycle reset requirements; it cannot observe or persist the real external retention-renewal archive-seal outcome, archive-seal evidence locator, next-cycle owner assignment, cadence reference, renewal-scope confirmation, accountable-owner acceptance, or cycle-reset decision."
        />
        <div className="platform-retention-renewal-cycle-reset__boundary-grid">
          <div className="platform-retention-renewal-cycle-reset__boundary-notice">
            <strong>Retention renewal cycle-reset preparation only.</strong>
            <span>Independently confirm the external Retention Renewal Archive Seal record before treating these cycle-reset rows as active. A zero stored-cycle-reset count does not prove that no external cycle-reset record exists.</span>
          </div>
          <div className="platform-retention-renewal-cycle-reset__supporting-pages">
            <strong>Supporting operations pages</strong>
            <span>Core shortcuts stay inside this page&apos;s 12-permission evidence boundary. Announcements and Releases appear only when the current operator also has those destination permissions.</span>
            <div className="platform-retention-renewal-cycle-reset__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {cycleResetBoard.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Retention Renewal Cycle Reset…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-retention-renewal-cycle-reset__feedback" role="alert">
          <strong>Unable to load Commercial Launch Retention Renewal Cycle Reset.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-retention-renewal-cycle-reset__retry" onClick={() => void cycleResetBoard.refetch()} disabled={cycleResetBoard.isFetching}>
            {cycleResetBoard.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-retention-renewal-cycle-reset__feedback platform-retention-renewal-cycle-reset__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Retention Renewal Cycle Reset snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-retention-renewal-cycle-reset__retry" onClick={() => void cycleResetBoard.refetch()} disabled={cycleResetBoard.isFetching}>
            {cycleResetBoard.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Retention renewal cycle reset summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard key={key} iconPath="/platform/commercial-launch-retention-renewal-cycle-reset" label={summaryLabels[key] || humanize(key)} value={value} helper={summaryHelpers[key] || 'Read-only derived snapshot metric'} />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-retention-renewal-cycle-reset__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-retention-renewal-cycle-reset" title="Current evidence chain" description="Current upstream posture and persistence context used to prepare retention-renewal cycle-reset requirements." />
            <div className="platform-retention-renewal-cycle-reset__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}><strong>{source.label}</strong><span>{humanize(data[source.key])}</span><Link to={source.to}>Open source page</Link></div>
              ))}
            </div>
            <div className="platform-retention-renewal-cycle-reset__persistence-grid">
              {[
                ['Retention renewal archive seal persistence', data.retention_renewal_archive_seal_persistence],
                ['Retention renewal final seal persistence', data.retention_renewal_final_seal_persistence],
                ['Retention renewal certification persistence', data.retention_renewal_certification_persistence],
                ['Retention renewal acceptance persistence', data.retention_renewal_acceptance_persistence],
                ['Retention renewal review persistence', data.retention_renewal_review_persistence],
                ['Evidence retention seal persistence', data.evidence_retention_seal_persistence],
                ['Final evidence archive persistence', data.final_evidence_archive_persistence],
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
                ['Retention renewal cycle reset persistence', data.retention_renewal_cycle_reset_persistence]
              ].map(([label, boundary]) => {
                const typedBoundary = boundary as PersistenceBoundary | null;
                return <div key={String(label)}><strong>{String(label)}</strong><span>{persistenceLabel(typedBoundary)}</span><small>{typedBoundary?.interpretation || 'No persistence interpretation reported.'}</small></div>;
              })}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-retention-renewal-cycle-reset__rows-section">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-retention-renewal-cycle-reset" title="Retention renewal cycle reset rows" description="Prepared cycle-reset requirements. Status and severity are preparation metadata, not observed external archive-seal or cycle-reset outcomes." />
            {data.retention_renewal_cycle_reset_rows.length === 0 ? (
              <div className="platform-retention-renewal-cycle-reset__empty-state">
                <strong>No retention-renewal cycle-reset rows were produced.</strong>
                <span>This is not evidence that retention-renewal archive seal or cycle reset occurred externally. The derived board remains blocked until source evidence can be established.</span>
              </div>
            ) : (
              <div className="platform-retention-renewal-cycle-reset__row-grid">
                {data.retention_renewal_cycle_reset_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-retention-renewal-cycle-reset__row-card">
                    <div className="platform-retention-renewal-cycle-reset__row-heading">
                      <div><h3>{humanize(row.code)}</h3><span>{humanize(row.domain)} · Owner: {humanize(row.owner)}</span></div>
                      <div className="platform-retention-renewal-cycle-reset__row-badges">
                        <span className="platform-retention-renewal-cycle-reset__status-badge" data-tone={badgeTone(row.severity_hint)}>{humanize(row.severity_hint)} severity hint</span>
                        <span className="platform-retention-renewal-cycle-reset__status-badge" data-tone={badgeTone(row.retention_renewal_cycle_reset_status)}>{humanize(row.retention_renewal_cycle_reset_status)}</span>
                      </div>
                    </div>
                    <div className="platform-retention-renewal-cycle-reset__template-note">Severity is a template hint; not an observed external cycle-reset severity. Cycle-reset status is preparation metadata only; not an observed external archive-seal or cycle-reset outcome.</div>
                    <div className="platform-retention-renewal-cycle-reset__source-summary">
                      <div><strong>Source Retention Renewal Archive Seal row</strong><span>{humanize(row.source_retention_renewal_archive_seal_code)}</span><small>{humanize(row.source_retention_renewal_archive_seal_status)}</small></div>
                      <div><strong>Source Retention Renewal Final Seal row</strong><span>{humanize(row.source_retention_renewal_final_seal_code)}</span><small>{humanize(row.source_retention_renewal_final_seal_status)}</small></div>
                      <div><strong>Source Retention Renewal Certification row</strong><span>{humanize(row.source_retention_renewal_certification_code)}</span><small>{humanize(row.source_retention_renewal_certification_status)}</small></div>
                      <div><strong>Source Retention Renewal Acceptance row</strong><span>{humanize(row.source_retention_renewal_acceptance_code)}</span><small>{humanize(row.source_retention_renewal_acceptance_status)}</small></div>
                      <div><strong>Source Retention Renewal Review row</strong><span>{humanize(row.source_retention_renewal_review_code)}</span><small>{humanize(row.source_retention_renewal_review_status)}</small></div>
                      <div><strong>Source Evidence Retention Seal row</strong><span>{humanize(row.source_evidence_retention_seal_code)}</span><small>{humanize(row.source_evidence_retention_seal_status)}</small></div>
                      <div><strong>Source Final Evidence Archive row</strong><span>{humanize(row.source_final_evidence_archive_code)}</span><small>{humanize(row.source_final_evidence_archive_status)}</small></div>
                      <div><strong>Source Durable Closure Certification row</strong><span>{humanize(row.source_durable_closure_certification_code)}</span><small>{humanize(row.source_durable_closure_certification_status)}</small></div>
                      <div><strong>Source Resolution Verification row</strong><span>{humanize(row.source_resolution_verification_code)}</span><small>{humanize(row.source_resolution_verification_status)}</small></div>
                      <div><strong>Source recurrence resolution row</strong><span>{humanize(row.source_recurrence_resolution_code)}</span><small>{humanize(row.source_recurrence_resolution_status)}</small></div>
                      <div><strong>Source recurrence audit row</strong><span>{humanize(row.source_recurrence_audit_code)}</span><small>{humanize(row.source_recurrence_audit_status)}</small></div>
                      <div><strong>Source exception closure row</strong><span>{humanize(row.source_closure_code)}</span><small>{humanize(row.source_closure_status)}</small></div>
                      <div><strong>Source exception review row</strong><span>{humanize(row.source_exception_code)}</span><small>{humanize(row.source_exception_review_status)}</small></div>
                      <div><strong>Release condition</strong><span>{humanize(row.release_condition)}</span></div>
                    </div>
                    <div className="platform-retention-renewal-cycle-reset__source-rows"><strong>Source Operations Cadence statuses</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.source_cadence_statuses.length ? row.source_cadence_statuses.map((source) => <span key={`${source.code}-${source.status}`}>{humanize(source.code)} · {humanize(source.status)} · {humanize(source.cadence)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-retention-renewal-cycle-reset__source-rows"><strong>Source Steady-state Transition row references</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.source_transition_rows.length ? row.source_transition_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-retention-renewal-cycle-reset__source-rows"><strong>Source Additional Growth Observation row references</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.source_observation_rows.length ? row.source_observation_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-retention-renewal-cycle-reset__source-rows"><strong>Source Additional Growth Authorization row references</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.source_authorization_rows.length ? row.source_authorization_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-retention-renewal-cycle-reset__field-groups">
                      <div><strong>Required source recurrence-audit evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_recurrence_audit_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source recurrence-resolution evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_recurrence_resolution_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source resolution-verification evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_resolution_verification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source durable-closure certification evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_durable_closure_certification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external final-archive evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_final_evidence_archive.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-seal evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_evidence_retention_seal.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal review evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_retention_renewal_review.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal acceptance evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_retention_renewal_acceptance.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal certification evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_retention_renewal_certification.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal final-seal evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_retention_renewal_final_seal.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal archive-seal evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_retention_renewal_archive_seal.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal cycle-reset evidence</strong><div className="platform-retention-renewal-cycle-reset__chips">{row.required_retention_renewal_cycle_reset.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Retention renewal cycle reset controls</strong><ul>{row.retention_renewal_cycle_reset_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                    <div className="platform-retention-renewal-cycle-reset__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-retention-renewal-cycle-reset__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-retention-renewal-cycle-reset" title="Retention renewal cycle-reset rules" description="Conditions that keep cycle reset manual, externally evidenced and archive-seal-confirmation-gated." /><ul>{data.retention_renewal_cycle_reset_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-retention-renewal-cycle-reset" title="Limitations" description="What this read-only cycle-reset board does not observe, persist or execute." /><ul>{data.retention_renewal_cycle_reset_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-retention-renewal-cycle-reset__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-retention-renewal-cycle-reset__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
