import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type NotificationStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
type NotificationAction = 'acknowledge' | 'resolve' | 'dismiss' | 'reopen';

type Notification = {
  id: string;
  severity: string;
  title: string;
  message: string;
  tenant_name?: string | null;
  source?: string;
  status: NotificationStatus;
  created_at: string;
  acknowledged_by_email?: string | null;
  resolved_by_email?: string | null;
  dismissed_by_email?: string | null;
  metadata?: {
    routing_state?: string | null;
    routing_reason?: string | null;
    routing_owner_email?: string | null;
    routing_escalation_url_present?: boolean | null;
    routing_escalated_reason?: string | null;
    routing_previous_escalated_reason?: string | null;
    routing_escalation_resolved_at?: string | null;
    routing_required_action?: string | null;
    routing_response_due_at?: string | null;
    routing_response_escalated_reason?: string | null;
    routing_response_escalated_at?: string | null;
    routing_response_previous_severity?: string | null;
    integration_escalation_closed_at?: string | null;
    integration_escalation_closed_action?: string | null;
    closed_sla_escalated_reason?: string | null;
    closed_routing_escalated_reason?: string | null;
    risk_key?: string | null;
    integration_type?: string | null;
  } | null;
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
  routed_response_escalation_audit_events?: number;
};

type NotificationSummary = {
  by_status: Array<{ status: NotificationStatus; count: number }>;
  active_by_severity: Array<{ severity: string; count: number }>;
  oldest_open_at: string | null;
};

type CleanupResult = { deleted_count: number; older_than_days: number };
type BulkResult = { updated_count: number };
type BulkRoutingResult = { updated_count: number };
type RoutingForm = { ownerEmail: string; escalationUrl: string; responseDueAt: string; note: string };

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function countFor(summary: NotificationSummary | undefined, status: NotificationStatus): number {
  return summary?.by_status.find((row) => row.status === status)?.count || 0;
}

function actionLabel(action: NotificationAction): string {
  const labels: Record<NotificationAction, string> = {
    acknowledge: 'Acknowledge',
    resolve: 'Resolve',
    dismiss: 'Dismiss',
    reopen: 'Reopen'
  };
  return labels[action];
}

