import type { CSSProperties, Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField, MetricCard, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatCurrency, formatDate, formatNumber } from '../EnterpriseInventoryFormat';
import type { PurchaseOrder, PurchaseOrderShipmentForm } from '../EnterpriseInventoryTypes';

type ProcurementSummary = {
  openPurchaseOrders: number;
  overduePurchaseOrders: number;
  receivingGaps: number;
  unmatchedInvoices: number;
};

type ProcurementMatchRow = {
  purchaseOrder: PurchaseOrder;
  linkedShipmentCount: number;
  linkedInvoiceCount: number;
  totalInvoiced: number;
  shipmentStatus: string;
  invoiceVariance: string;
};

type LoadingQuery = {
  isLoading: boolean;
};

type PendingMutation = {
  isPending: boolean;
};

type PurchaseOrderLifecycleAction = 'submit' | 'approve' | 'close' | 'reopen' | 'cancel';

type ProcurementMatchTabProps = {
  createShipmentFromPurchaseOrderMutation: PendingMutation;
  handlePurchaseOrderLifecycleAction: (purchaseOrder: PurchaseOrder, action: PurchaseOrderLifecycleAction) => void;
  handlePurchaseOrderShipmentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  invoicesQuery: LoadingQuery;
  procurementMatchRows: ProcurementMatchRow[];
  procurementSummary: ProcurementSummary;
  purchaseOrderLifecycleMutation: PendingMutation;
  purchaseOrders: PurchaseOrder[];
  purchaseOrdersQuery: LoadingQuery;
  purchaseOrderShipmentForm: PurchaseOrderShipmentForm;
  setPurchaseOrderShipmentForm: Dispatch<SetStateAction<PurchaseOrderShipmentForm>>;
  shipmentsQuery: LoadingQuery;
};

const statusLabels: Record<string, string> = {
  approved: 'Approved',
  cancelled: 'Cancelled',
  closed: 'Closed',
  completed: 'Completed',
  draft: 'Draft',
  overdue: 'Overdue',
  partial: 'Partial',
  pending: 'Pending',
  pending_receipt: 'Pending receipt',
  received: 'Received',
  submitted: 'Submitted',
  unmatched: 'Unmatched',
  open_short: 'Open short',
  closed_short: 'Closed short',
  over_received: 'Over received'
};

const poNumberStyle: CSSProperties = {
  display: 'inline-block',
  maxWidth: 190,
  overflowWrap: 'anywhere'
};

