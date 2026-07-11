import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDate, formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type {
  ProductOption,
  PurchaseOrder,
  Shipment,
  SupplierCatalogForm,
  SupplierCatalogItem,
  SupplierInvoice,
  SupplierInvoiceForm,
  SupplierOption
} from '../EnterpriseInventoryTypes';

type SupplierCatalogQuery = {
  isLoading: boolean;
  data?: SupplierCatalogItem[];
};

type SupplierInvoicesQuery = {
  isLoading: boolean;
  data?: SupplierInvoice[];
};

type CreateSupplierCatalogMutation = {
  isPending: boolean;
  mutate: (input: SupplierCatalogForm) => void;
};

type CreateSupplierInvoiceMutation = {
  isPending: boolean;
  mutate: (input: SupplierInvoiceForm) => void;
};

type InvoicesTabProps = {
  createSupplierCatalogMutation: CreateSupplierCatalogMutation;
  createSupplierInvoiceMutation: CreateSupplierInvoiceMutation;
  invoicesQuery: SupplierInvoicesQuery;
  products: ProductOption[];
  purchaseOrders: PurchaseOrder[];
  setSupplierCatalogForm: Dispatch<SetStateAction<SupplierCatalogForm>>;
  setSupplierInvoiceForm: Dispatch<SetStateAction<SupplierInvoiceForm>>;
  shipments: Shipment[];
  supplierCatalogForm: SupplierCatalogForm;
  supplierCatalogQuery: SupplierCatalogQuery;
  supplierInvoiceForm: SupplierInvoiceForm;
  suppliers: SupplierOption[];
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  matched: 'Matched',
  variance_detected: 'Variance detected',
  received: 'Received',
  partially_received: 'Partially received',
  in_transit: 'In transit',
  cancelled: 'Cancelled',
  completed: 'Completed',
  closed: 'Closed'
};

