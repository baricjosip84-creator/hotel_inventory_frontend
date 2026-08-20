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
import './PlatformProductionMonitoringReadinessPage.css';

type MonitoringControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type MonitoringTenantRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: string;
  status: string;
  evidence: Record<string, number>;
  controls: MonitoringControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type MonitoringPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  platform_evidence: Record<string, number | string>;
  monitoring_controls: MonitoringControl[];
  tenants: MonitoringTenantRow[];
  validation_note: string;
};

type SystemHealthPackage = {
  tenants: Array<{ tenant_id: string; tenant_name: string }>;
};

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const summaryLabels: Record<string, string> = {
  tenants_total: 'Tenants reviewed',
  monitoring_ready: 'Monitoring ready',
  monitoring_blocked: 'Monitoring blocked',
  monitoring_review_required: 'Review required',
  tenant_status_not_launchable: 'Tenant status not launchable',
  tenants_with_blocking_alerts: 'Tenants with blocking alerts',
  tenants_with_negative_stock: 'Tenants with negative stock',
  tenants_with_incomplete_finalized_shipments: 'Incomplete finalized shipments',
  tenants_with_open_incidents: 'Tenants with open incidents',
  tenants_missing_public_incident_updates: 'Missing public incident updates',
  platform_open_incidents: 'Platform open incidents',
  platform_incidents_missing_public_updates: 'Platform incidents missing public updates',
  unhealthy_dependencies: 'Unhealthy dependencies',
  critical_unhealthy_dependencies: 'Critical unhealthy dependencies',
  integration_failures: 'Integration delivery failures',
  integration_blockers: 'Integration blockers',
  integration_review_required: 'Integration review required',
  integrations_requiring_review: 'Integrations requiring review',
  total_controls: 'Total controls',
  controls_with_evidence: 'Controls with evidence',
  controls_not_required: 'Controls not required'
};

const detailSummaryKeys = [
  'tenant_status_not_launchable',
  'tenants_with_blocking_alerts',
  'tenants_with_negative_stock',
  'tenants_with_incomplete_finalized_shipments',
  'tenants_with_open_incidents',
  'tenants_missing_public_incident_updates',
  'platform_open_incidents',
  'platform_incidents_missing_public_updates',
  'unhealthy_dependencies',
  'critical_unhealthy_dependencies',
  'integration_failures',
  'integration_blockers',
  'integration_review_required',
  'integrations_requiring_review',
  'total_controls',
  'controls_with_evidence',
  'controls_not_required'
] as const;

const statusLabels: Record<string, string> = {
  production_monitoring_ready: 'Production monitoring ready',
  production_monitoring_blocked: 'Production monitoring blocked',
  production_monitoring_review_required: 'Monitoring review required',
  no_tenants_to_review_for_production_monitoring: 'No tenants to review',
  evidence_present: 'Evidence present',
  not_required: 'Not required',
  tenant_status_not_launchable: 'Tenant status not launchable',
  customer_status_update_required: 'Customer status update required',
  critical_dependency_blocking: 'Critical dependency blocking',
  integration_monitoring_blocked: 'Integration monitoring blocked',
  integration_monitoring_review_required: 'Integration monitoring review required',
  monitoring_evidence_missing_or_blocked: 'Monitoring evidence missing or blocked'
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

function displaySummaryKey(value: string) {
  return summaryLabels[value] || humanize(value);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('blocked') || normalized.includes('blocking') || normalized.includes('missing') || normalized.includes('not_launchable') || normalized.includes('customer_status_update_required')) return 'danger';
  if (normalized.includes('review') || normalized.includes('required')) return 'warn';
  if (normalized.includes('no_tenants') || normalized.includes('not_required')) return 'neutral';
  if (normalized.includes('ready') || normalized.includes('evidence_present')) return 'good';
  return 'accent';
}

function formatValue(value: number | string | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not available' : parsed.toLocaleString();
}

function readableError(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Unknown error';
}

