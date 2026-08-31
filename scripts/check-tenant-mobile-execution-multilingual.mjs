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
  'queued action', 'queued actions', 'pending action', 'pending actions',
  'This page keeps a local task snapshot. Start, complete, block, or unblock actions can be queued offline and are replayed through the normal task workflow when connectivity returns.',
  'None of the current tasks can use the shipment scanner.',
  'The first task can open the shipment scanner with the correct shipment already selected.',
  'Some tasks can use the shipment scanner, but the first task in the queue does not require scanning.',
  'Photos, voice notes, and other evidence are not uploaded from this page. Add any required evidence in the task’s normal workflow.',
  'Scan if needed, then start or complete the execution task here. Offline actions are queued and replayed when connectivity returns.',
  'Start, complete, block, or unblock the execution task here. Offline actions are queued and replayed when connectivity returns.'
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
  "{task.title || ui('Untitled mobile task')}", "{task.summary || ui('No task summary was provided.')}",
  'localizedMobileSystemText(guidance.offline_guidance_key, guidance.offline_guidance, ui)',
  'localizedMobileSystemText(guidance.scanner_guidance_key, guidance.scanner_guidance, ui)',
  'localizedMobileSystemText(guidance.evidence_guidance_key, guidance.evidence_guidance, ui)',
  'localizedMobileSystemText(task.recommended_mobile_next_step_key, task.recommended_mobile_next_step, ui)',
  'mobileExecutionQuery.error instanceof ApiError ? mobileExecutionQuery.error.message',
  "firstFailure || ''"
];
for (const contract of serverContentContracts) if (!pageSource.includes(contract)) fail(`Mobile Execution backend/business content display contract changed: ${contract}`);
const forbiddenServerContentTranslation = [
  'ui(task.title)', 'ui(task.summary)', 'ui(mobileExecutionQuery.error.message)',
  'ui(guidance.offline_guidance)', 'ui(guidance.scanner_guidance)', 'ui(task.recommended_mobile_next_step)'
];
for (const pattern of forbiddenServerContentTranslation) if (pageSource.includes(pattern)) fail(`Backend-returned user/business/error content must not be blindly translated as a UI key: ${pattern}`);
if (!pageSource.includes('const MOBILE_SYSTEM_TEXT: Record<string, string>')) fail('Mobile Execution must whitelist translatable backend-generated system guidance.');
if (!pageSource.includes('const canonical = key ? MOBILE_SYSTEM_TEXT[key] : null;')) fail('Mobile Execution system guidance must translate only recognized server guidance keys.');
if (!process.exitCode) pass('User/business/error content remains data while whitelisted system guidance uses catalog-backed keys.');

const stableRequestIdentityCount = (pageSource.match(/request_id: operation\.operation_id/g) || []).length;
if (stableRequestIdentityCount < 2) fail('Mobile Execution online and replay synchronization must reuse the stable operation id as the server request identity.');
if (pageSource.includes("request_id: makeId('sync')")) fail('Mobile Execution must not mint a new server request identity on retry.');
if (!pageSource.includes('operations: [operation]')) fail('Mobile Execution replay must synchronize each queued operation under its own stable idempotency identity.');
if (!process.exitCode) pass('Mobile Execution offline retry identity remains stable across online submission and replay.');

if (pageSource.includes("{ui('Task')} {operation.task_id}")) fail('Mobile Execution must not expose raw execution-task UUIDs in the normal offline queue.');
if (!pageSource.includes("operation.task_label || ui('Execution task')")) fail('Mobile Execution offline queue must use a human task label with a localized fallback.');
if (!process.exitCode) pass('Mobile Execution keeps synchronization identifiers internal to normal tenant UI.');

if (!pageSource.includes("const actorType = identity.supportSession ? 'support' : 'tenant';")) fail('Mobile Execution tenant/support-scoped local storage isolation contract changed.');
if (!pageSource.includes('localStorage.removeItem(LEGACY_CACHE_KEY)') || !pageSource.includes('localStorage.removeItem(LEGACY_PENDING_KEY)')) fail('Mobile Execution legacy unscoped cache cleanup must remain intact.');
if (!process.exitCode) pass('Mobile Execution tenant/user scoped offline cache isolation remains intact.');

if (!process.exitCode) console.log('Tenant Mobile Execution multilingual hardening: PASS');
