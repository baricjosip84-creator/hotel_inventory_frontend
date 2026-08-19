import type { FormEvent } from 'react';
import { DataTable, InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatNumber } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
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
  const canWriteParLevels = hasPermission(TENANT_PERMISSIONS.PAR_LEVELS_WRITE);

  return (
    <section className="inventory-controls-grid" style={styles.grid}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Create / update par level</h2>
        <SelectField
          label="Product"
          value={form.product_id}
          onChange={(value) => onFormChange((current) => ({ ...current, product_id: value }))}
          options={products.map((product) => ({ value: product.id, label: product.name }))}
          required
          disabled={!canWriteParLevels}
        />
        <SelectField
          label="Storage location"
          value={form.storage_location_id}
          onChange={(value) => onFormChange((current) => ({ ...current, storage_location_id: value }))}
          options={storageLocations.map((location) => ({ value: location.id, label: location.name }))}
          disabled={!canWriteParLevels}
        />
        <InputField label="Department" value={form.department} onChange={(value) => onFormChange((current) => ({ ...current, department: value }))} disabled={!canWriteParLevels} />
        <InputField label="Minimum quantity" type="number" value={form.min_quantity} onChange={(value) => onFormChange((current) => ({ ...current, min_quantity: value }))} required disabled={!canWriteParLevels} />
        <InputField label="Par / target quantity" type="number" value={form.par_quantity} onChange={(value) => onFormChange((current) => ({ ...current, par_quantity: value }))} required disabled={!canWriteParLevels} />
        <InputField label="Optional maximum quantity" type="number" value={form.max_quantity} onChange={(value) => onFormChange((current) => ({ ...current, max_quantity: value }))} disabled={!canWriteParLevels} />
        <InputField label="Legacy reorder quantity" type="number" value={form.reorder_quantity} onChange={(value) => onFormChange((current) => ({ ...current, reorder_quantity: value }))} required disabled={!canWriteParLevels} />
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
          disabled={!canWriteParLevels}
        />
        <InputField label="Effective from" type="date" value={form.effective_from} onChange={(value) => onFormChange((current) => ({ ...current, effective_from: value }))} disabled={!canWriteParLevels} />
        <InputField label="Effective to" type="date" value={form.effective_to} onChange={(value) => onFormChange((current) => ({ ...current, effective_to: value }))} disabled={!canWriteParLevels} />
        <InputField label="Override reason / policy note" value={form.override_reason} onChange={(value) => onFormChange((current) => ({ ...current, override_reason: value }))} disabled={!canWriteParLevels} />
        <button type="submit" disabled={isSaving || !canWriteParLevels} style={isSaving || !canWriteParLevels ? styles.disabledButton : styles.primaryButton} title={!canWriteParLevels ? `Requires ${TENANT_PERMISSIONS.PAR_LEVELS_WRITE} permission.` : undefined}>Save par level</button>
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
