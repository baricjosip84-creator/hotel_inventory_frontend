import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/InventoryUsagePage.tsx');
const dashboardSource = read('src/pages/inventoryUsage/InventoryUsageDashboard.tsx');
const quickSource = read('src/pages/inventoryUsage/InventoryUsageQuickConsumePanel.tsx');
const cameraSource = read('src/pages/inventoryUsage/InventoryUsageCameraScanner.tsx');
const bulkSource = read('src/pages/inventoryUsage/InventoryUsageBulkRecorder.tsx');
const templatesSource = read('src/pages/inventoryUsage/InventoryUsageTemplatesPanel.tsx');
const scheduledSource = read('src/pages/inventoryUsage/InventoryUsageScheduledTemplatesPanel.tsx');
const governanceSource = read('src/pages/inventoryUsage/InventoryUsageGovernancePanel.tsx');
const periodSource = read('src/pages/inventoryUsage/InventoryUsagePeriodClosuresPanel.tsx');
const apiSource = read('src/pages/inventoryUsage/inventoryUsageApi.ts');
const configSource = read('src/pages/inventoryUsage/inventoryUsageConfig.ts');
const routerSource = read('src/app/router.tsx');
const sources = [pageSource, dashboardSource, quickSource, cameraSource, bulkSource, templatesSource, scheduledSource, governanceSource, periodSource];

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((value) => typeof value === 'string' && value.length > 0)) rows.push(row);
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
for (const source of sources) {
  for (const match of source.matchAll(literalPattern)) {
    try { literals.push(decodeLiteral(match[1])); } catch {}
  }
}
const dynamicKeys = [
  'template', 'templates', 'line', 'lines', 'day', 'days', 'event.', 'events.',
  'alert signal', 'alert signals', 'due scheduled usage template', 'due scheduled usage templates',
  'scheduled usage template line uses damage/waste reasons without linked evidence metadata.',
  'scheduled usage template lines use damage/waste reasons without linked evidence metadata.',
  'template line.', 'template lines.',
];
const missing = [...new Set([...literals, ...dynamicKeys].filter((key) => !unique.has(key)))];
if (missing.length) fail(`Inventory Usage route ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Inventory Usage route has ${new Set(literals).size + dynamicKeys.filter((key) => !literals.includes(key)).length} catalog-backed literal/dynamic UI keys.`);

for (const [name, source] of [
  ['Dashboard', dashboardSource],
  ['Quick Consume', quickSource],
  ['Camera Scanner', cameraSource],
  ['Bulk Recorder', bulkSource],
  ['Usage Templates', templatesSource],
  ['Scheduled Templates', scheduledSource],
  ['Governance', governanceSource],
  ['Period Closures', periodSource],
]) {
  const rawText = source.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
  if (rawText.length) fail(`Raw direct JSX presentation remains in Inventory Usage ${name}: ${rawText.join(' | ')}`);
  else pass(`Inventory Usage ${name} has zero raw direct JSX presentation text.`);
}

for (const required of [
  'import { useAppTranslation } from "../../i18n/I18nContext";',
  'formatLocalizedCurrency',
  'formatLocalizedDateTime',
  'formatLocalizedNumber',
  'const { locale, ui } = useAppTranslation();',
  'title={ui("Usage period close")}',
  'description={ui("Freeze a usage period into an audit-ready rollup with quantity, estimated value, exceptions, reversals, and follow-up exposure. Closed periods block new backdated usage and usage reversals inside the closed range.")}',
  'formatDateTimeLocal',
  'formatMoneyLocal',
]) if (!periodSource.includes(required)) fail(`Usage Period Closures multilingual/locale presentation missing: ${required}`);
if (!process.exitCode) pass('Usage Period Closures uses the shared tenant translation runtime and locale-aware number/date/currency presentation.');

for (const displayKey of [
  'Usage period close', 'Period start', 'Period end', 'Closure notes', 'Preview status',
  'Blocked', 'Ready', 'Usage events', 'Estimated value', 'Governance', 'Period', 'Usage',
  'Exceptions', 'Reversals', 'Follow-up', 'Closed by', 'System',
  'Inventory usage reversed successfully', 'Quick consume recorded successfully',
  'Quick consume was already recorded', 'Why are you reversing this usage entry?',
]) if (!unique.has(displayKey)) fail(`Inventory Usage completion display label is not catalog-backed: ${displayKey}`);
if (!process.exitCode) pass('Known period-close states and remaining controller feedback labels are translated while canonical values stay unchanged.');

