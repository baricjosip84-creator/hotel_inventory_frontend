import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, Dispatch, FormEvent, SetStateAction } from 'react';
import { InputField, SelectField } from '../EnterpriseInventoryShared';
import { styles } from '../EnterpriseInventoryStyles';
import type { BarcodeLabel, BarcodeLabelForm, ProductOption } from '../EnterpriseInventoryTypes';
import {
  createBarcodeLabelSvgMarkup,
  generateBarcodeValue,
  normalizeBarcodeValue,
  svgMarkupToDataUri
} from '../../../lib/barcodeLabelSvg';
import type { BarcodeLabelPresentation, BarcodeSymbology, PrintableBarcodeLabel } from '../../../lib/barcodeLabelSvg';
import { TENANT_PERMISSIONS, hasPermission } from '../../../lib/permissions';
import { useAppTranslation } from '../../../i18n/I18nContext';
import { formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../../../i18n/formatters';

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

type Ui = (englishText: string) => string;

function formatBarcodeType(value: string, ui: Ui): string {
  if (value === 'CODE128') return ui('Code 128');
  if (value === 'EAN13') return ui('EAN-13');
  if (value === 'QR') return ui('QR code');
  return value;
}

function barcodeValueHelp(type: BarcodeSymbology, ui: Ui): string {
  if (type === 'EAN13') {
    return ui('Leave this empty to generate a valid EAN-13 value. You may also enter 12 digits and the check digit will be added automatically, or enter a complete valid 13-digit value.');
  }
  if (type === 'QR') {
    return ui('Leave this empty to generate an internal QR value, or enter the exact text you want the QR code to contain.');
  }
  return ui('Leave this empty to generate an internal Code 128 value, or enter your own printable barcode value.');
}

function localizeBarcodeError(error: unknown, ui: Ui): string {
  if (!(error instanceof Error)) return ui('Unable to preview this barcode.');
  switch (error.message) {
    case 'EAN-13 requires 12 digits before the check digit.': return ui('EAN-13 requires 12 digits before the check digit.');
    case 'EAN-13 must contain 12 or 13 digits.': return ui('EAN-13 must contain 12 or 13 digits.');
    case 'EAN-13 check digit is invalid.': return ui('EAN-13 check digit is invalid.');
    case 'Barcode value is required.': return ui('Barcode value is required.');
    case 'Code 128 supports printable letters, numbers, and symbols only.': return ui('Code 128 supports printable letters, numbers, and symbols only.');
    case 'Code 128 supports printable ASCII characters only.': return ui('Code 128 supports printable ASCII characters only.');
    case 'Unable to encode Code 128 value.': return ui('Unable to encode Code 128 value.');
    default: return error.message;
  }
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'barcode-label';
}

function triggerSvgDownload(label: BarcodeLabel, presentation: BarcodeLabelPresentation) {
  const markup = createBarcodeLabelSvgMarkup(label, presentation);
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

function openPrintWindow(labels: BarcodeLabel[], presentation: BarcodeLabelPresentation, documentTitle: string): boolean {
  const popup = window.open('', '_blank', 'width=1000,height=760');
  if (!popup) return false;
  try {
    popup.opener = null;
  } catch {
    // Some browsers expose opener as read-only. Printing remains safe and user initiated.
  }

  const labelMarkup = labels.map((label) => (
    `<article class="label label-${String(label.barcode_type || 'CODE128').toLowerCase()}">${createBarcodeLabelSvgMarkup(label, presentation)}</article>`
  )).join('');

  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${documentTitle.replace(/[&<>"']/g, '')}</title><style>
    *{box-sizing:border-box}body{margin:0;padding:18px;font-family:Arial,sans-serif;background:#fff}.sheet{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;align-items:start}.label{break-inside:avoid;page-break-inside:avoid;display:flex;justify-content:center}.label svg{width:auto;height:auto;max-width:100%;max-height:330px}.label-code128{grid-column:1/-1}.label-code128 svg{width:min(100%,760px)}@media print{body{padding:0}.sheet{gap:6mm}.label{page-break-inside:avoid}.label-code128{grid-column:1/-1}.label-code128 svg{width:105mm;max-height:none}.label-ean13 svg{width:75mm;max-height:none}.label-qr svg{width:60mm;max-height:none}@page{margin:8mm}}
  </style></head><body><main class="sheet">${labelMarkup}</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150));</script></body></html>`);
  popup.document.close();
  return true;
}

function labelTraceability(label: BarcodeLabel, locale: Parameters<typeof formatLocalizedDate>[1], ui: Ui): string {
  const parts = [
    label.lot_number ? ui('Lot {value}').replace('{value}', label.lot_number) : '',
    label.batch_number ? ui('Batch {value}').replace('{value}', label.batch_number) : '',
    label.expiry_date ? ui('Expires {date}').replace('{date}', formatLocalizedDate(label.expiry_date, locale)) : ''
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : ui('Product identification only');
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
  const { locale, ui } = useAppTranslation();
  const barcodeType = barcodeLabelForm.barcode_type as BarcodeSymbology;
  const canWriteBarcodeLabels = hasPermission(TENANT_PERMISSIONS.BARCODE_LABELS_WRITE);
  const selectedProduct = products.find((product) => product.id === barcodeLabelForm.product_id) || null;
  const [generatedValue, setGeneratedValue] = useState('');
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const barcodePresentation = useMemo<BarcodeLabelPresentation>(() => ({
    ariaLabel: ui('Printable inventory barcode label'),
    inventoryProduct: ui('Inventory product'),
    lotLabel: ui('Lot'),
    batchLabel: ui('Batch'),
    expiryLabel: ui('Expiry'),
    locale,
    code128AriaLabel: ui('Code 128 barcode'),
    ean13AriaLabel: ui('EAN-13 barcode'),
    qrAriaLabel: ui('QR barcode'),
  }), [locale, ui]);

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
        markup: createBarcodeLabelSvgMarkup(printable, barcodePresentation),
        error: null as string | null
      };
    } catch (error) {
      return {
        value: '',
        markup: '',
        error: localizeBarcodeError(error, ui)
      };
    }
  }, [barcodeLabelForm, barcodePresentation, barcodeType, generatedValue, selectedProduct, ui]);

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
      if (!openPrintWindow(labelsToPrint, barcodePresentation, ui('Inventory barcode labels'))) {
        window.alert(ui('The browser blocked the print window. Allow pop-ups for this site and try again.'));
        return;
      }
      recordBarcodeLabelPrintsMutation.mutate(labelsToPrint.map((label) => label.id));
    } catch (error) {
      window.alert(error instanceof Error ? localizeBarcodeError(error, ui) : ui('Unable to prepare barcode labels for printing.'));
    }
  };

  const toggleLabelSelection = (labelId: string) => {
    setSelectedLabelIds((current) => current.includes(labelId)
      ? current.filter((id) => id !== labelId)
      : [...current, labelId]);
  };

  return (
    <section style={styles.stack}>
      <section className="inventory-controls-grid" style={styles.grid}>
        <form onSubmit={handleSubmit} style={styles.card} data-skip-global-action-feedback="true">
          <h2 style={styles.cardTitle}>{ui('Create printable barcode label')}</h2>
          <p style={{ ...styles.helper, marginBottom: 14 }}>
            {ui('Create an internal scannable label for a product, lot, batch, or expiry-controlled item.')}
          </p>
          <SelectField
            label={ui('Product')}
            value={barcodeLabelForm.product_id}
            onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, product_id: value }))}
            options={products.map((product) => ({ value: product.id, label: product.name }))}
            required
            disabled={!canWriteBarcodeLabels}
          />
          <SelectField
            label={ui('Barcode type')}
            value={barcodeLabelForm.barcode_type}
            onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, barcode_type: value }))}
            options={[
              { value: 'CODE128', label: ui('Code 128') },
              { value: 'EAN13', label: ui('EAN-13') },
              { value: 'QR', label: ui('QR code') }
            ]}
            required
            disabled={!canWriteBarcodeLabels}
          />
          <InputField
            label={ui('Barcode value')}
            value={barcodeLabelForm.barcode_value}
            onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, barcode_value: value }))}
            disabled={!canWriteBarcodeLabels}
          />
          <div style={{ ...styles.actions, marginBottom: 12 }}>
            <button
              type="button"
              style={canWriteBarcodeLabels && barcodeLabelForm.product_id ? styles.secondarySmallButton : styles.disabledButton}
              disabled={!canWriteBarcodeLabels || !barcodeLabelForm.product_id}
              onClick={() => {
                setBarcodeLabelForm((current) => ({ ...current, barcode_value: '' }));
                setGeneratedValue(generateBarcodeValue(barcodeType));
              }}
            >
              {ui('Generate another value')}
            </button>
          </div>
          <p style={{ ...styles.helper, marginBottom: 12 }}>
            {barcodeValueHelp(barcodeType, ui)}
          </p>
          <SelectField
            label={ui('Label template')}
            value={barcodeLabelForm.label_template}
            onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, label_template: value }))}
            options={[
              { value: 'default', label: ui('Standard product label') },
              { value: 'compact', label: ui('Compact item label') },
              { value: 'shelf', label: ui('Shelf / bin label') }
            ]}
            required
            disabled={!canWriteBarcodeLabels}
          />
          <InputField label={ui('Lot number')} value={barcodeLabelForm.lot_number} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, lot_number: value }))} disabled={!canWriteBarcodeLabels} />
          <InputField label={ui('Batch number')} value={barcodeLabelForm.batch_number} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, batch_number: value }))} disabled={!canWriteBarcodeLabels} />
          <InputField label={ui('Expiry date')} type="date" value={barcodeLabelForm.expiry_date} onChange={(value) => setBarcodeLabelForm((current) => ({ ...current, expiry_date: value }))} disabled={!canWriteBarcodeLabels} />
          {!canWriteBarcodeLabels ? <p style={styles.helper}>{ui('You have read-only access to barcode labels.')}</p> : null}
          {canWriteBarcodeLabels && !barcodeLabelForm.product_id ? <p style={styles.helper}>{ui('Select a product before creating a label.')}</p> : null}
          {preview.error ? <p style={{ ...styles.helper, color: '#b91c1c' }}>{preview.error}</p> : null}
          <button type="submit" disabled={!canCreateLabel} style={canCreateLabel ? styles.primaryButton : styles.disabledButton}>
            {createBarcodeLabelMutation.isPending ? ui('Creating…') : ui('Create label')}
          </button>
        </form>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{ui('Label preview')}</h2>
          {preview.markup ? (
            <>
              <img src={svgMarkupToDataUri(preview.markup)} alt={ui('Printable barcode label preview')} style={previewImageStyle} />
              <p style={{ ...styles.helper, marginTop: 12 }}>
                {ui('This exact value will be saved and can be scanned in shipment receiving and barcode quick consume.')}
              </p>
              <p style={{ ...styles.muted, marginTop: 8 }}>{preview.value}</p>
            </>
          ) : (
            <p style={styles.helper}>{ui('Select a product to generate and preview a printable label.')}</p>
          )}
        </section>
      </section>

      <section style={styles.card} data-skip-global-action-feedback="true">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 style={{ ...styles.cardTitle, marginBottom: 4 }}>{ui('Saved barcode labels')}</h2>
            <p style={styles.helper}>{ui('Open browser print dialogs, download SVG files, or retire labels. Print requests count dialog openings; browsers cannot confirm physical printing.')}</p>
          </div>
          <button
            type="button"
            style={canWriteBarcodeLabels && selectedLabelIds.length && !recordBarcodeLabelPrintsMutation.isPending ? styles.primaryButton : styles.disabledButton}
            disabled={!canWriteBarcodeLabels || !selectedLabelIds.length || recordBarcodeLabelPrintsMutation.isPending}
            onClick={() => handlePrint(labels.filter((label) => selectedLabelIds.includes(label.id)))}
          >
            {recordBarcodeLabelPrintsMutation.isPending
              ? ui('Preparing print…')
              : ui('Print selected ({count})').replace('{count}', formatLocalizedNumber(selectedLabelIds.length, locale))}
          </button>
        </div>

        {barcodeLabelsQuery.isLoading ? <p style={styles.helper}>{ui('Loading…')}</p> : null}
        {!barcodeLabelsQuery.isLoading && !labels.length ? <p style={styles.helper}>{ui('No barcode labels yet.')}</p> : null}
        {!barcodeLabelsQuery.isLoading && labels.length ? (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    <input
                      type="checkbox"
                      aria-label={ui('Select all barcode labels')}
                      checked={allSelected}
                      disabled={!canWriteBarcodeLabels}
                      onChange={() => setSelectedLabelIds(allSelected ? [] : labels.map((label) => label.id))}
                    />
                  </th>
                  <th style={styles.th}>{ui('Product')}</th>
                  <th style={styles.th}>{ui('Barcode')}</th>
                  <th style={styles.th}>{ui('Type')}</th>
                  <th style={styles.th}>{ui('Traceability')}</th>
                  <th style={styles.th}>{ui('Print requests')}</th>
                  <th style={styles.th}>{ui('Created')}</th>
                  <th style={styles.th}>{ui('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {labels.map((label) => (
                  <tr key={label.id}>
                    <td style={styles.td}>
                      <input
                        type="checkbox"
                        aria-label={ui('Select {item}').replace('{item}', label.product_name || label.barcode_value)}
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
                    <td style={styles.td}>{formatBarcodeType(label.barcode_type, ui)}</td>
                    <td style={{ ...styles.td, minWidth: 190 }}>{labelTraceability(label, locale, ui)}</td>
                    <td style={styles.td}>
                      {formatLocalizedNumber(Number(label.print_count || 0), locale)}
                      {label.last_printed_at ? <div style={styles.muted}>{ui('Last opened {date}').replace('{date}', formatLocalizedDateTime(label.last_printed_at, locale))}</div> : null}
                    </td>
                    <td style={styles.td}>{formatLocalizedDateTime(label.created_at, locale)}</td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          type="button"
                          style={!canWriteBarcodeLabels || recordBarcodeLabelPrintsMutation.isPending ? styles.disabledButton : styles.smallButton}
                          disabled={!canWriteBarcodeLabels || recordBarcodeLabelPrintsMutation.isPending}
                          onClick={() => handlePrint([label])}
                        >
                          {ui('Print')}
                        </button>
                        <button
                          type="button"
                          style={styles.secondarySmallButton}
                          onClick={() => {
                            try {
                              triggerSvgDownload(label, barcodePresentation);
                            } catch (error) {
                              window.alert(error instanceof Error ? localizeBarcodeError(error, ui) : ui('Unable to download this label.'));
                            }
                          }}
                        >
                          {ui('Download SVG')}
                        </button>
                        <button
                          type="button"
                          style={!canWriteBarcodeLabels || deleteBarcodeLabelMutation.isPending ? styles.disabledButton : styles.dangerButton}
                          disabled={!canWriteBarcodeLabels || deleteBarcodeLabelMutation.isPending}
                          onClick={() => {
                            if (window.confirm(ui('Retire barcode label {barcode}? The retired code will stop resolving in scanners.').replace('{barcode}', label.barcode_value))) {
                              deleteBarcodeLabelMutation.mutate(label.id);
                            }
                          }}
                        >
                          {ui('Retire')}
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
