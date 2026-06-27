import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { platformApiRequest } from '../lib/platformApi';
import { hasPlatformPermission, PLATFORM_PERMISSIONS } from '../lib/platformPermissions';

type Tenant = { id: string; name: string };
type Webhook = {
  id: string;
  tenant_id: string;
  tenant_name?: string;
  name: string;
  url: string;
  description?: string | null;
  event_types: string[];
  secret_prefix: string;
  is_enabled: boolean;
  is_healthy: boolean;
  last_delivery_at?: string | null;
  last_delivery_status?: string | null;
  consecutive_failure_count: number;
  disabled_reason?: string | null;
  created_at: string;
};
type Delivery = { id: string; webhook_name?: string; tenant_name?: string; event_type: string; delivery_status: string; response_status?: number | null; error_message?: string | null; created_at: string; completed_at?: string | null };
type WebhooksResponse = { webhooks: Webhook[]; event_types: string[] };
type CreateWebhookResponse = { webhook: Webhook; secret: string; warning: string };
type DeliveriesResponse = { deliveries: Delivery[] };

const defaultForm = { tenant_id: '', name: '', url: '', description: '', event_types: [] as string[], is_enabled: true };

function badgeStyle(webhook: Webhook): CSSProperties {
  if (!webhook.is_enabled) return { ...styles.badge, background: '#f3f4f6', color: '#374151' };
  if (webhook.is_healthy) return { ...styles.badge, background: '#dcfce7', color: '#166534' };
  return { ...styles.badge, background: '#fee2e2', color: '#991b1b' };
}

