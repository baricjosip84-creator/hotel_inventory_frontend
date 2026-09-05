import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const layoutSource = read('src/components/enterpriseInventory/EnterpriseInventoryPageLayout.tsx');
const tabsSource = read('src/components/enterpriseInventory/EnterpriseInventoryTabs.tsx');
const sharedSource = read('src/components/enterpriseInventory/EnterpriseInventoryShared.tsx');
const tabConfigSource = read('src/components/enterpriseInventory/EnterpriseInventoryTabConfig.ts');
const parSource = read('src/components/enterpriseInventory/tabs/ParLevelsTab.tsx');
const cycleSource = read('src/components/enterpriseInventory/tabs/CycleCountsTab.tsx');
const stockMutationSource = read('src/components/enterpriseInventory/EnterpriseInventoryStockMutations.ts');
const submitSource = read('src/components/enterpriseInventory/EnterpriseInventorySubmitHandlers.ts');
const queryStatusSource = read('src/components/enterpriseInventory/EnterpriseInventoryQueryStatus.ts');
const pageActionsSource = read('src/components/enterpriseInventory/EnterpriseInventoryPageActions.ts');
const routerSource = read('src/app/router.tsx');
const permissionsSource = read('src/lib/permissions.ts');
const supplierReturnsSource = read('src/components/enterpriseInventory/tabs/SupplierReturnsTab.tsx');
const approvalsSource = read('src/components/enterpriseInventory/tabs/ApprovalsTab.tsx');

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
const scopedSources = [layoutSource, tabsSource, sharedSource, parSource, cycleSource, stockMutationSource, submitSource, queryStatusSource];
const literalSet = new Set();
for (const source of scopedSources) {
  for (const match of source.matchAll(literalPattern)) {
    try { literalSet.add(decodeLiteral(match[1])); } catch {}
  }
}
for (const match of tabConfigSource.matchAll(/\['[^']+',\s*'([^']+)'/g)) literalSet.add(match[1]);
for (const key of ['products', 'storage locations', 'par levels', 'cycle counts']) literalSet.add(key);
const missing = [...literalSet].filter((key) => !unique.has(key));
if (missing.length) fail(`Enterprise Inventory stock-operations UI keys missing translations: ${missing.join(' | ')}`);
else pass(`Enterprise Inventory stock-operations scope has ${literalSet.size} catalog-backed literal/dynamic UI keys.`);

for (const [name, source] of [['Par Levels', parSource], ['Cycle Counts', cycleSource]]) {
  const rawText = source.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|strong|small)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
  if (rawText.length) fail(`Raw direct JSX presentation remains in ${name}: ${rawText.join(' | ')}`);
  else pass(`${name} has zero raw direct JSX presentation text.`);

  const rawAttributePattern = /\b(?:placeholder|title|ariaLabel|aria-label|label|helper|hint)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
  const rawAttributes = [...source.matchAll(rawAttributePattern)].map((match) => match[0]);
  if (rawAttributes.length) fail(`Raw literal presentation attributes remain in ${name}: ${rawAttributes.join(' | ')}`);
  else pass(`${name} has zero raw literal presentation attributes.`);
}

for (const required of [
  "const { locale, ui } = useAppTranslation();",
  "formatLocalizedDate(item.effective_from, locale)",
  "formatLocalizedNumber(parsed, locale, { maximumFractionDigits: 4 })",
  "formatLocalizedDateTime(item.created_at, locale)",
  "ui('Requires {permission} permission.').replace('{permission}', TENANT_PERMISSIONS.PAR_LEVELS_WRITE)",
  "ui('Submit this cycle count for approval?')",
  "ui('Reconcile this approved cycle count and post its stock changes?')",
]) if (!(parSource + cycleSource).includes(required)) fail(`Enterprise Inventory stock-operations locale/presentation runtime missing: ${required}`);
if (!process.exitCode) pass('Par Levels and Cycle Counts use the shared translation runtime with locale-aware dates, timestamps, and quantities.');

for (const required of [
  "ui(\"Par level saved.\")",
  "ui(\"Failed to save par level.\")",
  "ui(\"1 low-stock par level signal generated.\")",
  "ui(\"{count} low-stock par level signals generated.\")",
  "ui(\"Cycle count created.\")",
  "ui(\"Cycle count submitted successfully.\")",
  "ui(\"Cycle count reconciled and stock movements posted.\")",
]) if (!stockMutationSource.includes(required)) fail(`Enterprise Inventory stock mutation feedback is not localized: ${required}`);
if (!process.exitCode) pass('Par-level and cycle-count frontend mutation feedback is localized while API/server errors remain raw.');

for (const required of [
  'ui: (englishText: string) => string;',
  'setErrorMessage(ui("Requires {permission} permission.").replace("{permission}", permission));',
]) if (!submitSource.includes(required)) fail(`Enterprise Inventory permission-feedback localization missing: ${required}`);
if (!pageActionsSource.includes('const { locale, ui } = useAppTranslation();') || !pageActionsSource.includes('    ui,')) fail('Enterprise Inventory page actions do not pass the tenant UI translator into submit handlers.');
else pass('Shared Enterprise Inventory permission-denied frontend feedback now uses the tenant translation runtime.');

for (const required of [
  "path: 'enterprise-inventory'",
  '<EnterpriseInventoryPage />',
]) if (!routerSource.includes(required)) fail(`Enterprise Inventory route contract changed or missing: ${required}`);
for (const required of [
  "PAR_LEVELS_READ: 'par_levels.read'",
  "PAR_LEVELS_WRITE: 'par_levels.write'",
  "CYCLE_COUNTS_READ: 'cycle_counts.read'",
  "CYCLE_COUNTS_WRITE: 'cycle_counts.write'",
  "CYCLE_COUNTS_APPROVE: 'cycle_counts.approve'",
]) if (!permissionsSource.includes(required)) fail(`Enterprise Inventory stock permission identifier changed or missing: ${required}`);
if (!process.exitCode) pass('Enterprise Inventory route and par-level/cycle-count permission identifiers remain unchanged.');

for (const required of [
  '"/enterprise-inventory/par-levels"',
  '"/enterprise-inventory/par-levels/evaluate"',
  '"/enterprise-inventory/cycle-counts"',
  '`/enterprise-inventory/cycle-counts/${id}/submit`',
  '`/enterprise-inventory/cycle-counts/${id}/reconcile`',
  'buildParLevelPayload(input)',
  'buildCycleCountPayload(input)',
]) if (!stockMutationSource.includes(required)) fail(`Enterprise Inventory stock endpoint/payload contract changed or missing: ${required}`);
if (!process.exitCode) pass('Par-level/cycle-count endpoint paths and canonical payload builders remain unchanged.');

for (const required of [
  'product.name',
  'location.name',
  'item.product_name || item.product_id',
  'item.storage_location_name',
  'item.department',
  'item.notes',
  "return labels[status] ? ui(labels[status]) : status;",
]) if (!(parSource + cycleSource).includes(required)) fail(`Enterprise Inventory business/server raw-data boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Product/location/department/note business data and unknown server status values remain raw while known display states are localized.');

for (const required of [
  "ui('Inventory operations')",
  "ui('Specialized inventory workflows')",
  "ui('Inventory controls summary')",
  "ui('Inventory control work areas')",
  "ui(activeConfig?.[1] ?? 'None')",
  '{ui(label)}',
]) if (!(layoutSource + tabsSource + sharedSource).includes(required)) fail(`Enterprise Inventory shared shell translation contract missing: ${required}`);
if (!process.exitCode) pass('Enterprise Inventory shared hero, workspace summary, and retained tab navigation remain catalog-backed.');

if (!supplierReturnsSource.includes("ui('Create supplier return')") || !approvalsSource.includes("ui('Create approval rule')")) {
  fail('Expected promoted Enterprise Inventory procurement workflow sentinels changed unexpectedly.');
} else pass('Stock Operations compatibility recognizes the promoted multilingual Supplier Returns and Approvals surfaces.');

if (!queryStatusSource.includes("ui('Could not load {section}: {error}')") || !queryStatusSource.includes("normalizeError(queries[failedQueryName]?.error, ui('Request failed'))")) {
  fail('Enterprise Inventory query-failure wrapper localization is missing.');
} else pass('Enterprise Inventory query-failure wrapper is localized while concrete API error detail remains preserved.');

if (!process.exitCode) pass('Tenant Enterprise Inventory Stock Operations multilingual checks passed.');
