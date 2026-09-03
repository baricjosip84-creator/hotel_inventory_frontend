import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../lib/api';
import { getStorageLocationMutationErrorMessage } from '../lib/storageLocationMutationError';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import { OperationalWorkspaceHero, OperationalWorkspaceMetaPill, OperationalWorkspaceStatCard, OperationalWorkspaceStatus, OperationalWorkspaceTab, OperationalWorkspaceTabs } from '../components/ui/OperationalWorkspace';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import './InventoryCapabilitiesPage.css';

type TabKey = 'integrations' | 'serials' | 'uom' | 'custom-fields' | 'landed-cost' | 'variants' | 'hierarchy' | 'bom' | 'mobile';

type Product = { id: string; sku: string; name: string; unit: string; barcode?: string | null; parent_product_id?: string | null };
type Location = { id: string; name: string; parent_location_id?: string | null; location_type?: string; location_code?: string | null; path?: string; depth?: number; is_pickable?: boolean; stock_position_count?: number | string | null; version?: number | string };
type Shipment = { id: string; po_number?: string | null; status?: string; qr_code?: string | null };
type SupplierRef = { id: string; name: string; email?: string | null };
type PurchaseOrderRef = { id: string; po_number?: string | null; status?: string };
type Overview = { counts?: Record<string, number>; priorities?: string[] };
type ApiClient = { id: string; name: string; description?: string | null; key_prefix: string; scopes: string[]; status: string; last_used_at?: string | null; created_at?: string };
type Connection = { id: string; system_name: string; system_type: string; base_url?: string | null; direction: string; status: string; credential_reference?: string | null; version: number };
type WebhookSubscription = { id: string; subscription_key: string; display_name: string; event_types: string[]; destination_reference: string; signing_secret_prefix?: string | null; status: string; version: number; created_at?: string; updated_at?: string };
type PagedResponse<T> = { items: T[]; has_more: boolean; next_cursor: string | null };
type WebhookDelivery = { id: string; subscription_id: string; subscription_name?: string | null; event_type: string; event_status: string; attempt_count: number; response_status?: number | null; error_message?: string | null; created_at: string; completed_at?: string | null };
type TrackingSettings = { serial_tracking_enabled: boolean; serial_uniqueness_scope: 'product' | 'tenant'; require_serial_on_receipt: boolean; require_serial_on_issue: boolean; version: number };
type SerialRecord = { id: string; serial_number: string; status: string; operational_status?: string | null; product_name: string; product_sku: string; storage_location_name?: string | null; inventory_lot_id?: string | null; lot_number?: string | null; batch_number?: string | null; updated_at?: string };
type SerialRegistrationLot = { id: string; product_id: string; storage_location_id: string; quantity: number | string; condition: string; operational_status?: string | null; lot_number?: string | null; batch_number?: string | null; expiry_date?: string | null };
type UomRow = { id: string; uom_code: string; uom_name?: string | null; factor_to_base: number | string; rounding_scale: number; purchase_uom: boolean; issue_uom: boolean; barcode?: string | null; version: number };
type UomResponse = { base_uom: string; conversions: UomRow[] };
type CustomDefinition = { id: string; entity_type: string; field_key: string; label: string; data_type: string; is_required: boolean; options: string[]; is_active: boolean; sort_order: number; version: number };
type CustomValueRow = Omit<CustomDefinition, 'id' | 'entity_type' | 'is_active' | 'sort_order' | 'version'> & { definition_id: string; definition_version: number; value_version: number; value: unknown; updated_at?: string | null };
type LandedAllocation = { shipment_item_id: string; product_id: string; product_name: string; sku?: string | null; product_unit?: string | null; received_quantity: number; base_unit_cost: number; allocated_extra_cost: number; landed_unit_cost: number };
type LandedPreview = { shipment: { id: string; status?: string; po_number?: string | null }; currency: string; allocation_method: string; total_extra_cost: number; preview_fingerprint: string; allocations: LandedAllocation[] };
type LandedHistory = { id: string; shipment_id: string; po_number?: string | null; allocation_method: string; currency: string; total_extra_cost: number | string; finalized_at?: string; allocations?: LandedAllocation[] };
type Variant = { id: string; parent_product_id: string; parent_product_name: string; sku: string; variant_sku?: string; name: string; barcode?: string | null; variant_attributes?: Record<string, unknown>; current_stock_quantity?: number | string };
type BomComponent = { id?: string; component_product_id?: string; product_id?: string; component_name?: string; component_sku?: string; quantity: number | string; waste_percent?: number | string };
type Bom = { id: string; product_id: string; product_name: string; product_sku: string; name: string; output_quantity: number | string; is_active: boolean; components: BomComponent[] };

const TABS: Array<{ key: TabKey; label: string; countKey: string; metricLabel: string; iconPath: string }> = [
  { key: 'integrations', label: 'APIs & integrations', countKey: 'api_clients', metricLabel: 'Active API keys', iconPath: '/system-context' },
  { key: 'serials', label: 'Serial tracking', countKey: 'active_serials', metricLabel: 'Active serial identities', iconPath: '/scanner' },
  { key: 'uom', label: 'Units of measure', countKey: 'uom_conversions', metricLabel: 'Saved conversions', iconPath: '/stock' },
  { key: 'custom-fields', label: 'Custom fields', countKey: 'custom_fields', metricLabel: 'Active field definitions', iconPath: '/tenant-settings' },
  { key: 'landed-cost', label: 'Landed cost', countKey: 'landed_cost_documents', metricLabel: 'Finalized cost records', iconPath: '/reports' },
  { key: 'variants', label: 'Variants', countKey: 'variants', metricLabel: 'Variant products', iconPath: '/products' },
  { key: 'hierarchy', label: 'Location hierarchy', countKey: 'hierarchical_locations', metricLabel: 'Nested locations', iconPath: '/storage-locations' },
  { key: 'bom', label: 'BOM & assemblies', countKey: 'active_boms', metricLabel: 'Active BOMs', iconPath: '/inventory-capabilities' },
  { key: 'mobile', label: 'Offline task mode', countKey: 'mobile_sync_batches', metricLabel: 'Offline sync batches', iconPath: '/mobile-execution' }
];

