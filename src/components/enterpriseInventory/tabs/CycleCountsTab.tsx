import type { FormEvent } from 'react';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
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
  const canCreateCycleCounts = hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_WRITE);
  const canApproveCycleCounts = hasPermission(TENANT_PERMISSIONS.CYCLE_COUNTS_APPROVE);

  return (
    <section style={styles.stack}>
      <form onSubmit={onCycleCountSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Create cycle count</h2>
        <div style={styles.formGrid}>
          <SelectField label="Storage location" value={cycleCountForm.storage_location_id} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} disabled={!canCreateCycleCounts} />
          <InputField label="Department" value={cycleCountForm.department} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, department: value }))} disabled={!canCreateCycleCounts} />
          <InputField label="Notes" value={cycleCountForm.notes} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, notes: value }))} disabled={!canCreateCycleCounts} />
          <SelectField label="Product" value={cycleCountForm.product_id} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required disabled={!canCreateCycleCounts} />
          <InputField label="Expected quantity" type="number" value={cycleCountForm.expected_quantity} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, expected_quantity: value }))} required disabled={!canCreateCycleCounts} />
          <InputField label="Counted quantity" type="number" value={cycleCountForm.counted_quantity} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, counted_quantity: value }))} disabled={!canCreateCycleCounts} />
          <InputField label="Lot number" value={cycleCountForm.lot_number} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, lot_number: value }))} disabled={!canCreateCycleCounts} />
          <InputField label="Batch number" value={cycleCountForm.batch_number} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, batch_number: value }))} disabled={!canCreateCycleCounts} />
          <InputField label="Expiry date" type="date" value={cycleCountForm.expiry_date} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, expiry_date: value }))} disabled={!canCreateCycleCounts} />
          <label style={{ ...styles.field, gridColumn: '1 / -1' }}>
            <span style={styles.label}>Serial numbers counted</span>
            <textarea
              style={{ ...styles.textarea, minHeight: 90 }}
              value={cycleCountForm.serial_numbers}
              onChange={(event) => onCycleCountFormChange((current) => ({ ...current, serial_numbers: event.target.value }))}
              placeholder="One serial per line (required for serial-tracked counted stock)"
              disabled={!canCreateCycleCounts}
            />
          </label>
        </div>
        <button type="submit" disabled={isCreatingCycleCount || !canCreateCycleCounts} style={isCreatingCycleCount || !canCreateCycleCounts ? styles.disabledButton : styles.primaryButton} title={!canCreateCycleCounts ? `Requires ${TENANT_PERMISSIONS.CYCLE_COUNTS_WRITE} permission.` : undefined}>Create cycle count</button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Cycle counts</h2>
        {loading ? (
          <p style={styles.helper}>Loading…</p>
        ) : cycleCounts.length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Department</th>
                  <th style={styles.th}>Notes</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cycleCounts.map((item) => {
                  const canSubmitCount = canCreateCycleCounts && item.status === 'draft';
                  const canReconcile = canApproveCycleCounts && item.status === 'approved';
                  return (
                    <tr key={item.id}>
                      <td style={styles.td}>{item.status.replaceAll('_', ' ')}</td>
                      <td style={styles.td}>{item.department || '-'}</td>
                      <td style={styles.td}>{item.notes || '-'}</td>
                      <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                      <td style={styles.td}>
                        <div style={styles.actions}>
                          {item.status === 'draft' ? (
                            <button
                              type="button"
                              disabled={!canSubmitCount || isSubmitting}
                              style={canSubmitCount && !isSubmitting ? styles.smallButton : styles.disabledButton}
                              title={!canCreateCycleCounts ? `Requires ${TENANT_PERMISSIONS.CYCLE_COUNTS_WRITE} permission.` : undefined}
                              onClick={() => {
                                if (window.confirm('Submit this cycle count for approval?')) onSubmit(item.id);
                              }}
                            >
                              Submit
                            </button>
                          ) : null}
                          {item.status === 'approved' ? (
                            <button
                              type="button"
                              disabled={!canReconcile || isReconciling}
                              style={canReconcile && !isReconciling ? styles.smallButton : styles.disabledButton}
                              title={!canApproveCycleCounts ? `Requires ${TENANT_PERMISSIONS.CYCLE_COUNTS_APPROVE} permission.` : isReconciling ? 'Reconciliation is already running.' : undefined}
                              onClick={() => {
                                if (window.confirm('Reconcile this approved cycle count and post its stock changes?')) onReconcile(item.id);
                              }}
                            >
                              Reconcile
                            </button>
                          ) : null}
                          {item.status === 'pending_approval' ? <span style={styles.helper}>Waiting for approval</span> : null}
                          {!['draft', 'approved', 'pending_approval'].includes(item.status) ? <span style={styles.helper}>-</span> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={styles.helper}>No cycle counts yet.</p>
        )}
      </div>
    </section>
  );
}
