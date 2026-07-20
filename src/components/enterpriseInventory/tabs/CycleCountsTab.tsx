import type { FormEvent } from 'react';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime } from '../EnterpriseInventoryFormat';
import type { CycleCount, CycleCountForm, ProductOption, StockAdjustmentForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type CycleCountsTabProps = {
  cycleCountForm: CycleCountForm;
  onCycleCountFormChange: (updater: (current: CycleCountForm) => CycleCountForm) => void;
  onCycleCountSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isCreatingCycleCount: boolean;
  stockAdjustmentForm: StockAdjustmentForm;
  onStockAdjustmentFormChange: (updater: (current: StockAdjustmentForm) => StockAdjustmentForm) => void;
  onStockAdjustmentSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isAdjustingStock: boolean;
  products: ProductOption[];
  storageLocations: StorageLocationOption[];
  cycleCounts: CycleCount[];
  loading: boolean;
  isReconciling: boolean;
  onReconcile: (id: string) => void;
};

export function CycleCountsTab({
  cycleCountForm,
  onCycleCountFormChange,
  onCycleCountSubmit,
  isCreatingCycleCount,
  stockAdjustmentForm,
  onStockAdjustmentFormChange,
  onStockAdjustmentSubmit,
  isAdjustingStock,
  products,
  storageLocations,
  cycleCounts,
  loading,
  isReconciling,
  onReconcile
}: CycleCountsTabProps) {
  return (
    <section style={styles.grid}>
      <div style={styles.stack}>
        <form onSubmit={onCycleCountSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>Create cycle count</h2>
          <SelectField label="Storage location" value={cycleCountForm.storage_location_id} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} />
          <InputField label="Department" value={cycleCountForm.department} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, department: value }))} />
          <InputField label="Notes" value={cycleCountForm.notes} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, notes: value }))} />
          <SelectField label="Product" value={cycleCountForm.product_id} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
          <InputField label="Expected quantity" type="number" value={cycleCountForm.expected_quantity} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, expected_quantity: value }))} required />
          <InputField label="Counted quantity" type="number" value={cycleCountForm.counted_quantity} onChange={(value) => onCycleCountFormChange((current) => ({ ...current, counted_quantity: value }))} />
          <button type="submit" disabled={isCreatingCycleCount} style={styles.primaryButton}>Create cycle count</button>
        </form>

        <form onSubmit={onStockAdjustmentSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>Manual inventory adjustment</h2>
          <p style={styles.helper}>Posts to the existing /stock/adjust endpoint and records a stock movement.</p>
          <SelectField label="Product" value={stockAdjustmentForm.product_id} onChange={(value) => onStockAdjustmentFormChange((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
          <SelectField label="Storage location" value={stockAdjustmentForm.storage_location_id} onChange={(value) => onStockAdjustmentFormChange((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
          <InputField label="Quantity change" type="number" value={stockAdjustmentForm.change} onChange={(value) => onStockAdjustmentFormChange((current) => ({ ...current, change: value }))} required />
          <InputField label="Reason" value={stockAdjustmentForm.reason} onChange={(value) => onStockAdjustmentFormChange((current) => ({ ...current, reason: value }))} required />
          <button type="submit" disabled={isAdjustingStock} style={styles.primaryButton}>Post adjustment</button>
        </form>
      </div>

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
                  const canReconcile = ['draft', 'submitted', 'approved'].includes(item.status);
                  return (
                    <tr key={item.id}>
                      <td style={styles.td}>{item.status}</td>
                      <td style={styles.td}>{item.department || '-'}</td>
                      <td style={styles.td}>{item.notes || '-'}</td>
                      <td style={styles.td}>{formatDateTime(item.created_at)}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          disabled={!canReconcile || isReconciling}
                          style={canReconcile && !isReconciling ? styles.smallButton : styles.disabledButton}
                          title={!canReconcile ? 'Only draft, submitted, or approved cycle counts can be reconciled.' : isReconciling ? 'Reconciliation is already running.' : undefined}
                          onClick={() => onReconcile(item.id)}
                        >
                          Reconcile
                        </button>
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
