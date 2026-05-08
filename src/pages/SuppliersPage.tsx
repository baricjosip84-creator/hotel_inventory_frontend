import { useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../lib/api';
import { getRoleCapabilities } from '../lib/permissions';
import type { SupplierItem } from '../types/inventory';

type SupplierFormState = {
  name: string;
  email: string;
  contact_info: string;
};

type SupplierSlaBreachesResponse = {
  rows?: SupplierSlaBreachItem[];
  total?: number;
  notes?: string[];
};

type SupplierSlaBreachItem = {
  supplier_id?: string;
  supplier_name?: string;
  shipment_id?: string;
  shipment_number?: string;
  status?: string;
  expected_delivery_date?: string | null;
  received_date?: string | null;
  days_late?: number | string | null;
  breach_type?: string;
  severity?: string;
  [key: string]: unknown;
};

type SupplierPerformanceResponse = {
  supplier?: SupplierItem;
  supplier_id?: string;
  supplier_name?: string;
  summary?: Record<string, unknown>;
  totals?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  recent_shipments?: unknown[];
  notes?: string[];
  [key: string]: unknown;
};

async function fetchSuppliers(search: string): Promise<SupplierItem[]> {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set('search', search.trim());
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<SupplierItem[]>(`/suppliers${suffix}`);
}

async function fetchSupplierSlaBreaches(): Promise<SupplierSlaBreachesResponse> {
  return apiRequest<SupplierSlaBreachesResponse>('/suppliers/sla-breaches');
}

async function fetchSupplierPerformance(supplierId: string): Promise<SupplierPerformanceResponse> {
  return apiRequest<SupplierPerformanceResponse>(`/suppliers/${supplierId}/performance`);
}

async function createSupplier(input: SupplierFormState): Promise<SupplierItem> {
  return apiRequest<SupplierItem>('/suppliers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim() || null,
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
      email: input.values.email.trim() || null,
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
    email: '',
    contact_info: ''
  };
}

function formatUnknown(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function normalizeBreaches(response: SupplierSlaBreachesResponse | undefined): SupplierSlaBreachItem[] {
  if (!response) return [];
  if (Array.isArray(response)) return response as SupplierSlaBreachItem[];
  if (Array.isArray(response.rows)) return response.rows;
  return [];
}

function getPerformanceTitle(performance: SupplierPerformanceResponse | undefined, fallback?: SupplierItem | null): string {
  if (!performance) return fallback?.name || 'Supplier Performance';

  if (typeof performance.supplier_name === 'string') return performance.supplier_name;
  if (performance.supplier?.name) return performance.supplier.name;

  return fallback?.name || 'Supplier Performance';
}

function StatCard(props: {
  title: string;
  value: number | string;
  subtitle: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneStyle =
    props.tone === 'good'
      ? styles.statValueGood
      : props.tone === 'warn'
        ? styles.statValueWarn
        : props.tone === 'bad'
          ? styles.statValueBad
          : styles.statValue;

  return (
    <div style={styles.statCard}>
      <div style={styles.statTitle}>{props.title}</div>
      <div style={toneStyle}>{props.value}</div>
      <div style={styles.statSubtitle}>{props.subtitle}</div>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre style={styles.jsonBlock}>{JSON.stringify(value ?? null, null, 2)}</pre>;
}

function KeyValue({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={styles.keyValue}>
      <span style={styles.keyLabel}>{label}</span>
      <span style={styles.keyText}>{formatUnknown(value)}</span>
    </div>
  );
}

export default function SuppliersPage() {
  const queryClient = useQueryClient();

  const { role, canManageSuppliers } = getRoleCapabilities();

  const [search, setSearch] = useState('');
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [selectedPerformanceSupplier, setSelectedPerformanceSupplier] = useState<SupplierItem | null>(null);
  const [form, setForm] = useState<SupplierFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => fetchSuppliers(search)
  });

  const slaBreachesQuery = useQuery({
    queryKey: ['supplier-sla-breaches'],
    queryFn: fetchSupplierSlaBreaches
  });

  const supplierPerformanceQuery = useQuery({
    queryKey: ['supplier-performance', selectedPerformanceSupplier?.id],
    queryFn: () => fetchSupplierPerformance(selectedPerformanceSupplier?.id || ''),
    enabled: Boolean(selectedPerformanceSupplier?.id)
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
      await queryClient.invalidateQueries({ queryKey: ['supplier-sla-breaches'] });
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
      await queryClient.invalidateQueries({ queryKey: ['supplier-sla-breaches'] });
      await queryClient.invalidateQueries({ queryKey: ['supplier-performance'] });
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
      setSelectedPerformanceSupplier(null);
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      await queryClient.invalidateQueries({ queryKey: ['suppliers-available'] });
      await queryClient.invalidateQueries({ queryKey: ['supplier-sla-breaches'] });
      await queryClient.invalidateQueries({ queryKey: ['supplier-performance'] });
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
  const slaBreaches = useMemo(() => normalizeBreaches(slaBreachesQuery.data), [slaBreachesQuery.data]);

  const summary = useMemo(() => {
    const active = suppliers.filter((supplier) => !supplier.deleted_at).length;
    const withEmail = suppliers.filter(
      (supplier) => Boolean(supplier.email && supplier.email.trim())
    ).length;
    const withContact = suppliers.filter(
      (supplier) => Boolean(supplier.contact_info && supplier.contact_info.trim())
    ).length;

    return {
      total: suppliers.length,
      active,
      withEmail,
      withContact,
      slaBreaches: slaBreaches.length
    };
  }, [suppliers, slaBreaches]);

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

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setFormError('Supplier email must be a valid email address.');
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
      email: supplier.email || '',
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
          title="With Email"
          value={summary.withEmail}
          subtitle="Suppliers ready for shipment email sending"
          tone="good"
        />
        <StatCard
          title="SLA Breaches"
          value={summary.slaBreaches}
          subtitle="Backend-reported supplier SLA exceptions"
          tone={summary.slaBreaches > 0 ? 'bad' : 'good'}
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
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="orders@supplier.com"
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
              placeholder="Phone, account rep, delivery notes"
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
        <h3 style={styles.panelTitle}>Supplier SLA Breaches</h3>
        <p style={styles.panelSubtitle}>
          This uses the existing backend `/suppliers/sla-breaches` endpoint that was previously not surfaced in the supplier frontend.
        </p>

        {slaBreachesQuery.isLoading ? <p>Loading supplier SLA breaches...</p> : null}

        {slaBreachesQuery.isError ? (
          <div className="app-error-state" style={styles.errorBox}>
            Failed to load supplier SLA breaches: {(slaBreachesQuery.error as Error).message || 'Unknown error'}
          </div>
        ) : null}

        {!slaBreachesQuery.isLoading && !slaBreachesQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Shipment</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Expected</th>
                  <th style={styles.th}>Received</th>
                  <th style={styles.th}>Days Late</th>
                  <th style={styles.th}>Severity</th>
                </tr>
              </thead>
              <tbody>
                {slaBreaches.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={7}>
                      No supplier SLA breaches returned by the backend.
                    </td>
                  </tr>
                ) : (
                  slaBreaches.map((breach, index) => (
                    <tr key={`${breach.supplier_id || 'supplier'}-${breach.shipment_id || index}`}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{formatUnknown(breach.supplier_name || breach.supplier_id)}</div>
                        <div style={styles.rowSubtle}>{formatUnknown(breach.breach_type)}</div>
                      </td>
                      <td style={styles.td}>
                        <div>{formatUnknown(breach.shipment_number || breach.shipment_id)}</div>
                      </td>
                      <td style={styles.td}>{formatUnknown(breach.status)}</td>
                      <td style={styles.td}>{formatDateTime(breach.expected_delivery_date)}</td>
                      <td style={styles.td}>{formatDateTime(breach.received_date)}</td>
                      <td style={styles.td}>{formatUnknown(breach.days_late)}</td>
                      <td style={styles.td}>
                        <span style={styles.badgeDeleted}>{formatUnknown(breach.severity || 'breach')}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        {slaBreachesQuery.data?.notes?.map((note) => (
          <div key={note} style={styles.note}>{note}</div>
        ))}
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <h3 style={styles.panelTitle}>Supplier List</h3>
        <p style={styles.panelSubtitle}>
          Search and review supplier records available to inventory, shipment, supplier email, SLA, and performance workflows.
        </p>

        <div className="app-grid-toolbar" style={styles.toolbarGrid}>
          <input
            type="text"
            placeholder="Search by supplier name, email, or contact info..."
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
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Contact Info</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>
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
                      <td style={styles.td}>
                        {supplier.email ? (
                          <span style={styles.emailValue}>{supplier.email}</span>
                        ) : (
                          '-'
                        )}
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
                            style={styles.secondaryButton}
                            onClick={() => setSelectedPerformanceSupplier(supplier)}
                          >
                            Performance
                          </button>

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

      {selectedPerformanceSupplier ? (
        <section className="app-panel app-panel--padded" style={styles.panel}>
          <div style={styles.performanceHeader}>
            <div>
              <h3 style={styles.panelTitle}>
                Supplier Performance: {getPerformanceTitle(supplierPerformanceQuery.data, selectedPerformanceSupplier)}
              </h3>
              <p style={styles.panelSubtitle}>
                This uses the existing backend `/suppliers/:id/performance` endpoint that was previously not surfaced in the supplier frontend.
              </p>
            </div>
            <button type="button" style={styles.secondaryButton} onClick={() => setSelectedPerformanceSupplier(null)}>
              Close
            </button>
          </div>

          {supplierPerformanceQuery.isLoading ? <p>Loading supplier performance...</p> : null}

          {supplierPerformanceQuery.isError ? (
            <div className="app-error-state" style={styles.errorBox}>
              Failed to load supplier performance: {(supplierPerformanceQuery.error as Error).message || 'Unknown error'}
            </div>
          ) : null}

          {supplierPerformanceQuery.data ? (
            <div style={styles.performanceGrid}>
              {supplierPerformanceQuery.data.summary ? (
                <div style={styles.performanceCard}>
                  <h4 style={styles.cardTitle}>Summary</h4>
                  {Object.entries(supplierPerformanceQuery.data.summary).map(([key, value]) => (
                    <KeyValue key={key} label={key.replace(/_/g, ' ')} value={value} />
                  ))}
                </div>
              ) : null}

              {supplierPerformanceQuery.data.totals ? (
                <div style={styles.performanceCard}>
                  <h4 style={styles.cardTitle}>Totals</h4>
                  {Object.entries(supplierPerformanceQuery.data.totals).map(([key, value]) => (
                    <KeyValue key={key} label={key.replace(/_/g, ' ')} value={value} />
                  ))}
                </div>
              ) : null}

              {supplierPerformanceQuery.data.metrics ? (
                <div style={styles.performanceCard}>
                  <h4 style={styles.cardTitle}>Metrics</h4>
                  {Object.entries(supplierPerformanceQuery.data.metrics).map(([key, value]) => (
                    <KeyValue key={key} label={key.replace(/_/g, ' ')} value={value} />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {supplierPerformanceQuery.data?.notes?.map((note) => (
            <div key={note} style={styles.note}>{note}</div>
          ))}

          {supplierPerformanceQuery.data ? (
            <>
              <h4 style={styles.cardTitle}>Raw Performance Response</h4>
              <JsonBlock value={supplierPerformanceQuery.data} />
            </>
          ) : null}
        </section>
      ) : null}
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
  statValueWarn: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#92400e',
    wordBreak: 'break-word'
  },
  statValueBad: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#991b1b',
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
  cardTitle: {
    marginTop: 0,
    marginBottom: '12px',
    fontSize: '16px',
    fontWeight: 700
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
    marginBottom: '16px',
    minWidth: 0
  },
  searchInput: {
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
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '920px'
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
  emailValue: {
    fontFamily: 'monospace',
    fontSize: '13px',
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
  },
  note: {
    marginTop: '12px',
    color: '#6b7280',
    fontSize: '13px',
    lineHeight: 1.4
  },
  performanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  performanceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '14px',
    marginBottom: '16px'
  },
  performanceCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '14px',
    background: '#ffffff'
  },
  keyValue: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6'
  },
  keyLabel: {
    color: '#6b7280',
    textTransform: 'capitalize'
  },
  keyText: {
    fontWeight: 700,
    textAlign: 'right',
    wordBreak: 'break-word'
  },
  jsonBlock: {
    maxHeight: '360px',
    overflow: 'auto',
    background: '#0f172a',
    color: '#e5e7eb',
    borderRadius: '12px',
    padding: '14px',
    fontSize: '12px'
  }
};