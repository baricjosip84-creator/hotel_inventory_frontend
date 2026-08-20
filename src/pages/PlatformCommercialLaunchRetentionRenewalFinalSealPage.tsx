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
import './PlatformCommercialLaunchRetentionRenewalFinalSealPage.css';

type PersistenceBoundary = { stored_in_application: boolean; external_records_observable: boolean; interpretation: string };
type SourceCadenceStatus = { code: string; status: string; cadence: string };

type RetentionRenewalFinalSealRow = {
  code: string;
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
  required_retention_renewal_final_seal: string[]; retention_renewal_final_seal_controls: string[]; retention_renewal_final_seal_status: string; release_condition: string;
};

type RetentionRenewalFinalSealBoard = {
  phase: string; step: string; posture: string; generated_at: string; summary: Record<string, number>;
  retention_renewal_final_seal_rows: RetentionRenewalFinalSealRow[];
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
  retention_renewal_final_seal_persistence: PersistenceBoundary;
  retention_renewal_final_seal_rules: string[]; retention_renewal_final_seal_limitations: string[]; next_best_step: string; validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey =
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
  retention_renewal_final_seal_rows_total: 'Final-seal rows',
  waiting_for_external_retention_renewal_certification_confirmation: 'Blocked by external certification confirmation',
  waiting_for_manual_retention_renewal_final_seal: 'Awaiting external manual final seal',
  critical_final_seal_rows: 'Critical final-seal templates', high_final_seal_rows: 'High final-seal templates', medium_final_seal_rows: 'Medium final-seal templates',
  retention_renewal_final_seal_records_persisted_in_application: 'Final-seal records stored here'
};