for (const required of [
  "'/stock/usage/period-closures?limit=100'",
  "'/stock/usage/period-closures/preview'",
  "'/stock/usage/period-closures'",
  "'/stock/consume/barcode/preview'",
  "'/stock/consume/barcode'",
  "'/stock/consume/bulk/readiness'",
  "'/stock/consume/bulk'",
  "'/stock/usage/templates?limit=100'",
  "'/stock/usage/templates/scheduled?limit=100'",
  "'/stock/usage/templates/scheduled/run-due'",
]) if (!apiSource.includes(required)) fail(`Inventory Usage endpoint contract changed or missing: ${required}`);
for (const required of [
  "{ value: 'guest_use', label: 'Guest use' }",
  "{ value: 'internal_use', label: 'Internal use' }",
  "{ value: 'damage', label: 'Damage' }",
  "{ value: 'waste', label: 'Waste' }",
  "{ value: 'event', label: 'Event' }",
  "{ value: 'maintenance', label: 'Maintenance' }",
  "{ value: 'other', label: 'Other' }",
]) if (!configSource.includes(required)) fail(`Inventory Usage canonical reason contract changed: ${required}`);
for (const required of [
  'canClosePeriods: permissions.canCloseInventoryUsagePeriods,',
  'canReview: permissions.canReviewInventoryUsage,',
  'canManageTemplates: permissions.canManageInventoryUsageTemplates,',
  'canRunScheduled: permissions.canRunScheduledInventoryUsage,',
  'const canRecordStockUsage = !permissions.isAdmin && permissions.canConsumeStock && permissions.canRecordInventoryUsage;',
  'const canBulkRecordStockUsage = !permissions.isAdmin && permissions.canConsumeStock && permissions.canBulkRecordInventoryUsage;',
]) if (!pageSource.includes(required)) fail(`Inventory Usage controller permission gate changed or missing: ${required}`);
for (const required of [
  'activeArea === "close" && permissions.canClosePeriods',
  '<InventoryUsagePeriodClosuresPanel',
  'canRunDueTemplates={permissions.canRunScheduled}',
  'canManageTemplates={permissions.canManageTemplates}',
  'canRecordTemplates={permissions.canRecord}',
]) if (!dashboardSource.includes(required)) fail(`Inventory Usage dashboard permission/render contract changed or missing: ${required}`);
for (const required of [
  "path: 'inventory-usage'",
  'TENANT_PERMISSIONS.INVENTORY_USAGE_READ',
  '<InventoryUsagePage />',
]) if (!routerSource.includes(required)) fail(`Inventory Usage tenant route contract changed or missing: ${required}`);
if (!process.exitCode) pass('Inventory Usage route, permission gates, endpoints, and canonical reason values remain unchanged.');

for (const required of [
  'previewResult.preview.blocker_message || previewResult.message',
  'previewError.message', 'closeError.message', 'error.message',
  'closure.closed_by_user_name', 'closure.closed_by_user_id', 'closure.notes',
]) if (!periodSource.includes(required)) fail(`Usage Period Closures business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of [
  'ui(previewResult.preview.blocker_message)', 'ui(previewResult.message)',
  'ui(previewError.message)', 'ui(closeError.message)', 'ui(error.message)',
  'ui(closure.closed_by_user_name)', 'ui(closure.closed_by_user_id)', 'ui(closure.notes)',
]) if (periodSource.includes(forbidden)) fail(`Usage Period Closures translates business/server data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Closure notes, user identities, blocker/server messages, and API errors remain raw business/server data.');

for (const required of [
  '"period_start"', '"period_end"', '"status"', '"blocker_code"', '"blocker_message"',
  '"period_closure_id"', '"closed_by_user_id"',
  'status: preview.blocked ? "blocked" : "ready"',
  '`inventory-usage-period-close-preview-${new Date().toISOString().slice(0, 10)}.csv`',
  '`inventory-usage-period-closures-${new Date().toISOString().slice(0, 10)}.csv`',
]) if (!periodSource.includes(required)) fail(`Usage Period Closures technical CSV/canonical export contract changed unexpectedly: ${required}`);
for (const forbidden of ['ui("period_start")', 'ui("period_end")', 'ui("blocked")', 'ui("ready")']) if (periodSource.includes(forbidden)) fail(`Usage Period Closures translates technical/canonical export identifier unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Period-close CSV headers, filenames, blocker codes, and canonical blocked/ready export values stay untranslated.');

for (const required of [
  'ui("Inventory item")', 'ui("units")', 'ui("restored; stock")',
  'ui("Inventory usage reversed successfully")', 'ui("Unexpected error while reversing inventory usage.")',
  'ui("Inventory usage reversal failed: ")', 'ui("Quick consume was already recorded")',
  'ui("Quick consume recorded successfully")', 'ui("The scan form was cleared and is ready for the next barcode.")',
  'ui("Unexpected error while recording quick consume.")', 'ui("Quick consume failed: ")',
  'ui("Why are you reversing this usage entry?")', 'ui("Unexpected export error.")',
  'ui("Usage CSV export failed: ")',
]) if (!pageSource.includes(required)) fail(`Inventory Usage controller completion feedback is not catalog-backed: ${required}`);
for (const forbidden of [
  '|| "Inventory item"', '|| "units"', '|| "Inventory usage reversed successfully"',
  ': "Unexpected error while reversing inventory usage."', '`Inventory usage reversal failed: ${message}`',
  '? "Quick consume was already recorded"', ': "Quick consume recorded successfully"',
  'The scan form was cleared and is ready for the next barcode.`',
  ': "Unexpected error while recording quick consume."', '`Quick consume failed: ${message}`',
  'window.prompt(\n      "Why are you reversing this usage entry?"', ': "Unexpected export error."', '`Usage CSV export failed: ${message}`',
]) if (pageSource.includes(forbidden)) fail(`Raw frontend-owned Inventory Usage controller feedback remains: ${forbidden}`);
if (!process.exitCode) pass('Remaining reversal, quick-consume, prompt, and CSV-export controller feedback is catalog-backed.');

for (const required of [
  'placeholder={"damage-photo.jpg"}',
  'placeholder={"tenant/uploads/damage-photo.jpg"}',
  'placeholder={"image/jpeg"}',
]) if (!quickSource.includes(required)) fail(`Quick Consume technical evidence example changed unexpectedly: ${required}`);
for (const required of [
  'placeholder={"event, work_order, requisition..."}',
  'placeholder={"product_id,storage_location_id,quantity,reason,department,event_name,notes,reference_type,reference_id,missing_evidence_acknowledged"}',
]) if (!bulkSource.includes(required)) fail(`Bulk Recorder technical import example changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Technical identifiers, import columns, MIME/path examples, and canonical request/export data remain untranslated.');

if (!process.exitCode) pass('Inventory Usage route multilingual conversion is complete across Dashboard, recording, templates, schedules, governance, period close, ledger/detail presentation, and controller feedback.');
