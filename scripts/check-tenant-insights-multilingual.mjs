import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const page = read('src/pages/InsightsPage.tsx');
const catalog = read('src/i18n/tenantUiTranslations.ts');
const router = read('src/app/router.tsx');
const permissions = read('src/lib/permissions.ts');

const rows = [];
for (const line of catalog.split(/\r?\n/)) {
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
  const expected = [...row[0].matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort().join('|');
  for (const translated of row.slice(1)) {
    const actual = [...translated.matchAll(/\{[^{}]+\}/g)].map((m) => m[0]).sort().join('|');
    if (actual !== expected) fail(`Placeholder mismatch for tenant UI key: ${row[0]}`);
  }
}
if (!process.exitCode) pass('Tenant UI placeholder parity is intact across all five languages.');

if (!router.includes("path: 'insights'") || !router.includes('requiredPermissions={[TENANT_PERMISSIONS.INSIGHTS_READ]}') || !router.includes('<InsightsPage />')) {
  fail('Insights route permission/mount contract changed or missing.');
} else pass('Insights remains mounted at /insights behind INSIGHTS_READ.');

if (!permissions.includes("INSIGHTS_READ: 'insights.read'")) fail('INSIGHTS_READ permission identifier changed or missing.');
else pass('Insights permission identifier remains canonical.');

for (const required of [
  'useAppTranslation',
  'formatLocalizedCurrency(',
  'formatLocalizedDateTime(',
  'formatLocalizedNumber(',
  'formatCurrencyAmount'
]) {
  if (!page.includes(required)) fail(`Insights locale/currency presentation contract missing: ${required}`);
}
if (!process.exitCode) pass('Insights uses the established translation runtime and locale-aware number/date/currency formatting with currency fallback compatibility.');

const literalPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}
const displayKeys = new Set();
for (const match of page.matchAll(literalPattern)) {
  try { displayKeys.add(decodeLiteral(match[1])); } catch {}
}

// These labels are intentionally stored as canonical English display maps and translated only at render time through ui(label).
for (const blockMarker of [
  'const known: Record<string, string> = {',
  'const labels: Record<SupplierRiskFilter, string> = {',
  'const labels: Record<SupplierTierFilter, string> = {',
  'const labels: Record<SupplierSort, string> = {'
]) {
  const start = page.indexOf(blockMarker);
  if (start < 0) {
    fail(`Insights dynamic display mapping missing: ${blockMarker}`);
    continue;
  }
  const end = page.indexOf('};', start);
  if (end < 0) {
    fail(`Insights dynamic display mapping is malformed: ${blockMarker}`);
    continue;
  }
  const block = page.slice(start, end);
  for (const match of block.matchAll(/:\s*'([^']+)'/g)) displayKeys.add(match[1]);
}
const missing = [...displayKeys].filter((key) => !unique.has(key)).sort();
if (missing.length) fail(`Insights UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Insights has ${displayKeys.size} catalog-backed literal/dynamic UI keys.`);

const rawTextPattern = /<(?:h[1-6]|p|th|td|summary|span|option|button|label|strong|small)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g;
const rawAttributePattern = /\b(?:placeholder|title|ariaLabel|aria-label|label|helper|hint|description|eyebrow)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawDynamicPresentationPattern = /\b(?:subtitle|placeholder|title|ariaLabel|aria-label|label|helper|hint|description|eyebrow)=\{`[^`]*[A-Za-z][^`]*`\}/g;
const rawText = [...page.matchAll(rawTextPattern)].map((m) => m[1].trim()).filter(Boolean);
const rawAttributes = [...page.matchAll(rawAttributePattern)].map((m) => m[0]);
const rawDynamic = [...page.matchAll(rawDynamicPresentationPattern)].map((m) => m[0]);
if (rawText.length) fail(`Raw direct JSX presentation remains in InsightsPage: ${rawText.join(' | ')}`);
if (rawAttributes.length) fail(`Raw literal presentation attributes remain in InsightsPage: ${rawAttributes.join(' | ')}`);
if (rawDynamic.length) fail(`Raw dynamic presentation template literals remain in InsightsPage: ${rawDynamic.join(' | ')}`);
if (!rawText.length && !rawAttributes.length && !rawDynamic.length) pass('InsightsPage has zero raw direct JSX text, targeted literal attributes, and raw dynamic presentation template literals.');

