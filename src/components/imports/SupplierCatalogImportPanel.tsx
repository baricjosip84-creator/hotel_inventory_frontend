import { useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../lib/api';
import type { SupplierOption } from '../enterpriseInventory/EnterpriseInventoryTypes';
import {
  buildTemplateCsv,
  commitInventoryImport,
  parseCsv,
  previewInventoryImport,
  type InventoryImportBatch,
  type InventoryImportValidationError
} from './inventoryCsvImport';

type CatalogSourceRow = Record<string, string> & {
  supplier_sku: string;
  supplier_product_name: string;
  barcode: string;
  internal_sku: string;
  product_name: string;
  category: string;
  unit: string;
  min_stock: string;
  standard_unit_cost: string;
  unit_cost: string;
  currency: string;
  lead_time_days: string;
  min_order_quantity: string;
  preferred: string;
  effective_from: string;
  action: string;
};

type Props = {
  suppliers: SupplierOption[];
  canImport: boolean;
  canCreateProducts: boolean;
};

const panel: CSSProperties = { border: '1px solid var(--border-color, #d9dde5)', borderRadius: 12, padding: 16 };
const rowStyle: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 };
const button: CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #aab2c0', cursor: 'pointer', background: 'transparent' };
const primaryButton: CSSProperties = { ...button, fontWeight: 700 };
const disabledButton: CSSProperties = { ...button, opacity: 0.55, cursor: 'not-allowed' };
const tableWrapper: CSSProperties = { overflowX: 'auto', maxHeight: 560, marginTop: 12, border: '1px solid var(--border-color, #d9dde5)', borderRadius: 8 };
const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 12 };
const cell: CSSProperties = { padding: '7px 8px', borderBottom: '1px solid #d9dde5', textAlign: 'left', verticalAlign: 'top', minWidth: 110 };
const input: CSSProperties = { width: '100%', minWidth: 110, boxSizing: 'border-box', padding: '6px 7px' };
const messageBox: CSSProperties = { marginTop: 12, padding: 10, border: '1px solid currentColor', borderRadius: 8 };

const TEMPLATE_COLUMNS = [
  'supplier_sku',
  'supplier_product_name',
  'barcode',
  'internal_sku',
  'product_name',
  'category',
  'unit',
  'min_stock',
  'standard_unit_cost',
  'unit_cost',
  'currency',
  'lead_time_days',
  'min_order_quantity',
  'preferred',
  'effective_from',
  'action'
];

const TEMPLATE_EXAMPLE: Record<string, string> = {
  supplier_sku: 'SUP-10042',
  supplier_product_name: 'Whole Milk 1L',
  barcode: '3850000000001',
  internal_sku: 'MILK-001',
  product_name: 'Whole Milk 1L',
  category: 'Dairy',
  unit: 'bottle',
  min_stock: '12',
  standard_unit_cost: '',
  unit_cost: '1.20',
  currency: 'EUR',
  lead_time_days: '2',
  min_order_quantity: '12',
  preferred: 'true',
  effective_from: new Date().toISOString().slice(0, 10),
  action: 'create'
};

function messageForError(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback;
}

function normalizeRow(row: Record<string, string>): CatalogSourceRow {
  return {
    ...row,
    supplier_sku: row.supplier_sku || '',
    supplier_product_name: row.supplier_product_name || '',
    barcode: row.barcode || '',
    internal_sku: row.internal_sku || '',
    product_name: row.product_name || '',
    category: row.category || '',
    unit: row.unit || '',
    min_stock: row.min_stock || '0',
    standard_unit_cost: row.standard_unit_cost || '',
    unit_cost: row.unit_cost || '',
    currency: row.currency || 'EUR',
    lead_time_days: row.lead_time_days || '0',
    min_order_quantity: row.min_order_quantity || '0',
    preferred: row.preferred || 'false',
    effective_from: row.effective_from || new Date().toISOString().slice(0, 10),
    action: (row.action || 'auto').toLowerCase()
  };
}

function outcomeLabel(row: Record<string, unknown> | undefined): string {
  if (!row) return 'Not validated';
  const resolution = String(row.resolution || '-').replaceAll('_', ' ');
  const change = String(row.catalog_change || '-').replaceAll('_', ' ');
  const product = row.resolved_product_sku
    ? `${String(row.resolved_product_sku)} · ${String(row.resolved_product_name || '')}`
    : row.product_name
      ? `${String(row.internal_sku || '')} · ${String(row.product_name)}`
      : '';
  return `${resolution} / ${change}${product ? ` → ${product}` : ''}`;
}

