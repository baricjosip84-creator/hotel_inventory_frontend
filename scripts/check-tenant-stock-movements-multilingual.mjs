import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/StockMovementsPage.tsx');
const reportsPage = read('src/pages/ReportsPage.tsx');
const reportsLedgerStart = reportsPage.indexOf("activeTab === 'movement-ledger'");
const reportsLedgerEnd = reportsPage.indexOf("activeTab === 'inventory-variance'", reportsLedgerStart);
const reportsLedgerSection = reportsPage.slice(reportsLedgerStart, reportsLedgerEnd);
const productMovementsStart = reportsPage.indexOf("activeTab === 'product-movements'");
const productMovementsEnd = reportsPage.indexOf("activeTab === 'movement-ledger'", productMovementsStart);
const productMovementsSection = reportsPage.slice(productMovementsStart, productMovementsEnd);
const varianceStart = reportsPage.indexOf("{activeTab === 'inventory-variance'");
const varianceEnd = reportsPage.indexOf("{activeTab === 'stock-transfer-activity'", varianceStart);
const varianceSection = reportsPage.slice(varianceStart, varianceEnd);
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
for (const match of page.matchAll(literalPattern)) {
  try { displayKeys.add(decodeLiteral(match[1])); } catch {}
}
const movementLabels = page.match(/const MOVEMENT_LABELS: Record<string, string> = \{([\s\S]*?)\n\};/);
if (!movementLabels) fail('Stock Movements known movement-label mapping is missing.');
else for (const match of movementLabels[1].matchAll(/:\s*'([^']+)'/g)) displayKeys.add(match[1]);
for (const key of [
  'Historical shipment reference unavailable', 'Mixed historical units',
  'No source recorded', 'Shipment item unit cost', 'Product standard cost', 'Supplier return', 'Opening Stock Import',
  'Fulfilled reservation', 'Fulfilled', 'Units per Package', 'Cycle count'
]) displayKeys.add(key);
const missing = [...displayKeys].filter((key) => !unique.has(key)).sort();
if (missing.length) fail(`Stock Movements UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Stock Movements has ${displayKeys.size} catalog-backed deterministic UI keys.`);

for (const anchor of [
  "movementKind === 'unclassified' && ['stock_count', 'manual_adjustment', 'other'].includes(explicitType)",
  "return 'unproven_legacy';",
  "return reason;",
  "safeReasonDisplay(movement, ui) || ui(\"not recorded\")",
  "movement.product_unit || ui(\"Historical unit unavailable\")",
  "movement.product_name || ui(\"Historical Product name unavailable\")",
  "movement.storage_location_name || ui(\"Historical location unavailable\")",
  "disabled={isExporting || (summaryAvailable && totalRows === 0)}",
  "params.set('cursor_created_at', cursor.createdAt)",
  "params.set('cursor_id', cursor.id)",
  "fetchStockMovements(filters, 500, 0, cursor)",
  "cursor = { createdAt: last.created_at_cursor, id: last.id }",
  "ui('Reference')",
  "ui('Units per Package')",
  "movement.cost_source ? ui(costSourceLabel(movement.cost_source)) : ''",
  "displayedReceivingNote(movement, ui)",
  "if (type === 'usage_reversal') return localizeComposedLabel(evidence, ui);",
  "const [reference, condition] = value.slice('Return '.length).split(' · ', 2);",
  "return `${ui('Reversed')} ${ui(detail)}`;"
]) if (!page.includes(anchor)) fail(`Stock Movements audit-safe presentation contract missing: ${anchor}`);
if (!process.exitCode) pass('Stock Movements preserves unknown/operator evidence and uses keyset-based export independent from summary health.');

for (const forbidden of [
  'ui(humanizeCode(filters.reason))',
  'Movement ID',
  'Actor ID',
  "ui('Product ID')",
  "ui('Storage Location ID')",
  "ui('Shipment ID')",
  "ui('Transfer ID')",
  '<strong>{filters.reason}</strong>',
  "movement.cost_source || ''"
]) if (page.includes(forbidden)) fail(`Stock Movements exposes/transforms forbidden audit data: ${forbidden}`);
if (!process.exitCode) pass('Stock Movements normal UI and CSV do not expose raw technical identifiers or translate exact user reason filters.');

if (!page.includes("if (typeof value === 'number') return String(value);") || !page.includes("if (/^[\\t\\r ]*[=+\\-@]/.test(text)) text = `'${text}`;") || !page.includes('/[",\\r\\n]/.test(text)')) fail('Stock Movements CSV formula-injection/numeric-preservation/record-separator guard is missing.');
else pass('Stock Movements CSV guards formula injection, preserves numeric negatives, and quotes CR/LF cells.');


for (const anchor of [
  'reason_is_operator_evidence?: boolean;',
  'reference_label?: string | null;',
  'row.product_name || ui("Historical Product name unavailable")',
  'row.storage_location_name || ui("Historical location unavailable")',
  'row.actor_name || (row.actor_label ? ui(row.actor_label) : ui("System / support actor"))',
  'localizeMovementLedgerText(row.reference_label, ui)'
]) if (!reportsPage.includes(anchor)) fail(`Reports movement-ledger historical presentation contract missing: ${anchor}`);
for (const forbidden of [
  'formatReference(row.reference_type, row.reference_id, ui)',
  'row.product_category || ui("Uncategorized")'
]) if (reportsLedgerSection.includes(forbidden)) fail(`Reports movement ledger still exposes mutable/technical evidence: ${forbidden}`);
if (!process.exitCode) pass('Reports movement ledger uses historical fallbacks and no longer displays technical reference identifiers.');


for (const anchor of [
  "quantity_evidence_status?: 'proven' | 'mixed' | 'unproven' | 'no_movements';",
  "row.quantity_evidence_status === 'mixed'",
  'ui("Mixed historical units")',
  "row.quantity_evidence_status === 'unproven'",
  'ui("Historical unit unavailable")'
]) if (!reportsPage.includes(anchor)) fail(`Reports Product Movements historical-unit contract missing: ${anchor}`);
if (productMovementsSection.includes('row.product_unit || ui("units")')) fail('Reports Product Movements still labels historical totals with a current/fallback unit.');
if (!process.exitCode) pass('Reports Product Movements does not add or relabel mixed/unproven historical units.');


for (const anchor of [
  'const historicalMovement = row.record_type === \'manual_adjustment\';',
  'ui("Historical Product name unavailable")',
  'ui("Historical location unavailable")',
  'ui("Historical unit unavailable")',
  "row.actor_label ? ui(row.actor_label)"
]) if (!varianceSection.includes(anchor)) fail(`Reports manual-adjustment variance historical presentation contract missing: ${anchor}`);
if (!process.exitCode) pass('Reports manual-adjustment variance uses historical movement evidence and truthful fallbacks.');

if (process.exitCode) process.exit(process.exitCode);
