import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const files = {
  packageJson: read('package.json'),
  helper: read('src/lib/alertPresentation.ts'),
  alerts: read('src/pages/AlertsPage.tsx'),
  dashboard: read('src/pages/DashboardPage.tsx'),
  actionCenter: read('src/pages/OperationalActionCenterPage.tsx'),
  reliability: read('src/pages/ReliabilityCommandPage.tsx'),
  insights: read('src/pages/InsightsPage.tsx'),
  crossDomain: read('src/pages/CrossDomainOptimizationPage.tsx'),
  navigation: read('src/app/navigationRegistry.ts'),
  translations: read('src/i18n/tenantUiTranslations.ts'),
  actionGuard: read('scripts/check-tenant-action-center-multilingual.mjs'),
  alertGuard: read('scripts/check-tenant-alerts-multilingual.mjs'),
  dashboardGuard: read('scripts/check-tenant-dashboard-shared-multilingual.mjs'),
  insightsGuard: read('scripts/check-tenant-insights-multilingual.mjs')
};

let passed = 0;
const failures = [];
const check = (label, condition) => {
  if (condition) {
    passed += 1;
    console.log(`PASS: ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL: ${label}`);
  }
};
const has = (text, token) => text.includes(token);
const lacks = (text, token) => !text.includes(token);

// Reliability: the visible filter contract is 3/5/9 and the baseline is 9.
check('Reliability uses 9 as the default result-limit comparison', has(files.reliability, "limit !== '9'"));
check('Reliability Clear filters resets result limit to 9', has(files.reliability, "setLimit('9')"));
check('Reliability no longer compares the result limit against invalid 25', lacks(files.reliability, "limit !== '25'"));
check('Reliability no longer resets result limit to invalid 25', lacks(files.reliability, "setLimit('25')"));
check('Reliability ResultLimit remains the bounded 3/5/9 union', /type ResultLimit\s*=\s*'3'\s*\|\s*'5'\s*\|\s*'9'/.test(files.reliability));

