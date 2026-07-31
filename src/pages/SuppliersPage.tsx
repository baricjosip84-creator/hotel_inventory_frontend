import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { apiRequest, ApiError } from '../lib/api';
import { scrollToFormSection } from '../lib/scrollToForm';
import { getCurrentAccessRoleLabel, getRoleCapabilities } from '../lib/permissions';
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
  late_shipments?: number | string | null;
  earliest_missed_delivery?: string | null;
  latest_missed_delivery?: string | null;
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

type SupplierPerformanceMetrics = {
  total_shipments?: number | string | null;
  pending_shipments?: number | string | null;
  received_shipments?: number | string | null;
  partial_shipments?: number | string | null;
  last_delivery_date?: string | null;
  [key: string]: unknown;
};

type SupplierPerformanceResponse = {
  supplier?: Pick<SupplierItem, 'id' | 'name'>;
  supplier_id?: string;
  supplier_name?: string;
  metrics?: SupplierPerformanceMetrics;
  notes?: string[];
  [key: string]: unknown;
};

async function fetchSuppliers(search = ''): Promise<SupplierItem[]> {
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

function formatDateOnly(value?: string | null): string {
  if (!value) return '-';

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return parsed.toLocaleDateString(undefined, { timeZone: 'UTC' });
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString();
}

function toMetricNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeBreaches(response: SupplierSlaBreachesResponse | undefined): SupplierSlaBreachItem[] {
  if (!response) return [];
  if (Array.isArray(response)) return response as SupplierSlaBreachItem[];
  if (Array.isArray(response.rows)) return response.rows;
  return [];
}

function getSlaBreachLateShipmentCount(breach: SupplierSlaBreachItem): number {
  const aggregateValue = breach.late_shipments;

  if (typeof aggregateValue === 'number' && Number.isFinite(aggregateValue)) {
    return aggregateValue;
  }

  if (typeof aggregateValue === 'string') {
    const parsed = Number(aggregateValue);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const rowLevelDaysLate = breach.days_late;

  if (rowLevelDaysLate !== undefined && rowLevelDaysLate !== null && rowLevelDaysLate !== '') {
    return 1;
  }

  return 0;
}

function formatSlaBreachLateShipments(breach: SupplierSlaBreachItem): string {
  const value = breach.late_shipments;

  if (value !== undefined && value !== null && value !== '') {
    return formatUnknown(value);
  }

  if (breach.shipment_id || breach.shipment_number) {
    return '1';
  }

  return '-';
}

function getSlaBreachEarliestMissedDelivery(breach: SupplierSlaBreachItem): string | null | undefined {
  return breach.earliest_missed_delivery || breach.expected_delivery_date;
}

function getSlaBreachLatestMissedDelivery(breach: SupplierSlaBreachItem): string | null | undefined {
  return breach.latest_missed_delivery || breach.received_date || breach.expected_delivery_date;
}

function getPerformanceTitle(
  performance: SupplierPerformanceResponse | undefined,
  fallback?: SupplierItem | null
): string {
  if (!performance) return fallback?.name || 'Supplier Performance';

  if (typeof performance.supplier_name === 'string') return performance.supplier_name;
  if (performance.supplier?.name) return performance.supplier.name;

  return fallback?.name || 'Supplier Performance';
}

function getSupplierSearchRank(supplier: SupplierItem, normalizedSearch: string): number {
  if (!normalizedSearch) return 0;

  const name = supplier.name.toLocaleLowerCase();
  const email = (supplier.email || '').toLocaleLowerCase();
  const contactInfo = (supplier.contact_info || '').toLocaleLowerCase();

  if (name.startsWith(normalizedSearch)) return 0;
  if (name.includes(normalizedSearch)) return 1;
  if (email.startsWith(normalizedSearch)) return 2;
  if (email.includes(normalizedSearch)) return 3;
  if (contactInfo.includes(normalizedSearch)) return 4;
  return Number.POSITIVE_INFINITY;
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

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const { canManageSuppliers } = getRoleCapabilities();
  const accessRoleLabel = getCurrentAccessRoleLabel();

  const [search, setSearch] = useState(() => searchParams.get('search')?.trim() || '');
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [selectedPerformanceSupplier, setSelectedPerformanceSupplier] = useState<SupplierItem | null>(null);
  const [form, setForm] = useState<SupplierFormState>(emptyForm());
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => fetchSuppliers()
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
      const message = error instanceof ApiError ? error.message : 'Failed to create supplier.';
      setFormError(message);
      setFormMessage(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: updateSupplier,
    onSuccess: async (updatedSupplier) => {
      setEditingSupplier(null);
      setForm(emptyForm());
      setFormError(null);
      setFormMessage('Supplier updated successfully.');
      setSelectedPerformanceSupplier((current) =>
        current?.id === updatedSupplier.id ? updatedSupplier : current
      );
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      await queryClient.invalidateQueries({ queryKey: ['suppliers-available'] });
      await queryClient.invalidateQueries({ queryKey: ['supplier-sla-breaches'] });
      await queryClient.invalidateQueries({ queryKey: ['supplier-performance'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Failed to update supplier.';
      setFormError(message);
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
      const message = error instanceof ApiError ? error.message : 'Failed to delete supplier.';
      setFormError(message);
      setFormMessage(null);
    }
  });

  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);
  const slaBreaches = useMemo(() => normalizeBreaches(slaBreachesQuery.data), [slaBreachesQuery.data]);

  const filteredSuppliers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    if (!normalizedSearch) return suppliers;

    return suppliers
      .map((supplier) => ({
        supplier,
        rank: getSupplierSearchRank(supplier, normalizedSearch)
      }))
      .filter((entry) => Number.isFinite(entry.rank))
      .sort((left, right) => left.rank - right.rank || left.supplier.name.localeCompare(right.supplier.name))
      .map((entry) => entry.supplier);
  }, [search, suppliers]);

  const summary = useMemo(() => {
    const withEmail = suppliers.filter(
      (supplier) => Boolean(supplier.email && supplier.email.trim())
    ).length;
    const withContact = suppliers.filter(
      (supplier) => Boolean(supplier.contact_info && supplier.contact_info.trim())
    ).length;

    const lateShipments = slaBreaches.reduce(
      (total, breach) => total + getSlaBreachLateShipmentCount(breach),
      0
    );

    return {
      total: suppliers.length,
      withEmail,
      withContact,
      slaBreachSuppliers: slaBreaches.length,
      slaBreaches: lateShipments
    };
  }, [suppliers, slaBreaches]);

  const selectedSupplierSlaBreach = useMemo(
    () => slaBreaches.find((breach) => breach.supplier_id === selectedPerformanceSupplier?.id),
    [selectedPerformanceSupplier?.id, slaBreaches]
  );

  const performanceMetrics = supplierPerformanceQuery.data?.metrics;
  const performanceSummary = useMemo(() => ({
    total: toMetricNumber(performanceMetrics?.total_shipments),
    received: toMetricNumber(performanceMetrics?.received_shipments),
    pending: toMetricNumber(performanceMetrics?.pending_shipments),
    partial: toMetricNumber(performanceMetrics?.partial_shipments),
    lateOpen: selectedSupplierSlaBreach ? getSlaBreachLateShipmentCount(selectedSupplierSlaBreach) : 0,
    latestScheduledDelivery: formatDateOnly(performanceMetrics?.last_delivery_date)
  }), [performanceMetrics, selectedSupplierSlaBreach]);

  useEffect(() => {
    if (selectedPerformanceSupplier?.id) {
      scrollToFormSection('supplier-performance-panel');
    }
  }, [selectedPerformanceSupplier?.id]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    if (!canManageSuppliers) {
      setFormError(
        'Your current role is read-only for supplier master data because it does not have suppliers.write permission.'
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
    scrollToFormSection('supplier-form-panel');
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

    const confirmed = window.confirm(
      `Delete supplier "${supplier.name}"? Deletion is allowed only when no active products or shipments still reference this supplier.`
    );
    if (!confirmed) {
      return;
    }

    setFormError(null);
    setFormMessage(null);
    deleteMutation.mutate(supplier.id);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const inputDisabled = isSubmitting || !canManageSuppliers;
  const supplierWord = summary.slaBreachSuppliers === 1 ? 'supplier' : 'suppliers';

  return (
    <div style={styles.page}>
      <div className="app-grid-stats" style={styles.statsGrid}>
        <StatCard
          title="Active Suppliers"
          value={summary.total}
          subtitle="Supplier records available to current workflows"
        />
        <StatCard
          title="With Email"
          value={summary.withEmail}
          subtitle="Ready for supplier email workflows"
          tone={summary.withEmail === summary.total ? 'good' : 'warn'}
        />
        <StatCard
          title="With Contact Info"
          value={summary.withContact}
          subtitle="Records with phone, account, or delivery notes"
          tone={summary.withContact === summary.total ? 'good' : 'warn'}
        />
        <StatCard
          title="SLA Breaches"
          value={summary.slaBreaches}
          subtitle={`${summary.slaBreachSuppliers} ${supplierWord} with late pending or partial shipments`}
          tone={summary.slaBreaches > 0 ? 'bad' : 'good'}
        />
      </div>

      {!canManageSuppliers ? (
        <div className="app-warning-state" style={styles.warningBox}>
          Current access role: {accessRoleLabel}. Suppliers are read-only because this role does not have suppliers.write permission.
        </div>
      ) : null}

      <section id="supplier-form-panel" className="app-panel app-panel--padded" style={styles.panel}>
        <h3 style={styles.panelTitle}>{editingSupplier ? 'Edit Supplier' : 'Create Supplier'}</h3>
        <p style={styles.panelSubtitle}>
          {canManageSuppliers
            ? 'Maintain supplier master records used across products, purchasing, shipments, receiving, and supplier communication.'
            : 'This form remains visible for context, but all fields and supplier write actions are disabled for your current role.'}
        </p>

        {formError ? <div className="app-error-state" style={styles.errorBox}>{formError}</div> : null}
        {formMessage ? <div className="app-success-state" style={styles.successBox}>{formMessage}</div> : null}

        <form onSubmit={handleSubmit} style={styles.formGrid}>
          <div>
            <label htmlFor="supplier-name" style={styles.label}>Supplier Name</label>
            <input
              id="supplier-name"
              style={inputDisabled ? styles.disabledInput : styles.input}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Example: Metro Wholesale"
              maxLength={255}
              disabled={inputDisabled}
              required
            />
          </div>

          <div>
            <label htmlFor="supplier-email" style={styles.label}>Email</label>
            <input
              id="supplier-email"
              style={inputDisabled ? styles.disabledInput : styles.input}
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({ ...current, email: event.target.value }))
              }
              placeholder="orders@supplier.com"
              maxLength={255}
              disabled={inputDisabled}
            />
          </div>

          <div>
            <label htmlFor="supplier-contact-info" style={styles.label}>Contact Info</label>
            <input
              id="supplier-contact-info"
              style={inputDisabled ? styles.disabledInput : styles.input}
              value={form.contact_info}
              onChange={(event) =>
                setForm((current) => ({ ...current, contact_info: event.target.value }))
              }
              placeholder="Phone, account rep, delivery notes"
              maxLength={1000}
              disabled={inputDisabled}
            />
          </div>

          <div className="app-actions" style={styles.formActions}>
            <button
              type="submit"
              style={inputDisabled ? styles.disabledButton : styles.primaryButton}
              disabled={inputDisabled}
              title={!canManageSuppliers ? 'Suppliers write permission required' : undefined}
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
              <button type="button" style={isSubmitting ? styles.disabledButton : styles.secondaryButton} onClick={handleCancelEdit} disabled={isSubmitting}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.panelTitle}>Supplier List</h3>
            <p style={styles.panelSubtitle}>
              Search and review supplier records used by inventory, purchasing, shipment, email, SLA, and performance workflows.
            </p>
          </div>
          <button
            type="button"
            style={suppliersQuery.isFetching ? styles.disabledButton : styles.secondaryButton}
            onClick={() => void suppliersQuery.refetch()}
            disabled={suppliersQuery.isFetching}
          >
            {suppliersQuery.isFetching ? 'Refreshing...' : 'Refresh Suppliers'}
          </button>
        </div>

        <div className="app-grid-toolbar" style={styles.toolbarGrid}>
          <div style={styles.searchField}>
            <label htmlFor="supplier-search" style={styles.label}>Search suppliers</label>
            <div style={styles.searchRow}>
              <input
                id="supplier-search"
                type="search"
                placeholder="Supplier name, email, or contact info"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={styles.searchInput}
                autoComplete="off"
              />
              <button
                type="button"
                style={!search ? styles.disabledButton : styles.secondaryButton}
                onClick={() => setSearch('')}
                disabled={!search}
              >
                Clear Search
              </button>
            </div>
          </div>
        </div>

        {!suppliersQuery.isLoading && !suppliersQuery.isError ? (
          <div style={styles.resultCount}>
            {search.trim()
              ? `${filteredSuppliers.length} of ${suppliers.length} suppliers match.`
              : `${suppliers.length} suppliers shown.`}
          </div>
        ) : null}

        {suppliersQuery.isLoading ? <div className="app-empty-state">Loading suppliers...</div> : null}

        {suppliersQuery.isError ? (
          <div className="app-error-state" style={styles.errorBox}>
            Failed to load suppliers: {(suppliersQuery.error as Error).message || 'Unknown error'}
          </div>
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
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={5}>
                      {search.trim()
                        ? 'No suppliers match the current search.'
                        : 'No suppliers have been created yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{supplier.name}</div>
                        <div style={styles.rowSubtle}>Supplier ID: {supplier.id}</div>
                      </td>
                      <td style={styles.td}>
                        {supplier.email ? (
                          <a href={`mailto:${supplier.email}`} style={styles.emailValue}>{supplier.email}</a>
                        ) : (
                          <span style={styles.missingValue}>No email</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {supplier.contact_info || <span style={styles.missingValue}>No contact info</span>}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeActive}>Active</span>
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
                            title={!canManageSuppliers ? 'Suppliers write permission required' : undefined}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            style={!canManageSuppliers ? styles.disabledButton : styles.dangerButton}
                            onClick={() => handleDelete(supplier)}
                            disabled={deleteMutation.isPending || !canManageSuppliers}
                            title={!canManageSuppliers ? 'Suppliers write permission required' : undefined}
                          >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
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
        <section id="supplier-performance-panel" className="app-panel app-panel--padded" style={styles.panel}>
          <div style={styles.performanceHeader}>
            <div>
              <h3 style={styles.panelTitle}>
                Supplier Performance: {getPerformanceTitle(supplierPerformanceQuery.data, selectedPerformanceSupplier)}
              </h3>
              <p style={styles.panelSubtitle}>
                Read-only shipment activity for this supplier. These figures do not change supplier, shipment, stock, or receiving records.
              </p>
            </div>
            <div className="app-actions" style={styles.actionGroup}>
              <button
                type="button"
                style={supplierPerformanceQuery.isFetching ? styles.disabledButton : styles.secondaryButton}
                onClick={() => void supplierPerformanceQuery.refetch()}
                disabled={supplierPerformanceQuery.isFetching}
              >
                {supplierPerformanceQuery.isFetching ? 'Refreshing...' : 'Refresh Performance'}
              </button>
              <button type="button" style={styles.secondaryButton} onClick={() => setSelectedPerformanceSupplier(null)}>
                Close
              </button>
            </div>
          </div>

          <div style={styles.supplierIdentityGrid}>
            <div style={styles.identityItem}>
              <span style={styles.identityLabel}>Email</span>
              <span style={styles.identityValue}>{selectedPerformanceSupplier.email || 'Not recorded'}</span>
            </div>
            <div style={styles.identityItem}>
              <span style={styles.identityLabel}>Contact info</span>
              <span style={styles.identityValue}>{selectedPerformanceSupplier.contact_info || 'Not recorded'}</span>
            </div>
          </div>

          {supplierPerformanceQuery.isLoading ? (
            <div className="app-empty-state">Loading supplier performance...</div>
          ) : null}

          {supplierPerformanceQuery.isError ? (
            <div className="app-error-state" style={styles.errorBox}>
              Failed to load supplier performance: {(supplierPerformanceQuery.error as Error).message || 'Unknown error'}
            </div>
          ) : null}

          {supplierPerformanceQuery.data ? (
            <>
              <div className="app-grid-stats" style={styles.performanceStatsGrid}>
                <StatCard
                  title="Total Shipments"
                  value={performanceSummary.total}
                  subtitle="All active shipment records for this supplier"
                />
                <StatCard
                  title="Received"
                  value={performanceSummary.received}
                  subtitle="Shipments fully received"
                  tone="good"
                />
                <StatCard
                  title="Pending"
                  value={performanceSummary.pending}
                  subtitle="Shipments not yet received"
                  tone={performanceSummary.pending > 0 ? 'warn' : 'good'}
                />
                <StatCard
                  title="Partially Received"
                  value={performanceSummary.partial}
                  subtitle="Shipments still awaiting remaining items"
                  tone={performanceSummary.partial > 0 ? 'warn' : 'good'}
                />
                <StatCard
                  title="Late Open"
                  value={performanceSummary.lateOpen}
                  subtitle="Past-due pending or partial shipments"
                  tone={performanceSummary.lateOpen > 0 ? 'bad' : 'good'}
                />
                <StatCard
                  title="Latest Scheduled Delivery"
                  value={performanceSummary.latestScheduledDelivery}
                  subtitle="Latest delivery date recorded on an active shipment"
                />
              </div>

              {performanceSummary.total === 0 ? (
                <div className="app-empty-state" style={styles.performanceEmpty}>
                  No shipments are linked to this supplier yet. Performance figures will appear after the supplier is used on a shipment.
                </div>
              ) : null}
            </>
          ) : null}

          {supplierPerformanceQuery.data?.notes?.map((note) => (
            <div key={note} style={styles.note}>{note}</div>
          ))}
        </section>
      ) : null}

      <section className="app-panel app-panel--padded" style={styles.panel}>
        <div style={styles.sectionHeader}>
          <div>
            <h3 style={styles.panelTitle}>Supplier SLA Breaches</h3>
            <p style={styles.panelSubtitle}>
              Late pending or partially received shipments grouped by supplier. Use this read-only view to identify delivery follow-up work.
            </p>
          </div>
          <button
            type="button"
            style={slaBreachesQuery.isFetching ? styles.disabledButton : styles.secondaryButton}
            onClick={() => void slaBreachesQuery.refetch()}
            disabled={slaBreachesQuery.isFetching}
          >
            {slaBreachesQuery.isFetching ? 'Refreshing...' : 'Refresh SLA Breaches'}
          </button>
        </div>

        {slaBreachesQuery.isLoading ? (
          <div className="app-empty-state">Loading supplier SLA breaches...</div>
        ) : null}

        {slaBreachesQuery.isError ? (
          <div className="app-error-state" style={styles.errorBox}>
            Failed to load supplier SLA breaches: {(slaBreachesQuery.error as Error).message || 'Unknown error'}
          </div>
        ) : null}

        {!slaBreachesQuery.isLoading && !slaBreachesQuery.isError ? (
          <div style={styles.tableWrapper}>
            <table style={styles.slaTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Late Shipments</th>
                  <th style={styles.th}>Earliest Overdue Date</th>
                  <th style={styles.th}>Latest Overdue Date</th>
                </tr>
              </thead>
              <tbody>
                {slaBreaches.length === 0 ? (
                  <tr>
                    <td style={styles.emptyCell} colSpan={4}>
                      No late pending or partially received supplier shipments were found.
                    </td>
                  </tr>
                ) : (
                  slaBreaches.map((breach, index) => (
                    <tr key={`${breach.supplier_id || 'supplier'}-${breach.shipment_id || index}`}>
                      <td style={styles.td}>
                        <div style={styles.rowTitle}>{formatUnknown(breach.supplier_name || breach.supplier_id)}</div>
                        <div style={styles.rowSubtle}>Supplier ID: {formatUnknown(breach.supplier_id)}</div>
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badgeDeleted}>{formatSlaBreachLateShipments(breach)}</span>
                      </td>
                      <td style={styles.td}>{formatDateOnly(getSlaBreachEarliestMissedDelivery(breach))}</td>
                      <td style={styles.td}>{formatDateOnly(getSlaBreachLatestMissedDelivery(breach))}</td>
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
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    minWidth: 0
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
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    flexWrap: 'wrap'
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
  disabledInput: {
    width: '100%',
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    background: '#f3f4f6',
    color: '#6b7280',
    outline: 'none',
    boxSizing: 'border-box',
    cursor: 'not-allowed'
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
    marginBottom: '8px',
    minWidth: 0
  },
  searchField: {
    minWidth: 0
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap'
  },
  searchInput: {
    flex: '1 1 360px',
    minWidth: 0,
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #d1d5db',
    outline: 'none',
    fontSize: '14px',
    background: '#ffffff',
    boxSizing: 'border-box'
  },
  resultCount: {
    marginBottom: '12px',
    color: '#6b7280',
    fontSize: '13px'
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
  slaTable: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '720px'
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
    color: '#1d4ed8',
    fontFamily: 'monospace',
    fontSize: '13px',
    wordBreak: 'break-all',
    textDecoration: 'none'
  },
  missingValue: {
    color: '#9ca3af',
    fontStyle: 'italic'
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
  supplierIdentityGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  identityItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '12px 14px',
    background: '#f9fafb',
    minWidth: 0
  },
  identityLabel: {
    display: 'block',
    color: '#6b7280',
    fontSize: '12px',
    marginBottom: '4px'
  },
  identityValue: {
    display: 'block',
    fontWeight: 600,
    wordBreak: 'break-word'
  },
  performanceStatsGrid: {
    marginBottom: '16px',
    minWidth: 0
  },
  performanceEmpty: {
    marginTop: '4px'
  }
};