const panelStyle: CSSProperties = { display: 'grid', gap: 18 };
const formGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' };
const tableWrapStyle: CSSProperties = { overflowX: 'auto', borderRadius: 12 };
const badgeStyle: CSSProperties = { display: 'inline-flex', padding: '5px 10px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 800 };

const ADVANCED_INVENTORY_ERROR_MESSAGES: Record<string, string> = {
  VERSION_REQUIRED: 'Refresh this configuration before saving so its current version can be reviewed.',
  VERSION_INVALID: 'Refresh this configuration before saving so its current version can be reviewed.',
  VERSION_CONFLICT: 'This configuration changed after you opened it. Refresh and review the latest values before saving again.',
  PRODUCT_NOT_FOUND: 'The selected product is no longer available.',
  STORAGE_NOT_FOUND: 'The selected storage location is no longer available.',
  API_CLIENT_NAME_REQUIRED: 'Enter a name for the API client.',
  API_CLIENT_SCOPE_REQUIRED: 'Select at least one API permission.',
  API_CLIENT_SCOPE_DELEGATION_FORBIDDEN: 'You can grant only API permissions available to your current role.',
  API_CLIENT_ALREADY_EXISTS: 'An API client with this name already exists.',
  API_CLIENT_NOT_FOUND: 'This API client is no longer active or available.',
  CONNECTION_SYSTEM_REQUIRED: 'Enter a system name for the connection.',
  SERIAL_TRACKING_ACTIVE_IDENTITIES: 'Serial tracking cannot be disabled while serial identities still exist for this product.',
  SERIAL_TENANT_UNIQUENESS_CONFLICT: 'Existing serial identities conflict with tenant-wide uniqueness.',
  SERIAL_CURSOR_INVALID: 'The serial registry page is no longer valid. Reload the registry.',
  SERIAL_NUMBER_REQUIRED: 'Enter a serial number.',
  SERIAL_TRACKING_DISABLED: 'Enable serial tracking for this product first.',
  SERIAL_MANUAL_STATUS_FORBIDDEN: 'Manual serial registration can create only available serials.',
  INVENTORY_LOT_NOT_FOUND: 'The selected inventory lot is no longer available.',
  SERIAL_LOT_CONTEXT_MISMATCH: 'The selected lot no longer matches this product and location.',
  SERIAL_LOT_NOT_AVAILABLE: 'Manual serial registration requires an available inventory lot.',
  SERIAL_LOT_EXPIRED: 'A serial cannot be registered against expired inventory.',
  SERIAL_LOT_QUANTITY_NOT_WHOLE: 'A serial-tracked inventory lot must contain a positive whole-number quantity.',
  SERIAL_LOT_FULLY_IDENTIFIED: 'This lot already has serial identities for its full physical quantity.',
  SERIAL_ALREADY_EXISTS: 'This serial number already exists for the product.',
  SERIAL_NOT_FOUND: 'The selected serial identity is no longer available.',
  UOM_CODE_REQUIRED: 'Enter a unit-of-measure code.',
  UOM_BASE_UNIT_CONFLICT: 'The product base unit is already represented and cannot be saved as a conversion.',
  UOM_BARCODE_CONFLICT: 'This unit of measure or barcode is already configured.',
  UOM_NOT_FOUND: 'The selected unit-of-measure conversion is no longer available.',
  QUANTITY_INVALID: 'Enter a valid quantity.',
  UOM_CONVERSION_NOT_FOUND: 'One of the selected units of measure is not configured for this product.',
  CUSTOM_FIELD_ENTITY_INVALID: 'This type of record does not support custom fields.',
  CUSTOM_FIELD_TYPE_INVALID: 'Select a supported custom-field type.',
  CUSTOM_FIELD_REQUIRED: 'Enter both a field key and a label.',
  CUSTOM_FIELD_REQUIRED_DATA_MISSING: 'This field cannot become required while existing records are missing a value.',
  CUSTOM_FIELD_ENTITY_NOT_FOUND: 'The selected record for custom fields is no longer available.',
  CUSTOM_FIELD_NOT_FOUND: 'One of the custom fields is no longer configured.',
  INVALID_IDENTIFIER: 'One of the supplied values is invalid.',
  INVALID_NUMBER: 'One of the supplied values is invalid.',
  LANDED_COST_CHARGES_REQUIRED: 'Add at least one landed-cost charge.',
  LANDED_COST_TOTAL_INVALID: 'The total landed cost must be greater than zero.',
  SHIPMENT_NOT_FOUND: 'The selected shipment is no longer available.',
  LANDED_COST_CURRENCY_REQUIRED: 'A valid three-letter inventory currency is required.',
  LANDED_COST_CURRENCY_CONVERSION_REQUIRED: 'Landed cost must use the tenant inventory currency.',
  LANDED_COST_NO_ITEMS: 'This shipment has no items available for landed-cost allocation.',
  LANDED_COST_BASE_COST_MISSING: 'Every shipment item needs a unit cost before landed cost can be finalized.',
  LANDED_COST_PREVIEW_STALE: 'The landed-cost preview changed. Review the latest allocation before finalizing.',
  LANDED_COST_SHIPMENT_NOT_RECEIVED: 'Landed cost can be finalized only after the shipment is fully received.',
  LANDED_COST_ALREADY_FINALIZED: 'This shipment already has finalized landed cost.',
  VARIANT_PARENT_INVALID: 'A variant cannot be used as the parent of another variant.',
  VARIANT_REQUIRED_FIELDS: 'Enter both a variant SKU and variant name.',
  LOCATION_HIERARCHY_CYCLE: 'A location cannot be its own parent.',
  LOCATION_TYPE_INVALID: 'Select a supported location type.',
  WAREHOUSE_PARENT_NOT_ALLOWED: 'A warehouse must stay at the top level of the location hierarchy.',
  LOCATION_PARENT_MUST_BE_CONTAINER: 'The selected parent location cannot contain child locations.',
  LOCATION_HIERARCHY_ORDER_INVALID: 'The hierarchy must move from broader to more specific location levels.',
  LOCATION_LEAF_HAS_CHILDREN: 'A bin or storage-level location cannot contain child locations.',
  BOM_COMPONENTS_REQUIRED: 'Add at least one BOM component.',
  BOM_COMPONENT_DUPLICATE: 'A product can appear only once in a BOM.',
  BOM_SELF_REFERENCE: 'A product cannot be its own BOM component.',
  BOM_NOT_FOUND: 'The selected active BOM is no longer available.',
  BOM_PRODUCT_ARCHIVED: 'BOM execution is blocked because its output product or a component is archived.',
  BOM_SERIAL_MAPPING_REQUIRED: 'Serial-tracked BOM execution requires an exact serial-aware assembly workflow.',
  BOM_USER_REQUIRED: 'BOM execution requires a tenant user account.',
  MOBILE_SYNC_REQUIRED: 'Device, request and operation information is required for offline synchronization.',
  MOBILE_SYNC_USER_REQUIRED: 'Offline synchronization requires a tenant user account.',
  WEBHOOK_CURSOR_INVALID: 'The webhook page is no longer valid. Reload the webhook registry.',
  WEBHOOK_EVENTS_REQUIRED: 'Select at least one webhook event.',
  WEBHOOK_EVENT_INVALID: 'One or more webhook event names are invalid.',
  WEBHOOK_KEY_REQUIRED: 'Enter a webhook key.',
  WEBHOOK_URL_INVALID: 'Enter a valid webhook destination URL.',
  WEBHOOK_SECRET_UNAVAILABLE: 'Rotate the webhook signing secret before delivery can run.',
  WEBHOOK_NAME_REQUIRED: 'Enter a webhook name.',
  WEBHOOK_KEY_CONFLICT: 'A webhook with this key already exists.',
  WEBHOOK_NOT_FOUND: 'The selected webhook is no longer available.',
  WEBHOOK_DESTINATION_BLOCKED: 'Private or local webhook destinations are not allowed.',
  WEBHOOK_DISABLED: 'This webhook is not configured for delivery.'
};

function messageFrom(error: unknown, fallback: string, ui?: (text: string) => string): string {
  if (error instanceof ApiError) {
    if (error.code === 'CUSTOM_FIELD_VALUE_REQUIRED') {
      const suffix = ' is required';
      const label = error.message.endsWith(suffix) ? error.message.slice(0, -suffix.length) : '';
      return label && ui ? `${label} — ${ui('A value is required.')}` : (ui ? ui('A value is required.') : 'A value is required.');
    }
    if (error.code === 'CUSTOM_FIELD_VALUE_INVALID') {
      const suffixes = [' must be a number', ' must be yes or no', ' must be a valid date', ' must use a configured option'];
      const suffix = suffixes.find((candidate) => error.message.endsWith(candidate));
      const label = suffix ? error.message.slice(0, -suffix.length) : '';
      return label && ui ? `${label} — ${ui('The value is not valid for this field.')}` : (ui ? ui('The value is not valid for this field.') : 'The value is not valid for this field.');
    }
    const knownMessage = error.code ? ADVANCED_INVENTORY_ERROR_MESSAGES[error.code] : undefined;
    if (knownMessage) return ui ? ui(knownMessage) : knownMessage;
    return error.message;
  }
  return fallback;
}

function formatDate(value: string | null | undefined, locale: Parameters<typeof formatLocalizedDateTime>[1]): string {
  return formatLocalizedDateTime(value, locale);
}

function formatReadableText(value: string | null | undefined): string {
  if (!value) return '—';
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}


const CANONICAL_DISPLAY_LABELS: Record<string, string> = {
  active: 'Active',
  available: 'Available',
  reserved: 'Reserved',
  issued: 'Issued',
  damaged: 'Damaged',
  quarantine: 'Quarantine',
  retired: 'Retired',
  configured: 'Configured',
  disabled: 'Disabled',
  pending: 'Pending',
  queued: 'Queued',
  blocked: 'Blocked',
  delivered: 'Delivered',
  failed: 'Failed',
  received: 'Received',
  custom: 'Custom',
  erp: 'ERP',
  accounting: 'Accounting',
  ecommerce: 'E-commerce',
  wms: 'WMS',
  bidirectional: 'Both directions',
  inbound: 'Into inventory app',
  outbound: 'Out of inventory app',
  boolean: 'Yes/No',
  select: 'Select list',
  number: 'Number',
  date: 'Date',
  text: 'Text',
  value: 'By item value',
  quantity: 'By quantity',
  equal: 'Equal per line',
  warehouse: 'Warehouse',
  zone: 'Zone',
  aisle: 'Aisle',
  rack: 'Rack',
  shelf: 'Shelf',
  bin: 'Bin',
  storage: 'Storage'
};

function displayCanonicalLabel(value: string | null | undefined, ui: (text: string) => string): string {
  if (!value) return '—';
  return ui(CANONICAL_DISPLAY_LABELS[value] ?? formatReadableText(value));
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
  const { ui } = useAppTranslation();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('serials');

  const canReadProducts = hasPermission(TENANT_PERMISSIONS.PRODUCTS_READ);
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
    if (item.key === 'serials' || item.key === 'uom' || item.key === 'variants' || item.key === 'bom') return canReadProducts;
    if (item.key === 'custom-fields') return canReadProducts || canReadSuppliers || canReadLocations || canReadShipments || canReadPurchaseOrders;
    if (item.key === 'landed-cost') return canReadProducts && canReadShipments;
    if (item.key === 'hierarchy') return canReadLocations;
    if (item.key === 'mobile') return canUseMobileExecution;
    return false;
  }), [canReadIntegrations, canReadLocations, canReadProducts, canReadPurchaseOrders, canReadShipments, canReadSuppliers, canUseMobileExecution]);

  useEffect(() => {
    if (!visibleTabs.some((item) => item.key === tab)) {
      setTab(visibleTabs[0]?.key || 'serials');
    }
  }, [tab, visibleTabs]);

  const needsProducts = ['serials', 'uom', 'custom-fields', 'variants', 'bom'].includes(tab);
  const needsLocations = ['serials', 'custom-fields', 'bom'].includes(tab);
  const needsCustomFieldReferences = tab === 'custom-fields';

  const overviewQuery = useQuery({ queryKey: ['inventory-capabilities-overview'], queryFn: () => apiRequest<Overview>('/inventory-capabilities/overview') });
  const productsQuery = useQuery({ queryKey: ['inventory-capabilities-products'], enabled: canReadProducts && needsProducts, queryFn: () => apiRequest<Product[]>('/products') });
  const locationsQuery = useQuery({ queryKey: ['inventory-capabilities-locations'], enabled: canReadLocations && needsLocations, queryFn: () => apiRequest<Location[]>('/storage-locations') });
  const shipmentsQuery = useQuery({ queryKey: ['inventory-capabilities-shipments'], enabled: canReadShipments && (tab === 'landed-cost' || needsCustomFieldReferences), queryFn: () => apiRequest<Shipment[]>('/shipments') });
  const suppliersQuery = useQuery({ queryKey: ['inventory-capabilities-suppliers'], enabled: canReadSuppliers && needsCustomFieldReferences, queryFn: () => apiRequest<SupplierRef[]>('/suppliers') });
  const purchaseOrdersQuery = useQuery({ queryKey: ['inventory-capabilities-purchase-orders'], enabled: canReadPurchaseOrders && needsCustomFieldReferences, queryFn: () => apiRequest<PurchaseOrderRef[]>('/purchase-orders') });

  const supportingReferenceQueries = [
    canReadProducts && needsProducts ? productsQuery : null,
    canReadLocations && needsLocations ? locationsQuery : null,
    canReadShipments && (tab === 'landed-cost' || needsCustomFieldReferences) ? shipmentsQuery : null,
    canReadSuppliers && needsCustomFieldReferences ? suppliersQuery : null,
    canReadPurchaseOrders && needsCustomFieldReferences ? purchaseOrdersQuery : null
  ].filter(Boolean) as Array<{ isLoading: boolean; isError: boolean }>;
  const supportingReferencesLoading = supportingReferenceQueries.some((query) => query.isLoading);
  const supportingReferencesError = supportingReferenceQueries.some((query) => query.isError);
  const supportingReferencesReady = !supportingReferencesLoading && !supportingReferencesError;

  const counts = overviewQuery.data?.counts || {};

  return (
    <div className="io-operational-page io-advanced-inventory-page io-workspace-page" style={{ ...panelStyle, color: '#0f172a' }}>
      <OperationalWorkspaceHero
        iconPath="/inventory-capabilities"
        eyebrow={ui("Advanced inventory")}
        title={ui("Advanced inventory workspace")}
        description={ui("Optional controls for advanced inventory workflows. Use only the capabilities your operation needs; sections you cannot access are hidden automatically.")}
        meta={<>
          <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Permission-aware")}</OperationalWorkspaceMetaPill>
          <OperationalWorkspaceMetaPill>{ui("Configure only what you use")}</OperationalWorkspaceMetaPill>
        </>}
        aside={<OperationalWorkspaceStatus value={visibleTabs.length} label={ui("capability areas available to this role")} />}
      />

      <div className="card-grid capability-summary-grid io-workspace-stats" aria-label={ui("Advanced inventory capability summary")}>
        {visibleTabs.map((item) => (
          <OperationalWorkspaceStatCard
            key={item.key}
            label={ui(item.label)}
            value={overviewQuery.isLoading || !Object.prototype.hasOwnProperty.call(counts, item.countKey) ? '—' : String(counts[item.countKey] ?? 0)}
            helper={ui(item.metricLabel)}
          />
        ))}
      </div>

      <OperationalWorkspaceTabs ariaLabel={ui("Advanced inventory sections")} hint={ui("Select a capability area to configure or review.")}>
        {visibleTabs.map((item) => (
          <OperationalWorkspaceTab
            key={item.key}
            active={tab === item.key}
            iconPath={item.iconPath}
            label={ui(item.label)}
            onClick={() => setTab(item.key)}
            data-global-action-feedback-scope="navigation"
          />
        ))}
      </OperationalWorkspaceTabs>

      {supportingReferencesLoading ? <div className="card"><div className="muted">{ui("Loading supporting reference data…")}</div></div> : null}
      {supportingReferencesError ? <div className="card"><div className="form-error">{ui("Supporting reference data is unavailable. Try again before configuring this area.")}</div></div> : null}

      {tab === 'integrations' && canReadIntegrations && <IntegrationsPanel canWrite={canGovernIntegrations} />}
      {tab === 'serials' && supportingReferencesReady && <SerialsPanel products={productsQuery.data || []} locations={locationsQuery.data || []} canWriteTracking={canWriteProducts} canReadStock={canReadStock} canRegisterSerial={canWriteProducts && canReadStock && canAdjustStock && canReadLocations} />}
      {tab === 'uom' && supportingReferencesReady && <UomPanel products={productsQuery.data || []} canWrite={canWriteProducts} />}
      {tab === 'custom-fields' && supportingReferencesReady && <CustomFieldsPanel
        products={productsQuery.data || []}
        suppliers={suppliersQuery.data || []}
        locations={locationsQuery.data || []}
        shipments={shipmentsQuery.data || []}
        purchaseOrders={purchaseOrdersQuery.data || []}
        readPermissions={{ product: canReadProducts, supplier: canReadSuppliers, storage_location: canReadLocations, shipment: canReadShipments, purchase_order: canReadPurchaseOrders }}
        writePermissions={{ product: canWriteProducts, supplier: canWriteSuppliers, storage_location: canWriteLocations, shipment: canWriteShipments, purchase_order: canWritePurchaseOrders }}
      />}
      {tab === 'landed-cost' && canReadProducts && canReadShipments && supportingReferencesReady && <LandedCostPanel shipments={shipmentsQuery.data || []} canWrite={canWriteProducts} />}
      {tab === 'variants' && supportingReferencesReady && <VariantsPanel products={productsQuery.data || []} canWrite={canWriteProducts && canReadSuppliers} canReadStock={canReadStock} canWriteProducts={canWriteProducts} canReadSuppliers={canReadSuppliers} onChanged={() => queryClient.invalidateQueries({ queryKey: ['inventory-capabilities-products'] })} />}
      {tab === 'hierarchy' && canReadLocations && <HierarchyPanel canWrite={canWriteLocations} canReadStock={canReadStock} />}
      {tab === 'bom' && supportingReferencesReady && <BomPanel products={productsQuery.data || []} locations={locationsQuery.data || []} canWrite={canWriteProducts} canExecute={canAdjustStock && canReadLocations} />}
      {tab === 'mobile' && canUseMobileExecution && <MobilePanel canOpenScanner={canOpenScanner} />}
    </div>
  );
}

