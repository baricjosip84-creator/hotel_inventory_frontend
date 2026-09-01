import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { ProductItem, ProductPackageItem } from '../../types/inventory';
import { emptyPackageForm, emptyProductForm } from './productFormDefaults';
import { scrollToFormSection } from '../../lib/scrollToForm';
import type { ProductFormState } from './productCoreApi';
import type { PackageFormState } from './productPackageApi';

type MutationLike<TPayload> = {
  mutate: (payload: TPayload) => void;
};

type ProductActionHandlerParams = {
  canManageProducts: boolean;
  canManageProductPackages: boolean;
  canViewSuppliers: boolean;
  editingProduct: ProductItem | null;
  selectedPackageProduct: ProductItem | null;
  editingPackage: ProductPackageItem | null;
  form: ProductFormState;
  packageForm: PackageFormState;
  createMutation: MutationLike<ProductFormState>;
  updateMutation: MutationLike<{ product: ProductItem; values: ProductFormState; includeSupplierId?: boolean }>;
  deleteMutation: MutationLike<ProductItem>;
  createPackageMutation: MutationLike<{ productId: string; values: PackageFormState }>;
  updatePackageMutation: MutationLike<{ productId: string; packageItem: ProductPackageItem; values: PackageFormState }>;
  deletePackageMutation: MutationLike<{ productId: string; packageItem: ProductPackageItem }>;
  setEditingProduct: Dispatch<SetStateAction<ProductItem | null>>;
  setForm: Dispatch<SetStateAction<ProductFormState>>;
  setFormMessage: Dispatch<SetStateAction<string | null>>;
  setFormError: Dispatch<SetStateAction<string | null>>;
  setSelectedPackageProduct: Dispatch<SetStateAction<ProductItem | null>>;
  setEditingPackage: Dispatch<SetStateAction<ProductPackageItem | null>>;
  setPackageForm: Dispatch<SetStateAction<PackageFormState>>;
  setPackageMessage: Dispatch<SetStateAction<string | null>>;
  setPackageError: Dispatch<SetStateAction<string | null>>;
  ui: (englishText: string) => string;
};