export default function PlatformWebhooksPage() {
  const queryClient = useQueryClient();
  const canWrite = hasPlatformPermission(PLATFORM_PERMISSIONS.PLATFORM_WEBHOOKS_WRITE);
  const [filters, setFilters] = useState({ tenant_id: '', search: '', include_disabled: true });
  const [form, setForm] = useState(defaultForm);
  const [secret, setSecret] = useState<CreateWebhookResponse | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.tenant_id) params.set('tenant_id', filters.tenant_id);
    if (filters.search) params.set('search', filters.search);
    if (filters.include_disabled) params.set('include_disabled', 'true');
    params.set('limit', '200');
    return params.toString();
  }, [filters]);

  const tenants = useQuery({ queryKey: ['platform', 'tenants', 'webhook-picker'], queryFn: () => platformApiRequest<Tenant[]>('/platform/tenants') });
  const webhooks = useQuery({ queryKey: ['platform', 'webhooks', filters], queryFn: () => platformApiRequest<WebhooksResponse>(`/platform/webhooks?${queryString}`) });
  const deliveries = useQuery({ queryKey: ['platform', 'webhook-deliveries'], queryFn: () => platformApiRequest<DeliveriesResponse>('/platform/webhooks/deliveries?limit=50') });

  const createWebhook = useMutation({
    mutationFn: () => platformApiRequest<CreateWebhookResponse>('/platform/webhooks', { method: 'POST', body: JSON.stringify(form) }),
    onSuccess: (data) => {
      setSecret(data);
      setForm(defaultForm);
      queryClient.invalidateQueries({ queryKey: ['platform', 'webhooks'] });
    }
  });

  const updateWebhook = useMutation({
    mutationFn: ({ webhook, patch }: { webhook: Webhook; patch: Partial<Webhook> }) => platformApiRequest(`/platform/webhooks/${webhook.id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platform', 'webhooks'] })
  });

  const rotateSecret = useMutation({
    mutationFn: (webhookId: string) => platformApiRequest<CreateWebhookResponse>(`/platform/webhooks/${webhookId}/rotate-secret`, { method: 'POST' }),
    onSuccess: (data) => {
      setSecret(data);
      queryClient.invalidateQueries({ queryKey: ['platform', 'webhooks'] });
    }
  });

  const testDelivery = useMutation({
    mutationFn: (webhookId: string) => platformApiRequest(`/platform/webhooks/${webhookId}/test`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform', 'webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'webhook-deliveries'] });
    }
  });

  const events = webhooks.data?.event_types || [];
  const rows = webhooks.data?.webhooks || [];
  const deliveryRows = deliveries.data?.deliveries || [];
  const createReady = Boolean(form.tenant_id && form.name.trim() && form.url.trim() && form.event_types.length);
  const createHelp = !form.tenant_id
    ? 'Select a tenant before creating a webhook.'
    : !form.name.trim()
      ? 'Enter a webhook name before creating a webhook.'
      : !form.url.trim()
        ? 'Enter a webhook URL before creating a webhook.'
        : !form.event_types.length
          ? 'Select at least one event before creating a webhook.'
          : '';

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Webhooks</h1>
          <p style={styles.subtitle}>Manage tenant outbound integration endpoints, signing secrets, and delivery health.</p>
        </div>
      </header>

      {secret ? (
        <section style={{ ...styles.card, borderColor: '#f59e0b' }}>
          <h2 style={styles.cardTitle}>Copy signing secret now</h2>
          <p style={styles.help}>{secret.warning}</p>
          <code style={styles.secret}>{secret.secret}</code>
          <button type="button" style={styles.secondaryButton} onClick={() => setSecret(null)}>I copied it</button>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Filters</h2>
        <div style={styles.grid}>
          <label style={styles.field}>Tenant<select style={styles.input} value={filters.tenant_id} onChange={(event) => setFilters((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">All tenants</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label style={styles.field}>Search<input style={styles.input} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Name, URL, tenant" /></label>
          <label style={styles.checkbox}><input type="checkbox" checked={filters.include_disabled} onChange={(event) => setFilters((current) => ({ ...current, include_disabled: event.target.checked }))} /> Include disabled</label>
        </div>
      </section>

      {canWrite ? (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Create webhook</h2>
          <div style={styles.grid}>
            <label style={styles.field}>Tenant<select style={styles.input} value={form.tenant_id} onChange={(event) => setForm((current) => ({ ...current, tenant_id: event.target.value }))}><option value="">Select tenant</option>{(tenants.data || []).map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
            <label style={styles.field}>Name<input style={styles.input} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="POS integration webhook" /></label>
            <label style={styles.field}>URL<input style={styles.input} value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com/webhook" /></label>
          </div>
          <label style={styles.field}>Description<textarea style={styles.textarea} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
          <div style={styles.scopeGrid}>{events.map((eventName) => <label key={eventName} style={styles.checkbox}><input type="checkbox" checked={form.event_types.includes(eventName)} onChange={(event) => setForm((current) => ({ ...current, event_types: event.target.checked ? [...current.event_types, eventName] : current.event_types.filter((item) => item !== eventName) }))} /> {eventName}</label>)}</div>
          <label style={styles.checkbox}><input type="checkbox" checked={form.is_enabled} onChange={(event) => setForm((current) => ({ ...current, is_enabled: event.target.checked }))} /> Enabled immediately</label>
          {createHelp ? <p style={styles.error}>{createHelp}</p> : null}
          <button type="button" style={createReady ? styles.primaryButton : styles.disabledButton} disabled={createWebhook.isPending || !createReady} onClick={() => createWebhook.mutate()}>Create webhook</button>
        </section>
      ) : null}

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Endpoints</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Tenant</th><th style={styles.th}>Name</th><th style={styles.th}>URL</th><th style={styles.th}>Events</th><th style={styles.th}>Delivery health</th><th style={styles.th}>Actions</th></tr></thead>
            <tbody>
              {rows.map((webhook) => (
                <tr key={webhook.id}>
                  <td style={styles.td}>{webhook.tenant_name || webhook.tenant_id}</td>
                  <td style={styles.td}><strong>{webhook.name}</strong><br /><span style={styles.help}>Secret {webhook.secret_prefix}…</span></td>
                  <td style={styles.td}><code>{webhook.url}</code><br /><span style={styles.help}>{webhook.description || 'No description'}</span></td>
                  <td style={styles.td}>{webhook.event_types.join(', ')}</td>
                  <td style={styles.td}><span style={badgeStyle(webhook)}>{webhook.is_enabled ? (webhook.is_healthy ? 'healthy' : 'failing') : 'disabled'}</span><br /><span style={styles.help}>Last: {webhook.last_delivery_at ? `${webhook.last_delivery_status || 'unknown'} at ${new Date(webhook.last_delivery_at).toLocaleString()}` : 'Never delivered'} · failures: {webhook.consecutive_failure_count}</span></td>
                  <td style={styles.td}>{canWrite ? <div style={styles.actions}><button type="button" style={styles.secondaryButton} onClick={() => updateWebhook.mutate({ webhook, patch: { is_enabled: !webhook.is_enabled, disabled_reason: webhook.is_enabled ? 'Disabled from platform UI' : null } })}>{webhook.is_enabled ? 'Disable' : 'Enable'}</button><button type="button" style={styles.secondaryButton} onClick={() => testDelivery.mutate(webhook.id)}>Test</button><button type="button" style={styles.secondaryButton} onClick={() => rotateSecret.mutate(webhook.id)}>Rotate secret</button></div> : '—'}</td>
                </tr>
              ))}
              {!rows.length ? <tr><td style={styles.td} colSpan={6}>No webhooks found.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Recent deliveries</h2>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Webhook</th><th style={styles.th}>Tenant</th><th style={styles.th}>Event</th><th style={styles.th}>Status</th><th style={styles.th}>Response</th><th style={styles.th}>When</th></tr></thead>
            <tbody>
              {deliveryRows.map((delivery) => <tr key={delivery.id}><td style={styles.td}>{delivery.webhook_name || delivery.id}</td><td style={styles.td}>{delivery.tenant_name || '—'}</td><td style={styles.td}>{delivery.event_type}</td><td style={styles.td}>{delivery.delivery_status}</td><td style={styles.td}>{delivery.response_status || delivery.error_message || '—'}</td><td style={styles.td}>{new Date(delivery.created_at).toLocaleString()}</td></tr>)}
              {!deliveryRows.length ? <tr><td style={styles.td} colSpan={6}>No deliveries yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center' },
  title: { margin: 0, fontSize: '28px' },
  subtitle: { margin: '6px 0 0', color: '#6b7280' },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px', boxShadow: '0 1px 2px rgba(15,23,42,.06)' },
  cardTitle: { margin: '0 0 12px', fontSize: '18px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' },
  scopeGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px', margin: '12px 0' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px', fontWeight: 700, color: '#374151' },
  checkbox: { display: 'flex', alignItems: 'center', gap: '8px', color: '#374151' },
  input: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px' },
  textarea: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 12px', minHeight: '72px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '10px' },
  td: { borderBottom: '1px solid #f3f4f6', padding: '10px', verticalAlign: 'top' },
  badge: { borderRadius: '999px', padding: '4px 8px', fontSize: '12px', fontWeight: 800 },
  help: { color: '#6b7280', fontSize: '12px' },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  primaryButton: { border: 0, borderRadius: '10px', padding: '10px 14px', background: '#111827', color: '#fff', cursor: 'pointer', marginTop: '12px' },
  secondaryButton: { border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px', background: '#fff', cursor: 'pointer' },
  disabledButton: { border: 0, borderRadius: '10px', padding: '10px 14px', background: '#9ca3af', color: '#fff', cursor: 'not-allowed', marginTop: '12px' },
  error: { margin: '12px 0 0', color: '#991b1b', fontWeight: 800 },
  secret: { display: 'block', background: '#111827', color: '#fff', padding: '12px', borderRadius: '10px', marginBottom: '12px', overflowWrap: 'anywhere' }
};
