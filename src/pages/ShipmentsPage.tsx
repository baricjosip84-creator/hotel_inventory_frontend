import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, ApiError, getVersionConflictMessage } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';

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
  quantity: number | string;
  received_quantity?: number | string;
  discrepancy?: number | string;
  discrepancy_reason?: string | null;
  storage_location_id?: string | null;
  storage_location_name?: string | null;
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
};

type ShipmentItemEditDraft = {
  product_id: string;
  quantity: string;
};

type ReceiveDraft = {
  quantity_received: string;
  storage_location_id: string;
  discrepancy_reason: string;
  receiving_note: string;
};

type ReceiveShipmentLineItemPayload = {
  product_id: string;
  quantity_received?: number;
  package_id?: string;
  package_count_received?: number;
  storage_location_id: string;
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
  attachments?: Array<{
    filename?: string;
    content_type?: string;
  }>;
};

type AutoReorderResponse = {
  message?: string;
  created_shipments?: number;
  created_count?: number;
  shipment_count?: number;
  shipments?: ShipmentSummary[];
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
};

async function fetchShipments(): Promise<ShipmentSummary[]> {
  return apiRequest<ShipmentSummary[]>('/shipments');
}

async function fetchSuppliers(): Promise<SupplierOption[]> {
  return apiRequest<SupplierOption[]>('/suppliers/available');
}

async function fetchProducts(): Promise<ProductOption[]> {
  return apiRequest<ProductOption[]>('/products');
}

async function fetchStorageLocations(): Promise<StorageLocationOption[]> {
  return apiRequest<StorageLocationOption[]>('/storage-locations');
}

