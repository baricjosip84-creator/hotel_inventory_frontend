import { formatCurrencyAmount, getActiveTenantCurrency } from '../../../lib/tenantCurrency';
import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDate, formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
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

function formatAmount(
  value: number | string | null | undefined,
  currency = getActiveTenantCurrency(),
  maximumFractionDigits = 4
): string {
  return formatCurrencyAmount(value, currency, maximumFractionDigits);
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
  const canReadSupplierCatalog = hasPermission(TENANT_PERMISSIONS.SUPPLIER_CATALOG_READ);
  const canWriteSupplierCatalog = hasPermission(TENANT_PERMISSIONS.SUPPLIER_CATALOG_WRITE);
  const canWriteInvoices = hasPermission(TENANT_PERMISSIONS.INVOICES_WRITE);
  const leadTimeDays = Number(supplierCatalogForm.lead_time_days || 0);
  const catalogNumbersValid = Number.isInteger(leadTimeDays)
    && leadTimeDays >= 0
    && validOptionalNonNegativeNumber(supplierCatalogForm.min_order_quantity)
    && validOptionalNonNegativeNumber(supplierCatalogForm.unit_cost);
  const catalogCurrencyValid = supplierCatalogForm.currency.trim().length <= 10;
  const canSaveCatalogItem = canWriteSupplierCatalog
    && Boolean(supplierCatalogForm.supplier_id && supplierCatalogForm.product_id)
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
  const invoiceCurrencyValid = /^[A-Za-z]{3}$/.test(supplierInvoiceForm.currency.trim());
  const canCreateInvoice = canWriteInvoices && invoiceCurrencyValid && Boolean(
    supplierInvoiceForm.supplier_id
      && supplierInvoiceForm.invoice_number.trim()
      && supplierInvoiceForm.invoice_date
      && supplierInvoiceForm.product_id
  ) && invoiceNumbersValid && !createSupplierInvoiceMutation.isPending;

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
    <section style={styles.stack}>
      <div style={styles.grid}>
        <form
          onSubmit={handleSupplierCatalogSubmit}
          style={styles.card}
          data-skip-global-action-feedback="true"
        >
          <h2 style={styles.cardTitle}>Supplier catalog item</h2>
          <SelectField disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} label="Supplier" value={supplierCatalogForm.supplier_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_id: value }))} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} required />
          <SelectField disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} label="Product" value={supplierCatalogForm.product_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
          <InputField disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} label="Supplier SKU" value={supplierCatalogForm.supplier_sku} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_sku: value }))} />
          <InputField disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} label="Supplier product name" value={supplierCatalogForm.supplier_product_name} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_product_name: value }))} />
          <InputField disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} label="Lead time days" type="number" min="0" value={supplierCatalogForm.lead_time_days} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, lead_time_days: value }))} />
          <InputField disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} label="Minimum order quantity" type="number" min="0" value={supplierCatalogForm.min_order_quantity} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, min_order_quantity: value }))} />
          <InputField disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} label="Latest unit cost" type="number" min="0" value={supplierCatalogForm.unit_cost} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, unit_cost: value }))} />
          <InputField disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} label="Currency" value={supplierCatalogForm.currency} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, currency: value }))} />
          <InputField disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} label="Effective from" type="date" value={supplierCatalogForm.effective_from} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, effective_from: value }))} />
          <label style={styles.checkboxRow}>
            <input type="checkbox" disabled={!canWriteSupplierCatalog || createSupplierCatalogMutation.isPending} checked={supplierCatalogForm.preferred} onChange={(event) => setSupplierCatalogForm((current) => ({ ...current, preferred: event.target.checked }))} />
            Preferred supplier item
          </label>
          {!canWriteSupplierCatalog ? <p style={styles.helper}>Saving supplier catalog items requires {TENANT_PERMISSIONS.SUPPLIER_CATALOG_WRITE} permission.</p> : null}
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

        <form
          onSubmit={handleSupplierInvoiceSubmit}
          style={styles.card}
          data-skip-global-action-feedback="true"
        >
          <h2 style={styles.cardTitle}>Create supplier invoice</h2>
          <SelectField
            disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending}
            label="Supplier"
            value={supplierInvoiceForm.supplier_id}
            onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, supplier_id: value }))}
            options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
            required
          />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Invoice number" value={supplierInvoiceForm.invoice_number} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_number: value }))} required />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Invoice date" type="date" value={supplierInvoiceForm.invoice_date} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_date: value }))} required />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Currency" value={supplierInvoiceForm.currency} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, currency: value.toUpperCase().slice(0, 3) }))} required />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Subtotal" type="number" min="0" value={supplierInvoiceForm.subtotal_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, subtotal_amount: value }))} />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Tax" type="number" min="0" value={supplierInvoiceForm.tax_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, tax_amount: value }))} />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Total" type="number" min="0" value={supplierInvoiceForm.total_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, total_amount: value }))} required />
          <SelectField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Invoice product" value={supplierInvoiceForm.product_id} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Quantity" type="number" min="0" value={supplierInvoiceForm.quantity} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, quantity: value }))} required />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Unit cost" type="number" min="0" value={supplierInvoiceForm.unit_cost} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, unit_cost: value }))} required />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Expected quantity for matching" type="number" min="0" value={supplierInvoiceForm.expected_quantity} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, expected_quantity: value }))} />
          <InputField disabled={!canWriteInvoices || createSupplierInvoiceMutation.isPending} label="Expected unit cost for matching" type="number" min="0" value={supplierInvoiceForm.expected_unit_cost} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, expected_unit_cost: value }))} />
          {!canWriteInvoices ? <p style={styles.helper}>Creating supplier invoices requires {TENANT_PERMISSIONS.INVOICES_WRITE} permission.</p> : null}
          {!invoiceNumbersValid ? <p style={styles.helper}>Required amounts must be entered, and numeric values cannot be negative.</p> : null}
          <button
            type="submit"
            disabled={!canCreateInvoice}
            style={canCreateInvoice ? styles.primaryButton : styles.disabledButton}
          >
            {createSupplierInvoiceMutation.isPending ? 'Creating…' : 'Create invoice'}
          </button>
        </form>
      </div>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Supplier catalog</h2>
        <DataTable
          loading={supplierCatalogQuery.isLoading}
          empty={canReadSupplierCatalog ? 'No supplier catalog items yet.' : `Requires ${TENANT_PERMISSIONS.SUPPLIER_CATALOG_READ} permission.`}
          headers={['Supplier', 'Product', 'Supplier SKU', 'Unit cost', 'Lead time', 'Minimum order', 'Preferred']}
          rows={(supplierCatalogQuery.data ?? []).map((item) => [
            item.supplier_name || item.supplier_id,
            item.product_name || item.product_id,
            item.supplier_sku || '-',
            item.latest_unit_cost === null || item.latest_unit_cost === undefined
              ? '-'
              : formatAmount(item.latest_unit_cost, item.latest_currency || getActiveTenantCurrency()),
            `${formatNumber(item.lead_time_days)} days`,
            formatNumber(item.min_order_quantity),
            item.preferred ? 'Yes' : 'No'
          ])}
        />
      </section>

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
            formatAmount(item.total_amount, item.currency || getActiveTenantCurrency(), 2),
            formatDate(item.invoice_date),
            formatDateTime(item.created_at)
          ])}
        />
      </section>
    </section>
  );
}
