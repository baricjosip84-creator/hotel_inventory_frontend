import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, MetricCard, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import { formatDate, formatDateTime, formatNumber, toNumber } from '../EnterpriseInventoryFormat';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import type {
  Shipment,
  ShipmentBarcodeLookup,
  ShipmentBarcodeScanForm,
  ShipmentItem,
  ShipmentReceivingForm,
  StorageLocationOption
} from '../EnterpriseInventoryTypes';

type LoadingQuery = {
  isLoading: boolean;
};

type PendingMutation = {
  isPending: boolean;
};

type ShipmentFinalizeMutation = PendingMutation & {
  mutate: (shipment: Shipment) => void;
};

type ReceivingSummary = {
  activeShipments: number;
  partiallyReceived: number;
  discrepancyRows: number;
  remainingUnits: number;
};



function formatInventoryLabelTraceability(label: ShipmentBarcodeLookup['label']): string {
  if (!label) return 'Product identification only';
  const details = [
    label.lot_number ? `Lot ${label.lot_number}` : '',
    label.batch_number ? `Batch ${label.batch_number}` : '',
    label.expiry_date ? `Expires ${formatDate(label.expiry_date)}` : ''
  ].filter(Boolean);
  return details.length ? details.join(' · ') : 'Product identification only';
}

function formatBarcodeMatchDetails(lookup: ShipmentBarcodeLookup): string {
  const remaining = formatNumber(lookup.calculated?.remaining_quantity ?? lookup.remaining_quantity);
  if (lookup.match_source === 'label' || lookup.label) {
    return `Inventory label · ${formatInventoryLabelTraceability(lookup.label)} · 1 base unit per scan · remaining ${remaining}`;
  }
  if (lookup.package) {
    return `Package ${lookup.package.package_name} · ${formatNumber(lookup.package.units_per_package)} units/package · remaining ${remaining}`;
  }
  return `Product barcode · 1 base unit per scan · remaining ${remaining}`;
}

