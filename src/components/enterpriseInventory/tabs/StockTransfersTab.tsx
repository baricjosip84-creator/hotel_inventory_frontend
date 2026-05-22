import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField, MetricCard, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type { ProductOption, StockTransfer, StockTransferForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type StockTransferCreateMutation = {
  isPending: boolean;
  mutate: (input: StockTransferForm) => void;
};

type StockTransferActionMutation = {
  isPending: boolean;
  mutate: (id: string) => void;
};

type StockTransfersQuery = {
  isLoading: boolean;
};

type StockTransferSummary = {
  draft: number;
  executed: number;
  cancelled: number;
  totalUnits: number;
};

type StockTransfersTabProps = {
  products: ProductOption[];
  storageLocations: StorageLocationOption[];
  stockTransferForm: StockTransferForm;
  setStockTransferForm: Dispatch<SetStateAction<StockTransferForm>>;
  stockTransferSummary: StockTransferSummary;
  stockTransfers: StockTransfer[];
  stockTransfersQuery: StockTransfersQuery;
  createStockTransferMutation: StockTransferCreateMutation;
  executeStockTransferMutation: StockTransferActionMutation;
  cancelStockTransferMutation: StockTransferActionMutation;
};

export function StockTransfersTab({
  products,
  storageLocations,
  stockTransferForm,
  setStockTransferForm,
  stockTransferSummary,
  stockTransfers,
  stockTransfersQuery,
  createStockTransferMutation,
  executeStockTransferMutation,
  cancelStockTransferMutation
}: StockTransfersTabProps) {
  const handleStockTransferSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createStockTransferMutation.mutate(stockTransferForm);
  };

  return (
    <section style={styles.grid}>
      <form onSubmit={handleStockTransferSubmit} style={styles.card}>
        <h2 style={styles.cardTitle}>Create internal stock transfer</h2>
        <p style={styles.helper}>Uses the real POST /stock-transfers route and creates a draft transfer with one product line.</p>
        <SelectField label="From location" value={stockTransferForm.from_storage_location_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, from_storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
        <SelectField label="To location" value={stockTransferForm.to_storage_location_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, to_storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
        <SelectField label="Product" value={stockTransferForm.product_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, product_id: value }))} options={products.map((product) => ({ value: product.id, label: product.name }))} required />
        <InputField label="Quantity" type="number" value={stockTransferForm.quantity} onChange={(value) => setStockTransferForm((current) => ({ ...current, quantity: value }))} required />
        <InputField label="Notes" value={stockTransferForm.notes} onChange={(value) => setStockTransferForm((current) => ({ ...current, notes: value }))} />
        <button type="submit" disabled={createStockTransferMutation.isPending} style={styles.primaryButton}>Create transfer draft</button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>Transfer execution controls</h2>
        <p style={styles.helper}>Uses the real GET /stock-transfers, POST /stock-transfers/:id/execute, and POST /stock-transfers/:id/cancel routes.</p>
        <div style={styles.metricsGrid}>
          <MetricCard label="Draft transfers" value={stockTransferSummary.draft} />
          <MetricCard label="Executed transfers" value={stockTransferSummary.executed} />
          <MetricCard label="Cancelled transfers" value={stockTransferSummary.cancelled} />
          <MetricCard label="Total transfer units" value={formatNumber(stockTransferSummary.totalUnits)} />
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['From', 'To', 'Status', 'Items', 'Quantity', 'Created', 'Executed', 'Actions'].map((header) => (
                  <th key={header} style={styles.th}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stockTransfersQuery.isLoading ? (
                <tr><td colSpan={8} style={styles.td}>Loading…</td></tr>
              ) : stockTransfers.length === 0 ? (
                <tr><td colSpan={8} style={styles.td}>No stock transfers yet.</td></tr>
              ) : stockTransfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td style={styles.td}>{transfer.from_storage_location_name || transfer.from_storage_location_id}</td>
                  <td style={styles.td}>{transfer.to_storage_location_name || transfer.to_storage_location_id}</td>
                  <td style={styles.td}>{transfer.status}</td>
                  <td style={styles.td}>{formatNumber(transfer.item_count)}</td>
                  <td style={styles.td}>{formatNumber(transfer.total_quantity)}</td>
                  <td style={styles.td}>{formatDateTime(transfer.created_at)}</td>
                  <td style={styles.td}>{formatDateTime(transfer.executed_at)}</td>
                  <td style={styles.td}>
                    {transfer.status === 'draft' ? (
                      <div style={styles.actionRow}>
                        <button type="button" onClick={() => executeStockTransferMutation.mutate(transfer.id)} disabled={executeStockTransferMutation.isPending} style={styles.smallButton}>Execute</button>
                        <button type="button" onClick={() => cancelStockTransferMutation.mutate(transfer.id)} disabled={cancelStockTransferMutation.isPending} style={styles.dangerButton}>Cancel</button>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
