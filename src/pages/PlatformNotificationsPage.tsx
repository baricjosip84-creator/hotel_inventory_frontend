import { useMemo, useState } from 'react';
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
import './PlatformNotificationsPage.css';

type NotificationStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
type NotificationAction = 'acknowledge' | 'resolve' | 'dismiss' | 'reopen';
type RoutingForm = { ownerEmail: string; escalationUrl: string; responseDueAt: string; note: string };

type Notification = {
  id: string;
  severity: 'info' | 'warning' | 'critical' | string;
  title: string;
  message: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  source: string;
  status: NotificationStatus;
  created_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  dismissed_at?: string | null;
  acknowledged_by_present?: boolean;
  resolved_by_present?: boolean;
  dismissed_by_present?: boolean;
  acknowledged_by_email?: string | null;
  resolved_by_email?: string | null;
  dismissed_by_email?: string | null;
  metadata?: Record<string, unknown> | null;
};

type NotificationPackage = {
  generated_at: string;
  notifications: Notification[];
  pagination: { limit: number; offset: number; total: number; has_more: boolean };
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: Record<string, boolean>;
  evidence_complete: boolean;
  identity_access: { tenant_identity: boolean; platform_user_identity: boolean };
};

type NotificationSummary = {
  by_status: Array<{ status: NotificationStatus; count: number }>;
  active_by_severity: Array<{ severity: string; count: number }>;
  oldest_open_at: string | null;
  available_sources: string[];
  omitted_sources: string[];
  evidence_access: Record<string, boolean>;
  evidence_complete: boolean;
};

type ScanResult = {
  scanned_at: string;
  tenants_checked?: number;
  integrations_checked?: number;
  notifications_touched: number;
  created: number;
  refreshed: number;
  auto_resolved?: number;
  sla_escalated?: number;
  routing_escalated?: number;
  routed_response_escalated?: number;
};

type CleanupResult = { deleted_count: number; older_than_days: number };
type BulkResult = { updated_count: number };
type BulkRoutingResult = { updated_count: number };
const PAGE_SIZE = 50;

function readableError(error: unknown) {
  return error instanceof ApiError || error instanceof Error ? error.message : 'Unknown error';
}

function pretty(value?: string | null) {
  return value ? value.replaceAll('_', ' ') : 'Not recorded';
}

function countFor(summary: NotificationSummary | undefined, status: NotificationStatus) {
  return summary?.by_status.find((row) => row.status === status)?.count ?? 0;
}

function actionsForStatus(status: NotificationStatus): NotificationAction[] {
  if (status === 'open') return ['acknowledge', 'resolve', 'dismiss'];
  if (status === 'acknowledged') return ['resolve', 'dismiss', 'reopen'];
  return ['reopen'];
}

function actionLabel(action: NotificationAction) {
  return ({ acknowledge: 'Acknowledge', resolve: 'Resolve', dismiss: 'Dismiss', reopen: 'Reopen' } as const)[action];
}

function metadataText(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not recorded';
  return String(value);
}

