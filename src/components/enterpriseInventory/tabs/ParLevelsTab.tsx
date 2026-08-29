import type { FormEvent } from 'react';
import { DataTable, InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { formatLocalizedDate, formatLocalizedNumber } from '../../../i18n/formatters';
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
  const { locale, ui } = useAppTranslation();
  const canWriteParLevels = hasPermission(TENANT_PERMISSIONS.PAR_LEVELS_WRITE);
  const formatQuantity = (value: number | string | null | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 4 })
      : '—';
  };
  const priorityLabel = (value: string | null | undefined) => {
    const labels: Record<string, string> = {
      low: 'Low',
      normal: 'Normal',
      high: 'High',
      critical: 'Critical',
    };
    return labels[value || 'normal'] ? ui(labels[value || 'normal']) : String(value || '');
  };

  return (
    <section style={styles.stack}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Create / update par level')}</h2>
        <div style={styles.formGrid}>
          <SelectField
            label={ui('Product')}
            value={form.product_id}
            onChange={(value) => onFormChange((current) => ({ ...current, product_id: value }))}
            options={products.map((product) => ({ value: product.id, label: product.name }))}
            required
            disabled={!canWriteParLevels}
          />
          <SelectField
            label={ui('Storage location')}
            value={form.storage_location_id}
            onChange={(value) => onFormChange((current) => ({ ...current, storage_location_id: value }))}
            options={storageLocations.map((location) => ({ value: location.id, label: location.name }))}
            disabled={!canWriteParLevels}
          />
          <InputField label={ui('Department')} value={form.department} onChange={(value) => onFormChange((current) => ({ ...current, department: value }))} disabled={!canWriteParLevels} />
          <InputField label={ui('Minimum quantity')} type="number" value={form.min_quantity} onChange={(value) => onFormChange((current) => ({ ...current, min_quantity: value }))} required disabled={!canWriteParLevels} />
          <InputField label={ui('Par / target quantity')} type="number" value={form.par_quantity} onChange={(value) => onFormChange((current) => ({ ...current, par_quantity: value }))} required disabled={!canWriteParLevels} />
          <InputField label={ui('Optional maximum quantity')} type="number" value={form.max_quantity} onChange={(value) => onFormChange((current) => ({ ...current, max_quantity: value }))} disabled={!canWriteParLevels} />
          <InputField label={ui('Reorder quantity')} type="number" value={form.reorder_quantity} onChange={(value) => onFormChange((current) => ({ ...current, reorder_quantity: value }))} required disabled={!canWriteParLevels} />
          <SelectField
            label={ui('Replenishment priority')}
            value={form.replenishment_priority}
            onChange={(value) => onFormChange((current) => ({ ...current, replenishment_priority: value }))}
            options={[
              { value: 'low', label: ui('Low') },
              { value: 'normal', label: ui('Normal') },
              { value: 'high', label: ui('High') },
              { value: 'critical', label: ui('Critical') }
            ]}
            disabled={!canWriteParLevels}
          />
          <InputField label={ui('Effective from')} type="date" value={form.effective_from} onChange={(value) => onFormChange((current) => ({ ...current, effective_from: value }))} disabled={!canWriteParLevels} />
          <InputField label={ui('Effective to')} type="date" value={form.effective_to} onChange={(value) => onFormChange((current) => ({ ...current, effective_to: value }))} disabled={!canWriteParLevels} />
          <InputField label={ui('Override reason / policy note')} value={form.override_reason} onChange={(value) => onFormChange((current) => ({ ...current, override_reason: value }))} disabled={!canWriteParLevels} />
        </div>
        <button
          type="submit"
          disabled={isSaving || !canWriteParLevels}
          style={isSaving || !canWriteParLevels ? styles.disabledButton : styles.primaryButton}
          title={!canWriteParLevels ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.PAR_LEVELS_WRITE) : undefined}
        >
          {isSaving ? ui('Saving…') : ui('Save par level')}
        </button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Configured par levels')}</h2>
        <DataTable
          loading={loading}
          empty={ui('No par levels configured yet.')}
          headers={[ui('Product'), ui('Location'), ui('Department'), ui('Min'), ui('Target'), ui('Max'), ui('Priority'), ui('Effective'), ui('Reorder')]}
          rows={parLevels.map((item) => [
            item.product_name || item.product_id,
            item.storage_location_name || '—',
            item.department || '—',
            formatQuantity(item.min_quantity),
            formatQuantity(item.par_quantity),
            item.max_quantity == null ? '—' : formatQuantity(item.max_quantity),
            priorityLabel(item.replenishment_priority),
            [
              item.effective_from ? formatLocalizedDate(item.effective_from, locale) : ui('Now'),
              item.effective_to ? formatLocalizedDate(item.effective_to, locale) : ui('Open'),
            ].join(' → '),
            formatQuantity(item.reorder_quantity)
          ])}
        />
      </div>
    </section>
  );
}
