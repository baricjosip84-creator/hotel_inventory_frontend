import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
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
 * - finalizing partially received shipments
 * - auto-selecting a shipment when scanner redirects with ?shipmentId=
 * - highlighting and preparing a shipment item when product barcode scan returns
 * - auto-receiving one unit from scanner when a safe storage location is known
 *
 * MOBILE UPDATE
 * ----------------------------------------------------------------------------
 * This version improves mobile UX further by:
 * - stacking major panels on small screens
 * - converting shipment items from a wide table into tap-friendly cards on mobile
 * - making receive controls more readable and easier to use on phone
 *
 * PRODUCT BARCODE SCAN UPDATE
 * ----------------------------------------------------------------------------
 * This version also supports product receiving prep flow:
 * - user selects shipment
 * - user opens scanner in product mode
 * - scanner returns with shipmentId + itemId + scannedBarcode
 * - page auto-selects shipment
 * - matched shipment item is highlighted
 * - receive quantity is prefilled to 1 when possible
 * - auto-receive runs when the system can safely determine storage location
 *
 * DEFAULT LOCATION FLOW
 * ----------------------------------------------------------------------------
 * This version adds a professional scan flow:
 * - user selects a default storage location before scanning
 * - the scanner receives that location in the URL
 * - the shipments page restores that location from scanner return params
 * - auto receive then uses the explicit location instead of guesswork
 *
 * UX IMPROVEMENT
 * ----------------------------------------------------------------------------
 * This version also makes scan requirements explicit:
 * - the scan button is disabled until a default scan location is selected
 * - inline guidance explains why scanning is disabled
 * - the default location label clearly explains what it is used for
 */

type ShipmentSummary = {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  delivery_date: string;
  status: 'pending' | 'partial' | 'received' | string;
  qr_code: string;
  po_number?: string | null;
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
};

type StorageLocationOption = {
  id: string;
  name: string;
};

type ShipmentFormState = {
  supplier_id: string;
  delivery_date: string;
  po_number: string;
};

type ItemFormState = {
  product_id: string;
  quantity: string;
};

type ReceiveDraft = {
  quantity_received: string;
  storage_location_id: string;
  discrepancy_reason: string;
};

