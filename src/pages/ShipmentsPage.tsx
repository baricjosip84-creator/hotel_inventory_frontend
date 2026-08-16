import { formatCurrencyAmount } from '../lib/tenantCurrency';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { apiRequest, ApiError } from '../lib/api';
import { fetchTenantSubscriptionAccess, getTenantFeatureEntitlement } from '../lib/tenantSubscriptionAccess';
import { getCurrentAccessRoleLabel, getRoleCapabilities } from '../lib/permissions';

/**
 * ============================================================================
 * ShipmentsPage
 * ============================================================================
 *
 * Production-oriented shipment UI for:
 * - creating shipments
 * - selecting and reviewing shipments
 * - adding shipment items
 * - receiving shipment items line-by-line
 * - partial receiving
 * - finalizing fully received shipments
 * - finalizing partially received shipments only when shortages have saved reasons
 * - auto-selecting a shipment when scanner redirects with ?shipmentId=
 * - highlighting and preparing a shipment item when product barcode scan returns
 * - auto-receiving one unit from scanner when a safe storage location is known
 */

type ShipmentSummary = {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  supplier_retired?: boolean;
  delivery_date: string;
  status: 'pending' | 'partial' | 'received' | string;
  qr_code: string;
  po_number?: string | null;
  purchase_order_id?: string | null;
  linked_purchase_order_number?: string | null;
  linked_purchase_order_status?: string | null;
  version: number;
  line_count?: number;
  total_ordered_quantity?: number | string;
  total_received_quantity?: number | string;
};

type ShipmentItem = {
  id: string;
  shipment_id: string;
  product_id: string;
  product_name?: string;
  product_retired?: boolean;
  quantity: number | string;
  received_quantity?: number | string;
  discrepancy?: number | string;
  discrepancy_reason?: string | null;
  storage_location_id?: string | null;
  storage_location_name?: string | null;
  storage_location_retired?: boolean;
  expiry_date?: string | null;
  lot_number?: string | null;
  batch_number?: string | null;
  manufactured_at?: string | null;
  shortage_quantity?: number | string | null;
  overage_quantity?: number | string | null;
  damaged_quantity?: number | string | null;
  rejected_quantity?: number | string | null;
  quarantine_quantity?: number | string | null;
  unit_cost?: number | string | null;
  unit_cost_currency?: string | null;
  version?: number;
};

type SupplierOption = {
  id: string;
  name: string;
};

type ProductOption = {
  id: string;
  name: string;
  supplier_id?: string | null;
  supplier_name?: string | null;
  barcode?: string | null;
};

type StorageLocationOption = {
  id: string;
  name: string;
};

type PurchaseOrderOption = {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  po_number: string;
  status: string;
  expected_delivery_date?: string | null;
  items?: Array<{
    product_id: string;
    quantity: number | string;
  }>;
};

type ShipmentOptions = {
  suppliers: SupplierOption[];
  products: ProductOption[];
  storage_locations: StorageLocationOption[];
  approved_purchase_orders: PurchaseOrderOption[];
};

type ShipmentFormState = {
  supplier_id: string;
  delivery_date: string;
  po_number: string;
  purchase_order_id: string;
};

type ItemFormState = {
  product_id: string;
  quantity: string;
  unit_cost: string;
  storage_location_id: string;
  lot_number: string;
  batch_number: string;
  expiry_date: string;
  manufactured_at: string;
};

type ReceiveDraft = {
  quantity_received: string;
  uom_code: string;
  serial_numbers: string;
  storage_location_id: string;
  lot_number: string;
  batch_number: string;
  expiry_date: string;
  manufactured_at: string;
  shortage_quantity: string;
  overage_quantity: string;
  damaged_quantity: string;
  rejected_quantity: string;
  quarantine_quantity: string;
  discrepancy_reason: string;
  receiving_note: string;
};

type ReceiveShipmentLineItemPayload = {
  product_id: string;
  quantity_received?: number;
  uom_code?: string;
  serial_numbers?: string[];
  package_id?: string;
  package_count_received?: number;
  storage_location_id: string;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  manufactured_at?: string | null;
  shortage_quantity?: number;
  overage_quantity?: number;
  damaged_quantity?: number;
  rejected_quantity?: number;
  quarantine_quantity?: number;
  discrepancy_reason?: string | null;
  receiving_note?: string | null;
};

type ReceiveShipmentResponse = {
  message: string;
  status: string;
  purchase_order_id?: string | null;
  linked_purchase_order_receiving_summary?: {
    id: string;
    po_number: string;
    receiving_status: string;
    receiving_percent: number;
    ordered_quantity: number;
    received_quantity: number;
    remaining_quantity: number;
    open_linked_shipment_count: number;
  } | null;
};

type FinalizeShipmentResponse = {
  message: string;
  status: string;
  finalized_with_discrepancies?: boolean;
  total_lines?: number;
  incomplete_line_count?: number;
};

type SendShipmentToSupplierResponse = {
  message?: string;
  shipment_id?: string;
  po_number?: string | null;
  supplier_email?: string | null;
  recipient_email?: string | null;
  pdf_filename?: string;
  qr_filename?: string;
  delivery_method?: string;
  sandbox_capture?: boolean;
  attachments?: Array<{
    filename?: string | null;
    content_type?: string | null;
  }>;
};

type SupplierEmailPreview = {
  recipient_email: string;
  subject: string;
  message?: string | null;
  qr_image_data_uri?: string | null;
  document: {
    document_title: string;
    shipment_id: string;
    linked_purchase_order_id?: string | null;
    po_number?: string | null;
    issue_date?: string | null;
    expected_delivery_date?: string | null;
    delivery_address?: string | null;
    payment_terms?: string | null;
    notes?: string | null;
    approved_by?: string | null;
    currency?: string | null;
    show_pricing?: boolean;
    pricing_complete?: boolean | null;
    subtotal?: number | null;
    qr_code: string;
    qr_purpose: string;
    pdf_filename: string;
    buyer: { name: string; address?: string | null; email?: string | null; phone?: string | null; tax_id?: string | null };
    supplier: { name: string; address?: string | null; email?: string | null; phone?: string | null; tax_id?: string | null };
    items: Array<{
      product_id: string;
      product_name: string;
      sku?: string | null;
      supplier_sku?: string | null;
      quantity: number | string;
      unit: string;
      unit_price?: number | null;
      line_total?: number | null;
    }>;
  };
};

type PendingAutoReceive = {
  itemId: string;
  scannedBarcode: string | null;
  packageId: string | null;
  packageName: string | null;
  packageBarcode: string | null;
  unitsPerPackage: number | null;
  remainingPackagesEstimate: number | null;
  canReceiveOneFullPackage: boolean | null;
  matchSource: string | null;
  barcodeLabelId: string | null;
  labelBarcode: string | null;
  labelLot: string | null;
  labelBatch: string | null;
  labelExpiry: string | null;
};

async function fetchShipments(): Promise<ShipmentSummary[]> {
  return apiRequest<ShipmentSummary[]>('/shipments');
}

async function fetchShipmentOptions(): Promise<ShipmentOptions> {
  return apiRequest<ShipmentOptions>('/shipments/options');
}

async function fetchShipmentItems(shipmentId: string): Promise<ShipmentItem[]> {
  return apiRequest<ShipmentItem[]>(`/shipment-items/${shipmentId}`);
}

async function createShipment(input: ShipmentFormState): Promise<ShipmentSummary> {
  return apiRequest<ShipmentSummary>('/shipments', {
    method: 'POST',
    body: JSON.stringify({
      supplier_id: input.supplier_id,
      delivery_date: input.delivery_date,
      po_number: input.po_number.trim() || null,
      purchase_order_id: input.purchase_order_id || null
    })
  });
}

async function updateShipment(input: {
  shipmentId: string;
  version: number;
  form: ShipmentFormState;
}): Promise<ShipmentSummary> {
  return apiRequest<ShipmentSummary>(`/shipments/${input.shipmentId}`, {
    method: 'PATCH',
    headers: {
      'If-Match-Version': String(input.version)
    },
    body: JSON.stringify({
      supplier_id: input.form.supplier_id,
      delivery_date: input.form.delivery_date,
      po_number: input.form.po_number.trim() || null,
      purchase_order_id: input.form.purchase_order_id || null
    })
  });
}

async function deleteShipment(input: {
  shipmentId: string;
  version: number;
}): Promise<{ message?: string }> {
  return apiRequest<{ message?: string }>(`/shipments/${input.shipmentId}`, {
    method: 'DELETE',
    headers: {
      'If-Match-Version': String(input.version)
    }
  });
}

async function addShipmentItem(input: {
  shipment_id: string;
  product_id: string;
  quantity: number;
  unit_cost?: number | null;
  storage_location_id?: string | null;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  manufactured_at?: string | null;
}): Promise<ShipmentItem> {
  return apiRequest<ShipmentItem>('/shipment-items', {
    method: 'POST',
    body: JSON.stringify({
      shipment_id: input.shipment_id,
      product_id: input.product_id,
      quantity: input.quantity,
      unit_cost: input.unit_cost ?? null,
      storage_location_id: input.storage_location_id || null,
      lot_number: input.lot_number || null,
      batch_number: input.batch_number || null,
      expiry_date: input.expiry_date || null,
      manufactured_at: input.manufactured_at || null
    })
  });
}

async function updateShipmentItem(input: {
  itemId: string;
  version: number;
  quantity: number;
}): Promise<ShipmentItem> {
  return apiRequest<ShipmentItem>(`/shipment-items/${input.itemId}`, {
    method: 'PATCH',
    headers: {
      'If-Match-Version': String(input.version)
    },
    body: JSON.stringify({
      quantity: input.quantity
    })
  });
}

async function deleteShipmentItem(input: {
  itemId: string;
  version: number;
}): Promise<{ message?: string }> {
  return apiRequest<{ message?: string }>(`/shipment-items/${input.itemId}`, {
    method: 'DELETE',
    headers: {
      'If-Match-Version': String(input.version)
    }
  });
}

async function recordReceivingDiscrepancy(input: {
  itemId: string;
  version: number;
  discrepancyReason: string;
}): Promise<ShipmentItem> {
  return apiRequest<ShipmentItem>(`/shipment-items/${input.itemId}/receiving-discrepancy`, {
    method: 'PATCH',
    headers: {
      'If-Match-Version': String(input.version)
    },
    body: JSON.stringify({
      discrepancy_reason: input.discrepancyReason
    }),
    skipMutationFeedback: true
  });
}

