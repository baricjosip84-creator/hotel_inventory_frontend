import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const scannerSource = read('src/pages/ScannerPage.tsx');
const movementsSource = read('src/pages/StockMovementsPage.tsx');
const transfersSource = read('src/pages/StockTransfersPage.tsx');

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
  const body = literal.slice(1, -1)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
function literalUiKeys(source) {
  const keys = [];
  for (const match of source.matchAll(literalUiPattern)) {
    try { keys.push(decodeLiteral(match[1])); } catch { /* ignore future complex literals */ }
  }
  return keys;
}

for (const [label, source] of [
  ['Scanner', scannerSource],
  ['Stock Movements', movementsSource],
  ['Stock Transfers', transfersSource]
]) {
  if (!source.includes('useAppTranslation')) fail(`${label} must use the shared translation context.`);
  const keys = literalUiKeys(source);
  const missing = [...new Set(keys.filter((key) => !uniqueKeys.has(key)))];
  if (missing.length) fail(`${label} has ui() literals missing from the five-language catalog: ${missing.join(' | ')}`);
  else pass(`${label} has ${new Set(keys).size} catalog-backed literal UI keys.`);
}

const representativeRows = [
  'Receiving Barcode Scanner', 'Shipment QR Scanner', 'Camera permission was denied. Allow camera access in the browser, or use manual entry or image upload.',
  'Stock movement ledger', 'Movement Ledger', 'Transfer sent', 'Transfer received', 'Shipment item unit cost', 'No linked workflow',
  'Stock transfer workspace', 'Execute this stock transfer?', 'Cancel this stock transfer draft?', 'matching transfers', 'review access', 'available'
];
for (const key of representativeRows) {
  if (!uniqueKeys.has(key)) fail(`Missing representative Scanner/Movements/Transfers translation row: ${key}`);
}
if (!process.exitCode) pass(`${representativeRows.length} representative Scanner/Movements/Transfers rows are present in all five locales.`);

if (!scannerSource.includes('formatLocalizedDate') || !scannerSource.includes('formatLocalizedNumber')) {
  fail('Scanner must use locale-aware date and number formatting.');
}
if (!scannerSource.includes('ui(scannerResolutionError(err, mode))') || !scannerSource.includes('ui(cameraStartError')) {
  fail('Scanner camera and resolution workflow errors must pass through the translation layer.');
}
if (scannerSource.includes('>Shipment QR Scanner<') || scannerSource.includes('>Receiving Barcode Scanner<')) {
  fail('Scanner regressed to hard-coded English mode labels.');
} else pass('Scanner modes, camera/error states, package metadata, dates and quantities are localization-aware.');

if (!movementsSource.includes('localizeComposedLabel') || !movementsSource.includes('ui(movementTypeLabel')) {
  fail('Stock Movements must localize canonical movement labels and composed business references at display time.');
}
if (!movementsSource.includes("ui('Created'), ui('Product')") || !movementsSource.includes('formatDateTime(movement.created_at, locale)')) {
  fail('Stock Movements CSV export headers/dates must be locale-aware.');
}
if (movementsSource.includes('>Movement Ledger<') || movementsSource.includes('>Export Filtered CSV<')) {
  fail('Stock Movements regressed to hard-coded English ledger controls.');
} else pass('Stock Movements labels, references, CSV headers, statuses and dates are localization-aware.');

const forbiddenTransferPatterns = [
  '`Showing ${formatLocalizedNumber(firstVisible, locale)}',
  '` by ${transfer.created_by_user_name}`',
  '`Execute this stock transfer?\\n\\n${selectedTransfer',
  '`Cancel this stock transfer draft?${reasonLine}',
  '${accessRoleLabel} review access',
  '${product.unit || ui("units")} available`'
];
for (const pattern of forbiddenTransferPatterns) {
  if (transfersSource.includes(pattern)) fail(`Stock Transfers still contains mixed-language dynamic UI: ${pattern}`);
}
if (!transfersSource.includes("`${ui('Showing')} ${formatLocalizedNumber(firstVisible, locale)}")) {
  fail('Stock Transfers result summary must compose localized labels around locale-formatted counts.');
}
if (!transfersSource.includes("`${ui('Execute this stock transfer?')}\\n\\n")) {
  fail('Stock Transfers execute confirmation must be localized.');
}
if (!transfersSource.includes("`${ui('Cancel this stock transfer draft?')}${reasonLine}")) {
  fail('Stock Transfers cancel confirmation must be localized.');
}
if (!transfersSource.includes("`${ui(accessRoleLabel)} ${ui('review access')}`")) {
  fail('Stock Transfers review-access role label must be translated at display time.');
}
if (!transfersSource.includes("ui(formatReadableText(location.temperature_zone))")) {
  fail('Stock Transfers must localize standard location temperature-zone display without changing canonical values.');
}
if (!transfersSource.includes("${ui('available')}`")) {
  fail('Stock Transfers source availability suffix must be localized.');
}
if (transfersSource.includes('>Create Transfer Draft<') || transfersSource.includes('>Execute transfer<')) {
  fail('Stock Transfers regressed to hard-coded English lifecycle controls.');
} else pass('Stock Transfers dynamic summaries, role/status display, confirmations, print/export text and availability copy are localization-aware.');

if (!process.exitCode) console.log('Tenant Scanner/Movements/Transfers multilingual hardening: PASS');
