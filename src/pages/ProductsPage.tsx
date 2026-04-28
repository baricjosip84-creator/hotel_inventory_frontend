import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { ProductItem, ProductPackageItem, SupplierItem } from '../types/inventory';

type ProductFormState = {
  name: string;
  category: string;
  unit: string;
  min_stock: string;
  supplier_id: string;
  barcode: string;
};

type PackageFormState = {
  package_name: string;
  barcode: string;
  units_per_package: string;
  is_default: boolean;
};

async function fetchProducts(filters: {
  search: string;
  category: string;
  supplierId: string;
}): Promise<ProductItem[]> {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.category.trim()) {
    params.set('category', filters.category.trim());
  }

  if (filters.supplierId.trim()) {
    params.set('supplier_id', filters.supplierId.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<ProductItem[]>(`/products${suffix}`);
}

async function fetchSuppliers(): Promise<SupplierItem[]> {
  return apiRequest<SupplierItem[]>('/suppliers');
}

async function fetchProductPackages(productId: string): Promise<ProductPackageItem[]> {
  return apiRequest<ProductPackageItem[]>(`/products/${productId}/packages`);
}

async function createProduct(input: ProductFormState): Promise<ProductItem> {
  return apiRequest<ProductItem>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      category: input.category.trim() || null,
      unit: input.unit.trim(),
      min_stock: Number(input.min_stock),
      supplier_id: input.supplier_id || null,
      barcode: input.barcode.trim() || null
    })
  });
}

async function updateProduct(input: {
  product: ProductItem;
  values: ProductFormState;
}): Promise<ProductItem> {
  return apiRequest<ProductItem>(`/products/${input.product.id}`, {
    method: 'PATCH',
    headers: {
      'If-Match-Version': String(input.product.version)
    },
    body: JSON.stringify({
      name: input.values.name.trim(),
      category: input.values.category.trim() || null,
      unit: input.values.unit.trim(),
      min_stock: Number(input.values.min_stock),
      supplier_id: input.values.supplier_id || null,
      barcode: input.values.barcode.trim() || null
    })
  });
}

async function deleteProduct(product: ProductItem): Promise<void> {
  await apiRequest(`/products/${product.id}`, {
    method: 'DELETE',
    headers: {
      'If-Match-Version': String(product.version)
    }
  });
}

async function createProductPackage(input: {
  productId: string;
  values: PackageFormState;
}): Promise<ProductPackageItem> {
  return apiRequest<ProductPackageItem>(`/products/${input.productId}/packages`, {
    method: 'POST',
    body: JSON.stringify({
      package_name: input.values.package_name.trim(),
      barcode: input.values.barcode.trim(),
      units_per_package: Number(input.values.units_per_package),
      is_default: input.values.is_default
    })
  });
}

async function updateProductPackage(input: {
  productId: string;
  packageItem: ProductPackageItem;
  values: PackageFormState;
}): Promise<ProductPackageItem> {
  return apiRequest<ProductPackageItem>(
    `/products/${input.productId}/packages/${input.packageItem.id}`,
    {
      method: 'PATCH',
      headers: {
        /*
          Safe to send. If the backend route does not require optimistic locking
          for package rows yet, this header is ignored by Express.
        */
        'If-Match-Version': String(input.packageItem.version)
      },
      body: JSON.stringify({
        package_name: input.values.package_name.trim(),
        barcode: input.values.barcode.trim(),
        units_per_package: Number(input.values.units_per_package),
        is_default: input.values.is_default
      })
    }
  );
}

async function deleteProductPackage(input: {
  productId: string;
  packageItem: ProductPackageItem;
}): Promise<void> {
  await apiRequest(`/products/${input.productId}/packages/${input.packageItem.id}`, {
    method: 'DELETE',
    headers: {
      /*
        Safe to send. If the backend route does not require optimistic locking
        for package rows yet, this header is ignored by Express.
      */
      'If-Match-Version': String(input.packageItem.version)
    }
  });
}

function emptyForm(): ProductFormState {
  return {
    name: '',
    category: '',
    unit: '',
    min_stock: '0',
    supplier_id: '',
    barcode: ''
  };
}