async function fetchApprovedPurchaseOrders(): Promise<PurchaseOrderOption[]> {
  return apiRequest<PurchaseOrderOption[]>('/purchase-orders?status=approved');
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
  supplier_id: string;
  delivery_date: string;
  po_number?: string | null;
}): Promise<ShipmentSummary> {
  return apiRequest<ShipmentSummary>(`/shipments/${input.shipmentId}`, {
    method: 'PATCH',
    headers: {
      'If-Match-Version': String(input.version)
    },
    body: JSON.stringify({
      supplier_id: input.supplier_id,
      delivery_date: input.delivery_date,
      po_number: input.po_number?.trim() || null
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

async function triggerAutoReorder(): Promise<AutoReorderResponse> {
  return apiRequest<AutoReorderResponse>('/shipments/auto-reorder', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

async function addShipmentItem(input: {
  shipment_id: string;
  product_id: string;
  quantity: number;
}): Promise<ShipmentItem> {
  return apiRequest<ShipmentItem>('/shipment-items', {
    method: 'POST',
    body: JSON.stringify({
      shipment_id: input.shipment_id,
      product_id: input.product_id,
      quantity: input.quantity
    })
  });
}

async function updateShipmentItem(input: {
  itemId: string;
  version: number;
  product_id?: string;
  quantity?: number;
}): Promise<ShipmentItem> {
  return apiRequest<ShipmentItem>(`/shipment-items/${input.itemId}`, {
    method: 'PATCH',
    headers: {
      'If-Match-Version': String(input.version)
    },
    body: JSON.stringify({
      product_id: input.product_id,
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
    })
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
    body: JSON.stringify({})
  });
}

async function sendShipmentToSupplier(input: {
  shipmentId: string;
}): Promise<SendShipmentToSupplierResponse> {
  return apiRequest<SendShipmentToSupplierResponse>(
    `/shipments/${input.shipmentId}/send-to-supplier`,
    {
      method: 'POST'
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
    quantity: '1'
  };
}

function makeDefaultReceiveDraft(item: ShipmentItem): ReceiveDraft {
  const ordered = toNumber(item.quantity);
  const received = toNumber(item.received_quantity);
  const remaining = Math.max(ordered - received, 0);

  return {
    quantity_received: remaining > 0 ? String(remaining) : '1',
    storage_location_id: item.storage_location_id || '',
    discrepancy_reason: '',
    receiving_note: ''
  };
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString();
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
    role,
    canManageShipments,
    canSendShipments,
    canReceiveShipments,
    canFinalizeShipments,
    canAutoReorderShipments,
    canManageShipmentItems
  } = getRoleCapabilities();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [highlightedItemId, setHighlightedItemId] = useState('');
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedScannerLocationId, setSelectedScannerLocationId] = useState('');

  const [shipmentForm, setShipmentForm] = useState<ShipmentFormState>(emptyShipmentForm());
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm());
  const [shipmentItemEditDrafts, setShipmentItemEditDrafts] = useState<Record<string, ShipmentItemEditDraft>>({});
  const [receiveDrafts, setReceiveDrafts] = useState<Record<string, ReceiveDraft>>({});
  const [pendingAutoReceive, setPendingAutoReceive] = useState<PendingAutoReceive | null>(null);
  const autoReceiveAttemptKeyRef = useRef<string>('');

  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const shipmentsQuery = useQuery({
    queryKey: ['shipments'],
    queryFn: fetchShipments
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers-available'],
    queryFn: fetchSuppliers
  });

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  const approvedPurchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders', 'approved'],
    queryFn: fetchApprovedPurchaseOrders
  });

  const storageLocationsQuery = useQuery({
    queryKey: ['storage-locations'],
    queryFn: fetchStorageLocations
  });

  const shipmentItemsQuery = useQuery({
    queryKey: ['shipment-items', selectedShipmentId],
    queryFn: () => fetchShipmentItems(selectedShipmentId),
    enabled: Boolean(selectedShipmentId)
  });

  const createShipmentMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: async (shipment) => {
      setShipmentForm(emptyShipmentForm());
      setSelectedShipmentId(shipment.id);
      setReceiveDrafts({});
      setShipmentItemEditDrafts({});
      setHighlightedItemId('');
      setPendingAutoReceive(null);
      setSelectedScannerLocationId('');
      autoReceiveAttemptKeyRef.current = '';
      setPageError(null);
      setPageMessage('Shipment created successfully.');

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

  const updateShipmentMutation = useMutation({
    mutationFn: updateShipment,
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('Shipment updated successfully.');

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      setPageError(getVersionConflictMessage(error));
      setPageMessage(null);
    }
  });

  const deleteShipmentMutation = useMutation({
    mutationFn: deleteShipment,
    onSuccess: async () => {
      setSelectedShipmentId('');
      setReceiveDrafts({});
      setShipmentItemEditDrafts({});
      setHighlightedItemId('');
      setPendingAutoReceive(null);
      setSelectedScannerLocationId('');
      autoReceiveAttemptKeyRef.current = '';
      setPageError(null);
      setPageMessage('Shipment deleted successfully.');

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      setPageError(getVersionConflictMessage(error));
      setPageMessage(null);
    }
  });

  const autoReorderMutation = useMutation({
    mutationFn: triggerAutoReorder,
    onSuccess: async (data) => {
      const createdCount =
        data.created_shipments ??
        data.created_count ??
        data.shipment_count ??
        data.shipments?.length ??
        0;

      setPageError(null);
      setPageMessage(data.message || `Auto reorder completed. Created ${createdCount} shipment${createdCount === 1 ? '' : 's'}.`);

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to run auto reorder.');
      }
      setPageMessage(null);
    }
  });

  const addShipmentItemMutation = useMutation({
    mutationFn: addShipmentItem,
    onSuccess: async () => {
      setItemForm(emptyItemForm());
      setPageError(null);
      setPageMessage('Shipment item added successfully.');

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

  const updateShipmentItemMutation = useMutation({
    mutationFn: updateShipmentItem,
    onSuccess: async () => {
      setShipmentItemEditDrafts({});
      setPageError(null);
      setPageMessage('Shipment item updated successfully.');

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });
    },
    onError: (error) => {
      setPageError(getVersionConflictMessage(error));
      setPageMessage(null);
    }
  });

  const deleteShipmentItemMutation = useMutation({
    mutationFn: deleteShipmentItem,
    onSuccess: async () => {
      setShipmentItemEditDrafts({});
      setPageError(null);
      setPageMessage('Shipment item deleted successfully.');

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });
    },
    onError: (error) => {
      setPageError(getVersionConflictMessage(error));
      setPageMessage(null);
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
      setPageError(getVersionConflictMessage(error));
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
      setPageError(getVersionConflictMessage(error));
      setPageMessage(null);
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
        : ' PDF and QR attachments were generated by the backend.';

      setPageError(null);
      setPageMessage(
        data.message ||
          `✔ Shipment${poLabel} emailed to ${recipientEmail}.${attachmentLabel}`
      );

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPageError(error.message);
      } else {
        setPageError('Failed to email shipment to supplier.');
      }
      setPageMessage(null);
    }
  });

  const shipments = useMemo(() => shipmentsQuery.data ?? [], [shipmentsQuery.data]);
  const shipmentItems = useMemo(() => shipmentItemsQuery.data ?? [], [shipmentItemsQuery.data]);
  const storageLocations = useMemo(
    () => storageLocationsQuery.data ?? [],
    [storageLocationsQuery.data]
  );
  const approvedPurchaseOrders = useMemo(
    () => approvedPurchaseOrdersQuery.data ?? [],
    [approvedPurchaseOrdersQuery.data]
  );
  const linkablePurchaseOrders = useMemo(() => {
    if (!shipmentForm.supplier_id) return approvedPurchaseOrders;
    return approvedPurchaseOrders.filter((order) => order.supplier_id === shipmentForm.supplier_id);
  }, [approvedPurchaseOrders, shipmentForm.supplier_id]);

  const selectedShipment =
    shipments.find((shipment) => shipment.id === selectedShipmentId) ?? null;

  const shipmentProductOptions = useMemo(() => {
    const allProducts = productsQuery.data ?? [];

    if (!selectedShipment) {
      return allProducts;
    }

    return allProducts.filter((product) => {
      if (!product.supplier_id) {
        return true;
      }

      return product.supplier_id === selectedShipment.supplier_id;
    });
  }, [productsQuery.data, selectedShipment]);

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

  const canEditSelectedShipment =
    Boolean(selectedShipment) &&
    selectedShipment?.status === 'pending' &&
    canManageShipments;

  const canDeleteSelectedShipment =
    Boolean(selectedShipment) &&
    selectedShipment?.status === 'pending' &&
    shipmentItems.length === 0 &&
    canManageShipments;

  const canFinalizeSelectedShipment =
    Boolean(selectedShipment) &&
    selectedShipment?.status !== 'received' &&
    shipmentItems.length > 0 &&
    incompleteShipmentLinesWithoutReason.length === 0;

  const finalizeReadinessMessage =
    !selectedShipment
      ? 'Select a shipment first.'
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
      detail: hasShipmentItems
        ? hasRemainingQuantity
          ? 'Receive lines manually or through the product barcode scanner.'
          : 'All current shipment lines are fully received.'
        : 'Add shipment items before receiving inventory.',
      complete: hasShipmentItems && !hasRemainingQuantity
    },
    {
      label: '4. Finalize Shipment',
      detail: finalizeReadinessMessage,
      complete: selectedShipment?.status === 'received'
    }
  ];

  const filteredShipments = useMemo(() => {
    const search = shipmentSearch.trim().toLowerCase();

    return shipments.filter((shipment) => {
      const matchesStatus = statusFilter ? shipment.status === statusFilter : true;

      const haystack = [
        shipment.id,
        shipment.po_number,
        shipment.linked_purchase_order_number,
        shipment.purchase_order_id,
        shipment.supplier_name,
        shipment.supplier_id,
        shipment.status,
        shipment.delivery_date
      ]
        .map((value) => String(value ?? '').toLowerCase())
        .join(' ');

      const matchesSearch = search ? haystack.includes(search) : true;

      return matchesStatus && matchesSearch;
    });
  }, [shipments, shipmentSearch, statusFilter]);

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
        setPageMessage(
          scannedBarcode
            ? `Product barcode ${scannedBarcode} matched inside selected shipment. Select a default scan location before receiving.`
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
              : canReceiveOneFullPackageFromQuery === 'true'
        });

        setPageMessage(
          scannedBarcode
            ? packageNameFromQuery && unitsPerPackageFromQuery
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
    if (!highlightedItemId || !selectedScannerLocationId || shipmentItems.length === 0) {
      return;
    }

    const matchedItem = shipmentItems.find((item) => item.id === highlightedItemId);

    if (!matchedItem) {
      return;
    }

    setReceiveDrafts((current) => ({
      ...current,
      [matchedItem.id]: {
        ...(current[matchedItem.id] ?? makeDefaultReceiveDraft(matchedItem)),
        storage_location_id: selectedScannerLocationId
      }
    }));
  }, [highlightedItemId, selectedScannerLocationId, shipmentItems]);

  const getReceiveDraft = (item: ShipmentItem): ReceiveDraft => {
    return receiveDrafts[item.id] ?? makeDefaultReceiveDraft(item);
  };

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
        storage_location_id: safeStorageLocationId
      }
    }));

    autoReceiveAttemptKeyRef.current = attemptKey;
    setPendingAutoReceive(null);
    setPageError(null);
    setPageMessage(
      shouldReceiveByPackage
        ? `${pendingAutoReceive.packageName || 'Scanned package'} matched. Auto receiving 1 package (${formatQuantity(baseQuantityToReceive)} base units)...`
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
            discrepancy_reason: draft.discrepancy_reason.trim() || null,
            receiving_note: draft.receiving_note.trim() || null
          }
        : {
            product_id: matchedItem.product_id,
            quantity_received: baseQuantityToReceive,
            storage_location_id: safeStorageLocationId,
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
    receiveDrafts
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

  const handleCreateShipment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError(null);
    setPageMessage(null);

    createShipmentMutation.mutate(shipmentForm);
  };

  const handleAddShipmentItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canManageShipmentItems) {
      setPageError('Your current role cannot add shipment items. Shipment item writes are restricted by the backend shipment item write permission.');
      return;
    }
    setPageError(null);
    setPageMessage(null);

    if (!selectedShipmentId || !selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    const selectedProduct = (productsQuery.data ?? []).find(
      (product) => product.id === itemForm.product_id
    );

    if (
      selectedProduct?.supplier_id &&
      selectedProduct.supplier_id !== selectedShipment.supplier_id
    ) {
      setPageError(
        'Product supplier does not match the selected shipment supplier. Choose a product from this supplier, or use an unassigned product.'
      );
      return;
    }

    addShipmentItemMutation.mutate({
      shipment_id: selectedShipmentId,
      product_id: itemForm.product_id,
      quantity: Number(itemForm.quantity)
    });
  };

  const getShipmentItemEditDraft = (item: ShipmentItem): ShipmentItemEditDraft => {
    return shipmentItemEditDrafts[item.id] ?? {
      product_id: item.product_id,
      quantity: String(toNumber(item.quantity))
    };
  };

  const updateShipmentItemEditDraft = (
    item: ShipmentItem,
    updates: Partial<ShipmentItemEditDraft>
  ) => {
    setShipmentItemEditDrafts((current) => ({
      ...current,
      [item.id]: {
        ...getShipmentItemEditDraft(item),
        ...updates
      }
    }));
  };

  const handleUpdateShipmentItem = (item: ShipmentItem) => {
    if (!canEditSelectedShipment) {
      setPageMessage(null);
      setPageError('Only pending shipments can have shipment items edited.');
      return;
    }

    const editDraft = getShipmentItemEditDraft(item);
    const nextQuantity = Number(editDraft.quantity);
    const receivedQuantity = toNumber(item.received_quantity);

    if (!Number.isFinite(nextQuantity) || nextQuantity <= 0) {
      setPageMessage(null);
      setPageError('Shipment item quantity must be greater than zero.');
      return;
    }

    if (nextQuantity < receivedQuantity) {
      setPageMessage(null);
      setPageError('Shipment item quantity cannot be less than the already received quantity.');
      return;
    }

    if (!editDraft.product_id) {
      setPageMessage(null);
      setPageError('Shipment item product is required.');
      return;
    }

    if (item.version === undefined || item.version === null) {
      setPageMessage(null);
      setPageError('Shipment item version is missing. Refresh shipment items before editing.');
      return;
    }

    updateShipmentItemMutation.mutate({
      itemId: item.id,
      version: item.version,
      product_id: editDraft.product_id,
      quantity: nextQuantity
    });
  };

  const handleDeleteShipmentItem = (item: ShipmentItem) => {
    if (!canEditSelectedShipment) {
      setPageMessage(null);
      setPageError('Only pending shipments can have shipment items deleted.');
      return;
    }

    if (toNumber(item.received_quantity) > 0) {
      setPageMessage(null);
      setPageError('Shipment items that already have received quantity cannot be deleted.');
      return;
    }

    if (item.version === undefined || item.version === null) {
      setPageMessage(null);
      setPageError('Shipment item version is missing. Refresh shipment items before deleting.');
      return;
    }

    const confirmed = window.confirm(`Delete shipment item ${item.product_name || item.product_id}?`);

    if (!confirmed) {
      return;
    }

    deleteShipmentItemMutation.mutate({
      itemId: item.id,
      version: item.version
    });
  };

  const handleReceiveLine = (item: ShipmentItem) => {
    if (!canReceiveShipments) {
      setPageError('Your current role cannot receive shipments.');
      return;
    }

    setPageError(null);
    setPageMessage(null);

    if (!selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    const draft = getReceiveDraft(item);
    const quantityReceived = Number(draft.quantity_received);
    const ordered = toNumber(item.quantity);
    const received = toNumber(item.received_quantity);
    const remaining = ordered - received;

    if (!Number.isFinite(quantityReceived) || quantityReceived <= 0) {
      setPageError('Quantity received must be greater than zero.');
      return;
    }

    if (quantityReceived > remaining) {
      setPageError('Quantity received cannot exceed remaining quantity.');
      return;
    }

    if (!draft.storage_location_id) {
      setPageError('Select a storage location.');
      return;
    }

    receiveShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version,
      item: {
        product_id: item.product_id,
        quantity_received: quantityReceived,
        storage_location_id: draft.storage_location_id,
        discrepancy_reason: draft.discrepancy_reason.trim() || null,
        receiving_note: draft.receiving_note.trim() || null
      }
    });
  };

  const handleFinalizeShipment = () => {
    if (!canFinalizeShipments) {
      setPageError('Your current role cannot finalize shipments. Shipment finalization is restricted by the backend shipment finalize permission.');
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
        `${incompleteShipmentLinesWithoutReason.length} incomplete line(s) still need a saved discrepancy reason before finalization. Enter a discrepancy reason while receiving a partial quantity, then receive that partial quantity to save it.`
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

  const handleRunAutoReorder = () => {
    if (!canManageShipments) {
      setPageError('Your current role cannot generate auto reorder shipments. Manager or admin role is required.');
      return;
    }

    const confirmed = window.confirm('Generate shipments from backend auto-reorder rules now?');

    if (!confirmed) {
      return;
    }

    setPageError(null);
    setPageMessage(null);
    autoReorderMutation.mutate();
  };

  const handleEditSelectedShipment = () => {
    if (!selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    if (!canEditSelectedShipment) {
      setPageError('Only pending shipments can be edited by manager or admin roles.');
      return;
    }

    const supplierId = window.prompt('Supplier ID', selectedShipment.supplier_id);

    if (supplierId === null) {
      return;
    }

    const deliveryDate = window.prompt('Delivery date', selectedShipment.delivery_date.slice(0, 10));

    if (deliveryDate === null) {
      return;
    }

    const poNumber = window.prompt('PO number', selectedShipment.po_number || '');

    if (poNumber === null) {
      return;
    }

    const trimmedSupplierId = supplierId.trim();
    const trimmedDeliveryDate = deliveryDate.trim();

    if (!trimmedSupplierId || !trimmedDeliveryDate) {
      setPageError('Supplier ID and delivery date are required.');
      setPageMessage(null);
      return;
    }

    updateShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version,
      supplier_id: trimmedSupplierId,
      delivery_date: trimmedDeliveryDate,
      po_number: poNumber
    });
  };

  const handleDeleteSelectedShipment = () => {
    if (!selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    if (!canDeleteSelectedShipment) {
      setPageError('Only empty pending shipments can be deleted by manager or admin roles. Remove shipment items first.');
      return;
    }

    const confirmed = window.confirm(`Delete shipment ${selectedShipment.po_number || selectedShipment.id}? This cannot be undone.`);

    if (!confirmed) {
      return;
    }

    deleteShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version
    });
  };

  const handleSendShipmentToSupplier = () => {
    if (!canSendShipments) {
      setPageError('Your current role cannot email shipments to suppliers. Supplier email actions are restricted by the backend shipment send permission.');
      return;
    }

    setPageError(null);
    setPageMessage(null);

    if (!selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    if (shipmentItems.length === 0) {
      setPageError('Add at least one shipment item before emailing the shipment PDF and QR to the supplier.');
      return;
    }

    sendShipmentToSupplierMutation.mutate({
      shipmentId: selectedShipment.id
    });
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
    if (!selectedShipmentId) {
      setPageError('Select a shipment before opening product scanner.');
      return;
    }

    if (!selectedScannerLocationId) {
      setPageError('Select a default storage location before opening product scanner.');
      return;
    }

    navigate(
      `/scanner?mode=product&shipmentId=${encodeURIComponent(selectedShipmentId)}&locationId=${encodeURIComponent(selectedScannerLocationId)}`
    );
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Shipments</h2>
          <p style={styles.description}>
            Create inbound shipments, add shipment items, receive lines partially
            or fully, and finalize only when all shortages are documented.
          </p>
        </div>
      </div>

      {pageError ? <div style={styles.errorBox}>{pageError}</div> : null}
      {pageMessage ? <div style={styles.successBox}>{pageMessage}</div> : null}

      {!canManageShipments ? (
        <div style={styles.warningBox}>
          Current role: {role.toUpperCase()}. Shipment creation, shipment item changes, and finalization are blocked in the frontend because your backend only allows manager and admin users to perform those writes. Receiving remains available according to the existing backend access model.
        </div>
      ) : null}

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Create Shipment</h3>

        <form onSubmit={handleCreateShipment} style={styles.formGrid}>
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
              {(suppliersQuery.data ?? []).map((supplier) => (
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
            />
          </div>

          <div>
            <label style={styles.label}>Linked Purchase Order</label>
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
            <p style={styles.fieldHint}>
              Optional bridge only: this links an approved PO to the shipment without changing stock or receiving logic.
            </p>
          </div>

          <div style={styles.formActionRow}>
            <button
              type="submit"
              style={styles.primaryButton}
              disabled={createShipmentMutation.isPending || !canManageShipments}
              title={!canManageShipments ? 'Shipment write permission required' : undefined}
            >
              {createShipmentMutation.isPending ? 'Creating...' : 'Create Shipment'}
            </button>

            <button
              type="button"
              style={{ ...styles.secondaryButton, width: '100%' }}
              onClick={handleRunAutoReorder}
              disabled={autoReorderMutation.isPending || !canAutoReorderShipments}
              title={!canAutoReorderShipments ? 'Shipment auto-reorder permission required' : 'Generate backend auto-reorder shipments'}
            >
              {autoReorderMutation.isPending ? 'Generating...' : 'Auto Reorder'}
            </button>
          </div>
        </form>
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
              ...styles.shipmentList,
              maxHeight: isMobile ? 'none' : 720
            }}
          >
            {shipmentsQuery.isLoading ? (
              <p style={styles.emptyState}>Loading shipments...</p>
            ) : filteredShipments.length === 0 ? (
              <p style={styles.emptyState}>No shipments match the current filter.</p>
            ) : (
              filteredShipments.map((shipment) => {
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
                        <div style={styles.shipmentCardSubtle}>
                          Shipment ID: {shipment.id}
                        </div>
                      </div>

                      <span style={statusBadgeStyle(shipment.status)}>
                        {shipment.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={styles.shipmentCardMeta}>
                      <div>
                        <strong>Supplier:</strong> {shipment.supplier_name || shipment.supplier_id}
                      </div>
                      <div>
                        <strong>Linked PO:</strong> {shipment.linked_purchase_order_number || '-'}
                      </div>
                      <div>
                        <strong>Delivery:</strong> {formatDate(shipment.delivery_date)}
                      </div>
                      <div style={{ wordBreak: 'break-all' }}>
                        <strong>QR:</strong> {shipment.qr_code}
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
                    <div>{selectedShipment.status}</div>
                  </div>
                  <div>
                    <strong>Supplier</strong>
                    <div style={{ wordBreak: 'break-word' }}>
                      {selectedShipment.supplier_name || selectedShipment.supplier_id}
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
                    {selectedShipment.purchase_order_id ? (
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
                </div>
              </div>

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
                    <span style={selectedScannerLocationId ? styles.readinessStatusReady : styles.readinessStatusBlocked}>
                      {selectedScannerLocationId ? 'Ready to scan' : 'Location required'}
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
                  >
                    <option value="">Select location</option>
                    {storageLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>

                  {!hasStorageLocations ? (
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
              <form onSubmit={handleAddShipmentItem} style={styles.formGrid}>
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
                      List is limited to products from this shipment supplier, plus products without supplier assignment.
                    </div>
                  ) : null}
                </div>

                <div>
                  <label style={styles.label}>Quantity</label>
                  <input
                    style={styles.input}
                    type="number"
                    min="1"
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

                <div style={styles.formActionRow}>
                  <button
                    type="submit"
                    style={styles.primaryButton}
                    disabled={addShipmentItemMutation.isPending || !canManageShipmentItems}
                    title={!canManageShipmentItems ? 'Shipment item write permission required' : undefined}
                  >
                    {addShipmentItemMutation.isPending ? 'Adding...' : 'Add Shipment Item'}
                  </button>
                </div>
              </form>

              <div style={styles.sectionDivider} />

              <div
                style={{
                  ...styles.itemsHeaderRow,
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'stretch' : 'center'
                }}
              >
                <div style={styles.itemsHeaderContent}>
                  <h4 style={styles.sectionTitle}>Shipment Items</h4>

                  <div style={styles.defaultLocationSummary}>
                    <strong>Default Scan Location:</strong>{' '}
                    {selectedScannerLocationId ? selectedScannerLocationName : 'Not selected'}
                    <div style={styles.inlineHint}>
                      Barcode scanning stays disabled until a scan destination is chosen above.
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: 10,
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  <button
                    type="button"
                    style={{
                      ...styles.scannerButton,
                      width: isMobile ? '100%' : undefined,
                      ...(selectedScannerLocationId ? {} : styles.scannerButtonDisabled)
                    }}
                    onClick={openProductScanner}
                    disabled={!selectedScannerLocationId}
                    title={
                      selectedScannerLocationId
                        ? 'Open product barcode scanner'
                        : 'Select a default scan location first'
                    }
                  >
                    Scan Product Barcode
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.secondaryButton,
                      width: isMobile ? '100%' : undefined
                    }}
                    onClick={handleEditSelectedShipment}
                    disabled={!canEditSelectedShipment || updateShipmentMutation.isPending}
                    title={!canEditSelectedShipment ? 'Only pending shipments can be edited by manager or admin roles' : 'Edit pending shipment header'}
                  >
                    {updateShipmentMutation.isPending ? 'Saving...' : 'Edit Shipment'}
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.deleteShipmentButton,
                      width: isMobile ? '100%' : undefined,
                      ...(!canDeleteSelectedShipment ? styles.deleteShipmentButtonDisabled : {})
                    }}
                    onClick={handleDeleteSelectedShipment}
                    disabled={!canDeleteSelectedShipment || deleteShipmentMutation.isPending}
                    title={!canDeleteSelectedShipment ? 'Only empty pending shipments can be deleted' : 'Delete empty pending shipment'}
                  >
                    {deleteShipmentMutation.isPending ? 'Deleting...' : 'Delete Shipment'}
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.emailSupplierButton,
                      width: isMobile ? '100%' : undefined,
                      ...(!canSendShipments || shipmentItems.length === 0
                        ? styles.emailSupplierButtonDisabled
                        : {})
                    }}
                    onClick={handleSendShipmentToSupplier}
                    disabled={
                      sendShipmentToSupplierMutation.isPending ||
                      !canSendShipments ||
                      shipmentItems.length === 0
                    }
                    title={
                      !canSendShipments
                        ? 'Shipment send permission required'
                        : shipmentItems.length === 0
                          ? 'Add at least one shipment item before emailing the supplier'
                          : 'Email the supplier a shipment PDF and QR attachment'
                    }
                  >
                    {sendShipmentToSupplierMutation.isPending
                      ? 'Sending...'
                      : 'Send PDF + QR to Supplier'}
                  </button>

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
                    title={!canFinalizeShipments ? 'Shipment finalize permission required' : finalizeReadinessMessage}
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

              {shipmentItemsQuery.isLoading ? (
                <p style={styles.emptyState}>Loading shipment items...</p>
              ) : shipmentItems.length === 0 ? (
                <p style={styles.emptyState}>No shipment items yet.</p>
              ) : isMobile ? (
                <div style={styles.mobileItemCardList}>
                  {shipmentItems.map((item) => {
                    const ordered = toNumber(item.quantity);
                    const received = toNumber(item.received_quantity);
                    const remaining = Math.max(ordered - received, 0);
                    const draft = getReceiveDraft(item);
                    const isHighlighted = item.id === highlightedItemId;
                    const hasSavedShortageReason = Boolean(item.discrepancy_reason?.trim());

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
                              {remaining <= 0 ? 'Received' : `${remaining} remaining`}
                            </span>

                            {remaining > 0 && hasSavedShortageReason ? (
                              <span style={styles.mobileDiscrepancyBadge}>Reason saved</span>
                            ) : null}
                          </div>
                        </div>

                        <div style={styles.mobileItemMetaGrid}>
                          <div>
                            <strong>Ordered</strong>
                            <div>{ordered}</div>
                          </div>
                          <div>
                            <strong>Received</strong>
                            <div>{received}</div>
                          </div>
                          <div>
                            <strong>Remaining</strong>
                            <div>{remaining}</div>
                          </div>
                          <div>
                            <strong>Product ID</strong>
                            <div style={{ wordBreak: 'break-all' }}>{item.product_id}</div>
                          </div>
                        </div>

                        {remaining > 0 && item.discrepancy_reason ? (
                          <div style={styles.savedReasonBox}>
                            Saved discrepancy reason: {item.discrepancy_reason}
                          </div>
                        ) : null}

                        <div style={styles.mobileFieldGroup}>
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
                            {(storageLocationsQuery.data ?? []).map((location) => (
                              <option key={location.id} value={location.id}>
                                {location.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={styles.mobileFieldGroup}>
                          <label style={styles.label}>Receive Quantity</label>
                          <input
                            style={styles.input}
                            type="number"
                            min="0.01"
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

                        <div style={styles.mobileFieldGroup}>
                          <label style={styles.label}>Discrepancy Reason</label>
                          <input
                            style={styles.input}
                            type="text"
                            placeholder="Required if this line will remain short at finalization"
                            value={draft.discrepancy_reason}
                            onChange={(event) =>
                              updateReceiveDraft(item.id, (current) => ({
                                ...current,
                                discrepancy_reason: event.target.value
                              }))
                            }
                          />
                        </div>

                        <div style={styles.mobileFieldGroup}>
                          <label style={styles.label}>Receiving Note</label>
                          <input
                            style={styles.input}
                            type="text"
                            placeholder="Optional receiving note"
                            value={draft.receiving_note}
                            onChange={(event) =>
                              updateReceiveDraft(item.id, (current) => ({
                                ...current,
                                receiving_note: event.target.value
                              }))
                            }
                          />
                        </div>

                        {selectedShipment.status === 'pending' ? (
                          <div style={styles.mobileItemActionGrid}>
                            <label style={styles.label}>Product</label>
                            <select
                              style={styles.input}
                              value={getShipmentItemEditDraft(item).product_id}
                              onChange={(event) => updateShipmentItemEditDraft(item, { product_id: event.target.value })}
                              disabled={!canManageShipmentItems || !canEditSelectedShipment || updateShipmentItemMutation.isPending || received > 0}
                            >
                              {shipmentProductOptions.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                  {product.supplier_name ? ` · ${product.supplier_name}` : ''}
                                </option>
                              ))}
                            </select>
                            <label style={styles.label}>Ordered Quantity</label>
                            <input
                              style={styles.input}
                              type="number"
                              min={Math.max(received, 0.01)}
                              step="0.01"
                              value={getShipmentItemEditDraft(item).quantity}
                              onChange={(event) => updateShipmentItemEditDraft(item, { quantity: event.target.value })}
                              disabled={!canManageShipmentItems || !canEditSelectedShipment || updateShipmentItemMutation.isPending}
                            />
                            <div style={styles.mobileItemButtonRow}>
                              <button
                                type="button"
                                style={styles.secondaryButton}
                                onClick={() => handleUpdateShipmentItem(item)}
                                disabled={!canManageShipmentItems || !canEditSelectedShipment || updateShipmentItemMutation.isPending}
                              >
                                {updateShipmentItemMutation.isPending ? 'Saving...' : 'Save Item'}
                              </button>
                              <button
                                type="button"
                                style={styles.deleteShipmentButton}
                                onClick={() => handleDeleteShipmentItem(item)}
                                disabled={!canManageShipmentItems || !canEditSelectedShipment || deleteShipmentItemMutation.isPending || received > 0}
                              >
                                {deleteShipmentItemMutation.isPending ? 'Deleting...' : 'Delete Item'}
                              </button>
                            </div>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          style={{
                            ...styles.mobileReceiveButton,
                            ...(remaining <= 0 || selectedShipment.status === 'received'
                              ? styles.mobileReceiveButtonDisabled
                              : {})
                          }}
                          onClick={() => handleReceiveLine(item)}
                          disabled={
                            receiveShipmentMutation.isPending ||
                            remaining <= 0 ||
                            selectedShipment.status === 'received'
                          }
                        >
                          {receiveShipmentMutation.isPending ? 'Receiving...' : 'Receive Item'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={styles.itemTableWrapper}>
                  <table style={styles.itemTable}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Product</th>
                        <th style={styles.th}>Edit Product</th>
                        <th style={styles.th}>Ordered</th>
                        <th style={styles.th}>Edit Ordered</th>
                        <th style={styles.th}>Received</th>
                        <th style={styles.th}>Remaining</th>
                        <th style={styles.th}>Storage Location</th>
                        <th style={styles.th}>Receive Quantity</th>
                        <th style={styles.th}>Discrepancy Reason</th>
                        <th style={styles.th}>Receiving Note</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipmentItems.map((item) => {
                        const ordered = toNumber(item.quantity);
                        const received = toNumber(item.received_quantity);
                        const remaining = Math.max(ordered - received, 0);
                        const draft = getReceiveDraft(item);
                        const isHighlighted = item.id === highlightedItemId;
                        const hasSavedShortageReason = Boolean(item.discrepancy_reason?.trim());

                        return (
                          <tr
                            key={item.id}
                            style={isHighlighted ? styles.highlightedTableRow : undefined}
                          >
                            <td style={styles.td}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span>{item.product_name || item.product_id}</span>
                                {isHighlighted ? (
                                  <span style={styles.desktopScannedBadge}>Scanned Match</span>
                                ) : null}
                                {remaining > 0 && hasSavedShortageReason ? (
                                  <span style={styles.desktopDiscrepancyBadge}>Reason saved</span>
                                ) : null}
                              </div>
                            </td>
                            <td style={styles.td}>
                              <select
                                style={styles.inputCompact}
                                value={getShipmentItemEditDraft(item).product_id}
                                onChange={(event) => updateShipmentItemEditDraft(item, { product_id: event.target.value })}
                                disabled={!canManageShipmentItems || !canEditSelectedShipment || selectedShipment.status !== 'pending' || updateShipmentItemMutation.isPending || received > 0}
                                title={received > 0 ? 'Received shipment items cannot change product' : 'Change pending shipment item product'}
                              >
                                {shipmentProductOptions.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                    {product.supplier_name ? ` · ${product.supplier_name}` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={styles.td}>{ordered}</td>
                            <td style={styles.td}>
                              <input
                                style={styles.inputCompact}
                                type="number"
                                min={Math.max(received, 0.01)}
                                step="0.01"
                                value={getShipmentItemEditDraft(item).quantity}
                                onChange={(event) => updateShipmentItemEditDraft(item, { quantity: event.target.value })}
                                disabled={!canManageShipmentItems || !canEditSelectedShipment || selectedShipment.status !== 'pending' || updateShipmentItemMutation.isPending}
                              />
                            </td>
                            <td style={styles.td}>{received}</td>
                            <td style={styles.td}>{remaining}</td>
                            <td style={styles.td}>
                              <select
                                style={styles.inputCompact}
                                value={draft.storage_location_id}
                                onChange={(event) =>
                                  updateReceiveDraft(item.id, (current) => ({
                                    ...current,
                                    storage_location_id: event.target.value
                                  }))
                                }
                              >
                                <option value="">Select location</option>
                                {(storageLocationsQuery.data ?? []).map((location) => (
                                  <option key={location.id} value={location.id}>
                                    {location.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td style={styles.td}>
                              <input
                                style={styles.inputCompact}
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={draft.quantity_received}
                                onChange={(event) =>
                                  updateReceiveDraft(item.id, (current) => ({
                                    ...current,
                                    quantity_received: event.target.value
                                  }))
                                }
                              />
                            </td>
                            <td style={styles.td}>
                              <input
                                style={styles.inputCompact}
                                type="text"
                                placeholder="Required if final shortage remains"
                                value={draft.discrepancy_reason}
                                onChange={(event) =>
                                  updateReceiveDraft(item.id, (current) => ({
                                    ...current,
                                    discrepancy_reason: event.target.value
                                  }))
                                }
                              />
                              {item.discrepancy_reason ? (
                                <div style={styles.savedReasonText}>
                                  Saved: {item.discrepancy_reason}
                                </div>
                              ) : null}
                            </td>
                            <td style={styles.td}>
                              <input
                                style={styles.inputCompact}
                                type="text"
                                placeholder="Optional receiving note"
                                value={draft.receiving_note}
                                onChange={(event) =>
                                  updateReceiveDraft(item.id, (current) => ({
                                    ...current,
                                    receiving_note: event.target.value
                                  }))
                                }
                              />
                            </td>
                            <td style={styles.td}>
                              <div style={styles.itemActionStack}>
                                {selectedShipment.status === 'pending' ? (
                                  <>
                                    <button
                                      type="button"
                                      style={styles.secondaryButton}
                                      onClick={() => handleUpdateShipmentItem(item)}
                                      disabled={!canManageShipmentItems || !canEditSelectedShipment || updateShipmentItemMutation.isPending}
                                    >
                                      {updateShipmentItemMutation.isPending ? 'Saving...' : 'Save Item'}
                                    </button>
                                    <button
                                      type="button"
                                      style={styles.deleteShipmentButton}
                                      onClick={() => handleDeleteShipmentItem(item)}
                                      disabled={!canManageShipmentItems || !canEditSelectedShipment || deleteShipmentItemMutation.isPending || received > 0}
                                      title={received > 0 ? 'Received shipment items cannot be deleted' : 'Delete shipment item'}
                                    >
                                      {deleteShipmentItemMutation.isPending ? 'Deleting...' : 'Delete Item'}
                                    </button>
                                  </>
                                ) : null}
                                <button
                                  type="button"
                                  style={styles.secondaryButton}
                                  onClick={() => handleReceiveLine(item)}
                                  disabled={
                                    receiveShipmentMutation.isPending ||
                                    remaining <= 0 ||
                                    selectedShipment.status === 'received'
                                  }
                                >
                                  {receiveShipmentMutation.isPending ? 'Receiving...' : 'Receive'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    marginBottom: 20
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
    color: '#111827'
  },
  description: {
    marginTop: 8,
    color: '#6b7280',
    lineHeight: 1.6,
    maxWidth: 860
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    marginBottom: 20,
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#111827'
  },
  panelSubtitle: {
    marginTop: 6,
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 1.5
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    alignItems: 'end'
  },
  formActionRow: {
    display: 'flex',
    alignItems: 'end',
    gap: 10,
    flexWrap: 'wrap'
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
    border: '1px solid #d1d5db',
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
    borderRadius: 10,
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%'
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: 10,
    padding: '10px 14px',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 700,
    cursor: 'pointer'
  },
  deleteShipmentButton: {
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: '10px 14px',
    background: '#fef2f2',
    color: '#991b1b',
    fontWeight: 700,
    cursor: 'pointer'
  },
  deleteShipmentButtonDisabled: {
    background: '#f3f4f6',
    color: '#9ca3af',
    borderColor: '#e5e7eb',
    cursor: 'not-allowed'
  },
  finalizeButtonDisabled: {
    background: '#94a3b8',
    cursor: 'not-allowed'
  },
  finalizeButton: {
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    background: '#059669',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  scannerButton: {
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  scannerButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
  },
  emailSupplierButton: {
    border: 'none',
    borderRadius: 10,
    padding: '12px 16px',
    background: '#7c3aed',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer'
  },
  emailSupplierButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed'
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
    overflowY: 'auto',
    minWidth: 0
  },
  shipmentCard: {
    textAlign: 'left',
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 14,
    background: '#ffffff',
    cursor: 'pointer',
    width: '100%'
  },
  shipmentCardSelected: {
    border: '1px solid #2563eb',
    boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.12)'
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
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 16,
    background: '#f9fafb',
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
    background: '#e5e7eb',
    margin: '20px 0'
  },
  sectionTitle: {
    margin: '0 0 14px',
    fontSize: 16,
    fontWeight: 700,
    color: '#111827'
  },
  itemsHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14
  },
  itemsHeaderContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 0,
    flex: 1
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
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280',
    fontSize: 12,
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
    border: '1px solid #e5e7eb',
    borderRadius: 14,
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
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    marginBottom: 14,
    color: '#374151',
    fontSize: 13
  },
  mobileFieldGroup: {
    marginBottom: 12
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
    borderRadius: 16,
    background: '#ffffff',
    padding: 14,
    display: 'grid',
    gap: 8
  },
  workflowStepCardComplete: {
    border: '1px solid #bbf7d0',
    borderRadius: 16,
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
    border: '1px solid #e5e7eb',
    borderRadius: 16,
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
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 10,
    background: '#f9fafb'
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
    fontSize: 13
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
  },

  itemActionStack: {
    display: 'grid',
    gap: 8,
    minWidth: 120
  },
  mobileItemActionGrid: {
    display: 'grid',
    gap: 8,
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 12,
    background: '#f8fafc'
  },
  mobileItemButtonRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  }

};
