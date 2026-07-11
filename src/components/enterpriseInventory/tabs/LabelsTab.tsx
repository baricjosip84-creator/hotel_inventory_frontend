import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField, SelectField, styles } from '../EnterpriseInventoryShared';
import { formatDate, formatDateTime } from '../EnterpriseInventoryFormat';
import type { BarcodeLabel, BarcodeLabelForm, ProductOption } from '../EnterpriseInventoryTypes';
import {
  createBarcodeLabelSvgMarkup,
  generateBarcodeValue,
  normalizeBarcodeValue,
  svgMarkupToDataUri
} from '../../../lib/barcodeLabelSvg';
import type { BarcodeSymbology, PrintableBarcodeLabel } from '../../../lib/barcodeLabelSvg';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';

type BarcodeLabelsQuery = {
  isLoading: boolean;
  data?: BarcodeLabel[];
};

type CreateBarcodeLabelMutation = {
  isPending: boolean;
};

type RecordBarcodeLabelPrintsMutation = {
  isPending: boolean;
  mutate: (labelIds: string[]) => void;
};

type DeleteBarcodeLabelMutation = {
  isPending: boolean;
  mutate: (labelId: string) => void;
};

type LabelsTabProps = {
  barcodeLabelForm: BarcodeLabelForm;
  barcodeLabelsQuery: BarcodeLabelsQuery;
  createBarcodeLabelMutation: CreateBarcodeLabelMutation;
  recordBarcodeLabelPrintsMutation: RecordBarcodeLabelPrintsMutation;
  deleteBarcodeLabelMutation: DeleteBarcodeLabelMutation;
  products: ProductOption[];
  setBarcodeLabelForm: Dispatch<SetStateAction<BarcodeLabelForm>>;
  onBarcodeLabelSubmit: (event: FormEvent<HTMLFormElement>, effectiveBarcodeValue?: string) => void;
};

function formatBarcodeType(value: string): string {
  if (value === 'CODE128') return 'Code 128';
  if (value === 'EAN13') return 'EAN-13';
  if (value === 'QR') return 'QR code';
  return value;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'barcode-label';
}

function triggerSvgDownload(label: BarcodeLabel) {
  const markup = createBarcodeLabelSvgMarkup(label);
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${sanitizeFilename(label.product_name || 'product')}-${sanitizeFilename(label.barcode_value)}.svg`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function openPrintWindow(labels: BarcodeLabel[]): boolean {
  const popup = window.open('', '_blank', 'width=1000,height=760');
  if (!popup) return false;
  try {
    popup.opener = null;
  } catch {
    // Some browsers expose opener as read-only. Printing remains safe and user initiated.
  }

  const labelMarkup = labels.map((label) => (
    `<article class="label">${createBarcodeLabelSvgMarkup(label)}</article>`
  )).join('');

  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Inventory barcode labels</title><style>
    *{box-sizing:border-box}body{margin:0;padding:18px;font-family:Arial,sans-serif;background:#fff}.sheet{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;align-items:start}.label{break-inside:avoid;page-break-inside:avoid;display:flex;justify-content:center}.label svg{width:100%;height:auto;max-height:290px}@media print{body{padding:0}.sheet{gap:6mm}.label{page-break-inside:avoid}@page{margin:8mm}}
  </style></head><body><main class="sheet">${labelMarkup}</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));<\/script></body></html>`);
  popup.document.close();
  return true;
}

function labelTraceability(label: BarcodeLabel): string {
  const parts = [
    label.lot_number ? `Lot ${label.lot_number}` : '',
    label.batch_number ? `Batch ${label.batch_number}` : '',
    label.expiry_date ? `Expires ${formatDate(label.expiry_date)}` : ''
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Product identification only';
}

const previewImageStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  maxHeight: 330,
  objectFit: 'contain',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#ffffff'
};

