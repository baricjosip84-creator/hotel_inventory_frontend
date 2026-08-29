import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const stockSource = read('src/pages/StockPage.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {
    // Ignore non-row TypeScript syntax.
  }
}

const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) {
  const seen = new Set();
  const duplicates = [...new Set(catalogKeys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(', ')}`);
} else {
  pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);
}

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literalKeys = [];
for (const match of stockSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* ignore future complex literals */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) {
  fail(`Stock has ui() literals missing from the five-language catalog: ${missingLiterals.join(' | ')}`);
} else {
  pass(`Stock has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);
}

const dynamicCatalogKeys = [
  'Guest use', 'Consumed directly for guests or customers.', 'Internal use', 'Used by staff or internal operations.',
  'Damage', 'Removed because it was damaged.', 'Waste', 'Expired, spoiled, discarded, or otherwise wasted.',
  'Event', 'Allocated and consumed for a named event.', 'Maintenance', 'Used for repair, upkeep, or facilities work.',
  'Other', 'Operational usage that does not fit another reason.', 'Unassigned', 'Unspecified movement',
  'Shipment received', 'Physical count', 'Manual adjustment', 'Consume Stock', 'Apply Physical Count', 'Manual Adjustment',
  'Reduce stock by a positive quantity for operational usage.', 'Set stock to the physically verified quantity from a real count.',
  'Apply a positive or negative correction delta to the selected stock position.', 'Consume removes stock for day-to-day operational usage.'
];
const missingDynamic = dynamicCatalogKeys.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Stock dynamic helper labels are missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicCatalogKeys.length} dynamic Stock helper labels are catalog-backed.`);

const representativeRows = [
  'Stock workspace', 'Operational Workbench', 'Stock Positions', 'Availability Risk', 'Opening Stock Import',
  'Lot, Expiry & Stock Integrity', 'Process Expired Stock', 'Expiry Value at Risk', 'Current Access Role',
  'Consume Stock', 'Apply Physical Count', 'Manual Adjustment', 'Usage Ledger Snapshot', 'Movement history',
  'Stock consumed successfully.', 'Stock count applied successfully.', 'Stock adjustment applied successfully.',
  'Stock placed on hold and removed from usable quantity.', 'is selected for review.'
];
for (const key of representativeRows) {
  if (!uniqueKeys.has(key)) fail(`Missing representative Stock translation row: ${key}`);
}
if (!process.exitCode) pass(`${representativeRows.length} representative Stock rows are present in all five locales.`);

if (!stockSource.includes('useAppTranslation')) fail('Stock must use the shared translation context.');
if (!stockSource.includes('formatLocalizedDate(') || !stockSource.includes('formatLocalizedDateTime(') || !stockSource.includes('formatLocalizedNumber(')) {
  fail('Stock must use locale-aware date, date/time and number formatting.');
}
if (!stockSource.includes('formatLocalizedCurrency(expiryWindowValue, getActiveTenantCurrency(), locale')) {
  fail('Stock expiry value-at-risk must use locale-aware currency formatting.');
}

const forbiddenMixedLanguage = [
  "? 'Consume removes stock for day-to-day operational usage.'",
  ' is selected for review.`',
  "setOperationFeedback('Stock placed on hold and removed from usable quantity.')",
  'setOperationFeedback(response.message)',
  'value={formatCurrencyAmount(expiryWindowValue)}',
  '<div style={styles.stockMetricValue}>{quantity}</div>',
  '<td style={styles.td}>{quantity}</td>',
  '<div style={styles.selectionValue}>{toNumber(row.total_quantity)}</div>',
  '-{toNumber(usage.quantity)}'
];
for (const pattern of forbiddenMixedLanguage) {
  if (stockSource.includes(pattern)) fail(`Stock still contains locale-neutral or mixed-language presentation: ${pattern}`);
}

if (!stockSource.includes("setOperationFeedback(ui('Stock consumed successfully.'))") ||
    !stockSource.includes("setOperationFeedback(ui('Stock count applied successfully.'))") ||
    !stockSource.includes("setOperationFeedback(ui('Stock adjustment applied successfully.'))")) {
  fail('Stock mutation success feedback must be localized independently of backend English response text.');
}
if (!stockSource.includes("`${selectedRow.product_name || ui(\"Selected product\")} ${ui('is selected for review.')}`")) {
  fail('Stock workflow selection summary must localize its composed suffix.');
}
if (!stockSource.includes("ui(formatUsageReason(") || !stockSource.includes('ui(formatMovementReason(') ||
    !stockSource.includes('ui(getActionLabel(') || !stockSource.includes('ui(getActionHelpText(')) {
  fail('Canonical Stock reason/action helpers must be translated only at display time.');
}

const canonicalContracts = [
  "type StockActionType = 'consume' | 'count' | 'adjust'",
  "reason: 'usage:internal_use'",
  "reason: draft.reason.trim() || 'inventory_count'",
  "reason: draft.reason.trim() || 'manual_adjustment'",
  "apiRequest<StockMutationResponse>('/stock/consume'",
  "apiRequest<StockMutationResponse>('/stock/count'",
  "apiRequest<StockMutationResponse>('/stock/adjust'"
];
for (const contract of canonicalContracts) {
  if (!stockSource.includes(contract)) fail(`Stock canonical business/API contract changed during localization: ${contract}`);
}
if (!process.exitCode) pass('Stock canonical actions, reason codes and API routes remain language-independent.');

if (!process.exitCode) console.log('Tenant Stock multilingual hardening: PASS');
