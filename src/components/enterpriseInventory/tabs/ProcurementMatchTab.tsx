import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField, MetricCard, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatNumber } from '../EnterpriseInventoryFormat';
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
  return (
    <section style={styles.grid}>
      <div style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>PO → shipment → invoice control tower</h2>
          <p style={styles.helper}>Reads existing /purchase-orders, /shipments, and /enterprise-inventory/supplier-invoices endpoints, then joins records by purchase_order_id and shipment_id.</p>
          <div style={styles.statGrid}>
            <MetricCard label="Open POs" value={procurementSummary.openPurchaseOrders} />
            <MetricCard label="Overdue POs" value={procurementSummary.overduePurchaseOrders} />
            <MetricCard label="Receiving gaps" value={procurementSummary.receivingGaps} />
            <MetricCard label="Unmatched invoices" value={procurementSummary.unmatchedInvoices} />
          </div>
        </section>

        <form onSubmit={handlePurchaseOrderShipmentSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>Create shipment from approved PO</h2>
          <p style={styles.helper}>Uses the real POST /purchase-orders/:id/create-shipment route with the selected PO version in If-Match-Version.</p>
          <SelectField
            label="Approved purchase order"
            value={purchaseOrderShipmentForm.purchase_order_id}
            onChange={(value) => setPurchaseOrderShipmentForm((current) => ({ ...current, purchase_order_id: value }))}
            options={purchaseOrders
              .filter((purchaseOrder) => purchaseOrder.status === 'approved')
              .map((purchaseOrder) => ({ value: purchaseOrder.id, label: `${purchaseOrder.po_number || purchaseOrder.id} · ${purchaseOrder.supplier_name || purchaseOrder.supplier_id} · v${purchaseOrder.version}` }))}
            required
          />
          <InputField label="Delivery date" type="date" value={purchaseOrderShipmentForm.delivery_date} onChange={(value) => setPurchaseOrderShipmentForm((current) => ({ ...current, delivery_date: value }))} />
          <button type="submit" disabled={createShipmentFromPurchaseOrderMutation.isPending} style={styles.primaryButton}>Create linked shipment</button>
        </form>
      </div>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Purchase order lifecycle + matching status</h2>
        <p style={styles.helper}>Uses real PO lifecycle routes: POST /purchase-orders/:id/submit, /approve, /close, /reopen, and /cancel with If-Match-Version.</p>
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
                  return (
                    <tr key={purchaseOrder.id}>
                      <td style={styles.td}>{purchaseOrder.po_number || purchaseOrder.id}</td>
                      <td style={styles.td}>{purchaseOrder.supplier_name || purchaseOrder.supplier_id}</td>
                      <td style={styles.td}>{purchaseOrder.status}</td>
                      <td style={styles.td}>{formatNumber(row.linkedShipmentCount)}</td>
                      <td style={styles.td}>{row.shipmentStatus}</td>
                      <td style={styles.td}>{formatNumber(row.linkedInvoiceCount)}</td>
                      <td style={styles.td}>{formatNumber(row.totalInvoiced)}</td>
                      <td style={styles.td}>{row.invoiceVariance || purchaseOrder.variance_status || '-'}</td>
                      <td style={styles.td}>{purchaseOrder.expected_delivery_date || '-'}</td>
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
