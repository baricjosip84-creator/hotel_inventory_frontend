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
};

type ScanResult = {
  scanned_at: string;
  tenants_checked: number;
  notifications_touched: number;
  created: number;
  refreshed: number;
};

type NotificationSummary = {
  by_status: Array<{ status: NotificationStatus; count: number }>;
  active_by_severity: Array<{ severity: string; count: number }>;
  oldest_open_at: string | null;
};

type CleanupResult = { deleted_count: number; older_than_days: number };
type BulkResult = { updated_count: number };

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
  const [lastCleanup, setLastCleanup] = useState<CleanupResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<NotificationAction>('acknowledge');
  const [cleanupDays, setCleanupDays] = useState('90');
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_NOTIFICATIONS_WRITE);

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
    mutationFn: () => platformApiRequest('/platform/notifications', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: async () => {
      setForm({ severity: 'info', title: '', message: '' });
      await invalidateNotifications(qc);
    }
  });

  const mark = useMutation({
    mutationFn: ({ id, action }: { id: string; action: NotificationAction }) => platformApiRequest(`/platform/notifications/${id}/${action}`, { method: 'POST' }),
    onSuccess: async () => invalidateNotifications(qc)
  });

  const bulk = useMutation({
    mutationFn: () => platformApiRequest<BulkResult>('/platform/notifications/bulk', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: selectedIds, action: bulkAction })
    }),
    onSuccess: async () => {
      setSelectedIds([]);
      await invalidateNotifications(qc);
    }
  });

  const scan = useMutation({
    mutationFn: () => platformApiRequest<ScanResult>('/platform/notifications/system-scan', { method: 'POST' }),
    onSuccess: async (data) => {
      setLastScan(data);
      await invalidateNotifications(qc);
      await qc.invalidateQueries({ queryKey: ['platform', 'dashboard'] });
    }
  });

  const cleanup = useMutation({
    mutationFn: () => platformApiRequest<CleanupResult>('/platform/notifications/cleanup-closed', {
      method: 'POST',
      body: JSON.stringify({ older_than_days: Number(cleanupDays) || 90 })
    }),
    onSuccess: async (data) => {
      setLastCleanup(data);
      await invalidateNotifications(qc);
    }
  });

  const notifications = q.data || [];
  const allVisibleSelected = notifications.length > 0 && notifications.every((n) => selectedIds.includes(n.id));
  const availableSources = useMemo(() => Array.from(new Set(notifications.map((n) => n.source).filter(Boolean))).sort(), [notifications]);

  function toggleSelected(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !notifications.some((n) => n.id === id)));
    } else {
      setSelectedIds((current) => Array.from(new Set([...current, ...notifications.map((n) => n.id)])));
    }
  }

  return <div style={styles.page}>
    <header>
      <h1 style={styles.title}>Platform notifications</h1>
      <p style={styles.muted}>Manual and operational platform alerts for HLA staff.</p>
    </header>

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
        <button style={styles.button} onClick={() => create.mutate()} disabled={create.isPending}>Create</button>
      </div>
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
    </section> : null}

    {canWrite ? <section style={styles.panel}>
      <h2>Operational scan</h2>
      <p style={styles.muted}>Creates or refreshes platform notifications for past-due tenants, suspended/offboarding tenants, active support sessions, inactive tenants, and tenants close to configured limits.</p>
      <button style={styles.button} onClick={() => scan.mutate()} disabled={scan.isPending}>Run operational scan</button>
      {lastScan ? <div style={styles.scanResult}>Checked {lastScan.tenants_checked} tenants. Created {lastScan.created}, refreshed {lastScan.refreshed}.</div> : null}
      {scan.error ? <div style={styles.error}>{readableError(scan.error)}</div> : null}
    </section> : null}

    {canWrite ? <section style={styles.panel}>
      <h2>Closed notification cleanup</h2>
      <p style={styles.muted}>Deletes old resolved/dismissed notifications. Open and acknowledged notifications are never cleaned by this action.</p>
      <div style={styles.form}>
        <input style={styles.input} type="number" min="7" max="3650" value={cleanupDays} onChange={(e) => setCleanupDays(e.target.value)} />
        <button style={styles.button} onClick={() => cleanup.mutate()} disabled={cleanup.isPending}>Clean closed notifications</button>
      </div>
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
        <button style={styles.button} onClick={() => bulk.mutate()} disabled={bulk.isPending || selectedIds.length === 0}>{actionLabel(bulkAction)} selected ({selectedIds.length})</button>
      </div>
      {bulk.error ? <div style={styles.error}>{readableError(bulk.error)}</div> : null}
    </section> : null}

    <section style={styles.panel}>
      <h2>Notifications</h2>
      {q.isLoading ? 'Loading…' : null}
      {q.error ? <div style={styles.error}>{readableError(q.error)}</div> : null}
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
        {canWrite ? <div style={styles.actions}>{actionsForStatus(n.status).map((action) => <button key={action} style={styles.button} onClick={() => mark.mutate({ id: n.id, action })}>{actionLabel(action)}</button>)}</div> : null}
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
  title: { margin: 0 },
  muted: { color: '#6b7280' },
  panel: { background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 12px 36px rgba(15,23,42,.08)' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 },
  summaryCard: { background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 12px 36px rgba(15,23,42,.08)', display: 'flex', justifyContent: 'space-between', gap: 12 },
  notice: { background: '#fef3c7', color: '#92400e', borderRadius: 12, padding: 12 },
  form: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 },
  input: { padding: 10, border: '1px solid #d1d5db', borderRadius: 10 },
  button: { padding: '8px 10px', borderRadius: 10, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff' },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  item: { borderBottom: '1px solid #eee', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 },
  itemHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  message: { margin: 0 },
  scanResult: { marginTop: 10, color: '#166534' },
  empty: { color: '#6b7280', padding: '10px 0' },
  error: { marginTop: 10, background: '#fee2e2', color: '#991b1b', borderRadius: 12, padding: 12 }
};
