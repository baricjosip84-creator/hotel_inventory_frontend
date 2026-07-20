import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatCurrency, formatNumber } from '../EnterpriseInventoryFormat';
import type { ProductForm, ProductOption, ProductPackageForm, SupplierOption } from '../EnterpriseInventoryTypes';

type ProductSaveMutation = {
  isPending: boolean;
  mutate: (input: ProductForm) => void;
};

type ProductDeleteMutation = {
  isPending: boolean;
  mutate: (product: ProductOption) => void;
};

type ProductsQuery = {
  isLoading: boolean;
};

type ProductsTabProps = {
  editingProductId: string | null;
  emptyProductForm: ProductForm;
  emptyProductPackageForm: ProductPackageForm;
  productForm: ProductForm;
  productSearch: string;
  products: ProductOption[];
  productsQuery: ProductsQuery;
  saveProductMutation: ProductSaveMutation;
  deleteProductMutation: ProductDeleteMutation;
  setActiveTab: Dispatch<SetStateAction<string>>;
  setEditingProductId: Dispatch<SetStateAction<string | null>>;
  setProductForm: Dispatch<SetStateAction<ProductForm>>;
  setProductPackageForm: Dispatch<SetStateAction<ProductPackageForm>>;
  setProductSearch: Dispatch<SetStateAction<string>>;
  suppliers: SupplierOption[];
};

export function ProductsTab({
  editingProductId,
  emptyProductForm,
  emptyProductPackageForm,
  productForm,
  productSearch,
  products,
  productsQuery,
  saveProductMutation,
  deleteProductMutation,
  setActiveTab,
  setEditingProductId,
  setProductForm,
  setProductPackageForm,
  setProductSearch,
  suppliers
}: ProductsTabProps) {
  const handleProductSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveProductMutation.mutate(productForm);
  };

  const startProductEdit = (product: ProductOption) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name || '',
      category: product.category || '',
      unit: product.unit || '',
      min_stock: String(product.min_stock ?? '0'),
      supplier_id: product.supplier_id || '',
      barcode: product.barcode || '',
      standard_unit_cost: product.standard_unit_cost === null || product.standard_unit_cost === undefined ? '' : String(product.standard_unit_cost),
      package_name: '',
      units_per_package: '1'
    });
    setActiveTab('products');
  };

  return (
    <section style={styles.grid}>
      <form style={styles.card} onSubmit={handleProductSubmit}>
        <h2 style={styles.sectionTitle}>{editingProductId ? 'Edit product' : 'Create product'}</h2>
        <InputField label="Name" value={productForm.name} required onChange={(value) => setProductForm((current) => ({ ...current, name: value }))} />
        <InputField label="Category" value={productForm.category} onChange={(value) => setProductForm((current) => ({ ...current, category: value }))} />
        <InputField label="Unit" value={productForm.unit} required onChange={(value) => setProductForm((current) => ({ ...current, unit: value }))} />
        <InputField label="Minimum stock" type="number" min="0" value={productForm.min_stock} onChange={(value) => setProductForm((current) => ({ ...current, min_stock: value }))} />
        <SelectField
          label="Supplier"
          value={productForm.supplier_id}
          onChange={(value) => setProductForm((current) => ({ ...current, supplier_id: value }))}
          options={[{ value: '', label: 'No supplier' }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))]}
        />
        <InputField label="Default barcode" value={productForm.barcode} onChange={(value) => setProductForm((current) => ({ ...current, barcode: value }))} />
        <InputField label="Standard unit cost" type="number" min="0" value={productForm.standard_unit_cost} onChange={(value) => setProductForm((current) => ({ ...current, standard_unit_cost: value }))} />
        <InputField label="Default package name" value={productForm.package_name} onChange={(value) => setProductForm((current) => ({ ...current, package_name: value }))} />
        <InputField label="Units per package" type="number" min="0.0001" value={productForm.units_per_package} onChange={(value) => setProductForm((current) => ({ ...current, units_per_package: value }))} />
        <div style={styles.actions}>
          <button type="submit" style={styles.primaryButton} disabled={saveProductMutation.isPending}>{editingProductId ? 'Save product' : 'Create product'}</button>
          {editingProductId ? (
            <button type="button" style={styles.secondaryButton} onClick={() => { setEditingProductId(null); setProductForm(emptyProductForm); }}>Cancel edit</button>
          ) : null}
        </div>
      </form>
      <section style={styles.cardWide}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Product master data</h2>
          <input style={{ ...styles.input, maxWidth: 260 }} placeholder="Search products" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} />
        </div>
        {productsQuery.isLoading ? <p style={styles.helper}>Loading…</p> : products.length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Unit</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Min stock</th>
                  <th style={styles.th}>Stock</th>
                  <th style={styles.th}>Cost</th>
                  <th style={styles.th}>Barcode</th>
                  <th style={styles.th}>Packages</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td style={styles.td}>{product.name}</td>
                    <td style={styles.td}>{product.category || '-'}</td>
                    <td style={styles.td}>{product.unit || '-'}</td>
                    <td style={styles.td}>{product.supplier_name || '-'}</td>
                    <td style={styles.td}>{formatNumber(product.min_stock)}</td>
                    <td style={styles.td}>{formatNumber(product.current_stock_quantity)}</td>
                    <td style={styles.td}>{formatCurrency(product.effective_unit_cost)}</td>
                    <td style={styles.td}>{product.barcode || '-'}</td>
                    <td style={styles.td}>{formatNumber(product.package_count)}</td>
                    <td style={styles.td}>
                      <div style={styles.inlineActions}>
                        <button type="button" style={styles.secondaryButton} onClick={() => startProductEdit(product)}>Edit</button>
                        <button type="button" style={styles.secondaryButton} onClick={() => { setProductPackageForm({ ...emptyProductPackageForm, product_id: product.id }); setActiveTab('packages'); }}>Packages</button>
                        <button type="button" style={styles.dangerButton} disabled={deleteProductMutation.isPending} onClick={() => deleteProductMutation.mutate(product)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p style={styles.helper}>No products found.</p>}
      </section>
    </section>
  );
}
