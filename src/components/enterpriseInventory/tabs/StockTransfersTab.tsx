import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useMemo } from 'react';
import { InputField, MetricCard, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import type { ProductOption, StockItem, StockTransfer, StockTransferForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

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
  stockItems: StockItem[];
  stockTransferForm: StockTransferForm;
  setStockTransferForm: Dispatch<SetStateAction<StockTransferForm>>;
  stockTransferSummary: StockTransferSummary;
  stockTransfers: StockTransfer[];
  stockTransfersQuery: StockTransfersQuery;
  createStockTransferMutation: StockTransferCreateMutation;
  executeStockTransferMutation: StockTransferActionMutation;
  cancelStockTransferMutation: StockTransferActionMutation;
};

function toFiniteNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatQuantity(value: number | string | null | undefined, unit?: string | null): string {
  const quantity = formatNumber(toFiniteNumber(value));
  return unit ? `${quantity} ${unit}` : quantity;
}

export function StockTransfersTab({
  products,
  storageLocations,
  stockItems,
  stockTransferForm,
  setStockTransferForm,
  stockTransferSummary,
  stockTransfers,
  stockTransfersQuery,
  createStockTransferMutation,
  executeStockTransferMutation,
  cancelStockTransferMutation
}: StockTransfersTabProps) {
  const productNames = useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);
  const selectedQuantity = toFiniteNumber(stockTransferForm.quantity);

  const sourceStockItems = useMemo(
    () => stockItems.filter((item) => (
      item.storage_location_id === stockTransferForm.from_storage_location_id &&
      toFiniteNumber(item.quantity) > 0
    )),
    [stockItems, stockTransferForm.from_storage_location_id]
  );

  const selectedSourceStock = sourceStockItems.find((item) => item.product_id === stockTransferForm.product_id) || null;
  const selectedAvailableQuantity = toFiniteNumber(selectedSourceStock?.quantity);
  const hasSourceLocation = Boolean(stockTransferForm.from_storage_location_id);
  const hasDestinationLocation = Boolean(stockTransferForm.to_storage_location_id);
  const locationsDiffer = Boolean(
    hasSourceLocation &&
    hasDestinationLocation &&
    stockTransferForm.from_storage_location_id !== stockTransferForm.to_storage_location_id
  );
  const hasValidQuantity = selectedQuantity > 0;
  const quantityWithinSourceStock = Boolean(selectedSourceStock && selectedQuantity <= selectedAvailableQuantity);
  const canCreateTransferDraft = Boolean(
    locationsDiffer &&
    stockTransferForm.product_id &&
    hasValidQuantity &&
    quantityWithinSourceStock
  );

  const productOptions = sourceStockItems.map((item) => ({
    value: item.product_id,
    label: `${item.product_name || productNames.get(item.product_id) || item.product_id} — ${formatQuantity(item.quantity, item.product_unit)} available`
  }));

  const transferValidationMessage = !hasSourceLocation
    ? 'Select a source location to load products with available stock.'
    : sourceStockItems.length === 0
      ? 'No stocked products are available at the selected source location.'
      : !hasDestinationLocation
        ? 'Select a destination location.'
        : !locationsDiffer
          ? 'Source and destination locations must be different.'
          : !stockTransferForm.product_id
            ? 'Select a product currently stocked at the source location.'
            : !hasValidQuantity
              ? 'Enter a transfer quantity greater than zero.'
              : !quantityWithinSourceStock
                ? `Only ${formatQuantity(selectedAvailableQuantity, selectedSourceStock?.product_unit)} is available at the selected source location.`
                : null;

  const handleStockTransferSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateTransferDraft || createStockTransferMutation.isPending) return;
    createStockTransferMutation.mutate(stockTransferForm);
  };

  const handleFromLocationChange = (value: string) => {
    setStockTransferForm((current) => ({
      ...current,
      from_storage_location_id: value,
      product_id: '',
      quantity: ''
    }));
  };

  const handleProductChange = (value: string) => {
    setStockTransferForm((current) => ({
      ...current,
      product_id: value,
      quantity: ''
    }));
  };

  const handleExecuteTransfer = (transfer: StockTransfer) => {
    const confirmed = window.confirm(
      `Execute this stock transfer from ${transfer.from_storage_location_name || transfer.from_storage_location_id} to ${transfer.to_storage_location_name || transfer.to_storage_location_id}?`
    );

    if (!confirmed) return;
    executeStockTransferMutation.mutate(transfer.id);
  };

  const handleCancelTransfer = (transfer: StockTransfer) => {
    const confirmed = window.confirm(
      `Cancel this stock transfer from ${transfer.from_storage_location_name || transfer.from_storage_location_id} to ${transfer.to_storage_location_name || transfer.to_storage_location_id}?`
    );

    if (!confirmed) return;
    cancelStockTransferMutation.mutate(transfer.id);
  };

  return (
    <section style={styles.grid}>
      <form onSubmit={handleStockTransferSubmit} style={styles.card} data-skip-global-action-feedback="true">
        <h2 style={styles.cardTitle}>Create internal stock transfer</h2>
        <p style={styles.helper}>Uses the real POST /stock-transfers route and creates a draft transfer with one product line.</p>
        <SelectField label="From location" value={stockTransferForm.from_storage_location_id} onChange={handleFromLocationChange} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
        <SelectField label="To location" value={stockTransferForm.to_storage_location_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, to_storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
        <SelectField label="Product" value={stockTransferForm.product_id} onChange={handleProductChange} options={productOptions} required disabled={!hasSourceLocation || productOptions.length === 0} />
        <InputField label="Quantity" type="number" value={stockTransferForm.quantity} onChange={(value) => setStockTransferForm((current) => ({ ...current, quantity: value }))} required min="0.0001" max={selectedSourceStock ? String(selectedAvailableQuantity) : undefined} disabled={!selectedSourceStock} />
        {selectedSourceStock ? <p style={styles.helper}>Available at source: {formatQuantity(selectedSourceStock.quantity, selectedSourceStock.product_unit)}</p> : null}
        {transferValidationMessage ? <p style={styles.muted}>{transferValidationMessage}</p> : null}
        <InputField label="Notes" value={stockTransferForm.notes} onChange={(value) => setStockTransferForm((current) => ({ ...current, notes: value }))} />
        <button type="submit" disabled={createStockTransferMutation.isPending || !canCreateTransferDraft} style={createStockTransferMutation.isPending || !canCreateTransferDraft ? styles.disabledButton : styles.primaryButton}>Create transfer draft</button>
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
                      <div style={styles.actionRow} data-skip-global-action-feedback="true">
                        <button type="button" onClick={() => handleExecuteTransfer(transfer)} disabled={executeStockTransferMutation.isPending} style={styles.smallButton}>Execute</button>
                        <button type="button" onClick={() => handleCancelTransfer(transfer)} disabled={cancelStockTransferMutation.isPending} style={styles.dangerButton}>Cancel</button>
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
