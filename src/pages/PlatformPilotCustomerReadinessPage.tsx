import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformPilotCustomerReadinessPage.css';

type PilotControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value: number;
  status: string;
};

type PilotTenantRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string | null;
  status: string;
  evidence: Record<string, string | number | boolean | null>;
  controls: PilotControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type PilotEvidenceModel = {
  dedicated_pilot_record_persisted: boolean;
  text_reference_requires_manual_confirmation: boolean;
  prelaunch_scope_only: boolean;
  expansion_decision_evaluated: boolean;
  explanation: string;
};

type PilotCustomerReadinessPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  pilot_controls: Array<Omit<PilotControl, 'evidence_value' | 'status'>>;
  evidence_model: PilotEvidenceModel;
  tenants: PilotTenantRow[];
  required_manual_acceptance: string[];
  next_best_step: string;
  validation_note: string;
};

type Tenant = { id: string; name: string };
type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const allowedLimits = new Set(['25', '50', '100', '300']);

const primarySummaryItems = [
  { key: 'tenants_total', label: 'Tenants reviewed' },
  { key: 'pilot_ready_for_manual_launch_review', label: 'Ready for manual review' },
  { key: 'pilot_readiness_incomplete', label: 'Readiness incomplete' },
  { key: 'pilot_launch_blocked', label: 'Launch blocked' },
  { key: 'tenants_with_open_blockers', label: 'Tenants with blockers' },
  { key: 'controls_requiring_manual_confirmation', label: 'Manual confirmations' }
] as const;

const evidenceItems = [
  { key: 'tenant_status', label: 'Lifecycle status' },
  { key: 'tenant_status_launchable', label: 'Lifecycle launchable' },
  { key: 'pilot_selection_evidence', label: 'Pilot selection refs' },
  { key: 'pilot_owner_evidence', label: 'Pilot owner refs' },
  { key: 'success_criteria_evidence', label: 'Success criteria refs' },
  { key: 'data_policy_evidence', label: 'Data policy refs' },
  { key: 'feedback_log_evidence', label: 'Feedback log refs' },
  { key: 'onboarding_evidence_count', label: 'Onboarding evidence' },
  { key: 'support_handover_evidence', label: 'Support handover refs' },
  { key: 'monitoring_review_evidence', label: 'Monitoring review refs' },
  { key: 'open_blocker_count', label: 'Open blockers' },
  { key: 'blocked_pilot_tasks', label: 'Blocked pilot tasks' },
  { key: 'blocked_onboarding_tasks', label: 'Blocked onboarding tasks' },
  { key: 'blocked_support_tasks', label: 'Blocked support tasks' },
  { key: 'open_incidents', label: 'Open incidents' },
  { key: 'latest_pilot_activity_at', label: 'Latest pilot activity' }
] as const;

const summaryLabels: Record<string, string> = {
  tenants_total: 'Tenants reviewed',
  pilot_ready_for_manual_launch_review: 'Ready for manual launch review',
  pilot_readiness_incomplete: 'Pilot readiness incomplete',
  pilot_launch_blocked: 'Pilot launch blocked',
  tenant_status_not_launchable: 'Lifecycle not launchable',
  tenants_with_pilot_selection: 'Pilot selection references',
  tenants_with_pilot_owner: 'Pilot owner references',
  tenants_with_success_criteria: 'Success criteria references',
  tenants_with_data_policy: 'Data policy references',
  tenants_with_feedback_log: 'Feedback log references',
  tenants_with_support_handover: 'Support handover references',
  tenants_with_monitoring_review: 'Monitoring review references',
  tenants_with_open_blockers: 'Tenants with open blockers',
  total_controls: 'Controls reviewed',
  controls_with_evidence: 'Controls with evidence',
  controls_requiring_manual_confirmation: 'Manual confirmations required'
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function displaySummaryKey(value: string) {
  return summaryLabels[value] || humanize(value);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('missing') || normalized.includes('not_launchable')) return 'danger';
  if (normalized.includes('incomplete') || normalized.includes('manual') || normalized.includes('review') || normalized.includes('confirmation')) return 'warn';
  if (normalized.includes('no_tenants')) return 'neutral';
  if (normalized.includes('ready') || normalized.includes('present') || normalized.includes('launchable')) return 'good';
  return 'accent';
}

