import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../lib/api';
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
import './PlatformTenantSlaPage.css';

type EvidenceKey = 'incidents' | 'tenant_tasks' | 'support_sessions';
type SlaStatus = 'breached' | 'within_sla' | 'partial_evidence' | 'inactive' | 'not_configured';
type Policy = {
  id: string | null;
  tenant_id: string;
  tenant_name: string;
  response_target_minutes: number;
  incident_resolution_target_hours: number;
  task_overdue_grace_hours: number;
  review_frequency: 'daily' | 'weekly' | 'monthly';
  escalation_notes?: string;
  is_active: boolean;
  is_persisted: boolean;
  uses_template_defaults: boolean;
};
type SlaCounts = {
  open_incidents: number | null;
  breached_open_incidents: number | null;
  resolved_incident_breaches: number | null;
  open_tasks: number | null;
  overdue_tasks_after_grace: number | null;
  pending_support_approvals: number | null;
  active_support_sessions: number | null;
  support_response_breaches: number | null;
};
type SlaRow = {
  tenant_id: string;
  tenant_name: string;
  policy_id: string | null;
  is_persisted: boolean;
  uses_template_defaults: boolean;
  is_active: boolean;
  response_target_minutes: number;
  incident_resolution_target_hours: number;
  task_overdue_grace_hours: number;
  review_frequency: 'daily' | 'weekly' | 'monthly';
  escalation_notes?: string;
  known_breach_count: number;
  breach_count: number;
  status: SlaStatus;
  counts: SlaCounts;
};
type SlaOverview = {
  generated_at: string;
  evidence: { available: EvidenceKey[]; omitted: EvidenceKey[]; complete: boolean };
  summary_scope: 'loaded_page' | 'full_scan_scope';
  summary: {
    tenants: number;
    breached: number;
    within_sla: number;
    partial_evidence: number;
    inactive_policies: number;
    not_configured: number;
  };
  pagination: { limit: number; offset: number; has_more: boolean } | null;
  truthfulness: {
    template_defaults_are_persisted_policy: false;
    unconfigured_tenants_are_within_sla: false;
    within_sla_requires_complete_evidence: true;
    external_contractual_sla_proven: false;
  };
  tenants: SlaRow[];
};
type PolicyResponse = {
  policies: Policy[];
  pagination: { limit: number; offset: number; has_more: boolean };
  policy_truth: { template_defaults_are_persisted_policy: false; unconfigured_tenants_are_active_sla: false };
};
type SlaScanResult = {
  scanned_at: string;
  tenants_checked: number;
  breached_tenants: number;
  created: number;
  refreshed: number;
  resolved_duplicates: number;
  resolved_recovered: number;
  notifications_touched: number;
};
type FormState = {
  tenant_id: string;
  response_target_minutes: string;
  incident_resolution_target_hours: string;
  task_overdue_grace_hours: string;
  review_frequency: 'daily' | 'weekly' | 'monthly';
  escalation_notes: string;
  is_active: boolean;
};

