import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import type { AppLocale } from '../i18n/config';
import { apiRequest, ApiError, getVersionConflictMessage, isVersionConflictError } from '../lib/api';
import { getCurrentTenantUserId } from '../lib/auth';
import { fetchTenantSubscriptionAccess, getTenantFeatureEntitlement } from '../lib/tenantSubscriptionAccess';
import { getRoleCapabilities } from '../lib/permissions';
import { scrollToFormSection } from '../lib/scrollToForm';
import type { ProductItem, SupplierItem } from '../types/inventory';
import { showTenantActionError, showTenantActionSuccess } from '../lib/actionFeedback';
import { formatCurrencyAmount, getActiveTenantCurrency, normalizeCurrencyCode } from '../lib/tenantCurrency';
import ProductUomSelect from '../components/inventory/ProductUomSelect';
import { SidebarAttentionMarker, SidebarAttentionTabDot, sidebarAttentionItemStyle } from '../components/ui/SidebarAttentionMarker';
import { useOperationalAttentionItems } from '../lib/sidebarAttentionItems';
import {
  OperationalSectionHeader,
  OperationalWorkspaceHero,
  // OperationalWorkspaceMetaPill, // v3.49.107: tenant title info pills intentionally hidden.
  OperationalWorkspaceStatCard,
  OperationalWorkspaceStats,
  OperationalWorkspaceTab,
  OperationalWorkspaceTabs
} from '../components/ui/OperationalWorkspace';
import './PurchaseOrdersPage.css';

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
  currency?: string | null;
  status: PurchaseOrderStatus;
  expected_delivery_date?: string | null;
  notes?: string | null;
  created_by_user_id?: string | null;
  created_by_user_name?: string | null;
  require_separate_purchase_order_approver?: boolean;
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
  version?: number | string;
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
  entered_quantity?: number | string;
  uom_code?: string | null;
  received_quantity?: number | string;
  remaining_quantity?: number | string;
  receiving_status?: string;
  receiving_percent?: number | string;
  variance_status?: string;
  quantity_variance?: number | string;
  estimated_cost_variance?: number | string;
  base_unit_cost?: number | string | null;
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
  attachments?: Array<{ filename?: string | null; content_type?: string | null }>;
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

/*
 * v3.49.116: The inbound-reservation action is intentionally hidden from the
 * Purchase Orders workflow. The backend capability is preserved for compatibility,
 * but this tenant page no longer presents it as a normal PO action.
 *
 * type InboundReservationResponse = {
 *   id: string;
 *   reservation_number?: string | null;
 *   status?: string | null;
 * };
 */

type PurchaseOrderFormItem = {
  product_id: string;
  quantity: string;
  uom_code: string;
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

type PurchaseOrderProductOption = {
  id: string;
  name: string;
  sku?: string | null;
  unit: string;
  category?: string | null;
  supplier_catalog_item_id?: string | null;
  current_supplier_unit_cost?: number | string | null;
  current_supplier_price_currency?: string | null;
  current_supplier_price_effective_from?: string | null;
};

type PurchaseOrderCreateOptions = {
  supplier: { id: string; name: string };
  purchase_order_currency: string;
  products: PurchaseOrderProductOption[];
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
type PurchaseOrderWorkspaceSection = 'overview' | 'registry' | 'create' | 'detail';

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

function buildIfMatchHeaders(version?: number | string | null): Record<string, string> | undefined {
  if (version === undefined || version === null || String(version).trim() === '') {
    return undefined;
  }

  return {
    'If-Match-Version': String(version)
  };
}

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

function sortLabelKey(sortKey: SortKey): string {
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
    items: [{ product_id: '', quantity: '', uom_code: '', unit_cost: '', notes: '' }]
  };
}

function normalizeError(error: unknown, fallback: string, ui: (englishText: string) => string): string {
  if (isVersionConflictError(error)) {
    return getVersionConflictMessage(error, ui);
  }

  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function formatDateForLocale(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatLocalizedDate(date, locale);
}

function formatDateTimeForLocale(value: string | null | undefined, locale: AppLocale): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatLocalizedDateTime(date, locale);
}

function auditActorLabelKey(row: TenantAuditRow): string {
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

function formatNumberForLocale(value: number | string | null | undefined, locale: AppLocale): string {
  if (value === null || value === undefined || value === '') return '0';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 4 });
}

function formatMoneyForLocale(value: number | string | null | undefined, currency: string | null | undefined, locale: AppLocale): string {
  if (value === null || value === undefined || value === '') return '-';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  const localized = formatLocalizedCurrency(amount, normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 2 });
  return localized || formatCurrencyAmount(amount, currency || getActiveTenantCurrency());
}

function formatAggregateMoneyForLocale(
  rows: PurchaseOrderListItem[],
  selector: (row: PurchaseOrderListItem) => number | string | null | undefined,
  locale: AppLocale
): string {
  if (!rows.length) return formatMoneyForLocale(0, undefined, locale);
  const totals = new Map<string, number>();
  rows.forEach((row) => {
    const code = (row.currency || getActiveTenantCurrency()).toUpperCase();
    totals.set(code, (totals.get(code) || 0) + Number(selector(row) || 0));
  });
  return Array.from(totals.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => formatMoneyForLocale(amount, currency, locale))
    .join(' + ');
}

function completionTypeLabelKey(type?: string | null): string {
  if (type === 'fully_received') return 'Fully received';
  if (type === 'manual_close') return 'Manually closed';
  return '-';
}

