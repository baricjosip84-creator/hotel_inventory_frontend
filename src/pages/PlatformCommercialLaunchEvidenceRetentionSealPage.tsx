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
import './PlatformCommercialLaunchEvidenceRetentionSealPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type SourceCadenceStatus = { code: string; status: string; cadence: string };

type EvidenceRetentionSealRow = {
  code: string;
  source_final_evidence_archive_code: string;
  source_durable_closure_certification_code: string;
  source_resolution_verification_code: string;
  source_recurrence_resolution_code: string;
  source_recurrence_audit_code: string;
  source_closure_code: string;
  source_exception_code: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_final_evidence_archive_status: string;
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
  required_evidence_retention_seal: string[];
  evidence_retention_seal_controls: string[];
  evidence_retention_seal_status: string;
  release_condition: string;
};

type EvidenceRetentionSeal = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  evidence_retention_seal_rows: EvidenceRetentionSealRow[];
  final_evidence_archive_posture: string;
  final_evidence_archive_persistence: PersistenceBoundary | null;
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
  evidence_retention_seal_persistence: PersistenceBoundary;
  evidence_retention_seal_rules: string[];
  evidence_retention_seal_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey =
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
  evidence_retention_seal_rows_total: 'Evidence retention seal rows',
  waiting_for_external_final_evidence_archive_confirmation: 'Blocked by external final-archive confirmation',
  waiting_for_manual_evidence_retention_seal: 'Awaiting external manual retention seal',
  critical_retention_seal_rows: 'Critical seal templates',
  high_retention_seal_rows: 'High seal templates',
  medium_retention_seal_rows: 'Medium seal templates',
  evidence_retention_seal_records_persisted_in_application: 'Retention seal records stored here'
};