function formatReceivingStatus(status: string | null | undefined): string {
  if (!status) return '-';
  return status
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function shortenReceivingIdentifier(value: string | null | undefined, visibleStart = 10, visibleEnd = 6): string {
  if (!value) return '-';
  if (value.length <= visibleStart + visibleEnd + 3) return value;
  return `${value.slice(0, visibleStart)}...${value.slice(-visibleEnd)}`;
}

function getShipmentReference(shipment: Shipment): string {
  return shipment.po_number || shipment.linked_purchase_order_number || shipment.id;
}

function formatShipmentOptionLabel(shipment: Shipment): string {
  return `${shortenReceivingIdentifier(getShipmentReference(shipment), 14, 6)} · ${shipment.supplier_name || shipment.supplier_id} · ${formatReceivingStatus(shipment.status)} · v${shipment.version}`;
}

type ReceivingTabProps = {
  barcodeLookupMutation: PendingMutation;
  emptyShipmentBarcodeScanForm: ShipmentBarcodeScanForm;
  finalizeShipmentMutation: ShipmentFinalizeMutation;
  handleShipmentBarcodeLookupSubmit: (event: FormEvent<HTMLFormElement>) => void;
  handleShipmentReceivingSubmit: (event: FormEvent<HTMLFormElement>) => void;
  lastBarcodeLookup: ShipmentBarcodeLookup | null;
  receiveShipmentMutation: PendingMutation;
  receivingSummary: ReceivingSummary;
  selectedReceivingShipment: Shipment | null;
  selectedShipmentItems: ShipmentItem[];
  setLastBarcodeLookup: Dispatch<SetStateAction<ShipmentBarcodeLookup | null>>;
  setShipmentBarcodeScanForm: Dispatch<SetStateAction<ShipmentBarcodeScanForm>>;
  setShipmentReceivingForm: Dispatch<SetStateAction<ShipmentReceivingForm>>;
  shipmentBarcodeScanForm: ShipmentBarcodeScanForm;
  shipmentItemsQuery: LoadingQuery;
  shipmentReceivingForm: ShipmentReceivingForm;
  shipments: Shipment[];
  shipmentsQuery: LoadingQuery;
  storageLocations: StorageLocationOption[];
};

export function ReceivingTab({
  barcodeLookupMutation,
  emptyShipmentBarcodeScanForm,
  finalizeShipmentMutation,
  handleShipmentBarcodeLookupSubmit,
  handleShipmentReceivingSubmit,
  lastBarcodeLookup,
  receiveShipmentMutation,
  receivingSummary,
  selectedReceivingShipment,
  selectedShipmentItems,
  setLastBarcodeLookup,
  setShipmentBarcodeScanForm,
  setShipmentReceivingForm,
  shipmentBarcodeScanForm,
  shipmentItemsQuery,
  shipmentReceivingForm,
  shipments,
  shipmentsQuery,
  storageLocations
}: ReceivingTabProps) {
  const canReceiveShipments = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_RECEIVE);
  const canFinalizeShipments = hasPermission(TENANT_PERMISSIONS.SHIPMENTS_FINALIZE);
  const canReadShipmentItems = hasPermission(TENANT_PERMISSIONS.SHIPMENT_ITEMS_READ);
  const barcodeLookupDisabledReason = !selectedReceivingShipment
    ? 'Select an active shipment before resolving a barcode.'
    : barcodeLookupMutation.isPending
      ? 'Barcode lookup is already running.'
      : '';
  const receiptDisabledReason = !canReceiveShipments
    ? `Requires ${TENANT_PERMISSIONS.SHIPMENTS_RECEIVE} permission.`
    : !selectedReceivingShipment
      ? 'Select an active shipment before posting a receipt.'
      : receiveShipmentMutation.isPending
        ? 'Receipt posting is already running.'
        : '';
  const activeShipmentOptions = shipments
    .filter((shipment) => !['received', 'cancelled'].includes(shipment.status))
    .map((shipment) => ({ value: shipment.id, label: formatShipmentOptionLabel(shipment) }));
  const noActiveShipments = !shipmentsQuery.isLoading && activeShipmentOptions.length === 0;

  return (
    <section style={styles.grid}>
      <div style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Shipment receiving controls</h2>
          <p style={styles.helper}>Monitor open receiving work, partial receipts, discrepancies, and remaining units for active shipments.</p>
          <div style={styles.statGrid}>
            <MetricCard label="Active shipments" value={receivingSummary.activeShipments} />
            <MetricCard label="Partial receipts" value={receivingSummary.partiallyReceived} />
            <MetricCard label="Selected discrepancies" value={receivingSummary.discrepancyRows} />
            <MetricCard label="Remaining units" value={formatNumber(receivingSummary.remainingUnits)} />
          </div>
        </section>

        <form onSubmit={handleShipmentBarcodeLookupSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>Barcode receiving scanner</h2>
          <p style={styles.helper}>Resolve product, package, or inventory-label barcodes against the selected active shipment before posting a receipt.</p>
          <InputField label="Product, package, or inventory-label barcode" value={shipmentBarcodeScanForm.barcode} onChange={(value) => setShipmentBarcodeScanForm((current) => ({ ...current, barcode: value }))} required disabled={!selectedReceivingShipment || barcodeLookupMutation.isPending} />
          <InputField label="Scan quantity" type="number" min="1" value={shipmentBarcodeScanForm.package_count} onChange={(value) => setShipmentBarcodeScanForm((current) => ({ ...current, package_count: value }))} required disabled={!selectedReceivingShipment || barcodeLookupMutation.isPending} />
          <p style={styles.helper}>For a package barcode, enter the number of packages. For a product or inventory-label barcode, enter the number of base units.</p>
          <button type="submit" disabled={barcodeLookupMutation.isPending || !selectedReceivingShipment} title={barcodeLookupDisabledReason || undefined} style={barcodeLookupDisabledReason ? styles.disabledButton : styles.secondaryButton}>Resolve barcode</button>
          {barcodeLookupDisabledReason ? <p style={styles.helper}>{barcodeLookupDisabledReason}</p> : null}
          {lastBarcodeLookup ? (
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Last barcode match</span>
              <strong style={styles.metricValue}>{lastBarcodeLookup.product_name || lastBarcodeLookup.product?.name || lastBarcodeLookup.product_id}</strong>
              <span style={styles.metricHelper}>{formatBarcodeMatchDetails(lastBarcodeLookup)}</span>
            </div>
          ) : null}
        </form>

        <form onSubmit={handleShipmentReceivingSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>Post receipt line</h2>
          <SelectField
            label="Shipment"
            value={shipmentReceivingForm.shipment_id}
            onChange={(value) => {
              setShipmentReceivingForm((current) => ({
                ...current,
                shipment_id: value,
                product_id: '',
                quantity_received: '',
                lot_number: '',
                batch_number: '',
                expiry_date: '',
                manufactured_at: '',
                shortage_quantity: '0',
                overage_quantity: '0',
                damaged_quantity: '0',
                rejected_quantity: '0',
                quarantine_quantity: '0',
                discrepancy_reason: '',
                receiving_note: ''
              }));
              setLastBarcodeLookup(null);
              setShipmentBarcodeScanForm(emptyShipmentBarcodeScanForm);
            }}
            options={activeShipmentOptions}
            required
            disabled={noActiveShipments}
          />
          {noActiveShipments ? <p style={styles.helper}>No active shipments are available for receiving.</p> : null}
          <SelectField
            label="Shipment item"
            value={shipmentReceivingForm.product_id}
            onChange={(value) => {
              const item = selectedShipmentItems.find((shipmentItem) => shipmentItem.product_id === value);
              setShipmentReceivingForm((current) => ({
                ...current,
                product_id: value,
                storage_location_id: item?.storage_location_id || current.storage_location_id,
                lot_number: item?.lot_number || '',
                batch_number: item?.batch_number || '',
                expiry_date: item?.expiry_date ? String(item.expiry_date).slice(0, 10) : '',
                manufactured_at: item?.manufactured_at ? String(item.manufactured_at).slice(0, 10) : ''
              }));
            }}
            options={selectedShipmentItems.map((item) => ({
              value: item.product_id,
              label: `${item.product_name || item.product_id} · ordered ${formatNumber(item.quantity)} · received ${formatNumber(item.received_quantity)}`
            }))}
            required
            disabled={!canReceiveShipments || !canReadShipmentItems || !selectedReceivingShipment || shipmentItemsQuery.isLoading}
          />
          {!canReadShipmentItems ? <p style={styles.helper}>Shipment-line selection requires {TENANT_PERMISSIONS.SHIPMENT_ITEMS_READ} permission. Barcode lookup remains available.</p> : null}
          <SelectField label="Receive into location" value={shipmentReceivingForm.storage_location_id} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required disabled={!canReceiveShipments || !selectedReceivingShipment} />
          <InputField label="Usable quantity received" type="number" min="0" value={shipmentReceivingForm.quantity_received} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, quantity_received: value }))} required disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <p style={styles.helper}>Usable quantity is added to available stock. Damaged, rejected and quarantined quantities are tracked separately and are not usable stock.</p>
          <InputField label="Lot number" value={shipmentReceivingForm.lot_number} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, lot_number: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Batch number" value={shipmentReceivingForm.batch_number} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, batch_number: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Manufactured date" type="date" value={shipmentReceivingForm.manufactured_at} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, manufactured_at: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Expiry date" type="date" value={shipmentReceivingForm.expiry_date} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, expiry_date: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Shortage quantity" type="number" min="0" value={shipmentReceivingForm.shortage_quantity} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, shortage_quantity: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Overage quantity" type="number" min="0" value={shipmentReceivingForm.overage_quantity} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, overage_quantity: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Damaged quantity" type="number" min="0" value={shipmentReceivingForm.damaged_quantity} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, damaged_quantity: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Rejected quantity" type="number" min="0" value={shipmentReceivingForm.rejected_quantity} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, rejected_quantity: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Quarantine quantity" type="number" min="0" value={shipmentReceivingForm.quarantine_quantity} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, quarantine_quantity: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Discrepancy reason" value={shipmentReceivingForm.discrepancy_reason} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, discrepancy_reason: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <InputField label="Receiving note" value={shipmentReceivingForm.receiving_note} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, receiving_note: value }))} disabled={!canReceiveShipments || !selectedReceivingShipment || receiveShipmentMutation.isPending} />
          <button type="submit" disabled={Boolean(receiptDisabledReason)} title={receiptDisabledReason || undefined} style={receiptDisabledReason ? styles.disabledButton : styles.primaryButton}>Post receipt</button>
          {receiptDisabledReason ? <p style={styles.helper}>{receiptDisabledReason}</p> : null}
        </form>
      </div>

      <div style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Selected shipment lines</h2>
          <DataTable
            loading={shipmentItemsQuery.isLoading}
            empty={shipmentReceivingForm.shipment_id ? 'No shipment items found.' : 'Select a shipment to load its items.'}
            headers={['Product', 'Ordered', 'Received', 'Remaining', 'Lot / batch / expiry', 'Exceptions', 'Discrepancy', 'Reason', 'Last received']}
            rows={selectedShipmentItems.map((item) => {
              const ordered = toNumber(item.quantity);
              const received = toNumber(item.received_quantity);
              return [
                item.product_name || item.product_id,
                formatNumber(item.quantity),
                formatNumber(item.received_quantity),
                formatNumber(Math.max(ordered - received, 0)),
                [item.lot_number ? `Lot ${item.lot_number}` : '', item.batch_number ? `Batch ${item.batch_number}` : '', item.expiry_date ? `Exp ${formatDate(item.expiry_date)}` : ''].filter(Boolean).join(' · ') || '-',
                `Short ${formatNumber(item.shortage_quantity)} · Over ${formatNumber(item.overage_quantity)} · Damaged ${formatNumber(item.damaged_quantity)} · Rejected ${formatNumber(item.rejected_quantity)} · Quarantine ${formatNumber(item.quarantine_quantity)}`,
                formatNumber(item.discrepancy),
                item.discrepancy_reason || '-',
                formatDateTime(item.last_received_at)
              ];
            })}
          />
          {selectedReceivingShipment && selectedReceivingShipment.status !== 'received' ? (
            <button
              type="button"
              onClick={() => { if (canFinalizeShipments) finalizeShipmentMutation.mutate(selectedReceivingShipment); }}
              disabled={!canFinalizeShipments || finalizeShipmentMutation.isPending}
              title={!canFinalizeShipments ? `Requires ${TENANT_PERMISSIONS.SHIPMENTS_FINALIZE} permission.` : finalizeShipmentMutation.isPending ? 'Finalization is already running.' : undefined}
              style={!canFinalizeShipments || finalizeShipmentMutation.isPending ? styles.disabledButton : styles.secondaryButton}
            >
              Finalize selected shipment
            </button>
          ) : null}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Shipment queue</h2>
          <DataTable
            loading={shipmentsQuery.isLoading}
            empty="No shipments found."
            headers={['Shipment', 'Supplier', 'Status', 'PO', 'Lines', 'Ordered', 'Received', 'Delivery', 'Version']}
            rows={shipments.map((shipment) => [
              shortenReceivingIdentifier(shipment.id),
              shipment.supplier_name || shipment.supplier_id,
              formatReceivingStatus(shipment.status),
              shortenReceivingIdentifier(shipment.po_number || shipment.linked_purchase_order_number, 14, 6),
              formatNumber(shipment.line_count),
              formatNumber(shipment.total_ordered_quantity),
              formatNumber(shipment.total_received_quantity),
              formatDate(shipment.delivery_date),
              String(shipment.version)
            ])}
          />
        </section>
      </div>
    </section>
  );
}
