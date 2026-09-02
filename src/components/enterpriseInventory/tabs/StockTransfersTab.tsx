import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InputField, MetricCard, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDateTime, formatNumber } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasAllPermissions, hasPermission } from '../../../lib/permissions';
import { apiRequest } from '../../../lib/api';
import { useAppTranslation } from '../../../i18n/I18nContext';
import ProductUomSelect from '../../inventory/ProductUomSelect';
import type { ProductOption, StockItem, StockTransfer, StockTransferForm, StorageLocationOption } from '../EnterpriseInventoryTypes';

type UomResponse = {
  base_uom: string;
  conversions: Array<{ uom_code: string; factor_to_base: number | string }>;
};

type SerialRow = { id: string; serial_number: string; storage_location_id?: string | null; status: string };
type TransferOptionProduct = { id: string; name: string; unit?: string | null; available_quantity?: number | string | null; stock_lot_reconciled?: boolean | null; transferable?: boolean | null; serial_tracking_enabled?: boolean };
type TransferOptionsResponse = { products: TransferOptionProduct[]; locations?: Array<{ id: string; name: string; source_eligible?: boolean | null }> };

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
  stockTransferForm,
  setStockTransferForm,
  stockTransfers,
  stockTransfersQuery,
  createStockTransferMutation,
  executeStockTransferMutation,
  cancelStockTransferMutation
}: StockTransfersTabProps) {
  const { ui } = useAppTranslation();
  const hasCreateTransferPermission = hasPermission(TENANT_PERMISSIONS.STOCK_TRANSFERS_CREATE);
  const hasExecuteTransferPermission = hasPermission(TENANT_PERMISSIONS.STOCK_TRANSFERS_EXECUTE);
  const hasTransferOperationalReads = hasAllPermissions([
    TENANT_PERMISSIONS.STOCK_READ,
    TENANT_PERMISSIONS.PRODUCTS_READ,
    TENANT_PERMISSIONS.STORAGE_LOCATIONS_READ
  ]);
  const canCreateTransfers = hasCreateTransferPermission && hasTransferOperationalReads;
  const canReadCurrentStock = hasPermission(TENANT_PERMISSIONS.STOCK_READ);
  const canExecuteTransfers = hasExecuteTransferPermission && canReadCurrentStock;
  const canCancelTransfers = hasPermission(TENANT_PERMISSIONS.STOCK_TRANSFERS_CANCEL);
  const productNames = useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);
  const selectedQuantity = toFiniteNumber(stockTransferForm.quantity);
  const uomQuery = useQuery({
    queryKey: ['stock-transfer-uom', stockTransferForm.product_id],
    enabled: Boolean(canCreateTransfers && stockTransferForm.product_id),
    queryFn: () => apiRequest<UomResponse>(`/inventory-capabilities/products/${stockTransferForm.product_id}/uom`)
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
    queryFn: () => apiRequest<TransferOptionsResponse>('/stock-transfers/options'),
    enabled: canCreateTransfers
  });
  const transferOptionsQuery = useQuery({
    queryKey: ['enterprise-stock-transfer-options', stockTransferForm.from_storage_location_id],
    enabled: Boolean(canCreateTransfers && stockTransferForm.from_storage_location_id),
    queryFn: () => apiRequest<TransferOptionsResponse>(`/stock-transfers/options?source_storage_location_id=${encodeURIComponent(stockTransferForm.from_storage_location_id)}`)
  });
  const sourceTransferProducts = useMemo(() => transferOptionsQuery.isSuccess ? (transferOptionsQuery.data?.products ?? []) : [], [transferOptionsQuery.isSuccess, transferOptionsQuery.data]);
  const sourceEligibleLocationIds = useMemo(
    () => new Set((transferLocationsQuery.data?.locations || []).filter((location) => location.source_eligible !== false).map((location) => location.id)),
    [transferLocationsQuery.data]
  );
  const transferLocations = transferLocationsQuery.isSuccess ? (transferLocationsQuery.data?.locations || []) : [];
  const sourceLocationOptions = transferLocations
    .filter((location) => sourceEligibleLocationIds.has(location.id))
    .map((location) => ({ value: location.id, label: location.name }));
  const destinationLocationOptions = transferLocations.map((location) => ({ value: location.id, label: location.name }));
  const selectedSourceProduct = sourceTransferProducts.find((item) => item.id === stockTransferForm.product_id) || null;
  const selectedAvailableQuantity = selectedSourceProduct?.available_quantity === null || selectedSourceProduct?.available_quantity === undefined
    ? null
    : toFiniteNumber(selectedSourceProduct.available_quantity);
  const hasSourceLocation = Boolean(stockTransferForm.from_storage_location_id);
  const hasDestinationLocation = Boolean(stockTransferForm.to_storage_location_id);
  const locationsDiffer = Boolean(
    hasSourceLocation &&
    hasDestinationLocation &&
    stockTransferForm.from_storage_location_id !== stockTransferForm.to_storage_location_id
  );
  const hasValidQuantity = selectedQuantity > 0;
  const selectedUomCode = stockTransferForm.uom_code.trim().toUpperCase();
  const uomEvidenceReady = Boolean(stockTransferForm.product_id && uomQuery.isSuccess);
  const uomFactor = uomEvidenceReady && selectedUomCode
    ? Number(uomQuery.data?.conversions.find((row) => row.uom_code.toUpperCase() === selectedUomCode)?.factor_to_base ?? (uomQuery.data?.base_uom?.toUpperCase() === selectedUomCode ? 1 : NaN))
    : uomEvidenceReady ? 1 : NaN;
  const uomSelectionValid = Number.isFinite(uomFactor);
  const selectedBaseQuantity = uomSelectionValid ? selectedQuantity * uomFactor : NaN;
  const quantityWithinSourceStock = Boolean(selectedSourceProduct && selectedAvailableQuantity !== null && Number.isFinite(selectedBaseQuantity) && selectedBaseQuantity <= selectedAvailableQuantity + 0.0000001);
  const serialTrackingEnabled = Boolean(selectedSourceProduct?.serial_tracking_enabled);
  const serialQuery = useQuery({
    queryKey: ['stock-transfer-serials', stockTransferForm.product_id, stockTransferForm.from_storage_location_id],
    enabled: Boolean(canCreateTransfers && stockTransferForm.product_id && stockTransferForm.from_storage_location_id && serialTrackingEnabled),
    queryFn: () => apiRequest<SerialRow[]>(`/inventory-capabilities/serials?product_id=${encodeURIComponent(stockTransferForm.product_id)}&status=available&storage_location_id=${encodeURIComponent(stockTransferForm.from_storage_location_id)}`)
  });
  const expectedSerialCount = Number.isInteger(selectedBaseQuantity) ? selectedBaseQuantity : -1;
  const serialEvidenceReady = !serialTrackingEnabled || serialQuery.isSuccess;
  const availableSerialNumbers = new Set((serialQuery.data || []).map((serial) => serial.serial_number));
  const selectedSerialsStillAvailable = !serialTrackingEnabled || stockTransferForm.serial_numbers.every((serialNumber) => availableSerialNumbers.has(serialNumber));
  const serialSelectionValid = serialEvidenceReady && selectedSerialsStillAvailable && (!serialTrackingEnabled || (expectedSerialCount >= 0 && stockTransferForm.serial_numbers.length === expectedSerialCount));
  const operationalEvidenceReady = transferLocationsQuery.isSuccess
    && (!hasSourceLocation || transferOptionsQuery.isSuccess)
    && (!stockTransferForm.product_id || uomEvidenceReady)
    && serialEvidenceReady;
  const canCreateTransferDraft = canCreateTransfers && Boolean(
    operationalEvidenceReady &&
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
      label: item.available_quantity === null || item.available_quantity === undefined
        ? `${item.name || productNames.get(item.id) || ui('Product')} — ${ui('Unavailable')}`
        : `${item.name || productNames.get(item.id) || ui('Product')} — ${formatQuantity(item.available_quantity, item.unit)} ${ui('available')}`
    }));
  const sourceAvailabilityEvidenceUnavailable = sourceTransferProducts.some((item) => item.stock_lot_reconciled === false);

  const visibleTransfers = useMemo(() => {
    const byId = new Map<string, StockTransfer>();
    for (const transfer of openDraftTransfersQuery.data || []) byId.set(transfer.id, transfer);
    for (const transfer of stockTransfers) if (!byId.has(transfer.id)) byId.set(transfer.id, transfer);
    return [...byId.values()].sort((left, right) => {
      const timeDifference = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return timeDifference || String(right.id).localeCompare(String(left.id));
    });
  }, [openDraftTransfersQuery.data, stockTransfers]);

  const transferValidationMessage = !hasCreateTransferPermission
    ? ui('Your current role cannot create stock transfers.')
    : !hasTransferOperationalReads
      ? ui('Your current role cannot access the product, location, and stock information required to create stock transfers.')
      : transferLocationsQuery.isLoading
        ? ui('Checking stock transfer locations…')
        : transferLocationsQuery.isError
          ? ui('Stock transfer location information is unavailable. Try again before creating a transfer.')
    : !hasSourceLocation
      ? ui('Select a source location to load products with available stock.')
      : transferOptionsQuery.isLoading
        ? ui('Checking products and stock at the selected source location…')
        : transferOptionsQuery.isError
          ? ui('Product and stock information is unavailable for the selected source location. Try again before creating a transfer.')
      : productOptions.length === 0 && sourceAvailabilityEvidenceUnavailable
        ? ui('Source stock and lot balances do not reconcile for one or more transfer items')
      : productOptions.length === 0
        ? ui('No stocked products are available at the selected source location.')
        : !hasDestinationLocation
          ? ui('Select a destination location.')
          : !locationsDiffer
            ? ui('Source and destination locations must be different.')
            : !stockTransferForm.product_id
              ? ui('Select a product currently stocked at the source location.')
              : selectedSourceProduct?.stock_lot_reconciled === false
                ? ui('Source stock and lot balances do not reconcile for one or more transfer items')
              : uomQuery.isLoading
                ? ui('Checking unit-of-measure information…')
                : uomQuery.isError
                  ? ui('Unit-of-measure information is unavailable. Try again before creating a transfer.')
                : !uomSelectionValid
                  ? ui('The selected unit of measure is no longer available for this Product. Choose a current transfer unit.')
              : !hasValidQuantity
                ? ui('Enter a transfer quantity greater than zero.')
                : !quantityWithinSourceStock
                  ? `${ui('The converted quantity exceeds the')} ${formatQuantity(selectedAvailableQuantity, selectedSourceProduct?.unit)} ${ui('available at the selected source location.')}`
                  : serialTrackingEnabled && serialQuery.isLoading
                    ? ui('Checking available serial numbers…')
                    : serialTrackingEnabled && serialQuery.isError
                      ? ui('Available serial-number information is unavailable. Try again before creating a transfer.')
                  : !selectedSerialsStillAvailable
                    ? ui('One or more selected serial numbers are no longer available at this source location. Choose from the current available serials.')
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
        <SelectField disabled={!canCreateTransfers || createStockTransferMutation.isPending || !transferLocationsQuery.isSuccess} label={ui("From location")} value={stockTransferForm.from_storage_location_id} onChange={handleFromLocationChange} options={sourceLocationOptions} required />
        <SelectField disabled={!canCreateTransfers || createStockTransferMutation.isPending || !transferLocationsQuery.isSuccess} label={ui("To location")} value={stockTransferForm.to_storage_location_id} onChange={(value) => setStockTransferForm((current) => ({ ...current, to_storage_location_id: value }))} options={destinationLocationOptions} required />
        <SelectField label={ui("Product")} value={stockTransferForm.product_id} onChange={handleProductChange} options={productOptions} required disabled={!canCreateTransfers || createStockTransferMutation.isPending || !hasSourceLocation || !transferOptionsQuery.isSuccess || productOptions.length === 0} />
        <InputField label={ui("Quantity")} type="number" value={stockTransferForm.quantity} onChange={(value) => setStockTransferForm((current) => ({ ...current, quantity: value }))} required min="0.0001" disabled={!canCreateTransfers || createStockTransferMutation.isPending || !selectedSourceProduct} />
        <label style={styles.label}>{ui("Unit of measure")}<ProductUomSelect productId={stockTransferForm.product_id} value={stockTransferForm.uom_code} purpose="issue" onChange={(value) => setStockTransferForm((current) => ({ ...current, uom_code: value, serial_numbers: [] }))} disabled={!canCreateTransfers || createStockTransferMutation.isPending || !stockTransferForm.product_id || !uomQuery.isSuccess} style={styles.input} ariaLabel={ui("Transfer unit of measure")} /></label>
        {serialTrackingEnabled ? <div style={styles.field}><div style={styles.label}>{ui("Serial numbers")} ({stockTransferForm.serial_numbers.length}/{expectedSerialCount >= 0 ? expectedSerialCount : '?'})</div><div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #d8dee9', borderRadius: 8, padding: 8 }}>{serialQuery.isSuccess ? (serialQuery.data || []).map((serial) => { const checked = stockTransferForm.serial_numbers.includes(serial.serial_number); return <label key={serial.id} style={{ display: 'block', marginBottom: 4 }}><input type="checkbox" checked={checked} onChange={(event) => setStockTransferForm((current) => ({ ...current, serial_numbers: event.target.checked ? [...current.serial_numbers, serial.serial_number] : current.serial_numbers.filter((value) => value !== serial.serial_number) }))} /> {serial.serial_number}</label>; }) : null}{serialQuery.isLoading ? <span style={styles.helper}>{ui("Checking available serial numbers…")}</span> : null}{serialQuery.isError ? <span style={styles.helper}>{ui("Available serial-number information is unavailable. Try again before creating a transfer.")}</span> : null}{serialQuery.isSuccess && !(serialQuery.data || []).length ? <span style={styles.helper}>{ui("No available serials found at this source location.")}</span> : null}</div></div> : null}
        {selectedSourceProduct ? <p style={styles.helper}>{ui("Available at source:")} {selectedSourceProduct.available_quantity === null || selectedSourceProduct.available_quantity === undefined ? ui('Unavailable') : formatQuantity(selectedSourceProduct.available_quantity, selectedSourceProduct.unit)}</p> : null}
        {transferValidationMessage ? <p style={styles.muted}>{transferValidationMessage}</p> : null}
        <InputField disabled={!canCreateTransfers || createStockTransferMutation.isPending} label={ui("Notes")} value={stockTransferForm.notes} onChange={(value) => setStockTransferForm((current) => ({ ...current, notes: value }))} />
        <button type="submit" disabled={createStockTransferMutation.isPending || !canCreateTransferDraft} style={createStockTransferMutation.isPending || !canCreateTransferDraft ? styles.disabledButton : styles.primaryButton}>{ui("Create transfer draft")}</button>
      </form>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>{ui("Transfer execution controls")}</h2>
        <p style={styles.helper}>{ui("Review transfer drafts and execute or cancel them with the permissions assigned to your role.")}</p>
        <p style={styles.helper}>{ui("All open transfer drafts are shown. Completed history here is limited to recent transfers.")} <a href="/stock-transfers">{ui("Open full Stock Transfers history")}</a></p>
        {stockTransfersQuery.isError ? <p style={styles.muted}>{ui("Recent stock transfer history is unavailable. Use the full Stock Transfers page before assuming no completed transfer exists.")}</p> : null}
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
              {visibleTransfers.length > 0 ? visibleTransfers.map((transfer) => (
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
                        <button type="button" onClick={() => handleExecuteTransfer(transfer)} disabled={!canExecuteTransfers || executeStockTransferMutation.isPending} title={!hasExecuteTransferPermission ? ui('Your role cannot execute transfers.') : !canReadCurrentStock ? ui('Your current role cannot access the current stock information required to execute transfers.') : undefined} style={!canExecuteTransfers || executeStockTransferMutation.isPending ? styles.disabledButton : styles.smallButton}>{ui("Execute")}</button>
                        <button type="button" onClick={() => handleCancelTransfer(transfer)} disabled={!canCancelTransfers || cancelStockTransferMutation.isPending} title={!canCancelTransfers ? ui('Your role cannot cancel transfer drafts.') : undefined} style={!canCancelTransfers || cancelStockTransferMutation.isPending ? styles.disabledButton : styles.dangerButton}>{ui("Cancel")}</button>
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              )) : stockTransfersQuery.isLoading || openDraftTransfersQuery.isLoading ? (
                <tr><td colSpan={7} style={styles.td}>{ui("Loading…")}</td></tr>
              ) : stockTransfersQuery.isError || openDraftTransfersQuery.isError ? (
                <tr><td colSpan={7} style={styles.td}>{ui("Stock transfer history is unavailable. Use the full Stock Transfers page before assuming no transfer exists.")}</td></tr>
              ) : (
                <tr><td colSpan={7} style={styles.td}>{ui("No stock transfers yet.")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
