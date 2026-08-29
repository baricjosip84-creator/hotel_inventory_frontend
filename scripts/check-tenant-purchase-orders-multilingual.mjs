import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/PurchaseOrdersPage.tsx');
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
if (missing.length) fail(`Purchase Orders ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Purchase Orders page has ${literalSet.size} catalog-backed literal UI keys.`);

const dynamicUiKeys = [
  'Oldest first', 'Expected soonest', 'Expected latest', 'Highest value', 'Lowest value', 'Most received', 'Least received', 'Newest first',
  'Platform support', 'Tenant user', 'Fully received', 'Manually closed', 'Received', 'Partial', 'Not started', 'N/A',
  'Matched', 'Pending receipt', 'Open short', 'Closed short', 'Partial short', 'Not received', 'Over received',
  'Overdue', 'Due today', 'Upcoming', 'Fulfilled', 'Cancelled', 'No date', 'Submit for approval', 'Approve or cancel',
  'Create shipment', 'Receive shipment', 'Follow up overdue', 'Monitor receiving', 'Completed', 'No action',
  'At least one purchase order item is required before submission.',
  '1 item is missing a positive unit cost. Edit the draft and enter supplier pricing before submitting or approving.',
  '{count} items are missing a positive unit cost. Edit the draft and enter supplier pricing before submitting or approving.',
  'Estimated PO cost must be greater than zero before submitting or approving.',
  'Expected from', 'Expected to', 'Created from', 'Created to', 'Approved from', 'Approved to', 'Completed from', 'Completed to', 'Cancelled from', 'Cancelled to'
];
const missingDynamic = dynamicUiKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Purchase Orders dynamic UI keys missing translations: ${missingDynamic.join(' | ')}`);
else pass('Purchase Orders sort/status/date/cost dynamic presentation branches are catalog-backed.');

const renderStart = pageSource.indexOf('export default function PurchaseOrdersPage()');
const renderSource = renderStart >= 0 ? pageSource.slice(renderStart) : pageSource;
const rawText = renderSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains in Purchase Orders: ${rawText.join(' | ')}`);
else pass('Purchase Orders page has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...renderSource.matchAll(rawAttributePattern)].map((match) => match[0]).filter((entry) => !entry.includes('className'));
if (rawAttributes.length) fail(`Raw presentation attributes remain in Purchase Orders: ${rawAttributes.join(' | ')}`);
else pass('Purchase Orders page has zero raw literal hero/section/placeholder/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "import type { AppLocale } from '../i18n/config';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDate(date, locale)',
  'formatLocalizedDateTime(date, locale)',
  'formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 4 })',
  'formatLocalizedCurrency(amount, normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 2 })',
  "ui('Page {page} of {total}')",
  "ui('Completed by {name}')",
]) if (!pageSource.includes(required)) fail(`Purchase Orders shared multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Purchase Orders uses the shared tenant translation runtime with locale-aware date, numeric, percent, and currency presentation.');

for (const required of [
  "path: 'purchase-orders'",
  'TENANT_PERMISSIONS.PURCHASE_ORDERS_READ',
  '<PurchaseOrdersPage />',
]) if (!routerSource.includes(required)) fail(`Purchase Orders tenant route contract changed or missing: ${required}`);
for (const required of [
  "PURCHASE_ORDERS_READ: 'purchase_orders.read'",
  "PURCHASE_ORDERS_CREATE: 'purchase_orders.create'",
  "PURCHASE_ORDERS_UPDATE: 'purchase_orders.update'",
  "PURCHASE_ORDERS_SUBMIT: 'purchase_orders.submit'",
  "PURCHASE_ORDERS_APPROVE: 'purchase_orders.approve'",
  "PURCHASE_ORDERS_CANCEL: 'purchase_orders.cancel'",
  "SHIPMENTS_WRITE: 'shipments.write'",
  "INVENTORY_RESERVATIONS_CREATE: 'inventory_reservations.create'",
  'canCreatePurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_CREATE)',
  'canUpdatePurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_UPDATE)',
  'canSubmitPurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_SUBMIT)',
  'canApprovePurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_APPROVE)',
  'canCancelPurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_CANCEL)',
  'canManageShipments: can(TENANT_PERMISSIONS.SHIPMENTS_WRITE)',
  'canCreateInventoryReservations: can(TENANT_PERMISSIONS.INVENTORY_RESERVATIONS_CREATE)',
]) if (!permissionsSource.includes(required)) fail(`Purchase Orders frontend permission identifier/capability changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Purchase Orders route and procurement/shipment/reservation permission identifiers remain unchanged.');

for (const required of [
  '`/purchase-orders${suffix}`',
  '`/purchase-orders/${id}`',
  "apiRequest<PurchaseOrderDetail>('/purchase-orders', {",
  '`/purchase-orders/${id}/${action}`',
  '`/purchase-orders/${id}/create-shipment`',
  '`/inventory-reservations/from-purchase-order/${id}`',
  "method: 'POST'",
  "method: 'PATCH'",
  "'If-Match-Version': String(version)",
  "action: 'submit'",
  "action: 'approve'",
  "action: 'close'",
  "action: 'reopen'",
  "action: 'cancel'",
  "linkage_note: 'Protect open inbound purchase order quantity'",
]) if (!pageSource.includes(required)) fail(`Purchase Orders endpoint/version/canonical mutation contract changed or missing: ${required}`);
if (!process.exitCode) pass('Purchase Orders read/create/update/lifecycle/shipment/reservation endpoint and version contracts remain unchanged.');

for (const required of [
  "downloadCsv(`purchase-orders-${stamp}.csv`",
  "downloadCsv(`purchase-orders-page-${currentPage}-${stamp}.csv`",
  "downloadCsv(`purchase-order-${selectedDetail.po_number || selectedDetail.id}-audit-${stamp}.csv`",
  "downloadCsv(`purchase-order-${selectedDetail.po_number || selectedDetail.id}.csv`",
  "'PO Number',\n      'Supplier',\n      'Status'",
  "['Created At', 'Action', 'Actor', 'Entity Type', 'Entity ID', 'Metadata Summary']",
  "['Product', 'Ordered Unit', 'Ordered Quantity', 'Base Unit', 'Base Quantity'",
  "['Shipment', 'Status', 'Delivery Date', 'Item Count', 'Ordered Quantity', 'Received Quantity', 'Created At']",
]) if (!pageSource.includes(required)) fail(`Purchase Orders technical CSV filename/header contract changed or missing: ${required}`);
if (!process.exitCode) pass('Purchase Orders technical CSV filenames and schema headers remain canonical and untranslated.');

for (const required of [
  'selectedDetail.supplier_name',
  'selectedDetail.notes',
  'item.product_name',
  'item.notes ??',
  'selectedDetail.completion_reason',
  'event.action',
  'event.entity_type',
  'auditMetadataSummary(event.metadata)',
  'shipment.po_number || shipment.qr_code || shipment.id',
]) if (!pageSource.includes(required)) fail(`Purchase Orders raw business/server evidence boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Purchase Orders supplier/product/note/audit/shipment business and server evidence remains raw.');

if (!process.exitCode) pass('Tenant Purchase Orders multilingual whole-page completion checks passed.');
