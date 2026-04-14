import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
import type { ProductItem, SupplierItem } from '../types/inventory';

type ProductFormState = {
  name: string;
  category: string;
  unit: string;
  min_stock: string;
  supplier_id: string;
};

async function fetchProducts(search: string): Promise<ProductItem[]> {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set('search', search.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<ProductItem[]>(`/products${suffix}`);
}

async function fetchSuppliersForSelect(): Promise<SupplierItem[]> {
  return apiRequest<SupplierItem[]>('/suppliers/available');
}

async function createProduct(input: ProductFormState): Promise<ProductItem> {
  return apiRequest<ProductItem>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      category: input.category.trim() || null,
      unit: input.unit.trim(),
      min_stock: input.min_stock.trim() === '' ? 0 : Number(input.min_stock),
      supplier_id: input.supplier_id || null
    })
  });
}

async function updateProduct(input: {
  id: string;
  version: number;
  values: ProductFormState;
}): Promise<ProductItem> {
  return apiRequest<ProductItem>(`/products/${input.id}`, {
    method: 'PATCH',
    headers: {
      'If-Match-Version': String(input.version)
    },
    body: JSON.stringify({
      name: input.values.name.trim(),
      category: input.values.category.trim() || null,
      unit: input.values.unit.trim(),
      min_stock: input.values.min_stock.trim() === '' ? 0 : Number(input.values.min_stock),
      supplier_id: input.values.supplier_id || null
    })
  });
}

async function deleteProduct(input: { id: string; version: number }): Promise<void> {
  await apiRequest(`/products/${input.id}`, {
    method: 'DELETE',
    headers: {
      'If-Match-Version': String(input.version)
    }
  });
}

function emptyForm(): ProductFormState {
  return {
    name: '',
    category: '',
    unit: '',
    min_stock: '0',
    supplier_id: ''
  };
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
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const productsQuery = useQuery({
    queryKey: ['products', search],
    queryFn: () => fetchProducts(search)
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers-available'],
    queryFn: fetchSuppliersForSelect
  });

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      setForm(emptyForm());
      setEditingProduct(null);
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
      setForm(emptyForm());
      setEditingProduct(null);
      setFormError(null);
      setFormMessage('Product updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
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
      setFormError(null);
      setFormMessage('Product deleted successfully.');
      if (editingProduct) {
        setEditingProduct(null);
        setForm(emptyForm());
      }
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

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const summary = useMemo(() => {
    const withSupplier = products.filter((product) => Boolean(product.supplier_id)).length;
    const categories = new Set(
      products
        .map((product) => product.category)
        .filter((value): value is string => Boolean(value && value.trim()))
    ).size;
    const lowConfigured = products.filter((product) => Number(product.min_stock) > 0).length;

    return {
      total: products.length,
      withSupplier,
      categories,
      lowConfigured
    };
  }, [products]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (editingProduct) {
      updateMutation.mutate({
        id: editingProduct.id,
        version: editingProduct.version,
        values: form
      });
      return;
    }

    createMutation.mutate(form);
  };

  const handleStartEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setFormMessage(null);
    setFormError(null);
    setForm({
      name: product.name,
      category: product.category || '',
      unit: product.unit,
      min_stock: String(product.min_stock),
      supplier_id: product.supplier_id || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setForm(emptyForm());
    setFormMessage(null);
    setFormError(null);
  };

  const handleDelete = (product: ProductItem) => {
    const confirmed = window.confirm(`Delete product "${product.name}"?`);
    if (!confirmed) {
      return;
    }

    setFormError(null);
    setFormMessage(null);

    deleteMutation.mutate({
      id: product.id,
      version: product.version
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div style={styles.statsGrid}>
        <StatCard
          title="Products"
          value={summary.total}
          subtitle="Visible products"
        />
        <StatCard
          title="With Supplier"
          value={summary.withSupplier}
          subtitle="Linked to a supplier"
          tone="good"
        />
        <StatCard
          title="Categories"
          value={summary.categories}
          subtitle="Distinct visible categories"
        />
        <StatCard
          title="Min Stock Set"
          value={summary.lowConfigured}
          subtitle="Products with configured minimums"
          tone={summary.lowConfigured > 0 ? 'good' : 'warn'}
        />
      </div>

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>{editingProduct ? 'Edit Product' : 'Create Product'}</h3>
        <p style={styles.panelSubtitle}>
          Maintain product master data used across stock, alerts, and shipment workflows.
        </p>

        {formError ? <div style={styles.errorBox}>{formError}</div> : null}
        {formMessage ? <div style={styles.successBox}>{formMessage}</div> : null}

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <div>
            <label style={styles.label}>Name</label>
            <input
              style={styles.input}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Example: Mineral Water 1L"
              required
            />
          </div>

          <div>
            <label style={styles.label}>Category</label>
            <input
              style={styles.input}
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="Example: Beverage"
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
              min="0"
              step="1"
              value={form.min_stock}
              onChange={(event) => setForm((current) => ({ ...current, min_stock: event.target.value }))}
            />
          </div>

          <div>
            <label style={styles.label}>Supplier</label>
            <select
              style={styles.input}
              value={form.supplier_id}
              onChange={(event) => setForm((current) => ({ ...current, supplier_id: event.target.value }))}
            >
              <option value="">No supplier</option>
              {(suppliersQuery.data ?? []).map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formActions}>
            <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>
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

      <section style={styles.panel}>
        <h3 style={styles.panelTitle}>Product List</h3>
        <p style={styles.panelSubtitle}>
          Search and review product master data for this tenant.
        </p>

        <div style={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by name, category, or unit..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={styles.searchInput}
          />
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
                  <th style={styles.th}>Minimum Stock</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Version</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={7}>
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
                      <td style={styles.td}>{product.supplier_name || '-'}</td>
                      <td style={styles.td}>{product.version}</td>
                      <td style={styles.td}>
                        <div style={styles.actionGroup}>
                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() => handleStartEdit(product)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            style={styles.dangerButton}
                            onClick={() => handleDelete(product)}
                            disabled={deleteMutation.isPending}
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
  toolbar: {
    marginBottom: '16px'
  },
  searchInput: {
    width: '100%',
    maxWidth: '420px',
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
    minWidth: '940px'
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
  successBox: {
    marginBottom: '14px',
    padding: '12px 14px',
    borderRadius: '10px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534'
  }
};