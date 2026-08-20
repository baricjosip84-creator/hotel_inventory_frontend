import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { PLATFORM_PERMISSIONS, hasPlatformPermission } from '../lib/platformPermissions';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  OperationalWorkspaceMetaPill,
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceStatus
} from '../components/ui/OperationalWorkspace';
import './PlatformTenantProvisioningHardeningPage.css';

type ProvisioningControl = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type ProvisioningPreset = {
  key: string;
  label: string;
  description: string;
  organization_type: string;
  feature_flags: Record<string, boolean>;
  limits: Record<string, number>;
  storage_locations: Array<{ name: string; temperature_zone?: string | null }>;
};

type ProvisioningTenantRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  evidence: Record<string, string | number | null>;
  controls: ProvisioningControl[];
  missing_control_codes: string[];
  next_best_step: string;
};

type ProvisioningHardeningPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  provisioning_presets: ProvisioningPreset[];
  hardening_controls: ProvisioningControl[];
  tenants: ProvisioningTenantRow[];
  validation_note: string;
};

type Tenant = { id: string; name: string };
type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const allowedLimits = new Set(['25', '50', '100', '300']);

const evidenceItems = [
  { key: 'organization_type', label: 'Organization type' },
  { key: 'plan_code', label: 'Commercial plan' },
  { key: 'billing_status', label: 'Billing status' },
  { key: 'feature_flag_count', label: 'Feature flags' },
  { key: 'limit_count', label: 'Configured limits' },
  { key: 'admin_user_count', label: 'Active admins' },
  { key: 'storage_location_count', label: 'Active storage locations' },
  { key: 'provisioning_audit_count', label: 'Provisioning audit events' },
  { key: 'onboarding_task_count', label: 'Onboarding tasks' },
  { key: 'latest_provisioning_preset_key', label: 'Latest provisioning preset' },
  { key: 'latest_provisioning_audit_at', label: 'Latest provisioning audit' },
  { key: 'latest_onboarding_task_at', label: 'Latest onboarding handoff update' }
] as const;

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('blocked')) return 'danger';
  if (normalized.includes('missing') || normalized.includes('incomplete')) return 'warn';
  if (normalized.includes('no_tenants')) return 'neutral';
  if (normalized.includes('needs') || normalized.includes('ready_for_onboarding_task') || normalized.includes('review')) return 'warn';
  if (normalized.includes('ready_for_customer_onboarding') || normalized.includes('hardened') || normalized.includes('evidence_present')) return 'good';
  return 'accent';
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
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

function shortId(value: string) {
  return value.length > 8 ? `${value.slice(0, 8)}…` : value;
}

export default function PlatformTenantProvisioningHardeningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id') || '';
  const requestedLimit = searchParams.get('limit') || '100';
  const limit = allowedLimits.has(requestedLimit) ? requestedLimit : '100';

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-provisioning-hardening'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  query.set('limit', limit);

  const hardening = useQuery({
    queryKey: ['platform', 'tenant-provisioning-hardening', tenantId, limit],
    queryFn: () => platformApiRequest<ProvisioningHardeningPackage>(`/platform/tenant-provisioning-hardening?${query.toString()}`),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = hardening.data;
  const summary = data?.summary || {};
  const tenantOptions = useMemo(() => tenants.data || [], [tenants.data]);
  const selectedTenant = useMemo(
    () => tenantOptions.find((tenant) => tenant.id === tenantId),
    [tenantId, tenantOptions]
  );
  const refreshError = hardening.isError && Boolean(data);
  const initialLoadError = hardening.isError && !data;
  const errorMessage = hardening.error instanceof Error ? hardening.error.message : 'The platform request failed.';
  const controlCoverage = `${summary.controls_with_evidence ?? 0}/${summary.total_controls ?? 0}`;
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);

  const updateSearchParam = (key: 'tenant_id' | 'limit', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="io-operational-page io-workspace-page platform-provisioning-hardening">
      <OperationalWorkspaceHero
        iconPath="/platform/tenant-provisioning-hardening"
        eyebrow="Tenant provisioning"
        title="Tenant provisioning hardening"
        description="Verify that each provisioned tenant has explicit preset evidence, commercial plan and billing posture, an active admin, starter locations, an audit trail, and an onboarding handoff."
        meta={<>
          <OperationalWorkspaceMetaPill>Platform-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Read-only evidence</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Pre-onboarding gate</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-provisioning-hardening__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.hardened_for_onboarding ?? 0}/${summary.tenants_total ?? 0}` : '—'}
              label="tenants hardened for onboarding"
            />
            {data ? (
              <span className="platform-provisioning-hardening__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-provisioning-hardening__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void hardening.refetch()}
                disabled={hardening.isFetching}
              >
                {hardening.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-provisioning-hardening__scope-panel">
        <OperationalSectionHeader
          iconPath="/platform/tenants"
          title="Hardening scope"
          description="Review one tenant or a recent tenant window. Filters are kept in the page URL so the current evidence scope can be revisited reliably."
        />
        <div className="platform-provisioning-hardening__filter-grid">
          <label className="platform-provisioning-hardening__field" htmlFor="provisioning-hardening-tenant-filter">
            <span>Tenant filter</span>
            <select
              id="provisioning-hardening-tenant-filter"
              value={tenantId}
              onChange={(event) => updateSearchParam('tenant_id', event.target.value)}
            >
              <option value="">All tenants</option>
              {tenantId && !selectedTenant ? <option value={tenantId}>Selected tenant ({shortId(tenantId)})</option> : null}
              {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label className="platform-provisioning-hardening__field" htmlFor="provisioning-hardening-tenant-limit">
            <span>Tenant limit</span>
            <select
              id="provisioning-hardening-tenant-limit"
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
          <div className="platform-provisioning-hardening__scope-copy">
            <strong>Current scope</strong>
            <span>
              {tenantId
                ? `Single tenant: ${selectedTenant?.name || shortId(tenantId)}`
                : `Latest ${limit} tenants by creation date`}
            </span>
          </div>
        </div>
        {tenants.isLoading ? <span className="platform-provisioning-hardening__help">Loading tenant filter options…</span> : null}
        {tenants.error ? (
          <span className="platform-provisioning-hardening__filter-warning" role="status">
            Tenant filter options could not be loaded. The hardening board can still be reviewed with its current filter.
          </span>
        ) : null}
      </section>

      {hardening.isLoading ? <section className="app-panel app-panel--padded">Loading provisioning hardening board…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-provisioning-hardening__feedback" role="alert">
          <strong>Unable to load provisioning hardening board.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-provisioning-hardening__retry"
            onClick={() => void hardening.refetch()}
            disabled={hardening.isFetching}
          >
            {hardening.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-warning-state platform-provisioning-hardening__feedback" role="status">
          <strong>Latest provisioning refresh failed.</strong>
          <span>Showing the last successful provisioning snapshot from {formatDateTime(data?.generated_at)}.</span>
          <span>{errorMessage}</span>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Tenant provisioning hardening key metrics">
            <OperationalWorkspaceStatCard
              label="Tenants in scope"
              value={summary.tenants_total ?? 0}
              helper={tenantId ? 'Selected tenant evidence package' : `Latest ${limit} tenants`}
              iconPath="/platform/tenants"
              tone="neutral"
            />
            <OperationalWorkspaceStatCard
              label="Hardened for onboarding"
              value={summary.hardened_for_onboarding ?? 0}
              helper="All six provisioning controls have evidence"
              iconPath="/platform/tenant-provisioning-hardening"
              tone="good"
            />
            <OperationalWorkspaceStatCard
              label="Incomplete hardening"
              value={summary.missing_provisioning_evidence ?? 0}
              helper="Tenants with one or more missing controls"
              iconPath="/platform/tenant-provisioning-hardening"
              tone={(summary.missing_provisioning_evidence ?? 0) > 0 ? 'warn' : 'good'}
            />
            <OperationalWorkspaceStatCard
              label="Missing active admin"
              value={summary.missing_initial_admin ?? 0}
              helper="Tenants without an active tenant admin"
              iconPath="/platform/users"
              tone={(summary.missing_initial_admin ?? 0) > 0 ? 'danger' : 'neutral'}
            />
            <OperationalWorkspaceStatCard
              label="Missing starter locations"
              value={summary.missing_starter_locations ?? 0}
              helper="Tenants without an active storage location"
              iconPath="/platform/tenant-provisioning-hardening"
              tone={(summary.missing_starter_locations ?? 0) > 0 ? 'danger' : 'neutral'}
            />
            <OperationalWorkspaceStatCard
              label="Control evidence coverage"
              value={controlCoverage}
              helper="Controls with evidence / total controls in scope"
              iconPath="/platform/tenant-provisioning-hardening"
              tone="blue"
            />
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-provisioning-hardening__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/tenant-provisioning-hardening"
              title="Program context"
              description="This surface verifies provisioning evidence only. It does not provision tenants or certify commercial launch."
            />
            <div className="platform-provisioning-hardening__program-grid">
              <div>
                <strong>Phase</strong>
                <span>{data.phase}</span>
              </div>
              <div>
                <strong>Step</strong>
                <span>{data.step}</span>
              </div>
              <div>
                <strong>Generated</strong>
                <span>{formatDateTime(data.generated_at)}</span>
              </div>
              <div className="platform-provisioning-hardening__gap-summary">
                <strong>Audit trail gaps</strong>
                <span>{summary.missing_audit_trail ?? 0} tenant(s)</span>
              </div>
              <div className="platform-provisioning-hardening__gap-summary">
                <strong>Onboarding handoff gaps</strong>
                <span>{summary.missing_onboarding_handoff ?? 0} tenant(s)</span>
              </div>
              <details className="platform-provisioning-hardening__validation-note">
                <summary>Evidence interpretation</summary>
                <p>{data.validation_note}</p>
              </details>
            </div>
          </section>

          <section className="app-panel app-panel--padded platform-provisioning-hardening__presets-panel">
            <OperationalSectionHeader
              iconPath="/platform/provisioning"
              title="Available commercial presets"
              description="These are the currently available presets the live provisioning service can apply. Similar tenant fields alone are not treated as proof that a preset was applied."
            />
            <div className="platform-provisioning-hardening__preset-grid">
              {data.provisioning_presets.map((preset) => (
                <article key={preset.key} className="platform-provisioning-hardening__preset-card">
                  <div className="platform-provisioning-hardening__preset-heading">
                    <strong>{preset.label}</strong>
                    <span>{humanize(preset.organization_type)}</span>
                  </div>
                  <p>{preset.description}</p>
                  <div className="platform-provisioning-hardening__preset-facts">
                    <span><strong>{preset.storage_locations.length}</strong> starter locations</span>
                    <span><strong>{Object.keys(preset.feature_flags || {}).length}</strong> feature flags</span>
                    <span><strong>{Object.keys(preset.limits || {}).length}</strong> configured limits</span>
                  </div>
                </article>
              ))}
              {data.provisioning_presets.length === 0 ? (
                <div className="app-empty-state platform-provisioning-hardening__empty">No published provisioning presets are available.</div>
              ) : null}
            </div>
          </section>

          <section className="platform-provisioning-hardening__tenant-section">
            <OperationalSectionHeader
              iconPath="/platform/tenants"
              title="Tenant provisioning evidence"
              description="Each tenant shows the evidence the platform can prove, the six hardening controls, and the next operational step when something is missing."
            />

            <div className="platform-provisioning-hardening__tenant-list">
              {data.tenants.map((tenant) => (
                <article key={tenant.tenant_id} className="app-panel platform-provisioning-hardening__tenant-card">
                  <div className="platform-provisioning-hardening__tenant-header">
                    <div className="platform-provisioning-hardening__tenant-title-wrap">
                      <h3>{tenant.tenant_name}</h3>
                      <span title={tenant.tenant_id}>Tenant ID {shortId(tenant.tenant_id)}</span>
                    </div>
                    <span className="platform-provisioning-hardening__status-badge" data-tone={badgeTone(tenant.status)}>
                      {humanize(tenant.status)}
                    </span>
                  </div>

                  <div className="platform-provisioning-hardening__evidence-grid" aria-label={`${tenant.tenant_name} provisioning evidence`}>
                    {evidenceItems.map((item) => (
                      <div key={item.key} className="platform-provisioning-hardening__evidence-card">
                        <span>{item.label}</span>
                        <strong>{formatValue(tenant.evidence[item.key])}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="platform-provisioning-hardening__control-grid">
                    {tenant.controls.map((control) => (
                      <div key={control.code} className="platform-provisioning-hardening__control-row">
                        <div className="platform-provisioning-hardening__control-copy">
                          <strong>{control.label}</strong>
                          <span>{control.launch_reason}</span>
                        </div>
                        <div className="platform-provisioning-hardening__control-status">
                          <span className="platform-provisioning-hardening__status-badge" data-tone={badgeTone(control.status)}>
                            {humanize(control.status || 'missing_evidence')}
                          </span>
                          <span>Evidence: {control.evidence_value ?? 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="platform-provisioning-hardening__next-step">
                    <strong>Next best step</strong>
                    <span>{tenant.next_best_step}</span>
                  </div>

                  <div className="platform-provisioning-hardening__actions">
                    <Link className="app-button app-button--secondary platform-provisioning-hardening__link-button" to="/platform/tenants">
                      Open tenants
                    </Link>
                    <Link className="app-button app-button--secondary platform-provisioning-hardening__link-button" to="/platform/provisioning">
                      Open provisioning
                    </Link>
                    <Link
                      className="app-button app-button--secondary platform-provisioning-hardening__link-button"
                      to={`/platform/tenant-tasks?tenant_id=${tenant.tenant_id}&category=onboarding`}
                    >
                      Open onboarding tasks
                    </Link>
                    {canReadAudit ? (
                      <Link className="app-button app-button--secondary platform-provisioning-hardening__link-button" to="/platform/audit">
                        Open platform audit
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}

              {data.tenants.length === 0 ? (
                <div className="app-empty-state platform-provisioning-hardening__empty">No tenants found for this hardening board.</div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
