import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';

type TabKey = 'integrations' | 'serials' | 'uom' | 'custom-fields' | 'landed-cost' | 'variants' | 'hierarchy' | 'bom' | 'mobile';

type Product = { id: string; sku: string; name: string; unit: string; barcode?: string | null; parent_product_id?: string | null };
type Location = { id: string; name: string; parent_location_id?: string | null; location_type?: string; location_code?: string | null; path?: string; depth?: number; is_pickable?: boolean };
type Shipment = { id: string; po_number?: string | null; status?: string };
type Overview = { counts?: Record<string, number>; priorities?: string[] };
type ApiClient = { id: string; name: string; description?: string | null; key_prefix: string; scopes: string[]; status: string; last_used_at?: string | null; created_at?: string };
type Connection = { id: string; system_name: string; system_type: string; base_url?: string | null; direction: string; status: string; credential_reference?: string | null };
type WebhookSubscription = { id: string; subscription_key: string; display_name: string; event_types: string[]; destination_reference: string; signing_secret_prefix?: string | null; status: string; updated_at?: string };
type WebhookDelivery = { id: string; subscription_id: string; subscription_name?: string | null; event_type: string; event_status: string; attempt_count: number; response_status?: number | null; error_message?: string | null; created_at: string; completed_at?: string | null };
type TrackingSettings = { serial_tracking_enabled: boolean; serial_uniqueness_scope: 'product' | 'tenant'; require_serial_on_receipt: boolean; require_serial_on_issue: boolean };
type SerialRecord = { id: string; serial_number: string; status: string; product_name: string; product_sku: string; storage_location_name?: string | null; updated_at?: string };
type UomRow = { id: string; uom_code: string; uom_name?: string | null; factor_to_base: number | string; rounding_scale: number; purchase_uom: boolean; issue_uom: boolean; barcode?: string | null };
type UomResponse = { base_uom: string; conversions: UomRow[] };
type CustomDefinition = { id: string; entity_type: string; field_key: string; label: string; data_type: string; is_required: boolean; options: string[]; is_active: boolean };
type CustomValueRow = CustomDefinition & { definition_id: string; value: unknown; updated_at?: string | null };
type LandedAllocation = { shipment_item_id: string; product_id: string; product_name: string; received_quantity: number; base_unit_cost: number; allocated_extra_cost: number; landed_unit_cost: number };
type LandedPreview = { shipment: { id: string; status?: string; po_number?: string | null }; currency: string; allocation_method: string; total_extra_cost: number; allocations: LandedAllocation[] };
type LandedHistory = { id: string; shipment_id: string; po_number?: string | null; allocation_method: string; currency: string; total_extra_cost: number | string; finalized_at?: string; allocations?: LandedAllocation[] };
type Variant = { id: string; parent_product_id: string; parent_product_name: string; sku: string; variant_sku?: string; name: string; barcode?: string | null; variant_attributes?: Record<string, unknown>; current_stock_quantity?: number | string };
type BomComponent = { id?: string; component_product_id?: string; product_id?: string; component_name?: string; component_sku?: string; quantity: number | string; waste_percent?: number | string };
type Bom = { id: string; product_id: string; product_name: string; product_sku: string; name: string; output_quantity: number | string; is_active: boolean; components: BomComponent[] };

const TABS: Array<{ key: TabKey; label: string; number: number; countKey: string }> = [
  { key: 'integrations', label: 'APIs & integrations', number: 1, countKey: 'api_clients' },
  { key: 'serials', label: 'Serial tracking', number: 2, countKey: 'active_serials' },
  { key: 'uom', label: 'Units of measure', number: 3, countKey: 'uom_conversions' },
  { key: 'custom-fields', label: 'Custom fields', number: 4, countKey: 'custom_fields' },
  { key: 'landed-cost', label: 'Landed cost', number: 5, countKey: 'landed_cost_documents' },
  { key: 'variants', label: 'Variants', number: 6, countKey: 'variants' },
  { key: 'hierarchy', label: 'Location hierarchy', number: 7, countKey: 'hierarchical_locations' },
  { key: 'bom', label: 'BOM & assemblies', number: 8, countKey: 'active_boms' },
  { key: 'mobile', label: 'Offline mobile', number: 9, countKey: 'mobile_sync_batches' }
];

const panelStyle: CSSProperties = { display: 'grid', gap: 16 };
const formGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 };
const tableWrapStyle: CSSProperties = { overflowX: 'auto' };
const badgeStyle: CSSProperties = { display: 'inline-flex', padding: '4px 9px', borderRadius: 999, background: '#f3f4f6', fontSize: 12, fontWeight: 700 };
const tabRowStyle: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 };

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function parseAttributes(value: string): Record<string, string> {
  const result: Record<string, string> = {};
  value.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
    const [rawKey, ...rawValue] = part.split('=');
    const key = rawKey?.trim();
    const val = rawValue.join('=').trim();
    if (key && val) result[key] = val;
  });
  return result;
}

function asNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function InventoryCapabilitiesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('integrations');
  const canWriteProducts = hasPermission(TENANT_PERMISSIONS.PRODUCTS_WRITE);
  const canGovernIntegrations = hasPermission(TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_GOVERN);
  const canWriteLocations = hasPermission(TENANT_PERMISSIONS.STORAGE_LOCATIONS_WRITE);
  const canAdjustStock = hasPermission(TENANT_PERMISSIONS.STOCK_ADJUST);

  const overviewQuery = useQuery({ queryKey: ['inventory-capabilities-overview'], queryFn: () => apiRequest<Overview>('/inventory-capabilities/overview') });
  const productsQuery = useQuery({ queryKey: ['inventory-capabilities-products'], queryFn: () => apiRequest<Product[]>('/products') });
  const locationsQuery = useQuery({ queryKey: ['inventory-capabilities-locations'], queryFn: () => apiRequest<Location[]>('/storage-locations') });
  const shipmentsQuery = useQuery({ queryKey: ['inventory-capabilities-shipments'], queryFn: () => apiRequest<Shipment[]>('/shipments') });

  const counts = overviewQuery.data?.counts || {};

  return (
    <div style={panelStyle}>
      <section className="section">
        <div className="section__title">Advanced inventory capabilities</div>
        <div className="card">
          <p className="card__subtext" style={{ marginTop: 0 }}>
            These are the nine enterprise inventory capabilities added on top of the existing Products, Stock, Shipments, Purchasing and Execution workflows.
          </p>
          <div className="card-grid">
            {TABS.map((item) => (
              <button key={item.key} type="button" className="card" onClick={() => setTab(item.key)} style={{ textAlign: 'left', cursor: 'pointer' }}>
                <div className="card__label">Priority #{item.number}</div>
                <div className="card__value" style={{ fontSize: 19 }}>{item.label}</div>
                <div className="card__subtext">{`${String(counts[item.countKey] ?? 0)} configured / recorded`}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div style={tabRowStyle}>
        {TABS.map((item) => (
          <button key={item.key} className={tab === item.key ? 'button' : 'button button--secondary'} type="button" onClick={() => setTab(item.key)}>
            {item.number}. {item.label}
          </button>
        ))}
      </div>

      {tab === 'integrations' && <IntegrationsPanel canWrite={canGovernIntegrations} />}
      {tab === 'serials' && <SerialsPanel products={productsQuery.data || []} locations={locationsQuery.data || []} canWrite={canWriteProducts} />}
      {tab === 'uom' && <UomPanel products={productsQuery.data || []} canWrite={canWriteProducts} />}
      {tab === 'custom-fields' && <CustomFieldsPanel products={productsQuery.data || []} canWrite={canWriteProducts} />}
      {tab === 'landed-cost' && <LandedCostPanel shipments={shipmentsQuery.data || []} canWrite={canWriteProducts} />}
      {tab === 'variants' && <VariantsPanel products={productsQuery.data || []} canWrite={canWriteProducts} onChanged={() => queryClient.invalidateQueries({ queryKey: ['inventory-capabilities-products'] })} />}
      {tab === 'hierarchy' && <HierarchyPanel locations={locationsQuery.data || []} canWrite={canWriteLocations} />}
      {tab === 'bom' && <BomPanel products={productsQuery.data || []} locations={locationsQuery.data || []} canWrite={canWriteProducts} canExecute={canAdjustStock} />}
      {tab === 'mobile' && <MobilePanel />}
    </div>
  );
}

function IntegrationsPanel({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [systemName, setSystemName] = useState('');
  const [systemType, setSystemType] = useState('custom');
  const [baseUrl, setBaseUrl] = useState('');
  const [direction, setDirection] = useState('bidirectional');
  const [credentialReference, setCredentialReference] = useState('');
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('purchase_order.approved,purchase_order.completed');
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<string | null>(null);
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clients = useQuery({ queryKey: ['inventory-api-clients'], queryFn: () => apiRequest<ApiClient[]>('/inventory-capabilities/api-clients') });
  const connections = useQuery({ queryKey: ['inventory-external-connections'], queryFn: () => apiRequest<Connection[]>('/inventory-capabilities/connections') });
  const webhooks = useQuery({ queryKey: ['inventory-webhooks'], queryFn: () => apiRequest<WebhookSubscription[]>('/inventory-capabilities/webhooks') });
  const deliveries = useQuery({ queryKey: ['inventory-webhook-deliveries'], queryFn: () => apiRequest<WebhookDelivery[]>('/inventory-capabilities/webhook-deliveries?limit=25') });
  const createClient = useMutation({
    mutationFn: () => apiRequest<ApiClient & { api_key: string }>('/inventory-capabilities/api-clients', { method: 'POST', body: JSON.stringify({ name, description, scopes: ['products:read', 'stock:read', 'suppliers:read', 'purchase_orders:read', 'events:write'] }) }),
    onSuccess: (data) => { setRevealedKey(data.api_key); setName(''); setDescription(''); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-api-clients'] }); },
    onError: (err) => setError(messageFrom(err, 'Unable to create API client.'))
  });
  const revokeClient = useMutation({
    mutationFn: (id: string) => apiRequest(`/inventory-capabilities/api-clients/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason: 'Revoked from tenant Integrations page' }) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inventory-api-clients'] })
  });
  const saveConnection = useMutation({
    mutationFn: () => apiRequest('/inventory-capabilities/connections', { method: 'POST', body: JSON.stringify({ system_name: systemName, system_type: systemType, base_url: baseUrl || null, direction, credential_reference: credentialReference || null, sync_settings: {} }) }),
    onSuccess: () => { setSystemName(''); setBaseUrl(''); setCredentialReference(''); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-external-connections'] }); },
    onError: (err) => setError(messageFrom(err, 'Unable to save connection.'))
  });
  const createWebhook = useMutation({
    mutationFn: () => apiRequest<WebhookSubscription & { signing_secret: string }>('/inventory-capabilities/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        display_name: webhookName,
        destination_url: webhookUrl,
        event_types: webhookEvents.split(',').map((value) => value.trim()).filter(Boolean)
      })
    }),
    onSuccess: (data) => {
      setRevealedWebhookSecret(data.signing_secret);
      setWebhookName('');
      setWebhookUrl('');
      setWebhookMessage('Webhook created. Events will be queued automatically from the inventory audit trail.');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['inventory-webhooks'] });
    },
    onError: (err) => setError(messageFrom(err, 'Unable to create webhook.'))
  });
  const changeWebhookStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'configured' | 'disabled' }) => apiRequest(`/inventory-capabilities/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['inventory-webhooks'] }); },
    onError: (err) => setError(messageFrom(err, 'Unable to update webhook.'))
  });
  const rotateWebhook = useMutation({
    mutationFn: (id: string) => apiRequest<WebhookSubscription & { signing_secret: string }>(`/inventory-capabilities/webhooks/${id}/rotate-secret`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: (data) => { setRevealedWebhookSecret(data.signing_secret); setWebhookMessage('Webhook secret rotated. Copy the new secret now.'); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-webhooks'] }); },
    onError: (err) => setError(messageFrom(err, 'Unable to rotate webhook secret.'))
  });
  const testWebhook = useMutation({
    mutationFn: (id: string) => apiRequest<{ delivery_id: string; queued: boolean }>(`/inventory-capabilities/webhooks/${id}/test`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => { setWebhookMessage('Test webhook queued. Delivery status will appear below.'); setError(null); setTimeout(() => void qc.invalidateQueries({ queryKey: ['inventory-webhook-deliveries'] }), 750); },
    onError: (err) => setError(messageFrom(err, 'Unable to queue webhook test.'))
  });

  return (
    <section className="section" style={panelStyle}>
      <div className="section__title">Priority #1 — APIs & integrations</div>
      <div className="card">
        <div className="card__label">Public API</div>
        <h3>Let another system talk to this inventory app</h3>
        <p className="card__subtext">Create an API key and give it to the company or developer connecting another system. The public base path is <strong>/api/public/v1</strong>.</p>
        {revealedKey ? (
          <div className="form-success"><strong>Copy this key now. It is only shown once:</strong><br /><code style={{ wordBreak: 'break-all' }}>{revealedKey}</code></div>
        ) : null}
        {error ? <div className="form-error">{error}</div> : null}
        <form onSubmit={(e) => { e.preventDefault(); createClient.mutate(); }} style={formGridStyle}>
          <label>Connection name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company ERP" disabled={!canWrite} /></label>
          <label>Description<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Used by head-office integration" disabled={!canWrite} /></label>
          <div style={{ alignSelf: 'end' }}><button className="button" disabled={!canWrite || !name.trim() || createClient.isPending}>Create API key</button></div>
        </form>
        <div style={tableWrapStyle}>
          <table><thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last used</th><th>Status</th><th /></tr></thead><tbody>
            {(clients.data || []).map((client) => <tr key={client.id}><td>{client.name}</td><td>{client.key_prefix}</td><td>{client.scopes?.join(', ')}</td><td>{formatDate(client.last_used_at)}</td><td>{client.status}</td><td>{client.status === 'active' && canWrite ? <button className="button button--secondary" type="button" onClick={() => revokeClient.mutate(client.id)}>Revoke</button> : null}</td></tr>)}
          </tbody></table>
        </div>
      </div>

      <div className="card">
        <div className="card__label">Automatic outbound notifications</div>
        <h3>Webhooks</h3>
        <p className="card__subtext">Another system can give this app an HTTPS address. When a subscribed inventory action happens, the backend queues a signed notification and retries failed deliveries automatically. Use exact audit event names, or <strong>*</strong> for every tenant audit event.</p>
        {revealedWebhookSecret ? <div className="form-success"><strong>Copy this signing secret now. It is only shown once:</strong><br /><code style={{ wordBreak: 'break-all' }}>{revealedWebhookSecret}</code></div> : null}
        {webhookMessage ? <div className="form-success">{webhookMessage}</div> : null}
        <form onSubmit={(e) => { e.preventDefault(); createWebhook.mutate(); }} style={formGridStyle}>
          <label>Name<input value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="Head office events" disabled={!canWrite} /></label>
          <label>HTTPS destination<input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://example.com/inventory-webhook" disabled={!canWrite} /></label>
          <label>Events<input value={webhookEvents} onChange={(e) => setWebhookEvents(e.target.value)} placeholder="purchase_order.approved,purchase_order.completed" disabled={!canWrite} /></label>
          <div style={{ alignSelf: 'end' }}><button className="button" disabled={!canWrite || !webhookName.trim() || !webhookUrl.trim() || !webhookEvents.trim() || createWebhook.isPending}>Create webhook</button></div>
        </form>
        <div style={tableWrapStyle}><table><thead><tr><th>Name</th><th>Destination</th><th>Events</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {(webhooks.data || []).map((row) => <tr key={row.id}><td>{row.display_name}</td><td style={{ maxWidth: 320, wordBreak: 'break-all' }}>{row.destination_reference}</td><td>{row.event_types.join(', ')}</td><td>{row.status}</td><td><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{canWrite ? <><button className="button button--secondary" type="button" onClick={() => testWebhook.mutate(row.id)}>Test</button><button className="button button--secondary" type="button" onClick={() => rotateWebhook.mutate(row.id)}>Rotate secret</button><button className="button button--secondary" type="button" onClick={() => changeWebhookStatus.mutate({ id: row.id, status: row.status === 'configured' ? 'disabled' : 'configured' })}>{row.status === 'configured' ? 'Disable' : 'Enable'}</button></> : null}</div></td></tr>)}
        </tbody></table></div>
        <h4>Recent delivery attempts</h4>
        <div style={tableWrapStyle}><table><thead><tr><th>Webhook</th><th>Event</th><th>Status</th><th>Attempts</th><th>HTTP</th><th>Created</th></tr></thead><tbody>
          {(deliveries.data || []).map((row) => <tr key={row.id}><td>{row.subscription_name || row.subscription_id}</td><td>{row.event_type}</td><td>{row.event_status}</td><td>{row.attempt_count}</td><td>{row.response_status ?? '-'}</td><td>{formatDate(row.created_at)}</td></tr>)}
        </tbody></table></div>
      </div>

      <div className="card">
        <div className="card__label">Known external systems</div>
        <h3>Connection registry</h3>
        <p className="card__subtext">Record which ERP, accounting, e-commerce or custom system a tenant uses. Specific vendor connector code can then be added only when a real customer needs it.</p>
        <form onSubmit={(e) => { e.preventDefault(); saveConnection.mutate(); }} style={formGridStyle}>
          <label>System name<input value={systemName} onChange={(e) => setSystemName(e.target.value)} placeholder="SAP Business One" disabled={!canWrite} /></label>
          <label>Type<select value={systemType} onChange={(e) => setSystemType(e.target.value)} disabled={!canWrite}><option value="custom">Custom</option><option value="erp">ERP</option><option value="accounting">Accounting</option><option value="ecommerce">E-commerce</option><option value="wms">WMS</option></select></label>
          <label>Base URL<input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://..." disabled={!canWrite} /></label>
          <label>Direction<select value={direction} onChange={(e) => setDirection(e.target.value)} disabled={!canWrite}><option value="bidirectional">Both directions</option><option value="inbound">Into inventory app</option><option value="outbound">Out of inventory app</option></select></label>
          <label>Credential reference<input value={credentialReference} onChange={(e) => setCredentialReference(e.target.value)} placeholder="Secret-manager reference" disabled={!canWrite} /></label>
          <div style={{ alignSelf: 'end' }}><button className="button" disabled={!canWrite || !systemName.trim() || saveConnection.isPending}>Save connection</button></div>
        </form>
        <div style={tableWrapStyle}><table><thead><tr><th>System</th><th>Type</th><th>Direction</th><th>Status</th></tr></thead><tbody>{(connections.data || []).map((row) => <tr key={row.id}><td>{row.system_name}</td><td>{row.system_type}</td><td>{row.direction}</td><td>{row.status}</td></tr>)}</tbody></table></div>
      </div>
    </section>
  );
}

function ProductSelect({ products, value, onChange, label = 'Product' }: { products: Product[]; value: string; onChange: (id: string) => void; label?: string }) {
  return <label>{label}<select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></label>;
}

function SerialsPanel({ products, locations, canWrite }: { products: Product[]; locations: Location[]; canWrite: boolean }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [settings, setSettings] = useState<TrackingSettings>({ serial_tracking_enabled: false, serial_uniqueness_scope: 'product', require_serial_on_receipt: false, require_serial_on_issue: false });
  const [serialNumber, setSerialNumber] = useState('');
  const [locationId, setLocationId] = useState('');
  const [status, setStatus] = useState('available');
  const [error, setError] = useState<string | null>(null);
  const settingsQuery = useQuery({ queryKey: ['tracking-settings', productId], enabled: Boolean(productId), queryFn: () => apiRequest<TrackingSettings>(`/inventory-capabilities/products/${productId}/tracking`) });
  useEffect(() => { if (settingsQuery.data) setSettings(settingsQuery.data); }, [settingsQuery.data]);
  const serialsQuery = useQuery({ queryKey: ['inventory-serials', productId], queryFn: () => apiRequest<SerialRecord[]>(`/inventory-capabilities/serials${productId ? `?product_id=${encodeURIComponent(productId)}` : ''}`) });
  const saveSettings = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/products/${productId}/tracking`, { method: 'PUT', body: JSON.stringify(settings) }), onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['tracking-settings', productId] }); }, onError: (e) => setError(messageFrom(e, 'Unable to save tracking settings.')) });
  const addSerial = useMutation({ mutationFn: () => apiRequest('/inventory-capabilities/serials', { method: 'POST', body: JSON.stringify({ product_id: productId, serial_number: serialNumber, storage_location_id: locationId || null, status }) }), onSuccess: () => { setSerialNumber(''); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-serials'] }); }, onError: (e) => setError(messageFrom(e, 'Unable to create serial.')) });

  return <section className="section" style={panelStyle}><div className="section__title">Priority #2 — Optional serial-number tracking</div>
    <div className="card"><div style={formGridStyle}><ProductSelect products={products} value={productId} onChange={setProductId} />
      <label><input type="checkbox" checked={settings.serial_tracking_enabled} onChange={(e) => setSettings({ ...settings, serial_tracking_enabled: e.target.checked })} disabled={!canWrite || !productId} /> Enable serial tracking</label>
      <label>Uniqueness<select value={settings.serial_uniqueness_scope} onChange={(e) => setSettings({ ...settings, serial_uniqueness_scope: e.target.value as 'product' | 'tenant' })} disabled={!canWrite || !productId}><option value="product">Unique within product</option><option value="tenant">Unique across tenant</option></select></label>
      <label><input type="checkbox" checked={settings.require_serial_on_receipt} onChange={(e) => setSettings({ ...settings, require_serial_on_receipt: e.target.checked })} disabled={!canWrite || !productId} /> Require on receipt</label>
      <label><input type="checkbox" checked={settings.require_serial_on_issue} onChange={(e) => setSettings({ ...settings, require_serial_on_issue: e.target.checked })} disabled={!canWrite || !productId} /> Require on issue</label>
      <div style={{ alignSelf: 'end' }}><button className="button" type="button" disabled={!canWrite || !productId} onClick={() => saveSettings.mutate()}>Save tracking</button></div>
    </div>{error ? <div className="form-error">{error}</div> : null}</div>
    <div className="card"><h3>Add serial</h3><form onSubmit={(e) => { e.preventDefault(); addSerial.mutate(); }} style={formGridStyle}><input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Serial number" disabled={!canWrite} /><select value={locationId} onChange={(e) => setLocationId(e.target.value)}><option value="">No location</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="available">Available</option><option value="reserved">Reserved</option><option value="quarantine">Quarantine</option><option value="damaged">Damaged</option><option value="issued">Issued</option></select><button className="button" disabled={!canWrite || !productId || !serialNumber.trim() || !settings.serial_tracking_enabled}>Add serial</button></form></div>
    <div className="card" style={tableWrapStyle}><table><thead><tr><th>Serial</th><th>Product</th><th>Status</th><th>Location</th><th>Updated</th></tr></thead><tbody>{(serialsQuery.data || []).map((s) => <tr key={s.id}><td>{s.serial_number}</td><td>{s.product_sku} — {s.product_name}</td><td>{s.status}</td><td>{s.storage_location_name || '-'}</td><td>{formatDate(s.updated_at)}</td></tr>)}</tbody></table></div>
  </section>;
}

function UomPanel({ products, canWrite }: { products: Product[]; canWrite: boolean }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [factor, setFactor] = useState('');
  const [purchase, setPurchase] = useState(false);
  const [issue, setIssue] = useState(false);
  const [convertQty, setConvertQty] = useState('1');
  const [fromUom, setFromUom] = useState('');
  const [toUom, setToUom] = useState('');
  const [converted, setConverted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['uom', productId], enabled: Boolean(productId), queryFn: () => apiRequest<UomResponse>(`/inventory-capabilities/products/${productId}/uom`) });
  const save = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/products/${productId}/uom`, { method: 'POST', body: JSON.stringify({ uom_code: code, uom_name: name || null, factor_to_base: Number(factor), purchase_uom: purchase, issue_uom: issue }) }), onSuccess: () => { setCode(''); setName(''); setFactor(''); setError(null); void qc.invalidateQueries({ queryKey: ['uom', productId] }); }, onError: (e) => setError(messageFrom(e, 'Unable to save UoM.')) });
  const convert = useMutation({ mutationFn: () => apiRequest<{ converted_quantity: number }>(`/inventory-capabilities/products/${productId}/uom/convert`, { method: 'POST', body: JSON.stringify({ from_uom: fromUom, to_uom: toUom, quantity: Number(convertQty) }) }), onSuccess: (data) => setConverted(String(data.converted_quantity)), onError: (e) => setError(messageFrom(e, 'Unable to convert quantity.')) });
  const units = useMemo(() => productId && query.data ? [query.data.base_uom, ...query.data.conversions.map((r) => r.uom_code)] : [], [productId, query.data]);
  useEffect(() => { if (units.length && !fromUom) { setFromUom(units[0]); setToUom(units[1] || units[0]); } }, [units, fromUom]);
  return <section className="section" style={panelStyle}><div className="section__title">Priority #3 — Unit-of-measure conversion</div><div className="card"><div style={formGridStyle}><ProductSelect products={products} value={productId} onChange={(id) => { setProductId(id); setFromUom(''); setToUom(''); }} /><label>UoM code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CASE" /></label><label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Case" /></label><label>Units in base unit<input type="number" step="any" value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="24" /></label><label><input type="checkbox" checked={purchase} onChange={(e) => setPurchase(e.target.checked)} /> Purchasing unit</label><label><input type="checkbox" checked={issue} onChange={(e) => setIssue(e.target.checked)} /> Issue/selling unit</label><button className="button" type="button" disabled={!canWrite || !productId || !code || asNumber(factor) <= 0} onClick={() => save.mutate()}>Save conversion</button></div>{error ? <div className="form-error">{error}</div> : null}</div><div className="card"><h3>Conversion test</h3><div style={formGridStyle}><input type="number" step="any" value={convertQty} onChange={(e) => setConvertQty(e.target.value)} /><select value={fromUom} onChange={(e) => setFromUom(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select><select value={toUom} onChange={(e) => setToUom(e.target.value)}>{units.map((u) => <option key={u}>{u}</option>)}</select><button className="button button--secondary" type="button" disabled={!productId || !fromUom || !toUom} onClick={() => convert.mutate()}>Convert</button>{converted !== null ? <strong>Result: {converted} {toUom}</strong> : null}</div></div><div className="card" style={tableWrapStyle}><table><thead><tr><th>Unit</th><th>Factor to base</th><th>Purchase</th><th>Issue</th></tr></thead><tbody><tr><td>{query.data?.base_uom || '-'}</td><td>1</td><td>-</td><td>-</td></tr>{(query.data?.conversions || []).map((row) => <tr key={row.id}><td>{row.uom_code} {row.uom_name ? `— ${row.uom_name}` : ''}</td><td>{String(row.factor_to_base)}</td><td>{row.purchase_uom ? 'Yes' : 'No'}</td><td>{row.issue_uom ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></section>;
}

function CustomFieldsPanel({ products, canWrite }: { products: Product[]; canWrite: boolean }) {
  const qc = useQueryClient();
  const [fieldKey, setFieldKey] = useState('');
  const [label, setLabel] = useState('');
  const [dataType, setDataType] = useState('text');
  const [options, setOptions] = useState('');
  const [required, setRequired] = useState(false);
  const [productId, setProductId] = useState('');
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const definitions = useQuery({ queryKey: ['custom-field-definitions'], queryFn: () => apiRequest<CustomDefinition[]>('/inventory-capabilities/custom-fields?entity_type=product') });
  const entityValues = useQuery({ queryKey: ['custom-field-values', productId], enabled: Boolean(productId), queryFn: () => apiRequest<CustomValueRow[]>(`/inventory-capabilities/custom-fields/product/${productId}`) });
  useEffect(() => { if (entityValues.data) { const next: Record<string, string | boolean> = {}; entityValues.data.forEach((row) => { next[row.field_key] = row.value === null || row.value === undefined ? '' : row.data_type === 'boolean' ? row.value === true : String(row.value); }); setValues(next); } }, [entityValues.data]);
  const saveDefinition = useMutation({ mutationFn: () => apiRequest('/inventory-capabilities/custom-fields', { method: 'POST', body: JSON.stringify({ entity_type: 'product', field_key: fieldKey, label, data_type: dataType, is_required: required, options: options.split(',').map((v) => v.trim()).filter(Boolean) }) }), onSuccess: () => { setFieldKey(''); setLabel(''); setOptions(''); setError(null); void qc.invalidateQueries({ queryKey: ['custom-field-definitions'] }); }, onError: (e) => setError(messageFrom(e, 'Unable to save custom field.')) });
  const saveValues = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/custom-fields/product/${productId}`, { method: 'PUT', body: JSON.stringify({ values }) }), onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['custom-field-values', productId] }); }, onError: (e) => setError(messageFrom(e, 'Unable to save custom values.')) });
  return <section className="section" style={panelStyle}><div className="section__title">Priority #4 — Tenant-configurable custom fields</div><div className="card"><h3>Create a product field</h3><div style={formGridStyle}><label>Field key<input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} placeholder="country_of_origin" /></label><label>Label<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Country of origin" /></label><label>Type<select value={dataType} onChange={(e) => setDataType(e.target.value)}><option value="text">Text</option><option value="number">Number</option><option value="boolean">Yes/No</option><option value="date">Date</option><option value="select">Select list</option></select></label>{dataType === 'select' ? <label>Options<input value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Croatia, Italy, Germany" /></label> : null}<label><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required</label><button className="button" type="button" disabled={!canWrite || !fieldKey.trim() || !label.trim()} onClick={() => saveDefinition.mutate()}>Save field</button></div>{error ? <div className="form-error">{error}</div> : null}</div><div className="card"><h3>Use fields on a product</h3><ProductSelect products={products} value={productId} onChange={setProductId} />{(entityValues.data || []).map((row) => <label key={row.definition_id} style={{ display: 'block', marginTop: 12 }}>{row.label}{row.is_required ? ' *' : ''}{row.data_type === 'boolean' ? <input type="checkbox" checked={values[row.field_key] === true} onChange={(e) => setValues({ ...values, [row.field_key]: e.target.checked })} /> : row.data_type === 'select' ? <select value={String(values[row.field_key] || '')} onChange={(e) => setValues({ ...values, [row.field_key]: e.target.value })}><option value="">Select…</option>{(row.options || []).map((opt) => <option key={opt}>{opt}</option>)}</select> : <input type={row.data_type === 'number' ? 'number' : row.data_type === 'date' ? 'date' : 'text'} value={String(values[row.field_key] || '')} onChange={(e) => setValues({ ...values, [row.field_key]: e.target.value })} />}</label>)}<button className="button" style={{ marginTop: 14 }} type="button" disabled={!canWrite || !productId} onClick={() => saveValues.mutate()}>Save product custom fields</button></div><div className="card" style={tableWrapStyle}><table><thead><tr><th>Key</th><th>Label</th><th>Type</th><th>Required</th></tr></thead><tbody>{(definitions.data || []).map((d) => <tr key={d.id}><td>{d.field_key}</td><td>{d.label}</td><td>{d.data_type}</td><td>{d.is_required ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></section>;
}

function LandedCostPanel({ shipments, canWrite }: { shipments: Shipment[]; canWrite: boolean }) {
  const qc = useQueryClient();
  const [shipmentId, setShipmentId] = useState('');
  const [method, setMethod] = useState('value');
  const [freight, setFreight] = useState('');
  const [customs, setCustoms] = useState('');
  const [insurance, setInsurance] = useState('');
  const [preview, setPreview] = useState<LandedPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const history = useQuery({ queryKey: ['landed-cost-history'], queryFn: () => apiRequest<LandedHistory[]>('/inventory-capabilities/landed-costs') });
  const body = () => ({ shipment_id: shipmentId, allocation_method: method, charges: [
    { component_type: 'freight', amount: asNumber(freight) }, { component_type: 'customs', amount: asNumber(customs) }, { component_type: 'insurance', amount: asNumber(insurance) }
  ].filter((row) => row.amount > 0) });
  const previewMutation = useMutation({ mutationFn: () => apiRequest<LandedPreview>('/inventory-capabilities/landed-costs/preview', { method: 'POST', body: JSON.stringify(body()) }), onSuccess: (data) => { setPreview(data); setError(null); }, onError: (e) => setError(messageFrom(e, 'Unable to preview landed cost.')) });
  const finalizeMutation = useMutation({ mutationFn: () => apiRequest('/inventory-capabilities/landed-costs/finalize', { method: 'POST', body: JSON.stringify(body()) }), onSuccess: () => { setPreview(null); setFreight(''); setCustoms(''); setInsurance(''); setError(null); void qc.invalidateQueries({ queryKey: ['landed-cost-history'] }); void qc.invalidateQueries({ queryKey: ['inventory-capabilities-products'] }); }, onError: (e) => setError(messageFrom(e, 'Unable to finalize landed cost.')) });
  const total = asNumber(freight) + asNumber(customs) + asNumber(insurance);
  return <section className="section" style={panelStyle}><div className="section__title">Priority #5 — True landed-cost allocation</div><div className="card"><h3>Add freight, customs and insurance to received inventory cost</h3><div style={formGridStyle}><label>Shipment<select value={shipmentId} onChange={(e) => { setShipmentId(e.target.value); setPreview(null); }}><option value="">Select…</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.po_number || s.id.slice(0, 8)} — {s.status}</option>)}</select></label><label>Allocation<select value={method} onChange={(e) => setMethod(e.target.value)}><option value="value">By item value</option><option value="quantity">By quantity</option><option value="equal">Equal per line</option></select></label><label>Freight<input type="number" min="0" step="0.01" value={freight} onChange={(e) => setFreight(e.target.value)} /></label><label>Customs<input type="number" min="0" step="0.01" value={customs} onChange={(e) => setCustoms(e.target.value)} /></label><label>Insurance<input type="number" min="0" step="0.01" value={insurance} onChange={(e) => setInsurance(e.target.value)} /></label><div><strong>Extra cost: {total.toFixed(2)}</strong><div style={{ display: 'flex', gap: 8, marginTop: 8 }}><button className="button button--secondary" type="button" disabled={!shipmentId || total <= 0} onClick={() => previewMutation.mutate()}>Preview</button><button className="button" type="button" disabled={!canWrite || !shipmentId || total <= 0 || !preview} onClick={() => finalizeMutation.mutate()}>Finalize cost</button></div></div></div>{error ? <div className="form-error">{error}</div> : null}</div>{preview ? <div className="card" style={tableWrapStyle}><h3>Allocation preview — {preview.currency} {preview.total_extra_cost}</h3><table><thead><tr><th>Product</th><th>Qty</th><th>Base unit cost</th><th>Extra allocated</th><th>Landed unit cost</th></tr></thead><tbody>{preview.allocations.map((a) => <tr key={a.shipment_item_id}><td>{a.product_name}</td><td>{a.received_quantity}</td><td>{a.base_unit_cost}</td><td>{a.allocated_extra_cost}</td><td><strong>{a.landed_unit_cost}</strong></td></tr>)}</tbody></table></div> : null}<div className="card" style={tableWrapStyle}><h3>Finalized landed costs</h3><table><thead><tr><th>PO</th><th>Method</th><th>Extra cost</th><th>Finalized</th></tr></thead><tbody>{(history.data || []).map((row) => <tr key={row.id}><td>{row.po_number || row.shipment_id.slice(0, 8)}</td><td>{row.allocation_method}</td><td>{row.currency} {String(row.total_extra_cost)}</td><td>{formatDate(row.finalized_at)}</td></tr>)}</tbody></table></div></section>;
}

function VariantsPanel({ products, canWrite, onChanged }: { products: Product[]; canWrite: boolean; onChanged: () => void }) {
  const qc = useQueryClient();
  const [parentId, setParentId] = useState('');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [attributes, setAttributes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const variants = useQuery({ queryKey: ['product-variants'], queryFn: () => apiRequest<Variant[]>('/inventory-capabilities/variants') });
  const create = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/products/${parentId}/variants`, { method: 'POST', body: JSON.stringify({ sku, name, barcode: barcode || null, attributes: parseAttributes(attributes) }) }), onSuccess: () => { setSku(''); setName(''); setBarcode(''); setAttributes(''); setError(null); void qc.invalidateQueries({ queryKey: ['product-variants'] }); onChanged(); }, onError: (e) => setError(messageFrom(e, 'Unable to create variant.')) });
  const parents = products.filter((p) => !p.parent_product_id);
  return <section className="section" style={panelStyle}><div className="section__title">Priority #6 — Product variants</div><div className="card"><p className="card__subtext">A variant is created as a real product underneath a parent. That means existing stock, barcodes, shipments and movements can use it immediately.</p><form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} style={formGridStyle}><ProductSelect products={parents} value={parentId} onChange={setParentId} label="Parent product" /><label>Variant SKU<input value={sku} onChange={(e) => setSku(e.target.value)} /></label><label>Variant name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="T-shirt / Red / M" /></label><label>Barcode<input value={barcode} onChange={(e) => setBarcode(e.target.value)} /></label><label>Attributes<input value={attributes} onChange={(e) => setAttributes(e.target.value)} placeholder="Color=Red, Size=M" /></label><button className="button" disabled={!canWrite || !parentId || !sku.trim() || !name.trim()}>Create variant</button></form>{error ? <div className="form-error">{error}</div> : null}</div><div className="card" style={tableWrapStyle}><table><thead><tr><th>Parent</th><th>SKU</th><th>Variant</th><th>Attributes</th><th>Stock</th></tr></thead><tbody>{(variants.data || []).map((v) => <tr key={v.id}><td>{v.parent_product_name}</td><td>{v.sku}</td><td>{v.name}</td><td>{Object.entries(v.variant_attributes || {}).map(([k,val]) => `${k}: ${String(val)}`).join(', ') || '-'}</td><td>{String(v.current_stock_quantity ?? 0)}</td></tr>)}</tbody></table></div></section>;
}