type PendingAutoReceive = {
  itemId: string;
  scannedBarcode: string | null;
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

async function fetchShipmentItems(shipmentId: string): Promise<ShipmentItem[]> {
  return apiRequest<ShipmentItem[]>(`/shipment-items/${shipmentId}`);
}

async function createShipment(input: ShipmentFormState): Promise<ShipmentSummary> {
  return apiRequest<ShipmentSummary>('/shipments', {
    method: 'POST',
    body: JSON.stringify({
      supplier_id: input.supplier_id,
      delivery_date: input.delivery_date,
      po_number: input.po_number.trim() || null
    })
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

async function receiveShipmentLine(input: {
  shipmentId: string;
  version: number;
  item: {
    product_id: string;
    quantity_received: number;
    storage_location_id: string;
    discrepancy_reason?: string | null;
  };
}): Promise<{ message: string; status: string }> {
  return apiRequest<{ message: string; status: string }>(`/shipments/${input.shipmentId}/receive`, {
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
}): Promise<{ message: string; status: string }> {
  return apiRequest<{ message: string; status: string }>(`/shipments/${input.shipmentId}/finalize`, {
    method: 'POST',
    headers: {
      'If-Match-Version': String(input.version)
    }
  });
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
    po_number: ''
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
    discrepancy_reason: ''
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

  const { role, canManageShipments, canReceiveShipments } = getRoleCapabilities();
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

  const receiveShipmentMutation = useMutation({
    mutationFn: receiveShipmentLine,
    onSuccess: async (_data, variables) => {
      setPageError(null);

      const matchedItem = shipmentItems.find((item) => item.product_id === variables.item.product_id);
      const quantityLabel = formatQuantity(variables.item.quantity_received);
      const productLabel = matchedItem?.product_name || matchedItem?.product_id || variables.item.product_id;

      setPageMessage(`✔ ${productLabel} +${quantityLabel} received into stock.`);

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });
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
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('✔ Shipment finalized and locked for receiving.');

      await queryClient.refetchQueries({ queryKey: ['shipments'] });
      await queryClient.refetchQueries({ queryKey: ['shipment-items', selectedShipmentId] });
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

  const shipments = useMemo(() => shipmentsQuery.data ?? [], [shipmentsQuery.data]);
  const shipmentItems = useMemo(() => shipmentItemsQuery.data ?? [], [shipmentItemsQuery.data]);
  const storageLocations = useMemo(
    () => storageLocationsQuery.data ?? [],
    [storageLocationsQuery.data]
  );

  const selectedShipment =
    shipments.find((shipment) => shipment.id === selectedShipmentId) ?? null;


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
      detail:
        selectedShipment?.status === 'received'
          ? 'Shipment already finalized.'
          : selectedShipmentProgress >= 100
            ? 'Shipment is ready to finalize.'
            : 'Finalize after all expected quantities are received.',
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

    if (locationIdFromQuery) {
      setSelectedScannerLocationId(locationIdFromQuery);
    }

    if (itemIdFromQuery) {
      setHighlightedItemId(itemIdFromQuery);
      setPendingAutoReceive({
        itemId: itemIdFromQuery,
        scannedBarcode
      });
      autoReceiveAttemptKeyRef.current = '';

      setPageMessage(
        scannedBarcode
          ? `Product barcode ${scannedBarcode} matched inside selected shipment.`
          : 'Shipment item matched from scanner.'
      );
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
          quantity_received: remaining > 0 ? '1' : existing.quantity_received
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
      pendingAutoReceive.scannedBarcode || ''
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

    setReceiveDrafts((current) => ({
      ...current,
      [matchedItem.id]: {
        ...(current[matchedItem.id] ?? makeDefaultReceiveDraft(matchedItem)),
        quantity_received: remaining >= 1 ? '1' : String(remaining),
        storage_location_id: safeStorageLocationId
      }
    }));

    autoReceiveAttemptKeyRef.current = attemptKey;
    setPendingAutoReceive(null);
    setPageError(null);
    setPageMessage(
      pendingAutoReceive.scannedBarcode
        ? `Barcode ${pendingAutoReceive.scannedBarcode} matched. Auto receiving 1 unit...`
        : 'Scanner matched item. Auto receiving 1 unit...'
    );

    receiveShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version,
      item: {
        product_id: matchedItem.product_id,
        quantity_received: remaining >= 1 ? 1 : remaining,
        storage_location_id: safeStorageLocationId,
        discrepancy_reason: draft.discrepancy_reason.trim() || null
      }
    });
  }, [
    pendingAutoReceive,
    selectedShipment,
    shipmentItems,
    storageLocations,
    receiveShipmentMutation,
    receiveDrafts
  ]);

  const getReceiveDraft = (item: ShipmentItem): ReceiveDraft => {
    return receiveDrafts[item.id] ?? makeDefaultReceiveDraft(item);
  };

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

    if (!canManageShipments) {
      setPageError('Your current role cannot add shipment items. Shipment item writes are restricted to manager and admin roles by the existing backend.');
      return;
    }
    setPageError(null);
    setPageMessage(null);

    if (!selectedShipmentId) {
      setPageError('Select a shipment first.');
      return;
    }

    addShipmentItemMutation.mutate({
      shipment_id: selectedShipmentId,
      product_id: itemForm.product_id,
      quantity: Number(itemForm.quantity)
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
        discrepancy_reason: draft.discrepancy_reason.trim() || null
      }
    });
  };

  const handleFinalizeShipment = () => {
    if (!canManageShipments) {
      setPageError('Your current role cannot finalize shipments. Shipment finalization is restricted to manager and admin roles by the existing backend.');
      return;
    }

    setPageError(null);
    setPageMessage(null);

    if (!selectedShipment) {
      setPageError('Select a shipment first.');
      return;
    }

    finalizeShipmentMutation.mutate({
      shipmentId: selectedShipment.id,
      version: selectedShipment.version
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
            or fully, and finalize the shipment when operations are complete.
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
                  supplier_id: event.target.value
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

          <div style={styles.formActionRow}>
            <button
              type="submit"
              style={styles.primaryButton}
              disabled={createShipmentMutation.isPending || !canManageShipments}
              title={!canManageShipments ? 'Manager or admin role required' : undefined}
            >
              {createShipmentMutation.isPending ? 'Creating...' : 'Create Shipment'}
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
                Add shipment lines, receive stock into locations, and finalize the shipment.
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
                    <span style={selectedShipmentProgress >= 100 ? styles.progressBadgeComplete : styles.progressBadgePending}>
                      {selectedShipmentProgress >= 100 ? 'Ready to finalize' : `${Math.round(selectedShipmentProgress)}% received`}
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
                    {(productsQuery.data ?? []).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
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
                    disabled={addShipmentItemMutation.isPending || !canManageShipments}
                    title={!canManageShipments ? 'Manager or admin role required' : undefined}
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
                      ...styles.finalizeButton,
                      width: isMobile ? '100%' : undefined,
                      ...(!canManageShipments ? styles.finalizeButtonDisabled : {})
                    }}
                    onClick={handleFinalizeShipment}
                    disabled={
                      finalizeShipmentMutation.isPending ||
                      selectedShipment.status === 'received' ||
                      !canManageShipments
                    }
                    title={!canManageShipments ? 'Manager or admin role required' : undefined}
                  >
                    {finalizeShipmentMutation.isPending ? 'Finalizing...' : 'Finalize Shipment'}
                  </button>
                </div>
              </div>

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
                            placeholder="Optional discrepancy reason"
                            value={draft.discrepancy_reason}
                            onChange={(event) =>
                              updateReceiveDraft(item.id, (current) => ({
                                ...current,
                                discrepancy_reason: event.target.value
                              }))
                            }
                          />
                        </div>

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
                        <th style={styles.th}>Ordered</th>
                        <th style={styles.th}>Received</th>
                        <th style={styles.th}>Remaining</th>
                        <th style={styles.th}>Storage Location</th>
                        <th style={styles.th}>Receive Quantity</th>
                        <th style={styles.th}>Discrepancy Reason</th>
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
                              </div>
                            </td>
                            <td style={styles.td}>{ordered}</td>
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
                                placeholder="Optional discrepancy reason"
                                value={draft.discrepancy_reason}
                                onChange={(event) =>
                                  updateReceiveDraft(item.id, (current) => ({
                                    ...current,
                                    discrepancy_reason: event.target.value
                                  }))
                                }
                              />
                            </td>
                            <td style={styles.td}>
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
    marginBottom: 20,
    minWidth: 0
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
    maxWidth: 860,
    wordBreak: 'break-word'
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
    alignItems: 'end'
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
    alignItems: 'start',
    width: '100%',
    minWidth: 0
  },
  shipmentListHeader: {
    marginBottom: 16,
    minWidth: 0
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 180px',
    gap: 12,
    marginBottom: 16,
    minWidth: 0
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
    width: '100%',
    minWidth: 0
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
    fontSize: 13,
    minWidth: 0,
    wordBreak: 'break-word'
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
    minWidth: 0
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
    marginBottom: 14,
    minWidth: 0
  },
  itemsHeaderContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minWidth: 0,
    flex: 1
  },
  defaultLocationBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxWidth: 320
  },
  inlineHint: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 400,
    marginTop: 4
  },
  scanWarningText: {
    color: '#b45309',
    fontSize: 13
  },
  itemTableWrapper: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    minWidth: 0
  },
  itemTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 900
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
    fontSize: 14,
    wordBreak: 'break-word'
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
  mobileItemCardList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  },
  mobileItemCard: {
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    padding: 14,
    background: '#ffffff',
    minWidth: 0
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

  guidedEmptyState: {
    display: 'grid',
    gap: 14,
    border: '1px dashed #cbd5e1',
    borderRadius: 18,
    background: '#f8fafc',
    padding: 18,
    minWidth: 0
  },
  guidedEmptyStateTitle: {
    fontSize: '1rem',
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  guidedEmptyStateText: {
    color: '#475569',
    lineHeight: 1.6,
    wordBreak: 'break-word'
  },
  workflowGuideGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    minWidth: 0
  },
  workflowStepCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    background: '#ffffff',
    padding: 14,
    display: 'grid',
    gap: 8,
    minWidth: 0
  },
  workflowStepCardComplete: {
    border: '1px solid #bbf7d0',
    borderRadius: 16,
    background: '#f0fdf4',
    padding: 14,
    display: 'grid',
    gap: 8,
    minWidth: 0
  },
  workflowStepLabel: {
    fontSize: '0.86rem',
    fontWeight: 800,
    color: '#0f172a',
    wordBreak: 'break-word'
  },
  workflowStepText: {
    color: '#475569',
    lineHeight: 1.5,
    fontSize: '0.92rem',
    wordBreak: 'break-word'
  },
  scannerReadinessSection: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 16,
    minWidth: 0,
    alignItems: 'stretch'
  },
  readinessCard: {
    border: '1px solid #e5e7eb',
    borderRadius: 14,
    background: '#ffffff',
    padding: 16,
    display: 'grid',
    gap: 14,
    minWidth: 0
  },
  readinessHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    minWidth: 0
  },
  readinessStatusReady: {
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
  readinessStatusBlocked: {
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
  progressBadgeComplete: {
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
  progressBadgePending: {
    display: 'inline-flex',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 700,
    background: '#eff6ff',
    color: '#1d4ed8'
  },
  progressSummaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 12,
    minWidth: 0
  },
  progressMetricBox: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    background: '#f8fafc',
    padding: 12,
    display: 'grid',
    gap: 6,
    minWidth: 0,
    color: '#111827'
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    background: '#e5e7eb',
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
    background: 'linear-gradient(90deg, #2563eb 0%, #059669 100%)'
  },
  defaultLocationSummary: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  scanReadyBanner: {
    borderRadius: 12,
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    color: '#065f46',
    padding: '12px 14px',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  scanWarningBanner: {
    borderRadius: 12,
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412',
    padding: '12px 14px',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  emptyState: {
    color: '#6b7280',
    margin: 0
  }
};