const API_SCOPE_OPTIONS = [
  { value: 'products:read', label: 'Read products', requiredPermission: TENANT_PERMISSIONS.PRODUCTS_READ },
  { value: 'products:write', label: 'Create products', requiredPermission: TENANT_PERMISSIONS.PRODUCTS_WRITE },
  { value: 'stock:read', label: 'Read stock', requiredPermission: TENANT_PERMISSIONS.STOCK_READ },
  { value: 'suppliers:read', label: 'Read suppliers', requiredPermission: TENANT_PERMISSIONS.SUPPLIERS_READ },
  { value: 'suppliers:write', label: 'Create suppliers', requiredPermission: TENANT_PERMISSIONS.SUPPLIERS_WRITE },
  { value: 'purchase_orders:read', label: 'Read purchase orders', requiredPermission: TENANT_PERMISSIONS.PURCHASE_ORDERS_READ },
  { value: 'purchase_orders:write', label: 'Create purchase orders', requiredPermission: TENANT_PERMISSIONS.PURCHASE_ORDERS_CREATE },
  { value: 'shipments:write', label: 'Create shipments', requiredPermission: TENANT_PERMISSIONS.SHIPMENTS_WRITE },
  { value: 'events:write', label: 'Submit integration events', requiredPermission: TENANT_PERMISSIONS.ENTERPRISE_INTEGRATIONS_GOVERN }
] as const;
const API_SCOPE_LABELS = Object.fromEntries(API_SCOPE_OPTIONS.map((scope) => [scope.value, scope.label])) as Record<string, string>;

