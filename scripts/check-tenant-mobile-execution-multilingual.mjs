import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => { console.error(`FAIL: ${message}`); process.exitCode = 1; };
const pass = (message) => console.log(`PASS: ${message}`);

const translationSource = read('src/i18n/tenantUiTranslations.ts');
const pageSource = read('src/pages/MobileExecutionPage.tsx');
const routerSource = read('src/app/router.tsx');

const rows = [];
for (const line of translationSource.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('[') || !trimmed.endsWith(',')) continue;
  try {
    const row = JSON.parse(trimmed.slice(0, -1));
    if (Array.isArray(row) && row.length === 5 && row.every((item) => typeof item === 'string')) rows.push(row);
  } catch {
    // Ignore TypeScript that is not a translation row.
  }
}

const catalogKeys = rows.map((row) => row[0]);
const uniqueKeys = new Set(catalogKeys);
if (catalogKeys.length !== uniqueKeys.size) {
  const seen = new Set();
  const duplicates = [...new Set(catalogKeys.filter((key) => seen.has(key) || !seen.add(key)))];
  fail(`Tenant UI translation catalog has duplicate English keys: ${duplicates.join(' | ')}`);
} else {
  pass(`Tenant UI catalog has ${catalogKeys.length} unique five-language rows.`);
}

const literalUiPattern = /\bui\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
function decodeLiteral(literal) {
  if (literal.startsWith('"')) return JSON.parse(literal);
  const body = literal.slice(1, -1).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return JSON.parse(`"${body}"`);
}

const literalKeys = [];
for (const match of pageSource.matchAll(literalUiPattern)) {
  try { literalKeys.push(decodeLiteral(match[1])); } catch { /* TypeScript/lint catches malformed literals. */ }
}
const missingLiterals = [...new Set(literalKeys.filter((key) => !uniqueKeys.has(key)))];
if (missingLiterals.length) fail(`Mobile Execution has ui() literals missing from the five-language catalog: ${missingLiterals.join(' | ')}`);
else pass(`Mobile Execution has ${new Set(literalKeys).size} catalog-backed literal UI keys.`);

const dynamicLabels = [
  'All urgency', 'Critical', 'High', 'Medium', 'Low',
  'All task sources', 'Execution requests', 'Manual', 'Reservation', 'Requisition', 'Purchase order', 'Shipment', 'Transfer', 'Cycle count', 'Replenishment',
  'Start', 'Complete', 'Block', 'Unblock',
  'Unknown', 'Ready', 'Assigned', 'In progress', 'Blocked', 'Completed', 'Cancelled', 'Pending', 'Open', 'Execution request',
  'Offline-capable task execution',
  'Tenant isolated', 'Permission gated', 'Audit-traceable source', 'Human action only', 'Approval gated when required',
  'No direct inventory mutation', 'No direct procurement mutation', 'No direct execution mutation', 'No direct financial mutation',
  'No ERP writeback', 'No accounting writeback', 'No supplier execution', 'No carrier execution', 'No external workflow execution', 'No external AI callout',
  'Execution-task lifecycle changes only',
  'queued action could not be applied.', 'queued actions could not be applied.', 'offline action synchronized.', 'offline actions synchronized.',
  'queued action awaiting synchronization', 'queued actions awaiting synchronization', 'action waiting to synchronize', 'actions waiting to synchronize',
  'queued action', 'queued actions', 'pending action', 'pending actions'
];
const missingDynamic = dynamicLabels.filter((key) => !uniqueKeys.has(key));
if (missingDynamic.length) fail(`Mobile Execution dynamic display labels are missing translations: ${missingDynamic.join(' | ')}`);
else pass(`${dynamicLabels.length} dynamic Mobile Execution labels are catalog-backed.`);

const representativeRows = [
  'Mobile & warehouse execution', 'Mobile Execution', 'Mobile execution controls', 'Touch-first task queue', 'Mobile safety contract',
  'Refresh mobile queue', 'Sync pending', 'Scan-ready', 'Offline snapshot', 'Enabled guardrail'
];
const missingRepresentative = representativeRows.filter((key) => !uniqueKeys.has(key));
if (missingRepresentative.length) fail(`Missing representative Mobile Execution translations: ${missingRepresentative.join(' | ')}`);
else pass(`${representativeRows.length} representative Mobile Execution rows are present in all five locales.`);

if (!pageSource.includes('useAppTranslation()')) fail('Mobile Execution must use the shared translation context.');
if (!pageSource.includes('formatLocalizedDateTime(date, locale)')) fail('Mobile Execution timestamps must use locale-aware shared date/time formatting.');
if (!pageSource.includes('formatLocalizedNumber(numberValue(summary.total_mobile_tasks ?? mobileTasks.length), locale)')) fail('Mobile Execution queue count must use locale-aware number formatting.');
if (!pageSource.includes('formatLocalizedNumber(numberValue(summary.critical_mobile_tasks), locale)')) fail('Mobile Execution critical-task count must use locale-aware number formatting.');
if (!pageSource.includes('formatLocalizedNumber(mobileTasks.length, locale)')) fail('Mobile Execution displayed task count must use locale-aware number formatting.');
if (!process.exitCode) pass('Mobile Execution dates and displayed counts use the selected application locale.');

