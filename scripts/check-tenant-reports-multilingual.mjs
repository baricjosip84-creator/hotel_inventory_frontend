import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const reportsSource = read('src/pages/ReportsPage.tsx');
const translationSource = read('src/i18n/tenantUiTranslations.ts');
const routerSource = read('src/app/router.tsx');
const permissionsSource = read('src/lib/permissions.ts');
const csvCheckerSource = read('scripts/check-report-csv-export-ui.mjs');
const rowCountCheckerSource = read('scripts/check-report-export-row-count-ui.mjs');
const closureCheckerSource = read('scripts/check-report-export-feature-closure.mjs');
const hardeningCheckerSource = read('scripts/check-reports-page-hardening.mjs');

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

if (!routerSource.includes("path: 'reports'") || !routerSource.includes('requiredPermissions={[TENANT_PERMISSIONS.REPORTS_READ]}') || !routerSource.includes('<ReportsPage />')) {
  fail('Reports route permission/mount contract changed or missing.');
} else pass('Reports route remains mounted at /reports behind REPORTS_READ.');

for (const required of [
  "REPORTS_READ: 'reports.read'",
  "INSIGHTS_READ: 'insights.read'",
]) if (!permissionsSource.includes(required)) fail(`Reports permission identifier changed or missing: ${required}`);
if (!process.exitCode) pass('Reports and Insights permission identifiers remain canonical.');