const PAGE_SIZE = 100;
const POLICY_PICKER_LIMIT = 250;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const defaultForm: FormState = {
  tenant_id: '',
  response_target_minutes: '60',
  incident_resolution_target_hours: '24',
  task_overdue_grace_hours: '24',
  review_frequency: 'weekly',
  escalation_notes: '',
  is_active: true
};
const evidenceMeta: Record<EvidenceKey, { label: string; permission: string }> = {
  incidents: { label: 'Incident evidence', permission: 'PLATFORM_INCIDENTS_READ' },
  tenant_tasks: { label: 'Tenant task evidence', permission: 'TENANTS_READ' },
  support_sessions: { label: 'Support-session evidence', permission: 'SUPPORT_SESSION_READ' }
};
const scanPermissions = [
  PLATFORM_PERMISSIONS.PLATFORM_SLA_READ,
  PLATFORM_PERMISSIONS.PLATFORM_SLA_WRITE,
  PLATFORM_PERMISSIONS.TENANTS_READ,
  PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ,
  PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ,
  PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_WRITE
];

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}
function dateTime(value: string | null | undefined) {
  if (!value) return 'Not loaded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not loaded' : date.toLocaleString();
}
function humanize(value: string | null | undefined) {
  const text = String(value || '').replaceAll('_', ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Not recorded';
}
function statusTone(status: SlaStatus) {
  if (status === 'breached') return 'danger';
  if (status === 'within_sla') return 'good';
  if (status === 'partial_evidence' || status === 'not_configured') return 'warn';
  return 'neutral';
}
function countText(value: number | null) {
  return value === null ? 'Restricted' : String(value);
}

export default function PlatformTenantSlaPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);

  const requestedTenantId = searchParams.get('tenant_id') || '';
  const requestedView = searchParams.get('view') || '';
  const tenantId = uuidPattern.test(requestedTenantId) ? requestedTenantId : '';
  const view = requestedView === 'breached' ? 'breached' : 'all';
  const invalidTenantFilter = Boolean(requestedTenantId && !tenantId);
  const invalidViewFilter = Boolean(requestedView && !['all', 'breached'].includes(requestedView));
  const invalidFilters = invalidTenantFilter || invalidViewFilter;

  useEffect(() => { setOffset(0); }, [tenantId, view, invalidFilters]);

  const policies = useQuery({
    queryKey: ['platform', 'tenant-sla', 'policies', POLICY_PICKER_LIMIT],
    queryFn: () => platformApiRequest<PolicyResponse>(`/platform/tenant-sla?limit=${POLICY_PICKER_LIMIT}&offset=0`),
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const overview = useQuery({
    queryKey: ['platform', 'tenant-sla', 'overview', tenantId, offset],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (tenantId) params.set('tenant_id', tenantId);
      return platformApiRequest<SlaOverview>(`/platform/tenant-sla/overview?${params.toString()}`);
    },
    enabled: !invalidFilters,
    refetchOnWindowFocus: false,
    staleTime: 30_000
  });

  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_SLA_WRITE);
  const canScan = scanPermissions.every((permission) => hasPlatformPermission(permission));
  const missingScanPermissions = scanPermissions.filter((permission) => !hasPlatformPermission(permission));
  const selectedRow = overview.data?.tenants.find((row) => row.tenant_id === tenantId);
  const selectedPolicy = policies.data?.policies.find((policy) => policy.tenant_id === tenantId);
  const selectedTenantLabel = selectedRow?.tenant_name || selectedPolicy?.tenant_name || (tenantId ? 'Selected tenant' : 'All tenants');
  const policyOptions = useMemo(() => {
    const options = [...(policies.data?.policies || [])];
    if (selectedRow && !options.some((policy) => policy.tenant_id === selectedRow.tenant_id)) {
      options.unshift({
        id: selectedRow.policy_id,
        tenant_id: selectedRow.tenant_id,
        tenant_name: selectedRow.tenant_name,
        response_target_minutes: selectedRow.response_target_minutes,
        incident_resolution_target_hours: selectedRow.incident_resolution_target_hours,
        task_overdue_grace_hours: selectedRow.task_overdue_grace_hours,
        review_frequency: selectedRow.review_frequency,
        escalation_notes: selectedRow.escalation_notes,
        is_active: selectedRow.is_active,
        is_persisted: selectedRow.is_persisted,
        uses_template_defaults: selectedRow.uses_template_defaults
      });
    }
    return options;
  }, [policies.data?.policies, selectedRow]);

  const rows = (overview.data?.tenants || []).filter((row) => view !== 'breached' || row.status === 'breached');
  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const initialOverviewError = overview.isError && overview.data === undefined;
  const refreshOverviewError = overview.isError && overview.data !== undefined;
  const initialPoliciesError = policies.isError && policies.data === undefined;
  const refreshPoliciesError = policies.isError && policies.data !== undefined;
  const refreshing = overview.isFetching || policies.isFetching;

  const responseTarget = Number(form.response_target_minutes);
  const incidentTarget = Number(form.incident_resolution_target_hours);
  const taskGrace = Number(form.task_overdue_grace_hours);
  const formIsValid = Boolean(form.tenant_id)
    && Number.isInteger(responseTarget) && responseTarget >= 1 && responseTarget <= 10080
    && Number.isInteger(incidentTarget) && incidentTarget >= 1 && incidentTarget <= 8760
    && Number.isInteger(taskGrace) && taskGrace >= 0 && taskGrace <= 8760;

  const savePolicy = useMutation({
    mutationFn: () => platformApiRequest<Policy>(`/platform/tenant-sla/${form.tenant_id}`, {
      method: 'PUT',
      body: JSON.stringify({
        response_target_minutes: responseTarget,
        incident_resolution_target_hours: incidentTarget,
        task_overdue_grace_hours: taskGrace,
        review_frequency: form.review_frequency,
        escalation_notes: form.escalation_notes.trim(),
        is_active: form.is_active
      })
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-sla'] });
    }
  });

  const scan = useMutation({
    mutationFn: () => platformApiRequest<SlaScanResult>('/platform/tenant-sla/scan', { method: 'POST' }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['platform', 'tenant-sla'] }),
        queryClient.invalidateQueries({ queryKey: ['platform', 'notifications'] })
      ]);
    }
  });

  const updateFilter = (key: 'tenant_id' | 'view', value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'all') next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const clearInvalidFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (invalidTenantFilter) next.delete('tenant_id');
    if (invalidViewFilter) next.delete('view');
    setSearchParams(next, { replace: true });
  };
  const refreshAll = async () => {
    const work: Array<Promise<unknown>> = [policies.refetch()];
    if (!invalidFilters) work.push(overview.refetch());
    await Promise.all(work);
  };
  const loadPolicy = (row: SlaRow | Policy) => {
    setForm({
      tenant_id: row.tenant_id,
      response_target_minutes: String(row.response_target_minutes),
      incident_resolution_target_hours: String(row.incident_resolution_target_hours),
      task_overdue_grace_hours: String(row.task_overdue_grace_hours),
      review_frequency: row.review_frequency,
      escalation_notes: row.escalation_notes || '',
      is_active: row.is_persisted ? row.is_active : true
    });
  };
  const selectPolicyTenant = (id: string) => {
    const policy = policyOptions.find((item) => item.tenant_id === id);
    if (policy) loadPolicy(policy); else setForm((current) => ({ ...current, tenant_id: id }));
  };

  const heroStatus = invalidFilters
    ? 'Filter invalid'
    : initialOverviewError
      ? 'Unavailable'
      : refreshOverviewError
        ? 'Stale snapshot'
        : overview.data && !overview.data.evidence.complete
          ? 'Partial evidence'
          : overview.data?.summary.breached
            ? 'Known breach'
            : overview.data?.summary.within_sla
              ? 'Within SLA'
              : 'Policy review';
  const heroLabel = invalidFilters
    ? 'Correct the URL filter before evidence is requested.'
    : initialOverviewError
      ? 'No SLA status snapshot is available.'
      : refreshOverviewError
        ? 'Showing the last successful SLA snapshot.'
        : overview.data && !overview.data.evidence.complete
          ? 'Final within-SLA status is withheld because protected evidence is unavailable.'
          : 'Application SLA evidence and persisted policy state.';

  return (
    <div className="platform-tenant-sla">
      <OperationalWorkspaceHero
        iconPath="/platform/tenant-sla"
        eyebrow="Platform tenant operations"
        title="Tenant SLA"
        description="Manage persisted platform SLA policies and review application-observed incident, task, and support-response evidence without treating template defaults or hidden evidence as proof of SLA compliance."
        meta={(
          <>
            <OperationalWorkspaceMetaPill>Tenant scope: {selectedTenantLabel}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Snapshot: {dateTime(overview.data?.generated_at)}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Evidence: {overview.data?.evidence.complete ? 'Complete' : overview.data ? 'Partial' : 'Not loaded'}</OperationalWorkspaceMetaPill>
            <OperationalWorkspaceMetaPill>Page {pageNumber}</OperationalWorkspaceMetaPill>
          </>
        )}
        aside={(
          <div className="platform-tenant-sla__hero-aside">
            <OperationalWorkspaceStatus value={heroStatus} label={heroLabel} />
            <div className="platform-tenant-sla__refresh-block">
              <button className="app-button app-button--secondary" type="button" onClick={() => void refreshAll()} disabled={refreshing}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <span>Read-only evidence refresh; policy and notification changes remain explicit actions.</span>
            </div>
          </div>
        )}
      />

      <OperationalWorkspaceStats ariaLabel="Tenant SLA loaded-page summary">
        <OperationalWorkspaceStatCard label="Loaded tenants" value={overview.data?.summary.tenants ?? 0} helper="Current server page only" tone="neutral" iconPath="/platform/tenants" loading={overview.isLoading && !overview.data} />
        <OperationalWorkspaceStatCard label="Known breached" value={overview.data?.summary.breached ?? 0} helper="At least one authorized active breach signal" tone={(overview.data?.summary.breached || 0) > 0 ? 'danger' : 'neutral'} iconPath="/platform/incidents" loading={overview.isLoading && !overview.data} />
        <OperationalWorkspaceStatCard label="Verified within" value={overview.data?.summary.within_sla ?? 0} helper="Only when all protected evidence is available" tone={(overview.data?.summary.within_sla || 0) > 0 ? 'good' : 'neutral'} iconPath="/platform/tenant-sla" loading={overview.isLoading && !overview.data} />
        <OperationalWorkspaceStatCard label="Partial evidence" value={overview.data?.summary.partial_evidence ?? 0} helper="Final within-SLA result deliberately withheld" tone={(overview.data?.summary.partial_evidence || 0) > 0 ? 'warn' : 'neutral'} iconPath="/platform/tenant-timeline" loading={overview.isLoading && !overview.data} />
        <OperationalWorkspaceStatCard label="Not configured" value={overview.data?.summary.not_configured ?? 0} helper="Template defaults are not persisted SLA policy" tone={(overview.data?.summary.not_configured || 0) > 0 ? 'warn' : 'neutral'} iconPath="/platform/tenant-lifecycle" loading={overview.isLoading && !overview.data} />
      </OperationalWorkspaceStats>

      {invalidFilters ? (
        <section className="platform-tenant-sla__blocking-error">
          <strong>Invalid Tenant SLA URL filter</strong>
          <span>{invalidTenantFilter ? 'tenant_id must be a UUID. ' : ''}{invalidViewFilter ? 'view must be all or breached.' : ''}</span>
          <button className="app-button app-button--secondary" type="button" onClick={clearInvalidFilters}>Clear invalid filters</button>
        </section>
      ) : null}
      {initialOverviewError ? (
        <section className="platform-tenant-sla__blocking-error">
          <strong>Tenant SLA status could not be loaded</strong>
          <span>{readableError(overview.error)}</span>
          <button className="app-button app-button--secondary" type="button" onClick={() => void overview.refetch()}>Retry</button>
        </section>
      ) : null}
      {refreshOverviewError ? <div className="platform-tenant-sla__warning">Showing the last successful SLA snapshot. Refresh failed: {readableError(overview.error)}</div> : null}
      {refreshPoliciesError ? <div className="platform-tenant-sla__warning">Showing the last successful SLA policy snapshot. Refresh failed: {readableError(policies.error)}</div> : null}

      <section className="platform-tenant-sla__section io-workspace-section">
        <OperationalSectionHeader iconPath="/platform/tenant-sla" title="Evidence and policy boundary" description="SLA status is derived only from evidence families the current operator is authorized to read. Missing protected evidence never becomes a false within-SLA result." />
        <div className="platform-tenant-sla__truth-note">
          <strong>Application evidence ≠ contractual proof.</strong>
          Template values (60-minute response, 24-hour incident resolution, 24-hour task grace) are configuration defaults only until a policy is persisted. This board does not prove an external contractual SLA, customer acknowledgement, or legal agreement.
        </div>
        <div className="platform-tenant-sla__evidence-grid">
          {(Object.keys(evidenceMeta) as EvidenceKey[]).map((key) => {
            const available = overview.data?.evidence.available.includes(key) ?? false;
            return (
              <div key={key} data-state={available ? 'available' : 'restricted'}>
                <span>{evidenceMeta[key].label}</span>
                <strong>{available ? 'Available' : 'Restricted'}</strong>
                <small>{evidenceMeta[key].permission}</small>
              </div>
            );
          })}
        </div>
        <div className="platform-tenant-sla__supporting-grid">
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? <Link to="/platform/tenant-health">Tenant Health</Link> : <span>Tenant Health · TENANTS_READ required</span>}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? <Link to="/platform/incidents">Incidents</Link> : <span>Incidents · PLATFORM_INCIDENTS_READ required</span>}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? <Link to="/platform/tenant-tasks">Tenant Tasks</Link> : <span>Tenant Tasks · TENANTS_READ required</span>}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? <Link to="/platform/support-sessions">Support Sessions</Link> : <span>Support Sessions · SUPPORT_SESSION_READ required</span>}
          {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_READ) ? <Link to="/platform/notifications">Notifications</Link> : <span>Notifications · PLATFORM_NOTIFICATIONS_READ required</span>}
        </div>
        <div className="platform-tenant-sla__scan-row">
          {canScan ? (
            <button className="app-button app-button--secondary" type="button" onClick={() => scan.mutate()} disabled={scan.isPending}>
              {scan.isPending ? 'Synchronizing…' : 'Synchronize SLA notifications'}
            </button>
          ) : (
            <span>Notification synchronization is restricted until all SLA evidence read permissions plus PLATFORM_SLA_WRITE and PLATFORM_NOTIFICATIONS_WRITE are present.</span>
          )}
          {!canScan && missingScanPermissions.length ? <small>Missing: {missingScanPermissions.join(', ')}</small> : null}
          {scan.data ? <strong>Sync complete: {scan.data.created} created · {scan.data.refreshed} refreshed · {scan.data.resolved_duplicates} duplicate resolved · {scan.data.resolved_recovered} recovered resolved</strong> : null}
          {scan.error ? <strong className="platform-tenant-sla__error-text">Sync failed: {readableError(scan.error)}</strong> : null}
        </div>
      </section>

      <section className="platform-tenant-sla__section io-workspace-section">
        <OperationalSectionHeader iconPath="/platform/tenant-sla" title="Scope and filters" description="Filters are stored in the URL. The status summary and cards below describe only the currently loaded server page." />
        <div className="platform-tenant-sla__filter-grid">
          <label>
            Tenant
            <select value={tenantId} onChange={(event) => updateFilter('tenant_id', event.target.value)} disabled={initialPoliciesError}>
              <option value="">All tenants</option>
              {policyOptions.map((policy) => <option key={policy.tenant_id} value={policy.tenant_id}>{policy.tenant_name}</option>)}
            </select>
          </label>
          <label>
            Loaded-page view
            <select value={view} onChange={(event) => updateFilter('view', event.target.value)}>
              <option value="all">All loaded SLA rows</option>
              <option value="breached">Known breached only</option>
            </select>
          </label>
          <div className="platform-tenant-sla__filter-summary">
            <span>Rows visible</span><strong>{rows.length}</strong>
          </div>
          <div className="platform-tenant-sla__filter-summary">
            <span>Policy selector</span><strong>{initialPoliciesError ? 'Unavailable' : `${policyOptions.length} loaded`}</strong>
          </div>
        </div>
        {initialPoliciesError ? <div className="platform-tenant-sla__warning">Policy selector unavailable: {readableError(policies.error)}. Existing SLA status evidence can still be reviewed.</div> : null}
      </section>

      {canWrite ? (
        <section className="platform-tenant-sla__section io-workspace-section">
          <OperationalSectionHeader iconPath="/platform/tenant-sla" title="SLA policy" description="Saving a tenant with template defaults creates a real persisted policy. Partial API updates preserve existing values instead of resetting omitted fields." actions={<button className="app-button app-button--secondary" type="button" onClick={() => setForm(defaultForm)}>Reset form</button>} />
          <div className="platform-tenant-sla__policy-grid">
            <label>Tenant<select value={form.tenant_id} onChange={(event) => selectPolicyTenant(event.target.value)}><option value="">Select tenant</option>{policyOptions.map((policy) => <option key={policy.tenant_id} value={policy.tenant_id}>{policy.tenant_name}{policy.is_persisted ? '' : ' · not configured'}</option>)}</select></label>
            <label>Response target (minutes)<input type="number" min="1" max="10080" value={form.response_target_minutes} onChange={(event) => setForm((current) => ({ ...current, response_target_minutes: event.target.value }))} /></label>
            <label>Incident resolution (hours)<input type="number" min="1" max="8760" value={form.incident_resolution_target_hours} onChange={(event) => setForm((current) => ({ ...current, incident_resolution_target_hours: event.target.value }))} /></label>
            <label>Task overdue grace (hours)<input type="number" min="0" max="8760" value={form.task_overdue_grace_hours} onChange={(event) => setForm((current) => ({ ...current, task_overdue_grace_hours: event.target.value }))} /></label>
            <label>Review cadence<select value={form.review_frequency} onChange={(event) => setForm((current) => ({ ...current, review_frequency: event.target.value as FormState['review_frequency'] }))}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
            <label className="platform-tenant-sla__checkbox"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />Active policy</label>
            <label className="platform-tenant-sla__notes">Escalation notes<textarea value={form.escalation_notes} onChange={(event) => setForm((current) => ({ ...current, escalation_notes: event.target.value }))} maxLength={5000} /></label>
          </div>
          <div className="platform-tenant-sla__policy-actions">
            <button className="app-button app-button--primary" type="button" disabled={!formIsValid || savePolicy.isPending} onClick={() => savePolicy.mutate()}>{savePolicy.isPending ? 'Saving…' : 'Save policy'}</button>
            {form.tenant_id && !policyOptions.find((policy) => policy.tenant_id === form.tenant_id)?.is_persisted ? <span>Saving will turn the displayed template defaults into a persisted SLA policy.</span> : null}
            {savePolicy.data ? <strong>Policy saved for {savePolicy.data.tenant_name}.</strong> : null}
            {savePolicy.error ? <strong className="platform-tenant-sla__error-text">Save failed: {readableError(savePolicy.error)}</strong> : null}
          </div>
        </section>
      ) : null}

      <section className="platform-tenant-sla__section io-workspace-section">
        <OperationalSectionHeader iconPath="/platform/tenant-sla" title="SLA status" description="Known breaches can be shown from authorized evidence. “Within SLA” appears only for an active persisted policy with complete evidence and no active breach signal." />
        {overview.isLoading && !overview.data ? <div className="platform-tenant-sla__loading">Loading Tenant SLA evidence…</div> : null}
        {!initialOverviewError && !overview.isLoading && rows.length === 0 ? (
          <div className="platform-tenant-sla__empty"><strong>No SLA rows match this loaded-page view.</strong><span>This does not prove that no external SLA issue exists; it describes only persisted policy plus application-observed authorized evidence.</span></div>
        ) : null}
        <div className="platform-tenant-sla__list">
          {rows.map((row) => (
            <article className="platform-tenant-sla__card" key={row.tenant_id}>
              <div className="platform-tenant-sla__card-header">
                <div><h4>{row.tenant_name}</h4><div className="platform-tenant-sla__provenance"><span>{row.is_persisted ? 'Persisted SLA policy' : 'Template defaults — policy not configured'}</span><span>{row.is_active ? 'Active' : row.is_persisted ? 'Inactive' : 'Not active'}</span><span>{humanize(row.review_frequency)} review</span></div></div>
                <span className="platform-tenant-sla__posture" data-tone={statusTone(row.status)}>{humanize(row.status)}</span>
              </div>
              <div className="platform-tenant-sla__metrics-grid">
                <div><span>Response target</span><strong>{row.response_target_minutes} min</strong></div>
                <div><span>Incident target</span><strong>{row.incident_resolution_target_hours} h</strong></div>
                <div><span>Task grace</span><strong>{row.task_overdue_grace_hours} h</strong></div>
                <div><span>Known breach areas</span><strong>{row.known_breach_count}</strong></div>
                <div><span>Open incidents</span><strong>{countText(row.counts.open_incidents)}</strong></div>
                <div><span>Incident breaches</span><strong>{countText(row.counts.breached_open_incidents)}</strong></div>
                <div><span>Open tenant tasks</span><strong>{countText(row.counts.open_tasks)}</strong></div>
                <div><span>Overdue after grace</span><strong>{countText(row.counts.overdue_tasks_after_grace)}</strong></div>
                <div><span>Pending support approvals</span><strong>{countText(row.counts.pending_support_approvals)}</strong></div>
                <div><span>Support response breaches</span><strong>{countText(row.counts.support_response_breaches)}</strong></div>
              </div>
              {row.escalation_notes ? <div className="platform-tenant-sla__notes-read"><strong>Escalation notes</strong><span>{row.escalation_notes}</span></div> : null}
              <div className="platform-tenant-sla__link-row">
                {canWrite ? <button className="app-button app-button--secondary" type="button" onClick={() => loadPolicy(row)}>Edit policy</button> : null}
                {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? <Link to={`/platform/tenant-health?tenant_id=${row.tenant_id}`}>Health</Link> : null}
                {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? <Link to={`/platform/tenant-tasks?tenant_id=${row.tenant_id}`}>Tasks</Link> : null}
                {hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ) ? <Link to={`/platform/tenant-timeline?tenant_id=${row.tenant_id}`}>Timeline</Link> : null}
                {hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_INCIDENTS_READ) ? <Link to={`/platform/incidents?tenant_id=${row.tenant_id}`}>Incidents</Link> : null}
                {hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ) ? <Link to={`/platform/support-sessions?tenant_id=${row.tenant_id}`}>Support sessions</Link> : null}
              </div>
            </article>
          ))}
        </div>
        <div className="platform-tenant-sla__pagination">
          <button className="app-button app-button--secondary" type="button" disabled={offset === 0 || overview.isFetching} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}>Previous</button>
          <span>Page {pageNumber} · {overview.data?.summary.tenants ?? 0} loaded</span>
          <button className="app-button app-button--secondary" type="button" disabled={!overview.data?.pagination?.has_more || overview.isFetching} onClick={() => setOffset((value) => value + PAGE_SIZE)}>Next</button>
        </div>
      </section>
    </div>
  );
}
