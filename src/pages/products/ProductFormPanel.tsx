import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ProductItem, SupplierItem } from '../../types/inventory';
import type { ProductFormState } from './productCoreApi';
import { styles } from './productStyles';
import { getActiveTenantCurrency } from '../../lib/tenantCurrency';

type ProductFormPanelProps = {
  editingProduct: ProductItem | null;
  form: ProductFormState;
  suppliers: SupplierItem[];
  canManageProducts: boolean;
  isSubmitting: boolean;
  formError: string | null;
  formMessage: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
  setForm: Dispatch<SetStateAction<ProductFormState>>;
};

export function ProductFormPanel({
  editingProduct,
  form,
  suppliers,
  canManageProducts,
  isSubmitting,
  formError,
  formMessage,
  onSubmit,
  onCancelEdit,
  setForm
}: ProductFormPanelProps) {
  const fieldsDisabled = isSubmitting || !canManageProducts;
  const submitDisabled = fieldsDisabled || !form.sku.trim() || !form.name.trim() || !form.unit.trim();

  return (
    <section id="product-form-panel" style={styles.panel}>
      <h3 style={styles.panelTitle}>{editingProduct ? 'Edit Product' : 'Create Product'}</h3>
      <p style={styles.panelSubtitle}>
        {canManageProducts
          ? 'Maintain product master records used across stock, shipments, receiving, alerts, and reporting.'
          : 'This form is read-only because the current role does not have products.write permission.'}
      </p>
      <p style={styles.panelSubtitle}>
        Barcode here is the backward-compatible default package barcode. Additional package barcodes are managed from the Product List.
      </p>

      {formError ? <div style={styles.errorBox}>{formError}</div> : null}
      {formMessage ? <div style={styles.successBox}>{formMessage}</div> : null}

      <form onSubmit={onSubmit} style={styles.formGrid}>
        <div>
          <label htmlFor="product-sku" style={styles.label}>SKU</label>
          <input
            id="product-sku"
            style={styles.input}
            value={form.sku}
            onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
            placeholder="Example: BEV-COFFEE-001"
            required
            disabled={fieldsDisabled}
          />
          <div style={styles.fieldHint}>Required unique product code used by imports, integrations, and searches.</div>
        </div>

        <div>
          <label htmlFor="product-name" style={styles.label}>Product Name</label>
          <input
            id="product-name"
            style={styles.input}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Example: Coffee Beans Premium"
            required
            disabled={fieldsDisabled}
          />
        </div>

        <div>
          <label htmlFor="product-category" style={styles.label}>Category</label>
          <input
            id="product-category"
            style={styles.input}
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({ ...current, category: event.target.value }))
            }
            placeholder="Example: Beverages"
            disabled={fieldsDisabled}
          />
        </div>

        <div>
          <label htmlFor="product-unit" style={styles.label}>Unit</label>
          <input
            id="product-unit"
            style={styles.input}
            value={form.unit}
            onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
            placeholder="Example: bottle"
            required
            disabled={fieldsDisabled}
          />
        </div>

        <div>
          <label htmlFor="product-min-stock" style={styles.label}>Minimum Stock</label>
          <input
            id="product-min-stock"
            style={styles.input}
            type="number"
            inputMode="decimal"
            min="0"
            value={form.min_stock}
            onChange={(event) =>
              setForm((current) => ({ ...current, min_stock: event.target.value }))
            }
            placeholder="0"
            disabled={fieldsDisabled}
          />
        </div>

        <div>
          <label htmlFor="product-standard-cost" style={styles.label}>Standard Unit Cost ({getActiveTenantCurrency()})</label>
          <input
            id="product-standard-cost"
            style={styles.input}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.0001"
            value={form.standard_unit_cost}
            onChange={(event) =>
              setForm((current) => ({ ...current, standard_unit_cost: event.target.value }))
            }
            placeholder="Optional fallback cost"
            disabled={fieldsDisabled}
          />
          <div style={styles.fieldHint}>Tenant-base cost in {getActiveTenantCurrency()}; used only when no compatible received movement cost exists yet.</div>
        </div>

        <div>
          <label htmlFor="product-supplier" style={styles.label}>Supplier</label>
          <select
            id="product-supplier"
            style={styles.input}
            value={form.supplier_id}
            onChange={(event) =>
              setForm((current) => ({ ...current, supplier_id: event.target.value }))
            }
            disabled={fieldsDisabled}
          >
            <option value="">No supplier assigned</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="product-default-barcode" style={styles.label}>Default Barcode</label>
          <input
            id="product-default-barcode"
            style={styles.input}
            value={form.barcode}
            onChange={(event) =>
              setForm((current) => ({ ...current, barcode: event.target.value }))
            }
            placeholder="Scan or enter default package barcode"
            disabled={fieldsDisabled}
          />
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.requires_lot_tracking} onChange={(event) => setForm((current) => ({ ...current, requires_lot_tracking: event.target.checked }))} disabled={fieldsDisabled} />
            Require lot / batch when stock is added
          </label>
          <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={form.requires_expiry_date} onChange={(event) => setForm((current) => ({ ...current, requires_expiry_date: event.target.checked }))} disabled={fieldsDisabled} />
            Require expiry date when stock is added
          </label>
          <div style={styles.fieldHint}>Leave these off for products that do not need this tracking.</div>
        </div>

        <div style={styles.formActions}>
          <button
            type="submit"
            style={submitDisabled ? styles.disabledButton : styles.primaryButton}
            disabled={submitDisabled}
          >
            {isSubmitting
              ? editingProduct
                ? 'Updating...'
                : 'Creating...'
              : editingProduct
                ? 'Update Product'
                : 'Create Product'}
          </button>

          {editingProduct ? (
            <button type="button" style={styles.secondaryButton} onClick={onCancelEdit} disabled={isSubmitting}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