for (const endpoint of [
  '`/inventory-insights/depletion-risk?lookback_days=${lookbackDays}`',
  '`/inventory-insights/depletion-risk/root-cause-review?lookback_days=${lookbackDays}`',
  '`/reorder-insights/recommendations?lookback_days=${lookbackDays}`',
  "'/operational-insights/health-score'",
  "'/operational-insights/anomalies'",
  "'/operational-insights/anomalies/production-review'",
  "'/supplier-insights/trust-scores'",
  "'/supplier-insights/trust-scores/production-review'"
]) {
  if (!page.includes(endpoint)) fail(`Insights endpoint contract changed or missing: ${endpoint}`);
}
if (/\bmethod\s*:/.test(page)) fail('InsightsPage unexpectedly contains an HTTP mutation method; the current Insights route must remain read-only.');
else pass('Insights preserves all eight read-only analytics endpoints and introduces no frontend mutation method.');

for (const downstreamPermission of [
  'TENANT_PERMISSIONS.DASHBOARD_READ',
  'TENANT_PERMISSIONS.PRODUCTS_READ',
  'TENANT_PERMISSIONS.STOCK_READ',
  'TENANT_PERMISSIONS.STOCK_MOVEMENTS_READ',
  'TENANT_PERMISSIONS.SUPPLIERS_READ',
  'TENANT_PERMISSIONS.PURCHASE_ORDERS_READ'
]) {
  if (!page.includes(downstreamPermission)) fail(`Insights downstream navigation permission contract changed or missing: ${downstreamPermission}`);
}
if (!process.exitCode) pass('Insights retains permission-aware navigation into authoritative operational workflows.');

for (const csvContract of [
  "downloadCsv('supplier-performance-insights.csv'",
  '`supplier-performance-detail-${row.supplier_name.toLowerCase().replace(/[^a-z0-9]+/g, \'-\') || \'supplier\'}.csv`',
  "'Supplier'",
  "'Performance Score'",
  "'Risk Flags'",
  "'PO Remaining Value'",
  "'Risk Severity'",
  "'Recommended Action Priority'"
]) {
  if (!page.includes(csvContract)) fail(`Insights CSV technical contract changed or missing: ${csvContract}`);
}
if (!process.exitCode) pass('Insights supplier-performance CSV filenames and technical columns remain canonical.');

for (const printAnchor of [
  "ui('Supplier Performance Insights')",
  "ui('Supplier performance detail')",
  "ui('Printed {time} · {filters} · {count} supplier(s)')",
  "ui('Supplier performance detail · Printed {time}')",
  "ui('The print window was blocked. Allow pop-ups and try again.')"
]) {
  if (!page.includes(printAnchor)) fail(`Insights localized print presentation contract changed or missing: ${printAnchor}`);
}
if (!process.exitCode) pass('Insights browser-print presentation is catalog-backed while supplier/business values remain data.');

for (const rawField of [
  'row.supplier_name',
  'row.product_name',
  'row.storage_location_name',
  'blocker.message',
  'item.message',
  'flag.label',
  'flag.detail',
  'row.recommended_investigation_steps',
  'toReadableError('
]) {
  if (!page.includes(rawField)) fail(`Insights business/server-data raw boundary changed or missing: ${rawField}`);
}
if (!page.includes('return label ? ui(label) : value;')) fail('Unknown Insights status/tier values must remain raw rather than being dynamically catalog-populated.');
else pass('Insights preserves business/server prose and unknown backend values as raw data.');

for (const accessibilityAnchor of [
  "ui('Remove {filter} filter')",
  "ui('Supplier risk flags for {supplier}')",
  "ui('Supplier performance detail for {supplier}')"
]) {
  if (!page.includes(accessibilityAnchor)) fail(`Insights localized accessibility presentation missing: ${accessibilityAnchor}`);
}
if (!process.exitCode) pass('Insights dynamic accessibility labels are localized with placeholder-safe sentences.');

if (!page.includes('iconPath={props.iconPath ?? \'/insights\'}') && !page.includes("iconPath={props.iconPath ?? '/insights'}")) {
  fail('Insights explicit icon-path routing contract changed or missing.');
} else pass('Insights section/icon presentation is independent of translated section titles.');

if (!process.exitCode) console.log('Tenant Insights multilingual check passed.');
