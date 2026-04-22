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

async function updateSupplier(input: {
  id: string;
  values: SupplierFormState;
}): Promise<SupplierItem> {
  return apiRequest<SupplierItem>(`/suppliers/${input.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: input.values.name.trim(),
      contact_info: input.values.contact_info.trim() || null
    })
  });
}

async function deleteSupplier(id: string): Promise<void> {
  await apiRequest(`/suppliers/${id}`, {
    method: 'DELETE'
  });
}

function emptyForm(): SupplierFormState {
  return {
    name: '',
    contact_info: ''
  };
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good';
}) {
  const toneStyle = props.tone === 'good' ? styles.statValueGood : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={toneStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

export default function SuppliersPage() {
  /*
    WHAT CHANGED
    ------------
    This file stays grounded in the SuppliersPage you sent.

    Existing real behavior is preserved:
    - same endpoint usage
    - same query key
    - same create / update / delete flow
    - same permission enforcement
    - same form fields
    - same search behavior
    - same invalidation flow

    This pass applies the shared UI foundation carefully:
    - stats now align with the shared app-grid-stats layer
    - major sections now use app-panel/app-panel--padded
    - warning / error / success states align with the shared state layer
    - toolbar and action rows align with the shared helper classes
    - no CRUD logic was changed

    WHAT PROBLEM IT SOLVES
    ----------------------
    Makes Suppliers visually consistent with Products, Storage Locations, Users,
    and the rest of the polished master-data/admin pages without changing
    backend contracts, permissions, or data flow.
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
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      await queryClient.invalidateQueries({ queryKey: ['suppliers-available'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to create supplier.');
      }
      setFormMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateSupplier,
    onSuccess: async () => {
      setEditingSupplier(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Supplier updated successfully.');
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      await queryClient.invalidateQueries({ queryKey: ['suppliers-available'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to update supplier.');
      }
      setFormMessage(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: async () => {
      setFormError(null);
      setFormMessage('Supplier deleted successfully.');
      if (editingSupplier) {
        setEditingSupplier(null);
        setForm(emptyForm());
      }
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      await queryClient.invalidateQueries({ queryKey: ['suppliers-available'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError('Failed to delete supplier.');
      }
      setFormMessage(null);
    }
  });

  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);

  const summary = useMemo(() => {
    const active = suppliers.filter((supplier) => !supplier.deleted_at).length;
    const withContact = suppliers.filter(
      (supplier) => Boolean(supplier.contact_info && supplier.contact_info.trim())
    ).length;

    return {
      total: suppliers.length,
      active,
      withContact
    };
  }, [suppliers]);

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

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div style={styles.page}>
      <div className="app-grid-stats" style={styles.statsGrid}>
        <StatCard
          title="Suppliers"
          value={summary.total}
          subtitle="Visible suppliers"
        />
        <StatCard
          title="Active"
          value={summary.active}
          subtitle="Currently active supplier records"
          tone="good"
        />
        <StatCard
          title="With Contact Info"
          value={summary.withContact}
          subtitle="Suppliers with saved contact details"
        />
      </div>

      {!canManageSuppliers ? (
        <div className="app-warning-state" style={styles.warningBox}>
          Current role: {role.toUpperCase()}. Suppliers are read-only in the frontend because your backend only allows manager and admin users to create, edit, or delete suppliers.
        </div>
      ) : null}

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <h3 style={styles.panelTitle}>{editingSupplier ? 'Edit Supplier' : 'Create Supplier'}</h3>
        <p style={styles.panelSubtitle}>
          {(canManageSuppliers
            ? 'Maintain supplier master records used across purchasing and inbound operations.'
            : 'This form stays visible for context, but supplier writes are blocked for your current role.') as string}
        </p>

        {formError ? <div className="app-error-state" style={styles.errorBox}>{formError}</div> : null}
        {formMessage ? <div className="app-success-state" style={styles.successBox}>{formMessage}</div> : null}

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <div>
            <label style={styles.label}>Supplier Name</label>
            <input
              style={styles.input}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Example: Metro Wholesale"
              required
            />
          </div>

          <div>
            <label style={styles.label}>Contact Info</label>
            <input
              style={styles.input}
              value={form.contact_info}
              onChange={(event) =>
                setForm((current) => ({ ...current, contact_info: event.target.value }))
              }
              placeholder="Phone, email, or notes"
            />
          </div>

          <div className="app-actions" style={styles.formActions}>
            <button
              type="submit"
              style={styles.primaryButton}
              disabled={isSubmitting || !canManageSuppliers}
            >
              {isSubmitting
                ? editingSupplier
                  ? 'Updating...'
                  : 'Creating...'
                : editingSupplier
                  ? 'Update Supplier'
                  : 'Create Supplier'}
            </button>

            {editingSupplier ? (
              <button type="button" style={styles.secondaryButton} onClick={handleCancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <h3 style={styles.panelTitle}>Supplier List</h3>
        <p style={styles.panelSubtitle}>
          Search and review supplier records available to inventory and shipment workflows.
        </p>

        <div className="app-grid-toolbar" style={styles.toolbarGrid}>
          <input
            type="text"
            placeholder="Search by supplier name or contact info..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={styles.searchInput}
          />
        </div>

        {suppliersQuery.isLoading ? <p>Loading suppliers...</p> : null}

        {suppliersQuery.isError ? (
          <p>Failed to load suppliers: {(suppliersQuery.error as Error).message || 'Unknown error'}</p>
        ) : null}

        {!suppliersQuery.isLoading && !suppliersQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Contact Info</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={4}>
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{supplier.name}</div>
                        <div style={styles.rowSubtle}>Supplier ID: {supplier.id}</div>
                      </td>
                      <td style={styles.td}>{supplier.contact_info || '-'}</td>
                      <td style={styles.td}>
                        <span style={supplier.deleted_at ? styles.badgeDeleted : styles.badgeActive}>
                          {supplier.deleted_at ? 'Deleted' : 'Active'}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div className="app-actions" style={styles.actionGroup}>
                          <button
                            type="button"
                            style={!canManageSuppliers ? styles.disabledButton : styles.secondaryButton}
                            onClick={() => handleStartEdit(supplier)}
                            disabled={!canManageSuppliers}
                            title={!canManageSuppliers ? 'Manager or admin role required' : undefined}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            style={!canManageSuppliers ? styles.disabledButton : styles.dangerButton}
                            onClick={() => handleDelete(supplier)}
                            disabled={deleteMutation.isPending || !canManageSuppliers}
                            title={!canManageSuppliers ? 'Manager or admin role required' : undefined}
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
  page: {
    width: '100%',
    minWidth: 0
  },
  statsGrid: {
    marginBottom: '20px',
    minWidth: 0
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
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  statValueGood: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#166534',
    wordBreak: 'break-word'
  },
  statSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.4
  },
  panel: {
    marginBottom: '20px',
    minWidth: 0,
    overflow: 'hidden'
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: '8px',
    fontSize: '20px',
    fontWeight: 700,
    wordBreak: 'break-word'
  },
  panelSubtitle: {
    marginTop: 0,
    marginBottom: '16px',
    color: '#6b7280',
    lineHeight: 1.5,
    wordBreak: 'break-word'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
    alignItems: 'end',
    minWidth: 0
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 600
  },
  input: {
    width: '100%',
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box'
  },
  formActions: {
    minWidth: 0
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
    /*
      What changed:
      - Replaced the single-row toolbar wrapper with the same grid-style toolbar pattern used across the newer master-data pages.

      Why:
      - Suppliers should visually align with Products and Storage Locations.

      What problem this solves:
      - Makes the search area scale more cleanly inside the shared layout container and keeps future filter expansion straightforward.
    */
    marginBottom: '16px',
    minWidth: 0
  },
  searchInput: {
    /*
      What changed:
      - Removed the hard width cap while keeping the same control styling.

      Why:
      - The page already sits inside a centered shared content container, so the extra cap is no longer helpful.

      What problem this solves:
      - Prevents the search control from looking artificially narrow relative to the other master-data pages.
    */
    width: '100%',
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontSize: '14px',
    background: '#ffffff',
    boxSizing: 'border-box'
  },
  tableWrapper: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    overflow: 'hidden',
    overflowX: 'auto',
    minWidth: 0
  },
  table: {
    /*
      What changed:
      - Slightly reduced the forced minimum width.

      Why:
      - This table can tolerate a bit more flexibility before horizontal scrolling becomes necessary.

      What problem this solves:
      - Eases width pressure on medium screens without changing the actual column structure.
    */
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '780px'
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
    verticalAlign: 'top',
    wordBreak: 'break-word'
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280'
  },
  rowTitle: {
    fontWeight: 700,
    marginBottom: '6px',
    wordBreak: 'break-word'
  },
  rowSubtle: {
    fontSize: '12px',
    color: '#6b7280',
    lineHeight: 1.4,
    wordBreak: 'break-all'
  },
  badgeActive: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#f0fdf4',
    color: '#166534',
    fontWeight: 700,
    fontSize: '12px'
  },
  badgeDeleted: {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: '999px',
    background: '#fee2e2',
    color: '#991b1b',
    fontWeight: 700,
    fontSize: '12px'
  },
  actionGroup: {
    minWidth: 0
  },
  errorBox: {
    marginBottom: '14px'
  },
  warningBox: {
    marginBottom: '16px'
  },
  successBox: {
    marginBottom: '14px'
  }
};