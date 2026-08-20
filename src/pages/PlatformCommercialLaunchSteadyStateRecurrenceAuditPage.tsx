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
import './PlatformCommercialLaunchSteadyStateRecurrenceAuditPage.css';

type PersistenceBoundary = {
  stored_in_application: boolean;
  external_records_observable: boolean;
  interpretation: string;
};

type SourceCadenceStatus = { code: string; status: string; cadence: string };

type RecurrenceAuditRow = {
  code: string;
  source_closure_code: string;
  source_exception_code: string;
  domain: string;
  owner: string;
  severity_hint: string;
  source_closure_status: string;
  source_exception_review_status: string;
  source_cadence_statuses: SourceCadenceStatus[];
  source_transition_rows: string[];
  source_observation_rows: string[];
  source_authorization_rows: string[];
  required_closure_evidence: string[];
  required_recurrence_audit_evidence: string[];
  recurrence_audit_controls: string[];
  recurrence_audit_status: string;
  release_condition: string;
};

type RecurrenceAudit = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  recurrence_audit_rows: RecurrenceAuditRow[];
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
  recurrence_audit_persistence: PersistenceBoundary;
  recurrence_audit_rules: string[];
  recurrence_audit_limitations: string[];
  next_best_step: string;
  validation_note: string;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';
type PageLink = { label: string; to: string; permission?: PlatformPermission };
type SourcePostureKey = 'exception_closure_posture' | 'exception_review_posture' | 'operations_cadence_posture' | 'steady_state_transition_posture' | 'additional_growth_observation_posture' | 'additional_growth_authorization_posture' | 'expansion_health_observation_posture';

const summaryLabels: Record<string, string> = {
  recurrence_audit_rows_total: 'Recurrence-audit rows',
  waiting_for_exception_closure_completion: 'Blocked by exception closure',
  waiting_for_manual_recurrence_audit: 'Awaiting external manual audit',
  critical_recurrence_rows: 'Critical audit templates',
  high_recurrence_rows: 'High audit templates',
  medium_recurrence_rows: 'Medium audit templates',
  recurrence_audit_records_persisted_in_application: 'Recurrence-audit records stored here'
};

const summaryHelpers: Record<string, string> = {
  recurrence_audit_rows_total: 'Read-only recurrence templates derived from Steady-state Exception Closure',
  waiting_for_exception_closure_completion: 'Rows blocked because closure evidence remains unresolved or externally unconfirmed',
  waiting_for_manual_recurrence_audit: 'Rows ready only for an external manual recurrence-audit record',
  critical_recurrence_rows: 'Template severity hints only; not observed external recurrence severity',
  high_recurrence_rows: 'Template severity hints only; not observed external recurrence severity',
  medium_recurrence_rows: 'Template severity hints only; not observed external recurrence severity',
  recurrence_audit_records_persisted_in_application: 'Expected to remain zero because this endpoint stores no external recurrence-audit records or acceptances'
};

const sourcePostures: Array<{ label: string; key: SourcePostureKey; to: string }> = [
  { label: 'Exception closure', key: 'exception_closure_posture', to: '/platform/commercial-launch-steady-state-exception-closure' },
  { label: 'Exception review', key: 'exception_review_posture', to: '/platform/commercial-launch-steady-state-exception-review' },
  { label: 'Operations cadence', key: 'operations_cadence_posture', to: '/platform/commercial-launch-steady-state-operations-cadence' },
  { label: 'Steady-state transition', key: 'steady_state_transition_posture', to: '/platform/commercial-launch-steady-state-transition' },
  { label: 'Additional growth observation', key: 'additional_growth_observation_posture', to: '/platform/commercial-launch-additional-growth-observation' },
  { label: 'Additional growth authorization', key: 'additional_growth_authorization_posture', to: '/platform/commercial-launch-additional-growth-authorization' },
  { label: 'Expansion health observation', key: 'expansion_health_observation_posture', to: '/platform/commercial-launch-expansion-health-observation' }
];

const supportingLinks: PageLink[] = [
  { label: 'Exception Closure', to: '/platform/commercial-launch-steady-state-exception-closure' },
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
    { label: 'Exception Closure', to: '/platform/commercial-launch-steady-state-exception-closure' },
    ...(domainEvidenceLinks[domain] || [])
  ]);
}

