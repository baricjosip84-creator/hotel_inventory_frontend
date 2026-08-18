import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError, getVersionConflictMessage, isVersionConflictError } from '../lib/api';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import ProductUomSelect from '../components/inventory/ProductUomSelect';
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
  product_name: string;
  product_unit: string;
  storage_location_id: string;
  storage_location_name: string;
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
  customer_name: string;
  customer_active: boolean;
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
  customer_name: string;
  storage_location_id: string;
  storage_location_name: string;
  product_name: string;
  product_unit: string;
  lot_number?: string | null;
  batch_number?: string | null;
  expiry_date?: string | null;
  dispatched_quantity: number | string;
  claimed_return_quantity: number | string;
  returned_quantity: number | string;
  returnable_quantity: number | string;
  serial_numbers?: string[];
};

type ReturnItem = {
  id: string;
  quantity: number | string;
  condition: string;
  storage_location_id: string;
  storage_location_name: string;
  product_name: string;
  product_unit: string;
  lot_number?: string | null;
  batch_number?: string | null;
};

type CustomerReturn = {
  id: string;
  return_number: string;
  order_number: string;
  customer_name: string;
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
  pending_customer_returns: number;
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

const formatNumber = (value: number | string | undefined | null) =>
  toNumber(value).toLocaleString(undefined, { maximumFractionDigits: 4 });

const formatDate = (value: string | null | undefined, dateOnly = false) => {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, dateOnly ? 10 : undefined);
  return dateOnly ? parsed.toLocaleDateString() : parsed.toLocaleString();
};

const formatStatus = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatLot = (lot?: PickLot | TraceRow | null) => {
  if (!lot) return 'No lot label';
  const labels = [
    lot.lot_number ? `Lot ${lot.lot_number}` : null,
    lot.batch_number ? `Batch ${lot.batch_number}` : null,
    lot.expiry_date ? `Exp ${String(lot.expiry_date).slice(0, 10)}` : null
  ].filter(Boolean);
  return labels.length ? labels.join(' · ') : 'Untracked stock';
};

const formatOrderQuantity = (item: OrderItem) => {
  const base = `${formatNumber(item.quantity)} ${item.product_unit}`;
  const enteredUom = String(item.uom_code || '').trim();
  const entered = item.entered_quantity;
  if (!enteredUom || entered === undefined || entered === null || enteredUom.toLocaleLowerCase() === String(item.product_unit || '').toLocaleLowerCase()) {
    return base;
  }
  return `${formatNumber(entered)} ${enteredUom} (${base} base)`;
};

const queryErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
};

function StatusBadge({ status }: { status: string }) {
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
  return <span className={`outbound-status-badge outbound-status-badge--${tone}`}>{formatStatus(status)}</span>;
}

