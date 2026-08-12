import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../lib/api';
import { hasPermission, TENANT_PERMISSIONS } from '../lib/permissions';
import ProductUomSelect from '../components/inventory/ProductUomSelect';

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
type PickOptions = { order: { id: string; order_number: string; status: string; version: number }; items: PickItem[] };
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
type ReturnItem = { id: string; quantity: number | string; condition: string; storage_location_id: string; storage_location_name: string; product_name: string; product_unit: string; lot_number?: string | null; batch_number?: string | null };
type CustomerReturn = { id: string; return_number: string; order_number: string; customer_name: string; status: string; reason: string; items: ReturnItem[]; version: number };
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

const emptyCustomer: CustomerForm = { name: '', email: '', phone: '', address: '', notes: '' };
const emptyOrder: OrderForm = { customer_id: '', requested_date: '', notes: '', items: [{ product_id: '', storage_location_id: '', quantity: '1', uom_code: '' }] };
const box = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 16 } as const;
const input = { padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: 8, width: '100%', boxSizing: 'border-box' } as const;
const button = { padding: '9px 12px', borderRadius: 8, border: '1px solid #cbd5e1', cursor: 'pointer', background: '#fff' } as const;
const muted = { opacity: 0.72, fontSize: 14 } as const;
const toNumber = (value: number | string | undefined | null) => Number(value || 0);
const formatLot = (lot?: PickLot | TraceRow | null) => {
  if (!lot) return 'No lot label';
  const labels = [lot.lot_number ? `Lot ${lot.lot_number}` : null, lot.batch_number ? `Batch ${lot.batch_number}` : null, lot.expiry_date ? `Exp ${String(lot.expiry_date).slice(0, 10)}` : null].filter(Boolean);
  return labels.length ? labels.join(' · ') : 'Untracked stock';
};

