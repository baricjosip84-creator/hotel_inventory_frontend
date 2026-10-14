import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { csvSpreadsheetCell } from '../src/lib/spreadsheetCsv.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendRoot = path.resolve(root, '../hotel-inventory-backend');
const frontendRoot = process.argv[2] ? path.resolve(process.argv[2]) : root;
const testedBackendRoot = process.argv[3] ? path.resolve(process.argv[3]) : backendRoot;
const checkCases = [
  ['=SUM(1,2)', "'=SUM(1,2)"],
  [' +HYPERLINK("https://invalid.example")', "' +HYPERLINK(\"https://invalid.example\")"],
  ['\t=2+2', "'\t=2+2"],
  ['\r@SUM(1)', "'\r@SUM(1)"],
  ['\n-2+3', "'\n-2+3"],
  ['@example', "'@example"],
  ['-1+2', "'-1+2"],
  ['+1+2', "'+1+2"],
  ['-25', '-25'],
  ['+12.25', '+12.25'],
  ['2.2e-4', '2.2e-4'],
  ['milk', 'milk'],
  ['item "A"', 'item "A"'],
  ['line\nbreak', 'line\nbreak'],
  ['', ''],
  [null, ''],
];
const wrappers = [
  ['Products', 'src/pages/products/productFormatting.ts', 'csvEscape', true],
  ['Purchase Orders', 'src/pages/PurchaseOrdersPage.tsx', 'escapeCsvCell', false],
  ['Requisitions', 'src/pages/InventoryRequisitionsPage.tsx', 'csvCell', false]
];
let checks = 0;
for (const [value, safe] of checkCases) {
  const shouldQuote = /[",\r\n]/.test(safe);
  const encoded = shouldQuote ? `"${safe.replace(/"/g, '""')}"` : safe;
  assert.equal(csvSpreadsheetCell(value), encoded);
  assert.equal(csvSpreadsheetCell(value, true), `"${safe.replace(/"/g, '""')}"`);
  checks += 2;
}
for (const [name, rel, method, quoted] of wrappers) {
  const source = fs.readFileSync(path.join(frontendRoot, rel), 'utf8');
  const match = source.match(new RegExp(`^function ${method}\\(value: unknown\\): string \\{[\\s\\S]*?^\\}`, 'm'));
  assert.ok(match, `${name}: CSV encoding function exists`);
  const js = match[0].replace('(value: unknown): string', '(value)');
  const encode = vm.runInNewContext(`${js}; ${method}`, { csvSpreadsheetCell });
  for (const [value, safe] of checkCases) {
    const shouldQuote = quoted || /[",\r\n]/.test(safe);
    const expected = shouldQuote ? `"${safe.replace(/"/g, '""')}"` : safe;
    assert.equal(encode(value), expected, `${name}: ${JSON.stringify(value)}`);
    checks += 1;
  }
}
// The Platform Audit endpoint must also use the hardened server-side CSV exporter.
if (fs.existsSync(path.join(testedBackendRoot, 'src/routes/platform/audit.js'))) {
const backendSource = fs.readFileSync(path.join(testedBackendRoot, 'src/routes/platform/audit.js'), 'utf8');
assert.match(backendSource, /require\('\.\.\/\.\.\/utils\/csvExport'\)/);
assert.match(backendSource, /const csvEscape = \(value\) => escapeCsvCell\(value\)/);
checks += 2;
const requireFromBackend = createRequire(path.join(testedBackendRoot, 'package.json'));
const { escapeCsvCell } = requireFromBackend('./src/utils/csvExport.js');
for (const [value] of checkCases) {
  const serverCsv = escapeCsvCell(value);
  assert.equal(serverCsv, csvSpreadsheetCell(value), `platform audit: ${JSON.stringify(value)}`);
  checks += 1;
}
console.log(`PASS ${checks}/${checks} spreadsheet-safe CSV checks across Products, Purchase Orders, Requisitions and Platform Audit`);
} else {
  console.log(`PASS ${checks}/${checks} frontend spreadsheet-safe CSV checks (platform Audit lives in the separate backend repository)`);
}
