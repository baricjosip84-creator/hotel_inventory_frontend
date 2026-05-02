import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { ProductItem, SupplierItem } from '../types/inventory';

type PurchaseOrderStatus = 'draft' | 'submitted' | 'approved' | 'cancelled' | string;

type PurchaseOrderListItem = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_email?: string | null;
  po_number: string;
  status: PurchaseOrderStatus;
  expected_delivery_date?: string | null;
  notes?: string | null;
  created_by_user_name?: string | null;
  submitted_by_user_name?: string | null;
  submitted_at?: string | null;
  approved_by_user_name?: string | null;
  approved_at?: string | null;
  cancelled_by_user_name?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  item_count?: number | string;
  total_quantity?: number | string;
  estimated_total_cost?: number | string;
  linked_shipment_count?: number | string;
  total_received_quantity?: number | string;
};

type PurchaseOrderDetailItem = {
  id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  product_category?: string | null;
  quantity: number | string;
  received_quantity?: number | string;
  remaining_quantity?: number | string;
  unit_cost?: number | string | null;
  estimated_line_total?: number | string;
  notes?: string | null;
};

type LinkedShipmentSummary = {
  id: string;
  status: string;
  delivery_date?: string | null;
  po_number?: string | null;
  qr_code?: string | null;
  created_at?: string | null;
  item_count?: number | string;
  ordered_quantity?: number | string;
  received_quantity?: number | string;
};

type PurchaseOrderReceivingSummary = {
  ordered_quantity: number | string;
  received_quantity: number | string;
  remaining_quantity: number | string;
  linked_shipment_count: number | string;
};

type PurchaseOrderDetail = PurchaseOrderListItem & {
  items: PurchaseOrderDetailItem[];
  linked_shipments?: LinkedShipmentSummary[];
  receiving_summary?: PurchaseOrderReceivingSummary;
};

type CreateShipmentFromPurchaseOrderResponse = {
  shipment: {
    id: string;
    delivery_date: string;
    status: string;
    po_number?: string | null;
    purchase_order_id?: string | null;
  };
  copied_item_count: number;
};

type PurchaseOrderFormItem = {
  product_id: string;
  quantity: string;
  unit_cost: string;
  notes: string;
};

type PurchaseOrderFormState = {
  supplier_id: string;
  po_number: string;
  expected_delivery_date: string;
  notes: string;
  items: PurchaseOrderFormItem[];
};

type Filters = {
  status: string;
  search: string;
  supplierId: string;
  productId: string;
};

function emptyForm(): PurchaseOrderFormState {
  return {
    supplier_id: '',
    po_number: '',
    expected_delivery_date: '',
    notes: '',
    items: [{ product_id: '', quantity: '', unit_cost: '', notes: '' }]
  };
}

function normalizeError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function badgeStyle(status: PurchaseOrderStatus): CSSProperties {
  if (status === 'approved') return styles.approvedBadge;
  if (status === 'submitted') return styles.submittedBadge;
  if (status === 'cancelled') return styles.cancelledBadge;
  return styles.draftBadge;
}

async function fetchPurchaseOrders(filters: Filters): Promise<PurchaseOrderListItem[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.supplierId) params.set('supplier_id', filters.supplierId);
  if (filters.productId) params.set('product_id', filters.productId);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<PurchaseOrderListItem[]>(`/purchase-orders${suffix}`);
}

async function fetchPurchaseOrder(id: string): Promise<PurchaseOrderDetail> {
  return apiRequest<PurchaseOrderDetail>(`/purchase-orders/${id}`);
}

async function fetchSuppliers(): Promise<SupplierItem[]> {
  return apiRequest<SupplierItem[]>('/suppliers');
}

async function fetchProducts(): Promise<ProductItem[]> {
  return apiRequest<ProductItem[]>('/products');
}

function buildPayload(input: PurchaseOrderFormState) {
  return {
    supplier_id: input.supplier_id,
    po_number: input.po_number.trim() || null,
    expected_delivery_date: input.expected_delivery_date || null,
    notes: input.notes.trim() || null,
    items: input.items.map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity),
      unit_cost: item.unit_cost === '' ? null : Number(item.unit_cost),
      notes: item.notes.trim() || null
    }))
  };
}