function IntegrationsPanel({ canWrite }: { canWrite: boolean }) {
  const { locale, ui } = useAppTranslation();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [apiScopes, setApiScopes] = useState<string[]>([]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [systemName, setSystemName] = useState('');
  const [systemType, setSystemType] = useState('custom');
  const [baseUrl, setBaseUrl] = useState('');
  const [direction, setDirection] = useState('bidirectional');
  const [credentialReference, setCredentialReference] = useState('');
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState('purchase_order.approved,purchase_order.completed');
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<string | null>(null);
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);
  const [webhookRows, setWebhookRows] = useState<WebhookSubscription[]>([]);
  const [webhookNextCursor, setWebhookNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const grantableApiScopes = API_SCOPE_OPTIONS.filter((scope) => hasPermission(scope.requiredPermission));

  const clients = useQuery({ queryKey: ['inventory-api-clients'], queryFn: () => apiRequest<ApiClient[]>('/inventory-capabilities/api-clients') });
  const connections = useQuery({ queryKey: ['inventory-external-connections'], queryFn: () => apiRequest<Connection[]>('/inventory-capabilities/connections') });
  const webhooks = useQuery({ queryKey: ['inventory-webhooks'], queryFn: () => apiRequest<PagedResponse<WebhookSubscription>>('/inventory-capabilities/webhooks?paged=true&limit=100') });
  useEffect(() => { if (webhooks.data) { setWebhookRows(webhooks.data.items); setWebhookNextCursor(webhooks.data.next_cursor); } }, [webhooks.data]);
  const deliveries = useQuery({ queryKey: ['inventory-webhook-deliveries'], queryFn: () => apiRequest<WebhookDelivery[]>('/inventory-capabilities/webhook-deliveries?limit=25') });
  const createClient = useMutation({
    mutationFn: () => apiRequest<ApiClient & { api_key: string }>('/inventory-capabilities/api-clients', { method: 'POST', body: JSON.stringify({ name, description, scopes: apiScopes }) }),
    onSuccess: (data) => { setRevealedKey(data.api_key); setName(''); setDescription(''); setApiScopes([]); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-api-clients'] }); },
    onError: (err) => setError(messageFrom(err, ui("Unable to create API client."), ui))
  });
  const revokeClient = useMutation({
    mutationFn: (id: string) => apiRequest(`/inventory-capabilities/api-clients/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason: 'Revoked from tenant Integrations page' }) }),
    onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['inventory-api-clients'] }); },
    onError: (err) => setError(messageFrom(err, ui("Unable to revoke API key."), ui))
  });
  const clearConnectionForm = () => { setEditingConnection(null); setSystemName(''); setSystemType('custom'); setBaseUrl(''); setDirection('bidirectional'); setCredentialReference(''); };
  const editConnection = (row: Connection) => { setEditingConnection(row); setSystemName(row.system_name); setSystemType(row.system_type || 'custom'); setBaseUrl(row.base_url || ''); setDirection(row.direction || 'bidirectional'); setCredentialReference(row.credential_reference || ''); setError(null); };
  const saveConnection = useMutation({
    mutationFn: () => apiRequest('/inventory-capabilities/connections', { method: 'POST', body: JSON.stringify({ system_name: systemName, system_type: systemType, base_url: baseUrl || null, direction, credential_reference: credentialReference || null, expected_version: editingConnection?.version ?? 0 }) }),
    onSuccess: () => { clearConnectionForm(); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-external-connections'] }); },
    onError: (err) => setError(messageFrom(err, ui("Unable to save connection."), ui))
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
      setWebhookMessage(ui("Webhook created. Events will be queued automatically from the inventory audit trail."));
      setError(null);
      void qc.invalidateQueries({ queryKey: ['inventory-webhooks'] });
    },
    onError: (err) => setError(messageFrom(err, ui("Unable to create webhook."), ui))
  });
  const changeWebhookStatus = useMutation({
    mutationFn: ({ row, status }: { row: WebhookSubscription; status: 'configured' | 'disabled' }) => apiRequest(`/inventory-capabilities/webhooks/${row.id}`, { method: 'PATCH', body: JSON.stringify({ status }), version: row.version }),
    onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['inventory-webhooks'] }); },
    onError: (err) => setError(messageFrom(err, ui("Unable to update webhook."), ui))
  });
  const rotateWebhook = useMutation({
    mutationFn: (row: WebhookSubscription) => apiRequest<WebhookSubscription & { signing_secret: string }>(`/inventory-capabilities/webhooks/${row.id}/rotate-secret`, { method: 'POST', body: JSON.stringify({}), version: row.version }),
    onSuccess: (data) => { setRevealedWebhookSecret(data.signing_secret); setWebhookMessage(ui("Webhook secret rotated. Copy the new secret now.")); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-webhooks'] }); },
    onError: (err) => setError(messageFrom(err, ui("Unable to rotate webhook secret."), ui))
  });
  const loadMoreWebhooks = useMutation({
    mutationFn: (cursor: string) => apiRequest<PagedResponse<WebhookSubscription>>(`/inventory-capabilities/webhooks?paged=true&limit=100&cursor=${encodeURIComponent(cursor)}`),
    onSuccess: (page) => {
      setWebhookRows((current) => {
        const byId = new Map(current.map((row) => [row.id, row]));
        page.items.forEach((row) => byId.set(row.id, row));
        return Array.from(byId.values());
      });
      setWebhookNextCursor(page.next_cursor);
      setError(null);
    },
    onError: (err) => setError(messageFrom(err, ui("Unable to load more webhooks."), ui))
  });
  const testWebhook = useMutation({
    mutationFn: (id: string) => apiRequest<{ delivery_id: string; queued: boolean }>(`/inventory-capabilities/webhooks/${id}/test`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => { setWebhookMessage(ui("Test webhook queued. Delivery status will appear below.")); setError(null); setTimeout(() => void qc.invalidateQueries({ queryKey: ['inventory-webhook-deliveries'] }), 750); },
    onError: (err) => setError(messageFrom(err, ui("Unable to queue webhook test."), ui))
  });

  return (
    <section className="section" style={panelStyle}>
      <div className="section__title">{ui("APIs & integrations")}</div>
      <div className="card">
        <div className="card__label">{ui("Public API")}</div>
        <h3>{ui("Let another system talk to this inventory app")}</h3>
        <p className="card__subtext">{ui("Create an API key and give it to the company or developer connecting another system. The public base path is")} <strong>/api/public/v1</strong>.</p>
        {revealedKey ? (
          <div className="form-success"><strong>{ui("Copy this key now. It is only shown once:")}</strong><br /><code style={{ wordBreak: 'break-all' }}>{revealedKey}</code></div>
        ) : null}
        {error ? <div className="form-error">{error}</div> : null}
        <form onSubmit={(e) => { e.preventDefault(); createClient.mutate(); }} style={formGridStyle}>
          <label>{ui("Connection name")}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={ui("Company ERP")} disabled={!canWrite} /></label>
          <label>{ui("Description")}<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={ui("Used by head-office integration")} disabled={!canWrite} /></label>
          <fieldset style={{ gridColumn: '1 / -1', border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc' }} disabled={!canWrite}>
            <legend>{ui("API permissions")}</legend>
            <p className="card__subtext">{ui("Select only the API permissions this connection genuinely needs. You can grant only permissions available to your current role.")}</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>{grantableApiScopes.map((scope) => <label key={scope.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={apiScopes.includes(scope.value)} onChange={(event) => setApiScopes((current) => event.target.checked ? Array.from(new Set([...current, scope.value])) : current.filter((value) => value !== scope.value))} />{ui(scope.label)}</label>)}</div>
          </fieldset>
          <div style={{ alignSelf: 'end' }}><button className="button" disabled={!canWrite || !name.trim() || apiScopes.length === 0 || createClient.isPending}>{ui("Create API key")}</button></div>
        </form>
        <div style={tableWrapStyle}>
          <table><thead><tr><th>{ui("Name")}</th><th>{ui("Prefix")}</th><th>{ui("Scopes")}</th><th>{ui("Last used")}</th><th>{ui("Status")}</th><th /></tr></thead><tbody>
            {!clients.isLoading && !clients.isError && !(clients.data || []).length ? <EmptyTableRow colSpan={6} message={ui("No API keys have been created yet.")} /> : null}{(clients.data || []).map((client) => <tr key={client.id}><td>{client.name}</td><td>{client.key_prefix}</td><td>{client.scopes?.map((scope) => API_SCOPE_LABELS[scope] ? ui(API_SCOPE_LABELS[scope]) : ui("Unknown API permission")).join(', ')}</td><td>{formatDate(client.last_used_at, locale)}</td><td>{displayCanonicalLabel(client.status, ui)}</td><td>{client.status === 'active' && canWrite ? <button className="button button--secondary" type="button" disabled={revokeClient.isPending} onClick={() => { if (window.confirm(`${ui('Revoke API key')} ${client.name}? ${ui('Systems using it will stop working immediately.')}`)) revokeClient.mutate(client.id); }}>{revokeClient.isPending ? ui("Revoking…") : ui("Revoke")}</button> : null}</td></tr>)}
          </tbody></table>
        </div>
        {clients.isLoading ? <div className="muted">{ui("Loading API clients…")}</div> : null}
        {clients.isError ? <div className="form-error">{messageFrom(clients.error, ui("Unable to load API clients."), ui)}</div> : null}
      </div>

      <div className="card">
        <div className="card__label">{ui("Automatic outbound notifications")}</div>
        <h3>{ui("Webhooks")}</h3>
        <p className="card__subtext">{ui("Another system can give this app an HTTPS address. When a subscribed inventory action happens, the app queues a signed notification and retries failed deliveries automatically. Use exact audit event names, or")} <strong>*</strong> {ui("for every tenant audit event.")}</p>
        {revealedWebhookSecret ? <div className="form-success"><strong>{ui("Copy this signing secret now. It is only shown once:")}</strong><br /><code style={{ wordBreak: 'break-all' }}>{revealedWebhookSecret}</code></div> : null}
        {webhookMessage ? <div className="form-success">{webhookMessage}</div> : null}
        <form onSubmit={(e) => { e.preventDefault(); createWebhook.mutate(); }} style={formGridStyle}>
          <label>{ui("Name")}<input value={webhookName} onChange={(e) => setWebhookName(e.target.value)} placeholder={ui("Head office events")} disabled={!canWrite} /></label>
          <label>{ui("HTTPS destination")}<input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://example.com/inventory-webhook" disabled={!canWrite} /></label>
          <label>{ui("Events")}<input value={webhookEvents} onChange={(e) => setWebhookEvents(e.target.value)} placeholder="purchase_order.approved,purchase_order.completed" disabled={!canWrite} /></label>
          <div style={{ alignSelf: 'end' }}><button className="button" disabled={!canWrite || !webhooks.isSuccess || !webhookName.trim() || !webhookUrl.trim() || !webhookEvents.trim() || createWebhook.isPending || loadMoreWebhooks.isPending || changeWebhookStatus.isPending || rotateWebhook.isPending}>{ui("Create webhook")}</button></div>
        </form>
        <div style={tableWrapStyle}><table><thead><tr><th>{ui("Name")}</th><th>{ui("Destination")}</th><th>{ui("Events")}</th><th>{ui("Status")}</th><th>{ui("Actions")}</th></tr></thead><tbody>
          {!webhooks.isLoading && !webhooks.isError && !webhookRows.length ? <EmptyTableRow colSpan={5} message={ui("No webhooks are configured yet.")} /> : null}{webhookRows.map((row) => <tr key={row.id}><td>{row.display_name}</td><td style={{ maxWidth: 320, wordBreak: 'break-all' }}>{row.destination_reference}</td><td>{row.event_types.join(', ')}</td><td>{displayCanonicalLabel(row.status, ui)}</td><td><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{canWrite ? <><button className="button button--secondary" type="button" disabled={testWebhook.isPending || rotateWebhook.isPending || changeWebhookStatus.isPending || loadMoreWebhooks.isPending || createWebhook.isPending} onClick={() => testWebhook.mutate(row.id)}>{testWebhook.isPending ? ui("Testing…") : ui("Test")}</button><button className="button button--secondary" type="button" disabled={testWebhook.isPending || rotateWebhook.isPending || changeWebhookStatus.isPending || loadMoreWebhooks.isPending || createWebhook.isPending} onClick={() => rotateWebhook.mutate(row)}>{rotateWebhook.isPending ? ui("Rotating…") : ui("Rotate secret")}</button><button className="button button--secondary" type="button" disabled={testWebhook.isPending || rotateWebhook.isPending || changeWebhookStatus.isPending || loadMoreWebhooks.isPending || createWebhook.isPending} onClick={() => changeWebhookStatus.mutate({ row, status: row.status === 'configured' ? 'disabled' : 'configured' })}>{changeWebhookStatus.isPending ? ui("Saving…") : row.status === 'configured' ? ui("Disable") : ui("Enable")}</button></> : null}</div></td></tr>)}
        </tbody></table></div>
        {webhooks.isLoading ? <div className="muted">{ui("Loading webhooks…")}</div> : null}
        {webhooks.isError ? <div className="form-error">{messageFrom(webhooks.error, ui("Unable to load webhooks."), ui)}</div> : null}
        {webhookNextCursor ? <button className="button button--secondary" type="button" disabled={loadMoreWebhooks.isPending || createWebhook.isPending || testWebhook.isPending || changeWebhookStatus.isPending || rotateWebhook.isPending} onClick={() => loadMoreWebhooks.mutate(webhookNextCursor)}>{loadMoreWebhooks.isPending ? ui("Loading…") : ui("Load more")}</button> : null}
        <h4>{ui("Recent delivery attempts")}</h4>
        <div style={tableWrapStyle}><table><thead><tr><th>{ui("Webhook")}</th><th>{ui("Event")}</th><th>{ui("Status")}</th><th>{ui("Attempts")}</th><th>{ui("HTTP")}</th><th>{ui("Created")}</th></tr></thead><tbody>
          {!deliveries.isLoading && !deliveries.isError && !(deliveries.data || []).length ? <EmptyTableRow colSpan={6} message={ui("No webhook delivery attempts yet.")} /> : null}{(deliveries.data || []).map((row) => <tr key={row.id}><td>{row.subscription_name || ui("Webhook unavailable")}</td><td>{row.event_type}</td><td>{displayCanonicalLabel(row.event_status, ui)}</td><td>{formatLocalizedNumber(row.attempt_count, locale)}</td><td>{row.response_status == null ? '—' : formatLocalizedNumber(row.response_status, locale)}</td><td>{formatDate(row.created_at, locale)}</td></tr>)}
        </tbody></table></div>
        {deliveries.isLoading ? <div className="muted">{ui("Loading recent webhook delivery attempts…")}</div> : null}
        {deliveries.isError ? <div className="form-error">{messageFrom(deliveries.error, ui("Unable to load recent webhook delivery attempts."), ui)}</div> : null}
      </div>

      <div className="card">
        <div className="card__label">{ui("Known external systems")}</div>
        <h3>{editingConnection ? ui("Edit connection") : ui("Connection registry")}</h3>
        <p className="card__subtext">{ui("Record an ERP, accounting, e-commerce, WMS, or custom system your company uses. Saving this entry documents the connection details; it does not start synchronization by itself.")}</p>
        <form onSubmit={(e) => { e.preventDefault(); saveConnection.mutate(); }} style={formGridStyle}>
          <label>{ui("System name")}<input value={systemName} onChange={(e) => setSystemName(e.target.value)} placeholder={ui("SAP Business One")} disabled={!canWrite || Boolean(editingConnection)} /></label>
          <label>{ui("Type")}<select value={systemType} onChange={(e) => setSystemType(e.target.value)} disabled={!canWrite}><option value="custom">{ui("Custom")}</option><option value="erp">{ui("ERP")}</option><option value="accounting">{ui("Accounting")}</option><option value="ecommerce">{ui("E-commerce")}</option><option value="wms">{ui("WMS")}</option></select></label>
          <label>{ui("Base URL")}<input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://..." disabled={!canWrite} /></label>
          <label>{ui("Direction")}<select value={direction} onChange={(e) => setDirection(e.target.value)} disabled={!canWrite}><option value="bidirectional">{ui("Both directions")}</option><option value="inbound">{ui("Into inventory app")}</option><option value="outbound">{ui("Out of inventory app")}</option></select></label>
          <label>{ui("Credential reference (not a password)")}<input value={credentialReference} onChange={(e) => setCredentialReference(e.target.value)} placeholder={ui("Secret-manager reference")} disabled={!canWrite} /></label>
          <div style={{ alignSelf: 'end', display: 'flex', gap: 8 }}><button className="button" disabled={!canWrite || !systemName.trim() || connections.isLoading || connections.isError || saveConnection.isPending}>{saveConnection.isPending ? ui("Saving…") : editingConnection ? ui("Save changes") : ui("Save connection")}</button>{editingConnection ? <button className="button button--secondary" type="button" disabled={saveConnection.isPending} onClick={clearConnectionForm}>{ui("Cancel")}</button> : null}</div>
        </form>
        <div style={tableWrapStyle}><table><thead><tr><th>{ui("System")}</th><th>{ui("Type")}</th><th>{ui("Direction")}</th><th>{ui("Status")}</th><th>{ui("Action")}</th></tr></thead><tbody>{!connections.isLoading && !connections.isError && !(connections.data || []).length ? <EmptyTableRow colSpan={5} message={ui("No external systems are recorded yet.")} /> : null}{(connections.data || []).map((row) => <tr key={row.id}><td>{row.system_name}</td><td>{displayCanonicalLabel(row.system_type, ui)}</td><td>{displayCanonicalLabel(row.direction, ui)}</td><td>{displayCanonicalLabel(row.status, ui)}</td><td>{canWrite ? <button className="button button--secondary" type="button" disabled={saveConnection.isPending} onClick={() => editConnection(row)}>{ui("Edit")}</button> : '—'}</td></tr>)}</tbody></table></div>
        {connections.isLoading ? <div className="muted">{ui("Loading external systems…")}</div> : null}
        {connections.isError ? <div className="form-error">{messageFrom(connections.error, ui("Unable to load external systems."), ui)}</div> : null}
      </div>
    </section>
  );
}

function ProductSelect({ products, value, onChange, label = 'Product' }: { products: Product[]; value: string; onChange: (id: string) => void; label?: string }) {
  const { ui } = useAppTranslation();
  return <label>{ui(label)}<select value={value} onChange={(e) => onChange(e.target.value)}><option value="">{ui("Select…")}</option>{products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}</select></label>;
}

function SerialsPanel({ products, locations, canWriteTracking, canReadStock, canRegisterSerial }: { products: Product[]; locations: Location[]; canWriteTracking: boolean; canReadStock: boolean; canRegisterSerial: boolean }) {
  const { locale, ui } = useAppTranslation();
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [settings, setSettings] = useState<TrackingSettings>({ serial_tracking_enabled: false, serial_uniqueness_scope: 'product', require_serial_on_receipt: false, require_serial_on_issue: false, version: 0 });
  const [serialNumber, setSerialNumber] = useState('');
  const [serialSearch, setSerialSearch] = useState('');
  const [serialRows, setSerialRows] = useState<SerialRecord[]>([]);
  const [serialNextCursor, setSerialNextCursor] = useState<string | null>(null);
  const [locationId, setLocationId] = useState('');
  const [inventoryLotId, setInventoryLotId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const settingsQuery = useQuery({ queryKey: ['tracking-settings', productId], enabled: Boolean(productId), queryFn: () => apiRequest<TrackingSettings>(`/inventory-capabilities/products/${productId}/tracking`) });
  useEffect(() => { if (settingsQuery.data) setSettings(settingsQuery.data); }, [settingsQuery.data]);
  const serialQueryIdentity = `${productId}|${serialSearch.trim()}`;
  const serialsQuery = useQuery({
    queryKey: ['inventory-serials', productId, serialSearch.trim()],
    enabled: canReadStock,
    queryFn: () => {
      const params = new URLSearchParams({ paged: 'true', limit: '100' });
      if (productId) params.set('product_id', productId);
      if (serialSearch.trim()) params.set('search', serialSearch.trim());
      return apiRequest<PagedResponse<SerialRecord>>(`/inventory-capabilities/serials?${params.toString()}`);
    }
  });
  useEffect(() => {
    if (!serialsQuery.data) return;
    setSerialRows(serialsQuery.data.items);
    setSerialNextCursor(serialsQuery.data.next_cursor);
  }, [serialsQuery.data]);
  const loadMoreSerials = useMutation({
    mutationFn: ({ cursor, identity }: { cursor: string; identity: string }) => {
      const [selectedProduct, search] = identity.split('|');
      const params = new URLSearchParams({ paged: 'true', limit: '100', cursor });
      if (selectedProduct) params.set('product_id', selectedProduct);
      if (search) params.set('search', search);
      return apiRequest<PagedResponse<SerialRecord>>(`/inventory-capabilities/serials?${params.toString()}`);
    },
    onSuccess: (page, variables) => {
      if (variables.identity !== serialQueryIdentity) return;
      setSerialRows((current) => {
        const byId = new Map(current.map((row) => [row.id, row]));
        page.items.forEach((row) => byId.set(row.id, row));
        return Array.from(byId.values());
      });
      setSerialNextCursor(page.next_cursor);
    },
    onError: (err, variables) => { if (variables.identity === serialQueryIdentity) setError(messageFrom(err, ui("Unable to load more serials."), ui)); }
  });
  const lotsQuery = useQuery({
    queryKey: ['serial-registration-lots', productId, locationId],
    enabled: Boolean(canReadStock && productId && locationId && settings.serial_tracking_enabled),
    queryFn: () => apiRequest<SerialRegistrationLot[]>(`/stock/lots?product_id=${encodeURIComponent(productId)}&storage_location_id=${encodeURIComponent(locationId)}&condition=available`)
  });
  const eligibleRegistrationLots = (lotsQuery.data || []).filter((lot) => lot.operational_status !== 'expired');
  const saveSettings = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/products/${productId}/tracking`, { method: 'PUT', body: JSON.stringify({ ...settings, expected_version: settings.version }) }), onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['tracking-settings', productId] }); }, onError: (e) => setError(messageFrom(e, ui("Unable to save tracking settings."), ui)) });
  const addSerial = useMutation({
    mutationFn: () => apiRequest('/inventory-capabilities/serials', { method: 'POST', body: JSON.stringify({ product_id: productId, serial_number: serialNumber, storage_location_id: locationId, inventory_lot_id: inventoryLotId, status: 'available' }) }),
    onSuccess: () => { setSerialNumber(''); setError(null); void Promise.all([qc.invalidateQueries({ queryKey: ['inventory-serials'] }), qc.invalidateQueries({ queryKey: ['serial-registration-lots'] })]); },
    onError: (e) => setError(messageFrom(e, ui("Unable to register serial against existing stock."), ui))
  });

  const changeProduct = (value: string) => {
    setProductId(value);
    setSettings({ serial_tracking_enabled: false, serial_uniqueness_scope: 'product', require_serial_on_receipt: false, require_serial_on_issue: false, version: 0 });
    setSerialRows([]); setSerialNextCursor(null);
    setLocationId('');
    setInventoryLotId('');
    setError(null);
  };
  const changeLocation = (value: string) => {
    setLocationId(value);
    setInventoryLotId('');
  };
  const lotLabel = (lot: SerialRegistrationLot) => {
    const identity = [lot.lot_number ? `${ui('Lot')} ${lot.lot_number}` : null, lot.batch_number ? `${ui('Batch')} ${lot.batch_number}` : null].filter(Boolean).join(' · ') || ui("Unnumbered lot");
    return `${identity} — ${formatLocalizedNumber(Number(lot.quantity), locale)} ${ui('on hand')}`;
  };
  const trackingSettingsReady = Boolean(productId && settingsQuery.isSuccess);

  return <section className="section" style={panelStyle}><div className="section__title">{ui("Serial-number tracking")}</div>
    <div className="card"><div style={formGridStyle}><ProductSelect products={products} value={productId} onChange={changeProduct} />
      <label><input type="checkbox" checked={settings.serial_tracking_enabled} onChange={(e) => setSettings({ ...settings, serial_tracking_enabled: e.target.checked, require_serial_on_receipt: e.target.checked ? settings.require_serial_on_receipt : false, require_serial_on_issue: e.target.checked ? settings.require_serial_on_issue : false })} disabled={!canWriteTracking || !trackingSettingsReady} /> {ui("Enable serial tracking")}</label>
      <label>{ui("Uniqueness")}<select value={settings.serial_uniqueness_scope} onChange={(e) => setSettings({ ...settings, serial_uniqueness_scope: e.target.value as 'product' | 'tenant' })} disabled={!canWriteTracking || !trackingSettingsReady || !settings.serial_tracking_enabled}><option value="product">{ui("Unique within product")}</option><option value="tenant">{ui("Unique across tenant")}</option></select></label>
      <label><input type="checkbox" checked={settings.require_serial_on_receipt} onChange={(e) => setSettings({ ...settings, require_serial_on_receipt: e.target.checked })} disabled={!canWriteTracking || !trackingSettingsReady || !settings.serial_tracking_enabled} /> {ui("Require on receipt")}</label>
      <label><input type="checkbox" checked={settings.require_serial_on_issue} onChange={(e) => setSettings({ ...settings, require_serial_on_issue: e.target.checked })} disabled={!canWriteTracking || !trackingSettingsReady || !settings.serial_tracking_enabled} /> {ui("Require on issue")}</label>
      <div style={{ alignSelf: 'end' }}><button className="button" type="button" disabled={!canWriteTracking || !trackingSettingsReady || saveSettings.isPending} onClick={() => saveSettings.mutate()}>{saveSettings.isPending ? ui("Saving…") : ui("Save tracking")}</button></div>
    </div><p className="card__subtext capability-help">{ui("Receipt and issue requirements apply only while serial tracking is enabled.")}</p>{productId && settingsQuery.isLoading ? <div className="muted">{ui("Loading tracking settings…")}</div> : null}{productId && settingsQuery.isError ? <div className="form-error">{messageFrom(settingsQuery.error, ui("Unable to load tracking settings."), ui)}</div> : null}{error ? <div className="form-error">{error}</div> : null}</div>
    <div className="card"><h3>{ui("Register serial for existing stock")}</h3><p className="muted">{ui("This assigns a serial identity to an item that is already on hand. Choose the exact location and inventory lot. Reservation, issue, damage, quarantine and return states are changed only by their real inventory workflows.")}</p>{!canReadStock ? <div className="form-error">{ui("Stock read permission is required to view serial inventory.")}</div> : null}{canReadStock && !canRegisterSerial ? <div className="form-error">{ui("Product write, storage-location read, stock read and stock adjust permissions are required to register a serial against existing inventory.")}</div> : null}<form onSubmit={(e) => { e.preventDefault(); addSerial.mutate(); }} style={formGridStyle}>
      <input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder={ui("Serial number")} disabled={!canRegisterSerial} />
      <select value={locationId} onChange={(e) => changeLocation(e.target.value)} disabled={!canRegisterSerial || !productId}><option value="">{ui("Select stock location…")}</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
      <select value={inventoryLotId} onChange={(e) => setInventoryLotId(e.target.value)} disabled={!canRegisterSerial || !locationId || !lotsQuery.isSuccess}><option value="">{ui("Select inventory lot…")}</option>{eligibleRegistrationLots.map((lot) => <option key={lot.id} value={lot.id}>{lotLabel(lot)}</option>)}</select>
      <button className="button" disabled={!canRegisterSerial || !trackingSettingsReady || !productId || !serialNumber.trim() || !locationId || !inventoryLotId || !lotsQuery.isSuccess || !settings.serial_tracking_enabled || addSerial.isPending}>{addSerial.isPending ? ui("Registering…") : ui("Register serial")}</button>
    </form>{lotsQuery.isLoading ? <div className="muted">{ui("Loading eligible inventory lots…")}</div> : null}{lotsQuery.isError ? <div className="form-error">{messageFrom(lotsQuery.error, ui("Unable to load eligible inventory lots."), ui)}</div> : null}{canReadStock && locationId && lotsQuery.isSuccess && !eligibleRegistrationLots.length ? <div className="muted">{ui("No available on-hand lot exists at this location. Receive or count stock first; serial registration never creates quantity.")}</div> : null}</div>
    {canReadStock ? <div className="card" style={tableWrapStyle}><label>{ui("Search serial registry")}<input value={serialSearch} onChange={(e) => { setSerialSearch(e.target.value); setSerialRows([]); setSerialNextCursor(null); }} placeholder={ui("Serial number, product name or SKU")} /></label>{serialsQuery.isLoading ? <div className="muted">{ui("Loading serial registry…")}</div> : null}{serialsQuery.isError ? <div className="form-error">{messageFrom(serialsQuery.error, ui("Unable to load serial registry."), ui)}</div> : null}<table><thead><tr><th>{ui("Serial")}</th><th>{ui("Product")}</th><th>{ui("Status")}</th><th>{ui("Location")}</th><th>{ui("Lot / batch")}</th><th>{ui("Updated")}</th></tr></thead><tbody>{!serialsQuery.isLoading && !serialsQuery.isError && !serialRows.length ? <EmptyTableRow colSpan={6} message={ui("No serial identities match the current filters.")} /> : null}{serialRows.map((serial) => <tr key={serial.id}><td>{serial.serial_number}</td><td>{serial.product_sku} — {serial.product_name}</td><td>{displayCanonicalLabel(serial.operational_status || serial.status, ui)}</td><td>{serial.storage_location_name || ui("Location unavailable")}</td><td>{[serial.lot_number ? `${ui('Lot')} ${serial.lot_number}` : null, serial.batch_number ? `${ui('Batch')} ${serial.batch_number}` : null].filter(Boolean).join(' · ') || '—'}</td><td>{formatDate(serial.updated_at, locale)}</td></tr>)}</tbody></table>{serialNextCursor ? <button className="button button--secondary" type="button" disabled={loadMoreSerials.isPending} onClick={() => loadMoreSerials.mutate({ cursor: serialNextCursor, identity: serialQueryIdentity })}>{loadMoreSerials.isPending ? ui("Loading…") : ui("Load more")}</button> : null}</div> : null}
  </section>;
}