function StatCard({ label, value, help, tone = 'default' }: { label: string; value: number | string; help: string; tone?: 'default' | 'good' | 'warn' | 'danger' }) {
  return <div className="outbound-stat-card">
    <div className="outbound-stat-label">{label}</div>
    <div className={`outbound-stat-value${tone === 'default' ? '' : ` outbound-stat-value--${tone}`}`}>{value}</div>
    <div className="outbound-stat-help">{help}</div>
  </div>;
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
  const traceDataNeeded = activeTab === 'trace' || activeTab === 'returns';

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
    enabled: Boolean(pickOrderId)
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
      setError(getVersionConflictMessage(mutationError));
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
        ...order.items.flatMap((item) => [item.product_name, item.storage_location_name])
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
      return [row.return_number, row.order_number, row.customer_name, row.reason, row.notes, ...row.items.map((item) => item.product_name)]
        .some((value) => String(value || '').toLocaleLowerCase().includes(search));
    });
  }, [returnRows, returnSearch, returnStatus]);
  const pagedReturns = filteredReturns.slice((returnPage - 1) * RETURN_PAGE_SIZE, returnPage * RETURN_PAGE_SIZE);
  const returnPageCount = Math.max(1, Math.ceil(filteredReturns.length / RETURN_PAGE_SIZE));

  const filteredTrace = useMemo(() => {
    const search = traceSearch.trim().toLocaleLowerCase();
    if (!search) return traceRows;
    return traceRows.filter((row) => [row.order_number, row.customer_name, row.product_name, row.storage_location_name, row.lot_number, row.batch_number, ...(row.serial_numbers || [])]
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
      ? { path: `/outbound/customers/${editingCustomer.id}`, method: 'PUT', body, version: Number(editingCustomer.version), successMessage: 'Customer updated.' }
      : { path: '/outbound/customers', body, successMessage: 'Customer added.' };
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
      setError('Choose a customer and complete at least one order line.');
      return;
    }
    const body = {
      customer_id: orderForm.customer_id,
      requested_date: orderForm.requested_date || null,
      notes: orderForm.notes.trim() || null,
      items
    };
    const request: MutationInput = editingOrder
      ? { path: `/outbound/orders/${editingOrder.id}`, method: 'PUT', body, version: Number(editingOrder.version), successMessage: `${editingOrder.order_number} updated.` }
      : { path: '/outbound/orders', body, successMessage: 'Customer order created as a draft.' };
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
      successMessage: `${order.order_number} is ready for physical picking.`
    }, { onSuccess: () => { setPickDrafts({}); setPickOrderId(order.id); } });
  };

  const recordPick = (item: PickItem) => {
    if (!pickOptions.data) return;
    const draft = pickDrafts[item.id] ?? { quantity: '', inventory_lot_id: '', serial_numbers: [] };
    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Enter a picked quantity greater than zero.');
      return;
    }
    if (item.serial_tracking_enabled) {
      if (!Number.isInteger(quantity) || draft.serial_numbers.length !== quantity) {
        setError(`Select exactly ${Number.isInteger(quantity) ? quantity : 'one serial per whole'} serial number(s) for this serial-tracked pick.`);
        return;
      }
    } else if (item.requires_lot_tracking && !draft.inventory_lot_id) {
      setError('Choose the lot/batch that was physically picked for this product.');
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
      successMessage: `${item.product_name} pick recorded.`
    }, {
      onSuccess: () => setPickDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      })
    });
  };

  const selectedTraceForReturnLine = (line: ReturnLineForm) => returnableTrace.find((row) => row.allocation_id === line.allocation_id) ?? null;
  const firstSelectedReturnTrace = returnForm.items.map(selectedTraceForReturnLine).find(Boolean) ?? null;
  const returnOrderId = firstSelectedReturnTrace?.outbound_order_id ?? null;

  const eligibleReturnRowsForLine = (index: number) => {
    const selectedElsewhere = new Set(returnForm.items.filter((_, lineIndex) => lineIndex !== index).map((line) => line.allocation_id).filter(Boolean));
    return returnableTrace.filter((row) => (!returnOrderId || row.outbound_order_id === returnOrderId) && !selectedElsewhere.has(row.allocation_id));
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

  const returnFormValidation = useMemo(() => {
    if (returnForm.reason.trim().length < 3) return 'Enter a return reason of at least 3 characters.';
    if (!returnForm.items.length) return 'Add at least one returned item.';
    for (const line of returnForm.items) {
      const selected = returnableTrace.find((row) => row.allocation_id === line.allocation_id);
      const quantity = Number(line.quantity);
      if (!selected || !line.storage_location_id || !Number.isFinite(quantity) || quantity <= 0) return 'Complete every return line with dispatched stock, a return location, and a quantity.';
      if (quantity > toNumber(selected.returnable_quantity)) return `Return quantity for ${selected.product_name} exceeds the quantity still returnable.`;
      if (selected.serial_numbers?.length && (!Number.isInteger(quantity) || line.serial_numbers.length !== quantity)) return `Select exactly ${Number.isInteger(quantity) ? quantity : 'one serial per whole'} serial number(s) for ${selected.product_name}.`;
    }
    return '';
  }, [returnForm, returnableTrace]);

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
      successMessage: 'Customer return created and is waiting to be received.'
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

  return <div className="io-operational-page io-outbound-page">
    <section className="outbound-panel outbound-overview">
      <div className="outbound-overview-copy">
        <div className="outbound-eyebrow">Customer fulfillment</div>
        <h2>From customer order to dispatched stock</h2>
        <p>Confirming an order reserves stock. Warehouse staff then record what was physically picked, pack only those quantities, and dispatch only packed stock. Partial dispatches keep the remaining order reservation intact.</p>
      </div>
      <div className="outbound-workflow-grid" aria-label="Outbound workflow">
        <div className="outbound-workflow-step"><strong>1. Draft</strong><span>Choose the customer, products, source locations, quantities, and requested date.</span></div>
        <div className="outbound-workflow-step"><strong>2. Confirm</strong><span>Reserve usable stock so another workflow cannot consume the same free quantity.</span></div>
        <div className="outbound-workflow-step"><strong>3. Pick</strong><span>Record the stock actually taken from shelves, including lot/batch or serial identity when required.</span></div>
        <div className="outbound-workflow-step"><strong>4. Pack</strong><span>Mark only the currently picked quantities as packed and ready for dispatch.</span></div>
        <div className="outbound-workflow-step"><strong>5. Dispatch</strong><span>Reduce inventory only when packed stock leaves the business. Returns are handled separately.</span></div>
      </div>
      {message ? <div className="outbound-alert outbound-alert--success" role="status">{message}</div> : null}
      {error ? <div className="outbound-alert outbound-alert--error" role="alert">{error}</div> : null}
    </section>

    <section className="outbound-panel">
      <div className="outbound-section-heading">
        <div><h3>Outbound status</h3><p>A quick operational view. Counts are used here instead of adding unrelated product units such as pieces, kilograms, or litres together.</p></div>
        <div className="outbound-section-heading-actions"><button type="button" className="outbound-button" onClick={() => { void summary.refetch(); void orders.refetch(); }} disabled={summary.isFetching || orders.isFetching}>{summary.isFetching || orders.isFetching ? 'Refreshing…' : 'Refresh status'}</button></div>
      </div>
      {summary.isLoading ? <div className="outbound-empty">Loading outbound status…</div> : summary.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(summary.error, 'Outbound status is unavailable.')}</div> : summary.data ? <div className="outbound-summary-grid">
        <StatCard label="Open orders" value={summary.data.open_orders} help="Confirmed through partially dispatched" tone={summary.data.open_orders > 0 ? 'warn' : 'default'} />
        <StatCard label="Ready to pick" value={summary.data.confirmed_orders} help="Confirmed and reserved" tone={summary.data.confirmed_orders > 0 ? 'warn' : 'default'} />
        <StatCard label="Picking" value={summary.data.picking_orders} help="Warehouse work in progress" tone={summary.data.picking_orders > 0 ? 'warn' : 'default'} />
        <StatCard label="Packed" value={summary.data.packed_orders} help="Waiting for dispatch" tone={summary.data.packed_orders > 0 ? 'warn' : 'default'} />
        <StatCard label="Partial shipments" value={summary.data.partially_dispatched_orders} help="Remainder still reserved" tone={summary.data.partially_dispatched_orders > 0 ? 'warn' : 'default'} />
        <StatCard label="Completed 30 days" value={summary.data.dispatched_orders_30d} help="Fully dispatched orders" tone="good" />
        <StatCard label="Returns waiting" value={summary.data.pending_customer_returns} help="Created but not yet received" tone={summary.data.pending_customer_returns > 0 ? 'warn' : 'good'} />
      </div> : null}
    </section>

    <section className="outbound-panel outbound-tabs-shell">
      <div className="outbound-tabs" role="tablist" aria-label="Outbound work areas">
        <button type="button" className={`outbound-tab${activeTab === 'orders' ? ' outbound-tab--active' : ''}`} onClick={() => setTab('orders')} role="tab" aria-selected={activeTab === 'orders'}>Orders<span className="outbound-tab-count">{activeOrderCount}</span></button>
        {showCustomerTab ? <button type="button" className={`outbound-tab${activeTab === 'customers' ? ' outbound-tab--active' : ''}`} onClick={() => setTab('customers')} role="tab" aria-selected={activeTab === 'customers'}>Customers</button> : null}
        {showReturnTab ? <button type="button" className={`outbound-tab${activeTab === 'returns' ? ' outbound-tab--active' : ''}`} onClick={() => setTab('returns')} role="tab" aria-selected={activeTab === 'returns'}>Customer returns{summary.data?.pending_customer_returns ? <span className="outbound-tab-count">{summary.data.pending_customer_returns}</span> : null}</button> : null}
        <button type="button" className={`outbound-tab${activeTab === 'trace' ? ' outbound-tab--active' : ''}`} onClick={() => setTab('trace')} role="tab" aria-selected={activeTab === 'trace'}>Dispatch trace</button>
      </div>
    </section>

    {activeTab === 'orders' ? <>
      {(showOrderForm || editingOrder) ? <section className="outbound-panel">
        <div className="outbound-section-heading">
          <div><h3>{editingOrder ? `Edit draft ${editingOrder.order_number}` : 'Create customer order'}</h3><p>Create a draft first. Stock is not reserved until the draft is confirmed.</p></div>
          <button type="button" className="outbound-button" onClick={cancelOrderEdit}>Close form</button>
        </div>
        {!canUseOrderForm && !editingOrder ? <div className="outbound-alert outbound-alert--warning">Creating an order also requires read access to customers, products, and storage locations so the selections can be verified safely.</div> : null}
        {editingOrder && !canEditOrderForm ? <div className="outbound-alert outbound-alert--warning">Editing this draft requires read access to customers, products, and storage locations.</div> : null}
        {(canUseOrderForm || (editingOrder && canEditOrderForm)) ? <>
          {(customers.isLoading || products.isLoading || locations.isLoading) ? <div className="outbound-alert outbound-alert--info">Loading customer, product, and location options…</div> : null}
          {(customers.isError || products.isError || locations.isError) ? <div className="outbound-alert outbound-alert--error">Unable to load all order options. {customers.isError ? queryErrorMessage(customers.error, '') : products.isError ? queryErrorMessage(products.error, '') : queryErrorMessage(locations.error, '')}</div> : null}
          <div className="outbound-form-grid">
            <label className="outbound-field">Customer
              <select value={orderForm.customer_id} onChange={(event) => setOrderForm({ ...orderForm, customer_id: event.target.value })} disabled={mutation.isPending || customers.isLoading}>
                <option value="">Choose customer</option>
                {activeCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
              </select>
            </label>
            <label className="outbound-field">Requested date
              <input type="date" value={orderForm.requested_date} onChange={(event) => setOrderForm({ ...orderForm, requested_date: event.target.value })} disabled={mutation.isPending} />
            </label>
            <label className="outbound-field">Order notes
              <input placeholder="Delivery instruction or internal reference" value={orderForm.notes} onChange={(event) => setOrderForm({ ...orderForm, notes: event.target.value })} disabled={mutation.isPending} />
            </label>
          </div>
          {!customers.isLoading && activeCustomers.length === 0 ? <div className="outbound-alert outbound-alert--warning" style={{ marginTop: 12 }}>No active customers are available. <button type="button" className="outbound-button-quiet" onClick={() => { setTab('customers'); setShowCustomerForm(true); }}>Open Customers</button></div> : null}
          {orderForm.items.map((line, index) => <div key={index} className="outbound-order-line-editor">
            <label className="outbound-field">Product
              <select value={line.product_id} onChange={(event) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, lineIndex) => lineIndex === index ? { ...current, product_id: event.target.value, uom_code: '' } : current) })} disabled={mutation.isPending || products.isLoading}>
                <option value="">Choose product</option>
                {productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
            </label>
            <label className="outbound-field">Source location
              <select value={line.storage_location_id} onChange={(event) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, lineIndex) => lineIndex === index ? { ...current, storage_location_id: event.target.value } : current) })} disabled={mutation.isPending || locations.isLoading}>
                <option value="">Choose location</option>
                {locationOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
            <label className="outbound-field">Quantity
              <input type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(event) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, lineIndex) => lineIndex === index ? { ...current, quantity: event.target.value } : current) })} disabled={mutation.isPending} />
            </label>
            <label className="outbound-field">Unit of measure
              <ProductUomSelect productId={line.product_id} value={line.uom_code} purpose="issue" onChange={(value) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, lineIndex) => lineIndex === index ? { ...current, uom_code: value } : current) })} ariaLabel={`Unit of measure for outbound line ${index + 1}`} disabled={mutation.isPending} />
            </label>
            <button type="button" className="outbound-button-danger" disabled={orderForm.items.length === 1 || mutation.isPending} onClick={() => setOrderForm({ ...orderForm, items: orderForm.items.filter((_, lineIndex) => lineIndex !== index) })}>Remove</button>
          </div>)}
          <div className="outbound-actions-row">
            <button type="button" className="outbound-button" disabled={mutation.isPending} onClick={() => setOrderForm({ ...orderForm, items: [...orderForm.items, { product_id: '', storage_location_id: '', quantity: '1', uom_code: '' }] })}>Add line</button>
            <button type="button" className="outbound-button-primary" disabled={!orderForm.customer_id || cleanOrderItems(orderForm).length === 0 || mutation.isPending || customers.isError || products.isError || locations.isError} onClick={saveOrder}>{mutation.isPending ? 'Saving…' : editingOrder ? 'Save Draft' : 'Create Order'}</button>
            {editingOrder ? <button type="button" className="outbound-button" onClick={cancelOrderEdit} disabled={mutation.isPending}>Cancel Edit</button> : null}
          </div>
        </> : null}
      </section> : null}

      <section className="outbound-panel">
        <div className="outbound-section-heading">
          <div><h3>Customer orders</h3><p>Review the fulfillment state, open the warehouse picking workbench, and dispatch only packed stock.</p></div>
          <div className="outbound-section-heading-actions">
            <button type="button" className="outbound-button" onClick={() => void orders.refetch()} disabled={orders.isFetching}>{orders.isFetching ? 'Refreshing…' : 'Refresh orders'}</button>
            {canCreate ? <button type="button" className="outbound-button-primary" onClick={() => { setEditingOrder(null); setOrderForm(emptyOrder); setShowOrderForm(true); }}>New customer order</button> : null}
          </div>
        </div>
        <div className="outbound-filter-grid">
          <label className="outbound-field">Search orders
            <input placeholder="Order number, customer, product, location, or note" value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
          </label>
          <label className="outbound-field">Status
            <select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}>
              <option value="all">All statuses</option>
              <option value="open">All open work</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="picking">Picking</option>
              <option value="packed">Packed</option>
              <option value="partially_dispatched">Partially dispatched</option>
              <option value="completed">Completed / cancelled</option>
              <option value="dispatched">Dispatched</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        {orders.isLoading ? <div className="outbound-empty">Loading customer orders…</div> : orders.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(orders.error, 'Customer orders could not be loaded.')}</div> : filteredOrders.length === 0 ? <EmptyState title={orderRows.length ? 'No orders match these filters' : 'No customer orders yet'} text={orderRows.length ? 'Change the search or status filter to see other orders.' : 'Create a draft customer order when outbound fulfillment is needed.'} action={!orderRows.length && canCreate ? <button type="button" className="outbound-button-primary" onClick={() => setShowOrderForm(true)}>Create first order</button> : undefined} /> : <>
          <div className="outbound-list-meta"><span>Showing {((orderPage - 1) * ORDER_PAGE_SIZE) + 1}–{Math.min(orderPage * ORDER_PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length} matching order(s).</span><span>Drafts do not reserve stock.</span></div>
          <div className="outbound-order-list">{pagedOrders.map((order) => {
            const openPicked = order.items.reduce((sum, item) => sum + toNumber(item.open_picked_quantity), 0);
            const openPacked = order.items.reduce((sum, item) => sum + toNumber(item.open_packed_quantity), 0);
            const isPickingOpen = pickOrderId === order.id;
            return <article key={order.id} className={`outbound-order-card${isPickingOpen ? ' outbound-order-card--active' : ''}`}>
              <div className="outbound-card-topline">
                <div>
                  <div className="outbound-card-title">{order.order_number} · {order.customer_name}</div>
                  <div className="outbound-card-subtitle">Created {formatDate(order.created_at)} · Requested {order.requested_date ? formatDate(order.requested_date, true) : 'date not set'} · {order.items.length} line{order.items.length === 1 ? '' : 's'}</div>
                </div>
                <StatusBadge status={order.status} />
              </div>
              {order.notes ? <div className="outbound-notes"><strong>Order note:</strong> {order.notes}</div> : null}
              {order.status === 'cancelled' && order.cancellation_reason ? <div className="outbound-alert outbound-alert--error" style={{ marginTop: 9 }}><strong>Cancellation:</strong> {order.cancellation_reason}</div> : null}
              <div className="outbound-order-lines">{order.items.map((item) => <div key={item.id} className="outbound-order-line">
                <div><strong>{item.product_name}</strong><div className="outbound-muted">{item.storage_location_name}</div></div>
                <div>Ordered <strong>{formatOrderQuantity(item)}</strong><div className="outbound-muted">Dispatched {formatNumber(item.dispatched_quantity)} {item.product_unit}</div></div>
                <div>Picked waiting <strong>{formatNumber(item.open_picked_quantity)}</strong> · Packed waiting <strong>{formatNumber(item.open_packed_quantity)}</strong> · Remaining <strong>{formatNumber(item.remaining_quantity)}</strong> {item.product_unit}</div>
              </div>)}</div>
              <div className="outbound-actions-row">
                {order.status === 'draft' && canUpdate && canEditOrderForm ? <button type="button" className="outbound-button" onClick={() => beginOrderEdit(order)} disabled={mutation.isPending}>Edit Draft</button> : null}
                {order.status === 'draft' && canUpdate ? <button type="button" className="outbound-button-primary" onClick={() => mutation.mutate({ path: `/outbound/orders/${order.id}/confirm`, version: Number(order.version), successMessage: `${order.order_number} confirmed and stock reserved.` })} disabled={mutation.isPending}>{'Confirm & Reserve Stock'}</button> : null}
                {['confirmed', 'partially_dispatched'].includes(order.status) && canUpdate ? <button type="button" className="outbound-button-primary" onClick={() => startPicking(order)} disabled={mutation.isPending}>{order.status === 'partially_dispatched' ? 'Pick Remaining' : 'Start Picking'}</button> : null}
                {order.status === 'picking' && canUpdate ? <button type="button" className="outbound-button-primary" onClick={() => setPickOrderId(order.id)}>{isPickingOpen ? 'Picking Open' : 'Open Picking'}</button> : null}
                {order.status === 'picking' && canUpdate && openPicked > 0 ? <button type="button" className="outbound-button-primary" onClick={() => mutation.mutate({ path: `/outbound/orders/${order.id}/mark-packed`, version: Number(order.version), successMessage: `${order.order_number} picked stock marked packed.` }, { onSuccess: () => setPickOrderId('') })} disabled={mutation.isPending}>Mark Picked Stock Packed</button> : null}
                {['picking', 'packed'].includes(order.status) && canUpdate && openPicked > 0 ? <button type="button" className="outbound-button-danger" onClick={() => { if (window.confirm('Clear the current picked quantities and pick again?')) mutation.mutate({ path: `/outbound/orders/${order.id}/reset-picks`, version: Number(order.version), successMessage: `${order.order_number} open picks cleared.` }, { onSuccess: () => { setPickOrderId(''); setPickDrafts({}); } }); }} disabled={mutation.isPending}>Clear Picks</button> : null}
                {order.status === 'packed' && canDispatch && openPacked > 0 ? <button type="button" className="outbound-button-primary" onClick={() => { if (window.confirm('Dispatch all currently packed stock? Inventory will be reduced for the packed quantities now.')) mutation.mutate({ path: `/outbound/orders/${order.id}/dispatch`, version: Number(order.version), successMessage: `${order.order_number} packed stock dispatched.` }); }} disabled={mutation.isPending}>Dispatch Packed Stock</button> : null}
                {!['dispatched', 'cancelled'].includes(order.status) && canCancel ? <button type="button" className="outbound-button-danger" onClick={() => { const alreadyDispatched = order.items.some((item) => toNumber(item.dispatched_quantity) > 0); const reason = window.prompt(alreadyDispatched ? 'Reason for cancelling the undelivered remainder' : 'Cancellation reason'); if (reason && reason.trim().length >= 3) mutation.mutate({ path: `/outbound/orders/${order.id}/cancel`, body: { reason: reason.trim() }, version: Number(order.version), successMessage: `${order.order_number} cancelled${alreadyDispatched ? ' for the remaining undelivered quantity' : ''}.` }, { onSuccess: () => { if (pickOrderId === order.id) setPickOrderId(''); } }); }} disabled={mutation.isPending}>Cancel{order.items.some((item) => toNumber(item.dispatched_quantity) > 0) ? ' Remainder' : ''}</button> : null}
              </div>
            </article>;
          })}</div>
          {orderPageCount > 1 ? <div className="outbound-pagination"><button type="button" className="outbound-button" disabled={orderPage <= 1} onClick={() => setOrderPage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {orderPage} of {orderPageCount}</span><button type="button" className="outbound-button" disabled={orderPage >= orderPageCount} onClick={() => setOrderPage((page) => Math.min(orderPageCount, page + 1))}>Next</button></div> : null}
        </>}
      </section>

      {pickOrderId ? <section className="outbound-panel">
        <div className="outbound-section-heading">
          <div><h3>Picking workbench</h3><p>Record what was physically picked. This does not reduce stock yet; dispatch is the stock-changing step.</p></div>
          <button type="button" className="outbound-button" onClick={() => setPickOrderId('')}>Close</button>
        </div>
        {pickOptions.isLoading ? <div className="outbound-empty">Loading pick options…</div> : pickOptions.isError || !pickOptions.data ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(pickOptions.error, 'Unable to load picking details.')}</div> : pickOptions.data.items.map((item) => {
          const draft = pickDrafts[item.id] ?? { quantity: '', inventory_lot_id: '', serial_numbers: [] };
          const unpickedRemaining = Math.max(toNumber(item.remaining_quantity) - toNumber(item.open_picked_quantity), 0);
          return <div key={item.id} className="outbound-picking-line">
            <div className="outbound-card-title">{item.product_name} · {item.storage_location_name}</div>
            <div className="outbound-card-subtitle">Ordered {formatOrderQuantity(item)} · Dispatched {formatNumber(item.dispatched_quantity)} {item.product_unit} · Picked waiting {formatNumber(item.open_picked_quantity)} · Still unpicked {formatNumber(unpickedRemaining)} {item.product_unit}</div>
            {unpickedRemaining > 0 ? <>
              <div className="outbound-picking-controls">
                <label className="outbound-field">Picked quantity
                  <input type="number" min="0.0001" max={unpickedRemaining} step="0.0001" value={draft.quantity} onChange={(event) => setPickDrafts({ ...pickDrafts, [item.id]: { ...draft, quantity: event.target.value, serial_numbers: [] } })} />
                </label>
                {!item.serial_tracking_enabled && item.requires_lot_tracking ? <label className="outbound-field">Lot / batch physically picked
                  <select value={draft.inventory_lot_id} onChange={(event) => setPickDrafts({ ...pickDrafts, [item.id]: { ...draft, inventory_lot_id: event.target.value } })}>
                    <option value="">Choose lot / batch</option>
                    {item.lots.filter((lot) => lot.available_to_pick > 0).map((lot) => <option key={lot.id} value={lot.id}>{formatLot(lot)} · {formatNumber(lot.available_to_pick)} available</option>)}
                  </select>
                </label> : <div />}
                <button type="button" className="outbound-button-primary" disabled={mutation.isPending || !draft.quantity || (!item.serial_tracking_enabled && item.requires_lot_tracking && !draft.inventory_lot_id) || (Boolean(item.serial_tracking_enabled) && (!Number.isInteger(Number(draft.quantity)) || draft.serial_numbers.length !== Number(draft.quantity)))} onClick={() => recordPick(item)}>Record Pick</button>
              </div>
              {item.serial_tracking_enabled ? <div className="outbound-serial-box"><div className="outbound-muted" style={{ marginBottom: 7 }}>Select the exact physical serials picked ({draft.serial_numbers.length}/{Number.isInteger(Number(draft.quantity)) ? Number(draft.quantity) : '?'})</div>{(item.available_serials || []).map((serial) => { const checked = draft.serial_numbers.includes(serial.serial_number); return <label key={serial.id}><input type="checkbox" checked={checked} onChange={(event) => setPickDrafts({ ...pickDrafts, [item.id]: { ...draft, serial_numbers: event.target.checked ? [...draft.serial_numbers, serial.serial_number] : draft.serial_numbers.filter((value) => value !== serial.serial_number) } })} /> {serial.serial_number}</label>; })}{!(item.available_serials || []).length ? <span className="outbound-muted">No available serials found at this location.</span> : null}</div> : null}
            </> : <div className="outbound-alert outbound-alert--info" style={{ marginTop: 8 }}>Nothing else to pick on this line.</div>}
          </div>;
        })}
      </section> : null}
    </> : null}

    {activeTab === 'customers' ? <section className="outbound-panel">
      <div className="outbound-section-heading">
        <div><h3>Customers</h3><p>Maintain customer contact data used by outbound orders. Archived customers remain visible in historical orders but cannot be used for new orders.</p></div>
        <div className="outbound-section-heading-actions">
          {canCustomerRead ? <label className="outbound-checkbox-label"><input type="checkbox" checked={includeArchivedCustomers} onChange={(event) => setIncludeArchivedCustomers(event.target.checked)} /> Include archived</label> : null}
          {canCustomerRead ? <button type="button" className="outbound-button" onClick={() => void customers.refetch()} disabled={customers.isFetching}>{customers.isFetching ? 'Refreshing…' : 'Refresh customers'}</button> : null}
          {canCustomerWrite ? <button type="button" className="outbound-button-primary" onClick={() => { setEditingCustomer(null); setCustomerForm(emptyCustomer); setShowCustomerForm(true); }}>Add customer</button> : null}
        </div>
      </div>
      {showCustomerForm && canCustomerWrite ? <div className="outbound-panel" style={{ boxShadow: 'none', background: '#f8fafc', marginBottom: 14 }}>
        <div className="outbound-section-heading"><div><h3>{editingCustomer ? `Edit ${editingCustomer.name}` : 'New customer'}</h3><p>Only the customer name is required. Contact details make fulfillment and follow-up easier.</p></div><button type="button" className="outbound-button" onClick={cancelCustomerEdit}>Close form</button></div>
        <div className="outbound-form-grid outbound-form-grid--customer">
          <label className="outbound-field">Customer name<input placeholder="Customer or company name" value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} /></label>
          <label className="outbound-field">Email<input type="email" placeholder="orders@customer.com" value={customerForm.email} onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })} /></label>
          <label className="outbound-field">Phone<input placeholder="Phone number" value={customerForm.phone} onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })} /></label>
          <label className="outbound-field">Address<input placeholder="Delivery or business address" value={customerForm.address} onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })} /></label>
          <label className="outbound-field outbound-field--wide">Notes<textarea placeholder="Optional delivery, account, or relationship notes" value={customerForm.notes} onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })} /></label>
        </div>
        <div className="outbound-actions-row"><button type="button" className="outbound-button-primary" disabled={!customerForm.name.trim() || mutation.isPending} onClick={saveCustomer}>{mutation.isPending ? 'Saving…' : editingCustomer ? 'Save Customer' : 'Add Customer'}</button>{editingCustomer ? <button type="button" className="outbound-button" onClick={cancelCustomerEdit}>Cancel Edit</button> : null}</div>
      </div> : null}
      {!canCustomerRead ? <div className="outbound-alert outbound-alert--warning">Your role can create customers but does not have customer read permission, so the customer list is hidden.</div> : <>
        <div className="outbound-filter-grid">
          <label className="outbound-field outbound-field--wide">Search customers<input placeholder="Name, email, phone, address, or notes" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} /></label>
        </div>
        {customers.isLoading ? <div className="outbound-empty">Loading customers…</div> : customers.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(customers.error, 'Customers could not be loaded.')}</div> : filteredCustomers.length === 0 ? <EmptyState title={customerOptions.length ? 'No customers match this search' : 'No customers yet'} text={customerOptions.length ? 'Clear or change the search text.' : 'Add a customer before creating a new outbound order.'} action={!customerOptions.length && canCustomerWrite ? <button type="button" className="outbound-button-primary" onClick={() => setShowCustomerForm(true)}>Add first customer</button> : undefined} /> : <>
          <div className="outbound-list-meta"><span>Showing {((customerPage - 1) * CUSTOMER_PAGE_SIZE) + 1}–{Math.min(customerPage * CUSTOMER_PAGE_SIZE, filteredCustomers.length)} of {filteredCustomers.length} customer(s).</span></div>
          <div className="outbound-customer-list">{pagedCustomers.map((customer) => <article key={customer.id} className="outbound-customer-card" style={{ opacity: customer.active ? 1 : 0.72 }}>
            <div className="outbound-card-topline"><div><div className="outbound-card-title">{customer.name}</div><div className="outbound-card-subtitle">{[customer.email, customer.phone, customer.address].filter(Boolean).join(' · ') || 'No contact details'}</div></div><StatusBadge status={customer.active ? 'active' : 'archived'} /></div>
            {customer.notes ? <div className="outbound-notes">{customer.notes}</div> : null}
            {canCustomerWrite && customer.active ? <div className="outbound-actions-row"><button type="button" className="outbound-button" onClick={() => beginCustomerEdit(customer)}>Edit</button><button type="button" className="outbound-button-danger" onClick={() => { if (window.confirm(`Archive ${customer.name}? Existing orders stay in history.`)) mutation.mutate({ path: `/outbound/customers/${customer.id}/archive`, version: Number(customer.version), successMessage: `${customer.name} archived.` }); }}>Archive</button></div> : null}
          </article>)}</div>
          {customerPageCount > 1 ? <div className="outbound-pagination"><button type="button" className="outbound-button" disabled={customerPage <= 1} onClick={() => setCustomerPage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {customerPage} of {customerPageCount}</span><button type="button" className="outbound-button" disabled={customerPage >= customerPageCount} onClick={() => setCustomerPage((page) => Math.min(customerPageCount, page + 1))}>Next</button></div> : null}
        </>}
      </>}
    </section> : null}

    {activeTab === 'returns' ? <section className="outbound-panel">
      <div className="outbound-section-heading">
        <div><h3>Customer returns</h3><p>Create returns only from stock that was actually dispatched. Receiving a return restores usable stock only when the selected condition is “Return to usable stock”.</p></div>
        <div className="outbound-section-heading-actions">{canReturnRead ? <button type="button" className="outbound-button" onClick={() => { void returns.refetch(); void trace.refetch(); }} disabled={returns.isFetching || trace.isFetching}>{returns.isFetching || trace.isFetching ? 'Refreshing…' : 'Refresh returns'}</button> : null}</div>
      </div>
      {trace.isLoading ? <div className="outbound-alert outbound-alert--info">Loading dispatched stock eligible for returns…</div> : trace.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(trace.error, 'Dispatch history could not be loaded for returns.')}</div> : null}
      {canReturnCreate ? canLocationRead ? <div className="outbound-panel" style={{ boxShadow: 'none', background: '#f8fafc', marginBottom: 14 }}>
        <div className="outbound-section-heading"><div><h3>Create customer return</h3><p>Multiple lines can be grouped into one return when they came from the same customer order.</p></div></div>
        {returnableTrace.length === 0 ? <div className="outbound-alert outbound-alert--info">There is no dispatched stock currently eligible for a new return.</div> : <>
          <div className="outbound-form-grid outbound-form-grid--customer">
            <label className="outbound-field">Return reason<input placeholder="Why is the customer returning it?" value={returnForm.reason} onChange={(event) => setReturnForm({ ...returnForm, reason: event.target.value })} /></label>
            <label className="outbound-field">Return notes<input placeholder="Optional return reference or notes" value={returnForm.notes} onChange={(event) => setReturnForm({ ...returnForm, notes: event.target.value })} /></label>
          </div>
          {returnForm.items.map((line, index) => {
            const selected = selectedTraceForReturnLine(line);
            const eligibleRows = eligibleReturnRowsForLine(index);
            return <div key={index} className="outbound-return-line-editor">
              <div className="outbound-return-line-grid">
                <label className="outbound-field">Dispatched stock
                  <select value={line.allocation_id} onChange={(event) => chooseReturnAllocation(index, event.target.value)}>
                    <option value="">Choose dispatched stock</option>
                    {eligibleRows.map((row) => <option key={row.allocation_id} value={row.allocation_id}>{row.order_number} · {row.customer_name} · {row.product_name} · {formatLot(row)} · {formatNumber(row.returnable_quantity)} {row.product_unit} returnable</option>)}
                  </select>
                </label>
                <label className="outbound-field">Return to location
                  <select value={line.storage_location_id} onChange={(event) => updateReturnLine(index, { storage_location_id: event.target.value })}>
                    <option value="">Return to location</option>
                    {locationOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </label>
                <label className="outbound-field">Quantity
                  <input type="number" min="0.0001" max={selected ? toNumber(selected.returnable_quantity) : undefined} step="0.0001" value={line.quantity} onChange={(event) => updateReturnLine(index, { quantity: event.target.value, serial_numbers: [] })} />
                </label>
                <label className="outbound-field">Condition
                  <select value={line.condition} onChange={(event) => updateReturnLine(index, { condition: event.target.value as ReturnLineForm['condition'] })}>
                    <option value="available">Return to usable stock</option>
                    <option value="hold">Hold / inspect first</option>
                    <option value="damaged">Damaged</option>
                    <option value="rejected">Rejected</option>
                    <option value="quarantine">Quarantine</option>
                  </select>
                </label>
                <button type="button" className="outbound-button-danger" disabled={returnForm.items.length === 1} onClick={() => removeReturnLine(index)}>Remove</button>
              </div>
              {selected ? <div className="outbound-card-subtitle">{selected.order_number} · {selected.customer_name} · {selected.product_name} · {formatLot(selected)} · up to {formatNumber(selected.returnable_quantity)} {selected.product_unit} still returnable.</div> : null}
              {selected?.serial_numbers?.length ? <div className="outbound-serial-box"><div className="outbound-muted" style={{ marginBottom: 7 }}>Select the exact serials physically returned ({line.serial_numbers.length}/{Number.isInteger(Number(line.quantity)) ? Number(line.quantity) : '?'})</div>{selected.serial_numbers.map((serial) => { const checked = line.serial_numbers.includes(serial); return <label key={serial}><input type="checkbox" checked={checked} onChange={(event) => updateReturnLine(index, { serial_numbers: event.target.checked ? [...line.serial_numbers, serial] : line.serial_numbers.filter((value) => value !== serial) })} /> {serial}</label>; })}</div> : null}
            </div>;
          })}
          <div className="outbound-actions-row">
            <button type="button" className="outbound-button" onClick={addReturnLine} disabled={!returnOrderId || eligibleReturnRowsForLine(returnForm.items.length).length === 0}>Add return line</button>
            <button type="button" className="outbound-button-primary" disabled={Boolean(returnFormValidation) || mutation.isPending || locations.isLoading || trace.isLoading} onClick={createReturn}>{mutation.isPending ? 'Creating…' : 'Create Customer Return'}</button>
          </div>
          {returnFormValidation && (returnForm.reason || returnForm.items.some((line) => line.allocation_id)) ? <div className="outbound-form-help" style={{ marginTop: 7 }}>{returnFormValidation}</div> : null}
        </>}
      </div> : <div className="outbound-alert outbound-alert--warning">Creating a return requires storage-location read permission so the destination can be selected safely.</div> : null}

      {canReturnRead ? <>
        <div className="outbound-filter-grid">
          <label className="outbound-field">Search returns<input placeholder="Return number, order, customer, product, or reason" value={returnSearch} onChange={(event) => setReturnSearch(event.target.value)} /></label>
          <label className="outbound-field">Status<select value={returnStatus} onChange={(event) => setReturnStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Waiting to receive</option><option value="received">Received</option><option value="cancelled">Cancelled</option></select></label>
        </div>
        {returns.isLoading ? <div className="outbound-empty">Loading customer returns…</div> : returns.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(returns.error, 'Customer returns could not be loaded.')}</div> : filteredReturns.length === 0 ? <EmptyState title={returnRows.length ? 'No returns match these filters' : 'No customer returns yet'} text={returnRows.length ? 'Change the search or status filter.' : 'Returns will appear here after they are created from dispatched stock.'} /> : <>
          <div className="outbound-list-meta"><span>Showing {((returnPage - 1) * RETURN_PAGE_SIZE) + 1}–{Math.min(returnPage * RETURN_PAGE_SIZE, filteredReturns.length)} of {filteredReturns.length} return(s).</span></div>
          <div className="outbound-return-list">{pagedReturns.map((row) => <article key={row.id} className="outbound-return-card">
            <div className="outbound-card-topline"><div><div className="outbound-card-title">{row.return_number} · {row.customer_name}</div><div className="outbound-card-subtitle">Order {row.order_number} · Created {formatDate(row.created_at)}</div></div><StatusBadge status={row.status} /></div>
            <div className="outbound-notes"><strong>Reason:</strong> {row.reason}{row.notes ? <> · {row.notes}</> : null}</div>
            {row.status === 'cancelled' && row.cancellation_reason ? <div className="outbound-alert outbound-alert--error" style={{ marginTop: 8 }}><strong>Cancellation:</strong> {row.cancellation_reason}</div> : null}
            <div className="outbound-return-items">{row.items.map((item) => <div key={item.id}><strong>{item.product_name}</strong> · {formatNumber(item.quantity)} {item.product_unit} → {formatStatus(item.condition)} @ {item.storage_location_name}{item.lot_number || item.batch_number ? ` · ${[item.lot_number ? `Lot ${item.lot_number}` : '', item.batch_number ? `Batch ${item.batch_number}` : ''].filter(Boolean).join(' · ')}` : ''}</div>)}</div>
            {row.status === 'draft' ? <div className="outbound-actions-row">{canReturnReceive ? <button type="button" className="outbound-button-primary" disabled={mutation.isPending} onClick={() => { if (window.confirm('Receive this customer return into inventory now?')) mutation.mutate({ path: `/outbound/returns/${row.id}/receive`, version: Number(row.version), successMessage: `${row.return_number} received into inventory.` }); }}>Receive Return</button> : null}{canReturnCancel ? <button type="button" className="outbound-button-danger" disabled={mutation.isPending} onClick={() => { const reason = window.prompt('Return cancellation reason'); if (reason && reason.trim().length >= 3) mutation.mutate({ path: `/outbound/returns/${row.id}/cancel`, version: Number(row.version), body: { reason: reason.trim() }, successMessage: `${row.return_number} cancelled.` }); }}>Cancel Return</button> : null}</div> : null}
          </article>)}</div>
          {returnPageCount > 1 ? <div className="outbound-pagination"><button type="button" className="outbound-button" disabled={returnPage <= 1} onClick={() => setReturnPage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {returnPage} of {returnPageCount}</span><button type="button" className="outbound-button" disabled={returnPage >= returnPageCount} onClick={() => setReturnPage((page) => Math.min(returnPageCount, page + 1))}>Next</button></div> : null}
        </>}
      </> : <div className="outbound-alert outbound-alert--info">Your role can create a return but does not have customer-return read permission, so existing return records are hidden.</div>}
    </section> : null}

    {activeTab === 'trace' ? <section className="outbound-panel">
      <div className="outbound-section-heading">
        <div><h3>Dispatch trace</h3><p>Read-only proof of what stock actually left for which customer. Lot, batch, expiry, serial, and return status are shown when those identities exist.</p></div>
        <button type="button" className="outbound-button" onClick={() => void trace.refetch()} disabled={trace.isFetching}>{trace.isFetching ? 'Refreshing…' : 'Refresh trace'}</button>
      </div>
      <div className="outbound-filter-grid"><label className="outbound-field outbound-field--wide">Search dispatch trace<input placeholder="Order, customer, product, location, lot, batch, or serial" value={traceSearch} onChange={(event) => setTraceSearch(event.target.value)} /></label></div>
      {trace.isLoading ? <div className="outbound-empty">Loading dispatch trace…</div> : trace.isError ? <div className="outbound-alert outbound-alert--error">{queryErrorMessage(trace.error, 'Dispatch trace could not be loaded.')}</div> : filteredTrace.length === 0 ? <EmptyState title={traceRows.length ? 'No dispatch records match this search' : 'No dispatched stock yet'} text={traceRows.length ? 'Change or clear the search.' : 'Trace records appear after packed stock is dispatched.'} /> : <>
        <div className="outbound-list-meta"><span>Showing {((tracePage - 1) * TRACE_PAGE_SIZE) + 1}–{Math.min(tracePage * TRACE_PAGE_SIZE, filteredTrace.length)} of {filteredTrace.length} dispatched allocation(s).</span></div>
        <div className="outbound-trace-list">{pagedTrace.map((row) => <article key={row.allocation_id} className="outbound-trace-card">
          <div className="outbound-card-topline"><div><div className="outbound-card-title">{row.order_number} · {row.customer_name}</div><div className="outbound-card-subtitle">{row.product_name} · {row.storage_location_name} · {formatLot(row)}</div></div><StatusBadge status={row.order_status} /></div>
          <div className="outbound-trace-metrics"><span>Dispatched <strong>{formatNumber(row.dispatched_quantity)} {row.product_unit}</strong></span><span>Returned <strong>{formatNumber(row.returned_quantity)}</strong></span><span>Pending return <strong>{formatNumber(Math.max(toNumber(row.claimed_return_quantity) - toNumber(row.returned_quantity), 0))}</strong></span><span>Still returnable <strong>{formatNumber(row.returnable_quantity)}</strong></span></div>
          {row.serial_numbers?.length ? <div className="outbound-notes"><strong>Serials:</strong> {row.serial_numbers.join(', ')}</div> : null}
        </article>)}</div>
        {tracePageCount > 1 ? <div className="outbound-pagination"><button type="button" className="outbound-button" disabled={tracePage <= 1} onClick={() => setTracePage((page) => Math.max(1, page - 1))}>Previous</button><span>Page {tracePage} of {tracePageCount}</span><button type="button" className="outbound-button" disabled={tracePage >= tracePageCount} onClick={() => setTracePage((page) => Math.min(tracePageCount, page + 1))}>Next</button></div> : null}
      </>}
    </section> : null}
  </div>;
}
