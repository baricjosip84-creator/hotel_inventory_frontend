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
else pass(`Procurement Recommendations page has ${literalSet.size} catalog-backed literal UI keys.`);

const dynamicUiKeys = [
  'Critical', 'High', 'Medium', 'Low',
  'Approved', 'Rejected', 'Deferred', 'Pending',
  'Draft', 'Submitted', 'Cancelled', 'Completed', 'Completed with warnings',
  'Ready', 'Blocked', 'Unknown', 'Open', 'Converted',
  'Not configured', 'Within budget', 'Over budget', 'Under budget',
  'High confidence', 'Medium confidence', 'Low confidence',
  'Product replenishment', 'Needs review', 'Needs cost review', 'Submitted for approval', 'Linked',
  'Usage and minimum stock', 'Usage velocity', 'Minimum stock', 'Inventory threshold',
  'Calculated', 'No outbound history', 'Limited history',
  'Missing supplier', 'Product default supplier', 'Preferred catalog with current price',
  'Preferred catalog supplier', 'Product default with purchase history',
  'Late risk', 'Reliable', 'Watch', 'Review',
  'Ready for controlled use', 'Monitor only', 'Read-only review',
  'Dry run', 'Approval and PO draft run', 'Approval run', 'Scheduled run',
  'Decision recorded', 'Not approved', 'Approved awaiting PO', 'PO cancelled',
  'Received complete', 'Receiving partial', 'Awaiting receipt', 'PO draft or review',
  'Supplier', 'Quantity', 'Stock', 'Shortage', 'Decision', 'Execution', 'Cost', 'Budget', 'Package', 'General',
  'Assign supplier', 'Re-run'
];
const missingDynamic = dynamicUiKeys.filter((key) => !unique.has(key));
if (missingDynamic.length) fail(`Procurement Recommendations dynamic human-display keys missing translations: ${missingDynamic.join(' | ')}`);
else pass('Procurement Recommendations canonical status, run-mode, outcome, category, urgency, budget, supplier, and action display branches are catalog-backed.');

const renderStart = pageSource.indexOf('  return (\n    <div className="procurement-recommendations-page');
const renderEnd = pageSource.indexOf('\n  );\n}', renderStart);
if (renderStart < 0 || renderEnd < 0) fail('Procurement Recommendations full render boundary is missing.');
const renderSource = renderStart >= 0 && renderEnd >= 0 ? pageSource.slice(renderStart, renderEnd) : '';

