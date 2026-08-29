import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/ShipmentsPage.tsx');
const routerSource = read('src/app/router.tsx');
const permissionsSource = read('src/lib/permissions.ts');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
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

for (const row of rows) {
  const expected = [...row[0].matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort().join('|');
  for (const translated of row.slice(1)) {
    const actual = [...translated.matchAll(/\{[^{}]+\}/g)].map((match) => match[0]).sort().join('|');
    if (actual !== expected) fail(`Placeholder mismatch for tenant UI key: ${row[0]}`);
  }
}
if (!process.exitCode) pass('Tenant UI placeholder parity is intact across all five languages.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const literals = [];
for (const match of pageSource.matchAll(literalPattern)) {
  try { literals.push(decodeLiteral(match[1])); } catch {}
}
const literalSet = new Set(literals);
const missing = [...literalSet].filter((key) => !unique.has(key));
if (missing.length) fail(`Shipments ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Shipments staged page has ${literalSet.size} catalog-backed literal UI keys.`);

const stageStart = pageSource.indexOf('        <div id="shipments-detail"');
const stageEnd = pageSource.indexOf('      {canAutoReorderShipments ?', stageStart);
if (stageStart < 0 || stageEnd < 0) fail('Shipments detail/receiving staged render boundary is missing.');
const stageSource = stageStart >= 0 && stageEnd >= 0 ? pageSource.slice(stageStart, stageEnd) : '';

const rawText = stageSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains in Shipments detail/receiving stage: ${rawText.join(' | ')}`);
else pass('Shipments detail/receiving stage has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...stageSource.matchAll(rawAttributePattern)].map((match) => match[0]);
if (rawAttributes.length) fail(`Raw presentation attributes remain in Shipments detail/receiving stage: ${rawAttributes.join(' | ')}`);
else pass('Shipments detail/receiving stage has zero raw literal hero/form/scanner/receiving presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedNumber } from '../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  "return formatLocalizedDate(date, locale);",
  'formatLocalizedNumber(toNumber(value), locale, { maximumFractionDigits })',
  'formatLocalizedCurrency(amount, normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 4 })',
  "ui('Selected Shipment')",
  "ui('Receiving Progress')",
  "ui('Scanner Readiness')",
  "ui('Shipment Items')",
  "ui('Usable Quantity Received')",
  "ui('Finalize Shipment')"
]) if (!pageSource.includes(required)) fail(`Shipments detail/receiving multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Shipments detail/receiving uses shared tenant translation plus locale-aware date, quantity, and currency presentation.');

for (const required of [
  "path: 'shipments'",
  'requiredPermissions={[TENANT_PERMISSIONS.SHIPMENTS_READ]}',
  '<ShipmentsPage />'
]) if (!routerSource.includes(required)) fail(`Shipments route contract changed or missing: ${required}`);
for (const required of [
  "SHIPMENTS_READ: 'shipments.read'",
  "SHIPMENTS_WRITE: 'shipments.write'",
  "SHIPMENTS_SEND: 'shipments.send'",
  "SHIPMENTS_RECEIVE: 'shipments.receive'",
  "SHIPMENTS_FINALIZE: 'shipments.finalize'",
  "SHIPMENTS_AUTO_REORDER: 'shipments.auto_reorder'",
  "SHIPMENT_ITEMS_READ: 'shipment_items.read'",
  "SHIPMENT_ITEMS_WRITE: 'shipment_items.write'",
  'canManageShipments: can(TENANT_PERMISSIONS.SHIPMENTS_WRITE)',
  'canManageShipmentItems: can(TENANT_PERMISSIONS.SHIPMENT_ITEMS_WRITE)',
  'canViewShipmentItems: can(TENANT_PERMISSIONS.SHIPMENT_ITEMS_READ)',
  'canReceiveShipments: can(TENANT_PERMISSIONS.SHIPMENTS_RECEIVE)',
  'canFinalizeShipments: can(TENANT_PERMISSIONS.SHIPMENTS_FINALIZE)'
]) if (!permissionsSource.includes(required)) fail(`Shipments permission identifier/capability changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Shipment read/header/item/receive/finalize permission identifiers and capabilities remain unchanged.');

for (const required of [
  "apiRequest<ShipmentItem[]>(`/shipment-items/${shipmentId}`)",
  "apiRequest<ShipmentItem>('/shipment-items', {",
  "apiRequest<ShipmentItem>(`/shipment-items/${input.itemId}`, {",
  "apiRequest<{ message?: string }>(`/shipment-items/${input.itemId}`, {",
  "apiRequest<ShipmentItem>(`/shipment-items/${input.itemId}/receiving-discrepancy`, {",
  "apiRequest<ReceiveShipmentResponse>(`/shipments/${input.shipmentId}/receive`, {",
  "apiRequest<FinalizeShipmentResponse>(`/shipments/${input.shipmentId}/finalize`, {",
  "'If-Match-Version': String(input.version)",
  'discrepancy_reason: input.discrepancyReason',
  'items: [input.item]'
]) if (!pageSource.includes(required)) fail(`Shipments detail/item/receiving/finalize endpoint or concurrency contract changed/missing: ${required}`);
if (!process.exitCode) pass('Shipment item CRUD, discrepancy, receive, finalize, payload, and If-Match-Version contracts remain unchanged.');

for (const required of [
  'selectedShipment.supplier_name || selectedShipment.supplier_id',
  'item.product_name || item.product_id',
  'location.name',
  'item.discrepancy_reason',
  'selectedShipment.po_number',
  'error.message'
]) if (!pageSource.includes(required)) fail(`Shipments business/server raw-data boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Supplier/product/location/PO/business discrepancy data and backend/API error detail remain raw.');

for (const required of [
  "ui('Shipment header and line structure are locked after receiving starts. Receiving and finalization remain available according to your permissions.')",
  "ui('Shipment receive permission is required before opening the receiving barcode scanner.')",
  "ui('Select a storage location before receiving this line.')",
  'incompleteShipmentLinesWithoutReason.length > 0',
  "ui('{count} incomplete line(s) still need a saved discrepancy reason before finalization. Enter a shortage reason on each incomplete line and use Save shortage reason; receiving additional stock is not required.')",
  "ui('Finalize this fully received shipment? This will lock receiving.')",
  "ui('Finalize shipment with {count} documented shortage/discrepancy line(s)? This will lock the shipment as received.')"
]) if (!pageSource.includes(required)) fail(`Shipments detail/receiving safety or finalization guard presentation missing: ${required}`);
if (!process.exitCode) pass('Receiving lock, scanner permission/location, discrepancy-reason, and finalization safeguards remain explicit after translation.');

if (!pageSource.includes("title={ui('Advanced shipment controls')}") || !pageSource.includes(">{ui('Supplier Email Preview')}</h3>") || !pageSource.includes("setPageError(ui('Your current role cannot run shipment auto reorder.'))") || !pageSource.includes("setPageError(ui('Your current role does not have the shipments.send permission required to email suppliers.'))")) {
  fail('Shipments multilingual progression sentinel changed: supplier-send and legacy direct-auto-reorder surfaces must remain catalog-backed after page completion.');
} else pass('Shipments detail/receiving historical checker recognizes the completed supplier-send and legacy direct-auto-reorder surfaces.');

for (const legacy of [
  'title="Selected Shipment"',
  '<h4 style={styles.sectionTitle}>Receiving Progress</h4>',
  'title="Save a shortage reason without receiving stock. Use this when the supplier delivered zero or the line will remain short."'
]) {
  if (pageSource.includes(legacy)) fail(`Legacy untranslated Shipments detail/receiving sentinel still exists: ${legacy}`);
}
if (!process.exitCode) pass('Shipments detail/receiving former untranslated sentinels are removed.');

if (!process.exitCode) pass('Tenant Shipments detail and receiving multilingual checks passed.');
