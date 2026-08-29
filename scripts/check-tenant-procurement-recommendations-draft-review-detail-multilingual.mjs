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
  'Draft', 'Submitted', 'Cancelled', 'Completed', 'Submitted for approval',
  'Ready', 'Blocked', 'Unknown',
  'Not configured', 'Within budget', 'Over budget', 'Under budget',
  'High confidence', 'Medium confidence', 'Low confidence',
  'Product replenishment', 'Needs review', 'Needs cost review', 'Linked',
  'Usage and minimum stock', 'Usage velocity', 'Minimum stock', 'Inventory threshold',
  'Calculated', 'No outbound history', 'Limited history',
  'Missing supplier', 'Product default supplier', 'Preferred catalog with current price',
  'Preferred catalog supplier', 'Product default with purchase history',
  'Late risk', 'Reliable', 'Watch', 'Review'
];
const missingDynamic = dynamicUiKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Procurement Recommendations dynamic detail display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass('Procurement Recommendations PO-review/detail canonical status, source-signal, supplier-reason, threshold, budget, and confidence display branches are catalog-backed.');

const renderStart = pageSource.indexOf('  return (\n    <div className="procurement-recommendations-page');
const advancedSentinel = pageSource.indexOf('      <div ref={advancedRef}', renderStart);
if (renderStart < 0 || advancedSentinel < 0) fail('Procurement Recommendations converted render boundary or advanced staged sentinel is missing.');
const convertedSource = renderStart >= 0 && advancedSentinel >= 0 ? pageSource.slice(renderStart, advancedSentinel) : '';

const rawText = convertedSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains before the advanced Procurement Recommendations boundary: ${rawText.join(' | ')}`);
else pass('Procurement Recommendations core + PO-draft review + recommendation detail + priority review have zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...convertedSource.matchAll(rawAttributePattern)].map((match) => match[0]).filter((entry) => !entry.includes('className'));
if (rawAttributes.length) fail(`Raw presentation attributes remain before the advanced Procurement Recommendations boundary: ${rawAttributes.join(' | ')}`);
else pass('Procurement Recommendations converted scope has zero raw literal hero/filter/table/form/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedNumber(parsed, locale, { maximumFractionDigits: digits })',
  'formatLocalizedCurrency(parsed, normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 2 })',
  'formatLocalizedDate(value, locale)',
  'formatLocalizedDateTime(value, locale)',
  'canonicalDisplayLabel',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations shared multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Procurement Recommendations PO-review/detail uses the shared tenant translation runtime with locale-aware numbers, currency, dates, and timestamps.');

for (const required of [
  "path: 'procurement-recommendations'",
  'TENANT_PERMISSIONS.INSIGHTS_READ',
  '<ProcurementRecommendationsPage />',
]) if (!routerSource.includes(required)) fail(`Procurement Recommendations tenant route contract changed or missing: ${required}`);
for (const required of [
  "INSIGHTS_READ: 'insights.read'",
  "PURCHASE_ORDERS_READ: 'purchase_orders.read'",
  "PURCHASE_ORDERS_APPROVE: 'purchase_orders.approve'",
  'canViewPurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_READ)',
  'canApprovePurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_APPROVE)',
]) if (!permissionsSource.includes(required)) fail(`Procurement Recommendations PO-review/detail permission identifier/capability changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Procurement Recommendations PO-review/detail route and insights/purchase-order permission identifiers remain unchanged.');

for (const required of [
  '`/reorder-insights/recommendations/po-drafts?status=all&limit=${limit}&offset=${offset}`',
  '`/reorder-insights/recommendations/${encodeURIComponent(productId)}?${params.toString()}`',
  'buildRecommendationDetailPath(productId, filters).replace(',
  '}/decision?${buildRecommendationActionQuery(filters)}`',
  'status: "approved"',
  'status: "deferred"',
  'status: "rejected"',
  'body: JSON.stringify({ status, note: note || null })',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations PO-review/detail endpoint/canonical decision contract changed or missing: ${required}`);
if (!process.exitCode) pass('PO-draft review/detail/decision endpoints and canonical approve/defer/reject payload values remain unchanged.');

for (const required of [
  '"generated_at"', '"po_status_filter"', '"purchase_order_id"', '"po_number"', '"po_status"',
  '"review_status"', '"supplier_id"', '"supplier_name"', '"governance_warning_codes"',
  '"governance_warning_messages"', '"decision_note"', '"line_notes"',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations PO-draft CSV technical schema changed or missing: ${required}`);
if (!process.exitCode) pass('PO-draft review CSV technical headers remain canonical and untranslated.');

for (const required of [
  'po.po_number', 'po.supplier_name || po.supplier_id', 'warning.message || warning.code',
  'selectedDetail.product_name', 'selectedDetail.category', 'selectedDetail.unit',
  'selectedDetail.budget_blocker_message', 'selectedDetail.recommended_supplier_name',
  'selectedDetail.decision_note', 'selectedDetail.detail?.reasoning',
  'blocker.message || blocker.code', 'warning.message || warning.code',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations raw business/server evidence boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Product/supplier names, notes, backend blockers/warnings/reasoning, and other business/server evidence remain raw.');

for (const required of [
  'formatUiDateTime(po.created_at)',
  'formatUiDate(po.expected_delivery_date)',
  'formatUiDate(selectedDetail.projected_depletion_date)',
  'formatUiDate(selectedDetail.last_purchase_date)',
  'formatUiDateTime(selectedDetail.decided_at)',
  'formatUiDateTime(selectedDetail.converted_at)',
  'formatUiNumber(po.item_count, 0)',
  'formatUiMoney(po.estimated_total_cost, po.currency)',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations localized PO-review/detail value presentation missing: ${required}`);
if (!process.exitCode) pass('PO-review/detail human-facing dates, timestamps, counts, and currency use locale-aware formatters.');

for (const required of [
  'ui("Purchase order drafts")',
  'ui("Recommendation detail")',
  'ui("Priority review")',
  'ui("Advanced procurement controls")',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations staged completion/sentinel contract changed or missing: ${required}`);
if (!process.exitCode) pass('PO-draft review, recommendation detail, and priority review are multilingual; advanced procurement controls are now multilingual as well.');

if (!process.exitCode) pass('Tenant Procurement Recommendations draft-review/detail multilingual staged checks passed.');
