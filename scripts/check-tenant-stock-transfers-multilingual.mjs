import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/StockTransfersPage.tsx');
const enterprise = read('src/components/enterpriseInventory/tabs/StockTransfersTab.tsx');
const uom = read('src/components/inventory/ProductUomSelect.tsx');
const reports = read('src/pages/ReportsPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');

const rows = [];
for (const line of catalog.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((entry) => typeof entry === 'string' && entry.length > 0)) rows.push(row);
  } catch {}
}
const keys = rows.map((row) => row[0]);
const unique = new Set(keys);
if (keys.length !== unique.size) fail('Tenant UI translation catalog contains duplicate English keys.');
else pass(`Tenant UI catalog has ${keys.length} unique five-language rows.`);

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const displayKeys = new Set();
for (const source of [page, enterprise, uom]) {
  for (const match of source.matchAll(literalPattern)) {
    try { displayKeys.add(decodeLiteral(match[1])); } catch {}
  }
}
const missing = [...displayKeys].filter((key) => !unique.has(key)).sort();
if (missing.length) fail(`Stock Transfers deterministic UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Stock Transfers has ${displayKeys.size} catalog-backed deterministic UI keys.`);

for (const anchor of [
  'item.entered_quantity ?? item.quantity',
  'uom_code: item.uom_code.trim() || null',
  '<ProductUomSelect',
  "ui('Entered as:')",
  "ui('Historical location unavailable')",
  "ui('Historical product unavailable')",
  "ui('Historical unit unavailable')",
  "ui('Not valid as a transfer source')",
  "Review unit",
  "Product unavailable",
  "ui('Serial evidence missing')",
  "ui('Product serial tracking changed after this draft was saved. Review and save the draft again before execution.')",
  "ui('Review serial tracking')",
  "ui('Historical serial-tracking evidence unavailable')"
]) if (!page.includes(anchor)) fail(`Main Stock Transfers multilingual/truthful presentation contract missing: ${anchor}`);

for (const forbidden of [
  'Transfer ID', 'Movement ID', 'Actor ID', 'Version:'
]) if (page.includes(forbidden)) fail(`Main Stock Transfers still exposes technical presentation text: ${forbidden}`);

for (const anchor of [
  'const { ui } = useAppTranslation();',
  'sourceEligibleLocationIds',
  'transferSummaryQuery',
  'ui("Create internal stock transfer")',
  'ui("Transfer execution controls")',
  "ui('Historical location unavailable')",
  'ui("Execute")',
  'ui("Cancel")'
]) if (!enterprise.includes(anchor)) fail(`Enterprise Stock Transfers multilingual contract missing: ${anchor}`);

for (const raw of [
  '>Create internal stock transfer<',
  '>Transfer execution controls<',
  '>No stock transfers yet.<',
  '>Loading available serials…<'
]) if (enterprise.includes(raw)) fail(`Enterprise Stock Transfers still contains raw deterministic English UI: ${raw}`);

if (!uom.includes("ui('base')") || !uom.includes("ui('Base unit')") || !uom.includes('preservedValue')) {
  fail('Stock Transfer UOM selector does not preserve/localize captured UOM evidence.');
} else pass('UOM selector localizes base-unit text and preserves captured UOM evidence.');

const transferReportStart = reports.indexOf("{activeTab === 'stock-transfer-activity'");
const transferReportEnd = reports.indexOf("{activeTab === 'requisition-activity'", transferReportStart);
const transferReport = reports.slice(transferReportStart, transferReportEnd);
for (const anchor of [
  'ui("Historical location unavailable")',
  'displayRepositoryActor(row.created_by, ui)',
  'displayStockTransferCancellation(row.cancellation_reason, row.cancellation_reason_is_system, ui)',
  'Historical unit unavailable',
  'ui("Quantity by unit")'
]) if (!transferReport.includes(anchor)) fail(`Stock Transfer Activity historical multilingual contract missing: ${anchor}`);

if (!process.exitCode) pass('Stock Transfers deterministic presentation is catalog-backed across main, Enterprise Inventory, UOM, and report surfaces.');
if (process.exitCode) process.exit(process.exitCode);
