import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const templatesSource = read('src/pages/inventoryUsage/InventoryUsageTemplatesPanel.tsx');
const scheduledSource = read('src/pages/inventoryUsage/InventoryUsageScheduledTemplatesPanel.tsx');
const governanceSource = read('src/pages/inventoryUsage/InventoryUsageGovernancePanel.tsx');
const dashboardSource = read('src/pages/inventoryUsage/InventoryUsageDashboard.tsx');
const periodSource = read('src/pages/inventoryUsage/InventoryUsagePeriodClosuresPanel.tsx');
const apiSource = read('src/pages/inventoryUsage/inventoryUsageApi.ts');
const configSource = read('src/pages/inventoryUsage/inventoryUsageConfig.ts');
const pageSource = read('src/pages/InventoryUsagePage.tsx');
const routerSource = read('src/app/router.tsx');
const sources = [templatesSource, scheduledSource, governanceSource, pageSource];

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
  'template', 'templates', 'line', 'lines',
  'alert signal', 'alert signals', 'day', 'days', 'event.', 'events.',
  'due scheduled usage template', 'due scheduled usage templates',
  'scheduled usage template line uses damage/waste reasons without linked evidence metadata.',
  'scheduled usage template lines use damage/waste reasons without linked evidence metadata.',
  'template line.', 'template lines.',
];
const missing = [...new Set([...literals, ...dynamicKeys].filter((key) => !unique.has(key)))];
if (missing.length) fail(`Inventory Usage templates/governance ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Inventory Usage Templates/Scheduled/Governance have ${new Set(literals).size + dynamicKeys.filter((key) => !literals.includes(key)).length} catalog-backed literal/dynamic UI keys.`);

for (const [name, source] of [
  ['Usage Templates', templatesSource],
  ['Scheduled Templates', scheduledSource],
  ['Governance', governanceSource],
]) {
  const rawText = source.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
  if (rawText.length) fail(`Raw direct JSX presentation remains in Inventory Usage ${name}: ${rawText.join(' | ')}`);
  else pass(`Inventory Usage ${name} has zero raw direct JSX presentation text.`);
}

for (const required of [
  "import { useAppTranslation } from '../../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatUsageReasonDisplay',
]) if (!templatesSource.includes(required)) fail(`Usage Templates locale presentation missing: ${required}`);
for (const required of [
  "import { useAppTranslation } from '../../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatScheduleStatus',
  'formatSchedule',
  'formatUsageReasonDisplay',
]) if (!scheduledSource.includes(required)) fail(`Scheduled Templates locale presentation missing: ${required}`);
for (const required of [
  "import { useAppTranslation } from '../../i18n/I18nContext';",
  "import { formatLocalizedNumber } from '../../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatExceptionType',
  'formatReviewStatus',
  'formatUsageReasonDisplay',
]) if (!governanceSource.includes(required)) fail(`Usage Governance locale presentation missing: ${required}`);
for (const required of [
  'import { useAppTranslation } from "../i18n/I18nContext";',
  'import { formatLocalizedNumber } from "../i18n/formatters";',
  'const { locale, ui } = useAppTranslation();',
]) if (!pageSource.includes(required)) fail(`Inventory Usage controller multilingual prompt presentation missing: ${required}`);
if (!process.exitCode) pass('Templates, schedules, governance, and related controller prompts use the shared tenant translation runtime and locale-aware number/date presentation.');

for (const displayKey of [
  'Usage templates', 'Scheduled usage templates', 'Usage governance',
  'Stock-ready', 'Blocked by stock', 'Blocked by reservations', 'Insufficient stock', 'Missing stock',
  'Evidence acknowledgement required', 'Ready with warnings', 'Scheduled', 'Due', 'Empty', 'Inactive',
  'Missing department', 'Missing notes', 'Backdated usage', 'Damage / waste',
  'Pending', 'Reviewed', 'Follow-up required',
]) if (!unique.has(displayKey)) fail(`Inventory Usage templates/governance known display label is not catalog-backed: ${displayKey}`);
if (!process.exitCode) pass('Known template readiness, schedule, exception, review, and usage-reason display states are translated while canonical values stay unchanged.');

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
  '<option value="daily">{ui(\'Daily\')}</option>',
  '<option value="weekly">{ui(\'Weekly\')}</option>',
  '<option value="monthly">{ui(\'Monthly\')}</option>',
  'schedule_frequency: scheduleFrequency || undefined',
  'schedule_interval: scheduleFrequency ? Number(scheduleInterval || 1) : undefined',
  'schedule_is_active: Boolean(scheduleFrequency && scheduleEnabled)',
]) if (!templatesSource.includes(required)) fail(`Usage Templates canonical schedule contract changed or missing: ${required}`);
for (const required of [
  "'/stock/usage/templates?limit=100'",
  "'/stock/usage/templates/scheduled?limit=100'",
  "'/stock/usage/templates/scheduled/run-due'",
  "`/stock/usage/templates/${templateId}/readiness`",
  "'/stock/usage/templates'",
  "`/stock/usage/templates/${templateId}`",
  "`/stock/usage/templates/${templateId}/consume`",
  "'/stock/usage/alerts/scan'",
  "`/stock/usage/${usageLogId}/review`",
  "`/stock/usage/exceptions${buildUsageQuery(filters, limit, offset)}`",
]) if (!apiSource.includes(required)) fail(`Inventory Usage template/governance endpoint contract changed or missing: ${required}`);
for (const required of [
  'canReview: permissions.canReviewInventoryUsage,',
  'canManageTemplates: permissions.canManageInventoryUsageTemplates,',
  'canRunScheduled: permissions.canRunScheduledInventoryUsage,',
  'canRunDueTemplates={permissions.canRunScheduled}',
  'canManageTemplates={permissions.canManageTemplates}',
  'canRecordTemplates={permissions.canRecord}',
  'canReviewUsage={permissions.canReview}',
  'canScanAlerts={permissions.canReview}',
]) if (!(pageSource + dashboardSource).includes(required)) fail(`Inventory Usage template/governance permission gate changed or missing: ${required}`);
for (const required of [
  "path: 'inventory-usage'",
  'TENANT_PERMISSIONS.INVENTORY_USAGE_READ',
  '<InventoryUsagePage />',
]) if (!routerSource.includes(required)) fail(`Inventory Usage tenant route contract changed or missing: ${required}`);
if (!process.exitCode) pass('Inventory Usage route, template/schedule/governance permission gates, endpoints, and canonical reason/schedule values remain unchanged.');

