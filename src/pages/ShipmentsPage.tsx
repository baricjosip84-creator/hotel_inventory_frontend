import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';

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
 */

/**
 * ============================================================================
 * Types
 * ============================================================================
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

/**
 * ============================================================================
 * API helpers
 * ============================================================================
 */

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

/**
 * ============================================================================
 * Utility helpers
 * ============================================================================
 */

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
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

/**
 * ============================================================================
 * Component
 * ============================================================================
 */

export default function ShipmentsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  /**
   * UI state
   */
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [highlightedItemId, setHighlightedItemId] = useState('');
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [shipmentForm, setShipmentForm] = useState<ShipmentFormState>(emptyShipmentForm());
  const [itemForm, setItemForm] = useState<ItemFormState>(emptyItemForm());

  /**
   * One receive draft per shipment item row.
   * Key = shipment_item.id
   */
  const [receiveDrafts, setReceiveDrafts] = useState<Record<string, ReceiveDraft>>({});

  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  /**
   * Queries
   */
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

  /**
   * Mutations
   */
  const createShipmentMutation = useMutation({
    mutationFn: createShipment,
    onSuccess: async (shipment) => {
      setShipmentForm(emptyShipmentForm());
      setSelectedShipmentId(shipment.id);
      setReceiveDrafts({});
      setHighlightedItemId('');
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
    onSuccess: async () => {
      setPageError(null);
      setPageMessage('Shipment item received successfully.');

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
      setPageMessage('Shipment finalized successfully.');

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

  /**
   * Derived data
   */
  const shipments = useMemo(() => shipmentsQuery.data ?? [], [shipmentsQuery.data]);
  const shipmentItems = useMemo(() => shipmentItemsQuery.data ?? [], [shipmentItemsQuery.data]);

  const selectedShipment =
    shipments.find((shipment) => shipment.id === selectedShipmentId) ?? null;

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

  /**
   * Scanner integration
   *
   * Query params supported:
   * - shipmentId
   * - itemId
   * - scannedBarcode
   */
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

    if (itemIdFromQuery) {
      setHighlightedItemId(itemIdFromQuery);
      setPageMessage(
        scannedBarcode
          ? `Product barcode ${scannedBarcode} matched inside selected shipment.`
          : 'Shipment item matched from scanner.'
      );
    } else {
      setHighlightedItemId('');
      setPageMessage('Shipment opened from scanner.');
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('shipmentId');
    nextParams.delete('itemId');
    nextParams.delete('scannedBarcode');
    setSearchParams(nextParams, { replace: true });
  }, [shipments, searchParams, setSearchParams]);

  /**
   * When shipment items load and a scanner-highlighted item exists,
   * prefill the receive draft to quantity 1 when possible.
   */
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

  /**
   * Form helpers
   */
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

  /**
   * Submit handlers
   */
  const handleCreateShipment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPageError(null);
    setPageMessage(null);

    createShipmentMutation.mutate(shipmentForm);
  };

  const handleAddShipmentItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    setPageError(null);
    setPageMessage(null);
  };

  const openProductScanner = () => {
    if (!selectedShipmentId) {
      setPageError('Select a shipment before opening product scanner.');
      return;
    }

    navigate(`/scanner?mode=product&shipmentId=${encodeURIComponent(selectedShipmentId)}`);
  };

  /**
   * Render
   */
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
              disabled={createShipmentMutation.isPending}
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
            <p style={styles.emptyState}>Select a shipment to continue.</p>
          ) : (
            <>
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
                    disabled={addShipmentItemMutation.isPending}
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
                <h4 style={styles.sectionTitle}>Shipment Items</h4>

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
                      width: isMobile ? '100%' : undefined
                    }}
                    onClick={openProductScanner}
                  >
                    Scan Product Barcode
                  </button>

                  <button
                    type="button"
                    style={{
                      ...styles.finalizeButton,
                      width: isMobile ? '100%' : undefined
                    }}
                    onClick={handleFinalizeShipment}
                    disabled={
                      finalizeShipmentMutation.isPending ||
                      selectedShipment.status === 'received'
                    }
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
  errorBox: {
    marginBottom: 16,
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: 12,
    padding: '12px 14px'
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
    marginBottom: 14
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
  }
};