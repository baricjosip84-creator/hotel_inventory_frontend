import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/ReplenishmentPlanningPage.tsx');
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
if (missing.length) fail(`Replenishment Planning ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Replenishment Planning page has ${literalSet.size} catalog-backed literal UI keys.`);

const dynamicUiKeys = [
  'Drafts created', 'Review complete', 'Partially reviewed', 'In review', 'Cancelled', 'Executed', 'Completed', 'Fulfilled',
  'Rejected', 'Failed', 'Accepted', 'Approved', 'Submitted', 'Pending',
  'Needs decision', 'Accept recommendation', 'Use a different quantity', 'Reject recommendation', 'Defer decision', 'Already handled outside this plan'
];
const missingDynamic = dynamicUiKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Replenishment Planning dynamic human-display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass('Replenishment Planning canonical run/status and decision display branches are catalog-backed.');

const renderStart = pageSource.indexOf('  return (\n    <div id="replenishment-planning-workspace-top"');
const renderEnd = pageSource.indexOf('\n  );\n}', renderStart);
if (renderStart < 0 || renderEnd < 0) fail('Replenishment Planning full render boundary is missing.');
const renderSource = renderStart >= 0 && renderEnd >= 0 ? pageSource.slice(renderStart, renderEnd) : '';

const rawText = renderSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains on Replenishment Planning: ${rawText.join(' | ')}`);
else pass('Replenishment Planning full page has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...renderSource.matchAll(rawAttributePattern)].map((match) => match[0]).filter((entry) => !entry.includes('className'));
if (rawAttributes.length) fail(`Raw presentation attributes remain on Replenishment Planning: ${rawAttributes.join(' | ')}`);
else pass('Replenishment Planning has zero raw literal hero/form/filter/table/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  "import { formatCurrencyAmount, getActiveTenantCurrency, normalizeCurrencyCode } from '../lib/tenantCurrency';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedNumber(numberValue(value), locale, { maximumFractionDigits })',
  'formatLocalizedDateTime(value, locale)',
  'formatLocalizedCurrency(numberValue(value), normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 4 })',
  "const fallbackValue = typeof value === 'number' || typeof value === 'string' || value == null",
  'return formatCurrencyAmount(fallbackValue, currency, 4);',
  "ui('{percent}%').replace('{percent}', formatLocalizedNumber(numberValue(ratio) * 100, locale, { maximumFractionDigits: 0 }))",
  'canonicalDisplayLabel',
  'decisionDisplayLabel'
]) if (!pageSource.includes(required)) fail(`Replenishment Planning multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Replenishment Planning uses the shared tenant translation runtime with locale-aware numbers, currency, timestamps, and percentages.');