function UomPanel({ products, canWrite }: { products: Product[]; canWrite: boolean }) {
  const { locale, ui } = useAppTranslation();
  const qc = useQueryClient();
  const [productId, setProductId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [factor, setFactor] = useState('');
  const [purchase, setPurchase] = useState(false);
  const [issue, setIssue] = useState(false);
  const [editingUom, setEditingUom] = useState<UomRow | null>(null);
  const [convertQty, setConvertQty] = useState('1');
  const [fromUom, setFromUom] = useState('');
  const [toUom, setToUom] = useState('');
  const [converted, setConverted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['uom', productId], enabled: Boolean(productId), queryFn: () => apiRequest<UomResponse>(`/inventory-capabilities/products/${productId}/uom`) });
  const clearUomForm = () => { setEditingUom(null); setCode(''); setName(''); setFactor(''); setPurchase(false); setIssue(false); };
  const editUom = (row: UomRow) => { setEditingUom(row); setCode(row.uom_code); setName(row.uom_name || ''); setFactor(String(row.factor_to_base)); setPurchase(Boolean(row.purchase_uom)); setIssue(Boolean(row.issue_uom)); setError(null); };
  const save = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/products/${productId}/uom`, { method: 'POST', body: JSON.stringify({ uom_code: code, uom_name: name || null, factor_to_base: Number(factor), purchase_uom: purchase, issue_uom: issue, rounding_scale: editingUom?.rounding_scale, barcode: editingUom?.barcode, expected_version: editingUom?.version ?? 0 }) }), onSuccess: () => { clearUomForm(); setConverted(null); setError(null); void qc.invalidateQueries({ queryKey: ['uom', productId] }); }, onError: (e) => setError(messageFrom(e, ui("Unable to save UoM."), ui)) });
  const remove = useMutation({ mutationFn: (row: UomRow) => apiRequest(`/inventory-capabilities/uom/${row.id}`, { method: 'DELETE', version: row.version }), onSuccess: () => { if (editingUom) clearUomForm(); setConverted(null); setError(null); void qc.invalidateQueries({ queryKey: ['uom', productId] }); }, onError: (e) => setError(messageFrom(e, ui("Unable to delete UoM conversion."), ui)) });
  const convert = useMutation({ mutationFn: () => apiRequest<{ converted_quantity: number }>(`/inventory-capabilities/products/${productId}/uom/convert`, { method: 'POST', body: JSON.stringify({ from_uom: fromUom, to_uom: toUom, quantity: Number(convertQty) }) }), onSuccess: (data) => { setConverted(String(data.converted_quantity)); setError(null); }, onError: (e) => setError(messageFrom(e, ui("Unable to convert quantity."), ui)) });
  const units = useMemo(() => productId && query.data ? [query.data.base_uom, ...query.data.conversions.map((r) => r.uom_code)] : [], [productId, query.data]);
  useEffect(() => { if (units.length && !fromUom) { setFromUom(units[0]); setToUom(units[1] || units[0]); } }, [units, fromUom]);
  const changeProduct = (id: string) => { setProductId(id); clearUomForm(); setFromUom(''); setToUom(''); setConverted(null); setError(null); };
  return <section className="section" style={panelStyle}><div className="section__title">{ui("Units of measure")}</div>
    <div className="card"><p className="card__subtext capability-help">{ui("Define alternate units such as CASE or BOX as a number of the product's base unit. The base unit itself must not be added as a conversion.")}</p><div style={formGridStyle}><ProductSelect products={products} value={productId} onChange={changeProduct} /><label>{ui("UoM code")}<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CASE" disabled={!canWrite || Boolean(editingUom)} /></label><label>{ui("Name")}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={ui("Case")} disabled={!canWrite} /></label><label>{ui("Units in base unit")}<input type="number" step="any" min="0.000001" value={factor} onChange={(e) => setFactor(e.target.value)} placeholder="24" disabled={!canWrite} /></label><label><input type="checkbox" checked={purchase} onChange={(e) => setPurchase(e.target.checked)} disabled={!canWrite} /> {ui("Purchasing unit")}</label><label><input type="checkbox" checked={issue} onChange={(e) => setIssue(e.target.checked)} disabled={!canWrite} /> {ui("Issue/selling unit")}</label><div style={{ display: 'flex', gap: 8 }}><button className="button" type="button" disabled={!canWrite || !productId || query.isLoading || query.isError || !code.trim() || asNumber(factor) <= 0 || save.isPending} onClick={() => save.mutate()}>{save.isPending ? ui("Saving…") : editingUom ? ui("Save changes") : ui("Save conversion")}</button>{editingUom ? <button className="button button--secondary" type="button" disabled={save.isPending} onClick={clearUomForm}>{ui("Cancel")}</button> : null}</div></div>{error ? <div className="form-error">{error}</div> : null}</div>
    <div className="card"><h3>{ui("Conversion test")}</h3><div style={formGridStyle}><label>{ui("Quantity")}<input type="number" step="any" value={convertQty} onChange={(e) => { setConvertQty(e.target.value); setConverted(null); }} /></label><label>{ui("From unit")}<select value={fromUom} onChange={(e) => { setFromUom(e.target.value); setConverted(null); }}>{units.map((u) => <option key={u}>{u}</option>)}</select></label><label>{ui("To unit")}<select value={toUom} onChange={(e) => { setToUom(e.target.value); setConverted(null); }}>{units.map((u) => <option key={u}>{u}</option>)}</select></label><button className="button button--secondary" type="button" disabled={!productId || !fromUom || !toUom || convert.isPending} onClick={() => convert.mutate()}>{convert.isPending ? ui("Converting…") : ui("Convert")}</button>{converted !== null ? <strong className="capability-result">{ui("Result:")} {converted} {toUom}</strong> : null}</div></div>
    <div className="card" style={tableWrapStyle}>{productId && query.isLoading ? <div className="muted">{ui("Loading units of measure…")}</div> : null}{productId && query.isError ? <div className="form-error">{messageFrom(query.error, ui("Unable to load units of measure."), ui)}</div> : null}<table><thead><tr><th>{ui("Unit")}</th><th>{ui("Factor to base")}</th><th>{ui("Purchase")}</th><th>{ui("Issue")}</th><th>{ui("Action")}</th></tr></thead><tbody>{productId ? <tr><td>{query.data?.base_uom || '—'} <span className="capability-base-badge">{ui("Base")}</span></td><td>1</td><td>—</td><td>—</td><td>—</td></tr> : <EmptyTableRow colSpan={5} message={ui("Select a product to view its units of measure.")} />}{(query.data?.conversions || []).map((row) => <tr key={row.id}><td>{row.uom_code} {row.uom_name ? `— ${row.uom_name}` : ''}</td><td>{formatLocalizedNumber(Number(row.factor_to_base), locale)}</td><td>{row.purchase_uom ? ui("Yes") : ui("No")}</td><td>{row.issue_uom ? ui("Yes") : ui("No")}</td><td>{canWrite ? <div style={{ display: 'flex', gap: 6 }}><button className="button button--secondary" type="button" disabled={save.isPending || remove.isPending} onClick={() => editUom(row)}>{ui("Edit")}</button><button className="button button--secondary" type="button" disabled={save.isPending || remove.isPending} onClick={() => { if (window.confirm(`${ui('Delete')} ${row.uom_code} ${ui('conversion? Existing inventory quantities are not changed.')}`)) remove.mutate(row); }}>{ui("Delete")}</button></div> : '—'}</td></tr>)}</tbody></table></div>
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
  const { ui } = useAppTranslation();
  type EntityType = keyof typeof writePermissions;
  const qc = useQueryClient();
  const [entityType, setEntityType] = useState<EntityType>('product');
  const [fieldKey, setFieldKey] = useState('');
  const [label, setLabel] = useState('');
  const [dataType, setDataType] = useState('text');
  const [options, setOptions] = useState('');
  const [required, setRequired] = useState(false);
  const [editingDefinition, setEditingDefinition] = useState<CustomDefinition | null>(null);
  const [entityId, setEntityId] = useState('');
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [valueVersions, setValueVersions] = useState<Record<string, number>>({});
  const [definitionVersions, setDefinitionVersions] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  const entityConfigs: Record<EntityType, { label: string; plural: string; rows: Array<{ id: string; label: string }> }> = {
    product: { label: ui("Product"), plural: 'products', rows: products.map((row) => ({ id: row.id, label: `${row.sku} — ${row.name}` })) },
    supplier: { label: ui("Supplier"), plural: 'suppliers', rows: suppliers.map((row) => ({ id: row.id, label: row.name })) },
    storage_location: { label: ui("Storage location"), plural: 'storage locations', rows: locations.map((row) => ({ id: row.id, label: row.path || row.name })) },
    shipment: { label: ui("Shipment"), plural: 'shipments', rows: shipments.map((row) => ({ id: row.id, label: row.po_number || row.qr_code || ui("Reference unavailable") })) },
    purchase_order: { label: ui("Purchase order"), plural: 'purchase orders', rows: purchaseOrders.map((row) => ({ id: row.id, label: row.po_number || ui("Reference unavailable") })) }
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
    setValueVersions({});
    setDefinitionVersions({});
    setEditingDefinition(null);
    setFieldKey(''); setLabel(''); setDataType('text'); setOptions(''); setRequired(false);
    setError(null);
  }, [canRead, entityType, readableEntityTypes]);

  useEffect(() => {
    if (!entityValues.data) return;
    const next: Record<string, string | boolean> = {};
    const nextValueVersions: Record<string, number> = {};
    const nextDefinitionVersions: Record<string, number> = {};
    entityValues.data.forEach((row) => {
      next[row.field_key] = row.value === null || row.value === undefined
        ? ''
        : row.data_type === 'boolean'
          ? row.value === true
          : String(row.value);
      nextValueVersions[row.field_key] = Number(row.value_version || 0);
      nextDefinitionVersions[row.field_key] = Number(row.definition_version);
    });
    setValues(next);
    setValueVersions(nextValueVersions);
    setDefinitionVersions(nextDefinitionVersions);
  }, [entityValues.data]);

  const clearDefinitionForm = () => { setEditingDefinition(null); setFieldKey(''); setLabel(''); setDataType('text'); setOptions(''); setRequired(false); };
  const editDefinition = (row: CustomDefinition) => { setEditingDefinition(row); setFieldKey(row.field_key); setLabel(row.label); setDataType(row.data_type); setOptions((row.options || []).join(', ')); setRequired(Boolean(row.is_required)); setError(null); };

  const changeEntityId = (nextEntityId: string) => {
    setEntityId(nextEntityId);
    setValues({});
    setValueVersions({});
    setDefinitionVersions({});
    setError(null);
  };

  const saveDefinition = useMutation({
    mutationFn: () => apiRequest('/inventory-capabilities/custom-fields', {
      method: 'POST',
      body: JSON.stringify({
        entity_type: entityType,
        field_key: fieldKey,
        label,
        data_type: dataType,
        is_required: required,
        options: options.split(',').map((value) => value.trim()).filter(Boolean),
        is_active: editingDefinition?.is_active,
        sort_order: editingDefinition?.sort_order,
        expected_version: editingDefinition?.version ?? 0
      })
    }),
    onSuccess: () => {
      clearDefinitionForm();
      setError(null);
      void qc.invalidateQueries({ queryKey: ['custom-field-definitions', entityType] });
      if (entityId) void qc.invalidateQueries({ queryKey: ['custom-field-values', entityType, entityId] });
    },
    onError: (errorValue) => setError(messageFrom(errorValue, ui("Unable to save custom field."), ui))
  });

  const toggleDefinition = useMutation({
    mutationFn: (row: CustomDefinition) => apiRequest('/inventory-capabilities/custom-fields', {
      method: 'POST',
      body: JSON.stringify({
        entity_type: row.entity_type,
        field_key: row.field_key,
        label: row.label,
        data_type: row.data_type,
        is_required: row.is_required,
        options: row.options || [],
        is_active: !row.is_active,
        sort_order: row.sort_order,
        expected_version: row.version
      })
    }),
    onSuccess: (_data, row) => {
      if (editingDefinition?.id === row.id) clearDefinitionForm();
      setError(null);
      void qc.invalidateQueries({ queryKey: ['custom-field-definitions', entityType] });
      if (entityId) void qc.invalidateQueries({ queryKey: ['custom-field-values', entityType, entityId] });
    },
    onError: (errorValue) => setError(messageFrom(errorValue, ui("Unable to change custom field status."), ui))
  });

  const saveValues = useMutation({
    mutationFn: () => apiRequest(`/inventory-capabilities/custom-fields/${entityType}/${entityId}`, {
      method: 'PUT',
      body: JSON.stringify({ values, value_versions: valueVersions, definition_versions: definitionVersions })
    }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['custom-field-values', entityType, entityId] });
    },
    onError: (errorValue) => setError(messageFrom(errorValue, ui("Unable to save custom values."), ui))
  });

  return (
    <section className="section" style={panelStyle}>
      <div className="section__title">{ui("Custom fields")}</div>
      <div className="card">
        <label>
          {ui("Entity type")}
          <select value={entityType} onChange={(event) => setEntityType(event.target.value as EntityType)}>
            {readableEntityTypes.map((key) => <option key={key} value={key}>{entityConfigs[key].label}</option>)}
          </select>
        </label>
      </div>
      <div className="card">
        <h3>{editingDefinition ? ui("Edit custom field") : ui("Create custom field")}</h3>
        <div style={formGridStyle}>
          <label>{ui("Field key")}<input value={fieldKey} onChange={(event) => setFieldKey(event.target.value)} placeholder="country_of_origin" disabled={Boolean(editingDefinition)} /></label>
          <label>{ui("Label")}<input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={ui("Country of origin")} /></label>
          <label>{ui("Type")}<select value={dataType} onChange={(event) => setDataType(event.target.value)}><option value="text">{ui("Text")}</option><option value="number">{ui("Number")}</option><option value="boolean">{ui("Yes/No")}</option><option value="date">{ui("Date")}</option><option value="select">{ui("Select list")}</option></select></label>
          {dataType === 'select' ? <label>{ui("Options")}<input value={options} onChange={(event) => setOptions(event.target.value)} placeholder={ui("Croatia, Italy, Germany")} /></label> : null}
          <label><input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} /> {ui("Required")}</label>
          <div style={{ display: 'flex', gap: 8 }}><button className="button" type="button" disabled={!canWrite || definitions.isLoading || definitions.isError || !fieldKey.trim() || !label.trim() || (dataType === 'select' && !options.split(',').some((value) => value.trim())) || saveDefinition.isPending} onClick={() => saveDefinition.mutate()}>{saveDefinition.isPending ? ui("Saving…") : editingDefinition ? ui("Save changes") : ui("Save field")}</button>{editingDefinition ? <button className="button button--secondary" type="button" disabled={saveDefinition.isPending} onClick={clearDefinitionForm}>{ui("Cancel")}</button> : null}</div>
        </div>
        {dataType === 'select' && !options.split(',').some((value) => value.trim()) ? <div className="capability-note">{ui("A select-list field needs at least one option.")}</div> : null}
        {!canWrite ? <div className="card__subtext">{ui("You have read access to these fields but not permission to change this entity type.")}</div> : null}
        {error ? <div className="form-error">{error}</div> : null}
      </div>
      <div className="card">
        <h3>{ui("Use fields on")} {ui(config.plural)}</h3>
        <label>
          {ui(config.label)}
          <select value={entityId} onChange={(event) => changeEntityId(event.target.value)}>
            <option value="">{ui("Select…")}</option>
            {config.rows.map((row) => <option key={row.id} value={row.id}>{row.label}</option>)}
          </select>
        </label>
        {entityId && entityValues.isLoading ? <div className="muted">{ui("Loading custom values…")}</div> : null}
        {entityId && entityValues.isError ? <div className="form-error">{messageFrom(entityValues.error, ui("Unable to load custom values."), ui)}</div> : null}
        {entityId && !entityValues.isLoading && !entityValues.isError && entityValues.data?.length === 0 ? <div className="muted">{ui("No active custom fields are configured for this entity type.")}</div> : null}
        {(entityValues.data || []).map((row) => (
          <label key={row.definition_id} style={{ display: 'block', marginTop: 12 }}>
            {row.label}{row.is_required ? ' *' : ''}
            {row.data_type === 'boolean'
              ? <input type="checkbox" checked={values[row.field_key] === true} onChange={(event) => setValues({ ...values, [row.field_key]: event.target.checked })} />
              : row.data_type === 'select'
                ? <select value={String(values[row.field_key] || '')} onChange={(event) => setValues({ ...values, [row.field_key]: event.target.value })}><option value="">{ui("Select…")}</option>{(row.options || []).map((option) => <option key={option}>{option}</option>)}</select>
                : <input type={row.data_type === 'number' ? 'number' : row.data_type === 'date' ? 'date' : 'text'} value={String(values[row.field_key] || '')} onChange={(event) => setValues({ ...values, [row.field_key]: event.target.value })} />}
          </label>
        ))}
        <button className="button" style={{ marginTop: 14 }} type="button" disabled={!canWrite || !entityId || entityValues.isLoading || entityValues.isError || !entityValues.data || saveValues.isPending} onClick={() => saveValues.mutate()}>{saveValues.isPending ? ui("Saving…") : ui("Save custom fields")}</button>
      </div>
      <div className="card" style={tableWrapStyle}>
        {definitions.isLoading ? <div className="muted">{ui("Loading custom field definitions…")}</div> : null}{definitions.isError ? <div className="form-error">{messageFrom(definitions.error, ui("Unable to load custom field definitions."), ui)}</div> : null}<table><thead><tr><th>{ui("Key")}</th><th>{ui("Label")}</th><th>{ui("Type")}</th><th>{ui("Required")}</th><th>{ui("Status")}</th><th>{ui("Action")}</th></tr></thead><tbody>{!definitions.isLoading && !definitions.isError && !(definitions.data || []).length ? <EmptyTableRow colSpan={6} message={ui("No custom fields are configured for this entity type.")} /> : null}{(definitions.data || []).map((definition) => <tr key={definition.id}><td>{definition.field_key}</td><td>{definition.label}</td><td>{displayCanonicalLabel(definition.data_type, ui)}</td><td>{definition.is_required ? ui("Yes") : ui("No")}</td><td>{definition.is_active ? ui("Active") : ui("Inactive")}</td><td>{canWrite ? <div className="capability-action-row"><button className="button button--secondary" type="button" disabled={saveDefinition.isPending || toggleDefinition.isPending} onClick={() => editDefinition(definition)}>{ui("Edit")}</button><button className="button button--secondary" type="button" disabled={saveDefinition.isPending || toggleDefinition.isPending} onClick={() => toggleDefinition.mutate(definition)}>{definition.is_active ? ui("Deactivate") : ui("Activate")}</button></div> : '—'}</td></tr>)}</tbody></table>
      </div>
    </section>
  );
}

function LandedCostPanel({ shipments, canWrite }: { shipments: Shipment[]; canWrite: boolean }) {
  const { locale, ui } = useAppTranslation();
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
  const previewMutation = useMutation({ mutationFn: () => apiRequest<LandedPreview>('/inventory-capabilities/landed-costs/preview', { method: 'POST', body: JSON.stringify(body()) }), onSuccess: (data) => { setPreview(data); setError(null); }, onError: (e) => setError(messageFrom(e, ui("Unable to preview landed cost."), ui)) });
  const finalizeMutation = useMutation({ mutationFn: () => apiRequest('/inventory-capabilities/landed-costs/finalize', { method: 'POST', body: JSON.stringify({ ...body(), preview_fingerprint: preview?.preview_fingerprint }) }), onSuccess: () => { setPreview(null); setFreight(''); setCustoms(''); setInsurance(''); setError(null); void qc.invalidateQueries({ queryKey: ['landed-cost-history'] }); void qc.invalidateQueries({ queryKey: ['inventory-capabilities-products'] }); }, onError: (e) => setError(messageFrom(e, ui("Unable to finalize landed cost."), ui)) });
  const total = asNumber(freight) + asNumber(customs) + asNumber(insurance);
  const selectedShipment = shipments.find((shipment) => shipment.id === shipmentId);
  const changePreviewInput = (change: () => void) => { change(); setPreview(null); setError(null); };
  return <section className="section" style={panelStyle}><div className="section__title">{ui("Landed-cost allocation")}</div>
    <div className="card"><h3>{ui("Add freight, customs and insurance to received inventory cost")}</h3><p className="card__subtext capability-help">{ui("Preview shows how the current values will be allocated. Finalization is available only for a fully received shipment and permanently updates the affected lot unit costs.")}</p><div style={formGridStyle}><label>{ui("Shipment")}<select value={shipmentId} onChange={(e) => changePreviewInput(() => setShipmentId(e.target.value))}><option value="">{ui("Select…")}</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.po_number || s.qr_code || ui("Shipment reference unavailable")} — {displayCanonicalLabel(s.status, ui)}</option>)}</select></label><label>{ui("Allocation")}<select value={method} onChange={(e) => changePreviewInput(() => setMethod(e.target.value))}><option value="value">{ui("By item value")}</option><option value="quantity">{ui("By quantity")}</option><option value="equal">{ui("Equal per line")}</option></select></label><label>{ui("Freight")}<input type="number" min="0" step="0.01" value={freight} onChange={(e) => changePreviewInput(() => setFreight(e.target.value))} /></label><label>{ui("Customs")}<input type="number" min="0" step="0.01" value={customs} onChange={(e) => changePreviewInput(() => setCustoms(e.target.value))} /></label><label>{ui("Insurance")}<input type="number" min="0" step="0.01" value={insurance} onChange={(e) => changePreviewInput(() => setInsurance(e.target.value))} /></label><div className="capability-cost-actions"><strong>{ui("Extra cost:")} {formatLocalizedNumber(total, locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong><div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}><button className="button button--secondary" type="button" disabled={!shipmentId || total <= 0 || previewMutation.isPending || finalizeMutation.isPending} onClick={() => previewMutation.mutate()}>{previewMutation.isPending ? ui("Previewing…") : ui("Preview")}</button><button className="button" type="button" disabled={!canWrite || !shipmentId || selectedShipment?.status !== 'received' || total <= 0 || !preview || previewMutation.isPending || finalizeMutation.isPending} onClick={() => finalizeMutation.mutate()}>{finalizeMutation.isPending ? ui("Finalizing…") : ui("Finalize cost")}</button></div></div></div>{shipmentId && selectedShipment?.status !== 'received' ? <div className="capability-note">{ui("You can preview this shipment, but finalization stays locked until its status is Received.")}</div> : null}{error ? <div className="form-error">{error}</div> : null}</div>
    {preview ? <div className="card" style={tableWrapStyle}><h3>{ui("Allocation preview —")} {formatLocalizedCurrency(preview.total_extra_cost, preview.currency, locale)}</h3><table><thead><tr><th>{ui("Product")}</th><th>{ui("Qty")}</th><th>{ui("Base unit cost")}</th><th>{ui("Extra allocated")}</th><th>{ui("Landed unit cost")}</th></tr></thead><tbody>{preview.allocations.map((a) => <tr key={a.shipment_item_id}><td>{a.product_name}</td><td>{formatLocalizedNumber(a.received_quantity, locale)}</td><td>{formatLocalizedCurrency(a.base_unit_cost, preview.currency, locale)}</td><td>{formatLocalizedCurrency(a.allocated_extra_cost, preview.currency, locale)}</td><td><strong>{formatLocalizedCurrency(a.landed_unit_cost, preview.currency, locale)}</strong></td></tr>)}</tbody></table></div> : null}
    <div className="card" style={tableWrapStyle}><h3>{ui("Finalized landed costs")}</h3>{history.isLoading ? <div className="muted">{ui("Loading finalized landed costs…")}</div> : null}{history.isError ? <div className="form-error">{messageFrom(history.error, ui("Unable to load finalized landed costs."), ui)}</div> : null}<table><thead><tr><th>{ui("PO")}</th><th>{ui("Method")}</th><th>{ui("Extra cost")}</th><th>{ui("Finalized")}</th></tr></thead><tbody>{!history.isLoading && !history.isError && !(history.data || []).length ? <EmptyTableRow colSpan={4} message={ui("No landed costs have been finalized yet.")} /> : null}{(history.data || []).map((row) => <tr key={row.id}><td>{row.po_number || ui("Historical PO reference unavailable")}</td><td>{displayCanonicalLabel(row.allocation_method, ui)}</td><td>{formatLocalizedCurrency(Number(row.total_extra_cost), row.currency, locale)}</td><td>{formatDate(row.finalized_at, locale)}</td></tr>)}</tbody></table></div>
  </section>;
}

function VariantsPanel({ products, canWrite, canReadStock, canWriteProducts, canReadSuppliers, onChanged }: { products: Product[]; canWrite: boolean; canReadStock: boolean; canWriteProducts: boolean; canReadSuppliers: boolean; onChanged: () => void }) {
  const { locale, ui } = useAppTranslation();
  const qc = useQueryClient();
  const [parentId, setParentId] = useState('');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [attributes, setAttributes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const variants = useQuery({ queryKey: ['product-variants'], queryFn: () => apiRequest<Variant[]>('/inventory-capabilities/variants') });
  const create = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/products/${parentId}/variants`, { method: 'POST', body: JSON.stringify({ sku, name, barcode: barcode || null, attributes: parseAttributes(attributes) }) }), onSuccess: () => { setSku(''); setName(''); setBarcode(''); setAttributes(''); setError(null); void qc.invalidateQueries({ queryKey: ['product-variants'] }); onChanged(); }, onError: (e) => setError(messageFrom(e, ui("Unable to create variant."), ui)) });
  const parents = products.filter((p) => !p.parent_product_id);
  return <section className="section" style={panelStyle}><div className="section__title">{ui("Product variants")}</div><div className="card"><p className="card__subtext">{ui("A variant is created as a real product underneath a parent. That means existing stock, barcodes, shipments and movements can use it immediately.")}</p>{canWriteProducts && !canReadSuppliers ? <div className="form-error">{ui("Supplier read access is required to create a variant because supplier settings can be inherited from its parent product.")}</div> : null}<form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} style={formGridStyle}><ProductSelect products={parents} value={parentId} onChange={setParentId} label={ui("Parent product")} /><label>{ui("Variant SKU")}<input value={sku} onChange={(e) => setSku(e.target.value)} /></label><label>{ui("Variant name")}<input value={name} onChange={(e) => setName(e.target.value)} placeholder={ui("T-shirt / Red / M")} /></label><label>{ui("Barcode")}<input value={barcode} onChange={(e) => setBarcode(e.target.value)} /></label><label>{ui("Attributes")}<input value={attributes} onChange={(e) => setAttributes(e.target.value)} placeholder={ui("Color=Red, Size=M")} /></label><button className="button" disabled={!canWrite || !parentId || !sku.trim() || !name.trim() || create.isPending}>{create.isPending ? ui("Creating…") : ui("Create variant")}</button></form>{error ? <div className="form-error">{error}</div> : null}</div><div className="card" style={tableWrapStyle}>{variants.isLoading ? <div className="muted">{ui("Loading product variants…")}</div> : null}{variants.isError ? <div className="form-error">{messageFrom(variants.error, ui("Unable to load product variants."), ui)}</div> : null}<table><thead><tr><th>{ui("Parent")}</th><th>{ui("SKU")}</th><th>{ui("Variant")}</th><th>{ui("Attributes")}</th><th>{ui("Stock")}</th></tr></thead><tbody>{!variants.isLoading && !variants.isError && !(variants.data || []).length ? <EmptyTableRow colSpan={5} message={ui("No product variants have been created yet.")} /> : null}{(variants.data || []).map((v) => <tr key={v.id}><td>{v.parent_product_name}</td><td>{v.sku}</td><td>{v.name}</td><td>{Object.entries(v.variant_attributes || {}).map(([k,val]) => `${k}: ${String(val)}`).join(', ') || '-'}</td><td>{canReadStock && v.current_stock_quantity !== null && v.current_stock_quantity !== undefined ? formatLocalizedNumber(Number(v.current_stock_quantity), locale) : ui("Unavailable")}</td></tr>)}</tbody></table></div></section>;
}