const rawText = renderSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill|div)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains anywhere on Procurement Recommendations: ${rawText.join(' | ')}`);
else pass('Procurement Recommendations full page has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:eyebrow|title|description|placeholder|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...renderSource.matchAll(rawAttributePattern)].map((match) => match[0]).filter((entry) => !entry.includes('className'));
if (rawAttributes.length) fail(`Raw presentation attributes remain anywhere on Procurement Recommendations: ${rawAttributes.join(' | ')}`);
else pass('Procurement Recommendations full page has zero raw literal hero/filter/table/form/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedNumber(parsed, locale, { maximumFractionDigits: digits })',
  'formatLocalizedCurrency(parsed, normalizeCurrencyCode(currency || getActiveTenantCurrency()), locale, { maximumFractionDigits: 2 })',
  'formatLocalizedDate(value, locale)',
  'formatLocalizedDateTime(value, locale)',
  'formatUiMoneyRecordBreakdown',
  'canonicalDisplayLabel',
]) if (!pageSource.includes(required)) fail(`Procurement Recommendations multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Procurement Recommendations uses shared tenant translation runtime with locale-aware numbers, currency, dates, and timestamps across the completed page.');

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
]) if (!permissionsSource.includes(required)) fail(`Procurement Recommendations permission identifier/capability changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Procurement Recommendations route and insights/product/purchase-order permission identifiers remain unchanged.');

for (const required of [
  '`/reorder-insights/recommendations/execution-dashboard?${params.toString()}`',
  '`/reorder-insights/recommendations/production-review?${params.toString()}`',
  '"/reorder-insights/recommendations/execution-history?limit=50&offset=0"',
  '"/reorder-insights/recommendations/outcomes?limit=50&offset=0"',
  '`/reorder-insights/recommendations/exceptions?${params.toString()}`',
  '`/reorder-insights/recommendations/exceptions/resolve?${buildRecommendationActionQuery(filters)}`',
  '`/reorder-insights/recommendations/scheduled-run?${buildRecommendationActionQuery(filters)}`',
  'action: "assign_supplier" | "approve" | "reject" | "defer" | "rerun"',
  'product_id: productId',
  'supplier_id: supplierId?.trim() || undefined',
  'dry_run: options.dryRun',
  'auto_approve_ready: options.autoApproveReady',
  'convert_to_po_drafts: options.convertToPoDrafts',
  'max_approvals: options.maxApprovals',
  'autoApproveReady: !dryRun',
  'convertToPoDrafts: !dryRun && scheduledConvertToPo && canCreatePurchaseOrderDrafts',
]) if (!pageSource.includes(required)) fail(`Advanced Procurement Recommendations endpoint/canonical mutation contract changed or missing: ${required}`);
if (!process.exitCode) pass('Advanced dashboard/review/history/outcomes/exception/scheduled-run endpoints and canonical mutation payload values remain unchanged.');

for (const required of [
  'canApproveRecommendations = capabilities.canApprovePurchaseOrders',
  'canCreatePurchaseOrderDrafts = capabilities.canCreatePurchaseOrders',
  'canManageProducts = capabilities.canManageProducts',
  'disabled={!canApproveRecommendations || scheduledRunMutation.isPending}',
  'disabled={!canCreatePurchaseOrderDrafts || scheduledRunMutation.isPending}',
  'disabled={!canApproveRecommendations || !canManageProducts || !exceptionSupplierIds[exception.exception_key] || exceptionResolutionMutation.isPending}',
]) if (!pageSource.includes(required)) fail(`Advanced Procurement Recommendations frontend permission-gating contract changed or missing: ${required}`);
if (!process.exitCode) pass('Advanced scheduled-run and exception-resolution UI retains approval/create/product-write capability gating.');

for (const required of [
  'risk.blocker_message',
  'productionReview.blockers.map((blocker)',
  'blocker.message || ui("Production blocker requires review.")',
  'productionReview.warnings.map((warning)',
  'warning.message || ui("Recommendation evidence should be reviewed.")',
  'productionReview.next_actions.map((action)',
  '<li key={action}>{action}</li>',
  'scheduledRunMutation.data.blockers?.map((blocker) => blocker.message || blocker.code)',
  'scheduledRunMutation.data.warnings?.map((warning) => warning.message || warning.code)',
  '<div style={styles.blockerText}>{exception.message}</div>',
  'exception.resolution_hint || ui("Review recommendation detail.")',
]) if (!pageSource.includes(required)) fail(`Advanced Procurement Recommendations raw backend evidence boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Backend-generated blockers, warnings, next actions, exception messages/hints, and operational evidence remain raw while frontend fallbacks are localized.');

for (const required of [
  'formatUiNumber(dashboardSummary.open_po_draft_count, 0)',
  'formatUiMoneyBreakdown(dashboardSummary.open_po_draft_spend_by_currency, dashboardSummary.open_po_draft_spend)',
  'formatUiDateTime(String(event.occurred_at))',
  'formatUiMoneyRecordBreakdown(event.estimated_total_cost_by_currency',
  'formatUiDateTime(row.decided_at)',
  'formatUiDate(exception.projected_depletion_date)',
  'canonicalDisplayLabel(scheduledRunMutation.data.run_mode)',
  'canonicalDisplayLabel(scheduledRunMutation.data.status)',
  'canonicalDisplayLabel(row.outcome_status)',
  'canonicalDisplayLabel(exception.category)',
]) if (!pageSource.includes(required)) fail(`Advanced Procurement Recommendations localized value presentation missing: ${required}`);
if (!process.exitCode) pass('Advanced human-facing counts, currency, dates/timestamps, run modes, outcomes, and categories use locale-aware/catalog-backed presentation.');

for (const required of [
  'ui("Advanced procurement controls")',
  'ui("Procurement execution dashboard")',
  'ui("Recommendation production review")',
  'ui("Recommendation scheduling engine")',
  'ui("Procurement execution history")',
  'ui("Recommendation outcomes")',
  'ui("Procurement exception queue")',
]) if (!pageSource.includes(required)) fail(`Completed Procurement Recommendations section missing multilingual heading: ${required}`);
if (pageSource.includes('<span>Advanced procurement controls</span>')) fail('Legacy untranslated advanced Procurement Recommendations sentinel still exists.');
else pass('Advanced procurement controls are multilingual and the former staged sentinel is removed.');

if (!process.exitCode) pass('Tenant Procurement Recommendations full-page multilingual completion checks passed.');
