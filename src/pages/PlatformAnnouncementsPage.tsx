import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type Announcement = {
  id: string;
  title: string;
  message: string;
  audience: 'tenant' | 'platform' | 'all';
  tenant_id?: string | null;
  tenant_name?: string | null;
  severity: 'info' | 'warning' | 'critical';
  status: 'draft' | 'published' | 'cancelled' | 'expired';
  starts_at: string;
  ends_at?: string | null;
  dismissible: boolean;
  created_by_email?: string | null;
  published_by_email?: string | null;
  cancelled_by_email?: string | null;
  cancellation_reason?: string | null;
  is_current?: boolean;
};

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function localDateTimeValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function PlatformAnnouncementsPage() {
  const qc = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_ANNOUNCEMENTS_WRITE);
  const [filters, setFilters] = useState({ status: '', audience: '', include_expired: 'false' });
  const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    title: '',
    message: '',
    audience: 'all',
    tenant_id: '',
    severity: 'info',
    status: 'published',
    starts_at: localDateTimeValue(new Date()),
    ends_at: '',
    dismissible: true
  });

  const query = new URLSearchParams({ limit: '200', include_expired: filters.include_expired });
  if (filters.status) query.set('status', filters.status);
  if (filters.audience) query.set('audience', filters.audience);

  const announcements = useQuery({
    queryKey: ['platform', 'announcements', filters],
    queryFn: () => platformApiRequest<Announcement[]>(`/platform/announcements?${query.toString()}`)
  });

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-announcements'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const create = useMutation({
    mutationFn: () => platformApiRequest<Announcement>('/platform/announcements', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        message: form.message,
        audience: form.audience,
        tenant_id: form.audience === 'tenant' ? form.tenant_id : null,
        severity: form.severity,
        status: form.status,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        dismissible: form.dismissible
      })
    }),
    onSuccess: async () => {
      setForm({ ...form, title: '', message: '' });
      await qc.invalidateQueries({ queryKey: ['platform', 'announcements'] });
    }
  });

  const publish = useMutation({
    mutationFn: (id: string) => platformApiRequest(`/platform/announcements/${id}/publish`, { method: 'POST' }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['platform', 'announcements'] })
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => platformApiRequest(`/platform/announcements/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['platform', 'announcements'] })
  });

  const rows = announcements.data || [];
  const currentCount = useMemo(() => rows.filter((row) => row.is_current).length, [rows]);

  return <div style={styles.page}>
    <header>
      <h1 style={styles.title}>Platform announcements</h1>
      <p style={styles.muted}>Publish non-maintenance messages to tenants or platform staff. Use maintenance windows only when there is an actual service window.</p>
    </header>

    <section style={styles.summaryGrid}>
      <div style={styles.summaryCard}><b>Current</b><span>{currentCount}</span></div>
      <div style={styles.summaryCard}><b>Total listed</b><span>{rows.length}</span></div>
      <div style={styles.summaryCard}><b>Critical</b><span>{rows.filter((row) => row.severity === 'critical').length}</span></div>
      <div style={styles.summaryCard}><b>Tenant-specific</b><span>{rows.filter((row) => row.audience === 'tenant').length}</span></div>
    </section>

    {canWrite ? <section style={styles.panel}>
      <h2>Create announcement</h2>
      <div style={styles.formGrid}>
        <input style={styles.input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select style={styles.input} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value, tenant_id: '' })}>
          <option value="all">All tenants and platform</option>
          <option value="tenant">One tenant</option>
          <option value="platform">Platform staff only</option>
        </select>
        {form.audience === 'tenant' ? <select style={styles.input} value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}>
          <option value="">Select tenant</option>
          {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select> : null}
        <select style={styles.input} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
          <option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option>
        </select>
        <select style={styles.input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="published">Publish now</option><option value="draft">Save as draft</option>
        </select>
        <input style={styles.input} type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
        <input style={styles.input} type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
        <label style={styles.checkboxLabel}><input type="checkbox" checked={form.dismissible} onChange={(e) => setForm({ ...form, dismissible: e.target.checked })} /> Dismissible</label>
      </div>
      <textarea style={styles.textarea} placeholder="Message shown to the selected audience" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <button style={styles.button} onClick={() => create.mutate()} disabled={create.isPending || !form.title || !form.message || (form.audience === 'tenant' && !form.tenant_id)}>Create announcement</button>
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
    </section> : null}

    <section style={styles.panel}>
      <h2>Filters</h2>
      <div style={styles.filters}>
        <select style={styles.input} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option><option value="draft">draft</option><option value="published">published</option><option value="cancelled">cancelled</option><option value="expired">expired</option>
        </select>
        <select style={styles.input} value={filters.audience} onChange={(e) => setFilters({ ...filters, audience: e.target.value })}>
          <option value="">All audiences</option><option value="tenant">tenant</option><option value="platform">platform</option><option value="all">all</option>
        </select>
        <select style={styles.input} value={filters.include_expired} onChange={(e) => setFilters({ ...filters, include_expired: e.target.value })}>
          <option value="false">Current/future only</option><option value="true">Include expired</option>
        </select>
      </div>
    </section>

    {announcements.error ? <div style={styles.error}>{readableError(announcements.error)}</div> : null}

    <section style={styles.list}>
      {rows.map((row) => <article key={row.id} style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>{row.title}</h3>
            <p style={styles.muted}>{row.audience === 'tenant' ? `Tenant: ${row.tenant_name || row.tenant_id}` : `Audience: ${row.audience}`}</p>
          </div>
          <div style={styles.badgeStack}><span style={styles.badge}>{row.status}</span><span style={styles.badge}>{row.severity}</span></div>
        </div>
        <p>{row.message}</p>
        <p style={styles.muted}>Starts: {new Date(row.starts_at).toLocaleString()} · Ends: {row.ends_at ? new Date(row.ends_at).toLocaleString() : 'no end'} · Dismissible: {row.dismissible ? 'yes' : 'no'}</p>
        <p style={styles.muted}>Created by: {row.created_by_email || '-'} · Published by: {row.published_by_email || '-'}</p>
        {row.status === 'cancelled' ? <p style={styles.muted}>Cancelled by: {row.cancelled_by_email || '-'} · Reason: {row.cancellation_reason || '-'}</p> : null}
        {canWrite && row.status === 'draft' ? <button style={styles.button} onClick={() => publish.mutate(row.id)} disabled={publish.isPending}>Publish</button> : null}
        {canWrite && row.status !== 'cancelled' ? <div style={styles.cancelRow}>
          <input style={styles.input} placeholder="Cancellation reason" value={cancelReasonById[row.id] || ''} onChange={(e) => setCancelReasonById({ ...cancelReasonById, [row.id]: e.target.value })} />
          <button style={styles.dangerButton} onClick={() => cancel.mutate({ id: row.id, reason: cancelReasonById[row.id] || '' })} disabled={cancel.isPending}>Cancel</button>
        </div> : null}
      </article>)}
      {!announcements.isLoading && rows.length === 0 ? <div style={styles.empty}>No announcements match the current filters.</div> : null}
    </section>
  </div>;
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'grid', gap: '20px' },
  title: { margin: 0, fontSize: '28px' },
  muted: { color: '#6b7280', margin: '4px 0' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' },
  summaryCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', display: 'flex', justifyContent: 'space-between' },
  panel: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', display: 'grid', gap: '12px' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' },
  filters: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px' },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', minHeight: '90px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px' },
  button: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#111827', color: '#fff', cursor: 'pointer', width: 'fit-content' },
  dangerButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#991b1b', color: '#fff', cursor: 'pointer' },
  error: { color: '#991b1b', background: '#fee2e2', borderRadius: '10px', padding: '10px' },
  list: { display: 'grid', gap: '12px' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px' },
  cardTitle: { margin: 0 },
  badgeStack: { display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' },
  badge: { background: '#eef2ff', color: '#3730a3', padding: '4px 10px', borderRadius: '999px', height: 'fit-content' },
  cancelRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px' }
};