async function createPurchaseOrder(input: PurchaseOrderFormState): Promise<PurchaseOrderDetail> {
  return apiRequest<PurchaseOrderDetail>('/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(buildPayload(input))
  });
}

async function updatePurchaseOrder(id: string, input: PurchaseOrderFormState): Promise<PurchaseOrderDetail> {
  return apiRequest<PurchaseOrderDetail>(`/purchase-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(buildPayload(input))
  });
}

async function lifecycleAction(id: string, action: 'submit' | 'approve' | 'cancel', body?: unknown): Promise<PurchaseOrderDetail> {
  return apiRequest<PurchaseOrderDetail>(`/purchase-orders/${id}/${action}`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : JSON.stringify({})
  });
}

async function createShipmentFromPurchaseOrder(id: string, deliveryDate?: string | null): Promise<CreateShipmentFromPurchaseOrderResponse> {
  return apiRequest<CreateShipmentFromPurchaseOrderResponse>(`/purchase-orders/${id}/create-shipment`, {
    method: 'POST',
    body: JSON.stringify({ delivery_date: deliveryDate || null })
  });
}

function detailToForm(detail: PurchaseOrderDetail): PurchaseOrderFormState {
  return {
    supplier_id: detail.supplier_id,
    po_number: detail.po_number || '',
    expected_delivery_date: detail.expected_delivery_date ? String(detail.expected_delivery_date).slice(0, 10) : '',
    notes: detail.notes || '',
    items: detail.items.map((item) => ({
      product_id: item.product_id,
      quantity: String(item.quantity ?? ''),
      unit_cost: item.unit_cost === null || item.unit_cost === undefined ? '' : String(item.unit_cost),
      notes: item.notes || ''
    }))
  };
}

export default function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const capabilities = getRoleCapabilities();

  const [filters, setFilters] = useState<Filters>({ status: '', search: '', supplierId: '', productId: '' });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PurchaseOrderFormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [shipmentDeliveryDate, setShipmentDeliveryDate] = useState('');

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: () => fetchPurchaseOrders(filters)
  });

  const detailQuery = useQuery({
    queryKey: ['purchase-order', selectedId],
    queryFn: () => fetchPurchaseOrder(selectedId as string),
    enabled: Boolean(selectedId)
  });

  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

  const selectedDetail = detailQuery.data ?? null;
  const isEditingSelectedDraft = Boolean(editingId && selectedDetail?.status === 'draft');

  const summary = useMemo(() => {
    const rows = purchaseOrdersQuery.data || [];
    return {
      count: rows.length,
      draft: rows.filter((row) => row.status === 'draft').length,
      submitted: rows.filter((row) => row.status === 'submitted').length,
      approved: rows.filter((row) => row.status === 'approved').length,
      estimatedTotal: rows.reduce((sum, row) => sum + Number(row.estimated_total_cost || 0), 0)
    };
  }, [purchaseOrdersQuery.data]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
  };

  useEffect(() => {
    if (!selectedId) return;
    void queryClient.invalidateQueries({ queryKey: ['purchase-order', selectedId] });
  }, [selectedId, queryClient]);

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setSelectedId(created.id);
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PurchaseOrderFormState }) => updatePurchaseOrder(id, input),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-order', updated.id] });
      setSelectedId(updated.id);
      resetForm();
    }
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: 'submit' | 'approve' | 'cancel'; body?: unknown }) =>
      lifecycleAction(id, action, body),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-order', updated.id] });
      setSelectedId(updated.id);
      setCancelReason('');
    }
  });

  const createShipmentMutation = useMutation({
    mutationFn: ({ id, deliveryDate }: { id: string; deliveryDate?: string | null }) =>
      createShipmentFromPurchaseOrder(id, deliveryDate),
    onSuccess: async (payload) => {
      await queryClient.invalidateQueries({ queryKey: ['shipments'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setShipmentDeliveryDate('');
      navigate(`/shipments?shipmentId=${encodeURIComponent(payload.shipment.id)}`);
    }
  });

  const validateForm = (): string | null => {
    if (!form.supplier_id) return 'Supplier is required.';
    if (!form.items.length) return 'At least one item is required.';
    const seen = new Set<string>();
    for (const item of form.items) {
      if (!item.product_id) return 'Every item needs a product.';
      if (seen.has(item.product_id)) return 'A product can only appear once per purchase order.';
      seen.add(item.product_id);
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return 'Every quantity must be greater than zero.';
      if (item.unit_cost !== '') {
        const cost = Number(item.unit_cost);
        if (!Number.isFinite(cost) || cost < 0) return 'Unit cost must be zero or greater.';
      }
    }
    return null;
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, input: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = () => {
    if (!selectedDetail || selectedDetail.status !== 'draft') return;
    setEditingId(selectedDetail.id);
    setForm(detailToForm(selectedDetail));
    setFormError(null);
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { product_id: '', quantity: '', unit_cost: '', notes: '' }]
    }));
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.length > 1 ? current.items.filter((_, itemIndex) => itemIndex !== index) : current.items
    }));
  };

  const updateItem = (index: number, patch: Partial<PurchaseOrderFormItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    }));
  };

  const actionError = normalizeError(actionMutation.error, 'Purchase order action failed.');
  const createShipmentError = normalizeError(createShipmentMutation.error, 'Creating shipment from purchase order failed.');
  const formMutationError = normalizeError(createMutation.error || updateMutation.error, 'Saving purchase order failed.');

  const selectedCanEdit = selectedDetail?.status === 'draft';
  const selectedCanSubmit = selectedDetail?.status === 'draft';
  const selectedCanApprove = selectedDetail?.status === 'submitted';
  const selectedCanCancel = selectedDetail?.status === 'draft' || selectedDetail?.status === 'submitted';
  const selectedCanCreateShipment = selectedDetail?.status === 'approved';

  return (
    <div style={styles.page}>
      <section style={styles.card}>
        <div style={styles.headerRow}>
          <div>
            <h2 style={styles.h2}>Purchase Orders</h2>
            <p style={styles.muted}>Create supplier purchase orders without affecting stock or receiving yet.</p>
          </div>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryBox}><strong>{summary.count}</strong><span>Total</span></div>
            <div style={styles.summaryBox}><strong>{summary.draft}</strong><span>Draft</span></div>
            <div style={styles.summaryBox}><strong>{summary.submitted}</strong><span>Submitted</span></div>
            <div style={styles.summaryBox}><strong>{formatMoney(summary.estimatedTotal)}</strong><span>Est. cost</span></div>
          </div>
        </div>

        <div style={styles.filters}>
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search PO, supplier, notes…"
            style={styles.input}
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            style={styles.input}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filters.supplierId}
            onChange={(event) => setFilters((current) => ({ ...current, supplierId: event.target.value }))}
            style={styles.input}
          >
            <option value="">All suppliers</option>
            {(suppliersQuery.data || []).map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
          <select
            value={filters.productId}
            onChange={(event) => setFilters((current) => ({ ...current, productId: event.target.value }))}
            style={styles.input}
          >
            <option value="">All products</option>
            {(productsQuery.data || []).map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => setFilters({ status: '', search: '', supplierId: '', productId: '' })}
          >
            Clear
          </button>
        </div>

        {purchaseOrdersQuery.isLoading ? <p>Loading purchase orders…</p> : null}
        {purchaseOrdersQuery.error ? <p style={styles.error}>{normalizeError(purchaseOrdersQuery.error, 'Failed to load purchase orders.')}</p> : null}

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>PO Number</th>
                <th style={styles.th}>Supplier</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Expected</th>
                <th style={styles.th}>Items</th>
                <th style={styles.th}>Received</th>
                <th style={styles.th}>Shipments</th>
                <th style={styles.th}>Estimated Cost</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {(purchaseOrdersQuery.data || []).map((row) => (
                <tr
                  key={row.id}
                  style={row.id === selectedId ? styles.selectedRow : styles.clickableRow}
                  onClick={() => setSelectedId(row.id)}
                >
                  <td style={styles.td}>{row.po_number}</td>
                  <td style={styles.td}>{row.supplier_name}</td>
                  <td style={styles.td}><span style={{ ...styles.badge, ...badgeStyle(row.status) }}>{row.status}</span></td>
                  <td style={styles.td}>{formatDate(row.expected_delivery_date)}</td>
                  <td style={styles.td}>{formatNumber(row.item_count)}</td>
                  <td style={styles.td}>{formatNumber(row.total_received_quantity)}</td>
                  <td style={styles.td}>{formatNumber(row.linked_shipment_count)}</td>
                  <td style={styles.td}>{formatMoney(row.estimated_total_cost)}</td>
                  <td style={styles.td}>{formatDateTime(row.created_at)}</td>
                </tr>
              ))}
              {!purchaseOrdersQuery.isLoading && !(purchaseOrdersQuery.data || []).length ? (
                <tr><td style={styles.td} colSpan={9}>No purchase orders found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.twoColumn}>
        <form style={styles.card} onSubmit={submitForm}>
          <h3 style={styles.h3}>{editingId ? 'Edit Draft Purchase Order' : 'Create Purchase Order'}</h3>
          <label style={styles.label}>Supplier</label>
          <select
            style={styles.input}
            value={form.supplier_id}
            onChange={(event) => setForm((current) => ({ ...current, supplier_id: event.target.value }))}
            disabled={!capabilities.canCreatePurchaseOrders && !capabilities.canUpdatePurchaseOrders}
          >
            <option value="">Select supplier</option>
            {(suppliersQuery.data || []).map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>

          <div style={styles.inlineGrid}>
            <div>
              <label style={styles.label}>PO number</label>
              <input
                style={styles.input}
                value={form.po_number}
                onChange={(event) => setForm((current) => ({ ...current, po_number: event.target.value }))}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <label style={styles.label}>Expected delivery</label>
              <input
                style={styles.input}
                type="date"
                value={form.expected_delivery_date}
                onChange={(event) => setForm((current) => ({ ...current, expected_delivery_date: event.target.value }))}
              />
            </div>
          </div>

          <label style={styles.label}>Notes</label>
          <textarea
            style={{ ...styles.input, minHeight: 72 }}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Internal notes"
          />

          <div style={styles.sectionHeader}>
            <h4 style={styles.h4}>Items</h4>
            <button type="button" style={styles.secondaryButton} onClick={addItem}>Add item</button>
          </div>

          {form.items.map((item, index) => (
            <div key={index} style={styles.itemBox}>
              <select
                style={styles.input}
                value={item.product_id}
                onChange={(event) => updateItem(index, { product_id: event.target.value })}
              >
                <option value="">Select product</option>
                {(productsQuery.data || []).map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>
                ))}
              </select>
              <div style={styles.inlineGrid}>
                <input
                  style={styles.input}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Quantity"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, { quantity: event.target.value })}
                />
                <input
                  style={styles.input}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Unit cost optional"
                  value={item.unit_cost}
                  onChange={(event) => updateItem(index, { unit_cost: event.target.value })}
                />
              </div>
              <input
                style={styles.input}
                placeholder="Item notes optional"
                value={item.notes}
                onChange={(event) => updateItem(index, { notes: event.target.value })}
              />
              <button type="button" style={styles.dangerButton} onClick={() => removeItem(index)}>Remove</button>
            </div>
          ))}

          {formError ? <p style={styles.error}>{formError}</p> : null}
          {(createMutation.error || updateMutation.error) ? <p style={styles.error}>{formMutationError}</p> : null}

          <div style={styles.buttonRow}>
            <button type="submit" style={styles.primaryButton} disabled={createMutation.isPending || updateMutation.isPending || (!editingId && !capabilities.canCreatePurchaseOrders) || Boolean(editingId && !capabilities.canUpdatePurchaseOrders)}>
              {editingId ? 'Save Draft' : 'Create Draft'}
            </button>
            {editingId ? <button type="button" style={styles.secondaryButton} onClick={resetForm}>Cancel Edit</button> : null}
          </div>
        </form>

        <div style={styles.card}>
          <h3 style={styles.h3}>Selected Purchase Order</h3>
          {!selectedId ? <p style={styles.muted}>Select a purchase order to view detail.</p> : null}
          {detailQuery.isLoading ? <p>Loading detail…</p> : null}
          {detailQuery.error ? <p style={styles.error}>{normalizeError(detailQuery.error, 'Failed to load purchase order.')}</p> : null}
          {selectedDetail ? (
            <>
              <div style={styles.detailHeader}>
                <div>
                  <h4 style={styles.h4}>{selectedDetail.po_number}</h4>
                  <p style={styles.muted}>{selectedDetail.supplier_name}</p>
                </div>
                <span style={{ ...styles.badge, ...badgeStyle(selectedDetail.status) }}>{selectedDetail.status}</span>
              </div>
              <dl style={styles.detailGrid}>
                <dt>Expected delivery</dt><dd>{formatDate(selectedDetail.expected_delivery_date)}</dd>
                <dt>Estimated cost</dt><dd>{formatMoney(selectedDetail.estimated_total_cost)}</dd>
                <dt>PO received</dt><dd>{formatNumber(selectedDetail.receiving_summary?.received_quantity)} / {formatNumber(selectedDetail.receiving_summary?.ordered_quantity)}</dd>
                <dt>Remaining</dt><dd>{formatNumber(selectedDetail.receiving_summary?.remaining_quantity)}</dd>
                <dt>Linked shipments</dt><dd>{formatNumber(selectedDetail.receiving_summary?.linked_shipment_count)}</dd>
                <dt>Created</dt><dd>{formatDateTime(selectedDetail.created_at)}</dd>
                <dt>Submitted</dt><dd>{formatDateTime(selectedDetail.submitted_at)}</dd>
                <dt>Approved</dt><dd>{formatDateTime(selectedDetail.approved_at)}</dd>
                <dt>Cancelled</dt><dd>{formatDateTime(selectedDetail.cancelled_at)}</dd>
              </dl>
              {selectedDetail.notes ? <p style={styles.notes}>{selectedDetail.notes}</p> : null}

              <h4 style={styles.h4}>Items</h4>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Qty</th>
                      <th style={styles.th}>Received</th>
                      <th style={styles.th}>Remaining</th>
                      <th style={styles.th}>Unit Cost</th>
                      <th style={styles.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDetail.items.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.td}>{item.product_name}</td>
                        <td style={styles.td}>{formatNumber(item.quantity)} {item.product_unit}</td>
                        <td style={styles.td}>{formatNumber(item.received_quantity)} {item.product_unit}</td>
                        <td style={styles.td}>{formatNumber(item.remaining_quantity)} {item.product_unit}</td>
                        <td style={styles.td}>{formatMoney(item.unit_cost)}</td>
                        <td style={styles.td}>{formatMoney(item.estimated_line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>


              {(selectedDetail.linked_shipments || []).length ? (
                <>
                  <h4 style={{ ...styles.h4, marginTop: 16 }}>Linked Shipments</h4>
                  <div style={styles.tableWrap}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Shipment</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Delivery</th>
                          <th style={styles.th}>Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedDetail.linked_shipments || []).map((shipment) => (
                          <tr key={shipment.id}>
                            <td style={styles.td}>{shipment.po_number || shipment.qr_code || shipment.id}</td>
                            <td style={styles.td}>{shipment.status}</td>
                            <td style={styles.td}>{formatDate(shipment.delivery_date)}</td>
                            <td style={styles.td}>{formatNumber(shipment.received_quantity)} / {formatNumber(shipment.ordered_quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}

              {actionMutation.error ? <p style={styles.error}>{actionError}</p> : null}

              <div style={styles.buttonRow}>
                {selectedCanEdit && capabilities.canUpdatePurchaseOrders ? <button type="button" style={styles.secondaryButton} onClick={startEdit}>Edit Draft</button> : null}
                {selectedCanSubmit && capabilities.canSubmitPurchaseOrders ? (
                  <button type="button" style={styles.primaryButton} onClick={() => actionMutation.mutate({ id: selectedDetail.id, action: 'submit' })}>
                    Submit
                  </button>
                ) : null}
                {selectedCanApprove && capabilities.canApprovePurchaseOrders ? (
                  <button type="button" style={styles.primaryButton} onClick={() => actionMutation.mutate({ id: selectedDetail.id, action: 'approve' })}>
                    Approve
                  </button>
                ) : null}
              </div>

              {selectedCanCreateShipment && capabilities.canManageShipments ? (
                <div style={styles.bridgeBox}>
                  <div>
                    <h4 style={styles.h4}>Create shipment from this PO</h4>
                    <p style={styles.muted}>Copies PO lines into a pending shipment. Stock is not changed.</p>
                  </div>
                  <input
                    style={styles.input}
                    type="date"
                    value={shipmentDeliveryDate}
                    onChange={(event) => setShipmentDeliveryDate(event.target.value)}
                    placeholder="Delivery date"
                  />
                  <button
                    type="button"
                    style={styles.primaryButton}
                    disabled={createShipmentMutation.isPending}
                    onClick={() => createShipmentMutation.mutate({
                      id: selectedDetail.id,
                      deliveryDate: shipmentDeliveryDate || selectedDetail.expected_delivery_date || null
                    })}
                  >
                    Create Shipment
                  </button>
                  {createShipmentMutation.error ? <p style={styles.error}>{createShipmentError}</p> : null}
                </div>
              ) : null}

              {selectedCanCancel && capabilities.canCancelPurchaseOrders ? (
                <div style={styles.cancelBox}>
                  <input
                    style={styles.input}
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    placeholder="Cancellation reason optional"
                  />
                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={() => {
                      if (window.confirm('Cancel this purchase order?')) {
                        actionMutation.mutate({ id: selectedDetail.id, action: 'cancel', body: { reason: cancelReason } });
                      }
                    }}
                  >
                    Cancel PO
                  </button>
                </div>
              ) : null}

              {isEditingSelectedDraft ? <p style={styles.muted}>Editing this draft on the left.</p> : null}
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: { display: 'flex', flexDirection: 'column', gap: 20 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)' },
  h2: { margin: 0, fontSize: 24 },
  h3: { margin: '0 0 14px', fontSize: 18 },
  h4: { margin: '0 0 8px', fontSize: 15 },
  muted: { margin: '6px 0 0', color: '#64748b', fontSize: 14 },
  headerRow: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(90px, 1fr))', gap: 10 },
  summaryBox: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 4, color: '#475569' },
  filters: { display: 'grid', gridTemplateColumns: 'minmax(180px, 1.5fr) repeat(3, minmax(160px, 1fr)) auto', gap: 10, marginTop: 18 },
  input: { width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' },
  label: { display: 'block', fontSize: 13, color: '#475569', margin: '12px 0 6px' },
  tableWrap: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e5e7eb', color: '#475569', whiteSpace: 'nowrap' },
  td: { padding: '10px 8px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  clickableRow: { cursor: 'pointer' },
  selectedRow: { cursor: 'pointer', background: '#eff6ff' },
  badge: { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' },
  draftBadge: { background: '#f1f5f9', color: '#334155' },
  submittedBadge: { background: '#fef3c7', color: '#92400e' },
  approvedBadge: { background: '#dcfce7', color: '#166534' },
  cancelledBadge: { background: '#fee2e2', color: '#991b1b' },
  twoColumn: { display: 'grid', gridTemplateColumns: 'minmax(320px, 0.95fr) minmax(360px, 1.05fr)', gap: 20, alignItems: 'start' },
  inlineGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 16 },
  itemBox: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'grid', gap: 10, marginBottom: 10 },
  buttonRow: { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  primaryButton: { border: 0, borderRadius: 10, padding: '10px 14px', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#0f172a', fontWeight: 700, cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', background: '#fff1f2', color: '#be123c', fontWeight: 700, cursor: 'pointer' },
  error: { color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: 10 },
  detailHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  detailGrid: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: '8px 12px', margin: '16px 0', fontSize: 14 },
  notes: { whiteSpace: 'pre-wrap', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, color: '#334155' },
  bridgeBox: { border: '1px solid #dbeafe', borderRadius: 12, padding: 12, display: 'grid', gap: 10, marginTop: 14, background: '#eff6ff' },
  cancelBox: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 14 }
};
