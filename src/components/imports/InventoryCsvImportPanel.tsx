import { useRef, useState } from 'react';
import type { CSSProperties, ChangeEvent } from 'react';
import { ApiError } from '../../lib/api';
import {
  buildTemplateCsv,
  commitInventoryImport,
  parseCsv,
  previewInventoryImport
} from './inventoryCsvImport';
import type {
  InventoryImportBatch,
  InventoryImportType
} from './inventoryCsvImport';

type InventoryCsvImportPanelProps = {
  importType: InventoryImportType;
  title: string;
  description: string;
  templateColumns: string[];
  templateExample?: Record<string, string>;
  canImport: boolean;
  disabledReason?: string;
  onCommitted?: (batch: InventoryImportBatch) => Promise<void> | void;
};

const panel: CSSProperties = { border: '1px solid var(--border-color, #d9dde5)', borderRadius: 12, padding: 16, marginTop: 16 };
const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 12 };
const button: CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #aab2c0', cursor: 'pointer', background: 'transparent' };
const primaryButton: CSSProperties = { ...button, fontWeight: 700 };
const disabledButton: CSSProperties = { ...button, opacity: 0.55, cursor: 'not-allowed' };
const errorBox: CSSProperties = { marginTop: 12, padding: 10, border: '1px solid currentColor', borderRadius: 8 };
const successBox: CSSProperties = { marginTop: 12, padding: 10, border: '1px solid currentColor', borderRadius: 8 };
const tableWrapper: CSSProperties = { overflowX: 'auto', marginTop: 12 };
const table: CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const cell: CSSProperties = { padding: '7px 8px', borderBottom: '1px solid #d9dde5', textAlign: 'left', verticalAlign: 'top' };

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : error instanceof Error ? error.message : fallback;
}

export function InventoryCsvImportPanel({
  importType,
  title,
  description,
  templateColumns,
  templateExample,
  canImport,
  disabledReason,
  onCommitted
}: InventoryCsvImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [batch, setBatch] = useState<InventoryImportBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetPreview = () => {
    setBatch(null);
    setError(null);
    setMessage(null);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    resetPreview();
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setRows([]);
    if (!selected) return;

    if (!selected.name.toLocaleLowerCase().endsWith('.csv')) {
      setError('Choose a CSV file.');
      return;
    }

    try {
      const parsed = parseCsv(await selected.text());
      if (parsed.length > 2000) throw new Error('CSV cannot contain more than 2,000 data rows.');
      setRows(parsed);
      setMessage(`${parsed.length.toLocaleString()} row${parsed.length === 1 ? '' : 's'} loaded. Validate before committing.`);
    } catch (parseError) {
      setError(getErrorMessage(parseError, 'Failed to read CSV.'));
    }
  };

  const validateCsv = async () => {
    if (!file || rows.length === 0 || !canImport) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const preview = await previewInventoryImport({ importType, sourceFilename: file.name, rows });
      setBatch(preview);
      setMessage(
        preview.status === 'validated'
          ? `Validation passed for all ${preview.row_count.toLocaleString()} rows. No inventory data has changed yet.`
          : `Validation found ${preview.invalid_row_count.toLocaleString()} invalid row${preview.invalid_row_count === 1 ? '' : 's'}. Fix the CSV and validate again.`
      );
    } catch (validationError) {
      setError(getErrorMessage(validationError, 'Import validation failed.'));
    } finally {
      setBusy(false);
    }
  };

  const commitCsv = async () => {
    if (!batch || batch.status !== 'validated' || !canImport) return;
    if (!window.confirm(`Commit ${batch.row_count} validated ${title.toLocaleLowerCase()} row${batch.row_count === 1 ? '' : 's'}? This will change tenant data.`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const committed = await commitInventoryImport(batch);
      setBatch(committed);
      setMessage('Import committed successfully.');
      await onCommitted?.(committed);
    } catch (commitError) {
      setError(getErrorMessage(commitError, 'Import commit failed. Validate the current CSV again before retrying.'));
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv(templateColumns, templateExample)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${importType}-import-template.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const downloadValidationErrors = () => {
    if (!batch?.validation_errors?.length) return;
    const columns = ['row_number', 'field', 'code', 'message'];
    const lines = [columns.join(',')];
    const escape = (value: unknown) => {
      const text = value === undefined || value === null ? '' : String(value);
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    for (const item of batch.validation_errors) {
      lines.push([item.row_number ?? '', item.field ?? '', item.code, item.message].map(escape).join(','));
    }
    const blob = new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${importType}-validation-errors.csv`;
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

  const validationErrors = batch?.validation_errors || [];

  return (
    <section style={panel} aria-label={title}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ margin: '6px 0 0' }}>{description}</p>
      <p style={{ margin: '6px 0 0', fontSize: 13 }}>
        Template columns: {templateColumns.join(', ')}. Maximum 2,000 data rows per import.
      </p>
      {!canImport ? <div style={errorBox}>{disabledReason || 'Your current role cannot perform this import.'}</div> : null}

      <div style={row}>
        <button type="button" style={button} onClick={downloadTemplate}>Download CSV Template</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          disabled={!canImport || busy || batch?.status === 'committed'}
        />
        <button
          type="button"
          style={!canImport || busy || rows.length === 0 ? disabledButton : primaryButton}
          disabled={!canImport || busy || rows.length === 0 || batch?.status === 'committed'}
          onClick={validateCsv}
        >
          {busy ? 'Working...' : 'Validate CSV'}
        </button>
        <button
          type="button"
          style={!canImport || busy || batch?.status !== 'validated' ? disabledButton : primaryButton}
          disabled={!canImport || busy || batch?.status !== 'validated'}
          onClick={commitCsv}
        >
          Commit Validated Import
        </button>
        {validationErrors.length ? <button type="button" style={button} onClick={downloadValidationErrors} disabled={busy}>Download Validation Errors</button> : null}
        {(file || batch) ? <button type="button" style={button} onClick={startOver} disabled={busy}>Start Over</button> : null}
      </div>

      {message ? <div style={successBox}>{message}</div> : null}
      {error ? <div style={errorBox}>{error}</div> : null}

      {batch ? (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <strong>Status:</strong> {batch.status} · <strong>Rows:</strong> {batch.row_count} · <strong>Valid:</strong> {batch.valid_row_count} · <strong>Invalid:</strong> {batch.invalid_row_count} · <strong>Batch version:</strong> v{batch.version}
        </div>
      ) : null}

      {validationErrors.length ? (
        <div style={tableWrapper}>
          <table style={table}>
            <thead>
              <tr><th style={cell}>CSV row</th><th style={cell}>Field</th><th style={cell}>Problem</th></tr>
            </thead>
            <tbody>
              {validationErrors.slice(0, 100).map((item, index) => (
                <tr key={`${item.row_number ?? 'batch'}-${item.code}-${index}`}>
                  <td style={cell}>{item.row_number ?? 'Entire import'}</td>
                  <td style={cell}>{item.field || '-'}</td>
                  <td style={cell}>{item.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {validationErrors.length > 100 ? <p>Showing the first 100 validation problems.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
