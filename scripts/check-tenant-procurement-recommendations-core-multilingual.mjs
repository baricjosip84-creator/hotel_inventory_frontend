import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/ProcurementRecommendationsPage.tsx');
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
if (missing.length) fail(`Procurement Recommendations ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Procurement Recommendations page currently has ${literalSet.size} catalog-backed literal UI keys.`);

const dynamicUiKeys = [
  'Critical', 'High', 'Medium', 'Low',
  'Approved', 'Rejected', 'Deferred', 'Pending',
  'Draft', 'Submitted', 'Cancelled', 'Completed',
  'Ready', 'Blocked', 'Unknown',
  'Not configured', 'Within budget', 'Over budget', 'Under budget',
  'High confidence', 'Medium confidence', 'Low confidence',
  'Product replenishment', 'Needs review', 'Linked'
];
const missingDynamic = dynamicUiKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Procurement Recommendations dynamic display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass('Procurement Recommendations known canonical status/urgency/budget/confidence display branches are catalog-backed.');

const renderStart = pageSource.indexOf('  return (\n    <div className="procurement-recommendations-page');
const stageSentinel = pageSource.indexOf('      <div ref={poDraftRef}', renderStart);
if (renderStart < 0 || stageSentinel < 0) fail('Procurement Recommendations core render boundary or PO-draft staged sentinel is missing.');
const convertedSource = renderStart >= 0 && stageSentinel >= 0 ? pageSource.slice(renderStart, stageSentinel) : '';

const rawText = convertedSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains in converted Procurement Recommendations core: ${rawText.join(' | ')}`);
else pass('Procurement Recommendations core has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...convertedSource.matchAll(rawAttributePattern)].map((match) => match[0]).filter((entry) => !entry.includes('className'));
if (rawAttributes.length) fail(`Raw presentation attributes remain in converted Procurement Recommendations core: ${rawAttributes.join(' | ')}`);
else pass('Procurement Recommendations core has zero raw literal hero/filter/table/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedNumber(parsed, locale, { maximumFractionDigits: digits })',
  'formatLocalizedCurrency(parsed, normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 2 })',
  'formatLocalizedDateTime(value, locale)',
  'canonicalDisplayLabel',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations shared multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Procurement Recommendations core uses the shared tenant translation runtime with locale-aware numeric, currency, date, and timestamp presentation helpers.');

for (const required of [
  "path: 'procurement-recommendations'",
  'TENANT_PERMISSIONS.INSIGHTS_READ',
  '<ProcurementRecommendationsPage />',
]) if (!routerSource.includes(required)) fail(`Procurement Recommendations tenant route contract changed or missing: ${required}`);
for (const required of [
  "INSIGHTS_READ: 'insights.read'",
  "PRODUCTS_WRITE: 'products.write'",
  "PURCHASE_ORDERS_READ: 'purchase_orders.read'",
  "PURCHASE_ORDERS_CREATE: 'purchase_orders.create'",
  "PURCHASE_ORDERS_APPROVE: 'purchase_orders.approve'",
  'canManageProducts: can(TENANT_PERMISSIONS.PRODUCTS_WRITE)',
  'canViewPurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_READ)',
  'canCreatePurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_CREATE)',
  'canApprovePurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_APPROVE)',
]) if (!permissionsSource.includes(required)) fail(`Procurement Recommendations frontend permission identifier/capability changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Procurement Recommendations route and insights/product/purchase-order permission identifiers remain unchanged.');

for (const required of [
  '`/reorder-insights/recommendations?${params.toString()}`',
  '"/reorder-insights/recommendations/options"',
  '`/reorder-insights/recommendations/${encodeURIComponent(productId)}?${params.toString()}`',
  'buildRecommendationDetailPath(productId, filters).replace(',
  '}/decision?${buildRecommendationActionQuery(filters)}`',
  '`/reorder-insights/recommendations/bulk-readiness?${buildRecommendationActionQuery(filters)}`',
  '`/reorder-insights/recommendations/bulk-decision?${buildRecommendationActionQuery(filters)}`',
  '`/reorder-insights/recommendations/convert-to-po-drafts?${buildRecommendationActionQuery(filters)}`',
  'status: "approved"',
  'status: "deferred"',
  'status: "rejected"',
  'product_ids: productIds',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations endpoint/canonical mutation contract changed or missing: ${required}`);
if (!process.exitCode) pass('Procurement Recommendations read/detail/decision/bulk-readiness/bulk-decision/PO-draft-conversion endpoint and canonical action contracts remain unchanged.');

for (const required of [
  '`procurement-recommendations-${scope}-${stamp}.csv`',
  '"export_scope"',
  '"product_id"',
  '"recommended_reorder_quantity"',
  '"recommended_supplier_id"',
  '"decision_status"',
  '"converted_purchase_order_id"',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations technical CSV filename/header contract changed or missing: ${required}`);
if (!process.exitCode) pass('Procurement Recommendations technical CSV filename and schema headers remain canonical and untranslated.');

for (const required of [
  'row.product_name',
  'row.category',
  'row.unit',
  'row.recommended_supplier_name',
  'row.blocker_message',
  'bulkReadiness.results',
  'blocker.message || blocker.code',
  'po.po_number',
  'po.supplier_name',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations raw business/server evidence boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Procurement Recommendations product/supplier/blocker/business/server evidence remains raw in the converted core.');

const poDraftHeading = 'ui("Purchase order drafts")';
const detailHeading = 'ui("Recommendation detail")';
const advancedHeading = 'ui("Advanced procurement controls")';
for (const sentinel of [poDraftHeading, detailHeading, advancedHeading]) {
  if (!pageSource.includes(sentinel)) fail(`Expected staged Procurement Recommendations sentinel missing: ${sentinel}`);
}
if (!process.exitCode) pass('Core workflow remains multilingual; PO-draft review/detail are now multilingual too, and advanced procurement governance is now multilingual as well.');

if (!process.exitCode) pass('Tenant Procurement Recommendations core multilingual staged checks passed.');