export function buildProductActionHandlers({
  canManageProducts,
  canManageProductPackages,
  canViewSuppliers,
  editingProduct,
  selectedPackageProduct,
  editingPackage,
  form,
  packageForm,
  createMutation,
  updateMutation,
  deleteMutation,
  createPackageMutation,
  updatePackageMutation,
  deletePackageMutation,
  setEditingProduct,
  setForm,
  setFormMessage,
  setFormError,
  setSelectedPackageProduct,
  setEditingPackage,
  setPackageForm,
  setPackageMessage,
  setPackageError,
  ui
}: ProductActionHandlerParams) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!canManageProducts) {
      setFormError(
        ui('Your current role is read-only for product master data because it does not have products.write permission.')
      );
      return;
    }

    if (!form.sku.trim()) {
      setFormError(ui('SKU is required.'));
      return;
    }

    if (!form.name.trim()) {
      setFormError(ui('Product name is required.'));
      return;
    }

    if (!form.unit.trim()) {
      setFormError(ui('Unit is required.'));
      return;
    }

    const parsedMinStock = Number(form.min_stock);
    if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
      setFormError(ui('Minimum stock must be a valid number greater than or equal to zero.'));
      return;
    }

    if (form.standard_unit_cost.trim() !== '') {
      const parsedStandardCost = Number(form.standard_unit_cost);
      if (!Number.isFinite(parsedStandardCost) || parsedStandardCost < 0) {
        setFormError(ui('Standard unit cost must be a valid number greater than or equal to zero.'));
        return;
      }
    }

    if (editingProduct) {
      updateMutation.mutate({
        product: editingProduct,
        values: form,
        includeSupplierId: canViewSuppliers
      });
      return;
    }

    createMutation.mutate(form);
  };

  const handlePackageSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPackageError(null);
    setPackageMessage(null);

    if (!selectedPackageProduct) {
      setPackageError(ui('Select a product before managing packages.'));
      return;
    }

    if (!canManageProductPackages) {
      setPackageError(ui('Your current role cannot manage product packages.'));
      return;
    }

    if (!packageForm.package_name.trim()) {
      setPackageError(ui('Package name is required.'));
      return;
    }

    if (!packageForm.barcode.trim()) {
      setPackageError(ui('Barcode is required.'));
      return;
    }

    const parsedUnits = Number(packageForm.units_per_package);
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      setPackageError(ui('Units per package must be a valid number greater than zero.'));
      return;
    }

    if (editingPackage) {
      updatePackageMutation.mutate({
        productId: selectedPackageProduct.id,
        packageItem: editingPackage,
        values: packageForm
      });
      return;
    }

    createPackageMutation.mutate({
      productId: selectedPackageProduct.id,
      values: packageForm
    });
  };

  const handleStartEdit = (product: ProductItem) => {
    if (!canManageProducts) {
      setFormError(ui('Your current role cannot edit products.'));
      setFormMessage(null);
      return;
    }

    setEditingProduct(product);
    setFormMessage(null);
    setFormError(null);
    setForm({
      sku: product.sku || '',
      name: product.name,
      category: product.category || '',
      unit: product.unit,
      min_stock: String(product.min_stock ?? 0),
      standard_unit_cost:
        product.standard_unit_cost === null || product.standard_unit_cost === undefined
          ? ''
          : String(product.standard_unit_cost),
      supplier_id: product.supplier_id || '',
      barcode: product.barcode || '',
      requires_lot_tracking: Boolean(product.requires_lot_tracking),
      requires_expiry_date: Boolean(product.requires_expiry_date)
    });
    scrollToFormSection('product-form-panel');
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setForm(emptyProductForm());
    setFormMessage(null);
    setFormError(null);
  };

  const handleDelete = (product: ProductItem) => {
    if (!canManageProducts) {
      setFormError(ui('Your current role cannot archive products.'));
      setFormMessage(null);
      return;
    }

    const confirmed = window.confirm(`${ui('Archive product')} "${product.name}"?`);
    if (!confirmed) {
      return;
    }

    setFormError(null);
    setFormMessage(null);
    deleteMutation.mutate(product);
  };

  const handleOpenPackages = (product: ProductItem) => {
    setSelectedPackageProduct(product);
    setEditingPackage(null);
    setPackageForm(emptyPackageForm());
    setPackageError(null);
    setPackageMessage(null);
    scrollToFormSection('product-packages-panel');
  };

  const handleClosePackages = () => {
    setSelectedPackageProduct(null);
    setEditingPackage(null);
    setPackageForm(emptyPackageForm());
    setPackageError(null);
    setPackageMessage(null);
  };

  const handleStartEditPackage = (packageItem: ProductPackageItem) => {
    if (!canManageProductPackages) {
      setPackageError(ui('Your current role cannot edit product packages.'));
      setPackageMessage(null);
      return;
    }

    setEditingPackage(packageItem);
    setPackageError(null);
    setPackageMessage(null);
    setPackageForm({
      package_name: packageItem.package_name,
      barcode: packageItem.barcode,
      units_per_package: String(packageItem.units_per_package),
      is_default: Boolean(packageItem.is_default)
    });
  };

  const handleCancelPackageEdit = () => {
    setEditingPackage(null);
    setPackageForm(emptyPackageForm());
    setPackageError(null);
    setPackageMessage(null);
  };

  const handleDeletePackage = (packageItem: ProductPackageItem) => {
    if (!selectedPackageProduct) {
      setPackageError(ui('Select a product before archiving packages.'));
      setPackageMessage(null);
      return;
    }

    if (!canManageProductPackages) {
      setPackageError(ui('Your current role cannot archive product packages.'));
      setPackageMessage(null);
      return;
    }

    const confirmed = window.confirm(
      `${ui('Archive package')} "${packageItem.package_name}" ${ui('for')} "${selectedPackageProduct.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setPackageError(null);
    setPackageMessage(null);
    deletePackageMutation.mutate({
      productId: selectedPackageProduct.id,
      packageItem
    });
  };

  return {
    handleSubmit,
    handlePackageSubmit,
    handleStartEdit,
    handleCancelEdit,
    handleDelete,
    handleOpenPackages,
    handleClosePackages,
    handleStartEditPackage,
    handleCancelPackageEdit,
    handleDeletePackage
  };
}