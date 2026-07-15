import type { FormEvent } from 'react';
import { DataTable, InputField, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatNumber } from '../EnterpriseInventoryFormat';
import type { ParLevel, ParLevelForm, ProductOption, StorageLocationOption } from '../EnterpriseInventoryTypes';

type ParLevelsTabProps = {
  form: ParLevelForm;
  onFormChange: (updater: (current: ParLevelForm) => ParLevelForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isSaving: boolean;
  products: ProductOption[];
  storageLocations: StorageLocationOption[];
  parLevels: ParLevel[];
  loading: boolean;
};

export function ParLevelsTab({
  form,
  onFormChange,
  onSubmit,
  isSaving,
  products,
  storageLocations,
  parLevels,
  loading
}: ParLevelsTabProps) {
  return (
    <section style={styles.grid}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Create / update par level</h2>
        <SelectField
          label="Product"
          value={form.product_id}
          onChange={(value) => onFormChange((current) => ({ ...current, product_id: value }))}
          options={products.map((product) => ({ value: product.id, label: product.name }))}
          required
        />
        <SelectField
          label="Storage location"
          value={form.storage_location_id}
          onChange={(value) => onFormChange((current) => ({ ...current, storage_location_id: value }))}
          options={storageLocations.map((location) => ({ value: location.id, label: location.name }))}
        />
        <InputField label="Department" value={form.department} onChange={(value) => onFormChange((current) => ({ ...current, department: value }))} />
        <InputField label="Minimum quantity" type="number" value={form.min_quantity} onChange={(value) => onFormChange((current) => ({ ...current, min_quantity: value }))} required />
        <InputField label="Par / target quantity" type="number" value={form.par_quantity} onChange={(value) => onFormChange((current) => ({ ...current, par_quantity: value }))} required />
        <InputField label="Optional maximum quantity" type="number" value={form.max_quantity} onChange={(value) => onFormChange((current) => ({ ...current, max_quantity: value }))} />
        <InputField label="Legacy reorder quantity" type="number" value={form.reorder_quantity} onChange={(value) => onFormChange((current) => ({ ...current, reorder_quantity: value }))} required />
        <SelectField
          label="Replenishment priority"
          value={form.replenishment_priority}
          onChange={(value) => onFormChange((current) => ({ ...current, replenishment_priority: value }))}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'normal', label: 'Normal' },
            { value: 'high', label: 'High' },
            { value: 'critical', label: 'Critical' }
          ]}
        />
        <InputField label="Effective from" type="date" value={form.effective_from} onChange={(value) => onFormChange((current) => ({ ...current, effective_from: value }))} />
        <InputField label="Effective to" type="date" value={form.effective_to} onChange={(value) => onFormChange((current) => ({ ...current, effective_to: value }))} />
        <InputField label="Override reason / policy note" value={form.override_reason} onChange={(value) => onFormChange((current) => ({ ...current, override_reason: value }))} />
        <button type="submit" disabled={isSaving} style={styles.primaryButton}>Save par level</button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Configured par levels</h2>
        <DataTable
          loading={loading}
          empty="No par levels configured yet."
          headers={['Product', 'Location', 'Department', 'Min', 'Target', 'Max', 'Priority', 'Effective', 'Reorder']}
          rows={parLevels.map((item) => [
            item.product_name || item.product_id,
            item.storage_location_name || '-',
            item.department || '-',
            formatNumber(item.min_quantity),
            formatNumber(item.par_quantity),
            item.max_quantity == null ? '-' : formatNumber(item.max_quantity),
            item.replenishment_priority || 'normal',
            [item.effective_from || 'now', item.effective_to || 'open'].join(' → '),
            formatNumber(item.reorder_quantity)
          ])}
        />
      </div>
    </section>
  );
}
