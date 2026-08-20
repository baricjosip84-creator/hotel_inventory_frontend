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
import './PlatformCustomerOnboardingChecklistPage.css';

type ChecklistItem = {
  code: string;
  label: string;
  evidence_key: string;
  launch_reason: string;
  evidence_value?: number;
  status?: string;
};

type TenantOnboardingRow = {
  tenant_id: string;
  tenant_name: string;
  status: string;
  evidence: Record<string, string | number | null>;
  checklist: ChecklistItem[];
  missing_checklist_codes: string[];
  next_best_step: string;
};

type OnboardingChecklistPackage = {
  phase: string;
  step: string;
  posture: string;
  generated_at: string;
  summary: Record<string, number>;
  checklist_items: ChecklistItem[];
  tenants: TenantOnboardingRow[];
  validation_note: string;
};

type Tenant = { id: string; name: string };

type BadgeTone = 'accent' | 'good' | 'warn' | 'danger' | 'neutral';

const allowedLimits = new Set(['25', '50', '100', '300']);

const evidenceItems = [
  { key: 'admin_user_count', label: 'Active admins' },
  { key: 'product_count', label: 'Products' },
  { key: 'storage_location_count', label: 'Storage locations' },
  { key: 'stock_row_count', label: 'Stock rows' },
  { key: 'shipment_count', label: 'Shipments' },
  { key: 'onboarding_task_count', label: 'Onboarding tasks' },
  { key: 'onboarding_task_completed_count', label: 'Completed tasks' },
  { key: 'onboarding_task_overdue_count', label: 'Overdue tasks' }
] as const;