function shortId(value: string) {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

function tenantIncidentLink(tenantId: string) {
  const params = new URLSearchParams({ scope: 'tenant', tenant_id: tenantId, include_resolved: 'false' });
  return `/platform/incidents?${params.toString()}`;
}

export default function PlatformProductionMonitoringReadinessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id') || '';

  const tenantOptions = useQuery({
    queryKey: ['platform', 'system-health', 'for-production-monitoring-readiness'],
    queryFn: () => platformApiRequest<SystemHealthPackage>('/platform/system-health'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  const queryString = query.toString();

  const monitoring = useQuery({
    queryKey: ['platform', 'production-monitoring-readiness', tenantId],
    queryFn: () => platformApiRequest<MonitoringPackage>(`/platform/production-monitoring-readiness${queryString ? `?${queryString}` : ''}`),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = monitoring.data;
  const summary = data?.summary || {};
  const tenants = useMemo(() => tenantOptions.data?.tenants || [], [tenantOptions.data]);
  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.tenant_id === tenantId),
    [tenantId, tenants]
  );
  const platformEvidence = useMemo(() => Object.entries(data?.platform_evidence || {}), [data?.platform_evidence]);
  const refreshError = monitoring.isError && Boolean(data);
  const initialLoadError = monitoring.isError && !data;
  const errorMessage = readableError(monitoring.error);
  const scopeLabel = tenantId
    ? selectedTenant?.tenant_name || `Selected tenant (${shortId(tenantId)})`
    : 'All tenants';

  function changeTenant(nextTenantId: string) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextTenantId) nextParams.set('tenant_id', nextTenantId);
    else nextParams.delete('tenant_id');
    setSearchParams(nextParams, { replace: true });
  }

  function refreshAll() {
    void tenantOptions.refetch();
    void monitoring.refetch();
  }

  return (
    <div className="io-operational-page io-workspace-page platform-monitoring-readiness">
      <OperationalWorkspaceHero
        iconPath="/platform/production-monitoring-readiness"
        eyebrow="Platform Commercial Launch Readiness"
        title="Production Monitoring Readiness"
        description="Read-only technical precheck across tenant system health, incident communication coverage, service dependencies, and the canonical Integration Monitoring posture."
        meta={<>
          <OperationalWorkspaceMetaPill>{data?.step || 'Step 212 — Production Monitoring Readiness Board'}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Operator precheck only</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>No incident or monitoring mutations</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-monitoring-readiness__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.monitoring_ready ?? 0}/${summary.tenants_total ?? 0}` : '—'}
              label="tenants technically monitoring-ready"
            />
            {data ? (
              <span className="platform-monitoring-readiness__status-badge" data-tone={badgeTone(data.posture)}>
                {displayStatus(data.posture)}
              </span>
            ) : null}
            <div className="platform-monitoring-readiness__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={refreshAll}
                disabled={tenantOptions.isFetching || monitoring.isFetching}
              >
                {tenantOptions.isFetching || monitoring.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <OperationalWorkspaceStats ariaLabel="Production monitoring readiness key metrics">
        <OperationalWorkspaceStatCard
          iconPath="/platform/production-monitoring-readiness"
          label="Tenants reviewed"
          value={summary.tenants_total ?? 0}
          helper="Tenants in the current monitoring-readiness scope"
          loading={!data && monitoring.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/system-health"
          label="Monitoring ready"
          value={summary.monitoring_ready ?? 0}
          helper="Implemented technical controls are clear"
          tone="good"
          loading={!data && monitoring.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/incidents"
          label="Monitoring blocked"
          value={summary.monitoring_blocked ?? 0}
          helper="Hard lifecycle, health, incident or dependency blockers"
          tone={(summary.monitoring_blocked ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && monitoring.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/integration-monitoring"
          label="Review required"
          value={summary.monitoring_review_required ?? 0}
          helper="Non-blocking monitoring evidence still needs operator review"
          tone={(summary.monitoring_review_required ?? 0) > 0 ? 'warn' : 'default'}
          loading={!data && monitoring.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/incidents"
          label="Missing public updates"
          value={summary.tenants_missing_public_incident_updates ?? 0}
          helper="Tenants with customer-impacting incidents missing public communication"
          tone={(summary.tenants_missing_public_incident_updates ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && monitoring.isLoading}
        />
        <OperationalWorkspaceStatCard
          iconPath="/platform/service-dependencies"
          label="Critical unhealthy"
          value={summary.critical_unhealthy_dependencies ?? 0}
          helper="Critical platform dependencies currently unhealthy"
          tone={(summary.critical_unhealthy_dependencies ?? 0) > 0 ? 'danger' : 'default'}
          loading={!data && monitoring.isLoading}
        />
      </OperationalWorkspaceStats>

      <section className="app-panel app-panel--padded platform-monitoring-readiness__scope-panel">
        <OperationalSectionHeader
          iconPath="/platform/production-monitoring-readiness"
          title="Monitoring scope"
          description="Review all tenants or one tenant. The selected tenant is stored in the URL so the same monitoring scope can be reopened reliably."
        />
        <div className="platform-monitoring-readiness__filter-grid">
          <label className="platform-monitoring-readiness__field" htmlFor="monitoring-readiness-tenant-filter">
            <span>Tenant filter</span>
            <select
              id="monitoring-readiness-tenant-filter"
              value={tenantId}
              onChange={(event) => changeTenant(event.target.value)}
              disabled={tenantOptions.isLoading && !tenantId}
            >
              <option value="">All tenants</option>
              {tenantId && !selectedTenant ? <option value={tenantId}>Selected tenant ({shortId(tenantId)})</option> : null}
              {tenants.map((tenant) => (
                <option key={tenant.tenant_id} value={tenant.tenant_id}>{tenant.tenant_name}</option>
              ))}
            </select>
          </label>
          <div className="platform-monitoring-readiness__scope-copy">
            <strong>Current scope</strong>
            <span>{scopeLabel}</span>
          </div>
        </div>
        {tenantOptions.error ? (
          <p className="platform-monitoring-readiness__filter-warning">
            Tenant filter options could not be loaded: {readableError(tenantOptions.error)}. The current URL scope is preserved.
          </p>
        ) : null}
      </section>

      {monitoring.isLoading && !data ? (
        <section className="app-panel app-panel--padded platform-monitoring-readiness__feedback">
          <strong>Loading production monitoring readiness…</strong>
          <span>Collecting the current health, incident, dependency and integration evidence.</span>
        </section>
      ) : null}

      {initialLoadError ? (
        <section className="app-panel app-panel--padded platform-monitoring-readiness__feedback platform-monitoring-readiness__feedback--error" role="alert">
          <strong>Unable to load production monitoring readiness: {errorMessage}</strong>
          <span>No successful monitoring snapshot is currently available.</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-monitoring-readiness__retry"
            onClick={() => void monitoring.refetch()}
            disabled={monitoring.isFetching}
          >
            {monitoring.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-panel app-panel--padded platform-monitoring-readiness__feedback platform-monitoring-readiness__feedback--warning" role="status">
          <strong>Refresh failed — showing the last successful monitoring snapshot.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--secondary platform-monitoring-readiness__retry"
            onClick={() => void monitoring.refetch()}
            disabled={monitoring.isFetching}
          >
            {monitoring.isFetching ? 'Retrying…' : 'Retry refresh'}
          </button>
        </section>
      ) : null}

      {data ? (
        <>
          <section className="app-panel app-panel--padded platform-monitoring-readiness__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/production-monitoring-readiness"
              title="Program context"
              description="This is technical evidence for operator review. It is not final production-monitoring certification."
            />
            <div className="platform-monitoring-readiness__program-grid">
              <div><strong>Phase</strong><span>{data.phase}</span></div>
              <div><strong>Step</strong><span>{data.step}</span></div>
              <div><strong>Generated</strong><span>{formatDateTime(data.generated_at)}</span></div>
              <div className="platform-monitoring-readiness__operator-notice">
                <strong>Operator precheck only.</strong>
                <span>A clear result means the implemented evidence is technically clear enough for the next review. It does not prove real-world uptime, alert delivery, public-status publication, or final production-monitoring sign-off.</span>
              </div>
              <details className="platform-monitoring-readiness__validation-note">
                <summary>Validation note</summary>
                <p>{data.validation_note}</p>
              </details>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-monitoring-readiness__summary-panel">
            <OperationalSectionHeader
              iconPath="/platform/system-health"
              title="Detailed monitoring summary"
              description="Supporting counters behind the primary readiness KPIs."
            />
            <div className="platform-monitoring-readiness__summary-grid">
              {detailSummaryKeys.map((key) => (
                <div className="platform-monitoring-readiness__summary-item" key={key}>
                  <span>{displaySummaryKey(key)}</span>
                  <strong>{summary[key] ?? 0}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-monitoring-readiness__evidence-section">
            <OperationalSectionHeader
              iconPath="/platform/integration-monitoring"
              title="Platform evidence"
              description="Platform-level incident, dependency and canonical integration-monitoring evidence used across the tenant readiness rows."
            />
            <div className="platform-monitoring-readiness__platform-grid">
              {platformEvidence.map(([key, value]) => (
                <div className="platform-monitoring-readiness__platform-item" key={key}>
                  <span>{humanize(key)}</span>
                  <strong>{formatValue(value)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="platform-monitoring-readiness__controls-section">
            <OperationalSectionHeader
              iconPath="/platform/production-monitoring-readiness"
              title="Monitoring controls"
              description="Read-only control definitions used to calculate tenant monitoring readiness."
            />
            <div className="platform-monitoring-readiness__control-grid">
              {data.monitoring_controls.map((control) => (
                <article key={control.code} className="app-panel platform-monitoring-readiness__control-card">
                  <div className="platform-monitoring-readiness__control-heading">
                    <h3>{control.label}</h3>
                    <span>{control.code}</span>
                  </div>
                  <p>{control.launch_reason}</p>
                  <div className="platform-monitoring-readiness__evidence-key">
                    <span>Evidence key</span>
                    <code>{control.evidence_key}</code>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="platform-monitoring-readiness__tenant-section">
            <OperationalSectionHeader
              iconPath="/platform/system-health"
              title="Tenant monitoring readiness"
              description="Per-tenant health, incident communication and platform dependency evidence, with the next operator step kept close to the problem."
            />
            {data.tenants.length === 0 ? (
              <div className="app-panel app-panel--padded platform-monitoring-readiness__empty-state">
                No tenants match the current monitoring-readiness filter.
              </div>
            ) : (
              <div className="platform-monitoring-readiness__tenant-list">
                {data.tenants.map((tenant) => (
                  <article key={tenant.tenant_id} className="app-panel platform-monitoring-readiness__tenant-card">
                    <div className="platform-monitoring-readiness__tenant-header">
                      <div className="platform-monitoring-readiness__tenant-title-wrap">
                        <span>{humanize(tenant.tenant_status)} lifecycle</span>
                        <h3>{tenant.tenant_name}</h3>
                        <code>{tenant.tenant_id}</code>
                      </div>
                      <span className="platform-monitoring-readiness__status-badge" data-tone={badgeTone(tenant.status)}>
                        {displayStatus(tenant.status)}
                      </span>
                    </div>

                    <div className="platform-monitoring-readiness__action-row">
                      <Link className="app-button app-button--secondary" to="/platform/system-health">System health</Link>
                      <Link className="app-button app-button--secondary" to={tenantIncidentLink(tenant.tenant_id)}>Incidents</Link>
                      <Link className="app-button app-button--secondary" to="/platform/service-dependencies?only_attention=true">Dependencies</Link>
                      <Link className="app-button app-button--secondary" to="/platform/integration-monitoring">Integrations</Link>
                    </div>

                    <div className="platform-monitoring-readiness__evidence-grid">
                      <div>
                        <strong>System health</strong>
                        <span>Issues: {formatValue(tenant.evidence.system_health_issues)}</span>
                        <span>Blocking alerts: {formatValue(tenant.evidence.blocking_alerts)}</span>
                        <span>Negative stock: {formatValue(tenant.evidence.negative_stock_rows)}</span>
                        <span>Incomplete finalized shipments: {formatValue(tenant.evidence.incomplete_finalized_shipments)}</span>
                        <span>Launchable: {tenant.evidence.tenant_status_launchable ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <strong>Incidents</strong>
                        <span>Open: {formatValue(tenant.evidence.open_incidents)}</span>
                        <span>Customer-impacting: {formatValue(tenant.evidence.customer_impacting_open_incidents)}</span>
                        <span>With public updates: {formatValue(tenant.evidence.customer_impacting_incidents_with_public_updates)}</span>
                        <span>Missing public updates: {formatValue(tenant.evidence.open_incidents_missing_public_updates)}</span>
                      </div>
                      <div>
                        <strong>Dependencies / integrations</strong>
                        <span>Unhealthy dependencies: {formatValue(tenant.evidence.unhealthy_dependencies)}</span>
                        <span>Critical unhealthy: {formatValue(tenant.evidence.critical_unhealthy_dependencies)}</span>
                        <span>Integration blockers: {formatValue(tenant.evidence.integration_blockers)}</span>
                        <span>Integration review required: {formatValue(tenant.evidence.integration_review_required)}</span>
                        <span>Integrations requiring review: {formatValue(tenant.evidence.integrations_requiring_review)}</span>
                      </div>
                    </div>

                    <div className="platform-monitoring-readiness__control-status-grid">
                      {tenant.controls.map((control) => (
                        <div key={control.code} className="platform-monitoring-readiness__tenant-control">
                          <span>{control.label}</span>
                          <strong>{formatValue(control.evidence_value)}</strong>
                          <em className="platform-monitoring-readiness__mini-badge" data-tone={badgeTone(control.status)}>
                            {displayStatus(control.status)}
                          </em>
                        </div>
                      ))}
                    </div>

                    <div className="platform-monitoring-readiness__next-step">
                      <strong>Next operator step</strong>
                      <span>{tenant.next_best_step}</span>
                      {tenant.missing_control_codes.length ? (
                        <small>Controls requiring attention: {tenant.missing_control_codes.join(', ')}</small>
                      ) : (
                        <small>No monitoring controls currently require attention.</small>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