if (!reportsSource.includes('useAppTranslation')) fail('ReportsPage does not use the tenant translation runtime.');
for (const required of [
  'formatLocalizedCurrency(',
  'formatLocalizedDate(',
  'formatLocalizedDateTime(',
  'formatLocalizedNumber(',
  'formatCurrencyAmount(value, currency)',
]) if (!reportsSource.includes(required)) fail(`Reports locale/currency presentation contract missing: ${required}`);
if (!process.exitCode) pass('Reports uses locale-aware dates, timestamps, numbers, and currency with the historical currency fallback retained.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const displayKeys = new Set();
for (const match of reportsSource.matchAll(literalPattern)) {
  try { displayKeys.add(decodeLiteral(match[1])); } catch {}
}

function addTupleLabels(constName) {
  const match = reportsSource.match(new RegExp(`const ${constName} = \\[([\\s\\S]*?)\\] as const;`));
  if (!match) { fail(`Reports dynamic option constant missing: ${constName}`); return; }
  for (const item of match[1].matchAll(/\[\s*'[^']*'\s*,\s*'([^']+)'\s*\]/g)) displayKeys.add(item[1]);
}
for (const name of ['PURCHASE_ORDER_STATUS_OPTIONS', 'TRANSFER_STATUS_OPTIONS', 'REQUISITION_STATUS_OPTIONS', 'MOVEMENT_TYPE_OPTIONS']) addTupleLabels(name);

const tabsMatch = reportsSource.match(/const REPORT_TABS:[\s\S]*?= \[([\s\S]*?)\n\];/);
if (!tabsMatch) fail('REPORT_TABS constant missing.');
else for (const match of tabsMatch[1].matchAll(/label:\s*'([^']+)'/g)) displayKeys.add(match[1]);

function addRecordValues(constName) {
  const match = reportsSource.match(new RegExp(`const ${constName}[^=]*= \\{([\\s\\S]*?)\\n\\};`));
  if (!match) { fail(`Reports display record missing: ${constName}`); return; }
  for (const item of match[1].matchAll(/:\s*'([^']+)'/g)) displayKeys.add(item[1]);
}
for (const name of ['REPORT_LABELS', 'REPORT_DESCRIPTIONS', 'KNOWN_STATUS_LABELS']) addRecordValues(name);

const missingKeys = [...displayKeys].filter((key) => !unique.has(key)).sort();
if (missingKeys.length) fail(`Reports UI keys missing translations: ${missingKeys.join(' | ')}`);
else pass(`Reports has ${displayKeys.size} catalog-backed literal/dynamic UI keys.`);

const rawTextPattern = /<(?:h[1-6]|p|th|td|summary|span|option|button|label|strong|small)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g;
const rawAttributePattern = /\b(?:placeholder|title|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawText = [...reportsSource.matchAll(rawTextPattern)].map((match) => match[1].trim()).filter(Boolean);
const rawAttributes = [...reportsSource.matchAll(rawAttributePattern)].map((match) => match[0]);
if (rawText.length) fail(`Raw direct JSX presentation remains in ReportsPage: ${rawText.join(' | ')}`);
if (rawAttributes.length) fail(`Raw literal presentation attributes remain in ReportsPage: ${rawAttributes.join(' | ')}`);
if (!rawText.length && !rawAttributes.length) pass('ReportsPage has zero raw direct JSX text and raw literal presentation attributes.');

const requiredEndpoints = [
  '/reports/filter-options',
  '/reports/inventory-valuation',
  '/reports/stock-by-location',
  '/reports/product-movements',
  '/reports/movement-ledger',
  '/reports/inventory-variance',
  '/reports/procurement-summary',
  '/reports/purchasing-spend',
  '/reports/purchase-order-commitments',
  '/reports/stock-transfer-activity',
  '/reports/requisition-activity',
  '/reports/low-stock',
  '/reports/slow-moving',
  '/reports/usage-summary',
  '/reports/supplier-performance',
  '/reports/expiry-risk',
  '/reports/forecast',
];
for (const endpoint of requiredEndpoints) if (!reportsSource.includes(endpoint)) fail(`Reports endpoint contract changed or missing: ${endpoint}`);
if (!process.exitCode) pass('All 17 report/filter endpoint paths remain canonical.');

for (const required of [
  "getTenantFeatureEntitlement(subscriptionAccessQuery.data, 'reports')",
  "getTenantFeatureEntitlement(subscriptionAccessQuery.data, 'forecasting')",
  'const forecastFeatureReady = reportsFeatureReady && canViewInsights',
  "ui('Forecast access requires Insights - Read in addition to Reports - Read.')",
  "ui('Forecasting is not enabled for this tenant subscription.')",
]) if (!reportsSource.includes(required)) fail(`Reports entitlement/forecast access invariant missing: ${required}`);
if (!process.exitCode) pass('Reports entitlement and Forecast Insights/forecasting access boundaries remain intact.');

for (const required of [
  'function getReportFilename(report: ReportTab, format: ExportFormat)',
  'const stem = getReportLabel(report).toLowerCase()',
  'apiDownloadFile(getExportPath(report, format), getReportFilename(report, format))',
  'setDownloadInfo({ report, format, metadata })',
  'metadata.exportedRows',
  'metadata.originalRows',
  'metadata.rowLimit',
  'metadata.wasRowLimited',
  'printWindow.opener = null',
  'printWindow.print()',
]) if (!reportsSource.includes(required)) fail(`Reports print/export contract changed or missing: ${required}`);
if (!process.exitCode) pass('CSV/PDF filenames, row-count metadata, browser print, and export contracts remain canonical.');

for (const required of [
  'row.product_name',
  'row.supplier_name',
  'row.storage_location_name',
  'row.department',
  'row.reason',
  'error.message',
  'row.condition',
]) if (!reportsSource.includes(required)) fail(`Reports business/server raw-data boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Product, supplier, location, department, reason, condition, and concrete backend error data remain raw.');

for (const required of [
  "return known ? ui(known) : value;",
  "if (configured) return ui(configured[1]);",
  "ui(REPORT_DESCRIPTIONS[tab])",
  "ui(REPORT_TABS.find((item) => item.key === tab)?.label || getReportLabel(tab))",
  "ui(getReportLabel(downloadInfo.report))",
]) if (!reportsSource.includes(required)) fail(`Reports known-code/dynamic display mapping missing: ${required}`);
if (!process.exitCode) pass('Known statuses, movement types, report labels, and descriptions are localized only at display time.');

for (const [name, source] of [
  ['CSV export', csvCheckerSource],
  ['export row-count', rowCountCheckerSource],
  ['export feature closure', closureCheckerSource],
  ['reports hardening', hardeningCheckerSource],
]) if (!source.length) fail(`Historical ${name} checker is missing.`);
if (!process.exitCode) pass('Historical Reports export and hardening safeguards remain present.');

if (process.exitCode) process.exit(process.exitCode);
pass('Tenant Reports multilingual page-completion check passed.');