function formatBusinessLabel(value: string | null | undefined): string {
  if (!value) return '-';
  return statusLabels[value] ?? value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function shortId(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 8)}…`;
}

function validOptionalNonNegativeNumber(value: string): boolean {
  if (value === '') return true;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function validRequiredNonNegativeNumber(value: string): boolean {
  if (value === '') return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function formatAmount(value: number | string | null | undefined, currency = 'EUR'): string {
  if (value === null || value === undefined || value === '') return '-';
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return String(value);

  try {
    return parsed.toLocaleString(undefined, {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 4
    });
  } catch {
    return `${formatNumber(parsed)} ${currency || 'EUR'}`;
  }
}

export function InvoicesTab({
  createSupplierCatalogMutation,
  createSupplierInvoiceMutation,
  invoicesQuery,
  products,
  purchaseOrders,
  setSupplierCatalogForm,
  setSupplierInvoiceForm,
  shipments,
  supplierCatalogForm,
  supplierCatalogQuery,
  supplierInvoiceForm,
  suppliers
}: InvoicesTabProps) {
  const leadTimeDays = Number(supplierCatalogForm.lead_time_days || 0);
  const catalogNumbersValid = Number.isInteger(leadTimeDays)
    && leadTimeDays >= 0
    && validOptionalNonNegativeNumber(supplierCatalogForm.min_order_quantity)
    && validOptionalNonNegativeNumber(supplierCatalogForm.unit_cost);
  const catalogCurrencyValid = supplierCatalogForm.currency.trim().length <= 10;
  const canSaveCatalogItem = Boolean(supplierCatalogForm.supplier_id && supplierCatalogForm.product_id)
    && catalogNumbersValid
    && catalogCurrencyValid
    && !createSupplierCatalogMutation.isPending;

  const invoiceNumbersValid = [
    supplierInvoiceForm.subtotal_amount,
    supplierInvoiceForm.tax_amount,
    supplierInvoiceForm.expected_quantity,
    supplierInvoiceForm.expected_unit_cost
  ].every(validOptionalNonNegativeNumber)
    && validRequiredNonNegativeNumber(supplierInvoiceForm.total_amount)
    && validRequiredNonNegativeNumber(supplierInvoiceForm.quantity)
    && validRequiredNonNegativeNumber(supplierInvoiceForm.unit_cost);
  const canCreateInvoice = Boolean(
    supplierInvoiceForm.supplier_id
      && supplierInvoiceForm.invoice_number.trim()
      && supplierInvoiceForm.invoice_date
      && supplierInvoiceForm.product_id
  ) && invoiceNumbersValid && !createSupplierInvoiceMutation.isPending;

  const supplierPurchaseOrders = purchaseOrders.filter(
    (purchaseOrder) => purchaseOrder.supplier_id === supplierInvoiceForm.supplier_id
  );
  const supplierShipments = shipments.filter((shipment) => {
    if (shipment.supplier_id !== supplierInvoiceForm.supplier_id) return false;
    if (!supplierInvoiceForm.purchase_order_id) return true;
    return shipment.purchase_order_id === supplierInvoiceForm.purchase_order_id;
  });

  const purchaseOrderNames = new Map(
    purchaseOrders.map((purchaseOrder) => [
      purchaseOrder.id,
      purchaseOrder.po_number || `Purchase order ${shortId(purchaseOrder.id)}`
    ])
  );

  const handleSupplierCatalogSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSaveCatalogItem) return;
    createSupplierCatalogMutation.mutate(supplierCatalogForm);
  };

  const handleSupplierInvoiceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateInvoice) return;
    createSupplierInvoiceMutation.mutate(supplierInvoiceForm);
  };

  return (
    <section style={styles.grid}>
      <div style={styles.stack}>
        <form
          onSubmit={handleSupplierCatalogSubmit}
          style={styles.card}
          data-skip-global-action-feedback="true"
        >
          <h2 style={styles.cardTitle}>Supplier catalog item</h2>
          <SelectField label="Supplier" value={supplierCatalogForm.supplier_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_id: value }))} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} required />
          <SelectField label="Product" value={supplierCatalogForm.product_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
          <InputField label="Supplier SKU" value={supplierCatalogForm.supplier_sku} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_sku: value }))} />
          <InputField label="Supplier product name" value={supplierCatalogForm.supplier_product_name} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_product_name: value }))} />
          <InputField label="Lead time days" type="number" min="0" value={supplierCatalogForm.lead_time_days} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, lead_time_days: value }))} />
          <InputField label="Minimum order quantity" type="number" min="0" value={supplierCatalogForm.min_order_quantity} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, min_order_quantity: value }))} />
          <InputField label="Latest unit cost" type="number" min="0" value={supplierCatalogForm.unit_cost} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, unit_cost: value }))} />
          <InputField label="Currency" value={supplierCatalogForm.currency} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, currency: value }))} />
          <InputField label="Effective from" type="date" value={supplierCatalogForm.effective_from} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, effective_from: value }))} />
          <label style={styles.checkboxRow}>
            <input type="checkbox" checked={supplierCatalogForm.preferred} onChange={(event) => setSupplierCatalogForm((current) => ({ ...current, preferred: event.target.checked }))} />
            Preferred supplier item
          </label>
          {!catalogNumbersValid ? <p style={styles.helper}>Lead time must be a whole number, and numeric values cannot be negative.</p> : null}
          {!catalogCurrencyValid ? <p style={styles.helper}>Currency must be 10 characters or fewer.</p> : null}
          <button
            type="submit"
            disabled={!canSaveCatalogItem}
            style={canSaveCatalogItem ? styles.primaryButton : styles.disabledButton}
          >
            {createSupplierCatalogMutation.isPending ? 'Saving…' : 'Save catalog item'}
          </button>
        </form>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Supplier catalog</h2>
          <DataTable
            loading={supplierCatalogQuery.isLoading}
            empty="No supplier catalog items yet."
            headers={['Supplier', 'Product', 'SKU', 'Cost', 'Lead time', 'MOQ', 'Preferred']}
            rows={(supplierCatalogQuery.data ?? []).map((item) => [
              item.supplier_name || item.supplier_id,
              item.product_name || item.product_id,
              item.supplier_sku || '-',
              item.latest_unit_cost === null || item.latest_unit_cost === undefined
                ? '-'
                : formatAmount(item.latest_unit_cost, item.latest_currency || 'EUR'),
              `${formatNumber(item.lead_time_days)} days`,
              formatNumber(item.min_order_quantity),
              item.preferred ? 'Yes' : 'No'
            ])}
          />
        </section>
      </div>

      <div style={styles.stack}>
        <form
          onSubmit={handleSupplierInvoiceSubmit}
          style={styles.card}
          data-skip-global-action-feedback="true"
        >
          <h2 style={styles.cardTitle}>Create supplier invoice</h2>
          <SelectField
            label="Supplier"
            value={supplierInvoiceForm.supplier_id}
            onChange={(value) => setSupplierInvoiceForm((current) => ({
              ...current,
              supplier_id: value,
              purchase_order_id: '',
              shipment_id: ''
            }))}
            options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
            required
          />
          <SelectField
            label="Purchase order"
            value={supplierInvoiceForm.purchase_order_id}
            onChange={(value) => setSupplierInvoiceForm((current) => ({
              ...current,
              purchase_order_id: value,
              shipment_id: ''
            }))}
            options={supplierPurchaseOrders.map((purchaseOrder) => ({
              value: purchaseOrder.id,
              label: `${purchaseOrder.po_number || `Purchase order ${shortId(purchaseOrder.id)}`} — ${formatBusinessLabel(purchaseOrder.status)}`
            }))}
            disabled={!supplierInvoiceForm.supplier_id}
          />
          <SelectField
            label="Shipment"
            value={supplierInvoiceForm.shipment_id}
            onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, shipment_id: value }))}
            options={supplierShipments.map((shipment) => {
              const purchaseOrderReference = shipment.linked_purchase_order_number
                || shipment.po_number
                || (shipment.purchase_order_id ? purchaseOrderNames.get(shipment.purchase_order_id) : null);
              const reference = purchaseOrderReference
                ? `for ${purchaseOrderReference}`
                : shortId(shipment.id);
              return {
                value: shipment.id,
                label: `Shipment ${reference} — ${formatBusinessLabel(shipment.status)} — ${formatDate(shipment.delivery_date)}`
              };
            })}
            disabled={!supplierInvoiceForm.supplier_id}
          />
          <p style={styles.helper}>Purchase order and shipment links are optional, but they keep the invoice, order, and receipt chain traceable.</p>
          <InputField label="Invoice number" value={supplierInvoiceForm.invoice_number} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_number: value }))} required />
          <InputField label="Invoice date" type="date" value={supplierInvoiceForm.invoice_date} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_date: value }))} required />
          <InputField label="Subtotal" type="number" min="0" value={supplierInvoiceForm.subtotal_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, subtotal_amount: value }))} />
          <InputField label="Tax" type="number" min="0" value={supplierInvoiceForm.tax_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, tax_amount: value }))} />
          <InputField label="Total" type="number" min="0" value={supplierInvoiceForm.total_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, total_amount: value }))} required />
          <SelectField label="Invoice product" value={supplierInvoiceForm.product_id} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
          <InputField label="Quantity" type="number" min="0" value={supplierInvoiceForm.quantity} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, quantity: value }))} required />
          <InputField label="Unit cost" type="number" min="0" value={supplierInvoiceForm.unit_cost} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, unit_cost: value }))} required />
          <InputField label="Expected quantity for matching" type="number" min="0" value={supplierInvoiceForm.expected_quantity} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, expected_quantity: value }))} />
          <InputField label="Expected unit cost for matching" type="number" min="0" value={supplierInvoiceForm.expected_unit_cost} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, expected_unit_cost: value }))} />
          {!invoiceNumbersValid ? <p style={styles.helper}>Required amounts must be entered, and numeric values cannot be negative.</p> : null}
          <button
            type="submit"
            disabled={!canCreateInvoice}
            style={canCreateInvoice ? styles.primaryButton : styles.disabledButton}
          >
            {createSupplierInvoiceMutation.isPending ? 'Creating…' : 'Create invoice'}
          </button>
        </form>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Supplier invoices</h2>
          <p style={styles.helper}>Track supplier invoices, linked purchase orders and shipments, and quantity or unit-cost variances.</p>
          <DataTable
            loading={invoicesQuery.isLoading}
            empty="No supplier invoices yet."
            headers={['Invoice', 'Supplier', 'PO', 'Shipment', 'Status', 'Variance', 'Total', 'Invoice date', 'Created']}
            rows={(invoicesQuery.data ?? []).map((item) => [
              item.invoice_number,
              suppliers.find((supplier) => supplier.id === item.supplier_id)?.name || `Supplier ${shortId(item.supplier_id)}`,
              purchaseOrders.find((purchaseOrder) => purchaseOrder.id === item.purchase_order_id)?.po_number
                || (item.purchase_order_id ? `Purchase order ${shortId(item.purchase_order_id)}` : '-'),
              (() => {
                const shipment = shipments.find((candidate) => candidate.id === item.shipment_id);
                if (shipment) {
                  const reference = shipment.linked_purchase_order_number || shipment.po_number;
                  return reference ? `Shipment for ${reference}` : `Shipment ${shortId(shipment.id)}`;
                }
                return item.shipment_id ? `Shipment ${shortId(item.shipment_id)}` : '-';
              })(),
              formatBusinessLabel(item.status),
              formatBusinessLabel(item.variance_status),
              formatAmount(item.total_amount, item.currency || 'EUR'),
              formatDate(item.invoice_date),
              formatDateTime(item.created_at)
            ])}
          />
        </section>
      </div>
    </section>
  );
}