const forbiddenEnglishPresentation = [
  'eyebrow="Mobile & warehouse execution"', 'title="Mobile Execution"', '>Mobile execution controls<', '>Touch-first task queue<', '>Mobile safety contract<',
  'aria-label="Filter mobile tasks by urgency"', "? 'Refreshing…' : 'Refresh mobile queue'", '>Open source workflow<', '>Scan/verify<'
];
for (const pattern of forbiddenEnglishPresentation) if (pageSource.includes(pattern)) fail(`Mobile Execution still contains English-only presentation: ${pattern}`);

const forbiddenTechnicalTranslation = [
  "ui('/mobile-execution')", 'ui("/mobile-execution")', "ui('/operational-action-center/mobile-execution-summary')", 'ui("/operational-action-center/mobile-execution-summary")',
  "ui('/inventory-capabilities/mobile-sync')", 'ui("/inventory-capabilities/mobile-sync")', "ui('execution')", 'ui("execution")',
  "ui('critical')", 'ui("critical")', "ui('execution_request')", 'ui("execution_request")', "ui('shipment')", 'ui("shipment")'
];
for (const pattern of forbiddenTechnicalTranslation) if (pageSource.includes(pattern)) fail(`Canonical Mobile Execution technical value must remain language-independent: ${pattern}`);

const canonicalContracts = [
  "new URLSearchParams({ action_domain: 'execution', limit: '50' })",
  "params.set('urgency', urgency)", "params.set('execution_task_source_type', sourceType)",
  "apiRequest<MobileExecutionResponse>(`/operational-action-center/mobile-execution-summary?${params.toString()}`)",
  "apiRequest<MobileSyncResponse>('/inventory-capabilities/mobile-sync'", "method: 'POST'",
  'hasPermission(TENANT_PERMISSIONS.EXECUTION_TASKS_UPDATE)',
  "if (status === 'blocked') return ['unblock']", "return ['start', 'complete', 'block']"
];
for (const contract of canonicalContracts) if (!pageSource.includes(contract)) fail(`Mobile Execution API/filter/action contract changed during localization: ${contract}`);

const routerContracts = [
  "path: 'mobile-execution'", 'TENANT_PERMISSIONS.OPERATIONAL_ACTION_CENTER_READ', 'TENANT_PERMISSIONS.EXECUTION_TASKS_READ', '<MobileExecutionPage />'
];
for (const contract of routerContracts) if (!routerSource.includes(contract)) fail(`Mobile Execution router permission contract changed during localization: ${contract}`);
if (!process.exitCode) pass('Mobile Execution route, query filters, permissions, sync endpoint, and lifecycle actions remain language-independent.');

const serverContentContracts = [
  '<p>{guidance.offline_guidance}</p>', '<p>{guidance.scanner_guidance}</p>',
  "{task.title || ui('Untitled mobile task')}", "{task.summary || ui('No task summary was provided.')}",
  '{task.recommended_mobile_next_step || ui("No recommended next step was provided.")}',
  'mobileExecutionQuery.error instanceof ApiError ? mobileExecutionQuery.error.message',
  "${failed[0]?.error || ''}"
];
for (const contract of serverContentContracts) if (!pageSource.includes(contract)) fail(`Mobile Execution backend/business content display contract changed: ${contract}`);
const forbiddenServerContentTranslation = [
  'ui(guidance.offline_guidance)', 'ui(guidance.scanner_guidance)', 'ui(task.title)', 'ui(task.summary)', 'ui(task.recommended_mobile_next_step)',
  'ui(mobileExecutionQuery.error.message)', 'ui(failed[0]?.error)'
];
for (const pattern of forbiddenServerContentTranslation) if (pageSource.includes(pattern)) fail(`Backend-returned Mobile Execution content must not be blindly translated as a UI key: ${pattern}`);
if (!process.exitCode) pass('Backend task/guidance/error content remains data while frontend-owned fallbacks and controls are localized.');

if (!pageSource.includes("const actorType = identity.supportSession ? 'support' : 'tenant';")) fail('Mobile Execution tenant/support-scoped local storage isolation contract changed.');
if (!pageSource.includes('localStorage.removeItem(LEGACY_CACHE_KEY)') || !pageSource.includes('localStorage.removeItem(LEGACY_PENDING_KEY)')) fail('Mobile Execution legacy unscoped cache cleanup must remain intact.');
if (!process.exitCode) pass('Mobile Execution tenant/user scoped offline cache isolation remains intact.');

if (!process.exitCode) console.log('Tenant Mobile Execution multilingual hardening: PASS');