function HierarchyPanel({ locations, canWrite }: { locations: Location[]; canWrite: boolean }) {
  const qc = useQueryClient();
  const [locationId, setLocationId] = useState('');
  const [parentId, setParentId] = useState('');
  const [type, setType] = useState('storage');
  const [code, setCode] = useState('');
  const [pickable, setPickable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hierarchy = useQuery({ queryKey: ['location-hierarchy'], queryFn: () => apiRequest<Location[]>('/inventory-capabilities/location-hierarchy') });
  const save = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/location-hierarchy/${locationId}`, { method: 'PATCH', body: JSON.stringify({ parent_location_id: parentId || null, location_type: type, location_code: code || null, is_pickable: pickable }) }), onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['location-hierarchy'] }); void qc.invalidateQueries({ queryKey: ['inventory-capabilities-locations'] }); }, onError: (e) => setError(messageFrom(e, 'Unable to save hierarchy.')) });
  const selected = (hierarchy.data || []).find((l) => l.id === locationId);
  useEffect(() => { if (selected) { setParentId(selected.parent_location_id || ''); setType(selected.location_type || 'storage'); setCode(selected.location_code || ''); setPickable(selected.is_pickable !== false); } }, [selected]);
  return <section className="section" style={panelStyle}><div className="section__title">Priority #7 — Warehouse / zone / aisle / rack / shelf / bin hierarchy</div><div className="card"><div style={formGridStyle}><label>Location<select value={locationId} onChange={(e) => setLocationId(e.target.value)}><option value="">Select…</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Parent<select value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">Top level</option>{locations.filter((l) => l.id !== locationId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Type<select value={type} onChange={(e) => setType(e.target.value)}><option value="warehouse">Warehouse</option><option value="zone">Zone</option><option value="aisle">Aisle</option><option value="rack">Rack</option><option value="shelf">Shelf</option><option value="bin">Bin</option><option value="storage">Storage</option></select></label><label>Code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WH1-A03-R02-B04" /></label><label><input type="checkbox" checked={pickable} onChange={(e) => setPickable(e.target.checked)} /> Pickable location</label><button className="button" type="button" disabled={!canWrite || !locationId} onClick={() => save.mutate()}>Save hierarchy</button></div>{error ? <div className="form-error">{error}</div> : null}</div><div className="card" style={tableWrapStyle}><table><thead><tr><th>Path</th><th>Type</th><th>Code</th><th>Pickable</th></tr></thead><tbody>{(hierarchy.data || []).map((l) => <tr key={l.id}><td style={{ paddingLeft: 12 + Number(l.depth || 0) * 12 }}>{l.path || l.name}</td><td>{l.location_type}</td><td>{l.location_code || '-'}</td><td>{l.is_pickable ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div></section>;
}

function BomPanel({ products, locations, canWrite, canExecute }: { products: Product[]; locations: Location[]; canWrite: boolean; canExecute: boolean }) {
  const qc = useQueryClient();
  const [outputProductId, setOutputProductId] = useState('');
  const [name, setName] = useState('Default BOM');
  const [outputQty, setOutputQty] = useState('1');
  const [components, setComponents] = useState<Array<{ product_id: string; quantity: string; waste_percent: string }>>([{ product_id: '', quantity: '1', waste_percent: '0' }]);
  const [executeBomId, setExecuteBomId] = useState('');
  const [executeLocationId, setExecuteLocationId] = useState('');
  const [executeQty, setExecuteQty] = useState('1');
  const [direction, setDirection] = useState('assemble');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boms = useQuery({ queryKey: ['inventory-boms'], queryFn: () => apiRequest<Bom[]>('/inventory-capabilities/boms') });
  const create = useMutation({ mutationFn: () => apiRequest('/inventory-capabilities/boms', { method: 'POST', body: JSON.stringify({ product_id: outputProductId, name, output_quantity: Number(outputQty), components: components.filter((c) => c.product_id).map((c) => ({ product_id: c.product_id, quantity: Number(c.quantity), waste_percent: Number(c.waste_percent || 0) })) }) }), onSuccess: () => { setMessage('BOM created successfully.'); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-boms'] }); }, onError: (e) => { setMessage(null); setError(messageFrom(e, 'Unable to create BOM.')); } });
  const execute = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/boms/${executeBomId}/execute`, { method: 'POST', body: JSON.stringify({ direction, storage_location_id: executeLocationId, output_quantity: Number(executeQty), reservation_shortfall_acknowledged: false }) }), onSuccess: () => { setMessage(`${direction === 'assemble' ? 'Assembly' : 'Disassembly'} completed and stock movements recorded.`); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-capabilities-products'] }); }, onError: (e) => { setMessage(null); setError(messageFrom(e, 'Unable to execute BOM.')); } });
  return <section className="section" style={panelStyle}><div className="section__title">Priority #8 — BOM, kits, assembly and disassembly</div><div className="card"><h3>Create BOM</h3><div style={formGridStyle}><ProductSelect products={products} value={outputProductId} onChange={setOutputProductId} label="Finished product / kit" /><label>BOM name<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>Output quantity<input type="number" min="0.000001" step="any" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} /></label></div><h4>Components</h4>{components.map((component, index) => <div key={index} style={{ ...formGridStyle, marginBottom: 8 }}><ProductSelect products={products.filter((p) => p.id !== outputProductId)} value={component.product_id} onChange={(id) => setComponents((rows) => rows.map((r,i) => i === index ? { ...r, product_id: id } : r))} label={`Component ${index + 1}`} /><label>Quantity<input type="number" step="any" min="0" value={component.quantity} onChange={(e) => setComponents((rows) => rows.map((r,i) => i === index ? { ...r, quantity: e.target.value } : r))} /></label><label>Waste %<input type="number" step="any" min="0" max="100" value={component.waste_percent} onChange={(e) => setComponents((rows) => rows.map((r,i) => i === index ? { ...r, waste_percent: e.target.value } : r))} /></label>{components.length > 1 ? <button className="button button--secondary" type="button" onClick={() => setComponents((rows) => rows.filter((_,i) => i !== index))}>Remove</button> : null}</div>)}<div style={{ display: 'flex', gap: 8 }}><button className="button button--secondary" type="button" onClick={() => setComponents((rows) => [...rows, { product_id: '', quantity: '1', waste_percent: '0' }])}>Add component</button><button className="button" type="button" disabled={!canWrite || !outputProductId || components.every((c) => !c.product_id)} onClick={() => create.mutate()}>Create BOM</button></div></div><div className="card"><h3>Assemble / disassemble</h3><div style={formGridStyle}><label>BOM<select value={executeBomId} onChange={(e) => setExecuteBomId(e.target.value)}><option value="">Select…</option>{(boms.data || []).map((b) => <option key={b.id} value={b.id}>{b.product_sku} — {b.name}</option>)}</select></label><label>Location<select value={executeLocationId} onChange={(e) => setExecuteLocationId(e.target.value)}><option value="">Select…</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Action<select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="assemble">Assemble</option><option value="disassemble">Disassemble</option></select></label><label>Finished quantity<input type="number" min="0.000001" step="any" value={executeQty} onChange={(e) => setExecuteQty(e.target.value)} /></label><button className="button" type="button" disabled={!canExecute || !executeBomId || !executeLocationId || asNumber(executeQty) <= 0} onClick={() => execute.mutate()}>{direction === 'assemble' ? 'Assemble stock' : 'Disassemble stock'}</button></div>{message ? <div className="form-success">{message}</div> : null}{error ? <div className="form-error">{error}</div> : null}</div><div className="card" style={tableWrapStyle}><table><thead><tr><th>Output</th><th>BOM</th><th>Output qty</th><th>Components</th></tr></thead><tbody>{(boms.data || []).map((b) => <tr key={b.id}><td>{b.product_sku} — {b.product_name}</td><td>{b.name}</td><td>{String(b.output_quantity)}</td><td>{b.components.map((c) => `${c.component_sku || ''} ${c.component_name || ''} × ${String(c.quantity)}`).join('; ')}</td></tr>)}</tbody></table></div></section>;
}

function MobilePanel() {
  return <section className="section" style={panelStyle}><div className="section__title">Priority #9 — Offline mobile warehouse execution</div><div className="card"><div className="card__label">Operational mobile mode</div><h3>Mobile Execution now keeps a local task snapshot and queues task actions when offline.</h3><p className="card__subtext">Operators can start, complete, block or unblock execution tasks while disconnected. When the device is online again, queued actions are replayed through the normal backend task permissions and audit trail.</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><Link className="button" to="/mobile-execution">Open Mobile Execution</Link><Link className="button button--secondary" to="/scanner">Open scanner</Link></div></div><div className="card"><div className="card__label">Installable web app foundation</div><p className="card__subtext">The web application also registers an offline service worker and application manifest, so supported phones/tablets can install it from the browser. Native Android/iOS store wrappers can use the same mobile workflow later without changing the inventory backend.</p><span style={badgeStyle}>Offline queue + server replay</span></div></section>;
}