for (const required of [
  'template.name', 'template.description', 'template.department', 'template.last_used_by_user_name',
  'createError.message', 'archiveError.message', 'recordError.message', 'recordResult.message', 'error.message',
]) if (!templatesSource.includes(required)) fail(`Usage Templates business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of [
  'ui(template.name)', 'ui(template.description)', 'ui(template.department)', 'ui(template.last_used_by_user_name)',
  'ui(createError.message)', 'ui(archiveError.message)', 'ui(recordError.message)', 'ui(recordResult.message)', 'ui(error.message)',
]) if (templatesSource.includes(forbidden)) fail(`Usage Templates translates business/server data unexpectedly: ${forbidden}`);
for (const required of ['row.name', 'row.department', 'row.event_name', 'runDueResult.message', 'runDueError.message', 'error.message']) if (!scheduledSource.includes(required)) fail(`Scheduled Templates business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of ['ui(row.name)', 'ui(row.department)', 'ui(row.event_name)', 'ui(runDueResult.message)', 'ui(runDueError.message)', 'ui(error.message)']) if (scheduledSource.includes(forbidden)) fail(`Scheduled Templates translates business/server data unexpectedly: ${forbidden}`);
for (const required of ['alertScanResult.message', 'alertScanError.message', 'reviewError.message', 'row.product_name', 'row.product_id']) if (!governanceSource.includes(required)) fail(`Usage Governance business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of ['ui(alertScanResult.message)', 'ui(alertScanError.message)', 'ui(reviewError.message)', 'ui(row.product_name)', 'ui(row.product_id)']) if (governanceSource.includes(forbidden)) fail(`Usage Governance translates business/server data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Template/product/location/user names, descriptions, API errors, server messages, and other business/server text remain raw data.');

for (const required of [
  "'usage_log_id', 'exception_types', 'product_id', 'product_name'",
  "'storage_location_id', 'storage_location_name', 'consumption_reason'",
  "'review_status', 'reviewed_at', 'reviewed_by_user_id'",
  "link.download = `inventory-usage-exceptions-${new Date().toISOString().slice(0, 10)}.csv`;",
]) if (!governanceSource.includes(required)) fail(`Usage Governance technical CSV/export contract changed unexpectedly: ${required}`);
for (const forbidden of ['ui(\'usage_log_id\')', 'ui(\'exception_types\')', 'ui(\'product_id\')', 'ui(\'review_status\')']) if (governanceSource.includes(forbidden)) fail(`Usage Governance translates technical CSV identifier unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Governance CSV headers, filenames, identifiers, and canonical export data stay untranslated.');

for (const required of [
  "ui('Why are you archiving the usage template')",
  "ui('now? This will deduct stock for every ready due template.')",
  "ui('Record due templates anyway and audit the missing-evidence acknowledgement?')",
  "ui('Record usage now from template')",
  "ui('This template includes damage or waste lines without linked evidence metadata. Record anyway and audit the missing-evidence acknowledgement?')",
  "ui('What follow-up is required for this usage entry?')",
  "ui('Optional review notes for this usage entry:')",
]) if (!pageSource.includes(required)) fail(`Inventory Usage templates/governance controller prompt is not catalog-backed: ${required}`);
for (const forbidden of [
  '`Why are you archiving the usage template "${template.name}"?`',
  '`Record ${dueCount} due scheduled usage template',
  '`Record usage now from template "${template.name}"?',
  '? "What follow-up is required for this usage entry?"',
]) if (pageSource.includes(forbidden)) fail(`Raw frontend-owned templates/governance controller prompt remains: ${forbidden}`);
if (!process.exitCode) pass('Template archive/run/consume confirmations and governance review prompts are catalog-backed without translating template names.');

if (!periodSource.includes('title={ui("Usage period close")}')) fail('Inventory Usage templates/governance downstream close-workflow boundary is no longer the expected multilingual component.');
if (!periodSource.includes('useAppTranslation')) fail('Inventory Usage Period Closures multilingual runtime is missing after staged boundary advancement.');
if (!process.exitCode) pass('The staged templates/governance checker now hands off to the converted Usage Period Closures workflow without weakening earlier assertions.');

if (!process.exitCode) pass('Inventory Usage Templates + Scheduled Templates + Governance multilingual tranche is complete.');
