import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/InventoryRequisitionsPage.tsx');
const routerSource = read('src/app/router.tsx');

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
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Requisitions page ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Requisitions page has ${new Set(literals).size} catalog-backed literal UI keys.`);

const renderStart = pageSource.indexOf('  return (');
const renderEnd = pageSource.indexOf('\nconst styles:', renderStart);
const renderSource = renderStart >= 0 && renderEnd > renderStart ? pageSource.slice(renderStart, renderEnd) : pageSource;
const rawText = renderSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains in Requisitions: ${rawText.join(' | ')}`);
else pass('Requisitions page has zero raw direct JSX presentation text.');

const rawAttributePattern = /\b(?:title|description|placeholder|ariaLabel|aria-label)=("[^"]*[A-Za-z][^"]*"|'[^']*[A-Za-z][^']*')/g;
const rawAttributes = [...renderSource.matchAll(rawAttributePattern)].map((match) => match[0]);
if (rawAttributes.length) fail(`Raw presentation attributes remain in Requisitions: ${rawAttributes.join(' | ')}`);
else pass('Requisitions page has zero raw literal title/description/placeholder/ARIA presentation attributes.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDateTime(date, locale)',
  'formatLocalizedDate(date, locale)',
  'formatLocalizedNumber(parsed, locale',
  'formatLocalizedCurrency(parsed, getActiveTenantCurrency(), locale',
  "formatApprovalThresholdLineNoteDepth(item, ui, locale)",
  "formatApprovalThresholdQueueNoteDepth(item, ui, locale)",
]) if (!pageSource.includes(required)) fail(`Requisitions shared multilingual/locale runtime missing: ${required}`);
if (!process.exitCode) pass('Requisitions uses the shared tenant translation runtime and locale-aware date/number/currency/note-depth presentation.');

for (const required of [
  "path: 'inventory-requisitions'",
  'TENANT_PERMISSIONS.INVENTORY_REQUISITIONS_READ',
  '<InventoryRequisitionsPage />',
]) if (!routerSource.includes(required)) fail(`Requisitions tenant route contract changed or missing: ${required}`);

for (const required of [
  "apiRequest<RequisitionSummary>('/inventory-requisitions/summary?days=14')",
  "apiRequest<RequisitionOptions>('/inventory-requisitions/options')",
  '`/inventory-requisitions?${params.toString()}`',
  '`/inventory-requisitions/${selectedId}`',
  '`/inventory-requisitions/${selectedId}/fulfillments`',
  '`/inventory-requisitions/${selectedId}/activity`',
  '`/inventory-requisitions/${selectedId}/readiness`',
  "apiMutationRequest<BulkFulfillmentResult>('/inventory-requisitions/bulk-fulfill'",
  "apiMutationRequest<BulkRequisitionReadiness>('/inventory-requisitions/bulk-readiness'",
  '`/inventory-requisitions/${id}/${action}`',
  '`/inventory-requisitions/${selected.id}/fulfill`',
  '`/inventory-requisitions/${selected.id}/comments`',
  '`/inventory-reservations/from-requisition/${id}`',
]) if (!pageSource.includes(required)) fail(`Requisitions read/mutation endpoint contract changed or missing: ${required}`);
if (!process.exitCode) pass('Requisitions read, workflow, fulfillment, bulk, activity, and linked-reservation endpoint contracts remain unchanged.');

for (const required of [
  'capabilities.canCreateInventoryRequisitions',
  'capabilities.canSubmitInventoryRequisitions',
  'capabilities.canApproveInventoryRequisitions',
  'capabilities.canCancelAnyInventoryRequisitions',
  'capabilities.canCancelOwnInventoryRequisitions',
  'capabilities.canFulfillInventoryRequisitions',
  'capabilities.canCreateInventoryReservations',
  'capabilities.canAllocateInventoryReservations',
]) if (!pageSource.includes(required)) fail(`Requisitions permission/capability boundary changed or missing: ${required}`);
if (!process.exitCode) pass('Create/submit/approve/reject/cancel/reopen/fulfill/reservation capability boundaries remain unchanged.');