function rowErrorText(errors: InventoryImportValidationError[]): string {
  return errors.map((item) => {
    const suggestion = item.details?.suggested_product_sku
      ? ` Suggested: ${String(item.details.suggested_product_sku)} · ${String(item.details.suggested_product_name || '')}.`
      : '';
    return `${item.message}${suggestion}`;
  }).join(' ');
}

export function SupplierCatalogImportPanel({ suppliers, canImport, canCreateProducts }: Props) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [supplierId, setSupplierId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CatalogSourceRow[]>([]);
  const [batch, setBatch] = useState<InventoryImportBatch | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizedByRow = useMemo(() => {
    const result = new Map<number, Record<string, unknown>>();
    for (const item of batch?.normalized_rows || []) {
      const rowNumber = Number(item.row_number);
      if (Number.isFinite(rowNumber)) result.set(rowNumber, item);
    }
    return result;
  }, [batch]);

  const errorsByRow = useMemo(() => {
    const result = new Map<number, InventoryImportValidationError[]>();
    for (const item of batch?.validation_errors || []) {
      if (item.row_number == null) continue;
      const current = result.get(item.row_number) || [];
      current.push(item);
      result.set(item.row_number, current);
    }
    return result;
  }, [batch]);

  const resetValidation = () => {
    setBatch(null);
    setError(null);
    setMessage(null);
  };

  const updateRow = (index: number, patch: Partial<CatalogSourceRow>) => {
    setRows((current) => current.map((item, rowIndex) => rowIndex === index ? { ...item, ...patch } : item));
    resetValidation();
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    resetValidation();
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setRows([]);
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a CSV file.');
      return;
    }
    try {
      const parsed = parseCsv(await selected.text());
      if (parsed.length > 2000) throw new Error('CSV cannot contain more than 2,000 data rows.');
      setRows(parsed.map(normalizeRow));
      setMessage(`${parsed.length.toLocaleString()} catalog row${parsed.length === 1 ? '' : 's'} loaded. Review actions, then validate.`);
    } catch (readError) {
      setError(messageForError(readError, 'Failed to read supplier catalog CSV.'));
    }
  };

  const validateRows = async () => {
    if (!canImport || !supplierId || !file || rows.length === 0) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const preview = await previewInventoryImport({
        importType: 'supplier_catalog',
        sourceFilename: file.name,
        rows: rows.map((item) => ({ ...item, supplier_id: supplierId }))
      });
      setBatch(preview);
      setMessage(preview.status === 'validated'
        ? `All ${preview.row_count.toLocaleString()} rows are safely resolved. No tenant data has changed yet.`
        : `Review the ${preview.invalid_row_count.toLocaleString()} unresolved/invalid row${preview.invalid_row_count === 1 ? '' : 's'} below, change its action/match, and validate again.`);
    } catch (validationError) {
      setError(messageForError(validationError, 'Supplier catalog validation failed.'));
    } finally {
      setBusy(false);
    }
  };

  const commitRows = async () => {
    if (!batch || batch.status !== 'validated' || !canImport) return;
    if (!window.confirm(`Commit ${batch.row_count} validated supplier-catalog rows? This may create Products, update supplier pricing, or deactivate catalog items according to the reviewed actions.`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const committed = await commitInventoryImport(batch);
      setBatch(committed);
      const summary = committed.result_summary || {};
      setMessage(`Catalog committed. Products created: ${Number(summary.created_products || 0)} · Catalog items created: ${Number(summary.created_catalog_items || 0)} · Updated: ${Number(summary.updated_catalog_items || 0)} · Unchanged: ${Number(summary.unchanged_catalog_items || 0)} · Deactivated: ${Number(summary.deactivated_catalog_items || 0)} · Skipped: ${Number(summary.skipped_rows || 0)}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise-supplier-catalog'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-products'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['enterprise-reorder-recommendations'] })
      ]);
    } catch (commitError) {
      setError(messageForError(commitError, 'Supplier catalog commit failed. Validate again before retrying.'));
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv(TEMPLATE_COLUMNS, TEMPLATE_EXAMPLE)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'supplier-catalog-import-template.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const startOver = () => {
    setFile(null);
    setRows([]);
    setBatch(null);
    setError(null);
    setMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section style={panel} aria-label="Supplier catalog import">
      <h3 style={{ margin: 0 }}>Import supplier catalog</h3>
      <p style={{ margin: '6px 0 0' }}>
        Select the supplier once, upload its CSV, then review how every row should be handled. <strong>Auto</strong> updates an existing supplier SKU or safely matches an exact internal SKU/barcode. It never creates a Product by itself.
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 13 }}>
        Use <strong>Create</strong> only for items you actually want in your Product master. Use <strong>Match</strong> for an existing Product, <strong>Deactivate</strong> for a discontinued supplier item, or <strong>Skip</strong> for products you do not stock.
      </p>
      {!canCreateProducts ? <p style={{ ...messageBox, fontSize: 13 }}>Your role may update/match catalog items, but creating new Products additionally requires Products write permission.</p> : null}

      <div style={rowStyle}>
        <label>
          Supplier<br />
          <select value={supplierId} onChange={(event) => { setSupplierId(event.target.value); resetValidation(); }} disabled={!canImport || busy || batch?.status === 'committed'} style={{ minWidth: 220, padding: 7 }}>
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select>
        </label>
        <button type="button" style={button} onClick={downloadTemplate}>Download CSV Template</button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFile} disabled={!canImport || busy || batch?.status === 'committed'} />
        <button type="button" style={!canImport || busy || !supplierId || rows.length === 0 ? disabledButton : primaryButton} disabled={!canImport || busy || !supplierId || rows.length === 0 || batch?.status === 'committed'} onClick={validateRows}>{busy ? 'Working…' : 'Validate & Match'}</button>
        <button type="button" style={!canImport || busy || batch?.status !== 'validated' ? disabledButton : primaryButton} disabled={!canImport || busy || batch?.status !== 'validated'} onClick={commitRows}>Commit Reviewed Catalog</button>
        {(file || batch) ? <button type="button" style={button} disabled={busy} onClick={startOver}>Start Over</button> : null}
      </div>

      {message ? <div style={messageBox}>{message}</div> : null}
      {error ? <div style={messageBox}>{error}</div> : null}
      {batch ? <p style={{ fontSize: 13 }}><strong>Status:</strong> {batch.status} · <strong>Rows:</strong> {batch.row_count} · <strong>Valid:</strong> {batch.valid_row_count} · <strong>Invalid:</strong> {batch.invalid_row_count} · <strong>Batch v{batch.version}</strong></p> : null}

      {rows.length ? (
        <div style={tableWrapper}>
          <table style={table}>
            <thead>
              <tr>
                {['CSV row','Supplier SKU','Supplier item','Barcode','Action','Internal SKU','Product name','Unit','Validation / resolution'].map((header) => <th key={header} style={{ ...cell, position: 'sticky', top: 0, background: 'var(--surface-color, white)' }}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((catalogRow, index) => {
                const csvRow = index + 2;
                const normalized = normalizedByRow.get(csvRow);
                const rowErrors = errorsByRow.get(csvRow) || [];
                return (
                  <tr key={`${csvRow}-${catalogRow.supplier_sku}`}>
                    <td style={cell}>{csvRow}</td>
                    <td style={cell}>{catalogRow.supplier_sku || '-'}</td>
                    <td style={cell}>{catalogRow.supplier_product_name || '-'}</td>
                    <td style={cell}>{catalogRow.barcode || '-'}</td>
                    <td style={cell}>
                      <select value={catalogRow.action} onChange={(event) => updateRow(index, { action: event.target.value })} disabled={busy || batch?.status === 'committed'} style={input}>
                        <option value="auto">Auto</option>
                        <option value="match">Match</option>
                        <option value="create" disabled={!canCreateProducts}>Create Product</option>
                        <option value="deactivate">Deactivate</option>
                        <option value="skip">Skip</option>
                      </select>
                    </td>
                    <td style={cell}><input value={catalogRow.internal_sku} onChange={(event) => updateRow(index, { internal_sku: event.target.value })} disabled={busy || batch?.status === 'committed'} style={input} placeholder="Existing/new SKU" /></td>
                    <td style={cell}><input value={catalogRow.product_name} onChange={(event) => updateRow(index, { product_name: event.target.value })} disabled={busy || batch?.status === 'committed'} style={input} placeholder="Required for Create" /></td>
                    <td style={cell}><input value={catalogRow.unit} onChange={(event) => updateRow(index, { unit: event.target.value })} disabled={busy || batch?.status === 'committed'} style={input} placeholder="Required for Create" /></td>
                    <td style={{ ...cell, minWidth: 280 }}>
                      {rowErrors.length ? <span>{rowErrorText(rowErrors)}</span> : outcomeLabel(normalized)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