export default function OutboundPage() {
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [includeArchivedCustomers, setIncludeArchivedCustomers] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomer);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrder);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [pickOrderId, setPickOrderId] = useState<string>('');
  const [pickDrafts, setPickDrafts] = useState<Record<string, { quantity: string; inventory_lot_id: string; serial_numbers: string[] }>>({});
  const [returnForm, setReturnForm] = useState({ allocation_id: '', storage_location_id: '', quantity: '1', condition: 'available', reason: '', notes: '', serial_numbers: [] as string[] });

  const canCustomerWrite = hasPermission(TENANT_PERMISSIONS.CUSTOMERS_WRITE);
  const canCreate = hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_CREATE);
  const canUpdate = hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_UPDATE);
  const canDispatch = hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_DISPATCH);
  const canCancel = hasPermission(TENANT_PERMISSIONS.OUTBOUND_ORDERS_CANCEL);
  const canReturnRead = hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_READ);
  const canReturnCreate = hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_CREATE);
  const canReturnReceive = hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_RECEIVE);
  const canReturnCancel = hasPermission(TENANT_PERMISSIONS.CUSTOMER_RETURNS_CANCEL);

  const customers = useQuery({
    queryKey: ['outbound-customers', includeArchivedCustomers],
    queryFn: () => apiRequest<Customer[]>(`/outbound/customers?include_archived=${includeArchivedCustomers ? 'true' : 'false'}`)
  });
  const orders = useQuery({ queryKey: ['outbound-orders'], queryFn: () => apiRequest<Order[]>('/outbound/orders') });
  const summary = useQuery({ queryKey: ['outbound-summary'], queryFn: () => apiRequest<OutboundSummary>('/outbound/summary') });
  const trace = useQuery({ queryKey: ['outbound-trace'], queryFn: () => apiRequest<TraceRow[]>('/outbound/trace') });
  const returns = useQuery({ queryKey: ['outbound-returns'], queryFn: () => apiRequest<CustomerReturn[]>('/outbound/returns'), enabled: canReturnRead });
  const products = useQuery({ queryKey: ['products'], queryFn: () => apiRequest<Product[]>('/products') });
  const locations = useQuery({ queryKey: ['storage-locations'], queryFn: () => apiRequest<Location[]>('/storage-locations') });
  const pickOptions = useQuery({
    queryKey: ['outbound-pick-options', pickOrderId],
    queryFn: () => apiRequest<PickOptions>(`/outbound/orders/${pickOrderId}/pick-options`),
    enabled: Boolean(pickOrderId)
  });

  useEffect(() => {
    if (!pickOptions.data) return;
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
      qc.invalidateQueries({ queryKey: ['dashboard-outbound-summary'] })
    ]);
  };

  const mutation = useMutation({
    mutationFn: ({ path, method = 'POST', body, version }: { path: string; method?: 'POST' | 'PUT'; body?: unknown; version?: number }) => apiRequest(path, {
      method,
      headers: version === undefined ? undefined : { 'If-Match-Version': String(version) },
      body: JSON.stringify(body ?? {})
    }),
    onSuccess: async () => {
      setError('');
      setMessage('Saved.');
      await invalidate();
    },
    onError: (e) => {
      setMessage('');
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  });

  const customerOptions = customers.data ?? [];
  const activeCustomers = customerOptions.filter((customer) => customer.active);
  const orderRows = orders.data ?? [];
  const productOptions = products.data ?? [];
  const locationOptions = locations.data ?? [];
  const returnRows = returns.data ?? [];
  const traceRows = trace.data ?? [];
  const returnableTrace = traceRows.filter((row) => toNumber(row.returnable_quantity) > 0);

  const selectedReturnTrace = useMemo(() => returnableTrace.find((row) => row.allocation_id === returnForm.allocation_id) ?? null, [returnableTrace, returnForm.allocation_id]);
  const chooseReturnAllocation = (allocationId: string) => {
    const selected = returnableTrace.find((row) => row.allocation_id === allocationId);
    setReturnForm((current) => ({ ...current, allocation_id: allocationId, storage_location_id: selected?.storage_location_id ?? '', serial_numbers: [] }));
  };

  const saveCustomer = () => {
    if (!customerForm.name.trim()) return;
    const body = { ...customerForm, email: customerForm.email || null, phone: customerForm.phone || null, address: customerForm.address || null, notes: customerForm.notes || null };
    if (editingCustomer) mutation.mutate({ path: `/outbound/customers/${editingCustomer.id}`, method: 'PUT', body, version: Number(editingCustomer.version) });
    else mutation.mutate({ path: '/outbound/customers', body });
    setCustomerForm(emptyCustomer);
    setEditingCustomer(null);
  };

  const beginCustomerEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({ name: customer.name, email: customer.email ?? '', phone: customer.phone ?? '', address: customer.address ?? '', notes: customer.notes ?? '' });
  };

  const cleanOrderItems = (form: OrderForm) => form.items.filter((line) => line.product_id && line.storage_location_id && Number(line.quantity) > 0).map((line) => ({ ...line, quantity: Number(line.quantity), uom_code: line.uom_code || null }));
  const saveOrder = () => {
    const items = cleanOrderItems(orderForm);
    if (!orderForm.customer_id || !items.length) { setError('Choose a customer and at least one complete order line.'); return; }
    const body = { customer_id: orderForm.customer_id, requested_date: orderForm.requested_date || null, notes: orderForm.notes || null, items };
    if (editingOrder) mutation.mutate({ path: `/outbound/orders/${editingOrder.id}`, method: 'PUT', body, version: Number(editingOrder.version) });
    else mutation.mutate({ path: '/outbound/orders', body });
    setOrderForm(emptyOrder);
    setEditingOrder(null);
  };

  const beginOrderEdit = (order: Order) => {
    setEditingOrder(order);
    setOrderForm({ customer_id: order.customer_id, requested_date: order.requested_date ? String(order.requested_date).slice(0, 10) : '', notes: order.notes ?? '', items: order.items.map((item) => ({ product_id: item.product_id, storage_location_id: item.storage_location_id, quantity: String(item.entered_quantity ?? item.quantity), uom_code: item.uom_code || '' })) });
  };

  const startPicking = (order: Order) => {
    mutation.mutate({ path: `/outbound/orders/${order.id}/start-picking`, version: Number(order.version) }, { onSuccess: () => setPickOrderId(order.id) });
  };

  const recordPick = (item: PickItem) => {
    if (!pickOptions.data) return;
    const draft = pickDrafts[item.id] ?? { quantity: '', inventory_lot_id: '', serial_numbers: [] };
    const quantity = Number(draft.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) { setError('Enter a picked quantity greater than zero.'); return; }
    if (item.serial_tracking_enabled) {
      if (!Number.isInteger(quantity) || draft.serial_numbers.length !== quantity) { setError(`Select exactly ${Number.isInteger(quantity) ? quantity : 'one serial per whole'} serial number(s) for this serial-tracked pick.`); return; }
    } else if (item.requires_lot_tracking && !draft.inventory_lot_id) { setError('Choose the lot/batch that was physically picked for this product.'); return; }
    mutation.mutate({
      path: `/outbound/orders/${pickOptions.data.order.id}/pick`,
      version: Number(pickOptions.data.order.version),
      body: { items: [{ order_item_id: item.id, quantity, inventory_lot_id: item.serial_tracking_enabled ? null : draft.inventory_lot_id || null, serial_numbers: draft.serial_numbers }] }
    });
  };

  const createReturn = () => {
    const quantity = Number(returnForm.quantity);
    if (!returnForm.allocation_id || !returnForm.storage_location_id || !returnForm.reason.trim() || !Number.isFinite(quantity) || quantity <= 0) { setError('Choose dispatched stock, a return location, a quantity, and give the return reason.'); return; }
    mutation.mutate({
      path: '/outbound/returns',
      body: { reason: returnForm.reason.trim(), notes: returnForm.notes || null, items: [{ outbound_order_lot_allocation_id: returnForm.allocation_id, storage_location_id: returnForm.storage_location_id, quantity, condition: returnForm.condition, serial_numbers: returnForm.serial_numbers }] }
    });
    setReturnForm({ allocation_id: '', storage_location_id: '', quantity: '1', condition: 'available', reason: '', notes: '', serial_numbers: [] });
  };

  return <div style={{ display: 'grid', gap: 16 }}>
    <section style={box}>
      <h2 style={{ marginTop: 0 }}>Outbound</h2>
      <p style={{ marginBottom: 0 }}>Customer orders now reserve stock when confirmed. Warehouse users record what they actually pick, pack only those quantities, and dispatch only packed stock. Partial shipments keep the remaining quantity reserved for the customer.</p>
      {message ? <div style={{ marginTop: 10, color: '#166534' }}>{message}</div> : null}
      {error ? <div style={{ marginTop: 10, color: '#991b1b' }}>{error}</div> : null}
    </section>

    <section style={box}>
      <h3 style={{ marginTop: 0 }}>Outbound status</h3>
      {summary.isLoading ? <p>Loading outbound status...</p> : summary.data ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        {[
          ['Open orders', summary.data.open_orders],
          ['Picking', summary.data.picking_orders],
          ['Packed', summary.data.packed_orders],
          ['Partial shipments', summary.data.partially_dispatched_orders],
          ['Units waiting', summary.data.units_waiting],
          ['Dispatched 30 days', summary.data.units_dispatched_30d],
          ['Returns waiting', summary.data.pending_customer_returns]
        ].map(([label, value]) => <div key={String(label)} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}><div style={muted}>{label}</div><strong style={{ fontSize: 22 }}>{value}</strong></div>)}
      </div> : <p>Outbound status is unavailable.</p>}
    </section>

    <section style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Customers</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={includeArchivedCustomers} onChange={(e) => setIncludeArchivedCustomers(e.target.checked)} /> Include archived</label>
      </div>
      {canCustomerWrite ? <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginTop: 12 }}>
          <input style={input} placeholder="Customer name" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} />
          <input style={input} placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} />
          <input style={input} placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} />
          <input style={input} placeholder="Address" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} />
          <input style={input} placeholder="Notes" value={customerForm.notes} onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button style={button} disabled={!customerForm.name.trim() || mutation.isPending} onClick={saveCustomer}>{editingCustomer ? 'Save Customer' : 'Add Customer'}</button>{editingCustomer ? <button style={button} onClick={() => { setEditingCustomer(null); setCustomerForm(emptyCustomer); }}>Cancel Edit</button> : null}</div>
      </> : null}
      <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>{customerOptions.map((customer) => <div key={customer.id} style={{ borderTop: '1px solid #e5e7eb', paddingTop: 10, opacity: customer.active ? 1 : 0.6 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><div><strong>{customer.name}</strong>{!customer.active ? ' · Archived' : ''}<div style={muted}>{[customer.email, customer.phone, customer.address].filter(Boolean).join(' · ') || 'No contact details'}</div></div>{canCustomerWrite && customer.active ? <div style={{ display: 'flex', gap: 6 }}><button style={button} onClick={() => beginCustomerEdit(customer)}>Edit</button><button style={button} onClick={() => { if (window.confirm(`Archive ${customer.name}? Existing orders stay in history.`)) mutation.mutate({ path: `/outbound/customers/${customer.id}/archive`, version: Number(customer.version) }); }}>Archive</button></div> : null}</div></div>)}</div>
    </section>

    {(canCreate || editingOrder) ? <section style={box}>
      <h3 style={{ marginTop: 0 }}>{editingOrder ? `Edit draft ${editingOrder.order_number}` : 'Create customer order'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 10 }}>
        <select style={input} value={orderForm.customer_id} onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}><option value="">Choose customer</option>{activeCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
        <input style={input} type="date" value={orderForm.requested_date} onChange={(e) => setOrderForm({ ...orderForm, requested_date: e.target.value })} />
        <input style={input} placeholder="Notes" value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
      </div>
      {orderForm.items.map((line, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: 8, marginTop: 10 }}>
        <select style={input} value={line.product_id} onChange={(e) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, i) => i === index ? { ...current, product_id: e.target.value, uom_code: '' } : current) })}><option value="">Product</option>{productOptions.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
        <select style={input} value={line.storage_location_id} onChange={(e) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, i) => i === index ? { ...current, storage_location_id: e.target.value } : current) })}><option value="">Location</option>{locationOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select>
        <input style={input} type="number" min="0.0001" step="0.0001" value={line.quantity} onChange={(e) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, i) => i === index ? { ...current, quantity: e.target.value } : current) })} />
        <ProductUomSelect productId={line.product_id} value={line.uom_code} purpose="issue" onChange={(value) => setOrderForm({ ...orderForm, items: orderForm.items.map((current, i) => i === index ? { ...current, uom_code: value } : current) })} style={input} ariaLabel={`Unit of measure for outbound line ${index + 1}`} />
        <button style={button} disabled={orderForm.items.length === 1} onClick={() => setOrderForm({ ...orderForm, items: orderForm.items.filter((_, i) => i !== index) })}>Remove</button>
      </div>)}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}><button style={button} onClick={() => setOrderForm({ ...orderForm, items: [...orderForm.items, { product_id: '', storage_location_id: '', quantity: '1', uom_code: '' }] })}>Add line</button><button style={button} disabled={!orderForm.customer_id || cleanOrderItems(orderForm).length === 0 || mutation.isPending} onClick={saveOrder}>{editingOrder ? 'Save Draft' : 'Create Order'}</button>{editingOrder ? <button style={button} onClick={() => { setEditingOrder(null); setOrderForm(emptyOrder); }}>Cancel Edit</button> : null}</div>
    </section> : null}

    <section style={box}>
      <h3 style={{ marginTop: 0 }}>Orders</h3>
      {orderRows.length === 0 ? <p>No customer orders yet.</p> : orderRows.map((order) => {
        const dispatched = order.items.reduce((sum, item) => sum + toNumber(item.dispatched_quantity), 0);
        const ordered = order.items.reduce((sum, item) => sum + toNumber(item.quantity), 0);
        const openPicked = order.items.reduce((sum, item) => sum + toNumber(item.open_picked_quantity), 0);
        const openPacked = order.items.reduce((sum, item) => sum + toNumber(item.open_packed_quantity), 0);
        return <div key={order.id} style={{ borderTop: '1px solid #e5e7eb', padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><strong>{order.order_number} · {order.customer_name}</strong><span>{order.status.replaceAll('_', ' ')}</span></div>
          <div style={{ ...muted, marginTop: 5 }}>Ordered {ordered} · Dispatched {dispatched} · Picked waiting {openPicked} · Packed waiting {openPacked}</div>
          <div style={{ marginTop: 7, fontSize: 14 }}>{order.items.map((item) => `${item.product_name}: ${item.dispatched_quantity}/${item.quantity} ${item.product_unit} from ${item.storage_location_name}`).join(' · ')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
            {order.status === 'draft' && canUpdate ? <button style={button} onClick={() => beginOrderEdit(order)}>Edit Draft</button> : null}
            {order.status === 'draft' && canUpdate ? <button style={button} onClick={() => mutation.mutate({ path: `/outbound/orders/${order.id}/confirm`, version: Number(order.version) })}>Confirm & Reserve Stock</button> : null}
            {['confirmed', 'partially_dispatched'].includes(order.status) && canUpdate ? <button style={button} onClick={() => startPicking(order)}>{order.status === 'partially_dispatched' ? 'Pick Remaining' : 'Start Picking'}</button> : null}
            {order.status === 'picking' && canUpdate ? <button style={button} onClick={() => setPickOrderId(order.id)}>Open Picking</button> : null}
            {order.status === 'picking' && canUpdate && openPicked > 0 ? <button style={button} onClick={() => mutation.mutate({ path: `/outbound/orders/${order.id}/mark-packed`, version: Number(order.version) })}>Mark Picked Stock Packed</button> : null}
            {['picking', 'packed'].includes(order.status) && canUpdate && openPicked > 0 ? <button style={button} onClick={() => { if (window.confirm('Clear the current picked quantities and pick again?')) mutation.mutate({ path: `/outbound/orders/${order.id}/reset-picks`, version: Number(order.version) }); }}>Clear Picks</button> : null}
            {order.status === 'packed' && canDispatch && openPacked > 0 ? <button style={button} onClick={() => { if (window.confirm(`Dispatch ${openPacked} packed unit(s)? Stock will be removed now.`)) mutation.mutate({ path: `/outbound/orders/${order.id}/dispatch`, version: Number(order.version) }); }}>Dispatch Packed Stock</button> : null}
            {!['dispatched', 'cancelled'].includes(order.status) && canCancel ? <button style={button} onClick={() => { const reason = window.prompt(dispatched > 0 ? 'Reason for cancelling the undelivered remainder' : 'Cancellation reason'); if (reason && reason.trim().length >= 3) mutation.mutate({ path: `/outbound/orders/${order.id}/cancel`, body: { reason: reason.trim() }, version: Number(order.version) }); }}>Cancel{dispatched > 0 ? ' Remainder' : ''}</button> : null}
          </div>
        </div>;
      })}
    </section>

    {pickOrderId ? <section style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><div><h3 style={{ margin: 0 }}>Picking workbench</h3><div style={muted}>Record what the warehouse worker physically picked. You can pick only part of the remaining order and dispatch that part first.</div></div><button style={button} onClick={() => setPickOrderId('')}>Close</button></div>
      {pickOptions.isLoading ? <p>Loading pick options...</p> : pickOptions.isError || !pickOptions.data ? <p>Unable to load picking details.</p> : pickOptions.data.items.map((item) => {
        const draft = pickDrafts[item.id] ?? { quantity: '', inventory_lot_id: '', serial_numbers: [] };
        const unpickedRemaining = Math.max(toNumber(item.remaining_quantity) - toNumber(item.open_picked_quantity), 0);
        return <div key={item.id} style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12, marginTop: 12 }}>
          <strong>{item.product_name} · {item.storage_location_name}</strong>
          <div style={{ ...muted, marginTop: 4 }}>Ordered {item.quantity} · Already dispatched {item.dispatched_quantity} · Currently picked {item.open_picked_quantity} · Still unpicked {unpickedRemaining}</div>
          {unpickedRemaining > 0 ? <div style={{ display: 'grid', gap: 8, marginTop: 9 }}>
            <div style={{ display: 'grid', gridTemplateColumns: item.serial_tracking_enabled ? '1fr auto' : item.requires_lot_tracking ? '1fr 2fr auto' : '1fr auto', gap: 8 }}>
              <input style={input} type="number" min="0.0001" max={unpickedRemaining} step="0.0001" value={draft.quantity} onChange={(e) => setPickDrafts({ ...pickDrafts, [item.id]: { ...draft, quantity: e.target.value, serial_numbers: [] } })} />
              {!item.serial_tracking_enabled && item.requires_lot_tracking ? <select style={input} value={draft.inventory_lot_id} onChange={(e) => setPickDrafts({ ...pickDrafts, [item.id]: { ...draft, inventory_lot_id: e.target.value } })}><option value="">Choose physically picked lot/batch</option>{item.lots.filter((lot) => lot.available_to_pick > 0).map((lot) => <option key={lot.id} value={lot.id}>{formatLot(lot)} · {lot.available_to_pick} available</option>)}</select> : null}
              <button style={button} disabled={mutation.isPending || !draft.quantity || (!item.serial_tracking_enabled && item.requires_lot_tracking && !draft.inventory_lot_id) || (Boolean(item.serial_tracking_enabled) && (!Number.isInteger(Number(draft.quantity)) || draft.serial_numbers.length !== Number(draft.quantity)))} onClick={() => recordPick(item)}>Record Pick</button>
            </div>
            {item.serial_tracking_enabled ? <div><div style={muted}>Select the exact physical serials picked ({draft.serial_numbers.length}/{Number.isInteger(Number(draft.quantity)) ? Number(draft.quantity) : '?'})</div><div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginTop: 5 }}>{(item.available_serials || []).map((serial) => { const checked = draft.serial_numbers.includes(serial.serial_number); return <label key={serial.id} style={{ display: 'block', marginBottom: 4 }}><input type="checkbox" checked={checked} onChange={(event) => setPickDrafts({ ...pickDrafts, [item.id]: { ...draft, serial_numbers: event.target.checked ? [...draft.serial_numbers, serial.serial_number] : draft.serial_numbers.filter((value) => value !== serial.serial_number) } })} /> {serial.serial_number}</label>; })}{!(item.available_serials || []).length ? <span style={muted}>No available serials found at this location.</span> : null}</div></div> : null}
          </div> : <div style={{ ...muted, marginTop: 8 }}>Nothing else to pick on this line.</div>}
        </div>;
      })}
    </section> : null}

    <section style={box}>
      <h3 style={{ marginTop: 0 }}>Dispatch trace</h3>
      <p style={muted}>This shows what stock actually went to which customer. Lot/batch details appear when that stock is tracked.</p>
      {traceRows.length === 0 ? <p>No dispatched stock yet.</p> : <div style={{ display: 'grid', gap: 8 }}>{traceRows.map((row) => <div key={row.allocation_id} style={{ borderTop: '1px solid #e5e7eb', paddingTop: 9 }}><strong>{row.order_number} · {row.customer_name} · {row.product_name}</strong><div style={muted}>{formatLot(row)} · Dispatched {row.dispatched_quantity} {row.product_unit} · Returned {row.returned_quantity} · Pending return {Math.max(toNumber(row.claimed_return_quantity) - toNumber(row.returned_quantity), 0)} · Still returnable {row.returnable_quantity}</div></div>)}</div>}
    </section>

    {canReturnRead ? <section style={box}>
      <h3 style={{ marginTop: 0 }}>Customer returns</h3>
      {canReturnCreate ? <div style={{ display: 'grid', gap: 9, marginBottom: 16 }}>
        <select style={input} value={returnForm.allocation_id} onChange={(e) => chooseReturnAllocation(e.target.value)}><option value="">Choose stock previously dispatched to a customer</option>{returnableTrace.map((row) => <option key={row.allocation_id} value={row.allocation_id}>{row.order_number} · {row.customer_name} · {row.product_name} · {formatLot(row)} · {row.returnable_quantity} returnable</option>)}</select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><select style={input} value={returnForm.storage_location_id} onChange={(e) => setReturnForm({ ...returnForm, storage_location_id: e.target.value })}><option value="">Return to location</option>{locationOptions.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><input style={input} type="number" min="0.0001" max={selectedReturnTrace ? toNumber(selectedReturnTrace.returnable_quantity) : undefined} step="0.0001" value={returnForm.quantity} onChange={(e) => setReturnForm({ ...returnForm, quantity: e.target.value })} /></div>
        {selectedReturnTrace?.serial_numbers?.length ? <div><div style={muted}>Select the exact serials physically returned ({returnForm.serial_numbers.length}/{Number.isInteger(Number(returnForm.quantity)) ? Number(returnForm.quantity) : '?'})</div><div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginTop: 5 }}>{selectedReturnTrace.serial_numbers.map((serial) => { const checked = returnForm.serial_numbers.includes(serial); return <label key={serial} style={{ display: 'block', marginBottom: 4 }}><input type="checkbox" checked={checked} onChange={(event) => setReturnForm({ ...returnForm, serial_numbers: event.target.checked ? [...returnForm.serial_numbers, serial] : returnForm.serial_numbers.filter((value) => value !== serial) })} /> {serial}</label>; })}</div></div> : null}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}><select style={input} value={returnForm.condition} onChange={(e) => setReturnForm({ ...returnForm, condition: e.target.value })}><option value="available">Return to usable stock</option><option value="hold">Hold / inspect first</option><option value="damaged">Damaged</option><option value="rejected">Rejected</option><option value="quarantine">Quarantine</option></select><input style={input} placeholder="Why is the customer returning it?" value={returnForm.reason} onChange={(e) => setReturnForm({ ...returnForm, reason: e.target.value })} /></div>
        <input style={input} placeholder="Optional return notes" value={returnForm.notes} onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })} />
        <div><button style={button} disabled={!returnForm.allocation_id || !returnForm.storage_location_id || !returnForm.reason.trim() || mutation.isPending || Boolean(selectedReturnTrace?.serial_numbers?.length && (!Number.isInteger(Number(returnForm.quantity)) || returnForm.serial_numbers.length !== Number(returnForm.quantity)))} onClick={createReturn}>Create Customer Return</button></div>
      </div> : null}
      {returnRows.length === 0 ? <p>No customer returns yet.</p> : returnRows.map((row) => <div key={row.id} style={{ borderTop: '1px solid #e5e7eb', padding: '10px 0' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><strong>{row.return_number} · {row.customer_name} · {row.order_number}</strong><span>{row.status}</span></div><div style={{ ...muted, marginTop: 4 }}>{row.reason}</div><div style={{ marginTop: 5, fontSize: 14 }}>{row.items.map((item) => `${item.product_name} ${item.quantity} ${item.product_unit} → ${item.condition} @ ${item.storage_location_name}`).join(' · ')}</div>{row.status === 'draft' ? <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>{canReturnReceive ? <button style={button} onClick={() => { if (window.confirm('Receive this customer return into inventory now?')) mutation.mutate({ path: `/outbound/returns/${row.id}/receive`, version: Number(row.version) }); }}>Receive Return</button> : null}{canReturnCancel ? <button style={button} onClick={() => { const reason = window.prompt('Return cancellation reason'); if (reason && reason.trim().length >= 3) mutation.mutate({ path: `/outbound/returns/${row.id}/cancel`, version: Number(row.version), body: { reason: reason.trim() } }); }}>Cancel Return</button> : null}</div> : null}</div>)}
    </section> : null}
  </div>;
}
