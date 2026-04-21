import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { SupplierItem } from '../types/inventory';

type SupplierFormState = {
  name: string;
  contact_info: string;
};

function emptyForm(): SupplierFormState {
  return {
    name: '',
    contact_info: ''
  };
}

async function fetchSuppliers(search: string): Promise<SupplierItem[]> {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set('search', search.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<SupplierItem[]>(`/suppliers${suffix}`);
}

async function createSupplier(input: SupplierFormState): Promise<SupplierItem> {
  return apiRequest<SupplierItem>('/suppliers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      contact_info: input.contact_info.trim() || null
    })
  });
}

async function updateSupplier(input: { id: string; values: SupplierFormState }): Promise<SupplierItem> {
  return apiRequest<SupplierItem>(`/suppliers/${input.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: input.values.name.trim(),
      contact_info: input.values.contact_info.trim() || null
    })
  });
}

async function deleteSupplier(id: string): Promise<void> {
  await apiRequest<void>(`/suppliers/${id}`, {
    method: 'DELETE'
  });
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good';
}) {
  const valueStyle = props.tone === 'good' ? styles.statValueGood : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={valueStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function SuppliersPage() {
  /*
    WHAT CHANGED
    ------------
    This file now follows the same clarified workflow pattern as the newer pages
    in the project and keeps supplier master-data management mobile-safe.

    WHY IT CHANGED
    --------------
    Suppliers are a core procurement entity already supported by your backend.
    The page needed the same structure, clarity, and action layout now used by
    Users, Stock, Insights, and the improved mobile shell.

    WHAT PROBLEM IT SOLVES
    ----------------------
    This makes supplier management feel intentional instead of ad hoc:
    - clearer workflow purpose
    - cleaner filters and action areas
    - safer mobile layout
    - consistent CRUD surface based on the current backend routes
  */

  const queryClient = useQueryClient();
  const { role, canManageSuppliers } = getRoleCapabilities();

  const [search, setSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [form, setForm] = useState<SupplierFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => fetchSuppliers(search)
  });

  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: async () => {
      setEditingSupplier(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Supplier created successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers-available'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Failed to create supplier.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateSupplier,
    onSuccess: async () => {
      setEditingSupplier(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Supplier updated successfully.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers-available'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Failed to update supplier.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: async () => {
      setFormError(null);
      setFormMessage('Supplier deleted successfully.');
      setEditingSupplier(null);
      setForm(emptyForm());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers-available'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      ]);
    },
    onError: (error) => {
      setFormMessage(null);
      setFormError(error instanceof ApiError ? error.message : 'Failed to delete supplier.');
    }
  });

  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);

  const summary = useMemo(() => {
    const active = suppliers.filter((supplier) => !supplier.deleted_at).length;
    const withContact = suppliers.filter((supplier) => Boolean(supplier.contact_info && supplier.contact_info.trim())).length;

    return {
      total: suppliers.length,
      active,
      withContact
    };
  }, [suppliers]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!canManageSuppliers) {
      setFormError(
        'Your current role is read-only for supplier master data. Supplier writes are restricted to manager and admin roles by the existing backend.'
      );
      return;
    }

    if (!form.name.trim()) {
      setFormError('Supplier name is required.');
      return;
    }

    if (editingSupplier) {
      updateMutation.mutate({
        id: editingSupplier.id,
        values: form
      });
      return;
    }

    createMutation.mutate(form);
  };

  const handleStartEdit = (supplier: SupplierItem) => {
    if (!canManageSuppliers) {
      setFormError('Your current role cannot edit suppliers.');
      setFormMessage(null);
      return;
    }

    setEditingSupplier(supplier);
    setFormMessage(null);
    setFormError(null);
    setForm({
      name: supplier.name,
      contact_info: supplier.contact_info || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingSupplier(null);
    setForm(emptyForm());
    setFormMessage(null);
    setFormError(null);
  };

  const handleDelete = (supplier: SupplierItem) => {
    if (!canManageSuppliers) {
      setFormError('Your current role cannot delete suppliers.');
      setFormMessage(null);
      return;
    }

    const confirmed = window.confirm(`Delete supplier "${supplier.name}"?`);
    if (!confirmed) {
      return;
    }

    setFormError(null);
    setFormMessage(null);
    deleteMutation.mutate(supplier.id);
  };

  if (suppliersQuery.isLoading) {
    return <p>Loading suppliers...</p>;
  }

  if (suppliersQuery.isError) {
    return <p>Failed to load suppliers: {(suppliersQuery.error as Error).message}</p>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Suppliers</h1>
          <p style={styles.description}>
            Manage supplier master data used by products, shipments, procurement reporting, and inbound operations.
          </p>
        </div>
      </header>

      <section style={styles.workflowPanel}>
        <h2 style={styles.workflowTitle}>Workflow clarity</h2>
        <p style={styles.workflowText}>
          Keep supplier records accurate so products, shipments, and procurement reporting stay connected and trustworthy.
        </p>
        <div style={styles.stepGrid}>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>1</div>
            <div style={styles.stepHeading}>Create supplier</div>
            <div style={styles.stepText}>Add the supplier name and any contact details operators may need later.</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>2</div>
            <div style={styles.stepHeading}>Link to products</div>
            <div style={styles.stepText}>Attach suppliers to products so procurement and shipment workflows align.</div>
          </div>
          <div style={styles.stepCard}>
            <div style={styles.stepNumber}>3</div>
            <div style={styles.stepHeading}>Use in shipments</div>
            <div style={styles.stepText}>Suppliers then flow into inbound receiving and reporting surfaces automatically.</div>
          </div>
        </div>
      </section>

      <div style={styles.statsGrid}>
        <StatCard title="Suppliers" value={summary.total} subtitle="Visible supplier records" />
        <StatCard title="Active" value={summary.active} subtitle="Currently active supplier records" tone="good" />
        <StatCard title="With Contact Info" value={summary.withContact} subtitle="Suppliers with saved contact details" />
      </div>

      {!canManageSuppliers ? (
        <div style={styles.warningBox}>
          Current role: {role.toUpperCase()}. Suppliers are read-only in the frontend because your backend only allows manager and admin users to create, edit, or delete suppliers.
        </div>
      ) : null}

      <div style={styles.layoutGrid}>
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>{editingSupplier ? 'Edit Supplier' : 'Create Supplier'}</h2>
          <p style={styles.panelSubtitle}>
            Maintain supplier records used throughout purchasing, receiving, and reporting.
          </p>

          {formError ? <div style={styles.errorBox}>{formError}</div> : null}
          {formMessage ? <div style={styles.successBox}>{formMessage}</div> : null}

          <form onSubmit={handleSubmit} style={styles.formGrid}>
            <div>
              <label style={styles.label}>Supplier Name</label>
              <input
                style={styles.input}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Northwind Supply Co"
              />
            </div>

            <div>
              <label style={styles.label}>Contact Info</label>
              <textarea
                style={styles.textarea}
                value={form.contact_info}
                onChange={(event) => setForm((current) => ({ ...current, contact_info: event.target.value }))}
                placeholder="Email, phone, notes"
              />
            </div>

            <div style={styles.actionsRow}>
              <button type="submit" style={styles.primaryButton} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Create Supplier'}
              </button>

              {editingSupplier ? (
                <button type="button" style={styles.secondaryButton} onClick={handleCancelEdit}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Supplier List</h2>
          <p style={styles.panelSubtitle}>
            Search current supplier records before editing master data.
          </p>

          <div style={styles.filterGrid}>
            <input
              style={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search suppliers"
            />
          </div>

          {suppliers.length === 0 ? (
            <div style={styles.emptyState}>
              <strong>No suppliers found.</strong>
              <span>Create the first supplier or adjust the search term to continue.</span>
            </div>
          ) : (
            <div style={styles.cardList}>
              {suppliers.map((supplier) => (
                <article key={supplier.id} style={styles.recordCard}>
                  <div style={styles.cardTopRow}>
                    <div>
                      <h3 style={styles.recordTitle}>{supplier.name}</h3>
                      <div style={styles.recordMeta}>
                        {supplier.deleted_at ? 'Soft deleted' : 'Active supplier'}
                      </div>
                    </div>
                    <span style={supplier.deleted_at ? styles.badgeWarn : styles.badgeGood}>
                      {supplier.deleted_at ? 'Deleted' : 'Active'}
                    </span>
                  </div>

                  <div style={styles.recordGrid}>
                    <div>
                      <div style={styles.metaLabel}>Contact Info</div>
                      <div style={styles.metaValue}>{supplier.contact_info || 'No contact details saved'}</div>
                    </div>
                  </div>

                  <div style={styles.cardActions}>
                    <button type="button" style={styles.secondaryButton} onClick={() => handleStartEdit(supplier)}>
                      Edit
                    </button>
                    {canManageSuppliers ? (
                      <button
                        type="button"
                        style={styles.dangerButton}
                        onClick={() => handleDelete(supplier)}
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
  page: { display: 'grid', gap: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: '1.9rem', color: '#0f172a' },
  description: { margin: '6px 0 0', color: '#475569', maxWidth: 760, lineHeight: 1.5 },
  workflowPanel: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 },
  workflowTitle: { margin: 0, fontSize: '1.05rem', color: '#0f172a' },
  workflowText: { margin: '6px 0 0', color: '#475569', lineHeight: 1.5 },
  stepGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 14 },
  stepCard: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14 },
  stepNumber: { width: 28, height: 28, borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', display: 'grid', placeItems: 'center', fontWeight: 700, marginBottom: 10 },
  stepHeading: { fontWeight: 700, color: '#0f172a', marginBottom: 6 },
  stepText: { color: '#475569', lineHeight: 1.45, fontSize: '0.95rem' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 },
  statCard: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 },
  statTitle: { fontSize: '0.85rem', color: '#64748b', marginBottom: 8 },
  statValue: { fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' },
  statValueGood: { fontSize: '1.6rem', fontWeight: 800, color: '#166534' },
  statSubtitle: { marginTop: 6, color: '#64748b', lineHeight: 1.4, fontSize: '0.92rem' },
  warningBox: { background: '#fff7ed', color: '#9a3412', border: '1px solid #fdba74', borderRadius: 14, padding: 14, lineHeight: 1.5 },
  layoutGrid: { display: 'grid', gridTemplateColumns: 'minmax(280px, 420px) minmax(0, 1fr)', gap: 16 },
  panel: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, minWidth: 0 },
  panelTitle: { margin: 0, fontSize: '1.1rem', color: '#0f172a' },
  panelSubtitle: { margin: '6px 0 0', color: '#64748b', lineHeight: 1.5 },
  errorBox: { marginTop: 12, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 12, padding: 12 },
  successBox: { marginTop: 12, background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 12, padding: 12 },
  formGrid: { display: 'grid', gap: 12, marginTop: 14 },
  filterGrid: { display: 'grid', gap: 12, marginTop: 14 },
  label: { display: 'block', marginBottom: 6, color: '#334155', fontWeight: 600, fontSize: '0.95rem' },
  input: { width: '100%', padding: '0.8rem 0.9rem', borderRadius: 12, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box' },
  textarea: { width: '100%', minHeight: 100, padding: '0.8rem 0.9rem', borderRadius: 12, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', boxSizing: 'border-box', resize: 'vertical', font: 'inherit' },
  actionsRow: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  primaryButton: { border: 'none', borderRadius: 12, background: '#2563eb', color: '#ffffff', padding: '0.8rem 1rem', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { border: '1px solid #cbd5e1', borderRadius: 12, background: '#ffffff', color: '#0f172a', padding: '0.8rem 1rem', fontWeight: 600, cursor: 'pointer' },
  dangerButton: { border: '1px solid #fecaca', borderRadius: 12, background: '#fef2f2', color: '#b91c1c', padding: '0.8rem 1rem', fontWeight: 600, cursor: 'pointer' },
  emptyState: { marginTop: 14, background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 14, padding: 18, display: 'grid', gap: 6, color: '#475569' },
  cardList: { display: 'grid', gap: 12, marginTop: 14 },
  recordCard: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#ffffff' },
  cardTopRow: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' },
  recordTitle: { margin: 0, fontSize: '1rem', color: '#0f172a' },
  recordMeta: { marginTop: 4, color: '#64748b', lineHeight: 1.4 },
  badgeGood: { padding: '0.35rem 0.6rem', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: '0.8rem', fontWeight: 700 },
  badgeWarn: { padding: '0.35rem 0.6rem', borderRadius: 999, background: '#fef3c7', color: '#92400e', fontSize: '0.8rem', fontWeight: 700 },
  recordGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 14 },
  metaLabel: { color: '#64748b', fontSize: '0.82rem', marginBottom: 4 },
  metaValue: { color: '#0f172a', fontWeight: 600, wordBreak: 'break-word', lineHeight: 1.5 },
  cardActions: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }
};