function formatBusinessLabel(value: string | null | undefined): string {
  if (!value) return '-';
  const mapped = statusLabels[value];
  if (mapped) return mapped;

  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((part) => {
      const upper = part.toUpperCase();
      if (['PO', 'ID', 'SLA'].includes(upper)) return upper;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function shortPurchaseOrderNumber(value: string | null | undefined): string {
  if (!value) return '-';
  if (value.length <= 30) return value;
  return `${value.slice(0, 18)}…${value.slice(-8)}`;
}

function purchaseOrderOptionLabel(purchaseOrder: PurchaseOrder): string {
  const poNumber = shortPurchaseOrderNumber(purchaseOrder.po_number || purchaseOrder.id);
  const supplier = purchaseOrder.supplier_name || purchaseOrder.supplier_id;
  return `${poNumber} · ${supplier}`;
}

export function ProcurementMatchTab({
  createShipmentFromPurchaseOrderMutation,
  handlePurchaseOrderLifecycleAction,
  handlePurchaseOrderShipmentSubmit,
  invoicesQuery,
  procurementMatchRows,
  procurementSummary,
  purchaseOrderLifecycleMutation,
  purchaseOrders,
  purchaseOrdersQuery,
  purchaseOrderShipmentForm,
  setPurchaseOrderShipmentForm,
  shipmentsQuery
}: ProcurementMatchTabProps) {
  const approvedPurchaseOrders = purchaseOrders.filter((purchaseOrder) => purchaseOrder.status === 'approved');
  const approvedPurchaseOrdersLoading = purchaseOrdersQuery.isLoading;
  const hasApprovedPurchaseOrders = approvedPurchaseOrders.length > 0;
  const canCreateLinkedShipment = hasApprovedPurchaseOrders && Boolean(purchaseOrderShipmentForm.purchase_order_id) && !createShipmentFromPurchaseOrderMutation.isPending;
  const linkedShipmentButtonStyle = canCreateLinkedShipment
    ? styles.primaryButton
    : { ...styles.primaryButton, background: '#9ca3af', cursor: 'not-allowed' };

  return (
    <section style={styles.grid}>
      <div style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>PO → shipment → invoice control tower</h2>
          <p style={styles.helper}>Track whether purchase orders are open, overdue, received, and matched with supplier invoices.</p>
          <div style={styles.statGrid}>
            <MetricCard label="Open POs" value={procurementSummary.openPurchaseOrders} />
            <MetricCard label="Overdue POs" value={procurementSummary.overduePurchaseOrders} />
            <MetricCard label="Receiving gaps" value={procurementSummary.receivingGaps} />
            <MetricCard label="Unmatched invoices" value={procurementSummary.unmatchedInvoices} />
          </div>
        </section>

        <form onSubmit={handlePurchaseOrderShipmentSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>Create shipment from approved PO</h2>
          <p style={styles.helper}>Create a linked receiving shipment for an approved purchase order.</p>
          <SelectField
            label="Approved purchase order"
            value={purchaseOrderShipmentForm.purchase_order_id}
            onChange={(value) => setPurchaseOrderShipmentForm((current) => ({ ...current, purchase_order_id: value }))}
            options={approvedPurchaseOrders.map((purchaseOrder) => ({ value: purchaseOrder.id, label: purchaseOrderOptionLabel(purchaseOrder) }))}
            required
            disabled={approvedPurchaseOrdersLoading || !hasApprovedPurchaseOrders}
          />
          {approvedPurchaseOrdersLoading ? (
            <p style={styles.helper}>Loading approved purchase orders…</p>
          ) : hasApprovedPurchaseOrders ? null : (
            <p style={styles.helper}>No approved purchase orders are available. Approve a purchase order before creating a linked shipment.</p>
          )}
          <InputField
            label="Delivery date"
            type="date"
            value={purchaseOrderShipmentForm.delivery_date}
            disabled={approvedPurchaseOrdersLoading || !hasApprovedPurchaseOrders}
            onChange={(value) => setPurchaseOrderShipmentForm((current) => ({ ...current, delivery_date: value }))}
          />
          <button type="submit" disabled={!canCreateLinkedShipment} style={linkedShipmentButtonStyle}>Create linked shipment</button>
        </form>
      </div>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Purchase order lifecycle + matching status</h2>
        <p style={styles.helper}>Review each purchase order with its linked receiving shipments, invoice count, invoice total, and next available lifecycle actions.</p>
        {purchaseOrdersQuery.isLoading || shipmentsQuery.isLoading || invoicesQuery.isLoading ? (
          <p style={styles.helper}>Loading…</p>
        ) : procurementMatchRows.length === 0 ? (
          <p style={styles.helper}>No purchase orders found.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  {['PO', 'Supplier', 'PO status', 'Shipments', 'Shipment status', 'Invoices', 'Invoiced total', 'Variance', 'Expected', 'Actions'].map((header) => <th key={header} style={styles.th}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {procurementMatchRows.map((row) => {
                  const purchaseOrder = row.purchaseOrder;
                  const fullPurchaseOrderNumber = purchaseOrder.po_number || purchaseOrder.id;
                  return (
                    <tr key={purchaseOrder.id}>
                      <td style={styles.td} title={fullPurchaseOrderNumber}><span style={poNumberStyle}>{shortPurchaseOrderNumber(fullPurchaseOrderNumber)}</span></td>
                      <td style={styles.td}>{purchaseOrder.supplier_name || purchaseOrder.supplier_id}</td>
                      <td style={styles.td}>{formatBusinessLabel(purchaseOrder.status)}</td>
                      <td style={styles.td}>{formatNumber(row.linkedShipmentCount)}</td>
                      <td style={styles.td}>{formatBusinessLabel(row.shipmentStatus)}</td>
                      <td style={styles.td}>{formatNumber(row.linkedInvoiceCount)}</td>
                      <td style={styles.td}>{formatCurrency(row.totalInvoiced)}</td>
                      <td style={styles.td}>{formatBusinessLabel(row.invoiceVariance || purchaseOrder.variance_status)}</td>
                      <td style={styles.td}>{formatDate(purchaseOrder.expected_delivery_date)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {purchaseOrder.status === 'draft' ? <button type="button" style={styles.secondarySmallButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'submit')}>Submit</button> : null}
                          {purchaseOrder.status === 'submitted' ? <button type="button" style={styles.smallButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'approve')}>Approve</button> : null}
                          {['approved', 'completed'].includes(purchaseOrder.status) ? <button type="button" style={styles.secondarySmallButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'close')}>Close</button> : null}
                          {purchaseOrder.status === 'cancelled' ? <button type="button" style={styles.secondarySmallButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'reopen')}>Reopen</button> : null}
                          {!['cancelled', 'completed'].includes(purchaseOrder.status) ? <button type="button" style={styles.dangerButton} disabled={purchaseOrderLifecycleMutation.isPending} onClick={() => handlePurchaseOrderLifecycleAction(purchaseOrder, 'cancel')}>Cancel</button> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