// Action Center: exact records and producer-renderer ownership contract.
check('Action Center action contract transports title_key', has(files.actionCenter, 'title_key?: string | null'));
check('Action Center action contract transports summary_key', has(files.actionCenter, 'summary_key?: string | null'));
check('Action Center translates keyed system titles only', has(files.actionCenter, 'return action.title_key ? ui(title) : title;'));
check('Action Center translates keyed system summaries only', has(files.actionCenter, 'return action.summary_key ? ui(summary) : summary;'));
check('Action Center preserves unkeyed business title instead of generic humanization', lacks(files.actionCenter, "action.title_key ? ui(format") && lacks(files.actionCenter, 'formatStatusLabel(action.title'));
check('Action Center opens exact Alert source records when source_id is known', has(files.actionCenter, "new URLSearchParams({ alert_id: action.source_id })"));
check('Action Center never falls back to approximate Alert text search', !/action\.action_domain === 'alerts'[\s\S]{0,500}params\.set\('search'/.test(files.actionCenter));
check('Action Center guard protects exact Alert handoff', has(files.actionGuard, 'exact-record handoff'));
check('Action Center guard protects keyed system text versus tenant text', has(files.actionGuard, 'keyed system text'));

// Shared Alert presentation boundary.
const reservedTypes = [
  'LOW_STOCK',
  'NEGATIVE_STOCK_BLOCKING',
  'EXPIRED_STOCK',
  'EXPIRING_STOCK',
  'FINALIZED_SHIPMENT_INCOMPLETE_BLOCKING',
  'INVENTORY_USAGE_ANOMALY',
  'INVENTORY_USAGE_DAMAGE_WASTE',
  'INVENTORY_USAGE_EXCEPTIONS',
  'ORPHANED_SHIPMENT_ITEM_BLOCKING',
  'OVER_RECEIVED_BLOCKING',
  'PO_OVER_RECEIVED_BLOCKING',
  'SHIPMENT_IMMUTABLE_BLOCKING',
  'STOCK_LEDGER_DESYNC_BLOCKING',
  'STOCK_LOT_DESYNC_BLOCKING',
  'SYSTEM_HEALTH_DEGRADED_BLOCKING'
];
for (const type of reservedTypes) {
  check(`Shared Alert presentation recognizes reserved type ${type}`, new RegExp(`\\b${type}\\s*:`).test(files.helper));
}
check('Shared Alert presentation does not falsely own manual NEGATIVE_STOCK', !/\bNEGATIVE_STOCK\s*:/.test(files.helper));
check('Shared Alert presentation does not falsely own manual FINALIZED_SHIPMENT_INCOMPLETE', !/\bFINALIZED_SHIPMENT_INCOMPLETE\s*:/.test(files.helper));
check('Shared Alert presentation does not falsely own REMEDIATION_PLAYBOOK_ATTACHED', !/\bREMEDIATION_PLAYBOOK_ATTACHED\s*:/.test(files.helper));
check('Unknown/custom Alert types remain verbatim', has(files.helper, 'return systemLabel ? ui(systemLabel) : raw;'));
check('Unknown/historical Alert messages remain verbatim', /return localized \? ui\(localized\) : message;/.test(files.helper));
check('Alert messages require a reserved system type before localization', has(files.helper, 'if (!SYSTEM_ALERT_TYPE_LABELS[type]) return message;'));
check('Low-stock dynamic product/location evidence is preserved through template placeholders', has(files.helper, 'Product "{product}" is below the location minimum at "{location}".'));
check('System-health message is converted to the current Admin System wording', has(files.helper, 'Review Admin System for the current application-integrity evidence.'));
check('Alerts page uses shared Alert type presentation', has(files.alerts, 'formatAlertTypeLabel(alert.type, ui)'));
check('Alerts page uses shared Alert message presentation', has(files.alerts, 'formatAlertMessage(alert, ui)'));
check('Alerts exact Product context targets product_id in Stock', has(files.alerts, '`/stock?product_id=${encodeURIComponent(alert.product_id)}`'));
check('Alerts guard protects the reserved system/custom boundary', has(files.alertGuard, 'System-owned Alert presentation'));
check('Alerts guard protects exact Product context', has(files.alertGuard, 'Product context is exact'));

// Dashboard exact-record routing and presentation.
check('Dashboard uses shared Alert type presentation', has(files.dashboard, 'formatAlertTypeLabel(alert.type, ui)'));
check('Dashboard uses shared Alert message presentation', has(files.dashboard, 'formatAlertMessage(alert, ui)'));
check('Dashboard opens exact Alert records by alert_id', has(files.dashboard, '`/alerts?alert_id=${encodeURIComponent(alert.id)}`'));
check('Dashboard overdue-shipment supplier handoff uses supplier_id', has(files.dashboard, '`/suppliers?supplier_id=${encodeURIComponent(row.supplier_id)}`'));
check('Dashboard no longer searches Alerts by product/type text', lacks(files.dashboard, '/alerts?search='));
check('Dashboard no longer searches Suppliers by name', lacks(files.dashboard, '/suppliers?search='));
check('Dashboard guard protects exact Alert/Supplier handoffs', has(files.dashboardGuard, 'exact IDs'));

// Insights exact-record routing and typed response contract.
check('Insights top product action opens exact product_id', has(files.insights, '`/products?product_id=${encodeURIComponent(reorderTop.product_id)}`'));
check('Insights top depletion action opens exact stock_id', has(files.insights, '`/stock?stock_id=${encodeURIComponent(depletionTop.stock_id)}`'));
check('Insights supplier action opens exact supplier_id', has(files.insights, '`/suppliers?supplier_id=${encodeURIComponent(supplierBottom.supplier_id)}`'));
check('Insights supplier rows open exact supplier_id', has(files.insights, '`/suppliers?supplier_id=${encodeURIComponent(row.supplier_id)}`'));
check('Insights selected supplier opens exact supplier_id', has(files.insights, '`/suppliers?supplier_id=${encodeURIComponent(selectedSupplierTrustRow.supplier_id)}`'));
check('Insights depletion rows open exact stock_id', has(files.insights, '`/stock?stock_id=${encodeURIComponent(row.stock_id)}`'));
check('Insights reorder rows open exact product_id', has(files.insights, '`/products?product_id=${encodeURIComponent(row.product_id)}`'));
check('Insights does not send unsupported Dashboard panel parameter', lacks(files.insights, '/dashboard?panel='));
check('Insights no longer uses supplier-name search handoff', lacks(files.insights, '/suppliers?search='));
check('Insights no longer uses product-name search handoff', lacks(files.insights, '/products?search='));
check('Insights Supplier Trust type includes partial_shipments', has(files.insights, 'partial_shipments: number | string'));
check('Insights Supplier Trust type includes overdue_shipments', has(files.insights, 'overdue_shipments: number | string'));
check('Insights Supplier Trust type includes total_discrepancy_quantity', has(files.insights, 'total_discrepancy_quantity: number | string'));
check('Insights guard protects exact-record routing', has(files.insightsGuard, 'exact-record handoffs'));
check('Insights guard protects Supplier Trust response typing', has(files.insightsGuard, 'Supplier Trust frontend/backend response typing'));

// Cross-Domain type contract cleanup.
check('Cross-Domain percentage formatter accepts AppLocale', has(files.crossDomain, 'function formatPercentage(value: unknown, locale: AppLocale): string'));
check('Cross-Domain date formatter accepts AppLocale', has(files.crossDomain, 'function formatDate(value: unknown, locale: AppLocale): string'));
check('Cross-Domain response filters avoid incompatible string/number limit intersection', has(files.crossDomain, "filters?: Omit<Partial<OptimizationFilterState>, 'limit'> & { review_run_id?: string; limit?: number };"));
check('Cross-Domain no longer declares response filters as incompatible Partial plus numeric limit', lacks(files.crossDomain, 'filters?: Partial<OptimizationFilterState> & { review_run_id?: string; limit?: number };'));

// System Context wording and catalog.
const contextDescription = 'Read-only operational analysis with permission-controlled planning history and governed review-request handoffs.';
check('System Context sidebar description reflects governed analytical persistence/handoffs', has(files.navigation, contextDescription));
check('System Context updated description has a five-language catalog row', has(files.translations, `["${contextDescription}"`));

// New system-owned Alert business-message translations introduced by the shared presentation boundary.
const messageKeys = [
  'No alert message provided.',
  'Product is below minimum stock and was automatically reordered.',
  'Stock is below the location minimum at "{location}".',
  'Product "{product}" is below the location minimum at "{location}".',
  'Low stock remains at "{location}" after outbound dispatch {order}.',
  'Product "{product}" is below the location minimum at "{location}" after transfer.',
  'Stock quantity is negative and requires investigation.',
  'Stock consumption was blocked because it exceeds the available quantity.',
  'Stock adjustment was blocked because it would create negative stock.',
  'Stock ledger mismatch at location {location}: stored {stored}, expected {expected}.',
  'Lot balance mismatch at location {location}: stock {stock}, lot layer {lot}.',
  '{quantity} units of stock are expired and require expiry processing.',
  '{quantity} units of stock expire within 7 days.',
  'Inventory usage governance has {exceptions} exception records in the last {days} days ({pending} pending review, {follow_up} follow-up required).',
  'Inventory usage recorded {quantity} damage/waste quantity in the last {days} days.',
  'Usage spike detected for "{product}" on {date}: {daily} used vs {average} average ({multiplier}x).',
  'Finalized shipment has an undocumented receiving shortage and requires review.',
  'Received quantity exceeds ordered quantity and requires review.',
  'Shipment item is missing its parent shipment relationship and requires review.',
  'Receiving was blocked because the quantity exceeds the linked Purchase Order quantity.',
  'Receiving was blocked because the shipment is not in a receivable workflow status.',
  'Receiving was blocked because the quantity exceeds the ordered quantity.',
  'System health is degraded. Review Admin System for the current application-integrity evidence.'
];
for (const key of messageKeys) {
  check(`Alert presentation message is catalog-backed: ${key}`, has(files.translations, JSON.stringify(key)));
}

// Wiring protects the closure before lint/build and in CI.
check('v3.49.194 frontend guard is registered', has(files.packageJson, 'check:command-wide-operational-closure-v349194'));
check('v3.49.194 guard is included in prelint', /"prelint"[\s\S]*check:command-wide-operational-closure-v349194/.test(files.packageJson));
check('v3.49.194 guard is included in prebuild', /"prebuild"[\s\S]*check:command-wide-operational-closure-v349194/.test(files.packageJson));
check('v3.49.194 guard is included in check:ci', /"check:ci"[\s\S]*check:command-wide-operational-closure-v349194/.test(files.packageJson));

if (failures.length) {
  console.error(`v3.49.194 COMMAND-wide operational closure guard: ${passed}/${passed + failures.length} PASS`);
  process.exit(1);
}
console.log(`v3.49.194 COMMAND-wide operational closure guard: PASS (${passed}/${passed})`);
