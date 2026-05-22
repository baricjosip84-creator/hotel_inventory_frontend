import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type { ProductOption, PurchaseOrder, Shipment, SupplierCatalogForm, SupplierCatalogItem, SupplierInvoice, SupplierInvoiceForm, SupplierOption } from '../EnterpriseInventoryTypes';

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
  selectedSupplierName: string | null;
  setSupplierCatalogForm: Dispatch<SetStateAction<SupplierCatalogForm>>;
  setSupplierInvoiceForm: Dispatch<SetStateAction<SupplierInvoiceForm>>;
  shipments: Shipment[];
  supplierCatalogForm: SupplierCatalogForm;
  supplierCatalogQuery: SupplierCatalogQuery;
  supplierInvoiceForm: SupplierInvoiceForm;
  suppliers: SupplierOption[];
};

export function InvoicesTab({
  createSupplierCatalogMutation,
  createSupplierInvoiceMutation,
  invoicesQuery,
  products,
  purchaseOrders,
  selectedSupplierName,
  setSupplierCatalogForm,
  setSupplierInvoiceForm,
  shipments,
  supplierCatalogForm,
  supplierCatalogQuery,
  supplierInvoiceForm,
  suppliers
}: InvoicesTabProps) {
  const handleSupplierCatalogSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createSupplierCatalogMutation.mutate(supplierCatalogForm);
  };

  const handleSupplierInvoiceSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createSupplierInvoiceMutation.mutate(supplierInvoiceForm);
  };

  return (
    <section style={styles.grid}>
      <div style={styles.stack}>
        <form onSubmit={handleSupplierCatalogSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>Supplier catalog item</h2>
          <SelectField label="Supplier" value={supplierCatalogForm.supplier_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_id: value }))} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} required />
          <SelectField label="Product" value={supplierCatalogForm.product_id} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
          <InputField label="Supplier SKU" value={supplierCatalogForm.supplier_sku} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_sku: value }))} />
          <InputField label="Supplier product name" value={supplierCatalogForm.supplier_product_name} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, supplier_product_name: value }))} />
          <InputField label="Lead time days" type="number" value={supplierCatalogForm.lead_time_days} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, lead_time_days: value }))} />
          <InputField label="Minimum order quantity" type="number" value={supplierCatalogForm.min_order_quantity} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, min_order_quantity: value }))} />
          <InputField label="Latest unit cost" type="number" value={supplierCatalogForm.unit_cost} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, unit_cost: value }))} />
          <InputField label="Currency" value={supplierCatalogForm.currency} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, currency: value }))} />
          <InputField label="Effective from" type="date" value={supplierCatalogForm.effective_from} onChange={(value) => setSupplierCatalogForm((current) => ({ ...current, effective_from: value }))} />
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={supplierCatalogForm.preferred} onChange={(event) => setSupplierCatalogForm((current) => ({ ...current, preferred: event.target.checked }))} />
            Preferred supplier item
          </label>
          <button type="submit" disabled={createSupplierCatalogMutation.isPending} style={styles.primaryButton}>Save catalog item</button>
        </form>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Supplier catalog</h2>
          <DataTable loading={supplierCatalogQuery.isLoading} empty="No supplier catalog items yet." headers={['Supplier', 'Product', 'SKU', 'Cost', 'Lead time', 'MOQ', 'Preferred']} rows={(supplierCatalogQuery.data ?? []).map((item) => [item.supplier_name || item.supplier_id, item.product_name || item.product_id, item.supplier_sku || '-', item.latest_unit_cost ? `${formatNumber(item.latest_unit_cost)} ${item.latest_currency || ''}` : '-', formatNumber(item.lead_time_days), formatNumber(item.min_order_quantity), item.preferred ? 'Yes' : 'No'])} />
        </section>
      </div>

      <div style={styles.stack}>
        <form onSubmit={handleSupplierInvoiceSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>Create supplier invoice</h2>
          <SelectField label="Supplier" value={supplierInvoiceForm.supplier_id} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, supplier_id: value }))} options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))} required />
          <InputField label="Invoice number" value={supplierInvoiceForm.invoice_number} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_number: value }))} required />
          <InputField label="Invoice date" type="date" value={supplierInvoiceForm.invoice_date} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, invoice_date: value }))} required />
          <InputField label="Subtotal" type="number" value={supplierInvoiceForm.subtotal_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, subtotal_amount: value }))} />
          <InputField label="Tax" type="number" value={supplierInvoiceForm.tax_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, tax_amount: value }))} />
          <InputField label="Total" type="number" value={supplierInvoiceForm.total_amount} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, total_amount: value }))} required />
          <SelectField label="Invoice product" value={supplierInvoiceForm.product_id} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
          <InputField label="Quantity" type="number" value={supplierInvoiceForm.quantity} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, quantity: value }))} required />
          <InputField label="Unit cost" type="number" value={supplierInvoiceForm.unit_cost} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, unit_cost: value }))} required />
          <InputField label="Expected quantity" type="number" value={supplierInvoiceForm.expected_quantity} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, expected_quantity: value }))} />
          <InputField label="Expected unit cost" type="number" value={supplierInvoiceForm.expected_unit_cost} onChange={(value) => setSupplierInvoiceForm((current) => ({ ...current, expected_unit_cost: value }))} />
          <button type="submit" disabled={createSupplierInvoiceMutation.isPending} style={styles.primaryButton}>Create invoice</button>
        </form>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Supplier invoices</h2>
          <p style={styles.helper}>3-way invoice matching and variance escalation. {selectedSupplierName ? `Latest supplier: ${selectedSupplierName}.` : ''}</p>
          <DataTable loading={invoicesQuery.isLoading} empty="No supplier invoices yet." headers={['Invoice', 'Supplier', 'PO', 'Shipment', 'Status', 'Variance', 'Total', 'Created']} rows={(invoicesQuery.data ?? []).map((item) => [item.invoice_number, suppliers.find((supplier) => supplier.id === item.supplier_id)?.name || item.supplier_id, purchaseOrders.find((purchaseOrder) => purchaseOrder.id === item.purchase_order_id)?.po_number || item.purchase_order_id || '-', shipments.find((shipment) => shipment.id === item.shipment_id)?.po_number || item.shipment_id || '-', item.status, item.variance_status || '-', formatNumber(item.total_amount), formatDateTime(item.created_at)])} />
        </section>
      </div>
    </section>
  );
}
