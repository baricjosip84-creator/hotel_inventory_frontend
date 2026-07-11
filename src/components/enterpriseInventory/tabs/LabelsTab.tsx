import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { DataTable, InputField, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDate, formatDateTime } from '../EnterpriseInventoryFormat';
import type { BarcodeLabel, BarcodeLabelForm, ProductOption } from '../EnterpriseInventoryTypes';

type BarcodeLabelsQuery = {
  isLoading: boolean;
  data?: BarcodeLabel[];
};

type CreateBarcodeLabelMutation = {
  isPending: boolean;
};

type LabelsTabProps = {
  barcodeLabelForm: BarcodeLabelForm;
  barcodeLabelsQuery: BarcodeLabelsQuery;
  createBarcodeLabelMutation: CreateBarcodeLabelMutation;
  products: ProductOption[];
  setBarcodeLabelForm: Dispatch<SetStateAction<BarcodeLabelForm>>;
  onBarcodeLabelSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function formatBarcodeType(value: string): string {
  if (value === 'CODE128') return 'Code 128';
  if (value === 'EAN13') return 'EAN-13';
  if (value === 'QR') return 'QR code';
  return value;
}

export function LabelsTab({
  barcodeLabelForm,
  barcodeLabelsQuery,
  createBarcodeLabelMutation,
  products,
  setBarcodeLabelForm,
  onBarcodeLabelSubmit
}: LabelsTabProps) {
  const canCreateLabel = Boolean(barcodeLabelForm.product_id) && !createBarcodeLabelMutation.isPending;

  return (
    <section style={styles.grid}>
      <form onSubmit={onBarcodeLabelSubmit} style={styles.card} data-skip-global-action-feedback="true">
        <h2 style={styles.cardTitle}>Create barcode label</h2>
        <SelectField
          label="Product"
          value={barcodeLabelForm.product_id}
          onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, product_id: value }))}
          options={products.map((product) => ({ value: product.id, label: product.name }))}
          required
        />
        <InputField label="Barcode value" value={barcodeLabelForm.barcode_value} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, barcode_value: value }))} />
        <p style={styles.helper}>Leave the barcode value blank to generate one automatically.</p>
        <SelectField
          label="Barcode type"
          value={barcodeLabelForm.barcode_type}
          onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, barcode_type: value }))}
          options={[
            { value: 'CODE128', label: 'Code 128' },
            { value: 'EAN13', label: 'EAN-13' },
            { value: 'QR', label: 'QR code' }
          ]}
          required
        />
        <InputField label="Label template" value={barcodeLabelForm.label_template} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, label_template: value }))} />
        <InputField label="Lot number" value={barcodeLabelForm.lot_number} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, lot_number: value }))} />
        <InputField label="Batch number" value={barcodeLabelForm.batch_number} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, batch_number: value }))} />
        <InputField label="Expiry date" type="date" value={barcodeLabelForm.expiry_date} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, expiry_date: value }))} />
        {!barcodeLabelForm.product_id ? <p style={styles.helper}>Select a product before creating a label.</p> : null}
        <button type="submit" disabled={!canCreateLabel} style={canCreateLabel ? styles.primaryButton : styles.disabledButton}>Create label</button>
      </form>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Barcode labels</h2>
        <DataTable
          loading={barcodeLabelsQuery.isLoading}
          empty="No barcode labels yet."
          headers={['Product', 'Barcode', 'Type', 'Lot', 'Batch', 'Expiry', 'Created']}
          rows={(barcodeLabelsQuery.data ?? []).map((item) => [
            item.product_name || item.product_id,
            item.barcode_value,
            formatBarcodeType(item.barcode_type),
            item.lot_number || '-',
            item.batch_number || '-',
            formatDate(item.expiry_date),
            formatDateTime(item.created_at)
          ])}
        />
      </section>
    </section>
  );
}
