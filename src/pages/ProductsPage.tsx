import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { ProductItem, SupplierItem } from '../types/inventory';

type ProductFormState = {
  name: string;
  category: string;
  unit: string;
  min_stock: string;
  supplier_id: string;
};

function emptyForm(): ProductFormState {
  return {
    name: '',
    category: '',
    unit: '',
    min_stock: '0',
    supplier_id: ''
  };
}

async function fetchProducts(filters: { search: string; category: string; supplierId: string }): Promise<ProductItem[]> {
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

async function createProduct(values: ProductFormState): Promise<ProductItem> {
  return apiRequest<ProductItem>('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: values.name.trim(),
      category: values.category.trim() || null,
      unit: values.unit.trim(),
      min_stock: Number(values.min_stock),
      supplier_id: values.supplier_id || null
    })
  });
}

async function updateProduct(input: { product: ProductItem; values: ProductFormState }): Promise<ProductItem> {
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
      supplier_id: input.values.supplier_id || null
    })
  });
}

async function deleteProduct(product: ProductItem): Promise<void> {
  await apiRequest<void>(`/products/${product.id}`, {
    method: 'DELETE',
    headers: {
      'If-Match-Version': String(product.version)
    }
  });
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const valueStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function ProductsPage() {
  /*
    WHAT CHANGED
    ------------
    The current zip snapshot had a ProductsPage that no longer represented
    product master data cleanly. This file now restores Products to a proper
    product-management surface based on the existing backend product routes.

    WHY IT CHANGED
    --------------
    Your backend already exposes production-grade product CRUD with search,
    category filtering, supplier linkage, and optimistic concurrency. The
    frontend should surface that directly instead of showing unrelated stock
    workflow content.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This gives the app a consistent, mobile-safe product master-data page that:
    - reads products from /products
    - creates products through /products
    - updates products with If-Match-Version protection
    - deletes products with If-Match-Version protection
    - aligns visually with the newer workflow clarity pages
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

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Product created successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Failed to create product.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateProduct,
    onSuccess: async () => {
      setEditingProduct(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Product updated successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Failed to update product.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      setFormError(null);
      setFormMessage('Product deleted successfully.');
      setEditingProduct(null);
      setForm(emptyForm());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Failed to delete product.');
    }
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((product) => (product.category || '').trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const summary = useMemo(() => {
    const linkedSupplierCount = products.filter((product) => Boolean(product.supplier_id)).length;
    const lowThresholdProducts = products.filter((product) => Number(product.min_stock) > 0).length;

    return {
      total: products.length,
      linkedSupplierCount,
      lowThresholdProducts
    };
  }, [products]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

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

    const minStock = Number(form.min_stock);
    if (!Number.isFinite(minStock)) {
      setFormError('Minimum stock must be a valid number.');
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ product: editingProduct, values: form });
      return;
    }

    createMutation.mutate(form);
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

  if (productsQuery.isLoading) {
    return <p>Loading products...</p>;
  }

  if (productsQuery.isError) {
    return <p>Failed to load products: {(productsQuery.error as Error).message}</p>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Products</h1>
          <p style={styles.description}>
            Maintain core product master data used by stock, shipments, receiving, reports, and alerts.
          </p>
        </div>
      </header>

      <section style={styles.workflowPanel}>
        <h2 style={styles.workflowTitle}>Workflow clarity</h2>
        <p style={styles.workflowText}>
          Create and maintain clean product master data first, then connect products to suppliers and operational stock flows.
        </p>
        <div style={styles.stepGrid}>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepHeading}>Create product</div>
            <div style={styles.stepText}>Define the product name, unit, and minimum stock threshold.</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepHeading}>Assign supplier</div>
            <div style={styles.stepText}>Link a supplier so procurement and shipment workflows stay connected.</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepHeading}>Use in operations</div>
            <div style={styles.stepText}>Products then become available across shipments, stock, alerts, and reporting.</div>
          </div>
        </div>
      </section>

      <div style={styles.statsGrid}>
        <StatCard title="Products" value={summary.total} subtitle="Visible product records" />
        <StatCard
          title="Supplier Linked"
          value={summary.linkedSupplierCount}
          subtitle="Products already connected to suppliers"
          tone="good"
        />
        <StatCard
          title="Min Stock Set"
          value={summary.lowThresholdProducts}
          subtitle="Products with an active reorder threshold"
        />
      </div>

      {!canManageProducts ? (
        <div style={styles.warningBox}>
          Current role: {role.toUpperCase()}. Products are read-only in the frontend because your backend restricts product writes to manager and admin roles.
        </div>
      ) : null}

      <div style={styles.layoutGrid}>
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>{editingProduct ? 'Edit Product' : 'Create Product'}</h2>
          <p style={styles.panelSubtitle}>
            Keep product master data clean and operationally meaningful so shipments, stock, and reporting remain accurate.
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
                placeholder="Coffee Beans Premium"
              />
            </div>

            <div>
              <label style={styles.label}>Category</label>
              <input
                style={styles.input}
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="Beverages"
              />
            </div>

            <div>
              <label style={styles.label}>Unit</label>
              <input
                style={styles.input}
                value={form.unit}
                onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
                placeholder="kg"
              />
            </div>

            <div>
              <label style={styles.label}>Minimum Stock</label>
              <input
                style={styles.input}
                type="number"
                value={form.min_stock}
                onChange={(event) => setForm((current) => ({ ...current, min_stock: event.target.value }))}
                placeholder="0"
              />
            </div>

            <div style={styles.fullSpan}>
              <label style={styles.label}>Supplier</label>
              <select
                style={styles.input}
                value={form.supplier_id}
                onChange={(event) => setForm((current) => ({ ...current, supplier_id: event.target.value }))}
              >
                <option value="">No supplier assigned</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.actionsRow}>
              <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
              </button>

              {editingProduct ? (
                <button type="button" style={styles.secondaryButton} onClick={handleCancelEdit}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Product List</h2>
          <p style={styles.panelSubtitle}>
            Search and review current product records before editing master data.
          </p>

          <div style={styles.filterGrid}>
            <input
              style={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by product name"
            />
            <select
              style={styles.input}
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              style={styles.input}
              value={supplierFilter}
              onChange={(event) => setSupplierFilter(event.target.value)}
            >
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          {products.length === 0 ? (
            <div style={styles.emptyState}>
              <strong>No products found.</strong>
              <span>Create the first product or adjust filters to continue.</span>
            </div>
          ) : (
            <div style={styles.cardList}>
              {products.map((product) => (
                <article key={product.id} style={styles.recordCard}>
                  <div style={styles.cardTopRow}>
                    <div>
                      <h3 style={styles.recordTitle}>{product.name}</h3>
                      <div style={styles.recordMeta}>
                        {(product.category || 'Uncategorized') as string} · {product.unit}
                      </div>
                    </div>
                    <span style={styles.badge}>v{product.version}</span>
                  </div>

                  <div style={styles.recordGrid}>
                    <div>
                      <div style={styles.metaLabel}>Minimum stock</div>
                      <div style={styles.metaValue}>{String(product.min_stock)}</div>
                    </div>
                    <div>
                      <div style={styles.metaLabel}>Supplier</div>
                      <div style={styles.metaValue}>{product.supplier_name || 'Not linked'}</div>
                    </div>
                    <div>
                      <div style={styles.metaLabel}>Created</div>
                      <div style={styles.metaValue}>{new Date(product.created_at).toLocaleString()}</div>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    <button type="button" style={styles.secondaryButton} onClick={() => handleStartEdit(product)}>
                      Edit
                    </button>
                    {canManageProducts ? (
                      <button
                        type="button"
                        style={styles.dangerButton}
                        onClick={() => handleDelete(product)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'grid',
    gap: 16
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap'
  },
  title: {
    margin: 0,
    fontSize: '1.9rem',
    color: '#0f172a'
  },
  description: {
    margin: '6px 0 0',
    color: '#475569',
    maxWidth: 760,
    lineHeight: 1.5
  },
  workflowPanel: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16
  },
  workflowTitle: {
    margin: 0,
    fontSize: '1.05rem',
    color: '#0f172a'
  },
  workflowText: {
    margin: '6px 0 0',
    color: '#475569',
    lineHeight: 1.5
  },
  stepGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginTop: 14
  },
  stepCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 14
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 999,
    background: '#dbeafe',
    color: '#1d4ed8',
    display: 'grid',
    placeItems: 'center',
    fontWeight: 700,
    marginBottom: 10
  },
  stepHeading: {
    fontWeight: 700,
    color: '#0f172a',
    marginBottom: 6
  },
  stepText: {
    color: '#475569',
    lineHeight: 1.45,
    fontSize: '0.95rem'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12
  },
  statCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16
  },
  statTitle: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: 8
  },
  statValue: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#0f172a'
  },
  statValueGood: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#166534'
  },
  statValueWarn: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#b45309'
  },
  statSubtitle: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 1.4,
    fontSize: '0.92rem'
  },
  warningBox: {
    background: '#fff7ed',
    color: '#9a3412',
    border: '1px solid #fdba74',
    borderRadius: 14,
    padding: 14,
    lineHeight: 1.5
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 420px) minmax(0, 1fr)',
    gap: 16
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 16,
    minWidth: 0
  },
  panelTitle: {
    margin: 0,
    fontSize: '1.1rem',
    color: '#0f172a'
  },
  panelSubtitle: {
    margin: '6px 0 0',
    color: '#64748b',
    lineHeight: 1.5
  },
  errorBox: {
    marginTop: 12,
    background: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: 12
  },
  successBox: {
    marginTop: 12,
    background: '#ecfdf5',
    color: '#166534',
    border: '1px solid #bbf7d0',
    borderRadius: 12,
    padding: 12
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12,
    marginTop: 14
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginTop: 14
  },
  fullSpan: {
    gridColumn: '1 / -1'
  },
  label: {
    display: 'block',
    marginBottom: 6,
    color: '#334155',
    fontWeight: 600,
    fontSize: '0.95rem'
  },
  input: {
    width: '100%',
    padding: '0.8rem 0.9rem',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    boxSizing: 'border-box'
  },
  actionsRow: {
    gridColumn: '1 / -1',
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4
  },
  primaryButton: {
    border: 'none',
    borderRadius: 12,
    background: '#2563eb',
    color: '#ffffff',
    padding: '0.8rem 1rem',
    fontWeight: 700,
    cursor: 'pointer'
  },
  secondaryButton: {
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    background: '#ffffff',
    color: '#0f172a',
    padding: '0.8rem 1rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  dangerButton: {
    border: '1px solid #fecaca',
    borderRadius: 12,
    background: '#fef2f2',
    color: '#b91c1c',
    padding: '0.8rem 1rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
  emptyState: {
    marginTop: 14,
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: 14,
    padding: 18,
    display: 'grid',
    gap: 6,
    color: '#475569'
  },
  cardList: {
    display: 'grid',
    gap: 12,
    marginTop: 14
  },
  recordCard: {
    border: '1px solid #e2e8f0',
    borderRadius: 14,
    padding: 14,
    background: '#ffffff'
  },
  cardTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  recordTitle: {
    margin: 0,
    fontSize: '1rem',
    color: '#0f172a'
  },
  recordMeta: {
    marginTop: 4,
    color: '#64748b',
    lineHeight: 1.4
  },
  badge: {
    padding: '0.35rem 0.6rem',
    borderRadius: 999,
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '0.8rem',
    fontWeight: 700
  },
  recordGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 12,
    marginTop: 14
  },
  metaLabel: {
    color: '#64748b',
    fontSize: '0.82rem',
    marginBottom: 4
  },
  metaValue: {
    color: '#0f172a',
    fontWeight: 600,
    wordBreak: 'break-word'
  },
  cardActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 14
  }
};
