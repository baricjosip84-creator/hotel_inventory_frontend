import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InputField, MetricCard, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { apiRequest } from '../../../lib/api';
import { useAppTranslation } from '../../../i18n/I18nContext';
import ProductUomSelect from '../../inventory/ProductUomSelect';
import type { ProductOption, StockItem, StockTransfer, StockTransferForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type UomResponse = {
  base_uom: string;
  conversions: Array<{ uom_code: string; factor_to_base: number | string }>;
};

type SerialRow = { id: string; serial_number: string; storage_location_id?: string | null; status: string };
type TrackingSettings = { serial_tracking_enabled: boolean };
type TransferOptionProduct = { id: string; name: string; unit?: string | null; available_quantity?: number | string | null; transferable?: boolean | null };
type TransferOptionsResponse = { products: TransferOptionProduct[]; locations?: Array<{ id: string; source_eligible?: boolean | null }> };

type StockTransferCreateMutation = {
  isPending: boolean;
  mutate: (input: StockTransferForm) => void;
};

type StockTransferActionMutation = {
  isPending: boolean;
  mutate: (input: { id: string; version: number | string }) => void;
};

type StockTransfersQuery = {
  isLoading: boolean;
};

type StockTransferServerSummary = {
  transfer_count: number | string;
  draft_count: number | string;
  executed_count: number | string;
  cancelled_count: number | string;
  item_count: number | string;
};

type StockTransfersTabProps = {
  products: ProductOption[];
  storageLocations: StorageLocationOption[];
  stockItems: StockItem[];
  stockTransferForm: StockTransferForm;
  setStockTransferForm: Dispatch<SetStateAction<StockTransferForm>>;
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

async function fetchAllOpenStockTransferDrafts(): Promise<StockTransfer[]> {
  const drafts: StockTransfer[] = [];
  let beforeCreatedAt = '';
  let beforeId = '';
  const seenCursors = new Set<string>();
  for (;;) {
    const params = new URLSearchParams({ status: 'draft', limit: '500' });
    if (beforeCreatedAt && beforeId) {
      params.set('before_created_at', beforeCreatedAt);
      params.set('before_id', beforeId);
    }
    const batch = await apiRequest<StockTransfer[]>(`/stock-transfers?${params.toString()}`);
    drafts.push(...batch);
    if (batch.length < 500) break;
    const last = batch[batch.length - 1];
    const cursor = `${last.created_at}:${last.id}`;
    if (seenCursors.has(cursor)) throw new Error('Stock Transfer draft pagination cursor did not advance');
    seenCursors.add(cursor);
    beforeCreatedAt = last.created_at;
    beforeId = last.id;
  }
  return drafts;
}

export function StockTransfersTab({
  products,
  storageLocations,
  stockItems,
  stockTransferForm,
  setStockTransferForm,
  stockTransfers,
  stockTransfersQuery,
  createStockTransferMutation,
  executeStockTransferMutation,
  cancelStockTransferMutation
}: StockTransfersTabProps) {
  const { ui } = useAppTranslation();
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

  const transferSummaryQuery = useQuery({
    queryKey: ['enterprise-stock-transfer-summary'],
    queryFn: () => apiRequest<StockTransferServerSummary>('/stock-transfers/summary')
  });
  const openDraftTransfersQuery = useQuery({
    queryKey: ['enterprise-stock-transfer-drafts-all'],
    queryFn: fetchAllOpenStockTransferDrafts
  });
  const transferLocationsQuery = useQuery({
    queryKey: ['enterprise-stock-transfer-location-options'],
    queryFn: () => apiRequest<TransferOptionsResponse>('/stock-transfers/options')
  });
  const transferOptionsQuery = useQuery({
    queryKey: ['enterprise-stock-transfer-options', stockTransferForm.from_storage_location_id],
    enabled: Boolean(stockTransferForm.from_storage_location_id),
    queryFn: () => apiRequest<TransferOptionsResponse>(`/stock-transfers/options?source_storage_location_id=${encodeURIComponent(stockTransferForm.from_storage_location_id)}`)
  });
  const sourceTransferProducts = useMemo(() => transferOptionsQuery.data?.products ?? [], [transferOptionsQuery.data]);
  const sourceEligibleLocationIds = useMemo(
    () => new Set((transferLocationsQuery.data?.locations || []).filter((location) => location.source_eligible !== false).map((location) => location.id)),
    [transferLocationsQuery.data]
  );
  const sourceLocationOptions = storageLocations
    .filter((location) => !transferLocationsQuery.data || sourceEligibleLocationIds.has(location.id))
    .map((location) => ({ value: location.id, label: location.name }));
  const selectedSourceProduct = sourceTransferProducts.find((item) => item.id === stockTransferForm.product_id) || null;
  const selectedAvailableQuantity = toFiniteNumber(selectedSourceProduct?.available_quantity);
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
  const quantityWithinSourceStock = Boolean(selectedSourceProduct && Number.isFinite(selectedBaseQuantity) && selectedBaseQuantity <= selectedAvailableQuantity + 0.0000001);
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

  const productOptions = sourceTransferProducts
    .filter((item) => item.transferable !== false || item.id === stockTransferForm.product_id)
    .map((item) => ({
      value: item.id,
      label: `${item.name || productNames.get(item.id) || ui('Product')} — ${formatQuantity(item.available_quantity, item.unit)} ${ui('available')}`
    }));

  const visibleTransfers = useMemo(() => {
    const byId = new Map<string, StockTransfer>();
    for (const transfer of openDraftTransfersQuery.data || []) byId.set(transfer.id, transfer);
    for (const transfer of stockTransfers) if (!byId.has(transfer.id)) byId.set(transfer.id, transfer);
    return [...byId.values()].sort((left, right) => {
      const timeDifference = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return timeDifference || String(right.id).localeCompare(String(left.id));
    });
  }, [openDraftTransfersQuery.data, stockTransfers]);

  const transferValidationMessage = !canCreateTransfers
    ? ui('Your current role cannot create stock transfers.')
    : !hasSourceLocation
      ? ui('Select a source location to load products with available stock.')
      : sourceTransferProducts.length === 0
        ? ui('No stocked products are available at the selected source location.')
        : !hasDestinationLocation
          ? ui('Select a destination location.')
          : !locationsDiffer
            ? ui('Source and destination locations must be different.')
            : !stockTransferForm.product_id
              ? ui('Select a product currently stocked at the source location.')
              : !hasValidQuantity
                ? ui('Enter a transfer quantity greater than zero.')
                : !quantityWithinSourceStock
                  ? `${ui('The converted quantity exceeds the')} ${formatQuantity(selectedAvailableQuantity, selectedSourceProduct?.unit)} ${ui('available at the selected source location.')}`
                  : !serialSelectionValid
                    ? `${ui('Select exactly')} ${expectedSerialCount >= 0 ? expectedSerialCount : ui('a whole-number quantity of')} ${ui('serial numbers for this serial-tracked transfer.')}`
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
      `${ui('Execute this stock transfer from')} ${transfer.from_storage_location_name || ui('Historical location unavailable')} ${ui('to')} ${transfer.to_storage_location_name || ui('Historical location unavailable')}?`
    );

    if (!confirmed) return;
    executeStockTransferMutation.mutate({ id: transfer.id, version: transfer.version });
  };

  const handleCancelTransfer = (transfer: StockTransfer) => {
    if (!canCancelTransfers) return;
    const confirmed = window.confirm(
      `${ui('Cancel this stock transfer from')} ${transfer.from_storage_location_name || ui('Historical location unavailable')} ${ui('to')} ${transfer.to_storage_location_name || ui('Historical location unavailable')}?`
    );

    if (!confirmed) return;
    cancelStockTransferMutation.mutate({ id: transfer.id, version: transfer.version });
  };

  return (
    <section style={styles.grid}>
      <form onSubmit={handleStockTransferSubmit} style={styles.card} data-skip-global-action-feedback="true">
        <h2 style={styles.cardTitle}>{ui("Create internal stock transfer")}</h2>
        <p style={styles.helper}>{ui("Create a draft internal transfer with one Product line. Stock moves only when the draft is executed.")}</p>
        <SelectField disabled={!canCreateTransfers || createStockTransferMutation.isPending} label={ui("From location")} value={stockTransferForm.from_storage_location_id} onChange={handleFromLocationChange} options={sourceLocationOptions} required />
        <SelectField disabled={!canCreateTransfers || createStockTransferMutation.isPending} label={ui("To location")} value={stockTransferForm.to_storage_location_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, to_storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
        <SelectField label={ui("Product")} value={stockTransferForm.product_id} onChange={handleProductChange} options={productOptions} required disabled={!canCreateTransfers || createStockTransferMutation.isPending || !hasSourceLocation || productOptions.length === 0} />
        <InputField label={ui("Quantity")} type="number" value={stockTransferForm.quantity} onChange={(value) => setStockTransferForm((current) => ({ ...current, quantity: value }))} required min="0.0001" disabled={!canCreateTransfers || createStockTransferMutation.isPending || !selectedSourceProduct} />
        <label style={styles.label}>{ui("Unit of measure")}<ProductUomSelect productId={stockTransferForm.product_id} value={stockTransferForm.uom_code} purpose="issue" onChange={(value) => setStockTransferForm((current) => ({ ...current, uom_code: value, serial_numbers: [] }))} disabled={!canCreateTransfers || createStockTransferMutation.isPending} style={styles.input} ariaLabel={ui("Transfer unit of measure")} /></label>
        {serialTrackingEnabled ? <div style={styles.field}><div style={styles.label}>{ui("Serial numbers")} ({stockTransferForm.serial_numbers.length}/{expectedSerialCount >= 0 ? expectedSerialCount : '?'})</div><div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #d8dee9', borderRadius: 8, padding: 8 }}>{(serialQuery.data || []).map((serial) => { const checked = stockTransferForm.serial_numbers.includes(serial.serial_number); return <label key={serial.id} style={{ display: 'block', marginBottom: 4 }}><input type="checkbox" checked={checked} onChange={(event) => setStockTransferForm((current) => ({ ...current, serial_numbers: event.target.checked ? [...current.serial_numbers, serial.serial_number] : current.serial_numbers.filter((value) => value !== serial.serial_number) }))} /> {serial.serial_number}</label>; })}{serialQuery.isLoading ? <span style={styles.helper}>{ui("Loading available serials…")}</span> : null}{!serialQuery.isLoading && !(serialQuery.data || []).length ? <span style={styles.helper}>{ui("No available serials found at this source location.")}</span> : null}</div></div> : null}
        {selectedSourceProduct ? <p style={styles.helper}>{ui("Available at source:")} {formatQuantity(selectedSourceProduct.available_quantity, selectedSourceProduct.unit)}</p> : null}
        {transferValidationMessage ? <p style={styles.muted}>{transferValidationMessage}</p> : null}
        <InputField disabled={!canCreateTransfers || createStockTransferMutation.isPending} label={ui("Notes")} value={stockTransferForm.notes} onChange={(value) => setStockTransferForm((current) => ({ ...current, notes: value }))} />
        <button type="submit" disabled={createStockTransferMutation.isPending || !canCreateTransferDraft} style={createStockTransferMutation.isPending || !canCreateTransferDraft ? styles.disabledButton : styles.primaryButton}>{ui("Create transfer draft")}</button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{ui("Transfer execution controls")}</h2>
        <p style={styles.helper}>{ui("Review transfer drafts and execute or cancel them with the permissions assigned to your role.")}</p>
        <p style={styles.helper}>{ui("All open transfer drafts are shown. Completed history here is limited to recent transfers.")} <a href="/stock-transfers">{ui("Open full Stock Transfers history")}</a></p>
        {openDraftTransfersQuery.isError ? <p style={styles.muted}>{ui("The complete open-draft list is unavailable. Use the full Stock Transfers page before assuming no draft exists.")}</p> : null}
        <div style={styles.metricsGrid}>
          <MetricCard label={ui("Draft transfers")} value={transferSummaryQuery.isLoading ? '…' : transferSummaryQuery.isError ? '—' : formatNumber(transferSummaryQuery.data?.draft_count)} />
          <MetricCard label={ui("Executed transfers")} value={transferSummaryQuery.isLoading ? '…' : transferSummaryQuery.isError ? '—' : formatNumber(transferSummaryQuery.data?.executed_count)} />
          <MetricCard label={ui("Cancelled transfers")} value={transferSummaryQuery.isLoading ? '…' : transferSummaryQuery.isError ? '—' : formatNumber(transferSummaryQuery.data?.cancelled_count)} />
          <MetricCard label={ui("Transfer line items")} value={transferSummaryQuery.isLoading ? '…' : transferSummaryQuery.isError ? '—' : formatNumber(transferSummaryQuery.data?.item_count)} />
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['From', 'To', 'Status', 'Items', 'Created', 'Executed', 'Actions'].map((header) => (
                  <th key={header} style={styles.th}>{ui(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stockTransfersQuery.isLoading && openDraftTransfersQuery.isLoading ? (
                <tr><td colSpan={7} style={styles.td}>{ui("Loading…")}</td></tr>
              ) : visibleTransfers.length === 0 ? (
                <tr><td colSpan={7} style={styles.td}>{ui("No stock transfers yet.")}</td></tr>
              ) : visibleTransfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td style={styles.td}>{transfer.from_storage_location_name || ui('Historical location unavailable')}</td>
                  <td style={styles.td}>{transfer.to_storage_location_name || ui('Historical location unavailable')}</td>
                  <td style={styles.td}>{ui(transfer.status === 'draft' ? 'Draft' : transfer.status === 'executed' ? 'Executed' : transfer.status === 'cancelled' ? 'Cancelled' : transfer.status)}</td>
                  <td style={styles.td}>{formatNumber(transfer.item_count)}</td>
                  <td style={styles.td}>{formatDateTime(transfer.created_at)}</td>
                  <td style={styles.td}>{formatDateTime(transfer.executed_at)}</td>
                  <td style={styles.td}>
                    {transfer.status === 'draft' ? (
                      <div style={styles.actionRow} data-skip-global-action-feedback="true">
                        <button type="button" onClick={() => handleExecuteTransfer(transfer)} disabled={!canExecuteTransfers || executeStockTransferMutation.isPending} title={!canExecuteTransfers ? ui('Your role cannot execute transfers.') : undefined} style={!canExecuteTransfers || executeStockTransferMutation.isPending ? styles.disabledButton : styles.smallButton}>{ui("Execute")}</button>
                        <button type="button" onClick={() => handleCancelTransfer(transfer)} disabled={!canCancelTransfers || cancelStockTransferMutation.isPending} title={!canCancelTransfers ? ui('Your role cannot cancel transfer drafts.') : undefined} style={!canCancelTransfers || cancelStockTransferMutation.isPending ? styles.disabledButton : styles.dangerButton}>{ui("Cancel")}</button>
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