export default function PlatformNotificationsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ severity: 'info', title: '', message: '' });
  const [filters, setFilters] = useState({ status: '', severity: '', source: '' });
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [lastIntegrationScan, setLastIntegrationScan] = useState<ScanResult | null>(null);
  const [lastCleanup, setLastCleanup] = useState<CleanupResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<NotificationAction>('acknowledge');
  const [cleanupDays, setCleanupDays] = useState('90');
  const [routingForms, setRoutingForms] = useState<Record<string, RoutingForm>>({});
  const [bulkRoutingForm, setBulkRoutingForm] = useState<RoutingForm>({ ownerEmail: '', escalationUrl: '', responseDueAt: '', note: '' });
  const [lastBulkRouting, setLastBulkRouting] = useState<BulkRoutingResult | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_WRITE);
  const trimmedTitle = form.title.trim();
  const trimmedMessage = form.message.trim();
  const parsedCleanupDays = Number(cleanupDays);
  const cleanupDaysValid = Number.isInteger(parsedCleanupDays) && parsedCleanupDays >= 7 && parsedCleanupDays <= 3650;
  const refreshAll = () => {
    setStatusMessage('Refreshing notification snapshot…');
    void invalidateNotifications(qc).then(() => setStatusMessage('Notification snapshot refreshed.'));
  };

  const queryString = new URLSearchParams({ limit: '300' });
  if (filters.status) queryString.set('status', filters.status);
  if (filters.severity) queryString.set('severity', filters.severity);
  if (filters.source.trim()) queryString.set('source', filters.source.trim());

  const q = useQuery({
    queryKey: ['platform', 'notifications', filters],
    queryFn: () => platformApiRequest<Notification[]>(`/platform/notifications?${queryString.toString()}`)
  });

  const summary = useQuery({
    queryKey: ['platform', 'notifications', 'summary'],
    queryFn: () => platformApiRequest<NotificationSummary>('/platform/notifications/summary')
  });

  const create = useMutation({
    mutationFn: () => platformApiRequest('/platform/notifications', { method: 'POST', body: JSON.stringify({ severity: form.severity, title: trimmedTitle, message: trimmedMessage }) }),
    onSuccess: async () => {
      setForm({ severity: 'info', title: '', message: '' });
      setStatusMessage('Notification created.');
      await invalidateNotifications(qc);
    }
  });

  const mark = useMutation({
    mutationFn: ({ id, action }: { id: string; action: NotificationAction }) => platformApiRequest(`/platform/notifications/${id}/${action}`, { method: 'POST' }),
    onSuccess: async (_data, variables) => {
      setStatusMessage(`Notification ${actionLabel(variables.action).toLowerCase()} action completed.`);
      await invalidateNotifications(qc);
    }
  });

  const assignRouting = useMutation({
    mutationFn: ({ id, values }: { id: string; values: RoutingForm }) => platformApiRequest(`/platform/notifications/${id}/assign-integration-routing`, {
      method: 'POST',
      body: JSON.stringify({
        owner_email: values.ownerEmail.trim() || undefined,
        escalation_url: values.escalationUrl.trim() || undefined,
        response_due_at: values.responseDueAt || undefined,
        note: values.note.trim() || undefined
      })
    }),
    onSuccess: async (_data, variables) => {
      setRoutingForms((current) => {
        const next = { ...current };
        delete next[variables.id];
        return next;
      });
      setStatusMessage('Integration routing assigned.');
      await invalidateNotifications(qc);
    }
  });


  const bulkAssignRouting = useMutation({
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
    onSuccess: async (data) => {
      setLastBulkRouting(data);
      setBulkRoutingForm({ ownerEmail: '', escalationUrl: '', responseDueAt: '', note: '' });
      setSelectedIds([]);
      setStatusMessage(`Bulk integration routing updated ${data.updated_count} notification(s).`);
      await invalidateNotifications(qc);
    }
  });

  const bulk = useMutation({
    mutationFn: () => platformApiRequest<BulkResult>('/platform/notifications/bulk', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: selectedIds, action: bulkAction })
    }),
    onSuccess: async (data) => {
      setSelectedIds([]);
      setStatusMessage(`Bulk ${actionLabel(bulkAction).toLowerCase()} updated ${data.updated_count} notification(s).`);
      await invalidateNotifications(qc);
    }
  });

  const scan = useMutation({
    mutationFn: () => platformApiRequest<ScanResult>('/platform/notifications/system-scan', { method: 'POST' }),
    onSuccess: async (data) => {
      setLastScan(data);
      setStatusMessage(`Operational scan complete: ${data.created} created, ${data.refreshed} refreshed.`);
      await invalidateNotifications(qc);
      await qc.invalidateQueries({ queryKey: ['platform', 'dashboard'] });
    }
  });

  const integrationScan = useMutation({
    mutationFn: () => platformApiRequest<ScanResult>('/platform/notifications/integration-monitoring-scan', { method: 'POST' }),
    onSuccess: async (data) => {
      setLastIntegrationScan(data);
      setStatusMessage(`Integration monitoring scan complete: ${data.created} created, ${data.refreshed} refreshed, ${data.auto_resolved || 0} auto-resolved.`);
      await invalidateNotifications(qc);
      await qc.invalidateQueries({ queryKey: ['platform', 'integration-monitoring'] });
    }
  });

  const cleanup = useMutation({
    mutationFn: () => platformApiRequest<CleanupResult>('/platform/notifications/cleanup-closed', {
      method: 'POST',
      body: JSON.stringify({ older_than_days: parsedCleanupDays })
    }),
    onSuccess: async (data) => {
      setLastCleanup(data);
      setStatusMessage(`Closed notification cleanup deleted ${data.deleted_count} record(s).`);
      await invalidateNotifications(qc);
    }
  });

  const notifications = useMemo(() => q.data ?? [], [q.data]);
  const allVisibleSelected = notifications.length > 0 && notifications.every((n) => selectedIds.includes(n.id));
  const selectedIntegrationNotifications = notifications.filter((n) => selectedIds.includes(n.id) && n.source === 'integration_monitoring.scan' && ['open', 'acknowledged'].includes(n.status));
  const availableSources = useMemo(() => Array.from(new Set(notifications.map((n) => n.source).filter(Boolean))).sort(), [notifications]);
  const selectedLimitExceeded = selectedIds.length > 100;
  const invalidBulkRouting = selectedIntegrationNotifications.length === 0 || selectedIntegrationNotifications.length > 100 || (!bulkRoutingForm.ownerEmail.trim() && !bulkRoutingForm.escalationUrl.trim());

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function routingFormFor(notification: Notification): RoutingForm {
    return routingForms[notification.id] || {
      ownerEmail: notification.metadata?.routing_owner_email || '',
      escalationUrl: '',
      responseDueAt: '',
      note: ''
    };
  }

  function setRoutingFormValue(id: string, key: keyof RoutingForm, value: string) {
    setRoutingForms((current) => ({
      ...current,
      [id]: { ...(current[id] || { ownerEmail: '', escalationUrl: '', responseDueAt: '', note: '' }), [key]: value }
    }));
  }

  function isValidHttpUrl(value: string) {
    if (!value.trim()) return true;
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  function routingHasTarget(values: RoutingForm) {
    return Boolean(values.ownerEmail.trim() || values.escalationUrl.trim());
  }

  function confirmAction(message: string) {
    return window.confirm(message);
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !notifications.some((n) => n.id === id)));
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...notifications.map((n) => n.id)])));
    }
  }

  return <div style={styles.page}>
    <header style={styles.header}>
      <div>
        <h1 style={styles.title}>Platform notifications</h1>
        <p style={styles.muted}>Manual and operational platform alerts for HLA staff.</p>
      </div>
      <button style={styles.button} onClick={refreshAll} disabled={q.isFetching || summary.isFetching}>Refresh</button>
    </header>

    <section style={styles.metaPanel}>
      <span><b>Snapshot source:</b> GET /platform/notifications and /platform/notifications/summary</span>
      <span><b>Filters:</b> status {filters.status || 'any'} · severity {filters.severity || 'any'} · source {filters.source.trim() || 'any'}</span>
      <span><b>Rows loaded:</b> {notifications.length} / 300</span>
      <span><b>Last refreshed:</b> {new Date().toLocaleString()}</span>
    </section>

    <nav style={styles.linkBar} aria-label="Supporting platform pages">
      <a href="/platform/system-audit">System audit</a>
      <a href="/platform/integration-monitoring">Integration monitoring</a>
      <a href="/platform/support-sessions">Support sessions</a>
      <a href="/platform/billing">Billing</a>
      <a href="/platform/tenant-health">Tenant health</a>
    </nav>

    {statusMessage ? <div style={styles.success}>{statusMessage}</div> : null}

    <section style={styles.summaryGrid}>
      <div style={styles.summaryCard}><b>Open</b><span>{countFor(summary.data, 'open')}</span></div>
      <div style={styles.summaryCard}><b>Acknowledged</b><span>{countFor(summary.data, 'acknowledged')}</span></div>
      <div style={styles.summaryCard}><b>Resolved</b><span>{countFor(summary.data, 'resolved')}</span></div>
      <div style={styles.summaryCard}><b>Dismissed</b><span>{countFor(summary.data, 'dismissed')}</span></div>
    </section>

    {summary.data?.oldest_open_at ? <div style={styles.notice}>Oldest open notification: {new Date(summary.data.oldest_open_at).toLocaleString()}</div> : null}

    {canWrite ? <section style={styles.panel}>
      <h2>Create notification</h2>
      <div style={styles.form}>
        <select style={styles.input} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}><option>info</option><option>warning</option><option>critical</option></select>
        <input style={styles.input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input style={styles.input} placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <button style={styles.button} onClick={() => create.mutate()} disabled={create.isPending || !trimmedTitle || !trimmedMessage}>Create</button>
      </div>
      {(!trimmedTitle || !trimmedMessage) ? <div style={styles.notice}>Title and message are required and cannot be whitespace only.</div> : null}
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
    </section> : null}

    {canWrite ? <section style={styles.panel}>
      <h2>Operational scan</h2>
      <p style={styles.muted}>Creates or refreshes platform notifications for past-due tenants, suspended/offboarding tenants, active support sessions, inactive tenants, and tenants close to configured limits.</p>
      <button style={styles.button} onClick={() => confirmAction('Run operational notification scan now?') && scan.mutate()} disabled={scan.isPending}>Run operational scan</button>
      {lastScan ? <div style={styles.scanResult}>Checked {lastScan.tenants_checked || 0} tenants. Created {lastScan.created}, refreshed {lastScan.refreshed}.</div> : null}
      {scan.error ? <div style={styles.error}>{readableError(scan.error)}</div> : null}
      <hr />
      <h3>Integration monitoring scan</h3>
      <p style={styles.muted}>Creates, refreshes, resolves, and escalates integration-monitoring notifications, including overdue routed-response assignments.</p>
      <button style={styles.button} onClick={() => confirmAction('Run integration monitoring notification scan now?') && integrationScan.mutate()} disabled={integrationScan.isPending}>Run integration monitoring scan</button>
      {lastIntegrationScan ? <div style={styles.scanResult}>Checked {lastIntegrationScan.integrations_checked || 0} integrations. Created {lastIntegrationScan.created}, refreshed {lastIntegrationScan.refreshed}, auto-resolved {lastIntegrationScan.auto_resolved || 0}, SLA escalated {lastIntegrationScan.sla_escalated || 0}, unrouted escalated {lastIntegrationScan.routing_escalated || 0}, overdue responses escalated {lastIntegrationScan.routed_response_escalated || 0}.</div> : null}
      {integrationScan.error ? <div style={styles.error}>{readableError(integrationScan.error)}</div> : null}
    </section> : null}

    {canWrite ? <section style={styles.panel}>
      <h2>Closed notification cleanup</h2>
      <p style={styles.muted}>Deletes old resolved/dismissed notifications. Open and acknowledged notifications are never cleaned by this action.</p>
      <div style={styles.form}>
        <input style={styles.input} type="number" min="7" max="3650" value={cleanupDays} onChange={(e) => setCleanupDays(e.target.value)} />
        <button style={styles.button} onClick={() => confirmAction(`Delete closed notifications older than ${parsedCleanupDays} days?`) && cleanup.mutate()} disabled={cleanup.isPending || !cleanupDaysValid}>Clean closed notifications</button>
      </div>
      {!cleanupDaysValid ? <div style={styles.notice}>Cleanup age must be a whole number between 7 and 3650 days.</div> : null}
      {lastCleanup ? <div style={styles.scanResult}>Deleted {lastCleanup.deleted_count} closed notifications older than {lastCleanup.older_than_days} days.</div> : null}
      {cleanup.error ? <div style={styles.error}>{readableError(cleanup.error)}</div> : null}
    </section> : null}

    <section style={styles.panel}>
      <h2>Filters</h2>
      <div style={styles.form}>
        <select style={styles.input} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Any status</option><option>open</option><option>acknowledged</option><option>resolved</option><option>dismissed</option></select>
        <select style={styles.input} value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}><option value="">Any severity</option><option>info</option><option>warning</option><option>critical</option></select>
        <input style={styles.input} list="notification-sources" placeholder="Source" value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })} />
        <datalist id="notification-sources">{availableSources.map((source) => <option key={source} value={source} />)}</datalist>
      </div>
    </section>

    {canWrite ? <section style={styles.panel}>
      <h2>Bulk actions</h2>
      <div style={styles.form}>
        <button style={styles.button} onClick={toggleAllVisible}>{allVisibleSelected ? 'Clear visible selection' : 'Select visible notifications'}</button>
        <select style={styles.input} value={bulkAction} onChange={(e) => setBulkAction(e.target.value as NotificationAction)}><option value="acknowledge">Acknowledge</option><option value="resolve">Resolve</option><option value="dismiss">Dismiss</option><option value="reopen">Reopen</option></select>
        <button style={styles.button} onClick={() => confirmAction(`${actionLabel(bulkAction)} ${selectedIds.length} selected notification(s)?`) && bulk.mutate()} disabled={bulk.isPending || selectedIds.length === 0 || selectedLimitExceeded}>{actionLabel(bulkAction)} selected ({selectedIds.length})</button>
      </div>
      {selectedLimitExceeded ? <div style={styles.notice}>Bulk actions are limited to 100 selected notifications.</div> : null}
      {bulk.error ? <div style={styles.error}>{readableError(bulk.error)}</div> : null}
      <div style={styles.routingBox}>
        <b>Bulk assign integration routing</b>
        <p style={styles.muted}>Applies owner/escalation routing only to selected active integration-monitoring notifications.</p>
        <div style={styles.form}>
          <input style={styles.input} placeholder="Owner email" value={bulkRoutingForm.ownerEmail} onChange={(e) => setBulkRoutingForm({ ...bulkRoutingForm, ownerEmail: e.target.value })} />
          <input style={styles.input} placeholder="Escalation URL" value={bulkRoutingForm.escalationUrl} onChange={(e) => setBulkRoutingForm({ ...bulkRoutingForm, escalationUrl: e.target.value })} />
          <input style={styles.input} type="datetime-local" aria-label="Routing response due at" value={bulkRoutingForm.responseDueAt} onChange={(e) => setBulkRoutingForm({ ...bulkRoutingForm, responseDueAt: e.target.value })} />
          <input style={styles.input} placeholder="Routing note" value={bulkRoutingForm.note} onChange={(e) => setBulkRoutingForm({ ...bulkRoutingForm, note: e.target.value })} />
          <button style={styles.button} onClick={() => confirmAction(`Assign routing to ${selectedIntegrationNotifications.length} selected integration notification(s)?`) && bulkAssignRouting.mutate()} disabled={bulkAssignRouting.isPending || invalidBulkRouting || !isValidHttpUrl(bulkRoutingForm.escalationUrl)}>Assign routing to selected integration notifications ({selectedIntegrationNotifications.length})</button>
        </div>
        {bulkRoutingForm.escalationUrl.trim() && !isValidHttpUrl(bulkRoutingForm.escalationUrl) ? <div style={styles.notice}>Escalation URL must start with http:// or https://.</div> : null}
        {lastBulkRouting ? <div style={styles.scanResult}>Bulk routing updated {lastBulkRouting.updated_count} integration notifications.</div> : null}
      </div>
      {bulkAssignRouting.error ? <div style={styles.error}>{readableError(bulkAssignRouting.error)}</div> : null}
      {assignRouting.error ? <div style={styles.error}>{readableError(assignRouting.error)}</div> : null}
    </section> : null}

    <section style={styles.panel}>
      <h2>Notifications</h2>
      {q.isLoading ? 'Loading…' : null}
      {q.error ? <div style={styles.error}>{readableError(q.error)} <button style={styles.button} onClick={() => q.refetch()}>Retry</button></div> : null}
      {notifications.map((n) => <div key={n.id} style={styles.item}>
        <div style={styles.itemHeader}>
          {canWrite ? <input type="checkbox" checked={selectedIds.includes(n.id)} onChange={() => toggleSelected(n.id)} /> : null}
          <b>{n.title}</b>
        </div>
        <span>{n.severity} / {n.status} / {n.tenant_name || 'global'} / {n.source || 'unknown source'}</span>
        <span>{new Date(n.created_at).toLocaleString()}</span>
        <p style={styles.message}>{n.message}</p>
        {n.acknowledged_by_email ? <span>Acknowledged by {n.acknowledged_by_email}</span> : null}
        {n.resolved_by_email ? <span>Resolved by {n.resolved_by_email}</span> : null}
        {n.dismissed_by_email ? <span>Dismissed by {n.dismissed_by_email}</span> : null}
        <div style={styles.evidenceLinks}>
          <a href={`/platform/system-audit?search=${encodeURIComponent(n.id)}`}>Audit evidence</a>
          {n.tenant_name ? <a href={`/platform/tenants?search=${encodeURIComponent(n.tenant_name)}`}>Tenant evidence</a> : null}
          {n.source === 'integration_monitoring.scan' ? <a href="/platform/integration-monitoring">Integration source</a> : null}
        </div>
        {n.source === 'integration_monitoring.scan' && n.metadata ? <div style={styles.routingMeta}>
          Routing: {n.metadata.routing_state || 'unknown'} · reason: {n.metadata.routing_reason || 'none'} · risk: {n.metadata.risk_key || 'none'}
          {n.metadata.routing_escalated_reason ? ` · escalated: ${n.metadata.routing_escalated_reason}` : ''}
          {n.metadata.routing_required_action ? ` · required action: ${n.metadata.routing_required_action}` : ''}
          {n.metadata.routing_response_due_at ? ` · response due: ${new Date(n.metadata.routing_response_due_at).toLocaleString()}` : ''}
          {n.metadata.routing_response_escalated_reason ? ` · response overdue escalated: ${n.metadata.routing_response_escalated_reason}` : ''}
          {n.metadata.routing_response_escalated_at ? ` at ${new Date(n.metadata.routing_response_escalated_at).toLocaleString()}` : ''}
          {n.metadata.routing_response_previous_severity ? ` · previous severity: ${n.metadata.routing_response_previous_severity}` : ''}
          {n.metadata.routing_previous_escalated_reason ? ` · escalation resolved: ${n.metadata.routing_previous_escalated_reason}` : ''}
          {n.metadata.routing_escalation_resolved_at ? ` at ${new Date(n.metadata.routing_escalation_resolved_at).toLocaleString()}` : ''}
          {n.metadata.integration_escalation_closed_at ? ` · closed by ${n.metadata.integration_escalation_closed_action || 'status action'} at ${new Date(n.metadata.integration_escalation_closed_at).toLocaleString()}` : ''}
          {n.metadata.closed_sla_escalated_reason ? ` · SLA closed: ${n.metadata.closed_sla_escalated_reason}` : ''}
          {n.metadata.closed_routing_escalated_reason ? ` · routing closed: ${n.metadata.closed_routing_escalated_reason}` : ''}
        </div> : null}
        {canWrite && n.source === 'integration_monitoring.scan' && ['open', 'acknowledged'].includes(n.status) ? (
          <div style={styles.routingBox}>
            <b>Assign integration routing</b>
            <div style={styles.form}>
              <input style={styles.input} placeholder="Owner email" value={routingFormFor(n).ownerEmail} onChange={(e) => setRoutingFormValue(n.id, 'ownerEmail', e.target.value)} />
              <input style={styles.input} placeholder="Escalation URL" value={routingFormFor(n).escalationUrl} onChange={(e) => setRoutingFormValue(n.id, 'escalationUrl', e.target.value)} />
              <input style={styles.input} type="datetime-local" aria-label="Routing response due at" value={routingFormFor(n).responseDueAt} onChange={(e) => setRoutingFormValue(n.id, 'responseDueAt', e.target.value)} />
              <input style={styles.input} placeholder="Routing note" value={routingFormFor(n).note} onChange={(e) => setRoutingFormValue(n.id, 'note', e.target.value)} />
              <button style={styles.button} onClick={() => confirmAction('Assign routing to this integration notification?') && assignRouting.mutate({ id: n.id, values: routingFormFor(n) })} disabled={assignRouting.isPending || !routingHasTarget(routingFormFor(n)) || !isValidHttpUrl(routingFormFor(n).escalationUrl)}>Assign routing</button>
            </div>
          </div>
        ) : null}
        {canWrite ? <div style={styles.actions}>{actionsForStatus(n.status).map((action) => <button key={action} style={styles.button} onClick={() => confirmAction(`${actionLabel(action)} notification: ${n.title}?`) && mark.mutate({ id: n.id, action })}>{actionLabel(action)}</button>)}</div> : null}
      </div>)}
      {!q.isLoading && !notifications.length ? <div style={styles.empty}>No notifications match the current filters.</div> : null}
    </section>
  </div>;
}

