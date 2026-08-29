import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const dashboardSource = read('src/pages/inventoryUsage/InventoryUsageDashboard.tsx');
const quickSource = read('src/pages/inventoryUsage/InventoryUsageQuickConsumePanel.tsx');
const cameraSource = read('src/pages/inventoryUsage/InventoryUsageCameraScanner.tsx');
const bulkSource = read('src/pages/inventoryUsage/InventoryUsageBulkRecorder.tsx');
const apiSource = read('src/pages/inventoryUsage/inventoryUsageApi.ts');
const configSource = read('src/pages/inventoryUsage/inventoryUsageConfig.ts');
const pageSource = read('src/pages/InventoryUsagePage.tsx');
const routerSource = read('src/app/router.tsx');
const nextSource = read('src/pages/inventoryUsage/InventoryUsagePeriodClosuresPanel.tsx');
const sources = [dashboardSource, quickSource, cameraSource, bulkSource];

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
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Inventory Usage recording ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Inventory Usage Dashboard/Quick Consume/Camera/Bulk have ${new Set(literals).size} catalog-backed literal UI keys.`);

for (const [name, source] of [
  ['Dashboard', dashboardSource],
  ['Quick Consume', quickSource],
  ['Camera Scanner', cameraSource],
  ['Bulk Recorder', bulkSource],
]) {
  const rawText = source.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
  if (rawText.length) fail(`Raw direct JSX presentation remains in Inventory Usage ${name}: ${rawText.join(' | ')}`);
  else pass(`Inventory Usage ${name} has zero raw direct JSX presentation text.`);
}

for (const required of [
  'import { useAppTranslation } from "../../i18n/I18nContext";',
  'formatLocalizedCurrency',
  'formatLocalizedDate',
  'formatLocalizedDateTime',
  'formatLocalizedNumber',
  'const { locale, ui } = useAppTranslation();',
  'formatUsageReasonLocal',
  'formatCodeLabelLocal',
]) if (!dashboardSource.includes(required)) fail(`Inventory Usage Dashboard locale presentation missing: ${required}`);
for (const required of [
  "import { useAppTranslation } from '../../i18n/I18nContext';",
  "import { formatLocalizedDate, formatLocalizedNumber } from '../../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatBarcodeTraceability',
  'formatPolicyReason',
]) if (!quickSource.includes(required)) fail(`Inventory Usage Quick Consume locale presentation missing: ${required}`);
for (const required of [
  "import { useAppTranslation } from '../../i18n/I18nContext';",
  'const { ui } = useAppTranslation();',
  'formatScannerError(scannerError, ui)',
]) if (!cameraSource.includes(required)) fail(`Inventory Usage Camera Scanner multilingual presentation missing: ${required}`);
for (const required of [
  "import { useAppTranslation } from '../../i18n/I18nContext';",
  "import { formatLocalizedDateTime, formatLocalizedNumber } from '../../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatBulkReadinessReason',
]) if (!bulkSource.includes(required)) fail(`Inventory Usage Bulk Recorder locale presentation missing: ${required}`);
if (!process.exitCode) pass('Inventory Usage recording surfaces use the shared tenant translation runtime and locale-aware numeric/date/currency formatters.');

for (const displayKey of [
  'Guest use', 'Internal use', 'Damage', 'Waste', 'Event', 'Maintenance', 'Other',
  'Pending', 'Reviewed', 'Follow-up required', 'Depleted', 'Below minimum', 'Usage exceeds current stock', 'Healthy',
  'No stock row exists at the selected location', 'The scan would make stock negative',
  'The scan would use stock reserved for active commitments', 'A critical unresolved alert blocks consumption',
  'The selected usage timestamp is inside a closed period', 'Stock-impact acknowledgement is required',
  'Evidence metadata or missing-evidence acknowledgement is required', 'Reserved stock is protected',
  'Insufficient on-hand stock', 'No stock exists at this location', 'Product not found', 'Storage location not found',
  'Missing-evidence acknowledgement required',
]) if (!unique.has(displayKey)) fail(`Inventory Usage known display label is not catalog-backed: ${displayKey}`);
if (!process.exitCode) pass('Known usage reasons, review/stock states, and readiness blockers have translated display labels while canonical values stay unchanged.');

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
  "'/stock/consume/barcode/preview'",
  "'/stock/consume/barcode'",
  "'/stock/consume/bulk/readiness'",
  "'/stock/consume/bulk'",
]) if (!apiSource.includes(required)) fail(`Inventory Usage recording endpoint contract changed or missing: ${required}`);
for (const required of [
  'const canRecordStockUsage = !permissions.isAdmin && permissions.canConsumeStock && permissions.canRecordInventoryUsage;',
  'const canBulkRecordStockUsage = !permissions.isAdmin && permissions.canConsumeStock && permissions.canBulkRecordInventoryUsage;',
  'canRecord: canRecordStockUsage',
  'canBulkRecord: canBulkRecordStockUsage',
]) if (!pageSource.includes(required)) fail(`Inventory Usage recording permission gate changed or missing: ${required}`);
for (const required of [
  "path: 'inventory-usage'",
  'TENANT_PERMISSIONS.INVENTORY_USAGE_READ',
  '<InventoryUsagePage />',
]) if (!routerSource.includes(required)) fail(`Inventory Usage tenant route contract changed or missing: ${required}`);
if (!process.exitCode) pass('Inventory Usage route, recording permission gates, API endpoints, and canonical usage-reason values are unchanged.');

for (const required of [
  'previewError.message', 'error.message', 'storageLocationsError.message', 'evidenceError.message',
  'alert.type', 'alert.message', 'previewResult.barcode_match?.product_name', 'previewResult.preview.storage_location_name',
]) if (!quickSource.includes(required)) fail(`Quick Consume business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of [
  'ui(previewError.message)', 'ui(error.message)', 'ui(storageLocationsError.message)', 'ui(evidenceError.message)',
  'ui(alert.type)', 'ui(alert.message)', 'ui(previewResult.barcode_match?.product_name)', 'ui(previewResult.preview.storage_location_name)',
]) if (quickSource.includes(forbidden)) fail(`Quick Consume translates business/server data unexpectedly: ${forbidden}`);
for (const required of ['previewResult.message', 'result.message', 'selectedTemplate.name']) if (!bulkSource.includes(required)) fail(`Bulk Recorder business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of ['ui(previewResult.message)', 'ui(result.message)', 'ui(selectedTemplate.name)']) if (bulkSource.includes(forbidden)) fail(`Bulk Recorder translates business/server data unexpectedly: ${forbidden}`);
for (const forbidden of ['ui(row.product_name)', 'ui(row.storage_location_name)', 'ui(usage.notes)', 'ui(usage.event_name)', 'ui(usage.reversal_reason)']) if (dashboardSource.includes(forbidden)) fail(`Dashboard translates business/server data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Product/location/template names, notes, reasons, alerts, API errors, and other business/server text remain raw data.');

for (const required of [
  'placeholder={"damage-photo.jpg"}',
  'placeholder={"tenant/uploads/damage-photo.jpg"}',
  'placeholder={"image/jpeg"}',
]) if (!quickSource.includes(required)) fail(`Quick Consume technical evidence example changed unexpectedly: ${required}`);
for (const required of [
  'placeholder={"event, work_order, requisition..."}',
  'placeholder={"product_id,storage_location_id,quantity,reason,department,event_name,notes,reference_type,reference_id,missing_evidence_acknowledged"}',
]) if (!bulkSource.includes(required)) fail(`Bulk Recorder technical import example changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Technical identifiers, import columns, MIME/path examples, and canonical request data stay untranslated.');

for (const forbidden of [
  "return message || 'Could not start the camera scanner.';",
  ": 'No supported barcode or QR code could be decoded from that image.');",
  'setCompletionError(`Quick consume failed: ${message}`);',
  "? 'Inventory label · '",
  "? 'Ready'",
  '|| "No temperature zone"',
  '|| "Not reviewed"',
  '|| "No event/job"',
  '|| "No reversal reason"',
  '? "Reversing..."',
]) if (sources.some((source) => source.includes(forbidden))) fail(`Raw frontend-owned Inventory Usage feedback/fallback presentation remains: ${forbidden}`);
if (!process.exitCode) pass('Inventory Usage recording validation, fallback, scanner, preview, mutation-feedback, and readiness presentation is catalog-backed.');

if (!nextSource.includes('title={ui("Usage period close")}')) fail('Inventory Usage recording downstream close-workflow boundary is no longer the expected multilingual component.');
if (!nextSource.includes('useAppTranslation')) fail('Inventory Usage Period Closures multilingual runtime is missing after staged boundary advancement.');
if (!process.exitCode) pass('The staged recording checker now hands off to the converted Usage Period Closures workflow without weakening earlier recording assertions.');

if (!process.exitCode) pass('Inventory Usage Dashboard + Quick Consume + Camera Scanner + Bulk Recorder multilingual tranche is complete.');