function receivingStatusLabelKey(status: string | null | undefined): string {
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

function varianceStatusLabelKey(status: string | null | undefined): string {
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

function deliveryStatusLabelKey(status: string | null | undefined): string {
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

function nextActionLabelKey(status: string | null | undefined): string {
  if (status === 'submit_for_approval') return 'Submit for approval';
  if (status === 'approve_or_cancel') return 'Approve or cancel';
  if (status === 'create_shipment') return 'Send to supplier';
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

function formatPercentForLocale(value: number | string | null | undefined, locale: AppLocale): string {
  if (value === null || value === undefined || value === '') return '0%';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);
  return `${formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 1 })}%`;
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

function purchaseOrderCostIssueKey(detail: PurchaseOrderDetail): string | null {
  if (!detail.items.length) return 'At least one purchase order item is required before submission.';

  const missingCostCount = detail.items.filter((item) => {
    const parsed = Number(item.unit_cost);
    return item.unit_cost === null || item.unit_cost === undefined || !Number.isFinite(parsed) || parsed <= 0;
  }).length;

  if (missingCostCount > 0) {
    return `${missingCostCount} item${missingCostCount === 1 ? '' : 's'} missing positive unit cost. Edit the draft and enter supplier pricing before submitting or approving.`;
  }

  if (Number(detail.estimated_total_cost || 0) <= 0) {
    return 'Estimated PO cost must be greater than zero before submitting or approving.';
  }

  return null;
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

async function fetchPurchaseOrderCreateOptions(supplierId: string): Promise<PurchaseOrderCreateOptions> {
  const params = new URLSearchParams({ supplier_id: supplierId });
  return apiRequest<PurchaseOrderCreateOptions>(`/purchase-orders/create-options?${params.toString()}`);
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
      uom_code: item.uom_code || null,
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

async function updatePurchaseOrder(id: string, input: PurchaseOrderFormState, version?: number | string | null): Promise<PurchaseOrderDetail> {
  return apiRequest<PurchaseOrderDetail>(`/purchase-orders/${id}`, {
    method: 'PATCH',
    headers: buildIfMatchHeaders(version),
    body: JSON.stringify(buildPayload(input))
  });
}

async function lifecycleAction(
  id: string,
  action: 'submit' | 'approve' | 'cancel' | 'close' | 'reopen',
  body?: unknown,
  version?: number | string | null
): Promise<PurchaseOrderDetail> {
  return apiRequest<PurchaseOrderDetail>(`/purchase-orders/${id}/${action}`, {
    method: 'POST',
    headers: buildIfMatchHeaders(version),
    body: body ? JSON.stringify(body) : JSON.stringify({})
  });
}

async function createShipmentFromPurchaseOrder(
  id: string,
  deliveryDate?: string | null,
  version?: number | string | null
): Promise<CreateShipmentFromPurchaseOrderResponse> {
  return apiRequest<CreateShipmentFromPurchaseOrderResponse>(`/purchase-orders/${id}/create-shipment`, {
    method: 'POST',
    headers: buildIfMatchHeaders(version),
    body: JSON.stringify({ delivery_date: deliveryDate || null })
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
  return apiRequest<SendShipmentToSupplierResponse>(`/shipments/${input.shipmentId}/send-to-supplier`, {
    method: 'POST',
    body: JSON.stringify({
      recipient_email: input.recipientEmail.trim(),
      message: input.message?.trim() || null,
      confirmed: true
    })
  });
}

/*
 * v3.49.116: Intentionally not exposed on the Purchase Orders page.
 * Kept here as commented compatibility history rather than deleting the previous
 * integration path outright.
 *
 * async function createInboundReservationFromPurchaseOrder(
 *   id: string,
 *   version?: number | string | null
 * ): Promise<InboundReservationResponse> {
 *   return apiRequest<InboundReservationResponse>(`/inventory-reservations/from-purchase-order/${id}`, {
 *     method: 'POST',
 *     headers: buildIfMatchHeaders(version),
 *     body: JSON.stringify({ activate: true, linkage_note: 'Protect open inbound purchase order quantity' })
 *   });
 * }
 */

function detailToForm(detail: PurchaseOrderDetail): PurchaseOrderFormState {
  return {
    supplier_id: detail.supplier_id,
    po_number: detail.po_number || '',
    expected_delivery_date: detail.expected_delivery_date ? String(detail.expected_delivery_date).slice(0, 10) : '',
    notes: detail.notes || '',
    items: detail.items.map((item) => ({
      product_id: item.product_id,
      quantity: String(item.entered_quantity ?? item.quantity ?? ''),
      uom_code: item.uom_code || '',
      unit_cost: item.unit_cost === null || item.unit_cost === undefined ? '' : String(item.unit_cost),
      notes: item.notes || ''
    }))
  };
}

export default function PurchaseOrdersPage() {
  const { locale, ui } = useAppTranslation();
  const sortLabel = (sortKey: SortKey) => ui(sortLabelKey(sortKey));
  const formatDate = useCallback((value: string | null | undefined) => formatDateForLocale(value, locale), [locale]);
  const formatDateTime = (value: string | null | undefined) => formatDateTimeForLocale(value, locale);
  const formatNumber = (value: number | string | null | undefined) => formatNumberForLocale(value, locale);
  const formatMoney = (value: number | string | null | undefined, currency?: string | null) => formatMoneyForLocale(value, currency, locale);
  const formatAggregateMoney = (rows: PurchaseOrderListItem[], selector: (row: PurchaseOrderListItem) => number | string | null | undefined) => formatAggregateMoneyForLocale(rows, selector, locale);
  const completionTypeLabel = (type?: string | null) => ui(completionTypeLabelKey(type));
  const receivingStatusLabel = useCallback((status: string | null | undefined) => ui(receivingStatusLabelKey(status)), [ui]);
  const varianceStatusLabel = useCallback((status: string | null | undefined) => ui(varianceStatusLabelKey(status)), [ui]);
  const deliveryStatusLabel = useCallback((status: string | null | undefined) => ui(deliveryStatusLabelKey(status)), [ui]);
  const nextActionLabel = useCallback((status: string | null | undefined) => ui(nextActionLabelKey(status)), [ui]);
  const purchaseOrderStatusLabel = useCallback((status: PurchaseOrderStatus | null | undefined) => {
    const key = status === 'draft' ? 'Draft' : status === 'submitted' ? 'Submitted' : status === 'approved' ? 'Approved' : status === 'completed' ? 'Completed' : status === 'cancelled' ? 'Cancelled' : null;
    return key ? ui(key) : String(status || '—');
  }, [ui]);
  const formatPercent = (value: number | string | null | undefined) => formatPercentForLocale(value, locale);
  const auditActorLabel = useCallback((row: TenantAuditRow) => {
    const key = auditActorLabelKey(row);
    return key === 'Platform support' || key === 'Tenant user' ? ui(key) : key;
  }, [ui]);
  const purchaseOrderCostIssue = (detail: PurchaseOrderDetail): string | null => {
    const raw = purchaseOrderCostIssueKey(detail);
    if (!raw) return null;
    const pluralMatch = raw.match(/^(\d+) items? missing positive unit cost\. Edit the draft and enter supplier pricing before submitting or approving\.$/);
    if (pluralMatch) {
      const count = Number(pluralMatch[1]);
      return ui(count === 1
        ? '1 item is missing a positive unit cost. Edit the draft and enter supplier pricing before submitting or approving.'
        : '{count} items are missing a positive unit cost. Edit the draft and enter supplier pricing before submitting or approving.').replace('{count}', formatNumber(count));
    }
    return ui(raw);
  };
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const capabilities = getRoleCapabilities();
  const currentUserId = getCurrentTenantUserId();
  const purchaseOrderAttentionItemsQuery = useOperationalAttentionItems('purchase_orders', capabilities.canApprovePurchaseOrders);
  const purchaseOrderAttentionIds = purchaseOrderAttentionItemsQuery.attentionIds;

  const [filters, setFilters] = useState<Filters>(() => filtersFromSearchParams(searchParams));
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    searchParams.get('purchaseOrderId') || searchParams.get('purchase_order_id')
  );
  const [form, setForm] = useState<PurchaseOrderFormState>(() => emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [shipmentDeliveryDate, setShipmentDeliveryDate] = useState('');
  const [supplierEmailPreview, setSupplierEmailPreview] = useState<SupplierEmailPreview | null>(null);
  const [supplierEmailRecipient, setSupplierEmailRecipient] = useState('');
  const [supplierEmailMessage, setSupplierEmailMessage] = useState('');
  const [supplierEmailShipmentId, setSupplierEmailShipmentId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>(() => sortKeyFromSearchParams(searchParams));
  const [currentPage, setCurrentPage] = useState<number>(() => pageFromSearchParams(searchParams));
  const [pageSize, setPageSize] = useState<number>(() => pageSizeFromSearchParams(searchParams));
  const [auditSearch, setAuditSearch] = useState('');
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState<PurchaseOrderWorkspaceSection>('overview');
  const registryRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const subscriptionAccessQuery = useQuery({
    queryKey: ['tenant-subscription-access', 'purchase-orders'],
    queryFn: fetchTenantSubscriptionAccess
  });
  const purchaseOrdersEntitlement = getTenantFeatureEntitlement(subscriptionAccessQuery.data, 'purchase_orders');
  const purchaseOrdersEntitled = purchaseOrdersEntitlement ? purchaseOrdersEntitlement.allowed : true;
  const purchaseOrdersFeatureReady = Boolean(subscriptionAccessQuery.data) && purchaseOrdersEntitled;

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: () => fetchPurchaseOrders(filters),
    enabled: purchaseOrdersFeatureReady
  });

  const detailQuery = useQuery({
    queryKey: ['purchase-order', selectedId],
    queryFn: () => fetchPurchaseOrder(selectedId as string),
    enabled: Boolean(selectedId && purchaseOrdersFeatureReady),
    staleTime: 5_000
  });

  const auditQuery = useQuery({
    queryKey: ['purchase-order', 'audit', selectedId],
    queryFn: () => fetchPurchaseOrderAudit(selectedId as string),
    enabled: Boolean(selectedId && capabilities.canViewAudit && purchaseOrdersFeatureReady),
    retry: false
  });

  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers, enabled: purchaseOrdersFeatureReady });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: fetchProducts, enabled: purchaseOrdersFeatureReady });
  const purchaseOrderCreateOptionsQuery = useQuery({
    queryKey: ['purchase-order-create-options', form.supplier_id],
    queryFn: () => fetchPurchaseOrderCreateOptions(form.supplier_id),
    enabled: Boolean(form.supplier_id && purchaseOrdersFeatureReady && (capabilities.canCreatePurchaseOrders || capabilities.canUpdatePurchaseOrders)),
    staleTime: 30_000
  });
  const supplierProducts = useMemo(() => purchaseOrderCreateOptionsQuery.data?.products || [], [purchaseOrderCreateOptionsQuery.data?.products]);
  const purchaseOrderFormCurrency = purchaseOrderCreateOptionsQuery.data?.purchase_order_currency || getActiveTenantCurrency();

  const selectedDetail = detailQuery.data ?? null;
  const selectedLifecycleEvents = useMemo(() => {
    if (!selectedDetail) return [];

    return [
      { label: ui('Created'), value: selectedDetail.created_at, actor: selectedDetail.created_by_user_name },
      { label: ui('Submitted'), value: selectedDetail.submitted_at, actor: selectedDetail.submitted_by_user_name },
      { label: ui('Approved'), value: selectedDetail.approved_at, actor: selectedDetail.approved_by_user_name },
      { label: ui('Completed'), value: selectedDetail.completed_at, actor: selectedDetail.completed_by_user_name },
      { label: ui('Cancelled'), value: selectedDetail.cancelled_at, actor: selectedDetail.cancelled_by_user_name }
    ].filter((event) => Boolean(event.value));
  }, [selectedDetail, ui]);
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
  }, [auditQuery.data, auditSearch, auditActorLabel]);

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

    if (filters.search.trim()) chips.push({ key: 'search', label: ui('Search: {value}').replace('{value}', filters.search.trim()) });
    if (filters.status) chips.push({ key: 'status', label: ui('Status: {value}').replace('{value}', purchaseOrderStatusLabel(filters.status)) });
    if (filters.receivingStatus) chips.push({ key: 'receivingStatus', label: ui('Receiving: {value}').replace('{value}', receivingStatusLabel(filters.receivingStatus)) });
    if (filters.varianceStatus) chips.push({ key: 'varianceStatus', label: ui('Variance: {value}').replace('{value}', varianceStatusLabel(filters.varianceStatus)) });
    if (filters.deliveryStatus) chips.push({ key: 'deliveryStatus', label: ui('Delivery: {value}').replace('{value}', deliveryStatusLabel(filters.deliveryStatus)) });
    if (filters.nextActionStatus) chips.push({ key: 'nextActionStatus', label: ui('Next: {value}').replace('{value}', nextActionLabel(filters.nextActionStatus)) });
    if (filters.supplierId) {
      chips.push({ key: 'supplierId', label: ui('Supplier: {value}').replace('{value}', suppliers.find((supplier) => supplier.id === filters.supplierId)?.name || filters.supplierId) });
    }
    if (filters.productId) {
      chips.push({ key: 'productId', label: ui('Product: {value}').replace('{value}', products.find((product) => product.id === filters.productId)?.name || filters.productId) });
    }
    if (filters.expectedFrom) chips.push({ key: 'expectedFrom', label: ui('Expected from: {date}').replace('{date}', formatDate(filters.expectedFrom)) });
    if (filters.expectedTo) chips.push({ key: 'expectedTo', label: ui('Expected to: {date}').replace('{date}', formatDate(filters.expectedTo)) });
    if (filters.createdFrom) chips.push({ key: 'createdFrom', label: ui('Created from: {date}').replace('{date}', formatDate(filters.createdFrom)) });
    if (filters.createdTo) chips.push({ key: 'createdTo', label: ui('Created to: {date}').replace('{date}', formatDate(filters.createdTo)) });
    if (filters.approvedFrom) chips.push({ key: 'approvedFrom', label: ui('Approved from: {date}').replace('{date}', formatDate(filters.approvedFrom)) });
    if (filters.approvedTo) chips.push({ key: 'approvedTo', label: ui('Approved to: {date}').replace('{date}', formatDate(filters.approvedTo)) });
    if (filters.completedFrom) chips.push({ key: 'completedFrom', label: ui('Completed from: {date}').replace('{date}', formatDate(filters.completedFrom)) });
    if (filters.completedTo) chips.push({ key: 'completedTo', label: ui('Completed to: {date}').replace('{date}', formatDate(filters.completedTo)) });
    if (filters.cancelledFrom) chips.push({ key: 'cancelledFrom', label: ui('Cancelled from: {date}').replace('{date}', formatDate(filters.cancelledFrom)) });
    if (filters.cancelledTo) chips.push({ key: 'cancelledTo', label: ui('Cancelled to: {date}').replace('{date}', formatDate(filters.cancelledTo)) });

    return chips;
  }, [filters, suppliersQuery.data, productsQuery.data, ui, deliveryStatusLabel, formatDate, nextActionLabel, purchaseOrderStatusLabel, receivingStatusLabel, varianceStatusLabel]);

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
    // Keep URL-backed pagination aligned when filter criteria change.
    setCurrentPage(1);
  }, [filters, sortKey, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      // Clamp a stale page after the result count shrinks.
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const purchaseOrderIdFromQuery =
      searchParams.get('purchaseOrderId') || searchParams.get('purchase_order_id');

    if (!purchaseOrderIdFromQuery) {
      return;
    }

    if (selectedId === purchaseOrderIdFromQuery) {
      return;
    }

    // A direct link intentionally synchronizes the selected record from the URL.
    setSelectedId(purchaseOrderIdFromQuery);
    setEditingId(null);
    setFormError(null);
  }, [searchParams, selectedId]);

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (created) => {
      // The create response is already the authoritative detail. Seed it directly
      // instead of mounting the detail query and immediately invalidating it again.
      queryClient.setQueryData(['purchase-order', created.id], created);
      setSelectedId(created.id);
      setEditingId(null);
      setFormError(null);
      setActiveWorkspaceSection('detail');

      // Refresh the registry in the background. Do not block the UI or cause a
      // second detail fetch before the newly-created order can be shown.
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });

      // Clear the draft only after the new detail target exists. This avoids the
      // create form collapsing before the destination is selected.
      window.requestAnimationFrame(() => {
        setForm(emptyForm());
        window.requestAnimationFrame(() => {
          detailRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input, version }: { id: string; input: PurchaseOrderFormState; version?: number | string | null }) => updatePurchaseOrder(id, input, version),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-order', updated.id] });
      setSelectedId(updated.id);
      resetForm();
    }
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, body, version }: { id: string; action: 'submit' | 'approve' | 'cancel' | 'close' | 'reopen'; body?: unknown; version?: number | string | null }) =>
      lifecycleAction(id, action, body, version),
    onSuccess: async (updated) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-order', updated.id] });
      await queryClient.invalidateQueries({ queryKey: ['purchase-order', 'audit', updated.id] });
      setSelectedId(updated.id);
      setCancelReason('');
      setCloseReason('');
    }
  });

  const preparePurchaseOrderSupplierEmailMutation = useMutation({
    mutationFn: async ({
      purchaseOrderId,
      version,
      deliveryDate,
      existingShipmentId
    }: {
      purchaseOrderId: string;
      version?: number | string | null;
      deliveryDate?: string | null;
      existingShipmentId?: string | null;
    }) => {
      let shipmentId = existingShipmentId || null;
      let createdShipment = false;

      if (!shipmentId) {
        const payload = await createShipmentFromPurchaseOrder(purchaseOrderId, deliveryDate, version);
        shipmentId = payload.shipment.id;
        createdShipment = true;
      }

      const preview = await previewShipmentSupplierEmail({ shipmentId });
      return { preview, shipmentId, createdShipment, purchaseOrderId };
    },
    onSuccess: ({ preview, shipmentId, createdShipment, purchaseOrderId }) => {
      setSupplierEmailPreview(preview);
      setSupplierEmailRecipient(preview.recipient_email || '');
      setSupplierEmailMessage(preview.message || '');
      setSupplierEmailShipmentId(shipmentId);
      setFormError(null);

      if (createdShipment) {
        setShipmentDeliveryDate('');
        void queryClient.invalidateQueries({ queryKey: ['shipments'] });
        void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        void queryClient.invalidateQueries({ queryKey: ['purchase-order', purchaseOrderId] });
      }
    },
    onError: (error) => {
      setSupplierEmailPreview(null);
      setSupplierEmailShipmentId(null);
      setFormError(error instanceof ApiError ? error.message : ui('Failed to prepare supplier email preview.'));
    }
  });

  const sendPurchaseOrderToSupplierMutation = useMutation({
    mutationFn: sendShipmentToSupplier,
    onSuccess: (data) => {
      const recipientEmail = data.recipient_email || data.supplier_email || ui('supplier');
      const poLabel = data.po_number ? ui(' for PO {po}').replace('{po}', data.po_number) : '';
      const attachmentNames = data.attachments
        ?.map((attachment) => attachment.filename)
        .filter((filename): filename is string => Boolean(filename)) ?? [];
      const attachmentLabel = attachmentNames.length > 0
        ? ui(' Attachments: {attachments}.').replace('{attachments}', attachmentNames.join(', '))
        : ui(' QR information was included by the backend when available.');
      const fallbackMessage = data.sandbox_capture
        ? ui('✔ Purchase order test email{poLabel} captured in Mailtrap Sandbox for {recipient}.{attachmentLabel}')
            .replace('{poLabel}', poLabel)
            .replace('{recipient}', recipientEmail)
            .replace('{attachmentLabel}', attachmentLabel)
        : ui('✔ Purchase order{poLabel} emailed to {recipient}.{attachmentLabel}')
            .replace('{poLabel}', poLabel)
            .replace('{recipient}', recipientEmail)
            .replace('{attachmentLabel}', attachmentLabel);

      showTenantActionSuccess(data.message || fallbackMessage);
      setSupplierEmailPreview(null);
      setSupplierEmailRecipient('');
      setSupplierEmailMessage('');
      setSupplierEmailShipmentId(null);
      setFormError(null);

      void queryClient.invalidateQueries({ queryKey: ['shipments'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      if (selectedId) {
        void queryClient.invalidateQueries({ queryKey: ['purchase-order', selectedId] });
        void queryClient.invalidateQueries({ queryKey: ['purchase-order', 'audit', selectedId] });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'EMAIL_NOT_CONFIGURED') {
        setFormError(ui('Supplier email is not configured on this server. Configure backend email settings before sending the purchase order.'));
      } else {
        setFormError(error instanceof ApiError ? error.message : ui('Failed to email purchase order to supplier.'));
      }
    }
  });

  /*
   * v3.49.116: Inbound reservation creation is intentionally not offered from the
   * Purchase Orders page. Supporting backend behavior remains untouched.
   *
   * const createInboundReservationMutation = useMutation({
   *   mutationFn: ({ id, version }: { id: string; version?: number | string | null }) =>
   *     createInboundReservationFromPurchaseOrder(id, version),
   *   onSuccess: async (reservation, variables) => {
   *     await queryClient.invalidateQueries({ queryKey: ['inventory-reservations'] });
   *     await queryClient.invalidateQueries({ queryKey: ['inventory-reservations-summary'] });
   *     await queryClient.invalidateQueries({ queryKey: ['purchase-order', variables.id] });
   *     await queryClient.invalidateQueries({ queryKey: ['purchase-order', 'audit', variables.id] });
   *     navigate(`/inventory-reservations?reservationId=${encodeURIComponent(reservation.id)}`);
   *   }
   * });
   */

  const validateForm = (): string | null => {
    if (!form.supplier_id) return ui('Supplier is required.');
    if (!form.items.length) return ui('At least one item is required.');
    const seen = new Set<string>();
    for (const item of form.items) {
      if (!item.product_id) return ui('Every item needs a product.');
      if (seen.has(item.product_id)) return ui('A product can only appear once per purchase order.');
      seen.add(item.product_id);
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return ui('Every quantity must be greater than zero.');
      if (item.unit_cost !== '') {
        const cost = Number(item.unit_cost);
        if (!Number.isFinite(cost) || cost < 0) return ui('Unit cost must be zero or greater.');
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
      setFormError(ui('Browser blocked the print window. Allow pop-ups for this site and try again.'));
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(ui('Purchase Order Audit'))} ${escapeHtml(selectedDetail.po_number)}</title>
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
          <button onclick="window.print()">${escapeHtml(ui('Print'))}</button>
          <h1>${escapeHtml(ui('Purchase Order Audit Events'))}</h1>
          <p class="meta"><strong>${escapeHtml(ui('PO Number'))}:</strong> ${escapeHtml(selectedDetail.po_number)}</p>
          <p class="meta"><strong>${escapeHtml(ui('Supplier'))}:</strong> ${escapeHtml(selectedDetail.supplier_name)}</p>
          <p class="meta"><strong>${escapeHtml(ui('Status'))}:</strong> ${escapeHtml(purchaseOrderStatusLabel(selectedDetail.status))}</p>
          <p class="meta"><strong>${escapeHtml(ui('Events'))}:</strong> ${escapeHtml(rows.length)}${auditSearch.trim() ? ` ${escapeHtml(ui('filtered by'))} &quot;${escapeHtml(auditSearch.trim())}&quot;` : ''}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(ui('Created At'))}</th>
                <th>${escapeHtml(ui('Action'))}</th>
                <th>${escapeHtml(ui('Actor'))}</th>
                <th>${escapeHtml(ui('Entity Type'))}</th>
                <th>${escapeHtml(ui('Entity ID'))}</th>
                <th>${escapeHtml(ui('Metadata'))}</th>
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
      ['Product', 'Ordered Unit', 'Ordered Quantity', 'Base Unit', 'Base Quantity', 'Received (Base)', 'Remaining (Base)', 'Receiving Status', 'Receiving Percent', 'Variance Status', 'Quantity Variance', 'Estimated Cost Variance', 'Cost / Ordered Unit', 'Base Unit Cost', 'Estimated Total', 'Received Value', 'Remaining Value', 'Notes'],
      ...selectedDetail.items.map((item) => [
        item.product_name,
        item.uom_code || item.product_unit,
        item.entered_quantity ?? item.quantity,
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
        item.base_unit_cost ?? '',
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
      : ui('None');

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
        <td>${escapeHtml(formatMoney(row.estimated_total_cost, row.currency))}</td>
        <td>${escapeHtml(formatDateTime(row.created_at))}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=750');
    if (!printWindow) {
      setFormError(ui('Browser blocked the print window. Allow pop-ups for this site and try again.'));
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
            .subtle { color: #64748b; font-size: 10px; }
            @media print { button { display: none; } body { margin: 18px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">${escapeHtml(ui('Print'))}</button>
          <h1>${escapeHtml(ui('Purchase Orders'))}</h1>
          <p class="meta"><strong>${escapeHtml(ui('Scope'))}:</strong> ${escapeHtml(scopeLabel)}</p>
          <p class="meta"><strong>${escapeHtml(ui('Rows'))}:</strong> ${escapeHtml(rowsToPrint.length)}</p>
          <p class="meta"><strong>${escapeHtml(ui('Sort'))}:</strong> ${escapeHtml(sortLabel(sortKey))}</p>
          <p class="meta"><strong>${escapeHtml(ui('Filters'))}:</strong> ${escapeHtml(filterSummary)}</p>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(ui('PO Number'))}</th>
                <th>${escapeHtml(ui('Supplier'))}</th>
                <th>${escapeHtml(ui('Status'))}</th>
                <th>${escapeHtml(ui('Expected'))}</th>
                <th>${escapeHtml(ui('Delivery'))}</th>
                <th>${escapeHtml(ui('Next Action'))}</th>
                <th>${escapeHtml(ui('Receiving'))}</th>
                <th>${escapeHtml(ui('Received'))}</th>
                <th>${escapeHtml(ui('Shipments'))}</th>
                <th>${escapeHtml(ui('Estimated Cost'))}</th>
                <th>${escapeHtml(ui('Created'))}</th>
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
        <td>${escapeHtml(formatNumber(item.entered_quantity ?? item.quantity))} ${escapeHtml(item.uom_code || item.product_unit)}${String(item.uom_code || item.product_unit).toUpperCase() !== String(item.product_unit).toUpperCase() ? `<br /><span class="subtle">${escapeHtml(formatNumber(item.quantity))} ${escapeHtml(item.product_unit)} ${escapeHtml(ui('base'))}</span>` : ''}</td>
        <td>${escapeHtml(formatNumber(item.received_quantity))} ${escapeHtml(item.product_unit)}</td>
        <td>${escapeHtml(formatNumber(item.remaining_quantity))} ${escapeHtml(item.product_unit)}</td>
        <td>${escapeHtml(receivingStatusLabel(item.receiving_status))} (${escapeHtml(formatPercent(item.receiving_percent))})</td>
        <td>${escapeHtml(formatMoney(item.unit_cost, selectedDetail?.currency))} / ${escapeHtml(item.uom_code || item.product_unit)}</td>
        <td>${escapeHtml(formatMoney(item.estimated_line_total, selectedDetail?.currency))}</td>
        <td>${escapeHtml(formatMoney(item.received_estimated_cost, selectedDetail?.currency))}</td>
        <td>${escapeHtml(formatMoney(item.remaining_estimated_cost, selectedDetail?.currency))}</td>
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
      : `<tr><td colspan="5">${escapeHtml(ui('No linked shipments.'))}</td></tr>`;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=750');
    if (!printWindow) {
      setFormError(ui('Browser blocked the print window. Allow pop-ups for this site and try again.'));
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(ui('Purchase Order'))} ${escapeHtml(selectedDetail.po_number)}</title>
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
            .subtle { color: #64748b; font-size: 10px; }
            .notes { margin-top: 12px; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; white-space: pre-wrap; }
            @media print { button { display: none; } body { margin: 20px; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">${escapeHtml(ui('Print'))}</button>
          <h1>${escapeHtml(ui('Purchase Order'))}</h1>
          <div class="badge">${escapeHtml(selectedDetail.status.toUpperCase())}</div>
          <p class="meta"><strong>${escapeHtml(ui('PO Number'))}:</strong> ${escapeHtml(selectedDetail.po_number)}</p>
          <p class="meta"><strong>${escapeHtml(ui('Supplier'))}:</strong> ${escapeHtml(selectedDetail.supplier_name)}</p>
          <p class="meta"><strong>${escapeHtml(ui('Expected delivery'))}:</strong> ${escapeHtml(formatDate(selectedDetail.expected_delivery_date))}</p>

          <div class="grid">
            <div><span class="label">${escapeHtml(ui('Receiving status'))}:</span> ${escapeHtml(receivingStatusLabel(selectedDetail.receiving_summary?.receiving_status))}</div>
            <div><span class="label">${escapeHtml(ui('Delivery status'))}:</span> ${escapeHtml(deliveryStatusLabel(selectedDetail.delivery_status))}</div>
            <div><span class="label">${escapeHtml(ui('Next action'))}:</span> ${escapeHtml(nextActionLabel(selectedDetail.next_action_status))}</div>
            <div><span class="label">${escapeHtml(ui('Received'))}:</span> ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.received_quantity))} / ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.ordered_quantity))} (${escapeHtml(formatPercent(selectedDetail.receiving_summary?.receiving_percent))})</div>
            <div><span class="label">${escapeHtml(ui('Remaining'))}:</span> ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.remaining_quantity))}</div>
            <div><span class="label">${escapeHtml(ui('Linked shipments'))}:</span> ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.linked_shipment_count))} ${escapeHtml(ui('total'))} / ${escapeHtml(formatNumber(selectedDetail.receiving_summary?.open_linked_shipment_count))} ${escapeHtml(ui('open'))}</div>
            <div><span class="label">${escapeHtml(ui('Estimated cost'))}:</span> ${escapeHtml(formatMoney(selectedDetail.estimated_total_cost, selectedDetail.currency))}</div>
            <div><span class="label">${escapeHtml(ui('Received value'))}:</span> ${escapeHtml(formatMoney(selectedDetail.receiving_summary?.received_estimated_cost ?? selectedDetail.received_estimated_cost, selectedDetail.currency))}</div>
            <div><span class="label">${escapeHtml(ui('Remaining value'))}:</span> ${escapeHtml(formatMoney(selectedDetail.receiving_summary?.remaining_estimated_cost ?? selectedDetail.remaining_estimated_cost, selectedDetail.currency))}</div>
            <div><span class="label">${escapeHtml(ui('Created'))}:</span> ${escapeHtml(formatDateTime(selectedDetail.created_at))}</div>
            <div><span class="label">${escapeHtml(ui('Submitted'))}:</span> ${escapeHtml(formatDateTime(selectedDetail.submitted_at))}</div>
            <div><span class="label">${escapeHtml(ui('Approved'))}:</span> ${escapeHtml(formatDateTime(selectedDetail.approved_at))}</div>
            <div><span class="label">${escapeHtml(ui('Completed'))}:</span> ${escapeHtml(formatDateTime(selectedDetail.completed_at))}</div>
            <div><span class="label">${escapeHtml(ui('Completed by'))}:</span> ${escapeHtml(selectedDetail.completed_by_user_name || '-')}</div>
            <div><span class="label">${escapeHtml(ui('Completion type'))}:</span> ${escapeHtml(completionTypeLabel(selectedDetail.completion_type))}</div>
            <div><span class="label">${escapeHtml(ui('Completion reason'))}:</span> ${escapeHtml(selectedDetail.completion_reason || '-')}</div>
            <div><span class="label">${escapeHtml(ui('Cancelled'))}:</span> ${escapeHtml(formatDateTime(selectedDetail.cancelled_at))}</div>
          </div>

          ${selectedDetail.notes ? `<div class="notes"><strong>${escapeHtml(ui('Notes'))}:</strong><br />${escapeHtml(selectedDetail.notes)}</div>` : ''}

          <h2>${escapeHtml(ui('Items'))}</h2>
          <table>
            <thead><tr><th>${escapeHtml(ui('Product'))}</th><th>${escapeHtml(ui('Ordered'))}</th><th>${escapeHtml(ui('Received'))}</th><th>${escapeHtml(ui('Remaining'))}</th><th>${escapeHtml(ui('Status'))}</th><th>${escapeHtml(ui('Unit Cost'))}</th><th>${escapeHtml(ui('Total'))}</th><th>${escapeHtml(ui('Received Value'))}</th><th>${escapeHtml(ui('Remaining Value'))}</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>

          <h2>${escapeHtml(ui('Linked Shipments'))}</h2>
          <table>
            <thead><tr><th>${escapeHtml(ui('Shipment'))}</th><th>${escapeHtml(ui('Status'))}</th><th>${escapeHtml(ui('Delivery'))}</th><th>${escapeHtml(ui('Received'))}</th><th>${escapeHtml(ui('Created'))}</th></tr></thead>
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
      showTenantActionSuccess(ui('Current view link copied successfully.'));
    } catch {
      setFormError(ui('Could not copy link. Copy the browser address bar instead.'));
      showTenantActionError(ui('Could not copy link. Copy the browser address bar instead.'));
    }
  };

  const submitForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createMutation.isPending || updateMutation.isPending) return;
    setFormError(null);
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        input: form,
        version: selectedDetail?.id === editingId ? selectedDetail.version : undefined
      });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = () => {
    if (!selectedDetail || selectedDetail.status !== 'draft') return;
    setEditingId(selectedDetail.id);
    setForm(detailToForm(selectedDetail));
    setFormError(null);
    setActiveWorkspaceSection('create');
    scrollToFormSection('purchase-order-form');
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { product_id: '', quantity: '', uom_code: '', unit_cost: '', notes: '' }]
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

  const actionError = normalizeError(actionMutation.error, ui('Purchase order action failed.'), ui);
  // v3.49.116: inbound-reservation action is intentionally hidden from this page.
  // const createInboundReservationError = normalizeError(createInboundReservationMutation.error, ui('Creating inbound reservation from purchase order failed.'), ui);
  const formMutationError = normalizeError(createMutation.error || updateMutation.error, ui('Saving purchase order failed.'), ui);

  const selectedCanEdit = isPurchaseOrderEditable(selectedDetail?.status);
  const selectedIsLocked = isPurchaseOrderLocked(selectedDetail?.status);
  const selectedCanSubmit = selectedDetail?.status === 'draft';
  const selectedCanApprove = selectedDetail?.status === 'submitted';
  const selectedSelfApprovalBlocked = Boolean(selectedDetail?.require_separate_purchase_order_approver !== false && currentUserId && selectedDetail?.created_by_user_id === currentUserId);
  const selectedCanCancel = selectedDetail?.status === 'draft' || selectedDetail?.status === 'submitted';
  const selectedCanClose = selectedDetail?.status === 'approved' && Number(selectedDetail?.receiving_summary?.open_linked_shipment_count || 0) === 0;
  const selectedRemainingQuantity = Number(selectedDetail?.receiving_summary?.remaining_quantity || 0);
  const selectedCanReopen = selectedDetail?.status === 'completed' && selectedDetail?.completion_type === 'manual_close' && selectedRemainingQuantity > 0;
  const selectedHasOpenShipment = Number(selectedDetail?.receiving_summary?.open_linked_shipment_count || 0) > 0;
  const selectedOpenShipment = (selectedDetail?.linked_shipments || []).find((shipment) => shipment.status !== 'received') || null;
  const selectedCanSendPurchaseOrder = Boolean(
    selectedDetail?.status === 'approved' &&
    selectedRemainingQuantity > 0 &&
    capabilities.canManageShipments &&
    capabilities.canSendShipments
  );
  /*
   * v3.49.116: Do not expose inbound reservations as a normal PO workflow action.
   * const selectedCanCreateInboundReservation = Boolean(
   *   capabilities.canCreateInventoryReservations &&
   *   selectedDetail &&
   *   ['submitted', 'approved'].includes(String(selectedDetail.status)) &&
   *   selectedRemainingQuantity > 0
   * );
   */

  const selectedCostIssue = selectedDetail ? purchaseOrderCostIssue(selectedDetail) : null;

  const navigateWorkspaceSection = (section: PurchaseOrderWorkspaceSection, target: HTMLElement | null) => {
    setActiveWorkspaceSection(section);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitSelectedPurchaseOrder = () => {
    if (!selectedDetail) return;
    if (selectedCostIssue) {
      showTenantActionError(ui('Submit blocked. {reason}').replace('{reason}', selectedCostIssue));
      return;
    }

    actionMutation.mutate({ id: selectedDetail.id, action: 'submit', version: selectedDetail.version });
  };

  const approveSelectedPurchaseOrder = () => {
    if (!selectedDetail) return;
    if (selectedCostIssue) {
      showTenantActionError(ui('Approve blocked. {reason}').replace('{reason}', selectedCostIssue));
      return;
    }

    actionMutation.mutate({ id: selectedDetail.id, action: 'approve', version: selectedDetail.version });
  };


  const prepareSelectedPurchaseOrderEmail = () => {
    if (!selectedDetail || !selectedCanSendPurchaseOrder) return;

    if (selectedHasOpenShipment && !selectedOpenShipment) {
      const message = ui('The open receiving record could not be identified. Refresh the Purchase Order and try again.');
      setFormError(message);
      showTenantActionError(message);
      return;
    }

    const deliveryDate = shipmentDeliveryDate || selectedDetail.expected_delivery_date || null;
    if (!selectedOpenShipment && !deliveryDate) {
      const message = ui('Delivery date is required before sending this purchase order.');
      setFormError(message);
      showTenantActionError(message);
      return;
    }

    setFormError(null);
    preparePurchaseOrderSupplierEmailMutation.mutate({
      purchaseOrderId: selectedDetail.id,
      version: selectedDetail.version,
      deliveryDate,
      existingShipmentId: selectedOpenShipment?.id || null
    });
  };

  const closeSupplierEmailPreview = () => {
    if (sendPurchaseOrderToSupplierMutation.isPending) return;
    setSupplierEmailPreview(null);
    setSupplierEmailRecipient('');
    setSupplierEmailMessage('');
    setSupplierEmailShipmentId(null);
  };

  const confirmPurchaseOrderEmailSend = () => {
    if (!supplierEmailShipmentId || !supplierEmailPreview) return;
    if (!supplierEmailRecipient.trim()) {
      const message = ui('Enter a valid supplier email address before sending.');
      setFormError(message);
      showTenantActionError(message);
      return;
    }

    sendPurchaseOrderToSupplierMutation.mutate({
      shipmentId: supplierEmailShipmentId,
      recipientEmail: supplierEmailRecipient,
      message: supplierEmailMessage
    });
  };

  if (subscriptionAccessQuery.isLoading) {
    return (
      <div className="purchase-orders-page io-operational-page io-workspace-page">
        <OperationalWorkspaceHero
          iconPath="/purchase-orders"
          eyebrow={ui("Procurement")}
          title={ui("Purchase orders")}
          description={ui("Create, approve, and track supplier orders through receiving.")}
          meta={
            undefined /*
              v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
              Previous rendering preserved for easy restoration:
              <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
            */
          }
        />
        <section className="app-panel purchase-orders-card">
          <OperationalSectionHeader
            iconPath="/purchase-orders"
            title={ui("Checking purchase order access")}
            description={ui("Loading tenant plan access and procurement permissions.")}
          />
        </section>
      </div>
    );
  }

  if (purchaseOrdersEntitlement && !purchaseOrdersEntitlement.allowed) {
    return (
      <div className="purchase-orders-page io-operational-page io-workspace-page">
        <OperationalWorkspaceHero
          iconPath="/purchase-orders"
          eyebrow={ui("Procurement")}
          title={ui("Purchase orders")}
          description={ui("Create, approve, and track supplier orders through receiving.")}
          meta={
            undefined /*
              v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
              Previous rendering preserved for easy restoration:
              <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
            */
          }
        />
        <section className="app-panel purchase-orders-card">
          <OperationalSectionHeader
            iconPath="/purchase-orders"
            title={ui("Purchase orders are not included in this tenant plan")}
            description={ui("This procurement feature is unavailable for the current tenant.")}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="purchase-orders-page io-operational-page io-workspace-page" id="purchase-orders-workspace-top">
      <OperationalWorkspaceHero
        iconPath="/purchase-orders"
        eyebrow={ui("Procurement")}
        title={ui("Purchase orders")}
        description={ui("Create, approve, and track supplier orders from draft through receiving and completion. Stock changes only when linked shipments are received.")}
        meta={
          undefined /*
            v3.49.107 — Tenant simplification. Title-area info pills intentionally hidden.
            Previous rendering preserved for easy restoration:
                      <>
                        <OperationalWorkspaceMetaPill>{ui("Tenant-scoped")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui("Approval workflow")}</OperationalWorkspaceMetaPill>
                        <OperationalWorkspaceMetaPill>{ui("Receiving through shipments")}</OperationalWorkspaceMetaPill>
                      </>
                    
          */
        }
        aside={
          <button
            type="button"
            className="app-button app-button--primary"
            disabled={!capabilities.canCreatePurchaseOrders}
            onClick={() => navigateWorkspaceSection('create', createRef.current)}
          >
            {ui("Create purchase order")}
          </button>
        }
      />

      <OperationalWorkspaceStats ariaLabel={ui("Purchase order summary")}>
        <OperationalWorkspaceStatCard
          label={ui("Total orders")}
          value={summary.count}
          helper={`${summary.draft} drafts`}
          tone="slate"
          iconPath="/purchase-orders"
          loading={purchaseOrdersQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Awaiting approval")}
          value={summary.submitted}
          helper={ui("Submitted orders waiting for a decision")}
          tone={summary.submitted > 0 ? 'blue' : 'neutral'}
          iconPath="/execution-requests"
          loading={purchaseOrdersQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Needs action")}
          value={summary.needsAction}
          helper={ui("Orders with a current procurement action")}
          tone={summary.needsAction > 0 ? 'warn' : 'good'}
          iconPath="/alerts"
          loading={purchaseOrdersQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Overdue")}
          value={summary.overdue}
          helper={ui("Expected delivery date has passed")}
          tone={summary.overdue > 0 ? 'danger' : 'good'}
          iconPath="/alerts"
          loading={purchaseOrdersQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Open receiving")}
          value={summary.openReceiving}
          helper={ui("Orders with a linked shipment ready to receive")}
          tone={summary.openReceiving > 0 ? 'blue' : 'neutral'}
          iconPath="/shipments"
          loading={purchaseOrdersQuery.isLoading}
        />
        <OperationalWorkspaceStatCard
          label={ui("Estimated value")}
          value={formatAggregateMoney(purchaseOrdersQuery.data || [], (row) => row.estimated_total_cost)}
          helper={ui("Value of the currently filtered orders")}
          tone="neutral"
          iconPath="/reports"
          loading={purchaseOrdersQuery.isLoading}
        />
      </OperationalWorkspaceStats>

      <OperationalWorkspaceTabs ariaLabel={ui("Purchase order work areas")} hint={ui("Jump to the part of the procurement workflow you need.")}>
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'overview'}
          iconPath="/dashboard"
          label={ui("Overview")}
          onClick={() => navigateWorkspaceSection('overview', document.getElementById('purchase-orders-workspace-top'))}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'registry'}
          iconPath="/purchase-orders"
          label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>{ui("Orders")}{purchaseOrderAttentionItemsQuery.data?.requires_attention ? <SidebarAttentionTabDot label={ui("Attention required")} /> : null}</span>}
          count={displayedPurchaseOrders.length}
          onClick={() => navigateWorkspaceSection('registry', registryRef.current)}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'create'}
          iconPath="/purchase-orders"
          label={editingId ? ui('Edit draft') : ui('Create order')}
          disabled={!capabilities.canCreatePurchaseOrders && !capabilities.canUpdatePurchaseOrders}
          onClick={() => navigateWorkspaceSection('create', createRef.current)}
        />
        <OperationalWorkspaceTab
          active={activeWorkspaceSection === 'detail'}
          iconPath="/audit"
          label={ui("Order detail")}
          disabled={!selectedId}
          onClick={() => navigateWorkspaceSection('detail', detailRef.current)}
        />
      </OperationalWorkspaceTabs>

      <section className="app-panel purchase-orders-card purchase-orders-guide" aria-label={ui('How Purchase Orders work')}>
        <div className="purchase-orders-guide-intro">
          <strong>{ui('How Purchase Orders work')}</strong>
          <span>{ui('A Purchase Order is the buying instruction to a supplier. It records what you intend to buy, but it does not add stock.')}</span>
        </div>
        <div className="purchase-orders-guide-steps">
          {[
            [ui('1. Create a draft'), ui('Choose the supplier first. Product choices are then limited to products assigned to that supplier.')],
            [ui('2. Submit for approval'), ui('Submitting sends the draft into the approval step. Stock still does not change.')],
            [ui('3. Approve the order'), ui('Approval authorizes the order. It still does not mean the goods have arrived.')],
            [ui('4. Send to supplier'), ui('Send the approved Purchase Order. The receiving record is prepared automatically.')],
            [ui('5. Receive the delivery'), ui('When the goods arrive, open Shipments and confirm what was delivered. That is when stock increases.')]
          ].map(([title, text]) => <div key={title}><strong>{title}</strong><span>{text}</span></div>)}
        </div>
        <div className="purchase-orders-guide-note">
          <strong>{ui('What the main areas mean')}</strong>
          <span>{ui('Orders = find existing Purchase Orders. Create order = make or edit a draft. Order detail = submit, approve, send to the supplier, review receiving, close or cancel, export, and review audit history.')}</span>
        </div>
      </section>

      <div ref={registryRef} id="purchase-order-registry" className="purchase-orders-scroll-anchor">
        <section className="app-panel purchase-orders-card purchase-orders-section-card">
          <OperationalSectionHeader
            iconPath="/purchase-orders"
            title={ui("Purchase order registry")}
            description={ui("Find supplier orders, review their current state, and open one for receiving or lifecycle actions.")}
            actions={
              <div className="purchase-orders-header-actions">
                <button type="button" className="app-button app-button--secondary" onClick={exportVisiblePurchaseOrdersCsv} disabled={!displayedPurchaseOrders.length}>{ui("Export CSV")}</button>
                <button type="button" className="app-button app-button--secondary" onClick={() => printPurchaseOrderList(displayedPurchaseOrders, ui('Filtered purchase orders'))} disabled={!displayedPurchaseOrders.length}>{ui("Print list")}</button>
                <button type="button" className="app-button app-button--secondary" onClick={() => setFilters({ ...EMPTY_FILTERS })}>{ui("Clear filters")}</button>
              </div>
            }
          />

          <div className={`purchase-orders-attention${summary.needsAction > 0 ? ' purchase-orders-attention--active' : ''}`}>
            <div>
              <strong>{summary.needsAction > 0 ? ui('Procurement attention') : ui('No urgent purchase order actions')}</strong>
              <span>{summary.needsAction > 0 ? ui('Use a quick filter to focus on orders that need work.') : ui('The current filtered orders have no immediate procurement action.')}</span>
            </div>
            <div className="purchase-orders-attention-actions">
              <button type="button" onClick={() => setFilters((current) => ({ ...current, deliveryStatus: 'overdue', nextActionStatus: '' }))}>{ui("Overdue")} <span>{summary.overdue}</span></button>
              <button type="button" onClick={() => setFilters((current) => ({ ...current, deliveryStatus: 'due_today', nextActionStatus: '' }))}>{ui("Due today")} <span>{summary.dueToday}</span></button>
              <button type="button" onClick={() => setFilters((current) => ({ ...current, nextActionStatus: 'receive_open_shipment', deliveryStatus: '' }))}>{ui("Receive")} <span>{summary.openReceiving}</span></button>
              <button type="button" onClick={() => setFilters((current) => ({ ...current, nextActionStatus: 'approve_or_cancel', deliveryStatus: '' }))}>{ui("Approve")} <span>{summary.awaitingApproval}</span></button>
            </div>
          </div>

          {attentionPurchaseOrders.length ? (
            <div className="purchase-orders-attention-list" aria-label={ui("Purchase orders needing attention")}>
              {attentionPurchaseOrders.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="purchase-orders-attention-item"
                  onClick={() => {
                    setSelectedId(row.id);
                    navigateWorkspaceSection('detail', detailRef.current);
                  }}
                >
                  <span><strong>{row.po_number}</strong><small>{row.supplier_name}</small></span>
                  <span style={{ ...styles.badge, ...nextActionBadgeStyle(row.next_action_status) }}>{nextActionLabel(row.next_action_status)}</span>
                  <small>{ui("Expected")} {formatDate(row.expected_delivery_date)}</small>
                </button>
              ))}
            </div>
          ) : null}

          {activeFilterChips.length ? (
            <div className="purchase-orders-active-filters">
              <span>{ui("Active filters")}</span>
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => setFilters((current) => ({ ...current, [chip.key]: '' }))}
                  title={ui("Remove filter")}
                >
                  {chip.label} ×
                </button>
              ))}
              <button type="button" className="purchase-orders-clear-link" onClick={() => setFilters({ ...EMPTY_FILTERS })}>{ui("Clear all")}</button>
            </div>
          ) : null}

          <div className="purchase-orders-primary-filters">
            <label className="purchase-orders-field purchase-orders-field--search">
              <span>{ui("Search")}</span>
              <input
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder={ui("PO number, supplier, or notes")}
              />
            </label>
            <label className="purchase-orders-field">
              <span>{ui("Status")}</span>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="">{ui("All statuses")}</option>
                <option value="draft">{ui("Draft")}</option>
                <option value="submitted">{ui("Submitted")}</option>
                <option value="approved">{ui("Approved")}</option>
                <option value="completed">{ui("Completed")}</option>
                <option value="cancelled">{ui("Cancelled")}</option>
              </select>
            </label>
            <label className="purchase-orders-field">
              <span>{ui("Supplier")}</span>
              <select value={filters.supplierId} onChange={(event) => setFilters((current) => ({ ...current, supplierId: event.target.value }))}>
                <option value="">{ui("All suppliers")}</option>
                {(suppliersQuery.data || []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label className="purchase-orders-field">
              <span>{ui("Next action")}</span>
              <select value={filters.nextActionStatus} onChange={(event) => setFilters((current) => ({ ...current, nextActionStatus: event.target.value }))}>
                <option value="">{ui("All next actions")}</option>
                <option value="submit_for_approval">{ui("Submit for approval")}</option>
                <option value="approve_or_cancel">{ui("Approve or cancel")}</option>
                <option value="create_shipment">{ui("Send to supplier")}</option>
                <option value="receive_open_shipment">{ui("Receive shipment")}</option>
                <option value="follow_up_overdue">{ui("Follow up overdue")}</option>
                <option value="monitor_receiving">{ui("Monitor receiving")}</option>
                <option value="none_completed">{ui("Completed")}</option>
                <option value="none_cancelled">{ui("Cancelled")}</option>
                <option value="none">{ui("No action")}</option>
              </select>
            </label>
          </div>

          <details className="purchase-orders-advanced-filters">
            <summary>{ui("Advanced filters and list tools")}</summary>
            <div className="purchase-orders-advanced-content">
              <div className="purchase-orders-secondary-filters">
                <label className="purchase-orders-field">
                  <span>{ui("Receiving")}</span>
                  <select value={filters.receivingStatus} onChange={(event) => setFilters((current) => ({ ...current, receivingStatus: event.target.value }))}>
                    <option value="">{ui("All receiving")}</option>
                    <option value="not_applicable">{ui("N/A")}</option>
                    <option value="not_started">{ui("Not started")}</option>
                    <option value="partially_received">{ui("Partial")}</option>
                    <option value="received">{ui("Received")}</option>
                  </select>
                </label>
                <label className="purchase-orders-field">
                  <span>{ui("Variance")}</span>
                  <select value={filters.varianceStatus} onChange={(event) => setFilters((current) => ({ ...current, varianceStatus: event.target.value }))}>
                    <option value="">{ui("All variance")}</option>
                    <option value="not_applicable">{ui("N/A")}</option>
                    <option value="matched">{ui("Matched")}</option>
                    <option value="pending_receipt">{ui("Pending receipt")}</option>
                    <option value="open_short">{ui("Open short")}</option>
                    <option value="closed_short">{ui("Closed short")}</option>
                    <option value="over_received">{ui("Over received")}</option>
                  </select>
                </label>
                <label className="purchase-orders-field">
                  <span>{ui("Delivery")}</span>
                  <select value={filters.deliveryStatus} onChange={(event) => setFilters((current) => ({ ...current, deliveryStatus: event.target.value }))}>
                    <option value="">{ui("All delivery")}</option>
                    <option value="no_date">{ui("No date")}</option>
                    <option value="upcoming">{ui("Upcoming")}</option>
                    <option value="due_today">{ui("Due today")}</option>
                    <option value="overdue">{ui("Overdue")}</option>
                    <option value="fulfilled">{ui("Fulfilled")}</option>
                    <option value="cancelled">{ui("Cancelled")}</option>
                  </select>
                </label>
                <label className="purchase-orders-field">
                  <span>{ui("Product")}</span>
                  <select value={filters.productId} onChange={(event) => setFilters((current) => ({ ...current, productId: event.target.value }))}>
                    <option value="">{ui("All products")}</option>
                    {(productsQuery.data || []).map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
                  </select>
                </label>
                <label className="purchase-orders-field">
                  <span>{ui("Sort")}</span>
                  <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)} aria-label={ui("Sort purchase orders")}>
                    <option value="created_desc">{ui("Newest first")}</option>
                    <option value="created_asc">{ui("Oldest first")}</option>
                    <option value="expected_asc">{ui("Expected soonest")}</option>
                    <option value="expected_desc">{ui("Expected latest")}</option>
                    <option value="cost_desc">{ui("Highest value")}</option>
                    <option value="cost_asc">{ui("Lowest value")}</option>
                    <option value="received_percent_desc">{ui("Most received")}</option>
                    <option value="received_percent_asc">{ui("Least received")}</option>
                  </select>
                </label>
              </div>

              <div className="purchase-orders-date-grid">
                {([
                  ['Expected from', 'expectedFrom'], ['Expected to', 'expectedTo'],
                  ['Created from', 'createdFrom'], ['Created to', 'createdTo'],
                  ['Approved from', 'approvedFrom'], ['Approved to', 'approvedTo'],
                  ['Completed from', 'completedFrom'], ['Completed to', 'completedTo'],
                  ['Cancelled from', 'cancelledFrom'], ['Cancelled to', 'cancelledTo']
                ] as [string, keyof Filters][]).map(([label, key]) => (
                  <label key={key} className="purchase-orders-field">
                    <span>{ui(label)}</span>
                    <input type="date" value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))} />
                  </label>
                ))}
              </div>

              <div className="purchase-orders-date-shortcuts">
                <span>{ui("Date shortcuts")}</span>
                <button type="button" onClick={() => applyDatePreset('expected_today')}>{ui("Expected today")}</button>
                <button type="button" onClick={() => applyDatePreset('expected_next_7')}>{ui("Expected next 7 days")}</button>
                <button type="button" onClick={() => applyDatePreset('created_last_7')}>{ui("Created last 7 days")}</button>
                <button type="button" onClick={() => applyDatePreset('created_last_30')}>{ui("Created last 30 days")}</button>
                <button type="button" onClick={() => applyDatePreset('approved_last_30')}>{ui("Approved last 30 days")}</button>
                <button type="button" onClick={() => applyDatePreset('completed_last_30')}>{ui("Completed last 30 days")}</button>
                <button type="button" onClick={() => applyDatePreset('cancelled_last_30')}>{ui("Cancelled last 30 days")}</button>
                <button type="button" className="purchase-orders-clear-link" onClick={clearOnlyDateFilters}>{ui("Clear date filters")}</button>
              </div>

              <div className="purchase-orders-list-tools">
                <button type="button" className="app-button app-button--secondary" onClick={copyCurrentViewLink}>{ui("Copy view link")}</button>
                <button type="button" className="app-button app-button--secondary" onClick={exportCurrentPagePurchaseOrdersCsv} disabled={!paginatedPurchaseOrders.length}>{ui("Export current page")}</button>
                <button type="button" className="app-button app-button--secondary" onClick={() => printPurchaseOrderList(paginatedPurchaseOrders, ui('Page {page} of {total}').replace('{page}', formatNumber(Math.min(Math.max(currentPage, 1), totalPages))).replace('{total}', formatNumber(totalPages)))} disabled={!paginatedPurchaseOrders.length}>{ui("Print current page")}</button>
              </div>
            </div>
          </details>

          {purchaseOrdersQuery.isLoading ? <p className="purchase-orders-muted">{ui("Loading purchase orders…")}</p> : null}
          {purchaseOrdersQuery.error ? <p style={styles.error}>{normalizeError(purchaseOrdersQuery.error, ui('Failed to load purchase orders.'), ui)}</p> : null}

          <div className="purchase-orders-table-wrap">
            <table className="purchase-orders-table">
              <thead>
                <tr>
                  <th>{ui("Purchase order")}</th>
                  <th>{ui("Supplier")}</th>
                  <th>{ui("Status")}</th>
                  <th>{ui("Expected")}</th>
                  <th>{ui("Receiving")}</th>
                  <th>{ui("Variance")}</th>
                  <th>{ui("Next action")}</th>
                  <th>{ui("Estimated cost")}</th>
                  <th>{ui("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPurchaseOrders.map((row) => {
                  const causesSidebarAttention = purchaseOrderAttentionIds.has(row.id);
                  return (
                  <tr
                    key={row.id}
                    className={row.id === selectedId ? 'purchase-orders-row--selected' : undefined}
                    onClick={() => setSelectedId(row.id)}
                    style={causesSidebarAttention ? sidebarAttentionItemStyle : undefined}
                    data-sidebar-attention-item={causesSidebarAttention ? "true" : undefined}
                  >
                    <td>
                      <button
                        type="button"
                        className="purchase-orders-po-link"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(row.id);
                          navigateWorkspaceSection('detail', detailRef.current);
                        }}
                      >
                        {row.po_number}
                      </button>
                      {causesSidebarAttention ? <div style={{ marginTop: 6 }}><SidebarAttentionMarker label={ui('Attention required')} /></div> : null}
                      <small>{ui("Created")} {formatDate(row.created_at)}</small>
                    </td>
                    <td>{row.supplier_name}</td>
                    <td><span style={{ ...styles.badge, ...badgeStyle(row.status) }}>{purchaseOrderStatusLabel(row.status)}</span></td>
                    <td>
                      <strong>{formatDate(row.expected_delivery_date)}</strong>
                      <span style={{ ...styles.badge, ...deliveryBadgeStyle(row.delivery_status) }}>{deliveryStatusLabel(row.delivery_status)}</span>
                    </td>
                    <td>
                      <span style={{ ...styles.badge, ...receivingBadgeStyle(row.receiving_status) }}>{receivingStatusLabel(row.receiving_status)}</span>
                      <small>{formatNumber(row.total_received_quantity)} / {formatNumber(row.total_quantity)} {ui("received ·")} {formatNumber(row.linked_shipment_count)} {ui("shipment(s)")}</small>
                    </td>
                    <td>
                      <span style={{ ...styles.badge, ...varianceBadgeStyle(row.variance_status) }}>{varianceStatusLabel(row.variance_status)}</span>
                      <small>{formatNumber(row.quantity_variance)} {ui("quantity variance")}</small>
                    </td>
                    <td><span style={{ ...styles.badge, ...nextActionBadgeStyle(row.next_action_status) }}>{nextActionLabel(row.next_action_status)}</span></td>
                    <td>{formatMoney(row.estimated_total_cost, row.currency)}</td>
                    <td>
                      <button
                        type="button"
                        className="app-button app-button--secondary purchase-orders-view-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(row.id);
                          navigateWorkspaceSection('detail', detailRef.current);
                        }}
                      >
                        {ui("View")}
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {!purchaseOrdersQuery.isLoading && !displayedPurchaseOrders.length ? (
                  <tr><td colSpan={9} className="purchase-orders-empty-cell">{ui("No purchase orders found.")}</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {displayedPurchaseOrders.length ? (
            <details className="purchase-orders-list-analysis">
              <summary>{ui("List analysis")} <span>{ui("Totals and filter breakdowns")}</span></summary>
              <div className="purchase-orders-analysis-content">
                <div className="purchase-orders-list-totals-grid">
                  <div><span>{ui("Filtered POs")}</span><strong>{formatNumber(filteredTotals.count)}</strong></div>
                  <div><span>{ui("Page POs")}</span><strong>{formatNumber(pageTotals.count)}</strong></div>
                  <div><span>{ui("Ordered qty")}</span><strong>{formatNumber(filteredTotals.orderedQuantity)}</strong></div>
                  <div><span>{ui("Received qty")}</span><strong>{formatNumber(filteredTotals.receivedQuantity)}</strong></div>
                  <div><span>{ui("Remaining qty")}</span><strong>{formatNumber(filteredTotals.remainingQuantity)}</strong></div>
                  <div><span>{ui("Open shipments")}</span><strong>{formatNumber(filteredTotals.openLinkedShipmentCount)}</strong></div>
                  <div><span>{ui("Filtered value")}</span><strong>{formatAggregateMoney(displayedPurchaseOrders, (row) => row.estimated_total_cost)}</strong></div>
                  <div><span>{ui("Remaining value")}</span><strong>{formatAggregateMoney(displayedPurchaseOrders, (row) => row.remaining_estimated_cost)}</strong></div>
                </div>

                <div className="purchase-orders-breakdown-grid">
                  <div>
                    <strong>{ui("Status")}</strong>
                    <div className="purchase-orders-breakdown-chips">
                      {['draft', 'submitted', 'approved', 'completed', 'cancelled'].map((status) => (
                        <button key={status} type="button" onClick={() => setFilters((current) => ({ ...current, status }))}>{purchaseOrderStatusLabel(status)}: {formatNumber(filteredBreakdowns.statuses[status] || 0)}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong>{ui("Receiving")}</strong>
                    <div className="purchase-orders-breakdown-chips">
                      {['not_applicable', 'not_started', 'partially_received', 'received'].map((status) => (
                        <button key={status} type="button" onClick={() => setFilters((current) => ({ ...current, receivingStatus: status }))}>{receivingStatusLabel(status)}: {formatNumber(filteredBreakdowns.receivingStatuses[status] || 0)}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong>{ui("Delivery")}</strong>
                    <div className="purchase-orders-breakdown-chips">
                      {['no_date', 'upcoming', 'due_today', 'overdue', 'fulfilled', 'cancelled'].map((status) => (
                        <button key={status} type="button" onClick={() => setFilters((current) => ({ ...current, deliveryStatus: status }))}>{deliveryStatusLabel(status)}: {formatNumber(filteredBreakdowns.deliveryStatuses[status] || 0)}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <strong>{ui("Next action")}</strong>
                    <div className="purchase-orders-breakdown-chips">
                      {['submit_for_approval', 'approve_or_cancel', 'create_shipment', 'receive_open_shipment', 'follow_up_overdue', 'monitor_receiving', 'none_completed', 'none_cancelled', 'none'].map((status) => (
                        <button key={status} type="button" onClick={() => setFilters((current) => ({ ...current, nextActionStatus: status }))}>{nextActionLabel(status)}: {formatNumber(filteredBreakdowns.nextActions[status] || 0)}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </details>
          ) : null}

          {displayedPurchaseOrders.length ? (
            <div className="purchase-orders-pagination">
              <span>{ui("Showing")} {formatNumber((Math.min(Math.max(currentPage, 1), totalPages) - 1) * pageSize + 1)}–{formatNumber(Math.min(Math.min(Math.max(currentPage, 1), totalPages) * pageSize, displayedPurchaseOrders.length))} {ui("of")} {formatNumber(displayedPurchaseOrders.length)} {ui("purchase orders")}</span>
              <div>
                <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} aria-label={ui("Purchase orders per page")}>
                  <option value={10}>{ui("10 / page")}</option>
                  <option value={25}>{ui("25 / page")}</option>
                  <option value={50}>{ui("50 / page")}</option>
                  <option value={100}>{ui("100 / page")}</option>
                </select>
                <button type="button" className="app-button app-button--secondary" disabled={currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>{ui("Previous")}</button>
                <strong>{ui("Page")} {formatNumber(Math.min(Math.max(currentPage, 1), totalPages))} {ui("of")} {formatNumber(totalPages)}</strong>
                <button type="button" className="app-button app-button--secondary" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>{ui("Next")}</button>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div ref={createRef} id="purchase-order-create" className="purchase-orders-scroll-anchor">
        <form id="purchase-order-form" className="app-panel purchase-orders-card purchase-orders-form-card" onSubmit={submitForm}>
          <OperationalSectionHeader
            iconPath="/purchase-orders"
            title={editingId ? ui('Edit purchase order draft') : ui('Create purchase order')}
            description={editingId ? ui('Update the selected draft before it is submitted for approval.') : ui('Create a draft supplier order. Submit it, approve it, send it to the supplier, then receive the delivery later.')}
            actions={<button type="button" className="app-button app-button--secondary" onClick={addItem}>{ui("Add item")}</button>}
          />

          <div className="purchase-orders-form-grid">
            <label className="purchase-orders-field purchase-orders-field--wide">
              <span>{ui("Supplier")}</span>
              <select
                value={form.supplier_id}
                onChange={(event) => {
                  const supplierId = event.target.value;
                  setForm((current) => current.supplier_id === supplierId ? current : ({
                    ...current,
                    supplier_id: supplierId,
                    items: current.items.map((line) => ({ ...line, product_id: '', uom_code: '', unit_cost: '' }))
                  }));
                }}
                disabled={!capabilities.canCreatePurchaseOrders && !capabilities.canUpdatePurchaseOrders}
              >
                <option value="">{ui("Select supplier")}</option>
                {(suppliersQuery.data || []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label className="purchase-orders-field">
              <span>{ui("PO number")}</span>
              <input value={form.po_number} onChange={(event) => setForm((current) => ({ ...current, po_number: event.target.value }))} placeholder={ui("Auto-generated if empty")} />
            </label>
            <label className="purchase-orders-field">
              <span>{ui("Expected delivery")}</span>
              <input type="date" value={form.expected_delivery_date} onChange={(event) => setForm((current) => ({ ...current, expected_delivery_date: event.target.value }))} />
            </label>
            <label className="purchase-orders-field purchase-orders-field--full">
              <span>{ui("Internal notes")}</span>
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder={ui("Optional notes for your team")} />
            </label>
          </div>

          <div className="purchase-orders-items-heading">
            <div><strong>{ui("Order items")}</strong><span>{ui("Add the products, quantities, ordering units, and supplier purchase prices for this order.")}</span></div>
          </div>

          <div className="purchase-orders-item-list">
            {form.items.map((item, index) => (
              <div key={index} className="purchase-orders-item-card">
                <div className="purchase-orders-item-card-header">
                  <strong>{ui("Item")} {index + 1}</strong>
                  <button type="button" className="purchase-orders-remove-button" onClick={() => removeItem(index)} disabled={form.items.length <= 1}>{ui("Remove")}</button>
                </div>
                <div className="purchase-orders-item-grid">
                  <label className="purchase-orders-field">
                    <span>{ui("Product")}</span>
                    <select
                      value={item.product_id}
                      onChange={(event) => {
                        const productId = event.target.value;
                        const option = supplierProducts.find((product) => product.id === productId);
                        const supplierCurrency = String(option?.current_supplier_price_currency || '').toUpperCase();
                        const poCurrency = String(purchaseOrderFormCurrency || '').toUpperCase();
                        const supplierPrice = option?.current_supplier_unit_cost;
                        const canPrefill = supplierPrice !== null
                          && supplierPrice !== undefined
                          && Number.isFinite(Number(supplierPrice))
                          && (!supplierCurrency || supplierCurrency === poCurrency);
                        updateItem(index, {
                          product_id: productId,
                          uom_code: '',
                          unit_cost: canPrefill ? String(Number(supplierPrice)) : ''
                        });
                      }}
                      disabled={!form.supplier_id || purchaseOrderCreateOptionsQuery.isLoading}
                    >
                      <option value="">
                        {!form.supplier_id
                          ? ui('Select a supplier first')
                          : purchaseOrderCreateOptionsQuery.isLoading
                            ? ui('Loading supplier products…')
                            : ui('Select product')}
                      </option>
                      {supplierProducts.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.unit})</option>)}
                    </select>
                    <small className="purchase-orders-field-help">{form.supplier_id ? (supplierProducts.length ? ui('Only products assigned to the selected supplier are shown.') : ui('No products are assigned to this supplier. Assign products to the supplier on the Products page first.')) : ui('Choose a supplier before selecting products.')}</small>
                  </label>
                  <label className="purchase-orders-field">
                    <span>{ui("Quantity")}</span>
                    <input type="number" min="0" step="any" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} placeholder="0" />
                  </label>
                  <label className="purchase-orders-field">
                    <span>{ui("Ordering unit")}</span>
                    <ProductUomSelect
                      productId={item.product_id}
                      value={item.uom_code}
                      purpose="purchase"
                      onChange={(value) => updateItem(index, { uom_code: value })}
                      onSelectionChange={({ code, factorToBase }) => {
                        const option = supplierProducts.find((product) => product.id === item.product_id);
                        const supplierCurrency = String(option?.current_supplier_price_currency || '').toUpperCase();
                        const poCurrency = String(purchaseOrderFormCurrency || '').toUpperCase();
                        const supplierPrice = option?.current_supplier_unit_cost;
                        const canPrefill = supplierPrice !== null
                          && supplierPrice !== undefined
                          && Number.isFinite(Number(supplierPrice))
                          && (!supplierCurrency || supplierCurrency === poCurrency);
                        updateItem(index, {
                          uom_code: code,
                          unit_cost: canPrefill ? String(Number(supplierPrice) * factorToBase) : ''
                        });
                      }}
                      ariaLabel={`Unit of measure for purchase order line ${index + 1}`}
                    />
                  </label>
                  <label className="purchase-orders-field">
                    <span>{ui("Purchase price per unit")}</span>
                    <input type="number" min="0" step="any" value={item.unit_cost} onChange={(event) => updateItem(index, { unit_cost: event.target.value })} placeholder={ui("Required before submit")} />
                    {(() => {
                      const option = supplierProducts.find((product) => product.id === item.product_id);
                      const supplierCurrency = String(option?.current_supplier_price_currency || '').toUpperCase();
                      const poCurrency = String(purchaseOrderFormCurrency || '').toUpperCase();
                      if (!item.product_id) return <small className="purchase-orders-field-help">{ui('Choose a product to load its current supplier price.')}</small>;
                      if (option?.current_supplier_unit_cost === null || option?.current_supplier_unit_cost === undefined) {
                        return <small className="purchase-orders-field-help">{ui('No current supplier price is stored. Enter the price agreed for this purchase order.')}</small>;
                      }
                      if (supplierCurrency && supplierCurrency !== poCurrency) {
                        return <small className="purchase-orders-field-help">{ui('The stored supplier price uses {currency}, while this purchase order uses {poCurrency}. Enter the agreed price in {poCurrency}.').replace('{currency}', supplierCurrency).replaceAll('{poCurrency}', poCurrency)}</small>;
                      }
                      return <small className="purchase-orders-field-help">{ui("The selected supplier's current price is prefilled. Change it only if this order has a different quoted price.")}</small>;
                    })()}
                    <small className="purchase-orders-field-help">{ui("This is the supplier's purchase price for this order, not the product standard cost.")}</small>
                  </label>
                  <div className="purchase-orders-line-total">
                    <span>{ui("Line total")}</span>
                    <strong>
                      {item.quantity.trim() !== '' && item.unit_cost.trim() !== '' && Number.isFinite(Number(item.quantity)) && Number.isFinite(Number(item.unit_cost))
                        ? formatMoney(Number(item.quantity) * Number(item.unit_cost), purchaseOrderFormCurrency)
                        : '—'}
                    </strong>
                  </div>
                  <label className="purchase-orders-field purchase-orders-field--full">
                    <span>{ui("Item note")}</span>
                    <input value={item.notes} onChange={(event) => updateItem(index, { notes: event.target.value })} placeholder={ui("Optional item note")} />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {formError ? <p style={styles.error}>{formError}</p> : null}
          {(createMutation.error || updateMutation.error) ? <p style={styles.error}>{formMutationError}</p> : null}

          <div className="purchase-orders-form-footer">
            <span>{ui("Draft purchase orders do not change stock. Stock is received later through linked shipments.")}</span>
            <div>
              {editingId ? <button type="button" className="app-button app-button--secondary" onClick={resetForm}>{ui("Cancel edit")}</button> : null}
              <button type="submit" className="app-button app-button--primary" disabled={createMutation.isPending || updateMutation.isPending || (!editingId && !capabilities.canCreatePurchaseOrders) || Boolean(editingId && !capabilities.canUpdatePurchaseOrders)}>
                {editingId ? ui('Save draft') : ui('Create draft')}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div ref={detailRef} id="purchase-order-detail" className="purchase-orders-scroll-anchor">
        <section className="app-panel purchase-orders-card purchase-orders-detail-card">
          <OperationalSectionHeader
            iconPath="/audit"
            title={selectedDetail ? selectedDetail.po_number : ui('Purchase order detail')}
            description={selectedDetail ? ui('{supplier} · review order progress, receiving, and available actions.').replace('{supplier}', selectedDetail.supplier_name) : ui('Select an order from the registry to review its details and actions.')}
            actions={selectedDetail ? (
              <div className="purchase-orders-header-actions">
                <button type="button" className="app-button app-button--secondary" onClick={exportSelectedPurchaseOrderCsv}>{ui("Export detail")}</button>
                <button type="button" className="app-button app-button--secondary" onClick={printSelectedPurchaseOrderDetail}>{ui("Print detail")}</button>
              </div>
            ) : undefined}
          />

          {!selectedId ? <div className="purchase-orders-empty-state">{ui("Choose a purchase order from the registry above to review its status, items, shipments, and next action.")}</div> : null}
          {detailQuery.isLoading ? <p className="purchase-orders-muted">{ui("Loading purchase order detail…")}</p> : null}
          {detailQuery.error ? <p style={styles.error}>{normalizeError(detailQuery.error, ui('Failed to load purchase order.'), ui)}</p> : null}

          {selectedDetail ? (
            <>
              <div className="purchase-orders-detail-summary">
                <div><span>{ui("Status")}</span><strong><span style={{ ...styles.badge, ...badgeStyle(selectedDetail.status) }}>{purchaseOrderStatusLabel(selectedDetail.status)}</span></strong></div>
                <div><span>{ui("Next action")}</span><strong><span style={{ ...styles.badge, ...nextActionBadgeStyle(selectedDetail.next_action_status) }}>{nextActionLabel(selectedDetail.next_action_status)}</span></strong></div>
                <div><span>{ui("Expected delivery")}</span><strong>{formatDate(selectedDetail.expected_delivery_date)}</strong></div>
                <div><span>{ui("Estimated cost")}</span><strong>{formatMoney(selectedDetail.estimated_total_cost, selectedDetail.currency)}</strong></div>
                <div><span>{ui("Receiving")}</span><strong>{formatNumber(selectedDetail.receiving_summary?.received_quantity)} / {formatNumber(selectedDetail.receiving_summary?.ordered_quantity)}</strong><small>{formatPercent(selectedDetail.receiving_summary?.receiving_percent)} {ui("received")}</small></div>
                <div><span>{ui("Remaining")}</span><strong>{formatNumber(selectedDetail.receiving_summary?.remaining_quantity)}</strong><small>{formatMoney(selectedDetail.receiving_summary?.remaining_estimated_cost ?? selectedDetail.remaining_estimated_cost, selectedDetail.currency)} {ui("remaining value")}</small></div>
                <div><span>{ui("Variance")}</span><strong><span style={{ ...styles.badge, ...varianceBadgeStyle(selectedDetail.receiving_summary?.variance_status) }}>{varianceStatusLabel(selectedDetail.receiving_summary?.variance_status)}</span></strong><small>{formatNumber(selectedDetail.receiving_summary?.quantity_variance)} {ui("quantity variance")}</small></div>
                <div><span>{ui("Linked shipments")}</span><strong>{formatNumber(selectedDetail.receiving_summary?.linked_shipment_count)}</strong><small>{formatNumber(selectedDetail.receiving_summary?.open_linked_shipment_count)} {ui("open")}</small></div>
              </div>

              <div className="purchase-orders-detail-status-row">
                <span style={{ ...styles.badge, ...receivingBadgeStyle(selectedDetail.receiving_summary?.receiving_status) }}>{receivingStatusLabel(selectedDetail.receiving_summary?.receiving_status)}</span>
                <span style={{ ...styles.badge, ...deliveryBadgeStyle(selectedDetail.delivery_status) }}>{deliveryStatusLabel(selectedDetail.delivery_status)}</span>
                {selectedIsLocked ? <span style={{ ...styles.badge, ...styles.lockedBadge }}>{ui("Locked")}</span> : null}
              </div>

              {selectedDetail.notes ? <div className="purchase-orders-note-box"><strong>{ui("Internal notes")}</strong><p>{selectedDetail.notes}</p></div> : null}

              {selectedIsLocked ? <p className="purchase-orders-muted">{ui("This order is no longer an editable draft. Continue through shipment, receiving, or lifecycle actions instead.")}</p> : null}
              {actionMutation.error ? <p style={styles.error}>{actionError}</p> : null}
              {selectedCostIssue ? <div style={styles.commercialWarningBox}><strong>{ui("Commercial cost review required.")}</strong> {selectedCostIssue}</div> : null}

              <div className="purchase-orders-primary-actions">
                {selectedCanEdit && capabilities.canUpdatePurchaseOrders ? <button type="button" className="app-button app-button--secondary" onClick={startEdit}>{ui("Edit draft")}</button> : null}
                {selectedCanSubmit && capabilities.canSubmitPurchaseOrders ? (
                  <button type="button" className={`app-button ${selectedCostIssue ? 'purchase-orders-blocked-action' : 'app-button--primary'}`} disabled={actionMutation.isPending} aria-disabled={Boolean(selectedCostIssue)} title={selectedCostIssue || ui('Submit this purchase order for approval')} onClick={submitSelectedPurchaseOrder}>
                    {actionMutation.isPending ? ui('Submitting…') : selectedCostIssue ? ui('Submit blocked') : ui('Submit for approval')}
                  </button>
                ) : null}
                {selectedCanApprove && capabilities.canApprovePurchaseOrders ? (
                  <button type="button" className={`app-button ${selectedCostIssue || selectedSelfApprovalBlocked ? 'purchase-orders-blocked-action' : 'app-button--primary'}`} disabled={actionMutation.isPending || selectedSelfApprovalBlocked} aria-disabled={Boolean(selectedCostIssue || selectedSelfApprovalBlocked)} title={selectedCostIssue || (selectedSelfApprovalBlocked ? ui('A different employee must approve this purchase order.') : ui('Approve this purchase order'))} onClick={approveSelectedPurchaseOrder}>
                    {actionMutation.isPending ? ui('Approving…') : selectedCostIssue ? ui('Approve blocked') : selectedSelfApprovalBlocked ? ui('Different approver required') : ui('Approve order')}
                  </button>
                ) : null}
              </div>

              {selectedCanSendPurchaseOrder ? (
                <div className="purchase-orders-action-panel">
                  <div><strong>{ui("Send to supplier")}</strong><span>{ui("Send the approved Purchase Order. Receiving is prepared automatically.")}</span></div>
                  {!selectedOpenShipment && !selectedDetail.expected_delivery_date ? (
                    <label className="purchase-orders-field"><span>{ui("Delivery date")}</span><input type="date" value={shipmentDeliveryDate} onChange={(event) => setShipmentDeliveryDate(event.target.value)} /></label>
                  ) : null}
                  <button
                    type="button"
                    className="app-button app-button--primary"
                    disabled={preparePurchaseOrderSupplierEmailMutation.isPending || sendPurchaseOrderToSupplierMutation.isPending}
                    onClick={prepareSelectedPurchaseOrderEmail}
                  >
                    {preparePurchaseOrderSupplierEmailMutation.isPending ? ui('Preparing Preview...') : ui('Send to supplier')}
                  </button>
                  {preparePurchaseOrderSupplierEmailMutation.error ? <p style={styles.error}>{normalizeError(preparePurchaseOrderSupplierEmailMutation.error, ui('Failed to prepare supplier email preview.'), ui)}</p> : null}
                </div>
              ) : null}

              {/*
                v3.49.118: Manual Create shipment is intentionally not exposed in the
                normal Purchase Order workflow. Sending an approved PO prepares or
                reuses the open receiving shipment automatically, then uses the same
                shipment-backed supplier email/PDF/QR pipeline.

                {selectedCanCreateShipment && capabilities.canManageShipments ? (
                  <div className="purchase-orders-action-panel">
                    <div><strong>{ui("Create shipment")}</strong></div>
                    <button type="button">{ui("Create shipment")}</button>
                  </div>
                ) : null}
              */}

              {/*
                v3.49.116: Inbound reservation action intentionally hidden. It was a
                planning-only record and made the normal PO -> Shipment receiving flow
                look like there were two competing ways to receive supplier goods.

                {selectedCanCreateInboundReservation ? (
                  <div className="purchase-orders-action-panel">
                    <div><strong>{ui("Create inbound reservation")}</strong><span>{ui("Track the expected inbound quantity without reserving current on-hand stock.")}</span></div>
                    <button type="button" className="app-button app-button--secondary" disabled={createInboundReservationMutation.isPending} onClick={() => createInboundReservationMutation.mutate({ id: selectedDetail.id, version: selectedDetail.version })}>{createInboundReservationMutation.isPending ? ui('Creating reservation…') : ui('Create inbound reservation')}</button>
                    {createInboundReservationMutation.error ? <p style={styles.error}>{createInboundReservationError}</p> : null}
                  </div>
                ) : null}
              */}

              {selectedCanClose && capabilities.canCancelPurchaseOrders ? (
                <div className="purchase-orders-action-panel purchase-orders-action-panel--danger">
                  <div><strong>{ui("Close order with remaining quantity")}</strong><span>{ui("Use this when the supplier will not deliver the remaining quantity. Existing stock and shipments are not changed.")}</span></div>
                  <label className="purchase-orders-field"><span>{ui("Close reason")}</span><input value={closeReason} onChange={(event) => setCloseReason(event.target.value)} placeholder={ui("Reason required")} /></label>
                  <button type="button" className="app-button purchase-orders-danger-button" disabled={actionMutation.isPending} onClick={() => {
                    if (!closeReason.trim()) { showTenantActionError(ui('Close reason is required.')); return; }
                    if (window.confirm(ui('Close this purchase order and cancel any remaining undelivered quantity?'))) actionMutation.mutate({ id: selectedDetail.id, action: 'close', body: { reason: closeReason }, version: selectedDetail.version });
                  }}>{actionMutation.isPending ? ui('Closing…') : ui('Close order')}</button>
                </div>
              ) : null}

              {selectedCanReopen && capabilities.canCancelPurchaseOrders ? (
                <div className="purchase-orders-action-panel">
                  <div><strong>{ui("Reopen manually closed order")}</strong><span>{ui("Use this only when remaining quantity still needs to be received.")}</span></div>
                  <button type="button" className="app-button app-button--secondary" disabled={actionMutation.isPending} onClick={() => { if (window.confirm(ui('Reopen this manually closed purchase order?'))) actionMutation.mutate({ id: selectedDetail.id, action: 'reopen', version: selectedDetail.version }); }}>{actionMutation.isPending ? ui('Reopening…') : ui('Reopen order')}</button>
                </div>
              ) : null}

              {selectedCanCancel && capabilities.canCancelPurchaseOrders ? (
                <div className="purchase-orders-action-panel purchase-orders-action-panel--danger">
                  <div><strong>{ui("Cancel order")}</strong><span>{ui("Available while the order is still draft or submitted.")}</span></div>
                  <label className="purchase-orders-field"><span>{ui("Cancellation reason")}</span><input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder={ui("Optional reason")} /></label>
                  <button type="button" className="app-button purchase-orders-danger-button" disabled={actionMutation.isPending} onClick={() => { if (window.confirm(ui('Cancel this purchase order?'))) actionMutation.mutate({ id: selectedDetail.id, action: 'cancel', body: { reason: cancelReason }, version: selectedDetail.version }); }}>{actionMutation.isPending ? ui('Cancelling…') : ui('Cancel order')}</button>
                </div>
              ) : null}

              <div className="purchase-orders-subsection-heading"><strong>{ui("Order items")}</strong><span>{ui("Ordered, received, remaining, and estimated value by product.")}</span></div>
              <div className="purchase-orders-table-wrap">
                <table className="purchase-orders-table purchase-orders-table--detail">
                  <thead><tr><th>{ui("Product")}</th><th>{ui("Qty")}</th><th>{ui("Received")}</th><th>{ui("Remaining")}</th><th>{ui("Status")}</th><th>{ui("Variance")}</th><th>{ui("Cost / unit")}</th><th>{ui("Total")}</th><th>{ui("Received value")}</th><th>{ui("Remaining value")}</th></tr></thead>
                  <tbody>
                    {selectedDetail.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{formatNumber(item.entered_quantity ?? item.quantity)} {item.uom_code || item.product_unit}{String(item.uom_code || item.product_unit).toUpperCase() !== String(item.product_unit).toUpperCase() ? <small>{formatNumber(item.quantity)} {item.product_unit} {ui("base")}</small> : null}</td>
                        <td>{formatNumber(item.received_quantity)} {item.product_unit}</td>
                        <td>{formatNumber(item.remaining_quantity)} {item.product_unit}</td>
                        <td><span style={{ ...styles.badge, ...receivingBadgeStyle(item.receiving_status) }}>{receivingStatusLabel(item.receiving_status)}</span><small>{formatPercent(item.receiving_percent)}</small></td>
                        <td><span style={{ ...styles.badge, ...varianceBadgeStyle(item.variance_status) }}>{varianceStatusLabel(item.variance_status)}</span><small>{formatNumber(item.quantity_variance)}</small></td>
                        <td>{formatMoney(item.unit_cost, selectedDetail.currency)}<small>{ui("per")} {item.uom_code || item.product_unit}</small></td>
                        <td>{formatMoney(item.estimated_line_total, selectedDetail.currency)}</td>
                        <td>{formatMoney(item.received_estimated_cost, selectedDetail.currency)}</td>
                        <td>{formatMoney(item.remaining_estimated_cost, selectedDetail.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(selectedDetail.linked_shipments || []).length ? (
                <>
                  <div className="purchase-orders-subsection-heading"><strong>{ui("Linked shipments")}</strong><span>{ui("Receiving records created from this purchase order.")}</span></div>
                  <div className="purchase-orders-table-wrap">
                    <table className="purchase-orders-table purchase-orders-table--compact">
                      <thead><tr><th>{ui("Shipment")}</th><th>{ui("Status")}</th><th>{ui("Delivery")}</th><th>{ui("Received")}</th><th>{ui("Action")}</th></tr></thead>
                      <tbody>
                        {(selectedDetail.linked_shipments || []).map((shipment) => (
                          <tr key={shipment.id}>
                            <td>{shipment.po_number || shipment.qr_code || shipment.id}</td>
                            <td>{shipment.status}</td>
                            <td>{formatDate(shipment.delivery_date)}</td>
                            <td>{formatNumber(shipment.received_quantity)} / {formatNumber(shipment.ordered_quantity)}</td>
                            <td><button type="button" className="app-button app-button--secondary" onClick={() => navigate(`/shipments?shipmentId=${encodeURIComponent(shipment.id)}`)}>{ui("Open shipment")}</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}

              <div className="purchase-orders-subsection-heading"><strong>{ui("Lifecycle")}</strong><span>{ui("Who moved this order through its procurement states and when.")}</span></div>
              <div className="purchase-orders-lifecycle">
                {selectedLifecycleEvents.map((event) => (
                  <div key={event.label}><span>{event.label}</span><strong>{formatDateTime(event.value)}</strong>{event.actor ? <small>{ui("By")} {event.actor}</small> : <small>{ui("Actor not recorded")}</small>}</div>
                ))}
              </div>

              {selectedDetail.status === 'completed' ? (
                <div className="purchase-orders-completion-note">
                  <strong>{completionTypeLabel(selectedDetail.completion_type)}</strong>
                  <span>{selectedDetail.completion_reason || ui('No completion reason recorded.')}</span>
                  <small>{selectedDetail.completed_by_user_name ? ui('Completed by {name}').replace('{name}', selectedDetail.completed_by_user_name) : ui('Completing user not recorded')}</small>
                </div>
              ) : null}

              {capabilities.canViewAudit ? (
                <details className="purchase-orders-audit-details">
                  <summary>{ui("Audit history")} <span>{(auditQuery.data || []).length} {ui("event(s)")}</span></summary>
                  <div className="purchase-orders-audit-content">
                    <div className="purchase-orders-audit-toolbar">
                      <label className="purchase-orders-field purchase-orders-field--search"><span>{ui("Search audit history")}</span><input value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} placeholder={ui("Action, person, or date")} /></label>
                      <button type="button" className="app-button app-button--secondary" onClick={exportSelectedPurchaseOrderAuditCsv} disabled={auditQuery.isLoading || !selectedAuditEvents.length}>{ui("Export audit CSV")}</button>
                      <button type="button" className="app-button app-button--secondary" onClick={printSelectedPurchaseOrderAudit} disabled={auditQuery.isLoading || !selectedAuditEvents.length}>{ui("Print audit")}</button>
                      {auditSearch ? <button type="button" className="app-button app-button--secondary" onClick={() => setAuditSearch('')}>{ui("Clear search")}</button> : null}
                    </div>
                    {auditQuery.isLoading ? <p className="purchase-orders-muted">{ui("Loading audit history…")}</p> : null}
                    {auditQuery.error ? <p style={styles.error}>{ui("Failed to load purchase order audit history.")}</p> : null}
                    {selectedAuditEvents.length ? (
                      <div className="purchase-orders-audit-list">
                        {selectedAuditEvents.map((event) => {
                          const metadataSummary = auditMetadataSummary(event.metadata);
                          return (
                            <div key={event.id} className="purchase-orders-audit-item">
                              <div><strong>{event.action}</strong><span>{formatDateTime(event.created_at)} · {auditActorLabel(event)}</span></div>
                              {metadataSummary !== '-' ? <details><summary>{ui("Event details")}</summary><p>{metadataSummary}</p></details> : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : !auditQuery.isLoading && !auditQuery.error ? <p className="purchase-orders-muted">{ui("No audit events match the current search.")}</p> : null}
                  </div>
                </details>
              ) : null}

              {isEditingSelectedDraft ? <p className="purchase-orders-muted">{ui("This draft is currently open in the edit form above.")}</p> : null}
            </>
          ) : null}
        </section>
      </div>

      {supplierEmailPreview ? (
        <div style={styles.emailPreviewOverlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSupplierEmailPreview(); }}>
          <section style={styles.emailPreviewModal} role="dialog" aria-modal="true" aria-labelledby="purchase-order-supplier-email-preview-title">
            <div style={styles.emailPreviewHeader}>
              <div>
                <h3 id="purchase-order-supplier-email-preview-title" style={styles.emailPreviewTitle}>{ui('Supplier Email Preview')}</h3>
                <div className="purchase-orders-muted">{ui('Review the recipient, message, {documentTitle}, and Receiving QR. Nothing has been sent yet.').replace('{documentTitle}', supplierEmailPreview.document.document_title)}</div>
              </div>
              <button type="button" className="app-button app-button--secondary" onClick={closeSupplierEmailPreview} disabled={sendPurchaseOrderToSupplierMutation.isPending}>{ui('Close')}</button>
            </div>

            <div style={styles.emailPreviewFields}>
              <label className="purchase-orders-field">
                <span>{ui('To')}</span>
                <input type="email" value={supplierEmailRecipient} onChange={(event) => setSupplierEmailRecipient(event.target.value)} disabled={sendPurchaseOrderToSupplierMutation.isPending} />
              </label>
              <label className="purchase-orders-field">
                <span>{ui('Subject')}</span>
                <input value={supplierEmailPreview.subject} readOnly />
              </label>
              <label className="purchase-orders-field purchase-orders-field--full">
                <span>{ui('Optional email message')}</span>
                <textarea style={styles.emailMessageInput} value={supplierEmailMessage} onChange={(event) => setSupplierEmailMessage(event.target.value)} maxLength={4000} disabled={sendPurchaseOrderToSupplierMutation.isPending} placeholder={ui('Optional message to supplier')} />
              </label>
            </div>

            <div style={styles.documentPreview}>
              <div style={styles.documentPreviewHeader}>
                <div>
                  <div style={styles.documentTitle}>{supplierEmailPreview.document.document_title}</div>
                  <div className="purchase-orders-muted">{ui('PO / Reference')}: {supplierEmailPreview.document.po_number || supplierEmailPreview.document.shipment_id}</div>
                </div>
                {supplierEmailPreview.qr_image_data_uri ? <img src={supplierEmailPreview.qr_image_data_uri} alt={ui('Receiving QR code')} style={styles.previewQr} /> : null}
              </div>

              <div style={styles.documentPartyGrid}>
                <div style={styles.documentPartyCard}>
                  <strong>{ui('Buyer / Delivery To')}</strong>
                  <span>{supplierEmailPreview.document.buyer.name}</span>
                  <span>{supplierEmailPreview.document.buyer.address || ui('Business address not recorded')}</span>
                  <span>{supplierEmailPreview.document.buyer.email || ui('Business email not recorded')}</span>
                  <span>{supplierEmailPreview.document.buyer.phone || ui('Business phone not recorded')}</span>
                  {supplierEmailPreview.document.buyer.tax_id ? <span>{ui('Tax / VAT ID:')} {supplierEmailPreview.document.buyer.tax_id}</span> : null}
                </div>
                <div style={styles.documentPartyCard}>
                  <strong>{ui('Supplier')}</strong>
                  <span>{supplierEmailPreview.document.supplier.name}</span>
                  <span>{supplierEmailPreview.document.supplier.address || ui('Supplier address not recorded')}</span>
                  <span>{supplierEmailPreview.document.supplier.email || supplierEmailRecipient}</span>
                  <span>{supplierEmailPreview.document.supplier.phone || ui('Supplier phone not recorded')}</span>
                  {supplierEmailPreview.document.supplier.tax_id ? <span>{ui('Tax / VAT ID:')} {supplierEmailPreview.document.supplier.tax_id}</span> : null}
                </div>
              </div>

              <div style={styles.documentMetaGrid}>
                <span><strong>{ui('Issue:')}</strong> {formatDate(supplierEmailPreview.document.issue_date)}</span>
                <span><strong>{ui('Expected delivery:')}</strong> {formatDate(supplierEmailPreview.document.expected_delivery_date)}</span>
                <span><strong>{ui('Delivery address:')}</strong> {supplierEmailPreview.document.delivery_address || ui('Not specified')}</span>
                <span><strong>{ui('Payment terms:')}</strong> {supplierEmailPreview.document.payment_terms || ui('Not specified')}</span>
                <span><strong>{ui('Approved by:')}</strong> {supplierEmailPreview.document.approved_by || ui('Not specified')}</span>
                <span><strong>{ui('Currency:')}</strong> {supplierEmailPreview.document.currency || ui('Not specified')}</span>
              </div>

              {supplierEmailPreview.document.notes ? <div style={styles.documentNotes}><strong>{ui('PO notes')}:</strong> {supplierEmailPreview.document.notes}</div> : null}

              <div className="purchase-orders-table-wrap">
                <table className="purchase-orders-table purchase-orders-table--detail">
                  <thead><tr><th>{ui('SKU')}</th><th>{ui('Product')}</th><th>{ui('Qty')}</th><th>{ui('UoM')}</th><th>{ui('Unit price')}</th><th>{ui('Line total')}</th></tr></thead>
                  <tbody>
                    {supplierEmailPreview.document.items.map((item) => (
                      <tr key={item.product_id}>
                        <td>{item.supplier_sku || item.sku || ui('Not specified')}</td>
                        <td>{item.product_name}</td>
                        <td>{formatNumber(item.quantity)}</td>
                        <td>{item.unit || ui('Not specified')}</td>
                        <td>{item.unit_price == null ? ui('Not specified') : formatMoney(item.unit_price, supplierEmailPreview.document.currency)}</td>
                        <td>{item.line_total == null ? ui('Not specified') : formatMoney(item.line_total, supplierEmailPreview.document.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.documentTotal}><strong>{ui('Order subtotal:')}</strong> {supplierEmailPreview.document.subtotal == null ? ui('Not specified') : formatMoney(supplierEmailPreview.document.subtotal, supplierEmailPreview.document.currency)}</div>
              {supplierEmailPreview.document.pricing_complete === false ? <div style={styles.emailPreviewWarning}>{ui('One or more lines do not have a recorded unit price. The document shows “Not specified” rather than inventing a value.')}</div> : null}
              <div style={styles.qrPurposeBox}>
                <strong>{ui('Receiving QR Code')}</strong>
                <span>{supplierEmailPreview.document.qr_code}</span>
                <span>{supplierEmailPreview.document.qr_purpose}</span>
              </div>
              <div style={styles.attachmentLine}>{ui('PDF attachment:')} <strong>{supplierEmailPreview.document.pdf_filename}</strong></div>
            </div>

            <div style={styles.emailConfirmationBox}>{ui('This email and attached {documentTitle} will be sent to {recipient}.').replace('{documentTitle}', supplierEmailPreview.document.document_title).replace('{recipient}', supplierEmailRecipient || ui('the entered recipient'))}</div>
            <div style={styles.emailPreviewActions}>
              <button type="button" className="app-button app-button--secondary" onClick={closeSupplierEmailPreview} disabled={sendPurchaseOrderToSupplierMutation.isPending}>{ui('Cancel')}</button>
              <button type="button" className="app-button app-button--primary" onClick={confirmPurchaseOrderEmailSend} disabled={sendPurchaseOrderToSupplierMutation.isPending || !supplierEmailRecipient.trim()}>
                {sendPurchaseOrderToSupplierMutation.isPending ? ui('Sending...') : ui('Confirm & Send Email')}
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
  emailMessageInput: { width: '100%', boxSizing: 'border-box', minHeight: 78, resize: 'vertical', border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 12px', fontSize: 14, background: '#ffffff' },
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
  error: { color: '#b91c1c', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 10, padding: 10 },
  commercialWarningBox: { color: '#9a3412', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: 12, lineHeight: 1.5 }
};