export default function PlatformNotificationsPage() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createForm, setCreateForm] = useState({ severity: 'info', title: '', message: '' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<NotificationAction>('acknowledge');
  const [cleanupDays, setCleanupDays] = useState('90');
  const [routingForms, setRoutingForms] = useState<Record<string, RoutingForm>>({});
  const [bulkRoutingForm, setBulkRoutingForm] = useState<RoutingForm>({ ownerEmail: '', escalationUrl: '', responseDueAt: '', note: '' });
  const [lastBulkRouting, setLastBulkRouting] = useState<BulkRoutingResult | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [lastIntegrationScan, setLastIntegrationScan] = useState<ScanResult | null>(null);
  const [lastCleanup, setLastCleanup] = useState<CleanupResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_WRITE);
  const canReadTenants = hasPlatformPermission(PLATFORM_PERMISSIONS.TENANTS_READ);
  const canReadUsers = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_USERS_READ);
  const canReadAudit = hasPlatformPermission(PLATFORM_PERMISSIONS.AUDIT_READ);
  const canReadBilling = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_BILLING_READ);
  const canReadSupport = hasPlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_SESSION_READ);
  const canReadDependencies = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_DEPENDENCIES_READ);
  const canReadWebhooks = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_READ);
  const canReadApiKeys = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_API_KEYS_READ);
  const canReadVendors = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_VENDORS_READ);
  const canReadJobs = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_JOBS_READ);
  const canRunOperationalScan = canWrite && canReadTenants && canReadBilling && canReadSupport && canReadAudit;
  const canRunIntegrationScan = canWrite && canReadDependencies && canReadWebhooks && canReadApiKeys && canReadTenants && canReadUsers && canReadVendors;

  const status = searchParams.get('status') || '';
  const severity = searchParams.get('severity') || '';
  const source = searchParams.get('source') || '';
  const search = searchParams.get('search') || '';
  const tenantId = searchParams.get('tenant_id') || '';
  const offset = Math.max(0, Number(searchParams.get('offset') || 0) || 0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
    if (status) params.set('status', status);
    if (severity) params.set('severity', severity);
    if (source.trim()) params.set('source', source.trim());
    if (search.trim()) params.set('search', search.trim());
    if (tenantId) params.set('tenant_id', tenantId);
    return params.toString();
  }, [status, severity, source, search, tenantId, offset]);

  const notificationsQuery = useQuery({
    queryKey: ['platform', 'notifications', queryString],
    queryFn: () => platformApiRequest<NotificationPackage>(`/platform/notifications?${queryString}`),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });

  const summaryQuery = useQuery({
    queryKey: ['platform', 'notifications', 'summary'],
    queryFn: () => platformApiRequest<NotificationSummary>('/platform/notifications/summary'),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous
  });

  const data = notificationsQuery.data;
  const notifications = data?.notifications || [];
  const summary = summaryQuery.data;
  const showingStaleSnapshot = Boolean((notificationsQuery.isError && data) || (summaryQuery.isError && summary));
  const selectedVisible = notifications.filter((row) => selectedIds.includes(row.id));

  function updateFilters(next: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '' || value === 0) params.delete(key);
      else params.set(key, String(value));
    }
    if (!Object.prototype.hasOwnProperty.call(next, 'offset')) params.delete('offset');
    setSearchParams(params, { replace: true });
  }

  async function refreshAll() {
    setStatusMessage('');
    await Promise.all([notificationsQuery.refetch(), summaryQuery.refetch()]);
  }

  async function invalidateNotifications() {
    await qc.invalidateQueries({ queryKey: ['platform', 'notifications'] });
  }

  const createMutation = useMutation({
    mutationFn: () => platformApiRequest('/platform/notifications', {
      method: 'POST',
      body: JSON.stringify({ severity: createForm.severity, title: createForm.title.trim(), message: createForm.message.trim() })
    }),
    onSuccess: async () => {
      setCreateForm({ severity: 'info', title: '', message: '' });
      setStatusMessage('Manual global notification created.');
      await invalidateNotifications();
    }
  });

  const markMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: NotificationAction }) => platformApiRequest(`/platform/notifications/${id}/${action}`, { method: 'POST' }),
    onSuccess: async (_result, variables) => {
      setStatusMessage(`${actionLabel(variables.action)} completed.`);
      await invalidateNotifications();
    }
  });

  const bulkMutation = useMutation({
    mutationFn: () => platformApiRequest<BulkResult>('/platform/notifications/bulk', {
      method: 'POST', body: JSON.stringify({ notification_ids: selectedIds, action: bulkAction })
    }),
    onSuccess: async (result) => {
      setSelectedIds([]);
      setStatusMessage(`Updated ${result.updated_count} notification(s).`);
      await invalidateNotifications();
    }
  });

  const scanMutation = useMutation({
    mutationFn: () => platformApiRequest<ScanResult>('/platform/notifications/system-scan', { method: 'POST' }),
    onSuccess: async (result) => {
      setLastScan(result);
      setStatusMessage('Operational notification reconciliation completed.');
      await invalidateNotifications();
      await qc.invalidateQueries({ queryKey: ['platform', 'dashboard'] });
    }
  });

  const integrationScanMutation = useMutation({
    mutationFn: () => platformApiRequest<ScanResult>('/platform/notifications/integration-monitoring-scan', { method: 'POST' }),
    onSuccess: async (result) => {
      setLastIntegrationScan(result);
      setStatusMessage('Integration notification reconciliation completed.');
      await invalidateNotifications();
      await qc.invalidateQueries({ queryKey: ['platform', 'integration-monitoring'] });
    }
  });

  const cleanupMutation = useMutation({
    mutationFn: () => platformApiRequest<CleanupResult>('/platform/notifications/cleanup-closed', {
      method: 'POST', body: JSON.stringify({ older_than_days: Number(cleanupDays) })
    }),
    onSuccess: async (result) => {
      setLastCleanup(result);
      setStatusMessage(`Deleted ${result.deleted_count} authorized closed notification record(s).`);
      await invalidateNotifications();
    }
  });

  const routingMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: RoutingForm }) => platformApiRequest(`/platform/notifications/${id}/assign-integration-routing`, {
      method: 'POST',
      body: JSON.stringify({
        owner_email: form.ownerEmail.trim() || undefined,
        escalation_url: form.escalationUrl.trim() || undefined,
        response_due_at: form.responseDueAt || undefined,
        note: form.note.trim() || undefined
      })
    }),
    onSuccess: async (_result, variables) => {
      setRoutingForms((current) => { const next = { ...current }; delete next[variables.id]; return next; });
      setStatusMessage('Integration routing assignment saved.');
      await invalidateNotifications();
      await qc.invalidateQueries({ queryKey: ['platform', 'integration-monitoring'] });
    }
  });


  const bulkRoutingMutation = useMutation({
    mutationFn: () => platformApiRequest<BulkRoutingResult>('/platform/notifications/bulk-assign-integration-routing', {
      method: 'POST',
      body: JSON.stringify({
        notification_ids: selectedIds,
        owner_email: bulkRoutingForm.ownerEmail.trim() || undefined,
        escalation_url: bulkRoutingForm.escalationUrl.trim() || undefined,
        response_due_at: bulkRoutingForm.responseDueAt || undefined,
        note: bulkRoutingForm.note.trim() || undefined
      })
    }),
    onSuccess: async (result) => {
      setLastBulkRouting(result);
      setBulkRoutingForm({ ownerEmail: '', escalationUrl: '', responseDueAt: '', note: '' });
      setSelectedIds([]);
      setStatusMessage(`Bulk integration routing updated ${result.updated_count} notification(s).`);
      await invalidateNotifications();
      await qc.invalidateQueries({ queryKey: ['platform', 'integration-monitoring'] });
    }
  });

  function routingFormFor(row: Notification): RoutingForm {
    return routingForms[row.id] || {
      ownerEmail: String(row.metadata?.routing_owner_email || ''), escalationUrl: '', responseDueAt: '', note: ''
    };
  }

  function updateRouting(id: string, field: keyof RoutingForm, value: string) {
    setRoutingForms((current) => ({
      ...current,
      [id]: { ...(current[id] || { ownerEmail: '', escalationUrl: '', responseDueAt: '', note: '' }), [field]: value }
    }));
  }

  const cleanupDaysNumber = Number(cleanupDays);
  const cleanupValid = Number.isInteger(cleanupDaysNumber) && cleanupDaysNumber >= 7 && cleanupDaysNumber <= 3650;
  const createValid = Boolean(createForm.title.trim() && createForm.message.trim());
  const selectedIntegrationNotifications = notifications.filter((row) => selectedIds.includes(row.id) && row.source === 'integration_monitoring.scan' && ['open', 'acknowledged'].includes(row.status));
  const bulkRoutingHasTarget = Boolean(bulkRoutingForm.ownerEmail.trim() || bulkRoutingForm.escalationUrl.trim());
  const bulkRoutingUrlValid = (() => {
    if (!bulkRoutingForm.escalationUrl.trim()) return true;
    try { const parsed = new URL(bulkRoutingForm.escalationUrl.trim()); return parsed.protocol === 'http:' || parsed.protocol === 'https:'; } catch { return false; }
  })();
  const bulkRoutingValid = selectedIntegrationNotifications.length > 0 && selectedIntegrationNotifications.length <= 100 && bulkRoutingHasTarget && bulkRoutingUrlValid;

  return <div className="platform-notifications">
    <OperationalWorkspaceHero
      iconPath="/platform/notifications"
      eyebrow="Platform operational evidence"
      title="Notifications"
      description="Review manual and system-generated Platform notifications without turning the registry into an alternate access path for protected Billing, Support Session, Integration Monitoring, SLA, Tenant Health, Audit, or Operational Job evidence."
      meta={<>
        <OperationalWorkspaceMetaPill>Base permission: PLATFORM_NOTIFICATIONS_READ</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Source evidence scoped independently</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>Tenant identity requires TENANTS_READ</OperationalWorkspaceMetaPill>
      </>}
      aside={<div className="platform-notifications__hero-aside">
        <OperationalWorkspaceStatus value={summary?.evidence_complete ? 'Complete evidence' : 'Partial evidence'} label="Authorized notification scope" />
        <button type="button" className="app-button app-button--secondary" onClick={refreshAll} disabled={notificationsQuery.isFetching || summaryQuery.isFetching}>{notificationsQuery.isFetching || summaryQuery.isFetching ? 'Refreshing…' : 'Refresh'}</button>
      </div>}
    />

    {notificationsQuery.isError && !data ? <section className="platform-notifications__blocking-error"><strong>Notifications failed to load.</strong><span>{readableError(notificationsQuery.error)}</span><button type="button" className="app-button app-button--secondary" onClick={() => notificationsQuery.refetch()}>Retry</button></section> : null}
    {showingStaleSnapshot ? <section className="platform-notifications__warning"><strong>Showing the last successful snapshot.</strong><span>The latest refresh failed. Existing evidence remains visible until a successful refresh.</span></section> : null}
    {summary && !summary.evidence_complete ? <section className="platform-notifications__warning"><strong>Partial notification evidence.</strong><span>Restricted source families: {summary.omitted_sources.map(pretty).join(', ') || 'None'}. Restricted rows are excluded rather than counted as zero.</span></section> : null}
    {statusMessage ? <section className="platform-notifications__success">{statusMessage}</section> : null}

    <OperationalWorkspaceStats ariaLabel="Notification summary">
      <OperationalWorkspaceStatCard label="Open" value={summary ? countFor(summary, 'open') : '—'} tone="warn" helper="Authorized source families only" loading={summaryQuery.isLoading && !summary} />
      <OperationalWorkspaceStatCard label="Acknowledged" value={summary ? countFor(summary, 'acknowledged') : '—'} helper="Authorized source families only" loading={summaryQuery.isLoading && !summary} />
      <OperationalWorkspaceStatCard label="Resolved" value={summary ? countFor(summary, 'resolved') : '—'} tone="good" helper="Historical application workflow state" loading={summaryQuery.isLoading && !summary} />
      <OperationalWorkspaceStatCard label="Dismissed" value={summary ? countFor(summary, 'dismissed') : '—'} helper="Historical application workflow state" loading={summaryQuery.isLoading && !summary} />
      <OperationalWorkspaceStatCard label="Visible rows" value={data?.pagination.total ?? '—'} helper="Current filters and authorized source scope" loading={notificationsQuery.isLoading && !data} />
      <OperationalWorkspaceStatCard label="Oldest open" value={summary?.oldest_open_at ? new Date(summary.oldest_open_at).toLocaleDateString() : 'None'} helper="Authorized open evidence" loading={summaryQuery.isLoading && !summary} />
    </OperationalWorkspaceStats>

    <section className="io-workspace-panel platform-notifications__section">
      <OperationalSectionHeader iconPath="/platform/notifications" title="Evidence access" description="Each system-generated source family keeps the permission boundary of the evidence used to create it. Unknown future system sources fail closed unless the operator has the complete protected notification evidence set." />
      <div className="platform-notifications__source-grid">
        {Object.entries(summary?.evidence_access || {}).map(([family, available]) => <div key={family}><strong>{pretty(family)}</strong><span className="platform-notifications__badge" data-tone={available ? 'good' : 'neutral'}>{available ? 'Available' : 'Restricted'}</span></div>)}
        {!summary ? <div className="platform-notifications__empty">Loading evidence access…</div> : null}
      </div>
    </section>

    <section className="io-workspace-panel platform-notifications__section">
      <OperationalSectionHeader iconPath="/platform/notifications" title="Registry filters" description="Filters are URL-backed. Explicit tenant or protected-source filters fail closed when the corresponding evidence permission is unavailable." />
      <div className="platform-notifications__filters">
        <label>Search<input value={search} maxLength={200} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Title, message, source…" /></label>
        <label>Status<select value={status} onChange={(event) => updateFilters({ status: event.target.value })}><option value="">All statuses</option><option value="open">Open</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></label>
        <label>Severity<select value={severity} onChange={(event) => updateFilters({ severity: event.target.value })}><option value="">All severities</option><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select></label>
        <label>Source<input value={source} maxLength={120} onChange={(event) => updateFilters({ source: event.target.value })} placeholder="Exact source…" /></label>
        {canReadTenants ? <label>Tenant ID<input value={tenantId} onChange={(event) => updateFilters({ tenant_id: event.target.value })} placeholder="Optional UUID…" /></label> : null}
        <div className="platform-notifications__filter-actions"><button type="button" className="app-button app-button--secondary" onClick={() => setSearchParams({}, { replace: true })} disabled={!searchParams.toString()}>Clear filters</button></div>
      </div>
    </section>

    {canWrite ? <section className="io-workspace-panel platform-notifications__section">
      <OperationalSectionHeader iconPath="/platform/notifications" title="Manual notification" description="Creates a manual global application notification. The management route does not allow an operator to forge a protected system source label." />
      <div className="platform-notifications__form-grid">
        <label>Severity<select value={createForm.severity} onChange={(event) => setCreateForm({ ...createForm, severity: event.target.value })}><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select></label>
        <label>Title<input value={createForm.title} maxLength={180} onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })} /></label>
        <label className="platform-notifications__wide">Message<textarea value={createForm.message} maxLength={5000} rows={3} onChange={(event) => setCreateForm({ ...createForm, message: event.target.value })} /></label>
        <div className="platform-notifications__form-actions"><button type="button" className="app-button app-button--primary" disabled={!createValid || createMutation.isPending} onClick={() => createMutation.mutate()}>{createMutation.isPending ? 'Creating…' : 'Create manual notification'}</button></div>
      </div>
      {createMutation.isError ? <div className="platform-notifications__inline-error">{readableError(createMutation.error)}</div> : null}
    </section> : null}

    {canWrite ? <section className="io-workspace-panel platform-notifications__section">
      <OperationalSectionHeader iconPath="/platform/notifications" title="Reconciliation actions" description="Manual scans consume protected source data. Buttons remain disabled until the current operator has every source permission needed by that scan." />
      <div className="platform-notifications__action-grid">
        <article><h4>Operational scan</h4><p>Reconciles Billing, tenant lifecycle/limits, active Support Sessions and tenant activity evidence.</p><button type="button" className="app-button app-button--primary" disabled={!canRunOperationalScan || scanMutation.isPending} onClick={() => window.confirm('Run operational notification reconciliation now?') && scanMutation.mutate()}>{scanMutation.isPending ? 'Reconciling…' : 'Run operational scan'}</button>{!canRunOperationalScan ? <small>Requires Notifications write, Tenants, Billing, Support Sessions and Audit evidence.</small> : null}{lastScan ? <small>Created {lastScan.created}; refreshed {lastScan.refreshed}.</small> : null}</article>
        <article><h4>Integration monitoring</h4><p>Reconciles protected integration evidence and routing escalations.</p><button type="button" className="app-button app-button--primary" disabled={!canRunIntegrationScan || integrationScanMutation.isPending} onClick={() => window.confirm('Run integration notification reconciliation now?') && integrationScanMutation.mutate()}>{integrationScanMutation.isPending ? 'Reconciling…' : 'Run integration scan'}</button>{!canRunIntegrationScan ? <small>Requires the full Integration Monitoring source permission set.</small> : null}{lastIntegrationScan ? <small>Created {lastIntegrationScan.created}; refreshed {lastIntegrationScan.refreshed}; auto-resolved {lastIntegrationScan.auto_resolved || 0}.</small> : null}</article>
        <article><h4>Closed-record cleanup</h4><p>Deletes only old closed notification rows inside the operator's authorized source scope.</p><div className="platform-notifications__cleanup"><input type="number" min="7" max="3650" value={cleanupDays} onChange={(event) => setCleanupDays(event.target.value)} /><button type="button" className="app-button app-button--danger" disabled={!cleanupValid || cleanupMutation.isPending} onClick={() => window.confirm(`Delete authorized closed notifications older than ${cleanupDaysNumber} days?`) && cleanupMutation.mutate()}>{cleanupMutation.isPending ? 'Cleaning…' : 'Clean closed records'}</button></div>{lastCleanup ? <small>Deleted {lastCleanup.deleted_count} record(s).</small> : null}</article>
      </div>
    </section> : null}

    {canWrite ? <section className="io-workspace-panel platform-notifications__section">
      <OperationalSectionHeader iconPath="/platform/notifications" title="Bulk workflow" description="Bulk status transitions are capped at 100 rows and execute transactionally. A forbidden source row aborts the entire mutation rather than partially changing hidden evidence." />
      <div className="platform-notifications__bulk-row">
        <span>{selectedIds.length} selected</span>
        <select value={bulkAction} onChange={(event) => setBulkAction(event.target.value as NotificationAction)}><option value="acknowledge">Acknowledge</option><option value="resolve">Resolve</option><option value="dismiss">Dismiss</option><option value="reopen">Reopen</option></select>
        <button type="button" className="app-button app-button--primary" disabled={!selectedIds.length || selectedIds.length > 100 || bulkMutation.isPending} onClick={() => window.confirm(`${actionLabel(bulkAction)} ${selectedIds.length} selected notification(s)?`) && bulkMutation.mutate()}>{actionLabel(bulkAction)} selected</button>
        <button type="button" className="app-button app-button--secondary" onClick={() => setSelectedIds(selectedVisible.length === notifications.length ? [] : notifications.map((row) => row.id))}>{selectedVisible.length === notifications.length && notifications.length ? 'Clear visible selection' : 'Select visible page'}</button>
      </div>
      {bulkMutation.isError ? <div className="platform-notifications__inline-error">{readableError(bulkMutation.error)}</div> : null}
      <div className="platform-notifications__bulk-routing">
        <strong>Bulk integration routing</strong>
        <span>Applies only to selected open/acknowledged Integration Monitoring notifications ({selectedIntegrationNotifications.length} eligible).</span>
        <div className="platform-notifications__bulk-routing-fields">
          <input placeholder="Owner email" value={bulkRoutingForm.ownerEmail} onChange={(event) => setBulkRoutingForm((current) => ({ ...current, ownerEmail: event.target.value }))} />
          <input placeholder="Escalation URL" value={bulkRoutingForm.escalationUrl} onChange={(event) => setBulkRoutingForm((current) => ({ ...current, escalationUrl: event.target.value }))} />
          <input type="datetime-local" value={bulkRoutingForm.responseDueAt} onChange={(event) => setBulkRoutingForm((current) => ({ ...current, responseDueAt: event.target.value }))} />
          <input placeholder="Routing note" value={bulkRoutingForm.note} onChange={(event) => setBulkRoutingForm((current) => ({ ...current, note: event.target.value }))} />
          <button type="button" className="app-button app-button--secondary" disabled={!bulkRoutingValid || bulkRoutingMutation.isPending} onClick={() => window.confirm(`Assign routing to ${selectedIntegrationNotifications.length} selected integration notification(s)?`) && bulkRoutingMutation.mutate()}>{bulkRoutingMutation.isPending ? 'Assigning…' : 'Assign routing to selected'}</button>
        </div>
        {!bulkRoutingUrlValid ? <small>Escalation URL must use http or https.</small> : null}
        {lastBulkRouting ? <small>Last bulk assignment updated {lastBulkRouting.updated_count} notification(s).</small> : null}
        {bulkRoutingMutation.isError ? <div className="platform-notifications__inline-error">{readableError(bulkRoutingMutation.error)}</div> : null}
      </div>
    </section> : null}

    <section className="io-workspace-panel platform-notifications__section">
      <OperationalSectionHeader iconPath="/platform/notifications" title="Authorized notification evidence" description="A notification is application workflow evidence only. Open/acknowledged does not prove an external incident exists, resolved does not prove the external condition is fixed, and delivery/reading by a person is not tracked here." />
      {notifications.length ? <div className="platform-notifications__list">{notifications.map((row) => {
        const routing = routingFormFor(row);
        return <article key={row.id} className="platform-notifications__item" data-severity={row.severity}>
          <div className="platform-notifications__item-head">
            <div className="platform-notifications__title-row">{canWrite ? <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => setSelectedIds((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} /> : null}<strong>{row.title}</strong></div>
            <div className="platform-notifications__chips"><span>{pretty(row.severity)}</span><span>{pretty(row.status)}</span><span>{row.source}</span><span>{row.tenant_name || (row.tenant_id ? 'Tenant identity restricted' : 'Global')}</span></div>
          </div>
          <p>{row.message}</p>
          <div className="platform-notifications__meta"><span>Created {new Date(row.created_at).toLocaleString()}</span>{row.acknowledged_by_present ? <span>Acknowledged by {row.acknowledged_by_email || 'Restricted Platform user'}</span> : null}{row.resolved_by_present ? <span>Resolved by {row.resolved_by_email || 'Restricted Platform user'}</span> : null}{row.dismissed_by_present ? <span>Dismissed by {row.dismissed_by_email || 'Restricted Platform user'}</span> : null}</div>
          <div className="platform-notifications__links">{canReadAudit ? <Link to={`/platform/audit?target_type=platform_notifications&target_id=${encodeURIComponent(row.id)}`}>Audit evidence</Link> : null}{canReadTenants && row.tenant_id ? <Link to={`/platform/tenants?tenant_id=${encodeURIComponent(row.tenant_id)}`}>Tenant</Link> : null}{row.source === 'integration_monitoring.scan' && canReadDependencies ? <Link to="/platform/integration-monitoring">Integration monitoring</Link> : null}{row.source.startsWith('operational_') && canReadJobs ? <Link to="/platform/operational-jobs">Operational jobs</Link> : null}</div>
          {row.source === 'integration_monitoring.scan' && row.metadata ? <div className="platform-notifications__routing-evidence"><strong>Integration routing</strong><span>State: {metadataText(row.metadata.routing_state)} · risk: {metadataText(row.metadata.risk_key)} · response due: {row.metadata.routing_response_due_at ? new Date(String(row.metadata.routing_response_due_at)).toLocaleString() : 'Not recorded'}</span></div> : null}
          {canWrite && row.source === 'integration_monitoring.scan' && ['open', 'acknowledged'].includes(row.status) ? <div className="platform-notifications__routing-form"><input placeholder="Owner email" value={routing.ownerEmail} onChange={(event) => updateRouting(row.id, 'ownerEmail', event.target.value)} /><input placeholder="Escalation URL" value={routing.escalationUrl} onChange={(event) => updateRouting(row.id, 'escalationUrl', event.target.value)} /><input type="datetime-local" value={routing.responseDueAt} onChange={(event) => updateRouting(row.id, 'responseDueAt', event.target.value)} /><input placeholder="Routing note" value={routing.note} onChange={(event) => updateRouting(row.id, 'note', event.target.value)} /><button type="button" className="app-button app-button--secondary" disabled={routingMutation.isPending || (!routing.ownerEmail.trim() && !routing.escalationUrl.trim())} onClick={() => routingMutation.mutate({ id: row.id, form: routing })}>Assign routing</button></div> : null}
          {canWrite ? <div className="platform-notifications__row-actions">{actionsForStatus(row.status).map((action) => <button type="button" className="app-button app-button--secondary" key={action} disabled={markMutation.isPending} onClick={() => window.confirm(`${actionLabel(action)} notification “${row.title}”?`) && markMutation.mutate({ id: row.id, action })}>{actionLabel(action)}</button>)}</div> : null}
        </article>;
      })}</div> : notificationsQuery.isLoading ? <div className="platform-notifications__empty">Loading notifications…</div> : <div className="platform-notifications__empty">No authorized notifications match the current filters.</div>}

      {data?.pagination ? <div className="platform-notifications__pagination"><span>Showing {data.pagination.total ? data.pagination.offset + 1 : 0}–{Math.min(data.pagination.offset + data.notifications.length, data.pagination.total)} of {data.pagination.total}</span><div><button type="button" className="app-button app-button--secondary" disabled={data.pagination.offset === 0} onClick={() => updateFilters({ offset: Math.max(0, data.pagination.offset - data.pagination.limit) })}>Previous</button><button type="button" className="app-button app-button--secondary" disabled={!data.pagination.has_more} onClick={() => updateFilters({ offset: data.pagination.offset + data.pagination.limit })}>Next</button></div></div> : null}
    </section>

    <section className="io-workspace-panel platform-notifications__section">
      <OperationalSectionHeader iconPath="/platform/notifications" title="Supporting operations" description="Only destinations allowed by the current Platform permission snapshot are shown." />
      <div className="platform-notifications__links">{canReadAudit ? <Link to="/platform/audit">Platform audit</Link> : null}{canReadDependencies ? <Link to="/platform/integration-monitoring">Integration monitoring</Link> : null}{canReadSupport && canReadTenants ? <Link to="/platform/support-sessions">Support sessions</Link> : null}{canReadBilling && canReadTenants ? <Link to="/platform/billing">Billing</Link> : null}{canReadTenants ? <Link to="/platform/tenant-health">Tenant health</Link> : null}{canReadJobs ? <Link to="/platform/operational-jobs">Operational jobs</Link> : null}</div>
    </section>
  </div>;
}