function formatEvidenceValue(value: string | number | boolean | null | undefined) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }
  return String(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function shortId(value: string) {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'The platform request failed.';
}

export default function PlatformPilotCustomerReadinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id') || '';
  const requestedLimit = searchParams.get('limit') || '100';
  const limit = allowedLimits.has(requestedLimit) ? requestedLimit : '100';

  const canOpenSupportCockpit = [
    PLATFORM_PERMISSIONS.TENANTS_READ,
    PLATFORM_PERMISSIONS.PLATFORM_SLA_READ,
    PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ,
    PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ
  ].every((permission) => hasPlatformPermission(permission));
  const canOpenMonitoringReadiness = [
    PLATFORM_PERMISSIONS.SYSTEM_HEALTH_READ,
    PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ,
    PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ
  ].every((permission) => hasPlatformPermission(permission));

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-pilot-customer-readiness'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  query.set('limit', limit);

  const pilot = useQuery({
    queryKey: ['platform', 'pilot-customer-readiness', tenantId, limit],
    queryFn: () => platformApiRequest<PilotCustomerReadinessPackage>(`/platform/pilot-customer-readiness?${query.toString()}`),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const data = pilot.data;
  const summary = data?.summary || {};
  const detailSummary = useMemo(() => Object.entries(data?.summary || {}), [data?.summary]);
  const tenantOptions = useMemo(() => tenants.data || [], [tenants.data]);
  const selectedTenant = useMemo(
    () => tenantOptions.find((tenant) => tenant.id === tenantId),
    [tenantId, tenantOptions]
  );
  const initialLoadError = pilot.isError && !data;
  const refreshError = pilot.isError && Boolean(data);
  const errorMessage = readableError(pilot.error);

  const updateSearchParam = (key: 'tenant_id' | 'limit', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'tenant_id' && value) next.delete('limit');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="io-operational-page io-workspace-page platform-pilot-readiness">
      <OperationalWorkspaceHero
        iconPath="/platform/pilot-customer-readiness"
        eyebrow="Platform Commercial Launch Readiness"
        title="Pilot Customer Readiness"
        description="Read-only pre-launch review of pilot selection references, accountable ownership, success criteria, data policy, feedback tracking, onboarding, support handover, monitoring references and open blockers."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 216 — Pilot Customer Readiness Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Operator precheck only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Manual pilot acceptance required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-pilot-readiness__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.pilot_ready_for_manual_launch_review ?? 0}/${summary.tenants_total ?? 0}` : '—'}
              label="tenants ready for manual launch review"
            />
            {data ? (
              <span className="platform-pilot-readiness__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-pilot-readiness__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void pilot.refetch()}
                disabled={pilot.isFetching}
              >
                {pilot.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-pilot-readiness__boundary-panel">
        <OperationalSectionHeader
          iconPath="/platform/pilot-customer-readiness"
          title="Evidence boundary"
          description="This board deliberately stops at evidence review. It does not create a pilot, certify pilot success or approve expansion."
        />
        <div className="platform-pilot-readiness__boundary-copy">
          <strong>Operator precheck only.</strong>
          <span>
            The current platform does not persist a dedicated pilot entity or pilot-acceptance record. Task/note text matches are evidence references and require manual confirmation. A post-pilot expansion decision is deliberately outside this pre-launch board.
          </span>
        </div>
      </section>

      <section className="app-panel app-panel--padded platform-pilot-readiness__scope-panel">
        <OperationalSectionHeader
          iconPath="/platform/tenants"
          title="Pilot review scope"
          description="Review one tenant or a recent tenant window. Filters are kept in the page URL so the current scope remains reliable across refresh, back/forward navigation and shared links."
        />
        <div className="platform-pilot-readiness__filter-grid">
          <label className="platform-pilot-readiness__field" htmlFor="pilot-readiness-tenant-filter">
            <span>Tenant filter</span>
            <select
              id="pilot-readiness-tenant-filter"
              value={tenantId}
              onChange={(event) => updateSearchParam('tenant_id', event.target.value)}
            >
              <option value="">All tenants</option>
              {tenantId && !selectedTenant ? <option value={tenantId}>Selected tenant ({shortId(tenantId)})</option> : null}
              {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label className="platform-pilot-readiness__field" htmlFor="pilot-readiness-limit">
            <span>Tenant limit</span>
            <select
              id="pilot-readiness-limit"
              value={limit}
              onChange={(event) => updateSearchParam('limit', event.target.value)}
              disabled={Boolean(tenantId)}
            >
              <option value="25">Latest 25 tenants</option>
              <option value="50">Latest 50 tenants</option>
              <option value="100">Latest 100 tenants</option>
              <option value="300">Latest 300 tenants</option>
            </select>
          </label>
          <div className="platform-pilot-readiness__scope-copy">
            <strong>Current scope</strong>
            <span>
              {tenantId
                ? `Single tenant: ${selectedTenant?.name || shortId(tenantId)}`
                : `Latest ${limit} tenants by pilot activity or creation date`}
            </span>
          </div>
        </div>
        {tenants.isLoading ? <span className="platform-pilot-readiness__help">Loading tenant filter options…</span> : null}
        {tenants.error ? (
          <span className="platform-pilot-readiness__filter-warning" role="status">
            Unable to load tenant filter: {readableError(tenants.error)}. The current URL scope is still being used.
          </span>
        ) : null}
      </section>

      {pilot.isLoading ? <section className="app-panel app-panel--padded">Loading pilot customer readiness…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-pilot-readiness__feedback" role="alert">
          <strong>Unable to load pilot customer readiness.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-pilot-readiness__retry"
            onClick={() => void pilot.refetch()}
            disabled={pilot.isFetching}
          >
            {pilot.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-pilot-readiness__feedback platform-pilot-readiness__feedback--warning" role="status">
          <strong>Refresh failed.</strong>
          <span>Showing the last successful pilot-readiness snapshot. {errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-pilot-readiness__retry"
            onClick={() => void pilot.refetch()}
            disabled={pilot.isFetching}
          >
            {pilot.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Pilot readiness summary">
            {primarySummaryItems.map((item) => (
              <OperationalWorkspaceStatCard
                key={item.key}
                label={item.label}
                value={summary[item.key] ?? 0}
              />
            ))}
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-pilot-readiness__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/pilot-customer-readiness"
              title="Program and evidence model"
              description="Current pre-launch scope and the evidence limitations operators must keep in mind before manual pilot acceptance."
            />
            <div className="platform-pilot-readiness__program-grid">
              <div><strong>Program</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div><strong>Dedicated pilot record</strong><span>{data.evidence_model.dedicated_pilot_record_persisted ? 'Persisted' : 'Not persisted'}</span></div>
              <div><strong>Text references</strong><span>{data.evidence_model.text_reference_requires_manual_confirmation ? 'Manual confirmation required' : 'Structured evidence'}</span></div>
              <div><strong>Scope</strong><span>{data.evidence_model.prelaunch_scope_only ? 'Pre-launch only' : 'Includes post-pilot decision'}</span></div>
              <div><strong>Expansion decision</strong><span>{data.evidence_model.expansion_decision_evaluated ? 'Evaluated here' : 'Outside this board'}</span></div>
            </div>
            <div className="platform-pilot-readiness__evidence-model-copy">
              <strong>Evidence-model limitation</strong>
              <span>{data.evidence_model.explanation}</span>
            </div>
            <details className="platform-pilot-readiness__summary-details">
              <summary>Detailed readiness counters</summary>
              <div className="platform-pilot-readiness__summary-grid">
                {detailSummary.map(([key, value]) => (
                  <div key={key}>
                    <span>{displaySummaryKey(key)}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </details>
          </section>

          <section className="app-panel app-panel--padded platform-pilot-readiness__controls-section">
            <OperationalSectionHeader
              iconPath="/platform/pilot-customer-readiness"
              title="Required pilot controls"
              description="Every tenant is evaluated against these same pre-launch controls. Text-reference controls remain manual-confirmation evidence, not automatic acceptance."
            />
            <div className="platform-pilot-readiness__control-grid">
              {data.pilot_controls.map((control) => (
                <article key={control.code} className="app-panel platform-pilot-readiness__control-card">
                  <div>
                    <strong>{control.label}</strong>
                    <code>{control.code}</code>
                  </div>
                  <p>{control.launch_reason}</p>
                  <span>Evidence source: {humanize(control.evidence_key)}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="platform-pilot-readiness__tenant-section">
            <OperationalSectionHeader
              iconPath="/platform/tenants"
              title="Tenant pilot readiness"
              description="Evidence counts, control status, open blockers and the next operator action for each tenant in scope."
            />
            {data.tenants.length === 0 ? (
              <div className="app-empty-state platform-pilot-readiness__empty">No tenants match the current pilot-readiness filter.</div>
            ) : null}
            <div className="platform-pilot-readiness__tenant-list">
              {data.tenants.map((tenant) => (
                <article key={tenant.tenant_id} className="app-panel platform-pilot-readiness__tenant-card">
                  <div className="platform-pilot-readiness__tenant-header">
                    <div className="platform-pilot-readiness__tenant-title-wrap">
                      <h3>{tenant.tenant_name}</h3>
                      <span>{tenant.tenant_id}</span>
                      <span>Lifecycle: {tenant.tenant_status || 'unknown'}</span>
                    </div>
                    <span className="platform-pilot-readiness__status-badge" data-tone={badgeTone(tenant.status)}>
                      {humanize(tenant.status)}
                    </span>
                  </div>

                  <div className="platform-pilot-readiness__evidence-grid" aria-label={`${tenant.tenant_name} pilot evidence`}>
                    {evidenceItems.filter((item) => item.key in tenant.evidence).map((item) => (
                      <div key={item.key} className="platform-pilot-readiness__evidence-item">
                        <span>{item.label}</span>
                        <strong>{formatEvidenceValue(tenant.evidence[item.key])}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="platform-pilot-readiness__tenant-controls">
                    {tenant.controls.map((control) => (
                      <div key={control.code} className="platform-pilot-readiness__tenant-control-row">
                        <div>
                          <strong>{control.label}</strong>
                          <span>Evidence count: {control.evidence_value}</span>
                        </div>
                        <span className="platform-pilot-readiness__status-badge" data-tone={badgeTone(control.status)}>
                          {humanize(control.status)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="platform-pilot-readiness__next-step">
                    <strong>Next operator step</strong>
                    <span>{tenant.next_best_step}</span>
                  </div>

                  <div className="platform-pilot-readiness__actions">
                    <Link className="app-button app-button--secondary platform-pilot-readiness__link-button" to={`/platform/tenant-tasks?tenant_id=${tenant.tenant_id}`}>Open tenant tasks</Link>
                    <Link className="app-button app-button--secondary platform-pilot-readiness__link-button" to={`/platform/tenant-notes?tenant_id=${tenant.tenant_id}&search=pilot`}>Search pilot notes</Link>
                    <Link className="app-button app-button--secondary platform-pilot-readiness__link-button" to={`/platform/incidents?tenant_id=${tenant.tenant_id}&scope=tenant&include_resolved=false`}>Open tenant incidents</Link>
                    <Link className="app-button app-button--secondary platform-pilot-readiness__link-button" to={`/platform/customer-onboarding-checklist?tenant_id=${tenant.tenant_id}`}>Open onboarding evidence</Link>
                    {canOpenSupportCockpit ? <Link className="app-button app-button--secondary platform-pilot-readiness__link-button" to={`/platform/support-operations-cockpit?tenant_id=${tenant.tenant_id}`}>Open support cockpit</Link> : null}
                    {canOpenMonitoringReadiness ? <Link className="app-button app-button--secondary platform-pilot-readiness__link-button" to={`/platform/production-monitoring-readiness?tenant_id=${tenant.tenant_id}`}>Open monitoring readiness</Link> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="platform-pilot-readiness__two-column">
            <article className="app-panel app-panel--padded">
              <OperationalSectionHeader
                iconPath="/platform/pilot-customer-readiness"
                title="Required manual acceptance"
                description="These decisions remain human-owned even when supporting evidence is present."
              />
              <ul className="platform-pilot-readiness__list">
                {data.required_manual_acceptance.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
            <article className="app-panel app-panel--padded platform-pilot-readiness__operator-panel">
              <OperationalSectionHeader
                iconPath="/platform/pilot-customer-readiness"
                title="Operator follow-up"
                description="The board identifies readiness evidence but does not make the pilot or expansion decision."
              />
              <div className="platform-pilot-readiness__next-step platform-pilot-readiness__next-step--primary">
                <strong>Next best step</strong>
                <span>{data.next_best_step}</span>
              </div>
              <details className="platform-pilot-readiness__validation-note">
                <summary>Validation boundary</summary>
                <p>{data.validation_note}</p>
              </details>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}