const summaryHelpers: Record<string, string> = {
  evidence_retention_seal_rows_total: 'Read-only retention-seal templates derived from Final Evidence Archive',
  waiting_for_external_final_evidence_archive_confirmation: 'Rows blocked until the external final-archive record is independently confirmed',
  waiting_for_manual_evidence_retention_seal: 'Rows prepared only for an external manual retention-seal record',
  critical_retention_seal_rows: 'Template severity hints only; not observed external retention-seal severity',
  high_retention_seal_rows: 'Template severity hints only; not observed external retention-seal severity',
  medium_retention_seal_rows: 'Template severity hints only; not observed external retention-seal severity',
  evidence_retention_seal_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external retention-seal records or acceptance decisions'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
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
    { label: 'Final Evidence Archive', to: '/platform/commercial-launch-final-evidence-archive' },
    { label: 'Durable Closure', to: '/platform/commercial-launch-durable-closure-certification' },
    { label: 'Resolution Verification', to: '/platform/commercial-launch-steady-state-resolution-verification' },
    { label: 'Recurrence Resolution', to: '/platform/commercial-launch-steady-state-recurrence-resolution' },
    { label: 'Recurrence Audit', to: '/platform/commercial-launch-steady-state-recurrence-audit' },
    { label: 'Exception Closure', to: '/platform/commercial-launch-steady-state-exception-closure' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchEvidenceRetentionSealPage() {
  const evidenceRetentionSeal = useQuery({
    queryKey: ['platform', 'commercial-launch-evidence-retention-seal'],
    queryFn: () => platformApiRequest<EvidenceRetentionSeal>('/platform/commercial-launch-evidence-retention-seal'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = evidenceRetentionSeal.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = evidenceRetentionSeal.isError && !data;
  const refreshError = evidenceRetentionSeal.isError && Boolean(data);
  const requestError = readableError(evidenceRetentionSeal.error);

  return (
    <div className="io-operational-page io-workspace-page platform-evidence-retention-seal">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-evidence-retention-seal"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Evidence Retention Seal"
        description="Read-only retention-seal preparation after Final Evidence Archive. It organizes repository locators, retention-owner acceptance, reopen-threshold seals and next-review seals without claiming that the external final archive or retention-seal acceptance has occurred."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 239 — Commercial Launch Evidence Retention Seal Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Evidence retention seal preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External final-archive record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-evidence-retention-seal__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.evidence_retention_seal_rows_total ?? data.evidence_retention_seal_rows.length : '—'} label="seal rows" />
            {data ? <span className="platform-evidence-retention-seal__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-evidence-retention-seal__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void evidenceRetentionSeal.refetch()} disabled={evidenceRetentionSeal.isFetching}>
                {evidenceRetentionSeal.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-evidence-retention-seal__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-evidence-retention-seal"
          title="External evidence-retention seal boundary"
          description="This board prepares retention-seal requirements; it cannot observe or persist the real external Final Evidence Archive outcome or external repository locators, retention-owner acceptances, reopen-threshold seals, next-review seals or retention-seal acceptance decisions."
        />
        <div className="platform-evidence-retention-seal__boundary-grid">
          <div className="platform-evidence-retention-seal__boundary-notice">
            <strong>Evidence retention seal preparation only.</strong>
            <span>Independently confirm the external Final Evidence Archive record before treating these seal rows as active. A zero stored-seal count does not prove that no external retention-seal record exists.</span>
          </div>
          <div className="platform-evidence-retention-seal__supporting-pages">
            <strong>Supporting operations pages</strong>
            <span>Core shortcuts stay inside this page&apos;s 12-permission evidence boundary. Announcements and Releases appear only when the current operator also has those destination permissions.</span>
            <div className="platform-evidence-retention-seal__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {evidenceRetentionSeal.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Evidence Retention Seal…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-evidence-retention-seal__feedback" role="alert">
          <strong>Unable to load Commercial Launch Evidence Retention Seal.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-evidence-retention-seal__retry" onClick={() => void evidenceRetentionSeal.refetch()} disabled={evidenceRetentionSeal.isFetching}>
            {evidenceRetentionSeal.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-evidence-retention-seal__feedback platform-evidence-retention-seal__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Evidence Retention Seal snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-evidence-retention-seal__retry" onClick={() => void evidenceRetentionSeal.refetch()} disabled={evidenceRetentionSeal.isFetching}>
            {evidenceRetentionSeal.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Evidence retention seal summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard key={key} iconPath="/platform/commercial-launch-evidence-retention-seal" label={summaryLabels[key] || humanize(key)} value={value} helper={summaryHelpers[key] || 'Read-only derived snapshot metric'} />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-evidence-retention-seal__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-evidence-retention-seal" title="Current evidence chain" description="Current upstream posture and persistence context used to prepare the evidence-retention seal board." />
            <div className="platform-evidence-retention-seal__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}><strong>{source.label}</strong><span>{humanize(data[source.key])}</span><Link to={source.to}>Open source page</Link></div>
              ))}
            </div>
            <div className="platform-evidence-retention-seal__persistence-grid">
              {[
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
                ['Evidence retention seal persistence', data.evidence_retention_seal_persistence]
              ].map(([label, boundary]) => {
                const typedBoundary = boundary as PersistenceBoundary | null;
                return <div key={String(label)}><strong>{String(label)}</strong><span>{persistenceLabel(typedBoundary)}</span><small>{typedBoundary?.interpretation || 'No persistence interpretation reported.'}</small></div>;
              })}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-evidence-retention-seal__rows-section">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-evidence-retention-seal" title="Evidence retention seal rows" description="Prepared retention-seal requirements. Status and severity are preparation metadata, not observed external retention-seal outcomes." />
            {data.evidence_retention_seal_rows.length === 0 ? (
              <div className="platform-evidence-retention-seal__empty-state">
                <strong>No evidence-retention seal rows were produced.</strong>
                <span>This is not evidence that final archiving or retention sealing occurred externally. The derived board remains blocked until source evidence can be established.</span>
              </div>
            ) : (
              <div className="platform-evidence-retention-seal__row-grid">
                {data.evidence_retention_seal_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-evidence-retention-seal__row-card">
                    <div className="platform-evidence-retention-seal__row-heading">
                      <div><h3>{humanize(row.code)}</h3><span>{humanize(row.domain)} · Owner: {humanize(row.owner)}</span></div>
                      <div className="platform-evidence-retention-seal__row-badges">
                        <span className="platform-evidence-retention-seal__status-badge" data-tone={badgeTone(row.severity_hint)}>{humanize(row.severity_hint)} severity hint</span>
                        <span className="platform-evidence-retention-seal__status-badge" data-tone={badgeTone(row.evidence_retention_seal_status)}>{humanize(row.evidence_retention_seal_status)}</span>
                      </div>
                    </div>
                    <div className="platform-evidence-retention-seal__template-note">Severity is a template hint; not an observed external retention-seal severity. Retention-seal status is preparation metadata only; not an observed external seal acceptance outcome.</div>
                    <div className="platform-evidence-retention-seal__source-summary">
                      <div><strong>Source Final Evidence Archive row</strong><span>{humanize(row.source_final_evidence_archive_code)}</span><small>{humanize(row.source_final_evidence_archive_status)}</small></div>
                      <div><strong>Source Durable Closure Certification row</strong><span>{humanize(row.source_durable_closure_certification_code)}</span><small>{humanize(row.source_durable_closure_certification_status)}</small></div>
                      <div><strong>Source Resolution Verification row</strong><span>{humanize(row.source_resolution_verification_code)}</span><small>{humanize(row.source_resolution_verification_status)}</small></div>
                      <div><strong>Source recurrence resolution row</strong><span>{humanize(row.source_recurrence_resolution_code)}</span><small>{humanize(row.source_recurrence_resolution_status)}</small></div>
                      <div><strong>Source recurrence audit row</strong><span>{humanize(row.source_recurrence_audit_code)}</span><small>{humanize(row.source_recurrence_audit_status)}</small></div>
                      <div><strong>Source exception closure row</strong><span>{humanize(row.source_closure_code)}</span><small>{humanize(row.source_closure_status)}</small></div>
                      <div><strong>Source exception review row</strong><span>{humanize(row.source_exception_code)}</span><small>{humanize(row.source_exception_review_status)}</small></div>
                      <div><strong>Release condition</strong><span>{humanize(row.release_condition)}</span></div>
                    </div>
                    <div className="platform-evidence-retention-seal__source-rows"><strong>Source Operations Cadence statuses</strong><div className="platform-evidence-retention-seal__chips">{row.source_cadence_statuses.length ? row.source_cadence_statuses.map((source) => <span key={`${source.code}-${source.status}`}>{humanize(source.code)} · {humanize(source.status)} · {humanize(source.cadence)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-evidence-retention-seal__source-rows"><strong>Source Steady-state Transition row references</strong><div className="platform-evidence-retention-seal__chips">{row.source_transition_rows.length ? row.source_transition_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-evidence-retention-seal__source-rows"><strong>Source Additional Growth Observation row references</strong><div className="platform-evidence-retention-seal__chips">{row.source_observation_rows.length ? row.source_observation_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-evidence-retention-seal__source-rows"><strong>Source Additional Growth Authorization row references</strong><div className="platform-evidence-retention-seal__chips">{row.source_authorization_rows.length ? row.source_authorization_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-evidence-retention-seal__field-groups">
                      <div><strong>Required source recurrence-audit evidence</strong><div className="platform-evidence-retention-seal__chips">{row.required_recurrence_audit_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source recurrence-resolution evidence</strong><div className="platform-evidence-retention-seal__chips">{row.required_recurrence_resolution_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source resolution-verification evidence</strong><div className="platform-evidence-retention-seal__chips">{row.required_resolution_verification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required source durable-closure certification evidence</strong><div className="platform-evidence-retention-seal__chips">{row.required_durable_closure_certification_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external final-archive evidence</strong><div className="platform-evidence-retention-seal__chips">{row.required_final_evidence_archive.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external retention-seal evidence</strong><div className="platform-evidence-retention-seal__chips">{row.required_evidence_retention_seal.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Evidence retention seal controls</strong><ul>{row.evidence_retention_seal_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                    <div className="platform-evidence-retention-seal__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-evidence-retention-seal__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-evidence-retention-seal" title="Evidence retention seal rules" description="Conditions that keep retention sealing manual, externally evidenced and review-gated." /><ul>{data.evidence_retention_seal_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-evidence-retention-seal" title="Limitations" description="What this read-only retention-seal board does not observe, certify, persist or execute." /><ul>{data.evidence_retention_seal_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-evidence-retention-seal__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-evidence-retention-seal__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
