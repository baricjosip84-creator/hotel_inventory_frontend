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

for (const key of ['Pending', 'Partial', 'Received']) {
  if (!unique.has(key)) fail(`Shipments status display key missing from catalog: ${key}`);
}
if (!process.exitCode) pass('Shipments canonical pending/partial/received status display labels are catalog-backed.');

const renderStart = pageSource.indexOf('  return (\n    <div className="io-operational-page io-workspace-page io-shipments-page">');
const stageEnd = pageSource.indexOf('        <div id="shipments-detail"', renderStart);
if (renderStart < 0 || stageEnd < 0) fail('Shipments registry/create staged render boundary is missing.');
const stageSource = renderStart >= 0 && stageEnd >= 0 ? pageSource.slice(renderStart, stageEnd) : '';

const rawText = stageSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains in Shipments registry/create stage: ${rawText.join(' | ')}`);
else pass('Shipments registry/create stage has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...stageSource.matchAll(rawAttributePattern)].map((match) => match[0]);
if (rawAttributes.length) fail(`Raw presentation attributes remain in Shipments registry/create stage: ${rawAttributes.join(' | ')}`);
else pass('Shipments registry/create stage has zero raw literal hero/form/filter/table/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedNumber } from '../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'return formatLocalizedDate(date, locale);',
  'formatLocalizedNumber(toNumber(value), locale, { maximumFractionDigits })',
  "if (status === 'pending') return ui('Pending');",
  "if (status === 'partial') return ui('Partial');",
  "if (status === 'received') return ui('Received');",
  "ui('Showing {start}–{end} of {count}')",
  "ui('Page {page} of {pages}')"
]) if (!pageSource.includes(required)) fail(`Shipments registry/create multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Shipments registry/create stage uses shared tenant translation with locale-aware dates, quantities, counts, pagination, and known status display.');

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
  'canSendShipments: can(TENANT_PERMISSIONS.SHIPMENTS_SEND)',
  'canReceiveShipments: can(TENANT_PERMISSIONS.SHIPMENTS_RECEIVE)',
  'canFinalizeShipments: can(TENANT_PERMISSIONS.SHIPMENTS_FINALIZE)',
  'canAutoReorderShipments: can(TENANT_PERMISSIONS.SHIPMENTS_AUTO_REORDER)'
]) if (!permissionsSource.includes(required)) fail(`Shipments permission identifier/capability changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Shipments route plus read/write/item/send/receive/finalize/auto-reorder permission identifiers remain unchanged.');

for (const required of [
  "apiRequest<ShipmentSummary[]>('/shipments')",
  "apiRequest<ShipmentOptions>('/shipments/options')",
  "apiRequest<ShipmentItem[]>(`/shipment-items/${shipmentId}`)",
  "apiRequest<ShipmentSummary>('/shipments', {",
  "method: 'POST'",
  'supplier_id: input.supplier_id',
  'delivery_date: input.delivery_date',
  'po_number: input.po_number.trim() || null',
  'purchase_order_id: input.purchase_order_id || null',
  "apiRequest<ShipmentSummary>(`/shipments/${input.shipmentId}`, {",
  "method: 'PATCH'",
  "'If-Match-Version': String(input.version)",
  "method: 'DELETE'"
]) if (!pageSource.includes(required)) fail(`Shipments header/list endpoint or concurrency contract changed/missing: ${required}`);
if (!process.exitCode) pass('Shipments list/options/create/update/delete endpoint, payload, and If-Match-Version contracts remain unchanged.');

for (const required of [
  'shipment.supplier_name || shipment.supplier_id',
  'supplier.name',
  'order.po_number',
  'order.supplier_name || order.supplier_id',
  'shipmentsQuery.error.message',
  'accessRoleLabel'
]) if (!pageSource.includes(required)) fail(`Shipments business/server raw-data boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Supplier names, PO numbers, access-role data, shipment IDs, and backend/API error detail remain raw while frontend-owned presentation is localized.');

for (const required of [
  "ui('Optional bridge only. Linking an approved Purchase Order does not change stock or receiving logic.')",
  "ui('Optional bridge only: this links an approved Purchase Order to the shipment without changing stock or receiving logic.')",
  "ui('This role can review shipments but cannot create or edit shipment headers.')",
  "ui('Shipments write permission required')",
  "ui('Select a supplier and delivery date before creating a shipment.')"
]) if (!pageSource.includes(required)) fail(`Shipments registry/create safety/access presentation missing: ${required}`);
if (!process.exitCode) pass('Shipments creation access and PO-linking non-stock-mutation guidance remain explicit after translation.');

if (!pageSource.includes("title={ui('Selected Shipment')}") || !pageSource.includes("<h4 style={styles.sectionTitle}>{ui('Receiving Progress')}</h4>") || !pageSource.includes("title={ui('Advanced shipment controls')}") || !pageSource.includes(">{ui('Supplier Email Preview')}</h3>")) {
  fail('Shipments multilingual progression sentinel changed: registry/create, detail/receiving, supplier-email, and advanced surfaces must remain catalog-backed.');
} else pass('Shipments registry/create historical checker recognizes the fully multilingual downstream Shipments surfaces.');

if (pageSource.includes('eyebrow="Procurement"') || pageSource.includes('title="Shipment List"') || pageSource.includes('placeholder="Search by PO, supplier, shipment ID, status..."')) {
  fail('Legacy untranslated Shipments registry/create presentation sentinel still exists.');
} else pass('Shipments registry/create former untranslated sentinels are removed.');

if (!process.exitCode) pass('Tenant Shipments registry and creation multilingual checks passed.');
