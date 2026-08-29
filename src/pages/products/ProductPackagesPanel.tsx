import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ProductItem, ProductPackageItem } from '../../types/inventory';
import type { PackageFormState } from './productPackageApi';
import { styles } from './productStyles';
import { useAppTranslation } from '../../i18n/I18nContext';

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
  const { ui } = useAppTranslation();
  if (!selectedPackageProduct) {
    return null;
  }

  const fieldsDisabled = isPackageSubmitting || !canManageProductPackages;

  return (
    <section id="product-packages-panel" style={styles.panel}>
      <div style={styles.packageHeader}>
        <div>
          <h3 style={styles.panelTitle}>{ui("Packages for")} {selectedPackageProduct.name}</h3>
          <p style={styles.panelSubtitle}>
            {ui("Add scannable package formats such as bottle, 6-pack, case, or crate. Receiving converts package counts into base stock units.")}
          </p>
        </div>

        <button type="button" style={styles.secondaryButton} onClick={onClosePackages}>
          {ui("Close Packages")}
        </button>
      </div>

      {!canManageProductPackages ? (
        <div style={styles.warningBox}>{ui("Packages are read-only because the current role does not have product_packages.write permission.")}</div>
      ) : null}

      {packageError ? <div style={styles.errorBox}>{packageError}</div> : null}
      {packageMessage ? <div style={styles.successBox}>{packageMessage}</div> : null}

      <form onSubmit={onSubmit} style={styles.formGrid}>
        <div>
          <label htmlFor="product-package-name" style={styles.label}>{ui("Package Name")}</label>
          <input
            id="product-package-name"
            style={styles.input}
            value={packageForm.package_name}
            onChange={(event) =>
              setPackageForm((current) => ({ ...current, package_name: event.target.value }))
            }
            placeholder={ui("Example: 6-pack")}
            required
            disabled={fieldsDisabled}
          />
        </div>

        <div>
          <label htmlFor="product-package-barcode" style={styles.label}>{ui("Package Barcode")}</label>
          <input
            id="product-package-barcode"
            style={styles.input}
            value={packageForm.barcode}
            onChange={(event) =>
              setPackageForm((current) => ({ ...current, barcode: event.target.value }))
            }
            placeholder={ui("Scan or enter package barcode")}
            required
            disabled={fieldsDisabled}
          />
        </div>

        <div>
          <label htmlFor="product-package-units" style={styles.label}>{ui("Units Per Package")}</label>
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
          {ui("Default package")}
        </label>

        <div style={styles.formActions}>
          <button
            type="submit"
            style={fieldsDisabled ? styles.disabledButton : styles.primaryButton}
            disabled={fieldsDisabled}
          >
            {isPackageSubmitting
              ? editingPackage
                ? ui('Updating...')
                : ui('Creating...')
              : editingPackage
                ? ui('Update Package')
                : ui('Create Package')}
          </button>

          {editingPackage ? (
            <button type="button" style={styles.secondaryButton} onClick={onCancelPackageEdit}>
              {ui("Cancel")}
            </button>
          ) : null}
        </div>
      </form>

      <div style={styles.packageTableBlock}>
        {packagesQuery.isLoading ? <div style={styles.emptyCell}>{ui("Loading packages...")}</div> : null}

        {packagesQuery.isError ? (
          <div style={styles.errorBox}>{ui("Failed to load packages:")} {(packagesQuery.error as Error).message || ui('Unknown error')}</div>
        ) : null}

        {!packagesQuery.isLoading && !packagesQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.packageTable}>
              <thead>
                <tr>
                  <th style={styles.th}>{ui("Package")}</th>
                  <th style={styles.th}>{ui("Barcode")}</th>
                  <th style={styles.th}>{ui("Units")}</th>
                  <th style={styles.th}>{ui("Default")}</th>
                  <th style={styles.th}>{ui("Version")}</th>
                  <th style={styles.th}>{ui("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {packages.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={6}>
                      {ui("No packages found for this product.")}
                    </td>
                  </tr>
                ) : (
                  packages.map((packageItem) => (
                    <tr key={packageItem.id}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{packageItem.package_name}</div>
                        <div style={styles.rowSubtle}>{ui("Package ID:")} {packageItem.id}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.barcodeValue}>{packageItem.barcode}</span>
                      </td>
                      <td style={styles.td}>{String(packageItem.units_per_package)}</td>
                      <td style={styles.td}>
                        {packageItem.is_default ? (
                          <span style={styles.defaultBadge}>{ui("Default")}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeVersion}>{ui("v")}{packageItem.version}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            type="button"
                            style={!canManageProductPackages ? styles.disabledButton : styles.secondaryButton}
                            onClick={() => onStartEditPackage(packageItem)}
                            disabled={!canManageProductPackages}
                          >
                            {ui("Edit")}
                          </button>

                          <button
                            type="button"
                            style={!canManageProductPackages ? styles.disabledButton : styles.dangerButton}
                            onClick={() => onDeletePackage(packageItem)}
                            disabled={deletePackagePending || !canManageProductPackages}
                          >
                            {ui("Delete")}
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
