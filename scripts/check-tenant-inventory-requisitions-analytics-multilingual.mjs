import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/InventoryRequisitionsPage.tsx');
const routerSource = read('src/app/router.tsx');
const marker = '      <section style={styles.grid}>';
const markerIndex = pageSource.indexOf(marker);
if (markerIndex < 0) fail('Unable to isolate Requisitions analytics/workflow staged boundary.');
const analyticsSource = markerIndex >= 0 ? pageSource.slice(0, markerIndex) : pageSource;
const workflowSource = markerIndex >= 0 ? pageSource.slice(markerIndex) : '';

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
for (const match of analyticsSource.matchAll(literalPattern)) {
  try { literals.push(decodeLiteral(match[1])); } catch {}
}
const missing = [...new Set(literals.filter((key) => !unique.has(key)))];
if (missing.length) fail(`Requisitions analytics ui() literals missing translations: ${missing.join(' | ')}`);
else pass(`Requisitions analytics has ${new Set(literals).size} catalog-backed literal UI keys.`);

const rawText = analyticsSource.split(/\r?\n/).flatMap((line) => [...line.matchAll(/<(?:h[1-6]|p|th|td|summary|span|option|button|label|dt|dd|strong|small|OperationalWorkspaceMetaPill)\b[^>]*>\s*([A-Za-z][^<>{}]*)\s*</g)].map((match) => match[1].trim()).filter(Boolean));
if (rawText.length) fail(`Raw direct JSX presentation remains in Requisitions analytics scope: ${rawText.join(' | ')}`);
else pass('Requisitions analytics scope has zero raw direct JSX presentation text.');

for (const required of [
  "import { useAppTranslation } from '../i18n/I18nContext';",
  "import { formatLocalizedCurrency, formatLocalizedDate, formatLocalizedDateTime, formatLocalizedNumber } from '../i18n/formatters';",
  'const { locale, ui } = useAppTranslation();',
  'formatLocalizedDateTime(date, locale)',
  'formatLocalizedDate(date, locale)',
  'formatLocalizedNumber(parsed, locale',
  'formatLocalizedCurrency(parsed, getActiveTenantCurrency(), locale',
]) if (!pageSource.includes(required)) fail(`Requisitions locale-aware runtime missing: ${required}`);
if (!process.exitCode) pass('Requisitions analytics uses the shared tenant translation runtime and locale-aware date/number/currency presentation.');

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
]) if (!pageSource.includes(required)) fail(`Requisitions read/mutation contract changed or missing: ${required}`);
if (!process.exitCode) pass('Requisitions route/endpoints and workflow mutation boundaries remain unchanged.');

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
if (!process.exitCode) pass('Create/submit/approve/cancel/fulfill/reservation capability boundaries are unchanged.');

for (const required of [
  '{department.requesting_department}',
  '{product.product_name}',
  '{category.product_category}',
  '{request.requesting_department',
  '{location.source_storage_location_name}',
  '{location.target_storage_location_name}',
  'if (error instanceof ApiError || error instanceof Error) return error.message;',
  'blocker.message',
  'warning.message',
]) if (!pageSource.includes(required)) fail(`Requisitions business/server-data evidence missing unexpectedly: ${required}`);
for (const forbidden of [
  'ui(department.requesting_department)', 'ui(product.product_name)', 'ui(category.product_category)',
  'ui(location.source_storage_location_name)', 'ui(location.target_storage_location_name)',
  'ui(error.message)', 'ui(blocker.message)', 'ui(warning.message)'
]) if (pageSource.includes(forbidden)) fail(`Requisitions translates business/server data unexpectedly: ${forbidden}`);
if (!process.exitCode) pass('Department/product/location/user/business values, backend blockers/warnings, and API errors remain raw business/server data.');

for (const required of [
  "downloadCsv('inventory-requisition-bulk-fulfillment-results.csv'",
  "downloadCsv('inventory-requisition-bulk-readiness-results.csv'",
  "downloadCsv('inventory-requisition-queue.csv'",
  "'Requisition ID'", "'Status after fulfillment'", "'Approval threshold governed'",
  "entry.ready ? 'yes' : 'no'", "line.ready ? 'yes' : 'no'",
]) if (!pageSource.includes(required)) fail(`Requisitions technical CSV/canonical export contract changed unexpectedly: ${required}`);
if (!process.exitCode) pass('Technical CSV filenames, headers, yes/no export values, query keys, and canonical request values remain untranslated.');

for (const required of [
  'ui("Internal stock requests")',
  'ui("Planning and governance analysis")',
  'ui("Approval threshold exposure")',
  'ui("Approval threshold watchlist")',
  'ui("Estimated value exposure")',
  'ui("Fulfillment backlog")',
  'ui("Queue aging")',
  'ui("SLA breach risk")',
  'ui("Priority demand")',
]) if (!analyticsSource.includes(required)) fail(`Requisitions analytics multilingual section missing: ${required}`);
if (!process.exitCode) pass('Demand, approval, threshold, value, backlog, aging, SLA, and priority analytics are catalog-backed.');

for (const required of [
  "title={editingDraftId ? ui('Edit draft request') : ui('Create request')}",
  "ui('Loading requisitions…')",
  "ui('No requisitions match the current filters.')",
]) if (!workflowSource.includes(required)) fail(`Requisitions workflow staged sentinel did not advance to the translated boundary: ${required}`);
if (!process.exitCode) pass('The historical analytics tranche remains intact and its staged workflow sentinel has advanced to the translated boundary.');

if (!process.exitCode) pass('Requisitions analytics/governance multilingual tranche remains complete.');
