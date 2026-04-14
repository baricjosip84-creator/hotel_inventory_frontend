import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
 *
 * IMPORTANT BACKEND NOTES THIS FILE MATCHES
 * ----------------------------------------------------------------------------
 * 1) Add shipment item:
 *    POST /shipment-items
 *
 * 2) Receive shipment:
 *    POST /shipments/:id/receive
 *    Header: If-Match-Version
 *    Body:
 *    {
 *      items: [
 *        {
 *          product_id,
 *          quantity_received,
 *          storage_location_id,
 *          discrepancy_reason
 *        }
 *      ]
 *    }
 *
 * 3) Finalize shipment:
 *    POST /shipments/:id/finalize
 *    Header: If-Match-Version
 *
 * 4) Shipment lines are loaded from:
 *    GET /shipment-items/:shipmentId
 *
 * This file avoids guesswork and is intentionally explicit.
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

/**
 * ============================================================================
 * Component
 * ============================================================================
 */

export default function ShipmentsPage() {
  const queryClient = useQueryClient();

  /**
   * UI state
   */
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
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
      const base =
        current[itemId] ??
        makeDefaultReceiveDraft(
          shipmentItems.find((item) => item.id === itemId) as ShipmentItem
        );

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
    setPageError(null);
    setPageMessage(null);
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

          <div style={styles.formActions}>
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

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Shipment List</h3>

        <div style={styles.filtersGrid}>
          <input
            style={styles.input}
            value={shipmentSearch}
            onChange={(event) => setShipmentSearch(event.target.value)}
            placeholder="Search by PO number, supplier, status, or ID"
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

        {shipmentsQuery.isLoading ? <p>Loading shipments...</p> : null}
        {shipmentsQuery.isError ? (
          <p>Failed to load shipments: {(shipmentsQuery.error as Error).message || 'Unknown error'}</p>
        ) : null}

        {!shipmentsQuery.isLoading && !shipmentsQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>PO Number</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Delivery Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Version</th>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={7}>
                      No shipments found.
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((shipment) => (
                    <tr key={shipment.id}>
                      <td style={styles.td}>{shipment.po_number || '-'}</td>
                      <td style={styles.td}>{shipment.supplier_name || shipment.supplier_id}</td>
                      <td style={styles.td}>{formatDate(shipment.delivery_date)}</td>
                      <td style={styles.td}>
                        <span style={statusBadgeStyle(shipment.status)}>{shipment.status}</span>
                      </td>
                      <td style={styles.td}>{shipment.version}</td>
                      <td style={styles.td}>{shipment.id}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={
                            selectedShipmentId === shipment.id
                              ? styles.primaryButton
                              : styles.secondaryButton
                          }
                          onClick={() => selectShipment(shipment.id)}
                        >
                          {selectedShipmentId === shipment.id ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Selected Shipment Overview</h3>

        {!selectedShipment ? (
          <p>No shipment selected.</p>
        ) : (
          <div style={styles.overviewGrid}>
            <div style={styles.overviewCard}>
              <div style={styles.overviewLabel}>Supplier</div>
              <div style={styles.overviewValue}>
                {selectedShipment.supplier_name || selectedShipment.supplier_id}
              </div>
            </div>

            <div style={styles.overviewCard}>
              <div style={styles.overviewLabel}>PO Number</div>
              <div style={styles.overviewValue}>{selectedShipment.po_number || '-'}</div>
            </div>

            <div style={styles.overviewCard}>
              <div style={styles.overviewLabel}>Delivery Date</div>
              <div style={styles.overviewValue}>{formatDate(selectedShipment.delivery_date)}</div>
            </div>

            <div style={styles.overviewCard}>
              <div style={styles.overviewLabel}>Status</div>
              <div style={styles.overviewValue}>{selectedShipment.status}</div>
            </div>

            <div style={styles.overviewCard}>
              <div style={styles.overviewLabel}>Version</div>
              <div style={styles.overviewValue}>{selectedShipment.version}</div>
            </div>

            <div style={styles.overviewCard}>
              <div style={styles.overviewLabel}>Shipment ID</div>
              <div style={styles.overviewSmallValue}>{selectedShipment.id}</div>
            </div>
          </div>
        )}
      </section>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Add Shipment Item</h3>

        <form onSubmit={handleAddShipmentItem} style={styles.formGrid}>
          <div>
            <label style={styles.label}>Selected Shipment</label>
            <input
              style={styles.input}
              value={selectedShipmentId}
              readOnly
              placeholder="Select a shipment first"
            />
          </div>

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
              step="1"
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

          <div style={styles.formActions}>
            <button
              type="submit"
              style={styles.primaryButton}
              disabled={addShipmentItemMutation.isPending}
            >
              {addShipmentItemMutation.isPending ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeaderRow}>
          <h3 style={styles.panelTitleNoMargin}>Shipment Items & Receiving</h3>

          {selectedShipment && selectedShipment.status !== 'received' ? (
            <button
              type="button"
              style={styles.successButton}
              onClick={handleFinalizeShipment}
              disabled={finalizeShipmentMutation.isPending}
            >
              {finalizeShipmentMutation.isPending ? 'Finalizing...' : 'Finalize Shipment'}
            </button>
          ) : null}
        </div>

        {!selectedShipmentId ? (
          <p>Select a shipment to view items.</p>
        ) : shipmentItemsQuery.isLoading ? (
          <p>Loading shipment items...</p>
        ) : shipmentItemsQuery.isError ? (
          <p>Failed to load shipment items.</p>
        ) : (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Ordered</th>
                  <th style={styles.th}>Received</th>
                  <th style={styles.th}>Remaining</th>
                  <th style={styles.th}>Quantity To Receive</th>
                  <th style={styles.th}>Storage Location</th>
                  <th style={styles.th}>Discrepancy Reason</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {shipmentItems.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={8}>
                      No items found for this shipment.
                    </td>
                  </tr>
                ) : (
                  shipmentItems.map((item) => {
                    const ordered = toNumber(item.quantity);
                    const received = toNumber(item.received_quantity);
                    const remaining = Math.max(ordered - received, 0);
                    const draft = getReceiveDraft(item);
                    const isFullyReceived = remaining <= 0;
                    const shipmentClosed = selectedShipment?.status === 'received';

                    return (
                      <tr key={item.id}>
                        <td style={styles.td}>
                          <div style={styles.rowTitle}>{item.product_name || item.product_id}</div>
                          <div style={styles.rowSubtle}>Shipment item ID: {item.id}</div>
                        </td>
                        <td style={styles.td}>{ordered}</td>
                        <td style={styles.td}>{received}</td>
                        <td style={styles.td}>
                          <span style={remaining > 0 ? styles.remainingBadge : styles.completeBadge}>
                            {remaining}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <input
                            style={styles.compactInput}
                            type="number"
                            min="1"
                            max={remaining > 0 ? remaining : 1}
                            step="1"
                            value={draft.quantity_received}
                            onChange={(event) =>
                              updateReceiveDraft(item.id, (current) => ({
                                ...current,
                                quantity_received: event.target.value
                              }))
                            }
                            disabled={isFullyReceived || shipmentClosed}
                          />
                        </td>
                        <td style={styles.td}>
                          <select
                            style={styles.compactInput}
                            value={draft.storage_location_id}
                            onChange={(event) =>
                              updateReceiveDraft(item.id, (current) => ({
                                ...current,
                                storage_location_id: event.target.value
                              }))
                            }
                            disabled={isFullyReceived || shipmentClosed}
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
                            style={styles.compactInput}
                            value={draft.discrepancy_reason}
                            onChange={(event) =>
                              updateReceiveDraft(item.id, (current) => ({
                                ...current,
                                discrepancy_reason: event.target.value
                              }))
                            }
                            placeholder="Optional"
                            disabled={isFullyReceived || shipmentClosed}
                          />
                        </td>
                        <td style={styles.td}>
                          {shipmentClosed ? (
                            <span style={styles.completeBadge}>Shipment Closed</span>
                          ) : isFullyReceived ? (
                            <span style={styles.completeBadge}>Fully Received</span>
                          ) : (
                            <button
                              type="button"
                              style={styles.successButton}
                              onClick={() => handleReceiveLine(item)}
                              disabled={receiveShipmentMutation.isPending}
                            >
                              {receiveShipmentMutation.isPending ? 'Receiving...' : 'Receive'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700
  },
  description: {
    marginTop: '8px',
    color: '#6b7280',
    lineHeight: 1.5
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    marginBottom: '20px'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '16px',
    fontSize: '20px',
    fontWeight: 700
  },
  panelTitleNoMargin: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700
  },
  panelHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    alignItems: 'end'
  },
  filtersGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '14px',
    marginBottom: '16px'
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px'
  },
  overviewCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '14px',
    background: '#fafafa'
  },
  overviewLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
    fontWeight: 600
  },
  overviewValue: {
    fontSize: '16px',
    fontWeight: 700,
    wordBreak: 'break-word'
  },
  overviewSmallValue: {
    fontSize: '13px',
    fontWeight: 600,
    wordBreak: 'break-all',
    lineHeight: 1.4
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    outline: 'none'
  },
  compactInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    outline: 'none',
    minWidth: '140px'
  },
  formActions: {
    display: 'flex',
    alignItems: 'end'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1180px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#6b7280'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '14px',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  badgeBase: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    fontWeight: 700,
    fontSize: '12px'
  },
  remainingBadge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#fef3c7',
    color: '#92400e',
    fontWeight: 700,
    fontSize: '12px'
  },
  completeBadge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#dcfce7',
    color: '#166534',
    fontWeight: 700,
    fontSize: '12px'
  },
  primaryButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '10px 14px',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 600,
    cursor: 'pointer'
  },
  successButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '10px 14px',
    background: '#16a34a',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer'
  },
  errorBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c'
  },
  successBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534'
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    wordBreak: 'break-all',
    lineHeight: 1.4
  }
};