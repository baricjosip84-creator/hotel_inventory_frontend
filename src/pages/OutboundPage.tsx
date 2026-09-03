import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError, getVersionConflictMessage, isVersionConflictError } from '../lib/api';
import { useAppTranslation } from '../i18n/I18nContext';
import { formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import ProductUomSelect from '../components/inventory/ProductUomSelect';
import { TenantNavIcon } from '../components/ui/TenantNavIcon';
import { OperationalSectionHeader, OperationalWorkspaceHero, OperationalWorkspaceMetaPill, OperationalWorkspaceStatCard, OperationalWorkspaceTab, OperationalWorkspaceTabs } from '../components/ui/OperationalWorkspace';
import './OutboundPage.css';

type Customer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  active: boolean;
  version: number;
};

type Product = { id: string; name: string; unit: string };
type Location = { id: string; name: string };

type OrderItem = {
  id: string;
  product_id: string;
  product_name: string | null;
  product_sku?: string | null;
  product_unit: string | null;
  storage_location_id: string;
  storage_location_name: string | null;
  quantity: number | string;
  entered_quantity?: number | string;
  uom_code?: string | null;
  dispatched_quantity: number | string;
  remaining_quantity: number | string;
  picked_quantity: number | string;
  open_picked_quantity: number | string;
  open_packed_quantity: number | string;
};

type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string | null;
  status: string;
  requested_date?: string | null;
  notes?: string | null;
  cancellation_reason?: string | null;
  created_at?: string | null;
  confirmed_at?: string | null;
  picking_started_at?: string | null;
  packed_at?: string | null;
  dispatched_at?: string | null;
  cancelled_at?: string | null;
  items: OrderItem[];
  version: number;
};

type Line = { product_id: string; storage_location_id: string; quantity: string; uom_code: string };

type PickLot = {
  id: string;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  available_to_pick: number;
};

type PickItem = OrderItem & {
  requires_lot_tracking: boolean;
  serial_tracking_enabled?: boolean;
  require_serial_on_issue?: boolean;
  available_serials?: Array<{ id: string; serial_number: string; inventory_lot_id?: string | null }>;
  requires_expiry_date: boolean;
  lots: PickLot[];
};

type PickOptions = {
  order: { id: string; order_number: string; status: string; version: number };
  items: PickItem[];
};

type TraceRow = {
  allocation_id: string;
  outbound_order_id: string;
  outbound_order_item_id: string;
  order_number: string;
  order_status: string;
  customer_name: string | null;
  storage_location_id: string;
  storage_location_name: string | null;
  product_name: string | null;
  product_sku?: string | null;
  product_unit: string | null;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  dispatched_quantity: number | string;
  claimed_return_quantity: number | string | null;
  returned_quantity: number | string | null;
  returnable_quantity: number | string | null;
  historical_serialized?: boolean;
  serial_tracking_enabled?: boolean;
  serial_numbers?: string[] | null;
  returnable_serial_numbers?: string[] | null;
};

type ReturnItem = {
  id: string;
  quantity: number | string;
  condition: string;
  notes?: string | null;
  serial_numbers?: string[];
  storage_location_id: string;
  storage_location_name: string | null;
  product_name: string | null;
  product_sku?: string | null;
  product_unit: string | null;
  lot_number?: string | null;
  batch_number?: string | null;
};

type CustomerReturn = {
  id: string;
  return_number: string;
  order_number: string | null;
  customer_name: string | null;
  status: string;
  reason: string;
  notes?: string | null;
  cancellation_reason?: string | null;
  created_at?: string | null;
  received_at?: string | null;
  cancelled_at?: string | null;
  items: ReturnItem[];
  version: number;
};

type OutboundSummary = {
  open_orders: number;
  confirmed_orders: number;
  picking_orders: number;
  packed_orders: number;
  partially_dispatched_orders: number;
  dispatched_orders_30d: number;
  units_waiting: number;
  units_dispatched_30d: number;
  pending_customer_returns: number | null;
};

type CustomerForm = { name: string; email: string; phone: string; address: string; notes: string };
type OrderForm = { customer_id: string; requested_date: string; notes: string; items: Line[] };
type OutboundTab = 'orders' | 'customers' | 'returns' | 'trace';
type ReturnLineForm = {
  allocation_id: string;
  storage_location_id: string;
  quantity: string;
  condition: 'available' | 'hold' | 'quarantine' | 'damaged' | 'rejected';
  serial_numbers: string[];
};
type ReturnForm = { reason: string; notes: string; items: ReturnLineForm[] };
type MutationInput = {
  path: string;
  method?: 'POST' | 'PUT';
  body?: unknown;
  version?: number;
  successMessage: string;
};

const emptyCustomer: CustomerForm = { name: '', email: '', phone: '', address: '', notes: '' };
const emptyOrder: OrderForm = {
  customer_id: '',
  requested_date: '',
  notes: '',
  items: [{ product_id: '', storage_location_id: '', quantity: '1', uom_code: '' }]
};
const emptyReturnLine = (): ReturnLineForm => ({
  allocation_id: '',
  storage_location_id: '',
  quantity: '1',
  condition: 'available',
  serial_numbers: []
});
const emptyReturnForm = (): ReturnForm => ({ reason: '', notes: '', items: [emptyReturnLine()] });
const OPEN_STATUSES = new Set(['confirmed', 'picking', 'packed', 'partially_dispatched']);
const ORDER_PAGE_SIZE = 10;
const CUSTOMER_PAGE_SIZE = 12;
const TRACE_PAGE_SIZE = 15;
const RETURN_PAGE_SIZE = 10;

const toNumber = (value: number | string | undefined | null) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const humanizeStatus = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const CANONICAL_DISPLAY_LABELS: Record<string, string> = {
  all: 'All',
  open: 'Open',
  completed: 'Completed',
  draft: 'Draft',
  confirmed: 'Confirmed',
  picking: 'Picking',
  packed: 'Packed',
  partially_dispatched: 'Partially dispatched',
  dispatched: 'Dispatched',
  cancelled: 'Cancelled',
  received: 'Received',
  available: 'Return to usable stock',
  hold: 'Hold / inspect first',
  quarantine: 'Quarantine',
  damaged: 'Damaged',
  rejected: 'Rejected',
  active: 'Active',
  archived: 'Archived'
};

const queryErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
};

const OUTBOUND_MUTATION_ERROR_MESSAGES: Record<string, string> = {
  TENANT_CONTEXT_MISSING: 'The tenant context is unavailable. Sign in again and retry.',
  OUTBOUND_ORDER_NOT_FOUND: 'The requested record is no longer available. Refresh and try again.',
  CUSTOMER_NOT_FOUND: 'The requested record is no longer available. Refresh and try again.',
  CUSTOMER_RETURN_NOT_FOUND: 'The requested record is no longer available. Refresh and try again.',
  CUSTOMER_NAME_REQUIRED: 'Enter a customer name.',
  CUSTOMER_NAME_CONFLICT: 'An active customer with this name already exists.',
  CUSTOMER_ARCHIVED: 'Archived customers cannot be edited.',
  CUSTOMER_ARCHIVE_ACTIVE_OUTBOUND_ORDER: 'This customer cannot be archived while an active outbound order still exists.',
  OUTBOUND_ITEMS_REQUIRED: 'Add at least one order line before continuing.',
  OUTBOUND_QUANTITY_INVALID: 'Every order line needs a product, source location, and quantity greater than zero.',
  DUPLICATE_OUTBOUND_LINE: 'The same product and source location cannot appear twice on the order.',
  OUTBOUND_PRODUCT_LOCATION_NOT_FOUND: 'A selected product or source location is no longer available. Refresh and review the order.',
  OUTBOUND_LOCATION_NOT_PICKABLE: 'Outbound stock must come from an active pickable leaf location.',
  OUTBOUND_HIERARCHY_PARENT_NOT_PICKABLE: 'Outbound stock must come from an active pickable leaf location.',
  OUTBOUND_DRAFT_EDIT_ONLY: 'Only draft customer orders can be edited.',
  BLOCKING_ALERTS_EXIST: 'This action is blocked by an unresolved critical stock alert.',
  OUTBOUND_STOCK_INSUFFICIENT: 'There is not enough usable stock available for this action. Refresh and review stock.',
  OUTBOUND_CONFIRM_STOCK_UNAVAILABLE: 'There is not enough usable stock available for this action. Refresh and review stock.',
  OUTBOUND_ORDER_STATE_INVALID: 'This order is no longer in the required state for this action. Refresh and review it.',
  OUTBOUND_ORDER_ALREADY_RESERVED: 'This order already has a stock reservation.',
  OUTBOUND_CUSTOMER_ARCHIVED: 'The customer was archived before this order could be confirmed.',
  OUTBOUND_REFERENCE_ARCHIVED: 'A product or source location was archived before this order could be confirmed.',
  OUTBOUND_ORDER_NOT_PICKING: 'Start picking before recording or packing picked stock.',
  OUTBOUND_PICK_ITEMS_REQUIRED: 'Add at least one picked line.',
  OUTBOUND_ORDER_ITEM_NOT_FOUND: 'The selected order line is no longer available. Refresh and review the order.',
  OUTBOUND_PICK_QUANTITY_INVALID: 'Picked quantity must be greater than zero.',
  OUTBOUND_PICK_OVER_REMAINING: 'Picked quantity is greater than the order quantity still waiting to be picked.',
  OUTBOUND_PICK_LOT_UNAVAILABLE: 'The selected lot or serialized stock is no longer available for picking.',
  OUTBOUND_PICK_LOT_EXPIRED: 'Expired stock cannot be picked.',
  OUTBOUND_PICK_LOT_QUANTITY_UNAVAILABLE: 'There is not enough usable stock available for this action. Refresh and review stock.',
  SERIAL_STATE_CHANGED: 'One or more serial numbers changed state. Refresh and review the order.',
  OUTBOUND_LOT_SELECTION_REQUIRED: 'This product requires a lot or batch to be selected before it can be picked.',
  INVENTORY_LOT_NOT_FOUND: 'The selected lot or batch is no longer available for this product and location.',
  OUTBOUND_PICK_STOCK_UNAVAILABLE: 'There is not enough usable stock available for this action. Refresh and review stock.',
  OUTBOUND_NOTHING_PICKED: 'Record at least one picked quantity before continuing.',
  OUTBOUND_PICKS_NOT_RESETTABLE: 'Picked stock can only be cleared while the order is being picked or is packed.',
  OUTBOUND_NO_OPEN_PICKS: 'There are no open picked quantities to clear.',
  OUTBOUND_ORDER_NOT_PACKED: 'Only packed stock can be dispatched.',
  OUTBOUND_NOTHING_PACKED: 'There is no packed quantity waiting to dispatch.',
  OUTBOUND_DISPATCH_REFERENCE_ARCHIVED: 'A product or source location changed before dispatch evidence could be captured. Refresh and review the order.',
  OUTBOUND_SERIAL_ALLOCATION_MISMATCH: 'Packed serialized stock no longer matches the serial numbers reserved during picking.',
  OUTBOUND_STOCK_CHANGED_AFTER_PICK: 'Stock changed after this order was picked. Clear the pick and pick available stock again.',
  OUTBOUND_ORDER_NOT_CANCELLABLE: 'Fully dispatched or already cancelled orders cannot be cancelled.',
  OUTBOUND_CANCEL_REASON_REQUIRED: 'Enter a cancellation reason.',
  CUSTOMER_RETURN_REASON_REQUIRED: 'Enter a return reason.',
  CUSTOMER_RETURN_ITEMS_REQUIRED: 'Add at least one returned item.',
  CUSTOMER_RETURN_LINE_INVALID: 'Every return line needs dispatched stock, a return location, and quantity greater than zero.',
  CUSTOMER_RETURN_CONDITION_INVALID: 'Choose a valid returned-stock condition.',
  CUSTOMER_RETURN_DUPLICATE_LINE: 'The same dispatched stock selection cannot appear twice on one return.',
  CUSTOMER_RETURN_MIXED_ORDERS: 'A customer return can only contain items from one customer order.',
  CUSTOMER_RETURN_LOCATION_NOT_FOUND: 'The selected return location is no longer available.',
  CUSTOMER_RETURN_DISPATCH_NOT_FOUND: 'The selected dispatched stock is no longer available for this return.',
  CUSTOMER_RETURN_PRODUCT_ARCHIVED: 'This product was archived and can no longer be returned into inventory.',
  CUSTOMER_RETURN_DISPATCH_CHANGED: 'The dispatched stock evidence changed. Refresh and review the return.',
  CUSTOMER_RETURN_QUANTITY_UNAVAILABLE: 'Return quantity is greater than the quantity still eligible to be returned.',
  CUSTOMER_RETURN_SERIAL_TRACKING_DISABLED_AFTER_DISPATCH: 'Serial tracking was disabled after these serialized items were dispatched. Re-enable serial tracking before creating or receiving the return.',
  CUSTOMER_RETURN_SERIAL_COUNT_MISMATCH: 'Select the exact required number of serial numbers for this return line.',
  CUSTOMER_RETURN_SERIAL_NOT_ELIGIBLE: 'One or more selected serial numbers are no longer eligible for this return.',
  CUSTOMER_RETURN_SERIAL_ALREADY_CLAIMED: 'One or more selected serial numbers are already included in another active return.',
  CUSTOMER_RETURN_NOT_RECEIVABLE: 'This return is no longer in the required state to be received.',
  CUSTOMER_RETURN_ALLOCATION_CLAIM_CHANGED: 'Return claims for this dispatched stock changed. Refresh and review the return.',
  CUSTOMER_RETURN_LOCATION_ARCHIVED: 'The selected return location is no longer active. Cancel this return and create it again with an active location.',
  CUSTOMER_RETURN_SERIAL_STATE_CHANGED: 'The serialized item state changed before the return was received. Refresh and review the return.',
  CUSTOMER_RETURN_NOT_CANCELLABLE: 'This return is no longer in the required state to be cancelled.',
  CUSTOMER_RETURN_CANCEL_REASON_REQUIRED: 'Enter a cancellation reason.'
};

