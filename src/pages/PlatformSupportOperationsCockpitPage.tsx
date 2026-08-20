import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformSupportOperationsCockpitPage.css';

type SupportControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type SupportTenantRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  evidence: Record<string, string | number | boolean | null>;
  controls: SupportControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type SupportPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  support_operation_controls: SupportControl[];
  tenants: SupportTenantRow[];
  validation_note: string;
};

type Tenant = { id: string; name: string };
type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  tenants_total: 'Tenants reviewed',
  support_ready: 'Support ready',
  support_blocked: 'Support blocked',
  support_review_required: 'Review required',
  missing_primary_contact: 'Missing primary contact',
  missing_escalation_contact: 'Missing escalation contact',
  missing_active_sla_policy: 'Missing active SLA policy',
  overdue_support_tasks: 'Tenants with overdue support tasks',
  urgent_support_tasks: 'Tenants with urgent support tasks',
  missing_recent_customer_touch: 'Missing recent customer touch',
  missing_support_handover_note: 'Missing support handover note',
  tenants_with_unresolved_customer_followups: 'Unresolved customer follow-ups',
  tenants_with_open_incidents: 'Tenants with open incidents',
  tenants_with_active_support_sessions: 'Tenants with active support sessions',
  tenants_with_pending_support_approvals: 'Pending support approvals',
  total_controls: 'Total controls',
  controls_with_evidence: 'Controls with evidence'
};

const detailSummaryKeys = [
  'missing_primary_contact',
  'missing_escalation_contact',
  'missing_active_sla_policy',
  'overdue_support_tasks',
  'urgent_support_tasks',
  'missing_recent_customer_touch',
  'missing_support_handover_note',
  'tenants_with_unresolved_customer_followups',
  'tenants_with_open_incidents',
  'tenants_with_active_support_sessions',
  'tenants_with_pending_support_approvals',
  'total_controls',
  'controls_with_evidence'
] as const;

const statusLabels: Record<string, string> = {
  support_operations_ready: 'Support operations ready',
  support_operations_blocked: 'Support operations blocked',
  support_operations_review_required: 'Support review required',
  no_tenants_to_review_for_support_operations: 'No tenants to review',
  evidence_present: 'Evidence present',
  pending_support_approval_requires_review: 'Pending support approval review',
  active_support_access_requires_review: 'Active support access review',
  customer_followup_requires_review: 'Customer follow-up review',
  tenant_incident_blocking: 'Tenant incident blocking',
  overdue_support_tasks_blocking: 'Overdue support tasks blocking',
  urgent_support_tasks_blocking: 'Urgent support tasks blocking',
  customer_touch_required: 'Customer touch required',
  missing_evidence: 'Evidence missing'
};

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function displayStatus(value: string | null | undefined) {
  if (!value) return 'Not available';
  return statusLabels[value] || humanize(value);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('blocking') || normalized.includes('missing')) return 'danger';
  if (normalized.includes('review') || normalized.includes('required')) return 'warn';
  if (normalized.includes('no_tenants')) return 'neutral';
  if (normalized.includes('ready') || normalized.includes('evidence_present')) return 'good';
  return 'accent';
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' && value.includes('T')) {
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

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