function emptyPackageForm(): PackageFormState {
  return {
    package_name: '',
    barcode: '',
    units_per_package: '1',
    is_default: false
  };
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleString();
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return 0;
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const toneStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={toneStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function ProductsPage() {
  /*
    WHAT CHANGED
    ------------
    Products now support package barcode management directly on this page.

    WHY IT CHANGED
    --------------
    Backend Phase 1 added product_packages and backend Phase 2/3 made scanner
    lookup and receiving package-aware. The frontend now needs a way for users
    to create, edit, delete, and review package barcodes per product.

    WHAT PROBLEM IT SOLVES
    ----------------------
    A product is the base inventory item, while product packages represent
    scannable real-world formats such as bottle, 6-pack, case, or crate.
  */

  const queryClient = useQueryClient();
  const { role, canManageProducts } = getRoleCapabilities();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedPackageProduct, setSelectedPackageProduct] = useState<ProductItem | null>(null);
  const [editingPackage, setEditingPackage] = useState<ProductPackageItem | null>(null);
  const [packageForm, setPackageForm] = useState<PackageFormState>(emptyPackageForm());
  const [packageMessage, setPackageMessage] = useState<string | null>(null);
  const [packageError, setPackageError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products', search, categoryFilter, supplierFilter],
    queryFn: () =>
      fetchProducts({
        search,
        category: categoryFilter,
        supplierId: supplierFilter
      })
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers-available-products-page'],
    queryFn: fetchSuppliers
  });

  const packagesQuery = useQuery({
    queryKey: ['product-packages', selectedPackageProduct?.id],
    queryFn: () => fetchProductPackages(selectedPackageProduct!.id),
    enabled: Boolean(selectedPackageProduct?.id)
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Product created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to create product.');
      }
      setFormMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Product updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to update product.');
      }
      setFormMessage(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setSelectedPackageProduct(null);
      setEditingPackage(null);
      setForm(emptyForm());
      setPackageForm(emptyPackageForm());
      setFormError(null);
      setPackageError(null);
      setFormMessage('Product deleted successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to delete product.');
      }
      setFormMessage(null);
    }
  });

  const createPackageMutation = useMutation({
    mutationFn: createProductPackage,
    onSuccess: async () => {
      setEditingPackage(null);
      setPackageForm(emptyPackageForm());
      setPackageError(null);
      setPackageMessage('Package created successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError('Failed to create package.');
      }
      setPackageMessage(null);
    }
  });

  const updatePackageMutation = useMutation({
    mutationFn: updateProductPackage,
    onSuccess: async () => {
      setEditingPackage(null);
      setPackageForm(emptyPackageForm());
      setPackageError(null);
      setPackageMessage('Package updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError('Failed to update package.');
      }
      setPackageMessage(null);
    }
  });

  const deletePackageMutation = useMutation({
    mutationFn: deleteProductPackage,
    onSuccess: async () => {
      setEditingPackage(null);
      setPackageForm(emptyPackageForm());
      setPackageError(null);
      setPackageMessage('Package deleted successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedPackageProduct?.id) {
        await queryClient.invalidateQueries({
          queryKey: ['product-packages', selectedPackageProduct.id]
        });
      }
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setPackageError(error.message);
      } else {
        setPackageError('Failed to delete package.');
      }
      setPackageMessage(null);
    }
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);
  const packages = useMemo(() => packagesQuery.data ?? [], [packagesQuery.data]);

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) => (product.category || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const summary = useMemo(() => {
    const linkedSupplierCount = products.filter((product) => Boolean(product.supplier_id)).length;
    const thresholdConfiguredCount = products.filter((product) => toNumber(product.min_stock) > 0).length;
    const categorizedCount = products.filter((product) => Boolean(product.category && product.category.trim())).length;
    const barcodeCount = products.filter((product) => Boolean(product.barcode && product.barcode.trim())).length;

    return {
      total: products.length,
      linkedSupplierCount,
      thresholdConfiguredCount,
      categorizedCount,
      barcodeCount
    };
  }, [products]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!canManageProducts) {
      setFormError(
        'Your current role is read-only for product master data. Product writes are restricted to manager and admin roles by the existing backend.'
      );
      return;
    }

    if (!form.name.trim()) {
      setFormError('Product name is required.');
      return;
    }

    if (!form.unit.trim()) {
      setFormError('Unit is required.');
      return;
    }

    const parsedMinStock = Number(form.min_stock);
    if (!Number.isFinite(parsedMinStock) || parsedMinStock < 0) {
      setFormError('Minimum stock must be a valid number greater than or equal to zero.');
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({
        product: editingProduct,
        values: form
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
      setPackageError('Select a product before managing packages.');
      return;
    }

    if (!canManageProducts) {
      setPackageError('Your current role cannot manage product packages.');
      return;
    }

    if (!packageForm.package_name.trim()) {
      setPackageError('Package name is required.');
      return;
    }

    if (!packageForm.barcode.trim()) {
      setPackageError('Barcode is required.');
      return;
    }

    const parsedUnits = Number(packageForm.units_per_package);
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      setPackageError('Units per package must be a valid number greater than zero.');
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
      setFormError('Your current role cannot edit products.');
      setFormMessage(null);
      return;
    }

    setEditingProduct(product);
    setFormMessage(null);
    setFormError(null);
    setForm({
      name: product.name,
      category: product.category || '',
      unit: product.unit,
      min_stock: String(product.min_stock ?? 0),
      supplier_id: product.supplier_id || '',
      barcode: product.barcode || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setForm(emptyForm());
    setFormMessage(null);
    setFormError(null);
  };

  const handleDelete = (product: ProductItem) => {
    if (!canManageProducts) {
      setFormError('Your current role cannot delete products.');
      setFormMessage(null);
      return;
    }

    const confirmed = window.confirm(`Delete product "${product.name}"?`);
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
  };

  const handleClosePackages = () => {
    setSelectedPackageProduct(null);
    setEditingPackage(null);
    setPackageForm(emptyPackageForm());
    setPackageError(null);
    setPackageMessage(null);
  };

  const handleStartEditPackage = (packageItem: ProductPackageItem) => {
    if (!canManageProducts) {
      setPackageError('Your current role cannot edit product packages.');
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
      setPackageError('Select a product before deleting packages.');
      setPackageMessage(null);
      return;
    }

    if (!canManageProducts) {
      setPackageError('Your current role cannot delete product packages.');
      setPackageMessage(null);
      return;
    }

    const confirmed = window.confirm(
      `Delete package "${packageItem.package_name}" for "${selectedPackageProduct.name}"?`
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

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isPackageSubmitting = createPackageMutation.isPending || updatePackageMutation.isPending;

  return (
    <div>
      <div style={styles.statsGrid}>
        <StatCard
          title="Products"
          value={summary.total}
          subtitle="Visible product records"
        />
        <StatCard
          title="Supplier Linked"
          value={summary.linkedSupplierCount}
          subtitle="Products already linked to suppliers"
          tone="good"
        />
        <StatCard
          title="Min Stock Set"
          value={summary.thresholdConfiguredCount}
          subtitle="Products with a configured reorder threshold"
        />
        <StatCard
          title="Barcoded"
          value={summary.barcodeCount}
          subtitle="Products with a default barcode package"
          tone="good"
        />
      </div>

      {!canManageProducts ? (
        <div style={styles.warningBox}>
          Current role: {role.toUpperCase()}. Products are read-only in the frontend because your backend only allows manager and admin users to create, edit, or delete products.
        </div>
      ) : null}

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

        <form onSubmit={handleSubmit} style={styles.formGrid}>
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
              <button type="button" style={styles.secondaryButton} onClick={handleCancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {selectedPackageProduct ? (
        <section style={styles.panel}>
          <div style={styles.packageHeader}>
            <div>
              <h3 style={styles.panelTitle}>Packages for {selectedPackageProduct.name}</h3>
              <p style={styles.panelSubtitle}>
                Add scannable package formats such as bottle, 6-pack, case, or crate. Receiving converts package counts into base stock units.
              </p>
            </div>

            <button type="button" style={styles.secondaryButton} onClick={handleClosePackages}>
              Close Packages
            </button>
          </div>

          {packageError ? <div style={styles.errorBox}>{packageError}</div> : null}
          {packageMessage ? <div style={styles.successBox}>{packageMessage}</div> : null}

          <form onSubmit={handlePackageSubmit} style={styles.formGrid}>
            <div>
              <label style={styles.label}>Package Name</label>
              <input
                style={styles.input}
                value={packageForm.package_name}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, package_name: event.target.value }))
                }
                placeholder="Example: 6-pack"
                required
              />
            </div>

            <div>
              <label style={styles.label}>Package Barcode</label>
              <input
                style={styles.input}
                value={packageForm.barcode}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, barcode: event.target.value }))
                }
                placeholder="Scan or enter package barcode"
                required
              />
            </div>

            <div>
              <label style={styles.label}>Units Per Package</label>
              <input
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
              />
            </div>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={packageForm.is_default}
                onChange={(event) =>
                  setPackageForm((current) => ({ ...current, is_default: event.target.checked }))
                }
              />
              Default package
            </label>

            <div style={styles.formActions}>
              <button
                type="submit"
                style={styles.primaryButton}
                disabled={isPackageSubmitting || !canManageProducts}
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
                <button type="button" style={styles.secondaryButton} onClick={handleCancelPackageEdit}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          <div style={styles.packageTableBlock}>
            {packagesQuery.isLoading ? <p>Loading packages...</p> : null}

            {packagesQuery.isError ? (
              <p>Failed to load packages: {(packagesQuery.error as Error).message || 'Unknown error'}</p>
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
                                style={!canManageProducts ? styles.disabledButton : styles.secondaryButton}
                                onClick={() => handleStartEditPackage(packageItem)}
                                disabled={!canManageProducts}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                style={!canManageProducts ? styles.disabledButton : styles.dangerButton}
                                onClick={() => handleDeletePackage(packageItem)}
                                disabled={deletePackageMutation.isPending || !canManageProducts}
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
      ) : null}

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Product List</h3>
        <p style={styles.panelSubtitle}>
          Search and review products available to stock, shipment, receiving, and reporting workflows.
        </p>

        <div style={styles.toolbarGrid}>
          <input
            type="text"
            placeholder="Search by product name, category, unit, or barcode..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={styles.searchInput}
          />

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            style={styles.searchInput}
          >
            <option value="">All suppliers</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        {productsQuery.isLoading ? <p>Loading products...</p> : null}

        {productsQuery.isError ? (
          <p>Failed to load products: {(productsQuery.error as Error).message || 'Unknown error'}</p>
        ) : null}

        {!productsQuery.isLoading && !productsQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Category</th>
                  <th style={styles.th}>Unit</th>
                  <th style={styles.th}>Min Stock</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Default Barcode</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Version</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={9}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{product.name}</div>
                        <div style={styles.rowSubtle}>Product ID: {product.id}</div>
                      </td>
                      <td style={styles.td}>{product.category || '-'}</td>
                      <td style={styles.td}>{product.unit}</td>
                      <td style={styles.td}>{String(product.min_stock)}</td>
                      <td style={styles.td}>{product.supplier_name || 'Not linked'}</td>
                      <td style={styles.td}>
                        {product.barcode ? (
                          <span style={styles.barcodeValue}>{product.barcode}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={styles.td}>{formatDateTime(product.created_at)}</td>
                      <td style={styles.td}>
                        <span style={styles.badgeVersion}>v{product.version}</span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() => handleOpenPackages(product)}
                          >
                            Packages
                          </button>

                          <button
                            type="button"
                            style={!canManageProducts ? styles.disabledButton : styles.secondaryButton}
                            onClick={() => handleStartEdit(product)}
                            disabled={!canManageProducts}
                            title={!canManageProducts ? 'Manager or admin role required' : undefined}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            style={!canManageProducts ? styles.disabledButton : styles.dangerButton}
                            onClick={() => handleDelete(product)}
                            disabled={deleteMutation.isPending || !canManageProducts}
                            title={!canManageProducts ? 'Manager or admin role required' : undefined}
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
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  statTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px'
  },
  statValueGood: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#166534'
  },
  statValueWarn: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#92400e'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '18px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '8px',
    fontSize: '20px',
    fontWeight: 700
  },
  panelSubtitle: {
    marginTop: 0,
    marginBottom: '16px',
    color: '#6b7280',
    lineHeight: 1.5
  },
  packageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: '10px'
  },
  packageTableBlock: {
    marginTop: '18px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    alignItems: 'end'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600
  },
  checkboxLabel: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    minHeight: '44px',
    fontSize: '14px',
    fontWeight: 600
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    outline: 'none'
  },
  formActions: {
    display: 'flex',
    alignItems: 'end',
    gap: '10px',
    flexWrap: 'wrap'
  },
  primaryButton: {
    border: 'none',
    borderRadius: '10px',
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: 600,
    cursor: 'pointer'
  },
  disabledButton: {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#e5e7eb',
    color: '#6b7280',
    cursor: 'not-allowed'
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    borderRadius: '10px',
    padding: '10px 14px',
    background: '#ffffff',
    color: '#111827',
    fontWeight: 600,
    cursor: 'pointer'
  },
  dangerButton: {
    border: '1px solid #fecaca',
    borderRadius: '10px',
    padding: '10px 14px',
    background: '#fef2f2',
    color: '#b91c1c',
    fontWeight: 600,
    cursor: 'pointer'
  },
  toolbarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  searchInput: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontSize: '14px',
    background: '#ffffff'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1160px'
  },
  packageTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '860px'
  },
  th: {
    textAlign: 'left',
    padding: '14px',
    background: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#6b7280'
  },
  td: {
    padding: '14px',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '14px',
    verticalAlign: 'top'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
    wordBreak: 'break-all'
  },
  barcodeValue: {
    fontFamily: 'monospace',
    fontSize: '13px',
    wordBreak: 'break-all'
  },
  badgeVersion: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: 700,
    fontSize: '12px'
  },
  defaultBadge: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#f0fdf4',
    color: '#166534',
    fontWeight: 700,
    fontSize: '12px'
  },
  actionGroup: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  errorBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c'
  },
  warningBox: {
    marginBottom: '16px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#fff7ed',
    border: '1px solid #fdba74',
    color: '#9a3412'
  },
  successBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534'
  }
};