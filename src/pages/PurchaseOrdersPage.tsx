import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiRequest, ApiError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { ProductItem, SupplierItem } from '../types/inventory';

type PurchaseOrderStatus = 'draft' | 'submitted' | 'approved' | 'completed' | 'cancelled' | string;

type TenantAuditRow = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

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
  completed_by_user_name?: string | null;
  completed_at?: string | null;
  completion_type?: 'fully_received' | 'manual_close' | string | null;
  completion_reason?: string | null;
  cancelled_by_user_name?: string | null;
  cancelled_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  item_count?: number | string;
  total_quantity?: number | string;
  estimated_total_cost?: number | string;
  received_estimated_cost?: number | string;
  remaining_estimated_cost?: number | string;
  linked_shipment_count?: number | string;
  open_linked_shipment_count?: number | string;
  total_received_quantity?: number | string;
  remaining_quantity?: number | string;
  receiving_status?: string;
  receiving_percent?: number | string;
  variance_status?: string;
  quantity_variance?: number | string;
  estimated_cost_variance?: number | string;
  delivery_status?: string;
  next_action_status?: string;
  can_create_remaining_shipment?: boolean;
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
  receiving_status?: string;
  receiving_percent?: number | string;
  variance_status?: string;
  quantity_variance?: number | string;
  estimated_cost_variance?: number | string;
  unit_cost?: number | string | null;
  estimated_line_total?: number | string;
  received_estimated_cost?: number | string;
  remaining_estimated_cost?: number | string;
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
  open_linked_shipment_count?: number | string;
  receiving_status?: string;
  receiving_percent?: number | string;
  variance_status?: string;
  quantity_variance?: number | string;
  estimated_cost_variance?: number | string;
  can_create_remaining_shipment?: boolean;
  estimated_total_cost?: number | string;
  received_estimated_cost?: number | string;
  remaining_estimated_cost?: number | string;
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
  copied_total_quantity?: number;
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
  receivingStatus: string;
  varianceStatus: string;
  deliveryStatus: string;
  nextActionStatus: string;
  search: string;
  supplierId: string;
  productId: string;
  expectedFrom: string;
  expectedTo: string;
  createdFrom: string;
  createdTo: string;
  approvedFrom: string;
  approvedTo: string;
  completedFrom: string;
  completedTo: string;
  cancelledFrom: string;
  cancelledTo: string;
};

type SortKey = 'created_desc' | 'created_asc' | 'expected_asc' | 'expected_desc' | 'cost_desc' | 'cost_asc' | 'received_percent_desc' | 'received_percent_asc';

const EMPTY_FILTERS: Filters = {
  status: '',
  receivingStatus: '',
  varianceStatus: '',
  deliveryStatus: '',
  nextActionStatus: '',
  search: '',
  supplierId: '',
  productId: '',
  expectedFrom: '',
  expectedTo: '',
  createdFrom: '',
  createdTo: '',
  approvedFrom: '',
  approvedTo: '',
  completedFrom: '',
  completedTo: '',
  cancelledFrom: '',
  cancelledTo: ''
};



const DATE_FILTER_KEYS: (keyof Filters)[] = [
  'expectedFrom',
  'expectedTo',
  'createdFrom',
  'createdTo',
  'approvedFrom',
  'approvedTo',
  'completedFrom',
  'completedTo',
  'cancelledFrom',
  'cancelledTo'
];

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateDaysFromToday(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateInputValue(date);
}

function clearDateFilters(filters: Filters): Filters {
  return DATE_FILTER_KEYS.reduce((next, key) => ({ ...next, [key]: '' }), filters);
}

const VALID_SORT_KEYS: SortKey[] = [
  'created_desc',
  'created_asc',
  'expected_asc',
  'expected_desc',
  'cost_desc',
  'cost_asc',
  'received_percent_desc',
  'received_percent_asc'
];

function filtersFromSearchParams(searchParams: URLSearchParams): Filters {
  return {
    status: searchParams.get('status') || '',
    receivingStatus: searchParams.get('receiving_status') || '',
    varianceStatus: searchParams.get('variance_status') || '',
    deliveryStatus: searchParams.get('delivery_status') || '',
    nextActionStatus: searchParams.get('next_action_status') || '',
    search: searchParams.get('search') || '',
    supplierId: searchParams.get('supplier_id') || '',
    productId: searchParams.get('product_id') || '',
    expectedFrom: searchParams.get('expected_from') || '',
    expectedTo: searchParams.get('expected_to') || '',
    createdFrom: searchParams.get('created_from') || '',
    createdTo: searchParams.get('created_to') || '',
    approvedFrom: searchParams.get('approved_from') || '',
    approvedTo: searchParams.get('approved_to') || '',
    completedFrom: searchParams.get('completed_from') || '',
    completedTo: searchParams.get('completed_to') || '',
    cancelledFrom: searchParams.get('cancelled_from') || '',
    cancelledTo: searchParams.get('cancelled_to') || ''
  };
}

function sortKeyFromSearchParams(searchParams: URLSearchParams): SortKey {
  const value = searchParams.get('sort') as SortKey | null;
  return value && VALID_SORT_KEYS.includes(value) ? value : 'created_desc';
}