const summaryHelpers: Record<string, string> = {
  retention_renewal_final_seal_rows_total: 'Read-only final-seal templates derived from Retention Renewal Certification',
  waiting_for_external_retention_renewal_certification_confirmation: 'Rows blocked until the external certification record is independently confirmed',
  waiting_for_manual_retention_renewal_final_seal: 'Rows prepared only for an external manual final-seal record',
  critical_final_seal_rows: 'Template severity hints only; not observed external final-seal severity', high_final_seal_rows: 'Template severity hints only; not observed external final-seal severity', medium_final_seal_rows: 'Template severity hints only; not observed external final-seal severity',
  retention_renewal_final_seal_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external final-seal records or decisions'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
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

export default function PlatformCommercialLaunchRetentionRenewalFinalSealPage() {
  const finalSealBoard = useQuery({
    queryKey: ['platform', 'commercial-launch-retention-renewal-final-seal'],
    queryFn: () => platformApiRequest<RetentionRenewalFinalSealBoard>('/platform/commercial-launch-retention-renewal-final-seal'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = finalSealBoard.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = finalSealBoard.isError && !data;
  const refreshError = finalSealBoard.isError && Boolean(data);
  const requestError = readableError(finalSealBoard.error);

  return (
    <div className="io-operational-page io-workspace-page platform-retention-renewal-final-seal">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-retention-renewal-final-seal"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Retention Renewal Final Seal"
        description="Read-only final-seal preparation after Retention Renewal Certification. It organizes certification evidence locators, renewed domain evidence locators, accountable-owner final-seal acceptance and next retention-renewal windows without claiming that an external certification or final-seal decision has occurred."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 243 — Commercial Launch Retention Renewal Final Seal Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Retention renewal final-seal preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External certification record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-retention-renewal-final-seal__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.retention_renewal_final_seal_rows_total ?? data.retention_renewal_final_seal_rows.length : '—'} label="final-seal rows" />
            {data ? <span className="platform-retention-renewal-final-seal__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-retention-renewal-final-seal__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void finalSealBoard.refetch()} disabled={finalSealBoard.isFetching}>
                {finalSealBoard.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-retention-renewal-final-seal__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-retention-renewal-final-seal"
          title="External retention-renewal final-seal boundary"
          description="This board prepares final-seal requirements; it cannot observe or persist the real external retention-renewal certification outcome, certification evidence locator, renewed domain evidence locator, accountable-owner final-seal acceptance, next retention-renewal window, or final-seal decision."
        />
        <div className="platform-retention-renewal-final-seal__boundary-grid">
          <div className="platform-retention-renewal-final-seal__boundary-notice">
            <strong>Retention renewal final-seal preparation only.</strong>
            <span>Independently confirm the external Retention Renewal Certification record before treating these final-seal rows as active. A zero stored-final-seal count does not prove that no external final-seal record exists.</span>
          </div>
          <div className="platform-retention-renewal-final-seal__supporting-pages">
            <strong>Supporting operations pages</strong>
            <span>Core shortcuts stay inside this page&apos;s 12-permission evidence boundary. Announcements and Releases appear only when the current operator also has those destination permissions.</span>
            <div className="platform-retention-renewal-final-seal__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {finalSealBoard.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Retention Renewal Final Seal…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-retention-renewal-final-seal__feedback" role="alert">
          <strong>Unable to load Commercial Launch Retention Renewal Final Seal.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-retention-renewal-final-seal__retry" onClick={() => void finalSealBoard.refetch()} disabled={finalSealBoard.isFetching}>
            {finalSealBoard.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-retention-renewal-final-seal__feedback platform-retention-renewal-final-seal__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Retention Renewal Final Seal snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-retention-renewal-final-seal__retry" onClick={() => void finalSealBoard.refetch()} disabled={finalSealBoard.isFetching}>
            {finalSealBoard.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Retention renewal final seal summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard key={key} iconPath="/platform/commercial-launch-retention-renewal-final-seal" label={summaryLabels[key] || humanize(key)} value={value} helper={summaryHelpers[key] || 'Read-only derived snapshot metric'} />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-retention-renewal-final-seal__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-retention-renewal-final-seal" title="Current evidence chain" description="Current upstream posture and persistence context used to prepare retention-renewal final-seal requirements." />
            <div className="platform-retention-renewal-final-seal__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}><strong>{source.label}</strong><span>{humanize(data[source.key])}</span><Link to={source.to}>Open source page</Link></div>
              ))}
            </div>
            <div className="platform-retention-renewal-final-seal__persistence-grid">
              {[
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
                ['Retention renewal final seal persistence', data.retention_renewal_final_seal_persistence]
              ].map(([label, boundary]) => {
                const typedBoundary = boundary as PersistenceBoundary | null;
                return <div key={String(label)}><strong>{String(label)}</strong><span>{persistenceLabel(typedBoundary)}</span><small>{typedBoundary?.interpretation || 'No persistence interpretation reported.'}</small></div>;
              })}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-retention-renewal-final-seal__rows-section">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-retention-renewal-final-seal" title="Retention renewal final seal rows" description="Prepared final-seal requirements. Status and severity are preparation metadata, not observed external certification or final-seal outcomes." />
            {data.retention_renewal_final_seal_rows.length === 0 ? (
              <div className="platform-retention-renewal-final-seal__empty-state">
                <strong>No retention-renewal final-seal rows were produced.</strong>
                <span>This is not evidence that retention-renewal certification or final seal occurred externally. The derived board remains blocked until source evidence can be established.</span>
              </div>
            ) : (
              <div className="platform-retention-renewal-final-seal__row-grid">
                {data.retention_renewal_final_seal_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-retention-renewal-final-seal__row-card">
                    <div className="platform-retention-renewal-final-seal__row-heading">
                      <div><h3>{humanize(row.code)}</h3><span>{humanize(row.domain)} · Owner: {humanize(row.owner)}</span></div>
                      <div className="platform-retention-renewal-final-seal__row-badges">
                        <span className="platform-retention-renewal-final-seal__status-badge" data-tone={badgeTone(row.severity_hint)}>{humanize(row.severity_hint)} severity hint</span>
                        <span className="platform-retention-renewal-final-seal__status-badge" data-tone={badgeTone(row.retention_renewal_final_seal_status)}>{humanize(row.retention_renewal_final_seal_status)}</span>
                      </div>
                    </div>
                    <div className="platform-retention-renewal-final-seal__template-note">Severity is a template hint; not an observed external final-seal severity. Final-seal status is preparation metadata only; not an observed external certification or final-seal outcome.</div>
                    <div className="platform-retention-renewal-final-seal__source-summary">
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
                    <div className="platform-retention-renewal-final-seal__source-rows"><strong>Source Operations Cadence statuses</strong><div className="platform-retention-renewal-final-seal__chips">{row.source_cadence_statuses.length ? row.source_cadence_statuses.map((source) => <span key={`${source.code}-${source.status}`}>{humanize(source.code)} · {humanize(source.status)} · {humanize(source.cadence)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-retention-renewal-final-seal__source-rows"><strong>Source Steady-state Transition row references</strong><div className="platform-retention-renewal-final-seal__chips">{row.source_transition_rows.length ? row.source_transition_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-retention-renewal-final-seal__source-rows"><strong>Source Additional Growth Observation row references</strong><div className="platform-retention-renewal-final-seal__chips">{row.source_observation_rows.length ? row.source_observation_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-retention-renewal-final-seal__source-rows"><strong>Source Additional Growth Authorization row references</strong><div className="platform-retention-renewal-final-seal__chips">{row.source_authorization_rows.length ? row.source_authorization_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-retention-renewal-final-seal__field-groups">
                      <div><strong>Required source recurrence-audit evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_recurrence_audit_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source recurrence-resolution evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_recurrence_resolution_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source resolution-verification evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_resolution_verification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source durable-closure certification evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_durable_closure_certification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external final-archive evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_final_evidence_archive.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-seal evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_evidence_retention_seal.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal review evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_retention_renewal_review.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal acceptance evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_retention_renewal_acceptance.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal certification evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_retention_renewal_certification.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-renewal final-seal evidence</strong><div className="platform-retention-renewal-final-seal__chips">{row.required_retention_renewal_final_seal.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Retention renewal final seal controls</strong><ul>{row.retention_renewal_final_seal_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                    <div className="platform-retention-renewal-final-seal__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-retention-renewal-final-seal__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-retention-renewal-final-seal" title="Retention renewal final-seal rules" description="Conditions that keep final-seal manual, externally evidenced and certification-gated." /><ul>{data.retention_renewal_final_seal_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-retention-renewal-final-seal" title="Limitations" description="What this read-only final-seal board does not observe, certify, persist or execute." /><ul>{data.retention_renewal_final_seal_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-retention-renewal-final-seal__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-retention-renewal-final-seal__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
