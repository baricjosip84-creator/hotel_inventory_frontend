import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import './InventoryCapabilitiesPage.css';

type TabKey = 'integrations' | 'serials' | 'uom' | 'custom-fields' | 'landed-cost' | 'variants' | 'hierarchy' | 'bom' | 'mobile';

type Product = { id: string; sku: string; name: string; unit: string; barcode?: string | null; parent_product_id?: string | null };
type Location = { id: string; name: string; parent_location_id?: string | null; location_type?: string; location_code?: string | null; path?: string; depth?: number; is_pickable?: boolean; stock_quantity?: number | string };
type Shipment = { id: string; po_number?: string | null; status?: string; qr_code?: string | null };
type SupplierRef = { id: string; name: string; email?: string | null };
type PurchaseOrderRef = { id: string; po_number?: string | null; status?: string };
type Overview = { counts?: Record<string, number>; priorities?: string[] };
type ApiClient = { id: string; name: string; description?: string | null; key_prefix: string; scopes: string[]; status: string; last_used_at?: string | null; created_at?: string };
type Connection = { id: string; system_name: string; system_type: string; base_url?: string | null; direction: string; status: string; credential_reference?: string | null };
type WebhookSubscription = { id: string; subscription_key: string; display_name: string; event_types: string[]; destination_reference: string; signing_secret_prefix?: string | null; status: string; updated_at?: string };
type WebhookDelivery = { id: string; subscription_id: string; subscription_name?: string | null; event_type: string; event_status: string; attempt_count: number; response_status?: number | null; error_message?: string | null; created_at: string; completed_at?: string | null };
type TrackingSettings = { serial_tracking_enabled: boolean; serial_uniqueness_scope: 'product' | 'tenant'; require_serial_on_receipt: boolean; require_serial_on_issue: boolean };
type SerialRecord = { id: string; serial_number: string; status: string; product_name: string; product_sku: string; storage_location_name?: string | null; inventory_lot_id?: string | null; lot_number?: string | null; batch_number?: string | null; updated_at?: string };
type SerialRegistrationLot = { id: string; product_id: string; storage_location_id: string; quantity: number | string; condition: string; lot_number?: string | null; batch_number?: string | null; expiry_date?: string | null };
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

const TABS: Array<{ key: TabKey; label: string; countKey: string; metricLabel: string }> = [
  { key: 'integrations', label: 'APIs & integrations', countKey: 'api_clients', metricLabel: 'Active API keys' },
  { key: 'serials', label: 'Serial tracking', countKey: 'active_serials', metricLabel: 'Active serial identities' },
  { key: 'uom', label: 'Units of measure', countKey: 'uom_conversions', metricLabel: 'Saved conversions' },
  { key: 'custom-fields', label: 'Custom fields', countKey: 'custom_fields', metricLabel: 'Active field definitions' },
  { key: 'landed-cost', label: 'Landed cost', countKey: 'landed_cost_documents', metricLabel: 'Finalized cost records' },
  { key: 'variants', label: 'Variants', countKey: 'variants', metricLabel: 'Variant products' },
  { key: 'hierarchy', label: 'Location hierarchy', countKey: 'hierarchical_locations', metricLabel: 'Nested locations' },
  { key: 'bom', label: 'BOM & assemblies', countKey: 'active_boms', metricLabel: 'Active BOMs' },
  { key: 'mobile', label: 'Offline task mode', countKey: 'mobile_sync_batches', metricLabel: 'Offline sync batches' }
];