function shortId(value: string) {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function evidenceNumber(evidence: SupportTenantRow['evidence'], key: string) {
  const value = evidence[key];
  return typeof value === 'number' ? value : Number(value || 0);
}

export default function PlatformSupportOperationsCockpitPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id') || '';

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-support-operations-cockpit'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  const queryString = query.toString();

  const cockpit = useQuery({
    queryKey: ['platform', 'support-operations-cockpit', tenantId],
    queryFn: () => platformApiRequest<SupportPackage>(`/platform/support-operations-cockpit${queryString ? `?${queryString}` : ''}`),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = cockpit.data;
  const summary = data?.summary || {};
  const tenantOptions = useMemo(() => tenants.data || [], [tenants.data]);
  const selectedTenant = useMemo(
    () => tenantOptions.find((tenant) => tenant.id === tenantId),
    [tenantId, tenantOptions]
  );
  const refreshError = cockpit.isError && Boolean(data);
  const initialLoadError = cockpit.isError && !data;
  const errorMessage = readableError(cockpit.error);

  const updateTenantFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set('tenant_id', value);
    else next.delete('tenant_id');
    setSearchParams(next, { replace: true });
  };

  const scopeLabel = tenantId
    ? selectedTenant?.name || `Selected tenant (${shortId(tenantId)})`
    : 'All tenants';

  return (
    <div className="io-operational-page io-workspace-page platform-support-cockpit">
      <OperationalWorkspaceHero
        iconPath="/platform/support-operations-cockpit"
        eyebrow="Platform Commercial Launch Readiness"
        title="Support Operations Cockpit"
        description="Read-only support readiness evidence across customer contacts, SLA coverage, support work, customer context, incidents, and privileged support access."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 211 — Support Operations Cockpit'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Operator precheck only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>No automatic support actions</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-support-cockpit__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.support_ready ?? 0}/${summary.tenants_total ?? 0}` : '—'}
              label="tenants support-ready"
            />
            {data ? (
              <span className="platform-support-cockpit__status-badge" data-tone={badgeTone(data.posture)}>
                {displayStatus(data.posture)}
              </span>
            ) : null}
            <div className="platform-support-cockpit__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void cockpit.refetch()}
                disabled={cockpit.isFetching}
              >
                {cockpit.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel="Support operations key metrics">
        <OperationalWorkspaceStatCard
          iconPath="/platform/support-operations-cockpit"
          label="Tenants reviewed"
          value={summary.tenants_total ?? 0}
          helper="Tenants in the current support-readiness scope"
          loading={!data && cockpit.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/support-operations-cockpit"
          label="Support ready"
          value={summary.support_ready ?? 0}
          helper="All implemented support evidence is present"
          tone="good"
          loading={!data && cockpit.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/incidents"
          label="Support blocked"
          value={summary.support_blocked ?? 0}
          helper="Hard support blockers require attention"
          tone={(summary.support_blocked ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && cockpit.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/support-sessions"
          label="Review required"
          value={summary.support_review_required ?? 0}
          helper="Non-blocking evidence still needs operator review"
          tone={(summary.support_review_required ?? 0) > 0 ? 'warn' : 'default'}
          loading={!data && cockpit.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/tenant-tasks"
          label="Overdue support work"
          value={summary.overdue_support_tasks ?? 0}
          helper="Tenants with overdue support tasks"
          tone={(summary.overdue_support_tasks ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && cockpit.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/incidents"
          label="Open incidents"
          value={summary.tenants_with_open_incidents ?? 0}
          helper="Tenants with unresolved incidents"
          tone={(summary.tenants_with_open_incidents ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && cockpit.isLoading}
        />
      </OperationalWorkspaceStats>

      <section className="app-panel app-panel--padded platform-support-cockpit__scope-panel">
        <OperationalSectionHeader
          iconPath="/platform/tenants"
          title="Support readiness scope"
          description="Review all tenants or one tenant. The tenant selection is kept in the URL so the same support context can be reopened reliably."
        />
        <div className="platform-support-cockpit__filter-grid">
          <label className="platform-support-cockpit__field" htmlFor="support-cockpit-tenant-filter">
            <span>Tenant filter</span>
            <select
              id="support-cockpit-tenant-filter"
              value={tenantId}
              onChange={(event) => updateTenantFilter(event.target.value)}
            >
              <option value="">All tenants</option>
              {tenantId && !selectedTenant ? <option value={tenantId}>Selected tenant ({shortId(tenantId)})</option> : null}
              {tenantOptions.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </label>
          <div className="platform-support-cockpit__scope-copy">
            <strong>Current scope</strong>
            <span>{scopeLabel}</span>
          </div>
        </div>
        {tenants.isError ? (
          <div className="platform-support-cockpit__filter-warning">
            Tenant filter options could not be loaded. {tenantId ? 'The tenant from the URL remains selected.' : 'The all-tenant support scope remains active.'}
          </div>
        ) : null}
      </section>

      {cockpit.isLoading && !data ? (
        <section className="app-panel app-panel--padded platform-support-cockpit__feedback" aria-live="polite">
          <strong>Loading support operations cockpit…</strong>
          <span>Collecting current support readiness evidence.</span>
        </section>
      ) : null}

      {initialLoadError ? (
        <section className="app-panel app-panel--padded platform-support-cockpit__feedback platform-support-cockpit__feedback--error" role="alert">
          <strong>Unable to load support operations cockpit.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-support-cockpit__retry"
            onClick={() => void cockpit.refetch()}
            disabled={cockpit.isFetching}
          >
            {cockpit.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError && data ? (
        <section className="app-panel app-panel--padded platform-support-cockpit__feedback platform-support-cockpit__feedback--warning" role="status">
          <strong>Latest refresh failed.</strong>
          <span>Showing the last successful support operations snapshot from {formatDateTime(data.generated_at)}. {errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-support-cockpit__retry"
            onClick={() => void cockpit.refetch()}
            disabled={cockpit.isFetching}
          >
            {cockpit.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="app-panel app-panel--padded platform-support-cockpit__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/support-operations-cockpit"
              title="Support precheck contract"
              description="What this board proves—and what still requires human operational acceptance."
            />
            <div className="platform-support-cockpit__program-grid">
              <div>
                <strong>Phase</strong>
                <span>{data.phase}</span>
              </div>
              <div>
                <strong>Program step</strong>
                <span>{data.step}</span>
              </div>
              <div>
                <strong>Generated</strong>
                <span>{formatDateTime(data.generated_at)}</span>
              </div>
              <div>
                <strong>Current posture</strong>
                <span className="platform-support-cockpit__status-badge" data-tone={badgeTone(data.posture)}>{displayStatus(data.posture)}</span>
              </div>
              <div className="platform-support-cockpit__operator-notice">
                <strong>Operator precheck only.</strong>
                <span>
                  A ready tenant means the implemented support evidence is present. It does not certify commercial launch or prove that every customer-facing support decision has been manually accepted.
                </span>
              </div>
              <details className="platform-support-cockpit__validation-note">
                <summary>Validation note</summary>
                <p>{data.validation_note}</p>
              </details>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-support-cockpit__summary-panel">
            <OperationalSectionHeader
              iconPath="/platform/support-operations-cockpit"
              title="Detailed support evidence summary"
              description="Secondary counters behind the headline support-readiness posture."
            />
            <div className="platform-support-cockpit__summary-grid">
              {detailSummaryKeys.map((key) => (
                <div key={key} className="platform-support-cockpit__summary-item">
                  <span>{summaryLabels[key] || humanize(key)}</span>
                  <strong>{summary[key] ?? 0}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="platform-support-cockpit__controls-section">
            <OperationalSectionHeader
              iconPath="/platform/support-operations-cockpit"
              title="Support operation controls"
              description="The evidence families evaluated for each tenant. These controls do not mutate support records."
            />
            <div className="platform-support-cockpit__control-grid">
              {data.support_operation_controls.map((control) => (
                <article key={control.code} className="app-panel platform-support-cockpit__control-card">
                  <div className="platform-support-cockpit__control-heading">
                    <h3>{control.label}</h3>
                    <span>{control.code}</span>
                  </div>
                  <p>{control.launch_reason}</p>
                  <div className="platform-support-cockpit__evidence-key">
                    <span>Evidence key</span>
                    <code>{control.evidence_key}</code>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="platform-support-cockpit__tenant-section">
            <OperationalSectionHeader
              iconPath="/platform/tenants"
              title="Tenant support readiness"
              description="Operational support posture, evidence, and the next recommended review step for each tenant in scope."
            />
            {data.tenants.length ? (
              <div className="platform-support-cockpit__tenant-list">
                {data.tenants.map((tenant) => {
                  const missingControls = tenant.controls.filter((control) => control.status !== 'evidence_present');
                  return (
                    <article key={tenant.tenant_id} className="app-panel platform-support-cockpit__tenant-card">
                      <div className="platform-support-cockpit__tenant-header">
                        <div className="platform-support-cockpit__tenant-title-wrap">
                          <span>Tenant support readiness</span>
                          <h3>{tenant.tenant_name}</h3>
                          <code>{tenant.tenant_id}</code>
                        </div>
                        <span className="platform-support-cockpit__status-badge" data-tone={badgeTone(tenant.status)}>
                          {displayStatus(tenant.status)}
                        </span>
                      </div>

                      <div className="platform-support-cockpit__action-row" aria-label={`Support tools for ${tenant.tenant_name}`}>
                        <Link className="app-button app-button--secondary" to={`/platform/tenant-contacts?tenant_id=${tenant.tenant_id}`}>Contacts</Link>
                        <Link className="app-button app-button--secondary" to={`/platform/tenant-sla?tenant_id=${tenant.tenant_id}`}>SLA</Link>
                        <Link className="app-button app-button--secondary" to={`/platform/tenant-tasks?tenant_id=${tenant.tenant_id}&category=support`}>Tasks</Link>
                        <Link className="app-button app-button--secondary" to={`/platform/incidents?tenant_id=${tenant.tenant_id}`}>Incidents</Link>
                        <Link className="app-button app-button--secondary" to="/platform/support-sessions">Sessions</Link>
                      </div>

                      <div className="platform-support-cockpit__evidence-grid">
                        <div>
                          <span>Contacts</span>
                          <strong>{formatValue(tenant.evidence.primary_contacts)} primary · {formatValue(tenant.evidence.escalation_contacts)} escalation</strong>
                        </div>
                        <div>
                          <span>SLA coverage</span>
                          <strong>{evidenceNumber(tenant.evidence, 'active_sla_policy_present') > 0 ? 'Active policy present' : 'Active policy missing'}</strong>
                          <small>Response {formatValue(tenant.evidence.response_target_minutes)} min · Resolution {formatValue(tenant.evidence.incident_resolution_target_hours)} h</small>
                        </div>
                        <div>
                          <span>Support work</span>
                          <strong>{formatValue(tenant.evidence.open_support_tasks)} open · {formatValue(tenant.evidence.overdue_support_tasks)} overdue</strong>
                          <small>{formatValue(tenant.evidence.urgent_support_tasks)} urgent</small>
                        </div>
                        <div>
                          <span>Customer context</span>
                          <strong>Last touch: {formatValue(tenant.evidence.last_customer_touch_at)}</strong>
                          <small>{formatValue(tenant.evidence.unresolved_follow_ups)} unresolved follow-ups · {formatValue(tenant.evidence.support_handover_notes)} handover notes</small>
                        </div>
                        <div>
                          <span>Incidents</span>
                          <strong>{formatValue(tenant.evidence.open_incidents)} open</strong>
                        </div>
                        <div>
                          <span>Support access</span>
                          <strong>{formatValue(tenant.evidence.active_support_sessions)} active sessions</strong>
                          <small>{formatValue(tenant.evidence.pending_support_approvals)} pending approvals</small>
                        </div>
                      </div>

                      <div className="platform-support-cockpit__control-status-list">
                        <div className="platform-support-cockpit__control-status-heading">
                          <strong>Control review</strong>
                          <span>{tenant.controls.length - missingControls.length}/{tenant.controls.length} controls with evidence</span>
                        </div>
                        {tenant.controls.map((control) => (
                          <div key={control.code} className="platform-support-cockpit__control-row">
                            <div>
                              <strong>{control.label}</strong>
                              <span>{control.evidence_key}</span>
                            </div>
                            <span className="platform-support-cockpit__status-badge" data-tone={badgeTone(control.status)}>
                              {displayStatus(control.status)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="platform-support-cockpit__next-step">
                        <strong>Next support step</strong>
                        <span>{tenant.next_best_step}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="app-panel app-panel--padded platform-support-cockpit__empty-state">
                No tenants found for this support operations cockpit.
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
