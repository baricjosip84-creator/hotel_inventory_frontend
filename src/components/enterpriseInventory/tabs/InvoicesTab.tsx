import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { formatCurrencyAmount, getActiveTenantCurrency } from '../../../lib/tenantCurrency';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { InputField, SelectField, TextareaField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDate, formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type {
  ProductOption,
  PurchaseOrder,
  Shipment,
  SupplierInvoice,
  SupplierInvoiceForm,
  SupplierInvoiceLineForm,
  SupplierOption
} from '../EnterpriseInventoryTypes';

type SupplierInvoicesQuery = { isLoading: boolean; data?: SupplierInvoice[] };
type CreateSupplierInvoiceMutation = { isPending: boolean; mutate: (input: SupplierInvoiceForm) => void };
type UpdateSupplierInvoiceMutation = {
  isPending: boolean;
  mutate: (input: { invoice: SupplierInvoice; form: SupplierInvoiceForm; afterSuccess?: () => void }) => void;
};
type SupplierInvoiceLifecycleMutation = {
  isPending: boolean;
  mutate: (input: {
    invoice: SupplierInvoice;
    action: 'submit' | 'match' | 'pay' | 'cancel' | 'revise';
    reason?: string;
    paymentReference?: string;
  }) => void;
};

type InvoicesTabProps = {
  createSupplierInvoiceMutation: CreateSupplierInvoiceMutation;
  updateSupplierInvoiceMutation: UpdateSupplierInvoiceMutation;
  supplierInvoiceLifecycleMutation: SupplierInvoiceLifecycleMutation;
  invoicesQuery: SupplierInvoicesQuery;
  products: ProductOption[];
  purchaseOrders: PurchaseOrder[];
  setSupplierInvoiceForm: Dispatch<SetStateAction<SupplierInvoiceForm>>;
  shipments: Shipment[];
  supplierInvoiceForm: SupplierInvoiceForm;
  suppliers: SupplierOption[];
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  matched: 'Matched',
  paid: 'Paid',
  cancelled: 'Cancelled',
  variance_detected: 'Variance detected',
  no_variance: 'No variance',
  not_checked: 'Not checked'
};

function businessLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return statusLabels[value] ?? value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function emptyLine(): SupplierInvoiceLineForm {
  return {
    product_id: '', purchase_order_item_id: '', shipment_item_id: '',
    quantity: '', unit_cost: '', expected_quantity: '', expected_unit_cost: ''
  };
}

function nonNegative(value: string, required = false): boolean {
  if (!value.trim()) return !required;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && (!required || parsed > 0);
}

function amount(value: number | string | null | undefined, currency?: string | null): string {
  return formatCurrencyAmount(value, currency || getActiveTenantCurrency(), 4);
}

export function InvoicesTab({
  createSupplierInvoiceMutation,
  updateSupplierInvoiceMutation,
  supplierInvoiceLifecycleMutation,
  invoicesQuery,
  products,
  purchaseOrders,
  setSupplierInvoiceForm,
  shipments,
  supplierInvoiceForm,
  suppliers
}: InvoicesTabProps) {
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const canWriteInvoices = hasPermission(TENANT_PERMISSIONS.INVOICES_WRITE);
  const invoiceBusy = createSupplierInvoiceMutation.isPending || updateSupplierInvoiceMutation.isPending || supplierInvoiceLifecycleMutation.isPending;

  const selectedProductIds = supplierInvoiceForm.items.map((line) => line.product_id).filter(Boolean);
  const invoiceProductsUnique = new Set(selectedProductIds).size === selectedProductIds.length;
  const invoiceLinesValid = supplierInvoiceForm.items.length > 0 && invoiceProductsUnique && supplierInvoiceForm.items.every((line) =>
    Boolean(line.product_id) && nonNegative(line.quantity, true) && nonNegative(line.unit_cost)
    && nonNegative(line.expected_quantity) && nonNegative(line.expected_unit_cost));
  const invoiceHeaderValid = Boolean(
    supplierInvoiceForm.supplier_id
    && supplierInvoiceForm.invoice_number.trim()
    && supplierInvoiceForm.invoice_date
    && /^[A-Za-z]{3}$/.test(supplierInvoiceForm.currency.trim())
    && nonNegative(supplierInvoiceForm.tax_amount)
  );
  const canSaveInvoice = canWriteInvoices && invoiceHeaderValid && invoiceLinesValid && !invoiceBusy;

  const filteredPurchaseOrders = purchaseOrders.filter((po) => !supplierInvoiceForm.supplier_id || po.supplier_id === supplierInvoiceForm.supplier_id);
  const filteredShipments = shipments.filter((shipment) => {
    if (supplierInvoiceForm.supplier_id && shipment.supplier_id !== supplierInvoiceForm.supplier_id) return false;
    if (supplierInvoiceForm.purchase_order_id && shipment.purchase_order_id !== supplierInvoiceForm.purchase_order_id) return false;
    return true;
  });
  const subtotal = supplierInvoiceForm.items.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0), 0);
  const tax = Number(supplierInvoiceForm.tax_amount) || 0;
  const total = subtotal + tax;

  const handleSupplierInvoiceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSaveInvoice) return;
    const editing = (invoicesQuery.data ?? []).find((invoice) => invoice.id === editingInvoiceId);
    if (editing) {
      updateSupplierInvoiceMutation.mutate({ invoice: editing, form: supplierInvoiceForm, afterSuccess: () => setEditingInvoiceId(null) });
    } else {
      createSupplierInvoiceMutation.mutate(supplierInvoiceForm);
    }
  };

  const updateLine = (index: number, patch: Partial<SupplierInvoiceLineForm>) => {
    setSupplierInvoiceForm((current) => ({
      ...current,
      items: current.items.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line)
    }));
  };

  const beginEdit = (invoice: SupplierInvoice) => {
    if (invoice.status !== 'draft') return;
    setEditingInvoiceId(invoice.id);
    setSupplierInvoiceForm({
      supplier_id: invoice.supplier_id,
      purchase_order_id: invoice.purchase_order_id || '',
      shipment_id: invoice.shipment_id || '',
      invoice_number: invoice.invoice_number,
      invoice_date: String(invoice.invoice_date || '').slice(0, 10),
      due_date: String(invoice.due_date || '').slice(0, 10),
      currency: invoice.currency || getActiveTenantCurrency(),
      tax_amount: String(invoice.tax_amount ?? '0'),
      notes: invoice.notes || '',
      items: invoice.items.length ? invoice.items.map((item) => ({
        product_id: item.product_id,
        purchase_order_item_id: item.purchase_order_item_id || '',
        shipment_item_id: item.shipment_item_id || '',
        quantity: String(item.quantity ?? ''),
        unit_cost: String(item.unit_cost ?? ''),
        expected_quantity: item.expected_quantity == null ? '' : String(item.expected_quantity),
        expected_unit_cost: item.expected_unit_cost == null ? '' : String(item.expected_unit_cost)
      })) : [emptyLine()]
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingInvoiceId(null);
    setSupplierInvoiceForm((current) => ({ ...current, invoice_number: '', due_date: '', notes: '', tax_amount: '0', items: [emptyLine()] }));
  };

  const runLifecycle = (invoice: SupplierInvoice, action: 'submit' | 'match' | 'pay' | 'cancel' | 'revise') => {
    if (!canWriteInvoices || supplierInvoiceLifecycleMutation.isPending) return;
    if (action === 'cancel') {
      const reason = window.prompt('Cancellation reason');
      if (!reason?.trim()) return;
      supplierInvoiceLifecycleMutation.mutate({ invoice, action, reason: reason.trim() });
      return;
    }
    if (action === 'pay') {
      const paymentReference = window.prompt('Payment reference (optional)', '');
      if (paymentReference === null) return;
      supplierInvoiceLifecycleMutation.mutate({ invoice, action, paymentReference });
      return;
    }
    const label = action === 'submit' ? 'submit this invoice for matching/approval'
      : action === 'match' ? 'mark this approved invoice as matched'
        : 'return this rejected invoice to draft for revision';
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    supplierInvoiceLifecycleMutation.mutate({ invoice, action });
  };

  return (
    <section style={styles.stack}>
      <div className="inventory-controls-grid" style={styles.grid}>
        <form onSubmit={handleSupplierInvoiceSubmit} style={styles.card} data-skip-global-action-feedback="true">
          <h2 style={styles.cardTitle}>{editingInvoiceId ? 'Edit supplier invoice draft' : 'Create supplier invoice draft'}</h2>
          <div style={styles.formGrid}>
            <SelectField disabled={!canWriteInvoices || invoiceBusy || Boolean(editingInvoiceId)} label="Supplier" value={supplierInvoiceForm.supplier_id} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, supplier_id: value, purchase_order_id: '', shipment_id: '' }))} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} required />
            <SelectField disabled={!canWriteInvoices || invoiceBusy} label="Purchase order" value={supplierInvoiceForm.purchase_order_id} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, purchase_order_id: value, shipment_id: '' }))} options={filteredPurchaseOrders.map((po) => ({ value: po.id, label: po.po_number || po.id }))} />
            <SelectField disabled={!canWriteInvoices || invoiceBusy} label="Shipment" value={supplierInvoiceForm.shipment_id} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, shipment_id: value }))} options={filteredShipments.map((shipment) => ({ value: shipment.id, label: `${shipment.linked_purchase_order_number || shipment.po_number || 'Shipment'} · ${formatDate(shipment.delivery_date)}` }))} />
            <InputField disabled={!canWriteInvoices || invoiceBusy} label="Invoice number" value={supplierInvoiceForm.invoice_number} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_number: value }))} required />
            <InputField disabled={!canWriteInvoices || invoiceBusy} label="Invoice date" type="date" value={supplierInvoiceForm.invoice_date} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_date: value }))} required />
            <InputField disabled={!canWriteInvoices || invoiceBusy} label="Due date" type="date" value={supplierInvoiceForm.due_date} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, due_date: value }))} />
            <InputField disabled={!canWriteInvoices || invoiceBusy} label="Currency" value={supplierInvoiceForm.currency} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, currency: value.toUpperCase().slice(0, 3) }))} required />
            <InputField disabled={!canWriteInvoices || invoiceBusy} label="Tax amount" type="number" min="0" value={supplierInvoiceForm.tax_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, tax_amount: value }))} />
          </div>
          <TextareaField disabled={!canWriteInvoices || invoiceBusy} label="Notes" value={supplierInvoiceForm.notes} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, notes: value }))} />

          <h3 style={{ marginBottom: 8 }}>Invoice lines</h3>
          {supplierInvoiceForm.items.map((line, index) => (
            <div key={index} style={{ ...styles.metricCard, marginBottom: 10 }}>
              <div style={styles.formGrid}>
                <SelectField disabled={!canWriteInvoices || invoiceBusy} label={`Product ${index + 1}`} value={line.product_id} onChange={(value) => updateLine(index, { product_id: value, purchase_order_item_id: '', shipment_item_id: '' })} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
                <InputField disabled={!canWriteInvoices || invoiceBusy} label="Quantity" type="number" min="0" value={line.quantity} onChange={(value) => updateLine(index, { quantity: value })} required />
                <InputField disabled={!canWriteInvoices || invoiceBusy} label="Unit cost" type="number" min="0" value={line.unit_cost} onChange={(value) => updateLine(index, { unit_cost: value })} required />
                <InputField disabled={!canWriteInvoices || invoiceBusy} label="Expected quantity (optional)" type="number" min="0" value={line.expected_quantity} onChange={(value) => updateLine(index, { expected_quantity: value })} />
                <InputField disabled={!canWriteInvoices || invoiceBusy} label="Expected unit cost (optional)" type="number" min="0" value={line.expected_unit_cost} onChange={(value) => updateLine(index, { expected_unit_cost: value })} />
              </div>
              {supplierInvoiceForm.items.length > 1 ? <button type="button" style={styles.dangerButton} disabled={invoiceBusy} onClick={() => setSupplierInvoiceForm((current) => ({ ...current, items: current.items.filter((_, lineIndex) => lineIndex !== index) }))}>Remove line</button> : null}
            </div>
          ))}
          <div style={styles.actions}>
            <button type="button" style={styles.secondarySmallButton} disabled={!canWriteInvoices || invoiceBusy || supplierInvoiceForm.items.length >= 100} onClick={() => setSupplierInvoiceForm((current) => ({ ...current, items: [...current.items, emptyLine()] }))}>Add line</button>
          </div>
          <p style={styles.helper}>Calculated subtotal: <strong>{amount(subtotal, supplierInvoiceForm.currency)}</strong> · Tax: <strong>{amount(tax, supplierInvoiceForm.currency)}</strong> · Total: <strong>{amount(total, supplierInvoiceForm.currency)}</strong></p>
          {!invoiceProductsUnique ? <p style={styles.helper}>Use one line per product; combine repeated products so matching remains unambiguous.</p> : null}
          {!invoiceLinesValid && invoiceProductsUnique ? <p style={styles.helper}>Each line needs a product, quantity greater than zero, and a non-negative unit cost.</p> : null}
          <div style={{ ...styles.actions, marginTop: 12 }}>
            <button type="submit" disabled={!canSaveInvoice} style={canSaveInvoice ? styles.primaryButton : styles.disabledButton}>{invoiceBusy ? 'Saving…' : editingInvoiceId ? 'Save draft changes' : 'Create draft'}</button>
            {editingInvoiceId ? <button type="button" style={styles.secondaryButton} disabled={invoiceBusy} onClick={cancelEdit}>Cancel edit</button> : null}
          </div>
        </form>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Supplier invoices</h2>
        {invoicesQuery.isLoading ? <p style={styles.helper}>Loading…</p> : !(invoicesQuery.data ?? []).length ? <p style={styles.helper}>No supplier invoices.</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['Invoice','Supplier / PO','Dates','Status','Variance','Amount','Lines','Actions'].map((header) => <th key={header} style={styles.th}>{header}</th>)}</tr></thead>
              <tbody>
                {(invoicesQuery.data ?? []).map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={styles.td}><strong>{invoice.invoice_number}</strong><br/><span style={styles.muted}>{invoice.notes || ''}</span></td>
                    <td style={styles.td}>{invoice.supplier_name || invoice.supplier_id}<br/><span style={styles.muted}>{invoice.po_number || 'No linked PO'}</span></td>
                    <td style={styles.td}>Invoice: {formatDate(invoice.invoice_date)}<br/>Due: {invoice.due_date ? formatDate(invoice.due_date) : '-'}<br/><span style={styles.muted}>Updated {formatDateTime(invoice.updated_at || invoice.created_at)}</span></td>
                    <td style={styles.td}>{businessLabel(invoice.status)}</td>
                    <td style={styles.td}>{businessLabel(invoice.variance_status)}</td>
                    <td style={styles.td}>{amount(invoice.total_amount, invoice.currency)}</td>
                    <td style={styles.td}>
                      <details><summary>{invoice.items.length || Number(invoice.line_count || 0)} line(s)</summary>
                        <div style={{ marginTop: 8 }}>
                          {invoice.items.map((item) => <div key={item.id} style={{ marginBottom: 8 }}><strong>{item.product_name || item.product_id}</strong><br/><span style={styles.muted}>{formatNumber(item.quantity)} × {amount(item.unit_cost, invoice.currency)} = {amount(item.line_amount, invoice.currency)}{item.quantity_variance != null ? ` · qty variance ${formatNumber(item.quantity_variance)}` : ''}{item.unit_cost_variance != null ? ` · cost variance ${formatNumber(item.unit_cost_variance)}` : ''}</span></div>)}
                        </div>
                      </details>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        {invoice.status === 'draft' ? <><button type="button" style={styles.secondarySmallButton} disabled={!canWriteInvoices || invoiceBusy} onClick={() => beginEdit(invoice)}>Edit</button><button type="button" style={styles.smallButton} disabled={!canWriteInvoices || invoiceBusy} onClick={() => runLifecycle(invoice, 'submit')}>Submit</button></> : null}
                        {invoice.status === 'pending_approval' ? <span style={styles.muted}>Use Approvals tab</span> : null}
                        {invoice.status === 'approved' ? <button type="button" style={styles.smallButton} disabled={!canWriteInvoices || invoiceBusy} onClick={() => runLifecycle(invoice, 'match')}>Mark matched</button> : null}
                        {invoice.status === 'rejected' ? <button type="button" style={styles.secondarySmallButton} disabled={!canWriteInvoices || invoiceBusy} onClick={() => runLifecycle(invoice, 'revise')}>Revise</button> : null}
                        {invoice.status === 'matched' ? <button type="button" style={styles.smallButton} disabled={!canWriteInvoices || invoiceBusy} onClick={() => runLifecycle(invoice, 'pay')}>Mark paid</button> : null}
                        {!['paid','cancelled'].includes(invoice.status) ? <button type="button" style={styles.dangerButton} disabled={!canWriteInvoices || invoiceBusy} onClick={() => runLifecycle(invoice, 'cancel')}>Cancel</button> : null}
                      </div>
                      {invoice.payment_reference ? <span style={styles.muted}>Payment: {invoice.payment_reference}</span> : null}
                      {invoice.cancellation_reason ? <span style={styles.muted}>Cancelled: {invoice.cancellation_reason}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
