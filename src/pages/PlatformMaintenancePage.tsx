import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type MaintenanceWindow = {
  id: string;
  title: string;
  message?: string | null;
  scope: 'platform' | 'tenant';
  tenant_id?: string | null;
  tenant_name?: string | null;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  lock_writes: boolean;
  created_by_email?: string | null;
  cancelled_by_email?: string | null;
  cancellation_reason?: string | null;
};

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function localDateTimeValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function PlatformMaintenancePage() {
  const qc = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_MAINTENANCE_WRITE);
  const [filters, setFilters] = useState({ status: '', scope: '', include_past: 'false' });
  const [form, setForm] = useState({
    title: '',
    message: '',
    scope: 'platform',
    tenant_id: '',
    starts_at: localDateTimeValue(new Date(Date.now() + 60 * 60 * 1000)),
    ends_at: localDateTimeValue(new Date(Date.now() + 2 * 60 * 60 * 1000)),
    lock_writes: false
  });
  const [cancelReasonById, setCancelReasonById] = useState<Record<string, string>>({});

  const query = new URLSearchParams({ limit: '200', include_past: filters.include_past });
  if (filters.status) query.set('status', filters.status);
  if (filters.scope) query.set('scope', filters.scope);

  const maintenance = useQuery({
    queryKey: ['platform', 'maintenance', filters],
    queryFn: () => platformApiRequest<MaintenanceWindow[]>(`/platform/maintenance?${query.toString()}`)
  });

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'for-maintenance'],
    queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants')
  });

  const create = useMutation({
    mutationFn: () => platformApiRequest<MaintenanceWindow>('/platform/maintenance', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        message: form.message || null,
        scope: form.scope,
        tenant_id: form.scope === 'tenant' ? form.tenant_id : null,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        lock_writes: form.lock_writes
      })
    }),
    onSuccess: async () => {
      setForm({ ...form, title: '', message: '' });
      await qc.invalidateQueries({ queryKey: ['platform', 'maintenance'] });
    }
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => platformApiRequest(`/platform/maintenance/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    onSuccess: async () => qc.invalidateQueries({ queryKey: ['platform', 'maintenance'] })
  });

  const windows = maintenance.data || [];
  const activeOrUpcoming = useMemo(() => windows.filter((w) => w.status !== 'completed' && w.status !== 'cancelled'), [windows]);

  return <div style={styles.page}>
    <header>
      <h1 style={styles.title}>Maintenance windows</h1>
      <p style={styles.muted}>Schedule platform-wide or tenant-specific maintenance that is visible inside tenant accounts.</p>
    </header>

    <section style={styles.summaryGrid}>
      <div style={styles.summaryCard}><b>Visible windows</b><span>{activeOrUpcoming.length}</span></div>
      <div style={styles.summaryCard}><b>Total listed</b><span>{windows.length}</span></div>
      <div style={styles.summaryCard}><b>Platform-wide</b><span>{windows.filter((w) => w.scope === 'platform').length}</span></div>
      <div style={styles.summaryCard}><b>Tenant-specific</b><span>{windows.filter((w) => w.scope === 'tenant').length}</span></div>
    </section>

    {canWrite ? <section style={styles.panel}>
      <h2>Create maintenance window</h2>
      <div style={styles.formGrid}>
        <input style={styles.input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select style={styles.input} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value, tenant_id: '' })}>
          <option value="platform">Platform-wide</option>
          <option value="tenant">Tenant-specific</option>
        </select>
        {form.scope === 'tenant' ? <select style={styles.input} value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}>
          <option value="">Select tenant</option>
          {(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
        </select> : null}
        <input style={styles.input} type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
        <input style={styles.input} type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
        <label style={styles.checkboxLabel}><input type="checkbox" checked={form.lock_writes} onChange={(e) => setForm({ ...form, lock_writes: e.target.checked })} /> Lock writes during window</label>
      </div>
      <textarea style={styles.textarea} placeholder="Message shown to tenant users" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      <button style={styles.button} onClick={() => create.mutate()} disabled={create.isPending || !form.title || (form.scope === 'tenant' && !form.tenant_id)}>Create window</button>
      {create.error ? <div style={styles.error}>{readableError(create.error)}</div> : null}
    </section> : null}

    <section style={styles.panel}>
      <h2>Filters</h2>
      <div style={styles.filters}>
        <select style={styles.input} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option><option value="scheduled">scheduled</option><option value="active">active</option><option value="completed">completed</option><option value="cancelled">cancelled</option>
        </select>
        <select style={styles.input} value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}>
          <option value="">All scopes</option><option value="platform">platform</option><option value="tenant">tenant</option>
        </select>
        <select style={styles.input} value={filters.include_past} onChange={(e) => setFilters({ ...filters, include_past: e.target.value })}>
          <option value="false">Upcoming/current only</option><option value="true">Include past</option>
        </select>
      </div>
    </section>

    {maintenance.error ? <div style={styles.error}>{readableError(maintenance.error)}</div> : null}

    <section style={styles.list}>
      {windows.map((window) => <article key={window.id} style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>{window.title}</h3>
            <p style={styles.muted}>{window.scope === 'platform' ? 'Platform-wide' : `Tenant: ${window.tenant_name || window.tenant_id}`}</p>
          </div>
          <span style={styles.badge}>{window.status}</span>
        </div>
        {window.message ? <p>{window.message}</p> : null}
        <p style={styles.muted}>Starts: {new Date(window.starts_at).toLocaleString()} · Ends: {new Date(window.ends_at).toLocaleString()}</p>
        <p style={styles.muted}>Lock writes: {window.lock_writes ? 'yes' : 'no'} · Created by: {window.created_by_email || '-'}</p>
        {window.status === 'cancelled' ? <p style={styles.muted}>Cancelled by: {window.cancelled_by_email || '-'} · Reason: {window.cancellation_reason || '-'}</p> : null}
        {canWrite && window.status !== 'cancelled' && window.status !== 'completed' ? <div style={styles.cancelRow}>
          <input style={styles.input} placeholder="Cancellation reason" value={cancelReasonById[window.id] || ''} onChange={(e) => setCancelReasonById({ ...cancelReasonById, [window.id]: e.target.value })} />
          <button style={styles.dangerButton} onClick={() => cancel.mutate({ id: window.id, reason: cancelReasonById[window.id] || '' })} disabled={cancel.isPending}>Cancel</button>
        </div> : null}
      </article>)}
      {!maintenance.isLoading && windows.length === 0 ? <div style={styles.empty}>No maintenance windows match the current filters.</div> : null}
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
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '10px', minHeight: '80px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '8px' },
  button: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#111827', color: '#fff', cursor: 'pointer', width: 'fit-content' },
  dangerButton: { padding: '10px 14px', border: 0, borderRadius: '10px', background: '#991b1b', color: '#fff', cursor: 'pointer' },
  error: { color: '#991b1b', background: '#fee2e2', borderRadius: '10px', padding: '10px' },
  list: { display: 'grid', gap: '12px' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px' },
  cardTitle: { margin: 0 },
  badge: { background: '#eef2ff', color: '#3730a3', padding: '4px 10px', borderRadius: '999px', height: 'fit-content' },
  cancelRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' },
  empty: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px' }
};