function humanize(value: string | null | undefined) {
  const normalized = String(value || '').trim().replaceAll('_', ' ');
  if (!normalized) return 'Not set';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function badgeTone(value: string | null | undefined): BadgeTone {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('blocked')) return 'danger';
  if (normalized.includes('missing') || normalized.includes('incomplete') || normalized.includes('overdue')) return 'warn';
  if (normalized.includes('no_tenants')) return 'neutral';
  if (normalized.includes('ready_for_first_use') || normalized.includes('present') || normalized.includes('complete')) return 'good';
  if (normalized.includes('needs') || normalized.includes('manual') || normalized.includes('review')) return 'warn';
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

export default function PlatformCustomerOnboardingChecklistPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tenantId = searchParams.get('tenant_id') || '';
  const requestedLimit = searchParams.get('limit') || '100';
  const limit = allowedLimits.has(requestedLimit) ? requestedLimit : '100';

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-customer-onboarding-checklist'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants'),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const query = new URLSearchParams();
  if (tenantId) query.set('tenant_id', tenantId);
  query.set('limit', limit);

  const checklist = useQuery({
    queryKey: ['platform', 'customer-onboarding-checklist', tenantId, limit],
    queryFn: () => platformApiRequest<OnboardingChecklistPackage>(`/platform/customer-onboarding-checklist?${query.toString()}`),
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });

  const data = checklist.data;
  const summary = data?.summary || {};
  const tenantOptions = useMemo(() => tenants.data || [], [tenants.data]);
  const selectedTenant = useMemo(
    () => tenantOptions.find((tenant) => tenant.id === tenantId),
    [tenantId, tenantOptions]
  );
  const refreshError = checklist.isError && Boolean(data);
  const initialLoadError = checklist.isError && !data;
  const errorMessage = checklist.error instanceof Error ? checklist.error.message : 'The platform request failed.';
  const evidenceCoverage = `${summary.checklist_items_with_evidence ?? 0}/${summary.total_checklist_items ?? 0}`;

  const updateSearchParam = (key: 'tenant_id' | 'limit', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="io-operational-page io-workspace-page platform-onboarding-checklist">
      <OperationalWorkspaceHero
        iconPath="/platform/customer-onboarding-checklist"
        eyebrow="Customer onboarding"
        title="Customer onboarding checklist"
        description="Review first-use evidence for tenant setup, active administration, starter inventory, receiving activity, and the first operational report walkthrough."
        meta={<>
          <OperationalWorkspaceMetaPill>Platform-scoped</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Read-only evidence</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>Manual customer acceptance required</OperationalWorkspaceMetaPill>
        </>}
        aside={
          <div className="platform-onboarding-checklist__hero-aside">
            <OperationalWorkspaceStatus
              value={data ? `${summary.ready_for_first_use ?? 0}/${summary.tenants_total ?? 0}` : '—'}
              label="tenants ready for first-use review"
            />
            {data ? (
              <span className="platform-onboarding-checklist__status-badge" data-tone={badgeTone(data.posture)}>
                {humanize(data.posture)}
              </span>
            ) : null}
            <div className="platform-onboarding-checklist__refresh-block">
              <span>Last refreshed: {formatDateTime(data?.generated_at)}</span>
              <button
                type="button"
                className="app-button app-button--secondary"
                onClick={() => void checklist.refetch()}
                disabled={checklist.isFetching}
              >
                {checklist.isFetching ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>
        }
      />

      <section className="app-panel app-panel--padded platform-onboarding-checklist__scope-panel">
        <OperationalSectionHeader
          iconPath="/platform/tenants"
          title="Checklist scope"
          description="Review one tenant or a recent tenant window. Filters are kept in the page URL so the current view can be revisited reliably."
        />
        <div className="platform-onboarding-checklist__filter-grid">
          <label className="platform-onboarding-checklist__field" htmlFor="onboarding-tenant-filter">
            <span>Tenant filter</span>
            <select
              id="onboarding-tenant-filter"
              value={tenantId}
              onChange={(event) => updateSearchParam('tenant_id', event.target.value)}
            >
              <option value="">All tenants</option>
              {tenantId && !selectedTenant ? <option value={tenantId}>Selected tenant ({shortId(tenantId)})</option> : null}
              {tenantOptions.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
            </select>
          </label>
          <label className="platform-onboarding-checklist__field" htmlFor="onboarding-tenant-limit">
            <span>Tenant limit</span>
            <select
              id="onboarding-tenant-limit"
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
          <div className="platform-onboarding-checklist__scope-copy">
            <strong>Current scope</strong>
            <span>
              {tenantId
                ? `Single tenant: ${selectedTenant?.name || shortId(tenantId)}`
                : `Latest ${limit} tenants by creation date`}
            </span>
          </div>
        </div>
        {tenants.isLoading ? <span className="platform-onboarding-checklist__help">Loading tenant filter options…</span> : null}
        {tenants.error ? (
          <span className="platform-onboarding-checklist__filter-warning" role="status">
            Tenant filter options could not be loaded. The checklist can still be reviewed with its current filter.
          </span>
        ) : null}
      </section>

      {checklist.isLoading ? <section className="app-panel app-panel--padded">Loading onboarding checklist…</section> : null}

      {initialLoadError ? (
        <section className="app-error-state platform-onboarding-checklist__feedback" role="alert">
          <strong>Unable to load onboarding checklist.</strong>
          <span>{errorMessage}</span>
          <button
            type="button"
            className="app-button app-button--danger platform-onboarding-checklist__retry"
            onClick={() => void checklist.refetch()}
            disabled={checklist.isFetching}
          >
            {checklist.isFetching ? 'Retrying…' : 'Retry'}
          </button>
        </section>
      ) : null}

      {refreshError ? (
        <section className="app-warning-state platform-onboarding-checklist__feedback" role="status">
          <strong>Latest onboarding refresh failed.</strong>
          <span>Showing the last successful onboarding snapshot from {formatDateTime(data?.generated_at)}.</span>
          <span>{errorMessage}</span>
        </section>
      ) : null}

      {data ? (
        <>
          <OperationalWorkspaceStats ariaLabel="Customer onboarding key metrics">
            <OperationalWorkspaceStatCard
              label="Tenants in scope"
              value={summary.tenants_total ?? 0}
              helper={tenantId ? 'Selected tenant evidence package' : `Latest ${limit} tenants`}
              iconPath="/platform/tenants"
              tone="neutral"
            />
            <OperationalWorkspaceStatCard
              label="Ready for review"
              value={summary.ready_for_first_use ?? 0}
              helper="Evidence complete and no blocked onboarding task"
              iconPath="/platform/customer-onboarding-checklist"
              tone="good"
            />
            <OperationalWorkspaceStatCard
              label="Blocked by tasks"
              value={summary.blocked_by_tasks ?? 0}
              helper="Tenants with a blocked onboarding task"
              iconPath="/platform/tenant-tasks"
              tone={(summary.blocked_by_tasks ?? 0) > 0 ? 'danger' : 'neutral'}
            />
            <OperationalWorkspaceStatCard
              label="Missing evidence"
              value={summary.missing_evidence ?? 0}
              helper="Tenants with one or more incomplete checklist items"
              iconPath="/platform/customer-onboarding-checklist"
              tone={(summary.missing_evidence ?? 0) > 0 ? 'warn' : 'good'}
            />
            <OperationalWorkspaceStatCard
              label="Overdue task tenants"
              value={summary.with_overdue_onboarding_tasks ?? 0}
              helper="Tenants with overdue onboarding work"
              iconPath="/platform/tenant-tasks"
              tone={(summary.with_overdue_onboarding_tasks ?? 0) > 0 ? 'danger' : 'neutral'}
            />
            <OperationalWorkspaceStatCard
              label="Evidence coverage"
              value={evidenceCoverage}
              helper="Checklist items with evidence / total checklist items"
              iconPath="/platform/customer-onboarding-checklist"
              tone="blue"
            />
          </OperationalWorkspaceStats>

          <section className="app-panel app-panel--padded platform-onboarding-checklist__program-panel">
            <OperationalSectionHeader
              iconPath="/platform/customer-onboarding-checklist"
              title="Program context"
              description="This surface reports evidence only. It does not record or imply customer acceptance."
            />
            <div className="platform-onboarding-checklist__program-grid">
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
              <details className="platform-onboarding-checklist__validation-note">
                <summary>Evidence interpretation</summary>
                <p>{data.validation_note}</p>
              </details>
            </div>
          </section>

          <section className="platform-onboarding-checklist__tenant-section">
            <OperationalSectionHeader
              iconPath="/platform/tenants"
              title="Tenant onboarding evidence"
              description="Each tenant shows the operational evidence the platform can prove and the next step when something is missing or blocked."
            />

            <div className="platform-onboarding-checklist__tenant-list">
              {data.tenants.map((tenant) => (
                <article key={tenant.tenant_id} className="app-panel platform-onboarding-checklist__tenant-card">
                  <div className="platform-onboarding-checklist__tenant-header">
                    <div className="platform-onboarding-checklist__tenant-title-wrap">
                      <h3>{tenant.tenant_name}</h3>
                      <span title={tenant.tenant_id}>Tenant ID {shortId(tenant.tenant_id)}</span>
                    </div>
                    <span className="platform-onboarding-checklist__status-badge" data-tone={badgeTone(tenant.status)}>
                      {humanize(tenant.status)}
                    </span>
                  </div>

                  <div className="platform-onboarding-checklist__evidence-grid" aria-label={`${tenant.tenant_name} onboarding evidence counts`}>
                    {evidenceItems.map((item) => (
                      <div key={item.key} className="platform-onboarding-checklist__evidence-card">
                        <span>{item.label}</span>
                        <strong>{formatValue(tenant.evidence[item.key])}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="platform-onboarding-checklist__checklist-grid">
                    {tenant.checklist.map((item) => (
                      <div key={item.code} className="platform-onboarding-checklist__checklist-row">
                        <div className="platform-onboarding-checklist__checklist-copy">
                          <strong>{item.label}</strong>
                          <span>{item.launch_reason}</span>
                        </div>
                        <div className="platform-onboarding-checklist__checklist-status">
                          <span className="platform-onboarding-checklist__status-badge" data-tone={badgeTone(item.status)}>
                            {humanize(item.status || 'missing_evidence')}
                          </span>
                          <span>Evidence: {item.evidence_value ?? 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="platform-onboarding-checklist__next-step">
                    <strong>Next best step</strong>
                    <span>{tenant.next_best_step}</span>
                  </div>

                  <div className="platform-onboarding-checklist__actions">
                    <Link className="app-button app-button--secondary platform-onboarding-checklist__link-button" to="/platform/tenants">
                      Open tenants
                    </Link>
                    <Link
                      className="app-button app-button--secondary platform-onboarding-checklist__link-button"
                      to={`/platform/tenant-tasks?tenant_id=${tenant.tenant_id}&category=onboarding`}
                    >
                      Open onboarding tasks
                    </Link>
                  </div>
                </article>
              ))}

              {data.tenants.length === 0 ? (
                <div className="app-empty-state platform-onboarding-checklist__empty">No tenants found for this checklist.</div>
              ) : null}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