const panelStyle: CSSProperties = { display: 'grid', gap: 18 };
const formGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' };
const tableWrapStyle: CSSProperties = { overflowX: 'auto', borderRadius: 12 };
const badgeStyle: CSSProperties = { display: 'inline-flex', padding: '5px 10px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 800 };
const tabRowStyle: CSSProperties = { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, padding: 6, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 14, maxWidth: '100%' };

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

function EmptyTableRow({ colSpan, message }: { colSpan: number; message: string }) {
  return <tr><td className="capability-empty-cell" colSpan={colSpan}>{message}</td></tr>;
}

export default function InventoryCapabilitiesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('serials');

  const canWriteProducts = hasPermission(TENANT_PERMISSIONS.PRODUCTS_WRITE);
  const canReadSuppliers = hasPermission(TENANT_PERMISSIONS.SUPPLIERS_READ);
  const canWriteSuppliers = hasPermission(TENANT_PERMISSIONS.SUPPLIERS_WRITE);
  const canReadLocations = hasPermission(TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ);
  const canWriteLocations = hasPermission(TENANT_PERMISSIONS.STORAGE_LOCATIONS_WRITE);
  const canReadShipments = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ);
  const canWriteShipments = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_WRITE);
  const canReadPurchaseOrders = hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_READ);
  const canWritePurchaseOrders = hasPermission(TENANT_PERMISSIONS.PURCHASE_ORDERS_UPDATE);
  const canReadIntegrations = hasPermission(TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_READ);
  const canGovernIntegrations = hasPermission(TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_GOVERN);
  const canAdjustStock = hasPermission(TENANT_PERMISSIONS.STOCK_ADJUST);
  const canReadStock = hasPermission(TENANT_PERMISSIONS.STOCK_READ);
  const canUseMobileExecution = hasPermission(TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ)
    && hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_READ);
  const canOpenScanner = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_READ);

  const visibleTabs = useMemo(() => TABS.filter((item) => {
    if (item.key === 'integrations') return canReadIntegrations;
    if (item.key === 'landed-cost') return canReadShipments;
    if (item.key === 'hierarchy') return canReadLocations;
    if (item.key === 'mobile') return canUseMobileExecution;
    return true;
  }), [canReadIntegrations, canReadLocations, canReadShipments, canUseMobileExecution]);

  useEffect(() => {
    if (!visibleTabs.some((item) => item.key === tab)) {
      setTab(visibleTabs[0]?.key || 'serials');
    }
  }, [tab, visibleTabs]);

  const needsProducts = ['serials', 'uom', 'custom-fields', 'variants', 'bom'].includes(tab);
  const needsLocations = ['serials', 'custom-fields', 'hierarchy', 'bom'].includes(tab);
  const needsCustomFieldReferences = tab === 'custom-fields';

  const overviewQuery = useQuery({ queryKey: ['inventory-capabilities-overview'], queryFn: () => apiRequest<Overview>('/inventory-capabilities/overview') });
  const productsQuery = useQuery({ queryKey: ['inventory-capabilities-products'], enabled: needsProducts, queryFn: () => apiRequest<Product[]>('/products') });
  const locationsQuery = useQuery({ queryKey: ['inventory-capabilities-locations'], enabled: canReadLocations && needsLocations, queryFn: () => apiRequest<Location[]>('/storage-locations') });
  const shipmentsQuery = useQuery({ queryKey: ['inventory-capabilities-shipments'], enabled: canReadShipments && (tab === 'landed-cost' || needsCustomFieldReferences), queryFn: () => apiRequest<Shipment[]>('/shipments') });
  const suppliersQuery = useQuery({ queryKey: ['inventory-capabilities-suppliers'], enabled: canReadSuppliers && needsCustomFieldReferences, queryFn: () => apiRequest<SupplierRef[]>('/suppliers') });
  const purchaseOrdersQuery = useQuery({ queryKey: ['inventory-capabilities-purchase-orders'], enabled: canReadPurchaseOrders && needsCustomFieldReferences, queryFn: () => apiRequest<PurchaseOrderRef[]>('/purchase-orders') });

  const counts = overviewQuery.data?.counts || {};

  return (
    <div className="io-operational-page io-advanced-inventory-page" style={{ ...panelStyle, color: '#0f172a' }}>
      <section className="section capability-overview" style={{ marginTop: 0 }}>
        <div className="section__title" style={{ fontSize: 24, letterSpacing: '-0.02em', marginBottom: 10 }}>Capability overview</div>
        <div className="card capability-overview-card">
          <p className="card__subtext" style={{ marginTop: 0, maxWidth: 920 }}>
            These are optional controls for more advanced inventory workflows. Use only the capabilities your operation needs; sections you cannot access are hidden automatically.
          </p>
          <div className="card-grid capability-summary-grid">
            {visibleTabs.map((item) => (
              <div key={item.key} className="card capability-summary-card">
                <div className="card__label">{item.label}</div>
                <div className="card__value" style={{ fontSize: 22 }}>{overviewQuery.isLoading || !Object.prototype.hasOwnProperty.call(counts, item.countKey) ? '—' : String(counts[item.countKey] ?? 0)}</div>
                <div className="card__subtext">{item.metricLabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="capability-tabs" style={tabRowStyle} data-global-action-feedback-scope="navigation" aria-label="Advanced inventory sections">
        {visibleTabs.map((item) => (
          <button key={item.key} className={tab === item.key ? 'button' : 'button button--secondary'} type="button" onClick={() => setTab(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'integrations' && canReadIntegrations && <IntegrationsPanel canWrite={canGovernIntegrations} />}
      {tab === 'serials' && <SerialsPanel products={productsQuery.data || []} locations={locationsQuery.data || []} canWriteTracking={canWriteProducts} canReadStock={canReadStock} canRegisterSerial={canWriteProducts && canAdjustStock && canReadLocations} />}
      {tab === 'uom' && <UomPanel products={productsQuery.data || []} canWrite={canWriteProducts} />}
      {tab === 'custom-fields' && <CustomFieldsPanel
        products={productsQuery.data || []}
        suppliers={suppliersQuery.data || []}
        locations={locationsQuery.data || []}
        shipments={shipmentsQuery.data || []}
        purchaseOrders={purchaseOrdersQuery.data || []}
        readPermissions={{ product: true, supplier: canReadSuppliers, storage_location: canReadLocations, shipment: canReadShipments, purchase_order: canReadPurchaseOrders }}
        writePermissions={{ product: canWriteProducts, supplier: canWriteSuppliers, storage_location: canWriteLocations, shipment: canWriteShipments, purchase_order: canWritePurchaseOrders }}
      />}
      {tab === 'landed-cost' && canReadShipments && <LandedCostPanel shipments={shipmentsQuery.data || []} canWrite={canWriteProducts} />}
      {tab === 'variants' && <VariantsPanel products={productsQuery.data || []} canWrite={canWriteProducts} onChanged={() => queryClient.invalidateQueries({ queryKey: ['inventory-capabilities-products'] })} />}
      {tab === 'hierarchy' && canReadLocations && <HierarchyPanel locations={locationsQuery.data || []} canWrite={canWriteLocations} />}
      {tab === 'bom' && <BomPanel products={productsQuery.data || []} locations={locationsQuery.data || []} canWrite={canWriteProducts} canExecute={canAdjustStock && canReadLocations} />}
      {tab === 'mobile' && canUseMobileExecution && <MobilePanel canOpenScanner={canOpenScanner} />}
    </div>
  );
}

const API_SCOPE_OPTIONS = [
  { value: 'products:read', label: 'Read products' },
  { value: 'products:write', label: 'Create products' },
  { value: 'stock:read', label: 'Read stock' },
  { value: 'suppliers:read', label: 'Read suppliers' },
  { value: 'suppliers:write', label: 'Create suppliers' },
  { value: 'purchase_orders:read', label: 'Read purchase orders' },
  { value: 'purchase_orders:write', label: 'Create purchase orders' },
  { value: 'shipments:write', label: 'Create shipments' },
  { value: 'events:write', label: 'Submit integration events' }
] as const;
const DEFAULT_API_SCOPES = ['products:read', 'stock:read'];

function IntegrationsPanel({ canWrite }: { canWrite: boolean }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [apiScopes, setApiScopes] = useState<string[]>(DEFAULT_API_SCOPES);
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
    mutationFn: () => apiRequest<ApiClient & { api_key: string }>('/inventory-capabilities/api-clients', { method: 'POST', body: JSON.stringify({ name, description, scopes: apiScopes }) }),
    onSuccess: (data) => { setRevealedKey(data.api_key); setName(''); setDescription(''); setApiScopes(DEFAULT_API_SCOPES); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-api-clients'] }); },
    onError: (err) => setError(messageFrom(err, 'Unable to create API client.'))
  });
  const revokeClient = useMutation({
    mutationFn: (id: string) => apiRequest(`/inventory-capabilities/api-clients/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason: 'Revoked from tenant Integrations page' }) }),
    onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['inventory-api-clients'] }); },
    onError: (err) => setError(messageFrom(err, 'Unable to revoke API key.'))
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
      <div className="section__title">APIs & integrations</div>
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
          <fieldset style={{ gridColumn: '1 / -1', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc' }} disabled={!canWrite}>
            <legend>API permissions</legend>
            <p className="card__subtext">Starts read-only. Enable write permissions only for systems that genuinely need them.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{API_SCOPE_OPTIONS.map((scope) => <label key={scope.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={apiScopes.includes(scope.value)} onChange={(event) => setApiScopes((current) => event.target.checked ? Array.from(new Set([...current, scope.value])) : current.filter((value) => value !== scope.value))} />{scope.label}</label>)}</div>
          </fieldset>
          <div style={{ alignSelf: 'end' }}><button className="button" disabled={!canWrite || !name.trim() || apiScopes.length === 0 || createClient.isPending}>Create API key</button></div>
        </form>
        <div style={tableWrapStyle}>
          <table><thead><tr><th>Name</th><th>Prefix</th><th>Scopes</th><th>Last used</th><th>Status</th><th /></tr></thead><tbody>
            {!(clients.data || []).length ? <EmptyTableRow colSpan={6} message="No API keys have been created yet." /> : null}{(clients.data || []).map((client) => <tr key={client.id}><td>{client.name}</td><td>{client.key_prefix}</td><td>{client.scopes?.join(', ')}</td><td>{formatDate(client.last_used_at)}</td><td>{client.status}</td><td>{client.status === 'active' && canWrite ? <button className="button button--secondary" type="button" disabled={revokeClient.isPending} onClick={() => { if (window.confirm(`Revoke API key ${client.name}? Systems using it will stop working immediately.`)) revokeClient.mutate(client.id); }}>{revokeClient.isPending ? 'Revoking…' : 'Revoke'}</button> : null}</td></tr>)}
          </tbody></table>
        </div>
      </div>

      <div className="card">
        <div className="card__label">Automatic outbound notifications</div>
        <h3>Webhooks</h3>
        <p className="card__subtext">Another system can give this app an HTTPS address. When a subscribed inventory action happens, the app queues a signed notification and retries failed deliveries automatically. Use exact audit event names, or <strong>*</strong> for every tenant audit event.</p>
        {revealedWebhookSecret ? <div className="form-success"><strong>Copy this signing secret now. It is only shown once:</strong><br /><code style={{ wordBreak: 'break-all' }}>{revealedWebhookSecret}</code></div> : null}
        {webhookMessage ? <div className="form-success">{webhookMessage}</div> : null}
        <form onSubmit={(e) => { e.preventDefault(); createWebhook.mutate(); }} style={formGridStyle}>
          <label>Name<input value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder="Head office events" disabled={!canWrite} /></label>
          <label>HTTPS destination<input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://example.com/inventory-webhook" disabled={!canWrite} /></label>
          <label>Events<input value={webhookEvents} onChange={(e) => setWebhookEvents(e.target.value)} placeholder="purchase_order.approved,purchase_order.completed" disabled={!canWrite} /></label>
          <div style={{ alignSelf: 'end' }}><button className="button" disabled={!canWrite || !webhookName.trim() || !webhookUrl.trim() || !webhookEvents.trim() || createWebhook.isPending}>Create webhook</button></div>
        </form>
        <div style={tableWrapStyle}><table><thead><tr><th>Name</th><th>Destination</th><th>Events</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {!(webhooks.data || []).length ? <EmptyTableRow colSpan={5} message="No webhooks are configured yet." /> : null}{(webhooks.data || []).map((row) => <tr key={row.id}><td>{row.display_name}</td><td style={{ maxWidth: 320, wordBreak: 'break-all' }}>{row.destination_reference}</td><td>{row.event_types.join(', ')}</td><td>{row.status}</td><td><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{canWrite ? <><button className="button button--secondary" type="button" disabled={testWebhook.isPending || rotateWebhook.isPending || changeWebhookStatus.isPending} onClick={() => testWebhook.mutate(row.id)}>{testWebhook.isPending ? 'Testing…' : 'Test'}</button><button className="button button--secondary" type="button" disabled={testWebhook.isPending || rotateWebhook.isPending || changeWebhookStatus.isPending} onClick={() => rotateWebhook.mutate(row.id)}>{rotateWebhook.isPending ? 'Rotating…' : 'Rotate secret'}</button><button className="button button--secondary" type="button" disabled={testWebhook.isPending || rotateWebhook.isPending || changeWebhookStatus.isPending} onClick={() => changeWebhookStatus.mutate({ id: row.id, status: row.status === 'configured' ? 'disabled' : 'configured' })}>{changeWebhookStatus.isPending ? 'Saving…' : row.status === 'configured' ? 'Disable' : 'Enable'}</button></> : null}</div></td></tr>)}
        </tbody></table></div>
        <h4>Recent delivery attempts</h4>
        <div style={tableWrapStyle}><table><thead><tr><th>Webhook</th><th>Event</th><th>Status</th><th>Attempts</th><th>HTTP</th><th>Created</th></tr></thead><tbody>
          {!(deliveries.data || []).length ? <EmptyTableRow colSpan={6} message="No webhook delivery attempts yet." /> : null}{(deliveries.data || []).map((row) => <tr key={row.id}><td>{row.subscription_name || row.subscription_id}</td><td>{row.event_type}</td><td>{row.event_status}</td><td>{row.attempt_count}</td><td>{row.response_status ?? '-'}</td><td>{formatDate(row.created_at)}</td></tr>)}
        </tbody></table></div>
      </div>

      <div className="card">
        <div className="card__label">Known external systems</div>
        <h3>Connection registry</h3>
        <p className="card__subtext">Record an ERP, accounting, e-commerce, WMS, or custom system your company uses. Saving this entry documents the connection details; it does not start synchronization by itself.</p>
        <form onSubmit={(e) => { e.preventDefault(); saveConnection.mutate(); }} style={formGridStyle}>
          <label>System name<input value={systemName} onChange={(e) => setSystemName(e.target.value)} placeholder="SAP Business One" disabled={!canWrite} /></label>
          <label>Type<select value={systemType} onChange={(e) => setSystemType(e.target.value)} disabled={!canWrite}><option value="custom">Custom</option><option value="erp">ERP</option><option value="accounting">Accounting</option><option value="ecommerce">E-commerce</option><option value="wms">WMS</option></select></label>
          <label>Base URL<input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://..." disabled={!canWrite} /></label>
          <label>Direction<select value={direction} onChange={(e) => setDirection(e.target.value)} disabled={!canWrite}><option value="bidirectional">Both directions</option><option value="inbound">Into inventory app</option><option value="outbound">Out of inventory app</option></select></label>
          <label>Credential reference (not a password)<input value={credentialReference} onChange={(e) => setCredentialReference(e.target.value)} placeholder="Secret-manager reference" disabled={!canWrite} /></label>
          <div style={{ alignSelf: 'end' }}><button className="button" disabled={!canWrite || !systemName.trim() || saveConnection.isPending}>Save connection</button></div>
        </form>
        <div style={tableWrapStyle}><table><thead><tr><th>System</th><th>Type</th><th>Direction</th><th>Status</th></tr></thead><tbody>{!(connections.data || []).length ? <EmptyTableRow colSpan={4} message="No external systems are recorded yet." /> : null}{(connections.data || []).map((row) => <tr key={row.id}><td>{row.system_name}</td><td>{row.system_type}</td><td>{row.direction}</td><td>{row.status}</td></tr>)}</tbody></table></div>
      </div>
    </section>
  );
}

function ProductSelect({ products, value, onChange, label = 'Product' }: { products: Product[]; value: string; onChange: (id: string) => void; label?: string }) {
  return <label>{label}<select value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></label>;
}

function SerialsPanel({ products, locations, canWriteTracking, canReadStock, canRegisterSerial }: { products: Product[]; locations: Location[]; canWriteTracking: boolean; canReadStock: boolean; canRegisterSerial: boolean }) {
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [settings, setSettings] = useState<TrackingSettings>({ serial_tracking_enabled: false, serial_uniqueness_scope: 'product', require_serial_on_receipt: false, require_serial_on_issue: false });
  const [serialNumber, setSerialNumber] = useState('');
  const [locationId, setLocationId] = useState('');
  const [inventoryLotId, setInventoryLotId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const settingsQuery = useQuery({ queryKey: ['tracking-settings', productId], enabled: Boolean(productId), queryFn: () => apiRequest<TrackingSettings>(`/inventory-capabilities/products/${productId}/tracking`) });
  useEffect(() => { if (settingsQuery.data) setSettings(settingsQuery.data); }, [settingsQuery.data]);
  const serialsQuery = useQuery({ queryKey: ['inventory-serials', productId], enabled: canReadStock, queryFn: () => apiRequest<SerialRecord[]>(`/inventory-capabilities/serials${productId ? `?product_id=${encodeURIComponent(productId)}` : ''}`) });
  const lotsQuery = useQuery({
    queryKey: ['serial-registration-lots', productId, locationId],
    enabled: Boolean(canReadStock && productId && locationId && settings.serial_tracking_enabled),
    queryFn: () => apiRequest<SerialRegistrationLot[]>(`/stock/lots?product_id=${encodeURIComponent(productId)}&storage_location_id=${encodeURIComponent(locationId)}&condition=available`)
  });
  const saveSettings = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/products/${productId}/tracking`, { method: 'PUT', body: JSON.stringify(settings) }), onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['tracking-settings', productId] }); }, onError: (e) => setError(messageFrom(e, 'Unable to save tracking settings.')) });
  const addSerial = useMutation({
    mutationFn: () => apiRequest('/inventory-capabilities/serials', { method: 'POST', body: JSON.stringify({ product_id: productId, serial_number: serialNumber, storage_location_id: locationId, inventory_lot_id: inventoryLotId, status: 'available' }) }),
    onSuccess: () => { setSerialNumber(''); setError(null); void Promise.all([qc.invalidateQueries({ queryKey: ['inventory-serials'] }), qc.invalidateQueries({ queryKey: ['serial-registration-lots'] })]); },
    onError: (e) => setError(messageFrom(e, 'Unable to register serial against existing stock.'))
  });

  const changeProduct = (value: string) => {
    setProductId(value);
    setLocationId('');
    setInventoryLotId('');
  };
  const changeLocation = (value: string) => {
    setLocationId(value);
    setInventoryLotId('');
  };
  const lotLabel = (lot: SerialRegistrationLot) => {
    const identity = [lot.lot_number ? `Lot ${lot.lot_number}` : null, lot.batch_number ? `Batch ${lot.batch_number}` : null].filter(Boolean).join(' · ') || 'Unnumbered lot';
    return `${identity} — ${Number(lot.quantity).toLocaleString()} on hand`;
  };

  return <section className="section" style={panelStyle}><div className="section__title">Serial-number tracking</div>
    <div className="card"><div style={formGridStyle}><ProductSelect products={products} value={productId} onChange={changeProduct} />
      <label><input type="checkbox" checked={settings.serial_tracking_enabled} onChange={(e) => setSettings({ ...settings, serial_tracking_enabled: e.target.checked, require_serial_on_receipt: e.target.checked ? settings.require_serial_on_receipt : false, require_serial_on_issue: e.target.checked ? settings.require_serial_on_issue : false })} disabled={!canWriteTracking || !productId} /> Enable serial tracking</label>
      <label>Uniqueness<select value={settings.serial_uniqueness_scope} onChange={(e) => setSettings({ ...settings, serial_uniqueness_scope: e.target.value as 'product' | 'tenant' })} disabled={!canWriteTracking || !productId || !settings.serial_tracking_enabled}><option value="product">Unique within product</option><option value="tenant">Unique across tenant</option></select></label>
      <label><input type="checkbox" checked={settings.require_serial_on_receipt} onChange={(e) => setSettings({ ...settings, require_serial_on_receipt: e.target.checked })} disabled={!canWriteTracking || !productId || !settings.serial_tracking_enabled} /> Require on receipt</label>
      <label><input type="checkbox" checked={settings.require_serial_on_issue} onChange={(e) => setSettings({ ...settings, require_serial_on_issue: e.target.checked })} disabled={!canWriteTracking || !productId || !settings.serial_tracking_enabled} /> Require on issue</label>
      <div style={{ alignSelf: 'end' }}><button className="button" type="button" disabled={!canWriteTracking || !productId || saveSettings.isPending} onClick={() => saveSettings.mutate()}>{saveSettings.isPending ? 'Saving…' : 'Save tracking'}</button></div>
    </div><p className="card__subtext capability-help">Receipt and issue requirements apply only while serial tracking is enabled.</p>{error ? <div className="form-error">{error}</div> : null}</div>
    <div className="card"><h3>Register serial for existing stock</h3><p className="muted">This assigns a serial identity to an item that is already on hand. Choose the exact location and inventory lot. Reservation, issue, damage, quarantine and return states are changed only by their real inventory workflows.</p>{!canReadStock ? <div className="form-error">Stock read permission is required to view serial inventory.</div> : null}{canReadStock && !canRegisterSerial ? <div className="form-error">Product write and stock adjust permissions are required to register a serial against existing inventory.</div> : null}<form onSubmit={(e) => { e.preventDefault(); addSerial.mutate(); }} style={formGridStyle}>
      <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Serial number" disabled={!canRegisterSerial} />
      <select value={locationId} onChange={(e) => changeLocation(e.target.value)} disabled={!canRegisterSerial || !productId}><option value="">Select stock location…</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
      <select value={inventoryLotId} onChange={(e) => setInventoryLotId(e.target.value)} disabled={!canRegisterSerial || !locationId || lotsQuery.isLoading}><option value="">Select inventory lot…</option>{(lotsQuery.data || []).map((lot) => <option key={lot.id} value={lot.id}>{lotLabel(lot)}</option>)}</select>
      <button className="button" disabled={!canRegisterSerial || !productId || !serialNumber.trim() || !locationId || !inventoryLotId || !settings.serial_tracking_enabled || addSerial.isPending}>{addSerial.isPending ? 'Registering…' : 'Register serial'}</button>
    </form>{lotsQuery.isError ? <div className="form-error">{messageFrom(lotsQuery.error, 'Unable to load eligible inventory lots.')}</div> : null}{canReadStock && locationId && !lotsQuery.isLoading && !lotsQuery.isError && !(lotsQuery.data || []).length ? <div className="muted">No available on-hand lot exists at this location. Receive or count stock first; serial registration never creates quantity.</div> : null}</div>
    {canReadStock ? <div className="card" style={tableWrapStyle}><table><thead><tr><th>Serial</th><th>Product</th><th>Status</th><th>Location</th><th>Lot / batch</th><th>Updated</th></tr></thead><tbody>{!(serialsQuery.data || []).length ? <EmptyTableRow colSpan={6} message="No serial identities match the current product selection." /> : null}{(serialsQuery.data || []).map((serial) => <tr key={serial.id}><td>{serial.serial_number}</td><td>{serial.product_sku} — {serial.product_name}</td><td>{serial.status}</td><td>{serial.storage_location_name || '-'}</td><td>{[serial.lot_number ? `Lot ${serial.lot_number}` : null, serial.batch_number ? `Batch ${serial.batch_number}` : null].filter(Boolean).join(' · ') || '-'}</td><td>{formatDate(serial.updated_at)}</td></tr>)}</tbody></table></div> : null}
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
  const save = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/products/${productId}/uom`, { method: 'POST', body: JSON.stringify({ uom_code: code, uom_name: name || null, factor_to_base: Number(factor), purchase_uom: purchase, issue_uom: issue }) }), onSuccess: () => { setCode(''); setName(''); setFactor(''); setPurchase(false); setIssue(false); setConverted(null); setError(null); void qc.invalidateQueries({ queryKey: ['uom', productId] }); }, onError: (e) => setError(messageFrom(e, 'Unable to save UoM.')) });
  const remove = useMutation({ mutationFn: (id: string) => apiRequest(`/inventory-capabilities/uom/${id}`, { method: 'DELETE' }), onSuccess: () => { setConverted(null); setError(null); void qc.invalidateQueries({ queryKey: ['uom', productId] }); }, onError: (e) => setError(messageFrom(e, 'Unable to delete UoM conversion.')) });
  const convert = useMutation({ mutationFn: () => apiRequest<{ converted_quantity: number }>(`/inventory-capabilities/products/${productId}/uom/convert`, { method: 'POST', body: JSON.stringify({ from_uom: fromUom, to_uom: toUom, quantity: Number(convertQty) }) }), onSuccess: (data) => { setConverted(String(data.converted_quantity)); setError(null); }, onError: (e) => setError(messageFrom(e, 'Unable to convert quantity.')) });
  const units = useMemo(() => productId && query.data ? [query.data.base_uom, ...query.data.conversions.map((r) => r.uom_code)] : [], [productId, query.data]);
  useEffect(() => { if (units.length && !fromUom) { setFromUom(units[0]); setToUom(units[1] || units[0]); } }, [units, fromUom]);
  const changeProduct = (id: string) => { setProductId(id); setFromUom(''); setToUom(''); setConverted(null); setError(null); };
  return <section className="section" style={panelStyle}><div className="section__title">Units of measure</div>
    <div className="card"><p className="card__subtext capability-help">Define alternate units such as CASE or BOX as a number of the product&apos;s base unit. The base unit itself must not be added as a conversion.</p><div style={formGridStyle}><ProductSelect products={products} value={productId} onChange={changeProduct} /><label>UoM code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CASE" disabled={!canWrite} /></label><label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Case" disabled={!canWrite} /></label><label>Units in base unit<input type="number" step="any" min="0.000001" value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="24" disabled={!canWrite} /></label><label><input type="checkbox" checked={purchase} onChange={(e) => setPurchase(e.target.checked)} disabled={!canWrite} /> Purchasing unit</label><label><input type="checkbox" checked={issue} onChange={(e) => setIssue(e.target.checked)} disabled={!canWrite} /> Issue/selling unit</label><button className="button" type="button" disabled={!canWrite || !productId || !code.trim() || asNumber(factor) <= 0 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save conversion'}</button></div>{error ? <div className="form-error">{error}</div> : null}</div>
    <div className="card"><h3>Conversion test</h3><div style={formGridStyle}><label>Quantity<input type="number" step="any" value={convertQty} onChange={(e) => { setConvertQty(e.target.value); setConverted(null); }} /></label><label>From unit<select value={fromUom} onChange={(e) => { setFromUom(e.target.value); setConverted(null); }}>{units.map((u) => <option key={u}>{u}</option>)}</select></label><label>To unit<select value={toUom} onChange={(e) => { setToUom(e.target.value); setConverted(null); }}>{units.map((u) => <option key={u}>{u}</option>)}</select></label><button className="button button--secondary" type="button" disabled={!productId || !fromUom || !toUom || convert.isPending} onClick={() => convert.mutate()}>{convert.isPending ? 'Converting…' : 'Convert'}</button>{converted !== null ? <strong className="capability-result">Result: {converted} {toUom}</strong> : null}</div></div>
    <div className="card" style={tableWrapStyle}><table><thead><tr><th>Unit</th><th>Factor to base</th><th>Purchase</th><th>Issue</th><th>Action</th></tr></thead><tbody>{productId ? <tr><td>{query.data?.base_uom || '—'} <span className="capability-base-badge">Base</span></td><td>1</td><td>—</td><td>—</td><td>—</td></tr> : <EmptyTableRow colSpan={5} message="Select a product to view its units of measure." />}{(query.data?.conversions || []).map((row) => <tr key={row.id}><td>{row.uom_code} {row.uom_name ? `— ${row.uom_name}` : ''}</td><td>{String(row.factor_to_base)}</td><td>{row.purchase_uom ? 'Yes' : 'No'}</td><td>{row.issue_uom ? 'Yes' : 'No'}</td><td>{canWrite ? <button className="button button--secondary" type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`Delete ${row.uom_code} conversion? Existing inventory quantities are not changed.`)) remove.mutate(row.id); }}>Delete</button> : '—'}</td></tr>)}</tbody></table></div>
  </section>;
}

function CustomFieldsPanel({
  products,
  suppliers,
  locations,
  shipments,
  purchaseOrders,
  readPermissions,
  writePermissions
}: {
  products: Product[];
  suppliers: SupplierRef[];
  locations: Location[];
  shipments: Shipment[];
  purchaseOrders: PurchaseOrderRef[];
  readPermissions: Record<'product' | 'supplier' | 'storage_location' | 'shipment' | 'purchase_order', boolean>;
  writePermissions: Record<'product' | 'supplier' | 'storage_location' | 'shipment' | 'purchase_order', boolean>;
}) {
  type EntityType = keyof typeof writePermissions;
  const qc = useQueryClient();
  const [entityType, setEntityType] = useState<EntityType>('product');
  const [fieldKey, setFieldKey] = useState('');
  const [label, setLabel] = useState('');
  const [dataType, setDataType] = useState('text');
  const [options, setOptions] = useState('');
  const [required, setRequired] = useState(false);
  const [entityId, setEntityId] = useState('');
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const entityConfigs: Record<EntityType, { label: string; plural: string; rows: Array<{ id: string; label: string }> }> = {
    product: { label: 'Product', plural: 'products', rows: products.map((row) => ({ id: row.id, label: `${row.sku} — ${row.name}` })) },
    supplier: { label: 'Supplier', plural: 'suppliers', rows: suppliers.map((row) => ({ id: row.id, label: row.name })) },
    storage_location: { label: 'Storage location', plural: 'storage locations', rows: locations.map((row) => ({ id: row.id, label: row.path || row.name })) },
    shipment: { label: 'Shipment', plural: 'shipments', rows: shipments.map((row) => ({ id: row.id, label: row.po_number || row.qr_code || row.id.slice(0, 8) })) },
    purchase_order: { label: 'Purchase order', plural: 'purchase orders', rows: purchaseOrders.map((row) => ({ id: row.id, label: row.po_number || row.id.slice(0, 8) })) }
  };
  const canReadProductFields = readPermissions.product;
  const canReadSupplierFields = readPermissions.supplier;
  const canReadLocationFields = readPermissions.storage_location;
  const canReadShipmentFields = readPermissions.shipment;
  const canReadPurchaseOrderFields = readPermissions.purchase_order;
  const readableEntityTypes = useMemo<EntityType[]>(() => [
    ...(canReadProductFields ? ['product' as EntityType] : []),
    ...(canReadSupplierFields ? ['supplier' as EntityType] : []),
    ...(canReadLocationFields ? ['storage_location' as EntityType] : []),
    ...(canReadShipmentFields ? ['shipment' as EntityType] : []),
    ...(canReadPurchaseOrderFields ? ['purchase_order' as EntityType] : [])
  ], [canReadLocationFields, canReadProductFields, canReadPurchaseOrderFields, canReadShipmentFields, canReadSupplierFields]);
  const config = entityConfigs[entityType];
  const canRead = readPermissions[entityType];
  const canWrite = canRead && writePermissions[entityType];

  const definitions = useQuery({
    queryKey: ['custom-field-definitions', entityType],
    enabled: canRead,
    queryFn: () => apiRequest<CustomDefinition[]>(`/inventory-capabilities/custom-fields?entity_type=${entityType}`)
  });
  const entityValues = useQuery({
    queryKey: ['custom-field-values', entityType, entityId],
    enabled: Boolean(canRead && entityId),
    queryFn: () => apiRequest<CustomValueRow[]>(`/inventory-capabilities/custom-fields/${entityType}/${entityId}`)
  });

  useEffect(() => {
    if (!canRead) {
      setEntityType(readableEntityTypes[0] || 'product');
      return;
    }
    setEntityId('');
    setValues({});
    setError(null);
  }, [canRead, entityType, readableEntityTypes]);

  useEffect(() => {
    if (!entityValues.data) return;
    const next: Record<string, string | boolean> = {};
    entityValues.data.forEach((row) => {
      next[row.field_key] = row.value === null || row.value === undefined
        ? ''
        : row.data_type === 'boolean'
          ? row.value === true
          : String(row.value);
    });
    setValues(next);
  }, [entityValues.data]);

  const saveDefinition = useMutation({
    mutationFn: () => apiRequest('/inventory-capabilities/custom-fields', {
      method: 'POST',
      body: JSON.stringify({
        entity_type: entityType,
        field_key: fieldKey,
        label,
        data_type: dataType,
        is_required: required,
        options: options.split(',').map((value) => value.trim()).filter(Boolean)
      })
    }),
    onSuccess: () => {
      setFieldKey('');
      setLabel('');
      setOptions('');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['custom-field-definitions', entityType] });
      if (entityId) void qc.invalidateQueries({ queryKey: ['custom-field-values', entityType, entityId] });
    },
    onError: (errorValue) => setError(messageFrom(errorValue, 'Unable to save custom field.'))
  });

  const saveValues = useMutation({
    mutationFn: () => apiRequest(`/inventory-capabilities/custom-fields/${entityType}/${entityId}`, {
      method: 'PUT',
      body: JSON.stringify({ values })
    }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['custom-field-values', entityType, entityId] });
    },
    onError: (errorValue) => setError(messageFrom(errorValue, 'Unable to save custom values.'))
  });

  return (
    <section className="section" style={panelStyle}>
      <div className="section__title">Custom fields</div>
      <div className="card">
        <label>
          Entity type
          <select value={entityType} onChange={(event) => setEntityType(event.target.value as EntityType)}>
            {readableEntityTypes.map((key) => <option key={key} value={key}>{entityConfigs[key].label}</option>)}
          </select>
        </label>
      </div>
      <div className="card">
        <h3>Create a {config.label.toLowerCase()} field</h3>
        <div style={formGridStyle}>
          <label>Field key<input value={fieldKey} onChange={(event) => setFieldKey(event.target.value)} placeholder="country_of_origin" /></label>
          <label>Label<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Country of origin" /></label>
          <label>Type<select value={dataType} onChange={(event) => setDataType(event.target.value)}><option value="text">Text</option><option value="number">Number</option><option value="boolean">Yes/No</option><option value="date">Date</option><option value="select">Select list</option></select></label>
          {dataType === 'select' ? <label>Options<input value={options} onChange={(event) => setOptions(event.target.value)} placeholder="Croatia, Italy, Germany" /></label> : null}
          <label><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> Required</label>
          <button className="button" type="button" disabled={!canWrite || !fieldKey.trim() || !label.trim() || (dataType === 'select' && !options.split(',').some((value) => value.trim())) || saveDefinition.isPending} onClick={() => saveDefinition.mutate()}>{saveDefinition.isPending ? 'Saving…' : 'Save field'}</button>
        </div>
        {dataType === 'select' && !options.split(',').some((value) => value.trim()) ? <div className="capability-note">A select-list field needs at least one option.</div> : null}
        {!canWrite ? <div className="card__subtext">You have read access to these fields but not permission to change this entity type.</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
      </div>
      <div className="card">
        <h3>Use fields on {config.plural}</h3>
        <label>
          {config.label}
          <select value={entityId} onChange={(event) => setEntityId(event.target.value)}>
            <option value="">Select…</option>
            {config.rows.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
          </select>
        </label>
        {(entityValues.data || []).map((row) => (
          <label key={row.definition_id} style={{ display: 'block', marginTop: 12 }}>
            {row.label}{row.is_required ? ' *' : ''}
            {row.data_type === 'boolean'
              ? <input type="checkbox" checked={values[row.field_key] === true} onChange={(event) => setValues({ ...values, [row.field_key]: event.target.checked })} />
              : row.data_type === 'select'
                ? <select value={String(values[row.field_key] || '')} onChange={(event) => setValues({ ...values, [row.field_key]: event.target.value })}><option value="">Select…</option>{(row.options || []).map((option) => <option key={option}>{option}</option>)}</select>
                : <input type={row.data_type === 'number' ? 'number' : row.data_type === 'date' ? 'date' : 'text'} value={String(values[row.field_key] || '')} onChange={(event) => setValues({ ...values, [row.field_key]: event.target.value })} />}
          </label>
        ))}
        <button className="button" style={{ marginTop: 14 }} type="button" disabled={!canWrite || !entityId || saveValues.isPending} onClick={() => saveValues.mutate()}>{saveValues.isPending ? 'Saving…' : `Save ${config.label.toLowerCase()} custom fields`}</button>
      </div>
      <div className="card" style={tableWrapStyle}>
        <table><thead><tr><th>Key</th><th>Label</th><th>Type</th><th>Required</th></tr></thead><tbody>{!(definitions.data || []).length ? <EmptyTableRow colSpan={4} message="No custom fields are configured for this entity type." /> : null}{(definitions.data || []).map((definition) => <tr key={definition.id}><td>{definition.field_key}</td><td>{definition.label}</td><td>{definition.data_type}</td><td>{definition.is_required ? 'Yes' : 'No'}</td></tr>)}</tbody></table>
      </div>
    </section>
  );
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
  const selectedShipment = shipments.find((shipment) => shipment.id === shipmentId);
  const changePreviewInput = (change: () => void) => { change(); setPreview(null); setError(null); };
  return <section className="section" style={panelStyle}><div className="section__title">Landed-cost allocation</div>
    <div className="card"><h3>Add freight, customs and insurance to received inventory cost</h3><p className="card__subtext capability-help">Preview shows how the current values will be allocated. Finalization is available only for a fully received shipment and permanently updates the affected lot unit costs.</p><div style={formGridStyle}><label>Shipment<select value={shipmentId} onChange={(e) => changePreviewInput(() => setShipmentId(e.target.value))}><option value="">Select…</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.po_number || s.id.slice(0, 8)} — {s.status}</option>)}</select></label><label>Allocation<select value={method} onChange={(e) => changePreviewInput(() => setMethod(e.target.value))}><option value="value">By item value</option><option value="quantity">By quantity</option><option value="equal">Equal per line</option></select></label><label>Freight<input type="number" min="0" step="0.01" value={freight} onChange={(e) => changePreviewInput(() => setFreight(e.target.value))} /></label><label>Customs<input type="number" min="0" step="0.01" value={customs} onChange={(e) => changePreviewInput(() => setCustoms(e.target.value))} /></label><label>Insurance<input type="number" min="0" step="0.01" value={insurance} onChange={(e) => changePreviewInput(() => setInsurance(e.target.value))} /></label><div className="capability-cost-actions"><strong>Extra cost: {total.toFixed(2)}</strong><div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}><button className="button button--secondary" type="button" disabled={!shipmentId || total <= 0 || previewMutation.isPending || finalizeMutation.isPending} onClick={() => previewMutation.mutate()}>{previewMutation.isPending ? 'Previewing…' : 'Preview'}</button><button className="button" type="button" disabled={!canWrite || !shipmentId || selectedShipment?.status !== 'received' || total <= 0 || !preview || previewMutation.isPending || finalizeMutation.isPending} onClick={() => finalizeMutation.mutate()}>{finalizeMutation.isPending ? 'Finalizing…' : 'Finalize cost'}</button></div></div></div>{shipmentId && selectedShipment?.status !== 'received' ? <div className="capability-note">You can preview this shipment, but finalization stays locked until its status is Received.</div> : null}{error ? <div className="form-error">{error}</div> : null}</div>
    {preview ? <div className="card" style={tableWrapStyle}><h3>Allocation preview — {preview.currency} {preview.total_extra_cost}</h3><table><thead><tr><th>Product</th><th>Qty</th><th>Base unit cost</th><th>Extra allocated</th><th>Landed unit cost</th></tr></thead><tbody>{preview.allocations.map((a) => <tr key={a.shipment_item_id}><td>{a.product_name}</td><td>{a.received_quantity}</td><td>{a.base_unit_cost}</td><td>{a.allocated_extra_cost}</td><td><strong>{a.landed_unit_cost}</strong></td></tr>)}</tbody></table></div> : null}
    <div className="card" style={tableWrapStyle}><h3>Finalized landed costs</h3><table><thead><tr><th>PO</th><th>Method</th><th>Extra cost</th><th>Finalized</th></tr></thead><tbody>{!(history.data || []).length ? <EmptyTableRow colSpan={4} message="No landed costs have been finalized yet." /> : null}{(history.data || []).map((row) => <tr key={row.id}><td>{row.po_number || row.shipment_id.slice(0, 8)}</td><td>{row.allocation_method}</td><td>{row.currency} {String(row.total_extra_cost)}</td><td>{formatDate(row.finalized_at)}</td></tr>)}</tbody></table></div>
  </section>;
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
  return <section className="section" style={panelStyle}><div className="section__title">Product variants</div><div className="card"><p className="card__subtext">A variant is created as a real product underneath a parent. That means existing stock, barcodes, shipments and movements can use it immediately.</p><form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} style={formGridStyle}><ProductSelect products={parents} value={parentId} onChange={setParentId} label="Parent product" /><label>Variant SKU<input value={sku} onChange={(e) => setSku(e.target.value)} /></label><label>Variant name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="T-shirt / Red / M" /></label><label>Barcode<input value={barcode} onChange={(e) => setBarcode(e.target.value)} /></label><label>Attributes<input value={attributes} onChange={(e) => setAttributes(e.target.value)} placeholder="Color=Red, Size=M" /></label><button className="button" disabled={!canWrite || !parentId || !sku.trim() || !name.trim() || create.isPending}>{create.isPending ? 'Creating…' : 'Create variant'}</button></form>{error ? <div className="form-error">{error}</div> : null}</div><div className="card" style={tableWrapStyle}><table><thead><tr><th>Parent</th><th>SKU</th><th>Variant</th><th>Attributes</th><th>Stock</th></tr></thead><tbody>{!(variants.data || []).length ? <EmptyTableRow colSpan={5} message="No product variants have been created yet." /> : null}{(variants.data || []).map((v) => <tr key={v.id}><td>{v.parent_product_name}</td><td>{v.sku}</td><td>{v.name}</td><td>{Object.entries(v.variant_attributes || {}).map(([k,val]) => `${k}: ${String(val)}`).join(', ') || '-'}</td><td>{String(v.current_stock_quantity ?? 0)}</td></tr>)}</tbody></table></div></section>;
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
  return <section className="section" style={panelStyle}><div className="section__title">Location hierarchy</div>
    <div className="card"><p className="card__subtext capability-help">Organize existing storage locations into warehouse, zone, aisle, rack, shelf, bin, or storage levels. Changing this structure does not move stock; it changes only how locations are organized and whether they are pickable.</p><div style={formGridStyle}><label>Location<select value={locationId} onChange={(e) => setLocationId(e.target.value)}><option value="">Select…</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Parent<select value={parentId} onChange={(e) => setParentId(e.target.value)}><option value="">Top level</option>{locations.filter((l) => l.id !== locationId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Type<select value={type} onChange={(e) => setType(e.target.value)}><option value="warehouse">Warehouse</option><option value="zone">Zone</option><option value="aisle">Aisle</option><option value="rack">Rack</option><option value="shelf">Shelf</option><option value="bin">Bin</option><option value="storage">Storage</option></select></label><label>Code<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WH1-A03-R02-B04" /></label><label><input type="checkbox" checked={pickable} onChange={(e) => setPickable(e.target.checked)} /> Pickable location</label><button className="button" type="button" disabled={!canWrite || !locationId || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Saving…' : 'Save hierarchy'}</button></div>{error ? <div className="form-error">{error}</div> : null}</div>
    <div className="card" style={tableWrapStyle}><table><thead><tr><th>Path</th><th>Type</th><th>Code</th><th>Stock</th><th>Pickable</th></tr></thead><tbody>{!(hierarchy.data || []).length ? <EmptyTableRow colSpan={5} message="No storage locations are available to organize." /> : null}{(hierarchy.data || []).map((l) => <tr key={l.id}><td style={{ paddingLeft: 14 + Number(l.depth || 0) * 14 }}>{l.path || l.name}</td><td>{l.location_type}</td><td>{l.location_code || '—'}</td><td>{Number(l.stock_quantity || 0).toLocaleString()}</td><td>{l.is_pickable ? 'Yes' : 'No'}</td></tr>)}</tbody></table></div>
  </section>;
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
  const selectedComponents = components.filter((component) => component.product_id);
  const componentIds = selectedComponents.map((component) => component.product_id);
  const componentsValid = selectedComponents.length > 0
    && componentIds.length === new Set(componentIds).size
    && selectedComponents.every((component) => asNumber(component.quantity) > 0 && asNumber(component.waste_percent || '0') >= 0 && asNumber(component.waste_percent || '0') <= 100);
  const create = useMutation({ mutationFn: () => apiRequest('/inventory-capabilities/boms', { method: 'POST', body: JSON.stringify({ product_id: outputProductId, name, output_quantity: Number(outputQty), components: selectedComponents.map((c) => ({ product_id: c.product_id, quantity: Number(c.quantity), waste_percent: Number(c.waste_percent || 0) })) }) }), onSuccess: () => { setMessage('BOM created successfully.'); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-boms'] }); }, onError: (e) => { setMessage(null); setError(messageFrom(e, 'Unable to create BOM.')); } });
  const execute = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/boms/${executeBomId}/execute`, { method: 'POST', body: JSON.stringify({ direction, storage_location_id: executeLocationId, output_quantity: Number(executeQty), reservation_shortfall_acknowledged: false }) }), onSuccess: () => { setMessage(`${direction === 'assemble' ? 'Assembly' : 'Disassembly'} completed and stock movements recorded.`); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-capabilities-products'] }); }, onError: (e) => { setMessage(null); setError(messageFrom(e, 'Unable to execute BOM.')); } });
  const requestExecution = () => {
    const bom = (boms.data || []).find((row) => row.id === executeBomId);
    const location = locations.find((row) => row.id === executeLocationId);
    const action = direction === 'assemble' ? 'Assemble' : 'Disassemble';
    if (!bom || !location) return;
    if (window.confirm(`${action} ${executeQty} ${bom.product_name} at ${location.name}? This will post audited stock movements immediately.`)) execute.mutate();
  };
  return <section className="section" style={panelStyle}><div className="section__title">BOM, kits, assembly and disassembly</div>
    <div className="card"><h3>Create BOM</h3><p className="card__subtext capability-help">Define which component quantities make one finished product or kit. Components must be unique and quantities must be greater than zero.</p><div style={formGridStyle}><ProductSelect products={products} value={outputProductId} onChange={setOutputProductId} label="Finished product / kit" /><label>BOM name<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>Output quantity<input type="number" min="0.000001" step="any" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} /></label></div><h4>Components</h4>{components.map((component, index) => <div key={index} className="capability-component-row" style={{ ...formGridStyle, marginBottom: 8 }}><ProductSelect products={products.filter((p) => p.id !== outputProductId)} value={component.product_id} onChange={(id) => setComponents((rows) => rows.map((r,i) => i === index ? { ...r, product_id: id } : r))} label={`Component ${index + 1}`} /><label>Quantity<input type="number" step="any" min="0.000001" value={component.quantity} onChange={(e) => setComponents((rows) => rows.map((r,i) => i === index ? { ...r, quantity: e.target.value } : r))} /></label><label>Waste %<input type="number" step="any" min="0" max="100" value={component.waste_percent} onChange={(e) => setComponents((rows) => rows.map((r,i) => i === index ? { ...r, waste_percent: e.target.value } : r))} /></label>{components.length > 1 ? <button className="button button--secondary" type="button" onClick={() => setComponents((rows) => rows.filter((_,i) => i !== index))}>Remove</button> : null}</div>)}<div className="capability-action-row"><button className="button button--secondary" type="button" onClick={() => setComponents((rows) => [...rows, { product_id: '', quantity: '1', waste_percent: '0' }])}>Add component</button><button className="button" type="button" disabled={!canWrite || !outputProductId || !name.trim() || asNumber(outputQty) <= 0 || !componentsValid || create.isPending || execute.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Creating…' : 'Create BOM'}</button></div>{selectedComponents.length > 0 && !componentsValid ? <div className="capability-note">Check for duplicate components, zero quantities, or waste percentages outside 0–100%.</div> : null}</div>
    <div className="card"><h3>Assemble / disassemble</h3><p className="card__subtext capability-help">This is a stock-changing action. The app validates permissions, available stock, reservations, lot integrity, and serial-tracking rules before posting movements.</p><div style={formGridStyle}><label>BOM<select value={executeBomId} onChange={(e) => setExecuteBomId(e.target.value)}><option value="">Select…</option>{(boms.data || []).map((b) => <option key={b.id} value={b.id}>{b.product_sku} — {b.name}</option>)}</select></label><label>Location<select value={executeLocationId} onChange={(e) => setExecuteLocationId(e.target.value)}><option value="">Select…</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>Action<select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="assemble">Assemble</option><option value="disassemble">Disassemble</option></select></label><label>Finished quantity<input type="number" min="0.000001" step="any" value={executeQty} onChange={(e) => setExecuteQty(e.target.value)} /></label><button className="button" type="button" disabled={!canExecute || !executeBomId || !executeLocationId || asNumber(executeQty) <= 0 || create.isPending || execute.isPending} onClick={requestExecution}>{execute.isPending ? (direction === 'assemble' ? 'Assembling…' : 'Disassembling…') : direction === 'assemble' ? 'Assemble stock' : 'Disassemble stock'}</button></div>{message ? <div className="form-success">{message}</div> : null}{error ? <div className="form-error">{error}</div> : null}</div>
    <div className="card" style={tableWrapStyle}><table><thead><tr><th>Output</th><th>BOM</th><th>Output qty</th><th>Components</th></tr></thead><tbody>{!(boms.data || []).length ? <EmptyTableRow colSpan={4} message="No active BOMs have been created yet." /> : null}{(boms.data || []).map((b) => <tr key={b.id}><td>{b.product_sku} — {b.product_name}</td><td>{b.name}</td><td>{String(b.output_quantity)}</td><td>{b.components.map((c) => `${c.component_sku || ''} ${c.component_name || ''} × ${String(c.quantity)}`).join('; ')}</td></tr>)}</tbody></table></div>
  </section>;
}

function MobilePanel({ canOpenScanner }: { canOpenScanner: boolean }) {
  return <section className="section" style={panelStyle}>
    <div className="section__title">Offline mobile task execution</div>
    <div className="card">
      <div className="card__label">Operational mobile mode</div>
      <h3>Mobile Execution keeps a local task snapshot and queues supported task actions while offline.</h3>
      <p className="card__subtext capability-help">Operators can start, complete, block, or unblock execution tasks while disconnected. When connectivity returns, queued actions are replayed through the normal task permissions and audit trail. Stock-changing work such as receiving, transfers, counts, and dispatch still requires connectivity so the app does not create conflicting offline inventory ledgers.</p>
      <div className="capability-action-row">
        <Link className="button" to="/mobile-execution">Open Mobile Execution</Link>
        {canOpenScanner ? <Link className="button button--secondary" to="/scanner">Open scanner</Link> : null}
      </div>
    </div>
    <div className="card">
      <div className="card__label">Installable web app foundation</div>
      <p className="card__subtext">On supported phones and tablets, the app can be installed from the browser for quicker access to the mobile workflow.</p>
      <span style={badgeStyle}>Offline queue + server replay</span>
    </div>
  </section>;
}
