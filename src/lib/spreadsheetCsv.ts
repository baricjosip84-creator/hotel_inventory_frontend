/** Encode a value for a downloadable CSV without allowing a spreadsheet to execute
 * user-supplied text as a formula. Numeric amounts remain numeric. */
const DANGEROUS_CSV_PREFIX = /^[\s\uFEFF\u200B]*[=+\-@]/;
const CANONICAL_CSV_NUMBER = /^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+\-]?\d+)?$/;

export function csvSpreadsheetCell(value: unknown, quoteEveryCell = false): string {
  const text = value === null || value === undefined ? '' : String(value);
  // Leading whitespace, including tabs and newlines, must not hide formulas.
  const safe = DANGEROUS_CSV_PREFIX.test(text) && !CANONICAL_CSV_NUMBER.test(text)
    ? `'${text}`
    : text;
  const escaped = safe.replace(/"/g, '""');
  return quoteEveryCell || /[",\r\n]/.test(safe) ? `"${escaped}"` : escaped;
}