for (const required of [
  "priority: 'normal'",
  "['low', 'normal', 'high', 'urgent']",
  "action: 'submit' | 'approve' | 'reject' | 'cancel' | 'reopen'",
  "fulfill_all_remaining: true",
  "allow_partial: true",
  "linkage_note: 'Protect open requisition quantity'",
  "params.set('status', status)",
  "params.set('due_state', dueState)",
  "params.set('fulfillment_state', fulfillmentState)",
  "params.set('approval_threshold_level', approvalThresholdLevel)",
]) if (!pageSource.includes(required)) fail(`Requisitions canonical payload/query value contract changed: ${required}`);
if (!process.exitCode) pass('Canonical priority/workflow/query values and reservation linkage payload remain unchanged.');

for (const required of [
  "downloadCsv('inventory-requisition-bulk-fulfillment-results.csv'",
  "downloadCsv('inventory-requisition-bulk-readiness-results.csv'",
  "downloadCsv('inventory-requisition-queue.csv'",
  "'Requisition ID'", "'Status after fulfillment'", "'Approval threshold governed'",
  "entry.ready ? 'yes' : 'no'", "line.ready ? 'yes' : 'no'",
]) if (!pageSource.includes(required)) fail(`Requisitions technical CSV/canonical export contract changed unexpectedly: ${required}`);
for (const forbidden of [
  "ui('Requisition ID')", "ui('Status after fulfillment')", "ui('Approval threshold governed')",
  "ui('yes')", "ui('no')",
]) if (pageSource.includes(forbidden)) fail(`Requisitions translates technical export identifiers unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Technical CSV filenames, headers, and canonical yes/no export values remain untranslated.');

for (const required of [
  '{department.requesting_department}', '{product.product_name}', '{category.product_category}',
  '{location.source_storage_location_name}', '{location.target_storage_location_name}',
  'blocker.message', 'warning.message', 'selected.approval_notes', 'selected.rejection_reason',
  'selected.cancellation_reason', 'selected.notes', 'line.notes', 'entry.user_name',
  'if (error instanceof ApiError || error instanceof Error) return error.message;',
]) if (!pageSource.includes(required)) fail(`Requisitions business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of [
  'ui(department.requesting_department)', 'ui(product.product_name)', 'ui(category.product_category)',
  'ui(location.source_storage_location_name)', 'ui(location.target_storage_location_name)',
  'ui(blocker.message)', 'ui(warning.message)', 'ui(selected.approval_notes)', 'ui(selected.rejection_reason)',
  'ui(selected.cancellation_reason)', 'ui(selected.notes)', 'ui(line.notes)', 'ui(entry.user_name)', 'ui(error.message)',
]) if (pageSource.includes(forbidden)) fail(`Requisitions translates business/server data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Department/product/location/user names, request notes/reasons, backend blockers/warnings, and API errors remain raw business/server data.');

for (const required of [
  "ui('Create request')", "ui('Request queue')", "ui('Advanced filters')", "ui('Bulk fulfill selected requests')",
  "ui('Bulk readiness preview')", "ui('Selected request')", "ui('Approval threshold action requirements')",
  "ui('Workflow notes / reason')", "ui('Fulfillment source location')", "ui('Fulfillment readiness')",
  "ui('Activity timeline')", "ui('Fulfillment history')", "ui('No requisitions match the current filters.')",
  "ui('Needed-by start date cannot be after the end date.')", "ui('Minimum remaining value cannot be greater than the maximum.')",
]) if (!pageSource.includes(required)) fail(`Requisitions workflow completion presentation is not catalog-backed: ${required}`);
if (!process.exitCode) pass('Draft creation, queue/filter, bulk readiness, workflow, fulfillment, timeline, history, and validation presentation are catalog-backed.');

for (const required of [
  "ui('meets minimum')", "ui('below minimum')", "ui('request note ok')", "ui('request note short')",
  "ui('line notes short')", "ui('no request lines')", "ui('needs notes')", "ui('characters')",
]) if (!pageSource.includes(required)) fail(`Requisitions threshold note-depth display remains raw: ${required}`);
if (!process.exitCode) pass('Approval-threshold note-depth helpers use translated labels and locale-aware numeric presentation.');

if (!process.exitCode) pass('Inventory Requisitions page multilingual conversion is complete across analytics, request creation, queue, workflow, fulfillment, readiness, audit activity, and fulfillment history.');
