import type { FormEvent } from 'react';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { SidebarAttentionMarker } from '../../ui/SidebarAttentionMarker';
import { sidebarAttentionItemStyle } from '../../ui/SidebarAttentionStyles';
import { useOperationalAttentionItems } from '../../../lib/sidebarAttentionItems';
import { formatLocalizedDateTime, formatLocalizedNumber } from '../../../i18n/formatters';
import type { CycleCount, CycleCountForm, ProductOption, StorageLocationOption } from '../EnterpriseInventoryTypes';

type CycleCountsTabProps = {
  cycleCountForm: CycleCountForm;
  onCycleCountFormChange: (updater: (current: CycleCountForm) => CycleCountForm) => void;
  onCycleCountSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isCreatingCycleCount: boolean;
  products: ProductOption[];
  storageLocations: StorageLocationOption[];
  cycleCounts: CycleCount[];
  loading: boolean;
  isSubmitting: boolean;
  onSubmit: (id: string) => void;
  isReconciling: boolean;
  onReconcile: (id: string) => void;
};

export function CycleCountsTab({
  cycleCountForm,
  onCycleCountFormChange,
  onCycleCountSubmit,
  isCreatingCycleCount,
  products,
  storageLocations,
  cycleCounts,
  loading,
  isSubmitting,
  onSubmit,
  isReconciling,
  onReconcile
}: CycleCountsTabProps) {
  const { locale, ui } = useAppTranslation();
  const canCreateCycleCounts = hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_WRITE);
  const canApproveCycleCounts = hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_APPROVE) && hasPermission(TENANT_PERMISSIONS.STOCK_ADJUST);
  const inventoryControlAttentionItemsQuery = useOperationalAttentionItems('inventory_controls', canApproveCycleCounts || hasPermission(TENANT_PERMISSIONS.APPROVALS_EXECUTE));
  const approvalAttentionKeys = new Set(inventoryControlAttentionItemsQuery.data?.approval_item_keys || []);
  const reconcileAttentionIds = new Set(inventoryControlAttentionItemsQuery.data?.cycle_count_reconcile_ids || []);
  const evidenceNumber = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === '') return '—';
    const parsed = Number(value);
    return Number.isFinite(parsed) ? formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 4 }) : '—';
  };
  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Draft',
      pending_approval: 'Pending approval',
      approved: 'Approved',
      rejected: 'Rejected',
      reconciled: 'Reconciled',
    };
    return labels[status] ? ui(labels[status]) : status;
  };

  return (
    <section style={styles.stack}>
      <form onSubmit={onCycleCountSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Create cycle count')}</h2>
        <div style={styles.formGrid}>
          <SelectField label={ui('Storage location')} value={cycleCountForm.storage_location_id} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required disabled={!canCreateCycleCounts} />
          <InputField label={ui('Department')} value={cycleCountForm.department} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, department: value }))} disabled={!canCreateCycleCounts} />
          <InputField label={ui('Notes')} value={cycleCountForm.notes} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, notes: value }))} disabled={!canCreateCycleCounts} />
          <SelectField label={ui('Product')} value={cycleCountForm.product_id} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required disabled={!canCreateCycleCounts} />
          <InputField label={ui('Counted quantity')} type="number" value={cycleCountForm.counted_quantity} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, counted_quantity: value }))} required disabled={!canCreateCycleCounts} />
          <InputField label={ui('Lot number')} value={cycleCountForm.lot_number} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, lot_number: value }))} disabled={!canCreateCycleCounts} />
          <InputField label={ui('Batch number')} value={cycleCountForm.batch_number} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, batch_number: value }))} disabled={!canCreateCycleCounts} />
          <InputField label={ui('Expiry date')} type="date" value={cycleCountForm.expiry_date} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, expiry_date: value }))} disabled={!canCreateCycleCounts} />
          <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
            <span style={styles.label}>{ui('Serial numbers counted')}</span>
            <textarea
              style={{ ...styles.textarea, minHeight: 90 }}
              value={cycleCountForm.serial_numbers}
              onChange={(event) => onCycleCountFormChange((current) => ({ ...current, serial_numbers: event.target.value }))}
              placeholder={ui('One serial per line (required for serial-tracked counted stock)')}
              disabled={!canCreateCycleCounts}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={isCreatingCycleCount || !canCreateCycleCounts}
          style={isCreatingCycleCount || !canCreateCycleCounts ? styles.disabledButton : styles.primaryButton}
          title={!canCreateCycleCounts ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.CYCLE_COUNTS_WRITE) : undefined}
        >
          {isCreatingCycleCount ? ui('Creating…') : ui('Create cycle count')}
        </button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{ui('Cycle counts')}</h2>
        {loading ? (
          <p style={styles.helper}>{ui('Loading…')}</p>
        ) : cycleCounts.length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{ui('Status')}</th>
                  <th style={styles.th}>{ui('Department')}</th>
                  <th style={styles.th}>{ui('Notes')}</th>
                  <th style={styles.th}>{ui('Details')}</th>
                  <th style={styles.th}>{ui('Created')}</th>
                  <th style={styles.th}>{ui('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {cycleCounts.map((item) => {
                  const evidence = item.items ?? [];
                  const hasTrustedEvidence = evidence.length > 0 && evidence.every((line) => line.counted_quantity !== null && line.counted_quantity !== undefined && line.snapshot_available !== false);
                  const canSubmitCount = canCreateCycleCounts && item.status === 'draft' && hasTrustedEvidence;
                  const canReconcile = canApproveCycleCounts && item.status === 'approved' && hasTrustedEvidence;
                  const causesSidebarAttention = approvalAttentionKeys.has(`cycle_count:${item.id}`) || reconcileAttentionIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      style={causesSidebarAttention ? sidebarAttentionItemStyle : undefined}
                      data-sidebar-attention-item={causesSidebarAttention ? "true" : undefined}
                    >
                      <td style={styles.td}>{statusLabel(item.status)}{causesSidebarAttention ? <div style={{ marginTop: 6 }}><SidebarAttentionMarker label={ui('Attention required')} /></div> : null}</td>
                      <td style={styles.td}>{item.department || '—'}</td>
                      <td style={styles.td}>{item.notes || '—'}</td>
                      <td style={styles.td}>
                        {evidence.length ? evidence.map((line, index) => {
                          return (
                            <div key={`${line.product_id}-${line.storage_location_id || index}`} style={index ? { marginTop: 8 } : undefined}>
                              <strong>{line.product_name || ui('Unknown product')}</strong>
                              <div style={styles.helper}>{line.storage_location_name || ui('Unknown location')}</div>
                              <div style={styles.helper}>{ui('Expected quantity')}: {evidenceNumber(line.expected_quantity)} · {ui('Counted quantity')}: {evidenceNumber(line.counted_quantity)} · {ui('Variance')}: {evidenceNumber(line.variance_quantity)}</div>
                              {line.lot_number ? <div style={styles.helper}>{ui('Lot number')}: {line.lot_number}</div> : null}
                              {line.batch_number ? <div style={styles.helper}>{ui('Batch number')}: {line.batch_number}</div> : null}
                              {line.serial_numbers?.length ? <div style={styles.helper}>{ui('Serial numbers counted')}: {formatLocalizedNumber(line.serial_numbers.length, locale)}</div> : null}
                              {line.snapshot_available === false ? <div style={styles.helper}>{ui('Not available')}</div> : null}
                            </div>
                          );
                        }) : '—'}
                      </td>
                      <td style={styles.td}>{formatLocalizedDateTime(item.created_at, locale)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {item.status === 'draft' ? (
                            <button
                              type="button"
                              disabled={!canSubmitCount || isSubmitting}
                              style={canSubmitCount && !isSubmitting ? styles.smallButton : styles.disabledButton}
                              title={!canCreateCycleCounts ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.CYCLE_COUNTS_WRITE) : undefined}
                              onClick={() => {
                                if (window.confirm(ui('Submit this cycle count for approval?'))) onSubmit(item.id);
                              }}
                            >
                              {isSubmitting ? ui('Submitting…') : ui('Submit')}
                            </button>
                          ) : null}
                          {item.status === 'approved' ? (
                            <button
                              type="button"
                              disabled={!canReconcile || isReconciling}
                              style={canReconcile && !isReconciling ? styles.smallButton : styles.disabledButton}
                              title={!hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_APPROVE) ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.CYCLE_COUNTS_APPROVE) : !hasPermission(TENANT_PERMISSIONS.STOCK_ADJUST) ? ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.STOCK_ADJUST) : isReconciling ? ui('Reconciliation is already running.') : undefined}
                              onClick={() => {
                                if (window.confirm(ui('Reconcile this approved cycle count and post its stock changes?'))) onReconcile(item.id);
                              }}
                            >
                              {isReconciling ? ui('Reconciling…') : ui('Reconcile')}
                            </button>
                          ) : null}
                          {item.status === 'pending_approval' ? <span style={styles.helper}>{ui('Waiting for approval')}</span> : null}
                          {!['draft', 'approved', 'pending_approval'].includes(item.status) ? <span style={styles.helper}>—</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={styles.helper}>{ui('No cycle counts yet.')}</p>
        )}
      </div>
    </section>
  );
}