export function LabelsTab({
  barcodeLabelForm,
  barcodeLabelsQuery,
  createBarcodeLabelMutation,
  recordBarcodeLabelPrintsMutation,
  deleteBarcodeLabelMutation,
  products,
  setBarcodeLabelForm,
  onBarcodeLabelSubmit
}: LabelsTabProps) {
  const barcodeType = barcodeLabelForm.barcode_type as BarcodeSymbology;
  const canWriteBarcodeLabels = hasPermission(TENANT_PERMISSIONS.BARCODE_LABELS_WRITE);
  const selectedProduct = products.find((product) => product.id === barcodeLabelForm.product_id) || null;
  const [generatedValue, setGeneratedValue] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);

  useEffect(() => {
    if (!barcodeLabelForm.product_id) {
      setGeneratedValue('');
      return;
    }
    setGeneratedValue(generateBarcodeValue(barcodeType));
  }, [barcodeLabelForm.product_id, barcodeType]);

  const preview = useMemo(() => {
    if (!selectedProduct) return { value: '', markup: '', error: null as string | null };
    try {
      const rawValue = barcodeLabelForm.barcode_value.trim() || generatedValue;
      const value = normalizeBarcodeValue(rawValue, barcodeType);
      const printable: PrintableBarcodeLabel = {
        product_name: selectedProduct.name,
        product_unit: selectedProduct.unit,
        barcode_value: value,
        barcode_type: barcodeType,
        label_template: barcodeLabelForm.label_template,
        lot_number: barcodeLabelForm.lot_number,
        batch_number: barcodeLabelForm.batch_number,
        expiry_date: barcodeLabelForm.expiry_date
      };
      return {
        value,
        markup: createBarcodeLabelSvgMarkup(printable),
        error: null as string | null
      };
    } catch (error) {
      return {
        value: '',
        markup: '',
        error: error instanceof Error ? error.message : 'Unable to preview this barcode.'
      };
    }
  }, [barcodeLabelForm, barcodeType, generatedValue, selectedProduct]);

  const labels = useMemo(() => barcodeLabelsQuery.data ?? [], [barcodeLabelsQuery.data]);
  useEffect(() => {
    const visibleIds = new Set(labels.map((label) => label.id));
    setSelectedLabelIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [labels]);

  const canCreateLabel = canWriteBarcodeLabels && Boolean(selectedProduct && preview.value && !preview.error) && !createBarcodeLabelMutation.isPending;
  const allSelected = labels.length > 0 && labels.every((label) => selectedLabelIds.includes(label.id));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    onBarcodeLabelSubmit(event, preview.value);
  };

  const handlePrint = (labelsToPrint: BarcodeLabel[]) => {
    if (!labelsToPrint.length) return;
    try {
      if (!openPrintWindow(labelsToPrint)) {
        window.alert('The browser blocked the print window. Allow pop-ups for this site and try again.');
        return;
      }
      recordBarcodeLabelPrintsMutation.mutate(labelsToPrint.map((label) => label.id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to prepare barcode labels for printing.');
    }
  };

  const toggleLabelSelection = (labelId: string) => {
    setSelectedLabelIds((current) => current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId]);
  };

  return (
    <section style={styles.stack}>
      <section style={styles.grid}>
        <form onSubmit={handleSubmit} style={styles.card} data-skip-global-action-feedback="true">
          <h2 style={styles.cardTitle}>Create printable barcode label</h2>
          <p style={{ ...styles.helper, marginBottom: 14 }}>
            Create an internal scannable label for a product, lot, batch, or expiry-controlled item.
          </p>
          <SelectField
            label="Product"
            value={barcodeLabelForm.product_id}
            onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, product_id: value }))}
            options={products.map((product) => ({ value: product.id, label: product.name }))}
            required
            disabled={!canWriteBarcodeLabels}
          />
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
            disabled={!canWriteBarcodeLabels}
          />
          <InputField
            label="Barcode value"
            value={barcodeLabelForm.barcode_value}
            onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, barcode_value: value }))}
            disabled={!canWriteBarcodeLabels}
          />
          <div style={{ ...styles.actions, marginBottom: 12 }}>
            <button
              type="button"
              style={canWriteBarcodeLabels && barcodeLabelForm.product_id ? styles.secondarySmallButton : styles.disabledButton}
              disabled={!canWriteBarcodeLabels || !barcodeLabelForm.product_id}
              onClick={() => setGeneratedValue(generateBarcodeValue(barcodeType))}
            >
              Generate another value
            </button>
          </div>
          <p style={{ ...styles.helper, marginBottom: 12 }}>
            Leave the field empty to use the generated value shown in the preview. EAN-13 accepts 12 digits and adds the check digit automatically.
          </p>
          <SelectField
            label="Label template"
            value={barcodeLabelForm.label_template}
            onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, label_template: value }))}
            options={[
              { value: 'default', label: 'Standard product label' },
              { value: 'compact', label: 'Compact item label' },
              { value: 'shelf', label: 'Shelf / bin label' }
            ]}
            required
            disabled={!canWriteBarcodeLabels}
          />
          <InputField label="Lot number" value={barcodeLabelForm.lot_number} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, lot_number: value }))} disabled={!canWriteBarcodeLabels} />
          <InputField label="Batch number" value={barcodeLabelForm.batch_number} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, batch_number: value }))} disabled={!canWriteBarcodeLabels} />
          <InputField label="Expiry date" type="date" value={barcodeLabelForm.expiry_date} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, expiry_date: value }))} disabled={!canWriteBarcodeLabels} />
          {!canWriteBarcodeLabels ? <p style={styles.helper}>You have read-only access to barcode labels.</p> : null}
          {canWriteBarcodeLabels && !barcodeLabelForm.product_id ? <p style={styles.helper}>Select a product before creating a label.</p> : null}
          {preview.error ? <p style={{ ...styles.helper, color: '#b91c1c' }}>{preview.error}</p> : null}
          <button type="submit" disabled={!canCreateLabel} style={canCreateLabel ? styles.primaryButton : styles.disabledButton}>
            {createBarcodeLabelMutation.isPending ? 'Creating…' : 'Create label'}
          </button>
        </form>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Label preview</h2>
          {preview.markup ? (
            <>
              <img src={svgMarkupToDataUri(preview.markup)} alt="Printable barcode label preview" style={previewImageStyle} />
              <p style={{ ...styles.helper, marginTop: 12 }}>
                This exact value will be saved and can be scanned in shipment receiving and barcode quick consume.
              </p>
              <p style={{ ...styles.muted, marginTop: 8 }}>{preview.value}</p>
            </>
          ) : (
            <p style={styles.helper}>Select a product to generate and preview a printable label.</p>
          )}
        </section>
      </section>

      <section style={styles.card} data-skip-global-action-feedback="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 style={{ ...styles.cardTitle, marginBottom: 4 }}>Saved barcode labels</h2>
            <p style={styles.helper}>Print, reprint, download, or retire operational labels.</p>
          </div>
          <button
            type="button"
            style={canWriteBarcodeLabels && selectedLabelIds.length && !recordBarcodeLabelPrintsMutation.isPending ? styles.primaryButton : styles.disabledButton}
            disabled={!canWriteBarcodeLabels || !selectedLabelIds.length || recordBarcodeLabelPrintsMutation.isPending}
            onClick={() => handlePrint(labels.filter((label) => selectedLabelIds.includes(label.id)))}
          >
            {recordBarcodeLabelPrintsMutation.isPending ? 'Preparing print…' : `Print selected (${selectedLabelIds.length})`}
          </button>
        </div>

        {barcodeLabelsQuery.isLoading ? <p style={styles.helper}>Loading…</p> : null}
        {!barcodeLabelsQuery.isLoading && !labels.length ? <p style={styles.helper}>No barcode labels yet.</p> : null}
        {!barcodeLabelsQuery.isLoading && labels.length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    <input
                      type="checkbox"
                      aria-label="Select all barcode labels"
                      checked={allSelected}
                      disabled={!canWriteBarcodeLabels}
                      onChange={() => setSelectedLabelIds(allSelected ? [] : labels.map((label) => label.id))}
                    />
                  </th>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Barcode</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Traceability</th>
                  <th style={styles.th}>Prints</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {labels.map((label) => (
                  <tr key={label.id}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${label.product_name || label.barcode_value}`}
                        checked={selectedLabelIds.includes(label.id)}
                        disabled={!canWriteBarcodeLabels}
                        onChange={() => toggleLabelSelection(label.id)}
                      />
                    </td>
                    <td style={styles.td}>
                      <strong>{label.product_name || label.product_id}</strong>
                      {label.product_unit ? <div style={styles.muted}>{label.product_unit}</div> : null}
                    </td>
                    <td style={{ ...styles.td, maxWidth: 240, wordBreak: 'break-all' }}>{label.barcode_value}</td>
                    <td style={styles.td}>{formatBarcodeType(label.barcode_type)}</td>
                    <td style={{ ...styles.td, minWidth: 190 }}>{labelTraceability(label)}</td>
                    <td style={styles.td}>
                      {Number(label.print_count || 0)}
                      {label.last_printed_at ? <div style={styles.muted}>Last {formatDateTime(label.last_printed_at)}</div> : null}
                    </td>
                    <td style={styles.td}>{formatDateTime(label.created_at)}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          type="button"
                          style={!canWriteBarcodeLabels || recordBarcodeLabelPrintsMutation.isPending ? styles.disabledButton : styles.smallButton}
                          disabled={!canWriteBarcodeLabels || recordBarcodeLabelPrintsMutation.isPending}
                          onClick={() => handlePrint([label])}
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          style={styles.secondarySmallButton}
                          onClick={() => {
                            try {
                              triggerSvgDownload(label);
                            } catch (error) {
                              window.alert(error instanceof Error ? error.message : 'Unable to download this label.');
                            }
                          }}
                        >
                          Download SVG
                        </button>
                        <button
                          type="button"
                          style={!canWriteBarcodeLabels || deleteBarcodeLabelMutation.isPending ? styles.disabledButton : styles.dangerButton}
                          disabled={!canWriteBarcodeLabels || deleteBarcodeLabelMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Delete barcode label ${label.barcode_value}? The retired code will stop resolving in scanners.`)) {
                              deleteBarcodeLabelMutation.mutate(label.id);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}