async function autoReorderShipments(): Promise<{ message?: string; shipments?: ShipmentSummary[]; created_shipments?: ShipmentSummary[] }> {
  return apiRequest<{ message?: string; shipments?: ShipmentSummary[]; created_shipments?: ShipmentSummary[] }>('/shipments/auto-reorder', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function receiveShipmentLine(input: {
  shipmentId: string;
  version: number;
  item: ReceiveShipmentLineItemPayload;
}): Promise<ReceiveShipmentResponse> {
  return apiRequest<ReceiveShipmentResponse>(`/shipments/${input.shipmentId}/receive`, {
    method: 'POST',
    headers: {
      'If-Match-Version': String(input.version)
    },
    body: JSON.stringify({
      items: [input.item]
    }),
    skipMutationFeedback: true
  });
}

async function finalizeShipment(input: {
  shipmentId: string;
  version: number;
}): Promise<FinalizeShipmentResponse> {
  return apiRequest<FinalizeShipmentResponse>(`/shipments/${input.shipmentId}/finalize`, {
    method: 'POST',
    headers: {
      'If-Match-Version': String(input.version)
    },
    body: JSON.stringify({}),
    skipMutationFeedback: true
  });
}

async function previewShipmentSupplierEmail(input: {
  shipmentId: string;
  recipientEmail?: string;
  message?: string;
}): Promise<SupplierEmailPreview> {
  return apiRequest<SupplierEmailPreview>(`/shipments/${input.shipmentId}/supplier-email-preview`, {
    method: 'POST',
    body: JSON.stringify({
      recipient_email: input.recipientEmail?.trim() || null,
      message: input.message?.trim() || null
    })
  });
}

async function sendShipmentToSupplier(input: {
  shipmentId: string;
  recipientEmail: string;
  message?: string;
}): Promise<SendShipmentToSupplierResponse> {
  return apiRequest<SendShipmentToSupplierResponse>(
    `/shipments/${input.shipmentId}/send-to-supplier`,
    {
      method: 'POST',
      body: JSON.stringify({
        recipient_email: input.recipientEmail.trim(),
        message: input.message?.trim() || null,
        confirmed: true
      })
    }
  );
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
}

function formatQuantity(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatCurrency(value: number | string | null | undefined, currency?: string | null): string {
  return formatCurrencyAmount(value, currency, 4);
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function emptyShipmentForm(): ShipmentFormState {
  return {
    supplier_id: '',
    delivery_date: '',
    po_number: '',
    purchase_order_id: ''
  };
}

function emptyItemForm(): ItemFormState {
  return {
    product_id: '',
    quantity: '1',
    unit_cost: '',
    storage_location_id: '',
    lot_number: '',
    batch_number: '',
    expiry_date: '',
    manufactured_at: ''
  };
}

function makeDefaultReceiveDraft(item: ShipmentItem): ReceiveDraft {
  const ordered = toNumber(item.quantity);
  const received = toNumber(item.received_quantity);
  const remaining = Math.max(ordered - received, 0);

  return {
    quantity_received: remaining > 0 ? String(remaining) : '0',
    uom_code: '',
    serial_numbers: '',
    storage_location_id: item.storage_location_id || '',
    lot_number: item.lot_number || '',
    batch_number: item.batch_number || '',
    expiry_date: item.expiry_date ? String(item.expiry_date).slice(0, 10) : '',
    manufactured_at: item.manufactured_at ? String(item.manufactured_at).slice(0, 10) : '',
    shortage_quantity: String(item.shortage_quantity || 0),
    overage_quantity: String(item.overage_quantity || 0),
    damaged_quantity: '0',
    rejected_quantity: '0',
    quarantine_quantity: '0',
    discrepancy_reason: item.discrepancy_reason || '',
    receiving_note: ''
  };
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString();
}

function formatShipmentStatus(status: string | null | undefined): string {
  if (!status) return '-';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusBadgeStyle(status: string): CSSProperties {
  if (status === 'received') {
    return {
      ...styles.badgeBase,
      background: '#dcfce7',
      color: '#166534'
    };
  }

  if (status === 'partial') {
    return {
      ...styles.badgeBase,
      background: '#fef3c7',
      color: '#92400e'
    };
  }

  return {
    ...styles.badgeBase,
    background: '#dbeafe',
    color: '#1d4ed8'
  };
}

function useIsMobile(breakpoint = 1024): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [breakpoint]);

  return isMobile;
}

export default function ShipmentsPage() {
  const queryClient = useQueryClient();

  const {
    canManageShipments,
    canManageShipmentItems,
    canViewShipmentItems,
    canSendShipments,
    canReceiveShipments,
    canFinalizeShipments,
    canAutoReorderShipments,
    canViewPurchaseOrders
  } = getRoleCapabilities();
  const accessRoleLabel = getCurrentAccessRoleLabel();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [highlightedItemId, setHighlightedItemId] = useState('');
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shipmentPageSize, setShipmentPageSize] = useState(25);
  const [shipmentPage, setShipmentPage] = useState(1);
  const [selectedScannerLocationId, setSelectedScannerLocationId] = useState('');

  const [shipmentForm, setShipmentForm] = useState<ShipmentFormState>(emptyShipmentForm());
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm());
  const [editingShipment, setEditingShipment] = useState(false);
  const [editShipmentForm, setEditShipmentForm] = useState<ShipmentFormState>(emptyShipmentForm());
  const [itemEditDrafts, setItemEditDrafts] = useState<Record<string, string>>({});
  const [receiveDrafts, setReceiveDrafts] = useState<Record<string, ReceiveDraft>>({});
  const [pendingAutoReceive, setPendingAutoReceive] = useState<PendingAutoReceive | null>(null);
  const autoReceiveAttemptKeyRef = useRef<string>('');

  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [supplierEmailPreview, setSupplierEmailPreview] = useState<SupplierEmailPreview | null>(null);
  const [supplierEmailRecipient, setSupplierEmailRecipient] = useState('');
  const [supplierEmailMessage, setSupplierEmailMessage] = useState('');

  const shipmentsQuery = useQuery({
    queryKey: ['shipments'],
    queryFn: fetchShipments
  });

  const shipmentOptionsQuery = useQuery({
    queryKey: ['shipments', 'options'],
    queryFn: fetchShipmentOptions
  });

  const subscriptionAccessQuery = useQuery({
    queryKey: ['tenant-subscription-access', 'shipments-purchase-orders'],
    queryFn: fetchTenantSubscriptionAccess,
    enabled: canViewPurchaseOrders
  });
  const purchaseOrdersEntitlement = getTenantFeatureEntitlement(subscriptionAccessQuery.data, 'purchase_orders');
  const purchaseOrdersEntitled = purchaseOrdersEntitlement ? purchaseOrdersEntitlement.allowed : true;
  const purchaseOrdersFeatureReady = Boolean(subscriptionAccessQuery.data) && purchaseOrdersEntitled;

  const shipmentItemsQuery = useQuery({
    queryKey: ['shipment-items', selectedShipmentId],
    queryFn: () => fetchShipmentItems(selectedShipmentId),
    enabled: Boolean(selectedShipmentId) && canViewShipmentItems
  });

  const createShipmentMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: async (shipment) => {
      setShipmentForm(emptyShipmentForm());
      setSelectedShipmentId(shipment.id);
      setReceiveDrafts({});
      setHighlightedItemId('');
      setPendingAutoReceive(null);
      setSelectedScannerLocationId('');
      autoReceiveAttemptKeyRef.current = '';
      setPageError(null);
      setPageMessage(null);

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to create shipment.');
      }
      setPageMessage(null);
    }
  });

  const addShipmentItemMutation = useMutation({
    mutationFn: addShipmentItem,
    onSuccess: async () => {
      setItemForm(emptyItemForm());
      setPageError(null);
      setPageMessage(null);

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to add shipment item.');
      }
      setPageMessage(null);
    }
  });

  const updateShipmentMutation = useMutation({
    mutationFn: updateShipment,
    onSuccess: async (shipment) => {
      setEditingShipment(false);
      setPageError(null);
      setPageMessage('Shipment updated successfully.');
      setSelectedShipmentId(shipment.id);
      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to update shipment.');
    }
  });

  const deleteShipmentMutation = useMutation({
    mutationFn: deleteShipment,
    onSuccess: async (result) => {
      setSelectedShipmentId('');
      setReceiveDrafts({});
      setItemEditDrafts({});
      setEditingShipment(false);
      setHighlightedItemId('');
      setPendingAutoReceive(null);
      autoReceiveAttemptKeyRef.current = '';
      setPageError(null);
      setPageMessage(result.message || 'Shipment deleted successfully.');
      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to delete shipment.');
    }
  });

  const updateShipmentItemMutation = useMutation({
    mutationFn: updateShipmentItem,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('Shipment item updated successfully.');
      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to update shipment item.');
    }
  });

  const deleteShipmentItemMutation = useMutation({
    mutationFn: deleteShipmentItem,
    onSuccess: async (result) => {
      setPageError(null);
      setPageMessage(result.message || 'Shipment item deleted successfully.');
      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to delete shipment item.');
    }
  });

  const recordReceivingDiscrepancyMutation = useMutation({
    mutationFn: recordReceivingDiscrepancy,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('Shortage reason saved. This incomplete line can now be finalized as a documented discrepancy.');
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });
      await queryClient.refetchQueries({ queryKey: ['shipments'] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to save shortage reason.');
    }
  });

  const autoReorderShipmentMutation = useMutation({
    mutationFn: autoReorderShipments,
    onSuccess: async (result) => {
      const createdCount = result.created_shipments?.length ?? result.shipments?.length ?? 0;
      setPageError(null);
      setPageMessage(result.message || `Auto reorder completed. ${createdCount} shipment${createdCount === 1 ? '' : 's'} created.`);
      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-low-stock'] });
    },
    onError: (error) => {
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to run shipment auto reorder.');
    }
  });

  const receiveShipmentMutation = useMutation({
    mutationFn: receiveShipmentLine,
    onSuccess: async (data, variables) => {
      setPageError(null);

      const matchedItem = shipmentItems.find((item) => item.product_id === variables.item.product_id);
      const quantityLabel = variables.item.package_count_received
        ? `${formatQuantity(variables.item.package_count_received)} package${variables.item.package_count_received === 1 ? '' : 's'}`
        : formatQuantity(variables.item.quantity_received ?? 0);
      const productLabel = matchedItem?.product_name || matchedItem?.product_id || variables.item.product_id;

      const poSummary = data.linked_purchase_order_receiving_summary;
      const poProgressLabel = poSummary
        ? ` PO progress: ${formatQuantity(poSummary.received_quantity)} / ${formatQuantity(poSummary.ordered_quantity)} received.`
        : '';

      setPageMessage(`✔ ${productLabel} +${quantityLabel} received into stock.${poProgressLabel}`);

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });

      const linkedPurchaseOrderId = data.purchase_order_id || selectedShipment?.purchase_order_id;
      if (linkedPurchaseOrderId) {
        await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        await queryClient.invalidateQueries({ queryKey: ['purchase-order', linkedPurchaseOrderId] });
      }

      await queryClient.invalidateQueries({ queryKey: ['stock'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to receive shipment item.');
      }
      setPageMessage(null);
    }
  });

  const finalizeShipmentMutation = useMutation({
    mutationFn: finalizeShipment,
    onSuccess: async (data) => {
      setPageError(null);
      setPageMessage(
        data.finalized_with_discrepancies
          ? `✔ Shipment finalized with ${data.incomplete_line_count ?? 0} documented receiving discrepancy line(s).`
          : '✔ Shipment finalized and locked for receiving.'
      );

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });

      if (selectedShipment?.purchase_order_id) {
        await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        await queryClient.invalidateQueries({ queryKey: ['purchase-order', selectedShipment.purchase_order_id] });
      }

      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to finalize shipment.');
      }
      setPageMessage(null);
    }
  });

  const previewShipmentSupplierEmailMutation = useMutation({
    mutationFn: previewShipmentSupplierEmail,
    onSuccess: (preview) => {
      setSupplierEmailPreview(preview);
      setSupplierEmailRecipient(preview.recipient_email || '');
      setSupplierEmailMessage(preview.message || '');
      setPageError(null);
      setPageMessage(null);
    },
    onError: (error) => {
      setSupplierEmailPreview(null);
      setPageMessage(null);
      setPageError(error instanceof ApiError ? error.message : 'Failed to prepare supplier email preview.');
    }
  });

  const sendShipmentToSupplierMutation = useMutation({
    mutationFn: sendShipmentToSupplier,
    onSuccess: async (data) => {
      const recipientEmail = data.recipient_email || data.supplier_email || 'supplier';
      const poLabel = data.po_number ? ` for PO ${data.po_number}` : '';
      const attachmentNames =
        data.attachments
          ?.map((attachment) => attachment.filename)
          .filter((filename): filename is string => Boolean(filename)) ?? [];

      const attachmentLabel = attachmentNames.length > 0
        ? ` Attachments: ${attachmentNames.join(', ')}.`
        : ' QR information was included by the backend when available.';
      const fallbackMessage = data.sandbox_capture
        ? `✔ Purchase order test email${poLabel} captured in Mailtrap Sandbox for ${recipientEmail}.${attachmentLabel}`
        : `✔ Purchase order${poLabel} emailed to ${recipientEmail}.${attachmentLabel}`;

      setPageError(null);
      setPageMessage(data.message || fallbackMessage);
      setSupplierEmailPreview(null);
      setSupplierEmailRecipient('');
      setSupplierEmailMessage('');

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.code === 'EMAIL_NOT_CONFIGURED') {
          setPageError('Supplier email is not configured on this server. The shipment was not changed; continue receiving/finalizing manually or configure backend email settings before using supplier email.');
        } else {
          setPageError(error.message);
        }
      } else {
        setPageError('Failed to email shipment to supplier.');
      }
      setPageMessage(null);
    }
  });

  const shipments = useMemo(() => shipmentsQuery.data ?? [], [shipmentsQuery.data]);
  const shipmentItems = useMemo(() => shipmentItemsQuery.data ?? [], [shipmentItemsQuery.data]);
  const suppliers = useMemo(
    () => shipmentOptionsQuery.data?.suppliers ?? [],
    [shipmentOptionsQuery.data]
  );
  const products = useMemo(
    () => shipmentOptionsQuery.data?.products ?? [],
    [shipmentOptionsQuery.data]
  );
  const storageLocations = useMemo(
    () => shipmentOptionsQuery.data?.storage_locations ?? [],
    [shipmentOptionsQuery.data]
  );
  const approvedPurchaseOrders = useMemo(
    () => purchaseOrdersFeatureReady ? shipmentOptionsQuery.data?.approved_purchase_orders ?? [] : [],
    [purchaseOrdersFeatureReady, shipmentOptionsQuery.data]
  );
  const linkablePurchaseOrders = useMemo(() => {
    if (!shipmentForm.supplier_id) return approvedPurchaseOrders;
    return approvedPurchaseOrders.filter((order) => order.supplier_id === shipmentForm.supplier_id);
  }, [approvedPurchaseOrders, shipmentForm.supplier_id]);
  const editLinkablePurchaseOrders = useMemo(() => {
    if (!editShipmentForm.supplier_id) return approvedPurchaseOrders;
    return approvedPurchaseOrders.filter((order) => order.supplier_id === editShipmentForm.supplier_id);
  }, [approvedPurchaseOrders, editShipmentForm.supplier_id]);

  const selectedShipment =
    shipments.find((shipment) => shipment.id === selectedShipmentId) ?? null;
  const selectedShipmentIsPending = selectedShipment?.status === 'pending';

  useEffect(() => {
    if (!selectedShipment) {
      setEditingShipment(false);
      setEditShipmentForm(emptyShipmentForm());
      return;
    }

    setEditShipmentForm({
      supplier_id: selectedShipment.supplier_id || '',
      delivery_date: selectedShipment.delivery_date ? selectedShipment.delivery_date.slice(0, 10) : '',
      po_number: selectedShipment.po_number || '',
      purchase_order_id: selectedShipment.purchase_order_id || ''
    });
    setEditingShipment(false);
  }, [selectedShipment]);

  useEffect(() => {
    setItemEditDrafts(
      Object.fromEntries(shipmentItems.map((item) => [item.id, String(toNumber(item.quantity) || '')]))
    );
  }, [shipmentItems]);

  const shipmentProductOptions = useMemo(() => {
    const allProducts = products;

    if (!selectedShipment) {
      return allProducts;
    }

    const linkedPurchaseOrder = approvedPurchaseOrders.find(
      (order) => order.id === selectedShipment.purchase_order_id
    );
    const linkedProductIds = linkedPurchaseOrder
      ? new Set((linkedPurchaseOrder.items ?? []).map((item) => item.product_id))
      : null;

    return allProducts.filter((product) => {
      if (linkedProductIds && !linkedProductIds.has(product.id)) {
        return false;
      }

      if (!product.supplier_id) {
        return true;
      }

      return product.supplier_id === selectedShipment.supplier_id;
    });
  }, [approvedPurchaseOrders, products, selectedShipment]);

  const selectedShipmentOrderedTotal = shipmentItems.reduce(
    (sum, item) => sum + toNumber(item.quantity),
    0
  );
  const selectedShipmentReceivedTotal = shipmentItems.reduce(
    (sum, item) => sum + toNumber(item.received_quantity),
    0
  );
  const selectedShipmentRemainingTotal = Math.max(
    selectedShipmentOrderedTotal - selectedShipmentReceivedTotal,
    0
  );
  const selectedShipmentProgress = clampPercentage(
    selectedShipmentOrderedTotal > 0
      ? (selectedShipmentReceivedTotal / selectedShipmentOrderedTotal) * 100
      : 0
  );

  const incompleteShipmentLines = shipmentItems.filter((item) => {
    const ordered = toNumber(item.quantity);
    const received = toNumber(item.received_quantity);
    return received < ordered;
  });

  const incompleteShipmentLinesWithoutReason = incompleteShipmentLines.filter((item) => {
    const persistedReason = typeof item.discrepancy_reason === 'string'
      ? item.discrepancy_reason.trim()
      : '';

    return !persistedReason;
  });

  const canFinalizeSelectedShipment =
    Boolean(selectedShipment) &&
    selectedShipment?.status !== 'received' &&
    shipmentItems.length > 0 &&
    incompleteShipmentLinesWithoutReason.length === 0;

  const finalizeReadinessMessage =
    !selectedShipment
      ? 'Select a shipment first.'
      : !canViewShipmentItems
        ? 'Shipment item read permission is required to review finalization readiness.'
      : selectedShipment.status === 'received'
        ? 'Shipment already finalized.'
        : shipmentItems.length === 0
          ? 'Add shipment items before finalizing.'
          : incompleteShipmentLinesWithoutReason.length > 0
            ? `${incompleteShipmentLinesWithoutReason.length} incomplete line(s) need a saved discrepancy reason before finalization.`
            : incompleteShipmentLines.length > 0
              ? `${incompleteShipmentLines.length} incomplete line(s) have documented shortage reasons and can be finalized as discrepancies.`
              : 'All lines are fully received and ready to finalize.';

  const selectedScannerLocationName =
    storageLocations.find((location) => location.id === selectedScannerLocationId)?.name ?? '';
  const hasStorageLocations = storageLocations.length > 0;
  const hasShipmentItems = shipmentItems.length > 0;
  const hasRemainingQuantity = selectedShipmentRemainingTotal > 0;
  const shipmentWorkflowSteps = [
    {
      label: '1. Select Shipment',
      detail: selectedShipment ? 'Shipment selected and ready for receiving.' : 'Choose the inbound shipment you want to process.',
      complete: Boolean(selectedShipment)
    },
    {
      label: '2. Set Scan Location',
      detail: selectedScannerLocationId
        ? `Scanning into ${selectedScannerLocationName}.`
        : hasStorageLocations
          ? 'Choose the default storage location before scanning.'
          : 'Create a storage location before receiving or scanning.',
      complete: Boolean(selectedScannerLocationId)
    },
    {
      label: '3. Receive Items',
      detail: !canViewShipmentItems
        ? 'Shipment item details are hidden for this role.'
        : shipmentItemsQuery.isError
          ? 'Shipment lines could not be loaded. Refresh the page before receiving or finalizing.'
          : hasShipmentItems
            ? hasRemainingQuantity
              ? 'Receive lines manually or through the receiving barcode scanner.'
              : 'All current shipment lines are fully received.'
            : 'Add shipment items before receiving inventory.',
      complete: canViewShipmentItems && !shipmentItemsQuery.isError && hasShipmentItems && !hasRemainingQuantity
    },
    {
      label: '4. Finalize Shipment',
      detail: finalizeReadinessMessage,
      complete: selectedShipment?.status === 'received'
    }
  ];

  const filteredShipments = useMemo(() => {
    const search = shipmentSearch.trim().toLowerCase();

    const statusPriority: Record<string, number> = {
      partial: 0,
      pending: 1,
      received: 2
    };

    return shipments
      .filter((shipment) => {
        const matchesStatus = statusFilter ? shipment.status === statusFilter : true;

        const haystack = [
          shipment.id,
          shipment.po_number,
          shipment.linked_purchase_order_number,
          shipment.purchase_order_id,
          shipment.qr_code,
          shipment.supplier_name,
          shipment.supplier_id,
          shipment.status,
          shipment.delivery_date
        ]
          .map((value) => String(value ?? '').toLowerCase())
          .join(' ');

        const matchesSearch = search ? haystack.includes(search) : true;

        return matchesStatus && matchesSearch;
      })
      .sort((left, right) =>
        (statusPriority[left.status] ?? 99) - (statusPriority[right.status] ?? 99)
      );
  }, [shipments, shipmentSearch, statusFilter]);

  const shipmentPageCount = Math.max(1, Math.ceil(filteredShipments.length / shipmentPageSize));
  const safeShipmentPage = Math.min(shipmentPage, shipmentPageCount);
  const pagedShipments = useMemo(() => {
    const start = (safeShipmentPage - 1) * shipmentPageSize;
    return filteredShipments.slice(start, start + shipmentPageSize);
  }, [filteredShipments, safeShipmentPage, shipmentPageSize]);

  useEffect(() => {
    setShipmentPage(1);
  }, [shipmentSearch, statusFilter, shipmentPageSize]);

  useEffect(() => {
    if (shipmentPage > shipmentPageCount) {
      setShipmentPage(shipmentPageCount);
    }
  }, [shipmentPage, shipmentPageCount]);

  useEffect(() => {
    const shipmentIdFromQuery = searchParams.get('shipmentId');

    if (!shipmentIdFromQuery) {
      return;
    }

    if (shipments.length === 0) {
      return;
    }

    const matchedShipment = shipments.find((shipment) => shipment.id === shipmentIdFromQuery);

    if (!matchedShipment) {
      setPageError('Scanned shipment was not found in the current shipment list.');
      return;
    }

    setSelectedShipmentId(matchedShipment.id);
    setReceiveDrafts({});
    setPageError(null);

    const itemIdFromQuery = searchParams.get('itemId');
    const scannedBarcode = searchParams.get('scannedBarcode');
    const locationIdFromQuery = searchParams.get('locationId');
    const packageIdFromQuery = searchParams.get('packageId');
    const packageNameFromQuery = searchParams.get('packageName');
    const packageBarcodeFromQuery = searchParams.get('packageBarcode');
    const unitsPerPackageFromQuery = searchParams.get('unitsPerPackage');
    const remainingPackagesEstimateFromQuery = searchParams.get('remainingPackagesEstimate');
    const canReceiveOneFullPackageFromQuery = searchParams.get('canReceiveOneFullPackage');
    const matchSourceFromQuery = searchParams.get('matchSource');
    const barcodeLabelIdFromQuery = searchParams.get('barcodeLabelId');
    const labelBarcodeFromQuery = searchParams.get('labelBarcode');
    const labelLotFromQuery = searchParams.get('labelLot');
    const labelBatchFromQuery = searchParams.get('labelBatch');
    const labelExpiryFromQuery = searchParams.get('labelExpiry');
    const parsedUnitsPerPackage = unitsPerPackageFromQuery ? Number(unitsPerPackageFromQuery) : null;
    const parsedRemainingPackagesEstimate = remainingPackagesEstimateFromQuery
      ? Number(remainingPackagesEstimateFromQuery)
      : null;

    if (locationIdFromQuery) {
      setSelectedScannerLocationId(locationIdFromQuery);
    } else if (itemIdFromQuery || scannedBarcode) {
      setSelectedScannerLocationId('');
    }

    if (itemIdFromQuery) {
      setHighlightedItemId(itemIdFromQuery);
      autoReceiveAttemptKeyRef.current = '';

      if (!locationIdFromQuery) {
        setPendingAutoReceive(null);
        const labelTraceability = [
          labelLotFromQuery ? `Lot ${labelLotFromQuery}` : '',
          labelBatchFromQuery ? `Batch ${labelBatchFromQuery}` : '',
          labelExpiryFromQuery ? `Expires ${new Date(labelExpiryFromQuery).toLocaleDateString()}` : ''
        ].filter(Boolean).join(' · ');
        setPageMessage(
          scannedBarcode
            ? barcodeLabelIdFromQuery
              ? `Inventory label ${labelBarcodeFromQuery || scannedBarcode} matched${labelTraceability ? ` · ${labelTraceability}` : ''}. Select a default scan location before receiving.`
              : `Product barcode ${scannedBarcode} matched inside selected shipment. Select a default scan location before receiving.`
            : 'Shipment item matched from scanner. Select a default scan location before receiving.'
        );
      } else {
        setPendingAutoReceive({
          itemId: itemIdFromQuery,
          scannedBarcode,
          packageId: packageIdFromQuery,
          packageName: packageNameFromQuery,
          packageBarcode: packageBarcodeFromQuery,
          unitsPerPackage: Number.isFinite(parsedUnitsPerPackage) ? parsedUnitsPerPackage : null,
          remainingPackagesEstimate: Number.isFinite(parsedRemainingPackagesEstimate)
            ? parsedRemainingPackagesEstimate
            : null,
          canReceiveOneFullPackage:
            canReceiveOneFullPackageFromQuery === null
              ? null
              : canReceiveOneFullPackageFromQuery === 'true',
          matchSource: matchSourceFromQuery,
          barcodeLabelId: barcodeLabelIdFromQuery,
          labelBarcode: labelBarcodeFromQuery,
          labelLot: labelLotFromQuery,
          labelBatch: labelBatchFromQuery,
          labelExpiry: labelExpiryFromQuery
        });

        const labelTraceability = [
          labelLotFromQuery ? `Lot ${labelLotFromQuery}` : '',
          labelBatchFromQuery ? `Batch ${labelBatchFromQuery}` : '',
          labelExpiryFromQuery ? `Expires ${new Date(labelExpiryFromQuery).toLocaleDateString()}` : ''
        ].filter(Boolean).join(' · ');

        setPageMessage(
          scannedBarcode
            ? barcodeLabelIdFromQuery
              ? `Inventory label ${labelBarcodeFromQuery || scannedBarcode} matched inside selected shipment${labelTraceability ? ` · ${labelTraceability}` : ''}.`
              : packageNameFromQuery && unitsPerPackageFromQuery
                ? `Package barcode ${scannedBarcode} matched: ${packageNameFromQuery} (${unitsPerPackageFromQuery} units/package).`
                : `Product barcode ${scannedBarcode} matched inside selected shipment.`
            : 'Shipment item matched from scanner.'
        );
      }
    } else {
      setHighlightedItemId('');
      setPendingAutoReceive(null);
      autoReceiveAttemptKeyRef.current = '';
      setPageMessage('Shipment opened from scanner.');
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('shipmentId');
    nextParams.delete('itemId');
    nextParams.delete('scannedBarcode');
    nextParams.delete('locationId');
    nextParams.delete('packageId');
    nextParams.delete('packageName');
    nextParams.delete('packageBarcode');
    nextParams.delete('unitsPerPackage');
    nextParams.delete('remainingPackagesEstimate');
    nextParams.delete('canReceiveOneFullPackage');
    nextParams.delete('matchSource');
    nextParams.delete('barcodeLabelId');
    nextParams.delete('labelBarcode');
    nextParams.delete('labelLot');
    nextParams.delete('labelBatch');
    nextParams.delete('labelExpiry');
    setSearchParams(nextParams, { replace: true });
  }, [shipments, searchParams, setSearchParams]);

  useEffect(() => {
    if (!highlightedItemId || shipmentItems.length === 0) {
      return;
    }

    const matchedItem = shipmentItems.find((item) => item.id === highlightedItemId);

    if (!matchedItem) {
      return;
    }

    const ordered = toNumber(matchedItem.quantity);
    const received = toNumber(matchedItem.received_quantity);
    const remaining = Math.max(ordered - received, 0);

    setReceiveDrafts((current) => {
      const existing = current[matchedItem.id] ?? makeDefaultReceiveDraft(matchedItem);

      return {
        ...current,
        [matchedItem.id]: {
          ...existing,
          quantity_received: remaining > 0 ? existing.quantity_received || '1' : existing.quantity_received
        }
      };
    });
  }, [highlightedItemId, shipmentItems]);

  useEffect(() => {
    if (!selectedScannerLocationId || shipmentItems.length === 0) {
      return;
    }

    setReceiveDrafts((current) => {
      let changed = false;
      const next = { ...current };

      shipmentItems.forEach((item) => {
        const ordered = toNumber(item.quantity);
        const received = toNumber(item.received_quantity);
        const remaining = Math.max(ordered - received, 0);

        if (remaining <= 0) {
          return;
        }

        const existing = next[item.id] ?? makeDefaultReceiveDraft(item);

        if (!existing.storage_location_id) {
          next[item.id] = {
            ...existing,
            storage_location_id: selectedScannerLocationId
          };
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [selectedScannerLocationId, shipmentItems]);

  const getReceiveDraft = useCallback((item: ShipmentItem): ReceiveDraft => {
    const draft = receiveDrafts[item.id] ?? makeDefaultReceiveDraft(item);

    if (!draft.storage_location_id && selectedScannerLocationId) {
      return {
        ...draft,
        storage_location_id: selectedScannerLocationId
      };
    }

    return draft;
  }, [receiveDrafts, selectedScannerLocationId]);

  useEffect(() => {
    if (!pendingAutoReceive) {
      return;
    }

    if (!selectedShipment) {
      return;
    }

    if (selectedShipment.status === 'received') {
      setPendingAutoReceive(null);
      autoReceiveAttemptKeyRef.current = '';
      return;
    }

    if (shipmentItems.length === 0) {
      return;
    }

    if (receiveShipmentMutation.isPending) {
      return;
    }

    const matchedItem = shipmentItems.find((item) => item.id === pendingAutoReceive.itemId);

    if (!matchedItem) {
      setPendingAutoReceive(null);
      autoReceiveAttemptKeyRef.current = '';
      return;
    }

    const attemptKey = [
      selectedShipment.id,
      matchedItem.id,
      pendingAutoReceive.scannedBarcode || '',
      pendingAutoReceive.packageId || '',
      pendingAutoReceive.barcodeLabelId || '',
      String(pendingAutoReceive.unitsPerPackage ?? '')
    ].join(':');

    if (autoReceiveAttemptKeyRef.current === attemptKey) {
      return;
    }

    const ordered = toNumber(matchedItem.quantity);
    const received = toNumber(matchedItem.received_quantity);
    const remaining = Math.max(ordered - received, 0);

    if (remaining <= 0) {
      autoReceiveAttemptKeyRef.current = attemptKey;
      setPendingAutoReceive(null);
      setPageMessage('Scanned item is already fully received.');
      return;
    }

    const draft = getReceiveDraft(matchedItem);

    const safeStorageLocationId =
      draft.storage_location_id ||
      selectedScannerLocationId ||
      matchedItem.storage_location_id ||
      (storageLocations.length === 1 ? storageLocations[0].id : '');

    if (!safeStorageLocationId) {
      autoReceiveAttemptKeyRef.current = attemptKey;
      setPendingAutoReceive(null);
      setPageMessage(
        'Product matched. Quantity was set to 1, but auto receive stopped because you must choose a storage location first.'
      );
      return;
    }

    const packageUnits = pendingAutoReceive.unitsPerPackage;
    const shouldReceiveByPackage = Boolean(pendingAutoReceive.packageId && packageUnits && packageUnits > 0);
    const baseQuantityToReceive = shouldReceiveByPackage ? Number(packageUnits) : remaining >= 1 ? 1 : remaining;

    if (shouldReceiveByPackage && baseQuantityToReceive > remaining) {
      autoReceiveAttemptKeyRef.current = attemptKey;
      setPendingAutoReceive(null);
      setPageError(
        `${pendingAutoReceive.packageName || 'Scanned package'} contains ${formatQuantity(baseQuantityToReceive)} base units, but only ${formatQuantity(remaining)} remain on this shipment line.`
      );
      setPageMessage(null);
      return;
    }

    setReceiveDrafts((current) => ({
      ...current,
      [matchedItem.id]: {
        ...(current[matchedItem.id] ?? makeDefaultReceiveDraft(matchedItem)),
        quantity_received: String(baseQuantityToReceive),
        storage_location_id: safeStorageLocationId,
        lot_number: pendingAutoReceive.labelLot || current[matchedItem.id]?.lot_number || matchedItem.lot_number || '',
        batch_number: pendingAutoReceive.labelBatch || current[matchedItem.id]?.batch_number || matchedItem.batch_number || '',
        expiry_date: pendingAutoReceive.labelExpiry ? String(pendingAutoReceive.labelExpiry).slice(0, 10) : (current[matchedItem.id]?.expiry_date || (matchedItem.expiry_date ? String(matchedItem.expiry_date).slice(0, 10) : ''))
      }
    }));

    autoReceiveAttemptKeyRef.current = attemptKey;
    setPendingAutoReceive(null);
    setPageError(null);
    setPageMessage(
      shouldReceiveByPackage
        ? `${pendingAutoReceive.packageName || 'Scanned package'} matched. Auto receiving 1 package (${formatQuantity(baseQuantityToReceive)} base units)...`
        : pendingAutoReceive.barcodeLabelId
          ? `Inventory label ${pendingAutoReceive.labelBarcode || pendingAutoReceive.scannedBarcode || ''} matched. Auto receiving ${formatQuantity(baseQuantityToReceive)} unit...`
          : pendingAutoReceive.scannedBarcode
            ? `Barcode ${pendingAutoReceive.scannedBarcode} matched. Auto receiving ${formatQuantity(baseQuantityToReceive)} unit...`
            : `Scanner matched item. Auto receiving ${formatQuantity(baseQuantityToReceive)} unit...`
    );

    receiveShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version,
      item: shouldReceiveByPackage && pendingAutoReceive.packageId
        ? {
            product_id: matchedItem.product_id,
            package_id: pendingAutoReceive.packageId,
            package_count_received: 1,
            storage_location_id: safeStorageLocationId,
            lot_number: pendingAutoReceive.labelLot || draft.lot_number || null,
            batch_number: pendingAutoReceive.labelBatch || draft.batch_number || null,
            expiry_date: pendingAutoReceive.labelExpiry || draft.expiry_date || null,
            manufactured_at: draft.manufactured_at || null,
            discrepancy_reason: draft.discrepancy_reason.trim() || null,
            receiving_note: draft.receiving_note.trim() || null
          }
        : {
            product_id: matchedItem.product_id,
            quantity_received: baseQuantityToReceive,
            storage_location_id: safeStorageLocationId,
            lot_number: pendingAutoReceive.labelLot || draft.lot_number || null,
            batch_number: pendingAutoReceive.labelBatch || draft.batch_number || null,
            expiry_date: pendingAutoReceive.labelExpiry || draft.expiry_date || null,
            manufactured_at: draft.manufactured_at || null,
            discrepancy_reason: draft.discrepancy_reason.trim() || null,
            receiving_note: draft.receiving_note.trim() || null
          }
    });
  }, [
    pendingAutoReceive,
    selectedShipment,
    shipmentItems,
    storageLocations,
    selectedScannerLocationId,
    receiveShipmentMutation,
    receiveDrafts,
    getReceiveDraft
  ]);

  const updateReceiveDraft = (
    itemId: string,
    updater: (current: ReceiveDraft) => ReceiveDraft
  ) => {
    setReceiveDrafts((current) => {
      const matchedItem = shipmentItems.find((item) => item.id === itemId);

      if (!matchedItem) {
        return current;
      }

      const base = current[itemId] ?? makeDefaultReceiveDraft(matchedItem);

      return {
        ...current,
        [itemId]: updater(base)
      };
    });
  };

  const handleAutoReorderShipments = () => {
    if (!canAutoReorderShipments) {
      setPageError('Your current role cannot run shipment auto reorder.');
      return;
    }

    const confirmed = window.confirm('Run auto reorder now? This may create shipments from current reorder rules.');
    if (!confirmed) return;

    setPageError(null);
    setPageMessage(null);
    autoReorderShipmentMutation.mutate();
  };

  const handleUpdateShipment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageShipments) {
      setPageError('Your current role cannot update shipments.');
      return;
    }

    if (!selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    if (selectedShipment.status !== 'pending') {
      setPageError('Shipment headers can only be edited while the shipment is pending.');
      return;
    }

    setPageError(null);
    setPageMessage(null);
    updateShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version,
      form: editShipmentForm
    });
  };

  const handleDeleteShipment = () => {
    if (!canManageShipments) {
      setPageError('Your current role cannot delete shipments.');
      return;
    }

    if (!selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    if (selectedShipment.status !== 'pending') {
      setPageError('Only pending shipments can be deleted.');
      return;
    }

    const confirmed = window.confirm('Delete this shipment? This uses the current shipment version and cannot be undone.');
    if (!confirmed) return;

    setPageError(null);
    setPageMessage(null);
    deleteShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version
    });
  };

  const updateItemEditDraft = (itemId: string, value: string) => {
    setItemEditDrafts((current) => ({
      ...current,
      [itemId]: value
    }));
  };

  const handleUpdateShipmentItem = (item: ShipmentItem) => {
    if (!canManageShipmentItems) {
      setPageError('Your current role cannot update shipment items.');
      return;
    }

    if (!selectedShipmentIsPending) {
      setPageError('Shipment lines can only be changed while the shipment is pending.');
      return;
    }

    if (item.version === undefined || item.version === null) {
      setPageError('Cannot update this shipment item because the backend did not return a version. Refresh and try again.');
      return;
    }

    const quantity = Number(itemEditDrafts[item.id]);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setPageError('Shipment item quantity must be greater than zero.');
      return;
    }

    setPageError(null);
    setPageMessage(null);
    updateShipmentItemMutation.mutate({
      itemId: item.id,
      version: item.version,
      quantity
    });
  };

  const handleDeleteShipmentItem = (item: ShipmentItem) => {
    if (!canManageShipmentItems) {
      setPageError('Your current role cannot delete shipment items.');
      return;
    }

    if (!selectedShipmentIsPending) {
      setPageError('Shipment lines can only be deleted while the shipment is pending.');
      return;
    }

    if (item.version === undefined || item.version === null) {
      setPageError('Cannot delete this shipment item because the backend did not return a version. Refresh and try again.');
      return;
    }

    const confirmed = window.confirm('Delete this shipment item? This uses the current item version and cannot be undone.');
    if (!confirmed) return;

    setPageError(null);
    setPageMessage(null);
    deleteShipmentItemMutation.mutate({
      itemId: item.id,
      version: item.version
    });
  };

  const handleSaveShortageReason = (item: ShipmentItem) => {
    if (!canReceiveShipments) {
      setPageError('Shipment receive permission is required to document a receiving shortage.');
      return;
    }

    if (selectedShipment?.status === 'received') {
      setPageError('This shipment is already finalized.');
      return;
    }

    if (item.version === undefined || item.version === null) {
      setPageError('Cannot save the shortage reason because the item version is missing. Refresh and try again.');
      return;
    }

    const reason = getReceiveDraft(item).discrepancy_reason.trim();
    if (!reason) {
      setPageError('Enter a shortage reason before saving it.');
      return;
    }

    setPageError(null);
    setPageMessage(null);
    recordReceivingDiscrepancyMutation.mutate({
      itemId: item.id,
      version: item.version,
      discrepancyReason: reason
    });
  };

  const canSubmitCreateShipment =
    canManageShipments &&
    Boolean(shipmentForm.supplier_id) &&
    Boolean(shipmentForm.delivery_date) &&
    !createShipmentMutation.isPending;

  const parsedShipmentItemQuantity = Number(itemForm.quantity);
  const parsedShipmentItemUnitCost =
    itemForm.unit_cost.trim() === '' ? null : Number(itemForm.unit_cost);
  const canSubmitShipmentItem =
    canManageShipmentItems &&
    selectedShipmentIsPending &&
    Boolean(selectedShipmentId) &&
    Boolean(itemForm.product_id) &&
    Number.isFinite(parsedShipmentItemQuantity) &&
    parsedShipmentItemQuantity > 0 &&
    (parsedShipmentItemUnitCost === null ||
      (Number.isFinite(parsedShipmentItemUnitCost) && parsedShipmentItemUnitCost >= 0)) &&
    !addShipmentItemMutation.isPending;

  const handleCreateShipment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError(null);
    setPageMessage(null);

    if (!canManageShipments) {
      setPageError('Your current role cannot create shipments.');
      return;
    }

    if (!shipmentForm.supplier_id || !shipmentForm.delivery_date) {
      setPageError('Select a supplier and delivery date before creating a shipment.');
      return;
    }

    createShipmentMutation.mutate(shipmentForm);
  };

  const handleAddShipmentItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageShipmentItems) {
      setPageError('Your current role cannot add shipment items. Shipment item writes are restricted by the existing backend permission.');
      return;
    }
    setPageError(null);
    setPageMessage(null);

    if (!selectedShipmentId || !selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    if (!selectedShipmentIsPending) {
      setPageError('Shipment items can only be added while the shipment is pending.');
      return;
    }

    if (!itemForm.product_id) {
      setPageError('Select a product before adding a shipment item.');
      return;
    }

    const quantity = Number(itemForm.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setPageError('Shipment item quantity must be greater than zero.');
      return;
    }

    const selectedProduct = products.find(
      (product) => product.id === itemForm.product_id
    );

    if (!selectedProduct) {
      setPageError('The selected product is no longer available. Refresh the page and choose it again.');
      return;
    }

    if (
      selectedProduct?.supplier_id &&
      selectedProduct.supplier_id !== selectedShipment.supplier_id
    ) {
      setPageError(
        'Product supplier does not match the selected shipment supplier. Choose a product from this supplier, or use an unassigned product.'
      );
      return;
    }

    const parsedUnitCost = itemForm.unit_cost.trim() === '' ? null : Number(itemForm.unit_cost);

    if (parsedUnitCost !== null && (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0)) {
      setPageError('Unit cost must be a valid non-negative number, or left blank.');
      return;
    }

    addShipmentItemMutation.mutate({
      shipment_id: selectedShipmentId,
      product_id: itemForm.product_id,
      quantity,
      unit_cost: parsedUnitCost,
      storage_location_id: itemForm.storage_location_id || null,
      lot_number: itemForm.lot_number.trim() || null,
      batch_number: itemForm.batch_number.trim() || null,
      expiry_date: itemForm.expiry_date || null,
      manufactured_at: itemForm.manufactured_at || null
    });
  };

  const handleReceiveLine = (item: ShipmentItem) => {
    const clickedAt = new Date().toLocaleTimeString();
    const selectedLocation =
      selectedScannerLocationId ||
      item.storage_location_id ||
      (storageLocations.length === 1 ? storageLocations[0].id : '');
    const draft = getReceiveDraft(item);
    const safeStorageLocationId = draft.storage_location_id || selectedLocation;
    const ordered = toNumber(item.quantity);
    const received = toNumber(item.received_quantity);
    const remaining = Math.max(ordered - received, 0);
    const draftQuantity = Number(draft.quantity_received || 0);
    const quantityReceived = Number.isFinite(draftQuantity) && draftQuantity >= 0
      ? Math.min(draftQuantity, remaining || draftQuantity)
      : 0;
    const damagedQuantity = Math.max(Number(draft.damaged_quantity || 0), 0);
    const rejectedQuantity = Math.max(Number(draft.rejected_quantity || 0), 0);
    const quarantineQuantity = Math.max(Number(draft.quarantine_quantity || 0), 0);
    const hasPhysicalReceipt = quantityReceived > 0 || damagedQuantity > 0 || rejectedQuantity > 0 || quarantineQuantity > 0;

    setPageError(null);
    setPageMessage(`Receive click detected at ${clickedAt}. Preparing backend request...`);

    if (!canReceiveShipments) {
      setPageError('Receive click detected, but your current role cannot receive shipments. Log in as tenant admin or manager.');
      setPageMessage(null);
      return;
    }

    if (!selectedShipment) {
      setPageError('Receive click detected, but no shipment is selected. Select PO-001 again and retry.');
      setPageMessage(null);
      return;
    }

    if (remaining <= 0) {
      setPageError('Receive click detected, but this shipment line is already fully received.');
      setPageMessage(null);
      return;
    }

    if (!Number.isFinite(quantityReceived) || quantityReceived < 0 || !hasPhysicalReceipt) {
      setPageError('Enter a usable, damaged, rejected, or quarantine quantity before receiving this line.');
      setPageMessage(null);
      return;
    }

    if (!safeStorageLocationId) {
      setPageError('Receive click detected, but no storage location is available. Set Scan Location to Main Warehouse, then retry.');
      setPageMessage(null);
      return;
    }

    setReceiveDrafts((current) => ({
      ...current,
      [item.id]: {
        ...(current[item.id] ?? makeDefaultReceiveDraft(item)),
        ...draft,
        quantity_received: String(quantityReceived),
        storage_location_id: safeStorageLocationId
      }
    }));

    setPageMessage(`Sending receive request for ${formatQuantity(quantityReceived)} unit${quantityReceived === 1 ? '' : 's'} of ${item.product_name || item.product_id}...`);

    receiveShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version,
      item: {
        product_id: item.product_id,
        quantity_received: quantityReceived,
        uom_code: draft.uom_code.trim() || undefined,
        serial_numbers: draft.serial_numbers.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean),
        storage_location_id: safeStorageLocationId,
        lot_number: draft.lot_number.trim() || null,
        batch_number: draft.batch_number.trim() || null,
        expiry_date: draft.expiry_date || null,
        manufactured_at: draft.manufactured_at || null,
        shortage_quantity: Math.max(Number(draft.shortage_quantity || 0), 0),
        overage_quantity: Math.max(Number(draft.overage_quantity || 0), 0),
        damaged_quantity: damagedQuantity,
        rejected_quantity: rejectedQuantity,
        quarantine_quantity: quarantineQuantity,
        discrepancy_reason: draft.discrepancy_reason.trim() || null,
        receiving_note: draft.receiving_note.trim() || null
      }
    });
  };

  const handleFinalizeShipment = () => {
    if (!canFinalizeShipments) {
      setPageError('Your current role does not have the shipments.finalize permission required to finalize shipments.');
      return;
    }

    setPageError(null);
    setPageMessage(null);

    if (!selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    if (shipmentItems.length === 0) {
      setPageError('Add shipment items before finalizing.');
      return;
    }

    if (selectedShipment.status === 'received') {
      setPageError('Shipment is already finalized.');
      return;
    }

    if (incompleteShipmentLinesWithoutReason.length > 0) {
      setPageError(
        `${incompleteShipmentLinesWithoutReason.length} incomplete line(s) still need a saved discrepancy reason before finalization. Enter a shortage reason on each incomplete line and use Save shortage reason; receiving additional stock is not required.`
      );
      return;
    }

    const confirmed = window.confirm(
      incompleteShipmentLines.length > 0
        ? `Finalize shipment with ${incompleteShipmentLines.length} documented shortage/discrepancy line(s)? This will lock the shipment as received.`
        : 'Finalize this fully received shipment? This will lock receiving.'
    );

    if (!confirmed) {
      return;
    }

    finalizeShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version
    });
  };

  const handleSendShipmentToSupplier = () => {
    if (!canSendShipments) {
      setPageError('Your current role does not have the shipments.send permission required to email suppliers.');
      return;
    }

    setPageError(null);
    setPageMessage(null);

    if (!selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    if (shipmentItems.length === 0) {
      setPageError('Add at least one shipment item before preparing the supplier Purchase Order / Receiving Reference.');
      return;
    }

    previewShipmentSupplierEmailMutation.mutate({ shipmentId: selectedShipment.id });
  };

  const handleConfirmSupplierEmailSend = () => {
    if (!selectedShipment || !supplierEmailPreview) return;
    const recipient = supplierEmailRecipient.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      setPageError('Enter a valid supplier email address before sending.');
      return;
    }

    setPageError(null);
    sendShipmentToSupplierMutation.mutate({
      shipmentId: selectedShipment.id,
      recipientEmail: recipient,
      message: supplierEmailMessage
    });
  };

  const closeSupplierEmailPreview = () => {
    if (sendShipmentToSupplierMutation.isPending) return;
    setSupplierEmailPreview(null);
    setSupplierEmailRecipient('');
    setSupplierEmailMessage('');
  };

  const selectShipment = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setReceiveDrafts({});
    setHighlightedItemId('');
    setPendingAutoReceive(null);
    setSelectedScannerLocationId('');
    autoReceiveAttemptKeyRef.current = '';
    setPageError(null);
    setPageMessage(null);
  };

  const openProductScanner = () => {
    if (!canReceiveShipments) {
      setPageError('Shipment receive permission is required before opening the receiving barcode scanner.');
      return;
    }

    if (!selectedShipmentId) {
      setPageError('Select a shipment before opening product scanner.');
      return;
    }

    if (!selectedScannerLocationId) {
      setPageError('Select a default storage location before opening product scanner.');
      return;
    }

    const scannerParams = new URLSearchParams();
    scannerParams.set('mode', 'product');
    scannerParams.set('shipmentId', selectedShipmentId);
    scannerParams.set('locationId', selectedScannerLocationId);
    scannerParams.set('shipmentLabel', selectedShipment?.po_number || selectedShipmentId);
    scannerParams.set('locationName', selectedScannerLocationName || selectedScannerLocationId);

    navigate(`/scanner?${scannerParams.toString()}`);
  };

  const handleRefreshPage = async () => {
    setPageError(null);
    setPageMessage(null);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['shipments'] }),
      queryClient.refetchQueries({ queryKey: ['shipments', 'options'] }),
      canViewPurchaseOrders
        ? queryClient.refetchQueries({ queryKey: ['tenant-subscription-access', 'shipments-purchase-orders'] })
        : Promise.resolve(),
      selectedShipmentId && canViewShipmentItems
        ? queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] })
        : Promise.resolve()
    ]);
    setPageMessage('Shipment data refreshed.');
  };

  return (
    <div className="io-operational-page io-shipments-page">
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Inbound Receiving</h2>
          <p style={styles.description}>
            Create inbound shipments, add shipment items, receive lines partially
            or fully, and finalize only when all shortages are documented.
          </p>
        </div>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={handleRefreshPage}
          disabled={shipmentsQuery.isFetching || shipmentOptionsQuery.isFetching}
        >
          {shipmentsQuery.isFetching || shipmentOptionsQuery.isFetching ? 'Refreshing...' : 'Refresh page'}
        </button>
      </div>

      {pageError ? <div style={styles.errorBox}>{pageError}</div> : null}
      {pageMessage ? <div style={styles.successBox}>{pageMessage}</div> : null}

      {shipmentsQuery.isError ? (
        <div style={styles.errorBox}>
          Shipment list could not be loaded. {shipmentsQuery.error instanceof ApiError ? shipmentsQuery.error.message : 'Refresh the page and try again.'}
        </div>
      ) : null}

      {shipmentOptionsQuery.isError ? (
        <div style={styles.warningBox}>
          Some shipment form choices could not be loaded. The shipment list remains available, but creating shipments, adding lines, or choosing receiving locations may be unavailable until the options refresh succeeds.
        </div>
      ) : null}

      {canViewPurchaseOrders && subscriptionAccessQuery.isError ? (
        <div style={styles.warningBox}>
          Purchase Order linking is temporarily unavailable because feature access could not be verified. Shipments can still be managed without a linked Purchase Order when your permissions allow it.
        </div>
      ) : null}

      {!canManageShipments || !canManageShipmentItems || !canFinalizeShipments ? (
        <div style={styles.warningBox}>
          Current access role: {accessRoleLabel}.{' '}
          {[
            !canManageShipments ? 'Shipment creation and header changes require shipments.write.' : null,
            !canManageShipmentItems ? 'Ordered shipment-line changes require shipment_items.write.' : null,
            !canFinalizeShipments ? 'Finalization requires shipments.finalize.' : null,
            canReceiveShipments
              ? 'Receiving remains available through shipments.receive.'
              : 'Receiving requires shipments.receive.'
          ].filter(Boolean).join(' ')}
        </div>
      ) : null}

      {!canViewShipmentItems ? (
        <div style={styles.warningBox}>
          Shipment item read permission is not available for this role. Shipment headers can still be reviewed, but line-level receiving progress and item details are hidden.
        </div>
      ) : null}

      {canAutoReorderShipments ? (
        <details style={styles.advancedPanel}>
          <summary style={styles.advancedSummary}>Direct shipment reorder (legacy)</summary>
          <p style={styles.panelSubtitle}>
            This directly creates pending shipment records from low-stock rules. It does not create or approve a Purchase Order. Use Procurement Recommendations or Replenishment Planning for the governed planning workflows.
          </p>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleAutoReorderShipments}
            disabled={autoReorderShipmentMutation.isPending}
          >
            {autoReorderShipmentMutation.isPending ? 'Running direct reorder...' : 'Run direct reorder'}
          </button>
        </details>
      ) : null}

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Create Shipment</h3>

        {!canManageShipments ? (
          <div style={styles.readOnlyNotice}>
            This role can review shipments but cannot create or edit shipment headers.
          </div>
        ) : (
        <form
          onSubmit={handleCreateShipment}
          style={styles.formGrid}
          data-skip-global-action-feedback="true"
        >
          <div>
            <label style={styles.label}>Supplier</label>
            <select
              style={styles.input}
              value={shipmentForm.supplier_id}
              onChange={(event) =>
                setShipmentForm((current) => ({
                  ...current,
                  supplier_id: event.target.value,
                  purchase_order_id: ''
                }))
              }
              required
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={styles.label}>Delivery Date</label>
            <input
              style={styles.input}
              type="date"
              value={shipmentForm.delivery_date}
              onChange={(event) =>
                setShipmentForm((current) => ({
                  ...current,
                  delivery_date: event.target.value
                }))
              }
              required
            />
          </div>

          <div>
            <label style={styles.label}>PO Number</label>
            <input
              style={styles.input}
              type="text"
              value={shipmentForm.po_number}
              onChange={(event) =>
                setShipmentForm((current) => ({
                  ...current,
                  po_number: event.target.value
                }))
              }
              placeholder="Optional purchase order number"
              maxLength={100}
            />
          </div>

          {purchaseOrdersFeatureReady ? (
          <div>
            <div style={styles.fieldLabelRow}>
              <label style={styles.labelInline}>Linked Purchase Order</label>
              <span
                style={styles.infoBadge}
                role="note"
                tabIndex={0}
                aria-label="Optional bridge only. Linking an approved Purchase Order does not change stock or receiving logic."
                title="Optional bridge only: this links an approved Purchase Order to the shipment without changing stock or receiving logic."
              >
                i
              </span>
            </div>
            <select
              style={styles.input}
              value={shipmentForm.purchase_order_id}
              onChange={(event) => {
                const purchaseOrderId = event.target.value;
                const selectedOrder = approvedPurchaseOrders.find((order) => order.id === purchaseOrderId);

                setShipmentForm((current) => ({
                  ...current,
                  purchase_order_id: purchaseOrderId,
                  supplier_id: selectedOrder?.supplier_id || current.supplier_id,
                  po_number: selectedOrder?.po_number || current.po_number
                }));
              }}
            >
              <option value="">No linked PO yet</option>
              {linkablePurchaseOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.po_number} · {order.supplier_name || order.supplier_id}
                  {order.expected_delivery_date ? ` · ${formatDate(order.expected_delivery_date)}` : ''}
                </option>
              ))}
            </select>
          </div>
          ) : null}

          <div style={styles.formActionRow}>
            <span style={styles.actionLabelSpacer} aria-hidden="true">Action</span>
            <button
              type="submit"
              style={{
                ...styles.primaryButton,
                ...(!canSubmitCreateShipment ? styles.primaryButtonDisabled : {})
              }}
              disabled={!canSubmitCreateShipment}
              title={
                !canManageShipments
                  ? 'Shipments write permission required'
                  : !shipmentForm.supplier_id || !shipmentForm.delivery_date
                    ? 'Select a supplier and delivery date first'
                    : undefined
              }
            >
              {createShipmentMutation.isPending ? 'Creating...' : 'Create Shipment'}
            </button>
            {!shipmentForm.supplier_id || !shipmentForm.delivery_date ? (
              <p style={styles.formActionHint}>
                Select a supplier and delivery date before creating a shipment.
              </p>
            ) : null}
          </div>
        </form>
        )}
      </section>

      <section
        style={{
          ...styles.twoColumnGrid,
          gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 420px) minmax(0, 1fr)'
        }}
      >
        <div style={styles.panel}>
          <div style={styles.shipmentListHeader}>
            <div>
              <h3 style={styles.panelTitle}>Shipment List</h3>
              <p style={styles.panelSubtitle}>
                Filter shipments and select one for line management and receiving.
              </p>
            </div>
          </div>

          <div
            style={{
              ...styles.filterGrid,
              gridTemplateColumns: isMobile ? '1fr' : '1fr 180px'
            }}
          >
            <input
              style={styles.input}
              type="text"
              placeholder="Search by PO, supplier, shipment ID, status..."
              value={shipmentSearch}
              onChange={(event) => setShipmentSearch(event.target.value)}
              maxLength={255}
            />

            <select
              style={styles.input}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="received">Received</option>
            </select>
          </div>

          <div
            style={{
              ...styles.shipmentList
            }}
          >
            {shipmentsQuery.isLoading ? (
              <p style={styles.emptyState}>Loading shipments...</p>
            ) : filteredShipments.length === 0 ? (
              <p style={styles.emptyState}>No shipments match the current filter.</p>
            ) : (
              pagedShipments.map((shipment) => {
                const isSelected = shipment.id === selectedShipmentId;
                const ordered = toNumber(shipment.total_ordered_quantity);
                const received = toNumber(shipment.total_received_quantity);

                return (
                  <button
                    key={shipment.id}
                    type="button"
                    onClick={() => selectShipment(shipment.id)}
                    style={{
                      ...styles.shipmentCard,
                      ...(isSelected ? styles.shipmentCardSelected : {})
                    }}
                  >
                    <div
                      style={{
                        ...styles.shipmentCardTop,
                        flexDirection: isMobile ? 'column' : 'row',
                        alignItems: isMobile ? 'flex-start' : 'flex-start'
                      }}
                    >
                      <div style={styles.shipmentCardTitleBlock}>
                        <div style={styles.shipmentCardTitle}>
                          {shipment.po_number || 'No PO Number'}
                        </div>
                        <div style={styles.shipmentCardSubtle}>Reference: {shipment.id.slice(0, 8)}…</div>
                      </div>

                      <span style={statusBadgeStyle(shipment.status)}>
                        {shipment.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={styles.shipmentCardMeta}>
                      <div>
                        <strong>Supplier:</strong> {shipment.supplier_name || shipment.supplier_id}
                        {shipment.supplier_retired ? ' (retired)' : ''}
                      </div>
                      <div>
                        <strong>Linked PO:</strong> {shipment.linked_purchase_order_number || '-'}
                      </div>
                      <div>
                        <strong>Delivery:</strong> {formatDate(shipment.delivery_date)}
                      </div>
                      <div>
                        <strong>Lines:</strong> {shipment.line_count ?? 0}
                      </div>
                      <div>
                        <strong>Ordered:</strong> {ordered}
                      </div>
                      <div>
                        <strong>Received:</strong> {received}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {filteredShipments.length > 0 ? (
            <div style={styles.paginationRow}>
              <div style={styles.paginationMetaRow}>
                <span style={styles.paginationSummary}>
                  Showing {(safeShipmentPage - 1) * shipmentPageSize + 1}–{Math.min(safeShipmentPage * shipmentPageSize, filteredShipments.length)} of {filteredShipments.length}
                </span>
                <select
                  style={styles.compactSelect}
                  value={shipmentPageSize}
                  onChange={(event) => setShipmentPageSize(Number(event.target.value))}
                  aria-label="Shipments per page"
                >
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
              <div style={styles.paginationControls}>
                <button
                  type="button"
                  style={{
                    ...styles.secondaryButton,
                    ...styles.paginationButton,
                    ...(safeShipmentPage <= 1 ? styles.secondaryButtonDisabled : {})
                  }}
                  onClick={() => setShipmentPage((page) => Math.max(1, page - 1))}
                  disabled={safeShipmentPage <= 1}
                >
                  Previous
                </button>
                <span style={styles.paginationPageLabel}>Page {safeShipmentPage} of {shipmentPageCount}</span>
                <button
                  type="button"
                  style={{
                    ...styles.secondaryButton,
                    ...styles.paginationButton,
                    ...(safeShipmentPage >= shipmentPageCount ? styles.secondaryButtonDisabled : {})
                  }}
                  onClick={() => setShipmentPage((page) => Math.min(shipmentPageCount, page + 1))}
                  disabled={safeShipmentPage >= shipmentPageCount}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div style={styles.panel}>
          <div style={styles.shipmentListHeader}>
            <div>
              <h3 style={styles.panelTitle}>Selected Shipment</h3>
              <p style={styles.panelSubtitle}>
                Add shipment lines, receive stock into locations, document shortages, and finalize the shipment.
              </p>
            </div>
          </div>

          {!selectedShipment ? (
            <div style={styles.guidedEmptyState}>
              <div style={styles.guidedEmptyStateTitle}>Select a shipment to continue</div>
              <div style={styles.guidedEmptyStateText}>
                Use the shipment list on the left to open one pending or partial shipment.
                After that, operators can choose a scan location, receive line items, and finalize the shipment.
              </div>
              <div style={styles.workflowGuideGrid}>
                {shipmentWorkflowSteps.map((step) => (
                  <article
                    key={step.label}
                    style={step.complete ? styles.workflowStepCardComplete : styles.workflowStepCard}
                  >
                    <div style={styles.workflowStepLabel}>{step.label}</div>
                    <div style={styles.workflowStepText}>{step.detail}</div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={styles.workflowGuideGrid}>
                {shipmentWorkflowSteps.map((step) => (
                  <article
                    key={step.label}
                    style={step.complete ? styles.workflowStepCardComplete : styles.workflowStepCard}
                  >
                    <div style={styles.workflowStepLabel}>{step.label}</div>
                    <div style={styles.workflowStepText}>{step.detail}</div>
                  </article>
                ))}
              </div>

              <div style={styles.selectedShipmentBox}>
                <div
                  style={{
                    ...styles.selectedShipmentGrid,
                    gridTemplateColumns: isMobile
                      ? '1fr'
                      : 'repeat(auto-fit, minmax(180px, 1fr))'
                  }}
                >
                  <div>
                    <strong>Shipment ID</strong>
                    <div style={{ wordBreak: 'break-all' }}>{selectedShipment.id}</div>
                  </div>
                  <div>
                    <strong>Status</strong>
                    <div>{formatShipmentStatus(selectedShipment.status)}</div>
                  </div>
                  <div>
                    <strong>Supplier</strong>
                    <div style={{ wordBreak: 'break-word' }}>
                      {selectedShipment.supplier_name || selectedShipment.supplier_id}
                      {selectedShipment.supplier_retired ? ' (retired)' : ''}
                    </div>
                  </div>
                  <div>
                    <strong>Delivery Date</strong>
                    <div>{formatDate(selectedShipment.delivery_date)}</div>
                  </div>
                  <div>
                    <strong>PO Number</strong>
                    <div style={{ wordBreak: 'break-all' }}>{selectedShipment.po_number || '-'}</div>
                  </div>
                  <div>
                    <strong>Linked Purchase Order</strong>
                    <div style={{ wordBreak: 'break-all' }}>
                      {selectedShipment.linked_purchase_order_number || selectedShipment.purchase_order_id || '-'}
                    </div>
                    {selectedShipment.purchase_order_id && purchaseOrdersFeatureReady ? (
                      <>
                        <button
                          type="button"
                          style={{ ...styles.secondaryButton, marginTop: 8 }}
                          onClick={() => navigate(`/purchase-orders?purchaseOrderId=${encodeURIComponent(selectedShipment.purchase_order_id as string)}`)}
                        >
                          Open PO
                        </button>
                        <div style={{ marginTop: 8, color: '#64748b', fontSize: '0.85rem', lineHeight: 1.4 }}>
                          Receiving this shipment updates stock through the existing shipment flow and refreshes linked PO progress.
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div>
                    <strong>Version</strong>
                    <div>{selectedShipment.version}</div>
                  </div>
                  <div>
                    <strong>QR Code</strong>
                    <div style={{ wordBreak: 'break-all' }}>{selectedShipment.qr_code}</div>
                  </div>
                </div>
              </div>

              {canManageShipments && selectedShipmentIsPending ? (
                <div style={styles.selectedActionRow}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => setEditingShipment((current) => !current)}
                    disabled={updateShipmentMutation.isPending || deleteShipmentMutation.isPending}
                  >
                    {editingShipment ? 'Cancel Edit' : 'Edit Shipment'}
                  </button>
                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={handleDeleteShipment}
                    disabled={deleteShipmentMutation.isPending}
                  >
                    {deleteShipmentMutation.isPending ? 'Deleting...' : 'Delete Shipment'}
                  </button>
                </div>
              ) : canManageShipments ? (
                <div style={styles.readOnlyNotice}>
                  Shipment header and line structure are locked after receiving starts. Receiving and finalization remain available according to your permissions.
                </div>
              ) : null}

              {editingShipment ? (
                <form onSubmit={handleUpdateShipment} style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>Supplier</label>
                    <select
                      style={styles.input}
                      value={editShipmentForm.supplier_id}
                      onChange={(event) =>
                        setEditShipmentForm((current) => ({
                          ...current,
                          supplier_id: event.target.value,
                          purchase_order_id: ''
                        }))
                      }
                      required
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={styles.label}>Delivery Date</label>
                    <input
                      style={styles.input}
                      type="date"
                      value={editShipmentForm.delivery_date}
                      onChange={(event) =>
                        setEditShipmentForm((current) => ({
                          ...current,
                          delivery_date: event.target.value
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label style={styles.label}>PO Number</label>
                    <input
                      style={styles.input}
                      type="text"
                      value={editShipmentForm.po_number}
                      onChange={(event) =>
                        setEditShipmentForm((current) => ({
                          ...current,
                          po_number: event.target.value
                        }))
                      }
                      placeholder="Optional purchase order number"
                      maxLength={100}
                    />
                  </div>

                  {purchaseOrdersFeatureReady ? (
                    <div>
                      <label style={styles.label}>Linked Purchase Order</label>
                      <select
                        style={styles.input}
                        value={editShipmentForm.purchase_order_id}
                        onChange={(event) => {
                          const purchaseOrderId = event.target.value;
                          const selectedOrder = approvedPurchaseOrders.find((order) => order.id === purchaseOrderId);
                          setEditShipmentForm((current) => ({
                            ...current,
                            purchase_order_id: purchaseOrderId,
                            supplier_id: selectedOrder?.supplier_id || current.supplier_id,
                            po_number: selectedOrder?.po_number || current.po_number
                          }));
                        }}
                      >
                        <option value="">No linked PO</option>
                        {editLinkablePurchaseOrders.map((order) => (
                          <option key={order.id} value={order.id}>
                            {order.po_number} · {order.supplier_name || order.supplier_id}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  <div style={styles.formActionRow}>
                    <button
                      type="submit"
                      style={styles.primaryButton}
                      disabled={updateShipmentMutation.isPending}
                    >
                      {updateShipmentMutation.isPending ? 'Saving...' : 'Save Shipment'}
                    </button>
                  </div>
                </form>
              ) : null}

              <div
                style={{
                  ...styles.scannerReadinessSection,
                  gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1fr'
                }}
              >
                <div style={styles.readinessCard}>
                  <div style={styles.readinessHeaderRow}>
                    <div>
                      <h4 style={styles.sectionTitle}>Receiving Progress</h4>
                      <div style={styles.inlineHint}>
                        Keep operators oriented while partially receiving the shipment.
                      </div>
                    </div>
                    <span style={canFinalizeSelectedShipment ? styles.progressBadgeComplete : styles.progressBadgePending}>
                      {canFinalizeSelectedShipment ? 'Ready to finalize' : `${Math.round(selectedShipmentProgress)}% received`}
                    </span>
                  </div>

                  <div style={styles.progressSummaryRow}>
                    <div style={styles.progressMetricBox}>
                      <strong>Received</strong>
                      <div>{formatQuantity(selectedShipmentReceivedTotal)}</div>
                    </div>
                    <div style={styles.progressMetricBox}>
                      <strong>Ordered</strong>
                      <div>{formatQuantity(selectedShipmentOrderedTotal)}</div>
                    </div>
                    <div style={styles.progressMetricBox}>
                      <strong>Remaining</strong>
                      <div>{formatQuantity(selectedShipmentRemainingTotal)}</div>
                    </div>
                  </div>

                  <div style={styles.progressBarTrack} aria-label="Shipment receive progress">
                    <div
                      style={{
                        ...styles.progressBarFill,
                        width: `${selectedShipmentProgress}%`
                      }}
                    />
                  </div>

                  <div style={canFinalizeSelectedShipment ? styles.finalizeReadyBanner : styles.finalizeBlockedBanner}>
                    {finalizeReadinessMessage}
                  </div>
                </div>

                <div style={styles.readinessCard}>
                  <div style={styles.readinessHeaderRow}>
                    <div>
                      <h4 style={styles.sectionTitle}>Scanner Readiness</h4>
                      <div style={styles.inlineHint}>
                        Make scan destination explicit before operators open the scanner.
                      </div>
                    </div>
                    <span style={canReceiveShipments && selectedScannerLocationId ? styles.readinessStatusReady : styles.readinessStatusBlocked}>
                      {!canReceiveShipments ? 'Receive permission required' : selectedScannerLocationId ? 'Ready to scan' : 'Location required'}
                    </span>
                  </div>

                  <label style={styles.label}>
                    Default Scan Location
                    <div style={styles.inlineHint}>Required for barcode scanning and auto-receive</div>
                  </label>

                  <select
                    style={styles.input}
                    value={selectedScannerLocationId}
                    onChange={(event) => setSelectedScannerLocationId(event.target.value)}
                    disabled={!canReceiveShipments}
                    title={!canReceiveShipments ? 'Shipment receive permission is required' : undefined}
                  >
                    <option value="">Select location</option>
                    {storageLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>

                  {!canReceiveShipments ? (
                    <div style={styles.scanWarningBanner}>
                      The current role can review shipments but cannot receive stock. Shipment receive permission is required for barcode receiving.
                    </div>
                  ) : !hasStorageLocations ? (
                    <div style={styles.scanWarningBanner}>
                      No storage locations are available for this tenant. Create a storage location before scanning or receiving inventory.
                    </div>
                  ) : selectedScannerLocationId ? (
                    <div style={styles.scanReadyBanner}>
                      Scanning into: <strong>{selectedScannerLocationName}</strong>
                    </div>
                  ) : (
                    <div style={styles.scanWarningBanner}>
                      Default Scan Location required before scanning.
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.sectionDivider} />

              <h4 style={styles.sectionTitle}>Add Shipment Item</h4>
              {!canManageShipmentItems ? (
                <div style={styles.readOnlyNotice}>
                  This role can review shipment lines but cannot add or change ordered shipment items.
                </div>
              ) : !selectedShipmentIsPending ? (
                <div style={styles.readOnlyNotice}>
                  Ordered shipment lines are locked because receiving has already started. Continue with receiving and discrepancy documentation below.
                </div>
              ) : (
              <form
                onSubmit={handleAddShipmentItem}
                style={styles.formGrid}
                data-skip-global-action-feedback="true"
              >
                <div>
                  <label style={styles.label}>Product</label>
                  <select
                    style={styles.input}
                    value={itemForm.product_id}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        product_id: event.target.value
                      }))
                    }
                    required
                  >
                    <option value="">Select product</option>
                    {shipmentProductOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.supplier_name ? ` · ${product.supplier_name}` : ''}
                        {product.barcode ? ` · ${product.barcode}` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedShipment ? (
                    <div style={styles.inlineHint}>
                      {selectedShipment.purchase_order_id
                        ? 'List is limited to products on the linked Purchase Order that are compatible with this supplier.'
                        : 'List is limited to products from this shipment supplier, plus products without supplier assignment.'}
                    </div>
                  ) : null}
                </div>

                <div>
                  <label style={styles.label}>Quantity</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={itemForm.quantity}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        quantity: event.target.value
                      }))
                    }
                    required
                  />
                </div>

                <div>
                  <label style={styles.label}>Unit Cost</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.unit_cost}
                    onChange={(event) =>
                      setItemForm((current) => ({
                        ...current,
                        unit_cost: event.target.value
                      }))
                    }
                    placeholder="Optional cost per unit"
                  />
                  <div style={styles.inlineHint}>
                    Used by inventory valuation reports after receiving.
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Planned Storage Location</label>
                  <select style={styles.input} value={itemForm.storage_location_id} onChange={(event) => setItemForm((current) => ({ ...current, storage_location_id: event.target.value }))}>
                    <option value="">Set when receiving</option>
                    {storageLocations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Lot Number</label>
                  <input style={styles.input} value={itemForm.lot_number} onChange={(event) => setItemForm((current) => ({ ...current, lot_number: event.target.value }))} placeholder="Optional; can be confirmed at receipt" />
                </div>
                <div>
                  <label style={styles.label}>Batch Number</label>
                  <input style={styles.input} value={itemForm.batch_number} onChange={(event) => setItemForm((current) => ({ ...current, batch_number: event.target.value }))} placeholder="Optional; can be confirmed at receipt" />
                </div>
                <div>
                  <label style={styles.label}>Manufactured Date</label>
                  <input style={styles.input} type="date" value={itemForm.manufactured_at} onChange={(event) => setItemForm((current) => ({ ...current, manufactured_at: event.target.value }))} />
                </div>
                <div>
                  <label style={styles.label}>Expiry Date</label>
                  <input style={styles.input} type="date" value={itemForm.expiry_date} onChange={(event) => setItemForm((current) => ({ ...current, expiry_date: event.target.value }))} />
                </div>

                <div style={styles.formActionRow}>
                  <button
                    type="submit"
                    style={{
                      ...styles.primaryButton,
                      ...(!canSubmitShipmentItem ? styles.primaryButtonDisabled : {})
                    }}
                    disabled={!canSubmitShipmentItem}
                    title={
                      !canManageShipmentItems
                        ? 'Shipment item write permission required'
                        : !itemForm.product_id
                          ? 'Select a product before adding the shipment item'
                          : undefined
                    }
                  >
                    {addShipmentItemMutation.isPending ? 'Adding...' : 'Add Shipment Item'}
                  </button>
                  {!itemForm.product_id ? (
                    <div style={styles.inlineHint}>Select a product before adding a shipment item.</div>
                  ) : null}
                </div>
              </form>
              )}

              <div style={styles.sectionDivider} />

              <div
                style={{
                  ...styles.itemsHeaderRow,
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'flex-start'
                }}
              >
                <div style={styles.itemsHeaderContent}>
                  <h4 style={styles.sectionTitle}>Shipment Items</h4>

                  <div style={styles.defaultLocationSummary}>
                    <strong>Default Scan Location:</strong>{' '}
                    {selectedScannerLocationId ? selectedScannerLocationName : 'Not selected'}
                    <div style={styles.inlineHint}>
                      {selectedScannerLocationId
                        ? 'Scanner is ready and will receive matched items into this location.'
                        : 'Barcode scanning stays disabled until a scan destination is chosen above.'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    ...styles.shipmentItemActionRow,
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'stretch' : 'flex-start',
                    justifyContent: isMobile ? 'stretch' : 'flex-end',
                    width: isMobile ? '100%' : undefined
                  }}
                >
                  <button
                    type="button"
                    style={{
                      ...styles.scannerButton,
                      width: isMobile ? '100%' : undefined,
                      ...(canReceiveShipments && selectedScannerLocationId ? {} : styles.scannerButtonDisabled)
                    }}
                    onClick={openProductScanner}
                    data-skip-global-action-feedback="true"
                    disabled={!canReceiveShipments || !selectedScannerLocationId}
                    title={
                      !canReceiveShipments
                        ? 'Shipment receive permission is required'
                        : selectedScannerLocationId
                          ? 'Open receiving barcode scanner'
                          : 'Select a default scan location first'
                    }
                  >
                    Scan Barcode
                  </button>

                  <div
                    style={{
                      ...styles.emailSupplierActionBlock,
                      width: isMobile ? '100%' : undefined
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        ...styles.emailSupplierButton,
                        width: '100%',
                        ...(!canSendShipments || shipmentItems.length === 0
                          ? styles.emailSupplierButtonDisabled
                          : {})
                      }}
                      onClick={handleSendShipmentToSupplier}
                      disabled={
                        previewShipmentSupplierEmailMutation.isPending ||
                        sendShipmentToSupplierMutation.isPending ||
                        !canSendShipments ||
                        shipmentItems.length === 0
                      }
                      title={
                        !canSendShipments
                          ? 'Shipments send permission required'
                          : shipmentItems.length === 0
                            ? 'Add at least one shipment item before emailing the supplier'
                            : 'Open a supplier email and Purchase Order / Receiving Reference preview. Nothing is sent until you confirm in the preview.'
                      }
                    >
                      {previewShipmentSupplierEmailMutation.isPending
                        ? 'Preparing Preview...'
                        : selectedShipment.purchase_order_id
                          ? 'Preview & Send Purchase Order'
                          : 'Preview & Send Supplier Shipment Request'}
                    </button>

                    <div style={styles.emailSupplierHint}>
                      Opens a confirmation preview first. The PDF includes buyer/supplier details, item prices when recorded, and the Receiving QR used to identify this shipment on arrival.
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      ...styles.finalizeButton,
                      width: isMobile ? '100%' : undefined,
                      ...(!canFinalizeShipments || !canFinalizeSelectedShipment ? styles.finalizeButtonDisabled : {})
                    }}
                    onClick={handleFinalizeShipment}
                    disabled={
                      finalizeShipmentMutation.isPending ||
                      selectedShipment.status === 'received' ||
                      !canFinalizeShipments ||
                      !canFinalizeSelectedShipment
                    }
                    title={!canFinalizeShipments ? 'Shipments finalize permission required' : finalizeReadinessMessage}
                  >
                    {finalizeShipmentMutation.isPending ? 'Finalizing...' : 'Finalize Shipment'}
                  </button>
                </div>
              </div>

              {incompleteShipmentLinesWithoutReason.length > 0 ? (
                <div style={styles.finalizeBlockedBanner}>
                  Finalization blocked: {incompleteShipmentLinesWithoutReason.length} incomplete line(s) do not have a saved discrepancy reason.
                </div>
              ) : null}

              {!canViewShipmentItems ? (
                <div style={styles.readOnlyNotice}>
                  Shipment item details are not available to this role. No line-level data has been loaded.
                </div>
              ) : shipmentItemsQuery.isError ? (
                <div style={styles.errorBox}>
                  Shipment items could not be loaded. {shipmentItemsQuery.error instanceof ApiError ? shipmentItemsQuery.error.message : 'Refresh the selected shipment and try again.'}
                </div>
              ) : shipmentItemsQuery.isLoading ? (
                <p style={styles.emptyState}>Loading shipment items...</p>
              ) : shipmentItems.length === 0 ? (
                <p style={styles.emptyState}>No shipment items yet.</p>
              ) : (
                <div style={styles.mobileItemCardList}>
                  {shipmentItems.map((item) => {
                    const ordered = toNumber(item.quantity);
                    const received = toNumber(item.received_quantity);
                    const remaining = Math.max(ordered - received, 0);
                    const draft = getReceiveDraft(item);
                    const isHighlighted = item.id === highlightedItemId;
                    const hasSavedShortageReason = Boolean(item.discrepancy_reason?.trim());
                    const effectiveReceiveLocationId =
                      draft.storage_location_id ||
                      selectedScannerLocationId ||
                      item.storage_location_id ||
                      (storageLocations.length === 1 ? storageLocations[0].id : '');
                    const parsedReceiveQuantity = Number(draft.quantity_received || 0);
                    const exceptionalReceiveQuantity =
                      Math.max(Number(draft.damaged_quantity || 0), 0) +
                      Math.max(Number(draft.rejected_quantity || 0), 0) +
                      Math.max(Number(draft.quarantine_quantity || 0), 0);
                    const receiveQuantityIsValid =
                      Number.isFinite(parsedReceiveQuantity) &&
                      parsedReceiveQuantity >= 0 &&
                      parsedReceiveQuantity <= remaining &&
                      (parsedReceiveQuantity > 0 || exceptionalReceiveQuantity > 0);
                    const canSubmitReceiveLine =
                      canReceiveShipments &&
                      remaining > 0 &&
                      selectedShipment.status !== 'received' &&
                      Boolean(effectiveReceiveLocationId) &&
                      receiveQuantityIsValid &&
                      !receiveShipmentMutation.isPending;
                    const receiveLineDisabledReason = !canReceiveShipments
                      ? 'Shipments receive permission required.'
                      : remaining <= 0
                        ? 'This line is already fully received.'
                        : selectedShipment.status === 'received'
                          ? 'This shipment is already received.'
                          : !effectiveReceiveLocationId
                            ? 'Select a storage location before receiving this line.'
                            : !receiveQuantityIsValid
                              ? `Enter usable quantity up to ${formatQuantity(remaining)}, or record damaged, rejected, or quarantine quantity.`
                              : null;

                    return (
                      <div
                        key={item.id}
                        style={{
                          ...styles.mobileItemCard,
                          ...(isHighlighted ? styles.mobileItemCardHighlighted : {})
                        }}
                      >
                        <div style={styles.mobileItemCardHeader}>
                          <div style={styles.mobileItemCardTitle}>
                            {item.product_name || item.product_id}
                            {item.product_retired ? ' (retired)' : ''}
                          </div>
                          <div style={styles.mobileBadgeRow}>
                            {isHighlighted ? (
                              <span style={styles.mobileScannedBadge}>Scanned Match</span>
                            ) : null}

                            <span
                              style={
                                remaining <= 0 ? styles.mobileDoneBadge : styles.mobilePendingBadge
                              }
                            >
                              {remaining <= 0 ? 'Received' : `${formatQuantity(remaining)} remaining`}
                            </span>

                            {remaining > 0 && hasSavedShortageReason ? (
                              <span style={styles.mobileDiscrepancyBadge}>Reason saved</span>
                            ) : null}
                          </div>
                        </div>

                        <div style={styles.mobileItemMetaGrid}>
                          <div>
                            <strong>Ordered</strong>
                            <div>{formatQuantity(ordered)}</div>
                          </div>
                          <div>
                            <strong>Received</strong>
                            <div>{formatQuantity(received)}</div>
                          </div>
                          <div>
                            <strong>Remaining</strong>
                            <div>{formatQuantity(remaining)}</div>
                          </div>
                          <div>
                            <strong>Unit Cost</strong>
                            <div>{item.unit_cost === null || item.unit_cost === undefined || item.unit_cost === '' ? '-' : formatCurrency(item.unit_cost, item.unit_cost_currency)}</div>
                          </div>
                          <div>
                            <strong>Recorded Location</strong>
                            <div style={{ wordBreak: 'break-word' }}>
                              {item.storage_location_name || item.storage_location_id || '-'}
                              {item.storage_location_retired ? ' (retired)' : ''}
                            </div>
                          </div>
                          <div>
                            <strong>Lot / Batch</strong>
                            <div>{[item.lot_number ? `Lot ${item.lot_number}` : '', item.batch_number ? `Batch ${item.batch_number}` : ''].filter(Boolean).join(' · ') || '-'}</div>
                          </div>
                          <div>
                            <strong>Expiry</strong>
                            <div>{item.expiry_date ? formatDate(item.expiry_date) : '-'}</div>
                          </div>
                          <div>
                            <strong>Receiving Exceptions</strong>
                            <div>Short {formatQuantity(toNumber(item.shortage_quantity))} · Over {formatQuantity(toNumber(item.overage_quantity))} · Damaged {formatQuantity(toNumber(item.damaged_quantity))} · Rejected {formatQuantity(toNumber(item.rejected_quantity))} · Quarantine {formatQuantity(toNumber(item.quarantine_quantity))}</div>
                          </div>
                          <div>
                            <strong>Product ID</strong>
                            <div style={{ wordBreak: 'break-all' }}>{item.product_id}</div>
                          </div>
                        </div>

                        {canManageShipmentItems && selectedShipmentIsPending ? (
                          <div style={styles.itemManagementPanel}>
                            <div style={styles.itemManagementInputBlock}>
                              <label style={styles.label}>Ordered Quantity</label>
                              <input
                                style={styles.input}
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={itemEditDrafts[item.id] ?? String(ordered)}
                                onChange={(event) => updateItemEditDraft(item.id, event.target.value)}
                              />
                            </div>
                            <div style={styles.itemManagementActions}>
                              <button
                                type="button"
                                style={styles.secondaryButton}
                                onClick={() => handleUpdateShipmentItem(item)}
                                disabled={updateShipmentItemMutation.isPending}
                              >
                                {updateShipmentItemMutation.isPending ? 'Saving...' : 'Save Line'}
                              </button>
                              <button
                                type="button"
                                style={styles.dangerButton}
                                onClick={() => handleDeleteShipmentItem(item)}
                                disabled={deleteShipmentItemMutation.isPending}
                              >
                                {deleteShipmentItemMutation.isPending ? 'Deleting...' : 'Delete Line'}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {remaining > 0 && item.discrepancy_reason ? (
                          <div style={styles.savedReasonBox}>
                            Saved discrepancy reason: {item.discrepancy_reason}
                          </div>
                        ) : null}

                        <div style={styles.receiveLinePanel}>
                          <div style={styles.receiveLinePanelTitle}>Receive this line</div>
                          <div style={styles.receiveLineGrid}>
                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Storage Location</label>
                              <select
                                style={styles.input}
                                value={draft.storage_location_id}
                                onChange={(event) =>
                                  updateReceiveDraft(item.id, (current) => ({
                                    ...current,
                                    storage_location_id: event.target.value
                                  }))
                                }
                              >
                                <option value="">Select location</option>
                                {storageLocations.map((location) => (
                                  <option key={location.id} value={location.id}>
                                    {location.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Usable Quantity Received</label>
                              <input
                                style={styles.input}
                                type="number"
                                min="0"
                                step="0.01"
                                value={draft.quantity_received}
                                onChange={(event) =>
                                  updateReceiveDraft(item.id, (current) => ({
                                    ...current,
                                    quantity_received: event.target.value
                                  }))
                                }
                              />
                            </div>

                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Unit of Measure</label>
                              <input
                                style={styles.input}
                                value={draft.uom_code}
                                placeholder="Leave blank for base unit; e.g. CASE"
                                onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, uom_code: event.target.value }))}
                              />
                            </div>

                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Serial Numbers</label>
                              <textarea
                                style={{ ...styles.input, minHeight: 72, resize: 'vertical' }}
                                value={draft.serial_numbers}
                                placeholder="One serial per received unit when serial tracking requires it"
                                onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, serial_numbers: event.target.value }))}
                              />
                            </div>

                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Lot Number</label>
                              <input style={styles.input} value={draft.lot_number} onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, lot_number: event.target.value }))} />
                            </div>
                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Batch Number</label>
                              <input style={styles.input} value={draft.batch_number} onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, batch_number: event.target.value }))} />
                            </div>
                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Manufactured Date</label>
                              <input style={styles.input} type="date" value={draft.manufactured_at} onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, manufactured_at: event.target.value }))} />
                            </div>
                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Expiry Date</label>
                              <input style={styles.input} type="date" value={draft.expiry_date} onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, expiry_date: event.target.value }))} />
                            </div>
                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Shortage Quantity</label>
                              <input style={styles.input} type="number" min="0" step="0.01" value={draft.shortage_quantity} onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, shortage_quantity: event.target.value }))} />
                            </div>
                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Overage Quantity</label>
                              <input style={styles.input} type="number" min="0" step="0.01" value={draft.overage_quantity} onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, overage_quantity: event.target.value }))} />
                            </div>
                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Damaged Quantity</label>
                              <input style={styles.input} type="number" min="0" step="0.01" value={draft.damaged_quantity} onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, damaged_quantity: event.target.value }))} />
                            </div>
                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Rejected Quantity</label>
                              <input style={styles.input} type="number" min="0" step="0.01" value={draft.rejected_quantity} onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, rejected_quantity: event.target.value }))} />
                            </div>
                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Quarantine Quantity</label>
                              <input style={styles.input} type="number" min="0" step="0.01" value={draft.quarantine_quantity} onChange={(event) => updateReceiveDraft(item.id, (current) => ({ ...current, quarantine_quantity: event.target.value }))} />
                            </div>

                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Discrepancy Reason</label>
                              <input
                                style={styles.input}
                                type="text"
                                placeholder="Required only if this line remains short"
                                value={draft.discrepancy_reason}
                                maxLength={1000}
                                onChange={(event) =>
                                  updateReceiveDraft(item.id, (current) => ({
                                    ...current,
                                    discrepancy_reason: event.target.value
                                  }))
                                }
                              />
                            </div>

                            <div style={styles.receiveLineField}>
                              <label style={styles.label}>Receiving Note</label>
                              <input
                                style={styles.input}
                                type="text"
                                placeholder="Optional receiving note"
                                value={draft.receiving_note}
                                maxLength={4000}
                                onChange={(event) =>
                                  updateReceiveDraft(item.id, (current) => ({
                                    ...current,
                                    receiving_note: event.target.value
                                  }))
                                }
                              />
                            </div>

                            <div style={styles.receiveLineActionBlock}>
                              <button
                                type="button"
                                data-skip-global-action-feedback="true"
                                style={{
                                  ...styles.mobileReceiveButton,
                                  ...(!canSubmitReceiveLine ? styles.mobileReceiveButtonDisabled : {})
                                }}
                                onClick={() => handleReceiveLine(item)}
                                disabled={!canSubmitReceiveLine}
                                title={receiveLineDisabledReason || 'Receive this shipment line into stock.'}
                              >
                                {receiveShipmentMutation.isPending ? 'Receiving...' : 'Receive Item'}
                              </button>
                              {remaining > 0 && selectedShipment.status !== 'received' && canReceiveShipments ? (
                                <button
                                  type="button"
                                  data-skip-global-action-feedback="true"
                                  style={styles.secondaryButton}
                                  onClick={() => handleSaveShortageReason(item)}
                                  disabled={
                                    recordReceivingDiscrepancyMutation.isPending ||
                                    !draft.discrepancy_reason.trim()
                                  }
                                  title="Save a shortage reason without receiving stock. Use this when the supplier delivered zero or the line will remain short."
                                >
                                  {recordReceivingDiscrepancyMutation.isPending ? 'Saving reason...' : 'Save shortage reason'}
                                </button>
                              ) : null}
                              {receiveLineDisabledReason ? (
                                <div style={styles.inlineHint}>{receiveLineDisabledReason}</div>
                              ) : null}
                              {remaining > 0 && canReceiveShipments ? (
                                <div style={styles.inlineHint}>
                                  If no units arrived, enter the shortage reason and save it without receiving stock.
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              )}
            </>
          )}
        </div>
      </section>

      {supplierEmailPreview ? (
        <div style={styles.emailPreviewOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSupplierEmailPreview(); }}>
          <section style={styles.emailPreviewModal} role="dialog" aria-modal="true" aria-labelledby="supplier-email-preview-title">
            <div style={styles.emailPreviewHeader}>
              <div>
                <h3 id="supplier-email-preview-title" style={styles.emailPreviewTitle}>Supplier Email Preview</h3>
                <div style={styles.inlineHint}>Review the recipient, message, {supplierEmailPreview.document.document_title}, and Receiving QR. Nothing has been sent yet.</div>
              </div>
              <button type="button" style={styles.secondaryButton} onClick={closeSupplierEmailPreview} disabled={sendShipmentToSupplierMutation.isPending}>Close</button>
            </div>

            <div style={styles.emailPreviewFields}>
              <label style={styles.field}>
                <span style={styles.label}>To</span>
                <input type="email" style={styles.input} value={supplierEmailRecipient} onChange={(event) => setSupplierEmailRecipient(event.target.value)} disabled={sendShipmentToSupplierMutation.isPending} />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Subject</span>
                <input style={{ ...styles.input, background: '#f9fafb' }} value={supplierEmailPreview.subject} readOnly />
              </label>
              <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
                <span style={styles.label}>Optional email message</span>
                <textarea style={{ ...styles.input, minHeight: 78, resize: 'vertical' }} value={supplierEmailMessage} onChange={(event) => setSupplierEmailMessage(event.target.value)} maxLength={4000} disabled={sendShipmentToSupplierMutation.isPending} placeholder="Optional message to supplier" />
              </label>
            </div>

            <div style={styles.documentPreview}>
              <div style={styles.documentPreviewHeader}>
                <div>
                  <div style={styles.documentTitle}>{supplierEmailPreview.document.document_title}</div>
                  <div style={styles.inlineHint}>
                    {supplierEmailPreview.document.linked_purchase_order_id ? 'PO / Reference' : 'Shipment reference'}: {supplierEmailPreview.document.po_number || supplierEmailPreview.document.shipment_id}
                  </div>
                </div>
                {supplierEmailPreview.qr_image_data_uri ? (
                  <img src={supplierEmailPreview.qr_image_data_uri} alt="Receiving QR code" style={styles.previewQr} />
                ) : null}
              </div>

              <div style={styles.documentPartyGrid}>
                <div style={styles.documentPartyCard}>
                  <strong>Buyer / Delivery To</strong>
                  <span>{supplierEmailPreview.document.buyer.name}</span>
                  <span>{supplierEmailPreview.document.buyer.address || 'Business address not recorded'}</span>
                  <span>{supplierEmailPreview.document.buyer.email || 'Business email not recorded'}</span>
                  <span>{supplierEmailPreview.document.buyer.phone || 'Business phone not recorded'}</span>
                  {supplierEmailPreview.document.buyer.tax_id ? <span>Tax / VAT ID: {supplierEmailPreview.document.buyer.tax_id}</span> : null}
                </div>
                <div style={styles.documentPartyCard}>
                  <strong>Supplier</strong>
                  <span>{supplierEmailPreview.document.supplier.name}</span>
                  <span>{supplierEmailPreview.document.supplier.address || 'Supplier address not recorded'}</span>
                  <span>{supplierEmailPreview.document.supplier.email || supplierEmailRecipient}</span>
                  <span>{supplierEmailPreview.document.supplier.phone || 'Supplier phone not recorded'}</span>
                  {supplierEmailPreview.document.supplier.tax_id ? <span>Tax / VAT ID: {supplierEmailPreview.document.supplier.tax_id}</span> : null}
                </div>
              </div>

              <div style={styles.documentMetaGrid}>
                <span><strong>Issue:</strong> {formatDate(supplierEmailPreview.document.issue_date)}</span>
                <span><strong>Expected delivery:</strong> {formatDate(supplierEmailPreview.document.expected_delivery_date)}</span>
                <span><strong>Delivery address:</strong> {supplierEmailPreview.document.delivery_address || 'Not specified'}</span>
                {supplierEmailPreview.document.show_pricing ? (
                  <>
                    <span><strong>Payment terms:</strong> {supplierEmailPreview.document.payment_terms || 'Not specified'}</span>
                    <span><strong>Approved by:</strong> {supplierEmailPreview.document.approved_by || 'Not specified'}</span>
                    <span><strong>Currency:</strong> {supplierEmailPreview.document.currency || 'Not specified'}</span>
                  </>
                ) : null}
              </div>
              {supplierEmailPreview.document.notes ? (
                <div style={styles.documentNotes}>
                  <strong>{supplierEmailPreview.document.linked_purchase_order_id ? 'PO notes' : 'Shipment instructions'}:</strong> {supplierEmailPreview.document.notes}
                </div>
              ) : null}

              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>SKU</th>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Qty</th>
                      <th style={styles.th}>UoM</th>
                      {supplierEmailPreview.document.show_pricing ? <th style={styles.th}>Unit price</th> : null}
                      {supplierEmailPreview.document.show_pricing ? <th style={styles.th}>Line total</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {supplierEmailPreview.document.items.map((item) => (
                      <tr key={item.product_id}>
                        <td style={styles.td}>{item.supplier_sku || item.sku || 'Not specified'}</td>
                        <td style={styles.td}>{item.product_name}</td>
                        <td style={styles.td}>{formatQuantity(toNumber(item.quantity))}</td>
                        <td style={styles.td}>{item.unit || 'Not specified'}</td>
                        {supplierEmailPreview.document.show_pricing ? (
                          <td style={styles.td}>{item.unit_price == null ? 'Not specified' : formatCurrency(item.unit_price, supplierEmailPreview.document.currency)}</td>
                        ) : null}
                        {supplierEmailPreview.document.show_pricing ? (
                          <td style={styles.td}>{item.line_total == null ? 'Not specified' : formatCurrency(item.line_total, supplierEmailPreview.document.currency)}</td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {supplierEmailPreview.document.show_pricing ? (
                <div style={styles.documentTotal}>
                  <strong>Order subtotal:</strong> {supplierEmailPreview.document.subtotal == null ? 'Not specified' : formatCurrency(supplierEmailPreview.document.subtotal, supplierEmailPreview.document.currency)}
                </div>
              ) : null}
              {supplierEmailPreview.document.show_pricing && supplierEmailPreview.document.pricing_complete === false ? (
                <div style={styles.emailPreviewWarning}>One or more lines do not have a recorded unit price. The document shows “Not specified” rather than inventing a value.</div>
              ) : null}
              <div style={styles.qrPurposeBox}>
                <strong>Receiving QR Code</strong>
                <span>{supplierEmailPreview.document.qr_code}</span>
                <span>{supplierEmailPreview.document.qr_purpose}</span>
              </div>
              <div style={styles.attachmentLine}>PDF attachment: <strong>{supplierEmailPreview.document.pdf_filename}</strong></div>
            </div>

            <div style={styles.emailConfirmationBox}>
              This email and attached {supplierEmailPreview.document.document_title} will be sent to <strong>{supplierEmailRecipient || 'the entered recipient'}</strong>.
            </div>
            <div style={styles.emailPreviewActions}>
              <button type="button" style={styles.secondaryButton} onClick={closeSupplierEmailPreview} disabled={sendShipmentToSupplierMutation.isPending}>Cancel</button>
              <button type="button" style={styles.emailSupplierButton} onClick={handleConfirmSupplierEmailSend} disabled={sendShipmentToSupplierMutation.isPending || !supplierEmailRecipient.trim()}>
                {sendShipmentToSupplierMutation.isPending ? 'Sending...' : 'Confirm & Send Email'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  emailPreviewOverlay: { position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(15, 23, 42, 0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  emailPreviewModal: { width: 'min(1080px, 96vw)', maxHeight: '92vh', overflowY: 'auto', background: '#ffffff', borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 24px 70px rgba(15,23,42,0.28)', padding: 22, display: 'grid', gap: 18 },
  emailPreviewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  emailPreviewTitle: { margin: 0, fontSize: 22 },
  emailPreviewFields: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 },
  documentPreview: { border: '1px solid #d1d5db', borderRadius: 12, padding: 18, display: 'grid', gap: 15, background: '#ffffff' },
  documentPreviewHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 },
  documentTitle: { fontSize: 20, fontWeight: 800 },
  previewQr: { width: 128, height: 128, objectFit: 'contain', border: '1px solid #e5e7eb', padding: 5, background: '#fff' },
  documentPartyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 },
  documentPartyCard: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, display: 'grid', gap: 4, whiteSpace: 'pre-line' },
  documentMetaGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8, fontSize: 13 },
  documentNotes: { padding: 10, background: '#f8fafc', borderRadius: 8, whiteSpace: 'pre-wrap' },
  documentTotal: { textAlign: 'right', fontSize: 16 },
  emailPreviewWarning: { padding: 10, borderRadius: 8, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' },
  qrPurposeBox: { display: 'grid', gap: 5, padding: 12, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', wordBreak: 'break-word' },
  attachmentLine: { fontSize: 13, color: '#475569' },
  emailConfirmationBox: { padding: 12, borderRadius: 10, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e3a8a' },
  emailPreviewActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' },
  header: {
    marginBottom: 20,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  selectedActionRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 16
  },
  inlineButtonRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 8
  },
  tableActionStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
    minWidth: 130
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em'
  },
  description: {
    marginTop: 8,
    color: '#64748b',
    lineHeight: 1.6,
    maxWidth: 860
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 1px 2px rgba(15,23,42,0.03), 0 8px 24px rgba(15,23,42,0.03)',
    marginBottom: 20,
    minWidth: 0
  },
  advancedPanel: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '12px 14px',
    marginBottom: 20
  },
  advancedSummary: {
    cursor: 'pointer',
    fontWeight: 700,
    color: '#374151'
  },
  readOnlyNotice: {
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    background: '#f8fafc',
    color: '#475569',
    padding: '12px 14px',
    lineHeight: 1.5
  },
  panelTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a'
  },
  panelSubtitle: {
    marginTop: 6,
    color: '#64748b',
    fontSize: 14,
    lineHeight: 1.5
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    alignItems: 'start'
  },
  formActionRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    minWidth: 0
  },
  actionLabelSpacer: {
    display: 'block',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 600,
    visibility: 'hidden'
  },
  formActionHint: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.45,
    margin: '8px 2px 0',
    maxWidth: 240
  },
  fieldLabelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8
  },
  labelInline: {
    fontSize: 14,
    fontWeight: 600,
    color: '#374151'
  },
  infoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    background: '#f8fafc',
    color: '#475569',
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1,
    cursor: 'help',
    userSelect: 'none'
  },
  label: {
    display: 'block',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: 600,
    color: '#374151'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    background: '#ffffff',
    minWidth: 0
  },
  inputCompact: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
    background: '#ffffff',
    minWidth: 120
  },
  primaryButton: {
    border: 'none',
    borderRadius: 8,
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%'
  },
  primaryButtonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    padding: '10px 14px',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondaryButtonDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed'
  },
  dangerButton: {
    border: '1px solid #fecaca',
    borderRadius: 8,
    padding: '10px 14px',
    background: '#ffffff',
    color: '#dc2626',
    fontWeight: 700,
    cursor: 'pointer'
  },
  finalizeButtonDisabled: {
    background: '#94a3b8',
    cursor: 'not-allowed'
  },
  finalizeButton: {
    border: 'none',
    borderRadius: 8,
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: 150,
    whiteSpace: 'normal',
    lineHeight: 1.25
  },
  scannerButton: {
    border: 'none',
    borderRadius: 8,
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
    minWidth: 170,
    whiteSpace: 'normal',
    lineHeight: 1.25
  },
  scannerButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  emailSupplierButton: {
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '12px 16px',
    background: '#ffffff',
    color: '#1d4ed8',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'normal',
    lineHeight: 1.25
  },
  emailSupplierButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  emailSupplierActionBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    flex: '1 1 230px',
    maxWidth: 280,
    minWidth: 220
  },
  emailSupplierHint: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.4
  },
  errorBox: {
    marginBottom: 16,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: 12,
    padding: '12px 14px'
  },
  warningBox: {
    marginBottom: '16px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412'
  },
  successBox: {
    marginBottom: 16,
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    borderRadius: 12,
    padding: '12px 14px'
  },
  twoColumnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 20,
    alignItems: 'start'
  },
  shipmentListHeader: {
    marginBottom: 16
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 180px',
    gap: 12,
    marginBottom: 16
  },
  shipmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'visible',
    minWidth: 0
  },
  paginationRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginTop: 16,
    paddingTop: 14,
    borderTop: '1px solid #e5e7eb'
  },
  paginationMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8
  },
  paginationSummary: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 1.4
  },
  paginationControls: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
    alignItems: 'center',
    gap: 10
  },
  paginationButton: {
    width: '100%',
    minWidth: 0
  },
  paginationPageLabel: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    textAlign: 'center'
  },
  compactSelect: {
    border: '1px solid #d1d5db',
    borderRadius: 10,
    padding: '9px 10px',
    background: '#ffffff',
    color: '#111827'
  },
  shipmentCard: {
    textAlign: 'left',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 14,
    background: '#ffffff',
    cursor: 'pointer',
    width: '100%'
  },
  shipmentCardSelected: {
    border: '1px solid #2563eb',
    boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.12)'
  },
  shipmentCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 10
  },
  shipmentCardTitleBlock: {
    minWidth: 0
  },
  shipmentCardTitle: {
    fontWeight: 800,
    color: '#111827',
    marginBottom: 4,
    wordBreak: 'break-word'
  },
  shipmentCardSubtle: {
    color: '#6b7280',
    fontSize: 12,
    wordBreak: 'break-all'
  },
  shipmentCardMeta: {
    display: 'grid',
    gap: 6,
    color: '#374151',
    fontSize: 13
  },
  badgeBase: {
    display: 'inline-flex',
    alignItems: 'center',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700
  },
  selectedShipmentBox: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 16,
    background: '#f8fafc',
    minWidth: 0,
    marginTop: 16
  },
  selectedShipmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 16,
    color: '#111827',
    minWidth: 0
  },
  sectionDivider: {
    height: 1,
    background: '#e2e8f0',
    margin: '20px 0'
  },
  sectionTitle: {
    margin: '0 0 14px',
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a'
  },
  itemsHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 14
  },
  itemsHeaderContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 'min(280px, 100%)',
    flex: '1 1 320px'
  },
  shipmentItemActionRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    flex: '2 1 420px'
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 1.5,
    margin: '6px 0 0'
  },
  inlineHint: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 400,
    marginTop: 4
  },
  itemTableWrapper: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  itemTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 980
  },
  th: {
    textAlign: 'left',
    padding: '12px 10px',
    borderBottom: '1px solid #e2e8f0',
    color: '#475569',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    background: '#f9fafb'
  },
  td: {
    padding: '12px 10px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'top',
    color: '#111827',
    fontSize: 14
  },
  highlightedTableRow: {
    background: '#eff6ff'
  },
  desktopScannedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 700,
    background: '#dbeafe',
    color: '#1d4ed8'
  },
  desktopDiscrepancyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 700,
    background: '#fef3c7',
    color: '#92400e'
  },
  mobileItemCardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  mobileItemCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 14,
    background: '#ffffff'
  },
  mobileItemCardHighlighted: {
    border: '1px solid #60a5fa',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.12)',
    background: '#f8fbff'
  },
  mobileItemCardHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    marginBottom: 14
  },
  mobileItemCardTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: '#111827',
    wordBreak: 'break-word'
  },
  mobileBadgeRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  },
  mobileItemMetaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 12,
    marginBottom: 14,
    color: '#374151',
    fontSize: 13
  },
  mobileFieldGroup: {
    marginBottom: 12
  },
  itemManagementPanel: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 12,
    background: '#f8fafc',
    marginBottom: 14
  },
  itemManagementInputBlock: {
    flex: '1 1 180px',
    minWidth: 0
  },
  itemManagementActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap'
  },
  receiveLinePanel: {
    border: '1px solid #dbeafe',
    borderRadius: 12,
    padding: 12,
    background: '#eff6ff',
    marginTop: 12
  },
  receiveLinePanelTitle: {
    fontWeight: 800,
    color: '#1e3a8a',
    marginBottom: 10
  },
  receiveLineGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    alignItems: 'end'
  },
  receiveLineField: {
    minWidth: 0
  },
  receiveLineActionBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    minWidth: 0
  },
  mobilePendingBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    background: '#fef3c7',
    color: '#92400e'
  },
  mobileDoneBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    background: '#dcfce7',
    color: '#166534'
  },
  mobileScannedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    background: '#dbeafe',
    color: '#1d4ed8'
  },
  mobileDiscrepancyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    background: '#fef3c7',
    color: '#92400e'
  },
  mobileReceiveButton: {
    width: '100%',
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 6
  },
  mobileReceiveButtonDisabled: {
    background: '#9ca3af',
    cursor: 'not-allowed'
  },
  emptyState: {
    color: '#6b7280',
    margin: 0
  },
  guidedEmptyState: {
    display: 'grid',
    gap: 14,
    border: '1px dashed #cbd5e1',
    borderRadius: 18,
    background: '#f8fafc',
    padding: 18
  },
  guidedEmptyStateTitle: {
    fontSize: '1rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  guidedEmptyStateText: {
    color: '#475569',
    lineHeight: 1.6
  },
  workflowGuideGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 16
  },
  workflowStepCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    background: '#ffffff',
    padding: 14,
    display: 'grid',
    gap: 8
  },
  workflowStepCardComplete: {
    border: '1px solid #bbf7d0',
    borderRadius: 12,
    background: '#f0fdf4',
    padding: 14,
    display: 'grid',
    gap: 8
  },
  workflowStepLabel: {
    fontSize: '0.86rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  workflowStepText: {
    color: '#475569',
    lineHeight: 1.5,
    fontSize: '0.92rem'
  },
  scannerReadinessSection: {
    display: 'grid',
    gap: 16,
    marginTop: 16
  },
  readinessCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: 16,
    background: '#ffffff'
  },
  readinessHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14
  },
  progressBadgeComplete: {
    display: 'inline-flex',
    borderRadius: 999,
    padding: '6px 10px',
    background: '#dcfce7',
    color: '#166534',
    fontWeight: 800,
    fontSize: 12
  },
  progressBadgePending: {
    display: 'inline-flex',
    borderRadius: 999,
    padding: '6px 10px',
    background: '#fef3c7',
    color: '#92400e',
    fontWeight: 800,
    fontSize: 12
  },
  progressSummaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 12
  },
  progressMetricBox: {
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: 10,
    background: '#f8fafc'
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 999,
    background: '#e5e7eb',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    background: '#2563eb'
  },
  readinessStatusReady: {
    display: 'inline-flex',
    borderRadius: 999,
    padding: '6px 10px',
    background: '#dcfce7',
    color: '#166534',
    fontWeight: 800,
    fontSize: 12
  },
  readinessStatusBlocked: {
    display: 'inline-flex',
    borderRadius: 999,
    padding: '6px 10px',
    background: '#fee2e2',
    color: '#991b1b',
    fontWeight: 800,
    fontSize: 12
  },
  scanWarningBanner: {
    marginTop: 10,
    border: '1px solid #fed7aa',
    borderRadius: 12,
    padding: '10px 12px',
    background: '#fff7ed',
    color: '#9a3412',
    fontSize: 13
  },
  scanReadyBanner: {
    marginTop: 10,
    border: '1px solid #bbf7d0',
    borderRadius: 12,
    padding: '10px 12px',
    background: '#f0fdf4',
    color: '#166534',
    fontSize: 13
  },
  finalizeReadyBanner: {
    marginTop: 12,
    border: '1px solid #bbf7d0',
    borderRadius: 12,
    padding: '10px 12px',
    background: '#f0fdf4',
    color: '#166534',
    fontSize: 13,
    lineHeight: 1.5
  },
  finalizeBlockedBanner: {
    marginTop: 12,
    marginBottom: 12,
    border: '1px solid #fed7aa',
    borderRadius: 12,
    padding: '10px 12px',
    background: '#fff7ed',
    color: '#9a3412',
    fontSize: 13,
    lineHeight: 1.5
  },
  defaultLocationSummary: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '10px 12px',
    background: '#f9fafb',
    color: '#374151',
    fontSize: 13,
    lineHeight: 1.45,
    wordBreak: 'normal'
  },
  savedReasonText: {
    marginTop: 6,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 1.4
  },
  savedReasonBox: {
    border: '1px solid #fde68a',
    borderRadius: 12,
    background: '#fffbeb',
    color: '#92400e',
    padding: '10px 12px',
    fontSize: 13,
    lineHeight: 1.4,
    marginBottom: 12
  }
};