for (const required of [
  "path: 'replenishment-planning'",
  'TENANT_PERMISSIONS.INSIGHTS_READ',
  '<ReplenishmentPlanningPage />'
]) if (!routerSource.includes(required)) fail(`Replenishment Planning tenant route contract changed or missing: ${required}`);
for (const required of [
  "INSIGHTS_READ: 'insights.read'",
  "STOCK_TRANSFERS_CREATE: 'stock_transfers.create'",
  "PURCHASE_ORDERS_CREATE: 'purchase_orders.create'",
  "INVENTORY_OPTIMIZATION_CREATE: 'inventory_optimization.create'",
  "INVENTORY_OPTIMIZATION_GOVERN: 'inventory_optimization.govern'",
  'canCreateStockTransfers: can(TENANT_PERMISSIONS.STOCK_TRANSFERS_CREATE)',
  'canCreatePurchaseOrders: can(TENANT_PERMISSIONS.PURCHASE_ORDERS_CREATE)',
  'canCreateInventoryOptimization: can(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_CREATE)',
  'canGovernInventoryOptimization: can(TENANT_PERMISSIONS.INVENTORY_OPTIMIZATION_GOVERN)'
]) if (!permissionsSource.includes(required)) fail(`Replenishment Planning permission identifier/capability changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Replenishment Planning route and insights/optimization/transfer/purchase-order permission identifiers remain unchanged.');

for (const required of [
  "const DECISIONS = ['pending', 'accepted', 'overridden', 'rejected', 'deferred', 'already_handled'] as const;",
  "apiRequest<PlanningRunListItem[]>('/replenishment-planning?limit=100')",
  'apiRequest<PlanningRunDetail>(`/replenishment-planning/${id}`)',
  "apiRequest<PlanningRunDetail>('/replenishment-planning', { method: 'POST', body: JSON.stringify(input) })",
  'apiRequest<PlanningRunDetail>(`/replenishment-planning/${input.runId}/decisions`, {',
  'body: JSON.stringify({ expected_run_version: input.expectedRunVersion, decisions: input.decisions })',
  'skipMutationFeedback: true',
  'apiRequest<MaterializationResponse>(`/replenishment-planning/${input.runId}/materialize`, {',
  'body: JSON.stringify({ expected_run_version: input.expectedRunVersion })',
  'apiRequest<OutcomeResponse>(`/replenishment-planning/${runId}/outcomes`)',
  'createMutation.mutate({ target_coverage_days: coverageDays })',
  "kind: 'purchase'",
  "kind: 'transfer'",
  'expected_version: numberValue(item.version)',
  'expected_version: numberValue(transfer.version)'
]) if (!pageSource.includes(required)) fail(`Replenishment Planning endpoint/canonical mutation contract changed or missing: ${required}`);
if (!process.exitCode) pass('Replenishment Planning list/detail/create/decision/materialization/outcome endpoints and canonical mutation payload values remain unchanged.');

for (const required of [
  'const canGenerate = Boolean(capabilities.canCreateInventoryOptimization);',
  'const canGovern = Boolean(capabilities.canGovernInventoryOptimization);',
  'const canCreateTransfers = Boolean(capabilities.canCreateStockTransfers);',
  'const canCreatePurchaseOrders = Boolean(capabilities.canCreatePurchaseOrders);',
  '&& canGovern',
  '&& !runLocked',
  '&& changedDecisions.length === 0',
  '&& allLinesReviewed',
  '&& !runAgeExpired',
  '&& !missingMaterializationPermission',
  '&& acceptedPurchaseWithoutSupplier === 0',
  '&& (acceptedTransferDraftsRequired || acceptedPurchaseDraftsRequired)'
]) if (!pageSource.includes(required)) fail(`Replenishment Planning governance/materialization gating changed or missing: ${required}`);
if (!process.exitCode) pass('Replenishment Planning generation, governance, Stock Transfer/PO create, staleness, supplier, and all-lines-reviewed gates are intact.');

for (const required of [
  'item.product_name',
  'transfer.product_name',
  'row.product_name',
  'row.storage_location_name',
  'row.source_storage_location_name',
  'row.destination_storage_location_name',
  'row.supplier_name',
  'draft.reason',
  'row.decision_reason',
  'detail.run.generated_by_user_name',
  'detail.run.formula_version',
  'requestError.message'
]) if (!pageSource.includes(required)) fail(`Replenishment Planning business/server raw-data boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Product, supplier, location, user-entered reason, formula/version, and backend/API error data remain raw while frontend presentation is localized.');

for (const required of [
  "ui('Planning run created. No stock moved and no supplier order was placed.')",
  "ui('Planning decisions saved. No draft transfer or Purchase Order was created.')",
  "ui('The latest stock and supply evidence will be checked again. Draft Stock Transfers and/or draft Purchase Orders will be created for accepted lines only. Nothing will be approved, submitted, received, or executed.')",
  "ui('This run is older than {count} hours. Generate a fresh run before creating drafts.')",
  `ui(\"Your role cannot create one or more accepted draft types. Stock Transfer create permission is required for accepted transfers, and Purchase Order create permission is required for accepted purchases.\")`
]) if (!pageSource.includes(required)) fail(`Replenishment Planning safety/governance presentation missing: ${required}`);
if (!process.exitCode) pass('Replenishment Planning frontend safety copy still states that generation is non-executing and materialization creates drafts only after live revalidation.');

if (pageSource.includes('eyebrow="Procurement"') || pageSource.includes('<strong>No planning run yet</strong>') || pageSource.includes("placeholder=\"Product, supplier, or location\"")) {
  fail('Legacy untranslated Replenishment Planning presentation sentinel still exists.');
} else pass('Replenishment Planning former untranslated sentinels are removed.');

if (!process.exitCode) pass('Tenant Replenishment Planning full-page multilingual checks passed.');
