import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, MetricCard, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatNumber } from '../EnterpriseInventoryFormat';
import type { SupplierForm, SupplierOption, SupplierPerformance, SupplierSlaBreach } from '../EnterpriseInventoryTypes';

type SupplierSaveMutation = {
  isPending: boolean;
  mutate: (input: SupplierForm) => void;
};

type SupplierDeleteMutation = {
  isPending: boolean;
  mutate: (supplierId: string) => void;
};

type SuppliersQuery = {
  isLoading: boolean;
};

type SupplierSlaBreachesQuery = {
  isLoading: boolean;
};

type SupplierPerformanceQuery = {
  isLoading: boolean;
  data?: SupplierPerformance | null;
};

type SuppliersTabProps = {
  availableSuppliers: SupplierOption[];
  deleteSupplierMutation: SupplierDeleteMutation;
  editingSupplierId: string | null;
  emptySupplierForm: SupplierForm;
  saveSupplierMutation: SupplierSaveMutation;
  selectedSupplierPerformanceId: string;
  setEditingSupplierId: Dispatch<SetStateAction<string | null>>;
  setSelectedSupplierPerformanceId: Dispatch<SetStateAction<string>>;
  setSupplierForm: Dispatch<SetStateAction<SupplierForm>>;
  setSupplierSearch: Dispatch<SetStateAction<string>>;
  supplierForm: SupplierForm;
  supplierPerformanceQuery: SupplierPerformanceQuery;
  supplierSearch: string;
  supplierSlaBreaches: SupplierSlaBreach[];
  supplierSlaBreachesQuery: SupplierSlaBreachesQuery;
  suppliers: SupplierOption[];
  suppliersQuery: SuppliersQuery;
};

export function SuppliersTab({
  availableSuppliers,
  deleteSupplierMutation,
  editingSupplierId,
  emptySupplierForm,
  saveSupplierMutation,
  selectedSupplierPerformanceId,
  setEditingSupplierId,
  setSelectedSupplierPerformanceId,
  setSupplierForm,
  setSupplierSearch,
  supplierForm,
  supplierPerformanceQuery,
  supplierSearch,
  supplierSlaBreaches,
  supplierSlaBreachesQuery,
  suppliers,
  suppliersQuery
}: SuppliersTabProps) {
  const handleSupplierSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveSupplierMutation.mutate(supplierForm);
  };

  const startSupplierEdit = (supplier: SupplierOption) => {
    setEditingSupplierId(supplier.id);
    setSupplierForm({ name: supplier.name || '', email: supplier.email || '', contact_info: supplier.contact_info || '' });
  };

  return (
    <section style={styles.grid}>
      <div style={styles.stack}>
        <form style={styles.card} onSubmit={handleSupplierSubmit}>
          <h2 style={styles.sectionTitle}>{editingSupplierId ? 'Edit supplier' : 'Create supplier'}</h2>
          <p style={styles.helper}>Create and maintain supplier contact records used by purchasing, receiving, and performance tracking.</p>
          <InputField label="Name" value={supplierForm.name} required onChange={(value) => setSupplierForm((current) => ({ ...current, name: value }))} />
          <InputField label="Email" value={supplierForm.email} type="email" onChange={(value) => setSupplierForm((current) => ({ ...current, email: value }))} />
          <InputField label="Contact info" value={supplierForm.contact_info} onChange={(value) => setSupplierForm((current) => ({ ...current, contact_info: value }))} />
          <div style={styles.actions}>
            <button type="submit" style={styles.primaryButton} disabled={saveSupplierMutation.isPending}>{editingSupplierId ? 'Save supplier' : 'Create supplier'}</button>
            {editingSupplierId ? (
              <button type="button" style={styles.secondaryButton} onClick={() => { setEditingSupplierId(null); setSupplierForm(emptySupplierForm); }}>Cancel edit</button>
            ) : null}
          </div>
        </form>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Supplier SLA breaches</h2>
          <p style={styles.helper}>Shows suppliers with overdue pending or partially received shipments that may need follow-up.</p>
          <DataTable
            loading={supplierSlaBreachesQuery.isLoading}
            empty="No supplier SLA breaches found."
            headers={['Supplier', 'Late shipments', 'Earliest missed', 'Latest missed']}
            rows={supplierSlaBreaches.map((breach) => [
              breach.supplier_name || breach.supplier_id,
              formatNumber(breach.late_shipments),
              breach.earliest_missed_delivery || '-',
              breach.latest_missed_delivery || '-'
            ])}
          />
        </section>
      </div>

      <section style={styles.stack}>
        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Supplier master data</h2>
            <input style={{ ...styles.input, maxWidth: 260 }} placeholder="Search suppliers" value={supplierSearch} onChange={(event) => setSupplierSearch(event.target.value)} />
          </div>
          {suppliersQuery.isLoading ? <p style={styles.helper}>Loading…</p> : suppliers.length ? (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Contact</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td style={styles.td}>{supplier.name}</td>
                      <td style={styles.td}>{supplier.email || '-'}</td>
                      <td style={styles.td}>{supplier.contact_info || '-'}</td>
                      <td style={styles.td}>
                        <div style={styles.inlineActions}>
                          <button type="button" style={styles.secondaryButton} onClick={() => startSupplierEdit(supplier)}>Edit</button>
                          <button type="button" style={styles.smallButton} onClick={() => setSelectedSupplierPerformanceId(supplier.id)}>Performance</button>
                          <button type="button" style={styles.dangerButton} disabled={deleteSupplierMutation.isPending} onClick={() => deleteSupplierMutation.mutate(supplier.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p style={styles.helper}>No suppliers found.</p>}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Supplier performance drilldown</h2>
          <p style={styles.helper}>Review shipment history and delivery status for the selected supplier.</p>
          <SelectField
            label="Supplier"
            value={selectedSupplierPerformanceId}
            onChange={setSelectedSupplierPerformanceId}
            options={availableSuppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
          />
          {!selectedSupplierPerformanceId ? (
            <p style={styles.helper}>Select a supplier to load performance metrics.</p>
          ) : supplierPerformanceQuery.isLoading ? (
            <p style={styles.helper}>Loading supplier performance…</p>
          ) : supplierPerformanceQuery.data ? (
            <div style={styles.statGrid}>
              <MetricCard label="Supplier" value={supplierPerformanceQuery.data.supplier?.name || selectedSupplierPerformanceId} />
              <MetricCard label="Total shipments" value={formatNumber(supplierPerformanceQuery.data.metrics?.total_shipments)} />
              <MetricCard label="Pending" value={formatNumber(supplierPerformanceQuery.data.metrics?.pending_shipments)} />
              <MetricCard label="Partial" value={formatNumber(supplierPerformanceQuery.data.metrics?.partial_shipments)} />
              <MetricCard label="Received" value={formatNumber(supplierPerformanceQuery.data.metrics?.received_shipments)} />
              <MetricCard label="Last delivery" value={supplierPerformanceQuery.data.metrics?.last_delivery_date || '-'} />
            </div>
          ) : (
            <p style={styles.helper}>No supplier performance returned.</p>
          )}
        </section>
      </section>
    </section>
  );
}
