import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ProductItem, SupplierItem } from '../../types/inventory';
import type { ProductFormState } from './productCoreApi';
import { styles } from './productStyles';

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
  return (
    <section style={styles.panel}>
      <h3 style={styles.panelTitle}>{editingProduct ? 'Edit Product' : 'Create Product'}</h3>
      <p style={styles.panelSubtitle}>
        {canManageProducts
          ? 'Maintain product master records used across stock, shipments, receiving, alerts, and reporting.'
          : 'This form stays visible for context, but product writes are blocked for your current role.'}
      </p>
      <p style={styles.panelSubtitle}>
        Barcode here is the backward-compatible default package barcode. Additional package barcodes are managed from the Product List.
      </p>

      {formError ? <div style={styles.errorBox}>{formError}</div> : null}
      {formMessage ? <div style={styles.successBox}>{formMessage}</div> : null}

      <form onSubmit={onSubmit} style={styles.formGrid}>
        <div>
          <label style={styles.label}>Product Name</label>
          <input
            style={styles.input}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Example: Coffee Beans Premium"
            required
          />
        </div>

        <div>
          <label style={styles.label}>Category</label>
          <input
            style={styles.input}
            value={form.category}
            onChange={(event) =>
              setForm((current) => ({ ...current, category: event.target.value }))
            }
            placeholder="Example: Beverages"
          />
        </div>

        <div>
          <label style={styles.label}>Unit</label>
          <input
            style={styles.input}
            value={form.unit}
            onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
            placeholder="Example: bottle"
            required
          />
        </div>

        <div>
          <label style={styles.label}>Minimum Stock</label>
          <input
            style={styles.input}
            type="number"
            inputMode="decimal"
            min="0"
            value={form.min_stock}
            onChange={(event) =>
              setForm((current) => ({ ...current, min_stock: event.target.value }))
            }
            placeholder="0"
          />
        </div>

        <div>
          <label style={styles.label}>Standard Unit Cost</label>
          <input
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
          />
          <div style={styles.fieldHint}>Used only when no received movement cost exists yet.</div>
        </div>

        <div>
          <label style={styles.label}>Supplier</label>
          <select
            style={styles.input}
            value={form.supplier_id}
            onChange={(event) =>
              setForm((current) => ({ ...current, supplier_id: event.target.value }))
            }
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
          <label style={styles.label}>Default Barcode</label>
          <input
            style={styles.input}
            value={form.barcode}
            onChange={(event) =>
              setForm((current) => ({ ...current, barcode: event.target.value }))
            }
            placeholder="Scan or enter default package barcode"
          />
        </div>

        <div style={styles.formActions}>
          <button type="submit" style={styles.primaryButton} disabled={isSubmitting || !canManageProducts}>
            {isSubmitting
              ? editingProduct
                ? 'Updating...'
                : 'Creating...'
              : editingProduct
                ? 'Update Product'
                : 'Create Product'}
          </button>

          {editingProduct ? (
            <button type="button" style={styles.secondaryButton} onClick={onCancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
