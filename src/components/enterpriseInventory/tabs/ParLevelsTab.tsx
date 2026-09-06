import type { FormEvent } from 'react';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { formatLocalizedDate, formatLocalizedNumber } from '../../../i18n/formatters';
import { emptyParLevelForm } from '../EnterpriseInventoryForms';
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
  onCreateExecutionTask: (parLevelId: string) => void;
  creatingExecutionTaskParLevelId?: string | null;
};

export function ParLevelsTab({
  form,
  onFormChange,
  onSubmit,
  isSaving,
  products,
  storageLocations,
  parLevels,
  loading,
  onCreateExecutionTask,
  creatingExecutionTaskParLevelId = null
}: ParLevelsTabProps) {
  const { locale, ui } = useAppTranslation();
  const canWriteParLevels = hasPermission(TENANT_PERMISSIONS.PAR_LEVELS_WRITE);
  const canCreateReplenishmentTask = hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_CREATE)
    && hasPermission(TENANT_PERMISSIONS.PAR_LEVELS_READ)
    && hasPermission(TENANT_PERMISSIONS.STOCK_READ);
  const editing = form.expected_version != null;
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
  const edit = (item: ParLevel) => {
    onFormChange(() => ({
      expected_version: item.version,
      product_id: item.product_id,
      storage_location_id: item.storage_location_id || '',
      department: item.department || '',
      min_quantity: String(item.min_quantity ?? ''),
      par_quantity: String(item.par_quantity ?? ''),
      max_quantity: item.max_quantity == null ? '' : String(item.max_quantity),
      reorder_quantity: String(item.reorder_quantity ?? ''),
      replenishment_priority: item.replenishment_priority || 'normal',
      effective_from: item.effective_from ? String(item.effective_from).slice(0, 10) : '',
      effective_to: item.effective_to ? String(item.effective_to).slice(0, 10) : '',
      override_reason: item.override_reason || ''
    }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            disabled={!canWriteParLevels || editing}
          />
          <SelectField
            label={ui('Storage location')}
            value={form.storage_location_id}
            onChange={(value) => onFormChange((current) => ({ ...current, storage_location_id: value }))}
            options={storageLocations.map((location) => ({ value: location.id, label: location.name }))}
            disabled={!canWriteParLevels || editing}
          />
          <InputField label={ui('Department')} value={form.department} onChange={(value) => onFormChange((current) => ({ ...current, department: value }))} disabled={!canWriteParLevels || editing} />
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
        <div style={styles.actions}>
          <button
            type="submit"
            disabled={isSaving || !canWriteParLevels}
            style={isSaving || !canWriteParLevels ? styles.disabledButton : styles.primaryButton}
            title={!canWriteParLevels ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.PAR_LEVELS_WRITE) : undefined}
          >
            {isSaving ? ui('Saving…') : ui('Save par level')}
          </button>
          {editing ? <button type="button" style={styles.secondaryButton} disabled={isSaving} onClick={() => onFormChange(() => ({ ...emptyParLevelForm }))}>{ui('Cancel edit')}</button> : null}
        </div>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Configured par levels')}</h2>
        {loading ? <p style={styles.helper}>{ui('Loading…')}</p> : !parLevels.length ? <p style={styles.helper}>{ui('No par levels configured yet.')}</p> : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr>{['Product', 'Location', 'Department', 'Min', 'Target', 'Max', 'Priority', 'Effective', 'Reorder', 'Actions'].map((header) => <th key={header} style={styles.th}>{ui(header)}</th>)}</tr></thead>
              <tbody>{parLevels.map((item) => <tr key={item.id}>
                <td style={styles.td}>{item.product_name || item.product_id}</td>
                <td style={styles.td}>{item.storage_location_name || '—'}</td>
                <td style={styles.td}>{item.department || '—'}</td>
                <td style={styles.td}>{formatQuantity(item.min_quantity)}</td>
                <td style={styles.td}>{formatQuantity(item.par_quantity)}</td>
                <td style={styles.td}>{item.max_quantity == null ? '—' : formatQuantity(item.max_quantity)}</td>
                <td style={styles.td}>{priorityLabel(item.replenishment_priority)}</td>
                <td style={styles.td}>{[item.effective_from ? formatLocalizedDate(item.effective_from, locale) : ui('Now'), item.effective_to ? formatLocalizedDate(item.effective_to, locale) : ui('Open')].join(' → ')}</td>
                <td style={styles.td}>{formatQuantity(item.reorder_quantity)}</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" style={styles.secondarySmallButton} disabled={!canWriteParLevels || isSaving} onClick={() => edit(item)}>{ui('Edit')}</button>
                    <button
                      type="button"
                      style={styles.secondarySmallButton}
                      disabled={!canCreateReplenishmentTask || !item.active || !item.storage_location_id || Boolean(creatingExecutionTaskParLevelId)}
                      onClick={() => onCreateExecutionTask(item.id)}
                      title={!canCreateReplenishmentTask
                        ? ui('Requires execution-task create, par-level read, and stock read permissions.')
                        : !item.active
                          ? ui('Only an active par level can create a replenishment execution task.')
                          : !item.storage_location_id
                            ? ui('A storage location is required before creating a replenishment execution task.')
                            : undefined}
                    >
                      {creatingExecutionTaskParLevelId === item.id ? ui('Creating task…') : ui('Create execution task')}
                    </button>
                  </div>
                </td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