const mutationErrorMessage = (error: unknown, ui: (englishText: string) => string) => {
  if (isVersionConflictError(error)) return getVersionConflictMessage(error, ui);
  if (error instanceof ApiError && error.code && OUTBOUND_MUTATION_ERROR_MESSAGES[error.code]) {
    return ui(OUTBOUND_MUTATION_ERROR_MESSAGES[error.code]);
  }
  return getVersionConflictMessage(error, ui);
};

function StatusBadge({ status }: { status: string }) {
  const { ui } = useAppTranslation();
  const normalized = status.toLocaleLowerCase();
  const tone = normalized === 'dispatched' || normalized === 'received'
    ? 'green'
    : normalized === 'cancelled'
      ? 'red'
      : normalized === 'packed' || normalized === 'partially_dispatched'
        ? 'amber'
        : normalized === 'confirmed' || normalized === 'picking' || normalized === 'draft'
          ? 'blue'
          : 'neutral';
  return <span className={`outbound-status-badge outbound-status-badge--${tone}`}>{CANONICAL_DISPLAY_LABELS[normalized] ? ui(CANONICAL_DISPLAY_LABELS[normalized]) : humanizeStatus(status)}</span>;
}

function StatCard({ label, value, help, tone = 'default' }: { label: string; value: number | string; help: string; tone?: 'default' | 'good' | 'warn' | 'danger' }) {
  return <OperationalWorkspaceStatCard label={label} value={value} helper={help} tone={tone} />;
}

function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return <div className="outbound-empty">
    <strong>{title}</strong>
    <div>{text}</div>
    {action ? <div className="outbound-actions-row" style={{ justifyContent: 'center' }}>{action}</div> : null}
  </div>;
}

