import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InputField, MetricCard, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { apiRequest } from '../../../lib/api';
import ProductUomSelect from '../../inventory/ProductUomSelect';
import type { ProductOption, StockItem, StockTransfer, StockTransferForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type UomResponse = {
  base_uom: string;
  conversions: Array<{ uom_code: string; factor_to_base: number | string }>;
};

type SerialRow = { id: string; serial_number: string; storage_location_id?: string | null; status: string };
type TrackingSettings = { serial_tracking_enabled: boolean };

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
  const canCreateTransfers = hasPermission(TENANT_PERMISSIONS.STOCK_TRANSFERS_CREATE);
  const canExecuteTransfers = hasPermission(TENANT_PERMISSIONS.STOCK_TRANSFERS_EXECUTE);
  const canCancelTransfers = hasPermission(TENANT_PERMISSIONS.STOCK_TRANSFERS_CANCEL);
  const productNames = useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);
  const selectedQuantity = toFiniteNumber(stockTransferForm.quantity);
  const uomQuery = useQuery({
    queryKey: ['stock-transfer-uom', stockTransferForm.product_id],
    enabled: Boolean(stockTransferForm.product_id),
    queryFn: () => apiRequest<UomResponse>(`/inventory-capabilities/products/${stockTransferForm.product_id}/uom`)
  });
  const trackingQuery = useQuery({
    queryKey: ['stock-transfer-tracking', stockTransferForm.product_id],
    enabled: Boolean(stockTransferForm.product_id),
    queryFn: () => apiRequest<TrackingSettings>(`/inventory-capabilities/products/${stockTransferForm.product_id}/serial-tracking`)
  });
  const serialQuery = useQuery({
    queryKey: ['stock-transfer-serials', stockTransferForm.product_id, stockTransferForm.from_storage_location_id],
    enabled: Boolean(stockTransferForm.product_id && stockTransferForm.from_storage_location_id && trackingQuery.data?.serial_tracking_enabled),
    queryFn: () => apiRequest<SerialRow[]>(`/inventory-capabilities/serials?product_id=${encodeURIComponent(stockTransferForm.product_id)}&status=available&storage_location_id=${encodeURIComponent(stockTransferForm.from_storage_location_id)}`)
  });

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
  const selectedUomCode = stockTransferForm.uom_code.trim().toUpperCase();
  const uomFactor = selectedUomCode
    ? Number(uomQuery.data?.conversions.find((row) => row.uom_code.toUpperCase() === selectedUomCode)?.factor_to_base ?? (uomQuery.data?.base_uom?.toUpperCase() === selectedUomCode ? 1 : NaN))
    : 1;
  const selectedBaseQuantity = Number.isFinite(uomFactor) ? selectedQuantity * uomFactor : NaN;
  const quantityWithinSourceStock = Boolean(selectedSourceStock && Number.isFinite(selectedBaseQuantity) && selectedBaseQuantity <= selectedAvailableQuantity + 0.0000001);
  const serialTrackingEnabled = Boolean(trackingQuery.data?.serial_tracking_enabled);
  const expectedSerialCount = Number.isInteger(selectedBaseQuantity) ? selectedBaseQuantity : -1;
  const serialSelectionValid = !serialTrackingEnabled || (expectedSerialCount >= 0 && stockTransferForm.serial_numbers.length === expectedSerialCount);
  const canCreateTransferDraft = canCreateTransfers && Boolean(
    locationsDiffer &&
    stockTransferForm.product_id &&
    hasValidQuantity &&
    quantityWithinSourceStock &&
    serialSelectionValid
  );

  const productOptions = sourceStockItems.map((item) => ({
    value: item.product_id,
    label: `${item.product_name || productNames.get(item.product_id) || item.product_id} — ${formatQuantity(item.quantity, item.product_unit)} available`
  }));

  const transferValidationMessage = !canCreateTransfers
    ? `Requires ${TENANT_PERMISSIONS.STOCK_TRANSFERS_CREATE} permission.`
    : !hasSourceLocation
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
                ? `The converted quantity exceeds the ${formatQuantity(selectedAvailableQuantity, selectedSourceStock?.product_unit)} available at the selected source location.`
                : !serialSelectionValid
                  ? `Select exactly ${expectedSerialCount >= 0 ? expectedSerialCount : 'a whole-number quantity of'} serial number${expectedSerialCount === 1 ? '' : 's'} for this serial-tracked transfer.`
                  : null;

  const handleStockTransferSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateTransfers || !canCreateTransferDraft || createStockTransferMutation.isPending) return;
    createStockTransferMutation.mutate(stockTransferForm);
  };

  const handleFromLocationChange = (value: string) => {
    setStockTransferForm((current) => ({
      ...current,
      from_storage_location_id: value,
      product_id: '',
      quantity: '',
      uom_code: '',
      serial_numbers: []
    }));
  };

  const handleProductChange = (value: string) => {
    setStockTransferForm((current) => ({
      ...current,
      product_id: value,
      quantity: '',
      uom_code: '',
      serial_numbers: []
    }));
  };

  const handleExecuteTransfer = (transfer: StockTransfer) => {
    if (!canExecuteTransfers) return;
    const confirmed = window.confirm(
      `Execute this stock transfer from ${transfer.from_storage_location_name || transfer.from_storage_location_id} to ${transfer.to_storage_location_name || transfer.to_storage_location_id}?`
    );

    if (!confirmed) return;
    executeStockTransferMutation.mutate(transfer.id);
  };

  const handleCancelTransfer = (transfer: StockTransfer) => {
    if (!canCancelTransfers) return;
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
        <SelectField disabled={!canCreateTransfers || createStockTransferMutation.isPending} label="From location" value={stockTransferForm.from_storage_location_id} onChange={handleFromLocationChange} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
        <SelectField disabled={!canCreateTransfers || createStockTransferMutation.isPending} label="To location" value={stockTransferForm.to_storage_location_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, to_storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
        <SelectField label="Product" value={stockTransferForm.product_id} onChange={handleProductChange} options={productOptions} required disabled={!canCreateTransfers || createStockTransferMutation.isPending || !hasSourceLocation || productOptions.length === 0} />
        <InputField label="Quantity" type="number" value={stockTransferForm.quantity} onChange={(value) => setStockTransferForm((current) => ({ ...current, quantity: value }))} required min="0.0001" disabled={!canCreateTransfers || createStockTransferMutation.isPending || !selectedSourceStock} />
        <label style={styles.label}>Unit of measure<ProductUomSelect productId={stockTransferForm.product_id} value={stockTransferForm.uom_code} purpose="issue" onChange={(value) => setStockTransferForm((current) => ({ ...current, uom_code: value, serial_numbers: [] }))} disabled={!canCreateTransfers || createStockTransferMutation.isPending} style={styles.input} ariaLabel="Transfer unit of measure" /></label>
        {serialTrackingEnabled ? <div style={styles.field}><div style={styles.label}>Serial numbers ({stockTransferForm.serial_numbers.length}/{expectedSerialCount >= 0 ? expectedSerialCount : '?'})</div><div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #d8dee9', borderRadius: 8, padding: 8 }}>{(serialQuery.data || []).map((serial) => { const checked = stockTransferForm.serial_numbers.includes(serial.serial_number); return <label key={serial.id} style={{ display: 'block', marginBottom: 4 }}><input type="checkbox" checked={checked} onChange={(event) => setStockTransferForm((current) => ({ ...current, serial_numbers: event.target.checked ? [...current.serial_numbers, serial.serial_number] : current.serial_numbers.filter((value) => value !== serial.serial_number) }))} /> {serial.serial_number}</label>; })}{serialQuery.isLoading ? <span style={styles.helper}>Loading available serials…</span> : null}{!serialQuery.isLoading && !(serialQuery.data || []).length ? <span style={styles.helper}>No available serials found at this source location.</span> : null}</div></div> : null}
        {selectedSourceStock ? <p style={styles.helper}>Available at source: {formatQuantity(selectedSourceStock.quantity, selectedSourceStock.product_unit)}</p> : null}
        {transferValidationMessage ? <p style={styles.muted}>{transferValidationMessage}</p> : null}
        <InputField disabled={!canCreateTransfers || createStockTransferMutation.isPending} label="Notes" value={stockTransferForm.notes} onChange={(value) => setStockTransferForm((current) => ({ ...current, notes: value }))} />
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
                        <button type="button" onClick={() => handleExecuteTransfer(transfer)} disabled={!canExecuteTransfers || executeStockTransferMutation.isPending} title={!canExecuteTransfers ? `Requires ${TENANT_PERMISSIONS.STOCK_TRANSFERS_EXECUTE} permission.` : undefined} style={!canExecuteTransfers || executeStockTransferMutation.isPending ? styles.disabledButton : styles.smallButton}>Execute</button>
                        <button type="button" onClick={() => handleCancelTransfer(transfer)} disabled={!canCancelTransfers || cancelStockTransferMutation.isPending} title={!canCancelTransfers ? `Requires ${TENANT_PERMISSIONS.STOCK_TRANSFERS_CANCEL} permission.` : undefined} style={!canCancelTransfers || cancelStockTransferMutation.isPending ? styles.disabledButton : styles.dangerButton}>Cancel</button>
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