async function invalidateNotifications(qc: ReturnType<typeof useQueryClient>) {
  await qc.invalidateQueries({ queryKey: ['platform', 'notifications'] });
}

function actionsForStatus(status: NotificationStatus): NotificationAction[] {
  if (status === 'open') return ['acknowledge', 'resolve', 'dismiss'];
  if (status === 'acknowledged') return ['resolve', 'dismiss', 'reopen'];
  return ['reopen'];
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  title: { margin: 0 },
  muted: { color: '#6b7280' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)' },
  metaPanel: { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 16, padding: 12, display: 'grid', gap: 6, color: '#475569' },
  linkBar: { display: 'flex', gap: 12, flexWrap: 'wrap', background: '#fff', borderRadius: 16, padding: 12, boxShadow: '0 12px 36px rgba(15,23,42,.08)' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 },
  summaryCard: { background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 12px 36px rgba(15,23,42,.08)', display: 'flex', justifyContent: 'space-between', gap: 12 },
  notice: { background: '#fef3c7', color: '#92400e', borderRadius: 12, padding: 12 },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 },
  input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 10 },
  button: { padding: '8px 10px', borderRadius: 10, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  item: { borderBottom: '1px solid #eee', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  routingMeta: { background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, color: '#475569' },
  routingBox: { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  message: { margin: 0 },
  scanResult: { marginTop: 10, color: '#166534' },
  empty: { color: '#6b7280', padding: '10px 0' },
  error: { marginTop: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12 },
  success: { background: '#dcfce7', color: '#166534', borderRadius: 12, padding: 12 },
  evidenceLinks: { display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 13 }
};
