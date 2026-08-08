import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import type { ProductOption, ProductPackage, ProductPackageForm } from '../EnterpriseInventoryTypes';

type ProductPackagesQuery = {
  isLoading: boolean;
};

type ProductPackageSaveMutation = {
  isPending: boolean;
};

type ProductPackageDeleteMutation = {
  isPending: boolean;
  mutate: (item: ProductPackage) => void;
};

type PackagesTabProps = {
  editingProductPackageId: string | null;
  emptyProductPackageForm: ProductPackageForm;
  productPackageForm: ProductPackageForm;
  productPackagesQuery: ProductPackagesQuery;
  products: ProductOption[];
  selectedProductPackages: ProductPackage[];
  createProductPackageMutation: ProductPackageSaveMutation;
  updateProductPackageMutation: ProductPackageSaveMutation;
  deleteProductPackageMutation: ProductPackageDeleteMutation;
  beginEditProductPackage: (item: ProductPackage) => void;
  cancelEditProductPackage: () => void;
  setEditingProductPackageId: Dispatch<SetStateAction<string | null>>;
  setProductPackageForm: Dispatch<SetStateAction<ProductPackageForm>>;
  onProductPackageSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function PackagesTab({
  editingProductPackageId,
  emptyProductPackageForm,
  productPackageForm,
  productPackagesQuery,
  products,
  selectedProductPackages,
  createProductPackageMutation,
  updateProductPackageMutation,
  deleteProductPackageMutation,
  beginEditProductPackage,
  cancelEditProductPackage,
  setEditingProductPackageId,
  setProductPackageForm,
  onProductPackageSubmit
}: PackagesTabProps) {
  const canWritePackages = hasPermission(TENANT_PERMISSIONS.PRODUCT_PACKAGES_WRITE);

  return (
    <section style={styles.grid}>
      <form onSubmit={onProductPackageSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>{editingProductPackageId ? 'Update product package barcode' : 'Create product package barcode'}</h2>
        <SelectField
          label="Product"
          value={productPackageForm.product_id}
          onChange={(value) => {
            setProductPackageForm({ ...emptyProductPackageForm, product_id: value });
            setEditingProductPackageId(null);
          }}
          options={products.map((product) => ({ value: product.id, label: product.name }))}
          required
          disabled={!canWritePackages}
        />
        <InputField label="Package name" value={productPackageForm.package_name} onChange={(value) => setProductPackageForm((current) => ({ ...current, package_name: value }))} required disabled={!canWritePackages} />
        <InputField label="Package barcode" value={productPackageForm.barcode} onChange={(value) => setProductPackageForm((current) => ({ ...current, barcode: value }))} required disabled={!canWritePackages} />
        <InputField label="Units per package" type="number" min="0.0001" value={productPackageForm.units_per_package} onChange={(value) => setProductPackageForm((current) => ({ ...current, units_per_package: value }))} required disabled={!canWritePackages} />
        <label style={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={productPackageForm.is_default}
            disabled={!canWritePackages}
            onChange={(event) => setProductPackageForm((current) => ({ ...current, is_default: event.target.checked }))}
          />
          Set as default product barcode
        </label>
        <button type="submit" disabled={createProductPackageMutation.isPending || updateProductPackageMutation.isPending || !canWritePackages} style={styles.primaryButton}>
          {editingProductPackageId ? 'Update package barcode' : 'Create package barcode'}
        </button>
        {editingProductPackageId ? <button type="button" onClick={cancelEditProductPackage} style={styles.secondaryButton}>Cancel edit</button> : null}
      </form>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Package barcodes</h2>
        {!productPackageForm.product_id ? (
          <p style={styles.helper}>Select a product to load its package barcodes.</p>
        ) : productPackagesQuery.isLoading ? (
          <p style={styles.helper}>Loading…</p>
        ) : selectedProductPackages.length === 0 ? (
          <p style={styles.helper}>No package barcodes configured for this product.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Package</th>
                  <th style={styles.th}>Barcode</th>
                  <th style={styles.th}>Units/package</th>
                  <th style={styles.th}>Default</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {selectedProductPackages.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{item.package_name}</td>
                    <td style={styles.td}>{item.barcode}</td>
                    <td style={styles.td}>{formatNumber(item.units_per_package)}</td>
                    <td style={styles.td}>{item.is_default ? 'Yes' : 'No'}</td>
                    <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                    <td style={styles.td}>
                      <button type="button" style={canWritePackages ? styles.smallButton : styles.disabledButton} disabled={!canWritePackages} onClick={() => beginEditProductPackage(item)}>Edit</button>
                      <button type="button" style={styles.dangerButton} disabled={deleteProductPackageMutation.isPending || !canWritePackages} onClick={() => deleteProductPackageMutation.mutate(item)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