export default function PlatformCommercialLaunchSteadyStateRecurrenceAuditPage() {
  const recurrenceAudit = useQuery({
    queryKey: ['platform', 'commercial-launch-steady-state-recurrence-audit'],
    queryFn: () => platformApiRequest<RecurrenceAudit>('/platform/commercial-launch-steady-state-recurrence-audit'),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = recurrenceAudit.data;
  const summaryEntries = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const initialLoadError = recurrenceAudit.isError && !data;
  const refreshError = recurrenceAudit.isError && Boolean(data);
  const requestError = readableError(recurrenceAudit.error);

  return (
    <div className="io-operational-page io-workspace-page platform-steady-state-recurrence-audit">
      <OperationalWorkspaceHero
        iconPath="/platform/commercial-launch-steady-state-recurrence-audit"
        eyebrow="Platform Commercial Launch Readiness"
        title="Commercial Launch Steady-State Recurrence Audit"
        description="Read-only recurrence-audit preparation after Steady-state Exception Closure. It organizes recurrence windows, domain-specific retests, reopen thresholds and owner reacceptance without reopening incidents, closing exceptions, scheduling work or mutating operational systems."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 234 — Commercial Launch Steady-State Recurrence Audit Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Recurrence audit preparation only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>External recurrence record required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-steady-state-recurrence-audit__hero-aside">
            <OperationalWorkspaceStatus value={data ? data.summary.recurrence_audit_rows_total ?? data.recurrence_audit_rows.length : '—'} label="recurrence-audit rows" />
            {data ? <span className="platform-steady-state-recurrence-audit__status-badge" data-tone={badgeTone(data.posture)}>{humanize(data.posture)}</span> : null}
            <div className="platform-steady-state-recurrence-audit__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button type="button" className="app-button app-button--secondary" onClick={() => void recurrenceAudit.refetch()} disabled={recurrenceAudit.isFetching}>
                {recurrenceAudit.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-steady-state-recurrence-audit__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/commercial-launch-steady-state-recurrence-audit"
          title="External recurrence-audit boundary"
          description="This board prepares recurrence-audit requirements; it cannot observe or persist the real Exception Closure acceptance record or real external recurrence retests, reopen thresholds, decisions and owner reacceptance."
        />
        <div className="platform-steady-state-recurrence-audit__boundary-grid">
          <div className="platform-steady-state-recurrence-audit__boundary-notice">
            <strong>Recurrence audit preparation only.</strong>
            <span>Independently confirm the external Steady-state Exception Closure record before treating these audit rows as active. A zero stored-audit count does not prove that no external recurrence-audit record exists.</span>
          </div>
          <div className="platform-steady-state-recurrence-audit__supporting-pages">
            <strong>Supporting operations pages</strong>
            <span>Core shortcuts stay inside this page&apos;s 12-permission evidence boundary. Announcements and Releases appear only when the current operator also has those destination permissions.</span>
            <div className="platform-steady-state-recurrence-audit__link-row">
              {visibleLinks(supportingLinks).map((link) => <Link key={link.to} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
            </div>
          </div>
        </div>
      </section>

      {recurrenceAudit.isLoading ? <section className="app-panel app-panel--padded">Loading Commercial Launch Steady-State Recurrence Audit…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-steady-state-recurrence-audit__feedback" role="alert">
          <strong>Unable to load Commercial Launch Steady-State Recurrence Audit.</strong>
          <span>{requestError}</span>
          <button type="button" className="app-button app-button--danger platform-steady-state-recurrence-audit__retry" onClick={() => void recurrenceAudit.refetch()} disabled={recurrenceAudit.isFetching}>
            {recurrenceAudit.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-steady-state-recurrence-audit__feedback platform-steady-state-recurrence-audit__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful Commercial Launch Steady-State Recurrence Audit snapshot. {requestError}</span>
          <button type="button" className="app-button app-button--secondary platform-steady-state-recurrence-audit__retry" onClick={() => void recurrenceAudit.refetch()} disabled={recurrenceAudit.isFetching}>
            {recurrenceAudit.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Steady-state recurrence audit summary">
            {summaryEntries.map(([key, value]) => (
              <OperationalWorkspaceStatCard key={key} iconPath="/platform/commercial-launch-steady-state-recurrence-audit" label={summaryLabels[key] || humanize(key)} value={value} helper={summaryHelpers[key] || 'Read-only derived snapshot metric'} />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-steady-state-recurrence-audit__context-panel">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-recurrence-audit" title="Current evidence chain" description="Current upstream posture and persistence context used to prepare the recurrence-audit board." />
            <div className="platform-steady-state-recurrence-audit__source-grid">
              {sourcePostures.map((source) => (
                <div key={source.key}><strong>{source.label}</strong><span>{humanize(data[source.key])}</span><Link to={source.to}>Open source page</Link></div>
              ))}
            </div>
            <div className="platform-steady-state-recurrence-audit__persistence-grid">
              {[
                ['Exception-closure persistence', data.exception_closure_persistence],
                ['Exception-review persistence', data.exception_review_persistence],
                ['Operations cadence persistence', data.operations_cadence_persistence],
                ['Steady-state transition persistence', data.steady_state_transition_persistence],
                ['Additional-growth observation persistence', data.additional_growth_observation_persistence],
                ['Additional-growth authorization persistence', data.additional_growth_authorization_persistence],
                ['Expansion-health observation persistence', data.expansion_health_observation_persistence],
                ['Recurrence-audit persistence', data.recurrence_audit_persistence]
              ].map(([label, boundary]) => {
                const typedBoundary = boundary as PersistenceBoundary | null;
                return <div key={String(label)}><strong>{String(label)}</strong><span>{persistenceLabel(typedBoundary)}</span><small>{typedBoundary?.interpretation || 'No persistence interpretation reported.'}</small></div>;
              })}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-recurrence-audit__rows-section">
            <OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-recurrence-audit" title="Recurrence audit rows" description="Prepared recurrence-audit requirements. Status and severity are preparation metadata, not observed external recurrence outcomes." />
            {data.recurrence_audit_rows.length === 0 ? (
              <div className="platform-steady-state-recurrence-audit__empty-state">
                <strong>No recurrence-audit rows were produced.</strong>
                <span>This is not evidence that recurrence risk is cleared or that external recurrence-audit work is complete. The derived board remains blocked until source evidence can be established.</span>
              </div>
            ) : (
              <div className="platform-steady-state-recurrence-audit__row-grid">
                {data.recurrence_audit_rows.map((row) => (
                  <article key={row.code} className="app-panel platform-steady-state-recurrence-audit__row-card">
                    <div className="platform-steady-state-recurrence-audit__row-heading">
                      <div><h3>{humanize(row.code)}</h3><span>{humanize(row.domain)} · Owner: {humanize(row.owner)}</span></div>
                      <div className="platform-steady-state-recurrence-audit__row-badges">
                        <span className="platform-steady-state-recurrence-audit__status-badge" data-tone={badgeTone(row.severity_hint)}>{humanize(row.severity_hint)} severity hint</span>
                        <span className="platform-steady-state-recurrence-audit__status-badge" data-tone={badgeTone(row.recurrence_audit_status)}>{humanize(row.recurrence_audit_status)}</span>
                      </div>
                    </div>
                    <div className="platform-steady-state-recurrence-audit__template-note">Severity is a template hint; not an observed external recurrence severity. Recurrence-audit status is preparation metadata only; not an observed external audit outcome.</div>
                    <div className="platform-steady-state-recurrence-audit__source-summary">
                      <div><strong>Source exception closure row</strong><span>{humanize(row.source_closure_code)}</span><small>{humanize(row.source_closure_status)}</small></div>
                      <div><strong>Source exception review row</strong><span>{humanize(row.source_exception_code)}</span><small>{humanize(row.source_exception_review_status)}</small></div>
                      <div><strong>Release condition</strong><span>{humanize(row.release_condition)}</span></div>
                    </div>
                    <div className="platform-steady-state-recurrence-audit__source-rows"><strong>Source Operations Cadence statuses</strong><div className="platform-steady-state-recurrence-audit__chips">{row.source_cadence_statuses.length ? row.source_cadence_statuses.map((source) => <span key={`${source.code}-${source.status}`}>{humanize(source.code)} · {humanize(source.status)} · {humanize(source.cadence)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-recurrence-audit__source-rows"><strong>Source Steady-state Transition row references</strong><div className="platform-steady-state-recurrence-audit__chips">{row.source_transition_rows.length ? row.source_transition_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-recurrence-audit__source-rows"><strong>Source Additional Growth Observation row references</strong><div className="platform-steady-state-recurrence-audit__chips">{row.source_observation_rows.length ? row.source_observation_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-recurrence-audit__source-rows"><strong>Source Additional Growth Authorization row references</strong><div className="platform-steady-state-recurrence-audit__chips">{row.source_authorization_rows.length ? row.source_authorization_rows.map((value) => <span key={value}>{humanize(value)}</span>) : <span>None reported</span>}</div></div>
                    <div className="platform-steady-state-recurrence-audit__field-groups">
                      <div><strong>Required source closure evidence</strong><div className="platform-steady-state-recurrence-audit__chips">{row.required_closure_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Required external recurrence evidence</strong><div className="platform-steady-state-recurrence-audit__chips">{row.required_recurrence_audit_evidence.map((field) => <span key={field}>{humanize(field)}</span>)}</div></div>
                      <div><strong>Recurrence audit controls</strong><ul>{row.recurrence_audit_controls.map((control) => <li key={control}>{control}</li>)}</ul></div>
                    </div>
                    <div className="platform-steady-state-recurrence-audit__row-actions">
                      {evidenceLinksForDomain(row.domain).map((link) => <Link key={`${row.code}-${link.to}`} className="app-button app-button--secondary" to={link.to}>{link.label}</Link>)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="platform-steady-state-recurrence-audit__rules-grid">
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-recurrence-audit" title="Recurrence audit rules" description="Conditions that keep recurrence review manual and evidence-gated." /><ul>{data.recurrence_audit_rules.map((rule) => <li key={rule}>{rule}</li>)}</ul></div>
            <div className="app-panel app-panel--padded"><OperationalSectionHeader iconPath="/platform/commercial-launch-steady-state-recurrence-audit" title="Limitations" description="What this read-only recurrence-audit board does not observe, certify, persist or execute." /><ul>{data.recurrence_audit_limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </section>

          <section className="app-panel app-panel--padded platform-steady-state-recurrence-audit__next-step"><strong>Next operator step</strong><span>{data.next_best_step}</span></section>
          <section className="app-panel app-panel--padded platform-steady-state-recurrence-audit__snapshot-note"><strong>Snapshot interpretation</strong><span>{data.validation_note}</span><small>Generated {formatDateTime(data.generated_at)} · {data.phase}</small></section>
        </>
      ) : null}
    </div>
  );
}