export default function OutboundPage() {
  const qc = useQueryClient();
  const { locale, ui } = useAppTranslation();
  const formatNumber = (value: number | string | undefined | null) => formatLocalizedNumber(toNumber(value), locale, { maximumFractionDigits: 4 });
  const formatDate = (value: string | null | undefined, dateOnly = false) => {
    if (!value) return ui('Not recorded');
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, dateOnly ? 10 : undefined);
    return dateOnly ? formatLocalizedDate(parsed, locale) : formatLocalizedDateTime(parsed, locale);
  };
  const formatStatus = (value: string) => CANONICAL_DISPLAY_LABELS[value.toLocaleLowerCase()] ? ui(CANONICAL_DISPLAY_LABELS[value.toLocaleLowerCase()]) : humanizeStatus(value);
  const referenceLabel = (value: string | null | undefined) => String(value || '').trim() || ui('Reference unavailable');
  const formatLot = (lot?: PickLot | TraceRow | null) => {
    if (!lot) return ui('No lot label');
    const labels = [
      lot.lot_number ? `${ui('Lot')} ${lot.lot_number}` : null,
      lot.batch_number ? `${ui('Batch')} ${lot.batch_number}` : null,
      lot.expiry_date ? `${ui('Expiry')} ${formatDate(String(lot.expiry_date), true)}` : null
    ].filter(Boolean);
    return labels.length ? labels.join(' · ') : ui('Untracked stock');
  };
  const formatOrderQuantity = (item: OrderItem) => {
    const base = `${formatNumber(item.quantity)} ${referenceLabel(item.product_unit)}`;
    const enteredUom = String(item.uom_code || '').trim();
    const entered = item.entered_quantity;
    if (!enteredUom || entered === undefined || entered === null || enteredUom.toLocaleLowerCase() === String(item.product_unit || '').toLocaleLowerCase()) return base;
    return ui('{entered} ({base} base)').replace('{entered}', `${formatNumber(entered)} ${enteredUom}`).replace('{base}', base);
  };
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<OutboundTab>('orders');
  const [includeArchivedCustomers, setIncludeArchivedCustomers] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomer);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrder);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [pickOrderId, setPickOrderId] = useState<string>('');
  const [pickDrafts, setPickDrafts] = useState<Record<string, { quantity: string; inventory_lot_id: string; serial_numbers: string[] }>>({});
  const [returnForm, setReturnForm] = useState<ReturnForm>(emptyReturnForm);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const [returnSearch, setReturnSearch] = useState('');
  const [returnStatus, setReturnStatus] = useState('all');
  const [returnPage, setReturnPage] = useState(1);
  const [traceSearch, setTraceSearch] = useState('');
  const [tracePage, setTracePage] = useState(1);

  const canCustomerRead = hasPermission(TENANT_PERMISSIONS.CUSTOMERS_READ);
  const canCustomerWrite = hasPermission(TENANT_PERMISSIONS.CUSTOMERS_WRITE);
  const canProductRead = hasPermission(TENANT_PERMISSIONS.PRODUCTS_READ);
  const canLocationRead = hasPermission(TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ);
  const canStockRead = hasPermission(TENANT_PERMISSIONS.STOCK_READ);
  const canCreate = hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_CREATE);
  const canUpdate = hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_UPDATE);
  const canDispatch = hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_DISPATCH);
  const canCancel = hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_CANCEL);
  const canReturnRead = hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_READ);
  const canReturnCreate = hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_CREATE);
  const canReturnReceive = hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_RECEIVE);
  const canReturnCancel = hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_CANCEL);

  const customerDataNeeded = canCustomerRead && (activeTab === 'customers' || showOrderForm || Boolean(editingOrder));
  const productDataNeeded = canProductRead && (showOrderForm || Boolean(editingOrder));
  const locationDataNeeded = canLocationRead && (showOrderForm || Boolean(editingOrder) || (activeTab === 'returns' && canReturnCreate));
  const traceDataNeeded = activeTab === 'trace' || (activeTab === 'returns' && canReturnCreate);

  const customers = useQuery({
    queryKey: ['outbound-customers', includeArchivedCustomers],
    queryFn: () => apiRequest<Customer[]>(`/outbound/customers?include_archived=${includeArchivedCustomers ? 'true' : 'false'}`),
    enabled: customerDataNeeded
  });
  const orders = useQuery({ queryKey: ['outbound-orders'], queryFn: () => apiRequest<Order[]>('/outbound/orders') });
  const summary = useQuery({ queryKey: ['outbound-summary'], queryFn: () => apiRequest<OutboundSummary>('/outbound/summary') });
  const trace = useQuery({ queryKey: ['outbound-trace'], queryFn: () => apiRequest<TraceRow[]>('/outbound/trace'), enabled: traceDataNeeded });
  const returns = useQuery({ queryKey: ['outbound-returns'], queryFn: () => apiRequest<CustomerReturn[]>('/outbound/returns'), enabled: activeTab === 'returns' && canReturnRead });
  const products = useQuery({ queryKey: ['products'], queryFn: () => apiRequest<Product[]>('/products'), enabled: productDataNeeded });
  const locations = useQuery({ queryKey: ['storage-locations'], queryFn: () => apiRequest<Location[]>('/storage-locations'), enabled: locationDataNeeded });
  const pickOptions = useQuery({
    queryKey: ['outbound-pick-options', pickOrderId],
    queryFn: () => apiRequest<PickOptions>(`/outbound/orders/${pickOrderId}/pick-options`),
    enabled: Boolean(pickOrderId) && canStockRead
  });

  useEffect(() => {
    if (!pickOptions.data) return;
    if (pickOptions.data.order.status !== 'picking') {
      setPickOrderId('');
      return;
    }
    setPickDrafts((current) => {
      const next = { ...current };
      for (const item of pickOptions.data.items) {
        if (!next[item.id]) {
          const unpicked = Math.max(toNumber(item.remaining_quantity) - toNumber(item.open_picked_quantity), 0);
          next[item.id] = { quantity: String(unpicked || 1), inventory_lot_id: '', serial_numbers: [] };
        }
      }
      return next;
    });
  }, [pickOptions.data]);

  useEffect(() => { setOrderPage(1); }, [orderSearch, orderStatus]);
  useEffect(() => { setCustomerPage(1); }, [customerSearch, includeArchivedCustomers]);
  useEffect(() => { setReturnPage(1); }, [returnSearch, returnStatus]);
  useEffect(() => { setTracePage(1); }, [traceSearch]);

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['outbound-customers'] }),
      qc.invalidateQueries({ queryKey: ['outbound-orders'] }),
      qc.invalidateQueries({ queryKey: ['outbound-summary'] }),
      qc.invalidateQueries({ queryKey: ['outbound-trace'] }),
      qc.invalidateQueries({ queryKey: ['outbound-returns'] }),
      qc.invalidateQueries({ queryKey: ['outbound-pick-options'] }),
      qc.invalidateQueries({ queryKey: ['stock'] }),
      qc.invalidateQueries({ queryKey: ['inventory-lots'] }),
      qc.invalidateQueries({ queryKey: ['inventory-serials'] }),
      qc.invalidateQueries({ queryKey: ['stock-movements'] }),
      qc.invalidateQueries({ queryKey: ['inventory-reservations'] }),
      qc.invalidateQueries({ queryKey: ['inventory-reservations-summary'] }),
      qc.invalidateQueries({ queryKey: ['alerts'] }),
      qc.invalidateQueries({ queryKey: ['dashboard-unresolved-alerts'] }),
      qc.invalidateQueries({ queryKey: ['dashboard-outbound-summary'] })
    ]);
  };

  const mutation = useMutation({
    mutationFn: ({ path, method = 'POST', body, version }: MutationInput) => apiRequest(path, {
      method,
      headers: version === undefined ? undefined : { 'If-Match-Version': String(version) },
      body: JSON.stringify(body ?? {})
    }),
    onSuccess: async (_data, variables) => {
      setError('');
      setMessage(variables.successMessage);
      await invalidate();
    },
    onError: async (mutationError) => {
      setMessage('');
      setError(mutationErrorMessage(mutationError, ui));
      if (isVersionConflictError(mutationError)) await invalidate();
    }
  });

  const customerOptions = useMemo(() => customers.data ?? [], [customers.data]);
  const activeCustomers = useMemo(() => customerOptions.filter((customer) => customer.active), [customerOptions]);
  const orderRows = useMemo(() => orders.data ?? [], [orders.data]);
  const productOptions = useMemo(() => products.data ?? [], [products.data]);
  const locationOptions = useMemo(() => locations.data ?? [], [locations.data]);
  const returnRows = useMemo(() => returns.data ?? [], [returns.data]);
  const traceRows = useMemo(() => trace.data ?? [], [trace.data]);
  const returnableTrace = traceRows.filter((row) => toNumber(row.returnable_quantity) > 0);
  const returnCreateEligibleTrace = returnableTrace.filter((row) => !row.historical_serialized || row.serial_tracking_enabled);
  const blockedHistoricalSerializedReturns = returnableTrace.filter((row) => row.historical_serialized && !row.serial_tracking_enabled);

  const filteredOrders = useMemo(() => {
    const search = orderSearch.trim().toLocaleLowerCase();
    return orderRows.filter((order) => {
      if (orderStatus === 'open' && !OPEN_STATUSES.has(order.status)) return false;
      if (orderStatus === 'completed' && !['dispatched', 'cancelled'].includes(order.status)) return false;
      if (!['all', 'open', 'completed'].includes(orderStatus) && order.status !== orderStatus) return false;
      if (!search) return true;
      return [
        order.order_number,
        order.customer_name,
        order.notes,
        ...order.items.flatMap((item) => [item.product_name, item.product_sku, item.storage_location_name])
      ].some((value) => String(value || '').toLocaleLowerCase().includes(search));
    });
  }, [orderRows, orderSearch, orderStatus]);

  const pagedOrders = filteredOrders.slice((orderPage - 1) * ORDER_PAGE_SIZE, orderPage * ORDER_PAGE_SIZE);
  const orderPageCount = Math.max(1, Math.ceil(filteredOrders.length / ORDER_PAGE_SIZE));

  const filteredCustomers = useMemo(() => {
    const search = customerSearch.trim().toLocaleLowerCase();
    if (!search) return customerOptions;
    return customerOptions.filter((customer) => [customer.name, customer.email, customer.phone, customer.address, customer.notes]
      .some((value) => String(value || '').toLocaleLowerCase().includes(search)));
  }, [customerOptions, customerSearch]);
  const pagedCustomers = filteredCustomers.slice((customerPage - 1) * CUSTOMER_PAGE_SIZE, customerPage * CUSTOMER_PAGE_SIZE);
  const customerPageCount = Math.max(1, Math.ceil(filteredCustomers.length / CUSTOMER_PAGE_SIZE));

  const filteredReturns = useMemo(() => {
    const search = returnSearch.trim().toLocaleLowerCase();
    return returnRows.filter((row) => {
      if (returnStatus !== 'all' && row.status !== returnStatus) return false;
      if (!search) return true;
      return [row.return_number, row.order_number, row.customer_name, row.reason, row.notes, ...row.items.flatMap((item) => [item.product_name, item.product_sku])]
        .some((value) => String(value || '').toLocaleLowerCase().includes(search));
    });
  }, [returnRows, returnSearch, returnStatus]);
  const pagedReturns = filteredReturns.slice((returnPage - 1) * RETURN_PAGE_SIZE, returnPage * RETURN_PAGE_SIZE);
  const returnPageCount = Math.max(1, Math.ceil(filteredReturns.length / RETURN_PAGE_SIZE));

  const filteredTrace = useMemo(() => {
    const search = traceSearch.trim().toLocaleLowerCase();
    if (!search) return traceRows;
    return traceRows.filter((row) => [row.order_number, row.customer_name, row.product_name, row.product_sku, row.storage_location_name, row.lot_number, row.batch_number, ...(row.serial_numbers || [])]
      .some((value) => String(value || '').toLocaleLowerCase().includes(search)));
  }, [traceRows, traceSearch]);
  const pagedTrace = filteredTrace.slice((tracePage - 1) * TRACE_PAGE_SIZE, tracePage * TRACE_PAGE_SIZE);
  const tracePageCount = Math.max(1, Math.ceil(filteredTrace.length / TRACE_PAGE_SIZE));

  const cleanOrderItems = (form: OrderForm) => form.items
    .filter((line) => line.product_id && line.storage_location_id && Number(line.quantity) > 0)
    .map((line) => ({ ...line, quantity: Number(line.quantity), uom_code: line.uom_code || null }));

  const saveCustomer = () => {
    if (!customerForm.name.trim()) return;
    const body = {
      ...customerForm,
      name: customerForm.name.trim(),
      email: customerForm.email.trim() || null,
      phone: customerForm.phone.trim() || null,
      address: customerForm.address.trim() || null,
      notes: customerForm.notes.trim() || null
    };
    const request: MutationInput = editingCustomer
      ? { path: `/outbound/customers/${editingCustomer.id}`, method: 'PUT', body, version: Number(editingCustomer.version), successMessage: ui('Customer updated.') }
      : { path: '/outbound/customers', body, successMessage: ui('Customer added.') };
    mutation.mutate(request, {
      onSuccess: () => {
        setCustomerForm(emptyCustomer);
        setEditingCustomer(null);
        setShowCustomerForm(false);
      }
    });
  };

  const beginCustomerEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({ name: customer.name, email: customer.email ?? '', phone: customer.phone ?? '', address: customer.address ?? '', notes: customer.notes ?? '' });
    setShowCustomerForm(true);
  };

  const cancelCustomerEdit = () => {
    setEditingCustomer(null);
    setCustomerForm(emptyCustomer);
    setShowCustomerForm(false);
  };

  const saveOrder = () => {
    const items = cleanOrderItems(orderForm);
    if (!orderForm.customer_id || !items.length) {
      setError(ui('Choose a customer and complete at least one order line.'));
      return;
    }
    const body = {
      customer_id: orderForm.customer_id,
      requested_date: orderForm.requested_date || null,
      notes: orderForm.notes.trim() || null,
      items
    };
    const request: MutationInput = editingOrder
      ? { path: `/outbound/orders/${editingOrder.id}`, method: 'PUT', body, version: Number(editingOrder.version), successMessage: ui('{order} updated.').replace('{order}', editingOrder.order_number) }
      : { path: '/outbound/orders', body, successMessage: ui('Customer order created as a draft.') };
    mutation.mutate(request, {
      onSuccess: () => {
        setOrderForm(emptyOrder);
        setEditingOrder(null);
        setShowOrderForm(false);
      }
    });
  };

  const beginOrderEdit = (order: Order) => {
    setEditingOrder(order);
    setOrderForm({
      customer_id: order.customer_id,
      requested_date: order.requested_date ? String(order.requested_date).slice(0, 10) : '',
      notes: order.notes ?? '',
      items: order.items.map((item) => ({
        product_id: item.product_id,
        storage_location_id: item.storage_location_id,
        quantity: String(item.entered_quantity ?? item.quantity),
        uom_code: item.uom_code || ''
      }))
    });
    setShowOrderForm(true);
  };

  const cancelOrderEdit = () => {
    setEditingOrder(null);
    setOrderForm(emptyOrder);
    setShowOrderForm(false);
  };

  const startPicking = (order: Order) => {
    mutation.mutate({
      path: `/outbound/orders/${order.id}/start-picking`,
      version: Number(order.version),
      successMessage: ui('{order} is ready for physical picking.').replace('{order}', order.order_number)
    }, { onSuccess: () => { setPickDrafts({}); if (canStockRead) setPickOrderId(order.id); } });
  };

  const recordPick = (item: PickItem) => {
    if (!pickOptions.data) return;
    const draft = pickDrafts[item.id] ?? { quantity: '', inventory_lot_id: '', serial_numbers: [] };
    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError(ui('Enter a picked quantity greater than zero.'));
      return;
    }
    if (item.serial_tracking_enabled) {
      if (!Number.isInteger(quantity) || draft.serial_numbers.length !== quantity) {
        setError(ui('Select exactly {count} serial number(s) for this serial-tracked pick.').replace('{count}', Number.isInteger(quantity) ? formatNumber(quantity) : ui('one serial per whole')));
        return;
      }
    } else if (item.requires_lot_tracking && !draft.inventory_lot_id) {
      setError(ui('Choose the lot/batch that was physically picked for this product.'));
      return;
    }
    mutation.mutate({
      path: `/outbound/orders/${pickOptions.data.order.id}/pick`,
      version: Number(pickOptions.data.order.version),
      body: {
        items: [{
          order_item_id: item.id,
          quantity,
          inventory_lot_id: item.serial_tracking_enabled ? null : draft.inventory_lot_id || null,
          serial_numbers: draft.serial_numbers
        }]
      },
      successMessage: ui('{product} pick recorded.').replace('{product}', referenceLabel(item.product_name))
    }, {
      onSuccess: () => setPickDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      })
    });
  };

  const selectedTraceForReturnLine = (line: ReturnLineForm) => returnCreateEligibleTrace.find((row) => row.allocation_id === line.allocation_id) ?? null;
  const firstSelectedReturnTrace = returnForm.items.map(selectedTraceForReturnLine).find(Boolean) ?? null;
  const returnOrderId = firstSelectedReturnTrace?.outbound_order_id ?? null;

  const eligibleReturnRowsForLine = (index: number) => {
    const selectedElsewhere = new Set(returnForm.items.filter((_, lineIndex) => lineIndex !== index).map((line) => line.allocation_id).filter(Boolean));
    return returnCreateEligibleTrace.filter((row) => (!returnOrderId || row.outbound_order_id === returnOrderId) && !selectedElsewhere.has(row.allocation_id));
  };

  const chooseReturnAllocation = (index: number, allocationId: string) => {
    const selected = returnableTrace.find((row) => row.allocation_id === allocationId);
    setReturnForm((current) => ({
      ...current,
      items: current.items.map((line, lineIndex) => lineIndex === index
        ? { ...line, allocation_id: allocationId, storage_location_id: selected?.storage_location_id ?? '', quantity: '1', serial_numbers: [] }
        : line)
    }));
  };

  const updateReturnLine = (index: number, patch: Partial<ReturnLineForm>) => {
    setReturnForm((current) => ({
      ...current,
      items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line)
    }));
  };

  const addReturnLine = () => setReturnForm((current) => ({ ...current, items: [...current.items, emptyReturnLine()] }));
  const removeReturnLine = (index: number) => setReturnForm((current) => ({ ...current, items: current.items.filter((_, lineIndex) => lineIndex !== index) }));

  const returnFormValidation = (() => {
    if (returnForm.reason.trim().length < 3) return ui('Enter a return reason of at least 3 characters.');
    if (!returnForm.items.length) return ui('Add at least one returned item.');
    for (const line of returnForm.items) {
      const selected = returnCreateEligibleTrace.find((row) => row.allocation_id === line.allocation_id);
      const quantity = Number(line.quantity);
      if (!selected || !line.storage_location_id || !Number.isFinite(quantity) || quantity <= 0) return ui('Complete every return line with dispatched stock, a return location, and a quantity.');
      if (quantity > toNumber(selected.returnable_quantity)) return ui('Return quantity for {product} exceeds the quantity still returnable.').replace('{product}', selected.product_name);
      if (selected.returnable_serial_numbers?.length && (!Number.isInteger(quantity) || line.serial_numbers.length !== quantity)) return ui('Select exactly {count} serial number(s) for {product}.').replace('{count}', Number.isInteger(quantity) ? formatNumber(quantity) : ui('one serial per whole')).replace('{product}', selected.product_name);
    }
    return '';
  })();

  const createReturn = () => {
    if (returnFormValidation) {
      setError(returnFormValidation);
      return;
    }
    mutation.mutate({
      path: '/outbound/returns',
      body: {
        reason: returnForm.reason.trim(),
        notes: returnForm.notes.trim() || null,
        items: returnForm.items.map((line) => ({
          outbound_order_lot_allocation_id: line.allocation_id,
          storage_location_id: line.storage_location_id,
          quantity: Number(line.quantity),
          condition: line.condition,
          serial_numbers: line.serial_numbers
        }))
      },
      successMessage: ui('Customer return created and is waiting to be received.')
    }, { onSuccess: () => setReturnForm(emptyReturnForm()) });
  };

  const canUseOrderForm = canCreate && canCustomerRead && canProductRead && canLocationRead;
  const canEditOrderForm = canUpdate && canCustomerRead && canProductRead && canLocationRead;
  const showCustomerTab = canCustomerRead || canCustomerWrite;
  const showReturnTab = canReturnRead || canReturnCreate;
  const activeOrderCount = orderRows.filter((row) => OPEN_STATUSES.has(row.status)).length;

  const setTab = (tab: OutboundTab) => {
    setMessage('');
    setError('');
    setActiveTab(tab);
  };

  return <div className="io-operational-page io-outbound-page io-workspace-page">
    <OperationalWorkspaceHero
      iconPath="/outbound"
      eyebrow={ui('Customer fulfillment')}
      title={ui('Outbound workspace')}
      description={ui('Confirming an order reserves stock. Warehouse staff then record what was physically picked, pack only those quantities, and dispatch only packed stock. Partial dispatches keep the remaining order reservation intact.')}
      meta={<>
        <OperationalWorkspaceMetaPill>{ui('Tenant-scoped')}</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{ui('Reserve on confirmation')}</OperationalWorkspaceMetaPill>
        <OperationalWorkspaceMetaPill>{ui('Dispatch reduces stock')}</OperationalWorkspaceMetaPill>
      </>}
    />

    {message ? <div className="outbound-alert outbound-alert--success" role="status">{message}</div> : null}
    {error ? <div className="outbound-alert outbound-alert--error" role="alert">{error}</div> : null}

    <section className="outbound-panel">
      <div className="outbound-section-heading">
        <div className="io-section-heading-with-icon">
          <span className="io-section-heading-icon"><TenantNavIcon path="/outbound" size={18} /></span>
          <div className="io-section-heading-copy"><h3>{ui('Outbound status')}</h3><p>{ui('A quick operational view. Counts are used here instead of adding unrelated product units such as pieces, kilograms, or litres together.')}</p></div>
        </div>
        <div className="outbound-section-heading-actions"><button type="button" className="outbound-button" onClick={() => { void summary.refetch(); void orders.refetch(); }} disabled={summary.isFetching || orders.isFetching}>{summary.isFetching || orders.isFetching ? ui('Refreshing…') : ui('Refresh status')}</button></div>
      </div>
      {summary.isLoading ? <div className="outbound-empty">{ui('Loading outbound status…')}</div> : summary.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(summary.error, ui('Outbound status is unavailable.'))}</div> : summary.data ? <div className="outbound-summary-grid io-workspace-stats">
        <StatCard label={ui('Open orders')} value={summary.data.open_orders} help={ui('Confirmed through partially dispatched')} tone={summary.data.open_orders > 0 ? 'warn' : 'default'} />
        <StatCard label={ui('Ready to pick')} value={summary.data.confirmed_orders} help={ui('Confirmed and reserved')} tone={summary.data.confirmed_orders > 0 ? 'warn' : 'default'} />
        <StatCard label={ui('Picking')} value={summary.data.picking_orders} help={ui('Warehouse work in progress')} tone={summary.data.picking_orders > 0 ? 'warn' : 'default'} />
        <StatCard label={ui('Packed')} value={summary.data.packed_orders} help={ui('Waiting for dispatch')} tone={summary.data.packed_orders > 0 ? 'warn' : 'default'} />
        <StatCard label={ui('Partial shipments')} value={summary.data.partially_dispatched_orders} help={ui('Remainder still reserved')} tone={summary.data.partially_dispatched_orders > 0 ? 'warn' : 'default'} />
        <StatCard label={ui('Completed 30 days')} value={summary.data.dispatched_orders_30d} help={ui('Fully dispatched orders')} tone="good" />
        {canReturnRead && summary.data.pending_customer_returns !== null ? <StatCard label={ui('Returns waiting')} value={summary.data.pending_customer_returns} help={ui('Created but not yet received')} tone={summary.data.pending_customer_returns > 0 ? 'warn' : 'good'} /> : null}
      </div> : null}
    </section>

    <section className="outbound-panel outbound-workflow-panel">
      <OperationalSectionHeader
        iconPath="/outbound"
        title={ui('Outbound workflow')}
        description={ui('The same controlled sequence is used for every customer order.')}
      />
      <div className="outbound-workflow-grid" aria-label={ui('Outbound workflow')}>
        <div className="outbound-workflow-step"><strong>{ui('1. Draft')}</strong><span>{ui('Choose the customer, products, source locations, quantities, and requested date.')}</span></div>
        <div className="outbound-workflow-step"><strong>{ui('2. Confirm')}</strong><span>{ui('Reserve usable stock so another workflow cannot consume the same free quantity.')}</span></div>
        <div className="outbound-workflow-step"><strong>{ui('3. Pick')}</strong><span>{ui('Record the stock actually taken from shelves, including lot/batch or serial identity when required.')}</span></div>
        <div className="outbound-workflow-step"><strong>{ui('4. Pack')}</strong><span>{ui('Mark only the currently picked quantities as packed and ready for dispatch.')}</span></div>
        <div className="outbound-workflow-step"><strong>{ui('5. Dispatch')}</strong><span>{ui('Reduce inventory only when packed stock leaves the business. Returns are handled separately.')}</span></div>
      </div>
    </section>

    <OperationalWorkspaceTabs ariaLabel={ui('Outbound work areas')} hint={ui('Choose the part of the fulfillment workflow you want to work in.')}>
      <OperationalWorkspaceTab active={activeTab === 'orders'} iconPath="/outbound" label={ui('Orders')} count={activeOrderCount} onClick={() => setTab('orders')} />
      {showCustomerTab ? <OperationalWorkspaceTab active={activeTab === 'customers'} iconPath="/suppliers" label={ui('Customers')} onClick={() => setTab('customers')} /> : null}
      {showReturnTab ? <OperationalWorkspaceTab active={activeTab === 'returns'} iconPath="/stock-transfers" label={ui('Customer returns')} count={canReturnRead ? (summary.data?.pending_customer_returns || undefined) : undefined} onClick={() => setTab('returns')} /> : null}
      <OperationalWorkspaceTab active={activeTab === 'trace'} iconPath="/stock-movements" label={ui('Dispatch trace')} onClick={() => setTab('trace')} />
    </OperationalWorkspaceTabs>

    {activeTab === 'orders' ? <>
      {(showOrderForm || editingOrder) ? <section className="outbound-panel">
        <div className="outbound-section-heading">
          <div className="io-section-heading-with-icon"><span className="io-section-heading-icon"><TenantNavIcon path="/outbound" size={18} /></span><div className="io-section-heading-copy"><h3>{editingOrder ? ui('Edit draft {order}').replace('{order}', editingOrder.order_number) : ui('Create customer order')}</h3><p>{ui('Create a draft first. Stock is not reserved until the draft is confirmed.')}</p></div></div>
          <button type="button" className="outbound-button" onClick={cancelOrderEdit}>{ui('Close form')}</button>
        </div>
        {!canUseOrderForm && !editingOrder ? <div className="outbound-alert outbound-alert--warning">{ui('Creating an order also requires read access to customers, products, and storage locations so the selections can be verified safely.')}</div> : null}
        {editingOrder && !canEditOrderForm ? <div className="outbound-alert outbound-alert--warning">{ui('Editing this draft requires read access to customers, products, and storage locations.')}</div> : null}
        {(canUseOrderForm || (editingOrder && canEditOrderForm)) ? <>
          {(customers.isLoading || products.isLoading || locations.isLoading) ? <div className="outbound-alert outbound-alert--info">{ui('Loading customer, product, and location options…')}</div> : null}
          {(customers.isError || products.isError || locations.isError) ? <div className="outbound-alert outbound-alert--error">{ui('Unable to load all order options.')} {customers.isError ? queryErrorMessage(customers.error, '') : products.isError ? queryErrorMessage(products.error, '') : queryErrorMessage(locations.error, '')}</div> : null}
          <div className="outbound-form-grid">
            <label className="outbound-field">{ui('Customer')} <select value={orderForm.customer_id} onChange={(event) => setOrderForm({ ...orderForm, customer_id: event.target.value })} disabled={mutation.isPending || customers.isLoading}>
                <option value="">{ui('Choose customer')}</option>
                {activeCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <label className="outbound-field">{ui('Requested date')} <input type="date" value={orderForm.requested_date} onChange={(event) => setOrderForm({ ...orderForm, requested_date: event.target.value })} disabled={mutation.isPending} />
            </label>
            <label className="outbound-field">{ui('Order notes')} <input placeholder={ui('Delivery instruction or internal reference')} value={orderForm.notes} onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })} disabled={mutation.isPending} />
            </label>
          </div>
          {!customers.isLoading && !customers.isError && activeCustomers.length === 0 ? <div className="outbound-alert outbound-alert--warning" style={{ marginTop: 12 }}>{ui('No active customers are available.')} <button type="button" className="outbound-button-quiet" onClick={() => { setTab('customers'); setShowCustomerForm(true); }}>{ui('Open Customers')}</button></div> : null}
          {orderForm.items.map((line, index) => <div key={index} className="outbound-order-line-editor">
            <label className="outbound-field">{ui('Product')} <select value={line.product_id} onChange={(event) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, lineIndex) => lineIndex === index ? { ...current, product_id: event.target.value, uom_code: '' } : current) })} disabled={mutation.isPending || products.isLoading}>
                <option value="">{ui('Choose product')}</option>
                {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="outbound-field">{ui('Source location')} <select value={line.storage_location_id} onChange={(event) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, lineIndex) => lineIndex === index ? { ...current, storage_location_id: event.target.value } : current) })} disabled={mutation.isPending || locations.isLoading}>
                <option value="">{ui('Choose location')}</option>
                {locationOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
            <label className="outbound-field">{ui('Quantity')} <input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, lineIndex) => lineIndex === index ? { ...current, quantity: event.target.value } : current) })} disabled={mutation.isPending} />
            </label>
            <label className="outbound-field">{ui('Unit of measure')} <ProductUomSelect productId={line.product_id} value={line.uom_code} purpose="issue" onChange={(value) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, lineIndex) => lineIndex === index ? { ...current, uom_code: value } : current) })} ariaLabel={ui('Unit of measure for outbound line {line}').replace('{line}', formatNumber(index + 1))} disabled={mutation.isPending} />
            </label>
            <button type="button" className="outbound-button-danger" disabled={orderForm.items.length === 1 || mutation.isPending} onClick={() => setOrderForm({ ...orderForm, items: orderForm.items.filter((_, lineIndex) => lineIndex !== index) })}>{ui('Remove')}</button>
          </div>)}
          <div className="outbound-actions-row">
            <button type="button" className="outbound-button" disabled={mutation.isPending} onClick={() => setOrderForm({ ...orderForm, items: [...orderForm.items, { product_id: '', storage_location_id: '', quantity: '1', uom_code: '' }] })}>{ui('Add line')}</button>
            <button type="button" className="outbound-button-primary" disabled={!orderForm.customer_id || cleanOrderItems(orderForm).length === 0 || mutation.isPending || customers.isLoading || products.isLoading || locations.isLoading || customers.isError || products.isError || locations.isError} onClick={saveOrder}>{mutation.isPending ? ui('Saving…') : editingOrder ? ui('Save Draft') : ui('Create Order')}</button>
            {editingOrder ? <button type="button" className="outbound-button" onClick={cancelOrderEdit} disabled={mutation.isPending}>{ui('Cancel Edit')}</button> : null}
          </div>
        </> : null}
      </section> : null}

      <section className="outbound-panel">
        <div className="outbound-section-heading">
          <div className="io-section-heading-with-icon"><span className="io-section-heading-icon"><TenantNavIcon path="/outbound" size={18} /></span><div className="io-section-heading-copy"><h3>{ui('Customer orders')}</h3><p>{ui('Review the fulfillment state, open the warehouse picking workbench, and dispatch only packed stock.')}</p></div></div>
          <div className="outbound-section-heading-actions">
            <button type="button" className="outbound-button" onClick={() => void orders.refetch()} disabled={orders.isFetching}>{orders.isFetching ? ui('Refreshing…') : ui('Refresh orders')}</button>
            {canCreate ? <button type="button" className="outbound-button-primary" onClick={() => { setEditingOrder(null); setOrderForm(emptyOrder); setShowOrderForm(true); }}>{ui('New customer order')}</button> : null}
          </div>
        </div>
        <div className="outbound-filter-grid">
          <label className="outbound-field">{ui('Search orders')} <input placeholder={ui('Order number, customer, product, location, or note')} value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
          </label>
          <label className="outbound-field">{ui('Status')} <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
              <option value="all">{ui('All statuses')}</option>
              <option value="open">{ui('All open work')}</option>
              <option value="draft">{ui('Draft')}</option>
              <option value="confirmed">{ui('Confirmed')}</option>
              <option value="picking">{ui('Picking')}</option>
              <option value="packed">{ui('Packed')}</option>
              <option value="partially_dispatched">{ui('Partially dispatched')}</option>
              <option value="completed">{ui('Completed / cancelled')}</option>
              <option value="dispatched">{ui('Dispatched')}</option>
              <option value="cancelled">{ui('Cancelled')}</option>
            </select>
          </label>
        </div>
        {orders.isLoading ? <div className="outbound-empty">{ui('Loading customer orders…')}</div> : orders.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(orders.error, ui('Customer orders could not be loaded.'))}</div> : filteredOrders.length === 0 ? <EmptyState title={orderRows.length ? ui('No orders match these filters') : ui('No customer orders yet')} text={orderRows.length ? ui('Change the search or status filter to see other orders.') : ui('Create a draft customer order when outbound fulfillment is needed.')} action={!orderRows.length && canCreate ? <button type="button" className="outbound-button-primary" onClick={() => setShowOrderForm(true)}>{ui('Create first order')}</button> : undefined} /> : <>
          <div className="outbound-list-meta"><span>{ui('Showing')} {((orderPage - 1) * ORDER_PAGE_SIZE) + 1}–{Math.min(orderPage * ORDER_PAGE_SIZE, filteredOrders.length)} {ui('of')} {filteredOrders.length} {ui('matching order(s).')}</span><span>{ui('Drafts do not reserve stock.')}</span></div>
          <div className="outbound-order-list">{pagedOrders.map((order) => {
            const openPicked = order.items.reduce((sum, item) => sum + toNumber(item.open_picked_quantity), 0);
            const openPacked = order.items.reduce((sum, item) => sum + toNumber(item.open_packed_quantity), 0);
            const isPickingOpen = pickOrderId === order.id;
            return <article key={order.id} className={`outbound-order-card${isPickingOpen ? ' outbound-order-card--active' : ''}`}>
              <div className="outbound-card-topline">
                <div>
                  <div className="outbound-card-title">{order.order_number} · {referenceLabel(order.customer_name)}</div>
                  <div className="outbound-card-subtitle">{ui('Created')} {formatDate(order.created_at)} {ui('· Requested')} {order.requested_date ? formatDate(order.requested_date, true) : ui('date not set')} · {order.items.length} {ui('line')}{order.items.length === 1 ? '' : ui('s')}</div>
                </div>
                <StatusBadge status={order.status} />
              </div>
              {order.notes ? <div className="outbound-notes"><strong>{ui('Order note:')}</strong> {order.notes}</div> : null}
              {order.status === 'cancelled' && order.cancellation_reason ? <div className="outbound-alert outbound-alert--error" style={{ marginTop: 9 }}><strong>{ui('Cancellation:')}</strong> {order.cancellation_reason}</div> : null}
              <div className="outbound-order-lines">{order.items.map((item) => <div key={item.id} className="outbound-order-line">
                <div><strong>{referenceLabel(item.product_name)}</strong><div className="outbound-muted">{ui('SKU:')} {referenceLabel(item.product_sku)} · {referenceLabel(item.storage_location_name)}</div></div>
                <div>{ui('Ordered')} <strong>{formatOrderQuantity(item)}</strong><div className="outbound-muted">{ui('Dispatched')} {formatNumber(item.dispatched_quantity)} {referenceLabel(item.product_unit)}</div></div>
                <div>{ui('Picked waiting')} <strong>{formatNumber(item.open_picked_quantity)}</strong> {ui('· Packed waiting')} <strong>{formatNumber(item.open_packed_quantity)}</strong> {ui('· Remaining')} <strong>{formatNumber(item.remaining_quantity)}</strong> {referenceLabel(item.product_unit)}</div>
              </div>)}</div>
              <div className="outbound-actions-row">
                {order.status === 'draft' && canUpdate && canEditOrderForm ? <button type="button" className="outbound-button" onClick={() => beginOrderEdit(order)} disabled={mutation.isPending}>{ui('Edit Draft')}</button> : null}
                {order.status === 'draft' && canUpdate ? <button type="button" className="outbound-button-primary" onClick={() => mutation.mutate({ path: `/outbound/orders/${order.id}/confirm`, version: Number(order.version), successMessage: ui('{order} confirmed and stock reserved.').replace('{order}', order.order_number) })} disabled={mutation.isPending}>{ui('Confirm & Reserve Stock')}</button> : null}
                {['confirmed', 'partially_dispatched'].includes(order.status) && canUpdate ? <button type="button" className="outbound-button-primary" onClick={() => startPicking(order)} disabled={mutation.isPending}>{order.status === 'partially_dispatched' ? ui('Pick Remaining') : ui('Start Picking')}</button> : null}
                {order.status === 'picking' && canUpdate && canStockRead ? <button type="button" className="outbound-button-primary" onClick={() => setPickOrderId(order.id)}>{isPickingOpen ? ui('Picking Open') : ui('Open Picking')}</button> : null}
                {order.status === 'picking' && canUpdate && openPicked > 0 ? <button type="button" className="outbound-button-primary" onClick={() => mutation.mutate({ path: `/outbound/orders/${order.id}/mark-packed`, version: Number(order.version), successMessage: ui('{order} picked stock marked packed.').replace('{order}', order.order_number) }, { onSuccess: () => setPickOrderId('') })} disabled={mutation.isPending}>{ui('Mark Picked Stock Packed')}</button> : null}
                {['picking', 'packed'].includes(order.status) && canUpdate && openPicked > 0 ? <button type="button" className="outbound-button-danger" onClick={() => { if (window.confirm(ui('Clear the current picked quantities and pick again?'))) mutation.mutate({ path: `/outbound/orders/${order.id}/reset-picks`, version: Number(order.version), successMessage: ui('{order} open picks cleared.').replace('{order}', order.order_number) }, { onSuccess: () => { setPickOrderId(''); setPickDrafts({}); } }); }} disabled={mutation.isPending}>{ui('Clear Picks')}</button> : null}
                {order.status === 'packed' && canDispatch && openPacked > 0 ? <button type="button" className="outbound-button-primary" onClick={() => { if (window.confirm(ui('Dispatch all currently packed stock? Inventory will be reduced for the packed quantities now.'))) mutation.mutate({ path: `/outbound/orders/${order.id}/dispatch`, version: Number(order.version), successMessage: ui('{order} packed stock dispatched.').replace('{order}', order.order_number) }); }} disabled={mutation.isPending}>{ui('Dispatch Packed Stock')}</button> : null}
                {!['dispatched', 'cancelled'].includes(order.status) && canCancel ? <button type="button" className="outbound-button-danger" onClick={() => { const alreadyDispatched = order.items.some((item) => toNumber(item.dispatched_quantity) > 0); const reason = window.prompt(alreadyDispatched ? ui('Reason for cancelling the undelivered remainder') : ui('Cancellation reason')); if (reason && reason.trim().length >= 3) mutation.mutate({ path: `/outbound/orders/${order.id}/cancel`, body: { reason: reason.trim() }, version: Number(order.version), successMessage: alreadyDispatched ? ui('{order} cancelled for the remaining undelivered quantity.').replace('{order}', order.order_number) : ui('{order} cancelled.').replace('{order}', order.order_number) }, { onSuccess: () => { if (pickOrderId === order.id) setPickOrderId(''); } }); }} disabled={mutation.isPending}>{ui('Cancel')}{order.items.some((item) => toNumber(item.dispatched_quantity) > 0) ? ` ${ui('Remainder')}` : ''}</button> : null}
              </div>
            </article>;
          })}</div>
          {orderPageCount > 1 ? <div className="outbound-pagination"><button type="button" className="outbound-button" disabled={orderPage <= 1} onClick={() => setOrderPage((page) => Math.max(1, page - 1))}>{ui('Previous')}</button><span>{ui('Page')} {orderPage} {ui('of')} {orderPageCount}</span><button type="button" className="outbound-button" disabled={orderPage >= orderPageCount} onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))}>{ui('Next')}</button></div> : null}
        </>}
      </section>

      {pickOrderId && canStockRead ? <section className="outbound-panel">
        <div className="outbound-section-heading">
          <div><h3>{ui('Picking workbench')}</h3><p>{ui('Record what was physically picked. This does not reduce stock yet; dispatch is the stock-changing step.')}</p></div>
          <button type="button" className="outbound-button" onClick={() => setPickOrderId('')}>{ui('Close')}</button>
        </div>
        {pickOptions.isLoading ? <div className="outbound-empty">{ui('Loading pick options…')}</div> : pickOptions.isError || !pickOptions.data ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(pickOptions.error, ui('Unable to load picking details.'))}</div> : pickOptions.data.items.map((item) => {
          const draft = pickDrafts[item.id] ?? { quantity: '', inventory_lot_id: '', serial_numbers: [] };
          const unpickedRemaining = Math.max(toNumber(item.remaining_quantity) - toNumber(item.open_picked_quantity), 0);
          return <div key={item.id} className="outbound-picking-line">
            <div className="outbound-card-title">{referenceLabel(item.product_name)} · {referenceLabel(item.storage_location_name)}</div>
            <div className="outbound-card-subtitle">{ui('Ordered')} {formatOrderQuantity(item)} {ui('· Dispatched')} {formatNumber(item.dispatched_quantity)} {referenceLabel(item.product_unit)} {ui('· Picked waiting')} {formatNumber(item.open_picked_quantity)} {ui('· Still unpicked')} {formatNumber(unpickedRemaining)} {referenceLabel(item.product_unit)}</div>
            {unpickedRemaining > 0 ? <>
              <div className="outbound-picking-controls">
                <label className="outbound-field">{ui('Picked quantity')} <input type="number" min="0.0001" max={unpickedRemaining} step="0.0001" value={draft.quantity} onChange={(event) => setPickDrafts({ ...pickDrafts, [item.id]: { ...draft, quantity: event.target.value, serial_numbers: [] } })} />
                </label>
                {!item.serial_tracking_enabled && item.requires_lot_tracking ? <label className="outbound-field">{ui('Lot / batch physically picked')} <select value={draft.inventory_lot_id} onChange={(event) => setPickDrafts({ ...pickDrafts, [item.id]: { ...draft, inventory_lot_id: event.target.value } })}>
                    <option value="">{ui('Choose lot / batch')}</option>
                    {item.lots.filter((lot) => lot.available_to_pick > 0).map((lot) => <option key={lot.id} value={lot.id}>{formatLot(lot)} · {formatNumber(lot.available_to_pick)} {ui('available')}</option>)}
                  </select>
                </label> : <div />}
                <button type="button" className="outbound-button-primary" disabled={mutation.isPending || !draft.quantity || (!item.serial_tracking_enabled && item.requires_lot_tracking && !draft.inventory_lot_id) || (Boolean(item.serial_tracking_enabled) && (!Number.isInteger(Number(draft.quantity)) || draft.serial_numbers.length !== Number(draft.quantity)))} onClick={() => recordPick(item)}>{ui('Record Pick')}</button>
              </div>
              {item.serial_tracking_enabled ? <div className="outbound-serial-box"><div className="outbound-muted" style={{ marginBottom: 7 }}>{ui('Select the exact physical serials picked (')}{draft.serial_numbers.length}/{Number.isInteger(Number(draft.quantity)) ? Number(draft.quantity) : '?'})</div>{(item.available_serials || []).map((serial) => { const checked = draft.serial_numbers.includes(serial.serial_number); return <label key={serial.id}><input type="checkbox" checked={checked} onChange={(event) => setPickDrafts({ ...pickDrafts, [item.id]: { ...draft, serial_numbers: event.target.checked ? [...draft.serial_numbers, serial.serial_number] : draft.serial_numbers.filter((value) => value !== serial.serial_number) } })} /> {serial.serial_number}</label>; })}{!(item.available_serials || []).length ? <span className="outbound-muted">{ui('No available serials found at this location.')}</span> : null}</div> : null}
            </> : <div className="outbound-alert outbound-alert--info" style={{ marginTop: 8 }}>{ui('Nothing else to pick on this line.')}</div>}
          </div>;
        })}
      </section> : null}
    </> : null}

    {activeTab === 'customers' ? <section className="outbound-panel">
      <div className="outbound-section-heading">
        <div className="io-section-heading-with-icon"><span className="io-section-heading-icon"><TenantNavIcon path="/suppliers" size={18} /></span><div className="io-section-heading-copy"><h3>{ui('Customers')}</h3><p>{ui('Maintain customer contact data used by outbound orders. Archived customers remain visible in historical orders but cannot be used for new orders.')}</p></div></div>
        <div className="outbound-section-heading-actions">
          {canCustomerRead ? <label className="outbound-checkbox-label"><input type="checkbox" checked={includeArchivedCustomers} onChange={(event) => setIncludeArchivedCustomers(event.target.checked)} /> {ui('Include archived')}</label> : null}
          {canCustomerRead ? <button type="button" className="outbound-button" onClick={() => void customers.refetch()} disabled={customers.isFetching}>{customers.isFetching ? ui('Refreshing…') : ui('Refresh customers')}</button> : null}
          {canCustomerWrite ? <button type="button" className="outbound-button-primary" onClick={() => { setEditingCustomer(null); setCustomerForm(emptyCustomer); setShowCustomerForm(true); }}>{ui('Add customer')}</button> : null}
        </div>
      </div>
      {showCustomerForm && canCustomerWrite ? <div className="outbound-panel" style={{ boxShadow: 'none', background: '#f8fafc', marginBottom: 14 }}>
        <div className="outbound-section-heading"><div><h3>{editingCustomer ? ui('Edit {customer}').replace('{customer}', editingCustomer.name) : ui('New customer')}</h3><p>{ui('Only the customer name is required. Contact details make fulfillment and follow-up easier.')}</p></div><button type="button" className="outbound-button" onClick={cancelCustomerEdit}>{ui('Close form')}</button></div>
        <div className="outbound-form-grid outbound-form-grid--customer">
          <label className="outbound-field">{ui('Customer name')}<input placeholder={ui('Customer or company name')} value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} /></label>
          <label className="outbound-field">{ui('Email')}<input type="email" placeholder={ui('orders@customer.com')} value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} /></label>
          <label className="outbound-field">{ui('Phone')}<input placeholder={ui('Phone number')} value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></label>
          <label className="outbound-field">{ui('Address')}<input placeholder={ui('Delivery or business address')} value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} /></label>
          <label className="outbound-field outbound-field--wide">{ui('Notes')}<textarea placeholder={ui('Optional delivery, account, or relationship notes')} value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} /></label>
        </div>
        <div className="outbound-actions-row"><button type="button" className="outbound-button-primary" disabled={!customerForm.name.trim() || mutation.isPending} onClick={saveCustomer}>{mutation.isPending ? ui('Saving…') : editingCustomer ? ui('Save Customer') : ui('Add Customer')}</button>{editingCustomer ? <button type="button" className="outbound-button" onClick={cancelCustomerEdit}>{ui('Cancel Edit')}</button> : null}</div>
      </div> : null}
      {!canCustomerRead ? <div className="outbound-alert outbound-alert--warning">{ui('Your role can create customers but does not have customer read permission, so the customer list is hidden.')}</div> : <>
        <div className="outbound-filter-grid">
          <label className="outbound-field outbound-field--wide">{ui('Search customers')}<input placeholder={ui('Name, email, phone, address, or notes')} value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} /></label>
        </div>
        {customers.isLoading ? <div className="outbound-empty">{ui('Loading customers…')}</div> : customers.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(customers.error, ui('Customers could not be loaded.'))}</div> : filteredCustomers.length === 0 ? <EmptyState title={customerOptions.length ? ui('No customers match this search') : ui('No customers yet')} text={customerOptions.length ? ui('Clear or change the search text.') : ui('Add a customer before creating a new outbound order.')} action={!customerOptions.length && canCustomerWrite ? <button type="button" className="outbound-button-primary" onClick={() => setShowCustomerForm(true)}>{ui('Add first customer')}</button> : undefined} /> : <>
          <div className="outbound-list-meta"><span>{ui('Showing')} {((customerPage - 1) * CUSTOMER_PAGE_SIZE) + 1}–{Math.min(customerPage * CUSTOMER_PAGE_SIZE, filteredCustomers.length)} {ui('of')} {filteredCustomers.length} {ui('customer(s).')}</span></div>
          <div className="outbound-customer-list">{pagedCustomers.map((customer) => <article key={customer.id} className="outbound-customer-card" style={{ opacity: customer.active ? 1 : 0.72 }}>
            <div className="outbound-card-topline"><div><div className="outbound-card-title">{customer.name}</div><div className="outbound-card-subtitle">{[customer.email, customer.phone, customer.address].filter(Boolean).join(' · ') || ui('No contact details')}</div></div><StatusBadge status={customer.active ? 'active' : 'archived'} /></div>
            {customer.notes ? <div className="outbound-notes">{customer.notes}</div> : null}
            {canCustomerWrite && customer.active ? <div className="outbound-actions-row"><button type="button" className="outbound-button" onClick={() => beginCustomerEdit(customer)}>{ui('Edit')}</button><button type="button" className="outbound-button-danger" onClick={() => { if (window.confirm(ui('Archive {customer}? Existing orders stay in history.').replace('{customer}', customer.name))) mutation.mutate({ path: `/outbound/customers/${customer.id}/archive`, version: Number(customer.version), successMessage: ui('{customer} archived.').replace('{customer}', customer.name) }); }}>{ui('Archive')}</button></div> : null}
          </article>)}</div>
          {customerPageCount > 1 ? <div className="outbound-pagination"><button type="button" className="outbound-button" disabled={customerPage <= 1} onClick={() => setCustomerPage((page) => Math.max(1, page - 1))}>{ui('Previous')}</button><span>{ui('Page')} {customerPage} {ui('of')} {customerPageCount}</span><button type="button" className="outbound-button" disabled={customerPage >= customerPageCount} onClick={() => setCustomerPage((page) => Math.min(customerPageCount, page + 1))}>{ui('Next')}</button></div> : null}
        </>}
      </>}
    </section> : null}

    {activeTab === 'returns' ? <section className="outbound-panel">
      <div className="outbound-section-heading">
        <div className="io-section-heading-with-icon"><span className="io-section-heading-icon"><TenantNavIcon path="/stock-transfers" size={18} /></span><div className="io-section-heading-copy"><h3>{ui('Customer returns')}</h3><p>{ui('Create returns only from stock that was actually dispatched. Receiving a return restores usable stock only when the selected condition is “Return to usable stock”.')}</p></div></div>
        <div className="outbound-section-heading-actions">{canReturnRead ? <button type="button" className="outbound-button" onClick={() => { void returns.refetch(); if (canReturnCreate) void trace.refetch(); }} disabled={returns.isFetching || (canReturnCreate && trace.isFetching)}>{returns.isFetching || (canReturnCreate && trace.isFetching) ? ui('Refreshing…') : ui('Refresh returns')}</button> : null}</div>
      </div>
      {canReturnCreate ? canLocationRead ? <div className="outbound-panel" style={{ boxShadow: 'none', background: '#f8fafc', marginBottom: 14 }}>
        <div className="outbound-section-heading"><div><h3>{ui('Create customer return')}</h3><p>{ui('Multiple lines can be grouped into one return when they came from the same customer order.')}</p></div></div>
        {(trace.isLoading || locations.isLoading) ? <div className="outbound-alert outbound-alert--info">{ui('Loading dispatched stock and return locations…')}</div> : (trace.isError || locations.isError) ? <div className="outbound-alert outbound-alert--error">{trace.isError ? queryErrorMessage(trace.error, ui('Dispatch history could not be loaded for returns.')) : queryErrorMessage(locations.error, ui('Return locations could not be loaded.'))}</div> : <>
        {blockedHistoricalSerializedReturns.length > 0 ? <div className="outbound-alert outbound-alert--warning">{ui('Some serialized dispatches cannot be returned because serial tracking is currently disabled. Re-enable serial tracking for those products before creating the return.')}</div> : null}
        {returnCreateEligibleTrace.length === 0 ? <div className="outbound-alert outbound-alert--info">{ui('There is no dispatched stock currently eligible for a new return.')}</div> : <>
          <div className="outbound-form-grid outbound-form-grid--customer">
            <label className="outbound-field">{ui('Return reason')}<input placeholder={ui('Why is the customer returning it?')} value={returnForm.reason} onChange={(event) => setReturnForm({ ...returnForm, reason: event.target.value })} /></label>
            <label className="outbound-field">{ui('Return notes')}<input placeholder={ui('Optional return reference or notes')} value={returnForm.notes} onChange={(event) => setReturnForm({ ...returnForm, notes: event.target.value })} /></label>
          </div>
          {returnForm.items.map((line, index) => {
            const selected = selectedTraceForReturnLine(line);
            const eligibleRows = eligibleReturnRowsForLine(index);
            return <div key={index} className="outbound-return-line-editor">
              <div className="outbound-return-line-grid">
                <label className="outbound-field">{ui('Dispatched stock')} <select value={line.allocation_id} onChange={(event) => chooseReturnAllocation(index, event.target.value)}>
                    <option value="">{ui('Choose dispatched stock')}</option>
                    {eligibleRows.map((row) => <option key={row.allocation_id} value={row.allocation_id}>{row.order_number} · {referenceLabel(row.customer_name)} · {referenceLabel(row.product_name)} · {formatLot(row)} · {formatNumber(row.returnable_quantity)} {referenceLabel(row.product_unit)} {ui('returnable')}</option>)}
                  </select>
                </label>
                <label className="outbound-field">{ui('Return to location')} <select value={line.storage_location_id} onChange={(event) => updateReturnLine(index, { storage_location_id: event.target.value })}>
                    <option value="">{ui('Return to location')}</option>
                    {locationOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </label>
                <label className="outbound-field">{ui('Quantity')} <input type="number" min="0.0001" max={selected ? toNumber(selected.returnable_quantity) : undefined} step="0.0001" value={line.quantity} onChange={(event) => updateReturnLine(index, { quantity: event.target.value, serial_numbers: [] })} />
                </label>
                <label className="outbound-field">{ui('Condition')} <select value={line.condition} onChange={(event) => updateReturnLine(index, { condition: event.target.value as ReturnLineForm['condition'] })}>
                    <option value="available">{ui('Return to usable stock')}</option>
                    <option value="hold">{ui('Hold / inspect first')}</option>
                    <option value="damaged">{ui('Damaged')}</option>
                    <option value="rejected">{ui('Rejected')}</option>
                    <option value="quarantine">{ui('Quarantine')}</option>
                  </select>
                </label>
                <button type="button" className="outbound-button-danger" disabled={returnForm.items.length === 1} onClick={() => removeReturnLine(index)}>{ui('Remove')}</button>
              </div>
              {selected ? <div className="outbound-card-subtitle">{selected.order_number} · {referenceLabel(selected.customer_name)} · {referenceLabel(selected.product_name)} · {formatLot(selected)} {ui('· up to')} {formatNumber(selected.returnable_quantity)} {referenceLabel(selected.product_unit)} {ui('still returnable.')}</div> : null}
              {selected?.returnable_serial_numbers?.length ? <div className="outbound-serial-box"><div className="outbound-muted" style={{ marginBottom: 7 }}>{ui('Select the exact serials physically returned (')}{line.serial_numbers.length}/{Number.isInteger(Number(line.quantity)) ? Number(line.quantity) : '?'})</div>{selected.returnable_serial_numbers.map((serial) => { const checked = line.serial_numbers.includes(serial); return <label key={serial}><input type="checkbox" checked={checked} onChange={(event) => updateReturnLine(index, { serial_numbers: event.target.checked ? [...line.serial_numbers, serial] : line.serial_numbers.filter((value) => value !== serial) })} /> {serial}</label>; })}</div> : null}
            </div>;
          })}
          <div className="outbound-actions-row">
            <button type="button" className="outbound-button" onClick={addReturnLine} disabled={!returnOrderId || eligibleReturnRowsForLine(returnForm.items.length).length === 0}>{ui('Add return line')}</button>
            <button type="button" className="outbound-button-primary" disabled={Boolean(returnFormValidation) || mutation.isPending || locations.isLoading || trace.isLoading || locations.isError || trace.isError} onClick={createReturn}>{mutation.isPending ? ui('Creating…') : ui('Create Customer Return')}</button>
          </div>
          {returnFormValidation && (returnForm.reason || returnForm.items.some((line) => line.allocation_id)) ? <div className="outbound-form-help" style={{ marginTop: 7 }}>{returnFormValidation}</div> : null}
        </>}
        </>}
      </div> : <div className="outbound-alert outbound-alert--warning">{ui('Creating a return requires storage-location read permission so the destination can be selected safely.')}</div> : null}

      {canReturnRead ? <>
        <div className="outbound-filter-grid">
          <label className="outbound-field">{ui('Search returns')}<input placeholder={ui('Return number, order, customer, product, or reason')} value={returnSearch} onChange={(event) => setReturnSearch(event.target.value)} /></label>
          <label className="outbound-field">{ui('Status')}<select value={returnStatus} onChange={(event) => setReturnStatus(event.target.value)}><option value="all">{ui('All statuses')}</option><option value="draft">{ui('Waiting to receive')}</option><option value="received">{ui('Received')}</option><option value="cancelled">{ui('Cancelled')}</option></select></label>
        </div>
        {returns.isLoading ? <div className="outbound-empty">{ui('Loading customer returns…')}</div> : returns.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(returns.error, ui('Customer returns could not be loaded.'))}</div> : filteredReturns.length === 0 ? <EmptyState title={returnRows.length ? ui('No returns match these filters') : ui('No customer returns yet')} text={returnRows.length ? ui('Change the search or status filter.') : ui('Returns will appear here after they are created from dispatched stock.')} /> : <>
          <div className="outbound-list-meta"><span>{ui('Showing')} {((returnPage - 1) * RETURN_PAGE_SIZE) + 1}–{Math.min(returnPage * RETURN_PAGE_SIZE, filteredReturns.length)} {ui('of')} {filteredReturns.length} {ui('return(s).')}</span></div>
          <div className="outbound-return-list">{pagedReturns.map((row) => <article key={row.id} className="outbound-return-card">
            <div className="outbound-card-topline"><div><div className="outbound-card-title">{row.return_number} · {referenceLabel(row.customer_name)}</div><div className="outbound-card-subtitle">{ui('Order')} {referenceLabel(row.order_number)} {ui('· Created')} {formatDate(row.created_at)}</div></div><StatusBadge status={row.status} /></div>
            <div className="outbound-notes"><strong>{ui('Reason:')}</strong> {row.reason}{row.notes ? <> · {row.notes}</> : null}</div>
            {row.status === 'cancelled' && row.cancellation_reason ? <div className="outbound-alert outbound-alert--error" style={{ marginTop: 8 }}><strong>{ui('Cancellation:')}</strong> {row.cancellation_reason}</div> : null}
            <div className="outbound-return-items">{row.items.map((item) => <div key={item.id}><strong>{referenceLabel(item.product_name)}</strong> · {ui('SKU:')} {referenceLabel(item.product_sku)} · {formatNumber(item.quantity)} {referenceLabel(item.product_unit)} → {formatStatus(item.condition)} @ {referenceLabel(item.storage_location_name)}{item.lot_number || item.batch_number ? ` · ${[item.lot_number ? `${ui('Lot')} ${item.lot_number}` : '', item.batch_number ? `${ui('Batch')} ${item.batch_number}` : ''].filter(Boolean).join(' · ')}` : ''}{item.serial_numbers?.length ? <> · <strong>{ui('Serials:')}</strong> {item.serial_numbers.join(', ')}</> : null}{item.notes ? <> · <strong>{ui('Item note:')}</strong> {item.notes}</> : null}</div>)}</div>
            {row.status === 'draft' ? <div className="outbound-actions-row">{canReturnReceive ? <button type="button" className="outbound-button-primary" disabled={mutation.isPending} onClick={() => { if (window.confirm(ui('Receive this customer return into inventory now?'))) mutation.mutate({ path: `/outbound/returns/${row.id}/receive`, version: Number(row.version), successMessage: ui('{return} received into inventory.').replace('{return}', row.return_number) }); }}>{ui('Receive Return')}</button> : null}{canReturnCancel ? <button type="button" className="outbound-button-danger" disabled={mutation.isPending} onClick={() => { const reason = window.prompt(ui('Return cancellation reason')); if (reason && reason.trim().length >= 3) mutation.mutate({ path: `/outbound/returns/${row.id}/cancel`, version: Number(row.version), body: { reason: reason.trim() }, successMessage: ui('{return} cancelled.').replace('{return}', row.return_number) }); }}>{ui('Cancel Return')}</button> : null}</div> : null}
          </article>)}</div>
          {returnPageCount > 1 ? <div className="outbound-pagination"><button type="button" className="outbound-button" disabled={returnPage <= 1} onClick={() => setReturnPage((page) => Math.max(1, page - 1))}>{ui('Previous')}</button><span>{ui('Page')} {returnPage} {ui('of')} {returnPageCount}</span><button type="button" className="outbound-button" disabled={returnPage >= returnPageCount} onClick={() => setReturnPage((page) => Math.min(returnPageCount, page + 1))}>{ui('Next')}</button></div> : null}
        </>}
      </> : <div className="outbound-alert outbound-alert--info">{ui('Your role can create a return but does not have customer-return read permission, so existing return records are hidden.')}</div>}
    </section> : null}

    {activeTab === 'trace' ? <section className="outbound-panel">
      <div className="outbound-section-heading">
        <div className="io-section-heading-with-icon"><span className="io-section-heading-icon"><TenantNavIcon path="/stock-movements" size={18} /></span><div className="io-section-heading-copy"><h3>{ui('Dispatch trace')}</h3><p>{ui('Read-only proof of what stock actually left for which customer. Lot, batch, expiry, serial, and return status are shown when those identities exist.')}</p></div></div>
        <button type="button" className="outbound-button" onClick={() => void trace.refetch()} disabled={trace.isFetching}>{trace.isFetching ? ui('Refreshing…') : ui('Refresh trace')}</button>
      </div>
      <div className="outbound-filter-grid"><label className="outbound-field outbound-field--wide">{ui('Search dispatch trace')}<input placeholder={ui('Order, customer, product, location, lot, batch, or serial')} value={traceSearch} onChange={(event) => setTraceSearch(event.target.value)} /></label></div>
      {trace.isLoading ? <div className="outbound-empty">{ui('Loading dispatch trace…')}</div> : trace.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(trace.error, ui('Dispatch trace could not be loaded.'))}</div> : filteredTrace.length === 0 ? <EmptyState title={traceRows.length ? ui('No dispatch records match this search') : ui('No dispatched stock yet')} text={traceRows.length ? ui('Change or clear the search.') : ui('Trace records appear after packed stock is dispatched.')} /> : <>
        <div className="outbound-list-meta"><span>{ui('Showing')} {((tracePage - 1) * TRACE_PAGE_SIZE) + 1}–{Math.min(tracePage * TRACE_PAGE_SIZE, filteredTrace.length)} {ui('of')} {filteredTrace.length} {ui('dispatched allocation(s).')}</span></div>
        <div className="outbound-trace-list">{pagedTrace.map((row) => <article key={row.allocation_id} className="outbound-trace-card">
          <div className="outbound-card-topline"><div><div className="outbound-card-title">{row.order_number} · {referenceLabel(row.customer_name)}</div><div className="outbound-card-subtitle">{referenceLabel(row.product_name)} · {ui('SKU:')} {referenceLabel(row.product_sku)} · {referenceLabel(row.storage_location_name)} · {formatLot(row)}</div></div><StatusBadge status={row.order_status} /></div>
          <div className="outbound-trace-metrics"><span>{ui('Dispatched')} <strong>{formatNumber(row.dispatched_quantity)} {referenceLabel(row.product_unit)}</strong></span>{canReturnRead ? <><span>{ui('Returned')} <strong>{formatNumber(row.returned_quantity)}</strong></span><span>{ui('Pending return')} <strong>{formatNumber(Math.max(toNumber(row.claimed_return_quantity) - toNumber(row.returned_quantity), 0))}</strong></span><span>{ui('Still returnable')} <strong>{formatNumber(row.returnable_quantity)}</strong></span></> : null}</div>
          {row.serial_numbers === null ? <div className="outbound-notes"><strong>{ui('Serials:')}</strong> {ui('Reference unavailable')}</div> : row.serial_numbers?.length ? <div className="outbound-notes"><strong>{ui('Serials:')}</strong> {row.serial_numbers.join(', ')}</div> : null}
        </article>)}</div>
        {tracePageCount > 1 ? <div className="outbound-pagination"><button type="button" className="outbound-button" disabled={tracePage <= 1} onClick={() => setTracePage((page) => Math.max(1, page - 1))}>{ui('Previous')}</button><span>{ui('Page')} {tracePage} {ui('of')} {tracePageCount}</span><button type="button" className="outbound-button" disabled={tracePage >= tracePageCount} onClick={() => setTracePage((page) => Math.min(tracePageCount, page + 1))}>{ui('Next')}</button></div> : null}
      </>}
    </section> : null}
  </div>;
}