function pageFromSearchParams(searchParams: URLSearchParams): number {
  const value = Number(searchParams.get('page') || '1');
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function pageSizeFromSearchParams(searchParams: URLSearchParams): number {
  const value = Number(searchParams.get('page_size') || '25');
  return [10, 25, 50, 100].includes(value) ? value : 25;
}

function sortLabel(sortKey: SortKey): string {
  if (sortKey === 'created_asc') return 'Oldest first';
  if (sortKey === 'expected_asc') return 'Expected soonest';
  if (sortKey === 'expected_desc') return 'Expected latest';
  if (sortKey === 'cost_desc') return 'Highest value';
  if (sortKey === 'cost_asc') return 'Lowest value';
  if (sortKey === 'received_percent_desc') return 'Most received';
  if (sortKey === 'received_percent_asc') return 'Least received';
  return 'Newest first';
}

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

function auditActorLabel(row: TenantAuditRow): string {
  const actorType = typeof row.metadata?.actor_type === 'string' ? row.metadata.actor_type : null;
  if (actorType === 'support_session') {
    const platformName = typeof row.metadata?.platform_user_name === 'string' ? row.metadata.platform_user_name : '';
    const platformEmail = typeof row.metadata?.platform_user_email === 'string' ? row.metadata.platform_user_email : '';
    return platformName || platformEmail || 'Platform support';
  }

  return row.user_name || row.user_email || row.user_id || 'Tenant user';
}

function auditMetadataSummary(metadata: Record<string, unknown> | null): string {
  if (!metadata) return '-';

  const keys = ['previous_status', 'next_status', 'reason', 'delivery_date', 'copied_item_count', 'copied_total_quantity', 'ordered_quantity', 'received_quantity'];
  const parts = keys
    .filter((key) => metadata[key] != null && metadata[key] !== '')
    .map((key) => `${key}: ${String(metadata[key])}`);

  return parts.length ? parts.join(' | ') : '-';
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



function completionTypeLabel(type?: string | null): string {
  if (type === 'fully_received') return 'Fully received';
  if (type === 'manual_close') return 'Manually closed';
  return '-';
}

function receivingStatusLabel(status: string | null | undefined): string {
  if (status === 'received') return 'Received';
  if (status === 'partially_received') return 'Partial';
  if (status === 'not_started') return 'Not started';
  return 'N/A';
}

function receivingBadgeStyle(status: string | null | undefined): CSSProperties {
  if (status === 'received') return styles.receivedBadge;
  if (status === 'partially_received') return styles.partialReceivedBadge;
  if (status === 'not_started') return styles.notStartedBadge;
  return styles.naBadge;
}

function varianceStatusLabel(status: string | null | undefined): string {
  if (status === 'matched') return 'Matched';
  if (status === 'pending_receipt') return 'Pending receipt';
  if (status === 'open_short') return 'Open short';
  if (status === 'closed_short') return 'Closed short';
  if (status === 'partial_short') return 'Partial short';
  if (status === 'not_received') return 'Not received';
  if (status === 'over_received') return 'Over received';
  return 'N/A';
}

function varianceBadgeStyle(status: string | null | undefined): CSSProperties {
  if (status === 'matched') return styles.receivedBadge;
  if (status === 'pending_receipt' || status === 'partial_short') return styles.partialReceivedBadge;
  if (status === 'open_short' || status === 'closed_short' || status === 'not_received') return styles.overdueBadge;
  if (status === 'over_received') return styles.dueTodayBadge;
  return styles.naBadge;
}

function deliveryStatusLabel(status: string | null | undefined): string {
  if (status === 'overdue') return 'Overdue';
  if (status === 'due_today') return 'Due today';
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'fulfilled') return 'Fulfilled';
  if (status === 'cancelled') return 'Cancelled';
  return 'No date';
}

function deliveryBadgeStyle(status: string | null | undefined): CSSProperties {
  if (status === 'overdue') return styles.overdueBadge;
  if (status === 'due_today') return styles.dueTodayBadge;
  if (status === 'upcoming') return styles.upcomingBadge;
  if (status === 'fulfilled') return styles.receivedBadge;
  if (status === 'cancelled') return styles.cancelledBadge;
  return styles.naBadge;
}


function nextActionLabel(status: string | null | undefined): string {
  if (status === 'submit_for_approval') return 'Submit for approval';
  if (status === 'approve_or_cancel') return 'Approve or cancel';
  if (status === 'create_shipment') return 'Create shipment';
  if (status === 'receive_open_shipment') return 'Receive shipment';
  if (status === 'follow_up_overdue') return 'Follow up overdue';
  if (status === 'monitor_receiving') return 'Monitor receiving';
  if (status === 'none_completed') return 'Completed';
  if (status === 'none_cancelled') return 'Cancelled';
  return 'No action';
}

function nextActionBadgeStyle(status: string | null | undefined): CSSProperties {
  if (status === 'follow_up_overdue') return styles.overdueBadge;
  if (status === 'create_shipment') return styles.approvedBadge;
  if (status === 'receive_open_shipment') return styles.partialReceivedBadge;
  if (status === 'submit_for_approval' || status === 'approve_or_cancel') return styles.notStartedBadge;
  if (status === 'none_completed') return styles.completedBadge;
  if (status === 'none_cancelled') return styles.cancelledBadge;
  return styles.naBadge;
}

function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0%';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return `${parsed.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}



function escapeCsvCell(value: unknown): string {
  const raw = value === null || value === undefined ? '' : String(value);
  const escaped = raw.replace(/"/g, '""');
  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}


function escapeHtml(value: unknown): string {
  return (value === null || value === undefined ? '' : String(value))
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function downloadCsv(filename: string, rows: unknown[][]): void {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function isPurchaseOrderEditable(status: PurchaseOrderStatus | null | undefined): boolean {
  return status === 'draft';
}

function isPurchaseOrderLocked(status: PurchaseOrderStatus | null | undefined): boolean {
  return Boolean(status && !isPurchaseOrderEditable(status));
}

function sortPurchaseOrders(rows: PurchaseOrderListItem[], sortKey: SortKey): PurchaseOrderListItem[] {
  const dateValue = (value: string | null | undefined, emptyFallback: number) => {
    if (!value) return emptyFallback;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : emptyFallback;
  };

  return [...rows].sort((a, b) => {
    if (sortKey === 'created_asc') return dateValue(a.created_at, 0) - dateValue(b.created_at, 0);
    if (sortKey === 'expected_asc') return dateValue(a.expected_delivery_date, Number.MAX_SAFE_INTEGER) - dateValue(b.expected_delivery_date, Number.MAX_SAFE_INTEGER);
    if (sortKey === 'expected_desc') return dateValue(b.expected_delivery_date, 0) - dateValue(a.expected_delivery_date, 0);
    if (sortKey === 'cost_desc') return Number(b.estimated_total_cost || 0) - Number(a.estimated_total_cost || 0);
    if (sortKey === 'cost_asc') return Number(a.estimated_total_cost || 0) - Number(b.estimated_total_cost || 0);
    if (sortKey === 'received_percent_desc') return Number(b.receiving_percent || 0) - Number(a.receiving_percent || 0);
    if (sortKey === 'received_percent_asc') return Number(a.receiving_percent || 0) - Number(b.receiving_percent || 0);
    return dateValue(b.created_at, 0) - dateValue(a.created_at, 0);
  });
}


type PurchaseOrderAggregate = {
  count: number;
  itemCount: number;
  orderedQuantity: number;
  receivedQuantity: number;
  remainingQuantity: number;
  linkedShipmentCount: number;
  openLinkedShipmentCount: number;
  estimatedTotalCost: number;
  receivedEstimatedCost: number;
  remainingEstimatedCost: number;
};

function aggregatePurchaseOrders(rows: PurchaseOrderListItem[]): PurchaseOrderAggregate {
  return rows.reduce<PurchaseOrderAggregate>((totals, row) => ({
    count: totals.count + 1,
    itemCount: totals.itemCount + Number(row.item_count || 0),
    orderedQuantity: totals.orderedQuantity + Number(row.total_quantity || 0),
    receivedQuantity: totals.receivedQuantity + Number(row.total_received_quantity || 0),
    remainingQuantity: totals.remainingQuantity + Number(row.remaining_quantity || 0),
    linkedShipmentCount: totals.linkedShipmentCount + Number(row.linked_shipment_count || 0),
    openLinkedShipmentCount: totals.openLinkedShipmentCount + Number(row.open_linked_shipment_count || 0),
    estimatedTotalCost: totals.estimatedTotalCost + Number(row.estimated_total_cost || 0),
    receivedEstimatedCost: totals.receivedEstimatedCost + Number(row.received_estimated_cost || 0),
    remainingEstimatedCost: totals.remainingEstimatedCost + Number(row.remaining_estimated_cost || 0)
  }), {
    count: 0,
    itemCount: 0,
    orderedQuantity: 0,
    receivedQuantity: 0,
    remainingQuantity: 0,
    linkedShipmentCount: 0,
    openLinkedShipmentCount: 0,
    estimatedTotalCost: 0,
    receivedEstimatedCost: 0,
    remainingEstimatedCost: 0
  });
}



type PurchaseOrderBreakdowns = {
  statuses: Record<string, number>;
  receivingStatuses: Record<string, number>;
  deliveryStatuses: Record<string, number>;
  nextActions: Record<string, number>;
  varianceStatuses: Record<string, number>;
};

function incrementBreakdown(target: Record<string, number>, key: string | null | undefined): void {
  const normalized = key || 'none';
  target[normalized] = (target[normalized] || 0) + 1;
}

function buildPurchaseOrderBreakdowns(rows: PurchaseOrderListItem[]): PurchaseOrderBreakdowns {
  return rows.reduce<PurchaseOrderBreakdowns>((breakdowns, row) => {
    incrementBreakdown(breakdowns.statuses, row.status);
    incrementBreakdown(breakdowns.receivingStatuses, row.receiving_status || 'not_applicable');
    incrementBreakdown(breakdowns.deliveryStatuses, row.delivery_status || 'no_date');
    incrementBreakdown(breakdowns.varianceStatuses, row.variance_status || 'not_applicable');
    incrementBreakdown(breakdowns.nextActions, row.next_action_status || 'none');
    return breakdowns;
  }, {
    statuses: {},
    receivingStatuses: {},
    deliveryStatuses: {},
    varianceStatuses: {},
    nextActions: {}
  });
}

function badgeStyle(status: PurchaseOrderStatus): CSSProperties {
  if (status === 'approved') return styles.approvedBadge;
  if (status === 'submitted') return styles.submittedBadge;
  if (status === 'completed') return styles.completedBadge;
  if (status === 'cancelled') return styles.cancelledBadge;
  return styles.draftBadge;
}

async function fetchPurchaseOrders(filters: Filters): Promise<PurchaseOrderListItem[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.receivingStatus) params.set('receiving_status', filters.receivingStatus);
  if (filters.varianceStatus) params.set('variance_status', filters.varianceStatus);
  if (filters.deliveryStatus) params.set('delivery_status', filters.deliveryStatus);
  if (filters.nextActionStatus) params.set('next_action_status', filters.nextActionStatus);
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.supplierId) params.set('supplier_id', filters.supplierId);
  if (filters.productId) params.set('product_id', filters.productId);
  if (filters.expectedFrom) params.set('expected_from', filters.expectedFrom);
  if (filters.expectedTo) params.set('expected_to', filters.expectedTo);
  if (filters.createdFrom) params.set('created_from', filters.createdFrom);
  if (filters.createdTo) params.set('created_to', filters.createdTo);
  if (filters.approvedFrom) params.set('approved_from', filters.approvedFrom);
  if (filters.approvedTo) params.set('approved_to', filters.approvedTo);
  if (filters.completedFrom) params.set('completed_from', filters.completedFrom);
  if (filters.completedTo) params.set('completed_to', filters.completedTo);
  if (filters.cancelledFrom) params.set('cancelled_from', filters.cancelledFrom);
  if (filters.cancelledTo) params.set('cancelled_to', filters.cancelledTo);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<PurchaseOrderListItem[]>(`/purchase-orders${suffix}`);
}

async function fetchPurchaseOrder(id: string): Promise<PurchaseOrderDetail> {
  return apiRequest<PurchaseOrderDetail>(`/purchase-orders/${id}`);
}

async function fetchPurchaseOrderAudit(id: string): Promise<TenantAuditRow[]> {
  const params = new URLSearchParams({
    entity_type: 'purchase_order',
    entity_id: id,
    limit: '50'
  });

  return apiRequest<TenantAuditRow[]>(`/audit?${params.toString()}`);
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

async function lifecycleAction(id: string, action: 'submit' | 'approve' | 'cancel' | 'close' | 'reopen', body?: unknown): Promise<PurchaseOrderDetail> {
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
  const [searchParams, setSearchParams] = useSearchParams();
  const capabilities = getRoleCapabilities();

  const [filters, setFilters] = useState<Filters>(() => filtersFromSearchParams(searchParams));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<PurchaseOrderFormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [shipmentDeliveryDate, setShipmentDeliveryDate] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(() => sortKeyFromSearchParams(searchParams));
  const [currentPage, setCurrentPage] = useState<number>(() => pageFromSearchParams(searchParams));
  const [pageSize, setPageSize] = useState<number>(() => pageSizeFromSearchParams(searchParams));
  const [auditSearch, setAuditSearch] = useState('');

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: () => fetchPurchaseOrders(filters)
  });

  const detailQuery = useQuery({
    queryKey: ['purchase-order', selectedId],
    queryFn: () => fetchPurchaseOrder(selectedId as string),
    enabled: Boolean(selectedId)
  });

  const auditQuery = useQuery({
    queryKey: ['purchase-order', 'audit', selectedId],
    queryFn: () => fetchPurchaseOrderAudit(selectedId as string),
    enabled: Boolean(selectedId && capabilities.canViewAudit),
    retry: false
  });

  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: fetchProducts });

  const selectedDetail = detailQuery.data ?? null;
  const selectedLifecycleEvents = useMemo(() => {
    if (!selectedDetail) return [];

    return [
      { label: 'Created', value: selectedDetail.created_at, actor: selectedDetail.created_by_user_name },
      { label: 'Submitted', value: selectedDetail.submitted_at, actor: selectedDetail.submitted_by_user_name },
      { label: 'Approved', value: selectedDetail.approved_at, actor: selectedDetail.approved_by_user_name },
      { label: 'Completed', value: selectedDetail.completed_at, actor: selectedDetail.completed_by_user_name },
      { label: 'Cancelled', value: selectedDetail.cancelled_at, actor: selectedDetail.cancelled_by_user_name }
    ].filter((event) => Boolean(event.value));
  }, [selectedDetail]);
  const selectedAuditEvents = useMemo(() => {
    const rows = auditQuery.data || [];
    const term = auditSearch.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((event) => {
      const haystack = [
        event.action,
        event.entity_type,
        event.entity_id || '',
        auditActorLabel(event),
        auditMetadataSummary(event.metadata),
        event.created_at
      ].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [auditQuery.data, auditSearch]);

  const isEditingSelectedDraft = Boolean(editingId && selectedDetail?.status === 'draft');

  const displayedPurchaseOrders = useMemo(() => sortPurchaseOrders(purchaseOrdersQuery.data || [], sortKey), [purchaseOrdersQuery.data, sortKey]);
  const totalPages = Math.max(1, Math.ceil(displayedPurchaseOrders.length / pageSize));
  const paginatedPurchaseOrders = useMemo(() => {
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (safePage - 1) * pageSize;
    return displayedPurchaseOrders.slice(start, start + pageSize);
  }, [currentPage, displayedPurchaseOrders, pageSize, totalPages]);
  const filteredTotals = useMemo(() => aggregatePurchaseOrders(displayedPurchaseOrders), [displayedPurchaseOrders]);
  const pageTotals = useMemo(() => aggregatePurchaseOrders(paginatedPurchaseOrders), [paginatedPurchaseOrders]);
  const filteredBreakdowns = useMemo(() => buildPurchaseOrderBreakdowns(displayedPurchaseOrders), [displayedPurchaseOrders]);

  const summary = useMemo(() => {
    const rows = purchaseOrdersQuery.data || [];
    return {
      count: rows.length,
      draft: rows.filter((row) => row.status === 'draft').length,
      submitted: rows.filter((row) => row.status === 'submitted').length,
      approved: rows.filter((row) => row.status === 'approved').length,
      completed: rows.filter((row) => row.status === 'completed').length,
      estimatedTotal: rows.reduce((sum, row) => sum + Number(row.estimated_total_cost || 0), 0),
      overdue: rows.filter((row) => row.delivery_status === 'overdue').length,
      dueToday: rows.filter((row) => row.delivery_status === 'due_today').length,
      openReceiving: rows.filter((row) => row.next_action_status === 'receive_open_shipment').length,
      awaitingApproval: rows.filter((row) => row.next_action_status === 'approve_or_cancel').length,
      needsAction: rows.filter((row) => !['none', 'none_completed', 'none_cancelled'].includes(row.next_action_status || 'none')).length
    };
  }, [purchaseOrdersQuery.data]);

  const attentionPurchaseOrders = useMemo(() => {
    const priority: Record<string, number> = {
      follow_up_overdue: 1,
      receive_open_shipment: 2,
      approve_or_cancel: 3,
      create_shipment: 4,
      monitor_receiving: 5,
      submit_for_approval: 6
    };

    return (purchaseOrdersQuery.data || [])
      .filter((row) => !['none', 'none_completed', 'none_cancelled'].includes(row.next_action_status || 'none'))
      .sort((a, b) => {
        const actionDiff = (priority[a.next_action_status || ''] || 99) - (priority[b.next_action_status || ''] || 99);
        if (actionDiff !== 0) return actionDiff;
        return String(a.expected_delivery_date || '').localeCompare(String(b.expected_delivery_date || ''));
      })
      .slice(0, 5);
  }, [purchaseOrdersQuery.data]);

  const activeFilterChips = useMemo(() => {
    const chips: { key: keyof Filters; label: string }[] = [];
    const suppliers = suppliersQuery.data || [];
    const products = productsQuery.data || [];

    if (filters.search.trim()) chips.push({ key: 'search', label: `Search: ${filters.search.trim()}` });
    if (filters.status) chips.push({ key: 'status', label: `Status: ${filters.status}` });
    if (filters.receivingStatus) chips.push({ key: 'receivingStatus', label: `Receiving: ${receivingStatusLabel(filters.receivingStatus)}` });
    if (filters.varianceStatus) chips.push({ key: 'varianceStatus', label: `Variance: ${varianceStatusLabel(filters.varianceStatus)}` });
    if (filters.deliveryStatus) chips.push({ key: 'deliveryStatus', label: `Delivery: ${deliveryStatusLabel(filters.deliveryStatus)}` });
    if (filters.nextActionStatus) chips.push({ key: 'nextActionStatus', label: `Next: ${nextActionLabel(filters.nextActionStatus)}` });
    if (filters.supplierId) {
      chips.push({ key: 'supplierId', label: `Supplier: ${suppliers.find((supplier) => supplier.id === filters.supplierId)?.name || filters.supplierId}` });
    }
    if (filters.productId) {
      chips.push({ key: 'productId', label: `Product: ${products.find((product) => product.id === filters.productId)?.name || filters.productId}` });
    }
    if (filters.expectedFrom) chips.push({ key: 'expectedFrom', label: `Expected from: ${formatDate(filters.expectedFrom)}` });
    if (filters.expectedTo) chips.push({ key: 'expectedTo', label: `Expected to: ${formatDate(filters.expectedTo)}` });
    if (filters.createdFrom) chips.push({ key: 'createdFrom', label: `Created from: ${formatDate(filters.createdFrom)}` });
    if (filters.createdTo) chips.push({ key: 'createdTo', label: `Created to: ${formatDate(filters.createdTo)}` });
    if (filters.approvedFrom) chips.push({ key: 'approvedFrom', label: `Approved from: ${formatDate(filters.approvedFrom)}` });
    if (filters.approvedTo) chips.push({ key: 'approvedTo', label: `Approved to: ${formatDate(filters.approvedTo)}` });
    if (filters.completedFrom) chips.push({ key: 'completedFrom', label: `Completed from: ${formatDate(filters.completedFrom)}` });
    if (filters.completedTo) chips.push({ key: 'completedTo', label: `Completed to: ${formatDate(filters.completedTo)}` });
    if (filters.cancelledFrom) chips.push({ key: 'cancelledFrom', label: `Cancelled from: ${formatDate(filters.cancelledFrom)}` });
    if (filters.cancelledTo) chips.push({ key: 'cancelledTo', label: `Cancelled to: ${formatDate(filters.cancelledTo)}` });

    return chips;
  }, [filters, suppliersQuery.data, productsQuery.data]);


  const applyDatePreset = (preset: 'expected_today' | 'expected_next_7' | 'created_last_7' | 'created_last_30' | 'approved_last_30' | 'completed_last_30' | 'cancelled_last_30') => {
    setFilters((current) => {
      const next = clearDateFilters(current);

      if (preset === 'expected_today') {
        const today = dateDaysFromToday(0);
        return { ...next, expectedFrom: today, expectedTo: today };
      }

      if (preset === 'expected_next_7') {
        return { ...next, expectedFrom: dateDaysFromToday(0), expectedTo: dateDaysFromToday(7) };
      }

      if (preset === 'created_last_7') {
        return { ...next, createdFrom: dateDaysFromToday(-7), createdTo: dateDaysFromToday(0) };
      }

      if (preset === 'created_last_30') {
        return { ...next, createdFrom: dateDaysFromToday(-30), createdTo: dateDaysFromToday(0) };
      }

      if (preset === 'approved_last_30') {
        return { ...next, approvedFrom: dateDaysFromToday(-30), approvedTo: dateDaysFromToday(0) };
      }

      if (preset === 'completed_last_30') {
        return { ...next, completedFrom: dateDaysFromToday(-30), completedTo: dateDaysFromToday(0) };
      }

      return { ...next, cancelledFrom: dateDaysFromToday(-30), cancelledTo: dateDaysFromToday(0) };
    });
  };

  const clearOnlyDateFilters = () => {
    setFilters((current) => clearDateFilters(current));
  };

  const resetForm = () => {
    setForm(emptyForm());
    setEditingId(null);
    setFormError(null);
  };

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (selectedId) nextParams.set('purchaseOrderId', selectedId);
    if (filters.status) nextParams.set('status', filters.status);
    if (filters.receivingStatus) nextParams.set('receiving_status', filters.receivingStatus);
    if (filters.varianceStatus) nextParams.set('variance_status', filters.varianceStatus);
    if (filters.deliveryStatus) nextParams.set('delivery_status', filters.deliveryStatus);
    if (filters.nextActionStatus) nextParams.set('next_action_status', filters.nextActionStatus);
    if (filters.search.trim()) nextParams.set('search', filters.search.trim());
    if (filters.supplierId) nextParams.set('supplier_id', filters.supplierId);
    if (filters.productId) nextParams.set('product_id', filters.productId);
    if (filters.expectedFrom) nextParams.set('expected_from', filters.expectedFrom);
    if (filters.expectedTo) nextParams.set('expected_to', filters.expectedTo);
    if (filters.createdFrom) nextParams.set('created_from', filters.createdFrom);
    if (filters.createdTo) nextParams.set('created_to', filters.createdTo);
    if (filters.approvedFrom) nextParams.set('approved_from', filters.approvedFrom);
    if (filters.approvedTo) nextParams.set('approved_to', filters.approvedTo);
    if (filters.completedFrom) nextParams.set('completed_from', filters.completedFrom);
    if (filters.completedTo) nextParams.set('completed_to', filters.completedTo);
    if (filters.cancelledFrom) nextParams.set('cancelled_from', filters.cancelledFrom);
    if (filters.cancelledTo) nextParams.set('cancelled_to', filters.cancelledTo);
    if (sortKey !== 'created_desc') nextParams.set('sort', sortKey);
    if (pageSize !== 25) nextParams.set('page_size', String(pageSize));
    if (currentPage > 1) nextParams.set('page', String(currentPage));

    const current = searchParams.toString();
    const next = nextParams.toString();
    if (current !== next) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [currentPage, filters, pageSize, selectedId, setSearchParams, searchParams, sortKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortKey, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const purchaseOrderIdFromQuery = searchParams.get('purchaseOrderId');

    if (!purchaseOrderIdFromQuery) {
      return;
    }

    if (selectedId === purchaseOrderIdFromQuery) {
      return;
    }

    setSelectedId(purchaseOrderIdFromQuery);
    setEditingId(null);
    setFormError(null);
  }, [searchParams, selectedId]);

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
    mutationFn: ({ id, action, body }: { id: string; action: 'submit' | 'approve' | 'cancel' | 'close' | 'reopen'; body?: unknown }) =>
      lifecycleAction(id, action, body),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-order', updated.id] });
      setSelectedId(updated.id);
      setCancelReason('');
      setCloseReason('');
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

  const buildPurchaseOrdersCsvRows = (rowsToExport: PurchaseOrderListItem[]): unknown[][] => [
    [
      'PO Number',
      'Supplier',
      'Status',
      'Receiving Status',
      'Receiving Percent',
      'Variance Status',
      'Quantity Variance',
      'Estimated Cost Variance',
      'Next Action',
      'Expected Delivery',
      'Items',
      'Ordered Quantity',
      'Received Quantity',
      'Remaining Quantity',
      'Linked Shipments',
      'Open Shipments',
      'Estimated Cost',
      'Received Value',
      'Remaining Value',
      'Created At',
      'Created By',
      'Submitted At',
      'Submitted By',
      'Approved At',
      'Approved By',
      'Completed At',
      'Completed By',
      'Completion Type',
      'Completion Reason',
      'Cancelled At',
      'Cancelled By',
      'Notes'
    ],
    ...rowsToExport.map((row) => [
      row.po_number,
      row.supplier_name,
      row.status,
      receivingStatusLabel(row.receiving_status),
      formatPercent(row.receiving_percent),
      varianceStatusLabel(row.variance_status),
      row.quantity_variance ?? '',
      row.estimated_cost_variance ?? '',
      nextActionLabel(row.next_action_status),
      row.expected_delivery_date ?? '',
      row.item_count ?? '',
      row.total_quantity ?? '',
      row.total_received_quantity ?? '',
      row.remaining_quantity ?? '',
      row.linked_shipment_count ?? '',
      row.open_linked_shipment_count ?? '',
      row.estimated_total_cost ?? '',
      row.received_estimated_cost ?? '',
      row.remaining_estimated_cost ?? '',
      row.created_at,
      row.created_by_user_name ?? '',
      row.submitted_at ?? '',
      row.submitted_by_user_name ?? '',
      row.approved_at ?? '',
      row.approved_by_user_name ?? '',
      row.completed_at ?? '',
      row.completed_by_user_name ?? '',
      completionTypeLabel(row.completion_type),
      row.completion_reason ?? '',
      row.cancelled_at ?? '',
      row.cancelled_by_user_name ?? '',
      row.notes ?? ''
    ])
  ];

  const exportVisiblePurchaseOrdersCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`purchase-orders-${stamp}.csv`, buildPurchaseOrdersCsvRows(displayedPurchaseOrders));
  };

  const exportCurrentPagePurchaseOrdersCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`purchase-orders-page-${currentPage}-${stamp}.csv`, buildPurchaseOrdersCsvRows(paginatedPurchaseOrders));
  };

  const exportSelectedPurchaseOrderAuditCsv = () => {
    if (!selectedDetail) return;

    const rows = selectedAuditEvents;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`purchase-order-${selectedDetail.po_number || selectedDetail.id}-audit-${stamp}.csv`, [
      ['Created At', 'Action', 'Actor', 'Entity Type', 'Entity ID', 'Metadata Summary'],
      ...rows.map((event) => [
        event.created_at,
        event.action,
        auditActorLabel(event),
        event.entity_type,
        event.entity_id ?? '',
        auditMetadataSummary(event.metadata)
      ])
    ]);
  };

  const printSelectedPurchaseOrderAudit = () => {
    if (!selectedDetail) return;

    const rows = selectedAuditEvents;
    if (!rows.length) return;

    const auditRows = rows.map((event) => `
      <tr>
        <td>${escapeHtml(formatDateTime(event.created_at))}</td>
        <td>${escapeHtml(event.action)}</td>
        <td>${escapeHtml(auditActorLabel(event))}</td>
        <td>${escapeHtml(event.entity_type)}</td>
        <td>${escapeHtml(event.entity_id || '-')}</td>
        <td>${escapeHtml(auditMetadataSummary(event.metadata))}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=750');
    if (!printWindow) {
      setFormError('Browser blocked the print window. Allow pop-ups for this site and try again.');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Purchase Order Audit ${escapeHtml(selectedDetail.po_number)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
            h1 { margin-bottom: 4px; }
            .meta { color: #475569; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px; font-size: 12px; vertical-align: top; }
            th { color: #475569; }
            .metadata { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; word-break: break-word; }
            @media print { button { display: none; } body { margin: 18px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print</button>
          <h1>Purchase Order Audit Events</h1>
          <p class="meta"><strong>PO Number:</strong> ${escapeHtml(selectedDetail.po_number)}</p>
          <p class="meta"><strong>Supplier:</strong> ${escapeHtml(selectedDetail.supplier_name)}</p>
          <p class="meta"><strong>Status:</strong> ${escapeHtml(selectedDetail.status)}</p>
          <p class="meta"><strong>Events:</strong> ${escapeHtml(rows.length)}${auditSearch.trim() ? ` filtered by &quot;${escapeHtml(auditSearch.trim())}&quot;` : ''}</p>
          <table>
            <thead>
              <tr>
                <th>Created At</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>${auditRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const exportSelectedPurchaseOrderCsv = () => {
    if (!selectedDetail) return;

    const summaryRows: unknown[][] = [
      ['PO Number', selectedDetail.po_number],
      ['Supplier', selectedDetail.supplier_name],
      ['Status', selectedDetail.status],
      ['Receiving Status', receivingStatusLabel(selectedDetail.receiving_summary?.receiving_status)],
      ['Receiving Percent', formatPercent(selectedDetail.receiving_summary?.receiving_percent)],
      ['Variance Status', varianceStatusLabel(selectedDetail.receiving_summary?.variance_status)],
      ['Quantity Variance', selectedDetail.receiving_summary?.quantity_variance ?? ''],
      ['Estimated Cost Variance', selectedDetail.receiving_summary?.estimated_cost_variance ?? ''],
      ['Delivery Status', deliveryStatusLabel(selectedDetail.delivery_status)],
      ['Next Action', nextActionLabel(selectedDetail.next_action_status)],
      ['Expected Delivery', selectedDetail.expected_delivery_date ?? ''],
      ['Ordered Quantity', selectedDetail.receiving_summary?.ordered_quantity ?? ''],
      ['Received Quantity', selectedDetail.receiving_summary?.received_quantity ?? ''],
      ['Remaining Quantity', selectedDetail.receiving_summary?.remaining_quantity ?? ''],
      ['Linked Shipments', selectedDetail.receiving_summary?.linked_shipment_count ?? ''],
      ['Open Shipments', selectedDetail.receiving_summary?.open_linked_shipment_count ?? ''],
      ['Estimated Cost', selectedDetail.estimated_total_cost ?? ''],
      ['Received Value', selectedDetail.received_estimated_cost ?? ''],
      ['Remaining Value', selectedDetail.remaining_estimated_cost ?? ''],
      ['Created At', selectedDetail.created_at],
      ['Created By', selectedDetail.created_by_user_name ?? ''],
      ['Submitted At', selectedDetail.submitted_at ?? ''],
      ['Submitted By', selectedDetail.submitted_by_user_name ?? ''],
      ['Approved At', selectedDetail.approved_at ?? ''],
      ['Approved By', selectedDetail.approved_by_user_name ?? ''],
      ['Completed At', selectedDetail.completed_at ?? ''],
      ['Completed By', selectedDetail.completed_by_user_name ?? ''],
      ['Completion Type', completionTypeLabel(selectedDetail.completion_type)],
      ['Completion Reason', selectedDetail.completion_reason ?? ''],
      ['Cancelled At', selectedDetail.cancelled_at ?? ''],
      ['Cancelled By', selectedDetail.cancelled_by_user_name ?? ''],
      ['Notes', selectedDetail.notes ?? ''],
      [],
      ['Items'],
      ['Product', 'Unit', 'Quantity', 'Received', 'Remaining', 'Receiving Status', 'Receiving Percent', 'Variance Status', 'Quantity Variance', 'Estimated Cost Variance', 'Unit Cost', 'Estimated Total', 'Received Value', 'Remaining Value', 'Notes'],
      ...selectedDetail.items.map((item) => [
        item.product_name,
        item.product_unit,
        item.quantity,
        item.received_quantity ?? '',
        item.remaining_quantity ?? '',
        receivingStatusLabel(item.receiving_status),
        formatPercent(item.receiving_percent),
        varianceStatusLabel(item.variance_status),
        item.quantity_variance ?? '',
        item.estimated_cost_variance ?? '',
        item.unit_cost ?? '',
        item.estimated_line_total ?? '',
        item.received_estimated_cost ?? '',
        item.remaining_estimated_cost ?? '',
        item.notes ?? ''
      ])
    ];

    const shipmentRows: unknown[][] = (selectedDetail.linked_shipments || []).length
      ? [
          [],
          ['Linked Shipments'],
          ['Shipment', 'Status', 'Delivery Date', 'Item Count', 'Ordered Quantity', 'Received Quantity', 'Created At'],
          ...(selectedDetail.linked_shipments || []).map((shipment) => [
            shipment.po_number || shipment.qr_code || shipment.id,
            shipment.status,
            shipment.delivery_date ?? '',
            shipment.item_count ?? '',
            shipment.ordered_quantity ?? '',
            shipment.received_quantity ?? '',
            shipment.created_at ?? ''
          ])
        ]
      : [];

    downloadCsv(`purchase-order-${selectedDetail.po_number || selectedDetail.id}.csv`, [...summaryRows, ...shipmentRows]);
  };

  const printPurchaseOrderList = (rowsToPrint: PurchaseOrderListItem[], scopeLabel: string) => {
    if (!rowsToPrint.length) return;

    const filterSummary = activeFilterChips.length
      ? activeFilterChips.map((chip) => chip.label).join(' • ')
      : 'None';

    const rows = rowsToPrint.map((row) => `
      <tr>
        <td>${escapeHtml(row.po_number)}</td>
        <td>${escapeHtml(row.supplier_name)}</td>
        <td>${escapeHtml(row.status)}</td>
        <td>${escapeHtml(formatDate(row.expected_delivery_date))}</td>
        <td>${escapeHtml(deliveryStatusLabel(row.delivery_status))}</td>
        <td>${escapeHtml(nextActionLabel(row.next_action_status))}</td>
        <td>${escapeHtml(receivingStatusLabel(row.receiving_status))} (${escapeHtml(formatPercent(row.receiving_percent))})</td>
        <td>${escapeHtml(formatNumber(row.total_received_quantity))} / ${escapeHtml(formatNumber(row.total_quantity))}</td>
        <td>${escapeHtml(formatNumber(row.linked_shipment_count))} total / ${escapeHtml(formatNumber(row.open_linked_shipment_count))} open</td>
        <td>${escapeHtml(formatMoney(row.estimated_total_cost))}</td>
        <td>${escapeHtml(formatDateTime(row.created_at))}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=750');
    if (!printWindow) {
      setFormError('Browser blocked the print window. Allow pop-ups for this site and try again.');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Purchase Orders - ${escapeHtml(scopeLabel)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
            h1 { margin-bottom: 4px; }
            .meta { color: #475569; margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px; font-size: 12px; vertical-align: top; }
            th { color: #475569; }
            @media print { button { display: none; } body { margin: 18px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print</button>
          <h1>Purchase Orders</h1>
          <p class="meta"><strong>Scope:</strong> ${escapeHtml(scopeLabel)}</p>
          <p class="meta"><strong>Rows:</strong> ${escapeHtml(rowsToPrint.length)}</p>
          <p class="meta"><strong>Sort:</strong> ${escapeHtml(sortLabel(sortKey))}</p>
          <p class="meta"><strong>Filters:</strong> ${escapeHtml(filterSummary)}</p>
          <table>
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Expected</th>
                <th>Delivery</th>
                <th>Next Action</th>
                <th>Receiving</th>
                <th>Received</th>
                <th>Shipments</th>
                <th>Estimated Cost</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const printSelectedPurchaseOrderDetail = () => {
    if (!selectedDetail) return;

    const itemRows = selectedDetail.items.map((item) => `
      <tr>
        <td>${escapeHtml(item.product_name)}</td>
        <td>${escapeHtml(formatNumber(item.quantity))} ${escapeHtml(item.product_unit)}</td>
        <td>${escapeHtml(formatNumber(item.received_quantity))} ${escapeHtml(item.product_unit)}</td>
        <td>${escapeHtml(formatNumber(item.remaining_quantity))} ${escapeHtml(item.product_unit)}</td>
        <td>${escapeHtml(receivingStatusLabel(item.receiving_status))} (${escapeHtml(formatPercent(item.receiving_percent))})</td>
        <td>${escapeHtml(formatMoney(item.unit_cost))}</td>
        <td>${escapeHtml(formatMoney(item.estimated_line_total))}</td>
        <td>${escapeHtml(formatMoney(item.received_estimated_cost))}</td>
        <td>${escapeHtml(formatMoney(item.remaining_estimated_cost))}</td>
      </tr>
    `).join('');

    const shipmentRows = (selectedDetail.linked_shipments || []).length
      ? (selectedDetail.linked_shipments || []).map((shipment) => `
          <tr>
            <td>${escapeHtml(shipment.po_number || shipment.qr_code || shipment.id)}</td>
            <td>${escapeHtml(shipment.status)}</td>
            <td>${escapeHtml(formatDate(shipment.delivery_date))}</td>
            <td>${escapeHtml(formatNumber(shipment.received_quantity))} / ${escapeHtml(formatNumber(shipment.ordered_quantity))}</td>
            <td>${escapeHtml(formatDateTime(shipment.created_at))}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="5">No linked shipments.</td></tr>';

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=750');
    if (!printWindow) {
      setFormError('Browser blocked the print window. Allow pop-ups for this site and try again.');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Purchase Order ${escapeHtml(selectedDetail.po_number)}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
            h1 { margin-bottom: 4px; }
            h2 { margin: 24px 0 8px; }
            .meta { color: #475569; margin: 4px 0; }
            .badge { display: inline-block; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 999px; font-size: 12px; font-weight: 700; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 24px; margin-top: 16px; }
            .label { color: #475569; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border-bottom: 1px solid #e5e7eb; text-align: left; padding: 8px; font-size: 13px; vertical-align: top; }
            th { color: #475569; }
            .notes { margin-top: 12px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap; }
            @media print { button { display: none; } body { margin: 20px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print</button>
          <h1>Purchase Order</h1>
          <div class="badge">${escapeHtml(selectedDetail.status.toUpperCase())}</div>
          <p class="meta"><strong>PO Number:</strong> ${escapeHtml(selectedDetail.po_number)}</p>
          <p class="meta"><strong>Supplier:</strong> ${escapeHtml(selectedDetail.supplier_name)}</p>
          <p class="meta"><strong>Expected delivery:</strong> ${escapeHtml(formatDate(selectedDetail.expected_delivery_date))}</p>

          <div class="grid">
            <div><span class="label">Receiving status:</span> ${escapeHtml(receivingStatusLabel(selectedDetail.receiving_summary?.receiving_status))}</div>
            <div><span class="label">Delivery status:</span> ${escapeHtml(deliveryStatusLabel(selectedDetail.delivery_status))}</div>
            <div><span class="label">Next action:</span> ${escapeHtml(nextActionLabel(selectedDetail.next_action_status))}</div>
            <div><span class="label">Received:</span> ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.received_quantity))} / ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.ordered_quantity))} (${escapeHtml(formatPercent(selectedDetail.receiving_summary?.receiving_percent))})</div>
            <div><span class="label">Remaining:</span> ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.remaining_quantity))}</div>
            <div><span class="label">Linked shipments:</span> ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.linked_shipment_count))} total / ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.open_linked_shipment_count))} open</div>
            <div><span class="label">Estimated cost:</span> ${escapeHtml(formatMoney(selectedDetail.estimated_total_cost))}</div>
            <div><span class="label">Received value:</span> ${escapeHtml(formatMoney(selectedDetail.receiving_summary?.received_estimated_cost ?? selectedDetail.received_estimated_cost))}</div>
            <div><span class="label">Remaining value:</span> ${escapeHtml(formatMoney(selectedDetail.receiving_summary?.remaining_estimated_cost ?? selectedDetail.remaining_estimated_cost))}</div>
            <div><span class="label">Created:</span> ${escapeHtml(formatDateTime(selectedDetail.created_at))}</div>
            <div><span class="label">Submitted:</span> ${escapeHtml(formatDateTime(selectedDetail.submitted_at))}</div>
            <div><span class="label">Approved:</span> ${escapeHtml(formatDateTime(selectedDetail.approved_at))}</div>
            <div><span class="label">Completed:</span> ${escapeHtml(formatDateTime(selectedDetail.completed_at))}</div>
            <div><span class="label">Completed by:</span> ${escapeHtml(selectedDetail.completed_by_user_name || '-')}</div>
            <div><span class="label">Completion type:</span> ${escapeHtml(completionTypeLabel(selectedDetail.completion_type))}</div>
            <div><span class="label">Completion reason:</span> ${escapeHtml(selectedDetail.completion_reason || '-')}</div>
            <div><span class="label">Cancelled:</span> ${escapeHtml(formatDateTime(selectedDetail.cancelled_at))}</div>
          </div>

          ${selectedDetail.notes ? `<div class="notes"><strong>Notes:</strong><br />${escapeHtml(selectedDetail.notes)}</div>` : ''}

          <h2>Items</h2>
          <table>
            <thead><tr><th>Product</th><th>Ordered</th><th>Received</th><th>Remaining</th><th>Status</th><th>Unit Cost</th><th>Total</th><th>Received Value</th><th>Remaining Value</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>

          <h2>Linked Shipments</h2>
          <table>
            <thead><tr><th>Shipment</th><th>Status</th><th>Delivery</th><th>Received</th><th>Created</th></tr></thead>
            <tbody>${shipmentRows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  const copyCurrentViewLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setFormError(null);
    } catch {
      setFormError('Could not copy link. Copy the browser address bar instead.');
    }
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

  const selectedCanEdit = isPurchaseOrderEditable(selectedDetail?.status);
  const selectedIsLocked = isPurchaseOrderLocked(selectedDetail?.status);
  const selectedCanSubmit = selectedDetail?.status === 'draft';
  const selectedCanApprove = selectedDetail?.status === 'submitted';
  const selectedCanCancel = selectedDetail?.status === 'draft' || selectedDetail?.status === 'submitted';
  const selectedCanClose = selectedDetail?.status === 'approved' && Number(selectedDetail?.receiving_summary?.open_linked_shipment_count || 0) === 0;
  const selectedRemainingQuantity = Number(selectedDetail?.receiving_summary?.remaining_quantity || 0);
  const selectedCanReopen = selectedDetail?.status === 'completed' && selectedDetail?.completion_type === 'manual_close' && selectedRemainingQuantity > 0;
  const selectedHasOpenShipment = Number(selectedDetail?.receiving_summary?.open_linked_shipment_count || 0) > 0;
  const selectedCanCreateShipment = Boolean(
    selectedDetail?.receiving_summary?.can_create_remaining_shipment ??
    (selectedDetail?.status === 'approved' && selectedRemainingQuantity > 0 && !selectedHasOpenShipment)
  );

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
            <div style={styles.summaryBox}><strong>{summary.completed}</strong><span>Completed</span></div>
            <div style={styles.summaryBox}><strong>{summary.overdue}</strong><span>Overdue</span></div>
            <div style={styles.summaryBox}><strong>{summary.needsAction}</strong><span>Needs action</span></div>
            <div style={styles.summaryBox}><strong>{formatMoney(summary.estimatedTotal)}</strong><span>Est. cost</span></div>
          </div>
        </div>

        <div style={styles.attentionPanel}>
          <div style={styles.sectionHeaderCompact}>
            <div>
              <h3 style={styles.h3}>Procurement attention</h3>
              <p style={styles.muted}>Quick view of purchase orders needing action.</p>
            </div>
            <div style={styles.attentionStats}>
              <button type="button" style={styles.quickFilterButton} onClick={() => setFilters((current) => ({ ...current, deliveryStatus: 'overdue', nextActionStatus: '' }))}>Overdue: {summary.overdue}</button>
              <button type="button" style={styles.quickFilterButton} onClick={() => setFilters((current) => ({ ...current, deliveryStatus: 'due_today', nextActionStatus: '' }))}>Due today: {summary.dueToday}</button>
              <button type="button" style={styles.quickFilterButton} onClick={() => setFilters((current) => ({ ...current, nextActionStatus: 'receive_open_shipment', deliveryStatus: '' }))}>Receive: {summary.openReceiving}</button>
              <button type="button" style={styles.quickFilterButton} onClick={() => setFilters((current) => ({ ...current, nextActionStatus: 'approve_or_cancel', deliveryStatus: '' }))}>Approve: {summary.awaitingApproval}</button>
            </div>
          </div>
          {attentionPurchaseOrders.length ? (
            <div style={styles.attentionList}>
              {attentionPurchaseOrders.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  style={styles.attentionItem}
                  onClick={() => setSelectedId(row.id)}
                >
                  <span style={styles.attentionTitle}>{row.po_number}</span>
                  <span>{row.supplier_name}</span>
                  <span style={{ ...styles.badge, ...nextActionBadgeStyle(row.next_action_status) }}>{nextActionLabel(row.next_action_status)}</span>
                  <span style={styles.smallMuted}>Expected {formatDate(row.expected_delivery_date)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p style={styles.muted}>No purchase orders currently need action.</p>
          )}
        </div>

        {activeFilterChips.length ? (
          <div style={styles.activeFilters}>
            <span style={styles.activeFiltersLabel}>Active filters</span>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                style={styles.filterChip}
                onClick={() => setFilters((current) => ({ ...current, [chip.key]: '' }))}
                title="Remove filter"
              >
                {chip.label} ×
              </button>
            ))}
            <button type="button" style={styles.clearInlineButton} onClick={() => setFilters({ ...EMPTY_FILTERS })}>Clear all</button>
          </div>
        ) : null}

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
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filters.receivingStatus}
            onChange={(event) => setFilters((current) => ({ ...current, receivingStatus: event.target.value }))}
            style={styles.input}
          >
            <option value="">All receiving</option>
            <option value="not_applicable">N/A</option>
            <option value="not_started">Not started</option>
            <option value="partially_received">Partial</option>
            <option value="received">Received</option>
          </select>
          <select
            value={filters.varianceStatus}
            onChange={(event) => setFilters((current) => ({ ...current, varianceStatus: event.target.value }))}
            style={styles.input}
          >
            <option value="">All variance</option>
            <option value="not_applicable">N/A</option>
            <option value="matched">Matched</option>
            <option value="pending_receipt">Pending receipt</option>
            <option value="open_short">Open short</option>
            <option value="closed_short">Closed short</option>
            <option value="over_received">Over received</option>
          </select>
          <select
            value={filters.deliveryStatus}
            onChange={(event) => setFilters((current) => ({ ...current, deliveryStatus: event.target.value }))}
            style={styles.input}
          >
            <option value="">All delivery</option>
            <option value="no_date">No date</option>
            <option value="upcoming">Upcoming</option>
            <option value="due_today">Due today</option>
            <option value="overdue">Overdue</option>
            <option value="fulfilled">Fulfilled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filters.nextActionStatus}
            onChange={(event) => setFilters((current) => ({ ...current, nextActionStatus: event.target.value }))}
            style={styles.input}
          >
            <option value="">All next actions</option>
            <option value="submit_for_approval">Submit for approval</option>
            <option value="approve_or_cancel">Approve or cancel</option>
            <option value="create_shipment">Create shipment</option>
            <option value="receive_open_shipment">Receive shipment</option>
            <option value="follow_up_overdue">Follow up overdue</option>
            <option value="monitor_receiving">Monitor receiving</option>
            <option value="none_completed">Completed</option>
            <option value="none_cancelled">Cancelled</option>
            <option value="none">No action</option>
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
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Expected from</span>
            <input
              type="date"
              value={filters.expectedFrom}
              onChange={(event) => setFilters((current) => ({ ...current, expectedFrom: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Expected to</span>
            <input
              type="date"
              value={filters.expectedTo}
              onChange={(event) => setFilters((current) => ({ ...current, expectedTo: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Created from</span>
            <input
              type="date"
              value={filters.createdFrom}
              onChange={(event) => setFilters((current) => ({ ...current, createdFrom: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Created to</span>
            <input
              type="date"
              value={filters.createdTo}
              onChange={(event) => setFilters((current) => ({ ...current, createdTo: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Approved from</span>
            <input
              type="date"
              value={filters.approvedFrom}
              onChange={(event) => setFilters((current) => ({ ...current, approvedFrom: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Approved to</span>
            <input
              type="date"
              value={filters.approvedTo}
              onChange={(event) => setFilters((current) => ({ ...current, approvedTo: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Completed from</span>
            <input
              type="date"
              value={filters.completedFrom}
              onChange={(event) => setFilters((current) => ({ ...current, completedFrom: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Completed to</span>
            <input
              type="date"
              value={filters.completedTo}
              onChange={(event) => setFilters((current) => ({ ...current, completedTo: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Cancelled from</span>
            <input
              type="date"
              value={filters.cancelledFrom}
              onChange={(event) => setFilters((current) => ({ ...current, cancelledFrom: event.target.value }))}
              style={styles.input}
            />
          </label>
          <label style={styles.compactField}>
            <span style={styles.compactLabel}>Cancelled to</span>
            <input
              type="date"
              value={filters.cancelledTo}
              onChange={(event) => setFilters((current) => ({ ...current, cancelledTo: event.target.value }))}
              style={styles.input}
            />
          </label>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => setFilters({ ...EMPTY_FILTERS })}
          >
            Clear
          </button>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            style={styles.input}
            aria-label="Sort purchase orders"
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="expected_asc">Expected soonest</option>
            <option value="expected_desc">Expected latest</option>
            <option value="cost_desc">Highest value</option>
            <option value="cost_asc">Lowest value</option>
            <option value="received_percent_desc">Most received</option>
            <option value="received_percent_asc">Least received</option>
          </select>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={copyCurrentViewLink}
          >
            Copy View Link
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={exportVisiblePurchaseOrdersCsv}
            disabled={!displayedPurchaseOrders.length}
          >
            Export All CSV
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={exportCurrentPagePurchaseOrdersCsv}
            disabled={!paginatedPurchaseOrders.length}
          >
            Export Page CSV
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => printPurchaseOrderList(displayedPurchaseOrders, 'All filtered purchase orders')}
            disabled={!displayedPurchaseOrders.length}
          >
            Print All
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => printPurchaseOrderList(paginatedPurchaseOrders, `Page ${Math.min(Math.max(currentPage, 1), totalPages)} of ${totalPages}`)}
            disabled={!paginatedPurchaseOrders.length}
          >
            Print Page
          </button>
        </div>

        <div style={styles.dateShortcuts}>
          <span style={styles.activeFiltersLabel}>Date shortcuts</span>
          <button type="button" style={styles.quickFilterButton} onClick={() => applyDatePreset('expected_today')}>Expected today</button>
          <button type="button" style={styles.quickFilterButton} onClick={() => applyDatePreset('expected_next_7')}>Expected next 7 days</button>
          <button type="button" style={styles.quickFilterButton} onClick={() => applyDatePreset('created_last_7')}>Created last 7 days</button>
          <button type="button" style={styles.quickFilterButton} onClick={() => applyDatePreset('created_last_30')}>Created last 30 days</button>
          <button type="button" style={styles.quickFilterButton} onClick={() => applyDatePreset('approved_last_30')}>Approved last 30 days</button>
          <button type="button" style={styles.quickFilterButton} onClick={() => applyDatePreset('completed_last_30')}>Completed last 30 days</button>
          <button type="button" style={styles.quickFilterButton} onClick={() => applyDatePreset('cancelled_last_30')}>Cancelled last 30 days</button>
          <button type="button" style={styles.clearInlineButton} onClick={clearOnlyDateFilters}>Clear date filters</button>
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
                <th style={styles.th}>Delivery</th>
                <th style={styles.th}>Next Action</th>
                <th style={styles.th}>Items</th>
                <th style={styles.th}>Receiving</th>
                <th style={styles.th}>Variance</th>
                <th style={styles.th}>Received</th>
                <th style={styles.th}>Shipments</th>
                <th style={styles.th}>Estimated Cost</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPurchaseOrders.map((row) => (
                <tr
                  key={row.id}
                  style={row.id === selectedId ? styles.selectedRow : styles.clickableRow}
                  onClick={() => setSelectedId(row.id)}
                >
                  <td style={styles.td}>{row.po_number}</td>
                  <td style={styles.td}>{row.supplier_name}</td>
                  <td style={styles.td}><span style={{ ...styles.badge, ...badgeStyle(row.status) }}>{row.status}</span></td>
                  <td style={styles.td}>{formatDate(row.expected_delivery_date)}</td>
                  <td style={styles.td}><span style={{ ...styles.badge, ...deliveryBadgeStyle(row.delivery_status) }}>{deliveryStatusLabel(row.delivery_status)}</span></td>
                  <td style={styles.td}><span style={{ ...styles.badge, ...nextActionBadgeStyle(row.next_action_status) }}>{nextActionLabel(row.next_action_status)}</span></td>
                  <td style={styles.td}>{formatNumber(row.item_count)}</td>
                  <td style={styles.td}><span style={{ ...styles.badge, ...receivingBadgeStyle(row.receiving_status) }}>{receivingStatusLabel(row.receiving_status)}</span></td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, ...varianceBadgeStyle(row.variance_status) }}>{varianceStatusLabel(row.variance_status)}</span>
                    <div style={styles.smallMuted}>{formatNumber(row.quantity_variance)}</div>
                  </td>
                  <td style={styles.td}>{formatNumber(row.total_received_quantity)}</td>
                  <td style={styles.td}>{formatNumber(row.linked_shipment_count)}</td>
                  <td style={styles.td}>{formatMoney(row.estimated_total_cost)}</td>
                  <td style={styles.td}>{formatDateTime(row.created_at)}</td>
                </tr>
              ))}
              {!purchaseOrdersQuery.isLoading && !displayedPurchaseOrders.length ? (
                <tr><td style={styles.td} colSpan={13}>No purchase orders found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {displayedPurchaseOrders.length ? (
          <div style={styles.listTotalsPanel}>
            <div style={styles.listTotalsHeader}>
              <strong>List totals</strong>
              <span style={styles.smallMuted}>Filtered result and current page totals</span>
            </div>
            <div style={styles.listTotalsGrid}>
              <div style={styles.totalBox}><span>Filtered POs</span><strong>{formatNumber(filteredTotals.count)}</strong></div>
              <div style={styles.totalBox}><span>Page POs</span><strong>{formatNumber(pageTotals.count)}</strong></div>
              <div style={styles.totalBox}><span>Ordered qty</span><strong>{formatNumber(filteredTotals.orderedQuantity)}</strong></div>
              <div style={styles.totalBox}><span>Received qty</span><strong>{formatNumber(filteredTotals.receivedQuantity)}</strong></div>
              <div style={styles.totalBox}><span>Remaining qty</span><strong>{formatNumber(filteredTotals.remainingQuantity)}</strong></div>
              <div style={styles.totalBox}><span>Open shipments</span><strong>{formatNumber(filteredTotals.openLinkedShipmentCount)}</strong></div>
              <div style={styles.totalBox}><span>Filtered value</span><strong>{formatMoney(filteredTotals.estimatedTotalCost)}</strong></div>
              <div style={styles.totalBox}><span>Remaining value</span><strong>{formatMoney(filteredTotals.remainingEstimatedCost)}</strong></div>
            </div>
          </div>
        ) : null}

        {displayedPurchaseOrders.length ? (
          <div style={styles.breakdownPanel}>
            <div style={styles.listTotalsHeader}>
              <strong>List breakdown</strong>
              <span style={styles.smallMuted}>Click a badge to apply that filter</span>
            </div>
            <div style={styles.breakdownGrid}>
              <div style={styles.breakdownGroup}>
                <strong>Status</strong>
                <div style={styles.breakdownChips}>
                  {['draft', 'submitted', 'approved', 'completed', 'cancelled'].map((status) => (
                    <button key={status} type="button" style={styles.breakdownChip} onClick={() => setFilters((current) => ({ ...current, status }))}>
                      {status}: {formatNumber(filteredBreakdowns.statuses[status] || 0)}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.breakdownGroup}>
                <strong>Receiving</strong>
                <div style={styles.breakdownChips}>
                  {['not_applicable', 'not_started', 'partially_received', 'received'].map((status) => (
                    <button key={status} type="button" style={styles.breakdownChip} onClick={() => setFilters((current) => ({ ...current, receivingStatus: status }))}>
                      {receivingStatusLabel(status)}: {formatNumber(filteredBreakdowns.receivingStatuses[status] || 0)}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.breakdownGroup}>
                <strong>Delivery</strong>
                <div style={styles.breakdownChips}>
                  {['no_date', 'upcoming', 'due_today', 'overdue', 'fulfilled', 'cancelled'].map((status) => (
                    <button key={status} type="button" style={styles.breakdownChip} onClick={() => setFilters((current) => ({ ...current, deliveryStatus: status }))}>
                      {deliveryStatusLabel(status)}: {formatNumber(filteredBreakdowns.deliveryStatuses[status] || 0)}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.breakdownGroup}>
                <strong>Next action</strong>
                <div style={styles.breakdownChips}>
                  {['submit_for_approval', 'approve_or_cancel', 'create_shipment', 'receive_open_shipment', 'follow_up_overdue', 'monitor_receiving', 'none_completed', 'none_cancelled', 'none'].map((status) => (
                    <button key={status} type="button" style={styles.breakdownChip} onClick={() => setFilters((current) => ({ ...current, nextActionStatus: status }))}>
                      {nextActionLabel(status)}: {formatNumber(filteredBreakdowns.nextActions[status] || 0)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {displayedPurchaseOrders.length ? (
          <div style={styles.paginationRow}>
            <span style={styles.muted}>
              Showing {formatNumber((Math.min(Math.max(currentPage, 1), totalPages) - 1) * pageSize + 1)}–{formatNumber(Math.min(Math.min(Math.max(currentPage, 1), totalPages) * pageSize, displayedPurchaseOrders.length))} of {formatNumber(displayedPurchaseOrders.length)} purchase orders
            </span>
            <div style={styles.paginationControls}>
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                style={styles.inputCompact}
                aria-label="Purchase orders per page"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <button
                type="button"
                style={styles.secondaryButton}
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span style={styles.pageIndicator}>Page {formatNumber(Math.min(Math.max(currentPage, 1), totalPages))} of {formatNumber(totalPages)}</span>
              <button
                type="button"
                style={styles.secondaryButton}
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
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
                <span style={{ ...styles.badge, ...nextActionBadgeStyle(selectedDetail.next_action_status) }}>{nextActionLabel(selectedDetail.next_action_status)}</span>
                {selectedIsLocked ? <span style={{ ...styles.badge, ...styles.lockedBadge }}>Locked</span> : null}
              </div>
              <dl style={styles.detailGrid}>
                <dt>Expected delivery</dt><dd>{formatDate(selectedDetail.expected_delivery_date)}</dd>
                <dt>Estimated cost</dt><dd>{formatMoney(selectedDetail.estimated_total_cost)}</dd>
                <dt>Estimated received value</dt><dd>{formatMoney(selectedDetail.receiving_summary?.received_estimated_cost ?? selectedDetail.received_estimated_cost)}</dd>
                <dt>Estimated remaining value</dt><dd>{formatMoney(selectedDetail.receiving_summary?.remaining_estimated_cost ?? selectedDetail.remaining_estimated_cost)}</dd>
                <dt>Receiving status</dt><dd><span style={{ ...styles.badge, ...receivingBadgeStyle(selectedDetail.receiving_summary?.receiving_status) }}>{receivingStatusLabel(selectedDetail.receiving_summary?.receiving_status)}</span></dd>
                <dt>Variance status</dt><dd><span style={{ ...styles.badge, ...varianceBadgeStyle(selectedDetail.receiving_summary?.variance_status) }}>{varianceStatusLabel(selectedDetail.receiving_summary?.variance_status)}</span></dd>
                <dt>Quantity variance</dt><dd>{formatNumber(selectedDetail.receiving_summary?.quantity_variance)}</dd>
                <dt>Value variance</dt><dd>{formatMoney(selectedDetail.receiving_summary?.estimated_cost_variance)}</dd>
                <dt>Next action</dt><dd><span style={{ ...styles.badge, ...nextActionBadgeStyle(selectedDetail.next_action_status) }}>{nextActionLabel(selectedDetail.next_action_status)}</span></dd>
                <dt>PO received</dt><dd>{formatNumber(selectedDetail.receiving_summary?.received_quantity)} / {formatNumber(selectedDetail.receiving_summary?.ordered_quantity)} ({formatPercent(selectedDetail.receiving_summary?.receiving_percent)})</dd>
                <dt>Remaining</dt><dd>{formatNumber(selectedDetail.receiving_summary?.remaining_quantity)}</dd>
                <dt>Linked shipments</dt><dd>{formatNumber(selectedDetail.receiving_summary?.linked_shipment_count)} total / {formatNumber(selectedDetail.receiving_summary?.open_linked_shipment_count)} open</dd>
                <dt>Created</dt><dd>{formatDateTime(selectedDetail.created_at)}</dd>
                <dt>Submitted</dt><dd>{formatDateTime(selectedDetail.submitted_at)}</dd>
                <dt>Approved</dt><dd>{formatDateTime(selectedDetail.approved_at)}</dd>
                <dt>Completed</dt><dd>{formatDateTime(selectedDetail.completed_at)}</dd>
                <dt>Completed by</dt><dd>{selectedDetail.completed_by_user_name || '-'}</dd>
                <dt>Completion type</dt><dd>{completionTypeLabel(selectedDetail.completion_type)}</dd>
                <dt>Completion reason</dt><dd>{selectedDetail.completion_reason || '-'}</dd>
                <dt>Cancelled</dt><dd>{formatDateTime(selectedDetail.cancelled_at)}</dd>
              </dl>
              {selectedDetail.notes ? <p style={styles.notes}>{selectedDetail.notes}</p> : null}

              <h4 style={styles.h4}>Lifecycle Timeline</h4>
              <div style={styles.timeline}>
                {selectedLifecycleEvents.map((event) => (
                  <div key={event.label} style={styles.timelineItem}>
                    <div style={styles.timelineDot} />
                    <div>
                      <strong>{event.label}</strong>
                      <div style={styles.smallMuted}>{formatDateTime(event.value)}</div>
                      {event.actor ? <div style={styles.smallMuted}>By {event.actor}</div> : null}
                    </div>
                  </div>
                ))}
              </div>

              {capabilities.canViewAudit ? (
                <>
                  <div style={styles.sectionHeaderRow}>
                    <h4 style={styles.h4}>Audit Events</h4>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={exportSelectedPurchaseOrderAuditCsv}
                      disabled={auditQuery.isLoading || !selectedAuditEvents.length}
                    >
                      Export Audit CSV
                    </button>
                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={printSelectedPurchaseOrderAudit}
                      disabled={auditQuery.isLoading || !selectedAuditEvents.length}
                    >
                      Print Audit
                    </button>
                  </div>
                  <div style={styles.auditPanel}>
                    <div style={styles.auditToolbar}>
                      <input
                        style={styles.input}
                        value={auditSearch}
                        onChange={(event) => setAuditSearch(event.target.value)}
                        placeholder="Search audit action, actor, entity, or metadata"
                      />
                      {auditSearch ? (
                        <button type="button" style={styles.secondaryButton} onClick={() => setAuditSearch('')}>
                          Clear Audit Search
                        </button>
                      ) : null}
                    </div>
                    {auditQuery.isLoading ? <p style={styles.muted}>Loading audit events…</p> : null}
                    {auditQuery.error ? <p style={styles.error}>Failed to load PO audit events.</p> : null}
                    {(auditQuery.data || []).length ? (
                      selectedAuditEvents.length ? (
                        <>
                          <p style={styles.smallMuted}>Showing {selectedAuditEvents.length} of {(auditQuery.data || []).length} audit events.</p>
                          <div style={styles.auditList}>
                            {selectedAuditEvents.map((event) => (
                              <div key={event.id} style={styles.auditItem}>
                                <div>
                                  <strong>{event.action}</strong>
                                  <div style={styles.smallMuted}>{formatDateTime(event.created_at)} · {auditActorLabel(event)}</div>
                                </div>
                                <div style={styles.auditMetadata}>{auditMetadataSummary(event.metadata)}</div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p style={styles.muted}>No audit events match the current audit search.</p>
                      )
                    ) : !auditQuery.isLoading && !auditQuery.error ? (
                      <p style={styles.muted}>No audit events found for this PO.</p>
                    ) : null}
                  </div>
                </>
              ) : null}

              <h4 style={styles.h4}>Items</h4>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>Qty</th>
                      <th style={styles.th}>Received</th>
                      <th style={styles.th}>Remaining</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Variance</th>
                      <th style={styles.th}>Unit Cost</th>
                      <th style={styles.th}>Total</th>
                      <th style={styles.th}>Received Value</th>
                      <th style={styles.th}>Remaining Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDetail.items.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.td}>{item.product_name}</td>
                        <td style={styles.td}>{formatNumber(item.quantity)} {item.product_unit}</td>
                        <td style={styles.td}>{formatNumber(item.received_quantity)} {item.product_unit}</td>
                        <td style={styles.td}>{formatNumber(item.remaining_quantity)} {item.product_unit}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...receivingBadgeStyle(item.receiving_status) }}>
                            {receivingStatusLabel(item.receiving_status)}
                          </span>
                          <div style={styles.smallMuted}>{formatPercent(item.receiving_percent)}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...varianceBadgeStyle(item.variance_status) }}>
                            {varianceStatusLabel(item.variance_status)}
                          </span>
                          <div style={styles.smallMuted}>{formatNumber(item.quantity_variance)}</div>
                        </td>
                        <td style={styles.td}>{formatMoney(item.unit_cost)}</td>
                        <td style={styles.td}>{formatMoney(item.estimated_line_total)}</td>
                        <td style={styles.td}>{formatMoney(item.received_estimated_cost)}</td>
                        <td style={styles.td}>{formatMoney(item.remaining_estimated_cost)}</td>
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
                          <th style={styles.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedDetail.linked_shipments || []).map((shipment) => (
                          <tr key={shipment.id}>
                            <td style={styles.td}>{shipment.po_number || shipment.qr_code || shipment.id}</td>
                            <td style={styles.td}>{shipment.status}</td>
                            <td style={styles.td}>{formatDate(shipment.delivery_date)}</td>
                            <td style={styles.td}>{formatNumber(shipment.received_quantity)} / {formatNumber(shipment.ordered_quantity)}</td>
                            <td style={styles.td}>
                              <button
                                type="button"
                                style={styles.secondaryButton}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  navigate(`/shipments?shipmentId=${encodeURIComponent(shipment.id)}`);
                                }}
                              >
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}


              {selectedIsLocked ? (
                <p style={styles.muted}>This purchase order is locked because it is no longer a draft. Create follow-up shipments or receive linked shipments instead of editing the order.</p>
              ) : null}

              {actionMutation.error ? <p style={styles.error}>{actionError}</p> : null}

              <div style={styles.buttonRow}>
                <button type="button" style={styles.secondaryButton} onClick={exportSelectedPurchaseOrderCsv}>Export Detail CSV</button>
                <button type="button" style={styles.secondaryButton} onClick={printSelectedPurchaseOrderDetail}>Print Detail</button>
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
                    <p style={styles.muted}>Copies only remaining PO quantities into a pending shipment. Stock is not changed.</p>
                    {selectedHasOpenShipment ? <p style={styles.muted}>An open linked shipment exists; receive or close it before creating another remaining shipment.</p> : null}
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
                    Create Remaining Shipment
                  </button>
                  {createShipmentMutation.error ? <p style={styles.error}>{createShipmentError}</p> : null}
                </div>
              ) : null}


              {selectedCanClose && capabilities.canCancelPurchaseOrders ? (
                <div style={styles.cancelBox}>
                  <div>
                    <h4 style={styles.h4}>Close PO / cancel remaining quantity</h4>
                    <p style={styles.muted}>Use this when the supplier will not deliver the remaining quantity. This does not change stock or shipment records.</p>
                  </div>
                  <input
                    style={styles.input}
                    value={closeReason}
                    onChange={(event) => setCloseReason(event.target.value)}
                    placeholder="Close reason required"
                  />
                  <button
                    type="button"
                    style={styles.dangerButton}
                    onClick={() => {
                      if (!closeReason.trim()) {
                        window.alert('Close reason is required.');
                        return;
                      }
                      if (window.confirm('Close this purchase order and cancel any remaining undelivered quantity?')) {
                        actionMutation.mutate({ id: selectedDetail.id, action: 'close', body: { reason: closeReason } });
                      }
                    }}
                  >
                    Close PO
                  </button>
                </div>
              ) : null}


              {selectedCanReopen && capabilities.canCancelPurchaseOrders ? (
                <div style={styles.cancelBox}>
                  <div>
                    <h4 style={styles.h4}>Reopen manually closed PO</h4>
                    <p style={styles.muted}>Use this if the PO was closed early but remaining quantity still needs to be received. This does not change stock or shipment records.</p>
                  </div>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => {
                      if (window.confirm('Reopen this manually closed purchase order?')) {
                        actionMutation.mutate({ id: selectedDetail.id, action: 'reopen' });
                      }
                    }}
                  >
                    Reopen PO
                  </button>
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
  smallMuted: { marginTop: 4, color: '#64748b', fontSize: 12 },
  headerRow: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(90px, 1fr))', gap: 10 },
  summaryBox: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', gap: 4, color: '#475569' },
  attentionPanel: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, marginTop: 18, background: '#f8fafc' },
  attentionStats: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  attentionList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 12 },
  attentionItem: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, background: '#fff', display: 'grid', gap: 6, textAlign: 'left', cursor: 'pointer', color: '#334155' },
  attentionTitle: { fontWeight: 800, color: '#0f172a' },
  quickFilterButton: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '8px 10px', background: '#fff', color: '#0f172a', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  sectionHeaderCompact: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  sectionHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 16 },
  activeFilters: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 14, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 12, background: '#f8fafc' },
  activeFiltersLabel: { color: '#475569', fontSize: 13, fontWeight: 700 },
  filterChip: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '6px 10px', background: '#fff', color: '#334155', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  clearInlineButton: { border: 'none', background: 'transparent', color: '#2563eb', fontSize: 12, fontWeight: 800, cursor: 'pointer' },
  filters: { display: 'grid', gridTemplateColumns: 'minmax(180px, 1.5fr) repeat(7, minmax(150px, 1fr)) auto auto', gap: 10, marginTop: 18 },
  paginationRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 14 },
  paginationControls: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  listTotalsPanel: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 12, marginTop: 14, background: '#f8fafc' },
  listTotalsHeader: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 10 },
  listTotalsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 },
  totalBox: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, background: '#fff', display: 'flex', flexDirection: 'column', gap: 4, color: '#475569' },
  breakdownPanel: { border: '1px solid #e5e7eb', borderRadius: 14, padding: 12, marginTop: 14, background: '#fff' },
  breakdownGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 },
  breakdownGroup: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 10, display: 'grid', gap: 8, alignContent: 'start' },
  breakdownChips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  breakdownChip: { border: '1px solid #cbd5e1', borderRadius: 999, padding: '6px 9px', background: '#f8fafc', color: '#334155', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  pageIndicator: { color: '#475569', fontSize: 13, fontWeight: 700 },
  input: { width: '100%', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' },
  inputCompact: { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' },
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
  completedBadge: { background: '#e0f2fe', color: '#075985' },
  cancelledBadge: { background: '#fee2e2', color: '#991b1b' },
  receivedBadge: { background: '#dcfce7', color: '#166534' },
  partialReceivedBadge: { background: '#dbeafe', color: '#1d4ed8' },
  notStartedBadge: { background: '#fef3c7', color: '#92400e' },
  naBadge: { background: '#f1f5f9', color: '#475569' },
  lockedBadge: { background: '#e2e8f0', color: '#334155' },
  overdueBadge: { background: '#fee2e2', color: '#991b1b' },
  dueTodayBadge: { background: '#fef3c7', color: '#92400e' },
  upcomingBadge: { background: '#e0f2fe', color: '#075985' },
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
  timeline: { display: 'grid', gap: 10, margin: '10px 0 18px', padding: 12, border: '1px solid #e5e7eb', borderRadius: 12, background: '#f8fafc' },
  timelineItem: { display: 'grid', gridTemplateColumns: '14px 1fr', gap: 10, alignItems: 'start' },
  timelineDot: { width: 10, height: 10, borderRadius: 999, background: '#2563eb', marginTop: 4 },
  auditPanel: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, margin: '10px 0 18px', background: '#fff' },
  auditToolbar: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: 10, marginBottom: 10, alignItems: 'center' },
  auditList: { display: 'grid', gap: 10 },
  auditItem: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, display: 'grid', gap: 6, background: '#f8fafc' },
  auditMetadata: { color: '#475569', fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', wordBreak: 'break-word' },
  bridgeBox: { border: '1px solid #dbeafe', borderRadius: 12, padding: 12, display: 'grid', gap: 10, marginTop: 14, background: '#eff6ff' },
  cancelBox: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 14 }
};