function HierarchyPanel({ canWrite, canReadStock }: { canWrite: boolean; canReadStock: boolean }) {
  const { locale, ui } = useAppTranslation();
  const qc = useQueryClient();
  const [locationId, setLocationId] = useState('');
  const [parentId, setParentId] = useState('');
  const [type, setType] = useState('storage');
  const [code, setCode] = useState('');
  const [pickable, setPickable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hierarchy = useQuery({ queryKey: ['location-hierarchy'], queryFn: () => apiRequest<Location[]>('/inventory-capabilities/location-hierarchy') });
  const locations = hierarchy.data || [];
  const selected = locations.find((l) => l.id === locationId);
  const hierarchyReady = !hierarchy.isLoading && !hierarchy.isError;
  const save = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/location-hierarchy/${locationId}`, { method: 'PATCH', headers: selected?.version === undefined ? undefined : { 'If-Match-Version': String(selected.version) }, body: JSON.stringify({ parent_location_id: parentId || null, location_type: type, location_code: code || null, is_pickable: pickable }) }), onSuccess: () => { setError(null); void qc.invalidateQueries({ queryKey: ['location-hierarchy'] }); void qc.invalidateQueries({ queryKey: ['inventory-capabilities-locations'] }); void qc.invalidateQueries({ queryKey: ['storage-locations'] }); void qc.invalidateQueries({ queryKey: ['enterprise-storage-locations'] }); void qc.invalidateQueries({ queryKey: ['stock-transfer-options'] }); void qc.invalidateQueries({ queryKey: ['enterprise-stock-transfer-options'] }); }, onError: (e) => setError(getStorageLocationMutationErrorMessage(e, ui("Unable to save hierarchy."), ui)) });
  useEffect(() => { if (selected) { setParentId(selected.parent_location_id || ''); setType(selected.location_type || 'storage'); setCode(selected.location_code || ''); setPickable(selected.is_pickable !== false); } }, [selected]);
  useEffect(() => { if (hierarchy.isError) { setLocationId(''); setParentId(''); } }, [hierarchy.isError]);
  return <section className="section" style={panelStyle}><div className="section__title">{ui("Location hierarchy")}</div>
    <div className="card"><p className="card__subtext capability-help">{ui("Organize existing storage locations into warehouse, zone, aisle, rack, shelf, bin, or storage levels. Changing this structure does not move stock; it changes only how locations are organized and whether they are pickable.")}</p>
      {hierarchy.isLoading ? <div className="app-empty-state">{ui("Loading location hierarchy...")}</div> : null}
      {hierarchy.isError ? <div className="app-error-state">{ui("Location hierarchy is unavailable because the location structure could not be loaded.")}</div> : null}
      <div style={formGridStyle}><label>{ui("Location")}<select value={locationId} onChange={(e) => setLocationId(e.target.value)} disabled={!hierarchyReady}><option value="">{ui("Select…")}</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>{ui("Parent")}<select value={parentId} onChange={(e) => setParentId(e.target.value)} disabled={!hierarchyReady || !locationId}><option value="">{ui("Top level")}</option>{locations.filter((l) => l.id !== locationId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>{ui("Type")}<select value={type} onChange={(e) => setType(e.target.value)} disabled={!hierarchyReady || !locationId}><option value="warehouse">{ui("Warehouse")}</option><option value="zone">{ui("Zone")}</option><option value="aisle">{ui("Aisle")}</option><option value="rack">{ui("Rack")}</option><option value="shelf">{ui("Shelf")}</option><option value="bin">{ui("Bin")}</option><option value="storage">{ui("Storage")}</option></select></label><label>{ui("Code")}<input value={code} onChange={(e) => setCode(e.target.value)} placeholder="WH1-A03-R02-B04" disabled={!hierarchyReady || !locationId} /></label><label><input type="checkbox" checked={pickable} onChange={(e) => setPickable(e.target.checked)} disabled={!hierarchyReady || !locationId} /> {ui("Pickable location")}</label><button className="button" type="button" disabled={!canWrite || !locationId || !selected || !hierarchyReady || save.isPending} onClick={() => save.mutate()}>{save.isPending ? ui("Saving…") : ui("Save hierarchy")}</button></div>{error ? <div className="form-error">{error}</div> : null}</div>
    <div className="card" style={tableWrapStyle}><table><thead><tr><th>{ui("Path")}</th><th>{ui("Type")}</th><th>{ui("Code")}</th>{canReadStock ? <th>{ui("Stock positions")}</th> : null}<th>{ui("Pickable")}</th></tr></thead><tbody>{hierarchyReady && locations.length === 0 ? <EmptyTableRow colSpan={canReadStock ? 5 : 4} message={ui("No storage locations are available to organize.")} /> : null}{locations.map((l) => <tr key={l.id}><td style={{ paddingLeft: 14 + Number(l.depth || 0) * 14 }}>{l.path || l.name}</td><td>{displayCanonicalLabel(l.location_type, ui)}</td><td>{l.location_code || '—'}</td>{canReadStock ? <td>{l.stock_position_count === null || l.stock_position_count === undefined ? ui('Unavailable') : formatLocalizedNumber(Number(l.stock_position_count), locale)}</td> : null}<td>{l.is_pickable ? ui("Yes") : ui("No")}</td></tr>)}</tbody></table></div>
  </section>;
}

function BomPanel({ products, locations, canWrite, canExecute }: { products: Product[]; locations: Location[]; canWrite: boolean; canExecute: boolean }) {
  const { locale, ui } = useAppTranslation();
  const qc = useQueryClient();
  const [outputProductId, setOutputProductId] = useState('');
  const [name, setName] = useState(() => ui('Default BOM'));
  const [outputQty, setOutputQty] = useState('1');
  const [components, setComponents] = useState<Array<{ product_id: string; quantity: string; waste_percent: string }>>([{ product_id: '', quantity: '1', waste_percent: '0' }]);
  const [executeBomId, setExecuteBomId] = useState('');
  const [executeLocationId, setExecuteLocationId] = useState('');
  const [executeQty, setExecuteQty] = useState('1');
  const [direction, setDirection] = useState('assemble');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boms = useQuery({ queryKey: ['inventory-boms'], queryFn: () => apiRequest<Bom[]>('/inventory-capabilities/boms') });
  const bomsReady = !boms.isLoading && !boms.isError;
  const selectedComponents = components.filter((component) => component.product_id);
  const componentIds = selectedComponents.map((component) => component.product_id);
  const componentsValid = selectedComponents.length > 0
    && componentIds.length === new Set(componentIds).size
    && selectedComponents.every((component) => asNumber(component.quantity) > 0 && asNumber(component.waste_percent || '0') >= 0 && asNumber(component.waste_percent || '0') <= 100);
  const create = useMutation({ mutationFn: () => apiRequest('/inventory-capabilities/boms', { method: 'POST', body: JSON.stringify({ product_id: outputProductId, name, output_quantity: Number(outputQty), components: selectedComponents.map((c) => ({ product_id: c.product_id, quantity: Number(c.quantity), waste_percent: Number(c.waste_percent || 0) })) }) }), onSuccess: () => { setMessage(ui("BOM created successfully.")); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-boms'] }); }, onError: (e) => { setMessage(null); setError(messageFrom(e, ui("Unable to create BOM."), ui)); } });
  const execute = useMutation({ mutationFn: () => apiRequest(`/inventory-capabilities/boms/${executeBomId}/execute`, { method: 'POST', body: JSON.stringify({ direction, storage_location_id: executeLocationId, output_quantity: Number(executeQty), reservation_shortfall_acknowledged: false }) }), onSuccess: () => { setMessage(`${direction === 'assemble' ? ui('Assembly') : ui('Disassembly')} ${ui('completed and stock movements recorded.')}`); setError(null); void qc.invalidateQueries({ queryKey: ['inventory-capabilities-products'] }); }, onError: (e) => { setMessage(null); setError(messageFrom(e, ui("Unable to execute BOM."), ui)); } });
  const requestExecution = () => {
    const bom = (boms.data || []).find((row) => row.id === executeBomId);
    const location = locations.find((row) => row.id === executeLocationId);
    const action = direction === 'assemble' ? ui("Assemble") : ui("Disassemble");
    if (!bom || !location) return;
    if (window.confirm(`${action} ${formatLocalizedNumber(Number(executeQty), locale)} ${bom.product_name} ${ui('at')} ${location.name}? ${ui('This will post audited stock movements immediately.')}`)) execute.mutate();
  };
  return <section className="section" style={panelStyle}><div className="section__title">{ui("BOM, kits, assembly and disassembly")}</div>
    <div className="card"><h3>{ui("Create BOM")}</h3><p className="card__subtext capability-help">{ui("Define which component quantities make one finished product or kit. Components must be unique and quantities must be greater than zero.")}</p><div style={formGridStyle}><ProductSelect products={products} value={outputProductId} onChange={setOutputProductId} label={ui("Finished product / kit")} /><label>{ui("BOM name")}<input value={name} onChange={(e) => setName(e.target.value)} /></label><label>{ui("Output quantity")}<input type="number" min="0.000001" step="any" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} /></label></div><h4>{ui("Components")}</h4>{components.map((component, index) => <div key={index} className="capability-component-row" style={{ ...formGridStyle, marginBottom: 8 }}><ProductSelect products={products.filter((p) => p.id !== outputProductId)} value={component.product_id} onChange={(id) => setComponents((rows) => rows.map((r,i) => i === index ? { ...r, product_id: id } : r))} label={`${ui('Component')} ${formatLocalizedNumber(index + 1, locale)}`} /><label>{ui("Quantity")}<input type="number" step="any" min="0.000001" value={component.quantity} onChange={(e) => setComponents((rows) => rows.map((r,i) => i === index ? { ...r, quantity: e.target.value } : r))} /></label><label>{ui("Waste %")}<input type="number" step="any" min="0" max="100" value={component.waste_percent} onChange={(e) => setComponents((rows) => rows.map((r,i) => i === index ? { ...r, waste_percent: e.target.value } : r))} /></label>{components.length > 1 ? <button className="button button--secondary" type="button" onClick={() => setComponents((rows) => rows.filter((_,i) => i !== index))}>{ui("Remove")}</button> : null}</div>)}<div className="capability-action-row"><button className="button button--secondary" type="button" onClick={() => setComponents((rows) => [...rows, { product_id: '', quantity: '1', waste_percent: '0' }])}>{ui("Add component")}</button><button className="button" type="button" disabled={!canWrite || !outputProductId || !name.trim() || asNumber(outputQty) <= 0 || !componentsValid || create.isPending || execute.isPending} onClick={() => create.mutate()}>{create.isPending ? ui("Creating…") : ui("Create BOM")}</button></div>{selectedComponents.length > 0 && !componentsValid ? <div className="capability-note">{ui("Check for duplicate components, zero quantities, or waste percentages outside 0–100%.")}</div> : null}</div>
    <div className="card"><h3>{ui("Assemble / disassemble")}</h3><p className="card__subtext capability-help">{ui("This is a stock-changing action. The app validates permissions, available stock, reservations, lot integrity, and serial-tracking rules before posting movements.")}</p><div style={formGridStyle}><label>{ui("BOM")}<select value={executeBomId} disabled={!bomsReady} onChange={(e) => setExecuteBomId(e.target.value)}><option value="">{ui("Select…")}</option>{(boms.data || []).map((b) => <option key={b.id} value={b.id}>{b.product_sku} — {b.name}</option>)}</select></label><label>{ui("Location")}<select value={executeLocationId} onChange={(e) => setExecuteLocationId(e.target.value)}><option value="">{ui("Select…")}</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><label>{ui("Action")}<select value={direction} onChange={(e) => setDirection(e.target.value)}><option value="assemble">{ui("Assemble")}</option><option value="disassemble">{ui("Disassemble")}</option></select></label><label>{ui("Finished quantity")}<input type="number" min="0.000001" step="any" value={executeQty} onChange={(e) => setExecuteQty(e.target.value)} /></label><button className="button" type="button" disabled={!canExecute || !bomsReady || !executeBomId || !executeLocationId || asNumber(executeQty) <= 0 || create.isPending || execute.isPending} onClick={requestExecution}>{execute.isPending ? (direction === 'assemble' ? ui("Assembling…") : ui("Disassembling…")) : direction === 'assemble' ? ui("Assemble stock") : ui("Disassemble stock")}</button></div>{message ? <div className="form-success">{message}</div> : null}{error ? <div className="form-error">{error}</div> : null}</div>
    <div className="card" style={tableWrapStyle}>{boms.isLoading ? <div className="muted">{ui("Loading active BOMs…")}</div> : null}{boms.isError ? <div className="form-error">{messageFrom(boms.error, ui("Unable to load active BOMs."), ui)}</div> : null}<table><thead><tr><th>{ui("Output")}</th><th>{ui("BOM")}</th><th>{ui("Output qty")}</th><th>{ui("Components")}</th></tr></thead><tbody>{bomsReady && !(boms.data || []).length ? <EmptyTableRow colSpan={4} message={ui("No active BOMs have been created yet.")} /> : null}{(boms.data || []).map((b) => <tr key={b.id}><td>{b.product_sku} — {b.product_name}</td><td>{b.name}</td><td>{formatLocalizedNumber(Number(b.output_quantity), locale)}</td><td>{b.components.map((c) => `${c.component_sku || ''} ${c.component_name || ''} × ${formatLocalizedNumber(Number(c.quantity), locale)}`).join('; ')}</td></tr>)}</tbody></table></div>
  </section>;
}

function MobilePanel({ canOpenScanner }: { canOpenScanner: boolean }) {
  const { ui } = useAppTranslation();
  return <section className="section" style={panelStyle}>
    <div className="section__title">{ui("Offline mobile task execution")}</div>
    <div className="card">
      <div className="card__label">{ui("Operational mobile mode")}</div>
      <h3>{ui("Mobile Execution keeps a local task snapshot and queues supported task actions while offline.")}</h3>
      <p className="card__subtext capability-help">{ui("Operators can start, complete, block, or unblock execution tasks while disconnected. When connectivity returns, queued actions are replayed through the normal task permissions and audit trail. Stock-changing work such as receiving, transfers, counts, and dispatch still requires connectivity so the app does not create conflicting offline inventory ledgers.")}</p>
      <div className="capability-action-row">
        <Link className="button" to="/mobile-execution">{ui("Open Mobile Execution")}</Link>
        {canOpenScanner ? <Link className="button button--secondary" to="/scanner">{ui("Open scanner")}</Link> : null}
      </div>
    </div>
    <div className="card">
      <div className="card__label">{ui("Installable web app foundation")}</div>
      <p className="card__subtext">{ui("On supported phones and tablets, the app can be installed from the browser for quicker access to the mobile workflow.")}</p>
      <span style={badgeStyle}>{ui("Offline queue + server replay")}</span>
    </div>
  </section>;
}
