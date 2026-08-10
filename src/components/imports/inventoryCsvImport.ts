import { apiRequest } from '../../lib/api';

export type InventoryImportType = 'products' | 'suppliers' | 'storage_locations' | 'opening_stock' | 'supplier_catalog';

export type InventoryImportValidationError = {
  row_number: number | null;
  field: string | null;
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type InventoryImportBatch = {
  id: string;
  tenant_id: string;
  import_type: InventoryImportType;
  status: 'validated' | 'invalid' | 'committed';
  source_filename: string | null;
  row_count: number;
  valid_row_count: number;
  invalid_row_count: number;
  normalized_rows: Array<Record<string, unknown>>;
  validation_errors: InventoryImportValidationError[];
  result_summary?: Record<string, unknown>;
  version: number;
};

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        currentValue += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        currentValue += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      currentRow.push(currentValue);
      currentValue = '';
    } else if (char === '\n') {
      currentRow.push(currentValue.replace(/\r$/, ''));
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';
    } else {
      currentValue += char;
    }
  }

  if (quoted) throw new Error('CSV contains an unclosed quoted value.');
  if (currentValue.length || currentRow.length) {
    currentRow.push(currentValue.replace(/\r$/, ''));
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((value) => value.trim() !== ''));
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const matrix = parseCsvMatrix(text);
  if (matrix.length < 2) throw new Error('CSV must contain a header row and at least one data row.');

  const headers = matrix[0].map(normalizeHeader);
  if (headers.some((header) => !header)) throw new Error('CSV contains an empty column header.');
  if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate column headers.');

  return matrix.slice(1).map((values, rowIndex) => {
    if (values.length > headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} contains more values than the header row. Check commas and quoted values.`);
    }
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? '';
    });
    return row;
  });
}

function escapeCsv(value: unknown): string {
  const text = value === undefined || value === null ? '' : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildTemplateCsv(columns: string[], example?: Record<string, string>): string {
  const lines = [columns.map(escapeCsv).join(',')];
  if (example) lines.push(columns.map((column) => escapeCsv(example[column] ?? '')).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

export async function previewInventoryImport(input: {
  importType: InventoryImportType;
  sourceFilename: string | null;
  rows: Array<Record<string, string>>;
}): Promise<InventoryImportBatch> {
  return apiRequest<InventoryImportBatch>('/inventory-imports/preview', {
    method: 'POST',
    body: JSON.stringify({
      import_type: input.importType,
      source_filename: input.sourceFilename,
      rows: input.rows
    })
  });
}

export async function commitInventoryImport(batch: InventoryImportBatch): Promise<InventoryImportBatch> {
  return apiRequest<InventoryImportBatch>(`/inventory-imports/${batch.id}/commit`, {
    method: 'POST',
    headers: { 'If-Match-Version': String(batch.version) },
    body: JSON.stringify({})
  });
}
