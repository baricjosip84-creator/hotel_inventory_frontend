import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ProductItem, ProductPackageItem } from '../../types/inventory';
import type { PackageFormState } from './productPackageApi';
import { styles } from './productStyles';

type PackagesQueryState = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
};

type ProductPackagesPanelProps = {
  selectedPackageProduct: ProductItem | null;
  packagesQuery: PackagesQueryState;
  packages: ProductPackageItem[];
  packageForm: PackageFormState;
  editingPackage: ProductPackageItem | null;
  packageError: string | null;
  packageMessage: string | null;
  isPackageSubmitting: boolean;
  canManageProductPackages: boolean;
  deletePackagePending: boolean;
  setPackageForm: Dispatch<SetStateAction<PackageFormState>>;
  onClosePackages: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelPackageEdit: () => void;
  onStartEditPackage: (packageItem: ProductPackageItem) => void;
  onDeletePackage: (packageItem: ProductPackageItem) => void;
};

export function ProductPackagesPanel({
  selectedPackageProduct,
  packagesQuery,
  packages,
  packageForm,
  editingPackage,
  packageError,
  packageMessage,
  isPackageSubmitting,
  canManageProductPackages,
  deletePackagePending,
  setPackageForm,
  onClosePackages,
  onSubmit,
  onCancelPackageEdit,
  onStartEditPackage,
  onDeletePackage
}: ProductPackagesPanelProps) {
  if (!selectedPackageProduct) {
    return null;
  }

  const fieldsDisabled = isPackageSubmitting || !canManageProductPackages;

  return (
    <section id="product-packages-panel" style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>Packages for {selectedPackageProduct.name}</h3>
          <p style={styles.panelSubtitle}>
            Add scannable package formats such as bottle, 6-pack, case, or crate. Receiving converts package counts into base stock units.
          </p>
        </div>

        <button type="button" style={styles.secondaryButton} onClick={onClosePackages}>
          Close Packages
        </button>
      </div>

      {!canManageProductPackages ? (
        <div style={styles.warningBox}>Packages are read-only because the current role does not have product_packages.write permission.</div>
      ) : null}

      {packageError ? <div style={styles.errorBox}>{packageError}</div> : null}
      {packageMessage ? <div style={styles.successBox}>{packageMessage}</div> : null}

      <form onSubmit={onSubmit} style={styles.formGrid}>
        <div>
          <label htmlFor="product-package-name" style={styles.label}>Package Name</label>
          <input
            id="product-package-name"
            style={styles.input}
            value={packageForm.package_name}
            onChange={(event) =>
              setPackageForm((current) => ({ ...current, package_name: event.target.value }))
            }
            placeholder="Example: 6-pack"
            required
            disabled={fieldsDisabled}
          />
        </div>

        <div>
          <label htmlFor="product-package-barcode" style={styles.label}>Package Barcode</label>
          <input
            id="product-package-barcode"
            style={styles.input}
            value={packageForm.barcode}
            onChange={(event) =>
              setPackageForm((current) => ({ ...current, barcode: event.target.value }))
            }
            placeholder="Scan or enter package barcode"
            required
            disabled={fieldsDisabled}
          />
        </div>

        <div>
          <label htmlFor="product-package-units" style={styles.label}>Units Per Package</label>
          <input
            id="product-package-units"
            style={styles.input}
            type="number"
            inputMode="decimal"
            min="0.000001"
            step="any"
            value={packageForm.units_per_package}
            onChange={(event) =>
              setPackageForm((current) => ({ ...current, units_per_package: event.target.value }))
            }
            placeholder="1"
            required
            disabled={fieldsDisabled}
          />
        </div>

        <label style={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={packageForm.is_default}
            onChange={(event) =>
              setPackageForm((current) => ({ ...current, is_default: event.target.checked }))
            }
            disabled={fieldsDisabled}
          />
          Default package
        </label>

        <div style={styles.formActions}>
          <button
            type="submit"
            style={fieldsDisabled ? styles.disabledButton : styles.primaryButton}
            disabled={fieldsDisabled}
          >
            {isPackageSubmitting
              ? editingPackage
                ? 'Updating...'
                : 'Creating...'
              : editingPackage
                ? 'Update Package'
                : 'Create Package'}
          </button>

          {editingPackage ? (
            <button type="button" style={styles.secondaryButton} onClick={onCancelPackageEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div style={styles.packageTableBlock}>
        {packagesQuery.isLoading ? <div style={styles.emptyCell}>Loading packages...</div> : null}

        {packagesQuery.isError ? (
          <div style={styles.errorBox}>Failed to load packages: {(packagesQuery.error as Error).message || 'Unknown error'}</div>
        ) : null}

        {!packagesQuery.isLoading && !packagesQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.packageTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Package</th>
                  <th style={styles.th}>Barcode</th>
                  <th style={styles.th}>Units</th>
                  <th style={styles.th}>Default</th>
                  <th style={styles.th}>Version</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packages.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={6}>
                      No packages found for this product.
                    </td>
                  </tr>
                ) : (
                  packages.map((packageItem) => (
                    <tr key={packageItem.id}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{packageItem.package_name}</div>
                        <div style={styles.rowSubtle}>Package ID: {packageItem.id}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.barcodeValue}>{packageItem.barcode}</span>
                      </td>
                      <td style={styles.td}>{String(packageItem.units_per_package)}</td>
                      <td style={styles.td}>
                        {packageItem.is_default ? (
                          <span style={styles.defaultBadge}>Default</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeVersion}>v{packageItem.version}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            type="button"
                            style={!canManageProductPackages ? styles.disabledButton : styles.secondaryButton}
                            onClick={() => onStartEditPackage(packageItem)}
                            disabled={!canManageProductPackages}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            style={!canManageProductPackages ? styles.disabledButton : styles.dangerButton}
                            onClick={() => onDeletePackage(packageItem)}
                            disabled={deletePackagePending || !canManageProductPackages}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
