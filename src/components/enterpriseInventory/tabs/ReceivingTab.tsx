import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, MetricCard, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDateTime, formatNumber, toNumber } from '../EnterpriseInventoryFormat';
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
  return (
    <section style={styles.grid}>
      <div style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Shipment receiving controls</h2>
          <p style={styles.helper}>Uses the real GET /shipment-items/:shipmentId, GET /shipments/:shipmentId/barcode/:barcode, POST /shipments/:id/receive, and POST /shipments/:id/finalize routes with the selected shipment version.</p>
          <div style={styles.statGrid}>
            <MetricCard label="Active shipments" value={receivingSummary.activeShipments} />
            <MetricCard label="Partial receipts" value={receivingSummary.partiallyReceived} />
            <MetricCard label="Selected discrepancies" value={receivingSummary.discrepancyRows} />
            <MetricCard label="Remaining units" value={formatNumber(receivingSummary.remainingUnits)} />
          </div>
        </section>

        <form onSubmit={handleShipmentBarcodeLookupSubmit} style={styles.card}>
          <h2 style={styles.cardTitle}>Barcode receiving scanner</h2>
          <p style={styles.helper}>Uses the real GET /shipments/:shipmentId/barcode/:barcode route to resolve package barcodes against the selected shipment before posting receipt.</p>
          <InputField label="Package / product barcode" value={shipmentBarcodeScanForm.barcode} onChange={(value) => setShipmentBarcodeScanForm((current) => ({ ...current, barcode: value }))} required />
          <InputField label="Packages scanned" type="number" min="1" value={shipmentBarcodeScanForm.package_count} onChange={(value) => setShipmentBarcodeScanForm((current) => ({ ...current, package_count: value }))} required />
          <button type="submit" disabled={barcodeLookupMutation.isPending || !selectedReceivingShipment} style={styles.secondaryButton}>Resolve barcode</button>
          {lastBarcodeLookup ? (
            <div style={styles.metricCard}>
              <span style={styles.metricLabel}>Last barcode match</span>
              <strong style={styles.metricValue}>{lastBarcodeLookup.product_name || lastBarcodeLookup.product?.name || lastBarcodeLookup.product_id}</strong>
              <span style={styles.metricHelper}>Package: {lastBarcodeLookup.package?.package_name || '-'} · units/package {formatNumber(lastBarcodeLookup.package?.units_per_package)} · remaining {formatNumber(lastBarcodeLookup.calculated?.remaining_quantity ?? lastBarcodeLookup.remaining_quantity)}</span>
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
                discrepancy_reason: '',
                receiving_note: ''
              }));
              setLastBarcodeLookup(null);
              setShipmentBarcodeScanForm(emptyShipmentBarcodeScanForm);
            }}
            options={shipments
              .filter((shipment) => !['received', 'cancelled'].includes(shipment.status))
              .map((shipment) => ({ value: shipment.id, label: `${shipment.po_number || shipment.linked_purchase_order_number || shipment.id} · ${shipment.supplier_name || shipment.supplier_id} · ${shipment.status} · v${shipment.version}` }))}
            required
          />
          <SelectField
            label="Shipment item"
            value={shipmentReceivingForm.product_id}
            onChange={(value) => {
              const item = selectedShipmentItems.find((shipmentItem) => shipmentItem.product_id === value);
              setShipmentReceivingForm((current) => ({
                ...current,
                product_id: value,
                storage_location_id: item?.storage_location_id || current.storage_location_id
              }));
            }}
            options={selectedShipmentItems.map((item) => ({
              value: item.product_id,
              label: `${item.product_name || item.product_id} · ordered ${formatNumber(item.quantity)} · received ${formatNumber(item.received_quantity)}`
            }))}
            required
          />
          <SelectField label="Receive into location" value={shipmentReceivingForm.storage_location_id} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, storage_location_id: value }))} options={storageLocations.map((location) => ({ value: location.id, label: location.name }))} required />
          <InputField label="Quantity received" type="number" value={shipmentReceivingForm.quantity_received} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, quantity_received: value }))} required />
          <InputField label="Discrepancy reason" value={shipmentReceivingForm.discrepancy_reason} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, discrepancy_reason: value }))} />
          <InputField label="Receiving note" value={shipmentReceivingForm.receiving_note} onChange={(value) => setShipmentReceivingForm((current) => ({ ...current, receiving_note: value }))} />
          <button type="submit" disabled={receiveShipmentMutation.isPending || !selectedReceivingShipment} style={styles.primaryButton}>Post receipt</button>
        </form>
      </div>

      <div style={styles.stack}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Selected shipment lines</h2>
          <DataTable
            loading={shipmentItemsQuery.isLoading}
            empty={shipmentReceivingForm.shipment_id ? 'No shipment items found.' : 'Select a shipment to load its items.'}
            headers={['Product', 'Ordered', 'Received', 'Remaining', 'Discrepancy', 'Reason', 'Last received']}
            rows={selectedShipmentItems.map((item) => {
              const ordered = toNumber(item.quantity);
              const received = toNumber(item.received_quantity);
              return [
                item.product_name || item.product_id,
                formatNumber(item.quantity),
                formatNumber(item.received_quantity),
                formatNumber(Math.max(ordered - received, 0)),
                formatNumber(item.discrepancy),
                item.discrepancy_reason || '-',
                formatDateTime(item.last_received_at)
              ];
            })}
          />
          {selectedReceivingShipment && selectedReceivingShipment.status !== 'received' ? (
            <button type="button" onClick={() => finalizeShipmentMutation.mutate(selectedReceivingShipment)} disabled={finalizeShipmentMutation.isPending} style={styles.secondaryButton}>Finalize selected shipment</button>
          ) : null}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Shipment queue</h2>
          <DataTable
            loading={shipmentsQuery.isLoading}
            empty="No shipments found."
            headers={['Shipment', 'Supplier', 'Status', 'PO', 'Lines', 'Ordered', 'Received', 'Delivery', 'Version']}
            rows={shipments.map((shipment) => [
              shipment.id,
              shipment.supplier_name || shipment.supplier_id,
              shipment.status,
              shipment.po_number || shipment.linked_purchase_order_number || '-',
              formatNumber(shipment.line_count),
              formatNumber(shipment.total_ordered_quantity),
              formatNumber(shipment.total_received_quantity),
              shipment.delivery_date || '-',
              String(shipment.version)
            ])}
          />
        </section>
      </div>
    </section>
  );
}
