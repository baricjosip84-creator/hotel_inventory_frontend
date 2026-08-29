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
else pass(`Completed Shipments page has ${literalSet.size} catalog-backed literal UI keys.`);

const renderStart = pageSource.indexOf('  return (\n    <div className="io-operational-page io-workspace-page io-shipments-page">');
const renderEnd = pageSource.indexOf('\n  );\n}', renderStart);
if (renderStart < 0 || renderEnd < 0) fail('Completed Shipments render boundary is missing.');
const renderSource = renderStart >= 0 && renderEnd >= 0 ? pageSource.slice(renderStart, renderEnd) : '';

const rawText = renderSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains on completed Shipments page: ${rawText.join(' | ')}`);
else pass('Completed Shipments page has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...renderSource.matchAll(rawAttributePattern)].map((match) => match[0]);
if (rawAttributes.length) fail(`Raw presentation attributes remain on completed Shipments page: ${rawAttributes.join(' | ')}`);
else pass('Completed Shipments page has zero raw literal presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedNumber } from '../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'return formatLocalizedDate(date, locale);',
  'formatLocalizedNumber(toNumber(value), locale, { maximumFractionDigits })',
  'formatLocalizedCurrency(amount, normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 4 })',
  "title={ui('Advanced shipment controls')}",
  ">{ui('Supplier Email Preview')}</h3>",
  "ui('Confirm & Send Email')",
  "ui('Run direct reorder')"
]) if (!pageSource.includes(required)) fail(`Shipments page-completion multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Supplier-email, document-preview, and legacy direct-reorder presentation use the shared tenant translation and locale-aware formatters.');

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
  'canSendShipments: can(TENANT_PERMISSIONS.SHIPMENTS_SEND)',
  'canAutoReorderShipments: can(TENANT_PERMISSIONS.SHIPMENTS_AUTO_REORDER)'
]) if (!permissionsSource.includes(required)) fail(`Shipments permission identifier/capability changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Shipment route and send/auto-reorder permission identifiers remain unchanged.');

for (const required of [
  "apiRequest<SupplierEmailPreview>(`/shipments/${input.shipmentId}/supplier-email-preview`, {",
  "apiRequest<SendShipmentToSupplierResponse>(",
  '`/shipments/${input.shipmentId}/send-to-supplier`,',
  'recipient_email: input.recipientEmail.trim()',
  'message: input.message?.trim() || null',
  'confirmed: true',
  "apiRequest<{ message?: string; shipments?: ShipmentSummary[]; created_shipments?: ShipmentSummary[] }>('/shipments/auto-reorder', {",
  "method: 'POST'",
  'body: JSON.stringify({})'
]) if (!pageSource.includes(required)) fail(`Shipments supplier-send/auto-reorder endpoint or payload contract changed/missing: ${required}`);
if (!process.exitCode) pass('Supplier preview/send confirmation and legacy auto-reorder endpoint/payload contracts remain unchanged.');

for (const required of [
  "ui('Your current role does not have the shipments.send permission required to email suppliers.')",
  "ui('Enter a valid supplier email address before sending.')",
  "ui('Review the recipient, message, {documentTitle}, and Receiving QR. Nothing has been sent yet.')",
  "ui('Supplier email is not configured on this server. The shipment was not changed; continue receiving/finalizing manually or configure backend email settings before using supplier email.')",
  "ui('Run auto reorder now? This may create shipments from current reorder rules.')",
  "ui('This older shortcut creates pending shipments directly from low-stock rules. Use Procurement Recommendations or Replenishment Planning for normal governed purchasing.')"
]) if (!pageSource.includes(required)) fail(`Shipments send/direct-reorder safety presentation missing: ${required}`);
if (!process.exitCode) pass('Supplier-send confirmation/configuration and legacy-direct-reorder warnings remain explicit after translation.');

for (const required of [
  'supplierEmailPreview.document.document_title',
  'supplierEmailPreview.subject',
  'supplierEmailPreview.document.qr_purpose',
  'supplierEmailPreview.document.buyer.name',
  'supplierEmailPreview.document.supplier.name',
  'supplierEmailPreview.document.notes',
  'item.product_name',
  'data.message || fallbackMessage',
  'error.message'
]) if (!pageSource.includes(required)) fail(`Shipments server/business raw-data boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Backend-generated document title/subject/QR purpose/messages plus supplier/product/business data remain raw while frontend-owned wrappers are localized.');

for (const legacy of [
  'title="Advanced shipment controls"',
  '>Supplier Email Preview</h3>',
  "setPageError('Your current role cannot run shipment auto reorder.')",
  "window.confirm('Run auto reorder now? This may create shipments from current reorder rules.')",
  "setPageError('Your current role does not have the shipments.send permission required to email suppliers.')",
  "? 'Running direct reorder...' : 'Run direct reorder'",
  "? 'Sending...' : 'Confirm & Send Email'",
  'placeholder="Optional message to supplier"',
  'alt="Receiving QR code"'
]) if (pageSource.includes(legacy)) fail(`Legacy untranslated Shipments completion sentinel still exists: ${legacy}`);
if (!process.exitCode) pass('All former supplier-email and advanced-control untranslated sentinels are removed.');

if (!process.exitCode) pass('Tenant Shipments full-page multilingual completion checks passed.');
